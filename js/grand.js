// 16-Bit-Erweiterungen: XXL-Kronleuchter mit Mode-7-Drehung + Zoom, Zahnrad-Riesenrad, animierte Lichtstrahlen.
// Gedrehte Grafiken werden vorgerendert und mit Nächster-Nachbar-Abtastung gedreht → harte SNES-Pixel.
'use strict';

const GOLD = ['#2c1400', '#5c3400', '#8c5800', '#b88018', '#e8b030', '#fcd880', '#fcf4d0'];
const CRYS = ['#24305c', '#4c74c8', '#8cc4fc', '#d4f0fc', '#fcfcfc'];

// ---------------- XXL-Kronleuchter ----------------
const GRAND_CANDLES = [-52, -38, -24, 24, 38, 52];
const GRAND_DROPS = []; // Kristall-Positionen (für Glanzpunkte)

function grandSprite(frame) {
  const c = Sprites.canvas(128, 100), x = c.getContext('2d');
  const P = (col, X, Y, w = 1, h = 1) => { x.fillStyle = col; x.fillRect(X, Y, w, h); };
  const CX = 64, RY = 30;
  // Krone mit Aufhängeöse
  P(GOLD[1], CX - 8, 0, 16, 7); P(GOLD[5], CX - 7, 1, 14, 1); P(GOLD[4], CX - 7, 2, 14, 2); P(GOLD[3], CX - 7, 4, 14, 2);
  P(GOLD[6], CX - 6, 1, 3, 1); P('#d82800', CX - 1, 3, 2, 2);
  P(GOLD[2], CX - 2, 7, 4, 3); P(GOLD[4], CX - 1, 7, 1, 3);
  // Tragketten (außen und innen) von der Krone zur Hauptkante
  [[-1, 52], [1, 52], [-1, 26], [1, 26]].forEach(([s, reach]) => {
    for (let i = 0; i < 26; i++) {
      const t = i / 26, X = Math.round(CX + s * (5 + t * (reach - 5))), Y = Math.round(9 + t * (RY - 10));
      P(i % 2 ? GOLD[1] : GOLD[4], X, Y); if (i % 2 === 0) P(GOLD[2], X, Y + 1);
    }
  });
  // Kerzen mit Tülle
  GRAND_CANDLES.forEach(k => {
    P('#f0e0bc', CX + k - 2, RY - 11, 4, 9); P('#fcfcf0', CX + k - 2, RY - 11, 1, 9); P('#c0a880', CX + k + 1, RY - 11, 1, 9);
    P('#fcfcf0', CX + k - 1, RY - 12, 2, 1); P('#f0e0bc', CX + k + 1, RY - 9, 1, 3);
    P(GOLD[2], CX + k - 4, RY - 3, 8, 3); P(GOLD[5], CX + k - 4, RY - 3, 8, 1); P(GOLD[1], CX + k - 3, RY - 1, 6, 1);
  });
  // Hauptkante: 8 Zeilen Gold-Rampe, Kerben + Nieten
  const ramp = [6, 5, 4, 4, 3, 3, 2, 1];
  for (let r = 0; r < 8; r++) { const inset = r < 2 ? 2 - r : r > 5 ? r - 5 : 0; P(GOLD[ramp[r]], CX - 56 + inset, RY + r, 112 - inset * 2, 1); }
  for (let X = CX - 52; X < CX + 52; X += 8) { P(GOLD[2], X, RY + 3, 1, 3); P(GOLD[6], X + 4, RY + 4, 1, 1); P(GOLD[1], X + 4, RY + 5, 1, 1); }
  // geschwungene Arme zur zweiten Etage
  [-1, 1].forEach(s => {
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, X = Math.round(CX + s * (48 - t * 12 + Math.sin(t * Math.PI) * 6)), Y = RY + 8 + i;
      P(GOLD[4], X - 1, Y, 3, 1); P(GOLD[1], X + s, Y, 1, 1); P(GOLD[6], X - s, Y, 1, 1);
    }
  });
  // Mittelstange
  for (let Y = RY + 8; Y < RY + 50; Y++) { P(GOLD[2], CX - 2, Y); P(GOLD[5], CX - 1, Y); P(GOLD[4], CX, Y); P(GOLD[1], CX + 1, Y); }
  // zweite und dritte Etage
  const T2 = RY + 22, T3 = RY + 37;
  [6, 4, 3, 2, 1].forEach((g, r) => P(GOLD[g], CX - 36 + (r > 2 ? 1 : 0), T2 + r, 72 - (r > 2 ? 2 : 0), 1));
  [6, 4, 2, 1].forEach((g, r) => P(GOLD[g], CX - 18, T3 + r, 36, 1));
  // Kristallgehänge
  const drop = (X, Y, len) => {
    for (let i = 0; i < len; i += 4) { P('#7c7c9c', X, Y + i); P(CRYS[1], X - 1, Y + i + 1, 3, 2); P(CRYS[3], X - 1, Y + i + 1); P(CRYS[2], X, Y + i + 2); }
    P(CRYS[2], X - 1, Y + len, 3, 3); P(CRYS[4], X - 1, Y + len); P(CRYS[0], X + 1, Y + len + 2); P(CRYS[3], X, Y + len + 3);
    if (frame === 0) GRAND_DROPS.push([X - CX, Y + len - RY]);
  };
  for (let X = CX - 52; X <= CX + 52; X += 8) if (Math.abs(X - CX) > 4) drop(X, RY + 8, 4 + (Math.abs(X * 7) % 3) * 4);
  for (let X = CX - 32; X <= CX + 32; X += 8) if (Math.abs(X - CX) > 4) drop(X, T2 + 5, 4 + (Math.abs(X * 5) % 2) * 4);
  for (let X = CX - 14; X <= CX + 14; X += 7) if (Math.abs(X - CX) > 3) drop(X, T3 + 4, 4);
  // Spitze mit Blutstein
  for (let i = 0; i < 18; i++) {
    const w = Math.max(1, Math.round(6 - i / 3));
    P(GOLD[i < 4 ? 5 : 3], CX - Math.floor(w / 2), RY + 50 + i, w, 1); P(GOLD[1], CX + Math.ceil(w / 2) - 1, RY + 50 + i);
  }
  P('#580008', CX - 4, RY + 51, 8, 8); P('#a80020', CX - 3, RY + 52, 6, 6); P('#e83c20', CX - 2, RY + 53, 4, 4); P('#fcbca0', CX - 2, RY + 53, 2, 1); P('#fcfcfc', CX - 2, RY + 53);
  // Flammen (je Frame anders)
  GRAND_CANDLES.forEach((k, i) => {
    const f = (frame + i) % 3, h = [5, 6, 4][f], lean = f === 1 ? 1 : 0;
    P('#a82000', CX + k - 2 + lean, RY - 11 - h, 4, h - 1);
    P('#f87800', CX + k - 1 + lean, RY - 12 - h, 3, h);
    P('#f8b800', CX + k - 1 + lean, RY - 11 - h + 1, 2, h - 2);
    P('#fcfcfc', CX + k, RY - 13, 1, 2);
  });
  // Glanzpunkte auf zufälligen Kristallen
  if (frame > 0) for (let i = 0; i < 4; i++) {
    const [dx, dy] = GRAND_DROPS[(frame * 7 + i * 11) % GRAND_DROPS.length];
    P(CRYS[4], CX + dx - 2, RY + dy + 1, 5, 1); P(CRYS[4], CX + dx, RY + dy - 1, 1, 5);
  }
  return c;
}

