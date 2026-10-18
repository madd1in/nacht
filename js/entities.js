// Physik-Helfer und Spielerfigur.
'use strict';

const T = 16;
const SOLID = new Set(['#', '=', 'X', 'Y', '^', 'G', 'B']); // G: unsichtbar fest (Zugbrücke, Gittertor – die Grafik zeichnet das Torhaus), B: Bücherwand

const Phys = {
  tile(cx, cy) {
    const r = W.room;
    if (r.wrap) cx = ((cx % r.w) + r.w) % r.w; // Turmmantel: rundherum geschlossen
    if (cy < 0 || cy >= r.h || cx < 0 || cx >= r.w) return '.';
    return r.grid[cy][cx];
  },
  solidTile(cx, cy) {
    const r = W.room;
    if (r.wrap) cx = ((cx % r.w) + r.w) % r.w;
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
  // Trifft Rechteck b das Ziel e? Bosse aus mehreren Teilen (Fangarme) liefern eine Liste von Trefferzonen.
  hitsEnt(b, e) {
    if (e.hurtBoxes) return e.hurtBoxes().some(r => Phys.overlap(b, r));
    return Phys.overlap(b, e.hurtBox ? e.hurtBox() : e);
  },
  overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  },
};

const WALK = 1.45, JUMP = -4.3, GRAV = 0.21, MAXFALL = 4.2, ATK_LEN = 19; // flotter: schneller laufen, kürzere Peitschen-Erholung
const WHIP_LEN = [0, 23, 23, 38];
const SWORD_LEN = [0, 17, 19, 27];
// Peitschen-/Schwertrichtungen: Handposition (relativ zu x-3 / Füße-32, nach rechts schauend) und Winkel.
// Passt zu den ausgestreckten Armen der 16-Bit-Figur (hero.js, DIR-Ziele minus 9/4).
const WHIP_DIRS = {
  fwd: { hx: 19, hy: 10, a: 0 }, upd: { hx: 17, hy: 1, a: -Math.PI / 4 }, up: { hx: 12, hy: -2, a: -Math.PI / 2 },
  downd: { hx: 18, hy: 15, a: Math.PI / 4 }, down: { hx: 13, hy: 17, a: Math.PI / 2 },
};
const FLIP_LEN = 26; // Salto-Dauer in Frames
const SLIDE_H = 14; // Rutschen: flacher als eine Kachel – passt durch Spalten, durch die man weder geht noch kriecht
const DASH_LEN = 20, AIRDASH_LEN = 15, DASH_V = 3.7, DASH_AIR = 2.5; // Dash am Boden / in der Luft, Schwung danach
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

