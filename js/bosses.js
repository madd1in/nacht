// Bosse: Riesenfledermaus, Knochenriese, Graf Nachtmahr – und der lila Tentakel als Miniboss auf dem Schiff.
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
  draw(ctx) { const s = Sprites.S.bat.fly[Math.floor(this.t / 3) % 4]; Sprites.draw(ctx, s, Math.round(this.x - s.w / 2 - W.cam.x), Math.round(this.y - 4 - W.cam.y), this.vx < 0); }
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
    Audio8.sfx('bossHit', this.cx);
    W.spawn(new Spark(this.cx + rnd(-4, 4), this.cy + rnd(-6, 6)));
    W.spawn(new Shock(this.cx, this.cy, 28, '#f8b800', 3));
    W.comboHit(); W.shake = Math.max(W.shake, 5);
    W.hitstop = 4;
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
    if (this.dying === 1) { W.slowmo = 80; W.flash = 14; W.shake = 30; Input.rumble(1, 1, 900); }
    if (this.dying === 1 || this.dying === 9 || this.dying === 18) W.spawn(new Shock(this.cx, this.cy, 90 + this.dying * 3, this.dying === 9 ? '#f8b800' : '#fcfcfc', 5));
    if (this.dying % 7 === 0) {
      W.spawn(new Burst(this.x + rnd(0, this.w), this.y + rnd(0, this.h)));
      Audio8.sfx('explode', this.cx);
    }
    if (this.dying % 20 === 0) W.shake = 10;
    if (this.dying >= len) {
      Drama.disintegrate(this.lastDraw, 1.6);
      W.spawn(new Shock(this.cx, this.cy, 140, '#fcfcfc', 6)); W.flash = 10; W.shake = 20;
      this.dead = true; W.bossDefeated(this);
    }
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
    Audio8.sfx('fire', this.cx);
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
    this.ds(ctx, s, x - 36, y - 20, false, this.flash);
  }
}

