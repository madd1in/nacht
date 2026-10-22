// Schloss-Modus (nur mit ?castle – Plan in docs/SOTN-PLAN.md): aus den Kapiteln wird ein zusammenhängendes Schloss im Stil
// von Symphony of the Night. Die Kapitel sind Regionen, jeder Raum hat Türen in beide Richtungen (zurück durch den linken
// Rand, in Turmräumen mit ↑ an der Starttür), die Eingangshalle ist der Knoten: Kellertür in die Katakomben, Turmtür auf dem
// Sims zum Bergfried, Siegeltor auf der Galerie zum Thron. Hinter besiegten Bossen öffnen sich neue Wege; Bosse bleiben
// besiegt und geben je ein Siegel. Kein Zeitlimit.
// Karte: jeder Raum zerfällt in Zellen zu 16×13 Kacheln (etwa ein Bildschirm); betretene Zellen werden aufgedeckt und mit
// den Siegeln im localStorage gemerkt. Pause → KARTE zeigt das ganze Schloss (Angriff: Zoom, Pfeile: Scrollen).
// Kammern wie in SotN: In der Speicherkammer (roter Sarg) wird der Spielstand gesichert und die Energie aufgefüllt – er
// übersteht eine neue Browser-Sitzung (Titel: FORTSETZEN, ebenso nach Game Over). Die Warpkammer daneben wird beim
// Betreten freigeschaltet; mit ↑ geht es per Karte in jede freigeschaltete Warpkammer (Schnellreise).
// RPG wie in SotN: besiegte Gegner geben EXP, Stufenaufstieg („LEVEL UP!") erhöht max. HP, STR (Schaden) und CON (Abwehr);
// Treffer zeigen Schadenszahlen, Gegner lassen Gold, Herzen und Braten fallen. Pause → STATUS. Stufe, EXP, Besiegte und
// Spielzeit speichert die Speicherkammer (wie in SotN geht Ungespeichertes nach Game Over verloren).
'use strict';

