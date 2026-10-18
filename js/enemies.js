// Items, Kerzen, Sub-Waffen, Gegner, Projektile, Effekte, Spawner.
'use strict';

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

class Ent {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0; this.dead = false; this.t = 0; this.kind = 'fx';
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  onScreen(m = 0) {
    const c = W.cam;
    return this.x + this.w > c.x - m && this.x < c.x + View.w + m && this.y + this.h > c.y - m && this.y < c.y + View.fh + m;
  }
  update() { this.t++; }
  draw() {}
  spr(ctx, s, flip, ox = 0, oy = 0, flash = false) {
    this.ds(ctx, s, Math.round(this.cx - s.w / 2 + ox - W.cam.x), Math.round(this.y + this.h - s.h + oy - W.cam.y), flip, flash);
  }
  // Zeichnen + merken (Weltkoordinaten), damit der Pixel-Zerfall die exakte Figur zerlegen kann
  ds(ctx, s, x, y, flip = false, flash = false) {
    this.lastDraw = { s, x: x + W.cam.x, y: y + W.cam.y, flip };
    Sprites.draw(ctx, s, x, y, flip, flash);
  }
}

// ---------------- Effekte ----------------
class Burst extends Ent {
  constructor(x, y, big) { super(x - 8, y - 8, 16, 16); this.big = big; }
  update() { this.t++; if (this.t >= 18) this.dead = true; }
  draw(ctx) {
    const s = Sprites.S.burst[Math.min(2, Math.floor(this.t / 6))];
    Sprites.draw(ctx, s, this.x - W.cam.x, this.y + 2 - W.cam.y);
  }
}
class Spark extends Ent {
  constructor(x, y) { super(x - 4, y - 4, 8, 8); }
  update() { if (++this.t >= 6) this.dead = true; }
  draw(ctx) { if (this.t < 4) Sprites.draw(ctx, Sprites.S.spark, this.x - W.cam.x, this.y - W.cam.y); }
}
class Popup extends Ent {
  constructor(x, y, text, color) { super(x, y, 0, 0); this.text = text; this.color = color || '#fcfcfc'; }
  update() { this.t++; this.y -= this.t < 20 ? 0.5 : 0; if (this.t > 50) this.dead = true; }
  draw(ctx) { Font.draw(ctx, this.text, this.x - W.cam.x, this.y - W.cam.y, this.color, { align: 'center', shadow: '#000' }); }
}
class Particle extends Ent {
  constructor(x, y, vx, vy, color, life = 50, size = 2, grav = 0.18) {
    super(x, y, size, size); this.vx = vx; this.vy = vy; this.color = color; this.life = life; this.grav = grav;
  }
  update() {
    this.t++; this.vy += this.grav; this.x += this.vx; this.y += this.vy;
    if (this.t > this.life) this.dead = true;
  }
  draw(ctx) {
    if (this.t > this.life - 10 && (this.t & 1)) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y), this.w, this.h);
  }
}

// ---------------- Items ----------------
const ITEM_SPR = {
  heartS: () => Sprites.S.heartS, heartB: () => Sprites.S.heartB, bag: () => Sprites.S.bag, bagBig: () => Sprites.S.bagBig,
  whip: () => Sprites.S.whipUp, dagger: () => Sprites.S.dagger, axe: () => Sprites.S.axe, holy: () => Sprites.S.holy,
  cross: () => Sprites.S.cross, rosary: () => Sprites.S.rosary, roast: () => Sprites.S.roast, oneUp: () => Sprites.S.oneUp,
  orb: () => Sprites.S.orb[Math.floor(W.frame / 8) % 2], watch: () => Sprites.S.watch,
};

class Item extends Ent {
  constructor(type, x, y) {
    const s = ITEM_SPR[type]();
    super(x - s.w / 2, y - s.h / 2, s.w, s.h);
    this.type = type; this.kind = 'item';
    this.life = type === 'orb' ? Infinity : 480;
    this.vy = type === 'heartS' ? 0 : -1.6;
    this.landed = false;
  }
  update() {
    this.t++;
    if (!this.landed) {
      if (this.type === 'heartS') { this.vy = 0.55; this.vx = Math.sin(this.t / 9) * 0.9; Phys.moveX(this, this.vx); }
      else { this.vy = Math.min(this.vy + 0.15, 2.4); if (this.vx) { Phys.moveX(this, this.vx); this.vx *= 0.97; } }
      if (Phys.moveY(this, this.vy) === 1) { this.landed = true; this.vx = 0; }
      if (this.y > W.room.h * T) this.dead = true;
    }
    if (--this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    if (this.life < 90 && (this.t & 2)) return;
    Sprites.draw(ctx, ITEM_SPR[this.type](), Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y));
  }
  collect(p) {
    this.dead = true;
    switch (this.type) {
      case 'heartS': p.hearts = Math.min(99, p.hearts + 1); Audio8.sfx('heart'); break;
      case 'heartB': p.hearts = Math.min(99, p.hearts + 5); Audio8.sfx('heart'); break;
      case 'bag': W.addScore(400, this.cx, this.y); Audio8.sfx('money'); break;
      case 'bagBig': W.addScore(1000, this.cx, this.y); Audio8.sfx('money'); break;
      case 'whip':
        if (p.whip < 3) { p.whip++; p.powerT = 45; W.freeze = 45; }
        else p.hearts = Math.min(99, p.hearts + 5);
        Audio8.sfx('bigItem'); break;
      case 'roast': p.hp = Math.min(p.maxHp, p.hp + p.maxHp / 2); Audio8.sfx('bigItem'); W.popup(this.cx, this.y, tr('plusLife'), '#f8b800'); break;
      case 'oneUp': W.lives++; Audio8.sfx('oneUp'); W.popup(this.cx, this.y, '1UP', '#3cbcfc'); break;
      case 'rosary': W.rosary(); Audio8.sfx('rosary'); break;
      case 'orb': p.hp = p.maxHp; Audio8.sfx('orb'); W.stageClear(); break;
      default: p.sub = this.type; Audio8.sfx('item'); break;
    }
  }
}

function rollDrop(drop) {
  const p = W.player;
  const map = { '1': 'dagger', '2': 'axe', '3': 'holy', '4': 'cross', '5': 'watch', W: 'whip', H: 'heartB', R: 'rosary', $: 'bag', U: 'oneUp' };
  if (drop === 'W' && p.whip >= 3) return 'heartB';
  if (map[drop]) return map[drop];
  const r = Math.random();
  return r < 0.55 ? 'heartS' : r < 0.75 ? 'heartB' : r < 0.88 ? 'bag' : r < 0.93 ? 'bagBig' : 'heartS';
}

