// Schloss-Modus (nur mit ?castle – Plan in docs/SOTN-PLAN.md): aus den Kapiteln wird ein zusammenhängendes Schloss im Stil
// von Symphony of the Night. Die Kapitel sind Regionen, jeder Raum hat Türen in beide Richtungen (zurück durch den linken
// Rand, in Turmräumen mit ↑ an der Starttür), die Eingangshalle ist der Knoten: Kellertür in die Katakomben, Turmtür auf dem
// Sims zum Bergfried, Siegeltor auf der Galerie zum Thron. Hinter besiegten Bossen öffnen sich neue Wege; Bosse bleiben
// besiegt und geben je ein Siegel. Kein Zeitlimit.
// Karte: jeder Raum zerfällt in Zellen zu 16×13 Kacheln (etwa ein Bildschirm); betretene Zellen werden aufgedeckt und mit
// den Siegeln im localStorage gemerkt. Pause → KARTE zeigt das ganze Schloss (Angriff: Zoom, Pfeile: Scrollen).
'use strict';

const Castle = (() => {
  const on = /[?&]castle\b/.test(location.search);
  const CW = 16, CH = 13, KEY = 'nachtmahr.map';
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

  // ---------------- Spielstand: aufgedeckte Zellen, besiegte Bosse und Zwischengegner ----------------
  let seen = {}, boss = {}, mini = {}; // Raumschlüssel "<kapitel-id>:<raum>" → Set der Zellnummern / 1
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (d && d.v === 1) {
      for (const k in d.rooms) seen[k] = new Set(d.rooms[k]);
      boss = d.boss || {}; mini = d.mini || {};
    }
  } catch (e) { seen = {}; boss = {}; mini = {}; }
  function save() {
    try {
      const rooms = {};
      for (const k in seen) rooms[k] = [...seen[k]];
      localStorage.setItem(KEY, JSON.stringify({ v: 1, rooms, boss, mini }));
    } catch (e) { /* privater Modus: gilt nur für diese Sitzung */ }
  }

  const S = () => Levels.STAGES;
  const sIdx = (id) => S().findIndex(st => st.id === id);
  const roomKey = (s, r) => S()[s].id + ':' + r;
  const ref = ([id, r]) => { const s = sIdx(id); return s < 0 ? null : { s, r: r < 0 ? S()[s].rooms.length + r : r }; };
  const same = (a, s, r) => a && a.s === s && a.r === r;
  const dims = (def) => ({ cw: Math.ceil(def.w / CW), ch: Math.ceil(def.h / CH) });
  const cellX = (x, cw) => clamp(Math.floor(x / CW), 0, cw - 1);
  const cellY = (y, ch) => clamp(Math.floor(y / CH), 0, ch - 1);
  const floorRow = (def, col, from) => { for (let y = Math.max(0, from); y < def.h; y++) if (SOLID.includes(def.grid[y][col])) return y; return def.h - 1; };
  // Einbahn: vom Schiff (Prolog), vom Eisturm (Rutschpartie) und von der einstürzenden Brücke führt kein Weg zurück
  const oneWay = (def) => !!(def.atSea || def.dock || def.iceRamps || def.ents.some(e => e.type === 'bridgerun'));

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
      if (i > 0) {
        const p = out[i - 1], ax = p.gx + p.exit.x, ay = p.gy + p.exit.y, up = p.exit.dir === 'up';
        gx = up ? ax - sc.x : ax + 1 - sc.x; gy = up ? ay - 1 - sc.y : ay - sc.y;
        for (let n = 0; n < 64 && !fits(gx, gy, cw, ch); n++) { if (up) gy--; else gx++; }
        link = { ax, ay, bx: gx + sc.x, by: gy + sc.y, from: p.key, fromCell: p.exit.y * p.cw + p.exit.x, toCell: sc.y * cw + sc.x };
      }
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) used.add((gx + x) + ',' + (gy + y));
      const marks = [];
      def.ents.forEach(e => { if (e.type === 'statue') marks.push({ x: cellX(e.x, cw), y: cellY(e.y, ch), c: '#e83820' }); });
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
    if (r > 0 && !oneWay(rooms[r - 1])) out.push({ place: 'start', to: { s, r: r - 1, place: 'exit' } }); // zurück in den vorigen Raum
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
    if (r + 1 < S()[s].rooms.length) return { s, r: r + 1, place: 'start' };
    for (const [A, pa, B, pb] of LINKS) { const a = ref(A), b = ref(B); if (a && b && same(a, s, r) && pa === 'exit') return { s: b.s, r: b.r, place: pb }; }
    return null;
  }
  const sealRooms = () => { const out = []; S().forEach((st, s) => { if (s < S().length - 1) st.rooms.forEach((d, r) => { if (d.arena) out.push(roomKey(s, r)); }); }); return out; };
  const seals = () => sealRooms().filter(k => boss[k]).length;
  function gateOpen(d) {
    if (!d.gate) return true;
    if (d.gate.boss) return !!boss[roomKey(W.stage, W.roomIdx)];
    if (d.gate.seals) return seals() >= sealRooms().length;
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

  // nach jedem Raumaufbau (Tür, Kapitelstart, Wiedereinstieg nach dem Tod): Türen setzen, besiegte Bosse fernhalten,
  // bei Ankunft den Helden an die Tür stellen
  let guard = false, push = 0, lastX = 0, lockT = 0;
  function settle(arrive) {
    const s = W.stage, r = W.roomIdx, def = S()[s].rooms[r], key = roomKey(s, r);
    if (boss[key] && s < S().length - 1) W.room.arena = null; // Bossarena: Boss besiegt, der Raum ist frei
    if (mini[key]) W.miniDone[s + ':' + r] = true;
    W.ents = W.ents.filter(e => !(e instanceof CastleDoor));
    for (const d of doorsOf(s, r)) W.spawn(new CastleDoor(d, def));
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
    let dirty = false;
    const set = seen[key] || (seen[key] = new Set()), i = c.y * c.cw + c.x;
    if (!set.has(i)) { set.add(i); dirty = true; }
    if (W.miniDone[s + ':' + r] && !mini[key]) { mini[key] = 1; dirty = true; }
    if (dirty) save();
    if (guard && !inExit()) { guard = false; W.exiting = false; }
    if (lockT > 0) lockT--;
    const p = W.player, def = S()[s].rooms[r];
    if (!p.alive || p.state !== 'normal' || W.arenaOn) { push = 0; lastX = p.x; return; }
    const I = Input.held;
    for (const d of doorsOf(s, r)) {
      const k = kindOf(def, d.place);
      let use = false;
      if (k === 'up') { const u = upSpot(def, d.place); use = P.up && p.onGround && Math.abs(p.cx - u.cx) < 14 && Math.abs(p.feet - u.feet) < 8; }
      else if (k === 'edgeL') use = I.left && p.onGround && p.cx < (def.start.x + 1.5) * T && Math.abs(p.feet - (def.start.y + 1) * T) <= 2 * T && push >= 6;
      else use = I.right && p.onGround && p.cx > (def.w - 2.5) * T && push >= 6;
      if (!use) continue;
      if (!gateOpen(d)) { if (!lockT) { lockT = 90; if (d.gate.seals) Game.note('castleSeals', seals(), sealRooms().length); else Game.note('castleLocked'); Audio8.sfx('select'); } push = 0; break; }
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
    Game.bossName = 0; Audio8.tempo(1); Audio8.play('fanfare', W.songName()); Audio8.sfx('bigItem');
    Game.note('castleSeal', seals(), sealRooms().length);
    return true;
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

  function draw(ctx, t) {
    const w = View.w, cx = View.cx, L = castle(), st = S()[W.stage];
    ctx.fillStyle = 'rgba(2,4,18,0.97)'; ctx.fillRect(0, 0, w, 240);
    ctx.fillStyle = '#c89020';
    ctx.fillRect(6, 6, w - 12, 1); ctx.fillRect(6, 233, w - 12, 1); ctx.fillRect(6, 6, 1, 228); ctx.fillRect(w - 7, 6, 1, 228);
    Game.big(ctx, tr('mapTitle'), cx, 12, 2, LOGO, null, '#000');
    Font.draw(ctx, tr(st.nameKey), cx, 32, '#f8b800', { align: 'center', shadow: '#000' });
    const sec = Game.sectionList().find(e => !e.head && e.s === W.stage && e.r === W.roomIdx);
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
    ctx.restore();
    if (!any) Font.draw(ctx, tr('mapNone'), cx, top + H / 2 - 4, '#7c84a8', { align: 'center' });

    Font.draw(ctx, tr('mapExplored', percent(W.stage)) + '    ' + tr('mapCastle', percent()), cx, 202, '#fcfcfc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('castleSealsShort', seals(), sealRooms().length), cx, 212, '#c8a0fc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr(view.zoom ? 'mapHelpZoom' : 'mapHelp'), cx, 222, '#7c7c8c', { align: 'center' });
  }

  return {
    on, update, settle, forward, bossBeaten, draw, openMap, mapInput, layout, castle, percent, roomPercent, firstVisit, seals,
    bossDone: (s, r) => !!boss[roomKey(s, r)],
    get seen() { return seen; },
    reset() { seen = {}; boss = {}; mini = {}; try { localStorage.removeItem(KEY); } catch (e) { /* privat */ } },
  };
})();