class Player {
  constructor() {
    this.w = 10; this.h = 28;
    this.H = HEROES.get(Options.character); this.def = this.H.def; this.sword = this.def.weapon === 'sword';
    this.maxHp = Options.maxHp; this.hp = this.maxHp;
    this.hearts = Options.infHearts ? 99 : 5; this.sub = null; this.whip = Options.maxWhip ? 3 : 1;
    this.reset(40, 176);
  }
  reset(fx, fy) {
    this.limo = false;
    this.h = 28; this.x = fx - this.w / 2; this.y = fy - this.h;
    this.vx = 0; this.vy = 0; this.face = 1; this.onGround = true;
    this.state = 'normal'; this.atkT = 0; this.atkSub = false; this.crouch = false; this.crouchAtk = false;
    this.inv = 0; this.walkT = 0; this.jumping = false; this.stair = null; this.stairPos = 0;
    this.stairUpPose = true; this.deadT = 0; this.plat = null; this.powerT = 0;
    this.canDouble = true; this.flipT = 0; this.scarf = null; this.hidden = false; this.coyote = 0; this.jumpBuf = 0; this.rageT = 0; this.sunk = false;
    this.chargeT = 0; this.crashT = 0; this.landT = 0; this.lastSafe = { cx: fx, feet: fy };
    this.atkDir = 'fwd'; this.slideT = 0; this.flingT = 0; this.trail = []; this.dangle = false; this.ring = null;
    this.ledge = null; this.ledgeCool = 0; this.ledgeT = 0; this.climbT = 0; this.wallSlide = 0;
    this.dashT = 0; this.dashCool = 0; this.airDash = false; this.canAirDash = true; this.dashCarry = false; this.tapDir = 0; this.tapT = 0; this.wallT = 0; this.wallLast = 0;
    this.stoneT = 0; this.stoneMax = 1; this.stoneSpr = null; this.stoneShake = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  get feet() { return this.y + this.h; }
  get alive() { return this.state !== 'dead'; }

  setCrouch(on) {
    if (on && this.h === 28) { this.y += 8; this.h = 20; }
    else if (!on && this.h < 28) {
      if (Phys.rectSolid(this.x, this.feet - 28, this.w, 28)) return; // unter niedriger Decke bleibt der Held unten
      this.y = this.feet - 28; this.h = 28;
    }
    this.crouch = on;
  }

  tryAttack(wantSub, strict) {
    if (this.atkT > 0) return;
    if (wantSub && this.sub === 'watch') { // Stoppuhr: hält Gegner und Geschosse 3 Sekunden an (5 Herzen)
      if (this.hearts >= 5 && !(W.stopT > 0)) { if (!Options.infHearts) this.hearts -= 5; W.stopT = 180; Audio8.sfx('watch'); W.flash = 4; }
      return;
    }
    if (wantSub && this.sub && this.hearts >= 1 && W.subCount() < 2) {
      this.atkSub = true; if (!Options.infHearts) this.hearts -= 1;
    } else if (strict) return;
    else { this.atkSub = false; Audio8.sfx('whip'); }
    this.atkT = 1; this.atkId = ++W.atkId;
    this.crouchAtk = this.crouch && this.state === 'normal';
    const I = Input.held, horiz = I.left || I.right;
    this.atkDir = 'fwd';
    if (!this.atkSub && this.state === 'normal' && !this.crouchAtk) {
      if (I.up) this.atkDir = horiz ? 'upd' : 'up';
      else if (I.down && !this.onGround) this.atkDir = horiz ? 'downd' : 'down';
      else if (Input.device === 'touch' && !this.onGround) this.ringAssist(); // Ziel-Hilfe nur für Touch in der Luft
    }
  }
  // Ziel-Hilfe (nur Touch, in der Luft): Ring in Reichweite über dem Spieler → automatisch dorthin peitschen
  ringAssist() {
    if (!W.rings || !W.rings.length) return;
    const reach = (this.sword ? SWORD_LEN : WHIP_LEN)[this.whip] + 52;
    let best = null, bd = 1e9;
    for (const r of W.rings) {
      const dx = r.cx - this.cx, dy = r.cy - (this.y + 8), d = Math.hypot(dx, dy);
      if (dy < -6 && d < reach && d < bd) { best = r; bd = d; }
    }
    if (!best) return;
    const dx = best.cx - this.cx;
    if (Math.abs(dx) < 14) this.atkDir = 'up';
    else { this.atkDir = 'upd'; this.face = Math.sign(dx); }
  }

  tickAttack() {
    if (this.atkT === 0) return;
    this.atkT++;
    if (this.atkSub && this.atkT === 9) this.throwSub();
    if (!this.atkSub && this.atkT === 12 && this.tryLatch()) return;
    if (!this.atkSub && this.atkT === 13 && !this.sword) Audio8.sfx('crack');
    if (!this.atkSub && this.atkT >= 12 && this.atkT <= 17) this.whipHits();
    if (this.atkT > ATK_LEN) {
      this.atkT = 0;
      if (!this.atkSub && Input.held.attack && this.state === 'normal') this.startDangle(); // Taste gehalten → Peitsche drehen
    }
  }
  get atkPose() { return this.atkT < 7 ? 0 : this.atkT < 12 ? 1 : 2; }

  spriteTop(spr) { return this.y + this.h - spr.h; }

  get dir() { return WHIP_DIRS[this.crouchAtk ? 'fwd' : this.atkDir] || WHIP_DIRS.fwd; }
  atkTop() { return this.feet - 32 + (this.crouchAtk ? this.H.crouchDrop : 0); }
  // Hand in Weltkoordinaten
  hand() {
    const D = this.dir, sx = this.x - 3;
    return { x: this.face > 0 ? sx + D.hx : sx + 16 - D.hx, y: this.atkTop() + D.hy };
  }
  // Trefferzonen entlang der Peitsche/Klinge im aktuellen Winkel
  whipBox() {
    const D = this.dir, h = this.hand(), len = (this.sword ? SWORD_LEN : WHIP_LEN)[this.whip], rad = this.sword ? 8 : 4;
    const ca = Math.cos(D.a) * this.face, sa = Math.sin(D.a), n = Math.ceil(len / 6), out = [];
    for (let k = 1; k <= n; k++) { const px = h.x + ca * len * k / n, py = h.y + sa * len * k / n; out.push({ x: px - rad, y: py - rad, w: rad * 2, h: rad * 2 }); }
    if (this.sword && this.atkDir === 'fwd') out.push({ x: h.x + (this.face > 0 ? 0 : -len), y: h.y - 16, w: len, h: 14 }); // Hiebbogen
    return out;
  }

  whipHits() {
    const box = this.whipBox();
    const dmg = (this.whip >= 2 ? 2 : 1) * Options.dmgMul * (this.rageT > 0 ? 2 : 1);
    W.whipAt(box, dmg, this.atkId, this.face);
  }

  throwSub() {
    const hy = this.feet - (this.crouchAtk ? 24 : 32) + 8;
    W.spawn(new SubWeapon(this.sub, this.cx + this.face * 6, hy, this.face));
    Audio8.sfx(this.sub === 'axe' ? 'axe' : 'throw');
  }

  hurt(dmg, srcX) {
    if (this.inv > 0 || !this.alive || W.cleared || Game.state === 'demo') return; // Demo: unverwundbar
    if (this.stoneT > 0) this.breakStone(false); // ein Treffer sprengt den Stein
    this.dangle = false; W.combo.n = 0; W.combo.t = 0; W.stats.hits++;
    if (this.state === 'swing') { this.state = 'normal'; this.ring = null; }
    if (this.state === 'zip') { this.zip.line.cool = 40; this.state = 'normal'; this.zip = null; }
    if (this.state === 'ledge' || this.state === 'climb') { this.state = 'normal'; this.ledge = null; this.ledgeCool = 30; }
    this.wallSlide = 0; this.dashT = 0; this.dashCarry = false;
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
    this.state = 'dead'; this.deadT = 0; this.atkT = 0; this.stoneT = 0; this.vx = 0; this.vy = silent ? 0 : -2.5;
    this.onGround = false; this.inv = 0; this.hidden = !!silent;
    Audio8.stop(); Audio8.sfx('die'); Input.rumble(1, 1, 600);
  }

  // Medusas Blick: der Held erstarrt zu Stein; Tasten hämmern bricht ihn schneller frei
  petrify() {
    if (!this.alive || this.stoneT > 0 || Game.state === 'demo') return;
    if (this.state === 'zip') { this.zip.line.cool = 40; this.zip = null; }
    if (this.state === 'swing' || this.state === 'zip' || this.state === 'ledge' || this.state === 'climb' || this.state === 'hurt') { this.state = 'normal'; this.ring = null; this.ledge = null; }
    this.flipT = 0; this.atkT = 0; this.chargeT = 0; this.dashT = 0; this.dashCarry = false; this.wallSlide = 0; this.slideT = 0; this.vx = 0; this.dangle = false;
    this.stoneT = this.stoneMax = Options.easy ? 80 : 125; this.stoneSpr = this.sprite(); this.stoneShake = 0;
    Audio8.sfx('crumble', this.cx); Input.rumble(0.6, 0.3, 300); W.flash = Math.max(W.flash, 4);
    Game.note('mash'); Game.noteT = this.stoneT + 20;
  }
  updateStone(P) {
    if (['left', 'right', 'up', 'down', 'jump', 'attack', 'sub', 'dash'].some(k => P[k])) {
      this.stoneT -= 7; this.stoneShake = 4; Audio8.sfx('step', this.cx);
      W.spawn(new Particle(this.cx + rnd(-5, 5), this.y + rnd(2, this.h - 4), rnd(-1.2, 1.2), rnd(-2, -0.5), '#9c9c94', 26, 1, 0.2));
    }
    if (this.stoneShake > 0) this.stoneShake--;
    if (--this.stoneT <= 0) return this.breakStone(true);
    if (this.state === 'stairs') return;
    this.vx = 0; this.vy = Math.min(this.vy + GRAV, MAXFALL);
    const r = Phys.moveY(this, this.vy);
    this.onGround = r === 1; if (r) this.vy = 0;
    this.checkPlatforms(); this.hazards();
  }
  breakStone(free) {
    this.stoneT = 0; this.stoneSpr = null;
    if (Game.noteKey === 'mash') Game.noteT = Math.min(Game.noteT, 20);
    for (let i = 0; i < 14; i++) W.spawn(new Particle(this.cx + rnd(-6, 6), this.y + rnd(0, this.h), rnd(-2, 2), rnd(-3, -0.5), i % 3 ? '#8c8c84' : '#c8c8bc', 34, 2, 0.2));
    Audio8.sfx('crumble', this.cx);
    if (free) this.inv = Math.max(this.inv, 40);
  }

  findStair(top) {
    for (const s of W.stairs) {
      const ex = top ? s.tx : s.bx, ey = top ? s.ty : s.by;
      if (Math.abs(this.feet - ey) < 2 && Math.abs(this.cx - ex) <= 16) return s;
    }
    return null;
  }

  catchStair() {
    const feet = this.feet, prev = feet - this.vy - 0.5;
    for (const s of W.stairs) {
      const pos = (this.cx - s.bx) * s.dir;
      if (pos < 4 || pos > s.len - 2) continue; // an den Enden steht man ohnehin auf dem Boden
      const surf = s.by - pos;
      if (prev <= surf + 3 && feet >= surf - 1) {
        this.state = 'stairs'; this.stair = s; this.stairPos = pos; this.atkT = 0;
        this.vy = 0; this.vx = 0; this.onGround = false; this.jumping = false; this.canDouble = true; this.flipT = 0;
        this.stairUpPose = this.face === s.dir;
        this.placeOnStair(); this.landT = 5; W.dust(this.cx, this.feet, 3); Audio8.sfx('step', this.cx);
        return true;
      }
    }
    return false;
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
    if (this.stoneT > 0) return this.updateStone(P);
    if (this.crashT > 0) this.crashT--;
    this.updateCharge(I);
    this.recordTrail();

    if (this.state === 'swing') return this.updateSwing(I, P);
    if (this.state === 'zip') return this.updateZip(P);
    if (this.state === 'stairs') return this.updateStairs(I, P);
    if (this.state === 'toStair') return this.updateToStair(I);
    if (this.ledgeCool > 0) this.ledgeCool--;
    if (this.state === 'ledge') return this.updateLedge(I, P);
    if (this.state === 'climb') return this.updateClimb();

    if (this.plat) { // Mitnahme; drehende Plattformen liefern die Bewegung des Standpunkts
      const [cdx, cdy] = this.plat.carryAt ? this.plat.carryAt(this.cx) : [this.plat.dx, this.plat.dy || 0];
      Phys.moveX(this, cdx); this.y += cdy; this.plat = null;
    }

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

    if (this.slideT > 0) return this.updateSlide(I);

    // Dash: Dash-Taste (oder am Boden zweimal in Laufrichtung tippen); in der Luft einmal pro Sprung
    if (this.dashCool > 0) this.dashCool--;
    if (this.tapT > 0) this.tapT--;
    const tap = P.left ? -1 : P.right ? 1 : 0;
    let dashReq = P.dash;
    if (tap) { if (this.onGround && tap === this.tapDir && this.tapT > 0) dashReq = true; this.tapDir = tap; this.tapT = 12; }
    if (dashReq && this.dashT === 0 && this.dashCool === 0 && this.atkT === 0 && !this.dangle && (this.onGround || this.canAirDash)) this.startDash(tap || (I.right ? 1 : 0) - (I.left ? 1 : 0));
    if (this.dashT > 0) return this.updateDash(I, P);

    // Angriff
    if (P.sub) this.tryAttack(true, true);
    else if (P.attack && !this.dangle) this.tryAttack(false, false);
    this.tickAttack();
    if (this.state === 'swing') return;
    this.updateDangle(I);

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
      else { const tv = mx * WALK; this.vx += (tv - this.vx) * (mx ? 0.38 : 0.5); if (Math.abs(this.vx) < 0.06) this.vx = 0; if (mx) this.face = mx; }
      this.coyote = 7;
      if ((P.jump || (this.jumpBuf > 0 && I.jump)) && this.atkT === 0) {
        this.jumpBuf = 0;
        if (I.down && !this.findStair(true)) return this.startSlide(); // Rutschen: Unten + Sprung
        this.setCrouch(false);
        this.vy = JUMP; this.onGround = false; this.jumping = true;
      }
    } else {
      if (this.flingT > 0) { this.flingT--; this.vx += (mx * WALK - this.vx) * 0.05; } // Schwung nach dem Pendeln
      else this.vx = mx * (this.dashCarry ? DASH_AIR : WALK); // nach einem Dash bleibt der Schwung bis zur Landung
      if (mx && this.atkT === 0) this.face = mx;
      if (this.coyote > 0) this.coyote--;
      if (this.jumpBuf > 0) this.jumpBuf--;
      const wall = this.wallDir();
      if (wall) { this.wallLast = wall; this.wallT = 6; } else if (this.wallT > 0) this.wallT--;
      if (P.jump && this.coyote > 0 && !this.jumping) { // Coyote-Time: kurz nach der Kante zählt noch als Bodensprung
        this.coyote = 0; this.vy = JUMP; this.jumping = true;
      } else if ((P.jump || this.jumpBuf > 0) && wall && this.atkT === 0 && (mx === wall || this.wallSlide)) this.wallJump(wall); // Wandsprung (auch kurz vor dem Wandkontakt gedrückt)
      else if (P.jump && !wall && this.wallT > 0 && this.atkT === 0) this.wallJump(this.wallLast); // knapp von der Wand gelöst: zählt noch
      else if (P.jump && !this.canDouble) this.jumpBuf = 8; // Sprungpuffer: kurz vor der Landung (oder der Wand) gedrückt
      else if (P.jump && this.canDouble) { // Doppelsprung (einmal pro Luftphase)
        this.canDouble = false; this.vy = JUMP * 0.92; this.jumping = true;
        if (this.atkT === 0) this.flipT = FLIP_LEN;
        Audio8.sfx('djump'); W.puff(this.cx, this.feet);
      }
      if (!I.jump && this.vy < -1.6) this.vy = -1.6;
      // An der Wand rutschen: zur Wand drücken bremst den Fall, der Held schaut von der Wand weg
      const w2 = this.wallDir();
      this.wallSlide = w2 && mx === w2 && this.vy > 0.4 && this.atkT === 0 && this.flingT <= 0 ? w2 : 0;
      if (this.wallSlide) { this.face = -w2; if (W.frame % 6 === 0) W.dust(this.cx + w2 * 6, this.y + 6, 1); }
    }
    if (this.vx !== 0 && this.onGround) { this.walkT++; if (this.walkT % 20 === 1) { W.dust(this.cx - this.face * 4, this.feet, 1); this.footstep(); } } else if (this.onGround) this.walkT = 0;

    this.vy = Math.min(this.vy + GRAV, this.wallSlide ? 1.25 : MAXFALL);
    Phys.moveX(this, this.vx);
    const wasGround = this.onGround;
    const r = Phys.moveY(this, this.vy);
    this.onGround = r === 1;
    if (this.onGround && !wasGround && this.vy > 2.4) { this.landT = 7; W.dust(this.cx, this.feet, 5); }
    if (r !== 0) { this.vy = 0; }
    if (this.onGround) { this.jumping = false; this.canDouble = true; this.flipT = 0; this.flingT = 0; this.wallSlide = 0; this.canAirDash = true; this.dashCarry = false; }
    this.checkPlatforms();
    if (this.onGround) this.wallSlide = 0;
    if (this.stairCool > 0) this.stairCool--;
    else if (!this.onGround && this.vy > 0 && !Input.held.down && this.catchStair()) return; // im Fallen mitten auf der Treppe landen (Unten gedrückt: hindurchfallen)
    if (!this.onGround && this.tryLedge(mx)) return; // an der Kante festhalten
    if (!this.onGround && wasGround && !this.jumping && this.vy > 0) this.vx = 0;
    this.clampRoom();
    this.hazards();
    this.trackSafe();
  }

