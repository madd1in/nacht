// Neue Spielelemente: Pendel-Kronleuchter, Aufzüge, bröckelnde Steine, Checkpoint-Statuen, Truhen, Raben.
'use strict';

(() => {
  const { S, make } = Sprites;
  S.raven = {
    perch: make([
      '.......GGG......', '......GrGGy.....', '......GGGGyy....', '.....GGGGG......', '...GGgGGGG......',
      '..GGgggGGG......', '.GGggGGGG.......', 'GGG.GGGG........', 'G...GGG.........', '.....y.y........',
    ]),
    fly: [
      make(['..G.........G...', '..GG.......GG...', '...GGg...gGG....', '....GGgGGGG.....', '.....GGGGGGGGy..', '......GGGGGrGyy.', '.......GGGGG....', '........GG......']),
      make(['................', '................', '.....GGGGGGG.y..', '...GGGGGGGGrGyy.', '..GGgGGGGGGG....', '.GGg..GGGG......', 'GG.....GG.......', 'G...............']),
    ],
  };
  S.chest = [
    make(['..BBBBBBBBBBBB..', '.BbbbbbbbbbbbbB.', 'BbyyyyyyyyyyyybB', 'BbbbbbbbbbbbbbbB', 'yyyyyyyyyyyyyyyy', 'BbbbbbbYYbbbbbbB',
      'BbbbbbYkkYbbbbbB', 'BbbbbbbYYbbbbbbB', 'BbbbbbbbbbbbbbbB', 'yyyyyyyyyyyyyyyy', 'BBBBBBBBBBBBBBBB']),
    make(['.BBBBBBBBBBBBBB.', 'BbbbbbbbbbbbbbbB', 'BbyyyyyyyyyyyybB', '.BBBBBBBBBBBBBB.', 'BkkkkkkkkkkkkkkB', 'ByYyYyYyYyYyYyyB',
      'BbbbbbbbbbbbbbbB', 'yyyyyyyyyyyyyyyy', 'BbbbbbbbbbbbbbbB', 'yyyyyyyyyyyyyyyy', 'BBBBBBBBBBBBBBBB']),
  ];
  const angel = (eye) => make([
    '......WWWW......', '.....W' + eye + 'WW' + eye + 'W.....', '.....WWWWWW.....', '......WggW......', '.WW...WWWW...WW.',
    'WWgW.WWWWWW.WgWW', 'WgWWWWWWWWWWWWgW', 'WgWWgWWWWWWgWWgW', '.WgWWgWWWWgWWgW.', '.WgWWWgWWgWWWgW.',
    '..WgWWWWWWWWgW..', '..WgWWWWWWWWgW..', '...WgWWWWWWgW...', '....WWWWWWWW....', '....WgWWWWgW....',
    '....WgWWWWgW....', '....WWgWWgWW....', '....WWWgWWWW....', '...WWWWgWWWWW...', '...WWWWWgWWWW...',
    '..WWWWWWgWWWWW..', '..WWWWWWWgWWWW..', '.gggggggggggggg.', '.GGGGGGGGGGGGGG.', '.gWWWWWWWWWWWWg.',
    '.gWgggggggggWWg.', '.gWWWWWWWWWWWWg.', '.GGGGGGGGGGGGGG.', 'gggggggggggggggg', 'GGGGGGGGGGGGGGGG',
  ]);
  S.statue = [angel('g'), angel('c')];
})();

// ---------------- Plattformen (nur von oben begehbar) ----------------
class Chandelier extends Ent {
  constructor(d) {
    super(0, 0, 40, 6);
    this.kind = 'platform'; this.px = d.x * T; this.py = d.y * T; this.len = d.len; this.amp = d.amp; this.phase = d.phase;
    this.dx = 0; this.dy = 0; [this.x, this.y] = this.place(0);
  }
  place(t) {
    const a = this.amp * Math.sin(t * 0.028 + this.phase);
    this.ang = a;
    return [this.px + Math.sin(a) * this.len - this.w / 2, this.py + Math.cos(a) * this.len];
  }
  update() {
    this.t++;
    const [nx, ny] = this.place(this.t);
    this.dx = nx - this.x; this.dy = ny - this.y; this.x = nx; this.y = ny;
  }
  draw(ctx) {
    const cx = W.cam.x, cy = W.cam.y, ex = this.x + this.w / 2, ey = this.y - 10;
    const n = Math.floor(this.len / 3);
    for (let i = 0; i < n; i++) {
      const f = i / n, lx = this.px + (ex - this.px) * f, ly = this.py + (ey - this.py) * f;
      ctx.fillStyle = i % 2 ? '#4c4c4c' : '#8c8c8c';
      ctx.fillRect(Math.round(lx - cx), Math.round(ly - cy), 1, 2);
    }
    const x = Math.round(this.x - cx), y = Math.round(this.y - cy);
    ctx.fillStyle = '#5c4c1c'; ctx.fillRect(x + 18, y - 10, 4, 10);
    ctx.fillStyle = '#9c6400'; ctx.fillRect(x, y + 1, 40, 3); ctx.fillRect(x + 4, y + 4, 32, 2); ctx.fillRect(x + 14, y + 6, 12, 3);
    ctx.fillStyle = '#f8b800'; ctx.fillRect(x, y, 40, 1); ctx.fillRect(x + 4, y + 4, 32, 1);
    ctx.fillStyle = '#fce0a8'; ctx.fillRect(x + 18, y + 9, 4, 2);
    [2, 11, 27, 36].forEach((k, i) => {
      ctx.fillStyle = '#fce0a8'; ctx.fillRect(x + k, y - 4, 2, 4);
      ctx.fillStyle = (W.frame + i * 5) % 12 < 6 ? '#f8b800' : '#f87800'; ctx.fillRect(x + k, y - 7, 2, 3);
      ctx.fillStyle = '#fcfcfc'; ctx.fillRect(x + k, y - 6, 1, 1);
    });
  }
}

class Elevator extends Ent {
  constructor(d) {
    super(d.x * T, d.y * T, 32, 8);
    this.kind = 'platform'; this.yLow = d.y * T; this.yHigh = d.y1 * T; this.dir = -1; this.wait = 40; this.dx = 0; this.dy = 0;
  }
  update() {
    this.t++; this.dy = 0;
    if (this.wait > 0) { this.wait--; return; }
    let ny = this.y + this.dir * 0.75;
    if (ny <= this.yHigh) { ny = this.yHigh; this.dir = 1; this.wait = 60; }
    if (ny >= this.yLow) { ny = this.yLow; this.dir = -1; this.wait = 60; }
    this.dy = ny - this.y; this.y = ny;
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x + 5, 0, 1, y); ctx.fillRect(x + 26, 0, 1, y);
    ctx.fillStyle = '#6c6c6c'; for (let yy = (y % 6); yy < y; yy += 6) { ctx.fillRect(x + 5, yy, 1, 2); ctx.fillRect(x + 26, yy, 1, 2); }
    ctx.fillStyle = '#2c2c2c'; ctx.fillRect(x, y, 32, 8);
    ctx.fillStyle = '#8c8c8c'; ctx.fillRect(x, y, 32, 1);
    ctx.fillStyle = '#5c5c5c'; ctx.fillRect(x + 1, y + 1, 30, 5);
    ctx.fillStyle = '#f8b800'; ctx.fillRect(x + 1, y + 6, 30, 1);
    ctx.fillStyle = '#9c6400'; ctx.fillRect(x + 13, y + 2, 6, 3);
    if (this.wait > 0 && this.wait < 20 && (this.t & 4)) { ctx.fillStyle = '#d82800'; ctx.fillRect(x + 15, y + 3, 2, 1); }
  }
}

class Crumble extends Ent {
  constructor(d) {
    super(d.x * T, d.y * T, 32, 8);
    this.kind = 'platform'; this.home = { x: this.x, y: this.y }; this.state = 'idle'; this.timer = 0; this.dx = 0; this.dy = 0; this.vy = 0;
  }
  get solid() { return this.state === 'idle' || this.state === 'shake'; }
  onStand() { if (this.state === 'idle') { this.state = 'shake'; this.timer = 34; Audio8.sfx('crumble', this.cx); } }
  update() {
    this.t++; this.dy = 0;
    if (this.state === 'shake' && --this.timer <= 0) { this.state = 'fall'; this.vy = 0; W.debris(this.cx, this.y + 4, '#8c7c6c', 6); }
    else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.25, 5); this.y += this.vy;
      if (this.y > this.home.y + 300) { this.state = 'gone'; this.timer = 180; }
    } else if (this.state === 'gone' && --this.timer <= 0) { this.state = 'back'; this.timer = 40; this.y = this.home.y; }
    else if (this.state === 'back' && --this.timer <= 0) this.state = 'idle';
  }
  draw(ctx) {
    if (this.state === 'gone' || (this.state === 'back' && (this.t & 2))) return;
    const sh = this.state === 'shake' ? ((this.t >> 1) % 2 ? 1 : -1) : 0;
    const x = Math.round(this.x - W.cam.x) + sh, y = Math.round(this.y - W.cam.y);
    ctx.fillStyle = '#2c241c'; ctx.fillRect(x, y, 32, 8);
    ctx.fillStyle = '#9c8c7c'; ctx.fillRect(x, y, 15, 1); ctx.fillRect(x + 16, y, 16, 1);
    ctx.fillStyle = '#6c5c4c'; ctx.fillRect(x + 1, y + 1, 14, 6); ctx.fillRect(x + 17, y + 1, 14, 6);
    ctx.fillStyle = '#2c241c'; ctx.fillRect(x + 6, y + 2, 1, 3); ctx.fillRect(x + 7, y + 4, 2, 1); ctx.fillRect(x + 23, y + 1, 1, 4); ctx.fillRect(x + 24, y + 4, 3, 1);
  }
}

// ---------------- Checkpoint-Statue ----------------
class Statue extends Ent {
  constructor(d) { super(d.x * T, (d.y + 1) * T - 30, 16, 30); this.kind = 'prop'; this.active = false; }
  update() {
    this.t++;
    const p = W.player;
    if (!this.active && p.alive && Phys.overlap(this, p)) this.activate(true);
  }
  activate(fresh) {
    this.active = true;
    W.checkpoint = { stage: W.stage, room: W.roomIdx, cx: this.cx, feet: this.y + this.h };
    if (!fresh) return;
    const p = W.player;
    p.hp = Math.min(p.maxHp, p.hp + Math.round(p.maxHp * 0.375));
    Audio8.sfx('checkpoint', this.cx); Input.rumble(0.3, 0.2, 150);
    W.popup(this.cx, this.y - 8, tr('checkpoint'), '#a4e4fc');
    for (let i = 0; i < 14; i++) W.spawn(new Particle(this.cx + rnd(-8, 8), this.y + rnd(0, 30), rnd(-0.4, 0.4), rnd(-1.6, -0.4), i % 2 ? '#a4e4fc' : '#fcfcfc', 40, 1, 0));
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    Sprites.draw(ctx, Sprites.S.statue[this.active ? 1 : 0], x, y);
    if (this.active) {
      ctx.fillStyle = (this.t >> 3) % 2 ? '#f8b800' : '#fce0a8';
      ctx.fillRect(x + 5, y - 4, 6, 1); ctx.fillRect(x + 4, y - 3, 1, 1); ctx.fillRect(x + 11, y - 3, 1, 1); ctx.fillRect(x + 5, y - 2, 6, 1);
    }
  }
}

// ---------------- Schatztruhe (mit Peitsche öffnen) ----------------
class Chest extends Ent {
  constructor(d) { super(d.x * T, (d.y + 1) * T - 11, 16, 11); this.kind = 'candle'; this.loot = d.loot; this.opened = false; }
  hit() {
    if (this.opened) return;
    this.opened = true;
    Audio8.sfx('chest', this.cx); W.sparks(this.cx, this.y, 10);
    const loot = { big: ['bagBig', 'bagBig', 'heartB', 'roast'], life: ['oneUp', 'bagBig', 'heartB'] }[this.loot] || ['bag', 'heartB', 'heartS', 'heartS'];
    loot.forEach((type, i) => {
      const it = W.spawn(new Item(type, this.cx, this.y - 4));
      it.vx = (i - (loot.length - 1) / 2) * 0.9; it.vy = -2.6 - (i % 2) * 0.6;
    });
  }
  draw(ctx) { Sprites.draw(ctx, Sprites.S.chest[this.opened ? 1 : 0], Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y)); }
}

// ---------------- Seilrutsche (Schiff): im Sprung ans Seil greifen oder am Start „hoch“ drücken ----------------
class Zipline extends Ent {
  constructor(d) {
    super(Math.min(d.x0, d.x1) * T, Math.min(d.y0, d.y1) * T - 40, Math.abs(d.x1 - d.x0) * T + 16, Math.abs(d.y1 - d.y0) * T + 40);
    this.kind = 'prop'; this.t = 0; this.cool = 0;
    this.x0 = d.x0 * T + 8; this.y0 = d.y0 * T - 34; this.x1 = d.x1 * T + 8; this.y1 = d.y1 * T - 34; // Seil auf Handhöhe
    this.dir = Math.sign(this.x1 - this.x0) || 1;
    this.len = Math.hypot(this.x1 - this.x0, this.y1 - this.y0);
    this.slope = (this.y1 - this.y0) / this.len;
    this.sag = Math.min(14, this.len * 0.05);
  }
  at(s) { return [this.x0 + (this.x1 - this.x0) * s, this.y0 + (this.y1 - this.y0) * s + Math.sin(s * Math.PI) * this.sag]; }
  update() {
    this.t++;
    if (this.cool > 0) { this.cool--; return; }
    const p = W.player;
    if (!p.alive || p.state !== 'normal') return;
    const s = (p.cx - this.x0) / (this.x1 - this.x0);
    if (s < -0.12 || s > 0.94) return; // am Start etwas Spielraum vor der Rolle
    const ry = this.at(Math.max(0, s))[1], hy = p.feet - 34;
    this.near = p.onGround && s < 0.12 && Math.abs(hy - ry) < 10;
    if ((!p.onGround && p.vy > -0.6 && Math.abs(hy - ry) < 7) || (this.near && Input.pressed.up)) {
      p.state = 'zip'; p.zip = { line: this, s: Math.max(0, s), v: 1.2 }; p.atkT = 0; p.dangle = false; p.setCrouch(false);
      p.onGround = false; p.vx = 0; p.vy = 0; this.near = false;
      Audio8.sfx('latch'); Input.rumble(0.25, 0.2, 100);
    }
  }
  draw(ctx) {
    const cx = W.cam.x, cy = W.cam.y, n = Math.ceil(this.len / 2);
    for (let k = 0; k <= n; k++) {
      const [x, y] = this.at(k / n);
      ctx.fillStyle = k % 3 ? '#8c7450' : '#c8b088'; ctx.fillRect(Math.round(x - cx), Math.round(y - cy), 2, 1);
    }
    [[this.x0, this.y0], [this.x1, this.y1]].forEach(([x, y]) => { // Rollen
      ctx.fillStyle = '#2c1808'; ctx.fillRect(Math.round(x - cx) - 3, Math.round(y - cy) - 3, 6, 6);
      ctx.fillStyle = '#c8a040'; ctx.fillRect(Math.round(x - cx) - 1, Math.round(y - cy) - 1, 2, 2);
    });
    if (this.near && (this.t & 16)) { // Hinweis: „hoch“ drücken
      const X = Math.round(this.x0 - cx), Y = Math.round(this.y0 - cy) - 12;
      ctx.fillStyle = '#fce0a8'; for (let i = 0; i < 4; i++) ctx.fillRect(X - i, Y + i, 1 + i * 2, 1);
    }
  }
}

