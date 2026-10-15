// Spielwelt: Raum-Zustand, Entitäten, Kamera (horizontal + vertikal), Treffer-Logik, Rendering der Szene.
'use strict';

const W = {
  room: null, stage: 0, roomIdx: 0, ents: [], platforms: [], stairs: [], spawners: [],
  player: null, cam: { x: 0, y: 0 }, camYf: 0, frame: 0, atkId: 0,
  score: 0, lives: 3, time: 300, timeSub: 0, nextLife: 20000, lifeT: 0, bloodT: 0, stageFrames: 0, stats: { hits: 0, deaths: 0, combo: 0 }, sway: { a: 0, v: 0 }, zoomFx: null, bellCd: 0,
  camLock: false, camTarget: null, boss: null, arenaOn: false, arenaX: 0, arenaW: 0,
  freeze: 0, hitstop: 0, shake: 0, flash: 0, cleared: false, lightning: 0, lightningCD: 300,
  checkpoint: null, crash: null, exiting: false, storm: { cd: 100, flash: 0, bolt: null },
  combo: { n: 0, t: 0, best: 0 }, look: 0, cinema: 0, slowmo: 0, bossEnraged: false, vortexBg: 0,

  get stageDef() { return Levels.STAGES[this.stage]; },

  spawn(e) { this.ents.push(e); return e; },
  subCount() { return this.ents.filter(e => e.kind === 'sub' && !e.dead && !e.crash).length; },

  loadRoom(stage, roomIdx) {
    this.stage = stage; this.roomIdx = roomIdx;
    const def = Levels.STAGES[stage].rooms[roomIdx];
    this.room = { ...def, grid: def.grid.map(r => r.slice()) };
    this.ents = []; this.platforms = []; this.boss = null;
    this.camLock = false; this.camTarget = null; this.arenaOn = false; this.arenaX = 0; this.arenaW = 0;
    this.cleared = false; this.crash = null; this.exiting = false; this.cinema = 0; this.slowmo = 0; this.bossEnraged = false; this.vortexBg = 0; this.stopT = 0;
    if (this.bloodT > 0) { this.bloodT = 0; Audio8.tempo(1); }
    this.sway = { a: 0, v: 0 }; this.zoomFx = null; this.bellCd = 200;
    this.spawners = def.zones.map(z => new Spawner(z));
    const torch = def.theme === 'courtyard';
    def.ents.forEach(d => {
      switch (d.type) {
        case 'candle': this.spawn(new Candle(d.x, d.y, d.drop, torch)); break;
        case 'bat': this.spawn(new Bat(d.x, d.y)); break;
        case 'skel': this.spawn(new Skeleton(d.x, d.y)); break;
        case 'knight': this.spawn(new Knight(d.x, d.y)); break;
        case 'pillar': this.spawn(new Pillar(d.x, d.y)); break;
        case 'raven': this.spawn(new Raven(d.x, d.y)); break;
        case 'ghost': this.spawn(new Ghost(d.x, d.y)); break;
        case 'ring': this.spawn(new Ring(d)); break;
        case 'statue': this.spawn(new Statue(d)); break;
        case 'chest': this.spawn(new Chest(d)); break;
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
    const rot = this.sway.a, zf = this.zoomFx;
    let z = 1, px = vw / 2, py = 104;
    if (zf) {
      z = 1 + zf.amp * Math.sin(Math.min(1, zf.t / zf.len) * Math.PI);
      if (zf.b) { px = clamp(zf.b.cx - this.cam.x, 40, vw - 40); py = clamp(zf.b.cy - this.cam.y, 40, 168); }
    }
    if (!rot && z === 1) return;
    const cover = 1 + Math.abs(rot) * (vw / 208 + 0.3); // leicht vergrößern, damit keine Ecken frei werden
    ctx.translate(px, py); ctx.rotate(rot); ctx.scale(z * cover, z * cover); ctx.translate(-px, -py);
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
        if (hits(e.hurtBox ? e.hurtBox() : e) && e.hit(dmg, id)) Input.rumble(0.15, 0.35, 60);
      } else if (e.kind === 'eproj' && !e.reflected && hits(e)) { // Konter: Geschosse zerschlagen bzw. zurückschleudern
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
      if (!Phys.overlap(sub, e.hurtBox ? e.hurtBox() : e)) continue;
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
    this.spawn(new Item('orb', clamp(b.cx, this.cam.x + 24, this.cam.x + View.w - 24), Math.min(b.cy, 140)));
  },

  stageClear() { this.cleared = true; Game.startClear(); },
  playerDied() { Game.onPlayerDeath(); },

  updateCam() {
    const p = this.player, r = this.room, vw = View.w;
    if (r.arena && !this.arenaOn && p.alive && p.cx > r.w * T - vw + 40) {
      this.arenaOn = true; this.camLock = true; this.arenaX = r.w * T - vw; this.arenaW = vw; this.camTarget = this.arenaX;
      this.ents.forEach(e => { if (e.kind === 'enemy') e.dead = true; });
      Audio8.stop();
    }
    if (this.camTarget !== null) {
      const d = this.camTarget - this.cam.x;
      this.cam.x += clamp(d, -2, 2);
      if (Math.abs(d) < 0.5) {
        this.cam.x = this.camTarget; this.camTarget = null;
        this.boss = this.spawn(new BOSSES[r.arena.boss](this.arenaX, this.arenaW));
        Audio8.play('boss'); Audio8.sfx('roar'); Input.rumble(0.8, 0.5, 700);
        this.zoomFx = { t: 0, len: 84, amp: 0.16, b: this.boss }; // Kamera fährt auf den Boss zu
        this.cinema = 110; this.flash = 8; this.shake = 26;
        this.spawn(new Shock(this.boss.cx, this.boss.cy, 120, '#d82800', 5));
      }
    } else if (!this.camLock) {
      const want = Math.abs(p.vx) > 0.1 ? p.face * 28 : p.face * 10;
      this.look += (want - this.look) * 0.035;
      this.cam.x = this.camXFor(p);
    }
    const maxY = Math.max(0, r.h * T - View.fh);
    if (maxY > 0) {
      const ty = clamp(p.feet - 136, 0, maxY), d = ty - this.camYf;
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
    this.updateCam();
    FX.updateAmbient(this.room.theme, this.cam);
    if (this.stopT > 0) this.stopT--;
    if (this.bloodT > 0 && --this.bloodT === 0) Audio8.tempo(this.time <= 60 ? 1.12 : 1);
    if (this.room.bell && --this.bellCd <= 0) this.tollBell();
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
      this.bossEnraged = true; Audio8.stop(); Audio8.play('boss2'); Audio8.sfx('roar');
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
    if (this.room.theme === 'courtyard') FX.updateStorm(this.storm, View.w, () => {
      setTimeout(() => Audio8.sfx('thunder'), 150 + Math.random() * 700);
      Input.rumble(0.35, 0.15, 450); this.shake = Math.max(this.shake, 4);
    });
  },

  draw(ctx) {
    const sx = this.shake ? Math.round(rnd(-2, 2)) : 0, sy = this.shake ? Math.round(rnd(-1, 1)) : 0;
    const theme = this.room.theme, vw = View.w;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 32, vw, 208); ctx.clip();
    ctx.translate(sx, 32 + sy);
    this.applyCamFx(ctx, vw);
    const storm = theme === 'courtyard' ? this.storm : null;
    Tiles.drawBg(ctx, this.room, this.cam, this.frame, storm ? (c) => { FX.drawStormSky(c, storm, vw); FX.drawFlock(c); } : null);
    this.drawDoor(ctx);
    Tiles.drawTiles(ctx, this.room, this.cam, this.frame);
    const order = ['prop', 'candle', 'platform', 'item', 'enemy', 'boss', 'sub', 'eproj', 'fx'];
    order.forEach(k => { for (const e of this.ents) if (e.kind === k) e.draw(ctx); if (k === 'boss') this.player.draw(ctx, this.cam); });
    this.drawReflections(ctx, sx, sy);
    FX.drawAmbient(ctx, this.cam);
    Tiles.drawFront(ctx, this.room, this.cam);
    FX.drawFog(ctx, theme, this.cam, this.frame, this.room.h * T - this.cam.y);
    if (theme === 'courtyard') this.drawRain(ctx);
    if (storm && FX.stormOn(storm)) { ctx.fillStyle = 'rgba(220,214,255,0.16)'; ctx.fillRect(0, 0, vw, 208); }
    FX.render(ctx, this.collectLights(), theme);
    Rays.draw(ctx, this.room, this.cam, this.frame);
    if (this.bloodT > 0) this.drawBloodMoon(ctx, vw);
    if (this.stopT > 0 && (this.stopT > 50 || (this.stopT & 4))) { ctx.fillStyle = 'rgba(120,150,230,0.16)'; ctx.fillRect(0, 0, vw, 208); } // angehaltene Zeit
    const p = this.player;
    if (p.alive && p.hp <= p.maxHp / 4) Drama.drawDanger(ctx, vw, 0.35 + Math.sin(this.frame * 0.14) * 0.2);
    if (this.flash > 0 && (this.flash % 6) < 3) { ctx.fillStyle = 'rgba(252,252,252,0.45)'; ctx.fillRect(-4, -4, vw + 8, 216); }
    ctx.restore();
  },

  drawBloodMoon(ctx, vw) {
    const k = Math.min(1, this.bloodT / 60, (720 - this.bloodT) / 20); // ein-/ausblenden
    ctx.fillStyle = `rgba(150,0,24,${((0.19 + Math.sin(this.frame * 0.09) * 0.05) * k).toFixed(3)})`;
    ctx.fillRect(0, 0, vw, 208);
    if (this.bloodT > 120 || (this.frame & 8)) Font.draw(ctx, tr('bloodMoon') + ' X2  ' + Math.ceil(this.bloodT / 60), vw - 6, 4, '#fc3c3c', { align: 'right', shadow: '#000' }); // rechts: links steht der Combo-Zähler
  },

  // Gespiegelte, wellige Szene auf Wasseroberflächen
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
    for (const e of this.ents) {
      if (e.dead) continue;
      const x = e.cx - cx, y = e.cy - cy;
      if (x < -48 || x > View.w + 48 || y < -60 || y > 270) continue;
      if (e instanceof Candle) L.push({ x, y: e.y - cy + 3, r: (e.torch ? 36 : 28) + (e.blood ? 10 + Math.sin(f * 0.15) * 4 : 0) + flick(e.x), c: e.blood ? [232, 24, 48] : [248, 140, 40], a: e.blood ? 0.65 : 0.5 });
      else if (e instanceof GrandChandelier) e.lights(L, cx, cy, flick);
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
      else if (e instanceof Count && e.state === 'open') L.push({ x, y: y - 6, r: 34, c: [168, 0, 32], a: 0.45 });
      else if (e instanceof Pillar && e.openT > 0) L.push({ x, y, r: 22, c: [248, 120, 0], a: 0.5 });
    }
    if (this.room.theme === 'courtyard' && FX.stormOn(this.storm)) L.push({ x: View.w / 2, y: 40, r: 420 });
    return L;
  },

  drawDoor(ctx) {
    const d = this.room.door;
    if (!d) return;
    const x = Math.round(d.x * T - 12 - this.cam.x), y = d.base * T - 64 - this.cam.y;
    if (x > View.w + 4 || x < -60 || y > 210 || y < -80) return;
    ctx.fillStyle = '#4c4c4c'; ctx.fillRect(x, y - 8, 44, 72);
    ctx.fillStyle = '#7c7c7c'; ctx.fillRect(x, y - 8, 44, 2); ctx.fillRect(x, y - 8, 2, 72);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 8, y + 8, 28, 56);
    for (let i = 0; i < 14; i++) { const w = Math.floor(Math.sqrt(196 - (14 - i) * (14 - i))); ctx.fillRect(x + 22 - w, y + 8 - (14 - i), w * 2, 1); }
    ctx.fillStyle = 'rgba(248,184,0,0.18)'; ctx.fillRect(x + 12, y + 30, 20, 34);
    ctx.fillStyle = '#a80020'; ctx.fillRect(x + 20, y - 4, 4, 4);
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
