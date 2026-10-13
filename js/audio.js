// Chiptune-Engine: 2x Puls, Dreieck, Rauschen. Eigene Kompositionen + SFX-Synthese.
'use strict';

const Audio8 = (() => {
  let ac = null, master, musicBus, sfxBus, noiseBuf, pulseWaves = {};
  let muted = false;
  const NOTE = { c: 0, 'c#': 1, d: 2, 'd#': 3, e: 4, f: 5, 'f#': 6, g: 7, 'g#': 8, a: 9, 'a#': 10, b: 11 };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
    musicBus = ac.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
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
    die: () => { const t = ac && ac.currentTime; if (!ac) return; ['a4', 'f4', 'd4', 'a3', 'f3', 'd3'].forEach((n, i) => tone('pulse', freq(n), freq(n) * 0.97, 0.22, 0.2, 0.5, t + i * 0.16)); },
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

  const SONGS = {
    title: {
      bpm: 100, loop: true,
      p1: 'd5:8 a4:4 f4:4 a#4:8 a4:4 g4:4 a4:6 g4:2 f4:4 e4:4 d4:12 -:4 f5:8 e5:4 d5:4 g5:8 f5:4 e5:4 f5:4 e5:4 d5:4 c#5:4 d5:12 -:4',
      p2: [arp4('d4', 'f4', 'a4', 2, 2), arp4('a#3', 'd4', 'f4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f4', 'a4', 2, 2),
        arp4('d4', 'f4', 'a4', 2, 2), arp4('g3', 'a#3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f4', 'a4', 2, 2)].join(' '),
      tri: 'd2:16 a#1:16 a1:16 d2:16 d2:16 g1:16 a1:16 d2:16',
      dr: rep('-:12 h:4', 8),
    },
    stage1: {
      bpm: 150, loop: true,
      p1: 'd5:3 a4:1 f4:2 a4:2 d5:2 e5:2 f5:4 f5:2 e5:2 d5:2 c5:2 d5:6 -:2 e5:2 c5:2 g4:2 c5:2 e5:2 g5:2 e5:2 c5:2 c#5:4 e5:4 a5:6 -:2 ' +
        'a5:2 g5:1 f5:1 e5:2 f5:2 d5:4 a4:4 a#4:2 d5:2 g5:4 f5:2 e5:1 d5:1 e5:4 f5:2 d5:2 a#4:2 d5:2 f5:2 a#5:2 a5:2 g5:2 a5:4 g5:2 f5:2 e5:4 c#5:4',
      p2: [arp4('d4', 'f4', 'a4'), arp4('a#3', 'd4', 'f4'), arp4('c4', 'e4', 'g4'), arp4('a3', 'c#4', 'e4'),
        arp4('d4', 'f4', 'a4'), arp4('g3', 'a#3', 'd4'), arp4('a#3', 'd4', 'f4'), arp4('a3', 'c#4', 'e4')].join(' '),
      tri: [oct('d2', 'd3'), oct('a#1', 'a#2'), oct('c2', 'c3'), oct('a1', 'a2'), oct('d2', 'd3'), oct('g1', 'g2'), oct('a#1', 'a#2'), oct('a1', 'a2')].join(' '),
      dr: rep('k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2', 8),
    },
    stage2: {
      bpm: 128, loop: true,
      p1: 'e5:6 c5:2 a4:4 b4:4 c5:4 a4:2 f4:2 a4:4 c5:4 d5:6 f5:2 e5:4 d5:4 b4:4 g#4:4 e4:4 -:4 ' +
        'a5:4 g5:2 e5:2 c5:4 e5:4 f5:6 e5:2 c5:4 a4:4 d5:2 e5:2 f5:2 a5:2 g5:4 f5:4 e5:4 d5:2 b4:2 g#4:8',
      p2: [arp4('a3', 'c4', 'e4', 2, 2), arp4('f3', 'a3', 'c4', 2, 2), arp4('d3', 'f3', 'a3', 2, 2), arp4('e3', 'g#3', 'b3', 2, 2),
        arp4('a3', 'c4', 'e4', 2, 2), arp4('f3', 'a3', 'c4', 2, 2), arp4('d3', 'f3', 'a3', 2, 2), arp4('e3', 'g#3', 'b3', 2, 2)].join(' '),
      tri: rep('a1:4 a1:4 a2:4 a1:4 f1:4 f1:4 f2:4 f1:4 d2:4 d2:4 d3:4 d2:4 e1:4 e1:4 e2:4 e1:4', 2),
      dr: rep('k:4 h:4 s:4 h:2 h:2', 8),
    },
    stage3: {
      bpm: 160, loop: true,
      p1: 'e5:2 g5:2 b5:4 a5:2 g5:2 f#5:4 e5:2 g5:2 c6:4 b5:2 a5:2 g5:4 f#5:2 a5:2 d6:4 c6:2 b5:2 a5:2 f#5:2 d#5:4 f#5:4 b5:8 ' +
        'b5:3 a5:1 g5:2 e5:2 g5:3 f#5:1 e5:4 c6:3 b5:1 a5:2 g5:2 e5:4 g5:4 a5:2 f#5:2 d5:2 f#5:2 a5:2 d6:2 c6:2 a5:2 b5:4 a5:2 g5:2 f#5:4 d#5:4',
      p2: [arp4('e4', 'g4', 'b4'), arp4('c4', 'e4', 'g4'), arp4('d4', 'f#4', 'a4'), arp4('b3', 'd#4', 'f#4'),
        arp4('e4', 'g4', 'b4'), arp4('c4', 'e4', 'g4'), arp4('d4', 'f#4', 'a4'), arp4('b3', 'd#4', 'f#4')].join(' '),
      tri: rep([oct('e2', 'e3'), oct('c2', 'c3'), oct('d2', 'd3'), oct('b1', 'b2')].join(' '), 2),
      dr: rep('k:2 h:1 h:1 s:2 h:2 k:1 k:1 h:2 s:2 h:2', 8),
    },
    boss: {
      bpm: 170, loop: true,
      p1: 'a5:2 a5:1 a5:1 g#5:2 a5:2 d6:4 a5:4 a#5:2 a#5:1 a#5:1 a5:2 a#5:2 d#6:4 a#5:4 a5:2 f5:2 d5:2 f5:2 a5:2 d6:2 c6:2 a5:2 g#5:4 e5:4 c#5:4 e5:4',
      p2: [rep('d4:1 a4:1', 8), rep('d#4:1 a#4:1', 8), rep('d4:1 a4:1', 8), rep('c#4:1 g#4:1', 8)].join(' '),
      tri: [rep('d2:1 d2:1 d3:1 d2:1', 4), rep('d#2:1 d#2:1 d#3:1 d#2:1', 4), rep('d2:1 d2:1 d3:1 d2:1', 4), rep('c#2:1 c#2:1 c#3:1 c#2:1', 4)].join(' '),
      dr: rep('k:1 h:1 s:1 h:1', 16),
    },
    clear: {
      bpm: 150, loop: false,
      p1: 'd5:2 f5:2 a5:2 d6:6 c6:2 a#5:2 a5:2 c#6:2 d6:8',
      p2: 'a4:2 d5:2 f5:2 a5:6 a5:2 f5:2 e5:2 e5:2 f#5:8',
      tri: 'd3:12 a2:8 d3:8',
      dr: 'k:2 s:2 k:2 s:6 k:2 k:2 k:2 s:2 k:8',
    },
    over: {
      bpm: 90, loop: false,
      p1: 'a4:4 g4:4 f4:4 e4:4 d4:12',
      p2: 'f4:4 e4:4 d4:4 c#4:4 a3:12',
      tri: 'd3:16 a2:4 d2:8',
      dr: '-:28',
    },
    ending: {
      bpm: 110, loop: true,
      p1: 'f#5:4 a5:4 d6:8 b5:4 a5:4 g5:8 e5:4 f#5:4 g5:4 a5:4 f#5:16 d6:4 c#6:4 b5:8 g5:4 a5:4 b5:8 a5:4 g5:4 f#5:4 e5:4 d5:16',
      p2: [arp4('d4', 'f#4', 'a4', 2, 2), arp4('g3', 'b3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f#4', 'a4', 2, 2),
        arp4('b3', 'd4', 'f#4', 2, 2), arp4('g3', 'b3', 'd4', 2, 2), arp4('a3', 'c#4', 'e4', 2, 2), arp4('d4', 'f#4', 'a4', 2, 2)].join(' '),
      tri: 'd2:16 g1:16 a1:16 d2:16 b1:16 g1:16 a1:16 d2:16',
      dr: rep('k:4 h:4 s:4 h:4', 8),
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
    parsed[k] = { bpm: s.bpm, loop: s.loop, tracks: ['p1', 'p2', 'tri', 'dr'].map(t => ({ name: t, ev: parse(s[t]) })) };
  }

  let song = null, songName = null, pending = null, timer = null;
  let cursors = [];

  function playNote(track, ev, t, stepDur) {
    const dur = ev.len * stepDur;
    if (ev.n === '-') return;
    if (track === 'dr') {
      if (ev.n === 'k') {
        const o = osc('triangle'), g = ac.createGain();
        o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
        g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.16);
      } else if (ev.n === 's') noise(0.13, 0.32, 'bandpass', 1800, 900, t, musicBus);
      else if (ev.n === 'h') noise(0.035, 0.14, 'highpass', 7000, null, t, musicBus);
      return;
    }
    const f = freq(ev.n);
    if (!f) return;
    const o = track === 'tri' ? osc('triangle') : osc('pulse', track === 'p1' ? 0.25 : 0.125);
    const g = ac.createGain();
    const vol = track === 'p1' ? 0.2 : track === 'p2' ? 0.09 : 0.38;
    const gate = Math.max(0.03, dur * (track === 'tri' ? 0.95 : 0.85));
    o.frequency.setValueAtTime(f, t);
    if (track === 'p1' && dur > 0.25) { // leichtes Vibrato bei langen Tönen
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 6; lg.gain.value = f * 0.008;
      lfo.connect(lg); lg.connect(o.frequency);
      lfo.start(t + 0.12); lfo.stop(t + gate + 0.05);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol * (track === 'tri' ? 1 : 0.75), t + Math.min(gate, 0.08));
    g.gain.linearRampToValueAtTime(0, t + gate);
    o.connect(g); g.connect(musicBus);
    o.start(t); o.stop(t + gate + 0.02);
  }

  function schedule() {
    if (!song || !ac) return;
    const stepDur = 60 / song.bpm / 4;
    const horizon = ac.currentTime + 0.15;
    let allDone = true;
    cursors.forEach((c, i) => {
      const tr = song.tracks[i];
      while (c.t < horizon) {
        if (c.i >= tr.ev.length) {
          if (!song.loop) { c.done = true; break; }
          c.i = 0;
        }
        const ev = tr.ev[c.i++];
        playNote(tr.name, ev, c.t, stepDur);
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
      musicBus = ac.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    }
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ac.currentTime, 0.02);
    return muted;
  }
  function setMusicVolume(v) { if (musicBus && ac) musicBus.gain.setTargetAtTime(v, ac.currentTime, 0.05); }

  return { init, sfx, play, stop, toggleMute, setMusicVolume, get current() { return songName; } };
})();
