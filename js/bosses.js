// Bosse: Riesenfledermaus, Knochenriese, Graf Nachtmahr.
'use strict';

// ---------------- Riesenfledermaus: prozedurale Pixel-Art (72x44, symmetrisch) ----------------
(() => {
  const Wc = 72, Hc = 44;
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
  const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
  // Linker Flügel je Pose: Schulter S, Handgelenk W, Fingerspitzen F, Körperansatz B
  const POSES = {
    up: { S: [31, 16], W: [18, 4], F: [[2, 0], [4, 12], [14, 21]], B: [30, 26] },
    midU: { S: [31, 17], W: [15, 10], F: [[0, 6], [2, 20], [16, 27]], B: [30, 27] },
    down: { S: [31, 18], W: [16, 22], F: [[1, 31], [8, 39], [20, 35]], B: [30, 28] },
    midD: { S: [31, 17], W: [14, 14], F: [[0, 15], [4, 29], [17, 31]], B: [30, 27] },
    fold: { S: [31, 15], W: [27, 4], F: [[23, 11], [24, 25], [28, 33]], B: [31, 33] },
  };
  const inside = (poly, x, y) => {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const segDist = (px, py, [ax, ay], [bx, by]) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(px - ax - dx * t, py - ay - dy * t);
  };
  const toward = ([ax, ay], [bx, by], [tx, ty], k) => [(ax + bx) / 2 + (tx - (ax + bx) / 2) * k, (ay + by) / 2 + (ty - (ay + by) / 2) * k];

  function frame(poseName, open, sleep = false) {
    const P = POSES[poseName], pix = new Array(Wc * Hc).fill(null);
    const set = (x, y, c) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < Wc && y < Hc) { pix[y * Wc + x] = c; pix[y * Wc + (Wc - 1 - x)] = c; } };
    const get = (x, y) => (x >= 0 && y >= 0 && x < Wc && y < Hc) ? pix[y * Wc + x] : null;
    const [F1, F2, F3] = P.F;
    const poly = [P.S, P.W, F1, toward(F1, F2, P.W, 0.35), F2, toward(F2, F3, P.W, 0.35), F3, toward(F3, P.B, P.W, 0.25), P.B];
    const maxD = Math.max(...P.F.map(([x, y]) => Math.hypot(x - P.S[0], y - P.S[1])));
    for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc / 2; x++) {
      if (!inside(poly, x + 0.5, y + 0.5)) continue;
      const d = Math.hypot(x - P.S[0], y - P.S[1]) / maxD + (bay(x, y) - 0.5) * 0.18;
      let c = d > 0.72 ? '#7a3a9a' : d > 0.4 ? '#56246e' : '#3a1450';
      if (P.F.some(f => segDist(x, y, P.W, f) < 0.7)) c = '#200a2e';          // Fingerknochen
      else if (P.F.some(f => segDist(x, y, P.W, toward(P.W, f, P.S, 0.5)) < 0.5) && bay(x, y) < 0.5) c = '#8c2058'; // Adern
      set(x, y, c);
    }
    for (let x = 0; x < Wc / 2; x++) for (let y = 0; y < Hc; y++) { // helle Hinterkante
      const c = get(x, y);
      if (c && c !== '#200a2e' && (!get(x, y + 1) || !get(x - 1, y))) set(x, y, '#a85cc8');
    }
    for (let k = 0; k <= 10; k++) { const t = k / 10; set(P.S[0] + (P.W[0] - P.S[0]) * t, P.S[1] + (P.W[1] - P.S[1]) * t, '#1c0828'); set(P.S[0] + (P.W[0] - P.S[0]) * t, P.S[1] + 1 + (P.W[1] - P.S[1]) * t, '#3a1450'); }
    set(P.W[0], P.W[1] - 1, '#fce0a8'); set(P.W[0] - 1, P.W[1] - 2, '#fce0a8');          // Daumenkralle
    P.F.forEach(([fx, fy]) => set(fx, fy, '#c8a0d8'));
    // Körper (Fell)
    for (let y = 0; y < Hc; y++) for (let x = 0; x < Wc / 2; x++) {
      const bd = ((x - 36) / 6.5) ** 2 + ((y - 22) / 9.5) ** 2, hd = ((x - 36) / 6.5) ** 2 + ((y - 11) / 5.5) ** 2;
      if (bd <= 1) set(x, y, bd > 0.75 ? '#2a0c38' : (x < 34 && y < 20) ? '#5c2c70' : (y > 24 && x > 33) ? '#6c3c5c' : ((x + y) % 3 ? '#3a1a48' : '#4a2258'));
      if (hd <= 1) set(x, y, hd > 0.7 ? '#2a0c38' : y < 10 && x < 34 ? '#5c2c70' : '#3a1a48');
    }
    for (let i = 0; i < 8; i++) { set(30 + Math.floor(i / 4), 8 - i, '#3a1a48'); set(31 + Math.floor(i / 3), 8 - i, '#2a0c38'); } // Ohren
    for (let i = 0; i < 5; i++) set(31, 7 - i, '#c8507c');
    if (sleep) { set(33, 11, '#5c2c70'); set(34, 11, '#5c2c70'); }
    else { set(33, 11, '#fc2c2c'); set(34, 11, '#fc2c2c'); set(33, 12, '#a80010'); set(34, 12, '#fc2c2c'); set(33, 11, '#fcfcfc'); }
    set(35, 13, '#1c0410');
    if (open) { for (let x = 34; x <= 35; x++) for (let y = 14; y <= 17; y++) set(x, y, '#5c0010'); set(34, 14, '#fcfcfc'); set(34, 17, '#fcfcfc'); set(35, 16, '#c8204c'); }
    else { set(34, 15, '#1c0410'); set(35, 15, '#1c0410'); set(34, 16, '#fcfcfc'); }
    set(34, 31, '#fce0a8'); set(33, 32, '#fce0a8');                                         // Fußkrallen
    const c = Sprites.canvas(Wc, Hc), x = c.getContext('2d');
    pix.forEach((col, i) => { if (col) { x.fillStyle = col; x.fillRect(i % Wc, Math.floor(i / Wc), 1, 1); } });
    return Sprites.fromCanvas(c);
  }
  const order = ['up', 'midU', 'down', 'midD'];
  Sprites.S.gbatX = { flap: order.map(p => frame(p, false)), open: order.map(p => frame(p, true)), fold: frame('fold', false, true) };
})();