class GiantSkeleton extends Boss {
  constructor(ax, aw) {
    super(ax + aw - 60, 176 - 64, 24, 64, 24, 3); // Riese in doppelter Heldengröße
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
        Audio8.sfx('throw', this.cx);
      }
      if (this.timer > 34) { this.state = 'walk'; this.timer = 0; }
    } else if (this.state === 'jump') {
      if (this.onGround && this.timer > 5) {
        this.state = 'walk'; this.timer = 0; this.vx = 0;
        W.shake = 14; Audio8.sfx('wall', this.cx);
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

// ---------------- Graf Nachtmahr, von Hand gemalt (100×88) ----------------
// Hageres, bleiches Gesicht mit Witwenspitze, spitzen Ohren, roten Augen und Fangzähnen; hoher Stehkragen mit rotem Futter,
// Frack, rote Weste mit Goldknöpfen, Jabot und Blutstein-Medaillon. Der Umhang ist geschlossen eine dunkle Säule, geöffnet
// spannt er sich wie Fledermausflügel mit Knochenrippen und gezacktem Saum, beim Zaubern reißt der Graf ihn über den Kopf.
const COUNT_ART = (() => {
  const W = 100, H = 88, cx = 50;
  const OUT = ['#08050e', '#120a1c', '#1e122c', '#2c1c40', '#3c2a54'], LIN = ['#3c000c', '#640816', '#901022', '#b81c30', '#e03848'];
  const SUIT = ['#06050a', '#100e16', '#1c1824', '#2c2838'], SK = ['#4c4460', '#857c9c', '#b8b0cc', '#e4e0f4'], GOLD = ['#6c4c08', '#c89020', '#f8d878'];
  function paint(pose) {
    const c = Sprites.canvas(W, H), x = c.getContext('2d');
    const R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), w, h); };
    const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); x.fill(); };
    const line = (x0, y0, x1, y1, col) => { const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))); for (let k = 0; k <= n; k++) R(col, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n); };
    const ell = (ex, ey, rx, ry, f) => { for (let y = Math.floor(ey - ry); y <= ey + ry; y++) for (let X = Math.floor(ex - rx); X <= ex + rx; X++) { const q = ((X + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2; if (q <= 1) f(X, y, q); } };
    const claw = (hx, hy, dir, up) => { // bleiche Hand mit langen Krallen
      ell(hx, hy, 2.4, 2.2, (X, y, q) => R(q < 0.4 ? SK[3] : SK[2], X, y));
      for (let k = -1; k <= 2; k++) { const fx = hx + dir * (1 + k * 0.4), fy = hy + (up ? -1 : 1) * 1; line(fx, fy, fx + dir * (2 + (k === 1 ? 1 : 0)) + k * 0.6, fy + (up ? -4 : 4), k === 1 ? SK[2] : SK[1]); R('#e8e0d0', fx + dir * (2.5 + (k === 1 ? 1 : 0)) + k * 0.6, fy + (up ? -4.5 : 4.5)); }
    };
    // ---------- Umhang hinten ----------
    if (pose === 'closed') {
      poly([[cx - 15, 29], [cx + 15, 29], [cx + 24, 87], [cx - 24, 87]], OUT[1]);
      for (let X = cx - 24; X <= cx + 24; X++) for (let y = 30; y < 88; y++) { // Falten, Licht von links
        const half = 15 + (y - 29) / 58 * 9; if (Math.abs(X - cx) > half) continue;
        const u = (X - cx) / half, fold = Math.sin(u * 7 + y * 0.03) > 0.55;
        R(fold ? OUT[3] : u < -0.4 ? OUT[2] : u > 0.5 ? OUT[0] : OUT[1], X, y);
      }
      poly([[cx - 2, 36], [cx + 2, 36], [cx + 6, 87], [cx - 6, 87]], LIN[1]); line(cx - 2, 36, cx - 6, 87, LIN[3]); line(cx + 2, 36, cx + 6, 87, LIN[0]); // Spalt mit rotem Futter
      for (let k = 0; k < 9; k++) { R(OUT[4], cx - 24 + k * 1.2, 86 - (k % 2) * 2, 2, 1); R(OUT[4], cx + 16 + k, 86 - (k % 2) * 2, 2, 1); } // Saum
    } else {
      const lift = pose === 'cast';
      for (const s of [-1, 1]) { // Flügel: Schulter → Hand → gezackter Saum bis zum Boden
        const sh = [cx + s * 10, 30], hand = lift ? [cx + s * 15, 3] : [cx + s * 39, 22], tip = [cx + s * (lift ? 47 : 46), lift ? 70 : 64];
        const scal = []; const n = 4;
        for (let k = 0; k <= n; k++) { const t = k / n, bx = tip[0] + (cx + s * 13 - tip[0]) * t, by = tip[1] + (87 - tip[1]) * t; scal.push([bx, by]); if (k < n) scal.push([bx + (cx + s * 13 - tip[0]) / n * 0.5 - s * 2, by + (87 - tip[1]) / n * 0.5 - 6]); }
        poly([sh, hand, tip, ...scal, [cx + s * 12, 87], [cx + s * 9, 40]], OUT[1]); // Außenrand
        const inner = [[sh[0] + s * 1, sh[1] + 2], [hand[0] - s * 1, hand[1] + 2], [tip[0] - s * 2, tip[1] - 1], ...scal.map(([a, b]) => [a - s * 2, b - 2]), [cx + s * 12, 85], [cx + s * 9, 41]];
        poly(inner, LIN[2]); // rotes Futter
        for (const [a, b] of scal.filter((_, i) => i % 2 === 0)) { line(hand[0], hand[1] + 1, a - s * 1, b - 2, LIN[0]); line(hand[0] - s, hand[1] + 2, a - s * 2, b - 3, LIN[3]); } // Knochenrippen mit Glanz
        for (let k = 0; k < 40; k++) { const t = k / 40; R(LIN[4], sh[0] + (hand[0] - sh[0]) * t, sh[1] + 2 + (hand[1] - sh[1]) * t, 1, 1); } // Glanzkante oben
        // Arm im Ärmel entlang der Oberkante, Hand mit Krallen
        line(sh[0], sh[1], hand[0], hand[1], SUIT[2]); line(sh[0], sh[1] + 1, hand[0], hand[1] + 1, SUIT[1]); line(sh[0], sh[1] - 1, hand[0], hand[1] - 1, SUIT[3]);
        R('#e8e4dc', hand[0] - s * 2, hand[1] - 1, 2, 3); // Manschette
        claw(hand[0] + s * 1, hand[1] - (lift ? 2 : 0), s, lift);
      }
    }
    // ---------- Beine, Stiefel ----------
    for (const s of [-1, 1]) { R(SUIT[1], cx + s * 4 - 2.5, 62, 5, 22); R(SUIT[2], cx + s * 4 - 2.5, 62, 1, 22); R(SUIT[0], cx + s * 4 - 3.5, 83, 7, 4); R(SUIT[3], cx + s * 4 - 2.5, 83, 3, 1); }
    // ---------- Rumpf: Frack, Weste, Goldknöpfe, Jabot, Medaillon ----------
    poly([[cx - 11, 30], [cx + 11, 30], [cx + 8, 63], [cx - 8, 63]], SUIT[1]);
    poly([[cx - 11, 30], [cx - 6, 30], [cx - 5, 63], [cx - 8, 63]], SUIT[2]);
    poly([[cx - 4, 33], [cx + 4, 33], [cx + 3, 58], [cx - 3, 58]], '#6c0c1c'); line(cx - 4, 33, cx - 3, 58, '#9c1c2c');
    for (let k = 0; k < 4; k++) R(GOLD[2], cx, 40 + k * 5, 1, 1);
    for (let y = 28; y < 37; y++) { const wd = 3 + (y % 3 === 0 ? 1 : 0); R(y % 2 ? '#f0ece4' : '#c8c4bc', cx - wd / 2, y, wd, 1); } // Jabot
    line(cx - 5, 33, cx, 39, GOLD[1]); line(cx + 5, 33, cx, 39, GOLD[1]); ell(cx, 41, 2.2, 2.4, (X, y, q) => R(q < 0.35 ? '#fc6c6c' : q < 0.7 ? '#d81c1c' : GOLD[1], X, y)); // Medaillon
    R(SUIT[0], cx - 11, 30, 22, 1);
    if (pose === 'closed') { // der Umhang umhüllt den Körper vorn bis auf einen Spalt; eine Hand hält ihn zu
      for (const sd of [-1, 1]) for (let y = 31; y < 88; y++) {
        const outer = 15 + (y - 29) / 58 * 9, inner = 2 + (y - 31) / 56 * 3 + (sd > 0 && y > 40 && y < 50 ? 2 : 0);
        for (let X = Math.round(cx + sd * inner); sd > 0 ? X <= cx + outer : X >= cx - outer; X += sd) {
          const u = (X - cx) / outer, fold = Math.sin(u * 8 + y * 0.04) > 0.6;
          R(fold ? OUT[3] : u < -0.45 ? OUT[2] : u > 0.55 ? OUT[0] : OUT[1], X, y);
        }
        R(sd < 0 ? OUT[4] : OUT[2], cx + sd * inner, y, 1, 1); // Kante des Umhangs
      }
      claw(cx + 4, 46, -1, false); R(SUIT[2], cx + 5, 44, 4, 3);
    }
    // ---------- Stehkragen hinter dem Kopf ----------
    for (const s of [-1, 1]) {
      poly([[cx + s * 6, 30], [cx + s * 9, 30], [cx + s * 17, 2], [cx + s * 13, 6], [cx + s * 6, 22]], OUT[1]);
      poly([[cx + s * 7, 28], [cx + s * 9, 28], [cx + s * 15, 6], [cx + s * 12, 9], [cx + s * 7, 21]], LIN[s < 0 ? 3 : 2]);
      line(cx + s * 9, 30, cx + s * 17, 2, GOLD[1]);
    }
    // ---------- Kopf ----------
    R(SK[1], cx - 3, 24, 6, 6); R(SK[0], cx + 1, 24, 2, 6); // Hals
    ell(cx, 16, 7.2, 10, (X, y, q) => { // hageres Gesicht, Licht von links oben, eingefallene Wangen
      let l = -(X - cx) / 7 * 0.5 - (y - 16) / 10 * 0.3 + (1 - q) * 0.7;
      if (Math.abs(X - cx) > 3 && y > 17 && y < 23) l -= 0.4;
      if (y > 23 && Math.abs(X - cx) > 2) l -= 0.2;
      R(l > 0.95 ? SK[3] : l > 0.55 ? SK[2] : l > 0.15 ? SK[1] : SK[0], X, y);
    });
    for (const s of [-1, 1]) { line(cx + s * 7, 13, cx + s * 11, 9, SK[1]); line(cx + s * 7, 15, cx + s * 10, 10, SK[0]); R(SK[2], cx + s * 7.5, 13, 1, 2); } // spitze Ohren
    for (let X = cx - 8; X <= cx + 8; X++) { // Haar zurückgekämmt, Witwenspitze
      const top = 6 + Math.abs(X - cx) * 0.05, peak = 12 - Math.abs(X - cx) * 0.9;
      for (let y = Math.floor(top); y < Math.max(top + 2, Math.min(15, peak)); y++) if (((X - cx) / 8.5) ** 2 + ((y - 13) / 8) ** 2 < 1) R((X + y) % 4 ? '#06040a' : '#24203a', X, y);
    }
    R('#3c3858', cx - 4, 7, 3, 1); // Glanz im Haar
    for (const s of [-1, 1]) { line(cx + s * 2, 13, cx + s * 6, 11, '#06040a'); R('#06040a', cx + s * 2, 14, 1, 1); } // böse Brauen
    for (const s of [-1, 1]) { R('#1c0c18', cx + s * 3.5 - 1.5, 15, 3, 2); R('#fc1c1c', cx + s * 3 - (s > 0 ? 0 : 1), 15, 2, 1); R('#fca0a0', cx + s * 3 - (s > 0 ? 0 : 1), 15, 1, 1); } // tiefe Augenhöhlen, rote Augen
    R(SK[0], cx, 17, 1, 4); R(SK[3], cx - 1, 17, 1, 3); // Nase
    R('#3c0818', cx - 3, 23, 6, 1); R('#7c1028', cx - 2, 24, 4, 1); R('#fcfcf0', cx - 2, 24, 1, 2); R('#fcfcf0', cx + 1, 24, 1, 2); // Mund mit Fängen
    R(SK[0], cx - 1, 25, 3, 1);
    // Pixel-Look: weiche Kanten der Flächen weg (Alpha hart)
    const img = x.getImageData(0, 0, W, H), d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
    x.putImageData(img, 0, 0);
    return Sprites.fromCanvas(c);
  }
  let art = null;
  return { get: () => art || (art = { closed: paint('closed'), open: paint('open'), cast: paint('cast') }) };
})();