// ---------------- Monkey-Island-Grüße auf dem Schiff ----------------
// Namensbrett am Heck: die „SEA MONKEY“
class ShipSign extends Ent {
  constructor(d) { super(d.x * T, d.y * T, d.w * T, 12); this.kind = 'prop'; this.text = d.text; }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    if (x > View.w + 4 || x + this.w < -4 || y > 214 || y < -16) return;
    ctx.fillStyle = '#1c0c04'; ctx.fillRect(x, y, this.w, 12);
    ctx.fillStyle = '#3c2010'; ctx.fillRect(x + 1, y + 1, this.w - 2, 10);
    ctx.fillStyle = '#a87000'; ctx.fillRect(x + 1, y + 1, this.w - 2, 1); ctx.fillRect(x + 1, y + 10, this.w - 2, 1);
    Font.draw(ctx, this.text, x + this.w / 2, y + 3, '#f8b800', { align: 'center' });
  }
}
// Grogfass: ein Peitschenhieb – das Zeug frisst sich durch die Planken
class Grog extends Ent {
  constructor(d) { super(d.x * T - 5, (d.y + 1) * T - 22, 26, 22); this.kind = 'candle'; this.melt = 0; }
  hit() {
    if (this.melt) return;
    this.melt = 1;
    Audio8.sfx('splash', this.cx); Audio8.sfx('crumble', this.cx); W.shake = Math.max(W.shake, 3);
    ['heartB', 'bag'].forEach((type, i) => { const it = W.spawn(new Item(type, this.cx, this.y)); it.vx = (i ? 1 : -1) * 0.8; it.vy = -2.6; });
    Game.note('grogNote');
  }
  update() {
    this.t++;
    if (!this.melt) return;
    this.melt++;
    if (this.melt % 6 === 0) W.spawn(new Particle(this.cx + rnd(-10, 10), this.y + this.h - 2, rnd(-0.2, 0.2), rnd(-1.2, -0.4), Math.random() < 0.5 ? '#58f898' : '#b8f818', 26, 2, 0.02)); // Blubbern
    if (this.melt % 40 === 1) Audio8.sfx('flameTick', this.cx);
    if (this.melt > 300) this.dead = true;
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    if (this.melt) { // grüne Lache, die sich ins Holz frisst
      const k = Math.min(1, this.melt / 60);
      R('#0c1c0c', 13 - 12 * k, 20, 24 * k + 2, 3); R('#38a838', 14 - 10 * k, 19, 20 * k + 1, 2); R('#b8f818', 12, 19, 2, 1);
      if (this.melt < 40) { R('#5c3418', 3, 22 - 18 * (1 - this.melt / 40), 20, 18 * (1 - this.melt / 40)); } // Fass zerfließt
      return;
    }
    R('#2c1404', 2, 0, 22, 22); R('#7c4820', 3, 1, 20, 20); R('#9c5c28', 5, 1, 4, 20); R('#5c3418', 17, 1, 4, 20);
    [2, 10, 18].forEach(b => { R('#24242c', 2, b, 22, 2); R('#6c6c78', 3, b, 20, 1); });
    R('#e8d8a8', 3, 5, 20, 5); Font.draw(ctx, 'GROG', x + 13, y + 4, '#1c0c04', { align: 'center' });
  }
}
// Gummihuhn mit Rolle in der Mitte: macht die Seilrutsche schneller (und quietscht)
class RubberChicken extends Ent {
  constructor(d) { super(d.x * T + 3, (d.y + 1) * T - 12, 12, 12); this.kind = 'prop'; this.t = 0; }
  update() {
    this.t++;
    const p = W.player;
    if (p.alive && Phys.overlap(p, this)) {
      this.dead = true; p.chicken = true;
      Audio8.sfx('squeak', this.cx); W.sparks(this.cx, this.cy, 8); Game.note('chickenNote');
    }
  }
  draw(ctx) { RubberChicken.paint(ctx, Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y) + (Math.floor(this.t / 20) % 2), false); }
  static paint(ctx, x, y, flip) {
    const R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(flip ? x + 12 - a - w : x + a, y + b, w, h); };
    R('#8c8c98', 5, 0, 3, 3); R('#3c3c44', 6, 1, 1, 1);           // Rolle
    R('#c89018', 1, 4, 10, 6); R('#f8d838', 2, 3, 8, 6);          // Leib
    R('#f8d838', 8, 1, 3, 4); R('#d82800', 9, 0, 2, 1);           // Kopf, Kamm
    R('#f87800', 11, 2, 1, 2); R('#1c1c1c', 9, 2, 1, 1);          // Schnabel, Auge
    R('#f87800', 3, 10, 1, 2); R('#f87800', 7, 10, 1, 2);         // Füße
  }
}
// „Schau hinter dich, ein dreiköpfiger Affe!“ – sitzt kurz auf der Rah, verschwindet, sobald man sich umdreht
class ThreeHeadedMonkey extends Ent {
  constructor(d) { super(d.x0 * T, d.row * T - 14, (d.x1 - d.x0 + 1) * T, 14); this.kind = 'prop'; this.zone = d; this.state = 'wait'; this.t = 0; }
  update() {
    this.t++;
    const p = W.player, z = this.zone;
    if (this.state === 'wait') {
      if (p.alive && p.onGround && p.cx >= z.x0 * T && p.cx < (z.x1 + 1) * T && Math.abs(p.feet - z.row * T) < 4) {
        this.state = 'show'; this.t = 0; this.side = -p.face;
        this.mx = p.cx + this.side * 46; this.my = z.row * T - 15;
        Game.note('monkeyNote'); Audio8.sfx('select');
      }
    } else if (this.state === 'show') {
      if (this.t > 24 && Math.sign(this.mx - p.cx) === p.face) { this.state = 'gone'; W.puff(this.mx, this.my + 14); Audio8.sfx('teleport', this.mx); } // umgedreht – schon weg!
      else if (this.t > 360) this.state = 'gone';
    }
  }
  draw(ctx) {
    if (this.state !== 'show') return;
    const x = Math.round(this.mx - W.cam.x) - 8, y = Math.round(this.my - W.cam.y), b = Math.floor(this.t / 12) % 2;
    const R = (c, a, bb, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + bb, w, h); };
    R('#5c3418', 4, 7, 9, 7); R('#7c4820', 5, 8, 7, 5);                                  // Leib
    R('#5c3418', 13, 9, 3, 1); R('#5c3418', 15, 6 + b, 1, 3);                            // Schwanz
    [[1, 1 + b], [6, 0], [11, 1 - b]].forEach(([hx, hy]) => { R('#5c3418', hx, hy, 5, 5); R('#e8c8a0', hx + 1, hy + 2, 3, 2); R('#1c1c1c', hx + 1, hy + 1, 1, 1); R('#1c1c1c', hx + 3, hy + 1, 1, 1); }); // drei Köpfe
    R('#5c3418', 5, 13, 2, 1); R('#5c3418', 10, 13, 2, 1);
  }
}

// ---------------- Frachtkiste „UPEL“ – Gruß an Infernax (Alcedors Heimat) ----------------
class Cargo extends Ent {
  constructor(d) { super(d.x * T - 6, (d.y + 1) * T - 22, 28, 22); this.kind = 'candle'; }
  hit() {
    if (this.dead) return;
    this.dead = true;
    Audio8.sfx('crumble', this.cx); Audio8.sfx('chest', this.cx); W.shake = Math.max(W.shake, 4);
    for (let i = 0; i < 14; i++) W.spawn(new Particle(this.cx + rnd(-12, 12), this.cy + rnd(-8, 8), rnd(-2, 2), rnd(-3.5, -1), i % 2 ? '#a8783c' : '#5a3214', 40, 2, 0.2));
    ['oneUp', 'bagBig', 'heartB'].forEach((type, i) => { const it = W.spawn(new Item(type, this.cx, this.y)); it.vx = (i - 1) * 0.9; it.vy = -2.8; });
    Game.note('upelNote');
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#1e0c04', 0, 0, 28, 22); R('#8a5428', 1, 1, 26, 20);
    for (let k = 4; k < 21; k += 4) R('#5a3214', 2, k, 24, 1);
    R('#b87c44', 1, 1, 26, 2); R('#b87c44', 1, 1, 2, 20); R('#5a3214', 25, 1, 2, 20); R('#5a3214', 1, 19, 26, 2);
    R('#2c2c34', 2, 2, 2, 2); R('#2c2c34', 24, 2, 2, 2); R('#2c2c34', 2, 17, 2, 2); R('#2c2c34', 24, 17, 2, 2);
    Font.draw(ctx, 'UPEL', x + 14, y + 8, '#7c1c0c', { align: 'center' });
  }
}

// ---------------- Ankerring (Peitsche schräg nach oben: einhaken und pendeln) ----------------
class Ring extends Ent {
  constructor(d) { super(d.x * T + 3, d.y * T + 3, 10, 10); this.kind = 'prop'; }
  update() { this.t++; }
  draw(ctx) {
    const x = Math.round(this.cx - W.cam.x), y = Math.round(this.cy - W.cam.y), p = W.player;
    ctx.fillStyle = '#3c3c3c'; for (let k = 7; k < 18; k += 3) ctx.fillRect(x, y - k, 1, 2);
    const near = p.alive && Math.hypot(p.cx - this.cx, p.cy - this.cy) < 80 && p.cy > this.cy;
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const px = x + Math.round(Math.cos(a) * 4), py = y + Math.round(Math.sin(a) * 4);
      ctx.fillStyle = (a > 3.4 && a < 5.2) ? '#fce0a8' : (a > 0.2 && a < 2.2) ? '#9c6400' : '#f8b800';
      ctx.fillRect(px, py, 1, 1);
    }
    if (near && (this.t >> 3) % 2) { ctx.fillStyle = '#fcfcfc'; ctx.fillRect(x - 3, y - 3, 1, 1); ctx.fillRect(x + 3, y + 3, 1, 1); }
  }
}

// ---------------- Rabe: sitzt, stürzt sich schräg herab, fliegt davon ----------------
class Raven extends Enemy {
  constructor(tx, ty) { super(tx * T + 3, (ty + 1) * T - 9, 10, 8, 1, 2, 200); this.state = 'perch'; }
  update() {
    super.update();
    const p = W.player;
    if (this.state === 'perch') {
      this.face = Math.sign(p.cx - this.cx) || -1;
      if (this.onScreen(0) && Math.abs(p.cx - this.cx) < 110 && p.feet > this.y - 10) {
        this.state = 'dive'; this.dir = this.face; this.vx = this.dir * 1.9;
        this.vy = clamp((p.cy - this.cy) / 45, 0.3, 1.8); Audio8.sfx('raven', this.cx);
      }
      return;
    }
    this.x += this.vx; this.y += this.vy;
    if ((this.dir > 0 && this.cx > p.cx + 10) || (this.dir < 0 && this.cx < p.cx - 10)) this.vy -= 0.09;
    this.touch();
    this.despawnOff(32);
    if (this.t > 600) this.dead = true;
  }
  draw(ctx) {
    const R = Sprites.S.raven;
    const s = this.state === 'perch' ? R.perch : R.fly[Math.floor(this.t / 5) % 2];
    this.ds(ctx, s, Math.round(this.cx - 8 - W.cam.x), Math.round(this.y - (this.state === 'perch' ? 1 : 0) - W.cam.y), this.face < 0, this.flash);
  }
}

