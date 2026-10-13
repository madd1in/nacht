// Prozedurale Kacheln und Parallax-Hintergründe pro Thema.
'use strict';

const Tiles = (() => {
  const cache = {};
  let seed = 1;
  const rand = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const C = (w, h) => Sprites.canvas(w, h);

  function px(x, c, X, Y, w = 1, h = 1) { x.fillStyle = c; x.fillRect(X, Y, w, h); }

  function block(p) { // Steinquader 16x16
    const c = C(16, 16), x = c.getContext('2d');
    px(x, p.mid, 0, 0, 16, 16);
    px(x, p.hi, 0, 0, 15, 1); px(x, p.hi, 0, 0, 1, 15);
    px(x, p.lo, 1, 14, 15, 1); px(x, p.lo, 14, 1, 1, 14);
    px(x, p.dark, 0, 15, 16, 1); px(x, p.dark, 15, 0, 1, 16);
    for (let i = 0; i < 10; i++) px(x, rand() < 0.5 ? p.lo : p.hi, 2 + Math.floor(rand() * 11), 2 + Math.floor(rand() * 11));
    return c;
  }
  function bricks(p) { // Ziegelmuster 16x16
    const c = C(16, 16), x = c.getContext('2d');
    px(x, p.dark, 0, 0, 16, 16);
    for (let r = 0; r < 4; r++) {
      const off = (r % 2) * 4;
      for (let b = -1; b < 3; b++) {
        const bx = b * 8 + off;
        px(x, p.mid, bx, r * 4, 7, 3);
        px(x, p.hi, bx, r * 4, 7, 1);
      }
    }
    return c;
  }
  function rock(p) {
    const c = C(16, 16), x = c.getContext('2d');
    px(x, p.dark, 0, 0, 16, 16);
    for (let i = 0; i < 6; i++) {
      const bx = Math.floor(rand() * 12), by = Math.floor(rand() * 12), s = 3 + Math.floor(rand() * 4);
      px(x, p.mid, bx, by, s, s - 1); px(x, p.hi, bx, by, s - 1, 1);
    }
    return c;
  }
  function crack(base) {
    const c = C(16, 16), x = c.getContext('2d');
    x.drawImage(base, 0, 0);
    px(x, '#000', 6, 3, 1, 2); px(x, '#000', 7, 5, 1, 2); px(x, '#000', 6, 7, 1, 2); px(x, '#000', 8, 8, 2, 1);
    return c;
  }
  function grassTop(base) {
    const c = C(16, 16), x = c.getContext('2d');
    x.drawImage(base, 0, 0);
    px(x, PAL.N, 0, 0, 16, 3);
    for (let i = 0; i < 16; i += 2) px(x, PAL.n, i, rand() < 0.5 ? 0 : 1, 1, 2);
    return c;
  }
  function spikes() {
    const c = C(16, 16), x = c.getContext('2d');
    px(x, '#1c1c1c', 0, 8, 16, 8);
    for (let s = 0; s < 4; s++) for (let r = 0; r < 8; r++) {
      const half = Math.floor(r / 2);
      px(x, r < 2 ? PAL.w : PAL.W, s * 4 + 2 - half, 2 + r, half * 2 + 1, 1);
    }
    px(x, PAL.g, 0, 10, 16, 1);
    return c;
  }
  function stair(p, dir) {
    const c = C(16, 16), x = c.getContext('2d');
    const step = (sx, sy) => { px(x, p.mid, sx, sy, 8, 4); px(x, p.hi, sx, sy, 8, 1); px(x, p.dark, sx, sy + 3, 8, 1); };
    if (dir > 0) { step(8, 0); step(0, 8); } else { step(0, 0); step(8, 8); }
    return c;
  }

  const THEMES = {
    courtyard: { a: { hi: '#bcbcbc', mid: '#7c7c7c', lo: '#4c4c4c', dark: '#202020' }, b: { hi: '#bcbcbc', mid: '#7c7c7c', lo: '#4c4c4c', dark: '#202020' }, ground: 'block', grass: true },
    hall: { a: { hi: '#c84c0c', mid: '#881400', lo: '#501000', dark: '#200000' }, b: { hi: '#bcbcbc', mid: '#7c7c7c', lo: '#4c4c4c', dark: '#202020' }, ground: 'bricks' },
    cave: { a: { hi: '#ac7c00', mid: '#5c2c0c', lo: '#3c1c00', dark: '#1c0c00' }, b: { hi: '#a4a4a4', mid: '#686868', lo: '#3c3c3c', dark: '#181818' }, ground: 'rock' },
    crypt: { a: { hi: '#6888fc', mid: '#3c3c7c', lo: '#24244c', dark: '#0c0c20' }, b: { hi: '#a4a4c8', mid: '#6c6c8c', lo: '#3c3c5c', dark: '#181828' }, ground: 'bricks' },
    tower: { a: { hi: '#9c9c9c', mid: '#5c5c5c', lo: '#3c3c3c', dark: '#141414' }, b: { hi: '#3cbcfc', mid: '#0058f8', lo: '#0000a8', dark: '#000040' }, ground: 'block' },
    throne: { a: { hi: '#f8b800', mid: '#a80020', lo: '#600010', dark: '#200008' }, b: { hi: '#f8b800', mid: '#6844fc', lo: '#4428bc', dark: '#140830' }, ground: 'bricks' },
  };

  // ---------------- Hintergründe ----------------
  function sky(x, w, h, bands) {
    const bh = Math.ceil(h / bands.length);
    bands.forEach((c, i) => px(x, c, 0, i * bh, w, bh));
  }
  function moon(x, cx, cy, r) {
    for (let y = -r; y <= r; y++) for (let xx = -r; xx <= r; xx++) {
      const d = xx * xx + y * y;
      if (d > r * r) continue;
      let col = '#d82800';
      if (xx + y < -r * 0.6) col = '#f85838';
      if (d > (r - 2) * (r - 2) && xx + y > 0) col = '#a80020';
      px(x, col, cx + xx, cy + y);
    }
    const k = r / 24;
    [[-8, -4, 5], [6, 6, 4], [-2, 10, 3], [9, -9, 3]].forEach(([ox0, oy0, cr0]) => {
      const ox = Math.round(ox0 * k), oy = Math.round(oy0 * k), cr = Math.max(1, Math.round(cr0 * k));
      for (let y = -cr; y <= cr; y++) for (let xx = -cr; xx <= cr; xx++) if (xx * xx + y * y <= cr * cr) px(x, '#a80020', cx + ox + xx, cy + oy + y);
    });
  }
  function castleSilhouette() {
    const c = C(512, 208), x = c.getContext('2d');
    const col = '#140818';
    const tower = (tx, ty, tw, roof) => {
      px(x, col, tx, ty, tw, 208 - ty);
      if (roof) for (let i = 0; i < tw / 2 + 2; i++) px(x, col, tx - 2 + i, ty - 1 - i * 2, Math.max(1, tw + 4 - i * 2), 2);
      else for (let i = 0; i < tw; i += 4) px(x, col, tx + i, ty - 3, 2, 3);
      for (let i = 0; i < 3; i++) if (rand() < 0.7) px(x, '#f8b800', tx + 2 + Math.floor(rand() * (tw - 4)), ty + 6 + Math.floor(rand() * 40), 1, 2);
    };
    px(x, col, 150, 120, 300, 88);
    tower(150, 80, 18, true); tower(200, 60, 22, true); tower(250, 30, 28, true); tower(300, 70, 16, false);
    tower(340, 45, 24, true); tower(390, 90, 18, false); tower(430, 75, 14, true);
    for (let i = 0; i < 300; i += 6) px(x, col, 150 + i, 116, 3, 4);
    tower(30, 110, 14, true); tower(60, 125, 20, false);
    for (let i = 0; i < 20; i++) px(x, '#f8b800', 160 + Math.floor(rand() * 280), 125 + Math.floor(rand() * 50), 1, 2);
    return c;
  }
  function fenceTrees() {
    const c = C(512, 208), x = c.getContext('2d');
    const tree = (tx) => {
      px(x, '#000', tx, 70, 6, 110);
      const branch = (bx, by, dx, len) => { for (let i = 0; i < len; i++) px(x, '#000', bx + i * dx, by - Math.floor(i * 0.7), 2, 2); };
      branch(tx + 5, 100, 1, 22); branch(tx, 90, -1, 18); branch(tx + 4, 80, 1, 12); branch(tx + 1, 120, -1, 25);
    };
    tree(70); tree(330); tree(460);
    for (let i = 0; i < 512; i += 6) { px(x, '#2c2c3c', i, 146, 2, 30); px(x, '#3c3c4c', i, 142, 2, 4); px(x, '#2c2c3c', i - 1, 144, 4, 1); }
    px(x, '#2c2c3c', 0, 152, 512, 2); px(x, '#2c2c3c', 0, 168, 512, 2);
    return c;
  }
  function wallBricks(x, w, h, mid, hi, dark, bw = 16, bh = 8) {
    px(x, dark, 0, 0, w, h);
    for (let r = 0; r * bh < h; r++) for (let b = -1; b * bw < w; b++) {
      const bx = b * bw + (r % 2) * (bw / 2);
      px(x, mid, bx + 1, r * bh + 1, bw - 2, bh - 2);
      px(x, hi, bx + 1, r * bh + 1, bw - 2, 1);
    }
  }
  function archWindow(x, wx, wy, ww, wh, glass) {
    px(x, '#5c5c5c', wx - 3, wy - 3, ww + 6, wh + 6);
    px(x, glass, wx, wy, ww, wh);
    const r = ww / 2;
    for (let yy = 0; yy < r; yy++) {
      const half = Math.floor(Math.sqrt(r * r - (r - yy) * (r - yy)));
      px(x, '#5c5c5c', wx - 3 + 0, wy - r + yy - 2, r - half + 3, 1);
      px(x, '#5c5c5c', wx + r + half, wy - r + yy - 2, r - half + 3, 1);
      px(x, glass, wx + r - half, wy - r + yy, half * 2, 1);
    }
    px(x, '#5c5c5c', wx + ww / 2 - 1, wy - r, 2, wh + r);
    px(x, '#5c5c5c', wx, wy + wh / 2, ww, 2);
  }

  function buildBg(theme) {
    seed = 7;
    const layers = [];
    const L = (canvas, par, wrap = true) => layers.push({ c: canvas, par, wrap });
    if (theme === 'courtyard') {
      const s = C(256, 208), x = s.getContext('2d');
      sky(x, 256, 208, ['#000000', '#08001c', '#100428', '#1c0834', '#2c0c40', '#3c1048', '#501050', '#601050']);
      for (let i = 0; i < 40; i++) px(x, rand() < 0.3 ? '#fcfcfc' : '#7c7c9c', Math.floor(rand() * 256), Math.floor(rand() * 110));
      moon(x, 196, 46, 24);
      px(x, '#1c0828', 150, 52, 80, 2); px(x, '#1c0828', 170, 58, 60, 2); px(x, '#1c0828', 160, 36, 30, 1);
      L(s, 0, false); L(castleSilhouette(), 0.25); L(fenceTrees(), 0.6);
    } else if (theme === 'hall' || theme === 'throne') {
      const c = C(512, 208), x = c.getContext('2d');
      if (theme === 'hall') wallBricks(x, 512, 208, '#3c1008', '#5c2010', '#100000');
      else wallBricks(x, 512, 208, '#300818', '#481028', '#0c0008', 24, 12);
      [64, 320].forEach(wx => {
        archWindow(x, wx, 56, 32, 72, theme === 'hall' ? '#000058' : '#2c0838');
        if (theme === 'throne') {
          const g = ['#a80020', '#0058f8', '#f8b800', '#00a800'];
          for (let i = 0; i < 16; i++) px(x, g[i % 4], wx + 2 + (i % 4) * 7, 60 + Math.floor(i / 4) * 16, 5, 12);
        } else {
          moon(x, wx + 22, 70, 7);
          px(x, '#a80020', wx - 8, 40, 6, 96); px(x, '#a80020', wx + 34, 40, 6, 96);
          px(x, '#d82800', wx - 8, 40, 2, 96); px(x, '#d82800', wx + 34, 40, 2, 96);
        }
      });
      [0, 192, 448].forEach(cx => {
        px(x, '#3c3c3c', cx, 0, 24, 208); px(x, '#5c5c5c', cx + 2, 0, 4, 208); px(x, '#202020', cx + 20, 0, 4, 208);
        px(x, '#5c5c5c', cx - 3, 20, 30, 6); px(x, '#5c5c5c', cx - 3, 150, 30, 6);
      });
      if (theme === 'throne') [128, 384].forEach(bx => {
        px(x, '#4428bc', bx, 10, 28, 100); px(x, '#f8b800', bx, 10, 28, 3); px(x, '#f8b800', bx, 10, 2, 100); px(x, '#f8b800', bx + 26, 10, 2, 100);
        for (let i = 0; i < 14; i++) px(x, '#4428bc', bx + i, 110 + Math.floor(i / 2), 28 - i * 2, 1);
        px(x, '#a80020', bx + 10, 40, 8, 8); px(x, '#f8b800', bx + 13, 34, 2, 20);
      });
      L(c, 0.5);
    } else if (theme === 'cave' || theme === 'crypt') {
      const c = C(512, 208), x = c.getContext('2d');
      if (theme === 'cave') {
        px(x, '#0c0400', 0, 0, 512, 208);
        for (let i = 0; i < 160; i++) { const s = 4 + Math.floor(rand() * 10); px(x, rand() < 0.5 ? '#1c0c04' : '#24140c', Math.floor(rand() * 512), Math.floor(rand() * 208), s, s - 2); }
        for (let i = 0; i < 18; i++) {
          const sx = Math.floor(rand() * 500), len = 10 + Math.floor(rand() * 40);
          for (let r = 0; r < len; r++) px(x, '#2c1c0c', sx + Math.floor(r / 6), r, Math.max(1, 10 - Math.floor(r / 3)), 1);
        }
        for (let i = 0; i < 12; i++) px(x, '#00a800', Math.floor(rand() * 512), 120 + Math.floor(rand() * 80), 2, 2);
      } else {
        wallBricks(x, 512, 208, '#14183c', '#202c54', '#04040c');
        for (let n = 0; n < 6; n++) {
          const nx = 30 + n * 84, ny = 50 + (n % 2) * 40;
          px(x, '#000000', nx, ny, 22, 26);
          px(x, '#9c9c9c', nx + 6, ny + 10, 10, 8); px(x, '#000', nx + 8, ny + 12, 2, 2); px(x, '#000', nx + 12, ny + 12, 2, 2);
          px(x, '#7c7c7c', nx + 7, ny + 18, 8, 3);
        }
      }
      L(c, 0.5);
    } else if (theme === 'tower') {
      const c = C(512, 208), x = c.getContext('2d');
      wallBricks(x, 512, 208, '#1c1c24', '#2c2c34', '#08080c');
      const gear = (gx, gy, r) => {
        for (let a = 0; a < Math.PI * 2; a += 0.02) {
          const rr = (Math.floor(a / (Math.PI / 8)) % 2) ? r : r + 4;
          for (let k = r - 6; k < rr; k++) px(x, '#383840', gx + Math.round(Math.cos(a) * k), gy + Math.round(Math.sin(a) * k));
        }
        px(x, '#4c4c58', gx - 3, gy - 3, 6, 6);
      };
      gear(90, 70, 34); gear(150, 140, 22); gear(360, 90, 40); gear(450, 160, 18);
      [40, 250, 470].forEach(wx => { px(x, '#000', wx, 40, 6, 30); px(x, '#a80020', wx + 1, 44, 4, 4); });
      L(c, 0.5);
    }
    return layers;
  }

  function build(theme) {
    if (cache[theme]) return cache[theme];
    seed = 42;
    const th = THEMES[theme];
    const gfn = th.ground === 'bricks' ? bricks : th.ground === 'rock' ? rock : block;
    const ground = [gfn(th.a), gfn(th.a), gfn(th.a)];
    const alt = block(th.b);
    const t = {
      ground, groundTop: th.grass ? ground.map(grassTop) : ground,
      alt, X: crack(alt), Y: crack(alt), spikes: spikes(),
      up: stair(th.b, 1), down: stair(th.b, -1), bg: buildBg(theme),
    };
    cache[theme] = t;
    return t;
  }

  function drawBg(ctx, room, cam) {
    const t = build(room.theme);
    t.bg.forEach(l => {
      if (!l.wrap) { ctx.drawImage(l.c, 0, 0); return; }
      const off = Math.floor(cam.x * l.par) % l.c.width;
      ctx.drawImage(l.c, -off, 0);
      ctx.drawImage(l.c, l.c.width - off, 0);
    });
  }

  function drawTiles(ctx, room, cam, frame) {
    const t = build(room.theme);
    const x0 = Math.floor(cam.x / T), x1 = Math.min(room.w - 1, x0 + 17);
    const y0 = Math.max(0, Math.floor(cam.y / T)), y1 = Math.min(room.h - 1, y0 + 14);
    const ox = -Math.round(cam.x), oy = -Math.round(cam.y);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
      const ch = room.grid[cy][cx];
      if (ch === '.') continue;
      const X = cx * T + ox, Y = cy * T + oy;
      let img = null;
      if (ch === '#') {
        const above = cy > 0 ? room.grid[cy - 1][cx] : '.';
        const v = (cx * 7 + cy * 3) % 3;
        img = (above === '#' ? t.ground : t.groundTop)[v];
      } else if (ch === '=') img = t.alt;
      else if (ch === 'X') img = t.X;
      else if (ch === 'Y') img = t.Y;
      else if (ch === '^') img = t.spikes;
      else if (ch === '/') img = t.up;
      else if (ch === '\\') img = t.down;
      else if (ch === '~') {
        const surface = cy === 0 || room.grid[cy - 1][cx] !== '~';
        ctx.fillStyle = surface ? '#0058f8' : '#0000a8';
        ctx.fillRect(X, Y, T, T);
        if (surface) {
          ctx.fillStyle = '#3cbcfc';
          for (let i = 0; i < 16; i += 4) ctx.fillRect(X + ((i + (frame >> 3)) % 16), Y + ((i >> 2) % 2), 3, 1);
          ctx.fillStyle = '#a4e4fc';
          if (((cx + (frame >> 4)) % 5) === 0) ctx.fillRect(X + 6, Y + 1, 4, 1);
          ctx.fillStyle = '#0000a8'; ctx.fillRect(X, Y + 10, T, 6);
        }
        continue;
      }
      if (img) ctx.drawImage(img, X, Y);
    }
  }

  return { build, drawBg, drawTiles };
})();
