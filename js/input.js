// Eingabe: Tastatur, Gamepad, Touch. Liefert gehaltene Tasten + Flanken pro Frame.
'use strict';

const Input = (() => {
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', KeyK: 'jump', Space: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'sub', KeyL: 'sub',
    Enter: 'start', Escape: 'start', KeyP: 'start',
  };
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'sub', 'start'];
  const kb = {}, touch = {}, held = {}, prev = {}, pressed = {}, latch = {};
  let anyListener = null;

  window.addEventListener('keydown', e => {
    if (anyListener) anyListener();
    if (e.code === 'KeyM') { Audio8.toggleMute(); return; }
    const a = KEYS[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat) latch[a] = true; // kurze Taps überleben bis zum nächsten Frame
    kb[a] = true;
  });
  window.addEventListener('keyup', e => {
    const a = KEYS[e.code];
    if (a) { kb[a] = false; e.preventDefault(); }
  });
  window.addEventListener('blur', () => ACTIONS.forEach(a => { kb[a] = false; touch[a] = false; }));

  // Touch-Steuerung
  function setupTouch() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) document.body.classList.add('touch');
    const btns = document.querySelectorAll('#touch .tbtn');
    const active = new Map(); // touchId -> action
    const refresh = () => {
      ACTIONS.forEach(a => { touch[a] = false; });
      active.forEach(a => { touch[a] = true; });
      btns.forEach(b => b.classList.toggle('on', !!touch[b.dataset.k]));
    };
    const hitTest = (x, y) => {
      for (const b of btns) {
        const r = b.getBoundingClientRect();
        if (x >= r.left - 6 && x <= r.right + 6 && y >= r.top - 6 && y <= r.bottom + 6) return b.dataset.k;
      }
      return null;
    };
    const onTouch = e => {
      if (anyListener) anyListener();
      for (const t of e.changedTouches) {
        if (e.type === 'touchend' || e.type === 'touchcancel') active.delete(t.identifier);
        else {
          const a = hitTest(t.clientX, t.clientY);
          if (a && e.type === 'touchstart') latch[a] = true;
          if (a) active.set(t.identifier, a); else active.delete(t.identifier);
        }
      }
      refresh();
      e.preventDefault();
    };
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev =>
      document.addEventListener(ev, onTouch, { passive: false }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupTouch); else setupTouch();

  function pollPad() {
    const out = {};
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const b = i => p.buttons[i] && p.buttons[i].pressed;
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      out.left = out.left || b(14) || ax < -0.4;
      out.right = out.right || b(15) || ax > 0.4;
      out.up = out.up || b(12) || ay < -0.5;
      out.down = out.down || b(13) || ay > 0.5;
      out.jump = out.jump || b(0);
      out.attack = out.attack || b(2) || b(1);
      out.sub = out.sub || b(3) || b(5) || b(7);
      out.start = out.start || b(9);
      if (p.buttons.some(x => x.pressed) && anyListener) anyListener();
    }
    return out;
  }

  function update() {
    const pad = pollPad();
    ACTIONS.forEach(a => {
      prev[a] = held[a];
      held[a] = !!(kb[a] || touch[a] || pad[a] || latch[a]);
      pressed[a] = (held[a] && !prev[a]) || !!latch[a];
      latch[a] = false;
    });
  }

  function onAny(fn) { anyListener = fn; }
  function clear() { ACTIONS.forEach(a => { pressed[a] = false; }); }

  return { held, pressed, update, onAny, clear };
})();
