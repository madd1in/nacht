// PS2-Look: kleiner Software-3D-Renderer für Hintergründe. Low-Poly-Körper mit Sonnen- und Himmelslicht,
// Luftperspektive (Dunst), gerendert in halber Auflösung und weich hochskaliert – wie die Bilinear-Filterung der PS2.
// Dazu die Sonnenkathedrale (Stadt aus Kathedrale, Strebebögen und Türmen im ewigen Sonnenuntergang) und der
// Sonnenturm: ein Zylinder, um den man herum nach oben klettert – der Turm dreht sich, die Stadt kreist dahinter.
'use strict';

const PS2 = (() => {
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ---------------- Meshbau ----------------
  const mesh = () => ({ v: [], f: [] });
  const vtx = (m, x, y, z) => { m.v.push(x, y, z); return m.v.length / 3 - 1; };
  function face(m, idx, col, center, o = {}) {
    const V = m.v, a = idx[0] * 3, b = idx[1] * 3, c = idx[idx.length - 1] * 3;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    if (center) { // Normale nach außen (weg vom Körpermittelpunkt) – so ist die Eckreihenfolge egal
      let fx = 0, fy = 0, fz = 0;
      for (const i of idx) { fx += V[i * 3]; fy += V[i * 3 + 1]; fz += V[i * 3 + 2]; }
      fx /= idx.length; fy /= idx.length; fz /= idx.length;
      if (nx * (fx - center[0]) + ny * (fy - center[1]) + nz * (fz - center[2]) < 0) { nx = -nx; ny = -ny; nz = -nz; }
    }
    m.f.push({ i: idx, c: col, n: [nx, ny, nz], e: o.e || 0, two: !!o.two });
  }
  function box(m, cx, y0, cz, w, h, d, col, o = {}) {
    const hw = w / 2, hd = d / 2, rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot);
    const P = (x, y, z) => vtx(m, cx + x * cs - z * sn, y, cz + x * sn + z * cs);
    const a = P(-hw, y0, -hd), b = P(hw, y0, -hd), c = P(hw, y0, hd), d2 = P(-hw, y0, hd);
    const e = P(-hw, y0 + h, -hd), f = P(hw, y0 + h, -hd), g = P(hw, y0 + h, hd), k = P(-hw, y0 + h, hd);
    const C = [cx, y0 + h / 2, cz];
    face(m, [a, b, f, e], col, C, o); face(m, [b, c, g, f], col, C, o); face(m, [c, d2, k, g], col, C, o); face(m, [d2, a, e, k], col, C, o);
    face(m, [e, f, g, k], o.top || col, C, o);
    if (o.bottom) face(m, [a, d2, c, b], col, C, o);
  }
  function prism(m, cx, y0, cz, r, h, n, col, o = {}) { // senkrechte n-Eck-Säule (rTop: verjüngt)
    const rt = o.rTop ?? r, rot = o.rot || 0, bot = [], top = [], C = [cx, y0 + h / 2, cz];
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * Math.PI * 2;
      bot.push(vtx(m, cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r)); top.push(vtx(m, cx + Math.cos(a) * rt, y0 + h, cz + Math.sin(a) * rt));
    }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; face(m, [bot[i], bot[j], top[j], top[i]], col, C, o); }
    if (o.cap !== false) face(m, top.slice().reverse(), o.top || col, C, o);
  }
  function cone(m, cx, y0, cz, r, h, n, col, o = {}) { // Turmhelm / Fiale
    const rot = o.rot || 0, base = [], apex = vtx(m, cx, y0 + h, cz), C = [cx, y0 + h / 3, cz];
    for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; base.push(vtx(m, cx + Math.cos(a) * r, y0, cz + Math.sin(a) * r)); }
    for (let i = 0; i < n; i++) face(m, [base[i], base[(i + 1) % n], apex], col, C, o);
  }
  function gable(m, cx, y0, cz, len, wid, h, col, o = {}) { // Satteldach, First entlang der lokalen z-Achse
    const rot = o.rot || 0, cs = Math.cos(rot), sn = Math.sin(rot), P = (x, y, z) => vtx(m, cx + x * cs - z * sn, y, cz + x * sn + z * cs);
    const hw = wid / 2, hl = len / 2, C = [cx, y0 + h * 0.3, cz];
    const a = P(-hw, y0, -hl), b = P(hw, y0, -hl), c = P(hw, y0, hl), d = P(-hw, y0, hl), r0 = P(0, y0 + h, -hl), r1 = P(0, y0 + h, hl);
    face(m, [a, d, r1, r0], col, C, o); face(m, [b, r0, r1, c], col, C, o);
    face(m, [a, r0, b], o.end || col, C, o); face(m, [c, r1, d], o.end || col, C, o);
  }
  function beam(m, x0, y0, z0, x1, y1, z1, w, h, col, o = {}) { // Balken zwischen zwei Punkten (Strebebogen, Brücke)
    let dx = x1 - x0, dy = y1 - y0, dz = z1 - z0; const L = Math.hypot(dx, dy, dz) || 1; dx /= L; dy /= L; dz /= L;
    let sx = dz, sz = -dx; const sl = Math.hypot(sx, sz) || 1; sx /= sl; sz /= sl; // seitlich (waagerecht)
    const ux = -sz * dy, uy = sz * dx - sx * dz, uz = sx * dy; // oben
    const C = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], hw = w / 2, hh = h / 2, P = [];
    for (const [px, py, pz] of [[x0, y0, z0], [x1, y1, z1]]) for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) P.push(vtx(m, px + sx * a * hw + ux * b * hh, py + uy * b * hh, pz + sz * a * hw + uz * b * hh));
    for (let k = 0; k < 4; k++) { const j = (k + 1) % 4; face(m, [P[k], P[j], P[4 + j], P[4 + k]], col, C, o); }
    face(m, [P[0], P[1], P[2], P[3]], col, C, o); face(m, [P[4], P[5], P[6], P[7]], col, C, o);
  }

  // ---------------- Rendern ----------------
  // cam: { x, y, z, yaw, pitch, f, near, hy }  env: { sun:[x,y,z], sunC, amb, sky, fog, fogD }
  const css = (r, g, b) => `rgb(${r | 0},${g | 0},${b | 0})`;
  function render(x, W, H, list, cam, env) {
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    const f = cam.f, hx = W / 2, hy = H * (cam.hy ?? 0.5), near = cam.near || 4, polys = [];
    const L = env.sun, S = env.sunC, A = env.amb, K = env.sky, F = env.fog, fd = env.fogD;
    for (const m of list) {
      const V = m.v, n = V.length / 3, P = m._p && m._p.length === V.length ? m._p : (m._p = new Float32Array(V.length));
      for (let i = 0; i < n; i++) {
        const X = V[i * 3] - cam.x, Y = V[i * 3 + 1] - cam.y, Z = V[i * 3 + 2] - cam.z;
        const x1 = X * cy - Z * sy, z1 = X * sy + Z * cy;
        P[i * 3] = x1; P[i * 3 + 1] = Y * cp - z1 * sp; P[i * 3 + 2] = Y * sp + z1 * cp;
      }
      for (const fc of m.f) {
        const i0 = fc.i[0] * 3;
        if (!fc.two && fc.n[0] * (cam.x - V[i0]) + fc.n[1] * (cam.y - V[i0 + 1]) + fc.n[2] * (cam.z - V[i0 + 2]) <= 0) continue; // Rückseite
        const pts = []; let zs = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9, bad = false;
        for (const i of fc.i) {
          const z = P[i * 3 + 2]; if (z < near) { bad = true; break; }
          const X = hx + P[i * 3] * f / z, Y = hy - P[i * 3 + 1] * f / z;
          pts.push(X, Y); zs += z;
          if (X < minX) minX = X; if (X > maxX) maxX = X; if (Y < minY) minY = Y; if (Y > maxY) maxY = Y;
        }
        if (bad || maxX < 0 || minX > W || maxY < 0 || minY > H) continue;
        const zm = zs / fc.i.length, nn = fc.n;
        const d = Math.max(0, nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2]), up = 0.5 + 0.5 * nn[1];
        let r = fc.c[0] * (A[0] + d * S[0] + up * K[0]), g = fc.c[1] * (A[1] + d * S[1] + up * K[1]), b = fc.c[2] * (A[2] + d * S[2] + up * K[2]);
        if (fc.e) { r += 255 * fc.e; g += 200 * fc.e; b += 120 * fc.e; }
        const k = 1 - Math.exp(-zm * fd);
        r = r * (1 - k) + F[0] * k; g = g * (1 - k) + F[1] * k; b = b * (1 - k) + F[2] * k;
        polys.push({ z: zm, pts, col: css(Math.min(255, r), Math.min(255, g), Math.min(255, b)) });
      }
    }
    polys.sort((a, b) => b.z - a.z);
    x.lineWidth = 0.7; x.lineJoin = 'round';
    for (const p of polys) {
      const q = p.pts; x.fillStyle = p.col; x.strokeStyle = p.col;
      x.beginPath(); x.moveTo(q[0], q[1]); for (let k = 2; k < q.length; k += 2) x.lineTo(q[k], q[k + 1]); x.closePath(); x.fill(); x.stroke(); // Kontur schließt Fugen
    }
    return polys.length;
  }
  function project(cam, W, H, X, Y, Z) { // einzelner Punkt → [sx, sy, z]
    const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
    X -= cam.x; Y -= cam.y; Z -= cam.z;
    const x1 = X * cy - Z * sy, z1 = X * sy + Z * cy, y2 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
    return [W / 2 + x1 * cam.f / z2, H * (cam.hy ?? 0.5) - y2 * cam.f / z2, z2];
  }

  // ---------------- Sonnenkathedrale: die Stadt ----------------
  const STONE = [236, 214, 172], STONE2 = [214, 188, 146], ROOF = [92, 98, 120], GOLD = [246, 204, 96], DARK = [60, 46, 44];
  let city = null;
  function buildCity() {
    let s = 2024; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const m = mesh(), win = (x0, y0, z0, w, h, axis, side) => { // dunkle Spitzbogenfenster leicht vor der Wand
      if (axis === 'x') box(m, x0, y0, z0 + side * 1.5, w, h, 1, DARK);
      else box(m, x0 + side * 1.5, y0, z0, 1, h, w, DARK);
    };
    // Langhaus mit Satteldach, zwei Westtürme mit Helmen, Querhaus, Vierungsturm, Chor
    box(m, 0, 0, 0, 72, 92, 260, STONE); gable(m, 0, 92, 0, 262, 76, 44, ROOF, { end: STONE2 });
    for (let z = -100; z <= 100; z += 40) { win(37, 34, z, 12, 40, 'z', 1); win(-37, 34, z, 12, 40, 'z', -1); }
    for (const sx of [-48, 48]) {
      box(m, sx, 0, -150, 38, 196, 38, STONE2, { top: STONE }); cone(m, sx, 196, -150, 24, 118, 8, ROOF, { rot: Math.PI / 8 });
      cone(m, sx, 312, -150, 3, 16, 4, GOLD);
      for (const sy2 of [60, 120]) win(sx, sy2, -169, 12, 34, 'x', -1);
      for (const [px, pz] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) cone(m, sx + px, 196, -150 + pz, 5, 26, 4, STONE2);
    }
    box(m, 0, 40, -132, 54, 70, 4, STONE2); // Westfassade zwischen den Türmen
    prism(m, 0, 70, -135, 16, 2, 16, GOLD, { cap: true }); prism(m, 0, 72, -137, 12, 1, 16, DARK, { cap: true }); // Fensterrose
    box(m, 0, 0, 40, 200, 86, 62, STONE); gable(m, 0, 86, 40, 204, 66, 38, ROOF, { rot: Math.PI / 2, end: STONE2 });
    prism(m, 0, 92, 40, 24, 82, 8, STONE2, { rot: Math.PI / 8, top: STONE }); cone(m, 0, 174, 40, 26, 132, 8, ROOF, { rot: Math.PI / 8 }); cone(m, 0, 304, 40, 3, 18, 4, GOLD);
    prism(m, 0, 0, 132, 40, 86, 10, STONE, { rot: 0.31 }); cone(m, 0, 86, 132, 42, 50, 10, ROOF, { rot: 0.31 });
    // Strebebögen: Pfeiler mit Fialen, Bögen zur Hochwand
    for (const z of [-96, -50, -4, 84]) for (const sd of [-1, 1]) {
      box(m, sd * 98, 0, z, 16, 74, 16, STONE2, { top: STONE }); cone(m, sd * 98, 74, z, 8, 34, 4, STONE2, { rot: Math.PI / 4 });
      beam(m, sd * 92, 70, z, sd * 38, 88, z, 7, 6, STONE2); beam(m, sd * 92, 46, z, sd * 38, 62, z, 6, 5, STONE2);
    }
    // Stadt im Ring: schlanke Türme mit Goldspitzen, Brücken zwischen Nachbartürmen, Terrassen
    const towers = [];
    for (let i = 0; i < 13; i++) {
      const a = i / 13 * Math.PI * 2 + rnd() * 0.3, R = 330 + rnd() * 230, h = 130 + rnd() * 210, r = 16 + rnd() * 12;
      const x0 = Math.cos(a) * R, z0 = Math.sin(a) * R, n = rnd() < 0.5 ? 6 : 8;
      prism(m, x0, 0, z0, r, h, n, rnd() < 0.5 ? STONE : STONE2, { rTop: r * 0.86, top: STONE });
      cone(m, x0, h, z0, r * 1.05, h * 0.42, n, ROOF); cone(m, x0, h + h * 0.42, z0, 2, 12, 4, GOLD);
      box(m, x0, h * 0.62, z0, r * 2.3, 8, r * 2.3, STONE2); // Umgang
      towers.push([x0, z0, h]);
    }
    for (let i = 0; i < towers.length; i++) if (i % 2 === 0) {
      const [ax, az, ah] = towers[i], [bx, bz, bh] = towers[(i + 1) % towers.length], y = Math.min(ah, bh) * 0.55;
      beam(m, ax, y, az, bx, y, bz, 12, 8, STONE2);
    }
    for (let i = 0; i < 18; i++) { // Häuserblöcke und Terrassen
      const a = rnd() * Math.PI * 2, R = 180 + rnd() * 380;
      const x0 = Math.cos(a) * R, z0 = Math.sin(a) * R, w = 40 + rnd() * 60, d = 40 + rnd() * 60, h = 30 + rnd() * 70;
      box(m, x0, 0, z0, w, h, d, STONE2, { rot: a, top: STONE }); gable(m, x0, h, z0, d, w, 18 + rnd() * 14, ROOF, { rot: a, end: STONE2 });
    }
    prism(m, 0, -40, 0, 700, 40, 12, [170, 140, 96], { top: [196, 166, 116] }); // Felsplateau der Stadt
    for (let i = 0; i < 16; i++) { // ferne Felsnadeln im Dunst
      const a = i / 16 * Math.PI * 2 + rnd() * 0.2, R = 1150 + rnd() * 300;
      prism(m, Math.cos(a) * R, -60, Math.sin(a) * R, 60 + rnd() * 70, 260 + rnd() * 360, 5, [150, 110, 90], { rTop: 14 + rnd() * 20 });
    }
    return [m];
  }
  const ENV = { sun: null, sunC: [1.12, 0.84, 0.52], amb: [0.5, 0.42, 0.4], sky: [0.2, 0.2, 0.27], fog: [252, 196, 132], fogD: 0.0006 };
  { const v = [-0.55, 0.32, 0.77], l = Math.hypot(...v); ENV.sun = v.map(c => c / l); }
  let buf = null;
  function getBuf(w, h) {
    if (!buf || buf.c.width !== w || buf.c.height !== h) { buf = { c: Sprites.canvas(w, h), key: null }; buf.x = buf.c.getContext('2d'); }
    return buf;
  }
  // Himmel im ewigen Sonnenuntergang, Sonne mit Lichthof und Strahlenkranz (hinter der Stadt)
  function sky(x, W, H, cam, t) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#5c80c0'); g.addColorStop(0.32, '#c8b4b0'); g.addColorStop(0.55, '#fcd28c'); g.addColorStop(0.75, '#fcac60'); g.addColorStop(1, '#f89c58');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const [sx, sy, sz] = project(cam, W, H, cam.x + ENV.sun[0] * 9000, cam.y + ENV.sun[1] * 9000, cam.z + ENV.sun[2] * 9000);
    if (sz > 0) {
      const R = W * 0.6, rg = x.createRadialGradient(sx, sy, 0, sx, sy, R);
      rg.addColorStop(0, 'rgba(255,250,220,0.95)'); rg.addColorStop(0.05, 'rgba(255,236,170,0.8)'); rg.addColorStop(0.25, 'rgba(255,200,120,0.32)'); rg.addColorStop(1, 'rgba(255,190,110,0)');
      x.fillStyle = rg; x.fillRect(0, 0, W, H);
    }
    x.fillStyle = 'rgba(255,240,220,0.22)'; // zarte Wolkenbänder
    for (let i = 0; i < 5; i++) { const y = H * (0.18 + i * 0.07), o = ((t * 0.04 * (i + 1) - cam.yaw * 120 * (i + 1)) % (W * 2) + W * 2) % (W * 2) - W * 0.5; x.fillRect(o, y, W * 0.7, 1 + (i & 1)); x.fillRect(o - W * 1.1, y + 3, W * 0.5, 1); }
    return [sx, sy, sz];
  }
  function rays(x, W, H, sun, t) { // Lichtstrahlen und Glanz über der Stadt (additiv)
    const [sx, sy, sz] = sun;
    if (sz <= 0) return;
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + t * 0.0012, b = a + 0.07 + 0.03 * Math.sin(t * 0.01 + i), L = W * 1.4;
      x.fillStyle = `rgba(255,214,150,${(0.05 + 0.03 * Math.sin(t * 0.013 + i * 1.7)).toFixed(3)})`;
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L); x.lineTo(sx + Math.cos(b) * L, sy + Math.sin(b) * L); x.closePath(); x.fill();
    }
    x.restore();
  }
  // Kamera kreist um die Kathedrale (Laufen dreht die Architektur weg); hoch = Höhe im Raum
  function drawCathedral(ctx, cam, frame, opts = {}) {
    if (!city) city = buildCity();
    const w = View.w, lite = View.lite, W = Math.ceil(w / (lite ? 3 : 2)), H = Math.ceil(208 / (lite ? 3 : 2)), B = getBuf(W, H);
    const room = W_room(), maxY = Math.max(1, room.h * T - 208), climb = 1 - cam.y / maxY;
    const theta = opts.theta ?? (0.55 + cam.x * 0.0011), R = opts.R ?? 780, hgt = opts.hgt ?? (140 + climb * (opts.rise ?? 140));
    const c3 = { x: Math.sin(theta) * R + (opts.cx || 0), y: hgt, z: -Math.cos(theta) * R + (opts.cz || 0), yaw: -theta, pitch: opts.pitch ?? 0.1, f: W * 0.92, near: 6, hy: 0.56 };
    const key = (theta * 600 | 0) + '|' + (hgt | 0) + '|' + (frame >> 3) + '|' + W;
    if (B.key !== key) {
      B.key = key;
      const x = B.x, sun = sky(x, W, H, c3, frame);
      render(x, W, H, city, c3, ENV);
      rays(x, W, H, sun, frame);
      const g = x.createLinearGradient(0, H * 0.62, 0, H); g.addColorStop(0, 'rgba(252,196,132,0)'); g.addColorStop(1, 'rgba(252,186,120,0.55)'); // Dunst über dem Abgrund
      x.fillStyle = g; x.fillRect(0, H * 0.62, W, H * 0.38);
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, W, H, 0, 0, w, 208); ctx.restore();
  }
  const W_room = () => (typeof W !== 'undefined' && W.room) ? W.room : { h: 13 };

  // ---------------- Sonnenturm: Aufstieg rund um einen Zylinder ----------------
  // Der Raum ist der abgewickelte Turmmantel (Breite = Umfang). Die Kamera folgt dem Helden, der Turm dreht sich darunter:
  // jede Bildspalte zeigt die Wand unter dem Winkel asin(dx/R); Vorsprünge sind kleine Kästen mit Seitenflächen,
  // Gegner hinter dem Turm verschwinden. Dahinter kreist die Stadt (eine volle Turmrunde = ein voller Kreis).
  const Tower = (() => {
    let tex = null, texKey = '', shade = null, shadeW = 0;
    const R = (room) => room.w * T / (Math.PI * 2);
    function buildTex(room) {
      const Wd = room.w * T, Hd = room.h * T, c = Sprites.canvas(Wd, Hd), x = c.getContext('2d');
      let s = 77; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
      x.fillStyle = '#c8a874'; x.fillRect(0, 0, Wd, Hd);
      for (let y = 0; y < Hd; y += 12) for (let X = -((y / 12) % 2) * 12; X < Wd; X += 24) { // Quader in warmem Sandstein
        const v = rnd(), base = [214 + v * 20, 186 + v * 18, 138 + v * 16];
        x.fillStyle = `rgb(${base.map(n => n | 0)})`; x.fillRect(X + 1, y + 1, 22, 10);
        x.fillStyle = 'rgba(255,246,220,0.55)'; x.fillRect(X + 1, y + 1, 22, 1);
        x.fillStyle = 'rgba(90,60,30,0.35)'; x.fillRect(X + 1, y + 10, 22, 1);
      }
      for (let X = 0; X < Wd; X += 112) { // Lisenen mit Goldkapitell und hohe Spitzbogenfenster
        const g = x.createLinearGradient(X, 0, X + 14, 0); g.addColorStop(0, '#f0dcb0'); g.addColorStop(0.5, '#d8bc88'); g.addColorStop(1, '#9c7c50');
        x.fillStyle = g; x.fillRect(X, 0, 14, Hd);
        for (let y = 40; y < Hd; y += 192) { x.fillStyle = '#e8b848'; x.fillRect(X - 2, y, 18, 4); x.fillStyle = '#fce890'; x.fillRect(X - 2, y, 18, 1); }
        for (let y = 70; y < Hd - 60; y += 192) {
          const wx = X + 46;
          x.fillStyle = '#2c1c18'; x.fillRect(wx, y + 10, 18, 44); x.beginPath(); x.arc(wx + 9, y + 10, 9, Math.PI, 0); x.fill();
          x.fillStyle = '#fcc86c'; x.fillRect(wx + 8, y + 6, 2, 48); x.fillRect(wx, y + 30, 18, 2); // Maßwerk glüht im Gegenlicht
          x.fillStyle = 'rgba(252,200,108,0.35)'; x.fillRect(wx + 2, y + 12, 5, 16);
        }
      }
      for (let y = 0; y < Hd; y += 192) { x.fillStyle = '#a88858'; x.fillRect(0, y + 186, Wd, 6); x.fillStyle = '#f4e0b0'; x.fillRect(0, y + 186, Wd, 1); } // Gesimse
      return c;
    }
    function shadeFor(w, r) { // Rundung: Ränder dunkel, Glanzlicht links (Sonne), warmes Streiflicht an der Kante
      shadeW = w; shade = Sprites.canvas(w, 1);
      const x = shade.getContext('2d'), cx = w / 2;
      for (let X = 0; X < w; X++) {
        const s = (X + 0.5 - cx) / r; if (Math.abs(s) >= 1) continue;
        const c = Math.sqrt(1 - s * s), lit = Math.max(0, -s * 0.62 + c * 0.78); // Lambert zur Sonne links vorn
        x.fillStyle = `rgba(36,14,30,${Math.min(0.82, 0.12 + 0.78 * (1 - lit) ** 1.6).toFixed(3)})`; x.fillRect(X, 0, 1, 1);
        const spec = Math.max(0, lit - 0.9) * 10; // schmaler Glanzstreifen
        if (spec > 0) { x.fillStyle = `rgba(255,236,190,${(spec * 0.3).toFixed(3)})`; x.fillRect(X, 0, 1, 1); }
        if (s > 0.9) { x.fillStyle = `rgba(255,170,90,${((s - 0.9) * 2.2).toFixed(3)})`; x.fillRect(X, 0, 1, 1); } // Gegenlicht-Saum rechts
      }
    }
    const H0 = 104; // Augenhöhe (Bildmitte): weiter hinten liegende Teile des Mantels rücken perspektivisch zur Mitte
    const persp = (r, c) => { const D = r * 3.2; return D / (D + r * (1 - c)); };
    const wrap = (v, n) => ((v % n) + n) % n;
    // Welt-x → Winkel relativ zur Bildmitte
    function angleOf(room, cam, wx) { const C = room.w * T, rel = wrap(wx - (cam.x + View.w / 2) + C / 2, C) - C / 2; return rel / C * Math.PI * 2; }
    function draw(ctx, room, cam, frame, t) {
      const key = room.w + 'x' + room.h;
      if (!tex || texKey !== key) { tex = buildTex(room); texKey = key; }
      const w = View.w, r = R(room), cx = w / 2, C = room.w * T, camC = cam.x + w / 2;
      if (!shade || shadeW !== w) shadeFor(w, r);
      // Turmmantel: jede Spalte aus der abgewickelten Wand, zum Rand hin perspektivisch gestaucht (Ober- und Unterkante wölben sich)
      const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(w, Math.ceil(cx + r)), Hd = room.h * T;
      ctx.save(); ctx.beginPath();
      for (let X = x0; X < x1; X++) {
        const s = (X + 0.5 - cx) / r; if (Math.abs(s) >= 1) continue;
        const u = wrap(camC + Math.asin(s) / (Math.PI * 2) * C, C), k = persp(r, Math.sqrt(1 - s * s));
        const s0 = Math.max(0, cam.y + H0 - H0 / k), s1 = Math.min(Hd, cam.y + H0 + (208 - H0) / k);
        if (s1 <= s0) continue;
        const d0 = H0 + (s0 - cam.y - H0) * k, dh = (s1 - s0) * k;
        ctx.drawImage(tex, u | 0, s0, 1, s1 - s0, X, d0, 1, dh);
        ctx.rect(X, d0, 1, dh);
      }
      ctx.clip(); ctx.drawImage(shade, 0, 0, w, 1, 0, 0, w, 208); ctx.restore(); // Schattierung nur auf dem Mantel
      // Vorsprünge: Kästen, die aus dem Mantel ragen (Vorderfläche, Seitenfläche zur Mitte, angedeutete Oberseite)
      const g = room.grid, y0 = Math.max(0, Math.floor(cam.y / T) - 2), y1 = Math.min(room.h - 1, Math.floor(cam.y / T) + 16), D = 14, items = [];
      for (let cy = y0; cy <= y1; cy++) for (let cxT = 0; cxT < room.w; cxT++) {
        const ch = g[cy][cxT]; if (ch === '.') continue;
        const a0 = angleOf(room, cam, cxT * T), a1 = a0 + T / C * Math.PI * 2, am = (a0 + a1) / 2;
        if (Math.cos(am) < 0.08) continue;
        items.push([Math.cos(am), ch, cxT, cy, a0, a1]);
      }
      items.sort((a, b) => a[0] - b[0]); // hintere (seitliche) zuerst
      for (const [cm, ch, cxT, cy, a0, a1] of items) {
        const k = persp(r, cm), Y = H0 + (cy * T - cam.y - H0) * k, TH = T * k, img = ch === '/' ? t.up : ch === '\\' ? t.down : ch === '^' ? t.spikes : ch === '=' ? t.alt[(cxT + cy) % 3] : (g[cy - 1] && g[cy - 1][cxT] === ch ? t.ground : t.groundTop)[(cxT * 7 + cy * 3) % 4];
        const fx0 = cx + (r + D) * Math.sin(a0), fx1 = cx + (r + D) * Math.sin(a1);
        const sideA = a0 > 0 ? a0 : a1, sx0 = cx + r * Math.sin(sideA), sx1 = cx + (r + D) * Math.sin(sideA);
        if (Math.abs(sx1 - sx0) > 0.6 && ch !== '/' && ch !== '\\') { // Seitenfläche (zur Bildmitte hin sichtbar)
          ctx.drawImage(img, 0, 0, 2, 16, Math.min(sx0, sx1), Y, Math.abs(sx1 - sx0) + 0.6, TH);
          ctx.fillStyle = 'rgba(40,16,24,0.45)'; ctx.fillRect(Math.min(sx0, sx1), Y, Math.abs(sx1 - sx0) + 0.6, TH);
        }
        const top = Y > H0 ? Math.min(6, (Y - H0) * 0.06) : 0, above = g[cy - 1] && g[cy - 1][cxT];
        if (top > 0.5 && (!above || above === '.')) { ctx.drawImage(img, 0, 0, 16, 2, Math.min(fx0, fx1), Y - top, Math.abs(fx1 - fx0) + 0.6, top); ctx.fillStyle = 'rgba(255,236,190,0.22)'; ctx.fillRect(Math.min(fx0, fx1), Y - top, Math.abs(fx1 - fx0) + 0.6, top); }
        ctx.drawImage(img, Math.min(fx0, fx1), Y, Math.abs(fx1 - fx0) + 0.6, TH);
        const c = Math.cos((a0 + a1) / 2), am = (a0 + a1) / 2, lit = Math.max(0, -Math.sin(am) * 0.62 + c * 0.78); // wie der Mantel beleuchten
        if (lit < 0.95) { ctx.fillStyle = `rgba(30,14,24,${Math.min(0.7, (1 - lit) * 0.75).toFixed(3)})`; ctx.fillRect(Math.min(fx0, fx1), Y, Math.abs(fx1 - fx0) + 0.6, TH); }
      }
    }
    // Figuren auf dem Zylinder: Bildposition berechnen, verdeckt hinter dem Turm → nicht zeichnen
    function place(room, cam, e) {
      const a = angleOf(room, cam, e.cx), c = Math.cos(a);
      if (c < 0.18) return null;
      Tower.k = persp(R(room), c); // vertikale Stauchung an dieser Stelle (für die Figur)
      return View.w / 2 + (R(room) + 12) * Math.sin(a);
    }
    const Tower = { draw, place, angleOf, radius: R, k: 1, H0 };
    return Tower;
  })();

  function drawSpireBg(ctx, cam, frame) { // Stadt kreist um den Turm: Winkel = Position am Umfang
    const room = W_room(), C = room.w * T, a = ((cam.x + View.w / 2) / C) * Math.PI * 2;
    drawCathedral(ctx, cam, frame, { theta: a + 2.2, R: 300, cx: 520, cz: 120, rise: 300, pitch: 0.16 });
  }

  // ---------------- Burghof: Low-Poly-Wald im Mondlicht ----------------
  // Tannen (Stamm + gestufte Kegel) und knorrige tote Bäume (verzweigte Balken) auf einer Ebene, echte Perspektive:
  // ferne Tannen hinter der Burg (band 0), nahe Bäume davor (band 1). Mondlicht von rechts hinten zeichnet die Kanten
  // rötlich-violett nach, dazwischen violetter Dunst. Gerendert in halber Auflösung, weich hochskaliert.
  const FENV = { sun: null, sunC: [0.95, 0.55, 0.95], amb: [0.24, 0.17, 0.32], sky: [0.12, 0.08, 0.2], fog: [58, 28, 88], fogD: 0.0009 };
  { const v = [0.8, 0.5, -0.35], l = Math.hypot(...v); FENV.sun = v.map(c => c / l); }
  let forest = null;
  const fbuf = [null, null];
  function buildForest() {
    let s = 913; const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
    const far = mesh(), near = mesh(), PINE = [50, 84, 86], PINE2 = [66, 100, 96], BARK = [80, 54, 62], DEAD = [64, 42, 68];
    const pine = (m, x, z, k, tiers) => {
      prism(m, x, 0, z, 2.6 * k, 16 * k, 4, BARK, { cap: false });
      for (let t = 0; t < tiers; t++) cone(m, x, (10 + t * 13) * k, z, (17 - t * 4.5) * k, (24 - t * 3) * k, 6, t % 2 ? PINE2 : PINE, { rot: rnd() * 3 });
    };
    const dead = (m, x, z, k) => { // Stamm mit Ästen, die nach oben greifen
      const limb = (x0, y0, z0, a, b, len, w, d) => {
        const x1 = x0 + Math.cos(a) * Math.sin(b) * len, y1 = y0 + Math.cos(b) * len, z1 = z0 + Math.sin(a) * Math.sin(b) * len;
        beam(m, x0, y0, z0, x1, y1, z1, w, w, DEAD);
        if (d > 0) for (let i = 0, n = 2 + (d > 2 && rnd() < 0.4 ? 1 : 0); i < n; i++) limb(x1, y1, z1, a + (i - (n - 1) / 2) * 2.4 + (rnd() - 0.5) * 0.8, Math.min(1.05, b * 0.6 + 0.3 + rnd() * 0.3), len * (0.68 + rnd() * 0.12), w * 0.62, d - 1);
      };
      for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2 + rnd(); beam(m, x, 3 * k, z, x + Math.cos(a) * 14 * k, 0, z + Math.sin(a) * 14 * k, 3.4 * k, 3 * k, BARK); } // Wurzeln
      limb(x, 0, z, rnd() * 6, 0.08 + rnd() * 0.1, 42 * k, 10 * k, 4);
    };
    for (let i = 0; i < 70; i++) pine(far, -900 + rnd() * 4200, 820 + rnd() * 520, 2.1 + rnd() * 1.4, 3);
    for (let i = 0; i < 26; i++) pine(near, -700 + rnd() * 3800, 430 + rnd() * 260, 1.4 + rnd() * 0.8, 3);
    for (let i = 0; i < 9; i++) dead(near, -400 + i * 400 + rnd() * 160, 330 + rnd() * 40, 1.15 + rnd() * 0.35);
    return [[far], [near]];
  }
  function drawForest(ctx, cam, frame, band) {
    if (!forest) forest = buildForest();
    const w = View.w, lite = View.lite, dv = lite ? 3 : 2, Wb = Math.ceil(w / dv), Hb = Math.ceil(208 / dv);
    let B = fbuf[band];
    if (!B || B.c.width !== Wb) { B = fbuf[band] = { c: Sprites.canvas(Wb, Hb), key: null }; B.x = B.c.getContext('2d'); }
    const camX = cam.x + w / 2, key = Math.round(cam.x / (lite ? 3 : 2)) + '|' + Wb;
    if (B.key !== key) {
      B.key = key; B.x.clearRect(0, 0, Wb, Hb);
      render(B.x, Wb, Hb, forest[band], { x: camX, y: 118, z: 0, yaw: 0, pitch: 0, f: 200 / dv, near: 20, hy: 0.62 }, FENV);
    }
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, Wb, Hb, 0, 0, w, 208); ctx.restore();
  }

  // ---------------- Schiff: Polygon-Meer und Krakenarme im PS2-Look ----------------
  // Statt Voxel-Spalten ein facettiertes Dreiecksnetz, das an der Kamera hängt (Zeilen in die Tiefe, Spalten bis über
  // den Bildrand): flach schattierte Dreiecke, Himmelslicht von oben, Glanzlichter vom Mond (Blinn), türkis durch-
  // scheinende Kämme, Schaumkronen, Tiefendunst. Die Fangarme sind echte Röhren aus Polygonringen (Saugnäpfe unten),
  // nach Tiefe mit den Wellen verschränkt gezeichnet. Halbe Auflösung, weich hochskaliert.
  const SEA = { H: 84, HOR: 41, F: 60, CAM: 30, Z0: 22, Z1: 420 };
  const SC = { deep: [8, 16, 48], mid: [26, 44, 104], hi: [80, 104, 186], foam: [208, 222, 252], fog: [42, 40, 88], moon: [255, 232, 238], teal: [40, 124, 152] };
  const TCL = { d: [40, 10, 56], m: [104, 40, 128], l: [168, 92, 196], k: [240, 190, 226], kc: [120, 36, 86] };
  const nrm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const LM = nrm([0.32, 0.4, 0.86]), LT = nrm([0.6, 0.8, -0.3]), HT = nrm([LT[0], LT[1] + 0.3, LT[2] - 1]);
  let seaBuf = null, seaPerf = 0, seaSlow = 0, seaLo = false;
  function seaH(u, z, t, A, rv, AR) {
    const s = (Math.sin(z * 0.045 + t * 0.035 + Math.sin(u * 0.012 + z * 0.004) * 1.2) + 1) * 0.5, s3 = s * s * s;
    let h = s3 * A + Math.sin(u * 0.06 + z * 0.03 - t * 0.05) * 3 + Math.sin(u * 0.11 - z * 0.07 + t * 0.08) * 1.5;
    if (AR) { const d = z - rv, q = d / (d < 0 ? 8 : 22); h += Math.exp(-q * q) * (0.8 + 0.2 * Math.cos(u * 0.02 + t * 0.01)) * AR; }
    return h;
  }
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const depthFog = (z) => Math.min(1, (z - SEA.Z0) / (SEA.Z1 - SEA.Z0) * 1.25);
  // Fangarme: dieselbe Bahn wie bisher (auftauchen, schwanken, zuschlagen, versinken), aber als Röhre aus M-Ecken-Ringen
  function tentaclePolys(k, t, fx, F, Wb, HOR, CAM, out) {
    const r = Math.min(1, k.t / 90), rise = r * r * (3 - 2 * r), ts = k.sw !== undefined ? k.sw : k.t;
    const a = k.t > 330 ? Math.min(1, (k.t - 330) / 34) : 0, ang = a * a * 1.45, sink = k.t > 370 ? (k.t - 370) / 50 : 0;
    const N = View.lite ? 12 : 16, M = 6, q = F / fx; // x in isotropen Einheiten (Bildschirmmaß wie die Höhe)
    const proj = (X, Y, Z) => [Wb / 2 + X * F / Z, HOR + (CAM - Y) * F / Z];
    for (const arm of k.arms) {
      const P = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N, h = s * arm.len * rise;
        const du = Math.sin(s * 3.2 + ts * 0.045 + arm.ph) * 10 * s + (s > 0.65 ? Math.sin(ts * 0.07 + arm.ph) * (s - 0.65) * 36 : 0);
        const dz = Math.cos(s * 2 + ts * 0.03 + arm.ph) * 6 * s;
        P.push([(arm.u + du) / q, h * Math.cos(ang) - sink * arm.len, Math.max(SEA.Z0, arm.z + dz - h * Math.sin(ang)), (1 - s * 0.85) * 6 + 1]);
      }
      const rings = [];
      for (let i = 0; i <= N; i++) {
        const p = P[i], A2 = P[Math.max(0, i - 1)], B2 = P[Math.min(N, i + 1)];
        const T2 = nrm([B2[0] - A2[0], B2[1] - A2[1], B2[2] - A2[2]]);
        let S = nrm([T2[1], -T2[0], 0]); if (!isFinite(S[0]) || (S[0] === 0 && S[1] === 0)) S = [1, 0, 0];
        const D = nrm([S[1] * T2[2] - S[2] * T2[1], S[2] * T2[0] - S[0] * T2[2], S[0] * T2[1] - S[1] * T2[0]]);
        const ring = [];
        for (let m = 0; m < M; m++) {
          const th = m / M * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
          const n = [S[0] * c + D[0] * sn, S[1] * c + D[1] * sn, S[2] * c + D[2] * sn];
          ring.push({ x: p[0] + n[0] * p[3], y: p[1] + n[1] * p[3], z: p[2] + n[2] * p[3], n });
        }
        rings.push(ring);
      }
      for (let i = 0; i < N; i++) for (let m = 0; m < M; m++) {
        const v = [rings[i][m], rings[i][(m + 1) % M], rings[i + 1][(m + 1) % M], rings[i + 1][m]];
        const n = nrm([v[0].n[0] + v[1].n[0] + v[2].n[0] + v[3].n[0], v[0].n[1] + v[1].n[1] + v[2].n[1] + v[3].n[1], v[0].n[2] + v[1].n[2] + v[2].n[2] + v[3].n[2]]);
        const cx = (v[0].x + v[2].x) / 2, cy = (v[0].y + v[2].y) / 2, cz = (v[0].z + v[2].z) / 2;
        if (n[0] * -cx + n[1] * (CAM - cy) + n[2] * -cz <= 0) continue; // Rückseite
        if (v.some(w2 => w2.z < 4)) continue;
        const pts = []; for (const w2 of v) pts.push(...proj(w2.x, w2.y, w2.z));
        const dl = n[0] * LT[0] + n[1] * LT[1] + n[2] * LT[2];
        let col = dl > 0.55 ? mixc(TCL.m, TCL.l, (dl - 0.55) / 0.45) : dl > -0.2 ? mixc(TCL.d, TCL.m, (dl + 0.2) / 0.75) : TCL.d;
        if (i % 3 === 0 && i < N * 0.72 && (m === 3 || m === 4)) col = m === 3 ? TCL.k : TCL.kc; // Saugnäpfe an der Unterseite
        const sp = Math.max(0, n[0] * HT[0] + n[1] * HT[1] + n[2] * HT[2]) ** 18;                    // nasser Glanz
        out.push({ z: cz, pts, col: [col[0] + 220 * sp, col[1] + 200 * sp, col[2] + 230 * sp], fog: depthFog(cz) });
      }
      if (rise > 0.3 && sink < 0.6) { // Schaumkranz, wo der Arm aus dem Wasser bricht
        const b = P[0], R = b[3] * 2.4;
        for (let m = 0; m < 7; m++) {
          const a0 = m / 7 * Math.PI * 2 + t * 0.05, a1 = a0 + 0.75, hh = 2 + ((m + (t >> 3)) % 3);
          const z0 = Math.max(SEA.Z0, b[2] + Math.sin(a0) * R * 0.5), z1 = Math.max(SEA.Z0, b[2] + Math.sin(a1) * R * 0.5), zz = (z0 + z1) / 2 - 1;
          out.push({ z: zz, pts: [...proj(b[0] + Math.cos(a0) * R, 0.5, z0), ...proj(b[0] + Math.cos(a1) * R, 0.5, z1), ...proj(b[0] + (Math.cos(a0) + Math.cos(a1)) * R / 2, hh, zz)], col: SC.foam, fog: depthFog(zz) });
        }
      }
    }
  }
  const cssCache = new Map();
  const cssQ = (r, g, b) => { // Farbe quantisiert (PS2-Flächen, weniger Füllwechsel), Zeichenkette zwischengespeichert
    r = Math.min(255, Math.max(0, r)) & 0xf8; g = Math.min(255, Math.max(0, g)) & 0xf8; b = Math.min(255, Math.max(0, b)) & 0xf8;
    const k = (r << 16) | (g << 8) | b;
    let c = cssCache.get(k); if (!c) { c = `rgb(${r},${g},${b})`; cssCache.set(k, c); }
    return c;
  };
  function drawSea(ctx, w, t, o = {}) {
    const TOP = 48, t0 = performance.now(), lo = View.lite || seaLo, Wb = Math.ceil(w / 2), Hb = SEA.H + TOP, HY = o.horizon || 122; // TOP: Luft über dem Meer für hohe Fangarme
    if (!seaBuf || seaBuf.c.width !== Wb) { seaBuf = { c: Sprites.canvas(Wb, Hb) }; seaBuf.x = seaBuf.c.getContext('2d'); }
    const x = seaBuf.x; x.clearRect(0, 0, Wb, Hb);
    const calm = o.calm === undefined ? 1 : o.calm, A = 30 * (0.3 + 0.7 * calm), light = o.flash ? 1.6 : 1;
    const CAM = SEA.CAM + (o.lift || 0), F = SEA.F, HOR = SEA.HOR + TOP, fx = Wb / (2 * 0.95), q = F / fx;
    const rv = o.rogue || 0, AR = rv ? 80 * Math.sqrt(Math.max(0, 1 - rv / 430)) : 0, u0 = (o.camX || 0) * 0.06 + (o.sail || 0) * 0.8;
    const NC = lo ? 18 : 30, zs = [];
    for (let z = SEA.Z0; z < SEA.Z1; z = z * (lo ? 1.22 : 1.14) + 0.5) zs.push(z);
    zs.push(SEA.Z1);
    const NR = zs.length, NV = NC + 1, n = NR * NV;
    if (!seaBuf.VX || seaBuf.VX.length !== n) { seaBuf.VX = new Float32Array(n); seaBuf.VY = new Float32Array(n); seaBuf.SX = new Float32Array(n); seaBuf.SY = new Float32Array(n); }
    const VX = seaBuf.VX, VY = seaBuf.VY, SX = seaBuf.SX, SY = seaBuf.SY;
    for (let r = 0; r < NR; r++) {
      const z = zs[r];
      for (let c = 0; c <= NC; c++) { const xr = (c / NC * 2 - 1) * 1.1 * z, i = r * NV + c; VX[i] = xr; VY[i] = seaH(u0 + xr, z, t, A, rv, AR); SX[i] = Wb / 2 + xr * fx / z; SY[i] = HOR + (CAM - VY[i]) * F / z; }
    }
    x.fillStyle = cssQ(SC.fog[0] * light, SC.fog[1] * light, SC.fog[2] * light); x.fillRect(0, HOR, Wb, Hb - HOR); // Dunst bis zum Horizont
    x.fillStyle = `rgba(226,200,222,${(0.35 * light).toFixed(2)})`; x.fillRect(0, HOR, Wb, 1);
    const tp = [];
    if (o.kraken && o.kraken.t >= 0) tentaclePolys(o.kraken, t, fx, F, Wb, HOR, CAM, tp);
    tp.sort((a, b) => b.z - a.z);
    let ti = 0;
    x.lineWidth = 0.7; x.lineJoin = 'round';
    const fillOne = (pts, col, fog) => {
      const css = cssQ((col[0] + (SC.fog[0] - col[0]) * fog) * light, (col[1] + (SC.fog[1] - col[1]) * fog) * light, (col[2] + (SC.fog[2] - col[2]) * fog) * light);
      x.fillStyle = css; x.strokeStyle = css; x.beginPath(); x.moveTo(pts[0], pts[1]);
      for (let k = 2; k < pts.length; k += 2) x.lineTo(pts[k], pts[k + 1]);
      x.closePath(); x.fill(); x.stroke();
    };
    const [D0, D1, D2] = SC.deep, [M0, M1, M2] = SC.mid, [H0c, H1c, H2c] = SC.hi, [T0, T1, T2] = SC.teal, [F0, F1, F2] = SC.foam, [G0, G1, G2] = SC.fog, [O0, O1, O2] = SC.moon;
    const rowPaths = new Map();
    for (let r = NR - 2; r >= 0; r--) { // von hinten nach vorn; Krakenarme nach Tiefe dazwischen
      const za = zs[r], zb = zs[r + 1], zm = (za + zb) / 2, fog = depthFog(zm), dz = zb - za;
      while (ti < tp.length && tp[ti].z >= zm) { const p = tp[ti++]; fillOne(p.pts, p.col, p.fog); }
      rowPaths.clear();
      for (let c = 0; c < NC; c++) {
        const a = r * NV + c, b = a + 1, d = (r + 1) * NV + c, e = d + 1;
        if (Math.max(SY[a], SY[b], SY[d], SY[e]) < 0 || Math.min(SX[a], SX[d]) > Wb || Math.max(SX[b], SX[e]) < 0) continue;
        // Viereck-Normale aus den Diagonalen (x isotrop), nach oben gerichtet
        const ux = (VX[e] - VX[a]) / q, uy = VY[e] - VY[a], uz = dz, vx = (VX[d] - VX[b]) / q, vy = VY[d] - VY[b], vz = dz;
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl; if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        const px = VX[a] / q, py = VY[a], pz = za;
        let vX = -px, vY = CAM - py, vZ = -pz; const vl = Math.hypot(vX, vY, vZ) || 1; vX /= vl; vY /= vl; vZ /= vl;
        let hx = LM[0] + vX, hy = LM[1] + vY, hz = LM[2] + vZ; const hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
        const ndl = nx * LM[0] + ny * LM[1] + nz * LM[2], nv = Math.max(0, nx * vX + ny * vY + nz * vZ), fres = (1 - nv) * (1 - nv) * (1 - nv);
        const hAvg = (VY[a] + VY[b] + VY[d] + VY[e]) / 4, crest = Math.max(0, Math.min(1, (hAvg - A * 0.4) / (A * 0.6 + AR * 0.5 + 1)));
        let k = Math.max(0, Math.min(1, 0.05 + ny * 0.3 + fres * 0.45 + crest * 0.35));
        let R = D0 + (M0 - D0) * k, G = D1 + (M1 - D1) * k, B = D2 + (M2 - D2) * k;
        k = Math.max(0, ndl) * crest * 0.5; R += (H0c - R) * k; G += (H1c - G) * k; B += (H2c - B) * k;
        if (crest > 0.62 && ndl < 0.25) { k = Math.min(0.45, (crest - 0.62) * 1.2); R += (T0 - R) * k; G += (T1 - G) * k; B += (T2 - B) * k; } // Licht scheint durch dünne Kämme
        if (crest > 0.93 && fog < 0.6) { k = Math.min(0.85, (crest - 0.93) / 0.07); R += (F0 - R) * k; G += (F1 - G) * k; B += (F2 - B) * k; }              // Schaumkronen
        const sd = Math.max(0, nx * hx + ny * hy + nz * hz), sp = sd > 0.9 ? Math.pow(sd, 60) * 1.5 : 0;                                  // Mondglanz
        R += O0 * sp; G += O1 * sp; B += O2 * sp;
        R += (G0 - R) * fog; G += (G1 - G) * fog; B += (G2 - B) * fog;
        const css = cssQ(R * light, G * light, B * light);
        let pth = rowPaths.get(css); if (!pth) { pth = new Path2D(); rowPaths.set(css, pth); }
        pth.moveTo(SX[a], SY[a]); pth.lineTo(SX[b], SY[b]); pth.lineTo(SX[e], SY[e]); pth.lineTo(SX[d], SY[d]); pth.closePath();
      }
      for (const [css, pth] of rowPaths) { x.fillStyle = css; x.strokeStyle = css; x.fill(pth); x.stroke(pth); }
    }
    while (ti < tp.length) { const p = tp[ti++]; fillOne(p.pts, p.col, p.fog); }
    ctx.save(); ctx.imageSmoothingEnabled = true;
    ctx.drawImage(seaBuf.c, 0, 0, Wb, Hb, 0, HY - HOR * 2, Wb * 2, Hb * 2); // HOR enthält TOP: Oberkante liegt TOP höher
    ctx.restore();
    if (!seaLo && !View.lite) { // dauerhaft zu teuer: gröberes Netz
      seaPerf = seaPerf * 0.95 + (performance.now() - t0) * 0.05;
      if (seaPerf > 6) { if (++seaSlow > 120) { seaLo = true; console.info('[NACHTMAHR] Meer: gröberes Netz'); } } else seaSlow = 0;
    }
  }

  const prewarm = () => { if (!city) city = buildCity(); };
  return { mesh, box, prism, cone, gable, beam, render, project, drawCathedral, drawSpireBg, drawForest, drawSea, Tower, ENV, prewarm };
})();
