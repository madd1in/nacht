// Ice Tower Integration Hook for NACHTMAHR
// Dev Mode: Press 'I' to trigger Ice Tower Slide
'use strict';

// Add Ice Tower trigger to game loop
if (typeof Game !== 'undefined' && typeof IceTower !== 'undefined') {
  const originalStep = Game.step;

  Game.step = function() {
    // Check for Ice Tower trigger (dev mode)
    if (this.state === 'play' && Input.get().kb && Input.get().kb['KeyI']) {
      if (!IceTower.active) {
        IceTower.init();
        console.log('[ICE TOWER] Activated via dev mode!');
      }
    }

    // Ice Tower active - override normal gameplay
    if (IceTower.active) {
      IceTower.update(1/60);
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

  console.log('[ICE TOWER] Integration loaded. Press "I" during gameplay to activate!');
}
