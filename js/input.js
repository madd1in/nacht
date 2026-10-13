// Eingabe: Tastatur, Gamepad (Xbox/Standard-Mapping inkl. Vibration), Touch. Gehaltene Tasten + Flanken pro Frame.
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
  let anyListener = null, lastDevice = 'keys', padName = null, padIndex = -1, prevPadBack = false;
  let toast = null;

  window.addEventListener('keydown', e => {
    lastDevice = 'keys';
    if (anyListener) anyListener();
    if (e.code === 'KeyM') { Audio8.toggleMute(); return; }
    if (e.code === 'KeyV') { Game.toggleCrt(); return; }
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
  window.addEventListener('pointerdown', () => { if (anyListener) anyListener(); });

  // ---------------- Gamepad ----------------
  const niceName = (id) => /xbox|xinput|045e/i.test(id) ? 'XBOX CONTROLLER' : /dualsense|dualshock|054c/i.test(id) ? 'PLAYSTATION CONTROLLER' : 'CONTROLLER';
  window.addEventListener('gamepadconnected', e => {
    padName = niceName(e.gamepad.id); padIndex = e.gamepad.index; lastDevice = 'pad';
    toast = { text: padName + ' VERBUNDEN', t: 180 };
    rumble(0.3, 0.3, 150);
  });
  window.addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index === padIndex) { padIndex = -1; toast = { text: 'CONTROLLER GETRENNT', t: 150 }; }
  });

  function activePad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (padIndex >= 0 && pads[padIndex]) return pads[padIndex];
    for (const p of pads) if (p && p.connected) { padIndex = p.index; padName = padName || niceName(p.id); return p; }
    return null;
  }

  function pollPad() {
    const out = {};
    const p = activePad();
    if (!p) return out;
    const b = i => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.5));
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const dz = 0.38;
    out.left = b(14) || ax < -dz;
    out.right = b(15) || ax > dz;
    out.up = b(12) || ay < -0.55;
    out.down = b(13) || ay > 0.55;
    out.jump = b(0);                       // A
    out.attack = b(2) || b(1);             // X oder B
    out.sub = b(3) || b(5) || b(7);        // Y, RB oder RT
    out.start = b(9);                      // Menü-Taste
    const back = b(8);                     // Ansicht-Taste = Ton
    if (back && !prevPadBack) Audio8.toggleMute();
    prevPadBack = back;
    if (p.buttons.some(x => x.pressed) || Math.abs(ax) > 0.5 || Math.abs(ay) > 0.5) {
      lastDevice = 'pad';
      if (anyListener) anyListener();
    }
    return out;
  }

  // Dual-Rumble (Edge/Chrome mit Xbox-Controller). Stärke 0..1, Dauer in ms.
  function rumble(strong, weak, ms) {
    try {
      const p = activePad();
      const act = p && p.vibrationActuator;
      if (act && act.playEffect) act.playEffect('dual-rumble', { startDelay: 0, duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => {});
    } catch (e) { /* nicht unterstützt */ }
  }

  // ---------------- Touch ----------------
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
      lastDevice = 'touch';
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

  function update() {
    const pad = pollPad();
    ACTIONS.forEach(a => {
      prev[a] = held[a];
      held[a] = !!(kb[a] || touch[a] || pad[a] || latch[a]);
      pressed[a] = (held[a] && !prev[a]) || !!latch[a];
      latch[a] = false;
    });
    if (toast && --toast.t <= 0) toast = null;
  }

  function onAny(fn) { anyListener = fn; }
  function clear() { ACTIONS.forEach(a => { pressed[a] = false; }); }

  return {
    held, pressed, update, onAny, clear, rumble,
    get device() { return lastDevice; }, get padName() { return padIndex >= 0 ? padName : null; }, get toast() { return toast; },
  };
})();