  // ---------- Dash und Luft-Dash ----------
  startDash(dir) {
    if (dir) this.face = dir;
    this.airDash = !this.onGround; if (this.airDash) { this.canAirDash = false; this.vy = 0; }
    this.dashT = this.airDash ? AIRDASH_LEN : DASH_LEN;
    this.setCrouch(false); this.flipT = 0; this.wallSlide = 0; this.flingT = 0;
    Audio8.sfx('whoosh'); W.dust(this.cx - this.face * 4, this.feet - (this.airDash ? 12 : 0), 3); Input.rumble(0.2, 0.3, 80);
  }
  updateDash(I, P) {
    this.dashT--;
    const len = this.airDash ? AIRDASH_LEN : DASH_LEN, k = this.dashT / len;
    this.vx = this.face * (DASH_AIR + (DASH_V - DASH_AIR) * Math.min(1, k * 1.5));
    if (P.sub) this.tryAttack(true, true);
    else if (P.attack) this.tryAttack(false, false);
    this.tickAttack();
    if (this.state !== 'normal') { this.dashT = 0; return; }
    const mx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    if (P.jump) { // Sprung aus dem Dash: der Schwung bleibt bis zur Landung
      this.dashT = 0; this.dashCool = 6; this.dashCarry = true;
      if (this.onGround) { this.vy = JUMP; this.onGround = false; this.jumping = true; return; }
      const wall = this.wallDir();
      if (wall) return this.wallJump(wall);
      if (this.canDouble) { this.canDouble = false; this.vy = JUMP * 0.92; this.jumping = true; this.flipT = FLIP_LEN; Audio8.sfx('djump'); W.puff(this.cx, this.feet); }
      return;
    }
    if (mx === -this.face) this.dashT = 0; // Gegenrichtung bricht ab
    this.vy = this.airDash ? 0 : Math.min(this.vy + GRAV, MAXFALL);
    if (Phys.moveX(this, this.vx)) this.dashT = 0;
    const was = this.onGround, r = Phys.moveY(this, this.vy);
    this.onGround = r === 1; if (r) this.vy = 0;
    this.checkPlatforms();
    if (was && !this.onGround) this.dashCarry = true; // über die Kante gedasht
    if (this.onGround) { this.canAirDash = true; this.canDouble = true; this.jumping = false; if (W.frame % 3 === 0) W.dust(this.cx - this.face * 5, this.feet, 1); }
    if (this.dashT === 0) { this.dashCool = 8; this.dashCarry = !this.onGround; }
    this.clampRoom(); this.hazards(); this.trackSafe();
  }

