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
