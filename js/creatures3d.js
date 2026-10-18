// Vorgerenderte 3D-Kreaturen und Bosse (Blender) – ersetzen beim Laden die gezeichneten Sprites
'use strict';
(() => {
  const MAP = {"count_cast":[0,0,100,88],"count_closed":[101,0,100,88],"count_open":[202,0,100,88],"gbat_flap0":[303,0,128,84],"gbat_flap1":[0,89,128,84],"gbat_flap2":[129,89,128,84],"gbat_flap3":[258,89,128,84],"gbat_flap4":[0,174,128,84],"gbat_flap5":[129,174,128,84],"gbat_flap6":[258,174,128,84],"gbat_flap7":[0,259,128,84],"gbat_fold":[129,259,128,84],"gbat_open0":[258,259,128,84],"gbat_open1":[0,344,128,84],"gbat_open2":[129,344,128,84],"gbat_open3":[258,344,128,84],"gbat_open4":[0,429,128,84],"gbat_open5":[129,429,128,84],"gbat_open6":[258,429,128,84],"gbat_open7":[0,514,128,84],"medusa_calm":[129,514,72,64],"medusa_hiss":[202,514,72,64],"bat_perch":[275,514,42,34],"bat_0":[318,514,40,32],"bat_1":[359,514,40,32],"bat_10":[400,514,40,32],"bat_11":[441,514,40,32],"bat_12":[0,599,40,32],"bat_13":[41,599,40,32],"bat_14":[82,599,40,32],"bat_15":[123,599,40,32],"bat_2":[164,599,40,32],"bat_3":[205,599,40,32],"bat_4":[246,599,40,32],"bat_5":[287,599,40,32],"bat_6":[328,599,40,32],"bat_7":[369,599,40,32],"bat_8":[410,599,40,32],"bat_9":[451,599,40,32],"pillar_0":[492,599,16,32],"pillar_1":[0,632,16,32],"ghost_0":[17,632,20,22],"ghost_1":[38,632,20,22],"skull_0":[59,632,24,18],"skull_1":[84,632,24,18],"skull_2":[109,632,24,18],"skull_3":[134,632,24,18],"medusahead_0":[159,632,16,16],"medusahead_1":[176,632,16,16],"eagle_0":[193,632,24,12],"eagle_1":[218,632,24,12],"eagle_2":[243,632,24,12],"raven_perch":[268,632,16,10],"raven_fly0":[285,632,16,8],"raven_fly1":[302,632,16,8]};
  const img = new Image();
  img.onload = () => {
    const fr = (n, outline = true) => { const r = MAP[n], c = Sprites.canvas(r[2], r[3]); c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]); return Sprites.fromCanvas(c, outline); };
    const seq = (p, n) => Array.from({ length: n }, (_, i) => fr(p + i));
    const S = Sprites.S;
    S.raven = { perch: fr('raven_perch'), fly: seq('raven_fly', 2) };
    S.eagle = seq('eagle_', 3); S.skull = seq('skull_', 4); S.ghost = seq('ghost_', 2);
    S.pillar = fr('pillar_0'); S.pillarOpen = fr('pillar_1');
    S.bat3d = { fly: seq('bat_', 16), perch: fr('bat_perch', false) };
    S.gbatX = { flap: seq('gbat_flap', 8), open: seq('gbat_open', 8), fold: fr('gbat_fold') };
    const count = { closed: fr('count_closed'), open: fr('count_open'), cast: fr('count_cast') };
    COUNT_ART.get = () => count;
    const med = MEDUSA_ART.get(), medusa = { ...med, calm: fr('medusa_calm'), hiss: fr('medusa_hiss'), head: seq('medusahead_', 2) };
    MEDUSA_ART.get = () => medusa;
  };
  img.src = 'img/creatures3d.png';
})();