// ---------------- Torhaus mit Zugbrücke und Fallgitter (Burghof) ----------------
// Ein riesiger Spitzbogen zwischen zwei Türmen, die bis über den Bildrand ragen. Die Zugbrücke ist
// hochgezogen, ein Seil spannt sich über den Graben zur Seilwinde am diesseitigen Ufer. Peitscht man die
// Winde, springt die Sperrklinke: die Brücke rauscht herab und kracht aufs Ufer, dann hebt sich das Fallgitter.
// Der Held geht durch den Bogen ins Torhaus (der Torbau liegt dann vor ihm), kommt auf der Hofseite heraus –
// und hinter ihm saust das Gitter herunter.
// d: { x0, x1: Graben (Kacheln), gx: Spalte des Fallgitters, winch: Spalte der Winde, row: Bodenreihe }
const GH = { L: 56, A: 80, R: 96, IN: 12, SPAN: 56, SPRING: 112 }; // Turm links, Torbau, Turm rechts, Laibung, Bogenweite, Kämpferhöhe
class Gatehouse extends Ent {
  constructor(d) {
    const hx = (d.x1 + 1) * T;
    super(hx - GH.L, 0, GH.L + GH.A + GH.R, d.row * T + T);
    this.kind = 'prop'; this.d = d;
    this.hx = hx; this.hy = d.row * T; this.len = (d.x1 - d.x0 + 1) * T;
    this.ang = Math.PI / 2; this.state = 'up'; this.ft = 0;
    this.gate = 'closed'; this.gy = 0; this.gv = 0; this.gt = 0; this.gmax = 108;
    this.gx = d.gx; this.near = 0; this.wheel = 0; this.wv = 0;
    const g = W.room.grid, c0 = Math.floor(hx / T), c1 = Math.floor((hx + GH.A + GH.R) / T);
    for (let r = 0; r < 4; r++) for (let c = c0; c < c1; c++) g[r][c] = 'G'; // Decke des Torhauses
    this.gateTiles('G');
    this.winch = W.spawn(new Winch(this, d.winch * T + 8, this.hy));
    this.demo = Game.state === 'demo';
    if (this.demo) this.openAll(); // Vorführung: Tor steht offen
  }
  get archX() { return this.hx + GH.IN; }
  get archCx() { return this.hx + GH.A / 2; }
  bridgeTiles(ch) { const d = this.d; for (let x = d.x0; x <= d.x1; x++) W.room.grid[d.row][x] = ch; }
  gateTiles(ch) { const d = this.d; for (let r = 4; r < d.row; r++) W.room.grid[r][this.gx] = ch; }
  openAll() { this.ang = 0; this.state = 'down'; this.bridgeTiles('G'); this.gate = 'open'; this.gy = this.gmax; this.gateTiles('.'); }
  inside() { const p = W.player; return p.cx > this.archCx && p.cx < this.hx + GH.A + GH.R + 12; }
  release() {
    if (this.state !== 'up') return;
    this.state = 'falling'; this.ft = 0; this.wv = 0.7;
    Audio8.sfx('latch', this.winch.cx); Audio8.sfx('whoosh', this.hx); Input.rumble(0.3, 0.3, 150);
  }
  land() {
    const d = this.d;
    this.state = 'bounce'; this.ang = 0; this.bridgeTiles('G');
    W.shake = Math.max(W.shake, 18); Input.rumble(1, 0.8, 500);
    Audio8.sfx('boom', this.hx); Audio8.sfx('wall', this.hx - this.len / 2);
    for (let x = d.x0; x <= d.x1; x++) W.dust(x * T + 8, this.hy, 4);
    for (let i = 0; i < 24; i++) W.spawn(new Particle(d.x0 * T + Math.random() * this.len, this.hy + T, rnd(-1.6, 1.6), rnd(-4.2, -1), i % 2 ? '#3cbcfc' : '#a4e4fc', 40, 2, 0.2)); // Wasser spritzt
    for (let i = 0; i < 8; i++) W.spawn(new SwarmBat(this.hx - 28 + rnd(-6, 6), 70 + rnd(-6, 6))); // Fledermäuse aus dem Turm
  }
  update() {
    this.t++;
    const p = W.player, d = this.d;
    if (this.demo) return;
    if (this.state === 'falling') { // freier Fall, die Winde wirbelt, die Ketten rasseln
      const k = Math.min(1, ++this.ft / 56);
      this.ang = Math.PI / 2 * (1 - k * k);
      this.wv = 0.6 + k * 0.5;
      if (this.ft % 3 === 0) Audio8.sfx('cog', this.winch.cx);
      if (this.ft % 8 === 0) Audio8.sfx('chain', this.hx);
      if (this.ft === 56) this.land();
    } else if (this.state === 'bounce') { // federt einmal nach
      const u = (++this.ft - 56) / 16;
      this.ang = u < 1 ? Math.sin(u * Math.PI) * 0.06 : 0;
      if (u >= 1) { this.state = 'down'; this.gt = 0; }
    }
    this.wheel += this.wv; this.wv *= 0.97;
    if (this.state === 'down' && this.gate === 'closed' && ++this.gt > 34) { this.gate = 'rising'; Audio8.sfx('creak', this.archCx); }
    if (this.gate === 'rising') {
      this.gy = Math.min(this.gmax, this.gy + 1);
      if (this.t % 6 === 0) Audio8.sfx('cog', this.archCx);
      if (this.t % 14 === 0) Audio8.sfx('chain', this.archCx);
      if (this.gy >= 40 && W.room.grid[d.row - 1][this.gx] === 'G') this.gateTiles('.'); // hoch genug zum Durchgehen
      if (this.gy >= this.gmax) { this.gate = 'open'; Audio8.sfx('latch', this.archCx); }
    }
    if (this.gate === 'open' && p.alive && p.cx > this.hx + GH.A + GH.R + 2) { this.gate = 'slam'; this.gv = 0; }
    if (this.gate === 'slam') { // kracht hinter dem Helden herunter
      this.gv += 1.1; this.gy = Math.max(0, this.gy - this.gv);
      if (this.gy === 0) {
        this.gate = 'shut'; this.gateTiles('G');
        W.shake = Math.max(W.shake, 12); Input.rumble(0.8, 0.6, 350); Audio8.sfx('wall', this.archCx); Audio8.sfx('crack', this.archCx);
        for (let i = 0; i < 8; i++) W.dust(this.archX + 4 + i * 7, this.hy, 2);
        Game.note('gateNote');
      }
    }
    if (this.state === 'up' && p.alive && p.cx > (d.winch - 2) * T && p.cx < d.x0 * T + 12 && ++this.near === 240) Game.note('winchNote'); // Hinweis für Ratlose
  }
  tip() { // Spitze der Brücke (Kettenöse)
    const a = this.ang, L = this.len - 4;
    return { x: this.hx - Math.cos(a) * L - Math.sin(a) * 7, y: this.hy - Math.sin(a) * L + Math.cos(a) * 7 };
  }
  lights(L, cx, cy, flick) {
    const f = Math.sin(this.t * 0.3) * 2, eye = 0.35 + 0.2 * Math.sin(this.t * 0.07);
    L.push({ x: this.hx + 6 - cx, y: 128 - cy, r: 34 + f + flick(this.hx), c: [248, 140, 40], a: 0.6 },
      { x: this.hx + GH.A - 6 - cx, y: 128 - cy, r: 34 - f + flick(this.hx + 9), c: [248, 140, 40], a: 0.6 },
      { x: this.archCx - cx, y: 50 - cy, r: 18, c: [252, 30, 30], a: eye },            // glühende Augen im Schädel
      { x: this.hx - 28 - cx, y: 78 - cy, r: 18, c: [252, 40, 40], a: 0.4 },           // rote Turmfenster
      { x: this.hx + GH.A + 34 - cx, y: 58 - cy, r: 16, c: [252, 40, 40], a: 0.4 });
  }
  draw(ctx) { // hinter dem Helden: linker Turm, Durchgang, Zugbrücke, Ketten, Seil – und der Torbau, solange der Held draußen ist
    const cx = W.cam.x, cy = W.cam.y, fx = Math.round(this.x - cx);
    if (fx > View.w + 40 || fx + this.w < -150) return;
    const A = Gatehouse.art();
    ctx.drawImage(A.back, fx, Math.round(-cy));
    const tp = this.tip(); // Kette von der Mauer zur Brückenspitze
    [[this.hx + 4, 74], [this.hx + 8, 82]].forEach(([kx, ky], j) => {
      const n = Math.ceil(Math.hypot(tp.x - kx, tp.y - ky) / 3);
      for (let i = 0; i <= n; i++) { ctx.fillStyle = (i + j) % 2 ? '#2c2c38' : '#8c8898'; ctx.fillRect(Math.round(kx + (tp.x - kx) * i / n - cx) - 1, Math.round(ky + (tp.y - ky) * i / n - cy) - 1, 3, 3); }
    });
    const w = this.winch, wx = w.cx + 3, wy = w.y + 9, slack = this.state === 'up' ? 4 : 22; // Seil zur Winde
    ctx.fillStyle = '#a8784c';
    for (let i = 0; i <= 60; i++) { const k = i / 60, sx = wx + (tp.x - wx) * k, sy = wy + (tp.y - wy) * k + Math.sin(k * Math.PI) * slack; ctx.fillRect(Math.round(sx - cx), Math.round(sy - cy), 1, 1); }
    ctx.save(); // Zugbrücke: schwere Bohlen mit Eisenbändern, dreht um das Scharnier
    ctx.translate(Math.round(this.hx - cx), Math.round(this.hy - cy)); ctx.rotate(this.ang);
    ctx.drawImage(Gatehouse.plank(this.len), -this.len, 0);
    ctx.restore();
    if (!this.inside()) this.drawFrontParts(ctx);
  }
  drawFront(ctx) { if (this.inside()) this.drawFrontParts(ctx); } // Held im Torhaus: Torbau liegt vor ihm
  drawFrontParts(ctx) {
    const cx = W.cam.x, cy = W.cam.y, fx = Math.round(this.x - cx), A = Gatehouse.art();
    // Fallgitter im Bogen: dicke Stäbe, Querbänder, lange Spitzen – wird in die Mauer gezogen
    const ax = this.archX - cx, aw = GH.SPAN, bot = this.hy - cy - Math.round(this.gy);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ax, this.hy - cy); ctx.lineTo(ax, GH.SPRING - cy);
    ctx.arc(ax + aw, GH.SPRING - cy, aw, Math.PI, Math.PI * 4 / 3); ctx.arc(ax, GH.SPRING - cy, aw, Math.PI * 5 / 3, Math.PI * 2); // Spitzbogen: zwei Kreisbögen bis zum Scheitel
    ctx.lineTo(ax + aw, this.hy - cy); ctx.closePath(); ctx.clip();
    for (let y = bot - 8; y > bot - 190; y -= 13) { ctx.fillStyle = '#1c1824'; ctx.fillRect(ax, y - 3, aw, 4); ctx.fillStyle = '#6c6878'; ctx.fillRect(ax, y - 3, aw, 1); }
    for (let x = ax + 3; x < ax + aw - 1; x += 8) {
      ctx.fillStyle = '#16121c'; ctx.fillRect(x, bot - 190, 3, 184);
      ctx.fillStyle = '#7c7888'; ctx.fillRect(x, bot - 190, 1, 184);
      ctx.fillStyle = '#4c4858'; ctx.fillRect(x, bot - 6, 3, 2); ctx.fillRect(x + 1, bot - 4, 1, 4); // Spitzen
      ctx.fillStyle = '#9c98a8'; ctx.fillRect(x + 1, bot - 1, 1, 1);
    }
    ctx.restore();
    ctx.drawImage(A.front, fx, Math.round(-cy));
    // glühende Augen im Totenkopf-Schlussstein
    const ex = Math.round(this.archCx - cx), ey = Math.round(48 - cy), glow = 0.6 + 0.4 * Math.sin(this.t * 0.07);
    ctx.fillStyle = `rgba(252,${Math.round(40 + 60 * glow)},40,1)`; ctx.fillRect(ex - 5, ey, 3, 3); ctx.fillRect(ex + 2, ey, 3, 3);
    ctx.fillStyle = '#fce0a8'; ctx.fillRect(ex - 4, ey + 1, 1, 1); ctx.fillRect(ex + 3, ey + 1, 1, 1);
    // rot glühende Turmfenster
    ctx.fillStyle = (this.t >> 4) % 7 ? '#c81818' : '#fc4040';
    ctx.fillRect(Math.round(this.hx - 30 - cx), Math.round(72 - cy), 4, 10); ctx.fillRect(Math.round(this.hx + GH.A + 32 - cx), Math.round(52 - cy), 4, 10); ctx.fillRect(Math.round(this.hx + GH.A + 62 - cx), Math.round(108 - cy), 4, 10);
    // Fackeln links und rechts vom Bogen
    [this.hx + 6, this.hx + GH.A - 6].forEach((tx, i) => {
      const x = Math.round(tx - cx), y = Math.round(126 - cy), fl = ((this.t >> 2) + i) % 3;
      ctx.fillStyle = '#3c2410'; ctx.fillRect(x - 1, y + 5, 3, 8); ctx.fillStyle = '#8c8898'; ctx.fillRect(x - 3, y + 5, 7, 2);
      ctx.fillStyle = '#d82800'; ctx.fillRect(x - 2, y - 2 + (fl === 1 ? 1 : 0), 5, 7);
      ctx.fillStyle = '#f87800'; ctx.fillRect(x - 1, y - 1 + (fl === 2 ? 1 : 0), 3, 5);
      ctx.fillStyle = '#fcd040'; ctx.fillRect(x, y + 1, 1, 3);
    });
    // langes Banner am rechten Turm, flattert unten im Wind
    const bx = Math.round(this.hx + GH.A + 50 - cx);
    for (let c = 0; c < 22; c++) {
      const len = 104 - Math.abs(c - 11) * 0.8;
      for (let y = 0; y < len; y += 2) {
        const o = Math.round(Math.sin(this.t * 0.09 - y * 0.05 + c * 0.2) * (y / len) * 3);
        const u = Math.abs(c - 10.5), v = y - 44; // Wappen: goldene Fledermaus
        const crest = (u < 1.6 && v > -7 && v < 9) || (u > 0.6 && u < 2.6 && v > -10 && v <= -6) || (u < 10 && v > -2 - u * 0.45 && v < 3 - u * 0.2 - ((Math.floor(u / 3.3) % 2) ? 0 : 2.5));
        ctx.fillStyle = crest ? '#f8b800' : c === 0 || c === 21 ? '#5c0010' : (c + (y >> 3)) % 7 ? '#a80020' : '#880018';
        ctx.fillRect(bx + c + o, Math.round(-cy) + 6 + y, 1, 2);
      }
    }
    ctx.fillStyle = '#3c2410'; ctx.fillRect(bx - 2, Math.round(4 - cy), 26, 3); ctx.fillStyle = '#c89020'; ctx.fillRect(bx - 3, Math.round(4 - cy), 2, 3); ctx.fillRect(bx + 23, Math.round(4 - cy), 2, 3);
    // Käfig mit Skelett, schwingt an einer Kette vom Turm
    const sw = Math.sin(this.t * 0.03) * 0.12, kx = this.hx + GH.A + GH.R - 14, ky = 30;
    ctx.save(); ctx.translate(Math.round(kx - cx), Math.round(ky - cy)); ctx.rotate(sw);
    ctx.fillStyle = '#4c4858'; for (let y = 0; y < 22; y += 3) ctx.fillRect(0, y, 1, 2);
    ctx.fillStyle = '#e8e4d8'; ctx.fillRect(-3, 26, 6, 5); ctx.fillStyle = '#16121c'; ctx.fillRect(-2, 28, 1, 1); ctx.fillRect(1, 28, 1, 1); // Schädel
    ctx.fillStyle = '#c8c4b8'; ctx.fillRect(-1, 31, 2, 9); ctx.fillRect(-3, 33, 6, 1); ctx.fillRect(-3, 36, 6, 1); ctx.fillRect(-2, 40, 1, 6); ctx.fillRect(1, 40, 1, 6);
    ctx.fillStyle = '#26222e'; for (let x = -7; x <= 7; x += 3) ctx.fillRect(x, 22, 1, 28); ctx.fillRect(-7, 22, 15, 2); ctx.fillRect(-7, 48, 15, 2); ctx.fillRect(-3, 20, 7, 2);
    ctx.restore();
  }
  static plank(len) {
    if (Gatehouse.pl && Gatehouse.pl.width === len) return Gatehouse.pl;
    const c = Sprites.canvas(len, 14), x = c.getContext('2d');
    x.fillStyle = '#1c0e04'; x.fillRect(0, 0, len, 14);
    for (let i = 0; i < len; i += 8) { x.fillStyle = (i / 8) % 2 ? '#6c4020' : '#7c4c24'; x.fillRect(i + 1, 1, 7, 11); x.fillStyle = '#a07040'; x.fillRect(i + 1, 1, 7, 1); x.fillStyle = '#3c2410'; x.fillRect(i + 1, 10, 7, 2); }
    for (let i = 4; i < len; i += 24) { x.fillStyle = '#2c2c38'; x.fillRect(i, 0, 4, 14); x.fillStyle = '#8c8898'; x.fillRect(i, 1, 1, 12); x.fillStyle = '#c8c4d0'; x.fillRect(i + 2, 3, 1, 1); x.fillRect(i + 2, 10, 1, 1); }
    x.fillStyle = '#4c4858'; x.fillRect(0, 4, 4, 6); x.fillStyle = '#9c98a8'; x.fillRect(0, 5, 1, 4); // Kettenöse
    return (Gatehouse.pl = c);
  }
  static art() { // zwei Ebenen: hinten (linker Turm im Graben, dunkler Durchgang), vorn (Torbau mit Bogen, rechter Turm)
    if (Gatehouse.A) return Gatehouse.A;
    const W0 = GH.L + GH.A + GH.R, H0 = 192, hx = GH.L;
    const mk = () => { const c = Sprites.canvas(W0, H0), x = c.getContext('2d'); return { c, x, img: x.createImageData(W0, H0) }; };
    const B = mk(), F = mk();
    const BAYG = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const put = (L, X, Y, r, g, b) => { if (X < 0 || Y < 0 || X >= W0 || Y >= H0) return; const i = (Y * W0 + X) * 4, d = L.img.data; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255; };
    const arch = (X, Y, grow = 0) => { // Spitzbogen (gleichseitig) im Torbau
      const a0 = hx + GH.IN - grow, a1 = hx + GH.IN + GH.SPAN + grow, R = GH.SPAN + grow;
      if (X < a0 || X >= a1 || Y >= 176) return false;
      return Y >= GH.SPRING || ((X + 0.5 - a1) ** 2 + (Y + 0.5 - GH.SPRING) ** 2 <= R * R && (X + 0.5 - a0) ** 2 + (Y + 0.5 - GH.SPRING) ** 2 <= R * R);
    };
    const stone = (X, Y, round, x0, w, bright) => { // Quader; runde Türme mit Zylinderschattierung
      const row = Math.floor(Y / 9), off = (row % 2) * 7, bx = Math.floor((X + off) / 14);
      const mortar = Y % 9 === 0 || (X + off) % 14 === 0;
      let k = 0.85 + ((row * 7 + bx * 13) % 5) * 0.05 + (BAYG[(Y & 3) * 4 + (X & 3)] / 16 - 0.5) * 0.08;
      if (round) { const n = ((X - x0) / w) * 2 - 1; k *= 0.55 + 0.6 * Math.sqrt(Math.max(0, 1 - n * n)) - 0.15 * n; }
      k *= bright;
      if (mortar) k *= 0.5;
      return [48 * k, 42 * k, 60 * k];
    };
    for (let Y = 0; Y < H0; Y++) for (let X = 0; X < W0; X++) {
      if (X < hx) { // linker Turm (hinten), steht im Graben, Algen am Wasser
        if (Y >= H0) continue;
        let [r, g, b] = stone(X, Y, true, 0, hx, 1);
        if (Y > 168) { g += (Y - 168) * 1.2; r *= 0.8; }
        put(B, X, Y, r, g, b);
      } else if (X < hx + GH.A) { // Torbau
        if (Y >= 176) continue;
        if (Y < 9 && ((X - hx) % 16) >= 10) continue; // Zinnen
        if (arch(X, Y)) { // Durchgang: dunkle Rückwand, unten etwas Licht
          const k = 0.25 + Math.max(0, (Y - 100) / 76) * 0.35, row = Math.floor(Y / 9), m = Y % 9 === 0 || (X + (row % 2) * 7) % 14 === 0;
          put(B, X, Y, 26 * k * (m ? 0.5 : 1), 20 * k * (m ? 0.5 : 1), 34 * k * (m ? 0.5 : 1));
          continue;
        }
        let [r, g, b] = stone(X, Y, false, 0, 0, 1.05);
        if (arch(X, Y, 10)) { // Bogensteine: helle und dunkle Keile im Wechsel
          const a = Math.atan2(Y + 0.5 - GH.SPRING, X + 0.5 - (hx + GH.IN + GH.SPAN / 2)), v = Math.floor((a + Math.PI) / 0.16) % 2;
          const edge = !arch(X, Y, 9);
          const k = edge ? 0.45 : v ? 1.35 : 1.15; r = 50 * k; g = 44 * k; b = 64 * k;
        }
        if (Y >= 14 && Y < 26) { const kk = (X - hx) % 10; if (Y >= 20 && kk > 1 && kk < 8) { r = 10; g = 6; b = 14; } else if (Y === 14) { r *= 1.4; g *= 1.4; b *= 1.4; } } // Pechnasen
        if (X - hx < 2 || X - hx > GH.A - 3) { r *= 0.6; g *= 0.6; b *= 0.6; }
        put(F, X, Y, r, g, b);
      } else { // rechter Turm (vorn), rund, ragt über den Bildrand
        if (Y >= 176) continue;
        let [r, g, b] = stone(X, Y, true, hx + GH.A, GH.R, 1.1);
        if ((Y >= 20 && Y < 26) || (Y >= 96 && Y < 100)) { r *= 1.35; g *= 1.35; b *= 1.35; } // Gesimse
        put(F, X, Y, r, g, b);
      }
    }
    // Schießscharten
    [[hx - 30, 110], [hx + GH.A + 20, 120], [hx + GH.A + 74, 60], [hx + GH.A + 46, 140]].forEach(([sx, sy]) => {
      const L = sx < hx ? B : F;
      for (let Y = sy; Y < sy + 14; Y++) { put(L, sx, Y, 8, 4, 12); put(L, sx + 1, Y, 8, 4, 12); }
      for (let X = sx - 2; X < sx + 4; X++) put(L, X, sy + 6, 8, 4, 12);
    });
    // Totenkopf als Schlussstein über dem Bogen
    const sk = ['..wwwwwww..', '.wwwwwwwww.', 'wwwwwwwwwww', 'wkkkwwwkkkw', 'wkkkwwwkkkw', 'wwwwwkwwwww', '.wwwkkkwww.', '..wkwkwkw..', '..wwwwwww..', '...wkwkw...'];
    sk.forEach((rowS, y) => [...rowS].forEach((ch, x) => { if (ch === '.') return; const X = hx + GH.A / 2 - 5 + x, Y = 44 + y; if (ch === 'k') put(F, X, Y, 16, 8, 14); else put(F, X, Y, 216 - y * 6, 208 - y * 6, 190 - y * 6); }));
    // Fenster der Türme (glühen live)
    [[hx - 32, 70], [hx + GH.A + 30, 50], [hx + GH.A + 60, 106]].forEach(([wx, wy]) => {
      const L = wx < hx ? B : F;
      for (let Y = wy - 2; Y < wy + 14; Y++) for (let X = wx - 2; X < wx + 8; X++) if (Y >= wy || Math.abs(X - wx - 2.5) < 4 - (wy - Y)) put(L, X, Y, 20, 12, 22);
    });
    // Wasserspeier am rechten Turm
    const gg = ['....kkk.', '..kkggkk', '.kgggggk', 'kggkgggk', 'kgggggkk', '.kgkgk..', '..k.k...'];
    gg.forEach((rowS, y) => [...rowS].forEach((ch, x) => { if (ch === '.') return; put(F, hx + GH.A + 2 + x, 30 + y, ch === 'k' ? 18 : 92, ch === 'k' ? 14 : 86, ch === 'k' ? 24 : 104); }));
    [B, F].forEach(L => L.x.putImageData(L.img, 0, 0));
    return (Gatehouse.A = { back: B.c, front: F.c });
  }
}

