// Screen Shake System for NACHTMAHR
// Trauma-based camera shake with smooth decay
'use strict';

const ScreenShake = (() => {
  let trauma = 0;
  let shakeX = 0;
  let shakeY = 0;
  let shakeRotation = 0;

  const MAX_SHAKE = 12;
  const MAX_ROTATION = 0.03;
  const DECAY_RATE = 2.5;

  return {
    update(dt) {
      trauma = Math.max(0, trauma - dt * DECAY_RATE);

      if (trauma > 0) {
        const shake = trauma * trauma; // Square for smooth feel
        shakeX = (Math.random() - 0.5) * shake * MAX_SHAKE;
        shakeY = (Math.random() - 0.5) * shake * MAX_SHAKE;
        shakeRotation = (Math.random() - 0.5) * shake * MAX_ROTATION;
      } else {
        shakeX = 0;
        shakeY = 0;
        shakeRotation = 0;
      }
    },

    add(amount, directional = false, dx = 0, dy = 0) {
      trauma = Math.min(1, trauma + amount);
      if (directional) {
        // TODO: Directional shake implementation
        this.dirX = dx;
        this.dirY = dy;
      }
    },

    get offset() {
      return {
        x: Math.round(shakeX),
        y: Math.round(shakeY),
        rotation: shakeRotation
      };
    },

    get active() {
      return trauma > 0;
    },

    // Preset intensities
    light() { this.add(0.2); },
    medium() { this.add(0.5); },
    heavy() { this.add(0.8); },
    extreme() { this.add(1.0); }
  };
})();

// Usage examples:
// ScreenShake.light();    // Hit enemy
// ScreenShake.medium();   // Player hurt
// ScreenShake.heavy();    // Boss stomp
// ScreenShake.extreme();  // Explosion
