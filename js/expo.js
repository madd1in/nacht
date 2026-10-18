// Weltausstellung: ein Glaspalast wie die großen Gewächshäuser des 19. Jahrhunderts (PS2-3D) – grün lackierte Gusseisen-
// Rippen, Glasgewölbe, Galerie, Palmen und Gaslaternen. Fleischfressende Pflanzen als Gegner (Schnappfalle und Kannen-
// pflanze, in Blender vorgerendert) und die Menschenfalle als Boss: drei Fangköpfe auf langen Hälsen, in Echtzeit-3D.
'use strict';

const Expo = (() => {
  const { mesh, box, prism, cone, beam, render, project, face, vtx } = PS2;
  const CPU = { willReadFrequently: true };
  const S = {}; // Sprites der Pflanzen (aus img/plants3d.png)
  {
    const MAP = { pitch_idle0: [0, 0, 36, 44], pitch_idle1: [37, 0, 36, 44], pitch_spit: [74, 0, 36, 44], snap_bite: [111, 0, 48, 44], snap_idle0: [160, 0, 48, 44], snap_idle1: [209, 0, 48, 44], snap_open: [258, 0, 48, 44] };
    const img = new Image();
    img.onload = () => {
      const fr = (n) => { const r = MAP[n], c = Sprites.canvas(r[2], r[3]); c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); return Sprites.fromCanvas(c, true); };
      S.snap = { idle: [fr('snap_idle0'), fr('snap_idle1')], open: fr('snap_open'), bite: fr('snap_bite') };
      S.pitch = { idle: [fr('pitch_idle0'), fr('pitch_idle1')], spit: fr('pitch_spit') };
    };
    img.src = 'img/plants3d.png';
  }

  // ---------------- Glaspalast (Hintergrund) ----------------
  // Spielebene bei z = 200 wie die Kacheln; Rückwand aus Glas bei z = 540 mit Galerie davor, darüber ein Tonnengewölbe aus
  // Bogenrippen und Pfetten, dazwischen Glas (durchscheinend, der Nachthimmel scheint durch). Alles wiederholt sich alle
  // P Einheiten, gerendert wird mit der Kamera modulo P – so reicht ein Stück Halle für beliebig lange Räume.
  const P = 960, BAY = 120, ZB = 540, YW = 150, ZC = 230, RV = 310;
  const IRON = [58, 138, 90], IRON2 = [40, 104, 66], GLASS = [176, 232, 228], STONE = [204, 192, 164], STONE2 = [150, 138, 112],
    PALM = [62, 122, 50], PALM2 = [92, 152, 58], TRUNK = [124, 100, 68], TRUNK2 = [100, 80, 54], CREAM = [176, 168, 146], TERRA = [150, 80, 54], DARKT = [64, 60, 66],
    BRASS = [206, 164, 72], LAMPC = [255, 222, 150], FERN = [70, 132, 60];
  const ENV = { static: true, sun: null, sunC: [0.5, 0.68, 0.92], amb: [0.46, 0.5, 0.54], sky: [0.16, 0.2, 0.26], fog: [36, 58, 74], fogD: 0.0012 };
  { const v = [0.25, 0.9, -0.35], l = Math.hypot(...v); ENV.sun = v.map(c => c / l); }
  const vault = (t) => [ZC + RV * Math.cos(t), YW + RV * Math.sin(t)];
  let hall = null, lamps = [];
  function palm(m, x, z, k, rnd) {
    let px = x, py = 0, pz = z; const lean = (rnd() - 0.5) * 0.5;
    for (let i = 0; i < 6; i++) { const nx = px + lean * 7 * k, ny = py + 21 * k; beam(m, px, py, pz, nx, ny, pz, (8 - i * 0.7) * k, (8 - i * 0.7) * k, i % 2 ? TRUNK : TRUNK2); px = nx; py = ny; }
    for (let f = 0; f < 9; f++) { // Wedel: gebogene Blattbänder, die nach außen hängen
      const a = f / 9 * Math.PI * 2 + rnd() * 0.4, ca = Math.cos(a), sa = Math.sin(a), L = (54 + rnd() * 16) * k;
      const pts = [[0, 3], [0.35, 12], [0.7, 7], [1, -12]].map(([t, h]) => [px + ca * L * t, py + h * k, pz + sa * L * t * 0.7]);
      for (let s = 0; s < 3; s++) {
        const w0 = (7.5 - s * 2.3) * k, w1 = (7.5 - (s + 1) * 2.3) * k, [x0, y0, z0] = pts[s], [x1, y1, z1] = pts[s + 1], nx = -sa, nz = ca * 0.7;
        face(m, [vtx(m, x0 + nx * w0, y0, z0 + nz * w0), vtx(m, x1 + nx * w1, y1, z1 + nz * w1), vtx(m, x1 - nx * w1, y1, z1 - nz * w1), vtx(m, x0 - nx * w0, y0, z0 - nz * w0)], s % 2 ? PALM : PALM2, null, { two: true });
      }
    }
  }
  function lamp(m, x, z) { // Gaslaterne: Mast, Messingkopf, leuchtende Glaskugel
    prism(m, x, 0, z, 1.8, 64, 6, IRON2, { cap: false }); box(m, x, 60, z, 7, 3, 7, BRASS);
    cone(m, x, 70, z, 5.5, 7, 6, LAMPC, { e: 1 }); cone(m, x, 70, z, 5.5, -7, 6, LAMPC, { e: 1 }); cone(m, x, 77, z, 3.5, 5, 6, IRON2);
    lamps.push([x, 70, z]);
  }
  function bed(m, x, z, rnd) { // Pflanzbeet aus Sandstein mit Farnen
    box(m, x, 0, z, 70, 12, 34, STONE2, { top: [70, 96, 52] });
    for (let i = 0; i < 6; i++) cone(m, x - 28 + i * 11 + rnd() * 4, 12, z - 8 + rnd() * 16, 9 + rnd() * 4, 12 + rnd() * 8, 5, i % 2 ? FERN : PALM2, { rot: rnd() * 3 });
  }
  function buildHall() {
    const m = mesh(); lamps = [];
    const X0 = -1200, X1 = P + 1200, MX = (X0 + X1) / 2, LEN = X1 - X0;
    for (let z = 200; z < ZB; z += 40) for (let x = X0; x < X1; x += 40) { // Fliesenboden: gedämpftes Schachbrett mit Terrakotta-Bordüren
      const i = Math.round(x / 40), j = Math.round(z / 40), col = j % 4 === 1 ? TERRA : (i + j) & 1 ? CREAM : DARKT;
      face(m, [vtx(m, x, 0, z), vtx(m, x, 0, z + 40), vtx(m, x + 40, 0, z + 40), vtx(m, x + 40, 0, z)], col, null, { two: true });
    }
    box(m, MX, 0, ZB + 8, LEN, 26, 16, STONE2, { top: STONE }); // Rückwand: Sockel, Pfosten, Riegel, Glas
    for (let x = X0; x <= X1; x += BAY / 2) prism(m, x, 26, ZB, 3.2, YW - 26, 6, x % BAY ? IRON2 : IRON, { cap: false });
    for (const y of [26, 86, 120, YW]) beam(m, X0, y, ZB, X1, y, ZB, 5, 5, IRON2);
    for (let x = X0; x < X1; x += BAY / 2) for (const [y0, y1] of [[26, 86], [86, 120], [120, YW]]) face(m, [vtx(m, x, y0, ZB), vtx(m, x + BAY / 2, y0, ZB), vtx(m, x + BAY / 2, y1, ZB), vtx(m, x, y1, ZB)], GLASS, null, { two: true, a: 0.2 });
    const TH = [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.1, 1.3, 1.55, 1.8]; // Gewölbe
    for (let x = X0; x <= X1; x += BAY) {
      for (let k = 1; k < TH.length; k++) { const [z0, y0] = vault(TH[k - 1]), [z1, y1] = vault(TH[k]); beam(m, x, y0, z0, x, y1, z1, 6, 9, IRON); }
      beam(m, x, YW - 34, ZB, x, YW, ZB - 34, 3, 3, IRON2); // Zwickel-Strebe
    }
    for (const t of TH) { const [z, y] = vault(t); beam(m, X0, y, z, X1, y, z, 4, 4, IRON2); }
    for (let x = X0; x < X1; x += BAY) for (let k = 1; k < TH.length; k++) {
      const [z0, y0] = vault(TH[k - 1]), [z1, y1] = vault(TH[k]);
      face(m, [vtx(m, x, y0, z0), vtx(m, x + BAY, y0, z0), vtx(m, x + BAY, y1, z1), vtx(m, x, y1, z1)], GLASS, null, { two: true, a: 0.14 });
    }
    const ZG = 490, YG = 92; // Galerie vor der Rückwand: Säulen, Laufgang, Brüstung mit Andreaskreuzen
    box(m, MX, YG, ZG, LEN, 4, 34, IRON2);
    for (let x = X0; x <= X1; x += BAY) { prism(m, x, 0, ZG - 15, 3.2, YG, 6, IRON, { cap: false }); box(m, x, YG - 6, ZG - 15, 9, 6, 9, IRON2); }
    beam(m, X0, YG + 16, ZG - 16, X1, YG + 16, ZG - 16, 2.5, 2.5, IRON);
    for (let x = X0; x < X1; x += BAY / 2) { beam(m, x, YG + 4, ZG - 16, x + BAY / 2, YG + 16, ZG - 16, 1.5, 1.5, IRON2); beam(m, x, YG + 16, ZG - 16, x + BAY / 2, YG + 4, ZG - 16, 1.5, 1.5, IRON2); }
    for (let o = X0 - P; o < X1 + P; o += P) { // Pflanzen und Laternen: in jedem Abschnitt gleich (Periode P)
      let s = 77; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
      for (const [dx, dz, k] of [[90, 330, 1.15], [420, 430, 1.35], [700, 300, 1.0], [860, 450, 1.25]]) { const x = o + dx; if (x > X0 - 60 && x < X1 + 60) palm(m, x, dz, k, rnd); else for (let i = 0; i < 40; i++) rnd(); }
      for (const dx of [250, 560, 940]) { const x = o + dx; if (x > X0 && x < X1) lamp(m, x, 280); }
      for (const [dx, dz] of [[330, 250], [620, 360]]) { const x = o + dx; if (x > X0 && x < X1) bed(m, x, dz, rnd); else for (let i = 0; i < 18; i++) rnd(); }
    }
    return m;
  }
  const bufs = {};
  function drawHall(ctx, cam) {
    if (!hall) hall = buildHall();
    const w = View.w, dv = View.lite ? 3 : 2, Wb = Math.ceil(w / dv), Hb = Math.ceil(208 / dv);
    let B = bufs.h;
    if (!B || B.c.width !== Wb) { B = bufs.h = { c: Sprites.canvas(Wb, Hb), key: null }; B.x = B.c.getContext('2d', CPU); }
    const floorPx = W.room ? (W.room.h - 2) * T : 176, camX = (((cam.x + w / 2) % P) + P) % P, camY = floorPx - cam.y - 83;
    const key = Math.round(camX / dv) + '|' + Math.round(camY / dv) + '|' + Wb;
    if (B.key !== key) {
      B.key = key; B.x.clearRect(0, 0, Wb, Hb);
      const c3 = { x: camX, y: camY, z: 0, yaw: 0, pitch: 0, f: 200 / dv, near: 20, hy: 0.4 };
      render(B.x, Wb, Hb, [hall], c3, ENV);
      B.x.save(); B.x.globalCompositeOperation = 'lighter'; // Lichthöfe der Gaslaternen
      for (const [lx, ly, lz] of lamps) {
        const [sx, sy, sz] = project(c3, Wb, Hb, lx, ly, lz); if (sz < 20 || sx < -30 || sx > Wb + 30) continue;
        const r = 5200 / sz / dv, g = B.x.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, 'rgba(255,206,130,0.55)'); g.addColorStop(1, 'rgba(255,160,80,0)');
        B.x.fillStyle = g; B.x.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      B.x.restore();
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, Wb, Hb, 0, 0, w, 208); ctx.restore();
  }
  const prewarm = () => { if (!hall) hall = buildHall(); };

  // Gaslaterne statt Kerze (Ausstellungshallen): Mast mit Schnörkel, Glaskugel mit Flamme
  function drawLamp(ctx, x, y, t) {
    ctx.fillStyle = '#1c4c2c'; ctx.fillRect(x + 5, y + 9, 2, 11); ctx.fillRect(x + 3, y + 18, 6, 2);
    ctx.fillStyle = '#3c8c58'; ctx.fillRect(x + 5, y + 9, 1, 11); ctx.fillRect(x + 2, y + 10, 2, 1); ctx.fillRect(x + 8, y + 10, 2, 1);
    ctx.fillStyle = '#b08840'; ctx.fillRect(x + 3, y + 7, 6, 2); ctx.fillRect(x + 4, y, 4, 1);
    const fl = 0.85 + 0.15 * Math.sin(t * 0.3);
    ctx.fillStyle = `rgba(255,236,170,${(0.75 * fl).toFixed(2)})`; ctx.fillRect(x + 3, y + 1, 6, 6);
    ctx.fillStyle = '#fffbe8'; ctx.fillRect(x + 5, y + 3, 2, 3);
    ctx.fillStyle = '#e8c870'; ctx.fillRect(x + 3, y + 1, 1, 6); ctx.fillRect(x + 8, y + 1, 1, 6);
  }

  return { S, drawHall, drawLamp, prewarm };
})();

