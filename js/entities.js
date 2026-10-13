// Physik-Helfer und Spielerfigur.
'use strict';

const T = 16;
const SOLID = new Set(['#', '=', 'X', 'Y', '^']);

const Phys = {
  tile(cx, cy) {
    const r = W.room;
    if (cy < 0 || cy >= r.h || cx < 0 || cx >= r.w) return '.';
    return r.grid[cy][cx];
  },
  solidTile(cx, cy) {
    const r = W.room;
    if (cx < 0 || cx >= r.w) return true;
    if (cy < 0 || cy >= r.h) return false;
    return SOLID.has(r.grid[cy][cx]);
  },
  rectSolid(x, y, w, h) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.001) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.001) / T);
    for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) if (Phys.solidTile(cx, cy)) return true;
    return false;
  },
  moveX(e, dx) {
    e.x += dx;
    const top = Math.floor(e.y / T), bot = Math.floor((e.y + e.h - 0.001) / T);
    if (dx > 0) {
      const c = Math.floor((e.x + e.w - 0.001) / T);
      for (let r = top; r <= bot; r++) if (Phys.solidTile(c, r)) { e.x = c * T - e.w; return true; }
    } else if (dx < 0) {
      const c = Math.floor(e.x / T);
      for (let r = top; r <= bot; r++) if (Phys.solidTile(c, r)) { e.x = (c + 1) * T; return true; }
    }
    return false;
  },
  moveY(e, dy) {
    e.y += dy;
    const l = Math.floor(e.x / T), rr = Math.floor((e.x + e.w - 0.001) / T);
    if (dy > 0) {
      const r = Math.floor((e.y + e.h - 0.001) / T);
      for (let c = l; c <= rr; c++) if (Phys.solidTile(c, r)) { e.y = r * T - e.h; return 1; }
    } else if (dy < 0) {
      const r = Math.floor(e.y / T);
      for (let c = l; c <= rr; c++) if (Phys.solidTile(c, r)) { e.y = (r + 1) * T; return -1; }
    }
    return 0;
  },
  overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },
};

const WALK = 1.3, JUMP = -4.3, GRAV = 0.21, MAXFALL = 4.2, ATK_LEN = 22;
const WHIP_LEN = [0, 26, 26, 42];

