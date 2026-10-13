// Spielwelt: Raum-Zustand, Entitäten, Kamera, Treffer-Logik.
'use strict';

const W = {
  room: null, stage: 0, roomIdx: 0, ents: [], platforms: [], stairs: [], spawners: [],
  player: null, cam: { x: 0, y: 0 }, frame: 0, atkId: 0,
  score: 0, lives: 3, time: 300, timeSub: 0, nextLife: 20000,
  camLock: false, camTarget: null, boss: null, arenaOn: false,
  freeze: 0, hitstop: 0, shake: 0, flash: 0, cleared: false, lightning: 0, lightningCD: 300,

  get stageDef() { return Levels.STAGES[this.stage]; },

  spawn(e) { this.ents.push(e); return e; },
  subCount() { return this.ents.filter(e => e.kind === 'sub' && !e.dead).length; },

  loadRoom(stage, roomIdx) {
    this.stage = stage; this.roomIdx = roomIdx;
    const def = Levels.STAGES[stage].rooms[roomIdx];
    this.room = { ...def, grid: def.grid.map(r => r.slice()) };
    this.ents = []; this.platforms = []; this.boss = null;
    this.camLock = false; this.camTarget = null; this.arenaOn = false; this.cleared = false;
    this.spawners = def.zones.map(z => new Spawner(z));
    const torch = def.theme === 'courtyard';
    def.ents.forEach(d => {
      switch (d.type) {
        case 'candle': this.spawn(new Candle(d.x, d.y, d.drop, torch)); break;
        case 'bat': this.spawn(new Bat(d.x, d.y)); break;
        case 'skel': this.spawn(new Skeleton(d.x, d.y)); break;
        case 'knight': this.spawn(new Knight(d.x, d.y)); break;
        case 'pillar': this.spawn(new Pillar(d.x, d.y)); break;
        case 'platform': this.platforms.push(this.spawn(new Platform(d.x, d.x1, d.y))); break;
      }
    });
    this.stairs = this.findStairs();
    this.player.reset(def.start.x * T + 8, (def.start.y + 1) * T);
    this.cam.x = clamp(this.player.cx - 128, 0, this.room.w * T - 256); this.cam.y = 0;
    Tiles.build(def.theme);
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

  whipAt(box, dmg, id) {
    for (const e of this.ents) {
      if (e.dead) continue;
      if (e.kind === 'candle') { if (Phys.overlap(box, e)) e.hit(); }
      else if (e.kind === 'enemy' || e.kind === 'boss') {
        if (e.kind === 'enemy' && e.rise !== undefined && e.rise < 12) continue;
        if (Phys.overlap(box, e.hurtBox ? e.hurtBox() : e)) e.hit(dmg, id);
      } else if (e.kind === 'eproj' && e.type === 'fire' && Phys.overlap(box, e)) {
        e.dead = true; this.spawn(new Spark(e.cx, e.cy)); Audio8.sfx('hit');
      }
    }
    const x0 = Math.floor(box.x / T), x1 = Math.floor((box.x + box.w) / T);
    const y0 = Math.floor(box.y / T), y1 = Math.floor((box.y + box.h) / T);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const ch = Phys.tile(cx, cy);
      if (ch === 'X' || ch === 'Y') this.breakTile(cx, cy, ch);
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
      if (e.hit(sub.dmg, 0) && sub.type === 'dagger') { sub.dead = true; return; }
    }
  },

  breakTile(cx, cy, ch) {
    this.room.grid[cy][cx] = '.';
    Audio8.sfx('wall');
    this.debris(cx * T + 8, cy * T + 8, '#7c7c7c', 8);
    this.spawn(new Item(ch === 'X' ? 'roast' : 'bagBig', cx * T + 8, cy * T + 8));
    this.shake = 6;
  },

  debris(x, y, color, n) {
    for (let i = 0; i < n; i++) this.spawn(new Particle(x, y, rnd(-1.6, 1.6), rnd(-3.5, -1), i % 2 ? color : '#bcbcbc', 45, i % 3 ? 2 : 3));
  },
  splash(x, y) {
    Audio8.sfx('splash');
    for (let i = 0; i < 10; i++) this.spawn(new Particle(x + rnd(-6, 6), y, rnd(-1.2, 1.2), rnd(-4, -1.5), i % 2 ? '#3cbcfc' : '#a4e4fc', 40, 2, 0.2));
  },
  popup(x, y, text, color) { this.spawn(new Popup(x, y - 4, text, color)); },

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.popup(x, y, String(n));
    while (this.score >= this.nextLife) {
      this.lives++; this.nextLife += this.nextLife < 50000 ? 30000 : 50000;
      Audio8.sfx('oneUp');
    }
  },

  rosary() {
    this.flash = 18;
    for (const e of this.ents) if (e.kind === 'enemy' && !e.dead && e.onScreen(0)) { e.hp = 0; e.kill(); }
    for (const e of this.ents) if (e.kind === 'eproj') e.dead = true;
  },

  bossDefeated(b) {
    this.boss = null;
    this.ents.forEach(e => { if (e.kind === 'enemy' || e.kind === 'eproj') e.dead = true; });
    this.spawn(new Item('orb', clamp(b.cx, this.cam.x + 24, this.cam.x + 232), Math.min(b.cy, 140)));
  },

  stageClear() { this.cleared = true; Game.startClear(); },

  playerDied() { Game.onPlayerDeath(); },

  updateCam() {
    const p = this.player, r = this.room;
    if (r.arena && !this.arenaOn && p.cx > (r.arena.x0 + 2) * T && p.alive) {
      this.arenaOn = true; this.camLock = true; this.camTarget = r.arena.x0 * T;
      this.ents.forEach(e => { if (e.kind === 'enemy' && !e.onScreen(0)) e.dead = true; });
      Audio8.stop();
    }
    if (this.camTarget !== null) {
      const d = this.camTarget - this.cam.x;
      this.cam.x += clamp(d, -2, 2);
      if (Math.abs(d) < 0.5) {
        this.cam.x = this.camTarget; this.camTarget = null;
        this.boss = this.spawn(new BOSSES[r.arena.boss](r.arena.x0 * T));
        Audio8.play('boss');
      }
      return;
    }
    if (this.camLock) return;
    this.cam.x = clamp(p.cx - 128, 0, r.w * T - 256);
  },

  update() {
    this.frame++;
    if (this.hitstop > 0) { this.hitstop--; return; }
    if (this.shake > 0) this.shake--;
    if (this.flash > 0) this.flash--;
    if (this.freeze > 0) { this.freeze--; this.player.powerT = Math.max(this.player.powerT - 1, 0); return; }

    this.platforms.forEach(p => p.update());
    this.player.update();
    this.updateCam();
    this.spawners.forEach(s => s.update());
    for (const e of this.ents) if (!e.dead && e.kind !== 'platform') e.update();

    const p = this.player;
    if (p.alive) for (const e of this.ents) if (e.kind === 'item' && !e.dead && Phys.overlap(p, e)) e.collect(p);
    this.ents = this.ents.filter(e => !e.dead);

    if (this.room.exitX !== null && p.alive && p.cx > this.room.exitX * T) Game.nextRoom();

    if (this.room.theme === 'courtyard') {
      if (this.lightning > 0) this.lightning--;
      if (--this.lightningCD <= 0) { this.lightning = 8; this.lightningCD = 500 + rnd(0, 500); setTimeout(() => Audio8.sfx('thunder'), 250); }
    }
  },

  draw(ctx) {
    const sx = this.shake ? Math.round(rnd(-2, 2)) : 0, sy = this.shake ? Math.round(rnd(-1, 1)) : 0;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 32, 256, 208); ctx.clip();
    ctx.translate(sx, 32 + sy);
    Tiles.drawBg(ctx, this.room, this.cam);
    if (this.lightning > 0 && this.lightning % 4 < 2) { ctx.fillStyle = 'rgba(164,164,252,0.35)'; ctx.fillRect(0, 0, 256, 208); }
    this.drawDoor(ctx);
    Tiles.drawTiles(ctx, this.room, this.cam, this.frame);
    const order = ['candle', 'platform', 'item', 'enemy', 'boss', 'sub', 'eproj', 'fx'];
    order.forEach(k => { for (const e of this.ents) if (e.kind === k) e.draw(ctx); if (k === 'boss') this.player.draw(ctx, this.cam); });
    if (this.room.theme === 'courtyard') this.drawRain(ctx);
    if (this.flash > 0 && (this.flash % 6) < 3) { ctx.fillStyle = 'rgba(252,252,252,0.45)'; ctx.fillRect(-4, -4, 264, 216); }
    ctx.restore();
  },

  drawDoor(ctx) {
    if (this.room.exitX === null) return;
    const x = Math.round(this.room.exitX * T - 12 - this.cam.x), y = 176 - 64;
    if (x > 260 || x < -60) return;
    ctx.fillStyle = '#4c4c4c'; ctx.fillRect(x, y - 8, 44, 72);
    ctx.fillStyle = '#7c7c7c'; ctx.fillRect(x, y - 8, 44, 2); ctx.fillRect(x, y - 8, 2, 72);
    ctx.fillStyle = '#000'; ctx.fillRect(x + 8, y + 8, 28, 56);
    for (let i = 0; i < 14; i++) { const w = Math.floor(Math.sqrt(196 - (14 - i) * (14 - i))); ctx.fillRect(x + 22 - w, y + 8 - (14 - i) + 0, w * 2, 1); }
    ctx.fillStyle = '#a80020'; ctx.fillRect(x + 20, y - 4, 4, 4);
  },

  drawRain(ctx) {
    ctx.fillStyle = 'rgba(124,124,188,0.55)';
    for (let i = 0; i < 46; i++) {
      const x = ((i * 53 + this.frame * 3) % 300) - 22, y = ((i * 97 + this.frame * 6) % 230) - 16;
      ctx.fillRect(x, y, 1, 4); ctx.fillRect(x - 1, y + 4, 1, 3);
    }
  },
};
