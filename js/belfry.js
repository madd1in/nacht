// Glockenturm: riesige, durchscheinende Vorhangbahnen, die von oben durch den Turmschacht hängen und im Wind wehen.
// Hinten (zwischen Säulen und Spielebene) und vorn (vor dem Helden, ganz zart). Eine Welle läuft die Bahnen hinab, der Saum
// flattert; schlägt die Glocke, bläht eine Böe sie auf. Lichtspiel: ein Band Mondlicht wandert über die Stoffe (Wolken
// ziehen vor dem Mond), die Falten fangen blaues und rotes Licht der Bleiglasfenster; im Blitz leuchten sie weiß-blau auf.
// Perspektive wie die Fensternischen und Säulen der Halle: Fluchtpunkt Bildmitte/y 60, Spielebene bei z = 200.
'use strict';

class BelfryCurtains extends Ent {
  constructor(d) {
    super(0, 0, 8, 8); this.kind = 'prop'; this.gust = 0; this.lastBell = null;
    const H = W.room.h * T;
    this.list = (d.list || [ // x, Oberkante, Länge, Breite, Tiefe z
      [40, -30, 300, 70, 330], [250, -40, 330, 84, 350], [420, -20, 280, 64, 320],
      [120, 230, 300, 76, 340], [350, 250, 290, 70, 310], [-60, 210, 320, 80, 360],
      [190, 60, 360, 84, 150], [470, 300, 300, 76, 160],
    ]).map(([x, y, L, w, z], i) => ({ x, y: Math.min(y, H - 40), L, w, z, ph: i * 1.7 }));
  }
  update() {
    this.t++;
    this.x = W.cam.x + View.w / 2; this.y = W.cam.y + 100;
    if (this.lastBell !== null && W.bellCd > this.lastBell + 40) this.gust = 1; // die Glocke hat geschlagen: Böe
    this.lastBell = W.bellCd;
    if (FX.stormOn(W.storm) && this.gust < 0.45) this.gust = 0.45;
    this.gust *= 0.985;
  }
  drawSet(ctx, front) {
    const cam = W.cam, w = View.w, VX = w / 2, VY = 60, t = this.t, flash = FX.stormOn(W.storm) ? 1 : W.storm.flash > 0 ? 0.25 : 0;
    const sweep = VX + Math.sin(t * 0.004) * w * 0.7 + Math.sin(t * 0.0013) * w * 0.3, wind = 0.75 + 0.25 * Math.sin(t * 0.011) + this.gust * 1.6;
    for (const c of this.list) {
      if ((c.z < 200) !== front) continue;
      const k = 200 / c.z, sx = VX + (c.x - cam.x - VX) * k, top = VY + (c.y - cam.y - VY) * k, H = c.L * k, wd = c.w * k / 2;
      if (top > 210 || top + H < -4 || sx + wd * 2 < -40 || sx - wd * 2 > w + 40) continue;
      const n = 30, hh = Math.ceil(H / n) + 1, base = front ? 0.07 : 0.26, sk = Math.max(1, Math.round(2 * k));
      ctx.save();
      for (let i = 0; i < n; i++) {
        const u = i / n, y = Math.round(top + H * u);
        if (y > 210 || y + hh < 0) continue;
        const wave = Math.sin(u * 5.4 - t * 0.06 * wind + c.ph) * (3 + 20 * u) * k * wind + Math.sin(u * 2.1 + t * 0.021 + c.ph) * 6 * u * k;
        const cx = sx + wave, wid = wd * (1 + 0.4 * u * wind) * (1 + 0.12 * Math.sin(t * 0.03 + c.ph + u * 3));
        const moon = Math.max(0, Math.cos((cx - sweep) / (w * 0.22))) ** 2; // wanderndes Mondlicht
        const a = base * (1 - Math.pow(u, 4) * 0.7) * (0.75 + 0.6 * moon) + flash * (front ? 0.035 : 0.2); // vorn bleibt der Held sichtbar
        const r = Math.round(176 + 40 * moon + 60 * flash), g = Math.round(150 + 60 * moon + 90 * flash), b = Math.round(212 + 40 * moon + 40 * flash); // fahles Geisterlavendel
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(${r},${g},${b},${a.toFixed(3)})`; ctx.fillRect(Math.round(cx - wid), y, Math.round(wid * 2), hh); // Schleier
        ctx.globalCompositeOperation = 'lighter';
        const ea = (a * (0.9 + moon * 0.8)).toFixed(3);
        ctx.fillStyle = `rgba(235,220,255,${ea})`; ctx.fillRect(Math.round(cx - wid), y, sk, hh); ctx.fillRect(Math.round(cx + wid - sk), y, sk, hh); // Kanten im Licht
        [-0.62, -0.22, 0.2, 0.58].forEach((f, j) => { // Falten: abwechselnd blaues und rotes Fensterlicht
          ctx.fillStyle = j % 2 ? `rgba(110,140,255,${(a * 0.85).toFixed(3)})` : `rgba(255,90,120,${(a * 0.7).toFixed(3)})`;
          ctx.fillRect(Math.round(cx + wid * f + Math.sin(u * 7 + f * 4 + t * 0.05) * 3 * k), y, Math.max(1, Math.round(2.6 * k)), hh);
        });
        if (i === n - 1) { ctx.fillStyle = `rgba(255,220,235,${(a * 1.8).toFixed(3)})`; ctx.fillRect(Math.round(cx - wid), y + hh - 2, Math.round(wid * 2), 2); } // Saum
      }
      ctx.restore();
    }
  }
  drawBack(ctx) { this.drawSet(ctx, false); }
  drawFront(ctx) { this.drawSet(ctx, true); }
}
