// Spielbare Helden: handgezeichneter Kopf/Oberkörper + aus Gelenkwinkeln berechnete Beine.
// Alle Frames sind 20x32 (2px Rand je Seite für weit ausgestellte Beine, Feld .mx = 2).
'use strict';

const HEROES = (() => {
  const R = d => d * Math.PI / 180;

  // ---------------- Henrik Morgenstern (Vampirjäger mit Mantel & Peitsche) ----------------
  const HENRIK = {
    id: 'henrik', name: 'HENRIK', title: 'VAMPIRJÄGER', weapon: 'whip',
    desc: ['MORGENSTERN-PEITSCHE', 'GROSSE REICHWEITE'],
    pal: { h: '#8c3c10', D: '#401808', A: '#e08850', F: '#9c2420', I: '#e04c34', J: '#4a0a0c', L: '#d4bc88',
      K: '#3a2418', M: '#86603c', O: '#34344e', Q: '#60608c', V: '#24243a', B: '#5c2c0c', y: '#f8b800', Y: '#fce0a8' },
    head: ['......DDhhD.....', '....DDhhhhhhD...', '...DhhhhhhhhAD..', '...DhhhhhhhhhAh.', '...DhhhhhssssAh.',
      '...DhhhhsssksS..', '...DDhhhsssssss.', '....DhhhSssSs...', '....DDhhJSSs....'],
    hurtRow: '....DhhhSskks...',
    torso: {
      idle: ['....JFFILLFI....', '...JFFFILLFII...', '...JJFFFLLJFI...', '...JJFFFLLJFI...', '...JJFFFLLJFI...', '...KKFFFLLJMK...', '...JBBBByYBKK...'],
      fwd: ['....JFFILLFI....', '...JFFFILLFII...', '..JJFFFFLLFIII..', '.JJ.JFFFLLF.III.', 'KK..JFFFLLF..MK.', 'KK..JFFFLLF..KK.', '...JBBBByYBB....'],
      back: ['....JFFILLFI....', '...JFFFILLFI....', '..JIIFFFLLFI....', '.JII.FFFLLFI....', '.MK..FFFLLFI....', '.KK..FFFLLFI....', '...JBBBByYBB....'],
      bare: ['....JFFILLFI....', '...JFFFILLFI....', '...JJFFFLLFI....', '...JJFFFLLFI....', '...JJFFFLLFI....', '...KKFFFLLFI....', '...JBBBByYBBB...'],
    },
    hip: ['...JFFFFFFFFI...', '...JFFFFFFFFI...', '...JFFFFFFFFI...'],
    armMap: {}, skirt: 'coat',
    leg: { front: ['O', 'O', 'Q'], back: ['V', 'O', 'O'] }, bootC: { base: 'K', hi: 'M' },
    scarf: { a: PAL.r, b: PAL.m, d: PAL.R, w: 2 },
    icon: ['..hhh..', '.hhhhh.', 'hhsssh.', 'hhsksk.', '.hssss.', '..sss..'],
    iconPal: { h: '#8c3c10', s: '#fcbca0', k: '#000' },
  };

  // ---------------- Ragnor vom Nordland (Barbar mit Breitschwert) ----------------
  const RAGNOR = {
    id: 'ragnor', name: 'RAGNOR', title: 'BARBAR AUS DEM NORDEN', weapon: 'sword',
    desc: ['BREITSCHWERT', 'WEITER HIEBBOGEN'],
    pal: { h: '#1c1424', D: '#08040c', A: '#4c3c64', s: '#e09868', S: '#a45a32', E: '#fcc89c', r: '#c81c1c', R: '#7c0c0c',
      F: '#8c6440', J: '#4c3018', I: '#c8a070', K: '#5c3c20', M: '#a07848', B: '#3c2410', y: '#f8b800', Y: '#fce0a8', k: '#000' },
    head: ['.....DDhhhD.....', '...DDhhhhhhhD...', '..DhhhhhhhhhAD..', '..DhhRrrrrrrrr..', '.DhhhhhhsssssS..',
      '.DhhhhhSsskssS..', '.DhhhhhSsssssss.', 'DhhhhhhSSsSSs...', 'DhhhDhhSsSSS....'],
    hurtRow: 'DhhhhhhSSkkSs...',
    torso: {
      idle: ['..SsssEEssssS...', '.SsEEsssFssEsS..', '.SsEssEFFsssEsS.', '.SSsEsFFsSsssS..', '.SSssFFssSssEsS.', '.KKssFsSssSsKKS.', '..JBBBByYBBBKK..'],
      fwd: ['..SsssEEssssS...', '.SsEEsssFssEssE.', 'SSsEssEFFssssEEs', 'S.SsEsFFsSs..sEs', 'KK.SsFFssSs..KKs', 'ss.SsFsSssS..ss.', '..JBBBByYBBB....'],
      back: ['..SsssEEssssS...', '.SsEEsssFssEsS..', 'sEEsssEFFsssEsS.', 'sEs.EsFFsSsssS..', 'KK..sFFssSssS...', 'ss..sFsSssSsS...', '..JBBBByYBBB....'],
      bare: ['..SsssEEssssS...', '.SsEEsssFssEsS..', '.SsEssEFFsssEsS.', '.SSsEsFFsSsssS..', '.SSssFFssSssS...', '.KKssFsSssSsS...', '..JBBBByYBBB....'],
    },
    hip: ['...JFFIFFIFFJ...', '....JFFIFFFJ....', '.....JFFIFJ.....'],
    armMap: { I: 'E', F: 's', J: 'S', M: 's', K: 'K' }, skirt: 'loin',
    leg: { front: ['S', 's', 'E'], back: ['S', 'S', 's'] }, bootC: { base: 'J', hi: 'I' },
    scarf: { a: '#8c6440', b: '#c8a070', d: '#4c3018', w: 3 },
    icon: ['..hhh..', '.hhhhh.', 'hrrrrr.', 'hhsksk.', 'hhssss.', '.hsss..'],
    iconPal: { h: '#1c1424', r: '#c81c1c', s: '#e09868', k: '#000' },
  };

  // Arm-Overlays [x, y, Zeichen] im 16er-Raster des Oberkörpers
  const ARM = {
    atk1: [[1, 3, 'M'], [2, 3, 'K'], [1, 4, 'K'], [2, 4, 'K'], [2, 5, 'I'], [3, 5, 'F'], [3, 6, 'I'], [4, 6, 'F'], [4, 7, 'I'], [5, 7, 'F'], [5, 8, 'I'], [6, 8, 'F'], [6, 9, 'I'], [7, 9, 'F']],
    atk2: [[12, 0, 'M'], [13, 0, 'K'], [12, 1, 'K'], [13, 1, 'K'], ...[2, 3, 4, 5, 6, 7, 8].flatMap(r => [[12, r, 'F'], [13, r, 'I']])],
    atk3: [[10, 8, 'F'], [11, 8, 'F'], [12, 8, 'I'], [13, 8, 'I'], [10, 9, 'J'], [11, 9, 'F'], [12, 9, 'F'], [13, 9, 'F'], [14, 7, 'M'], [15, 7, 'K'], [14, 8, 'K'], [15, 8, 'K'], [14, 9, 'K']],
    hurt: [[1, 0, 'M'], [2, 0, 'K'], [1, 1, 'K'], [2, 1, 'K'], [13, 0, 'M'], [14, 0, 'K'], [13, 1, 'K'], [14, 1, 'K'],
      [2, 2, 'I'], [3, 3, 'I'], [3, 4, 'F'], [4, 5, 'F'], [13, 2, 'I'], [12, 3, 'I'], [12, 4, 'F'], [11, 5, 'F']],
  };

  function build(def) {
    const HP = Object.assign({}, PAL, def.pal);
    const mapArm = (ch) => def.armMap[ch] || ch;

    // legs: [[thigh, knee] vorderes Bein, [thigh, knee] hinteres Bein] in Grad
    function frame({ torso = 'idle', arm = null, legs, air = false, crouch = false, bob = 0, blink = false, flare = 0, hurtFace = false }) {
      const Wd = 20, H = 32, mx = 2;
      const g = Array.from({ length: H }, () => Array(Wd).fill('.'));
      const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < Wd && y >= 0 && y < H) g[y][x] = ch; };
      const HIP = 17;
      const legGeo = ([th, kn], hx) => {
        const kx = hx + Math.sin(R(th)) * 6, ky = Math.cos(R(th)) * 6, ph = th - kn;
        return { hx, kx, ky, ax: kx + Math.sin(R(ph)) * 6, ay: ky + Math.cos(R(ph)) * 6 };
      };
      const front = legGeo(legs[0], 8.5 + mx), back = legGeo(legs[1], 7 + mx);
      const yOff = crouch ? 8 : air ? 0 : Math.round(29 - Math.max(front.ay, back.ay)) - HIP;
      const hipY = HIP + yOff;
      const limb = (x0, y0, x1, y1, c) => {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4);
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
          put(x - 1, y, c[0]); put(x, y, c[1]); put(x + 1, y, c[2]);
        }
      };
      const boot = (ax, ay, lit) => {
        const x = Math.round(ax), y = Math.round(ay), b = def.bootC.base, hi = def.bootC.hi;
        for (let i = -1; i <= 1; i++) put(x + i, y, i === 1 && lit ? hi : b);
        for (let i = -1; i <= 2; i++) put(x + i, y + 1, i === 2 ? hi : b);
        for (let i = -1; i <= 3; i++) put(x + i, y + 2, b);
      };
      const drawLeg = (L, c, lit) => {
        limb(L.hx, hipY, L.kx, hipY + L.ky, c);
        limb(L.kx, hipY + L.ky, L.ax, hipY + L.ay, c);
        boot(L.ax, hipY + L.ay, lit);
      };
      drawLeg(back, def.leg.back, false);
      drawLeg(front, def.leg.front, true);
      const ty = yOff + bob;
      const head = def.head.map((r, i) => (i === 5 && blink) ? r.replace('k', 'S') : (i === 7 && hurtFace) ? def.hurtRow : r);
      [...head, ...def.torso[torso], ...def.hip].forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') put(x + mx, y + ty, ch); }));
      if (arm) ARM[arm].forEach(([x, y, ch]) => put(x + mx, y + ty, mapArm(ch)));
      if (def.skirt === 'coat') { // Mantelsaum über den Oberschenkeln (flattert nach hinten)
        for (let i = 0; i < 4; i++) {
          const y = ty + 19 + i, bs = 3 - Math.round(flare * (i + 1) / 4);
          for (let x = bs; x <= 7; x++) put(x + mx, y, x === bs ? 'J' : 'F');
          if (i < 3) for (let x = 10; x <= 12; x++) put(x + mx, y, x === 12 ? 'I' : 'F');
        }
      } else { // Fell-Lendenschurz: vorne Lappen, hinten flatterndes Fell
        for (let i = 0; i < 3; i++) {
          const y = ty + 19 + i;
          for (let x = 7; x <= 10 - i; x++) put(x + mx, y, x === 7 ? 'J' : (x + i) % 3 ? 'F' : 'I');
          const bs = 4 - Math.round(flare * (i + 1) / 3);
          if (i < 2) for (let x = bs; x <= 6; x++) put(x + mx, y, x === bs ? 'J' : 'F');
        }
      }
      const spr = Sprites.make(g.map(r => r.join('')), HP);
      spr.mx = mx;
      return spr;
    }

    const STAND = [[5, 3], [-5, 3]], STANCE = [[20, 8], [-20, 8]], CROUCH = [[72, 140], [-12, 105]];
    const TH = [22, 10, -2, -14, -24, -8, 12, 24], KN = [4, 8, 6, 10, 18, 55, 50, 20];
    const walkLegs = i => [[TH[i], KN[i]], [TH[(i + 4) % 8], KN[(i + 4) % 8]]];
    const walkTorso = i => (i === 7 || i === 0 || i === 1) ? 'back' : (i === 3 || i === 4 || i === 5) ? 'fwd' : 'idle';
    const FLARE = [1, 2, 2, 1, 1, 2, 2, 1];
    const STAIR_UP = [[[45, 75], [-8, 2]], [[12, 35], [-6, 6]]];
    const STAIR_DOWN = [[[25, 0], [-15, 50]], [[8, 10], [-8, 25]]];
    const atk = (legs, opts = {}) => ['atk1', 'atk2', 'atk3'].map(a => frame({ torso: 'bare', arm: a, legs, ...opts }));

    const H = {
      def,
      idle: [frame({ legs: STAND }), frame({ legs: STAND, bob: 1 })],
      blink: frame({ legs: STAND, blink: true }),
      walk: Array.from({ length: 8 }, (_, i) => frame({ torso: walkTorso(i), legs: walkLegs(i), flare: FLARE[i] })),
      jumpUp: frame({ torso: 'fwd', legs: [[55, 95], [10, 80]], air: true, flare: 1 }),
      jumpFall: frame({ torso: 'back', legs: [[20, 25], [-25, 30]], air: true, flare: 3 }),
      land: frame({ legs: [[38, 75], [-18, 62]], flare: 1 }),
      crouch: frame({ legs: CROUCH, crouch: true }),
      stairUp: STAIR_UP.map(l => frame({ legs: l, torso: 'fwd' })),
      stairDown: STAIR_DOWN.map(l => frame({ legs: l, torso: 'back' })),
      hurt: frame({ torso: 'bare', arm: 'hurt', legs: [[25, 45], [-30, 30]], air: true, flare: 3, hurtFace: true }),
      atk: atk(STANCE), catk: atk(CROUCH, { crouch: true }), satkUp: atk(STAIR_UP[0]), satkDown: atk(STAIR_DOWN[0]),
      dead: def.skirt === 'coat' ? Sprites.make([
        '................................', '..........JFFFFFFFFFI...........', '...DhhD..JFFFFFFFFFFFOOOOOOOKKM.',
        '.DhhhhhSJFFFFLLFFFFFFOOOOOOOKKMM', '.DhhhhSSSJFFFLLFFFFFBOOOOOOOKKMM', '..DhhSSS.JFFFFFFFFFFFOOOOOOOKKM.',
        '....DD....JJJJJJJJJJ............',
      ], HP) : Sprites.make([
        '................................', '..DhhhhD.......JFFIJ............', 'DhhhhhhhhSsssssssEsBsssssssssJJI.',
        'DhhhhRrrSSssEsssssssBFssssssssJJII', '.DhhhhhhSsssssSsssssBsssssssssJJI.', '..DhhD..SSSSSSSSSSSSSSSSSSSS......',
      ].map(r => r.slice(0, 32)), HP),
    };
    H.stand = H.idle[0];
    return H;
  }

  const list = [HENRIK, RAGNOR];
  const built = {};
  list.forEach(d => { built[d.id] = build(d); });
  Sprites.S.heroes = built;
  Sprites.S.hero = built.henrik;
  return { list, get: (id) => built[id] || built.henrik };
})();
