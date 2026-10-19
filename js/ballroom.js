// Der Ballsaal (Thron der Nacht): ein Spiegelsaal im PS2-3D-Look – polierter Marmorboden, in dem sich Säulen, Vorhänge
// und Fenster spiegeln, rote Damastwände, hohe Bogenfenster mit Samtvorhängen und Goldkordeln, Säulenpaare mit vergoldeten
// Kapitellen, riesige Kristalllüster. Durch den Saal kreisen durchscheinende Geister-Tanzpaare (aus Blender, 16 Blickwinkel):
// hinten klein, auf der Spielebene in Heldengröße, vorn riesig vor dem Helden – alles mit derselben Perspektive wie die
// Kacheln (Auge 200 vor der Spielebene, Fluchtpunkt in Bildhöhe 60). Zum Geistertango zucken auf jedem Stakkato-Schlag
// Blitze abwechselnd links und rechts durch die Fenster.
'use strict';

const Ball = (() => {
  const { mesh, box, prism, cone, beam, render, project, face, vtx } = PS2;
  const CPU = { willReadFrequently: true };
  const GF = []; // Tanzpaar: 16 Blickwinkel, je 72×100 (doppelt aufgelöst)
  { const img = new Image(); img.onload = () => { for (let i = 0; i < 16; i++) { const c = Sprites.canvas(72, 100); c.getContext('2d').drawImage(img, i * 73, 0, 72, 100, 0, 0, 72, 100); GF[i] = c; } }; img.src = 'img/ghosts3d.png'; }

  // ---------------- Saal (3D-Hintergrund) ----------------
  // x entlang des Raums (Spielebene: 1 Einheit = 1 px), y hoch (Boden 0), z in die Tiefe (Spielebene bei 200). Der Saal
  // wiederholt sich alle P Einheiten (drei Fensterachsen); gerendert wird mit der Kamera modulo P.
  const P = 720, BAY = 240, ZB = 660, ZCOL = 590, ZF = 520, WW = 92, WY0 = 36, WY1 = 238, CORN = 270;
  const DAM = [118, 16, 36], DAM2 = [90, 10, 28], GOLD = [236, 184, 72], GOLD2 = [168, 116, 36], WOOD = [70, 32, 22], MAR = [222, 212, 198],
    FLOORD = [26, 16, 26], FLOORL = [184, 170, 156], VEL = [156, 14, 36], VEL2 = [98, 6, 22], GLASS = [24, 32, 70], CRY = [214, 232, 255], WAX = [242, 234, 216], FLM = [255, 206, 120];
  const ENV = { static: true, sun: null, sunC: [1.0, 0.84, 0.64], amb: [0.42, 0.32, 0.34], sky: [0.16, 0.1, 0.14], fog: [18, 6, 22], fogD: 0.0006 };
  { const v = [0.25, 0.85, -0.45], l = Math.hypot(...v); ENV.sun = v.map(c => c / l); }
  const X0 = -1100, X1 = P + 1100, CH = 240, NC = Math.ceil((X1 - X0) / CH);
  let hall = null, wins = [], lamps = [];

  function mirror(src, dim) { // Spiegelbild im polierten Boden: y → −y, gedämpft
    const m = mesh(); m.v = src.v.map((v, i) => (i % 3 === 1 ? -v : v));
    for (const f of src.f) m.f.push({ i: f.i.slice().reverse(), c: f.c.map(c => c * dim), n: [f.n[0], -f.n[1], f.n[2]], e: f.e * dim, two: f.two, a: f.a });
    return m;
  }
  function windowAt(m, xc) { // hohes Rundbogenfenster: Nachthimmel hinter Goldrahmen und Sprossen
    const hw = WW / 2, ya = WY1 - hw, z = ZB - 1, zg = z + 4, arc = [];
    face(m, [vtx(m, xc - hw, WY0, zg), vtx(m, xc + hw, WY0, zg), vtx(m, xc + hw, ya, zg), vtx(m, xc - hw, ya, zg)], GLASS, null, { two: true });
    for (let i = 0; i <= 6; i++) { const a = Math.PI * i / 6; arc.push([xc + Math.cos(a) * hw, ya + Math.sin(a) * hw]); }
    for (let i = 0; i < 6; i++) face(m, [vtx(m, xc, ya, zg), vtx(m, arc[i][0], arc[i][1], zg), vtx(m, arc[i + 1][0], arc[i + 1][1], zg)], GLASS, null, { two: true });
    beam(m, xc - hw, WY0, z, xc - hw, ya, z, 7, 7, GOLD, { open: true }); beam(m, xc + hw, WY0, z, xc + hw, ya, z, 7, 7, GOLD, { open: true });
    for (let i = 0; i < 6; i++) beam(m, arc[i][0], arc[i][1], z, arc[i + 1][0], arc[i + 1][1], z, 7, 7, GOLD, { open: true });
    box(m, xc, WY0 - 8, z - 4, WW + 16, 8, 12, GOLD2, { top: GOLD }); // Fensterbank
    beam(m, xc, WY0, z + 2, xc, WY1, z + 2, 2.5, 2.5, GOLD2, { open: true });
    for (const y of [WY0 + 50, WY0 + 100, ya]) beam(m, xc - hw, y, z + 2, xc + hw, y, z + 2, 2.5, 2.5, GOLD2, { open: true });
    wins.push({ x: xc, hw, ya, z: zg });
  }
  function drapes(m, xc) { // Samtvorhänge mit Faltenbahnen, Goldkordel und Quaste, darüber eine Schabracke mit Bogenkante
    const hw = WW / 2, z = ZB - 8;
    for (const s of [-1, 1]) {
      const xo = xc + s * (hw + 36), xi = xc + s * (hw - 10), xt = xc + s * (hw + 22), xb = xc + s * (hw + 2);
      for (let k = 0; k < 3; k++) {
        const a = k / 3, b = (k + 1) / 3, L = (p, q, t) => p + (q - p) * t;
        face(m, [vtx(m, L(xo, xi, a), CORN - 2, z - k * 2), vtx(m, L(xo, xi, b), CORN - 2, z - k * 2 - 2), vtx(m, L(xo, xt, b), 104, z - 6), vtx(m, L(xo, xt, a), 104, z - 6)], k % 2 ? VEL2 : VEL, null, { two: true });
        face(m, [vtx(m, L(xo, xt, a), 104, z - 6), vtx(m, L(xo, xt, b), 104, z - 6), vtx(m, L(xo, xb, b), 0, z - 2 - k * 3), vtx(m, L(xo, xb, a), 0, z - 2 - k * 3)], k % 2 ? VEL : VEL2, null, { two: true });
      }
      box(m, L2(xo, xt), 98, z - 10, 30, 7, 8, GOLD);                        // goldene Kordel
      cone(m, xt + s * 8, 98, z - 12, 3.2, -26, 5, GOLD2);                     // Quaste
    }
    const x0 = xc - hw - 42, x1 = xc + hw + 42, n = 6, sag = (t) => CORN - 30 - Math.sin(t * Math.PI) * 12;
    for (let i = 0; i < n; i++) {
      const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n;
      face(m, [vtx(m, a, CORN - 2, z - 12), vtx(m, b, CORN - 2, z - 12), vtx(m, b, sag((i + 1) / n), z - 14), vtx(m, a, sag(i / n), z - 14)], i % 2 ? VEL : VEL2, null, { two: true });
    }
    for (let i = 0; i <= n; i++) cone(m, x0 + (x1 - x0) * i / n, sag(i / n), z - 15, 2.4, -9, 4, GOLD); // Fransen
  }
  const L2 = (a, b) => (a + b) / 2;
  function column(m, x, z) { // Marmorsäule mit vergoldetem Sockel, Halsring und Kapitell, Wandleuchter mit drei Kerzen
    box(m, x, 0, z, 30, 14, 30, GOLD2, { top: GOLD });
    prism(m, x, 14, z, 11, CORN - 52, 10, MAR, { cap: false, rTop: 9.5 });
    prism(m, x, CORN - 40, z, 11.5, 5, 10, GOLD);
    prism(m, x, CORN - 35, z, 10, 15, 10, GOLD, { rTop: 17 });
    box(m, x, CORN - 20, z, 38, 8, 38, GOLD2, { top: GOLD });
    const zf = z - 14, y = 146;
    beam(m, x, y - 10, zf + 4, x, y, zf - 4, 2.2, 2.2, GOLD2);
    for (const dx of [-9, 0, 9]) { beam(m, x, y, zf - 4, x + dx, y + 4, zf - 4, 1.8, 1.8, GOLD); prism(m, x + dx, y + 4, zf - 4, 1.4, 8, 4, WAX, { cap: false }); cone(m, x + dx, y + 12, zf - 4, 1.6, 5, 4, FLM, { e: 1 }); }
    lamps.push([x, y + 12, zf - 4, 0.9]);
  }
  function build() {
    wins = []; lamps = [];
    const mk = () => ({ all: mesh(), ch: Array.from({ length: NC }, mesh) });
    const L = { far: mk(), near: mk() };
    const M = (x, z) => { const l = z >= ZF ? L.far : L.near; return x === null ? l.all : l.ch[clamp(Math.floor((x - X0) / CH), 0, NC - 1)]; };
    const MX = (X0 + X1) / 2, LEN = X1 - X0;
    { // Rückwand: Holzsockel, Goldleiste, Damast in Bahnen, Kranzgesims, Fries
      const m = M(null, ZB);
      box(m, MX, 0, ZB + 6, LEN, 44, 10, WOOD, { top: GOLD2 }); box(m, MX, 44, ZB + 2, LEN, 5, 8, GOLD);
      box(m, MX, CORN, ZB - 4, LEN, 16, 26, GOLD2, { top: GOLD }); box(m, MX, CORN + 16, ZB + 4, LEN, 140, 8, DAM2); box(m, MX, CORN + 34, ZB - 2, LEN, 6, 14, GOLD);
    }
    for (let x = X0; x < X1; x += 24) { const m = M(x + 12, ZB); face(m, [vtx(m, x, 49, ZB + 1), vtx(m, x + 24, 49, ZB + 1), vtx(m, x + 24, CORN, ZB + 1), vtx(m, x, CORN, ZB + 1)], (Math.round(x / 24) & 1) ? DAM : DAM2, null, { two: true }); }
    for (let o = -2 * P; o < 3 * P; o += P) for (let k = 0; k < 3; k++) {
      const xb = o + k * BAY, xc = xb + BAY / 2;
      if (xc > X0 - 120 && xc < X1 + 120) { windowAt(M(xc, ZB), xc); drapes(M(xc, ZB), xc); }
      if (xb > X0 - 60 && xb < X1 + 60) { for (const d of [-17, 17]) column(M(xb + d, ZCOL), xb + d, ZCOL); box(M(xb, ZCOL), xb, CORN - 12, ZCOL, 76, 14, 40, GOLD2, { top: GOLD }); } // Säulenpaar mit Gebälk
    }
    for (let z = 220; z < ZB; z += 55) for (let x = X0; x < X1; x += 55) { // polierter Schachbrettboden (durchscheinend: Spiegelbilder)
      const i = Math.round((x - X0) / 55), j = Math.round((z - 220) / 55), m = M(x + 27, z + 27), dk = (i + j) & 1;
      face(m, [vtx(m, x, 0, z), vtx(m, x, 0, z + 55), vtx(m, x + 55, 0, z + 55), vtx(m, x + 55, 0, z)], dk ? FLOORD : FLOORL, null, { two: true, a: dk ? 0.66 : 0.8 });
    }
    // Spiegelbilder der Rückwand-Elemente (ohne Boden): zuerst gerastert, der durchscheinende Boden legt sich darüber
    const mir = (l) => ({ all: mirror(l.all, 0.5), ch: l.ch.map(c => mirror({ v: c.v, f: c.f.filter(f => !(f.a < 1 && Math.abs(f.n[1]) > 0.99)) }, 0.5)) });
    L.farM = mir(L.far);
    return L;
  }

  // Kristalllüster: einmal als Bild gerendert (von schräg unten), im Saal perspektivisch skaliert
  let chandImg = null;
  const CHR = 56, CHS = 2, CHY = 192, CH_W = Math.ceil((CHR * 2 + 24) * CHS), CH_AY = 58 * CHS, CH_H = CH_AY + 50 * CHS;
  function chandSprite() {
    if (chandImg) return chandImg;
    const m = mesh(), R = CHR;
    prism(m, 0, -20, 0, 3.6, 70, 6, GOLD, { rTop: 1.8 }); cone(m, 0, -20, 0, 6, -24, 6, CRY, { e: 0.2 });
    for (const [rr, yy, n] of [[R, 0, 12], [R * 0.58, 26, 8]]) {
      for (let i = 0; i < n; i++) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; beam(m, Math.cos(a0) * rr, yy, Math.sin(a0) * rr, Math.cos(a1) * rr, yy, Math.sin(a1) * rr, 3, 4, GOLD, { open: true }); }
      for (let i = 0; i < n; i++) {
        const a = (i + 0.5) / n * Math.PI * 2, x = Math.cos(a) * rr, z = Math.sin(a) * rr, am = i / n * Math.PI * 2;
        beam(m, 0, yy + 16, 0, x * 0.5, yy + 20, z * 0.5, 2, 2, GOLD2, { open: true }); beam(m, x * 0.5, yy + 20, z * 0.5, x, yy, z, 2, 2, GOLD2, { open: true });
        prism(m, x, yy, z, 2.6, 2.5, 5, GOLD); prism(m, x, yy + 2.5, z, 1.5, 9, 4, WAX, { cap: false }); cone(m, x, yy + 11.5, z, 1.8, 6, 4, FLM, { e: 1 });
        cone(m, x, yy - 1.5, z, 2.1, -10 - (i % 2) * 6, 4, CRY, { e: 0.15 });
        cone(m, Math.cos(am) * rr, yy - 3, Math.sin(am) * rr, 1.4, -6, 3, CRY, { e: 0.15 }); // Kristallgirlande
      }
    }
    const c = Sprites.canvas(CH_W, CH_H), cy = -0.2 * 1500;
    render(c.getContext('2d', CPU), CH_W, CH_H, [m], { x: 0, y: cy, z: -1500, yaw: 0, pitch: 0, f: 1500 * CHS, near: 100, cx: CH_W / 2, cy: CH_AY - cy * CHS }, ENV);
    return (chandImg = c);
  }
  const CHANDS = [[0, 460], [360, 500]]; // je Saalabschnitt (x, z)

  const bufs = {};
  function layerBuf(name, Wb, Hb) {
    let B = bufs[name];
    if (!B || B.c.width !== Wb || B.c.height !== Hb) { B = bufs[name] = { c: Sprites.canvas(Wb, Hb), key: null }; B.x = B.c.getContext('2d', CPU); }
    return B;
  }
  function visible(l, camX, Z) {
    const half = View.w / 2 * Z / 200 + 140, out = [l.all];
    for (let k = 0; k < NC; k++) { const a = X0 + k * CH; if (a + CH > camX - half && a < camX + half) out.push(l.ch[k]); }
    return out;
  }
  const geo = (cam) => { const w = View.w; return { w, camX: (((cam.x + w / 2) % P) + P) % P, camY: (W.room ? (W.room.h - 2) * T : 176) - cam.y - 60 }; };
  function drawHall(ctx, cam, frame = 0) {
    if (!hall) hall = build();
    const { w, camX, camY } = geo(cam), dv = View.lite ? 3 : 2, Wb = Math.ceil(w / dv), Hb = Math.ceil(208 / dv);
    const c3 = { x: camX, y: camY, z: 0, yaw: 0, pitch: 0, f: 200 / dv, near: 20, hy: 60 / 208 };
    ctx.fillStyle = '#12040c'; ctx.fillRect(0, 0, w, 208);
    const F = layerBuf('far', Wb, Hb), N = layerBuf('near', Wb, Hb);
    const kf = Math.round(camX * 0.33 / dv) + '|' + Math.round(camY * 0.33 / dv) + '|' + Wb;
    if (F.key !== kf) { F.key = kf; F.x.clearRect(0, 0, Wb, Hb); render(F.x, Wb, Hb, visible(hall.farM, camX, ZB), c3, ENV); render(F.x, Wb, Hb, visible(hall.far, camX, ZB), c3, ENV); }
    const kn = Math.round(camX * 0.9 / dv) + '|' + Math.round(camY * 0.9 / dv) + '|' + Wb;
    if (N.key !== kn) { N.key = kn; N.x.clearRect(0, 0, Wb, Hb); render(N.x, Wb, Hb, visible(hall.near, camX, ZF), c3, ENV); }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(F.c, 0, 0, Wb, Hb, 0, 0, w, 208); ctx.drawImage(N.c, 0, 0, Wb, Hb, 0, 0, w, 208);
    // Lichthöfe der Wandleuchter
    ctx.globalCompositeOperation = 'lighter';
    for (const [lx, ly, lz, ls] of lamps) {
      const k = 200 / lz, sx = w / 2 + (lx - camX) * k, sy = 60 - (ly - camY) * k, r = 46 * ls * k * 2; if (sx < -r || sx > w + r) continue;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, 'rgba(255,200,120,0.5)'); g.addColorStop(1, 'rgba(255,150,70,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.restore();
    // Blitz: die Fenster auf der Blitzseite leuchten auf, ein gezackter Strahl fährt hindurch
    if (FL.a > 0.02) drawFlash(ctx, w, camX, camY);
    // Kristalllüster (Ketten bis unter die Decke, Kerzenschein)
    const img = chandSprite();
    for (let o = Math.floor((camX - 1200) / P) * P; o < camX + 1200; o += P) for (const [dx, z] of CHANDS) {
      const k = 200 / z, sx = w / 2 + (o + dx - camX) * k, sy = 60 - (CHY - camY) * k, dw = CH_W / CHS * k, dh = CH_H / CHS * k;
      if (sx + dw < 0 || sx - dw > w) continue;
      ctx.fillStyle = '#3c2808'; ctx.fillRect(Math.round(sx) - 1, 0, 2, Math.max(0, Math.round(sy - 60 * k))); // Kette
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(img, sx - dw / 2, sy - CH_AY / CHS * k, dw, dh);
      ctx.globalCompositeOperation = 'lighter'; const r = 80 * k, g = ctx.createRadialGradient(sx, sy + 6 * k, 0, sx, sy + 6 * k, r);
      g.addColorStop(0, `rgba(255,214,150,${(0.42 + FL.a * 0.2).toFixed(3)})`); g.addColorStop(1, 'rgba(255,160,80,0)'); ctx.fillStyle = g; ctx.fillRect(sx - r, sy + 6 * k - r, r * 2, r * 2);
      ctx.restore();
    }
  }
  function drawFlash(ctx, w, camX, camY) {
    const k = 200 / (ZB + 3), a = FL.a;
    ctx.save();
    for (let o = Math.floor((camX - 2400) / P) * P; o < camX + 2400; o += P) for (let b = 0; b < 3; b++) {
      const xc = o + b * BAY + BAY / 2, sx = w / 2 + (xc - camX) * k; if (sx < -60 || sx > w + 60) continue;
      if ((sx < w / 2) !== (FL.side < 0)) continue;
      const hw = WW / 2 * k, y0 = 60 - (WY0 - camY) * k, ya = 60 - (WY1 - WW / 2 - camY) * k;
      const g = ctx.createLinearGradient(0, ya - hw, 0, y0); g.addColorStop(0, `rgba(235,240,255,${(0.95 * a).toFixed(3)})`); g.addColorStop(1, `rgba(150,170,255,${(0.6 * a).toFixed(3)})`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(sx - hw, y0); ctx.lineTo(sx - hw, ya); ctx.arc(sx, ya, hw, Math.PI, 0); ctx.lineTo(sx + hw, y0); ctx.closePath(); ctx.fill();
      // Blitzstrahl hinter den Sprossen (je Blitz andere Form)
      let s = FL.seed + Math.round(xc), px = sx + (((s = (s * 16807) % 2147483647) % 100) / 100 - 0.5) * hw, py = ya - hw;
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, a * 1.3).toFixed(3)})`; ctx.lineWidth = Math.max(1, 1.6 * k * 2); ctx.beginPath(); ctx.moveTo(px, py);
      while (py < y0 - 2) { s = (s * 16807) % 2147483647; py += 4 + (s % 7); px = Math.max(sx - hw + 1, Math.min(sx + hw - 1, px + ((s % 9) - 4) * 1.4)); ctx.lineTo(px, py); }
      ctx.stroke();
      ctx.fillStyle = 'rgba(70,40,10,0.85)'; ctx.fillRect(Math.round(sx) - 1, ya - hw, 1, y0 - ya + hw); // Sprossen bleiben dunkel
      for (const y of [WY0 + 50, WY0 + 100]) ctx.fillRect(sx - hw, Math.round(60 - (y - camY) * k), hw * 2, 1);
      // Lichtschein auf dem Boden davor (Spiegelung)
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,170,255,${(0.22 * a).toFixed(3)})`;
      ctx.beginPath(); ctx.moveTo(sx - hw, y0 + 2); ctx.lineTo(sx + hw, y0 + 2); ctx.lineTo(sx + hw * 2.6, 170); ctx.lineTo(sx - hw * 2.6, 170); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  }

  // ---------------- Blitz-Stakkato im Takt ----------------
  const FL = { side: 1, a: 0, t: 99, seed: 7 };
  function cue() { FL.side = -FL.side; FL.t = 0; FL.seed = (FL.seed * 48271 + 11) % 2147483647; }
  function tick() { // Doppelzucken: hell – kurz dunkler – noch einmal hell – abklingen
    const t = ++FL.t;
    FL.a = t < 3 ? 1 : t < 5 ? 0.3 : t < 7 ? 0.85 : Math.max(0, 0.85 - (t - 7) * 0.08);
  }
  const amb = () => 0.34 - 0.22 * FL.a; // Dunkelheit im Saal (FX.render)

  // ---------------- Geister-Tanzpaare ----------------
  const ZC = 310, RZ = 220, RX = 175, OM = 0.0105, SPIN = 0.055, HALF = 16 / (Math.PI * 2);
  function couples(e) { // Paare im Bild: Position, Maßstab, Blickwinkel – sortiert von hinten nach vorn
    const cam = W.cam, w = View.w, camX = cam.x + w / 2, camY = (W.room.h - 2) * T - cam.y - 60, out = e.list; out.length = 0;
    for (const r of e.rings) for (let i = 0; i < e.n; i++) {
      for (let tr = 0; tr < 2; tr++) { // tr = 1: Nachbild knapp dahinter auf der Bahn
        const th = r.ph + e.t * OM + i * Math.PI * 2 / e.n - tr * 0.045, X = r.cx + RX * Math.cos(th), Z = ZC + RZ * Math.sin(th);
        const k = 200 / Z, sx = w / 2 + (X - camX) * k; if (sx < -90 || sx > w + 90) continue;
        const lift = 5 + Math.max(0, 210 - Z) * 0.55 + Math.sin(e.t * 0.045 + i * 1.7 + r.ph) * 3;
        const spin = e.t * SPIN + i * 1.3 + r.ph + th, view = Math.atan2(X - camX, Z);
        out.push({ Z, k, sx, sy: 60 + (camY - lift) * k, ry: 60 + (camY + lift) * k, fr: ((Math.round((spin - view) * HALF) % 16) + 16) % 16, tr });
      }
    }
    out.sort((a, b) => b.Z - a.Z);
    return out;
  }
  function drawCouple(ctx, g, refl) {
    const fr = GF[g.fr]; if (!fr) return;
    const dw = 36 * g.k, dh = 50 * g.k, x = g.sx - dw / 2, base = g.tr ? 0.16 : 0.5, fa = FL.a;
    if (refl) { // Spiegelbild im Boden (nur hinter der Spielebene sichtbar)
      ctx.save(); ctx.globalAlpha = base * 0.3; ctx.translate(0, g.ry); ctx.scale(1, -1); ctx.drawImage(fr, x, -dh * 0.985, dw, dh); ctx.restore();
    }
    ctx.globalAlpha = base + fa * 0.15; ctx.drawImage(fr, x, g.sy - dh * 0.985, dw, dh);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = base * 0.45 + fa * 0.3; ctx.drawImage(fr, x, g.sy - dh * 0.985, dw, dh);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  const prewarm = () => { if (!hall) hall = build(); chandSprite(); };
  return { drawHall, prewarm, cue, tick, amb, couples, drawCouple, FL };
})();

