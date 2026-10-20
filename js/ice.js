// Eishöhle: gefrorene Grotte unter den Katakomben. In der Tiefe riesige Eiskristalle in PS2-3D – sechskantige, durch-
// scheinende Prismen mit Spitzen, die aus dem Boden wachsen und von der Decke hängen, in zwei Tiefen (Verschiebe-Puffer wie
// der Burghof-Wald) –, dazwischen funkelnde Lichtpunkte. Dazu die fallenden Eiszapfen: läuft der Held darunter, knacken sie,
// zittern eine halbe Sekunde und stürzen herab; nach ein paar Sekunden wachsen sie nach.
// Perspektive wie der PS2-Wald (js/ps2.js drawWoods): Spielebene bei z = 200, Augenhöhe 93 über dem Boden, Horizont y 83.
'use strict';

const IceCave = (() => {
  const ENV = { static: true, sun: (() => { const v = [-0.35, 0.8, -0.5], l = Math.hypot(...v); return v.map(c => c / l); })(), sunC: [0.62, 0.86, 1.1], amb: [0.34, 0.44, 0.6], sky: [0.22, 0.32, 0.48], fog: [12, 26, 48], fogD: 0.0011 };
  const BANDS = [{ z0: 520, z1: 600, par: 0.36, tol: 20, top: 300, n: 150, k: 1.6 }, { z0: 300, z1: 345, par: 0.62, tol: 12, top: 206, n: 110, k: 1 }];
  let bands = null, roomKey = null;
  const bufs = [{}, {}];
  function crystal(m, bx, by, bz, dx, dy, dz, len, r, c1, c2) { // sechskantiges Prisma entlang (dx, dy, dz) mit Spitze
    const l = Math.hypot(dx, dy, dz); dx /= l; dy /= l; dz /= l;
    let ux = -dz, uy = 0, uz = dx; if (Math.hypot(ux, uz) < 0.1) { ux = 1; uz = 0; }
    const ul = Math.hypot(ux, uy, uz); ux /= ul; uy /= ul; uz /= ul;
    const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
    const body = len * 0.78, r0 = [], r1 = [];
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, ca = Math.cos(a) * r, sa = Math.sin(a) * r, ox = ux * ca + vx * sa, oy = uy * ca + vy * sa, oz = uz * ca + vz * sa;
      r0.push(PS2.vtx(m, bx + ox, by + oy, bz + oz)); r1.push(PS2.vtx(m, bx + ox + dx * body, by + oy + dy * body, bz + oz + dz * body));
    }
    const tip = PS2.vtx(m, bx + dx * len, by + dy * len, bz + dz * len), C = [bx + dx * len / 2, by + dy * len / 2, bz + dz * len / 2];
    for (let i = 0; i < 6; i++) {
      const j = (i + 1) % 6;
      PS2.face(m, [r0[i], r0[j], r1[j], r1[i]], i % 2 ? c1 : c2, C, { a: 0.7 });
      PS2.face(m, [r1[i], r1[j], tip], i % 2 ? c2 : [232, 248, 255], C, { a: 0.82 });
    }
  }
  function build(room) {
    let s = 2027; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const span = room.w * T + 900;
    return BANDS.map(b => {
      const m = PS2.mesh(), n = Math.round(span / b.n);
      for (let i = 0; i < n; i++) {
        const x = -450 + rnd() * span, z = b.z0 + rnd() * (b.z1 - b.z0), up = rnd() < 0.62, by = up ? -2 : b.top, cnt = 3 + Math.floor(rnd() * 4);
        const cols = rnd() < 0.22 ? [[150, 120, 230], [204, 184, 255]] : [[104, 196, 240], [170, 230, 255]];
        for (let c = 0; c < cnt; c++) {
          const ang = (rnd() - 0.5) * 1.1, len = (38 + rnd() * 92) * b.k, r = (5 + rnd() * 9) * b.k;
          crystal(m, x + (rnd() - 0.5) * 22 * b.k, by, z + (rnd() - 0.5) * 16, Math.sin(ang), up ? Math.cos(ang) : -Math.cos(ang), (rnd() - 0.5) * 0.4, len, r, cols[0], cols[1]);
        }
      }
      return m;
    });
  }
  function drawCrystals(ctx, cam) {
    const room = W.room; if (!room) return;
    if (roomKey !== room) { bands = build(room); roomKey = room; bufs[0] = {}; bufs[1] = {}; }
    const w = View.w, dv = View.lite ? 3 : 2;
    BANDS.forEach((b, i) => PS2.shiftCache(ctx, bufs[i], { w, h: 208, dv, M: 48, par: b.par, tol: b.tol * (View.lite ? 1.5 : 1), camX: cam.x, key: w + '|' + Math.round(cam.y / dv), soft: 0,
      draw: (x, Wb, Hb) => PS2.render(x, Wb, Hb, [bands[i]], { x: cam.x + w / 2, y: 93 - cam.y, z: 0, yaw: 0, pitch: 0, f: 200 / dv, near: 20, hy: 0.4 }, ENV) }));
  }
  function drawGlints(ctx, cam, frame) { // Lichtpunkte im Eis: blitzen kurz auf, wandern mit der Tiefe
    const w = View.w, P = w + 96;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 34; i++) {
      const h1 = Math.sin(i * 127.1) * 43758.5453, h2 = Math.sin(i * 311.7) * 12345.6789, fx = h1 - Math.floor(h1), fy = h2 - Math.floor(h2);
      const par = 0.3 + (i % 3) * 0.12, sx = ((fx * P - cam.x * par) % P + P) % P - 48, sy = 18 + fy * 170 - cam.y * par * 0.5;
      const ph = (frame * 0.035 + i * 0.77) % (Math.PI * 2), k = Math.max(0, Math.sin(ph) - 0.86) / 0.14; if (k <= 0) continue;
      const r = Math.round(1 + k * 3), x = Math.round(sx), y = Math.round(sy);
      ctx.fillStyle = `rgba(220,245,255,${(0.9 * k).toFixed(2)})`; ctx.fillRect(x - r, y, r * 2 + 1, 1); ctx.fillRect(x, y - r, 1, r * 2 + 1);
      ctx.fillStyle = `rgba(255,255,255,${k.toFixed(2)})`; ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  }
  const prewarm = () => { if (W.room) { bands = build(W.room); roomKey = W.room; } };
  return { drawCrystals, drawGlints, prewarm };
})();

