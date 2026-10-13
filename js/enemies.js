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
    Sprites.draw(ctx, s, Math.round(this.cx - s.w / 2 + ox - W.cam.x), Math.round(this.y + this.h - s.h + oy - W.cam.y), flip, flash);
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
  orb: () => Sprites.S.orb[Math.floor(W.frame / 8) % 2],
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
      case 'roast': p.hp = Math.min(p.maxHp, p.hp + p.maxHp / 2); Audio8.sfx('bigItem'); W.popup(this.cx, this.y, '+LEBEN', '#f8b800'); break;
      case 'oneUp': W.lives++; Audio8.sfx('oneUp'); W.popup(this.cx, this.y, '1UP', '#3cbcfc'); break;
      case 'rosary': W.rosary(); Audio8.sfx('rosary'); break;
      case 'orb': p.hp = p.maxHp; Audio8.sfx('orb'); W.stageClear(); break;
      default: p.sub = this.type; Audio8.sfx('item'); break;
    }
  }
}

function rollDrop(drop) {
  const p = W.player;
  const map = { '1': 'dagger', '2': 'axe', '3': 'holy', '4': 'cross', W: 'whip', H: 'heartB', R: 'rosary', $: 'bag', U: 'oneUp' };
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
  }
  hit() {
    if (this.dead) return;
    this.dead = true;
    Audio8.sfx('candle');
    W.spawn(new Burst(this.cx, this.cy));
    W.sparks(this.cx, this.y + 2, 5);
    W.spawn(new Item(rollDrop(this.drop), this.cx, this.cy));
  }
  draw(ctx) {
    const s = (this.torch ? Sprites.S.torch : Sprites.S.candle)[Math.floor(this.t / 8) % 2];
    Sprites.draw(ctx, s, Math.round(this.x - W.cam.x), Math.round(this.y - W.cam.y));
  }
}

// ---------------- Sub-Waffen ----------------
class SubWeapon extends Ent {
  constructor(type, x, y, face) {
    const dims = { dagger: [14, 5], axe: [12, 12], holy: [8, 10], cross: [13, 13] }[type];
    super(x - dims[0] / 2, y - dims[1] / 2, dims[0], dims[1]);
    this.type = type; this.face = face; this.kind = 'sub'; this.hits = new Map();
    if (type === 'dagger') { this.vx = face * 4.2; this.dmg = 2; this.cd = 999; }
    if (type === 'axe') { this.vx = face * 1.7; this.vy = -5.4; this.dmg = 3; this.cd = 20; }
    if (type === 'holy') { this.vx = face * 1.7; this.vy = -2; this.dmg = 1; this.cd = 12; this.burnT = -1; }
    if (type === 'cross') { this.vx = face * 3.4; this.dmg = 2; this.cd = 20; this.back = false; }
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
          this.burnT = 0; Audio8.sfx('holy');
          this.x = this.cx - 12; this.w = 24; this.y = this.y + this.h - 14; this.h = 14;
        }
      } else {
        if (++this.burnT > 75) this.dead = true;
        if (this.burnT % 10 === 0) Audio8.sfx('flameTick');
      }
    } else if (tp === 'cross') {
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
    } else {
      const s = this.type === 'axe' ? S.axe : S.cross;
      ctx.save();
      ctx.translate(x + this.w / 2, y + this.h / 2);
      ctx.rotate((Math.floor(this.t / 4) % 4) * Math.PI / 2 * this.face);
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
    if (this.hp <= 0) this.kill(); else Audio8.sfx('hit');
    return true;
  }
  kill(silent) {
    this.dead = true;
    if (silent) return;
    Audio8.sfx('kill');
    W.spawn(new Burst(this.cx, this.cy));
    W.sparks(this.cx, this.cy, 9);
    W.addScore(this.score, this.cx, this.y);
    if (Math.random() < 0.1) W.spawn(new Item('heartS', this.cx, this.cy));
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
    super(x, groundY - 24, 10, 24, 1, 2, 100);
    this.dir = dir; this.face = dir; this.rise = 0; this.groundY = groundY;
    Audio8.sfx('rise');
  }
  update() {
    super.update();
    if (this.rise < 25) { this.rise += 0.7; if (this.rise > 12) this.touch(); return; }
    this.vx = this.dir * 0.55;
    if (this.physics()) { this.dir *= -1; this.face = this.dir; }
    this.touch();
    this.despawnOff();
    if (!this.onScreen(64)) this.dead = true;
  }
  draw(ctx) {
    const s = Sprites.S.ghul[Math.floor(this.t / 12) % 2];
    if (this.rise < 25) {
      const sy = Math.round(this.groundY - this.rise - W.cam.y), sx = Math.round(this.cx - 8 - W.cam.x);
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
        Audio8.sfx('bat');
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
    const B = Sprites.S.bat;
    const s = this.state === 'perch' ? B.perch : B.fly[Math.floor(this.t / 6) % 2];
    Sprites.draw(ctx, s, Math.round(this.cx - 8 - W.cam.x), Math.round(this.y - W.cam.y - 1), false, this.flash);
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
    Sprites.draw(ctx, Sprites.S.skull[Math.floor(this.t / 5) % 2], Math.round(this.cx - 8 - W.cam.x), Math.round(this.y - 4 - W.cam.y), this.dir > 0, this.flash);
  }
}

class Skeleton extends Enemy {
  constructor(tx, ty) {
    super(tx * T + 3, (ty + 1) * T - 22, 10, 22, 2, 2, 300);
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
        W.spawn(new EProj('bone', this.cx, this.y + 2, this.face * speed, -4.2, 0.16));
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
    super(tx * T + 2, (ty + 1) * T - 24, 12, 24, 5, 2, 500);
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
    super(x - 5, waterY, 10, 22, 1, 2, 300);
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
        if (--this.shootT === 10) { W.spawn(new EProj('fire', this.cx + this.face * 8, this.y + 5, this.face * 1.5, 0, 0)); Audio8.sfx('fire'); }
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
    const s = this.shootT > 0 ? S.fishShoot : S.fish[this.state === 'jump' ? 0 : Math.floor(this.t / 12) % 2];
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
      Audio8.sfx('fire');
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
    if (this.type === 'rock') {
      if (this.vy > 0 && Phys.solidTile(Math.floor(this.cx / T), Math.floor((this.y + this.h) / T))) {
        this.dead = true; W.debris(this.cx, this.y + this.h, '#7c7c7c', 5);
      }
    } else if (!this.onScreen(24)) this.dead = true;
    if (this.y > W.room.h * T + 16) this.dead = true;
    const p = W.player;
    if (p.alive && Phys.overlap(this, p)) p.hurt(this.dmg, this.cx);
  }
  draw(ctx) {
    const S = Sprites.S, x = Math.round(this.x - 1 - W.cam.x), y = Math.round(this.y - 1 - W.cam.y);
    if (this.type === 'fire') Sprites.draw(ctx, S.fire[Math.floor(this.t / 4) % 2], x, y, this.vx < 0);
    else if (this.type === 'rock') {
      ctx.fillStyle = PAL.G; ctx.fillRect(x - 1, y - 1, 9, 8);
      ctx.fillStyle = PAL.g; ctx.fillRect(x, y, 6, 5);
      ctx.fillStyle = PAL.W; ctx.fillRect(x, y, 3, 1);
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
