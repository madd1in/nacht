// Spieloptionen (Titel → OPTIONEN), dauerhaft im Browser gespeichert.
'use strict';

const Options = (() => {
  const KEY = 'nachtmahr.opts';
  const o = { easy: false, maxWhip: false, infHearts: false, crt: true, music: 8, character: 'henrik', fullscreen: true };
  try { Object.assign(o, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* privat */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* privat */ } };
  return {
    get easy() { return o.easy; }, get maxWhip() { return o.maxWhip; }, get infHearts() { return o.infHearts; },
    get crt() { return o.crt; }, get music() { return o.music; }, get character() { return o.character; }, get fullscreen() { return o.fullscreen; },
    get maxHp() { return o.easy ? 32 : 16; },
    get dmgMul() { return o.easy ? 2 : 1; },
    set(k, v) { o[k] = v; save(); },
    toggle(k) { o[k] = !o[k]; save(); return o[k]; },
  };
})();
