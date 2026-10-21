// Quick Polish Implementation - Phase 1: Movement Feel
// Add to js/hero.js after existing code

'use strict';

// Extend Hero class with polish features
(function() {
  const COYOTE_TIME = 6;
  const JUMP_BUFFER = 8;
  const VARIABLE_JUMP_CUTOFF = -2;

  // Store original Hero methods
  const originalHeroInit = Hero.prototype.init || function() {};
  const originalHeroUpdate = Hero.prototype.update || function() {};

  // Enhanced init
  Hero.prototype.init = function() {
    originalHeroInit.call(this);
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.comboStage = 0;
    this.comboTimer = 0;
    this.perfectParryWindow = 0;
  };

  // Enhanced update
  Hero.prototype.updatePolish = function(dt, input) {
    // Coyote Time - grace period after leaving platform
    if (this.onGround) {
      this.coyoteTimer = COYOTE_TIME;
    } else if (this.coyoteTimer > 0) {
      this.coyoteTimer--;
    }

    // Jump Buffering - register jumps early
    if (input.jumpTap) {
      this.jumpBuffer = JUMP_BUFFER;
    }

    if (this.jumpBuffer > 0) {
      this.jumpBuffer--;
      if (this.onGround || this.coyoteTimer > 0) {
        this.jump();
        this.jumpBuffer = 0;
        this.coyoteTimer = 0;
      }
    }

    // Variable Jump Height - cut jump short on button release
    if (!input.jump && this.vy < VARIABLE_JUMP_CUTOFF) {
      this.vy *= 0.5;
    }

    // Whip Combo System
    if (this.comboTimer > 0) {
      this.comboTimer--;
    }

    if (input.atkTap) {
      if (this.comboTimer > 0) {
        this.comboStage = (this.comboStage + 1) % 3;
      } else {
        this.comboStage = 0;
      }
      this.comboTimer = 20;
      this.attackCombo(this.comboStage);
    }
  };

  // Combo attack with different stages
  Hero.prototype.attackCombo = function(stage) {
    switch(stage) {
      case 0: // Normal forward whip
        this.whipAngle = 0;
        this.whipDamage = 1;
        Audio8.fx.whip();
        break;
      case 1: // Upward arc
        this.whipAngle = -45;
        this.whipDamage = 1;
        Audio8.fx.whip();
        // Spawn upward particles
        for (let i = 0; i < 6; i++) {
          W.part(this.cx + this.face * 20, this.cy - 10,
                 this.face * (1 + Math.random()), -Math.random() * 2,
                 '#ffff40', 20, 1.5, 0.2);
        }
        break;
      case 2: // Downward slam (finisher)
        this.whipAngle = 45;
        this.whipDamage = 1.5;
        Audio8.fx.whip();
        // Screen shake on finisher
        if (typeof ScreenShake !== 'undefined') {
          ScreenShake.add(0.2);
        }
        // Extra particles
        for (let i = 0; i < 12; i++) {
          W.part(this.cx + this.face * 20, this.cy + 10,
                 (Math.random() - 0.5) * 3, Math.random() * 2,
                 i % 2 ? '#ffff40' : '#ff8040', 25, 2, 0.3);
        }
        break;
    }
  };
})();
