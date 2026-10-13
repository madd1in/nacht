// Bosse: Riesenfledermaus, Knochenriese, Graf Nachtmahr.
'use strict';

class Boss extends Enemy {
  constructor(x, y, w, h, hp, dmg) {
    super(x, y, w, h, hp, dmg, 0);
    this.kind = 'boss'; this.maxHp = hp; this.invT = 0; this.dying = 0; this.state = 'intro'; this.timer = 0;
  }
  vulnerable() { return true; }
  hit(dmg, id) {
    if (this.dying || this.invT > 0 || !this.vulnerable()) return false;
    if (id && this.lastHit === id) return false;
    this.lastHit = id;
    this.hp -= dmg; this.flashT = 12; this.invT = 16;
    Audio8.sfx('bossHit');
    W.spawn(new Spark(this.cx + rnd(-4, 4), this.cy + rnd(-6, 6)));
    W.hitstop = 3;
    if (this.hp <= 0) { this.hp = 0; this.dying = 1; Audio8.stop(); W.addScore(this.score || 3000, this.cx, this.y); }
    return true;
  }
  tick() {
    this.t++; this.timer++;
    if (this.flashT > 0) this.flashT--;
    if (this.invT > 0) this.invT--;
  }
  updateDeath(len = 110) {
    this.dying++;
    if (this.dying % 7 === 0) {
      W.spawn(new Burst(this.x + rnd(0, this.w), this.y + rnd(0, this.h)));
      Audio8.sfx('explode');
    }
    if (this.dying % 20 === 0) W.shake = 10;
    if (this.dying >= len) { this.dead = true; W.bossDefeated(this); }
  }
  moveToward(tx, ty, speed) {
    const dx = tx - this.cx, dy = ty - this.cy, d = Math.hypot(dx, dy);
    if (d < speed) { this.x += dx; this.y += dy; return true; }
    this.x += dx / d * speed; this.y += dy / d * speed;
    return false;
  }
  aimFire(n, spread, speed) {
    const p = W.player;
    const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2, ang = a + k * spread;
      W.spawn(new EProj('fire', this.cx, this.cy, Math.cos(ang) * speed, Math.sin(ang) * speed, 0));
    }
    Audio8.sfx('fire');
  }
}

class GiantBat extends Boss {
  constructor(ax) {
    super(ax + 112, 36, 32, 14, 16, 3);
    this.ax = ax; this.state = 'sleep'; this.score = 3000;
  }
  pickHover() { this.tx = this.ax + rnd(40, 216); this.ty = rnd(40, 90); }
  update() {
    this.tick();
    if (this.dying) return this.updateDeath();
    const p = W.player, half = this.hp <= this.maxHp / 2;
    switch (this.state) {
      case 'sleep':
        if (this.timer > 70) { this.state = 'hover'; this.timer = 0; this.pickHover(); Audio8.sfx('bat'); }
        break;
      case 'hover':
        this.moveToward(this.tx, this.ty, 1.1);
        if (this.timer % 50 === 0) this.pickHover();
        if (this.timer > 80 + rnd(0, 40)) {
          this.timer = 0;
          if (half && Math.random() < 0.45) this.state = 'shoot';
          else { this.state = 'swoop'; this.tx = p.cx; this.ty = p.cy + 4; }
        }
        break;
      case 'swoop':
        if (this.moveToward(this.tx, this.ty, half ? 2.9 : 2.5) || this.timer > 100) {
          this.state = 'rise'; this.timer = 0;
          this.tx = clamp(this.cx + (p.cx < this.cx ? 70 : -70), this.ax + 30, this.ax + 226); this.ty = 40;
        }
        break;
      case 'rise':
        if (this.moveToward(this.tx, this.ty, 1.7) || this.timer > 90) { this.state = 'hover'; this.timer = 0; this.pickHover(); }
        break;
      case 'shoot':
        if (this.timer === 20) this.aimFire(3, 0.32, 1.6);
        if (this.timer > 45) { this.state = 'hover'; this.timer = 0; this.pickHover(); }
        break;
    }
    this.x = clamp(this.x, this.ax + 8, this.ax + 248 - this.w);
    this.y = clamp(this.y, 20, 180);
    if (this.state !== 'sleep') this.touch();
  }
  draw(ctx) {
    if (this.dying && (this.dying & 2)) return;
    const s = Sprites.S.gbat[this.state === 'sleep' ? 1 : Math.floor(this.t / (this.state === 'swoop' ? 5 : 8)) % 2];
    Sprites.draw(ctx, s, Math.round(this.cx - 24 - W.cam.x), Math.round(this.cy - 12 - W.cam.y), false, this.flash);
  }
}