// Kleine Fledermäuse, die beim Tod der Riesenfledermaus auseinanderstieben (nur Effekt)
class SwarmBat extends Ent {
  constructor(x, y) {
    super(x, y, 8, 8);
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 1.8;
    this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp - 0.6; this.ph = Math.random() * 6;
  }
  update() { this.t++; this.x += this.vx; this.y += this.vy + Math.sin(this.t * 0.3 + this.ph) * 0.8; if (this.t > 150) this.dead = true; }
  draw(ctx) { Sprites.draw(ctx, Sprites.S.bat.fly[Math.floor(this.t / 4) % 2], Math.round(this.x - 8 - W.cam.x), Math.round(this.y - W.cam.y), this.vx < 0); }
}

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
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return true; // ungültiges Ziel nie übernehmen
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
  constructor(ax, aw) {
    super(ax + aw / 2 - 20, 30, 40, 18, 16, 3);
    this.ax = ax; this.aw = aw; this.state = 'sleep'; this.score = 3000;
  }
  pickHover() { this.tx = this.ax + rnd(40, this.aw - 40); this.ty = rnd(40, 90); }
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
          this.tx = clamp(this.cx + (p.cx < this.cx ? 70 : -70), this.ax + 30, this.ax + this.aw - 30); this.ty = 40;
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
    if (!Number.isFinite(this.x) || !Number.isFinite(this.y)) { this.x = this.ax + this.aw / 2 - 16; this.y = 36; this.state = 'hover'; this.pickHover(); }
    this.x = clamp(this.x, this.ax + 8, this.ax + this.aw - 8 - this.w);
    this.y = clamp(this.y, 20, 180);
    if (this.state !== 'sleep') this.touch();
  }
  updateDeath(len) {
    if (this.dying === 1) for (let i = 0; i < 14; i++) W.spawn(new SwarmBat(this.cx + rnd(-16, 16), this.cy + rnd(-6, 6)));
    super.updateDeath(len);
  }
  draw(ctx) {
    if (this.dying && (this.dying & 2)) return;
    const G = Sprites.S.gbatX, x = Math.round(this.cx - W.cam.x), y = Math.round(this.cy - W.cam.y);
    let s;
    if (this.state === 'sleep') s = G.fold;
    else {
      const fast = this.state === 'swoop' || this.state === 'rise';
      const f = Math.floor(this.t / (fast ? 3 : 5)) % 4;
      s = (this.state === 'swoop' || this.state === 'shoot') ? G.open[f] : G.flap[f];
      if (f === 2 && this.t % 20 === 0) Audio8.sfx('bat');
    }
    ctx.globalAlpha = 0.5;
    const aura = FX.disc(26, [60, 10, 90], [0.6, 0.38, 0.2, 0.08]);
    ctx.drawImage(aura, x - 26, y - 24);
    ctx.globalAlpha = 1;
    Sprites.draw(ctx, s, x - 36, y - 20, false, this.flash);
  }
}