class Candle extends Ent {
  constructor(tx, ty, drop, torch) {
    const w = torch ? 12 : 8, h = torch ? 20 : 16;
    super(tx * T + (T - w) / 2, ty * T + T - h, w, h);
    this.kind = 'candle'; this.drop = drop; this.torch = torch; this.t = (tx * 7) % 20;
    this.blood = drop === 'M'; // Blutmond-Kerze: löst den Blutmond aus
  }
  update() {
    this.t++;
    if (!this.onScreen(8)) return;
    if (this.t % ((this.torch ? 7 : 11) * (View.lite ? 2 : 1)) === 0) // Rauchfaden über der Flamme (Spar-Modus: halb so oft)
      W.spawn(new Particle(this.cx + rnd(-0.5, 0.5), this.y - 1, rnd(-0.08, 0.08), -rnd(0.25, 0.45),
        this.blood ? 'rgba(252,60,60,0.55)' : 'rgba(150,146,160,0.45)', 46, 1, -0.003));
    if (this.blood && this.t % 13 === 0) W.spawn(new Particle(this.cx + rnd(-5, 5), this.y + rnd(2, 12), 0, -rnd(0.3, 0.6), '#fc3c3c', 30, 1, -0.004));
  }
  hit() {
    if (this.dead) return;
    this.dead = true;
    Audio8.sfx('candle', this.cx);
    W.spawn(new Burst(this.cx, this.cy));
    W.sparks(this.cx, this.y + 2, 5);
    if (this.blood) { W.bloodMoon(this.cx, this.cy); W.spawn(new Item('heartB', this.cx, this.cy)); return; }
    W.spawn(new Item(rollDrop(this.drop), this.cx, this.cy));
  }
  draw(ctx) {
    const s = (this.torch ? Sprites.S.torch : Sprites.S.candle)[Math.floor(this.t / 8) % 2];
    Sprites.draw(ctx, this.blood ? Candle.redOf(s) : s, Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y));
  }
  // Rot eingefärbte Kopie eines Sprites (zwischengespeichert)
  static redOf(s) {
    if (s.red) return s.red;
    const mk = (src) => {
      const c = Sprites.canvas(src.width, src.height), x = c.getContext('2d');
      x.drawImage(src, 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(232,16,48,0.6)'; x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    s.red = { c: mk(s.c), f: mk(s.f), w: s.w, h: s.h, pad: s.pad };
    return s.red;
  }
}

// ---------------- Sub-Waffen ----------------
// Wurfkreuz (Bumerang): 16 Drehstufen, pro Pixel gerendert – ein symmetrisches Kreuz in 90°-Schritten sähe starr aus
const CROSS_SPIN = (() => {
  const N = 16, S = 19, c0 = (S - 1) / 2, out = [];
  const inside = (u, v) => (Math.abs(u) <= 2.1 && Math.abs(v) <= 6.6) || (Math.abs(v) <= 2.1 && Math.abs(u) <= 6.6);
  for (let k = 0; k < N; k++) {
    const a = k / N * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), c = Sprites.canvas(S, S), x = c.getContext('2d');
    const uv = (X, Y) => { const dx = X - c0, dy = Y - c0; return [dx * ca + dy * sa, -dx * sa + dy * ca]; };
    for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) {
      const [u, v] = uv(X, Y);
      if (!inside(u, v)) continue;
      const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => { const [u2, v2] = uv(X + ox, Y + oy); return !inside(u2, v2); });
      const lit = (X - c0) + (Y - c0) < -1; // Licht von links oben
      x.fillStyle = edge ? '#7c4c00' : Math.abs(u) < 0.8 && Math.abs(v) < 0.8 ? '#fcfcfc' : lit ? '#fce0a8' : '#f8b800';
      x.fillRect(X, Y, 1, 1);
    }
    out.push(c);
  }
  return out;
})();
class SubWeapon extends Ent {
  constructor(type, x, y, face) {
    const dims = { dagger: [14, 5], axe: [12, 12], holy: [8, 10], cross: [13, 13] }[type];
    super(x - dims[0] / 2, y - dims[1] / 2, dims[0], dims[1]);
    this.type = type; this.face = face; this.kind = 'sub'; this.hits = new Map();
    if (type === 'dagger') { this.vx = face * 4.2; this.dmg = 2; this.cd = 999; }
    if (type === 'axe') { this.vx = face * 1.7; this.vy = -5.4; this.dmg = 3; this.cd = 20; }
    if (type === 'holy') { this.vx = face * 1.7; this.vy = -2; this.dmg = 1; this.cd = 12; this.burnT = -1; }
    if (type === 'cross') { this.vx = face * 3.4; this.dmg = 2; this.cd = 20; this.back = false; this.trail = []; }
  }
  update() {
    this.t++;
    const tp = this.type;
    if (tp === 'dagger') {
      if (Phys.moveX(this, this.vx) || !this.onScreen(8)) this.dead = true;
    } else if (tp === 'axe') {
      this.vy += 0.19; this.x += this.vx; this.y += this.vy;
      if (this.y > W.cam.y + 230) this.dead = true;
    } else if (tp === 'holy') {
      if (this.burnT < 0) {
        this.vy += 0.22;
        Phys.moveX(this, this.vx);
        if (Phys.moveY(this, this.vy) === 1 || this.y > W.room.h * T) {
          this.burnT = 0; Audio8.sfx('holy', this.cx);
          this.x = this.cx - 12; this.w = 24; this.y = this.y + this.h - 14; this.h = 14;
        }
      } else {
        if (++this.burnT > 75) this.dead = true;
        if (this.burnT % 10 === 0) Audio8.sfx('flameTick', this.cx);
      }
    } else if (tp === 'cross') {
      this.trail.unshift([this.cx, this.cy, this.t]); if (this.trail.length > 5) this.trail.pop(); // Nachbilder
      if (this.t % 9 === 0) Audio8.sfx('spin', this.cx);
      this.vx -= this.face * 0.085;
      this.x += this.vx;
      if (Math.sign(this.vx) !== this.face) this.back = true;
      if (this.back && Phys.overlap(this, W.player)) this.dead = true;
      if (!this.onScreen(40)) this.dead = true;
    }
    if (tp !== 'holy' || this.burnT >= 0) W.subHit(this);
  }
  draw(ctx) {
    const S = Sprites.S, x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    if (this.type === 'dagger') Sprites.draw(ctx, S.dagger, x, y, this.face < 0);
    else if (this.type === 'holy') {
      if (this.burnT < 0) Sprites.draw(ctx, S.holy, x, y);
      else for (let i = 0; i < 3; i++) Sprites.draw(ctx, S.flame[(Math.floor(this.burnT / 4) + i) % 2], x + i * 8, y + 6 - ((i === 1) ? 2 : 0));
    } else if (this.type === 'cross') { // Bumerang: wirbelt sichtbar, zieht Nachbilder hinter sich her
      const fr = (k) => CROSS_SPIN[(((Math.floor(k * 2.2) * this.face) % 16) + 16) % 16];
      this.trail.forEach(([tx, ty, tt], i) => {
        if (i === 0) return;
        ctx.globalAlpha = 0.34 - i * 0.06;
        ctx.drawImage(fr(tt), Math.round(tx - W.cam.x) - 9, Math.round(ty - W.cam.y) - 9);
      });
      ctx.globalAlpha = 1;
      ctx.drawImage(fr(this.t), Math.round(this.cx - W.cam.x) - 9, Math.round(this.cy - W.cam.y) - 9);
    } else { // Axt: dreht sich gleichmäßig statt in Viertelschritten
      const s = S.axe;
      ctx.save();
      ctx.translate(x + this.w / 2, y + this.h / 2);
      ctx.rotate(Math.round(this.t * 0.42 / (Math.PI / 8)) * (Math.PI / 8) * this.face);
      ctx.drawImage(s.c, -Math.floor(s.w / 2) - s.pad, -Math.floor(s.h / 2) - s.pad);
      ctx.restore();
    }
  }
}