class Count extends Boss {
  // Graf Nachtmahr: mehr als doppelt so groß wie der Held, umhüllt von dunklem Nebel, mit glühenden Augen. Er zerfällt
  // in Fledermäuse und setzt sich an anderer Stelle wieder zusammen; ab der Hälfte schwebt er, lässt Blut regnen.
  constructor(ax, aw) {
    super(ax + aw - 96, 176 - 80, 24, 80, 28, 4);
    this.ax = ax; this.aw = aw; this.state = 'appear'; this.timer = 0; this.cycle = 0; this.score = 10000; this.hover = 0;
  }
  vulnerable() { return this.state === 'open'; }
  hurtBox() { return { x: this.x - 6, y: this.y + 2 + this.hover, w: this.w + 12, h: 54 }; }
  update() {
    this.tick();
    if (this.dying) {
      if (this.dying === 1) W.flash = 20;
      return this.updateDeath(170);
    }
    const p = W.player, phase2 = this.hp <= this.maxHp / 2;
    this.hover = phase2 ? -6 + Math.sin(this.t * 0.07) * 4 : 0;
    if (this.t % 5 === 0 && this.state !== 'vanish') { // dunkler Nebel steigt aus dem Umhang
      W.spawn(new Particle(this.cx + rnd(-16, 16), this.y + this.h - rnd(0, 10), rnd(-0.3, 0.3), -rnd(0.3, 0.8), Math.random() < 0.5 ? '#2c0c3c' : '#140418', 46, 3, -0.004));
    }
    switch (this.state) {
      case 'appear':
        if (this.timer === 1) { Audio8.sfx('teleport'); this.bats(6, true); }
        if (this.timer > 36) { this.state = 'closed'; this.timer = 0; }
        break;
      case 'closed':
        if (this.timer > (phase2 ? 14 : 22)) { this.state = 'open'; this.timer = 0; if (this.cycle % 3 === 0) Audio8.sfx('growl', this.cx); }
        break;
      case 'open':
        if (this.timer === 10) this.aimFire(phase2 ? 5 : 3, 0.26, phase2 ? 1.75 : 1.5);
        if (phase2 && this.timer === 30 && this.cycle % 2 === 1) this.summonBats();
        if (phase2 && this.timer === 34 && this.cycle % 2 === 0) this.bloodRain();
        if (this.timer > (phase2 ? 84 : 100)) { this.state = 'vanish'; this.timer = 0; Audio8.sfx('teleport'); this.bats(10, false); }
        break;
      case 'vanish':
        if (this.timer > 28) {
          let nx, tries = 0;
          do { nx = this.ax + rnd(24, this.aw - 56); } while (Math.abs(nx + 12 - p.cx) < 72 && ++tries < 20);
          this.x = nx; this.state = 'appear'; this.timer = 0; this.cycle++;
        }
        break;
    }
    if (this.state === 'closed' || this.state === 'open') this.touch();
  }
  bats(n, inward) { // zerfällt in Fledermäuse bzw. setzt sich aus ihnen zusammen
    for (let i = 0; i < n; i++) { const b = new SwarmBat(this.cx + rnd(-14, 14), this.y + rnd(8, 50)); if (inward) { b.x -= b.vx * 25; b.y -= b.vy * 25; b.t = 125; } W.spawn(b); } // hinein: von außen auf den Körper zu
  }
  bloodRain() { // Arme hoch: aus der Decke regnet brennendes Blut, mit einer Lücke beim Helden
    const p = W.player, gap = Math.floor(rnd(-1, 2));
    for (let k = -4; k <= 4; k++) if (k !== gap && k !== gap + 1) W.spawn(new EProj('fire', p.cx + k * 26 + rnd(-4, 4), W.cam.y - 6 - Math.abs(k) * 6, 0, 1.4, 0.05));
    Audio8.sfx('roar', this.cx); W.shake = Math.max(W.shake, 6);
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
    const C = COUNT_ART.get(), phase2 = this.hp <= this.maxHp / 2;
    const fading = this.state === 'appear' ? 1 - this.timer / 36 : this.state === 'vanish' ? this.timer / 28 : 0;
    const X = Math.round(this.cx - W.cam.x), Y = Math.round(this.y + this.h - W.cam.y);
    // dunkle Aura am Boden und um den Umhang
    ctx.save(); ctx.globalAlpha = 0.55 * (1 - fading);
    const g = ctx.createRadialGradient(X, Y - 36, 4, X, Y - 36, 56); g.addColorStop(0, 'rgba(40,0,50,0.7)'); g.addColorStop(1, 'rgba(20,0,30,0)');
    ctx.fillStyle = g; ctx.fillRect(X - 58, Y - 96, 116, 106);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(X, Y, 22, 4, 0, 0, Math.PI * 2); ctx.fill(); // Schatten
    ctx.restore();
    if (fading > 0.02 && (this.t & 1)) return; // flackernd beim Zerfallen
    const cast = this.state === 'open' && phase2 && this.timer > 24 && this.timer < 48;
    const s = this.state === 'open' ? (cast ? C.cast : C.open) : C.closed;
    if (fading > 0) ctx.globalAlpha = Math.max(0.2, 1 - fading);
    this.spr(ctx, s, W.player.cx < this.cx, 0, this.hover, this.flash);
    ctx.globalAlpha = 1;
    // glühende Augen mit Lichthof; beim Öffnen ein Augenblitz
    const ex = X, ey = Math.round(this.y + 7 + this.hover - W.cam.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = this.state === 'open' && this.timer < 12 ? 0.85 : 0.35 + 0.15 * Math.sin(this.t * 0.2);
    ctx.drawImage(FX.disc(this.state === 'open' && this.timer < 12 ? 12 : 6, [252, 30, 30], [0.8, 0.45, 0.15]), ex - (this.state === 'open' && this.timer < 12 ? 12 : 6), ey - (this.state === 'open' && this.timer < 12 ? 12 : 6));
    ctx.restore();
  }
}

// ---------------- Lila Tentakel: Miniboss auf dem Schiff (Gruß an Vepar aus Bloodstained) ----------------
// Zwei Fangarme steigen vor dem Rumpf aus der See, schlagen aufs Deck und fegen darüber; in Phase 2 bleiben
// beide oben, spucken Tinte und ein dritter Arm bricht durch die Planken. Jeder Arm ist eine Gliederkette
// (FABRIK, mit Ellbogenziel für die Hakenform) und wird pro Bild als schattierter, geditherter Schlauch in
// einen Pixelpuffer gestempelt – ein einziges drawImage statt hunderter kleiner Bilder.
// Verwundbar ist nur das leuchtende Auge jedes Arms; Treffer auf das zähe Fleisch prallen sichtbar ab.
const Tent = (() => {
  const rgb = (h) => { const n = parseInt(h.slice(1), 16); return (0xff000000 | (n & 255) << 16 | (n >> 8 & 255) << 8 | n >> 16) | 0; }; // ABGR als int32
  const pal = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, rgb(v)]));
  const PAL = {
    base: pal({ o: '#16041e', dd: '#300a40', d: '#4e1666', m: '#7c2c98', l: '#ac58c8', s: '#ecc0fc', k: '#f0bcd8', kc: '#7c2c5c' }),
    rage: pal({ o: '#1c0418', dd: '#3c0a38', d: '#5e145c', m: '#90287c', l: '#c454a8', s: '#fcc8ec', k: '#fc6c9c', kc: '#a8104c' }), // Phase 2: glühende Saugnäpfe
    flash: pal({ o: '#3c3c5c', dd: '#a8a8c8', d: '#c8c8e8', m: '#e8e8fc', l: '#fcfcfc', s: '#fcfcfc', k: '#fcfcfc', kc: '#c8c8e8' }),
  };
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.5);
  const M = 32; // Rand um das Spielfeld: beim Schaukeln (Bilddrehung) ragen die Arme sonst abgeschnitten ins Bild
  const B = { c: null, x: null, img: null, d: null, w: 0, h: 0, box: null };
  function buffer(w, h) {
    if (!B.c || B.w !== w || B.h !== h) {
      B.c = Sprites.canvas(w, h); B.x = B.c.getContext('2d'); B.img = B.x.createImageData(w, h);
      B.d = new Int32Array(B.img.data.buffer); B.w = w; B.h = h; B.box = null; // Int32: negative Farbwerte ohne Umwandlung speichern
      B.mk = new Int32Array(w * h); // Markierung: jedes Pixel eines Arms nur einmal schattieren
    }
    if (B.box) { const b = B.box; for (let y = b.y0; y <= b.y1; y++) B.d.fill(0, y * w + b.x0, y * w + b.x1 + 1); } // nur den zuletzt benutzten Bereich leeren
    B.box = { x0: w, y0: h, x1: -1, y1: -1 };
    return B;
  }
  const grow = (x0, y0, x1, y1) => { const b = B.box; if (x0 < b.x0) b.x0 = x0; if (y0 < b.y0) b.y0 = y0; if (x1 > b.x1) b.x1 = x1; if (y1 > b.y1) b.y1 = y1; };
  // Scheibe mit fester Farbe (Umriss, Saugnäpfe)
  function flat(cx, cy, R, col) { // direkte Schleife statt fill(): tausende kurze Spannen pro Bild
    const w = B.w, d = B.d, y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(B.h - 1, Math.ceil(cy + R));
    let mnx = w, mxx = -1;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy, q = R * R - dy * dy;
      if (q < 0) continue;
      const hw = Math.sqrt(q), x0 = Math.max(0, Math.round(cx - hw)), x1 = Math.min(w - 1, Math.round(cx + hw) - 1);
      if (x1 < x0) continue;
      for (let i = y * w + x0, e = y * w + x1; i <= e; i++) d[i] = col;
      if (x0 < mnx) mnx = x0;
      if (x1 > mxx) mxx = x1;
    }
    if (mxx >= 0) grow(mnx, y0, mxx, y1);
  }
  // Scheibe mit Rundung: Licht von oben entlang der Normalen (nx, ny), Bänder mit Bayer-Dither
  let SID = 0;
  const sid = () => ++SID;
  function shade(cx, cy, R, nx, ny, P, id) {
    const w = B.w, d = B.d, iR = 1 / R, y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(B.h - 1, Math.ceil(cy + R));
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy, q = R * R - dy * dy;
      if (q < 0) continue;
      const hw = Math.sqrt(q), x0 = Math.max(0, Math.round(cx - hw)), x1 = Math.min(w - 1, Math.round(cx + hw) - 1), row = y * w, by = (y & 3) * 4;
      const mk = B.mk;
      for (let x = x0; x <= x1; x++) {
        if (mk[row + x] === id) continue;
        mk[row + x] = id;
        const v = ((x + 0.5 - cx) * nx + dy * ny) * iR + BAY[by + (x & 3)] * 0.22;
        d[row + x] = v > 0.84 ? P.s : v > 0.5 ? P.l : v > 0.02 ? P.m : v > -0.52 ? P.d : P.dd;
      }
    }
  }
  function blit(ctx) { // Puffer → Spielfeld (einmal pro Bild, nur der benutzte Ausschnitt)
    const b = B.box;
    if (!b || b.x1 < b.x0) return;
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    B.x.putImageData(B.img, 0, 0, b.x0, b.y0, bw, bh);
    ctx.drawImage(B.c, b.x0, b.y0, bw, bh, b.x0 - M, b.y0 - M, bw, bh);
  }
  // kleine Scheibe direkt aufs Spielfeld (Tinte, Glühen)
  function fdisc(ctx, cx, cy, R, col) {
    ctx.fillStyle = col;
    for (let dy = -R; dy <= R; dy++) { const hw = Math.floor(Math.sqrt(Math.max(0, R * R + R * 0.8 - dy * dy))); ctx.fillRect(Math.round(cx) - hw, Math.round(cy) + dy, 2 * hw + 1, 1); }
  }
  // Boden unter x (Deck oder Back); Plattformen hoch oben in der Takelage zählen nicht
  function floorAt(x) {
    const c = Math.floor(x / T), g = W.room.grid;
    for (let r = W.room.h - 10; r < W.room.h; r++) { const ch = g[r] && g[r][c]; if (ch === '#' || ch === '=') return r * T; }
    return W.room.h * T;
  }
  const pull = (a, b, L) => { const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1; a.x = b.x + dx / d * L; a.y = b.y + dy / d * L; };
  return { M, PAL, buffer, flat, shade, sid, blit, fdisc, floorAt, pull };
})();

