// 16-Bit-Figuren (Richtung Super Castlevania IV): ein Skelett aus Gelenkwinkeln, Arme und Beine als rund
// schattierte „Kapseln“, handgepixelte Köpfe. Dasselbe Rig baut die Helden UND die menschenähnlichen Gegner.
// Frames 34x36, Körpermitte x=17, Sohle y=35 (Feld .mx = 9 → Körpermitte liegt auf der Hitbox-Mitte).
'use strict';

const HEROES = (() => {
  const R = d => d * Math.PI / 180;
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  const FW = 34, FH = 36, CX = 17, MX = 9, HIP = 20, THIGH = 7, SHIN = 7, UPPER = 5.4, FORE = 5.2;

  const RAMP = {
    skin: ['#4c2414', '#8c4a2a', '#c27a4e', '#e8a676', '#fcd2ac'],
    skinTan: ['#3c1c10', '#7c3c20', '#b4683c', '#dc945c', '#f8c08c'],
    leather: ['#1c0c06', '#3c1c0c', '#623214', '#8c4e22', '#b8763c'],
    steel: ['#1c1c2c', '#3c3c58', '#6c6c8c', '#a4a4c4', '#e8e8f8'],
    cloth: ['#2c0610', '#5c0c1c', '#8c1428', '#c42838', '#ec6060'],
    trousers: ['#120e1a', '#241c34', '#3a2e52', '#564874', '#76689a'],
    fur: ['#241c14', '#463a2a', '#6c5c46', '#9a866a', '#c4b090'],
    gold: ['#3c2400', '#7c5000', '#b88018', '#f0c040', '#fcf0a0'],
    bone: ['#3c3428', '#7c7058', '#b4a888', '#dcd4b8', '#fcfcf0'],
    zombie: ['#1c2c14', '#3c5428', '#5c7c3c', '#88a45c', '#b4cc88'],
    rags: ['#1c140c', '#3c2c1c', '#5c4430', '#806448', '#a4886c'],
    fish: ['#0c2c24', '#145c40', '#2c8c58', '#58b478', '#a4e4a0'],
    belly: ['#3c4c14', '#6c7c28', '#a4ac48', '#d4d478', '#f4f4b4'],
    shield: ['#0c1444', '#1c2c84', '#2c48c4', '#5c7cf4', '#a4bcfc'],
  };

  // ---------------- Köpfe (10x10, Blick nach rechts) ----------------
  const HEAD = {
    henrik: ['...1122...', '..122332..', '.12233322.', '.1RRrrrrrr', '12221aasL.', '1221asesL.', '1222aassLL', '122.asssm.', '12...aas..', '.1....as..'],
    ragnor: ['..11221...', '.1222221..', '1222222221', '.1RRrrrrrr', '12221aasL.', '1221asesL.', '1222aassLL', '122.1sss1.', '12..111m1.', '1....11...'],
    skull: ['...wwww...', '..wWWWWw..', '.wWWWWWWw.', '.wWWWkkWw.', '.wWWWkkWW.', '..wWWWWwWW', '..wwWkWkw.', '...wWWWWw.', '...wkwkw..', '....www...'],
    helmet: ['....rrR...', '..sSSSsr..', '.sSSSSSSs.', '.sSSSSSSSs', '.sSSkkkkSs', '.sSSSSSSSs', '.sSSSSkSSs', '..sSSSSSs.', '...ssssss.', '....sss...'],
    zombie: ['..1121....', '.122g21...', '.gggggg2..', '1ggGGGGg..', '1gggkGGG..', '.ggGGrGGG.', '.gggGGGGG.', '..ggGmmG..', '...gGGG...', '....gg....'],
    fish: ['..rr......', '.rRrg.....', '.rgggggg..', 'rgGGGGGGg.', 'rgGGwkGGGg', '.gGGwwGGGG', '.gGGGGGmmm', '..gGGGGGG.', '...gggg...', '....gg....'],
  };
  const EYE_ROW = 5;

  const HENRIK = {
    id: 'henrik', head: 'henrik', name: 'HENRIK', weapon: 'whip', blink: 's', hurtRow: '1221aaasL.',
    headPal: { 1: '#2c1408', 2: '#6c3816', 3: '#a46430', R: '#5c0c14', r: '#c82030', a: '#a85c34', s: '#e09a68', L: '#fcd0a4', e: '#180808', m: '#8c3c24' },
    skin: RAMP.skin, arm: { r: 1.8, bracer: RAMP.leather }, thigh: RAMP.trousers, boot: RAMP.leather,
    flap: RAMP.leather, sash: RAMP.cloth, flapTrim: RAMP.gold, torso: 'vest', pauldron: true, strap: true, belt: true,
    scarf: { a: '#6c3816', b: '#a46430', d: '#2c1408', w: 3 }, // lange Haare (Kette hinter dem Kopf)
    icon: ['..111..', '.12221.', 'rrrrrr.', '1aesL..', '1asss..', '..ss...'],
    iconPal: { 1: '#2c1408', 2: '#6c3816', r: '#c82030', a: '#a85c34', s: '#e09a68', L: '#fcd0a4', e: '#000' },
  };
  const RAGNOR = {
    id: 'ragnor', head: 'ragnor', name: 'RAGNOR', weapon: 'sword', blink: 's', hurtRow: '1221aaasL.',
    headPal: { 1: '#08040c', 2: '#241c30', 3: '#3c3450', R: '#5c0c14', r: '#c81c1c', a: '#9c5430', s: '#d88c5c', L: '#f4bc8c', e: '#100404', m: '#6c2c18' },
    skin: RAMP.skinTan, arm: { r: 2.1, bracer: RAMP.steel }, thigh: RAMP.skinTan, boot: RAMP.fur,
    flap: RAMP.fur, sash: RAMP.leather, flapTrim: RAMP.leather, torso: 'bare', strap: true, belt: true, backSword: true, mantle: true,
    scarf: { a: '#241c30', b: '#3c3450', d: '#08040c', w: 3 },
    icon: ['.1111..', '122221.', 'rrrrrr.', '1aesL..', '11sss..', '.111...'],
    iconPal: { 1: '#08040c', 2: '#241c30', r: '#c81c1c', a: '#9c5430', s: '#d88c5c', L: '#f4bc8c', e: '#000' },
  };
  // Menschenähnliche Gegner
  const MONSTERS = {
    skel: { head: 'skull', headPal: { w: '#9c9478', W: '#e8e0c8', k: '#140c08' }, skin: RAMP.bone, arm: { r: 1.05 }, thigh: RAMP.bone, boot: RAMP.bone,
      legR: 0.55, torso: 'ribs' },
    knight: { head: 'helmet', headPal: { s: '#3c3c58', S: '#a4a4c4', k: '#08080c', r: '#d82800', R: '#7c0c00' }, skin: RAMP.steel, arm: { r: 2.0, bracer: RAMP.gold },
      thigh: RAMP.steel, boot: RAMP.steel, flap: RAMP.steel, flapTrim: RAMP.gold, torso: 'armor', pauldron: true, belt: true, legR: 1.1, shield: true },
    ghoul: { head: 'zombie', headPal: { 1: '#140c08', 2: '#3c2c1c', g: '#3c5428', G: '#88a45c', k: '#0c1408', r: '#e82020', m: '#200808' }, skin: RAMP.zombie, arm: { r: 1.5 },
      thigh: RAMP.rags, boot: RAMP.zombie, flap: RAMP.rags, flapTrim: RAMP.rags, torso: 'rags', legR: 0.9 },
    fish: { head: 'fish', headPal: { g: '#145c40', G: '#58b478', w: '#fcfcfc', k: '#000', r: '#d82800', R: '#7c0c00', m: '#0c1c14' }, skin: RAMP.fish, arm: { r: 1.6 },
      thigh: RAMP.fish, boot: RAMP.fish, torso: 'scales', legR: 1 },
  };

  // ---------------- Malwerkzeug ----------------
  function painter() {
    const c = Sprites.canvas(FW, FH), x = c.getContext('2d');
    const P = (px, py, col) => { px = Math.floor(px); py = Math.floor(py); if (px >= 0 && py >= 0 && px < FW && py < FH) { x.fillStyle = col; x.fillRect(px, py, 1, 1); } };
    const shadeIdx = (l, n) => Math.round(cl((l + 0.3) / 1.45, 0, 1) * (n - 1));
    // Rund schattierte Kapsel (Licht von oben links), bias < 0 = Gliedmaße im Hintergrund
    const capsule = (ax, ay, bx, by, r0, r1, ramp, bias = 0) => {
      const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1, rm = Math.max(r0, r1) + 1;
      for (let py = Math.floor(Math.min(ay, by) - rm); py <= Math.ceil(Math.max(ay, by) + rm); py++) {
        for (let px = Math.floor(Math.min(ax, bx) - rm); px <= Math.ceil(Math.max(ax, bx) + rm); px++) {
          const cx = px + 0.5, cy = py + 0.5, t = cl(((cx - ax) * dx + (cy - ay) * dy) / L2, 0, 1);
          const r = r0 + (r1 - r0) * t, ox = cx - (ax + dx * t), oy = cy - (ay + dy * t), d = Math.hypot(ox, oy);
          if (d > r) continue;
          const nx = ox / r, ny = oy / r, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
          P(px, py, ramp[shadeIdx(-nx * 0.55 - ny * 0.5 + nz * 0.75 + bias, ramp.length)]);
        }
      }
    };
    const disc = (cx, cy, rx, ry, ramp, bias = 0) => {
      for (let py = Math.floor(cy - ry); py <= Math.ceil(cy + ry); py++) for (let px = Math.floor(cx - rx); px <= Math.ceil(cx + rx); px++) {
        const nx = (px + 0.5 - cx) / rx, ny = (py + 0.5 - cy) / ry, q = nx * nx + ny * ny;
        if (q > 1) continue;
        P(px, py, ramp[shadeIdx(-nx * 0.55 - ny * 0.6 + Math.sqrt(1 - q) * 0.7 + bias, ramp.length)]);
      }
    };
    return { c, x, P, capsule, disc, shadeIdx };
  }

  function ik(sx, sy, tx, ty, l1, l2, bend) {
    let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy);
    const maxd = l1 + l2 - 0.05;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    if (d < 0.5) d = 0.5;
    const base = Math.atan2(dy, dx), A = Math.acos(cl((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const e1 = [sx + Math.cos(base + A) * l1, sy + Math.sin(base + A) * l1], e2 = [sx + Math.cos(base - A) * l1, sy + Math.sin(base - A) * l1];
    const pick = bend === 'up' ? (e1[1] < e2[1] ? e1 : e2) : bend === 'fwd' ? (e1[0] > e2[0] ? e1 : e2) : bend === 'back' ? (e1[0] < e2[0] ? e1 : e2) : (e1[1] > e2[1] ? e1 : e2);
    return { e: pick, h: [sx + dx, sy + dy] };
  }
  const legGeo = ([th, kn], hx, hy) => {
    const kx = hx + Math.sin(R(th)) * THIGH, ky = hy + Math.cos(R(th)) * THIGH, ph = th - kn;
    return { hx, hy, kx, ky, ax: kx + Math.sin(R(ph)) * SHIN, ay: ky + Math.cos(R(ph)) * SHIN };
  };
  const armGeo = (spec, sx, sy) => {
    if (spec.t) { const r = ik(sx, sy, spec.t[0], spec.t[1], UPPER, FORE, spec.bend || 'down'); return { sx, sy, ex: r.e[0], ey: r.e[1], hx: r.h[0], hy: r.h[1] }; }
    const [a1, a2] = spec.a, ex = sx + Math.sin(R(a1)) * UPPER, ey = sy + Math.cos(R(a1)) * UPPER;
    return { sx, sy, ex, ey, hx: ex + Math.sin(R(a1 + a2)) * FORE, hy: ey + Math.cos(R(a1 + a2)) * FORE };
  };

  // pose: { legs:[[th,kn] vorne,[th,kn] hinten], fa/ba: Arm-Spezifikation, lean, bob, air, flare, blink, hurt, coil }
  function frame(def, pose) {
    const G = painter(), { P, capsule, disc, shadeIdx } = G, lr = def.legR || 1;
    const fL0 = legGeo(pose.legs[0], CX + 1, HIP), bL0 = legGeo(pose.legs[1], CX - 1, HIP);
    const low = Math.max(fL0.ay + 1.4, bL0.ay + 1.4, fL0.ky + 1.8, bL0.ky + 1.8);
    const yOff = pose.air ? 0 : Math.round(35 - low);
    const ty = yOff + (pose.bob || 0), lean = pose.lean || 0, hipY = HIP + yOff;
    const fL = legGeo(pose.legs[0], CX + 1 + lean * 0.3, hipY), bL = legGeo(pose.legs[1], CX - 1 + lean * 0.3, hipY);
    const shF = [CX + 2.6 + lean, 11.8 + ty], shB = [CX - 2.6 + lean, 11.8 + ty];
    const fA = armGeo(pose.fa, shF[0], shF[1]), bA = armGeo(pose.ba, shB[0], shB[1]);
    const ar = def.arm.r;

    const drawArm = (A, bias) => {
      capsule(A.sx, A.sy, A.ex, A.ey, ar, ar - 0.25, def.skin, bias);
      capsule(A.ex, A.ey, A.hx, A.hy, ar - 0.25, ar - 0.5, def.skin, bias);
      if (def.arm.bracer) {
        const bx = A.ex + (A.hx - A.ex) * 0.4, by = A.ey + (A.hy - A.ey) * 0.4;
        capsule(bx, by, A.hx - (A.hx - A.ex) * 0.12, A.hy - (A.hy - A.ey) * 0.12, ar - 0.05, ar - 0.15, def.arm.bracer, bias);
      }
      disc(A.hx, A.hy, Math.max(1.1, ar * 0.75), Math.max(1.1, ar * 0.75), def.skin, bias);
    };
    const drawLeg = (L, bias) => {
      capsule(L.hx, L.hy, L.kx, L.ky, 2.4 * lr, 1.8 * lr, def.thigh, bias);
      capsule(L.kx, L.ky, L.ax, L.ay, 1.8 * lr, 1.4 * lr, def.boot, bias);
      if (lr > 0.8) capsule(L.kx, L.ky, L.kx + (L.ax - L.kx) * 0.18, L.ky + (L.ay - L.ky) * 0.18, 2.15 * lr, 2.05 * lr, def.boot, bias + 0.25); // Stulpe
      capsule(L.ax - 0.5, L.ay + 0.2, L.ax + 2.6, L.ay + 0.8, 1.4 * Math.max(lr, 0.8), 1.2 * Math.max(lr, 0.8), def.boot, bias); // Fuß
      for (let k = -1; k <= 3; k++) P(L.ax + k, L.ay + 2, def.boot[0]); // Sohle
    };

    if (def.backSword) { // Schwert auf dem Rücken (Ragnor)
      capsule(CX - 6 + lean, 7 + ty, CX + 3 + lean, 22 + ty, 0.95, 0.95, RAMP.steel, -0.2);
      capsule(CX - 6.8 + lean, 5.4 + ty, CX - 5.6 + lean, 8 + ty, 0.85, 0.85, RAMP.leather);
      capsule(CX - 7.6 + lean, 9.2 + ty, CX - 3.8 + lean, 7.6 + ty, 0.7, 0.7, RAMP.gold);
    }
    drawArm(bA, -0.4);
    drawLeg(bL, -0.35);
    // Rumpf
    for (let y = 8; y <= 20; y++) {
      const yy = y + ty, cx = CX + lean * (20 - y) / 11;
      const hw = y < 9 ? 1.7 : y < 10 ? 3.3 : y < 12 ? 4.9 : 4.9 - cl((y - 12) / 8, 0, 1) * 1.3;
      for (let px = Math.floor(cx - hw); px <= Math.ceil(cx + hw); px++) {
        const nx = (px + 0.5 - cx) / hw;
        if (Math.abs(nx) > 1) continue;
        let ramp = def.skin, l = -nx * 0.6 + Math.sqrt(1 - nx * nx) * 0.75 + (y < 14 ? 0.12 : -0.05);
        if (y >= 10) {
          if (def.torso === 'vest') ramp = (y <= 15 && nx > 0.25 - (y - 10) * 0.05) ? RAMP.cloth : RAMP.leather;
          else if (def.torso === 'armor') { ramp = RAMP.steel; if (Math.abs(nx - 0.2) < 0.12) ramp = RAMP.gold; }
          else if (def.torso === 'rags') ramp = ((px * 7 + y * 3) % 11 === 0 || (y > 15 && (px + y) % 5 === 0)) ? def.skin : RAMP.rags;
          else if (def.torso === 'scales') { ramp = nx > 0.25 ? RAMP.belly : RAMP.fish; if ((px + y) % 3 === 0) l -= 0.25; }
          else if (def.torso === 'ribs') {
            if (y % 2 === 1 && Math.abs(nx) > 0.15) continue; // Lücken zwischen den Rippen
            ramp = RAMP.bone; if (Math.abs(nx + 0.1) < 0.18) l += 0.2; // Wirbelsäule
          } else if (def.torso === 'bare') { // Muskelzeichnung
            if (y === 14 && nx > -0.4) l -= 0.55;
            if ((y === 16 || y === 18) && nx > 0.05 && nx < 0.75) l -= 0.4;
          }
        }
        P(px, yy, ramp[shadeIdx(l, ramp.length)]);
      }
    }
    if (def.strap) for (let k = 0; k <= 9; k++) { // Kreuzgurt mit Nieten
      const gx = CX + 3.6 + lean - k * 0.75, gy = 11 + ty + k * 0.85;
      P(gx, gy, RAMP.leather[1]); P(gx + 1, gy, RAMP.leather[2]);
      if (k % 4 === 2) P(gx, gy, RAMP.gold[3]);
    }
    if (def.belt) {
      for (let px = CX - 4; px <= CX + 4; px++) { P(px, 18 + ty, RAMP.leather[2]); P(px, 19 + ty, RAMP.leather[1]); }
      P(CX + 1, 18 + ty, RAMP.gold[4]); P(CX + 2, 18 + ty, RAMP.gold[3]); P(CX + 1, 19 + ty, RAMP.gold[2]); P(CX + 2, 19 + ty, RAMP.gold[2]);
    }
    if (def.mantle) disc(CX - 2.8 + lean, 11.4 + ty, 2.9, 2.2, RAMP.fur, 0.1); // Fellumhang
    // Lendenschurz / Wappenrock
    const flap = (fx, fy, ang, len, bias, ramp) => {
      if (!ramp) return;
      const ex = fx + Math.sin(ang) * len, ey = fy + Math.cos(ang) * len;
      capsule(fx, fy, ex, ey, 2.0, 1.7, ramp, bias);
      P(ex, ey + 1.3, def.flapTrim[2]); P(ex - 1, ey + 1.1, def.flapTrim[1]); P(ex + 1, ey + 1.1, def.flapTrim[1]);
    };
    const fl = (pose.flare || 0) * 0.12;
    flap(CX - 1.8, hipY, R(pose.legs[1][0]) * 0.8 - fl, 3.8, -0.3, def.flap);
    flap(CX + 0.4, hipY, -fl * 0.5, 4.6, -0.05, def.sash);
    drawLeg(fL, 0);
    flap(CX + 1.8, hipY, R(pose.legs[0][0]) * 0.8 - fl * 0.6, 3.8, 0.05, def.flap);
    // Kopf
    const hd = HEAD[def.head].map((r, i) => (pose.blink && i === EYE_ROW && def.blink) ? r.replace('e', def.blink) : (pose.hurt && i === EYE_ROW && def.hurtRow) ? def.hurtRow : r);
    const hx0 = Math.round(12 + lean), hy0 = ty;
    hd.forEach((row, y) => [...row].forEach((ch, xx) => { if (ch !== '.') P(hx0 + xx, hy0 + y, def.headPal[ch]); }));
    // vorderer Arm, Peitschenrolle, Schild, Schulterplatte
    drawArm(fA, 0.05);
    if (pose.coil && def.weapon === 'whip') {
      for (let a = 0; a < 12; a++) { const t = a / 12 * Math.PI * 2; P(fA.hx + 0.5 + Math.cos(t) * 2.2, fA.hy + 2.2 + Math.sin(t) * 1.7, a % 3 ? '#7c4818' : '#c08040'); }
    }
    if (def.shield) {
      disc(fA.hx + 1, fA.hy - 1, 3.2, 4.4, RAMP.shield, 0.1);
      P(fA.hx + 1, fA.hy - 3, RAMP.gold[4]); P(fA.hx + 1, fA.hy - 2, RAMP.gold[3]); P(fA.hx, fA.hy - 2, RAMP.gold[3]); P(fA.hx + 2, fA.hy - 2, RAMP.gold[3]); P(fA.hx + 1, fA.hy - 1, RAMP.gold[2]);
    }
    if (def.pauldron) {
      disc(shF[0] + 0.3, shF[1] - 0.3, 3.1, 2.3, RAMP.steel, 0.1);
      P(shF[0] - 1, shF[1] - 2.2, RAMP.steel[4]); P(shF[0], shF[1] - 2.3, RAMP.steel[4]);
    }
    const spr = Sprites.fromCanvas(G.c);
    spr.mx = MX; spr.hand = [fA.hx, fA.hy]; spr.drop = yOff;
    return spr;
  }

  // ---------------- Posen ----------------
  const STAND = [[5, 3], [-5, 3]], STANCE = [[20, 8], [-20, 8]], CROUCH = [[72, 140], [-12, 105]];
  const TH = [22, 10, -2, -14, -24, -8, 12, 24], KN = [4, 8, 6, 10, 18, 55, 50, 20];
  const walkLegs = i => [[TH[i], KN[i]], [TH[(i + 4) % 8], KN[(i + 4) % 8]]];
  const FLARE = [1, 2, 2, 1, 1, 2, 2, 1];
  const STAIR_UP = [[[45, 75], [-8, 2]], [[12, 35], [-6, 6]]];
  const STAIR_DOWN = [[[25, 0], [-15, 50]], [[8, 10], [-8, 25]]];
  // Hand-Ziele (Sprite-Koordinaten) – Phase 2 je Richtung passt zu WHIP_DIRS (Sprite minus 9/4)
  const P0 = { fa: { t: [10, 7], bend: 'up' }, ba: { a: [40, 30] }, lean: -1 };
  const P1 = { fa: { t: [19, 1], bend: 'back' }, ba: { a: [25, 25] }, lean: 0 };
  const DIR = {
    fwd: { t: [28, 14], bend: 'down' }, upd: { t: [26, 5], bend: 'fwd' }, up: { t: [21, 2], bend: 'fwd' },
    downd: { t: [27, 19], bend: 'down' }, down: { t: [22, 21], bend: 'fwd' },
  };
  const P2 = (d) => ({ fa: DIR[d], ba: { a: [-38, 22] }, lean: d === 'up' || d === 'upd' ? 0 : 1 });

  function build(def) {
    const F = (pose) => frame(def, pose);
    const IDLE_A = { fa: { a: [12, 38] }, ba: { a: [-8, 22] }, coil: true };
    const atk = (legs, drop = 0) => [P0, P1, P2('fwd')].map(p => {
      const q = Object.assign({ legs }, p);
      if (drop && q.fa.t) q.fa = Object.assign({}, q.fa, { t: [q.fa.t[0], q.fa.t[1] + drop] });
      return F(q);
    });
    const H = { def };
    H.idle = [F({ legs: STAND, ...IDLE_A }), F({ legs: STAND, ...IDLE_A, bob: 1 })];
    H.blink = F({ legs: STAND, ...IDLE_A, blink: true });
    H.walk = Array.from({ length: 8 }, (_, i) => F({
      legs: walkLegs(i), flare: FLARE[i], bob: (i % 4 === 1 || i % 4 === 2) ? -1 : 0,
      fa: { a: [-TH[i] * 0.9 + 6, 30] }, ba: { a: [-TH[(i + 4) % 8] * 0.9 - 4, 24] }, coil: true,
    }));
    H.jumpUp = F({ legs: [[55, 95], [10, 80]], air: true, flare: 1, fa: { a: [70, 60] }, ba: { a: [-40, 50] } });
    H.jumpFall = F({ legs: [[20, 25], [-25, 30]], air: true, flare: 3, fa: { a: [95, 25] }, ba: { a: [-75, 20] } });
    H.land = F({ legs: [[38, 75], [-18, 62]], flare: 1, fa: { a: [35, 55] }, ba: { a: [-25, 40] } });
    H.crouch = F({ legs: CROUCH, fa: { a: [35, 70] }, ba: { a: [-10, 45] } });
    H.crouchDrop = H.crouch.drop;
    H.stairUp = STAIR_UP.map((l, i) => F({ legs: l, fa: { a: [i ? -10 : 25, 30] }, ba: { a: [i ? 20 : -15, 25] }, coil: true }));
    H.stairDown = STAIR_DOWN.map((l, i) => F({ legs: l, fa: { a: [i ? 15 : -10, 30] }, ba: { a: [i ? -15 : 20, 25] }, coil: true }));
    H.hurt = F({ legs: [[25, 45], [-30, 30]], air: true, flare: 3, hurt: true, fa: { a: [150, 20] }, ba: { a: [-150, -20] }, lean: -1 });
    H.swing = F({ legs: [[30, 40], [-10, 30]], air: true, flare: 2, fa: { a: [178, 0] }, ba: { a: [-30, 30] } });
    H.atk = atk(STANCE);
    H.atkDir = {}; Object.keys(DIR).forEach(d => { H.atkDir[d] = F({ legs: STANCE, ...P2(d) }); });
    H.catk = atk(CROUCH, H.crouchDrop);
    H.satkUp = atk(STAIR_UP[0]); H.satkDown = atk(STAIR_DOWN[0]);
    H.dead = lying(F({ legs: [[10, 20], [-10, 30]], air: true, hurt: true, fa: { a: [120, 30] }, ba: { a: [-120, -10] } }));
    H.stand = H.idle[0];
    return H;
  }
  // Am Boden liegend: Pose um 90° gedreht und zugeschnitten
  function lying(src) {
    const r = Sprites.canvas(FH, FW), rx = r.getContext('2d');
    rx.translate(0, FW); rx.rotate(-Math.PI / 2); rx.drawImage(src.c, -src.pad, -src.pad);
    const d = rx.getImageData(0, 0, FH, FW).data;
    let top = FW, bot = 0;
    for (let y = 0; y < FW; y++) for (let x = 0; x < FH; x++) if (d[(y * FH + x) * 4 + 3]) { top = Math.min(top, y); bot = Math.max(bot, y); }
    const c = Sprites.canvas(FH, bot - top + 1);
    c.getContext('2d').drawImage(r, 0, -top);
    const s = Sprites.fromCanvas(c, false); s.mx = 0;
    return s;
  }

  // ---------------- Gegner-Sprites (ersetzen die alten 8-Bit-Figuren) ----------------
  function buildMonsters() {
    const S = Sprites.S, M = MONSTERS;
    const walk2 = (def, arms) => [0, 4].map((i, k) => frame(def, { legs: walkLegs(i), bob: 0, ...arms(k) }));
    S.skel = walk2(M.skel, k => ({ fa: { a: [k ? 20 : -15, 35] }, ba: { a: [k ? -15 : 20, 30] } }));
    S.skelThrow = frame(M.skel, { legs: STANCE, fa: { t: [20, 1], bend: 'back' }, ba: { a: [30, 30] } });
    S.knight = walk2(M.knight, k => ({ fa: { a: [55, 25] }, ba: { a: [k ? -20 : 10, 60] } }));
    S.ghul = walk2(M.ghoul, k => ({ fa: { a: [92 + k * 6, 0] }, ba: { a: [80 - k * 6, 8] }, lean: 1 }));
    S.fish = walk2(M.fish, k => ({ fa: { a: [k ? 25 : -10, 40] }, ba: { a: [k ? -10 : 25, 35] } }));
    S.fishShoot = frame(M.fish, { legs: STANCE, fa: { a: [85, 10] }, ba: { a: [60, 20] }, lean: 1 });
  }
  buildMonsters();

  const list = [HENRIK, RAGNOR];
  const built = {};
  list.forEach(d => { built[d.id] = build(d); });
  Sprites.S.heroes = built;
  Sprites.S.hero = built.henrik;
  return { list, get: (id) => built[id] || built.henrik };
})();
