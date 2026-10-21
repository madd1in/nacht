// Ice Tower Slide: Ultra-vertikaler Buntglas-Turm Descent
// Anor Londo-Style abwärts mit Peitscheneinhaken, XXL-Kronleuchtern, Avalanche Chase
// Trigger: Nach finalem Boss oder als Secret Level
'use strict';

const IceTower = (() => {
  let active = false;
  let progress = 0; // 0 to 1 (top to bottom)
  let speed = 0.5;
  let lane = 0; // -1, 0, 1 (left, center, right)
  let ducking = false;
  let checkpoints = 0;
  let avalanche = 100; // Distance from player in meters
  let grapple = null;
  let chandeliers = [];
  let obstacles = [];
  let completed = false;

  const TOWER_HEIGHT = 100; // meters
  const LANE_WIDTH = 60; // pixels
  const MAX_SPEED = 3.0;
  const ACCELERATION = 0.6;

  function init() {
    active = true;
    progress = 0;
    speed = 0.5;
    lane = 0;
    ducking = false;
    checkpoints = 0;
    avalanche = 100;
    grapple = null;
    completed = false;

    // 6 XXL Chandeliers with grapple crystals
    chandeliers = [];
    for (let i = 0; i < 6; i++) {
      chandeliers.push({
        progress: 0.15 + i * 0.15,
        lane: (i % 3) - 1,
        active: true,
        crystals: 4
      });
    }

    // 12 Ice Stalactites
    obstacles = [];
    for (let i = 0; i < 12; i++) {
      obstacles.push({
        progress: 0.08 + i * 0.08,
        lane: Math.floor(Math.random() * 3) - 1,
        passed: false,
        destroyed: false,
        hit: false
      });
    }

    // Start music
    Audio8.music('boss');
  }

  function update(dt) {
    if (!active) return;

    // Accelerate downward
    speed = Math.min(MAX_SPEED, speed + ACCELERATION * dt);
    progress += (speed / TOWER_HEIGHT) * dt;

    // Lane control
    const input = Input.get();
    if (input.left) lane = Math.max(-1, lane - 3 * dt);
    if (input.right) lane = Math.min(1, lane + 3 * dt);

    // Duck control
    ducking = input.down;

    // Dash boost (special weapon button)
    if (input.subTap) {
      speed += 1.5;
      W.score += 100;
      Audio8.fx.dash();
    }

    // Whip grapple/attack
    if (input.atkTap) {
      // Check for nearby chandelier
      const nearChandelier = chandeliers.find(ch =>
        Math.abs(ch.progress - progress) < 0.05 &&
        Math.abs(ch.lane - lane) < 0.4 &&
        ch.active
      );

      if (nearChandelier) {
        // Grapple to chandelier
        grapple = { chandelier: nearChandelier, timer: 25 };
        speed *= 0.3;
        W.score += 250;
        Audio8.fx.collect();
      } else {
        // Attack obstacle
        const nearObstacle = obstacles.find(obs =>
          Math.abs(obs.progress - progress) < 0.03 &&
          Math.abs(obs.lane - lane) < 0.4 &&
          !obs.passed
        );

        if (nearObstacle) {
          nearObstacle.passed = true;
          nearObstacle.destroyed = true;
          W.score += 300;
          Audio8.fx.candleBreak();
          // Spawn particles
          for (let i = 0; i < 8; i++) {
            W.part(View.w / 2 + rnd(-15, 15), View.h / 2 + rnd(-15, 15),
                   rnd(-2, 2), rnd(-3, -1), '#ffff40', 30, 2, 0.2);
          }
        }
      }
    }

    // Grapple release
    if (grapple) {
      grapple.timer--;
      if (grapple.timer <= 0) {
        speed += 0.8; // Boost after grapple
        grapple = null;
      }
    }

    // Avalanche catches up
    avalanche -= (1.8 - speed * 0.4) * dt;

    // Obstacle collision
    obstacles.forEach(obs => {
      if (obs.passed || obs.destroyed) return;

      if (Math.abs(obs.progress - progress) < 0.02) {
        const laneDist = Math.abs(obs.lane - lane);
        if (laneDist < 0.4) {
          if (ducking) {
            // Successfully ducked
            obs.passed = true;
            W.score += 200;
            Audio8.fx.step();
            // Green particles
            for (let i = 0; i < 6; i++) {
              W.part(View.w / 2 + rnd(-10, 10), View.h / 2 + 20 + rnd(-5, 5),
                     rnd(-1.5, 1.5), rnd(-2, -0.5), '#40ff80', 25, 2, 0.15);
            }
          } else if (!obs.hit) {
            // Hit obstacle
            obs.passed = true;
            obs.hit = true;
            speed *= 0.6;
            avalanche -= 5;
            W.player.hurt(1);
            Audio8.fx.playerHit();
            // Red particles
            for (let i = 0; i < 10; i++) {
              W.part(View.w / 2 + rnd(-15, 15), View.h / 2 + rnd(-15, 15),
                     rnd(-2.5, 2.5), rnd(-3, -1), '#ff4040', 30, 2, 0.18);
            }
          }
        }
      }
    });

    // Checkpoint system (every 10%)
    const currentCheckpoint = Math.floor(progress * 10);
    if (currentCheckpoint > checkpoints && currentCheckpoint <= 10) {
      checkpoints = currentCheckpoint;
      avalanche = Math.min(100, avalanche + 15); // Push avalanche back
      W.score += 500;
      W.player.heal(1);
      Audio8.fx.maxUp();
      // Blue checkpoint particles
      for (let i = 0; i < 15; i++) {
        W.part(View.w / 2 + rnd(-25, 25), View.h / 2 + rnd(-25, 25),
               rnd(-3, 3), rnd(-4, -1), '#40d0ff', 35, 2, 0.2);
      }
    }

    // Avalanche caught player
    if (avalanche < 10) {
      W.player.hurt(2);
      avalanche = 30;
      progress = Math.max(0, progress - 0.1);
      Audio8.fx.playerHit();
    }

    // Tower complete
    if (progress >= 1.0) {
      active = false;
      completed = true;

      // Completion scoring
      const cleanRun = obstacles.every(o => o.passed || o.destroyed);
      W.score += 2000; // Base completion
      W.score += checkpoints * 500; // Checkpoint bonus
      if (cleanRun) W.score += 3000; // Perfect run bonus

      // Return to normal game or victory
      Audio8.stopMusic();
      Audio8.fx.stageClear();
    }
  }

  function draw(ctx) {
    if (!active) return;

    const w = View.w, h = View.h;

    // Dark ice cavern background
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a1828');
    grad.addColorStop(1, '#1a1040');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Buntglas windows (8-bit stained glass)
    const windowColors = ['#d03030', '#3040d0', '#d0a030', '#30d030',
                          '#a030d0', '#d0d030', '#30d0d0', '#d050a0'];
    for (let i = 0; i < 8; i++) {
      const wp = (i / 8) + (progress * 0.5) % 1;
      const wy = h * 0.3 + Math.sin(wp * Math.PI * 2) * 80;
      const wx = 30 + (i % 2) * (w - 80);

      if (wy > -40 && wy < h + 40) {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = windowColors[i];
        ctx.fillRect(wx, wy, 20, 50);
        ctx.globalAlpha = 1.0;

        // Window frame
        ctx.strokeStyle = '#506070';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, 20, 50);
      }
    }

    // Tower walls (vertical lines)
    ctx.strokeStyle = '#405060';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + Math.sin(progress * 3) * 10, h);
      ctx.stroke();
    }

    // Chandeliers (XXL Kronleuchter)
    chandeliers.forEach(ch => {
      const dist = Math.abs(ch.progress - progress);
      if (dist > 0.2) return; // Only draw nearby

      const cy = h / 2 - (ch.progress - progress) * 800;
      const cx = w / 2 + ch.lane * LANE_WIDTH;

      if (cy > -50 && cy < h + 50) {
        // Chandelier body (golden)
        ctx.fillStyle = '#d0a050';
        ctx.fillRect(cx - 15, cy - 8, 30, 16);

        // Chain
        ctx.strokeStyle = '#908070';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 8);
        ctx.lineTo(cx, cy - 30);
        ctx.stroke();

        // Crystals (grapple points)
        for (let i = 0; i < ch.crystals; i++) {
          const angle = (i / ch.crystals) * Math.PI * 2 + Game.t * 0.02;
          const crystalX = cx + Math.cos(angle) * 12;
          const crystalY = cy + Math.sin(angle) * 12;

          ctx.fillStyle = grapple && grapple.chandelier === ch ? '#ffff80' : '#40c0ff';
          ctx.fillRect(crystalX - 3, crystalY - 3, 6, 6);
        }

        // Highlight when in range
        if (dist < 0.05) {
          ctx.strokeStyle = '#80d0ff';
          ctx.lineWidth = 3;
          ctx.strokeRect(cx - 18, cy - 11, 36, 22);
        }
      }
    });

    // Obstacles (ice stalactites)
    obstacles.forEach(obs => {
      if (obs.destroyed) return;
      const dist = Math.abs(obs.progress - progress);
      if (dist > 0.15) return;

      const oy = h / 2 - (obs.progress - progress) * 800;
      const ox = w / 2 + obs.lane * LANE_WIDTH;

      if (oy > -30 && oy < h + 30) {
        ctx.fillStyle = obs.passed ? '#304050' : '#6090b0';

        // Stalactite triangle
        ctx.beginPath();
        ctx.moveTo(ox, oy - 20);
        ctx.lineTo(ox - 10, oy + 10);
        ctx.lineTo(ox + 10, oy + 10);
        ctx.closePath();
        ctx.fill();

        // Highlight edge
        ctx.fillStyle = '#b0d0f0';
        ctx.fillRect(ox - 3, oy - 15, 2, 8);
      }
    });

    // Player sliding
    const playerX = w / 2 + lane * LANE_WIDTH;
    const playerY = h / 2;
    const playerHeight = ducking ? 12 : 20;

    // Player body
    const invFlash = W.player.invT > 0 && (Game.t % 4) < 2;
    ctx.fillStyle = invFlash ? '#ff6060' : '#d08040';
    ctx.fillRect(playerX - 8, playerY - playerHeight / 2, 16, playerHeight);

    // Face
    ctx.fillStyle = '#f0c090';
    ctx.fillRect(playerX - 6, playerY - playerHeight / 2 + 2, 12, 8);

    // Hair
    ctx.fillStyle = '#804020';
    ctx.fillRect(playerX - 6, playerY - playerHeight / 2, 12, 3);

    // Grapple whip line
    if (grapple) {
      const ch = grapple.chandelier;
      const targetY = h / 2 - (ch.progress - progress) * 800;
      const targetX = w / 2 + ch.lane * LANE_WIDTH;

      ctx.strokeStyle = '#ffff40';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playerX, playerY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    }

    // Avalanche (snow from above)
    const avalancheY = playerY - avalanche * 3;
    if (avalancheY < h + 50) {
      // Snow particles
      for (let i = 0; i < 40; i++) {
        const px = Math.random() * w;
        const py = avalancheY + Math.random() * 60;
        const size = 2 + Math.random() * 4;
        ctx.fillStyle = '#f0f8ff';
        ctx.fillRect(px, py, size, size);
      }

      // Danger warning when close
      if (avalanche < 30) {
        ctx.fillStyle = `rgba(255, 80, 80, ${0.3 + Math.sin(Game.t * 0.1) * 0.2})`;
        ctx.fillRect(0, 0, w, 30);

        ctx.fillStyle = '#ff4040';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ACHTUNG! LAWINE!', w / 2, 20);
      }
    }

    // Speed lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const lx = Math.random() * w;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx + 10, h);
      ctx.stroke();
    }

    // HUD
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TIEFE: ${Math.floor(progress * 100)}%`, 10, 20);
    ctx.fillText(`TEMPO: ${speed.toFixed(1)}`, 10, 35);
    ctx.fillText(`LAWINE: ${Math.floor(avalanche)}m`, 10, 50);
    ctx.fillText(`CHECKPOINT: ${checkpoints}/10`, 10, 65);
  }

  function rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  return {
    get active() { return active; },
    get completed() { return completed; },
    init,
    update,
    draw
  };
})();
