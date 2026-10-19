// Der Wintergarten: ein Glaspalast wie die großen Gewächshäuser des 19. Jahrhunderts (PS2-3D) – grün lackierte Gusseisen-
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
  { // durstige Pflanze (Easteregg): Majolika-Kübel und Fangkopf in fünf Stimmungen, aus Blender (img/tplant3d.png)
    const MAP = { tp_burp: [0, 0, 40, 36], tp_gulp: [41, 0, 40, 36], tp_idle0: [82, 0, 40, 36], tp_idle1: [123, 0, 40, 36], tp_open: [164, 0, 40, 36], tp_pot: [205, 0, 32, 22] };
    const img = new Image();
    img.onload = () => {
      const fr = (n) => { const r = MAP[n], c = Sprites.canvas(r[2], r[3]); c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); return Sprites.fromCanvas(c, true); };
      S.tp = { pot: fr('tp_pot'), idle: [fr('tp_idle0'), fr('tp_idle1')], open: fr('tp_open'), gulp: fr('tp_gulp'), burp: fr('tp_burp') };
    };
    img.src = 'img/tplant3d.png';
  }

  // ---------------- Glaspalast (Hintergrund) ----------------
  // Spielebene bei z = 200 wie die Kacheln; Rückwand aus Glas bei z = 540, davor drei Galerien übereinander, darüber ein
  // riesiges Tonnengewölbe aus Bogenrippen und Pfetten (Scheitel gut 600 Einheiten über dem Boden), dazwischen Glas. Aus dem
  // Gewölbe hängen Gaskronen an langen Ketten, Palmen wachsen bis unter die oberste Galerie, und durch die Glasfelder fällt
  // das Mondlicht in schrägen Bahnen bis auf den Fliesenboden. Alles wiederholt sich alle P Einheiten, gerendert wird mit
  // der Kamera modulo P – so reicht ein Stück Halle für beliebig lange (und hohe) Räume.
  const P = 960, BAY = 120, ZB = 540, YW = 330, ZC = 240, RV = 300, ZG = 490, TIERS = [92, 196, 290];
  const IRON = [58, 138, 90], IRON2 = [40, 104, 66], GLASS = [176, 232, 228], STONE = [204, 192, 164], STONE2 = [150, 138, 112],
    PALM = [62, 122, 50], PALM2 = [92, 152, 58], TRUNK = [124, 100, 68], TRUNK2 = [100, 80, 54], CREAM = [176, 168, 146], TERRA = [150, 80, 54], DARKT = [64, 60, 66],
    BRASS = [206, 164, 72], LAMPC = [255, 222, 150], FERN = [70, 132, 60];
  const ENV = { static: true, sun: null, sunC: [0.5, 0.68, 0.92], amb: [0.42, 0.47, 0.54], sky: [0.16, 0.2, 0.28], fog: [30, 50, 70], fogD: 0.0011 };
  { const v = [0.25, 0.9, -0.35], l = Math.hypot(...v); ENV.sun = v.map(c => c / l); }
  const vault = (t) => [ZC + RV * Math.cos(t), YW + RV * Math.sin(t)];
  const vaultY = (z) => YW + RV * Math.sin(Math.acos(clamp((z - ZC) / RV, -1, 1))); // Höhe des Gewölbes über der Tiefe z
  const LX = -0.4, LZ = 0.12; // Mondlicht: fällt von rechts oben schräg nach links unten (und leicht in die Halle hinein)
  const rng = (seed) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }; // je Element eigener Zufall → Halle bleibt periodisch
  let hall = null, lamps = [], shafts = [];
  function bar(m, x0, y0, z0, x1, y1, z1, w, col) { // dünne Strebe als flaches Band zur Kamera hin (1 Fläche statt 6 wie beim Balken)
    let sx = y1 - y0, sy = -(x1 - x0); const l = Math.hypot(sx, sy); if (l < 1e-6) { sx = 1; sy = 0; } else { sx /= l; sy /= l; }
    const h = w / 2;
    face(m, [vtx(m, x0 + sx * h, y0 + sy * h, z0), vtx(m, x1 + sx * h, y1 + sy * h, z1), vtx(m, x1 - sx * h, y1 - sy * h, z1), vtx(m, x0 - sx * h, y0 - sy * h, z0)], col, [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2 + 60], { two: true });
  }
  function palm(m, x, z, k, rnd) {
    let px = x, py = 0, pz = z; const lean = (rnd() - 0.5) * 0.5, n = k > 1.8 ? 8 : 6;
    for (let i = 0; i < n; i++) { const nx = px + lean * 7 * k, ny = py + 21 * k, r = (8 - i * 3.5 / (n - 1)) * k; beam(m, px, py, pz, nx, ny, pz, r, r, i % 2 ? TRUNK : TRUNK2); px = nx; py = ny; }
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
    lamps.push([x, 70, z, 1]);
  }
  function crown(m, x, z) { // Gaskrone: hängt an langer Kette aus dem Gewölbe, Messingreif mit sechs Glaskugeln
    const y = 392, top = vaultY(z);
    bar(m, x, y + 12, z, x, top, z, 1.8, IRON2);
    for (const a of [0, 2.1, 4.2]) bar(m, x, y + 40, z, x + Math.cos(a) * 20, y + 7, z + Math.sin(a) * 20, 1.2, IRON2); // Tragketten
    prism(m, x, y + 4, z, 22, 3, 8, BRASS); prism(m, x, y - 10, z, 4, 16, 6, BRASS, { rTop: 2 });
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, lx = x + Math.cos(a) * 22, lz = z + Math.sin(a) * 22; cone(m, lx, y + 9, lz, 3.6, 6, 6, LAMPC, { e: 1 }); cone(m, lx, y + 9, lz, 3.6, -5, 6, LAMPC, { e: 1 }); }
    lamps.push([x, y + 8, z, 1.9]);
  }
  function bed(m, x, z, rnd) { // Pflanzbeet aus Sandstein mit Farnen
    box(m, x, 0, z, 70, 12, 34, STONE2, { top: [70, 96, 52] });
    for (let i = 0; i < 6; i++) cone(m, x - 28 + i * 11 + rnd() * 4, 12, z - 8 + rnd() * 16, 9 + rnd() * 4, 12 + rnd() * 8, 5, i % 2 ? FERN : PALM2, { rot: rnd() * 3 });
  }
  // Halle in Abschnitte (CH Einheiten breit) und zwei Tiefenebenen zerlegt: unsichtbare Abschnitte werden gar nicht erst
  // projiziert, und die hintere Ebene (Rückwand, Galerien, unteres Gewölbe) bewegt sich nur etwa 0,4-mal so schnell wie die
  // Spielebene – sie wird entsprechend seltener neu gerastert
  const X0 = -960, X1 = P + 960, CH = 240, NC = Math.ceil((X1 - X0) / CH), ZF = 450;
  function buildHall() {
    lamps = []; shafts = [];
    const L = { far: { all: mesh(), ch: Array.from({ length: NC }, mesh) }, near: { all: mesh(), ch: Array.from({ length: NC }, mesh) } };
    const M = (x, z) => { const l = z >= ZF ? L.far : L.near; return x === null ? l.all : l.ch[clamp(Math.floor((x - X0) / CH), 0, NC - 1)]; };
    const MX = (X0 + X1) / 2, LEN = X1 - X0; // reicht bei Kamera modulo P bis zur Rückwand über die ganze Bildbreite
    for (let z = 200; z < ZB; z += 40) for (let x = X0; x < X1; x += 40) { // Fliesenboden: gedämpftes Schachbrett mit Terrakotta-Bordüren
      const i = Math.round(x / 40), j = Math.round(z / 40), col = j % 4 === 1 ? TERRA : (i + j) & 1 ? CREAM : DARKT, m = M(x + 20, z + 20);
      face(m, [vtx(m, x, 0, z), vtx(m, x, 0, z + 40), vtx(m, x + 40, 0, z + 40), vtx(m, x + 40, 0, z)], col, null, { two: true });
    }
    // Rückwand: Sockel, Pfosten, Riegel, Glas – fast so hoch wie ein Kirchenschiff
    const RIEGEL = [26, 86, 150, 196, 250, 290, YW];
    { const m = M(null, ZB); box(m, MX, 0, ZB + 8, LEN, 26, 16, STONE2, { top: STONE }); for (const y of RIEGEL) beam(m, X0, y, ZB, X1, y, ZB, 5, 5, IRON2, { open: true }); }
    for (let x = X0; x <= X1; x += BAY / 2) prism(M(x, ZB), x, 26, ZB, 3.2, YW - 26, 6, x % BAY ? IRON2 : IRON, { cap: false });
    for (let x = X0; x < X1; x += BAY / 2) for (let k = 1; k < RIEGEL.length; k++) { const m = M(x + BAY / 4, ZB); face(m, [vtx(m, x, RIEGEL[k - 1], ZB), vtx(m, x + BAY / 2, RIEGEL[k - 1], ZB), vtx(m, x + BAY / 2, RIEGEL[k], ZB), vtx(m, x, RIEGEL[k], ZB)], GLASS, null, { two: true, a: 0.2 }); }
    const TH = [0, 0.18, 0.36, 0.54, 0.72, 0.9, 1.1, 1.3, 1.55, 1.8]; // Gewölbe
    for (let x = X0; x <= X1; x += BAY) {
      for (let k = 1; k < TH.length; k++) { const [z0, y0] = vault(TH[k - 1]), [z1, y1] = vault(TH[k]); beam(M(x, (z0 + z1) / 2), x, y0, z0, x, y1, z1, 7, 10, IRON, { open: true }); }
      bar(M(x, ZB), x, YW - 40, ZB, x, YW, ZB - 40, 3, IRON2); // Zwickel-Strebe
    }
    for (const t of TH) { const [z, y] = vault(t); beam(M(null, z), X0, y, z, X1, y, z, 4, 4, IRON2, { open: true }); }
    for (let x = X0; x < X1; x += BAY) for (let k = 1; k < TH.length; k++) {
      const [z0, y0] = vault(TH[k - 1]), [z1, y1] = vault(TH[k]), m = M(x + BAY / 2, (z0 + z1) / 2);
      face(m, [vtx(m, x, y0, z0), vtx(m, x + BAY, y0, z0), vtx(m, x + BAY, y1, z1), vtx(m, x, y1, z1)], GLASS, null, { two: true, a: 0.14 });
    }
    // drei Galerien übereinander vor der Rückwand: durchgehende Säulen, Laufgänge, Brüstungen (unten mit Andreaskreuzen)
    for (let x = X0; x <= X1; x += BAY) prism(M(x, ZG), x, 0, ZG - 15, 3.4, TIERS[2] + 30, 6, IRON, { cap: false });
    TIERS.forEach((YG, n) => {
      const ma = M(null, ZG); box(ma, MX, YG, ZG, LEN, 4, 34, IRON2); beam(ma, X0, YG + 16, ZG - 16, X1, YG + 16, ZG - 16, 2.5, 2.5, IRON, { open: true });
      for (let x = X0; x <= X1; x += BAY) { const m = M(x, ZG); box(m, x, YG - 6, ZG - 15, 9, 6, 9, IRON2); bar(m, x, YG - 22, ZG - 15, x + 16, YG, ZG - 15, 2, IRON2); bar(m, x, YG - 22, ZG - 15, x - 16, YG, ZG - 15, 2, IRON2); } // Kapitelle mit Konsolen
      const st = n ? BAY : BAY / 2;
      for (let x = X0; x < X1; x += st) { const m = M(x + st / 2, ZG); bar(m, x, YG + 4, ZG - 16, x + st, YG + 16, ZG - 16, 1.8, IRON2); bar(m, x, YG + 16, ZG - 16, x + st, YG + 4, ZG - 16, 1.8, IRON2); }
    });
    for (let o = -2 * P; o < 3 * P; o += P) { // Pflanzen, Laternen, Gaskronen, Mondlicht: in jedem Abschnitt gleich (Periode P); alles vorn
      let j = 0;
      for (const [dx, dz, k] of [[90, 330, 1.6], [420, 430, 2.3], [700, 300, 1.35], [860, 450, 2.0]]) { const x = o + dx, r = rng(1000 + j++); if (x > X0 - 160 && x < X1 + 160) palm(M(x, 0), x, dz, k, r); }
      for (const dx of [250, 560, 940]) { const x = o + dx; if (x > X0 && x < X1) lamp(M(x, 0), x, 280); }
      for (const [dx, dz] of [[330, 250], [620, 360]]) { const x = o + dx, r = rng(2000 + j++); if (x > X0 && x < X1) bed(M(x, 0), x, dz, r); }
      for (const [dx, dz] of [[200, 300], [680, 380]]) { const x = o + dx; if (x > X0 - 40 && x < X1 + 40) crown(M(x, 0), x, dz); }
      // Mondlicht: je Glasfeld des Gewölbes eine schräge Lichtbahn (drei Streifen zwischen den Sprossen) bis auf den Boden
      for (const dx of [130, 370, 610, 850]) {
        const x = o + dx, [z, y] = vault(1.32); if (x < X0 - 300 || x > X1 + 300) continue;
        shafts.push({ x, y, z, w: 96, ph: (dx * 7 + o) * 0.013 });
      }
    }
    return L;
  }
  const bufs = {};
  // Mondlicht-Streifen eines Glasfelds als Lichtband vom Gewölbe bis zum Boden, darunter das Fensterbild auf den Fliesen
  function drawShafts(x, c3, Wb, Hb, dv, out) {
    x.save(); x.globalCompositeOperation = 'lighter';
    for (const s of shafts) {
      const bx = s.x + LX * s.y, bz = s.z + LZ * s.y;
      if (Math.max(s.x, bx) + s.w < c3.x - 900 || Math.min(s.x, bx) > c3.x + 900) continue;
      for (let k = 0; k < 3; k++) {
        const x0 = s.x + k * s.w / 3 + 3, x1 = x0 + s.w / 3 - 6;
        const T0 = project(c3, Wb, Hb, x0, s.y, s.z), T1 = project(c3, Wb, Hb, x1, s.y, s.z);
        const B0 = project(c3, Wb, Hb, x0 + LX * s.y, 0, bz), B1 = project(c3, Wb, Hb, x1 + LX * s.y, 0, bz);
        if (T0[2] < 20 || B0[2] < 20) continue;
        if (Math.max(T0[0], T1[0], B0[0], B1[0]) < 0 || Math.min(T0[0], T1[0], B0[0], B1[0]) > Wb || Math.min(T0[1], B0[1]) > Hb || Math.max(T0[1], B0[1]) < 0) continue;
        const a = 0.16 + 0.05 * Math.sin(s.ph + k);
        const g = x.createLinearGradient(T0[0], T0[1], B0[0], B0[1]);
        g.addColorStop(0, 'rgba(150,190,255,0)'); g.addColorStop(0.12, `rgba(160,200,255,${a.toFixed(3)})`); g.addColorStop(0.75, `rgba(150,196,240,${(a * 0.7).toFixed(3)})`); g.addColorStop(1, `rgba(150,196,240,${(a * 0.35).toFixed(3)})`);
        x.fillStyle = g; x.beginPath(); x.moveTo(T0[0], T0[1]); x.lineTo(T1[0], T1[1]); x.lineTo(B1[0], B1[1]); x.lineTo(B0[0], B0[1]); x.closePath(); x.fill();
        out.push([(T0[0] + T1[0]) / 2 * dv, (T0[1] + T1[1]) / 2 * dv, (B0[0] + B1[0]) / 2 * dv, (B0[1] + B1[1]) / 2 * dv, s.ph + k]);
        x.fillStyle = 'rgba(170,205,255,0.22)'; // Fensterbild auf dem Boden: zwei Scheiben übereinander
        for (const [z0, z1] of [[bz - 34, bz - 3], [bz + 3, bz + 34]]) {
          const p = [[x0 + LX * s.y, z0], [x1 + LX * s.y, z0], [x1 + LX * s.y, z1], [x0 + LX * s.y, z1]].map(([px, pz]) => project(c3, Wb, Hb, px, 0.5, pz));
          if (p.some(q => q[2] < 20)) continue;
          x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < 4; i++) x.lineTo(p[i][0], p[i][1]); x.closePath(); x.fill();
        }
      }
    }
    x.restore();
  }
  function layerBuf(name, Wb, Hb) {
    let B = bufs[name];
    if (!B || B.c.width !== Wb) { B = bufs[name] = { c: Sprites.canvas(Wb, Hb), key: null, dust: [], np: 0 }; B.x = B.c.getContext('2d', CPU); }
    return B;
  }
  function visible(l, camX) { // Abschnitte, die bis zur Rückwand ins Bild reichen können
    const half = View.w / 2 * 580 / 200 + 180, out = [l.all];
    for (let k = 0; k < NC; k++) { const a = X0 + k * CH; if (a + CH > camX - half && a < camX + half) out.push(l.ch[k]); }
    return out;
  }
  function drawHall(ctx, cam, frame = 0) {
    if (!hall) hall = buildHall();
    const w = View.w, dv = View.lite ? 3 : 2, Wb = Math.ceil(w / dv), Hb = Math.ceil(208 / dv);
    const floorPx = W.room ? (W.room.h - 2) * T : 176, camX = (((cam.x + w / 2) % P) + P) % P;
    // sehr hohe Räume (Kuppel): oberhalb der untersten Kameraposition steigt die 3D-Kamera langsamer, damit sie unter dem
    // Gewölbe bleibt – unten liegt der Hallenboden weiter genau auf dem Raumboden
    const rb = floorPx - Math.max(0, (W.room ? W.room.h * T : 208) - View.fh) - 83, rawMax = floorPx - 83, raw = floorPx - cam.y - 83;
    const camY = rawMax > 590 ? rb + (raw - rb) * (590 - rb) / (rawMax - rb) : raw;
    const F = layerBuf('far', Wb, Hb), N = layerBuf('near', Wb, Hb), c3 = { x: camX, y: camY, z: 0, yaw: 0, pitch: 0, f: 200 / dv, near: 20, hy: 0.4 };
    const kf = Math.round(camX * 0.4 / dv) + '|' + Math.round(camY * 0.4 / dv) + '|' + Wb;
    if (F.key !== kf) { F.key = kf; F.x.clearRect(0, 0, Wb, Hb); F.np = render(F.x, Wb, Hb, visible(hall.far, camX), c3, ENV); }
    const kn = Math.round(camX / dv) + '|' + Math.round(camY / dv) + '|' + Wb;
    if (N.key !== kn) {
      N.key = kn; N.x.clearRect(0, 0, Wb, Hb); N.dust = [];
      N.np = render(N.x, Wb, Hb, visible(hall.near, camX), c3, ENV);
      drawShafts(N.x, c3, Wb, Hb, dv, N.dust);
      N.x.save(); N.x.globalCompositeOperation = 'lighter'; // Lichthöfe der Gaslaternen und Gaskronen
      for (const [lx, ly, lz, ls] of lamps) {
        const [sx, sy, sz] = project(c3, Wb, Hb, lx, ly, lz), r = 5200 * ls / sz / dv; if (sz < 20 || sx < -r || sx > Wb + r || sy < -r || sy > Hb + r) continue;
        const g = N.x.createRadialGradient(sx, sy, 0, sx, sy, r); g.addColorStop(0, 'rgba(255,206,130,0.55)'); g.addColorStop(1, 'rgba(255,160,80,0)');
        N.x.fillStyle = g; N.x.fillRect(sx - r, sy - r, r * 2, r * 2);
      }
      N.x.restore();
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(F.c, 0, 0, Wb, Hb, 0, 0, w, 208); ctx.drawImage(N.c, 0, 0, Wb, Hb, 0, 0, w, 208); ctx.restore();
    ctx.fillStyle = 'rgba(214,232,255,0.55)'; // Staub schwebt in den Lichtbahnen
    for (const [tx, ty, bx, by, ph] of N.dust) for (let k = 0; k < 4; k++) {
      const u = (frame * 0.0016 + k * 0.25 + ph * 0.37) % 1, px = tx + (bx - tx) * u + Math.sin(frame * 0.02 + k * 2 + ph) * 3, py = ty + (by - ty) * u;
      if (px >= 0 && px < w && py >= 0 && py < 208) ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
  }
  // Mondlicht vor der Spielebene: schräge Bahnen mit Sprossenschatten fallen über Held, Galerien und Gegner; ziehende
  // Wolken lassen sie langsam auf- und abschwellen
  function drawFrontLight(ctx, cam, frame) {
    const w = View.w, floor = (W.room.h - 2) * T - cam.y, SL = -LX, SP = 368;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = Math.floor((cam.x - 160) / SP); k <= Math.floor((cam.x + w + 120 + SL * W.room.h * T) / SP); k++) {
      const xf = k * SP + 40 - cam.x, cloud = 0.55 + 0.45 * Math.sin(frame * 0.004 + k * 1.9);
      const yTop = Math.max(0, -cam.y), yBot = Math.min(208, floor + 8); if (yBot <= yTop) continue;
      const g = ctx.createLinearGradient(0, yTop, 0, yBot), a = 0.13 * cloud;
      g.addColorStop(0, `rgba(160,200,255,${a.toFixed(3)})`); g.addColorStop(1, `rgba(140,190,240,${(a * 0.45).toFixed(3)})`);
      ctx.fillStyle = g;
      for (const [o, wd] of [[0, 15], [19, 15], [38, 12]]) { // drei Scheiben, dazwischen die Sprossen
        const xa = xf + o + SL * (floor - yTop), xb = xf + o + SL * (floor - yBot);
        if (Math.max(xa, xb) + wd < 0 || Math.min(xa, xb) > w) continue;
        ctx.beginPath(); ctx.moveTo(xa, yTop); ctx.lineTo(xa + wd, yTop); ctx.lineTo(xb + wd, yBot); ctx.lineTo(xb, yBot); ctx.closePath(); ctx.fill();
      }
      if (floor < 214 && floor > -4) { ctx.fillStyle = `rgba(170,210,255,${(0.2 * cloud).toFixed(3)})`; for (const [o, wd] of [[0, 15], [19, 15], [38, 12]]) ctx.fillRect(Math.round(xf + o), Math.round(floor), wd, 2); }
      ctx.fillStyle = 'rgba(220,236,255,0.5)';
      for (let d = 0; d < 5; d++) { const u = (frame * 0.0021 + d * 0.2 + k * 0.31) % 1, yy = yTop + (yBot - yTop) * u, xx = xf + 22 + SL * (floor - yy) + Math.sin(frame * 0.03 + d * 1.7 + k) * 16; if (xx >= 0 && xx < w) ctx.fillRect(Math.round(xx), Math.round(yy), 1, 1); }
    }
    ctx.restore();
  }
  const prewarm = () => { if (!hall) hall = buildHall(); };

  // Kleines PS2-Objekt in einen eigenen Puffer rendern: Kamera weit weg und etwas erhöht (fast orthografisch, Oberseiten
  // sichtbar), 1 Einheit = 1 Pixel, Ursprung unten in der Mitte des Puffers
  const PENV = { sun: null, sunC: [0.62, 0.72, 0.9], amb: [0.38, 0.4, 0.48], sky: [0.2, 0.22, 0.28], fog: [0, 0, 0], fogD: 0 };
  { const v = [0.55, 0.75, -0.45], l = Math.hypot(...v); PENV.sun = v.map(c => c / l); }
  // r0/fullH: nur ein Fenster (Zeilen r0 … r0 + h) eines fullH hohen Bildes rastern – für lange Objekte, die nur teils im Bild sind
  function propRender(buf, w, h, list, env = PENV, fullH = h, r0 = 0) {
    if (!buf.c || buf.c.width !== w || buf.c.height !== h) { buf.c = Sprites.canvas(w, h); buf.x = buf.c.getContext('2d', CPU); }
    buf.x.clearRect(0, 0, w, h);
    render(buf.x, w, h, list, { x: 0, y: fullH / 2 + 500, z: -1500, yaw: 0, pitch: 0, f: 1500, near: 100, cy: fullH / 2 - 500 - r0 }, env);
    return buf.c;
  }

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

  const stats = () => ({ far: bufs.far ? bufs.far.np : 0, near: bufs.near ? bufs.near.np : 0 });
  return { S, drawHall, drawLamp, drawFrontLight, prewarm, propRender, stats };
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

// ---------------- Easteregg: die durstige Pflanze ----------------
// Unten in der Kuppel steht ein großer Kübel mit Messingschild „NICHT FÜTTERN“. Die Pflanze darin reißt das Maul auf, sobald
// jemand vorbeikommt – sie hat Durst. Wer ihr die Limonade vom Erfrischungsstand bringt, sieht sie gierig trinken, rülpsen und
// als Riesenranke durch die Kuppel schießen: Sie sprengt den Boden der versiegelten Sternwarte, ihre Blätter tragen den Helden
// hinauf zu Fernrohr, Truhe und 1UP. (Gruß an ein altes Gruselvillen-Abenteuer mit einer sehr durstigen Zimmerpflanze.)
class VineLeaf extends Ent { // Blattspreite als Plattform (gezeichnet von der Pflanze)
  constructor(x, y) { super(x, y, 28, 6); this.kind = 'platform'; this.solid = false; this.passable = true; this.dx = 0; this.dy = 0; this.pop = 0; } // Unten (+ Sprung): hindurchfallen
  update() {}
  draw() {}
}
class ThirstyPlant extends Ent {
  constructor(d) {
    super(d.x * T - 14, (d.y + 1) * T - 34, 28, 34);
    this.kind = 'prop'; this.d = d; this.state = 'thirst'; this.st = 0; this.g = 0; this.noteCd = 0; this.open = 0.15; this.look = 1; this.broke = false;
    this.sx = d.x * T; this.base = (d.y + 1) * T; this.full = this.base - d.top * T - 16; // Stammfuß (Welt) und volle Rankenlänge
    const y0 = this.base - 38, y1 = d.hole[3] * T + 2, n = Math.round((y0 - y1) / 36); // Blätter alle ~36 px: ein normaler Sprung reicht
    this.leaves = Array.from({ length: n + 1 }, (_, i) => { // abwechselnd links und rechts; direkt unter dem Loch mittig (sonst stößt der Kopf an)
      const y = Math.round(y0 - (y0 - y1) * i / n), side = y < (d.hole[3] + 1) * T + 64 ? 0 : i % 2 ? 1 : -1, l = new VineLeaf(this.sx - 14 + side * 16, y);
      l.side = side; return l;
    });
    this.body = {}; this.bodyBig = {}; this.bodySpr = null; this.bodyKey = ''; this.hinted = false;
  }
  ease(g) { return 1 - Math.pow(1 - g, 2.2); }
  len() { return this.state === 'grow' || this.state === 'grown' ? 14 + (this.full - 14) * this.ease(this.g) : 14; }
  wob(h) { return Math.sin(h * 0.021 + 0.6) * Math.min(7, h * 0.08); } // Rankenschwung: kaum am Fuß, mehr nach oben
  update() {
    this.t++; this.st++; if (this.noteCd > 0) this.noteCd--;
    const p = W.player, near = p.alive && Math.abs(p.cx - this.sx) < 36 && Math.abs(p.feet - this.base) < 20;
    if (this.state === 'thirst') {
      this.look = p.cx < this.sx ? -1 : 1;
      this.open += ((near ? 0.55 + 0.4 * Math.sin(this.t * 0.25) : 0.12 + 0.06 * Math.sin(this.t * 0.05)) - this.open) * 0.2;
      if (near && p.limo) { p.limo = false; this.state = 'drink'; this.st = 0; Game.note('plantDrink'); }
      else if (near && !this.noteCd) { Game.note('plantThirst'); Audio8.sfx('growl', this.sx); this.noteCd = 420; }
    } else if (this.state === 'drink') { // gierig trinken, dann ein gewaltiger Rülpser
      this.open = this.st < 70 ? 0.3 + 0.22 * Math.sin(this.st * 0.45) : Math.min(1, this.open + 0.1);
      if (this.st % 16 === 1 && this.st < 64) Audio8.sfx('glug', this.sx);
      if (this.st === 78) { Audio8.sfx('burp', this.sx); W.shake = 5; for (let i = 0; i < 8; i++) W.spawn(new Particle(this.sx + this.look * 8, this.base - 34, rnd(-0.6, 0.6) + this.look * 0.6, rnd(-1.4, -0.4), '#e8f8c0', 34, 1, -0.01)); }
      if (this.st > 116) { this.state = 'grow'; this.st = 0; Audio8.sfx('rise', this.sx); Input.rumble(0.6, 0.5, 900); }
    } else if (this.state === 'grow') { // schießt hoch, Blätter klappen nacheinander auf, oben birst der Boden der Sternwarte
      this.g = Math.min(1, this.st / 210); this.open = 0.45 + 0.35 * Math.sin(this.st * 0.2);
      if (this.st % 18 === 0) { W.shake = Math.max(W.shake, 3); Audio8.sfx('creak', this.sx); }
      const tip = this.base - 16 - this.len();
      for (const l of this.leaves) if (l.solid === false && tip < l.y - 10) { l.solid = true; l.pop = 1; Audio8.sfx('flap', l.cx); }
      if (!this.broke && tip < (this.d.hole[3] + 1) * T) this.breakFloor();
      if (this.g >= 1) { this.state = 'grown'; this.st = 0; for (const l of this.leaves) { l.solid = true; l.pop = 12; } } // fertig: alle Blätter ganz offen (Ranke wird nur noch einmal gerastert)
    } else {
      this.look = p.cx < this.sx ? -1 : 1;
      this.open += ((p.alive && Math.abs(p.cy - (this.base - 16 - this.len())) < 70 ? 0.7 : 0.25 + 0.1 * Math.sin(this.t * 0.06)) - this.open) * 0.1;
      if (!this.hinted && p.ridePlat instanceof VineLeaf && p.ridePlat.y < this.d.hole[3] * T + 80) { this.hinted = true; Game.note('vineHint'); } // oben: wie man wieder hinunterkommt
    }
    for (const l of this.leaves) if (l.pop > 0 && l.pop < 12) l.pop++;
  }
  breakFloor() {
    this.broke = true; const [x0, x1, y0, y1] = this.d.hole;
    for (let r = y0; r <= y1; r++) for (let c = x0; c <= x1; c++) W.room.grid[r][c] = '.';
    Audio8.sfx('crash'); Audio8.sfx('shatter'); W.shake = 16; Input.rumble(1, 0.8, 500);
    for (let i = 0; i < 28; i++) W.spawn(new Particle(rnd(x0 * T, (x1 + 1) * T), rnd(y0 * T, (y1 + 1) * T), rnd(-1.6, 1.6), rnd(-2.6, 0.4), ['#6c6c78', '#3c3c44', '#b8e8f0', '#58a868'][i % 4], 60, 2, 0.15));
    Game.note('plantBreak');
  }
  bodyMesh(len) {
    const m = PS2.mesh(), ST = [72, 140, 52], ST2 = [52, 112, 42], LEAF = [92, 176, 64], LEAF2 = [66, 140, 50], RIB = [170, 216, 106]; // Kübel und Kopf sind Sprites
    const N = Math.max(2, Math.ceil(len / 22)), ring = [];
    for (let s = 0; s <= N; s++) { // Stamm: gewundene Röhre, unten dick, oben dünn
      const u = s / N, y = 15 + len * u, x = this.wob(y - 15), r = 4 - 1.5 * u + (len > 40 ? 2.5 * (1 - u) : 0), row = [];
      for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; row.push(PS2.vtx(m, x + Math.cos(a) * r, y, Math.sin(a) * r)); }
      ring.push(row);
    }
    for (let s = 0; s < N; s++) for (let k = 0; k < 6; k++) PS2.face(m, [ring[s][k], ring[s][(k + 1) % 6], ring[s + 1][(k + 1) % 6], ring[s + 1][k]], (s + k) % 2 ? ST : ST2, null, { two: true });
    for (const l of this.leaves) { // breite, flache Blattspreiten mit Stiel und Mittelrippe; außen hängen sie etwas
      if (!l.pop) continue;
      const k = Math.min(1, l.pop / 10), y = this.base - l.y, side = l.side || 1, cx = l.side * 16, rx = 15 * k, rz = 10 * k;
      const c = PS2.vtx(m, cx, y + 1, 0), pts = [];
      for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, ex = Math.cos(a); pts.push(PS2.vtx(m, cx + ex * rx, y - (ex * side > 0.3 ? 3 * k : 0) + 0.5, Math.sin(a) * rz)); }
      for (let i = 0; i < 10; i++) PS2.face(m, [c, pts[i], pts[(i + 1) % 10]], i % 2 ? LEAF : LEAF2, null, { two: true });
      PS2.beam(m, this.wob(y - 15), y - 3, 0, cx + side * rx * 0.85, y + 0.8, 0, 1.3, 1.3, RIB);
    }
    return m;
  }
  headSprite() { // Stimmung des Fangkopfs: ruhig, durstig (Zunge), schluckend, rülpsend
    const tp = Expo.S.tp, st = this.state;
    if (st === 'drink') return this.st >= 72 && this.st < 104 ? tp.burp : (this.st >> 3) & 1 ? tp.gulp : tp.idle[1];
    if (st === 'grow') return (this.st >> 3) & 1 ? tp.open : tp.idle[0];
    return this.open > 0.6 ? tp.open : tp.idle[(this.t >> 4) & 1];
  }
  draw(ctx) {
    const sx = Math.round(this.sx - W.cam.x), by = Math.round(this.base - W.cam.y), len = this.len(), H = Math.ceil(len) + 24, tp = Expo.S.tp;
    this.plate(ctx, sx, by);
    if (sx < -70 || sx > View.w + 70 || by - H - 40 > 214 || by < -8) return;
    // Ranke und Blätter in 3D: während des Wachsens in eine feste große Leinwand (keine neue je Bild) und nur jede dritte
    // Längeneinheit neu; steht sie still, bekommt sie die dunkle Kontur der Sprites
    const HF = Math.ceil(this.full) + 24, pops = this.leaves.reduce((a, l) => a + l.pop, 0);
    if (this.state === 'grow') { // wachsend: nur der sichtbare Bildausschnitt (240 Zeilen) der langen Ranke
      const r0 = clamp(HF - by - 16, 0, HF - 240), key = 'G' + Math.round(len / 3) + '|' + pops + '|' + r0;
      if (key !== this.bodyKey) { this.bodyKey = key; Expo.propRender(this.bodyBig, 100, 240, [this.bodyMesh(len)], undefined, HF, r0); this.bodySpr = null; }
      ctx.drawImage(this.bodyBig.c, sx - 50, by - HF + r0);
    } else { // ruhend bzw. ausgewachsen: einmal ganz rastern; die kurze Ranke bekommt die Kontur der Sprites (bei der langen
      // wäre die Pixel-Kontur ein spürbarer Hänger)
      const big = this.state === 'grown', BH = big ? HF : H, buf = big ? this.bodyBig : this.body, key = (big ? 'B' : 'S') + Math.round(len) + '|' + pops;
      if (key !== this.bodyKey) { this.bodyKey = key; Expo.propRender(buf, 100, BH, [this.bodyMesh(len)]); this.bodySpr = big ? null : Sprites.fromCanvas(buf.c, true); }
      if (this.bodySpr) Sprites.draw(ctx, this.bodySpr, sx - 50, by - BH); else ctx.drawImage(buf.c, sx - 50, by - BH);
    }
    if (!tp) return;
    Sprites.draw(ctx, tp.pot, sx - 16, by - 22);
    const hs = this.headSprite(), tx = sx + Math.round(this.wob(len)), ty = by - 15 - Math.round(len), fl = this.look < 0; // Angel des Kopfs auf der Rankenspitze
    if (ty > -40 && ty < 250) Sprites.draw(ctx, hs, fl ? tx - 29 : tx - 11, ty - 26, fl);
  }
  plate(ctx, sx, by) { // Messingschild am Pfosten rechts neben dem Kübel
    const s = tr('plateFeed'), w = Font.width(s) + 8, x = sx + 20, y = by - 30;
    if (x > View.w || x + w < 0 || y > 214 || y < -20) return;
    ctx.fillStyle = '#1c1408'; ctx.fillRect(x + 4, y + 10, 2, 20);
    ctx.fillStyle = '#4c3810'; ctx.fillRect(x, y, w, 11); ctx.fillStyle = '#c09440'; ctx.fillRect(x + 1, y + 1, w - 2, 9); ctx.fillStyle = '#f0d478'; ctx.fillRect(x + 1, y + 1, w - 2, 1);
    Font.draw(ctx, s, x + 4, y + 2, '#3c2408');
  }
}