// ---------------- Schnappfalle: steht im Topf, reißt das Maul auf, sobald der Held davor steht, und schnellt vor ----------------
class Snapper extends Enemy {
  constructor(tx, ty) { super(tx * T + 2, (ty + 1) * T - 22, 12, 22, 3, 2, 300); this.state = 'idle'; this.st = 40; }
  head() { const f = this.face; return this.state === 'bite' ? { x: f > 0 ? this.cx + 6 : this.cx - 32, y: this.y - 6, w: 26, h: 14 } : { x: f > 0 ? this.cx - 2 : this.cx - 14, y: this.y - 16, w: 16, h: 14 }; }
  hurtBoxes() { return [this, this.head()]; }
  update() {
    super.update(); this.st++;
    const p = W.player, dx = p.cx - this.cx;
    if (this.state === 'idle') {
      if (this.st > 50 && Math.abs(dx) < 74 && Math.abs(p.feet - (this.y + this.h)) < 44 && p.alive) { this.face = Math.sign(dx) || this.face; this.state = 'open'; this.st = 0; Audio8.sfx('growl', this.cx); }
    } else if (this.state === 'open' && this.st > 22) { this.state = 'bite'; this.st = 0; Audio8.sfx('chomp', this.cx); }
    else if (this.state === 'bite' && this.st > 16) { this.state = 'idle'; this.st = 0; }
    if (this.state === 'bite' && this.st > 1 && this.st < 12 && p.alive && Phys.overlap(this.head(), p)) p.hurt(this.dmg, this.cx);
    this.touch();
  }
  draw(ctx) {
    const s = Expo.S.snap; if (!s) return;
    const spr = this.state === 'bite' ? s.bite : this.state === 'open' ? s.open : s.idle[Math.floor(this.t / 22) % 2];
    this.spr(ctx, spr, this.face < 0, this.face < 0 ? -10 : 10, 0, this.flash || (this.state === 'open' && (this.st & 4)));
  }
}

