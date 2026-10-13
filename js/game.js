// Spielzustände, HUD, Bildschirme, Hauptschleife.
'use strict';

const Game = {
  state: 'title', t: 0, hi: 0, sel: 0, tallyPhase: 0, bossName: 0,
  canvas: null, ctx: null, bigCanvas: null,

  init() {
    this.canvas = document.getElementById('screen');
    this.ctx = this.canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = false;
    this.bigCanvas = Sprites.canvas(256, 8);
    try { this.hi = parseInt(localStorage.getItem('nachtmahr.hi') || '0', 10) || 0; } catch (e) { this.hi = 0; }
    let crt = true;
    try { crt = localStorage.getItem('nachtmahr.crt') !== '0'; } catch (e) { /* privat */ }
    this.setCrt(crt);
    W.player = new Player();
    Input.onAny(() => Audio8.init());
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play' && W.player.alive) { this.go('pause'); Audio8.setMusicVolume(0.12); }
    });
    this.resize();
    const q = new URLSearchParams(location.search);
    this.debugStage = q.has('stage') ? clamp(parseInt(q.get('stage'), 10) - 1, 0, 2) : null;
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
    const s = Math.min(window.innerWidth / 256, window.innerHeight / 240);
    const scale = s >= 2 ? Math.floor(s) : s;
    this.canvas.style.width = Math.floor(256 * scale) + 'px';
    this.canvas.style.height = Math.floor(240 * scale) + 'px';
    const crt = document.getElementById('crt');
    if (crt) { crt.style.setProperty('--s', scale + 'px'); crt.style.setProperty('--a', (scale * 0.55) + 'px'); }
  },

  setCrt(on) {
    this.crt = on;
    const el = document.getElementById('crt');
    if (el) el.classList.toggle('off', !on);
    this.canvas.classList.toggle('crt', on);
    try { localStorage.setItem('nachtmahr.crt', on ? '1' : '0'); } catch (e) { /* privat */ }
  },
  toggleCrt() { this.setCrt(!this.crt); },

  saveHi() {
    if (W.score > this.hi) {
      this.hi = W.score;
      try { localStorage.setItem('nachtmahr.hi', String(this.hi)); } catch (e) { /* privat */ }
    }
  },

  go(state) { this.state = state; this.t = 0; },

  toTitle() { this.saveHi(); this.go('title'); Audio8.play('title'); },

  newGame(stage = 0) {
    W.score = 0; W.lives = 3; W.nextLife = 20000;
    W.player = new Player();
    this.startStage(stage);
  },

  startStage(s) {
    W.stage = s; W.time = Levels.STAGES[s].time; W.timeSub = 0;
    W.loadRoom(s, 0);
    Audio8.stop();
    this.go('card');
  },

  nextRoom() {
    if (this.state !== 'play') return;
    Audio8.sfx('door');
    this.go('fade');
  },

  onPlayerDeath() {
    W.lives--;
    if (W.lives < 0) { this.saveHi(); this.sel = 0; this.go('gameover'); Audio8.play('over'); return; }
    const p = W.player;
    p.hp = 16; p.hearts = 5; p.whip = Math.max(1, p.whip - 1);
    this.go('respawn');
  },

  startClear() { this.go('clear'); this.tallyPhase = 0; Audio8.play('clear'); },

  // ---------------- Update ----------------
  step() {
    Input.update();
    const P = Input.pressed;
    this.t++;
    switch (this.state) {
      case 'title':
        if (P.start || P.jump || P.attack) {
          Audio8.init(); Audio8.sfx('select');
          if (this.debugStage !== null) this.newGame(this.debugStage); else { this.go('intro'); Audio8.stop(); }
        }
        break;
      case 'intro':
        if ((P.start || P.attack || P.jump) && this.t > 20) this.newGame(0);
        if (this.t > 60 * 13) this.newGame(0);
        break;
      case 'card':
        if (this.t > 150 || ((P.start || P.jump) && this.t > 30)) { this.go('play'); Audio8.play(W.stageDef.music); this.bossName = 0; }
        break;
      case 'play': this.updatePlay(P); break;
      case 'pause':
        if (P.start) { this.go('play'); Audio8.setMusicVolume(0.5); Audio8.sfx('pause'); }
        break;
      case 'fade':
        if (this.t === 32) W.loadRoom(W.stage, W.roomIdx + 1);
        if (this.t > 52) this.state = 'play';
        break;
      case 'respawn':
        if (this.t === 50) { W.loadRoom(W.stage, W.roomIdx); W.time = W.stageDef.time; }
        if (this.t > 70) { this.go('play'); Audio8.play(W.stageDef.music); }
        break;
      case 'clear': this.updateClear(); break;
      case 'gameover':
        if (P.up || P.down) { this.sel = 1 - this.sel; Audio8.sfx('select'); }
        if ((P.start || P.jump || P.attack) && this.t > 60) {
          Audio8.sfx('select');
          if (this.sel === 0) { W.score = 0; W.lives = 3; W.nextLife = 20000; W.player = new Player(); this.startStage(W.stage); }
          else this.toTitle();
        }
        break;
      case 'ending':
        if (this.t % 50 === 0 && this.t < 330) { Audio8.sfx('wall'); }
        if (this.t > 60 * 30 && (P.start || P.jump || P.attack)) this.toTitle();
        break;
    }
  },

  updatePlay(P) {
    if (P.start && W.player.alive) { this.go('pause'); Audio8.setMusicVolume(0.12); Audio8.sfx('pause'); return; }
    W.update();
    if (W.boss && this.bossName < 140) this.bossName++;
    const p = W.player;
    if (p.alive && !W.cleared && W.freeze === 0 && ++W.timeSub >= 40) {
      W.timeSub = 0; W.time--;
      if (W.time <= 30 && W.time > 0) Audio8.sfx('tick');
      if (W.time <= 0) { W.time = 0; p.die(); }
    }
  },

  updateClear() {
    W.update();
    if (this.tallyPhase === 0 && this.t > 150) this.tallyPhase = 1;
    if (this.tallyPhase === 1) {
      if (W.time > 0) {
        const n = Math.min(2, W.time); W.time -= n; W.addScore(n * 10);
        if (this.t % 3 === 0) Audio8.sfx('tick');
      } else { this.tallyPhase = 2; this.t2 = this.t; W.addScore(W.player.hearts * 100); Audio8.sfx('money'); }
    }
    if (this.tallyPhase === 2 && this.t - this.t2 > 120) {
      if (W.stage + 1 < Levels.STAGES.length) {
        const p = W.player; p.hp = 16;
        this.startStage(W.stage + 1);
      } else { this.saveHi(); this.go('ending'); Audio8.play('ending'); this.rubble = []; }
    }
  },

  // ---------------- Render ----------------
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 240);
    switch (this.state) {
      case 'title': this.drawTitle(ctx); break;
      case 'intro': this.drawIntro(ctx); break;
      case 'card': this.drawHud(ctx); this.drawCard(ctx); break;
      case 'gameover': this.drawGameOver(ctx); break;
      case 'ending': this.drawEnding(ctx); break;
      default:
        W.draw(ctx); this.drawHud(ctx);
        if (this.state === 'pause') this.panel(ctx, 'PAUSE', 'START DRÜCKEN');
        if (this.state === 'fade') this.fade(ctx, this.t < 32 ? this.t / 32 : 1 - (this.t - 32) / 20);
        if (this.state === 'respawn') this.fade(ctx, this.t < 50 ? this.t / 30 : 1 - (this.t - 50) / 20);
        if (this.state === 'play' && W.boss && this.bossName > 0 && this.bossName < 140 && (this.bossName & 8)) {
          Font.draw(ctx, W.stageDef.boss, 128, 46, '#f8b800', { align: 'center', shadow: '#000' });
        }
        if (this.state === 'clear') this.drawClear(ctx);
    }
  },

  fade(ctx, a) { ctx.fillStyle = `rgba(0,0,0,${clamp(a, 0, 1)})`; ctx.fillRect(0, 32, 256, 208); },

  panel(ctx, title, sub) {
    ctx.fillStyle = '#000'; ctx.fillRect(68, 110, 120, 40);
    ctx.strokeStyle = '#d82800'; ctx.strokeRect(68.5, 110.5, 119, 39);
    Font.draw(ctx, title, 128, 118, '#fcfcfc', { align: 'center' });
    if ((this.t >> 5) % 2 === 0) Font.draw(ctx, sub, 128, 134, '#bcbcbc', { align: 'center' });
  },

  big(ctx, text, x, y, scale, color, shadow) {
    const b = this.bigCanvas, bx = b.getContext('2d');
    bx.clearRect(0, 0, b.width, b.height);
    Font.draw(bx, text, 0, 0, color);
    const w = Font.width(text) + 1;
    ctx.imageSmoothingEnabled = false;
    const dx = Math.round(x - (w * scale) / 2);
    if (shadow) {
      bx.globalCompositeOperation = 'source-in'; bx.fillStyle = shadow; bx.fillRect(0, 0, b.width, b.height);
      bx.globalCompositeOperation = 'source-over';
      ctx.drawImage(b, 0, 0, w, 7, dx + scale, y + scale, w * scale, 7 * scale);
      bx.clearRect(0, 0, b.width, b.height);
      Font.draw(bx, text, 0, 0, color);
    }
    ctx.drawImage(b, 0, 0, w, 7, dx, y, w * scale, 7 * scale);
    return { x: dx, w: w * scale };
  },

  drawHud(ctx) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    ['#120a1c', '#0e0716', '#0a0512', '#07030c'].forEach((c, i) => R(c, 0, i * 8, 256, 8));
    R('#2c1808', 0, 29, 256, 1); R('#c89020', 0, 30, 256, 1); R('#3c2008', 0, 31, 256, 1);
    for (let i = 4; i < 256; i += 32) { R('#c89020', i, 28, 3, 1); R('#fce0a8', i + 1, 28, 1, 1); }
    const p = W.player, pad = (n, l) => String(Math.max(0, n)).padStart(l, '0');
    const label = '#b0a080', val = '#fcfcfc';
    Font.draw(ctx, 'SCORE', 6, 3, label); Font.draw(ctx, pad(W.score, 6), 40, 3, val, { shadow: '#000' });
    Font.draw(ctx, 'ZEIT', 100, 3, label);
    Font.draw(ctx, pad(W.time, 4), 128, 3, W.time <= 30 && (W.frame & 16) ? '#fc7460' : val, { shadow: '#000' });
    Font.draw(ctx, 'STAGE', 190, 3, label); Font.draw(ctx, pad(W.stage + 1, 2), 226, 3, val, { shadow: '#000' });
    Font.draw(ctx, 'SPIELER', 6, 13, label);
    Font.draw(ctx, 'GEGNER', 6, 22, label);
    const bar = (y, v, cols) => {
      R('#000', 51, y - 1, 65, 8);
      for (let i = 0; i < 16; i++) {
        const c = i < v ? cols : ['#2c1010', '#1c0808', '#120404'];
        R(c[1], 52 + i * 4, y, 3, 6); R(c[0], 52 + i * 4, y, 3, 1); R(c[2], 52 + i * 4, y + 5, 3, 1);
      }
    };
    bar(13, p.hp, p.hp <= 4 && (W.frame & 16) ? ['#fcfcfc', '#fc7460', '#a80020'] : ['#fcbca0', '#e83c20', '#880c00']);
    let bv = 16;
    if (W.boss) bv = Math.ceil((W.boss.hp / W.boss.maxHp) * 16);
    else if (W.arenaOn) bv = 0;
    bar(22, bv, ['#fce0a8', '#f8b800', '#9c6400']);
    R('#c89020', 121, 10, 33, 21); R('#3c0810', 122, 11, 31, 19); R('#120610', 123, 12, 29, 17);
    R('#07030c', 121, 10, 1, 1); R('#07030c', 153, 10, 1, 1); R('#07030c', 121, 30, 1, 1); R('#07030c', 153, 30, 1, 1);
    if (p.sub) {
      const s = ITEM_SPR[p.sub]();
      Sprites.draw(ctx, s, 138 - Math.floor(s.w / 2), 21 - Math.floor(s.h / 2));
    }
    Sprites.draw(ctx, Sprites.S.heartS, 159, 12);
    Font.draw(ctx, pad(p.hearts, 2), 169, 13, val, { shadow: '#000' });
    const head = ['..hhh..', '.hhhhh.', 'hhsssh.', 'hhsksk.', '.hssss.', '..sss..'];
    head.forEach((row, y) => [...row].forEach((ch, x) => { if (PAL[ch]) R(PAL[ch], 159 + x, 22 + y, 1, 1); }));
    Font.draw(ctx, pad(W.lives, 2), 169, 22, val, { shadow: '#000' });
    Font.draw(ctx, 'PEITSCHE', 196, 13, label);
    for (let i = 0; i < 3; i++) {
      const on = i < p.whip, x = 202 + i * 12, y = 22;
      R(on ? '#9c6400' : '#2c2c2c', x + 1, y, 5, 7); R(on ? '#f8b800' : '#4c4c4c', x, y + 1, 7, 5);
      R(on ? '#fce0a8' : '#5c5c5c', x + 2, y + 2, 2, 2);
    }
  },

  drawCard(ctx) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 32, 256, 208);
    const st = W.stageDef;
    Font.draw(ctx, 'STAGE 0' + (W.stage + 1), 128, 90, '#fcfcfc', { align: 'center' });
    this.big(ctx, st.name, 128, 108, 2, '#d82800', '#500000');
    for (let i = 0; i < Levels.STAGES.length; i++) {
      const x = 92 + i * 36;
      ctx.fillStyle = i < W.stage ? '#7c7c7c' : i === W.stage ? ((this.t >> 3) & 1 ? '#d82800' : '#f8b800') : '#3c3c3c';
      ctx.fillRect(x, 150, 8, 8);
      if (i < Levels.STAGES.length - 1) { ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x + 10, 153, 24, 2); }
    }
    Font.draw(ctx, 'LEBEN ' + Math.max(0, W.lives), 128, 176, '#bcbcbc', { align: 'center' });
  },

  drawClear(ctx) {
    if (this.tallyPhase === 0) return;
    ctx.fillStyle = '#000'; ctx.fillRect(48, 70, 160, 64);
    ctx.strokeStyle = '#f8b800'; ctx.strokeRect(48.5, 70.5, 159, 63);
    Font.draw(ctx, 'STAGE GESCHAFFT!', 128, 80, '#f8b800', { align: 'center' });
    Font.draw(ctx, 'ZEITBONUS', 60, 98); Font.draw(ctx, String(W.time * 10), 196, 98, '#fcfcfc', { align: 'right' });
    if (this.tallyPhase === 2) {
      Font.draw(ctx, 'HERZBONUS', 60, 112); Font.draw(ctx, String(W.player.hearts * 100), 196, 112, '#fcfcfc', { align: 'right' });
    }
  },

  drawSkyScene(ctx, shake = 0, sink = 0) {
    const L = (n) => Tiles.layer('courtyard', n), cam0 = { x: 0, y: 0 };
    ctx.save(); ctx.translate(0, 32);
    Tiles.drawLayer(ctx, L('sky'), cam0, this.t);
    Tiles.drawLayer(ctx, L('clouds'), cam0, this.t);
    Tiles.drawLayer(ctx, L('mountains'), { x: 1500, y: 0 }, this.t);
    ctx.drawImage(L('castle').c, -280 + (shake ? Math.round(rnd(-2, 2)) : 0), sink);
    FX.drawFog(ctx, 'courtyard', cam0, this.t);
    ctx.restore();
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 256, 32);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 208, 256, 32);
  },

  drawTitle(ctx) {
    this.drawSkyScene(ctx);
    if (this.t % 600 > 590) { ctx.fillStyle = 'rgba(164,164,252,0.3)'; ctx.fillRect(0, 32, 256, 176); }
    const fb = Sprites.S.bat.fly;
    for (let i = 0; i < 3; i++) {
      const bx = ((this.t * (0.6 + i * 0.25) + i * 120) % 320) - 32, by = 60 + i * 22 + Math.sin(this.t / 15 + i) * 6;
      Sprites.draw(ctx, fb[(this.t >> 3) % 2], bx, by);
    }
    const r = this.big(ctx, 'NACHTMAHR', 128, 30, 4, '#d82800', '#400000');
    for (let i = 0; i < 9; i++) { // Blutstropfen
      const dx = r.x + 8 + i * 24, len = ((this.t / 3 + i * 13) % 40);
      ctx.fillStyle = '#a80020'; ctx.fillRect(dx, 58, 2, Math.min(10, len / 3));
      if (len > 30) ctx.fillRect(dx, 58 + len - 20, 2, 2);
    }
    Font.draw(ctx, 'EIN 8-BIT VAMPIRJÄGER-ABENTEUER', 128, 66, '#bcbcbc', { align: 'center', shadow: '#000' });
    if ((this.t >> 5) % 2 === 0) Font.draw(ctx, 'START DRÜCKEN', 128, 120, '#fcfcfc', { align: 'center', shadow: '#000' });
    const lines = ['PFEILE  LAUFEN, DUCKEN, TREPPEN', 'Z       SPRINGEN  2X = DOPPELSPRUNG', 'X       PEITSCHE', 'C / OBEN+X  SPEZIALWAFFE', 'ENTER PAUSE  M TON  V RÖHRENLOOK'];
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(18, 139, 220, 58);
    ctx.fillStyle = '#c89020'; ctx.fillRect(18, 139, 220, 1); ctx.fillRect(18, 196, 220, 1);
    lines.forEach((l, i) => Font.draw(ctx, l, 24, 145 + i * 10, i === 0 ? '#f8b800' : '#bcbcbc'));
    Font.draw(ctx, 'HI-SCORE ' + String(this.hi).padStart(6, '0'), 128, 214, '#7c7c7c', { align: 'center' });
    Font.draw(ctx, '© ANNO 1691  NACHTMAHR', 128, 226, '#4c4c4c', { align: 'center' });
  },

  drawIntro(ctx) {
    this.drawSkyScene(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 32, 256, 176);
    const text = [
      'ANNO 1691.',
      'ALLE HUNDERT JAHRE ERWACHT',
      'GRAF NACHTMAHR UNTER DEM BLUTMOND.',
      '',
      'HENRIK MORGENSTERN ERGREIFT',
      'DIE PEITSCHE SEINER AHNEN',
      'UND BETRITT DIE VERFLUCHTE BURG ...',
    ];
    let budget = Math.floor(this.t / 3);
    text.forEach((l, i) => {
      const s = l.slice(0, Math.max(0, budget)); budget -= l.length + 6;
      Font.draw(ctx, s, 128, 70 + i * 12, i < 3 ? '#fcfcfc' : '#f8b800', { align: 'center' });
    });
    const H = Sprites.S.hero;
    const hx = Math.min(120, -20 + this.t * 0.5);
    Sprites.draw(ctx, hx < 120 ? [H.walk2, H.walk1, H.walk2, H.stand][(this.t >> 3) % 4] : H.stand, hx, 172);
    ctx.fillStyle = '#202020'; ctx.fillRect(0, 204, 256, 4);
    if (this.t > 60 && (this.t >> 5) % 2) Font.draw(ctx, 'START = WEITER', 250, 228, '#7c7c7c', { align: 'right' });
  },

  drawGameOver(ctx) {
    this.big(ctx, 'GAME OVER', 128, 80, 3, '#d82800', '#400000');
    Font.draw(ctx, 'SCORE ' + String(W.score).padStart(6, '0'), 128, 120, '#bcbcbc', { align: 'center' });
    ['WEITERSPIELEN', 'ZUM TITEL'].forEach((s, i) => {
      Font.draw(ctx, s, 112, 150 + i * 14, i === this.sel ? '#fcfcfc' : '#7c7c7c');
      if (i === this.sel) Sprites.draw(ctx, Sprites.S.heartS, 98, 149 + i * 14);
    });
  },

  drawEnding(ctx) {
    const t = this.t;
    const sink = Math.min(150, Math.max(0, t - 60) * 0.5);
    this.drawSkyScene(ctx, t < 360, sink);
    if (t < 360 && t % 4 === 0) this.rubble.push({ x: rnd(40, 250), y: 60 + sink * 0.5, vy: 0, c: Math.random() < 0.5 ? '#3c3c3c' : '#140818' });
    this.rubble.forEach(r => { r.vy += 0.12; r.y += r.vy; ctx.fillStyle = r.c; ctx.fillRect(r.x, r.y, 3, 3); });
    this.rubble = this.rubble.filter(r => r.y < 210);
    if (t > 300) { // Morgendämmerung
      const a = Math.min(0.55, (t - 300) / 600);
      ctx.fillStyle = `rgba(252,160,68,${a})`; ctx.fillRect(0, 140, 256, 68);
      ctx.fillStyle = `rgba(248,120,88,${a * 0.6})`; ctx.fillRect(0, 100, 256, 40);
    }
    const lines = [
      ['DER BLUTMOND VERBLASST.', '#fcfcfc'], ['GRAF NACHTMAHR IST BESIEGT,', '#fcfcfc'], ['SEINE BURG ZERFÄLLT ZU STAUB.', '#fcfcfc'],
      ['', ''], ['HENRIK MORGENSTERN KEHRT HEIM -', '#f8b800'], ['BIS ZUM NÄCHSTEN JAHRHUNDERT ...', '#f8b800'],
      ['', ''], ['', ''], ['NACHTMAHR', '#d82800'], ['EIN 8-BIT ABENTEUER', '#bcbcbc'], ['', ''],
      ['PROGRAMM, GRAFIK, MUSIK', '#7c7c7c'], ['ERSTELLT MIT CLAUDE CODE', '#bcbcbc'], ['', ''],
      ['ENDPUNKTZAHL ' + String(W.score).padStart(6, '0'), '#f8b800'], ['', ''], ['DANKE FÜRS SPIELEN!', '#fcfcfc'],
    ];
    if (t > 380) {
      const y0 = Math.max(70, 240 - (t - 380) * 0.4);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 32, 256, 176); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(16, 32, 224, 176);
      lines.forEach(([s, c], i) => { if (s) Font.draw(ctx, s, 128, y0 + i * 11, c, { align: 'center', shadow: '#000' }); });
      ctx.restore();
    }
    if (t > 60 * 30 && (t >> 5) % 2) Font.draw(ctx, 'START DRÜCKEN', 128, 222, '#7c7c7c', { align: 'center' });
  },
};

window.addEventListener('load', () => Game.init());
