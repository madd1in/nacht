// Prozedurale Kacheln (mit Schattierung, Dithering, Deko) und Parallax-Hintergründe pro Thema.
'use strict';

const Tiles = (() => {
  const cache = {};
  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const ri = (a, b) => a + Math.floor(rand() * (b - a + 1));
  const C = (w, h) => Sprites.canvas(w, h);
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
  const bay = (x, y) => BAY[(y & 3) * 4 + (x & 3)];
  function px(x, c, X, Y, w = 1, h = 1) { x.fillStyle = c; x.fillRect(X, Y, w, h); }

  const PALS = {
    courtyard: { a: ['#e0e0e8', '#acacb8', '#80808c', '#56566a', '#201c2c'], b: ['#d4d4e4', '#a0a0b8', '#747490', '#4c4c68', '#1c1c30'], moss: ['#2c6c1c', '#58a02c', '#9cd84c'] },
    hall: { a: ['#f08850', '#c85020', '#982010', '#601008', '#1c0404'], b: ['#d8d8d8', '#a8a8a8', '#7c7c7c', '#505050', '#1c1c1c'] },
    cave: { a: ['#d4a858', '#a07028', '#704818', '#44280c', '#180c04'], b: ['#bcbcbc', '#8c8c8c', '#646464', '#404040', '#141414'], moss: ['#1c5c2c', '#38983c', '#78d860'] },
    crypt: { a: ['#9cb4fc', '#6078cc', '#3c4c94', '#24305c', '#0a0e22'], b: ['#c8c8e4', '#9898b8', '#6c6c8c', '#46465e', '#141426'] },
    tower: { a: ['#c8c8c8', '#9a9a9a', '#6e6e6e', '#464646', '#141414'], b: ['#a4e4fc', '#3cbcfc', '#0078f8', '#0040a8', '#001038'] },
    throne: { a: ['#fce0a8', '#f8b800', '#a80020', '#680010', '#1c0008'], b: ['#e0d0fc', '#a088f8', '#6844fc', '#4428bc', '#120628'] },
    vortex: { a: ['#e8b8fc', '#a868d8', '#6c2c9c', '#401060', '#14041c'], b: ['#fca0cc', '#d84080', '#9c1c50', '#5c0c2c', '#1c0410'] },
    ship: { a: ['#e8b070', '#b87c44', '#8a5428', '#5a3214', '#1e0c04'], b: ['#dcb47c', '#a8783c', '#7a4c20', '#4a2a0c', '#160802'] },
  };

  // ---------------- Kacheln ----------------
  function stone(p, opts = {}) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      const v = ((15 - X) + (15 - y)) / 30;
      let col = md;
      if (v + bay(X, y) * 0.35 > 0.92) col = lt;
      else if (v - bay(X, y) * 0.35 < 0.12) col = dk;
      px(x, col, X, y);
    }
    px(x, hl, 0, 0, 15, 1); px(x, lt, 1, 1, 13, 1); px(x, hl, 0, 0, 1, 15); px(x, lt, 1, 1, 1, 13);
    px(x, dk, 1, 14, 15, 1); px(x, dk, 14, 1, 1, 14); px(x, sh, 0, 15, 16, 1); px(x, sh, 15, 0, 1, 16);
    for (let i = 0; i < 7; i++) px(x, rand() < 0.6 ? dk : lt, ri(3, 12), ri(3, 12));
    if (opts.crack) {
      let cx = ri(4, 11), cy = ri(2, 4);
      for (let i = 0; i < 8 && cy < 13; i++) { px(x, sh, cx, cy); px(x, lt, cx + 1, cy); cy++; cx += ri(-1, 1); }
    }
    if (opts.chip) { px(x, sh, 13, 0, 3, 2); px(x, sh, 15, 2, 1, 1); px(x, dk, 13, 2, 2, 1); }
    return c;
  }
  // Schiffsplanken: waagrechte Bohlen mit Stoßfugen, Nägeln und Maserung; top = Deck (helle Kante), hull = Rumpf
  function planks(p, opts = {}) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    px(x, sh, 0, 0, 16, 16);
    for (let r = 0; r < 4; r++) {
      const by = r * 4, joint = (ri(3, 12) + r * 5) % 16;
      px(x, opts.hull ? (r % 2 ? dk : md) : (rand() < 0.2 ? dk : md), 0, by, 16, 3);
      px(x, opts.hull ? md : lt, 0, by, 16, 1);
      for (let i = 0; i < 4; i++) px(x, opts.hull ? sh : dk, ri(0, 15), by + 1 + ri(0, 1), ri(2, 4), 1); // Maserung
      px(x, sh, joint, by, 1, 3); px(x, hl, (joint + 2) % 16, by + 1); // Fuge + Nagel
    }
    if (opts.top) { px(x, hl, 0, 0, 16, 1); px(x, lt, 0, 1, 16, 1); }
    return c;
  }
  function crate(p) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    px(x, md, 0, 0, 16, 16);
    for (let y = 3; y < 14; y += 3) px(x, dk, 2, y, 12, 1);
    for (let i = 0; i < 12; i++) px(x, lt, 2 + i, 13 - i, 2, 1); // Diagonalstrebe
    px(x, lt, 0, 0, 16, 2); px(x, lt, 0, 0, 2, 16); px(x, sh, 0, 14, 16, 2); px(x, sh, 14, 0, 2, 16);
    px(x, hl, 0, 0, 16, 1); px(x, hl, 0, 0, 1, 15);
    [[1, 1], [13, 1], [1, 13], [13, 13]].forEach(([X, Y]) => px(x, '#24242c', X, Y, 2, 2));
    return c;
  }
  function beam(p) { // Rah / Laufplanke: kräftige Bohle mit Tau-Bund
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    px(x, md, 0, 1, 16, 9); px(x, hl, 0, 1, 16, 1); px(x, lt, 0, 2, 16, 1); px(x, dk, 0, 8, 16, 1); px(x, sh, 0, 9, 16, 1);
    for (let i = 0; i < 3; i++) px(x, dk, ri(0, 13), ri(4, 6), ri(2, 4), 1);
    x.fillStyle = 'rgba(0,0,0,0.4)'; x.fillRect(0, 10, 16, 3);
    px(x, '#c8b088', 6, 1, 1, 9); px(x, '#8c7450', 8, 1, 1, 9);
    return c;
  }
  function bricks(p, opts = {}) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    px(x, sh, 0, 0, 16, 16);
    for (let r = 0; r < 4; r++) {
      const off = (r % 2) * 4;
      for (let b = -1; b < 3; b++) {
        const bx = b * 8 + off, by = r * 4, k = rand();
        const base = k < 0.15 ? dk : k > 0.88 ? lt : md;
        px(x, base, bx, by, 7, 3);
        px(x, k > 0.88 ? hl : lt, bx, by, 7, 1);
        px(x, dk, bx + 1, by + 2, 6, 1);
        px(x, k > 0.88 ? hl : lt, bx, by, 1, 2);
        if (rand() < 0.4) px(x, dk, bx + ri(2, 5), by + 1);
      }
    }
    if (opts.carpet) { // Thronsaal-Läufer
      px(x, '#1c0008', 0, 0, 16, 5); px(x, '#a80020', 0, 0, 16, 4); px(x, '#d82800', 0, 0, 16, 1);
      for (let i = 0; i < 16; i += 4) px(x, '#f8b800', i + 1, 2, 2, 1);
      px(x, '#f8b800', 0, 4, 16, 1);
    }
    return c;
  }
  function rock(p) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    px(x, sh, 0, 0, 16, 16);
    for (let i = 0; i < 6; i++) {
      const cx = ri(1, 14), cy = ri(1, 14), rx = ri(3, 6), ry = ri(2, 5);
      for (let y = -ry; y <= ry; y++) for (let X = -rx; X <= rx; X++) {
        const q = (X * X) / (rx * rx) + (y * y) / (ry * ry);
        if (q > 1) continue;
        const tx = (cx + X + 16) % 16, ty = (cy + y + 16) % 16;
        const l = -(X / rx + y / ry) * 0.5 + (1 - q) * 0.6;
        px(x, q > 0.8 ? dk : l > 0.55 ? hl : l > 0.25 ? lt : md, tx, ty);
      }
    }
    return c;
  }
  function stairTile(p, dir) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p;
    for (let X = 0; X < 16; X++) {
      const lx = dir > 0 ? X : 15 - X;
      const top = lx < 8 ? 8 : 0, bottom = Math.min(15, 15 - lx + 3);
      for (let y = top; y <= bottom; y++) {
        const d = y - top;
        px(x, d === 0 ? hl : d < 3 ? (lx % 8 === 0 ? lt : md) : y === bottom ? sh : dk, X, y);
      }
    }
    return c;
  }
  function spikes() {
    const c = C(16, 16), x = c.getContext('2d');
    px(x, '#141414', 0, 10, 16, 6); px(x, '#3c3c3c', 0, 10, 16, 1);
    for (let s = 0; s < 4; s++) for (let r = 0; r < 9; r++) {
      const half = Math.floor(r / 2), cx = s * 4 + 2;
      px(x, '#9c9c9c', cx - half, 1 + r, half * 2 + 1, 1);
      px(x, '#e0e0e0', cx - half, 1 + r, 1, 1);
      if (r < 2) px(x, '#a80020', cx, 1 + r, 1, 1);
    }
    return c;
  }
  function topper(theme, v) { // Deko über frei liegender Oberkante (16x6)
    const c = C(16, 6), x = c.getContext('2d');
    const m = (PALS[theme].moss) || ['#2c6c1c', '#58a02c', '#9cd84c'];
    if (theme === 'courtyard') {
      for (let X = 0; X < 16; X++) {
        const h = ri(1, 4) + (v % 2);
        px(x, m[0], X, 6 - h, 1, h); if (h > 2) px(x, m[1], X, 6 - h, 1, 1); if (h > 3 && rand() < 0.3) px(x, m[2], X, 6 - h, 1, 1);
      }
      if (v === 2) { px(x, '#d82800', 6, 1, 2, 2); px(x, '#f8b800', 6, 1, 1, 1); px(x, m[0], 7, 3, 1, 3); }
    } else if (theme === 'cave') {
      for (let X = 0; X < 16; X++) if (rand() < 0.7) { const h = ri(1, 2); px(x, m[0], X, 6 - h, 1, h); if (rand() < 0.4) px(x, m[1], X, 6 - h, 1, 1); }
      if (v === 1) { px(x, '#d8d8a0', 9, 2, 3, 1); px(x, '#a8a870', 10, 3, 1, 3); px(x, '#58f898', 10, 2, 1, 1); }
    } else return null;
    return c;
  }
  function hanger(theme, v) { // hängende Ranken / Spinnweben unter Kanten (16x10)
    const c = C(16, 10), x = c.getContext('2d');
    if (theme === 'courtyard' || theme === 'cave') {
      const m = PALS[theme].moss;
      for (let X = 0; X < 16; X++) {
        if (rand() > 0.55) continue;
        const len = ri(1, v === 0 ? 9 : 5);
        px(x, m[0], X, 0, 1, len); if (rand() < 0.5) px(x, m[1], X, len - 1, 1, 1);
      }
    } else if (theme === 'ship') { // Tauenden unter Rahen und Planken
      if (v === 2) return null;
      const X0 = v ? 11 : 4;
      for (let y = 0; y < (v ? 6 : 9); y++) px(x, '#3c2814', X0 + (y > 5 ? 1 : 0), y);
      px(x, '#5c4024', X0, 0, 1, 2); if (v) px(x, '#3c2814', X0 - 1, 6, 3, 2);
    } else if (theme === 'crypt' && v === 0) { // feine Spinnweben-Fäden
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, 16, 2);
      x.fillStyle = 'rgba(200,200,232,0.45)';
      for (let i = 0; i < 7; i++) { x.fillRect(3 + i, i, 1, 1); x.fillRect(12 - Math.floor(i / 2), i, 1, 1); }
      x.fillRect(4, 3, 6, 1); x.fillRect(6, 6, 4, 1); x.fillRect(9, 6, 1, 3);
    } else {
      x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, 16, 2);
    }
    return c;
  }

  // ---------------- Hintergrund-Helfer ----------------
  function gradient(x, w, h, cols, y0 = 0) {
    const seg = h / (cols.length - 1);
    for (let y = 0; y < h; y++) {
      const f = y / seg, i = Math.min(cols.length - 2, Math.floor(f)), t = f - i;
      for (let X = 0; X < w; X++) px(x, t > bay(X, y) ? cols[i + 1] : cols[i], X, y0 + y);
    }
  }
  // HDMA-Verlauf wie auf dem SNES: jede Rasterzeile bekommt ihre eigene, weich interpolierte Farbe
  function smooth(x, w, h, cols, y0 = 0) {
    const rgb = cols.map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
    const seg = h / (cols.length - 1);
    for (let y = 0; y < h; y++) {
      const f = y / seg, i = Math.min(cols.length - 2, Math.floor(f)), t = f - i;
      x.fillStyle = `rgb(${rgb[i].map((v, k) => Math.round(v + (rgb[i + 1][k] - v) * t))})`;
      x.fillRect(0, y0 + y, w, 1);
    }
  }
  function ditherDisc(x, cx, cy, r0, r1, col, maxD) {
    for (let y = -r1; y <= r1; y++) for (let X = -r1; X <= r1; X++) {
      const d = Math.hypot(X, y);
      if (d < r0 || d > r1) continue;
      const dens = (1 - (d - r0) / (r1 - r0)) * maxD;
      if (bay(cx + X, cy + y) < dens) px(x, col, cx + X, cy + y);
    }
  }
  function moon(x, cx, cy, r) {
    ditherDisc(x, cx, cy, r + 1, r + 18, '#3a0a24', 0.55);
    ditherDisc(x, cx, cy, r + 1, r + 8, '#6a1028', 0.5);
    const tones = ['#580818', '#a00820', '#d82800', '#f85838', '#fca088'];
    for (let y = -r; y <= r; y++) for (let X = -r; X <= r; X++) {
      const q = (X * X + y * y) / (r * r);
      if (q > 1) continue;
      const nz = Math.sqrt(1 - q), l = (-X / r * 0.55 - y / r * 0.45) * 0.8 + nz * 0.55;
      const k = Math.max(0, Math.min(4, Math.floor(l * 4.2 + bay(X + cx, y + cy) * 0.9)));
      px(x, tones[k], cx + X, cy + y);
    }
    const k = r / 24;
    [[-8, -4, 5], [6, 6, 4], [-2, 10, 3], [9, -9, 3], [-12, 7, 2]].forEach(([a, b, s]) => {
      const ox = cx + Math.round(a * k), oy = cy + Math.round(b * k), cr = Math.max(1, Math.round(s * k));
      for (let y = -cr; y <= cr; y++) for (let X = -cr; X <= cr; X++) {
        if (X * X + y * y > cr * cr || (ox + X - cx) ** 2 + (oy + y - cy) ** 2 > r * r) continue;
        px(x, (X + y) > cr * 0.6 ? '#fca088' : '#a00820', ox + X, oy + y);
      }
    });
  }
  function wallBricks(x, w, h, cols, bw = 16, bh = 8) {
    const [hl, md, dk] = cols;
    px(x, dk, 0, 0, w, h);
    for (let r = 0; r * bh < h; r++) for (let b = -1; b * bw < w; b++) {
      const bx = b * bw + (r % 2) * (bw / 2), k = rand();
      px(x, k < 0.2 ? dk : md, bx + 1, r * bh + 1, bw - 2, bh - 2);
      px(x, hl, bx + 1, r * bh + 1, bw - 2, 1);
      if (k > 0.85) px(x, hl, bx + ri(3, bw - 4), r * bh + ri(2, bh - 3));
    }
  }
  function shade(x, w, h, col, from, to) { // geditherte Abdunklung zwischen y=from (voll) und y=to (keine)
    for (let y = Math.min(from, to); y <= Math.max(from, to); y++) {
      const t = 1 - Math.abs(y - from) / Math.abs(to - from);
      for (let X = 0; X < w; X++) if (bay(X, y) < t * 0.75) px(x, col, X, y);
    }
  }
  // Rosette im Thronsaal: Lage in der Wandebene (512 px breit, Parallaxe 0.5) + Buntglas mit Bleiruten
  const ROSE = { x: 128, y: 66, r: 30 };
  function roseGlass(x, rx, ry, rr) {
    for (let y = -rr; y <= rr; y++) for (let X = -rr; X <= rr; X++) {
      const d = Math.hypot(X, y);
      if (d > rr) continue;
      const a = (Math.atan2(y, X) + Math.PI) / (Math.PI * 2), seg = Math.floor(a * 12), ring = Math.floor(d / rr * 3);
      const glass = [['#f8b800', '#a80020', '#0058f8'], ['#0058f8', '#d82800', '#00a800'], ['#a80020', '#6844fc', '#f8b800']][ring % 3][seg % 3];
      const lead = Math.abs(a * 12 - Math.round(a * 12)) < 0.06 || Math.abs(d / rr * 3 - Math.round(d / rr * 3)) < 0.08;
      px(x, lead ? '#140810' : glass, rx + X, ry + y);
    }
    px(x, '#f8b800', rx - 3, ry - 3, 6, 6);
  }
  // Mode-7: das Glas der Rosette dreht sich (in der Wutphase des Grafen schneller)
  let roseC = null, roseAng = 0, roseF = 0;
  function drawRose(ctx, cam, frame) {
    if (!roseC) { const R = ROSE.r; roseC = C(R * 2 + 2, R * 2 + 2); roseGlass(roseC.getContext('2d'), R + 1, R + 1, R); }
    const df = frame - roseF; roseF = frame; // an Spiel-Frames gekoppelt, nicht an die Bildwiederholrate
    if (df > 0 && df < 10) roseAng += df * (W.bossEnraged ? 0.03 : 0.004);
    const off = ((Math.floor(cam.x * 0.5) % 512) + 512) % 512, h = roseC.width / 2;
    for (let X = -off; X < View.w + 64; X += 512) {
      const cx = X + ROSE.x;
      if (cx < -40 || cx > View.w + 40) continue;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.translate(cx, ROSE.y); ctx.rotate(roseAng); ctx.drawImage(roseC, -h, -h);
      ctx.restore();
    }
  }

  function archWindow(x, wx, wy, ww, wh, inner) {
    const r = ww / 2;
    px(x, '#3c3c3c', wx - 4, wy - 1, ww + 8, wh + 5);
    for (let y = 0; y <= r + 3; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, (r + 4) ** 2 - (r + 4 - y) ** 2)));
      px(x, '#3c3c3c', wx + r - half, wy - r - 4 + y, half * 2, 1);
    }
    inner(wx, wy - r, ww, wh + r, (X, Y) => { // Maske: im Fenster?
      if (Y >= wy) return X >= wx && X < wx + ww && Y < wy + wh;
      const dy = wy - Y, half = Math.sqrt(Math.max(0, r * r - dy * dy));
      return X >= wx + r - half && X < wx + r + half;
    });
    px(x, '#7c7c7c', wx - 4, wy + wh, ww + 8, 2); px(x, '#5c5c5c', wx - 4, wy + wh + 2, ww + 8, 2);
    px(x, '#5c5c5c', wx + r - 1, wy - r, 2, wh + r); px(x, '#5c5c5c', wx, wy + Math.floor(wh / 2), ww, 2);
  }
  function lightShaft(x, sx, sy, w, len, col, dens) {
    for (let i = 0; i < len; i++) for (let X = 0; X < w; X++) {
      const fade = 1 - i / len;
      if (bay(sx + X + i, sy + i) < dens * fade) px(x, col, sx + X + Math.floor(i * 0.6), sy + i);
    }
  }
  function pillar(x, cx, w, h) {
    const tones = ['#1c1c1c', '#3c3c3c', '#5c5c5c', '#7c7c7c', '#9c9c9c', '#7c7c7c', '#5c5c5c', '#3c3c3c', '#2c2c2c', '#1c1c1c'];
    for (let X = 0; X < w; X++) px(x, tones[Math.floor(X / w * tones.length)], cx + X, 0, 1, h);
    [[18, 8], [h - 30, 8]].forEach(([y, hh]) => {
      px(x, '#2c2c2c', cx - 4, y, w + 8, hh); px(x, '#8c8c8c', cx - 4, y, w + 8, 1); px(x, '#5c5c5c', cx - 4, y + 1, w + 8, 2);
    });
  }
  function banner(x, bx, by, w, h, cloth, trim, emblem) {
    px(x, cloth, bx, by, w, h); px(x, trim, bx, by, w, 2); px(x, trim, bx, by, 1, h); px(x, trim, bx + w - 1, by, 1, h);
    for (let X = 0; X < w; X += 3) px(x, 'rgba(0,0,0,0.25)', bx + X + 1, by + 2, 1, h - 2);
    for (let i = 0; i < w / 2; i++) { px(x, cloth, bx + i, by + h + Math.floor(i * 0.7), w - i * 2, 1); }
    px(x, trim, bx + w / 2 - 3, by + 14, 6, 6); px(x, emblem, bx + w / 2 - 2, by + 15, 4, 4);
  }
  function stalactites(x, w, col, hi, n, maxLen, fromBottom, H) {
    for (let i = 0; i < n; i++) {
      const sx = ri(0, w - 12), len = ri(10, maxLen), bw = ri(5, 12);
      for (let r = 0; r < len; r++) {
        const ww = Math.max(1, Math.round(bw * (1 - r / len)));
        const y = fromBottom ? H - 1 - r : r;
        px(x, col, sx + Math.floor((bw - ww) / 2), y, ww, 1);
        px(x, hi, sx + Math.floor((bw - ww) / 2), y, 1, 1);
      }
    }
  }
  function gearImage(r, teeth, col, hi, rot) {
    const s = (r + 6) * 2, c = C(s, s), x = c.getContext('2d');
    for (let y = 0; y < s; y++) for (let X = 0; X < s; X++) {
      const dx = X - s / 2 + 0.5, dy = y - s / 2 + 0.5, d = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx) - rot;
      const tooth = Math.cos(a * teeth) > 0.2 ? 5 : 0;
      if (d > r + tooth || d < r * 0.25) continue;
      if (d > r * 0.55 && d < r * 0.75 && Math.cos(a * 4) > -0.3) continue; // Speichen-Löcher
      px(x, (dx + dy) < -r * 0.4 ? hi : col, X, y);
    }
    return c;
  }

  // ---------------- Turmuhr (16-Bit) ----------------
  const CLOCK = { x: 380, y: 66, r: 32 };
  const GOLDR = ['#3c2400', '#7c5000', '#b88018', '#f0c040', '#fcf0a0'];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const ROMAN = { I: ['1', '1', '1', '1', '1'], V: ['1.1', '1.1', '1.1', '1.1', '.1.'], X: ['1.1', '1.1', '.1.', '1.1', '1.1'] };
  const NUM = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  function clockFace(x, cx, cy, r) {
    // Uhrgehäuse mit Pendelkasten
    const bw = 22, by0 = cy + r + 2, bh = 46;
    px(x, '#140c08', cx - bw / 2 - 2, by0 - 4, bw + 4, bh + 6);
    for (let X = 0; X < bw; X++) px(x, ['#2c1c10', '#3c2814', '#4c3418', '#3c2814'][X % 4], cx - bw / 2 + X, by0 - 2, 1, bh);
    px(x, GOLDR[3], cx - bw / 2, by0 - 2, bw, 1); px(x, GOLDR[2], cx - bw / 2, by0 + bh - 2, bw, 2);
    px(x, '#06040a', cx - 7, by0 + 4, 14, bh - 12); // Glasfenster (Pendel wird live gezeichnet)
    px(x, '#20283c', cx - 7, by0 + 4, 1, bh - 12); px(x, GOLDR[2], cx - 8, by0 + 3, 16, 1); px(x, GOLDR[1], cx - 8, by0 + bh - 8, 16, 1);
    for (let y = -r - 7; y <= r + 7; y++) for (let X = -r - 7; X <= r + 7; X++) {
      const d = Math.hypot(X, y), a = Math.atan2(y, X);
      if (d > r + 7) continue;
      if (d > r + 3) { // Eisenrahmen mit Goldknäufen
        const knob = Math.abs(((a / (Math.PI * 2) * 24) % 1 + 1) % 1 - 0.5) < 0.18 && d < r + 6;
        const l = (-X - y) / d;
        px(x, knob ? GOLDR[l > 0.3 ? 4 : l > -0.3 ? 3 : 1] : (l > 0.4 ? '#4c4458' : l > -0.4 ? '#2c2838' : '#16141c'), cx + X, cy + y);
      } else if (d > r - 1) { // Goldlünette
        const l = (-X - y) / d * 0.6 + (d - (r - 1)) * -0.15;
        px(x, GOLDR[Math.max(0, Math.min(4, Math.round(2 + l * 2.2)))], cx + X, cy + y);
      } else { // Elfenbein-Zifferblatt mit weichem Verlauf
        const t = Math.min(1, Math.max(0, 0.35 + (y + X * 0.4) / (r * 2.2) + (d / r) * 0.35));
        const c = mix([248, 240, 212], [150, 136, 100], t);
        px(x, `rgb(${c})`, cx + X, cy + y);
        if (Math.abs(d - (r - 12)) < 0.5) px(x, '#8c7c54', cx + X, cy + y); // Ziffernring
        if (Math.abs(d - (r - 3.5)) < 0.5) px(x, '#6c5c3c', cx + X, cy + y); // Minutenring
      }
    }
    for (let i = 0; i < 60; i++) { // Minutenstriche
      const a = i / 60 * Math.PI * 2 - Math.PI / 2, rr = i % 5 ? r - 2.5 : r - 3.5;
      px(x, i % 5 ? '#5c4c30' : '#2c2014', cx + Math.round(Math.cos(a) * rr), cy + Math.round(Math.sin(a) * rr), i % 5 ? 1 : 2, i % 5 ? 1 : 2);
    }
    NUM.forEach((s, i) => { // römische Ziffern (3x5)
      const a = i / 12 * Math.PI * 2 - Math.PI / 2, w = [...s].reduce((n, ch) => n + ROMAN[ch][0].length + 1, -1);
      let nx = Math.round(cx + Math.cos(a) * (r - 8) - w / 2);
      const ny = Math.round(cy + Math.sin(a) * (r - 8) - 2);
      for (const ch of s) {
        ROMAN[ch].forEach((row, ry) => [...row].forEach((v, rx) => { if (v === '1') px(x, '#2c2014', nx + rx, ny + ry); }));
        nx += ROMAN[ch][0].length + 1;
      }
    });
    for (let y = -6; y <= 6; y++) for (let X = -6; X <= 6; X++) { // Rosette in der Mitte
      const d = Math.hypot(X, y), a = Math.atan2(y, X);
      if (d < 6 && d > 3 && Math.cos(a * 8) > 0.2) px(x, '#a89464', cx + X, cy + y);
    }
  }
  // Zeiger, Sekundenzeiger und Pendel – im selben Parallax-Raster wie die Wand (0.5)
  function drawClockLive(ctx, room, cam, frame) {
    const off = ((Math.floor(cam.x * 0.5) % 512) + 512) % 512;
    const vt = room.h > 13, oy = vt ? ((Math.floor(cam.y * 0.5) % 208) + 208) % 208 : 0;
    const { r } = CLOCK, sec = Math.floor(frame / 60), tick = frame % 60 < 4 ? 0.06 * (1 - (frame % 60) / 4) : 0;
    const hand = (cx, cy, a, len, w, col, tip) => {
      for (let i = -3; i <= len; i++) {
        const X = Math.round(cx + Math.cos(a) * i), Y = Math.round(cy + Math.sin(a) * i);
        ctx.fillStyle = col; ctx.fillRect(X - (w >> 1), Y - (w >> 1), w, w);
      }
      if (tip) { const X = Math.round(cx + Math.cos(a) * (len - 2)), Y = Math.round(cy + Math.sin(a) * (len - 2)); ctx.fillStyle = tip; ctx.fillRect(X - 1, Y - 1, 3, 3); }
    };
    for (let k = -1; k <= Math.ceil(View.w / 512); k++) for (const ty of oy ? [-oy, 208 - oy] : [0]) {
      const cx = CLOCK.x - off + k * 512, cy = CLOCK.y + ty;
      if (cx < -60 || cx > View.w + 60) continue;
      const mins = frame / 3600 * Math.PI * 2 + 1.9, hrs = mins / 12 + 4.1;
      hand(cx, cy, hrs - Math.PI / 2, r - 16, 3, '#1c140c', GOLDR[3]);
      hand(cx, cy, mins - Math.PI / 2, r - 7, 2, '#1c140c', GOLDR[3]);
      hand(cx, cy, (sec + tick) / 60 * Math.PI * 2 - Math.PI / 2, r - 4, 1, '#c81c1c', null);
      ctx.fillStyle = GOLDR[3]; ctx.fillRect(cx - 2, cy - 2, 4, 4); ctx.fillStyle = GOLDR[4]; ctx.fillRect(cx - 2, cy - 2, 2, 2);
      // Pendel im Kasten
      const py0 = cy + r + 6, pa = Math.sin(frame * Math.PI * 2 / 120) * 0.32;
      ctx.save(); ctx.beginPath(); ctx.rect(cx - 7, cy + r + 6, 14, 34); ctx.clip();
      for (let i = 0; i < 24; i++) { ctx.fillStyle = i % 3 ? '#8c6418' : '#c8a040'; ctx.fillRect(Math.round(cx + Math.sin(pa) * i), Math.round(py0 + Math.cos(pa) * i), 1, 1); }
      const bx = Math.round(cx + Math.sin(pa) * 26), by = Math.round(py0 + Math.cos(pa) * 26);
      ctx.fillStyle = GOLDR[1]; ctx.fillRect(bx - 4, by - 3, 8, 7); ctx.fillStyle = GOLDR[3]; ctx.fillRect(bx - 3, by - 3, 6, 5); ctx.fillStyle = GOLDR[4]; ctx.fillRect(bx - 2, by - 2, 2, 2);
      ctx.restore();
    }
  }

  // ---------------- Schiff: Meer mit Linescroll, Küste mit Burg, Takelage ----------------
  const SEA_Y = 122; // Horizont (Spielfeld-y)
  let coastC = null, waveC = null;
  // Sturmsee als Mode-7-Ozean mit Höhenfeld (Monsterwellen); nach dem Anlegen beruhigt sich das Wasser im Hafen
  // Hoch oben in der Takelage: Horizont sinkt etwas, die Mode-7-Kamera steigt – man blickt von oben aufs Meer
  function shipView(cam) { const lift = Math.max(0, W.room.h * T - 208 - cam.y); return { lift, hy: SEA_Y + Math.round(lift * 0.12) }; }
  function drawSea(ctx, cam, frame) {
    const v = shipView(cam);
    Mode7.drawOcean(ctx, View.w, frame, { camX: cam.x, sail: W.sailX || 0, calm: W.sail, rogue: W.rogue ? W.rogue.v : 0, kraken: W.kraken, flash: FX.stormOn(W.storm), lift: v.lift * 0.25, horizon: v.hy });
  }
  function buildCoast() {
    const c = C(260, 132), x = c.getContext('2d'), rock = '#0a0614', edge = '#1e1430', wall = '#07030e';
    for (let X = 0; X < 260; X++) { // Felsklippe
      const t = X / 259, top = Math.round(132 - Math.pow(Math.sin(t * Math.PI), 0.7) * 78 - Math.sin(X * 0.21) * 3 - Math.sin(X * 0.07) * 5);
      px(x, rock, X, top, 1, 132 - top); px(x, edge, X, top, 1, 1);
      if (rand() < 0.25) px(x, edge, X, top + ri(4, 40), 1, ri(2, 6));
    }
    const tw = (tx, ty, w, roof) => {
      px(x, wall, tx, ty, w, 132 - ty);
      if (roof) {
        for (let i = 0; i < w / 2 + 2; i++) px(x, wall, tx - 2 + i, ty - 1 - i * 2, Math.max(1, w + 4 - i * 2), 2);
        const top = ty - (w / 2 + 2) * 2;
        px(x, wall, tx + w / 2 - 1, top - 6, 1, 6); px(x, '#a80020', tx + w / 2, top - 6, 4, 2);
      } else for (let i = 0; i < w; i += 4) px(x, wall, tx + i, ty - 3, 2, 3);
      for (let i = 0; i < 3; i++) if (rand() < 0.8) { const wx = tx + 2 + ri(0, w - 5), wy = ty + 5 + ri(0, 30); px(x, '#f8b800', wx, wy, 1, 2); px(x, '#f87800', wx, wy + 2, 1, 1); }
    };
    px(x, wall, 70, 52, 120, 30);
    for (let i = 0; i < 120; i += 6) px(x, wall, 70 + i, 48, 3, 4);
    tw(66, 40, 14, true); tw(96, 30, 18, true); tw(128, 32, 22, true); tw(166, 36, 16, true); tw(188, 46, 12, false);
    tw(14, 100, 8, false); // Leuchtturm an der Hafeneinfahrt
    px(x, '#fce0a8', 16, 103, 4, 2);
    return c;
  }
  // Die Burg auf der Klippe rückt näher, je weiter man zum Bug läuft
  function drawCoast(ctx, cam) {
    if (!coastC) coastC = buildCoast();
    const end = Math.max(0, W.room.w * T - View.w);
    const X = Math.round(View.w * 0.66 - 130 + (end - cam.x) * 0.16);
    if (X < View.w && X > -270) ctx.drawImage(coastC, X, shipView(cam).hy + 2 - 132);
  }
  // ---------------- Takelage: hohe Masten, Wanten, Wimpel und riesige Segel ----------------
  // Segel werden zeilenweise gezeichnet (HDMA wie bei Mode 7): jede Zeile wird eigen verschoben und skaliert –
  // der Bauch bläht sich, eine Welle läuft das Tuch hinab, Böen reißen es kurz weiter auf. Das Wappen verformt sich mit.
  const BAT = ['..X.......X..', '.XX..X.X..XX.', 'XXXX.XXX.XXXX', 'XXXXXXXXXXXXX', 'X.XXXXXXXXX.X', '....XXXXX....', '.....X.X.....'];
  const sailTexCache = {};
  function sailTex(w, h, emblem) {
    const key = w + 'x' + h + (emblem ? 'e' : '');
    if (sailTexCache[key]) return sailTexCache[key];
    const c = C(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    const cols = [[156, 148, 128], [132, 124, 106], [104, 98, 84], [72, 68, 58]];
    const R = Math.min(w, h) * 0.3, ecx = w / 2, ecy = h * 0.48;
    let s = 3 + w + h * 7; const hr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const notch = Array.from({ length: Math.ceil(w / 14) + 1 }, () => 2 + Math.floor(hr() * 7)); // ausgefranster Saum
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      if (y >= h - notch[Math.floor(X / 14)]) continue;
      const u = X / w, v = y / h, b = bay(X, y);
      let k = Math.abs(u - 0.5) * 1.3 + v * 0.3 - Math.sin(v * Math.PI) * 0.15 + b * 0.35;
      if (X % 16 === 0 || y % 14 === 0) k += 0.45; // Bahnen und Nähte
      let col = cols[k > 1.05 ? 3 : k > 0.75 ? 2 : k > 0.45 ? 1 : 0];
      if (emblem) {
        const dx = X - ecx, dy = y - ecy, dd = Math.hypot(dx, dy);
        if (dd < R && b < 0.9 - (dd / R) * 0.25) col = dd < R - 2 ? [150 - (dd / R) * 40, 16, 24] : [90, 8, 16]; // Blutmond
        const sc = Math.max(1, Math.floor(R / 5)), bx = Math.floor(dx / sc + 6.5), by = Math.floor(dy / sc + 3.5);
        if (by >= 0 && by < 7 && bx >= 0 && bx < 13 && BAT[by][bx] === 'X') col = [18, 6, 14]; // Fledermaus
      }
      const i = (y * w + X) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return (sailTexCache[key] = c);
  }
  function drawSailM7(ctx, cx, top, w, h, t, emblem, gust) {
    if (h < 8) return;
    const tex = sailTex(w, h, emblem), step = View.lite ? 2 : 1;
    const B = 7 + 3 * Math.sin(t * 0.045) + gust * 9;
    for (let y = 0; y < h; y += step) {
      const v = y / h, belly = Math.sin(v * Math.PI);
      const sc = 1 + 0.07 * belly * (1 + 0.4 * Math.sin(t * 0.05)) + gust * 0.06 * belly; // Bauch wirkt näher → breiter
      const off = belly * B + Math.sin(y * 0.16 - t * 0.14) * 1.6 * v;                   // Welle läuft das Tuch hinab
      const ww = Math.round(w * sc);
      ctx.drawImage(tex, 0, y, w, step, Math.round(cx - ww / 2 + off), top + y, ww, step);
    }
  }
  function ropeLine(ctx, x0, y0, x1, y1, col) {
    const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) / 2);
    ctx.fillStyle = col;
    for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), 1, 2);
  }
  const yardW = (k) => Math.min(200, 100 + k * 30); // untere Rahen und Segel breiter
  function mastBase(room, mx) {
    const col = Math.floor(mx);
    for (let cy = 0; cy < room.h; cy++) if (room.grid[cy][col] === '#') return cy * T;
    return room.h * T;
  }
  function drawRig(ctx, cam, frame) {
    const room = W.room, g = room.grid, ox = Math.round(cam.x), oy = Math.round(cam.y);
    if (!room.rail) { // Reling hinter jeder freien Deck-Oberkante
      room.rail = [];
      for (let cx = 0; cx < room.w; cx++) for (let cy = 1; cy < room.h; cy++) if (g[cy][cx] === '#' && g[cy - 1][cx] === '.') room.rail.push([cx, cy]);
    }
    const c0 = Math.floor(cam.x / T) - 1, c1 = c0 + Math.ceil(View.w / T) + 2;
    for (const [cx, cy] of room.rail) {
      if (cx < c0 || cx > c1) continue;
      const X = cx * T - ox, Y = cy * T - oy;
      if (Y < -20 || Y > 230) continue;
      ctx.fillStyle = '#2c1808'; ctx.fillRect(X, Y - 13, 16, 3); ctx.fillRect(X + 3, Y - 11, 2, 11); ctx.fillRect(X + 11, Y - 11, 2, 11);
      ctx.fillStyle = '#6c4420'; ctx.fillRect(X, Y - 13, 16, 1);
    }
    const gust = W.gust || 0;
    (room.masts || []).forEach((m, i) => {
      const X = Math.round(m.x * T) - ox, half = yardW(m.yards.length - 1) / 2 + 40;
      if (X < -half || X > View.w + half) return;
      const base = mastBase(room, m.x) - oy, top = m.top * T - oy;
      if (top > 214 || base < -6) return;
      for (const s of [-1, 1]) ropeLine(ctx, X + s * 2, top + 10, X + s * (yardW(m.yards.length - 1) / 2 + 6), base - 12, '#24160c'); // Wanten
      ctx.fillStyle = '#2c1806'; ctx.fillRect(X - 3, top, 7, base - top);
      ctx.fillStyle = '#6c4420'; ctx.fillRect(X - 2, top, 2, base - top);
      ctx.fillStyle = '#4c2c10'; ctx.fillRect(X, top, 2, base - top);
      for (let k = 0; k < 28; k++) { // Wimpel am Mastkopf
        const yy = top + 2 + Math.round(Math.sin(k * 0.35 - frame * 0.18) * (k / 28) * 3);
        ctx.fillStyle = k % 9 < 6 ? '#a80020' : '#580010'; ctx.fillRect(X + 3 + k, yy, 1, Math.max(1, 5 - Math.floor(k / 6)));
      }
      for (let k = 0; k < m.yards.length - 1; k++) {
        const y0 = m.yards[k] * T - oy, y1 = m.yards[k + 1] * T - oy;
        if (y1 < -10 || y0 > 218) continue;
        drawSailM7(ctx, X, y0 + 4, yardW(k + 1) - 8, y1 - y0 - 6, frame + i * 37 + k * 13, m.emblem === k, gust);
      }
      m.yards.forEach((yr, k) => { // Rahen vor den Segeln
        const y = yr * T - oy, w = yardW(k);
        if (y < -8 || y > 214) return;
        ctx.fillStyle = '#2c1806'; ctx.fillRect(X - w / 2, y, w, 4);
        ctx.fillStyle = '#7c5028'; ctx.fillRect(X - w / 2, y, w, 1); ctx.fillStyle = '#4c2c10'; ctx.fillRect(X - w / 2, y + 1, w, 2);
      });
      const ly = m.yards[0] * T - oy + 6, lx = X + yardW(0) / 2 - 8; // Laterne an der obersten Rah
      ctx.fillStyle = '#1c1008'; ctx.fillRect(lx, ly, 5, 8);
      ctx.fillStyle = (frame >> 3) % 5 ? '#f8b800' : '#fce0a8'; ctx.fillRect(lx + 1, ly + 2, 3, 4);
    });
    if (room.wheel) { // Steuerrad auf dem Achterdeck
      const X = Math.round(room.wheel.x * T + 8) - ox, Y = room.wheel.y * T - 14 - oy, a = Math.sin(frame * 0.013) * 0.6;
      ctx.fillStyle = '#3c2410'; ctx.fillRect(X - 1, Y, 3, 14);
      for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; ctx.fillStyle = '#6c4420'; ctx.fillRect(Math.round(X + Math.cos(an) * 6), Math.round(Y + Math.sin(an) * 6), 1, 1); }
      for (let k = 0; k < 8; k++) {
        const an = a + k * Math.PI / 4;
        for (let r = 1; r <= 9; r++) { ctx.fillStyle = r > 6 ? '#8c5c2c' : '#5c3818'; ctx.fillRect(Math.round(X + Math.cos(an) * r), Math.round(Y + Math.sin(an) * r), 1, 1); }
      }
      ctx.fillStyle = '#c8a040'; ctx.fillRect(X - 1, Y - 1, 3, 3);
    }
  }
  // Lichter der Mast-Laternen (für FX.render)
  function shipLights(L, cam) {
    (W.room.masts || []).forEach(m => {
      const X = Math.round(m.x * T - cam.x) + yardW(0) / 2 - 6, Y = m.yards[0] * T + 10 - cam.y;
      if (X > -60 && X < View.w + 60 && Y > -60 && Y < 270) L.push({ x: X, y: Y, r: 30, c: [248, 160, 60], a: 0.5 });
    });
  }
  // Strickleiter (Wanten) statt Holzstufen: zwei Taue entlang der Schräge, Sprossen dazwischen
  function ratline(dir) {
    const c = C(16, 16), x = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      const X = dir > 0 ? i : 15 - i, Y = 15 - i;
      px(x, '#5c4024', X, Y); if (Y - 7 >= 0) px(x, '#5c4024', X, Y - 7);
      if (i % 4 === 1) { px(x, '#a88c60', X, Math.max(0, Y - 7), 1, 7); px(x, '#c8b088', X, Math.max(0, Y - 7), 1, 1); }
    }
    return c;
  }
  // Brandung vor dem Rumpf (zwei Wellenreihen, fahren mit dem Schiff)
  function buildWaves() {
    const c = C(256, 20), x = c.getContext('2d');
    for (let X = 0; X < 256; X++) {
      const a = X / 256 * Math.PI * 2, top = Math.round(8 + Math.sin(a * 4) * 3 + Math.sin(a * 9 + 1) * 1.5);
      px(x, '#060a1e', X, top, 1, 20 - top); px(x, '#2c3470', X, top, 1, 1);
      if (Math.sin(a * 4) > 0.6 && bay(X, 0) > 0.4) px(x, '#a4b4e4', X, top - 1, 1, 1);
    }
    return c;
  }
  function drawShipFront(ctx, room, cam, frame) {
    if (!waveC) waveC = buildWaves();
    const sail = W.sailX || 0, base = room.h * T - Math.round(cam.y);
    [[1.2, 1.6, 10, 0], [1.45, 2.3, 4, 2.1]].forEach(([par, sp, dy, ph]) => {
      const off = ((Math.floor(cam.x * par + sail * sp + frame * 0.2) % 256) + 256) % 256;
      const y = base - 20 + dy + Math.round(Math.sin(frame * 0.045 + ph) * 2);
      for (let X = -off; X < View.w; X += 256) ctx.drawImage(waveC, X, y);
    });
  }

  // ---------------- Hintergründe ----------------
  function buildBg(theme) {
    seed = 7;
    const L = [];
    const add = (name, c, par, extra = {}) => L.push({ name, c, par, wrap: c.width >= 512, ...extra });
    if (theme === 'vortex') {
      L.push({ name: 'tunnel', tunnel: true, par: 0, c: C(1, 1) });
    } else if (theme === 'ship') { // nachts auf See: Sturmhimmel, Blutmond, Burg auf der Klippe, Meer, Takelage
      const sky = C(640, 208), x = sky.getContext('2d');
      smooth(x, 640, 208, ['#000000', '#02020c', '#060818', '#0c0e26', '#141436', '#1e1a44', '#2a1e4c', '#3a2250', '#4a2450']);
      for (let i = 0; i < 120; i++) { const b = rand(); px(x, b < 0.2 ? '#fcfcfc' : b < 0.6 ? '#9c9cbc' : '#5c5c7c', ri(0, 639), ri(0, 110)); }
      add('sky', sky, 0, { wrap: false });
      const mc = C(96, 96);
      moon(mc.getContext('2d'), 48, 48, 22);
      add('moon', mc, 0, { wrap: false, right: 92, y: 4 });
      const sc = C(512, 208), sx2 = sc.getContext('2d');
      for (let i = 0; i < 40; i++) {
        const cx = ri(0, 511), cy = ri(-6, 40), rx = ri(14, 34), ry = ri(6, 14);
        for (let y = -ry; y <= ry; y++) for (let X = -rx; X <= rx; X++) {
          const q = (X * X) / (rx * rx) + (y * y) / (ry * ry);
          if (q > 1 || bay(X + cx, y + cy) < (q - 0.7) * 3) continue;
          px(sx2, y > ry * 0.45 ? '#241a46' : '#0e0a22', (cx + X + 512) % 512, cy + y);
        }
      }
      add('storm', sc, 0.08, { drift: 0.1, sail: 0.35 });
      const cl = C(512, 208), cx = cl.getContext('2d');
      for (let i = 0; i < 8; i++) {
        const y = ri(30, 96), x0 = ri(0, 511), len = ri(50, 140), th = ri(2, 4);
        for (let X = 0; X < len; X++) {
          const t = Math.sin(X / len * Math.PI), hh = Math.max(1, Math.round(th * t));
          for (let k = 0; k < hh; k++) if (bay(X, k) < t * 0.9) px(cx, k === 0 ? '#34205a' : '#1e1440', (x0 + X) % 512, y + k);
        }
      }
      add('clouds', cl, 0.04, { drift: 0.04, sail: 0.18 });
      L.push({ name: 'coast', custom: drawCoast, par: 0, c: C(1, 1) });
      L.push({ name: 'sea', custom: drawSea, par: 0, c: C(1, 1) });
      L.push({ name: 'rig', custom: drawRig, par: 1, c: C(1, 1) });
    } else if (theme === 'courtyard') {
      const sky = C(640, 208), x = sky.getContext('2d');
      smooth(x, 640, 208, ['#000000', '#05010f', '#0c031c', '#160629', '#220a36', '#320e44', '#461250', '#5a1658', '#6c1c5c']);
      for (let i = 0; i < 160; i++) {
        const sx = ri(0, 639), sy = ri(0, 120), b = rand();
        px(x, b < 0.2 ? '#fcfcfc' : b < 0.6 ? '#9c9cbc' : '#5c5c7c', sx, sy);
        if (b < 0.06) { px(x, '#7c7c9c', sx - 1, sy); px(x, '#7c7c9c', sx + 1, sy); px(x, '#7c7c9c', sx, sy - 1); px(x, '#7c7c9c', sx, sy + 1); }
      }
      add('sky', sky, 0, { wrap: false });
      const mc = C(96, 96);
      moon(mc.getContext('2d'), 48, 48, 24);
      add('moon', mc, 0, { wrap: false, right: 70, y: -2 });
      const sc = C(512, 208), sx2 = sc.getContext('2d'); // Sturmwolkenbank
      for (let i = 0; i < 46; i++) {
        const cx = ri(0, 511), cy = ri(-6, 34), rx = ri(14, 34), ry = ri(6, 14);
        for (let y = -ry; y <= ry; y++) for (let X = -rx; X <= rx; X++) {
          const q = (X * X) / (rx * rx) + (y * y) / (ry * ry);
          if (q > 1 || bay(X + cx, y + cy) < (q - 0.7) * 3) continue;
          px(sx2, y > ry * 0.45 ? '#2a1240' : '#120620', (cx + X + 512) % 512, cy + y);
        }
      }
      add('storm', sc, 0.08, { drift: 0.32 });
      const cl = C(512, 208), cx = cl.getContext('2d');
      for (let i = 0; i < 9; i++) {
        const y = ri(28, 96), x0 = ri(0, 511), len = ri(50, 140), th = ri(2, 4);
        for (let X = 0; X < len; X++) {
          const t = Math.sin(X / len * Math.PI), hh = Math.max(1, Math.round(th * t));
          for (let k = 0; k < hh; k++) if (bay(X, k) < t * 0.9) px(cx, k === 0 ? '#3c1450' : '#24083a', (x0 + X) % 512, y + k);
        }
      }
      add('clouds', cl, 0.04, { drift: 0.06 });
      const mt = C(512, 208), mx = mt.getContext('2d');
      for (let X = 0; X < 512; X++) {
        const a = X / 512 * Math.PI * 2;
        const top = Math.round(118 + Math.sin(a * 3) * 10 + Math.sin(a * 7 + 1) * 6 + Math.sin(a * 13) * 3);
        px(mx, '#1a0828', X, top, 1, 208 - top); px(mx, '#3c1450', X, top, 1, 1);
      }
      add('mountains', mt, 0.1);
      const cs = C(512, 208), x2 = cs.getContext('2d'), col = '#12061a';
      const tower = (tx, ty, tw, roof) => {
        px(x2, col, tx, ty, tw, 208 - ty);
        if (roof) {
          for (let i = 0; i < tw / 2 + 2; i++) px(x2, col, tx - 2 + i, ty - 1 - i * 2, Math.max(1, tw + 4 - i * 2), 2);
          const top = ty - (tw / 2 + 2) * 2;
          px(x2, col, tx + tw / 2 - 1, top - 6, 1, 6); px(x2, '#a80020', tx + tw / 2, top - 6, 4, 2); px(x2, '#a80020', tx + tw / 2, top - 4, 2, 1);
        } else for (let i = 0; i < tw; i += 4) px(x2, col, tx + i, ty - 3, 2, 3);
        for (let i = 0; i < 4; i++) if (rand() < 0.75) {
          const wx = tx + 2 + ri(0, tw - 5), wy = ty + 6 + ri(0, 50);
          px(x2, '#f8b800', wx, wy, 1, 2); px(x2, '#f87800', wx, wy + 2, 1, 1);
        }
      };
      px(x2, col, 150, 120, 300, 88);
      for (let i = 0; i < 300; i += 6) px(x2, col, 150 + i, 116, 3, 4);
      tower(150, 80, 18, true); tower(200, 60, 22, true); tower(250, 30, 28, true); tower(300, 70, 16, false);
      tower(340, 45, 24, true); tower(390, 90, 18, false); tower(430, 75, 14, true); tower(30, 110, 14, true); tower(60, 125, 20, false);
      for (let a = 0; a < 5; a++) { // Brücke mit Bögen
        px(x2, col, 80 + a * 14, 150, 14, 4);
        for (let y = 0; y < 8; y++) { const half = Math.round(Math.sqrt(Math.max(0, 25 - (y - 4) ** 2))); px(x2, col, 80 + a * 14, 154 + y, 7 - half, 1); px(x2, col, 87 + a * 14 + half, 154 + y, 7 - half, 1); }
      }
      for (let i = 0; i < 22; i++) { const wx = 160 + ri(0, 280), wy = 125 + ri(0, 50); px(x2, '#f8b800', wx, wy, 1, 2); }
      add('castle', cs, 0.25);
      const nr = C(512, 208), x3 = nr.getContext('2d');
      const tree = (tx) => {
        for (let y = 60; y < 180; y++) px(x3, '#000', tx + (y < 90 ? Math.round(Math.sin(y / 9)) : 0), y, 6 - (y < 80 ? 2 : 0), 1);
        const branch = (bx, by, dx, len, depth) => {
          for (let i = 0; i < len; i++) px(x3, '#000', bx + i * dx, by - Math.floor(i * 0.7), depth > 0 ? 2 : 1, 1);
          if (depth > 0) { branch(bx + len * dx, by - Math.floor(len * 0.7), dx, Math.floor(len * 0.6), depth - 1); branch(bx + Math.floor(len / 2) * dx, by - Math.floor(len * 0.35), -dx, Math.floor(len * 0.4), 0); }
        };
        branch(tx + 5, 100, 1, 18, 2); branch(tx, 90, -1, 16, 2); branch(tx + 4, 75, 1, 10, 1); branch(tx + 1, 122, -1, 20, 1);
      };
      tree(70); tree(330); tree(460);
      for (let i = 0; i < 512; i += 6) {
        px(x3, '#2a2636', i, 146, 2, 30); px(x3, '#4c4458', i, 146, 1, 30);
        px(x3, '#5c5468', i, 141, 2, 1); px(x3, '#4c4458', i - 1, 143, 4, 1); px(x3, '#4c4458', i, 142, 2, 3);
      }
      px(x3, '#2a2636', 0, 152, 512, 2); px(x3, '#2a2636', 0, 168, 512, 2); px(x3, '#4c4458', 0, 152, 512, 1);
      [[120, 18], [250, 14], [395, 16], [20, 12]].forEach(([gx, gh]) => { // Grabsteine
        px(x3, '#3c3848', gx, 176 - gh, 10, gh); px(x3, '#3c3848', gx + 1, 175 - gh, 8, 1); px(x3, '#5c5868', gx, 176 - gh, 1, gh); px(x3, '#5c5868', gx + 1, 175 - gh, 7, 1);
        px(x3, '#24202c', gx + 4, 179 - gh, 2, 8); px(x3, '#24202c', gx + 2, 181 - gh, 6, 2);
      });
      add('near', nr, 0.6);
    } else if (theme === 'hall' || theme === 'throne') {
      const c = C(512, 208), x = c.getContext('2d');
      if (theme === 'hall') wallBricks(x, 512, 208, ['#5c2414', '#3c1008', '#140000']);
      else wallBricks(x, 512, 208, ['#4c1430', '#300818', '#0c0008'], 24, 12);
      const vtile = theme === 'hall';
      shade(x, 512, 208, '#000000', 0, 50);
      if (theme === 'hall') {
        [64, 320].forEach((wx, wi) => {
          archWindow(x, wx, 56, 32, 72, (X0, Y0, w, h, inside) => {
            for (let y = Y0; y < Y0 + h; y++) for (let X = X0; X < X0 + w; X++) if (inside(X, y)) px(x, (y - Y0) / h > bay(X, y) ? '#000060' : '#00002c', X, y);
            if (wi === 0) moon(x, wx + 22, 66, 7);
            for (let i = 0; i < 6; i++) px(x, '#fcfcfc', wx + ri(2, 29), ri(46, 120));
          });
          for (let k = 0; k < 2; k++) {
            const cx = k ? wx + 34 : wx - 10;
            for (let X = 0; X < 8; X++) px(x, ['#680010', '#a80020', '#d82800', '#a80020'][X % 4], cx + X, 40, 1, 100 + (X % 2) * 2);
            px(x, '#f8b800', cx, 104, 8, 2);
          }
          lightShaft(x, wx, 130, 32, 46, '#3c4ca8', 0.32);
        });
        banner(x, 200, 20, 22, 70, '#a80020', '#f8b800', '#fce0a8');
        banner(x, 456, 20, 22, 70, '#a80020', '#f8b800', '#fce0a8');
      } else {
        const { x: rx, y: ry, r: rr } = ROSE; // Rosette: Steinrahmen hier, das Glas dreht sich als eigene Ebene (drawRose)
        for (let y = -rr - 4; y <= rr + 4; y++) for (let X = -rr - 4; X <= rr + 4; X++) {
          const d = Math.hypot(X, y);
          if (d > rr && d <= rr + 4) px(x, '#7c7c7c', rx + X, ry + y);
        }
        roseGlass(x, rx, ry, rr);
        [[40, '#2c0838'], [392, '#2c0838']].forEach(([wx]) => archWindow(x, wx, 50, 24, 80, (X0, Y0, w, h, inside) => {
          for (let y = Y0; y < Y0 + h; y++) for (let X = X0; X < X0 + w; X++) if (inside(X, y)) px(x, ['#a80020', '#0058f8', '#f8b800', '#00a800'][(Math.floor((X - X0) / 6) + Math.floor((y - Y0) / 12)) % 4], X, y);
        }));
        lightShaft(x, 110, 100, 36, 70, '#a8287c', 0.22);
        banner(x, 200, 10, 26, 96, '#4428bc', '#f8b800', '#a80020');
        banner(x, 300, 10, 26, 96, '#4428bc', '#f8b800', '#a80020');
      }
      [0, 236, 488].forEach(cx => pillar(x, cx, 22, 208));
      add('wall', c, 0.5, { vtile });
      if (theme === 'throne') { // Kronleuchter vorne
        const n = C(512, 208), x2 = n.getContext('2d');
        [100, 360].forEach(cx => {
          px(x2, '#3c3c3c', cx, 0, 1, 30);
          px(x2, '#5c4c1c', cx - 20, 30, 41, 3); px(x2, '#f8b800', cx - 20, 30, 41, 1);
          for (let i = -2; i <= 2; i++) {
            const kx = cx + i * 10;
            px(x2, '#fce0a8', kx - 1, 24, 3, 6); px(x2, '#f8b800', kx, 20, 1, 3); px(x2, '#fcfcfc', kx, 19, 1, 1);
            ditherDisc(x2, kx, 20, 1, 6, '#f87800', 0.35);
          }
          px(x2, '#5c4c1c', cx - 2, 33, 5, 6);
        });
        add('chandelier', n, 0.75);
      }
    } else if (theme === 'cave') {
      const f = C(512, 208), x = f.getContext('2d');
      smooth(x, 512, 208, ['#0a0402', '#140a04', '#1c0e06', '#140a04', '#080402']);
      for (let i = 0; i < 90; i++) {
        const bx = ri(0, 511), by = ri(20, 200), r = ri(3, 12);
        for (let y = -r; y <= r; y++) for (let X = -r; X <= r; X++) if (X * X + y * y <= r * r) px(x, (X + y) < -r * 0.6 ? '#2c1a0c' : '#1e1008', (bx + X + 512) % 512, by + y);
      }
      stalactites(x, 512, '#1e1008', '#2c1a0c', 26, 50, false, 208);
      add('far', f, 0.3, { vtile: true });
      const n = C(512, 208), x2 = n.getContext('2d');
      stalactites(x2, 512, '#2a160a', '#4a2c14', 14, 70, false, 208);
      stalactites(x2, 512, '#2a160a', '#4a2c14', 10, 40, true, 208);
      for (let i = 0; i < 9; i++) { // Leuchtkristalle
        const kx = ri(10, 500), ky = ri(40, 150), h = ri(5, 10);
        ditherDisc(x2, kx, ky - h / 2, 1, 10, '#14506c', 0.3);
        for (let r = 0; r < h; r++) { const w = Math.max(1, Math.round((1 - r / h) * 4)); px(x2, '#3cbcfc', kx - Math.floor(w / 2), ky - r, w, 1); px(x2, '#a4e4fc', kx - Math.floor(w / 2), ky - r, 1, 1); }
      }
      add('near', n, 0.55, { vtile: true });
    } else if (theme === 'crypt') {
      const c = C(512, 208), x = c.getContext('2d');
      wallBricks(x, 512, 208, ['#283460', '#161e40', '#04040c']);
      shade(x, 512, 208, '#000000', 0, 60);
      for (let n = 0; n < 6; n++) {
        const nx = 20 + n * 84, ny = 44 + (n % 2) * 34;
        for (let y = 0; y < 44; y++) {
          const half = y < 11 ? Math.round(Math.sqrt(121 - (11 - y) ** 2)) : 11;
          px(x, '#03030a', nx + 11 - half, ny + y, half * 2, 1);
        }
        px(x, '#3c4c94', nx - 2, ny + 44, 26, 2);
        for (let k = 0; k < 3; k++) { // Schädelhaufen
          const sx = nx + 2 + k * 6, sy = ny + 32 - (k === 1 ? 6 : 0);
          px(x, '#b4b4c8', sx, sy, 6, 5); px(x, '#e0e0f0', sx, sy, 6, 1); px(x, '#03030a', sx + 1, sy + 2, 1, 1); px(x, '#03030a', sx + 4, sy + 2, 1, 1); px(x, '#8c8ca4', sx + 1, sy + 5, 4, 2);
        }
        px(x, '#fce0a8', nx + 10, ny + 18, 2, 4); px(x, '#f8b800', nx + 10, ny + 15, 2, 2); ditherDisc(x, nx + 11, ny + 17, 1, 9, '#5c3c1c', 0.35);
      }
      for (let i = 0; i < 5; i++) { const cx = ri(0, 500), len = ri(20, 60); for (let y = 0; y < len; y += 3) px(x, y % 6 ? '#3c3c4c' : '#6c6c7c', cx, y, 2, 2); }
      add('wall', c, 0.5, { vtile: true });
    } else if (theme === 'tower') {
      const c = C(512, 208), x = c.getContext('2d');
      wallBricks(x, 512, 208, ['#34343c', '#202028', '#08080c']);
      shade(x, 512, 208, '#000000', 0, 40);
      clockFace(x, CLOCK.x, CLOCK.y, CLOCK.r); // prunkvolles Zifferblatt (Zeiger + Pendel werden live gezeichnet)
      [40, 250, 470].forEach(wx => { px(x, '#000', wx, 40, 6, 30); px(x, '#a80020', wx + 1, 46, 4, 6); lightShaft(x, wx, 70, 6, 60, '#5c0818', 0.4); });
      add('wall', c, 0.5, { vtile: true });
      const frames = [];
      for (let f = 0; f < 8; f++) {
        const g = C(512, 208), gx = g.getContext('2d');
        const rot = f / 8 * (Math.PI * 2 / 8);
        [[90, 70, 34, 8, 1], [150, 140, 22, 8, -1.5], [280, 150, 26, 8, 1.2], [460, 160, 18, 8, -2]].forEach(([X, Y, R, t, sp]) => {
          const im = gearImage(R, t, '#2c2c34', '#4c4c58', rot * sp);
          gx.drawImage(im, X - im.width / 2, Y - im.height / 2);
          px(gx, '#6c6c78', X - 2, Y - 2, 4, 4);
        });
        frames.push(g);
      }
      L.push({ name: 'gears', c: frames[0], frames, fps: 6, par: 0.5, wrap: true, vtile: true });
    }
    return L;
  }

  // ---------------- Aufbau & Zeichnen ----------------
  function build(theme) {
    if (cache[theme]) return cache[theme];
    seed = 42;
    const p = PALS[theme];
    const gen = { vortex: (o) => stone(p.a, o), courtyard: (o) => stone(p.a, o), hall: (o) => bricks(p.a, o), cave: () => rock(p.a), crypt: (o) => bricks(p.a, o), tower: (o) => stone(p.a, o), throne: (o) => bricks(p.a, o), ship: () => planks(p.a, { hull: true }) }[theme];
    const ground = [gen({}), gen({ crack: true }), gen({ chip: true }), gen({})];
    const groundTop = theme === 'throne' ? [0, 1, 2, 3].map(() => bricks(p.a, { carpet: true }))
      : theme === 'ship' ? [0, 1, 2, 3].map(() => planks(p.a, { top: true })) : ground;
    const alt = theme === 'ship' ? [beam(p.b), beam(p.b), beam(p.b)] : [stone(p.b, {}), stone(p.b, { crack: true }), stone(p.b, {})];
    const t = {
      ground, groundTop, alt,
      X: stone(p.b, { crack: true, chip: true }), Y: stone(p.b, { crack: true, chip: true }),
      spikes: spikes(), up: theme === 'ship' ? ratline(1) : stairTile(p.b, 1), down: theme === 'ship' ? ratline(-1) : stairTile(p.b, -1),
      toppers: [0, 1, 2, 3].map(v => topper(theme, v)), hangers: [0, 1, 2].map(v => hanger(theme, v)),
      bg: buildBg(theme), crate: theme === 'ship' ? crate(p.b) : null,
    };
    cache[theme] = t;
    return t;
  }

  function layer(theme, name) { return build(theme).bg.find(l => l.name === name); }

  function drawLayer(ctx, l, cam, frame, vt = false) {
    if (l.tunnel) { Mode7.drawTunnel(ctx, View.w, frame); return; }
    if (l.custom) { l.custom(ctx, cam, frame); return; }
    const img = l.frames ? l.frames[Math.floor(frame / (60 / l.fps)) % l.frames.length] : l.c;
    if (l.right !== undefined) { ctx.drawImage(img, Math.round(View.w - l.right - img.width / 2), l.y || 0); return; }
    if (!l.wrap) { ctx.drawImage(img, 0, 0); return; }
    const off = ((Math.floor(cam.x * l.par + (l.drift ? frame * l.drift : 0) + (l.sail ? (W.sailX || 0) * l.sail : 0)) % img.width) + img.width) % img.width;
    const oy = vt && l.vtile ? ((Math.floor(cam.y * l.par) % img.height) + img.height) % img.height : 0;
    for (const yy of oy ? [-oy, img.height - oy] : [0]) {
      for (let x = -off; x < View.w; x += img.width) ctx.drawImage(img, x, yy);
    }
  }

  // onSky: wird nach den Himmelsebenen aufgerufen (Blitze hinter Burg & Bäumen)
  function drawBg(ctx, room, cam, frame = 0, onSky = null) {
    const vt = room.h > 13;
    build(room.theme).bg.forEach(l => {
      drawLayer(ctx, l, cam, frame, vt);
      if (onSky && l.name === 'clouds') onSky(ctx);
      if (l.name === 'wall' && room.theme === 'throne') drawRose(ctx, cam, frame);
    });
    if (room.theme === 'tower') drawClockLive(ctx, room, cam, frame);
    if (room.theme === 'throne' && W.vortexBg > 0) Mode7.drawTunnel(ctx, View.w, frame, Math.min(1, W.vortexBg / 90)); // Graf Phase 2
  }

  // ---------------- Vordergrund-Silhouetten (Parallax 1.3) ----------------
  const fronts = {};
  function buildFront(theme) {
    seed = 913;
    const c = C(640, 208), x = c.getContext('2d'), dark = '#05020a';
    if (theme === 'courtyard') {
      for (let X = 0; X < 640; X++) { const h = 3 + Math.round(Math.abs(Math.sin(X * 0.21) * 4 + Math.sin(X * 0.07) * 3)); px(x, dark, X, 208 - h, 1, h); }
      [60, 300, 520].forEach(bx => { for (let i = 0; i < 26; i++) px(x, dark, bx + i, 190 + Math.abs(13 - i) / 2, 1, 18); });
      [140, 430].forEach(tx => { for (let i = 0; i < 70; i++) px(x, dark, tx + i, Math.floor(i * 0.35), 3, 2); for (let i = 0; i < 20; i++) px(x, dark, tx + 30 + i, 12 + i, 1, 1); });
    } else if (theme === 'hall' || theme === 'throne') {
      [0, 320].forEach(cx => {
        for (let X = 0; X < 120; X++) { const h = 10 + Math.round(Math.sin(X / 120 * Math.PI) * -6 + 6 + (X % 8 < 4 ? 1 : 0)); px(x, '#1c0006', cx + X, 0, 1, h + 10); px(x, '#3c0010', cx + X, h + 9, 1, 1); }
        px(x, '#a87000', cx + 2, 0, 2, 30); px(x, '#a87000', cx + 116, 0, 2, 30);
      });
    } else if (theme === 'cave') {
      for (let i = 0; i < 12; i++) { const sx = ri(0, 620), len = ri(12, 36), w = ri(6, 14); for (let r = 0; r < len; r++) px(x, dark, sx + Math.floor((w - w * (1 - r / len)) / 2), r, Math.max(1, Math.round(w * (1 - r / len))), 1); }
      for (let i = 0; i < 9; i++) { const sx = ri(0, 620), w = ri(8, 18); for (let r = 0; r < 6; r++) px(x, dark, sx + r, 207 - r, w - r * 2, 1); }
    } else if (theme === 'crypt' || theme === 'tower') {
      for (let i = 0; i < 6; i++) { const cx = ri(0, 630), len = ri(30, 80); for (let y = 0; y < len; y += 4) { px(x, '#0c0c14', cx, y, 3, 3); px(x, '#1c1c28', cx + 1, y + 1, 1, 1); } px(x, '#0c0c14', cx - 2, len, 7, 3); }
      if (theme === 'crypt') for (let i = 0; i < 28; i++) px(x, 'rgba(160,160,200,0.35)', i, 0, 1, 28 - i);
    }
    return c;
  }
  function drawFront(ctx, room, cam) {
    if (room.theme === 'ship') { drawShipFront(ctx, room, cam, W.frame); return; }
    const c = fronts[room.theme] || (fronts[room.theme] = buildFront(room.theme));
    const off = ((Math.floor(cam.x * 1.3) % 640) + 640) % 640;
    for (let x = -off; x < View.w; x += 640) ctx.drawImage(c, x, 0);
  }

  const DECO_SOLID = new Set(['#', '=', 'X', 'Y']);
  function drawTiles(ctx, room, cam, frame) {
    const t = build(room.theme), g = room.grid;
    const x0 = Math.floor(cam.x / T), x1 = x0 + Math.ceil(View.w / T) + 1;
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(room.h - 1, y0 + 14);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    const deco = [];
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const out = cx < 0 || cx >= room.w; // außerhalb schmaler Räume: Mauer
      const ch = out ? '#' : g[cy][cx];
      if (ch === '.') continue;
      const X = cx * T + ox, Y = cy * T + oy, v = ((cx * 7 + cy * 3) % 4 + 4) % 4;
      const above = out ? '#' : cy > 0 ? g[cy - 1][cx] : '.', below = out ? '#' : cy < room.h - 1 ? g[cy + 1][cx] : '#';
      let img = null;
      if (ch === '#') img = (above === '#' ? t.ground : t.groundTop)[v];
      else if (ch === '=') img = t.crate && (above === '=' || below === '=') ? t.crate : t.alt[v % 3]; // Schiff: gestapelt = Kisten
      else if (ch === 'X') img = t.X;
      else if (ch === 'Y') img = t.Y;
      else if (ch === '^') img = t.spikes;
      else if (ch === '/') img = t.up;
      else if (ch === '\\') img = t.down;
      else if (ch === '~') { drawWater(ctx, X, Y, cy === 0 || above !== '~', cx, frame); continue; }
      if (img) ctx.drawImage(img, X, Y);
      if (DECO_SOLID.has(ch)) {
        if (!DECO_SOLID.has(above) && above !== '~' && t.toppers[v]) deco.push([t.toppers[v], X, Y - 5]);
        if (below === '.' && t.hangers[v % 3] && (cx % 3 !== 1)) deco.push([t.hangers[v % 3], X, Y + 16]);
        if (above === '.' && ch === '=') { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(X, Y, 16, 1); }
      }
    }
    deco.forEach(([im, X, Y]) => ctx.drawImage(im, X, Y));
  }

  function drawWater(ctx, X, Y, surface, cx, frame) {
    ctx.fillStyle = surface ? 'rgba(0,88,248,0.78)' : 'rgba(0,0,140,0.88)';
    ctx.fillRect(X, Y, T, T);
    if (surface) {
      ctx.fillStyle = '#3cbcfc';
      for (let i = 0; i < 16; i += 4) ctx.fillRect(X + ((i + (frame >> 3)) % 16), Y + ((i >> 2) % 2), 3, 1);
      ctx.fillStyle = '#a4e4fc';
      if (((cx + (frame >> 4)) % 5) === 0) ctx.fillRect(X + 6, Y + 1, 4, 1);
      ctx.fillStyle = 'rgba(0,0,140,0.6)'; ctx.fillRect(X, Y + 9, T, 7);
      ctx.fillStyle = 'rgba(164,228,252,0.35)';
      const sh = (frame >> 2) + cx * 5;
      ctx.fillRect(X + (sh % 13), Y + 5, 2, 1); ctx.fillRect(X + ((sh * 7) % 11), Y + 7, 3, 1);
    } else {
      ctx.fillStyle = 'rgba(60,188,252,0.18)';
      ctx.fillRect(X + ((frame >> 3) + cx * 3) % 14, Y + 6, 2, 1);
    }
  }

  return { build, drawBg, drawTiles, drawFront, layer, drawLayer, shipLights };
})();
