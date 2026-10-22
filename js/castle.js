// Schloss-Modus (Standard; ?arcade = lineares Arcade-Spiel – Plan in docs/SOTN-PLAN.md): aus den Kapiteln wird ein zusammenhängendes Schloss im Stil
// von Symphony of the Night. Die Kapitel sind Regionen, jeder Raum hat Türen in beide Richtungen (zurück durch den linken
// Rand, in Turmräumen mit ↑ an der Starttür), die Eingangshalle ist der Knoten: Kellertür in die Katakomben, Turmtür auf dem
// Sims zum Bergfried, Siegeltor auf der Galerie zum Thron. Hinter besiegten Bossen öffnen sich neue Wege; Bosse bleiben
// besiegt und geben je ein Siegel. Kein Zeitlimit.
// Karte: jeder Raum zerfällt in Zellen zu 16×13 Kacheln (etwa ein Bildschirm); betretene Zellen werden aufgedeckt und mit
// den Siegeln im localStorage gemerkt. Pause → KARTE zeigt das ganze Schloss (Angriff: Zoom, Pfeile: Scrollen).
// Kammern wie in SotN: In der Speicherkammer (Steinnische mit Sarg und Kerzen) wird der Spielstand gesichert und die Energie aufgefüllt – er
// übersteht eine neue Browser-Sitzung (Titel: FORTSETZEN, ebenso nach Game Over). Die Warpkammer daneben wird beim
// Betreten freigeschaltet; mit ↑ geht es per Karte in jede freigeschaltete Warpkammer (Schnellreise).
// RPG wie in SotN: besiegte Gegner geben EXP, Stufenaufstieg („LEVEL UP!") erhöht max. HP, STR (Schaden) und CON (Abwehr);
// Treffer zeigen Schadenszahlen, Gegner lassen Gold, Herzen und Braten fallen. Pause → STATUS. Stufe, EXP, Besiegte und
// Spielzeit speichert die Speicherkammer (wie in SotN geht Ungespeichertes nach Game Over verloren).
// Geschichte: der zweite Held, der Bibliothekar und der lila Tentakel treiben sie in Gesprächen voran (Szenen an Relikten und Siegeln).
// Ausrüstung wie in SotN: Waffe, Rüstung, Amulett, Begleiter, Tränke (Pause → AUSRÜSTUNG), Funde, Beute und der Laden des Bibliothekars;
// MP und Zauber per Befehlseingabe (Zauberbücher im Laden).
'use strict';