  // ---------- Wandsprung, Kantengriff, Hochziehen ----------
  // Echte Wand direkt neben dem Helden (mindestens zwei Kacheln hoch, ganze Körperhöhe) – dünne Simse zählen nicht,
  // sonst würde ein Doppelsprung an einer Plattformkante zum Wandsprung. Raumränder zählen ebenfalls nicht.
  wallDir() {
    const r0 = Math.floor((this.y + 3) / T), r1 = Math.floor((this.y + this.h - 4) / T);
    if (r1 - r0 < 1) return 0;
    for (const d of [1, -1]) {
      const c = d > 0 ? Math.floor((this.x + this.w + 1.5) / T) : Math.floor((this.x - 1.5) / T);
      if (!W.room.wrap && (c < 0 || c >= W.room.w)) continue;
      let ok = true;
      for (let r = r0; r <= r1 && ok; r++) ok = Phys.solidTile(c, r) && Phys.tile(c, r) !== '^';
      if (ok) return d;
    }
    return 0;
  }
  wallJump(wall) {
    this.vy = JUMP; this.vx = -wall * 2.1; this.flingT = 10; this.face = -wall; this.wallT = 0; this.jumpBuf = 0;
    this.jumping = true; this.canDouble = true; this.wallSlide = 0; this.flipT = 0; this.ledgeCool = 8; this.coyote = 0; this.canAirDash = true; this.dashCarry = false; this.dashT = 0;
    Audio8.sfx('djump'); W.dust(this.cx + wall * 6, this.feet - 8, 4);
  }
  // Im Fallen mit Richtung zur Wand: liegt eine freie Kante auf Kopfhöhe, greift der Held zu
  tryLedge(mx) {
    if (!mx || this.ledgeCool > 0 || this.atkT || this.vy < -0.4 || this.h !== 28 || this.dangle || this.state !== 'normal') return false;
    const c = mx > 0 ? Math.floor((this.x + this.w + 1.5) / T) : Math.floor((this.x - 1.5) / T);
    if (!W.room.wrap && (c < 0 || c >= W.room.w)) return false;
    const edgeX = mx > 0 ? c * T : (c + 1) * T;
    if (Math.abs((mx > 0 ? this.x + this.w : this.x) - edgeX) > 2) return false;
    for (let r = Math.floor((this.y - 8) / T); r <= Math.floor((this.y + 10) / T); r++) {
      const top = r * T;
      if (this.y < top - 8 || this.y > top + 10) continue;
      if (!Phys.solidTile(c, r) || Phys.tile(c, r) === '^' || Phys.solidTile(c, r - 1) || Phys.solidTile(c, r - 2)) continue;
      if (Phys.rectSolid(this.x, top - 29, this.w, 29)) continue; // über dem Kopf muss Platz zum Hochziehen sein
      const hs = this.H.hang;
      this.state = 'ledge'; this.ledge = { c, r, dir: mx, top }; this.ledgeT = 0; this.face = mx;
      this.vx = 0; this.vy = 0; this.jumping = false; this.canDouble = true; this.flipT = 0; this.flingT = 0; this.wallSlide = 0; this.plat = null;
      this.canAirDash = true; this.dashCarry = false;
      this.x = mx > 0 ? edgeX - this.w : edgeX;
      this.y = top + (hs.h - hs.hand[1]) - 1 - this.h;
      Audio8.sfx('step', this.cx); W.dust(edgeX, top, 2);
      return true;
    }
    return false;
  }
  updateLedge(I, P) {
    const L = this.ledge, mx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
    this.ledgeT++;
    if (!Phys.solidTile(L.c, L.r)) return this.dropLedge(); // Kante zerbrochen
    if (this.ledgeT < 5) return; // kurz festhalten, damit ein gehaltener Sprung nicht sofort auslöst
    if (P.jump && mx === -L.dir) { this.state = 'normal'; this.ledge = null; return this.wallJump(L.dir); } // von der Wand abstoßen
    if (P.jump || P.up || (I.up && this.ledgeT > 10) || (mx === L.dir && this.ledgeT > 16)) { // hochziehen
      this.state = 'climb'; this.climbT = 0; this.climbFeet = this.feet; this.climbX = this.x;
      Audio8.sfx('whoosh'); return;
    }
    if (P.down || (I.down && this.ledgeT > 8)) this.dropLedge();
  }
  dropLedge() {
    this.state = 'normal'; this.ledge = null; this.vy = 0.6; this.onGround = false; this.ledgeCool = 18; this.jumping = true;
  }
  updateClimb() {
    const L = this.ledge, k = ++this.climbT, N1 = 10, N2 = 8;
    if (k <= N1) { const e = k / N1; this.y = this.climbFeet + (L.top - this.climbFeet) * (1 - (1 - e) * (1 - e)) - this.h; }
    else {
      const e = (k - N1) / N2, x1 = L.dir > 0 ? L.c * T + 3 : (L.c + 1) * T - 3 - this.w;
      this.x = this.climbX + (x1 - this.climbX) * e; this.y = L.top - this.h;
    }
    if (k >= N1 + N2) {
      this.state = 'normal'; this.ledge = null; this.onGround = true; this.vy = 0; this.vx = 0; this.landT = 4; this.ledgeCool = 10;
      W.dust(this.cx, this.feet, 2); Audio8.sfx('step', this.cx); this.trackSafe();
    }
  }