// Unsichtbarer Dirigent des Saals: steuert das Blitz-Stakkato (im Takt des Geistertangos) und zeichnet die Tanzpaare in
// drei Durchgängen – hinter den Kacheln (tief im Saal, mit Spiegelbild), auf der Spielebene und vor dem Helden
class GhostDance extends Ent {
  constructor(d) {
    super(0, 0, 8, 8); this.kind = 'prop'; this.n = d.n || 5; this.list = []; this.ft = 0; this.near = 0;
    this.rings = d.rings.map((x, k) => ({ cx: x * T, ph: k * 2.1 }));
  }
  update() {
    this.t++;
    this.x = W.cam.x + View.w / 2; this.y = W.cam.y + 100; // bleibt „im Bild“, damit seine Lichter gesammelt werden
    const ac = Audio8.context && Audio8.context(), live = ac && ac.state === 'running' && Audio8.current === 'ball';
    let n = live && Audio8.cues ? Audio8.cues() : 0;
    if (!live && ++this.ft >= 52) { this.ft = 0; n = 1; } // ohne Ton: Stakkato alle zwei Schläge
    for (let i = 0; i < n; i++) Ball.cue();
    Ball.tick();
    // ein Paar streift durch den Helden: kalter Hauch
    const p = W.player, px = p.cx - W.cam.x, hit = this.list.some(g => !g.tr && g.Z > 175 && g.Z < 225 && Math.abs(g.sx - px) < 14 * g.k);
    if (hit && !this.near) Audio8.sfx('whoosh', p.cx);
    this.near = hit ? 1 : 0;
  }
  lightUp(L) {
    for (const g of this.list) if (!g.tr && g.Z < 260) L.push({ x: g.sx, y: g.sy - 26 * g.k, r: Math.round(30 * g.k), c: [150, 190, 255], a: 0.38 });
    const a = Ball.FL.a; if (a > 0.05) L.push({ x: Ball.FL.side < 0 ? -10 : View.w + 10, y: 70, r: 230, c: [190, 200, 255], a: 0.5 * a });
  }
  drawBack(ctx) { Ball.couples(this); for (const g of this.list) if (g.Z > 222) Ball.drawCouple(ctx, g, true); }
  draw(ctx) { for (const g of this.list) if (g.Z <= 222 && g.Z >= 200) Ball.drawCouple(ctx, g, false); }
  drawFront(ctx) {
    for (const g of this.list) if (g.Z < 200) Ball.drawCouple(ctx, g, false);
    const a = Ball.FL.a; if (a < 0.03) return; // Blitzlicht fällt von der Seite herein
    const w = View.w, s = Ball.FL.side, gr = ctx.createLinearGradient(s < 0 ? 0 : w, 0, s < 0 ? w * 0.6 : w * 0.4, 0);
    gr.addColorStop(0, `rgba(200,212,255,${(0.34 * a).toFixed(3)})`); gr.addColorStop(1, 'rgba(200,212,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(0, 0, w, 208); ctx.restore();
  }
}
