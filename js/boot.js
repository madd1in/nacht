// Ladebildschirm – läuft vor allen anderen Spielskripten, eigene Mini-Engine ohne Abhängigkeiten.
// Ein Blutmond geht hinter der Burg auf, Wolken jagen vorbei, Blitze schlagen ein, Fledermäuse kreuzen den Mond.
// Die Buchstaben von NACHTMAHR entzünden sich einer nach dem anderen mit dem Ladefortschritt, Blut tropft herab.
// Ist alles geladen, wartet er auf eine Taste: die schaltet den Ton frei, ein Blitz fährt in die Burg, ein Schwarm
// Fledermäuse stürzt auf den Betrachter zu – und dahinter schlägt der Titel ein.
// Das Spiel hält den Titel an, solange Boot.hold gilt, und zeichnet nicht, solange Boot.cover gilt (game.js) – erst wenn
// der Abgang ganz weiß ausgeblitzt ist, übernimmt der Titel: zeichnen beide zugleich, ruckeln beide.
// Die Animation (bootEngine) läuft, wo möglich, in einem eigenen Thread (Web Worker mit OffscreenCanvas): Während der
// Hauptthread das Spiel vorbaut – Helden, Gegner, Weltkarte, Hintergründe, Menüs –, bleibt der Ladebildschirm flüssig.
// Ohne Worker-Leinwand läuft dieselbe Engine im Hauptthread, der Vorbau dann in kleinen Häppchen zwischen den Bildern.
'use strict';

