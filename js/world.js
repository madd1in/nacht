// Spielwelt: Raum-Zustand, Entitäten, Kamera (horizontal + vertikal), Treffer-Logik, Rendering der Szene.
'use strict';

// Gewitter über dem ganzen Schloss: [Dunkelheit zwischen den Blitzen, Restdunkel im Blitz] (Hof und Schiff: Freiluft, ohne Abdunklung)
// Licht fürs 3D-Tor: warm von vorn links (Fackeln), dazu kühles Umgebungslicht
const DOOR_ENV = (() => { const v = [-0.35, 0.55, -0.75], l = Math.hypot(...v); return { static: true, sun: v.map(c => c / l), sunC: [0.85, 0.66, 0.46], amb: [0.36, 0.34, 0.44], sky: [0.16, 0.14, 0.22], fog: [0, 0, 0], fogD: 0 }; })();
const STORMY = { courtyard: null, ship: null, bridge: null, glass: [0.44, 0.12], foyer: [0.88, 0.02], library: [0.52, 0.08], hall: [0.5, 0.1], tower: [0.5, 0.1], throne: [0.46, 0.1] };
// Fenster in der Wandebene (x, Oberkante, Breite, Höhe): werfen im Blitz Lichtbahnen in den Raum
const STORM_WINS = { foyer: [[44, 20, 56, 216], [300, 20, 56, 216]], library: [[296, 24, 48, 98]], hall: [[64, 40, 32, 88], [320, 40, 32, 88]], throne: [[59, 24, 32, 108], [315, 24, 32, 108]] };
const W = {
  room: null, stage: 0, roomIdx: 0, ents: [], platforms: [], stairs: [], spawners: [],
  player: null, cam: { x: 0, y: 0 }, camYf: 0, frame: 0, atkId: 0,
  score: 0, lives: 3, time: 300, timeSub: 0, nextLife: 20000, lifeT: 0, bloodT: 0, stageFrames: 0, stats: { hits: 0, deaths: 0, combo: 0 }, sway: { a: 0, v: 0 }, zoomFx: null, bellCd: 0,
  camLock: false, camTarget: null, boss: null, arenaOn: false, arenaX: 0, arenaW: 0, arenaBoss: null, camEase: 0, miniDone: {},
  freeze: 0, hitstop: 0, shake: 0, flash: 0, cleared: false, lightning: 0, lightningCD: 300,
  checkpoint: null, crash: null, exiting: false, storm: { cd: 100, flash: 0, bolt: null },
  sail: 0, sailX: 0, roll: 0, rollAmp: 0, heave: 0, docked: 0, dockT: 0, rogue: null, kraken: null, gust: 0,
  combo: { n: 0, t: 0, best: 0 }, look: 0, cinema: 0, slowmo: 0, bossEnraged: false, vortexBg: 0,

  get stageDef() { return Levels.STAGES[this.stage]; },

  spawn(e) { this.ents.push(e); return e; },
  subCount() { return this.ents.filter(e => e.kind === 'sub' && !e.dead && !e.crash).length; },

  loadRoom(stage, roomIdx) {
    this.stage = stage; this.roomIdx = roomIdx;
    const def = Levels.STAGES[stage].rooms[roomIdx];
    this.room = { ...def, grid: def.grid.map(r => r.slice()) };
    this.ents = []; this.platforms = []; this.boss = null;
    this.camLock = false; this.camTarget = null; this.arenaOn = false; this.arenaX = 0; this.arenaW = 0; this.arenaBoss = null; this.camEase = 0;
    this.tutSign = null; this.cleared = false; this.crash = null; this.exiting = false; this.cinema = 0; this.slowmo = 0; this.bossEnraged = false; this.vortexBg = 0; this.stopT = 0;
    if (this.bloodT > 0) { this.bloodT = 0; Audio8.tempo(1); }
    this.sway = { a: 0, v: 0 }; this.zoomFx = null; this.bellCd = 200; this.tubeRot = 0; this.tubeRotS = 0;
    this.sail = def.dock || def.atSea ? 1 : 0; this.roll = 0; this.rollAmp = 0; this.heave = 0; this.docked = 0; this.dockT = 0; this.rogue = null; this.kraken = null; this.gust = 0;
    this.spawners = def.zones.map(z => new Spawner(z));
    const torch = def.theme === 'expo' ? 'gas' : def.theme === 'courtyard' || def.theme === 'forest';
    def.ents.forEach(d => {
      switch (d.type) {
        case 'candle': this.spawn(new Candle(d.x, d.y, d.drop, torch)); break;
        case 'bat': this.spawn(new Bat(d.x, d.y)); break;
        case 'skel': this.spawn(new Skeleton(d.x, d.y)); break;
        case 'knight': this.spawn(new Knight(d.x, d.y)); break;
        case 'panther': this.spawn(new Panther(d.x, d.y)); break;
        case 'fgear': this.platforms.push(this.spawn(new FlatGear(d))); break;
        case 'wgear': this.platforms.push(this.spawn(new WheelGear(d))); break;
        case 'gears': { // Räderwerk: hintere Räder zuerst, damit die Scheiben sie überdecken
          const list = buildGearTrain(d.list);
          [...list.filter(g => g.behind), ...list.filter(g => !g.behind)].forEach(g => this.platforms.push(this.spawn(g)));
          break;
        }
        case 'throne': this.spawn(new Throne(d)); break;
        case 'portrait': this.spawn(new Portrait(d)); break;
        case 'hint': this.spawn(new Hint(d)); break;
        case 'avalanche': this.spawn(new Avalanche(d)); break;
        case 'tut': this.spawn(new TutorialSign(d)); break;
        case 'crawl': this.spawn(new Crawl(d)); break;
        case 'tubecocoons': this.spawn(new TubeCocoons(d)); break;
        case 'bridgerun': this.spawn(new BridgeRun(d)); break;
        case 'waterfall': this.spawn(new Waterfall(d)); break;
        case 'cocoon': this.spawn(new Cocoon(d.x, d.y, d.inner)); break;
        case 'brazier': this.spawn(new Brazier(d)); break;
        case 'candelabra': this.spawn(new Candelabra(d)); break;
        case 'book': this.spawn(new FlyBook(d.x * T + 8, (d.y + 1) * T - 5, { rest: true })); break;
        case 'tome': this.spawn(new Tome(d.x, d.y)); break;
        case 'lectern': this.spawn(new Lectern(d)); break;
        case 'globe': this.spawn(new Globe(d)); break;
        case 'fchand': this.spawn(new FallingChandelier(d)); break;
        case 'ghostball': this.spawn(new GhostDance(d)); break;
        case 'coach': this.spawn(new GhostCoach(d)); break;
        case 'curtains': this.spawn(new BelfryCurtains(d)); break;
        case 'icicle': this.spawn(new FallingIcicle(d)); break;
        case 'armor': this.spawn(new ArmorSuit(d)); break;
        case 'pillar': this.spawn(new Pillar(d.x, d.y)); break;
        case 'raven': this.spawn(new Raven(d.x, d.y)); break;
        case 'ghost': this.spawn(new Ghost(d.x, d.y)); break;
        case 'ring': this.spawn(new Ring(d)); break;
        case 'statue': this.spawn(new Statue(d)); break;
        case 'chest': this.spawn(new Chest(d)); break;
        case 'cargo': this.spawn(new Cargo(d)); break;
        case 'gate': this.spawn(new Gatehouse(d)); break;
        case 'stake': this.spawn(new SkullStake(d)); break;
        case 'campfire': this.spawn(new Campfire(d)); break;
        case 'snapper': this.spawn(new Snapper(d.x, d.y)); break;
        case 'pitcher': this.spawn(new Pitcher(d.x, d.y)); break;
        case 'thirsty': { const pl = this.spawn(new ThirstyPlant(d)); pl.leaves.forEach(l => this.platforms.push(this.spawn(l))); break; }
        case 'limo': this.spawn(new LimoStand(d)); break;
        case 'scope': this.spawn(new Telescope(d)); break;
        case 'relic': this.spawn(new Relic(d)); break;
        case 'felltree': this.spawn(new FellTree(d)); break;
        case 'ambush': this.spawn(new Ambush(d)); break;
        case 'zip': this.spawn(new Zipline(d)); break;
        case 'sign': this.spawn(new ShipSign(d)); break;
        case 'grog': this.spawn(new Grog(d)); break;
        case 'chicken': this.spawn(new RubberChicken(d)); break;
        case 'monkey': this.spawn(new ThreeHeadedMonkey(d)); break;
        case 'platform': this.platforms.push(this.spawn(new Platform(d.x, d.x1, d.y))); break;
        case 'chandelier': this.platforms.push(this.spawn(new Chandelier(d))); break;
        case 'pendulum': this.spawn(new Pendulum(d)); break;
        case 'grand': this.platforms.push(this.spawn(new GrandChandelier(d))); break;
        case 'cog': { const c = new CogWheel(d); this.platforms.push(this.spawn(c)); c.ledges.forEach(l => this.platforms.push(this.spawn(l))); break; }
        case 'elevator': this.platforms.push(this.spawn(new Elevator(d))); break;
        case 'crumble': this.platforms.push(this.spawn(new Crumble(d))); break;
      }
    });
    this.stairs = this.findStairs();
    this.rings = this.ents.filter(e => e instanceof Ring);
    this.player.reset(def.start.x * T + 8, (def.start.y + 1) * T);
    this.snapCam();
    Tiles.build(def.theme);
    FX.resetAmbient();
  },

  snapCam() {
    const p = this.player, r = this.room;
    this.look = p.face * 10;
    this.cam.x = this.camXFor(p);
    this.camYf = clamp(p.feet - 136, 0, Math.max(0, r.h * T - View.fh));
    this.cam.y = Math.round(this.camYf);
  },

  // Räume schmaler als das Bild werden mittig gezeigt (Ränder als Mauer gezeichnet)
  camXFor(p) {
    const rw = this.room.w * T;
    if (this.room.wrap) return Math.round(p.cx + this.look - View.w / 2); // Turm: Kamera folgt frei, der Mantel dreht sich
    if (rw <= View.w) return -Math.floor((View.w - rw) / 2);
    return Math.round(clamp(p.cx + this.look - View.w / 2, 0, rw - View.w));
  },

  // Combo: Treffer in schneller Folge erhöhen den Punkte-Multiplikator
  comboHit() {
    const c = this.combo; c.n++; c.t = 150; c.best = Math.max(c.best, c.n); c.pop = 8;
    this.stats.combo = Math.max(this.stats.combo, c.n);
    const hype = [5, 15, 25, 40, 60].indexOf(c.n); // Arcade-Ansager bei Combo-Meilensteinen
    if (hype >= 0) Game.announce(hype);
    if (c.n === 10 || (c.n > 10 && c.n % 15 === 10)) { // Blutrausch: doppelter Schaden für 6 Sekunden
      const p = this.player; p.rageT = 360;
      this.popup(p.cx, p.y - 10, tr('rage'), '#fc3c3c'); Audio8.sfx('roar'); Input.rumble(0.6, 0.8, 300); this.shake = 8;
    }
  },
  comboMul() { return (1 + Math.min(3, Math.floor(this.combo.n / 5))) * (this.bloodT > 0 ? 2 : 1); }, // Blutmond: doppelte Punkte

  // Turmglocke schlägt: Turm schwankt, Staub rieselt von der Decke
  tollBell() {
    this.bellCd = 480 + Math.floor(rnd(0, 240));
    Audio8.sfx('bell'); Input.rumble(0.45, 0.3, 600); this.shake = Math.max(this.shake, 6);
    this.sway.v += (Math.random() < 0.5 ? -1 : 1) * 0.0045;
    for (let i = 0; i < 14; i++) this.spawn(new Particle(this.cam.x + rnd(0, View.w), this.cam.y + rnd(0, 24), rnd(-0.2, 0.2), rnd(0, 0.6), i % 2 ? '#7c7c7c' : '#bcbcbc', 90, 1, 0.05));
  },

  // SNES-Kamera: Drehung (Schwanken) und Zoom (Boss-Auftritt) des ganzen Spielfelds
  applyCamFx(ctx, vw) {
    const rot = this.sway.a + this.roll, zf = this.zoomFx;
    let z = 1, px = vw / 2, py = 104;
    if (zf) {
      z = 1 + zf.amp * Math.sin(Math.min(1, zf.t / zf.len) * Math.PI);
      if (zf.b) { px = clamp(zf.b.cx - this.cam.x, 40, vw - 40); py = clamp(zf.b.cy - this.cam.y, 40, 168); }
    }
    const heave = this.heave || 0;
    if (!rot && z === 1 && !heave) return;
    let cover = 1 + Math.abs(rot) * (vw / 208 + 0.3), hx = 0; // leicht vergrößern, damit keine Ecken frei werden
    if (this.room.theme === 'ship') {
      // Mode-7-Affintransformation: Rollen um einen Punkt an der Wasserlinie (oben im Mast schwankt das Bild weiter),
      // dazu Stampfen; die Vergrößerung richtet sich nach dem Ausschlag, nicht nach dem Augenblick – sonst pumpt das Bild
      hx = -Math.sin(this.roll) * clamp(this.room.h * T - this.cam.y - 104, 0, 380) * 0.3;
      cover = 1 + (this.rollAmp * 1.2 + Math.abs(this.sway.a)) * (vw / 208 + 0.3) + (this.rollAmp * 380 * 0.3 * 2) / vw + Math.abs(heave) * 2 / 208;
    }
    ctx.translate(px + hx, py + heave); ctx.rotate(rot); ctx.scale(z * cover, z * cover); ctx.translate(-px, -py);
  },

  // Schiff: Rollen im Seegang, Fahrt (Meer und Wolken ziehen vorbei), Gischt, Knarzen.
  // Am Bug: „Land in Sicht!" – das Schiff bremst, kracht an die Mole, die Laufplanke fällt.
  updateShip() {
    const d = this.room.dock, p = this.player;
    this.sailX += 0.55 * this.sail;
    const k = 0.2 + 0.8 * this.sail; // auf See stark, im Hafen ruhig
    this.rollAmp = 0.03 * k;
    this.roll = Math.sin(this.frame * 0.0166) * this.rollAmp + Math.sin(this.frame * 0.041 + 1) * this.rollAmp * 0.2;
    this.heave = Math.sin(this.frame * 0.0332 + 0.6) * 3.5 * k; // Stampfen: das Bild hebt und senkt sich
    if (d && !this.docked && p.alive && p.cx > d.x * T && !this.miniPending()) { this.docked = 1; this.dockT = 0; Game.shout('landHo'); Audio8.sfx('bell'); }
    if (this.docked) {
      this.dockT++;
      this.sail = Math.max(0, 1 - this.dockT / 80);
      if (this.dockT === 80) { // Aufprall an der Mole
        this.shake = 20; this.sway.v += 0.005; this.zoomFx = { t: 0, len: 40, amp: 0.05, b: null };
        Audio8.sfx('boom'); Audio8.sfx('wall'); Input.rumble(0.8, 0.6, 500);
        for (let x = d.x0 - 1; x <= d.x1 + 1; x += 2) this.dust(x * T + 8, (d.row + 1) * T, 2);
      }
      if (this.dockT === 106) { // Laufplanke
        for (let x = d.x0; x <= d.x1; x++) { this.room.grid[d.row][x] = '='; this.dust(x * T + 8, d.row * T, 3); }
        this.shake = Math.max(this.shake, 6); Audio8.sfx('door');
      }
    }
    if (this.frame % 89 === 0 && this.sail > 0.2) { // Gischt schlägt am Rumpf hoch (ohne Ton – sonst zu oft)
      const x = this.cam.x + 20 + Math.random() * (View.w - 40), y = this.room.h * T - 6;
      for (let i = 0; i < 8; i++) this.spawn(new Particle(x + rnd(-8, 8), y, rnd(-1, 1), rnd(-4.2, -1.8), i % 2 ? '#a4b4e4' : '#5c6cb0', 36, 2, 0.2));
    }
    if (Math.random() < 0.0025) Audio8.sfx('creak');
    if (this.gust > 0.01) this.gust *= 0.975; else this.gust = 0; // Böe: Segel reißen kurz weiter auf
    if (this.sail > 0.5 && Math.random() < 0.0028) { this.gust = 1; Audio8.sfx('whoosh'); }
    // Monsterwelle: baut sich am Horizont auf, rollt heran und bricht über die Reling
    // Riesenkrake: drei Fangarme tauchen hinter dem Schiff auf, peitschen und schlagen aufs Wasser
    const K = this.kraken || (this.kraken = { t: -1, cd: 300, arms: [], sw: 0 });
    const fight = !!(this.boss && this.boss.sea && !this.boss.dying); // Miniboss: der Krake selbst taucht hinter dem Schiff auf
    K.sw++;
    if (fight && (K.t < 0 || K.t > 330)) { K.t = 0; K.arms = [-1, 0, 1].map(k => ({ u: k * 30 + rnd(-6, 6), z: 52 + Math.random() * 22, len: 95 + Math.random() * 25, ph: Math.random() * 6 })); }
    if (K.t >= 0) {
      if (!(fight && K.t >= 200)) K.t++;
      if (K.t === 1) { Audio8.sfx('roar'); Input.rumble(0.4, 0.3, 400); if (!fight) Game.shout('kraken'); }
      if (K.t === 362) { this.shake = Math.max(this.shake, 10); Audio8.sfx('boom'); Audio8.sfx('splash'); this.sway.v += 0.003; }
      if (K.t > 430) { K.t = -1; K.cd = 1500 + Math.random() * 900; }
    } else if (this.sail > 0.6 && this.room.dock && p.alive && !(this.rogue && this.rogue.v > 0) && --K.cd <= 0) { // nicht im Tutorial
      K.t = 0; K.arms = [-1, 0, 1].map(k => ({ u: k * 34 + rnd(-8, 8), z: 70 + Math.random() * 40, len: 70 + Math.random() * 30, ph: Math.random() * 6 }));
    }
    const R = this.rogue || (this.rogue = { v: 0, cd: 900, warned: false });
    if (R.v > 0) {
      R.v -= 1.7;
      if (!R.warned && R.v < 260) { R.warned = true; Game.shout('rogueWave'); Audio8.sfx('thunder'); }
      if (R.v <= 24) { R.v = 0; R.cd = 1000 + Math.random() * 700; this.rogueHit(); }
    } else if (this.sail > 0.6 && this.room.dock && p.alive && K.t < 0 && --R.cd <= 0) { R.v = 430; R.warned = false; }
  },
  miniPending() { const M = this.room.mini; return !!M && !this.miniDone[this.stage + ':' + this.roomIdx]; },
  rogueHit() { // Schiff krängt, Gischt fegt übers Deck
    this.shake = 16; this.sway.v += (Math.random() < 0.5 ? -1 : 1) * 0.006; Input.rumble(0.9, 0.7, 600);
    Audio8.sfx('boom'); Audio8.sfx('splash');
    const deckY = (this.room.h - 2) * T;
    for (let i = 0; i < (View.lite ? 24 : 46); i++) this.spawn(new Particle(this.cam.x + Math.random() * View.w, deckY - Math.random() * 40, rnd(-2.6, -0.6), rnd(-5, -1.5), i % 3 ? '#a4b4e4' : '#fcfcfc', 50, 2, 0.18));
  },
  // Musik in Abschnitten: ein Raum mit eigenem Lied startet es, die folgenden Räume spielen es weiter (kein Wechsel bei jeder Tür)
  songName() {
    const rs = this.stageDef.rooms;
    for (let i = Math.min(this.roomIdx, rs.length - 1); i >= 0; i--) if (rs[i].music) return rs[i].music;
    return this.stageDef.music;
  },

  // Blutmond (rote Kerze): 12 s doppelte Punkte, mehr Herzen, rote Nacht, Musik zieht an
  bloodMoon(x, y) {
    this.bloodT = 720; this.flash = 10; this.shake = 12;
    this.spawn(new Shock(x, y, 140, '#d82800', 5)); this.spawn(new Shock(x, y, 90, '#fc3c3c', 4));
    this.popup(x, y - 12, tr('bloodMoon') + '!', '#fc3c3c');
    Audio8.sfx('roar', x); Audio8.sfx('bell'); Audio8.tempo(1.15); Input.rumble(0.7, 0.5, 600);
  },

  applyCheckpoint() {
    const c = this.checkpoint;
    if (!c || c.stage !== this.stage || c.room !== this.roomIdx) return;
    this.player.reset(c.cx, c.feet);
    for (const e of this.ents) if (e instanceof Statue && Math.abs(e.cx - c.cx) < 4) e.active = true;
    this.snapCam();
  },

  findStairs() {
    const g = this.room.grid, out = [];
    for (let r = 0; r < this.room.h; r++) for (let c = 0; c < this.room.w; c++) {
      const ch = g[r][c];
      if (ch !== '/' && ch !== '\\') continue;
      const dir = ch === '/' ? 1 : -1;
      const below = g[r + 1] && g[r + 1][c - dir];
      if (below === ch) continue; // keine Startzelle
      let n = 1;
      while (g[r - n] && g[r - n][c + n * dir] === ch) n++;
      out.push({
        dir, len: n * T, by: (r + 1) * T, ty: (r - n + 1) * T,
        bx: dir > 0 ? c * T : (c + 1) * T,
        tx: dir > 0 ? (c + n) * T : (c - n + 1) * T,
      });
    }
    return out;
  },

  // box: ein Rechteck oder eine Liste (Peitsche im Winkel = Kette kleiner Trefferzonen)
  whipAt(box, dmg, id) {
    const boxes = Array.isArray(box) ? box : [box];
    const hits = (r) => boxes.some(b => Phys.overlap(b, r));
    for (const e of this.ents) {
      if (e.dead) continue;
      if (e.kind === 'candle') { if (hits(e)) e.hit(); }
      else if (e.kind === 'enemy' || e.kind === 'boss') {
        if (e.kind === 'enemy' && e.rise !== undefined && e.rise < 12) continue;
        const vul = e.hurtBoxes ? e.hurtBoxes().some(hits) : hits(e.hurtBox ? e.hurtBox() : e);
        if (vul) { if (e.hit(dmg, id)) Input.rumble(0.15, 0.35, 60); }
        else if (e.armorBoxes) { const ab = e.armorBoxes().find(hits); if (ab) e.deflect(id, ab); } // Panzerung: prallt ab
      } else if (e.kind === 'eproj' && !e.reflected && !e.unstoppable && hits(e)) { // Konter: Geschosse zerschlagen bzw. zurückschleudern
        if (e.type === 'fire') {
          const p = this.player;
          e.reflected = true; e.vx = p.face * Math.max(2.6, Math.abs(e.vx) * 1.5); e.vy = -0.3; e.grav = 0;
          this.popup(e.cx, e.cy - 6, tr('riposte'), '#a4e4fc'); this.addScore(200); this.hitstop = Math.max(this.hitstop || 0, 4);
        } else { e.dead = true; this.addScore(50); }
        this.spawn(new Spark(e.cx, e.cy)); Audio8.sfx('hit', e.cx); Input.rumble(0.2, 0.4, 80);
      }
    }
    for (const b of boxes) {
      const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w) / T), y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h) / T);
      for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
        const ch = Phys.tile(cx, cy);
        if (ch === 'X' || ch === 'Y') this.breakTile(cx, cy, ch);
      }
    }
  },

  subHit(sub) {
    for (const e of this.ents) {
      if (e.dead || e === sub) continue;
      if (e.kind === 'candle') { if (Phys.overlap(sub, e)) e.hit(); continue; }
      if (e.kind !== 'enemy' && e.kind !== 'boss') continue;
      if (e.rise !== undefined && e.rise < 12) continue;
      if (!Phys.hitsEnt(sub, e)) {
        const ab = e.armorBoxes && e.armorBoxes().find(b => Phys.overlap(sub, b));
        if (ab) { const l = sub.hits.get(e); if (l === undefined || this.frame - l >= sub.cd) { sub.hits.set(e, this.frame); e.deflect(0, ab); if (sub.type === 'dagger') { sub.dead = true; return; } } }
        continue;
      }
      const last = sub.hits.get(e);
      if (last !== undefined && this.frame - last < sub.cd) continue;
      sub.hits.set(e, this.frame);
      if (e.hit(sub.dmg * Options.dmgMul, 0) && sub.type === 'dagger') { sub.dead = true; return; }
    }
  },

  breakTile(cx, cy, ch) {
    this.room.grid[cy][cx] = '.';
    Audio8.sfx('wall', cx * T + 8); Input.rumble(0.3, 0.3, 120);
    this.debris(cx * T + 8, cy * T + 8, '#7c7c7c', 8);
    this.spawn(new Item(ch === 'X' ? 'roast' : 'bagBig', cx * T + 8, cy * T + 8));
    this.shake = 6;
  },

  debris(x, y, color, n) {
    for (let i = 0; i < n; i++) this.spawn(new Particle(x, y, rnd(-1.6, 1.6), rnd(-3.5, -1), i % 2 ? color : '#bcbcbc', 45, i % 3 ? 2 : 3));
  },
  splash(x, y) {
    Audio8.sfx('splash', x);
    for (let i = 0; i < 10; i++) this.spawn(new Particle(x + rnd(-6, 6), y, rnd(-1.2, 1.2), rnd(-4, -1.5), i % 2 ? '#3cbcfc' : '#a4e4fc', 40, 2, 0.2));
  },
  popup(x, y, text, color) { this.spawn(new Popup(x, y - 4, text, color)); },
  puff(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2;
      this.spawn(new Particle(x + Math.cos(a) * 3, y - 1, Math.cos(a) * 1.2, Math.sin(a) * 0.35 + 0.15, i % 2 ? '#fcfcfc' : '#a4a4c8', 14, 1, 0));
    }
  },
  dust(x, y, n = 3) {
    for (let i = 0; i < n; i++) this.spawn(new Particle(x + rnd(-3, 3), y - 1, rnd(-0.6, 0.6), rnd(-0.6, -0.15), i % 2 ? '#8c7c6c' : '#c0b4a4', 14 + rnd(0, 8), 1, 0.02));
  },
  sparks(x, y, n = 7) {
    const cols = ['#f8b800', '#f87800', '#fce0a8'];
    for (let i = 0; i < n; i++) this.spawn(new Particle(x, y, rnd(-1.9, 1.9), rnd(-2.6, -0.4), cols[i % 3], 18 + (i % 3) * 6, 1, 0.12));
  },

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.popup(x, y, String(n));
    while (this.score >= this.nextLife) {
      this.lives++; this.nextLife += this.nextLife < 50000 ? 30000 : 50000;
      Audio8.sfx('oneUp'); this.lifeT = 110; // Extraleben: HUD-Zähler blinkt grün
      if (this.player) this.popup(this.player.cx, this.player.y - 14, '1UP', '#58f898');
    }
  },

  rosary() {
    this.flash = 18; Input.rumble(0.6, 0.6, 300);
    this.spawn(new Shock(this.player.cx, this.player.cy, 160, '#a4e4fc', 6));
    for (const e of this.ents) if (e.kind === 'enemy' && !e.dead && e.onScreen(0)) { e.hp = 0; e.kill(); }
    for (const e of this.ents) if (e.kind === 'eproj') e.dead = true;
  },

  // „Heiliger Sturm“: Massen-Variante der aktuellen Spezialwaffe
  startCrash(type) { this.crash = { type, t: 0 }; const p = this.player; this.spawn(new Shock(p.cx, p.cy, 110, '#f8b800', 5)); this.spawn(new Shock(p.cx, p.cy, 70, '#fcfcfc', 4)); },
  updateCrash() {
    const c = this.crash, p = this.player;
    c.t++;
    const mk = (type, x, y, f) => { const s = new SubWeapon(type, x, y, f); s.crash = true; s.dmg += 1; return this.spawn(s); };
    if (c.type === 'dagger' && c.t % 3 === 1 && c.t <= 46) { const k = (c.t - 1) / 3; mk('dagger', p.cx, p.cy - 10 + (k % 5) * 5, k % 2 ? 1 : -1); }
    if (c.type === 'axe' && c.t === 1) for (let i = 0; i < 8; i++) { const s = mk('axe', p.cx, p.cy - 6, i < 4 ? -1 : 1); s.vx = (i - 3.5) * 0.7; s.vy = -5.2 - (i % 2) * 0.9; }
    if (c.type === 'holy' && c.t === 1) for (let i = 0; i < 8; i++) { const s = mk('holy', p.cx, p.cy - 6, i < 4 ? -1 : 1); s.vx = (i - 3.5) * 0.85; s.vy = -2.6 - (i % 3) * 0.7; }
    if (c.type === 'cross' && (c.t === 1 || c.t === 14 || c.t === 28)) [-1, 1].forEach(f => { const s = mk('cross', p.cx, p.cy - 8 + (c.t % 3) * 4, f); s.vx = f * 4; });
    if (c.t > 60) this.crash = null;
  },

  // Stärke der HDMA-Wellenverzerrung (SNES-Effekt)
  waveAmp() {
    let a = 0; // Dauer-Welle im Strudel entfernt (störte das Springen und kostete mobil viel Leistung)
    if (this.slowmo > 0) a = Math.max(a, this.slowmo / 24);
    return a;
  },

  bossDefeated(b) {
    this.boss = null;
    Input.rumble(1, 1, 700);
    this.ents.forEach(e => { if (e.kind === 'enemy' || e.kind === 'eproj') e.dead = true; });
    if (b.mini) { // Miniboss: Kamera wieder frei, Beute statt Orb, weiter mit der Musik des Raums
      this.miniDone[this.stage + ':' + this.roomIdx] = true;
      this.camLock = false; this.arenaOn = false; this.arenaW = 0; this.camEase = 1; Game.bossName = 0;
      const x = this.arenaX + 40;
      ['roast', 'bagBig', 'heartB'].forEach((t, i) => this.spawn(new Item(t, x + i * 22, Tent.floorAt(x + i * 22) - 40)));
      Audio8.tempo(1); Audio8.play('fanfare', this.songName()); Game.note(b.nameKey + 'Note');
      return;
    }
    this.spawn(new Item('orb', clamp(b.cx, this.cam.x + 24, this.cam.x + View.w - 24), Math.min(b.cy, 140)));
  },

  // Turmaufstieg: der Raum ist der abgewickelte Turmmantel. Der Held bleibt im Umfang [0, C); jede Figur liegt auf der
  // Kopie, die ihm am nächsten ist – so stimmen Treffer, Verfolgung und Zeichnen auch über die Naht hinweg
  wrapAround() {
    const C = this.room.w * T, p = this.player;
    const sh = Math.floor(p.x / C) * C;
    if (sh) {
      p.x -= sh; this.cam.x -= sh;
      if (p.trail) for (const t of p.trail) t.x -= sh;
      if (p.scarf) for (const s of p.scarf) s.x -= sh;
    }
    for (const e of this.ents) {
      if (e.dead || e.noWrap) continue;
      const k = Math.round((p.cx - (e.x + e.w / 2)) / C);
      if (k) { e.x += k * C; if (e.x0 !== undefined && typeof e.x0 === 'number' && e.kind !== 'prop') e.x0 += k * C; }
    }
  },
  stageClear() { this.cleared = true; Game.startClear(); },
  playerDied() { Game.onPlayerDeath(); },

  updateCam() {
    const p = this.player, r = this.room, vw = View.w;
    const M = r.mini; // Miniboss mitten im Raum: ein Abschnitt wird zur Arena (Kontrollpunkt davor wird sicher gesetzt)
    if (M && !this.arenaOn && p.alive && p.cx > M.x * T && p.feet > M.minRow * T && !this.miniDone[this.stage + ':' + this.roomIdx]) {
      this.arenaOn = true; this.camLock = true; this.arenaBoss = M.boss;
      this.arenaX = M.x0 * T; this.arenaW = (M.x1 - M.x0) * T;
      this.camTarget = clamp(Math.round(this.arenaX + this.arenaW / 2 - vw / 2), 0, r.w * T - vw);
      this.ents.forEach(e => { if (e.kind === 'enemy') e.dead = true; });
      for (const e of this.ents) if (e instanceof Statue && !e.active && e.cx < this.arenaX) e.activate(true);
      Audio8.stop();
    }
    if (r.arena && !this.arenaOn && p.alive && p.cx > r.w * T - vw + 40) {
      this.arenaOn = true; this.camLock = true; this.arenaX = r.w * T - vw; this.arenaW = vw; this.camTarget = this.arenaX; this.arenaBoss = r.arena.boss;
      this.ents.forEach(e => { if (e.kind === 'enemy') e.dead = true; });
      Audio8.stop();
    }
    if (this.camTarget !== null) {
      const d = this.camTarget - this.cam.x;
      this.cam.x += clamp(d, -2, 2);
      if (Math.abs(d) < 0.5) {
        this.cam.x = this.camTarget; this.camTarget = null;
        this.boss = this.spawn(new BOSSES[this.arenaBoss](this.arenaX, this.arenaW));
        Audio8.play(this.boss.music || 'boss'); Audio8.sfx('roar'); Input.rumble(0.8, 0.5, 700);
        this.zoomFx = { t: 0, len: 84, amp: 0.16, b: this.boss }; // Kamera fährt auf den Boss zu
        this.cinema = 110; this.flash = 8; this.shake = 26;
        this.spawn(new Shock(this.boss.cx, this.boss.cy, 120, '#d82800', 5));
      }
    } else if (!this.camLock) {
      const want = Math.abs(p.vx) > 0.1 ? p.face * 28 : p.face * 10;
      this.look += (want - this.look) * 0.035;
      const cx = this.camXFor(p);
      if (this.camEase) { const d = cx - this.cam.x; this.cam.x += clamp(d, -3, 3); if (Math.abs(d) <= 3) this.camEase = 0; } // nach dem Miniboss weich zurück zum Helden
      else this.cam.x = cx;
    }
    const maxY = Math.max(0, r.h * T - View.fh);
    if (maxY > 0) {
      const ty = this.arenaOn && r.mini ? maxY : clamp(p.feet - 136, 0, maxY), d = ty - this.camYf; // Miniboss: Deck bleibt im Bild
      this.camYf += Math.abs(d) > 70 ? d * 0.25 : d * 0.12;
      this.cam.y = Math.round(this.camYf);
    } else { this.camYf = 0; this.cam.y = 0; }
  },

  update() {
    this.frame++;
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.shake > 0) this.shake--;
    if (this.flash > 0) this.flash--;
    if (this.lifeT > 0) this.lifeT--;
    if (this.freeze > 0) { this.freeze--; this.player.powerT = Math.max(this.player.powerT - 1, 0); return; }

    this.platforms.forEach(p => p.update());
    this.player.update();
    this.player.updateScarf();
    if (this.room.wrap) this.wrapAround();
    this.updateCam();
    FX.updateAmbient(this.room.theme, this.cam);
    if (this.stopT > 0) this.stopT--;
    if (this.bloodT > 0 && --this.bloodT === 0) Audio8.tempo(this.time <= 60 ? 1.12 : 1);
    if (this.room.bell && --this.bellCd <= 0) this.tollBell();
    if (this.room.theme === 'ship') this.updateShip();
    const sw = this.sway; // gedämpfte Pendelbewegung des Bildes
    if (sw.a || sw.v) { sw.v = (sw.v - sw.a * 0.012) * 0.985; sw.a += sw.v; if (Math.abs(sw.a) < 0.0004 && Math.abs(sw.v) < 0.0001) { sw.a = 0; sw.v = 0; } }
    if (this.zoomFx && ++this.zoomFx.t > this.zoomFx.len) this.zoomFx = null;
    if (this.player.rageT > 0) this.player.rageT--;
    const stopped = this.stopT > 0;
    if (!stopped) this.spawners.forEach(s => s.update());
    for (const e of this.ents) if (!e.dead && e.kind !== 'platform' && !(stopped && (e.kind === 'enemy' || e.kind === 'eproj'))) e.update();
    if (this.crash) this.updateCrash();
    if (this.cinema > 0) this.cinema--;
    if (this.bossEnraged && this.room.theme === 'throne') this.vortexBg++;
    if (this.combo.t > 0 && --this.combo.t === 0) this.combo.n = 0;
    if (this.combo.pop > 0) this.combo.pop--;
    const b = this.boss;
    if (b && !b.dying && !this.bossEnraged && b.hp <= b.maxHp / 2) { // Phase 2: Musik eskaliert
      this.bossEnraged = true; if (b.music === 'chapel' || b.music === 'count') Audio8.tempo(1.1); else { Audio8.stop(); Audio8.play('boss2'); } Audio8.sfx('roar'); // Graf: dasselbe Stück, nur schneller
      this.zoomFx = { t: 0, len: 46, amp: 0.1, b };
      if (this.room.theme === 'throne') Voice.say('taunt'); // der Graf spottet
      this.flash = 8; this.shake = 18; this.spawn(new Shock(b.cx, b.cy, 110, '#a80020', 5)); Input.rumble(0.7, 0.4, 500);
    }

    const p = this.player;
    if (p.alive) for (const e of this.ents) if (e.kind === 'item' && !e.dead && Phys.overlap(p, e)) e.collect(p);
    this.ents = this.ents.filter(e => !e.dead);

    const ex = this.room.exit;
    if (ex && p.alive && !this.exiting && p.cx >= ex.x0 * T && p.cx < (ex.x1 + 1) * T && p.feet > ex.y0 * T && p.feet <= (ex.y1 + 1) * T + 0.5) {
      this.exiting = true; Game.nextRoom();
    }

    if (this.room.theme === 'courtyard') FX.updateFlock(View.w);
    if (this.room.theme in STORMY) FX.updateStorm(this.storm, View.w, () => {
      setTimeout(() => Audio8.sfx('thunder'), 150 + Math.random() * 700);
      Input.rumble(0.35, 0.15, 450); this.shake = Math.max(this.shake, 4);
      if (this.room.theme === 'foyer' || this.room.bell) this.storm.cd = Math.min(this.storm.cd, 90 + Math.random() * 160); // in der Eingangshalle und im Glockenturm blitzt es öfter
    });
  },

  draw(ctx) {
    const sx = this.shake ? Math.round(rnd(-2, 2)) : 0, sy = this.shake ? Math.round(rnd(-1, 1)) : 0;
    const theme = this.room.theme, vw = View.w;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 32, vw, 208); ctx.clip();
    ctx.translate(sx, 32 + sy);
    this.applyCamFx(ctx, vw);
    const storm = theme in STORMY ? this.storm : null; // Gewitter über dem ganzen Schloss: Blitze lassen Fenster und Räume aufleuchten
    Tiles.drawBg(ctx, this.room, this.cam, this.frame, storm ? (c) => { FX.drawStormSky(c, storm, vw); if (theme === 'courtyard') FX.drawFlock(c); } : null,
      (c) => { for (const e of this.ents) if (e instanceof Portrait && !e.dead) e.drawBack(c); }); // Ahnenbilder hängen an der Wand, hinter den Säulen
    for (const e of this.ents) if (e.drawBack && !e.dead && !(e instanceof Portrait)) e.drawBack(ctx); // Kulissen vor den Kacheln (Thron mit Baldachin)
    const flashOn = storm && FX.stormOn(storm), dark = STORMY[theme];
    if (flashOn && dark && theme !== 'glass') this.drawCastShadows(ctx); // Blitz in dunklen Sälen: alles wirft harte Schlagschatten an die Wand
    if (!this.room.wrap) this.drawDoor(ctx);
    const bend = theme === 'glass'; // Glasturm von innen: Plattformen wölben sich zu den Rändern hin zum Betrachter
    if (bend) this.drawTilesBent(ctx); else Tiles.drawTiles(ctx, this.room, this.cam, this.frame);
    const order = ['prop', 'candle', 'platform', 'item', 'enemy', 'boss', 'sub', 'eproj', 'fx'];
    if (this.room.wrap) this.drawOnTower(ctx, order);
    else if (bend) this.drawBent(ctx, order);
    else order.forEach(k => { for (const e of this.ents) if (e.kind === k) e.draw(ctx); if (k === 'boss') this.player.draw(ctx, this.cam); });
    for (const e of this.ents) if (e.drawFront && !e.dead) e.drawFront(ctx); // Bauwerke, die vor dem Helden liegen (Torhaus beim Durchgehen)
    this.drawReflections(ctx, sx, sy);
    if ((theme === 'throne' || theme === 'gallery') && !View.lite) this.drawFloorMirror(ctx, sx, sy);
    FX.drawAmbient(ctx, this.cam);
    Tiles.drawFront(ctx, this.room, this.cam);
    FX.drawFog(ctx, theme, this.cam, this.frame, this.room.h * T - this.cam.y);
    if (theme === 'courtyard' || theme === 'ship' || theme === 'bridge') this.drawRain(ctx);
    if (flashOn) { this.drawStormShafts(ctx); ctx.fillStyle = `rgba(220,214,255,${dark ? 0.24 : 0.16})`; ctx.fillRect(0, 0, vw, 208); }
    const tl = (theme === 'cathedral' || theme === 'spire') && PS2.dayNight(this.frame); // Zeitraffer: nachts dunkel und blau, Kerzen leuchten
    FX.render(ctx, this.collectLights(), theme, theme === 'ballroom' ? Ball.amb() : dark ? (flashOn ? dark[1] : dark[0]) : tl ? 0.05 + tl.night * 0.5 : undefined, tl && tl.night > 0.2 ? '6,8,34' : undefined); // zwischen den Blitzen dunkel, im Blitz taghell
    Rays.draw(ctx, this.room, this.cam, this.frame);
    if (this.bloodT > 0) this.drawBloodMoon(ctx, vw);
    if (this.stopT > 0 && (this.stopT > 50 || (this.stopT & 4))) { ctx.fillStyle = 'rgba(120,150,230,0.16)'; ctx.fillRect(0, 0, vw, 208); } // angehaltene Zeit
    const p = this.player;
    if (p.alive && p.hp <= p.maxHp / 4) Drama.drawDanger(ctx, vw, 0.35 + Math.sin(this.frame * 0.14) * 0.2);
    if (this.flash > 0 && (this.flash % 6) < 3) { ctx.fillStyle = 'rgba(252,252,252,0.45)'; ctx.fillRect(-4, -4, vw + 8, 216); }
    ctx.restore();
  },

  // Turm: jede Figur wird an ihren Platz auf dem Zylinder gerückt (Kamera kurz verschoben); wer hinter dem Turm ist, bleibt unsichtbar
  drawOnTower(ctx, order) {
    const cam = this.cam, cx0 = cam.x, cy0 = cam.y, room = this.room, TW = PS2.Tower;
    const put = (e) => { // Bildposition auf dem Zylinder; Füße rücken mit der perspektivischen Stauchung zur Bildmitte
      const sx = TW.place(room, cam, e); if (sx === null) return false;
      const fy = e.y + e.h; cam.x = e.cx - sx; cam.y = fy - (TW.H0 + (fy - cy0 - TW.H0) * TW.k); return true;
    };
    order.forEach(k => {
      for (const e of this.ents) if (e.kind === k && put(e)) { e.draw(ctx); cam.x = cx0; cam.y = cy0; }
      if (k === 'boss') { const p = this.player; if (put(p)) { const c2 = { x: cam.x, y: cam.y }; cam.x = cx0; cam.y = cy0; p.draw(ctx, c2); } }
    });
    cam.x = cx0; cam.y = cy0;
  },
  // Umgekehrte Turmkrümmung (Innenansicht eines Zylinders): je weiter eine Bildspalte von der Mitte entfernt ist, desto näher
  // liegt die Wand – alles dort wird von der Augenhöhe weg gestreckt. Kacheln spaltenweise, Figuren mit gleicher Streckung.
  bendK(sx) { const r = View.w * 0.58, s = clamp((sx - View.w / 2) / r, -0.98, 0.98); return 1 + (1 - Math.sqrt(1 - s * s)) / 2.8; },
  drawTilesBent(ctx) {
    const vw = View.w, H0 = 104;
    if (!this.bendC || this.bendC.width !== vw) { this.bendC = Sprites.canvas(vw, 208); this.bendX = this.bendC.getContext('2d'); }
    const bx = this.bendX; bx.clearRect(0, 0, vw, 208);
    Tiles.drawTiles(bx, this.room, this.cam, this.frame);
    const st = View.lite ? 4 : 2;
    for (let X = 0; X < vw; X += st) {
      const k = this.bendK(X + st / 2), s0 = H0 - H0 / k, s1 = H0 + (208 - H0) / k;
      ctx.drawImage(this.bendC, X, s0, st, s1 - s0, X, 0, st, 208);
    }
  },
  drawBent(ctx, order) {
    const cam = this.cam, cy0 = cam.y;
    const put = (e) => { const fy = e.y + e.h, k = this.bendK(e.cx - cam.x); cam.y = fy - (104 + (fy - cy0 - 104) * k); };
    order.forEach(k => {
      for (const e of this.ents) if (e.kind === k) { put(e); e.draw(ctx); cam.y = cy0; }
      if (k === 'boss') { const p = this.player; put(p); const c2 = { x: cam.x, y: cam.y }; cam.y = cy0; p.draw(ctx, c2); }
    });
    cam.y = cy0;
  },
  stormWindows() { // sichtbare Fenster der Wandebene in Bildkoordinaten (Wand mit Parallaxe 0.5, senkrecht gekachelt)
    const wins = STORM_WINS[this.room.theme], L = wins && Tiles.layer(this.room.theme, 'wall'), out = [];
    if (!L) return out;
    const cam = this.cam, Hc = L.c.height, off = ((Math.floor(cam.x * 0.5) % 512) + 512) % 512;
    const oy = L.vtile && this.room.h > 13 ? ((Math.floor(cam.y * 0.5) % Hc) + Hc) % Hc : 0;
    for (const [wx, wy, ww, wh] of wins) for (let k = -1; k <= Math.ceil(View.w / 512) + 1; k++) for (const ty of oy ? [-oy, Hc - oy] : [0]) {
      const x = wx - off + k * 512, y = wy + ty;
      if (x > View.w || x + ww < -160 || y + wh < 0 || y > 208) continue; // nur Fenster, die man sieht
      out.push([x, y, ww, wh]);
    }
    return out;
  },
  // Blitz: jede Figur (Held, Gegner, Rüstungen, Kronleuchter, Kerzen) wirft einen harten, vergrößerten Schlagschatten
  // an die Wand – weg vom nächsten Fenster und nach oben, als stünde das Licht tief vorn (Stummfilm-Horror)
  drawCastShadows(ctx) {
    const w = View.w;
    if (!this.shC || this.shC.width !== w) this.shC = Sprites.canvas(w, 208);
    const c = this.shC, x = c.getContext('2d');
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1; x.clearRect(0, 0, w, 208);
    for (const k of ['prop', 'candle', 'enemy', 'boss']) for (const e of this.ents) if (e.kind === k && !e.dead) e.draw(x);
    if (this.player.alive) this.player.draw(x, this.cam);
    x.globalCompositeOperation = 'source-in'; x.fillStyle = '#04020a'; x.fillRect(0, 0, w, 208); x.globalCompositeOperation = 'source-over';
    const px = this.player.cx - this.cam.x;
    let lx = px - 150, best = 1e9;
    for (const [wx, , ww] of this.stormWindows()) { const d = Math.abs(wx + ww / 2 - px); if (d < best) { best = d; lx = wx + ww / 2; } }
    ctx.save(); ctx.globalAlpha = 0.74;
    ctx.translate(lx, 250); ctx.scale(1.45, 1.45); ctx.translate(-lx, -250);
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  },
  drawStormShafts(ctx) { // Blitz: die Fenster werfen helle Lichtbahnen schräg in den Raum (Mittelpfosten als Schatten)
    const rects = this.stormWindows();
    if (!rects.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const [x0, wy, ww, wh] of rects) {
      const y0 = wy + wh * 0.35, len = 240, sl = 0.5, half = (ww - 4) / 2;
      const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
      g.addColorStop(0, 'rgba(190,200,255,0.34)'); g.addColorStop(1, 'rgba(190,200,255,0)');
      ctx.fillStyle = g;
      for (const dx of [0, half + 4]) { ctx.beginPath(); ctx.moveTo(x0 + dx, y0); ctx.lineTo(x0 + dx + half, y0); ctx.lineTo(x0 + dx + half + len * sl, y0 + len); ctx.lineTo(x0 + dx + len * sl, y0 + len); ctx.closePath(); ctx.fill(); }
    }
    ctx.restore();
  },

  drawBloodMoon(ctx, vw) {
    const k = Math.min(1, this.bloodT / 60, (720 - this.bloodT) / 20); // ein-/ausblenden
    ctx.fillStyle = `rgba(150,0,24,${((0.19 + Math.sin(this.frame * 0.09) * 0.05) * k).toFixed(3)})`;
    ctx.fillRect(0, 0, vw, 208);
    if (this.bloodT > 120 || (this.frame & 8)) Font.draw(ctx, tr('bloodMoon') + ' X2  ' + Math.ceil(this.bloodT / 60), vw - 6, 4, '#fc3c3c', { align: 'right', shadow: '#000' }); // rechts: links steht der Combo-Zähler
  },

  // Gespiegelte, wellige Szene auf Wasseroberflächen
  // Thronsaal: polierter Boden – das Bild über der Bodenkante wird gespiegelt und schwach darunter gelegt (nur über festem Boden)
  drawFloorMirror(ctx, sx, sy) {
    const row = this.room.h - 2, fy = row * T - Math.round(this.cam.y), h = Math.min(30, 208 - fy);
    if (h < 4 || fy < 30) return;
    const cv = ctx.canvas, s = cv.width / View.w, g = this.room.grid;
    ctx.save();
    ctx.beginPath();
    const c0 = Math.max(0, Math.floor(this.cam.x / T)), c1 = Math.min(this.room.w - 1, c0 + Math.ceil(View.w / T) + 1);
    for (let c = c0; c <= c1; c++) if (g[row][c] === '#') ctx.rect(c * T - Math.round(this.cam.x), fy, T, h);
    ctx.clip();
    ctx.globalAlpha = 0.24; ctx.translate(0, fy * 2); ctx.scale(1, -1);
    ctx.drawImage(cv, 0, Math.round((32 + sy + fy - h) * s), Math.round(View.w * s), Math.round(h * s), -sx, fy - h, View.w, h);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(0, fy, View.w, h); ctx.clip();
    const gr = ctx.createLinearGradient(0, fy, 0, fy + h); gr.addColorStop(0, 'rgba(10,0,6,0)'); gr.addColorStop(1, 'rgba(10,0,6,0.5)');
    ctx.fillStyle = gr; ctx.fillRect(0, fy, View.w, h); ctx.restore();
  },
  drawReflections(ctx, sx, sy) {
    const r = this.room, g = r.grid;
    if (!r.grid.some(row => row.includes('~'))) return;
    const c0 = Math.max(0, Math.floor(this.cam.x / T)), c1 = Math.min(r.w - 1, c0 + Math.ceil(View.w / T) + 1);
    for (let row = 1; row < r.h; row++) {
      let run = -1;
      for (let cx = c0; cx <= c1 + 1; cx++) {
        const surf = cx <= c1 && g[row][cx] === '~' && g[row - 1][cx] !== '~';
        if (surf && run < 0) run = cx;
        if (!surf && run >= 0) { this.reflect(ctx, run, cx - 1, row, sx, sy); run = -1; }
      }
    }
  },
  reflect(ctx, a, b, row, sx, sy) {
    let X = a * T - this.cam.x, Wd = (b - a + 1) * T;
    const S = row * T - this.cam.y;
    if (S < 2 || S > View.fh) return;
    if (X < 0) { Wd += X; X = 0; }
    if (X + Wd > View.w) Wd = View.w - X;
    if (Wd <= 0) return;
    // Den gespiegelten Streifen EINMAL in einen Puffer kopieren und die 14 Wellenzeilen daraus zeichnen.
    // (Vorher zeichnete jede Zeile direkt aus der Leinwand auf sich selbst – der Browser kopierte dafür jedes Mal
    // die ganze Leinwand; das kostete in den Katakomben rund drei Viertel der Zeichenzeit.)
    const bandBot = 32 + sy + S, bandTop = Math.max(32, bandBot - 28), bandH = bandBot - bandTop;
    if (bandH <= 0) return;
    const rc = this.reflCanvas && this.reflCanvas.width >= Wd && this.reflCanvas.height >= bandH ? this.reflCanvas
      : (this.reflCanvas = Sprites.canvas(Math.max(Wd, 640), 32));
    const rx = rc.getContext('2d');
    rx.clearRect(0, 0, Wd, bandH);
    rx.drawImage(ctx.canvas, X + sx, bandTop, Wd, bandH, 0, 0, Wd, bandH);
    for (let i = 0; i < 28; i += 2) {
      const srcY = bandBot - 2 - i;
      if (srcY < bandTop || S + 2 + i > View.fh) break;
      const off = Math.round(Math.sin(this.frame * 0.09 + i * 0.6) * 1.5);
      ctx.globalAlpha = 0.32 * (1 - i / 28);
      ctx.drawImage(rc, 0, srcY - bandTop, Wd, 2, X + off, S + 2 + i, Wd, 2);
    }
    ctx.globalAlpha = 1;
  },

  collectLights() {
    const L = [], cx = this.cam.x, cy = this.cam.y, f = this.frame;
    const flick = (k) => Math.sin(f * 0.3 + k) * 1.5 + Math.sin(f * 0.13 + k * 2) * 1.5;
    const p = this.player;
    if (p.alive && !p.hidden) L.push({ x: p.cx - cx, y: p.cy - cy, r: p.chargeT >= 50 ? 60 : 46, c: p.chargeT >= 50 ? [248, 184, 0] : null, a: 0.4 });
    const darkRoom = (STORMY[this.room.theme] || [0])[0] > 0.6; // stockdunkle Säle: Gegner bekommen einen schwachen Schimmer
    for (const e of this.ents) {
      if (e.dead) continue;
      const x = e.cx - cx, y = e.cy - cy;
      if (x < -48 || x > View.w + 48 || y < -60 || y > 270) continue;
      if (darkRoom && e.kind === 'enemy') L.push({ x, y, r: 30, c: [150, 140, 230], a: 0.3 });
      if (e.lightUp) e.lightUp(L, cx, cy, flick); // Rastfeuer, Fund (eigener Name: „glow“ ist bei Kronleuchtern eine Zahl)
      else if (e instanceof Candle) L.push({ x, y: e.y - cy + 3, r: (e.torch ? 36 : 28) + (e.blood ? 10 + Math.sin(f * 0.15) * 4 : 0) + flick(e.x), c: e.blood ? [232, 24, 48] : [248, 140, 40], a: e.blood ? 0.65 : 0.5 });
      else if (e instanceof GrandChandelier) e.lights(L, cx, cy, flick);
      else if (e instanceof Gatehouse) e.lights(L, this.cam.x, this.cam.y, flick);
      else if (e instanceof FallingChandelier) e.lights(L, this.cam.x, this.cam.y, flick);
      else if (e instanceof Lectern || e instanceof Brazier || e instanceof Candelabra || e instanceof Waterfall) e.lights(L, cx, cy, flick);
      else if (e instanceof Tome && e.open) L.push({ x, y, r: 34, c: [232, 40, 80], a: 0.5 });
      else if (e instanceof Panther) L.push({ x: x + e.face * 11, y: y - 5, r: 22, c: [210, 230, 60], a: 0.5 }); // glühende Raubtieraugen
      else if (e instanceof Chandelier) L.push({ x, y: e.y - cy - 6, r: 42 + flick(e.px), c: [248, 160, 60], a: 0.55 });
      else if (e instanceof Statue && e.active) L.push({ x, y: y - 8, r: 30, c: [60, 188, 252], a: 0.45 });
      else if (e instanceof Chest && e.opened) L.push({ x, y, r: 20, c: [248, 184, 0], a: 0.4 });
      else if (e.kind === 'eproj' && e.type === 'fire') L.push({ x, y, r: 20, c: [248, 120, 0], a: 0.65 });
      else if (e.kind === 'sub' && e.type === 'holy' && e.burnT >= 0) L.push({ x, y, r: 30 + flick(1), c: [60, 188, 252], a: 0.55 });
      else if (e.kind === 'item' && e.type === 'orb') L.push({ x, y, r: 44, c: [60, 188, 252], a: 0.6 });
      else if (e instanceof Burst) L.push({ x, y, r: 28, c: [248, 120, 0], a: 0.75 });
      else if (e instanceof Skull) L.push({ x, y: y - 6, r: 20, c: [248, 120, 0], a: 0.4 });
      else if (e instanceof Ring) L.push({ x, y, r: 14, c: [248, 184, 0], a: 0.35 });
      else if (e instanceof Ghost && e.alpha > 0) L.push({ x, y, r: 24, c: [120, 180, 252], a: 0.35 * e.alpha });
      else if (e instanceof GiantBat && e.state !== 'sleep' && !e.dying) L.push({ x, y: y - 9, r: 22, c: [252, 40, 40], a: 0.55 });
      else if (e instanceof Count && !e.dying) L.push({ x, y: e.y + 8 - this.cam.y, r: e.state === 'open' ? 44 : 30, c: [150, 20, 70], a: e.state === 'open' ? 0.3 : 0.18 });
      else if (e instanceof Pillar && e.openT > 0) L.push({ x, y, r: 22, c: [248, 120, 0], a: 0.5 });
    }
    if (this.room.theme === 'foyer' || this.room.theme === 'library') for (const [wx, wy, ww, wh] of this.stormWindows()) { // Fenster schimmern im Mondlicht, auch zwischen den Blitzen
      for (let k = 0; k < 3; k++) L.push({ x: wx + ww / 2, y: wy + wh * (0.2 + k * 0.3), r: 50, c: [90, 100, 170], a: this.room.theme === 'foyer' ? 0.06 : 0.16 }); // Eingangshalle: fast nur der Blitz erhellt den Saal
    }
    for (const e of this.ents) if (e instanceof Portrait) e.lights(L); // Ahnenbilder hängen in der Wandebene
    if (this.room.theme === 'ship') Tiles.shipLights(L, this.cam);
    this.doorLights(L);
    if ((this.room.theme === 'courtyard' || this.room.theme === 'ship') && FX.stormOn(this.storm)) L.push({ x: View.w / 2, y: 40, r: 420 });
    return L;
  },

  // Ausgangstor in PS2-3D: Steinportal aus Quadern mit Keilsteinbogen und Wappen-Schlussstein, dahinter ein kurzer
  // Torweg mit warmem Licht von drinnen, hochgezogenes Fallgitter, nach innen geschwenkte Eichenflügel mit Eisenbändern
  // und zwei Fackelhalter. Perspektive wie bei den 3D-Kacheln (Auge 200 vor der Spielebene, Fluchtpunkt Bildmitte/60);
  // gerastert wird nur der Bildausschnitt ums Tor. Koordinaten: x zur Tormitte, y nach oben ab Schwelle, z in die Tiefe.
  doorMesh() {
    if (this.doorM) return this.doorM;
    const { mesh, box, beam, face, vtx, cone } = PS2, m = mesh();
    const ST = [146, 138, 158], ST2 = [112, 104, 126], STL = [184, 176, 198], OAK = [128, 74, 34], OAK2 = [100, 56, 26], IRON = [52, 52, 62], IRONL = [150, 150, 166];
    const GOLD = [240, 184, 40], RED = [176, 10, 36], WARM = [150, 76, 30], WARM2 = [96, 44, 20];
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) box(m, s * 19, i * 7.4, 7, 9 + (i % 2) * 1.6, 7.2, 28 + (i % 2) * 1.5, i % 2 ? ST2 : ST, { top: STL }); // Gewände aus Quadern, so tief wie der Torweg
    const wedge = (a0, a1, r0, r1, z0, z1, col) => { // Keilstein zwischen zwei Winkeln (Bogenmitte bei y = 44)
      const P = [];
      for (const [a, r] of [[a0, r0], [a1, r0], [a1, r1], [a0, r1]]) for (const z of [z0, z1]) P.push(vtx(m, Math.cos(a) * r, 44 + Math.sin(a) * r, z));
      const am = (a0 + a1) / 2, C = [Math.cos(am) * (r0 + r1) / 2, 44 + Math.sin(am) * (r0 + r1) / 2, (z0 + z1) / 2];
      for (const q of [[0, 2, 4, 6], [1, 3, 5, 7], [0, 1, 3, 2], [4, 5, 7, 6], [0, 6, 7, 1], [2, 3, 5, 4]]) face(m, q.map(k => P[k]), col, C);
    };
    for (let k = 0; k < 9; k++) {
      const a0 = k / 9 * Math.PI + 0.012, a1 = (k + 1) / 9 * Math.PI - 0.012;
      if (k === 4) wedge(a0 - 0.03, a1 + 0.03, 13.5, 25, -9, 21.5, STL); // Schlussstein, steht vor
      else wedge(a0, a1, 14, 22, -7, 21, k % 2 ? ST2 : ST);
    }
    box(m, 0, 60, -9.6, 6, 6.5, 1.2, RED); box(m, 0, 61.5, -10.4, 2.2, 3.5, 0.8, GOLD); // Wappen am Schlussstein
    // Torweg: Boden und die warm erleuchtete Rückwand in Bogenform (Gewände und Bogen umschließen ihn ganz – von oben
    // gesehen lugt so nichts hervor)
    face(m, [vtx(m, -14, 0.2, -7), vtx(m, 14, 0.2, -7), vtx(m, 14, 0.2, 21), vtx(m, -14, 0.2, 21)], WARM, [0, -10, 7], { e: 0.12 });
    { const pts = [vtx(m, -14, 0, 20.8), vtx(m, 14, 0, 20.8)]; for (let k = 0; k <= 8; k++) { const a = k / 8 * Math.PI; pts.push(vtx(m, Math.cos(a) * 14, 44 + Math.sin(a) * 14, 20.8)); }
      face(m, pts, [200, 110, 40], [0, 29, 40], { e: 0.38 }); }
    for (const s of [-1, 1]) face(m, [vtx(m, s * 13.9, 0, 18), vtx(m, s * 13.9, 0, 20.8), vtx(m, s * 13.9, 44, 20.8), vtx(m, s * 13.9, 44, 18)], WARM2, [s * 30, 22, 19]); // Schatten in den Ecken
    box(m, 0, 0, 0, 31, 1.6, 16, STL); // Schwelle
    // Fallgitter, hochgezogen: Stäbe nur innerhalb des Bogens, unten Spitzen
    for (let x = -12; x <= 12; x += 4) { const top = 44 + Math.sqrt(Math.max(0, 196 - x * x)) - 1; beam(m, x, 41, 2, x, top, 2, 1.5, 1.5, IRON, { open: true }); cone(m, x, 41, 2, 0.9, -2.6, 4, IRONL); }
    beam(m, -13.5, 45, 2, 13.5, 45, 2, 1.4, 1.4, IRON); beam(m, -13, 50, 2, 13, 50, 2, 1.2, 1.2, IRON);
    for (const s of [-1, 1]) { // Torflügel aus Eiche, um 65° nach innen geschwenkt, mit zwei Eisenbändern
      const th = 1.13, dx = s < 0 ? Math.cos(th) : -Math.cos(th), dz = Math.sin(th), cx = s * 14 + dx * 7, cz = 7 + dz * 7, rot = s < 0 ? th : Math.PI - th;
      box(m, cx, 0, cz, 14, 43, 2, s < 0 ? OAK : OAK2, { rot });
      for (const by of [9, 31]) box(m, cx, by, cz, 14.4, 2.2, 2.6, IRON, { rot });
    }
    for (const s of [-1, 1]) { // Fackelhalter: Arm aus der Wand, Kelch, Fackelstiel
      beam(m, s * 27, 31, 6, s * 27, 35, -3, 1.4, 1.4, IRON); cone(m, s * 27, 39, -3, 2.6, -4, 6, IRONL); beam(m, s * 27, 37, -3, s * 27.6, 43, -3, 1.6, 1.6, OAK2);
    }
    return (this.doorM = m);
  },
  doorProj(X, Y, x, y, z) { const VX = View.w / 2, k = 200 / (200 + z); return [VX + (X + x - this.cam.x - VX) * k, 60 + (Y - y - this.cam.y - 60) * k]; },
  drawDoor(ctx) {
    const d = this.room.door;
    if (!d) return;
    const X = d.x * T + 10, Y = d.base * T, sx = X - this.cam.x, sy = Y - this.cam.y; // Tormitte und Schwelle (Welt / Bild)
    if (sx > View.w + 70 || sx < -70 || sy > 300 || sy < -10) return;
    const dv = 1, BW = 132, BH = 108, bx = Math.round(sx) - BW / 2, by = Math.round(sy) - BH + 10, f = this.frame; // klein genug für volle Auflösung (scharf)
    let B = this.doorBuf;
    if (!B || B.c.width !== BW / dv) { B = this.doorBuf = { c: Sprites.canvas(BW / dv, BH / dv), key: null }; B.x = B.c.getContext('2d', { willReadFrequently: true }); }
    const key = bx + '|' + by + '|' + View.w;
    if (B.key !== key) { // nur neu rastern, wenn sich das Tor im Bild verschiebt
      B.key = key; B.x.clearRect(0, 0, B.c.width, B.c.height);
      const cam = { x: this.cam.x + View.w / 2 - X, y: Y - this.cam.y - 60, z: -200, yaw: 0, pitch: 0, f: 200 / dv, near: 30, cx: (View.w / 2 - bx) / dv, cy: (60 - by) / dv };
      PS2.render(B.x, B.c.width, B.c.height, [this.doorMesh()], cam, DOOR_ENV);
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, B.c.width, B.c.height, bx, by, BW, BH);
    ctx.globalCompositeOperation = 'lighter'; // warmes Licht aus dem Torweg
    const [lx, ly] = this.doorProj(X, Y, 0, 18, 30), a = 0.16 + Math.sin(f * 0.07) * 0.04, g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 26);
    g.addColorStop(0, `rgba(248,150,48,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(248,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(lx - 26, ly - 26, 52, 52);
    ctx.restore();
    [-1, 1].forEach((s, i) => { // flackernde Fackeln
      const [fx, fy] = this.doorProj(X, Y, s * 27.3, 44, -3), fl = Math.sin(f * 0.4 + i * 2) + Math.sin(f * 0.23 + i), x0 = Math.round(fx), y0 = Math.round(fy);
      ctx.fillStyle = '#d82800'; ctx.fillRect(x0 - 2, y0 - 6 + (fl > 0.8 ? 1 : 0), 5, 7);
      ctx.fillStyle = '#f87800'; ctx.fillRect(x0 - 1, y0 - 8 + (fl > 0 ? 1 : 0), 3, 8);
      ctx.fillStyle = '#fce0a8'; ctx.fillRect(x0, y0 - 4, 1, 3);
    });
  },
  doorLights(L) { // Fackelschein am Tor
    const d = this.room.door;
    if (!d) return;
    const X = d.x * T + 10, Y = d.base * T, sx = X - this.cam.x, sy = Y - this.cam.y;
    if (sx > View.w + 110 || sx < -110 || sy > 330 || sy < -60) return;
    const fl = Math.sin(this.frame * 0.3) * 2, [ax, ay] = this.doorProj(X, Y, -27.3, 41, -3), [bx, by] = this.doorProj(X, Y, 27.3, 41, -3);
    L.push({ x: ax, y: ay, r: 30 + fl, c: [248, 140, 40], a: 0.55 }, { x: bx, y: by, r: 30 - fl, c: [248, 140, 40], a: 0.55 });
  },

  drawRain(ctx) {
    const w = View.w, f = this.frame, gust = Math.sin(f * 0.011) * 0.9 + Math.sin(f * 0.037) * 0.4;
    ctx.fillStyle = 'rgba(130,130,196,0.38)'; // ferner Regen
    const n1 = Math.round(90 * w / 256 * (View.lite ? 0.6 : 1));
    for (let i = 0; i < n1; i++) {
      const x = ((i * 73 + Math.floor(f * (2.5 + gust * 1.5))) % (w + 60) + w + 60) % (w + 60) - 30, y = ((i * 131 + f * 7) % 240) - 20;
      ctx.fillRect(x, y, 1, 3);
    }
    ctx.fillStyle = 'rgba(190,190,245,0.6)'; // naher Schlagregen
    const n2 = Math.round(38 * w / 256 * (View.lite ? 0.6 : 1)), sl = 0.45 + gust * 0.35;
    for (let i = 0; i < n2; i++) {
      const x = ((i * 97 + Math.floor(f * (4 + gust * 3))) % (w + 80) + w + 80) % (w + 80) - 40, y = ((i * 53 + f * 11) % 250) - 30;
      for (let k = 0; k < 7; k++) ctx.fillRect(Math.round(x - k * sl), y + k, 1, 1);
    }
    ctx.fillStyle = 'rgba(200,200,250,0.7)'; // Spritzer am Boden
    const gy = 176 - this.cam.y;
    for (let i = 0; i < Math.round(12 * w / 256); i++) {
      const ph = (f + i * 5) % 10;
      if (ph > 3) continue;
      const x = ((i * 977 + Math.floor((f + i * 5) / 10) * 131) % w);
      if (Phys.tile(Math.floor((x + this.cam.x) / T), 11) !== '#') continue;
      if (ph < 2) { ctx.fillRect(x, gy - 1, 1, 1); ctx.fillRect(x - 1, gy - 2, 1, 1); ctx.fillRect(x + 1, gy - 2, 1, 1); }
      else { ctx.fillRect(x - 2, gy - 1, 1, 1); ctx.fillRect(x + 2, gy - 1, 1, 1); ctx.fillRect(x, gy - 3, 1, 1); }
    }
  },
};
