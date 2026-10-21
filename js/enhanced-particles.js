// Enhanced Particle System for NACHTMAHR
// Blood, dust, sparkles, snow effects
'use strict';

const EnhancedParticles = (() => {
  const pool = [];
  const MAX_PARTICLES = 200;

  function spawn(x, y, vx, vy, color, life, size, gravity = 0.3, type = 'circle') {
    if (pool.length >= MAX_PARTICLES) {
      pool.shift(); // Remove oldest
    }

    pool.push({
      x, y, vx, vy, color, life, maxLife: life,
      size, gravity, type,
      alpha: 1.0,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2
    });
  }

  function update(dt) {
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vy += p.gravity * dt * 60;
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotSpeed;
      p.life--;
      p.alpha = p.life / p.maxLife;

      if (p.life <= 0) {
        pool.splice(i, 1);
      }
    }
  }

  function draw(ctx) {
    ctx.save();
    for (const p of pool) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;

      const sx = p.x - (W.cam ? W.cam.x : 0);
      const sy = p.y - (W.cam ? W.cam.y : 0);

      if (p.type === 'circle') {
        ctx.beginPath();
        ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'square') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(p.rotation);
        ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
        ctx.restore();
      } else if (p.type === 'line') {
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-p.size * 2, -1, p.size * 4, 2);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  // Preset effects
  const presets = {
    blood(x, y, direction = 1) {
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2 + (direction > 0 ? 0 : Math.PI);
        const speed = 1.5 + Math.random() * 2;
        spawn(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed - 1,
          '#c03030',
          25, 2, 0.4, 'circle'
        );
      }
    },

    dust(x, y, direction) {
      for (let i = 0; i < 4; i++) {
        spawn(
          x + (Math.random() - 0.5) * 8,
          y,
          direction * (0.5 + Math.random()),
          -Math.random() * 0.5,
          '#d0d0c0',
          20, 1.5, 0.05, 'square'
        );
      }
    },

    sparkle(x, y, color = '#ffff80') {
      for (let i = 0; i < 12; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 2;
        spawn(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          i % 2 ? color : '#ffffff',
          30, 1.5, 0.2, 'circle'
        );
      }
    },

    explosion(x, y, size = 1) {
      for (let i = 0; i < 20 * size; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        const colors = ['#ffff80', '#ff8040', '#ff4040'];
        spawn(
          x, y,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
          colors[Math.floor(Math.random() * colors.length)],
          40, 2 * size, 0.3, 'circle'
        );
      }
    },

    smoke(x, y) {
      spawn(x, y, (Math.random() - 0.5) * 0.5, -1 - Math.random(),
            '#606060', 60, 3, -0.05, 'circle');
    },

    snow(x, y, wind = 0) {
      spawn(x, y, wind + (Math.random() - 0.5) * 0.5, 1 + Math.random(),
            '#ffffff', 120, 1, 0.02, 'circle');
    }
  };

  return {
    spawn,
    update,
    draw,
    ...presets,
    get count() { return pool.length; },
    clear() { pool.length = 0; }
  };
})();