class TentArm {
  // side: -1 = links vor dem Rumpf, 1 = rechts, 0 = bricht durch die Planken
  constructor(boss, side, n, len, r0) {
    this.b = boss; this.side = side; this.n = n; this.L = len; this.r0 = r0; this.m = Math.round(n * 0.5);
    this.inward = side ? -side : 0;
    this.state = 'hidden'; this.t = 0; this.depth = 1; this.amp = 4; this.ease = 0.1; this.ph = Math.random() * 6; this.hole = 0;
    this.eye = n - 3; this.blinkT = 0; this.hitT = 0; // Schwachpunkt: Auge kurz vor der Spitze – hängt in Reichweite der Peitsche
    this.bx = side < 0 ? boss.ax - 18 : side > 0 ? boss.ax + boss.aw + 18 : boss.ax + boss.aw / 2;
    this.place();
    this.pts = Array.from({ length: n }, (_, i) => ({ x: this.bx, y: this.by + i * 2 }));
    this.q = this.pts.map(() => ({ x: 0, y: 0, nx: 0, ny: -1, up: false }));
    this.tipX = this.bx; this.tipY = this.by; this.tx = this.bx; this.ty = this.by; this.harm = n; this.lockX = this.bx;
    this.ex = null; this.elX = 0; this.elY = 0; this.hasEl = false;
    this.radii = this.pts.map((_, i) => Math.max(2, 2 + (r0 - 2) * Math.pow(1 - i / (n - 1), 0.75)));
    this.shape();
  }
  place() { // Wurzel: unter Wasser vor dem Rumpf (bzw. unter dem Loch im Deck)
    this.by = this.side ? W.room.h * T + 22 + this.depth * 300 : Tent.floorAt(this.bx) + 44 + this.depth * 150;
  }
  go(state) { this.state = state; this.t = 0; }
  visible() { return this.state !== 'hidden'; }
  // Ruhehaltung: steigt am Rand auf, wölbt sich über die Reling, die Spitze hängt als Haken über dem Deck
  idlePose() {
    const b = this.b, s = Math.sin(b.t * 0.03 + this.ph), c = Math.cos(b.t * 0.047 + this.ph), H = b.deckY;
    this.ex = this.bx + this.inward * (10 + s * 6); this.ey = H - 132 + c * 8;
    this.tx = this.bx + this.inward * (66 + s * 16); this.ty = H - 50 + c * 10; // Spitze mit Auge hängt auf Kopfhöhe
  }
  update(p) {
    const t = ++this.t, b = this.b, ph2 = b.ph2, H = b.deckY, top = W.cam.y + 12;
    let depthGoal = 0, buoy = true;
    this.harm = this.n; this.ex = null; this.amp += ((ph2 ? 5 : 4) - this.amp) * 0.1;
    switch (this.state) {
      case 'hidden': depthGoal = 1; this.tx = this.bx; this.ty = this.by; this.ease = 0.1; break;
      case 'rise': // taucht vor dem Rumpf auf
        if (t === 1) { W.splash(this.bx, W.room.h * T - 8); W.shake = Math.max(W.shake, 6); }
        this.idlePose(); this.ease = 0.06;
        if (t > 52) this.go('idle');
        break;
      case 'idle': this.idlePose(); this.ease = 0.05; this.harm = this.n - 4; break;
      case 'aim': { // bäumt sich hoch über dem Helden auf; die letzten Frames steht das Ziel fest
        const lock = ph2 ? 34 : 42, end = ph2 ? 56 : 66; // gemächlich ausholen: ein Gag-Boss, kein Brocken
        if (t < lock) this.lockX = clamp(p.cx, b.ax + 14, b.ax + b.aw - 14);
        this.ex = this.bx + this.inward * 16; this.ey = H - 150;
        this.tx = this.bx + (this.lockX - this.bx) * 0.55; this.ty = Math.max(top, H - 184); this.ease = 0.09; this.harm = this.n - 6;
        if (t === 1) Audio8.sfx('whoosh', this.bx);
        if (t === lock) { Audio8.sfx('creak', this.lockX); Input.rumble(0.2, 0.2, 120); }
        if (t > end) this.go('slam');
        break;
      }
      case 'slam':
        this.tx = this.lockX + this.inward * 18; this.ty = Tent.floorAt(this.lockX) - 4; this.ease = 0.42; this.amp = 1.5; this.harm = 0; buoy = false;
        if (t === 7) this.impact();
        if (t > 9) this.go('stuck');
        break;
      case 'stuck': // liegt betäubt auf den Planken: harmlos und verwundbar
        this.amp = 1; buoy = false;
        if (t % 9 === 0) { const q = this.q[this.n - 2 - (t % 7)]; W.dust(q.x, Tent.floorAt(q.x), 2); }
        if (t > (ph2 ? 92 : 112)) this.go('lift');
        break;
      case 'lift': this.idlePose(); this.ease = 0.07; if (t > 26) b.done(this); break;
      case 'coil': // rollt sich am eigenen Rand ein, dann fegt er knapp über die Planken
        this.ex = this.bx + this.inward * 6; this.ey = H - 60;
        this.tx = this.bx + this.inward * 30; this.ty = H - 34; this.ease = 0.12; this.amp = 7; this.harm = this.n - 5;
        if (t === 1) Audio8.sfx('creak', this.bx);
        if (t > 40) { this.go('sweep'); Audio8.sfx('whoosh', this.bx); }
        break;
      case 'sweep': case 'sweepBack': {
        const len = this.state === 'sweep' ? (ph2 ? 56 : 64) : (ph2 ? 50 : 56), k = Math.min(1, t / len);
        const x0 = this.bx + this.inward * 30, x1 = this.side < 0 ? b.ax + b.aw - 8 : b.ax + 8;
        const x = this.state === 'sweep' ? x0 + (x1 - x0) * k : x1 + (x0 - x1) * k;
        this.tx = x; this.ty = Tent.floorAt(x) - 6; this.ease = 0.5; this.harm = this.n - 4; buoy = false;
        if (t % 4 === 0) { const q = this.q[this.n - 1]; W.dust(q.x, Tent.floorAt(q.x), 2); }
        if (k >= 1) { if (this.state === 'sweep') { this.go('sweepBack'); Audio8.sfx('whoosh', x); } else this.go('lift'); }
        break;
      }
      case 'spit': // bäumt sich auf und spuckt Tinte in hohen Bögen
        this.ex = this.bx + this.inward * 14; this.ey = H - 140;
        this.tx = this.bx + this.inward * 44; this.ty = Math.max(top, H - 168); this.ease = 0.08; this.harm = this.n - 5;
        if (t === 24 || t === 40) this.spit(p, (t - 32) / 8);
        if (t > 54) this.go('idle');
        break;
      case 'retract': depthGoal = 1; this.tx = this.bx + this.inward * 8; this.ty = this.by - 40; this.ease = 0.07; buoy = false; if (t > 50) this.go('hidden'); break;
      case 'thrash': // Todeskampf
        this.amp = 10; this.ex = this.bx + this.inward * (12 + Math.sin(t * 0.13) * 10); this.ey = H - 120 + Math.cos(t * 0.19) * 24;
        this.tx = this.bx + this.inward * (50 + Math.sin(t * 0.21 + this.ph) * 40); this.ty = Math.max(top, H - 100 + Math.cos(t * 0.17 + this.ph) * 50); this.ease = 0.16;
        break;
      // ---- dritter Arm: durch die Planken ----
      case 'warn': // Planken knarren und heben sich, lila Licht dringt durch die Fugen
        depthGoal = 1;
        if (t % 4 === 0) W.dust(this.bx + rnd(-10, 10), Tent.floorAt(this.bx), 2);
        if (t === 1 || t === 22) Audio8.sfx('creak', this.bx);
        if (t > (ph2 ? 40 : 50)) this.go('burst');
        break;
      case 'burst':
        if (t === 1) {
          this.depth = 0.3; this.hole = 1; W.shake = Math.max(W.shake, 12); Input.rumble(0.7, 0.5, 300);
          Audio8.sfx('boom', this.bx); Audio8.sfx('crack', this.bx);
          W.debris(this.bx, Tent.floorAt(this.bx) - 2, '#8c5c34', 14);
        }
        this.tx = this.bx + Math.sin(t * 0.4) * 6; this.ty = Tent.floorAt(this.bx) - 104; this.ease = 0.35; this.harm = 0; buoy = false;
        if (t > 14) this.go('sway');
        break;
      case 'sway':
        this.tx = this.bx + Math.sin(b.t * 0.08 + this.ph) * 24; this.ty = Tent.floorAt(this.bx) - 96 + Math.cos(b.t * 0.11) * 8; this.ease = 0.08;
        this.harm = this.n >> 1;
        if (t > (ph2 ? 60 : 70)) this.go('retract');
        break;
    }
    if (this.hole > 0 && this.state === 'hidden') this.hole = Math.max(0, this.hole - 0.02);
    if (this.hitT > 0) this.hitT--;
    if (this.blinkT > 0) this.blinkT--; else if (this.state !== 'stuck' && Math.random() < 0.006) this.blinkT = 7;
    this.depth += (depthGoal - this.depth) * (this.state === 'burst' ? 0.3 : 0.06);
    this.place();
    this.tipX += (this.tx - this.tipX) * this.ease; this.tipY += (this.ty - this.tipY) * this.ease;
    if (this.ex !== null) {
      if (!this.hasEl) { this.elX = this.pts[this.m].x; this.elY = this.pts[this.m].y; this.hasEl = true; }
      this.elX += (this.ex - this.elX) * this.ease; this.elY += (this.ey - this.elY) * this.ease;
    } else this.hasEl = false;
    if (!Number.isFinite(this.tipX + this.tipY + this.elX + this.elY)) { this.tipX = this.elX = this.bx; this.tipY = this.elY = this.by; }
    // Glätten + Auftrieb: der lockere Arm wölbt sich nach oben und zur Arena hin, statt einzuknicken
    const P = this.pts;
    for (let i = 1; i < this.n - 1; i++) {
      const p0 = P[i - 1], p2 = P[i + 1], q = P[i];
      q.x += ((p0.x + p2.x) / 2 - q.x) * 0.2; q.y += ((p0.y + p2.y) / 2 - q.y) * 0.2;
      if (buoy) { q.y -= 0.8; q.x += this.inward * 0.4; }
    }
    this.solve(); this.shape();
    if (this.side && (this.state === 'rise' || this.state === 'retract') && t % 6 === 0) W.splash(this.bx + rnd(-8, 8), W.room.h * T - 8);
  }
  fab(i0, i1, rx, ry, tx, ty) {
    const P = this.pts, L = this.L;
    for (let it = 0; it < 2; it++) {
      P[i1].x = tx; P[i1].y = ty;
      for (let i = i1 - 1; i >= i0; i--) Tent.pull(P[i], P[i + 1], L);
      P[i0].x = rx; P[i0].y = ry;
      for (let i = i0 + 1; i <= i1; i++) Tent.pull(P[i], P[i - 1], L);
    }
  }
  solve() {
    const P = this.pts, n = this.n;
    if (this.hasEl) { this.fab(0, this.m, this.bx, this.by, this.elX, this.elY); this.fab(this.m, n - 1, P[this.m].x, P[this.m].y, this.tipX, this.tipY); }
    else this.fab(0, n - 1, this.bx, this.by, this.tipX, this.tipY);
    // einmal über dem Deck, bleibt der Arm darauf liegen, statt durch die Planken zu tauchen
    let above = false;
    for (let i = 1; i < n; i++) {
      const q = P[i], fy = Tent.floorAt(q.x) - this.radii[i] + 1;
      if (q.y < fy - 2) above = true;
      else if (above && q.y > fy) q.y = fy;
    }
  }
  shape() { // gezeichnete Lage: Schlängeln quer zur Kette, an Wurzel und Spitze null
    const P = this.pts, n = this.n, t = this.b.t;
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)], c = P[Math.min(n - 1, i + 1)];
      let dx = c.x - a.x, dy = c.y - a.y;
      const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
      const s = i / (n - 1), w = Math.sin(s * Math.PI) * this.amp * Math.sin(s * 7 - t * 0.17 + this.ph);
      const q = this.q[i];
      q.x = P[i].x - dy * w; q.y = P[i].y + dx * w;
      q.nx = -dy; q.ny = dx;
      if (q.ny > 0 || (q.ny === 0 && q.nx * this.inward < 0)) { q.nx = -q.nx; q.ny = -q.ny; } // Normale nach oben: Licht von oben, Saugnäpfe unten
      q.up = q.y < Tent.floorAt(q.x) + 3;
    }
  }
  impact() {
    W.shake = Math.max(W.shake, 14); Input.rumble(0.9, 0.6, 350);
    Audio8.sfx('boom', this.lockX); Audio8.sfx('wall', this.lockX);
    for (let i = 4; i < this.n; i += 3) { const q = this.q[i]; if (q.up) W.dust(q.x, Tent.floorAt(q.x), 3); }
    W.debris(this.q[this.n - 1].x, Tent.floorAt(this.q[this.n - 1].x) - 2, '#8c5c34', 6);
  }
  spit(p, k) {
    const q = this.q[this.n - 1], tf = 44, g = 0.14;
    const vx = (p.cx - q.x) / tf + k * 0.7, vy = (p.cy - q.y) / tf - g * tf / 2;
    W.spawn(new InkBlob(q.x, q.y, vx, vy));
    Audio8.sfx('throw', q.x);
  }
  armorBoxes(out) { // zähes Fleisch: Treffer prallen ab
    if (!this.visible()) return;
    for (let i = 1; i < this.n; i += 2) {
      const q = this.q[i], r = this.radii[i];
      if (q.up) out.push({ x: q.x - r - 2, y: q.y - r - 2, w: 2 * r + 4, h: 2 * r + 4 });
    }
  }
  eyeR() { return Math.max(5, Math.round(this.radii[this.eye] * 0.8 + 1)); }
  eyeAt() { const q = this.q[this.eye], r = this.eyeR(); return { x: q.x + q.nx * r * 0.3, y: q.y + q.ny * r * 0.3, r, up: q.up }; }
  eyeBoxes(out) { // das Auge – liegt der Arm betäubt auf den Planken, auch mit der waagrechten Peitsche zu treffen
    if (!this.visible()) return;
    const e = this.eyeAt();
    if (!e.up) return;
    const pad = this.state === 'stuck' ? 18 : 8; // großzügig: das Auge soll man leicht treffen
    out.push({ x: e.x - e.r - 7, y: e.y - e.r - pad, w: 2 * e.r + 14, h: 2 * e.r + pad + 6, arm: this });
  }
  drawEye(ctx, t, rage) {
    if (!this.visible()) return;
    const e = this.eyeAt();
    if (!e.up) return;
    const x = Math.round(e.x - W.cam.x), y = Math.round(e.y - W.cam.y), r = e.r, stuck = this.state === 'stuck';
    const pulse = 0.5 + 0.5 * Math.sin(t * (stuck ? 0.35 : 0.14) + this.ph), hit = this.hitT > 0 && (this.hitT & 2) > 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; // Leuchten: deutlich sichtbar, betäubt noch stärker
    ctx.globalAlpha = (stuck ? 0.5 : 0.28) + 0.25 * pulse;
    Tent.fdisc(ctx, x, y, r + 5 + Math.round(pulse * 2), stuck ? '#fcd040' : rage ? '#fc3c3c' : '#f87820');
    ctx.restore();
    Tent.fdisc(ctx, x, y, r + 1, '#2c0828');
    if (this.blinkT > 0 && !hit) { Tent.fdisc(ctx, x, y, r, '#7c2c98'); ctx.fillStyle = '#16041e'; ctx.fillRect(x - r + 1, y, 2 * r - 1, 1); }
    else {
      const look = Math.sign(W.player.cx - e.x);
      Tent.fdisc(ctx, x, y, r, hit ? '#fcfcfc' : '#fce8a8');                                                  // Augapfel
      Tent.fdisc(ctx, x + look, y, Math.max(2, r - 2), hit ? '#fcfcfc' : stuck ? '#fcb800' : rage ? '#fc3c3c' : '#f88800'); // Iris
      ctx.fillStyle = '#1c0410'; ctx.fillRect(x + look - (stuck ? 0 : 1), y - r + 2, stuck ? 1 : 2, 2 * r - 3); // Schlitzpupille
      ctx.fillStyle = '#fcfcfc'; ctx.fillRect(x - r + 2, y - r + 2, 2, 2);
    }
    if (stuck) for (let k = 0; k < 4; k++) { // kreisende Funken: jetzt zuschlagen!
      const a = t * 0.12 + k * Math.PI / 2;
      ctx.fillStyle = k % 2 ? '#fcfcfc' : '#fcd040';
      ctx.fillRect(Math.round(x + Math.cos(a) * (r + 8)) - 1, Math.round(y + Math.sin(a) * (r + 8)) - 1, 2, 2);
    }
  }
  touches(p) {
    if (!this.visible()) return null;
    for (let i = this.harm; i < this.n; i++) {
      const q = this.q[i], r = this.radii[i] * 0.8;
      if (q.up && q.x + r > p.x && q.x - r < p.x + p.w && q.y + r > p.y && q.y - r < p.y + p.h) return q;
    }
    return null;
  }
  drawWarn(ctx) { // Vorwarnungen: Schatten über der Aufschlagzone, Risse in den Planken, glühende Spitze
    const b = this.b, cx = W.cam.x, cy = W.cam.y, pulse = 0.35 + 0.25 * Math.sin(b.t * 0.5);
    if (this.state === 'aim') {
      const xa = this.side < 0 ? b.ax : this.lockX - 22, xb = this.side < 0 ? this.lockX + 22 : b.ax + b.aw;
      ctx.fillStyle = `rgba(150,30,110,${pulse.toFixed(2)})`;
      for (let x = Math.floor(xa / 4) * 4; x < xb; x += 4) ctx.fillRect(Math.round(x - cx), Tent.floorAt(x) - 3 - cy, 4, 3);
      ctx.fillStyle = `rgba(252,60,100,${(pulse + 0.2).toFixed(2)})`;
      ctx.fillRect(Math.round(this.lockX - 3 - cx), Tent.floorAt(this.lockX) - 4 - cy, 6, 4);
    }
    if (this.state === 'aim' || this.state === 'coil') {
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 0.6);
      for (let i = this.n - 5; i < this.n; i += 2) Tent.fdisc(ctx, this.q[i].x - cx, this.q[i].y - cy, Math.round(this.radii[i] + 5), '#fc3c64');
      ctx.globalAlpha = 1;
    }
    if (this.side === 0 && (this.state === 'warn' || this.hole > 0)) {
      const fy = Tent.floorAt(this.bx) - cy, x = Math.round(this.bx - cx);
      if (this.state === 'warn') {
        const j = this.t & 2 ? 1 : 0;
        ctx.fillStyle = `rgba(200,80,240,${pulse.toFixed(2)})`;
        ctx.fillRect(x - 12, fy + 4, 24, 1); ctx.fillRect(x - 8 + j, fy + 9, 16, 1);
        ctx.fillStyle = '#5c3418'; ctx.fillRect(x - 10, fy - 1 - j, 8, 2); ctx.fillRect(x + 3, fy - j, 7, 2);
      } else {
        ctx.globalAlpha = Math.min(1, this.hole * 2);
        ctx.fillStyle = '#0c0410'; ctx.fillRect(x - 12, fy, 24, 8);
        ctx.fillStyle = '#3c1c0c'; ctx.fillRect(x - 14, fy - 3, 3, 4); ctx.fillRect(x + 11, fy - 4, 3, 5); ctx.fillRect(x - 7, fy - 2, 2, 3); ctx.fillRect(x + 6, fy - 2, 2, 3);
        ctx.fillStyle = '#a4743c'; ctx.fillRect(x - 14, fy - 3, 1, 2); ctx.fillRect(x + 11, fy - 4, 1, 2);
        ctx.globalAlpha = 1;
      }
    }
  }
  stamp(P) { // in den Puffer: Umriss, runder Schlauch, Saugnäpfe an der Unterseite
    if (!this.visible()) return;
    const cx = W.cam.x - Tent.M, cy = W.cam.y - Tent.M, n = this.n, Q = this.q, R = this.radii, S = [];
    for (let i = 0; i < n - 1; i++) { // Stützpunkte dicht genug für glatte Ränder: dicke Glieder brauchen weniger (Bogenhöhe < 0,4 px)
      const a = Q[i], c = Q[i + 1], k = Math.max(1, Math.ceil(Math.hypot(c.x - a.x, c.y - a.y) / Math.max(2, R[i] * 0.5)));
      for (let j = 0; j < k; j++) {
        const f = j / k, nx = a.nx + (c.nx - a.nx) * f, ny = a.ny + (c.ny - a.ny) * f, nl = Math.hypot(nx, ny) || 1;
        S.push({ x: a.x + (c.x - a.x) * f - cx, y: a.y + (c.y - a.y) * f - cy, r: R[i] + (R[i + 1] - R[i]) * f, nx: nx / nl, ny: ny / nl, i });
      }
    }
    const e = Q[n - 1]; S.push({ x: e.x - cx, y: e.y - cy, r: R[n - 1], nx: e.nx, ny: e.ny, i: n - 1 });
    for (const s of S) Tent.flat(s.x, s.y, s.r + 1, P.o);
    const id = Tent.sid(); // von der Spitze her: die Spitze liegt vorn, wenn sich der Arm überkreuzt
    for (let k = S.length - 1; k >= 0; k--) { const s = S[k]; Tent.shade(s.x, s.y, s.r, s.nx, s.ny, P, id); }
    for (let i = 1; i < n - 1; i++) { // Saugnäpfe
      const q = Q[i], r = R[i];
      if (r < 3.5) continue;
      const sx = q.x - cx - q.nx * r * 0.6, sy = q.y - cy - q.ny * r * 0.6, sr = Math.max(1.2, r * 0.3);
      Tent.flat(sx, sy, sr + 0.6, P.dd); Tent.flat(sx, sy, sr, P.k);
      if (r >= 7) Tent.flat(sx, sy, sr * 0.45, P.kc);
    }
  }
}