class FallingIcicle extends Ent {
  constructor(d) {
    super(d.x * T + 2, (d.y || 0) * T, 12, d.len || 24); this.kind = 'prop';
    this.home = this.y; this.st = 'hang'; this.t0 = 0; this.vy = 0;
  }
  update() {
    this.t++;
    const p = W.player;
    if (this.st === 'hang') {
      if (p.alive && Math.abs(p.cx - this.cx) < 30 && p.y > this.y && p.y - this.y < 220) { this.st = 'shake'; this.t0 = this.t; Audio8.sfx('crack', this.cx); }
    } else if (this.st === 'shake') {
      if (this.t - this.t0 > 30) { this.st = 'fall'; Audio8.sfx('whoosh', this.cx); }
    } else if (this.st === 'fall') {
      this.vy = Math.min(6.5, this.vy + 0.38); this.y += this.vy;
      if (p.alive && Phys.overlap({ x: this.x + 2, y: this.y + this.h - 12, w: this.w - 4, h: 12 }, p)) { p.hurt(1, this.cx); this.shatter(); }
      else if (Phys.solidTile(Math.floor(this.cx / T), Math.floor((this.y + this.h) / T)) || this.y > W.room.h * T) this.shatter();
    } else if (this.st === 'gone') {
      if (this.t - this.t0 > 360) { this.st = 'grow'; this.y = this.home; this.vy = 0; this.t0 = this.t; }
    } else if (this.st === 'grow' && this.t - this.t0 > 70) this.st = 'hang';
  }
  shatter() {
    this.st = 'gone'; this.t0 = this.t; Audio8.sfx('shatter', this.cx);
    for (let i = 0; i < 12; i++) W.spawn(new Particle(this.cx, this.y + this.h - 4, rnd(-1.6, 1.6), rnd(-2.6, -0.6), i % 3 ? '#c8f4fc' : '#ffffff', 34, 2, 0.16));
  }
  draw(ctx) {
    if (this.st === 'gone') return;
    const g = this.st === 'grow' ? Math.min(1, (this.t - this.t0) / 70) : 1, len = this.h * g;
    const jit = this.st === 'shake' ? ((this.t >> 1) & 1 ? 1 : -1) : 0, x = Math.round(this.x - W.cam.x) + jit, y = Math.round(this.y - W.cam.y);
    for (let r = 0; r < len; r++) { // Zapfen: oben breit, spitz zulaufend; Glanzkante links, dunkle Kante rechts
      const ww = Math.max(1, Math.round(this.w * (1 - r / len)) ), x0 = x + ((this.w - ww) >> 1);
      ctx.fillStyle = r < 3 ? '#e8fcfc' : '#8cd4f4'; ctx.fillRect(x0, y + r, ww, 1);
      if (ww > 2) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x0, y + r, 1, 1); ctx.fillStyle = '#3c88c0'; ctx.fillRect(x0 + ww - 1, y + r, 1, 1); }
    }
    if (this.st === 'shake' && (this.t & 4)) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 3, y - 2, 6, 1); } // Riss an der Decke
  }
}
