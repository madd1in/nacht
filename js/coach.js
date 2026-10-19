// Wald: die Geisterkutsche – schwarze Leichenkutsche mit Federbüschen und grün glimmenden Scheiben, ein kopfloser Kutscher
// mit Laterne, zwei fahle Geisterpferde mit Flammenmähnen (PS2-3D aus Blender: img/coach3d.png, 8 Galoppbilder × 5
// Blickwinkel von der Seite bis frontal, für die Gegenrichtung gespiegelt).
// Fernfahrten: alle paar Sekunden jagt sie tief im Wald zwischen den Baumreihen vorbei, von den Stämmen verdeckt.
// Durchbruch: kurz vor den Schädelpfählen schert sie aus der Tiefe aus, kommt schräg auf den Betrachter zu, quert die
// Spielebene an einer Stelle, die vorher grün glüht (wer dort steht, wird erfasst), und donnert riesig und durchscheinend
// vor dem Helden vorbei. Perspektive wie der PS2-Wald (js/ps2.js drawWoods): Spielebene bei z = 200, Augenhöhe 93 über
// dem Waldboden, Horizont auf Bildzeile 83.
'use strict';

const Coach = (() => {
  const FW = 136, FH = 84, NA = 5, NF = 8, AX = 68, AY = 79; // Bildgröße, Blickwinkel, Galoppbilder, Fußpunkt im Bild
  const FR = [];
  { const img = new Image(); img.onload = () => { for (let a = 0; a < NA; a++) { FR[a] = []; for (let f = 0; f < NF; f++) { const c = Sprites.canvas(FW, FH); c.getContext('2d').drawImage(img, f * (FW + 1), a * (FH + 1), FW, FH, 0, 0, FW, FH); FR[a][f] = c; } } }; img.src = 'img/coach3d.png'; }
  let cur = null; // die gerade fahrende Kutsche (es gibt nur eine)

  // Weltpunkt (x auf der Spielebene, Höhe y über dem Waldboden, Tiefe z) → Bild
  const proj = (cam, x, y, z) => { const k = 200 / z; return [View.w / 2 + (x - cam.x - View.w / 2) * k, 83.2 + (93 - cam.y - y) * k, k]; };
  const lift = (c, z) => c.far ? 0 : Math.max(0, 200 - z) * 0.7; // vor der Spielebene hebt das Gespann ab und fliegt über den Betrachter hinweg

  function drawOne(ctx, cam, c, x, z, alpha, glowA = 0) {
    if (!FR.length || z < 30) return;
    const [sx, sy, k] = proj(cam, x, lift(c, z), z);
    if (sx < -FW * k || sx > View.w + FW * k) return;
    const th = Math.atan2(-c.vz, Math.abs(c.vx)), a = Math.max(0, Math.min(NA - 1, Math.round(th / (Math.PI / 8)))); // fährt auf uns zu → frontaler
    const fr = FR[a][Math.floor(c.ph) % NF];
    ctx.save(); ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = k < 1;
    ctx.translate(Math.round(sx), Math.round(sy)); if (c.vx < 0) ctx.scale(-1, 1);
    ctx.drawImage(fr, -AX * k, -AY * k, FW * k, FH * k);
    if (glowA) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha * glowA; ctx.drawImage(fr, -AX * k, -AY * k, FW * k, FH * k); } // Geisterschimmer
    ctx.restore();
  }
  function glow(ctx, cam, c) { // grüner Schein um das Gespann, Laternen
    const [sx, sy, k] = proj(cam, c.x, 34 + lift(c, c.z), c.z), r = 70 * k;
    if (sx < -r || sx > View.w + r) return;
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    g.addColorStop(0, `rgba(90,255,180,${(0.3 * c.fade).toFixed(3)})`); g.addColorStop(1, 'rgba(40,160,120,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2); ctx.restore();
  }
  function draw(ctx, cam, c) {
    const far = c.z > 500, a = (far ? 0.88 : 0.84) * c.fade * Math.min(1, (c.z - 34) / 90);
    if (a <= 0.01) return;
    glow(ctx, cam, c);
    if (c.far) { // Geisternebel schleppt am Boden hinterher
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (let i = 1; i <= 6; i++) {
        const [sx, sy, k] = proj(cam, c.x - c.vx * i * 6, 3, c.z);
        ctx.fillStyle = `rgba(120,255,200,${(0.06 * (7 - i) / 6 * c.fade).toFixed(3)})`;
        ctx.beginPath(); ctx.ellipse(sx, sy, 34 * k * (1 + i * 0.2), 7 * k, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    } else c.hist.forEach((h, i) => drawOne(ctx, cam, c, h[0], h[1], a * (0.1 + i * 0.05))); // Nachbilder: Geisterschleier
    drawOne(ctx, cam, c, c.x, c.z, a, far ? 0.45 : 0.3);
  }
  // Geisterstraße: vom Kreuzungspunkt auf der Spielebene schräg in die Tiefe, woher die Kutsche kommt (Warnung)
  function road(ctx, cam, x0, x1, z1, a) {
    const N = 10;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const u0 = i / N, u1 = (i + 1) / N, za = 200 + (z1 - 200) * u0, zb = 200 + (z1 - 200) * u1;
      const [ax, ay, ka] = proj(cam, x0 + (x1 - x0) * u0, 0, za), [bx, by, kb] = proj(cam, x0 + (x1 - x0) * u1, 0, zb);
      ctx.fillStyle = `rgba(110,255,190,${(a * 0.22 * (1 - u0 * 0.8)).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(ax - 22 * ka, ay); ctx.lineTo(ax + 22 * ka, ay); ctx.lineTo(bx + 22 * kb, by); ctx.lineTo(bx - 22 * kb, by); ctx.fill();
    }
    for (let i = 0; i < 14; i++) { // Irrlichter fließen die Spur entlang zur Kreuzung
      const u = 1 - ((W.frame * 0.012 + i / 14) % 1), z = 200 + (z1 - 200) * u * u, side = i % 2 ? 1 : -1;
      const [sx, sy, k] = proj(cam, x0 + (x1 - x0) * (z - 200) / (z1 - 200) + side * 14, 1, z);
      ctx.fillStyle = `rgba(190,255,225,${(a * (0.35 + 0.5 * (1 - u))).toFixed(3)})`;
      const r = Math.max(1, Math.round(2.2 * k)); ctx.fillRect(Math.round(sx - r / 2), Math.round(sy - r), r, r);
    }
    ctx.restore();
  }
  // Hintergrund-Ebenen des Waldes: 0 = hinter der mittleren Baumreihe, 1 = hinter den Riesenstämmen
  function slot(ctx, cam, s) {
    const c = cur; if (!c) return;
    if (s === 0 ? c.z >= 700 : c.z >= 300 && c.z < 700) draw(ctx, cam, c);
    else if (s === 1 && c.z >= 700) glow(ctx, cam, c); // Laternenschein dringt durch die Bäume
  }
  return { slot, draw, road, proj, lift, get cur() { return cur; }, set cur(c) { cur = c; } };
})();

class GhostCoach extends Ent {
  constructor(d) {
    super(0, 0, 8, 8); this.kind = 'prop';
    this.xc = (d.x + 0.5) * T; this.trig = d.trig * T; // Kreuzungspunkt auf der Spielebene, Auslöser
    this.D = 560; this.Z0 = 1200; // Anfahrt: ~2 s – wer die Warnung überhört und weiterläuft, kommt genau dann an der Kreuzung an
    this.charged = false; this.wait = 150; this.dirFar = -1; this.mark = 0; this.hitDone = false;
    Coach.cur = null; // Raum neu betreten (auch nach dem Tod): keine halbe Fahrt von vorhin
  }
  far() { // Fernfahrt zwischen den Baumreihen
    const dir = this.dirFar = -this.dirFar, z = 560 + Math.random() * 90, half = View.w / 2 * z / 200 + 140, mid = W.cam.x + View.w / 2;
    Coach.cur = { far: true, x: mid - dir * half, z, vx: dir * 8, vz: 0, ph: 0, fr: 0.32, t: 0, hist: [], fade: 0, end: mid + dir * half };
    Audio8.sfx('neighFar');
  }
  charge() { // Durchbruch: aus der Tiefe beim Schloss schräg auf den Betrachter zu, quert die Spielebene bei xc
    this.charged = true; this.hitDone = false;
    const D = this.D, Z0 = this.Z0, sp = 9, len = Math.hypot(D, Z0 - 200);
    Coach.cur = { far: false, x: this.xc + D, z: Z0, vx: -D / len * sp, vz: -(Z0 - 200) / len * sp, ph: 0, fr: 0.36, t: 0, hist: [], fade: 0 };
    Audio8.sfx('neigh', this.xc); Audio8.sfx('thunder'); Input.rumble(0.3, 0.2, 400);
    Game.note('coachWarn');
  }
  update() {
    this.t++;
    this.x = W.cam.x + View.w / 2; this.y = W.cam.y + 100; // bleibt „im Bild“, damit seine Lichter gesammelt werden
    const p = W.player;
    if (!this.charged && p.alive && p.cx > this.trig && (!Coach.cur || Coach.cur.far)) this.charge();
    let c = Coach.cur;
    if (!c && --this.wait <= 0) { this.far(); c = Coach.cur; }
    if (!c) return;
    const sl = !c.far && c.z < 200 ? 0.5 : 1; // vor der Spielebene: Zeitlupe, das Gespann donnert am Betrachter vorbei
    c.t++; c.ph += c.fr * sl;
    if (c.t % 2 === 0) { c.hist.push([c.x, c.z]); if (c.hist.length > 4) c.hist.shift(); }
    c.x += c.vx * sl; c.z += c.vz * sl;
    if (c.far) {
      c.fade = Math.min(1, c.fade + 0.03);
      if (c.t % 26 === 0) Audio8.sfx('hoovesFar');
      if ((c.vx > 0 && c.x > c.end) || (c.vx < 0 && c.x < c.end)) { Coach.cur = null; this.wait = 480 + Math.floor(Math.random() * 360); }
      return;
    }
    c.fade = Math.min(1, c.fade + 0.02);
    this.mark = c.z > 200 ? Math.min(1, this.mark + 0.04) : Math.max(0, this.mark - 0.05);
    if (c.t % (c.z < 600 ? 15 : 22) === 0) Audio8.sfx(c.z < 600 ? 'hooves' : 'hoovesFar', c.x);
    if (c.z < 420) { W.shake = Math.max(W.shake, Math.round((420 - Math.max(200, c.z)) / 40)); if (c.t % 3 === 0) Input.rumble(0.2, 0.5, 60); }
    // erfasst? Die Deichsel quert die Spielebene: Vorder- bis Hinterkante des Gespanns gegen die Fußhöhe des Helden
    const hl = Math.hypot(c.vx, c.vz), hx = c.vx / hl, hz = c.vz / hl, zf = c.z + hz * 58, zb = c.z - hz * 62;
    if (!this.hitDone && p.alive && zf <= 200 && zb >= 200) {
      const x200 = c.x + hx * ((200 - c.z) / hz);
      if (Math.abs(p.cx - x200) < 20 && p.feet > (W.room.h - 2) * T - 44) {
        this.hitDone = true; p.hurt(2, x200 + 40); W.flash = 6; W.shake = 14; Audio8.sfx('crash', p.cx);
        for (let i = 0; i < 14; i++) W.spawn(new Particle(p.cx, p.cy, (Math.random() - 0.7) * 3, -Math.random() * 3, i % 2 ? '#7cfcc0' : '#e8fff4', 30, 2, 0.1));
      }
    }
    if (c.z < 200 && !c.passed) { c.passed = true; Audio8.sfx('whoosh', c.x); Audio8.sfx('neigh', c.x); }
    if (c.z < 40) { Coach.cur = null; this.wait = 600; W.flash = Math.max(W.flash, 4); }
  }
  lightUp(L) {
    const c = Coach.cur; if (!c || c.far || c.z > 520) return;
    const [sx, sy, k] = Coach.proj(W.cam, c.x, 30 + Coach.lift(c, c.z), c.z);
    L.push({ x: sx, y: sy, r: Math.round(Math.min(160, 60 * k)), c: [120, 255, 190], a: 0.45 * c.fade });
  }
  drawBack(ctx) {
    if (this.mark > 0.01) Coach.road(ctx, W.cam, this.xc, this.xc + this.D, this.Z0, this.mark * (0.75 + 0.25 * Math.sin(this.t * 0.3)));
    const c = Coach.cur; if (c && !c.far && c.z >= 215 && c.z < 300) Coach.draw(ctx, W.cam, c);
  }
  draw(ctx) { // die Kreuzung glüht vorher grün: Radspuren aus Geisterlicht, Funken steigen auf
    if (this.mark <= 0.01) return;
    const x = Math.round(this.xc - W.cam.x), y = (W.room.h - 2) * T - W.cam.y, a = this.mark * (0.55 + 0.25 * Math.sin(this.t * 0.4));
    if (x < -60 || x > View.w + 60) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, 34); g.addColorStop(0, `rgba(110,255,190,${(0.5 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(40,180,120,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 34, y - 20, 68, 24);
    ctx.fillStyle = `rgba(150,255,210,${(0.7 * a).toFixed(3)})`;
    for (const o of [-14, 14]) for (let k = -3; k <= 3; k++) ctx.fillRect(x + o + k * 2, y - 1 - (k & 1), 2, 2); // zwei Spuren
    for (let i = 0; i < 6; i++) { const ph = (this.t * 0.03 + i / 6) % 1; ctx.fillRect(Math.round(x - 18 + i * 7 + Math.sin(this.t * 0.1 + i) * 2), Math.round(y - 2 - ph * 30), 1, 2); }
    ctx.restore();
  }
  drawFront(ctx) { const c = Coach.cur; if (c && !c.far && c.z < 215) Coach.draw(ctx, W.cam, c); }
}
