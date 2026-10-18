// Chiptune-Engine: 2x Puls + Echo, Dreieck, Rauschen (Drum-Kit). Eigene Kompositionen + SFX-Synthese.
'use strict';

const Audio8 = (() => {
  let ac = null, master, comp, musicBus, melBus, sfxBus, duckBus, voiceBus, muffleF, noiseBuf, pulseWaves = {};
  let muted = false;
  const MUSIC_VOL = 0.28; // ≈ bisher gehörter Pegel: früher 0.82, aber ab der ersten Kick ungewollt × 0.3 (Sidechain rief duck(on) auf)
  let musicLevel = 1;
  const NOTE = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6, g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };

  let tapDest = null, preAc = null;
  // Kontext und Klangkette vorab aufbauen (der Browser hält ihn bis zur ersten Nutzeraktion angehalten): kostet ~0,3 s –
  // im Ladebildschirm statt als Ruckler beim ersten Tastendruck. Bis init() bleibt ac leer, damit nichts vorher eingereiht wird.
  function prepare() { if (ac || preAc) return; setup(); preAc = ac; ac = null; }
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    if (preAc) { ac = preAc; preAc = null; if (ac.state === 'suspended') ac.resume().catch(() => {}); } else setup();
    if (!ac) return;
    if (pending) { const p = pending; pending = null; play(p); }
  }
  function setup() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(comp);
    // SNES-artiger Hall: erzeugte Impulsantwort (dunkel, ~2 s), leise beigemischt
    const rev = ac.createConvolver(), len = Math.floor(ac.sampleRate * 2.1), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch); let lp = 0;
      let e = 0;
      for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.18; d[i] = lp * Math.pow(1 - i / len, 2.6) * (i < 400 ? i / 400 : 1); e += d[i] * d[i]; }
      const k = 1 / Math.sqrt(e || 1); // auf Energie 1 normieren
      for (let i = 0; i < len; i++) d[i] *= k;
    }
    rev.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.32;
    master.connect(rev); rev.connect(wet); wet.connect(comp);
    duckBus = ac.createGain(); duckBus.connect(master); // wird während der Sprachausgabe abgesenkt
    voiceBus = ac.createGain(); voiceBus.gain.value = 1.3; voiceBus.connect(master);
    // Pause: Musik klingt wie hinter einer Tür (Tiefpass, sonst ganz offen)
    muffleF = ac.createBiquadFilter(); muffleF.type = 'lowpass'; muffleF.frequency.value = openFreq(); muffleF.Q.value = 0.8; muffleF.connect(duckBus);
    musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL * musicLevel; musicBus.connect(muffleF);
    melBus = ac.createGain(); melBus.connect(musicBus);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.7; sfxBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    let lfsr = 1;
    for (let i = 0; i < d.length; i++) { // NES-artiges LFSR-Rauschen
      const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14);
      d[i] = (lfsr & 1) ? 0.8 : -0.8;
    }
    [0.125, 0.25, 0.5].forEach(duty => {
      const n = 48, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) im[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      pulseWaves[duty] = ac.createPeriodicWave(re, im);
    });
  }
  const ready = () => !!ac && ac.state === 'running';

  const freq = (name) => {
    const m = /^([a-g]#?)(-?\d)$/.exec(name);
    if (!m) return 0;
    const midi = (parseInt(m[2], 10) + 1) * 12 + NOTE[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  function osc(type, duty) {
    const o = ac.createOscillator();
    if (type === 'pulse') o.setPeriodicWave(pulseWaves[duty || 0.5]); else o.type = type;
    return o;
  }

  // ---------------- SFX ----------------
  let outBus = null; // während sfx(name, x): Stereo-Panner der aktuellen Quelle
  function tone(type, f0, f1, dur, vol, duty, t0) {
    if (!ac) return;
    const t = t0 || ac.currentTime;
    const o = osc(type, duty), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(outBus || sfxBus);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, fType, f0, f1, t0, bus) {
    if (!ac) return;
    const t = t0 || ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = fType || 'lowpass';
    f.frequency.setValueAtTime(f0 || 4000, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus || outBus || sfxBus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const arp = (notes, step, type, vol, duty) => {
    if (!ac) return;
    const t = ac.currentTime;
    notes.forEach((n, i) => tone(type, freq(n), freq(n), step * 1.4, vol, duty, t + i * step));
  };

  const last = {};
  const SFX = {
    whip: () => { noise(0.16, 0.35, 'bandpass', 900, 5000); tone('pulse', 1400, 300, 0.08, 0.08, 0.125); },
    hit: () => tone('pulse', 600, 120, 0.09, 0.22, 0.5),
    kill: () => { noise(0.28, 0.4, 'lowpass', 3000, 200); tone('pulse', 300, 60, 0.2, 0.15, 0.25); },
    candle: () => { noise(0.12, 0.3, 'highpass', 2000, 6000); tone('pulse', 900, 1800, 0.06, 0.1, 0.25); },
    heart: () => arp(['a5', 'e6'], 0.04, 'pulse', 0.15, 0.25),
    item: () => arp(['c5', 'e5', 'g5', 'c6'], 0.045, 'pulse', 0.15, 0.25),
    bigItem: () => arp(['d5', 'f#5', 'a5', 'd6', 'f#6', 'a6'], 0.05, 'pulse', 0.16, 0.5),
    money: () => arp(['b5', 'e6', 'b6'], 0.035, 'pulse', 0.13, 0.125),
    throw: () => { tone('pulse', 300, 900, 0.08, 0.12, 0.25); noise(0.06, 0.15, 'highpass', 3000); },
    axe: () => tone('triangle', 200, 600, 0.15, 0.3),
    hurt: () => { tone('pulse', 500, 80, 0.3, 0.25, 0.5); noise(0.15, 0.2, 'lowpass', 1500, 300); },
    die: () => { if (!ac) return; const t = ac.currentTime; ['a4', 'f4', 'd4', 'a3', 'f3', 'd3'].forEach((n, i) => tone('pulse', freq(n), freq(n) * 0.97, 0.22, 0.2, 0.5, t + i * 0.16)); },
    bossHit: () => { noise(0.12, 0.35, 'bandpass', 1200, 400); tone('pulse', 220, 90, 0.12, 0.2, 0.25); },
    explode: () => { noise(0.6, 0.5, 'lowpass', 2500, 80); tone('triangle', 120, 30, 0.5, 0.35); },
    wall: () => { noise(0.35, 0.45, 'lowpass', 1800, 150); tone('triangle', 160, 50, 0.25, 0.3); },
    splash: () => noise(0.4, 0.3, 'bandpass', 2500, 500),
    fire: () => { tone('pulse', 180, 600, 0.12, 0.12, 0.125); noise(0.12, 0.15, 'highpass', 1500); },
    pause: () => arp(['e6', 'c6', 'e6', 'c6'], 0.05, 'pulse', 0.12, 0.5),
    select: () => tone('pulse', 880, 880, 0.06, 0.15, 0.25),
    oneUp: () => arp(['e5', 'g5', 'e6', 'c6', 'd6', 'g6'], 0.07, 'pulse', 0.16, 0.25),
    tick: () => tone('pulse', 1760, 1760, 0.03, 0.07, 0.125),
    holy: () => { noise(0.25, 0.35, 'highpass', 4000, 1500); noise(0.6, 0.15, 'bandpass', 800, 300); },
    flameTick: () => noise(0.08, 0.08, 'bandpass', 900, 400),
    door: () => { tone('triangle', 90, 60, 0.6, 0.4); noise(0.6, 0.2, 'lowpass', 600, 100); },
    thunder: () => { noise(1.6, 0.45, 'lowpass', 900, 40); tone('triangle', 70, 30, 1.2, 0.25); },
    rosary: () => { arp(['c6', 'g6', 'c7', 'g6', 'c7'], 0.06, 'pulse', 0.15, 0.125); noise(0.8, 0.3, 'highpass', 6000, 2000); },
    orb: () => arp(['a4', 'c#5', 'e5', 'a5', 'c#6', 'e6', 'a6'], 0.06, 'pulse', 0.15, 0.5),
    teleport: () => tone('pulse', 200, 1600, 0.35, 0.12, 0.125),
    rise: () => noise(0.4, 0.15, 'lowpass', 400, 1200),
    eagle: () => { tone('pulse', 2400, 1300, 0.28, 0.07, 0.125); tone('pulse', 1800, 1100, 0.22, 0.05, 0.25); }, // Adlerschrei
    squeak: () => { if (!ac) return; const t = ac.currentTime; tone('pulse', 1400, 2300, 0.09, 0.07, 0.25, t); tone('pulse', 2300, 1500, 0.1, 0.06, 0.25, t + 0.1); }, // Gummihuhn
    bat: () => tone('pulse', 2400, 1800, 0.05, 0.05, 0.125),
    roar: () => { noise(1.4, 0.55, 'lowpass', 900, 90); tone('pulse', 140, 50, 1.2, 0.22, 0.5); tone('triangle', 90, 40, 1.3, 0.4); },
    beat: () => { if (!ac) return; const t = ac.currentTime; tone('triangle', 75, 38, 0.14, 0.6, 0, t); tone('triangle', 70, 36, 0.12, 0.45, 0, t + 0.19); },
    bell: () => { // Kirchenglocke: unharmonische Teiltöne mit langem Ausklang
      if (!ac) return;
      const t = ac.currentTime, f = 98;
      [[1, 0.3, 4.5], [2.0, 0.16, 3.2], [2.76, 0.12, 2.6], [4.07, 0.08, 1.8], [5.4, 0.05, 1.2], [0.5, 0.14, 5]].forEach(([m, v, d]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f * m, t);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + d + 0.05);
      });
    },
    boom: () => { noise(2.2, 0.6, 'lowpass', 500, 35); tone('triangle', 70, 28, 1.8, 0.5); tone('pulse', 55, 30, 0.9, 0.12, 0.5); },
    crack: () => { noise(0.05, 0.42, 'highpass', 3500); tone('square', 2600, 900, 0.025, 0.07); },
    watch: () => { arp(['c6', 'g5', 'c6', 'g5', 'c6'], 0.08, 'pulse', 0.12, 0.125); tone('triangle', 1760, 1720, 0.9, 0.1); },
    creak: () => { tone('sawtooth', 74, 56, 0.55, 0.05); noise(0.45, 0.05, 'bandpass', 420, 240); },
    cog: () => { noise(0.03, 0.1, 'highpass', 3200); tone('pulse', 1900, 1750, 0.025, 0.045, 0.125); },
    latch: () => { tone('pulse', 1800, 2600, 0.06, 0.12, 0.125); noise(0.08, 0.2, 'highpass', 5000); },
    whoosh: () => noise(0.22, 0.28, 'bandpass', 600, 3000),
    djump: () => { tone('pulse', 420, 1250, 0.11, 0.11, 0.25); noise(0.12, 0.12, 'highpass', 3500, 7000); },
    ready: () => arp(['e6', 'a6', 'e7'], 0.04, 'pulse', 0.12, 0.125),
    crash: () => { arp(['a4', 'e5', 'a5', 'c#6', 'e6', 'a6', 'c#7'], 0.035, 'pulse', 0.16, 0.5); noise(0.9, 0.4, 'highpass', 5000, 800); tone('triangle', 220, 55, 0.7, 0.4); },
    checkpoint: () => arp(['g5', 'c6', 'e6', 'g6', 'c7'], 0.07, 'pulse', 0.14, 0.25),
    chest: () => { tone('triangle', 140, 90, 0.2, 0.3); arp(['c6', 'e6', 'g6', 'c7'], 0.05, 'pulse', 0.13, 0.25); },
    crumble: () => noise(0.25, 0.25, 'lowpass', 1200, 200),
    raven: () => { tone('pulse', 900, 500, 0.12, 0.08, 0.125); noise(0.1, 0.1, 'bandpass', 2000, 900); },
    go: () => { arp(['g5', 'c6', 'e6', 'g6', 'c7'], 0.035, 'pulse', 0.16, 0.25); noise(0.35, 0.22, 'highpass', 6000, 2500); tone('triangle', 130, 260, 0.3, 0.35); },
    announce: () => { if (!ac) return; const t = ac.currentTime; ['c5', 'e5', 'g5', 'c6'].forEach(n => tone('pulse', freq(n), freq(n), 0.32, 0.07, 0.25, t)); tone('pulse', freq('c6'), freq('c6') * 1.01, 0.4, 0.09, 0.125, t + 0.09); noise(0.2, 0.18, 'highpass', 5000, 2000); },
    stamp: () => { tone('triangle', 110, 40, 0.35, 0.55); noise(0.3, 0.45, 'lowpass', 2200, 120); arp(['c6', 'g6', 'c7'], 0.05, 'pulse', 0.13, 0.125); },
    step: () => { noise(0.045, 0.07, 'lowpass', 1100, 250); tone('triangle', 120, 70, 0.04, 0.05); },
    chain: () => { if (!ac) return; const t = ac.currentTime; for (let i = 0; i < 4; i++) { noise(0.03, 0.1, 'bandpass', 3400 - i * 200, 2200, t + i * 0.05); tone('square', 1900 - i * 120, 1500, 0.02, 0.025, null, t + i * 0.05); } }, // Kettenrasseln
    spin: () => noise(0.09, 0.07, 'bandpass', 1400, 2600), // wirbelndes Wurfkreuz
    glug: () => { tone('sine', 380, 190, 0.09, 0.22); noise(0.06, 0.08, 'lowpass', 700, 300); }, // Pflanze trinkt
    burp: () => { tone('sawtooth', 96, 62, 0.42, 0.34); tone('square', 120, 74, 0.38, 0.12); noise(0.36, 0.22, 'lowpass', 500, 160); }, // ... und rülpst
    chomp: () => { noise(0.07, 0.4, 'bandpass', 1500, 500); tone('square', 240, 70, 0.09, 0.16); tone('triangle', 120, 50, 0.12, 0.2); }, // Fangblatt schnappt zu
    growl: () => { noise(0.5, 0.3, 'lowpass', 500, 160); tone('sawtooth', 110, 70, 0.45, 0.12); tone('pulse', 220, 140, 0.3, 0.05, 0.25); }, // Jaguar faucht
    shatter: () => { noise(0.5, 0.45, 'highpass', 5000, 1800); arp(['e7', 'c7', 'g6', 'e7', 'b6', 'g7'], 0.03, 'pulse', 0.06, 0.125); tone('triangle', 180, 60, 0.3, 0.3); }, // Kristall zerspringt
    clank: () => { tone('square', 340, 300, 0.07, 0.1); tone('square', 520, 470, 0.05, 0.07); noise(0.12, 0.2, 'bandpass', 2600, 1600); }, // Rüstung scheppert
    flap: () => { noise(0.07, 0.14, 'bandpass', 1300, 700); noise(0.05, 0.1, 'bandpass', 1700, 900, ac.currentTime + 0.08); }, // Buchdeckel schlagen
    page: () => noise(0.16, 0.09, 'highpass', 2600, 6000), // Papier raschelt
    tome: () => { tone('sine', 196, 98, 0.5, 0.14); tone('triangle', 392, 370, 0.4, 0.06); arp(['e6', 'g6', 'a#6', 'e7'], 0.05, 'pulse', 0.04, 0.125); }, // Zauberbuch schlägt auf
    slime: () => { noise(0.4, 0.18, 'lowpass', 600, 150); tone('sine', 140, 60, 0.4, 0.12); }, // Schleimkokon gluckert
    splat: () => { noise(0.3, 0.35, 'bandpass', 900, 200); tone('sine', 220, 50, 0.25, 0.18); }, // Kokon platzt
    tink: () => { tone('square', 2600, 2100, 0.05, 0.07); tone('pulse', 3400, 3000, 0.07, 0.05, 0.125); noise(0.05, 0.12, 'highpass', 6000); }, // abgeprallt
    stepWet: () => { noise(0.07, 0.06, 'bandpass', 2600, 900); noise(0.04, 0.05, 'lowpass', 900, 250); },
  };
  // x (optional): Weltposition der Quelle → Stereo-Position relativ zur Bildmitte
  function sfx(name, x) {
    if (!ac || !SFX[name]) return;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < 0.035) return;
    last[name] = now;
    if (typeof x === 'number' && ac.createStereoPanner && typeof W !== 'undefined' && W.cam) {
      const pan = ac.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, (x - W.cam.x - View.w / 2) / (View.w * 0.55))) * 0.8;
      pan.connect(sfxBus);
      outBus = pan;
      try { SFX[name](); } finally { outBus = null; }
    } else SFX[name]();
  }

  // ---------------- Musik ----------------
  const rep = (s, n) => Array(n).fill(s).join(' ');
  const arp4 = (a, b, c, len = 1, times = 4) => rep(`${a}:${len} ${b}:${len} ${c}:${len} ${b}:${len}`, times);
  const oct = (lo, hi, n = 4) => rep(`${lo}:2 ${hi}:2`, n);
  const gallop = (lo, hi) => `${lo}:2 ${hi}:1 ${hi}:1 ${lo}:2 ${hi}:1 ${hi}:1 ${lo}:2 ${hi}:1 ${hi}:1 ${lo}:1 ${hi}:1 ${lo}:1 ${hi}:1`;
  const drive = (lo, hi) => rep(`${lo}:1 ${lo}:1 ${hi}:1 ${lo}:1`, 4);
  const ROCKX = 'x:1 h:1 h:1 h:1 s:1 h:1 h:1 k:1 k:1 h:1 k:1 h:1 s:1 h:1 o:1 h:1';
  const FILL = 'k:1 h:1 s:1 h:1 k:1 h:1 s:1 h:1 t:1 h:1 u:1 h:1 k:1 t:1 u:1 h:1';
  // Treibender Four-on-the-floor-Beat: Kick auf jedem Viertel, Snare 2+4, offene Hats auf den Offbeats
  const FOUR = 'k:1 h:1 o:1 h:1 q:1 h:1 o:1 h:1 k:1 h:1 o:1 k:1 q:1 h:1 o:1 h:1';
  const FOURX = 'x:1 h:1 o:1 h:1 q:1 h:1 o:1 h:1 k:1 h:1 o:1 k:1 q:1 h:1 o:1 h:1';
  const FILLS = 'k:1 h:1 o:1 h:1 q:1 h:1 o:1 h:1 k:1 h:1 o:1 h:1 q:1 h:1 t:1 u:1';
  const FILLB = 'k:1 h:1 o:1 h:1 q:1 h:1 o:1 h:1 k:1 h:1 t:1 u:1 q:1 h:1 o:1 h:1';
  // Aufbau der Stage-Songs: 32 Takte ohne Pause – die Melodie läuft durch, die zweite Hälfte legt
  // mit 32tel-Arpeggien und galoppierender Kick zu, ein Riser führt zurück an den Anfang.
  const contrastLead = (chords, m, bars) => bars.join(' ') + ' ' + bars.join(' ');
  const section = () => rep([FOURX, FOUR, FOUR, FILLS, FOUR, FOUR, FOUR, FILLB].join(' '), 2);
  // B-Teil: galoppierende Kick (kein Dauerfeuer), Tom-Fill und Riser vor dem Loop
  const DK = 'k:1 h:1 o:1 k:1 q:1 h:1 o:1 h:1 k:1 h:1 k:1 h:1 q:1 h:1 o:1 h:1';
  const DKX = 'x:1 h:1 o:1 k:1 q:1 h:1 o:1 h:1 k:1 h:1 k:1 h:1 q:1 h:1 o:1 h:1';
  const FILLR = 'k:1 h:1 o:1 h:1 q:1 h:1 t:1 u:1 w:8';
  const sectionB = () => [DKX, DK, DK, FILLS, DK, DK, DK, FILLB, DKX, DK, DK, FILLS, DK, DK, DK, FILLR].join(' ');
  // 3er-Arpeggio gegen den 4er-Takt: verschiebt sich ständig und treibt nach vorn
  const arp3 = (a, b, c) => Array.from({ length: 16 }, (_, i) => [a, b, c][i % 3] + ':1').join(' ');
  const chordArps = (list, m) => list.map(c => arp3(...m[c])).join(' ');
  const arp3f = (a, b, c) => Array.from({ length: 32 }, (_, i) => [a, b, c][i % 3] + ':0.5').join(' '); // 32tel
  const chordArps2 = (list, m) => list.map(c => arp3(...m[c])).join(' ') + ' ' + list.map(c => arp3f(...m[c])).join(' ');
  const chordPad = (list, m) => rep(list.map(c => m[c].join('+') + ':16').join(' '), 2); // Streicher-Fläche
  const chordBass = (list, m, fn) => rep(list.map(c => fn(...m[c])).join(' '), 2);

  // Stage 1 – Burgsturm (d-Moll, 168 BPM)
  const S1 = { Dm: ['d4', 'f4', 'a4'], Bb: ['a#3', 'd4', 'f4'], C: ['c4', 'e4', 'g4'], A: ['a3', 'c#4', 'e4'], Gm: ['g3', 'a#3', 'd4'] };
  const S1B = { Dm: ['d2', 'd3'], Bb: ['a#1', 'a#2'], C: ['c2', 'c3'], A: ['a1', 'a2'], Gm: ['g1', 'g2'] };
  const S1C = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A', 'Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'];
  // Stage 2 – Katakomben-Ritt (a-Moll, 152 BPM)
  const S2 = { Am: ['a3', 'c4', 'e4'], F: ['f3', 'a3', 'c4'], G: ['g3', 'b3', 'd4'], E: ['e3', 'g#3', 'b3'], Dm: ['d4', 'f4', 'a4'] };
  const S2B = { Am: ['a1', 'a2'], F: ['f1', 'f2'], G: ['g1', 'g2'], E: ['e1', 'e2'], Dm: ['d2', 'd3'] };
  const S2C = ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'E', 'E', 'Dm', 'Dm', 'Am', 'Am', 'F', 'G', 'E', 'E'];
  // Schiff – Seemannslied (d-Moll, 6/8): Akkorde pro Takt
  const SEA = { Dm: ['d4', 'f4', 'a4'], C: ['c4', 'e4', 'g4'], A: ['a3', 'c#4', 'e4'], F: ['f3', 'a3', 'c4'], Bb: ['a#3', 'd4', 'f4'] };
  const SEA_B = { Dm: ['d2', 'a2'], C: ['c2', 'g2'], A: ['a1', 'e2'], F: ['f1', 'c2'], Bb: ['a#1', 'f2'] };
  const SEA_C = ['Dm', 'Dm', 'C', 'C', 'Dm', 'Dm', 'A', 'A', 'F', 'C', 'Dm', 'Bb', 'A', 'Dm', 'A', 'Dm'];
  // Stage 3 – Bergfried (e-Moll, 176 BPM)
  const S3 = { Em: ['e4', 'g4', 'b4'], C: ['c4', 'e4', 'g4'], D: ['d4', 'f#4', 'a4'], B: ['b3', 'd#4', 'f#4'], Am: ['a3', 'c4', 'e4'] };
  const S3B = { Em: ['e2', 'e3'], C: ['c2', 'c3'], D: ['d2', 'd3'], B: ['b1', 'b2'], Am: ['a1', 'a2'] };
  const S3C = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'B', 'B', 'Am', 'Am', 'Em', 'Em', 'C', 'D', 'B', 'B'];

  // Sonnenkathedrale – Sonnensturm (h-Moll, 188 BPM): Heldenmelodie über galoppierendem Oktavbass, Chor-Fläche, im B-Teil 32tel
  const SU = { Bm: ['b3', 'd4', 'f#4'], G: ['g3', 'b3', 'd4'], D: ['d4', 'f#4', 'a4'], A: ['a3', 'c#4', 'e4'], Em: ['e4', 'g4', 'b4'], F: ['f#3', 'a#3', 'c#4'] };
  const SU_B = { Bm: ['b1', 'b2'], G: ['g1', 'g2'], D: ['d2', 'd3'], A: ['a1', 'a2'], Em: ['e2', 'e3'], F: ['f#1', 'f#2'] };
  const SU_C = ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'Em', 'F', 'G', 'A', 'Bm', 'Bm', 'Em', 'G', 'F', 'F'];

  // Krakenkampf – Seemannslied als Bosslied (d-Moll, 6/8, 12 Schritte pro Takt): Galopp im Bass, Tritonus-Schatten
  const KR = { Dm: ['d4', 'f4', 'a4'], Bb: ['a#3', 'd4', 'f4'], A: ['a3', 'c#4', 'e4'], Gm: ['g3', 'a#3', 'd4'], C: ['c4', 'e4', 'g4'] };
  const KR_B = { Dm: ['d2', 'd3'], Bb: ['a#1', 'a#2'], A: ['a1', 'a2'], Gm: ['g1', 'g2'], C: ['c2', 'c3'] };
  const KR_C = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Dm', 'Gm', 'A', 'Bb', 'C', 'Dm', 'Dm', 'Gm', 'Gm', 'A', 'A'];
  // Glasturm – Orgel-Toccata (e-Moll): rauschende 16tel, Choralmelodie, Pedalbass, Pauken
  const CH = { Em: ['e4', 'g4', 'b4'], Am: ['a3', 'c4', 'e4'], B: ['b3', 'd#4', 'f#4'], C: ['c4', 'e4', 'g4'], G: ['g3', 'b3', 'd4'], D: ['d4', 'f#4', 'a4'] };
  const CH_B = { Em: 'e2', Am: 'a1', B: 'b1', C: 'c2', G: 'g1', D: 'd2' };
  const CH_C = ['Em', 'Em', 'Am', 'B', 'Em', 'C', 'Am', 'B', 'G', 'D', 'Em', 'C', 'Am', 'B', 'Em', 'B'];
  // Wintergarten – Höllenwalzer (d-Moll, 3/4, 12 Schritte pro Takt): die Spieluhr-Melodie über galoppierendem Oktavbass
  // und 16tel-Arpeggien, Snare auf „pah-pah"; im B-Teil 32tel, pumpender Bass und Doppel-Kick, Riser zurück zum Anfang
  const EX = { Dm: ['d4', 'f4', 'a4'], A: ['c#4', 'e4', 'a4'], Gm: ['d4', 'g4', 'a#4'], Bb: ['d4', 'f4', 'a#4'], C: ['e4', 'g4', 'c5'], F: ['c4', 'f4', 'a4'], E: ['e4', 'g#4', 'b4'] };
  const EX_B = { Dm: ['d2', 'd3'], A: ['a1', 'a2'], Gm: ['g1', 'g2'], Bb: ['a#1', 'a#2'], C: ['c2', 'c3'], F: ['f1', 'f2'], E: ['e2', 'e3'] };
  const EX_C = ['Dm', 'Dm', 'A', 'A', 'Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'Bb', 'Gm', 'A', 'Dm', 'Gm', 'A', 'Dm', 'F', 'F', 'C', 'C', 'Bb', 'Bb', 'F', 'A', 'Dm', 'Dm', 'Gm', 'Gm', 'E', 'E', 'A', 'A'];
  // Bibliothek & Uhrturm – Cembalo-Toccata als Totentanz (a-Moll, 172 BPM): rauschende Cembalo-16tel, Oktavbass, Four-on-the-floor
  const LB = { Am: ['a3', 'c4', 'e4'], E: ['g#3', 'b3', 'e4'], Dm: ['d4', 'f4', 'a4'], G: ['g3', 'b3', 'd4'], C: ['c4', 'e4', 'g4'], F: ['f3', 'a3', 'c4'] };
  const LB_B = { Am: ['a1', 'a2'], E: ['e2', 'e3'], Dm: ['d2', 'd3'], G: ['g1', 'g2'], C: ['c2', 'c3'], F: ['f1', 'f2'] };
  const LB_C = ['Am', 'E', 'Am', 'G', 'F', 'C', 'Dm', 'E', 'Am', 'Dm', 'G', 'C', 'F', 'Dm', 'E', 'E'];
  // Pauken auf der Eins und ein Paukenwirbel als Fill (Glasturm)
  const PFOUR = 'p:1 h:1 o:1 h:1 q:1 h:1 o:1 h:1 k:1 h:1 o:1 k:1 q:1 h:1 o:1 h:1';
  const FILLP = 'k:1 h:1 o:1 h:1 q:1 h:1 o:1 h:1 p:1 h:1 p:1 h:1 p:1 p:1 p:1 p:1';
  const toccata = (a, b, c) => { const up = (n) => n.replace(/\d/, d => +d + 1); return `${a}:1 ${b}:1 ${c}:1 ${b}:1 ${a}:1 ${b}:1 ${c}:1 ${up(a)}:1 ${c}:1 ${up(a)}:1 ${up(b)}:1 ${up(a)}:1 ${c}:1 ${b}:1 ${a}:1 ${b}:1`; };

  const SONGS = {
    title: {
      bpm: 104, loop: true,
      p1: 'd5:8 a4:4 f4:4 a#4:8 a4:4 g4:4 a4:6 g4:2 f4:4 e4:4 d4:12 -:4 f5:8 e5:4 d5:4 g5:8 f5:4 e5:4 f5:4 e5:4 d5:4 c#5:4 d5:12 -:4',
      p2: [arp4('d4', 'f4', 'a4', 2, 2), arp4('a#3', 'd4', 'f4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f4', 'a4', 2, 2),
        arp4('d4', 'f4', 'a4', 2, 2), arp4('g3', 'a#3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f4', 'a4', 2, 2)].join(' '),
      tri: ['d2:16 a#1:16 a1:16 d2:16', drive('d2', 'd3'), drive('g1', 'g2'), drive('a1', 'a2'), drive('d2', 'd3')].join(' '),
      pad: 'd3+f3+a3+d4:16 a#2+d3+f3+a#3:16 a2+c#3+e3+a3:16 d3+f3+a3+d4:16 d3+f3+a3+d4:16 g2+a#2+d3+g3:16 a2+c#3+e3+a3:16 d3+f3+a3+d4:16',
      dr: [rep('u:4 -:4 u:2 u:2 t:4', 3), 'w:16', FOURX, FOUR, FOUR, FILLR].join(' '),
      echo: { delay: 4, vol: 0.3 },
    },
    stage1: {
      bpm: 176, loop: true, echo: { delay: 3, vol: 0.32 },
      p1: contrastLead(S1C, S1, [
        'd5:2 d5:1 e5:1 f5:2 d5:2 a5:3 g5:1 f5:2 e5:2', 'd5:1 c5:1 d5:2 a4:2 d5:2 f5:2 e5:2 d5:2 c5:2',
        'a#4:2 d5:2 f5:2 a#5:4 a5:2 g5:2 f5:2', 'g5:3 f5:1 e5:2 c5:2 e5:2 g5:2 c6:4',
        'd5:2 d5:1 e5:1 f5:2 d5:2 a5:3 g5:1 f5:2 e5:2', 'f5:2 g5:2 a5:2 d6:4 c6:2 a5:2 f5:2',
        'a#5:2 a5:2 g5:2 f5:2 g5:2 a5:2 a#5:2 d6:2', 'c#6:4 a5:2 e5:2 c#5:2 e5:2 a5:4',
        'g5:3 a#5:1 d6:4 c6:2 a#5:2 a5:2 g5:2', 'a5:2 a#5:2 a5:2 g5:2 f5:4 d5:4',
        'a5:3 f5:1 d5:2 f5:2 a5:2 d6:2 c6:2 a5:2', 'd6:6 c6:1 a#5:1 a5:4 f5:4',
        'f5:2 a#5:2 d6:2 f6:4 d6:2 a#5:2 f5:2', 'e5:2 g5:2 c6:2 e6:4 d6:2 c6:2 a#5:2',
        'a5:2 c#6:2 e6:2 a6:4 g6:2 f6:2 e6:2', 'c#6:2 a5:2 e5:2 c#5:2 a4:4 -:4',
      ]),
      p2: chordArps2(S1C, S1), tri: chordBass(S1C, S1B, drive), pad: chordPad(S1C, S1), dr: section() + ' ' + sectionB(),
    },
    stage2: {
      bpm: 166, loop: true, echo: { delay: 3, vol: 0.35 },
      p1: contrastLead(S2C, S2, [
        'a4:2 c5:2 e5:2 a5:3 g5:1 e5:2 c5:2 e5:2', 'd5:2 e5:2 c5:2 a4:2 b4:2 c5:2 b4:2 g4:2',
        'a4:2 c5:2 f5:4 e5:2 d5:2 c5:4', 'b4:2 d5:2 g5:4 f5:2 e5:2 d5:4',
        'e5:3 e5:1 a5:2 e5:2 c6:3 b5:1 a5:2 g5:2', 'a5:2 g5:2 e5:2 c5:2 d5:2 e5:2 c5:2 a4:2',
        'g#4:2 b4:2 e5:2 g#5:4 f5:2 e5:2 d5:2', 'b4:4 g#4:4 e4:4 -:2 e5:2',
        'f5:3 e5:1 d5:2 a4:2 d5:2 f5:2 a5:4', 'g5:2 f5:2 e5:2 d5:2 e5:4 f5:4',
        'e5:3 d5:1 c5:2 a4:2 c5:2 e5:2 a5:4', 'b5:2 a5:2 g5:2 e5:2 a5:8',
        'c6:3 b5:1 a5:2 f5:2 a5:2 c6:2 f6:4', 'd6:3 c6:1 b5:2 g5:2 b5:2 d6:2 g6:4',
        'e6:2 d6:2 b5:2 g#5:2 b5:2 g#5:2 e5:2 d5:2', 'b4:2 e5:2 g#5:2 b5:2 e6:8',
      ]),
      p2: chordArps2(S2C, S2), tri: chordBass(S2C, S2B, drive), pad: chordPad(S2C, S2), dr: section() + ' ' + sectionB(),
    },
    stage3: {
      bpm: 184, loop: true, echo: { delay: 3, vol: 0.3 },
      p1: contrastLead(S3C, S3, [
        'e5:2 g5:2 b5:2 e6:3 d6:1 b5:2 g5:2 b5:2', 'a5:2 g5:2 f#5:2 e5:2 f#5:2 g5:2 a5:2 b5:2',
        'c6:3 b5:1 a5:2 g5:2 e5:2 g5:2 c6:4', 'd6:3 c6:1 b5:2 a5:2 f#5:2 a5:2 d6:4',
        'e6:2 e6:1 e6:1 d6:2 b5:2 e6:2 g6:2 f#6:2 e6:2', 'd6:2 b5:2 g5:2 b5:2 e5:4 g5:4',
        'f#5:2 a5:2 b5:2 d#6:4 c#6:2 b5:2 a5:2', 'f#6:4 d#6:4 b5:4 f#5:4',
        'a5:3 c6:1 e6:4 d6:2 c6:2 b5:2 a5:2', 'c6:2 b5:2 a5:2 g5:2 a5:4 e5:4',
        'g5:3 b5:1 e6:4 d6:2 b5:2 a5:2 g5:2', 'f#5:2 g5:2 a5:2 b5:2 e5:8',
        'e6:2 c6:2 g5:2 c6:2 e6:2 g6:2 e6:2 c6:2', 'f#6:2 d6:2 a5:2 d6:2 f#6:2 a6:2 f#6:2 d6:2',
        'd#6:2 f#6:2 b6:4 a6:2 f#6:2 d#6:2 b5:2', 'b5:4 a5:2 g5:2 f#5:4 d#5:4',
      ]),
      p2: chordArps2(S3C, S3), tri: chordBass(S3C, S3B, drive), pad: chordPad(S3C, S3), dr: section() + ' ' + sectionB(),
    },
    boss: {
      bpm: 192, loop: true, echo: { delay: 2, vol: 0.28 },
      p1: [
        'd5:1 d5:1 d6:2 d5:1 d5:1 c6:2 d5:1 d5:1 a#5:2 a5:2 g#5:2', 'a5:2 f5:2 d5:2 f5:2 a5:2 d6:2 f6:4',
        'd#5:1 d#5:1 d#6:2 d#5:1 d#5:1 c#6:2 d#5:1 d#5:1 b5:2 a#5:2 a5:2', 'a#5:2 g5:2 d#5:2 g5:2 a#5:2 d#6:2 g6:4',
        'f6:2 e6:2 d6:2 a5:2 f6:2 e6:2 d6:2 a5:2', 'g6:2 f6:2 e6:2 c#6:2 a5:4 e5:4',
        'c#6:1 d6:1 e6:2 c#6:1 d6:1 e6:2 f6:2 e6:2 d6:2 c#6:2', 'e6:4 c#6:4 a5:4 e5:2 g5:2',
      ].join(' '),
      p2: [rep('d4:1 d5:1', 16), rep('d#4:1 d#5:1', 16), rep('d4:1 d5:1', 16), rep('c#4:1 c#5:1', 16)].join(' '),
      tri: [drive('d2', 'd3'), drive('d2', 'd3'), drive('d#2', 'd#3'), drive('d#2', 'd#3'), drive('d2', 'd3'), drive('d2', 'd3'), drive('c#2', 'c#3'), drive('c#2', 'c#3')].join(' '),
      pad: 'd3+f3+a3:32 d#3+g3+a#3:32 d3+f3+a3:32 c#3+e3+g#3:32',
      dr: [FOURX, DK, FOUR, FILLS, DK, DK, DK, FILLR].join(' '),
    },
    // Schiff – Seemannslied im 6/8-Takt (d-Moll, 176 BPM): A-Teil = das Shanty-Thema über 16tel-Akkordeon und galoppierendem
    // Bass, B-Teil = eine Oktave höher mit Läufen, 32tel-Arpeggien, pumpendem Bass und Doppel-Kick; Tom-Fill und Riser zum Loop
    sea: {
      bpm: 176, loop: true, echo: { delay: 3, vol: 0.3 },
      p1: ['a4:3 d5:3 d5:2 e5:1 f5:3', 'e5:3 d5:3 a4:6', 'g4:3 c5:3 c5:2 d5:1 e5:3', 'd5:3 c5:3 g4:6',
        'a4:3 d5:3 f5:2 e5:1 d5:3', 'f5:3 a5:3 g5:2 f5:1 e5:3', 'e5:3 c#5:3 a4:3 b4:3', 'c#5:3 e5:3 a5:6',
        'c5:3 f5:3 f5:2 g5:1 a5:3', 'g5:3 e5:3 c5:6', 'd5:3 f5:3 a5:2 g5:1 f5:3', 'f5:3 d5:3 a#4:6',
        'a4:3 c#5:3 e5:3 g5:3', 'f5:3 e5:3 d5:6', 'e5:3 c#5:2 d5:1 e5:3 a4:3', 'd5:6 a4:2 c#5:2 e5:2',
        'd5:1 e5:1 f5:2 a5:2 d6:3 c6:1 a5:2', 'f5:2 a5:2 d6:2 f6:3 e6:1 d6:2', 'e5:1 f5:1 g5:2 c6:2 e6:3 d6:1 c6:2', 'g5:2 c6:2 e6:2 g6:4 e6:2',
        'f6:2 e6:1 d6:1 a5:2 d6:2 f5:2 a5:2', 'd6:3 e6:1 f6:2 a6:4 g6:2', 'e6:2 c#6:1 a5:1 e5:2 a5:2 c#6:2 e6:2', 'g6:3 f6:1 e6:2 c#6:4 a5:2',
        'a5:2 c6:2 f6:2 a6:3 g6:1 f6:2', 'g6:2 e6:2 c6:2 g5:2 c6:2 e6:2', 'f6:2 d6:1 a5:1 f5:2 a5:2 d6:2 f6:2', 'f6:3 d6:1 a#5:2 f5:2 a#5:2 d6:2',
        'c#6:2 e6:2 a6:2 g6:2 f6:2 e6:2', 'f6:2 e6:2 d6:2 a5:4 f5:2', 'e5:1 f5:1 g5:1 a5:1 c#6:2 e6:2 g6:2 e6:2', 'd6:6 a5:2 f5:2 e5:2'].join(' '),
      p2: SEA_C.map(c => { const [a, b, d] = SEA[c]; return rep(`${a}:1 ${b}:1 ${d}:1`, 4); }).join(' ') + ' ' + // Akkordeon in 16teln
        SEA_C.map(c => { const [a, b, d] = SEA[c]; return Array.from({ length: 24 }, (_, i) => [a, b, d][i % 3] + ':0.5').join(' '); }).join(' '), // 32tel im B-Teil
      tri: SEA_C.map(c => { const [lo, hi] = SEA_B[c]; return `${lo}:2 ${lo}:1 ${hi}:2 ${lo}:1 ${lo}:2 ${lo}:1 ${hi}:2 ${lo}:1`; }).join(' ') + ' ' + // Galopp
        SEA_C.map(c => { const [lo, hi] = SEA_B[c]; return rep(`${lo}:1 ${lo}:1 ${hi}:1`, 4); }).join(' '), // pumpend
      pad: rep(SEA_C.map(c => SEA[c].join('+') + ':12').join(' '), 2),
      dr: SEA_C.map((c, i) => i % 4 === 3 ? 'k:1 h:1 q:1 h:1 k:1 k:1 q:1 h:1 t:1 t:1 u:1 u:1' : i % 8 === 0 ? 'x:1 h:1 o:1 h:1 k:1 h:1 q:1 h:1 o:1 k:1 k:1 h:1' : 'k:1 h:1 o:1 h:1 k:1 h:1 q:1 h:1 o:1 k:1 k:1 h:1').join(' ') + ' ' +
        SEA_C.map((c, i) => i === 15 ? 'k:1 h:1 q:1 h:1 t:1 u:1 w:6' : i % 4 === 3 ? 'k:1 k:1 q:1 h:1 k:1 k:1 q:1 q:1 t:1 t:1 u:1 u:1' : i % 8 === 0 ? 'x:1 h:1 k:1 h:1 k:1 k:1 q:1 h:1 k:1 k:1 o:1 k:1' : 'k:1 h:1 k:1 h:1 k:1 k:1 q:1 h:1 k:1 k:1 o:1 k:1').join(' '), // B-Teil: Doppel-Kick
    },
    // Miniboss auf dem Schiff: der lila Tentakel
    kraken: {
      bpm: 172, loop: true, echo: { delay: 3, vol: 0.3 },
      p1: ['d5:3 a4:3 d5:2 e5:1 f5:3', 'e5:3 d5:3 c#5:3 a4:3', 'd5:3 f5:3 a#5:2 a5:1 g5:3', 'f5:3 e5:3 c#5:6',
        'd5:2 d5:1 a5:3 a5:2 g5:1 f5:3', 'g5:3 f5:3 e5:3 d5:3', 'g5:3 a#5:3 d6:3 a#5:3', 'a5:3 g#5:3 a5:6',
        'a#5:3 f5:3 d5:2 f5:1 a#5:3', 'c6:3 g5:3 e5:2 g5:1 c6:3', 'd6:3 c6:3 a5:3 f5:3', 'e5:3 f5:3 d5:6',
        'd5:3 g5:3 a#5:2 a5:1 g5:3', 'a#5:3 a5:3 g5:3 d5:3', 'c#6:3 a5:3 e5:3 g5:3', 'a5:3 e5:3 c#5:3 a4:3'].join(' '),
      p2: KR_C.map(c => { const [a, b, d] = KR[c]; return rep(`${a}:1 ${b}:1 ${d}:1`, 4); }).join(' '),
      tri: KR_C.map(c => { const [lo, hi] = KR_B[c]; return `${lo}:2 ${lo}:1 ${hi}:2 ${lo}:1 ${lo}:2 ${lo}:1 ${hi}:2 ${lo}:1`; }).join(' '),
      pad: KR_C.map(c => KR[c].join('+') + ':12').join(' '),
      dr: KR_C.map((c, i) => i % 4 === 3 ? 'k:2 h:1 s:2 h:1 t:1 t:1 u:1 s:1 u:1 q:1' : (i % 8 === 0 ? 'x:2 h:1 s:2 h:1 k:2 k:1 s:2 h:1' : 'k:2 h:1 s:2 h:1 k:2 k:1 s:2 h:1')).join(' '),
    },
    // Siegesfanfare nach dem Miniboss, danach geht die Musik des Raums weiter
    fanfare: {
      bpm: 150, loop: false,
      p1: 'a4:2 d5:2 f#5:2 a5:4 f#5:2 a5:2 d6:10 -:8',
      p2: 'f#4:2 a4:2 d5:2 f#5:4 d5:2 f#5:2 a5:10 -:8',
      tri: 'd3:6 a2:6 d2:12 -:8',
      pad: 'd3+f#3+a3:16 d3+f#3+a3+d4:16',
      dr: 'k:2 s:2 k:2 s:4 k:2 k:2 c:10 -:8',
    },
    // Glasturm, Brücke und Thronsaal: Orgel-Toccata (e-Moll, 152 BPM) – Choral über rauschenden 16teln, dann ein
    // rhythmischer B-Teil mit 32tel-Arpeggien; Pedalbass in treibenden 16teln, Pauken auf der Eins
    chapel: {
      bpm: 164, loop: true, echo: { delay: 3, vol: 0.32 },
      p1: ['b4:8 e5:4 g5:4', 'f#5:4 e5:4 d#5:4 e5:4', 'c5:8 e5:4 a5:4', 'g5:4 f#5:4 d#5:8',
        'e5:8 b5:4 g5:4', 'e5:4 g5:4 c6:8', 'b5:4 a5:4 g5:4 e5:4', 'f#5:12 -:4',
        'd5:8 g5:4 b5:4', 'a5:4 f#5:4 d5:8', 'e5:4 g5:4 b5:4 e6:4', 'd6:4 c6:4 b5:4 g5:4',
        'a5:8 c6:4 e6:4', 'd#6:4 c6:4 b5:4 a5:4', 'g5:4 f#5:4 e5:8', 'd#5:8 f#5:4 b4:4',
        'e5:2 g5:2 b5:2 e6:4 d6:2 b5:2 g5:2', 'f#5:2 g5:2 a5:2 b5:2 g5:2 e5:2 b4:4', 'c6:2 b5:2 a5:2 e5:2 a5:2 c6:2 e6:4', 'd#6:2 c6:2 b5:2 f#5:2 d#5:4 b4:4',
        'g5:2 b5:2 e6:4 g6:4 f#6:2 e6:2', 'e6:2 g6:2 c6:2 e6:2 g5:2 c6:2 e5:4', 'a5:2 c6:2 e6:2 a6:4 g6:2 f#6:2 e6:2', 'f#6:4 d#6:4 b5:4 a5:4',
        'g5:2 b5:2 d6:4 b5:2 d6:2 g6:4', 'f#6:2 e6:2 d6:2 a5:2 f#5:2 a5:2 d6:4', 'e6:3 f#6:1 g6:4 f#6:2 e6:2 d#6:2 e6:2', 'c6:2 e6:2 g6:4 e6:2 c6:2 g5:4',
        'a5:2 c6:2 e6:2 c6:2 a5:2 e5:2 c5:4', 'b4:2 d#5:2 f#5:2 b5:4 a5:2 g5:2 f#5:2', 'g5:4 f#5:2 e5:2 b5:4 e6:4', 'd#6:4 b5:4 f#5:4 d#5:4'].join(' '),
      p2: CH_C.map(c => toccata(...CH[c])).join(' ') + ' ' + CH_C.map(c => arp3f(...CH[c])).join(' '),
      tri: rep(CH_C.map(c => { const lo = CH_B[c]; return drive(lo, lo.replace(/\d/, d => +d + 1)); }).join(' '), 2), // Orgelpedal in 16teln
      pad: rep(CH_C.map(c => CH[c].join('+') + ':16').join(' '), 2),
      dr: rep([PFOUR, DK, FOUR, FILLS, PFOUR, DK, DK, FILLP].join(' '), 2) + ' ' + sectionB(), // galoppierende Kick schon im Choral-Teil
    },
    // Sonnenkathedrale und Sonnenturm: aufsteigende Heldenmelodie, Galopp im Bass, im B-Teil rauschende 32tel
    sun: {
      bpm: 188, loop: true, echo: { delay: 3, vol: 0.3 },
      p1: contrastLead(SU_C, SU, [
        'b5:2 f#5:1 b5:1 d6:2 c#6:2 b5:2 f#5:2 d5:2 f#5:2', 'g5:2 d5:1 g5:1 b5:2 a5:2 g5:2 d5:2 b4:2 d5:2',
        'a5:2 d6:2 f#6:3 e6:1 d6:2 c#6:2 d6:2 a5:2', 'e6:4 c#6:2 a5:2 e5:4 a5:2 c#6:2',
        'b5:2 b5:1 b5:1 d6:2 f#6:2 b6:4 a6:2 f#6:2', 'g6:3 f#6:1 e6:2 d6:2 b5:2 d6:2 g6:4',
        'e6:2 g6:2 b6:2 g6:2 e6:2 b5:2 g5:2 e6:2', 'f#6:4 e6:2 c#6:2 a#5:4 f#5:4',
        'd6:2 b5:2 g5:2 b5:2 d6:3 e6:1 g6:4', 'e6:2 c#6:2 a5:2 c#6:2 e6:3 f#6:1 a6:4',
        'b6:4 a6:2 f#6:2 d6:2 f#6:2 b6:4', 'a6:2 f#6:2 d6:2 b5:2 f#5:4 b5:4',
        'g6:2 f#6:2 e6:2 b5:2 g5:2 b5:2 e6:4', 'd6:2 e6:2 f#6:2 g6:2 b6:4 a6:2 g6:2',
        'f#6:2 a#6:2 c#7:4 a#6:2 f#6:2 c#6:2 a#5:2', 'c#6:4 a#5:2 f#5:2 c#6:4 f#6:4',
      ]),
      p2: chordArps2(SU_C, SU), tri: chordBass(SU_C, SU_B, gallop), pad: chordPad(SU_C, SU), dr: section() + ' ' + sectionB(),
    },
    // Bibliothek und Uhrturm: Cembalo-Toccata mit Ohrwurm-Melodie, im B-Teil 32tel-Arpeggien und galoppierende Kick
    library: {
      bpm: 172, loop: true, echo: { delay: 3, vol: 0.3 },
      p1: contrastLead(LB_C, LB, [
        'a5:2 e5:1 a5:1 c6:2 b5:2 a5:2 e5:2 c5:2 e5:2', 'g#5:2 e5:1 g#5:1 b5:2 a5:2 g#5:2 e5:2 b4:2 e5:2',
        'a5:2 c6:2 e6:3 d6:1 c6:2 b5:2 a5:2 g#5:2', 'b5:2 g5:2 d5:2 g5:2 b5:4 a5:2 g5:2',
        'a5:2 f5:1 a5:1 c6:2 a5:2 f6:4 e6:2 d6:2', 'e6:3 d6:1 c6:2 g5:2 e5:2 g5:2 c6:4',
        'd6:2 c6:2 a5:2 f5:2 d5:2 f5:2 a5:2 d6:2', 'b5:4 g#5:4 e5:4 g#5:2 b5:2',
        'c6:2 b5:2 a5:2 e5:2 a5:3 b5:1 c6:4', 'd6:2 c6:2 a5:2 f5:2 d6:3 e6:1 f6:4',
        'g6:2 f6:2 d6:2 b5:2 g5:2 b5:2 d6:4', 'e6:2 d6:2 c6:2 g5:2 e5:4 c6:4',
        'a5:2 c6:2 f6:4 e6:2 d6:2 c6:2 a5:2', 'f6:2 e6:2 d6:2 a5:2 f5:2 a5:2 d6:4',
        'e6:2 d6:2 b5:2 g#5:2 e6:2 g#6:2 b6:4', 'g#6:4 e6:2 b5:2 g#5:4 e5:4',
      ]),
      p2: LB_C.map(c => toccata(...LB[c])).join(' ') + ' ' + LB_C.map(c => arp3f(...LB[c])).join(' '),
      tri: chordBass(LB_C, LB_B, drive), pad: chordPad(LB_C, LB), dr: section() + ' ' + sectionB(),
    },
    expo: {
      bpm: 196, loop: true, echo: { delay: 3, vol: 0.28 },
      p1: rep(['a5:6 f5:3 d5:3', 'e5:3 f5:3 a5:6', 'c#6:6 b5:3 a5:3', 'g5:6 e5:6', 'd6:6 a#5:3 g5:3', 'a5:3 a#5:3 d6:6', 'f6:6 e6:3 d6:3', 'a5:12',
        'f6:6 d6:3 a#5:3', 'c6:3 d6:3 f6:6', 'g6:6 f6:3 d6:3', 'e6:6 c#6:6', 'd6:4 f6:4 a6:4', 'a#6:6 a6:3 g6:3', 'e6:4 g6:4 c#6:4', 'd6:12',
        'c6:6 a5:3 f5:3', 'g5:3 a5:3 c6:6', 'e6:6 d6:3 c6:3', 'g5:12', 'd6:6 a#5:3 f5:3', 'g5:3 a5:3 a#5:6', 'a5:4 c6:4 f6:4', 'e6:6 c#6:6',
        'f6:6 e6:3 d6:3', 'a5:3 d6:3 f6:6', 'g6:6 f6:3 d6:3', 'a#5:6 d6:6', 'g#5:6 b5:3 d6:3', 'e6:6 d6:3 b5:3', 'c#6:4 e6:4 g6:4', 'a6:6 g6:3 e6:3'].join(' '), 2),
      p2: EX_C.map(c => { const [a, b, d] = EX[c]; return rep(`${a}:1 ${b}:1 ${d}:1 ${b}:1`, 3); }).join(' ') + ' ' + // 16tel-Arpeggien
        EX_C.map(c => Array.from({ length: 24 }, (_, i) => EX[c][i % 3] + ':0.5').join(' ')).join(' '), // 32tel im B-Teil
      tri: EX_C.map(c => { const [lo, hi] = EX_B[c]; return rep(`${lo}:2 ${lo}:1 ${hi}:1`, 3); }).join(' ') + ' ' + // Galopp
        EX_C.map(c => { const [lo, hi] = EX_B[c]; return rep(`${lo}:1 ${lo}:1 ${hi}:1 ${lo}:1`, 3); }).join(' '), // pumpend
      pad: rep(EX_C.map(c => EX[c].join('+') + ':12').join(' '), 2),
      dr: EX_C.map((c, i) => i % 4 === 3 ? 'k:1 h:1 q:1 h:1 k:1 k:1 q:1 q:1 t:1 t:1 u:1 u:1' : i % 8 === 0 ? 'x:1 h:1 k:1 h:1 q:1 h:1 o:1 h:1 q:1 h:1 o:1 k:1' : 'k:1 h:1 k:1 h:1 q:1 h:1 o:1 h:1 q:1 h:1 o:1 k:1').join(' ') + ' ' +
        EX_C.map((c, i) => i === 31 ? 'k:1 h:1 q:1 h:1 t:1 u:1 w:6' : i % 4 === 3 ? 'k:1 k:1 q:1 k:1 k:1 k:1 q:1 q:1 t:1 t:1 u:1 u:1' : i % 8 === 0 ? 'x:1 k:1 k:1 k:1 q:1 k:1 k:1 k:1 q:1 k:1 o:1 k:1' : 'k:1 k:1 k:1 k:1 q:1 k:1 k:1 k:1 q:1 k:1 o:1 k:1').join(' '), // B-Teil: Doppel-Kick
    },
    clear: {
      bpm: 150, loop: false,
      p1: 'd5:2 f5:2 a5:2 d6:6 c6:2 a#5:2 a5:2 c#6:2 d6:8',
      p2: 'a4:2 d5:2 f5:2 a5:6 a5:2 f5:2 e5:2 e5:2 f#5:8',
      tri: 'd3:12 a2:8 d3:8',
      dr: 'k:2 s:2 k:2 s:6 k:2 k:2 k:2 s:2 c:8',
    },
    names: { // Namenseingabe der Bestenliste: kurze, flotte Arcade-Schleife in D-Dur
      bpm: 132, loop: true, echo: { delay: 3, vol: 0.28 },
      p1: 'd5:2 f#5:2 a5:2 f#5:2 d5:2 f#5:2 a5:4 b5:2 a5:2 g5:2 e5:2 c#5:2 e5:2 g5:4 a5:2 g5:2 f#5:2 d5:2 a4:2 d5:2 f#5:4 e5:2 f#5:2 g5:2 e5:2 c#5:4 d5:4',
      p2: [arp4('d4', 'f#4', 'a4'), arp4('g3', 'b3', 'd4'), arp4('a3', 'c#4', 'e4'), arp4('d4', 'f#4', 'a4')].join(' '),
      tri: [drive('d2', 'd3'), drive('g1', 'g2'), drive('a1', 'a2'), drive('d2', 'd3')].join(' '),
      dr: rep('k:2 h:2 s:2 h:2', 8),
    },
    over: {
      bpm: 90, loop: false,
      p1: 'a4:4 g4:4 f4:4 e4:4 d4:12',
      p2: 'f4:4 e4:4 d4:4 c#4:4 a3:12',
      tri: 'd3:16 a2:4 d2:8',
      dr: '-:28',
    },
    ending: {
      bpm: 116, loop: true, echo: { delay: 4, vol: 0.3 },
      p1: 'f#5:4 a5:4 d6:8 b5:4 a5:4 g5:8 e5:4 f#5:4 g5:4 a5:4 f#5:16 d6:4 c#6:4 b5:8 g5:4 a5:4 b5:8 a5:4 g5:4 f#5:4 e5:4 d5:16',
      p2: [arp4('d4', 'f#4', 'a4', 2, 2), arp4('g3', 'b3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f#4', 'a4', 2, 2),
        arp4('b3', 'd4', 'f#4', 2, 2), arp4('g3', 'b3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f#4', 'a4', 2, 2)].join(' '),
      tri: [oct('d2', 'd3'), oct('g1', 'g2'), oct('a1', 'a2'), oct('d2', 'd3'), oct('b1', 'b2'), oct('g1', 'g2'), oct('a1', 'a2'), oct('d2', 'd3')].join(' '),
      dr: [ROCKX, rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 o:2', 6), FILL].join(' '),
    },
  };

  function parse(str) {
    return str.trim().split(/\s+/).map(tok => {
      const [n, l] = tok.split(':');
      return { n, len: parseFloat(l || '1') };
    });
  }
  // Boss Phase 2: schneller und härter
  SONGS.boss2 = Object.assign({}, SONGS.boss, { bpm: 212, dr: [DKX, DK, DK, FILLR, DKX, DK, DK, FILLR].join(' ') });
  const parsed = {};
  for (const k in SONGS) {
    const s = SONGS[k];
    const tracks = ['p1', 'p2', 'tri', 'dr', 'pad'].filter(t => s[t]).map(t => ({ name: t, ev: parse(s[t]) }));
    const lens = tracks.map(t => t.ev.reduce((a, e) => a + e.len, 0));
    if (new Set(lens).size > 1) console.warn('Songlänge ungleich', k, lens);
    parsed[k] = { bpm: s.bpm, loop: s.loop, echo: s.echo, tracks, steps: lens[0] };
  }

  let song = null, songName = null, pending = null, timer = null, tempoMul = 1, nextSong = null;
  let cursors = [];

  // Sidechain: Melodie/Bass kurz absenken, wenn die Kick kommt
  function sidechain(t) {
    melBus.gain.setValueAtTime(0.45, t);
    melBus.gain.linearRampToValueAtTime(1, t + 0.12);
  }
  function drum(n, t, dur) {
    if (n === 'w') { // Riser: Rauschen schwillt an und steigt
      const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
      f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(9000, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0.01, t); g.gain.linearRampToValueAtTime(0.38, t + dur * 0.95); g.gain.linearRampToValueAtTime(0, t + dur);
      src.connect(f); f.connect(g); g.connect(musicBus); src.start(t); src.stop(t + dur + 0.02);
      return;
    }
    if (n === 'r') { noise(0.06, 0.3, 'bandpass', 2000, 1100, t, musicBus); noise(0.06, 0.34, 'bandpass', 2000, 1100, t + dur / 2, musicBus); return; }
    if (n === 'z') noise(0.03, 0.1, 'highpass', 8000, null, t, musicBus);
    if (n === 'k' || n === 'x' || n === 'q' || n === 'z') {
      sidechain(t);
      const o = osc('triangle'), g = ac.createGain();
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      g.gain.setValueAtTime(0.85, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.16);
      noise(0.02, 0.25, 'lowpass', 2500, null, t, musicBus);
    }
    if (n === 'x' || n === 'c') noise(0.7, 0.22, 'highpass', 6000, 2500, t, musicBus);
    if (n === 's' || n === 'q') { noise(0.14, 0.3, 'bandpass', 1900, 900, t, musicBus); tone2('triangle', 240, 120, 0.06, 0.19, t); }
    else if (n === 'h') noise(0.03, 0.13, 'highpass', 8000, null, t, musicBus);
    else if (n === 'o') noise(0.12, 0.13, 'highpass', 7000, null, t, musicBus);
    else if (n === 't') tone2('triangle', 300, 120, 0.12, 0.45, t);
    else if (n === 'u') tone2('triangle', 200, 70, 0.15, 0.5, t);
    else if (n === 'p') { tone2('triangle', 120, 82, 0.55, 0.55, t); noise(0.18, 0.12, 'lowpass', 500, 120, t, musicBus); } // Pauke
  }
  function tone2(type, f0, f1, dur, vol, t) {
    const o = osc(type), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.02);
  }

  function note(track, f, t, dur, volMul = 1, dutyOverride) {
    const o = track === 'tri' ? osc('triangle') : osc('pulse', dutyOverride || (track === 'p1' ? 0.25 : 0.125));
    const g = ac.createGain();
    const vol = (track === 'p1' ? 0.2 : track === 'p2' ? 0.085 : track === 'pb' ? 0.05 : 0.42) * volMul;
    const gate = Math.max(0.03, dur * (track === 'tri' ? 0.92 : track === 'pb' ? 0.55 : 0.82));
    o.frequency.setValueAtTime(f, t);
    if (track === 'p1' && dur > 0.22) { // Vibrato bei langen Tönen
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 6.5; lg.gain.value = f * 0.009;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t + 0.1); lfo.stop(t + gate + 0.05);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.setValueAtTime(vol * (track === 'tri' ? 1 : 0.72), t + Math.min(gate, 0.07));
    g.gain.linearRampToValueAtTime(0, t + gate);
    o.connect(g); g.connect(melBus);
    o.start(t); o.stop(t + gate + 0.02);
  }

  // Orgel/Chor: verstimmte Sägezähne durch Tiefpass, langsamer Einsatz
  function padNote(f, t, dur) {
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; lp.Q.value = 2;
    const g = ac.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.5); g.gain.setValueAtTime(0.045, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur + 0.6);
    [-7, 7].forEach(cents => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.7);
    });
    lp.connect(g); g.connect(melBus);
  }

  function playEvent(track, ev, t, stepDur) {
    if (ev.n === '-') return;
    if (track === 'pad') { ev.n.split('+').forEach(n => { const f = freq(n); if (f) padNote(f, t, ev.len * stepDur); }); return; }
    if (track === 'dr') { drum(ev.n, t, ev.len * stepDur); return; }
    const f = freq(ev.n);
    if (!f) return;
    const dur = ev.len * stepDur;
    note(track, f, t, dur);
    if (track === 'tri' && song.loop && dur < 0.2) note('pb', f * 2, t, dur, 1, 0.125); // kratziger Bass
    if (track === 'p1' && song.echo) note('p1', f, t + song.echo.delay * stepDur, dur, song.echo.vol, 0.125);
  }

  function schedule() {
    if (!song || !ac) return;
    const stepDur = 60 / (song.bpm * tempoMul) / 4;
    const horizon = ac.currentTime + 0.15;
    let allDone = true;
    cursors.forEach((c, i) => {
      const tr = song.tracks[i];
      while (!c.done && c.t < horizon) {
        if (c.i >= tr.ev.length) {
          if (!song.loop) { c.done = true; break; }
          c.i = 0;
        }
        const ev = tr.ev[c.i++];
        playEvent(tr.name, ev, c.t, stepDur);
        c.t += ev.len * stepDur;
      }
      if (!c.done) allDone = false;
    });
    if (allDone && !song.loop) { const nx = nextSong; stop(); if (nx) play(nx); } // Jingle zu Ende → weiter mit dem nächsten Lied
  }

  // fade (s): beim Raumwechsel blendet das alte Lied aus und das neue weich ein, statt hart zu schneiden
  function play(name, then = null, fade = 0) {
    if (!ac) { pending = then || name; return; }
    if (songName === name && song) return;
    if (!parsed[name]) return;
    stop(song ? fade : 0);
    song = parsed[name]; songName = name; nextSong = then;
    const t0 = ac.currentTime + 0.05 + (fade ? fade * 2 : 0);
    cursors = song.tracks.map(() => ({ i: 0, t: t0, done: false }));
    schedule();
    timer = setInterval(schedule, 40);
  }
  function stop(fade = 0) {
    if (timer) clearInterval(timer);
    timer = null; song = null; songName = null; pending = null; nextSong = null;
    if (musicBus && ac) { // laufende Noten weich abschneiden
      const old = musicBus, t = ac.currentTime, level = MUSIC_VOL * musicLevel;
      old.gain.setTargetAtTime(0, t, fade || 0.02);
      setTimeout(() => old.disconnect(), fade ? fade * 9000 : 300);
      musicBus = ac.createGain(); musicBus.connect(muffleF);
      if (fade) { musicBus.gain.setValueAtTime(0.0001, t); musicBus.gain.linearRampToValueAtTime(level, t + fade * 5); } else musicBus.gain.value = level;
      melBus = ac.createGain(); melBus.connect(musicBus);
    }
  }
  // ---------------- Ambiente pro Gebiet ----------------
  // Dauerhaftes Klangbett (Regen, Wind, Dröhnen, Orgel) + seltene Einzelgeräusche (Uhrwerk, Tropfen, Ketten).
  let amb = null, ambTheme = null, ambT = 0;
  function ambNoise(nodes, out, type, freq, q) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
    s.connect(f); f.connect(out); s.start(0, Math.random()); nodes.push(s);
    return f;
  }
  function ambLfo(nodes, param, rate, depth) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = rate; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); nodes.push(o);
  }
  function ambDrone(nodes, out, type, freq, vol) {
    const o = osc(type), g = ac.createGain(); o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(out); o.start(); nodes.push(o);
    return o;
  }
  function startAmb(theme) {
    const nodes = [], out = ac.createGain(), t = ac.currentTime;
    out.gain.value = 0; out.connect(master);
    let level = 0.024;
    if (theme === 'courtyard' || theme === 'bridge') { // Regen + Windböen (auf der Brücke zusätzlich heulender Sturm)
      const hp = ambNoise(nodes, out, 'highpass', 700), lp = ac.createBiquadFilter();
      hp.disconnect(); lp.type = 'lowpass'; lp.frequency.value = 5200; hp.connect(lp); lp.connect(out);
      ambLfo(nodes, out.gain, 0.13, 0.01);
      if (theme === 'bridge') { const bp = ambNoise(nodes, out, 'bandpass', 380, 5); ambLfo(nodes, bp.frequency, 0.09, 240); level = 0.034; }
    } else if (theme === 'expo') { // feuchte, stille Halle: leises Rauschen der Lüftung, ein ferner Glasklang
      ambNoise(nodes, out, 'lowpass', 900); ambDrone(nodes, out, 'sine', 196, 0.12); ambDrone(nodes, out, 'sine', 293.7, 0.08);
      ambLfo(nodes, out.gain, 0.06, 0.008); level = 0.02;
    } else if (theme === 'forest') { // Wind rauscht in den Kronen, schwillt an und ab
      const bp = ambNoise(nodes, out, 'bandpass', 1600, 0.8); ambLfo(nodes, bp.frequency, 0.05, 500);
      ambNoise(nodes, out, 'lowpass', 300);
      ambLfo(nodes, out.gain, 0.08, 0.012); level = 0.026;
    } else if (theme === 'foyer') { // Eingangshalle: Regen an den hohen Fenstern, Wind heult durch zerbrochene Scheiben
      const hp = ambNoise(nodes, out, 'highpass', 900), lp = ac.createBiquadFilter();
      hp.disconnect(); lp.type = 'lowpass'; lp.frequency.value = 4200; hp.connect(lp); lp.connect(out);
      const bp = ambNoise(nodes, out, 'bandpass', 480, 6); ambLfo(nodes, bp.frequency, 0.06, 220);
      ambLfo(nodes, out.gain, 0.1, 0.01); level = 0.028;
    } else if (theme === 'library') { // Bibliothek: gedämpfter Regen an den hohen Fenstern, tiefer Raumklang
      const hp = ambNoise(nodes, out, 'highpass', 1200), lp = ac.createBiquadFilter();
      hp.disconnect(); lp.type = 'lowpass'; lp.frequency.value = 3000; hp.connect(lp); lp.connect(out);
      ambDrone(nodes, out, 'sine', 65.4, 0.25);
      level = 0.018;
    } else if (theme === 'hall' || theme === 'tower') { // heulender Wind durch die Turmfenster
      const bp = ambNoise(nodes, out, 'bandpass', 520, 7);
      ambLfo(nodes, bp.frequency, 0.07, 260); ambLfo(nodes, out.gain, 0.11, 0.008);
      level = 0.03;
    } else if (theme === 'cave') { // tiefes Grollen unter der Erde
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 140; lp.connect(out);
      ambDrone(nodes, lp, 'sawtooth', 41.2, 0.5); ambDrone(nodes, lp, 'sawtooth', 61.7, 0.3);
      ambNoise(nodes, out, 'lowpass', 220);
      ambLfo(nodes, out.gain, 0.09, 0.012);
      level = 0.03;
    } else if (theme === 'crypt') { // kaltes Dröhnen, leicht schwebend
      ambDrone(nodes, out, 'sine', 55, 0.6); ambDrone(nodes, out, 'sine', 55.7, 0.6); ambDrone(nodes, out, 'triangle', 82.4, 0.25);
      level = 0.034;
    } else if (theme === 'throne') { // ferne Orgel (D-Moll-Quinte), schwillt langsam an und ab
      ambDrone(nodes, out, 'triangle', 73.4, 0.5); ambDrone(nodes, out, 'triangle', 110, 0.35); ambDrone(nodes, out, 'sine', 146.8, 0.2);
      ambLfo(nodes, out.gain, 0.05, 0.01);
      level = 0.022;
    } else if (theme === 'glass' || theme === 'gallery') { // Glasturm, Marmorgalerie: ferner Chor (A-Dur-Klang), schwebend
      ambDrone(nodes, out, 'sine', 220, 0.5); ambDrone(nodes, out, 'sine', 277.2, 0.35); ambDrone(nodes, out, 'sine', 329.6, 0.3); ambDrone(nodes, out, 'triangle', 110, 0.3);
      ambLfo(nodes, out.gain, 0.07, 0.008);
      level = 0.018;
    } else if (theme === 'ship') { // Brandung: anschwellendes Wellenrauschen + Wind in der Takelage
      const lp = ambNoise(nodes, out, 'lowpass', 600);
      ambLfo(nodes, lp.frequency, 0.08, 380); ambLfo(nodes, out.gain, 0.08, 0.014);
      const bp = ambNoise(nodes, out, 'bandpass', 1400, 5);
      ambLfo(nodes, bp.frequency, 0.05, 500);
      level = 0.03;
    } else if (theme === 'vortex') { // Sog: schnell kreisender Wind
      const bp = ambNoise(nodes, out, 'bandpass', 900, 4);
      ambLfo(nodes, bp.frequency, 0.6, 500);
      level = 0.028;
    } else { out.disconnect(); return null; }
    out.gain.setTargetAtTime(level, t, 0.8);
    return { nodes, out };
  }
  function stopAmb() {
    if (!amb) return;
    const a = amb; amb = null;
    a.out.gain.setTargetAtTime(0, ac.currentTime, 0.4);
    setTimeout(() => { a.nodes.forEach(n => { try { n.stop(); } catch (e) { /* schon gestoppt */ } }); a.out.disconnect(); }, 1600);
  }
  // Einzelgeräusche über dem Klangbett (einmal pro Spiel-Frame aufgerufen)
  function ambEvents(theme) {
    ambT++;
    const t = ac.currentTime;
    if (theme === 'tower' && ambT % 32 === 0) { // Uhrwerk: Tick-Tack
      tone('triangle', ambT % 64 ? 1250 : 940, 0, 0.035, 0.035, 0, t);
      noise(0.025, 0.03, 'highpass', 4200, 0, t);
    } else if (theme === 'expo') { // Kondenswasser tropft vom Glas, ab und zu klirrt eine Scheibe im Rahmen
      if (Math.random() < 0.005) drip(null, 0.5);
      if (Math.random() < 0.0015) tone('sine', 1500 + Math.random() * 900, 0, 0.6, 0.014, 0, t);
    } else if (theme === 'forest') { // Grillen zirpen, ab und zu ruft ein Käuzchen (zweimal), irgendwo knackt ein Ast
      if (ambT % 26 < 6 && ambT % 2 === 0) tone('sine', 4300 + (ambT % 52 < 26 ? 0 : 160), 0, 0.03, 0.006, 0, t);
      if (Math.random() < 0.0018) { tone('sine', 430, 390, 0.32, 0.03, 0, t); tone('sine', 410, 360, 0.5, 0.03, 0, t + 0.45); }
      if (Math.random() < 0.0012) noise(0.06, 0.04, 'bandpass', 1800, 0, t);
    } else if (theme === 'cave' && Math.random() < 0.006) drip(null, 0.6);
    else if (theme === 'crypt' && Math.random() < 0.0025) { // ferne Ketten
      for (let i = 0; i < 5; i++) noise(0.05, 0.035, 'bandpass', 3000 + Math.random() * 2000, 0, t + i * 0.07 + Math.random() * 0.03);
    } else if (theme === 'glass' && Math.random() < 0.003) { // Glas klingt
      tone('sine', 1800 + Math.random() * 1600, 0, 0.5, 0.02, 0, t);
    } else if (theme === 'ship' && Math.random() < 0.004) { // Schiffsrumpf ächzt
      tone('sawtooth', 60 + Math.random() * 25, 45, 0.7, 0.03, 0, t);
    } else if (theme === 'library') { // Standuhr tickt gemächlich, irgendwo raschelt eine Seite
      if (ambT % 45 === 0) tone('triangle', ambT % 90 ? 820 : 640, 0, 0.05, 0.03, 0, t);
      if (Math.random() < 0.002) noise(0.18, 0.025, 'highpass', 3000, 6000, t);
    } else if (theme === 'hall' && Math.random() < 0.0015) { // Gebälk knarzt
      tone('sawtooth', 70 + Math.random() * 20, 50, 0.6, 0.025, 0, t);
    }
  }
  // Wassertropfen: hohes „Plink" mit Hall; x = Weltposition (für Stereo), vol = Lautstärke
  function drip(x, vol = 1) {
    if (!ac || muted) return;
    const f = 1300 + Math.random() * 1100, t = ac.currentTime;
    const o = osc('sine'), g = ac.createGain();
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 0.55, t + 0.09);
    g.gain.setValueAtTime(0.06 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    let dst = sfxBus;
    if (typeof x === 'number' && ac.createStereoPanner && typeof W !== 'undefined' && W.cam) {
      const p = ac.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, (x - W.cam.x - View.w / 2) / (View.w * 0.55))) * 0.8; p.connect(sfxBus); dst = p;
    }
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + 0.18);
  }
  // theme: Raumthema (string) oder null; true = Regen wie im Burghof (Titel)
  function ambience(theme) {
    if (!ac) return;
    if (theme === true) theme = 'courtyard';
    theme = theme || null;
    if (theme !== ambTheme) { stopAmb(); ambTheme = theme; if (theme) amb = startAmb(theme); }
    if (theme && ac.state === 'running') ambEvents(theme);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ac.currentTime, 0.02);
    return muted;
  }
  function setMusicVolume(v) { if (musicBus && ac) musicBus.gain.setTargetAtTime(v * (MUSIC_VOL / 0.5) * musicLevel, ac.currentTime, 0.05); }
  function setMusicLevel(l) { musicLevel = l; if (musicBus && ac) musicBus.gain.setTargetAtTime(MUSIC_VOL * l, ac.currentTime, 0.05); }

  function tempo(m) { tempoMul = m; }
  const openFreq = () => Math.min(18000, ac.sampleRate / 2 - 100);
  function muffle(on) { if (muffleF && ac) muffleF.frequency.setTargetAtTime(on ? 650 : openFreq(), ac.currentTime, on ? 0.04 : 0.12); }
  function duck(on) { if (duckBus && ac) duckBus.gain.setTargetAtTime(on ? 0.45 : 1, ac.currentTime, on ? 0.06 : 0.5); }

  return { init, prepare, sfx, play, stop, ambience, drip, toggleMute, setMusicVolume, setMusicLevel, ready, duck, muffle, tempo,
    context: () => ac, voiceOut: () => voiceBus,
    stream: () => { if (!ac) return null; if (!tapDest) { tapDest = ac.createMediaStreamDestination(); comp.connect(tapDest); } return tapDest.stream; }, // Mitschnitt (Trailer-Aufnahme)
    get muted() { return muted; }, get current() { return songName; }, _songs: parsed };
})();