// ---------------- Kannenpflanze: neigt sich zum Helden und spuckt Verdauungssaft im Bogen ----------------
class Pitcher extends Enemy {
  constructor(tx, ty) { super(tx * T + 3, (ty + 1) * T - 24, 10, 24, 2, 2, 250); this.cd = 50 + (tx * 13) % 60; this.spitT = 0; }
  update() {
    super.update();
    const p = W.player, dx = p.cx - this.cx;
    if (this.spitT > 0) { if (--this.spitT === 10) this.spit(dx); }
    else { this.face = Math.sign(dx) || 1; if (--this.cd <= 0 && Math.abs(dx) < 210 && this.onScreen(0) && p.alive) { this.spitT = 28; this.cd = 120 + Math.random() * 70; } }
    this.touch();
  }
  spit(dx) { // flacher Bogen, der etwa beim Helden aufschlägt
    const vy = -3.4, tAir = 2 * 3.4 / 0.13, vx = clamp(dx / tAir, -2.4, 2.4);
    W.spawn(new AcidBlob(this.cx + this.face * 6, this.y - 2, vx, vy)); Audio8.sfx('slime', this.cx);
  }
  draw(ctx) {
    const s = Expo.S.pitch; if (!s) return;
    this.spr(ctx, this.spitT > 0 && this.spitT < 20 ? s.spit : s.idle[Math.floor(this.t / 26) % 2], this.face < 0, 0, 0, this.flash);
  }
}
// Verdauungssaft: fliegt im Bogen, zerplatzt am Boden zu einer zischenden Lache
class AcidBlob extends Ent {
  constructor(x, y, vx, vy, big = false) { super(x - 3, y - 3, big ? 8 : 6, big ? 8 : 6); this.kind = 'eproj'; this.vx = vx; this.vy = vy; this.dmg = 2; this.land = 0; this.big = big; }
  update() {
    this.t++;
    const p = W.player;
    if (this.land) {
      if (++this.land > 80) this.dead = true;
      if (this.land < 64 && p.alive && Phys.overlap({ x: this.x - 6, y: this.y, w: this.w + 12, h: 6 }, p)) p.hurt(1, this.cx);
      if (this.land % 9 === 0) W.spawn(new Particle(this.cx + rnd(-6, 6), this.y, 0, -0.5, '#b8f870', 18, 1, 0));
      return;
    }
    this.vy += 0.13; this.x += this.vx; this.y += this.vy;
    if (this.vy > 0 && Phys.solidTile(Math.floor(this.cx / T), Math.floor((this.y + this.h) / T))) {
      this.land = 1; this.y = Math.floor((this.y + this.h) / T) * T - 2; Audio8.sfx('splat', this.cx);
      for (let i = 0; i < 6; i++) W.spawn(new Particle(this.cx, this.y, rnd(-1.4, 1.4), rnd(-2, -0.6), '#a8f060', 24, 1, 0.12));
    }
    if (this.y > W.room.h * T + 16 || !this.onScreen(80)) this.dead = true;
    if (p.alive && Phys.overlap(this, p)) { p.hurt(this.dmg, this.cx); this.dead = true; }
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    if (this.land) { // Lache
      const a = this.land > 60 ? (80 - this.land) / 20 : 1, wdt = Math.min(16, 6 + this.land);
      ctx.globalAlpha = a; ctx.fillStyle = '#4c8c24'; ctx.fillRect(x + 3 - wdt / 2, y, wdt, 2); ctx.fillStyle = '#a8f060'; ctx.fillRect(x + 4 - wdt / 2, y, wdt - 2, 1); ctx.globalAlpha = 1;
      return;
    }
    const s = this.w;
    ctx.fillStyle = '#3c7c1c'; ctx.fillRect(x, y + 1, s, s - 2); ctx.fillRect(x + 1, y, s - 2, s);
    ctx.fillStyle = '#88e048'; ctx.fillRect(x + 1, y + 1, s - 2, s - 3);
    ctx.fillStyle = '#e8fcc0'; ctx.fillRect(x + 2, y + 2, 2, 1);
  }
}

