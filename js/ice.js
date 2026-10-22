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
    const wrap = !!room.wrap, P = 5120, span = wrap ? P : room.w * T + 900; // Eisturm: Kristalle rundherum, an der Naht doppelt
    return BANDS.map(b => {
      const m = PS2.mesh(), n = Math.round(span / b.n / (wrap ? 1.6 : 1));
      for (let i = 0; i < n; i++) {
        const x = (wrap ? 0 : -450) + rnd() * span, z = b.z0 + rnd() * (b.z1 - b.z0), up = rnd() < 0.62, by = up ? -2 : b.top, cnt = 3 + Math.floor(rnd() * 4);
        const cols = rnd() < 0.22 ? [[150, 120, 230], [204, 184, 255]] : [[104, 196, 240], [170, 230, 255]];
        for (let c = 0; c < cnt; c++) {
          const ang = (rnd() - 0.5) * 1.1, len = (38 + rnd() * 92) * b.k, r = (5 + rnd() * 9) * b.k, cx = x + (rnd() - 0.5) * 22 * b.k, cz = z + (rnd() - 0.5) * 16, dz = (rnd() - 0.5) * 0.4;
          for (const off of wrap ? [0, cx < 900 ? P : 0, cx > P - 900 ? -P : 0].filter((o, j) => j === 0 || o) : [0])
            crystal(m, cx + off, by, cz, Math.sin(ang), up ? Math.cos(ang) : -Math.cos(ang), dz, len, r, cols[0], cols[1]);
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

// ---------------- Eisturm: Gefahren, Schwung, Kerzenketten und die Eishexe am Turmfuß ----------------

// Eiszapfen über den Rampen: zielt auf den Helden – er rechnet aus dessen Tempo, wann er losbrechen muss, damit er genau
// dort einschlägt, wo der Held gleich ist. Wer sich duckt oder einen Boost erwischt, ist schneller als berechnet und rutscht
// drunter durch; wer bremst, sieht ihn vor sich herunterkrachen. Hängt an einer Eiskruste, wächst nach einer Weile nach.
class TowerIcicle extends FallingIcicle {
  constructor(d) { super(d); this.ty = d.ty * T; this.lastPx = null; this.pv = 2; }
  update() {
    this.t++;
    const p = W.player;
    if (this.lastPx !== null) this.pv = this.pv * 0.85 + Math.max(0, wrapDx(p.cx - this.lastPx)) * 0.15; // Tempo des Helden nach rechts
    this.lastPx = p.cx;
    if (this.st === 'hang') {
      const dx = wrapDx(this.cx - p.cx), fall = Math.max(8, this.ty - 26 - (this.y + this.h)), tf = 14 + Math.sqrt(2 * fall / 0.38);
      if (p.alive && dx > -4 && dx < 280 && p.feet > this.y + this.h && Math.abs(p.feet - this.ty) < 150 && dx / Math.max(0.9, this.pv) <= tf) {
        this.st = 'shake'; this.t0 = this.t; Audio8.sfx('crack', this.cx);
      }
    } else if (this.st === 'shake') {
      if (this.t - this.t0 >= 14) { this.st = 'fall'; Audio8.sfx('whoosh', this.cx); }
    } else if (this.st === 'fall') {
      this.vy = Math.min(6.5, this.vy + 0.38); this.y += this.vy;
      if (p.alive && Phys.overlap({ x: this.x + 2, y: this.y + this.h - 12, w: this.w - 4, h: 12 }, p)) { p.hurt(1, this.cx); this.shatter(); }
      else if (this.y + this.h >= this.ty || this.y > W.room.h * T) this.shatter();
    } else if (this.st === 'gone') {
      if (this.t - this.t0 > 300) { this.st = 'grow'; this.y = this.home; this.vy = 0; this.t0 = this.t; }
    } else if (this.st === 'grow' && this.t - this.t0 > 70) this.st = 'hang';
  }
  draw(ctx) { // Eiskruste, an der der Zapfen hängt (bleibt, wenn er abgebrochen ist)
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.home - W.cam.y);
    ctx.fillStyle = '#5c9ccc'; ctx.fillRect(x - 5, y - 4, this.w + 10, 4);
    ctx.fillStyle = '#c8ecfc'; ctx.fillRect(x - 5, y - 4, this.w + 10, 1);
    ctx.fillStyle = '#2c5c8c'; ctx.fillRect(x - 4, y - 1, this.w + 8, 1);
    super.draw(ctx);
  }
}

// Boost-Kristall: glühende Eisraute auf der Rampe – wer hindurchrutscht, schießt mit Überschall davon (Funken, Schlieren)
class BoostCrystal extends Ent {
  constructor(d) { super(d.x * T + 2, d.y * T - 15, 12, 14); this.kind = 'prop'; this.cool = 0; }
  update() {
    this.t++; if (this.cool > 0) this.cool--;
    const p = W.player;
    if (!this.cool && p.alive && Phys.overlap({ x: this.x - 2, y: this.y - 4, w: this.w + 4, h: this.h + 8 }, p)) {
      this.cool = 240; p.boostT = 60;
      if (p.state === 'stairs') p.rampV = Math.min(p.rampV || 0, -5.2);
      else { const d = Math.sign(p.vx) || p.face || 1; p.vx = d * Math.max(Math.abs(p.vx), 4.6); p.iceV = true; }
      Audio8.sfx('rise', this.cx); Input.rumble(0.3, 0.4, 160); W.shake = Math.max(W.shake, 3);
      for (let i = 0; i < 16; i++) W.spawn(new Particle(this.cx, this.cy, rnd(-2.4, 2.4), rnd(-2.6, 0.6), i % 3 ? '#7cf4ff' : '#ffffff', 30, i % 4 ? 1 : 2, 0.08));
      W.popup(this.cx, this.y - 6, 'BOOST!', '#7cf4ff');
    }
  }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.y - W.cam.y), on = !this.cool, t = this.t, b = Math.round(Math.sin(t * 0.12) * 1.5);
    if (on) {
      const r = 14 + Math.sin(t * 0.2) * 2, g = ctx.createRadialGradient(x, y + 7, 0, x, y + 7, r);
      g.addColorStop(0, 'rgba(124,244,255,0.55)'); g.addColorStop(1, 'rgba(124,244,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y + 7 - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
    }
    for (let r = 0; r < 14; r++) { // Raute aus Zeilen: oben hell, links Glanz, rechts Schatten
      const hw = Math.round((r < 6 ? r / 6 : (13 - r) / 7) * 6) + 1, yy = y + r + b;
      ctx.fillStyle = on ? (r < 4 ? '#e8fcff' : '#7cd8f4') : '#3c5c7c'; ctx.fillRect(x - hw, yy, hw * 2, 1);
      if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - hw, yy, 1, 1); ctx.fillStyle = '#2c88c0'; ctx.fillRect(x + hw - 1, yy, 1, 1); }
    }
    if (on && (t % 40) < 6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 3 + b, 2, 2); ctx.fillRect(x + 4, y + 2 + b, 1, 1); }
  }
}