class Player {
  constructor() {
    this.w = 10; this.h = 28;
    this.hp = 16; this.hearts = 5; this.sub = null; this.whip = 1;
    this.reset(40, 176);
  }
  reset(fx, fy) {
    this.h = 28; this.x = fx - this.w / 2; this.y = fy - this.h;
    this.vx = 0; this.vy = 0; this.face = 1; this.onGround = true;
    this.state = 'normal'; this.atkT = 0; this.atkSub = false; this.crouch = false; this.crouchAtk = false;
    this.inv = 0; this.walkT = 0; this.jumping = false; this.stair = null; this.stairPos = 0;
    this.stairUpPose = true; this.deadT = 0; this.plat = null; this.powerT = 0;
    this.canDouble = true; this.flipT = 0; this.scarf = null; this.hidden = false;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  get alive() { return this.state !== 'dead'; }

  setCrouch(on) {
    if (on && this.h === 28) { this.y += 8; this.h = 20; }
    else if (!on && this.h === 20) { this.y -= 8; this.h = 28; }
    this.crouch = on;
  }

  tryAttack(wantSub, strict) {
    if (this.atkT > 0) return;
    if (wantSub && this.sub && this.hearts >= 1 && W.subCount() < 2) {
      this.atkSub = true; this.hearts -= 1;
    } else if (strict) return;
    else { this.atkSub = false; Audio8.sfx('whip'); }
    this.atkT = 1; this.atkId = ++W.atkId;
    this.crouchAtk = this.crouch && this.state === 'normal';
  }

  tickAttack() {
    if (this.atkT === 0) return;
    this.atkT++;
    if (this.atkSub && this.atkT === 9) this.throwSub();
    if (!this.atkSub && this.atkT >= 12 && this.atkT <= 17) this.whipHits();
    if (this.atkT > ATK_LEN) this.atkT = 0;
  }
  get atkPose() { return this.atkT < 7 ? 0 : this.atkT < 12 ? 1 : 2; }

  spriteTop(spr) { return this.y + this.h - spr.h; }

  whipBox() {
    const len = WHIP_LEN[this.whip];
    const top = this.feet - (this.crouchAtk ? 24 : 32);
    const sx = this.x - 3;
    return { x: this.face > 0 ? sx + 15 : sx + 1 - len, y: top + 5, w: len, h: 8 };
  }

  whipHits() {
    const box = this.whipBox();
    const dmg = this.whip >= 2 ? 2 : 1;
    W.whipAt(box, dmg, this.atkId, this.face);
  }

  throwSub() {
    const hy = this.feet - (this.crouchAtk ? 24 : 32) + 8;
    W.spawn(new SubWeapon(this.sub, this.cx + this.face * 6, hy, this.face));
    Audio8.sfx(this.sub === 'axe' ? 'axe' : 'throw');
  }

  hurt(dmg, srcX) {
    if (this.inv > 0 || !this.alive || W.cleared) return;
    this.hp -= dmg;
    Audio8.sfx('hurt');
    if (this.hp <= 0) { this.hp = 0; this.die(); return; }
    this.inv = 100;
    if (this.state === 'stairs' || this.state === 'toStair') { if (this.state === 'toStair') this.state = 'normal'; return; }
    const dir = srcX < this.cx ? 1 : -1;
    this.setCrouch(false);
    this.state = 'hurt'; this.atkT = 0;
    this.vx = dir * 1.1; this.vy = -3.4; this.face = -dir; this.onGround = false;
  }

  die(silent) {
    if (!this.alive) return;
    this.setCrouch(false);
    this.state = 'dead'; this.deadT = 0; this.atkT = 0; this.vx = 0; this.vy = silent ? 0 : -2.5;
    this.onGround = false; this.inv = 0; this.hidden = !!silent;
    Audio8.stop(); Audio8.sfx('die');
  }

  findStair(top) {
    for (const s of W.stairs) {
      const ex = top ? s.tx : s.bx, ey = top ? s.ty : s.by;
      if (Math.abs(this.feet - ey) < 2 && Math.abs(this.cx - ex) <= 16) return s;
    }
    return null;
  }

  placeOnStair() {
    const s = this.stair;
    this.x = s.bx + s.dir * this.stairPos - this.w / 2;
    this.y = s.by - this.stairPos - this.h;
  }

  update() {
    const I = Input.held, P = Input.pressed;
    if (this.powerT > 0) this.powerT--;
    if (this.flipT > 0) this.flipT--;
    if (this.state === 'dead') return this.updateDead();
    if (this.inv > 0) this.inv--;

    if (this.state === 'stairs') return this.updateStairs(I, P);
    if (this.state === 'toStair') return this.updateToStair(I);

    if (this.plat) { Phys.moveX(this, this.plat.dx); this.plat = null; }

    if (this.state === 'hurt') {
      this.vy = Math.min(this.vy + GRAV, MAXFALL);
      Phys.moveX(this, this.vx);
      const r = Phys.moveY(this, this.vy);
      if (r === 1) { this.state = 'normal'; this.vx = 0; this.vy = 0; this.onGround = true; }
      else if (r === -1) this.vy = 0;
      this.checkPlatforms();
      this.hazards();
      return;
    }

    // Angriff
    if (P.sub) this.tryAttack(true, true);
    else if (P.attack) this.tryAttack(I.up, false);
    this.tickAttack();

    // Ducken
    if (this.atkT === 0) this.setCrouch(this.onGround && I.down && !this.findStair(true));

    // Treppen betreten
    if (this.onGround && this.atkT === 0) {
      const s = I.up ? this.findStair(false) : I.down ? this.findStair(true) : null;
      if (s) {
        this.setCrouch(false);
        this.state = 'toStair'; this.stair = s; this.stairPos = I.up ? 0 : s.len;
        this.stairTarget = I.up ? s.bx : s.tx;
        return this.updateToStair(I);
      }
    }

    const mx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (this.onGround) {
      if (this.atkT > 0 || this.crouch) this.vx = 0;
      else { this.vx = mx * WALK; if (mx) this.face = mx; }
      if (P.jump && this.atkT === 0) {
        this.setCrouch(false);
        this.vy = JUMP; this.onGround = false; this.jumping = true;
      }
    } else {
      this.vx = mx * WALK;
      if (mx && this.atkT === 0) this.face = mx;
      if (P.jump && this.canDouble) { // Doppelsprung (einmal pro Luftphase)
        this.canDouble = false; this.vy = JUMP * 0.92; this.jumping = true;
        if (this.atkT === 0) this.flipT = 20;
        Audio8.sfx('djump'); W.puff(this.cx, this.feet);
      }
      if (!I.jump && this.vy < -1.6) this.vy = -1.6;
    }
    if (this.vx !== 0 && this.onGround) this.walkT++; else if (this.onGround) this.walkT = 0;

    this.vy = Math.min(this.vy + GRAV, MAXFALL);
    Phys.moveX(this, this.vx);
    const wasGround = this.onGround;
    const r = Phys.moveY(this, this.vy);
    this.onGround = r === 1;
    if (r !== 0) { this.vy = 0; }
    if (this.onGround) { this.jumping = false; this.canDouble = true; this.flipT = 0; }
    this.checkPlatforms();
    if (!this.onGround && wasGround && !this.jumping && this.vy > 0) this.vx = 0;
    this.clampRoom();
    this.hazards();
  }

  checkPlatforms() {
    if (this.vy < 0) return;
    for (const p of W.platforms) {
      const prevFeet = this.feet - this.vy - 0.5;
      if (this.x + this.w > p.x && this.x < p.x + p.w && prevFeet <= p.y + 1 && this.feet >= p.y && this.feet <= p.y + 8) {
        this.y = p.y - this.h; this.vy = 0; this.onGround = true; this.jumping = false; this.canDouble = true; this.flipT = 0;
        if (this.state === 'hurt') { this.state = 'normal'; this.vx = 0; }
        this.plat = p;
      }
    }
  }

  clampRoom() {
    const lock = W.camLock && W.room.arena;
    const minX = lock ? W.room.arena.x0 * T : 0;
    const maxX = lock ? W.room.arena.x0 * T + 256 : W.room.w * T;
    if (this.x < minX) this.x = minX;
    if (this.x + this.w > maxX) this.x = maxX - this.w;
  }

  hazards() {
    const fc = Math.floor(this.cx / T);
    if (Phys.tile(fc, Math.floor((this.feet - 6) / T)) === '~') {
      W.splash(this.cx, Math.floor((this.feet - 6) / T) * T);
      this.die(true); return;
    }
    if (this.onGround && Phys.tile(fc, Math.floor((this.feet + 1) / T)) === '^') {
      this.hurt(4, this.cx - this.face);
      if (this.state === 'hurt') { this.vy = -4.6; this.vx = -this.face * 1.3; }
    }
    if (this.y > W.room.h * T + 8) this.die(true);
  }

  updateDead() {
    this.deadT++;
    if (!this.onGround && !this.hidden) {
      this.vy = Math.min(this.vy + 0.25, 4);
      if (Phys.moveY(this, this.vy) === 1) { this.onGround = true; this.vy = 0; }
      if (this.y > W.room.h * T + 8) this.hidden = true;
    }
    if (this.deadT === 170) W.playerDied();
  }

  updateToStair(I) {
    const d = this.stairTarget - this.cx;
    if (Math.abs(d) <= 1.3) {
      this.x += d; this.state = 'stairs'; this.atkT = 0; this.onGround = false;
      this.stairUpPose = this.stairPos === 0;
      this.face = this.stairUpPose ? this.stair.dir : -this.stair.dir;
      this.placeOnStair();
      return;
    }
    if (!(I.up || I.down)) { this.state = 'normal'; return; }
    this.face = Math.sign(d); this.x += Math.sign(d) * 1.3; this.walkT++;
  }

  updateStairs(I, P) {
    const s = this.stair;
    if (P.sub) this.tryAttack(true, true);
    else if (P.attack) this.tryAttack(I.up, false);
    if (this.atkT > 0) { this.tickAttack(); return; }
    let m = 0;
    if (I.up || (s.dir > 0 ? I.right : I.left)) m = 1;
    else if (I.down || (s.dir > 0 ? I.left : I.right)) m = -1;
    if (m) {
      this.stairPos += m * 0.95;
      this.face = m > 0 ? s.dir : -s.dir;
      this.stairUpPose = m > 0;
      if (this.stairPos >= s.len || this.stairPos <= 0) {
        this.stairPos = Math.max(0, Math.min(s.len, this.stairPos));
        this.placeOnStair();
        this.state = 'normal'; this.onGround = true; this.vy = 0; this.walkT = 0;
        return;
      }
    }
    this.placeOnStair();
  }

  sprite() {
    const H = Sprites.S.hero, p = this.atkPose;
    if (this.state === 'dead') return this.onGround ? H.dead : H.hurt;
    if (this.state === 'hurt') return H.hurt;
    if (this.state === 'stairs') {
      if (this.atkT) return (this.stairUpPose ? H.satkUp : H.satkDown)[p];
      return (Math.floor(this.stairPos / 8) % 2) ? H.stand : (this.stairUpPose ? H.stairUp : H.stairDown);
    }
    if (this.atkT) return (this.crouchAtk ? H.catk : H.atk)[p];
    if (this.state === 'toStair') return [H.walk1, H.walk2, H.stand, H.walk2][Math.floor(this.walkT / 7) % 4];
    if (!this.onGround) return this.jumping && this.vy > -3 && this.vy < 2.5 ? H.crouch : H.stand;
    if (this.crouch) return H.crouch;
    if (this.vx !== 0) return [H.walk2, H.walk1, H.walk2, H.stand][Math.floor(this.walkT / 7) % 4];
    return H.stand;
  }

  draw(ctx, cam) {
    if (this.hidden) return;
    if (this.inv > 0 && this.alive && (W.frame & 2)) return;
    const spr = this.sprite();
    const flash = this.powerT > 0 && (W.frame & 4);
    if (spr === Sprites.S.hero.dead) {
      Sprites.draw(ctx, spr, this.cx - 16 - cam.x, this.feet - spr.h - cam.y, this.face < 0);
      return;
    }
    this.drawScarf(ctx, cam);
    if (this.flipT > 0 && !this.atkT && this.state === 'normal' && !this.onGround) { // Salto beim Doppelsprung
      const c = Sprites.S.hero.crouch, step = Math.floor((20 - this.flipT) / 5) % 4;
      ctx.save();
      ctx.translate(Math.round(this.cx - cam.x), Math.round(this.feet - 14 - cam.y));
      ctx.rotate(step * Math.PI / 2 * this.face);
      ctx.drawImage(this.face < 0 ? c.f : c.c, -8 - c.pad, -12 - c.pad);
      ctx.restore();
      return;
    }
    const sx = Math.round(this.x - 3 - cam.x), sy = Math.round(this.feet - spr.h - cam.y);
    Sprites.draw(ctx, spr, sx, sy, this.face < 0, flash);
    if (this.atkT && !this.atkSub) this.drawWhip(ctx, sx, sy);
  }

  // Wehender Schal: Kette von Punkten, die dem Hals mit Verzögerung folgt.
  updateScarf() {
    if (!this.alive) { this.scarf = null; return; }
    const low = this.h === 20 || (this.atkT && this.crouchAtk);
    const ax = this.cx - this.face * 3, ay = this.feet - (low ? 17 : 25);
    if (!this.scarf) this.scarf = Array.from({ length: 8 }, (_, i) => ({ x: ax - this.face * i * 2, y: ay + i * 0.4 }));
    const s = this.scarf;
    s[0].x = ax; s[0].y = ay;
    const t = W.frame * 0.22, speed = Math.abs(this.vx) + Math.abs(this.vy) * 0.5;
    for (let i = 1; i < s.length; i++) {
      const tx = s[i - 1].x - this.face * (1.6 + speed * 0.5) - this.vx * 0.3;
      const ty = s[i - 1].y + 0.9 - speed * 0.35 + Math.sin(t + i * 0.8) * (0.4 + speed * 0.35) - this.vy * 0.12;
      s[i].x += (tx - s[i].x) * 0.5; s[i].y += (ty - s[i].y) * 0.5;
    }
  }

  drawScarf(ctx, cam) {
    if (!this.scarf) return;
    const s = this.scarf;
    for (let i = s.length - 1; i >= 1; i--) {
      const x = Math.round(s[i].x - cam.x), y = Math.round(s[i].y - cam.y), w = i > 5 ? 1 : 2;
      ctx.fillStyle = PAL.R; ctx.fillRect(x, y + 1, w, w);
      ctx.fillStyle = i % 3 === 0 ? PAL.m : PAL.r; ctx.fillRect(x, y, w, w);
    }
  }

  drawWhip(ctx, sx, sy) {
    const p = this.atkPose, lvl = this.whip;
    ctx.save();
    if (this.face < 0) { ctx.translate(sx * 2 + 16, 0); ctx.scale(-1, 1); }
    const link = (x, y, i) => {
      if (lvl === 1) { ctx.fillStyle = i % 3 === 0 ? PAL.B : PAL.b; ctx.fillRect(x, y, 2, 2); }
      else { ctx.fillStyle = i % 2 ? PAL.g : PAL.W; ctx.fillRect(x, y, 2, 2); }
    };
    const ball = (x, y) => {
      ctx.fillStyle = PAL.W; ctx.fillRect(x, y - 2, 5, 5);
      ctx.fillStyle = PAL.w; ctx.fillRect(x + 1, y - 1, 2, 2);
      ctx.fillStyle = PAL.g; ctx.fillRect(x + 2, y - 4, 1, 2); ctx.fillRect(x + 2, y + 3, 1, 2); ctx.fillRect(x + 5, y, 2, 1);
    };
    if (p === 0) {
      for (let i = 0; i < 9; i++) link(sx + 1 - i, sy + 3 + i * 1.2, i);
      if (lvl === 3) ball(sx - 10, sy + 13);
    } else if (p === 1) {
      for (let i = 0; i < 9; i++) link(sx + 9 - i * 1.4, sy - i * 0.6, i);
      if (lvl === 3) ball(sx - 6, sy - 7);
    } else {
      const len = WHIP_LEN[lvl];
      for (let i = 0; i < len; i += 2) link(sx + 15 + i, sy + 8, i / 2);
      if (lvl === 3) ball(sx + 13 + len, sy + 9);
    }
    ctx.restore();
  }
}
