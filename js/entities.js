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
const SWORD_LEN = [0, 20, 22, 30];

class Player {
  constructor() {
    this.w = 10; this.h = 28;
    this.H = HEROES.get(Options.character); this.def = this.H.def; this.sword = this.def.weapon === 'sword';
    this.maxHp = Options.maxHp; this.hp = this.maxHp;
    this.hearts = Options.infHearts ? 99 : 5; this.sub = null; this.whip = Options.maxWhip ? 3 : 1;
    this.reset(40, 176);
  }
  reset(fx, fy) {
    this.h = 28; this.x = fx - this.w / 2; this.y = fy - this.h;
    this.vx = 0; this.vy = 0; this.face = 1; this.onGround = true;
    this.state = 'normal'; this.atkT = 0; this.atkSub = false; this.crouch = false; this.crouchAtk = false;
    this.inv = 0; this.walkT = 0; this.jumping = false; this.stair = null; this.stairPos = 0;
    this.stairUpPose = true; this.deadT = 0; this.plat = null; this.powerT = 0;
    this.canDouble = true; this.flipT = 0; this.scarf = null; this.hidden = false;
    this.chargeT = 0; this.crashT = 0; this.landT = 0; this.lastSafe = { cx: fx, feet: fy };
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
      this.atkSub = true; if (!Options.infHearts) this.hearts -= 1;
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
    const top = this.feet - (this.crouchAtk ? 24 : 32);
    const sx = this.x - 3;
    if (this.sword) { // kürzer, aber hoher Hiebbogen
      const len = SWORD_LEN[this.whip];
      return { x: this.face > 0 ? sx + 11 : sx + 5 - len, y: top - 4, w: len, h: 22 };
    }
    const len = WHIP_LEN[this.whip];
    return { x: this.face > 0 ? sx + 15 : sx + 1 - len, y: top + 5, w: len, h: 8 };
  }

  whipHits() {
    const box = this.whipBox();
    const dmg = (this.whip >= 2 ? 2 : 1) * Options.dmgMul;
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
    Audio8.sfx('hurt'); Input.rumble(0.45, 0.7, 200);
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
    Audio8.stop(); Audio8.sfx('die'); Input.rumble(1, 1, 600);
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
    if (this.landT > 0) this.landT--;
    if (this.state === 'dead') return this.updateDead();
    if (this.inv > 0) this.inv--;
    if (this.crashT > 0) this.crashT--;
    this.updateCharge(I);

    if (this.state === 'stairs') return this.updateStairs(I, P);
    if (this.state === 'toStair') return this.updateToStair(I);

    if (this.plat) { Phys.moveX(this, this.plat.dx); this.y += this.plat.dy || 0; this.plat = null; }

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
    if (this.vx !== 0 && this.onGround) { this.walkT++; if (this.walkT % 20 === 1) W.dust(this.cx - this.face * 4, this.feet, 1); } else if (this.onGround) this.walkT = 0;

    this.vy = Math.min(this.vy + GRAV, MAXFALL);
    Phys.moveX(this, this.vx);
    const wasGround = this.onGround;
    const r = Phys.moveY(this, this.vy);
    this.onGround = r === 1;
    if (this.onGround && !wasGround && this.vy > 2.4) { this.landT = 7; W.dust(this.cx, this.feet, 5); }
    if (r !== 0) { this.vy = 0; }
    if (this.onGround) { this.jumping = false; this.canDouble = true; this.flipT = 0; }
    this.checkPlatforms();
    if (!this.onGround && wasGround && !this.jumping && this.vy > 0) this.vx = 0;
    this.clampRoom();
    this.hazards();
    this.trackSafe();
  }

  checkPlatforms() {
    if (this.vy < 0) return;
    for (const p of W.platforms) {
      if (p.solid === false) continue;
      const prevFeet = this.feet - this.vy - 0.5;
      if (this.x + this.w > p.x && this.x < p.x + p.w && prevFeet <= p.y + 3 && this.feet >= p.y - 0.5 && this.feet <= p.y + 10) {
        if (p.onStand) p.onStand();
        this.y = p.y - this.h; this.vy = 0; this.onGround = true; this.jumping = false; this.canDouble = true; this.flipT = 0;
        if (this.state === 'hurt') { this.state = 'normal'; this.vx = 0; }
        this.plat = p;
      }
    }
  }

  clampRoom() {
    const lock = W.camLock && W.arenaW;
    const minX = lock ? W.arenaX : 0;
    const maxX = lock ? W.arenaX + W.arenaW : W.room.w * T;
    if (this.x < minX) this.x = minX;
    if (this.x + this.w > maxX) this.x = maxX - this.w;
  }