// io: { canvas, mk(w, h) → Leinwand, lang, touch, build, progress() → 0..1, jobsDone() → bool, emit('ready'|'done'), raf(f) }
function bootEngine(io) {
  const x = io.canvas.getContext('2d');

  // ---------------- Hilfen ----------------
  let seed = 7;
  const rnd = () => { seed = (seed + 0x6D2B79F5) | 0; let r = Math.imul(seed ^ (seed >>> 15), 1 | seed); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  const SR = (a, b) => a + rnd() * (b - a);            // reproduzierbar (Kulisse)
  const R = (a, b) => a + Math.random() * (b - a);     // frei (Effekte)
  const cvs = (w, h) => io.mk(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, k) => { const p = hex(a), q = hex(b); return `rgb(${Math.round(p[0] + (q[0] - p[0]) * k)},${Math.round(p[1] + (q[1] - p[1]) * k)},${Math.round(p[2] + (q[2] - p[2]) * k)})`; };
  const harden = (c) => { // weiche Kanten hart machen: Pixel-Look
    const q = c.getContext('2d'), im = q.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
    q.putImageData(im, 0, 0); return c;
  };
  const pline = (q, x0, y0, x1, y1, w) => { const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.round(Math.max(Math.abs(dx), Math.abs(dy)))); for (let i = 0; i <= n; i++) q.fillRect(Math.round(x0 + dx * i / n - w / 2), Math.round(y0 + dy * i / n - w / 2), w, w); };
  const hash = (i, j) => { let h = Math.imul(i * 374761393 + j * 668265263, 1274126177); h ^= h >>> 13; h = Math.imul(h, 1103515245); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const vn = (px, py) => { // Wertrauschen
    const i = Math.floor(px), j = Math.floor(py); let fx = px - i, fy = py - j; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    const a = hash(i, j), b = hash(i + 1, j), c = hash(i, j + 1), d = hash(i + 1, j + 1);
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  const LOGO = ['#fcbca0', '#fc7460', '#e83c20', '#d82800', '#a80020', '#880c00', '#580008'];

  // ---------------- Schrift: 5x7 für Texte, schwere 7x8-Lettern für den Titel ----------------
  const F5 = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [28, 18, 17, 17, 17, 18, 28],
    E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
    I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
    Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
    U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31], 'Ä': [10, 0, 14, 17, 31, 17, 17], 'Ö': [10, 0, 14, 17, 17, 17, 14], 'Ü': [10, 0, 17, 17, 17, 17, 14],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2],
    5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0],
    ':': [0, 12, 12, 0, 12, 12, 0], '%': [24, 25, 2, 4, 8, 19, 3], "'": [4, 4, 8, 0, 0, 0, 0], '>': [16, 24, 28, 30, 28, 24, 16], '<': [1, 3, 7, 15, 7, 3, 1],
    ' ': [0, 0, 0, 0, 0, 0, 0],
  };
  const norm = (s) => { // Großbuchstaben; Akzente fallen weg, Umlaute bleiben
    s = s.toUpperCase().replace(/ß/g, 'SS').replace(/[–—]/g, '-');
    let o = ''; for (let c of s) { if (!F5[c] && c.normalize) c = c.normalize('NFD')[0]; o += F5[c] ? c : ' '; } return o;
  };
  const LBL = new Map();
  const label = (s, col, sh) => { // Text einmal vorzeichnen (mit Schatten), dann nur noch kopieren
    const key = s + '|' + col + '|' + sh; if (LBL.has(key)) return LBL.get(key);
    const c = cvs(s.length * 6 + 1, 9), q = c.getContext('2d');
    for (let pass = sh ? 0 : 1; pass < 2; pass++) {
      q.fillStyle = pass ? col : sh; const o = pass ? 0 : 1;
      for (let i = 0; i < s.length; i++) { const g = F5[s[i]] || F5[' ']; for (let r = 0; r < 7; r++) for (let b = 0; b < 5; b++) if (g[r] & (16 >> b)) q.fillRect(i * 6 + b + o, r + o, 1, 1); }
    }
    LBL.set(key, c); return c;
  };
  const text = (s, cx, y, col, sh, a = 1, sc = 1) => {
    if (a <= 0) return; const c = label(s, col, sh);
    x.globalAlpha = Math.min(1, a); x.drawImage(c, Math.round(cx - (s.length * 6 - 1) * sc / 2), Math.round(y), c.width * sc, c.height * sc); x.globalAlpha = 1;
  };
  const wrap = (s, max) => { const out = []; let line = ''; for (const w of s.split(' ')) { const t2 = line ? line + ' ' + w : w; if (t2.length > max && line) { out.push(line); line = w; } else line = t2; } if (line) out.push(line); return out; };
  const TG = { // Titel-Lettern 7 x 8, doppelte Strichstärke, kleine Sporne
    N: ['1100011', '1110011', '1111011', '1101111', '1100111', '1100011', '1100011', '1100011'],
    A: ['0011100', '0111110', '1100011', '1100011', '1111111', '1100011', '1100011', '1100011'],
    C: ['0111110', '1111111', '1100001', '1100000', '1100000', '1100001', '1111111', '0111110'],
    H: ['1100011', '1100011', '1100011', '1111111', '1111111', '1100011', '1100011', '1100011'],
    T: ['1111111', '1111111', '1011101', '0011100', '0011100', '0011100', '0011100', '0011100'],
    M: ['1100011', '1110111', '1111111', '1101011', '1100011', '1100011', '1100011', '1100011'],
    R: ['1111110', '1111111', '1100011', '1100011', '1111110', '1111100', '1100110', '1100011'],
  };

  // ---------------- Sprache ----------------
  const TXT = {
    de: { sub: 'EIN VAMPIRJÄGER-ABENTEUER', load: 'DIE NACHT ERWACHT', key: 'DRÜCKE EINE TASTE', tap: 'TIPPEN ZUM EINTRETEN',
      tips: ['KERZEN BERGEN HERZEN, GOLD UND WAFFEN.', 'SUB HALTEN AB 10 HERZEN: HEILIGER STURM.', 'RINGE SCHRÄG HOCH PEITSCHEN UND PENDELN.',
        'DER DASH GEHT AUCH IN DER LUFT.', 'PEITSCH DIE SEILWINDE - DIE BRÜCKE FÄLLT.', 'IM THRONSAAL WARTET DER GRAF.', 'DIE SONNENKATHEDRALE KENNT KEINE NACHT.'] },
    en: { sub: 'A VAMPIRE HUNTER SAGA', load: 'THE NIGHT AWAKENS', key: 'PRESS ANY KEY', tap: 'TAP TO ENTER',
      tips: ['CANDLES HIDE HEARTS, GOLD AND WEAPONS.', 'HOLD SUB WITH 10 HEARTS: HOLY STORM.', 'WHIP RINGS DIAGONALLY UP TO SWING.',
        'YOU CAN DASH IN MID-AIR, TOO.', 'WHIP THE WINCH AND THE BRIDGE FALLS.', 'THE COUNT AWAITS IN THE THRONE ROOM.', 'THE SUN CATHEDRAL KNOWS NO NIGHT.'] },
    fr: { sub: 'UNE SAGA DE CHASSEUR DE VAMPIRES', load: "LA NUIT S'EVEILLE", key: 'APPUIE SUR UNE TOUCHE', tap: 'TOUCHE POUR ENTRER',
      tips: ['LES BOUGIES CACHENT COEURS, OR ET ARMES.', 'FOUETTE LES ANNEAUX EN DIAGONALE.', 'LE DASH MARCHE AUSSI EN PLEIN SAUT.', 'LE COMTE ATTEND DANS LA SALLE DU TRONE.'] },
    es: { sub: 'UNA SAGA DE CAZAVAMPIROS', load: 'LA NOCHE DESPIERTA', key: 'PULSA UNA TECLA', tap: 'TOCA PARA ENTRAR',
      tips: ['LAS VELAS ESCONDEN CORAZONES, ORO Y ARMAS.', 'AZOTA LOS ANILLOS EN DIAGONAL.', 'EL DASH TAMBIEN FUNCIONA EN EL AIRE.', 'EL CONDE ESPERA EN LA SALA DEL TRONO.'] },
  };
  const T = TXT[io.lang] || TXT.en;
  ['sub', 'load', 'key', 'tap'].forEach(k => { T[k] = norm(T[k]); }); T.tips = T.tips.map(norm);
  const touch = io.touch;

  // ---------------- Kulisse (bei jeder Größenänderung neu gebaut) ----------------
  let W = 0, H = 0, PX = 3, S = 4, K = 1, BY = 0, CX = 0, MR = 0, MX = 0, TY = 0, sky = null;
  let moon = null, mts = null, castle = null, castleLit = null, fog = null, fg = null;
  let stars = [], clouds = [], rain = [], letters = [];
  const PARTS = [[-66, 12, 34, 0], [-37, 14, 54, 26], [-15, 7, 82, 16], [15, 7, 82, 16], [0, 26, 72, 40], [39, 16, 62, 30], [67, 12, 40, 16], [-100, 9, 22, 0]]; // x, Breite, Höhe, Spitzhelm
  const CRAG = [[-160, -90], [-140, -40], [-122, -18], [-108, -4], [-100, -2], [-92, -7], [-80, -2], [-72, 0], [74, 0], [86, -3], [98, -2], [110, -9], [124, -20], [140, -44], [160, -90]];
  const WINS = [[-6, 40, 2, 4], [4, 40, 2, 4], [-1, 56, 2, 5], [-37, 30, 2, 4], [-37, 44, 2, 3], [39, 36, 2, 4], [36, 22, 2, 3], [-66, 20, 2, 3], [67, 26, 2, 3], [15, 66, 1, 3], [-15, 66, 1, 3], [-100, 14, 1, 3], [-24, 12, 2, 3], [26, 12, 2, 3]];

  function resize(w, h) { W = w; H = h; io.canvas.width = W; io.canvas.height = H; build(); } // Pixelgröße und CSS setzt der Hauptthread
  function build() {
    seed = 7;
    S = Math.max(1, Math.min(6, Math.floor(W * 0.86 / 71)));
    K = Math.max(0.6, Math.min(1.5, Math.min(W / 330, H / 240)));
    BY = Math.round(H * 0.8); CX = Math.round(W / 2);
    MR = Math.round(Math.min(W * 0.2, H * 0.24)); MX = Math.round(CX + 22 * K);
    TY = Math.round(H * 0.1);
    sky = x.createLinearGradient(0, 0, 0, BY);
    sky.addColorStop(0, '#020006'); sky.addColorStop(0.45, '#12051c'); sky.addColorStop(0.75, '#2a0a26'); sky.addColorStop(1, '#4a1026');
    stars = []; for (let i = 0; i < Math.round(W * H / 1100); i++) stars.push([SR(0, W), SR(0, BY * 0.75), SR(0, 6.3), rnd() < 0.08]);
    moon = mkMoon(MR); mts = mkMountains(); mkCastle(); clouds = mkClouds(); fog = mkFog(); fg = mkForeground();
    rain = []; for (let i = 0; i < Math.round(W * H / 1500); i++) rain.push([SR(0, W), SR(0, H), SR(3.5, 5.5)]);
    const on = letters.map(L => L.on); mkLetters(); letters.forEach((L, i) => { if (on[i] !== undefined) L.on = on[i]; });
  }
  function mkMoon(r) { // Blutmond: Kugelschattierung, Krater und Meere aus Rauschen, Bayer-Raster zwischen sechs Rottönen
    const c = cvs(r * 2 + 2, r * 2 + 2), q = c.getContext('2d'), BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const P = ['#2c040c', '#5c0a16', '#94141e', '#d02c20', '#f45c3c', '#fca070'];
    for (let y = 0; y < r * 2; y++) for (let X = 0; X < r * 2; X++) {
      const dx = (X + 0.5 - r) / r, dy = (y + 0.5 - r) / r, d = Math.hypot(dx, dy); if (d > 1) continue;
      const nz = Math.sqrt(1 - d * d);
      let l = 0.18 + nz * 0.55 + (-dx * 0.35 - dy * 0.45) * 0.5;
      if (vn(X * 0.06 + 3, y * 0.06) > 0.6) l *= 0.8; // Meere
      const cr = vn(X * 0.22, y * 0.22); if (cr > 0.7) l *= 0.7; else if (cr > 0.64) l *= 1.12; // Krater mit hellem Rand
      if (d > 0.93) l *= 0.75;
      const v = Math.max(0, Math.min(1, l)) * (P.length - 1), i0 = Math.floor(v), th = (BAY[(y & 3) * 4 + (X & 3)] + 0.5) / 16;
      q.fillStyle = P[Math.min(P.length - 1, i0 + (v - i0 > th ? 1 : 0))]; q.fillRect(X + 1, y + 1, 1, 1);
    }
    return c;
  }
  function mkMountains() { // zwei Bergketten, die Grate vom Mond gesäumt
    const c = cvs(W + 40, H), q = c.getContext('2d');
    [[0.62, 0.22, '#1a0c28', '#3c1a46', 0.022, 3], [0.72, 0.14, '#10061a', '#2c1034', 0.04, 9]].forEach(([b, h, col, rim, f, s]) => {
      for (let X = 0; X < c.width; X++) {
        const n = vn(X * f, s) * 0.55 + vn(X * f * 2.7, s + 3) * 0.3 + vn(X * f * 7, s + 9) * 0.15, top = Math.round(H * b - n * H * h);
        q.fillStyle = col; q.fillRect(X, top, 1, H - top); q.fillStyle = rim; q.fillRect(X, top, 1, 1);
      }
    });
    return c;
  }
  function mkCastle() { // Burg auf dem Felsen: Silhouette mit Mondsaum und eine vom Blitz erhellte Fassung
    const w = Math.ceil(330 * K), up = Math.ceil(126 * K), down = H - BY + 8, OX = w / 2, OY = up;
    const shapes = (q, cw, cr, dx, dy) => {
      const rr = (xc, wd, y0, h) => { q.fillStyle = cw; q.fillRect(Math.round(OX + (xc - wd / 2) * K + dx), Math.round(OY - (y0 + h) * K + dy), Math.max(1, Math.round(wd * K)), Math.round(h * K) + 1); };
      const cone = (xc, wd, y0, h) => { q.fillStyle = cr; q.beginPath(); q.moveTo(OX + (xc - wd / 2 - 1.5) * K + dx, OY - y0 * K + dy); q.lineTo(OX + xc * K + dx, OY - (y0 + h) * K + dy); q.lineTo(OX + (xc + wd / 2 + 1.5) * K + dx, OY - y0 * K + dy); q.closePath(); q.fill(); };
      const cren = (xc, wd, y0) => { for (let i = -wd / 2; i < wd / 2 - 1; i += 4) rr(xc + i + 1, 2, y0, 3); };
      q.fillStyle = cw; q.beginPath(); q.moveTo(dx, OY + down + dy);
      CRAG.forEach(([px, py]) => q.lineTo(OX + px * K + dx, OY - py * K + dy)); q.lineTo(w + dx, OY + down + dy); q.closePath(); q.fill();
      rr(0, 146, 0, 20); cren(0, 146, 20);                              // Ringmauer
      rr(92, 36, 10, 6); for (let i = 0; i < 3; i++) rr(80 + i * 12, 3, 0, 10); // Brücke zum Felsen
      PARTS.forEach(([xc, wd, h, sp]) => { rr(xc, wd, 0, h); if (sp) cone(xc, wd, h, sp); else cren(xc, wd, h); });
      rr(0, 1, 112, 6);                                                  // Fahnenmast
    };
    const c = cvs(w, up + down), q = c.getContext('2d');
    shapes(q, '#4a1838', '#4a1838', 1, -1); shapes(q, '#07030c', '#07030c', 0, 0); harden(c);
    const l = cvs(w, up + down), ql = l.getContext('2d');
    shapes(ql, '#5a5676', '#362a46', 0, 0); harden(l);
    ql.globalCompositeOperation = 'source-atop';
    for (let y = 0; y < l.height; y += 3) { ql.fillStyle = 'rgba(0,0,0,0.22)'; ql.fillRect(0, y, w, 1); }
    for (let X = 0; X < w; X += 5) { ql.fillStyle = 'rgba(0,0,0,0.12)'; ql.fillRect(X + ((X / 5) & 1) * 2, 0, 1, l.height); }
    const g = ql.createLinearGradient(0, 0, 0, l.height); g.addColorStop(0, 'rgba(200,200,255,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ql.fillStyle = g; ql.fillRect(0, 0, w, l.height);
    castle = { c, ox: OX, oy: OY }; castleLit = l;
  }
  function mkClouds() {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const w = Math.round(SR(60, 150) * K), h = Math.round(SR(14, 26) * K), c = cvs(w + 4, h + 6), q = c.getContext('2d'), blobs = [];
      for (let b = 0; b < 6; b++) blobs.push([SR(w * 0.18, w * 0.82), SR(h * 0.5, h * 0.72), SR(w * 0.1, w * 0.22), SR(h * 0.25, h * 0.42)]);
      const ell = (dx, dy, col) => { q.fillStyle = col; blobs.forEach(([bx, by, rx, ry]) => { q.beginPath(); q.ellipse(bx + dx + 2, by + dy, rx, ry, 0, 0, Math.PI * 2); q.fill(); }); };
      ell(0, 0, '#6a1c34'); ell(0, 2, '#1a0a22'); ell(-2, 3, '#100618'); harden(c);
      out.push({ c, x: SR(-w, W), y: SR(H * 0.06, H * 0.5), v: SR(0.35, 0.9) * K });
    }
    return out;
  }
  function mkFog() {
    const c = cvs(W, Math.round(H * 0.32)), q = c.getContext('2d');
    for (let i = 0; i < 22; i++) {
      const fx = SR(0, W), fy = SR(c.height * 0.3, c.height), r = SR(20, 60) * K, g = q.createRadialGradient(fx, fy, 0, fx, fy, r);
      g.addColorStop(0, 'rgba(120,80,150,0.16)'); g.addColorStop(1, 'rgba(120,80,150,0)');
      for (const o of [-W, 0, W]) { q.fillStyle = g; q.save(); q.translate(o, 0); q.fillRect(fx - r, fy - r, r * 2, r * 2); q.restore(); }
    }
    return c;
  }
  function mkForeground() { // tote Bäume, Hügel und Grabkreuze ganz vorn
    const c = cvs(W + 24, H), q = c.getContext('2d'); q.fillStyle = '#030106'; q.translate(12, 0); // 12 px Rand links und rechts für das Schwenken
    q.beginPath(); q.moveTo(-12, H); q.lineTo(-12, H * 0.82); q.quadraticCurveTo(W * 0.12, H * 0.84, W * 0.3, H); q.closePath(); q.fill();
    q.beginPath(); q.moveTo(W + 12, H); q.lineTo(W + 12, H * 0.86); q.quadraticCurveTo(W * 0.88, H * 0.87, W * 0.72, H); q.closePath(); q.fill();
    const tree = (tx, ty, ang, len, wd, depth) => {
      const x1 = tx + Math.cos(ang) * len, y1 = ty + Math.sin(ang) * len; pline(q, tx, ty, x1, y1, Math.max(1, Math.round(wd)));
      if (depth <= 0) return; const n = 2 + (rnd() < 0.4 ? 1 : 0);
      for (let i = 0; i < n; i++) tree(x1, y1, ang + (rnd() - 0.5) * 1.1 + (i - (n - 1) / 2) * 0.55, len * SR(0.6, 0.78), wd * 0.66, depth - 1);
    };
    tree(W * 0.05, H * 0.92, -Math.PI / 2 + 0.12, H * 0.15, Math.max(2, 4 * K), 5);
    tree(W * 0.95, H * 0.94, -Math.PI / 2 - 0.16, H * 0.11, Math.max(2, 3 * K), 4);
    [[0.15, 0.9, 1], [0.21, 0.94, 0.8], [0.83, 0.93, 0.9]].forEach(([gx, gy, s]) => { // Grabkreuze
      const X = W * gx, Y = H * gy, h = 12 * K * s; q.fillRect(Math.round(X - K), Math.round(Y - h), Math.max(2, Math.round(2 * K)), Math.round(h)); q.fillRect(Math.round(X - 4 * K * s), Math.round(Y - h * 0.72), Math.round(8 * K * s), Math.max(2, Math.round(2 * K)));
    });
    return harden(c);
  }
  function mkLetter(ch, mode, ex, ey, D) { // mode 0 kalter Stein, 1 glühend, 2 weiß (Aufflammen); Tiefe fluchtet zur Burg hin
    const g = TG[ch], pad = Math.ceil(Math.abs(ex) * D) + 1, c = cvs(7 * S + pad * 2, 8 * S + Math.ceil(ey * D) + 2), q = c.getContext('2d');
    const on = (cx, cy) => cy >= 0 && cy < 8 && cx >= 0 && cx < 7 && g[cy][cx] === '1';
    const side = mode === 2 ? ['#ffb8a0', '#ffffff'] : mode === 1 ? ['#160003', '#8c1420'] : ['#06040a', '#2a2232'];
    for (let d = D; d >= 1; d--) {
      q.fillStyle = mix(side[0], side[1], 1 - (d - 1) / D);
      for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 7; cx++) if (on(cx, cy)) q.fillRect(Math.round(pad + cx * S + ex * d), Math.round(cy * S + ey * d), S, S);
    }
    for (let cy = 0; cy < 8; cy++) for (let cx = 0; cx < 7; cx++) if (on(cx, cy)) {
      for (let i = 0; i < S; i++) { const yy = cy * S + i, k = yy / (8 * S); q.fillStyle = mode === 2 ? '#ffffff' : mode === 1 ? LOGO[Math.min(6, Math.floor(k * 7))] : mix('#5c5268', '#241e2e', k); q.fillRect(pad + cx * S, yy, S, 1); }
      if (!on(cx, cy - 1)) { q.fillStyle = mode === 1 ? '#fff0d8' : mode === 2 ? '#ffffff' : '#8a8098'; q.fillRect(pad + cx * S, cy * S, S, 1); }
      if (!on(cx - 1, cy) && S > 2) { q.fillStyle = mode === 1 ? 'rgba(255,230,200,0.5)' : 'rgba(200,190,220,0.3)'; q.fillRect(pad + cx * S, cy * S, 1, S); }
      if (!on(cx, cy + 1) && S > 2) { q.fillStyle = 'rgba(0,0,0,0.35)'; q.fillRect(pad + cx * S, cy * S + S - 1, S, 1); }
      if (mode === 0 && S > 2 && hash(cx * 7 + ch.charCodeAt(0), cy) > 0.7) { q.fillStyle = 'rgba(0,0,0,0.35)'; q.fillRect(pad + cx * S + 1, cy * S + 1, 1, S - 2); } // Risse im Stein
    }
    return { c, ox: pad };
  }
  function mkLetters() {
    letters = []; const word = 'NACHTMAHR', x0 = Math.round((W - 71 * S) / 2), D = S + 1;
    for (let i = 0; i < 9; i++) {
      const lx = x0 + i * 8 * S, ex = (CX - (lx + 3.5 * S)) / W * 1.6, ey = 0.85, ch = word[i], feet = [];
      TG[ch][7].split('').forEach((b, k) => { if (b === '1') feet.push(k); });
      letters.push({ x: lx, dark: mkLetter(ch, 0, ex, ey, D), lit: mkLetter(ch, 1, ex, ey, D), white: mkLetter(ch, 2, ex, ey, D), on: -1, drip: feet[(i * 3) % feet.length], depth: D * ey });
    }
  }

  // ---------------- Zustand ----------------
  let state = 'load', t = 0, disp = 0, readyT = 0, exitT = 0, flash = 0, flare = 0, shake = 0, bolt = null, boltT = 0, nextBolt = 110, tip0 = Math.floor(Math.random() * 7);
  const parts = [], bats = [], swarm = [];
  const BAT = [['1000001', '1100011', '0110110', '0011100', '0001000'], ['0000000', '0001000', '1111111', '1011101', '0001000'], ['0000000', '0001000', '0011100', '0110110', '1100011']];
  const spark = (px, py, vx, vy, life, col, sz = 1, g = 0, add = true) => { if (parts.length < 500) parts.push({ x: px, y: py, vx, vy, life, max: life, col, sz, g, add }); };
  const keepTop = () => BY - 112 * K;
  const mkBolt = (x0, x1, y1) => {
    const pts = [[x0, -4]], n = 16;
    for (let i = 1; i <= n; i++) { const k = i / n; pts.push([i === n ? x1 : x0 + (x1 - x0) * k + R(-1, 1) * W * 0.035 * (1 - k * 0.6), -4 + (y1 + 4) * k]); }
    const br = [];
    for (let b = 0; b < 3; b++) { const s0 = pts[2 + Math.floor(Math.random() * (n - 6))], dir = Math.random() < 0.5 ? -1 : 1, seg = [[s0[0], s0[1]]]; let bx = s0[0], by = s0[1]; for (let i = 0; i < 6; i++) { bx += dir * R(2, 7) * K; by += R(3, 8) * K; seg.push([bx, by]); } br.push(seg); }
    return { pts, br };
  };
  const strike = (toCastle) => {
    const tx = toCastle ? CX : R(W * 0.1, W * 0.9), ty = toCastle ? keepTop() - 6 * K : H * R(0.45, 0.62);
    bolt = mkBolt(tx + R(-W * 0.18, W * 0.18), tx, ty); boltT = 12; flash = Math.max(flash, 1);
  };
  const ignite = (i) => {
    const L = letters[i]; L.on = t; shake = Math.max(shake, 1.5);
    const cx = L.x + 3.5 * S, cy = TY + 4 * S;
    for (let k = 0; k < 18; k++) spark(cx + R(-3, 3) * S, cy + R(-3, 3) * S, R(-1.6, 1.6), R(-2.2, 0.4), R(20, 45), k % 3 ? '#fc7460' : '#f8d878', 1, 0.06);
  };

  function exit() {
    state = 'exit'; exitT = 0; flare = 1.3; shake = 6; flash = 1.3; strike(true);
    for (let i = 0; i < 48; i++) { const a = R(0, Math.PI * 2), v = R(0.4, 1.5); swarm.push({ x: CX + R(-8, 8) * K, y: BY - R(40, 95) * K, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 0.25, sz: R(0.8, 1.6), g: R(1.035, 1.065), ph: R(0, 8) }); }
    letters.forEach(L => { if (L.on < 0) L.on = t; });
  }
  function finish() { state = 'gone'; io.emit('done'); }
  const press = () => { if (state === 'ready') exit(); };

  // ---------------- Takt ----------------
  function update() {
    t++;
    if (state === 'load') {
      const target = io.progress();
      if (target > disp) disp = Math.min(target, disp + Math.min(0.011, (target - disp) * 0.12 + 0.0015));
      letters.forEach((L, i) => { if (L.on < 0 && disp >= (i + 1) / 9 - 0.001) ignite(i); });
      if (disp >= 0.999 && io.jobsDone()) { state = 'ready'; readyT = t; flare = 0.8; strike(true); io.emit('ready'); }
    } else if (state === 'exit') {
      exitT++;
      if (exitT > 44) { finish(); return; } // zuletzt ganz weiß – darunter schlägt der Titel ein
    }
    if (t >= nextBolt && state !== 'exit') { strike(Math.random() < 0.4); nextBolt = t + R(160, 340); }
    if (boltT > 0) { boltT--; if (boltT === 6) flash = Math.max(flash, 0.75); }
    flash *= 0.86; if (flash < 0.01) flash = 0;
    flare *= 0.9; if (flare < 0.03) flare = 0;
    shake *= 0.85; if (shake < 0.4) shake = 0;
    for (const c of clouds) { c.x -= c.v; if (c.x < -c.c.width) { c.x = W + R(0, 60); c.y = R(H * 0.06, H * 0.5); } }
    for (const d of rain) { d[1] += d[2]; d[0] -= d[2] * 0.3; if (d[1] > H) { d[1] = -4; d[0] = R(0, W + 30); } }
    if (Math.random() < 0.012 && bats.length < 6) { const dir = Math.random() < 0.5 ? 1 : -1; bats.push({ x: dir > 0 ? -10 : W + 10, y: R(H * 0.22, H * 0.6), vx: dir * R(0.6, 1.3) * K, ph: R(0, 6), sz: Math.random() < 0.3 ? 2 : 1 }); }
    for (let i = bats.length - 1; i >= 0; i--) { const b = bats[i]; b.x += b.vx; b.y += Math.sin(t * 0.08 + b.ph) * 0.45; if (b.x < -20 || b.x > W + 20) bats.splice(i, 1); }
    for (let i = swarm.length - 1; i >= 0; i--) { const b = swarm[i]; b.x += b.vx; b.y += b.vy; b.vx *= 1.05; b.vy *= 1.05; b.sz *= b.g; if (b.sz > 16 || b.x < -60 || b.x > W + 60 || b.y < -60 || b.y > H + 60) swarm.splice(i, 1); }
    letters.forEach((L, i) => { // Glut steigt auf, Blut tropft von den Füßen
      if (L.on < 0) return;
      if (Math.random() < 0.08) spark(L.x + R(0, 7 * S), TY + R(0, 2 * S), R(-0.25, 0.25), R(-0.9, -0.3), R(30, 70), Math.random() < 0.5 ? '#f86030' : '#f8b040');
      const len = Math.min(S * 3, (t - L.on) * 0.04 * S);
      if (len >= S * 3 && (t + i * 37) % 170 === 0) spark(L.x + L.drip * S + S / 2, TY + 8 * S + L.depth + len, 0, 0.4, 140, '#c41420', Math.max(1, Math.round(S / 2)), 0.06, false);
    });
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.g; if (--p.life <= 0 || p.y > H + 4) parts.splice(i, 1); }
  }

  const drawBat = (px, py, f, sz, col) => {
    const g = BAT[[0, 1, 2, 1][f & 3]]; x.fillStyle = col;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 7; c++) if (g[r][c] === '1') x.fillRect(Math.round(px + (c - 3) * sz), Math.round(py + (r - 2) * sz), Math.ceil(sz), Math.ceil(sz));
    if (sz >= 2) { x.fillStyle = '#ff3020'; x.fillRect(Math.round(px - sz * 0.5), Math.round(py - sz * 0.3), Math.max(1, sz >> 1), Math.max(1, sz >> 1)); x.fillRect(Math.round(px + sz * 0.5), Math.round(py - sz * 0.3), Math.max(1, sz >> 1), Math.max(1, sz >> 1)); }
  };
  const drawBolt = () => {
    const seg = (pts, w, col) => { x.fillStyle = col; for (let i = 1; i < pts.length; i++) pline(x, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w); };
    x.globalCompositeOperation = 'lighter';
    bolt.br.forEach(s => seg(s, 1, '#6a60c8')); seg(bolt.pts, 3, '#3c3490'); seg(bolt.pts, 1, '#ffffff');
    x.globalCompositeOperation = 'source-over';
  };
  function render() {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.imageSmoothingEnabled = false;
    x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
    const sx = shake ? Math.round(R(-shake, shake)) : 0, sy = shake ? Math.round(R(-shake, shake) * 0.6) : 0;
    const z = state === 'exit' ? 1 + Math.pow(Math.min(1, exitT / 40), 2) * 0.5 : 1; // beim Eintreten stürzt die Kamera auf die Burg zu
    x.setTransform(z, 0, 0, z, (1 - z) * CX + sx, (1 - z) * keepTop() + sy);
    const drift = Math.sin(t * 0.004) * 4 * K, fade = Math.min(1, t / 30);
    // Himmel, Sterne, Mond
    x.fillStyle = sky; x.fillRect(-30, -30, W + 60, BY + 30); x.fillStyle = '#06020a'; x.fillRect(-30, BY, W + 60, H - BY + 30);
    for (const [px, py, ph, big] of stars) {
      x.globalAlpha = (0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * 0.05 + ph))) * fade; x.fillStyle = big ? '#fff4e8' : '#c8c0f0';
      x.fillRect(Math.round(px - drift * 0.1), Math.round(py), 1, 1); if (big) { x.fillRect(Math.round(px - drift * 0.1) - 1, Math.round(py), 3, 1); x.fillRect(Math.round(px - drift * 0.1), Math.round(py) - 1, 1, 3); }
    }
    x.globalAlpha = 1;
    const rise = 1 - Math.pow(1 - Math.min(1, t / 240), 3), my = Math.round(H * 0.5 + H * 0.34 * (1 - rise)), mx = Math.round(MX - drift * 0.2);
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.03), hr = MR * 2.6, hg = x.createRadialGradient(mx, my, MR * 0.8, mx, my, hr);
    hg.addColorStop(0, `rgba(220,40,50,${0.42 * pulse})`); hg.addColorStop(0.4, `rgba(150,20,50,${0.16 * pulse})`); hg.addColorStop(1, 'rgba(90,10,40,0)');
    x.globalCompositeOperation = 'lighter'; x.fillStyle = hg; x.fillRect(mx - hr, my - hr, hr * 2, hr * 2); x.globalCompositeOperation = 'source-over';
    x.drawImage(moon, mx - MR - 1, my - MR - 1);
    for (const c of clouds) x.drawImage(c.c, Math.round(c.x), Math.round(c.y));
    if (bolt && boltT > 0 && boltT !== 7 && boltT !== 8) drawBolt();
    if (flash > 0.02) { x.fillStyle = `rgba(190,180,255,${Math.min(0.5, flash * 0.32)})`; x.fillRect(-30, -30, W + 60, H + 60); }
    // Berge, Burg
    x.drawImage(mts, Math.round(-20 - drift * 0.4), 0);
    const bx = Math.round(CX - castle.ox - drift), by = Math.round(BY - castle.oy);
    x.drawImage(castle.c, bx, by);
    if (flash > 0.05) { x.globalAlpha = Math.min(1, flash * 0.9); x.drawImage(castleLit, bx, by); x.globalAlpha = 1; }
    WINS.forEach(([wx, wy, ww, wh], i) => {
      const f = hash(i, t >> 3), col = i % 5 === 2 ? (f > 0.15 ? '#e02020' : '#801010') : f > 0.9 ? '#a85020' : f > 0.45 ? '#f8b850' : '#fc8830';
      x.fillStyle = col; x.fillRect(Math.round(CX - drift + (wx - ww / 2) * K), Math.round(BY - (wy + wh) * K), Math.max(1, Math.round(ww * K)), Math.max(1, Math.round(wh * K)));
    });
    const gx = Math.round(CX - drift), gy = Math.round(BY - 6 * K), gg = x.createRadialGradient(gx, gy, 0, gx, gy, 14 * K); // Tor glüht
    gg.addColorStop(0, 'rgba(255,150,60,0.55)'); gg.addColorStop(1, 'rgba(255,90,30,0)');
    x.globalCompositeOperation = 'lighter'; x.fillStyle = gg; x.fillRect(gx - 14 * K, gy - 14 * K, 28 * K, 28 * K); x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#c81818'; for (let i = 0; i < 4; i++) x.fillRect(Math.round(CX - drift + (1 + i) * K), Math.round(BY - 117 * K + Math.sin(t * 0.2 - i * 0.9) * K), Math.max(1, Math.round(K)), Math.max(2, Math.round(2 * K))); // Fahne
    for (const b of bats) drawBat(b.x, b.y, Math.floor(t / 5 + b.ph), b.sz, '#020004');
    // Nebel, Vordergrund, Regen
    const fo = (t * 0.25) % W; x.drawImage(fog, -fo, H - fog.height); x.drawImage(fog, W - fo, H - fog.height);
    x.drawImage(fg, Math.round(-12 - drift * 1.6), 0);
    x.fillStyle = 'rgba(170,160,230,0.32)'; for (const [rx, ry] of rain) { x.fillRect(Math.round(rx), Math.round(ry), 1, 2); x.fillRect(Math.round(rx) - 1, Math.round(ry) + 2, 1, 2); }
    // Titel
    x.globalAlpha = fade;
    letters.forEach((L, i) => {
      const lit = L.on >= 0, age = lit ? t - L.on : 0, bob = lit ? Math.round(Math.sin(t * 0.06 + i * 0.75) * Math.max(1, S * 0.3)) : 0, X = L.x - L.lit.ox, Y = TY + bob;
      if (lit) {
        const cx = L.x + 3.5 * S, cy = TY + 4 * S, r = 9 * S * (1 + 0.08 * Math.sin(t * 0.1 + i)), g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, `rgba(255,60,30,${0.26 + 0.4 * Math.max(0, 1 - age / 30)})`); g.addColorStop(1, 'rgba(255,40,20,0)');
        x.globalCompositeOperation = 'lighter'; x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); x.globalCompositeOperation = 'source-over';
      }
      x.drawImage(lit ? L.lit.c : L.dark.c, X, Y);
      const wf = Math.max(lit ? 1 - age / 16 : 0, flare);
      if (wf > 0) { x.globalAlpha = Math.min(1, wf) * fade; x.drawImage(L.white.c, X, Y); x.globalAlpha = fade; }
      if (lit) { // Blut läuft von einem Fuß herab
        const len = Math.round(Math.min(S * 3, age * 0.04 * S)), dw = Math.max(1, Math.round(S / 2)), dx = Math.round(L.x + L.drip * S + (S - dw) / 2), dy = Math.round(Y + 8 * S + L.depth - 1);
        x.fillStyle = '#8c0c14'; x.fillRect(dx, dy, dw, len); x.fillStyle = '#d82820'; x.fillRect(dx, dy + len - 1, dw, 1);
      }
    });
    x.globalAlpha = 1;
    const ySub = Math.round(TY + 8 * S + (S + 1) * 0.85 + 5);
    text(T.sub, CX, ySub, '#e8d4f0', '#14000c', Math.min(1, t / 50) * (0.8 + 0.2 * Math.sin(t * 0.05)));
    for (const p of parts) { x.globalAlpha = Math.min(1, p.life / p.max * 1.6); if (p.add) x.globalCompositeOperation = 'lighter'; x.fillStyle = p.col; x.fillRect(Math.round(p.x), Math.round(p.y), p.sz, p.sz); x.globalCompositeOperation = 'source-over'; }
    x.globalAlpha = 1;
    for (const b of swarm) drawBat(b.x, b.y, Math.floor(t / 3 + b.ph), Math.min(12, b.sz), '#000000');
    // Anzeigen (ohne Kamerafahrt)
    x.setTransform(1, 0, 0, 1, 0, 0);
    const yS = H - 40;
    if (state === 'load' || (state === 'ready' && t - readyT < 24)) {
      const a = state === 'load' ? fade : 1 - (t - readyT) / 24, bw = Math.min(Math.round(W * 0.5), 170), bx2 = CX - (bw >> 1), by2 = yS + 11, fw = Math.round(bw * disp);
      text(T.load + ' ' + Math.floor(disp * 100) + '%', CX, yS, '#d0b8e0', '#000', a);
      x.globalAlpha = a; x.fillStyle = '#1a0c20'; x.fillRect(bx2 - 1, by2 - 1, bw + 2, 5); x.fillStyle = '#3c2848'; x.fillRect(bx2 - 1, by2 - 1, bw + 2, 1);
      if (fw > 0) {
        const g = x.createLinearGradient(bx2, 0, bx2 + fw, 0); g.addColorStop(0, '#580008'); g.addColorStop(0.7, '#d82800'); g.addColorStop(1, '#fcbca0');
        x.fillStyle = g; x.fillRect(bx2, by2, fw, 3);
        const eg = x.createRadialGradient(bx2 + fw, by2 + 1, 0, bx2 + fw, by2 + 1, 7); eg.addColorStop(0, 'rgba(255,170,90,0.8)'); eg.addColorStop(1, 'rgba(255,60,20,0)');
        x.globalCompositeOperation = 'lighter'; x.fillStyle = eg; x.fillRect(bx2 + fw - 7, by2 - 6, 14, 14); x.globalCompositeOperation = 'source-over';
      }
      x.fillStyle = '#c89020'; for (const ex of [bx2 - 5, bx2 + bw + 4]) { x.fillRect(ex, by2 + 1, 1, 1); x.fillRect(ex - 1, by2 + 2, 3, 1); x.fillRect(ex, by2 + 3, 1, 1); x.fillRect(ex - 1, by2, 3, 1); }
      x.globalAlpha = 1;
    }
    if (state === 'ready' || state === 'exit') {
      const k = Math.min(1, (t - readyT) / 20), sc = W >= 320 ? 2 : 1, msg = touch ? T.tap : T.key, pulse = state === 'exit' ? 1 : 0.55 + 0.45 * Math.sin((t - readyT) * 0.1);
      text('> ' + msg + ' <', CX, yS + 4 - (sc - 1) * 4, '#fce0a8', '#400008', k * pulse, sc);
    }
    const tc = T.tips.length, tn = Math.floor(t / 300), ti = (tip0 + tn) % tc, tt = t % 300, ta = Math.min(1, tt / 30, (300 - tt) / 30) * fade;
    const lines = wrap(T.tips[ti], Math.floor((W - 10) / 6));
    lines.forEach((ln, j) => text(ln, CX, H - 16 - (lines.length - 1 - j) * 9, '#8c7a9c', '#000', ta * 0.95));
    const ver = 'V' + norm(String(io.build || '')); text(ver, W - ver.length * 3 - 3, 3, '#3c3050', null, fade);
    if (state === 'exit' && flash > 0.6) { x.fillStyle = `rgba(255,250,255,${Math.min(0.85, (flash - 0.6) * 1.6)})`; x.fillRect(0, 0, W, H); }
    if (state === 'exit' && exitT > 26) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.fillStyle = `rgba(255,248,240,${Math.min(1, (exitT - 26) / 14)})`; x.fillRect(0, 0, W, H); } // Ausblitzen
  }

  let acc = 0, last = performance.now();
  function frame(now) {
    if (state === 'gone') return;
    io.raf(frame);
    if (io.stats) { const gap = now - (frame.prev || now); frame.prev = now; io.stats.n++; if (gap > 34) { io.stats.long++; (io.stats.at = io.stats.at || []).push([Math.round(performance.timeOrigin + now - gap), Math.round(gap)]); } io.stats.max = Math.max(io.stats.max, gap); if (io.stats.n % 60 === 0) io.emit({ stats: io.stats }); } // ?bootstats: Bildtakt messen
    acc += Math.min(100, now - last); last = now;
    let n = 0; while (acc >= 1000 / 60 && n < 4) { acc -= 1000 / 60; n++; update(); if (state === 'gone') return; }
    render();
  }
  return { resize, press, start() { render(); last = performance.now(); io.raf(frame); }, idle: () => { last = performance.now(); } };
}

