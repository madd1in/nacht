// Dramatik: Schockwellen, Pixel-Zerfall besiegter Gegner, Gefahren-Vignette; neuer Gegner „Gespenst“.
'use strict';

class Shock extends Ent {
  constructor(x, y, maxR = 60, col = '#fcfcfc', speed = 4) {
    super(x, y, 0, 0); this.kind = 'fx'; this.r = 2; this.maxR = maxR; this.col = col; this.sp = speed;
  }
  update() { this.t++; this.r += Math.max(0.8, this.sp * (1 - this.r / (this.maxR * 1.25))); if (this.r >= this.maxR) this.dead = true; }
  draw(ctx) {
    const a = 1 - this.r / this.maxR, cx = this.x - W.cam.x, cy = this.y - W.cam.y;
    ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = this.col;
    const n = Math.max(18, Math.round(this.r * 1.7)), th = this.r > 30 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(t) * this.r), Math.round(cy + Math.sin(t) * this.r * 0.8), th, th);
    }
    ctx.globalAlpha = 1;
  }
}

const Drama = (() => {
  const cache = new WeakMap();
  const pixels = (img) => {
    let d = cache.get(img);
    if (!d) { // einmalig über eine CPU-Leinwand auslesen (kein GPU-Readback)
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
      d = x.getImageData(0, 0, img.width, img.height).data; cache.set(img, d);
    }
    return d;
  };
  // Zerlegt eine zuletzt gezeichnete Figur in 2x2-Pixel-Partikel, die auseinanderfliegen.
  function disintegrate(rec, power = 1) {
    if (!rec || !rec.s || W.ents.length > 900) return;
    const s = rec.s, img = rec.flip ? s.f : s.c, d = pixels(img), step = s.w > 40 ? 3 : 2;
    const cx = rec.x + s.w / 2, cy = rec.y + s.h / 2;
    let n = 0;
    for (let y = 0; y < img.height; y += step) for (let x = 0; x < img.width; x += step) {
      const i = (y * img.width + x) * 4;
      if (d[i + 3] < 200 || (d[i] < 24 && d[i + 1] < 12 && d[i + 2] < 32)) continue;
      const wx = rec.x - s.pad + x, wy = rec.y - s.pad + y, dx = wx - cx, dy = wy - cy, l = Math.hypot(dx, dy) || 1;
      W.spawn(new Particle(wx, wy, (dx / l * rnd(0.4, 1.8) + rnd(-0.3, 0.3)) * power, (dy / l * rnd(0.3, 1.4) - rnd(0.6, 2)) * power,
        `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, 24 + rnd(0, 26), step, 0.08));
      if (++n > 260) return;
    }
  }
  // Rote, pulsierende Bildrand-Vignette bei wenig Leben
  let danger = null, dangerW = 0;
  function drawDanger(ctx, w, a) {
    if (!danger || dangerW !== w) {
      dangerW = w; danger = Sprites.canvas(w, 208);
      const x = danger.getContext('2d'), img = x.createImageData(w, 208), px = img.data;
      const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = 0; y < 208; y++) for (let X = 0; X < w; X++) {
        const e = Math.min(X, w - 1 - X, y * 1.6, (207 - y) * 1.6);
        const v = Math.max(0, 1 - e / 46);
        if (v * 16 > B[(y & 3) * 4 + (X & 3)]) { const i = (y * w + X) * 4; px[i] = 200; px[i + 1] = 0; px[i + 2] = 24; px[i + 3] = Math.round(140 + v * 100); }
      }
      x.putImageData(img, 0, 0);
    }
    ctx.globalAlpha = a; ctx.drawImage(danger, 0, 0); ctx.globalAlpha = 1;
  }
  return { disintegrate, drawDanger };
})();

// ---------------- Gespenst ----------------
(() => {
  const body = ['.....WWWWWW.....', '...WWwwwwwwWW...', '..WwwwwwwwwwwW..', '.WwwkkwwwwkkwwW.', '.WwkkkwwwwkkkwW.',
    'WwwkkwwwwwwkkwwW', 'WwwwwwkkkkwwwwwW', 'WwwwwwkkkkwwwwwW', 'WwwwwwwkkwwwwwwW', 'WwwwwwwwwwwwwwwW', 'WwwwwwwwwwwwwwwW', '.WwwwwwwwwwwwwW.'];
  Sprites.S.ghost = [
    Sprites.make([...body, '.Wwww.WwwW.wwwW.', '..Ww...WW...wW..']),
    Sprites.make([...body, '.WwwW.wwwW.WwwW.', '.Ww...Ww...Ww...']),
  ];
})();

class Ghost extends Enemy {
  constructor(tx, ty) {
    super(tx * T + 2, ty * T, 12, 12, 2, 2, 400);
    this.phase = 'hidden'; this.timer = 40 + Math.floor(rnd(0, 60)); this.alpha = 0; this.baseY = this.y;
  }
  get solidNow() { return this.alpha > 0.6; }
  hit(dmg, id) { return this.solidNow ? super.hit(dmg, id) : false; }
  update() {
    super.update();
    if (!this.onScreen(40)) return;
    const p = W.player;
    this.timer--;
    if (this.phase === 'hidden' && this.timer <= 0) {
      this.phase = 'in'; this.timer = 40;
      this.x = clamp(p.cx + (Math.random() < 0.5 ? -1 : 1) * rnd(50, 90), W.cam.x + 10, W.cam.x + View.w - 20);
      this.baseY = clamp(p.y - rnd(0, 24), W.cam.y + 20, W.cam.y + 170);
      Audio8.sfx('rise');
    } else if (this.phase === 'in') { this.alpha = 1 - this.timer / 40; if (this.timer <= 0) { this.phase = 'vis'; this.timer = 150; } }
    else if (this.phase === 'vis') { this.alpha = 1; if (this.timer <= 0) { this.phase = 'out'; this.timer = 40; } }
    else if (this.phase === 'out') { this.alpha = this.timer / 40; if (this.timer <= 0) { this.phase = 'hidden'; this.timer = 60; this.alpha = 0; } }
    if (this.alpha > 0) {
      const dx = p.cx - this.cx;
      this.face = Math.sign(dx) || 1;
      this.x += clamp(dx * 0.01, -0.45, 0.45);
      this.baseY += clamp(p.y + 4 - this.baseY, -0.25, 0.25);
      this.y = this.baseY + Math.sin(this.t * 0.06) * 6;
    }
    if (this.solidNow) this.touch();
  }
  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.globalAlpha = this.alpha * (this.solidNow ? 0.9 : 0.5);
    const s = Sprites.S.ghost[Math.floor(this.t / 10) % 2];
    this.ds(ctx, s, Math.round(this.cx - s.w / 2 - W.cam.x), Math.round(this.y - 6 - W.cam.y), this.face < 0, this.flash);
    ctx.globalAlpha = 1;
  }
}