// Kerzenkette: blaue Irrlichter entlang der idealen Sprunglinie über einer Schanze – jedes bringt Punkte, die ganze Kette
// einen Bonus. Wer im richtigen Moment abspringt, fliegt durch alle hindurch.
class ChainFlame extends Ent {
  constructor(x, y, chain, i) { super(x * T - 4, y * T - 6, 8, 12); this.kind = 'prop'; this.chain = chain; this.i = i; this.got = false; this.gotT = 0; }
  update() {
    this.t++;
    if (this.got) { if (this.t - this.gotT > 20) this.dead = true; return; }
    const p = W.player;
    if (p.alive && Phys.overlap({ x: this.x - 3, y: this.y - 3, w: this.w + 6, h: this.h + 6 }, p)) {
      this.got = true; this.gotT = this.t; const c = this.chain; c.got++;
      W.addScore(100, this.cx, this.y); Audio8.sfx('candle', this.cx);
      for (let k = 0; k < 6; k++) W.spawn(new Particle(this.cx, this.cy, rnd(-1.2, 1.2), rnd(-1.8, 0), k % 2 ? '#a4e4fc' : '#ffffff', 22, 1, 0.05));
      if (c.got === c.n) { W.addScore(1000); W.popup(this.cx, this.y - 18, tr('chainBonus') + ' +1000', '#a4e4fc'); Audio8.sfx('bigItem'); W.comboHit(); }
    }
  }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.y - W.cam.y + Math.sin(this.t * 0.1 + this.i) * 1.5);
    if (this.got) { const k = (this.t - this.gotT) / 20; ctx.globalAlpha = Math.max(0, 1 - k); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, Math.round(y + 4 - k * 10), 2, 2); ctx.globalAlpha = 1; return; }
    const r = 9 + Math.sin(this.t * 0.25 + this.i) * 1.5, g = ctx.createRadialGradient(x, y + 7, 0, x, y + 7, r);
    g.addColorStop(0, 'rgba(120,200,255,0.5)'); g.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y + 7 - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
    const f = ((this.t + this.i * 3) >> 2) & 1; // Flamme flackert
    ctx.fillStyle = '#3c78d8'; ctx.fillRect(x - 2, y + 4, 5, 6); ctx.fillRect(x - 1, y + 2 - f, 3, 2);
    ctx.fillStyle = '#a4e4fc'; ctx.fillRect(x - 1, y + 5, 3, 4); ctx.fillRect(x, y + 3 - f, 1, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y + 7, 1, 2);
    ctx.fillStyle = '#d8e8f0'; ctx.fillRect(x - 1, y + 10, 3, 3); ctx.fillStyle = '#8ca0b0'; ctx.fillRect(x + 1, y + 10, 1, 3); // Kerzenstumpf
  }
}
const FlameChain = { spawn(d) { const c = { n: d.pts.length, got: 0 }; d.pts.forEach(([x, y], i) => W.spawn(new ChainFlame(x, y, c, i))); } };

