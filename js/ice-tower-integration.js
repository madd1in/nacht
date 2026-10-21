// Ice Tower Integration Hook for NACHTMAHR
// Triggers after Ice Caverns (theme: 'ice') completion
'use strict';

// Add Ice Tower trigger to game loop
if (typeof Game !== 'undefined' && typeof IceTower !== 'undefined') {
  let iceCavernCompleted = false;

  const originalStep = Game.step;

  Game.step = function() {
    // Check for Ice Cavern completion
    if (this.state === 'play' && W && W.room && W.room.theme === 'ice' && !iceCavernCompleted) {
      // Check if player is near exit
      const player = W.player;
      if (player && player.x > W.room.w * 16 - 160) {
        iceCavernCompleted = true;
      }
    }

    // Trigger Ice Tower after Ice Cavern exit
    if (iceCavernCompleted && this.state === 'play' && !IceTower.active) {
      // Short delay transition
      if (!this.iceTowerPending) {
        this.iceTowerPending = 60; // 1 second delay
      }

      if (this.iceTowerPending > 0) {
        this.iceTowerPending--;
        if (this.iceTowerPending === 0) {
          IceTower.init();
          console.log('[ICE TOWER] Triggered after Ice Caverns completion!');
        }
      }
    }

    // Dev Mode: Press 'I' to trigger Ice Tower Slide anytime
    if (this.state === 'play' && Input.get().kb && Input.get().kb['KeyI']) {
      if (!IceTower.active) {
        IceTower.init();
        console.log('[ICE TOWER] Activated via dev mode (Press I)!');
      }
    }

    // Ice Tower active - override normal gameplay
    if (IceTower.active) {
      IceTower.update(1/60);

      // Exit Ice Tower when completed
      if (IceTower.completed) {
        iceCavernCompleted = false;
        this.iceTowerPending = 0;
      }
      return; // Skip normal game update
    }

    // Normal game flow
    if (originalStep) {
      originalStep.call(this);
    }
  };

  // Add Ice Tower rendering
  const originalRender = Game.render;

  Game.render = function() {
    if (IceTower.active) {
      IceTower.draw(this.ctx);
      return;
    }

    if (originalRender) {
      originalRender.call(this);
    }
  };

  console.log('[ICE TOWER] Integration loaded!');
  console.log('[ICE TOWER] Triggers after Ice Caverns OR press "I" for dev mode');
}

