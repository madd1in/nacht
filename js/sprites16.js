// 16-Bit-Sprites für Fledermäuse, fliegende Schädel, Gespenster und die Stoppuhr (ersetzen die 8-Bit-Versionen).
'use strict';

(() => {
  const S = Sprites.S, cl = (v, a, b) => Math.max(a, Math.min(b, v));
  function pad(w, h) {
    const c = Sprites.canvas(w, h), x = c.getContext('2d');
    const P = (px, py, col) => { x.fillStyle = col; x.fillRect(Math.floor(px), Math.floor(py), 1, 1); };
    const shade = (l, ramp) => ramp[Math.round(cl((l + 0.3) / 1.45, 0, 1) * (ramp.length - 1))];
    const disc = (cx, cy, rx, ry, ramp, bias = 0) => {
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
        const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry, q = nx * nx + ny * ny;
        if (q <= 1) P(px, py, shade(-nx * 0.55 - ny * 0.6 + Math.sqrt(1 - q) * 0.7 + bias, ramp));
      }
    };
    const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
    const line = (x0, y0, x1, y1, col) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5); for (let i = 0; i <= n; i++) P(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col); };
    const hard = () => { const img = x.getImageData(0, 0, w, h), d = img.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0; x.putImageData(img, 0, 0); };
    return { c, x, P, disc, poly, line, hard, shade };
  }

  // ---------------- Fledermaus: 6 Flügelschlag-Phasen + hängend ----------------
  // Flughaut mit drei Fingerknochen und ausgezacktem Hinterrand, Daumenkralle, Fell mit Glanz, rosa Ohren, glühende Augen, Fangzähne
  const FUR = ['#140a14', '#2c1428', '#4a2440', '#6c3c5c', '#946080'];
  const WING = ['#1c0c1c', '#3c1838', '#5c2850', '#7c3c68', '#a05888'];
  function bat(ph) {
    const G = pad(30, 20), cx = 14.5, cy = 9, lift = Math.cos(ph * Math.PI * 2);
    [-1, 1].forEach(side => {
      const sx = cx + side * 2, sy = cy - 1, wx = cx + side * 8, wy = cy - 1 - lift * 5;
      const tips = [[14, -lift * 7 - 2], [14.5, -lift * 2.5 + 2], [10.5, -lift * 0.5 + 6.5]].map(([dx, dy]) => [cx + side * dx, cy + dy]);
      G.poly([[sx, sy], [wx, wy], tips[0], tips[1], tips[2], [cx + side * 2, cy + 5]], WING[1]);
      G.poly([[wx, wy], tips[0], tips[1]], WING[2]);
      G.poly([[wx, wy], tips[1], tips[2]], lift > 0 ? WING[2] : WING[1]);
      for (let k = 0; k < 2; k++) { const [ax, ay] = tips[k], [bx, by] = tips[k + 1]; G.x.clearRect(Math.floor((ax + bx) / 2 - side * 1.6), Math.floor((ay + by) / 2 + 0.4), 2, 2); } // Bögen im Hinterrand
      G.line(sx, sy, wx, wy, WING[4]); tips.forEach(t => G.line(wx, wy, t[0], t[1], WING[3]));
      G.P(wx + side * 0.5, wy - 1.5, WING[4]); // Daumenkralle
    });
    G.hard();
    G.disc(cx, cy + 2.5, 3.2, 4.4, FUR); G.disc(cx, cy - 2.4, 2.8, 2.6, FUR, 0.1);
    G.P(cx - 2.5, cy - 5, FUR[3]); G.P(cx - 2.5, cy - 6, FUR[4]); G.P(cx + 2.5, cy - 5, FUR[3]); G.P(cx + 2.5, cy - 6, FUR[4]); // Ohren
    G.P(cx - 2.5, cy - 4, '#d07090'); G.P(cx + 2.5, cy - 4, '#d07090');
    G.P(cx - 1.5, cy - 2, '#fc3c3c'); G.P(cx + 1.5, cy - 2, '#fc3c3c'); G.P(cx - 1.5, cy - 3, '#fcc0c0'); // Augen
    G.P(cx - 0.5, cy, '#fcfcfc'); G.P(cx + 0.5, cy, '#fcfcfc'); // Fangzähne
    G.P(cx - 1.5, cy + 7, FUR[1]); G.P(cx + 1.5, cy + 7, FUR[1]); // Krallenfüße
    return Sprites.fromCanvas(G.c);
  }
  function batPerch() {
    const G = pad(30, 20), cx = 14.5;
    G.disc(cx, 9, 4.6, 7.5, WING, -0.1); // eingefaltete Flügel
    for (const k of [-1, 1]) G.line(cx + k * 3.5, 3, cx + k * 1.5, 15, WING[3]);
    G.disc(cx, 11, 2.6, 4, FUR, 0.1);
    G.P(cx - 1.5, 14, '#fc3c3c'); G.P(cx + 1.5, 14, '#fc3c3c'); // kopfüber: Augen unten
    G.P(cx - 2.5, 17, FUR[3]); G.P(cx + 2.5, 17, FUR[3]); G.P(cx - 2.5, 16, '#d07090'); G.P(cx + 2.5, 16, '#d07090');
    G.P(cx - 1.5, 1, FUR[2]); G.P(cx + 1.5, 1, FUR[2]); G.P(cx - 0.5, 0, FUR[3]); // Krallen am Gewölbe
    return Sprites.fromCanvas(G.c);
  }
  S.bat = { fly: [0, 1, 2, 3, 4, 5].map(i => bat(i / 6)), perch: batPerch() };

  // ---------------- Fledermaus im PS1-Look ----------------
  // Ein Low-Poly-Modell (Oktaeder-Leib, Kopf mit Ohren, Flughäute mit drei Fingerknochen) wird in 16 Flügelschlag-Phasen
  // vorgerendert – flach schattiert vom Mondlicht, leicht von oben und schräg vorn gesehen. Die Flügel verkürzen sich
  // perspektivisch, wenn sie auf den Betrachter zeigen, der hintere Flügel liegt hinter dem Leib.
  (function bat3d() {
    const W = 40, H = 32, tilt = 0.42, yaw = 0.62;
    const rot = ([x, y, z]) => {
      const x1 = x * Math.cos(yaw) + z * Math.sin(yaw), z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
      return [x1, y * Math.cos(tilt) - z1 * Math.sin(tilt), y * Math.sin(tilt) + z1 * Math.cos(tilt)];
    };
    const norm = v => { const l = Math.hypot(...v) || 1; return v.map(a => a / l); };
    const Lt = norm([-0.35, -0.8, 0.55]);
    const MEM = [[20, 8, 28], [44, 18, 58], [72, 32, 92], [104, 52, 124], [140, 84, 160]], FUR = [[14, 8, 12], [34, 20, 28], [58, 36, 46], [86, 60, 70], [120, 92, 100]];
    function frame(phi, fold) {
      const c = Sprites.canvas(W, H), x = c.getContext('2d'), polys = [];
      const add = (pts, ramp, bias = 0) => { const P = pts.map(rot); polys.push({ P, ramp, bias, z: P.reduce((a, p) => a + p[2], 0) / P.length }); };
      const v = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
      // Leib (Oktaeder) und Kopf mit Ohren, Blick nach +x
      const F = [5, 0, 0], B = [-6, 1, 0], T = [0, -2.6, 0], D = [0, 2.8, 0], N = [0, 0, 2.6], R = [0, 0, -2.6];
      [[F, T, N], [F, N, D], [F, D, R], [F, R, T], [B, N, T], [B, D, N], [B, R, D], [B, T, R]].forEach(t => add(t, FUR));
      const HT = [9, -1.2, 0];
      add([F, HT, [6, -2.4, 1.2]], FUR, 0.1); add([F, HT, [6, -2.4, -1.2]], FUR); add([F, HT, [6.5, 0.8, 0]], FUR, -0.1);
      add([[6, -2.4, 1.2], [7.6, -6.5, 1.6], [8, -2, 0.6]], FUR, 0.15); add([[6, -2.4, -1.2], [7.6, -6.5, -1.6], [8, -2, -0.6]], FUR); // Ohren
      // Flügel: Richtung aus dem Schlagwinkel, Arm – Handgelenk – drei Finger, Flughaut dazwischen
      for (const sd of [1, -1]) {
        const dir = fold ? [0, 0.95, sd * 0.3] : [0, -Math.sin(phi), sd * Math.cos(phi)];
        const len = fold ? 0.45 : 1;
        const rF = [2.5, -1, sd * 1.8], rB = [-4, -0.5, sd * 1.6];
        const wrist = v([2, -1, sd * 1.8], dir, 10 * len), f1 = v(v(wrist, dir, 6 * len), [1, 0, 0], 3.5), f2 = v(v(wrist, dir, 7 * len), [1, 0, 0], -2.5), f3 = v(v(wrist, dir, 5 * len), [1, 0, 0], -7);
        const s1 = v(v(wrist, dir, 3.5 * len), [1, 0, 0], 0.5), s2 = v(v(wrist, dir, 3.5 * len), [1, 0, 0], -4.5);
        add([rF, wrist, f3, rB], MEM); add([wrist, f1, s1], MEM, 0.05); add([wrist, s1, f2], MEM); add([wrist, f2, s2], MEM, -0.03); add([wrist, s2, f3], MEM);
        polys.push({ bone: [rF, wrist, f1, f2, f3].map(rot), z: rot(wrist)[2] + 0.01 });
      }
      polys.sort((a, b) => a.z - b.z);
      const cx = W / 2 - 1, cy = H / 2;
      for (const p of polys) {
        if (p.bone) { // Fingerknochen und Arm hell
          const [a, w, ...fs] = p.bone; x.strokeStyle = 'rgb(150,110,150)'; x.lineWidth = 1;
          x.beginPath(); x.moveTo(cx + a[0], cy + a[1]); x.lineTo(cx + w[0], cy + w[1]); fs.forEach(f => { x.moveTo(cx + w[0], cy + w[1]); x.lineTo(cx + f[0], cy + f[1]); }); x.stroke();
          continue;
        }
        const [a, b, c2] = p.P, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]];
        let n = norm([u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]]); if (n[2] < 0) n = n.map(q => -q);
        const lum = Math.max(0, Math.min(0.999, Math.max(0, n[0] * Lt[0] + n[1] * Lt[1] + n[2] * Lt[2]) * 0.85 + 0.12 + p.bias)), col = p.ramp[Math.floor(lum * p.ramp.length)];
        x.fillStyle = `rgb(${col.join(',')})`; x.beginPath(); p.P.forEach(([px2, py2], i) => i ? x.lineTo(cx + px2, cy + py2) : x.moveTo(cx + px2, cy + py2)); x.closePath(); x.fill();
      }
      const eye = rot([7.8, -1.3, 1]); x.fillStyle = '#fc2020'; x.fillRect(Math.round(cx + eye[0]), Math.round(cy + eye[1]), 1, 1); // rotes Auge
      const img = x.getImageData(0, 0, W, H), d = img.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] < 100 ? 0 : 255; x.putImageData(img, 0, 0);
      return Sprites.fromCanvas(c);
    }
    const fly = Array.from({ length: 16 }, (_, i) => frame(0.2 + 0.95 * Math.sin(i / 16 * Math.PI * 2), false));
    // hängend: Flügel angelegt, kopfüber
    const pc = frame(0, true), hang = Sprites.canvas(pc.c.width, pc.c.height), hx = hang.getContext('2d');
    hx.translate(pc.c.width / 2, pc.c.height / 2); hx.rotate(Math.PI / 2); hx.drawImage(pc.c, -pc.c.width / 2, -pc.c.height / 2);
    S.bat3d = { fly, perch: Sprites.fromCanvas(hang, false) };
  })();

  // ---------------- Fliegender Schädel: Feuerschweif in vier Phasen, glühende Augen, klappernder Kiefer, Haarrisse ----------------
  const BONE = ['#3c3428', '#7c7058', '#b4a888', '#dcd4b8', '#fcfcf0'];
  const FIRE = ['#881400', '#d82800', '#f87800', '#f8b800', '#fcf0a0'];
  function skull(f) {
    const G = pad(24, 18), open = f % 2;
    for (let i = 0; i < 9; i++) { // Flammenschweif nach hinten links, züngelnd
      const fx = 1 + i * 1.1, len = 5 - i * 0.45, fy = 8 + Math.sin(i * 1.3 + f * 1.6) * 2.2;
      G.disc(fx + 2, fy, Math.max(0.8, len * 0.6), Math.max(0.8, len * 0.5), FIRE.slice(0, 3 + (i > 5 ? 2 : 1)), 0.3);
    }
    G.disc(13.5, 7.5, 6.6, 6.2, BONE); // Schädeldecke
    G.disc(15, 12.5 + open, 4.4, 2.4, BONE, -0.15); // Kiefer
    G.disc(11.6, 8, 1.9, 2.1, ['#0c0806', '#140c0a', '#1c140e']); G.disc(16.2, 8, 1.9, 2.1, ['#0c0806', '#140c0a', '#1c140e']); // Augenhöhlen
    G.P(11.5, 8, '#fc2020'); G.P(16, 8, '#fc2020'); G.P(11.5, 7, '#fca0a0'); G.P(16, 7, '#fca0a0'); // glühende Augen
    G.P(14, 10, '#2c241c'); G.P(14, 11, '#2c241c'); // Nasenloch
    for (let k = 11; k <= 17; k++) { G.P(k, 12 + open, k % 2 ? BONE[4] : '#2c241c'); if (open) G.P(k, 13 + open, k % 2 ? '#2c241c' : BONE[3]); } // Zähne
    G.P(9, 3, BONE[1]); G.P(10, 4, BONE[1]); G.P(10, 5, BONE[1]); G.P(17, 2, BONE[1]); // Haarrisse
    return Sprites.fromCanvas(G.c);
  }
  S.skull = [0, 1, 2, 3].map(skull);

  // ---------------- Wassermann: schuppige Haut, Rückenflossen, Glupschaugen, Kiemen, Schwimmhäute ----------------
  const SCALE = ['#0c2418', '#14402c', '#1c6040', '#2c8058', '#48a878'], BELLY = ['#5c6c38', '#8c9c58', '#c0cc88'], FINC = ['#5c1010', '#a82818', '#e85030'];
  function fishman(pose) { // pose: 0/1 Gang, 2 Sprung, 3 Feuerspucken
    const G = pad(22, 30), cx = 10;
    const legs = pose === 2 ? [[8, 23, 6, 25], [12, 23, 14, 25]] : pose === 1 ? [[9, 22, 9, 28], [12, 22, 12, 28]] : [[8, 22, 6, 28], [12, 22, 15, 28]];
    legs.forEach(([x0, y0, x1, y1]) => { for (let k = 0; k < 3; k++) G.line(x0 + k * 0.5, y0, x1 + k * 0.5, y1, SCALE[1 + k]); G.line(x1 - 1, y1, x1 + 2.5, y1, SCALE[3]); G.P(x1 + 2.5, y1 - 1, FINC[1]); }); // Beine mit Schwimmfüßen
    for (let k = 0; k < 6; k++) G.line(4, 9 + k * 2, 2 - (k % 2), 10 + k * 2, FINC[k % 2 ? 1 : 2]); // Rückenflosse
    G.disc(cx, 16, 5.4, 7, SCALE); G.disc(cx + 1.5, 17, 2.6, 5, BELLY, 0.2); // Rumpf, heller Bauch
    for (let y = 11; y < 22; y += 2) for (let x = 6; x < 13; x += 3) G.P(x + (y % 4 ? 1 : 0), y, SCALE[1]); // Schuppen
    const arm = pose === 2 ? [[13, 12], [18, 6]] : pose === 3 ? [[13, 13], [18, 13]] : [[13, 13], [17, 18]];
    G.line(arm[0][0], arm[0][1], arm[1][0], arm[1][1], SCALE[3]); G.line(arm[0][0], arm[0][1] + 1, arm[1][0], arm[1][1] + 1, SCALE[2]);
    G.P(arm[1][0] + 1, arm[1][1], SCALE[4]); G.P(arm[1][0] + 1, arm[1][1] + 1, SCALE[2]); G.P(arm[1][0], arm[1][1] + 2, SCALE[2]); // Schwimmhand
    G.disc(cx + 1, 6, 5, 4.6, SCALE, 0.1); // Kopf
    for (let k = 0; k < 5; k++) G.P(cx - 3 + k * 1.5, 1.5 - (k % 2), FINC[1 + (k % 2)]); G.line(cx - 3, 2.5, cx + 3, 1.5, FINC[0]); // Kopfkamm
    G.disc(cx + 3, 5, 1.8, 1.8, ['#c8a000', '#f8d800', '#fcf080']); G.P(cx + 3.5, 5, '#000'); G.P(cx + 2.5, 4, '#fcfcfc'); // Glupschauge
    for (let k = 0; k < 3; k++) G.P(cx - 2.5, 7 + k, SCALE[0]); // Kiemen
    if (pose === 3) { G.disc(cx + 4.5, 9, 1.6, 1.4, ['#881400', '#d82800', '#f87800']); G.P(cx + 3, 8, '#fcfcfc'); G.P(cx + 5, 10, '#fcfcfc'); } // Maul offen, Feuer
    else { G.line(cx + 1, 8.5, cx + 5.5, 8.5, SCALE[0]); G.P(cx + 3, 9, '#fcfcfc'); G.P(cx + 5, 9, '#fcfcfc'); } // Maul mit Zähnen
    return Sprites.fromCanvas(G.c);
  }
  if (!S.rig3d) { S.fish = [fishman(0), fishman(1), fishman(2)]; S.fishShoot = fishman(3); } // 3D-Fischmensch (aus dem Rig) schon geladen: nicht überschreiben

  // ---------------- Gespenst ----------------
  const GH = ['#2c3c6c', '#5c74ac', '#94acdc', '#c8d8f4', '#f4f8fc'];
  function ghost(ph) {
    const G = pad(20, 22);
    for (let y = 0; y < 22; y++) for (let X = 0; X < 20; X++) {
      const cx = 10 + Math.sin(y * 0.35 + ph) * (y > 10 ? 1.5 : 0), w = y < 9 ? Math.sqrt(Math.max(0, 49 - (8 - y) ** 2)) : 7 - (y - 9) * 0.35;
      const edge = y > 15 && Math.sin(X * 1.6 + ph * 2) > 0.35; // zerfaserte Fetzen
      if (Math.abs(X + 0.5 - cx) > w || edge) continue;
      const nx = (X + 0.5 - cx) / Math.max(1, w);
      G.P(X, y, G.shade(-nx * 0.5 + Math.sqrt(Math.max(0, 1 - nx * nx)) * 0.6 - y * 0.03 + 0.25, GH));
    }
    G.disc(7.5, 8, 1.6, 2.2, ['#06081c', '#0c1030', '#141a40']); G.disc(12.5, 8, 1.6, 2.2, ['#06081c', '#0c1030', '#141a40']);
    G.disc(10, 13 + ph * 0.3, 1.5, 1.8, ['#06081c', '#0c1030', '#141a40']);
    G.P(7, 7, '#a4e4fc'); G.P(12, 7, '#a4e4fc');
    return Sprites.fromCanvas(G.c);
  }
  S.ghost = [ghost(0), ghost(1.6)];

  // ---------------- Stoppuhr (neue Spezialwaffe) ----------------
  {
    const G = pad(12, 13), GOLD = ['#3c2400', '#7c5000', '#b88018', '#f0c040', '#fcf0a0'];
    G.disc(6, 1.5, 1.6, 1.4, GOLD); G.disc(6, 7.5, 5.4, 5.4, GOLD);
    G.disc(6, 7.5, 3.8, 3.8, ['#a8a090', '#d8d0c0', '#f4f0e8', '#fcfcfc']);
    G.line(6, 7.5, 6, 5, '#140c08'); G.line(6, 7.5, 8, 8.5, '#140c08'); G.P(6, 7, '#c81c1c');
    S.watch = Sprites.fromCanvas(G.c);
  }
})();