  checkPlatforms() {
    const was = this.ridePlat; this.ridePlat = null;
    if (this.vy < 0) return;
    for (const p of W.platforms) {
      if (p.solid === false) continue;
      const prevFeet = this.feet - this.vy - 0.5;
      let top = p.y, inX = this.x + this.w > p.x && this.x < p.x + p.w;
      if (p.surfaceAt) { const s = p.surfaceAt(this.cx); inX = s !== null; top = s === null ? 0 : s; } // schräge Fläche
      const up = was === p ? 6 : 0.5, slack = p.slack || 0; // wer schon draufsteht, bleibt kleben
      if (inX && prevFeet <= top + 3 + slack && this.feet >= top - up && this.feet <= top + 10 + slack) {
        if (p.onStand) p.onStand();
        this.ridePlat = p;
        this.y = top - this.h; this.vy = 0; this.onGround = true; this.jumping = false; this.canDouble = true; this.flipT = 0; this.canAirDash = true;
        if (this.dashT === 0) this.dashCarry = false;
        if (this.state === 'hurt') { this.state = 'normal'; this.vx = 0; }
        this.plat = p;
      }
    }
  }

  clampRoom() {
    if (W.room.wrap && !W.camLock) return; // um den Turm herum gibt es keinen Rand
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
    if (W.room.theme === 'ship' && !this.sunk && this.feet > W.room.h * T - 6) { this.sunk = true; W.splash(this.cx, W.room.h * T - 8); } // ins Meer
    if (this.y > W.room.h * T + 8) this.fallPenalty(4);
  }

