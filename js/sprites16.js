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

  // ---------------- Fledermaus: 4 Flügelschlag-Phasen + hängend ----------------
  const FUR = ['#140a14', '#2c1428', '#4a2440', '#6c3c5c', '#946080'];
  const WING = ['#1c0c1c', '#3c1838', '#5c2850', '#7c3c68'];
  const TIPS = [
    [[-6, -6], [-9, -3], [-10, 1]], [[-8, -2], [-10, 1], [-9, 4]],
    [[-7, 4], [-9, 6], [-6, 8]], [[-8, -1], [-10, 2], [-8, 5]],
  ];
  function bat(frame) {
    const G = pad(24, 16), sh = [[9.5, 6.5], [14.5, 6.5]];
    [-1, 1].forEach((side, k) => {
      const [sx, sy] = sh[k];
      const T = TIPS[frame].map(([tx, ty]) => [side < 0 ? sx + tx : sx - tx, sy + ty]);
      G.poly([[sx, sy], ...T, [sx, sy + 3]], WING[1]);
      // Flughaut zwischen den Fingern heller, Ränder gezackt
      for (let i = 0; i < 2; i++) G.poly([[sx, sy + 0.5], T[i], T[i + 1]], WING[2 + (i === 0 && frame !== 2 ? 1 : 0)]);
      T.forEach(t => G.line(sx, sy, t[0], t[1], WING[3]));
    });
    G.hard();
    G.disc(12, 8.5, 3, 3.8, FUR); G.disc(12, 4.4, 2.6, 2.4, FUR, 0.1);
    G.P(10, 1, FUR[2]); G.P(10, 2, FUR[3]); G.P(14, 1, FUR[2]); G.P(14, 2, FUR[3]); // Ohren
    G.P(11, 4, '#fc3c3c'); G.P(13, 4, '#fc3c3c'); G.P(11, 3, '#fca0a0');
    G.P(12, 6, '#fcfcfc'); // Zahn
    return Sprites.fromCanvas(G.c);
  }
  function batPerch() {
    const G = pad(24, 16);
    G.disc(12, 8, 4.2, 6, WING, -0.1); // eingefaltete Flügel
    G.disc(12, 9, 2.6, 4, FUR, 0.1);
    G.P(11, 11, '#fc3c3c'); G.P(13, 11, '#fc3c3c'); // kopfüber hängend: Augen unten
    G.P(10, 1, FUR[2]); G.P(14, 1, FUR[2]); G.P(12, 0, FUR[3]);
    return Sprites.fromCanvas(G.c);
  }
  S.bat = { fly: [0, 1, 2, 3].map(bat), perch: batPerch() };

  // ---------------- Fliegender Schädel mit Feuerschweif ----------------
  const BONE = ['#3c3428', '#7c7058', '#b4a888', '#dcd4b8', '#fcfcf0'];
  function skull(open) {
    const G = pad(16, 16);
    for (let i = 0; i < 6; i++) { // Flammenschweif hinten links
      const fx = 1 + i * 0.6, fy = 6 + ((i * 5 + open * 3) % 5);
      G.P(fx, fy, i % 2 ? '#f87800' : '#f8b800'); G.P(fx + 1, fy, '#d82800');
    }
    G.disc(9, 7, 5.6, 5.2, BONE); // Schädeldecke
    G.disc(9.5, 11.5 + open, 3.6, 2, BONE, -0.1); // Kiefer
    G.disc(7.4, 7.4, 1.5, 1.7, ['#0c0806', '#140c0a', '#1c140e']); G.disc(11.2, 7.4, 1.5, 1.7, ['#0c0806', '#140c0a', '#1c140e']);
    G.P(7, 7, '#fc2020'); G.P(11, 7, '#fc2020');
    G.P(9, 9, '#2c241c'); G.P(9, 10, '#2c241c'); // Nase
    for (let k = 7; k <= 11; k++) G.P(k, 11 + open, k % 2 ? BONE[4] : '#2c241c'); // Zähne
    return Sprites.fromCanvas(G.c);
  }
  S.skull = [skull(0), skull(1)];

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
