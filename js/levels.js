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
      label(name) { r.label = name; return api; }, // Name in der Abschnittswahl
      atSea() { r.atSea = true; return api; }, // Schiff in voller Fahrt (Rollen, ziehendes Meer) ohne Anlegen
      noDoor() { r.noDoor = true; return api; },
      wrap() { r.wrap = true; return api; }, // Turmmantel: rechter und linker Rand sind verbunden
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

  // ======================= STAGE 1: Tutorial auf dem Achterschiff =======================
  // Kurz vor der Burg: das Achterschiff der Galeone im aufziehenden Sturm. Jede Station bringt einen Move bei, die Tafel
  // oben zeigt die Tasten für das gerade benutzte Gerät (Tastatur, Xbox-Controller, Touch): Laufen, Angriff, Spezialwaffe,
  // Sprung und Doppelsprung, Kante packen (Kistenturm), Rutschen (niedrige Luke unter der Kajüte), Dash (gebrochenes Deck)
  // und Wandsprung (Schacht vor der Kampanje) – jede dieser Stationen schafft man nur mit ihrem Move.
  const r09 = room(80, 'ship', 34)
    .ground(0, 45).ground(55, 79)                                      // Deck (Oberkante Reihe 32), 9 Planken weggebrochen: Dash
    .fill(18, 30, 19, 31, '=')                                         // Kiste: springen
    .fill(29, 26, 30, 31, '=')                                         // Kistenturm (6 hoch): Doppelsprung reicht nicht – Kante packen
    .fill(36, 17, 42, 30, '#')                                         // Kajüte, darunter nur eine Kachel hohe Luke: rutschen
    .prop('crawl', { x0: 36, x1: 42, row: 31 })
    .fill(60, 16, 60, 28, '#')                                         // Wandsprung-Schacht: linke Wand (unten offen)
    .fill(65, 12, 79, 31, '#')                                         // Kampanje: hohes Achterdeck, oben der Weg nach vorn
    .prop('tut', { x: 0, y: 24, w: 8, h: 8, key: 'move' })
    .prop('tut', { x: 8, y: 24, w: 5, h: 8, key: 'attack' })
    .prop('tut', { x: 13, y: 24, w: 3, h: 8, key: 'sub' })
    .prop('tut', { x: 16, y: 22, w: 7, h: 10, key: 'jump' })
    .prop('tut', { x: 23, y: 18, w: 8, h: 14, key: 'ledge' })
    .prop('tut', { x: 31, y: 22, w: 5, h: 10, key: 'slide' })
    .prop('tut', { x: 43, y: 22, w: 3, h: 10, key: 'dash' })
    .prop('tut', { x: 55, y: 10, w: 10, h: 22, key: 'wall' })
    .candle(9, 30).candle(11, 30, '1').candle(22, 30, 'H').candle(30, 24, '$').candle(33, 30).candle(44, 30, 'H')
    .candle(57, 30).candle(62, 22, 'H').candle(63, 15).candle(70, 10, 'H').candle(75, 10, 'W')
    .mast(24.5, 3, [8, 13]).mast(57.5, 2, [7, 11], 1)
    .atSea().music('sea')
    .start(3, 31).exitAt(76, 0, 79, 11).noDoor().done();

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
    .enemy('skel', 40, 31).enemy('bat', 50, 6).enemy('raven', 66, 22) // wenige Gegner: das Schiff soll Spaß machen, nicht zermürben
    .cargo(51, 31) // Frachtkiste „UPEL“ – Gruß an Infernax
    // Grüße an Monkey Island: Schiffsname, Grogfass, Gummihuhn mit Rolle in der Mitte, dreiköpfiger Affe
    .sign(1, 30, 6, 'SEA MONKEY')
    .prop('grog', { x: 29, y: 31 })
    .prop('chicken', { x: 41, y: 7 })
    .prop('monkey', { x0: 20, x1: 23, row: 14 })
    .zone('sea', 14, 56, { interval: 320, max: 1 })
    .zone('eagle', 6, 72, { interval: 640, max: 1 })
    .statue(45, 31).mini('tentacle', 53, 69, 55, 22) // Kontrollpunkt, dann der lila Tentakel vor dem Anlegen
    .dock(62, 74, 80, 29).music('sea')
    .start(3, 28).exit(94).noDoor().done();

  // ======================= STAGE 1: Der Wald vor der Burg =======================
  // Von der Mole geht es durch einen dichten Wald zum Burggraben. Aufgebaut wie ein Weg, den man sich erkämpft:
  // ein einzelner Ritter bewacht die Anhöhe vor dem umgestürzten Riesenstamm (drunter durchrutschen oder hinüber – oben
  // liegt ein Toter mit einem Fund), dahinter ein Rastfeuer. Am zweiten Bach steht ein toter Baum: anpeitschen, und er
  // wird zur Brücke. Unten am Waldboden lauert ein Hinterhalt, oben führt ein Astweg mit Truhe vorbei. Zuletzt geht es
  // an Schädeln auf Pfählen vorbei zum Burggraben.
  const wd = room(104, 'forest')
    .ground(0, 13).ground(18, 30).fill(14, 12, 17, 12, '~')            // Bach: breiter Graben mit Wasser
    .fill(22, 8, 27, 8, '=')                                             // Ast über dem Weg
    .stair(28, 10, 3, 1).ground(31, 44, 8)                               // Wurzeltreppe auf die Anhöhe
    .fill(37, 5, 41, 6, '=')                                             // umgestürzter Riesenstamm auf der Anhöhe
    .stair(47, 10, 3, -1).ground(45, 60)                                 // wieder hinunter
    .fill(52, 7, 57, 7, '=')                                             // Ast, auf dem ein Panther lauert
    .fill(61, 12, 70, 12, '~').fill(64, 11, 64, 12, '#').fill(67, 11, 67, 12, '#') // zweiter Bach mit Trittsteinen
    .prop('felltree', { x: 60, row: 11, len: 10 })                       // toter Baum: wird zur Brücke
    .ground(71, 103)
    .stair(72, 10, 4, 1).fill(76, 7, 85, 7, '=').stair(89, 10, 4, -1)  // Astweg über dem Waldboden
    .prop('stake', { x: 94, y: 10 }).prop('stake', { x: 97, y: 10 })    // Schädel auf Pfählen: die Burg ist nah
    .candle(5, 9, 'H').candle(10, 9).candle(20, 9, 'W').candle(25, 6).candle(32, 6).candle(43, 6, 'H')
    .candle(53, 9).candle(56, 5, '$').candle(58, 9, '1').candle(71, 9).candle(80, 5, 'H')
    .candle(92, 9, 'W')
    .enemy('raven', 24, 7).enemy('knight', 35, 7).enemy('bat', 38, 2).enemy('panther', 55, 6).enemy('raven', 82, 6).enemy('ghost', 88, 5)
    .prop('relic', { x: 39, y: 4, loot: 'oneUp' })                       // oben auf dem Riesenstamm
    .prop('campfire', { x: 49, y: 10 })                                  // Rastfeuer hinter dem Wächter
    .prop('ambush', { x: 77, n: 3 })                                     // Hinterhalt am Waldboden
    .chest(84, 6)                                                        // Belohnung für den Astweg
    .prop('relic', { x: 90, y: 10, loot: 'heartB' })
    .zone('ghoul', 86, 98, { interval: 220, max: 1 })
    .music('stage1')
    .start(2, 10).exit(102).noDoor().done();

  // ======================= STAGE 1: Der Burghof =======================
  const r11 = room(72, 'courtyard')
    .ground(0, 7).ground(16, 71).fill(8, 12, 15, 12, '~')              // Burggraben vor dem Torhaus
    .prop('gate', { x0: 8, x1: 15, gx: 18, winch: 4, row: 11 })         // Zugbrücke, Fallgitter, Seilwinde
    .prop('stake', { x: 1, y: 10 }).prop('stake', { x: 6, y: 10 })     // Schädel auf Pfählen am Ufer
    .fill(28, 9, 30, 10, '=')
    .fill(44, 10, 45, 10, '=')
    .candle(3, 9).candle(11, 9, 'W').candle(31, 9).candle(33, 9, 'H').candle(29, 7)
    .candle(35, 9, '1').candle(41, 9).candle(47, 9, 'W').candle(53, 9, '$').candle(59, 9).candle(68, 9, 'H')
    .enemy('raven', 45, 9)
    .chest(61, 10)
    .fill(64, 1, 66, 9, '#')                                           // eingestürzter Mauerbogen: darunter nur eine Kachel Luft – rutschen
    .prop('crawl', { x0: 64, x1: 66, row: 10, style: 'stone' })
    .prop('hint', { x: 59, y: 8, w: 4, h: 3, key: 'hintSlide' })
    .zone('ghoul', 29, 60, { interval: 110, max: 3 })
    .music('stage1') // nach dem Seemannslied: Burgsturm bis zur Riesenfledermaus
    .start(2, 10).exit(70).done();

  // Eingangshalle: hoch, deckenhohe Fenster, Gewitter (Blitzlicht und Dunkelheit), fallende Kronleuchter,
  // Jaguare auf Galerie und Simsen, Zombies, Fledermäuse, Ritterrüstungen – manche erwachen zum Leben
  const eh = room(84, 'foyer', 20)
    .ground(0, 83, 18)
    .stair(20, 17, 6, 1).fill(26, 12, 46, 12, '=').stair(52, 17, 6, -1)   // große Treppe mit rotem Läufer zur Galerie
    .fill(31, 7, 37, 7, '=')                                               // Sims über der Galerie
    .fill(62, 13, 68, 13, '=')                                             // Sims rechts
    .prop('fchand', { x: 12, y: 0, len: 128 }).prop('fchand', { x: 40, y: 0, len: 92 }).prop('fchand', { x: 58, y: 0, len: 140 }).prop('fchand', { x: 76, y: 0, len: 132 })
    .prop('armor', { x: 5, y: 17 }).prop('armor', { x: 16, y: 17, live: true, flip: true }).prop('armor', { x: 28, y: 11 }).prop('armor', { x: 44, y: 11, live: true, flip: true })
    .prop('armor', { x: 60, y: 17, live: true }).prop('armor', { x: 72, y: 17 })
    .enemy('panther', 34, 6).enemy('panther', 65, 12).enemy('panther', 38, 11)
    .enemy('bat', 24, 2).enemy('bat', 52, 3).enemy('bat', 79, 2)
    .candle(3, 15).candle(9, 15, 'H').candle(23, 9).candle(33, 9, 'W').candle(42, 9).candle(48, 15, '$').candle(56, 15, 'H').candle(66, 10).candle(78, 15, '2')
    .statue(48, 17)
    .prop('portrait', { wx: 160, wy: 26, v: 0 }).prop('portrait', { wx: 416, wy: 26, v: 1 }) // Ahnenbilder zwischen den Fenstern, ihre Augen folgen
    .zone('ghoul', 4, 80, { interval: 170, max: 2 })
    .start(2, 17).exit(82).done();

  // Glockenturm: vertikaler Aufstieg (Treppen, Aufzug, Kronleuchter)
  const v1 = room(28, 'hall', 30)
    .ground(0, 27, 28)
    .stair(4, 27, 5, 1).fill(9, 23, 15, 23, '=')
    .fill(18, 21, 24, 21, '=')
    .stair(22, 20, 5, -1).fill(2, 16, 17, 16, '=')
    .fill(1, 8, 1, 15, '#').fill(6, 10, 6, 13, '#')                    // Wandsprung-Schacht statt Aufzug (oder Doppelsprung + Kante packen)
    .prop('hint', { x: 2, y: 13, w: 4, h: 3, key: 'hintWall' })
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
    .candle(50, 9, '$').candle(53, 3, 'H').candle(61, 3).candle(67, 9, 'W').candle(73, 9, 'H').candle(80, 9, '2').candle(86, 9, 'W')
    .enemy('bat', 14, 3).enemy('bat', 40, 2).enemy('bat', 70, 3)
    .zone('ghoul', 18, 50, { interval: 140, max: 2 })
    .prop('portrait', { wx: 136, wy: 30, v: 0 }) // ein Ahnenbild pro Joch, zwischen Fenster und Pfeiler
    .start(2, 10).arena('gbat').done();

  // ======================= STAGE 2: Die Katakomben =======================
  const r21 = room(96, 'cave')
    .ground(0, 19).fill(20, 11, 78, 12, '~').ground(79, 95)
    .fill(22, 9, 25, 9, '=').fill(28, 9, 31, 9, '=').fill(34, 8, 37, 8, '=')
    .fill(40, 10, 47, 12, '#')
    .fill(57, 9, 64, 9, '=').crumble(67, 9).crumble(69, 9).fill(73, 10, 76, 10, '=')
    .statue(43, 9)
    .candle(5, 9).candle(12, 9, 'H').candle(23, 7).candle(35, 6, 'H').candle(46, 8).candle(58, 7, '4')
    .candle(62, 7).candle(68, 7, '$').candle(84, 9).candle(90, 9, 'H')
    .enemy('skel', 46, 9)
    .prop('hint', { x: 44, y: 7, w: 4, h: 3, key: 'hintDash' }) // 9 Kacheln See: nur mit Dash-Sprung oder Luft-Dash
    .prop('waterfall', { x: 59.5, y0: 0, y1: 11, w: 40 })                // großer Wasserfall in den Höhlensee
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
    .prop('waterfall', { x: 17, y0: 0, y1: 28, w: 32 })
    .start(2, 27).exitAt(24, 0, 27, 4).done();

  const r22 = room(96, 'crypt')
    .ground(0, 95)
    .stair(8, 10, 5, 1).fill(13, 6, 26, 6, '=').stair(31, 10, 5, -1)
    .set(40, 9, 'X').set(40, 10, 'Y')
    .statue(34, 10)
    .fill(83, 8, 85, 8, '=').fill(90, 8, 92, 8, '=')
    .candle(4, 9).candle(16, 4, 'M').candle(23, 4, 'H').candle(20, 9, '$').candle(37, 9, '3').candle(44, 9)
    .candle(48, 9, 'W').candle(56, 9, 'W').candle(60, 9, 'H').candle(66, 9).candle(72, 9, 'H')
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

  // Marmorgalerie (Ende von Stage 3, Arena der Medusa): ein langer Säulengang. Hinten stehen drei Säulenreihen in echter Perspektive (PS1-Look), Mondlicht fällt
  // durch hohe Fenster und streift die Säulen, Kerzen flackern, vorn ziehen dunkle Säulen vorbei. Lebende Rüstungen als Wache.
  const mg = room(96, 'gallery')
    .ground(0, 95)
    .fill(16, 8, 20, 8, '=').fill(34, 7, 38, 7, '=').fill(46, 9, 49, 10, '#').fill(58, 7, 62, 7, '=').fill(76, 8, 80, 8, '=')
    .prop('candelabra', { x: 6, y: 10 }).prop('candelabra', { x: 26, y: 10 }).prop('candelabra', { x: 54, y: 10 }).prop('candelabra', { x: 70, y: 10 }).prop('candelabra', { x: 88, y: 10 })
    .prop('armor', { x: 12, y: 10 }).prop('armor', { x: 30, y: 10, live: true, flip: true }).prop('armor', { x: 66, y: 10 }).prop('armor', { x: 84, y: 10, flip: true })
    .candle(18, 5, 'H').candle(36, 4, '$').candle(42, 8).candle(48, 9, 'H').candle(54, 9, 'W').candle(57, 9, 'W').candle(60, 4, 'H').candle(64, 8).candle(78, 5, 'H').candle(92, 8)
    .enemy('ghost', 24, 5).enemy('ghost', 44, 4).enemy('knight', 40, 10)
    .statue(52, 10) // Kontrollpunkt vor Medusa, danach zwei Peitschen-Kerzen
    .music('stage3')
    .start(2, 10).arena('medusa').done();

  // Bibliotheksturm: senkrechter Aufstieg zwischen deckenhohen Bücherwänden. Erst eine Kante, die man nur mit dem
  // Doppelsprung packt und sich hochzieht, dann zwei Wandsprung-Schächte zwischen den Regalen, oben eine Lücke, die nur
  // ein Dash-Sprung oder Luft-Dash überbrückt. Fliegende Bücher, Zauberbücher, Lesepulte, Globen, eine Empore mit Truhe.
  const lb = room(36, 'library', 50)
    .fill(0, 0, 0, 49, 'B').fill(35, 0, 35, 49, 'B').fill(1, 0, 30, 0, 'B')   // Bücherwände links und rechts, Decke
    .ground(0, 35, 48)
    .stair(5, 47, 4, 1).fill(9, 44, 16, 44, '=')                           // Treppe zur ersten Galerie
    .fill(20, 38, 34, 47, 'B').fill(23, 38, 34, 38, '=')                     // Riesenregal: Kante bei x 20 packen und hochziehen
    .fill(1, 40, 4, 40, '=').fill(3, 31, 6, 31, '=')                         // Regalbrett links, Lesenische (Wandsprung an der Außenwand)
    .fill(29, 23, 30, 34, 'B')                                               // Regalpfeiler: Wandsprung-Schacht rechts (x 31–34)
    .fill(17, 23, 28, 23, '=')                                               // Galerie Mitte
    .stair(17, 22, 5, -1).fill(1, 18, 12, 18, '=')                           // Treppe zur Galerie links
    .fill(5, 5, 6, 14, 'B').fill(5, 4, 13, 4, '=')                           // Regalpfeiler: Wandsprung-Schacht links (x 1–4), oben Galerie
    .fill(21, 4, 34, 4, '=')                                                 // Galerie zum Ausgang – davor 7 Kacheln Luft: nur mit Dash
    .fill(25, 17, 28, 17, '=').fill(23, 12, 27, 14, 'B')                     // Leiterbrett und Empore mit Truhe
    .prop('hint', { x: 15, y: 40, w: 4, h: 4, key: 'hintLedge' }).prop('hint', { x: 30, y: 34, w: 3, h: 4, key: 'hintWall' })
    .prop('hint', { x: 8, y: 1, w: 4, h: 3, key: 'hintDash' })
    .prop('lectern', { x: 13, y: 47 }).prop('lectern', { x: 9, y: 17 }).prop('lectern', { x: 28, y: 3 })
    .prop('globe', { x: 17, y: 47 }).prop('globe', { x: 26, y: 37 })
    .enemy('book', 12, 43).enemy('book', 25, 37).enemy('book', 32, 30).enemy('book', 21, 22).enemy('book', 7, 17).enemy('book', 10, 3)
    .enemy('book', 27, 16).enemy('book', 31, 3)
    .enemy('tome', 11, 33).enemy('tome', 20, 9)
    .candle(3, 45, 'H').candle(11, 41).candle(15, 41, 'W').candle(2, 37, '$').candle(4, 28, 'H').candle(6, 28, '2')
    .candle(24, 35).candle(32, 34, 'H').candle(33, 26).candle(19, 20, 'H').candle(27, 20).candle(9, 15).candle(3, 15, 'H')
    .candle(2, 9).candle(10, 1, '$').candle(24, 9, 'H').candle(26, 1, 'R').candle(33, 1, 'H')
    .chest(25, 11, 'big').chest(4, 30, 'life')
    .statue(24, 22)
    .zone('books', 2, 33, { interval: 260, max: 2 })
    .music('library')
    .start(2, 47).exitAt(31, 0, 34, 3).done();

  // Uhrturm-Zahnradwerk: senkrechter Aufstieg durch ineinandergreifende Räder. Ganz unten ein Riesenrad über der
  // Stachelgrube, dessen Zähne dem Helden entgegenrollen, daneben ein kleineres im Gegenlauf. Rechts ein Wandsprung-
  // Schacht zum Steinpfeiler, darüber eine liegende Mode-7-Drehscheibe, hinter der ein stehendes Rad in den Zahnkranz
  // greift; es treibt zwei weitere Räder, auf dem obersten ruht die zweite Drehscheibe (Kronrad) – von dort zum Ausgang.
  const gw = room(32, 'tower', 42)
    .ground(0, 5, 40).fill(6, 41, 21, 41, '^').ground(22, 31, 40)               // Stachelgrube unter dem Riesenrad
    .fill(0, 0, 0, 39, '#').fill(31, 8, 31, 39, '#').fill(1, 0, 26, 0, '#')     // Turmwände und Decke
    .fill(25, 24, 26, 33, '#')                                                  // Steinpfeiler: Wandsprung-Schacht rechts (x 27–30)
    .fill(1, 18, 8, 19, '#')                                                    // Mauervorsprung links (Kante packen)
    .fill(3, 8, 6, 8, '#')                                                      // Nische mit Truhe (Wandsprung an der Turmwand)
    .fill(27, 6, 31, 7, '#')                                                    // Ausgangssims
    .prop('gears', { list: [
      { type: 'wheel', ax: 200, ay: 700, r: 96, v: -0.7 },                    // 0 Riesenrad über der Grube
      { type: 'wheel', mesh: 0, ang: -28, r: 48 },                            // 1 greift ins Riesenrad, läuft gegen
      { type: 'flat', ax: 250, ay: 349.2, r: 80, v: -0.6, shaft: false },     // 2 Drehscheibe über dem Pfeiler
      { type: 'wheel', mesh: 2, xo: -70, r: 48 },                             // 3 steht hinten in ihrem Zahnkranz
      { type: 'wheel', mesh: 3, ang: -45, r: 40 },                            // 4
      { type: 'wheel', mesh: 4, ang: -20, r: 32, walk: false, post: false },  // 5 trägt die obere Scheibe
      { type: 'flat', mesh: 5, r: 64, shaft: false },                         // 6 obere Drehscheibe (Kronrad)
      { type: 'wheel', mesh: 6, xo: 44, r: 26, walk: false, post: false },    // 7 kleines Rad hinten auf der oberen Scheibe
    ] })
    .prop('hint', { x: 27, y: 34, w: 4, h: 6, key: 'hintWall' })
    .statue(25, 23).chest(4, 7, 'life')
    .candle(2, 37, 'H').candle(9, 34, '$').candle(17, 33).candle(24, 36, 'H').candle(29, 36).candle(29, 28, 'H').candle(29, 20)
    .candle(25, 20, 'W').candle(14, 19).candle(5, 15, 'H').candle(2, 5, '$').candle(5, 5, 'H').candle(20, 6).candle(26, 3, 'H').candle(29, 3)
    .enemy('bat', 12, 10).enemy('bat', 28, 14).enemy('ghost', 10, 24).enemy('knight', 23, 39)
    .zone('skull', 2, 30, { interval: 420, max: 1 })
    .start(2, 39).exitAt(27, 0, 30, 5).done();

  // ======================= STAGE 4: Die Sonnenkathedrale =======================
  // Hoch über einer Stadt aus Licht: Strebebögen über dem Abgrund, dahinter dreht sich die PS2-3D-Kathedrale weg.
  // Ankerringe über Schluchten, Wandsprung-Schacht zwischen Strebepfeiler und Turm, Dash-Sprung über den Abgrund,
  // unter einer eingestürzten Mauer hindurchrutschen, Kanten packen – dann der Aufstieg rund um den Sonnenturm.
  const sa = room(128, 'cathedral', 18)
    .ground(0, 13, 16)                                                       // Vorplatz
    .ring(18, 11)                                                            // Schlucht mit Ankerring
    .ground(23, 35, 16)
    .fill(31, 3, 32, 12, '#')                                                // Strebepfeiler: darunter durch in den Schacht
    .fill(36, 5, 40, 17, '#')                                                // Turm: Wandsprung zwischen Pfeiler und Turm
    .fill(41, 5, 54, 5, '=')                                                 // Strebebogen über dem Abgrund
    .fill(62, 5, 70, 17, '#')                                                // nach der Dash-Lücke: Turmdach
    .fill(71, 15, 100, 17, '#')                                              // Kathedralenterrasse
    .fill(80, 0, 86, 13, '#')                                                // eingestürzte Mauer: nur rutschend darunter durch
    .prop('crawl', { x0: 80, x1: 86, row: 14, style: 'stone' })
    .fill(96, 12, 100, 14, '#')                                              // Absatz: Kante packen
    .ring(104, 8).crumble(107, 11).ring(110, 8)                              // zwei Ringe über der zweiten Schlucht, dazwischen ein bröckelnder Stein
    .fill(115, 12, 127, 17, '#')
    .prop('hint', { x: 9, y: 12, w: 4, h: 4, key: 'hintRing' })
    .prop('hint', { x: 33, y: 9, w: 3, h: 7, key: 'hintWall' })
    .prop('hint', { x: 49, y: 2, w: 4, h: 3, key: 'hintDash' })
    .prop('hint', { x: 75, y: 12, w: 4, h: 3, key: 'hintSlide' })
    .prop('hint', { x: 92, y: 12, w: 3, h: 3, key: 'hintLedge' })
    .statue(26, 15).statue(66, 4).statue(120, 11)
    .candle(4, 13).candle(9, 13, 'H').candle(18, 7, '$').candle(28, 13).candle(30, 13, 'W').candle(38, 2, 'H')
    .candle(45, 2).candle(52, 2, 'H').candle(65, 2, '2').candle(74, 12).candle(78, 12, 'H').candle(90, 12, '$').candle(94, 12)
    .candle(98, 9, 'H').candle(108, 5, 'W').candle(121, 9).candle(125, 9, 'H')
    .enemy('knight', 30, 15).enemy('raven', 47, 4).enemy('raven', 68, 4).enemy('skel', 90, 14).enemy('knight', 95, 14)
    .enemy('ghost', 112, 4)
    .zone('skull', 41, 70, { interval: 640, max: 1 })
    .music('sun')
    .start(2, 15).exit(124).done();

  // Sonnenturm: der Raum ist der abgewickelte Turmmantel (wrap) – rechts hinaus ist links wieder herein. Der Aufstieg
  // windet sich um den Turm: Stufen, Kante packen, Wandsprung zwischen Strebepfeilern, Dash über die Lücke (über die Naht),
  // unter einem Gesims hindurchrutschen, Ankerringe, zweiter Schacht – oben das Portal zum Dach.
  const sp = room(56, 'spire', 64)
    .ground(0, 55, 62)
    .fill(6, 60, 10, 60, '=').fill(13, 58, 17, 58, '=').fill(20, 55, 24, 55, '=')
    .fill(27, 53, 37, 53, '=')                                               // Sims bis in den Schacht
    .fill(34, 40, 34, 50, '#').fill(38, 38, 38, 53, '#')                     // Strebepfeiler: Wandsprung-Schacht (x 35–37)
    .fill(38, 37, 43, 37, '=')                                               // oben: Sims (Kante packen)
    .fill(51, 37, 55, 37, '=').fill(0, 35, 4, 35, '=')                       // Dash-Lücke, dann über die Naht
    .fill(7, 33, 16, 33, '=')
    .fill(10, 25, 13, 31, '#').prop('crawl', { x0: 10, x1: 13, row: 32, style: 'stone' }) // Gesims: rutschen
    .ring(21, 28)
    .fill(25, 31, 29, 31, '=')
    .fill(32, 28, 35, 28, '=').fill(38, 25, 41, 25, '=')
    .fill(42, 24, 47, 24, '=')                                               // zweiter Schacht
    .fill(44, 10, 44, 21, '#').fill(48, 8, 48, 24, '#')
    .fill(48, 7, 53, 7, '=')
    .ring(1, 3)                                                              // über die Naht schwingen
    .fill(5, 6, 13, 6, '=')
    .prop('hint', { x: 35, y: 46, w: 3, h: 6, key: 'hintWall' })
    .prop('hint', { x: 39, y: 34, w: 4, h: 3, key: 'hintDash' })
    .prop('hint', { x: 6, y: 30, w: 3, h: 3, key: 'hintSlide' })
    .prop('hint', { x: 15, y: 30, w: 2, h: 3, key: 'hintRing' })
    .statue(40, 36).statue(50, 6)
    .candle(8, 58).candle(15, 56, 'H').candle(22, 53).candle(29, 51, '$').candle(36, 44, 'H').candle(42, 35)
    .candle(53, 35, 'W').candle(2, 33, 'H').candle(15, 31).candle(21, 24, '$').candle(28, 29, 'H').candle(34, 26)
    .candle(40, 23, 'H').candle(46, 16).candle(52, 5, 'H').candle(6, 4, 'U').candle(8, 4)
    .enemy('bat', 18, 50).enemy('raven', 30, 52).enemy('skel', 41, 36).enemy('ghost', 2, 30).enemy('knight', 27, 30)
    .enemy('bat', 36, 22).enemy('raven', 52, 6).enemy('bat', 8, 3)
    .wrap().music('sun')
    .start(2, 61).exitAt(9, 0, 12, 5).done();

  // Dach der Sonnenkathedrale: Arena des Sonnenwächters (Simse zum Ausweichen, Mauer rechts für Wandsprünge)
  const sk = room(46, 'cathedral', 13)
    .ground(0, 45, 11)
    .fill(45, 0, 45, 10, '#')
    .fill(28, 7, 30, 7, '=').fill(38, 7, 40, 7, '=')
    .statue(8, 10)
    .candle(4, 8, 'H').candle(12, 8).candle(16, 8, 'W').candle(20, 8, 'H')
    .start(2, 10).arena('warden').done();

  // ======================= STAGE 5: Der Wintergarten =======================
  // Ein Glaspalast wie die großen Gewächshäuser des 19. Jahrhunderts: grün lackierte Stahlrippen, ein Glasgewölbe hoch wie
  // ein Kirchenschiff, drei Galerien aus Gusseisen übereinander, Palmen, Gaskronen – und durch das Glas fällt Mondlicht.
  // Die ausgestellten fleischfressenden Pflanzen sind ausgebrochen.
  // Palmenhaus: in der Mitte ein Becken voller Verdauungssaft – hinüber geht es nur oben. Im Zickzack treppauf über drei
  // Galerien, über bröckelnde Simse über das Becken, ganz oben unter dem Gewölbe eine Schatzgalerie, dann die lange Treppe hinab.
  const ex1 = room(100, 'expo', 30)
    .ground(0, 37, 28).fill(38, 28, 61, 29, '~').ground(62, 99, 28)      // Boden (Oberkante Reihe 28), Becken in der Mitte
    .stair(8, 27, 5, 1).fill(13, 23, 31, 23, '=')                         // erste Galerie
    .stair(31, 22, 5, -1).fill(12, 18, 26, 18, '=')                       // zweite Galerie, zurück nach links
    .stair(14, 17, 5, 1).fill(19, 13, 40, 13, '=')                        // dritte Galerie bis an das Becken
    .crumble(43, 13).crumble(47, 12).crumble(51, 13).crumble(55, 12)     // bröckelnde Simse über dem Becken
    .fill(59, 13, 72, 13, '=')                                            // Galerie jenseits des Beckens
    .stair(64, 12, 7, -1).fill(44, 6, 57, 6, '=')                         // ganz oben unter dem Gewölbe: Schatzgalerie
    .stair(87, 27, 15, -1)                                                // lange Treppe hinab
    .enemy('snapper', 18, 27).enemy('snapper', 30, 27).enemy('pitcher', 34, 27)
    .enemy('pitcher', 20, 22).enemy('snapper', 25, 22).enemy('snapper', 20, 17).enemy('pitcher', 36, 12).enemy('snapper', 28, 12)
    .enemy('snapper', 68, 12).enemy('pitcher', 52, 5)
    .enemy('snapper', 70, 27).enemy('pitcher', 77, 27).enemy('snapper', 84, 27).enemy('pitcher', 93, 27)
    .enemy('bat', 48, 9).enemy('bat', 56, 10).enemy('bat', 30, 7).enemy('bat', 80, 8)
    .candle(4, 27, 'H').candle(12, 27).candle(26, 27, 'W').candle(16, 22).candle(29, 22, 'H').candle(13, 17, '1').candle(24, 17)
    .candle(26, 12, 'H').candle(38, 12).candle(61, 12).candle(70, 12, 'W').candle(45, 5, '$').candle(56, 5, 'H')
    .candle(66, 27, '$').candle(90, 27).candle(95, 27, 'H')
    .chest(50, 5, 'big')
    .statue(22, 12)
    .music('expo').label('PALMENHAUS')
    .start(2, 27).exit(98).done();
  // Halle der Maschinen: Seerosenbecken (Blätter tragen nur kurz), ein riesiges Zahnrad als Ausstellungsstück, Laufgänge;
  // das Zahnrad hebt bis zu einem Laufsteg hoch unter den Galerien
  const ex2 = room(96, 'expo', 18)
    .ground(0, 18).ground(24, 46).ground(52, 95)
    .fill(19, 17, 23, 17, '~').fill(47, 17, 51, 17, '~').crumble(20, 16).crumble(48, 16)
    .cog(34.5, 11, 44, 4, 0.011)
    .fill(37, 6, 46, 6, '=')
    .fill(58, 12, 68, 12, '=').stair(54, 15, 4, 1).fill(76, 13, 84, 13, '=')
    .enemy('snapper', 12, 15).enemy('snapper', 44, 15).enemy('snapper', 63, 11).enemy('snapper', 90, 15)
    .enemy('pitcher', 28, 15).enemy('pitcher', 80, 12).enemy('pitcher', 72, 15).enemy('pitcher', 44, 5)
    .candle(4, 15).candle(15, 15, 'H').candle(27, 15).candle(40, 15, 'W').candle(57, 15).candle(66, 11, 'H').candle(86, 15, '2')
    .candle(39, 5, '$').candle(42, 5, 'H')
    .statue(53, 15)
    .music('expo').label('MASCHINENHALLE')
    .start(2, 15).exit(94).done();
  // Aufstieg in die Kuppel: senkrecht hinauf über Treppen, Aufzüge und bröckelnde Simse. Unten ein Erfrischungsstand und ein
  // großer Kübel mit Messingschild „NICHT FÜTTERN“ – die Pflanze darin hat Durst. Wer ihr die Limonade bringt, bekommt
  // eine Riesenranke bis hinauf in die versiegelte Sternwarte oben links (Fernrohr, Truhe, 1UP).
  const exk = room(30, 'expo', 56)
    .ground(0, 29)                                                        // Boden (Oberkante Reihe 54)
    .fill(0, 0, 9, 9, '#').fill(1, 4, 8, 7, '.')                          // versiegelte Sternwarte
    .prop('limo', { x: 26, y: 53 })
    .prop('thirsty', { x: 5, y: 53, top: 5, hole: [4, 5, 8, 9] })
    .prop('scope', { x: 1.5, y: 7 }).chest(7, 7, 'life').candle(2, 5, '$')
    .stair(19, 53, 5, 1).fill(24, 49, 29, 49, '=')
    .stair(28, 48, 5, -1).fill(12, 44, 23, 44, '=')
    .elevator(10, 44, 33).fill(12, 33, 21, 33, '=')
    .stair(20, 32, 5, 1).fill(25, 28, 29, 28, '=')
    .crumble(21, 26).crumble(17, 24).crumble(13, 22).fill(10, 20, 13, 20, '=')
    .stair(13, 19, 6, 1).fill(19, 14, 26, 14, '=')
    .elevator(27, 14, 4).fill(11, 4, 26, 4, '=')
    .enemy('snapper', 16, 43).enemy('pitcher', 20, 43).enemy('pitcher', 14, 32).enemy('snapper', 20, 13).enemy('pitcher', 24, 13)
    .enemy('bat', 16, 38).enemy('bat', 22, 18).enemy('bat', 7, 26)
    .candle(14, 52, 'H').candle(26, 47).candle(13, 43, '$').candle(16, 32).candle(28, 27, 'H').candle(11, 19).candle(23, 13, 'W').candle(16, 3, 'H')
    .statue(18, 32)
    .music('expo').label('KUPPEL')
    .start(16, 53).exitAt(12, 0, 22, 3).done();
  // Kuppel: in der Mitte der riesige Pflanzkübel – die Menschenfalle
  const exb = room(46, 'expo')
    .ground(0, 45, 11)
    .fill(45, 0, 45, 10, '#')
    .fill(28, 7, 31, 7, '=').fill(38, 7, 41, 7, '=')
    .statue(8, 10)
    .candle(4, 10, 'H').candle(12, 10).candle(16, 10, 'W').candle(20, 10, 'H')
    .start(2, 10).arena('mantrap').done();

  // ======================= STAGE 6: Der Thron der Nacht =======================
  // Seelenstrudel: schwebende Steine über dem Nichts, Ankerringe, rotierender Mode-7-Tunnel
  const vx = room(64, 'vortex')
    .ground(0, 7).ground(57, 63)
    .fill(11, 9, 13, 9, '=').crumble(17, 8).ring(22, 4).fill(26, 9, 28, 9, '=').ring(32, 4).fill(36, 8, 38, 8, '=')
    .ring(42, 4).crumble(46, 9).ring(50, 4).fill(53, 9, 55, 9, '=')
    .fill(21, 9, 22, 9, '=').fill(32, 8, 33, 8, '=').fill(42, 9, 43, 9, '=').fill(49, 9, 50, 9, '=')
    .statue(4, 10)
    .candle(12, 7, 'H').candle(27, 7).candle(37, 6, 'H').candle(54, 7, '$').candle(60, 9, 'H').candle(32, 2, '1').candle(50, 2, 'W')
    .zone('skull', 10, 56, { interval: 640, max: 1 })
    .prop('tubecocoons', { list: [[40, 30], [110, 150, 'bat'], [170, 90], [230, 200], [20, 215, 'bat'], [140, 10]] }) // in Schleim eingeschlossene Gegner in der Röhrenwand
    .music('chapel') // ab hier bis zum Thronsaal: Orgel-Toccata ohne Wechsel
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
    .start(2, 41).exitAt(11, 0, 15, 2).music('chapel').done();

  // Brücke zum Bergfried: im Sturm hoch über einem Wolkenmeer. Kaum betritt der Held die Brücke, bricht sie hinter ihm
  // weg und ein Fledermausschwarm jagt ihn; Lücken im Deck, eine davon so breit, dass nur ein Dash-Sprung hinüberreicht.
  // In der Mitte eine Turmruine als Kontrollpunkt. Dahinter ein Mode-7-Wolkenstrom im Zeitraffer.
  const br = room(112, 'bridge')
    .fill(0, 9, 5, 12, '#')                                                  // Torbogen am Glasturm
    .fill(6, 9, 104, 9, '=')                                                 // Brückendeck
    .fill(29, 9, 31, 9, '.').fill(47, 9, 53, 9, '.')                         // Lücken – die große (7) nur mit Dash
    .fill(60, 9, 63, 12, '#').fill(60, 6, 60, 8, '#').fill(63, 7, 63, 8, '#') // Turmruine in der Mitte (bleibt stehen)
    .fill(76, 9, 78, 9, '.').fill(89, 9, 92, 9, '.')
    .fill(105, 9, 111, 12, '#')                                              // Torhaus des Bergfrieds
    .prop('bridgerun', { row: 9, x0: 6, x1: 104, end: 106, safe: [[3, 9], [61.5, 9]] })
    .prop('hint', { x: 40, y: 6, w: 4, h: 3, key: 'hintDash' })
    .statue(61, 8)
    .candle(12, 6, 'H').candle(21, 6).candle(36, 6, '$').candle(44, 6, 'H').candle(57, 6).candle(66, 6, 'H').candle(71, 6)
    .candle(84, 6, 'W').candle(97, 6, 'H').candle(102, 6)
    .enemy('raven', 70, 7).enemy('raven', 95, 7)
    .start(2, 8).exit(108).done();

  // Ballsaal: der Ball der Toten. Durch den Spiegelsaal kreisen Geister-Tanzpaare – aus der Tiefe des Saals durch die
  // Spielebene bis vor den Helden –, zum Geistertango zucken Blitze abwechselnd links und rechts durch die Fenster.
  // In der Mitte eine Musikergalerie mit zwei Treppen, vergoldete Standleuchter, vor dem Thronsaal ein Kontrollpunkt.
  const bs = room(112, 'ballroom')
    .ground(0, 111)
    .stair(38, 10, 4, 1).fill(42, 7, 58, 7, '=').stair(62, 10, 4, -1)     // Musikergalerie
    .fill(14, 7, 18, 7, '=').fill(86, 7, 91, 7, '=').fill(100, 5, 104, 5, '=')
    .prop('ghostball', { rings: [16, 52, 92], n: 5 })
    .statue(70, 10)
    .prop('candelabra', { x: 6, y: 10 }).prop('candelabra', { x: 26, y: 10 }).prop('candelabra', { x: 34, y: 10 }).prop('candelabra', { x: 76, y: 10 }).prop('candelabra', { x: 96, y: 10 })
    .candle(10, 8, 'H').candle(16, 5).candle(22, 8, 'W').candle(46, 5, 'H').candle(50, 5, '$').candle(54, 5, 'H').candle(66, 8).candle(82, 8, 'W').candle(88, 5, 'H').candle(102, 3, '1').candle(108, 8)
    .enemy('ghost', 30, 5).enemy('ghost', 74, 4).enemy('ghost', 98, 6).enemy('knight', 50, 6).enemy('bat', 20, 3).enemy('bat', 84, 3)
    .music('ball').label('BALLSAAL')
    .start(2, 10).exit(110).done();

  const r32 = room(88, 'throne')
    .ground(0, 15).ground(26, 87)
    .grand(21, 0, 134, 0.3, 0.8)
    .statue(30, 10)
    .fill(69, 7, 71, 7, '=').fill(86, 7, 87, 7, '=')                     // Plattformen links und rechts neben dem Thron
    .candle(5, 9, 'H').candle(10, 9).candle(18, 2, 'H').candle(34, 9, '1').candle(37, 9, 'W').candle(40, 9, 'W').candle(44, 9, 'U').candle(48, 9, 'R') // nach dem Kontrollpunkt zwei Peitschen-Kerzen
    .enemy('knight', 38, 10).enemy('pillar', 46, 10).enemy('bat', 16, 4).enemy('bat', 40, 3).enemy('ghost', 33, 5)
    .zone('skull', 30, 50, { interval: 420, max: 1 })
    // imposanter Thronsaal: der Thron des Grafen unter dem Baldachin, Feuerschalen, goldene Standleuchter, Rüstungen als Ehrenwache
    .prop('portrait', { wx: 148, wy: 30, v: 2, once: true })
    .prop('throne', { x: 80, y: 10 }).prop('brazier', { x: 75.3, y: 10 }).prop('brazier', { x: 84.7, y: 10 })
    .prop('candelabra', { x: 3, y: 10 }).prop('candelabra', { x: 13, y: 10 }).prop('candelabra', { x: 28, y: 10 }).prop('candelabra', { x: 37, y: 10 }).prop('candelabra', { x: 51, y: 10 }).prop('candelabra', { x: 57, y: 10 })
    .prop('armor', { x: 8, y: 10 }).prop('armor', { x: 32, y: 10, flip: true }).prop('armor', { x: 55, y: 10 }).prop('armor', { x: 60, y: 10, flip: true })
    .start(2, 10).arena('count').done();

  const STAGES = [
    // Kapitel etwa gleich lang (je ~3–5 Abschnitte, ~3–5 Minuten): die Ankunft (Schiff, Kraken, Wald) endet am Burggraben
    { id: 'arrival', nameKey: 'stageArrival', bossKey: 'bossKraken', voice: 'stageArrival', name: 'DIE ANKUNFT', music: 'sea', time: 480, rooms: [r09, r10, wd], boss: 'DER KRAKE' },
    { id: 0, nameKey: 'stage1', bossKey: 'boss1', voice: 'stage1', name: 'DER BURGHOF', music: 'stage1', time: 480, rooms: [r11, eh, v1, r12], boss: 'RIESENFLEDERMAUS' },
    { id: 1, nameKey: 'stage2', bossKey: 'boss2', voice: 'stage2', name: 'DIE KATAKOMBEN', music: 'stage2', time: 420, rooms: [r21, v2, r22], boss: 'KNOCHENRIESE' },
    { id: 2, nameKey: 'stage3', bossKey: 'boss3', voice: 'stage3', name: 'DER BERGFRIED', music: 'stage3', time: 720, rooms: [r31, lb, gw, mg], boss: 'MEDUSA' },
    { id: 'sun', nameKey: 'stageSun', bossKey: 'bossKnight', voice: 'stageSun', name: 'DIE SONNENKATHEDRALE', music: 'sun', time: 720, rooms: [sa, sp, sk], boss: 'SONNENWÄCHTER' },
    { id: 'expo', nameKey: 'stageExpo', bossKey: 'bossTrap', voice: 'stageExpo', name: 'DER WINTERGARTEN', music: 'expo', time: 900, rooms: [ex1, ex2, exk, exb], boss: 'MENSCHENFALLE' },
    { id: 3, nameKey: 'stage4', bossKey: 'boss4', voice: 'stage4', name: 'DER THRON DER NACHT', music: 'chapel', time: 780, rooms: [vx, vg, br, bs, r32], boss: 'GRAF NACHTMAHR' },
  ];

  return { STAGES };
})();