// ---------------- Gegner-Basis ----------------
class Enemy extends Ent {
  constructor(x, y, w, h, hp, dmg, score) {
    super(x, y, w, h);
    this.kind = 'enemy'; this.hp = hp; this.dmg = dmg; this.score = score;
    this.flashT = 0; this.lastHit = 0; this.face = -1; this.onGround = false; this.seen = false;
  }
  hit(dmg, id) {
    if (id && this.lastHit === id) return false;
    this.lastHit = id;
    this.hp -= dmg; this.flashT = 10;
    W.spawn(new Spark(this.cx, this.cy));
    W.comboHit(); W.hitstop = Math.max(W.hitstop, 2);
    if (this.hp <= 0) this.kill(); else Audio8.sfx('hit', this.cx);
    return true;
  }
  kill(silent) {
    this.dead = true;
    if (silent) return;
    Audio8.sfx('kill', this.cx);
    W.spawn(new Burst(this.cx, this.cy));
    W.sparks(this.cx, this.cy, 9);
    Drama.disintegrate(this.lastDraw);
    W.spawn(new Shock(this.cx, this.cy, 22, '#fce0a8', 3));
    W.hitstop = Math.max(W.hitstop, 4); W.shake = Math.max(W.shake, 4);
    W.addScore(this.score * W.comboMul(), this.cx, this.y);
    if (Math.random() < (W.bloodT > 0 ? 0.35 : 0.1)) W.spawn(new Item('heartS', this.cx, this.cy)); // Blutmond: mehr Herzen
  }
  physics() {
    this.vy = Math.min(this.vy + GRAV, MAXFALL);
    const wall = Phys.moveX(this, this.vx);
    const r = Phys.moveY(this, this.vy);
    this.onGround = r === 1;
    if (r) this.vy = 0;
    if (this.y > W.room.h * T + 16) this.dead = true;
    return wall;
  }
  groundAhead(dir) {
    const fx = dir > 0 ? this.x + this.w + 1 : this.x - 1;
    return Phys.solidTile(Math.floor(fx / T), Math.floor((this.y + this.h + 2) / T));
  }
  touch() {
    const p = W.player;
    if (p.alive && Phys.overlap(this, p)) p.hurt(this.dmg, this.cx);
  }
  despawnOff(m = 48) {
    if (this.onScreen(0)) this.seen = true;
    else if (this.seen && !this.onScreen(m)) this.dead = true;
  }
  update() { this.t++; if (this.flashT > 0) this.flashT--; }
  get flash() { return this.flashT > 0 && (W.frame & 2) > 0; }
}

class Ghoul extends Enemy {
  constructor(x, groundY, dir) {
    super(x, groundY - 28, 10, 28, 1, 2, 100);
    this.dir = dir; this.face = dir; this.rise = 0; this.groundY = groundY;
    Audio8.sfx('rise', this.cx);
  }
  update() {
    super.update();
    if (this.rise < 33) { this.rise += 0.9; if (this.rise > 14) this.touch(); return; }
    this.vx = this.dir * 0.55;
    if (this.physics()) { this.dir *= -1; this.face = this.dir; }
    this.touch();
    this.despawnOff();
    if (!this.onScreen(64)) this.dead = true;
  }
  draw(ctx) {
    const s = Sprites.S.ghul[Math.floor(this.t / 12) % 2];
    if (this.rise < 33) {
      const sy = Math.round(this.groundY - this.rise - W.cam.y), sx = Math.round(this.cx - s.w / 2 - W.cam.x);
      const vis = Math.max(1, Math.floor(this.rise)) + s.pad, cw = s.c.width;
      ctx.drawImage(this.face < 0 ? s.f : s.c, 0, 0, cw, vis, sx - s.pad, sy - s.pad, cw, vis);
      if (this.t % 6 < 3) { ctx.fillStyle = PAL.B; ctx.fillRect(sx + rnd(0, 14), Math.round(this.groundY - W.cam.y) - 2, 2, 2); }
      return;
    }
    this.spr(ctx, s, this.face < 0, 0, 0, this.flash);
  }
}

class Bat extends Enemy {
  constructor(tx, ty) {
    super(tx * T + 3, ty * T + 2, 10, 8, 1, 2, 200);
    this.state = 'perch';
  }
  update() {
    super.update();
    const p = W.player;
    if (this.state === 'perch') {
      if (this.onScreen(0) && Math.abs(p.cx - this.cx) < 100 && p.y + 8 > this.y && p.y - this.y < 140) {
        this.state = 'fly'; this.dir = Math.sign(p.cx - this.cx) || 1; this.face = this.dir; this.baseY = this.y; this.t = 0;
        Audio8.sfx('bat', this.cx);
      }
      return;
    }
    this.x += this.dir * 1.15;
    this.baseY += clamp(p.y + 6 - this.baseY, -0.55, 0.55);
    this.y = this.baseY + Math.sin(this.t * 0.12) * 10;
    this.touch();
    if (!this.onScreen(40)) this.dead = true;
  }
  draw(ctx) {
    const B = Sprites.S.bat3d; // PS1-Look: vorgerendertes 3D-Modell
    const s = this.state === 'perch' ? B.perch : B.fly[Math.floor(this.t / 1.5) % B.fly.length];
    this.ds(ctx, s, Math.round(this.cx - s.w / 2 - W.cam.x), Math.round(this.y + 4 - s.h / 2 - W.cam.y - (this.state === 'perch' ? 2 : 4)), this.dir < 0, this.flash);
  }
}

// ---------------- Seeadler (Schiff): gleitet heran, stößt im Sturzflug herab, steigt wieder auf ----------------
class SeaEagle extends Enemy {
  constructor(x, y, dir) { super(x, y, 18, 10, 2, 2, 300); this.dir = dir; this.face = dir; this.state = 'glide'; this.vx = dir * 1.5; this.vy = 0; this.t = 0; }
  update() {
    super.update();
    const p = W.player;
    if (this.state === 'glide') {
      this.x += this.vx; this.y += Math.sin(this.t * 0.06) * 0.4;
      const dx = p.cx - this.cx;
      if (this.t > 30 && p.alive && Math.sign(dx) === this.dir && Math.abs(dx) < 96 && p.cy > this.cy + 18) { // Ziel erfasst: Sturzflug
        this.state = 'dive'; this.t = 0;
        const a = Math.atan2(p.cy - 4 - this.cy, dx);
        this.vx = Math.cos(a) * 3.3; this.vy = Math.sin(a) * 3.3;
        Audio8.sfx('eagle', this.cx);
      }
    } else if (this.state === 'dive') {
      this.vy += 0.03; this.x += this.vx; this.y += this.vy;
      if (this.t > 55 || this.cy > p.cy + 8) { this.state = 'climb'; this.t = 0; }
    } else { // abdrehen und wieder steigen
      this.vx = clamp(this.vx + this.dir * 0.07, -2.6, 2.6); this.vy = Math.max(this.vy - 0.18, -2.4);
      this.x += this.vx; this.y += this.vy;
    }
    if (this.vx) this.face = Math.sign(this.vx);
    this.touch();
    if (this.t > 60 && !this.onScreen(60)) this.dead = true;
  }
  kill(silent) {
    super.kill(silent);
    if (!silent) for (let i = 0; i < 10; i++) W.spawn(new Particle(this.cx + rnd(-6, 6), this.cy + rnd(-4, 4), rnd(-1.2, 1.2), rnd(-1.6, -0.2), i % 3 ? '#b0602c' : '#fcfcfc', 70, 2, 0.03)); // Federn
  }
  draw(ctx) {
    const E = Sprites.S.eagle, s = this.state === 'dive' ? E[0] : E[[0, 1, 2, 1][Math.floor(this.t / 6) % 4]];
    this.ds(ctx, s, Math.round(this.cx - s.w / 2 - W.cam.x), Math.round(this.cy - s.h / 2 - W.cam.y), this.face > 0, this.flash);
  }
}

class Skull extends Enemy {
  constructor(x, y, dir) { super(x, y, 12, 12, 1, 3, 300); this.dir = dir; this.face = dir; this.baseY = y; }
  update() {
    super.update();
    this.x += this.dir * 1.0;
    this.y = this.baseY + Math.sin(this.t * 0.065) * 30;
    this.touch();
    this.despawnOff(40);
    if (this.t > 900) this.dead = true;
  }
  draw(ctx) {
    const s = Sprites.S.skull[Math.floor(this.t / 4) % Sprites.S.skull.length];
    this.ds(ctx, s, Math.round(this.cx - s.w / 2 - W.cam.x), Math.round(this.y - 4 - W.cam.y), this.dir > 0, this.flash);
  }
}

