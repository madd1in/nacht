// Sprite-System: Pixel-Art als ASCII-Raster -> Offscreen-Canvas (+ gespiegelt, + Weiß-Blitz).
'use strict';

const PAL = {
  k: '#000000', w: '#fcfcfc', W: '#bcbcbc', g: '#7c7c7c', G: '#4c4c4c',
  s: '#fcbca0', S: '#d8785c', h: '#7c2c00', b: '#b0602c', B: '#5c2c0c',
  o: '#f87800', y: '#f8b800', Y: '#fce0a8',
  r: '#d82800', R: '#881400', m: '#a80020', t: '#e40058',
  p: '#9878f8', P: '#6844fc', v: '#4428bc',
  u: '#0078f8', U: '#0000a8', c: '#3cbcfc', C: '#a4e4fc',
  n: '#00a800', N: '#005800', l: '#b8f818', e: '#88d8a0', E: '#3c7c5c',
};

const Sprites = (() => {
  const S = {};

  // Kleine Leinwände (Sprites, Kacheln, Zwischenbilder) rechnen im Arbeitsspeicher: Konturen und Effekte lesen ihre Pixel
  // mit getImageData zurück – auf einer Grafikkarten-Leinwand stockt dabei jedes Mal das Bild (beim Laden Sekunden).
  // Große Puffer (Licht, Hintergründe) bleiben auf der Grafikkarte.
  const CPU = { willReadFrequently: true };
  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    if (w * h <= 65536) c.getContext('2d', CPU);
    return c;
  }

  function paint(ctx, rows, ox = 0, oy = 0, pal = PAL) {
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const col = pal[row[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    });
  }

  const OUTLINE = [12, 4, 20];

  // Dunkle 1px-Kontur um alle deckenden Pixel (Leinwand wächst um 1px je Seite).
  function outlined(src) {
    const c = canvas(src.width + 2, src.height + 2);
    const x = c.getContext('2d');
    x.drawImage(src, 1, 1);
    const img = x.getImageData(0, 0, c.width, c.height), d = img.data, W2 = c.width, H2 = c.height;
    const solid = (px, py) => px >= 0 && py >= 0 && px < W2 && py < H2 && d[(py * W2 + px) * 4 + 3] > 0 && d[(py * W2 + px) * 4 + 3] !== 254;
    const shade = []; // Randlicht oben-links, Schatten unten-rechts
    for (let py = 0; py < H2; py++) for (let px = 0; px < W2; px++) {
      if (!solid(px, py)) continue;
      const lit = !solid(px, py - 1) || !solid(px - 1, py), dark = !solid(px, py + 1) || !solid(px + 1, py);
      if (lit !== dark) shade.push([(py * W2 + px) * 4, lit]);
    }
    shade.forEach(([i, lit]) => { for (let j = 0; j < 3; j++) d[i + j] = lit ? Math.round(d[i + j] + (255 - d[i + j]) * 0.24) : Math.round(d[i + j] * 0.74); });
    const mark = [];
    for (let py = 0; py < H2; py++) for (let px = 0; px < W2; px++) {
      if (d[(py * W2 + px) * 4 + 3] > 0) continue;
      if (solid(px - 1, py) || solid(px + 1, py) || solid(px, py - 1) || solid(px, py + 1)) mark.push((py * W2 + px) * 4);
    }
    // 16-Bit-„Sel-out“: Kontur in dunkler Variante der Nachbarfarbe statt reinem Schwarz
    const cols = mark.map(i => {
      const q = i / 4, X = q % W2, Y = (q - X) / W2;
      let r = 0, g = 0, b = 0, n = 0;
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ox, oy]) => {
        if (!solid(X + ox, Y + oy)) return;
        const j = ((Y + oy) * W2 + X + ox) * 4; r += d[j]; g += d[j + 1]; b += d[j + 2]; n++;
      });
      return n ? [Math.round(r / n * 0.16 + OUTLINE[0] * 0.6), Math.round(g / n * 0.12 + OUTLINE[1] * 0.6), Math.round(b / n * 0.18 + OUTLINE[2] * 0.6)] : OUTLINE;
    });
    mark.forEach((i, k) => { d[i] = cols[k][0]; d[i + 1] = cols[k][1]; d[i + 2] = cols[k][2]; d[i + 3] = 254; });
    x.putImageData(img, 0, 0);
    return c;
  }

  function finish(c, outline = true) {
    const w = c.width, h = c.height;
    const src = outline ? outlined(c) : c;
    const f = canvas(src.width, src.height);
    const fx = f.getContext('2d');
    fx.translate(src.width, 0); fx.scale(-1, 1); fx.drawImage(src, 0, 0);
    return { w, h, c: src, f, pad: outline ? 1 : 0, white: null };
  }

  // Bedarfs-Sprite: Leinwand, Kontur und Spiegelbild entstehen erst beim ersten Zugriff auf c/f (beim Zeichnen) – beim
  // Laden werden so nur die Maße festgehalten. Viele Pixel-Sprites (alte 2D-Gegner, die das Rig ersetzt) werden nie gebaut.
  function lazy(w, h, mk, outline) {
    const spr = { w, h, pad: outline ? 1 : 0, white: null };
    let done = null;
    const real = () => done || (done = finish(mk(), outline));
    Object.defineProperty(spr, 'c', { enumerable: true, get: () => real().c, set: (v) => { real().c = v; } });
    Object.defineProperty(spr, 'f', { enumerable: true, get: () => real().f, set: (v) => { real().f = v; } });
    return spr;
  }
  // layers: [{rows, x, y}] -> sprite
  function compose(w, h, layers, pal, outline = true) {
    return lazy(w, h, () => {
      const c = canvas(w, h), x = c.getContext('2d');
      layers.forEach(l => paint(x, l.rows, l.x || 0, l.y || 0, pal));
      return c;
    }, outline);
  }

  function make(rows, pal, outline = true) {
    const w = Math.max(...rows.map(r => r.length));
    return compose(w, rows.length, [{ rows }], pal, outline);
  }
  const plain = (rows) => make(rows, PAL, false);

  function whiteOf(spr) {
    if (spr.white) return spr.white;
    const mk = (src) => {
      const c = canvas(src.width, src.height);
      const x = c.getContext('2d');
      x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#fcfcfc'; x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    spr.white = { c: mk(spr.c), f: mk(spr.f), pv: spr.pv }; // pv: Drehpunkt (Salto-Nachbilder)
    return spr.white;
  }

  // Stein-Version (Medusas Blick): Graustufen mit leichtem Grünstich und Körnung, Kontur bleibt dunkel
  function stoneOf(spr) {
    if (spr.stone) return spr.stone;
    const mk = (src) => {
      const c = canvas(src.width, src.height), x = c.getContext('2d');
      x.drawImage(src, 0, 0);
      const im = x.getImageData(0, 0, c.width, c.height), d = im.data;
      for (let i = 0; i < d.length; i += 4) {
        if (!d[i + 3]) continue;
        const l = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11, n = (Math.imul(i >> 2, 2654435761) >>> 29) * 2;
        const v = l < 24 ? 26 : 70 + l * 0.6 + n;
        d[i] = v - 2; d[i + 1] = v + 2; d[i + 2] = v - 8;
      }
      x.putImageData(im, 0, 0);
      return c;
    };
    spr.stone = { c: mk(spr.c), f: mk(spr.f) };
    return spr.stone;
  }

  // Zeichnet Sprite; x/y = linke obere Ecke der Figur (ohne Kontur). flip = nach links schauen.
  function draw(ctx, spr, x, y, flip = false, flash = false) {
    if (!spr) return;
    let img = flip ? spr.f : spr.c;
    if (flash) { const w = whiteOf(spr); img = flip ? w.f : w.c; }
    ctx.drawImage(img, Math.round(x) - spr.pad, Math.round(y) - spr.pad);
  }

  // ---------------- Held: Oberkörper (16x16) + Beine (16x16) ----------------
  const U = {
    normal: [
      '......hhhh......',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..hhhhhhhsssh...',
      '..hhhhhhsskss...',
      '...hhhhhsssss...',
      '...hhhhhhsSS....',
      '....hh..ssss....',
      '.....bbbbbbbb...',
      '....bbbbbbbbbs..',
      '...sbbbBbbbbss..',
      '...sbbbBbbbbss..',
      '...ssbbBbbbbss..',
      '....sbbbbbbbs...',
      '....yyyyyyyy....',
      '....BbbbbbbbB...',
    ],
    atk1: [
      '......hhhh......',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '.sshhhhhhsssh...',
      '.sshhhhhsskss...',
      '..sshhhhsssss...',
      '...sshhhhsSS....',
      '....sssssss.....',
      '.....bbbbbbbb...',
      '....bbbbbbbbb...',
      '....bbbBbbbbb...',
      '....bbbBbbbbs...',
      '....bbbBbbbss...',
      '....sbbbbbbs....',
      '....yyyyyyyy....',
      '....BbbbbbbbB...',
    ],
    atk2: [
      '..........ss....',
      '......hhhhss....',
      '....hhhhhhss....',
      '...hhhhhhhss....',
      '..hhhhhhsssh....',
      '..hhhhhhsks.....',
      '...hhhhhssss....',
      '...hhhhhsSS.....',
      '....hbbbbbb.....',
      '....bbbbbbbb....',
      '...sbbbBbbbb....',
      '...sbbbBbbbb....',
      '...ssbbBbbbb....',
      '....sbbbbbbb....',
      '....yyyyyyyy....',
      '....BbbbbbbbB...',
    ],
    atk3: [
      '......hhhh......',
      '....hhhhhhhh....',
      '...hhhhhhhhhh...',
      '..hhhhhhhsssh...',
      '..hhhhhhsskss...',
      '...hhhhhsssss...',
      '...hhhhhhsSS....',
      '....hh..ssss....',
      '.....bbbbbbbssss',
      '....bbbbbbbbssss',
      '...sbbbBbbbb....',
      '...sbbbBbbbb....',
      '...ssbbBbbbb....',
      '....sbbbbbbb....',
      '....yyyyyyyy....',
      '....BbbbbbbbB...',
    ],
    hurt: [
      '.ss...hhhh...ss.',
      '.ss.hhhhhhhh.ss.',
      '..shhhhhhhhhhs..',
      '..hhhhhhhsssh...',
      '..hhhhhhsskks...',
      '...hhhhhsssss...',
      '...hhhhhhsSSs...',
      '....hh..ssss....',
      '.....bbbbbbbb...',
      '....bbbbbbbbb...',
      '....bbbBbbbbb...',
      '....bbbBbbbbb...',
      '....bbbBbbbbb...',
      '....bbbbbbbbb...',
      '....yyyyyyyy....',
      '....BbbbbbbbB...',
    ],
  };

  const L = {
    stand: [
      '....bbbbbbbbb...', '....bbbbbbbbb...', '....bBbbbBbbb...',
      '.....BBB.BBB....', '.....BBB.BBB....', '.....BBB.BBB....',
      '.....BBB.BBB....', '.....BBB.BBB....', '.....BBB.BBB....',
      '.....BBB.BBB....', '.....RRR.RRR....', '.....RRR.RRR....',
      '.....RRR.RRR....', '.....RRR.RRRR...', '....RRRR.RRRRR..',
      '....RRRRR.RRRR..',
    ],
    walk1: [
      '....bbbbbbbbb...', '....bbbbbbbbb...', '...bbBbbbbBbb...',
      '....BBB..BBB....', '...BBB....BBB...', '...BBB....BBB...',
      '..BBB......BBB..', '..BBB......BBB..', '..BBB......BBB..',
      '..RRR.......BBB.', '..RRR.......RRR.', '..RRR.......RRR.',
      '.RRR........RRR.', '.RRRR.......RRRR', '.RRRR.......RRRR',
      '..RR.........RRR',
    ],
    walk2: [
      '....bbbbbbbbb...', '....bbbbbbbbb...', '....bBbbbBbbb...',
      '.....BBBBBB.....', '.....BBBBBB.....', '......BBBB......',
      '......BBBB......', '......BBBB......', '.....BBB.BB.....',
      '.....BBB.BBB....', '.....RRR.RRR....', '.....RRR.RRR....',
      '.....RRR.RRR....', '.....RRRRRRRR...', '.....RRRRRRRRR..',
      '.....RRRRRRRRR..',
    ],
    crouch: [
      '...bbbbbbbbbbb..', '..bbbBbbbbBbbbb.', '..BBBBB...BBBBB.',
      '.BBBBB.....RRRR.', '.RRRR......RRRR.', '.RRRR......RRRRR',
      'RRRRR......RRRRR', 'RRRRR.......RRRR',
    ],
    stairUp: [
      '....bbbbbbbbb...', '....bbbbbbbbb...', '...bbBbbbbBBBB..',
      '....BBB...BBBB..', '....BBB....BBB..', '....BBB....BBB..',
      '....BBB...RRR...', '....BBB..RRRR...', '....BBB..RRRRR..',
      '....BBB..RRRRR..', '....BBB.........', '....RRR.........',
      '....RRR.........', '....RRR.........', '...RRRRR........',
      '...RRRRRR.......',
    ],
    stairDown: [
      '....bbbbbbbbb...', '....bbbbbbbbb...', '...BBBbbbbBbb...',
      '..BBBB....BBB...', '..BBB.....BBB...', '..BBB......BBB..',
      '..RRR......BBB..', '..RRRR.....BBB..', '..RRRRR.....BBB.',
      '..RRRRR.....BBB.', '............BBB.', '............RRR.',
      '............RRR.', '............RRR.', '............RRRR',
      '............RRRR',
    ],
  };

  function hero(upper, lower) {
    if (lower === 'crouch') return compose(16, 24, [{ rows: U[upper] }, { rows: L.crouch, y: 16 }]);
    return compose(16, 32, [{ rows: U[upper] }, { rows: L[lower], y: 16 }]);
  }

  S.hero = {
    stand: hero('normal', 'stand'),
    walk1: hero('normal', 'walk1'),
    walk2: hero('normal', 'walk2'),
    crouch: hero('normal', 'crouch'),
    stairUp: hero('normal', 'stairUp'),
    stairDown: hero('normal', 'stairDown'),
    hurt: hero('hurt', 'walk1'),
    atk: [hero('atk1', 'stand'), hero('atk2', 'stand'), hero('atk3', 'stand')],
    catk: [hero('atk1', 'crouch'), hero('atk2', 'crouch'), hero('atk3', 'crouch')],
    satkUp: [hero('atk1', 'stairUp'), hero('atk2', 'stairUp'), hero('atk3', 'stairUp')],
    satkDown: [hero('atk1', 'stairDown'), hero('atk2', 'stairDown'), hero('atk3', 'stairDown')],
    dead: make([
      '................................',
      '..........bbbbbbbbbbb...........',
      '...hhhh..bbbbbbbbbbbbBBBBBBBBRR.',
      '.hhhhhhsbbbbbbbbbbbbyBBBBBBBBRRR',
      '.hhhhhsssbbbbbbbbbbbyBBBBBBBBRRR',
      '..hhhhssbbbbbbbbbbbbyBBBBBBBBRR.',
      '....hh....bbbbbbbbb.............',
    ]),
  };

  // ---------------- Items ----------------
  S.heartS = make([
    '........', '.rr.rr..', 'rrrrrrr.', 'rwrrrrr.',
    'rrrrrrr.', '.rrrrr..', '..rrr...', '...r....',
  ]);
  S.heartB = make([
    '..rrr...rrr...', '.rrrrr.rrrrr..', 'rrwwrrrrrrrrr.', 'rrwrrrrrrrrrr.',
    'rrrrrrrrrrrrr.', 'rrrrrrrrrrrrr.', '.rrrrrrrrrrr..', '..rrrrrrrrr...',
    '...rrrrrrr....', '....rrrrr.....', '.....rrr......', '......r.......',
  ]);
  S.bag = make([
    '.....kk.....', '....ykky....', '.....yy.....', '....rrrr....',
    '...rrrrrr...', '..rrrrrrrr..', '.rrrwrrrrrr.', '.rrwwrryrrr.',
    'rrrwrryyyrrr', 'rrrrrryrrrrr', 'rrrrrryyyrrr', 'rrrrrrrryrrr',
    'rrrrrryyyrrr', '.rrrrrryrrr.', '..rrrrrrrr..',
  ]);
  S.bagBig = make([
    '.....kk.....', '....wkkw....', '.....ww.....', '....pppp....',
    '...pppppp...', '..pppppppp..', '.pppwpppppp.', '.ppwwppyppp.',
    'pppwppyyyppp', 'ppppppyppppp', 'ppppppyyyppp', 'ppppppppyppp',
    'ppppppyyyppp', '.ppppppyppp.', '..pppppppp..',
  ]);
  S.whipUp = make([
    '.........y......', '....y..yyy..y...', '.....yyyyyyy....', '......yYYYy.....',
    '....yyyYwYyyy...', '......yYYYy.....', '.....yyyyyyy....', '....y.gyyy..y...',
    '......g..y......', '.....g..........', '....g...........', '...bb...........',
    '..bb............', '.bb.............', 'bb..............',
  ]);
  S.dagger = make([
    '..y.............', '.yyywwwwwwwww...', 'yyyywwWWWWWWWww.', '.yyyWWWWWWWWW...',
    '..y.............',
  ]);
  S.axe = make([
    '...WWWW.........', '..WWWWWWg.......', '.WWWwwWWWg......', '.WWwwWWWWWb.....',
    '.WWWWWWWWbb.....', '..WWWWWWbb......', '...WWWWbbb......', '.......bbb......',
    '........bbb.....', '.........bbb....', '..........bbb...', '...........bbb..',
    '............bb..',
  ]);
  S.holy = make([
    '...WW...', '...gg...', '...ww...', '..wccw..', '.wccccw.', 'wcwuuccw',
    'wcuuuucw', 'wcuuuucw', 'wccuuccw', '.wccccw.', '..wwww..',
  ]);
  S.cross = make([
    '.....yyyy.....', '.....yYYy.....', '.....yYYy.....', '.....yYYy.....',
    'yyyyyyYYyyyyyy', 'yYYYYYYYYYYYYy', 'yYYYYYYYYYYYYy', 'yyyyyyYYyyyyyy',
    '.....yYYy.....', '.....yYYy.....', '.....yYYy.....', '.....yYYy.....',
    '.....yyyy.....',
  ]);
  S.rosary = make([
    '..W.W.W.W.....', '.W.......W....', 'W.........W...', '.W.......W....',
    '..W.....W.....', '...W...W......', '....W.W.......', '.....y........',
    '....yyy.......', '.....y........', '.....y........',
  ]);
  S.roast = make([
    '..........ww....', '.........wwww...', '........BBww....', '......BBoooB....',
    '....BBooyoooB...', '...BooooyoooooB.', '...BoooyyoooooB.', '...BoooooooooB..',
    '....BBoooooooB..', '.....BBBBBBBB...', '..gggggggggggg..', '...gWWWWWWWWg...',
    '....gggggggg....',
  ]);
  S.oneUp = make([
    '..rrrrrrrrrr..', '.rwwrrrrrrrrr.', 'rrwrrrrrrrrrrr', 'rrrrrrrrrrrrrr',
    'rwwrwrwrwwrrrr', 'rrwrwrwrwrwrrr', 'rrwrwrwrwwrrrr', 'rrwrwwwrwrrrrr',
    'rwwwrrrrwrrrrr', '.rrrrrrrrrrrr.', '..rrrrrrrrrr..',
  ]);
  function orb(a, b, d) {
    return make([
      '.....wwwww......', '...ww' + a + a + a + a + a + 'ww....', '..w' + a + a + a + 'ww' + a + a + a + b + 'w...',
      '.w' + a + a + 'www' + a + a + a + b + b + b + 'w..', '.w' + a + a + 'ww' + a + a + a + b + b + b + b + 'w..',
      'w' + a + a + a + a + a + a + a + b + b + b + b + b + b + 'w.', 'w' + a + a + a + a + a + a + b + b + b + b + b + b + b + 'w.',
      'w' + a + a + a + a + a + b + b + b + b + b + b + b + d + 'w.', 'w' + a + a + a + a + b + b + b + b + b + b + b + d + d + 'w.',
      'w' + a + a + a + b + b + b + b + b + b + b + d + d + d + 'w.', '.w' + a + b + b + b + b + b + b + b + d + d + d + 'w..',
      '.w' + b + b + b + b + b + b + b + d + d + d + d + 'w..', '..w' + b + b + b + b + b + d + d + d + d + 'w...',
      '...ww' + d + d + d + d + d + 'ww....', '.....wwwww......',
    ]);
  }
  S.orb = [orb('c', 'u', 'U'), orb('C', 'c', 'u')];

  // ---------------- Kerzen & Fackeln ----------------
  const candleBase = [
    '...w....', '..www...', '..www...', '..www...', '..www...', '..WWW...',
    '.yyyyy..', '..yyy...', '...y....', '...y....', '..yyy...', '.yyyyy..',
  ];
  S.candle = [
    plain(['...y....', '..yoy...', '..yoy...', '...o....', ...candleBase]),
    plain(['....y...', '...oy...', '..yoy...', '...o....', ...candleBase]),
  ];
  const torchBase = [
    'yyyyyyyyyyyy', '.yggggggggy.', '..gggggggg..', '...gggggg...', '....gggg....',
    '.....gg.....', '.....gg.....', '.....gg.....', '.....gg.....', '.....gg.....',
    '.....gg.....', '.....gg.....', '....gggg....', '...gggggg...',
  ];
  S.torch = [
    plain(['.....o......', '....oyo..o..', '...oyyyo.o..', '..oyywyyoo..', '..oyywwyyo..', '...oyyyyo...', ...torchBase]),
    plain(['......o.....', '..o..oyo....', '..o.oyyyo...', '..ooyywyyo..', '..oyywwyyo..', '...oyyyyo...', ...torchBase]),
  ];

  // ---------------- Effekte ----------------
  S.burst = [
    plain([
      '................', '................', '................', '................',
      '................', '......o.........', '.....ooo..o.....', '....oyyoo.oo....',
      '...ooyyyooyo....', '...oyywyyyyo....', '...oyywwyyoo....', '....oyyyyyo.....',
      '.....ooooo......',
    ]),
    plain([
      '................', '................', '.......o........', '......oo...o....',
      '..o..oyo..oo....', '..oo.oyyooyo....', '...ooyyyyyyo....', '..oyyywwyyyoo...',
      '..oyywwwwyyyo...', '..oyywwwwwyyo...', '..ooyywwwyyoo...', '...ooyyyyyoo....',
      '....oooooooo....',
    ]),
    plain([
      '....o.......o...', '...o.....o..o...', '...oo...oo..o...', '..o.oo..o.oo....',
      '..o..o.....o....', '.o...o..o...o...', '.o......o....o..', '..o..r......o...',
      '..r...r...r.r...', '...r.....r..r...', '....r..r........', '....rr...rr.....',
      '......rrr.......',
    ]),
  ];
  S.spark = plain([
    'w..w..w.', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', 'w..w..w.',
  ]);
  S.flame = [
    plain(['...o....', '..oyo...', '.oyyo.o.', '.oywyoo.', 'oyywwyo.', 'oyywwyyo', '.oyyyyo.', '..oooo..']),
    plain(['....o...', '.o.oyo..', '.ooyyo..', '.oyywyo.', 'oyywwyyo', 'oyywwyyo', '.oyyyyo.', '..oooo..']),
  ];

  return { S, draw, make, plain, compose, whiteOf, stoneOf, canvas, paint, fromCanvas: (c, outline = true) => finish(c, outline) };
})();
