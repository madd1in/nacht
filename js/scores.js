// Bestenliste: TOP 10 mit 3-Buchstaben-Initialen wie am Automaten, getrennt für den Leicht-Modus, dauerhaft im Browser gespeichert.
'use strict';

const Scores = (() => {
  const MAX = 10;
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.!-';
  // Startbelegung (absteigend), damit die Tabelle nie leer ist – st = erreichte Stage, 4 = durchgespielt
  const SEED = [['VLD', 50000, 4, 'henrik'], ['ALU', 40000, 3, 'ragnor'], ['SIM', 32000, 3, 'henrik'], ['TRV', 25000, 3, 'ragnor'],
    ['SYP', 20000, 2, 'henrik'], ['GRT', 15000, 2, 'ragnor'], ['RCT', 10000, 2, 'henrik'], ['MRA', 7500, 1, 'ragnor'],
    ['JON', 5000, 1, 'henrik'], ['CLD', 2500, 1, 'ragnor']];
  const key = () => 'nachtmahr.scores' + (Options.easy ? '.e' : '');
  let cache = null, cacheKey = null;

  function list() {
    const k = key();
    if (cache && cacheKey === k) return cache;
    let l = null;
    try { l = JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { l = null; }
    if (!Array.isArray(l) || !l.length) l = SEED.map(([n, s, st, c]) => ({ n, s, st, c }));
    cache = l.filter(e => e && typeof e.s === 'number' && typeof e.n === 'string').sort((a, b) => b.s - a.s).slice(0, MAX);
    cacheKey = k;
    return cache;
  }
  // Platz (0-basiert), den dieser Score bekäme, oder -1 (bei Gleichstand zählt der ältere Eintrag)
  function place(score) {
    if (!(score > 0)) return -1;
    const l = list(), i = l.findIndex(e => score > e.s);
    return i >= 0 ? i : l.length < MAX ? l.length : -1;
  }
  function add(entry) {
    const i = place(entry.s);
    if (i < 0) return -1;
    const l = list().slice();
    l.splice(i, 0, entry);
    l.length = Math.min(l.length, MAX);
    cache = l; cacheKey = key();
    try { localStorage.setItem(key(), JSON.stringify(l)); } catch (e) { /* privater Modus: nur für diese Sitzung */ }
    return i;
  }
  const top = () => (list()[0] || { s: 0 }).s;
  // zuletzt eingegebene Initialen als Vorschlag
  function lastInit() {
    try { const s = localStorage.getItem('nachtmahr.init') || ''; return /^[A-Z0-9.!-]{3}$/.test(s) ? s : 'AAA'; } catch (e) { return 'AAA'; }
  }
  function saveInit(s) { try { localStorage.setItem('nachtmahr.init', s); } catch (e) { /* privat */ } }

  return { ALPHA, list, place, add, top, lastInit, saveInit };
})();