// Seilwinde: Peitsche (oder Wurfwaffe) löst die Sperrklinke
class Winch extends Ent {
  constructor(gh, x, feet) { super(x - 10, feet - 24, 20, 24); this.kind = 'candle'; this.gh = gh; }
  hit() { this.gh.release(); }
  update() { this.t++; }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#2c1808', 2, 6, 3, 18); R('#2c1808', 15, 6, 3, 18); R('#6c4424', 3, 6, 1, 18); R('#6c4424', 16, 6, 1, 18); // Gestell
    R('#2c1808', 0, 22, 20, 2); R('#5a3214', 4, 7, 12, 6); R('#8a5428', 4, 7, 12, 2); // Trommel mit Seil
    for (let k = 4; k < 16; k += 3) R('#c8a070', k, 9, 1, 3);
    const a = this.gh.wheel; // Kurbelrad dreht sich mit
    ctx.fillStyle = '#3c2410';
    for (let s = 0; s < 4; s++) { const an = a + s * Math.PI / 4; for (let r = -6; r <= 6; r++) ctx.fillRect(Math.round(x + 10 + Math.cos(an) * r), Math.round(y + 10 + Math.sin(an) * r), 1, 1); }
    for (let k = 0; k < 24; k++) { const an = k / 24 * Math.PI * 2; ctx.fillStyle = k % 2 ? '#8a5428' : '#5a3214'; ctx.fillRect(Math.round(x + 10 + Math.cos(an) * 7), Math.round(y + 10 + Math.sin(an) * 7), 1, 1); }
    R('#9c98a8', 9, 9, 3, 3);
    if (this.gh.state === 'up') { // Sperrklinke und Glitzern: hier peitschen!
      R('#6c6878', 17, 2, 2, 6); R('#c8c4d0', 17, 2, 1, 2);
      const g = this.t % 90;
      if (g < 12) { const s = g < 6 ? g : 12 - g; ctx.fillStyle = '#fcfcfc'; ctx.fillRect(x + 18 - s, y + 2, s * 2 + 1, 1); ctx.fillRect(x + 18, y + 2 - s, 1, s * 2 + 1); }
    }
  }
}

// Schädel auf einem Pfahl am Grabenufer – Warnung an alle, die das Tor stürmen wollen
class SkullStake extends Ent {
  constructor(d) { super(d.x * T + 6, (d.y + 1) * T - 34, 4, 34); this.kind = 'prop'; this.flip = !!d.flip; }
  update() { this.t++; }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#2c1808', 1, 8, 3, 26); R('#6c4424', 1, 8, 1, 26); R('#2c1808', 2, 2, 1, 6);
    R('#d8d4c8', -3, 0, 10, 8); R('#e8e4d8', -2, 0, 7, 2); R('#16121c', -1, 3, 2, 2); R('#16121c', 3, 3, 2, 2); R('#16121c', 1, 6, 2, 1);
    R('#b8b4a8', -2, 8, 8, 2); R('#16121c', -1, 8, 1, 1); R('#16121c', 1, 8, 1, 1); R('#16121c', 3, 8, 1, 1);
    if ((this.t >> 5) % 3 === 0) R('#6c0010', -1, 4, 1, 1);
  }
}

// ---------------- Eingangshalle: Kronleuchter, der herabstürzt ----------------
// Hängt an einer Kette von der Decke. Geht der Held darunter durch, knarrt er, rieselt Staub – dann reißt die
// Kette. Mit der Peitsche (oder einer Wurfwaffe) lässt er sich auch absichtlich auf Gegner fallen lassen.
class FallingChandelier extends Ent {
  constructor(d) {
    super(d.x * T - 22, d.y * T + d.len, 44, 18);
    this.kind = 'candle'; this.ax = d.x * T; this.ay = d.y * T; this.len = d.len;
    this.state = 'hang'; this.vy = 0; this.wt = 0; this.lit = true; this.fade = 1;
  }
  hit() { if (this.state === 'hang') { this.state = 'warn'; this.wt = 14; Audio8.sfx('crack', this.cx); } } // abgeschlagen: fällt sofort
  update() {
    this.t++;
    const p = W.player;
    if (this.state === 'hang') {
      if (p.alive && Math.abs(p.cx - this.cx) < 38 && p.cy > this.y + 10 && p.cy - this.y < 220) { this.state = 'warn'; this.wt = 0; Audio8.sfx('creak', this.cx); }
    } else if (this.state === 'warn') { // Vorwarnung: zittert, Staub rieselt
      if (++this.wt % 6 === 0) W.dust(this.ax + rnd(-6, 6), this.ay + 2, 2);
      if (this.wt === 20) Audio8.sfx('creak', this.cx);
      if (this.wt > 34) { this.state = 'fall'; Audio8.sfx('crack', this.cx); Audio8.sfx('chain', this.cx); }
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 0.36, 9); this.y += this.vy;
      for (const e of W.ents) if (e.kind === 'enemy' && !e.dead && Phys.overlap(this, e)) { e.hp = 0; e.kill(); } // zerschmettert Gegner
      if (p.alive && Phys.overlap(this, p)) p.hurt(3, this.cx);
      const c0 = Math.floor((this.x + 6) / T), c1 = Math.floor((this.x + this.w - 6) / T), row = Math.floor((this.y + this.h) / T);
      for (let c = c0; c <= c1; c++) if (Phys.solidTile(c, row)) { this.crash(row * T); break; }
      if (this.y > W.room.h * T) this.dead = true;
    } else if (this.state === 'wreck') {
      if (this.t % 9 === 0 && this.lit) W.spawn(new Particle(this.cx + rnd(-14, 14), this.y + 6, rnd(-0.2, 0.2), rnd(-1.2, -0.5), this.t % 18 ? '#f87800' : '#fcd040', 22, 1, -0.02));
      if (++this.wt > 600) { this.lit = false; this.fade = Math.max(0, this.fade - 0.01); if (this.fade <= 0) this.dead = true; }
    }
  }
  crash(floorY) {
    this.y = floorY - this.h + 6; this.state = 'wreck'; this.wt = 0; this.vy = 0;
    W.shake = Math.max(W.shake, 12); Input.rumble(0.8, 0.6, 350);
    Audio8.sfx('shatter', this.cx); Audio8.sfx('boom', this.cx);
    for (let i = 0; i < 22; i++) W.spawn(new Particle(this.cx + rnd(-18, 18), floorY - 4, rnd(-2.6, 2.6), rnd(-4, -1), i % 3 ? '#c8d8fc' : '#fcfcfc', 40, 1, 0.2)); // Kristallsplitter
    for (let i = 0; i < 10; i++) W.spawn(new Particle(this.cx + rnd(-16, 16), floorY - 4, rnd(-1.5, 1.5), rnd(-3, -1), i % 2 ? '#f87800' : '#fcd040', 30, 2, 0.15));
    W.dust(this.cx, floorY, 8);
    const p = W.player;
    if (p.alive && Math.abs(p.cx - this.cx) < 26 && Math.abs(p.feet - floorY) < 12) p.hurt(3, this.cx);
  }
  lights(L, cx, cy, flick) {
    if (!this.lit) return;
    L.push({ x: this.cx - cx, y: this.y + 2 - cy, r: (this.state === 'wreck' ? 24 : 32) + flick(this.ax), c: [248, 170, 70], a: 0.42 }); // nur ein schwacher Schein – den Saal erhellen die Blitze
  }
  draw(ctx) {
    const cx = W.cam.x, cy = W.cam.y, sh = this.state === 'warn' ? Math.round(Math.sin(this.wt * 1.7) * 1.5) : 0;
    const x = Math.round(this.x - cx) + sh, y = Math.round(this.y - cy);
    if (this.state === 'hang' || this.state === 'warn') { // Kette bis zur Decke
      for (let yy = Math.round(this.ay - cy); yy < y - 6; yy += 3) { ctx.fillStyle = (yy >> 1) % 2 ? '#3c3c48' : '#8c8898'; ctx.fillRect(x + 21, yy, 2, 2); }
    } else if (this.state === 'fall') { // gerissenes Kettenende
      for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#3c3c48' : '#8c8898'; ctx.fillRect(x + 21, y - 8 - k * 3, 2, 2); }
    }
    ctx.globalAlpha = this.fade;
    if (this.state === 'wreck') { // zerschellt: verbogener Reif, Kristalle, glimmende Kerzen
      ctx.fillStyle = '#5c4010'; ctx.fillRect(x + 2, y + 10, 40, 3); ctx.fillStyle = '#c89020'; ctx.fillRect(x + 4, y + 9, 14, 1); ctx.fillRect(x + 26, y + 11, 12, 1);
      ctx.fillStyle = '#a4b4e4'; for (let k = 0; k < 7; k++) ctx.fillRect(x + 3 + k * 6, y + 12 + (k % 2), 2, 1);
      if (this.lit) for (let k = 0; k < 3; k++) { ctx.fillStyle = '#e8e0c8'; ctx.fillRect(x + 8 + k * 12, y + 6 + (k % 2) * 2, 2, 4); ctx.fillStyle = (this.t >> 2) % 2 ? '#fcd040' : '#f87800'; ctx.fillRect(x + 8 + k * 12, y + 4 + (k % 2) * 2, 2, 2); }
      ctx.globalAlpha = 1;
      return;
    }
    // prächtiger Kronleuchter: Krone, zwei Reifen, Kristallgehänge, brennende Kerzen
    ctx.fillStyle = '#5c4010'; ctx.fillRect(x + 19, y - 6, 6, 6);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x + 4, y, 36, 3); ctx.fillRect(x + 10, y + 7, 24, 2); ctx.fillRect(x + 20, y - 2, 4, 14);
    ctx.fillStyle = '#fce0a8'; ctx.fillRect(x + 4, y, 36, 1); ctx.fillRect(x + 10, y + 7, 24, 1);
    ctx.fillStyle = '#a4b4e4'; for (let k = 0; k < 9; k++) ctx.fillRect(x + 5 + k * 4, y + 3 + (k % 2), 1, 3 + (k % 3));
    ctx.fillStyle = '#e8f0fc'; ctx.fillRect(x + 21, y + 12, 2, 4);
    for (let k = 0; k < 5; k++) { const kx = x + 4 + k * 8; ctx.fillStyle = '#e8e0c8'; ctx.fillRect(kx, y - 5, 2, 5); ctx.fillStyle = ((this.t >> 2) + k) % 3 ? '#fcd040' : '#f87800'; ctx.fillRect(kx, y - 8, 2, 3); }
    ctx.globalAlpha = 1;
  }
}

// ---------------- Ritterrüstung: Deko auf einem Sockel – manche erwachen zum Leben ----------------
class ArmorSuit extends Ent {
  constructor(d) { super(d.x * T, (d.y + 1) * T - 56, 16, 56); this.kind = 'prop'; this.live = !!d.live; this.state = 'still'; this.wt = 0; this.flip = !!d.flip; this.d = d; }
  update() {
    this.t++;
    if (!this.live || this.state === 'empty') return;
    const p = W.player;
    if (this.state === 'still' && p.alive && Math.abs(p.cx - this.cx) < 64 && Math.abs(p.feet - (this.y + this.h)) < 48) { this.state = 'wake'; this.wt = 0; Audio8.sfx('clank', this.cx); }
    if (this.state === 'wake' && ++this.wt > 36) { // steigt vom Sockel und marschiert los
      this.state = 'empty';
      const k = W.spawn(new LivingArmor(this.d.x, this.d.y));
      k.face = Math.sign(p.cx - this.cx) || 1; k.y = this.y + this.h - 4 - k.h;
      W.dust(this.cx, this.y + this.h - 4, 5); Audio8.sfx('clank', this.cx); W.shake = Math.max(W.shake, 3);
    }
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#2c2834', -5, 52, 26, 4); R('#6c6478', -5, 52, 26, 1); R('#1c1824', -4, 55, 24, 1); R('#3c3448', -3, 53, 22, 1); // Sockel
    if (this.state === 'empty') return;
    const sh = this.state === 'wake' ? Math.round(Math.sin(this.wt * 2.1)) : 0, X = x + (this.flip ? -8 : -7) + sh, Y = y - 3;
    Sprites.draw(ctx, ARMOR_SPR.still, X, Y, this.flip);
    const eyes = this.state === 'wake' ? ((this.wt >> 2) % 2 ? '#fc3c3c' : '#fcd040') : this.live && (this.t % 240) < 4 ? '#6c1010' : null; // erwachende Rüstung: Augen glühen
    if (eyes) { ctx.fillStyle = eyes; for (const ex of this.flip ? [17, 14] : [12, 15]) ctx.fillRect(X + ex, Y + 9, 1, 1); }
  }
}

// ---------------- Bibliothek: Lesepult mit aufgeschlagenem Buch, dessen Seiten sich von selbst umblättern ----------------
class Lectern extends Ent {
  constructor(d) { super(d.x * T - 2, (d.y + 1) * T - 30, 20, 30); this.kind = 'prop'; this.flipT = -1; this.t = d.x * 13; }
  update() {
    this.t++;
    if (this.flipT >= 0 && ++this.flipT > 24) this.flipT = -1;
    if (this.flipT < 0 && this.t % 150 === 0 && this.onScreen(0)) { this.flipT = 0; Audio8.sfx('page', this.cx); }
  }
  lights(L, cx, cy, flick) { L.push({ x: this.x + 18 - cx, y: this.y - 2 - cy, r: 30 + flick(this.x), c: [248, 150, 60], a: 0.5 }); }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#1c0c04', 2, 27, 16, 3); R('#7c4c20', 2, 27, 16, 1); R('#3c1c08', 4, 25, 12, 2); // Fuß
    R('#3c1c08', 8, 12, 4, 13); R('#8c5c2c', 8, 12, 1, 13); R('#5c3414', 6, 17, 8, 2); R('#a0703c', 6, 17, 8, 1); // gedrechselte Säule
    R('#2c1406', 0, 9, 20, 4); R('#a0703c', 0, 9, 20, 1); R('#140802', 1, 12, 18, 1); // schräge Pultplatte
    R('#4c0c14', 1, 6, 18, 3); R('#f0e8d0', 2, 4, 7, 3); R('#f0e8d0', 11, 4, 7, 3); R('#c8bca0', 9, 5, 2, 2); // Buch
    for (let k = 0; k < 2; k++) { R('#8c8070', 3, 5 + k, 5, 1); R('#8c8070', 12, 5 + k, 5, 1); }
    R('#d82828', 10, 9, 1, 4); // Lesebändchen
    if (this.flipT >= 0) { // eine Seite hebt sich und schlägt um
      const a = this.flipT / 24 * Math.PI;
      for (let r = 1; r <= 7; r++) R(r > 5 ? '#d8ccb0' : '#fcf4e0', Math.round(10 + Math.cos(a) * r), Math.round(4 - Math.sin(a) * r * 0.9), 1, 2);
    }
    R('#3c2c1c', 15, 3, 6, 1); R('#e8e0c8', 17, -3, 2, 6); R(((this.t >> 2) % 3) ? '#fcd040' : '#f87800', 17, -6, 2, 3); // Kerze
  }
}