class GiantSkeleton extends Boss {
  constructor(ax, aw) {
    super(ax + aw - 60, 176 - 44, 20, 44, 24, 3);
    this.ax = ax; this.aw = aw; this.state = 'rise'; this.face = -1; this.next = 'throw'; this.score = 4000;
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
          W.spawn(new EProj('rock', this.ax + rnd(16, this.aw - 16), W.cam.y - 8 - i * 30, 0, 0.5, 0.12));
        }
      }
    }
    this.physics();
    if (this.x < this.ax + 4) this.x = this.ax + 4;
    if (this.x + this.w > this.ax + this.aw - 4) this.x = this.ax + this.aw - 4 - this.w;
    this.touch();
  }
  draw(ctx) {
    if (this.dying && (this.dying & 2)) return;
    const G = Sprites.S.giant;
    if (this.state === 'rise') {
      const s = G[0], vis = Math.min(s.h, Math.floor(this.timer * 0.8));
      if (vis <= 0) return;
      const sx = Math.round(this.cx - s.w / 2 - W.cam.x), gy = Math.round(this.y + this.h - W.cam.y);
      const cw = s.c.width, v = vis + s.pad;
      ctx.drawImage(this.face < 0 ? s.f : s.c, 0, 0, cw, v, sx - s.pad, gy - vis - s.pad, cw, v);
      return;
    }
    const s = this.state === 'throw' && this.timer < 22 ? G[2] : G[this.state === 'walk' && this.vx ? Math.floor(this.t / 12) % 2 : 0];
    this.spr(ctx, s, this.face < 0, 0, 0, this.flash);
  }
}

class Count extends Boss {
  constructor(ax, aw) {
    super(ax + aw - 80, 176 - 40, 16, 40, 24, 3);
    this.ax = ax; this.aw = aw; this.state = 'appear'; this.timer = 0; this.cycle = 0; this.score = 10000;
  }
  vulnerable() { return this.state === 'open'; }
  hurtBox() { return { x: this.x - 3, y: this.y, w: this.w + 6, h: 28 }; }
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
        if (this.timer === 10) this.aimFire(phase2 ? 4 : 3, 0.28, phase2 ? 1.7 : 1.45);
        if (phase2 && this.timer === 30 && this.cycle % 2 === 1) this.summonBats();
        if (this.timer > (phase2 ? 80 : 100)) { this.state = 'vanish'; this.timer = 0; Audio8.sfx('teleport'); }
        break;
      case 'vanish':
        if (this.timer > 28) {
          let nx, tries = 0;
          do { nx = this.ax + rnd(24, this.aw - 40); } while (Math.abs(nx + 8 - p.cx) < 64 && ++tries < 20);
          this.x = nx; this.state = 'appear'; this.timer = 0; this.cycle++;
        }
        break;
    }
    if (this.state === 'closed' || this.state === 'open') this.touch();
  }
  summonBats() {
    [-1, 1].forEach(side => {
      const b = new Bat(0, 0);
      b.x = side < 0 ? W.cam.x + 4 : W.cam.x + View.w - 14; b.y = W.cam.y + 30;
      b.state = 'fly'; b.dir = -side; b.face = -side; b.baseY = b.y; b.seen = true;
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
