// Sprachausgabe: Studio-Aufnahmen (ElevenLabs, Stimme „Obsidian“) für EN/FR/ES/JA/ZH über WebAudio.
// Fehlt eine Aufnahme (z. B. Deutsch), spricht die Browser-Stimme (speechSynthesis) denselben Text.
'use strict';

const Voice = (() => {
  const REC = ['en', 'fr', 'es', 'ja', 'zh'];
  const KEYS = ['title', 'intro', 'henrik', 'ragnor', 'stage1', 'stage2', 'stage3', 'boss1', 'boss2', 'boss3', 'taunt', 'clear', 'gameover', 'ending'];
  const BCP = { de: 'de-DE', en: 'en-US', fr: 'fr-FR', es: 'es-ES', ja: 'ja-JP', zh: 'zh-CN' };
  const cache = new Map(); // 'lang/key' → Promise<AudioBuffer|null>
  let src = null, token = 0, busyUntil = 0, tts = false, queue = [];

  function load(lang, key) {
    const id = lang + '/' + key;
    if (cache.has(id)) return cache.get(id);
    const ac = Audio8.context();
    if (!ac) return Promise.resolve(null);
    const p = fetch(`voice/${id}.mp3?v=${window.BUILD || 1}`)
      .then(r => (r.ok ? r.arrayBuffer() : null))
      .then(b => (b ? new Promise(res => ac.decodeAudioData(b, res, () => res(null))) : null))
      .catch(() => null);
    cache.set(id, p);
    return p;
  }
  function preload() {
    const l = Options.lang;
    if (REC.includes(l) && Audio8.context()) KEYS.forEach(k => load(l, k));
  }
  function stop() {
    token++; queue = [];
    if (src) { try { src.stop(); } catch (e) { /* schon zu Ende */ } src = null; }
    if (tts && window.speechSynthesis) window.speechSynthesis.cancel();
    tts = false; busyUntil = 0;
    Audio8.duck(false);
  }
  const busy = () => tts || performance.now() < busyUntil;

  // say('boss1') oder say(['intro', 'henrik']) – eine Liste wird nacheinander gesprochen
  function say(keys) {
    if (!Options.voice || !Audio8.ready() || Audio8.muted) return;
    stop();
    queue = (Array.isArray(keys) ? keys : [keys]).slice();
    next(token);
  }
  function next(my) {
    if (my !== token) return;
    const key = queue.shift();
    if (!key) { busyUntil = 0; Audio8.duck(false); return; }
    const lang = Options.lang;
    busyUntil = performance.now() + 4000; // Ladezeit überbrücken
    if (!REC.includes(lang) || !KEYS.includes(key)) { speak(key, lang, my); return; } // ohne Studioaufnahme: Browser-Stimme
    load(lang, key).then(buf => {
      if (my !== token) return;
      if (!buf) { speak(key, lang, my); return; }
      const ac = Audio8.context();
      src = ac.createBufferSource(); src.buffer = buf; src.connect(Audio8.voiceOut());
      Audio8.duck(true);
      src.onended = () => { if (my === token) { src = null; next(my); } };
      src.start();
      busyUntil = performance.now() + buf.duration * 1000 + 150;
    });
  }
  function speak(key, lang, my) {
    const ss = window.speechSynthesis;
    if (!ss || !window.SpeechSynthesisUtterance) { busyUntil = 0; next(my); return; }
    const u = new SpeechSynthesisUtterance(I18N.t('v.' + key));
    const dark = key === 'taunt' || key.startsWith('boss');
    u.lang = BCP[lang]; u.rate = dark ? 0.85 : 0.92; u.pitch = dark ? 0.4 : 0.65;
    const vs = ss.getVoices().filter(v => v.lang && v.lang.replace('_', '-').toLowerCase().startsWith(lang));
    const nat = vs.filter(v => /natural|online|neural/i.test(v.name));
    u.voice = nat.find(v => /conrad|killian|guy|christopher|eric|henri|alvaro|keita|yunxi|yunjian|male/i.test(v.name)) || nat[0] || vs[0] || null;
    tts = true; Audio8.duck(true);
    u.onend = u.onerror = () => { if (my !== token) return; tts = false; next(my); };
    ss.speak(u);
  }
  return { say, stop, busy, preload, REC };
})();
