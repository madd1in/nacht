// Chiptune-Engine: 2x Puls + Echo, Dreieck, Rauschen (Drum-Kit). Eigene Kompositionen + SFX-Synthese.
'use strict';

const Audio8 = (() => {
  let ac = null, master, comp, musicBus, sfxBus, noiseBuf, pulseWaves = {};
  let muted = false;
  const MUSIC_VOL = 0.82;
  let musicLevel = 1;
  const NOTE = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6, g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(comp);
    musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL * musicLevel; musicBus.connect(master);
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
    if (pending) { const p = pending; pending = null; play(p); }
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
  function tone(type, f0, f1, dur, vol, duty, t0) {
    if (!ac) return;
    const t = t0 || ac.currentTime;
    const o = osc(type, duty), g = ac.createGain();
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxBus);
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
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
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
    bat: () => tone('pulse', 2400, 1800, 0.05, 0.05, 0.125),
    djump: () => { tone('pulse', 420, 1250, 0.11, 0.11, 0.25); noise(0.12, 0.12, 'highpass', 3500, 7000); },
    ready: () => arp(['e6', 'a6', 'e7'], 0.04, 'pulse', 0.12, 0.125),
    crash: () => { arp(['a4', 'e5', 'a5', 'c#6', 'e6', 'a6', 'c#7'], 0.035, 'pulse', 0.16, 0.5); noise(0.9, 0.4, 'highpass', 5000, 800); tone('triangle', 220, 55, 0.7, 0.4); },
    checkpoint: () => arp(['g5', 'c6', 'e6', 'g6', 'c7'], 0.07, 'pulse', 0.14, 0.25),
    chest: () => { tone('triangle', 140, 90, 0.2, 0.3); arp(['c6', 'e6', 'g6', 'c7'], 0.05, 'pulse', 0.13, 0.25); },
    crumble: () => noise(0.25, 0.25, 'lowpass', 1200, 200),
    raven: () => { tone('pulse', 900, 500, 0.12, 0.08, 0.125); noise(0.1, 0.1, 'bandpass', 2000, 900); },
  };
  function sfx(name) {
    if (!ac || !SFX[name]) return;
    const now = ac.currentTime;
    if (last[name] && now - last[name] < 0.035) return;
    last[name] = now;
    SFX[name]();
  }

  // ---------------- Musik ----------------
  const rep = (s, n) => Array(n).fill(s).join(' ');
  const arp4 = (a, b, c, len = 1, times = 4) => rep(`${a}:${len} ${b}:${len} ${c}:${len} ${b}:${len}`, times);
  const oct = (lo, hi, n = 4) => rep(`${lo}:2 ${hi}:2`, n);
  const gallop = (lo, hi) => `${lo}:2 ${hi}:1 ${hi}:1 ${lo}:2 ${hi}:1 ${hi}:1 ${lo}:2 ${hi}:1 ${hi}:1 ${lo}:1 ${hi}:1 ${lo}:1 ${hi}:1`;
  const drive = (lo, hi) => rep(`${lo}:1 ${lo}:1 ${hi}:1 ${lo}:1`, 4);
  const ROCK = 'k:1 h:1 h:1 h:1 s:1 h:1 h:1 k:1 k:1 h:1 k:1 h:1 s:1 h:1 o:1 h:1';
  const ROCKX = 'x:1 h:1 h:1 h:1 s:1 h:1 h:1 k:1 k:1 h:1 k:1 h:1 s:1 h:1 o:1 h:1';
  const FILL = 'k:1 h:1 s:1 h:1 k:1 s:1 s:1 h:1 t:1 t:1 u:1 u:1 s:1 s:1 s:1 s:1';
  const section = () => [ROCKX, ROCK, ROCK, ROCK, ROCK, ROCK, ROCK, FILL].join(' ');
  const chordArps = (list, m) => list.map(c => arp4(...m[c])).join(' ');
  const chordBass = (list, m, fn) => list.map(c => fn(...m[c])).join(' ');

  // Stage 1 – Burgsturm (d-Moll, 168 BPM)
  const S1 = { Dm: ['d4', 'f4', 'a4'], Bb: ['a#3', 'd4', 'f4'], C: ['c4', 'e4', 'g4'], A: ['a3', 'c#4', 'e4'], Gm: ['g3', 'a#3', 'd4'] };
  const S1B = { Dm: ['d2', 'd3'], Bb: ['a#1', 'a#2'], C: ['c2', 'c3'], A: ['a1', 'a2'], Gm: ['g1', 'g2'] };
  const S1C = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Dm', 'Bb', 'A', 'Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A'];
  // Stage 2 – Katakomben-Ritt (a-Moll, 152 BPM)
  const S2 = { Am: ['a3', 'c4', 'e4'], F: ['f3', 'a3', 'c4'], G: ['g3', 'b3', 'd4'], E: ['e3', 'g#3', 'b3'], Dm: ['d4', 'f4', 'a4'] };
  const S2B = { Am: ['a1', 'a2'], F: ['f1', 'f2'], G: ['g1', 'g2'], E: ['e1', 'e2'], Dm: ['d2', 'd3'] };
  const S2C = ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'E', 'E', 'Dm', 'Dm', 'Am', 'Am', 'F', 'G', 'E', 'E'];
  // Stage 3 – Bergfried (e-Moll, 176 BPM)
  const S3 = { Em: ['e4', 'g4', 'b4'], C: ['c4', 'e4', 'g4'], D: ['d4', 'f#4', 'a4'], B: ['b3', 'd#4', 'f#4'], Am: ['a3', 'c4', 'e4'] };
  const S3B = { Em: ['e2', 'e3'], C: ['c2', 'c3'], D: ['d2', 'd3'], B: ['b1', 'b2'], Am: ['a1', 'a2'] };
  const S3C = ['Em', 'Em', 'C', 'D', 'Em', 'Em', 'B', 'B', 'Am', 'Am', 'Em', 'Em', 'C', 'D', 'B', 'B'];

  const SONGS = {
    title: {
      bpm: 104, loop: true,
      p1: 'd5:8 a4:4 f4:4 a#4:8 a4:4 g4:4 a4:6 g4:2 f4:4 e4:4 d4:12 -:4 f5:8 e5:4 d5:4 g5:8 f5:4 e5:4 f5:4 e5:4 d5:4 c#5:4 d5:12 -:4',
      p2: [arp4('d4', 'f4', 'a4', 2, 2), arp4('a#3', 'd4', 'f4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f4', 'a4', 2, 2),
        arp4('d4', 'f4', 'a4', 2, 2), arp4('g3', 'a#3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f4', 'a4', 2, 2)].join(' '),
      tri: 'd2:16 a#1:16 a1:16 d2:16 d2:16 g1:16 a1:16 d2:16',
      dr: [rep('-:12 h:4', 4), rep('k:4 h:4 s:4 h:4', 3), 'k:2 k:2 s:2 s:2 t:2 t:2 u:2 c:2'].join(' '),
      echo: { delay: 4, vol: 0.3 },
    },
    stage1: {
      bpm: 168, loop: true, echo: { delay: 3, vol: 0.32 },
      p1: [
        'd5:2 d5:1 e5:1 f5:2 d5:2 a5:3 g5:1 f5:2 e5:2', 'd5:1 c5:1 d5:2 a4:2 d5:2 f5:2 e5:2 d5:2 c5:2',
        'a#4:2 d5:2 f5:2 a#5:4 a5:2 g5:2 f5:2', 'g5:3 f5:1 e5:2 c5:2 e5:2 g5:2 c6:4',
        'd5:2 d5:1 e5:1 f5:2 d5:2 a5:3 g5:1 f5:2 e5:2', 'f5:2 g5:2 a5:2 d6:4 c6:2 a5:2 f5:2',
        'a#5:2 a5:2 g5:2 f5:2 g5:2 a5:2 a#5:2 d6:2', 'c#6:4 a5:2 e5:2 c#5:2 e5:2 a5:4',
        'g5:3 a#5:1 d6:4 c6:2 a#5:2 a5:2 g5:2', 'a5:2 a#5:2 a5:2 g5:2 f5:4 d5:4',
        'a5:3 f5:1 d5:2 f5:2 a5:2 d6:2 c6:2 a5:2', 'd6:6 c6:1 a#5:1 a5:4 f5:4',
        'f5:2 a#5:2 d6:2 f6:4 d6:2 a#5:2 f5:2', 'e5:2 g5:2 c6:2 e6:4 d6:2 c6:2 a#5:2',
        'a5:2 c#6:2 e6:2 a6:4 g6:2 f6:2 e6:2', 'c#6:2 a5:2 e5:2 c#5:2 a4:4 -:4',
      ].join(' '),
      p2: chordArps(S1C, S1), tri: chordBass(S1C, S1B, gallop), dr: section() + ' ' + section(),
    },
    stage2: {
      bpm: 152, loop: true, echo: { delay: 3, vol: 0.35 },
      p1: [
        'a4:2 c5:2 e5:2 a5:3 g5:1 e5:2 c5:2 e5:2', 'd5:2 e5:2 c5:2 a4:2 b4:2 c5:2 b4:2 g4:2',
        'a4:2 c5:2 f5:4 e5:2 d5:2 c5:4', 'b4:2 d5:2 g5:4 f5:2 e5:2 d5:4',
        'e5:3 e5:1 a5:2 e5:2 c6:3 b5:1 a5:2 g5:2', 'a5:2 g5:2 e5:2 c5:2 d5:2 e5:2 c5:2 a4:2',
        'g#4:2 b4:2 e5:2 g#5:4 f5:2 e5:2 d5:2', 'b4:4 g#4:4 e4:4 -:2 e5:2',
        'f5:3 e5:1 d5:2 a4:2 d5:2 f5:2 a5:4', 'g5:2 f5:2 e5:2 d5:2 e5:4 f5:4',
        'e5:3 d5:1 c5:2 a4:2 c5:2 e5:2 a5:4', 'b5:2 a5:2 g5:2 e5:2 a5:8',
        'c6:3 b5:1 a5:2 f5:2 a5:2 c6:2 f6:4', 'd6:3 c6:1 b5:2 g5:2 b5:2 d6:2 g6:4',
        'e6:2 d6:2 b5:2 g#5:2 b5:2 g#5:2 e5:2 d5:2', 'b4:2 e5:2 g#5:2 b5:2 e6:8',
      ].join(' '),
      p2: chordArps(S2C, S2), tri: chordBass(S2C, S2B, gallop), dr: section() + ' ' + section(),
    },
    stage3: {
      bpm: 176, loop: true, echo: { delay: 3, vol: 0.3 },
      p1: [
        'e5:2 g5:2 b5:2 e6:3 d6:1 b5:2 g5:2 b5:2', 'a5:2 g5:2 f#5:2 e5:2 f#5:2 g5:2 a5:2 b5:2',
        'c6:3 b5:1 a5:2 g5:2 e5:2 g5:2 c6:4', 'd6:3 c6:1 b5:2 a5:2 f#5:2 a5:2 d6:4',
        'e6:2 e6:1 e6:1 d6:2 b5:2 e6:2 g6:2 f#6:2 e6:2', 'd6:2 b5:2 g5:2 b5:2 e5:4 g5:4',
        'f#5:2 a5:2 b5:2 d#6:4 c#6:2 b5:2 a5:2', 'f#6:4 d#6:4 b5:4 f#5:4',
        'a5:3 c6:1 e6:4 d6:2 c6:2 b5:2 a5:2', 'c6:2 b5:2 a5:2 g5:2 a5:4 e5:4',
        'g5:3 b5:1 e6:4 d6:2 b5:2 a5:2 g5:2', 'f#5:2 g5:2 a5:2 b5:2 e5:8',
        'e6:2 c6:2 g5:2 c6:2 e6:2 g6:2 e6:2 c6:2', 'f#6:2 d6:2 a5:2 d6:2 f#6:2 a6:2 f#6:2 d6:2',
        'd#6:2 f#6:2 b6:4 a6:2 f#6:2 d#6:2 b5:2', 'b5:4 a5:2 g5:2 f#5:4 d#5:4',
      ].join(' '),
      p2: chordArps(S3C, S3), tri: chordBass(S3C, S3B, gallop), dr: section() + ' ' + section(),
    },
    boss: {
      bpm: 184, loop: true, echo: { delay: 2, vol: 0.28 },
      p1: [
        'd5:1 d5:1 d6:2 d5:1 d5:1 c6:2 d5:1 d5:1 a#5:2 a5:2 g#5:2', 'a5:2 f5:2 d5:2 f5:2 a5:2 d6:2 f6:4',
        'd#5:1 d#5:1 d#6:2 d#5:1 d#5:1 c#6:2 d#5:1 d#5:1 b5:2 a#5:2 a5:2', 'a#5:2 g5:2 d#5:2 g5:2 a#5:2 d#6:2 g6:4',
        'f6:2 e6:2 d6:2 a5:2 f6:2 e6:2 d6:2 a5:2', 'g6:2 f6:2 e6:2 c#6:2 a5:4 e5:4',
        'c#6:1 d6:1 e6:2 c#6:1 d6:1 e6:2 f6:2 e6:2 d6:2 c#6:2', 'e6:4 c#6:4 a5:4 e5:2 g5:2',
      ].join(' '),
      p2: [rep('d4:1 d5:1', 16), rep('d#4:1 d#5:1', 16), rep('d4:1 d5:1', 16), rep('c#4:1 c#5:1', 16)].join(' '),
      tri: [drive('d2', 'd3'), drive('d2', 'd3'), drive('d#2', 'd#3'), drive('d#2', 'd#3'), drive('d2', 'd3'), drive('d2', 'd3'), drive('c#2', 'c#3'), drive('c#2', 'c#3')].join(' '),
      dr: [ROCKX, rep('k:1 h:1 s:1 h:1 k:1 k:1 s:1 h:1 k:1 h:1 s:1 h:1 k:1 k:1 s:1 o:1', 6), FILL].join(' '),
    },
    clear: {
      bpm: 150, loop: false,
      p1: 'd5:2 f5:2 a5:2 d6:6 c6:2 a#5:2 a5:2 c#6:2 d6:8',
      p2: 'a4:2 d5:2 f5:2 a5:6 a5:2 f5:2 e5:2 e5:2 f#5:8',
      tri: 'd3:12 a2:8 d3:8',
      dr: 'k:2 s:2 k:2 s:6 k:2 k:2 k:2 s:2 c:8',
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
      return { n, len: parseInt(l || '1', 10) };
    });
  }
  const parsed = {};
  for (const k in SONGS) {
    const s = SONGS[k];
    const tracks = ['p1', 'p2', 'tri', 'dr'].map(t => ({ name: t, ev: parse(s[t]) }));
    const lens = tracks.map(t => t.ev.reduce((a, e) => a + e.len, 0));
    if (new Set(lens).size > 1) console.warn('Songlänge ungleich', k, lens);
    parsed[k] = { bpm: s.bpm, loop: s.loop, echo: s.echo, tracks, steps: lens[0] };
  }

  let song = null, songName = null, pending = null, timer = null;
  let cursors = [];

  function drum(n, t) {
    if (n === 'k' || n === 'x') {
      const o = osc('triangle'), g = ac.createGain();
      o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
      g.gain.setValueAtTime(0.85, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.16);
      noise(0.02, 0.25, 'lowpass', 2500, null, t, musicBus);
    }
    if (n === 'x' || n === 'c') noise(0.7, 0.22, 'highpass', 6000, 2500, t, musicBus);
    else if (n === 's') { noise(0.14, 0.36, 'bandpass', 1900, 900, t, musicBus); tone2('triangle', 240, 120, 0.06, 0.25, t); }
    else if (n === 'h') noise(0.03, 0.13, 'highpass', 8000, null, t, musicBus);
    else if (n === 'o') noise(0.12, 0.13, 'highpass', 7000, null, t, musicBus);
    else if (n === 't') tone2('triangle', 300, 120, 0.12, 0.45, t);
    else if (n === 'u') tone2('triangle', 200, 70, 0.15, 0.5, t);
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
    const vol = (track === 'p1' ? 0.2 : track === 'p2' ? 0.085 : 0.4) * volMul;
    const gate = Math.max(0.03, dur * (track === 'tri' ? 0.92 : 0.82));
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
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + gate + 0.02);
  }

  function playEvent(track, ev, t, stepDur) {
    if (ev.n === '-') return;
    if (track === 'dr') { drum(ev.n, t); return; }
    const f = freq(ev.n);
    if (!f) return;
    const dur = ev.len * stepDur;
    note(track, f, t, dur);
    if (track === 'p1' && song.echo) note('p1', f, t + song.echo.delay * stepDur, dur, song.echo.vol, 0.125);
  }

  function schedule() {
    if (!song || !ac) return;
    const stepDur = 60 / song.bpm / 4;
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
    if (allDone && !song.loop) stop();
  }

  function play(name) {
    if (!ac) { pending = name; return; }
    if (songName === name && song) return;
    stop();
    song = parsed[name]; songName = name;
    const t0 = ac.currentTime + 0.05;
    cursors = song.tracks.map(() => ({ i: 0, t: t0, done: false }));
    schedule();
    timer = setInterval(schedule, 40);
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null; song = null; songName = null; pending = null;
    if (musicBus && ac) { // laufende Noten weich abschneiden
      const old = musicBus;
      old.gain.setTargetAtTime(0, ac.currentTime, 0.02);
      setTimeout(() => old.disconnect(), 300);
      musicBus = ac.createGain(); musicBus.gain.value = MUSIC_VOL * musicLevel; musicBus.connect(master);
    }
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.7, ac.currentTime, 0.02);
    return muted;
  }
  function setMusicVolume(v) { if (musicBus && ac) musicBus.gain.setTargetAtTime(v * (MUSIC_VOL / 0.5) * musicLevel, ac.currentTime, 0.05); }
  function setMusicLevel(l) { musicLevel = l; if (musicBus && ac) musicBus.gain.setTargetAtTime(MUSIC_VOL * l, ac.currentTime, 0.05); }

  return { init, sfx, play, stop, toggleMute, setMusicVolume, setMusicLevel, ready, get current() { return songName; }, _songs: parsed };
})();