  fallPenalty(dmg) {
    if (!this.alive || W.cleared) return;
    this.fellAt = W.frame; // Brücke: Einsturz zurücksetzen
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
    const ok = (c) => { const ch = Phys.tile(c, row); return ch === '#' || ch === '=' || ch === 'B'; };
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
    else if (P.attack) this.tryAttack(false, false);
    if (this.atkT > 0) { this.tickAttack(); return; }
    if (P.jump) { // mitten von der Treppe abspringen – in die gedrückte Richtung oder senkrecht
      const mx = (I.right ? 1 : 0) - (I.left ? 1 : 0);
      this.state = 'normal'; this.stair = null; this.stairCool = 14;
      this.vy = JUMP * 0.95; this.vx = mx * WALK; if (mx) this.face = mx;
      this.onGround = false; this.jumping = true; this.canDouble = true; this.coyote = 0;
      return;
    }
    let m = 0;
    if (I.up || (s.dir > 0 ? I.right : I.left)) m = 1;
    else if (I.down || (s.dir > 0 ? I.left : I.right)) m = -1;
    if (m) {
      this.stairPos += m * 0.95;
      if (W.room.theme === 'glass') W.tubeRot = (W.tubeRot || 0) + m * 1.1; // Röhre dreht sich mit: hinauf vorwärts, hinunter zurück
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

  // ---------- Ankerringe: Peitsche einhaken und pendeln ----------
  tryLatch() {
    // nur bei bewusst nach oben gerichteten Hieben einhaken – Vorwärts-/Duck-/Abwärtshiebe treffen immer die Gegner
    if (this.state !== 'normal' || !W.rings || !W.rings.length || (this.atkDir !== 'up' && this.atkDir !== 'upd')) return false;
    const D = this.dir, h = this.hand(), reach = (this.sword ? SWORD_LEN : WHIP_LEN)[this.whip] + 48;
    const wa = Math.atan2(Math.sin(D.a), Math.cos(D.a) * this.face);
    for (const r of W.rings) { // großzügig wie bei Super Castlevania IV
      const dx = r.cx - h.x, dy = r.cy - h.y, d = Math.hypot(dx, dy);
      if (d > reach || d < 8 || dy > 30 || Math.abs(angDiff(Math.atan2(dy, dx), wa)) > 0.8) continue;
      this.state = 'swing'; this.ring = r; this.atkT = 0; this.dangle = false; this.setCrouch(false);
      this.swL = clamp(Math.hypot(this.cx - r.cx, this.cy - r.cy), 26, 76);
      this.swA = Math.atan2(this.cx - r.cx, this.cy - r.cy);
      this.swW = clamp((this.vx * Math.cos(this.swA) - this.vy * Math.sin(this.swA)) / this.swL, -0.08, 0.08);
      this.onGround = false; this.vy = 0;
      Audio8.sfx('latch'); Input.rumble(0.3, 0.2, 120); W.sparks(r.cx, r.cy, 6);
      return true;
    }
    return false;
  }

  updateSwing(I, P) {
    const r = this.ring;
    this.swW += -(GRAV / this.swL) * Math.sin(this.swA);
    if (I.left) this.swW -= 0.0034;
    if (I.right) this.swW += 0.0034;
    this.swW = clamp(this.swW * 0.996, -0.13, 0.13);
    if (I.up) this.swL = Math.max(24, this.swL - 0.7);
    if (I.down) this.swL = Math.min(80, this.swL + 0.7);
    this.swA += this.swW;
    if (Math.abs(this.swA) > 1.5) { this.swA = Math.sign(this.swA) * 1.5; this.swW *= -0.3; }
    const nx = r.cx + Math.sin(this.swA) * this.swL - this.w / 2, ny = r.cy + Math.cos(this.swA) * this.swL - this.h / 2;
    if (Phys.rectSolid(nx, ny, this.w, this.h)) this.swW *= -0.4;
    else { this.x = nx; this.y = ny; }
    if (Math.abs(this.swW) > 0.004) this.face = this.swW > 0 ? 1 : -1;
    if (W.frame % 18 === 0 && Math.abs(this.swW) > 0.05) Audio8.sfx('whoosh');
    if (P.jump || P.attack) this.releaseSwing(P.jump);
    this.clampRoom();
  }

  releaseSwing(jump) {
    const L = this.swL, A = this.swA, w = this.swW;
    this.vx = clamp(Math.cos(A) * w * L, -3.6, 3.6);
    this.vy = clamp(-Math.sin(A) * w * L, -5, 4) - (jump ? 2.6 : 0);
    this.state = 'normal'; this.ring = null; this.onGround = false; this.jumping = true; this.canDouble = true; this.flingT = 50;
    if (jump) { this.flipT = FLIP_LEN; Audio8.sfx('djump'); W.puff(this.cx, this.feet); }
  }

  // ---------- Seilrutsche: am Seil schräg hinab, immer schneller; Sprung = abspringen ----------
  updateZip(P) {
    const z = this.zip, L = z.line;
    z.v = Math.min(z.v + 0.09 * L.slope + 0.02, this.chicken ? 5.6 : 4.6); // Gummihuhn mit Rolle: schneller
    if (this.chicken && W.frame % 24 === 0) Audio8.sfx('squeak', this.cx);
    z.s += z.v / L.len;
    const [hx, hy] = L.at(Math.min(1, z.s));
    this.x = hx - this.w / 2; this.y = hy + 34 - this.h; this.face = L.dir;
    if (W.frame % 9 === 0) { Audio8.sfx('whoosh'); W.sparks(hx, hy, 2); }
    if (P.jump || z.s >= 1) {
      L.cool = 30; this.state = 'normal'; this.zip = null; this.onGround = false; this.jumping = true; this.canDouble = true; this.flingT = 40;
      this.vx = L.dir * Math.min(z.v, 3); this.vy = P.jump ? -4.2 : -1.2;
      if (P.jump) { this.flipT = FLIP_LEN; Audio8.sfx('djump'); W.puff(this.cx, this.feet); }
    }
    this.clampRoom();
  }

  // ---------- Peitsche drehen (Taste halten) / Schwertwirbel ----------
  startDangle() {
    this.dangle = true; this.dT = 0; this.dAngV = 0;
    this.dAng = this.face > 0 ? 0 : Math.PI;
    const n = this.sword ? 5 : [0, 6, 6, 9][this.whip];
    this.dSeg = Array(n).fill(this.dAng); this.dId = ++W.atkId;
  }
  danglePoints() {
    const hx = this.cx + this.face * 11, hy = this.feet - 22, pts = [];
    let x = hx, y = hy;
    for (const a of this.dSeg) { x += Math.cos(a) * (this.sword ? 4.5 : 4); y += Math.sin(a) * (this.sword ? 4.5 : 4); pts.push([x, y]); }
    return pts;
  }
  updateDangle(I) {
    if (!this.dangle) return;
    if (!I.attack || this.state !== 'normal' || this.atkT > 0) { this.dangle = false; return; }
    this.dT++;
    if (this.sword) this.dAng += 0.3 * this.face;
    else {
      const dx = (I.right ? 1 : 0) - (I.left ? 1 : 0), dy = (I.down ? 1 : 0) - (I.up ? 1 : 0);
      const target = (dx || dy) ? Math.atan2(dy, dx) : Math.PI / 2;
      this.dAngV = (this.dAngV + angDiff(target, this.dAng) * 0.06) * 0.86;
      this.dAng += this.dAngV;
    }
    this.dSeg[0] = this.dAng;
    for (let i = 1; i < this.dSeg.length; i++) this.dSeg[i] += angDiff(this.dSeg[i - 1], this.dSeg[i]) * (this.sword ? 1 : 0.4);
    if (this.dT % 14 === 0) this.dId = ++W.atkId;
    W.whipAt(this.danglePoints().map(([x, y]) => ({ x: x - 3, y: y - 3, w: 6, h: 6 })), Options.dmgMul, this.dId);
    if (this.dT % 12 === 0 && (this.sword || Math.abs(this.dAngV) > 0.05)) Audio8.sfx('whoosh');
  }
  drawDangle(ctx, cam) {
    const pts = this.danglePoints(), lvl = this.whip;
    if (this.sword) {
      const [x0, y0] = [this.cx + this.face * 11 - cam.x, this.feet - 22 - cam.y], [x1, y1] = pts[pts.length - 1];
      for (let k = 0; k <= 20; k++) {
        const t = k / 20, x = Math.round(x0 + (x1 - cam.x - x0) * t), y = Math.round(y0 + (y1 - cam.y - y0) * t);
        ctx.fillStyle = k < 4 ? '#5c3c20' : k === 4 ? '#f8b800' : (k % 2 ? ['', '#c89040', '#a8b0c8', '#fcfcfc'][lvl] : '#fce0a8');
        ctx.fillRect(x, y, 2, 2);
      }
      return;
    }
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = lvl === 1 ? (i % 3 === 0 ? PAL.B : PAL.b) : (i % 2 ? PAL.g : PAL.W);
      ctx.fillRect(Math.round(x - cam.x), Math.round(y - cam.y), 2, 2);
    });
    if (lvl === 3) { const [x, y] = pts[pts.length - 1]; ctx.fillStyle = PAL.W; ctx.fillRect(Math.round(x - cam.x) - 2, Math.round(y - cam.y) - 2, 5, 5); ctx.fillStyle = PAL.w; ctx.fillRect(Math.round(x - cam.x) - 1, Math.round(y - cam.y) - 1, 2, 2); }
  }

  // ---------- Rutschen (Unten + Sprung) ----------
  startSlide() {
    this.slideT = 26; this.dangle = false; this.setCrouch(true);
    this.y += this.h - SLIDE_H; this.h = SLIDE_H; // ganz flach
    this.vx = this.face * 3.6; this.inv = Math.max(this.inv, 16);
    Audio8.sfx('whoosh'); W.dust(this.cx, this.feet, 5);
  }
  updateSlide(I) {
    this.slideT--;
    const roof = Phys.rectSolid(this.x - 1, this.feet - 20, this.w + 2, 6); // niedrige Decke: weiterrutschen, bis Platz zum Aufstehen ist
    if (roof && this.slideT < 1) this.slideT = 1;
    if (roof && I) { const mx = (I.right ? 1 : 0) - (I.left ? 1 : 0); if (mx) this.face = mx; }
    this.vx = this.face * Math.max(roof ? 1.7 : 0.8, 3.6 * this.slideT / 26 + 0.4);
    if (this.slideT % 3 === 0) W.dust(this.cx - this.face * 5, this.feet, 1);
    if (W.frame % 2 === 0) W.spawn(new Particle(this.cx + this.face * 7, this.feet - 1, this.face * rnd(0.4, 1.4), -rnd(0.4, 1.2), Math.random() < 0.5 ? '#b8a890' : '#7c6c58', 12, 1, 0.12)); // Staub vor dem Fuß
    this.vy = Math.min(this.vy + GRAV, MAXFALL);
    if (Phys.moveX(this, this.vx)) { if (roof) this.face *= -1; else this.slideT = 0; } // in der Röhre an der Wand: umkehren
    const r = Phys.moveY(this, this.vy);
    this.onGround = r === 1;
    if (r) this.vy = 0;
    this.checkPlatforms();
    if (!this.onGround) this.slideT = 0;
    this.clampRoom(); this.hazards(); this.trackSafe();
    if (this.slideT === 0) { // aufstehen – oder wenigstens ducken, wenn die Decke tief hängt
      this.setCrouch(false);
      if (this.h < 20 && !Phys.rectSolid(this.x, this.feet - 20, this.w, 20)) { this.y = this.feet - 20; this.h = 20; this.crouch = true; }
    }
  }