var Boot = (() => {
  const B = { hold: true, cover: true, state: 'load', onExit: null, worker: false };
  const el = document.getElementById('boot');
  if (!el || /[?&]noboot\b/.test(location.search)) { if (el) el.remove(); B.hold = B.cover = false; B.state = 'gone'; return B; }
  const cv = el.querySelector('canvas');
  let lang = 'en';
  try {
    lang = ((navigator.languages && navigator.languages[0]) || navigator.language || 'en').slice(0, 2).toLowerCase();
    const o = JSON.parse(localStorage.getItem('nachtmahr.opts') || '{}'); if (o.lang) lang = o.lang;
  } catch (e) { /* privater Modus */ }
  const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches), build = String(window.BUILD || '');
  const measure = () => { // Pixelgröße und Leinwand-Maße (CSS) im Hauptthread
    const vw = window.innerWidth, vh = window.innerHeight;
    const PX = vw >= vh ? Math.max(2, Math.round(Math.min(vw / 420, vh / 236))) : Math.max(2, Math.round(Math.min(vw / 200, vh / 400)));
    const W = Math.ceil(vw / PX), H = Math.ceil(vh / PX);
    cv.style.width = W * PX + 'px'; cv.style.height = H * PX + 'px';
    el.style.setProperty('--s', PX + 'px'); el.style.setProperty('--a', (PX * 0.6) + 'px');
    return [W, H];
  };

  // ---------------- Fortschritt und Vorbau (Hauptthread) ----------------
  let loaded = false, loadT = 0, jobs = null, jobsN = 0, done = false;
  const gameReady = () => { try { return typeof Game !== 'undefined' && !!Game.ctx; } catch (e) { return false; } };
  window.addEventListener('load', () => { loaded = true; loadT = performance.now(); });
  const progress = () => { // 0–80 %: fertig geladene Skripte und Bilder, 80–100 %: Vorbau
    if (jobs) return 0.8 + 0.2 * (jobsN ? (jobsN - jobs.length) / jobsN : 1);
    if (loaded) return 0.8;
    let n = 0; const es = performance.getEntriesByType ? performance.getEntriesByType('resource') : [];
    for (const e of es) if (/\/(js|img)\/[^?]+\.(js|png)/.test(e.name)) n++;
    return Math.min(0.94, n / Math.max(36, n + 2)) * 0.8;
  };

  // ---------------- Animation: eigener Thread, sonst hier ----------------
  let eng = null, worker = null;
  const onEngine = (type) => {
    if (type && type.stats) { B.stats = type.stats; return; }
    if (type === 'ready') { if (B.state === 'load') B.state = 'ready'; }
    else if (type === 'done') finish();
  };
  const workerMain = function () { // läuft im Worker: Leinwand und Takt kommen per Nachricht
    let eng = null, prog = 0, ok = false;
    // Bildtakt: requestAnimationFrame des Workers – Chrome hält es aber an, solange der Hauptthread an einem großen Vorbau-
    // Stück rechnet; dann springt nach 24 ms ein Zeitgeber ein (was zuerst kommt, gilt), so läuft das Ladebild weiter
    const raf = (f) => {
      let done = false; const run = (t) => { if (!done) { done = true; f(typeof t === 'number' ? t : performance.now()); } };
      if (self.requestAnimationFrame) self.requestAnimationFrame(run);
      setTimeout(run, 24);
    };
    self.onmessage = (e) => {
      const m = e.data;
      if (m.init) {
        eng = bootEngine({ canvas: m.canvas, lang: m.lang, touch: m.touch, build: m.build, progress: () => prog, jobsDone: () => ok, stats: m.stats ? { n: 0, long: 0, max: 0 } : null,
          mk: (w, h) => { const c = new OffscreenCanvas(w, h); c.getContext('2d', { willReadFrequently: true }); return c; },
          emit: (t) => self.postMessage(t), raf });
        eng.resize(m.W, m.H); eng.start();
      } else if (m.size) eng.resize(m.W, m.H);
      else if (m.press) eng.press();
      else { prog = m.p; ok = m.done; }
    };
  };
  if (cv.transferControlToOffscreen && window.Worker && window.OffscreenCanvas && !/[?&]bootsync\b/.test(location.search)) {
    try {
      const url = URL.createObjectURL(new Blob(['"use strict";\n' + bootEngine.toString() + '\n(' + workerMain.toString() + ')();'], { type: 'text/javascript' }));
      worker = new Worker(url);
      const off = cv.transferControlToOffscreen(), [W, H] = measure();
      worker.onmessage = (e) => onEngine(e.data);
      worker.postMessage({ init: true, canvas: off, W, H, lang, touch, build, stats: /[?&]bootstats\b/.test(location.search) }, [off]);
      B.worker = true;
    } catch (e) { console.warn('Ladebildschirm ohne Worker', e); worker = null; }
  }
  if (!worker) {
    eng = bootEngine({ canvas: cv, lang, touch, build, progress, jobsDone: () => done, emit: onEngine, raf: (f) => requestAnimationFrame(f), stats: /[?&]bootstats\b/.test(location.search) ? { n: 0, long: 0, max: 0 } : null,
      mk: (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; } });
    const [W, H] = measure(); eng.resize(W, H); eng.start();
  }
  const send = (m) => { if (worker) worker.postMessage(m); };
  const onResize = () => { const [W, H] = measure(); if (worker) send({ size: true, W, H }); else eng.resize(W, H); };
  window.addEventListener('resize', onResize);

  // Taste, Klick oder Tippen: Ton freischalten (Nutzergeste – nur hier im Hauptthread möglich), dann der Abgang
  const press = () => {
    if (B.state !== 'ready') return;
    B.state = 'exit';
    try { if (typeof Audio8 !== 'undefined') { Audio8.init(); Audio8.sfx('thunder'); } } catch (e) { /* ohne Ton weiter */ }
    if (worker) send({ press: true }); else eng.press();
  };
  window.addEventListener('keydown', press); window.addEventListener('pointerdown', press);
  function finish() { // Ladebild steht ganz weiß: jetzt übernimmt der Titel (Logo-Einschlag), das Weiß blendet kurz aus
    B.state = 'gone'; B.cover = false; B.hold = false;
    try { if (B.onExit) B.onExit(); } catch (e) { /* Titel noch nicht da */ }
    el.classList.add('out'); setTimeout(() => el.remove(), 400); window.removeEventListener('resize', onResize);
    window.removeEventListener('keydown', press); window.removeEventListener('pointerdown', press);
    if (worker) worker.terminate();
  }

  // Vorbau: mit Worker in großen Stücken (die Animation läuft ja woanders) – inklusive allem, was sonst erst im Titel
  // nachgebaut würde; ohne Worker wie bisher etwa 10 ms pro Bild
  const pump = () => {
    if (B.state === 'gone') return;
    if (!jobs && loaded && gameReady()) {
      try { jobs = Game.bootJobs ? Game.bootJobs() : []; } catch (e) { console.warn(e); jobs = []; }
      if (worker && Game.warmJobs && Game.warmJobs.length) { jobs = jobs.concat(Game.warmJobs.splice(0)); Game.warmTotal = 0; }
      jobsN = jobs.length;
    }
    if (jobs && jobs.length) {
      const t0 = performance.now(), budget = worker ? 45 : 10;
      do { try { jobs.shift()(); } catch (e) { console.warn(e); } } while (jobs.length && performance.now() - t0 < budget);
      if (eng) eng.idle(); // die Zeit des Vorbaus nicht als Animationszeit nachholen
    }
    done = (!!jobs && !jobs.length) || (loaded && !gameReady() && performance.now() - loadT > 4000);
    send({ p: progress(), done });
    if (B.state === 'ready' && navigator.getGamepads) for (const p of navigator.getGamepads()) if (p && p.buttons.some(b => b.pressed)) { press(); break; }
    if (worker) setTimeout(pump, 4); else requestAnimationFrame(pump);
  };
  pump();
  return B;
})();