  // Wasser, Stacheln und Abgründe kosten Leben und setzen auf den letzten sicheren Stand zurück.
  hazards() {
    const fc = Math.floor(this.cx / T);
    if (Phys.tile(fc, Math.floor((this.feet - 6) / T)) === '~') {
      W.splash(this.cx, Math.floor((this.feet - 6) / T) * T);
      return this.fallPenalty(4);
    }
    if (this.onGround && Phys.tile(fc, Math.floor((this.feet + 1) / T)) === '^') return this.fallPenalty(3);
    if (this.y > W.room.h * T + 8) this.fallPenalty(4);
  }

  fallPenalty(dmg) {
    if (!this.alive || W.cleared) return;
    if (this.hp <= dmg) { this.hp = 0; this.die(true); return; }
    this.hp -= dmg;
    Audio8.sfx('hurt'); Input.rumble(0.5, 0.8, 250);
    const s = this.lastSafe;
    this.setCrouch(false);
    this.state = 'normal'; this.atkT = 0; this.vx = 0; this.vy = 0; this.flipT = 0; this.plat = null;
    this.x = s.cx - this.w / 2; this.y = s.feet - this.h; this.onGround = true; this.inv = 120;
    W.popup(this.cx, this.y - 6, '-' + dmg, '#fc7460'); W.puff(this.cx, this.feet); W.shake = 6;
  }

  trackSafe() {
    if (!this.onGround || this.plat || this.state !== 'normal') return;
    const row = Math.floor((this.feet + 1) / T);
    const ok = (c) => { const ch = Phys.tile(c, row); return ch === '#' || ch === '='; };
    if (ok(Math.floor((this.x - 3) / T)) && ok(Math.floor((this.x + this.w + 3) / T))) this.lastSafe = { cx: this.cx, feet: this.feet };
  }

  // Sub-Taste halten (ab 10 Herzen) lädt den „Heiligen Sturm“; Loslassen entfesselt ihn.
  updateCharge(I) {
    const can = this.sub && this.hearts >= 10 && (this.state === 'normal' || this.state === 'stairs');
    if (I.sub && can && this.atkT === 0) {
      this.chargeT++;
      if (this.chargeT === 50) Audio8.sfx('ready');
      if (this.chargeT > 14 && W.frame % 3 === 0) {
        const a = W.frame * 0.4;
        W.spawn(new Particle(this.cx + Math.cos(a) * 12, this.cy + Math.sin(a) * 16, -Math.cos(a) * 0.5, -Math.sin(a) * 0.5, this.chargeT >= 50 ? '#fcfcfc' : '#f8b800', 16, 1, 0));
      }
    } else {
      if (this.chargeT >= 50 && !I.sub && can) this.itemCrash();
      this.chargeT = 0;
    }
  }

  itemCrash() {
    if (!Options.infHearts) this.hearts -= 10;
    this.chargeT = 0; this.crashT = 34;
    this.inv = Math.max(this.inv, 110);
    W.startCrash(this.sub, this);
    Audio8.sfx('crash'); Input.rumble(1, 1, 450);
    W.flash = 8; W.shake = 14;
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
    const H = this.H, p = this.atkPose;
    if (this.state === 'dead') return this.onGround ? H.dead : H.hurt;
    if (this.state === 'hurt') return H.hurt;
    if (this.state === 'stairs') {
      if (this.atkT) return (this.stairUpPose ? H.satkUp : H.satkDown)[p];
      return (this.stairUpPose ? H.stairUp : H.stairDown)[Math.floor(this.stairPos / 8) % 2];
    }
    if (this.crashT > 0) return H.atk[2];
    if (this.atkT) return (this.crouchAtk ? H.catk : H.atk)[p];
    if (this.state === 'toStair') return H.walk[Math.floor(this.walkT / 5) % 8];
    if (!this.onGround) return this.vy < 0.6 ? H.jumpUp : H.jumpFall;
    if (this.crouch) return H.crouch;
    if (this.landT > 0) return H.land;
    if (this.vx !== 0) return H.walk[Math.floor(this.walkT / 5) % 8];
    if (W.frame % 230 < 7) return H.blink;
    return H.idle[Math.floor(W.frame / 40) % 2];
  }