class GrandChandelier extends Ent {
  static frames() {
    if (!GrandChandelier._f) GrandChandelier._f = [0, 1, 2, 3].map(grandSprite);
    return GrandChandelier._f;
  }
  constructor(d) {
    super(0, 0, 108, 8);
    this.kind = 'platform'; this.ax = d.x * T; this.ay = d.y * T; this.L = d.len; this.amp = d.amp; this.phase = d.phase || 0;
    this.speed = d.speed || 0.02; this.hw = 54; this.slack = 3; this.sc = 1;
    this.ang = this.prevAng = this.angleAt(0); this.dx = this.dy = 0;
    this.place();
  }
  angleAt(t) { return this.amp * Math.sin(t * this.speed + this.phase); }
  // lokale Koordinate (lx entlang der Kante, ly ab Anker nach unten) → Welt
  world(lx, ly, a = this.ang) { const c = Math.cos(a), s = Math.sin(a); return [this.ax + lx * c + ly * s, this.ay - lx * s + ly * c]; }
  localX(x, a = this.ang) { return (x - this.ax - this.L * Math.sin(a)) / Math.cos(a); }
  // schräge Standfläche: Höhe an der Stelle x (oder null außerhalb)
  surfaceAt(x) {
    const lx = this.localX(x);
    return Math.abs(lx) > this.hw * this.sc ? null : this.world(lx, this.L)[1];
  }
  // Mitnahme des Punktes, auf dem der Spieler steht (Drehung, nicht nur Verschiebung)
  carryAt(x) {
    const lx = this.localX(x, this.prevAng);
    const [x0, y0] = this.world(lx, this.L, this.prevAng), [x1, y1] = this.world(lx, this.L, this.ang);
    return [x1 - x0, y1 - y0];
  }
  place() { const [cx, cy] = this.world(0, this.L); this.x = cx - this.w / 2; this.y = cy; }
  update() {
    this.t++;
    this.prevAng = this.ang; this.ang = this.angleAt(this.t);
    this.sc = 1 + 0.06 * (1 - Math.abs(this.ang) / this.amp); // Mode-7-Zoom beim Durchschwingen
    const ox = this.x, oy = this.y;
    this.place(); this.dx = this.x - ox; this.dy = this.y - oy;
    if (this.t % 41 === 0 && W.ents.length < 700) { // Wachstropfen
      const [wx, wy] = this.world(GRAND_CANDLES[this.t % 6], this.L - 2);
      W.spawn(new Particle(wx, wy, 0, 0.3, '#fcf0c8', 80, 1, 0.1));
    }
    // Knarzen an den Umkehrpunkten
    const v = this.ang - this.prevAng;
    if (this.lastV !== undefined && Math.sign(v) !== Math.sign(this.lastV) && this.onScreen(40)) Audio8.sfx('creak');
    this.lastV = v;
  }
  lights(L, cx, cy, flick) {
    [-45, 0, 45].forEach((lx, i) => {
      const [wx, wy] = this.world(lx, this.L - 16);
      L.push({ x: wx - cx, y: wy - cy, r: (i === 1 ? 74 : 54) + flick(this.ax + i), c: [252, 176, 72], a: 0.6 });
    });
  }
  draw(ctx) {
    const sx = this.ax - W.cam.x, sy = this.ay - W.cam.y;
    if (sx < -200 || sx > View.w + 200) return;
    const s = this.sc, top = this.L - 30 * s;
    // Kette: abwechselnd quer/hochkant liegende Glieder entlang der gedrehten Achse
    for (let v = 0, i = 0; v < top; v += 4, i++) {
      const [wx, wy] = this.world(0, v), X = Math.round(wx - W.cam.x), Y = Math.round(wy - W.cam.y);
      if (Y < -4 || Y > View.fh) continue;
      ctx.fillStyle = '#1c1c24'; ctx.fillRect(X - 2, Y, 5, 4);
      ctx.fillStyle = i % 2 ? '#5c5c6c' : '#9c9cac'; if (i % 2) ctx.fillRect(X, Y, 1, 4); else ctx.fillRect(X - 1, Y + 1, 3, 2);
    }
    const img = GrandChandelier.frames()[Math.floor(W.frame / 7) % 4];
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(sx), Math.round(sy)); ctx.rotate(-this.ang); ctx.translate(0, this.L); ctx.scale(s, s);
    ctx.drawImage(img, -64, -30);
    ctx.restore();
  }
}