// Eisbrocken: rollen eine lange Rampe hinunter, langsamer als der Held – wer (geduckt) heranrast, springt drüber oder
// zerschlägt sie (2 Hiebe); unten rollen sie über den Auslauf und stürzen vorn in die Tiefe
class IceBoulder extends Enemy {
  constructor(s, pos) { super(0, 0, 14, 14, 2, 2, 150); this.s = s; this.pos = pos; this.v = 1.7; this.rot = 0; this.onRamp = true; this.face = 1; this.y0 = 0; this.place(); }
  place() { const s = this.s; this.x = s.bx + this.pos * s.dir - 7; this.y = s.by - this.pos - 14; }
  update() {
    super.update();
    const d = -this.s.dir; // bergab
    if (this.onRamp) {
      this.pos -= this.v; this.rot += d * this.v / 7;
      if (this.pos <= 0) { this.onRamp = false; this.vx = d * this.v; this.vy = 0; this.y0 = this.y; } else this.place();
      if (this.t % 5 === 0) W.spawn(new Particle(this.cx - d * 6, this.y + this.h, -d * rnd(0.2, 1), rnd(-1, -0.2), '#d8f4fc', 16, 1, 0.08));
    } else {
      this.vx = d * this.v; this.rot += this.vx / 7; this.physics();
      if (this.y - this.y0 > 4 * T || (this.onGround && Phys.tile(Math.floor(this.cx / T), Math.floor((this.y + this.h + 1) / T)) === '^')) { this.shatter(false); return; }
    }
    if (this.t > 900) { this.shatter(false); return; }
    this.touch();
  }
  kill() { this.shatter(true); }
  shatter(scored) {
    this.dead = true; Audio8.sfx('shatter', this.cx); W.shake = Math.max(W.shake, 2);
    for (let i = 0; i < 14; i++) W.spawn(new Particle(this.cx, this.cy, rnd(-2, 2), rnd(-3, -0.5), i % 3 ? '#a8e0f8' : '#ffffff', 30, i % 3 ? 2 : 1, 0.16));
    if (scored) W.addScore(this.score * W.comboMul(), this.cx, this.y);
  }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.cy - W.cam.y), fl = this.flash;
    ctx.fillStyle = fl ? '#ffffff' : '#3c78b4'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = fl ? '#ffffff' : '#a8dcf4'; ctx.beginPath(); ctx.arc(x - 1, y - 1, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2c5c8c'; ctx.lineWidth = 1; ctx.beginPath();
    for (let k = 0; k < 3; k++) { const a = this.rot + k * 2.1; ctx.moveTo(x + Math.cos(a) * 2, y + Math.sin(a) * 2); ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6); }
    ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 4, y - 4, 2, 2);
  }
}
class RampChute extends Ent { // Eisspalte über einer langen Rampe (bx/by = Fuß der Rampe in Kacheln): wer hinunterrutscht, dem rollen zwei Brocken voraus
  constructor(d) { super(0, 0, 16, 20); this.kind = 'prop'; this.bx = d.bx; this.by = d.by; this.s = null; this.armed = true; this.shake = 0; }
  update() {
    this.t++; if (this.shake > 0) this.shake--;
    if (!this.s) {
      this.s = W.stairs.find(st => Math.round(st.bx / T) === this.bx && Math.round(st.by / T) === this.by) || null;
      if (!this.s) return;
      const s = this.s, pos = s.len * 0.62; this.x = s.bx + pos * s.dir - 8; this.y = s.by - pos - 46;
    }
    const p = W.player, s = this.s;
    if (p.state !== 'stairs' || p.stair !== s) { this.armed = true; return; } // neuer Versuch: wieder scharf
    if (this.armed && p.stairPos > s.len * 0.75) {
      this.armed = false; this.shake = 14; Audio8.sfx('crumble', this.cx);
      for (const k of [0.55, 0.28]) W.spawn(new IceBoulder(s, s.len * k));
    }
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x) + (this.shake & 2 ? 1 : 0), y = Math.round(this.y - W.cam.y);
    ctx.fillStyle = '#0c1c3c'; ctx.fillRect(x, y + 2, 16, 18);
    ctx.fillStyle = '#3c78b4'; ctx.fillRect(x - 2, y, 20, 3); ctx.fillStyle = '#c8ecfc'; ctx.fillRect(x - 2, y, 20, 1);
    ctx.fillStyle = '#8cd4f4'; for (let i = 0; i < 4; i++) ctx.fillRect(x + 1 + i * 4, y + 3, 2, 2 + (i % 2) * 2);
  }
}