// Tintenkugel: fliegt im Bogen, zerplatzt auf den Planken; die Peitsche schlägt sie weg
class InkBlob extends EProj {
  constructor(x, y, vx, vy) { super('ink', x, y, vx, vy, 0.14, 1); }
  update() {
    super.update();
    if (this.dead) return;
    if (this.t % 3 === 0) W.spawn(new Particle(this.cx + rnd(-1, 1), this.cy, 0, 0.1, this.t % 6 ? '#2c0c3c' : '#5c1c6c', 16, 2, 0));
    if (this.vy > 0 && Phys.solidTile(Math.floor(this.cx / T), Math.floor((this.y + this.h) / T))) {
      this.dead = true; Audio8.sfx('splash', this.cx);
      for (let i = 0; i < 9; i++) W.spawn(new Particle(this.cx, this.y + this.h - 1, rnd(-1.8, 1.8), rnd(-2.2, -0.4), i % 2 ? '#2c0c3c' : '#7c2c98', 30, 2, 0.16));
    }
  }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.cy - W.cam.y);
    ctx.globalAlpha = 0.4 + 0.2 * Math.sin(this.t * 0.5); Tent.fdisc(ctx, x, y, 6, '#c050e0'); ctx.globalAlpha = 1; // lila Schimmer: vor dem Nachthimmel sichtbar
    Tent.fdisc(ctx, x, y, 4, '#e8a0fc'); Tent.fdisc(ctx, x, y, 3, '#16041e'); Tent.fdisc(ctx, x + 1, y + 1, 1, '#4c1464');
    ctx.fillStyle = '#e8a0fc'; ctx.fillRect(x - 2, y - 2, 2, 1); ctx.fillRect(x - 2, y - 1, 1, 1);
  }
}

