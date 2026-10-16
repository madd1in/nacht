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
    glass: { a: ['#d0c8e0', '#a098b8', '#706888', '#484060', '#16101e'], b: ['#fce0a8', '#d8a838', '#a87000', '#684000', '#1c0c00'] },
    foyer: { a: ['#e8e4dc', '#b8b0a8', '#7c7480', '#3c3444', '#120e18'], b: ['#c89058', '#8c5428', '#5c3014', '#3c1c08', '#140804'] },
    gallery: { a: ['#fcf8f8', '#e0d4dc', '#bcacbc', '#8c7c94', '#3c2c44'], b: ['#fce0a8', '#d8a838', '#a87000', '#684000', '#1c0c00'] },
    bridge: { a: ['#d4cce4', '#9c94b4', '#6c6488', '#40385c', '#120e1c'], b: ['#c8c0d8', '#948cac', '#645c80', '#3c3454', '#100c18'], moss: ['#1c4c34', '#2c7448', '#58a868'] },
    library: { a: ['#e8b070', '#a86c34', '#7c4820', '#4c2810', '#180a04'], b: ['#c8884c', '#8c5428', '#5c3014', '#3c1c08', '#140804'] },
    ship: { a: ['#e8b070', '#b87c44', '#8a5428', '#5a3214', '#1e0c04'], b: ['#dcb47c', '#a8783c', '#7a4c20', '#4a2a0c', '#160802'] },
  };

  // ---------------- Kacheln ----------------
  const hn = (X, Y, s) => { let n = Math.imul(X * 374761393 + Y * 668265263 + s * 1442695041, 1274126177); n ^= n >>> 13; n = Math.imul(n, 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };
  // Quader: weiches Steinkorn (grob + fein), Licht von links oben, Fase an allen Kanten, Poren
  function stone(p, opts = {}) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p, cols = [sh, dk, md, lt, hl], sd = ri(0, 99999);
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      const n = hn(X >> 2, y >> 2, sd) * 0.45 + hn(X >> 1, y >> 1, sd + 7) * 0.3 + hn(X, y, sd + 13) * 0.25;
      let v = 2 + (n - 0.5) * 1.5 + ((15 - X) + (15 - y)) / 30 * 0.9 - 0.45 + (bay(X, y) - 0.5) * 0.45;
      if (X === 0 || y === 0) v = 4; else if (X === 1 || y === 1) v = Math.max(v, 3.1);
      if (X === 15 || y === 15) v = 0; else if (X === 14 || y === 14) v = Math.min(v, 1.1);
      px(x, cols[Math.max(0, Math.min(4, Math.round(v)))], X, y);
    }
    for (let i = 0; i < 4; i++) { const X = ri(3, 12), Y = ri(3, 12); px(x, dk, X, Y); px(x, lt, X + 1, Y + 1); } // Poren
    if (opts.crack) {
      let cx = ri(4, 11), cy = ri(2, 4);
      for (let i = 0; i < 8 && cy < 13; i++) { px(x, sh, cx, cy); px(x, lt, cx + 1, cy); cy++; cx += ri(-1, 1); }
    }
    if (opts.chip) { px(x, sh, 13, 0, 3, 2); px(x, sh, 15, 2, 1, 1); px(x, dk, 13, 2, 2, 1); }
    return c;
  }
  // Glasturm: polierter Marmor mit Adern, Glanzlinie; inlay = goldene Einlage an der Oberkante
  function marble(p, opts = {}) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl, lt, md, dk, sh] = p, cols = [sh, dk, md, lt, hl], sd = ri(0, 99999), ph = rand() * 6;
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      const n = hn(X >> 1, y >> 1, sd) * 0.6 + hn(X, y, sd + 3) * 0.4;
      const vein = Math.abs(Math.sin((X * 0.55 + y * 0.32) + n * 2.6 + ph)) < 0.09;
      let v = 2.3 + (n - 0.5) * 0.9 + (bay(X, y) - 0.5) * 0.35 - y / 30;
      if (vein) v -= 1.3;
      if (X === 0 || y === 0) v = 4; else if (X === 15 || y === 15) v = 0.4;
      px(x, cols[Math.max(0, Math.min(4, Math.round(v)))], X, y);
    }
    px(x, 'rgba(255,255,255,0.18)', 1, 3, 14, 1); // Politur
    if (opts.inlay) { px(x, '#a87000', 0, 1, 16, 1); px(x, '#fce0a8', 0, 2, 16, 1); px(x, '#d8a838', 0, 3, 16, 1); for (let X = 2; X < 16; X += 8) { px(x, '#a80020', X + 1, 1, 2, 3); px(x, '#fc3c64', X + 1, 1, 1, 1); } }
    return c;
  }
  function balcony() { // Glasturm-Plattform: dunkler Marmor, Goldrand, Vierpass-Fries
    const c = C(16, 16), x = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      const n = hn(X, y, 51), vein = Math.abs(Math.sin(X * 0.7 - y * 0.4 + n * 2)) < 0.1;
      px(x, vein ? '#4c3c68' : n > 0.7 ? '#3a2c52' : '#2c2240', X, y);
    }
    px(x, '#fcf0c8', 0, 0, 16, 1); px(x, '#fce0a8', 0, 1, 16, 1); px(x, '#d8a838', 0, 2, 16, 1); px(x, '#684000', 0, 3, 16, 1);
    px(x, '#d8a838', 0, 12, 16, 1); px(x, '#a87000', 0, 13, 16, 1); px(x, '#1c0c00', 0, 14, 16, 2);
    for (let k = 0; k < 4; k++) { const [ox, oy] = [[0, -2], [2, 0], [0, 2], [-2, 0]][k]; // Vierpass in Gold
      for (let a = 0; a < 12; a++) { const an = a / 12 * Math.PI * 2; px(x, '#d8a838', Math.round(8 + ox + Math.cos(an) * 1.7), Math.round(8 + oy + Math.sin(an) * 1.7)); } }
    px(x, '#fce0a8', 8, 8); px(x, '#a80020', 0, 7, 1, 2); px(x, '#a80020', 15, 7, 1, 2);
    return c;
  }
  // Eingangshalle: abgetretener Schachbrett-Marmor mit Rissen und Schmutz
  function checker(opts = {}) {
    const c = C(16, 16), x = c.getContext('2d'), sd = ri(0, 99999);
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      const light = ((X >> 3) + (y >> 3)) % 2 === 0, n = hn(X, y, sd);
      let col = light ? (n > 0.82 ? '#b8b0a8' : n > 0.15 ? '#d8d0c4' : '#e8e4dc') : (n > 0.85 ? '#3c3444' : n > 0.2 ? '#241e2c' : '#2c2634');
      if (Math.abs(Math.sin(X * 0.6 + y * 0.35 + sd) ) < 0.07) col = light ? '#a8a098' : '#4c4458'; // Marmoradern
      if ((X & 7) === 0 || (y & 7) === 0) col = '#16121c';                                         // Fugen
      px(x, col, X, y);
    }
    if (opts.top) { px(x, '#fcf8f0', 0, 0, 16, 1); px(x, 'rgba(255,255,255,0.18)', 0, 2, 16, 1); }
    if (opts.crack) { let cx = ri(3, 12), cy = 0; for (let i = 0; i < 9 && cy < 15; i++) { px(x, '#08060c', cx, cy); cy++; cx += ri(-1, 1); } }
    for (let i = 0; i < 3; i++) px(x, 'rgba(40,30,20,0.35)', ri(0, 13), ri(1, 14), ri(2, 3), 1); // Schmutz
    return c;
  }
  function gallery() { // Galerie: dunkle Eiche mit vergoldeter Kante und geschnitzten Bögen
    const c = C(16, 16), x = c.getContext('2d');
    px(x, '#1c0e06', 0, 0, 16, 16);
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) if (hn(X, y >> 1, 77) > 0.35) px(x, (X + (y >> 2)) % 5 ? '#3c2010' : '#2c160a', X, y);
    px(x, '#fce0a8', 0, 0, 16, 1); px(x, '#c89020', 0, 1, 16, 1); px(x, '#6c3c14', 0, 2, 16, 1);
    for (let k = 0; k < 2; k++) { const ox = k * 8; px(x, '#5c3418', ox + 1, 5, 6, 1); px(x, '#5c3418', ox + 1, 6, 1, 7); px(x, '#5c3418', ox + 6, 6, 1, 7); px(x, '#120804', ox + 2, 6, 4, 7); px(x, '#8c5c2c', ox + 2, 5, 4, 1); } // Bögen
    px(x, '#c89020', 0, 13, 16, 1); px(x, '#100804', 0, 14, 16, 2);
    return c;
  }
  // Bibliothek: Eichenparkett im Flechtmuster (je 8×8 abwechselnd längs und quer), gewachst; top = Kante mit Glanz
  function parquet(opts = {}) {
    const c = C(16, 16), x = c.getContext('2d'), sd = ri(0, 99999);
    const tones = ['#5c3014', '#6c3c18', '#7c4820', '#8c5428'];
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      const hor = ((X >> 3) + (y >> 3)) % 2 === 0, lx = X & 7, ly = y & 7, plank = hor ? ly >> 2 : lx >> 2, along = hor ? lx : ly, across = hor ? ly & 3 : lx & 3;
      const id = (X >> 3) * 7 + (y >> 3) * 13 + plank * 3;
      let col = tones[Math.floor(hn(id, 1, sd) * 4)];
      if (hn(along >> 1, id, sd + 5) > 0.8) col = '#4c2810'; // Maserung
      if (across === 0) col = '#9c6430';
      if (across === 3 || along === 7) col = '#2c1406'; // Fugen
      px(x, col, X, y);
    }
    if (opts.top) { px(x, '#e8b070', 0, 0, 16, 1); px(x, '#b07c44', 0, 1, 16, 1); px(x, 'rgba(255,230,180,0.14)', 0, 2, 16, 2); }
    return c;
  }
  // Brückendeck: oben ausgetretenes Pflaster, darunter Quadermauerwerk mit versetzten Fugen, Moos in den Ritzen
  function bridgeDeck() {
    const c = C(16, 16), x = c.getContext('2d'), p = PALS.bridge.a, m = PALS.bridge.moss, sd = ri(0, 99999);
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      let k;
      if (y < 4) k = y === 0 ? 0 : y === 3 ? 4 : (X + (y === 2 ? 3 : 0)) % 7 === 0 ? 3 : 1 + (hn(X >> 1, y, sd) > 0.6 ? 1 : 0);
      else {
        const row = (y - 4) >> 2, off = row % 2 ? 5 : 1, ly = (y - 4) & 3;
        if (ly === 3 || (X + off) % 8 === 0) k = 4; // Fugen
        else k = ly === 0 ? 2 : 2 + (hn((X + off) >> 3, row, sd + 3) > 0.5 ? 1 : 0) + (bay(X, y) > 0.8 ? 1 : 0);
      }
      px(x, p[Math.min(4, k)], X, y);
    }
    for (let i = 0; i < 3; i++) px(x, m[ri(0, 2)], ri(0, 15), ri(5, 14)); // Moos
    if (rand() < 0.5) { const X = ri(3, 12); for (let k = 0; k < 5; k++) px(x, p[4], X + (k >> 1), 4 + k); } // Riss
    return c;
  }
  // Thronsaal-Sims: schwarzroter Marmor, oben vergoldete Kante, unten eine geschnitzte Konsole
  function goldLedge() {
    const c = C(16, 16), x = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let X = 0; X < 16; X++) {
      let col = y < 2 ? (y ? '#c89020' : '#fce0a8') : y < 9 ? (Math.abs(Math.sin(X * 0.7 + y * 0.9)) < 0.12 ? '#6c2838' : (X + y) % 9 === 0 ? '#3c0c18' : '#22060f') : null;
      if (y === 9) col = '#f8b800'; else if (y === 10) col = '#5c3c08';
      if (y > 10 && Math.abs(X - 7.5) < (16 - y) * 1.3) col = y === 15 ? '#2c1c04' : X < 7 ? '#8c6414' : '#5c3c08'; // Konsole
      if (col) px(x, col, X, y);
    }
    return c;
  }
  // Bücherwand ('B', massiv): ein Regalfach pro Kachel – Buchrücken verschiedener Höhe mit Goldbünden, mal ein
  // schräg gelehntes Buch, ein Schädel oder eine Kerze; top = geschnitztes Kranzgesims mit Goldleiste
  function bookcase(top) {
    const c = C(16, 16), x = c.getContext('2d');
    const BK = [['#4c0c14', '#7c1c28', '#a43c40'], ['#101c48', '#203470', '#3c54a0'], ['#0c3416', '#1c5428', '#347c40'], ['#3c2008', '#6c3c14', '#96602c'], ['#3c0c40', '#642068', '#8c3c90'], ['#3c3008', '#6c5814', '#9c8028'], ['#1c1416', '#34282c', '#54464c']];
    px(x, '#0a0402', 0, 0, 16, 16);
    const y0 = top ? 6 : 1;
    for (let X = 0; X < 16;) {
      const w = Math.min(16 - X, ri(1, 3)), h = ri(8, 12 - (top ? 4 : 0)), [d, m, l] = BK[ri(0, BK.length - 1)], r = rand();
      if (r < 0.06 && 16 - X >= 5) { // Schädel im Regal
        px(x, '#b8ac90', X, 9, 4, 4); px(x, '#e8e0c8', X, 9, 3, 1); px(x, '#1c1410', X + 1, 10, 1, 1); px(x, '#1c1410', X + 3, 10, 1, 1); px(x, '#8c8068', X, 13, 4, 1);
        X += 5; continue;
      }
      if (r < 0.14) { X += w; continue; } // Lücke
      const by = 14 - Math.min(h, 14 - y0);
      px(x, m, X, by, w, 14 - by); px(x, l, X, by, 1, 14 - by); if (w > 1) px(x, d, X + w - 1, by, 1, 14 - by);
      px(x, '#c8982c', X, by + 2, w, 1); px(x, '#c8982c', X, 11, w, 1); if (h > 9) px(x, '#fce0a8', X, by + 2, 1, 1); // Goldbünde
      X += w;
    }
    if (rand() < 0.3) { const X = ri(3, 12); for (let k = 0; k < 9; k++) px(x, '#5c2c10', X + (k >> 1), 13 - k, 2, 1); } // schräg gelehntes Buch
    px(x, '#9c6430', 0, 14, 16, 1); px(x, '#140802', 0, 15, 16, 1); // Regalboden
    px(x, 'rgba(0,0,0,0.35)', 0, y0, 16, 2); // Schatten des Fachs darüber
    if (top) { // Kranzgesims
      px(x, '#2c1406', 0, 0, 16, 5); px(x, '#fce0a8', 0, 0, 16, 1); px(x, '#c8982c', 0, 1, 16, 1); px(x, '#6c3c18', 0, 2, 16, 1);
      for (let X = 1; X < 16; X += 4) { px(x, '#8c5c2c', X, 3, 2, 2); px(x, '#140802', X + 2, 3, 1, 2); } // Zahnschnitt
      px(x, '#0a0402', 0, 5, 16, 1);
    }
    return c;
  }
  function shelfWalk() { // Galerie der Bibliothek: Laufsteg auf einem Bücherregal – Messingkante, darunter eine Reihe Buchrücken
    const c = C(16, 16), x = c.getContext('2d');
    const BK = [['#6c1420', '#9c3034'], ['#1c2860', '#34488c'], ['#14461e', '#2c6c38'], ['#5c3410', '#86562a'], ['#541858', '#7c3484'], ['#5c4c10', '#8c7424']];
    px(x, '#0c0402', 0, 0, 16, 16);
    for (let X = 0; X < 16;) {
      const w = Math.min(16 - X, ri(2, 3)), h = ri(7, 9), [m, l] = BK[ri(0, BK.length - 1)];
      if (rand() < 0.12) { X += w; continue; }
      px(x, m, X, 14 - h, w, h); px(x, l, X, 14 - h, 1, h); px(x, '#c8982c', X, 16 - h, w, 1); px(x, '#c8982c', X, 12, w, 1);
      X += w;
    }
    px(x, '#fce0a8', 0, 0, 16, 1); px(x, '#c8982c', 0, 1, 16, 1); px(x, '#7c4c20', 0, 2, 16, 2); px(x, '#2c1406', 0, 4, 16, 1); // Brett mit Messingkante
    px(x, '#7c4c20', 0, 14, 16, 1); px(x, '#140802', 0, 15, 16, 1); // Regalboden
    return c;
  }
  function carpetStair(dir) { // Holztreppe mit rotem Läufer und Messingstangen
    const c = C(16, 16), x = c.getContext('2d');
    for (let X = 0; X < 16; X++) {
      const lx = dir > 0 ? X : 15 - X, top = lx < 8 ? 8 : 0, bottom = Math.min(15, 15 - lx + 3);
      for (let y = top; y <= bottom; y++) {
        const d = y - top, edge = X < 2 || X > 13;
        const carpet = d === 0 ? '#e84060' : d < 3 ? '#a80020' : d === 3 ? '#5c0010' : null;
        px(x, edge ? (d === 0 ? '#c89058' : y === bottom ? '#140804' : '#5c3014') : carpet || (y === bottom ? '#140804' : '#3c1c08'), X, y);
        if (!edge && d === 2 && lx % 8 === 3) px(x, '#f8b800', X, y);
      }
    }
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
  function stairTile(p, dir, nose = null) {
    const c = C(16, 16), x = c.getContext('2d');
    const [hl0, lt, md, dk, sh] = p, hl = nose || hl0;
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
    } else if (theme === 'foyer') { // Putzbrocken und Scherben auf dem Boden
      if (v === 1) { px(x, '#7c4830', 3, 4, 3, 2); px(x, '#6c3c28', 9, 5, 2, 1); px(x, '#a4b4e4', 12, 5, 1, 1); }
      else if (v === 3) { px(x, '#4c4458', 5, 5, 4, 1); px(x, '#a4b4e4', 10, 5, 2, 1); }
      else return null;
    } else if (theme === 'library') { // Bücherstapel und lose Seiten auf dem Boden
      if (v === 1) { px(x, '#6c1420', 2, 4, 9, 2); px(x, '#e8dcc0', 10, 4, 1, 2); px(x, '#1c2860', 3, 2, 7, 2); px(x, '#e8dcc0', 9, 2, 1, 2); px(x, '#c8982c', 3, 2, 1, 2); }
      else if (v === 3) { px(x, '#e8dcc0', 7, 5, 5, 1); px(x, '#c8bca0', 8, 4, 3, 1); }
      else return null;
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
    } else if (theme === 'foyer' || theme === 'library') { // Spinnweben unter der Galerie
      if (v === 2) return null;
      x.fillStyle = 'rgba(210,210,232,0.4)';
      for (let k = 0; k < 8; k++) { x.fillRect(v ? 15 - k : k, k, 1, 1); x.fillRect(v ? 15 - k * 2 : k * 2, 0, 1, 1); }
      x.fillRect(v ? 9 : 4, 3, 3, 1);
    } else if (theme === 'bridge') { // Gewölbeunterseite: Schatten, lose Steine und Moosbärte
      const p = PALS.bridge.a, m = PALS.bridge.moss;
      x.fillStyle = 'rgba(8,4,16,0.55)'; x.fillRect(0, 0, 16, 3);
      if (v !== 2) { const X = v ? 9 : 3; px(x, p[3], X, 0, 4, 3); px(x, p[2], X, 0, 3, 1); px(x, p[4], X, 3, 4, 1); }
      for (let X = 0; X < 16; X++) if (rand() < 0.3) { const len = ri(1, v === 1 ? 8 : 4); px(x, m[0], X, 0, 1, len); if (rand() < 0.5) px(x, m[1], X, 0, 1, 1); }
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
  const ROSE = { x: 459, y: 64, r: 30 };
  const LIB_WIN = [296, 24, 48, 98]; // Bibliothek: Bogenfenster in der Wandebene (x, Oberkante, Breite, Höhe) – wie STORM_WINS.library
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

  // Drehende Rosetten (Mode-7-Rotation) im Thronsaal – zusätzlich zur großen Rosette, gegenläufig, schneller wenn der Graf rast
  const THRONE_ROSES = [[456, 56, 20, 1], [354, 132, 16, -1]];
  const roseSetC = {};
  let roseSetA = 0, roseSetF = 0;
  function drawRoseSet(ctx, cam, frame, list) {
    const df = frame - roseSetF; roseSetF = frame;
    if (df > 0 && df < 10) roseSetA += df * (W.bossEnraged ? 0.03 : 0.006);
    const off = ((Math.floor(cam.x * 0.5) % 512) + 512) % 512;
    for (let X = -off; X < View.w + 512; X += 512) list.forEach(([rx, ry, R, dir]) => {
      const cx = X + rx, cy = ry - Math.round(cam.y * 0.5);
      if (cx < -40 || cx > View.w + 40) return;
      const rc = roseSetC[R] || (roseSetC[R] = (() => { const k = C(R * 2 + 2, R * 2 + 2); roseGlass(k.getContext('2d'), R + 1, R + 1, R); return k; })());
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#5c5468'; ctx.fillRect(cx - R - 3, cy - 1, (R + 3) * 2, 2); // Steinkreuz hinter dem Glas
      ctx.fillStyle = '#463c54'; ctx.beginPath(); ctx.arc(cx, cy, R + 3, 0, Math.PI * 2); ctx.fill();
      ctx.translate(cx, cy); ctx.rotate(roseSetA * dir); ctx.drawImage(rc, -R - 1, -R - 1);
      ctx.restore();
    });
  }

  function archWindow(x, wx, wy, ww, wh, inner) {
    const r = ww / 2, cx = wx + r;
    // Gewände: Keilsteine im Wechsel hell/dunkel, Fugen dazwischen, Schlussstein oben
    for (let y = -r - 6; y <= 0; y++) for (let X = -r - 6; X <= r + 6; X++) {
      const d = Math.hypot(X, y);
      if (d <= r || d > r + 6) continue;
      const ang = Math.atan2(-y, X), seg = Math.floor(ang / (Math.PI / 7));
      const joint = Math.abs(ang / (Math.PI / 7) - Math.round(ang / (Math.PI / 7))) < 0.06;
      px(x, joint ? '#1c1c24' : Math.abs(ang - Math.PI / 2) < 0.2 ? '#a8a8b4' : seg % 2 ? '#6c6c78' : '#8c8c98', cx + X, wy + y);
    }
    for (let y = 0; y < wh; y++) { // Gewändesteine seitlich
      const blk = Math.floor(y / 7) % 2, joint = y % 7 === 0;
      px(x, joint ? '#1c1c24' : blk ? '#6c6c78' : '#8c8c98', wx - 6, wy + y, 6, 1); px(x, joint ? '#1c1c24' : blk ? '#8c8c98' : '#6c6c78', wx + ww, wy + y, 6, 1);
    }
    inner(wx, wy - r, ww, wh + r, (X, Y) => { // Maske: im Fenster?
      if (Y >= wy) return X >= wx && X < wx + ww && Y < wy + wh;
      const dy = wy - Y, half = Math.sqrt(Math.max(0, r * r - dy * dy));
      return X >= wx + r - half && X < wx + r + half;
    });
    px(x, '#9c9ca8', wx - 7, wy + wh, ww + 14, 2); px(x, '#5c5c68', wx - 7, wy + wh + 2, ww + 14, 2); px(x, '#1c1c24', wx - 5, wy + wh + 4, ww + 10, 2); // Sohlbank
    px(x, '#5c5c68', wx + r - 1, wy - r, 2, wh + r); px(x, '#5c5c68', wx, wy + Math.floor(wh / 2), ww, 2); // Mittelpfosten und Kämpfer
  }
  function lightShaft(x, sx, sy, w, len, col, dens) {
    for (let i = 0; i < len; i++) for (let X = 0; X < w; X++) {
      const fade = 1 - i / len;
      if (bay(sx + X + i, sy + i) < dens * fade) px(x, col, sx + X + Math.floor(i * 0.6), sy + i);
    }
  }
  // Thronsaal: Säule aus blutrotem Marmor mit Goldkanneluren, vergoldetem Akanthus-Kapitell und Sockel
  function goldPillar(x, cx, w, h) {
    const tones = ['#1c0408', '#3c0810', '#5c1020', '#7c1c2c', '#9c2c3c', '#7c1c2c', '#4c0c18', '#2c060c'];
    for (let X = 0; X < w; X++) for (let Y = 0; Y < h; Y++) {
      const u = X / w, vein = Math.abs(Math.sin(Y * 0.11 + X * 0.6 + hn(X >> 2, Y >> 3, 17) * 5)) < 0.06;
      px(x, (X % 6 === 5) ? '#c89020' : vein ? '#c86070' : tones[Math.min(tones.length - 1, Math.floor(u * tones.length))], cx + X, Y);
    }
    px(x, '#5c3c08', cx - 6, 12, w + 12, 16); px(x, '#fce0a8', cx - 6, 12, w + 12, 1); px(x, '#f8b800', cx - 6, 13, w + 12, 2); // Kapitell
    for (let k = 0; k < Math.floor((w + 12) / 6); k++) { const lx = cx - 6 + k * 6; px(x, '#c89020', lx + 1, 16, 4, 8); px(x, '#fce0a8', lx + 2, 16, 2, 3); px(x, '#8c6414', lx + 1, 23, 4, 1); }
    px(x, '#fce0a8', cx - 7, 13, 3, 3); px(x, '#fce0a8', cx + w + 4, 13, 3, 3); // Voluten
    px(x, '#3c2804', cx - 6, 27, w + 12, 1); px(x, '#f8b800', cx - 3, 28, w + 6, 2);
    const by = h - 58; // Sockel über der Vertäfelung
    px(x, '#f8b800', cx - 3, by, w + 6, 2); px(x, '#5c3c08', cx - 5, by + 2, w + 10, 6); px(x, '#c89020', cx - 5, by + 2, w + 10, 1); px(x, '#3c2804', cx - 6, by + 8, w + 12, 3);
  }
  function pillar(x, cx, w, h) { // Bündelpfeiler: drei runde Dienste, Blattkapitell und Sockel (wiederholt sich je Kachel)
    const tones = ['#141418', '#2c2c34', '#4c4c58', '#6c6c78', '#8c8c98', '#9c9ca8', '#6c6c78', '#3c3c48'], n = 3, sw = w / n;
    for (let X = 0; X < w; X++) {
      const u = (X % sw) / sw;
      px(x, tones[Math.min(tones.length - 1, Math.floor(u * tones.length))], cx + X, 0, 1, h);
    }
    // Kapitell mit Blattwerk
    px(x, '#2c2c34', cx - 5, 14, w + 10, 12); px(x, '#9c9ca8', cx - 5, 14, w + 10, 1); px(x, '#6c6c78', cx - 5, 15, w + 10, 2);
    for (let k = 0; k < Math.floor((w + 10) / 6); k++) { // Blätter
      const lx = cx - 5 + k * 6;
      px(x, '#5c6c4c', lx + 1, 18, 4, 6); px(x, '#8c9c6c', lx + 2, 18, 2, 3); px(x, '#3c4c2c', lx + 1, 23, 4, 1);
    }
    px(x, '#1c1c24', cx - 5, 25, w + 10, 1); px(x, '#8c8c98', cx - 2, 26, w + 4, 2); // Halsring
    // Sockel
    const by = h - 34;
    px(x, '#8c8c98', cx - 2, by, w + 4, 2); px(x, '#2c2c34', cx - 5, by + 2, w + 10, 8); px(x, '#9c9ca8', cx - 5, by + 2, w + 10, 1);
    px(x, '#3c3c48', cx - 7, by + 10, w + 14, 6); px(x, '#7c7c88', cx - 7, by + 10, w + 14, 1); px(x, '#141418', cx - 7, by + 15, w + 14, 1);
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
  function sailTex(w, h, emblem, taper = 0) {
    const key = w + 'x' + h + (emblem ? 'e' : '') + taper;
    if (sailTexCache[key]) return sailTexCache[key];
    const c = C(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data;
    const cols = [[156, 148, 128], [132, 124, 106], [104, 98, 84], [72, 68, 58]];
    const R = Math.min(w, h) * 0.3, ecx = w / 2, ecy = h * 0.48;
    let s = 3 + w + h * 7; const hr = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const notch = Array.from({ length: Math.ceil(w / 14) + 1 }, () => 2 + Math.floor(hr() * 7)); // ausgefranster Saum
    const patches = Array.from({ length: 2 + Math.floor(w / 90) }, () => [hr() * (w - 24) + 6, hr() * (h - 30) + 10, 10 + hr() * 10, 8 + hr() * 8]); // Flicken
    for (let y = 0; y < h; y++) for (let X = 0; X < w; X++) {
      if (y >= h - notch[Math.floor(X / 14)]) continue;
      const u = X / w, v = y / h, b = bay(X, y), inset = Math.round(taper * (1 - v) * w / 2);
      if (X < inset || X >= w - inset) continue; // Bramsegel: oben schmaler
      let k = Math.abs(u - 0.5) * 1.3 + v * 0.3 - Math.sin(v * Math.PI) * 0.15 + b * 0.35 - (u > 0.55 ? (u - 0.55) * 0.5 : 0); // Mondlicht von rechts
      if (X % 16 === 0 || y % 14 === 0) k += 0.45; // Bahnen und Nähte
      let col = cols[k > 1.05 ? 3 : k > 0.75 ? 2 : k > 0.45 ? 1 : 0];
      for (const [px0, py0, pw, ph] of patches) if (X >= px0 && X < px0 + pw && y >= py0 && y < py0 + ph) col = (X === Math.floor(px0) || y === Math.floor(py0) || ((X + y) % 3 === 0 && (X === Math.floor(px0 + pw - 1) || y === Math.floor(py0 + ph - 1)))) ? [70, 62, 50] : [120, 108, 86];
      if ((Math.abs(y - Math.round(h * 0.16)) < 1 || Math.abs(y - Math.round(h * 0.3)) < 1) && X % 6 === 3) col = [64, 56, 46]; // Reffbändsel
      if (X === inset || X === w - 1 - inset || y === 0) col = [58, 42, 26]; // Liektau
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
  function drawSailM7(ctx, cx, top, w, h, t, emblem, gust, taper = 0) {
    if (h < 8) return;
    const tex = sailTex(w, h, emblem, taper), step = View.lite ? 2 : 1;
    const B = 10 + 4 * Math.sin(t * 0.045) + gust * 12; // kräftig geblähter Bauch
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
  const yardW = (k) => Math.min(280, 140 + k * 44); // mächtiges Rigg: jede Rah nach unten deutlich breiter
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
      ctx.fillStyle = '#2c1806'; ctx.fillRect(X - 4, top, 9, base - top);
      ctx.fillStyle = '#6c4420'; ctx.fillRect(X - 3, top, 2, base - top);
      ctx.fillStyle = '#4c2c10'; ctx.fillRect(X - 1, top, 3, base - top);
      for (let k = 0; k < 44; k++) { // langer Wimpel am Mastkopf
        const yy = top + 2 + Math.round(Math.sin(k * 0.3 - frame * 0.18) * (k / 44) * 4);
        ctx.fillStyle = k % 11 < 7 ? '#a80020' : '#580010'; ctx.fillRect(X + 4 + k, yy, 1, Math.max(1, 7 - Math.floor(k / 7)));
      }
      const tt = top + 14, tb = m.yards[0] * T - oy; // Bramsegel über der obersten Rah, nach oben spitz zulaufend
      if (tb - tt > 24 && tb > -10 && tt < 214) { drawSailM7(ctx, X, tt + 2, Math.round(yardW(0) * 0.62), tb - tt - 4, frame + i * 37 + 91, false, gust, 0.55); ctx.fillStyle = '#2c1806'; ctx.fillRect(X - Math.round(yardW(0) * 0.2), tt, Math.round(yardW(0) * 0.4), 3); }
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

  // Glasturm: zwei Säulen ganz vorn an den Turmwänden – dunkel im Gegenlicht, mit farbigem Saum; ziehen schneller vorbei (Tiefe)
  let glassCol = null;
  function buildGlassColumn() {
    const w = 14, h = 208, c = C(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), d = img.data; // schlanke Säule
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) {
      const n = (X + 0.5 - w / 2) / (w / 2), cap = Y < 16, ring = Y >= 120 && Y < 125;
      const half = cap ? w / 2 : ring ? w / 2 - 1 : w / 2 - 2;
      if (Math.abs(X + 0.5 - w / 2) > half) continue;
      let b = 0.08 + 0.2 * Math.sqrt(Math.max(0, 1 - n * n)) - 0.06 * n + (bay(X, Y) - 0.5) * 0.05;
      if (cap) b += Y < 3 ? 0.12 : ((X + (Y > 8 ? 3 : 0)) % 6 < 3 ? 0.07 : 0);  // Kapitell mit Blattwerk
      if (ring) b += Y === 120 ? 0.12 : 0.04;
      let r = 40 * b + 6, g = 32 * b + 3, bl = 56 * b + 10;
      const rim = Math.abs(n) * half / (w / 2);
      if (rim > 0.72 && !cap) { const k = (rim - 0.72) * 2.4, t = n < 0 ? [190, 90, 255] : [90, 150, 255]; r += t[0] * k * 0.5; g += t[1] * k * 0.5; bl += t[2] * k * 0.5; } // Saum aus Fensterlicht
      const i = (Y * w + X) * 4; d[i] = Math.min(255, r); d[i + 1] = Math.min(255, g); d[i + 2] = Math.min(255, bl); d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    return c;
  }
  function drawGlassFront(ctx, room, cam) {
    const c = glassCol || (glassCol = buildGlassColumn()), par = 1.25, rw = room.w * T;
    const mid = (rw - View.w) / 2, oy = ((Math.floor(cam.y * par) % 208) + 208) % 208;
    for (const rx of [-7, rw - 7]) {
      const sx = Math.round(rx - cam.x - (cam.x - mid) * (par - 1));
      if (sx > View.w || sx + 14 < 0) continue;
      for (let y = -oy; y < 208; y += 208) ctx.drawImage(c, sx, y);
    }
  }

  // ---------------- Glasfiguren: mit Pfaden gezeichnet, auf die Glaspalette quantisiert ----------------
  // Jede Farbfläche bekommt beim Einsetzen ins Fenster automatisch Bleiruten an ihren Grenzen.
  const FIG_W = 70, FIG_H = 130;
  const FIG_PAL = [[176, 24, 40], [28, 56, 176], [216, 160, 32], [232, 228, 216], [236, 176, 140], [150, 156, 176],
    [32, 132, 64], [240, 110, 24], [100, 56, 24], [110, 48, 170], [30, 24, 40], [248, 220, 72]];
  const [RUBY, BLUE, GOLD, WHITE, SKIN, SILVER, GREEN, ORANGE, BROWN, PURPLE, DARK, YELLOW] = FIG_PAL.map(c => `rgb(${c})`);
  const FIGS = {
    tentacle(g) { // der lila Tentakel steigt aus den Wellen, ein glühendes Auge
      [[44, 120, 11], [42, 108, 10.5], [38, 96, 10], [34, 84, 9.5], [31, 72, 9], [30, 60, 8.5], [31, 48, 8], [35, 37, 7.5], [41, 29, 7], [48, 25, 6], [54, 26, 5], [58, 30, 4.5], [59, 35, 4], [57, 39, 3.5]].forEach(([x, y, r]) => g.circ(PURPLE, x, y, r));
      [[38, 100], [33, 88], [30, 76], [29, 64], [30, 52]].forEach(([x, y]) => g.circ(SKIN, x - 6, y + 2, 2.5)); // Saugnäpfe
      g.circ(YELLOW, 36, 60, 6); g.rect(DARK, 35, 55, 2, 10);
      g.poly(BLUE, [[0, 112], [10, 106], [22, 112], [34, 106], [46, 112], [58, 106], [70, 112], [70, 130], [0, 130]]);
      g.poly(WHITE, [[0, 112], [10, 106], [22, 112], [18, 114], [10, 110], [2, 114]]); g.poly(WHITE, [[46, 112], [58, 106], [70, 112], [66, 114], [58, 110], [50, 114]]);
    },
    pirate(g) { // mächtiger Pirat mit Zopf, Rüschenhemd, Säbel und Gummihuhn am Gürtel
      g.circ(YELLOW, 35, 25, 9); g.poly(YELLOW, [[27, 24], [20, 42], [25, 44], [31, 28]]);
      g.circ(SKIN, 37, 29, 8);
      g.poly(WHITE, [[24, 38], [48, 38], [51, 78], [21, 78]]); g.ell(WHITE, 20, 52, 6, 11);
      g.poly(WHITE, [[44, 40], [57, 29], [62, 34], [50, 48]]); g.circ(SKIN, 60, 32, 3);
      g.line(SILVER, 60, 30, 69, 4, 3); g.rect(GOLD, 56, 30, 8, 3);
      g.rect(BROWN, 21, 76, 30, 4); g.rect(GOLD, 34, 76, 4, 4);
      g.rect(BLUE, 23, 80, 11, 32); g.rect(BLUE, 38, 80, 11, 32);
      g.rect(BROWN, 21, 110, 14, 12); g.rect(BROWN, 36, 110, 14, 12);
      g.poly(YELLOW, [[12, 64], [20, 62], [22, 70], [16, 78]]); g.circ(YELLOW, 11, 64, 3); g.poly(ORANGE, [[7, 64], [9, 62], [9, 66]]); g.rect(SILVER, 17, 58, 3, 4);
      g.rect(GREEN, 0, 122, 70, 8);
    },
    king(g) {
      g.circ(GOLD, 35, 34, 17); g.poly(RUBY, [[14, 54], [56, 54], [64, 126], [6, 126]]); g.rect(BLUE, 31, 58, 8, 62);
      g.rect(WHITE, 6, 118, 58, 8); g.ell(WHITE, 35, 54, 22, 7); g.circ(SKIN, 35, 36, 10); g.poly(WHITE, [[26, 40], [44, 40], [35, 57]]);
      g.poly(GOLD, [[24, 30], [24, 19], [29, 25], [35, 15], [41, 25], [46, 19], [46, 30]]); g.rect(RUBY, 33, 22, 4, 4);
      g.line(GOLD, 56, 50, 56, 114, 3); g.circ(GOLD, 56, 46, 5); g.rect(GOLD, 55, 35, 3, 7); g.rect(GOLD, 52, 37, 9, 2); g.circ(SKIN, 56, 74, 4);
      g.rect(GREEN, 0, 124, 70, 6);
    },
    slayer(g) { // Drachentöter mit Lanze, stößt nach rechts unten – ins Nachbarfenster mit dem Drachen
      g.circ(GOLD, 28, 28, 15); g.poly(RUBY, [[16, 44], [8, 122], [24, 122], [26, 48]]);
      g.rect(SILVER, 19, 80, 8, 42); g.rect(SILVER, 31, 80, 8, 42); g.poly(SILVER, [[18, 42], [40, 42], [42, 82], [16, 82]]);
      g.rect(WHITE, 21, 46, 18, 34); g.rect(RUBY, 28, 47, 4, 32); g.rect(RUBY, 22, 57, 16, 4);
      g.circ(SILVER, 29, 31, 9); g.rect(DARK, 24, 30, 11, 2);
      g.poly(BLUE, [[4, 50], [18, 50], [18, 68], [11, 82], [4, 68]]); g.rect(GOLD, 10, 54, 2, 22); g.rect(GOLD, 6, 60, 10, 2);
      g.line(BROWN, 34, 38, 64, 108, 3); g.poly(SILVER, [[70, 122], [59, 108], [67, 103]]);
      g.rect(GREEN, 0, 122, 70, 8);
    },
    dragon(g) { // speit Feuer nach links, dem Drachentöter entgegen
      g.poly(ORANGE, [[16, 50], [0, 36], [0, 70]]); g.poly(YELLOW, [[16, 52], [2, 46], [2, 60]]);
      g.poly(PURPLE, [[44, 74], [64, 26], [68, 62], [60, 62], [66, 80]]);
      g.poly(GREEN, [[60, 92], [70, 100], [66, 122], [50, 128], [58, 110]]); g.poly(GREEN, [[26, 44], [36, 46], [48, 74], [36, 78]]);
      g.ell(GREEN, 46, 88, 18, 14); g.ell(YELLOW, 44, 92, 12, 8);
      g.rect(GREEN, 36, 96, 6, 22); g.rect(GREEN, 52, 96, 6, 22); g.rect(WHITE, 34, 116, 9, 3); g.rect(WHITE, 50, 116, 9, 3);
      g.poly(GREEN, [[12, 46], [28, 40], [32, 54], [14, 58]]); g.poly(GREEN, [[26, 41], [30, 30], [33, 43]]);
      g.poly(WHITE, [[15, 56], [20, 56], [17, 61]]); g.circ(RUBY, 24, 46, 2);
      g.rect(BROWN, 0, 124, 70, 6);
    },
    horse(g) { // Schlachtross mit Schabracke, bäumt sich auf
      g.poly(BROWN, [[60, 74], [70, 92], [64, 110]]); g.ell(WHITE, 42, 78, 22, 14);
      g.poly(WHITE, [[22, 72], [24, 42], [16, 30], [8, 36], [14, 48], [14, 74]]); g.poly(BROWN, [[24, 42], [30, 40], [34, 68], [26, 70]]);
      g.poly(WHITE, [[22, 86], [12, 70], [8, 74], [18, 92]]); g.poly(WHITE, [[30, 88], [22, 74], [18, 78], [26, 94]]);
      g.rect(WHITE, 50, 88, 6, 34); g.rect(WHITE, 58, 88, 5, 32);
      g.poly(BLUE, [[20, 70], [62, 70], [66, 96], [16, 96]]); g.rect(GOLD, 16, 94, 50, 3); g.rect(GOLD, 20, 70, 42, 2);
      g.rect(GOLD, 38, 76, 3, 14); g.rect(GOLD, 33, 81, 13, 3);
      g.rect(DARK, 50, 120, 6, 3); g.rect(DARK, 58, 118, 5, 3);
      g.rect(GREEN, 0, 124, 70, 6);
    },
    knight(g) { // Ritter mit erhobenem Schwert und Wappenschild
      g.poly(RUBY, [[34, 22], [50, 6], [46, 26]]); g.circ(SILVER, 35, 32, 10); g.rect(DARK, 29, 31, 12, 2);
      g.poly(SILVER, [[22, 44], [48, 44], [50, 84], [20, 84]]); g.rect(BLUE, 25, 48, 20, 36);
      g.poly(GOLD, [[30, 56], [40, 56], [42, 68], [35, 76], [28, 68]]);
      g.rect(SILVER, 23, 84, 9, 38); g.rect(SILVER, 38, 84, 9, 38);
      g.poly(RUBY, [[4, 52], [22, 52], [22, 74], [13, 90], [4, 74]]); g.poly(GOLD, [[6, 56], [13, 64], [20, 56], [20, 60], [13, 68], [6, 60]]);
      g.rect(SILVER, 54, 8, 4, 50); g.rect(GOLD, 48, 56, 16, 3); g.rect(BROWN, 54, 59, 4, 9); g.circ(SKIN, 56, 70, 4);
      g.rect(GREEN, 0, 122, 70, 8);
    },
    queen(g) {
      g.circ(GOLD, 35, 32, 16); g.poly(BROWN, [[25, 30], [45, 30], [49, 60], [21, 60]]);
      g.poly(BLUE, [[18, 50], [52, 50], [66, 126], [4, 126]]); g.poly(PURPLE, [[26, 52], [44, 52], [40, 126], [30, 126]]); g.rect(GOLD, 4, 120, 62, 6);
      g.circ(SKIN, 35, 36, 9);
      g.poly(GOLD, [[26, 28], [26, 20], [31, 25], [35, 17], [39, 25], [44, 20], [44, 28]]);
      g.line(GREEN, 53, 60, 53, 100, 2); g.poly(WHITE, [[53, 58], [46, 50], [53, 45], [60, 50]]); g.circ(SKIN, 50, 80, 4);
      g.rect(GREEN, 0, 124, 70, 6);
    },
    angel(g) { // Engel mit ausgebreiteten Flügeln und Posaune
      g.poly(WHITE, [[30, 50], [10, 10], [2, 22], [2, 46], [10, 70], [26, 80]]); g.poly(WHITE, [[40, 50], [60, 10], [68, 22], [68, 46], [60, 70], [44, 80]]);
      g.poly(YELLOW, [[30, 52], [12, 22], [8, 34], [12, 58], [26, 70]]); g.poly(YELLOW, [[40, 52], [58, 22], [62, 34], [58, 58], [44, 70]]);
      g.circ(GOLD, 35, 30, 13);
      g.poly(BLUE, [[22, 48], [48, 48], [58, 124], [12, 124]]); g.poly(WHITE, [[29, 50], [41, 50], [45, 124], [25, 124]]);
      g.circ(YELLOW, 35, 31, 9); g.circ(SKIN, 35, 34, 7);
      g.poly(GOLD, [[40, 60], [62, 38], [65, 41], [43, 63]]); g.poly(GOLD, [[60, 34], [70, 26], [70, 44], [64, 44]]); g.circ(SKIN, 42, 62, 3);
      g.rect(SKIN, 28, 120, 5, 4); g.rect(SKIN, 37, 120, 5, 4);
      g.rect(GREEN, 0, 124, 70, 6);
    },
  };
  // Schwarzlot: Malerei auf dem Glas (Gesichter, Falten, Schuppen, Federn) – nur Abdunklung, keine Bleiruten
  const PAINT = {
    tentacle(p) {
      for (let k = 0; k < 9; k++) p.line(48 - k * 2, 116 - k * 10, 52 - k * 2, 112 - k * 10); // Ringe auf der Haut
      p.circ(36, 60, 6); p.line(30, 52, 40, 54);
      p.line(4, 120, 14, 118); p.line(26, 122, 38, 120); p.line(50, 120, 62, 118);
    },
    pirate(p) {
      p.dot(35, 28); p.dot(40, 28); p.line(33, 25, 36, 25); p.line(39, 25, 42, 25); p.line(37, 30, 37, 32); p.line(35, 34, 39, 34);
      p.line(28, 24, 24, 38); p.line(31, 22, 33, 18);
      p.line(30, 44, 28, 76); p.line(36, 42, 36, 76); p.line(42, 44, 44, 76); p.line(20, 44, 18, 60); p.line(24, 46, 22, 58);
      p.line(28, 84, 28, 108); p.line(43, 84, 43, 108); p.dot(10, 63); p.line(14, 70, 19, 66);
    },
    king(p) {
      p.rays(35, 34, 12, 16, 20); p.circ(35, 34, 16);
      p.dot(31, 34); p.dot(32, 34); p.dot(38, 34); p.dot(39, 34); p.line(29, 31, 33, 31); p.line(37, 31, 41, 31); p.line(35, 35, 35, 38); p.line(34, 39, 36, 39);
      p.line(31, 43, 33, 52); p.line(35, 43, 35, 54); p.line(39, 43, 37, 52); p.line(28, 41, 31, 47); p.line(42, 41, 39, 47);
      [20, 27, 35, 43, 50].forEach(x => p.dot(x, 54)); [24, 31, 39, 46].forEach(x => p.dot(x, 57));
      p.line(20, 62, 13, 116); p.line(26, 64, 24, 116); p.line(45, 64, 47, 116); p.line(51, 62, 58, 116); p.line(33, 62, 33, 116); p.line(37, 62, 37, 116);
      p.line(25, 27, 45, 27); p.dot(28, 23); p.dot(42, 23); p.circ(56, 46, 3);
      p.line(8, 121, 62, 121); [12, 22, 32, 42, 52].forEach(x => p.dot(x, 123));
    },
    queen(p) {
      p.rays(35, 32, 11, 15, 20); p.circ(35, 32, 15);
      p.dot(31, 35); p.dot(32, 35); p.dot(38, 35); p.dot(39, 35); p.line(30, 32, 33, 32); p.line(37, 32, 40, 32); p.line(35, 36, 35, 38); p.line(33, 41, 37, 41);
      p.line(25, 40, 23, 58); p.line(27, 44, 26, 58); p.line(45, 40, 47, 58); p.line(43, 44, 44, 58);
      p.line(15, 70, 8, 118); p.line(21, 66, 17, 118); p.line(49, 66, 53, 118); p.line(55, 70, 62, 118); p.line(35, 56, 35, 118);
      p.line(53, 50, 53, 56); p.line(48, 50, 58, 50); p.line(27, 26, 43, 26); p.dot(35, 21);
      p.line(6, 123, 64, 123);
    },
    slayer(p) {
      p.rays(28, 28, 10, 14, 18); p.circ(28, 28, 14);
      p.line(24, 27, 34, 27); p.dot(26, 34); p.dot(32, 34); p.line(29, 22, 29, 25);
      for (let y = 84; y < 120; y += 3) for (let x = 20; x < 39; x += 3) if (x < 27 || x > 30) p.dot(x + (y % 2), y);
      for (let y = 44; y < 80; y += 4) { p.dot(19, y); p.dot(40, y); }
      p.line(23, 48, 23, 78); p.line(37, 48, 37, 78);
      p.line(8, 54, 8, 74); p.line(14, 54, 14, 74); p.line(12, 104, 10, 118); p.line(20, 100, 22, 118);
    },
    dragon(p) {
      for (let y = 78; y < 102; y += 4) for (let x = 32; x < 62; x += 5) { const ox = x + ((y / 4) % 2) * 2; p.dot(ox, y); p.dot(ox + 1, y + 1); p.dot(ox + 2, y); }
      [88, 92, 96].forEach(y => p.line(36, y, 52, y));
      p.line(46, 72, 64, 28); p.line(48, 72, 67, 60); p.line(47, 72, 60, 62); p.line(52, 52, 66, 44);
      p.circ(24, 46, 3); p.dot(14, 50); p.line(18, 54, 30, 50); p.line(30, 50, 36, 62); p.line(33, 52, 42, 70);
      for (let y = 100; y < 124; y += 5) p.line(60, y, 66, y + 3);
      p.line(38, 100, 38, 114); p.line(54, 100, 54, 114);
    },
    horse(p) {
      p.circ(13, 37, 1.5); p.dot(9, 41); p.line(10, 44, 16, 47); p.line(16, 34, 24, 42); p.line(12, 39, 22, 44);
      p.line(26, 44, 28, 66); p.line(29, 42, 31, 66); p.line(32, 50, 33, 66);
      p.line(28, 72, 26, 94); p.line(42, 72, 42, 94); p.line(56, 72, 60, 94); p.line(20, 84, 64, 84);
      p.line(52, 92, 52, 118); p.line(60, 92, 60, 116); p.line(14, 74, 18, 88); p.line(22, 78, 26, 90);
      p.line(62, 80, 68, 94); p.line(63, 90, 66, 104);
    },
    knight(p) {
      p.line(30, 27, 40, 27); p.dot(31, 36); p.dot(39, 36); p.line(35, 36, 35, 41);
      p.line(35, 46, 35, 82); p.line(22, 60, 48, 60); p.line(21, 72, 49, 72);
      p.line(23, 96, 32, 96); p.line(38, 96, 47, 96); p.line(23, 106, 32, 106); p.line(38, 106, 47, 106); p.circ(27, 101, 2); p.circ(42, 101, 2);
      p.line(56, 10, 56, 54); p.line(13, 56, 13, 84); p.line(5, 64, 21, 64);
      p.line(39, 14, 46, 22); p.line(42, 12, 48, 18);
    },
    angel(p) {
      p.rays(35, 30, 10, 12, 16); p.circ(35, 30, 12);
      for (let k = 0; k < 6; k++) { p.line(30, 52, 6 + k * 2, 14 + k * 11); p.line(40, 52, 64 - k * 2, 14 + k * 11); }
      for (let y = 26; y < 70; y += 6) { p.dot(10 + (y % 12) / 3, y); p.dot(60 - (y % 12) / 3, y); }
      p.dot(32, 33); p.dot(38, 33); p.line(34, 37, 36, 37); p.line(29, 26, 33, 24); p.line(37, 24, 41, 26); p.circ(28, 32, 2); p.circ(42, 32, 2);
      p.line(35, 54, 35, 118); p.line(31, 60, 28, 118); p.line(39, 60, 42, 118); p.line(20, 70, 15, 118); p.line(50, 70, 55, 118);
      p.line(44, 59, 61, 42); p.line(64, 34, 64, 44);
    },
  };
  const figCache = {};
  // 'name!' = gespiegelt; liefert { col: Palettenindex+1 je Pixel (0 = kein Glas der Figur), paint: 1 = Schwarzlot }
  function glassFigure(name) {
    if (figCache[name]) return figCache[name];
    const mirror = name.endsWith('!'), base = name.replace('!', '');
    const c = C(FIG_W, FIG_H), x = c.getContext('2d'), pc = C(FIG_W, FIG_H), q = pc.getContext('2d');
    if (mirror) { x.translate(FIG_W, 0); x.scale(-1, 1); q.translate(FIG_W, 0); q.scale(-1, 1); }
    const g = {
      poly(col, pts) { x.fillStyle = col; x.beginPath(); pts.forEach(([a, b], i) => i ? x.lineTo(a, b) : x.moveTo(a, b)); x.closePath(); x.fill(); },
      circ(col, cx, cy, r) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); },
      ell(col, cx, cy, rx, ry) { x.fillStyle = col; x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); x.fill(); },
      rect(col, a, b, w, h) { x.fillStyle = col; x.fillRect(a, b, w, h); },
      line(col, x0, y0, x1, y1, w) { x.strokeStyle = col; x.lineWidth = w; x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke(); },
    };
    q.strokeStyle = q.fillStyle = '#000'; q.lineWidth = 1;
    const p = {
      dot(a, b) { q.fillRect(Math.floor(a), Math.floor(b), 1, 1); },
      line(x0, y0, x1, y1) { q.beginPath(); q.moveTo(x0 + 0.5, y0 + 0.5); q.lineTo(x1 + 0.5, y1 + 0.5); q.stroke(); },
      circ(cx, cy, r) { q.beginPath(); q.arc(cx + 0.5, cy + 0.5, r, 0, Math.PI * 2); q.stroke(); },
      rays(cx, cy, r0, r1, n) { for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; this.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); } }, // Strahlen im Heiligenschein
    };
    FIGS[base](g); PAINT[base](p);
    const src = x.getImageData(0, 0, FIG_W, FIG_H).data, ps = q.getImageData(0, 0, FIG_W, FIG_H).data;
    const col = new Uint8Array(FIG_W * FIG_H), paint = new Uint8Array(FIG_W * FIG_H);
    for (let i = 0; i < col.length; i++) {
      if (src[i * 4 + 3] < 128) continue;
      let best = 0, bd = 1e9;
      FIG_PAL.forEach((pp, k) => { const dd = (pp[0] - src[i * 4]) ** 2 + (pp[1] - src[i * 4 + 1]) ** 2 + (pp[2] - src[i * 4 + 2]) ** 2; if (dd < bd) { bd = dd; best = k; } });
      col[i] = best + 1;
      paint[i] = ps[i * 4 + 3] > 90 ? 1 : 0;
    }
    return (figCache[name] = { col, paint });
  }

  // ---------------- Hintergründe ----------------
  function buildBg(theme) {
    seed = 7;
    const L = [];
    const add = (name, c, par, extra = {}) => L.push({ name, c, par, wrap: c.width >= 512, ...extra });
    if (theme === 'vortex') {
      L.push({ name: 'tunnel', tunnel: true, par: 0, c: C(1, 1) });
    } else if (theme === 'glass') { // Glasturm: riesige Buntglasfenster zwischen Bündelpfeilern – Figuren unter Baldachinen, Maßwerkrosette, Juwelenbordüre, Rautengrund
      const GH0 = 624; // drei Fensterreihen à 208 px
      const c = C(512, GH0), x = c.getContext('2d'), img = x.createImageData(512, GH0), d = img.data;
      const gc = C(512, GH0), gx = gc.getContext('2d'), gimg = gx.createImageData(512, GH0), gd = gimg.data; // Leuchtebene: nur das Glas
      const put = (X, Y, col) => { const i = (Y * 512 + X) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255; };
      const glowPut = (X, Y, col) => { const i = (Y * 512 + X) * 4; gd[i] = col[0]; gd[i + 1] = col[1]; gd[i + 2] = col[2]; gd[i + 3] = 255; };
      for (let Y = 0; Y < GH0; Y++) { // Quadermauerwerk, sehr dunkel, damit das Glas leuchtet
        const row = Math.floor(Y / 9), off = (row % 2) * 11;
        for (let X = 0; X < 512; X++) {
          const j = (X + off) % 22, blk = Math.floor((X + off) / 22);
          if (Y % 9 === 0 || j === 0) { put(X, Y, [7, 3, 11]); continue; }
          const n = ((row * 7 + blk * 13) % 5) + (Y % 9 === 1 || j === 1 ? 3 : 0) + bay(X, Y) * 2;
          put(X, Y, [15 + n, 9 + n, 21 + n]);
        }
      }
      const SETS = [ // Grund, Bordüre, Rosette, Akzent
        [[26, 52, 168], [168, 26, 44], [216, 160, 32], [120, 200, 240]],
        [[152, 22, 44], [26, 52, 168], [216, 160, 32], [252, 200, 120]],
        [[22, 108, 70], [152, 22, 44], [216, 160, 32], [180, 248, 200]],
        [[96, 40, 168], [216, 160, 32], [168, 26, 44], [220, 170, 252]],
      ];
      const MOTIFS = [['king', 'slayer', 'dragon', 'horse'], ['queen', 'knight', 'angel', 'king!'], ['tentacle', 'pirate!', 'knight!', 'queen!']];
      const SET_OF = [[0, 2, 1, 3], [2, 3, 1, 0], [2, 1, 0, 3]]; // Grundfarbe je Fenster: jede Figur hebt sich ab (grüner Drache auf rotem Grund)
      const NAMES = { king: 'REX', slayer: 'GEORGIVS', dragon: 'DRACO', horse: 'EQVVS', knight: 'MILES', queen: 'REGINA', angel: 'ANGELVS', tentacle: 'TENTACVLVS', pirate: 'GVYBRVSH' };
      const LEAD = [12, 6, 18], ST = [[50, 42, 62], [78, 68, 92], [112, 100, 128], [26, 20, 34]];
      const WHITE_G = FIG_PAL[3], YEL = FIG_PAL[11], GOLD_G = FIG_PAL[2];
      const hash = (n) => { n = Math.imul(n ^ (n >>> 15), 0x2c1b3c6d); n = Math.imul(n ^ (n >>> 12), 0x297a2d39); return ((n ^ (n >>> 15)) >>> 0) / 4294967296; };
      const label = (t) => { // Inschriftband: Pixelschrift als Schwarzlot-Maske
        const tc = C(FIG_W, 10), tx = tc.getContext('2d');
        Font.draw(tx, t, FIG_W / 2, 2, '#000', { align: 'center' });
        const a = tx.getImageData(0, 0, FIG_W, 10).data, m = new Uint8Array(FIG_W * 10);
        for (let i = 0; i < m.length; i++) m[i] = a[i * 4 + 3] > 100 ? 1 : 0;
        return m;
      };
      const W0 = 84, H0 = 196, A0 = Math.round(W0 * 0.866), FX = 7, FY = 56, RC = { x: W0 / 2, y: 27 }, RR = 14;
      const insideW = (lx, ly) => ly >= 0 && ly < H0 && lx >= 0 && lx < W0 && (ly >= A0 || ((lx - W0) ** 2 + (ly - A0) ** 2 <= W0 * W0 && lx ** 2 + (ly - A0) ** 2 <= W0 * W0)); // Spitzbogen
      const edgeW = (lx, ly, r) => !insideW(lx - r, ly) || !insideW(lx + r, ly) || !insideW(lx, ly - r) || !insideW(lx, ly + r);
      // Zonen sind für alle Fenster gleich: 0 außen, 1 Steinlaibung, 2 Juwelenbordüre, 3 Perlenschnur, 4 Innenfeld
      const zone = new Uint8Array(W0 * H0);
      for (let ly = 0; ly < H0; ly++) for (let lx = 0; lx < W0; lx++) zone[ly * W0 + lx] = !insideW(lx, ly) ? 0 : edgeW(lx, ly, 2) ? 1 : edgeW(lx, ly, 6) ? 2 : edgeW(lx, ly, 8) ? 3 : 4;
      const canopy = (lx, ly) => { // gotischer Baldachin aus Weiß- und Silbergelbglas über der Figur
        const cx = W0 / 2, ax = Math.abs(lx + 0.5 - cx);
        if (ly >= 56 && ly < 61 && lx >= 11 && lx < W0 - 11) return { id: 5000, col: WHITE_G, p: lx % 5 === 0 || ly === 60 ? 1 : 0 };      // Gesims mit Bogenfries
        if (ly >= 40 && ly < 56 && ax <= ly - 38) {                                                                                       // Wimperg mit Dreipass und Krabben
          const ring = Math.abs(Math.hypot(lx + 0.5 - cx, ly - 52) - 5) < 0.6 && ly < 53, crab = Math.abs(ax - (ly - 38)) < 0.8 && ly % 3 === 0;
          return { id: 5001, col: YEL, p: ring || crab ? 1 : 0 };
        }
        for (const pc of [15, W0 - 15]) {
          const dx = Math.abs(lx + 0.5 - pc), s = pc > cx ? 1 : 0;
          if (ly >= 40 && ly < 56 && dx <= 3) return { id: 5002 + s, col: WHITE_G, p: dx < 0.6 && ly >= 44 && ly <= 51 ? 1 : 0 };            // Fiale mit Fensterchen
          if (ly >= 32 && ly < 40 && dx <= (ly - 32) * 0.45) return { id: 5004 + s, col: YEL, p: 0 };                                    // Fialenspitze
        }
        return null;
      };
      const glow = [];
      MOTIFS.forEach((row, band) => row.forEach((name, wi) => {
        const wx = 22 + wi * 128, wy = band * 208 + 6, S = SETS[SET_OF[band][wi]], key = band * 4 + wi;
        const F = glassFigure(name), txt = label(NAMES[name.replace('!', '')]);
        glow[key] = S[0];
        const pid = new Int32Array(W0 * H0).fill(-1), base = new Array(W0 * H0), paint = new Uint8Array(W0 * H0);
        for (let ly = 0; ly < H0; ly++) for (let lx = 0; lx < W0; lx++) {
          const i = ly * W0 + lx, z = zone[i];
          if (z < 2) continue;
          let id, col, pt = 0, cz;
          const u = lx - FX, v = ly - FY, f = u >= 0 && u < FIG_W && v >= 0 && v < 120 ? F.col[v * FIG_W + u] : 0;
          const dr = Math.hypot(lx + 0.5 - RC.x, ly + 0.5 - RC.y);
          if (z === 2) { const k = Math.floor((ly + Math.abs(lx + 0.5 - W0 / 2) * 0.7) / 8); id = 1000 + k; col = k % 3 === 0 ? S[2] : S[1]; } // Juwelen
          else if (z === 3) { const k = Math.floor((ly + Math.abs(lx + 0.5 - W0 / 2)) / 3); id = 2000 + k; col = k % 2 ? WHITE_G : S[3]; }   // Perlen
          else if (dr < RR + 1.6) { // Maßwerkrosette: Steinring, Vierpass, Mittelbuckel
            const lobes = [[6, 0], [-6, 0], [0, 6], [0, -6]].map(([ox, oy]) => Math.hypot(lx + 0.5 - RC.x - ox, ly + 0.5 - RC.y - oy) - 6);
            const md = Math.min(...lobes), li = lobes.indexOf(md);
            if (dr > RR - 1.4 || Math.abs(md) < 0.9 || Math.abs(dr - 3) < 0.8) { pid[i] = -2; base[i] = ly + 0.5 < RC.y ? ST[2] : ST[0]; continue; }
            if (dr < 3) { id = 3000; col = GOLD_G; }
            else if (md < 0) { id = 3001 + li; col = li < 2 ? S[2] : S[3]; pt = Math.abs(md + 3) < 0.5 ? 1 : 0; }
            else { id = 3010 + (lx < RC.x ? 0 : 1) + (ly < RC.y ? 0 : 2); col = S[1]; }
          }
          else if ((cz = canopy(lx, ly))) { id = cz.id; col = cz.col; pt = cz.p; }
          else if (v >= 120 && v < 130 && u >= 0 && u < FIG_W) { // Inschriftband mit eingerollten Enden
            if (u < 3 || u > 66) { id = 6001 + (u < 3 ? 0 : 1); col = S[1]; } else { id = 6000; col = WHITE_G; pt = txt[(v - 120) * FIG_W + u]; }
          }
          else if (f) { id = 7000 + f; col = FIG_PAL[f - 1]; pt = F.paint[v * FIG_W + u]; }
          else { // Rautengrund, jede Raute mit kleiner gemalter Rosette
            const U = lx + ly, V = lx - ly + 400, cu = Math.floor(U / 10), cv = Math.floor(V / 10), du = U - cu * 10 - 5, dv = V - cv * 10 - 5;
            id = 10000 + cu * 100 + cv; col = S[0]; pt = Math.abs(du) + Math.abs(dv) <= 1 && (du + dv) % 2 === 0 ? 1 : 0;
          }
          pid[i] = id; base[i] = col; paint[i] = pt;
        }
        for (let ly = 0; ly < H0; ly++) for (let lx = 0; lx < W0; lx++) {
          const i = ly * W0 + lx, z = zone[i], X = wx + lx, Y = wy + ly;
          if (!z) continue;
          if (z === 1) { put(X, Y, edgeW(lx, ly, 1) ? ST[3] : ly < A0 ? ST[2] : ST[1]); continue; } // Laibung mit Fase
          if (pid[i] === -2) { put(X, Y, base[i]); continue; }                                      // Maßwerk
          const l = lx > 0 ? pid[i - 1] : -1, t = ly > 0 ? pid[i - W0] : -1;
          if ((l >= 0 && l !== pid[i]) || (t >= 0 && t !== pid[i])) { put(X, Y, LEAD); continue; } // Bleirute
          const col = base[i], h = hash(pid[i] * 7919 + key * 104729);
          let k = 0.58 + 0.42 * Math.sin(Math.PI * (lx + 0.5) / W0) * (0.8 + 0.2 * (1 - ly / H0)); // Mondlicht von hinten: Mitte hell
          k *= 0.9 + 0.2 * h;                                                                       // jede Scheibe etwas anders getönt
          k *= 1 + 0.07 * Math.sin(lx * (0.45 + h) + ly * (1.2 - h) * 0.6 + h * 40);              // Schlieren im mundgeblasenen Glas
          k += (bay(X, Y) - 0.5) * 0.12;
          if (hash(i * 31 + key * 977) < 0.005) k *= 1.4;                                           // Bläschen
          const me = pid[i], nb = (dx, dy) => { const xx = lx + dx, yy = ly + dy; return xx < 0 || yy < 0 || xx >= W0 || yy >= H0 ? -1 : pid[yy * W0 + xx]; };
          if (nb(1, 0) !== me || nb(0, 1) !== me) k *= 0.74;                                         // gemalter Kantenschatten (Mattierung), unten rechts kräftiger
          else if (nb(2, 0) !== me || nb(0, 2) !== me || nb(-2, 0) !== me || nb(0, -2) !== me) k *= 0.88;
          let glint = me >= 3000 && nb(-2, 0) !== me && nb(0, -2) !== me && nb(-1, 0) === me && nb(0, -1) === me && hash(me * 13 + key) < 0.55; // Lichtreflex in der Ecke der Scheibe
          let r = col[0] * k, g = col[1] * k, b = col[2] * k;
          if (paint[i]) { r = r * 0.28 + 10; g = g * 0.24 + 5; b = b * 0.22 + 4; glint = false; }   // Schwarzlot
          if (glint) { r = r * 0.4 + 150; g = g * 0.4 + 150; b = b * 0.4 + 150; }
          const out = [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
          put(X, Y, out); glowPut(X, Y, out);
        }
        for (let ly = -12; ly < H0 + 12; ly++) for (let lx = -12; lx < W0 + 12; lx++) { // farbiger Lichtschein auf dem Mauerwerk rund ums Fenster
          if (insideW(lx, ly)) continue;
          const X = wx + lx, Y = wy + ly;
          if (X < 0 || X >= 512 || Y < 0 || Y >= GH0) continue;
          let dist;
          if (ly >= A0) { const ex = lx < 0 ? -lx : lx >= W0 ? lx - W0 + 1 : 0, ey = ly >= H0 ? ly - H0 + 1 : 0; dist = Math.hypot(ex, ey); }
          else dist = Math.max(Math.hypot(lx - W0, ly - A0), Math.hypot(lx, ly - A0)) - W0;
          if (dist >= 12 || dist < 0) continue;
          const k = (1 - dist / 12) ** 2 * 0.5, j = (Y * 512 + X) * 4;
          d[j] = Math.min(255, d[j] + S[0][0] * k); d[j + 1] = Math.min(255, d[j + 1] + S[0][1] * k); d[j + 2] = Math.min(255, d[j + 2] + S[0][2] * k);
        }
      }));
      // Bündelpfeiler: Rundpfeiler mit vier Diensten, farbiges Streiflicht der Nachbarfenster an den Kanten,
      // Blattkapitell am Bogenansatz, Schaftring, Basis auf dem Gesims
      const STN = [[16, 11, 24], [32, 25, 44], [52, 44, 66], [78, 68, 94], [110, 99, 128], [148, 138, 166]];
      const stone = (b, X, Y) => { const v = Math.max(0, Math.min(4.999, b * 5 + (bay(X, Y) - 0.5) * 0.7)), k = Math.floor(v); return STN[k]; };
      const tint = (col, g, a) => [col[0] * (1 - a) + Math.min(255, g[0] * 1.25) * a, col[1] * (1 - a) + Math.min(255, g[1] * 1.25) * a, col[2] * (1 - a) + Math.min(255, g[2] * 1.25) * a];
      const cyl = (n) => 0.25 + 0.55 * Math.sqrt(Math.max(0, 1 - n * n)) - 0.18 * n; // Licht leicht von links
      for (let band = 0; band < 3; band++) for (let k = 0; k <= 4; k++) {
        const cx = k * 128, y0 = band * 208, gl = glow[band * 4 + (k + 3) % 4], gr = glow[band * 4 + k % 4];
        for (let ly = 0; ly < 204; ly++) for (let dx = -12; dx <= 12; dx++) { // schlanker Bündelpfeiler
          const X = cx + dx, Y = y0 + ly;
          if (X < 0 || X >= 512) continue;
          const ax = Math.abs(dx);
          let col = null;
          if (ly >= 70 && ly < 73) col = ax <= 12 ? (ly === 70 ? STN[5] : STN[3]) : null;                      // Deckplatte des Kapitells
          else if (ly >= 73 && ly < 81) { // Kelch mit Blattwerk
            if (ax <= 11.5 - (ly - 73) * 0.3) {
              const leaf = ((dx + 40 + (ly < 77 ? 0 : 2)) % 4), curl = ly === 73 || ly === 74;
              col = curl && leaf < 1 ? STN[5] : leaf < 2 ? STN[4 - (ly > 77 ? 1 : 0)] : STN[2];
            }
          } else if (ly >= 81 && ly < 83) col = ax <= 10 ? (ly === 81 ? STN[4] : STN[1]) : null;               // Halsring
          else if (ly >= 140 && ly < 143) col = ax <= 11 ? (ly === 140 ? STN[4] : STN[2]) : null;              // Schaftring
          else if (ly >= 190 && ly < 194) col = ax <= 12 ? stone(cyl(dx / 13) * (ly === 190 ? 1.15 : 0.9), X, Y) : null; // Wulst der Basis
          else if (ly >= 194) col = ax <= 12 ? (ly === 194 ? STN[4] : ly > 201 ? STN[0] : STN[2]) : null;    // Sockel
          if (!col) { // Schäfte
            const sides = [[0, 5], [-9, 2], [9, 2]];
            for (const [sx, r] of sides) {
              const n = (dx - sx) / (r + 0.5);
              if (Math.abs(n) > 1) continue;
              col = stone(cyl(n), X, Y);
              if (n < -0.6 && dx < 0) col = tint(col, gl, Math.min(0.85, (-n - 0.6) * 2.1)); // Streiflicht vom linken Fenster
              else if (n > 0.6 && dx > 0) col = tint(col, gr, Math.min(0.85, (n - 0.6) * 2.1)); // … und vom rechten
              break;
            }
            if (!col) col = ax <= 12 ? (ax >= 11 ? STN[1] : STN[0]) : null;         // Kehlen zwischen den Diensten
          }
          if (col) put(X, Y, col);
        }
      }
      for (const gy of [204, 412, 620]) for (let X = 0; X < 512; X++) { // Gesims mit Zahnschnitt zwischen den Fensterreihen
        put(X, gy, [100, 90, 118]); put(X, gy + 1, [66, 56, 80]); put(X, gy + 2, X % 4 === 0 ? [14, 9, 20] : [54, 46, 68]); put(X, gy + 3, [14, 9, 20]);
      }
      x.putImageData(img, 0, 0); gx.putImageData(gimg, 0, 0);
      add('wall', c, 0.5, { vtile: true, hidden: true }); // Textur der Röhre (nicht direkt gezeichnet)
      add('glassGlow', gc, 0.5, { vtile: true, glow: true, hidden: true });
      L.push({ name: 'tube', custom: (ctx, cam, frame) => drawGlassTube(ctx, cam, frame, c, gc), par: 0.5, c: C(1, 1) });
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
    } else if (theme === 'foyer') { // Eingangshalle: deckenhohe Fenster mit Sturm dahinter, schwere Vorhänge, Risse und Verfall
      const sky = C(640, 208), xs = sky.getContext('2d');
      smooth(xs, 640, 208, ['#000000', '#04010c', '#0a0418', '#120826', '#1c0c34', '#26103e', '#301446', '#3a184c', '#421c50']);
      for (let i = 0; i < 70; i++) px(xs, rand() < 0.3 ? '#fcfcfc' : '#7c7c9c', ri(0, 639), ri(0, 90));
      add('sky', sky, 0, { wrap: false });
      const cl = C(512, 208), xc = cl.getContext('2d');
      for (let i = 0; i < 36; i++) {
        const cx = ri(0, 511), cy = ri(10, 150), rx = ri(16, 40), ry = ri(6, 16);
        for (let y = -ry; y <= ry; y++) for (let X = -rx; X <= rx; X++) {
          const q = (X * X) / (rx * rx) + (y * y) / (ry * ry);
          if (q > 1 || bay(X + cx, y + cy) < (q - 0.65) * 3) continue;
          px(xc, y > ry * 0.4 ? '#1c0c30' : '#0c0618', (cx + X + 512) % 512, cy + y);
        }
      }
      add('clouds', cl, 0.06, { drift: 0.25 });
      L.push({ name: 'rainOut', custom: drawRainOut, par: 0, c: C(1, 1) });
      const H = 320, c = C(512, H), x = c.getContext('2d');
      const WINS = [[44, 20, 56, 216], [300, 20, 56, 216]]; // x, Oberkante, Breite, Höhe (bis zum Boden)
      const inWin = (X, Y, [wx, wy, ww, wh]) => { const r = ww / 2, cx = wx + r; if (X < wx || X >= wx + ww || Y >= wy + wh) return false; if (Y >= wy + r) return true; return (X + 0.5 - cx) ** 2 + (Y + 0.5 - (wy + r)) ** 2 * 0.55 <= r * r && Y >= wy; };
      // Damasttapete in dunklem Karmesin, Holzvertäfelung unten
      for (let Y = 0; Y < H; Y++) for (let X = 0; X < 512; X++) {
        const u = (X % 24) - 12, v = (Y % 32) - 16, fl = Math.abs(u) < 8 - Math.abs(v) * 0.45 && Math.abs(Math.sin(u * 0.5) * 5 - v * 0.6) < 4;
        let col = fl ? '#4a1420' : (X + Y) % 7 === 0 ? '#2e0a12' : '#360c16';
        if (Y > 232) col = (Y % 22 === 0 || X % 48 === 0) ? '#140804' : (X % 48 < 3 || Y % 22 === 1) ? '#5c3418' : '#2c1608';
        px(x, col, X, Y);
      }
      shade(x, 512, H, '#08020a', 0, 60);
      // Verfall: abgeplatzter Putz mit Ziegeln dahinter, Wasserflecken, Risse
      for (let k = 0; k < 7; k++) {
        const cx = ri(10, 500), cy = ri(30, 220), rx = ri(8, 22), ry = ri(6, 16);
        for (let y = -ry; y <= ry; y++) for (let X = -rx; X <= rx; X++) {
          const q = (X * X) / (rx * rx) + (y * y) / (ry * ry) + (rand() - 0.5) * 0.25;
          if (q > 1) continue;
          const bx = cx + X, by = cy + y, brick = by % 8 === 0 || (bx + (Math.floor(by / 8) % 2) * 8) % 16 === 0;
          px(x, q > 0.85 ? '#1c0c08' : brick ? '#2c140c' : (bx + by) % 5 ? '#6c3c28' : '#7c4830', (bx + 512) % 512, by);
        }
      }
      WINS.forEach(([wx, wy, ww, wh]) => { for (let k = 0; k < ww; k += 3) for (let y = wy + wh; y < wy + wh + ri(20, 60); y++) if (bay(wx + k, y) < 0.5) px(x, '#1c060c', wx + k + ri(-1, 1), y); }); // Wasserflecken
      const crack = (X, Y, n, dir) => { for (let i = 0; i < n; i++) { px(x, '#08020a', X, Y); px(x, '#5c2430', X + 1, Y); Y++; X += dir * (rand() < 0.6 ? 1 : 0) + (rand() < 0.15 ? -dir : 0); if (rand() < 0.08) crackBranch(X, Y, ri(5, 14), -dir); } };
      const crackBranch = (X, Y, n, dir) => { for (let i = 0; i < n; i++) { px(x, '#08020a', X, Y); Y++; X += dir * (rand() < 0.5 ? 1 : 0); } };
      [[30, 4, 90, 1], [130, 0, 120, 1], [250, 10, 70, -1], [380, 0, 140, 1], [470, 30, 80, -1], [190, 150, 60, 1], [420, 170, 50, -1]].forEach(([X, Y, n, d]) => crack(X, Y, n, d));
      // Wandschilde mit gekreuzten Schwertern zwischen den Fenstern, ein schiefes Ahnenporträt
      const shield = (cx, cy, c1, c2) => {
        for (let k = -26; k <= 26; k++) { const a = k / 26; px(x, '#9c9ca8', cx + Math.round(a * 22), cy + Math.round(a * 22) - 4, 2, 2); px(x, '#9c9ca8', cx - Math.round(a * 22), cy + Math.round(a * 22) - 4, 2, 2); }
        [[-22, 18], [22, 18]].forEach(([dx, dy]) => { px(x, '#c89020', cx + dx - 3, cy + dy - 6, 7, 2); px(x, '#3c2410', cx + dx - 1, cy + dy - 4, 3, 6); });
        for (let y = -14; y <= 16; y++) { const hw = y < 4 ? 12 : Math.round(12 * (1 - (y - 4) / 13)); for (let X = -hw; X <= hw; X++) px(x, Math.abs(X) === hw || y === -14 ? '#c89020' : (X < 0) === (y < 1) ? c1 : c2, cx + X, cy + y); }
        px(x, '#fce0a8', cx - 2, cy - 2, 4, 4); px(x, '#140c08', cx - 1, cy - 1, 2, 2);
      };
      shield(200, 172, '#a80020', '#24206c'); shield(456, 172, '#24206c', '#c89020'); // Wappenschilde unter den Ahnenbildern
      // deckenhohe Spitzbogenfenster: steinerne Laibung, Mittelpfosten, Querriegel, Bleiruten, zerbrochene Scheiben
      WINS.forEach(([wx, wy, ww, wh], wi) => {
        for (let Y = wy - 8; Y < wy + wh + 6; Y++) for (let X = wx - 8; X < wx + ww + 8; X++) {
          const inside = inWin(X, Y, [wx, wy, ww, wh]), near = inWin(X - 6, Y, [wx, wy, ww, wh]) || inWin(X + 6, Y, [wx, wy, ww, wh]) || inWin(X, Y + 7, [wx, wy, ww, wh]);
          if (!inside && near) { px(x, (Y >> 3) % 2 ? '#5c5468' : '#6c6478', X, Y); continue; } // Laibung
          if (!inside) continue;
          const lx = X - wx, ly = Y - wy, mull = Math.abs(lx - ww / 2) < 2, tran = ly > 40 && (ly - 40) % 44 < 2;
          const lead = (lx % 9 === 0) || (ly % 11 === 0), broken = (wi === 0 && ly > 120 && ly < 150 && lx > 8 && lx < 22 && (lx * 7 + ly * 3) % 11 > 2) || (wi === 1 && ly > 60 && ly < 80 && lx > 34 && lx < 50 && (lx + ly) % 5 > 1);
          if (mull || tran) px(x, mull ? '#4c4458' : '#3c3448', X, Y);
          else if (broken) x.clearRect(X, Y, 1, 1);                  // Loch: Sturm direkt dahinter
          else if (lead) px(x, '#0c0a14', X, Y);
          else x.clearRect(X, Y, 1, 1);                              // klares Glas: Himmel, Regen und Blitze scheinen durch
        }
        // Scherben auf dem Sims
        for (let k = 0; k < 6; k++) px(x, '#a4b4e4', wx + ri(2, ww - 4), wy + wh + ri(-1, 1));
      });
      // schwere Samtvorhänge links und rechts jedes Fensters: Falten, Raffhalter mit Quaste, zerfetzte Säume
      WINS.forEach(([wx, wy, ww, wh]) => {
        px(x, '#c89020', wx - 30, 12, ww + 60, 3); px(x, '#fce0a8', wx - 30, 12, ww + 60, 1); // Vorhangstange
        [[wx - 30, 1], [wx + ww + 4, -1]].forEach(([cx0, side]) => {
          for (let Y = 15; Y < 300; Y++) {
            const tie = 150, gather = Y < tie ? 1 - (Y - 15) / (tie - 15) * 0.55 : 0.45 + (Y - tie) / (300 - tie) * 0.65;
            const w = Math.round(26 * gather), x0 = side > 0 ? cx0 : cx0 + 26 - w;
            const torn = Y > 270 && hn(Math.floor((Y - 270) / 3), cx0, 9) > 0.5 && Y > 270 + hn(cx0 + Y, 3, 4) * 30;
            for (let X = 0; X < w; X++) {
              if (torn && X % 5 < 2) continue;
              const f = Math.sin((X / Math.max(1, w)) * Math.PI * 4 + Y * 0.01) * 0.5 + 0.5;
              px(x, f > 0.8 ? '#a01c28' : f > 0.45 ? '#7c1018' : f > 0.15 ? '#560a12' : '#30040a', x0 + X, Y);
            }
            if (Y > tie - 3 && Y < tie + 3) { px(x, '#c89020', x0 - 1, Y, w + 2, 1); }
          }
          const tx = side > 0 ? cx0 + 14 : cx0 + 12; // Quaste
          px(x, '#f8b800', tx, 153, 3, 4); for (let k = 0; k < 9; k++) px(x, k % 2 ? '#c89020' : '#fce0a8', tx - 1 + (k % 5), 157 + Math.floor(k / 2), 1, 3);
        });
        for (let k = 0; k < 14; k++) px(x, 'rgba(210,210,230,0.35)', wx - 30 + k, 15 + Math.floor(k * 0.8), 1, 1); // Spinnweben in der Ecke
      });
      // Deckengesims mit Riss
      px(x, '#2c2434', 0, 0, 512, 10); px(x, '#5c5468', 0, 8, 512, 2); for (let X = 0; X < 512; X += 8) px(x, '#3c3448', X, 3, 4, 4);
      add('wall', c, 0.5, { vtile: true });
    } else if (theme === 'library') { // Bibliothek: deckenhohe Bücherwände, Galerie mit Balustrade, Rollleitern, hohes Bogenfenster mit Sturm dahinter
      const sky = C(640, 208), xs = sky.getContext('2d');
      smooth(xs, 640, 208, ['#000000', '#04010c', '#0a0418', '#120826', '#1c0c34', '#26103e', '#301446', '#3a184c', '#421c50']);
      for (let i = 0; i < 60; i++) px(xs, rand() < 0.3 ? '#fcfcfc' : '#7c7c9c', ri(0, 639), ri(0, 90));
      add('sky', sky, 0, { wrap: false });
      const cl = C(512, 208), xc = cl.getContext('2d');
      for (let i = 0; i < 30; i++) {
        const cx = ri(0, 511), cy = ri(10, 150), rx = ri(16, 40), ry = ri(6, 16);
        for (let y = -ry; y <= ry; y++) for (let X = -rx; X <= rx; X++) {
          const q = (X * X) / (rx * rx) + (y * y) / (ry * ry);
          if (q > 1 || bay(X + cx, y + cy) < (q - 0.65) * 3) continue;
          px(xc, y > ry * 0.4 ? '#1c0c30' : '#0c0618', (cx + X + 512) % 512, cy + y);
        }
      }
      add('clouds', cl, 0.06, { drift: 0.25 });
      L.push({ name: 'rainOut', custom: drawRainOut, par: 0, c: C(1, 1) });
      const H = 320, c = C(512, H), x = c.getContext('2d');
      const [wx, wy, ww, wh] = LIB_WIN, wr = ww / 2;
      const inWin = (X, Y) => { if (X < wx || X >= wx + ww || Y < wy || Y >= wy + wh) return false; if (Y >= wy + wr) return true; return (X + 0.5 - wx - wr) ** 2 + (Y + 0.5 - wy - wr) ** 2 <= wr * wr; };
      const BOOK = [['#3c0810', '#6c1420', '#9c3034'], ['#0c1034', '#1c2860', '#34488c'], ['#08240e', '#14461e', '#2c6c38'], ['#2c1806', '#5c3410', '#86562a'], ['#2c0830', '#541858', '#7c3484'], ['#342c06', '#5c4c10', '#8c7424'], ['#140e10', '#2a2024', '#463a40']];
      const G1 = '#b8882c', G2 = '#fce0a8';
      px(x, '#120804', 0, 0, 512, H);
      const board = (x0, x1, y) => { px(x, '#1c0c04', x0, y - 1, x1 - x0, 1); px(x, '#9c6834', x0, y, x1 - x0, 1); px(x, '#5c3414', x0, y + 1, x1 - x0, 2); px(x, '#140802', x0, y + 3, x1 - x0, 1); };
      const curio = (X, yb) => { // Kuriositäten zwischen den Büchern: Schädel, Sanduhr, Trankflasche, Kerzenstumpf
        const k = ri(0, 3);
        if (k === 0) { px(x, '#c8c4b4', X + 1, yb - 5, 5, 4); px(x, '#ece8d8', X + 1, yb - 5, 5, 1); px(x, '#140c08', X + 2, yb - 3, 1, 1); px(x, '#140c08', X + 4, yb - 3, 1, 1); px(x, '#9c9888', X + 2, yb - 1, 3, 1); }
        else if (k === 1) { px(x, '#5c3414', X + 1, yb - 9, 1, 9); px(x, '#5c3414', X + 5, yb - 9, 1, 9); px(x, G1, X, yb - 10, 7, 1); px(x, G1, X, yb - 1, 7, 1); px(x, '#8c9cc8', X + 2, yb - 9, 3, 3); px(x, '#8c9cc8', X + 3, yb - 6, 1, 1); px(x, '#8c9cc8', X + 2, yb - 5, 3, 3); px(x, '#e8c070', X + 2, yb - 4, 3, 2); px(x, '#e8c070', X + 3, yb - 7, 1, 2); }
        else if (k === 2) { px(x, '#14482c', X + 1, yb - 6, 5, 6); px(x, '#3c9c6c', X + 2, yb - 5, 1, 3); px(x, '#6cd89c', X + 2, yb - 5, 1, 1); px(x, '#5c3414', X + 2, yb - 8, 3, 2); }
        else { px(x, '#3c2c1c', X, yb - 1, 7, 1); px(x, '#d8d0b8', X + 2, yb - 6, 3, 5); px(x, '#a89c84', X + 4, yb - 6, 1, 5); px(x, '#e8e0c8', X + 2, yb - 7, 1, 1); }
      };
      const shelfRow = (x0, x1, y0, y1) => { // eine Regalreihe: Buchrücken verschiedener Höhe mit Goldprägung, mal schräg angelehnt, mal gestapelt, ab und zu eine Lücke
        let X = x0 + ri(0, 2);
        while (X < x1 - 3) {
          const r = rand();
          if (r < 0.06 && x1 - X > 13) { // liegender Stapel
            let yy = y1;
            for (let k = 0, n = ri(2, 4); k < n; k++) { const bw = ri(8, 11), [d, m, l] = BOOK[ri(0, BOOK.length - 1)]; px(x, m, X + (k & 1), yy - 2, bw, 2); px(x, l, X + (k & 1), yy - 2, bw, 1); px(x, '#d8ccb0', X + (k & 1) + bw - 1, yy - 2, 1, 2); px(x, d, X + (k & 1), yy - 1, 1, 1); yy -= 2; }
            X += 13; continue;
          }
          if (r < 0.1 && x1 - X > 9) { curio(X, y1); X += 8; continue; }
          if (r < 0.15) { // Lücke: hier ist ein Buch davongeflogen – nur der Staubrand bleibt
            const gw = ri(3, 6); for (let k = 0; k < gw; k++) px(x, '#2c1a10', X + k, y1 - 1, 1, 1); X += gw; continue;
          }
          const bw = ri(3, 5), bh = Math.min(y1 - y0 - 1, ri(9, 15)), [d, m, l] = BOOK[ri(0, BOOK.length - 1)];
          const lean = r > 0.94 && X > x0 + 5;
          for (let yy = 0; yy < bh; yy++) {
            const sx = X + (lean ? Math.floor((bh - yy) / 4) : 0), Y = y1 - bh + yy;
            px(x, m, sx, Y, bw, 1); px(x, l, sx, Y, 1, 1); px(x, d, sx + bw - 1, Y, 1, 1);
          }
          if (!lean) {
            px(x, d, X, y1 - bh, bw, 1);
            if (rand() < 0.75) { px(x, G1, X, y1 - bh + 2, bw, 1); px(x, G1, X, y1 - 3, bw, 1); } // Goldbünde
            if (bh > 11 && rand() < 0.5) { px(x, '#140808', X + 1, y1 - bh + 4, bw - 2, 3); px(x, G2, X + 1, y1 - bh + 5, bw - 2, 1); } // Titelschild
          }
          X += bw + (lean ? 3 : 0);
        }
        for (let X2 = x0; X2 < x1; X2++) for (let k = 0; k < 4; k++) if (bay(X2, y0 + k) < (4 - k) / 5) px(x, '#060201', X2, y0 + k); // Schatten unter dem Brett
      };
      // Buchten zwischen den Pilastern (alle 128 px), oben über der Galerie und unten
      for (let b = 0; b < 4; b++) {
        const x0 = b * 128 + 10, x1 = b * 128 + 118;
        for (let yb = 14; yb < 134; yb += 20) { if (b !== 2) { shelfRow(x0, x1, yb + 4, yb + 19); board(x0, x1, yb); } }
        for (let yb = 158; yb < H; yb += 20) { shelfRow(x0, x1, yb + 4, Math.min(H - 1, yb + 19)); board(x0, x1, yb); }
      }
      // mittlere Bucht oben: hohes Bogenfenster, links und rechts schwere grüne Samtvorhänge
      for (let Y = 14; Y < 134; Y++) for (let X = 266; X < 374; X++) px(x, (X + Y) % 9 ? '#1a0e06' : '#22140a', X, Y); // Holzvertäfelung
      for (let Y = wy - 6; Y < wy + wh + 4; Y++) for (let X = wx - 6; X < wx + ww + 6; X++) {
        const inside = inWin(X, Y), near = inWin(X - 5, Y) || inWin(X + 5, Y) || inWin(X, Y + 5) || inWin(X, Y - 5);
        if (!inside && near) { px(x, ((Y >> 3) + (X >> 4)) % 2 ? '#5c5468' : '#6c6478', X, Y); continue; } // Steinlaibung
        if (!inside) continue;
        const lx = X - wx, ly = Y - wy, mull = Math.abs(lx - ww / 2 + 0.5) < 1.5, tran = ly > wr + 30 && ly < wr + 33;
        const lead = (lx + ly) % 8 === 0 || (lx - ly + 800) % 8 === 0;
        if (mull || tran) px(x, '#4c4458', X, Y);
        else if (lead) px(x, '#100c18', X, Y);
        else x.clearRect(X, Y, 1, 1); // klares Glas: Himmel, Regen und Blitze scheinen durch
      }
      px(x, '#7c7488', wx - 8, wy + wh + 2, ww + 16, 2); px(x, '#3c3448', wx - 8, wy + wh + 4, ww + 16, 2); // Sohlbank
      [[266, 1], [350, -1]].forEach(([cx0, side]) => { // Vorhänge mit Raffhalter
        for (let Y = 16; Y < 132; Y++) {
          const tie = 92, g = Y < tie ? 1 - (Y - 16) / (tie - 16) * 0.5 : 0.5 + (Y - tie) / 60 * 0.4, w = Math.round(24 * g), X0 = side > 0 ? cx0 : cx0 + 24 - w;
          for (let X = 0; X < w; X++) { const f = Math.sin((X / Math.max(1, w)) * Math.PI * 3 + Y * 0.015) * 0.5 + 0.5; px(x, f > 0.78 ? '#2c6c3c' : f > 0.42 ? '#1c4c28' : f > 0.14 ? '#10341a' : '#08200e', X0 + X, Y); }
          if (Y > tie - 2 && Y < tie + 2) px(x, G1, X0 - 1, Y, w + 2, 1);
        }
        px(x, '#f8b800', side > 0 ? cx0 + 11 : cx0 + 11, 94, 3, 3); for (let k = 0; k < 7; k++) px(x, k % 2 ? G1 : G2, cx0 + 10 + (k % 4), 97 + (k >> 1), 1, 3);
      });
      px(x, G1, 262, 14, 116, 2); px(x, G2, 262, 14, 116, 1); // Vorhangstange
      // geschnitzte Pilaster mit Kanneluren
      const PT = ['#140802', '#2c1406', '#4c2810', '#6c3c18', '#8c5c2c', '#a0703c', '#8c5c2c', '#6c3c18', '#4c2810', '#2c1406'];
      for (let b = 0; b <= 4; b++) for (let X = -10; X < 10; X++) {
        const XX = b * 128 + X; if (XX < 0 || XX >= 512) continue;
        const col = PT[(X + 10) >> 1], flute = (X + 10) % 5 === 2;
        px(x, flute ? '#2c1406' : col, XX, 0, 1, H);
        px(x, (X + 10) % 5 === 3 ? '#b8844c' : col, XX, 16, 1, 6); px(x, '#140802', XX, 22, 1, 1); // Kapitell
      }
      // Galerie: Handlauf, Balustersäulen, geschnitzte Brüstung
      px(x, '#3c1c08', 0, 128, 512, 3); px(x, '#b07c44', 0, 128, 512, 1); px(x, '#140802', 0, 131, 512, 1);
      for (let X = 2; X < 512; X += 7) { px(x, '#3c1c08', X, 132, 3, 12); px(x, '#7c4c20', X + 1, 133, 1, 10); px(x, '#8c5c2c', X, 136, 3, 3); px(x, '#a0703c', X + 1, 137, 1, 1); }
      px(x, '#3c1c08', 0, 144, 512, 2); px(x, '#2c1406', 0, 146, 512, 12); px(x, '#b07c44', 0, 146, 512, 1); px(x, G1, 0, 148, 512, 1); px(x, '#6c3c18', 0, 156, 512, 1); px(x, '#0c0402', 0, 157, 512, 1);
      for (let X = 8; X < 512; X += 32) { px(x, '#4c2810', X, 150, 22, 5); px(x, '#1c0c04', X + 1, 151, 20, 3); px(x, G1, X + 10, 152, 2, 1); } // Füllungen mit Goldknopf
      // Deckengesims mit Zahnschnitt
      px(x, '#1c0c04', 0, 0, 512, 14); px(x, '#3c2010', 0, 0, 512, 3); for (let X = 0; X < 512; X += 6) px(x, '#5c3418', X, 5, 4, 4); px(x, '#8c5c2c', 0, 10, 512, 1); px(x, '#5c3414', 0, 11, 512, 2); px(x, '#0a0402', 0, 13, 512, 1);
      // Messingschienen und Rollleitern
      px(x, G1, 0, 18, 512, 1); px(x, G1, 0, 162, 512, 1);
      const ladder = (xt, yt, xb, yb) => {
        const n = yb - yt;
        for (let i = 0; i <= n; i++) { const X = Math.round(xt + (xb - xt) * i / n), Y = yt + i; px(x, '#5c3414', X, Y, 2, 1); px(x, '#a8743c', X, Y, 1, 1); px(x, '#5c3414', X + 10, Y, 2, 1); px(x, '#a8743c', X + 10, Y, 1, 1); if (i % 8 === 4) px(x, '#7c4c20', X + 2, Y, 8, 1); }
        px(x, G2, xt, yt - 1, 3, 1); px(x, G2, xt + 10, yt - 1, 3, 1); // Haken an der Schiene
      };
      ladder(60, 19, 74, 127); ladder(424, 163, 440, 318);
      // Spinnweben in den oberen Ecken einiger Buchten
      [[10, 14, 1], [246, 14, -1], [394, 158, 1], [118, 158, -1]].forEach(([X, Y, d]) => { for (let k = 0; k < 12; k++) { px(x, 'rgba(210,210,230,0.32)', X + d * k, Y + 1, 1, 1); px(x, 'rgba(210,210,230,0.32)', X, Y + 1 + k, 1, 1); px(x, 'rgba(210,210,230,0.28)', X + d * k, Y + 12 - k, 1, 1); } });
      shade(x, 512, H, '#060201', 0, 50);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(8,3,10,0.6)'; x.fillRect(0, 0, 512, H); x.globalCompositeOperation = 'source-over'; // Hintergrund zurücknehmen, damit die begehbaren Regale vorn klar lesbar bleiben
      add('wall', c, 0.5, { vtile: true });
      L.push({ name: 'books', custom: drawBookFlock, par: 0.7, c: C(1, 1) }); // in der Ferne kreisen Bücherschwärme
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
      // Bergketten im Blutmondlicht: hinten hohe, verschneite Gipfel, davor dunklere Felsgrate mit Tannen, Nebel in den Tälern,
      // ganz vorn ein Tannenwald. Grate per Mittelpunktverschiebung (nahtlos über 512 px); die zum Mond (rechts oben) gewandten Flanken hell
      const ridge = (base, amp, rough, lo, hi) => {
        const h = new Float32Array(513); h[0] = h[512] = base;
        for (let s = 256; s >= 1; s >>= 1) for (let i = s; i < 512; i += s * 2) h[i] = (h[i - s] + h[i + s]) / 2 + (rand() - 0.5) * amp * Math.pow(s / 256, rough);
        for (let i = 0; i <= 512; i++) h[i] = Math.max(lo, Math.min(hi, h[i]));
        return h;
      };
      const peaks = (n, yTop, yBot, sMin, sMax, jag) => { // einzelne Gipfel (Kegel, leicht schief) vereinigt, darüber fraktal gezackte Grate
        const h = new Float32Array(513).fill(yBot);
        for (let i = 0; i < n; i++) {
          const cx = ri(0, 511), top = ri(yTop, yBot - 24), sl = sMin + rand() * (sMax - sMin), asym = 0.7 + rand() * 0.6;
          for (let X = 0; X <= 512; X++) for (const o of [-512, 0, 512]) { const dx = X - cx - o, y = top + Math.abs(dx) * (dx < 0 ? sl * asym : sl); if (y < h[X]) h[X] = y; }
        }
        const nz = ridge(0, jag, 0.8, -999, 999);
        for (let X = 0; X <= 512; X++) h[X] += nz[X];
        return h;
      };
      const range = (cv, h, P, snowLine, mist) => {
        const g = cv.getContext('2d'), at = (X) => h[((X % 512) + 512) % 512];
        for (let X = 0; X < 512; X++) {
          const top = Math.round(h[X]), sl = at(X + 5) - at(X - 5), face = sl > 2 ? 2 : sl < -2 ? 0 : 1; // geglättete Hangneigung: 2 = zum Mond
          const snowD = snowLine && top < snowLine ? (snowLine - top) * 0.6 + hn(X >> 1, 1, 5) * 5 : 0; // Schnee nur auf den höchsten Gipfeln
          const band = 12 + hn(X >> 2, 3, 9) * 10;
          for (let Y = Math.max(0, top); Y < 208; Y++) {
            const d = Y - top, f = d < band || (d < band + 10 && bay(X, Y) < 1 - (d - band) / 10) ? face : 1; // Licht-/Schattenseite nahe am Grat
            const deep = Math.min(1, d / 90);
            let c = deep > 0.45 && bay(X, Y) < (deep - 0.45) * 2 ? P.deep : P.face[f];
            if (snowD) { if (d < snowD) c = P.snow[face]; else if (d < snowD + 2 && bay(X, Y) < 0.5) c = P.snow[0]; }
            if (d === 0) c = face === 2 ? P.rimLit : P.rim;
            if (mist && Y > mist.from && bay(X, Y) < Math.min(0.85, (Y - mist.from) / mist.len)) c = mist.col;
            px(g, c, X, Y);
          }
        }
      };
      const pk = C(512, 208), hp = peaks(6, 38, 150, 0.6, 1.2, 22);
      range(pk, hp, { face: ['#28163e', '#382252', '#52366c'], deep: '#2c1844', rim: '#5c4478', rimLit: '#b49cd4', snow: ['#6c5c8c', '#8c7cac', '#d0c0e8'] }, 84, { from: 120, len: 56, col: '#2c1642' });
      add('peaks', pk, 0.06);
      const mt = C(512, 208), mx = mt.getContext('2d'), hm = peaks(8, 92, 176, 0.45, 0.85, 14);
      range(mt, hm, { face: ['#10061a', '#1a0a26', '#2a1238'], deep: '#14081e', rim: '#30163e', rimLit: '#6c2a58' }, 0, { from: 162, len: 46, col: '#2a1238' });
      for (let i = 0; i < 80; i++) { // Tannen auf den unteren Hängen
        const X = ri(0, 511), base = Math.max(Math.round(hm[X]) + 16, ri(150, 180)), hgt = ri(5, 11);
        for (let r = 0; r < hgt; r++) { const w = Math.max(1, Math.round((r / hgt) * 4)); px(mx, '#08020e', X - (w >> 1), base - hgt + r, w, 1); }
        px(mx, '#08020e', X, base, 1, 2);
      }
      add('mountains', mt, 0.12);
      const fo = C(512, 208), fx2 = fo.getContext('2d');
      for (let i = 0; i < 95; i++) { // dunkler Tannenwald am Fuß der Berge, die Spitzen im Mondlicht
        const X = ri(0, 511), base = ri(178, 202), hgt = ri(14, 32);
        for (let r = 0; r < hgt; r++) { const w = Math.max(1, Math.round(r / 3) - (r % 5 === 4 ? 1 : 0)); px(fx2, '#06020a', X - (w >> 1), base - hgt + r, w, 1); if (r > 1) px(fx2, '#2c1236', X + (w >> 1), base - hgt + r, 1, 1); }
        px(fx2, '#06020a', X, base, 1, 208 - base);
      }
      px(fx2, '#06020a', 0, 198, 512, 10);
      for (let Y = 176; Y < 208; Y++) for (let X = 0; X < 512; X++) if (bay(X, Y) < (Y - 176) / 64 * 0.65 && hn(X >> 3, Y >> 2, 21) > 0.3) px(fx2, '#2a1438', X, Y); // Bodennebel
      add('forest', fo, 0.18);
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
      // knorrige, tote Bäume: sich verjüngende, verzweigte Äste mit Zweigen, Wurzeln und Moosbärten; die zum Mond gewandte
      // Kante leuchtet rötlich-violett, auf den Ästen sitzen eine Eule mit glühenden Augen und ein Rabe
      const tcv = C(512, 208), tcx = tcv.getContext('2d'), perch = [], moss = [], TC = '#030106';
      const blob = (X, Y, r) => { const R = Math.ceil(r); for (let yy = -R; yy <= R; yy++) for (let xx = -R; xx <= R; xx++) if (xx * xx + yy * yy <= r * r + 0.35) px(tcx, TC, Math.round(X + xx), Math.round(Y + yy)); };
      const limb = (X, Y, a, len, th, depth) => {
        for (let i = 0; i < len; i++) {
          blob(X, Y, Math.max(0.5, th * (1 - i / len * 0.45) / 2));
          X += Math.cos(a); Y += Math.sin(a); a += (rand() - 0.5) * 0.18;
          if (a > -0.15) a -= 0.04; else if (a < -Math.PI + 0.15) a += 0.04; // Äste hängen nicht nach unten
          if (depth === 1 && i === Math.floor(len * 0.55) && Math.abs(Math.sin(a)) < 0.6) perch.push([X, Y]);
          if (depth === 2 && i === Math.floor(len * 0.5)) moss.push([X, Y]);
        }
        if (depth > 0) {
          const n = 2 + (depth > 1 && rand() < 0.5 ? 1 : 0);
          for (let k = 0; k < n; k++) limb(X, Y, a + (k - (n - 1) / 2) * (0.55 + rand() * 0.35), len * (0.6 + rand() * 0.15), th * 0.6, depth - 1);
        } else for (let k = 0; k < 3; k++) { // Zweige
          let x1 = X, y1 = Y, a1 = a + (rand() - 0.5) * 1.8;
          for (let i = ri(3, 7); i > 0; i--) { px(tcx, TC, Math.round(x1), Math.round(y1)); x1 += Math.cos(a1); y1 += Math.sin(a1); a1 += (rand() - 0.5) * 0.6; }
        }
      };
      const tree = (X0, len, lean) => {
        for (const s of [-1, 1]) for (let k = 0; k < 2; k++) { let rx = X0 + s * 2, ry = 176 + k * 2; for (let i = ri(8, 15); i > 0; i--) { blob(rx, ry, i > 6 ? 1.5 : 0.8); rx += s * (0.8 + rand() * 0.5); ry += rand() < 0.35 ? 1 : 0; } } // Wurzeln
        limb(X0, 180, -Math.PI / 2 + lean, len, 10, 3);
      };
      tree(70, 44, -0.08); tree(330, 50, 0.1); tree(460, 38, -0.04);
      const tid = tcx.getImageData(0, 0, 512, 208), td = tid.data, sol = (X, Y) => X >= 0 && X < 512 && Y >= 0 && Y < 208 && td[(Y * 512 + X) * 4 + 3] > 0;
      const lit = new Uint8ClampedArray(td);
      for (let Y = 0; Y < 208; Y++) for (let X = 0; X < 512; X++) {
        if (!sol(X, Y)) continue;
        let c = null;
        if (!sol(X + 1, Y) || (!sol(X, Y - 1) && !sol(X + 1, Y - 1))) c = [104, 44, 76]; // Kante zum Mond
        else if (!sol(X + 2, Y) && hn(X, Y >> 1, 3) > 0.35) c = [48, 20, 46];          // gedämpfte zweite Lichtreihe
        else if (sol(X - 2, Y) && sol(X + 2, Y) && hn(X >> 1, Y >> 2, 11) > 0.8) c = [20, 9, 24]; // Borke
        if (c) { const i = (Y * 512 + X) * 4; lit[i] = c[0]; lit[i + 1] = c[1]; lit[i + 2] = c[2]; }
      }
      td.set(lit); tcx.putImageData(tid, 0, 0);
      moss.forEach(([X, Y]) => { for (let k = -2; k <= 2; k++) { const len = ri(4, 12); for (let y = 1; y < len; y++) if (bay(X + k, Y + y) < 0.6) px(tcx, '#1c0e24', Math.round(X + k), Math.round(Y + y)); } }); // Moosbärte
      if (perch.length > 1) { const X = Math.round(perch[1][0]), Y = Math.round(perch[1][1]) - 1; // Eule
        px(tcx, TC, X - 2, Y - 7, 5, 7); px(tcx, TC, X - 2, Y - 8, 1, 1); px(tcx, TC, X + 2, Y - 8, 1, 1); px(tcx, '#5c2448', X + 2, Y - 6, 1, 5);
        px(tcx, '#fcd040', X - 1, Y - 6, 1, 1); px(tcx, '#fcd040', X + 1, Y - 6, 1, 1); }
      if (perch.length > 4) { const X = Math.round(perch[4][0]), Y = Math.round(perch[4][1]) - 1; // Rabe
        px(tcx, TC, X - 3, Y - 4, 6, 3); px(tcx, TC, X + 2, Y - 6, 2, 2); px(tcx, '#5c2448', X + 4, Y - 5, 1, 1); px(tcx, TC, X - 5, Y - 3, 2, 1); px(tcx, TC, X - 1, Y - 1, 1, 1); }
      x3.drawImage(tcv, 0, 0);
      for (let i = 0; i < 512; i += 6) {
        px(x3, '#2a2636', i, 146, 2, 30); px(x3, '#4c4458', i, 146, 1, 30);
        px(x3, '#5c5468', i, 141, 2, 1); px(x3, '#4c4458', i - 1, 143, 4, 1); px(x3, '#4c4458', i, 142, 2, 3);
      }
      px(x3, '#2a2636', 0, 152, 512, 2); px(x3, '#2a2636', 0, 168, 512, 2); px(x3, '#4c4458', 0, 152, 512, 1);
      [[120, 18], [250, 14], [395, 16], [20, 12]].forEach(([gx, gh]) => { // Grabsteine
        px(x3, '#3c3848', gx, 176 - gh, 10, gh); px(x3, '#3c3848', gx + 1, 175 - gh, 8, 1); px(x3, '#5c5868', gx, 176 - gh, 1, gh); px(x3, '#5c5868', gx + 1, 175 - gh, 7, 1);
        px(x3, '#24202c', gx + 4, 179 - gh, 2, 8); px(x3, '#24202c', gx + 2, 181 - gh, 6, 2);
      });
      L.push({ name: 'fog7', custom: drawFog7, par: 0, c: C(1, 1) }); // Mode-7-Bodennebel zwischen Burg und Bäumen
      add('near', nr, 0.6);
    } else if (theme === 'hall' || theme === 'throne') {
      const c = C(512, 208), x = c.getContext('2d');
      if (theme === 'hall') wallBricks(x, 512, 208, ['#5c2414', '#3c1008', '#140000']);
      else { // Thronsaal: polierter schwarzroter Marmor in großen Quadern mit Adern, unten geschnitzte Vertäfelung mit Goldleiste
        for (let Y = 0; Y < 208; Y++) for (let X = 0; X < 512; X++) {
          const row = Math.floor(Y / 26), bx = (X + (row % 2) * 24) % 48, by = Y % 26, n = hn(X >> 1, Y >> 1, 41);
          let c = Math.abs(Math.sin(X * 0.09 + Y * 0.21 + hn(X >> 4, Y >> 4, 7) * 6)) < 0.05 ? '#4c1c2c' : n > 0.72 ? '#2c0814' : '#22060f';
          if (bx === 0 || by === 0) c = '#0c0206'; else if (bx === 1 || by === 1) c = '#3c1020';
          px(x, c, X, Y);
        }
        for (let Y = 152; Y < 208; Y++) for (let X = 0; X < 512; X++) px(x, Y < 154 ? '#c89020' : (X % 64 < 3 || Y % 28 === 0) ? '#1c0a04' : (X % 64 < 5 || Y % 28 === 1) ? '#6c3c18' : '#2c1408', X, Y);
      }
      const vtile = theme === 'hall';
      shade(x, 512, 208, '#000000', 0, 50);
      if (theme === 'hall') {
        [64, 320].forEach((wx, wi) => {
          archWindow(x, wx, 56, 32, 72, (X0, Y0, w, h, inside) => {
            for (let y = Y0; y < Y0 + h; y++) for (let X = X0; X < X0 + w; X++) { // Rautenscheiben, Bleiruten, bunter Randstreifen
              if (!inside(X, y)) continue;
              const edge = !inside(X - 3, y) || !inside(X + 3, y) || !inside(X, y - 3), lead = (X - X0 + y) % 7 === 0 || (X - X0 - y + 700) % 7 === 0;
              px(x, edge ? (Math.floor((y + X) / 6) % 2 ? '#a80020' : '#c89018') : lead ? '#06061a' : (y - Y0) / h > bay(X, y) ? '#101878' : '#060a3c', X, y);
            }
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
        // Thronsaal im ruhigen Rhythmus: vier gleich breite Joche zwischen Bündelpfeilern – Spitzbogenfenster, Ahnenbild (eigene
        // Ebene), Spitzbogenfenster, große Rosette; über jedem Joch eine Samt-Draperie
        [59, 315].forEach((wx, wi) => archWindow(x, wx, 40, 32, 92, (X0, Y0, w, h, inside) => {
          for (let y = Y0; y < Y0 + h; y++) for (let X = X0; X < X0 + w; X++) {
            if (!inside(X, y)) continue;
            const lead = (X - X0) % 8 === 0 || (y - Y0) % 12 === 0, cell = Math.floor((X - X0) / 8) + Math.floor((y - Y0) / 12);
            px(x, lead ? '#140810' : (wi ? ['#0058f8', '#6844fc', '#00a8a8', '#a80020'] : ['#a80020', '#f8b800', '#d82800', '#6844fc'])[cell % 4], X, y);
          }
        }));
        const { x: rx, y: ry, r: rr } = ROSE; // Rosette: Steinrahmen hier, das Glas dreht sich als eigene Ebene (drawRose)
        for (let y = -rr - 4; y <= rr + 4; y++) for (let X = -rr - 4; X <= rr + 4; X++) {
          const d = Math.hypot(X, y);
          if (d > rr && d <= rr + 4) px(x, d > rr + 3 ? '#4c4c58' : '#8c8c98', rx + X, ry + y);
        }
        roseGlass(x, rx, ry, rr);
        [59, 315].forEach(wx => lightShaft(x, wx, 132, 32, 50, '#a8287c', 0.2));
        [[22, 128], [150, 256], [278, 384], [406, 512]].forEach(([a, b]) => { for (let X = a; X < b; X++) { // schwere Samt-Draperie über jedem Joch
          const t = (X - a) / (b - a), sag = Math.round(8 + Math.sin(t * Math.PI) * 14);
          for (let Y = 0; Y < sag; Y++) px(x, (Y + Math.round(Math.sin(t * Math.PI * 4) * 2)) % 7 < 2 ? '#8c1020' : '#5c0814', X, Y);
          px(x, '#c89020', X, sag, 1, 1); if (X % 2 === 0) px(x, '#f8b800', X, sag + 1, 1, 2);
        } });
      }
      if (theme === 'throne') [0, 128, 256, 384].forEach(cx => goldPillar(x, cx, 22, 208)); else [0, 236, 488].forEach(cx => pillar(x, cx, 22, 208));
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
    } else if (theme === 'cave') { // Grotte: geschichtete Felswand mit nassen Adern, Tropfsteinsäulen, unterirdischer Wasserfall,
      // Leuchtkristalle mit Lichthöfen, Glühpilze und herabhängende Wurzeln – nahtlos in beide Richtungen gekachelt
      const vn = (X, Y, s, sd) => {
        const nx = 512 / s, ny = Math.round(208 / s), gx = X / s, gy = Y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
        const a = hn(x0 % nx, y0 % ny, sd), b = hn((x0 + 1) % nx, y0 % ny, sd), c = hn(x0 % nx, (y0 + 1) % ny, sd), d = hn((x0 + 1) % nx, (y0 + 1) % ny, sd);
        return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
      };
      const f = C(512, 208), x = f.getContext('2d');
      for (let Y = 0; Y < 208; Y++) for (let X = 0; X < 512; X++) {
        const n = vn(X, Y, 16, 61) * 0.55 + vn(X, Y, 8, 62) * 0.3 + vn(X, Y, 4, 63) * 0.15;
        const st = Math.sin(Y / 208 * Math.PI * 14 + vn(X, Y, 16, 64) * 5), v = n * 0.75 + st * 0.12; // Gesteinsschichten
        let c = v > 0.62 ? '#2a1a0e' : v > 0.5 ? '#20140a' : v > 0.38 ? '#170e07' : '#0e0804';
        if (Math.abs(st) < 0.05 && n > 0.48) c = '#142430'; // nasse, schimmernde Ader
        if (n > 0.68 && bay(X, Y) < (n - 0.68) * 3) c = '#3a2614'; // vorstehende Felsnasen
        px(x, c, X, Y);
      }
      [[80, 60, '#0c2a3a'], [300, 150, '#1c1038'], [440, 40, '#0c2a3a']].forEach(([gx, gy, col]) => ditherDisc(x, gx, gy, 2, 30, col, 0.5)); // ferne Kristallhöhlen
      add('far', f, 0.3, { vtile: true });
      const m = C(512, 208), xm = m.getContext('2d');
      [[40, 16], [170, 22], [380, 18]].forEach(([px0, w]) => { // Tropfsteinsäulen: oben und unten breit, in der Mitte eingeschnürt
        for (let Y = 0; Y < 208; Y++) {
          const waist = 0.55 + 0.45 * Math.abs(Math.cos(Y / 208 * Math.PI * 2)), ww = Math.round(w * waist + Math.sin(Y / 208 * Math.PI * 12) * 1.5), x0 = px0 - (ww >> 1);
          for (let X = 0; X < ww; X++) { const u = X / ww; px(xm, u < 0.14 ? '#4a3018' : u > 0.86 ? '#1c3c48' : u > 0.7 ? '#140c08' : (Y + X) % 9 === 0 ? '#2c1c0c' : '#22160c', x0 + X, Y); } // links Fackelschein, rechts Kristalllicht
          if (Y % 13 === 0) px(xm, '#3a2614', x0 + 2, Y, ww - 5, 1); // Tropfsteinringe
        }
      });
      add('pillars', m, 0.42, { vtile: true });
      const n = C(512, 208), x2 = n.getContext('2d');
      const spike = (sx, len, bw, down) => { for (let r = 0; r < len; r++) { const ww = Math.max(1, Math.round(bw * Math.pow(1 - r / len, 0.8))), y = down ? r : 207 - r, x0 = sx - (ww >> 1); px(x2, '#2a1a0c', x0, y, ww, 1); px(x2, '#5c3c1c', x0, y, 1, 1); if (ww > 3) px(x2, '#140a04', x0 + ww - 1, y, 1, 1); } if (down) px(x2, '#5cb4e4', sx, len, 1, 1); };
      for (let i = 0; i < 16; i++) spike(ri(4, 508), ri(14, 60), ri(6, 16), true);  // Tropfsteine von oben, mit Tropfen
      for (let i = 0; i < 10; i++) spike(ri(4, 508), ri(10, 34), ri(8, 18), false); // Stalagmiten
      for (let i = 0; i < 8; i++) { let rx = ri(0, 511); const len = ri(20, 60); for (let y = 0; y < len; y++) { px(x2, '#1c120a', rx, y); if (rand() < 0.3) rx += ri(-1, 1); if (rand() < 0.08) for (let k = 0, s = rand() < 0.5 ? 1 : -1; k < ri(3, 8); k++) px(x2, '#1c120a', rx + k * s, y + k); } } // Wurzeln
      const crystal = (kx, ky, v) => { // Kristallbüschel: kantige Prismen mit heller und dunkler Facette, spitz zulaufend, mit Lichthof
        const [col, hi, dk, glow] = v ? ['#8c3cfc', '#e0b8fc', '#4c1c9c', '#2c1450'] : ['#3cbcfc', '#c8f4fc', '#0c5c9c', '#14506c'];
        ditherDisc(x2, kx, ky - 8, 2, 24, glow, 0.45);
        for (const k of [-2, 2, -1, 1, 0]) {
          const h = ri(12, 22) - Math.abs(k) * 4, ang = k * 0.32, w = 5 - Math.abs(k);
          for (let r = 0; r < h; r++) {
            const ww = Math.max(1, Math.round(w * Math.min(1, (h - r) / 4))), X = Math.round(kx + k * 3 + Math.sin(ang) * r) - (ww >> 1), Y = ky - Math.round(Math.cos(ang) * r);
            px(x2, col, X, Y, ww, 1); px(x2, hi, X, Y, Math.max(1, ww >> 1), 1); if (ww > 2) px(x2, dk, X + ww - 1, Y, 1, 1);
          }
        }
      };
      [[60, 204, 0], [210, 124, 1], [330, 200, 0], [455, 94, 1], [140, 44, 0]].forEach(([kx, ky, v]) => crystal(kx, ky, v));
      for (let i = 0; i < 7; i++) { const mx = ri(10, 500), my = ri(150, 205); ditherDisc(x2, mx, my - 3, 1, 9, '#1c4c2c', 0.35); for (let k = 0; k < 3; k++) { const ox = mx + k * 4 - 4, h = 3 + (k % 2) * 2; px(x2, '#c8c0a8', ox + 1, my - h, 1, h); px(x2, '#58f898', ox, my - h - 2, 3, 2); px(x2, '#c8fcd8', ox + 1, my - h - 2, 1, 1); } } // Glühpilze
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
    } else if (theme === 'gallery') { // Marmorgalerie: alles im Säulengang wird live in Perspektive gezeichnet
      L.push({ name: 'colonnade', custom: drawColonnade, par: 1, c: C(1, 1) });
    } else if (theme === 'bridge') { // Brücke zum Bergfried: Sturmhimmel mit Blutmond, der Bergfried mit erleuchteten Fenstern,
      // davor der Mode-7-Wolkenstrom im Zeitraffer, darunter die Pfeiler der Brücke, die im Wolkenmeer versinken
      const sky = C(640, 208), xs = sky.getContext('2d');
      smooth(xs, 640, 208, ['#020008', '#05021a', '#0c0428', '#160834', '#220c40', '#301046', '#461446', '#641c40', '#842c3c']);
      for (let i = 0; i < 80; i++) px(xs, rand() < 0.3 ? '#fcfcfc' : '#8c84ac', ri(0, 639), ri(0, 64));
      for (let y = -34; y <= 34; y++) for (let X = -34; X <= 34; X++) { // Blutmond mit Hof
        const d = Math.hypot(X, y);
        if (d > 34) continue;
        if (d > 22) { if (bay(X, y) < (34 - d) / 12 * 0.5) px(xs, '#5c1428', 112 + X, 52 + y); continue; }
        const n = hn((X + 40) >> 2, (y + 40) >> 2, 5);
        px(xs, d > 20 ? '#a82820' : n > 0.72 ? '#c83c2c' : n > 0.3 ? '#e85c3c' : '#f88c5c', 112 + X, 52 + y);
      }
      add('sky', sky, 0, { wrap: false });
      const kp = C(512, 208), xk = kp.getContext('2d'), K = '#0a0614', KL = '#1c1430';
      const tower = (X0, w, top, roof) => {
        px(xk, K, X0, top, w, 208 - top); px(xk, KL, X0, top, 1, 208 - top);
        for (let X = X0; X < X0 + w; X += 4) px(xk, K, X, top - 3, 2, 3); // Zinnen
        for (let k = 0; k < roof; k++) { const half = (roof - k) * w / (2 * roof) + 1; px(xk, K, Math.round(X0 + w / 2 - half), top - 3 - k, Math.round(half * 2), 1); } // Spitzhelm
        for (let Y = top + 10; Y < 180; Y += 18) for (let X = X0 + 3; X < X0 + w - 4; X += 7) if (rand() < 0.45) { // Fenster
          px(xk, '#f8b800', X, Y, 2, 4); px(xk, '#fce0a8', X, Y + 1, 1, 2); px(xk, '#a85000', X, Y + 4, 2, 1);
        }
      };
      tower(300, 30, 96, 24); tower(326, 52, 64, 34); tower(372, 28, 104, 20); tower(394, 40, 82, 30); tower(430, 22, 120, 14);
      px(xk, K, 288, 150, 170, 58); for (let X = 288; X < 458; X += 5) px(xk, K, X, 146, 3, 4); // Ringmauer
      for (let X = 352; X < 360; X++) for (let Y = 70; Y < 92; Y++) if ((X - 356) ** 2 / 16 + (Y - 82) ** 2 / 144 < 1) px(xk, '#fc3c3c', X, Y); // Fenster des Grafen
      add('keep', kp, 0.08);
      L.push({ name: 'clouds', custom: drawCloudStream, par: 0, c: C(1, 1) });
      L.push({ name: 'piers', custom: drawBridgePiers, par: 1, c: C(1, 1) });
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
    const gen = { gallery: (o) => marble(p.a, o), bridge: (o) => stone(p.a, o), vortex: (o) => stone(p.a, o), courtyard: (o) => stone(p.a, o), hall: (o) => bricks(p.a, o), cave: () => rock(p.a), crypt: (o) => bricks(p.a, o), tower: (o) => stone(p.a, o), throne: (o) => bricks(p.a, o), glass: (o) => marble(p.a, o), foyer: (o) => checker(o), library: (o) => parquet(o), ship: () => planks(p.a, { hull: true }) }[theme];
    const ground = [gen({}), gen({ crack: true }), gen({ chip: true }), gen({})];
    const groundTop = theme === 'throne' ? [0, 1, 2, 3].map(() => bricks(p.a, { carpet: true }))
      : theme === 'ship' ? [0, 1, 2, 3].map(() => planks(p.a, { top: true }))
      : theme === 'glass' || theme === 'gallery' ? [0, 1, 2, 3].map(() => marble(p.a, { inlay: true }))
      : theme === 'library' ? [0, 1, 2, 3].map(() => parquet({ top: true }))
      : theme === 'foyer' ? [checker({ top: true }), checker({ top: true, crack: true }), checker({ top: true }), checker({ top: true })] : ground;
    const alt = theme === 'gallery' ? [balcony(), balcony(), balcony()] : theme === 'throne' ? [goldLedge(), goldLedge(), goldLedge()] : theme === 'bridge' ? [bridgeDeck(), bridgeDeck(), bridgeDeck()] : theme === 'ship' ? [beam(p.b), beam(p.b), beam(p.b)] : theme === 'glass' ? [balcony(), balcony(), balcony()] : theme === 'foyer' ? [gallery(), gallery(), gallery()] : theme === 'library' ? [shelfWalk(), shelfWalk(), shelfWalk()] : [stone(p.b, {}), stone(p.b, { crack: true }), stone(p.b, {})];
    const t = {
      ground, groundTop, alt,
      X: stone(p.b, { crack: true, chip: true }), Y: stone(p.b, { crack: true, chip: true }),
      spikes: spikes(), up: theme === 'library' ? stairTile(p.b, 1, '#e8c070') : theme === 'foyer' ? carpetStair(1) : theme === 'ship' ? ratline(1) : theme === 'glass' ? stairTile(p.a, 1, '#fce0a8') : stairTile(p.b, 1), down: theme === 'library' ? stairTile(p.b, -1, '#e8c070') : theme === 'foyer' ? carpetStair(-1) : theme === 'ship' ? ratline(-1) : theme === 'glass' ? stairTile(p.a, -1, '#fce0a8') : stairTile(p.b, -1),
      toppers: [0, 1, 2, 3].map(v => topper(theme, v)), hangers: [0, 1, 2].map(v => hanger(theme, v)),
      bg: buildBg(theme), crate: theme === 'ship' ? crate(p.b) : null,
      B: theme === 'library' ? [0, 1, 2, 3].map(() => bookcase(false)) : null, Btop: theme === 'library' ? [0, 1, 2, 3].map(() => bookcase(true)) : null,
    };
    cache[theme] = t;
    return t;
  }

  function layer(theme, name) { return build(theme).bg.find(l => l.name === name); }

  // Eingangshalle: Regen draußen – wird von der Wand verdeckt, sichtbar nur durch die Fenster
  function drawRainOut(ctx, cam, frame) {
    ctx.fillStyle = 'rgba(150,160,220,0.42)';
    const w = View.w, n = View.lite ? 50 : 90;
    for (let i = 0; i < n; i++) {
      const sx = (i * 97 + frame * 3.1) % (w + 60) - 30, sy = ((i * 53 + frame * 9.5) % 260) - 30, len = 6 + (i % 3) * 3;
      for (let k = 0; k < len; k++) ctx.fillRect(Math.round(sx - k * 0.35), Math.round(sy + k), 1, 1);
    }
  }

  // Bibliothek: in der Ferne kreisen Bücher wie Vogelschwärme unter dem Gewölbe (eigene Ebene, Parallaxe 0.7)
  let flockBooks = null;
  function drawBookFlock(ctx, cam, frame) {
    if (!flockBooks) flockBooks = [['#3c1418', '#6c2c30'], ['#141c3c', '#2c3c6c'], ['#142c1c', '#2c5434'], ['#3c2810', '#6c4c24']].map(([d, l]) => [0.9, 0.35, -0.2, 0.35].map(a => {
      const c = C(11, 7), x = c.getContext('2d'), ap = Math.max(a, 0) + 0.6;
      for (const s of [-1, 1]) {
        for (let r = 1; r <= 3; r++) px(x, '#a89c84', Math.round(5 + s * r * Math.cos(ap)), Math.round(4 - r * Math.sin(ap)));
        for (let r = 0; r <= 5; r++) px(x, r > 3 ? l : d, Math.round(5 + s * r * Math.cos(a)), Math.round(4 - r * Math.sin(a)));
      }
      px(x, d, 5, 5);
      return c;
    }));
    const n = View.lite ? 6 : 12, w = View.w + 160, oy = cam.y * 0.7;
    for (let i = 0; i < n; i++) {
      const dir = i % 3 === 0 ? -1 : 1, sp = 0.16 + (i % 4) * 0.07;
      const X = (((i * 173 + dir * frame * sp - cam.x * 0.7) % w) + w) % w - 80;
      const Y = ((((i * 61) % 150 + 24 - oy) % 260) + 260) % 260 - 30 + Math.sin(frame * 0.02 + i * 1.7) * 14;
      ctx.drawImage(flockBooks[i % 4][(Math.floor(frame / 5) + i) % 4], Math.round(X), Math.round(Y));
    }
  }

  // Burghof: Mode-7-Bodennebel – eine perspektivische Nebelebene, die zum Horizont hin flach wird und langsam heranrollt
  // (halbe Auflösung, jede Bildzeile in die Ebene zurückgerechnet; nahtloses Rauschen in drei Oktaven)
  let fogTex = null, fogBuf = null;
  function drawFog7(ctx, cam, frame) {
    if (!fogTex) {
      fogTex = new Uint8Array(128 * 128);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        let v = 0;
        for (const [s, w] of [[32, 0.6], [16, 0.28], [8, 0.12]]) {
          const n = 128 / s, gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const a = hn(x0 % n, y0 % n, 31), b = hn((x0 + 1) % n, y0 % n, 31), c = hn(x0 % n, (y0 + 1) % n, 31), d = hn((x0 + 1) % n, (y0 + 1) % n, 31);
          v += w * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        }
        fogTex[y * 128 + x] = Math.max(0, Math.min(255, (v - 0.3) * 2.4 * 255));
      }
    }
    const HZ = 112, w = Math.ceil(View.w / 2), h = (208 - HZ) >> 1;
    if (!fogBuf || fogBuf.w !== w) { const c = C(w, h), x = c.getContext('2d'), img = x.createImageData(w, h); fogBuf = { w, c, x, img, d: new Int32Array(img.data.buffer) }; }
    const d = fogBuf.d, cx = cam.x * 0.45, step = View.lite ? 2 : 1; // Sparmodus: nur jede zweite Zeile
    if (step > 1) d.fill(0);
    for (let j = 0; j < h; j += step) {
      const yy = j * 2 + 1, dist = 900 / (yy + 5), sc = dist / 210, fade = Math.min(1, yy / 26) * (0.5 + 0.5 * Math.min(1, (h * 2 - yy) / 50)) * 0.62;
      const v = ((dist + frame * 0.35) & 127) * 128, du = 2 * sc, row = j * w;
      let u = (-View.w / 2) * sc + cx * sc * 0.2 + frame * 0.12 + cx + 4096;
      for (let i = 0; i < w; i++, u += du) {
        const a = (fogTex[v + ((u | 0) & 127)] * fade) | 0;
        d[row + i] = a ? (a << 24) | (214 << 16) | (160 << 8) | 176 : 0;
      }
    }
    fogBuf.x.putImageData(fogBuf.img, 0, 0);
    ctx.drawImage(fogBuf.c, 0, 0, w, h, 0, HZ, w * 2, h * 2);
  }

  // Grotte: Glanzlichter stürzen den Wasserfall hinab (eigene Ebene, gleiche Parallaxe wie die Säulen)
  function drawFalls(ctx, cam, frame) {
    const off = ((Math.floor(cam.x * 0.42) % 512) + 512) % 512, oy = cam.y * 0.42;
    ctx.fillStyle = 'rgba(232,248,252,0.75)';
    for (let k = -1; k <= Math.ceil(View.w / 512) + 1; k++) {
      const X0 = 262 - off + k * 512;
      if (X0 > View.w || X0 + 16 < 0) continue;
      for (let i = 0; i < 22; i++) { const y = (((i * 37 + frame * 3.2 - oy) % 208) + 208) % 208, len = 5 + (i % 4) * 3; ctx.fillRect(X0 + (i * 5) % 16, Math.round(y), 1, len); }
    }
  }

  // ---------------- Marmorgalerie: Säulengang in echter Perspektive (PS1-Look) ----------------
  // Drei Säulenreihen in verschiedenen Tiefen z. Jede Säule ist ein Zylinder aus senkrechten Lichtstreifen: Mondlicht aus den
  // hohen Fenstern der Rückwand streift die Kanten (Gegenlicht), Kerzen vorn hellen die Fronten auf, ein Glanzlicht wandert
  // mit dem Blickwinkel. Dazu Schachbrett-Marmorboden und Kassettendecke in Mode-7-Perspektive, Lichtbahnen und Lichtpfützen;
  // Wolken vor dem Mond lassen das Licht atmen. Jede Ebene verschiebt sich mit 1/z – echte Parallaxe statt Kulissen.
  const GAL = { hz: 82, zBack: 3.4, rows: [{ z: 2.6, sp: 104, off: 30, r: 15 }, { z: 1.8, sp: 116, off: 0, r: 17 }, { z: 1.28, sp: 156, off: 70, r: 18 }] };
  let galBuf = null, galVein = null, galPools = null, galWin = null, galStrip = null;
  const galColC = new Map(), galCol = (r, g, b) => { // Farbstrings zwischenspeichern (auf 4 Stufen je Kanal gerundet)
    const k = (Math.min(255, r) >> 2) << 12 | (Math.min(255, g) >> 2) << 6 | (Math.min(255, b) >> 2);
    let s = galColC.get(k); if (!s) { s = `rgb(${(k >> 12) << 2},${((k >> 6) & 63) << 2},${(k & 63) << 2})`; galColC.set(k, s); }
    return s;
  };
  const moonI = (k, frame) => 0.45 + 0.55 * Math.max(0, Math.sin(frame * 0.007 + k * 1.9) * 0.6 + Math.sin(frame * 0.0031 + k * 0.7) * 0.5);
  function drawColonnade(ctx, cam, frame) {
    const w = View.w, vx = w / 2, hz = GAL.hz, floorY = 11 * T - cam.y, ceilY = -70 - cam.y, ZB = GAL.zBack;
    const proj = (wx, z) => vx + (wx - cam.x - vx) / z, fyz = z => hz + (floorY - hz) / z, cyz = z => hz + (ceilY - hz) / z;
    const W2 = Math.ceil(w / 2);
    if (!galBuf || galBuf.w !== W2) { const c = C(W2, 104), x = c.getContext('2d'), img = x.createImageData(W2, 104); galBuf = { w: W2, c, x, img, d: new Int32Array(img.data.buffer) }; }
    if (!galVein) { galVein = C(16, 96); const x = galVein.getContext('2d'); for (let k = 0; k < 4; k++) { let X = 2 + k * 4; for (let y = 0; y < 96; y++) { X += Math.sin(y * 0.15 + k * 2) * 0.6; px(x, 'rgba(60,40,70,0.55)', Math.round(X) & 15, y); } } }
    // Fensterlicht der Rückwand: Fenster alle 220 Welt-px; Lichtpfützen am Boden davor
    const k0 = Math.floor((cam.x - 600) / 220), k1 = Math.ceil((cam.x + w + 600) / 220);
    const wins = []; for (let k = k0; k <= k1; k++) wins.push({ x: k * 220 + 110, i: moonI(k, frame) });
    const cands = []; for (let k = Math.floor((cam.x - 400) / 260); k <= Math.ceil((cam.x + w + 400) / 260); k++) cands.push({ x: k * 260 + 40, i: 0.75 + 0.25 * Math.sin(frame * 0.3 + k * 2.1) * Math.sin(frame * 0.13 + k) });
    // Boden und Decke (Mode 7, halbe Auflösung): Zeile für Zeile in Läufen gleicher Farbe gefüllt (Schachbrett, Kassetten)
    const d = galBuf.d, yb = fyz(ZB), yt = cyz(ZB), base = cam.x + vx;
    const pack = (r, g, b) => (255 << 24) | (Math.min(255, b | 0) << 16) | (Math.min(255, g | 0) << 8) | Math.min(255, r | 0);
    for (let j = 0; j < 104; j++) {
      const y = j * 2 + 1, row = j * W2;
      if (y > yt && y < yb) { d.fill(0, row, row + W2); continue; }
      const floor = y >= yb, z = floor ? (floorY - hz) / (y - hz) : (ceilY - hz) / (y - hz), dz = z * 110, f = Math.min(1, (z - 0.8) / (ZB - 0.8)) * 0.75;
      const fogC = (r, g, b) => pack(r * (1 - f) + 12 * f, g * (1 - f) + 8 * f, b * (1 - f) + 26 * f);
      const cell = floor ? 48 : 64, cv = Math.floor(dz / cell), cvm = ((dz % 64) + 64) % 64;
      let cA, cB, cC; // Farben der Felder dieser Zeile
      if (floor) { cA = fogC(214 * 0.34, 202 * 0.34, 210 * 0.37); cB = fogC(58 * 0.34, 22 * 0.34, 34 * 0.37); }
      else { const ribRow = cvm < 6; cA = fogC(72, 52, 18); cB = ribRow ? cA : fogC(20, 11, 13); cC = ribRow ? cA : fogC(54, 18, 24); }
      let i = 0;
      while (i < W2) {
        const wx = base + (i * 2 + 1 - vx) * z, cu = Math.floor(wx / cell);
        let col;
        if (floor) col = ((cu + cv) & 1) ? cB : cA;
        else { const m = ((wx % 64) + 64) % 64; col = m < 6 ? cA : (m > 24 && m < 40 && cvm > 24 && cvm < 40) ? cC : cB; }
        let edge = floor ? (cu + 1) * cell : wx - (((wx % 64) + 64) % 64) + ([6, 24, 40, 64].find(e => e > (((wx % 64) + 64) % 64)));
        let ie = Math.ceil(((edge - base) / z + vx - 1) / 2); if (ie <= i) ie = i + 1;
        d.fill(col, row + i, row + Math.min(ie, W2)); i = ie;
      }
    }
    galBuf.x.putImageData(galBuf.img, 0, 0);
    ctx.drawImage(galBuf.c, 0, 0, W2, 104, 0, 0, W2 * 2, 208);
    // Lichtpfützen auf dem Marmor: Mondlicht vor den Fenstern, Kerzenschein – perspektivisch gestauchte Lichtflecken
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (!galPools) galPools = ['150,170,255', '255,150,70'].map(col => { const c = C(64, 64), x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, `rgba(${col},1)`); g.addColorStop(1, `rgba(${col},0)`); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c; });
    const pool = (wx, z, rad, img, a) => {
      const X = proj(wx, z), Y = fyz(z), rx = rad / z, ry = Math.max(2, (fyz(z - 0.45) - fyz(z + 0.45)) / 2);
      if (X + rx < 0 || X - rx > w || a <= 0.01) return;
      ctx.globalAlpha = Math.min(1, a); ctx.drawImage(img, X - rx, Y - ry, rx * 2, ry * 2);
    };
    for (const W0 of wins) pool(W0.x + 70, 1.45, 70, galPools[0], 0.42 * W0.i);
    for (const C0 of cands) pool(C0.x, 1.15, 60, galPools[1], 0.3 * C0.i);
    ctx.globalAlpha = 1;
    ctx.restore();
    // Rückwand: dunkler Marmor mit hohen Bogenfenstern, hinter denen der Mond scheint
    ctx.fillStyle = '#1a1020'; ctx.fillRect(0, Math.floor(yt), w, Math.ceil(yb - yt));
    for (const W0 of wins) {
      const x0 = proj(W0.x - 34, ZB), x1 = proj(W0.x + 34, ZB), top = yt + (yb - yt) * 0.18, bot = yb - (yb - yt) * 0.12, ww = x1 - x0;
      if (x1 < 0 || x0 > w) continue;
      if (!galWin) { // Bogenfenster mit Mondlichtverlauf und Fensterkreuz (einmal gemalt, dann skaliert)
        galWin = C(24, 48); const x = galWin.getContext('2d');
        for (let y = 0; y < 48; y++) for (let X = 0; X < 24; X++) {
          if (y < 12 && (X - 11.5) ** 2 + (y - 12) ** 2 > 144) continue;
          const t = y / 48, frameP = X < 2 || X > 21 || (y < 14 && (X - 11.5) ** 2 + (y - 12) ** 2 > 100) || y > 45;
          px(x, frameP ? '#0c0814' : (X === 11 || X === 12 || y === 26) ? '#0c0814' : `rgb(${Math.round(170 - t * 120)},${Math.round(190 - t * 130)},${Math.round(250 - t * 120)})`, X, y);
        }
      }
      ctx.fillStyle = '#0c0814'; ctx.fillRect(Math.round(x0 - 1), Math.round(top), Math.round(ww + 2), Math.round(bot - top));
      ctx.globalAlpha = 0.35 + 0.65 * W0.i; ctx.drawImage(galWin, Math.round(x0), Math.round(top), Math.round(ww), Math.round(bot - top)); ctx.globalAlpha = 1;
    }
    // Säulenreihen von hinten nach vorn
    const camWX = cam.x + vx;
    for (const R of GAL.rows) {
      const z = R.z, top = cyz(z), bot = fyz(z), cw = Math.max(4, Math.round(R.r * 2 / z)), fog = Math.min(0.8, (z - 1) / (ZB - 0.6));
      const kA = Math.floor((cam.x - 300 - R.off) / R.sp), kB = Math.ceil((cam.x + w + 300 - R.off) / R.sp);
      const xs = [];
      for (let k = kA; k <= kB; k++) xs.push(R.off + k * R.sp);
      // Bögen zwischen den Säulen (hinter den Schäften)
      ctx.lineWidth = Math.max(2, 9 / z); ctx.strokeStyle = `rgb(${Math.round(150 * (1 - fog) + 20 * fog)},${Math.round(132 * (1 - fog) + 14 * fog)},${Math.round(150 * (1 - fog) + 40 * fog)})`;
      const archY = top + (bot - top) * 0.2;
      for (let n = 0; n < xs.length - 1; n++) { const a = proj(xs[n], z), b = proj(xs[n + 1], z); if (b < -40 || a > w + 40) continue; ctx.beginPath(); ctx.arc((a + b) / 2, archY, (b - a) / 2, Math.PI, 0); ctx.stroke(); }
      // Schattierung jeder Säule als eine Pixelzeile in einen Streifenpuffer, dann senkrecht gestreckt gezeichnet
      if (!galStrip) { const c = C(64, 48), x = c.getContext('2d'), img = x.createImageData(64, 48); galStrip = { c, x, img, d: new Int32Array(img.data.buffer) }; }
      const SD = galStrip.d, cols = [];
      for (const wx of xs) {
        const sx = proj(wx, z), x0 = Math.round(sx - cw / 2);
        if (x0 > w || x0 + cw < 0 || cols.length >= 48) continue;
        const vdx = camWX - wx, vdz = -z * 110, vl = Math.hypot(vdx, vdz), Vx = vdx / vl, Vz = vdz / vl;
        const Ls = []; // die nächsten Lichter: Fenster hinten (kühl, Gegenlicht), Kerzen vorn (warm)
        for (const W0 of wins) { const lx = W0.x - wx, lz = (ZB - 0.15 - z) * 110, ll = Math.hypot(lx, lz); if (ll < 520) Ls.push([lx / ll, lz / ll, W0.i * (1 - ll / 520), 0.75, 0.85, 1.15]); }
        for (const C0 of cands) { const lx = C0.x - wx, lz = (0.95 - z) * 110, ll = Math.hypot(lx, lz); if (ll < 380) Ls.push([lx / ll, lz / ll, C0.i * (1 - ll / 380), 0.95, 0.55, 0.25]); }
        const rowOff = cols.length * 64;
        for (let i = 0; i < cw && i < 64; i++) {
          const u = (i + 0.5) / cw * 2 - 1, nx = u, nz = -Math.sqrt(Math.max(0, 1 - u * u));
          let lr = 0.16, lg = 0.14, lb = 0.2, spec = 0;
          for (const [Lx, Lz, fall, cr, cg, cb] of Ls) {
            const lam = nx * Lx + nz * Lz; if (lam <= 0) continue;
            lr += lam * cr * fall; lg += lam * cg * fall; lb += lam * cb * fall;
            const hx = Lx + Vx, hz2 = Lz + Vz, hl = Math.hypot(hx, hz2) || 1; let sp = (nx * hx + nz * hz2) / hl;
            if (sp > 0.8) { sp *= sp; sp *= sp; sp *= sp; sp *= sp; sp *= sp; spec += sp * fall; } // ^32
          }
          const r = (228 * lr + 255 * spec) * (1 - fog) + 14 * fog, g = (218 * lg + 240 * spec) * (1 - fog) + 10 * fog, b = (226 * lb + 220 * spec) * (1 - fog) + 30 * fog;
          SD[rowOff + i] = (255 << 24) | (Math.min(255, b | 0) << 16) | (Math.min(255, g | 0) << 8) | Math.min(255, r | 0);
        }
        cols.push([sx, x0]);
      }
      if (cols.length) galStrip.x.putImageData(galStrip.img, 0, 0, 0, 0, 64, cols.length);
      const gk = 1 - fog * 0.85, capH = Math.max(3, Math.round(14 / z)), capW = Math.round(cw * 1.5), capY = Math.round(archY + (bot - top) * 0.02);
      const baseH = Math.max(2, Math.round(10 / z)), baseW = Math.round(cw * 1.35), colTop = Math.floor(top), colH = Math.ceil(bot - top);
      const gold = galCol(200 * gk, 144 * gk, 32 * gk), goldHi = galCol(252 * gk, 224 * gk, 168 * gk), goldLo = galCol(110 * gk, 76 * gk, 16 * gk), plinth = galCol(150 * gk, 136 * gk, 150 * gk);
      cols.forEach(([sx, x0], n) => {
        ctx.drawImage(galStrip.c, 0, n, Math.min(64, cw), 1, x0, colTop, cw, colH);
        if (z < 2 && !View.lite) { ctx.globalAlpha = 0.5 * (1 - fog); ctx.drawImage(galVein, x0, colTop, cw, colH); ctx.globalAlpha = 1; } // Marmoradern (nur vorn sichtbar)
        const cx0 = Math.round(sx - capW / 2), bx0 = Math.round(sx - baseW / 2), by = Math.round(bot - baseH);
        ctx.fillStyle = gold; ctx.fillRect(cx0, capY, capW, capH); ctx.fillRect(bx0, by, baseW, 1);
        ctx.fillStyle = goldHi; ctx.fillRect(cx0, capY, capW, 1);
        ctx.fillStyle = goldLo; ctx.fillRect(cx0, capY + capH - 1, capW, 1);
        ctx.fillStyle = plinth; ctx.fillRect(bx0, by + 1, baseW, baseH - 1);
        ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(bx0 - 2, Math.round(bot), baseW + 4, Math.max(1, Math.round(3 / z))); // Schatten am Boden
      });
    }
    // Lichtbahnen: Mondlicht fällt schräg durch die Fenster bis nach vorn
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const btop = yt + (yb - yt) * 0.25, bbot = fyz(1.15);
    const gr = ctx.createLinearGradient(0, btop, 0, bbot); gr.addColorStop(0, 'rgba(120,140,255,0.13)'); gr.addColorStop(1, 'rgba(120,140,255,0)');
    ctx.fillStyle = gr;
    for (const W0 of wins) {
      const a0 = proj(W0.x - 30, ZB), a1 = proj(W0.x + 30, ZB), b0 = proj(W0.x - 30 + 260, 1.15), b1 = proj(W0.x + 30 + 260, 1.15);
      if (Math.max(a1, b1) < 0 || Math.min(a0, b0) > w) continue;
      ctx.globalAlpha = W0.i; ctx.beginPath(); ctx.moveTo(a0, btop); ctx.lineTo(a1, btop); ctx.lineTo(b1, bbot); ctx.lineTo(b0, bbot); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Staub in den Lichtbahnen
    ctx.fillStyle = 'rgba(200,210,255,0.5)';
    for (let i = 0; i < (View.lite ? 14 : 30); i++) { const X = ((i * 97 + frame * 0.2 - cam.x * 0.6) % (w + 40) + w + 40) % (w + 40) - 20, Y = 40 + ((i * 53 + frame * 0.15) % 130); ctx.fillRect(Math.round(X), Math.round(Y), 1, 1); }
    ctx.restore();
  }

  // Brücke: Mode-7-Wolkenstrom im Zeitraffer – ein Wolkenmeer unter dem Horizont und eine Wolkendecke darüber rasen
  // perspektivisch verjüngt auf den Betrachter zu, halb durchsichtig; der Bergfried scheint hindurch, Blitze hellen sie auf
  let streamTex = null, streamBuf = null;
  function drawCloudStream(ctx, cam, frame) {
    if (!streamTex) {
      streamTex = new Uint8Array(128 * 128);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        let v = 0;
        for (const [s, w] of [[32, 0.5], [16, 0.27], [8, 0.15], [4, 0.08]]) {
          const n = 128 / s, gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const a = hn(x0 % n, y0 % n, 59), b = hn((x0 + 1) % n, y0 % n, 59), c = hn(x0 % n, (y0 + 1) % n, 59), d = hn((x0 + 1) % n, (y0 + 1) % n, 59);
          v += w * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        }
        streamTex[y * 128 + x] = Math.max(0, Math.min(255, (v - 0.36) * 2.8 * 255));
      }
    }
    const HZ = 122, w = Math.ceil(View.w / 2), h = 104;
    if (!streamBuf || streamBuf.w !== w) { const c = C(w, h), x = c.getContext('2d'), img = x.createImageData(w, h); streamBuf = { w, c, x, img, d: new Int32Array(img.data.buffer) }; }
    const d = streamBuf.d, flash = FX.stormOn(W.storm) ? 1 : 0, step = View.lite ? 2 : 1;
    if (step > 1) d.fill(0);
    for (let j = 0; j < h; j += step) {
      const y = j * 2 + 1, below = y > HZ, yy = Math.abs(y - HZ), row = j * w;
      if (yy < 2) { d.fill(0, row, row + w); continue; }
      const dist = (below ? 900 : 2200) / (yy + 3), sc = dist / 240, du = 2 * sc;
      const fade = Math.min(1, (yy - 1) / 26);
      const v = ((dist + frame * 3.2 + (below ? 0 : 57)) & 127) * 128; // Zeitraffer: die Wolken stürzen auf den Betrachter zu
      let u = (-View.w / 2) * sc + cam.x * 0.02 + frame * 0.05 + (below ? 4096 : 4133);
      const rimRow = below ? 0 : Math.max(0, 1 - yy / 90); // Wolkenränder nahe am Horizont glühen im Mondlicht
      for (let i = 0; i < w; i++, u += du) {
        const n = streamTex[v + ((u | 0) & 127)];
        if (n < 64) { d[row + i] = 0; continue; }
        const k = (n - 64) / 191, k2 = k * k, a = (Math.min(1, k * 2.2) * (below ? 200 : 170) * fade) | 0;
        let r, g, b;
        if (below) { r = 40 + 200 * k2; g = 22 + 120 * k2; b = 70 + 150 * k2; } // Wolkenmeer: dunkle Täler, helle Kuppen
        else { r = 26 + 120 * k2 + rimRow * 90 * k; g = 14 + 70 * k2 + rimRow * 30 * k; b = 48 + 110 * k2 + rimRow * 40 * k; } // Wolkendecke: dunkle Unterseiten
        d[row + i] = (a << 24) | (Math.min(255, b + flash * 70) << 16) | (Math.min(255, g + flash * 80) << 8) | Math.min(255, r + flash * 70);
      }
    }
    streamBuf.x.putImageData(streamBuf.img, 0, 0);
    ctx.drawImage(streamBuf.c, 0, 0, w, h, 0, 0, w * 2, h * 2);
  }
  // Brückenpfeiler unter dem Deck (Parallaxe 1): wuchtige Pfeiler mit Gewölbeansätzen, nach unten im Dunst verschwindend
  let pierImg = null;
  function drawBridgePiers(ctx, cam) {
    if (!pierImg) {
      const c = C(128, 84), x = c.getContext('2d'), p = PALS.bridge.a;
      for (let Y = 0; Y < 84; Y++) for (let X = 0; X < 128; X++) {
        const ax = Math.abs(X - 64), core = ax < 16;
        const archBottom = 6 + Math.sqrt(Math.max(0, 48 * 48 - (64 - ax) * (64 - ax))) * 0.62; // Unterkante der Bögen zu beiden Seiten
        if (!core && Y > (ax > 60 ? 6 : 64 - archBottom)) continue;
        const joint = (Y % 6 === 5) || ((X + ((Y / 6 | 0) % 2) * 4) % 9 === 0);
        px(x, joint ? p[4] : core ? (X < 54 ? p[2] : X > 72 ? p[3] : p[2]) : p[3], X, Y);
      }
      for (let Y = 0; Y < 84; Y++) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = `rgba(14,8,28,${Math.min(0.9, 0.15 + Y / 80)})`; x.fillRect(0, Y, 128, 1); }
      x.globalCompositeOperation = 'source-over';
      pierImg = c;
    }
    const top = 10 * T - Math.round(cam.y);
    for (let k = Math.floor(cam.x / 224) - 1; k <= Math.floor((cam.x + View.w) / 224) + 1; k++) ctx.drawImage(pierImg, k * 224 + 48 - Math.round(cam.x), top);
  }

  // Titelbild: Mode-7-Wolkendecke – eine perspektivische Wolkenebene über der Burg, halb durchsichtig (der Mond scheint hindurch),
  // zieht langsam auf den Betrachter zu; die Wolkenränder hellt der Blutmond rötlich auf
  let cloudTex = null, cloudBuf = null;
  function drawCloud7(ctx, frame) {
    if (!cloudTex) {
      cloudTex = new Uint8Array(128 * 128);
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        let v = 0;
        for (const [s, w] of [[32, 0.5], [16, 0.27], [8, 0.15], [4, 0.08]]) {
          const n = 128 / s, gx = x / s, gy = y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
          const a = hn(x0 % n, y0 % n, 47), b = hn((x0 + 1) % n, y0 % n, 47), c = hn(x0 % n, (y0 + 1) % n, 47), d = hn((x0 + 1) % n, (y0 + 1) % n, 47);
          v += w * (a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy);
        }
        cloudTex[y * 128 + x] = Math.max(0, Math.min(255, (v - 0.4) * 3 * 255));
      }
    }
    const HZ = 112, w = Math.ceil(View.w / 2), h = HZ >> 1;
    if (!cloudBuf || cloudBuf.w !== w) { const c = C(w, h), x = c.getContext('2d'), img = x.createImageData(w, h); cloudBuf = { w, c, x, img, d: new Int32Array(img.data.buffer) }; }
    const d = cloudBuf.d;
    for (let j = 0; j < h; j++) {
      const yy = HZ - (j * 2 + 1), dist = 1300 / (yy + 6), sc = dist / 230, fade = Math.min(1, yy / 46) * 0.8, du = 2 * sc;
      const v = ((dist + frame * 0.6) & 127) * 128, row = j * w;
      let u = (-View.w / 2) * sc + frame * 0.05 + 4096;
      for (let i = 0; i < w; i++, u += du) {
        const n = cloudTex[v + ((u | 0) & 127)];
        if (n < 30) { d[row + i] = 0; continue; }
        const a = Math.min(190, (n - 30) * 1.4) * fade | 0, k = n / 255, rim = i > w * 0.6 ? (i - w * 0.6) / (w * 0.4) : 0;
        d[row + i] = (a << 24) | ((96 + 120 * k) << 16) | ((40 + 70 * k + rim * 20) << 8) | (70 + 120 * k + rim * 60);
      }
    }
    cloudBuf.x.putImageData(cloudBuf.img, 0, 0);
    ctx.drawImage(cloudBuf.c, 0, 0, w, h, 0, 0, w * 2, h * 2);
  }

  // ---------------- Glasturm als Röhre (Mode 7): senkrechte Achse, Blick von innen auf die Wand ----------------
  // Jede Bildspalte ist ein Strahl von einem Punkt hinter der Achse auf die Zylinderwand: gegenüber liegt die
  // ferne Wand (gestaucht), an den Rändern die nahe Wand (groß, gewölbt). Die Fenstertextur umläuft die Röhre
  // zweimal. Auf der Treppe dreht sich die Röhre – hinauf vorwärts, hinunter zurück (wie eine Wendeltreppe).
  let tubeTab = null;
  function tubeTable(w) {
    if (tubeTab && tubeTab.w === w) return tubeTab;
    const CIRC = 1024, R = CIRC / (2 * Math.PI), dd = R * 0.3, f = (w / 2) / Math.tan(1.0);
    const u = new Float32Array(w), s = new Float32Array(w), sh = new Float32Array(w);
    let smin = 1e9, smax = 0;
    for (let x = 0; x < w; x++) {
      const ph = Math.atan((x + 0.5 - w / 2) / f), c = Math.cos(ph), sn = Math.sin(ph);
      const t = dd * c + Math.sqrt(dd * dd * c * c - dd * dd + R * R), px = t * sn, py = -dd + t * c;
      u[x] = Math.atan2(px, py) / (2 * Math.PI) * CIRC; s[x] = t * c / f;
      smin = Math.min(smin, s[x]); smax = Math.max(smax, s[x]);
    }
    for (let x = 0; x < w; x++) sh[x] = (s[x] - smin) / (smax - smin); // 0 = nah (Rand), 1 = fern (Mitte)
    const gr = Sprites.canvas(w, 1), gx = gr.getContext('2d');
    for (let x = 0; x < w; x++) { gx.fillStyle = `rgba(6,2,12,${(0.08 + sh[x] * 0.42).toFixed(3)})`; gx.fillRect(x, 0, 1, 1); } // ferne Wand im Dunst
    return (tubeTab = { w, u, s, sh, shade: gr });
  }
  let tubeTx = null, tubeOut = null;
  function tubeTex(tex, glow) { // Textur in 5 Leuchtstufen (Glas + Leuchtebene × Stärke) – pro Bild nur nachschlagen
    if (tubeTx && tubeTx.src === tex) return tubeTx;
    const w = tex.width, h = tex.height, a = tex.getContext('2d').getImageData(0, 0, w, h).data, g = glow.getContext('2d').getImageData(0, 0, w, h).data;
    const levels = [0.05, 0.12, 0.19, 0.26, 0.7].map(k => {
      const out = new Int32Array(w * h);
      for (let i = 0, j = 0; i < out.length; i++, j += 4) {
        const r = Math.min(255, a[j] + g[j] * k), gg = Math.min(255, a[j + 1] + g[j + 1] * k), b = Math.min(255, a[j + 2] + g[j + 2] * k);
        out[i] = (255 << 24) | (b << 16) | (gg << 8) | r;
      }
      return out;
    });
    return (tubeTx = { src: tex, w, h, levels });
  }
  function drawGlassTube(ctx, cam, frame, tex, glow) {
    const w = View.w, H = 208, tb = tubeTable(w), TX = tubeTex(tex, glow), TW = TX.w, TH = TX.h;
    if (!tubeOut || tubeOut.w !== w) { const c = Sprites.canvas(w, H), x = c.getContext('2d'), img = x.createImageData(w, H); tubeOut = { w, c, x, img, buf: new Int32Array(img.data.buffer) }; }
    if (W.tubeRotS === undefined) W.tubeRotS = W.tubeRot || 0;
    W.tubeRotS += ((W.tubeRot || 0) - W.tubeRotS) * 0.08; // weich nachziehen
    const cloud = 0.5 + 0.3 * Math.sin(frame * 0.011) + 0.2 * Math.sin(frame * 0.0037 + 1.3); // Wolken ziehen am Mond vorbei
    const src = TX.levels[FX.stormOn(W.storm) ? 4 : Math.max(0, Math.min(3, Math.round(cloud * 3)))];
    const u0 = cam.x * 0.5 + W.tubeRotS, camV = cam.y * 0.5 + 104, out = tubeOut.buf; // dreht sich nur, wenn der Held sich bewegt (Treppe: vor und zurück)
    for (let x = 0; x < w; x++) {
      const s = tb.s[x], su = ((Math.floor(u0 + tb.u[x]) % TW) + TW) % TW;
      let v = (((camV - 104 * s) % TH) + TH) % TH;
      for (let y = 0, o = x; y < H; y++, o += w) { out[o] = src[(v | 0) * TW + su]; v += s; if (v >= TH) v -= TH; }
    }
    tubeOut.x.putImageData(tubeOut.img, 0, 0);
    ctx.drawImage(tubeOut.c, 0, 0);
    ctx.drawImage(tb.shade, 0, 0, w, 1, 0, 0, w, H); // ferne Wand im Dunst
  }

  function drawLayer(ctx, l, cam, frame, vt = false) {
    if (l.hidden) return;
    if (l.tunnel) { Mode7.drawTunnel(ctx, View.w, frame); return; }
    if (l.custom) { l.custom(ctx, cam, frame); return; }
    const img = l.frames ? l.frames[Math.floor(frame / (60 / l.fps)) % l.frames.length] : l.c;
    if (l.right !== undefined) { ctx.drawImage(img, Math.round(View.w - l.right - img.width / 2), l.y || 0); return; }
    if (!l.wrap) { ctx.drawImage(img, 0, 0); return; }
    const off = ((Math.floor(cam.x * l.par + (l.drift ? frame * l.drift : 0) + (l.sail ? (W.sailX || 0) * l.sail : 0)) % img.width) + img.width) % img.width;
    const oy = vt && l.vtile ? ((Math.floor(cam.y * l.par) % img.height) + img.height) % img.height : 0;
    const tile = () => { for (const yy of oy ? [-oy, img.height - oy] : [0]) for (let x = -off; x < View.w; x += img.width) ctx.drawImage(img, x, yy); };
    if (!l.glow) { tile(); return; }
    // Glasturm: die Fenster leuchten auf und ab, wenn Wolken am Mond vorbeiziehen; ab und zu wandert ein Glanzstreifen
    // übers Glas, und bei Blitzen flammen alle Fenster auf
    const cloud = 0.5 + 0.3 * Math.sin(frame * 0.011) + 0.2 * Math.sin(frame * 0.0037 + 1.3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = FX.stormOn(W.storm) ? 0.7 : 0.05 + 0.2 * Math.max(0, cloud);
    tile();
    const ph = (frame % 600) / 600;
    if (ph < 0.4) {
      const sx = -90 + ph / 0.4 * (View.w + 180);
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx + 30, 0); ctx.lineTo(sx - 34, 208); ctx.lineTo(sx - 64, 208); ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.3; tile();
    }
    ctx.restore();
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
    if (theme === 'gallery') { // Säulen ganz vorn: dunkle Silhouetten mit Mondlicht-Saum, laufen schneller vorbei als die Spielebene
      x.globalAlpha = 0.72;
      [120, 440].forEach(cx => {
        px(x, '#06040c', cx - 15, 0, 30, 208); px(x, '#4c4c7c', cx - 15, 0, 1, 208); px(x, '#24243c', cx - 14, 0, 2, 208); px(x, '#14101c', cx + 12, 0, 3, 208);
        px(x, '#1c140c', cx - 21, 22, 42, 10); px(x, '#6c5420', cx - 21, 22, 42, 1); px(x, '#06040c', cx - 19, 194, 38, 14); px(x, '#4c4c7c', cx - 19, 194, 38, 1);
      });
      x.globalAlpha = 1;
      return c;
    }
    if (theme === 'courtyard') {
      for (let X = 0; X < 640; X++) { const h = 3 + Math.round(Math.abs(Math.sin(X * 0.21) * 4 + Math.sin(X * 0.07) * 3)); px(x, dark, X, 208 - h, 1, h); }
      [60, 300, 520].forEach(bx => { for (let i = 0; i < 26; i++) px(x, dark, bx + i, 190 + Math.abs(13 - i) / 2, 1, 18); });
      [140, 430].forEach(tx => { for (let i = 0; i < 70; i++) px(x, dark, tx + i, Math.floor(i * 0.35), 3, 2); for (let i = 0; i < 20; i++) px(x, dark, tx + 30 + i, 12 + i, 1, 1); });
    } else if (theme === 'foyer') { // schwerer Samt-Volant oben, zerrissen
      for (let X = 0; X < 640; X++) {
        const sc = X % 80, h = 10 + Math.round(Math.sin(sc / 80 * Math.PI) * 9) + (hn(X >> 2, 1, 5) > 0.8 ? 3 : 0);
        px(x, '#2c0408', X, 0, 1, h); px(x, '#5c0a14', X, h - 3, 1, 2); if (sc % 4 === 0) px(x, '#7c1018', X, 0, 1, h - 3);
        if (sc === 0) { px(x, '#c89020', X - 1, 0, 3, 14); px(x, '#f8b800', X - 1, 12, 3, 4); }
      }
    } else if (theme === 'library') { // Deckenbalken mit geschnitzten Konsolen, hängende Öllampen an Ketten
      px(x, '#0a0402', 0, 0, 640, 6);
      [0, 160, 320, 480].forEach(bx => { px(x, '#0a0402', bx, 0, 14, 12); for (let k = 0; k < 8; k++) px(x, '#0a0402', bx + 2 + k, 12 + k, 10 - k, 1); px(x, '#2c1406', bx + 13, 0, 1, 12); });
      [96, 416].forEach(lx => { for (let y = 6; y < 38; y += 3) px(x, '#1c1418', lx, y, 1, 2); px(x, '#140c08', lx - 4, 38, 9, 7); px(x, '#5c3c1c', lx - 3, 39, 7, 1); px(x, '#fcd040', lx - 1, 41, 3, 3); px(x, '#140c08', lx - 2, 45, 5, 2); });
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
    if (room.theme === 'glass') { drawGlassFront(ctx, room, cam); return; }
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
      const out = cx < 0 || cx >= room.w; // außerhalb schmaler Räume: Mauer (Bibliothek: Bücherwand)
      const wallCh = t.B ? 'B' : '#', ch = out ? wallCh : g[cy][cx];
      if (ch === '.') continue;
      const X = cx * T + ox, Y = cy * T + oy, v = ((cx * 7 + cy * 3) % 4 + 4) % 4;
      const above = out ? wallCh : cy > 0 ? g[cy - 1][cx] : '.', below = out ? wallCh : cy < room.h - 1 ? g[cy + 1][cx] : '#';
      let img = null;
      if (ch === '#') img = (above === '#' ? t.ground : t.groundTop)[v];
      else if (ch === 'B') img = t.B ? (above === 'B' || above === '#' ? t.B : t.Btop)[v] : t.ground[v];
      if (ch === 'B' && img) { // Bücherwand: geschnitzte Seitenwangen, wo sie an Luft grenzt – damit sich begehbare Regale vom Hintergrund abheben
        ctx.drawImage(img, X, Y); img = null;
        const left = out || cx === 0 ? 'B' : g[cy][cx - 1], right = out || cx === room.w - 1 ? 'B' : g[cy][cx + 1];
        if (left === '.') { ctx.fillStyle = '#5c3414'; ctx.fillRect(X, Y, 3, 16); ctx.fillStyle = '#d8a058'; ctx.fillRect(X, Y, 1, 16); ctx.fillStyle = '#9c6430'; ctx.fillRect(X + 1, Y, 1, 16); }
        if (right === '.') { ctx.fillStyle = '#3c1c08'; ctx.fillRect(X + 13, Y, 3, 16); ctx.fillStyle = '#7c4c20'; ctx.fillRect(X + 13, Y, 1, 16); ctx.fillStyle = '#0a0402'; ctx.fillRect(X + 15, Y, 1, 16); }
        if (below === '.') { ctx.fillStyle = '#5c3414'; ctx.fillRect(X, Y + 13, 16, 3); ctx.fillStyle = '#c8982c'; ctx.fillRect(X, Y + 13, 16, 1); }
      }
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

  return { build, drawBg, drawTiles, drawFront, layer, drawLayer, shipLights, drawCloud7 };
})();
