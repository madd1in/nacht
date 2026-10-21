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

// ---------------- Lawine im Eisturm ----------------
// Eine Schneelawine rollt hinter dem Helden den Weg um den Turm hinab (wie die Kugel im Tempel): sie folgt der Route
// (Wegpunkte, abgewickelt über mehrere Runden), kriecht stetig voran und bleibt nie weiter als eine Leine zurück – wer
// trödelt, wird eingeholt; hochklettern ist kein Problem, gezählt wird der Weg. Erwischt sie ihn, kostet das Energie und
// er erwacht am letzten Kontrollpunkt (Engelsstatue), die Lawine setzt dahinter neu an und wartet, bis er losläuft.
// Unten am Turmfuß bricht sie donnernd zusammen. Bild: ein walzender Berg aus Schneeballen (vorgerendert, weich
// schattiert) mit Schneestaub und kullernden Eisbrocken, auf dem Turm platziert wie jede Figur; Grollen und Beben, je näher.
const SNOWBALL = (() => {
  let c = null;
  return () => c || (c = (() => {
    const k = Sprites.canvas(64, 64), x = k.getContext('2d');
    const g = x.createRadialGradient(26, 22, 4, 32, 32, 31); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, '#eef6ff'); g.addColorStop(0.8, '#b4cce8'); g.addColorStop(0.97, 'rgba(120,150,200,0.85)'); g.addColorStop(1, 'rgba(120,150,200,0)');
    x.fillStyle = g; x.beginPath(); x.arc(32, 32, 31, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(60,90,150,0.22)'; x.beginPath(); x.ellipse(36, 44, 22, 12, 0, 0, Math.PI * 2); x.fill(); // Eigenschatten unten
    return k;
  })());
})();
class Avalanche extends Ent {
  constructor(d) {
    super(0, 0, 56, 64); this.kind = 'prop'; this.noWrap = true;
    this.pts = d.route.map(([ux, row]) => [ux * T + 8, row * T]); this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) this.cum.push(this.cum[i - 1] + Math.hypot(this.pts[i][0] - this.pts[i - 1][0], this.pts[i][1] - this.pts[i - 1][1]));
    this.speed = d.speed || 1; this.leash = d.leash || 176; this.sp = 0; this.sa = -60; this.idx = 0;
    this.wait = true; this.over = false; this.fell = undefined; this.started = false; this.chunks = []; this.dir = 1; this.hits = 0;
  }
  safe() { const c = W.checkpoint, r = W.room; return c && c.stage === W.stage && c.room === W.roomIdx ? c : { cx: r.start.x * T + 8, feet: (r.start.y + 1) * T }; }
  // Wegstrecke des Helden: nächster Punkt auf der Route (lokal um den letzten Abschnitt oder global), Naht beachtet
  project(px, feet, global) {
    let best = 1e9, bs = 0, bi = this.idx;
    const i0 = global ? 0 : Math.max(0, this.idx - 2), i1 = global ? this.pts.length - 1 : Math.min(this.pts.length - 1, this.idx + 4);
    for (let i = i0; i < i1; i++) {
      const [ax, ay] = this.pts[i], [bx, by] = this.pts[i + 1], mx = (ax + bx) / 2, ux = mx + wrapDx(px - mx);
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, t = clamp(((ux - ax) * dx + (feet - ay) * dy) / L2, 0, 1);
      const d = Math.hypot(ax + dx * t - ux, (ay + dy * t - feet) * 1.4);
      if (d < best) { best = d; bi = i; bs = this.cum[i] + t * (this.cum[i + 1] - this.cum[i]); }
    }
    return { s: bs, i: bi };
  }
  at(s) { // Weltposition bei Wegstrecke s
    let i = 0; while (i < this.pts.length - 2 && this.cum[i + 1] < s) i++;
    const L = this.cum[i + 1] - this.cum[i] || 1, t = clamp((s - this.cum[i]) / L, 0, 1), [ax, ay] = this.pts[i], [bx, by] = this.pts[i + 1];
    return [ax + (bx - ax) * t, ay + (by - ay) * t, Math.sign(bx - ax) || 1];
  }
  reset() { const s = this.safe(), pr = this.project(s.cx, s.feet, true); this.idx = pr.i; this.sp = pr.s; this.sa = pr.s - this.leash - 90; this.wait = true; }
  update() {
    const p = W.player; this.t++;
    if (this.fell === undefined) { this.fell = p.fellAt; this.reset(); }
    if (this.over) return;
    if (p.fellAt !== this.fell) { this.fell = p.fellAt; const pr = this.project(p.cx, p.feet, true); this.idx = pr.i; this.sp = pr.s; this.sa = Math.min(this.sa, this.sp - this.leash - 40); } // Absturz: etwas Luft
    if (p.alive && (p.onGround || p.state === 'stairs' || p.state === 'ledge' || p.state === 'swing')) { const pr = this.project(p.cx, p.feet, false); this.idx = pr.i; this.sp = Math.max(this.sp, pr.s); }
    if (this.wait) {
      const s = this.safe();
      if (p.alive && (Math.abs(p.feet - s.feet) > 20 || Math.abs(wrapDx(p.cx - s.cx)) > 36)) { this.wait = false; if (!this.started) { this.started = true; Game.shout('avalanche'); Audio8.sfx('boom'); W.shake = 14; Input.rumble(0.7, 0.5, 600); } }
    } else if (p.alive) this.sa = Math.max(this.sa + this.speed, this.sp - this.leash);
    const [ax, ay, dir] = this.at(this.sa); this.dir = dir;
    const C = W.room.w * T; this.x = ((ax % C) + C) % C - this.w / 2; this.y = ay - this.h;
    if (p.alive && p.feet >= W.room.h * T - 2 * T && p.onGround) { // Turmfuß: die Lawine bricht zusammen und verpufft
      this.over = true; W.shake = 22; W.flash = 8; Audio8.sfx('boom'); Audio8.sfx('crumble'); Input.rumble(1, 0.8, 900);
      for (let i = 0; i < 40; i++) W.spawn(new Particle(p.cx + rnd(-160, 160), p.y - rnd(20, 120), rnd(-1.5, 1.5), rnd(-1, 2), i % 3 ? '#ffffff' : '#b8d8f8', 70, 2, 0.06));
      return;
    }
    if (this.wait) return;
    const d = this.sp - this.sa;
    if (this.t % 20 === 0 && d < 300) Audio8.sfx('crumble', this.x);
    if (this.t % 80 === 0 && d < 220) Audio8.sfx('boom', this.x);
    if (d < 90) W.shake = Math.max(W.shake, 2);
    if (this.t % 2 === 0) W.spawn(new Particle(this.cx + rnd(-26, 26), this.y + rnd(0, this.h), this.dir * rnd(0.4, 2.2), rnd(-1.6, 0.2), Math.random() < 0.6 ? '#ffffff' : '#c8e4fc', 40, Math.random() < 0.3 ? 2 : 1, 0.06)); // Schneestaub
    if (p.alive && d < 10) this.hit(p);
  }
  hit(p) {
    this.hits++; Audio8.sfx('boom'); W.shake = 16; W.flash = 10; Input.rumble(1, 0.7, 500);
    p.inv = 0; p.hurt(Options.easy ? 2 : 3, p.cx);
    if (!p.alive) { this.wait = true; return; }
    const s = this.safe();
    p.state = 'normal'; p.stair = null; p.ring = null; p.ledge = null; p.x = s.cx - p.w / 2; p.y = s.feet - p.h; p.vx = 0; p.vy = 0; p.onGround = true; p.inv = 90;
    W.snapCam && W.snapCam();
    this.reset();
  }
  draw(ctx) {
    if (this.over || this.wait || this.sa < 0) return; // erst sichtbar, wenn sie hinter dem Helden herrollt
    const S = SNOWBALL(), X = Math.round(this.cx - W.cam.x), F = Math.round(this.y + this.h - W.cam.y), t = this.t, d = this.dir;
    ctx.fillStyle = 'rgba(8,20,50,0.35)'; ctx.beginPath(); ctx.ellipse(X, F, 34, 5, 0, 0, Math.PI * 2); ctx.fill(); // Schatten
    for (const [ox, oy, r0, ph] of [[-22, -14, 18, 0], [0, -16, 22, 1.7], [22, -14, 18, 3.1], [-12, -38, 18, 4.2], [12, -40, 19, 5.3], [0, -60, 16, 2.4], [-30, -30, 12, 0.9], [30, -32, 13, 3.8]]) {
      const r = r0 + Math.sin(t * 0.09 + ph) * 3, bx = X + ox + Math.sin(t * 0.07 + ph) * 3 * d, by = F + oy + Math.cos(t * 0.11 + ph) * 3;
      ctx.drawImage(S, Math.round(bx - r), Math.round(by - r), Math.round(r * 2), Math.round(r * 2));
    }
    if (t % 6 === 0 && this.chunks.length < 8) this.chunks.push({ x: rnd(-20, 20), y: rnd(-50, -10), vx: d * rnd(0.8, 2.4), vy: rnd(-2, 0), a: rnd(0, 6), s: rnd(4, 8) });
    this.chunks = this.chunks.filter(ch => (ch.y += ch.vy, ch.x += ch.vx, ch.vy += 0.15, ch.a += 0.25, ch.y < 20));
    for (const ch of this.chunks) { // kullernde Eisbrocken vor der Lawine
      ctx.save(); ctx.translate(X + ch.x, F + ch.y); ctx.rotate(ch.a);
      ctx.fillStyle = '#9cd0f4'; ctx.fillRect(-ch.s / 2, -ch.s / 2, ch.s, ch.s); ctx.fillStyle = '#e8f8ff'; ctx.fillRect(-ch.s / 2, -ch.s / 2, ch.s, 1); ctx.fillStyle = '#3c74b4'; ctx.fillRect(-ch.s / 2, ch.s / 2 - 1, ch.s, 1);
      ctx.restore();
    }
  }
}
