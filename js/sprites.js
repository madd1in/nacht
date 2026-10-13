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

  function canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
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

  function finish(c) {
    const f = canvas(c.width, c.height);
    const fx = f.getContext('2d');
    fx.translate(c.width, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
    return { w: c.width, h: c.height, c, f, white: null };
  }

  // layers: [{rows, x, y}] -> sprite
  function compose(w, h, layers, pal) {
    const c = canvas(w, h);
    const x = c.getContext('2d');
    layers.forEach(l => paint(x, l.rows, l.x || 0, l.y || 0, pal));
    return finish(c);
  }

  function make(rows, pal) {
    const w = Math.max(...rows.map(r => r.length));
    return compose(w, rows.length, [{ rows }], pal);
  }

  function whiteOf(spr) {
    if (spr.white) return spr.white;
    const mk = (src) => {
      const c = canvas(spr.w, spr.h);
      const x = c.getContext('2d');
      x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = '#fcfcfc'; x.fillRect(0, 0, spr.w, spr.h);
      return c;
    };
    spr.white = { c: mk(spr.c), f: mk(spr.f) };
    return spr.white;
  }

  // Zeichnet Sprite; x/y = linke obere Ecke (Bildschirm). flip = nach links schauen.
  function draw(ctx, spr, x, y, flip = false, flash = false) {
    if (!spr) return;
    let img = flip ? spr.f : spr.c;
    if (flash) { const w = whiteOf(spr); img = flip ? w.f : w.c; }
    ctx.drawImage(img, Math.round(x), Math.round(y));
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
    make(['...y....', '..yoy...', '..yoy...', '...o....', ...candleBase]),
    make(['....y...', '...oy...', '..yoy...', '...o....', ...candleBase]),
  ];
  const torchBase = [
    'yyyyyyyyyyyy', '.yggggggggy.', '..gggggggg..', '...gggggg...', '....gggg....',
    '.....gg.....', '.....gg.....', '.....gg.....', '.....gg.....', '.....gg.....',
    '.....gg.....', '.....gg.....', '....gggg....', '...gggggg...',
  ];
  S.torch = [
    make(['.....o......', '....oyo..o..', '...oyyyo.o..', '..oyywyyoo..', '..oyywwyyo..', '...oyyyyo...', ...torchBase]),
    make(['......o.....', '..o..oyo....', '..o.oyyyo...', '..ooyywyyo..', '..oyywwyyo..', '...oyyyyo...', ...torchBase]),
  ];

  // ---------------- Effekte ----------------
  S.burst = [
    make([
      '................', '................', '................', '................',
      '................', '......o.........', '.....ooo..o.....', '....oyyoo.oo....',
      '...ooyyyooyo....', '...oyywyyyyo....', '...oyywwyyoo....', '....oyyyyyo.....',
      '.....ooooo......',
    ]),
    make([
      '................', '................', '.......o........', '......oo...o....',
      '..o..oyo..oo....', '..oo.oyyooyo....', '...ooyyyyyyo....', '..oyyywwyyyoo...',
      '..oyywwwwyyyo...', '..oyywwwwwyyo...', '..ooyywwwyyoo...', '...ooyyyyyoo....',
      '....oooooooo....',
    ]),
    make([
      '....o.......o...', '...o.....o..o...', '...oo...oo..o...', '..o.oo..o.oo....',
      '..o..o.....o....', '.o...o..o...o...', '.o......o....o..', '..o..r......o...',
      '..r...r...r.r...', '...r.....r..r...', '....r..r........', '....rr...rr.....',
      '......rrr.......',
    ]),
  ];
  S.spark = make([
    'w..w..w.', '.w.w.w..', '..www...', 'wwwwwww.', '..www...', '.w.w.w..', 'w..w..w.',
  ]);
  S.flame = [
    make(['...o....', '..oyo...', '.oyyo.o.', '.oywyoo.', 'oyywwyo.', 'oyywwyyo', '.oyyyyo.', '..oooo..']),
    make(['....o...', '.o.oyo..', '.ooyyo..', '.oyywyo.', 'oyywwyyo', 'oyywwyyo', '.oyyyyo.', '..oooo..']),
  ];

  return { S, draw, make, compose, whiteOf, canvas, paint };
})();
