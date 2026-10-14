// SNES-artige Effekte: rotierender Mode-7-Tunnel, perspektivische Kartenebene, HDMA-Wellen, Mosaik.
'use strict';

const Mode7 = (() => {
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
  const RGB = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;
  const MOBILE_RENDER = !!window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  let lastMobileDraw = -Infinity;

  // ---------------- Drehende Walze (wie der rotierende Raum in Super Castlevania IV) ----------------
  // Die Wand ist ein Zylinder, dessen Achse waagerecht entlang des Gangs liegt. Pro Rasterzeile wird die
  // passende Texturzeile gewählt (HDMA-Prinzip): v = asin(y/R) → nur ~200 Streifen-Kopien pro Bild, auch mobil flott.
  const TW = 256, TH = 256;
  let tex = null, shadeC = null, shadeW = 0;
  function makeTex() {
    tex = Sprites.canvas(TW * 4, TH);
    const x = tex.getContext('2d');
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const P = (c, X, Y, w = 1, h = 1) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
    P('#12041c', 0, 0, TW, TH);
    for (let r = 0; r < TH / 16; r++) for (let b = -1; b < TW / 32 + 1; b++) {
      const bx = b * 32 + (r % 2) * 16, by = r * 16, v = rnd();
      P(v < 0.15 ? '#3a1450' : v < 0.6 ? '#4c1c66' : '#58227a', bx + 1, by + 1, 30, 14);
      P('#7c3ca0', bx + 1, by + 1, 30, 1); P('#2c0c3c', bx + 1, by + 14, 30, 1);
      if (v > 0.86) { // glühende Rune
        const rx = bx + 10 + Math.floor(rnd() * 8), ry = by + 4;
        P('#a80030', rx, ry, 2, 7); P('#a80030', rx - 2, ry + 3, 6, 1); P('#fc5070', rx, ry + 1, 1, 4);
      }
      if (v > 0.5 && v < 0.53) { P('#2c0c3c', bx + 8, by + 6, 10, 1); P('#2c0c3c', bx + 14, by + 7, 6, 1); } // Riss
    }
    for (let X = 0; X < TW; X += 128) { // goldene Stützrippen quer zur Achse
      P('#2c1400', X, 0, 12, TH); P('#8c5800', X + 1, 0, 10, TH); P('#e8b030', X + 2, 0, 3, TH); P('#5c3400', X + 9, 0, 2, TH);
      for (let Y = 4; Y < TH; Y += 16) { P('#fcd880', X + 4, Y, 3, 3); P('#5c3400', X + 5, Y + 3, 2, 1); }
    }
    for (let k = 1; k < 4; k++) x.drawImage(tex, 0, 0, TW, TH, k * TW, 0, TW, TH);
  }
  function makeShade(w) { // Rundung: zu den Rändern hin dunkler (weicher Verlauf + violetter Saum)
    shadeW = w; shadeC = Sprites.canvas(w, 208);
    const x = shadeC.getContext('2d'), R = 104 * 1.12;
    for (let y = 0; y < 208; y++) {
      const c = Math.cos(Math.asin((y + 0.5 - 104) / R));
      x.fillStyle = `rgba(6,0,14,${Math.min(0.95, (1 - c) * 1.5)})`; x.fillRect(0, y, w, 1);
      if (c > 0.97) { x.fillStyle = 'rgba(255,180,255,0.05)'; x.fillRect(0, y, w, 1); } // Glanz vorne
    }
  }
  function drawTunnel(ctx, w, t, alpha = 1) {
    if (!tex) makeTex();
    if (!shadeC || shadeW !== w) makeShade(w);
    const camX = (typeof W !== 'undefined' && W.cam) ? W.cam.x : 0;
    const R = 104 * 1.12, rot = t * 0.9, step = MOBILE_RENDER ? 2 : 1;
    const sx = ((Math.floor(camX * 0.35) % TW) + TW) % TW;
    ctx.save();
    ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < 208; y += step) {
      const th = Math.asin((y + step / 2 - 104) / R); // Winkel auf dem Zylinder
      const v = ((Math.floor(th * TH * 0.55 + rot) % TH) + TH) % TH;
      ctx.drawImage(tex, sx, v, w, 1, 0, y, w, step);
    }
    ctx.drawImage(shadeC, 0, 0);
    ctx.restore();
  }
  // ---------------- Mode-7-Weltkarte ----------------
  const MS = 256;
  let map = null;
  const POINTS = [[60, 200], [128, 128], [196, 58]];
  function makeMap() {
    map = new Uint32Array(MS * MS);
    let seed = 5;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
      const n = Math.sin(x * 0.07) * Math.cos(y * 0.06) + Math.sin((x + y) * 0.13) * 0.5;
      map[y * MS + x] = n > 0.75 ? RGB(92, 92, 108) : n > 0.45 ? RGB(28, 56, 30) : ((x ^ y) & 4) ? RGB(34, 70, 36) : RGB(40, 80, 40);
    }
    for (let i = 0; i < 700; i++) { const x = Math.floor(rnd() * MS), y = Math.floor(rnd() * MS); for (let k = 0; k < 4; k++) map[((y + (k >> 1)) & 255) * MS + ((x + (k & 1)) & 255)] = RGB(14, 36, 18); }
    for (let y = 0; y < MS; y++) { const rx = Math.floor(30 + Math.sin(y * 0.05) * 18); for (let k = 0; k < 6; k++) map[y * MS + ((rx + k) & 255)] = k === 0 || k === 5 ? RGB(40, 90, 160) : RGB(30, 70, 190); }
    const line = ([x0, y0], [x1, y1]) => { for (let t = 0; t <= 1; t += 0.002) { const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * 9) * 6); for (let k = -2; k <= 2; k++) map[((y + k) & 255) * MS + (x & 255)] = RGB(176, 140, 90); } };
    line(POINTS[0], POINTS[1]); line(POINTS[1], POINTS[2]);
    POINTS.forEach(([cx, cy], i) => {
      const s = 7 + i * 2;
      for (let y = -s; y <= s; y++) for (let x = -s; x <= s; x++) {
        const edge = Math.abs(x) === s || Math.abs(y) === s;
        map[((cy + y) & 255) * MS + ((cx + x) & 255)] = edge ? RGB(30, 26, 34) : (y < -s / 3 ? RGB(168, 0, 32) : RGB(110, 110, 124));
      }
    });
  }
  let M = null;
  function drawMap(ctx, w, t, stage) {
    if (!map) makeMap();
    const tw = Math.ceil(w / 2), th = 104, hor = 30;
    if (!M || M.w !== tw) { const c = Sprites.canvas(tw, th), x = c.getContext('2d'), img = x.createImageData(tw, th); M = { w: tw, c, x, img, buf: new Uint32Array(img.data.buffer) }; }
    const [px, py] = POINTS[clamp(stage, 0, 2)], ang = t * 0.006 + stage * 1.3;
    const fx = Math.sin(ang), fy = -Math.cos(ang), rx = Math.cos(ang), ry = Math.sin(ang);
    const camX = px - fx * 70, camY = py - fy * 70, buf = M.buf;
    for (let y = 0; y < th; y++) {
      if (y <= hor) { // Himmel mit Farbverlauf
        const k = y / hor, col = RGB(20 + k * 60, 4 + k * 10, 30 + k * 40);
        for (let x = 0; x < tw; x++) buf[y * tw + x] = ((x * 7 + y * 13) % 97 === 0 && k < 0.6) ? RGB(200, 200, 230) : col;
        continue;
      }
      const z = 1800 / (y - hor), fog = Math.max(0.25, Math.min(1, 1.6 - z / 260));
      for (let x = 0; x < tw; x++) {
        const sx = (x - tw / 2) * z / 140;
        const u = Math.floor(camX + rx * sx + fx * z) & 255, v = Math.floor(camY + ry * sx + fy * z) & 255;
        const c = map[v * MS + u], k = Math.min(1, Math.floor(fog * 5 + BAY[(y & 3) * 4 + (x & 3)]) / 5);
        buf[y * tw + x] = (255 << 24) | ((((c >> 16) & 255) * k) << 16) | ((((c >> 8) & 255) * k) << 8) | ((c & 255) * k);
      }
    }
    M.x.putImageData(M.img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(M.c, 0, 0, tw, th, 0, 32, tw * 2, 208);
    ctx.restore();
  }

  // ---------------- HDMA-Welle & Mosaik ----------------
  let wc = null;
  function wave(ctx, y0, h, w, amp, t, freq = 0.09) {
    if (amp <= 0.05) return;
    if (!wc || wc.width !== w || wc.height !== h) wc = Sprites.canvas(w, h);
    const wx = wc.getContext('2d');
    wx.clearRect(0, 0, w, h); wx.drawImage(ctx.canvas, 0, y0, w, h, 0, 0, w, h);
    const band = MOBILE_RENDER ? 4 : 2;
    for (let y = 0; y < h; y += band) {
      const rows = Math.min(band, h - y);
      const off = Math.round(Math.sin((y + rows / 2) * freq + t * 0.12) * amp);
      if (off) ctx.drawImage(wc, 0, y, w, rows, off, y0 + y, w, rows);
    }
  }
  let mc = null;
  function mosaic(ctx, y0, h, w, size) {
    if (size <= 1) return;
    const sw = Math.ceil(w / size), sh = Math.ceil(h / size);
    if (!mc || mc.width < sw || mc.height < sh) mc = Sprites.canvas(Math.max(sw, 320), Math.max(sh, 240));
    const mx = mc.getContext('2d');
    mx.imageSmoothingEnabled = false;
    mx.drawImage(ctx.canvas, 0, y0, w, h, 0, 0, sw, sh);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mc, 0, 0, sw, sh, 0, y0, sw * size, sh * size);
    ctx.restore();
  }

  // ---------------- Demo-Feuer (für das Titellogo) ----------------
  const FW = 120, FH = 34;
  let fire = null, fc = null, fimg = null, fbuf = null, fpal = null;
  function drawFire(ctx, x, y, w, h, intensity = 1) {
    if (!fire) {
      fire = new Uint8Array(FW * FH); fc = Sprites.canvas(FW, FH); fimg = fc.getContext('2d').createImageData(FW, FH); fbuf = new Uint32Array(fimg.data.buffer);
      fpal = Array.from({ length: 37 }, (_, i) => {
        const k = i / 36; if (i < 3) return 0;
        const r = Math.min(255, k * 2.3 * 255), g = Math.max(0, Math.min(255, (k - 0.45) * 2.1 * 255)), b = Math.max(0, Math.min(255, (k - 0.86) * 5 * 255));
        return (Math.min(255, i * 7) << 24) | (b << 16) | (g << 8) | r;
      });
    }
    for (let x2 = 0; x2 < FW; x2++) { // Glutbett, an den Rändern weich auslaufend
      const edge = Math.min(1, x2 / 18, (FW - 1 - x2) / 18);
      fire[(FH - 1) * FW + x2] = Math.random() < edge * intensity ? 36 : Math.floor(edge * 20);
    }
    for (let yy = 0; yy < FH - 1; yy++) for (let xx = 0; xx < FW; xx++) {
      const src = (yy + 1) * FW + xx, rnd = Math.floor(Math.random() * 3);
      const v = fire[src] - Math.floor(Math.random() * 2.7);
      fire[yy * FW + Math.max(0, Math.min(FW - 1, xx - rnd + 1))] = v > 0 ? v : 0;
    }
    for (let i = 0; i < FW * FH; i++) fbuf[i] = fpal[fire[i]] || 0;
    fc.getContext('2d').putImageData(fimg, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7;
    ctx.drawImage(fc, x, y, w, h);
    ctx.restore();
  }

  return { drawTunnel, drawMap, wave, mosaic, drawFire };
})();