// ---------------- Bibliothek: Globus auf geschnitztem Gestell – die Kugel dreht sich (Kugelabbildung, 32 vorberechnete Bilder) ----------------
const GLOBE_FR = (() => {
  const R = 11, N = 32, D = R * 2 + 1, MW = 64, MH = 32;
  const hh = (X, Y) => { let n = Math.imul(X * 374761393 + Y * 668265263, 1274126177); n ^= n >>> 13; return ((Math.imul(n, 1274126177) >>> 0) % 1000) / 1000; };
  const map = new Uint8Array(MW * MH); // Weltkarte: Kontinente aus Wertrauschen, nahtlos in Längsrichtung
  for (let Y = 0; Y < MH; Y++) for (let X = 0; X < MW; X++) {
    let v = 0;
    for (const [s, w] of [[8, 0.55], [4, 0.3], [2, 0.15]]) {
      const mw = MW / s, gx = X / s, gy = Y / s, x0 = Math.floor(gx), y0 = Math.floor(gy), fx = gx - x0, fy = gy - y0;
      const a = hh(x0 % mw, y0), b = hh((x0 + 1) % mw, y0), c = hh(x0 % mw, y0 + 1), d = hh((x0 + 1) % mw, y0 + 1);
      v += w * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
    }
    map[Y * MW + X] = v > 0.56 ? 2 : v > 0.51 ? 1 : 0; // Land, Küste, Meer
  }
  const frames = [];
  for (let f = 0; f < N; f++) {
    const c = Sprites.canvas(D, D), x = c.getContext('2d'), img = x.createImageData(D, D), d = img.data;
    for (let py = -R; py <= R; py++) for (let qx = -R; qx <= R; qx++) {
      const q = (qx * qx + py * py) / (R * R);
      if (q > 1) continue;
      const nz = Math.sqrt(1 - q), lon = Math.atan2(qx / R, nz) + f / N * Math.PI * 2, lat = Math.asin(py / R);
      const u = ((Math.floor(lon / (Math.PI * 2) * MW) % MW) + MW) % MW, v = Math.min(MH - 1, Math.floor((lat / Math.PI + 0.5) * MH));
      const m = map[v * MW + u], base = m === 2 ? [200, 164, 100] : m === 1 ? [140, 100, 56] : [56, 98, 104]; // Pergamentland, Küste, Meer
      let k = Math.max(0.28, Math.min(1.15, 0.4 + nz * 0.65 - qx / R * 0.3 - py / R * 0.22)); // Licht von links oben
      if (Math.abs(((lon / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.46 || Math.abs((((lat + 0.001) / (Math.PI / 6)) % 1 + 1) % 1 - 0.5) > 0.45) k *= 0.72; // Grade
      const i = ((py + R) * D + qx + R) * 4;
      d[i] = base[0] * k; d[i + 1] = base[1] * k; d[i + 2] = base[2] * k; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); frames.push(c);
  }
  return frames;
})();
class Globe extends Ent {
  constructor(d) { super(d.x * T - 4, (d.y + 1) * T - 40, 24, 40); this.kind = 'prop'; this.t = d.x * 5; }
  update() { this.t++; }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#1c0c04', 2, 38, 20, 2); R('#3c1c08', 3, 34, 3, 5); R('#3c1c08', 18, 34, 3, 5); R('#7c4c20', 3, 34, 1, 5); // Beine
    R('#3c1c08', 4, 32, 16, 2); R('#8c5c2c', 4, 32, 16, 1); R('#5c3414', 10, 25, 4, 8); R('#a0703c', 10, 25, 1, 8); // Säule
    for (let a = Math.PI; a <= Math.PI * 2; a += 0.12) R('#8c6414', Math.round(12 + Math.cos(a) * 15), Math.round(13 + Math.sin(a) * 3.5)); // Horizontring hinten
    ctx.drawImage(GLOBE_FR[Math.floor(this.t / 8) % GLOBE_FR.length], x + 1, y + 2);
    for (let a = 0; a < Math.PI * 2; a += 0.07) { const ca = Math.cos(a), sa = Math.sin(a); R(ca > 0.3 && sa < 0 ? '#fce0a8' : '#c8982c', Math.round(12 + ca * 12.6), Math.round(13 + sa * 12.6)); } // Meridianring aus Messing
    for (let a = 0; a <= Math.PI; a += 0.12) R('#c8982c', Math.round(12 + Math.cos(a) * 15), Math.round(13 + Math.sin(a) * 3.5)); // Horizontring vorne
    R('#fce0a8', 11, 0, 2, 1); R('#8c6414', 11, 26, 2, 1); // Achse
  }
}

// ---------------- Thronsaal: der Thron des Grafen auf einem Podest unter einem Baldachin ----------------
// Hinter den Kulissen gezeichnet (vor den Kacheln): Lambrequin mit Goldfransen, schwere gerafften Samtvorhänge,
// Damast-Rückwand mit Fledermauswappen, dreistufiges Podest aus schwarzem Marmor mit rotem Läufer, gotischer Thron
// mit Fialen, Rückenlehne aus gestepptem Samt, Schädeln auf den Armlehnen und Löwenfüßen.
const THRONE_ART = (() => {
  const W0 = 176, H0 = 176, c = Sprites.canvas(W0, H0), x = c.getContext('2d'), cx = 88;
  const R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
  for (let y = 12; y < 150; y++) for (let X = 30; X < 146; X++) { // Damast-Rückwand
    const u = (X % 16) - 8, v = (y % 22) - 11, fl = Math.abs(u) < 6 - Math.abs(v) * 0.5;
    R(fl ? '#4c0818' : (X + y) % 5 === 0 ? '#2a020a' : '#34040e', X, y);
  }
  // Wappen über dem Thron: Fledermaus vor goldener Scheibe
  for (let y = -12; y <= 12; y++) for (let X = -12; X <= 12; X++) { const d = Math.hypot(X, y); if (d <= 12) R(d > 10.5 ? '#f8b800' : d > 9.5 ? '#8c6414' : '#5c0814', cx + X, 24 + y); }
  for (let k = 0; k < 9; k++) { R('#0c0408', cx - 2 - k, 22 - Math.round(Math.sin(k / 8 * Math.PI) * 4), 1, 4 + (k % 3 === 2 ? 2 : 0)); R('#0c0408', cx + 2 + k, 22 - Math.round(Math.sin(k / 8 * Math.PI) * 4), 1, 4 + (k % 3 === 2 ? 2 : 0)); }
  R('#0c0408', cx - 2, 20, 5, 7); R('#0c0408', cx - 2, 18, 1, 2); R('#0c0408', cx + 2, 18, 1, 2); R('#fc3c3c', cx - 1, 22, 1, 1); R('#fc3c3c', cx + 1, 22, 1, 1);
  // gerafften Vorhänge links und rechts
  for (const side of [-1, 1]) {
    for (let y = 10; y < 176; y++) {
      const tie = 100, g = y < tie ? 0.95 - (y - 10) / (tie - 10) * 0.5 : 0.45 + (y - tie) / 76 * 0.6, w = Math.round(42 * g), x0 = side < 0 ? 2 : W0 - 2 - w;
      for (let X = 0; X < w; X++) { const f = Math.sin((X / Math.max(1, w)) * Math.PI * 4 + y * 0.02) * 0.5 + 0.5; R(f > 0.8 ? '#c02838' : f > 0.45 ? '#8c1020' : f > 0.15 ? '#5c0814' : '#30040a', x0 + X, y); }
      if (y > tie - 2 && y < tie + 2) R('#c89020', x0 - 1, y, w + 2, 1);
    }
    const tx = side < 0 ? 22 : W0 - 26; // Quaste
    R('#f8b800', tx, 102, 4, 5); for (let k = 0; k < 11; k++) R(k % 2 ? '#c89020' : '#fce0a8', tx - 1 + (k % 6), 107 + (k >> 1), 1, 4);
  }
  // Lambrequin mit Bogenkanten und Goldfransen
  for (let X = 0; X < W0; X++) { const sc = X % 22, h = 12 + Math.round(Math.sin(sc / 22 * Math.PI) * 6); R('#6c0814', X, 0, 1, h); R(sc % 4 === 0 ? '#8c1020' : '#6c0814', X, 2, 1, h - 4); R('#c89020', X, h - 2, 1, 1); if (X % 2 === 0) R('#f8b800', X, h - 1, 1, 3); }
  R('#f8b800', 0, 0, W0, 2); R('#fce0a8', 0, 0, W0, 1);
  // Podest: drei Stufen aus schwarzem Marmor mit Goldkante, roter Läufer
  [[6, 160, 164, 16], [22, 148, 132, 12], [38, 138, 100, 10]].forEach(([sx, sy, sw, sh]) => {
    for (let y = 0; y < sh; y++) for (let X = 0; X < sw; X++) R(Math.abs(Math.sin((sx + X) * 0.2 + (sy + y) * 0.5)) < 0.06 ? '#3c2c44' : '#1c1420', sx + X, sy + y);
    R('#6c5c74', sx, sy, sw, 1); R('#c89020', sx, sy + 1, sw, 1); R('#0c080e', sx, sy + sh - 1, sw, 1);
  });
  R('#a80020', cx - 15, 138, 30, 38); R('#d82838', cx - 15, 138, 30, 1); R('#f8b800', cx - 15, 138, 2, 38); R('#f8b800', cx + 13, 138, 2, 38);
  for (const y of [148, 160]) R('#c89020', cx - 15, y, 30, 1); // Teppichstangen auf den Stufen
  // Thron: Seitenpfosten mit Goldbändern und Fialen
  for (const s of [-1, 1]) {
    const px0 = cx + s * 30 - (s < 0 ? 0 : 5);
    R('#140a0c', px0, 36, 5, 100); R('#3c2028', px0, 36, 1, 100);
    for (const y of [44, 70, 96, 120]) R('#c89020', px0, y, 5, 2);
    for (let k = 0; k < 14; k++) { const w = 1 + Math.floor(k / 5); R('#140a0c', px0 + 2 - Math.floor(w / 2), 22 + k, w, 1); } // Fiale
    R('#f8b800', px0 + 1, 19, 3, 3);
  }
  // Rückenlehne: Spitzbogen, Goldrahmen, gesteppter Samt
  for (let y = 26; y < 112; y++) {
    const half = y > 52 ? 24 : Math.round(24 * Math.sqrt(Math.max(0, 1 - ((52 - y) / 26) ** 2 * 0.9)));
    for (let X = -half; X < half; X++) {
      const edge = Math.abs(X) > half - 3 || y < 29, gold = Math.abs(X) > half - 5 && Math.abs(X) <= half - 3, tuft = (X + 64 + (y % 12 < 6 ? 0 : 4)) % 8 === 0 && y % 6 === 0;
      R(edge ? '#140a0c' : gold ? '#c89020' : tuft ? '#5c0814' : ((X + y) & 3) === 0 ? '#a01828' : '#8c1020', cx + X, y);
    }
  }
  for (let k = 0; k < 20; k++) R(k < 4 ? '#fce0a8' : '#140a0c', cx - Math.floor(k / 7), 6 + k, 1 + Math.floor(k / 7) * 2, 1); // Mittelfiale
  R('#f8b800', cx - 1, 4, 3, 3);
  // Sitz, Armlehnen mit Schädeln, Löwenfüße
  R('#5c0814', cx - 30, 112, 60, 14); R('#c02838', cx - 30, 112, 60, 3); R('#f8b800', cx - 30, 115, 60, 1); R('#c89020', cx - 30, 125, 60, 1);
  for (const s of [-1, 1]) {
    const ax = s < 0 ? cx - 38 : cx + 26;
    R('#140a0c', ax, 100, 12, 14); R('#3c2028', ax, 100, 12, 1); R('#c89020', ax, 104, 12, 1);
    const sk = s < 0 ? ax - 2 : ax + 8; R('#d8d4c4', sk, 94, 7, 6); R('#f0ecdc', sk, 94, 7, 1); R('#140c08', sk + 1, 96, 2, 2); R('#140c08', sk + 4, 96, 2, 2); R('#a8a494', sk + 2, 99, 3, 2); // Schädel
    R('#c89020', s < 0 ? cx - 30 : cx + 24, 126, 6, 10); R('#f8b800', s < 0 ? cx - 31 : cx + 23, 134, 8, 3); // Löwenfuß
  }
  return c;
})();
class Throne extends Ent {
  constructor(d) { super(d.x * T - 88, (d.y + 1) * T - 176, 176, 176); this.kind = 'prop'; }
  draw() {}
  drawBack(ctx) {
    const X = Math.round(this.x - W.cam.x), Y = Math.round(this.y - W.cam.y);
    if (X < View.w && X + 176 > 0) ctx.drawImage(THRONE_ART, X, Y);
  }
}

// Feuerschale auf eisernem Dreifuß: lodernde Flammen, Funkenflug, warmes Licht
class Brazier extends Ent {
  constructor(d) { super(d.x * T - 8, (d.y + 1) * T - 52, 16, 52); this.kind = 'prop'; this.t = d.x * 7; }
  update() {
    this.t++;
    if (this.t % 5 === 0 && this.onScreen(16)) W.spawn(new Particle(this.cx + rnd(-6, 6), this.y - 4, rnd(-0.25, 0.25), -rnd(0.7, 1.3), Math.random() < 0.5 ? '#f87800' : '#fcd040', 28, 1, -0.015));
  }
  lights(L, cx, cy, flick) { L.push({ x: this.cx - cx, y: this.y - 6 - cy, r: 66 + flick(this.x) * 2, c: [248, 120, 30], a: 0.72 }); }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#1c1418', 7, 14, 2, 34); R('#4c4458', 7, 14, 1, 34); R('#1c1418', 2, 44, 12, 2); R('#1c1418', 0, 46, 3, 6); R('#1c1418', 13, 46, 3, 6); R('#c89020', 6, 28, 4, 2); // Dreifuß
    R('#2c2430', -5, 8, 26, 6); R('#6c6478', -5, 8, 26, 1); R('#c89020', -5, 10, 26, 1); R('#1c1418', -3, 14, 22, 2); // Schale
    R('#a82800', -3, 6, 22, 3); R('#fc7c00', -1, 6, 18, 1); // Glut
    for (let k = 0; k < 5; k++) { // züngelnde Flammen
      const ph = this.t * 0.23 + k * 1.7, h = 11 + Math.round(Math.sin(ph) * 4 + Math.sin(ph * 2.3) * 2), fx = -2 + k * 4;
      R('#d82800', fx, 6 - h, 4, h); R('#f87800', fx + 1, 6 - Math.round(h * 0.75), 2, Math.round(h * 0.75)); R('#fcd040', fx + 1, 6 - Math.round(h * 0.4), 2, Math.round(h * 0.4));
    }
  }
}

// Goldener Standleuchter mit fünf Kerzen
class Candelabra extends Ent {
  constructor(d) { super(d.x * T - 12, (d.y + 1) * T - 48, 24, 48); this.kind = 'prop'; this.t = d.x * 5; }
  update() { this.t++; }
  lights(L, cx, cy, flick) { L.push({ x: this.cx - cx, y: this.y + 2 - cy, r: 40 + flick(this.x), c: [248, 160, 60], a: 0.5 }); }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#5c4010', 4, 44, 16, 4); R('#c89020', 4, 44, 16, 1); R('#8c6414', 7, 40, 10, 4); // Fuß
    R('#8c6414', 11, 12, 2, 30); R('#e8c070', 11, 12, 1, 30); R('#c89020', 9, 24, 6, 2); R('#c89020', 9, 33, 6, 2); // Schaft mit Knäufen
    R('#c89020', 1, 12, 22, 2); R('#fce0a8', 1, 12, 22, 1); R('#c89020', 1, 6, 2, 6); R('#c89020', 21, 6, 2, 6); R('#c89020', 6, 8, 2, 4); R('#c89020', 16, 8, 2, 4); // Arme
    [[1, 5], [6, 7], [11, 3], [16, 7], [21, 5]].forEach(([cx0, top], k) => {
      R('#c89020', cx0 - 1, top + 1, 4, 1); R('#e8e0c8', cx0, top - 4, 2, 5);
      R(((this.t >> 2) + k) % 3 ? '#fcd040' : '#f87800', cx0, top - 7, 2, 3);
    });
  }
}