// ---------------- Zahnrad-Riesenrad ----------------
function cogSprite(R, teeth, spokes) {
  const S = (R + 8) * 2, h = S / 2, c = Sprites.canvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), d = img.data;
  const RAMP = [[20, 14, 12], [52, 38, 28], [86, 62, 42], [126, 94, 56], [168, 128, 68], [210, 170, 104], [242, 218, 158]];
  const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
    const dx = px + 0.5 - h, dy = py + 0.5 - h, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const outer = R + (Math.cos(a * teeth) > 0.3 ? 6 : 0);
    if (r > outer) continue;
    let bevel = 0, ok = false;
    if (r >= R - 6) { ok = true; bevel = r > outer - 1.5 ? -1 : r < R - 4.6 ? 1 : 0; }
    else if (r <= 10) { ok = true; bevel = r > 8.6 ? -1 : r < 3 ? 1 : 0; }
    else for (let k = 0; k < spokes; k++) {
      const ak = k / spokes * Math.PI * 2, wide = k % 2 === 0 ? 3 : 1.8;
      if (Math.cos(a - ak) > 0 && Math.abs(r * Math.sin(a - ak)) < wide) { ok = true; break; }
    }
    if (!ok) continue;
    const light = (-dx - dy) / (r || 1) * 0.7;
    const k = Math.max(0, Math.min(6, Math.round(3 + light * 1.6 + bevel * 1.4 + (B[(py & 3) * 4 + (px & 3)] / 16 - 0.5) * 0.8)));
    const i = (py * S + px) * 4; d[i] = RAMP[k][0]; d[i + 1] = RAMP[k][1]; d[i + 2] = RAMP[k][2]; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.fillStyle = '#d82800'; x.fillRect(h - 2, h - 2, 4, 4); x.fillStyle = '#fc7460'; x.fillRect(h - 2, h - 2, 2, 2);
  return c;
}