class GiantSkeleton extends Boss {
  constructor(ax) {
    super(ax + 196, 176 - 44, 20, 44, 24, 4);
    this.ax = ax; this.state = 'rise'; this.face = -1; this.next = 'throw'; this.score = 4000;
  }
  update() {
    this.tick();
    if (this.dying) return this.updateDeath();
    const p = W.player, dx = p.cx - this.cx, half = this.hp <= this.maxHp / 2;
    if (this.state === 'rise') {
      if (this.timer % 6 === 0) W.shake = 4;
      if (this.timer > 60) { this.state = 'walk'; this.timer = 0; }
      return;
    }
    if (this.state === 'walk') {
      this.face = Math.sign(dx) || this.face;
      const ad = Math.abs(dx);
      this.vx = ad < 64 ? -this.face * 0.6 : ad > 120 ? this.face * 0.7 : 0;
      if (half) this.vx *= 1.4;
      if (this.timer > (half ? 60 : 90)) {
        this.timer = 0; this.state = this.next; this.next = this.next === 'throw' ? 'jump' : 'throw';
        if (this.state === 'jump') { this.vy = -5.6; this.vx = clamp(dx / 45, -2.4, 2.4); this.onGround = false; }
      }
    } else if (this.state === 'throw') {
      this.vx = 0;
      if (this.timer === 16) {
        const n = half ? 5 : 3;
        for (let i = 0; i < n; i++) W.spawn(new EProj('bone', this.cx, this.y + 4, this.face * (0.7 + i * 0.55), -4.4 - i * 0.25, 0.16));
        Audio8.sfx('throw');
      }
      if (this.timer > 34) { this.state = 'walk'; this.timer = 0; }
    } else if (this.state === 'jump') {
      if (this.onGround && this.timer > 5) {
        this.state = 'walk'; this.timer = 0; this.vx = 0;
        W.shake = 14; Audio8.sfx('wall');
        for (let i = 0; i < (half ? 3 : 2); i++) {
          W.spawn(new EProj('rock', this.ax + rnd(16, 240), W.cam.y - 8 - i * 30, 0, 0.5, 0.12));
        }
      }
    }
    this.physics();
    if (this.x < this.ax + 4) this.x = this.ax + 4;
    if (this.x + this.w > this.ax + 252) this.x = this.ax + 252 - this.w;
    this.touch();
  }
  draw(ctx) {
    if (this.dying && (this.dying & 2)) return;
    const G = Sprites.S.giant;
    if (this.state === 'rise') {
      const s = G[0], vis = Math.min(s.h, Math.floor(this.timer * 0.8));
      const sx = Math.round(this.cx - s.w / 2 - W.cam.x), gy = Math.round(this.y + this.h - W.cam.y);
      ctx.drawImage(this.face < 0 ? s.f : s.c, 0, 0, s.w, vis, sx, gy - vis, s.w, vis);
      return;
    }
    const s = this.state === 'throw' && this.timer < 22 ? G[2] : G[this.state === 'walk' && this.vx ? Math.floor(this.t / 12) % 2 : 0];
    this.spr(ctx, s, this.face < 0, 0, 0, this.flash);
  }
}

class Count extends Boss {
  constructor(ax) {
    super(ax + 176, 176 - 40, 16, 40, 30, 4);
    this.ax = ax; this.state = 'appear'; this.timer = 0; this.cycle = 0; this.score = 10000;
  }
  vulnerable() { return this.state === 'open'; }
  hurtBox() { return { x: this.x - 2, y: this.y, w: this.w + 4, h: 24 }; }
  update() {
    this.tick();
    if (this.dying) {
      if (this.dying === 1) W.flash = 20;
      return this.updateDeath(170);
    }
    const p = W.player, phase2 = this.hp <= this.maxHp / 2;
    switch (this.state) {
      case 'appear':
        if (this.timer === 1) Audio8.sfx('teleport');
        if (this.timer > 36) { this.state = 'closed'; this.timer = 0; }
        break;
      case 'closed':
        if (this.timer > (phase2 ? 14 : 22)) { this.state = 'open'; this.timer = 0; }
        break;
      case 'open':
        if (this.timer === 8) this.aimFire(phase2 ? 5 : 3, 0.26, phase2 ? 1.9 : 1.6);
        if (phase2 && this.timer === 30 && this.cycle % 2 === 1) this.summonBats();
        if (this.timer > (phase2 ? 58 : 72)) { this.state = 'vanish'; this.timer = 0; Audio8.sfx('teleport'); }
        break;
      case 'vanish':
        if (this.timer > 28) {
          let nx, tries = 0;
          do { nx = this.ax + rnd(24, 216); } while (Math.abs(nx + 8 - p.cx) < 64 && ++tries < 20);
          this.x = nx; this.state = 'appear'; this.timer = 0; this.cycle++;
        }
        break;
    }
    if (this.state === 'closed' || this.state === 'open') this.touch();
  }
  summonBats() {
    [-1, 1].forEach(side => {
      const b = new Bat(0, 0);
      b.x = side < 0 ? W.cam.x + 4 : W.cam.x + 242; b.y = 30;
      b.state = 'fly'; b.dir = -side; b.face = -side; b.baseY = 30; b.seen = true;
      W.spawn(b);
    });
  }
  draw(ctx) {
    if (this.dying && (this.dying & 2)) return;
    const C = Sprites.S.count;
    if ((this.state === 'appear' || this.state === 'vanish') && (this.t & 2)) return;
    const s = this.state === 'open' ? C.open : C.closed;
    Sprites.draw(ctx, s, Math.round(this.cx - 12 - W.cam.x), Math.round(this.y + this.h - 40 - W.cam.y), false, this.flash);
    if (this.state === 'open' && this.timer < 10) { // Augenblitz
      ctx.fillStyle = (this.t & 2) ? PAL.r : PAL.w;
      ctx.fillRect(Math.round(this.cx - 3 - W.cam.x), Math.round(this.y + 5 - W.cam.y), 1, 1);
      ctx.fillRect(Math.round(this.cx + 2 - W.cam.x), Math.round(this.y + 5 - W.cam.y), 1, 1);
    }
  }
}

const BOSSES = { gbat: GiantBat, giant: GiantSkeleton, count: Count };
