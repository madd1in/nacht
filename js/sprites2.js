// Gegner- und Boss-Sprites.
'use strict';

(() => {
  const { S, make, plain, canvas } = Sprites;
  const mirror = (rows) => rows.map(r => r + r.split('').reverse().join(''));
  const swapLegs = (rows, from, legs) => rows.slice(0, from).concat(legs);

  function scale2(spr) {
    const c = canvas(spr.c.width * 2, spr.c.height * 2);
    const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    x.drawImage(spr.c, 0, 0, c.width, c.height);
    const f = canvas(c.width, c.height);
    const fx = f.getContext('2d');
    fx.translate(c.width, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
    return { w: spr.w * 2, h: spr.h * 2, c, f, pad: spr.pad * 2, white: null };
  }

  // ---------- Ghul (Zombie) ----------
  const ghul = [
    '......EEEE......', '.....EeeeeE.....', '....EeeeeeeE....', '....EerEerEE....',
    '....EeeeeeeE....', '....EeEkkkeE....', '.....EeeeeE.....', '......EEEE......',
    '.....vvvvvv.....', '....vvvvvvveeee.', '...vvUvvvvveeee.', '...vvUvvvvv.....',
    '...vvUvvvvv.....', '...vvvvvvvv.....', '....vvUvvvv.....', '....vvvvvvv.....',
    '....UUUUUUU.....', '....UUU.UUU.....', '....UUU..UUU....', '....UUU..UUU....',
    '...UUU....UUU...', '...UUU....UUU...', '...EEE....EEE...', '...EEE....EEE...',
    '..EEEE....EEEE..',
  ];
  S.ghul = [make(ghul), make(swapLegs(ghul, 17, [
    '.....UUUUU......', '.....UUUUU......', '......UUUU......', '......UUUU......',
    '.....UUU.UU.....', '.....UUU.UU.....', '.....EEE.EEE....', '.....EEE.EEE....',
  ]))];

  // ---------- Fledermaus ----------
  S.bat = {
    perch: make([
      '.....v..v.......', '.....vPPv.......', '....vrPPrv......', '....vPPPPv......',
      '....vPPPPv......', '...vPvPPvPv.....', '...vv.vv.vv.....', '.......v........',
    ]),
    fly: [
      make([
        'v..............v', 'vv............vv', 'vPv...v..v...vPv', '.vPv..vPPv..vPv.',
        '..vPPvrPPrvPPv..', '...vPPPPPPPPv...', '.....vPPPPv.....', '......v..v......',
      ]),
      make([
        '......v..v......', '.....vPPPPv.....', '..vvvvrPPrvvvv..', '.vPPPPPPPPPPPPv.',
        'vPPv..vPPv..vPPv', 'vPv....vv....vPv', 'v..............v', '................',
      ]),
    ],
  };

  // ---------- Flammenschädel ----------
  const skullBody = [
    '....wwwwwwww....', '...wwwwwwwwww...', '..wwWWwwwwWWww..', '..wwkkWwwWkkww..',
    '..wwkkrwwrkkww..', '..wwwWwwwwWwww..', '...wwwwkkwwww...', '....wWwwwwWw....',
    '....wkwkwkwk....', '.....wwwwww.....',
  ];
  S.skull = [
    make(['....o..o..o.....', '...oyo.oy.oyo...', '...oyooyyooyo...', '....oyyyyyyo....', ...skullBody]),
    make(['.....o..o..o....', '..o.oyo.yo.yo...', '...ooyyoyyoyo...', '....oyyyyyyo....', ...skullBody]),
  ];

  // ---------- Skelett ----------
  const skel = [
    '......wwww......', '.....wwwwww.....', '.....wkwwkw.....', '.....wrwwrw.....',
    '......wwww......', '......wkkw......', '.......ww.......', '.....wwwwww.....',
    '....w.wwww.w....', '....w.wWWw.w....', '...w..wwww..w...', '...w..wWWw..ww..',
    '...ww.wwww......', '.......ww.......', '......wwww......', '.....ww..ww.....',
    '.....w....w.....', '.....w....w.....', '.....w....w.....', '.....W....W.....',
    '.....w....w.....', '.....w....w.....', '....ww....ww....',
  ];
  S.skel = [make(skel), make(swapLegs(skel, 15, [
    '.....wwwww......', '......ww.w......', '......w..w......', '.....w...w......',
    '.....W....W.....', '....w.....w.....', '....w......w....', '...ww......ww...',
  ]))];
  S.skelThrow = make(swapLegs([
    '......wwww...ww.', '.....wwwwww..ww.', '.....wkwwkw.w...', '.....wrwwrw.w...',
    '......wwww..w...', '......wkkw.w....', '.......ww..w....', '.....wwwwwww....',
    '....w.wwww......', '....w.wWWw......', '...w..wwww......', '...w..wWWw......',
    '...ww.wwww......', '.......ww.......', '......wwww......',
  ], 15, skel.slice(15)));
  S.bone = make([
    'ww......', 'wwW.....', '.Www....', '..www...', '...wwW..', '....Www.', '.....ww.',
  ]);
  S.giant =[scale2(S.skel[0]), scale2(S.skel[1]), scale2(S.skelThrow)];

  // ---------- Ritter ----------
  const knight = [
    '.......rr.......', '......rrr.......', '.....WWWWWW.....', '....WWWWWWWW....',
    '....WgggggWW....', '....WkkkkkWW....', '....WWWWWWWW....', '.....WWWWWW.....',
    '...gggWWWWggg...', '..gWWWgWWgWWWg..', '..gWWWWggWWWWg.w', '.uuuWWWWWWWWWgww',
    'uuuuuWWWWWWWWgw.', 'uuyuuWWWWWWWWg..', 'uyyyuggggggggg..', 'uuyuuWWWWWWWW...',
    'uuuuugWWWWWWg...', '.uuu.gWWWWWWg...', '.....gWWg.gWWg..', '.....gWWg.gWWg..',
    '.....gWWg..gWWg.', '....gWWg...gWWg.', '....gWWg...gWWg.', '...ggggg...ggggg',
  ];
  S.knight = [make(knight), make(swapLegs(knight, 18, [
    '......gWWggWWg..', '......gWWggWWg..', '.......gWWWWg...', '.......gWWWWg...',
    '......gWWggWWg..', '......gWWggWWg..', '.....ggggg.gggg.',
  ]))];

  // ---------- Sumpfmann ----------
  const fish = [
    '......nnnn......', '.....nnnnnn.l...', '....nnnnnnnnl...', '....nNrnnrnnl...',
    '....nnnnnnnn....', '....nNwnwnnN....', '.....nnnnnn.....', '......nnnn......',
    '....lnnnnnnl....', '...lnnNnnnnnl...', '...nnnNnnnnnnn..', '...nn.nNnnnn.nn.',
    '...nn.nnnnnn.nn.', '..nnn.nnnNnn.nnn', '.......nnnn.....', '......NNNNNN....',
    '.....nnn..nnn...', '.....nnn..nnn...', '.....nnn..nnn...', '....nnn....nnn..',
    '....nnn....nnn..', '...lllll..lllll.',
  ];
  S.fish = [make(fish), make(swapLegs(fish, 16, [
    '......nnnnn.....', '......nnnnn.....', '.......nnn......', '......nnnnn.....',
    '.....nnn.nnn....', '....lllllllll...',
  ]))];
  S.fishShoot = make([
    '......nnnn......', '.....nnnnnn.l...', '....nnnnnnnnl...', '....nNrnnrnnl...',
    '....nnnnnnnnnn..', '....nNwnwnnnooo.', '.....nnnnnnnn...', '......nnnn......',
    ...fish.slice(8),
  ]);

  // ---------- Projektile ----------
  S.fire = [
    plain(['..oo....', '.oyyo...', 'oyywyoo.', 'oywwyyyo', '.oyyoo..', '..oo....']),
    plain(['...oo...', '.ooyyo..', 'oyywyyo.', 'oywwyyoo', 'oyyyoo..', '.oo.....']),
  ];

  // ---------- Knochensäule ----------
  const dragonSkull = [
    '...wwwwww.......', '..wwWWWWwww.....', '.wwWwwwwwWww....', '.wWwwkkwwwwwww..',
    'wwWwkrrkwwwwwww.', 'wWwwwkkwwwwWWww.', 'wWwwwwwwwwWwwwww', 'wWWwwwwwwwwkwkwk',
    '.wWWWwwwwwwwwwww', '..wWWWWwwwwwkwk.', '...wwwwwwwwwww..', '....wwwwwwwww...',
    '.....WWWWWWW....', '....WgWgWgWgW...', '....gWgWgWgWg...', '.....ggggggg....',
  ];
  S.pillar = make([...dragonSkull, ...dragonSkull]);
  S.pillarOpen = make([...dragonSkull.slice(0, 7), 'wWWwwwwwwwwk....', '.wWWWwwwwwwwoyo.',
    '..wWWWWwwwwkoyyo', ...dragonSkull.slice(10), ...dragonSkull]);

  // ---------- Boss 1: Riesenfledermaus (48x24) ----------
  const gbatUp = mirror([
    'v.......................', 'vv......................', 'vPv.....................', 'vPPv....................',
    '.vPPv...................', '.vPPPv..................', '.vPPPPv.................', '..vPPPPv..........v.....',
    '..vPPPPPv........vPv....', '..vPPPPPPv......vPPvv...', '...vPPPPPPvv...vPPPPPv..', '...vPPPPPPPPvvvPPPPPPPv.',
    '....vPPPPPPPPPPPPPPPPPPv', '....vPPPvPPPPPPPPPrrPPPP', '.....vPv.vPPPPPPPPrrPPPP', '.....vv...vPPPPPPPPPPPPP',
    '...........vvPPPPPPPPPwP', '.............vvPPPPPPPPP', '...............vvPPPPPPP', '.................vPPPPPP',
    '..................vvPPPP', '....................vvPP', '......................vv',
  ]);
  const gbatDown = mirror([
    '........................', '........................', '..................v.....', '.................vPv....',
    '................vPPvv...', '...............vPPPPPv..', '..............vPPPPPPPv.', '.....vvvvvvvvvPPPPPPPPPv',
    '...vvPPPPPPPPPPPPPPPrrPP', '..vPPPPPPPPPPPPPPPPPrrPP', '.vPPPPPPPPPPPPPPPPPPPPPP', 'vPPPPvvPPPPPPPPPPPPPPPwP',
    'vPPv...vvPPPPPPPPPPPPPPP', 'vPv......vvPPPPPPPPPPPPP', 'vv.........vPPPPPPPPPPPP', 'v...........vPPPPPPPPPPP',
    '.............vvPPPPPPPPP', '...............vvPPPPPPP', '.................vPPPPPP', '..................vvPPPP',
    '....................vvPP', '......................vv',
  ]);
  S.gbat = [make(gbatUp), make(gbatDown)];

  // ---------- Boss 3: Graf Nachtmahr (24x40) ----------
  const head = [
    '.........GGG', '........GGGG', '.......GGGGG', '......GGGWWW', '......GGWWWW',
    '......GGWrkW', '......GGWWWW', '.......GWWWk', '........WwWW', '.........WWW',
  ];
  const closed = mirror([
    ...head,
    '....vvvv.mww', '...vPPPvvmww', '..vPPPPPvmww', '..vPPPPPPvww', '..vPPPPPPPvy',
    '.vPPPPPPPPPv', '.vPPPPPPPPPP', '.vPPPPPPPPPP', '.vPPPPPPPPPP', '.vPPPPPPPPPP',
    '.vPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP',
    'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP',
    'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPPPP', 'vPPPPPPPPGGG',
    'vPPPPPPPPGGG', 'vPPPPPPPPkkk', 'vvvvvvvvvkkk', '............', '............',
  ]);
  const open = mirror([
    ...head,
    '....vvvv.mww', 'vv.vPPPvvmww', 'vPvvmmmmvmww', 'vPPmmmmmmGww', 'vPPmmmmmmGwy',
    'vPPmmmmmmGGw', 'vPPmmmmmmGGG', 'vPPmmmmmmGGG', 'vPPmmmmmmGGG', 'vPPmmmmmmGGG',
    'vPPmmmmmmGGG', 'vPPmmmmmmGGG', '.vPmmmmmmGGG', '.vPmmmmmmyyy', '.vPmmmmmmGGG',
    '.vPmmmmmmGGG', '.vPPmmmmmGGG', '..vPmmmmmGG.', '..vPmmmmmGG.', '..vPPmmmmGG.',
    '..vPPmmmmGG.', '...vPmmmmGG.', '...vPPmmmGG.', '...vPPmmmGG.', '....vPmmmGG.',
    '....vPPmmGG.', '....vPPmmkk.', '.....vvvvkk.', '............', '............',
  ]);
  S.count = { closed: make(closed), open: make(open) };
})();
