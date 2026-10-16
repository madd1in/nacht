// Eingabe: Tastatur, Gamepad (Xbox/Standard-Mapping inkl. Vibration), Touch. Gehaltene Tasten + Flanken pro Frame.
'use strict';

const Input = (() => {
  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyZ: 'jump', KeyK: 'jump', Space: 'jump',
    KeyX: 'attack', KeyJ: 'attack',
    KeyC: 'sub', KeyL: 'sub',
    ShiftLeft: 'dash', ShiftRight: 'dash', KeyE: 'dash', KeyI: 'dash',
    Enter: 'start', Escape: 'start', KeyP: 'start',
  };
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'attack', 'sub', 'start', 'dash'];
  const kb = {}, touch = {}, held = {}, prev = {}, pressed = {}, latch = {}, prevReal = {};
  let demoFn = null, realHit = false, tapHit = false; // Demo-Modus: Eingaben kommen aus einer Funktion, echte Tasten beenden ihn
  let anyListener = null, lastDevice = 'keys', padName = null, padIndex = -1, prevPadBack = false;
  let toast = null;

  window.addEventListener('keydown', e => {
    lastDevice = 'keys';
    if (anyListener) anyListener();
    if (e.code === 'KeyF') { Game.toggleFullscreen(); return; }
    if (e.code !== 'Escape') Game.autoFullscreen();
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
  window.addEventListener('pointerdown', () => { tapHit = true; if (anyListener) anyListener(); Game.autoFullscreen(); });
  window.addEventListener('pointerup', () => Game.autoFullscreen());
  window.addEventListener('touchend', () => Game.autoFullscreen());

  // ---------------- Gamepad ----------------
  const niceName = (id) => /xbox|xinput|045e/i.test(id) ? 'XBOX CONTROLLER' : /dualsense|dualshock|054c/i.test(id) ? 'PLAYSTATION CONTROLLER' : 'CONTROLLER';
  window.addEventListener('gamepadconnected', e => {
    padName = niceName(e.gamepad.id); padIndex = e.gamepad.index; lastDevice = 'pad';
    toast = { text: tr('padOn', padName), t: 180 };
    rumble(0.3, 0.3, 150);
  });
  window.addEventListener('gamepaddisconnected', e => {
    if (e.gamepad.index === padIndex) { padIndex = -1; toast = { text: tr('padOff'), t: 150 }; }
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
    out.sub = b(3) || b(7);                // Y oder RT
    out.dash = b(5) || b(4) || b(6);       // RB, LB oder LT: Dash
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

  // ---------------- Touch: schwebender Stick (linke Hälfte) + große Tasten (rechts) ----------------
  function setupTouch() {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) document.body.classList.add('touch');
    const btns = [...document.querySelectorAll('#touch .tbtn')];
    const base = document.getElementById('stickBase'), knob = document.getElementById('stickKnob'), hint = document.getElementById('stickHint');
    const active = new Map(); // touchId -> Taste
    const stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
    const refresh = () => {
      ACTIONS.forEach(a => { touch[a] = false; });
      active.forEach(a => { touch[a] = true; });
      if (stick.id !== null) {
        const { dx, dy } = stick, dz = 14, ax = Math.abs(dx), ay = Math.abs(dy);
        if (dx < -dz && ax > ay * 0.45) touch.left = true;
        if (dx > dz && ax > ay * 0.45) touch.right = true;
        if (dy < -dz && ay > ax * 0.45) touch.up = true;
        if (dy > dz && ay > ax * 0.45) touch.down = true;
      }
      btns.forEach(b => b.classList.toggle('on', !!touch[b.dataset.k]));
    };
    const hitTest = (x, y) => { // großzügig: Rand + nächstgelegene Taste
      let best = null, bd = 1e9;
      for (const b of btns) {
        const r = b.getBoundingClientRect(), cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        const d = Math.hypot(x - cx, y - cy) - r.width / 2;
        if (d < bd) { bd = d; best = b.dataset.k; }
      }
      return bd < 34 ? best : null;
    };
    const showStick = () => {
      base.classList.toggle('on', stick.id !== null);
      if (stick.id === null) return;
      base.style.left = stick.ox + 'px'; base.style.top = stick.oy + 'px';
      const d = Math.hypot(stick.dx, stick.dy), k = d > 40 ? 40 / d : 1;
      knob.style.transform = `translate(${stick.dx * k}px, ${stick.dy * k}px)`;
    };
    const onTouch = e => {
      lastDevice = 'touch';
      if (anyListener) anyListener();
      for (const tc of e.changedTouches) {
        const id = tc.identifier, x = tc.clientX, y = tc.clientY;
        if (e.type === 'touchstart') {
          if (typeof Game !== 'undefined' && Game.state === 'pause') { latch.start = true; continue; } // Pause: Tippen irgendwo = weiter
          const a = hitTest(x, y);
          if (a && (x > window.innerWidth * 0.45 || a === 'start')) { latch[a] = true; active.set(id, a); }
          else if (x < window.innerWidth * 0.5 && stick.id === null) { stick.id = id; stick.ox = x; stick.oy = y; stick.dx = 0; stick.dy = 0; if (hint) hint.style.display = 'none'; }
        } else if (e.type === 'touchmove') {
          if (id === stick.id) {
            stick.dx = x - stick.ox; stick.dy = y - stick.oy;
            const d = Math.hypot(stick.dx, stick.dy);
            if (d > 70) { stick.ox += stick.dx * (1 - 70 / d); stick.oy += stick.dy * (1 - 70 / d); stick.dx = x - stick.ox; stick.dy = y - stick.oy; }
          } else if (active.has(id)) { const a = hitTest(x, y); if (a) active.set(id, a); }
        } else {
          if (id === stick.id) { stick.id = null; stick.dx = stick.dy = 0; }
          active.delete(id);
        }
      }
      refresh(); showStick();
      e.preventDefault();
    };
    ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(ev => document.addEventListener(ev, onTouch, { passive: false }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupTouch); else setupTouch();

  function update() {
    const pad = pollPad(), demo = demoFn ? demoFn() : null;
    realHit = tapHit; tapHit = false;
    ACTIONS.forEach(a => {
      const real = !!(kb[a] || touch[a] || pad[a] || latch[a]);
      if (real && (!prevReal[a] || latch[a])) realHit = true; // echte, frisch gedrückte Taste
      prevReal[a] = real;
      prev[a] = held[a];
      held[a] = demo ? !!demo[a] : real;
      pressed[a] = (held[a] && !prev[a]) || (!demo && !!latch[a]);
      latch[a] = false;
    });
    if (toast && --toast.t <= 0) toast = null;
  }

  function onAny(fn) { anyListener = fn; }
  function clear() { ACTIONS.forEach(a => { pressed[a] = false; }); }

  return {
    held, pressed, update, onAny, clear, rumble,
    setDemo(fn) { demoFn = fn; }, get realHit() { return realHit; },
    get device() { return lastDevice; }, get padName() { return padIndex >= 0 ? padName : null; }, get toast() { return toast; },
  };
})();