  draw(ctx, cam) {
    if (this.hidden) return;
    if (this.inv > 0 && this.alive && (W.frame & 2)) return;
    const spr = this.sprite();
    const flash = (this.powerT > 0 || this.chargeT >= 50 || this.crashT > 0) && (W.frame & 4);
    if (spr === this.H.dead) {
      Sprites.draw(ctx, spr, this.cx - 16 - cam.x, this.feet - spr.h - cam.y, this.face < 0);
      return;
    }
    this.drawScarf(ctx, cam);
    if (this.flipT > 0 && !this.atkT && this.state === 'normal' && !this.onGround) { // Salto beim Doppelsprung
      const c = this.H.crouch, step = Math.floor((20 - this.flipT) / 5) % 4;
      ctx.save();
      ctx.translate(Math.round(this.cx - cam.x), Math.round(this.feet - 12 - cam.y));
      ctx.rotate(step * Math.PI / 2 * this.face);
      ctx.drawImage(this.face < 0 ? c.f : c.c, -10 - c.pad, -20 - c.pad);
      ctx.restore();
      return;
    }
    const sx = Math.round(this.x - 3 - cam.x), sy = Math.round(this.feet - spr.h - cam.y);
    Sprites.draw(ctx, spr, sx - (spr.mx || 0), sy, this.face < 0, flash);
    if (this.atkT && !this.atkSub) (this.sword ? this.drawSword(ctx, sx, sy) : this.drawWhip(ctx, sx, sy));
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
    const s = this.scarf, sc = this.def.scarf;
    for (let i = s.length - 1; i >= 1; i--) {
      const x = Math.round(s[i].x - cam.x), y = Math.round(s[i].y - cam.y), w = i > 5 ? Math.max(1, sc.w - 1) : sc.w;
      ctx.fillStyle = sc.d; ctx.fillRect(x, y + 1, w, w);
      ctx.fillStyle = i % 3 === 0 ? sc.b : sc.a; ctx.fillRect(x, y, w, w);
    }
  }

  // Breitschwert (Ragnor): Bronze → Stahl → Flammenschwert, mit Hiebbogen-Schweif
  drawSword(ctx, sx, sy) {
    const p = this.atkPose, lvl = this.whip;
    const blade = ['', '#c89040', '#a8b0c8', '#fcfcfc'][lvl], edge = ['', '#fce0a8', '#fcfcfc', '#fce0a8'][lvl];
    ctx.save();
    if (this.face < 0) { ctx.translate(sx * 2 + 16, 0); ctx.scale(-1, 1); }
    const seg = (x0, y0, x1, y1, c, w) => {
      ctx.fillStyle = c;
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2);
      for (let k = 0; k <= n; k++) ctx.fillRect(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), w, w);
    };
    const sword = (hx, hy, tx, ty) => {
      const dx = tx - hx, dy = ty - hy, d = Math.hypot(dx, dy), nx = -dy / d, ny = dx / d;
      seg(hx - dx / d * 3, hy - dy / d * 3, hx, hy, '#5c3c20', 2);              // Griff
      seg(hx + nx * 3, hy + ny * 3, hx - nx * 3, hy - ny * 3, '#f8b800', 1);     // Parierstange
      seg(hx, hy, tx, ty, blade, 2);
      seg(hx + nx * 0.6, hy + ny * 0.6, tx, ty, edge, 1);
      if (lvl === 3) for (let k = 0; k < 5; k++) { // Flammen am Blatt
        const f = (k + 1) / 6, fx = hx + dx * f, fy = hy + dy * f, fl = (W.frame + k * 3) % 6 < 3;
        ctx.fillStyle = fl ? '#f87800' : '#f8b800';
        ctx.fillRect(Math.round(fx + nx * 2), Math.round(fy + ny * 2 - (fl ? 1 : 0)), 1, 2);
      }
    };
    if (p === 0) sword(sx + 2, sy + 4, sx - 8, sy - 9);
    else if (p === 1) sword(sx + 13, sy + 1, sx + 5, sy - 15);
    else {
      const len = SWORD_LEN[lvl];
      sword(sx + 15, sy + 9, sx + 15 + len, sy + 8);
      if (this.atkT <= 15) { // Schweif des Hiebs
        ctx.fillStyle = 'rgba(252,252,252,0.5)';
        for (let a = -1.4; a <= 0.05; a += 0.05) {
          const r = len + 2, x = sx + 13 + Math.cos(a) * r, y = sy + 9 + Math.sin(a) * r;
          ctx.fillRect(Math.round(x), Math.round(y), 2, 1);
        }
        ctx.fillStyle = 'rgba(252,224,168,0.35)';
        for (let a = -1.2; a <= 0; a += 0.07) ctx.fillRect(Math.round(sx + 13 + Math.cos(a) * (len - 4)), Math.round(sy + 9 + Math.sin(a) * (len - 4)), 1, 1);
      }
    }
    ctx.restore();
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
