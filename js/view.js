// Randlose Darstellung: Höhe bleibt 240 Spielpixel und füllt das Fenster, die Breite passt sich an (256–640).
'use strict';

const View = {
  w: 256, h: 240, fh: 208, scale: 1, min: 256, max: 640,
  fit() {
    const iw = window.innerWidth, ih = window.innerHeight;
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
