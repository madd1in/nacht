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
    L.push({ x: this.cx - cx, y: this.y + 2 - cy, r: (this.state === 'wreck' ? 30 : 46) + flick(this.ax), c: [248, 170, 70], a: 0.6 });
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
  constructor(d) { super(d.x * T + 2, (d.y + 1) * T - 38, 14, 38); this.kind = 'prop'; this.live = !!d.live; this.state = 'still'; this.wt = 0; this.flip = !!d.flip; this.d = d; }
  update() {
    this.t++;
    if (!this.live || this.state === 'empty') return;
    const p = W.player;
    if (this.state === 'still' && p.alive && Math.abs(p.cx - this.cx) < 64 && Math.abs(p.feet - (this.y + this.h)) < 40) { this.state = 'wake'; this.wt = 0; Audio8.sfx('clank', this.cx); }
    if (this.state === 'wake' && ++this.wt > 36) { // steigt vom Sockel: wird zum Ritter
      this.state = 'empty';
      const k = W.spawn(new Knight(this.d.x, this.d.y));
      k.face = Math.sign(p.cx - this.cx) || 1; k.y = this.y + this.h - 4 - k.h;
      W.dust(this.cx, this.y + this.h - 4, 5); Audio8.sfx('clank', this.cx); W.shake = Math.max(W.shake, 3);
    }
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    R('#2c2834', -3, 34, 20, 4); R('#5c5468', -3, 34, 20, 1); R('#1c1824', -2, 37, 18, 1); // Sockel
    if (this.state === 'empty') return;
    const sh = this.state === 'wake' ? Math.round(Math.sin(this.wt * 2.1)) : 0, X = sh;
    const S = '#8c8898', L = '#c8c4d0', D = '#4c4858', K = '#1c1824';
    R(D, X + 3, 22, 3, 12); R(D, X + 8, 22, 3, 12); R(S, X + 3, 22, 2, 11); R(S, X + 8, 22, 2, 11); R(K, X + 2, 32, 4, 2); R(K, X + 8, 32, 4, 2); // Beine
    R(D, X + 1, 10, 12, 13); R(S, X + 2, 10, 10, 12); R(L, X + 3, 11, 3, 8); R(D, X + 2, 16, 10, 1); R(D, X + 2, 20, 10, 2); // Brustharnisch
    R(D, X - 1, 10, 3, 5); R(D, X + 12, 10, 3, 5); R(L, X - 1, 10, 3, 1); R(L, X + 12, 10, 3, 1); // Schulterstücke
    R(S, X - 1, 15, 2, 7); R(S, X + 13, 15, 2, 7);
    R(D, X + 3, 1, 8, 9); R(S, X + 4, 1, 6, 8); R(L, X + 4, 1, 2, 5); R(K, X + 4, 5, 6, 1); R('#a80020', X + 6, -3, 2, 4); // Helm mit Federbusch
    const eyes = this.state === 'wake' ? ((this.wt >> 2) % 2 ? '#fc3c3c' : '#fcd040') : this.live && (this.t % 240) < 4 ? '#6c1010' : null; // erwachende Rüstung: Augen glühen
    if (eyes) { R(eyes, X + 5, 5, 1, 1); R(eyes, X + 8, 5, 1, 1); }
    const fx = this.flip ? -6 : 16; // Hellebarde
    R('#3c2410', X + fx, -6, 2, 40); R('#c8c4d0', X + fx - 2, -8, 6, 3); R('#8c8898', X + fx + (this.flip ? -2 : 2), -5, 3, 4);
  }
}