const Castle = (() => {
  const on = /[?&]castle\b/.test(location.search);
  const CW = 16, CH = 13, KEY = 'nachtmahr.map', SAVE_KEY = 'nachtmahr.castle';
  const SOLID = '#=XYB', STAND = ['candle', 'chest', 'statue', 'ring', 'crumble', 'elevator', 'platform'];
  // Lage der Regionen auf der Schlosskarte (Zellen; jede Region ordnet ihre Räume selbst an, erster Raum bei 0,0)
  const REGION_AT = { arrival: [-18, 0], 0: [0, 0], 1: [2, 4], 2: [5, -4], sun: [18, -12], expo: [20, -4], 3: [2, -20] };
  // Verbindungen zwischen den Regionen: [Raum A, Stelle A, Raum B, Stelle B, Bedingung]. Raum = [Kapitel-id, Index] (-1 = letzter),
  // Stelle: 'start' | 'exit' | 'right' (rechter Rand hinter der Bossarena) | { x, y } (Tür mit ↑, Kachel links unten, y = Standreihe)
  const CELLAR = { x: 11, y: 17, door: 'cellar' }, SILL = { x: 34, y: 6, door: 'tower' }, SEAL = { x: 36, y: 11, door: 'seal' };
  const LINKS = [
    [['arrival', -1], 'exit', [0, 0], 'start', {}],               // Wald → Burghof (aufs Schiff geht es nicht zurück)
    [[0, 1], CELLAR, [1, 0], 'start', {}],                         // Eingangshalle: Kellertür → Katakomben
    [[0, 1], SILL, [2, 0], 'start', {}],                           // Eingangshalle: Turmtür auf dem Sims → Bergfried
    [[0, 1], SEAL, [3, 0], 'start', { seals: true }],              // Eingangshalle: Siegeltor auf der Galerie → Thron
    [[0, -1], 'right', ['expo', 0], 'start', { boss: true }],      // Große Halle hinter der Riesenfledermaus → Wintergarten
    [[2, -1], 'right', ['sun', 0], 'start', { boss: true }],       // Marmorgalerie hinter Medusa → Sonnenkathedrale
    [[1, -1], 'right', [0, 1], CELLAR, { boss: true, oneway: true }], // Gruft hinter dem Knochenriesen → Aufzug zur Kellertür
  ];

  // ---------------- Spielstand: aufgedeckte Zellen, besiegte Bosse und Zwischengegner, freigeschaltete Warpkammern ----------------
  // seen: Raumschlüssel "<kapitel-id>:<raum>" → Set der Zellnummern; boss/mini/warp/vessel/relic/crack/flag: Schlüssel → 1
  let seen = {}, boss = {}, mini = {}, warp = {}, vessel = {}, relic = {}, crack = {}, flag = {};
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.v === 1) {
      for (const k in d.rooms) seen[k] = new Set(d.rooms[k]);
      boss = d.boss || {}; mini = d.mini || {}; warp = d.warp || {}; vessel = d.vessel || {};
      relic = d.relic || {}; crack = d.crack || {}; flag = d.flag || {};
    }
  } catch (e) { seen = {}; boss = {}; mini = {}; warp = {}; vessel = {}; relic = {}; crack = {}; flag = {}; }
  function save() {
    try {
      const rooms = {};
      for (const k in seen) rooms[k] = [...seen[k]];
      localStorage.setItem(KEY, JSON.stringify({ v: 1, rooms, boss, mini, warp, vessel, relic, crack, flag }));
    } catch (e) { /* privater Modus: gilt nur für diese Sitzung */ }
  }
  // Spielstand der Speicherkammer: Ort (Kapitel-id, Raum, Kammer), Held, Herzen, Spezialwaffe, Peitsche, Punkte, Leben
  function readSave() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'), s = d && d.v === 1 ? sIdx(d.s) : -1;
      if (s < 0 || !(d.r >= 0 && d.r < S()[s].rooms.length) || !d.place) return null;
      return { ...d, s };
    } catch (e) { return null; }
  }
  function writeSave(c) {
    const p = W.player;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: 1, s: S()[c.s].id, r: c.r, place: { x: c.x, y: c.y, chamber: 'save' },
        hero: Options.character, hearts: p.hearts, sub: p.sub, whip: p.whip, score: W.score, lives: W.lives, at: Date.now(),
        lv: rpg.lv, exp: rpg.exp, kills: rpg.kills, frames: rpg.frames }));
      return true;
    } catch (e) { return false; }
  }

  const S = () => Levels.STAGES;
  const sIdx = (id) => S().findIndex(st => st.id === id);
  const roomKey = (s, r) => S()[s].id + ':' + r;
  const mainCount = (s) => S()[s].rooms.filter(d => !d.side).length; // ohne die Zusatzräume des Schloss-Modus
  const ref = ([id, r]) => { if (id === 'side') return SIDE[r] || null; const s = sIdx(id); return s < 0 ? null : { s, r: r < 0 ? mainCount(s) + r : r }; };
  const same = (a, s, r) => a && a.s === s && a.r === r;
  const dims = (def) => ({ cw: Math.ceil(def.w / CW), ch: Math.ceil(def.h / CH) });
  const cellX = (x, cw) => clamp(Math.floor(x / CW), 0, cw - 1);
  const cellY = (y, ch) => clamp(Math.floor(y / CH), 0, ch - 1);
  const floorRow = (def, col, from) => { for (let y = Math.max(0, from); y < def.h; y++) if (SOLID.includes(def.grid[y][col])) return y; return def.h - 1; };
  // Einbahn: vom Schiff (Prolog), vom Eisturm (Rutschpartie) und von der einstürzenden Brücke führt kein Weg zurück
  const oneWay = (def) => !!(def.atSea || def.dock || def.iceRamps || def.ents.some(e => e.type === 'bridgerun'));

  // ---------------- Zusatzräume: das Schloss wächst über die Kapitel hinaus ----------------
  // Räume, die es nur im Schloss-Modus gibt: sie hängen hinten an ihrer Region (der Arcade-Modus lädt sie nie) und sind nur
  // über Türen erreichbar. tier = Gefahrenstufe (stärkere Gegner, mehr EXP), at = Platz auf der Schlosskarte (Zellen, absolut).
  // In jedem liegt ein Lebensgefäß (max. HP +4, einmal je Gefäß) – Erkunden lohnt sich wie in SotN.
  const SIDE = {};
  function buildSide() {
    const R = Levels.room;
    const add = (key, id, tier, at, def) => {
      const s = sIdx(id);
      if (s < 0) return;
      def.side = key; def.tier = tier; def.mapAt = at;
      S()[s].rooms.push(def); SIDE[key] = { s, r: S()[s].rooms.length - 1 };
    };
    // Kolosseum (unter dem Burghof): Kampfbahn mit Rittern und Skeletten, Zombies und Schädel kommen immer nach – zum Aufleveln
    add('kolosseum', 0, 2, [0, 1], R(84, 'gallery')
      .ground(0, 83)
      .fill(10, 8, 14, 8, '=').fill(24, 7, 30, 7, '=').fill(40, 8, 44, 8, '=').fill(54, 7, 60, 7, '=').fill(70, 8, 74, 8, '=')
      .candle(6, 9, 'H').candle(12, 6).candle(27, 5, '$').candle(42, 6, 'H').candle(57, 5).candle(72, 6, 'H')
      .enemy('knight', 20, 10).enemy('skel', 34, 10).enemy('knight', 48, 10).enemy('skel', 62, 10).enemy('knight', 76, 10)
      .enemy('ghost', 30, 4).enemy('ghost', 60, 4)
      .zone('ghoul', 8, 80, { interval: 120, max: 3 }).zone('skull', 20, 70, { interval: 300, max: 1 })
      .statue(4, 10).chest(78, 10, 'big').prop('vessel', { x: 72, y: 7 }) // am Ende liegt das erste Relikt (Doppelsprung)
      .label('KOLOSSEUM').start(2, 10).done());
    // Unterirdischer Kanal (unter dem Eisturm): von der Gruft zum Palmenhaus – zwei Becken mit Fischmenschen, Trittsteine, bröckelnde Steine
    add('kanal', 1, 3, [14, 11], R(112, 'cave')
      .ground(0, 14).fill(15, 11, 34, 12, '~')
      .fill(17, 9, 20, 9, '=').fill(24, 8, 27, 8, '=').fill(31, 9, 33, 9, '=')
      .ground(35, 52).fill(40, 8, 46, 8, '=')
      .fill(53, 11, 70, 12, '~').crumble(55, 9).crumble(59, 8).crumble(63, 9).fill(67, 9, 69, 9, '=')
      .ground(71, 111).fill(80, 8, 86, 8, '=').fill(94, 7, 100, 7, '=')
      .candle(4, 9).candle(10, 9, 'H').candle(25, 6).candle(43, 6, 'H').candle(50, 9, '$').candle(68, 7, 'H').candle(83, 6).candle(105, 9, 'H')
      .enemy('skel', 44, 10).enemy('skel', 90, 10).enemy('bat', 30, 3).enemy('bat', 76, 3).enemy('ghost', 60, 4).enemy('knight', 102, 10)
      .zone('fish', 15, 34, { interval: 180, max: 2 }).zone('fish', 53, 70, { interval: 180, max: 2 })
      .statue(37, 10).statue(73, 10).chest(95, 6, 'big').prop('vessel', { x: 98, y: 6 })
      .label('UNTERIRDISCHER KANAL').start(2, 10).done());
    // Schatzkammer (neben der Bibliothek): Empore mit dem Lebensgefäß, fliegende Bücher und ein Zauberbuch
    add('schatz', 2, 3, [6, -6], R(40, 'library')
      .ground(0, 39).stair(14, 10, 4, 1).fill(18, 7, 27, 7, '=').stair(31, 10, 4, -1)
      .prop('lectern', { x: 8, y: 10 }).prop('globe', { x: 35, y: 10 })
      .enemy('tome', 22, 4).enemy('book', 10, 9).enemy('book', 30, 9).enemy('book', 24, 6)
      .candle(5, 9, 'H').candle(12, 9).candle(20, 5, '$').candle(26, 5, 'H').candle(37, 9)
      .chest(37, 10, 'big').prop('vessel', { x: 22, y: 6 })
      .label('SCHATZKAMMER').start(2, 10).done());
    // Verlies (unter dem Glasturm): Ritter, Feuersäule, Geister – Stufe 7, für das Endspiel
    add('verlies', 3, 7, [0, -19], R(96, 'crypt')
      .ground(0, 95)
      .fill(12, 8, 16, 8, '=').fill(26, 7, 31, 7, '=').fill(42, 8, 46, 8, '=').fill(58, 7, 63, 7, '=').fill(74, 8, 78, 8, '=')
      .set(36, 10, 'X').set(36, 9, 'X')
      .candle(5, 9, 'H').candle(14, 6).candle(28, 5, 'H').candle(44, 6, '$').candle(62, 5, 'H').candle(76, 6, 'R').candle(88, 9, 'H')
      .enemy('knight', 22, 10).enemy('knight', 40, 10).enemy('pillar', 52, 10).enemy('knight', 68, 10).enemy('knight', 84, 10)
      .enemy('ghost', 30, 4).enemy('ghost', 70, 4).enemy('bat', 50, 3).enemy('bat', 86, 3)
      .zone('skull', 10, 90, { interval: 260, max: 2 }).zone('ghoul', 10, 90, { interval: 150, max: 2 })
      .statue(48, 10).chest(92, 10, 'big').prop('vessel', { x: 60, y: 6 })
      .label('VERLIES').start(2, 10).done());
    LINKS.push( // crack: Tür mit rissigem Gestein verschlossen – erst der Steinbrecher (Medusas Relikt) zerschlägt es
      [[0, 0], { x: 37, y: 10, door: 'side' }, ['side', 'kolosseum'], 'start', {}],                  // Burghof → Kolosseum
      [[1, 4], { x: 5, y: 10, door: 'side' }, ['side', 'kanal'], 'start', { crack: 'kanal' }],       // Gruft → Kanal
      [['side', 'kanal'], 'right', ['expo', 0], { x: 14, y: 27, door: 'side' }, {}],                  // Kanal → Palmenhaus (Schleife, von dort offen)
      [[2, 1], { x: 1, y: 17, door: 'side' }, ['side', 'schatz'], 'start', { crack: 'schatz' }],     // Bibliothek → Schatzkammer
      [[3, 1], { x: 4, y: 41, door: 'side' }, ['side', 'verlies'], 'start', { crack: 'verlies' }],   // Glasturm → Verlies
    );
  }
  if (on && Levels.room) buildSide();
  // Gefahrenstufe je Region: tiefer im Schloss mehr Lebensenergie, Schaden und EXP der Gegner
  const TIER = { arrival: 1, 0: 1, 1: 2, 2: 3, sun: 4, expo: 5, 3: 6 };
  const tierOf = (s, r) => { const d = S()[s].rooms[r]; return (d && d.tier) || TIER[S()[s].id] || 1; };

  // Zellen, die für den Erkundungsgrad zählen: dort kann man stehen (Luft über Boden, Treppen) oder etwas finden –
  // reine Himmelszellen über Schiff und Abgründen zählen nicht, damit 100 % erreichbar bleiben
  function countable(def) {
    const { cw, ch } = dims(def), out = new Uint8Array(cw * ch), g = def.grid;
    const mark = (x, y) => { out[cellY(y, ch) * cw + cellX(x, cw)] = 1; };
    for (let y = 0; y < def.h - 1; y++) for (let x = 0; x < def.w; x++) {
      const c = g[y][x];
      if (c === '/' || c === '\\' || (!SOLID.includes(c) && SOLID.includes(g[y + 1][x]))) mark(x, y);
    }
    def.ents.forEach(e => { if (STAND.includes(e.type)) mark(e.x, e.y); });
    return out;
  }

  // Zelle, in der der Held den Raum verlässt, und die Richtung, in der der nächste Raum anschließt
  function exitCell(def) {
    const { cw, ch } = dims(def), ex = def.exit;
    if (!ex) return { x: cw - 1, y: cellY(def.start.y, ch), dir: 'right' };
    const col = Math.min(ex.x1, ex.x0 + 1), stand = clamp(floorRow(def, col, ex.y0) - 1, ex.y0, ex.y1);
    return { x: cellX(col, cw), y: cellY(stand, ch), dir: ex.x1 >= def.w - 1 || ex.y1 > def.h / 3 ? 'right' : 'up' };
  }

  // Anordnung einer Region: jeder Raum schließt mit seiner Startzelle an die Ausgangszelle des vorigen an
  // (rechts daneben oder darüber); überlappt er, rückt er weiter in dieselbe Richtung
  const lay = {};
  function layout(s) {
    if (lay[s]) return lay[s];
    const out = [], used = new Set();
    const fits = (gx, gy, cw, ch) => {
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (used.has((gx + x) + ',' + (gy + y))) return false;
      return true;
    };
    S()[s].rooms.forEach((def, i) => {
      const { cw, ch } = dims(def), sc = { x: cellX(def.start.x, cw), y: cellY(def.start.y, ch) };
      let gx = 0, gy = 0, link = null;
      if (def.side) { const at = REGION_AT[S()[s].id] || [0, 0]; gx = def.mapAt[0] - at[0]; gy = def.mapAt[1] - at[1]; } // Zusatzraum: fester Platz
      else if (i > 0) {
        const p = out[i - 1], ax = p.gx + p.exit.x, ay = p.gy + p.exit.y, up = p.exit.dir === 'up';
        gx = up ? ax - sc.x : ax + 1 - sc.x; gy = up ? ay - 1 - sc.y : ay - sc.y;
        for (let n = 0; n < 64 && !fits(gx, gy, cw, ch); n++) { if (up) gy--; else gx++; }
        link = { ax, ay, bx: gx + sc.x, by: gy + sc.y, from: p.key, fromCell: p.exit.y * p.cw + p.exit.x, toCell: sc.y * cw + sc.x };
      }
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) used.add((gx + x) + ',' + (gy + y));
      const marks = [];
      def.ents.forEach(e => { if (e.type === 'statue') marks.push({ x: cellX(e.x, cw), y: cellY(e.y, ch), c: '#5cb8f8' }); }); // Engel: blau wie ihr Schein (rot = Speicherkammer)
      if (def.arena) marks.push({ x: cw - 1, y: cellY(def.start.y, ch), boss: true });
      if (def.mini) marks.push({ x: cellX((def.mini.x0 + def.mini.x1) / 2, cw), y: cellY(def.mini.minRow, ch), boss: true });
      out.push({ def, s, i, key: roomKey(s, i), gx, gy, cw, ch, start: sc, exit: exitCell(def), link, count: countable(def), marks });
    });
    return (lay[s] = out);
  }

  // ganzes Schloss: Regionen an ihre Plätze; unbekannte Kapitel (neu in levels.js) unten anhängen
  let castleLay = null;
  function castle() {
    if (castleLay) return castleLay;
    const rooms = [];
    let bottom = 0, extra = 0;
    S().forEach((st, s) => {
      const at = REGION_AT[st.id];
      layout(s).forEach(r => { if (at) bottom = Math.max(bottom, at[1] + r.gy + r.ch); });
    });
    S().forEach((st, s) => {
      const at = REGION_AT[st.id] || [0, bottom + 2 + (extra++) * 4];
      layout(s).forEach(r => rooms.push({ ...r, ax: at[0] + r.gx, ay: at[1] + r.gy }));
    });
    const used = new Map(); // Überlappung melden (z. B. wenn ein Raum größer wurde) – die Karte zeichnet trotzdem
    for (const r of rooms) for (let y = 0; y < r.ch; y++) for (let x = 0; x < r.cw; x++) {
      const k = (r.ax + x) + ',' + (r.ay + y);
      if (used.has(k)) console.warn('[NACHTMAHR] Schlosskarte: ' + r.key + ' überlappt ' + used.get(k));
      used.set(k, r.key);
    }
    return (castleLay = rooms);
  }
  const roomAt = (s, r) => castle().find(x => x.s === s && x.i === r);

  // Kartenzelle einer Türstelle (für Türmarken und Verbindungen auf der Karte)
  function placeCell(rm, place) {
    if (place === 'start') return rm.start;
    if (place === 'exit') return rm.exit;
    if (place === 'right') return { x: rm.cw - 1, y: cellY(rm.def.start.y, rm.ch) };
    return { x: cellX(place.x, rm.cw), y: cellY(place.y, rm.ch) };
  }

  // ---------------- Türen ----------------
  // alle Türen eines Raums: { place, to: { s, r, place }, gate }
  const doorCache = {};
  function doorsOf(s, r) {
    const k = s + ':' + r;
    if (doorCache[k]) return doorCache[k];
    const rooms = S()[s].rooms, out = [];
    if (r > 0 && !rooms[r].side && !oneWay(rooms[r - 1])) out.push({ place: 'start', to: { s, r: r - 1, place: 'exit' } }); // zurück in den vorigen Raum
    for (const [A, pa, B, pb, g] of LINKS) {
      const a = ref(A), b = ref(B);
      if (!a || !b) continue;
      if (same(a, s, r) && pa !== 'exit') out.push({ place: pa, to: { s: b.s, r: b.r, place: pb }, gate: g });
      if (same(b, s, r) && !g.oneway && pb !== 'exit') out.push({ place: pb, to: { s: a.s, r: a.r, place: pa } });
    }
    return (doorCache[k] = out);
  }
  // wohin führt der Ausgang des aktuellen Raums? (null = wie im Arcade-Modus)
  function forward() {
    const s = W.stage, r = W.roomIdx;
    if (r + 1 < S()[s].rooms.length && !S()[s].rooms[r + 1].side) return { s, r: r + 1, place: 'start' };
    for (const [A, pa, B, pb] of LINKS) { const a = ref(A), b = ref(B); if (a && b && same(a, s, r) && pa === 'exit') return { s: b.s, r: b.r, place: pb }; }
    return null;
  }
  const sealRooms = () => { const out = []; S().forEach((st, s) => { if (s < S().length - 1) st.rooms.forEach((d, r) => { if (d.arena) out.push(roomKey(s, r)); }); }); return out; };
  const seals = () => sealRooms().filter(k => boss[k]).length;
  function gateOpen(d) {
    if (!d.gate) return true;
    if (d.gate.boss) return !!boss[roomKey(W.stage, W.roomIdx)];
    if (d.gate.seals) return seals() >= sealRooms().length;
    if (d.gate.crack) return !!crack[d.gate.crack];
    return true;
  }
  // Art einer Tür: Rand (links/rechts durchgehen) oder ↑-Tür
  function kindOf(def, place) {
    if (place === 'right') return 'edgeR';
    if (place === 'start') return !def.wrap && def.start.x <= 3 ? 'edgeL' : 'up';
    return 'up';
  }
  function upSpot(def, place) { // ↑-Tür: Mitte (px) und Standhöhe (Füße, px)
    const p = place === 'start' ? def.start : place;
    return { cx: p.x * T + (place === 'start' ? 8 : 16), feet: (p.y + 1) * T };
  }

  // Tür in der Welt: Torbogen mit Goldrahmen (Siegeltor: violett mit den Siegeln); am Rand nur ein Pfeil, wenn der Held nah ist
  // Rundbogen aus Pixelzeilen: Halbkreis oben (Radius r), darunter gerade Wangen bis zum Boden
  function arch(ctx, cx, top, r, bottom, col) {
    ctx.fillStyle = col;
    for (let y = 0; y < r; y++) { const h = Math.round(Math.sqrt(r * r - (r - y - 0.5) * (r - y - 0.5))); ctx.fillRect(cx - h, top + y, h * 2, 1); }
    ctx.fillRect(cx - r, top + r, r * 2, bottom - top - r);
  }
  class CastleDoor extends Ent {
    constructor(d, def) {
      const seal = !!(d.place && d.place.door === 'seal');
      super(0, 0, seal ? 40 : 32, seal ? 52 : 44); this.kind = 'prop'; this.d = d; this.k = kindOf(def, d.place); this.seal = seal;
      if (this.k === 'up') { const u = upSpot(def, d.place); this.x = u.cx - this.w / 2; this.y = u.feet - this.h; }
      else if (this.k === 'edgeR') { this.x = def.w * T - this.w; this.y = floorRow(def, def.w - 2, def.start.y - 2) * T - this.h; }
      else { this.x = 0; this.y = (def.start.y + 1) * T - this.h; this.noWrap = true; }
    }
    update() { this.t++; }
    lightUp(L, cx, cy) { if (this.k === 'up' && gateOpen(this.d)) L.push({ x: this.cx - cx, y: this.y - cy + this.h / 2, r: 34 + Math.sin(this.t * 0.07) * 3, c: this.seal ? [190, 120, 252] : [252, 210, 140], a: 0.55 }); }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), p = W.player, open = gateOpen(this.d);
      const near = Math.abs(p.cx - this.cx) < (this.k === 'up' ? 14 : 4 * T) && Math.abs(p.feet - (this.y + this.h)) < (this.k === 'up' ? 8 : 3 * T);
      if (this.k !== 'up') { // Randtür: pulsierender Pfeil, sobald der Held in der Nähe ist (hinter dem Boss erst nach dem Sieg)
        if (!open || !near) return;
        ctx.globalAlpha = 0.55 + 0.45 * Math.sin(this.t * 0.15);
        Font.draw(ctx, this.k === 'edgeL' ? '←' : '→', this.k === 'edgeL' ? x + 4 : x + this.w - 10, y + this.h - 30, '#f8b800', { shadow: '#000' });
        ctx.globalAlpha = 1;
        return;
      }
      const cx = x + this.w / 2, bot = y + this.h, r = this.w / 2 - 4;
      const fr = this.seal ? '#7c3cc8' : '#c89020', dk = this.seal ? '#3c1c64' : '#6c4410', hi = this.seal ? '#e0c8fc' : '#fce0a8';
      arch(ctx, cx, y + 3, r + 4, bot, dk); arch(ctx, cx, y + 4, r + 3, bot, fr); arch(ctx, cx, y + 5, r + 2, bot, hi); arch(ctx, cx, y + 6, r + 1, bot, fr);
      arch(ctx, cx, y + 8, r, bot, '#05020a');
      if (open) { // Glut im Torbogen, unten am stärksten
        const a = 0.22 + 0.1 * Math.sin(this.t * 0.06);
        for (let k = 0; k < 4; k++) { ctx.globalAlpha = a * (k + 1) / 4; arch(ctx, cx, y + 14 + k * 6, r - 2, bot, this.seal ? '#9c4cfc' : '#c86c10'); }
        ctx.globalAlpha = 1;
      } else { ctx.fillStyle = '#6c6c7c'; for (let i = -r + 3; i < r; i += 5) ctx.fillRect(cx + i, y + 10, 1, bot - y - 10); ctx.fillRect(cx - r, y + 20, r * 2, 1); } // Gitter
      ctx.fillStyle = dk; ctx.fillRect(cx - r - 4, bot - 2, (r + 4) * 2, 2); // Schwelle
      ctx.fillStyle = hi; ctx.fillRect(cx - 2, y + 2, 4, 3); ctx.fillStyle = fr; ctx.fillRect(cx - 1, y + 3, 2, 1); // Schlussstein
      if (this.seal) { // fünf Siegelsockel über dem Tor, besiegte Bosse leuchten rot
        const n = sealRooms().length, h = seals();
        for (let i = 0; i < n; i++) { const sx = cx - n * 3 + i * 6 + 1; ctx.fillStyle = '#1c0c2c'; ctx.fillRect(sx - 1, y - 7, 6, 6); ctx.fillStyle = i < h ? '#fc3c3c' : '#4c3c5c'; ctx.fillRect(sx, y - 6, 4, 4); }
      }
      if (near) Font.draw(ctx, '↑', cx - 2, y - (this.seal ? 18 : 12) + Math.round(Math.sin(this.t * 0.12) * 2), open ? '#fcfcfc' : '#8c8c9c', { shadow: '#000' });
    }
  }

  // ---------------- Kammern: Speichern und Schnellreise ----------------
  // je Region eine Speicher- und eine Warpkammer, dazu Speichern am Waldrand des Prologs. Plätze von Hand gewählt (ebener Boden,
  // 2 Kacheln breit, 3 hoch frei, nicht vor Kerzen oder neben Gegnern, nicht auf den Randtüren): [Raum, Art, Kachel-x, Standreihe].
  // Passt ein Platz nach einem Umbau nicht mehr, sucht findSpot die nächste freie Bodenstelle rechts vom Start.
  const CHAMBERS = [
    [['arrival', -1], 'save', 7, 10],                              // Wald: gleich nach der Landung
    [[0, 1], 'save', 63, 17], [[0, 1], 'warp', 67, 17],            // Eingangshalle: unter dem rechten Sims
    [[1, 0], 'save', 8, 10], [[1, 0], 'warp', 15, 10],             // Katakomben: Ufer des Höhlensees
    [[2, 0], 'save', 6, 10], [[2, 0], 'warp', 10, 10],             // Bergfried: vor der Stachelgrube
    [['sun', 0], 'save', 6, 15], [['sun', 0], 'warp', 11, 15],     // Sonnenkathedrale: Vorplatz
    [['expo', 0], 'save', 5, 27], [['expo', 0], 'warp', 63, 27],   // Wintergarten: Eingang und jenseits des Beckens
    [[3, 0], 'save', 57, 10], [[3, 2], 'warp', 3, 8],              // Thron: Ende des Strudels, Torbogen vor der Brücke
  ];
  function spotOk(def, x, y) { // ebener Boden unter beiden Kacheln, darüber drei Reihen frei
    if (y < 3 || y + 1 >= def.h || x < 1 || x + 1 >= def.w) return false;
    for (let dx = 0; dx < 2; dx++) {
      if (!'#='.includes(def.grid[y + 1][x + dx])) return false;
      for (let dy = 0; dy < 3; dy++) if (def.grid[y - dy][x + dx] !== '.') return false;
    }
    return true;
  }
  function findSpot(def, from, taken) {
    const y = def.start.y, g = def.grid, ex = def.exit, last = def.arena ? def.w - 22 : def.w - 3;
    if (y < 3 || y + 1 >= def.h) return null;
    for (let x = Math.max(1, from); x < last; x++) {
      let ok = true;
      for (let dx = 0; dx < 2 && ok; dx++) {
        if (!'#='.includes(g[y + 1][x + dx])) ok = false;
        for (let dy = 0; dy < 3 && ok; dy++) if (g[y - dy][x + dx] !== '.') ok = false;
      }
      if (!ok || taken.some(t => Math.abs(t - x) < 4)) continue;
      if (ex && x + 1 >= ex.x0 - 1 && x <= ex.x1 + 1 && y >= ex.y0 - 2 && y <= ex.y1 + 2) continue;
      if (def.mini && x + 1 >= def.mini.x0 && x <= def.mini.x1) continue;
      if (def.ents.some(e => (typeof e.x === 'number' && typeof e.y === 'number' && Math.abs(e.x - (x + 0.5)) < 3 && Math.abs(e.y - y) < 4)
        || (typeof e.x0 === 'number' && typeof e.x1 === 'number' && x + 2 >= e.x0 && x - 1 <= e.x1 && (e.row === undefined || Math.abs(e.row - y) < 4)))) continue;
      return { x, y };
    }
    return null;
  }
  const chamberCache = {};
  function chambersOf(s, r) {
    const k = s + ':' + r;
    if (chamberCache[k]) return chamberCache[k];
    const def = S()[s].rooms[r], out = [], taken = [];
    for (const d of doorsOf(s, r)) if (d.place && typeof d.place === 'object') taken.push(d.place.x);
    let from = def.start.x + 3;
    for (const [R, kind, hx, hy] of CHAMBERS) {
      if (!same(ref(R), s, r)) continue;
      const spot = spotOk(def, hx, hy) ? { x: hx, y: hy } : findSpot(def, from, taken);
      if (!spot) { console.warn('[NACHTMAHR] Schloss: kein Platz für die ' + kind + '-Kammer in ' + roomKey(s, r)); continue; }
      out.push({ kind, s, r, x: spot.x, y: spot.y, key: roomKey(s, r) + ':' + kind });
      taken.push(spot.x); from = spot.x + 4;
    }
    return (chamberCache[k] = out);
  }
  const allChambers = () => { const out = []; S().forEach((st, s) => st.rooms.forEach((d, r) => out.push(...chambersOf(s, r)))); return out; };

  // Kammer in der Welt: Steinnische mit Rundbogen; Speichern: roter Sarg im roten Licht, Warp: kreisender Strudel
  class CastleChamber extends Ent {
    constructor(c) { super((c.x + 1) * T - 20, (c.y + 1) * T - 52, 40, 52); this.kind = 'prop'; this.c = c; this.pulse = 0; }
    update() { this.t++; if (this.pulse > 0) this.pulse--; }
    lightUp(L, cx, cy) {
      const save = this.c.kind === 'save', on = save || warp[this.c.key];
      L.push({ x: this.cx - cx, y: this.y - cy + 30, r: 40 + Math.sin(this.t * 0.05) * 4 + this.pulse, c: save ? [252, 60, 50] : on ? [110, 200, 255] : [90, 110, 160], a: save ? 0.7 : 0.55 });
    }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), cx = x + 20, bot = y + 52, save = this.c.kind === 'save', t = this.t;
      const fr = save ? '#a8282c' : '#2c6cb0', dk = save ? '#3c080c' : '#0c1c3c', hi = save ? '#fca0a0' : '#a8dcfc';
      arch(ctx, cx, y, 20, bot, dk); arch(ctx, cx, y + 1, 19, bot, fr); arch(ctx, cx, y + 2, 18, bot, hi); arch(ctx, cx, y + 3, 17, bot, fr);
      arch(ctx, cx, y + 5, 15, bot, '#05020a');
      if (save) { // rotes Licht von oben, Sarg auf dem Sockel
        for (let k = 0; k < 4; k++) { ctx.globalAlpha = (0.12 + 0.05 * Math.sin(t * 0.05)) * (k + 1) + this.pulse / 120; arch(ctx, cx, y + 6 + k * 3, 14 - k * 3, bot, '#e83020'); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2c1c14'; ctx.fillRect(cx - 9, bot - 6, 18, 6); ctx.fillStyle = '#5c3c24'; ctx.fillRect(cx - 9, bot - 6, 18, 1); // Sockel
        ctx.fillStyle = '#3c140c'; ctx.beginPath(); ctx.moveTo(cx - 4, bot - 34); ctx.lineTo(cx + 4, bot - 34); ctx.lineTo(cx + 6, bot - 26); ctx.lineTo(cx + 4, bot - 6); ctx.lineTo(cx - 4, bot - 6); ctx.lineTo(cx - 6, bot - 26); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8c2c1c'; ctx.fillRect(cx - 4, bot - 34, 8, 1); ctx.fillRect(cx - 6, bot - 26, 1, 4);
        ctx.fillStyle = '#f8b800'; ctx.fillRect(cx - 1, bot - 30, 2, 12); ctx.fillRect(cx - 4, bot - 26, 8, 2); // Kreuz auf dem Deckel
      } else { // Strudel: Ringe kreisen, freigeschaltet leuchtend
        const on = warp[this.c.key], a = t * 0.06;
        for (let i = 0; i < 5; i++) {
          const rr = 13 - i * 2.4, ph = a * (i % 2 ? -1 : 1) + i;
          ctx.strokeStyle = on ? (i % 2 ? '#7cd8fc' : '#f0fcff') : '#3c4c6c'; ctx.globalAlpha = on ? 0.9 - i * 0.12 : 0.6;
          ctx.beginPath(); ctx.ellipse(cx, bot - 22, rr, rr * 1.25, 0, ph, ph + Math.PI * 1.4); ctx.stroke();
        }
        ctx.globalAlpha = 1; ctx.fillStyle = on ? '#ffffff' : '#5c6c8c'; ctx.fillRect(cx - 1, bot - 23, 2, 2);
        ctx.fillStyle = '#1c2c4c'; ctx.fillRect(cx - 12, bot - 3, 24, 3); ctx.fillStyle = on ? '#58b8f8' : '#3c4c6c'; ctx.fillRect(cx - 12, bot - 3, 24, 1); // Sockelplatte
      }
      const p = W.player;
      if (!save && Math.abs(p.cx - this.cx) < 14 && Math.abs(p.feet - bot - W.cam.y) < 8 && warp[this.c.key]) Font.draw(ctx, '↑', cx - 2, y - 12 + Math.round(Math.sin(t * 0.12) * 2), '#fcfcfc', { shadow: '#000' });
    }
  }
  // Lebensgefäß (in jedem Zusatzraum): schwebendes rotes Herz in einem Glaskolben auf Goldsockel – berühren: max. HP +4 für immer
  class LifeVessel extends Ent {
    constructor(d, key) { super(d.x * T, (d.y + 1) * T - 24, 16, 24); this.kind = 'prop'; this.key = key; this.taken = false; }
    update() {
      this.t++;
      const p = W.player;
      if (this.taken || !p.alive || !Phys.overlap(this, p)) return;
      this.taken = true; this.dead = true; vessel[this.key] = 1; save();
      applyHp(p); p.hp = p.maxHp;
      Game.note('castleVessel', vessels() * 4); Audio8.sfx('bigItem'); Audio8.sfx('oneUp'); Input.rumble(0.5, 0.4, 250);
      W.popup(this.cx, this.y - 6, 'MAX HP +4', '#fc7460'); W.flash = 6;
      for (let i = 0; i < 24; i++) W.spawn(new Particle(this.cx + rnd(-6, 6), this.y + rnd(0, 18), rnd(-1, 1), rnd(-2.2, -0.6), i % 2 ? '#fc3c3c' : '#fce0a8', 50, 1, 0));
    }
    lightUp(L, cx, cy) { L.push({ x: this.cx - cx, y: this.y - cy + 8, r: 26 + Math.sin(this.t * 0.08) * 4, c: [252, 80, 90], a: 0.6 }); }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), bob = Math.round(Math.sin(this.t * 0.07) * 2), t = this.t;
      ctx.fillStyle = '#6c4410'; ctx.fillRect(x + 1, y + 20, 14, 4); ctx.fillStyle = '#c89020'; ctx.fillRect(x + 2, y + 19, 12, 2); ctx.fillStyle = '#fce0a8'; ctx.fillRect(x + 2, y + 19, 12, 1); // Sockel
      ctx.fillStyle = 'rgba(180,220,255,0.28)'; ctx.fillRect(x + 3, y + 3 + bob, 10, 15); ctx.fillStyle = 'rgba(230,245,255,0.6)'; ctx.fillRect(x + 4, y + 4 + bob, 1, 12); // Glaskolben
      ctx.fillStyle = '#c89020'; ctx.fillRect(x + 5, y + 1 + bob, 6, 2);
      const hx = x + 4, hy = y + 7 + bob, pulse = (t >> 4) % 2; // Herz
      ctx.fillStyle = pulse ? '#fc3c3c' : '#d81830';
      ctx.fillRect(hx, hy + 1, 3, 3); ctx.fillRect(hx + 5, hy + 1, 3, 3); ctx.fillRect(hx + 1, hy, 2, 1); ctx.fillRect(hx + 5, hy, 2, 1);
      ctx.fillRect(hx, hy + 3, 8, 2); ctx.fillRect(hx + 1, hy + 5, 6, 1); ctx.fillRect(hx + 2, hy + 6, 4, 1); ctx.fillRect(hx + 3, hy + 7, 2, 1);
      ctx.fillStyle = '#fcbca0'; ctx.fillRect(hx + 1, hy + 1, 1, 1);
    }
  }
  // ---------------- Relikte: Fähigkeiten, die den Weg öffnen (wie in SotN) ----------------
  // Am Burgtor raubt der Fluch des Grafen dem Helden Doppelsprung, Dash, Wandsprung und Ring-Greifen (Kante packen und Rutschen
  // bleiben); im Prolog auf dem Schiff kann er noch alles. Die Relikte liegen im Schloss: Doppelsprung am Ende des Kolosseums,
  // Dash bei der Riesenfledermaus, Ring-Greifen in der Eishöhle, Wandsprung beim Knochenriesen, Steinbrecher bei Medusa
  // (zerschlägt rissiges Gestein vor Kanal, Schatzkammer und Verlies). So führt ein Relikt zum nächsten.
  const RELICS = ['jump2', 'dash', 'ring', 'wall', 'breaker'];
  const RELIC_COL = { jump2: '#e8f0fc', dash: '#9c6cfc', ring: '#f8b800', wall: '#58f898', breaker: '#fc7460' };
  const RELIC_AT = [[['side', 'kolosseum'], 'jump2', 81, 10], [[1, 2], 'ring', 12, 10]];        // fest liegende Relikte
  const BOSS_RELIC = [[[0, -1], 'dash'], [[1, -1], 'wall'], [[2, -1], 'breaker']];               // Belohnung der Regionsbosse
  const inPrologue = () => !!(S()[W.stage] && S()[W.stage].id === 'arrival');
  const has = (k) => !on || !!relic[k] || inPrologue();
  if (on) { // Bewegungen hängen an den Relikten (Doppelsprung: siehe update)
    const sd = Player.prototype.startDash, wd = Player.prototype.wallDir, tl = Player.prototype.tryLatch;
    Player.prototype.startDash = function (...a) { if (has('dash')) return sd.apply(this, a); };
    Player.prototype.wallDir = function () { return has('wall') ? wd.call(this) : 0; };
    Player.prototype.tryLatch = function (...a) { return has('ring') ? tl.apply(this, a) : false; };
  }
  class RelicStone extends Ent { // Steinsockel, darüber schwebt das Relikt als leuchtende Kugel
    constructor(k, x, y) { super(x * T, (y + 1) * T - 28, 16, 28); this.kind = 'prop'; this.k = k; }
    update() {
      this.t++;
      const p = W.player;
      if (relic[this.k] || !p.alive || !Phys.overlap(this, p)) return;
      relic[this.k] = 1; save(); this.dead = true;
      Game.note('castleRelic', tr('relic_' + this.k), tr('relicD_' + this.k));
      Audio8.sfx('bigItem'); Audio8.sfx('rosary'); Input.rumble(0.6, 0.5, 400); W.flash = 8;
      for (let i = 0; i < 30; i++) W.spawn(new Particle(this.cx + rnd(-8, 8), this.y + rnd(0, 20), rnd(-1.4, 1.4), rnd(-2.4, -0.4), i % 2 ? RELIC_COL[this.k] : '#fcfcfc', 56, 1, 0));
    }
    lightUp(L, cx, cy) { const c = RELIC_COL[this.k], v = parseInt(c.slice(1), 16); L.push({ x: this.cx - cx, y: this.y - cy + 6, r: 34 + Math.sin(this.t * 0.06) * 5, c: [v >> 16, (v >> 8) & 255, v & 255], a: 0.7 }); }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), t = this.t, bob = Math.round(Math.sin(t * 0.07) * 2), c = RELIC_COL[this.k];
      ctx.fillStyle = '#3c3448'; ctx.fillRect(x, y + 20, 16, 8); ctx.fillStyle = '#6c6480'; ctx.fillRect(x, y + 20, 16, 1); ctx.fillRect(x + 2, y + 18, 12, 2); // Sockel
      ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 0.1); ctx.fillStyle = c; ctx.fillRect(x + 2, y + 1 + bob, 12, 12); ctx.globalAlpha = 1; // Schein
      ctx.fillStyle = c; ctx.fillRect(x + 5, y + 3 + bob, 6, 8); ctx.fillRect(x + 4, y + 4 + bob, 8, 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 4 + bob, 2, 2);
      for (let i = 0; i < 3; i++) { const a = t * 0.08 + i * 2.1; ctx.fillStyle = c; ctx.fillRect(Math.round(x + 8 + Math.cos(a) * 10), Math.round(y + 7 + bob + Math.sin(a) * 6), 1, 1); } // kreisende Funken
    }
  }
  class CrackedSeal extends Ent { // rissiges Gestein in einem Torbogen: nur der Steinbrecher zerschlägt es (Peitsche oder Spezialwaffe)
    constructor(key, cx, feet) { super(cx - 13, feet - 38, 26, 38); this.kind = 'candle'; this.key = key; this.cool = 0; }
    update() { this.t++; if (this.cool > 0) this.cool--; }
    hit() {
      if (crack[this.key]) return;
      if (!has('breaker')) { if (!this.cool) { this.cool = 50; Game.note('castleCrackHard'); Audio8.sfx('wall'); W.sparks(this.cx, this.cy, 4); } return; }
      crack[this.key] = 1; save(); this.dead = true;
      Audio8.sfx('crumble', this.cx); Audio8.sfx('boom'); W.shake = Math.max(W.shake, 12); Input.rumble(0.7, 0.6, 300);
      for (let i = 0; i < 28; i++) W.spawn(new Particle(this.x + rnd(0, this.w), this.y + rnd(0, this.h), rnd(-2.4, 2.4), rnd(-3.4, -0.4), i % 3 ? '#8c8478' : '#5c5448', 60, 2, 0.18));
    }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), w = this.w, h = this.h;
      ctx.fillStyle = '#5c5448'; ctx.fillRect(x, y + 6, w, h - 6); ctx.fillRect(x + 3, y + 2, w - 6, 4);
      ctx.fillStyle = '#7c7464'; for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) ctx.fillRect(x + 2 + c * 12 + (r % 2) * 6, y + 7 + r * 8, 9, 6); // Quader
      ctx.fillStyle = '#1c1814'; // Risse
      for (const [a, b] of [[6, 8], [7, 12], [9, 15], [8, 20], [11, 24], [13, 29], [16, 12], [18, 17], [17, 22], [20, 27]]) ctx.fillRect(x + a, y + b, 2, 3);
    }
  }
  function spawnRelics(s, r, def, arrive) {
    const here = ([R]) => same(ref(R), s, r);
    for (const e of RELIC_AT) if (here(e) && !relic[e[1]]) W.spawn(new RelicStone(e[1], e[2], e[3]));
    for (const [R, k] of BOSS_RELIC) if (same(ref(R), s, r) && boss[roomKey(s, r)] && !relic[k]) W.spawn(new RelicStone(k, def.w - 10, def.start.y));
    for (const d of doorsOf(s, r)) {
      if (!d.gate || !d.gate.crack || crack[d.gate.crack]) continue;
      const p = arrive && arrive.place;
      if (p && typeof p === 'object' && p.x === d.place.x && p.y === d.place.y) { // von der anderen Seite her: das Gestein bricht von innen
        crack[d.gate.crack] = 1; save(); Audio8.sfx('crumble'); W.shake = Math.max(W.shake, 8); continue;
      }
      const u = upSpot(def, d.place); W.spawn(new CrackedSeal(d.gate.crack, u.cx, u.feet));
    }
  }
  const atChamber = (c, p) => p.onGround && Math.abs(p.cx - (c.x + 1) * T) < 14 && Math.abs(p.feet - (c.y + 1) * T) < 8;
  let inSave = null; // Schlüssel der Speicherkammer, in der der Held gerade steht (erst nach dem Verlassen wieder speichern)
  function saveAt(c) {
    const p = W.player;
    p.hp = p.maxHp; if (!Options.infHearts) p.hearts = Math.max(p.hearts, 10);
    const ok = writeSave(c);
    W.checkpoint = { stage: c.s, room: c.r, cx: (c.x + 1) * T, feet: (c.y + 1) * T };
    Game.note(ok ? 'castleSaved' : 'castleSaveFail'); Audio8.sfx('checkpoint'); Audio8.sfx('heart'); Input.rumble(0.3, 0.2, 150);
    const e = W.ents.find(o => o instanceof CastleChamber && o.c.key === c.key);
    if (e) e.pulse = 40;
    for (let i = 0; i < 18; i++) W.spawn(new Particle((c.x + 1) * T + rnd(-10, 10), (c.y + 1) * T - rnd(4, 40), rnd(-0.4, 0.4), rnd(-1.4, -0.3), i % 2 ? '#fc5040' : '#fce0a8', 46, 1, 0));
  }

  // nach jedem Raumaufbau (Tür, Kapitelstart, Wiedereinstieg nach dem Tod): Türen setzen, besiegte Bosse fernhalten,
  // bei Ankunft den Helden an die Tür stellen
  let guard = false, push = 0, lastX = 0, lockT = 0;
  function settle(arrive) {
    const s = W.stage, r = W.roomIdx, def = S()[s].rooms[r], key = roomKey(s, r);
    if (boss[key] && s < S().length - 1) W.room.arena = null; // Bossarena: Boss besiegt, der Raum ist frei
    if (mini[key]) W.miniDone[s + ':' + r] = true;
    W.ents = W.ents.filter(e => !(e instanceof CastleDoor) && !(e instanceof CastleChamber));
    for (const d of doorsOf(s, r)) W.spawn(new CastleDoor(d, def));
    for (const c of chambersOf(s, r)) W.spawn(new CastleChamber(c));
    for (const e of def.ents) if (e.type === 'vessel') { const k = key + ':v' + e.x; if (!vessel[k]) W.spawn(new LifeVessel(e, k)); } // Lebensgefäße
    if (arrive && def.side) Game.note('castleSideRoom', def.label, '*'.repeat(def.tier)); // Zusatzraum: Name und Gefahrenstufe
    spawnRelics(s, r, def, arrive);
    if (S()[s].id === 0 && !flag.curse) { // Burgtor: der Fluch des Grafen raubt die Kräfte (einmal)
      flag.curse = 1; save();
      Game.note('castleCurse'); W.flash = 10; W.shake = Math.max(W.shake, 14); Audio8.sfx('roar'); Audio8.sfx('thunder'); Input.rumble(0.8, 0.6, 600);
    }
    hpSeen.clear(); applyHp(W.player); // neuer Raum: Gegner des alten zählen nicht als besiegt
    inSave = arrive && arrive.place && arrive.place.chamber === 'save' ? roomKey(s, r) + ':save' : null; // beim Fortsetzen nicht gleich noch einmal speichern
    if (arrive && arrive.place !== 'start') {
      const p = W.player;
      let cx, feet, face = 1;
      if (arrive.place === 'exit') { // vor der Ausgangszone, wenn dort Boden in ihrer Höhe ist – sonst mitten darin (dann gilt sie erst nach dem Verlassen)
        const ex = def.exit, out = ex.x0 - 1, fo = out >= 0 ? floorRow(def, out, ex.y0) : def.h;
        const col = out >= 0 && fo - 1 <= ex.y1 + 1 && !SOLID.includes(def.grid[fo - 1][out]) ? out : Math.min(ex.x1, Math.floor((ex.x0 + ex.x1 + 1) / 2));
        cx = col * T + 8; feet = floorRow(def, col, ex.y0) * T; face = ex.x1 >= def.w - 1 || cx > def.w * T / 2 ? -1 : 1;
      } else if (arrive.place === 'right') {
        cx = (def.w - 2) * T + 8; feet = floorRow(def, def.w - 2, def.start.y - 2) * T; face = -1;
      } else { const u = upSpot(def, arrive.place); cx = u.cx; feet = u.feet; }
      p.reset(cx, feet); p.face = face;
      W.checkpoint = { stage: s, room: r, cx, feet }; // nach dem Tod hier wieder einsteigen
      W.snapCam();
    }
    guard = true; push = 0; lastX = W.player.x;
    if (inExit()) W.exiting = true; // in der Ausgangszone angekommen: erst hinaus, dann gilt sie wieder
  }
  function inExit() {
    const ex = W.room && W.room.exit, p = W.player;
    return !!ex && p.cx >= ex.x0 * T && p.cx < (ex.x1 + 1) * T && p.feet > ex.y0 * T && p.feet <= (ex.y1 + 1) * T + 0.5;
  }

  // Zelle des Helden im aktuellen Raum (Turmräume: Umfang modulo)
  function heroCell() {
    const p = W.player, def = W.room;
    if (!p || !def) return null;
    const { cw, ch } = dims(def), C = def.w * T;
    let x = p.cx;
    if (def.wrap) x = ((x % C) + C) % C;
    return { x: cellX(x / T, cw), y: cellY((p.feet - 1) / T, ch), cw };
  }

  // jedes Spielbild (Zustand play): Zelle aufdecken, Zwischengegner merken, Türen benutzen
  function update(P) {
    const c = heroCell(), s = W.stage, r = W.roomIdx, key = roomKey(s, r);
    if (!c) return;
    rpg.frames++; applyHp(W.player); trackHits(); // RPG: Spielzeit, max. HP der Stufe, Treffer und Besiegte
    if (!has('jump2')) W.player.canDouble = false; // ohne Rabenfeder kein Doppelsprung
    let dirty = false;
    const set = seen[key] || (seen[key] = new Set()), i = c.y * c.cw + c.x;
    if (!set.has(i)) { set.add(i); dirty = true; }
    if (W.miniDone[s + ':' + r] && !mini[key]) { mini[key] = 1; dirty = true; }
    if (dirty) save();
    if (guard && !inExit()) { guard = false; W.exiting = false; }
    if (lockT > 0) lockT--;
    const p = W.player, def = S()[s].rooms[r];
    if (!p.alive || p.state !== 'normal' || W.arenaOn) { push = 0; lastX = p.x; return; }
    for (const c of chambersOf(s, r)) { // Speicherkammer: hineingehen = speichern; Warpkammer: betreten schaltet frei, ↑ reist
      const at = atChamber(c, p);
      if (c.kind === 'save') {
        if (at && inSave !== c.key) { inSave = c.key; saveAt(c); } else if (!at && inSave === c.key) inSave = null;
      } else if (at) {
        if (!warp[c.key]) { warp[c.key] = 1; save(); Game.note('castleWarpOn'); Audio8.sfx('bigItem'); }
        if (P.up) { push = 0; Game.openWarp(c); return; }
      }
    }
    const I = Input.held;
    for (const d of doorsOf(s, r)) {
      const k = kindOf(def, d.place);
      let use = false;
      if (k === 'up') { const u = upSpot(def, d.place); use = P.up && p.onGround && Math.abs(p.cx - u.cx) < 14 && Math.abs(p.feet - u.feet) < 8; }
      else if (k === 'edgeL') use = I.left && p.onGround && p.cx < (def.start.x + 1.5) * T && Math.abs(p.feet - (def.start.y + 1) * T) <= 2 * T && push >= 6;
      else use = I.right && p.onGround && p.cx > (def.w - 2.5) * T && push >= 6;
      if (!use) continue;
      if (!gateOpen(d)) {
        if (!lockT) { lockT = 90; if (d.gate.seals) Game.note('castleSeals', seals(), sealRooms().length); else if (d.gate.crack) Game.note('castleCrackHard'); else Game.note('castleLocked'); Audio8.sfx('select'); }
        push = 0; break;
      }
      push = 0; Game.castleGo(d.to); return;
    }
    const pushing = (I.left || I.right) && Math.abs(p.x - lastX) < 0.05;
    push = pushing ? push + 1 : 0; lastX = p.x;
  }

  // Boss besiegt (Orb eingesammelt): Siegel statt Kapitelende – die Arena öffnet sich, weiter geht es zu Fuß
  function bossBeaten() {
    const s = W.stage;
    if (s >= S().length - 1) return false; // der Graf: Abspann wie gewohnt
    boss[roomKey(s, W.roomIdx)] = 1; save();
    W.cleared = false; W.arenaOn = false; W.camLock = false; W.arenaW = 0; W.camEase = 1; W.boss = null; W.room.arena = null;
    W.ents = W.ents.filter(e => !(e instanceof CastleDoor));
    for (const d of doorsOf(s, W.roomIdx)) W.spawn(new CastleDoor(d, S()[s].rooms[W.roomIdx]));
    const def = S()[s].rooms[W.roomIdx];
    for (const [R, k] of BOSS_RELIC) if (same(ref(R), s, W.roomIdx) && !relic[k]) W.spawn(new RelicStone(k, def.w - 10, def.start.y)); // Relikt des Bosses
    Game.bossName = 0; Audio8.tempo(1); Audio8.play('fanfare', W.songName()); Audio8.sfx('bigItem');
    Game.note('castleSeal', seals(), sealRooms().length);
    return true;
  }

  // ---------------- RPG: EXP, Stufe, Werte, Schadenszahlen, Beute ----------------
  const rpg = { lv: 1, exp: 0, kills: 0, frames: 0 }, MAXLV = 99;
  const expFor = (lv) => 15 * lv * (lv - 1); // Gesamt-EXP für Stufe lv: LV2 30, LV5 300, LV10 1350, LV20 5700
  const vessels = () => Object.keys(vessel).length;
  const values = () => { const b = rpg.lv - 1; return { str: 10 + b, con: 10 + b, hp: Options.maxHp + 2 * b + 4 * vessels() }; };
  const strMul = () => 1 + (values().str - 10) * 0.05, conDiv = () => 1 + (values().con - 10) * 0.04;
  if (on) { // STR verstärkt Peitsche und Spezialwaffen, CON mindert erlittenen Schaden – nur im Schloss-Modus
    Object.defineProperty(Options, 'dmgMul', { get: () => (Options.easy ? 2 : 1) * strMul(), configurable: true });
    const hurt = Player.prototype.hurt;
    Player.prototype.hurt = function (dmg, srcX) { return hurt.call(this, Math.max(1, Math.round(dmg / conDiv())), srcX); };
  }
  function applyHp(p) { // max. HP folgt der Stufe (Leicht-Modus verdoppelt die Grundleiste weiter)
    const want = values().hp;
    if (!p || p.maxHp === want) return;
    const d = want - p.maxHp; p.maxHp = want; p.hp = clamp(p.hp + Math.max(0, d), 0, want);
  }
  function gainExp(n) {
    rpg.exp += n;
    let up = 0;
    while (rpg.lv < MAXLV && rpg.exp >= expFor(rpg.lv + 1)) { rpg.lv++; up++; }
    if (!up) return;
    const p = W.player; applyHp(p);
    Game.shout('castleLvUp'); Audio8.sfx('oneUp'); Input.rumble(0.4, 0.3, 200);
    W.popup(p.cx, p.y - 12, 'LV ' + rpg.lv, '#58f898');
    for (let i = 0; i < 20; i++) W.spawn(new Particle(p.cx + rnd(-8, 8), p.y + rnd(0, 28), rnd(-0.6, 0.6), rnd(-2, -0.6), i % 2 ? '#58f898' : '#fce0a8', 44, 1, 0));
  }
  // Treffer: an der gesunkenen Lebensenergie erkennen (gilt für jede Gegnerart, ohne ihre Klassen anzufassen);
  // verschwindet ein Gegner mit 0 Energie, war er besiegt – sonst nur aus dem Bild gelaufen oder vom Raumwechsel entfernt
  const hpSeen = new Map();
  function dmgNumber(e, d) { W.popup(e.cx + rnd(-4, 4), e.y - 2, String(Math.max(1, Math.round(d * 10))), e.kind === 'boss' ? '#f8b800' : '#fcfcfc'); }
  function defeated(e) {
    const big = e.kind === 'boss';
    rpg.kills++;
    gainExp(Math.max(1, Math.round(big ? Math.max((e.score || 0) / 20, (e.maxHp || 20) * 6) : (e.score || 100) / 15 * (e.expMul || 1))));
    const r = Math.random(), drop = big ? 'bagBig' : r < 0.05 ? 'roast' : r < 0.12 ? 'bag' : r < 0.17 ? 'heartB' : null; // Beute wie in SotN
    if (drop) W.spawn(new Item(drop, e.cx, Math.min(e.cy, W.room.h * T - 24)));
  }
  // Gefahrenstufe: jeder Gegner (auch nachkommende und Geschosse) wird beim ersten Auftauchen einmal verstärkt
  const scaled = new WeakSet();
  function scale(e) {
    scaled.add(e);
    const t = tierOf(W.stage, W.roomIdx), k = t - 1;
    if (k <= 0) return;
    if (typeof e.dmg === 'number') e.dmg = Math.max(1, Math.round(e.dmg * (1 + 0.25 * k)));
    if (e.kind === 'eproj') return;
    const hm = e.kind === 'boss' ? 1 + 0.3 * k : 1 + 0.5 * k;
    e.hp *= hm; if (e.maxHp) e.maxHp *= hm;
    e.expMul = 1 + 0.6 * k;
  }
  function trackHits() {
    const live = new Set();
    for (const e of W.ents) {
      if (e.kind === 'eproj' && !scaled.has(e)) { scale(e); continue; }
      if ((e.kind !== 'enemy' && e.kind !== 'boss') || typeof e.hp !== 'number') continue;
      if (!scaled.has(e)) scale(e);
      live.add(e);
      const was = hpSeen.get(e);
      if (was !== undefined && e.hp < was) dmgNumber(e, was - e.hp);
      hpSeen.set(e, e.hp);
    }
    for (const [e, was] of hpSeen) {
      if (live.has(e)) continue;
      hpSeen.delete(e);
      if (e.hp < was) dmgNumber(e, was - e.hp);
      if (e.hp <= 0) defeated(e);
    }
  }
  function newRun() { Object.assign(rpg, { lv: 1, exp: 0, kills: 0, frames: 0 }); hpSeen.clear(); }
  const expProgress = () => rpg.lv >= MAXLV ? 1 : (rpg.exp - expFor(rpg.lv)) / (expFor(rpg.lv + 1) - expFor(rpg.lv));
  const playTime = () => { const s = Math.floor(rpg.frames / 60), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  // Statusbildschirm (Pause → STATUS): Werte wie in SotN in zwei Spalten, darunter EXP-Leiste, Karte, Siegel, Warpkammern
  function drawStatus(ctx, t) {
    const w = View.w, cx = View.cx, p = W.player, v = values();
    ctx.fillStyle = 'rgba(2,4,18,0.97)'; ctx.fillRect(0, 0, w, 240);
    ctx.fillStyle = '#c89020';
    ctx.fillRect(6, 6, w - 12, 1); ctx.fillRect(6, 233, w - 12, 1); ctx.fillRect(6, 6, 1, 228); ctx.fillRect(w - 7, 6, 1, 228);
    Game.big(ctx, tr('castleStatus'), cx, 12, 2, LOGO, null, '#000');
    Font.draw(ctx, (p.def && p.def.name ? p.def.name : '') + '    LV ' + rpg.lv, cx, 34, '#f8b800', { align: 'center', shadow: '#000' });
    const att = Math.round((p.whip >= 2 ? 2 : 1) * 10 * Options.dmgMul), next = rpg.lv >= MAXLV ? 0 : expFor(rpg.lv + 1) - rpg.exp;
    const rows = [
      [['HP', Math.ceil(Math.max(0, p.hp)) + '/' + p.maxHp], ['STR', v.str]],
      [['EXP', rpg.exp], ['CON', v.con]],
      [['NEXT', next], ['ATT', att]],
      [['GOLD', W.score], ['DEF', Math.round(10 * conDiv())]],
      [['KILLS', rpg.kills], ['TIME', playTime()]],
    ];
    const lx = cx - Math.min(118, w / 2 - 14), rx = cx + 8, colW = Math.min(110, w / 2 - 22);
    rows.forEach((row, i) => row.forEach(([k, val], c) => {
      const x = c ? rx : lx, y = 52 + i * 14;
      Font.draw(ctx, k, x, y, '#b0a080');
      Font.draw(ctx, String(val), x + colW, y, '#fcfcfc', { align: 'right', shadow: '#000' });
    }));
    const by = 124, bw = Math.min(220, w - 40), bx = Math.round(cx - bw / 2), k = expProgress(); // EXP bis zur nächsten Stufe
    ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, bw + 2, 7); ctx.fillStyle = '#1c2c14'; ctx.fillRect(bx, by, bw, 5);
    ctx.fillStyle = '#58f898'; ctx.fillRect(bx, by, Math.round(bw * clamp(k, 0, 1)), 5); ctx.fillStyle = '#b8fcd0'; ctx.fillRect(bx, by, Math.round(bw * clamp(k, 0, 1)), 1);
    Font.draw(ctx, tr('mapCastle', percent()), cx, 142, '#fcfcfc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('castleSealsShort', seals(), sealRooms().length), cx, 156, '#c8a0fc', { align: 'center', shadow: '#000' });
    const wl = allChambers().filter(c => c.kind === 'warp');
    Font.draw(ctx, tr('warpCount', wl.filter(c => warp[c.key]).length, wl.length), cx, 170, '#7cdcfc', { align: 'center', shadow: '#000' });
    const vAll = S().reduce((n, st) => n + st.rooms.reduce((m, d) => m + d.ents.filter(e => e.type === 'vessel').length, 0), 0);
    Font.draw(ctx, tr('castleVesselCount', vessels(), vAll), cx, 184, '#fc7460', { align: 'center', shadow: '#000' });
    const own = RELICS.filter(k => relic[k]); // Relikte: Anzahl, darunter je eine farbige Kugel (leer = noch nicht gefunden)
    Font.draw(ctx, tr('castleRelicCount', own.length, RELICS.length), cx, 198, '#e0d0fc', { align: 'center', shadow: '#000' });
    RELICS.forEach((k, i) => { const x = Math.round(cx - RELICS.length * 7 + i * 14 + 2), y = 208; ctx.fillStyle = '#1c1428'; ctx.fillRect(x - 1, y - 1, 10, 7); ctx.fillStyle = relic[k] ? RELIC_COL[k] : '#3c3448'; ctx.fillRect(x, y, 8, 5); });
    Font.draw(ctx, tr('statusHelp'), cx, 222, '#7c7c8c', { align: 'center' });
  }

  // ---------------- Erkundungsgrad ----------------
  function stats(s) { // [aufgedeckt, gesamt] der zählenden Zellen einer Region (oder eines Raums)
    let a = 0, n = 0;
    for (const r of layout(s)) {
      const set = seen[r.key];
      r.count.forEach((c, i) => { if (c) { n++; if (set && set.has(i)) a++; } });
    }
    return [a, n];
  }
  const pct = (a, n) => (n ? (a / n) * 100 : 0).toFixed(1);
  function percent(s) {
    if (s !== undefined) return pct(...stats(s));
    let a = 0, n = 0;
    S().forEach((st, i) => { const [x, y] = stats(i); a += x; n += y; });
    return pct(a, n);
  }
  function roomPercent(s, r) {
    const rm = layout(s)[r], set = seen[rm.key];
    let a = 0, n = 0;
    rm.count.forEach((c, i) => { if (c) { n++; if (set && set.has(i)) a++; } });
    return Math.floor(n ? (a / n) * 100 : 0);
  }
  const firstVisit = (s) => !layout(s).some(r => seen[r.key] && seen[r.key].size);

  // ---------------- Karte ----------------
  const view = { zoom: false, x: 0, y: 0 };
  function openMap() { const c = heroCell(), rm = roomAt(W.stage, W.roomIdx); view.zoom = false; if (c && rm) { view.x = rm.ax + c.x; view.y = rm.ay + c.y; } }
  function mapInput(P) {
    if (P.attack) { view.zoom = !view.zoom; Audio8.sfx('select'); }
    if (view.zoom) { if (P.left) view.x--; if (P.right) view.x++; if (P.up) view.y--; if (P.down) view.y++; }
  }
  // Schnellreise: Auswahl unter allen freigeschalteten Warpkammern auf der Schlosskarte
  const trip = { list: [], sel: 0, from: null };
  function openWarp(c) {
    trip.list = allChambers().filter(w => w.kind === 'warp' && warp[w.key]); trip.from = c.key;
    trip.sel = Math.max(0, trip.list.findIndex(w => w.key === c.key)); view.zoom = false;
  }
  function warpInput(P) { // 'cancel', ein Ziel { s, r, place } oder null
    const n = trip.list.length;
    if (P.start || !n) return 'cancel';
    if (P.left || P.up) { trip.sel = (trip.sel + n - 1) % n; Audio8.sfx('select'); }
    if (P.right || P.down) { trip.sel = (trip.sel + 1) % n; Audio8.sfx('select'); }
    if (P.jump || P.attack) {
      const w = trip.list[trip.sel];
      if (w.key === trip.from) return 'cancel';
      return { s: w.s, r: w.r, place: { x: w.x, y: w.y, chamber: 'warp' } };
    }
    return null;
  }

  function draw(ctx, t, warpMode = false) {
    const w = View.w, cx = View.cx, L = castle(), sw = warpMode && trip.list[trip.sel], st = S()[sw ? sw.s : W.stage];
    ctx.fillStyle = 'rgba(2,4,18,0.97)'; ctx.fillRect(0, 0, w, 240);
    ctx.fillStyle = warpMode ? '#2c6cb0' : '#c89020';
    ctx.fillRect(6, 6, w - 12, 1); ctx.fillRect(6, 233, w - 12, 1); ctx.fillRect(6, 6, 1, 228); ctx.fillRect(w - 7, 6, 1, 228);
    Game.big(ctx, tr(warpMode ? 'warpTitle' : 'mapTitle'), cx, 12, 2, warpMode ? ['#fcfcfc', '#d8f0fc', '#a4e4fc', '#3cbcfc', '#0078f8', '#0040a8', '#001038'] : LOGO, null, '#000');
    Font.draw(ctx, tr(st.nameKey), cx, 32, '#f8b800', { align: 'center', shadow: '#000' });
    const sec = Game.sectionList().find(e => !e.head && e.s === (sw ? sw.s : W.stage) && e.r === (sw ? sw.r : W.roomIdx));
    if (sec) Font.draw(ctx, sec.label, cx, 42, '#8c9cc8', { align: 'center', shadow: '#000' });

    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of L) { x0 = Math.min(x0, r.ax); y0 = Math.min(y0, r.ay); x1 = Math.max(x1, r.ax + r.cw); y1 = Math.max(y1, r.ay + r.ch); }
    const top = 54, H = 142, left = 12, Wd = w - 24, gw = x1 - x0, gh = y1 - y0;
    const fit = clamp(Math.floor(Math.min(Wd / gw, H / gh)), 2, 12), cs = view.zoom ? Math.max(8, fit * 2) : fit;
    let ox, oy;
    if (view.zoom) { ox = Math.round(cx - (view.x + 0.5) * cs); oy = Math.round(top + H / 2 - (view.y + 0.5) * cs); }
    else { ox = Math.round(cx - (gw * cs) / 2) - x0 * cs; oy = Math.round(top + (H - gh * cs) / 2) - y0 * cs; }
    ctx.save(); ctx.beginPath(); ctx.rect(left, top - 2, Wd, H + 4); ctx.clip();
    ctx.fillStyle = 'rgba(70,90,170,0.35)';
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.fillRect(ox + x * cs, oy + y * cs, 1, 1);

    const vis = (key, i) => !!(seen[key] && seen[key].has(i));
    const byKey = {}; for (const r of L) byKey[r.key] = r;
    // Verbindungen: innerhalb der Regionen die Ausgänge, dazu die Türen zwischen den Regionen
    const links = [];
    for (const r of L) if (r.link) { const f = byKey[r.link.from]; links.push({ a: f, ac: { x: f.exit.x, y: f.exit.y }, b: r, bc: r.start }); }
    for (const [A, pa, B, pb] of LINKS) {
      const a = ref(A), b = ref(B);
      if (!a || !b) continue;
      const ra = L.find(x => x.s === a.s && x.i === a.r), rb = L.find(x => x.s === b.s && x.i === b.r);
      if (ra && rb) links.push({ a: ra, ac: placeCell(ra, pa), b: rb, bc: placeCell(rb, pb) });
    }
    const known = links.filter(k => vis(k.a.key, k.ac.y * k.a.cw + k.ac.x) && vis(k.b.key, k.bc.y * k.b.cw + k.bc.x));
    ctx.strokeStyle = '#c89020'; ctx.lineWidth = 1;
    for (const k of known) { // Gänge zwischen nicht benachbarten Zellen (die Zellen decken sie danach zu)
      const ax = ox + (k.a.ax + k.ac.x) * cs + cs / 2, ay = oy + (k.a.ay + k.ac.y) * cs + cs / 2, bx = ox + (k.b.ax + k.bc.x) * cs + cs / 2, by = oy + (k.b.ay + k.bc.y) * cs + cs / 2;
      ctx.beginPath(); ctx.moveTo(Math.floor(ax) + 0.5, Math.floor(ay) + 0.5); ctx.lineTo(Math.floor(bx) + 0.5, Math.floor(ay) + 0.5); ctx.lineTo(Math.floor(bx) + 0.5, Math.floor(by) + 0.5); ctx.stroke();
    }
    let any = false;
    for (const r of L) {
      const set = seen[r.key];
      if (!set || !set.size) continue;
      any = true;
      const cur = r.s === W.stage && r.i === W.roomIdx;
      for (const i of set) {
        const x = i % r.cw, y = Math.floor(i / r.cw), px = ox + (r.ax + x) * cs, py = oy + (r.ay + y) * cs;
        if (y >= r.ch) continue;
        ctx.fillStyle = cur ? '#2c5ce0' : '#1838a8'; ctx.fillRect(px, py, cs, cs);
        if (cs < 4) continue;
        ctx.fillStyle = '#d8dcf4'; // Raumgrenzen (zwischen Zellen desselben Raums keine Linie)
        if (x === 0) ctx.fillRect(px, py, 1, cs);
        if (x === r.cw - 1) ctx.fillRect(px + cs - 1, py, 1, cs);
        if (y === 0) ctx.fillRect(px, py, cs, 1);
        if (y === r.ch - 1) ctx.fillRect(px, py + cs - 1, cs, 1);
      }
      const m = Math.max(1, Math.round(cs / 3));
      for (const k of r.marks) {
        if (!set.has(k.y * r.cw + k.x)) continue;
        const px = ox + (r.ax + k.x) * cs + Math.floor((cs - m) / 2), py = oy + (r.ay + k.y) * cs + Math.floor((cs - m) / 2);
        if (k.boss) { const done = boss[r.key] || mini[r.key]; ctx.fillStyle = '#fcfcfc'; ctx.fillRect(px - 1, py - 1, m + 2, m + 2); ctx.fillStyle = done ? '#585868' : '#a80020'; ctx.fillRect(px, py, m, m); }
        else { ctx.fillStyle = k.c; ctx.fillRect(px, py, m, m); }
      }
      for (const d of doorsOf(r.s, r.i)) { // ↑-Türen als goldene (Siegeltor: violette) Marke
        if (kindOf(r.def, d.place) !== 'up' || d.place === 'start') continue;
        const c = placeCell(r, d.place);
        if (!set.has(c.y * r.cw + c.x)) continue;
        ctx.fillStyle = d.place.door === 'seal' ? '#b070fc' : '#f8b800';
        ctx.fillRect(ox + (r.ax + c.x) * cs + Math.floor(cs / 2) - 1, oy + (r.ay + c.y) * cs + cs - Math.max(2, m) - 1, 2, Math.max(2, m));
      }
      const half = Math.max(1, Math.floor(cs / 2));
      for (const c of chambersOf(r.s, r.i)) { // Kammern: Speichern rot (linke Hälfte), Warp hellblau (rechte Hälfte, grau vor dem Betreten)
        const cc = placeCell(r, c);
        if (!set.has(cc.y * r.cw + cc.x)) continue;
        ctx.fillStyle = c.kind === 'save' ? '#fc2c2c' : warp[c.key] ? '#7cdcfc' : '#5c6c8c';
        ctx.fillRect(ox + (r.ax + cc.x) * cs + (c.kind === 'warp' ? cs - half : 0), oy + (r.ay + cc.y) * cs + Math.floor((cs - half) / 2), half, half);
      }
    }
    ctx.fillStyle = '#f8b800'; // Türen zwischen benachbarten Zellen: goldene Lücke in der Wand
    for (const k of known) {
      const ax = k.a.ax + k.ac.x, ay = k.a.ay + k.ac.y, bx = k.b.ax + k.bc.x, by = k.b.ay + k.bc.y, dx = bx - ax, dy = by - ay, d = Math.max(2, Math.round(cs / 2));
      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;
      if (dx) ctx.fillRect(ox + Math.max(ax, bx) * cs - 1, oy + ay * cs + Math.floor((cs - d) / 2), 2, d);
      else ctx.fillRect(ox + ax * cs + Math.floor((cs - d) / 2), oy + Math.max(ay, by) * cs - 1, d, 2);
    }
    const c = heroCell(), rm = roomAt(W.stage, W.roomIdx);
    if (c && rm && (t >> 3) % 2 === 0) { // Held blinkt in seiner Zelle
      const i = cs >= 4 ? Math.max(1, Math.floor(cs / 4)) : 0;
      ctx.fillStyle = '#fcfcfc'; ctx.fillRect(ox + (rm.ax + c.x) * cs + i - (cs < 4 ? 1 : 0), oy + (rm.ay + c.y) * cs + i - (cs < 4 ? 1 : 0), cs - i * 2 + (cs < 4 ? 2 : 0), cs - i * 2 + (cs < 4 ? 2 : 0));
    }
    if (warpMode) trip.list.forEach((wc, i) => { // Schnellreise: Ziele gerahmt, das gewählte blinkt
      const rr = roomAt(wc.s, wc.r), cc = rr && placeCell(rr, wc);
      if (!cc) return;
      const px = ox + (rr.ax + cc.x) * cs, py = oy + (rr.ay + cc.y) * cs, on = i === trip.sel, g = on ? 3 : 1;
      if (on && (t >> 3) % 2) return;
      ctx.strokeStyle = on ? '#ffffff' : '#3cbcfc'; ctx.lineWidth = 1;
      ctx.strokeRect(px - g + 0.5, py - g + 0.5, cs + g * 2 - 1, cs + g * 2 - 1);
      if (on) ctx.strokeRect(px - g - 0.5, py - g - 0.5, cs + g * 2 + 1, cs + g * 2 + 1);
    });
    ctx.restore();
    if (!any) Font.draw(ctx, tr('mapNone'), cx, top + H / 2 - 4, '#7c84a8', { align: 'center' });

    Font.draw(ctx, tr('mapExplored', percent(W.stage)) + '    ' + tr('mapCastle', percent()), cx, 202, '#fcfcfc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, warpMode ? tr('warpCount', trip.sel + 1, trip.list.length) : tr('castleSealsShort', seals(), sealRooms().length), cx, 212, warpMode ? '#7cdcfc' : '#c8a0fc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr(warpMode ? 'mapHelpWarp' : view.zoom ? 'mapHelpZoom' : 'mapHelp'), cx, 222, '#7c7c8c', { align: 'center' });
  }

  // Fortsetzen: Held, Herzen, Spezialwaffe und Peitsche aus dem Spielstand übernehmen
  function applySave(p, sv) {
    if (typeof sv.hearts === 'number' && !Options.infHearts) p.hearts = sv.hearts;
    if (sv.sub) p.sub = sv.sub;
    if (typeof sv.whip === 'number' && !Options.maxWhip) p.whip = clamp(sv.whip, 1, 3);
    newRun();
    if (sv.lv >= 1) Object.assign(rpg, { lv: Math.min(MAXLV, sv.lv | 0), exp: sv.exp | 0, kills: sv.kills | 0, frames: sv.frames | 0 });
    applyHp(p); p.hp = p.maxHp;
  }

  return {
    on, update, settle, forward, bossBeaten, draw, openMap, mapInput, openWarp, warpInput, layout, castle, percent, roomPercent, firstVisit, seals,
    bossDone: (s, r) => !!boss[roomKey(s, r)],
    hasSave: () => !!readSave(), loadSave: readSave, applySave, chambers: allChambers,
    newRun, drawStatus, expProgress, gainExp, get rpg() { return rpg; },
    tier: (s) => TIER[S()[s].id] || 1, side: SIDE, get vessels() { return vessel; }, get relics() { return relic; }, get cracks() { return crack; }, has,
    get seen() { return seen; }, get warps() { return warp; },
    reset() { seen = {}; boss = {}; mini = {}; warp = {}; vessel = {}; relic = {}; crack = {}; flag = {}; try { localStorage.removeItem(KEY); localStorage.removeItem(SAVE_KEY); } catch (e) { /* privat */ } },
  };
})();