class Skeleton extends Enemy {
  constructor(tx, ty) {
    super(tx * T + 3, (ty + 1) * T - 28, 10, 28, 2, 2, 300);
    this.throwCD = 90 + rnd(0, 60); this.throwT = 0;
  }
  update() {
    super.update();
    const p = W.player, dx = p.cx - this.cx;
    this.face = Math.sign(dx) || this.face;
    if (!this.onScreen(16)) { this.physics(); return; }
    let want = 0;
    if (Math.abs(dx) < 56) want = -this.face; else if (Math.abs(dx) > 100) want = this.face;
    else want = Math.sin(this.t / 40) > 0 ? 1 : -1;
    this.vx = (this.throwT > 0 || !this.groundAhead(want)) ? 0 : want * 0.5;
    if (this.throwT > 0) {
      if (--this.throwT === 6) {
        const speed = clamp(Math.abs(dx) / 62, 0.8, 2.1);
        W.spawn(new EProj('bone', this.cx, this.y - 2, this.face * speed, -4.2, 0.16));
      }
    } else if (--this.throwCD <= 0) { this.throwT = 14; this.throwCD = 110 + rnd(0, 60); }
    this.physics();
    this.touch();
  }
  draw(ctx) {
    const S = Sprites.S;
    const s = this.throwT > 0 ? S.skelThrow : S.skel[Math.floor(this.t / 14) % 2];
    this.spr(ctx, s, this.face < 0, 0, 0, this.flash);
  }
}

class Knight extends Enemy {
  constructor(tx, ty) {
    super(tx * T + 2, (ty + 1) * T - 30, 12, 30, 5, 2, 500);
    this.face = -1;
  }
  hit(dmg, id) {
    const r = super.hit(dmg, id);
    if (r && !this.dead) Phys.moveX(this, -Math.sign(W.player.cx - this.cx) * 3);
    return r;
  }
  update() {
    super.update();
    if (!this.onScreen(32)) { this.physics(); return; }
    const p = W.player;
    if (this.t % 120 === 0 && Math.abs(p.cx - this.cx) < 120 && Math.abs(p.feet - (this.y + this.h)) < 24) this.face = Math.sign(p.cx - this.cx) || this.face;
    if (!this.groundAhead(this.face)) this.face *= -1;
    this.vx = this.face * 0.45;
    if (this.physics()) this.face *= -1;
    this.touch();
  }
  draw(ctx) { this.spr(ctx, Sprites.S.knight[Math.floor(this.t / 16) % 2], this.face < 0, 0, 0, this.flash); }
}

class Fishman extends Enemy {
  constructor(x, waterY) {
    super(x - 5, waterY, 10, 28, 1, 2, 300);
    this.vy = -6.6; this.state = 'jump'; this.shootT = 0; this.shootCD = 80;
    W.splash(x, waterY);
  }
  update() {
    super.update();
    const p = W.player;
    if (this.state === 'jump') {
      this.vy += GRAV;
      this.y += this.vy;
      if (this.vy > 0) {
        this.y -= this.vy;
        if (Phys.moveY(this, this.vy) === 1) { this.state = 'walk'; this.vy = 0; this.face = Math.sign(p.cx - this.cx) || 1; }
      }
    } else {
      if (this.shootT > 0) {
        this.vx = 0;
        if (--this.shootT === 10) { W.spawn(new EProj('fire', this.cx + this.face * 10, this.y + 4, this.face * 1.5, 0, 0)); Audio8.sfx('fire', this.cx); }
      } else {
        this.vx = this.face * 0.5;
        if (--this.shootCD <= 0) { this.shootT = 24; this.shootCD = 140; this.face = Math.sign(p.cx - this.cx) || this.face; }
      }
      if (this.physics()) this.face *= -1;
    }
    const tile = Phys.tile(Math.floor(this.cx / T), Math.floor((this.y + this.h - 4) / T));
    if (tile === '~' && this.vy > 0) { W.splash(this.cx, Math.floor((this.y + this.h - 4) / T) * T); this.kill(true); }
    this.touch();
    if (this.state === 'walk') this.despawnOff(64);
  }
  draw(ctx) {
    const S = Sprites.S;
    const s = this.shootT > 0 ? S.fishShoot : S.fish[this.state === 'jump' ? 2 : Math.floor(this.t / 12) % 2];
    this.spr(ctx, s, this.face < 0, 0, 0, this.flash);
  }
}

class Pillar extends Enemy {
  constructor(tx, ty) {
    super(tx * T + 1, (ty + 1) * T - 32, 14, 32, 6, 2, 400);
    this.cd = 90; this.top = true; this.openT = 0;
  }
  update() {
    super.update();
    const p = W.player;
    this.face = Math.sign(p.cx - this.cx) || this.face;
    if (this.openT > 0) this.openT--;
    if (this.onScreen(-8) && --this.cd <= 0) {
      this.cd = 120; this.openT = 16;
      W.spawn(new EProj('fire', this.cx + this.face * 8, this.y + (this.top ? 8 : 24), this.face * 1.4, 0, 0));
      Audio8.sfx('fire', this.cx);
      this.top = !this.top;
    }
    this.touch();
  }
  draw(ctx) { this.spr(ctx, this.openT > 0 && !this.top ? Sprites.S.pillarOpen : Sprites.S.pillar, this.face < 0, 0, 0, this.flash); }
}

// ---------------- Gegner-Projektile ----------------
class EProj extends Ent {
  constructor(type, x, y, vx, vy, grav, dmg = 2) {
    super(x - 3, y - 3, 6, 6);
    this.type = type; this.kind = 'eproj'; this.vx = vx; this.vy = vy; this.grav = grav; this.dmg = dmg;
  }
  update() {
    this.t++;
    this.vy += this.grav; this.x += this.vx; this.y += this.vy;
    if (this.type === 'page') this.y += Math.sin(this.t * 0.22) * 0.45; // Buchseite flattert
    if (this.type === 'rock') {
      if (this.vy > 0 && Phys.solidTile(Math.floor(this.cx / T), Math.floor((this.y + this.h) / T))) {
        this.dead = true; W.debris(this.cx, this.y + this.h, '#7c7c7c', 5);
      }
    } else if (!this.onScreen(24)) this.dead = true;
    if (this.y > W.room.h * T + 16) this.dead = true;
    if (this.reflected) { // zurückgeschleuderter Feuerball trifft Gegner und Bosse
      for (const e of W.ents) {
        if (e.dead || (e.kind !== 'enemy' && e.kind !== 'boss')) continue;
        if (Phys.hitsEnt(this, e)) { e.hit(3 * Options.dmgMul, ++W.atkId); this.dead = true; W.spawn(new Burst(this.cx, this.cy, true)); break; }
      }
      return;
    }
    const p = W.player;
    if (p.alive && Phys.overlap(this, p)) p.hurt(this.dmg, this.cx);
  }
  draw(ctx) {
    const S = Sprites.S, x = Math.round(this.x - 1 - W.cam.x), y = Math.round(this.y - 1 - W.cam.y);
    if (this.type === 'fire') Sprites.draw(ctx, S.fire[Math.floor(this.t / 4) % 2], x, y, this.vx < 0, this.reflected && (this.t & 2));
    else if (this.type === 'rock') {
      ctx.fillStyle = PAL.G; ctx.fillRect(x - 1, y - 1, 9, 8);
      ctx.fillStyle = PAL.g; ctx.fillRect(x, y, 6, 5);
      ctx.fillStyle = PAL.W; ctx.fillRect(x, y, 3, 1);
    } else if (this.type === 'page') { // fliegende Buchseite: kippt beim Flattern hin und her
      const k = (this.t >> 3) & 1;
      ctx.fillStyle = '#f0e8d0'; ctx.fillRect(x, y + k, 7, 5 - k * 2); ctx.fillStyle = '#c8bca0'; ctx.fillRect(x + (k ? 6 : 0), y + k, 1, 5 - k * 2);
      ctx.fillStyle = '#8c3040'; ctx.fillRect(x + 1, y + 1 + k, 4, 1); if (!k) ctx.fillRect(x + 1, y + 3, 3, 1);
    } else {
      const r = Math.floor(this.t / 5) % 4;
      Sprites.draw(ctx, S.bone, x, y, r === 1 || r === 3);
    }
  }
}