// ---------------- Boss: die Menschenfalle ----------------
// Aus einem riesigen Pflanzkübel in der Kuppel wachsen drei Fangköpfe auf langen, sich windenden Hälsen. Ein Kopf reißt
// das Maul auf (rot glühend) und schnellt dorthin, wo der Held steht; andere spucken Säure im Bogen. Ab halber Kraft
// brechen dornige Wurzeln aus dem Boden. Treffer an jedem Kopf schwächen die Pflanze. Echtzeit-3D (PS2-Renderer).
class ManTrap extends Boss {
  constructor(ax, aw) {
    const floor = (W.room.h - 2) * T;
    super(ax + aw / 2 - 22, floor - 46, 44, 46, 36, 3);
    this.ax = ax; this.aw = aw; this.floor = floor; this.score = 7000; this.nameKey = 'bossTrap'; this.voice = 'bossTrap';
    this.go('rise'); this.seq = 0;
    const bx = this.cx, by = floor - 40;
    this.heads = [-1, 0, 1].map((k, i) => ({ k, i, home: { x: bx + k * 62, y: by - 70 + Math.abs(k) * 16 }, x: bx, y: by, open: 0.1, st: 'sway', t: 0, tx: 0, ty: 0, glow: 0, flash: 0 }));
    this.buf = null;
  }
  go(s) { this.state = s; this.timer = 0; }
  base() { return { x: this.cx, y: this.floor - 40 }; }
  hurtBoxes() { return this.state === 'rise' && this.timer < 60 ? [] : this.heads.map(h => ({ x: h.x - 14, y: h.y - 11, w: 28, h: 22 })); }
  hit(dmg, id) { const r = super.hit(dmg, id); if (r) for (const h of this.heads) h.flash = 10; return r; }
  update() {
    this.tick();
    const p = W.player, half = this.hp <= this.maxHp / 2, B = this.base();
    for (const h of this.heads) { h.t++; if (h.flash > 0) h.flash--; }
    if (this.dying) { for (const h of this.heads) { h.y += 0.9; h.open = Math.min(1, h.open + 0.02); } return this.updateDeath(140); }
    if (this.state === 'rise') { // wächst aus dem Kübel
      const k = Math.min(1, this.timer / 90);
      for (const h of this.heads) { h.x = B.x + (h.home.x - B.x) * k; h.y = B.y + (h.home.y - B.y) * k; h.open = 0.2 + 0.5 * Math.sin(k * Math.PI); }
      if (this.timer === 1) { Audio8.sfx('rise'); W.shake = 10; }
      if (this.timer === 70) { Audio8.sfx('roar'); W.shake = 18; Input.rumble(0.9, 0.7, 500); }
      if (this.timer > 100) this.go('idle');
      return;
    }
    if (this.state === 'idle' && this.timer > (half ? 40 : 64)) {
      const pick = ['lunge', 'spit', half ? 'roots' : 'lunge'][this.seq++ % 3];
      if (pick === 'lunge') { const h = this.heads.slice().sort((a, b) => Math.abs(a.home.x - p.cx) - Math.abs(b.home.x - p.cx))[0]; h.st = 'wind'; h.t = 0; this.go('attack'); }
      else if (pick === 'spit') { for (const h of this.heads) if (h.k !== 0 || half) { h.st = 'spit'; h.t = 0; } this.go('attack'); }
      else { this.go('roots'); }
    }
    if (this.state === 'roots') {
      if (this.timer === 1) { Audio8.sfx('growl'); for (const h of this.heads) { h.open = 0.8; } }
      if (this.timer === 12 || this.timer === 40 || (half && this.timer === 68)) W.spawn(new ThornRoot(clamp(p.cx, this.ax + 16, this.ax + this.aw - 16), this.floor));
      if (this.timer > 110) this.go('idle');
    }
    let busy = false;
    for (const h of this.heads) { // Köpfe: wiegen sich, holen aus, schnellen vor, spucken
      const sway = { x: h.home.x + Math.sin(this.t * 0.03 + h.i * 2.1) * 12, y: h.home.y + Math.sin(this.t * 0.045 + h.i * 1.3) * 9 };
      if (h.st === 'sway') { h.x += (sway.x - h.x) * 0.08; h.y += (sway.y - h.y) * 0.08; h.open += (0.18 + 0.08 * Math.sin(this.t * 0.1 + h.i) - h.open) * 0.1; h.glow *= 0.9; continue; }
      busy = true;
      if (h.st === 'wind') { // Maul weit auf, zieht sich zurück und glüht
        h.open += (1 - h.open) * 0.15; h.glow = Math.min(1, h.glow + 0.05);
        h.x += (sway.x - (p.cx - sway.x) * 0.25 - h.x) * 0.1; h.y += (sway.y - 14 - h.y) * 0.1;
        if (h.t > (half ? 24 : 34)) { h.st = 'lunge'; h.t = 0; h.tx = clamp(p.cx, this.ax + 14, this.ax + this.aw - 14); h.ty = clamp(p.cy, this.floor - 120, this.floor - 10); Audio8.sfx('whoosh'); }
      } else if (h.st === 'lunge') {
        const k = Math.min(1, h.t / 10); h.x += (h.tx - h.x) * (0.25 + k * 0.4); h.y += (h.ty - h.y) * (0.25 + k * 0.4);
        if (h.t === 8) { h.open = 0.02; Audio8.sfx('chomp'); W.shake = Math.max(W.shake, 8); }
        if (h.t > 8 && h.t < 22 && p.alive && Phys.overlap({ x: h.x - 15, y: h.y - 12, w: 30, h: 24 }, p)) p.hurt(this.dmg, h.x);
        if (h.t > 30) { h.st = 'back'; h.t = 0; }
      } else if (h.st === 'back') {
        h.x += (sway.x - h.x) * 0.1; h.y += (sway.y - h.y) * 0.1; h.glow *= 0.9; h.open += (0.2 - h.open) * 0.1;
        if (h.t > 26) h.st = 'sway';
      } else if (h.st === 'spit') {
        h.open += ((h.t < 20 ? 0.9 : 0.2) - h.open) * 0.2;
        if (h.t === 20 || (half && h.t === 34)) {
          const dx = p.cx - h.x, tAir = 46, vx = clamp(dx / tAir, -3.2, 3.2) + rnd(-0.3, 0.3);
          W.spawn(new AcidBlob(h.x, h.y + 4, vx, -3.0, true)); Audio8.sfx('slime', h.x);
        }
        if (h.t > 46) h.st = 'sway';
      }
    }
    if (this.state === 'attack' && !busy) this.go('idle');
    this.touch();
  }
  // ---------- 3D: Hals als Röhre, Kopf aus zwei Kieferschalen mit Wimpernzähnen, Knolle im Kübel ----------
  static sphere(m, cx, cy, cz, rx, ry, rz, seg, rings, colFn, rot = 0, half = 0) {
    const idx = [], cr = Math.cos(rot), sr = Math.sin(rot);
    const r0 = half > 0 ? Math.floor(rings / 2) : 0, r1 = half < 0 ? Math.ceil(rings / 2) : rings;
    for (let j = r0; j <= r1; j++) {
      const v = j / rings * Math.PI, row = [];
      for (let i = 0; i < seg; i++) {
        const u = i / seg * Math.PI * 2, x = Math.cos(u) * Math.sin(v) * rx, y = Math.cos(v) * ry, z = Math.sin(u) * Math.sin(v) * rz;
        row.push(PS2.vtx(m, cx + x * cr - y * sr, cy + x * sr + y * cr, cz + z));
      }
      idx.push(row);
    }
    for (let j = 0; j < idx.length - 1; j++) for (let i = 0; i < seg; i++) {
      const a = idx[j][i], b = idx[j][(i + 1) % seg], c = idx[j + 1][(i + 1) % seg], d = idx[j + 1][i];
      PS2.face(m, [a, b, c, d], colFn(j, i), [cx, cy, cz], { two: true });
    }
  }
  buildMesh() {
    const m = PS2.mesh(), B = this.base(), V = (x, y) => [x, -y]; // Welt (y nach unten) → 3D (y nach oben)
    const GREEN = [70, 138, 56], GREEN2 = [48, 104, 44], RED = [200, 40, 56], REDD = [130, 20, 36], CIL = [232, 240, 160], BULB = [96, 70, 110], BULB2 = [70, 48, 84];
    const [bx, by] = V(B.x, B.y + 20);
    PS2.prism(m, bx, by - 30, 0, 46, 22, 8, [150, 138, 112], { top: [60, 40, 30] }); // Kübel
    PS2.box(m, bx, by - 34, 0, 100, 6, 70, [124, 112, 90]);
    ManTrap.sphere(m, bx, by + 6, 0, 36, 26, 30, 10, 8, (j, i) => (i + j) % 3 ? BULB : BULB2); // Knolle
    for (const h of this.heads) {
      const [hx, hy] = V(h.x, h.y), z = h.k * 10, base = [bx + h.k * 14, by + 22, 0];
      const ctrl = [(base[0] + hx) / 2 - h.k * 30 + Math.sin(this.t * 0.04 + h.i) * 10, (base[1] + hy) / 2 + 40, z * 0.5];
      const N = 10, ring = [];
      for (let s = 0; s <= N; s++) { // Hals: Bézier-Röhre
        const t = s / N, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        const px = a * base[0] + b * ctrl[0] + c * hx, py = a * base[1] + b * ctrl[1] + c * hy, pz = a * base[2] + b * ctrl[2] + c * z;
        const r = 8 - t * 3, row = [];
        for (let k = 0; k < 6; k++) { const u = k / 6 * Math.PI * 2; row.push(PS2.vtx(m, px + Math.cos(u) * r, py, pz + Math.sin(u) * r)); }
        ring.push(row);
      }
      for (let s = 0; s < N; s++) for (let k = 0; k < 6; k++) PS2.face(m, [ring[s][k], ring[s][(k + 1) % 6], ring[s + 1][(k + 1) % 6], ring[s + 1][k]], (s + k) % 2 ? GREEN : GREEN2, null, { two: true });
      const dirA = Math.atan2(hy - ctrl[1], hx - ctrl[0]), op = 0.15 + h.open * 0.95, glow = h.glow, L = 21; // Blickrichtung aus dem Hals
      const red = [Math.min(255, RED[0] + glow * 55), RED[1] + glow * 70, RED[2] + glow * 20];
      for (const sgn of [1, -1]) { // Kieferschalen: oben und unten an der Angel, außen grün, innen roter Schlund
        const ang = dirA + sgn * op / 2, ca = Math.cos(ang), sa = Math.sin(ang), ox = -sa * sgn, oy = ca * sgn; // (ox, oy): vom Maul weg
        const jx = hx + ca * L * 0.55, jy = hy + sa * L * 0.55;
        ManTrap.sphere(m, jx + ox * 2, jy + oy * 2, z, L * 0.62, 7, 14, 8, 6, () => (h.flash & 2 ? [255, 255, 255] : GREEN), ang, -sgn);
        ManTrap.sphere(m, jx - ox * 0.5, jy - oy * 0.5, z, L * 0.54, 3.2, 12, 8, 4, () => (glow > 0.5 && (this.t & 4) ? red : sgn > 0 ? red : REDD), ang, sgn);
        for (let k = 0; k < 6; k++) { // Wimpernzähne entlang des Randes, nach außen und vorn
          const t = 0.3 + k * 0.12, tx = hx + ca * L * t, ty = hy + sa * L * t, zz = z + (k % 2 ? 6 : -6);
          PS2.face(m, [PS2.vtx(m, tx - ca * 1.3, ty - sa * 1.3, zz), PS2.vtx(m, tx + ca * 1.3, ty + sa * 1.3, zz), PS2.vtx(m, tx + ox * 9.5 + ca * 2.5, ty + oy * 9.5 + sa * 2.5, zz)], CIL, null, { two: true });
        }
      }
    }
    return m;
  }
  draw(ctx) {
    const w = View.w, dv = View.lite ? 3 : 2, Wb = Math.ceil(w / dv), Hb = Math.ceil(208 / dv);
    if (!this.buf || this.buf.c.width !== Wb) { this.buf = { c: Sprites.canvas(Wb, Hb) }; this.buf.x = this.buf.c.getContext('2d', { willReadFrequently: true }); }
    const x = this.buf.x, cam = { x: W.cam.x + w / 2, y: -(W.cam.y + 104), z: -2000, yaw: 0, pitch: 0, f: 2000 / dv, near: 100, hy: 0.5 };
    const env = { sun: ManTrap.SUN, sunC: [0.9, 0.85, 0.8], amb: [0.42, 0.4, 0.46], sky: [0.16, 0.18, 0.2], fog: [0, 0, 0], fogD: 0 };
    x.clearRect(0, 0, Wb, Hb);
    if (this.dying && (this.dying & 2)) return;
    PS2.render(x, Wb, Hb, [this.buildMesh()], cam, env);
    x.save(); x.globalCompositeOperation = 'lighter'; // glühender Schlund beim Ausholen
    for (const h of this.heads) if (h.glow > 0.05) { const sx = (h.x - W.cam.x) / dv, sy = (h.y - W.cam.y) / dv, r = 14 / dv * (1 + h.glow), g = x.createRadialGradient(sx, sy, 0, sx, sy, r * 2); g.addColorStop(0, `rgba(255,80,60,${(0.5 * h.glow).toFixed(2)})`); g.addColorStop(1, 'rgba(255,40,40,0)'); x.fillStyle = g; x.fillRect(sx - r * 2, sy - r * 2, r * 4, r * 4); }
    x.restore();
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(this.buf.c, 0, 0, Wb, Hb, 0, 0, w, 208); ctx.restore();
    this.lastDraw = { s: { c: this.buf.c, f: this.buf.c, w: Wb, h: Hb }, x: W.cam.x, y: W.cam.y, flip: false };
  }
}
ManTrap.SUN = (() => { const v = [-0.4, 0.75, -0.55], l = Math.hypot(...v); return v.map(c => c / l); })();
BOSSES.mantrap = ManTrap;