// Eisskelett: gleitet auf Kufen übers Eis auf den Helden zu, träge und nicht zu bremsen; ein Peitschenhieb fegt es zurück –
// rutscht es über die Kante, stürzt es in die Tiefe
class IceSkeleton extends Enemy {
  constructor(tx, ty) { super(tx * T + 3, (ty + 1) * T - 28, 10, 28, 2, 2, 400); this.y0 = this.y; this.awake = false; this.knockT = 0; }
  update() {
    super.update();
    const p = W.player, dx = wrapDx(p.cx - this.cx);
    if (!this.awake) { if (this.onScreen(-20) && Math.abs(dx) < 200) this.awake = true; else { this.physics(); return; } }
    if (this.knockT > 0) this.knockT--;
    else { const want = Math.sign(dx) * 1.7; this.vx += (want - this.vx) * 0.035; this.face = Math.sign(dx) || this.face; }
    this.physics();
    if (this.onGround && Math.abs(this.vx) > 0.6 && this.t % 4 === 0) W.spawn(new Particle(this.cx - Math.sign(this.vx) * 4, this.y + this.h, -this.vx * 0.3, rnd(-0.8, -0.2), '#d8f4fc', 14, 1, 0.08));
    if (this.y - this.y0 > 3 * T) { this.kill(); return; } // über die Kante gerutscht
    if (!this.knockT) this.touch();
  }
  hit(dmg, id) {
    if (id && this.lastHit === id) return false;
    const p = W.player; this.knockT = 26; this.vx = Math.sign(this.cx - p.cx || 1) * 3.4; this.vy = -1.2; // die Peitsche fegt es übers Eis
    return super.hit(dmg, id);
  }
  draw(ctx) {
    const s = Sprites.S.skel[Math.floor(this.t / 14) % 2];
    this.spr(ctx, s, this.face < 0, 0, 0, this.flash);
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.y - W.cam.y);
    ctx.fillStyle = '#c8f4fc'; ctx.fillRect(x - 3, y + 1, 6, 1); ctx.fillRect(x - 5, y + 9, 3, 1); ctx.fillRect(x + 3, y + 9, 3, 1); // Reif
    ctx.fillStyle = '#7cd8f4'; ctx.fillRect(x - 6, y + this.h - 1, 12, 1); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y + this.h - 1, 2, 1); // Kufen
  }
}

