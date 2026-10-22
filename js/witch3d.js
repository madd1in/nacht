// Eishexe (Zwischengegner im Eisturm) als vorgerenderte PS2-3D-Figur aus Blender: Low-Poly-Robe mit Eiszacken am Saum,
// Kristallkragen, Eiskrone, Augenband mit glühenden Augen, wehender Umhang, Stab mit Eiskugel. Neun Bilder: Schweben (4),
// Zaubern mit erhobenem Stab (2), Sturzflug (2), Rast am Boden (1). Ersetzt beim Laden nur das Zeichnen der Hexe aus ice.js –
// Verhalten und Trefferbox bleiben; fehlt das Bild, bleibt die gezeichnete Pixel-Hexe.
'use strict';
(() => {
  // [x, y, w, h, Anker x, Anker y (Spitze der Eiszacken), Eiskugel x, y relativ zum Anker] – Figur schaut nach rechts
  const MAP = {"float0":[0,0,53,80,35,78,9.0,-74.7],"float1":[54,0,50,81,32,79,9.0,-75.6],"float2":[105,0,48,80,30,78,9.0,-74.7],"float3":[154,0,51,79,33,77,9.0,-73.8],"cast0":[0,82,52,88,34,86,8.5,-81.9],"cast1":[53,82,50,92,32,90,9.5,-84.9],"swoop0":[104,82,84,66,48,63,33.3,-21.8],"swoop1":[0,175,83,82,48,79,32.0,-15.5],"rest":[84,175,57,60,32,58,22.3,-44.0]};
  const img = new Image();
  img.onload = () => {
    if (typeof IceWitch === 'undefined') return;
    const fr = {};
    for (const k in MAP) {
      const r = MAP[k], c = Sprites.canvas(r[2], r[3]);
      c.getContext('2d').drawImage(img, r[0], r[1], r[2], r[3], 0, 0, r[2], r[3]);
      fr[k] = { s: Sprites.fromCanvas(c, true), w: r[2], ax: r[4], ay: r[5], ox: r[6], oy: r[7] };
    }
    const flat = IceWitch.prototype.draw;
    IceWitch.prototype.draw = function (ctx) {
      const st = this.state, t = this.t, d = this.face >= 0 ? 1 : -1;
      const cast = st === 'shards' || st === 'rain' || st === 'summon';
      const key = cast ? 'cast' + (this.timer > 14 ? 1 : 0) : st === 'swoop' && this.timer >= 26 ? 'swoop' + ((t >> 2) & 1) : st === 'rest' ? 'rest' : 'float' + ((t >> 3) & 3);
      const f = fr[key];
      if (!f) return flat.call(this, ctx);
      const X = Math.round(this.cx - W.cam.x), F = Math.round(this.y + this.h - W.cam.y) + 2, fl = this.flashT > 0 && (t & 2);
      const gy = Math.round(this.gy - W.cam.y), sh = Math.max(0.12, 0.5 - (this.gy - (this.y + this.h)) / 220); // Schatten am Boden
      ctx.fillStyle = `rgba(20,40,90,${sh.toFixed(2)})`; ctx.beginPath(); ctx.ellipse(X, gy - 1, 22, 3, 0, 0, Math.PI * 2); ctx.fill();
      const g = ctx.createRadialGradient(X, F - 36, 0, X, F - 36, 54); g.addColorStop(0, 'rgba(124,220,255,0.3)'); g.addColorStop(1, 'rgba(124,220,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(X - 54, F - 90, 108, 108); ctx.globalCompositeOperation = 'source-over';
      Sprites.draw(ctx, f.s, X - (d > 0 ? f.ax : f.w - f.ax), F - f.ay, d < 0, fl);
      const ox = X + d * f.ox, oy = F + f.oy, rad = cast ? 15 + Math.sin(t * 0.3) * 2 : 10; // Glanz um die Eiskugel
      const og = ctx.createRadialGradient(ox, oy, 0, ox, oy, rad);
      og.addColorStop(0, 'rgba(220,250,255,0.8)'); og.addColorStop(1, 'rgba(124,220,255,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = og; ctx.fillRect(ox - rad, oy - rad, rad * 2, rad * 2); ctx.globalCompositeOperation = 'source-over';
    };
  };
  img.src = 'img/witch3d.png?v=' + (window.BUILD || '');
})();
