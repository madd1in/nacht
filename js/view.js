// Randlose Darstellung: Höhe bleibt 240 Spielpixel und füllt das Fenster, die Breite passt sich an (256–640).
'use strict';

const View = {
  w: 256, h: 240, fh: 208, scale: 1, min: 256, max: 640,
  // Spar-Modus: sofort auf Xbox und Touch-Geräten, sonst automatisch, wenn Frames dauerhaft zu lange brauchen (game.js)
  lite: /xbox/i.test(navigator.userAgent) || (!!window.matchMedia && window.matchMedia('(pointer: coarse)').matches),
  // Tatsächlich sichtbarer Bereich: innerHeight kann in Chrome (Adressleiste, Leisten) größer sein als sichtbar.
  // Zusätzlich: sichere Bereiche (Navigationsleiste, Notch) abziehen und Messfehler nachträglich korrigieren.
  trim: 0,
  area() {
    const vv = window.visualViewport, de = document.documentElement;
    const iw = Math.min(window.innerWidth, de.clientWidth || Infinity, vv ? vv.width : Infinity);
    const ih = Math.min(window.innerHeight, de.clientHeight || Infinity, vv ? vv.height : Infinity);
    let sl = 0, sr = 0, st = 0, sb = 0;
    try {
      const cs = getComputedStyle(document.body);
      sl = parseFloat(cs.paddingLeft) || 0; sr = parseFloat(cs.paddingRight) || 0;
      st = parseFloat(cs.paddingTop) || 0; sb = parseFloat(cs.paddingBottom) || 0;
    } catch (e) { /* noch kein body */ }
    return { iw: Math.floor(iw - sl - sr), ih: Math.floor(ih - st - sb - this.trim) };
  },
  // Ragt die Leinwand nach dem Layout doch über den sichtbaren Bereich hinaus? → Überhang in Pixeln
  overflow(canvas) {
    const vv = window.visualViewport, r = canvas.getBoundingClientRect();
    const visBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
    return Math.max(0, Math.ceil(Math.max(0, r.bottom - visBottom) + Math.max(0, -r.top) - 0.5)); // zentriert: oben + unten
  },
  fit() {
    const { iw, ih } = this.area();
    const s = ih / this.h;
    const ideal = iw / s;
    if (ideal < this.min) { // Hochformat: Breite füllen, Rest bleibt für Touch-Steuerung
      const s2 = iw / this.min;
      return { w: this.min, scale: s2, cssW: iw, cssH: Math.round(this.h * s2) };
    }
    let w = Math.min(this.max, Math.round(ideal));
    w -= w % 2;
    return { w, scale: s, cssW: iw, cssH: ih }; // ab 640 minimal gestreckt statt Rändern
  },
  get cx() { return this.w / 2; },
};