class CogWheel extends Ent {
  constructor(d) {
    super(d.x * T, d.y * T, 0, 0);
    this.kind = 'platform'; this.solid = false; this.R = d.r; this.n = d.n; this.sp = d.speed; this.ang = d.phase || 0;
    this.img = cogSprite(this.R, 18, this.n * 2);
    this.ledges = Array.from({ length: this.n }, (_, i) => new CogLedge(this, i));
  }
  update() { this.t++; this.ang += this.sp; if (this.t % 24 === 0 && Math.abs(this.x - W.player.cx) < View.w * 0.7) Audio8.sfx('cog'); }
  draw(ctx) {
    const sx = this.x - W.cam.x, sy = this.y - W.cam.y;
    if (sx < -120 || sx > View.w + 120) return;
    // Wandhalterung hinter dem Rad
    ctx.fillStyle = '#14141c'; ctx.fillRect(Math.round(sx) - 3, Math.round(sy), 6, 300);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(sx), Math.round(sy)); ctx.rotate(this.ang);
    ctx.drawImage(this.img, -this.img.width / 2, -this.img.height / 2);
    ctx.restore();
  }
}
class CogLedge extends Ent {
  constructor(wheel, i) { super(0, 0, 28, 6); this.kind = 'platform'; this.wheel = wheel; this.i = i; this.dx = this.dy = 0; this.place(); }
  pivot() { const w = this.wheel, a = w.ang + this.i * Math.PI * 2 / w.n; return [w.x + Math.cos(a) * w.R, w.y + Math.sin(a) * w.R]; }
  place() { const [px, py] = this.pivot(); this.x = px - this.w / 2; this.y = py + 5; }
  update() { const ox = this.x, oy = this.y; this.place(); this.dx = this.x - ox; this.dy = this.y - oy; }
  draw(ctx) {
    const [px, py] = this.pivot(), X = Math.round(this.x - W.cam.x), Y = Math.round(this.y - W.cam.y);
    if (X < -40 || X > View.w + 40) return;
    const PX = Math.round(px - W.cam.x), PY = Math.round(py - W.cam.y);
    ctx.fillStyle = '#2c2418'; ctx.fillRect(PX - 1, PY - 1, 3, Y - PY + 1);
    ctx.fillStyle = '#b08848'; ctx.fillRect(PX, PY, 1, Y - PY);
    ctx.fillStyle = '#d82800'; ctx.fillRect(PX - 1, PY - 1, 3, 3);
    ctx.fillStyle = '#1c140c'; ctx.fillRect(X - 1, Y, 30, 7);
    ctx.fillStyle = '#86643c'; ctx.fillRect(X, Y, 28, 5);
    ctx.fillStyle = '#f2da9e'; ctx.fillRect(X, Y, 28, 1);
    ctx.fillStyle = '#d2aa68'; ctx.fillRect(X, Y + 1, 28, 1);
    ctx.fillStyle = '#563e2a'; ctx.fillRect(X, Y + 4, 28, 1);
    ctx.fillStyle = '#f2da9e'; [3, 13, 24].forEach(k => ctx.fillRect(X + k, Y + 2, 1, 1));
  }
}

