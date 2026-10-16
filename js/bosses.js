// Bosse: Riesenfledermaus, Knochenriese, Graf Nachtmahr – und der lila Tentakel als Miniboss auf dem Schiff.
'use strict';

// ---------------- Riesenfledermaus im PS2-Look (128×84, symmetrisch) ----------------
// Die Flügel sind ein kleines 3D-Modell: Arm, Handgelenk, vier Finger, dazwischen Flughaut. Beim Abschlag schwingen sie
// nach vorn und verkürzen sich perspektivisch, beim Aufschlag spannen sie sich weit auf. Flughaut halb durchscheinend
// mit Adern, weich schattiert; pelziger Leib, große Ohren mit rosa Innenseite, glühende Augen, Fänge.
(() => {
  const Wc = 128, Hc = 84, CX = 64;
  const WING = { E: [-22, -10], Wr: [-40, -18], F: [[-60, -6], [-58, 16], [-44, 32], [-24, 36]], B: [-5, 30] };
  function frame(phase, open, sleep = false) {
    const c = Sprites.canvas(Wc, Hc), x = c.getContext('2d');
    const phi = sleep ? -1.2 : 0.55 * Math.cos(phase * Math.PI * 2), psi = sleep ? 0 : 0.65 * Math.max(0, Math.sin(phase * Math.PI * 2));
    const P = (sd, p) => { // Rotation in der Bildebene (phi), Schwung nach vorn (psi) → Verkürzung
      const [px, py] = p, x1 = px * Math.cos(phi) + py * Math.sin(phi), y1 = -px * Math.sin(phi) + py * Math.cos(phi);
      const x2 = x1 * Math.cos(psi), z = Math.abs(x1) * Math.sin(psi);
      return [CX + sd * (-12 + x2), 26 + y1 + z * 0.22];
    };
    for (const sd of [-1, 1]) { // Flügel: links (sd = −1) und gespiegelt rechts
      const S = [CX + sd * -12, 26], E = P(sd, WING.E), Wr = P(sd, WING.Wr), F = WING.F.map(f => P(sd, f)), B = [CX + sd * -5, 56];
      const mid = (a, b, k) => [(a[0] + b[0]) / 2 + (Wr[0] - (a[0] + b[0]) / 2) * k, (a[1] + b[1]) / 2 + (Wr[1] - (a[1] + b[1]) / 2) * k];
      const memb = [S, E, Wr, F[0], mid(F[0], F[1], 0.3), F[1], mid(F[1], F[2], 0.28), F[2], mid(F[2], F[3], 0.25), F[3], mid(F[3], B, 0.2), B];
      const face = Math.cos(psi) * (0.75 + 0.25 * Math.cos(phi)); // zum Betrachter gewandt = heller
      const g = x.createLinearGradient(Wr[0], Wr[1], CX, 60);
      g.addColorStop(0, `rgba(${40 + 50 * face | 0},${12 + 14 * face | 0},${58 + 50 * face | 0},0.97)`);
      g.addColorStop(0.55, `rgba(${70 + 70 * face | 0},${18 + 20 * face | 0},${80 + 50 * face | 0},0.93)`);
      g.addColorStop(1, `rgba(${110 + 70 * face | 0},${30 + 20 * face | 0},${90 + 40 * face | 0},0.9)`); // durchscheinend rötlich am Saum
      x.fillStyle = g; x.beginPath(); memb.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(200,140,230,0.55)'; x.lineWidth = 1; x.stroke(); // heller Saum
      x.strokeStyle = 'rgba(170,40,90,0.55)'; x.lineWidth = 0.8; // Adern
      F.forEach(f => { const a = [(Wr[0] + f[0]) / 2, (Wr[1] + f[1]) / 2]; x.beginPath(); x.moveTo(a[0], a[1]); x.quadraticCurveTo((a[0] + S[0]) / 2, (a[1] + f[1]) / 2 + 4, (a[0] + B[0]) / 2, (a[1] + B[1]) / 2 + 2); x.stroke(); });
      x.lineCap = 'round'; x.strokeStyle = '#12061a'; x.lineWidth = 3.2; x.beginPath(); x.moveTo(S[0], S[1]); x.lineTo(E[0], E[1]); x.lineTo(Wr[0], Wr[1]); x.stroke(); // Arm
      x.strokeStyle = '#5c3470'; x.lineWidth = 1; x.beginPath(); x.moveTo(S[0], S[1] - 1); x.lineTo(E[0], E[1] - 1); x.lineTo(Wr[0], Wr[1] - 1); x.stroke();
      x.strokeStyle = '#1c0a26'; x.lineWidth = 1.6; F.forEach(f => { x.beginPath(); x.moveTo(Wr[0], Wr[1]); x.lineTo(f[0], f[1]); x.stroke(); }); // Finger
      x.fillStyle = '#e8d8c0'; x.beginPath(); x.moveTo(Wr[0], Wr[1]); x.lineTo(Wr[0] + sd * 2, Wr[1] - 5); x.lineTo(Wr[0] + sd * 3.5, Wr[1] - 1); x.fill(); // Daumenkralle
    }
    // Leib: pelzig, Licht von oben, heller Brustlatz
    const bg = x.createRadialGradient(CX - 3, 30, 3, CX, 38, 18); bg.addColorStop(0, '#6c4078'); bg.addColorStop(0.6, '#38183e'); bg.addColorStop(1, '#14061a');
    x.fillStyle = bg; x.beginPath(); x.ellipse(CX, 38, 12, 18, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(160,110,120,0.35)'; x.beginPath(); x.ellipse(CX, 36, 6, 9, 0, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(30,8,36,0.7)'; x.lineWidth = 1; for (let k = 0; k < 14; k++) { const a = k * 0.9, r = 6 + (k % 4) * 2; x.beginPath(); x.moveTo(CX + Math.cos(a) * r, 38 + Math.sin(a) * r * 1.4); x.lineTo(CX + Math.cos(a) * (r + 2.5), 38 + Math.sin(a) * (r + 2.5) * 1.4 + 1); x.stroke(); } // Fellstriche
    for (const sd of [-1, 1]) { x.strokeStyle = '#1c0a26'; x.lineWidth = 2; x.beginPath(); x.moveTo(CX + sd * 5, 54); x.lineTo(CX + sd * 7, 60); x.stroke(); x.fillStyle = '#e8d8c0'; x.fillRect(CX + sd * 7 - 1, 60, 2, 2); } // Füße mit Krallen
    // Kopf mit großen Ohren
    for (const sd of [-1, 1]) {
      x.fillStyle = '#2a0e32'; x.beginPath(); x.moveTo(CX + sd * 3, 14); x.lineTo(CX + sd * 12, -1 + (sleep ? 6 : 0)); x.lineTo(CX + sd * 11, 16); x.closePath(); x.fill();
      x.fillStyle = '#b05878'; x.beginPath(); x.moveTo(CX + sd * 5, 14); x.lineTo(CX + sd * 11, 3 + (sleep ? 6 : 0)); x.lineTo(CX + sd * 10, 15); x.closePath(); x.fill();
    }
    const hg = x.createRadialGradient(CX - 2, 15, 2, CX, 18, 10); hg.addColorStop(0, '#6c3c78'); hg.addColorStop(1, '#1c0824');
    x.fillStyle = hg; x.beginPath(); x.ellipse(CX, 18, 9, 8, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#3c1c44'; x.beginPath(); x.ellipse(CX, 23, 4.5, 3.2, 0, 0, Math.PI * 2); x.fill(); // Schnauze
    x.fillStyle = '#7c3c64'; x.beginPath(); x.moveTo(CX, 18); x.lineTo(CX - 2, 22); x.lineTo(CX + 2, 22); x.fill(); // Nasenblatt
    if (sleep) { x.strokeStyle = '#140610'; x.lineWidth = 1; for (const sd of [-1, 1]) { x.beginPath(); x.moveTo(CX + sd * 2, 17); x.lineTo(CX + sd * 6, 16); x.stroke(); } }
    else for (const sd of [-1, 1]) { // glühende Augen
      const eg = x.createRadialGradient(CX + sd * 4, 16, 0, CX + sd * 4, 16, 5); eg.addColorStop(0, 'rgba(255,90,60,0.9)'); eg.addColorStop(1, 'rgba(255,0,0,0)');
      x.fillStyle = eg; x.fillRect(CX + sd * 4 - 5, 11, 10, 10);
      x.fillStyle = '#fc2c2c'; x.beginPath(); x.ellipse(CX + sd * 4, 16, 2.2, 1.6, sd * -0.3, 0, Math.PI * 2); x.fill(); x.fillStyle = '#fcfcfc'; x.fillRect(CX + sd * 4 - 1, 15, 1, 1);
    }
    if (open) { x.fillStyle = '#4c0010'; x.beginPath(); x.ellipse(CX, 26, 4, 3.4, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#c8204c'; x.fillRect(CX - 2, 27, 4, 1); x.fillStyle = '#fcfcfc'; for (const d of [-3, -1, 1, 3]) x.fillRect(CX + d - (d > 0 ? 1 : 0), d * d > 4 ? 23 : 28, 1, 2); }
    else { x.fillStyle = '#fcfcfc'; x.fillRect(CX - 3, 25, 1, 2); x.fillRect(CX + 2, 25, 1, 2); }
    if (sleep) { // Flügel um den Leib geschlagen, kopfüber hängend
      for (const sd of [-1, 1]) { const g2 = x.createLinearGradient(CX + sd * 18, 20, CX, 60); g2.addColorStop(0, '#2c1036'); g2.addColorStop(1, '#4c2058'); x.fillStyle = g2; x.beginPath(); x.moveTo(CX + sd * 4, 20); x.quadraticCurveTo(CX + sd * 20, 30, CX + sd * 10, 62); x.lineTo(CX, 60); x.closePath(); x.fill(); }
    }
    return Sprites.fromCanvas(c);
  }
  const ph = [0, 1, 2, 3, 4, 5, 6, 7].map(i => i / 8);
  Sprites.S.gbatX = { flap: ph.map(p => frame(p, false)), open: ph.map(p => frame(p, true)), fold: frame(0, false, true) };
})();

// Kleine Fledermäuse, die beim Tod der Riesenfledermaus auseinanderstieben (nur Effekt)
class SwarmBat extends Ent {
  constructor(x, y) {
    super(x, y, 8, 8);
    const a = Math.random() * Math.PI * 2, sp = 1 + Math.random() * 1.8;
    this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp - 0.6; this.ph = Math.random() * 6;
  }
  update() { this.t++; this.x += this.vx; this.y += this.vy + Math.sin(this.t * 0.3 + this.ph) * 0.8; if (this.t > 150) this.dead = true; }
  draw(ctx) { const s = Sprites.S.bat3d.fly[Math.floor(this.t / 1.5 + this.ph * 3) % 16]; Sprites.draw(ctx, s, Math.round(this.x - s.w / 2 - W.cam.x), Math.round(this.y - s.h / 2 - W.cam.y), this.vx < 0); }
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
    super(ax + aw / 2 - 24, 30, 48, 24, 16, 3);
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
      const f = Math.floor(this.t / (fast ? 2 : 3)) % G.flap.length;
      s = (this.state === 'swoop' || this.state === 'shoot') ? G.open[f] : G.flap[f];
      if (f === 4 && this.t % 24 === 0) Audio8.sfx('flap', this.cx);
    }
    ctx.globalAlpha = 0.5;
    const aura = FX.disc(36, [60, 10, 90], [0.6, 0.38, 0.2, 0.08]);
    ctx.drawImage(aura, x - 36, y - 30);
    ctx.globalAlpha = 1;
    this.ds(ctx, s, x - 64, y - 32, false, this.flash);
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

// ---------------- Graf Nachtmahr, gemalt mit weichen Verläufen (100×88), Kanten pixelhart ----------------
// Hageres, bleiches Gesicht mit hohen Wangenknochen, Adlernase, Witwenspitze, silbernen Schläfen und spitzen Ohren; tief
// liegende rote Augen, schmale dunkelrote Lippen mit Fängen. Hoher Stehkragen mit blutrotem Futter und Goldkante, Frack aus
// schwarzem Satin mit glänzenden Revers, Brokatweste mit Goldknöpfen, Jabot, Goldkette mit Blutstein-Medaillon, polierte
// Stiefel. Der Samtumhang fällt geschlossen in schweren Falten, geöffnet spannt er sich wie Fledermausflügel mit
// Knochenrippen und gezacktem Saum, beim Zaubern reißt der Graf ihn über den Kopf.
const COUNT_ART = (() => {
  const W = 100, H = 88, cx = 50;
  function paint(pose) {
    const c = Sprites.canvas(W, H), x = c.getContext('2d');
    const G = (x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const RG = (x0, y0, r0, x1, y1, r1, st) => { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const poly = (pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); };
    const fillPoly = (pts, style) => { poly(pts); x.fillStyle = style; x.fill(); };
    const stroke = (pts, col, w) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.lineJoin = 'round'; x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.stroke(); };
    const disc = (px, py, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, Math.max(0.3, r), 0, Math.PI * 2); x.fill(); };
    const VELVET = (x0, x1) => G(x0, 0, x1, 0, [[0, '#5a4478'], [0.18, '#36264c'], [0.55, '#1c1228'], [1, '#07040c']]);
    const claw = (hx, hy, dir, up) => { // bleiche Hand mit langen Krallen
      disc(hx, hy, 2.6, '#6c6488'); disc(hx - 0.4, hy - 0.4, 2.1, '#c8c0dc'); disc(hx - 0.8, hy - 0.8, 0.9, '#f0ecfc');
      for (let k = -1; k <= 2; k++) {
        const a = (up ? -Math.PI / 2 : Math.PI / 2) + dir * (0.5 - k * 0.32), len = 4.2 + (k === 1 ? 1 : 0);
        const fx = hx + Math.cos(a) * len, fy = hy + Math.sin(a) * len;
        stroke([[hx, hy], [fx, fy]], '#a8a0c0', 1.1); disc(fx + Math.cos(a) * 0.8, fy + Math.sin(a) * 0.8, 0.55, '#f4ecd8');
      }
    };
    // ---------- Umhang hinten ----------
    if (pose === 'closed') {
      const cape = [[cx - 13, 29], [cx - 21, 50, cx - 25.5, 86], [cx - 19, 88, cx - 13, 86], [cx - 7, 88.5, cx, 86.5], [cx + 7, 88.5, cx + 13, 86], [cx + 19, 88, cx + 25.5, 86], [cx + 21, 50, cx + 13, 29]];
      fillPoly(cape, VELVET(cx - 25, cx + 25));
      x.save(); poly(cape); x.clip();
      for (const f of [-19, -12, -6, 6, 12, 19]) { // schwere Samtfalten: Lichtkante + Schattenrinne
        stroke([[cx + f * 0.45, 31], [cx + f * 0.8, 58, cx + f, 88]], 'rgba(150,120,200,0.22)', 1.6);
        stroke([[cx + f * 0.45 + 1.4, 31], [cx + f * 0.8 + 1.4, 58, cx + f + 1.6, 88]], 'rgba(0,0,0,0.38)', 1.4);
      }
      x.restore();
      stroke([[cx - 13, 29], [cx - 21, 50, cx - 25.5, 86]], '#7c64a4', 0.9); // Lichtkante links
    } else {
      const lift = pose === 'cast';
      for (const s of [-1, 1]) { // Flügel: Schulter → Hand → gezackter Saum bis zum Boden
        const sh = [cx + s * 10, 30], hand = lift ? [cx + s * 15, 3] : [cx + s * 39, 22], tip = [cx + s * (lift ? 47 : 46), lift ? 70 : 64];
        const scal = [], n = 4;
        for (let k = 0; k <= n; k++) { const t = k / n, bx = tip[0] + (cx + s * 13 - tip[0]) * t, by = tip[1] + (87 - tip[1]) * t; scal.push([bx, by]); if (k < n) scal.push([bx + (cx + s * 13 - tip[0]) / n * 0.5 - s * 2, by + (87 - tip[1]) / n * 0.5 - 6]); }
        const outer = [sh, hand, tip, ...scal, [cx + s * 12, 87], [cx + s * 9, 40]];
        fillPoly(outer, G(hand[0], hand[1], cx, 80, [[0, '#2c1c40'], [1, '#07040c']])); // schwarzer Außenstoff
        const inner = [[sh[0] + s * 1.2, sh[1] + 2.2], [hand[0] - s * 1.2, hand[1] + 2.4], [tip[0] - s * 2.2, tip[1] - 1], ...scal.map(([a, b]) => [a - s * 2, b - 2]), [cx + s * 12, 85], [cx + s * 9, 41.5]];
        fillPoly(inner, RG(hand[0], hand[1], 2, hand[0], hand[1], 70, [[0, '#ff5a6a'], [0.25, '#d01c34'], [0.6, '#8c0c20'], [1, '#3c0010']])); // blutrotes Futter, am Arm am hellsten
        x.save(); poly(inner); x.clip();
        scal.filter((_, i) => i % 2 === 0).forEach(([a, b], i) => { // zwischen den Rippen gespannte, leicht durchhängende Bahnen
          if (i % 2) fillPoly([[hand[0], hand[1]], [a - s * 1, b - 2], scal[Math.min(scal.length - 1, i * 2 + 2)]], 'rgba(30,0,10,0.22)');
        });
        x.restore();
        for (const [a, b] of scal.filter((_, i) => i % 2 === 0)) { // Knochenrippen mit Glanz
          stroke([[hand[0], hand[1] + 1], [a - s * 1, b - 2]], '#2c0010', 1.5);
          stroke([[hand[0] - s * 0.6, hand[1] + 0.6], [a - s * 1.6, b - 2.6]], 'rgba(255,140,150,0.75)', 0.6);
        }
        stroke([[sh[0], sh[1] + 1.5], [hand[0], hand[1] + 1.5]], 'rgba(255,170,180,0.6)', 0.7); // Glanzkante oben
        // Arm im Ärmel entlang der Oberkante, Manschette, Krallenhand
        stroke([sh, hand], '#08070c', 3.4); stroke([[sh[0], sh[1] - 0.6], [hand[0], hand[1] - 0.6]], '#3c3850', 1.2);
        disc(hand[0] - s * 1.6, hand[1], 1.6, '#f0ece4');
        claw(hand[0] + s * 1, hand[1] - (lift ? 2 : 0), s, lift);
      }
    }
    // ---------- Beine, polierte Stiefel ----------
    for (const s of [-1, 1]) {
      fillPoly([[cx + s * 1.2, 60], [cx + s * 7, 60], [cx + s * 6.4, 82], [cx + s * 1.8, 82]], G(cx + s * 1, 0, cx + s * 7, 0, s < 0 ? [[0, '#14121c'], [1, '#3c3850']] : [[0, '#2c2838'], [1, '#08070c']]));
      stroke([[cx + s * 4.2, 62], [cx + s * 4.1, 81]], s < 0 ? '#5c5874' : '#2c2838', 0.6); // Bügelfalte
      fillPoly([[cx + s * 1.4, 81], [cx + s * 6.8, 81], [cx + s * 7.6, 85], [cx + s * 8.4, 87.5], [cx + s * 0.8, 87.5]], G(0, 81, 0, 88, [[0, '#24202e'], [1, '#040306']]));
      x.fillStyle = 'rgba(200,196,230,0.75)'; x.beginPath(); x.ellipse(cx + s * 3.5, 83.6, 1.3, 0.5, 0, 0, Math.PI * 2); x.fill(); // Glanz auf dem Stiefel
    }
    // ---------- Rumpf: Frack aus Satin, Revers, Brokatweste, Jabot, Medaillon ----------
    fillPoly([[cx - 11, 30], [cx + 11, 30], [cx + 8.5, 63], [cx - 8.5, 63]], G(cx - 11, 0, cx + 11, 0, [[0, '#4c4860'], [0.3, '#24202e'], [1, '#050408']]));
    for (const s of [-1, 1]) fillPoly([[cx + s * 3, 30], [cx + s * 9, 31], [cx + s * 4.2, 47]], G(cx + s * 3, 30, cx + s * 7, 44, s < 0 ? [[0, '#8c88a8'], [0.4, '#3c3850'], [1, '#14121c']] : [[0, '#3c3850'], [1, '#08070c']])); // glänzende Revers
    fillPoly([[cx - 4, 33], [cx + 4, 33], [cx + 3.6, 58], [cx - 3.6, 58]], G(cx - 4, 0, cx + 4, 0, [[0, '#b01c34'], [0.5, '#7c0c20'], [1, '#3c0410']])); // Brokatweste
    for (let y = 35; y < 57; y += 2) for (let X = cx - 3 + ((y >> 1) & 1); X < cx + 3; X += 2) { x.fillStyle = 'rgba(232,180,60,0.45)'; x.fillRect(X, y, 0.8, 0.8); }
    for (let k = 0; k < 4; k++) { disc(cx, 43 + k * 4, 0.9, '#8c6010'); disc(cx - 0.3, 42.7 + k * 4, 0.45, '#fcec9c'); } // Goldknöpfe
    for (let k = 0; k < 6; k++) { const y = 28.5 + k * 1.7, w = 2.4 + (k % 2) * 0.8; x.fillStyle = '#9c94b4'; x.beginPath(); x.ellipse(cx + 0.3, y + 0.5, w, 1.1, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = '#f6f2ea'; x.beginPath(); x.ellipse(cx - 0.2, y, w - 0.3, 0.9, 0, 0, Math.PI * 2); x.fill(); } // Jabot in Rüschen
    stroke([[cx - 6, 31.5], [cx - 3, 37, cx, 40]], '#c89020', 0.8); stroke([[cx + 6, 31.5], [cx + 3, 37, cx, 40]], '#8c6010', 0.8); // Goldkette
    disc(cx, 41.5, 3, '#6c4c08'); disc(cx - 0.2, 41.3, 2.5, G(cx - 2.5, 39, cx + 2.5, 44, [[0, '#fcec9c'], [1, '#a87010']]));
    x.fillStyle = RG(cx - 0.6, 40.8, 0.2, cx, 41.5, 1.9, [[0, '#ffc0c8'], [0.35, '#f02040'], [1, '#600010']]); x.beginPath(); x.arc(cx, 41.5, 1.8, 0, Math.PI * 2); x.fill(); // Blutstein
    if (pose === 'closed') { // vorn schließt sich der Umhang bis auf einen Spalt; eine Hand hält ihn zu
      for (const s of [-1, 1]) {
        const panel = [[cx + s * 2, 31], [cx + s * 13, 29], [cx + s * 21, 50, cx + s * 25.5, 86], [cx + s * 16, 88.5, cx + s * 6.5, 86.5], [cx + s * 4, 60, cx + s * 2, 31]];
        fillPoly(panel, VELVET(cx - 25, cx + 25));
        x.save(); poly(panel); x.clip();
        for (const f of [9, 15, 21]) { stroke([[cx + s * f * 0.5, 32], [cx + s * f * 0.85, 60, cx + s * f, 88]], 'rgba(150,120,200,0.22)', 1.6); stroke([[cx + s * f * 0.5 + 1.4, 32], [cx + s * f * 0.85 + 1.4, 60, cx + s * f + 1.6, 88]], 'rgba(0,0,0,0.4)', 1.4); }
        x.restore();
        stroke([[cx + s * 2, 31], [cx + s * 4, 60, cx + s * 6.5, 86.5]], s < 0 ? '#e03848' : '#901022', 1.2); // rotes Futter an der Kante
      }
      stroke([[cx - 13, 29], [cx - 21, 50, cx - 25.5, 86]], '#7c64a4', 0.9);
      claw(cx + 4, 46, -1, false); disc(cx + 6.5, 45, 1.6, '#f0ece4');
    }
    // ---------- Stehkragen hinter dem Kopf ----------
    for (const s of [-1, 1]) {
      fillPoly([[cx + s * 6, 30], [cx + s * 9.5, 30], [cx + s * 18, 1.5], [cx + s * 13.5, 5.5], [cx + s * 6, 22]], '#120a1c');
      fillPoly([[cx + s * 7, 28], [cx + s * 9.2, 28], [cx + s * 16, 5], [cx + s * 12.5, 8.4], [cx + s * 7, 21]], G(cx + s * 7, 28, cx + s * 15, 5, s < 0 ? [[0, '#640816'], [0.5, '#c81c34'], [1, '#ff5a6a']] : [[0, '#3c0010'], [0.6, '#901022'], [1, '#c81c34']]));
      stroke([[cx + s * 9.5, 30], [cx + s * 18, 1.5]], s < 0 ? '#fcec9c' : '#c89020', 0.8);
    }
    // ---------- Kopf ----------
    fillPoly([[cx - 3.2, 22], [cx + 3.2, 22], [cx + 3, 30], [cx - 3, 30]], G(cx - 3, 0, cx + 3, 0, [[0, '#c8c0dc'], [1, '#5c5478']])); // Hals
    for (const s of [-1, 1]) { fillPoly([[cx + s * 6.4, 12], [cx + s * 11.5, 7.5], [cx + s * 7, 17]], s < 0 ? '#b8b0cc' : '#6c6488'); stroke([[cx + s * 7, 13.5], [cx + s * 10, 9.5]], s < 0 ? '#f0ecfc' : '#8c84a4', 0.5); } // spitze Ohren
    const face = () => { x.beginPath(); x.moveTo(cx, 5.2); x.bezierCurveTo(cx + 5.6, 5.2, cx + 7.4, 9.5, cx + 7.2, 14); x.bezierCurveTo(cx + 7, 18.5, cx + 5.4, 22, cx + 3.2, 24.2); x.quadraticCurveTo(cx, 26.4, cx - 3.2, 24.2); x.bezierCurveTo(cx - 5.4, 22, cx - 7, 18.5, cx - 7.2, 14); x.bezierCurveTo(cx - 7.4, 9.5, cx - 5.6, 5.2, cx, 5.2); x.closePath(); };
    face(); x.fillStyle = RG(cx - 3, 11, 0.8, cx + 0.5, 15, 12, [[0, '#fbf8ff'], [0.35, '#d8d2ec'], [0.72, '#9a92b6'], [1, '#5a5276']]); x.fill();
    x.save(); face(); x.clip();
    for (const s of [-1, 1]) { x.fillStyle = s > 0 ? 'rgba(40,24,64,0.5)' : 'rgba(40,24,64,0.32)'; x.beginPath(); x.ellipse(cx + s * 5, 19.4, 2.1, 3.6, s * 0.25, 0, Math.PI * 2); x.fill(); } // eingefallene Wangen
    x.fillStyle = 'rgba(255,255,255,0.55)'; x.beginPath(); x.ellipse(cx - 4.4, 15.6, 1.8, 0.8, -0.35, 0, Math.PI * 2); x.fill(); // Wangenknochen
    x.restore();
    // Haar: zurückgekämmt, blauschwarz glänzend, Witwenspitze, silberne Schläfen
    x.beginPath(); x.moveTo(cx - 7.6, 13.5); x.bezierCurveTo(cx - 8.4, 6.5, cx - 4.5, 2.8, cx, 2.8); x.bezierCurveTo(cx + 4.5, 2.8, cx + 8.4, 6.5, cx + 7.6, 13.5); x.lineTo(cx + 6.4, 10.6); x.quadraticCurveTo(cx + 3, 8.4, cx, 11.8); x.quadraticCurveTo(cx - 3, 8.4, cx - 6.4, 10.6); x.closePath();
    x.fillStyle = G(cx - 7, 3, cx + 5, 12, [[0, '#4c4c78'], [0.3, '#16142a'], [1, '#040308']]); x.fill();
    stroke([[cx - 5.6, 5.2], [cx - 2, 3.8, cx + 2.6, 4.4]], 'rgba(160,170,230,0.7)', 0.6); // Glanz im Haar
    for (const s of [-1, 1]) stroke([[cx + s * 7.3, 12.6], [cx + s * 7.8, 9, cx + s * 6.2, 6.6]], s < 0 ? '#d8d4ec' : '#8c88a8', 0.9); // silberne Schläfen
    // Augen: tiefe Höhlen, rot glühend, scharfe Brauen
    for (const s of [-1, 1]) {
      const ex = cx + s * 3.2, ey = 15.2;
      x.fillStyle = RG(ex, ey, 0.4, ex, ey, 2.8, [[0, 'rgba(30,8,30,0.95)'], [1, 'rgba(60,30,80,0)']]); x.beginPath(); x.ellipse(ex, ey, 2.9, 2.1, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = RG(ex, ey, 0.1, ex, ey, 1.4, [[0, '#ffe0e0'], [0.35, '#ff2a2a'], [1, '#7c0000']]); x.beginPath(); x.ellipse(ex + s * 0.2, ey, 1.4, 0.75, 0, 0, Math.PI * 2); x.fill();
      stroke([[cx + s * 1.2, 13.4], [cx + s * 3.5, 12.4, cx + s * 6.2, 11.2]], '#06040a', 0.9); // böse Brauen, zur Mitte gesenkt
    }
    stroke([[cx - 0.5, 15.5], [cx - 0.2, 18.5, cx + 0.7, 20]], '#ffffff', 0.5); stroke([[cx + 0.6, 15.8], [cx + 1.2, 19.2]], '#7c7498', 0.6); disc(cx + 0.9, 20.2, 0.5, '#5a5276'); // Adlernase
    x.fillStyle = '#4c0814'; x.beginPath(); x.moveTo(cx - 3, 22.4); x.quadraticCurveTo(cx, 21.6, cx + 3.2, 22.1); x.quadraticCurveTo(cx, 23.6, cx - 3, 22.4); x.fill(); // schmale Lippen, leicht höhnisch
    x.fillStyle = '#9c1c34'; x.fillRect(cx - 1.8, 22.6, 3.4, 0.6);
    x.fillStyle = '#fcfcf0'; x.beginPath(); x.moveTo(cx - 2, 22.5); x.lineTo(cx - 1.2, 22.5); x.lineTo(cx - 1.6, 24.4); x.fill(); x.beginPath(); x.moveTo(cx + 1.3, 22.5); x.lineTo(cx + 2.1, 22.5); x.lineTo(cx + 1.7, 24.4); x.fill(); // Fänge
    // Pixel-Look: weiche Kanten der Flächen weg (Alpha hart), Verläufe bleiben
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
    this.nameKey = 'boss4'; this.voice = 'boss3'; // Boss von Stage 4; die Studioaufnahme heißt noch boss3
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

// ---------------- Medusa: Herrin der Marmorgalerie (Ende von Stage 3) ----------------
// Vorgemalt mit weichen Verläufen (wie die Riesenfledermaus), Kanten pixelhart: schlanke Gorgo mit schuppiger, nach unten
// dunkler werdender Haut, breitem Goldkragen mit Perlen, Schuppenmieder mit Goldsaum, Goldgürtel mit Rubin, darunter die
// hellen Bauchschilde des Schlangenleibs. Ovales Gesicht mit hohen Wangenknochen, Mandelaugen mit Lidstrich, gelb glühende
// Schlitzpupillen, dunkle Lippen mit Fängen, Flossenohren, Diadem mit Kobra. Live gezeichnet: der geschuppte Schlangenleib
// mit Rautenmuster und zehn Schlangen im Haar (fünf hinter, fünf vor dem Kopf).
// Angriffe: Schlangen fallen aus dem Haar und kriechen auf den Helden zu; der versteinernde Blick – eine Lichtwelle am
// Boden (drüberspringen) oder in Kopfhöhe (ducken); wer getroffen wird, erstarrt zu Stein und muss sich freistrampeln.
// Ab der Hälfte fliegen Medusenköpfe in Wellen heran und die Blicke kommen doppelt.
const MEDUSA_ART = (() => {
  const W0 = 72, H0 = 64, cx = 36;
  let art = null;
  function paint(open) {
    const c = Sprites.canvas(W0, H0), x = c.getContext('2d');
    const G = (x0, y0, x1, y1, st) => { const g = x.createLinearGradient(x0, y0, x1, y1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const RG = (x0, y0, r0, x1, y1, r1, st) => { const g = x.createRadialGradient(x0, y0, r0, x1, y1, r1); st.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const path = (pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) p.length === 4 ? x.quadraticCurveTo(p[0], p[1], p[2], p[3]) : x.lineTo(p[0], p[1]); x.closePath(); };
    const disc = (px, py, r, col) => { x.fillStyle = col; x.beginPath(); x.arc(px, py, Math.max(0.3, r), 0, Math.PI * 2); x.fill(); };
    const ellipse = (px, py, rx, ry, col, rot = 0) => { x.fillStyle = col; x.beginPath(); x.ellipse(px, py, rx, ry, rot, 0, Math.PI * 2); x.fill(); };
    // schlanker Arm als weich schattierter Schlauch (Umriss, Grundton, Licht, Glanz), mit Goldreif und Krallenhand
    const arm = (pts, w0, w1, band, up) => {
      const along = (f) => { // Punkte entlang der Linie mit Breite
        const L = []; let tot = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
        let acc = 0; for (let i = 1; i < pts.length; i++) { const n = Math.ceil(seg[i - 1] * 3); for (let k = 0; k <= n; k++) { const t = k / n; L.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, w0 + (w1 - w0) * (acc + seg[i - 1] * t) / tot]); } acc += seg[i - 1]; }
        L.forEach(f);
      };
      along(([px, py, w]) => disc(px, py, w / 2 + 0.7, '#163626'));
      along(([px, py, w]) => disc(px, py, w / 2, '#4c8c64'));
      along(([px, py, w]) => disc(px - w * 0.15, py - w * 0.18, w * 0.32, '#8ccc9c'));
      along(([px, py, w]) => disc(px - w * 0.22, py - w * 0.25, w * 0.12, '#d0f4d4'));
      const [bx, by] = pts[band], [b2x, b2y] = pts[band + 1], bt = 0.35, gx = bx + (b2x - bx) * bt, gy = by + (b2y - by) * bt;
      disc(gx, gy, w0 * 0.55, '#6c4c08'); disc(gx - 0.3, gy - 0.3, w0 * 0.45, '#d8a028'); disc(gx - 0.6, gy - 0.6, w0 * 0.18, '#fcec9c'); // Goldreif
      const [hx, hy] = pts[pts.length - 1], [px0, py0] = pts[pts.length - 2], a = Math.atan2(hy - py0, hx - px0);
      for (let k = -1.5; k <= 1.5; k++) { // vier Krallenfinger, gespreizt
        const fa = a + k * 0.38 + (up ? -0.15 : 0.15), fx = hx + Math.cos(fa) * 3.6, fy = hy + Math.sin(fa) * 3.6;
        x.strokeStyle = '#4c8c64'; x.lineWidth = 1.3; x.lineCap = 'round'; x.beginPath(); x.moveTo(hx, hy); x.lineTo(fx, fy); x.stroke();
        disc(fx + Math.cos(fa) * 0.9, fy + Math.sin(fa) * 0.9, 0.6, '#f0e8d0');
      }
      disc(hx, hy, w1 * 0.75, '#5c9c74'); disc(hx - 0.4, hy - 0.4, w1 * 0.35, '#a0dcac');
    };
    // ---------- Haaransatz hinter dem Kopf (die Schlangen wachsen live daraus) ----------
    ellipse(cx, 10.5, 9.5, 8, '#163a28'); ellipse(cx - 1.5, 8.5, 7, 5.5, '#245c3c');
    // ---------- Rumpf: Wespentaille, Licht von links oben ----------
    const torso = () => path([[cx - 12, 28], [cx - 14.5, 30.5, cx - 13, 36], [cx - 9.5, 43, cx - 8, 47], [cx - 11.5, 53, cx - 12.5, 61], [cx + 12.5, 61], [cx + 11.5, 53, cx + 8, 47], [cx + 9.5, 43, cx + 13, 36], [cx + 14.5, 30.5, cx + 12, 28], [cx, 25.5, cx - 12, 28]]);
    torso(); x.fillStyle = '#163626'; x.fill(); x.save(); x.translate(0.6, 0.2); x.scale(0.985, 0.99); x.restore();
    torso(); x.fillStyle = G(cx - 14, 0, cx + 14, 0, [[0, '#b4e4bc'], [0.3, '#86c496'], [0.68, '#4c8c64'], [1, '#22503a']]); x.fill();
    x.save(); torso(); x.clip();
    x.fillStyle = G(0, 40, 0, 61, [[0, 'rgba(14,40,26,0)'], [1, 'rgba(14,40,26,0.62)']]); x.fillRect(0, 40, W0, 22); // unten dunkler: Übergang zum Schlangenleib
    x.strokeStyle = 'rgba(12,40,24,0.55)'; x.lineWidth = 0.8; // Schuppen ab der Hüfte
    for (let r = 0, y = 48; y < 61; y += 2.4, r++) for (let X = cx - 13 + (r & 1) * 1.6; X < cx + 13; X += 3.2) { x.beginPath(); x.arc(X, y, 1.6, 0.15, Math.PI - 0.15); x.stroke(); }
    for (let y = 50; y < 61; y += 2) { x.fillStyle = (y >> 1) & 1 ? '#c8d490' : '#a8b878'; x.beginPath(); x.ellipse(cx, y, 4.2 - (61 - y) * 0.08, 0.9, 0, 0, Math.PI * 2); x.fill(); } // helle Bauchschilde
    disc(cx - 6, 33, 5, 'rgba(220,255,225,0.18)'); // Glanz auf der Schulter
    x.restore();
    // ---------- Schuppenmieder mit Goldsaum (Herzausschnitt) ----------
    const bod = () => path([[cx - 10.5, 32], [cx - 11, 38, cx - 8.5, 43], [cx - 3, 44.5, cx, 42.5], [cx + 3, 44.5, cx + 8.5, 43], [cx + 11, 38, cx + 10.5, 32], [cx + 6, 30, cx + 2.5, 34], [cx, 36.5, cx, 36.5], [cx - 2.5, 34, cx - 2.5, 34], [cx - 6, 30, cx - 10.5, 32]]);
    bod(); x.fillStyle = G(cx - 11, 32, cx + 11, 44, [[0, '#3c9c80'], [0.45, '#1c6c58'], [1, '#0c3830']]); x.fill();
    x.save(); bod(); x.clip(); x.strokeStyle = 'rgba(160,240,210,0.35)'; x.lineWidth = 0.7;
    for (let r = 0, y = 33; y < 45; y += 2, r++) for (let X = cx - 11 + (r & 1) * 1.4; X < cx + 11; X += 2.8) { x.beginPath(); x.arc(X, y, 1.3, 0.2, Math.PI - 0.2); x.stroke(); }
    x.restore();
    bod(); x.strokeStyle = '#d8a028'; x.lineWidth = 1; x.stroke();
    // ---------- Goldgürtel mit Rubin-Anhänger ----------
    x.fillStyle = G(0, 45, 0, 48.5, [[0, '#fcec9c'], [0.4, '#d8a028'], [1, '#6c4c08']]); x.beginPath(); x.moveTo(cx - 9, 45.2); x.quadraticCurveTo(cx, 47.8, cx + 9, 45.2); x.lineTo(cx + 9, 47.6); x.quadraticCurveTo(cx, 50.2, cx - 9, 47.6); x.closePath(); x.fill();
    x.fillStyle = RG(cx - 0.5, 50, 0.2, cx, 50.8, 2.4, [[0, '#ffb0c0'], [0.35, '#e0204c'], [1, '#600018']]); x.beginPath(); x.moveTo(cx, 47.5); x.quadraticCurveTo(cx + 2.4, 50.5, cx, 53); x.quadraticCurveTo(cx - 2.4, 50.5, cx, 47.5); x.fill();
    // ---------- Arme ----------
    if (open) { // fauchend: eine Kralle hoch erhoben, die andere zur Seite gespreizt
      arm([[cx - 11.5, 30.5], [cx - 19.5, 27], [cx - 25, 17.5]], 4.4, 3, 1, true);
      arm([[cx + 11.5, 30.5], [cx + 18.5, 36.5], [cx + 25, 31]], 4.4, 3, 1, true);
    } else { // lauernd: eine Kralle nach vorn gereckt, die andere an der Hüfte
      arm([[cx - 11.5, 30.5], [cx - 18.5, 40], [cx - 26, 36]], 4.4, 3, 1, false);
      arm([[cx + 11.5, 30.5], [cx + 16.5, 40.5], [cx + 11, 47.5]], 4.4, 3, 1, false);
    }
    // ---------- Hals ----------
    x.fillStyle = G(cx - 3.5, 0, cx + 3.5, 0, [[0, '#a8dcb0'], [0.6, '#5c9c74'], [1, '#2c5c44']]); x.fillRect(cx - 3.2, 20, 6.4, 9);
    x.fillStyle = 'rgba(12,40,24,0.55)'; x.beginPath(); x.ellipse(cx + 0.5, 21.5, 3.6, 1.6, 0, 0, Math.PI * 2); x.fill(); // Schatten unter dem Kinn
    // ---------- breiter Goldkragen mit Perlen ----------
    x.lineCap = 'round';
    x.strokeStyle = '#4c3404'; x.lineWidth = 4.6; x.beginPath(); x.moveTo(cx - 11, 28.6); x.quadraticCurveTo(cx, 36, cx + 11, 28.6); x.stroke();
    x.strokeStyle = G(cx - 11, 26, cx + 11, 34, [[0, '#fcec9c'], [0.35, '#e0b030'], [0.75, '#a87010'], [1, '#6c4c08']]); x.lineWidth = 3.4; x.beginPath(); x.moveTo(cx - 11, 28.6); x.quadraticCurveTo(cx, 36, cx + 11, 28.6); x.stroke();
    for (let k = 0; k <= 10; k++) { const t = k / 10, bx = (1 - t) ** 2 * (cx - 11) + 2 * (1 - t) * t * cx + t * t * (cx + 11), by = (1 - t) ** 2 * 28.6 + 2 * (1 - t) * t * 36 + t * t * 28.6; disc(bx, by + 1.2, 0.75, k % 2 ? '#3cc8b0' : '#e0204c'); disc(bx - 0.25, by + 0.95, 0.25, '#ffffff'); }
    x.fillStyle = RG(cx - 0.6, 32, 0.2, cx, 32.6, 2.2, [[0, '#ffb0c0'], [0.4, '#e0204c'], [1, '#600018']]); x.beginPath(); x.arc(cx, 32.6, 1.9, 0, Math.PI * 2); x.fill(); // Rubin
    // ---------- Kopf: ovales Gesicht, hohe Wangenknochen ----------
    for (const s of [-1, 1]) { // Flossenohren
      x.fillStyle = '#2c6c48'; x.beginPath(); x.moveTo(cx + s * 6.6, 10.5); x.lineTo(cx + s * 11, 7.2); x.lineTo(cx + s * 10, 10); x.lineTo(cx + s * 11.2, 12.2); x.lineTo(cx + s * 6.8, 15.5); x.closePath(); x.fill();
      x.strokeStyle = '#5ca878'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(cx + s * 7, 12); x.lineTo(cx + s * 10.4, 8.4); x.stroke();
    }
    const face = () => { x.beginPath(); x.moveTo(cx, 4.2); x.bezierCurveTo(cx + 5.5, 4.2, cx + 7.8, 8.5, cx + 7.4, 12.8); x.bezierCurveTo(cx + 7, 17.5, cx + 4.6, 21.5, cx, 23.6); x.bezierCurveTo(cx - 4.6, 21.5, cx - 7, 17.5, cx - 7.4, 12.8); x.bezierCurveTo(cx - 7.8, 8.5, cx - 5.5, 4.2, cx, 4.2); x.closePath(); };
    face(); x.fillStyle = '#163626'; x.save(); x.translate(cx, 13.5); x.scale(1.12, 1.07); x.translate(-cx, -13.5); x.fill(); x.restore();
    face(); x.fillStyle = RG(cx - 3, 9.5, 0.8, cx + 0.5, 13.5, 11.5, [[0, '#d8f8dc'], [0.4, '#9cd4a6'], [0.78, '#5c9c72'], [1, '#356a4c']]); x.fill();
    x.save(); face(); x.clip();
    x.fillStyle = 'rgba(16,48,30,0.38)'; x.beginPath(); x.ellipse(cx + 4.6, 17.5, 2.6, 3.4, 0.3, 0, Math.PI * 2); x.fill(); x.beginPath(); x.ellipse(cx - 5.2, 17.8, 1.6, 2.6, -0.3, 0, Math.PI * 2); x.fill(); // eingefallene Wangen
    x.fillStyle = 'rgba(236,255,236,0.6)'; x.beginPath(); x.ellipse(cx - 4.2, 14, 1.8, 0.9, -0.4, 0, Math.PI * 2); x.fill(); // Wangenknochen-Glanz
    x.fillStyle = 'rgba(10,30,20,0.28)'; x.fillRect(cx - 8, 9.6, 16, 1.6); // Schatten unter dem Diadem
    x.restore();
    // Augen: Mandelform mit Lidstrich, gelb glühende Schlitzpupillen
    for (const s of [-1, 1]) {
      const ex = cx + s * 3.3, ey = 12.6;
      x.fillStyle = 'rgba(12,30,40,0.55)'; x.beginPath(); x.ellipse(ex, ey - 0.6, 2.7, 1.5, 0, 0, Math.PI * 2); x.fill(); // dunkler Lidschatten
      x.fillStyle = '#0c1410'; x.beginPath(); x.moveTo(ex - s * 2.4, ey + 0.3); x.quadraticCurveTo(ex, ey - 1.9, ex + s * 2.3, ey - 0.6); x.lineTo(ex + s * 3.4, ey - 1.5); x.quadraticCurveTo(ex + s * 1.4, ey + 1.6, ex - s * 2.4, ey + 0.3); x.fill(); // Mandel + Lidstrich-Schwinge
      x.fillStyle = RG(ex, ey, 0.1, ex, ey, 1.6, [[0, '#fcfcc0'], [0.5, '#f0e020'], [1, '#c08000']]); x.beginPath(); x.ellipse(ex + s * 0.1, ey - 0.2, 1.55, 0.85, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#200808'; x.fillRect(ex + s * 0.1 - 0.35, ey - 1, 0.7, 1.7); // Schlitzpupille
      x.strokeStyle = '#0c1410'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(ex - s * 2.2, ey - 2.6); x.quadraticCurveTo(ex + s * 0.5, ey - 3.6, ex + s * 2.8, ey - 2.2); x.stroke(); // geschwungene Braue, zur Mitte gesenkt
    }
    x.strokeStyle = '#d4f4d8'; x.lineWidth = 0.6; x.beginPath(); x.moveTo(cx - 0.4, 13.6); x.lineTo(cx - 0.6, 17.4); x.stroke(); // Nasenrücken
    disc(cx + 0.7, 17.8, 0.45, '#24503a');
    if (open) { // Fauchen: Fänge, gespaltene Zunge
      x.fillStyle = '#1c0410'; x.beginPath(); x.ellipse(cx, 20.4, 2.5, 1.7, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#f8f4e8'; x.beginPath(); x.moveTo(cx - 2, 19.1); x.lineTo(cx - 1.2, 19.1); x.lineTo(cx - 1.6, 21.2); x.fill(); x.beginPath(); x.moveTo(cx + 1.2, 19.1); x.lineTo(cx + 2, 19.1); x.lineTo(cx + 1.6, 21.2); x.fill();
      x.strokeStyle = '#e02848'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(cx, 20.6); x.lineTo(cx - 0.4, 23.6); x.moveTo(cx - 0.4, 23); x.lineTo(cx - 1.4, 24.4); x.moveTo(cx - 0.4, 23); x.lineTo(cx + 0.6, 24.5); x.stroke();
      x.strokeStyle = '#4c1838'; x.lineWidth = 0.8; x.beginPath(); x.ellipse(cx, 20.4, 2.6, 1.8, 0, 0, Math.PI * 2); x.stroke(); // Lippen
    } else { // geschlossene dunkle Lippen, ein Hauch von Lächeln, Fangspitzen
      x.fillStyle = '#3c1430'; x.beginPath(); x.moveTo(cx - 2.6, 20); x.quadraticCurveTo(cx - 1, 19.1, cx, 19.7); x.quadraticCurveTo(cx + 1, 19.1, cx + 2.8, 19.6); x.quadraticCurveTo(cx, 20.6, cx - 2.6, 20); x.fill();
      x.fillStyle = '#7c2c58'; x.beginPath(); x.moveTo(cx - 2.2, 20.2); x.quadraticCurveTo(cx, 22, cx + 2.4, 19.9); x.quadraticCurveTo(cx, 20.8, cx - 2.2, 20.2); x.fill();
      x.fillStyle = '#f8f4e8'; x.fillRect(cx - 1.6, 20.2, 0.6, 1.1); x.fillRect(cx + 1.1, 20.2, 0.6, 1.1);
    }
    // Diadem mit Kobra (Uräus) und Rubin
    x.strokeStyle = '#4c3404'; x.lineWidth = 2.2; x.beginPath(); x.moveTo(cx - 7, 8.4); x.quadraticCurveTo(cx, 5.4, cx + 7, 8.4); x.stroke();
    x.strokeStyle = G(cx - 7, 5, cx + 7, 9, [[0, '#fcec9c'], [0.5, '#d8a028'], [1, '#8c6010']]); x.lineWidth = 1.3; x.beginPath(); x.moveTo(cx - 7, 8.4); x.quadraticCurveTo(cx, 5.4, cx + 7, 8.4); x.stroke();
    x.fillStyle = '#d8a028'; x.beginPath(); x.moveTo(cx, 0.4); x.quadraticCurveTo(cx + 2.4, 1.6, cx + 1.8, 4.2); x.lineTo(cx + 0.8, 6.8); x.lineTo(cx - 0.8, 6.8); x.lineTo(cx - 1.8, 4.2); x.quadraticCurveTo(cx - 2.4, 1.6, cx, 0.4); x.fill(); // Kobrahaube
    x.fillStyle = '#fcec9c'; x.fillRect(cx - 0.9, 1.4, 0.8, 3.2);
    disc(cx, 3, 0.75, '#e0204c');
    // Pixel-Look: weiche Kanten weg (Alpha hart), Verläufe bleiben
    const img = x.getImageData(0, 0, W0, H0), d = img.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 110 ? 0 : 255;
    x.putImageData(img, 0, 0);
    return Sprites.fromCanvas(c);
  }
  // fliegender Medusenkopf: grünes Gesicht, Schlangenhaar, zwei Bilder
  function head(k) {
    const c = Sprites.canvas(16, 16), x = c.getContext('2d'), R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    for (let i = 0; i < 6; i++) { const a = -2.6 + i * 0.6, w = Math.sin(i * 1.7 + k * 2) * 0.5; for (let j = 0; j < 5; j++) R(j % 2 ? '#3c9c5c' : '#1c5c34', Math.round(8 + Math.cos(a + w * j * 0.3) * (4 + j)), Math.round(8 + Math.sin(a + w * j * 0.3) * (4 + j)), 1, 1); }
    for (let y = 3; y < 14; y++) for (let X = 3; X < 13; X++) { const q = ((X - 7.5) / 4.6) ** 2 + ((y - 8.5) / 5.2) ** 2; if (q < 1) R(q > 0.75 ? '#2c5c44' : X < 7 ? '#7cbc8c' : '#4c8c64', X, y); }
    R('#0c1c14', 5, 7, 2, 2); R('#0c1c14', 9, 7, 2, 2); R('#f8e800', 5, 7, 1, 1); R('#f8e800', 10, 7, 1, 1);
    R(k ? '#1c0410' : '#0c140c', 6, 11, 4, k ? 2 : 1); R('#fcfcfc', 6, 11, 1, 1); R('#fcfcfc', 9, 11, 1, 1);
    return Sprites.fromCanvas(c);
  }
  return { get: () => art || (art = { calm: paint(false), hiss: paint(true), head: [head(0), head(1)], W0, H0 }) };
})();

class Snake extends Enemy {
  // kleine Schlange aus Medusas Haar: fällt herab und schlängelt sich über den Boden auf den Helden zu
  constructor(x, y, dir) { super(x - 7, y - 3, 14, 6, 1, 2, 100); this.dir = dir; this.face = dir; this.vx = dir * 0.6; this.vy = -1.8; }
  update() {
    super.update();
    if (this.onGround) this.vx = this.dir * 1.1;
    if (this.physics()) { this.dir *= -1; this.face = this.dir; }
    this.despawnOff(40); this.touch();
    if (this.t > 600) this.dead = true;
  }
  draw(ctx) {
    const X = Math.round(this.x - W.cam.x), Y = Math.round(this.y - W.cam.y), d = this.dir;
    this.lastDraw = null;
    for (let k = 0; k < 12; k++) {
      const sx = d > 0 ? X + k : X + 13 - k, sy = Y + 3 + Math.round(Math.sin(k * 0.8 - this.t * 0.4) * 1.5);
      ctx.fillStyle = this.flash ? '#fcfcfc' : k % 3 ? '#3c9c5c' : '#1c5c34'; ctx.fillRect(sx, sy, 1, 2);
      if (k % 3 === 1) { ctx.fillStyle = '#c8d888'; ctx.fillRect(sx, sy + 2, 1, 1); }
    }
    const hx = d > 0 ? X + 11 : X, hy = Y + 2 + Math.round(Math.sin(12 * 0.8 - this.t * 0.4) * 1.5);
    ctx.fillStyle = '#1c5c34'; ctx.fillRect(hx - 1, hy - 1, 5, 4); ctx.fillStyle = '#58c878'; ctx.fillRect(hx, hy, 3, 2);
    ctx.fillStyle = '#fc2020'; ctx.fillRect(hx + (d > 0 ? 2 : 0), hy, 1, 1);
    if ((this.t >> 3) % 3 === 0) { ctx.fillStyle = '#d82848'; ctx.fillRect(d > 0 ? hx + 4 : hx - 3, hy + 1, 2, 1); } // Zunge
  }
}

class MedusaHead extends Skull {
  // fliegender Medusenkopf: Wellenflug wie in Castlevania, hier mit Schlangenhaar
  draw(ctx) {
    const s = MEDUSA_ART.get().head[(this.t >> 3) & 1];
    this.ds(ctx, s, Math.round(this.cx - 8 - W.cam.x), Math.round(this.cy - 8 - W.cam.y), this.dir > 0, this.flash);
  }
}

class GazeWave extends EProj {
  // versteinernder Blick: eine flirrende Lichtwelle, am Boden (drüberspringen) oder in Kopfhöhe (ducken)
  constructor(x, y, dir, high) { super('gaze', x, y, dir * 2.3, 0, 0, 0); this.w = 10; this.h = high ? 12 : 14; this.x = x - 5; this.y = y; this.high = high; this.dir = dir; this.unstoppable = true; }
  update() {
    this.t++; this.x += this.vx;
    if (!this.onScreen(24)) this.dead = true;
    const p = W.player;
    if (p.alive && !(p.stoneT > 0) && p.inv <= 0 && Phys.overlap(this, p)) { p.petrify(); this.dead = true; }
  }
  draw(ctx) {
    const X = Math.round(this.cx - W.cam.x), Y = Math.round(this.cy - W.cam.y), d = this.dir;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 4; k++) { // Nachleuchten: drei blassere Bögen hinter der Front
      const bx = X - d * k * 6, a = (1 - k / 4) * (0.75 + 0.25 * Math.sin(this.t * 0.9));
      ctx.globalAlpha = a; ctx.strokeStyle = k ? '#a8e070' : '#fcfcc0'; ctx.lineWidth = k ? 1.5 : 2.5;
      ctx.beginPath(); ctx.ellipse(bx, Y, 3 + k, this.h / 2 + 1, 0, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke();
    }
    ctx.globalAlpha = 0.5; ctx.drawImage(FX.disc(10, [200, 240, 120], [0.5, 0.25, 0.08]), X - 10, Y - 10);
    ctx.restore();
  }
}

class Medusa extends Boss {
  constructor(ax, aw) {
    super(ax + aw - 90, 176 - 70, 28, 70, 28, 3);
    this.ax = ax; this.aw = aw; this.state = 'rise'; this.timer = 0; this.score = 8000; this.cycle = 0; this.face = -1;
    this.nameKey = 'boss3'; this.voice = 'bossMedusa'; this.floorY = this.y; this.y += 70; this.tx = this.x;
  }
  vulnerable() { return this.state !== 'rise'; }
  hurtBox() { return { x: this.x - 6, y: this.y, w: this.w + 12, h: 58 }; }
  update() {
    this.tick();
    if (this.dying) {
      if (this.dying === 1) for (let i = 0; i < 8; i++) W.spawn(new Particle(this.cx + rnd(-12, 12), this.y + rnd(0, 20), rnd(-1.5, 1.5), rnd(-3, -1), i & 1 ? '#3c9c5c' : '#58c878', 60, 2, 0.15));
      return this.updateDeath(160);
    }
    const p = W.player, half = this.hp <= this.maxHp / 2;
    if (this.state !== 'gaze' || this.timer < 26) this.face = p.cx < this.cx ? -1 : 1;
    switch (this.state) {
      case 'rise': // steigt zischend aus dem Marmor
        this.y = Math.max(this.floorY, this.y - 1.2);
        if (this.timer === 1) { Audio8.sfx('growl', this.cx); W.shake = 8; }
        if (this.timer % 6 === 0) W.debris(this.cx + rnd(-16, 16), this.floorY + 70, '#d8d0c0', 2);
        if (this.timer > 70) { this.state = 'glide'; this.timer = 0; }
        break;
      case 'glide': { // schlängelt sich durch die Arena, hält Abstand zum Helden
        if (this.timer === 1) { let tries = 0; do { this.tx = this.ax + rnd(24, this.aw - 52); } while (Math.abs(this.tx + 14 - p.cx) < 60 && ++tries < 12); }
        const d = this.tx - this.x; this.x += Math.sign(d) * Math.min(Math.abs(d), half ? 1.5 : 1.05);
        this.y = this.floorY + Math.sin(this.t * 0.08) * 2;
        if (this.timer > (half ? 64 : 92)) {
          this.timer = 0; this.cycle++;
          this.state = half && this.cycle % 3 === 0 ? 'heads' : this.cycle % 2 ? 'gaze' : 'spit';
          if (this.state === 'gaze') Audio8.sfx('ready', this.cx);
        }
        break;
      }
      case 'spit': // Schlangen fallen aus dem Haar
        if (this.timer % 18 === 6 && this.timer < (half ? 60 : 42)) { W.spawn(new Snake(this.cx + this.face * 8 + rnd(-6, 6), this.y + 6, this.face)); Audio8.sfx('slime', this.cx); }
        if (this.timer > 64) { this.state = 'glide'; this.timer = 0; }
        break;
      case 'gaze': { // Augen glühen auf, dann der versteinernde Blick (Phase 2: tief und hoch hintereinander)
        const lanes = half ? [this.cycle % 4 === 1, this.cycle % 4 !== 1] : [this.cycle % 4 === 3];
        lanes.forEach((high, i) => {
          if (this.timer === 34 + i * 30) {
            W.spawn(new GazeWave(this.cx + this.face * 12, high ? 140 : 161, this.face, high));
            Audio8.sfx('holy', this.cx); W.flash = Math.max(W.flash, 3);
          }
        });
        if (this.timer > 50 + lanes.length * 30) { this.state = 'glide'; this.timer = 0; }
        break;
      }
      case 'heads': // Medusenköpfe fliegen von beiden Seiten heran
        if (this.timer % 22 === 1 && this.timer < 66) { const s = (this.timer / 22 | 0) % 2 ? 1 : -1; W.spawn(new MedusaHead(s > 0 ? W.cam.x - 12 : W.cam.x + View.w + 2, W.cam.y + 122 + rnd(-8, 8), s)); }
        if (this.timer === 1) Audio8.sfx('growl', this.cx);
        if (this.timer > 70) { this.state = 'glide'; this.timer = 0; }
        break;
    }
    if (this.state !== 'rise') this.touch();
  }
  hair(ctx, X, Y, t, fl, front) { // Schlangenhaar: fünf Schlangen hinter, fünf vor dem Kopf – sie winden sich, schauen umher und züngeln
    for (let k = front ? 1 : 0; k < 10; k += 2) {
      const a = -Math.PI + 0.3 + k * (Math.PI - 0.6) / 9, len = 11 + (k * 7) % 6, pts = [];
      let px = X + Math.cos(a) * 7.5, py = Y + 7 + Math.sin(a) * 6.5, dir = a;
      for (let i = 0; i < len; i++) {
        dir = a + Math.sin(t * 0.18 + k * 1.7 + i * 0.5) * 0.65 * (i / len + 0.3);
        px += Math.cos(dir) * 1.15; py += Math.sin(dir) * 1.15; pts.push([px, py, 2.8 - i / len * 1.3]);
      }
      ctx.fillStyle = fl ? '#fcfcfc' : '#0e2a1a'; for (const [qx, qy, w] of pts) ctx.fillRect(Math.round(qx - w / 2 - 0.5), Math.round(qy - w / 2 - 0.5), Math.ceil(w + 1), Math.ceil(w + 1));
      ctx.fillStyle = fl ? '#fcfcfc' : '#2c8048'; for (const [qx, qy, w] of pts) ctx.fillRect(Math.round(qx - w / 2), Math.round(qy - w / 2), Math.ceil(w), Math.ceil(w));
      if (!fl) { ctx.fillStyle = '#7cd894'; pts.forEach(([qx, qy, w], i) => { if (i % 2 === 0) ctx.fillRect(Math.round(qx - w / 2), Math.round(qy - w / 2), 1, 1); }); }
      const [hx, hy] = pts[pts.length - 1], dx = Math.cos(dir), dy = Math.sin(dir);
      ctx.fillStyle = fl ? '#fcfcfc' : '#0e2a1a'; ctx.fillRect(Math.round(hx - 2), Math.round(hy - 2), 4, 4);
      ctx.fillStyle = fl ? '#fcfcfc' : '#3c9c5c'; ctx.fillRect(Math.round(hx - 1.5), Math.round(hy - 1.5), 3, 3);
      if (fl) continue;
      ctx.fillStyle = '#9ce0ac'; ctx.fillRect(Math.round(hx - 1.5), Math.round(hy - 1.5), 1, 1);
      ctx.fillStyle = '#fce040'; ctx.fillRect(Math.round(hx + dx * 0.9 - 0.5), Math.round(hy + dy * 0.9 - 1), 1, 1); // Auge
      if (((t >> 3) + k) % 5 === 0) { ctx.fillStyle = '#e02848'; ctx.fillRect(Math.round(hx + dx * 2.6), Math.round(hy + dy * 2.6), 1, 1); ctx.fillRect(Math.round(hx + dx * 3.6 + dy * 0.6), Math.round(hy + dy * 3.6 - dx * 0.6), 1, 1); } // Zunge
    }
  }
  draw(ctx) {
    if (this.dying && (this.dying & 2)) return;
    const A = MEDUSA_ART.get(), X = Math.round(this.cx - W.cam.x), Y = Math.round(this.y - W.cam.y), f = this.face, t = this.t, fl = this.flash;
    const floor = Math.round(this.floorY + 70 - W.cam.y);
    ctx.save();
    if (this.state === 'rise') { ctx.beginPath(); ctx.rect(-10, -60, View.w + 20, floor + 60); ctx.clip(); }
    // Schatten auf dem Marmor
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.beginPath(); ctx.ellipse(X - f * 18, floor, 34, 4, 0, 0, Math.PI * 2); ctx.fill();
    // Schlangenleib: windet sich nach hinten über den Boden, Schwanzspitze hebt sich; Licht von oben, Rautenmuster, Bauchschilde
    const E = (ex, ey, rx, ry, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(ex, ey, Math.max(0.5, rx), Math.max(0.5, ry), 0, 0, Math.PI * 2); ctx.fill(); };
    for (let k = 32; k >= 0; k--) {
      const u = k / 32, r = 8.5 - u * 6;
      const bx = X - f * (u * 46 - 2) + Math.sin(t * 0.07 + u * 6) * 4 * u;
      const by = Math.min(floor - r * 0.8, Y + 58 + u * 12) - Math.max(0, u - 0.8) * 50 + Math.sin(t * 0.09 + u * 5) * 1.5 * u;
      E(bx, by, r + 1, r * 0.8 + 1, fl ? '#fcfcfc' : '#0e2a1a');
      E(bx, by, r, r * 0.8, fl ? '#fcfcfc' : '#2c7c4c');
      if (fl) continue;
      E(bx, by + r * 0.3, r * 0.92, r * 0.45, '#1c5a36'); // Schatten unten
      if (k % 2 === 0) E(bx, by + r * 0.52, r * 0.62, r * 0.2, '#c8d490'); // helle Bauchschilde
      E(bx - r * 0.12, by - r * 0.36, r * 0.66, r * 0.3, '#5cb878'); // Licht von oben
      E(bx - r * 0.2, by - r * 0.48, r * 0.25, r * 0.12, '#c4f4cc'); // Glanz
      if (k % 4 === 1) { ctx.fillStyle = '#0e2a1a'; ctx.beginPath(); ctx.moveTo(bx, by - r * 0.75); ctx.lineTo(bx + r * 0.35, by - r * 0.4); ctx.lineTo(bx, by - r * 0.05); ctx.lineTo(bx - r * 0.35, by - r * 0.4); ctx.closePath(); ctx.fill(); } // Rautenmuster
    }
    this.hair(ctx, X, Y, t, fl, false); // hintere Schlangen
    const s = this.state === 'spit' || this.state === 'gaze' || this.state === 'rise' || this.state === 'heads' ? A.hiss : A.calm;
    this.ds(ctx, s, X - 36, Y - 4, f > 0, fl);
    this.hair(ctx, X, Y, t, fl, true); // vordere Schlangen
    ctx.restore();
    // Blick: die Augen glühen auf, bevor die Welle losbricht
    if (this.state === 'gaze' && !this.dying) {
      const ey = Y + 8, k = (this.timer % 30) / 30, r = 4 + k * 8;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.65 * k;
      ctx.drawImage(FX.disc(12, [250, 240, 90], [0.9, 0.45, 0.12]), X - r, ey - r, r * 2, r * 2);
      ctx.restore();
    }
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

const BOSSES = { gbat: GiantBat, giant: GiantSkeleton, medusa: Medusa, count: Count, tentacle: TentacleBoss };