// ---------------- Bewegliche Plattform ----------------
class Platform extends Ent {
  constructor(tx0, tx1, ty) {
    super(tx0 * T, ty * T, 32, 8);
    this.kind = 'platform'; this.x0 = tx0 * T; this.x1 = tx1 * T; this.dir = 1; this.dx = 0; this.dy = 0;
  }
  update() {
    this.t++;
    let nx = this.x + this.dir * 0.6;
    if (nx > this.x1 || nx < this.x0) { this.dir *= -1; nx = this.x + this.dir * 0.6; }
    this.dx = nx - this.x; this.x = nx;
  }
  draw(ctx) {
    const x = Math.round(this.x - W.cam.x), y = Math.round(this.y - W.cam.y);
    ctx.fillStyle = PAL.G; ctx.fillRect(x, y, 32, 8);
    ctx.fillStyle = PAL.W; ctx.fillRect(x, y, 32, 1);
    ctx.fillStyle = PAL.g; ctx.fillRect(x + 1, y + 1, 30, 5);
    ctx.fillStyle = PAL.k; for (let i = 4; i < 32; i += 8) ctx.fillRect(x + i, y + 2, 1, 4);
    ctx.fillStyle = PAL.y; ctx.fillRect(x + 2, y + 6, 28, 1);
  }
}

// ---------------- Spawner-Zonen ----------------
class Spawner {
  constructor(z) { this.z = z; this.timer = z.interval * 0.5; this.kids = []; }
  update() {
    const z = this.z, p = W.player, c = W.cam;
    const center = c.x + View.w / 2;
    if (center < z.x0 * T || center > z.x1 * T || !p.alive || W.camLock) return;
    this.kids = this.kids.filter(k => !k.dead);
    if (this.kids.length >= z.max) return;
    if (++this.timer < z.interval) return;
    this.timer = rnd(0, z.interval * 0.3);
    const e = this['spawn_' + z.type](p, c);
    if (e) { this.kids.push(e); W.spawn(e); }
  }
  spawn_ghoul(p, c) {
    let side = Math.random() < 0.6 ? p.face : -p.face;
    let x = side > 0 ? c.x + View.w - 22 : c.x + 10;
    if (Math.abs(x - p.cx) < 60) { side = -side; x = side > 0 ? c.x + View.w - 22 : c.x + 10; }
    const col = Math.floor((x + 5) / T), row = Math.floor((p.feet + 2) / T);
    if (!Phys.solidTile(col, row) || Phys.solidTile(col, row - 1) || Phys.solidTile(col, row - 2)) return null;
    if (x < 0 || x > W.room.w * T - 16) return null;
    return new Ghoul(x, row * T, -side);
  }
  spawn_skull(p, c) {
    const side = Math.random() < 0.5 ? 1 : -1;
    const x = side > 0 ? c.x + View.w + 2 : c.x - 14;
    return new Skull(x, clamp(p.y + rnd(-14, 10), c.y + 24, c.y + 170), -side);
  }
  spawn_eagle(p, c) { // Seeadler kommt hoch oben vom Bildrand
    const dir = Math.random() < 0.5 ? 1 : -1;
    return new SeaEagle(dir > 0 ? c.x - 24 : c.x + View.w + 6, c.y + rnd(14, 46), dir);
  }
  spawn_sea(p, c) { // Schiff: Fischmenschen springen aus dem Meer über die Reling an Deck
    const deck = W.room.h - 2;
    for (let tries = 0; tries < 6; tries++) {
      const x = p.cx + (Math.random() < 0.5 ? -1 : 1) * rnd(40, 110);
      if (x < c.x + 8 || x > c.x + View.w - 8) continue;
      const col = Math.floor(x / T);
      if (!Phys.solidTile(col, deck) || Phys.tile(col, deck - 1) !== '.' || Phys.tile(col, deck - 2) !== '.') continue;
      return new Fishman(x, W.room.h * T);
    }
    return null;
  }
  spawn_books(p, c) { // Bibliothek: ein Buch löst sich aus der Bücherwand und flattert los
    for (let tries = 0; tries < 6; tries++) {
      const x = c.x + rnd(24, View.w - 24), y = clamp(p.cy - rnd(30, 90), c.y + 20, c.y + 150);
      if (Math.abs(x - p.cx) < 56 || Phys.solidTile(Math.floor(x / T), Math.floor(y / T))) continue;
      return new FlyBook(x, y, { dir: Math.sign(p.cx - x) || 1 });
    }
    return null;
  }
  spawn_fish(p, c) {
    for (let tries = 0; tries < 6; tries++) {
      const x = p.cx + (Math.random() < 0.5 ? -1 : 1) * rnd(36, 100);
      if (x < c.x + 8 || x > c.x + View.w - 8) continue;
      const col = Math.floor(x / T);
      for (let r = 0; r < W.room.h; r++) if (Phys.tile(col, r) === '~') return new Fishman(x, r * T);
    }
    return null;
  }
}