// Eisspitze aus dem Himmel (Angriff der Eishexe): erst ein leuchtender Schatten am Boden, dann stürzt sie herab
class IceSpike extends Ent {
  constructor(x, groundY, delay) { super(x - 4, groundY - 150, 8, 18); this.kind = 'eproj'; this.gy = groundY; this.delay = delay; this.vy = 0; }
  update() {
    this.t++;
    if (this.t < this.delay) return;
    this.vy = Math.min(7, this.vy + 0.45); this.y += this.vy;
    const p = W.player;
    if (p.alive && Phys.overlap(this, p)) { p.hurt(2, this.cx); this.burst(); }
    else if (this.y + this.h >= this.gy) this.burst();
  }
  burst() {
    this.dead = true; Audio8.sfx('shatter', this.cx);
    for (let i = 0; i < 8; i++) W.spawn(new Particle(this.cx, this.gy - 2, rnd(-1.6, 1.6), rnd(-2.4, -0.6), i % 2 ? '#c8f4fc' : '#ffffff', 26, 2, 0.16));
  }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), gy = Math.round(this.gy - W.cam.y);
    const k = Math.min(1, this.t / this.delay); // Markierung am Boden wächst, bis die Spitze kommt
    ctx.globalAlpha = 0.3 + 0.45 * k; ctx.fillStyle = '#7cf4ff'; ctx.fillRect(Math.round(x - 2 - 6 * k), gy - 1, Math.round(4 + 12 * k), 2); ctx.globalAlpha = 1;
    if (this.t < this.delay) return;
    const y = Math.round(this.y - W.cam.y);
    for (let r = 0; r < this.h; r++) { const ww = Math.max(1, Math.round(8 * (1 - r / this.h))); ctx.fillStyle = r > this.h - 4 ? '#ffffff' : r < 3 ? '#e8fcff' : '#8cd4f4'; ctx.fillRect(x - (ww >> 1), y + r, ww, 1); }
  }
}