// Erfrischungsstand der Ausstellung: Holztheke unter gestreiftem Sonnendach, auf der Theke eine Flasche Limonade
class LimoStand extends Ent {
  constructor(d) { super(d.x * T - 30, (d.y + 1) * T - 24, 60, 24); this.kind = 'prop'; this.taken = false; this.buf = {}; }
  update() {
    this.t++;
    const p = W.player;
    if (!this.taken && p.alive && p.cx > this.x + 6 && p.cx < this.x + this.w - 6 && Math.abs(p.feet - (this.y + this.h)) < 18) {
      this.taken = true; p.limo = true; Audio8.sfx('item', this.cx); W.sparks(this.cx, this.y, 6); Game.note('limoNote');
    }
  }
  mesh() {
    const m = PS2.mesh(), WOOD = [124, 78, 44], WOOD2 = [156, 104, 60], WOOD3 = [88, 52, 30], IRON = [48, 104, 66], RED = [184, 44, 44], CREAM = [226, 214, 182], GL = [70, 150, 80];
    PS2.box(m, 0, 0, 4, 60, 24, 16, WOOD, { top: WOOD2 });
    PS2.box(m, 0, 4, -4.4, 52, 14, 1, WOOD3);
    PS2.box(m, 0, 24, 10, 56, 5, 4, WOOD3); // Rückwand-Bord mit Flaschen
    for (let i = 0; i < 7; i++) PS2.prism(m, -21 + i * 7, 29, 10, 1.8, 7, 6, GL, { rTop: 0.9 });
    for (const x of [-28, 28]) PS2.prism(m, x, 24, 10, 1.4, 32, 6, IRON, { cap: false });
    for (let i = 0; i < 8; i++) { // Sonnendach: rot-weiß gestreift, nach vorn geneigt
      const x0 = -32 + i * 8, v = (x, y, z) => PS2.vtx(m, x, y, z);
      PS2.face(m, [v(x0, 58, 12), v(x0 + 8, 58, 12), v(x0 + 8, 48, -10), v(x0, 48, -10)], i % 2 ? CREAM : RED, null, { two: true });
      PS2.face(m, [v(x0, 48, -10), v(x0 + 8, 48, -10), v(x0 + 8, 44, -11), v(x0, 44, -11)], i % 2 ? RED : CREAM, null, { two: true }); // Volant
    }
    PS2.box(m, 0, 58, 12, 50, 11, 2, WOOD3);
    return m;
  }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.y + this.h - W.cam.y);
    if (x < -50 || x > View.w + 50 || y < -10 || y > 290) return;
    if (!this.buf.c) Expo.propRender(this.buf, 76, 76, [this.mesh()]);
    ctx.drawImage(this.buf.c, x - 38, y - 76);
    Font.draw(ctx, tr('limoSign'), x, y - 66, '#f8d878', { align: 'center' });
    if (!this.taken) LimoStand.bottle(ctx, x - 4, y - 36 + (Math.floor(this.t / 30) % 2));
  }
  static bottle(ctx, x, y) { // Bügelflasche aus grünem Glas mit Etikett
    const R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#1c3c1c', 2, 0, 3, 4); R('#e8e8f0', 2, 0, 3, 1); R('#1c3c1c', 1, 4, 5, 8); R('#48a848', 2, 4, 3, 7); R('#b8f0a0', 2, 5, 1, 5);
    R('#f8e8a8', 1, 7, 5, 3); R('#d82800', 2, 8, 3, 1);
  }
}