// ---------------- Riesige Ahnenbilder: die Augen folgen dem Helden ----------------
// Vorgerendert (96×132): barocker Goldrahmen mit Perlstab, Akanthus-Ecken und einer Kartusche mit geflügeltem Schädel,
// dunkler Firnis mit Craquelé, dahinter je ein Motiv: der Ahnherr mit Eisenkrone und weißem Haar vor Gewitterburg,
// die Gräfin vor weinrotem Samt, der Graf selbst vor blutrotem Schein. Live gezeichnet: Augäpfel und Pupillen, die dem
// Helden folgen – steht er davor, glühen die Augen rot, Bluttränen rinnen und der Mund verzieht sich zum Fanggrinsen.
const PORTRAITS = (() => {
  const FW = 96, FH = 132, cx = 48, fy = 54; // Gesichtsmitte
  const mk = (v) => {
    const c = Sprites.canvas(FW, FH), x = c.getContext('2d'), R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), w, h); };
    const ell = (ex, ey, rx, ry, f) => { for (let y = Math.floor(ey - ry); y <= ey + ry; y++) for (let X = Math.floor(ex - rx); X <= ex + rx; X++) { const q = ((X + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2; if (q <= 1) f(X, y, q); } };
    const rgb = (a, k) => `rgb(${a.map(b => Math.max(0, Math.min(255, Math.round(b * k)))).join(',')})`;
    // Hintergrund
    for (let y = 9; y < FH - 9; y++) for (let X = 9; X < FW - 9; X++) {
      const d = Math.hypot((X - cx) / 40, (y - 52) / 56), k = Math.max(0.2, 1.2 - d * 0.85), cr = ((X * 7 + y * 3) % 29 === 0 || (X * 3 + y * 11) % 37 === 0) ? 0.6 : 1;
      let base = v === 2 ? [60, 6, 12] : v === 1 ? [70, 10, 26] : [18, 22, 34];
      if (v === 1 && Math.sin(X * 0.45 + Math.sin(y * 0.05) * 3) > 0.3) base = [104, 18, 40]; // Samtfalten
      if (v === 2) { const h = Math.hypot(X - cx, y - 46); if (h < 34) base = base.map((b, i) => b + (34 - h) * [3.2, 0.5, 0.4][i]); } // blutroter Schein hinter dem Kopf
      R(rgb(base, k * cr), X, y);
    }
    if (v === 0) { // Gewitterburg in der Ferne, Blitz
      for (let X = 10; X < 40; X++) { const h = 62 + Math.round(Math.abs(Math.sin(X * 0.7)) * 3) - (X > 16 && X < 22 ? 14 : 0) - (X > 28 && X < 32 ? 9 : 0); R('#0a0c14', X, h, 1, 80 - h); }
      for (let k = 0; k < 14; k++) R('#c8d8fc', 74 + Math.round(Math.sin(k * 1.7) * 2) - (k >> 2), 12 + k * 2, 1, 2);
      R('#f8d878', 19, 66, 1, 2); R('#f8d878', 30, 68, 1, 1);
    }
    const SK = v === 2 ? ['#6c5c6c', '#a898a8', '#d4c8d4', '#f0e8f0'] : v === 1 ? ['#8c6c6c', '#c8a8a0', '#e8d0c8', '#fcf0e8'] : ['#6c5c50', '#a08c78', '#c8b49c', '#e4d4bc'];
    // Kleidung / Schultern
    if (v === 0) { // Rüstkragen und Pelz
      ell(cx, 112, 36, 26, (X, y, q) => R(q > 0.88 ? '#08080c' : (X + (y >> 1)) % 6 === 0 ? '#5c5c6c' : X < cx ? '#2c2c38' : '#3c3c4c', X, y));
      ell(cx, 88, 24, 8, (X, y) => R((X * 3 + y) % 4 ? '#a8a090' : '#e0d8c8', X, y)); // Hermelin
      for (let k = -16; k <= 16; k += 8) R('#08080c', cx + k, 86, 2, 3);
    } else if (v === 1) { // Samtkleid, schwarze Spitze, Rubin-Halsband
      ell(cx, 116, 34, 24, (X, y, q) => R(q > 0.86 ? '#1c0410' : (X + y) % 5 ? '#4c0818' : '#6c1428', X, y));
      ell(cx, 96, 16, 10, (X, y, q) => { if (y > 90) R(q > 0.7 ? SK[0] : SK[1], X, y); });
      for (let X = cx - 22; X <= cx + 22; X++) { const yy = 92 + Math.round(Math.abs(X - cx) * 0.25); R((X % 3) ? '#0c0408' : '#2c1420', X, yy, 1, 3); }
      R('#0c0408', cx - 7, 78, 14, 2); R('#d81c34', cx - 2, 79, 4, 3); R('#fc8c9c', cx - 1, 79, 1, 1); // Halsband mit Rubin
    } else { // Graf: hoher Stehkragen mit rotem Futter, Umhang, Brosche
      ell(cx, 116, 38, 26, (X, y, q) => R(q > 0.88 ? '#040206' : X < cx ? '#0c0a10' : '#16121c', X, y));
      for (let y = 62; y < 96; y++) { const w = Math.round((96 - y) * 0.35); R('#a80020', cx - 26 + (96 - y) * 0.12, y, w, 1); R('#d82848', cx - 26 + (96 - y) * 0.12, y, 1, 1); R('#a80020', cx + 26 - (96 - y) * 0.12 - w, y, w, 1); R('#5c0010', cx + 25 - (96 - y) * 0.12, y, 1, 1); }
      R('#f0ece4', cx - 6, 80, 12, 10); R('#c8c4bc', cx - 1, 80, 2, 10); R('#a80020', cx - 3, 88, 6, 4); R('#fc5c5c', cx - 2, 88, 2, 1); // Halstuch, Blutstein
    }
    R(SK[0], cx - 6, 70, 12, 12); R(SK[1], cx - 5, 70, 9, 10); // Hals
    // Gesicht: hageres Oval, Licht von links oben, tiefe Wangen
    ell(cx, fy, 15, 20, (X, y, q) => {
      let l = -(X - cx) / 15 * 0.55 - (y - fy) / 20 * 0.35 + (1 - q) * 0.65;
      if (Math.abs(X - cx) > 7 && y > fy + 2 && y < fy + 12) l -= 0.35; // eingefallene Wangen
      R(l > 0.95 ? SK[3] : l > 0.6 ? SK[2] : l > 0.2 ? SK[1] : SK[0], X, y);
    });
    if (v !== 1) { R(SK[1], cx - 17, fy - 4, 3, 7); R(SK[0], cx - 18, fy - 7, 2, 4); R(SK[1], cx + 15, fy - 4, 3, 7); R(SK[0], cx + 17, fy - 7, 2, 4); } // spitze Ohren
    // Haare
    if (v === 0) { // langes weißes Haar, Eisenkrone mit Zacken
      ell(cx, fy - 13, 16, 9, (X, y, q) => { if (y < fy - 10 || Math.abs(X - cx) > 12) R((X * 2 + y) % 5 < 2 ? '#3c3a44' : (X + y) % 3 ? '#8c8894' : '#b8b4c0', X, y); });
      for (let s = 0; s < 7; s++) for (let y = fy - 8; y < fy + 34 - s * 2; y++) { // lange eisengraue Strähnen links und rechts
        const sway = Math.sin(y * 0.18 + s) * 1.2, col = (y + s) % 4 === 0 ? '#3c3a44' : s % 2 ? '#8c8894' : '#a8a4b0';
        R(col, cx - 14 - s * 0.9 - (y - fy) * 0.12 + sway, y, 1, 1); R(col, cx + 13 + s * 0.9 + (y - fy) * 0.12 - sway, y, 1, 1);
      }
      R('#2c2c34', cx - 15, fy - 20, 30, 4); R('#6c6c7c', cx - 15, fy - 20, 30, 1);
      for (let k = -12; k <= 12; k += 6) { for (let h = 0; h < 7 - Math.abs(k) / 4; h++) R(h ? '#2c2c34' : '#8c8c9c', cx + k - 1 + (h >> 2), fy - 21 - h, 3 - (h >> 2), 1); }
      R('#a80020', cx - 1, fy - 19, 2, 2); // Rubin in der Krone
      // spitzer weißer Bart
      for (let k = 0; k < 7; k++) { R('#6c6874', cx - 7 + k * 0.4, fy + 12 + k * 0.6, 3, 1); R('#6c6874', cx + 4 - k * 0.4, fy + 12 + k * 0.6, 3, 1); } // Schnurrbart hängt herab
      for (let y = fy + 16; y < fy + 28; y++) { const w = Math.max(1, Math.round((fy + 28 - y) * 0.35)), split = y > fy + 22 ? 1 : 0; // kurzer gegabelter Bart
        R((y % 2) ? '#8c8894' : '#6c6874', cx - w - split, y, w, 1); R((y % 2) ? '#a8a4b0' : '#7c7884', cx + split, y, w, 1); }
    } else if (v === 1) { // schwarzes Haar, hochgesteckt mit Perlen und Feder
      ell(cx, fy - 12, 18, 13, (X, y, q) => { if (y < fy - 8 || Math.abs(X - cx) > 13) R((X + y) % 4 ? '#0c0608' : '#2c1c24', X, y); });
      ell(cx, fy - 28, 11, 9, (X, y) => R((X * y) % 6 ? '#140a0c' : '#34202a', X, y));
      [[-6, -32], [3, -35], [9, -27]].forEach(([a, b]) => { R('#f0ece4', cx + a, fy + b, 2, 2); R('#fcfcfc', cx + a, fy + b, 1, 1); });
      for (let k = 0; k < 16; k++) R(k % 3 ? '#2c0c18' : '#5c1c34', cx + 10 + k, fy - 34 - k * 0.8, 2, 1); // Feder
      for (let y = fy - 6; y < fy + 20; y++) R('#0c0608', cx + 14 + Math.sin(y * 0.4), y, 3, 1); // Locke
    } else { // Graf: schwarzes Haar mit spitzer Witwenspitze, glatt zurückgekämmt
      ell(cx, fy - 13, 16, 11, (X, y, q) => { if (y < fy - 8 - Math.max(0, 6 - Math.abs(X - cx) * 0.9) || Math.abs(X - cx) > 13) R((X + y) % 5 ? '#06040a' : '#1c1828', X, y); });
      for (let y = fy - 8; y < fy - 1; y++) R('#06040a', cx - Math.max(0, (fy - 2 - y) * 0.2), y, 1 + Math.round(Math.max(0, (fy - 2 - y) * 0.4)), 1);
    }
    // Augenbrauen (böse geschwungen), Augenhöhlen (Augäpfel live), Nase, Mund
    const br = v === 0 ? '#e0dcd4' : '#06040a';
    for (let k = 0; k < 7; k++) { R(br, cx - 12 + k, fy - 6 + (k < 4 ? -Math.floor(k / 2) : k - 5), 1, 2); R(br, cx + 5 + k, fy - 8 + (k > 3 ? Math.floor((k - 3) / 2) : 3 - k), 1, 2); }
    R(SK[0], cx - 12, fy - 3, 8, 6); R(SK[0], cx + 4, fy - 3, 8, 6); // tiefe Augenhöhlen
    R('#1c1018', cx - 12, fy - 3, 8, 1); R('#1c1018', cx + 4, fy - 3, 8, 1);
    for (let y = fy; y < fy + 10; y++) R(SK[0], cx + 1, y, 1, 1); R(SK[3], cx - 1, fy + 2, 1, 6); R(SK[0], cx - 2, fy + 10, 5, 1); // Nase
    R(v === 1 ? '#a8102c' : v === 2 ? '#4c0614' : '#4c2c28', cx - 5, fy + 14, 10, 1); // Mund (bei Nähe: Fanggrinsen, live)
    if (v === 1) { R('#d82848', cx - 4, fy + 15, 8, 1); R('#a8102c', cx + 2, fy + 16, 1, 2); } // rote Lippen, ein Blutstropfen
    if (v === 2) { R('#fcfcfc', cx - 3, fy + 15, 1, 2); R('#fcfcfc', cx + 2, fy + 15, 1, 2); } // Fangzähne
    // Goldrahmen: Profil, Perlstab, Akanthus-Ecken, Kartusche mit geflügeltem Schädel, Namensschild
    const prof = ['#2c1c04', '#5c4010', '#8c6414', '#c89020', '#f8d878', '#fce0a8', '#c89020', '#8c6414', '#3c2804'];
    prof.forEach((col, k) => { x.fillStyle = col; x.fillRect(k, k, FW - k * 2, 1); x.fillRect(k, FH - 1 - k, FW - k * 2, 1); x.fillRect(k, k, 1, FH - k * 2); x.fillRect(FW - 1 - k, k, 1, FH - k * 2); });
    for (let X = 12; X < FW - 12; X += 5) { R('#fce0a8', X, 2, 2, 2); R('#5c4010', X + 1, 3, 1, 1); R('#fce0a8', X, FH - 4, 2, 2); R('#5c4010', X + 1, FH - 3, 1, 1); }
    for (let y = 12; y < FH - 12; y += 5) { R('#fce0a8', 2, y, 2, 2); R('#5c4010', 3, y + 1, 1, 1); R('#fce0a8', FW - 4, y, 2, 2); R('#5c4010', FW - 3, y + 1, 1, 1); }
    [[0, 0, 1, 1], [FW - 1, 0, -1, 1], [0, FH - 1, 1, -1], [FW - 1, FH - 1, -1, -1]].forEach(([a, b, sx, sy]) => { // Akanthus-Ecken
      ell(a + sx * 7, b + sy * 7, 6, 6, (X, y, q) => R(q < 0.25 ? '#fce0a8' : q < 0.6 ? '#c89020' : '#5c4010', X, y));
      for (let k = 0; k < 9; k++) { R('#f8d878', a + sx * (12 + k), b + sy * (3 + Math.round(Math.sin(k * 0.8) * 2)), 1, 1); R('#f8d878', a + sx * (3 + Math.round(Math.sin(k * 0.8) * 2)), b + sy * (12 + k), 1, 1); }
    });
    // Kartusche oben: Schädel mit Fledermausflügeln
    for (let k = 0; k < 16; k++) { const h = Math.round(Math.sin(k / 15 * Math.PI) * 5); R('#3c2804', cx - 9 - k, 2 + (k >> 2), 1, 4 + h); R('#c89020', cx - 9 - k, 2 + (k >> 2), 1, 1); R('#3c2804', cx + 8 + k, 2 + (k >> 2), 1, 4 + h); R('#c89020', cx + 8 + k, 2 + (k >> 2), 1, 1); }
    ell(cx, 7, 8, 7, (X, y, q) => R(q < 0.4 ? '#fce0a8' : q < 0.8 ? '#e0c060' : '#5c4010', X, y));
    R('#2c1c04', cx - 4, 6, 3, 3); R('#2c1c04', cx + 1, 6, 3, 3); R('#a80020', cx - 3, 7, 1, 1); R('#a80020', cx + 2, 7, 1, 1); R('#2c1c04', cx - 1, 10, 2, 1); for (let k = -3; k <= 3; k += 2) R('#2c1c04', cx + k, 12, 1, 2);
    // Namensschild unten
    R('#3c2804', cx - 16, FH - 15, 32, 8); R('#c89020', cx - 15, FH - 14, 30, 6); R('#f8d878', cx - 15, FH - 14, 30, 1);
    for (let k = -12; k <= 11; k += 2) R('#5c4010', cx + k, FH - 12 + (k % 4 ? 0 : 1), 1, 2);
    if (v === 0) for (let y = 0; y < 44; y++) R('#06040a', 18 + y * 0.55, 74 + y * 0.6, 1, 1); // Riss in der Leinwand
    return c;
  };
  // Augen: linke obere Ecke der Augäpfel (6×4), Mund: Mitte und Höhe
  return { FW, FH, art: [mk(0), mk(1), mk(2)], eyes: [[cx - 11, fy - 2], [cx + 5, fy - 2]], mouth: [cx, fy + 14] };
})();
class Portrait extends Ent {
  // d: wx, wy = Lage in der Wandebene (Parallaxe 0.5, wiederholt sich alle 512 px wie Fenster und Vorhänge), v = erstes Motiv;
  // jede Wiederholung zeigt den nächsten Ahnen. Die Pupillen folgen dem Helden; steht er davor, erwacht das Bild.
  constructor(d) { super(0, 0, 1, 1); this.kind = 'prop'; this.wx = d.wx; this.wy = d.wy; this.v = d.v || 0; this.once = !!d.once; this.glow = 0; this.rects = []; this.tear = 0; }
  place() {
    const L = Tiles.layer(W.room.theme, 'wall'), cam = W.cam, out = [], P = PORTRAITS;
    if (!L) return out;
    const Hc = L.c.height, off = ((Math.floor(cam.x * 0.5) % 512) + 512) % 512, base = Math.floor(Math.floor(cam.x * 0.5) / 512);
    const oy = L.vtile && W.room.h > 13 ? ((Math.floor(cam.y * 0.5) % Hc) + Hc) % Hc : 0;
    for (let k = -1; k <= Math.ceil(View.w / 512) + 1; k++) for (const ty of oy ? [-oy, Hc - oy] : [0]) {
      const X = this.wx - off + k * 512, Y = this.wy + ty;
      if (X > View.w || X + P.FW < 0 || Y > 208 || Y + P.FH < 0 || (this.once && base + k !== 0)) continue;
      out.push([X, Y, (((this.v + base + k) % 3) + 3) % 3]);
    }
    return out;
  }
  update() {
    this.t++; this.rects = this.place();
    const px = W.player.cx - W.cam.x, near = this.rects.some(([X]) => Math.abs(px - (X + PORTRAITS.FW / 2)) < 46);
    this.glow = near ? Math.min(40, this.glow + 1) : Math.max(0, this.glow - 1);
    this.tear = this.glow > 24 ? Math.min(14, this.tear + 0.12) : Math.max(0, this.tear - 0.3);
    if (this.glow === 25 && near) Audio8.sfx('growl', W.player.cx);
  }
  lights(L) { // die Augen schimmern im Dunkeln
    for (const [X, Y, v] of this.rects) { const red = v === 2 || this.glow > 20; for (const [ex, ey] of PORTRAITS.eyes) L.push({ x: X + ex + 3, y: Y + ey + 2, r: red ? 16 : 10, c: red ? [232, 30, 30] : [210, 200, 180], a: red ? 0.5 : 0.3 }); }
  }
  draw() {}
  drawBack(ctx) {
    const P = PORTRAITS, px = W.player.cx - W.cam.x, py = W.player.cy - 8 - W.cam.y, red = this.glow > 20;
    for (const [X, Y, v] of this.rects) {
      ctx.drawImage(P.art[v], X, Y);
      const hot = red || v === 2;
      for (const [ex, ey] of P.eyes) { // Augäpfel mit Pupillen, die dem Helden folgen
        const dx = px - (X + ex + 3), dy = py - (Y + ey + 2), l = Math.hypot(dx, dy) || 1, ox = Math.round(dx / l * 2), oy = Math.round(dy / l * 1);
        ctx.fillStyle = hot ? '#e8c8c0' : '#ece8dc'; ctx.fillRect(X + ex + 1, Y + ey, 4, 4); ctx.fillRect(X + ex, Y + ey + 1, 6, 2);
        ctx.fillStyle = hot ? '#d81c1c' : '#2c1c14'; ctx.fillRect(X + ex + 2 + ox, Y + ey + 1 + oy, 2, 2);
        ctx.fillStyle = hot ? '#fcd0a0' : '#000'; ctx.fillRect(X + ex + 2 + ox + (red ? 0 : 1), Y + ey + 1 + oy, 1, red ? 2 : 1); // Schlitzpupille, wenn das Bild erwacht
        if (this.tear > 0.5) { ctx.fillStyle = '#8c0010'; ctx.fillRect(X + ex + 1, Y + ey + 4, 1, Math.round(this.tear)); ctx.fillStyle = '#d81c1c'; ctx.fillRect(X + ex + 1, Y + ey + 3 + Math.round(this.tear), 1, 1); } // Bluttränen
      }
      if (red) { // Fanggrinsen
        const [mx, my] = P.mouth, k = Math.min(1, (this.glow - 20) / 12);
        ctx.fillStyle = '#1c0408'; ctx.fillRect(X + mx - 6, Y + my - 1, 12, 1 + Math.round(k * 3)); ctx.fillRect(X + mx - 7, Y + my - 2, 2, 1); ctx.fillRect(X + mx + 5, Y + my - 2, 2, 1);
        ctx.fillStyle = '#fcfcf0'; ctx.fillRect(X + mx - 4, Y + my - 1, 1, 1 + Math.round(k * 2)); ctx.fillRect(X + mx + 3, Y + my - 1, 1, 1 + Math.round(k * 2));
        ctx.fillStyle = '#a80020'; ctx.fillRect(X + mx - 3, Y + my + Math.round(k * 2), 6, 1);
      }
    }
  }
}