  // Schritt: leiser Tritt, im Regen (Burghof) platschend mit kleinen Wasserspritzern
  footstep() {
    const wet = W.room.theme === 'courtyard';
    Audio8.sfx(wet ? 'stepWet' : 'step', this.cx);
    if (wet) for (let i = 0; i < 3; i++) W.spawn(new Particle(this.cx - this.face * 3 + rnd(-3, 3), this.feet - 1, rnd(-0.6, 0.6), -rnd(0.8, 1.6), i % 2 ? '#a4e4fc' : '#7c8cc8', 14, 1, 0.18));
  }

  // ---------- Nachbilder bei schnellen Bewegungen ----------
  recordTrail() {
    this.trail.forEach(t => t.life--);
    this.trail = this.trail.filter(t => t.life > 0);
    const fast = this.flipT > 0 || this.crashT > 0 || this.slideT > 0 || this.dashT > 0 || this.state === 'swing' || this.state === 'zip' || this.flingT > 25;
    if (!fast || W.frame % 2) return;
    if (this.flipT > 0 && !this.atkT && this.state === 'normal' && !this.onGround) {
      this.trail.push({ tuck: true, rot: this.saltoAngle(), x: this.cx, y: this.feet - 15, flip: this.face < 0, life: 10 });
      if (this.trail.length > 6) this.trail.shift();
      return;
    }
    const spr = this.sprite();
    if (spr === this.H.dead) return;
    this.trail.push({ spr, x: this.x - 3 - (spr.mx || 0), y: this.feet - spr.h, flip: this.face < 0, life: 12 });
    if (this.trail.length > 6) this.trail.shift();
  }

  sprite() {
    const H = this.H, p = this.atkPose;
    if (this.state === 'dead') return this.onGround ? H.dead : H.hurt;
    if (this.state === 'hurt') return H.hurt;
    if (this.state === 'swing' || this.state === 'zip') return H.swing;
    if (this.state === 'ledge') return H.hang;
    if (this.state === 'climb') return this.climbT <= 10 ? H.climb : H.crouch;
    if (this.slideT > 0) return H.slide ? H.slide[(W.frame >> 2) & 1] : H.crouch;
    if (this.state === 'stairs') {
      if (this.atkT) return (this.stairUpPose ? H.satkUp : H.satkDown)[p];
      return (this.stairUpPose ? H.stairUp : H.stairDown)[Math.floor(this.stairPos / 8) % 2];
    }
    if (this.dashT > 0 && !this.atkT) return this.airDash ? H.adash : H.dash;
    if (this.crashT > 0) return H.atk[2];
    if (this.atkT) {
      if (this.crouchAtk) return H.catk[p];
      return p === 2 ? (H.atkDir[this.atkDir] || H.atk[2]) : H.atk[p];
    }
    if (this.dangle && this.vx === 0 && this.onGround) return H.atk[2];
    if (this.state === 'toStair') return H.walk[Math.floor(this.walkT / 5) % 8];
    if (this.wallSlide && !this.onGround) return H.wall;
    if (!this.onGround) return this.vy < -1.2 ? H.jumpUp : this.vy < 1.3 ? H.jumpApex : H.jumpFall;
    if (this.crouch) return H.crouch;
    if (this.landT > 0) return H.land;
    if (this.vx !== 0) return H.walk[Math.floor(this.walkT / 5) % 8];
    if (W.frame % 230 < 7) return H.blink;
    return H.idle[Math.floor(W.frame / 40) % 2];
  }

  draw(ctx, cam) {
    if (this.hidden) return;
    if (this.inv > 0 && this.alive && (W.frame & 2)) return;
    if (this.stoneT > 0 && this.stoneSpr) { // versteinert: graue Statue, zittert beim Freistrampeln
      const spr = this.stoneSpr, st = Sprites.stoneOf(spr), sh = this.stoneShake > 0 ? ((W.frame & 1) ? 1 : -1) : 0;
      ctx.drawImage(this.face < 0 ? st.f : st.c, Math.round(this.x - 3 - cam.x) - (spr.mx || 0) + sh - spr.pad, Math.round(this.feet - spr.h - cam.y) - spr.pad);
      return;
    }
    const spr = this.sprite();
    const flash = (this.powerT > 0 || this.chargeT >= 50 || this.crashT > 0) && (W.frame & 4);
    if (spr === this.H.dead) {
      Sprites.draw(ctx, spr, this.cx - spr.w / 2 - cam.x, this.feet - spr.h - cam.y, this.face < 0);
      return;
    }
    for (const t of this.trail) { // Nachbilder
      if (t.tuck) { ctx.globalAlpha = t.life / 10 * 0.35; this.drawTuck(ctx, Sprites.whiteOf(this.H.tuck), t.x - cam.x, t.y - cam.y, t.rot, t.flip); continue; }
      const wc = Sprites.whiteOf(t.spr);
      ctx.globalAlpha = t.life / 12 * 0.32;
      ctx.drawImage(t.flip ? wc.f : wc.c, Math.round(t.x - cam.x) - t.spr.pad, Math.round(t.y - cam.y) - t.spr.pad);
    }
    ctx.globalAlpha = 1;
    this.drawScarf(ctx, cam);
    if (this.limo && typeof LimoStand !== 'undefined') LimoStand.bottle(ctx, Math.round(this.cx - cam.x) - 4, Math.round(this.y - cam.y) - 15 + (Math.floor(this.t / 16) % 2)); // Limonade für die durstige Pflanze
    if (this.state === 'zip' && this.chicken) RubberChicken.paint(ctx, Math.round(this.cx - cam.x) - 6, Math.round(this.feet - 41 - cam.y), this.face < 0); // Huhn als Griff
    if (this.state === 'swing' && this.ring) { // Seil/Peitsche zum Ankerring
      const hx = this.cx + this.face * 3 - cam.x, hy = this.feet - 34 - cam.y, rx = this.ring.cx - cam.x, ry = this.ring.cy - cam.y;
      const n = Math.ceil(Math.hypot(rx - hx, ry - hy) / 2);
      for (let k = 0; k <= n; k++) {
        ctx.fillStyle = this.sword ? (k % 2 ? '#8c6440' : '#c8a070') : this.whip === 1 ? (k % 3 ? PAL.b : PAL.B) : (k % 2 ? PAL.g : PAL.W);
        ctx.fillRect(Math.round(hx + (rx - hx) * k / n), Math.round(hy + (ry - hy) * k / n), 2, 2);
      }
    }
    if (this.rageT > 0) this.drawRage(ctx, cam);
    if (this.flipT > 0 && !this.atkT && this.state === 'normal' && !this.onGround) { // flüssiger Salto (Hock-Pose, jede Frame gedreht)
      const t = this.H.tuck;
      this.drawTuck(ctx, flash ? Sprites.whiteOf(t) : t, this.cx - cam.x, this.feet - 15 - cam.y, this.saltoAngle(), this.face < 0);
      return;
    }
    const sx = Math.round(this.x - 3 - cam.x), sy = Math.round(this.feet - 32 - cam.y); // Bezugspunkt für Waffen
    let scx = 1, scy = 1; // Squash & Stretch
    if (this.landT > 0 && this.onGround) { const k = this.landT / 7; scx = 1 + 0.09 * k; scy = 1 - 0.11 * k; }
    else if (!this.onGround && this.vy < -2.6 && this.state === 'normal') { scx = 0.94; scy = 1.07; }
    if (scx !== 1) {
      const img = flash ? Sprites.whiteOf(spr) : spr, src = this.face < 0 ? img.f : img.c;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.translate(Math.round(this.cx - cam.x), Math.round(this.feet - cam.y)); ctx.scale(scx, scy);
      ctx.drawImage(src, -(spr.w / 2) - spr.pad, -spr.h - spr.pad);
      ctx.restore();
    } else Sprites.draw(ctx, spr, sx - (spr.mx || 0), Math.round(this.feet - spr.h - cam.y), this.face < 0, flash);
    if (this.atkT && !this.atkSub) (this.sword ? this.drawSword(ctx, sx, sy) : this.drawWhip(ctx, sx, sy));
    if (this.dangle) this.drawDangle(ctx, cam);
  }

