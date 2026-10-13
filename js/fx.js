// Licht, Vignette, Nebel und Umgebungspartikel. Alles gestuft + gedithert, damit es pixelig bleibt.
'use strict';

const FX = (() => {
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
  const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)];
  const cache = new Map();
  const MASK = [1, 0.85, 0.62, 0.38, 0.16];
  const GLOW = [0.55, 0.34, 0.18, 0.07];

  // Gestufte Lichtscheibe mit gedithertem Übergang zwischen den Ringen.
  function disc(r, rgb, levels) {
    r = Math.max(2, r);
    const key = r + '|' + rgb + '|' + levels.length + levels[0];
    let c = cache.get(key);
    if (c) return c;
    const size = r * 2;
    c = Sprites.canvas(size, size);
    const x = c.getContext('2d'), img = x.createImageData(size, size), d = img.data;
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      const dist = Math.hypot(px + 0.5 - r, py + 0.5 - r) / r;
      if (dist >= 1) continue;
      const k = Math.floor(dist * levels.length + (bayer(px, py) - 0.5) * 0.95);
      if (k >= levels.length) continue;
      const i = (py * size + px) * 4;
      d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; d[i + 3] = Math.round(levels[Math.max(0, k)] * 255);
    }
    x.putImageData(img, 0, 0);
    cache.set(key, c);
    return c;
  }

  const AMB = { courtyard: 0.2, hall: 0.34, cave: 0.42, crypt: 0.42, tower: 0.36, throne: 0.3 };
  const TINT = { courtyard: '12,0,32', hall: '24,0,12', cave: '10,4,0', crypt: '0,6,28', tower: '8,8,20', throne: '28,0,14' };
  const lc = Sprites.canvas(256, 208), lx = lc.getContext('2d');
  let vignette = null;

  function makeVignette() {
    const c = Sprites.canvas(256, 208), x = c.getContext('2d'), img = x.createImageData(256, 208), d = img.data;
    for (let py = 0; py < 208; py++) for (let px = 0; px < 256; px++) {
      const nx = (px - 128) / 128, ny = (py - 104) / 104;
      const v = Math.max(0, Math.hypot(nx * 0.9, ny) - 0.62) * 1.4;
      const a = Math.min(0.7, Math.floor((v + bayer(px, py) * 0.18) * 5) / 5);
      d[(py * 256 + px) * 4 + 3] = Math.round(a * 255);
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // lights: [{x, y, r, c:[r,g,b], a}] in Bildschirmkoordinaten (Spielfeld).
  function render(ctx, lights, theme) {
    if (!vignette) vignette = makeVignette();
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, 256, 208);
    lx.fillStyle = `rgba(${TINT[theme] || '0,0,0'},${AMB[theme] ?? 0.3})`;
    lx.fillRect(0, 0, 256, 208);
    lx.drawImage(vignette, 0, 0);
    lx.globalCompositeOperation = 'destination-out';
    for (const L of lights) {
      const r = Math.round(L.r / 2) * 2;
      lx.drawImage(disc(r, [255, 255, 255], MASK), Math.round(L.x - r), Math.round(L.y - r));
    }
    ctx.drawImage(lc, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const L of lights) {
      if (!L.c) continue;
      const r = Math.round(L.r * 0.4) * 2;
      ctx.globalAlpha = L.a ?? 0.5;
      ctx.drawImage(disc(r, L.c, GLOW), Math.round(L.x - r), Math.round(L.y - r));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------- Nebel ----------------
  const fogCache = {};
  const FOG = { courtyard: [120, 70, 170, 0.5], cave: [70, 110, 60, 0.32], crypt: [90, 120, 220, 0.42], tower: [110, 110, 130, 0.22] };
  function fogStrip(theme) {
    if (fogCache[theme]) return fogCache[theme];
    const f = FOG[theme];
    if (!f) return null;
    const c = Sprites.canvas(512, 56), x = c.getContext('2d'), img = x.createImageData(512, 56), d = img.data;
    let s = 99;
    const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const blobs = Array.from({ length: 26 }, () => ({ x: rnd() * 512, y: 18 + rnd() * 30, rx: 30 + rnd() * 50, ry: 8 + rnd() * 10 }));
    for (let py = 0; py < 56; py++) for (let px = 0; px < 512; px++) {
      let v = 0;
      for (const b of blobs) {
        for (const ox of [-512, 0, 512]) {
          const dx = (px - b.x - ox) / b.rx, dy = (py - b.y) / b.ry;
          const q = 1 - (dx * dx + dy * dy);
          if (q > 0) v += q;
        }
      }
      v = Math.min(1, v * 0.8) * Math.min(1, py / 14);
      const a = Math.floor((v + (bayer(px, py) - 0.5) * 0.35) * 4) / 4;
      if (a <= 0) continue;
      const i = (py * 512 + px) * 4;
      d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = Math.round(Math.min(1, a) * f[3] * 255);
    }
    x.putImageData(img, 0, 0);
    fogCache[theme] = c;
    return c;
  }
  function drawFog(ctx, theme, cam, frame) {
    const c = fogStrip(theme);
    if (!c) return;
    const off = Math.floor(cam.x * 1.15 + frame * 0.25) % 512;
    ctx.drawImage(c, -off, 208 - 56);
    ctx.drawImage(c, 512 - off, 208 - 56);
  }

  // ---------------- Umgebungspartikel ----------------
  let amb = [];
  const CFG = {
    courtyard: { max: 14, rate: 0.12, make: (c) => ({ x: c.x + Math.random() * 256, y: 110 + Math.random() * 60, vx: 0, vy: 0, life: 240, col: '#c8f818', kind: 'firefly' }) },
    hall: { max: 26, rate: 0.25, make: (c) => ({ x: c.x + Math.random() * 256, y: Math.random() * 176, vx: 0.08, vy: 0.04, life: 300, col: '#fce0a8', kind: 'dust' }) },
    cave: { max: 18, rate: 0.2, make: (c) => Math.random() < 0.35
      ? ({ x: c.x + Math.random() * 256, y: 0, vx: 0, vy: 2.6, life: 120, col: '#3cbcfc', kind: 'drip' })
      : ({ x: c.x + Math.random() * 256, y: 140 + Math.random() * 60, vx: 0, vy: -0.25, life: 220, col: '#58f898', kind: 'spore' }) },
    crypt: { max: 16, rate: 0.15, make: (c) => ({ x: c.x + Math.random() * 256, y: 150 + Math.random() * 50, vx: 0.15, vy: -0.3, life: 200, col: '#a4e4fc', kind: 'wisp' }) },
    tower: { max: 22, rate: 0.22, make: (c) => ({ x: c.x + Math.random() * 300, y: -4, vx: -0.25, vy: 0.35, life: 600, col: '#7c7c7c', kind: 'ash' }) },
    throne: { max: 20, rate: 0.2, make: (c) => ({ x: c.x + Math.random() * 256, y: 200, vx: 0, vy: -0.45, life: 380, col: Math.random() < 0.5 ? '#f8b800' : '#d82800', kind: 'ember' }) },
  };
  function resetAmbient() { amb = []; }
  function updateAmbient(theme, cam) {
    const cfg = CFG[theme];
    if (cfg && amb.length < cfg.max && Math.random() < cfg.rate) {
      const p = cfg.make(cam); p.t = 0; p.seed = Math.random() * 6.28; amb.push(p);
    }
    for (const p of amb) {
      p.t++;
      const w = Math.sin(p.t * 0.05 + p.seed);
      if (p.kind === 'firefly') { p.x += w * 0.35; p.y += Math.cos(p.t * 0.04 + p.seed) * 0.25; }
      else if (p.kind === 'drip') {
        p.y += p.vy;
        if (Phys.solidTile(Math.floor(p.x / T), Math.floor(p.y / T)) || Phys.tile(Math.floor(p.x / T), Math.floor(p.y / T)) === '~') p.t = p.life;
      } else { p.x += p.vx + w * 0.2; p.y += p.vy; }
    }
    amb = amb.filter(p => p.t < p.life && p.x > cam.x - 40 && p.x < cam.x + 300);
  }
  function drawAmbient(ctx, cam) {
    for (const p of amb) {
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
      if (p.kind === 'firefly') {
        if ((p.t + Math.floor(p.seed * 10)) % 40 < 22) { ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = 'rgba(200,248,24,0.25)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      } else if (p.kind === 'drip') { ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 3); }
      else {
        const fade = p.t > p.life - 30 ? (p.t & 2) : 1;
        if (!fade) continue;
        ctx.fillStyle = p.col;
        ctx.fillRect(x, y, 1, 1);
        if (p.kind === 'wisp' && (p.t & 8)) { ctx.globalAlpha = 0.4; ctx.fillRect(x - 1, y + 1, 3, 1); ctx.globalAlpha = 1; }
      }
    }
  }

  return { render, drawFog, updateAmbient, drawAmbient, resetAmbient, disc };
})();