// Fernrohr in der Sternwarte: Messingrohr auf dreibeinigem Stativ, auf den Blutmond gerichtet
class Telescope extends Ent {
  constructor(d) { super(d.x * T - 6, (d.y + 1) * T - 30, 28, 30); this.kind = 'prop'; this.seen = false; this.buf = {}; }
  update() { const p = W.player; if (!this.seen && p.alive && Phys.overlap(this, p)) { this.seen = true; Game.note('scopeNote'); Audio8.sfx('select'); } }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.y + this.h - W.cam.y);
    if (x < -40 || x > View.w + 40 || y < -10 || y > 250) return;
    if (!this.buf.c) {
      const m = PS2.mesh(), BR = [206, 164, 72], BR2 = [150, 112, 44], WD = [96, 60, 34];
      for (const [fx, fz] of [[-10, -6], [10, -6], [0, 9]]) PS2.beam(m, fx, 0, fz, 0, 20, 0, 1.6, 1.6, WD);
      PS2.beam(m, -11, 17, 0, 15, 33, 0, 6, 6, BR); PS2.beam(m, 13, 32, 0, 18, 35, 0, 7.5, 7.5, BR2); PS2.beam(m, -14, 15, 0, -11, 17, 0, 3, 3, BR2);
      Expo.propRender(this.buf, 52, 52, [m]);
    }
    ctx.drawImage(this.buf.c, x - 26, y - 52);
  }
}