// ---------------- Ritterrüstung (größer, detailreicher): Topfhelm mit Federbusch, Schulterlamellen, Harnisch mit Grat ----------------
// Deko-Rüstungen stützen die Hände auf einen Bidenhänder; erwachte Rüstungen marschieren mit Hellebarde los.
const ARMOR_SPR = (() => {
  const M = ['#14141c', '#2c2c38', '#4c4c5c', '#70707e', '#9696a4', '#bcbcc8', '#e4e4ee'];
  const mk = (walk, weapon) => {
    const c = Sprites.canvas(30, 58), x = c.getContext('2d'), O = 3, Y0 = 4;
    const R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(O + a, Y0 + b, w, h); };
    const cyl = (x0, y0, w, h, lo = 1, hi = 6) => { for (let i = 0; i < w; i++) { const t = w > 1 ? i / (w - 1) : 0.5, k = Math.round(lo + (hi - lo) * Math.max(0, 1 - Math.abs(t - 0.35) * 2.1)); R(M[k], x0 + i, y0, 1, h); } };
    if (weapon === 'halberd') { R('#3c2410', 22, -4, 2, 56); R('#5c3818', 22, -4, 1, 56); R(M[5], 20, -4, 6, 6); R(M[6], 20, -4, 6, 1); R(M[3], 25, -2, 2, 3); R(M[6], 22, -8, 2, 4); } // Hellebarde
    R('#7c0818', 9, -4, 3, 2); R('#a81020', 8, -3, 4, 3); R('#d82838', 10, -4, 2, 1); R('#7c0818', 6, -2, 3, 3); R('#a81020', 5, 0, 3, 3); R('#5c0410', 4, 2, 2, 2); // Federbusch
    cyl(7, 0, 9, 11, 1, 6); R(M[1], 7, 0, 9, 1); R(M[0], 7, 5, 9, 1); R(M[6], 9, 1, 2, 3); // Topfhelm mit Sehschlitz
    R(M[0], 12, 7, 1, 1); R(M[0], 13, 8, 1, 1); R(M[0], 12, 9, 1, 1); R(M[0], 14, 7, 1, 1); R(M[0], 14, 9, 1, 1); // Atemlöcher
    cyl(8, 11, 7, 2, 1, 4); // Halsberge
    for (let k = 0; k < 3; k++) { cyl(0 + k, 12 + k * 2, 8 - k, 2, 1, 5); R(M[0], k, 13 + k * 2, 8 - k, 1); cyl(15, 12 + k * 2, 8 - k, 2, 1, 5); R(M[0], 15, 13 + k * 2, 8 - k, 1); } // Schulterlamellen
    R(M[6], 2, 12, 2, 1); R(M[6], 17, 12, 2, 1);
    cyl(6, 12, 11, 13, 1, 6); R(M[6], 11, 14, 1, 9); R(M[5], 8, 13, 7, 1); R(M[1], 6, 22, 11, 1); R(M[2], 6, 24, 11, 1); // Brustharnisch mit Grat
    for (let k = 0; k < 4; k++) { cyl(5, 25 + k * 2, 13, 2, 1, 5); R(M[0], 5, 26 + k * 2, 13, 1); } // Bauchreifen, Beintaschen
    for (const [ax, d] of [[1, 1], [19, -1]]) { // Arme
      cyl(ax, 18, 3, 6, 1, 5); R(M[5], ax, 24, 3, 2); R(M[6], ax + 1, 24, 1, 1);
      for (let k = 0; k < 4; k++) cyl(ax + d * (k + 1), 26 + k, 3, 1, 1, 5);
    }
    cyl(7, 29, 9, 3, 2, 6); R(M[0], 7, 31, 9, 1); // Panzerhandschuhe
    const legs = walk === 0 ? [[6, 0], [13, 0]] : walk === 1 ? [[5, 2], [14, 0]] : [[7, 0], [12, 2]];
    legs.forEach(([lx, lift]) => { cyl(lx, 33, 4, 7, 1, 5); R(M[6], lx + 1, 40, 2, 2); R(M[3], lx, 42, 4, 1); cyl(lx, 43 - lift, 4, 6, 1, 5); R(M[2], lx - 1, 49 - lift, 6, 2); R(M[4], lx - 1, 49 - lift, 6, 1); R(M[0], lx + 4, 50 - lift, 1, 1); });
    if (weapon === 'sword') { R('#c89020', 10, 26, 3, 3); R('#5c3414', 11, 28, 1, 2); R('#c89020', 5, 32, 13, 2); R('#fce0a8', 5, 32, 13, 1); R('#d8d8e4', 10, 34, 3, 16); R('#9c9cac', 12, 34, 1, 16); R('#d8d8e4', 11, 50, 1, 2); } // Bidenhänder
    return Sprites.fromCanvas(c, false);
  };
  return { still: mk(0, 'sword'), walk: [mk(1, 'halberd'), mk(0, 'halberd'), mk(2, 'halberd'), mk(0, 'halberd')] };
})();

// Erwachte Rüstung: marschiert mit Hellebarde, glühende Augen im Sehschlitz
class LivingArmor extends Knight {
  constructor(tx, ty) { super(tx, ty); this.w = 16; this.h = 50; this.x = tx * T; this.y = (ty + 1) * T - this.h; this.hp = 6; this.score = 600; }
  draw(ctx) {
    const s = ARMOR_SPR.walk[Math.floor(this.t / 10) % 4], fl = this.face < 0;
    const X = Math.round(this.cx - 15 - W.cam.x), Y = Math.round(this.y + this.h - 54 - W.cam.y);
    this.ds(ctx, s, X, Y, fl, this.flash);
    ctx.fillStyle = (this.t >> 3) % 2 ? '#fc3c3c' : '#fc8c3c'; // Augen im Sehschlitz
    for (const ex of fl ? [17, 14] : [12, 15]) ctx.fillRect(X + ex, Y + 9, 1, 1);
  }
}

// ---------------- Schleimkokon (Seelenstrudel): darin ein Skelett – es bricht aus, sobald der Held näher kommt ----------------
class Cocoon extends Enemy {
  constructor(tx, ty, inner = 'skel') { super(tx * T - 2, (ty + 1) * T - 30, 20, 30, 3, 1, 200); this.inner = inner; this.state = 'still'; this.wt = 0; this.tx = tx; this.ty = ty; }
  update() {
    super.update();
    const p = W.player;
    if (this.state === 'still') {
      if (this.t % 50 === 0 && Math.random() < 0.5) W.spawn(new Particle(this.cx + rnd(-6, 6), this.y + this.h - 2, 0, 0.3, '#58d860', 40, 1, 0.05)); // tropft
      if (p.alive && Math.abs(p.cx - this.cx) < 76 && Math.abs(p.cy - this.cy) < 70) { this.state = 'crack'; this.wt = 0; Audio8.sfx('slime', this.cx); }
    } else if (this.state === 'crack' && ++this.wt > 34) this.burst(true);
    this.touch();
  }
  burst(release) {
    this.dead = true;
    Audio8.sfx('splat', this.cx); W.shake = Math.max(W.shake, 3);
    for (let i = 0; i < 18; i++) W.spawn(new Particle(this.cx + rnd(-8, 8), this.cy + rnd(-10, 10), rnd(-2.4, 2.4), rnd(-3.2, -0.6), i % 3 ? '#58d860' : '#a8fc98', 46, 2, 0.18)); // Schleimspritzer
    if (!release) return;
    if (this.inner === 'bat') { for (const s of [-1, 1]) { const b = W.spawn(new Bat(this.tx + s * 0.4, this.ty - 1)); b.state = 'fly'; b.dir = s; b.face = s; b.baseY = b.y; } }
    else { const k = W.spawn(new Skeleton(this.tx, this.ty)); k.throwCD = 50; }
  }
  kill(silent) { super.kill(silent); this.burst(false); } // vorher zerschlagen: das Skelett darin zerfällt mit
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), sh = this.state === 'crack' ? Math.round(Math.sin(this.wt * 1.9) * (1 + this.wt / 18)) : 0;
    const pulse = Math.sin(this.t * 0.06) * 1.2, cx = x + 10 + sh, cy = y + 16;
    ctx.fillStyle = 'rgba(40,120,50,0.5)'; ctx.fillRect(x - 3, y + 28, 26, 2); ctx.fillRect(x, y + 27, 20, 1); // Schleimpfütze
    for (let yy = 0; yy < 30; yy++) { // Kokon: zähe, durchscheinende Masse
      const t = yy / 29, w = Math.round((Math.sin(t * Math.PI) * 9 + 2 + (yy > 22 ? 2 : 0)) * (1 + pulse * 0.04));
      ctx.fillStyle = yy < 3 ? 'rgba(120,230,110,0.55)' : 'rgba(70,190,80,0.5)'; ctx.fillRect(cx - w, y + yy, w * 2, 1);
      ctx.fillStyle = 'rgba(20,80,30,0.5)'; ctx.fillRect(cx - w, y + yy, 1, 1); ctx.fillRect(cx + w - 1, y + yy, 1, 1);
    }
    ctx.fillStyle = 'rgba(20,40,20,0.75)'; // Schatten des Gefangenen: Schädel, Rippen, Arme
    if (this.inner === 'bat') { ctx.fillRect(cx - 7, cy - 4, 14, 3); ctx.fillRect(cx - 2, cy - 6, 4, 8); }
    else { ctx.fillRect(cx - 3, y + 5, 6, 5); ctx.fillRect(cx - 1, y + 10, 2, 12); for (let k = 0; k < 3; k++) ctx.fillRect(cx - 4, y + 12 + k * 3, 8, 1); ctx.fillRect(cx - 6, y + 12, 2, 8); ctx.fillRect(cx + 4, y + 12, 2, 8); ctx.fillRect(cx - 3, y + 22, 2, 6); ctx.fillRect(cx + 1, y + 22, 2, 6); }
    ctx.fillStyle = this.state === 'crack' && (this.wt & 4) ? '#fc3c3c' : 'rgba(250,60,60,0.7)'; ctx.fillRect(cx - 2, y + 7, 1, 1); ctx.fillRect(cx + 1, y + 7, 1, 1); // Augen
    ctx.fillStyle = 'rgba(230,255,220,0.8)'; ctx.fillRect(cx - 5, y + 6, 1, 3); ctx.fillRect(cx - 6, y + 10, 1, 2); ctx.fillRect(cx + 3, y + 4, 2, 1); // Glanz
    if (this.state === 'crack') { ctx.fillStyle = '#a8fc98'; for (let k = 0; k < Math.min(6, this.wt / 5); k++) ctx.fillRect(cx - 6 + ((k * 5) % 12), y + 4 + k * 4, 2, 1); } // Risse
    if (this.flash) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(x, y, 20, 30); }
  }
}