// ---------------- Jaguar (schwarzer Panther wie in Castlevania 1) ----------------
// Liegt lauernd auf Simsen und Galerien. Kommt der Held nahe, duckt er sich fauchend und springt ihn an,
// landet und hetzt weiter; an Kanten springt er erneut.
const PANTHER_SPR = (() => {
  // Schwarzer Panther, gemalt (40×22): schlanker Leib mit Mondlicht-Saum auf Rücken und Kopf, kräftige Schultern,
  // langer geschwungener Schwanz, gelbgrün glühende Augen, Fänge beim Fauchen; Lauf in vier Phasen
  const W0 = 40, H0 = 22, FUR = ['#06030a', '#100a18', '#1c1428', '#2c2240'], RIM = '#6c5ca8', RIM2 = '#b0a0ec', EYE = '#e8f048';
  const frame = (pose, ph = 0) => {
    const c = Sprites.canvas(W0, H0), x = c.getContext('2d');
    const R = (col, a, b, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(b), w, h); };
    const ell = (ex, ey, rx, ry, col) => { for (let y = Math.floor(ey - ry); y <= ey + ry; y++) for (let X = Math.floor(ex - rx); X <= ex + rx; X++) { const q = ((X + 0.5 - ex) / rx) ** 2 + ((y + 0.5 - ey) / ry) ** 2; if (q <= 1) R(q < 0.45 ? FUR[col + 1] || FUR[col] : FUR[col], X, y); } };
    const limb = (x0, y0, x1, y1, x2, y2, w = 2) => { // Ober- und Unterschenkel, Pfote
      for (const [a, b, c2, d] of [[x0, y0, x1, y1], [x1, y1, x2, y2]]) { const n = Math.ceil(Math.hypot(c2 - a, d - b)) * 2; for (let k = 0; k <= n; k++) R(FUR[1], a + (c2 - a) * k / n - w / 2, b + (d - b) * k / n, w, 1); }
      R(FUR[0], x2 - 1, y2, 3, 1);
    };
    const tail = (pts) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = pts[i], [c2, d] = pts[i + 1], n = Math.ceil(Math.hypot(c2 - a, d - b)) * 2; for (let k = 0; k <= n; k++) R(FUR[1], a + (c2 - a) * k / n, b + (d - b) * k / n, i < 2 ? 2 : 1, i < 2 ? 2 : 1); } };
    const head = (hx, hy, open) => {
      ell(hx, hy, 4.3, 3.5, 1); ell(hx + 3.6, hy + 1.2, 2.6, 2, 1); // Schädel, Schnauze
      R(FUR[1], hx - 3, hy - 5, 2, 3); R(FUR[1], hx + 0.5, hy - 5, 2, 3); R('#3c2c4c', hx - 2.5, hy - 4, 1, 1); R('#3c2c4c', hx + 1, hy - 4, 1, 1); // Ohren
      R(EYE, hx + 1, hy - 1, 2, 1); R('#fcfcd0', hx + 2, hy - 1, 1, 1); R('#000', hx + 1.5, hy - 1, 1, 1); // glühendes Auge mit Schlitz
      R('#3c3048', hx + 6, hy + 0.5, 1, 1); // Nase
      if (open) { R('#5c0010', hx + 3, hy + 2.5, 4, 2); R('#a80020', hx + 4, hy + 3, 2, 1); R('#fcfcfc', hx + 4, hy + 2.5, 1, 1); R('#fcfcfc', hx + 6, hy + 2.5, 1, 1); R('#fcfcfc', hx + 5, hy + 4, 1, 1); }
      else R('#0a0610', hx + 3, hy + 2.5, 4, 1);
    };
    if (pose === 'rest') { // liegt lauernd, Kopf erhoben, Schwanz zuckt
      tail([[8, 18], [4, 17], [2, 14], [3, 11], [5, 10]]);
      ell(17, 17, 10, 3.6, 1); ell(24, 15.5, 5, 4, 1);
      limb(25, 17, 29, 19, 33, 20, 2); limb(12, 18, 16, 20, 20, 20, 2);
      head(31, 12, false);
    } else if (pose === 'crouch') { // geduckt, Hinterteil hoch, fauchend
      tail([[8, 11], [4, 9], [1, 10], [0, 13]]);
      ell(16, 14, 9, 4, 1); ell(10, 12.5, 4.5, 4, 1); ell(23, 15, 5, 4, 1);
      limb(11, 15, 9, 18, 11, 20, 2.5); limb(24, 17, 27, 19, 30, 20, 2);
      head(30, 14.5, true);
    } else if (pose === 'leap') { // gestreckt im Sprung, Vorderpfoten mit Krallen voraus
      tail([[7, 9], [3, 8], [1, 10], [0, 13]]);
      ell(18, 9, 11, 3.6, 1); ell(26, 8.5, 5, 3.6, 1);
      limb(27, 10, 31, 12, 36, 11, 2); R('#e8e0d0', 37, 11, 1, 1); R('#e8e0d0', 37, 12, 1, 1); // Krallen
      limb(10, 10, 6, 13, 3, 15, 2.5);
      head(33, 6, true);
    } else { // Galopp in vier Phasen
      const s = [0, 1, 2, 1][ph], gather = ph === 2;
      tail([[8, 10 + s], [4, 8 + s], [1, 8 + s * 2], [0, 11 + s]]);
      ell(18, 11 + s * 0.5, gather ? 9 : 11, 3.6, 1); ell(26, 10.5, 5, 3.8, 1); ell(11, 11, 4, 3.5, 1);
      const fr = [[[27, 13, 30, 17, 34, 20], [25, 13, 27, 17, 28, 20]], [[27, 13, 31, 16, 35, 17], [25, 13, 29, 16, 31, 19]], [[27, 13, 26, 17, 24, 20], [25, 13, 23, 17, 22, 20]], [[27, 13, 29, 17, 30, 20], [25, 13, 24, 17, 26, 20]]][ph];
      const bk = [[[11, 13, 8, 17, 6, 20], [13, 13, 11, 17, 9, 20]], [[11, 13, 6, 15, 3, 16], [13, 13, 9, 16, 6, 18]], [[11, 13, 14, 17, 17, 20], [13, 13, 16, 17, 19, 20]], [[11, 13, 10, 17, 11, 20], [13, 13, 12, 17, 14, 20]]][ph];
      fr.concat(bk).forEach(l => limb(...l, 2));
      head(33, 8 + (ph === 1 ? -1 : 0), ph === 1);
    }
    // Mondlicht-Saum: oberste Pixel jeder Spalte hell, damit der Panther im Dunkeln lesbar bleibt
    const img = x.getImageData(0, 0, W0, H0), d = img.data;
    for (let X = 0; X < W0; X++) {
      let seen = 0;
      for (let y = 0; y < H0; y++) {
        const i = (y * W0 + X) * 4;
        if (!d[i + 3]) { seen = 0; continue; }
        if (seen < 2 && !(d[i] > 200 && d[i + 1] > 200)) { const col = seen === 0 ? [176, 160, 236] : [108, 92, 168]; if (!(d[i] === 232 && d[i + 1] === 240)) { d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; } }
        seen++;
      }
    }
    x.putImageData(img, 0, 0);
    return Sprites.fromCanvas(c);
  };
  return { rest: frame('rest'), crouch: frame('crouch'), leap: frame('leap'), run: [0, 1, 2, 3].map(i => frame('run', i)) };
})();

class Panther extends Enemy {
  constructor(tx, ty) {
    super(tx * T, (ty + 1) * T - 12, 26, 12, 2, 2, 300);
    this.state = 'rest'; this.timer = 0; this.face = -1;
  }
  update() {
    super.update();
    const p = W.player;
    this.timer++;
    if (this.state === 'rest') {
      if (p.alive) this.face = Math.sign(p.cx - this.cx) || this.face;
      this.physics();
      if (p.alive && Math.abs(p.cx - this.cx) < 120 && Math.abs(p.cy - this.cy) < 110) { this.state = 'crouch'; this.timer = 0; Audio8.sfx('growl', this.cx); }
    } else if (this.state === 'crouch') {
      this.physics();
      if (this.timer > 20) { this.state = 'leap'; this.face = Math.sign(p.cx - this.cx) || this.face; this.vx = this.face * 2.7; this.vy = -4.4; this.onGround = false; Audio8.sfx('whoosh', this.cx); }
    } else if (this.state === 'leap') {
      this.vx = this.face * 2.7;
      const wall = this.physics();
      if (wall) this.face *= -1;
      if (this.onGround) { this.state = 'run'; this.timer = 0; W.dust(this.cx, this.y + this.h, 3); }
    } else { // run: hetzt los, springt an Kanten erneut
      this.vx = this.face * 2.9;
      if (this.onGround && !this.groundAhead(this.face) && this.timer > 10) { this.state = 'leap'; this.vy = -3.6; this.onGround = false; }
      else if (this.physics()) this.face *= -1;
      this.despawnOff(80);
    }
    this.touch();
  }
  draw(ctx) {
    const S = PANTHER_SPR, s = this.state === 'rest' ? S.rest : this.state === 'crouch' ? S.crouch : this.state === 'leap' && !this.onGround ? S.leap : S.run[Math.floor(this.t / 3) % S.run.length];
    this.ds(ctx, s, Math.round(this.cx - 20 - W.cam.x), Math.round(this.y + this.h - 21 - W.cam.y), this.face < 0, this.flash);
  }
}