// Dornenwurzel: wühlt sich unter dem Helden heran (Erde bebt), bricht dann als Dornenspieß aus dem Boden
class ThornRoot extends Ent {
  constructor(x, floor) { super(x - 6, floor - 48, 12, 48); this.kind = 'eproj'; this.floor = floor; this.dmg = 2; }
  update() {
    this.t++;
    if (this.t < 36) { if (this.t % 5 === 0) W.debris(this.cx + rnd(-6, 6), this.floor - 2, '#4c3420', 1); if (this.t === 1) Audio8.sfx('crumble', this.cx); return; }
    if (this.t === 36) { Audio8.sfx('crack', this.cx); W.shake = Math.max(W.shake, 6); }
    const p = W.player, h = this.height();
    if (h > 8 && p.alive && Phys.overlap({ x: this.x, y: this.floor - h, w: this.w, h }, p)) p.hurt(this.dmg, this.cx);
    if (this.t > 90) this.dead = true;
  }
  height() { const k = this.t - 36; return k < 0 ? 0 : k < 6 ? k * 8 : k < 40 ? 48 : Math.max(0, 48 - (k - 40) * 4); }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), fy = Math.round(this.floor - W.cam.y);
    if (this.t < 36) { ctx.fillStyle = (this.t >> 2) & 1 ? '#5c4024' : '#3a2814'; ctx.fillRect(x - 8, fy - 2, 16, 2); return; }
    const h = this.height();
    for (let y = 0; y < h; y++) { const wdt = Math.max(1, Math.round(6 * (1 - y / 52))); ctx.fillStyle = y % 6 < 3 ? '#3c7c2c' : '#2c5c20'; ctx.fillRect(x - wdt, fy - y, wdt * 2, 1); if (y % 8 === 4) { ctx.fillStyle = '#e8f0a0'; ctx.fillRect(x - wdt - 2, fy - y, 2, 1); ctx.fillRect(x + wdt, fy - y - 2, 2, 1); } }
  }
}
