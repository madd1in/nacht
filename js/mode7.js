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
    for (let X = 0; X < TW; X += 64) { // goldene Stützrippen quer zur Achse (biegen sich in der Röhre)
      P('#2c1400', X, 0, 12, TH); P('#8c5800', X + 1, 0, 10, TH); P('#e8b030', X + 2, 0, 3, TH); P('#5c3400', X + 9, 0, 2, TH);
      for (let Y = 4; Y < TH; Y += 16) { P('#fcd880', X + 4, Y, 3, 3); P('#5c3400', X + 5, Y + 3, 2, 1); }
    }
    for (let k = 1; k < 4; k++) x.drawImage(tex, 0, 0, TW, TH, k * TW, 0, TW, TH);
  }
  const FOC = 92; // Brennweite der Röhre: kleiner = stärker gekrümmt
  function makeShade(w) { // ferne Rückwand (Mitte) im Dunst, nahe Wand oben/unten heller; seitliche Vignette
    shadeW = w; shadeC = Sprites.canvas(w, 208);
    const x = shadeC.getContext('2d');
    for (let y = 0; y < 208; y++) {
      const c = Math.cos(Math.atan((y + 0.5 - 104) / FOC));
      x.fillStyle = `rgba(14,0,30,${(0.62 * Math.pow(c, 3)).toFixed(3)})`; x.fillRect(0, y, w, 1);
    }
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(0.18, 'rgba(0,0,0,0)'); g.addColorStop(0.82, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = g; x.fillRect(0, 0, w, 208);
  }
  function drawTunnel(ctx, w, t, alpha = 1) {
    if (!tex) makeTex();
    if (!shadeC || shadeW !== w) makeShade(w);
    const camX = (typeof W !== 'undefined' && W.cam) ? W.cam.x : 0;
    const rot = t * 0.9, step = MOBILE_RENDER || View.lite ? 2 : 1;
    const mid = (((camX * 0.35) % TW) + TW) % TW + 384; // Bildmitte in der (4x breiten) Textur
    ctx.save();
    ctx.globalAlpha = alpha; ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < 208; y += step) {
      const yy = y + step / 2 - 104, phi = Math.atan(yy / FOC); // Blickwinkel auf die Röhreninnenseite
      const v = ((Math.floor(phi * TH * 0.62 + rot) % TH) + TH) % TH;
      const sw = w / Math.sqrt(1 + (yy / FOC) ** 2); // nahe Wand → größer: senkrechte Rippen biegen sich
      ctx.drawImage(tex, mid - sw / 2, v, sw, 1, 0, y, w, step);
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

  // ---------------- Mode-7-Ozean mit Monsterwellen ----------------
  // Perspektivische Meeresebene wie in Mode 7, dazu ein Höhenfeld, Spalte für Spalte von vorn nach hinten
  // gezeichnet (Voxel-Prinzip): Dünungsberge rollen auf das Schiff zu und ragen über den Horizont; eine
  // Monsterwelle (rogue = Entfernung) türmt sich auf, bevor sie gegen den Rumpf schlägt.
  const OC_H = 84, OC_HOR = 41, OC_F = 60, OC_CAM = 30, OC_Z0 = 22, OC_Z1 = 420;
  const OC_DEEP = [8, 14, 40], OC_MID = [22, 36, 86], OC_HI = [70, 92, 170], OC_FOAM = [196, 212, 252], OC_FOG = [42, 40, 88], OC_MOON = [200, 120, 130];
  let OC = null, ocZ = null, ocZB = null;
  const mixC = (a, b, k, l) => (255 << 24) | (Math.min(255, (a[2] + (b[2] - a[2]) * k) * l) << 16) | (Math.min(255, (a[1] + (b[1] - a[1]) * k) * l) << 8) | Math.min(255, (a[0] + (b[0] - a[0]) * k) * l);
  // Riesenkrake: Fangarme als Kette perspektivischer Scheiben, mit Tiefenpuffer gegen die Wellen verdeckt.
  // k = { t, arms: [{ u (relativ zur Blickmitte), z, len, ph }] }; t: 0–90 auftauchen, 330–364 zuschlagen, ab 370 versinken
  const SKIN = [92, 28, 68], SKIN_HI = [160, 72, 120], SUCK = [232, 180, 200];
  function drawTentacles(buf, zb, tw, u0, k, light) {
    const r = Math.min(1, k.t / 90), rise = r * r * (3 - 2 * r);
    const a = k.t > 330 ? Math.min(1, (k.t - 330) / 34) : 0, ang = a * a * 1.45, sink = k.t > 370 ? (k.t - 370) / 50 : 0;
    for (const arm of k.arms) {
      const N = 36;
      for (let i = N; i >= 0; i--) {
        const s = i / N, h = s * arm.len * rise;
        const du = Math.sin(s * 3.2 + k.t * 0.045 + arm.ph) * 10 * s + (s > 0.7 ? Math.sin(k.t * 0.07 + arm.ph) * (s - 0.7) * 30 : 0);
        const dz = Math.cos(s * 2 + k.t * 0.03 + arm.ph) * 6 * s;
        const h2 = h * Math.cos(ang) - sink * arm.len, z2 = arm.z + dz - h * Math.sin(ang);
        if (z2 < OC_Z0) continue;
        const cx = tw / 2 + ((arm.u + du) / z2) / 0.95 * (tw / 2) - 0.5, cy = OC_HOR + (OC_CAM - h2) * OC_F / z2;
        const R = ((1 - s * 0.85) * 6 + 1) * OC_F / z2, fog = Math.min(1, (z2 - OC_Z0) / (OC_Z1 - OC_Z0) * 1.25);
        const cSkin = mixC(SKIN, OC_FOG, fog, light), cHi = mixC(SKIN_HI, OC_FOG, fog, light), cSuck = mixC(SUCK, OC_FOG, fog, light);
        const x0 = Math.max(0, Math.floor(cx - R)), x1 = Math.min(tw - 1, Math.ceil(cx + R)), y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(OC_H - 1, Math.ceil(cy + R));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const ddx = x + 0.5 - cx, ddy = y + 0.5 - cy;
          if (ddx * ddx + ddy * ddy > R * R) continue;
          const idx = y * tw + x;
          if (zb[idx] <= z2) continue;
          zb[idx] = z2;
          buf[idx] = ddx < -R * 0.35 ? cHi : (i % 3 === 0 && ddx > R * 0.25 && ddy * ddy < R * R * 0.2) ? cSuck : cSkin; // Saugnäpfe innen
        }
      }
    }
  }
  function drawOcean(ctx, w, t, o = {}) {
    const lo = MOBILE_RENDER || View.lite, sx = lo ? 3 : 2, tw = Math.ceil(w / sx);
    if (!OC || OC.w !== tw) { const c = Sprites.canvas(tw, OC_H), x = c.getContext('2d'), img = x.createImageData(tw, OC_H); OC = { w: tw, c, x, img, buf: new Uint32Array(img.data.buffer) }; ocZB = new Float32Array(tw * OC_H); }
    if (!ocZ || ocZ.lo !== lo) { ocZ = []; for (let z = OC_Z0; z < OC_Z1; z = z * (lo ? 1.035 : 1.022) + 0.6) ocZ.push(z); ocZ.lo = lo; }
    const buf = OC.buf, zb = ocZB; buf.fill(0); zb.fill(1e9);
    const calm = o.calm === undefined ? 1 : o.calm, A = 30 * (0.3 + 0.7 * calm), light = o.flash ? 1.7 : 1;
    const rv = o.rogue || 0, AR = rv ? 80 * Math.sqrt(Math.max(0, 1 - rv / 430)) : 0;
    const u0 = (o.camX || 0) * 0.06 + (o.sail || 0) * 0.8, moonX = (w - 92) / sx;
    const fogFill = mixC(OC_FOG, OC_FOG, 0, light);
    for (let x = 0; x < tw; x++) {
      const dx = (x + 0.5 - tw / 2) / (tw / 2) * 0.95;
      let ymin = OC_H;
      for (let i = 0; i < ocZ.length && ymin > 0; i++) {
        const z = ocZ[i], u = u0 + dx * z;
        const s = (Math.sin(z * 0.045 + t * 0.035 + Math.sin(u * 0.012 + z * 0.004) * 1.2) + 1) * 0.5, s3 = s * s * s;
        let h = s3 * A + Math.sin(u * 0.06 + z * 0.03 - t * 0.05) * 3 + Math.sin(u * 0.11 - z * 0.07 + t * 0.08) * 1.5, rog = 0;
        if (AR) { const d = z - rv, q = d / (d < 0 ? 8 : 22); rog = Math.exp(-q * q) * (0.8 + 0.2 * Math.cos(u * 0.02 + t * 0.01)); h += rog * AR; } // steile Front, langer Rücken
        const sy = Math.floor(OC_HOR + (OC_CAM - h) * OC_F / z);
        if (sy >= ymin) continue;
        const fog = Math.min(1, (z - OC_Z0) / (OC_Z1 - OC_Z0) * 1.25), crest = Math.max(s3 * (1 - rog * 0.5), Math.pow(rog, 3) * 0.97); // Monsterwelle: unten dunkel, oben heller, weiße Krone
        const cs = [mixC(OC_DEEP, OC_FOG, fog, light), mixC(OC_MID, OC_FOG, fog, light), mixC(OC_HI, OC_FOG, fog * 0.8, light), mixC(OC_FOAM, OC_FOG, fog * 0.6, light)];
        const moon = mixC(OC_MOON, OC_FOG, fog * 0.5, light);
        for (let y = Math.max(0, sy); y < ymin; y++) {
          const b = BAY[(y & 3) * 4 + (x & 3)], c = crest - (y - sy) * 0.07 + b * 0.18; // Wellenflanke unter dem Kamm dunkler
          let col = c > 0.9 ? cs[3] : c > 0.6 ? cs[2] : c > 0.26 ? cs[1] : cs[0];
          if (c > 0.55 && b > 0.8 && Math.abs(x - moonX) < 1.5 + Math.max(0, y - OC_HOR) * 0.16) col = moon; // Mondglitzern (nur auf Kämmen)
          buf[y * tw + x] = col; zb[y * tw + x] = z;
        }
        ymin = Math.max(0, sy);
      }
      for (let y = OC_HOR; y < ymin; y++) { buf[y * tw + x] = fogFill; zb[y * tw + x] = OC_Z1; } // Meer bis zum Horizont im Dunst
    }
    if (o.kraken && o.kraken.t >= 0) drawTentacles(buf, zb, tw, u0, o.kraken, light);
    OC.x.putImageData(OC.img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(OC.c, 0, 0, tw, OC_H, 0, 122 - OC_HOR * 2, tw * sx, OC_H * 2);
    ctx.restore();
  }

  // ---------------- HDMA-Welle & Mosaik ----------------
  let wc = null;
  function wave(ctx, y0, h, w, amp, t, freq = 0.09) {
    if (amp <= 0.05) return;
    if (!wc || wc.width !== w || wc.height !== h) wc = Sprites.canvas(w, h);
    const wx = wc.getContext('2d');
    wx.clearRect(0, 0, w, h); wx.drawImage(ctx.canvas, 0, y0, w, h, 0, 0, w, h);
    const band = MOBILE_RENDER || View.lite ? 4 : 2;
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

  return { drawTunnel, drawMap, drawOcean, wave, mosaic, drawFire };
})();