class TentacleBoss extends Boss {
  constructor(ax, aw) {
    super(ax + aw / 2 - 20, W.room.h * T - 90, 40, 40, 6, 1); // Gag-Miniboss: wenig Leben, wenig Schaden
    this.ax = ax; this.aw = aw; this.mini = true; this.sea = true; this.score = 5000;
    this.nameKey = 'bossTentacle'; this.voice = 'tentacle'; this.music = 'kraken'; this.hinted = false; this.lastDeflect = 0;
    this.deckY = (W.room.h - 2) * T; // Hauptdeck: Bezug für Höhen, damit die Arme auch über der erhöhten Back im Bild bleiben
    this.arms = [new TentArm(this, -1, 28, 11, 14), new TentArm(this, 1, 28, 11, 14)];
    this.burst = new TentArm(this, 0, 15, 9, 9);
    this.turn = W.player.cx < ax + aw / 2 ? 1 : 0; // der Arm auf der anderen Seite taucht zuerst auf
    this.gap = 0; this.inkCd = 160; this.burstCd = 300; this.ph2 = false;
  }
  all() { return [this.arms[0], this.arms[1], this.burst]; }
  vulnerable() { return this.hurtBoxes().length > 0; }
  hurtBoxes() { const out = []; for (const a of this.all()) a.eyeBoxes(out); return out; }
  armorBoxes() { const out = []; for (const a of this.all()) a.armorBoxes(out); return out; }
  hit(dmg, id) { // Treffer aufs Auge: Funken dort, Auge blitzt
    const p = W.player, hx = p.cx + p.face * 26, hy = p.cy - 4;
    let best = null, bd = Infinity;
    for (const b of this.hurtBoxes()) { const d = Math.hypot(b.x + b.w / 2 - hx, b.y + b.h / 2 - hy); if (d < bd) { bd = d; best = b; } }
    if (best) { this.x = best.x + best.w / 2 - 20; this.y = best.y + best.h / 2 - 20; }
    const ok = super.hit(dmg, id);
    if (ok && best) { best.arm.hitT = 14; best.arm.blinkT = 0; W.sparks(best.x + best.w / 2, best.y + best.h / 2, 10); Audio8.sfx('squeak', best.x); } // quietscht wie das Gummihuhn
    return ok;
  }
  deflect(id, b) { // Treffer aufs Fleisch: prallt ab (Funken, heller Klang) – und der Tipp erscheint
    if (this.dying || (id && this.lastDeflect === id)) return;
    this.lastDeflect = id;
    const x = b.x + b.w / 2, y = b.y + b.h / 2;
    Audio8.sfx('tink', x); W.spawn(new Spark(x, y));
    for (let i = 0; i < 5; i++) W.spawn(new Particle(x, y, rnd(-1.6, 1.6), rnd(-2, -0.4), i % 2 ? '#fcfcfc' : '#a8a8c8', 14, 1, 0.1));
    if (!this.hinted) { this.hinted = true; Game.note('tentacleHint'); }
  }
  done(arm) { // Angriff vorbei → der andere Arm ist dran
    arm.go(this.ph2 ? 'idle' : 'retract');
    this.turn = 1 - this.arms.indexOf(arm); this.gap = this.ph2 ? 30 : 40;
  }
  update() {
    this.tick();
    if (this.dying) return this.updateDeath();
    const p = W.player;
    if (!this.ph2 && this.hp <= this.maxHp / 2) { // Phase 2: beide Arme bleiben oben, Tinte, Durchbruch durch die Planken
      this.ph2 = true; W.flash = 8; W.shake = Math.max(W.shake, 14); Audio8.sfx('roar'); Audio8.tempo(1.1); Input.rumble(0.6, 0.5, 400);
      for (const a of this.arms) if (a.state === 'hidden' || a.state === 'retract') a.go('rise');
    }
    const A = this.arms[this.turn], B = this.arms[1 - this.turn];
    if (this.state === 'intro') { if (this.timer >= 30) { A.go('rise'); this.state = 'fight'; } }
    else {
      if (A.state === 'hidden' && --this.gap <= 0) A.go('rise');
      if (A.state === 'idle' && A.t > (this.ph2 ? 24 : 36) && --this.gap <= 0) A.go(Math.random() < 0.55 ? 'aim' : 'coil');
      if (this.ph2) {
        if (B.state === 'hidden') B.go('rise');
        if (B.state === 'idle' && B.t > 30 && --this.inkCd <= 0) { B.go('spit'); this.inkCd = 220 + rnd(0, 80); }
        if (this.burst.state === 'hidden' && this.burst.hole === 0 && --this.burstCd <= 0 && p.alive && p.onGround) {
          this.burst.bx = clamp(p.cx, this.ax + 20, this.ax + this.aw - 20); this.burst.go('warn'); this.burstCd = 420 + rnd(0, 120);
        }
      }
    }
    for (const a of this.all()) a.update(p);
    if (p.alive) for (const a of this.all()) { const q = a.touches(p); if (q) { p.hurt(this.dmg, q.x); break; } }
    if (!this.hinted && this.t > 200) { this.hinted = true; Game.note('tentacleHint'); } // nach dem Namensbanner: wo man treffen muss
    this.track();
  }
  track() { // Mittelpunkt (Zoom, Lebensbalken, Abspann) folgt dem sichtbaren Teil des aktiven Arms
    const a = [this.arms[this.turn], ...this.all()].find(a => a.visible() && a.q.some(q => q.up));
    if (!a) return;
    let sx = 0, sy = 0, k = 0;
    for (const q of a.q) if (q.up) { sx += q.x; sy += q.y; k++; }
    this.x = sx / k - 20; this.y = sy / k - 20;
  }
  updateDeath() {
    const d = this.dying++;
    if (d === 1) {
      W.slowmo = 50; W.flash = 14; W.shake = 26; Input.rumble(1, 1, 900); Audio8.sfx('roar');
      for (const a of this.all()) if (a.visible() && a.side) a.go('thrash'); else if (a.visible()) a.go('retract');
      if (W.kraken && W.kraken.t >= 0) W.kraken.t = Math.max(W.kraken.t, 300); // der Krake im Hintergrund schlägt ein letztes Mal und versinkt
    }
    if (d % 7 === 0 && d < 70) {
      const hb = this.armorBoxes();
      if (hb.length) { const b = hb[Math.floor(Math.random() * hb.length)]; W.spawn(new Burst(b.x + b.w / 2, b.y + b.h / 2)); Audio8.sfx('explode', b.x); }
    }
    if (d === 70) for (const a of this.all()) if (a.visible()) a.go('retract');
    if (d === 84 || d === 100) for (const a of this.arms) { W.splash(a.bx, W.room.h * T - 8); W.splash(a.bx + a.inward * 20, W.room.h * T - 8); }
    for (const a of this.all()) a.update(W.player);
    if (d >= 130) { this.dead = true; W.bossDefeated(this); }
  }
  draw(ctx) {
    const fl = this.flash || (this.dying > 0 && this.dying < 70 && (this.dying & 4) > 0);
    const P = fl ? Tent.PAL.flash : this.ph2 ? Tent.PAL.rage : Tent.PAL.base;
    for (const a of this.all()) a.drawWarn(ctx);
    Tent.buffer(View.w + 2 * Tent.M, 208 + 2 * Tent.M);
    this.burst.stamp(P); this.arms[1 - this.turn].stamp(P); this.arms[this.turn].stamp(P); // der angreifende Arm liegt vorn
    Tent.blit(ctx);
    if (!this.dying || this.dying < 70) for (const a of this.all()) a.drawEye(ctx, this.t, this.ph2);
  }
}

const BOSSES = { gbat: GiantBat, giant: GiantSkeleton, count: Count, tentacle: TentacleBoss };
