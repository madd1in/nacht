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
    // Low-Poly-Kronleuchter (PS2): Reif als Ellipse, dreht sich langsam, neigt sich mit dem Schwung
    ctx.save(); ctx.translate(Math.round(this.x + this.w / 2 - cx), Math.round(this.y + 2 - cy)); ctx.rotate(-this.ang);
    PS2.drawChandelier(ctx, 0, 0, 19, { yaw: this.t * 0.012, lit: true, holder: this }); ctx.restore();
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

// ---------------- Wald: Rastfeuer, Leiche mit Fund, Fallbaum, Hinterhalt, Nebelwand ----------------
// Rastfeuer: Kontrollpunkt wie die Statue. Glimmt, bis man es erreicht – dann lodert es auf, heilt ganz, und das Bild hält
// kurz inne (Schriftzug in der Mitte).
class Campfire extends Statue {
  constructor(d) { super(d); this.x = d.x * T - 4; this.w = 24; this.y = (d.y + 1) * T - 16; this.h = 16; }
  activate(fresh) {
    this.active = true;
    W.checkpoint = { stage: W.stage, room: W.roomIdx, cx: this.cx, feet: this.y + this.h };
    if (!fresh) return;
    const p = W.player; p.hp = p.maxHp;
    Audio8.sfx('checkpoint', this.cx); Audio8.sfx('whoosh', this.cx); Input.rumble(0.4, 0.3, 300);
    Game.rest();
    for (let i = 0; i < 26; i++) W.spawn(new Particle(this.cx + rnd(-6, 6), this.y + rnd(4, 12), rnd(-0.7, 0.7), rnd(-2.6, -0.8), ['#f8b800', '#fc7460', '#fce0a8'][i % 3], 50, 1, 0.02));
  }
  update() {
    super.update();
    if (this.active && this.t % 9 === 0) W.spawn(new Particle(this.cx + rnd(-4, 4), this.y + 2, rnd(-0.2, 0.2), rnd(-1.2, -0.5), Math.random() < 0.5 ? '#f8b800' : '#fc7460', 40, 1, 0)); // Funken
  }
  lightUp(L, cx, cy, flick) {
    const x = this.cx - cx, y = this.y - cy + 4;
    L.push(this.active ? { x, y: y - 4, r: 58 + flick(this.x) * 2, c: [252, 140, 40], a: 0.75 } : { x, y, r: 18 + flick(this.x), c: [220, 40, 20], a: 0.4 });
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y), t = this.t;
    ctx.fillStyle = '#2c2830'; for (const [sx, sy] of [[1, 12], [5, 14], [10, 15], [15, 14], [19, 12], [3, 9], [20, 9]]) ctx.fillRect(x + sx, y + sy - 1, 4, 3); // Steinkranz
    ctx.fillStyle = '#6c6470'; for (const [sx, sy] of [[1, 12], [5, 14], [10, 15], [15, 14], [19, 12]]) ctx.fillRect(x + sx, y + sy - 1, 3, 1);
    ctx.fillStyle = '#3c2414'; ctx.fillRect(x + 4, y + 11, 16, 3); ctx.fillStyle = '#5c3c20'; ctx.fillRect(x + 6, y + 9, 12, 2); ctx.fillRect(x + 4, y + 11, 16, 1); // Scheite
    if (!this.active) { // Glut
      ctx.fillStyle = (t >> 4) % 2 ? '#a81c08' : '#d83c10'; ctx.fillRect(x + 8, y + 9, 2, 1); ctx.fillRect(x + 13, y + 10, 2, 1); ctx.fillRect(x + 11, y + 8, 1, 1);
      ctx.fillStyle = 'rgba(120,120,130,0.35)'; for (let i = 0; i < 3; i++) { const k = ((t * 0.4 + i * 20) % 60) / 60; ctx.fillRect(x + 11 + Math.round(Math.sin(k * 6 + i) * 2), y + 7 - Math.round(k * 22), 1, 2); } // Rauchfaden
      return;
    }
    for (let i = 0; i < 9; i++) { // Flammenzungen
      const fx = x + 6 + i * 1.5, h = 6 + Math.round(5 * Math.abs(Math.sin(t * 0.21 + i * 1.7)) + 3 * Math.sin(t * 0.07 + i)), w = 2;
      ctx.fillStyle = '#d82800'; ctx.fillRect(Math.round(fx), y + 10 - h, w, h);
      ctx.fillStyle = '#fc7460'; ctx.fillRect(Math.round(fx), y + 10 - Math.round(h * 0.7), w, Math.round(h * 0.7));
      ctx.fillStyle = '#fce0a8'; ctx.fillRect(Math.round(fx), y + 10 - Math.round(h * 0.35), 1, Math.round(h * 0.35));
    }
  }
}
// Toter Wanderer, an einen Baum gesunken; über ihm schimmert ein Fund, den man aufheben kann
class Relic extends Ent {
  constructor(d) { super(d.x * T, (d.y + 1) * T - 16, 20, 16); this.kind = 'prop'; this.loot = d.loot || 'heartB'; this.taken = false; }
  update() {
    this.t++;
    const p = W.player;
    if (!this.taken && p.alive && Phys.overlap(this, p)) {
      this.taken = true;
      W.spawn(new Item(this.loot, p.cx, p.cy)); Audio8.sfx('bigItem', this.cx);
      for (let i = 0; i < 16; i++) W.spawn(new Particle(this.cx + rnd(-4, 4), this.y - 6, rnd(-1, 1), rnd(-1.8, -0.4), i % 2 ? '#fcfcfc' : '#fce0a8', 40, 1, 0));
    }
  }
  lightUp(L, cx, cy) { if (!this.taken) L.push({ x: this.cx - cx, y: this.y - cy - 6, r: 28 + Math.sin(this.t * 0.08) * 4, c: [252, 236, 200], a: 0.6 }); }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    ctx.fillStyle = '#2a2420'; ctx.fillRect(x + 2, y + 6, 9, 10); ctx.fillRect(x + 9, y + 13, 10, 3); // Mantel, ausgestreckte Beine
    ctx.fillStyle = '#3c342c'; ctx.fillRect(x + 3, y + 7, 7, 1); ctx.fillRect(x + 10, y + 13, 8, 1);
    ctx.fillStyle = '#d8d0b8'; ctx.fillRect(x + 4, y + 1, 5, 5); ctx.fillStyle = '#1c1414'; ctx.fillRect(x + 5, y + 3, 1, 1); ctx.fillRect(x + 7, y + 3, 1, 1); // Schädel, zur Seite gesunken
    ctx.fillStyle = '#b8b098'; ctx.fillRect(x + 10, y + 10, 4, 1); ctx.fillRect(x + 18, y + 14, 2, 2); // Knochenhand, Stiefel
    if (this.taken) return;
    const gy = y - 8 + Math.round(Math.sin(this.t * 0.06) * 2), gx = x + 10;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 9); g.addColorStop(0, 'rgba(255,250,230,0.9)'); g.addColorStop(0.4, 'rgba(255,220,150,0.35)'); g.addColorStop(1, 'rgba(255,200,120,0)');
    ctx.fillStyle = g; ctx.fillRect(gx - 9, gy - 9, 18, 18);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(gx - 1, gy - 1, 2, 2);
    for (let i = 0; i < 4; i++) { const k = ((this.t * 0.012 + i * 0.25) % 1); ctx.fillStyle = `rgba(255,240,200,${(1 - k).toFixed(2)})`; ctx.fillRect(gx + Math.round(Math.sin(k * 9 + i) * 4), gy - Math.round(k * 16), 1, 1); }
    ctx.restore();
  }
}
// Toter Baum am Bach: anpeitschen → er kippt, schlägt quer über das Wasser und wird zur Brücke (Abkürzung)
class FellTree extends Ent {
  constructor(d) {
    super(d.x * T - 5, (d.row - d.len) * T, 26, d.len * T); this.kind = 'candle'; this.d = d; // etwas breiter als der Stamm: leicht zu treffen
    this.ang = 0; this.av = 0; this.state = 'stand';
  }
  hit() { if (this.state !== 'stand') return; this.state = 'fall'; this.av = 0.004; Audio8.sfx('crack', this.cx); Audio8.sfx('whoosh', this.cx); W.sparks(this.cx, this.y + this.h - 30, 6); }
  update() {
    this.t++;
    if (this.state !== 'fall') return;
    this.av += 0.0035; this.ang += this.av;
    if (this.ang >= Math.PI / 2) {
      this.ang = Math.PI / 2; this.state = 'down';
      const d = this.d; for (let c = d.x + 1; c <= d.x + d.len; c++) W.room.grid[d.row][c] = '='; // liegt jetzt als Steg über dem Bach
      W.shake = Math.max(W.shake, 12); Input.rumble(0.9, 0.7, 450); Audio8.sfx('boom', this.cx + d.len * 8); Audio8.sfx('wall', this.cx + d.len * 8);
      for (let c = d.x + 1; c <= d.x + d.len; c++) { W.dust(c * T + 8, d.row * T, 2); if (c % 2) W.spawn(new Particle(c * T + 8, (d.row + 1) * T, rnd(-1, 1), rnd(-3.4, -1.2), '#7cc8e8', 36, 2, 0.2)); }
    }
  }
  static bark(len) {
    if (FellTree.B && FellTree.B.height === len) return FellTree.B;
    const c = Sprites.canvas(14, len), x = c.getContext('2d');
    for (let Y = 0; Y < len; Y++) { const w = Math.round(6 + 4 * (Y / len)); x.fillStyle = '#3c2a1a'; x.fillRect(7 - w, Y, w * 2, 1); x.fillStyle = '#6c4e30'; x.fillRect(7 - w + 1, Y, 2, 1); x.fillStyle = '#1c120a'; x.fillRect(7 + w - 2, Y, 2, 1); if (Y % 7 === 3) { x.fillStyle = '#20160c'; x.fillRect(7 - w + 3, Y, w, 1); } }
    for (const [by, dir] of [[len * 0.18, 1], [len * 0.32, -1], [len * 0.5, 1]]) for (let i = 0; i < 6; i++) { x.fillStyle = '#2c1e12'; x.fillRect(Math.max(0, Math.min(13, 7 + dir * (4 + i))), Math.round(by - i * 0.8), 1, 2); } // Aststummel
    return (FellTree.B = c);
  }
  draw(ctx) {
    const d = this.d, bx = Math.round(d.x * T + 8 - W.cam.x), by = Math.round(d.row * T - W.cam.y);
    ctx.fillStyle = '#3c2a1a'; ctx.fillRect(bx - 8, by - 6, 16, 6); ctx.fillStyle = '#6c4e30'; ctx.fillRect(bx - 8, by - 6, 16, 1); // Stumpf mit Wurzeln
    ctx.fillStyle = '#2c1e12'; ctx.fillRect(bx - 11, by - 2, 4, 2); ctx.fillRect(bx + 7, by - 2, 4, 2);
    if (this.state === 'down') return;
    ctx.save(); ctx.translate(bx, by - 4); ctx.rotate(this.ang); ctx.drawImage(FellTree.bark(d.len * T), -7, -d.len * T); ctx.restore();
    if (this.state === 'stand' && (this.t >> 5) % 2 === 0) { ctx.fillStyle = '#c8c0a8'; ctx.fillRect(bx - 1, by - 40, 3, 1); ctx.fillRect(bx, by - 41, 1, 3); } // Kerbe im Holz: hier anschlagen
  }
}
// Hinterhalt: sobald der Held die Stelle passiert, brechen Ghule rings um ihn aus dem Laub
class Ambush extends Ent {
  constructor(d) { super(d.x * T, 0, 1, 1); this.kind = 'prop'; this.n = d.n || 3; this.fired = false; }
  update() {
    if (this.fired) return;
    const p = W.player;
    if (!p.alive || p.cx < this.x || p.feet < 9 * T) return; // nur unten auf dem Waldboden
    this.fired = true; W.shake = Math.max(W.shake, 6); Input.rumble(0.5, 0.4, 250); Audio8.sfx('growl', p.cx);
    [70, -64, 118, -110].slice(0, this.n).forEach((dx, i) => {
      const x = p.cx + dx, col = Math.floor(x / T); let row = Math.floor(p.feet / T);
      while (row < W.room.h && !Phys.solidTile(col, row)) row++;
      if (row >= W.room.h || x < 16 || x > W.room.w * T - 16) return;
      W.spawn(new Ghoul(x - 5, row * T, dx > 0 ? -1 : 1));
      for (let k = 0; k < 6; k++) W.spawn(new Particle(x + rnd(-6, 6), row * T, rnd(-0.8, 0.8), rnd(-2.4, -0.6), k % 2 ? '#3a2c1c' : '#2c5c24', 30, 2, 0.15)); // Laub und Erde fliegen
    });
  }
  draw() {}
}
// Nebelwand vor dem Burggraben: milchig wabernd; hindurch geht es nur langsam, das Bild wird weiß
class FogWall extends Ent {
  constructor(d) { super(d.x * T, 0, 2 * T, W.room.h * T); this.kind = 'prop'; this.push = 0; }
  update() {
    this.t++;
    const p = W.player, inside = p.alive && Phys.overlap(this, p);
    if (inside) { p.x -= p.vx * 0.62; if (this.push < 0.05) Audio8.sfx('whoosh', this.cx); }
    this.push += ((inside ? 1 : 0) - this.push) * 0.08;
  }
  lightUp(L, cx, cy) { L.push({ x: this.cx - cx, y: 120 - cy, r: 70, c: [220, 230, 240], a: 0.35 }); }
  draw(ctx) {
    const x0 = Math.round(this.x - W.cam.x), t = this.t;
    if (x0 > View.w + 40 || x0 < -80) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const ph = (t * (0.004 + (i % 4) * 0.0015) + i * 0.137) % 1, y = 208 - ph * 240, x = x0 + 16 + Math.sin(t * 0.02 + i * 1.3) * 10 + Math.sin(ph * 9 + i) * 6, r = 14 + (i % 5) * 4;
      const a = 0.16 * Math.sin(ph * Math.PI), g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(220,226,236,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(200,210,226,0)'); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const band = ctx.createLinearGradient(x0 - 10, 0, x0 + 42, 0); band.addColorStop(0, 'rgba(200,210,226,0)'); band.addColorStop(0.5, `rgba(210,220,232,${(0.16 + 0.04 * Math.sin(t * 0.05)).toFixed(3)})`); band.addColorStop(1, 'rgba(200,210,226,0)');
    ctx.fillStyle = band; ctx.fillRect(x0 - 10, 0, 52, 208);
    ctx.restore();
    if (this.push > 0.02) { ctx.fillStyle = `rgba(226,232,240,${(this.push * 0.45).toFixed(3)})`; ctx.fillRect(0, 0, View.w, 208); }
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
  static ENV = (() => { const v = [0.55, 0.62, -0.55], l = Math.hypot(...v); return { static: true, sun: v.map(c => c / l), sunC: [0.62, 0.56, 0.86], amb: [0.36, 0.3, 0.42], sky: [0.12, 0.1, 0.18], fog: [20, 12, 36], fogD: 0.0009 }; })(); // Mondlicht von rechts vorn
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
        const G = this.geo();
        W.shake = Math.max(W.shake, 26); W.sway.v += 0.012; Input.rumble(1, 0.9, 700); Audio8.sfx('wall', this.archCx); Audio8.sfx('crack', this.archCx); Audio8.sfx('boom', G.gx1);
        W.zoomFx = { t: 0, len: 96, amp: 0.3, b: { cx: G.gx1 - 4, cy: this.hy - 54 } }; // Kamera fährt auf das Fallgatter
        for (let i = 0; i < 10; i++) { W.dust(this.geo().gx1 + (i % 2 ? 1 : -1) * (i * 3), this.hy, 3); W.dust(this.geo().gx0 + (i % 2 ? 1 : -1) * (i * 3), this.hy, 2); }
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
    const G = this.geo(), eye = 0.45 + 0.25 * Math.sin(this.t * 0.07), fade = this.fade ?? 1;
    for (const [x, y, z, r, c, a] of [[G.X0 + 18, 72, G.FZ - 4, 40, [248, 140, 40], 0.65 * fade], [G.X1 - 18, 72, G.FZ - 4, 40, [248, 140, 40], 0.65 * fade],
      [G.X0 + 50, 62, G.TZ - 3, 30, [248, 140, 40], 0.5], [G.X1 - 50, 62, G.TZ - 3, 30, [248, 140, 40], 0.5], [(G.X0 + G.X1) / 2, 90, G.FZ - 18, 22, [252, 30, 30], eye * fade]]) {
      const [sx, sy] = this.proj(x, y, z); L.push({ x: sx, y: sy, r: r + flick(x), c, a });
    }
  }
  // ---------------- PS2-3D-Torhaus ----------------
  // Echtes 3D in derselben Perspektive wie die Kacheln (Fluchtpunkt Bildmitte/y 60, Spielebene z = 0, Kamera 200 davor).
  // Weltkoordinaten: x wie das Spielfeld, y nach oben ab dem Boden, z in die Tiefe. Der Torweg läuft entlang des Laufwegs
  // durch das Torhaus – die Eingangsseite schaut dem Helden entgegen, in der Perspektive sieht man den Bogen schräg.
  // Die Mauer zwischen Torweg und Betrachter (Fassade mit Pechnasen, Schießscharten, Totenkopf, Bannern) wird zur
  // Schnittansicht, sobald der Held drinnen ist. Zwei Fallgatter (Ein- und Ausgang), dahinter zwei riesige Rundtürme.
  geo() {
    const X0 = this.hx - 6, X1 = this.hx + GH.A + GH.R + 6;
    return { X0, X1, TZ: 22, TH: 112, TS: 86, FZ: -48, HB: 140, gx0: this.gx * T + 8, gx1: X1 - 26 };
  }
  static stoneCol(i, j, k, base) { // Quader: Helligkeit je Stein leicht verschieden
    const h = ((i * 73856093) ^ (j * 19349663) ^ (k * 83492791)) >>> 0, n = (h % 1000) / 1000;
    return [base[0] + (n - 0.5) * 22, base[1] + (n - 0.5) * 20, base[2] + (n - 0.5) * 24];
  }
  // Viereckfeld: Ursprung o, Kanten U und V (nu x nv Quader), Normale vom Punkt inside weg
  static panel(m, o, U, V, nu, nv, col, inside, opt = {}) {
    const P = (i, j) => PS2.vtx(m, o[0] + U[0] * i / nu + V[0] * j / nv, o[1] + U[1] * i / nu + V[1] * j / nv, o[2] + U[2] * i / nu + V[2] * j / nv);
    const ids = []; for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) ids.push(P(i, j));
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = ids[j * (nu + 1) + i], b = a + 1, c = ids[(j + 1) * (nu + 1) + i + 1], d = ids[(j + 1) * (nu + 1) + i];
      PS2.face(m, [a, b, c, d], typeof col === 'function' ? col(i, j) : col, inside, opt);
    }
  }
  buildMeshes() {
    const G = this.geo(), { X0, X1, TZ, TH, TS, FZ, HB } = G, M = Gatehouse;
    const STONE = [96, 90, 110], STONE2 = [74, 68, 88], INNER = [26, 22, 32], LIGHT = [134, 126, 150], IRON = [40, 38, 50], RED = [255, 60, 40], BONE = [220, 212, 190];
    const back = PS2.mesh(), front = PS2.mesh(), L = X1 - X0;
    const sc = (base, k) => (i, j) => M.stoneCol(i, j, k, base);
    // --- Fassade (vorn, wird beim Durchgehen durchsichtig) ---
    M.panel(front, [X0, 0, FZ], [L, 0, 0], [0, HB, 0], 8, 14, sc(STONE, 1), [(X0 + X1) / 2, HB / 2, 0]);
    M.panel(front, [X0, 0, FZ], [0, 0, TZ * -1 - FZ], [0, HB, 0], 2, 14, sc(STONE2, 2), [X0 + 20, HB / 2, -35]);   // linke Stirn der Fassade
    M.panel(front, [X1, 0, FZ], [0, 0, TZ * -1 - FZ], [0, HB, 0], 2, 14, sc(STONE2, 3), [X1 - 20, HB / 2, -35]);   // rechte Stirn
    for (let x = X0 + 14; x < X1 - 6; x += 30) PS2.box(front, x, 0, FZ - 4, 10, HB - 22, 8, STONE2, { top: LIGHT }); // Strebepfeiler
    for (let x = X0 + 6; x <= X1 - 6; x += 15) PS2.box(front, x, 112, FZ - 6, 6, 8, 10, STONE2);                    // Pechnasen (Konsolen)
    PS2.box(front, (X0 + X1) / 2, 120, FZ - 7, L + 8, 20, 12, STONE, { top: LIGHT });                                  // Brüstung darüber
    for (let x = X0 + 2; x <= X1 - 2; x += 14) { PS2.box(front, x, HB, FZ + 4, 8, 12, 10, STONE, { top: LIGHT }); PS2.cone(front, x, HB + 12, FZ + 4, 1.4, 9, 4, IRON); } // Zinnen mit Eisendornen
    for (const [x, y] of [[X0 + 34, 26], [X0 + 92, 26], [X1 - 34, 26], [X0 + 64, 70], [X1 - 64, 70], [(X0 + X1) / 2, 132]]) { // Schießscharten glühen rot
      PS2.box(front, x, y, FZ - 0.6, 4, 18, 1, [12, 4, 6]); PS2.box(front, x, y + 3, FZ - 1.2, 2, 12, 1, RED, { e: 0.9 });
    }
    { const cx = (X0 + X1) / 2, cy = 84, z = FZ - 6; // Totenkopf über dem verborgenen Torweg
      PS2.prism(front, cx, cy, z, 13, 15, 10, BONE, { rTop: 11 }); PS2.cone(front, cx, cy + 15, z, 11, 7, 10, BONE);
      PS2.box(front, cx, cy - 7, z, 16, 8, 14, BONE); for (let k = -3; k <= 3; k++) PS2.box(front, cx + k * 2.2, cy - 9, z - 7.5, 1.6, 4, 1, [240, 236, 220]);
      for (const ex of [-5, 5]) { PS2.box(front, cx + ex, cy + 5, z - 11.5, 6, 6, 2, [16, 6, 8]); PS2.box(front, cx + ex, cy + 6.5, z - 12.6, 2.4, 2.6, 1, RED, { e: 1 }); }
      PS2.cone(front, cx, cy - 1, z - 11, 2, 4, 3, [30, 16, 18]);
    }
    for (const x of [X0 + 18, X1 - 18]) { PS2.box(front, x, 58, FZ - 3, 3, 10, 4, IRON); PS2.cone(front, x, 68, FZ - 4, 3, 8, 6, [255, 150, 50], { e: 1 }); } // Fackeln
    // --- Torweg innen: Rückwand mit Fackeln, Spitzgewölbe, Gurtbögen ---
    M.panel(back, [X0, 0, TZ], [L, 0, 0], [0, TS, 0], 8, 6, sc(INNER, 4), [(X0 + X1) / 2, TS / 2, 60]);
    M.panel(back, [X0, TS, TZ], [L, 0, 0], [0, TH - TS, -TZ], 8, 1, sc(INNER, 5), [(X0 + X1) / 2, 130, 40]);
    M.panel(back, [X0, TS, -TZ], [L, 0, 0], [0, TH - TS, TZ], 8, 1, sc(INNER, 6), [(X0 + X1) / 2, 130, -40]);
    for (let x = X0 + 24; x < X1; x += 48) { PS2.beam(back, x, 0, TZ - 2, x, TS, TZ - 2, 6, 4, STONE2); PS2.beam(back, x, TS, TZ - 2, x, TH, 0, 5, 5, STONE2); }
    for (const x of [X0 + 50, X1 - 50]) { PS2.box(back, x, 50, TZ - 2, 3, 8, 3, IRON); PS2.cone(back, x, 58, TZ - 3, 2.6, 7, 6, [255, 150, 50], { e: 1 }); }
    // Schnittkanten der vorderen Mauer: Sturz über dem Torweg und Laibungen an beiden Enden – rahmen den Tunnel, wenn die Fassade durchsichtig ist
    M.panel(back, [X0, TH, -TZ - 1], [L, 0, 0], [0, 26, 0], 8, 2, sc(STONE2, 11), [(X0 + X1) / 2, TH + 10, 0]);
    for (let x = X0 + 10; x < X1; x += 16) PS2.box(back, x, TH + 3, -TZ - 2.5, 2, 2, 1, [150, 144, 168]);
    for (const X of [X0, X1 - 10]) M.panel(back, [X, 0, -TZ - 1], [10, 0, 0], [0, TH, 0], 1, 8, sc(LIGHT, 12), [X + 5, TH / 2, 0]);
    // --- Stirnseiten: Eingang (links) und Ausgang (rechts) mit Spitzbogen und hellen Bogensteinen ---
    for (const [X, s2] of [[X0, -1], [X1, 1]]) {
      const ins = [X - s2 * 30, 60, 30];
      M.panel(back, [X, 0, TZ], [0, 0, 92 - TZ], [0, HB, 0], 3, 14, sc(STONE, X === X0 ? 7 : 8), ins);            // hinterer Teil
      M.panel(back, [X, TH, -TZ], [0, 0, 2 * TZ], [0, HB - TH, 0], 2, 3, sc(STONE, 9), ins);                         // über dem Bogen
      PS2.face(back, [PS2.vtx(back, X, TS, -TZ), PS2.vtx(back, X, TH, 0), PS2.vtx(back, X, TH, -TZ)], STONE, ins);   // Bogenzwickel
      PS2.face(back, [PS2.vtx(back, X, TH, 0), PS2.vtx(back, X, TS, TZ), PS2.vtx(back, X, TH, TZ)], STONE, ins);
      const v = (y, z) => [X + s2 * 0.6, y, z];                                                                       // Bogensteine
      for (const [p0, p1] of [[v(0, -TZ - 4), v(TS, -TZ - 4)], [v(0, TZ + 4), v(TS, TZ + 4)], [v(TS, -TZ - 4), v(TH + 5, 0)], [v(TS, TZ + 4), v(TH + 5, 0)]]) PS2.beam(back, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], 3, 5, LIGHT);
      PS2.box(back, X + s2 * 2, TH + 2, 0, 4, 10, 8, BONE); PS2.box(back, X + s2 * 4.2, TH + 6, -2, 1, 2, 2, RED, { e: 1 }); PS2.box(back, X + s2 * 4.2, TH + 6, 2, 1, 2, 2, RED, { e: 1 }); // Schädel-Schlussstein
      for (let x = X - 8; x <= X + 8; x += 16) for (let z = 26; z < 92; z += 14) { PS2.box(back, X, HB, z, 6, 12, 8, STONE, { top: LIGHT }); }
    }
    PS2.box(back, (X0 + X1) / 2, HB - 4, 60, L, 4, 64, STONE2, { top: [70, 64, 84] }); // Wehrgang oben
    // --- zwei Rundtürme dahinter (weit über das Bild hinaus), mit Zinnenkranz, Dornen und rot glühenden Fenstern ---
    for (const [tx, tz, r, h] of [[X0 - 30, 140, 52, 196], [X1 + 36, 136, 58, 206]]) {
      const n = 14, rows = 12, ring = [];
      for (let j = 0; j <= rows; j++) { const row = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; row.push(PS2.vtx(back, tx + Math.cos(a) * r, h * j / rows, tz + Math.sin(a) * r)); } ring.push(row); }
      for (let j = 0; j < rows; j++) for (let i = 0; i < n; i++) PS2.face(back, [ring[j][i], ring[j][(i + 1) % n], ring[j + 1][(i + 1) % n], ring[j + 1][i]], M.stoneCol(i, j, tx, STONE), [tx, h * (j + 0.5) / rows, tz]);
      for (let i = 0; i < n; i += 2) { const a = (i + 0.5) / n * Math.PI * 2, x = tx + Math.cos(a) * (r + 2), z = tz + Math.sin(a) * (r + 2); PS2.box(back, x, h, z, 10, 13, 10, STONE, { top: LIGHT }); PS2.cone(back, x, h + 13, z, 1.6, 10, 4, IRON); }
      for (const [a, y] of [[-1.8, 70], [-1.4, 120], [-2.1, 160], [-1.6, 30]]) { const x = tx + Math.cos(a) * (r + 0.6), z = tz + Math.sin(a) * (r + 0.6); PS2.box(back, x, y, z, 5, 16, 2, [12, 4, 6]); PS2.box(back, x, y + 3, z - 0.8, 2.6, 10, 1, RED, { e: 0.9 }); }
    }
    return { back, front };
  }
  portcullisMesh() { // Fallgatter am Ein- und Ausgang, frontal in der Schnittebene: Stäbe, Querbänder, lange Spitzen; gy = hochgezogen
    const m = PS2.mesh(), G = this.geo(), bot = this.gy, IRON = [118, 112, 132], IRON2 = [214, 210, 228], z = -G.TZ + 2;
    for (const X of [G.gx0, G.gx1]) {
      for (let x = X - 16; x <= X + 16; x += 6.4) { PS2.beam(m, x, bot + 6, z, x, bot + 150, z, 3.6, 3.6, IRON); PS2.cone(m, x, bot + 7, z, 2.2, -9, 4, IRON2); PS2.beam(m, x - 0.9, bot + 8, z - 2, x - 0.9, bot + 150, z - 2, 0.8, 0.8, IRON2); } // Stäbe mit Glanzkante, lange Spitzen
      for (let y = bot + 30; y < bot + 150; y += 34) PS2.beam(m, X - 18, y, z + 1, X + 18, y, z + 1, 3, 2, [70, 66, 84]);                              // wenige Querbänder dahinter
    }
    return m;
  }
  persp3() { const w = View.w, dv = View.lite ? 3 : 2; return { w, dv, Wb: Math.ceil(w / dv), Hb: Math.ceil(208 / dv), cam: { x: W.cam.x + w / 2, y: this.hy - (W.cam.y + 60), z: -200, yaw: 0, pitch: 0, f: 200 / dv, near: 30, hy: 60 / 208 } }; }
  renderPart(which) {
    const P = this.persp3(), key = Math.round(W.cam.x / P.dv) + '|' + Math.round(W.cam.y / P.dv) + '|' + P.Wb + (which === 'back' ? '|' + Math.round(this.gy) : '');
    this.bufs = this.bufs || {};
    let B = this.bufs[which];
    if (!B || B.c.width !== P.Wb) { B = this.bufs[which] = { c: Sprites.canvas(P.Wb, P.Hb), key: null }; B.x = B.c.getContext('2d', { willReadFrequently: true }); }
    if (B.key !== key) {
      if (!this.meshes) this.meshes = this.buildMeshes();
      B.key = key; B.x.clearRect(0, 0, P.Wb, P.Hb);
      const list = which === 'back' ? [this.meshes.back, this.portcullisMesh()] : [this.meshes.front];
      PS2.render(B.x, P.Wb, P.Hb, list, P.cam, Gatehouse.ENV);
    }
    return B;
  }
  proj(x, y3, z) { const VX = View.w / 2, k = 200 / (200 + z); return [VX + (x - W.cam.x - VX) * k, 60 + (this.hy - y3 - W.cam.y - 60) * k, k]; }
  draw(ctx) { // hinter dem Helden: Türme, Torweg, Stirnseiten, Fallgatter – dann Zugbrücke, Ketten, Seil
    const cx = W.cam.x, cy = W.cam.y, fx = Math.round(this.x - cx);
    if (fx > View.w + 120 || fx + this.w < -200) return;
    const B = this.renderPart('back');
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, B.c.width, B.c.height, 0, 0, View.w, 208); ctx.restore();
    const tp = this.tip(); // Kette von der Mauer zur Brückenspitze
    [[this.hx - 6, 74], [this.hx - 6, 84]].forEach(([kx, ky], j) => {
      const n = Math.ceil(Math.hypot(tp.x - kx, tp.y - ky) / 3);
      for (let i = 0; i <= n; i++) { ctx.fillStyle = (i + j) % 2 ? '#2c2c38' : '#8c8898'; ctx.fillRect(Math.round(kx + (tp.x - kx) * i / n - cx) - 1, Math.round(ky + (tp.y - ky) * i / n - cy) - 1, 3, 3); }
    });
    const w = this.winch, wx = w.cx + 3, wy = w.y + 9, slack = this.state === 'up' ? 4 : 22; // Seil zur Winde
    ctx.fillStyle = '#a8784c';
    for (let i = 0; i <= 60; i++) { const k = i / 60, sx = wx + (tp.x - wx) * k, sy = wy + (tp.y - wy) * k + Math.sin(k * Math.PI) * slack; ctx.fillRect(Math.round(sx - cx), Math.round(sy - cy), 1, 1); }
    this.drawBridge(ctx, cx, cy);
  }
  drawFront(ctx) { // vor dem Helden: die Fassade – drinnen (und kurz danach) nur noch als Schnittansicht
    const fx = Math.round(this.x - W.cam.x);
    if (fx > View.w + 160 || fx + this.w < -240) return;
    const G = this.geo(), p = W.player, inside = p.cx > G.X0 - 110 && p.cx < G.X1 + 90; // schon beim Herankommen Schnittansicht: Gatter und Torweg sichtbar
    this.fade = (this.fade ?? 1) + ((inside ? 0.1 : 1) - (this.fade ?? 1)) * 0.14;
    const B = this.renderPart('front');
    ctx.save(); ctx.globalAlpha = this.fade; ctx.imageSmoothingEnabled = true; ctx.drawImage(B.c, 0, 0, B.c.width, B.c.height, 0, 0, View.w, 208);
    for (const bx of [G.X0 + 47, G.X1 - 47]) { // Banner an der Fassade
      const [sx, sy, k] = this.proj(bx, 108, G.FZ - 8);
      ctx.save(); ctx.globalAlpha = this.fade * this.fade; ctx.translate(Math.round(sx - 11 * k), Math.round(sy)); ctx.scale(k * 0.9, k * 0.75); this.drawBanner(ctx, 0, 0); ctx.restore();
    }
    ctx.restore();
  }
  inside() { const G = this.geo(), p = W.player; return p.cx > G.X0 && p.cx < G.X1; }
  // Mauerwerk aus den Bodenblöcken des Burghofs (für andere Bauten, z. B. den Steinüberhang)
  static stoneTex() {
    if (Gatehouse.ST) return Gatehouse.ST;
    const t = Tiles.build('courtyard'), c = Sprites.canvas(64, 256), x = c.getContext('2d');
    for (let r = 0; r < 16; r++) for (let k = -1; k < 4; k++) x.drawImage(t.ground[(r * 3 + k + 4) % 4], k * 16 + (r % 2 ? 8 : 0), r * 16);
    x.fillStyle = 'rgba(14,8,26,0.3)'; x.fillRect(0, 0, 64, 256);
    return (Gatehouse.ST = c);
  }
  // Zugbrücke im PS1/PS2-Look: die Bohlen-Vorderseite dreht um das Scharnier, dazu Deck, Kanten und Unterseite als
  // Flächen zum selben Fluchtpunkt wie die Bodenblöcke (Mitte, y 60; Tiefe 10 %) – nur die zum Betrachter gewandten
  drawBridge(ctx, cx, cy) {
    const a = this.ang, L = this.len, H = 14, ca = Math.cos(a), sa = Math.sin(a), ox = this.hx - cx, oy = this.hy - cy;
    const P = [[-L, 0], [0, 0], [0, H], [-L, H]].map(([u, v]) => [ox + u * ca - v * sa, oy + u * sa + v * ca]);
    const VX = View.w / 2, VY = 60, K = 0.9, Q = P.map(([x, y]) => [VX + (x - VX) * K, VY + (y - VY) * K]);
    const mx = (P[0][0] + P[2][0]) / 2, my = (P[0][1] + P[2][1]) / 2, lerp = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
    const quad = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); };
    const line = (A, B, col, w = 1) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); };
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4, ex = (P[i][0] + P[j][0]) / 2, ey = (P[i][1] + P[j][1]) / 2;
      let nx = P[j][1] - P[i][1], ny = -(P[j][0] - P[i][0]);
      if (nx * (ex - mx) + ny * (ey - my) < 0) { nx = -nx; ny = -ny; }
      if (nx * (VX - ex) + ny * (VY - ey) <= 0) continue; // Fläche zeigt vom Betrachter weg
      const f = [P[i], P[j], Q[j], Q[i]];
      if (i === 0) { // Deck: Bohlen quer, Eisenbänder, Lichtkante vorn
        const g = ctx.createLinearGradient(ex, ey, (Q[i][0] + Q[j][0]) / 2, (Q[i][1] + Q[j][1]) / 2); g.addColorStop(0, '#9c6838'); g.addColorStop(1, '#5c3818');
        quad(f, g);
        for (let u = 8; u < L; u += 8) line(lerp(P[0], P[1], u / L), lerp(Q[0], Q[1], u / L), 'rgba(28,14,4,0.8)');
        for (let u = 4; u < L; u += 24) { line(lerp(P[0], P[1], u / L), lerp(Q[0], Q[1], u / L), '#2c2c38', 2.4); line(lerp(P[0], P[1], (u + 1) / L), lerp(Q[0], Q[1], (u + 1) / L), '#8c8898', 0.8); }
        line(P[0], P[1], '#c08c50', 1);
      } else quad(f, i === 2 ? '#140802' : '#2c1606'); // Unterseite fast schwarz, Stirnseiten dunkles Holz
    }
    ctx.save(); ctx.translate(Math.round(ox), Math.round(oy)); ctx.rotate(a); ctx.drawImage(Gatehouse.plank(L), -L, 0); ctx.restore();
  }
  // Banner als Stoffnetz (PS2): Gitter aus Vierecken, das im Wind in die Tiefe schwingt; jedes Viereck nach seiner Neigung
  // zum Licht schattiert (Falten hell/dunkel), die Farbe kommt aus dem Wappenmuster (goldene Fledermaus auf Rot)
  drawBanner(ctx, bx, by) {
    const NU = 11, NV = View.lite ? 18 : 28, t = this.t, Wd = 22, vtx = [];
    const zf = (u, v, len) => Math.sin(t * 0.09 - v * 0.05 + u * 0.2) * (v / len) * 7 + Math.sin(t * 0.13 - v * 0.09) * (v / len) * 2;
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU * Wd, len = 104 - Math.abs(u - 11) * 0.8, v = j / NV * len, z = zf(u, v, len);
      vtx.push({ u, v, z, x: bx + u + z * 0.35 + Math.sin(t * 0.09 - v * 0.05) * (v / len) * 2, y: by + v - Math.abs(z) * 0.15 });
    }
    const crest = (c, y) => { const u = Math.abs(c - 10.5), v = y - 44; return (u < 1.6 && v > -7 && v < 9) || (u > 0.6 && u < 2.6 && v > -10 && v <= -6) || (u < 10 && v > -2 - u * 0.45 && v < 3 - u * 0.2 - ((Math.floor(u / 3.3) % 2) ? 0 : 2.5)); };
    const Lx = -0.45, Ly = -0.5, Lz = 0.74;
    ctx.lineWidth = 0.6;
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
      const a = vtx[j * (NU + 1) + i], b = vtx[j * (NU + 1) + i + 1], c = vtx[(j + 1) * (NU + 1) + i + 1], d = vtx[(j + 1) * (NU + 1) + i];
      const du = (b.z - a.z + c.z - d.z) / 2 / (b.u - a.u || 1), dv = (d.z - a.z + c.z - b.z) / 2 / (d.v - a.v || 1);
      const nl = Math.hypot(du, dv, 1), lit = 0.42 + 0.78 * Math.max(0, (-du * Lx - dv * Ly + Lz) / nl); // Lambert auf der gewellten Fläche
      const uc = (a.u + b.u) / 2, vc = (a.v + d.v) / 2;
      const base = crest(uc, vc) ? [248, 184, 0] : (i === 0 || i === NU - 1) ? [92, 0, 16] : (Math.floor(uc) + (vc >> 3)) % 7 ? [168, 0, 32] : [136, 0, 24];
      ctx.fillStyle = ctx.strokeStyle = `rgb(${Math.min(255, base[0] * lit) | 0},${Math.min(255, base[1] * lit) | 0},${Math.min(255, base[2] * lit) | 0})`;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath(); ctx.fill(); ctx.stroke(); // Kontur schließt Fugen
    }
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
    // prächtiger Kronleuchter als Low-Poly-Modell (PS2): zwei Reifen, Kristallgehänge, brennende Kerzen; fällt er, kippt er
    ctx.save(); ctx.translate(x + 22, y + 3); if (this.state === 'fall') ctx.rotate(Math.min(0.35, this.vy * 0.05));
    PS2.drawChandelier(ctx, 0, 0, 20, { yaw: this.t * (this.state === 'fall' ? 0.05 : 0.01), tiers: 2, lit: true, holder: this }); ctx.restore();
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
  // Ölgemälde: die Pixelmalerei wird weich ineinander vermalt, Pinselstriche folgen einem Strichfeld, warmer Firnis mit
  // dunklem Rand, feines Craquelé, Glanzlicht auf dem Lack; der Goldrahmen bekommt eine plastische Kante (Licht oben links)
  const oil = (c) => {
    const x = c.getContext('2d'), M = 9, w = FW - M * 2, h = FH - M * 2;
    const soft = Sprites.canvas(w, h), sx = soft.getContext('2d'), half = Sprites.canvas(Math.ceil(w / 2), Math.ceil(h / 2)), hx = half.getContext('2d');
    hx.imageSmoothingEnabled = true; hx.drawImage(c, M, M, w, h, 0, 0, half.width, half.height);
    sx.imageSmoothingEnabled = true; sx.drawImage(half, 0, 0, half.width, half.height, 0, 0, w, h);
    x.save(); x.globalAlpha = 0.55; x.drawImage(soft, M, M); x.restore(); // vermalte Farbe, Details bleiben durchscheinend
    let sd = 7; const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    x.save(); x.beginPath(); x.rect(M, M, w, h); x.clip(); x.lineCap = 'round';
    for (let i = 0; i < 260; i++) { // Pinselstriche
      const px0 = M + rnd() * w, py0 = M + rnd() * h, a = Math.sin(px0 * 0.08) * 1.2 + Math.cos(py0 * 0.06) * 0.8, len = 2 + rnd() * 4, light = rnd() < 0.5;
      x.strokeStyle = light ? 'rgba(255,240,210,0.07)' : 'rgba(20,8,4,0.09)'; x.lineWidth = 1;
      x.beginPath(); x.moveTo(px0, py0); x.lineTo(px0 + Math.cos(a) * len, py0 + Math.sin(a) * len); x.stroke();
    }
    x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(255,214,150,0.22)'; x.fillRect(M, M, w, h); // gealterter Firnis
    x.globalCompositeOperation = 'source-over';
    const vg = x.createRadialGradient(FW / 2, FH * 0.42, w * 0.3, FW / 2, FH * 0.42, w * 0.95); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,4,2,0.55)');
    x.fillStyle = vg; x.fillRect(M, M, w, h);
    x.strokeStyle = 'rgba(16,8,4,0.18)'; // Craquelé
    for (let i = 0; i < 40; i++) { let px0 = M + rnd() * w, py0 = M + rnd() * h; x.beginPath(); x.moveTo(px0, py0); for (let k = 0; k < 4; k++) { px0 += (rnd() - 0.5) * 9; py0 += (rnd() - 0.5) * 9; x.lineTo(px0, py0); } x.stroke(); }
    const sh = x.createLinearGradient(M, M, M + w * 0.6, M + h * 0.45); sh.addColorStop(0, 'rgba(255,250,235,0.16)'); sh.addColorStop(0.5, 'rgba(255,250,235,0.04)'); sh.addColorStop(1, 'rgba(255,250,235,0)');
    x.fillStyle = sh; x.fillRect(M, M, w, h); // Lackglanz
    x.restore();
    x.save(); // plastischer Rahmen: Lichtkante oben/links, Schatten unten/rechts, Innenschatten auf der Leinwand
    x.fillStyle = 'rgba(255,248,210,0.35)'; x.fillRect(0, 0, FW, 2); x.fillRect(0, 0, 2, FH);
    x.fillStyle = 'rgba(30,14,0,0.45)'; x.fillRect(0, FH - 2, FW, 2); x.fillRect(FW - 2, 0, 2, FH);
    x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(M, M, w, 2); x.fillRect(M, M, 2, h);
    x.restore();
    return c;
  };
  // Augen: linke obere Ecke der Augäpfel (6×4), Mund: Mitte und Höhe
  return { FW, FH, art: [mk(0), mk(1), mk(2)].map(oil), eyes: [[cx - 11, fy - 2], [cx + 5, fy - 2]], mouth: [cx, fy + 14] };
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
    const VX = View.w / 2, VY = 60, f = 0.055, FW = P.FW, FH = P.FH, bk = ([x, y]) => [x + (VX - x) * f, y + (VY - y) * f];
    const quad = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); };
    for (const [X, Y, v] of this.rects) {
      // Pseudo-3D: der Rahmen steht von der Wand ab – Schatten auf der Wand, Seitenflächen laufen zum Fluchtpunkt
      ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(X + 4, Y + 5, FW, FH);
      const tl = [X, Y], tr = [X + FW, Y], br = [X + FW, Y + FH], bl = [X, Y + FH], btl = bk(tl), btr = bk(tr), bbr = bk(br), bbl = bk(bl);
      if (btl[0] < X) quad([tl, bl, bbl, btl], '#4c300c');
      if (btr[0] > X + FW) quad([tr, br, bbr, btr], '#3c2408');
      if (btl[1] < Y) quad([tl, tr, btr, btl], '#d8a040');
      if (bbl[1] > Y + FH) quad([bl, br, bbr, bbl], '#2c1806');
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
    if (this.stone) { // Steinüberhang: offen, nur ein weicher Schatten unter der Unterkante und auf dem Boden
      const g = ctx.createLinearGradient(0, Y, 0, Y + 16); g.addColorStop(0, 'rgba(6,2,12,0.45)'); g.addColorStop(0.45, 'rgba(6,2,12,0.12)'); g.addColorStop(1, 'rgba(6,2,12,0.3)');
      ctx.fillStyle = g; ctx.fillRect(X, Y, w, 16);
      return;
    }
    const g = ctx.createLinearGradient(0, Y, 0, Y + 16); g.addColorStop(0, 'rgba(10,4,2,0.5)'); g.addColorStop(0.45, 'rgba(10,4,2,0.14)'); g.addColorStop(1, 'rgba(10,4,2,0.32)'); // offene Luke: nur weicher Schatten, kein Balken
    ctx.fillStyle = g; ctx.fillRect(X, Y, w, 16);
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
