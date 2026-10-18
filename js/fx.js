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

  const AMB = { forest: 0.36, cathedral: 0.06, spire: 0.05, gallery: 0.38, bridge: 0.26, library: 0.5, foyer: 0.6, glass: 0.34, ship: 0.32, vortex: 0.2, courtyard: 0.3, hall: 0.34, cave: 0.42, crypt: 0.42, tower: 0.36, throne: 0.3 };
  const TINT = { forest: '0,12,18', cathedral: '40,10,0', spire: '40,10,0', gallery: '10,6,30', bridge: '18,0,34', library: '20,8,2', foyer: '8,4,26', glass: '20,8,40', ship: '4,6,30', vortex: '26,0,40', courtyard: '12,0,32', hall: '24,0,12', cave: '10,4,0', crypt: '0,6,28', tower: '8,8,20', throne: '28,0,14' };
  const lc = Sprites.canvas(256, 208), lx = lc.getContext('2d');
  let vignette = null;

  function makeVignette(w) {
    const c = Sprites.canvas(w, 208), x = c.getContext('2d'), img = x.createImageData(w, 208), d = img.data;
    for (let py = 0; py < 208; py++) for (let px = 0; px < w; px++) {
      const nx = (px - w / 2) / (w / 2), ny = (py - 104) / 104;
      const v = Math.max(0, Math.hypot(nx * 0.9, ny) - 0.62) * 1.4;
      const a = Math.min(0.7, Math.floor((v + bayer(px, py) * 0.18) * 5) / 5);
      d[(py * w + px) * 4 + 3] = Math.round(a * 255);
    }
    x.putImageData(img, 0, 0);
    return c;
  }

  // lights: [{x, y, r, c:[r,g,b], a}] in Bildschirmkoordinaten (Spielfeld).
  function render(ctx, lights, theme, amb, tint) { // amb: Dunkelheit überschreiben (Gewitter: dunkel ↔ Blitz), tint: Farbe der Dunkelheit
    if (!vignette || lc.width !== View.w) { lc.width = View.w; vignette = makeVignette(View.w); }
    lx.globalCompositeOperation = 'source-over';
    lx.clearRect(0, 0, View.w, 208);
    lx.fillStyle = `rgba(${tint || TINT[theme] || '0,0,0'},${amb ?? AMB[theme] ?? 0.3})`;
    lx.fillRect(0, 0, View.w, 208);
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
    for (const L of lights) { // weicher Farbschein (SNES-Farbmathematik) über dem gestuften Licht
      if (!L.c) continue;
      const r = Math.round(L.r * 0.45) * 2;
      ctx.globalAlpha = (L.a ?? 0.5) * 0.32;
      ctx.drawImage(halo(r, L.c), Math.round(L.x - r), Math.round(L.y - r));
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  const halos = new Map();
  function halo(r, rgb) {
    const key = r + '|' + rgb;
    let c = halos.get(key);
    if (c) return c;
    c = Sprites.canvas(r * 2, r * 2);
    const x = c.getContext('2d'), g = x.createRadialGradient(r, r, 0, r, r, r);
    g.addColorStop(0, `rgba(${rgb},0.9)`); g.addColorStop(0.35, `rgba(${rgb},0.45)`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(0, 0, r * 2, r * 2);
    halos.set(key, c);
    return c;
  }

  // ---------------- Nebel ----------------
  const fogCache = {};
  const FOG = { forest: [60, 116, 100, 0.42], bridge: [130, 90, 170, 0.42], ship: [90, 110, 180, 0.3], vortex: [160, 60, 220, 0.45], courtyard: [120, 70, 170, 0.5], cave: [70, 110, 60, 0.32], crypt: [90, 120, 220, 0.42], tower: [110, 110, 130, 0.22] };
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
  // bottomY: Bildschirm-y der Raumunterkante (Nebel liegt am Boden des Raums)
  function drawFog(ctx, theme, cam, frame, bottomY = 208) {
    const c = fogStrip(theme);
    if (!c) return;
    const y = Math.round(bottomY) - 56;
    if (y > 208 || y < -56) return;
    const off = Math.floor(cam.x * 1.15 + frame * 0.25) % 512;
    for (let x = -off; x < View.w; x += 512) ctx.drawImage(c, x, y);
  }

  // ---------------- Gewitter ----------------
  const FLICKER = [0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1];
  function makeBolt(w) {
    const pts = [];
    let x = 30 + Math.random() * (w - 60), y = -2;
    pts.push([x, y]);
    const end = 90 + Math.random() * 50;
    while (y < end) { x += (Math.random() - 0.5) * 16; y += 5 + Math.random() * 8; pts.push([x, y]); }
    const branches = [];
    for (let i = 2; i < pts.length - 2; i += 2) if (Math.random() < 0.55) {
      let [bx, by] = pts[i];
      const b = [[bx, by]], dir = Math.random() < 0.5 ? -1 : 1;
      for (let k = 0; k < 3 + Math.floor(Math.random() * 3); k++) { bx += dir * (3 + Math.random() * 8); by += 4 + Math.random() * 6; b.push([bx, by]); }
      branches.push(b);
    }
    return { pts, branches };
  }
  function updateStorm(st, w, onStrike) {
    if (st.flash > 0) st.flash--;
    if (--st.cd <= 0) {
      st.bolt = makeBolt(w); st.flash = FLICKER.length;
      st.cd = Math.random() < 0.3 ? 40 + Math.random() * 40 : 170 + Math.random() * 260; // manchmal Doppelschlag
      if (onStrike) onStrike();
    }
  }
  const stormOn = st => st && st.flash > 0 && FLICKER[FLICKER.length - st.flash] === 1;
  function line(ctx, pts, col, wd) {
    ctx.fillStyle = col;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
      for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * k / n) - (wd >> 1), Math.round(y0 + (y1 - y0) * k / n), wd, 1);
    }
  }
  // Wird nach den Himmelsebenen gezeichnet: Burg & Bäume bleiben davor als Silhouette.
  function drawStormSky(ctx, st, w) {
    if (!st || st.flash <= 0) return;
    const on = stormOn(st);
    ctx.fillStyle = on ? 'rgba(196,186,255,0.55)' : 'rgba(120,100,200,0.18)';
    ctx.fillRect(0, 0, w, 208);
    if (!on || !st.bolt) return;
    st.bolt.branches.forEach(b => { line(ctx, b, 'rgba(164,164,252,0.7)', 2); line(ctx, b, '#e8e8fc', 1); });
    line(ctx, st.bolt.pts, 'rgba(164,164,252,0.55)', 4);
    line(ctx, st.bolt.pts, '#fcfcfc', 2);
  }

  // ---------------- Umgebungspartikel ----------------
  let amb = [];
  const CFG = {
    cathedral: { max: 20, rate: 0.18, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + 20 + Math.random() * 180, vx: 0.14, vy: -0.06, life: 360, col: Math.random() < 0.3 ? '#fcfcfc' : '#fce0a8', kind: 'mote' }) }, // Lichtstaub im Sonnenuntergang
    spire: { max: 20, rate: 0.18, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + Math.random() * 200, vx: 0.2, vy: -0.1, life: 360, col: Math.random() < 0.3 ? '#fcfcfc' : '#fce0a8', kind: 'mote' }) },
    glass: { max: 26, rate: 0.25, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + Math.random() * 208, vx: 0.05, vy: -0.08, life: 320, col: ['#fc7460', '#a4e4fc', '#fce0a8', '#c8a0fc'][Math.floor(Math.random() * 4)], kind: 'mote' }) }, // bunter Staub im Glaslicht
    ship: { max: 16, rate: 0.18, make: (c) => ({ x: c.x + View.w + 4, y: c.y + 96 + Math.random() * 100, vx: -1.5 - Math.random(), vy: -0.15, life: 260, col: '#c8e4fc', kind: 'spray' }) }, // Gischt im Wind
    forest: { max: 22, rate: 0.16, make: (c) => Math.random() < 0.7 // Glühwürmchen und aufsteigende Leuchtsporen
      ? ({ x: c.x + Math.random() * View.w, y: c.y + 90 + Math.random() * 90, vx: 0, vy: 0, life: 260, col: '#d8fc38', kind: 'firefly' })
      : ({ x: c.x + Math.random() * View.w, y: c.y + 150 + Math.random() * 50, vx: 0, vy: -0.22, life: 240, col: '#78f8b8', kind: 'spore' }) },
    courtyard: { max: 14, rate: 0.12, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + 110 + Math.random() * 60, vx: 0, vy: 0, life: 240, col: '#c8f818', kind: 'firefly' }) },
    library: { max: 24, rate: 0.22, make: (c) => Math.random() < 0.22 // Staub im Kerzenlicht, ab und zu segelt eine lose Seite herab
      ? ({ x: c.x + Math.random() * View.w, y: c.y - 4, vx: 0.1, vy: 0.28, life: 700, col: '#d8ccb0', kind: 'page' })
      : ({ x: c.x + Math.random() * View.w, y: c.y + Math.random() * 190, vx: 0.06, vy: 0.03, life: 320, col: '#fce0a8', kind: 'dust' }) },
    hall: { max: 26, rate: 0.25, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + Math.random() * 176, vx: 0.08, vy: 0.04, life: 300, col: '#fce0a8', kind: 'dust' }) },
    cave: { max: 18, rate: 0.2, make: (c) => Math.random() < 0.35
      ? ({ x: c.x + Math.random() * View.w, y: c.y, vx: 0, vy: 2.6, life: 120, col: '#3cbcfc', kind: 'drip' })
      : ({ x: c.x + Math.random() * View.w, y: c.y + 140 + Math.random() * 60, vx: 0, vy: -0.25, life: 220, col: '#58f898', kind: 'spore' }) },
    crypt: { max: 16, rate: 0.15, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + 150 + Math.random() * 50, vx: 0.15, vy: -0.3, life: 200, col: '#a4e4fc', kind: 'wisp' }) },
    tower: { max: 22, rate: 0.22, make: (c) => ({ x: c.x + Math.random() * (View.w + 44), y: c.y - 4, vx: -0.25, vy: 0.35, life: 600, col: '#7c7c7c', kind: 'ash' }) },
    vortex: { max: 26, rate: 0.35, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + 205, vx: 0, vy: -0.7, life: 300, col: Math.random() < 0.5 ? '#c860fc' : '#fc3c8c', kind: 'ember' }) },
    throne: { max: 20, rate: 0.2, make: (c) => ({ x: c.x + Math.random() * View.w, y: c.y + 200, vx: 0, vy: -0.45, life: 380, col: Math.random() < 0.5 ? '#f8b800' : '#d82800', kind: 'ember' }) },
  };
  function resetAmbient() { amb = []; }
  function updateAmbient(theme, cam) {
    const cfg = CFG[theme];
    if (cfg && amb.length < cfg.max * (View.lite ? 0.5 : 1) && Math.random() < cfg.rate) {
      const p = cfg.make(cam); p.t = 0; p.seed = Math.random() * 6.28; amb.push(p);
    }
    for (const p of amb) {
      p.t++;
      const w = Math.sin(p.t * 0.05 + p.seed);
      if (p.kind === 'firefly') { p.x += w * 0.35; p.y += Math.cos(p.t * 0.04 + p.seed) * 0.25; }
      else if (p.kind === 'drip') {
        p.y += p.vy;
        const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T), wet = Phys.tile(tx, ty) === '~';
        if (Phys.solidTile(tx, ty) || wet) { // Aufprall: Wellenring auf Wasser, Spritzer auf Stein, „Plink"
          p.t = p.life;
          let row = ty;
          if (wet) while (row > 0 && Phys.tile(tx, row - 1) === '~') row--;
          hits.push({ x: p.x, y: row * T, vx: 0, vy: 0, life: wet ? 30 : 12, col: p.col, kind: wet ? 'ripple' : 'splat', t: 0, seed: 0 });
          Audio8.drip(p.x, wet ? 1 : 0.55);
        }
      } else if (p.kind !== 'ripple' && p.kind !== 'splat') { p.x += p.vx + w * 0.2; p.y += p.vy; }
    }
    if (hits.length) { amb.push(...hits); hits.length = 0; }
    amb = amb.filter(p => p.t < p.life && p.x > cam.x - 40 && p.x < cam.x + View.w + 44 && p.y > cam.y - 60 && p.y < cam.y + 270);
  }
  const hits = [];

  // ---------------- Fledermausschwärme vor dem Blutmond (Burghof-Himmel) ----------------
  let flock = null, flockCd = 240;
  function updateFlock(w) {
    if (!flock) {
      if (--flockCd > 0) return;
      const dir = Math.random() < 0.5 ? 1 : -1, n = 6 + Math.floor(Math.random() * 7);
      flock = { dir, x: dir > 0 ? -20 : w + 20, y: 26 + Math.random() * 46, t: 0,
        bats: Array.from({ length: n }, () => ({ dx: Math.random() * 50, dy: Math.random() * 26 - 13, ph: Math.random() * 60 })) };
      return;
    }
    flock.t++; flock.x += flock.dir * 0.85;
    if ((flock.dir > 0 && flock.x - 60 > w) || (flock.dir < 0 && flock.x + 60 < 0)) { flock = null; flockCd = 600 + Math.random() * 900; }
  }
  const BAT_UP = [[0, 0], [4, 0], [0, 1], [1, 1], [3, 1], [4, 1], [1, 2], [2, 2], [3, 2]];
  const BAT_DN = [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [3, 1], [4, 1], [0, 2], [4, 2]];
  function drawFlock(ctx) {
    if (!flock) return;
    ctx.fillStyle = '#08040c';
    for (const b of flock.bats) {
      const k = flock.t + b.ph;
      const x = Math.round(flock.x - flock.dir * b.dx + Math.sin(k * 0.05) * 3), y = Math.round(flock.y + b.dy + Math.sin(k * 0.11) * 2);
      for (const [px, py] of ((k >> 2) & 1 ? BAT_UP : BAT_DN)) ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
  function drawAmbient(ctx, cam) {
    for (const p of amb) {
      const x = Math.round(p.x - cam.x), y = Math.round(p.y - cam.y);
      if (p.kind === 'firefly') {
        if ((p.t + Math.floor(p.seed * 10)) % 40 < 22) { ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = 'rgba(200,248,24,0.25)'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
      } else if (p.kind === 'drip') { ctx.fillStyle = p.col; ctx.fillRect(x, y, 1, 3); }
      else if (p.kind === 'ripple') { // sich ausbreitender Wellenring (flach, perspektivisch)
        const r = 1 + p.t * 0.32, a = 1 - p.t / p.life;
        ctx.globalAlpha = 0.75 * a; ctx.fillStyle = '#a4e4fc';
        ctx.fillRect(Math.round(x - r), y, 2, 1); ctx.fillRect(Math.round(x + r) - 1, y, 2, 1);
        if (p.t > 7) { const r2 = (p.t - 7) * 0.32; ctx.fillRect(Math.round(x - r2), y, 1, 1); ctx.fillRect(Math.round(x + r2), y, 1, 1); }
        if (p.t < 6) ctx.fillRect(x, y - 1 - Math.round(Math.sin(p.t / 6 * Math.PI) * 3), 1, 1); // hochspringendes Tröpfchen
        ctx.globalAlpha = 1;
      } else if (p.kind === 'splat') { // Spritzer auf Stein
        ctx.fillStyle = p.col; const d = Math.round(p.t * 0.4);
        ctx.fillRect(x - 1 - d, y - 1 - (p.t < 6 ? 1 : 0), 1, 1); ctx.fillRect(x + 1 + d, y - 1 - (p.t < 6 ? 1 : 0), 1, 1);
      } else {
        const fade = p.t > p.life - 30 ? (p.t & 2) : 1;
        if (!fade) continue;
        ctx.fillStyle = p.col;
        if (p.kind === 'page') { const k = (p.t >> 4) & 1; ctx.fillRect(x, y, k ? 3 : 2, k ? 1 : 2); continue; }
        ctx.fillRect(x, y, 1, 1);
        if (p.kind === 'wisp' && (p.t & 8)) { ctx.globalAlpha = 0.4; ctx.fillRect(x - 1, y + 1, 3, 1); ctx.globalAlpha = 1; }
      }
    }
  }

  return { render, drawFog, updateAmbient, drawAmbient, resetAmbient, disc, updateStorm, drawStormSky, stormOn, updateFlock, drawFlock };
})();