// Die Eishexe: Zwischenboss auf dem runden Boden am Turmfuß. Sie umkreist den Turm mit dem Helden, schießt Eissplitter,
// lässt Eisspitzen regnen, fegt in Kopfhöhe über den Boden (ducken oder doppelt springen) und rastet danach kurz am Boden –
// das ist die Gelegenheit. Ab halber Kraft ruft sie zwei Eisskelette. Danach schmilzt das Eistor zur Gruft.
class IceWitch extends Boss {
  constructor(x, groundY) {
    super(x - 15, groundY - 230, 30, 50, 22, 2);
    this.mini = true; this.nameKey = 'bossWitch'; this.voice = 'bossWitch'; this.music = 'boss'; this.score = 8000;
    this.gy = groundY; this.hoverY = groundY - 100; this.lootY = groundY - 30;
    this.state = 'intro'; this.next = 0; this.ph2 = false; this.side = 1; this.sx = 1; this.face = -1;
  }
  vulnerable() { return this.state !== 'intro'; }
  update() {
    this.tick();
    if (this.dying) { this.y += Math.sin(this.t * 0.5) * 0.3; this.updateDeath(110); return; }
    const p = W.player, dx = wrapDx(p.cx - this.cx);
    if (this.state !== 'swoop') this.face = dx >= 0 ? 1 : -1;
    if (!this.ph2 && this.hp <= this.maxHp / 2 && this.state !== 'intro') { this.ph2 = true; this.state = 'summon'; this.timer = 0; Audio8.sfx('roar'); W.shake = 12; }
    const toward = (ty, k) => { this.y += (ty - this.y) * k; };
    switch (this.state) {
      case 'intro': toward(this.hoverY, 0.035); if (this.timer > 90) this.go('float'); break;
      case 'float': { // hält Abstand auf ihrer Seite, schwebt auf und ab
        const want = wrapDx(p.cx - this.side * 110 - this.cx);
        this.x += clamp(want * 0.04, -2.2, 2.2); toward(this.hoverY + Math.sin(this.t * 0.05) * 10, 0.08);
        if (Math.abs(dx) < 50) this.side = -this.side;
        if (this.timer > (this.ph2 ? 50 : 76)) this.go(['shards', 'rain', 'swoop'][this.next++ % 3]);
        break;
      }
      case 'shards': // Stab hoch: Eissplitter im Fächer auf den Helden
        toward(this.hoverY, 0.08);
        if (this.timer === 18 || (this.ph2 && this.timer === 40)) {
          const n = this.ph2 ? 5 : 3, a = Math.atan2(p.cy - (this.y + 6), dx);
          for (let i = 0; i < n; i++) { const ang = a + (i - (n - 1) / 2) * 0.22; W.spawn(new EProj('ice', this.cx + this.face * 12, this.y + 6, Math.cos(ang) * 2.6, Math.sin(ang) * 2.6, 0, 2)); }
          Audio8.sfx('crack', this.cx);
        }
        if (this.timer > (this.ph2 ? 60 : 44)) this.go('float');
        break;
      case 'rain': // Hände hoch: Eisspitzen fallen auf den Helden und um ihn herum
        toward(this.hoverY - 16, 0.06);
        if (this.timer === 20) { const n = this.ph2 ? 6 : 4; for (let i = 0; i < n; i++) W.spawn(new IceSpike(p.cx + (i - (n - 1) / 2) * 34 + rnd(-6, 6), this.gy, 34 + i * 6)); Audio8.sfx('chain', this.cx); }
        if (this.timer > 82) this.go('float');
        break;
      case 'swoop': // holt aus, dann quer über den Boden in Kopfhöhe – ducken oder doppelt springen
        if (this.timer === 1) { this.sx = this.face; if (!this.warned) { this.warned = true; W.popup(p.cx, p.y - 12, tr('duckHint'), '#7cf4ff'); } }
        if (this.timer < 26) { toward(this.gy - 22 - this.h, 0.12); this.x -= this.sx * 0.6; }
        else if (this.timer < 26 + 66) { this.x += this.sx * (this.ph2 ? 4.4 : 3.6); toward(this.gy - 22 - this.h, 0.3); if (this.timer % 2 === 0) W.spawn(new Particle(this.cx, this.cy, -this.sx * rnd(0.5, 1.5), rnd(-0.6, 0.6), '#c8f4fc', 24, 2, 0)); if (this.timer === 27) Audio8.sfx('whoosh', this.cx); }
        else this.go('rest');
        break;
      case 'rest': // landet erschöpft am Boden: jetzt treffen!
        toward(this.gy - this.h, 0.15);
        if (this.timer > (this.ph2 ? 46 : 64)) { this.side = -this.side; this.go('float'); }
        break;
      case 'summon': // Phase 2: zwei Eisskelette gleiten heran
        toward(this.hoverY - 20, 0.06);
        if (this.timer === 30) {
          for (const s of [-1, 1]) { const sk = new IceSkeleton(0, 0); sk.x = p.cx + s * 150 - 5; sk.y = this.gy - 28; sk.y0 = sk.y; sk.awake = true; W.spawn(sk); }
          Audio8.sfx('rise', this.cx);
        }
        if (this.timer > 60) this.go('float');
        break;
    }
    if (this.state !== 'intro') this.touch();
  }
  go(s) { this.state = s; this.timer = 0; }
  draw(ctx) {
    const X = Math.round(this.cx - W.cam.x), F = Math.round(this.y + this.h - W.cam.y), t = this.t, d = this.face, fl = this.flashT > 0 && (t & 2);
    const gy = Math.round(this.gy - W.cam.y), sh = Math.max(0.12, 0.5 - (this.gy - (this.y + this.h)) / 220); // Schatten am Boden
    ctx.fillStyle = `rgba(20,40,90,${sh.toFixed(2)})`; ctx.beginPath(); ctx.ellipse(X, gy - 1, 18, 3, 0, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(X, F - 26, 0, X, F - 26, 46); g.addColorStop(0, 'rgba(124,220,255,0.35)'); g.addColorStop(1, 'rgba(124,220,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(X - 46, F - 72, 92, 92); ctx.globalCompositeOperation = 'source-over';
    const P = fl ? { robe: '#ffffff', robe2: '#ffffff', cape: '#e0f4ff', skin: '#ffffff', hair: '#ffffff', trim: '#ffffff', staff: '#ffffff' }
      : { robe: '#24408c', robe2: '#16285c', cape: '#0c1638', skin: '#d8ecf8', hair: '#eef8ff', trim: '#a8e4fc', staff: '#7c94c8' };
    const up = this.state === 'shards' || this.state === 'rain' || this.state === 'summon' ? 6 : 0, rest = this.state === 'rest';
    ctx.save(); ctx.translate(X, F); ctx.scale(1.5, 1.5); // Pixel-Figur in 1,5-facher Größe
    ctx.fillStyle = P.cape; // Umhang hinter ihr, weht
    for (let r = 0; r < 26; r++) { const w = 6 + r * 0.45, off = Math.round(Math.sin(t * 0.12 + r * 0.25) * (r * 0.15)); ctx.fillRect(Math.round(-d * (4 + w * 0.5) + off - w / 2), -30 + r, Math.round(w), 1); }
    ctx.fillStyle = P.hair; // lange weiße Strähnen nach hinten
    for (let i = 0; i < 4; i++) { const len = 10 + i * 3; for (let k = 0; k < len; k++) ctx.fillRect(Math.round(-d * (3 + k * 0.6) + Math.sin(t * 0.15 + k * 0.4 + i) * 1.2), -33 + i + Math.round(k * 0.55), 1, 1); }
    for (let r = 0; r < 24; r++) { // Robe, weit ausgestellt
      const hw = 3 + Math.round(r * 0.32); ctx.fillStyle = r < 4 ? P.robe2 : P.robe; ctx.fillRect(-hw, -26 + r, hw * 2, 1);
      ctx.fillStyle = P.robe2; ctx.fillRect(d > 0 ? -hw : hw - 1, -26 + r, 1, 1);
    }
    ctx.fillStyle = P.trim; for (let i = -10; i <= 9; i += 3) { const h = 2 + ((i + 10 + (t >> 3)) % 3); ctx.fillRect(i, -2, 2, h); } // Eiszacken am Saum
    ctx.fillStyle = P.skin; ctx.fillRect(-3, -33 + (rest ? 2 : 0), 6, 7); // Kopf
    ctx.fillStyle = P.hair; ctx.fillRect(-4, -34 + (rest ? 2 : 0), 8, 2); ctx.fillRect(d > 0 ? -5 : 3, -33 + (rest ? 2 : 0), 2, 6);
    ctx.fillStyle = fl ? '#ffffff' : '#7cf4ff'; ctx.fillRect(d > 0 ? 1 : -2, -31 + (rest ? 2 : 0), 2, 1); // glühendes Auge
    ctx.fillStyle = P.trim; for (const [ox, h] of [[-3, 3], [-1, 5], [1, 4], [3, 3]]) ctx.fillRect(ox, -34 - h + (rest ? 2 : 0), 1, h); // Eiskrone
    const sx = d * 8; ctx.fillStyle = P.staff; ctx.fillRect(sx, -30 - up, 1, 28); // Stab
    ctx.fillStyle = P.robe2; ctx.fillRect(d > 0 ? 2 : -7, -24 - (up ? 3 : 0), 5, 2); // Arm
    ctx.restore();
    const ox = X + d * 12, oy = F - Math.round((33 + up) * 1.5), og = ctx.createRadialGradient(ox, oy, 0, ox, oy, 10 + (up ? 4 : 0)); // Eiskugel am Stab
    og.addColorStop(0, 'rgba(220,250,255,0.95)'); og.addColorStop(1, 'rgba(124,220,255,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = og; ctx.fillRect(ox - 14, oy - 14, 28, 28); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#e8fcff'; ctx.fillRect(ox - 2, oy - 2, 4, 4);
  }
}

// Eistor am Turmfuß: versiegelt den Weg zur Gruft, bis die Eishexe besiegt ist; ruft sie, sobald der Held unten ankommt
class WitchGate extends Ent {
  constructor(d) { super(d.x0 * T, d.y0 * T, (d.x1 - d.x0 + 1) * T, (d.y1 - d.y0 + 1) * T); this.kind = 'prop'; this.open = false; this.fought = false; }
  update() {
    this.t++;
    const key = W.stage + ':' + W.roomIdx, done = !!W.miniDone[key], p = W.player;
    if (done && !this.open) {
      this.open = true; Audio8.sfx('shatter', this.cx); W.shake = Math.max(W.shake, 10);
      for (let i = 0; i < 30; i++) W.spawn(new Particle(this.x + rnd(0, this.w), this.y + rnd(0, this.h), rnd(-2, 2), rnd(-3, 0), i % 3 ? '#a8e0f8' : '#ffffff', 40, 2, 0.14));
    }
    W.exitBlocked = !done;
    if (!done && !W.boss && !this.fought && p.alive && p.onGround && p.feet >= (W.room.h - 3) * T) {
      this.fought = true;
      const gy = (W.room.h - 2) * T;
      W.boss = W.spawn(new IceWitch(p.cx + 150, gy));
      Audio8.stop(); Audio8.play('boss'); Audio8.sfx('roar'); Input.rumble(0.8, 0.5, 700);
      W.cinema = 90; W.shake = 14; W.flash = 6;
    }
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), w = this.w, h = this.h, t = this.t;
    ctx.fillStyle = '#1c3c6c'; ctx.fillRect(x - 6, y - 4, w + 12, h + 4); // Rahmen aus Eisquadern
    ctx.fillStyle = '#5c9ccc'; for (let i = 0; i < 7; i++) { ctx.fillRect(x - 6, y - 4 + i * 9, 5, 8); ctx.fillRect(x + w + 1, y - 4 + i * 9, 5, 8); }
    ctx.fillRect(x - 6, y - 9, w + 12, 6); ctx.fillStyle = '#c8ecfc'; ctx.fillRect(x - 6, y - 9, w + 12, 1);
    if (this.open) { // offen: dunkler Gang, warmes Licht aus der Gruft
      ctx.fillStyle = '#05060c'; ctx.fillRect(x, y, w, h);
      const g = ctx.createLinearGradient(0, y + h, 0, y); g.addColorStop(0, 'rgba(255,170,80,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    } else { // versiegelt: dicke Eisplatte mit leuchtender Rune
      ctx.fillStyle = 'rgba(140,210,250,0.85)'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x + 2, y + 2, 2, h - 4); ctx.fillRect(x + 6, y + 4, 1, h - 10);
      const a = 0.5 + 0.4 * Math.sin(t * 0.08), cx = x + (w >> 1), cy = y + (h >> 1);
      ctx.fillStyle = `rgba(124,244,255,${a.toFixed(2)})`; ctx.fillRect(cx - 1, cy - 8, 2, 16); ctx.fillRect(cx - 6, cy - 1, 12, 2); ctx.fillRect(cx - 4, cy - 5, 2, 2); ctx.fillRect(cx + 2, cy + 3, 2, 2);
    }
  }
}