// ---------------- Bibliothek: fliegende Bücher ----------------
// Bücher lösen sich aus den Regalen und schlagen mit den Buchdeckeln wie mit Flügeln; dazwischen fächern sich die Seiten
// auf, ein rotes Lesebändchen flattert hinterher. Ab und zu stoßen sie im Sturzflug auf den Helden herab.
const BOOK_COLS = [['#4c0c14', '#a02830', '#d85048'], ['#101848', '#2c3c8c', '#5068c0'], ['#0c3018', '#1c6430', '#3c9050'], ['#3c2008', '#7c4c1c', '#b07838'], ['#3c0c3c', '#6c2470', '#9c48a0']];
// Fliegende Bücher, gemalt wie kleine 3D-Modelle: der Buchrücken läuft schräg in die Tiefe, die Ledereinbände schlagen
// wie Flügel (Parallelogramme mit Dicke, Licht von oben links, Goldecken, Prägung), dazwischen fächern die Seiten auf.
// Kanten danach pixelhart (Alpha-Schwelle), die Verläufe bleiben – SNES-Look mit PS2-Plastizität.
const BOOK_SPR = BOOK_COLS.map(([d, m, l]) => {
  const W0 = 24, H0 = 20, cx = 9.5, cy = 13, D = [4.4, -4.6], L = 8.5;
  const harden = (c) => { const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), dd = img.data; for (let i = 3; i < dd.length; i += 4) dd[i] = dd[i] < 100 ? 0 : 255; x.putImageData(img, 0, 0); return Sprites.fromCanvas(c); };
  const quad = (x, pts, fill) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) x.lineTo(q[0], q[1]); x.closePath(); x.fillStyle = fill; x.fill(); };
  const mk = (ang, rib) => {
    const c = Sprites.canvas(W0, H0), x = c.getContext('2d');
    const P0 = [cx, cy], P1 = [cx + D[0], cy + D[1]];
    const tip = (s, a, len = L) => [s * len * Math.cos(a), -len * Math.sin(a)];
    // Seitenfächer zwischen den Deckeln (hinten zuerst): cremefarbene Blätter mit Goldschnitt an der Kante
    for (const s of [-1, 1]) for (let k = 1; k >= 0; k--) {
      const a0 = Math.max(ang, 0) + 0.25, a = a0 + (Math.PI / 2 - a0) * (0.18 + k * 0.3), t = tip(s, a, L - 2);
      quad(x, [P0, P1, [P1[0] + t[0], P1[1] + t[1]], [P0[0] + t[0], P0[1] + t[1]]], k % 2 ? '#e4d8bc' : '#f8f0dc');
      x.strokeStyle = '#c8a050'; x.lineWidth = 0.7; x.beginPath(); x.moveTo(P0[0] + t[0], P0[1] + t[1]); x.lineTo(P1[0] + t[0], P1[1] + t[1]); x.stroke();
    }
    for (const s of [-1, 1]) { // Einbände: Leder mit Verlauf (oben hell), Dicke als dunkle Kante, Goldecken, Prägung
      const t = tip(s, ang), up = Math.sin(ang) > 0.2;
      const g = x.createLinearGradient(P0[0], P0[1] - 6, P0[0] + t[0], P0[1] + t[1] + 4);
      g.addColorStop(0, l); g.addColorStop(0.55, m); g.addColorStop(1, d);
      const A = P0, B = P1, C2 = [P1[0] + t[0], P1[1] + t[1]], E = [P0[0] + t[0], P0[1] + t[1]];
      quad(x, [[A[0], A[1] + 1.2], [E[0], E[1] + 1.2], [C2[0], C2[1] + 1.2], [B[0], B[1] + 1.2]], d); // Deckeldicke
      quad(x, [A, B, C2, E], g);
      x.strokeStyle = 'rgba(255,230,160,0.9)'; x.lineWidth = 0.8; x.beginPath(); x.moveTo(E[0], E[1]); x.lineTo(C2[0], C2[1]); x.stroke(); // Goldkante
      for (const q of [E, C2]) { x.fillStyle = '#f0c040'; x.fillRect(q[0] - 1.2, q[1] - 1.2, 2.4, 2.4); x.fillStyle = '#fcf0a0'; x.fillRect(q[0] - 1.2, q[1] - 1.2, 1, 1); } // Eckbeschläge
      const mx = (A[0] + B[0] + C2[0] + E[0]) / 4, my = (A[1] + B[1] + C2[1] + E[1]) / 4; // geprägtes Emblem
      x.fillStyle = up ? '#fce0a8' : '#c8982c'; x.beginPath(); x.arc(mx, my, 1.4, 0, Math.PI * 2); x.fill();
      x.fillStyle = d; x.fillRect(mx - 0.4, my - 0.4, 0.8, 0.8);
    }
    // Rücken mit Goldbünden, Lesebändchen
    x.strokeStyle = d; x.lineWidth = 2.6; x.lineCap = 'round'; x.beginPath(); x.moveTo(P0[0], P0[1] + 0.6); x.lineTo(P1[0], P1[1] + 0.6); x.stroke();
    x.strokeStyle = m; x.lineWidth = 1.4; x.beginPath(); x.moveTo(P0[0], P0[1]); x.lineTo(P1[0], P1[1]); x.stroke();
    for (const k of [0.25, 0.75]) { x.fillStyle = '#f0c040'; x.fillRect(P0[0] + D[0] * k - 1, P0[1] + D[1] * k - 0.5, 2, 1); }
    x.strokeStyle = '#d82828'; x.lineWidth = 1; x.beginPath(); x.moveTo(cx + D[0] * 0.5, cy + D[1] * 0.5 + 1); x.quadraticCurveTo(cx + D[0] * 0.5 + rib, cy + D[1] * 0.5 + 3, cx + D[0] * 0.5 + rib * 1.5, cy + D[1] * 0.5 + 4.5); x.stroke();
    return harden(c);
  };
  const closed = (() => { // zugeklappt auf dem Brett: Quader mit Deckel, Goldschnitt-Seitenblock, Rücken mit Bünden
    const c = Sprites.canvas(W0, H0), x = c.getContext('2d'), y0 = 13, x0 = 5, w = 13, dz = [3, -2.5];
    const g = x.createLinearGradient(x0, y0 - 3, x0 + w, y0); g.addColorStop(0, l); g.addColorStop(1, m);
    quad(x, [[x0, y0], [x0 + w, y0], [x0 + w + dz[0], y0 + dz[1]], [x0 + dz[0], y0 + dz[1]]], g);             // Deckel oben
    quad(x, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + 4], [x0, y0 + 4]], '#f4ecd8');                              // Seitenblock vorn
    for (let k = 1; k < 4; k++) { x.fillStyle = '#c8bca0'; x.fillRect(x0 + 1, y0 + k, w - 2, 0.5); }
    x.fillStyle = '#c8982c'; x.fillRect(x0, y0, w, 0.8);
    quad(x, [[x0 + w, y0], [x0 + w + dz[0], y0 + dz[1]], [x0 + w + dz[0], y0 + 4 + dz[1]], [x0 + w, y0 + 4]], d); // Rücken rechts
    x.fillStyle = '#f0c040'; x.fillRect(x0 + w + 0.5, y0 + 1, 2, 0.8); x.fillRect(x0 + w + 0.5, y0 + 2.6, 2, 0.8);
    x.fillStyle = '#d82828'; x.fillRect(x0 + 4, y0 + 4, 1, 3); // Lesebändchen hängt heraus
    x.fillStyle = '#fce0a8'; x.beginPath(); x.arc(x0 + w / 2 + 1.5, y0 - 1.2, 1.2, 0, Math.PI * 2); x.fill(); // Prägung
    return harden(c);
  })();
  return { fly: [1.05, 0.62, 0.18, -0.3, 0.18, 0.62].map((a, i) => mk(a, i % 3 === 0 ? 0 : i < 3 ? 1 : -1)), dive: mk(1.3, 0), closed };
});