  saltoAngle() { const k = 1 - this.flipT / FLIP_LEN; return (1 - Math.pow(1 - k, 2.2)) * Math.PI * 2 * this.face; }
  drawTuck(ctx, t, x, y, rot, flip) {
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(rot);
    ctx.drawImage(flip ? t.f : t.c, -(flip ? t.c.width - t.pv[0] : t.pv[0]), -t.pv[1]);
    ctx.restore();
  }
  drawRage(ctx, cam) { // Blutrausch: pulsierende rote Aura + aufsteigende Funken
    const x = this.cx - cam.x, y = this.feet - 16 - cam.y, k = 0.5 + 0.5 * Math.sin(W.frame * 0.4);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + k * 0.25;
    const d = FX.disc(24, [220, 20, 40], [0.5, 0.3, 0.15, 0.05]);
    ctx.drawImage(d, Math.round(x - 24), Math.round(y - 24));
    ctx.restore();
    if (W.frame % 3 === 0) W.spawn(new Particle(this.cx + rnd(-7, 7), this.feet - rnd(4, 30), rnd(-0.2, 0.2), -rnd(0.6, 1.3), Math.random() < 0.5 ? '#fc3c3c' : '#f8b800', 22, 1, -0.01));
  }

  // Wehender Schal: Kette von Punkten, die dem Hals mit Verzögerung folgt.
  updateScarf() {
    if (!this.alive) { this.scarf = null; return; }
    const low = this.h === 20 || (this.atkT && this.crouchAtk);
    const ax = this.cx - this.face * 4, ay = this.feet - 32 + (low ? this.H.crouchDrop : 0);
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
    if (this.crouchAtk) sy += this.H.crouchDrop;
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
    if (p === 0) sword(sx + 1, sy + 3, sx - 9, sy - 10);
    else if (p === 1) sword(sx + 10, sy - 3, sx + 2, sy - 19);
    else {
      const D = this.dir, len = SWORD_LEN[lvl], top = sy;
      const hx = sx + D.hx, hy = top + D.hy;
      sword(hx, hy, hx + Math.cos(D.a) * len, hy + Math.sin(D.a) * len);
      if (this.atkT <= 15) { // Schweif des Hiebs
        ctx.fillStyle = 'rgba(252,252,252,0.5)';
        for (let a = D.a - 1.4; a <= D.a + 0.05; a += 0.05) ctx.fillRect(Math.round(hx - 2 + Math.cos(a) * (len + 2)), Math.round(hy + Math.sin(a) * (len + 2)), 2, 1);
        ctx.fillStyle = 'rgba(252,224,168,0.35)';
        for (let a = D.a - 1.2; a <= D.a; a += 0.07) ctx.fillRect(Math.round(hx - 2 + Math.cos(a) * (len - 4)), Math.round(hy + Math.sin(a) * (len - 4)), 1, 1);
      }
    }
    ctx.restore();
  }

  drawWhip(ctx, sx, sy) {
    const p = this.atkPose, lvl = this.whip;
    if (this.crouchAtk) sy += this.H.crouchDrop;
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
    // Kette als Kurve: jedes Glied dreht sich etwas weiter (Einrollen, Durchhängen, Nachschwingen)
    const chain = (hx, hy, base, curl, len, sag) => {
      const n = Math.max(3, Math.round(len / 2));
      let x = hx, y = hy;
      for (let i = 0; i < n; i++) {
        const s = (i + 1) / n, a = base + curl * Math.pow(s, 1.5) + sag * s * s;
        x += Math.cos(a) * 2; y += Math.sin(a) * 2;
        link(Math.round(x), Math.round(y), i);
      }
      return [Math.round(x), Math.round(y)];
    };
    const t = this.atkT, len = WHIP_LEN[lvl];
    let tip;
    if (p === 0) tip = chain(sx + 1, sy + 3, Math.PI * 0.6, 0.8 + Math.sin(t * 0.7) * 0.15, len * 0.55, 0.5); // ausholen: hängt hinten herab
    else if (p === 1) tip = chain(sx + 10, sy - 3, -Math.PI * 0.8, -1.5, len * 0.6, 0); // Bogen über dem Kopf
    else {
      const D = this.dir, hx = sx + D.hx, hy = sy + D.hy;
      const ext = Math.min(1, (t - 11) / 3), relax = Math.max(0, (t - 15) / Math.max(1, ATK_LEN - 15));
      const curl = (1 - ext) * -2.6; // rollt sich von oben her aus
      const sag = relax * 0.4 + Math.sin(t * 1.3) * 0.06 * ext; // danach Nachschwingen + Durchhängen
      tip = chain(hx, hy, D.a, curl, len * (0.3 + 0.7 * ext), sag);
      if (t === 13 || t === 14) { // Knall an der Spitze
        ctx.fillStyle = '#fcfcfc'; ctx.fillRect(tip[0] - 3, tip[1], 7, 1); ctx.fillRect(tip[0], tip[1] - 3, 1, 7);
        ctx.fillStyle = '#fce0a8'; ctx.fillRect(tip[0] - 1, tip[1] - 1, 3, 3);
      }
    }
    if (lvl === 3) ball(tip[0] - 1, tip[1] + 1);
    ctx.restore();
  }
}
