// Leveldaten. Normale Räume sind 13 Kacheln hoch (Boden-Oberkante Reihe 11), Kletterräume höher.
// Terrain: '#','=' massiv | 'X' zerbrechlich (Braten) | 'Y' zerbrechlich (Geldsack)
//          '/' Treppe hoch-rechts | '\\' Treppe hoch-links | '~' Wasser | '^' Stacheln
// Bossarenen sind immer die letzten View.w Pixel eines Raums (Breite passt sich dem Bildschirm an).
'use strict';

const Levels = (() => {
  function room(w, theme, h = 13) {
    const r = {
      w, h, theme,
      grid: Array.from({ length: h }, () => Array(w).fill('.')),
      ents: [], zones: [], start: { x: 2, y: h - 3 }, exit: null, door: null, arena: null,
    };
    const api = {
      fill(x0, y0, x1, y1, ch) {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < w && y >= 0 && y < h) r.grid[y][x] = ch;
        return api;
      },
      set(x, y, ch) { return api.fill(x, y, x, y, ch); },
      ground(x0, x1, top = h - 2, ch = '#') { return api.fill(x0, top, x1, h - 1, ch); },
      // Treppe: Startzelle unten (c0,r0), dir 1 = nach rechts hoch, -1 = nach links hoch
      stair(c0, r0, len, dir) {
        for (let i = 0; i < len; i++) api.set(c0 + i * dir, r0 - i, dir > 0 ? '/' : '\\');
        return api;
      },
      candle(x, y, drop = 'rnd') { r.ents.push({ type: 'candle', x, y, drop }); return api; },
      enemy(type, x, y, opts = {}) { r.ents.push({ type, x, y, ...opts }); return api; },
      zone(type, x0, x1, opts = {}) { r.zones.push({ type, x0, x1, interval: 120, max: 2, ...opts }); return api; },
      platform(x0, x1, y) { r.ents.push({ type: 'platform', x: x0, x1, y }); return api; },
      // Pendel-Kronleuchter: Aufhängepunkt (Kacheln), Seillänge (px), Ausschlag (rad), Phase
      chandelier(px, py, len, amp = 0.45, phase = 0) { r.ents.push({ type: 'chandelier', x: px, y: py, len, amp, phase }); return api; },
      // XXL-Kronleuchter (Mode-7-Drehung, schräge Standfläche)
      grand(px, py, len, amp = 0.32, phase = 0) { r.ents.push({ type: 'grand', x: px, y: py, len, amp, phase }); return api; },
      // Zahnrad-Riesenrad: Mittelpunkt (Kacheln), Radius (px), Anzahl Stege, Drehgeschwindigkeit
      cog(cx, cy, rad, n = 4, speed = 0.011) { r.ents.push({ type: 'cog', x: cx, y: cy, r: rad, n, speed }); return api; },
      elevator(x, rowLow, rowHigh) { r.ents.push({ type: 'elevator', x, y: rowLow, y1: rowHigh }); return api; },
      crumble(x, y) { r.ents.push({ type: 'crumble', x, y }); return api; },
      statue(x, y) { r.ents.push({ type: 'statue', x, y }); return api; },
      ring(x, y) { r.ents.push({ type: 'ring', x, y }); return api; },
      chest(x, y, loot = 'rnd') { r.ents.push({ type: 'chest', x, y, loot }); return api; },
      start(x, y) { r.start = { x, y }; return api; },
      exit(x) { r.exit = { x0: x, y0: 0, x1: w - 1, y1: h - 1 }; r.door = { x }; return api; },
      exitAt(x0, y0, x1, y1) { r.exit = { x0, y0, x1, y1 }; r.door = { x: x0 + 1 }; return api; },
      arena(boss) { r.arena = { boss }; return api; },
      done() {
        if (r.door) { // Tür auf dem ersten Boden unterhalb der Ausgangszone
          for (let y = r.exit.y0; y < h; y++) if ('#='.includes(r.grid[y][r.door.x])) { r.door.base = y; break; }
          if (r.door.base === undefined) r.door.base = h - 2;
        }
        return r;
      },
    };
    return api;
  }

  // ======================= STAGE 1: Der Burghof =======================
  const r11 = room(72, 'courtyard')
    .ground(0, 71)
    .fill(28, 9, 30, 10, '=')
    .fill(44, 10, 45, 10, '=')
    .candle(5, 9).candle(11, 9, 'W').candle(17, 9).candle(23, 9, 'H').candle(29, 7)
    .candle(35, 9, '1').candle(41, 9).candle(47, 9, 'W').candle(53, 9, '$').candle(59, 9).candle(64, 9, 'H')
    .enemy('raven', 29, 8).enemy('raven', 45, 9).ring(37, 4)
    .chest(62, 10)
    .zone('ghoul', 14, 60, { interval: 110, max: 3 })
    .start(2, 10).exit(70).done();

  // Glockenturm: vertikaler Aufstieg (Treppen, Aufzug, Kronleuchter)
  const v1 = room(28, 'hall', 30)
    .ground(0, 27, 28)
    .stair(4, 27, 5, 1).fill(9, 23, 15, 23, '=')
    .fill(18, 21, 24, 21, '=')
    .stair(22, 20, 5, -1).fill(8, 16, 17, 16, '=')
    .elevator(4, 16, 9)
    .fill(7, 9, 14, 9, '=')
    .chandelier(19, 0, 120, 0.5, 0)
    .fill(24, 6, 27, 6, '=')
    .candle(12, 21, 'H').candle(21, 19).candle(12, 14).candle(15, 14, '3').candle(10, 7, 'W').candle(26, 4, 'H')
    .enemy('bat', 20, 12).enemy('bat', 6, 4)
    .zone('ghoul', 0, 27, { interval: 170, max: 1 })
    .start(2, 27).exitAt(25, 0, 27, 5).done();

  const r12 = room(104, 'hall')
    .ground(0, 15).ground(18, 51).ground(63, 103)
    .stair(24, 10, 4, 1).fill(28, 7, 44, 7, '=').stair(48, 10, 4, -1)
    .set(38, 10, '=').set(38, 9, 'X')
    .grand(57.5, 0, 140, 0.32, 0)
    .statue(64, 10)
    .fill(91, 8, 93, 8, '=').fill(98, 8, 100, 8, '=')
    .candle(5, 9).candle(11, 9, '3').candle(21, 9).candle(33, 9).candle(32, 5).candle(38, 5, 'H').candle(42, 5)
    .candle(50, 9, '$').candle(53, 3, 'H').candle(61, 3).candle(67, 9).candle(73, 9, 'H').candle(80, 9, '2').candle(86, 9)
    .enemy('bat', 14, 3).enemy('bat', 40, 2).enemy('bat', 70, 3)
    .zone('ghoul', 18, 50, { interval: 140, max: 2 })
    .start(2, 10).arena('gbat').done();

  // ======================= STAGE 2: Die Katakomben =======================
  const r21 = room(96, 'cave')
    .ground(0, 19).fill(20, 11, 78, 12, '~').ground(79, 95)
    .fill(22, 9, 25, 9, '=').fill(28, 9, 31, 9, '=').fill(34, 8, 37, 8, '=')
    .fill(40, 10, 47, 12, '#')
    .fill(50, 9, 53, 9, '=').crumble(56, 8).fill(61, 9, 64, 9, '=').crumble(67, 9).crumble(69, 9).fill(73, 10, 76, 10, '=')
    .statue(43, 9)
    .candle(5, 9).candle(12, 9, 'H').candle(23, 7).candle(35, 6, 'H').candle(46, 8).candle(51, 7, '4')
    .candle(62, 7).candle(68, 7, '$').candle(84, 9).candle(90, 9, 'H')
    .enemy('skel', 46, 9).ring(26, 4).ring(48, 4).ring(66, 4)
    .zone('fish', 20, 78, { interval: 170, max: 2 })
    .zone('skull', 50, 78, { interval: 280, max: 1 })
    .start(2, 10).exit(94).done();

  // Brunnenschacht: vertikaler Aufstieg über Wasser (bröckelnde Steine, Aufzug)
  const v2 = room(28, 'cave', 30)
    .ground(0, 6, 28).fill(7, 28, 27, 29, '~')
    .fill(9, 26, 13, 26, '=')
    .crumble(15, 24)
    .fill(19, 22, 26, 22, '=')
    .stair(24, 21, 5, -1).fill(11, 17, 19, 17, '=')
    .crumble(7, 15)
    .fill(1, 13, 5, 13, '=')
    .elevator(8, 13, 5)
    .fill(10, 5, 27, 5, '=')
    .candle(11, 24, 'H').candle(21, 20).candle(13, 15, '3').candle(16, 15).candle(3, 11, 'H').candle(14, 3).candle(20, 3, 'H')
    .chest(25, 4, 'life')
    .enemy('skel', 15, 16).enemy('bat', 20, 10).enemy('bat', 3, 7).enemy('ghost', 20, 14)
    .zone('fish', 7, 27, { interval: 220, max: 1 })
    .start(2, 27).exitAt(24, 0, 27, 4).done();

  const r22 = room(96, 'crypt')
    .ground(0, 95)
    .stair(8, 10, 5, 1).fill(13, 6, 26, 6, '=').stair(31, 10, 5, -1)
    .set(40, 9, 'X').set(40, 10, 'Y')
    .statue(34, 10)
    .fill(83, 8, 85, 8, '=').fill(90, 8, 92, 8, '=')
    .candle(4, 9).candle(16, 4).candle(23, 4, 'H').candle(20, 9, '$').candle(37, 9, '3').candle(44, 9)
    .candle(48, 9, 'W').candle(56, 9).candle(60, 9, 'H').candle(66, 9).candle(72, 9, 'H')
    .chest(24, 5, 'big')
    .enemy('skel', 18, 5).enemy('skel', 45, 10).enemy('knight', 50, 10)
    .enemy('bat', 30, 3).enemy('bat', 54, 4).enemy('ghost', 60, 6)
    .start(2, 10).arena('giant').done();

  // ======================= STAGE 3: Der Bergfried (entschärft) =======================
  const r31 = room(64, 'tower')
    .ground(0, 12).fill(13, 12, 20, 12, '^').ground(21, 63)
    .cog(16.5, 7, 44, 4, 0.011)
    .statue(24, 10)
    .crumble(34, 8).crumble(37, 8)
    .set(52, 10, 'X')
    .candle(4, 9).candle(9, 9, 'H').candle(16, 1).candle(28, 9).candle(35, 6, 'H').candle(38, 6, '2')
    .candle(47, 9).candle(56, 9, 'W').candle(60, 9, 'H')
    .enemy('knight', 31, 10).enemy('pillar', 44, 10).enemy('bat', 50, 3)
    .zone('skull', 30, 60, { interval: 380, max: 1 })
    .start(2, 10).exit(62).done();

  // Uhrwerk: vertikaler Aufstieg (Aufzüge, Treppen, Pendel-Kronleuchter), Stürze landen auf unteren Ebenen
  const v3 = room(28, 'tower', 32)
    .ground(0, 27, 30)
    .elevator(2, 30, 20)
    .fill(5, 20, 12, 20, '=')
    .stair(10, 19, 4, 1).fill(14, 16, 22, 16, '=')
    .chandelier(8, 5, 164, 0.4, 1)
    .elevator(24, 16, 7)
    .fill(14, 7, 22, 7, '=')
    .stair(16, 6, 3, -1).fill(3, 4, 13, 4, '=')
    .candle(8, 18, 'H').candle(6, 13, 'H').candle(10, 13).candle(18, 14).candle(21, 14, '$').candle(20, 5, 'H')
    .candle(6, 2).candle(10, 2, '1')
    .chest(19, 6, 'life')
    .enemy('bat', 18, 11).enemy('bat', 9, 1).enemy('ghost', 14, 12)
    .start(6, 29).exitAt(3, 0, 6, 3).done();

  // Seelenstrudel: schwebende Steine über dem Nichts, Ankerringe, rotierender Mode-7-Tunnel
  const vx = room(64, 'vortex')
    .ground(0, 7).ground(57, 63)
    .fill(11, 9, 13, 9, '=').crumble(17, 8).ring(22, 4).fill(26, 9, 28, 9, '=').ring(32, 4).fill(36, 8, 38, 8, '=')
    .ring(42, 4).crumble(46, 9).ring(50, 4).fill(53, 9, 55, 9, '=')
    .statue(4, 10)
    .candle(12, 7, 'H').candle(27, 7).candle(37, 6, 'H').candle(54, 7, '$').candle(60, 9, 'H')
    .enemy('ghost', 20, 6).enemy('ghost', 44, 6)
    .zone('skull', 10, 56, { interval: 320, max: 1 })
    .start(2, 10).exit(62).done();

  const r32 = room(88, 'throne')
    .ground(0, 15).ground(26, 87)
    .grand(21, 0, 134, 0.3, 0.8)
    .statue(30, 10)
    .fill(75, 7, 77, 7, '=').fill(82, 7, 84, 7, '=')
    .candle(5, 9, 'H').candle(10, 9).candle(18, 2, 'H').candle(34, 9, '1').candle(40, 9).candle(44, 9, 'U').candle(48, 9, 'R')
    .enemy('knight', 38, 10).enemy('pillar', 46, 10).enemy('bat', 16, 4).enemy('bat', 40, 3).enemy('ghost', 33, 5)
    .zone('skull', 30, 50, { interval: 420, max: 1 })
    .start(2, 10).arena('count').done();

  const STAGES = [
    { name: 'DER BURGHOF', music: 'stage1', time: 400, rooms: [r11, v1, r12], boss: 'RIESENFLEDERMAUS' },
    { name: 'DIE KATAKOMBEN', music: 'stage2', time: 420, rooms: [r21, v2, r22], boss: 'KNOCHENRIESE' },
    { name: 'DER BERGFRIED', music: 'stage3', time: 640, rooms: [r31, v3, vx, r32], boss: 'GRAF NACHTMAHR' },
  ];

  return { STAGES };
})();