// ---------------- Grotte: großer Wasserfall – halbtransparenter, strömender Wasservorhang (SNES-Farbmathematik, der Fels
// scheint durch), die Strähnen wellen sich; am Fuß transparente Gischtwolken, die auch vor dem Helden aufsteigen ----------------
class Waterfall extends Ent {
  constructor(d) { super(d.x * T - d.w / 2, d.y0 * T, d.w, (d.y1 - d.y0) * T); this.kind = 'prop'; }
  update() {
    this.t++;
    if (this.t % 2 === 0 && this.onScreen(30)) W.spawn(new Particle(this.x + rnd(0, this.w), this.y + this.h - 3, rnd(-1.4, 1.4), -rnd(0.8, 2.4), Math.random() < 0.5 ? '#c8e8fc' : '#7cb4e8', 30, 1, 0.12)); // Spritzer
    if (this.t % 40 === 0 && this.onScreen(0)) Audio8.drip(this.cx, 0.5);
  }
  lights(L, cx, cy) { L.push({ x: this.cx - cx, y: this.y + this.h - 12 - cy, r: 56, c: [100, 160, 230], a: 0.35 }); L.push({ x: this.cx - cx, y: this.y + this.h * 0.4 - cy, r: 40, c: [90, 140, 220], a: 0.2 }); }
  draw() {}
  drawBack(ctx) {
    const X = Math.round(this.x - W.cam.x), Y = Math.round(this.y - W.cam.y), w = this.w, h = this.h;
    if (X > View.w || X + w < 0) return;
    const y0 = Math.max(0, Y), y1 = Math.min(208, Y + h);
    if (y1 <= y0) return;
    ctx.fillStyle = 'rgba(50,110,190,0.34)'; ctx.fillRect(X, y0, w, y1 - y0); // Grundschleier
    for (let i = 0; i < w; i++) { // Strähnen strömen abwärts, jede Spalte mit eigenem Tempo, seitlich leicht gewellt
      const sp = 2.2 + (i % 5) * 0.4, wob = Math.round(Math.sin(this.t * 0.05 + i * 0.4) * 0.6);
      for (let k = 0; k < 4; k++) {
        const len = 10 + ((i * 7 + k * 13) % 20), yy = ((i * 31 + k * 57 + this.t * sp) % (h + len)) - len, sy = Y + yy;
        if (sy + len < y0 || sy > y1) continue;
        ctx.fillStyle = (i + k) % 3 === 0 ? 'rgba(236,250,255,0.55)' : 'rgba(170,214,248,0.38)';
        ctx.fillRect(X + i + wob, Math.round(sy), 1, len);
      }
    }
    ctx.fillStyle = 'rgba(230,248,255,0.55)'; ctx.fillRect(X, y0, 1, y1 - y0); ctx.fillRect(X + w - 1, y0, 1, y1 - y0); // Ränder
    const B = Y + h; ctx.fillStyle = 'rgba(220,240,255,0.5)'; for (let i = -6; i < w + 6; i += 2) ctx.fillRect(X + i, B - 2 - ((i * 7 + this.t) % 5), 2, 3); // Schaum am Wasserspiegel
  }
  drawFront(ctx) {
    const X = this.x - W.cam.x, B = this.y + this.h - W.cam.y;
    if (X > View.w + 40 || X + this.w < -40 || B < -40 || B > 280) return;
    for (let k = 0; k < 10; k++) {
      const ph = (this.t * 0.55 + k * 23) % 64, r = 6 + ph * 0.35, cx = X + this.w / 2 + Math.sin(k * 2.1 + this.t * 0.01) * (this.w * 0.5 + ph * 0.5), cy = B - 4 - ph * 0.8;
      ctx.fillStyle = `rgba(200,226,250,${(0.2 * (1 - ph / 64)).toFixed(3)})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.5, r, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// Hinweistafel: betritt der Held den Bereich, erscheint einmal ein kurzer Tipp (Wandsprung, Kante, Dash)
class Hint extends Ent {
  constructor(d) { super(d.x * T, d.y * T, (d.w || 2) * T, (d.h || 3) * T); this.kind = 'prop'; this.key = d.key; this.done = false; }
  update() { if (!this.done && W.player.alive && Phys.overlap(W.player, this)) { this.done = true; Game.note(this.key); } }
  draw() {}
}

// ---------------- Brücke zum Bergfried: Einsturz und Fledermausschwarm ----------------
// Sobald der Held die Brücke betritt, bricht sie hinter ihm Stein für Stein weg; die Front folgt ihm (nie mehr als
// 150 px zurück), ein Fledermausschwarm reitet auf ihr. Wer stürzt, landet am letzten Kontrollpunkt, die Brücke
// davor steht wieder. Am Torhaus des Bergfrieds stürzt der Rest in die Tiefe, der Schwarm stiebt davon.
class BridgeRun extends Ent {
  constructor(d) {
    super(0, 0, 1, 1); this.kind = 'prop';
    this.row = d.row; this.x0 = d.x0; this.x1 = d.x1; this.end = d.end * T;
    this.safes = d.safe.map(([c, r]) => ({ cx: c * T, feet: r * T }));
    this.saved = W.room.grid[d.row].slice(); this.on = false; this.over = false; this.fx = d.x0 * T - 40; this.safe = this.safes[0];
    this.swarm = null; this.fell = undefined; this.speed = 1.2;
  }
  update() {
    const p = W.player; this.t++;
    if (!this.on) { if (p.alive && p.cx > (this.x0 + 2) * T) this.begin(); return; }
    for (const s of this.safes) if (s.cx > this.safe.cx && p.cx > s.cx + 20 && p.onGround) this.safe = s; // Kontrollpunkt erreicht
    if (!this.over) p.lastSafe = { cx: this.safe.cx, feet: this.safe.feet };
    if (p.fellAt !== this.fell) { this.fell = p.fellAt; this.reset(); } // abgestürzt: zurück zum Kontrollpunkt
    if (this.wait && (p.cx > this.safe.cx + 24 || this.over)) this.wait = false; // nach einem Absturz geht es erst weiter, wenn der Held losläuft
    if (p.alive && !this.wait) this.fx += this.over ? 5 : this.speed;
    if (!this.over && p.alive && this.fx < p.cx - 150) this.fx = p.cx - 150;
    const g = W.room.grid[this.row];
    for (let c = this.x0; c <= this.x1; c++) if (g[c] === '=' && (c + 1) * T < this.fx) {
      g[c] = '.'; W.platforms.push(W.spawn(new BridgeBlock(c, this.row)));
      if (c % 2 === 0) Audio8.sfx('crumble', c * T);
    }
    if (this.t % 60 === 0) W.platforms = W.platforms.filter(pl => !pl.dead);
    if (!this.over && p.cx > this.end) { this.over = true; if (this.swarm) this.swarm.leave = true; W.shake = 10; Audio8.sfx('boom'); Input.rumble(0.7, 0.5, 600); }
  }
  begin() {
    this.on = true; this.fell = W.player.fellAt;
    Game.shout('bridgeFalls'); Audio8.sfx('boom'); Input.rumble(0.8, 0.6, 700); W.shake = 12;
    this.swarm = W.spawn(new BatSwarm(this));
  }
  reset() { // zurück zum Kontrollpunkt: Brücke ab dort wieder ganz, Front und Schwarm dahinter
    const g = W.room.grid[this.row];
    for (let c = this.x0; c <= this.x1; c++) if (c * T >= this.safe.cx - 40) g[c] = this.saved[c];
    for (const e of W.ents) if (e instanceof BridgeBlock) e.dead = true;
    W.platforms = W.platforms.filter(pl => !(pl instanceof BridgeBlock));
    this.fx = this.safe.cx - 90; this.wait = true;
    if (this.swarm) this.swarm.x = this.fx - 40;
  }
  draw() {}
}

class BridgeBlock extends Ent {
  constructor(c, r) {
    super(c * T, r * T, T, T); this.kind = 'platform'; this.state = 'shake'; this.timer = 12 + (c % 3) * 4;
    this.vy = 0; this.rot = 0; this.spin = (Math.random() - 0.5) * 0.14; this.dx = 0; this.dy = 0; this.img = Tiles.build('bridge').alt[c % 3];
  }
  get solid() { return this.state === 'shake'; }
  update() {
    this.t++;
    if (this.state === 'shake') { if (--this.timer <= 0) { this.state = 'fall'; W.debris(this.cx, this.y + 4, '#6c6488', 4); } }
    else { this.vy = Math.min(this.vy + 0.28, 6); this.y += this.vy; this.rot += this.spin; if (this.y > W.room.h * T + 40) this.dead = true; }
  }
  draw(ctx) {
    const sh = this.state === 'shake' ? ((this.t >> 1) % 2 ? 1 : -1) : 0, X = Math.round(this.x - W.cam.x) + sh, Y = Math.round(this.y - W.cam.y);
    if (X < -24 || X > View.w + 24) return;
    if (!this.rot) { ctx.drawImage(this.img, X, Y); return; }
    ctx.save(); ctx.translate(X + 8, Y + 8); ctx.rotate(this.rot); ctx.drawImage(this.img, -8, -8); ctx.restore();
  }
}

// Fledermausschwarm: Dutzende kleine Fledermäuse kreisen um einen dunklen Kern, der auf der Einsturzfront reitet.
// Berührt der Kern den Helden, kostet das Leben; immer wieder löst sich eine Fledermaus und stößt herab.
class BatSwarm extends Ent {
  constructor(run) {
    super(run.fx - 60, 0, 1, 1); this.kind = 'fx'; this.run = run; this.leave = false; this.cy0 = 9 * T - 44; this.relT = 120;
    this.bats = Array.from({ length: View.lite ? 30 : 56 }, () => ({ a: Math.random() * 6.28, r: 6 + Math.random() * 34, s: 0.05 + Math.random() * 0.07, ph: Math.random() * 6.28, dy: (Math.random() - 0.5) * 40, big: Math.random() < 0.3 }));
  }
  update() {
    this.t++;
    const p = W.player;
    if (this.leave) { this.cy0 -= 2.4; this.x += 1.6; if (this.cy0 < W.cam.y - 140) this.dead = true; return; }
    this.x += (this.run.fx + 6 - this.x) * 0.08;
    this.cy0 += (9 * T - 42 + Math.sin(this.t * 0.05) * 14 + clamp(p.cy - 9 * T + 40, -24, 24) * 0.6 - this.cy0) * 0.1;
    if (p.alive && Phys.overlap(p, { x: this.x - 24, y: this.cy0 - 22, w: 44, h: 42 })) p.hurt(2, this.x - 40);
    if (--this.relT <= 0 && p.alive) { // eine Fledermaus löst sich
      this.relT = 100 + Math.random() * 80;
      const b = new Bat(this.x / T, (this.cy0 - 8) / T); b.state = 'fly'; b.dir = 1; b.face = 1; b.baseY = b.y; b.t = 0;
      W.spawn(b); Audio8.sfx('bat', this.x);
    }
    if (this.t % 14 === 0) Audio8.sfx('flap', this.x);
  }
  draw(ctx) {
    const ox = Math.round(this.x - W.cam.x), oy = Math.round(this.cy0 - W.cam.y);
    if (ox < -80 || ox > View.w + 80) return;
    ctx.fillStyle = 'rgba(14,0,22,0.42)'; ctx.beginPath(); ctx.ellipse(ox, oy, 34, 24, 0, 0, Math.PI * 2); ctx.fill(); // dunkler Kern
    ctx.fillStyle = 'rgba(14,0,22,0.3)'; ctx.beginPath(); ctx.ellipse(ox - 10, oy + 2, 48, 30, 0, 0, Math.PI * 2); ctx.fill();
    for (const b of this.bats) {
      b.a += b.s;
      const x = Math.round(ox + Math.cos(b.a) * b.r * 1.4), y = Math.round(oy + Math.sin(b.a * 1.7 + b.ph) * b.r * 0.6 + b.dy * 0.45);
      const up = Math.sin(this.t * 0.7 + b.ph) > 0, dir = Math.sin(b.a) > 0 ? 1 : -1, s = b.big ? 2 : 1;
      ctx.fillStyle = '#08020c'; ctx.fillRect(x - s, y, 2 * s + 1, 2 + (s - 1)); // Leib
      if (up) { ctx.fillRect(x - 3 - 2 * s, y - 1 - s, 2 + s, 1 + (s - 1)); ctx.fillRect(x + 2 + s - 1, y - 1 - s, 2 + s, 1 + (s - 1)); ctx.fillRect(x - 1 - s, y - 1, 1, 1); ctx.fillRect(x + 1 + s, y - 1, 1, 1); }
      else { ctx.fillRect(x - 3 - 2 * s, y + 1, 2 + s, 1 + (s - 1)); ctx.fillRect(x + 2 + s - 1, y + 1, 2 + s, 1 + (s - 1)); }
      ctx.fillStyle = '#5c2c6c'; ctx.fillRect(x - s, y, 1, 1); // Mondlicht auf dem Fell
      ctx.fillStyle = '#fc3c3c'; ctx.fillRect(x + (dir > 0 ? s : -s), y, 1, 1); // Augen glühen
    }
  }
}

// ---------------- Schleimkokons in der Wand der drehenden Röhre (Seelenstrudel) ----------------
// Wie in Super Castlevania IV gehören sie zur Mode-7-Wand: sie drehen sich mit der Röhre, sind hinten klein und dunkel,
// vorn oben/unten groß. Kommt ein Kokon auf der nahen Wand dicht am Helden vorbei, platzt er – heraus bricht ein Skelett
// (fällt auf die Steine) oder ein Fledermauspaar. Danach bleibt die aufgerissene Hülle in der Wand.
const TUBE_COCOON = (() => {
  const mk = (broken) => {
    const c = Sprites.canvas(18, 28), x = c.getContext('2d'), R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    for (let y = 0; y < 28; y++) for (let X = 0; X < 18; X++) {
      const q = ((X - 8.5) / 8.5) ** 2 + ((y - 14) / 13.5) ** 2;
      if (q > 1) continue;
      if (broken && q < 0.55 && y > 6) { R(q < 0.3 ? '#0c140c' : '#1c2c1c', X, y); continue; } // aufgerissen, dunkles Inneres
      R(q > 0.82 ? '#1c4c2c' : q > 0.55 ? '#2c7c48' : (X + y) % 5 === 0 ? '#58c878' : '#3c9c5c', X, y);
    }
    if (!broken) { // Skelett schimmert durch
      R('#d8d0b8', 7, 6, 4, 4); R('#1c1c14', 7, 7, 1, 1); R('#1c1c14', 10, 7, 1, 1); for (let k = 0; k < 4; k++) R('#c8c0a8', 6, 12 + k * 2, 6, 1); R('#c8c0a8', 8, 11, 2, 9);
      R('rgba(170,252,190,0.7)', 4, 4, 2, 6); R('rgba(170,252,190,0.5)', 12, 8, 1, 10); // Schleimglanz
    } else { R('#58c878', 2, 5, 3, 1); R('#58c878', 13, 6, 3, 1); R('#2c7c48', 4, 24, 10, 2); }
    return c;
  };
  return { whole: mk(false), broken: mk(true) };
})();
class TubeCocoons extends Ent {
  constructor(d) { super(0, 0, 1, 1); this.kind = 'prop'; this.list = d.list.map(([u, v, inner]) => ({ u, v, inner: inner || 'skel', open: false })); }
  update() {
    this.t++;
    const p = W.player; if (!p.alive) return;
    const px = p.cx - W.cam.x, py = p.cy - W.cam.y;
    for (const c of this.list) {
      if (c.open) continue;
      const P = Mode7.tubeProject(c.u, c.v, View.w, W.frame, W.cam.x);
      if (!P || P.near < 0.5) continue;
      if (Math.hypot(P.x - px, P.y - py) < 70) this.burst(c, P);
    }
  }
  burst(c, P) {
    c.open = true;
    const wx = W.cam.x + P.x, wy = W.cam.y + P.y;
    Audio8.sfx('slime', wx); Audio8.sfx('splat', wx); W.shake = Math.max(W.shake, 4);
    for (let i = 0; i < 22; i++) W.spawn(new Particle(wx + rnd(-10, 10), wy + rnd(-12, 12), rnd(-2.6, 2.6), rnd(-3, 1), i % 3 ? '#58d860' : '#a8fc98', 46, 2, 0.18));
    if (c.inner === 'bat') { for (const s of [-1, 1]) { const b = W.spawn(new Bat(wx / T + s * 0.4, wy / T)); b.state = 'fly'; b.dir = s; b.face = s; b.baseY = b.y; } }
    else { const k = W.spawn(new Skeleton(wx / T, Math.min(wy, (W.room.h - 4) * T) / T)); k.throwCD = 60; k.vy = -1; }
  }
  draw() {}
  drawBack(ctx) {
    for (const c of this.list) {
      const P = Mode7.tubeProject(c.u, c.v, View.w, W.frame, W.cam.x);
      if (!P) continue;
      const img = c.open ? TUBE_COCOON.broken : TUBE_COCOON.whole, k = 1.5, w = 18 * P.sx * k, h = 28 * P.sy * k;
      if (P.x + w < 0 || P.x - w > View.w) continue;
      ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 0.45 + 0.55 * P.near; // hinten im Dunst
      ctx.translate(Math.round(P.x), Math.round(P.y)); if (P.top) ctx.scale(1, -1); // an der Decke kopfüber
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
  }
}

// ---------------- Tutorial auf dem Achterschiff ----------------
// Jede Station ist ein Bereich: steht der Held darin, zeigt eine Tafel oben im Bild den Move und die Tasten für das gerade
// benutzte Gerät (Tastatur, Xbox-Controller, Touch) – wechselt man das Gerät, wechseln die Tasten sofort mit.
// An Deck steht ein kleines Holzschild mit Fragezeichen.
const TUT_BTN = {
  keys: { MOVE: '← →', DOWN: '↓', UP: '↑', JUMP: 'Z', ATK: 'X', SUB: 'C', DASH: 'SHIFT', PAUSE: 'ENTER' },
  pad: { MOVE: 'STICK', DOWN: '↓', UP: '↑', JUMP: 'A', ATK: 'X', SUB: 'Y', DASH: 'RB', PAUSE: 'MENU' },
  touch: { MOVE: 'STICK', DOWN: '↓', UP: '↑', JUMP: 'A', ATK: 'B', SUB: 'SUB', DASH: 'DASH', PAUSE: 'II' },
};
class TutorialSign extends Ent {
  constructor(d) { super(d.x * T, d.y * T, d.w * T, d.h * T); this.kind = 'prop'; this.key = d.key; this.a = 0; }
  update() {
    const inside = W.player.alive && Phys.overlap(W.player, this);
    if (inside && W.tutSign !== this) { if (W.tutSign) W.tutSign.a = 0; W.tutSign = this; Audio8.sfx('select'); }
    this.a = clamp(this.a + (inside ? 0.12 : -0.05), 0, 1);
  }
  title() { return tr('tut.' + this.key + 'T'); }
  text() { const b = TUT_BTN[Input.device] || TUT_BTN.keys; return tr('tut.' + this.key).replace(/\{([A-Z]+)\}/g, (_, k) => b[k] || k); }
  draw(ctx) { // Holzschild an Deck
    const x = Math.round(this.x + 6 - W.cam.x), y = Math.round(this.y + this.h - W.cam.y);
    if (x < -20 || x > View.w + 20) return;
    ctx.fillStyle = '#2c1808'; ctx.fillRect(x + 4, y - 11, 3, 11);
    ctx.fillStyle = '#2c1808'; ctx.fillRect(x - 1, y - 21, 13, 11);
    ctx.fillStyle = '#6c4420'; ctx.fillRect(x, y - 20, 11, 9); ctx.fillStyle = '#9c6c34'; ctx.fillRect(x, y - 20, 11, 1);
    Font.draw(ctx, '?', x + 3, y - 19, this === W.tutSign && this.a > 0.5 ? '#fcfcfc' : '#f8d878');
  }
}

// Durchschlupf: eine Kachel hohe Öffnung (Luke unter der Kajüte, Mauerdurchbruch) – dunkel mit Rahmen, damit man sieht,
// dass man hier hindurchrutschen kann
class Crawl extends Ent {
  constructor(d) { super(d.x0 * T, d.row * T, (d.x1 - d.x0 + 1) * T, T); this.kind = 'prop'; this.stone = d.style === 'stone'; }
  draw(ctx) {
    const X = Math.round(this.x - W.cam.x), Y = Math.round(this.y - W.cam.y), w = this.w;
    if (X > View.w || X + w < 0) return;
    const g = ctx.createLinearGradient(X, 0, X + w, 0); g.addColorStop(0, '#000000'); g.addColorStop(0.15, '#0a0606'); g.addColorStop(0.85, '#0a0606'); g.addColorStop(1, '#000000');
    ctx.fillStyle = g; ctx.fillRect(X, Y, w, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(X, Y + 16, w, 2);
    if (this.stone) { // gemauerter Bogen mit Schlussstein
      ctx.fillStyle = '#4c4858'; ctx.fillRect(X - 2, Y - 2, w + 4, 3); ctx.fillStyle = '#8c88a0'; ctx.fillRect(X - 2, Y - 2, w + 4, 1);
      for (let k = 0; k < w; k += 8) { ctx.fillStyle = '#2c2838'; ctx.fillRect(X + k, Y - 2, 1, 3); }
      ctx.fillStyle = '#6c6880'; ctx.fillRect(X + w / 2 - 3, Y - 4, 6, 5);
      for (const s of [X - 3, X + w]) { ctx.fillStyle = '#3c3848'; ctx.fillRect(s, Y, 3, 16); ctx.fillStyle = '#7c788c'; ctx.fillRect(s, Y, 1, 16); }
    } else { // Luke mit Holzrahmen und Tauen
      ctx.fillStyle = '#2c1808'; ctx.fillRect(X - 2, Y - 3, w + 4, 4); ctx.fillStyle = '#8c5c2c'; ctx.fillRect(X - 2, Y - 3, w + 4, 1);
      for (const s of [X - 2, X + w - 1]) { ctx.fillStyle = '#3c2410'; ctx.fillRect(s, Y, 3, 16); ctx.fillStyle = '#7c5428'; ctx.fillRect(s, Y, 1, 16); }
      ctx.strokeStyle = '#9c8458'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X + 6, Y + 1); ctx.quadraticCurveTo(X + w / 2, Y + 7, X + w - 6, Y + 1); ctx.stroke();
    }
  }
}