// ---------------- Animierte Lichtstrahlen (Farb-Mathematik wie BG3 auf dem SNES) ----------------
const Rays = (() => {
  // [x, Unterkante y, Breite, rgb] im 512px breiten Wand-Layer (Parallax 0.5)
  const WIN = {
    hall: [[64, 128, 32, '140,160,255'], [320, 128, 32, '140,160,255']],
    throne: [[104, 96, 48, '255,96,170'], [40, 130, 24, '255,200,96'], [392, 130, 24, '110,170,255']],
    crypt: [[20, 88, 22, '120,150,255'], [272, 122, 22, '120,150,255']],
  };
  const grads = new Map();
  function draw(ctx, room, cam, frame) {
    const wins = WIN[room.theme];
    if (!wins) return;
    const off = ((Math.floor(cam.x * 0.5) % 512) + 512) % 512;
    const vt = room.h > 13 && room.theme !== 'throne';
    const oy = vt ? ((Math.floor(cam.y * 0.5) % 208) + 208) % 208 : 0;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    wins.forEach(([wx, wb, ww, rgb], i) => {
      for (let k = -1; k <= Math.ceil(View.w / 512) + 1; k++) {
        for (const ty of oy ? [-oy, 208 - oy] : [0]) {
          const X = wx - off + k * 512, Y = wb + ty;
          if (X > View.w + 40 || X + ww + 120 < 0 || Y > 208) continue;
          const len = 208 - Y + 20, slant = 0.55;
          const pulse = 0.7 + 0.3 * Math.sin(frame * 0.021 + i * 1.7) * Math.sin(frame * 0.0071 + i);
          if (grads.size > 48) grads.clear();
          let g = grads.get(rgb + len);
          if (!g) { g = ctx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, `rgba(${rgb},0.26)`); g.addColorStop(0.55, `rgba(${rgb},0.1)`); g.addColorStop(1, `rgba(${rgb},0)`); grads.set(rgb + len, g); }
          ctx.save(); ctx.translate(X, Y); ctx.globalAlpha = pulse;
          ctx.fillStyle = g; ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(ww, 0); ctx.lineTo(ww + len * slant * 1.15, len); ctx.lineTo(len * slant * 0.85, len); ctx.closePath(); ctx.fill();
          // Staubkörnchen im Strahl
          ctx.globalAlpha = 0.55 * pulse; ctx.fillStyle = `rgb(${rgb})`;
          for (let m = 0; m < 9; m++) {
            const u = ((m * 0.137 + frame * 0.0009 * (1 + (m % 3) * 0.4)) % 1), yy = u * len * 0.8;
            const xx = yy * slant + ((m * 37) % ww) + Math.sin(frame * 0.02 + m) * 3;
            ctx.fillRect(Math.round(xx), Math.round(yy), 1, 1);
          }
          ctx.restore();
        }
      }
    });
    ctx.restore();
  }
  return { draw };
})();
