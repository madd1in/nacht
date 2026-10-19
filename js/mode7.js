// SNES-artige Effekte: rotierender Mode-7-Tunnel, perspektivische Kartenebene, HDMA-Wellen, Mosaik.
'use strict';

const Mode7 = (() => {
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16);
  // Pixelpuffer als Int32Array: Farben (255 << 24 | ...) sind negative int32 – in Uint32Array erzwingt das einen langsamen Umwandlungspfad
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
  // Punkt auf der Röhrenwand (u entlang der Achse, v rund herum, beides in Texturpixeln) → Bildposition und Maßstab –
  // dieselbe Abbildung wie drawTunnel, so drehen sich Objekte auf der Wand mit (wie Sprites über Mode 7 auf dem SNES)
  function tubeProject(u, v, w, t, camX) {
    const rot = t * 0.9, mid = (((camX * 0.35) % TW) + TW) % TW + 384;
    let d = (((v - rot) % TH) + TH) % TH; if (d >= TH / 2) d -= TH;
    const phi = d / (TH * 0.62), maxPhi = Math.atan(104 / FOC);
    if (Math.abs(phi) >= maxPhi) return null;
    const yy = FOC * Math.tan(phi), sw = w / Math.sqrt(1 + (yy / FOC) ** 2);
    const uk = u + Math.round((mid - u) / TW) * TW, x = (uk - (mid - sw / 2)) / sw * w;
    return { x, y: yy + 104, sx: w / sw, sy: FOC * (1 + (yy / FOC) ** 2) / (TH * 0.62), near: Math.abs(phi) / maxPhi, top: yy < 0 };
  }

  // ---------------- Mode-7-Weltkarte ----------------
  // Höhenfeld (nahtloses Wertrauschen) mit Relief-Schattierung im Mondlicht: Meer und Fluss mit Glanz, Wiesen, dunkle Wälder,
  // Fels, Schneegipfel, ein Pfad mit Holzbrücke. Darauf stehen Burgen und Tannen als Mode-7-Sprites, die mit der Entfernung
  // schrumpfen (wie in Mario Kart); am Horizont dreht sich ein Bergpanorama mit, darüber Mond und Sterne.
  const MS = 256;
  let map = null, mapH = null, trees = null, pano = null;
  const POINTS = [[20, 246], [52, 214], [112, 152], [168, 98], [200, 70], [238, 58], [222, 38]]; // Hafen, dann eine Burg je Kapitel
  function makeMap() {
    map = new Int32Array(MS * MS); mapH = new Float32Array(MS * MS);
    const hh = (x, y, s) => { let n = Math.imul(x * 374761393 + y * 668265263 + s * 1442695041, 1274126177); n ^= n >>> 13; n = Math.imul(n, 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
    const vn = (x, y, s, sd) => { const n = MS / s, gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = hh(x0 % n, y0 % n, sd), b = hh((x0 + 1) % n, y0 % n, sd), c = hh(x0 % n, (y0 + 1) % n, sd), d = hh((x0 + 1) % n, (y0 + 1) % n, sd);
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy; };
    for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
      let h = vn(x, y, 64, 1) * 0.5 + vn(x, y, 32, 2) * 0.25 + vn(x, y, 16, 3) * 0.15 + vn(x, y, 8, 4) * 0.1;
      const rx = 30 + Math.sin(y * 2 * Math.PI / MS * 3) * 18, dr = Math.min(Math.abs(x - rx), MS - Math.abs(x - rx)); // Flussbett
      if (dr < 7) h = Math.min(h, 0.24 + dr * 0.012);
      for (const [cx, cy] of POINTS) { const d = Math.hypot(x - cx, y - cy); if (d < 16) h = h * (d / 16) + 0.46 * (1 - d / 16); } // Burgplätze eingeebnet
      mapH[y * MS + x] = h;
    }
    const H = (x, y) => mapH[(y & 255) * MS + (x & 255)];
    for (let y = 0; y < MS; y++) for (let x = 0; x < MS; x++) {
      const h = H(x, y), sh = Math.max(0.45, Math.min(1.45, 0.85 + (H(x - 1, y - 1) - H(x + 1, y + 1)) * 16)), dt = hh(x, y, 9);
      let c = h < 0.27 ? [22, 44, 110] : h < 0.3 ? [40, 76, 150] : h < 0.32 ? [96, 88, 70] : h < 0.5 ? (dt > 0.85 ? [70, 110, 50] : [48, 92, 44]) : h < 0.64 ? (dt > 0.7 ? [36, 84, 40] : dt > 0.35 ? [20, 58, 30] : [14, 44, 24]) : h < 0.76 ? [96, 88, 92] : [204, 200, 226];
      if (h < 0.3 && dt > 0.93) c = [150, 160, 220]; // Mondglitzern auf dem Wasser
      const k = h < 0.3 ? 1 : sh;
      map[y * MS + x] = RGB(Math.min(255, c[0] * k * 0.78) | 0, Math.min(255, c[1] * k * 0.8) | 0, Math.min(255, c[2] * k * 1.05) | 0); // Mondlicht: etwas bläulich
    }
    const line = ([x0, y0], [x1, y1]) => { for (let t = 0; t <= 1; t += 0.002) { const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t + Math.sin(t * 9) * 6); for (let k = -2; k <= 2; k++) { const i = ((y + k) & 255) * MS + (x & 255), water = mapH[i] < 0.3; map[i] = water ? RGB(110, 70, 40) : Math.abs(k) === 2 ? RGB(80, 64, 44) : RGB(150, 124, 84); } } }; // Pfad, über Wasser als Holzbrücke
    for (let i = 1; i < POINTS.length; i++) line(POINTS[i - 1], POINTS[i]);
    POINTS.forEach(([cx, cy]) => { for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const d = Math.hypot(x, y); if (d <= 9) map[((cy + y) & 255) * MS + ((cx + x) & 255)] = d > 8 ? RGB(40, 36, 44) : ((x + y) & 1) ? RGB(88, 84, 96) : RGB(104, 100, 112); } }); // gepflasterte Burgplätze
    trees = []; let s = 77; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 400 && trees.length < 90; i++) { const x = rnd() * MS, y = rnd() * MS, h = H(x | 0, y | 0); if (h > 0.5 && h < 0.66 && POINTS.every(([px, py]) => Math.hypot(px - x, py - y) > 20)) trees.push([x, y, 0.8 + rnd() * 0.5]); }
    pano = new Int16Array(256); for (let i = 0; i < 256; i++) pano[i] = Math.round(6 + Math.abs(Math.sin(i / 256 * Math.PI * 6)) * 8 + Math.sin(i / 256 * Math.PI * 22) * 2 + hh(i >> 2, 1, 5) * 3); // Bergpanorama am Horizont
  }
  // Mode-7-Sprites: Burgen (je Stage eigene Silhouette mit Fackelfenstern und Fahne) und Tannen
  const BILL = (() => {
    const mk = (w, h, f) => { const c = Sprites.canvas(w, h), x = c.getContext('2d'); f((col, a, b, ww = 1, hh = 1) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); }); return c; };
    const castle = (kind) => mk(40, 44, (R) => {
      const S = '#5c5468', L = '#8c8498', D = '#2c2834', RF = '#a80020';
      const tower = (x, y, w, h, roof) => { R(D, x, y, w, h); R(S, x + 1, y, w - 2, h); R(L, x + 1, y, 1, h); if (roof) { for (let i = 0; i <= w / 2 + 1; i++) R(RF, x - 1 + i, y - 1 - i * 2, Math.max(1, w + 2 - i * 2), 2); R('#f8b800', x + w / 2, y - w - 6, 1, 4); R(RF, x + w / 2 + 1, y - w - 6, 3, 2); } else for (let i = 0; i < w; i += 2) R(S, x + i, y - 2, 1, 2); R('#f8b800', x + w / 2 - 1, y + 4, 2, 2); };
      if (kind === 0) { R(D, 4, 30, 32, 14); R(S, 5, 30, 30, 14); for (let i = 4; i < 36; i += 3) R(S, i, 28, 2, 2); tower(2, 22, 8, 22, true); tower(30, 22, 8, 22, true); tower(15, 14, 10, 30, true); R('#140c08', 17, 36, 6, 8); R('#3c2810', 17, 36, 6, 1); } // Burghof mit Tor
      else if (kind === 1) { R(D, 6, 26, 28, 18); R(S, 7, 26, 26, 18); for (let i = 0; i < 16; i++) R(S, 20 - i, 26 - Math.floor(i * 0.7), i * 2, 1); R('#140c08', 16, 34, 8, 10); R('#58f898', 19, 36, 2, 2); for (const gx of [1, 35]) { R(S, gx, 36, 4, 8); R(L, gx + 1, 34, 2, 2); R(L, gx, 37, 4, 1); } } // Gruft mit Grabsteinen
      else if (kind === 2) { tower(13, 6, 14, 38, true); tower(3, 26, 8, 18, false); tower(29, 26, 8, 18, false); R('#fcd040', 19, 14, 2, 3); R('#fcd040', 19, 22, 2, 3); } // Bergfried
      else if (kind === 4) { // Sonnenkathedrale: goldene Turmhelme, Rosette, Strebebögen
        const G = '#e8c070', GL = '#fcf0b0', GD = '#8c6420';
        R(GD, 8, 24, 24, 20); R(G, 9, 24, 22, 20); R(GL, 9, 24, 1, 20);
        for (const [tx, h] of [[4, 30], [30, 30], [16, 40]]) { R(GD, tx, 44 - h, 7, h); R(G, tx + 1, 44 - h, 5, h); for (let i = 0; i < 8; i++) R(i < 2 ? '#fcfcfc' : G, tx + 3 - Math.floor(i / 3), 44 - h - 8 + i, 1 + 2 * Math.floor(i / 3), 1); }
        R('#fcf0b0', 18, 28, 4, 4); R('#f8b800', 19, 29, 2, 2); R('#3c2410', 17, 37, 6, 7);
        for (const bx of [1, 36]) { R(G, bx, 34, 3, 10); for (let i = 0; i < 4; i++) R(GL, bx + (bx < 20 ? 3 + i : -1 - i), 34 - i, 1, 1); }
      }
      else { R(D, 7, 22, 26, 22); R(S, 8, 22, 24, 22); tower(1, 16, 7, 28, true); tower(32, 16, 7, 28, true); tower(14, 12, 12, 32, true); for (const wy of [18, 26, 34]) { R('#e82828', 19, wy, 2, 3); R('#801010', 19, wy + 2, 2, 1); } R('#e82828', 4, 24, 1, 2); R('#e82828', 35, 24, 1, 2); R('#140c08', 17, 38, 6, 6); } // Schloss des Grafen mit blutroten Fenstern
    });
    const tree = mk(12, 20, (R) => { for (let r = 0; r < 17; r++) { const w = Math.max(1, Math.round(r / 17 * 11) - (r % 4 === 3 ? 2 : 0)); R(r % 4 === 0 ? '#1c4c28' : '#0c2c18', 6 - (w >> 1), r, w, 1); if (w > 2) R('#2c6c38', 6 - (w >> 1), r, 1, 1); } R('#2c1c10', 5, 17, 2, 3); });
    return { castles: [castle(0), castle(1), castle(2), castle(4), castle(3)], tree };
  })();
  let M = null;
  function drawMap(ctx, w, t, stage) {
    if (!map) makeMap();
    const tw = Math.ceil(w / 2), th = 104, hor = 30;
    if (!M || M.w !== tw) { const c = Sprites.canvas(tw, th), x = c.getContext('2d'), img = x.createImageData(tw, th); M = { w: tw, c, x, img, buf: new Int32Array(img.data.buffer) }; }
    const [px, py] = POINTS[clamp(stage, 0, POINTS.length - 1)], ang = t * 0.006 + stage * 1.3;
    const reuse = View.lite && (t & 1) && M.done; // Sparmodus: die Karte dreht sich langsam – jeder zweite Frame genügt
    const fx = Math.sin(ang), fy = -Math.cos(ang), rx = Math.cos(ang), ry = Math.sin(ang);
    const camX = px - fx * 70, camY = py - fy * 70, buf = M.buf, FOG = [70, 40, 96];
    const po = Math.floor(ang / (Math.PI * 2) * 512);
    if (!reuse) {
    for (let y = 0; y < th; y++) {
      if (y <= hor) { // Himmel: Verlauf, Sterne, Mond, Bergpanorama, das sich mit dem Blick dreht
        const k = y / hor;
        for (let x = 0; x < tw; x++) {
          let col = RGB(14 + k * 56, 4 + k * 30, 30 + k * 66);
          if (((x * 7 + y * 13 + po * 3) % 97 === 0) && k < 0.7) col = RGB(210, 210, 240);
          const mx = ((x * 2 + po) % 512 + 512) % 512 - 300, md = Math.hypot(mx / 2, y - 10); // Blutmond
          if (md < 6) col = md < 5 ? RGB(216, 60 + (y - 10) * 4, 40) : RGB(120, 20, 30);
          const ph = pano[(((x + (po >> 1)) % 256) + 256) % 256];
          if (y > hor - ph) col = y > hor - ph + 1 ? RGB(14, 8, 24) : RGB(150, 100, 170); // Bergsilhouette mit Mondlicht-Kante
          buf[y * tw + x] = col;
        }
        continue;
      }
      const z = 1800 / (y - hor), fog = Math.max(0, Math.min(1, (z - 140) / 380));
      for (let x = 0; x < tw; x++) {
        const sx = (x - tw / 2) * z / 140;
        const u = Math.floor(camX + rx * sx + fx * z) & 255, v = Math.floor(camY + ry * sx + fy * z) & 255;
        const c = map[v * MS + u], f = Math.min(1, Math.floor(fog * 6 + BAY[(y & 3) * 4 + (x & 3)]) / 6); // Dunst zum Horizont hin, gedithert
        buf[y * tw + x] = (255 << 24) | ((((c >> 16) & 255) * (1 - f) + FOG[2] * f) << 16) | ((((c >> 8) & 255) * (1 - f) + FOG[1] * f) << 8) | ((c & 255) * (1 - f) + FOG[0] * f);
      }
    }
    M.x.putImageData(M.img, 0, 0); M.done = true;
    }
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(M.c, 0, 0, tw, th, 0, 32, tw * 2, 208);
    // Mode-7-Sprites: von hinten nach vorn, mit der Entfernung skaliert (nächste Wiederholung der nahtlosen Karte)
    const objs = [];
    const add = (wx, wy, img, size, glow) => {
      const dx = ((wx - camX + 128) % 256 + 256) % 256 - 128, dy = ((wy - camY + 128) % 256 + 256) % 256 - 128;
      const z = dx * fx + dy * fy, lat = dx * rx + dy * ry;
      if (z < 12 || z > 700) return;
      const sx = tw / 2 + lat * 140 / z, sy = hor + 1800 / z, sc = 140 / z * size;
      if (sx < -40 || sx > tw + 40) return;
      objs.push({ z, sx, sy, sc, img, glow });
    };
    trees.forEach(([x, y, s]) => add(x, y, BILL.tree, 0.25 * s));
    POINTS.forEach(([x, y], i) => add(x, y, BILL.castles[Math.min(i, BILL.castles.length - 1)], 0.45, i === clamp(stage, 0, POINTS.length - 1)));
    objs.sort((a, b) => b.z - a.z);
    for (const o of objs) {
      const wd = o.img.width * o.sc * 2, ht = o.img.height * o.sc * 2, X = o.sx * 2 - wd / 2, Y = 32 + o.sy * 2 - ht;
      ctx.globalAlpha = Math.max(0.15, Math.min(1, 1.3 - o.z / 520));
      if (o.glow) { const r = 18 + Math.sin(t * 0.15) * 4; ctx.fillStyle = 'rgba(232,40,40,0.25)'; ctx.beginPath(); ctx.ellipse(o.sx * 2, 32 + o.sy * 2, r * o.sc * 3, r * o.sc, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.drawImage(o.img, Math.round(X), Math.round(Y), Math.max(1, Math.round(wd)), Math.max(1, Math.round(ht)));
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // ---------------- Mode-7-Ozean mit Monsterwellen ----------------
  // Perspektivische Meeresebene wie in Mode 7, dazu ein Höhenfeld, Spalte für Spalte von vorn nach hinten
  // gezeichnet (Voxel-Prinzip): Dünungsberge rollen auf das Schiff zu und ragen über den Horizont; eine
  // Monsterwelle (rogue = Entfernung) türmt sich auf, bevor sie gegen den Rumpf schlägt.
  // Licht: der Mond steht hinter dem Meer – Wellenkanten glänzen, dünne Kämme leuchten türkis durch,
  // Schaumspitzen treiben mit, von hohen Kämmen weht Gischt, auf dem Mondpfad funkelt es.
  const OC_H = 84, OC_HOR = 41, OC_F = 60, OC_CAM = 30, OC_Z0 = 22, OC_Z1 = 420;
  const OC_DEEP = [8, 14, 40], OC_MID = [22, 36, 86], OC_HI = [70, 92, 170], OC_FOAM = [196, 212, 252], OC_FOG = [42, 40, 88], OC_MOON = [226, 200, 222];
  const OC_TEAL = [36, 104, 136], OC_RIM = [130, 150, 220], OC_MID2 = [42, 60, 126]; // MID2: Zwischenstufe für eine weichere Rampe
  let OC = null, ocZ = null, ocZB = null;
  const spray = new Int32Array(3 * 1200);
  const mixC = (a, b, k, l) => (255 << 24) | (Math.min(255, (a[2] + (b[2] - a[2]) * k) * l) << 16) | (Math.min(255, (a[1] + (b[1] - a[1]) * k) * l) << 8) | Math.min(255, (a[0] + (b[0] - a[0]) * k) * l);
  const hsh = (a, b, c) => { let n = Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791); n = Math.imul(n ^ (n >>> 13), 0x5bd1e995); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
  // Riesenkrake: Fangarme als Kette perspektivischer Scheiben – in voller Auflösung in einen eigenen Puffer (mit Luft
  // nach oben), vom Tiefenpuffer des Meeres verdeckt. Erst ein Umriss (etwas weiter hinten), dann der runde Arm:
  // Mondlicht von rechts oben, Saugnäpfe unten, herabrinnendes Wasser, Tropfen, Schaumkranz am Wasserspiegel.
  // k = { t, arms: [{ u (relativ zur Blickmitte), z, len, ph }] }; t: 0–90 auftauchen, 330–364 zuschlagen, ab 370 versinken
  const T_O = [16, 4, 26], T_D = [44, 12, 60], T_M = [90, 32, 112], T_L = [140, 66, 168], T_S = [228, 180, 244], T_K = [244, 186, 220], T_KC = [120, 40, 90];
  const LX = 0.6, LY = -0.8, KTOP = 96; // KTOP: Spielpixel über dem Meerespuffer, damit hohe Arme nicht abgeschnitten werden
  let KB = null;
  function drawTentacles(ozb, tw, sx, k, light, CAM, t, vq = 1) {
    const sh = vq === 2 ? 0 : 1; // Spielpixel → Zeile im Meerespuffer
    const KW = tw * sx, KH = KTOP + OC_H * 2;
    if (!KB || KB.w !== KW) { const c = Sprites.canvas(KW, KH), x = c.getContext('2d'), img = x.createImageData(KW, KH); KB = { w: KW, c, x, img, buf: new Int32Array(img.data.buffer), zb: new Float32Array(KW * KH) }; }
    if (!KB.col || KB.col.sx !== sx) { KB.col = new Int32Array(KW); for (let x = 0; x < KW; x++) KB.col[x] = (x / sx) | 0; KB.col.sx = sx; }
    const buf = KB.buf, zb = KB.zb, colIx = KB.col, bb = KB.box;
    if (bb) for (let y = bb.y0; y <= bb.y1; y++) { buf.fill(0, y * KW + bb.x0, y * KW + bb.x1 + 1); zb.fill(1e9, y * KW + bb.x0, y * KW + bb.x1 + 1); } // nur den zuletzt benutzten Ausschnitt leeren
    else { buf.fill(0); zb.fill(1e9); }
    const box = KB.box = { x0: KW, y0: KH, x1: -1, y1: -1 };
    const r = Math.min(1, k.t / 90), rise = r * r * (3 - 2 * r), ts = k.sw !== undefined ? k.sw : k.t; // ts: Schwankuhr läuft auch, wenn der Krake verharrt
    const a = k.t > 330 ? Math.min(1, (k.t - 330) / 34) : 0, ang = a * a * 1.45, sink = k.t > 370 ? (k.t - 370) / 50 : 0;
    const N = 52, P = [];
    // Meerestiefe unter einem Spielpixel des Armpuffers (oberhalb des Meeres: nichts davor)
    const water = (x, y) => { const by = (y - KTOP) >> sh; return by < 0 ? 1e9 : ozb[by * tw + colIx[x]]; };
    const disc = (p, R, zt, nx, ny, C5, sk, i) => {
      const x0 = Math.max(0, Math.floor(p.x - R)), x1 = Math.min(KW - 1, Math.ceil(p.x + R)), y0 = Math.max(0, Math.floor(p.y - R)), y1 = Math.min(KH - 1, Math.ceil(p.y + R));
      const skx = p.x - nx * p.R * 0.56, sky = p.y - ny * p.R * 0.56, skr = p.R * 0.28, skr2 = skr * skr;
      for (let y = y0; y <= y1; y++) {
        const ddy = y + 0.5 - p.y, q = R * R - ddy * ddy;
        if (q < 0) continue;
        const hw = Math.sqrt(q), xa = Math.max(x0, Math.round(p.x - hw)), xb = Math.min(x1, Math.round(p.x + hw) - 1), row = y * KW, by = (y & 3) * 4, wy = (y - KTOP) >> sh, wrow = wy < 0 ? -1 : wy * tw;
        if (xb < xa) continue;
        if (xa < box.x0) box.x0 = xa; if (xb > box.x1) box.x1 = xb; if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y;
        for (let x = xa; x <= xb; x++) {
          const idx = row + x;
          if (zb[idx] <= zt || (wrow >= 0 && ozb[wrow + colIx[x]] <= zt)) continue;
          zb[idx] = zt;
          if (!C5) { buf[idx] = sk; continue; } // Umriss
          const v = ((x + 0.5 - p.x) * nx + ddy * ny) / R + (BAY[by + (x & 3)] - 0.5) * 0.22;
          let c = v > 0.72 ? 3 : v > 0.28 ? 2 : v > -0.38 ? 1 : 0;
          if (c >= 1 && c < 3 && ((y + i * 3 - Math.floor(t * 0.5)) % 17 + 17) % 17 === 0) c++;           // Wasser rinnt den Arm hinab
          if (sk) { const sd = (x + 0.5 - skx) ** 2 + (y + 0.5 - sky) ** 2; if (sd < skr2) c = sd < skr2 * 0.22 && skr > 1.6 ? 5 : 4; } // Saugnäpfe
          buf[idx] = C5[c];
        }
      }
    };
    let any = false;
    for (const arm of k.arms) {
      P.length = 0;
      for (let i = 0; i <= N; i++) {
        const s = i / N, h = s * arm.len * rise;
        const du = Math.sin(s * 3.2 + ts * 0.045 + arm.ph) * 10 * s + (s > 0.65 ? Math.sin(ts * 0.07 + arm.ph) * (s - 0.65) * 36 : 0); // Spitze rollt sich
        const dz = Math.cos(s * 2 + ts * 0.03 + arm.ph) * 6 * s;
        const h2 = h * Math.cos(ang) - sink * arm.len, z2 = arm.z + dz - h * Math.sin(ang), zz = Math.max(OC_Z0, z2);
        const bx = tw / 2 + ((arm.u + du) / zz) / 0.95 * (tw / 2), byy = OC_HOR + (CAM - h2) * OC_F / zz;
        P.push({ z: z2, x: bx * sx, y: KTOP + byy * 2, R: ((1 - s * 0.85) * 6 + 1) * OC_F / zz * 2, fog: Math.min(1, (zz - OC_Z0) / (OC_Z1 - OC_Z0) * 1.25) });
      }
      const pick = []; // Ringe dicht genug für glatte Ränder, aber ohne unnötige Überdeckung
      for (let i = N, last = null; i >= 0; i--) { const p = P[i]; if (!last || i === 0 || Math.hypot(p.x - last.x, p.y - last.y) >= Math.max(1.2, p.R * 0.42)) { pick.push(i); last = p; } }
      for (let pass = 0; pass < 2; pass++) for (const i of pick) {
        const p = P[i];
        if (p.z < OC_Z0 || p.x + p.R < 0 || p.x - p.R > KW) continue;
        const q = P[Math.min(N, i + 1)], m = P[Math.max(0, i - 1)];
        let nx = -(q.y - m.y), ny = q.x - m.x;
        const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        if (nx * LX + ny * LY < 0) { nx = -nx; ny = -ny; } // Normale zum Mond hin
        const f = p.fog;
        if (!pass) disc(p, p.R + 1.2, p.z + 0.6, nx, ny, null, mixC(T_O, OC_FOG, f, light), i);
        else disc(p, p.R, p.z, nx, ny, [mixC(T_D, OC_FOG, f, light), mixC(T_M, OC_FOG, f, light), mixC(T_L, OC_FOG, f, light), mixC(T_S, OC_FOG, f * 0.8, light), mixC(T_K, OC_FOG, f, light), mixC(T_KC, OC_FOG, f, light)], i % 6 < 3 && i < N - 6, i);
        any = true;
      }
      if (rise > 0.3 && sink < 0.6) { // Schaumkranz am Wasserspiegel und Tropfen von den erhobenen Gliedern
        const b = P[0], fw = b.R * 2.4, foam = mixC(OC_FOAM, OC_FOG, b.fog * 0.6, light), zf = b.z - 2;
        for (let x = Math.floor(b.x - fw); x <= Math.ceil(b.x + fw); x++) {
          if (x < 0 || x >= KW) continue;
          const e = (x + 0.5 - b.x) / fw, hgt = Math.max(1, Math.round((1 - e * e) * 5));
          for (let k2 = 0; k2 < hgt; k2++) {
            const y = Math.round(b.y - k2 + Math.sin(x * 0.7 + t * 0.2));
            if (y < 0 || y >= KH || Math.abs(e) > 1 || hsh(x, k2, Math.floor(t / 4)) < 0.35) continue;
            const idx = y * KW + x; if (zb[idx] > zf) { buf[idx] = foam; zb[idx] = zf; if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x; if (y < box.y0) box.y0 = y; if (y > box.y1) box.y1 = y; }
          }
        }
        const drop = mixC(OC_FOAM, OC_FOG, b.fog * 0.8, light);
        for (let i = 6; i < N - 2; i += 5) {
          const p = P[i], fall = (t * 1.6 + i * 23) % 60;
          const x = Math.round(p.x + Math.sin(i * 1.7) * p.R * 0.6), y = Math.round(p.y + p.R + fall);
          for (let d2 = 0; d2 < 2; d2++) {
            const yy = y + d2; if (x < 0 || x >= KW || yy < 0 || yy >= KH) continue;
            const idx = yy * KW + x; if (zb[idx] > p.z && water(x, yy) > p.z) { buf[idx] = drop; zb[idx] = p.z; if (x < box.x0) box.x0 = x; if (x > box.x1) box.x1 = x; if (yy < box.y0) box.y0 = yy; if (yy > box.y1) box.y1 = yy; }
          }
        }
      }
    }
    if (box.x1 < box.x0) { KB.box = null; return false; }
    return any;
  }
  // Volle Auflösung (1×1-Pixel, feinere Tiefenschritte); im Sparmodus grob (3×2-Pixel). Farben je Tiefe einmal pro Bild.
  let ocCol = null, ocHalf = false, ocPerf = 0, ocSlow = 0;
  const SINT = new Float32Array(4096); for (let i = 0; i < 4096; i++) SINT[i] = Math.sin(i / 4096 * Math.PI * 2);
  const sn = (a) => SINT[((a * 651.8986) | 0) & 4095]; // Sinus aus der Tabelle (Wellen brauchen keine volle Genauigkeit)
  function drawOcean(ctx, w, t, o = {}) {
    const t0p = performance.now(), lo = MOBILE_RENDER || View.lite, sx = lo ? 3 : ocHalf ? 2 : 1, vq = lo ? 1 : 2, tw = Math.ceil(w / sx); // ocHalf: Zwischenstufe, wenn das Meer allein zu teuer wird
    const H = OC_H * vq, HOR = OC_HOR * vq, F = OC_F * vq;
    if (!OC || OC.w !== tw || OC.h !== H) { const c = Sprites.canvas(tw, H), x = c.getContext('2d'), img = x.createImageData(tw, H); OC = { w: tw, h: H, c, x, img, buf: new Int32Array(img.data.buffer) }; ocZB = new Float32Array(tw * H); }
    if (!ocZ || ocZ.lo !== lo) { ocZ = []; for (let z = OC_Z0; z < OC_Z1; z = lo ? z * 1.035 + 0.6 : z * 1.016 + 0.4) ocZ.push(z); ocZ.lo = lo; }
    const buf = OC.buf, zb = ocZB; buf.fill(0); zb.fill(1e9);
    const calm = o.calm === undefined ? 1 : o.calm, A = 30 * (0.3 + 0.7 * calm), light = o.flash ? 1.7 : 1;
    const CAM = OC_CAM + (o.lift || 0), HY = o.horizon || 122; // höherer Standpunkt → flacherer Blick aufs Meer
    const rv = o.rogue || 0, AR = rv ? 80 * Math.sqrt(Math.max(0, 1 - rv / 430)) : 0;
    const u0 = (o.camX || 0) * 0.06 + (o.sail || 0) * 0.8, moonX = (w - 92) / sx, tq = Math.floor(t / 5), tg = Math.floor(t / 3);
    const fogFill = mixC(OC_FOG, OC_FOG, 0, light), horizon = mixC(OC_FOG, OC_MOON, 0.3, light);
    const NZ = ocZ.length;
    if (!ocCol || ocCol.n !== NZ || ocCol.light !== light || ocCol.z !== ocZ) { // Farbtafeln je Tiefe (Dunst nimmt nach hinten zu)
      const mk = () => new Int32Array(NZ);
      ocCol = { n: NZ, light, z: ocZ, fog: new Float32Array(NZ), d: mk(), m: mk(), m2: mk(), h: mk(), f: mk(), mo: mk(), te: mk(), ri: mk() };
      for (let i = 0; i < NZ; i++) {
        const fog = Math.min(1, (ocZ[i] - OC_Z0) / (OC_Z1 - OC_Z0) * 1.25); ocCol.fog[i] = fog;
        ocCol.d[i] = mixC(OC_DEEP, OC_FOG, fog, light); ocCol.m[i] = mixC(OC_MID, OC_FOG, fog, light); ocCol.m2[i] = mixC(OC_MID2, OC_FOG, fog, light);
        ocCol.h[i] = mixC(OC_HI, OC_FOG, fog * 0.9, light); ocCol.f[i] = mixC(OC_FOAM, OC_FOG, Math.min(1, fog * 1.1), light);
        ocCol.mo[i] = mixC(OC_MOON, OC_FOG, fog * 0.5, light); ocCol.te[i] = mixC(OC_TEAL, OC_FOG, fog, light); ocCol.ri[i] = mixC(OC_RIM, OC_FOG, fog * 0.7, light);
      }
    }
    const CL = ocCol, pw = 2 / sx, maxH = A + 4.5 + AR; // höchste mögliche Welle: dahinter kann nichts mehr über den Rand ragen
    let ns = 0;
    for (let x = 0; x < tw; x++) {
      const dx = (x + 0.5 - tw / 2) / (tw / 2) * 0.95, mx = Math.abs(x - moonX), bx = x & 3;
      let ymin = H;
      for (let i = 0; i < NZ && ymin > 0; i++) {
        const z = ocZ[i], u = u0 + dx * z;
        if (ymin <= HOR + (CAM - maxH) * F / z) break; // früher Abbruch
        const s = (sn(z * 0.045 + t * 0.035 + sn(u * 0.012 + z * 0.004) * 1.2) + 1) * 0.5, s3 = s * s * s;
        let h = s3 * A + sn(u * 0.06 + z * 0.03 - t * 0.05) * 3 + sn(u * 0.11 - z * 0.07 + t * 0.08) * 1.5, rog = 0;
        if (AR) { const d = z - rv, q = d / (d < 0 ? 8 : 22); rog = Math.exp(-q * q) * (0.8 + 0.2 * Math.cos(u * 0.02 + t * 0.01)); h += rog * AR; } // steile Front, langer Rücken
        const sy = Math.floor(HOR + (CAM - h) * F / z);
        if (sy >= ymin) continue;
        const fog = CL.fog[i], crest = Math.max(s3 * (1 - rog * 0.5), rog * rog * rog * 0.97); // Monsterwelle: unten dunkel, oben heller, weiße Krone
        const lace = sn(u * 0.23 + t * 0.021) * sn(z * 0.19 - t * 0.034 + u * 0.05) + 0.6 * sn(u * 0.071 - z * 0.13 + t * 0.012); // treibende Schaumstreifen
        const path = (1.5 + Math.max(0, sy - HOR) / vq * 0.18) * pw, span = ymin - Math.max(0, sy), edge = span >= 3 * vq && fog < 0.55, laceOk = span >= 2 * vq && fog < 0.7;
        const c0 = CL.d[i], c1 = CL.m[i], c15 = CL.m2[i], c2 = CL.h[i], c3 = CL.f[i], cmo = CL.mo[i], cte = CL.te[i], cri = CL.ri[i];
        for (let y = Math.max(0, sy), o2 = y * tw + x; y < ymin; y++, o2 += tw) {
          const b = BAY[(y & 3) * 4 + bx], dd = y - sy, dn = dd / vq, c = crest - dn * 0.07 + b * 0.18; // Wellenflanke unter dem Kamm dunkler
          let col = c > 0.95 && dn < 2 ? c3 : c > 0.76 ? (dn < 3 && crest > 0.5 ? cte : c2) : c > 0.57 ? c15 : c > 0.36 ? c1 : c0; // weiche Rampe, tiefes Blau überwiegt, Schaum nur ganz oben
          if (dd === 0 && edge && crest > 0.5) col = c > 0.88 ? c3 : cri;               // Mondlicht nur auf echten Wellenkämmen (keine Höhenlinien)
          else if (laceOk && lace > 1.22 + b * 0.4 && c > 0.22 && dn < 2.5 && hsh(x, y, 7) < 0.65) col = c3; // feine, zerrissene Schaumstreifen
          if (mx < path && c > 0.32 && hsh(x, y, tq) < 0.12 + crest * 0.26) col = cmo;    // funkelnder Mondpfad
          buf[o2] = col; zb[o2] = z;
        }
        if (crest > 0.93 && sy > 2 * vq && ns < 1196 && hsh(x, i, tg) < 0.4 / pw) { // Gischt weht von hohen Kämmen
          const k2 = (hsh(i, x, tg) < 0.5 ? 1 : 2) * vq;
          spray[ns++] = x - (k2 >> 1); spray[ns++] = sy - k2; spray[ns++] = c3;
        }
        ymin = Math.max(0, sy);
      }
      for (let y = HOR; y < ymin; y++) { buf[y * tw + x] = y < HOR + vq ? horizon : fogFill; zb[y * tw + x] = OC_Z1; } // Meer bis zum Horizont im Dunst, heller Saum
    }
    for (let k2 = 0; k2 < ns; k2 += 3) { const X = spray[k2], Y = spray[k2 + 1]; if (X >= 0 && X < tw && Y >= 0) buf[Y * tw + X] = spray[k2 + 2]; }
    const kr = o.kraken && o.kraken.t >= 0 && drawTentacles(zb, tw, sx, o.kraken, light, CAM, t, vq);
    OC.x.putImageData(OC.img, 0, 0);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(OC.c, 0, 0, tw, H, 0, HY - OC_HOR * 2, tw * sx, OC_H * 2);
    if (kr) { // Krakenarme in voller Auflösung darüber (nur der benutzte Ausschnitt)
      const b = KB.box, bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
      KB.x.putImageData(KB.img, 0, 0, b.x0, b.y0, bw, bh);
      ctx.drawImage(KB.c, b.x0, b.y0, bw, bh, b.x0, HY - OC_HOR * 2 - KTOP + b.y0, bw, bh);
    }
    ctx.restore();
    if (!lo && !ocHalf) { // braucht das Meer dauerhaft zu lange, rechnet es mit halber Breite weiter (statt gleich in den Spar-Modus)
      ocPerf = ocPerf * 0.95 + (performance.now() - t0p) * 0.05;
      if (ocPerf > 6) { if (++ocSlow > 90) { ocHalf = true; console.info('[NACHTMAHR] Meer: halbe Breite'); } } else ocSlow = 0;
    }
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
  let fireT = 0;
  function drawFire(ctx, x, y, w, h, intensity = 1) {
    if (!fire) {
      fire = new Uint8Array(FW * FH); fc = Sprites.canvas(FW, FH); fimg = fc.getContext('2d').createImageData(FW, FH); fbuf = new Int32Array(fimg.data.buffer);
      fpal = Array.from({ length: 37 }, (_, i) => {
        const k = i / 36; if (i < 3) return 0;
        const r = Math.min(255, k * 2.3 * 255), g = Math.max(0, Math.min(255, (k - 0.45) * 2.1 * 255)), b = Math.max(0, Math.min(255, (k - 0.86) * 5 * 255));
        return (Math.min(255, i * 7) << 24) | (b << 16) | (g << 8) | r;
      });
    }
    fireT = (fireT + 1) | 0;
    if (!(View.lite && (fireT & 1))) { // Sparmodus: Flammen nur jeden zweiten Frame weiterrechnen
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
    }
    ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7;
    ctx.drawImage(fc, x, y, w, h);
    ctx.restore();
  }

  const mapData = () => { if (!map) makeMap(); return { map, mapH, MS, POINTS, trees }; };
  return { drawTunnel, tubeProject, drawMap, drawOcean, wave, mosaic, drawFire, mapData };
})();