const Castle = (() => {
  const on = /[?&]castle\b/.test(location.search) || !/[?&]arcade\b/.test(location.search); // Standard; ?arcade = lineares Arcade-Spiel
  const CW = 16, CH = 13;
  // Spielstände: Karte/Besitz (map), Speicherkammer (castle) und Fortsetzungspunkt (resume: beim Pausieren und beim Schließen des
  // Tabs). Der Testmodus (?test, Titel → TESTMODUS) hat eigene Plätze nachtmahr.test.*, der echte Spielstand bleibt unberührt.
  let testing = on && /[?&]test\b/.test(location.search), KEY, SAVE_KEY, RESUME_KEY;
  const setKeys = () => { const p = testing ? 'nachtmahr.test.' : 'nachtmahr.'; KEY = p + 'map'; SAVE_KEY = p + 'castle'; RESUME_KEY = p + 'resume'; };
  setKeys();
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
  // seen: Raumschlüssel "<kapitel-id>:<raum>" → Set der Zellnummern; boss/mini/warp/vessel/relic/crack/flag: Schlüssel → 1;
  // inv: Gegenstand → Anzahl, eq: Platz (weapon/armor/acc/fam) → Gegenstand, famx: Begleiter → Erfahrung, best: Gegnerart → Siege
  let seen = {}, boss = {}, mini = {}, warp = {}, vessel = {}, relic = {}, crack = {}, flag = {}, inv = {}, eq = {}, famx = {}, best = {};
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.v === 1) {
      for (const k in d.rooms) seen[k] = new Set(d.rooms[k]);
      boss = d.boss || {}; mini = d.mini || {}; warp = d.warp || {}; vessel = d.vessel || {};
      relic = d.relic || {}; crack = d.crack || {}; flag = d.flag || {}; inv = d.inv || {}; eq = d.eq || {}; famx = d.famx || {}; best = d.best || {};
    }
  } catch (e) { seen = {}; boss = {}; mini = {}; warp = {}; vessel = {}; relic = {}; crack = {}; flag = {}; inv = {}; eq = {}; famx = {}; best = {}; }
  function save() {
    try {
      const rooms = {};
      for (const k in seen) rooms[k] = [...seen[k]];
      localStorage.setItem(KEY, JSON.stringify({ v: 1, rooms, boss, mini, warp, vessel, relic, crack, flag, inv, eq, famx, best }));
    } catch (e) { /* privater Modus: gilt nur für diese Sitzung */ }
  }
  // Spielstand der Speicherkammer: Ort (Kapitel-id, Raum, Kammer), Held, Herzen, Spezialwaffe, Peitsche, Punkte, Leben
  function readKey(k) {
    try {
      const d = JSON.parse(localStorage.getItem(k) || 'null'), s = d && d.v === 1 ? sIdx(d.s) : -1;
      if (s < 0 || !(d.r >= 0 && d.r < S()[s].rooms.length) || !d.place) return null;
      return { ...d, s };
    } catch (e) { return null; }
  }
  // Fortsetzen: der neuere von Speicherkammer und Fortsetzungspunkt; nach Game Over nur die Speicherkammer (wie in SotN)
  function readSave(chamberOnly) {
    const a = readKey(SAVE_KEY), b = chamberOnly ? null : readKey(RESUME_KEY);
    return a && b ? ((b.at || 0) > (a.at || 0) ? b : a) : a || b;
  }
  // Fortsetzungspunkt: Raum, Stelle (auf festem Boden die aktuelle, sonst der letzte sichere Punkt im Raum), Held, Werte
  function writeResume() {
    const p = W.player, s = W.stage, r = W.roomIdx;
    if (!on || !p || !p.alive || !S()[s] || inPrologue()) return;
    const cp = W.checkpoint && W.checkpoint.stage === s && W.checkpoint.room === r ? W.checkpoint : null;
    const here = p.onGround && p.state === 'normal' && !W.arenaOn;
    const place = here ? { px: Math.round(p.cx), feet: Math.round(p.feet), face: p.face, resume: 1 } : cp ? { px: cp.cx, feet: cp.feet, face: 1, resume: 1 } : 'start';
    try {
      localStorage.setItem(RESUME_KEY, JSON.stringify({ v: 1, s: S()[s].id, r, place, hero: Options.character, hearts: p.hearts, sub: p.sub, whip: p.whip,
        hp: p.hp, score: W.score, lives: W.lives, at: Date.now(), lv: rpg.lv, exp: rpg.exp, kills: rpg.kills, frames: rpg.frames, mp }));
    } catch (e) { /* privat */ }
  }
  const dropResume = () => { try { localStorage.removeItem(RESUME_KEY); } catch (e) { /* privat */ } };
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
    // Wehrgang (zwischen Glockenturm und Bergfried): Mauerkrone im Gewitter, zwei Scharten zum Überspringen, Raben und ein Ritter
    add('wehrgang', 2, 3, [6, -3], R(72, 'courtyard')
      .ground(0, 22).ground(26, 47).ground(51, 71)
      .fill(12, 7, 15, 7, '=').fill(36, 7, 40, 7, '=').fill(60, 7, 63, 7, '=')
      .candle(5, 9, 'H').candle(13, 5).candle(30, 9).candle(38, 5, '$').candle(44, 9, 'H').candle(61, 5).candle(68, 9)
      .enemy('raven', 18, 6).enemy('knight', 34, 10).enemy('raven', 45, 5).enemy('skel', 58, 10).enemy('bat', 66, 3)
      .statue(31, 10)
      .label('WEHRGANG').start(2, 10).done());
    // Himmelsbrücke (zwischen Kathedralendach und Wintergarten-Kuppel, offen nach beiden Bossen): Steg über dem Wolkenmeer
    add('himmel', 'sun', 5, [30, -15], R(96, 'bridge')
      .fill(0, 9, 5, 12, '#').fill(6, 9, 89, 9, '=').fill(90, 9, 95, 12, '#')
      .fill(24, 9, 26, 9, '.').fill(52, 9, 55, 9, '.').fill(72, 9, 74, 9, '.')
      .fill(42, 6, 47, 6, '=')
      .candle(10, 6, 'H').candle(30, 6).candle(44, 4, '$').candle(60, 6, 'H').candle(80, 6)
      .enemy('raven', 20, 7).enemy('raven', 64, 7).enemy('ghost', 40, 5).enemy('ghost', 84, 5)
      .statue(46, 8)
      .label('HIMMELSBRÜCKE').start(2, 8).done());
    // Dachboden über der Eingangshalle: nur fliegend erreichbar – Sims unter der Decke zwischen zwei Kronleuchtern (Fledermausgestalt)
    const foyer = sIdx(0) >= 0 && S()[sIdx(0)].rooms[1];
    if (foyer) for (let x = 66; x <= 70; x++) foyer.grid[3][x] = '=';
    add('attic', 0, 3, [7, -2], R(48, 'library')
      .ground(0, 47).fill(9, 8, 14, 8, '=').fill(21, 7, 28, 7, '=').fill(35, 8, 40, 8, '=')
      .candle(4, 9, 'H').candle(12, 6).candle(24, 5, '$').candle(38, 6, 'H').candle(44, 9)
      .enemy('bat', 16, 3).enemy('bat', 32, 3).enemy('ghost', 26, 4).enemy('book', 40, 9)
      .chest(44, 10, 'big').prop('vessel', { x: 24, y: 6 })
      .label('DACHBODEN').start(2, 10).done());
    LINKS.push([[0, 1], { x: 67, y: 2, door: 'side' }, ['side', 'attic'], 'start', {}]); // Eingangshalle, Sims unter der Decke → Dachboden
    LINKS.push( // Schleifen: das Schloss als 2D-Open-World, Regionen über Nebenwege verzahnt
      [['side', 'kolosseum'], 'right', [1, 1], { x: 4, y: 27, door: 'side' }, {}],              // Kolosseum → Geheimgang → Brunnenschacht
      [[2, 0], { x: 40, y: 10, door: 'side' }, ['side', 'wehrgang'], 'start', {}],              // Bergfried → Wehrgang
      [['side', 'wehrgang'], 'right', [0, 2], { x: 8, y: 15, door: 'side' }, {}],                // Wehrgang → Glockenturm
      // Himmelsbrücke: Kathedralendach hinter dem Wächter ↔ Kuppel hinter der Menschenfalle; in eine Arena mit lebendem Boss führt
      // sie nicht (beat: dieser Boss muss besiegt sein, sonst „von der anderen Seite verriegelt“; back: Bedingung der Rückrichtung)
      [['sun', -1], 'right', ['side', 'himmel'], 'start', { boss: true, back: { beat: ['sun', -1] } }],
      [['side', 'himmel'], 'right', ['expo', -1], 'right', { beat: ['expo', -1] }],
    );
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
  const tierOf = (s, r) => { const d = S()[s].rooms[r]; return ((d && d.tier) || TIER[S()[s].id] || 1) + 2 * (flag.ngp || 0); }; // Neues Spiel+: je Runde zwei Stufen mehr

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
      if (same(b, s, r) && !g.oneway && pb !== 'exit') out.push({ place: pb, to: { s: a.s, r: a.r, place: pa }, gate: g.back });
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
    if (d.gate.beat) { const a = ref(d.gate.beat); return !!(a && boss[roomKey(a.s, a.r)]); }
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
  // Winkelpfeil (7×13, drei Pixel stark, mit dunkler Kante) für Seitenausgänge; dir = 1 nach rechts, -1 nach links
  function chevron(ctx, x, y, dir) {
    for (const [col, o] of [['#1c1008', 1], ['#f8b800', 0]]) {
      ctx.fillStyle = col;
      for (let k = 0; k < 13; k++) { const d = 6 - Math.abs(k - 6); ctx.fillRect(x + dir * d + o - (dir < 0 ? 2 : 0), y + k + o, 3, 1); }
    }
    ctx.fillStyle = '#fce0a8'; for (let k = 3; k < 10; k++) { const d = 6 - Math.abs(k - 6); ctx.fillRect(x + dir * d + (dir < 0 ? -2 : 2), y + k, 1, 1); } // Lichtkante
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
    lightUp(L, cx, cy) {
      if (!gateOpen(this.d)) return;
      if (this.k === 'up') { L.push({ x: this.cx - cx, y: this.y - cy + this.h / 2, r: 30 + Math.sin(this.t * 0.07) * 3, c: this.seal ? [190, 120, 252] : [252, 180, 110], a: 0.45 }); return; }
      const p = W.player; // Seitenausgang: warmer Schein am Rand, sobald der Held in der Nähe ist
      if (Math.abs(p.cx - this.cx) < 12 * T) L.push({ x: (this.k === 'edgeL' ? this.x : this.x + this.w) - cx, y: this.y - cy + this.h / 2, r: 30, c: [252, 210, 140], a: 0.4 });
    }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), p = W.player, open = gateOpen(this.d);
      const near = Math.abs(p.cx - this.cx) < 14 && Math.abs(p.feet - (this.y + this.h)) < 8;
      if (this.k !== 'up') { // Seitenausgang: Lichtschein am Rand und drei Winkelpfeile, die hinauslaufen (hinter dem Boss erst nach dem Sieg)
        const dist = Math.abs(p.cx - this.cx);
        if (!open || dist > 12 * T || Math.abs(p.feet - (this.y + this.h)) > 4 * T) return;
        const dir = this.k === 'edgeL' ? -1 : 1, ex = this.k === 'edgeL' ? x : x + this.w, a = clamp(1.5 - dist / (8 * T), 0.45, 1);
        ctx.globalAlpha = a * (0.2 + 0.08 * Math.sin(this.t * 0.1)); ctx.fillStyle = '#fce0a8';
        for (let k = 0; k < 4; k++) ctx.fillRect(dir > 0 ? ex - 3 - k * 3 : ex + k * 3, y + 6 + k * 2, 3, this.h - 6 - k * 2); // Licht fällt herein
        for (let i = 0; i < 3; i++) {
          const ph = ((this.t * 0.5 + i * 9) % 27) / 27;
          ctx.globalAlpha = a * Math.sin(ph * Math.PI);
          chevron(ctx, Math.round(ex - dir * (36 - ph * 24)), y + this.h - 30, dir);
        }
        ctx.globalAlpha = 1;
        return;
      }
      // Torbogen aus Stein wie die Speicherkammer: Quaderring, Schlussstein, dunkler Gang mit Fackelschein; verschlossen: Fallgitter
      const cx = x + this.w / 2, bot = y + this.h, r = this.w / 2 - 4, t = this.t;
      arch(ctx, cx, y + 2, r + 5, bot, '#1c1824'); arch(ctx, cx, y + 3, r + 4, bot, '#5c5468'); arch(ctx, cx, y + 4, r + 3, bot, '#4c4458');
      ctx.fillStyle = '#2c2634'; // Fugen im Quaderring
      for (const a of [0.2, 0.55, 0.9, 1.25, 1.6, 1.95, 2.3, 2.65, 3.0]) { const ax = Math.round(cx - Math.cos(a) * (r + 3.5)), ay = Math.round(y + 4 + r + 3 - Math.sin(a) * (r + 3)); ctx.fillRect(ax, ay, 1, 2); }
      for (let yy = y + r + 8; yy < bot - 2; yy += 7) { ctx.fillRect(cx - r - 4, yy, 3, 1); ctx.fillRect(cx + r + 1, yy, 3, 1); }
      ctx.fillStyle = '#8c84a0'; ctx.fillRect(cx - r - 4, y + r + 6, 1, bot - y - r - 8); // Lichtkante links
      if (this.seal) { arch(ctx, cx, y + 5, r + 2, bot, '#3c1c64'); ctx.fillStyle = '#b070fc'; for (let i = 0; i < 5; i++) { const a = 0.3 + i * 0.62; ctx.fillRect(Math.round(cx - Math.cos(a) * (r + 3)), Math.round(y + 4 + r + 3 - Math.sin(a) * (r + 3)), 2, 2); } } // Runen
      arch(ctx, cx, y + 6, r + 1, bot, '#07050c');
      if (open) { // Fackelschein aus dem Gang, unten am stärksten
        const a = 0.16 + 0.06 * Math.sin(t * 0.06);
        for (let k = 0; k < 4; k++) { ctx.globalAlpha = a * (k + 1) / 4; arch(ctx, cx, y + 16 + k * 6, r - 2, bot, this.seal ? '#9c4cfc' : '#c87830'); }
        ctx.globalAlpha = 1;
      } else { // Fallgitter mit Nieten
        ctx.fillStyle = '#3c3c4c'; for (let i = -r + 2; i < r; i += 5) ctx.fillRect(cx + i, y + 9, 2, bot - y - 9);
        ctx.fillRect(cx - r, y + 18, r * 2, 2); ctx.fillRect(cx - r, y + 30, r * 2, 2);
        ctx.fillStyle = '#7c7c8c'; for (let i = -r + 2; i < r; i += 5) { ctx.fillRect(cx + i, y + 18, 1, 1); ctx.fillRect(cx + i, y + 30, 1, 1); }
      }
      ctx.fillStyle = '#2c2634'; ctx.fillRect(cx - r - 5, bot - 2, (r + 5) * 2, 2); ctx.fillStyle = '#6c6480'; ctx.fillRect(cx - r - 5, bot - 2, (r + 5) * 2, 1); // Schwelle
      ctx.fillStyle = '#8c84a0'; ctx.fillRect(cx - 3, y + 1, 6, 4); ctx.fillStyle = '#5c5468'; ctx.fillRect(cx - 2, y + 2, 4, 3); // Schlussstein
      if (open && !this.seal) for (const s of [-1, 1]) { // Wandfackeln links und rechts
        const fx = cx + s * (r + 8), fy = y + 14;
        ctx.fillStyle = '#3c2c1c'; ctx.fillRect(fx - 1, fy, 2, 6); ctx.fillStyle = '#6c6c7c'; ctx.fillRect(fx - 2, fy, 4, 1);
        const f = ((t >> 2) + (s > 0 ? 2 : 0)) & 3;
        ctx.fillStyle = '#c84810'; ctx.fillRect(fx - 1, fy - 4 + (f & 1), 3, 4 - (f & 1)); ctx.fillStyle = '#fcc860'; ctx.fillRect(fx, fy - 3 + (f === 2 ? 1 : 0), 1, 2);
      }
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

  // Kammer in der Welt: Steinnische mit Rundbogen; Speichern: Sarg zwischen zwei Kerzen im warmen Licht, Warp: kreisender Strudel
  class CastleChamber extends Ent {
    constructor(c) { super((c.x + 1) * T - 20, (c.y + 1) * T - 52, 40, 52); this.kind = 'prop'; this.c = c; this.pulse = 0; }
    update() { this.t++; if (this.pulse > 0) this.pulse--; }
    lightUp(L, cx, cy) {
      const save = this.c.kind === 'save', on = save || warp[this.c.key];
      L.push({ x: this.cx - cx, y: this.y - cy + 34, r: (save ? 32 : 40) + Math.sin(this.t * 0.05) * 3 + this.pulse, c: save ? [252, 196, 130] : on ? [110, 200, 255] : [90, 110, 160], a: save ? 0.45 : 0.55 });
    }
    draw(ctx) {
      const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), cx = x + 20, bot = y + 52, save = this.c.kind === 'save', t = this.t;
      const fr = save ? '#5c5468' : '#2c6cb0', dk = save ? '#1c1824' : '#0c1c3c', hi = save ? '#a8a0b8' : '#a8dcfc';
      arch(ctx, cx, y, 20, bot, dk); arch(ctx, cx, y + 1, 19, bot, fr); arch(ctx, cx, y + 2, 18, bot, hi); arch(ctx, cx, y + 3, 17, bot, fr);
      if (save) arch(ctx, cx, y + 4, 16, bot, '#9c7830'); // feine Goldkante
      arch(ctx, cx, y + 5, 15, bot, '#07050c');
      if (save) { // Ruhenische: dunkler Sarg aus poliertem Holz mit Messingbeschlag, zwei Kerzen, warmes Kerzenlicht
        for (let k = 0; k < 3; k++) { ctx.globalAlpha = (0.05 + 0.02 * Math.sin(t * 0.06)) * (k + 1) + this.pulse / 160; arch(ctx, cx, y + 16 + k * 6, 12 - k * 3, bot, '#c88440'); }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#2c2430'; ctx.fillRect(cx - 10, bot - 5, 20, 5); ctx.fillStyle = '#4c4458'; ctx.fillRect(cx - 10, bot - 5, 20, 1); // Steinsockel
        ctx.fillStyle = '#24140e'; ctx.beginPath(); ctx.moveTo(cx - 4, bot - 36); ctx.lineTo(cx + 4, bot - 36); ctx.lineTo(cx + 6, bot - 28); ctx.lineTo(cx + 4, bot - 5); ctx.lineTo(cx - 4, bot - 5); ctx.lineTo(cx - 6, bot - 28); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#4c3020'; ctx.fillRect(cx - 4, bot - 36, 8, 1); ctx.fillRect(cx - 6, bot - 28, 1, 3); ctx.fillRect(cx - 4, bot - 34, 1, 26); // Glanzkante
        ctx.fillStyle = '#a88850'; ctx.fillRect(cx - 4, bot - 29, 8, 1); ctx.fillRect(cx - 3, bot - 12, 6, 1); // Messingbänder
        ctx.fillStyle = '#c8a860'; ctx.fillRect(cx - 1, bot - 23, 2, 2); ctx.fillRect(cx, bot - 24, 1, 4); ctx.fillRect(cx - 2, bot - 22, 4, 1); // kleine Raute
        for (const s of [-1, 1]) { // Kerzen links und rechts, die Flammen flackern
          const kx = cx + s * 9;
          ctx.fillStyle = '#e8dcc8'; ctx.fillRect(kx - 1, bot - 11, 2, 6); ctx.fillStyle = '#6c5c4c'; ctx.fillRect(kx - 2, bot - 5, 4, 1);
          const f = (t + (s > 0 ? 7 : 0)) >> 2 & 3; ctx.fillStyle = f === 3 ? '#fce0a8' : '#fcc860'; ctx.fillRect(kx - (f & 1), bot - 13 - (f === 2 ? 1 : 0), 1 + (f & 1), 2);
        }
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
  const RELICS = ['jump2', 'dash', 'ring', 'wall', 'breaker', 'bat'];
  const RELIC_COL = { jump2: '#e8f0fc', dash: '#9c6cfc', ring: '#f8b800', wall: '#58f898', breaker: '#fc7460', bat: '#c8a0fc' };
  const RELIC_AT = [[['side', 'kolosseum'], 'jump2', 81, 10], [[1, 2], 'ring', 12, 10]];        // fest liegende Relikte
  const BOSS_RELIC = [[[0, -1], 'dash'], [[1, -1], 'wall'], [[2, -1], 'breaker'], [['sun', -1], 'bat']]; // Belohnung der Regionsbosse (Sonnenwächter: Fledermausgestalt)
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
      Game.note('castleRelic', tr('relic_' + this.k), tr('relicD_' + this.k)); announceGoal(250);
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
    p.hp = p.maxHp; mp = mpMax(); if (!Options.infHearts) p.hearts = Math.max(p.hearts, 10);
    const ok = writeSave(c);
    W.checkpoint = { stage: c.s, room: c.r, cx: (c.x + 1) * T, feet: (c.y + 1) * T };
    Game.note(ok ? 'castleSaved' : 'castleSaveFail'); Audio8.sfx('checkpoint'); Audio8.sfx('heart'); Input.rumble(0.3, 0.2, 150);
    const e = W.ents.find(o => o instanceof CastleChamber && o.c.key === c.key);
    if (e) e.pulse = 40;
    for (let i = 0; i < 18; i++) W.spawn(new Particle((c.x + 1) * T + rnd(-10, 10), (c.y + 1) * T - rnd(4, 40), rnd(-0.4, 0.4), rnd(-1.4, -0.3), i % 2 ? '#c8a860' : '#fce0a8', 46, 1, 0));
  }

  // nach jedem Raumaufbau (Tür, Kapitelstart, Wiedereinstieg nach dem Tod): Türen setzen, besiegte Bosse fernhalten,
  // bei Ankunft den Helden an die Tür stellen
  let guard = false, push = 0, lastX = 0, lockT = 0, roomT = 0;
  function settle(arrive) {
    const s = W.stage, r = W.roomIdx, def = S()[s].rooms[r], key = roomKey(s, r);
    if (W.player && W.player.batForm) { W.player.batForm = false; W.player.h = HERO_H; } // Raumwechsel: wieder in Menschengestalt (reset hat Ort und Größe gesetzt)
    if (boss[key] && s < S().length - 1) W.room.arena = null; // Bossarena: Boss besiegt, der Raum ist frei
    if (mini[key]) W.miniDone[s + ':' + r] = true;
    W.ents = W.ents.filter(e => !(e instanceof CastleDoor) && !(e instanceof CastleChamber) && !(e instanceof CastleNPC) && !(e instanceof CastleLoot));
    for (const d of doorsOf(s, r)) W.spawn(new CastleDoor(d, def));
    for (const c of chambersOf(s, r)) W.spawn(new CastleChamber(c));
    for (const e of def.ents) if (e.type === 'vessel') { const k = key + ':v' + e.x; if (!vessel[k]) W.spawn(new LifeVessel(e, k)); } // Lebensgefäße
    if (arrive && def.side) Game.note('castleSideRoom', def.label, '*'.repeat(def.tier)); // Zusatzraum: Name und Gefahrenstufe
    if (arrive && arrive.place && (arrive.place.chamber === 'save' || arrive.place.resume)) announceGoal(90); // Fortsetzen: woran war ich?
    spawnRelics(s, r, def, arrive);
    if (S()[s].id === 0 && !flag.curse) { // Burgtor: der Fluch des Grafen raubt die Kräfte (einmal)
      flag.curse = 1; save();
      Game.note('castleCurse'); announceGoal(260); W.flash = 10; W.shake = Math.max(W.shake, 14); Audio8.sfx('roar'); Audio8.sfx('thunder'); Input.rumble(0.8, 0.6, 600);
    }
    spawnNpcs(s, r); roomT = 0; // Figuren der Geschichte (nach dem Fluch: der zweite Held wartet schon im Burghof)
    spawnFinds(s, r); // Einzelstücke der Ausrüstung
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
      } else if (arrive.place.px !== undefined) { cx = arrive.place.px; feet = arrive.place.feet; face = arrive.place.face || 1; } // Fortsetzungspunkt
      else { const u = upSpot(def, arrive.place); cx = u.cx; feet = u.feet; }
      p.reset(cx, feet); p.face = face;
      W.checkpoint = { stage: s, room: r, cx, feet }; // nach dem Tod hier wieder einsteigen
      W.snapCam();
    }
    guard = true; push = 0; lastX = W.player.x;
    if (inExit()) W.exiting = true; // in der Ausgangszone angekommen: erst hinaus, dann gilt sie wieder
    if (arrive) writeResume(); // jeder Raumwechsel ist ein Fortsetzungspunkt
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
    famTick(); // Begleiter
    if (rpg.frames % 45 === 0) mp = Math.min(mpMax(), mp + 1); // MP füllen sich langsam
    const hero = W.player; // Blutstein: alle vier Sekunden 1 HP
    if (gear('regen') && rpg.frames % 240 === 0 && hero.alive && hero.hp < hero.maxHp) { hero.hp = Math.min(hero.maxHp, hero.hp + 1); W.popup(hero.cx, hero.y - 6, '+10', '#d81830'); }
    if (!has('jump2')) W.player.canDouble = false; // ohne Rabenfeder kein Doppelsprung
    goalTick(); // Wegweiser-Einblendungen
    let dirty = false;
    const set = seen[key] || (seen[key] = new Set()), i = c.y * c.cw + c.x;
    if (!set.has(i)) { set.add(i); dirty = true; }
    if (W.miniDone[s + ':' + r] && !mini[key]) { mini[key] = 1; dirty = true; }
    if (dirty) save();
    if (guard && !inExit()) { guard = false; W.exiting = false; }
    if (lockT > 0) lockT--;
    roomT++;
    const p = W.player, def = S()[s].rooms[r];
    if (!p.alive || p.state !== 'normal' || W.arenaOn) { push = 0; lastX = p.x; return; }
    for (const e of W.ents) { // Figuren: neue Szene beim Herantreten, danach ↑ für den Rat
      if (!(e instanceof CastleNPC) || e.go || !p.onGround || Math.abs(p.feet - (e.y + e.h)) > 16) continue;
      const dx = Math.abs(p.cx - e.cx), fresh = !beatDone(e.b);
      if ((fresh && dx < 48 && roomT > (e.b.wait || 40)) || (!fresh && dx < 18 && P.up)) { push = 0; startTalk(e, !fresh); return; }
    }
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
      else if (k === 'edgeL') use = I.left && (p.onGround || p.batForm) && p.cx < (def.start.x + 1.5) * T && Math.abs(p.feet - (def.start.y + 1) * T) <= 2 * T && push >= 6;
      else use = I.right && (p.onGround || p.batForm) && p.cx > (def.w - 2.5) * T && push >= 6; // die Fledermaus fliegt durch Seitenausgänge
      if (!use) continue;
      if (!gateOpen(d)) {
        if (!lockT) { lockT = 90; if (d.gate.seals) Game.note('castleSeals', seals(), sealRooms().length); else if (d.gate.crack) Game.note('castleCrackHard'); else if (d.gate.beat) Game.note('castleBarred'); else Game.note('castleLocked'); Audio8.sfx('select'); }
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
    for (const [R, id] of BOSS_LOOT) if (same(ref(R), s, W.roomIdx) && !flag['find_' + id] && !inv[id]) W.spawn(new CastleLoot(id, (def.w - 14) * T + 8, (def.start.y + 1) * T - 10, id)); // sein Junges
    Game.bossName = 0; Audio8.tempo(1); Audio8.play('fanfare', W.songName()); Audio8.sfx('bigItem');
    Game.note('castleSeal', seals(), sealRooms().length); announceGoal(260);
    return true;
  }

  // ---------------- RPG: EXP, Stufe, Werte, Schadenszahlen, Beute ----------------
  const rpg = { lv: 1, exp: 0, kills: 0, frames: 0 }, MAXLV = 99;
  const expFor = (lv) => 15 * lv * (lv - 1); // Gesamt-EXP für Stufe lv: LV2 30, LV5 300, LV10 1350, LV20 5700
  const vessels = () => Object.keys(vessel).length;
  const values = () => { const b = rpg.lv - 1; return { str: 10 + b, con: 10 + b, hp: Options.maxHp + 2 * b + 4 * vessels() + gear('hp') }; };
  const strMul = () => 1 + (values().str - 10 + gear('atk')) * 0.05, conDiv = () => 1 + (values().con - 10 + gear('def')) * 0.04; // Ausrüstung zählt wie STR/CON-Punkte
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
    const big = e.kind === 'boss', kind = e.constructor && e.constructor.name;
    rpg.kills++;
    if (BEAST_SET.has(kind)) { const first = !best[kind]; best[kind] = (best[kind] || 0) + 1; if (first) { save(); W.popup(e.cx, e.y - 14, tr('beastNew'), '#c8a0fc'); } } // Bestiarium
    gainExp(Math.max(1, Math.round(big ? Math.max((e.score || 0) / 20, (e.maxHp || 20) * 6) : (e.score || 100) / 15 * (e.expMul || 1))));
    const r = Math.random(), drop = big ? 'bagBig' : r < 0.05 ? 'roast' : r < 0.12 ? 'bag' : r < 0.17 ? 'heartB' : null; // Beute wie in SotN
    if (drop) W.spawn(new Item(drop, e.cx, Math.min(e.cy, W.room.h * T - 24)));
    lootDrop(e, big); // selten Ausrüstung oder Tränke
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
  function newRun() { Object.assign(rpg, { lv: 1, exp: 0, kills: 0, frames: 0 }); hpSeen.clear(); mp = mpMax(); }
  const expProgress = () => rpg.lv >= MAXLV ? 1 : (rpg.exp - expFor(rpg.lv)) / (expFor(rpg.lv + 1) - expFor(rpg.lv));
  const playTime = () => { const s = Math.floor(rpg.frames / 60), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h + ':' + String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  // ---------------- Ausrüstung, Tränke und der Laden des Bibliothekars (wie in SotN) ----------------
  // Drei Plätze: Waffe (Beschläge und Runen für jede Heldenwaffe: ATT wie STR-Punkte), Rüstung (DEF wie CON-Punkte) und Amulett
  // (max. HP, langsame Heilung, mehr Beute, mehr Gold). Tränke benutzt man in Pause → AUSRÜSTUNG, die Schlosskarte zeigt
  // unbetretene Räume grau. Gegner lassen selten etwas fallen, Einzelstücke liegen in den Zusatzräumen, der Bibliothekar verkauft
  // (Gold = Punkte). Besitz wird wie die Relikte sofort gemerkt; ein Kauf zieht das Gold auch vom Spielstand der Speicherkammer
  // ab, sonst ließe sich nach Game Over mit demselben Gold noch einmal kaufen.
  const GEAR = {
    silver: { slot: 'weapon', atk: 2, price: 3000, col: '#d8dcf4' },
    bloodrune: { slot: 'weapon', atk: 4, col: '#fc3c3c' },
    dragonfang: { slot: 'weapon', atk: 7, col: '#f8b800' },
    leather: { slot: 'armor', def: 2, price: 2000, col: '#c87c44' },
    chain: { slot: 'armor', def: 4, price: 6000, col: '#a8a8bc' },
    mirror: { slot: 'armor', def: 7, col: '#a4e4fc' },
    heartamulet: { slot: 'acc', hp: 8, price: 5000, col: '#fc7460' },
    bloodstone: { slot: 'acc', regen: 1, col: '#d81830' },
    luckcoin: { slot: 'acc', luck: 1, col: '#f8d878' },
    greedring: { slot: 'acc', greed: 1, col: '#f8b800' },
    chicken: { slot: 'acc', luck: 1, greed: 1, col: '#f8f070' },        // Gummihuhn mit Seilrolle (Dachboden): mehr Beute und Gold
    potion: { heal: 0.5, price: 800, col: '#58f898' },
    elixir: { heal: 1, price: 4000, col: '#7cdcfc' },
    map: { key: 1, price: 3000, col: '#e8d8a8' },
    batcard: { slot: 'fam', fam: 'bat', col: '#9c6cfc' },              // Junges der Riesenfledermaus (liegt nach dem Sieg in ihrer Arena)
    fairy: { slot: 'fam', fam: 'fairy', price: 7000, col: '#58f898' },  // Fee im Glas (Laden des Bibliothekars)
    tentling: { slot: 'fam', fam: 'tent', col: '#d880fc' },            // Neffe des Tentakels (Kolosseum, nach der Rabenfeder)
    book_spirit: { spell: 'spirit', price: 2500, col: '#a4e4fc' },      // Zauberbücher (Laden): lehren je einen Zauber
    book_hellfire: { spell: 'hellfire', price: 6000, col: '#fc7c1c' },
    book_soulsteal: { spell: 'soulsteal', price: 12000, col: '#d880fc' },
  };
  const SLOTS = ['weapon', 'armor', 'acc', 'fam'], DRINKS = ['potion', 'elixir'];
  const STOCK = ['potion', 'elixir', 'leather', 'chain', 'silver', 'heartamulet', 'fairy', 'map', 'book_spirit', 'book_hellfire', 'book_soulsteal'];
  const once = (g) => !!(g.slot || g.key || g.spell); // gibt es nur einmal
  const BOSS_LOOT = [[[0, -1], 'batcard']];
  const FINDS = [ // Einzelstücke: [Raum, Gegenstand, Kachel-x, Standreihe]
    [['side', 'kolosseum'], 'leather', 12, 7], [['side', 'kanal'], 'bloodstone', 43, 7], [['side', 'schatz'], 'greedring', 25, 6],
    [['side', 'verlies'], 'dragonfang', 28, 6], [['side', 'wehrgang'], 'luckcoin', 37, 6], [['side', 'himmel'], 'mirror', 44, 5],
    [['side', 'attic'], 'chicken', 12, 7],
  ];
  const DROPS = [['potion', 'potion', 'leather', 'silver'], ['potion', 'potion', 'chain', 'bloodrune', 'elixir'], ['potion', 'elixir', 'elixir', 'chain', 'bloodrune']];
  function gear(stat) { let n = 0; for (const s of SLOTS) { const g = eq[s] && GEAR[eq[s]]; if (g && g[stat]) n += g[stat]; } return n; }
  const itemName = (id) => tr('item_' + id), itemDesc = (id) => tr('itemD_' + id);
  if (on) { // Ring der Gier: jedes Gold zählt anderthalbfach
    const add = W.addScore;
    W.addScore = function (n, ...a) { return add.call(this, n > 0 && gear('greed') ? Math.round(n * 1.5) : n, ...a); };
  }
  function giveItem(id, found) { // found: Fund (Meldung, leeren Platz gleich belegen)
    const g = GEAR[id];
    inv[id] = (inv[id] || 0) + 1;
    let worn = false;
    if (found && g.slot && !eq[g.slot]) { eq[g.slot] = id; worn = true; applyHp(W.player); }
    save();
    if (g.spell) mp = mpMax(); // erster Zauber: volle MP
    if (found) { Game.note(worn ? 'castleFoundEq' : 'castleFound', itemName(id)); Audio8.sfx(once(g) ? 'bigItem' : 'item'); }
  }
  // Symbol 10×10: Klinge (Waffe), Brustpanzer (Rüstung), Ring (Amulett), Fläschchen (Trank), Rolle (Karte)
  function itemIcon(ctx, id, x, y) {
    const g = GEAR[id], c = g.col, R = (a, b, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
    if (g.slot === 'weapon') { for (let i = 0; i < 7; i++) R(2 + i, 7 - i, 2, 1, c); R(8, 0, 1, 1, '#fcfcfc'); R(1, 7, 3, 1, '#6c4410'); R(2, 6, 1, 3, '#6c4410'); R(0, 9, 2, 1, '#c89020'); }
    else if (g.slot === 'armor') { R(1, 1, 3, 2, c); R(6, 1, 3, 2, c); R(2, 3, 6, 6, c); R(4, 1, 2, 1, '#000'); R(3, 4, 1, 4, '#fcfcfc'); R(2, 8, 6, 1, '#6c6c7c'); }
    else if (g.slot === 'acc') { R(2, 3, 6, 1, '#c89020'); R(2, 8, 6, 1, '#c89020'); R(1, 4, 1, 4, '#c89020'); R(8, 4, 1, 4, '#c89020'); R(3, 0, 4, 3, c); R(4, 1, 1, 1, '#fcfcfc'); }
    else if (g.slot === 'fam') { R(1, 0, 8, 10, c); R(2, 1, 6, 8, '#1c1028'); R(3, 3, 4, 3, c); R(4, 2, 2, 1, c); R(3, 7, 4, 1, '#c89020'); } // Begleiterkarte wie in SotN
    else if (g.spell) { R(1, 1, 8, 8, '#3c1c5c'); R(1, 1, 8, 1, '#c89020'); R(1, 8, 8, 1, '#c89020'); R(2, 2, 6, 6, '#24103c'); R(4, 3, 2, 3, c); R(3, 4, 4, 1, c); R(8, 2, 1, 6, '#e8e0c8'); } // Zauberbuch
    else if (g.heal) { R(4, 0, 2, 1, '#8c5c2c'); R(4, 1, 2, 2, '#c8d8e8'); R(2, 3, 6, 6, '#c8d8e8'); R(3, 5, 4, 4, c); R(3, 4, 1, 2, '#fcfcfc'); }
    else { R(1, 2, 8, 6, c); R(0, 1, 2, 8, '#a89060'); R(8, 1, 2, 8, '#a89060'); R(3, 4, 4, 1, '#6c4410'); R(3, 6, 3, 1, '#6c4410'); }
  }
  class CastleLoot extends Ent { // Fund: schwebt (Einzelstück) oder fällt zu Boden (Beute), leuchtet in seiner Farbe
    constructor(id, x, y, find) { super(x - 5, y - 5, 10, 10); this.kind = 'prop'; this.id = id; this.find = find; this.vy = find ? 0 : -2.2; this.landed = !!find; }
    update() {
      this.t++;
      if (!this.landed) { this.vy = Math.min(this.vy + 0.15, 2.4); if (Phys.moveY(this, this.vy) === 1 || this.y > W.room.h * T) this.landed = true; }
      const p = W.player;
      if (!p.alive || this.t < 20 || !Phys.overlap(this, p)) return;
      this.dead = true;
      if (this.find) flag['find_' + this.find] = 1;
      giveItem(this.id, true);
      for (let i = 0; i < 16; i++) W.spawn(new Particle(this.cx + rnd(-5, 5), this.cy + rnd(-5, 5), rnd(-1, 1), rnd(-1.8, -0.4), i % 2 ? GEAR[this.id].col : '#fcfcfc', 40, 1, 0));
    }
    lightUp(L, cx, cy) { const v = parseInt(GEAR[this.id].col.slice(1), 16); L.push({ x: this.cx - cx, y: this.cy - cy, r: 22 + Math.sin(this.t * 0.08) * 3, c: [v >> 16, (v >> 8) & 255, v & 255], a: 0.55 }); }
    draw(ctx) {
      const bob = this.find || this.landed ? Math.round(Math.sin(this.t * 0.08) * 2) : 0;
      itemIcon(ctx, this.id, Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y) + bob - (this.find ? 2 : 0));
      if ((this.t >> 3) % 5 === 0) { ctx.fillStyle = '#fcfcfc'; ctx.fillRect(Math.round(this.x - W.cam.x) + 9, Math.round(this.y - W.cam.y) - 1 + bob, 1, 1); } // Funkeln
    }
  }
  function spawnFinds(s, r) {
    for (const [R, id, x, y] of FINDS) if (same(ref(R), s, r) && !flag['find_' + id]) W.spawn(new CastleLoot(id, x * T + 8, (y + 1) * T - 8, id));
    const def = S()[s].rooms[r];
    for (const [R, id] of BOSS_LOOT) if (same(ref(R), s, r) && boss[roomKey(s, r)] && !flag['find_' + id] && !inv[id]) W.spawn(new CastleLoot(id, (def.w - 14) * T + 8, (def.start.y + 1) * T - 10, id));
  }

  // ---------------- Begleiter (Familiars wie in SotN): folgen dem Helden, steigen mit jedem Einsatz auf (bis LV 9) ----------------
  // Fledermausjunges: stürzt sich auf Gegner in der Nähe. Fee: heilt, wenn die Energie unter die Hälfte fällt (und will dafür
  // Komplimente). Tentakelchen: haut zu, was nah kommt, und redet zu viel. Treffer gehen wie bei der Peitsche über die
  // Trefferzonen der Gegner, aber nie auf Kerzen, Geschosse oder Geheimwände.
  const famLv = (id) => Math.min(9, 1 + Math.floor((famx[id] || 0) / 12));
  let famHits = 0;
  function famStrike(box, dmg) {
    const id = 'fam' + (++famHits);
    let hit = false;
    for (const e of W.ents) {
      if (e.dead || (e.kind !== 'enemy' && e.kind !== 'boss')) continue;
      if (e.kind === 'enemy' && e.rise !== undefined && e.rise < 12) continue;
      const vul = e.hurtBoxes ? e.hurtBoxes().some(b => Phys.overlap(box, b)) : Phys.overlap(box, e.hurtBox ? e.hurtBox() : e);
      if (vul && e.hit(dmg, id)) hit = true;
    }
    return hit;
  }
  function famTarget(f, rx, ry) { // nächster lebender Gegner im Bild innerhalb rx/ry um den Begleiter
    let best = null, bd = 1e9;
    for (const e of W.ents) {
      if (e.dead || (e.kind !== 'enemy' && e.kind !== 'boss') || !(e.hp > 0) || e.dying || !e.onScreen(0)) continue;
      const dx = Math.abs(e.cx - f.cx), dy = Math.abs(e.cy - f.cy);
      if (dx > rx || dy > ry) continue;
      if (dx + dy < bd) { bd = dx + dy; best = e; }
    }
    return best;
  }
  class CastleFamiliar extends Ent {
    constructor(id) {
      const p = W.player;
      super(p.cx - 6, p.y - 10, 12, 10); this.kind = 'fx'; this.id = id; this.type = GEAR[id].fam; this.room = W.room;
      this.cd = 60; this.target = null; this.dive = 0; this.slap = 0; this.say = null; this.sayT = 0; this.quip = 600 + Math.floor(Math.random() * 900); this.face = p.face;
    }
    gain(n) { // Erfahrung: alle 12 Punkte eine Stufe
      const before = famLv(this.id);
      famx[this.id] = (famx[this.id] || 0) + n;
      if (famLv(this.id) > before) { save(); W.popup(this.cx, this.y - 8, 'LV ' + famLv(this.id), '#58f898'); Audio8.sfx('oneUp'); }
    }
    talk() { const l = tr('famSay_' + this.type); this.say = Array.isArray(l) ? l[Math.floor(Math.random() * l.length)] : l; this.sayT = 150; }
    update() {
      this.t++;
      const p = W.player, lv = famLv(this.id);
      if (this.cd > 0) this.cd--;
      if (this.sayT > 0) this.sayT--;
      if (--this.quip <= 0) { this.quip = 1200 + Math.floor(Math.random() * 1200); if (this.type !== 'fairy') this.talk(); }
      let tx = p.cx - p.face * (this.type === 'tent' ? 13 : 18), ty = p.feet - (this.type === 'tent' ? 12 : this.type === 'fairy' ? 42 : 34) + Math.sin(this.t * 0.07) * 3, k = 0.12;
      if (this.type === 'bat') {
        if (!this.target && !this.cd) { this.target = famTarget(this, 110, 70); this.dive = 0; }
        if (this.target) {
          const e = this.target;
          if (e.dead || !(e.hp > 0) || ++this.dive > 70) { this.target = null; this.cd = 30; }
          else {
            tx = e.cx; ty = e.cy; k = 0.2;
            if (Math.abs(e.cx - this.cx) < 9 && Math.abs(e.cy - this.cy) < 10) {
              if (famStrike({ x: this.x - 2, y: this.y - 2, w: this.w + 4, h: this.h + 4 }, 0.5 + 0.1 * (lv - 1))) { this.gain(1); Audio8.sfx('bat', this.cx); }
              this.target = null; this.cd = 70 - lv * 3;
            }
          }
        }
      } else if (this.type === 'tent') {
        if (this.slap > 0 && --this.slap === 6) {
          if (famStrike({ x: this.face > 0 ? this.cx : this.cx - 30, y: this.y - 6, w: 30, h: 20 }, 0.8 + 0.15 * (lv - 1))) this.gain(1);
        }
        if (!this.slap && !this.cd) { const e = famTarget(this, 34, 26); if (e) { this.face = e.cx > this.cx ? 1 : -1; this.slap = 12; this.cd = 48 - lv * 2; Audio8.sfx('slime', this.cx); } }
      } else if (this.type === 'fairy' && !this.cd && p.alive && p.hp < p.maxHp * 0.5) { // Fee: heilen
        const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp * (0.12 + 0.02 * lv)));
        W.popup(p.cx, p.y - 10, '+' + Math.round((p.hp - before) * 10), '#58f898'); Audio8.sfx('holy');
        for (let i = 0; i < 12; i++) W.spawn(new Particle(p.cx + rnd(-8, 8), p.y + rnd(0, 28), rnd(-0.4, 0.4), rnd(-1.2, -0.2), i % 2 ? '#58f898' : '#fcfcfc', 36, 1, 0));
        this.cd = 900 - lv * 60; this.gain(2); this.talk();
      }
      this.x += (tx - this.cx) * k; this.y += (ty - this.cy) * k;
      if (Math.abs(p.cx - this.cx) > 220 || Math.abs(p.cy - this.cy) > 160) { this.x = p.cx - 6; this.y = p.y - 10; } // zu weit weg: zurück zum Helden
      if (!this.slap) this.face = this.target ? (this.target.cx > this.cx ? 1 : -1) : p.face;
    }
    lightUp(L, cx, cy) { if (this.type === 'fairy') L.push({ x: this.cx - cx, y: this.cy - cy, r: 40 + Math.sin(this.t * 0.1) * 4, c: [160, 252, 190], a: 0.5 }); }
    draw(ctx) {
      const x = Math.round(this.cx - W.cam.x), y = Math.round(this.cy - W.cam.y), t = this.t, f = this.face;
      const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? x + a : x - a - w, y + b, w, h); };
      if (this.type === 'bat') { // Fledermausjunges: zwei Flügelschläge, rote Augen
        const up = (t >> 2) & 1;
        R(-2, -2, 5, 4, '#2c1c3c'); R(-1, -3, 1, 1, '#2c1c3c'); R(2, -3, 1, 1, '#2c1c3c'); R(0, -1, 1, 1, '#fc3c3c'); R(2, -1, 1, 1, '#fc3c3c');
        if (up) { R(-7, -5, 5, 2, '#4c2c6c'); R(3, -5, 5, 2, '#4c2c6c'); R(-5, -3, 3, 1, '#4c2c6c'); R(3, -3, 3, 1, '#4c2c6c'); }
        else { R(-7, 0, 5, 2, '#4c2c6c'); R(3, 0, 5, 2, '#4c2c6c'); R(-5, -1, 3, 1, '#4c2c6c'); R(3, -1, 3, 1, '#4c2c6c'); }
      } else if (this.type === 'fairy') { // Fee: flirrende Flügel, grünes Haar, Funkenschweif
        const flap = (t >> 1) & 1;
        ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 0.6);
        R(-7, -8 + flap, 5, 4, '#a4e4fc'); R(3, -8 + flap, 5, 4, '#a4e4fc'); R(-6, -4, 4, 3, '#d8f4fc'); R(3, -4, 4, 3, '#d8f4fc'); // Flügel
        ctx.globalAlpha = 1;
        R(-1, -7, 3, 3, '#fce0a8'); R(-2, -8, 5, 1, '#f8d878'); R(-2, -7, 1, 3, '#f8d878'); R(1, -6, 1, 1, '#000'); // Kopf, goldenes Haar
        R(-1, -4, 3, 3, '#fc9cdc'); R(-2, -1, 5, 2, '#fc7cc8'); R(-1, 1, 1, 2, '#fce0a8'); R(1, 1, 1, 2, '#fce0a8'); // rosa Kleid, Beine
        R(3, -3, 1, 4, '#c89020'); R(3, -4, 1, 1, '#fcfcfc'); // Zauberstab
        if ((t >> 2) % 3 === 0) R(-4 - (t % 5), 3 + (t % 3), 1, 1, '#fcfcfc');
      } else { // Tentakelchen: kleiner lila Arm mit einem Auge, haut mit der Spitze zu
        const sw = Math.round(Math.sin(t * 0.12) * 1.5);
        for (let k = 0; k < 12; k++) { const hw = k < 7 ? 2 : 1; R(-hw + (k > 6 ? sw : 0), 6 - k, hw * 2, 1, '#7c2c98'); }
        R(-2, 6, 1, 1, '#4e1666'); R(1, 0, 1, 1, '#f0bcd8'); R(1, 3, 1, 1, '#f0bcd8');
        R(-1, -2 + 0, 3, 2, '#fcfcfc'); R(0, -2, 1, 1, '#1c0418'); R(-2, -3, 2, 1, '#16041e'); // Auge, Braue
        if (this.slap) { const e = this.slap > 6 ? 12 - this.slap : this.slap; R(2, 1, 4 + e * 3, 2, '#7c2c98'); R(4 + e * 3, 0, 2, 4, '#ac58c8'); } // Schlag
      }
      if (this.sayT > 0 && this.say) { // Sprechblase
        ctx.globalAlpha = Math.min(1, this.sayT / 20);
        const w = Font.width(this.say) + 6, bx = clamp(x - w / 2, 2, View.w - w - 2), by = y - 22;
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(bx, by, w, 11);
        Font.draw(ctx, this.say, bx + 3, by + 2, this.type === 'fairy' ? '#b8fcd0' : this.type === 'bat' ? '#c8a0fc' : '#e8b0fc');
        ctx.globalAlpha = 1;
      }
    }
  }
  // ---------------- Zauber wie in SotN: Befehl mit dem Steuerkreuz, dann Angriff (statt des Hiebs) ----------------
  // Gelernt aus Zauberbüchern (Laden des Bibliothekars). MP: 24 + 3 je Stufe, füllt sich langsam (1 MP alle 0,75 s), in der
  // Speicherkammer und beim Bibliothekar ganz. Befehle relativ zur Blickrichtung beim Angriff: F = vorwärts, B = rückwärts.
  // Seelenruf: B F ↑ ↓ – eine verirrte Seele sucht sich einen Gegner. Höllenfeuer: ↑ ↓ ↘ → – drei Feuerbälle im Fächer.
  // Seelenraub: B F ↘ ↓ ↙ B F – trifft alles im Bild und heilt pro Treffer. Schaden wächst mit der Stufe des Helden.
  const SPELLS = {
    spirit: { mp: 5, cmd: ['B', 'F', 'U', 'D'], col: '#a4e4fc' },
    hellfire: { mp: 12, cmd: ['U', 'D', 'DF', 'F'], col: '#fc7c1c' },
    soulsteal: { mp: 24, cmd: ['B', 'F', 'DF', 'D', 'DB', 'B', 'F'], col: '#d880fc' },
  };
  const SPELL_IDS = ['spirit', 'hellfire', 'soulsteal'];
  const known = (id) => !!inv['book_' + id];
  const mpMax = () => SPELL_IDS.some(known) || relic.bat ? 24 + 3 * (rpg.lv - 1) : 0;
  let mp = 0, lastDir = '';
  const hist = [];
  const absDir = (s, face) => s.replace('F', face > 0 ? 'R' : 'L').replace('B', face > 0 ? 'L' : 'R');
  function cmdMatch(cmd, face) { // Schritte in dieser Reihenfolge, je höchstens 24 Bilder auseinander (Zwischenschritte erlaubt)
    let j = cmd.length - 1, last = rpg.frames;
    for (let i = hist.length - 1; i >= 0 && j >= 0; i--) {
      if (last - hist[i].f > 24) return false;
      if (hist[i].c === absDir(cmd[j], face)) { last = hist[i].f; j--; }
    }
    return j < 0;
  }
  function preUpdate(P) { // vor W.update: Steuerkreuz mitschreiben; Angriff nach einem Befehl wird zum Zauber
    const max = mpMax(), p = W.player;
    if (!max || !p || !p.alive) return;
    mp = Math.min(mp, max);
    const I = Input.held, c = (I.up ? 'U' : I.down ? 'D' : '') + (I.right ? 'R' : I.left ? 'L' : '');
    if (c !== lastDir) { if (c) { hist.push({ c, f: rpg.frames }); if (hist.length > 16) hist.shift(); } lastDir = c; }
    if (p.batForm) return; // als Fledermaus keine Zauber (zurück mit Sprung/Angriff)
    if (P.jump && relic.bat && p.state === 'normal' && cmdMatch(['D', 'U'], p.face)) { // ↓ ↑ + Sprung: Fledermausgestalt
      hist.length = 0; P.jump = false;
      if (mp < BAT_COST) { W.popup(p.cx, p.y - 10, 'MP!', '#7c84a8'); Audio8.sfx('wall'); return; }
      toBat(p); return;
    }
    if (!P.attack || p.state !== 'normal') return;
    for (const id of ['soulsteal', 'hellfire', 'spirit']) {
      if (!known(id) || !cmdMatch(SPELLS[id].cmd, p.face)) continue;
      hist.length = 0; P.attack = false; // kein Hieb dazu
      if (mp < SPELLS[id].mp) { W.popup(p.cx, p.y - 10, 'MP!', '#7c84a8'); Audio8.sfx('wall'); return; }
      mp -= SPELLS[id].mp; cast(id);
      return;
    }
  }
  function cast(id) {
    const p = W.player, lv = rpg.lv, col = SPELLS[id].col;
    W.popup(p.cx, p.y - 14, tr('spell_' + id), col); p.powerT = Math.max(p.powerT || 0, 16); Input.rumble(0.3, 0.3, 120);
    for (let i = 0; i < 14; i++) W.spawn(new Particle(p.cx + rnd(-10, 10), p.y + rnd(0, 30), rnd(-0.6, 0.6), rnd(-1.6, -0.2), i % 2 ? col : '#fcfcfc', 30, 1, 0));
    if (id === 'spirit') { W.spawn(new CastleSpell('spirit', p.cx, p.y + 4, p.face * 1.5, -1.2, 2 + 0.12 * lv)); Audio8.sfx('holy'); }
    else if (id === 'hellfire') {
      for (const a of [-0.28, 0, 0.28]) W.spawn(new CastleSpell('fire', p.cx + p.face * 8, p.y + 12, Math.cos(a) * 3.4 * p.face, Math.sin(a) * 3.4, 2.2 + 0.1 * lv));
      Audio8.sfx('fire'); Audio8.sfx('boom'); W.shake = Math.max(W.shake, 4);
    } else { // Seelenraub: alles im Bild, jede Seele heilt
      W.flash = 8; Audio8.sfx('rosary');
      let n = 0;
      for (const e of [...W.ents]) {
        if (e.dead || (e.kind !== 'enemy' && e.kind !== 'boss') || !(e.hp > 0) || e.dying || !e.onScreen(0)) continue;
        if (famStrike({ x: e.x, y: e.y, w: e.w, h: e.h }, 1.5 + 0.06 * lv)) { n++; W.spawn(new CastleSpell('soul', e.cx, e.cy, 0, -1, 0)); }
      }
      if (n) { const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + Math.min(8, n * 1 + 1)); W.popup(p.cx, p.y - 4, '+' + Math.round((p.hp - before) * 10), '#58f898'); }
    }
  }
  class CastleSpell extends Ent { // spirit: suchende Seele, fire: Feuerball, soul: geraubte Seele fliegt zum Helden
    constructor(type, x, y, vx, vy, dmg) { super(x - 4, y - 4, 8, 8); this.kind = 'fx'; this.type = type; this.vx = vx; this.vy = vy; this.dmg = dmg; this.target = null; }
    update() {
      this.t++;
      const p = W.player;
      if (this.type === 'soul') { // zum Helden ziehen
        const dx = p.cx - this.cx, dy = p.cy - this.cy, d = Math.hypot(dx, dy) || 1;
        this.vx += dx / d * 0.5; this.vy += dy / d * 0.5; this.vx *= 0.9; this.vy *= 0.9;
        if (d < 10 || this.t > 90) this.dead = true;
      } else if (this.type === 'spirit') {
        if (!this.target || this.target.dead || !(this.target.hp > 0)) this.target = this.t > 8 ? famTarget(this, 220, 140) : null;
        if (this.target) { const dx = this.target.cx - this.cx, dy = this.target.cy - this.cy, d = Math.hypot(dx, dy) || 1; this.vx += dx / d * 0.35; this.vy += dy / d * 0.35; }
        const sp = Math.hypot(this.vx, this.vy); if (sp > 3) { this.vx *= 3 / sp; this.vy *= 3 / sp; }
        if (famStrike(this, this.dmg) || this.t > 200) { this.dead = true; W.sparks(this.cx, this.cy, 6); }
      } else { // Feuerball: bis zur Wand oder zum ersten Treffer
        const ch = Phys.tile(Math.floor(this.cx / T), Math.floor(this.cy / T));
        if (famStrike(this, this.dmg) || SOLID.includes(ch) || this.t > 90) { this.dead = true; W.sparks(this.cx, this.cy, 8); Audio8.sfx('explode', this.cx); }
        if (this.t % 3 === 0) W.spawn(new Particle(this.cx, this.cy, rnd(-0.3, 0.3), rnd(-0.6, 0), this.t % 2 ? '#fc7c1c' : '#f8b800', 14, 1, 0));
      }
      this.x += this.vx; this.y += this.vy;
    }
    lightUp(L, cx, cy) { L.push({ x: this.cx - cx, y: this.cy - cy, r: this.type === 'fire' ? 26 : 20, c: this.type === 'fire' ? [252, 140, 40] : this.type === 'soul' ? [216, 128, 252] : [164, 228, 252], a: 0.6 }); }
    draw(ctx) {
      const x = Math.round(this.cx - W.cam.x), y = Math.round(this.cy - W.cam.y), t = this.t;
      const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
      if (this.type === 'fire') { R(-3, -3, 6, 6, '#fc7c1c'); R(-2, -2, 4, 4, '#f8b800'); R(-1, -1, 2, 2, '#fcfcfc'); if (t & 2) R(-4 - Math.sign(this.vx) * 2, -1, 2, 2, '#fc3c1c'); }
      else if (this.type === 'soul') { R(-2, -2, 4, 4, '#d880fc'); R(-1, -1, 2, 2, '#fcfcfc'); }
      else { // Seele: kleiner Schädel mit Schweif
        ctx.globalAlpha = 0.5; R(-Math.round(this.vx * 2) - 2, -Math.round(this.vy * 2) - 1, 3, 3, '#a4e4fc'); ctx.globalAlpha = 1;
        R(-3, -3, 6, 5, '#d8f4fc'); R(-2, 2, 4, 2, '#d8f4fc'); R(-2, -1, 1, 2, '#1c2c4c'); R(1, -1, 1, 2, '#1c2c4c'); if ((t >> 3) & 1) R(-1, 3, 2, 1, '#1c2c4c');
      }
    }
  }
  // ---------------- Fledermausgestalt (Relikt „Seele der Fledermaus“, Lohn des Sonnenwächters) ----------------
  // ↓ ↑ + Sprung verwandelt (4 MP, dann 1 MP alle 0,6 s); Sprung oder Angriff verwandelt zurück, wenn Platz ist, bei 0 MP von
  // selbst. Die Fledermaus fliegt frei in alle Richtungen, ist nur 10×10 groß (passt durch enge Lücken) und greift nicht an.
  // Ein Raumwechsel verwandelt zurück. Der Held bleibt derselbe (Player), nur Update und Zeichnen laufen hier.
  const BAT_H = 10, BAT_COST = 4, HERO_H = 28;
  function freeBox(x, y, w, h) {
    for (let ty = Math.floor(y / T); ty <= Math.floor((y + h - 1) / T); ty++) for (let tx = Math.floor(x / T); tx <= Math.floor((x + w - 1) / T); tx++) if (SOLID.includes(Phys.tile(tx, ty))) return false;
    return true;
  }
  function toBat(p) {
    p.batForm = true; p.batT = 0; p.state = 'normal'; p.atkT = 0; p.dashT = 0; p.ledge = null; p.wallSlide = 0; p.crouch = false; p.crouchAtk = false;
    p.y += 4; p.h = BAT_H; p.vx = 0; p.vy = -0.5; p.onGround = false;
    mp -= BAT_COST; Audio8.sfx('bat'); Input.rumble(0.3, 0.2, 100);
    for (let i = 0; i < 16; i++) W.spawn(new Particle(p.cx + rnd(-8, 8), p.cy + rnd(-10, 10), rnd(-1, 1), rnd(-1, 1), i % 2 ? '#9c6cfc' : '#2c1c3c', 26, 1, 0));
  }
  function fromBat(p, force) { // Gestalt zurück: Füße knapp unter der Fledermaus, sonst etwas höher oder tiefer, wo Platz ist
    const base = p.y + BAT_H + 14;
    for (const dy of [0, -8, 8, -16, 16, -24]) {
      const y = base + dy - HERO_H;
      if (freeBox(p.x, y, p.w, HERO_H)) { p.batForm = false; p.h = HERO_H; p.y = y; p.vy = 0; Audio8.sfx('bat'); for (let i = 0; i < 12; i++) W.spawn(new Particle(p.cx + rnd(-6, 6), p.cy + rnd(-12, 12), rnd(-1, 1), rnd(-1, 1), '#9c6cfc', 22, 1, 0)); return true; }
    }
    if (force) { p.batForm = false; p.h = HERO_H; p.y = p.y + BAT_H - HERO_H; return true; }
    W.popup(p.cx, p.y - 8, '!', '#fc7460'); Audio8.sfx('wall'); return false; // zu eng
  }
  function batUpdate(p) {
    if (p.inv > 0) p.inv--;
    p.state = 'normal'; // Treffer werfen die Fledermaus nur kurz zurück
    const I = Input.held, P = Input.pressed;
    if ((P.jump || P.attack) && p.batT > 10 && fromBat(p)) return;
    p.batT++; p.walkT++;
    if (p.batT % 36 === 0 && --mp <= 0) { mp = 0; fromBat(p, true); return; }
    const tx = (I.right ? 1 : 0) - (I.left ? 1 : 0), ty = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    p.vx += (tx * 2.4 - p.vx) * 0.25; p.vy += (ty * 2.1 + (ty ? 0 : Math.sin(p.batT * 0.15) * 0.25) - p.vy) * 0.25;
    if (tx) p.face = tx;
    Phys.moveX(p, p.vx); Phys.moveY(p, p.vy);
    const H = W.room.h * T;
    if (p.y < 0) { p.y = 0; p.vy = 0; }
    if (p.y + p.h > H) { p.y = H - p.h; p.vy = 0; }
    if (!W.room.wrap) p.x = clamp(p.x, 0, W.room.w * T - p.w);
    p.onGround = false;
  }
  function batDraw(p, ctx, cam) {
    if (p.inv > 0 && (W.frame & 2)) return;
    const x = Math.round(p.cx - cam.x), y = Math.round(p.cy - cam.y), f = p.face, up = (p.batT >> 2) & 1;
    const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(f > 0 ? x + a : x - a - w, y + b, w, h); };
    R(-3, -3, 7, 6, '#1c1028'); R(-2, -4, 2, 1, '#1c1028'); R(2, -4, 2, 1, '#1c1028'); // Körper, Ohren
    R(1, -1, 1, 1, '#fc3c3c'); R(3, -1, 1, 1, '#fc3c3c'); R(-2, 2, 6, 1, '#3c2850'); // Augen, Bauch
    const wy = up ? -6 : 1, wc = '#4c2c6c', wh = '#9c6cfc';
    R(-11, wy, 8, 2, wc); R(-8, wy + 2, 5, 1, wc); R(4, wy, 8, 2, wc); R(4, wy + 2, 5, 1, wc); // Flügel
    R(-11, wy, 8, 1, wh); R(4, wy, 8, 1, wh);
    if (p.batT % 6 < 3) R(-1, 4, 1, 1, '#9c6cfc'); // Schimmer
  }
  if (on) {
    const up = Player.prototype.update, dr = Player.prototype.draw;
    Player.prototype.update = function (...a) {
      if (this.batForm && this.state === 'dead') { this.batForm = false; this.h = HERO_H; this.y -= HERO_H - BAT_H; }
      return this.batForm ? batUpdate(this) : up.apply(this, a);
    };
    Player.prototype.draw = function (ctx, cam) { return this.batForm ? batDraw(this, ctx, cam) : dr.call(this, ctx, cam); };
  }
  // Statusbildschirm, Seite 2: gelernte Zauber mit Befehl (Blick nach rechts) und MP-Kosten
  function drawSpells(ctx) {
    const cx = View.cx, lx = cx - Math.min(130, View.w / 2 - 16), rx = cx + Math.min(130, View.w / 2 - 16);
    const ARROW = { F: '→', B: '←', U: '↑', D: '↓', DF: '↘', DB: '↙' };
    Font.draw(ctx, 'MP ' + mp + '/' + mpMax(), cx, 40, '#7cdcfc', { align: 'center', shadow: '#000' });
    SPELL_IDS.forEach((id, i) => {
      const y = 60 + i * 34, k = known(id), s = SPELLS[id];
      Font.draw(ctx, k ? tr('spell_' + id) : '???', lx, y, k ? s.col : '#5c5c6c', { shadow: '#000' });
      Font.draw(ctx, s.mp + ' MP', rx, y, k ? '#7cdcfc' : '#5c5c6c', { align: 'right', shadow: '#000' });
      if (k) {
        Font.draw(ctx, s.cmd.map(c => ARROW[c]).join(' ') + '  + ' + tr('spellAttack'), lx + 8, y + 11, '#fcfcfc', { shadow: '#000' });
        Font.draw(ctx, itemDesc('book_' + id), lx + 8, y + 21, '#b0a080');
      } else Font.draw(ctx, tr('spellUnknown'), lx + 8, y + 11, '#5c5c6c');
    });
    if (relic.bat) { // Verwandlung
      const y = 162;
      Font.draw(ctx, tr('relic_bat'), lx, y, RELIC_COL.bat, { shadow: '#000' });
      Font.draw(ctx, BAT_COST + '+ MP', rx, y, '#7cdcfc', { align: 'right', shadow: '#000' });
      Font.draw(ctx, '↓ ↑  + ' + tr('spellJump') + '   (' + tr('spellJump') + '/' + tr('spellAttack') + ': ' + tr('batBack') + ')', lx + 8, y + 11, '#fcfcfc', { shadow: '#000' });
    }
    Font.draw(ctx, tr('spellNote'), cx, 200, '#7c7c8c', { align: 'center' });
  }
  let famEnt = null;
  function famTick() { // genau ein Begleiter, passend zum belegten Platz; nach Raumwechsel neu beim Helden
    const id = eq.fam || null;
    if (famEnt && (famEnt.dead || famEnt.room !== W.room || famEnt.id !== id)) { famEnt.dead = true; famEnt = null; }
    if (id && !famEnt && W.player && W.player.alive) famEnt = W.spawn(new CastleFamiliar(id));
  }
  function lootDrop(e, big) { // Beute nach Gefahrenstufe; Ausrüstung, die man schon hat, wird zum Heiltrank
    const t = tierOf(W.stage, W.roomIdx), chance = big ? 1 : 0.03 * (gear('luck') ? 2.5 : 1);
    if (Math.random() >= chance) return;
    const pool = DROPS[t <= 2 ? 0 : t <= 4 ? 1 : 2];
    let id = big ? 'elixir' : pool[Math.floor(Math.random() * pool.length)];
    if (GEAR[id].slot && inv[id]) id = 'potion';
    W.spawn(new CastleLoot(id, e.cx, Math.min(e.cy, W.room.h * T - 24), null));
  }
  function drink(id) { // Trank: heilt einen Anteil der max. HP
    const p = W.player, g = GEAR[id];
    if (!inv[id] || p.hp >= p.maxHp) return false;
    inv[id]--; if (!inv[id]) delete inv[id]; save();
    const before = p.hp; p.hp = Math.min(p.maxHp, p.hp + Math.ceil(p.maxHp * g.heal));
    W.popup(p.cx, p.y - 8, 'HP +' + Math.round((p.hp - before) * 10), '#58f898'); Audio8.sfx('heart'); Audio8.sfx('glug');
    return true;
  }

  // Ausrüstungsmenü (Pause → AUSRÜSTUNG): ↑↓ wählt, ←→ (oder Sprung) wechselt das Teil, auf den Tränken trinkt Sprung/Angriff
  const menu = { sel: 0, msg: null };
  function openEquip() { menu.sel = 0; menu.msg = null; }
  const equipRows = () => [...SLOTS, ...DRINKS];
  function equipInput(P) { // true = zurück zur Pause
    if (P.start) return true;
    const rows = equipRows(), n = rows.length;
    if (P.up || P.down) { menu.sel = (menu.sel + (P.down ? 1 : n - 1)) % n; menu.msg = null; Audio8.sfx('select'); }
    const row = rows[menu.sel];
    if (SLOTS.includes(row) && (P.left || P.right || P.jump || P.attack)) {
      const own = [null, ...Object.keys(GEAR).filter(id => GEAR[id].slot === row && inv[id])];
      const i = own.indexOf(eq[row] || null), next = own[(i + (P.left ? own.length - 1 : 1)) % own.length];
      if (next) eq[row] = next; else delete eq[row];
      save(); applyHp(W.player); Audio8.sfx(own.length > 1 ? 'item' : 'select');
    } else if (DRINKS.includes(row) && (P.jump || P.attack)) { if (!drink(row)) Audio8.sfx('wall'); }
    return false;
  }
  function panel(ctx, title, col) { // Vollbild wie Status und Karte
    const w = View.w, cx = View.cx;
    ctx.fillStyle = 'rgba(2,4,18,0.97)'; ctx.fillRect(0, 0, w, 240);
    ctx.fillStyle = col; ctx.fillRect(6, 6, w - 12, 1); ctx.fillRect(6, 233, w - 12, 1); ctx.fillRect(6, 6, 1, 228); ctx.fillRect(w - 7, 6, 1, 228);
    Game.big(ctx, title, cx, 12, 2, LOGO, null, '#000');
  }
  function drawEquip(ctx, t) {
    const cx = View.cx, p = W.player, rows = equipRows(), lx = cx - Math.min(130, View.w / 2 - 16), rx = cx + Math.min(130, View.w / 2 - 16);
    panel(ctx, tr('equipTitle'), '#c89020');
    rows.forEach((row, i) => {
      const y = 40 + i * 18 + (i >= SLOTS.length ? 8 : 0), on = i === menu.sel, slot = SLOTS.includes(row), id = slot ? eq[row] : row;
      if (on) { ctx.fillStyle = 'rgba(200,144,32,0.18)'; ctx.fillRect(lx - 6, y - 4, rx - lx + 12, 16); if ((t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, lx - 4, y); }
      Font.draw(ctx, slot ? tr('slot_' + row) : '', lx + 8, y, '#b0a080');
      if (id && GEAR[id]) itemIcon(ctx, id, lx + 70, y - 2);
      const name = id ? itemName(id) + (slot ? (GEAR[id].fam ? '  LV ' + famLv(id) : '') : '  ×' + (inv[id] || 0)) : tr('slotNone');
      Font.draw(ctx, name, lx + 84, y, !id || (!slot && !inv[id]) ? '#5c5c6c' : on ? '#fcfcfc' : '#c8c8d8', { shadow: '#000' });
      if (on && slot) Font.draw(ctx, '← →', rx, y, '#7c7c8c', { align: 'right' });
    });
    const row = rows[menu.sel], id = SLOTS.includes(row) ? eq[row] : row;
    ctx.fillStyle = '#c89020'; ctx.fillRect(lx - 6, 156, rx - lx + 12, 1);
    if (id && GEAR[id]) Font.draw(ctx, itemDesc(id), cx, 162, '#fce0a8', { align: 'center', shadow: '#000' });
    const att = Math.round((p.whip >= 2 ? 2 : 1) * 10 * Options.dmgMul);
    Font.draw(ctx, 'ATT ' + att + '    DEF ' + Math.round(10 * conDiv()) + '    HP ' + Math.ceil(Math.max(0, p.hp)) + '/' + p.maxHp, cx, 180, '#fcfcfc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('item_map') + ': ' + (inv.map ? '✓' : '-') + '    GOLD ' + W.score, cx, 196, inv.map ? '#e8d8a8' : '#7c7c8c', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('equipHelp'), cx, 218, '#7c7c8c', { align: 'center' });
  }

  // Laden des Bibliothekars: öffnet nach jedem Gespräch mit ihm; Sprung/Angriff kauft, Start geht
  // ←→ wechselt zwischen KAUFEN und VERKAUFEN. Verkaufen: alles außer Zauberbüchern, Schlosskarte, Begleitern und dem einzigen
  // angelegten Stück; Preis = halber Ladenpreis bzw. ein fester Wert für Einzelstücke. Der Erlös landet auch im Spielstand der
  // Speicherkammer (der Gegenstand ist ja sofort weg).
  const SELL = { bloodrune: 2000, dragonfang: 6000, mirror: 6000, bloodstone: 4000, luckcoin: 3000, greedring: 5000, chicken: 2500 };
  const sellPrice = (id) => SELL[id] || Math.floor((GEAR[id].price || 1000) / 2);
  const sellable = () => Object.keys(GEAR).filter(id => { const g = GEAR[id]; if (!inv[id] || g.spell || g.key || g.slot === 'fam') return false; return !(g.slot && eq[g.slot] === id && inv[id] <= 1); });
  const shop = { sel: 0, say: 'shopHi', mode: 'buy' };
  function openShop() { shop.sel = 0; shop.say = 'shopHi'; shop.mode = 'buy'; }
  function saveGold(d) { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); if (s && typeof s.score === 'number') { s.score = Math.max(0, s.score + d); localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } } catch (e) { /* privat */ } }
  function shopInput(P) { // true = Laden verlassen
    if (P.start) return true;
    if (P.left || P.right) { shop.mode = shop.mode === 'buy' ? 'sell' : 'buy'; shop.sel = 0; Audio8.sfx('select'); }
    const list = shop.mode === 'buy' ? STOCK : sellable(), n = list.length;
    if (n && (P.up || P.down)) { shop.sel = (shop.sel + (P.down ? 1 : n - 1)) % n; Audio8.sfx('select'); }
    shop.sel = Math.min(shop.sel, Math.max(0, n - 1));
    if ((P.jump || P.attack) && shop.mode === 'sell') {
      const id = list[shop.sel];
      if (!id) { Audio8.sfx('wall'); return false; }
      const v = sellPrice(id);
      inv[id]--; if (!inv[id]) delete inv[id]; save();
      W.score += v; saveGold(v); Audio8.sfx('money'); shop.say = 'shopSold';
      return false;
    }
    if (P.jump || P.attack) {
      const id = STOCK[shop.sel], g = GEAR[id];
      if (once(g) && inv[id]) { shop.say = 'shopOwned'; Audio8.sfx('wall'); }
      else if (W.score < g.price) { shop.say = 'shopPoor'; Audio8.sfx('wall'); }
      else {
        W.score -= g.price; giveItem(id, false); Audio8.sfx('money');
        saveGold(-g.price); // auch im Spielstand der Speicherkammer bezahlen
        shop.say = 'shopThanks' + (1 + Math.floor(Math.random() * 3));
      }
    }
    return false;
  }
  function drawShop(ctx, t) {
    const cx = View.cx, lx = cx - Math.min(130, View.w / 2 - 16), rx = cx + Math.min(130, View.w / 2 - 16);
    panel(ctx, tr('shopTitle'), '#9c6cfc');
    ctx.save(); ctx.translate(lx + 4, 72); ctx.scale(1, 1); drawLibrarian(ctx, 0, 0, t, false); ctx.restore();
    const say = wrap(tr(shop.say), rx - lx - 24);
    say.slice(0, 3).forEach((l, i) => Font.draw(ctx, l, lx + 20, 36 + i * 10, '#c8a0fc', { shadow: '#000' }));
    const sell = shop.mode === 'sell', list = sell ? sellable() : STOCK;
    ['shopBuy', 'shopSell'].forEach((k, i) => { const on = (i === 1) === sell, x = cx + (i ? 40 : -40); Font.draw(ctx, tr(k), x, 66, on ? '#fcfcfc' : '#5c5c6c', { align: 'center', shadow: '#000' }); if (on) { ctx.fillStyle = '#9c6cfc'; ctx.fillRect(x - Font.width(tr(k)) / 2, 74, Font.width(tr(k)), 1); } });
    Font.draw(ctx, '←', cx - 84, 66, '#7c7c8c'); Font.draw(ctx, '→', cx + 80, 66, '#7c7c8c');
    const top = clamp(shop.sel - 3, 0, Math.max(0, list.length - 8)); // acht Zeilen sichtbar, die Liste rollt mit
    if (top > 0) Font.draw(ctx, '↑', rx - 4, 66, '#9c6cfc');
    if (top + 8 < list.length) Font.draw(ctx, '↓', rx - 4, 178, '#9c6cfc');
    if (!list.length) Font.draw(ctx, tr('shopNothing'), cx, 110, '#7c7c8c', { align: 'center' });
    list.slice(top, top + 8).forEach((id, n) => {
      const i = top + n, y = 80 + n * 12, on = i === shop.sel, g = GEAR[id], own = !sell && once(g) && inv[id], poor = !sell && W.score < g.price;
      if (on) { ctx.fillStyle = 'rgba(156,108,252,0.2)'; ctx.fillRect(lx - 6, y - 3, rx - lx + 12, 12); if ((t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, lx - 4, y - 1); }
      itemIcon(ctx, id, lx + 8, y - 2);
      Font.draw(ctx, itemName(id) + ((sell || DRINKS.includes(id)) && inv[id] ? '  ×' + inv[id] : ''), lx + 22, y, own ? '#5c5c6c' : on ? '#fcfcfc' : '#c8c8d8', { shadow: '#000' });
      Font.draw(ctx, sell ? '+' + sellPrice(id) + ' G' : own ? tr('equipOwned') : g.price + ' G', rx, y, own ? '#5c5c6c' : poor ? '#a84848' : sell ? '#58f898' : '#f8b800', { align: 'right', shadow: '#000' });
    });
    if (list[shop.sel]) Font.draw(ctx, itemDesc(list[shop.sel]), cx, 186, '#fce0a8', { align: 'center', shadow: '#000' });
    Font.draw(ctx, 'GOLD ' + W.score, cx, 202, '#f8b800', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('shopHelp'), cx, 218, '#7c7c8c', { align: 'center' });
  }

  // ---------------- Bestiarium wie die Gegnerliste in SotN (Status, dritte Seite): Siege je Gegnerart, absurde Einträge ----------------
  const BEASTS = ['Bat', 'Skeleton', 'Ghoul', 'Raven', 'Knight', 'LivingArmor', 'Panther', 'Skull', 'Fishman', 'Ghost', 'Snake', 'FlyBook', 'Tome',
    'Pillar', 'MedusaHead', 'IceSkeleton', 'IceBoulder', 'SeaEagle', 'Snapper', 'Pitcher', 'Cocoon',
    'TentacleBoss', 'GiantBat', 'IceWitch', 'GiantSkeleton', 'Medusa', 'SunWarden', 'ManTrap', 'Count'];
  const BEAST_BOSS = { TentacleBoss: 'bossTentacle', GiantBat: 'boss1', IceWitch: 'bossWitch', GiantSkeleton: 'boss2', Medusa: 'boss3', SunWarden: 'bossKnight', ManTrap: 'bossTrap', Count: 'boss4' };
  const BEAST_SET = new Set(BEASTS);
  const beastName = (k) => tr(BEAST_BOSS[k] || 'beast_' + k);
  const beasts = { sel: 0 };
  function drawBeasts(ctx, t) {
    const cx = View.cx, lx = cx - Math.min(130, View.w / 2 - 16), rx = cx + Math.min(130, View.w / 2 - 16), rows = 10;
    const known = BEASTS.filter(k => best[k]).length, top = clamp(beasts.sel - 4, 0, BEASTS.length - rows);
    Font.draw(ctx, tr('beastCount', known, BEASTS.length), cx, 36, '#c8a0fc', { align: 'center', shadow: '#000' });
    if (top > 0) Font.draw(ctx, '↑', rx, 36, '#9c6cfc');
    if (top + rows < BEASTS.length) Font.draw(ctx, '↓', rx, 48 + rows * 12, '#9c6cfc');
    BEASTS.slice(top, top + rows).forEach((k, n) => {
      const i = top + n, y = 50 + n * 12, on = i === beasts.sel, got = best[k], bossy = !!BEAST_BOSS[k];
      if (on) { ctx.fillStyle = 'rgba(156,108,252,0.2)'; ctx.fillRect(lx - 4, y - 2, rx - lx + 8, 11); }
      Font.draw(ctx, String(i + 1).padStart(2, '0'), lx, y, '#5c5c6c');
      Font.draw(ctx, got ? beastName(k) : '???', lx + 18, y, got ? (bossy ? '#f8b800' : on ? '#fcfcfc' : '#c8c8d8') : '#5c5c6c', { shadow: '#000' });
      if (got) Font.draw(ctx, '×' + got, rx, y, '#7cdcfc', { align: 'right', shadow: '#000' });
    });
    const k = BEASTS[beasts.sel];
    wrap(best[k] ? tr('beastD_' + k) : tr('beastUnknown'), rx - lx).slice(0, 2).forEach((l, i) => Font.draw(ctx, l, cx, 180 + i * 10, best[k] ? '#fce0a8' : '#5c5c6c', { align: 'center', shadow: '#000' }));
  }

  // Statusbildschirm (Pause → STATUS): Werte wie in SotN in zwei Spalten, darunter EXP-Leiste, Karte, Siegel, Warpkammern
  let statusPage = 0; // 0 = Werte, 1 = Zauber, 2 = Bestiarium (←→ blättert, im Bestiarium ↑↓ wählen)
  function statusInput(P) {
    if (P.left || P.right) { statusPage = (statusPage + (P.right ? 1 : 2)) % 3; Audio8.sfx('select'); }
    if (statusPage === 2 && (P.up || P.down)) { beasts.sel = clamp(beasts.sel + (P.down ? 1 : -1), 0, BEASTS.length - 1); Audio8.sfx('select'); }
  }
  function drawStatus(ctx, t) {
    const w = View.w, cx = View.cx, p = W.player, v = values();
    if (statusPage === 1) { panel(ctx, tr('spellTitle'), '#7cdcfc'); drawSpells(ctx); Font.draw(ctx, tr('statusHelp'), cx, 222, '#7c7c8c', { align: 'center' }); return; }
    if (statusPage === 2) { panel(ctx, tr('beastTitle'), '#9c6cfc'); drawBeasts(ctx, t); Font.draw(ctx, tr('statusHelp'), cx, 222, '#7c7c8c', { align: 'center' }); return; }
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

  // ---------------- Wegweiser: was als Nächstes, und wo ----------------
  // Ziele in der empfohlenen Reihenfolge; das erste unerledigte ist das nächste. at = Kartenziel ([Raum], 'arena' | x, y).
  const bossDone = (R) => { const a = ref(R); return !!(a && boss[roomKey(a.s, a.r)]); };
  const bossName = (id) => { const s = sIdx(id); return s < 0 ? '' : tr(S()[s].bossKey); };
  const GOALS = [
    { done: () => relic.jump2, verb: 'castleGoalFind', obj: () => tr('relic_jump2'), where: 'whereKolo', at: [['side', 'kolosseum'], 81, 10] },
    { done: () => bossDone([0, -1]), verb: 'castleGoalBeat', obj: () => bossName(0), where: 'whereHall', at: [[0, -1], 'arena'] },
    { done: () => relic.dash, verb: 'castleGoalFind', obj: () => tr('relic_dash'), where: 'whereHall', at: [[0, -1], 'arena'] },
    { done: () => relic.ring, verb: 'castleGoalFind', obj: () => tr('relic_ring'), where: 'whereIce', at: [[1, 2], 12, 10] },
    { done: () => bossDone([1, -1]), verb: 'castleGoalBeat', obj: () => bossName(1), where: 'whereCrypt', at: [[1, -1], 'arena'] },
    { done: () => relic.wall, verb: 'castleGoalFind', obj: () => tr('relic_wall'), where: 'whereCrypt', at: [[1, -1], 'arena'] },
    { done: () => bossDone([2, -1]), verb: 'castleGoalBeat', obj: () => bossName(2), where: 'whereGallery', at: [[2, -1], 'arena'] },
    { done: () => relic.breaker, verb: 'castleGoalFind', obj: () => tr('relic_breaker'), where: 'whereGallery', at: [[2, -1], 'arena'] },
    { done: () => bossDone(['sun', -1]), verb: 'castleGoalBeat', obj: () => bossName('sun'), where: 'whereRoof', at: [['sun', -1], 'arena'] },
    { done: () => relic.bat, verb: 'castleGoalFind', obj: () => tr('relic_bat'), where: 'whereRoof', at: [['sun', -1], 'arena'] },
    { done: () => bossDone(['expo', -1]), verb: 'castleGoalBeat', obj: () => bossName('expo'), where: 'whereDome', at: [['expo', -1], 'arena'] },
    { done: () => S().some((st, s) => st.id === 3 && layout(s).some(r => seen[r.key] && seen[r.key].size)), verb: 'castleGoalGate', obj: () => '', where: 'whereSeal', at: [[0, 1], SEAL.x, SEAL.y] },
    { done: () => false, verb: 'castleGoalBeat', obj: () => bossName(3), where: 'whereThrone', at: [[3, -1], 'arena'] },
  ];
  const goal = () => GOALS.find(g => !g.done()) || null;
  const goalText = (g) => tr(g.verb, g.obj());
  function goalCell(g) { // Kartenzelle des Ziels (absolut)
    const a = ref(g.at[0]), rm = a && roomAt(a.s, a.r);
    if (!rm) return null;
    const c = g.at[1] === 'arena' ? { x: rm.cw - 1, y: cellY(rm.def.start.y, rm.ch) } : placeCell(rm, { x: g.at[1], y: g.at[2] });
    return { x: rm.ax + c.x, y: rm.ay + c.y };
  }
  // eigene Einblendung unten im Bild (unabhängig von den Raum-Hinweisen oben, die sie sonst überschreiben würden)
  let toast = null, goalWait = 0;
  function announceGoal(delay = 200) { goalWait = Math.max(1, delay); }
  function goalTick() {
    if (goalWait > 0 && --goalWait === 0) { const g = goal(); if (g) toast = { a: tr('castleGoalNote', goalText(g)), b: tr(g.where), t: 330 }; }
    else if (toast && --toast.t <= 0) toast = null;
  }
  function drawGoalToast(ctx) {
    if (!toast) return;
    const k = toast.t, a = Math.min(1, (330 - k) / 20, k / 30), w = Math.min(View.w - 8, Math.max(Font.width(toast.a), Font.width(toast.b)) + 16), x = Math.round(View.cx - w / 2), y = 206;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x, y, w, 24);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + 23, w, 1);
    Font.draw(ctx, toast.a, View.cx, y + 4, '#f8b800', { align: 'center', shadow: '#000' });
    Font.draw(ctx, toast.b, View.cx, y + 14, '#d0c0a0', { align: 'center', shadow: '#000' });
    ctx.globalAlpha = 1;
  }
  function drawGoalBanner(ctx, y) { // Pausenmenü: nächstes Ziel oben im Bild
    const g = goal();
    if (!g) return;
    const w = View.w, cx = View.cx;
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(0, y - 3, w, 25);
    ctx.fillStyle = '#c89020'; ctx.fillRect(0, y - 3, w, 1); ctx.fillRect(0, y + 21, w, 1);
    Font.draw(ctx, tr('castleGoalLabel') + ': ' + goalText(g), cx, y, '#f8b800', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr(g.where), cx, y + 11, '#d0c0a0', { align: 'center', shadow: '#000' });
  }

  // ---------------- Geschichte: Figuren, die die Handlung vorantreiben ----------------
  // Drei Figuren, absurd wie in Maniac Mansion: der zweite Held (der, den man gerade nicht spielt – auch ihn hat der Fluch am Tor
  // getroffen; er hält die Eingangshalle und weiß nach jedem Relikt, wohin es weitergeht), der alte Bibliothekar im Bergfried
  // (Chronik des Grafen, heilt bei jedem Gespräch) und der lila Tentakel vom Schiff (gefeuert, sitzt im Eimer, plant die
  // Weltherrschaft). Szene = Figur, Ort ([Raum], Kachel-x, Standreihe), Bedingung; eine Figur steht dort, wo ihre letzte
  // erfüllte Szene spielt. Neue Szene: das Gespräch beginnt beim Herantreten (die Welt steht still), danach wiederholt ↑ den Rat.
  // Gesehene Szenen: flag['story_<id>']. Texte: i18n story_<id> (Seiten) und story_<id>Again (Wiederholung).
  const BEATS = [
    { id: 'meet', who: 'ally', at: [[0, 0], 4, 10], when: () => flag.curse, leave: true, wait: 70 },  // Burghof: gleich nach dem Fluch
    { id: 'wait', who: 'ally', at: [[0, 1], 40, 17], when: () => flag.story_meet, lines: false },     // Eingangshalle: wartet
    { id: 'feather', who: 'ally', at: [[0, 1], 40, 17], when: () => relic.jump2 },
    { id: 'cloak', who: 'ally', at: [[0, 1], 40, 17], when: () => relic.dash },
    { id: 'claw', who: 'ally', at: [[0, 1], 40, 17], when: () => relic.wall },
    { id: 'stone', who: 'ally', at: [[0, 1], 40, 17], when: () => relic.breaker },
    { id: 'wings', who: 'ally', at: [[0, 1], 40, 17], when: () => relic.bat },                         // Fledermausgestalt: Sims unter der Decke
    { id: 'seals', who: 'ally', at: [[0, 1], 32, 11], when: () => seals() >= sealRooms().length },  // auf der Galerie am Siegeltor
    { id: 'lib', who: 'lib', at: [[2, 1], 15, 47], when: () => true, heal: true },                    // Bibliothek: neben dem Lesepult
    { id: 'lib2', who: 'lib', at: [[2, 1], 15, 47], when: () => relic.breaker, heal: true, again: 'lib' },
    { id: 'tent', who: 'tent', at: [['side', 'kolosseum'], 8, 10], when: () => flag.curse },          // Kolosseum: der gefeuerte Tentakel im Eimer
    { id: 'tent3', who: 'tent', at: [['side', 'kolosseum'], 8, 10], when: () => relic.jump2, give: 'tentling' }, // gibt seinen Neffen mit
    { id: 'tent2', who: 'tent', at: [['side', 'himmel'], 14, 8], when: () => relic.breaker && (flag.story_tent3 || inv.tentling), gold: 1000 }, // Himmelsbrücke: erobert die Wolken
  ];
  const WHO = ['ally', 'lib', 'tent'], VOICE = { ally: 'A', lib: 'L', tent: 'T' };
  const allyId = () => { const ids = HEROES.list.map(d => d.id), i = Math.max(0, ids.indexOf(Options.character)); return ids[(i + 1) % ids.length]; };
  const beatDone = (b) => b.lines === false || !!flag['story_' + b.id];
  function beatNow(who) { let b = null; for (const x of BEATS) if (x.who === who && x.when()) b = x; return b; }

  // Bibliothekar (1×, Mitte unten = Füße): Gelehrtenkappe, weißer Bart, Brille, violette Robe mit Goldsaum, aufgeschlagenes Buch
  function drawLibrarian(ctx, cx, feet, t, flip) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(flip ? cx - x - w : cx + x, feet + y, w, h); };
    const bob = (t >> 5) % 2, turn = t % 170 < 12;
    R(-5, -2, 4, 2, '#2c1c14'); R(1, -2, 4, 2, '#2c1c14'); // Schuhe
    for (let k = 0; k < 20; k++) { const hw = 7 - Math.floor(k / 6); R(-hw, -2 - k, hw * 2, 1, '#4c3478'); R(-hw, -2 - k, 2, 1, '#2c1c4c'); }
    R(-7, -3, 14, 1, '#d8a838'); R(0, -20, 1, 17, '#a07c28'); // Goldsaum
    R(-5, -23 + bob, 10, 2, '#4c3478'); R(-5, -23 + bob, 2, 2, '#2c1c4c'); // Schultern
    R(-3, -30 + bob, 7, 7, '#e8b088'); R(-3, -24 + bob, 7, 1, '#b87850'); // Gesicht
    R(-3, -32 + bob, 7, 2, '#6c1c2c'); R(-2, -33 + bob, 5, 1, '#6c1c2c'); R(-1, -33 + bob, 2, 1, '#a03040'); // Kappe
    R(-4, -30 + bob, 2, 5, '#e0e0e8'); R(4, -29 + bob, 1, 3, '#e0e0e8'); // Haar
    R(1, -28 + bob, 3, 2, '#f8e070'); R(2, -27 + bob, 1, 1, '#1c1020'); R(4, -27 + bob, 1, 2, '#b87850'); // Brille, Nase
    R(-2, -24 + bob, 6, 3, '#e0e0e8'); R(-1, -21 + bob, 5, 3, '#e0e0e8'); R(0, -18 + bob, 3, 3, '#c8c8d4'); R(1, -15 + bob, 1, 2, '#a0a0b0'); // Bart
    R(2, -18, 4, 4, '#3c2868'); R(6, -16, 2, 2, '#e8b088'); // Ärmel, Hand
    R(3, -14, 9, 2, '#7c2c1c'); R(3, -16, 9, 2, '#f4ecd4'); R(7, -16, 1, 2, '#c8bca0'); // Buch
    if (turn) R(8, -19, 3, 3, '#f4ecd4'); // Seite wird umgeblättert
    if ((t >> 3) % 6 === 0) R(9, -18, 1, 1, '#fce0a8'); // Funkeln über dem Buch
  }
  // Lila Tentakel (1×, Mitte unten = Füße): Holzeimer mit Meerwasser, daraus der Fangarm – wiegt sich, Saugnäpfe, ein Auge mit Schurkenbraue
  function drawTentacle(ctx, cx, feet, t, flip) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(flip ? cx - x - w : cx + x, feet + y, w, h); };
    for (let k = 0; k < 24; k++) { // Arm von unten nach oben: schmaler, schwingt oben weiter aus
      const y = -12 - k, hw = k < 16 ? 4 : k < 21 ? 3 : 2, sw = Math.round(Math.sin(t * 0.05 - k * 0.18) * k / 9);
      R(-hw + sw, y, hw * 2, 1, '#7c2c98'); R(-hw + sw, y, 1, 1, '#4e1666'); R(hw - 2 + sw, y, 1, 1, '#ac58c8');
      if (k % 4 === 1 && k < 20) R(hw - 1 + sw, y, 1, 1, '#f0bcd8'); // Saugnäpfe
    }
    const top = Math.round(Math.sin(t * 0.05 - 23 * 0.18) * 23 / 9);
    R(top - 2, -37, 4, 1, '#7c2c98'); R(top + 1, -38, 3, 2, '#7c2c98'); R(top + 3, -37, 1, 2, '#ac58c8'); // eingerollte Spitze
    const ex = Math.round(Math.sin(t * 0.05 - 17 * 0.18) * 17 / 9), blink = t % 140 < 6;
    R(ex - 2, -31, 5, blink ? 1 : 4, blink ? '#4e1666' : '#fcfcfc'); // Auge
    if (!blink) { R(ex + 1, -30, 2, 2, '#1c0418'); R(ex + 1, -30, 1, 1, '#fc6c9c'); }
    R(ex - 3, -33, 3, 1, '#16041e'); R(ex, -34, 3, 1, '#16041e'); // böse Braue
    R(ex - 1, -25, 4, 1, '#16041e'); R(ex - 1, -24, 1, 1, '#16041e'); // schiefer Mund
    R(-7, -13, 14, 2, '#5c3418'); R(-6, -13, 12, 1, '#3c7cbc'); // Eimerrand mit Wasser
    R(-6, -11, 12, 11, '#7c4c24'); R(-6, -11, 2, 11, '#4c2c14'); R(3, -11, 1, 11, '#9c6434'); // Holz
    R(-7, -9, 14, 1, '#8c8c9c'); R(-7, -3, 14, 1, '#8c8c9c'); // Eisenbänder
    if (t % 90 < 4) R(5, -15 - (t % 90), 1, 1, '#a4e4fc'); // ein Tropfen spritzt
  }
  class CastleNPC extends Ent {
    constructor(b) { super(b.at[1] * T, (b.at[2] + 1) * T - 30, 16, 30); this.kind = 'prop'; this.b = b; this.face = -1; this.go = 0; this.walk = 0; }
    update() {
      this.t++;
      if (this.go) { this.x += 1.6 * this.go; this.walk++; if (this.t > 36) this.dead = true; return; } // geht davon und verschwindet in den Schatten
      const p = W.player; if (p) this.face = p.cx < this.cx ? -1 : 1;
      const b = beatNow(this.b.who); // neue Szene am selben Platz (z. B. Relikt im selben Raum gefunden): gleich übernehmen
      if (b && b !== this.b && same(ref(b.at[0]), W.stage, W.roomIdx) && b.at[1] === this.b.at[1] && b.at[2] === this.b.at[2]) this.b = b;
    }
    lightUp(L, cx, cy) { L.push({ x: this.cx - cx, y: this.y - cy + 10, r: 30 + Math.sin(this.t * 0.05) * 2, c: this.b.who === 'lib' ? [252, 200, 130] : this.b.who === 'tent' ? [200, 110, 250] : [190, 200, 255], a: 0.4 }); }
    draw(ctx) {
      const cam = W.cam, feet = this.y + this.h;
      if (this.b.who === 'lib') drawLibrarian(ctx, Math.round(this.cx - cam.x), Math.round(feet - cam.y), this.t, this.face < 0);
      else if (this.b.who === 'tent') drawTentacle(ctx, Math.round(this.cx - cam.x), Math.round(feet - cam.y), this.t, this.face < 0);
      else {
        const H = HEROES.get(allyId()), spr = this.go ? H.walk[Math.floor(this.walk / 5) % 8] : H.idle[Math.floor(this.t / 40) % 2];
        if (this.go) ctx.globalAlpha = clamp(1 - (this.t - 10) / 26, 0, 1);
        Sprites.draw(ctx, spr, this.cx - 8 - (spr.mx || 0) - cam.x, Math.round(feet - spr.h - cam.y), this.go ? this.go < 0 : this.face < 0);
        ctx.globalAlpha = 1;
      }
      if (this.go || (talk && talk.npc === this)) return;
      const p = W.player, bx = Math.round(this.cx - cam.x) - 2, by = Math.round(this.y - cam.y) - 14 + Math.round(Math.sin(this.t * 0.12) * 2);
      if (!beatDone(this.b)) Font.draw(ctx, '!', bx, by, '#f8b800', { shadow: '#000' }); // Neues zu erzählen
      else if (Math.abs(p.cx - this.cx) < 18 && Math.abs(p.feet - feet) < 12) Font.draw(ctx, '↑', bx, by, '#fcfcfc', { shadow: '#000' });
    }
  }
  function spawnNpcs(s, r) {
    for (const who of WHO) {
      const b = beatNow(who);
      if (b && same(ref(b.at[0]), s, r) && !(b.leave && beatDone(b))) W.spawn(new CastleNPC(b));
    }
  }

  // Gespräch: Textkasten unten mit Porträt (Figur links, Held rechts), Name und Schreibmaschinentext
  let talk = null;
  function wrap(s, maxW) { // Wortumbruch; Wörter ohne Leerzeichen (Japanisch/Chinesisch) und überlange Wörter Zeichen für Zeichen
    const out = [];
    let line = '';
    const add = (tok, sep) => { const t = line ? line + sep + tok : tok; if (!line || Font.width(t) <= maxW) line = t; else { out.push(line); line = tok; } };
    for (const word of s.split(' ')) {
      if (Font.width(word) <= maxW) add(word, ' ');
      else { let first = true; for (const ch of word) { add(ch, first ? ' ' : ''); first = false; } }
    }
    if (line) out.push(line);
    return out;
  }
  const talkBox = () => { // unten im Bild – stehen die Sprecher dort, oben unter der Statusleiste
    const w = Math.min(View.w - 12, 360), low = talk && talk.npc && talk.npc.y - W.cam.y > 96;
    return { x: Math.round(View.cx - w / 2), y: low ? 32 : 164, w, h: 72 };
  };
  function page() { // aktuelle Seite, umbrochen (beim ersten Zugriff)
    const pg = talk.pages[talk.i];
    if (!pg.lines) { pg.lines = wrap(pg.text, talkBox().w - 62); pg.len = pg.lines.reduce((n, l) => n + [...l].length, 0); }
    return pg;
  }
  function startTalk(npc, again) {
    const b = npc.b, ally = HEROES.def(allyId()).name, hero = HEROES.def(Options.character).name;
    const raw = again ? VOICE[b.who] + ':' + tr('story_' + (b.again || b.id) + 'Again') : tr('story_' + b.id);
    const pages = (Array.isArray(raw) ? raw : [raw]).filter(s => s[0] !== 'K' || Options.character === 'kaspar')
      .map(s => ({ who: s[0] === 'K' ? 'H' : s[0], text: s.slice(2).replace(/\{0\}/g, ally).replace(/\{1\}/g, hero) }));
    const p = W.player;
    talk = { npc, b, again, pages, i: 0, n: 0 };
    npc.face = p.cx < npc.cx ? -1 : 1; p.face = -npc.face; p.vx = 0;
    Audio8.sfx(b.who === 'lib' ? 'page' : b.who === 'tent' ? 'slime' : 'select');
    Game.go('talk');
  }
  function endTalk() {
    if (talk.epi) { talk = null; return 'results'; } // Epilog vorbei: Ergebnis
    const { npc, b, again } = talk;
    talk = null;
    if (b.gold && !again && !beatDone(b)) { // Tentakel: klebriges Goldstück fürs Schweigen
      const p = W.player;
      W.addScore(b.gold); W.popup(p.cx, p.y - 8, '+' + b.gold + ' G', '#f8b800'); Audio8.sfx('money');
    }
    if (b.give && !inv[b.give]) giveItem(b.give, true); // Geschenk (Begleiter)
    if (!again && !beatDone(b)) { flag['story_' + b.id] = 1; save(); announceGoal(50); }
    if (b.leave && !again) { npc.go = 1; npc.t = 0; } // macht sich auf den Weg
    if (b.heal) { // Bibliothekar: Kerzenschein heilt
      const p = W.player;
      p.hp = p.maxHp; mp = mpMax(); if (!Options.infHearts) p.hearts = Math.max(p.hearts, 10);
      W.popup(p.cx, p.y - 8, 'HP MAX', '#58f898'); Audio8.sfx('heart');
      for (let i = 0; i < 14; i++) W.spawn(new Particle(p.cx + rnd(-8, 8), p.y + rnd(0, 28), rnd(-0.4, 0.4), rnd(-1.4, -0.3), i % 2 ? '#58f898' : '#fce0a8', 40, 1, 0));
    }
    if (b.who === 'lib') { openShop(); return 'shop'; } // danach sein Laden
    return true;
  }
  function talkInput(P) { // true = Gespräch vorbei, 'shop' = weiter in den Laden (Sprung/Angriff/↑: Seite fertig schreiben bzw. weiterblättern, Start: alles überspringen)
    if (!talk) return true;
    if (Game.t < 6) return false;
    const pg = page();
    if (talk.n < pg.len) { talk.n = Math.min(pg.len, talk.n + 1); if (talk.n % 4 === 0) Audio8.sfx('tink'); }
    if (P.start) return endTalk();
    if (P.jump || P.attack || P.up) {
      if (talk.n < pg.len) talk.n = pg.len;
      else if (++talk.i >= talk.pages.length) return endTalk();
      else { talk.n = 0; Audio8.sfx('select'); }
    }
    return false;
  }
  function portrait(ctx, who, x, y, t) { // 40×40: Figur in doppelter Größe, Kopf und Schultern
    ctx.fillStyle = '#c89020'; ctx.fillRect(x - 2, y - 2, 44, 44);
    ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 42, 42);
    ctx.fillStyle = who === 'L' ? '#24183c' : who === 'H' ? '#0c1c34' : who === 'T' ? '#0c2434' : '#1c1028'; ctx.fillRect(x, y, 40, 40);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, 40, 40); ctx.clip();
    if (who === 'L') { ctx.translate(x + 20, y + 70); ctx.scale(2, 2); drawLibrarian(ctx, 0, 0, t, false); }
    else if (who === 'T') { ctx.translate(x + 18, y + 80); ctx.scale(2, 2); drawTentacle(ctx, 0, 0, t, false); }
    else {
      const H = HEROES.get(who === 'A' ? allyId() : Options.character), spr = H.idle[0], img = who === 'H' ? spr.f : spr.c;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x + 20 - img.width, y + 4 - spr.pad * 2, img.width * 2, img.height * 2); // Bildmitte = Figurmitte (wie in der Heldenwahl)
    }
    ctx.restore();
  }
  function drawTalk(ctx, t) {
    if (!talk) return;
    const pg = page(), { x, y, w, h } = talkBox(), hero = pg.who === 'H';
    ctx.fillStyle = 'rgba(4,2,16,0.94)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    ctx.fillStyle = '#5c3c10'; ctx.fillRect(x + 2, y + 2, w - 4, 1); ctx.fillRect(x + 2, y + h - 3, w - 4, 1);
    ctx.fillStyle = '#fce0a8'; for (const [ex, ey] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]]) { ctx.fillRect(ex - 1, ey, 3, 1); ctx.fillRect(ex, ey - 1, 1, 3); }
    const px = hero ? x + w - 48 : x + 8, tx = hero ? x + 10 : x + 56;
    portrait(ctx, pg.who, px, y + 10, t);
    const name = pg.who === 'L' ? tr('npcLib') : pg.who === 'T' ? tr('bossTentacle') : HEROES.def(pg.who === 'A' ? allyId() : Options.character).name;
    Font.draw(ctx, name, tx, y + 7, hero ? '#7cdcfc' : pg.who === 'L' ? '#c8a0fc' : pg.who === 'T' ? '#d880fc' : '#f8b800', { shadow: '#000' });
    let left = Math.floor(talk.n);
    pg.lines.forEach((l, i) => {
      const ch = [...l], s = ch.slice(0, Math.max(0, left)).join('');
      left -= ch.length;
      if (s) Font.draw(ctx, s, tx, y + 21 + i * 11, '#fcfcfc', { shadow: '#000' });
    });
    if (talk.n >= pg.len && (t >> 4) % 2 === 0) Font.draw(ctx, talk.i + 1 < talk.pages.length ? '↓' : '·', hero ? x + w - 60 : x + w - 12, y + h - 12, '#f8b800', { shadow: '#000' });
  }

  // ---------------- Ende im Schloss-Modus: Epilog, Ergebnis, Neues Spiel+ ----------------
  // Nach dem Grafen: die drei Figuren verabschieden sich über der Morgendämmerung (Gesprächsfenster wie im Spiel), dann das
  // Ergebnis wie in SotN (Erkundungsgrad, Zeit, Stufe, Relikte, Gefäße, Rang nach Erkundungsgrad) mit der Wahl zwischen
  // NEUES SPIEL+ (Stufe, Gold, Ausrüstung, Begleiter und Zauber bleiben; Karte, Relikte, Bosse, Gefäße und Warpkammern auf
  // Anfang; jede Runde zwei Gefahrenstufen mehr; Start am Burgtor) und dem Abspann.
  function startEpilogue() {
    flag.cleared = (flag.cleared || 0) + 1; save();
    const ally = HEROES.def(allyId()).name, hero = HEROES.def(Options.character).name, raw = tr('story_epilogue');
    talk = { npc: null, b: null, again: false, epi: true, i: 0, n: 0,
      pages: (Array.isArray(raw) ? raw : [raw]).map(s => ({ who: s[0], text: s.slice(2).replace(/\{0\}/g, ally).replace(/\{1\}/g, hero) })) };
  }
  const ngp = () => flag.ngp || 0;
  const RANKS = [[95, 'S'], [80, 'A'], [60, 'B'], [0, 'C']];
  const rankOf = () => { const p = +percent(); return RANKS.find(([min]) => p >= min)[1]; };
  const results = { sel: 0 };
  function resultsInput(P) { // 'ngplus', 'credits' oder null
    if (P.up || P.down) { results.sel = 1 - results.sel; Audio8.sfx('select'); }
    if (P.jump || P.attack || P.start) return results.sel === 0 ? 'ngplus' : 'credits';
    return null;
  }
  function drawResults(ctx, t) {
    const cx = View.cx, lx = cx - Math.min(110, View.w / 2 - 20), rx = cx + Math.min(110, View.w / 2 - 20), rank = rankOf();
    panel(ctx, tr('endTitle'), '#f8b800');
    const vAll = S().reduce((n, st) => n + st.rooms.reduce((m, d) => m + d.ents.filter(e => e.type === 'vessel').length, 0), 0);
    const rows = [[tr('mapCastle', percent()), ''], ['TIME', playTime()], ['LV', rpg.lv], ['KILLS', rpg.kills], [tr('castleRelicCount', RELICS.filter(k => relic[k]).length, RELICS.length), ''],
      [tr('castleVesselCount', vessels(), vAll), ''], ['GOLD', W.score]];
    if (ngp()) rows.push(['NG+', ngp()]);
    rows.forEach(([k, v], i) => { Font.draw(ctx, k, lx, 40 + i * 12, '#d0c0a0', { shadow: '#000' }); if (v !== '') Font.draw(ctx, String(v), rx, 40 + i * 12, '#fcfcfc', { align: 'right', shadow: '#000' }); });
    const ry = 40 + rows.length * 12 + 8; // Rang mit Kommentar
    Game.big(ctx, rank, cx, ry, 3, rank === 'S' ? LOGO : ['#fcfcfc', '#fce0a8', '#f8b800', '#c89020', '#9c6400', '#6c4410', '#2c1408'], null, '#000');
    wrap(tr('endRank' + rank), rx - lx).slice(0, 2).forEach((l, i) => Font.draw(ctx, l, cx, ry + 26 + i * 10, '#c8a0fc', { align: 'center', shadow: '#000' }));
    ['endNgPlus', 'endCredits'].forEach((k, i) => {
      const y = 200 + i * 12, on = results.sel === i;
      Font.draw(ctx, tr(k), cx, y, on ? '#fcfcfc' : '#7c7c8c', { align: 'center', shadow: '#000' });
      if (on && (t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, cx - Font.width(tr(k)) / 2 - 12, y - 1);
    });
  }
  function ngPlus() { // Fortschritt zurück, Held behalten; Rückgabe: was Game nach newGame wieder einsetzt
    const keep = { lv: rpg.lv, exp: rpg.exp, kills: rpg.kills, frames: rpg.frames, gold: W.score };
    const next = ngp() + 1;
    seen = {}; boss = {}; mini = {}; warp = {}; vessel = {}; relic = {}; crack = {};
    delete flag.curse; flag.ngp = next; // Szenen und Funde bleiben gesehen, der Fluch schlägt wieder zu
    save(); dropResume(); try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* privat */ }
    return keep;
  }
  function ngRestore(keep) { Object.assign(rpg, { lv: keep.lv, exp: keep.exp, kills: keep.kills, frames: keep.frames }); W.score = keep.gold; const p = W.player; applyHp(p); p.hp = p.maxHp; mp = mpMax(); }

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

  // Overlay (Select/Tab im Spiel): dieselbe Karte durchscheinend über dem laufenden Spiel, um den Helden zentriert
  let overlayOn = false;
  function toggleOverlay() { overlayOn = !overlayOn; Audio8.sfx('select'); }
  function draw(ctx, t, warpMode = false, overlay = false) {
    const w = View.w, cx = View.cx, L = castle(), sw = warpMode && trip.list[trip.sel], st = S()[sw ? sw.s : W.stage];
    if (!overlay) {
      ctx.fillStyle = 'rgba(2,4,18,0.97)'; ctx.fillRect(0, 0, w, 240);
      ctx.fillStyle = warpMode ? '#2c6cb0' : '#c89020';
      ctx.fillRect(6, 6, w - 12, 1); ctx.fillRect(6, 233, w - 12, 1); ctx.fillRect(6, 6, 1, 228); ctx.fillRect(w - 7, 6, 1, 228);
      Game.big(ctx, tr(warpMode ? 'warpTitle' : 'mapTitle'), cx, 12, 2, warpMode ? ['#fcfcfc', '#d8f0fc', '#a4e4fc', '#3cbcfc', '#0078f8', '#0040a8', '#001038'] : LOGO, null, '#000');
      Font.draw(ctx, tr(st.nameKey), cx, 32, '#f8b800', { align: 'center', shadow: '#000' });
      const sec = Game.sectionList().find(e => !e.head && e.s === (sw ? sw.s : W.stage) && e.r === (sw ? sw.r : W.roomIdx));
      if (sec) Font.draw(ctx, sec.label, cx, 42, '#8c9cc8', { align: 'center', shadow: '#000' });
    }

    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const r of L) { x0 = Math.min(x0, r.ax); y0 = Math.min(y0, r.ay); x1 = Math.max(x1, r.ax + r.cw); y1 = Math.max(y1, r.ay + r.ch); }
    const top = overlay ? 36 : 54, H = overlay ? 190 : warpMode ? 136 : 126, left = overlay ? 4 : 12, Wd = w - left * 2, gw = x1 - x0, gh = y1 - y0;
    const fit = clamp(Math.floor(Math.min(Wd / gw, H / gh)), 2, 12), cs = overlay ? 7 : view.zoom ? Math.max(8, fit * 2) : fit;
    let ox, oy;
    const hc = overlay && heroCell(), hr = overlay && roomAt(W.stage, W.roomIdx);
    if (hc && hr) { ox = Math.round(cx - (hr.ax + hc.x + 0.5) * cs); oy = Math.round(top + H / 2 - (hr.ay + hc.y + 0.5) * cs); } // Overlay: Held in der Mitte
    else if (view.zoom) { ox = Math.round(cx - (view.x + 0.5) * cs); oy = Math.round(top + H / 2 - (view.y + 0.5) * cs); }
    else { ox = Math.round(cx - (gw * cs) / 2) - x0 * cs; oy = Math.round(top + (H - gh * cs) / 2) - y0 * cs; }
    ctx.save(); ctx.beginPath(); ctx.rect(left, top - 2, Wd, H + 4); ctx.clip();
    if (overlay) { ctx.fillStyle = 'rgba(2,4,18,0.35)'; ctx.fillRect(left, top - 2, Wd, H + 4); ctx.globalAlpha = 0.78; } // Spiel scheint durch
    else {
      ctx.fillStyle = 'rgba(70,90,170,0.35)';
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) ctx.fillRect(ox + x * cs, oy + y * cs, 1, 1);
    }

    const vis = (key, i) => !!(seen[key] && seen[key].has(i));
    if (inv.map) for (const r of L) for (let y = 0; y < r.ch; y++) for (let x = 0; x < r.cw; x++) { // Schlosskarte: unbetretene Räume grau
      if (vis(r.key, y * r.cw + x)) continue;
      const px = ox + (r.ax + x) * cs, py = oy + (r.ay + y) * cs;
      ctx.fillStyle = '#262a40'; ctx.fillRect(px, py, cs, cs);
      if (cs < 4) continue;
      ctx.fillStyle = '#4c5070';
      if (x === 0) ctx.fillRect(px, py, 1, cs);
      if (x === r.cw - 1) ctx.fillRect(px + cs - 1, py, 1, cs);
      if (y === 0) ctx.fillRect(px, py, cs, 1);
      if (y === r.ch - 1) ctx.fillRect(px, py + cs - 1, cs, 1);
    }
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
        ctx.fillStyle = c.kind === 'save' ? '#d04858' : warp[c.key] ? '#7cdcfc' : '#5c6c8c';
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
    for (const who of WHO) { // Figuren mit neuer Szene: grüne Marke (sobald ihre Zelle aufgedeckt ist)
      const b = beatNow(who), a = b && !beatDone(b) && ref(b.at[0]), rr = a && roomAt(a.s, a.r);
      if (!rr) continue;
      const cc = placeCell(rr, { x: b.at[1], y: b.at[2] }), m = Math.max(2, Math.round(cs / 3));
      if (!vis(rr.key, cc.y * rr.cw + cc.x)) continue;
      ctx.fillStyle = '#58f898'; ctx.fillRect(ox + (rr.ax + cc.x) * cs + Math.floor((cs - m) / 2), oy + (rr.ay + cc.y) * cs + Math.floor((cs - m) / 2), m, m);
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
    const g = !warpMode && goal(), gc = g && goalCell(g);
    if (gc && (t >> 4) % 2 === 0) { // Wegweiser: Zielraum golden umrahmt (auch wenn er noch nicht betreten ist)
      const px = ox + gc.x * cs, py = oy + gc.y * cs, m = 2;
      ctx.strokeStyle = '#f8b800'; ctx.lineWidth = 1; ctx.strokeRect(px - m + 0.5, py - m + 0.5, cs + m * 2 - 1, cs + m * 2 - 1);
      ctx.strokeStyle = '#fce0a8'; ctx.strokeRect(px - m - 0.5, py - m - 0.5, cs + m * 2 + 1, cs + m * 2 + 1);
    }
    ctx.restore();
    if (overlay) { // Overlay: nur Erkundungsgrad und Hinweis am unteren Rand
      ctx.globalAlpha = 0.85;
      Font.draw(ctx, tr('mapExplored', percent(W.stage)) + '   ' + tr('mapCastle', percent()) + '   ' + tr('mapOverlayHelp'), cx, top + H - 6, '#d8dcf4', { align: 'center', shadow: '#000' });
      ctx.globalAlpha = 1;
      return;
    }
    if (!any) Font.draw(ctx, tr('mapNone'), cx, top + H / 2 - 4, '#7c84a8', { align: 'center' });

    let ly = top + H + 6;
    if (g) { // nächstes Ziel und wo es liegt
      Font.draw(ctx, tr('castleGoalLabel') + ': ' + goalText(g), cx, ly, '#f8b800', { align: 'center', shadow: '#000' });
      Font.draw(ctx, tr(g.where), cx, ly + 10, '#d0c0a0', { align: 'center', shadow: '#000' });
      ly += 21;
    }
    Font.draw(ctx, tr('mapExplored', percent(W.stage)) + '    ' + tr('mapCastle', percent()), cx, ly, '#fcfcfc', { align: 'center', shadow: '#000' });
    if (!g) { Font.draw(ctx, warpMode ? tr('warpCount', trip.sel + 1, trip.list.length) : tr('castleSealsShort', seals(), sealRooms().length), cx, ly + 10, warpMode ? '#7cdcfc' : '#c8a0fc', { align: 'center', shadow: '#000' }); ly += 10; }
    Font.draw(ctx, tr(warpMode ? 'mapHelpWarp' : view.zoom ? 'mapHelpZoom' : 'mapHelp'), cx, ly + 11, '#7c7c8c', { align: 'center' });
  }

  // ---------------- Testmodus: direkt zu Meilensteinen springen (Titel → TESTMODUS) ----------------
  // Jeder Meilenstein setzt Relikte, besiegte Bosse, Stufe, Gold und Ausrüstung so, wie man sie dort ungefähr hätte, und startet
  // im passenden Raum. Ältere Szenen gelten als gesehen (die aktuelle Szene je Figur spielt noch), Einzelstücke als gefunden,
  // Warpkammern der erreichten Regionen sind frei. Gespeichert wird in eigene Plätze (nachtmahr.test.*, die Adresse bekommt ?test,
  // damit auch ein wieder geöffneter Browser im Test weiterspielt); TESTMODUS BEENDEN lädt ohne ?test mit dem echten Spielstand.
  const MS_ITEMS = [[], ['tentling', 'potion'], ['batcard', 'leather', 'potion', 'potion'], ['silver', 'potion'],
    ['chain', 'heartamulet', 'book_spirit', 'map'], ['bloodrune', 'book_hellfire', 'elixir'], ['mirror', 'fairy', 'book_soulsteal', 'elixir', 'elixir'], ['dragonfang']];
  const MILESTONES = [ // at: Zielraum, lv, gold, relics, bosses (Regions-ids), name: [i18n-Schlüssel, Argument]
    { at: [0, 0], lv: 1, gold: 0, relics: [], bosses: [], name: ['msGate'] },
    { at: [0, 1], lv: 4, gold: 3000, relics: ['jump2'], bosses: [], name: ['msRelic', () => tr('relic_jump2')] },
    { at: [0, -1], lv: 7, gold: 6000, relics: ['jump2', 'dash'], bosses: [0], name: ['msBeaten', () => bossName(0)] },
    { at: [1, -1], lv: 11, gold: 9000, relics: ['jump2', 'dash', 'ring', 'wall'], bosses: [0, 1], name: ['msBeaten', () => bossName(1)] },
    { at: [2, -1], lv: 15, gold: 15000, relics: ['jump2', 'dash', 'ring', 'wall', 'breaker'], bosses: [0, 1, 2], name: ['msBeaten', () => bossName(2)] },
    { at: ['sun', -1], lv: 19, gold: 20000, relics: RELICS, bosses: [0, 1, 2, 'sun'], name: ['msBeaten', () => bossName('sun')] },
    { at: [0, 1], lv: 23, gold: 25000, relics: RELICS, bosses: [0, 1, 2, 'sun', 'expo'], name: ['msSeals'] },
    { at: [3, -1], lv: 28, gold: 30000, relics: RELICS, bosses: [0, 1, 2, 'sun', 'expo'], name: ['msBefore', () => bossName(3)] },
  ];
  const msName = (m) => tr(m.name[0], m.name[1] ? m.name[1]() : '');
  const msItems = (n) => MS_ITEMS.slice(0, n + 1).flat();
  function startTest(n) { // Zustand im Speicher setzen; Rückgabe: Zielraum für Game.newGame
    const m = MILESTONES[n];
    if (!testing) { // in die Test-Spielstände wechseln, ?test in die Adresse
      testing = true; setKeys();
      try { const u = new URL(location.href); u.searchParams.set('test', ''); history.replaceState(null, '', u.toString().replace(/=(?=&|$)/g, '')); } catch (e) { /* ohne History */ }
    }
    try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(RESUME_KEY); } catch (e) { /* privat */ }
    seen = {}; boss = {}; mini = {}; warp = {}; vessel = {}; relic = {}; crack = {}; flag = { curse: 1 }; inv = {}; eq = {}; famx = {}; best = {};
    for (const k of m.relics) relic[k] = 1;
    const reached = new Set(['arrival', 0, ...m.bosses, ref(m.at) && S()[ref(m.at).s].id]);
    for (const id of m.bosses) { const s = sIdx(id); if (s >= 0) boss[roomKey(s, mainCount(s) - 1)] = 1; }
    if (m.relics.includes('breaker')) for (const k of ['kanal', 'schatz', 'verlies']) crack[k] = 1;
    for (const id of msItems(n)) {
      inv[id] = (inv[id] || 0) + 1;
      const g = GEAR[id];
      if (g.slot) eq[g.slot] = id; // jeweils das zuletzt erreichte Teil anlegen
      if (FINDS.some(f => f[1] === id) || BOSS_LOOT.some(f => f[1] === id)) flag['find_' + id] = 1;
    }
    for (const c of allChambers()) if (c.kind === 'warp' && reached.has(S()[c.s].id)) warp[c.key] = 1;
    for (const who of WHO) { // ältere Szenen gesehen, die aktuelle bleibt
      const list = BEATS.filter(b => b.who === who && b.when());
      list.slice(0, -1).forEach(b => { flag['story_' + b.id] = 1; });
    }
    if (inv.tentling) flag.story_tent3 = 1; // der Neffe ist schon dabei
    save();
    const a = ref(m.at);
    return { s: a.s, r: a.r };
  }
  function finishTest(n) { // nach Game.newGame: Stufe, Gold, volle Energie
    const m = MILESTONES[n], p = W.player;
    Object.assign(rpg, { lv: m.lv, exp: expFor(m.lv), kills: 0, frames: 0 });
    W.score = m.gold; W.nextLife = (Math.floor(m.gold / 20000) + 1) * 20000;
    applyHp(p); p.hp = p.maxHp; mp = mpMax(); p.hearts = Math.max(p.hearts, 20);
    selfCheckLog(); // Testmodus: Selbsttest in die Konsole
  }
  function drawMilestones(ctx, t, sel) {
    const cx = View.cx, lx = cx - Math.min(140, View.w / 2 - 12), rx = cx + Math.min(140, View.w / 2 - 12);
    panel(ctx, tr('testMode'), '#58f898');
    MILESTONES.forEach((m, i) => {
      const y = 36 + i * 17, on = i === sel;
      if (on) { ctx.fillStyle = 'rgba(88,248,152,0.14)'; ctx.fillRect(lx - 4, y - 3, rx - lx + 8, 15); if ((t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, lx - 2, y); }
      Font.draw(ctx, msName(m), lx + 10, y, on ? '#fcfcfc' : '#a8a8b8', { shadow: '#000' });
      Font.draw(ctx, 'LV ' + m.lv, rx, y, on ? '#58f898' : '#5c7c6c', { align: 'right', shadow: '#000' });
      RELICS.forEach((k, j) => { ctx.fillStyle = m.relics.includes(k) ? RELIC_COL[k] : '#2c2838'; ctx.fillRect(lx + 10 + j * 7, y + 9, 5, 3); }); // Relikte
      ctx.fillStyle = '#c89020'; for (let j = 0; j < m.bosses.length; j++) ctx.fillRect(lx + 50 + j * 6, y + 9, 4, 3); // Siegel
    });
    const m = MILESTONES[sel], items = [...new Set(msItems(sel))].map(itemName).join(', ');
    wrap(items || '-', rx - lx).slice(0, 2).forEach((l, i) => Font.draw(ctx, l, cx, 176 + i * 10, '#fce0a8', { align: 'center', shadow: '#000' }));
    Font.draw(ctx, m.gold + ' G', cx, 198, '#f8b800', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('testNoSave'), cx, 210, '#fc7460', { align: 'center' });
    Font.draw(ctx, tr('testHelp'), cx, 222, '#7c7c8c', { align: 'center' });
  }

  // Test-Werkzeugkasten (Pause → TEST-WERKZEUGE, nur im Testmodus): ↑↓ wählt, Sprung führt aus, Start zurück
  const TOOLS = ['god', 'relics', 'lv', 'gold', 'warps', 'reveal', 'boss', 'milestones', 'ending', 'check'];
  const tools = { sel: 0, msg: '' };
  let god = false;
  if (on) { const hurt = Player.prototype.hurt; Player.prototype.hurt = function (...a) { return god ? false : hurt.apply(this, a); }; } // unverwundbar (Stürze zählen weiter)
  function toolsInput(P) { // 'back', 'milestones' oder null
    if (P.start) return 'back';
    const n = TOOLS.length;
    if (P.up || P.down) { tools.sel = (tools.sel + (P.down ? 1 : n - 1)) % n; Audio8.sfx('select'); }
    if (!(P.jump || P.attack)) return null;
    const id = TOOLS[tools.sel], p = W.player;
    Audio8.sfx('item');
    if (id === 'god') god = !god;
    else if (id === 'relics') { for (const k of RELICS) relic[k] = 1; save(); }
    else if (id === 'lv') { rpg.lv = Math.min(MAXLV, rpg.lv + 5); rpg.exp = expFor(rpg.lv); applyHp(p); p.hp = p.maxHp; mp = mpMax(); }
    else if (id === 'gold') W.score += 10000;
    else if (id === 'warps') { for (const c of allChambers()) if (c.kind === 'warp') warp[c.key] = 1; save(); }
    else if (id === 'reveal') { for (const r of castle()) { const set = seen[r.key] || (seen[r.key] = new Set()); for (let i = 0; i < r.cw * r.ch; i++) set.add(i); } save(); }
    else if (id === 'boss') {
      const b = W.ents.find(e => e.kind === 'boss');
      if (!b && !W.room.arena) { tools.msg = tr('toolNoBoss'); Audio8.sfx('wall'); return null; }
      W.ents = W.ents.filter(e => e.kind !== 'boss'); W.boss = null;
      if (!bossBeaten()) { tools.msg = tr('toolNoBoss'); return null; }
    }
    else if (id === 'milestones') return 'milestones';
    else if (id === 'ending') return 'ending'; // Ende im Schloss-Modus ansehen (Epilog, Ergebnis, Neues Spiel+)
    else if (id === 'check') { const r = selfCheckLog(); tools.msg = r.length ? tr('checkBad', r.length) : tr('checkOk'); return null; }
    tools.msg = tr('toolDone', tr('tool_' + id));
    return null;
  }
  function drawTools(ctx, t) {
    const cx = View.cx, lx = cx - Math.min(120, View.w / 2 - 16), rx = cx + Math.min(120, View.w / 2 - 16);
    panel(ctx, tr('testTools'), '#58f898');
    TOOLS.forEach((id, i) => {
      const y = 36 + i * 14, on = i === tools.sel;
      if (on) { ctx.fillStyle = 'rgba(88,248,152,0.14)'; ctx.fillRect(lx - 4, y - 3, rx - lx + 8, 13); if ((t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, lx - 2, y - 1); }
      Font.draw(ctx, tr('tool_' + id), lx + 10, y, on ? '#fcfcfc' : '#a8a8b8', { shadow: '#000' });
      if (id === 'god') Font.draw(ctx, tr(god ? 'on' : 'off'), rx, y, god ? '#58f898' : '#7c7c8c', { align: 'right', shadow: '#000' });
    });
    Font.draw(ctx, 'LV ' + rpg.lv + '   GOLD ' + W.score + '   ' + tr('castleRelicCount', RELICS.filter(k => relic[k]).length, RELICS.length), cx, 180, '#c8c8d8', { align: 'center', shadow: '#000' });
    if (tools.msg) Font.draw(ctx, tools.msg, cx, 196, '#58f898', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('testHelp'), cx, 222, '#7c7c8c', { align: 'center' });
  }
  // Selbsttest: Karte ohne Überlappung, Türen und Figuren auf Boden mit Platz darüber, Funde nicht in der Wand, alle Verbindungen
  // finden ihre Räume, alle Texte vorhanden. Im Testmodus beim Start eines Meilensteins und im Werkzeugkasten (Ergebnis in der Konsole)
  function selfCheck() {
    const out = [], used = new Map();
    for (const r of castle()) for (let y = 0; y < r.ch; y++) for (let x = 0; x < r.cw; x++) {
      const k = (r.ax + x) + ',' + (r.ay + y);
      if (used.has(k) && used.get(k) !== r.key) out.push('Karte: ' + r.key + ' überlappt ' + used.get(k));
      used.set(k, r.key);
    }
    const ground = (def, x, y) => x >= 0 && x < def.w && y >= 1 && y + 1 < def.h && SOLID.includes(def.grid[y + 1][x]) && !SOLID.includes(def.grid[y][x]) && !SOLID.includes(def.grid[y - 1][x]);
    S().forEach((st, s) => st.rooms.forEach((def, r) => {
      for (const d of doorsOf(s, r)) if (d.place && typeof d.place === 'object' && !(ground(def, d.place.x, d.place.y) && ground(def, d.place.x + 1, d.place.y))) out.push('Tür ohne Boden/Platz: ' + roomKey(s, r) + ' ' + d.place.x + ',' + d.place.y);
    }));
    for (const [A, , B] of LINKS) if (!ref(A) || !ref(B)) out.push('Verbindung ohne Raum: ' + JSON.stringify([A, B]));
    for (const b of BEATS) { const a = ref(b.at[0]); if (!a) out.push('Szene ohne Raum: ' + b.id); else if (!ground(S()[a.s].rooms[a.r], b.at[1], b.at[2])) out.push('Figur ohne Boden: ' + b.id); }
    for (const [R, id, x, y] of FINDS) { const a = ref(R); if (!a) out.push('Fund ohne Raum: ' + id); else if (SOLID.includes(S()[a.s].rooms[a.r].grid[y][x])) out.push('Fund in der Wand: ' + id); }
    const need = ['famSay_bat', 'famSay_fairy', 'famSay_tent', 'npcLib', 'equipTitle', 'shopTitle', 'spellTitle', 'testMode', 'mapOverlayHelp'];
    for (const id in GEAR) need.push('item_' + id, 'itemD_' + id);
    for (const b of BEATS) { if (b.lines !== false) need.push('story_' + b.id); need.push('story_' + (b.again || b.id) + 'Again'); }
    for (const id of SPELL_IDS) need.push('spell_' + id);
    for (const id of TOOLS) need.push('tool_' + id);
    for (const k of RELICS) need.push('relic_' + k, 'relicD_' + k);
    need.push('story_epilogue', 'endTitle', 'endNgPlus', 'endCredits', ...RANKS.map(([, r]) => 'endRank' + r));
    need.push('beastTitle', 'beastCount', 'beastUnknown', 'beastNew', 'shopBuy', 'shopSell', 'shopSold', 'shopNothing');
    for (const k of BEASTS) { need.push('beastD_' + k); if (!BEAST_BOSS[k]) need.push('beast_' + k); }
    for (const k of need) if (tr(k) === k) out.push('Text fehlt: ' + k);
    return out;
  }
  function selfCheckLog() {
    const r = selfCheck();
    if (r.length) console.warn('[NACHTMAHR] Selbsttest: ' + r.length + ' Probleme', r); else console.info('[NACHTMAHR] Selbsttest OK');
    return r;
  }

  // Fortsetzen: Held, Herzen, Spezialwaffe und Peitsche aus dem Spielstand übernehmen
  function applySave(p, sv) {
    if (typeof sv.hearts === 'number' && !Options.infHearts) p.hearts = sv.hearts;
    if (sv.sub) p.sub = sv.sub;
    if (typeof sv.whip === 'number' && !Options.maxWhip) p.whip = clamp(sv.whip, 1, 3);
    newRun();
    if (sv.lv >= 1) Object.assign(rpg, { lv: Math.min(MAXLV, sv.lv | 0), exp: sv.exp | 0, kills: sv.kills | 0, frames: sv.frames | 0 });
    applyHp(p); p.hp = sv.hp > 0 ? Math.min(p.maxHp, sv.hp) : p.maxHp; mp = typeof sv.mp === 'number' ? Math.min(mpMax(), sv.mp) : mpMax(); // Fortsetzungspunkt: Energie wie beim Verlassen
  }

  return {
    on, update, settle, forward, bossBeaten, draw, openMap, mapInput, openWarp, warpInput, layout, castle, percent, roomPercent, firstVisit, seals,
    bossDone: (s, r) => !!boss[roomKey(s, r)],
    hasSave: () => !!readSave(), loadSave: readSave, applySave, chambers: allChambers, writeResume, dropResume,
    newRun, drawStatus, expProgress, gainExp, get rpg() { return rpg; }, talkInput, drawTalk, get talk() { return talk; }, get flags() { return flag; },
    openEquip, equipInput, drawEquip, openShop, shopInput, drawShop, get inv() { return inv; }, get eq() { return eq; }, giveItem,
    preUpdate, statusInput, mpMax, get mp() { return mp; }, set mp(v) { mp = v; },
    startTest, finishTest, drawMilestones, milestones: MILESTONES.length, get testing() { return testing; },
    toolsInput, drawTools, selfCheck, get god() { return god; }, get best() { return best; },
    toggleOverlay, get overlay() { return overlayOn; },
    tier: (s) => (TIER[S()[s].id] || 1) + 2 * (flag.ngp || 0), side: SIDE, startEpilogue, resultsInput, drawResults, ngPlus, ngRestore, drawGoalBanner, drawGoalToast, announceGoal, inPrologue, goal: () => { const g = goal(); return g && { text: goalText(g), where: tr(g.where) }; }, get vessels() { return vessel; }, get relics() { return relic; }, get cracks() { return crack; }, has,
    get seen() { return seen; }, get warps() { return warp; },
    reset() { seen = {}; boss = {}; mini = {}; warp = {}; vessel = {}; relic = {}; crack = {}; flag = {}; inv = {}; eq = {}; famx = {}; best = {}; try { localStorage.removeItem(KEY); localStorage.removeItem(SAVE_KEY); localStorage.removeItem(RESUME_KEY); } catch (e) { /* privat */ } },
  };
})();
