// Leveldaten. Normale Räume sind 13 Kacheln hoch (Boden-Oberkante Reihe 11), Kletterräume höher.
// Terrain: '#','=' massiv | 'X' zerbrechlich (Braten) | 'Y' zerbrechlich (Geldsack)
// Kerzen-Drops: Ziffern = Sub-Waffen, W Peitsche, H Herz, $ Geld, U 1UP, R Rosenkranz, M Blutmond (rote Kerze)
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
      // Pendelbeil: Aufhängung (Kacheln), Stangenlänge (px), Ausschlag (rad), Phase
      pendulum(px, py, len, amp = 0.55, phase = 0, speed = 0.03) { r.ents.push({ type: 'pendulum', x: px, y: py, len, amp, phase, speed }); return api; },
      cog(cx, cy, rad, n = 4, speed = 0.011) { r.ents.push({ type: 'cog', x: cx, y: cy, r: rad, n, speed }); return api; },
      elevator(x, rowLow, rowHigh) { r.ents.push({ type: 'elevator', x, y: rowLow, y1: rowHigh }); return api; },
      crumble(x, y) { r.ents.push({ type: 'crumble', x, y }); return api; },
      statue(x, y) { r.ents.push({ type: 'statue', x, y }); return api; },
      ring(x, y) { r.ents.push({ type: 'ring', x, y }); return api; },
      // Turmglocke: schlägt regelmäßig, der ganze Turm schwankt (Mode-7-Drehung des Bildes)
      bell() { r.bell = true; return api; },
      chest(x, y, loot = 'rnd') { r.ents.push({ type: 'chest', x, y, loot }); return api; },
      cargo(x, y) { r.ents.push({ type: 'cargo', x, y }); return api; },
      sign(x, y, w, text) { r.ents.push({ type: 'sign', x, y, w, text }); return api; },
      prop(type, opts) { r.ents.push({ type, ...opts }); return api; },
      start(x, y) { r.start = { x, y }; return api; },
      exit(x) { r.exit = { x0: x, y0: 0, x1: w - 1, y1: h - 1 }; r.door = { x }; return api; },
      exitAt(x0, y0, x1, y1) { r.exit = { x0, y0, x1, y1 }; r.door = { x: x0 + 1 }; return api; },
      arena(boss) { r.arena = { boss }; return api; },
      // Miniboss mitten im Raum: Arena x0..x1 (Kacheln), startet, sobald der Held x überschreitet (Füße unterhalb Reihe minRow)
      mini(boss, x0, x1, x, minRow = 0) { r.mini = { boss, x0, x1, x, minRow }; return api; },
      // Schiff: Masten (Kachel-x), Steuerrad, Anlegen (ab Spieler-x legt das Schiff an, Laufplanke x0..x1 in Reihe row)
      // Mast: x (Kachel, Mitte), Mastkopf-Reihe, Rah-Reihen von oben nach unten, Segel-Index mit Wappen
      mast(x, top, yards, emblem = -1) { (r.masts || (r.masts = [])).push({ x, top, yards, emblem }); return api; },
      // Seilrutsche: Start (x0, Standreihe r0) oben → Ziel (x1, Standreihe r1)
      zip(x0, r0, x1, r1) { r.ents.push({ type: 'zip', x0, y0: r0, x1, y1: r1 }); return api; },
      wheel(x, y) { r.wheel = { x, y }; return api; },
      dock(x, x0, x1, row) { r.dock = { x, x0, x1, row }; return api; },
      music(name) { r.music = name; return api; },
      noDoor() { r.noDoor = true; return api; },
      done() {
        if (r.door) { // Tür auf dem ersten Boden unterhalb der Ausgangszone
          for (let y = r.exit.y0; y < h; y++) if ('#='.includes(r.grid[y][r.door.x])) { r.door.base = y; break; }
          if (r.door.base === undefined) r.door.base = h - 2;
        }
        if (r.noDoor) r.door = null; // Ausgang ohne Burgtor (z. B. Mole)
        return r;
      },
    };
    return api;
  }

  // ======================= STAGE 1: Ankunft per Schiff =======================
  // Galeone im Sturm: Achterdeck mit Steuerrad, Hauptdeck (Fischmenschen springen aus dem Meer an Bord),
  // Wanten hoch zur Rah, Back. Am Bug ruft der Ausguck „Land in Sicht!", das Schiff kracht an die Mole,
  // die Laufplanke fällt – an Land geht es weiter zum Burghof.
  const r10 = room(96, 'ship', 34)
    .ground(0, 73)                                                     // Hauptdeck (Oberkante Reihe 32)
    .fill(0, 29, 10, 31, '#').stair(13, 31, 3, -1)                     // Achterdeck
    .fill(17, 30, 18, 31, '=').fill(47, 30, 48, 31, '=')               // Frachtkisten
    .stair(57, 31, 3, 1).fill(60, 29, 73, 31, '#')                     // Back (Vorschiff)
    .fill(81, 29, 95, 29, '#').fill(83, 30, 83, 33, '#').fill(88, 30, 88, 33, '#').fill(93, 30, 93, 33, '#') // Mole auf Pfählen
    // Takelage: Wanten hoch in den Besan, Seilrutsche zum Großmast, hinauf in den höchsten Mastkorb, lange Rutsche zur Fock
    .stair(9, 28, 5, 1).fill(14, 24, 26, 24, '=')                      // Besan: untere Rah
    .stair(26, 23, 5, -1).fill(15, 19, 21, 19, '=')                    // obere Rah
    .stair(15, 18, 5, 1).fill(20, 14, 23, 14, '=')                     // Mastkorb
    .zip(23, 14, 35, 18)
    .fill(33, 18, 44, 18, '=')                                         // Großmast: untere Rah
    .stair(44, 17, 5, -1).fill(33, 13, 39, 13, '=')                    // Mittelrah
    .stair(34, 12, 5, 1).fill(39, 8, 42, 8, '=')                       // Großmastkorb, ganz oben
    .zip(42, 8, 62, 23)
    .fill(61, 23, 72, 23, '=')                                         // Fock-Rah
    .mast(20.5, 6, [14, 19, 24]).mast(38.5, 1, [8, 13, 18, 26], 2).mast(66.5, 10, [16, 23, 27]).wheel(6, 29)
    .candle(4, 27).candle(8, 27, 'W').candle(15, 30, 'H').candle(23, 30).candle(41, 30).candle(49, 30, '$').candle(53, 30, 'H')
    .candle(16, 22).candle(25, 22, 'H').candle(17, 17).candle(21, 12, 'W')
    .candle(36, 16, 'H').candle(43, 16).candle(35, 11).candle(40, 6, 'R').candle(42, 6, 'H')
    .candle(64, 21).candle(70, 21, '1').candle(63, 27).candle(70, 27, 'H').candle(86, 27).candle(91, 27, 'W')
    .enemy('skel', 40, 31).enemy('skel', 69, 28).enemy('bat', 28, 10).enemy('bat', 50, 6).enemy('bat', 30, 22)
    .enemy('raven', 17, 18).enemy('raven', 66, 22).enemy('ghost', 52, 14)
    .cargo(51, 31) // Frachtkiste „UPEL“ – Gruß an Infernax
    // Grüße an Monkey Island: Schiffsname, Grogfass, Gummihuhn mit Rolle in der Mitte, dreiköpfiger Affe
    .sign(1, 30, 6, 'SEA MONKEY')
    .prop('grog', { x: 29, y: 31 })
    .prop('chicken', { x: 41, y: 7 })
    .prop('monkey', { x0: 20, x1: 23, row: 14 })
    .zone('sea', 14, 56, { interval: 150, max: 2 })
    .zone('eagle', 6, 72, { interval: 300, max: 1 })
    .statue(45, 31).mini('tentacle', 53, 69, 55, 22) // Kontrollpunkt, dann der lila Tentakel vor dem Anlegen
    .dock(62, 74, 80, 29).music('sea')
    .start(3, 28).exit(94).noDoor().done();

  // ======================= STAGE 1: Der Burghof =======================
  const r11 = room(72, 'courtyard')
    .ground(0, 71)
    .fill(28, 9, 30, 10, '=')
    .fill(44, 10, 45, 10, '=')
    .candle(5, 9).candle(11, 9, 'W').candle(17, 9).candle(23, 9, 'H').candle(29, 7)
    .candle(35, 9, '1').candle(41, 9).candle(47, 9, 'W').candle(53, 9, '$').candle(59, 9).candle(64, 9, 'H')
    .enemy('raven', 29, 8).enemy('raven', 45, 9)
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
    .bell()
    .start(2, 27).exitAt(25, 0, 27, 5).done();

  const r12 = room(104, 'hall')
    .ground(0, 15).ground(18, 51).ground(63, 103)
    .stair(24, 10, 4, 1).fill(28, 7, 44, 7, '=').stair(48, 10, 4, -1)
    .set(38, 10, '=').set(38, 9, 'X')
    .grand(57.5, 0, 140, 0.32, 0)
    .statue(64, 10)
    .fill(91, 8, 93, 8, '=').fill(98, 8, 100, 8, '=')
    .candle(5, 9).candle(11, 9, '5').candle(21, 9).candle(33, 9).candle(32, 5).candle(38, 5, 'H').candle(42, 5, 'M')
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
    .enemy('skel', 46, 9)
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
    .candle(4, 9).candle(16, 4, 'M').candle(23, 4, 'H').candle(20, 9, '$').candle(37, 9, '3').candle(44, 9)
    .candle(48, 9, 'W').candle(56, 9).candle(60, 9, 'H').candle(66, 9).candle(72, 9, 'H')
    .chest(24, 5, 'big')
    .enemy('skel', 18, 5).enemy('skel', 45, 10).enemy('knight', 50, 10)
    .enemy('bat', 30, 3).enemy('bat', 54, 4).enemy('ghost', 60, 6)
    .start(2, 10).arena('giant').done();

  // ======================= STAGE 3: Der Bergfried (entschärft) =======================
  const r31 = room(64, 'tower')
    .ground(0, 12).fill(13, 12, 20, 12, '^').ground(21, 63)
    .cog(16.5, 7, 44, 4, 0.011)
    .pendulum(28, 0, 150, 0.55, 0).pendulum(53, 0, 150, 0.55, Math.PI)
    .statue(24, 10)
    .crumble(34, 8).crumble(37, 8)
    .set(52, 10, 'X')
    .candle(4, 9).candle(9, 9, 'H').candle(16, 1, 'M').candle(28, 9).candle(35, 6, 'H').candle(38, 6, '5')
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
    .fill(21, 9, 22, 9, '=').fill(32, 8, 33, 8, '=').fill(42, 9, 43, 9, '=').fill(49, 9, 50, 9, '=')
    .statue(4, 10)
    .candle(12, 7, 'H').candle(27, 7).candle(37, 6, 'H').candle(54, 7, '$').candle(60, 9, 'H').candle(32, 2, '1').candle(50, 2, 'W')
    .zone('skull', 10, 56, { interval: 640, max: 1 })
    .start(2, 10).exit(62).done();

  // Glasturm: senkrechter Aufstieg zum Thronsaal zwischen riesigen Buntglasfenstern (Treppen im Zickzack, zwei Aufzüge)
  const vg = room(28, 'glass', 44)
    .ground(0, 27)
    .stair(6, 41, 5, 1).fill(11, 37, 18, 37, '=')
    .stair(14, 36, 5, 1).fill(19, 32, 26, 32, '=')
    .stair(24, 31, 5, -1).fill(10, 27, 19, 27, '=')
    .elevator(8, 27, 19).fill(10, 19, 15, 19, '=')
    .stair(12, 18, 5, 1).fill(17, 14, 25, 14, '=')
    .stair(24, 13, 5, -1).fill(10, 9, 19, 9, '=')
    .elevator(8, 9, 3).fill(10, 3, 16, 3, '=')
    .statue(16, 26)
    .candle(12, 35).candle(17, 35, 'H').candle(21, 30).candle(25, 30, '$').candle(11, 25, 'H').candle(18, 25)
    .candle(11, 17, 'H').candle(19, 12, 'W').candle(24, 12).candle(12, 7, 'H').candle(17, 7).candle(13, 1, 'R')
    .chest(22, 31, 'big')
    .enemy('knight', 14, 26).enemy('ghost', 16, 34).enemy('ghost', 20, 6).enemy('bat', 22, 24).enemy('bat', 6, 15)
    .zone('skull', 0, 27, { interval: 420, max: 1 })
    .start(2, 41).exitAt(11, 0, 15, 2).done();

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
    { name: 'DER BURGHOF', music: 'stage1', time: 600, rooms: [r10, r11, v1, r12], boss: 'RIESENFLEDERMAUS' },
    { name: 'DIE KATAKOMBEN', music: 'stage2', time: 420, rooms: [r21, v2, r22], boss: 'KNOCHENRIESE' },
    { name: 'DER BERGFRIED', music: 'stage3', time: 780, rooms: [r31, v3, vx, vg, r32], boss: 'GRAF NACHTMAHR' },
  ];

  return { STAGES };
})();
