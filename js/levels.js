// Leveldaten. Räume sind 13 Kacheln hoch (16px). Boden-Oberkante meist Reihe 11.
// Terrain: '#','=' massiv | 'X' zerbrechlich (Braten) | 'Y' zerbrechlich (Geldsack)
//          '/' Treppe hoch-rechts | '\\' Treppe hoch-links | '~' Wasser | '^' Stacheln
'use strict';

const Levels = (() => {
  function room(w, theme) {
    const h = 13;
    const r = {
      w, h, theme,
      grid: Array.from({ length: h }, () => Array(w).fill('.')),
      ents: [], zones: [], start: { x: 2, y: 10 }, exitX: null, arena: null,
    };
    const api = {
      fill(x0, y0, x1, y1, ch) {
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < w && y >= 0 && y < h) r.grid[y][x] = ch;
        return api;
      },
      set(x, y, ch) { return api.fill(x, y, x, y, ch); },
      ground(x0, x1, top = 11, ch = '#') { return api.fill(x0, top, x1, h - 1, ch); },
      // Treppe: Startzelle unten (c0,r0), dir 1 = nach rechts hoch, -1 = nach links hoch
      stair(c0, r0, len, dir) {
        for (let i = 0; i < len; i++) api.set(c0 + i * dir, r0 - i, dir > 0 ? '/' : '\\');
        return api;
      },
      candle(x, y, drop = 'rnd') { r.ents.push({ type: 'candle', x, y, drop }); return api; },
      enemy(type, x, y, opts = {}) { r.ents.push({ type, x, y, ...opts }); return api; },
      zone(type, x0, x1, opts = {}) { r.zones.push({ type, x0, x1, interval: 120, max: 2, ...opts }); return api; },
      platform(x0, x1, y) { r.ents.push({ type: 'platform', x: x0, x1, y }); return api; },
      start(x, y) { r.start = { x, y }; return api; },
      exit(x) { r.exitX = x; return api; },
      arena(x0, boss) { r.arena = { x0, boss }; return api; },
      done() { return r; },
    };
    return api;
  }

  // ---------------- STAGE 1: Der Burghof ----------------
  const r11 = room(72, 'courtyard')
    .ground(0, 71)
    .fill(28, 9, 30, 10, '=')
    .fill(44, 10, 45, 10, '=')
    .candle(5, 9).candle(11, 9, 'W').candle(17, 9).candle(23, 9, 'H').candle(29, 7)
    .candle(35, 9, '1').candle(41, 9).candle(47, 9, 'W').candle(53, 9, '$').candle(59, 9).candle(64, 9, 'H')
    .zone('ghoul', 14, 62, { interval: 100, max: 3 })
    .start(2, 10).exit(70).done();

  const r12 = room(96, 'hall')
    .ground(0, 15).ground(18, 61).ground(64, 95)
    .stair(24, 10, 4, 1).fill(28, 7, 44, 7, '=').stair(48, 10, 4, -1)
    .set(56, 10, '=').set(56, 9, 'X')
    .fill(83, 8, 85, 8, '=').fill(90, 8, 92, 8, '=')
    .candle(5, 9).candle(11, 9, '3').candle(21, 9).candle(35, 9).candle(32, 5).candle(38, 5, 'H').candle(42, 5)
    .candle(52, 9).candle(59, 9, '$').candle(67, 9).candle(73, 9, 'H').candle(77, 9, '2')
    .enemy('bat', 14, 3).enemy('bat', 40, 2).enemy('bat', 58, 4).enemy('bat', 70, 3)
    .zone('ghoul', 50, 78, { interval: 130, max: 2 })
    .start(2, 10).arena(80, 'gbat').done();

  // ---------------- STAGE 2: Die Katakomben ----------------
  const r21 = room(96, 'cave')
    .ground(0, 19).fill(20, 11, 78, 12, '~').ground(79, 95)
    .fill(22, 9, 25, 9, '=').fill(28, 9, 31, 9, '=').fill(34, 8, 37, 8, '=')
    .fill(40, 10, 47, 12, '#')
    .fill(50, 9, 53, 9, '=').fill(56, 8, 58, 8, '=').fill(61, 9, 64, 9, '=').fill(67, 9, 70, 9, '=').fill(73, 10, 76, 10, '=')
    .candle(5, 9).candle(12, 9, 'H').candle(23, 7).candle(35, 6, 'H').candle(44, 8).candle(51, 7, '4')
    .candle(62, 7).candle(68, 7, '$').candle(84, 9).candle(90, 9, 'H')
    .enemy('skel', 44, 9)
    .zone('fish', 20, 78, { interval: 150, max: 2 })
    .zone('skull', 50, 78, { interval: 240, max: 1 })
    .start(2, 10).exit(94).done();

  const r22 = room(80, 'crypt')
    .ground(0, 79)
    .stair(8, 10, 5, 1).fill(13, 6, 26, 6, '=').stair(31, 10, 5, -1)
    .set(40, 9, 'X').set(40, 10, 'Y')
    .fill(67, 8, 69, 8, '=').fill(74, 8, 76, 8, '=')
    .candle(4, 9).candle(16, 4).candle(23, 4, 'H').candle(20, 9, '$').candle(36, 9, '3').candle(44, 9)
    .candle(50, 9, 'W').candle(56, 9).candle(60, 9, 'H')
    .enemy('skel', 20, 5).enemy('skel', 36, 10).enemy('knight', 47, 10)
    .enemy('bat', 34, 3).enemy('bat', 54, 4)
    .start(2, 10).arena(64, 'giant').done();

  // ---------------- STAGE 3: Der Bergfried ----------------
  const r31 = room(100, 'tower')
    .ground(0, 12).fill(13, 12, 22, 12, '^').ground(23, 41)
    .stair(41, 10, 6, 1).fill(47, 5, 60, 5, '=').fill(42, 12, 60, 12, '^').stair(66, 10, 6, -1)
    .ground(61, 99)
    .set(88, 10, 'X')
    .platform(13, 21, 9)
    .candle(4, 9).candle(10, 9, 'H').candle(17, 6).candle(27, 9).candle(35, 9, '2')
    .candle(50, 3).candle(57, 3, 'H').candle(70, 9).candle(78, 9, 'W').candle(85, 9, 'H').candle(92, 9, '$')
    .enemy('pillar', 32, 10).enemy('knight', 37, 10).enemy('knight', 54, 4)
    .enemy('pillar', 72, 10).enemy('knight', 82, 10).enemy('bat', 76, 3)
    .zone('skull', 45, 75, { interval: 210, max: 2 })
    .start(2, 10).exit(98).done();

  const r32 = room(64, 'throne')
    .ground(0, 63)
    .fill(51, 7, 53, 7, '=').fill(58, 7, 60, 7, '=')
    .candle(5, 9, 'H').candle(10, 9).candle(18, 9, '1').candle(26, 9).candle(31, 9, 'U')
    .candle(38, 9, 'H').candle(44, 9, 'R')
    .enemy('pillar', 12, 10).enemy('knight', 22, 10).enemy('knight', 36, 10)
    .enemy('bat', 16, 4).enemy('bat', 28, 3)
    .zone('skull', 8, 44, { interval: 230, max: 1 })
    .start(2, 10).arena(48, 'count').done();

  const STAGES = [
    { name: 'DER BURGHOF', music: 'stage1', time: 300, rooms: [r11, r12], boss: 'RIESENFLEDERMAUS' },
    { name: 'DIE KATAKOMBEN', music: 'stage2', time: 300, rooms: [r21, r22], boss: 'KNOCHENRIESE' },
    { name: 'DER BERGFRIED', music: 'stage3', time: 400, rooms: [r31, r32], boss: 'GRAF NACHTMAHR' },
  ];

  return { STAGES };
})();