class FlyBook extends Enemy {
  // rest: liegt zugeklappt auf einem Brett und erwacht, wenn der Held näher kommt; sonst löst es sich aus der Bücherwand
  constructor(x, y, opts = {}) {
    super(x - 6, y - 5, 12, 10, 1, 1, 150);
    this.col = opts.col !== undefined ? opts.col : Math.floor(Math.random() * BOOK_COLS.length);
    this.state = opts.rest ? 'rest' : 'emerge'; this.face = opts.dir || -1; this.cd = 70 + rnd(0, 90); this.t2 = 0;
    if (this.state === 'emerge') Audio8.sfx('flap', this.cx);
  }
  update() {
    super.update();
    const p = W.player;
    if (this.state === 'rest') {
      if (p.alive && this.onScreen(0) && Math.abs(p.cx - this.cx) < 84 && Math.abs(p.cy - this.cy) < 90) { this.state = 'wake'; this.t2 = 0; this.face = Math.sign(p.cx - this.cx) || -1; Audio8.sfx('flap', this.cx); W.dust(this.cx, this.y + this.h, 2); }
      return;
    }
    if (this.state === 'wake') { this.y -= Math.max(0, 1.3 - this.t2 * 0.07); if (++this.t2 > 20) { this.state = 'fly'; this.vx = 0; this.vy = -0.3; } this.touch(); return; } // klappt auf und hebt ab
    if (this.state === 'emerge') { this.y -= 0.15; if (this.t > 24) { this.state = 'fly'; this.vx = 0; this.vy = 0; } return; } // tritt aus dem Regal im Hintergrund hervor
    const dx = p.cx - this.cx, dy = p.cy - 10 - this.cy;
    if (this.state === 'fly') { // flattert in Wellen auf den Helden zu
      this.vx = clamp(this.vx + clamp(dx * 0.003, -0.045, 0.045), -1.1, 1.1);
      this.vy = clamp(this.vy + clamp(dy * 0.003, -0.035, 0.035), -0.7, 0.7);
      this.x += this.vx; this.y += this.vy + Math.sin(this.t * 0.17) * 0.6;
      if (p.alive && --this.cd <= 0 && Math.abs(dx) < 100 && Math.abs(dy) < 80) {
        this.state = 'dive'; this.t2 = 0;
        const a = Math.atan2(dy + 10, dx); this.vx = Math.cos(a) * 2.4; this.vy = Math.sin(a) * 2.4;
        Audio8.sfx('flap', this.cx);
      }
    } else { // Sturzflug, dann abfangen
      this.x += this.vx; this.y += this.vy; this.vx *= 0.975; this.vy *= 0.975;
      if (++this.t2 > 42) { this.state = 'fly'; this.cd = 110 + rnd(0, 90); }
    }
    if (Math.abs(this.vx) > 0.1) this.face = Math.sign(this.vx);
    this.touch();
    if (this.t > 1500 || (this.t > 200 && !this.onScreen(96))) this.dead = true;
  }
  kill(silent) {
    super.kill(silent);
    if (!silent) for (let i = 0; i < 9; i++) W.spawn(new Particle(this.cx + rnd(-5, 5), this.cy + rnd(-3, 3), rnd(-1.4, 1.4), rnd(-1.8, -0.3), i % 3 ? '#f0e8d0' : BOOK_COLS[this.col][1], 80, 2, 0.04)); // Seiten stieben auseinander
  }
  draw(ctx) {
    const S = BOOK_SPR[this.col];
    const s = this.state === 'rest' ? S.closed : this.state === 'dive' ? S.dive : S.fly[Math.floor(this.t / (this.state === 'wake' ? 2 : 4)) % 6];
    if (this.state === 'emerge') ctx.globalAlpha = Math.min(1, this.t / 24);
    this.ds(ctx, s, Math.round(this.cx - 12 - W.cam.x), Math.round(this.cy - 10 - W.cam.y), this.face < 0, this.flash);
    ctx.globalAlpha = 1;
  }
}

// Zauberbuch: schwebt, schlägt sich auf – rote Runen glühen – und schleudert Seiten im Fächer; jedes dritte Mal ruft es Bücher herbei
const TOME_SPR = (() => {
  const closed = Sprites.canvas(24, 24), x = closed.getContext('2d'), R = (cx, col, a, b, w, h) => { cx.fillStyle = col; cx.fillRect(a, b, w, h); };
  R(x, '#1c0620', 4, 2, 17, 21); R(x, '#3c1044', 5, 2, 15, 20); R(x, '#541c5c', 6, 3, 2, 18); // Deckel
  R(x, '#e8dcc0', 20, 4, 2, 18); R(x, '#b8ac90', 21, 5, 1, 16); // Seitenschnitt
  R(x, '#c8982c', 5, 2, 15, 1); R(x, '#c8982c', 5, 21, 15, 1); R(x, '#c8982c', 19, 2, 1, 20); R(x, '#c8982c', 5, 2, 1, 20); // Goldrahmen
  [[5, 2], [17, 2], [5, 19], [17, 19]].forEach(([a, b]) => { R(x, '#fce0a8', a, b, 3, 3); R(x, '#8c6414', a + 1, b + 1, 1, 1); });
  R(x, '#e8e0d0', 9, 10, 8, 4); R(x, '#e8e0d0', 10, 9, 6, 1); R(x, '#e8e0d0', 10, 14, 6, 1); R(x, '#a80020', 12, 10, 3, 4); R(x, '#100008', 13, 11, 1, 2); R(x, '#fc7c7c', 12, 10, 1, 1); // Auge
  R(x, '#c8982c', 21, 11, 3, 3); R(x, '#fce0a8', 21, 11, 2, 1); // Schließe
  const open = Sprites.canvas(32, 22), y = open.getContext('2d');
  R(y, '#1c0620', 0, 4, 32, 16); R(y, '#3c1044', 1, 5, 30, 14); // Einband
  R(y, '#f0e8d0', 2, 2, 13, 16); R(y, '#f0e8d0', 17, 2, 13, 16); R(y, '#c8bca0', 14, 2, 1, 16); R(y, '#c8bca0', 17, 2, 1, 16); R(y, '#5c4c3c', 15, 3, 2, 16); // Seiten, Falz
  for (let k = 0; k < 5; k++) { R(y, '#e0283c', 4 + (k % 2), 5 + k * 3, 8 - (k % 3), 1); R(y, '#e0283c', 19 + (k % 3), 5 + k * 3, 8 - (k % 2) * 2, 1); } // Runen
  R(y, '#fc7c8c', 6, 8, 3, 3); R(y, '#e0283c', 7, 9, 1, 1); R(y, '#fc7c8c', 22, 11, 3, 3); R(y, '#e0283c', 23, 12, 1, 1);
  return { closed: Sprites.fromCanvas(closed), open: Sprites.fromCanvas(open) };
})();

class Tome extends Enemy {
  constructor(tx, ty) { super(tx * T - 2, ty * T, 20, 20, 4, 2, 600); this.bx = this.x; this.by = this.y; this.cd = 80; this.openT = 0; this.n = 0; }
  update() {
    super.update();
    const p = W.player;
    this.face = Math.sign(p.cx - this.cx) || this.face;
    this.x = this.bx + Math.sin(this.t * 0.017) * 14; this.y = this.by + Math.sin(this.t * 0.045) * 6;
    if (this.openT > 0) {
      if (--this.openT === 22) this.cast();
      if (this.t % 3 === 0) W.spawn(new Particle(this.cx + rnd(-12, 12), this.y + rnd(0, 6), rnd(-0.2, 0.2), -rnd(0.3, 0.8), Math.random() < 0.5 ? '#fc3c64' : '#fca0cc', 26, 1, -0.01)); // Runenfunken
    } else if (p.alive && this.onScreen(-12) && --this.cd <= 0) { this.openT = 46; this.cd = 150 + rnd(0, 50); Audio8.sfx('tome', this.cx); }
    this.touch();
  }
  cast() {
    const p = W.player;
    if (++this.n % 3 === 0 && W.ents.filter(e => e instanceof FlyBook && !e.dead).length < 5) { // ruft zwei Bücher aus den Regalen
      for (const s of [-1, 1]) W.spawn(new FlyBook(this.cx + s * 22, this.cy - 14, { dir: s }));
      return;
    }
    const a0 = Math.atan2(p.cy - this.cy, p.cx - this.cx);
    for (const da of [-0.32, 0, 0.32]) W.spawn(new EProj('page', this.cx, this.cy, Math.cos(a0 + da) * 1.35, Math.sin(a0 + da) * 1.35, 0, 1));
    Audio8.sfx('page', this.cx);
  }
  kill(silent) {
    super.kill(silent);
    if (!silent) for (let i = 0; i < 16; i++) W.spawn(new Particle(this.cx + rnd(-8, 8), this.cy + rnd(-6, 6), rnd(-1.8, 1.8), rnd(-2.2, -0.4), i % 4 ? '#f0e8d0' : '#fc3c64', 90, 2, 0.035));
  }
  get open() { return this.openT > 0 && this.openT < 44; }
  draw(ctx) {
    const s = this.open ? TOME_SPR.open : TOME_SPR.closed;
    this.ds(ctx, s, Math.round(this.cx - s.w / 2 - W.cam.x), Math.round(this.cy - s.h / 2 - W.cam.y), this.face < 0 && !this.open, this.flash);
  }
}
