// Spielzustände, HUD, Bildschirme, Hauptschleife. Alle Layouts richten sich nach View.w.
'use strict';

const LOGO = ['#fcbca0', '#fc7460', '#e83c20', '#d82800', '#a80020', '#880c00', '#580008'];
const OPTION_ITEMS = [ // label/hint sind Schlüssel für tr()
  { key: 'easy', label: 'optEasy', hint: 'optEasyH' },
  { key: 'maxWhip', label: 'optWhip', hint: 'optWhipH' },
  { key: 'infHearts', label: 'optHearts', hint: 'optHeartsH' },
  { key: 'music', label: 'optMusic', hint: 'optMusicH' },
  { key: 'voice', label: 'optVoice', hint: 'optVoiceH' },
  { key: 'lang', label: 'optLang', hint: 'optLangH' },
  { key: 'crt', label: 'optCrt', hint: 'optCrtH' },
  { key: 'fullscreen', label: 'optFull', hint: 'optFullH' },
  { key: 'back', label: 'optBack', hint: '' },
];
const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

const Game = {
  state: 'title', t: 0, hi: 0, sel: 0, tallyPhase: 0, bossName: 0, crt: true, pendingView: null,
  canvas: null, ctx: null, bigCanvas: null,

  init() {
    this.canvas = document.getElementById('screen');
    this.ctx = this.canvas.getContext('2d');
    this.bigCanvas = Sprites.canvas(640, 14);
    try { this.hi = parseInt(localStorage.getItem('nachtmahr.hi') || '0', 10) || 0; } catch (e) { this.hi = 0; }
    this.setCrt(Options.crt);
    this.menu = 0; this.optSel = 0; this.tStorm = { cd: 90, flash: 0, bolt: null };
    W.player = new Player();
    Input.onAny(() => { Audio8.init(); Audio8.setMusicLevel(Options.music / 8); Voice.preload(); });
    this.applyLang();
    // Chrome meldet neue Maße teils erst nach Leisten-/Drehanimationen → mehrfach nachmessen
    const settle = () => { View.trim = 0; this.resize(); [80, 250, 600, 1200].forEach(ms => setTimeout(() => this.resize(), ms)); };
    window.addEventListener('resize', settle);
    window.addEventListener('orientationchange', settle);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', settle);
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.fsActive) this.fsDismissed = true; // selbst verlassen → nicht zurückzwingen
      this.fsActive = !!document.fullscreenElement;
      settle();
    });
    document.addEventListener('pointerdown', (e) => { if (this.state === 'pause' && e.pointerType !== 'mouse') this.unpause = true; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play' && W.player.alive) { this.go('pause'); Audio8.setMusicVolume(0.12); }
    });
    this.resize();
    const q = new URLSearchParams(location.search);
    this.debugStage = q.has('stage') ? clamp(parseInt(q.get('stage'), 10) - 1, 0, 2) : null;
    this.debugRoom = q.has('room') ? Math.max(0, parseInt(q.get('room'), 10) - 1) : 0;
    this.toTitle();
    let acc = 0, last = performance.now();
    const loop = (now) => {
      acc += Math.min(100, now - last); last = now;
      let n = 0;
      while (acc >= 1000 / 60 && n < 4) { this.step(); acc -= 1000 / 60; n++; }
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  resize() {
    const fit = View.fit();
    // Bildschirmgröße sofort übernehmen; nur die interne Breite wartet während eines Bosskampfs
    this.canvas.style.width = fit.cssW + 'px';
    this.canvas.style.height = fit.cssH + 'px';
    if (W.camLock && fit.w !== View.w) this.pendingView = fit; else this.applyView(fit);
    requestAnimationFrame(() => { // Sicherheitsnetz: tatsächlich abgeschnitten? → um den Überhang verkleinern
      const over = View.overflow(this.canvas);
      if (over > 0 && View.trim < 400) { View.trim += over; this.resize(); }
    });
  },
  applyView(fit) {
    View.w = fit.w; View.scale = fit.scale;
    if (this.canvas.width !== View.w) this.canvas.width = View.w;
    this.ctx.imageSmoothingEnabled = false;
    this.canvas.style.width = fit.cssW + 'px';
    this.canvas.style.height = fit.cssH + 'px';
    const crt = document.getElementById('crt');
    if (crt) { crt.style.setProperty('--s', fit.scale + 'px'); crt.style.setProperty('--a', (fit.scale * 0.55) + 'px'); }
    if (W.room) W.snapCam();
    this.pendingView = null;
  },

  // Vollbild: Browser erlauben es nur nach einer Nutzeraktion → beim ersten Tastendruck/Klick/Touch
  autoFullscreen() {
    if (!Options.fullscreen || this.fsDismissed || document.fullscreenElement) return;
    this.enterFullscreen();
  },
  enterFullscreen() {
    const el = document.documentElement;
    if (!el.requestFullscreen) return;
    el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
      this.fsActive = true;
      try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* nicht unterstützt */ }
    }).catch(() => {});
  },
  toggleFullscreen() {
    if (document.fullscreenElement) { this.fsDismissed = true; Options.set('fullscreen', false); document.exitFullscreen().catch(() => {}); }
    else { this.fsDismissed = false; Options.set('fullscreen', true); this.enterFullscreen(); }
  },

  applyLang() {
    Font.setCJK(Options.lang);
    document.documentElement.lang = Options.lang;
    const h = document.getElementById('stickHint');
    if (h) h.textContent = tr('stickHint');
  },

  setCrt(on) {
    this.crt = on;
    const el = document.getElementById('crt');
    if (el) el.classList.toggle('off', !on);
    this.canvas.classList.toggle('crt', on);
    Options.set('crt', on);
  },
  toggleCrt() { this.setCrt(!this.crt); },

  saveHi() {
    if (W.score > this.hi) {
      this.hi = W.score;
      try { localStorage.setItem('nachtmahr.hi', String(this.hi)); } catch (e) { /* privat */ }
    }
  },

  go(state) { this.state = state; this.t = 0; },
  toTitle() { this.saveHi(); this.go('title'); Audio8.play('title'); Audio8.ambience(true); this.revealed = false; Voice.stop(); },

  newGame(stage = 0, room = 0) {
    W.score = 0; W.lives = 3; W.nextLife = 20000;
    W.player = new Player();
    this.startStage(stage, room);
  },

  startStage(s, room = 0) {
    W.stage = s; W.time = Levels.STAGES[s].time; W.timeSub = 0; W.checkpoint = null;
    if (this.pendingView) this.applyView(this.pendingView);
    W.loadRoom(s, Math.min(room, Levels.STAGES[s].rooms.length - 1));
    Audio8.stop();
    this.go('card');
    Voice.say('stage' + (s + 1));
  },

  nextRoom() {
    if (this.state !== 'play') return;
    Audio8.sfx('door');
    this.go('fade');
  },

  onPlayerDeath() {
    W.lives--;
    if (W.lives < 0) { this.saveHi(); this.sel = 0; this.go('gameover'); Audio8.play('over'); Voice.say('gameover'); return; }
    const p = W.player;
    p.hp = p.maxHp; p.hearts = Options.infHearts ? 99 : Math.max(5, p.hearts); p.whip = Options.maxWhip ? 3 : Math.max(1, p.whip - 1);
    this.go('respawn');
  },

  startClear() { this.go('clear'); this.tallyPhase = 0; Audio8.play('clear'); Voice.say('clear'); },

  // ---------------- Update ----------------
  step() {
    Input.update();
    const P = Input.pressed;
    this.t++;
    if (this.state === 'title' && !this.revealed && (this.t >= 60 || P.start || P.jump || P.attack)) { // Blitz + Logo-Einschlag
      this.revealed = true; this.revealT = 0; if (this.t < 60) Input.clear();
      this.tStorm.cd = 1; Audio8.sfx('boom'); Audio8.sfx('bell'); Input.rumble(0.9, 0.6, 700);
      setTimeout(() => { if (this.state === 'title') Voice.say('title'); }, 700);
      this.t = Math.max(this.t, 60);
      return;
    }
    if (this.revealed && this.revealT !== undefined) this.revealT++;
    if (this.state === 'title' && this.revealed && this.t % 520 === 0) Audio8.sfx('bell');
    const titleish = this.state === 'title' || this.state === 'options' || this.state === 'charsel' || this.state === 'intro';
    Audio8.ambience(titleish || ((this.state === 'play' || this.state === 'pause') && W.room && W.room.theme === 'courtyard'));
    if (this.state === 'title' || this.state === 'options' || this.state === 'charsel' || this.state === 'intro') {
      FX.updateStorm(this.tStorm, View.w, () => { if (Audio8.ready()) setTimeout(() => Audio8.sfx('thunder'), 250 + Math.random() * 600); });
    }
    switch (this.state) {
      case 'title':
        if (P.up || P.down) { this.menu = 1 - this.menu; Audio8.sfx('select'); }
        if (P.start || P.jump || P.attack) {
          Audio8.init(); Audio8.sfx('select');
          if (this.menu === 1) { this.go('options'); this.optSel = 0; break; }
          this.go('charsel');
        }
        break;
      case 'options': this.updateOptions(P); break;
      case 'charsel': {
        if (P.left || P.right) {
          const ids = HEROES.list.map(d => d.id), i = ids.indexOf(Options.character);
          Options.set('character', ids[(i + (P.right ? 1 : ids.length - 1)) % ids.length]); Audio8.sfx('select');
        }
        if ((P.start || P.jump || P.attack) && this.t > 10) {
          Audio8.sfx('bigItem');
          if (this.debugStage !== null) this.newGame(this.debugStage, this.debugRoom); else { this.go('intro'); Audio8.stop(); Voice.say(['intro', Options.character]); }
        }
        break;
      }
      case 'intro':
        if ((P.start || P.attack || P.jump) && this.t > 20) { Voice.stop(); this.newGame(0); }
        else if ((this.t > 60 * 9 && !Voice.busy()) || this.t > 60 * 24) this.newGame(0); // Erzähler ausreden lassen
        break;
      case 'card':
        if ((this.t > 90 && !Voice.busy()) || this.t > 240 || ((P.start || P.jump || P.attack) && this.t > 12)) { this.go('play'); Audio8.play(W.stageDef.music); Audio8.tempo(1); this.bossName = 0; this.hurryT = 0; }
        break;
      case 'play': this.updatePlay(P); break;
      case 'pause':
        if (P.start || this.unpause) {
          this.unpause = false; this.go('play'); Audio8.setMusicVolume(0.5); Audio8.sfx('pause'); }
        break;
      case 'fade':
        if (this.t === 18) { if (this.pendingView) this.applyView(this.pendingView); W.loadRoom(W.stage, W.roomIdx + 1); }
        if (this.t > 30) this.state = 'play';
        break;
      case 'respawn':
        if (this.t === 30) {
          if (this.pendingView) this.applyView(this.pendingView);
          W.loadRoom(W.stage, W.roomIdx); W.applyCheckpoint(); W.time = W.stageDef.time;
        }
        if (this.t > 44) { this.go('play'); Audio8.play(W.stageDef.music); Audio8.tempo(1); this.hurryT = 0; }
        break;
      case 'clear': this.updateClear(); break;
      case 'gameover': { // Arcade: CONTINUE? 9 … 0 – Taste drücken = sofort weiter in derselben Stage
        const left = 9 - Math.floor(this.t / 60);
        if (left >= 0 && this.t % 60 === 0) Audio8.sfx('tick');
        if (left >= 0 && (P.start || P.jump || P.attack) && this.t > 30) {
          Audio8.sfx('bigItem'); W.score = 0; W.lives = 3; W.nextLife = 20000; W.player = new Player(); this.startStage(W.stage);
        } else if (left < 0 && (this.t > 60 * 10 + 120 || ((P.start || P.jump) && this.t > 60 * 10 + 20))) this.toTitle();
        break;
      }
      case 'ending':
        if (this.t % 50 === 0 && this.t < 330) { Audio8.sfx('wall'); Input.rumble(0.3, 0.5, 200); }
        if (this.t === 380) Voice.say('ending');
        if (this.t > 60 * 30 && (P.start || P.jump || P.attack)) this.toTitle();
        break;
    }
  },

  updateOptions(P) {
    const n = OPTION_ITEMS.length;
    if (P.up) { this.optSel = (this.optSel + n - 1) % n; Audio8.sfx('select'); }
    if (P.down) { this.optSel = (this.optSel + 1) % n; Audio8.sfx('select'); }
    const it = OPTION_ITEMS[this.optSel];
    const left = P.left, right = P.right || P.jump || P.attack;
    if (P.start || (it.key === 'back' && (P.jump || P.attack))) { this.go('title'); Audio8.sfx('pause'); return; }
    if (!(left || right)) return;
    if (it.key === 'music') {
      Options.set('music', clamp(Options.music + (left ? -1 : 1), 0, 10));
      Audio8.setMusicLevel(Options.music / 8);
    } else if (it.key === 'lang') {
      const L = I18N.LANGS, i = L.indexOf(Options.lang);
      Options.set('lang', L[(i + (left ? L.length - 1 : 1)) % L.length]);
      this.applyLang(); Voice.stop(); Voice.preload(); Voice.say('title'); // Hörprobe
    } else if (it.key === 'voice') {
      Options.toggle('voice');
      if (Options.voice) Voice.say('title'); else Voice.stop();
    } else if (it.key === 'crt') this.toggleCrt();
    else if (it.key === 'fullscreen') this.toggleFullscreen();
    else if (it.key !== 'back') Options.toggle(it.key);
    Audio8.sfx('item');
  },

  updatePlay(P) {
    if (P.start && W.player.alive) { this.go('pause'); Audio8.setMusicVolume(0.12); Audio8.sfx('pause'); return; }
    if (W.slowmo > 0) { W.slowmo--; if (this.t % 3) return; } // Zeitlupe
    W.update();
    if (this.hurryT > 0) this.hurryT--;
    if (W.boss && this.bossName < 150) { if (this.bossName === 0) Voice.say('boss' + (W.stage + 1)); this.bossName++; }
    const p = W.player;
    if (p.alive && p.hp <= p.maxHp / 4 && this.t % 50 === 0) Audio8.sfx('beat');
    if (p.alive && !W.cleared && W.freeze === 0 && ++W.timeSub >= 40) {
      W.timeSub = 0; W.time--;
      if (W.time <= 30 && W.time > 0) Audio8.sfx('tick');
      if (W.time === 60) { this.hurryT = 150; Audio8.tempo(1.12); Audio8.sfx('bell'); } // Zeit wird knapp: Musik zieht an
      if (W.time <= 0) { W.time = 0; p.die(); }
    }
  },

  updateClear() {
    W.update();
    if (this.tallyPhase === 0 && this.t > 80) this.tallyPhase = 1;
    if (this.tallyPhase === 1) {
      if (W.time > 0) {
        const n = Math.min(9, W.time); W.time -= n; W.addScore(n * 10);
        if (this.t % 3 === 0) Audio8.sfx('tick');
      } else { this.tallyPhase = 2; this.t2 = this.t; W.addScore(W.player.hearts * 100); Audio8.sfx('money'); }
    }
    if (this.tallyPhase === 2 && this.t - this.t2 > 70) {
      if (W.stage + 1 < Levels.STAGES.length) { W.player.hp = W.player.maxHp; this.startStage(W.stage + 1); }
      else { this.saveHi(); this.go('ending'); Audio8.play('ending'); this.rubble = []; }
    }
  },

  // ---------------- Render ----------------
  render() {
    const ctx = this.ctx, w = View.w;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, 240);
    switch (this.state) {
      case 'title': this.drawTitle(ctx); break;
      case 'options': this.drawOptions(ctx); break;
      case 'charsel': this.drawCharSel(ctx); break;
      case 'intro': this.drawIntro(ctx); break;
      case 'card': this.drawHud(ctx); this.drawCard(ctx); break;
      case 'gameover': this.drawGameOver(ctx); break;
      case 'ending': this.drawEnding(ctx); break;
      default:
        W.draw(ctx);
        Mode7.wave(ctx, 32, 208, View.w, W.waveAmp(), W.frame);
        if (W.cinema > 0) this.drawCinema(ctx);
        this.drawCombo(ctx);
        this.drawHud(ctx);
        if (this.state === 'pause') this.panel(ctx, tr('pause'), tr(Input.device === 'pad' ? 'pausePad' : Input.device === 'touch' ? 'pauseTouch' : 'pauseKey'));
        if (this.state === 'fade') this.mosaicFade(ctx, this.t < 18 ? this.t / 16 : 1 - (this.t - 18) / 12);
        if (this.state === 'respawn') this.mosaicFade(ctx, this.t < 30 ? this.t / 28 : 1 - (this.t - 30) / 14);
        if (this.hurryT > 0 && this.state === 'play') this.drawHurry(ctx);
        if (this.state === 'play' && W.boss && this.bossName > 0 && this.bossName < 150) this.drawBossBanner(ctx);
        if (this.state === 'clear') this.drawClear(ctx);
    }
    this.drawToast(ctx);
  },

  // SNES-Mosaik + Abdunkeln für Raumwechsel
  mosaicFade(ctx, a) {
    a = clamp(a, 0, 1);
    if (a <= 0) return;
    Mode7.mosaic(ctx, 32, 208, View.w, 1 + Math.floor(a * 10));
    ctx.fillStyle = `rgba(0,0,0,${a * 0.85})`; ctx.fillRect(0, 32, View.w, 208);
  },

  // Kino-Balken beim Boss-Auftritt
  drawCinema(ctx) {
    const c = W.cinema, h = Math.round(Math.min(24, (110 - c) * 1.6, c * 1.6));
    ctx.fillStyle = '#000'; ctx.fillRect(0, 32, View.w, h); ctx.fillRect(0, 240 - h, View.w, h);
    ctx.fillStyle = '#a80020'; ctx.fillRect(0, 32 + h, View.w, 1); ctx.fillRect(0, 239 - h, View.w, 1);
  },

  drawCombo(ctx) {
    const c = W.combo;
    if (c.n < 3) return;
    ctx.globalAlpha = c.t < 30 ? c.t / 30 : 1;
    const s = c.pop > 0 ? 3 : 2, mul = W.comboMul();
    this.big(ctx, c.n + ' COMBO', 8 + Font.width(c.n + ' COMBO') * s / 2, 38 - (s - 2) * 2, s, ['#fcfcfc', '#fce0a8', '#f8b800', '#f8b800', '#f87800', '#d82800', '#881400'], null, '#000');
    if (mul > 1) Font.draw(ctx, tr('scoreX', mul), 10, 58, '#fce0a8', { shadow: '#000' });
    ctx.globalAlpha = 1;
  },

  // Pixel-Dissolve: 8x8-Blöcke in Bayer-Reihenfolge
  dissolve(ctx, a) {
    a = clamp(a, 0, 1);
    if (a <= 0) return;
    ctx.fillStyle = '#000';
    for (let by = 0; by < 26; by++) for (let bx = 0; bx < Math.ceil(View.w / 8); bx++) {
      if (a * 16 > BAY4[(by & 3) * 4 + (bx & 3)] + ((bx + by) % 3) * 0.3) ctx.fillRect(bx * 8, 32 + by * 8, 8, 8);
    }
  },

  panel(ctx, title, sub) {
    const cx = View.cx;
    const pw = Math.max(128, Font.width(sub) + 16);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - pw / 2, 110, pw, 40);
    ctx.strokeStyle = '#c89020'; ctx.strokeRect(cx - pw / 2 + 0.5, 110.5, pw - 1, 39);
    Font.draw(ctx, title, cx, 118, '#fcfcfc', { align: 'center' });
    if ((this.t >> 5) % 2 === 0) Font.draw(ctx, sub, cx, 134, '#bcbcbc', { align: 'center' });
    if (!Audio8.ready()) Font.draw(ctx, tr('soundShort'), cx, 156, '#7c7c7c', { align: 'center' });
  },

  drawToast(ctx) {
    const t = Input.toast;
    if (!t) return;
    const w = Font.width(t.text) + 16, x = Math.round(View.cx - w / 2), y = 36;
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(x, y, w, 13);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + 12, w, 1);
    Font.draw(ctx, t.text, View.cx, y + 3, '#a4e4fc', { align: 'center' });
  },

  // Großschrift mit Zeilen-Farbverlauf, optionaler Kontur und Schatten
  big(ctx, text, cx, y, scale, colors, shadow, outline) {
    const b = this.bigCanvas, bx = b.getContext('2d');
    const fbk = Font.hasFB(text), top = fbk ? 3 : 0, H = fbk ? 12 : 7; // CJK-Glyphen sind höher
    const w = Math.min(b.width, Font.width(text) + 1), dx = Math.round(cx - (w * scale) / 2), dy = y - top * scale;
    const paintRows = (cols) => {
      bx.clearRect(0, 0, b.width, b.height);
      for (let r = 0; r < H; r++) {
        bx.save(); bx.beginPath(); bx.rect(0, r, b.width, 1); bx.clip();
        Font.draw(bx, text, 0, top, Array.isArray(cols) ? cols[Math.min(6, Math.floor(r * 7 / H))] : cols);
        bx.restore();
      }
    };
    ctx.imageSmoothingEnabled = false;
    if (outline) {
      paintRows(outline);
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([ox, oy]) => ctx.drawImage(b, 0, 0, w, H, dx + ox, dy + oy, w * scale, H * scale));
    }
    if (shadow) { paintRows(shadow); ctx.drawImage(b, 0, 0, w, H, dx + scale, dy + scale, w * scale, H * scale); }
    paintRows(colors);
    ctx.drawImage(b, 0, 0, w, H, dx, dy, w * scale, H * scale);
    return { x: dx, w: w * scale };
  },

  drawHud(ctx) {
    const Wd = View.w;
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    ['#120a1c', '#0e0716', '#0a0512', '#07030c'].forEach((c, i) => R(c, 0, i * 8, Wd, 8));
    R('#2c1808', 0, 29, Wd, 1); R('#c89020', 0, 30, Wd, 1); R('#3c2008', 0, 31, Wd, 1);
    for (let i = 4; i < Wd; i += 32) { R('#c89020', i, 28, 3, 1); R('#fce0a8', i + 1, 28, 1, 1); }
    const p = W.player, pad = (n, l) => String(Math.max(0, n)).padStart(l, '0');
    const label = '#b0a080', val = '#fcfcfc';
    const right = Wd - 98, boxCx = Math.round((116 + right) / 2);
    Font.draw(ctx, tr('hudScore'), 36, 3, label, { align: 'right' }); Font.draw(ctx, pad(W.score, 6), 40, 3, val, { shadow: '#000' });
    if (Options.easy) Font.draw(ctx, tr('tagEasy'), 82, 3, '#58f898');
    Font.draw(ctx, tr('hudTime'), boxCx - 13, 3, label, { align: 'right' });
    Font.draw(ctx, pad(W.time, 4), boxCx - 9, 3, W.time <= 30 && (W.frame & 16) ? '#fc7460' : val, { shadow: '#000' });
    Font.draw(ctx, tr('hudStage'), Wd - 35, 3, label, { align: 'right' });
    Font.draw(ctx, pad(W.stage + 1, 1) + '-' + (W.roomIdx + 1), Wd - 30, 3, val, { shadow: '#000' });
    Font.draw(ctx, tr('hudPlayer'), 6, 13, label);
    Font.draw(ctx, tr('hudEnemy'), 6, 22, label);
    const bar = (y, v, cols) => {
      R('#000', 51, y - 1, 65, 8);
      for (let i = 0; i < 16; i++) {
        const c = i < v ? cols : ['#2c1010', '#1c0808', '#120404'];
        R(c[1], 52 + i * 4, y, 3, 6); R(c[0], 52 + i * 4, y, 3, 1); R(c[2], 52 + i * 4, y + 5, 3, 1);
      }
    };
    bar(13, Math.ceil(p.hp / p.maxHp * 16), p.hp <= p.maxHp / 4 && (W.frame & 16) ? ['#fcfcfc', '#fc7460', '#a80020'] : ['#fcbca0', '#e83c20', '#880c00']);
    let bv = 16;
    if (W.boss) bv = Math.ceil((W.boss.hp / W.boss.maxHp) * 16);
    else if (W.arenaOn) bv = 0;
    bar(22, bv, ['#fce0a8', '#f8b800', '#9c6400']);
    const bx = boxCx - 16;
    R('#c89020', bx, 10, 33, 21); R('#3c0810', bx + 1, 11, 31, 19); R('#120610', bx + 2, 12, 29, 17);
    if (p.chargeT > 0) { R(p.chargeT >= 50 && (W.frame & 4) ? '#fcfcfc' : '#f8b800', bx + 2, 28, Math.min(29, Math.round(p.chargeT / 50 * 29)), 2); }
    if (p.sub) {
      const s = ITEM_SPR[p.sub]();
      Sprites.draw(ctx, s, boxCx - Math.floor(s.w / 2), 21 - Math.floor(s.h / 2));
    }
    Sprites.draw(ctx, Sprites.S.heartS, right + 1, 12);
    Font.draw(ctx, pad(p.hearts, 2), right + 11, 13, p.hearts >= 10 && p.sub ? '#f8b800' : val, { shadow: '#000' });
    const hd = p.def;
    hd.icon.forEach((row, y) => [...row].forEach((ch, x) => { if (hd.iconPal[ch]) R(hd.iconPal[ch], right + 1 + x, 22 + y, 1, 1); }));
    Font.draw(ctx, pad(W.lives, 2), right + 11, 22, val, { shadow: '#000' });
    Font.draw(ctx, tr(p.sword ? 'hudSword' : 'hudWhip'), Wd - 60, 13, label);
    for (let i = 0; i < 3; i++) {
      const on = i < p.whip, x = Wd - 54 + i * 12, y = 22;
      R(on ? '#9c6400' : '#2c2c2c', x + 1, y, 5, 7); R(on ? '#f8b800' : '#4c4c4c', x, y + 1, 7, 5);
      R(on ? '#fce0a8' : '#5c5c5c', x + 2, y + 2, 2, 2);
    }
  },

  drawBossBanner(ctx) {
    const t = this.bossName, cx = View.cx;
    const slide = t < 20 ? (20 - t) * 12 : t > 130 ? (t - 130) * -12 : 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 40, View.w, 22);
    ctx.fillStyle = '#c89020'; ctx.fillRect(0, 40, View.w, 1); ctx.fillRect(0, 61, View.w, 1);
    this.big(ctx, tr('boss' + (W.stage + 1)), cx + slide, 44, 2, ['#fce0a8', '#fce0a8', '#f8b800', '#f8b800', '#c89020', '#9c6400', '#6c4000'], null, '#000');
  },

  drawCard(ctx) {
    const cx = View.cx;
    Mode7.drawMap(ctx, View.w, this.t, W.stage); // Mode-7-Weltkarte im Hintergrund
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 78, View.w, 124);
    ctx.fillStyle = '#c89020'; ctx.fillRect(0, 78, View.w, 1); ctx.fillRect(0, 201, View.w, 1);
    const st = W.stageDef;
    Font.draw(ctx, tr('stageNo', W.stage + 1), cx, 86, '#b0a080', { align: 'center' });
    const nm = tr('stage' + (W.stage + 1));
    this.big(ctx, nm, cx, 102, Font.width(nm) * 3 > View.w - 16 ? 2 : 3, LOGO, '#300000', '#000');
    const n = Levels.STAGES.length;
    for (let i = 0; i < n; i++) {
      const x = cx - 56 + i * 48;
      ctx.fillStyle = i < W.stage ? '#7c7c7c' : i === W.stage ? ((this.t >> 3) & 1 ? '#d82800' : '#f8b800') : '#3c3c3c';
      ctx.fillRect(x, 150, 8, 8);
      if (i < n - 1) { ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x + 12, 153, 32, 2); }
    }
    Font.draw(ctx, tr('lives', Math.max(0, W.lives)), cx, 176, '#bcbcbc', { align: 'center' });
    Font.draw(ctx, tr('bossIs', tr('boss' + (W.stage + 1))), cx, 190, '#7c7c7c', { align: 'center' });
  },

  drawClear(ctx) {
    if (this.tallyPhase === 0) return;
    const cx = View.cx;
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 80, 70, 160, 64);
    ctx.strokeStyle = '#f8b800'; ctx.strokeRect(cx - 79.5, 70.5, 159, 63);
    Font.draw(ctx, tr('clear'), cx, 80, '#f8b800', { align: 'center' });
    Font.draw(ctx, tr('timeBonus'), cx - 68, 98); Font.draw(ctx, String(W.time * 10), cx + 68, 98, '#fcfcfc', { align: 'right' });
    if (this.tallyPhase === 2) {
      Font.draw(ctx, tr('heartBonus'), cx - 68, 112); Font.draw(ctx, String(W.player.hearts * 100), cx + 68, 112, '#fcfcfc', { align: 'right' });
    }
  },

  drawSkyScene(ctx, shake = 0, sink = 0) {
    const L = (n) => Tiles.layer('courtyard', n), cam0 = { x: 0, y: 0 };
    ctx.save(); ctx.translate(0, 32);
    Tiles.drawLayer(ctx, L('sky'), cam0, this.t);
    Tiles.drawLayer(ctx, L('moon'), cam0, this.t);
    Tiles.drawLayer(ctx, L('storm'), cam0, this.t);
    Tiles.drawLayer(ctx, L('clouds'), cam0, this.t);
    FX.drawStormSky(ctx, this.tStorm, View.w);
    Tiles.drawLayer(ctx, L('mountains'), { x: 1500, y: 0 }, this.t);
    ctx.drawImage(L('castle').c, Math.round(View.w * 0.5 - 408) + (shake ? Math.round(rnd(-2, 2)) : 0), sink);
    FX.drawFog(ctx, 'courtyard', cam0, this.t);
    ctx.fillStyle = 'rgba(180,180,240,0.5)'; // Regen
    for (let i = 0; i < Math.round(40 * View.w / 256); i++) {
      const x = ((i * 97 + this.t * 4) % (View.w + 80)) - 40, y = ((i * 53 + this.t * 10) % 230) - 20;
      for (let k = 0; k < 6; k++) ctx.fillRect(Math.round(x - k * 0.5), y + k, 1, 1);
    }
    if (FX.stormOn(this.tStorm)) { ctx.fillStyle = 'rgba(220,214,255,0.12)'; ctx.fillRect(0, 0, View.w, 176); }
    ctx.restore();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, View.w, 32); ctx.fillRect(0, 208, View.w, 32);
  },

  drawHeroOnRock(ctx, x, y) {
    ctx.fillStyle = '#0a0410';
    for (let i = 0; i < 70; i++) ctx.fillRect(x - 30 + i, y + 32 - Math.round(Math.sin(i / 70 * Math.PI) * 10), 1, 30);
    for (let i = 0; i < 8; i++) {
      const sx = x + 3 - i * 2, sy = y + 1 + Math.round(Math.sin(this.t * 0.2 + i * 0.9) * (0.5 + i * 0.3));
      const scf = HEROES.get(Options.character).def.scarf;
      ctx.fillStyle = i % 3 === 0 ? scf.b : scf.a; ctx.fillRect(sx, sy, i > 5 ? 1 : scf.w, i > 5 ? 1 : scf.w);
    }
    const H = HEROES.get(Options.character), sc = H.def.scarf;
    Sprites.draw(ctx, H.idle[Math.floor(this.t / 40) % 2], x - H.stand.mx, y + 32 - H.stand.h);
  },

  controlLines() { return tr(Input.device === 'pad' || Input.padName ? 'pad' : 'keys'); },

  drawTitle(ctx) {
    const cx = View.cx;
    this.drawSkyScene(ctx);
    if (!this.revealed) { // Dunkelheit vor dem ersten Blitz
      ctx.fillStyle = `rgba(0,0,0,${0.85 - this.t / 200})`; ctx.fillRect(0, 32, View.w, 176);
      if ((this.t >> 4) % 2) Font.draw(ctx, '...', cx, 120, '#4c4c5c', { align: 'center' });
      return;
    }
    // Riesenfledermaus-Silhouette vor dem Mond
    const bt = this.t % 900;
    if (bt < 260) {
      const s = Sprites.S.gbatX.flap[Math.floor(this.t / 6) % 4], bx = View.w + 40 - bt * (View.w + 120) / 260, by = 48 + Math.sin(bt / 30) * 10;
      ctx.save(); ctx.filter = 'brightness(0)'; ctx.globalAlpha = 0.85; Sprites.draw(ctx, s, bx, by); ctx.restore();
    }
    if (this.t % 600 > 590) { ctx.fillStyle = 'rgba(164,164,252,0.3)'; ctx.fillRect(0, 32, View.w, 176); }
    const fb = Sprites.S.bat.fly;
    for (let i = 0; i < 3; i++) {
      const bx = ((this.t * (0.6 + i * 0.25) + i * 120) % (View.w + 64)) - 32, by = 60 + i * 22 + Math.sin(this.t / 15 + i) * 6;
      Sprites.draw(ctx, fb[(this.t >> 3) % 2], bx, by);
    }
    if (View.w >= 320) this.drawHeroOnRock(ctx, 30, 150);
    const rv = this.revealT || 0, slam = rv < 16 ? Math.round((16 - rv) / 3) : 0; // Logo-Einschlag
    const lw = (Font.width('NACHTMAHR') + 1) * 4;
    Mode7.drawFire(ctx, cx - lw / 2 - 16, 6, lw + 32, 60, rv < 30 ? 1.3 : 0.9);
    if (rv < 20) { ctx.save(); ctx.translate(Math.round((Math.random() - 0.5) * slam * 3), Math.round((Math.random() - 0.5) * slam * 2)); }
    const r = this.big(ctx, 'NACHTMAHR', cx, 30 - slam * 2, 4 + Math.min(2, slam > 3 ? 1 : 0), LOGO, '#200000', '#000');
    if (rv < 20) ctx.restore();
    if (rv < 8) { ctx.fillStyle = `rgba(255,240,220,${0.6 - rv * 0.07})`; ctx.fillRect(0, 32, View.w, 176); }
    for (let i = 0; i < 9; i++) { // Blutstropfen
      const dx = r.x + 8 + i * 24, len = ((this.t / 3 + i * 13) % 40);
      ctx.fillStyle = '#a80020'; ctx.fillRect(dx, 58, 2, Math.min(10, len / 3));
      if (len > 30) ctx.fillRect(dx, 58 + len - 20, 2, 2);
    }
    const sh = (this.t % 240) * 3 - 60; // Glanzlicht über das Logo
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 4; k++) ctx.fillRect(r.x + sh + k, 30, 2, 28);
    Font.draw(ctx, tr('subtitle'), cx, 66, (this.t >> 2) % 40 === 0 ? '#fcfcfc' : '#bcbcbc', { align: 'center', shadow: '#000' });
    [tr('start'), tr('options')].forEach((m, i) => {
      const on = this.menu === i;
      Font.draw(ctx, m, cx - 30, 104 + i * 12, on ? '#fcfcfc' : '#8c8c8c', { shadow: '#000' });
      if (on && (this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, cx - 44, 103 + i * 12);
    });
    const tags = [Options.easy && tr('tagEasy'), Options.maxWhip && tr('tagWhip'), Options.infHearts && tr('tagHearts')].filter(Boolean);
    if (tags.length) Font.draw(ctx, tags.join(' + '), cx, 128, '#58f898', { align: 'center', shadow: '#000' });
    const lines = this.controlLines(), lh = I18N.cjk ? 12 : 10;
    const bh = lines.length * lh + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(cx - 116, 136, 232, bh);
    ctx.fillStyle = '#c89020'; ctx.fillRect(cx - 116, 136, 232, 1); ctx.fillRect(cx - 116, 136 + bh - 1, 232, 1);
    lines.forEach(([l, c], i) => Font.draw(ctx, l, cx - 110, 141 + i * lh + (I18N.cjk ? 2 : 0), c));
    Font.draw(ctx, 'HI-SCORE ' + String(this.hi).padStart(6, '0'), cx, 214, '#7c7c7c', { align: 'center' });
    const pad = Input.padName;
    const foot = !Audio8.ready() && this.t > 90 ? tr('soundOn') : pad ? tr('padReady', pad) : '© 1691  NACHTMAHR';
    Font.draw(ctx, foot, cx, 226, pad && Audio8.ready() ? '#3cbcfc' : '#4c4c4c', { align: 'center' });
    if (window.BUILD) Font.draw(ctx, 'V' + window.BUILD, View.w - 4, 232, '#2c2c3c', { align: 'right' });
  },

  drawOptions(ctx) {
    const cx = View.cx;
    this.drawSkyScene(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(cx - 124, 38, 248, 168);
    ctx.fillStyle = '#c89020'; ctx.fillRect(cx - 124, 38, 248, 1); ctx.fillRect(cx - 124, 205, 248, 1); ctx.fillRect(cx - 118, 188, 236, 1);
    this.big(ctx, tr('options'), cx, 44, 2, LOGO, null, '#000');
    OPTION_ITEMS.forEach((it, i) => {
      const y = 64 + i * 14, on = this.optSel === i;
      if (on) { ctx.fillStyle = 'rgba(200,144,32,0.2)'; ctx.fillRect(cx - 118, y - 3, 236, 13); }
      Font.draw(ctx, tr(it.label), cx - 110, y, on ? '#fcfcfc' : '#9c9c9c');
      let val = '', good = false;
      if (it.key === 'music') {
        for (let k = 0; k < 10; k++) { ctx.fillStyle = k < Options.music ? '#f8b800' : '#3c3c3c'; ctx.fillRect(cx + 54 + k * 6, y, 4, 7); }
      } else if (it.key === 'lang') { val = '< ' + I18N.NAMES[Options.lang] + ' >'; good = true; }
      else if (it.key !== 'back') {
        good = it.key === 'crt' ? this.crt : !!Options[it.key];
        val = tr(good ? 'on' : 'off');
      }
      if (val) Font.draw(ctx, val, cx + 110, y, good ? '#58f898' : '#d82800', { align: 'right' });
    });
    const sel = OPTION_ITEMS[this.optSel];
    if (sel.hint) Font.draw(ctx, tr(sel.hint), cx, 194, '#a4e4fc', { align: 'center' });
    Font.draw(ctx, tr(Input.device === 'pad' ? 'optNavPad' : 'optNavKey'), cx, 214, '#7c7c7c', { align: 'center' });
  },

  drawCharSel(ctx) {
    const cx = View.cx;
    this.drawSkyScene(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 32, View.w, 176);
    this.big(ctx, tr('choose'), cx, 40, 2, LOGO, null, '#000');
    HEROES.list.forEach((d, i) => {
      const on = Options.character === d.id, pw = 134, px = cx + (i === 0 ? -pw - 4 : 4), py = 58, mid = px + pw / 2;
      ctx.fillStyle = on ? 'rgba(200,144,32,0.22)' : 'rgba(0,0,0,0.6)'; ctx.fillRect(px, py, pw, 148);
      ctx.fillStyle = on ? '#f8b800' : '#4c4c4c';
      ctx.fillRect(px, py, pw, 1); ctx.fillRect(px, py + 147, pw, 1); ctx.fillRect(px, py, 1, 148); ctx.fillRect(px + pw - 1, py, 1, 148);
      const H = HEROES.get(d.id), spr = on ? H.walk[Math.floor(this.t / 5) % 8] : H.idle[Math.floor(this.t / 40) % 2];
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(spr.c, mid - spr.c.width, py + 10, spr.c.width * 2, spr.c.height * 2);
      Font.draw(ctx, d.name, mid, py + 96, on ? '#fcfcfc' : '#8c8c8c', { align: 'center' });
      Font.draw(ctx, tr(d.id + 'Title'), mid, py + 107, on ? '#f8b800' : '#6c6c6c', { align: 'center' });
      tr(d.id + 'Desc').forEach((l, k) => Font.draw(ctx, l, mid, py + 120 + k * 11, on ? '#bcbcbc' : '#5c5c5c', { align: 'center' }));
      if (on && (this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, mid - 4, py + 140);
    });
    Font.draw(ctx, tr(Input.device === 'pad' ? 'selPad' : 'selKey'), cx, 214, '#9c9c9c', { align: 'center' });
  },

  drawIntro(ctx) {
    const cx = View.cx;
    this.drawSkyScene(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 32, View.w, 176);
    const text = [...tr('intro'), '', ...tr(Options.character === 'ragnor' ? 'introRagnor' : 'introHenrik')];
    const slow = I18N.cjk ? 6 : 3; // CJK: weniger Zeichen, gleiches Erzähltempo
    let budget = Math.floor(this.t / slow);
    text.forEach((l, i) => {
      const s = [...l].slice(0, Math.max(0, budget)).join(''); budget -= [...l].length + 6;
      Font.draw(ctx, s, cx, 70 + i * 13, i < 3 ? '#fcfcfc' : '#f8b800', { align: 'center' });
    });
    const H = HEROES.get(Options.character);
    const hx = Math.min(cx - 8, -20 + this.t * 0.5);
    const hs = hx < cx - 8 ? H.walk[Math.floor(this.t / 5) % 8] : H.stand;
    Sprites.draw(ctx, hs, hx - hs.mx, 204 - hs.h);
    ctx.fillStyle = '#202020'; ctx.fillRect(0, 204, View.w, 4);
    if (this.t > 60 && (this.t >> 5) % 2) Font.draw(ctx, tr('next'), View.w - 6, 228, '#7c7c7c', { align: 'right' });
  },

  drawGameOver(ctx) {
    const cx = View.cx;
    this.big(ctx, 'GAME OVER', cx, 80, 3, LOGO, '#200000', '#000');
    Font.draw(ctx, 'SCORE ' + String(W.score).padStart(6, '0'), cx, 120, '#bcbcbc', { align: 'center' });
    const left = 9 - Math.floor(this.t / 60);
    if (left >= 0) {
      Font.draw(ctx, tr('continueQ'), cx, 140, '#fcfcfc', { align: 'center', shadow: '#000' });
      const pop = (this.t % 60) < 8 ? 1 : 0;
      this.big(ctx, String(left), cx, 154 - pop * 3, 4 + pop, ['#fcfcfc', '#fce0a8', '#f8b800', '#f8b800', '#f87800', '#d82800', '#881400'], '#200000', '#000');
      if ((this.t >> 4) % 2) Font.draw(ctx, tr('pressStart'), cx, 200, '#bcbcbc', { align: 'center' });
    }
  },
  drawHurry(ctx) { // blinkendes HURRY UP!
    if ((this.hurryT >> 3) % 2) return;
    this.big(ctx, tr('hurry'), View.cx, 96, 3, ['#fcfcfc', '#fcbca0', '#fc7460', '#e83c20', '#d82800', '#a80020', '#580008'], null, '#000');
  },

  drawEnding(ctx) {
    const t = this.t, cx = View.cx, w = View.w;
    const sink = Math.min(150, Math.max(0, t - 60) * 0.5);
    this.drawSkyScene(ctx, t < 360, sink);
    if (t < 360 && t % 4 === 0) this.rubble.push({ x: rnd(20, w - 6), y: 60 + sink * 0.5, vy: 0, c: Math.random() < 0.5 ? '#3c3c3c' : '#140818' });
    this.rubble.forEach(r => { r.vy += 0.12; r.y += r.vy; ctx.fillStyle = r.c; ctx.fillRect(r.x, r.y, 3, 3); });
    this.rubble = this.rubble.filter(r => r.y < 210);
    if (t > 300) { // Morgendämmerung
      const a = Math.min(0.55, (t - 300) / 600);
      ctx.fillStyle = `rgba(252,160,68,${a})`; ctx.fillRect(0, 140, w, 68);
      ctx.fillStyle = `rgba(248,120,88,${a * 0.6})`; ctx.fillRect(0, 100, w, 40);
    }
    const lines = [
      ...tr('ending').map(l => [l, '#fcfcfc']),
      ['', ''], [tr(Options.character === 'ragnor' ? 'endRagnor' : 'endHenrik'), '#f8b800'], [tr('endUntil'), '#f8b800'],
      ['', ''], ['', ''], ['NACHTMAHR', '#d82800'], [tr('subtitle'), '#bcbcbc'], ['', ''],
      [tr('credits'), '#7c7c7c'], [tr('madeWith'), '#bcbcbc'], [tr('voiceBy'), '#7c7c7c'], ['', ''],
      [tr('finalScore', String(W.score).padStart(6, '0')), '#f8b800'], ['', ''], [tr('thanks'), '#fcfcfc'],
    ];
    if (t > 380) {
      const y0 = Math.max(70, 240 - (t - 380) * 0.4);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 32, w, 176); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 112, 32, 224, 176);
      lines.forEach(([s, c], i) => { if (s) Font.draw(ctx, s, cx, y0 + i * 12, c, { align: 'center', shadow: '#000' }); });
      ctx.restore();
    }
    if (t > 60 * 30 && (t >> 5) % 2) Font.draw(ctx, tr('pressStart'), cx, 222, '#7c7c7c', { align: 'center' });
  },
};

window.addEventListener('load', () => Game.init());
