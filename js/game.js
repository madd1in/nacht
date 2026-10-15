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
    document.addEventListener('pointerdown', (e) => { if (this.state === 'pause' && e.pointerType !== 'mouse' && e.clientX > window.innerWidth / 2) this.unpause = true; });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play' && W.player.alive) { this.go('pause'); this.pauseSel = 0; Audio8.setMusicVolume(0.3); Audio8.muffle(true); }
    });
    this.resize();
    const q = new URLSearchParams(location.search);
    this.debugStage = q.has('stage') ? clamp(parseInt(q.get('stage'), 10) - 1, 0, 2) : null;
    this.debugRoom = q.has('room') ? Math.max(0, parseInt(q.get('room'), 10) - 1) : 0;
    this.toTitle();
    let acc = 0, last = performance.now();
    const seen = new Set();
    const loop = (now) => {
      requestAnimationFrame(loop); // zuerst neu anmelden: ein Fehler darf die Schleife nicht beenden
      acc += Math.min(100, now - last); last = now;
      let n = 0;
      const t0 = performance.now();
      try {
        while (acc >= 1000 / 60 && n < 4) { acc -= 1000 / 60; n++; this.step(); }
        this.render();
      } catch (e) { // jeden Fehler nur einmal melden, Spiel läuft weiter statt einzufrieren
        const key = String(e && e.message);
        if (!seen.has(key)) { seen.add(key); console.error('[NACHTMAHR]', e); }
      }
      // Leistung beobachten: braucht ein Frame ~2 s lang im Schnitt über 11 ms → Spar-Modus (einmalig)
      if (!View.lite && n > 0) {
        this.perfAvg = (this.perfAvg || 0) * 0.97 + (performance.now() - t0) / n * 0.03;
        if (this.perfAvg > 11) { if (++this.slowT > 120) { View.lite = true; console.info('[NACHTMAHR] Spar-Modus aktiv'); } } else this.slowT = 0;
      }
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
  toTitle() { this.saveHi(); this.go('title'); Audio8.muffle(false); this.bars = null; Audio8.play('title'); Audio8.ambience(true); this.revealed = false; this.idleT = 0; Voice.stop(); },

  newGame(stage = 0, room = 0) {
    W.score = 0; W.lives = 3; W.nextLife = 20000; this.runBest = 0;
    W.player = new Player();
    this.startStage(stage, room);
  },

  startStage(s, room = 0) {
    W.stage = s; W.time = Levels.STAGES[s].time; W.timeSub = 0; W.checkpoint = null; W.stageFrames = 0;
    W.stats = { hits: 0, deaths: 0, combo: 0 };
    if (this.pendingView) this.applyView(this.pendingView);
    W.loadRoom(s, Math.min(room, Levels.STAGES[s].rooms.length - 1)); this.shoutT = 0; this.noteT = 0;
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
    W.lives--; W.stats.deaths++;
    if (W.lives < 0) { this.saveHi(); this.sel = 0; this.go('gameover'); Audio8.play('over'); Voice.say('gameover'); return; }
    const p = W.player;
    p.hp = p.maxHp; p.hearts = Options.infHearts ? 99 : Math.max(5, p.hearts); p.whip = Options.maxWhip ? 3 : Math.max(1, p.whip - 1);
    this.go('respawn');
  },

  startClear() { this.go('clear'); this.tallyPhase = 0; this.annT = 0; Audio8.play('clear'); Voice.say('clear'); this.recordTime(); this.rateStage(); },

  // Arcade-Wertung S–D aus Restzeit, kassierten Treffern, bester Combo und Toden (vor der Zeitbonus-Zählung)
  rateStage() {
    const left = W.time / Levels.STAGES[W.stage].time, s = W.stats;
    const pts = (left >= 0.6 ? 3 : left >= 0.45 ? 2 : left >= 0.3 ? 1 : 0)
      + (s.hits === 0 ? 3 : s.hits <= 3 ? 2 : s.hits <= 6 ? 1 : 0)
      + (s.combo >= 20 ? 3 : s.combo >= 12 ? 2 : s.combo >= 6 ? 1 : 0)
      - s.deaths * 2;
    this.rank = pts >= 8 ? 'S' : pts >= 6 ? 'A' : pts >= 4 ? 'B' : pts >= 2 ? 'C' : 'D';
    this.rankBonus = { S: 20000, A: 10000, B: 5000, C: 2000, D: 0 }[this.rank];
    this.rankT = 0;
  },

  // ---------------- Bestenliste, Namenseingabe, Attract-Modus ----------------
  // Lauf beendet: reicht der beste Score des Laufs (auch vor einem Continue) für die TOP 10 → Initialen eingeben
  finishRun(allClear) {
    const sc = Math.max(this.runBest || 0, W.score);
    this.runBest = 0; this.saveHi();
    const rank = Scores.place(sc);
    if (rank < 0) { this.toTitle(); return; }
    const init = Scores.lastInit();
    this.entry = { s: sc, st: allClear ? 4 : W.stage + 1, c: Options.character, rank, chars: [...init].map(ch => Math.max(0, Scores.ALPHA.indexOf(ch))), pos: 0, rep: 0, done: false };
    W.score = 0; // nicht noch einmal über toTitle()/saveHi() werten
    this.go('entry'); Voice.stop(); Audio8.play('names'); Audio8.sfx('oneUp');
  },
  updateEntry(P) {
    const e = this.entry, A = Scores.ALPHA, I = Input.held;
    if (e.done) { if (this.t - e.doneT > 50) this.startScores(false, e.place); return; }
    const dir = I.up ? 1 : I.down ? -1 : 0; // gehalten: nach kurzer Pause automatisch weiterblättern
    if (dir) {
      e.rep++;
      if (e.rep === 1 || (e.rep > 18 && e.rep % 4 === 0)) { e.chars[e.pos] = (e.chars[e.pos] + dir + A.length) % A.length; Audio8.sfx('select'); }
    } else e.rep = 0;
    if (P.left && e.pos > 0) { e.pos--; Audio8.sfx('select'); }
    const ok = P.jump || P.attack || P.right;
    if (P.start || (ok && e.pos === 2) || this.t > 60 * 30) { this.commitEntry(); return; } // Start oder 30 s: sofort speichern
    if (ok) { e.pos++; Audio8.sfx('item'); }
  },
  commitEntry() {
    const e = this.entry, name = e.chars.map(i => Scores.ALPHA[i]).join('');
    e.place = Scores.add({ n: name, s: e.s, st: e.st, c: e.c });
    Scores.saveInit(name);
    if (e.s > this.hi) { this.hi = e.s; try { localStorage.setItem('nachtmahr.hi', String(this.hi)); } catch (err) { /* privat */ } }
    e.done = true; e.doneT = this.t; Audio8.sfx('bigItem'); Input.rumble(0.4, 0.4, 200);
  },
  startScores(attract, highlight = -1) {
    this.go('scores'); this.attract = attract; this.hiLight = highlight;
    if (!attract && Audio8.current !== 'names' && Audio8.current !== 'title') Audio8.play('title');
  },
  updateScores() {
    if (Input.realHit && this.t > 20) { this.toTitle(); return; }
    if (this.t > 60 * (this.attract ? 8 : 10)) { if (this.attract) this.startDemo(); else this.toTitle(); }
  },
  // Demo: die KI spielt den Burghof (abwechselnd mit beiden Helden), jede echte Taste beendet sie
  startDemo() {
    this.demoN = (this.demoN || 0) + 1;
    const other = Options.character === 'henrik' ? 'ragnor' : 'henrik', hero = this.demoN % 2 ? Options.character : other;
    W.score = 0; W.lives = 3; W.nextLife = 20000;
    const p = W.player = new Player();
    if (hero !== Options.character) { p.H = HEROES.get(hero); p.def = p.H.def; p.sword = p.def.weapon === 'sword'; } // ohne die Einstellung zu speichern
    W.stage = 0; W.time = Levels.STAGES[0].time; W.timeSub = 0; W.checkpoint = null; W.stageFrames = 0;
    W.stats = { hits: 0, deaths: 0, combo: 0 };
    W.loadRoom(0, Math.max(0, Levels.STAGES[0].rooms.findIndex(r => r.theme === 'courtyard'))); // Demo spielt im Burghof
    this.demo = { t: 0, lastX: p.x, stuck: 0 };
    Input.setDemo(() => this.demoInput());
    this.go('demo'); this.readyT = 0; this.annT = 0; this.hurryT = 0; this.bossName = 0; this.bars = null;
    Audio8.play(W.songName()); Audio8.tempo(1); Audio8.setMusicVolume(0.25);
  },
  endDemo() {
    Input.setDemo(null); this.demo = null; W.score = 0;
    Audio8.setMusicVolume(0.5); this.toTitle();
  },
  updateDemo() {
    if (Input.realHit) { this.endDemo(); return; }
    this.demo.t++;
    if (this.annT > 0) this.annT--;
    if (W.slowmo > 0) { W.slowmo--; if (this.t % 3) return; }
    W.update(); this.updateBars();
    if (this.demo.t > 60 * 22 || W.exiting) this.endDemo();
  },
  // „KI": läuft nach rechts, peitscht Gegner und Kerzen vor sich, springt regelmäßig mit Salto und über Hindernisse
  demoInput() {
    const d = this.demo, p = W.player, t = d.t, out = { right: true };
    for (const e of W.ents) {
      if (e.dead || (e.kind !== 'enemy' && e.kind !== 'candle')) continue;
      const dx = e.cx - p.cx, dy = e.cy - p.cy;
      if (dx > -8 && dx < 54 && Math.abs(dy) < 36) { out.attack = t % 26 < 10; if (dx < 26) out.right = false; break; }
    }
    const ph = t % 200;
    if (ph < 7 || (ph > 20 && ph < 27)) out.jump = true; // Doppelsprung mit Salto
    if (p.onGround && Math.abs(p.x - d.lastX) < 0.05 && out.right && t > 30) { if (++d.stuck > 12) out.jump = t % 16 < 8; } else d.stuck = 0;
    d.lastX = p.x;
    if (p.sub && p.hearts >= 1 && t % 300 === 150) out.sub = true;
    return out;
  },

  // Combo-Ansager (Index in tr('hype'))
  // HUD-Leisten: verlorene Segmente bleiben kurz weiß stehen und laufen dann nach;
  // ein neuer Boss füllt seine Leiste Segment für Segment (mit Ticken) wie am Automaten
  bossBarValue() {
    if (W.boss) return Math.ceil((W.boss.hp / W.boss.maxHp) * 16);
    return W.arenaOn ? 0 : 16;
  },
  updateBars() {
    const p = W.player;
    if (!this.bars) this.bars = { p: { v: 16, g: 16, d: 0 }, b: { v: 16, g: 16, d: 0 }, boss: W.boss, fill: 16 };
    const B = this.bars;
    if (W.boss !== B.boss) { B.boss = W.boss; B.fill = W.boss ? 0 : 16; B.b = { v: 0, g: 0, d: 0 }; }
    if (B.fill < 16 && W.frame % 3 === 0) { B.fill++; Audio8.sfx('tick'); }
    const trail = (v, s) => {
      if (v < s.v) s.d = 26; // frischer Treffer: Rest kurz stehen lassen
      s.v = v;
      if (s.g < v) s.g = v; // Heilung/Auffüllen: sofort mitziehen
      else if (s.g > v) { if (s.d > 0) s.d--; else s.g = Math.max(v, s.g - 0.34); }
    };
    trail(Math.ceil(Math.max(0, p.hp) / p.maxHp * 16), B.p);
    const bv = Math.min(this.bossBarValue(), B.fill);
    if (W.boss) trail(bv, B.b); else B.b = { v: bv, g: bv, d: 0 }; // ohne Boss kein Nachlauf (Arena-Start leert die Leiste)
  },

  // kleine Nachricht oben im Bild (z. B. Gruß an Infernax)
  note(key) { this.noteT = 240; this.noteKey = key; },
  drawNote(ctx) {
    const s = tr(this.noteKey), w = Font.width(s) + 12, x = Math.round(View.cx - w / 2), y = 48;
    ctx.globalAlpha = this.noteT < 20 ? this.noteT / 20 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(x, y, w, 13);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + 12, w, 1);
    Font.draw(ctx, s, View.cx, y + 3, '#fce0a8', { align: 'center' });
    ctx.globalAlpha = 1;
  },
  // großer Ausruf in der Bildmitte (z. B. „Land in Sicht!“)
  shout(key) { this.shoutT = 100; this.shoutKey = key; Audio8.sfx('announce'); },
  drawShout(ctx) {
    const k = 100 - this.shoutT, sc = k < 6 ? 5 - Math.floor(k / 2) : 2;
    ctx.globalAlpha = this.shoutT < 15 ? this.shoutT / 15 : 1;
    this.big(ctx, tr(this.shoutKey), View.cx, 60 - (sc - 2) * 3, sc, ['#fcfcfc', '#d8f0fc', '#a4e4fc', '#3cbcfc', '#0078f8', '#0040a8', '#001038'], null, '#000');
    ctx.globalAlpha = 1;
  },
  announce(i) { this.annT = 72; this.annIdx = i; Audio8.sfx('announce'); },

  // Bestzeit pro Stage (getrennt für den Leicht-Modus), dauerhaft im Browser gespeichert
  recordTime() {
    const key = 'nachtmahr.best' + W.stage + (Options.easy ? 'e' : ''), t = W.stageFrames;
    let best = 0;
    try { best = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { best = 0; }
    this.clearTime = t; this.newBest = !best || t < best; this.bestTime = this.newBest ? t : best;
    if (this.newBest) try { localStorage.setItem(key, String(t)); } catch (e) { /* privater Modus */ }
  },
  fmtTime(f) { const s = f / 60, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); },

  // ---------------- Update ----------------
  step() {
    Input.update();
    const P = Input.pressed;
    this.t++;
    this.idleT = Input.realHit ? 0 : (this.idleT || 0) + 1; // Leerlauf (für den Attract-Modus)
    // Arcade-Zählwerk: angezeigter Score rollt zum echten hoch
    if (this.dispScore === undefined || W.score < this.dispScore) this.dispScore = W.score;
    else if (this.dispScore < W.score) this.dispScore += Math.max(1, Math.ceil((W.score - this.dispScore) / 6));
    if (this.state === 'title' && !this.revealed && (this.t >= 60 || P.start || P.jump || P.attack)) { // Blitz + Logo-Einschlag
      this.revealed = true; this.revealT = 0; if (this.t < 60) Input.clear();
      this.tStorm.cd = 1; Audio8.sfx('boom'); Audio8.sfx('bell'); Input.rumble(0.9, 0.6, 700);
      setTimeout(() => { if (this.state === 'title') Voice.say('title'); }, 700);
      this.t = Math.max(this.t, 60);
      return;
    }
    if (this.revealed && this.revealT !== undefined) this.revealT++;
    if (this.state === 'title' && this.revealed && this.t % 520 === 0) Audio8.sfx('bell');
    const titleish = ['title', 'options', 'charsel', 'intro', 'scores', 'entry'].includes(this.state);
    Audio8.ambience(titleish ? 'courtyard' : (this.state === 'play' || this.state === 'pause' || this.state === 'demo') && W.room ? W.room.theme : null);
    if (titleish) {
      FX.updateStorm(this.tStorm, View.w, () => { if (Audio8.ready()) setTimeout(() => Audio8.sfx('thunder'), 250 + Math.random() * 600); });
    }
    switch (this.state) {
      case 'title':
        if (this.revealed && this.idleT > 60 * 20) { this.startScores(true); break; } // Attract-Modus
        if (P.up || P.down) { this.menu = (this.menu + (P.down ? 1 : 2)) % 3; Audio8.sfx('select'); }
        if (P.start || P.jump || P.attack) {
          Audio8.init(); Audio8.sfx('select');
          if (this.menu === 1) { this.go('options'); this.optSel = 0; break; }
          if (this.menu === 2) { this.startScores(false); break; }
          this.go('charsel');
        }
        break;
      case 'entry': this.updateEntry(P); break;
      case 'scores': this.updateScores(); break;
      case 'demo': this.updateDemo(); break;
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
        if ((this.t > 75 && !Voice.busy()) || this.t > 140 || ((P.start || P.jump || P.attack) && this.t > 12)) { this.go('play'); Audio8.play(W.songName()); Audio8.tempo(1); this.bossName = 0; this.hurryT = 0; this.readyT = 1; }
        break;
      case 'play': this.updatePlay(P); break;
      case 'pause': // Pausenmenü: WEITER / ZUM TITEL
        if (P.up || P.down) { this.pauseSel = 1 - (this.pauseSel || 0); Audio8.sfx('select'); }
        if ((P.jump || P.attack) && this.pauseSel === 1 && this.t > 10) {
          this.unpause = false; Audio8.setMusicVolume(0.5); Audio8.muffle(false); Audio8.sfx('select'); this.finishRun(false); // Score zählt trotzdem
        } else if (P.start || this.unpause || ((P.jump || P.attack) && !this.pauseSel)) {
          this.unpause = false; this.go('play'); Audio8.setMusicVolume(0.5); Audio8.muffle(false); Audio8.sfx('pause'); }
        break;
      case 'fade':
        if (this.t === 18) { if (this.pendingView) this.applyView(this.pendingView); W.loadRoom(W.stage, W.roomIdx + 1); Audio8.play(W.songName()); } // eigener Song pro Raum möglich (Schiff)
        if (this.t > 30) this.state = 'play';
        break;
      case 'respawn':
        if (this.t === 30) {
          if (this.pendingView) this.applyView(this.pendingView);
          W.loadRoom(W.stage, W.roomIdx); W.applyCheckpoint(); W.time = W.stageDef.time;
        }
        if (this.t > 44) { this.go('play'); Audio8.play(W.songName()); Audio8.tempo(1); this.hurryT = 0; this.readyT = 1; }
        break;
      case 'clear': this.updateClear(); break;
      case 'gameover': { // Arcade: CONTINUE? 9 … 0 – Taste drücken = sofort weiter in derselben Stage
        const left = 9 - Math.floor(this.t / 60);
        if (left >= 0 && this.t % 60 === 0) Audio8.sfx('tick');
        if (left >= 0 && (P.start || P.jump || P.attack) && this.t > 30) {
          this.runBest = Math.max(this.runBest || 0, W.score); // Score vor dem Continue zählt für die Bestenliste
          Audio8.sfx('bigItem'); W.score = 0; W.lives = 3; W.nextLife = 20000; W.player = new Player(); this.startStage(W.stage);
        } else if (left < 0 && (this.t > 60 * 10 + 120 || ((P.start || P.jump) && this.t > 60 * 10 + 20))) this.finishRun(false);
        break;
      }
      case 'ending':
        if (this.t % 50 === 0 && this.t < 330) { Audio8.sfx('wall'); Input.rumble(0.3, 0.5, 200); }
        if (this.t === 380) Voice.say('ending');
        if (this.t > 60 * 30 && (P.start || P.jump || P.attack)) this.finishRun(true);
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
    if (P.start && W.player.alive) { this.go('pause'); this.pauseSel = 0; Audio8.setMusicVolume(0.3); Audio8.muffle(true); Audio8.sfx('pause'); return; }
    if (this.readyT > 0) { // READY? … GO! (das Spiel läuft dabei schon)
      this.readyT++;
      if (this.readyT === 3) Audio8.sfx('ready');
      if (this.readyT === 42) Audio8.sfx('go');
      if (this.readyT > 80) this.readyT = 0;
    }
    if (this.annT > 0) this.annT--;
    if (this.shoutT > 0) this.shoutT--;
    if (this.noteT > 0) this.noteT--;
    if (W.slowmo > 0) { W.slowmo--; if (this.t % 3) return; } // Zeitlupe
    W.update(); this.updateBars();
    if (!W.cleared) W.stageFrames++;
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
      } else { this.tallyPhase = 2; this.t2 = this.t; W.addScore(W.player.hearts * 100 + this.rankBonus); Audio8.sfx('money'); }
    }
    if (this.tallyPhase === 2 && ++this.rankT === 25) { Audio8.sfx('stamp'); W.shake = 10; Input.rumble(0.5, 0.5, 250); } // Rang-Stempel
    if (this.tallyPhase === 2 && this.t - this.t2 > 150) {
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
      case 'scores': this.drawScores(ctx); break;
      case 'entry': this.drawEntry(ctx); break;
      default:
        W.draw(ctx);
        Mode7.wave(ctx, 32, 208, View.w, W.waveAmp(), W.frame);
        if (W.cinema > 0) this.drawCinema(ctx);
        this.drawCombo(ctx);
        this.drawHud(ctx);
        if (this.state === 'pause') this.drawPause(ctx);
        if (this.state === 'fade') this.mosaicFade(ctx, this.t < 18 ? this.t / 16 : 1 - (this.t - 18) / 12);
        if (this.state === 'respawn') this.mosaicFade(ctx, this.t < 30 ? this.t / 28 : 1 - (this.t - 30) / 14);
        if (this.hurryT > 0 && this.state === 'play') this.drawHurry(ctx);
        if (this.state === 'play' && W.boss && this.bossName > 0 && this.bossName < 150) this.drawBossBanner(ctx);
        if (this.state === 'play' && this.readyT > 0) this.drawReady(ctx);
        if (this.state === 'play' && this.annT > 0) this.drawAnnounce(ctx);
        if (this.state === 'play' && this.shoutT > 0) this.drawShout(ctx);
        if (this.state === 'play' && this.noteT > 0) this.drawNote(ctx);
        if (this.state === 'clear') this.drawClear(ctx);
        if (this.state === 'demo') this.drawDemo(ctx);
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
    // Combo-Zeitbalken: läuft ab, wenn kein Treffer nachkommt
    ctx.fillStyle = '#000'; ctx.fillRect(9, 53, 44, 4);
    ctx.fillStyle = c.t < 45 && (W.frame & 4) ? '#fc7460' : '#f8b800'; ctx.fillRect(10, 54, Math.round(42 * c.t / 150), 2);
    if (mul > 1) Font.draw(ctx, tr('scoreX', mul), 10, 59, '#fce0a8', { shadow: '#000' });
    ctx.globalAlpha = 1;
  },

  drawScores(ctx) {
    const cx = View.cx;
    this.drawSkyScene(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(cx - 120, 36, 240, 178);
    ctx.fillStyle = '#c89020'; ctx.fillRect(cx - 120, 36, 240, 1); ctx.fillRect(cx - 120, 213, 240, 1); ctx.fillRect(cx - 114, 70, 228, 1);
    this.big(ctx, tr('hiTitle'), cx, 42, 2, LOGO, null, '#000');
    if (Options.easy) Font.draw(ctx, tr('tagEasy'), cx + 114, 40, '#58f898', { align: 'right' });
    Font.draw(ctx, tr('nameCol'), cx - 76, 61, '#7c7c7c'); Font.draw(ctx, tr('hudScore'), cx + 34, 61, '#7c7c7c', { align: 'right' });
    Font.draw(ctx, tr('hudStage'), cx + 66, 61, '#7c7c7c', { align: 'center' });
    const ROWC = ['#f8b800', '#e4e4e4', '#e09060'];
    Scores.list().forEach((e, i) => {
      if (this.t < i * 5) return; // Zeilen erscheinen nacheinander
      const y = 76 + i * 13, hl = i === this.hiLight;
      if (hl && (this.t >> 3) % 2) { ctx.fillStyle = 'rgba(200,144,32,0.28)'; ctx.fillRect(cx - 114, y - 3, 228, 12); }
      const c = hl ? '#fcfcfc' : ROWC[i] || '#a0a0a0';
      Font.draw(ctx, (i < 9 ? ' ' : '') + (i + 1) + '.', cx - 110, y, c);
      Font.draw(ctx, e.n, cx - 76, y, c);
      Font.draw(ctx, String(e.s).padStart(6, '0'), cx + 34, y, c, { align: 'right' });
      Font.draw(ctx, e.st >= 4 ? tr('allClear') : String(e.st), cx + 66, y, c, { align: 'center' });
      const hd = HEROES.get(e.c === 'ragnor' ? 'ragnor' : 'henrik').def; // Kopf-Symbol des Helden
      hd.icon.forEach((row, yy) => [...row].forEach((ch, xx) => { if (hd.iconPal[ch]) { ctx.fillStyle = hd.iconPal[ch]; ctx.fillRect(cx + 94 + xx, y + yy, 1, 1); } }));
    });
    if ((this.t >> 5) % 2) Font.draw(ctx, tr('pressStart'), cx, 224, '#bcbcbc', { align: 'center', shadow: '#000' });
  },

  drawEntry(ctx) {
    const cx = View.cx, e = this.entry, A = Scores.ALPHA;
    this.drawSkyScene(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(cx - 120, 40, 240, 156);
    ctx.fillStyle = '#c89020'; ctx.fillRect(cx - 120, 40, 240, 1); ctx.fillRect(cx - 120, 195, 240, 1);
    const pop = this.t < 10 ? Math.round((10 - this.t) / 3) : 0;
    this.big(ctx, tr('newHi'), cx, 48 - pop * 3, 2 + (pop > 1 ? 1 : 0), ['#fcfcfc', '#fce0a8', '#f8b800', '#f8b800', '#f87800', '#d82800', '#881400'], '#200000', '#000');
    Font.draw(ctx, tr('placeN', e.rank + 1) + '   ' + String(e.s).padStart(6, '0'), cx, 72, '#fcfcfc', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('enterName'), cx, 88, '#a4e4fc', { align: 'center' });
    for (let i = 0; i < 3; i++) {
      const x = cx - 36 + i * 36, on = i === e.pos && !e.done;
      ctx.fillStyle = on ? '#c89020' : '#3c2008'; ctx.fillRect(x - 14, 103, 28, 36);
      ctx.fillStyle = on ? '#3c0810' : '#120610'; ctx.fillRect(x - 13, 104, 26, 34);
      if (!on || (this.t >> 3) % 4 !== 3) this.big(ctx, A[e.chars[i]], x, 110, 3, on ? ['#fcfcfc', '#fce0a8', '#f8b800', '#f8b800', '#f87800', '#d82800', '#881400'] : ['#fcfcfc', '#d8d8d8', '#bcbcbc', '#a0a0a0', '#8c8c8c', '#7c7c7c', '#5c5c5c'], null, '#000');
      if (on) { // Pfeile: Buchstabe wählen
        ctx.fillStyle = (this.t >> 4) % 2 ? '#fce0a8' : '#f8b800';
        ctx.fillRect(x, 96, 1, 1); ctx.fillRect(x - 1, 97, 3, 1); ctx.fillRect(x - 2, 98, 5, 1);
        ctx.fillRect(x - 2, 144, 5, 1); ctx.fillRect(x - 1, 145, 3, 1); ctx.fillRect(x, 146, 1, 1);
      }
    }
    if (e.done) { if ((this.t >> 2) % 2) Font.draw(ctx, 'OK!', cx, 160, '#58f898', { align: 'center' }); }
    else {
      Font.draw(ctx, tr('entryHelp'), cx, 160, '#7c7c7c', { align: 'center' });
      const left = Math.max(0, 30 - Math.floor(this.t / 60));
      Font.draw(ctx, String(left).padStart(2, '0'), cx, 176, left <= 5 && (this.t & 8) ? '#fc7460' : '#bcbcbc', { align: 'center' });
    }
  },

  drawDemo(ctx) {
    if ((this.t >> 5) % 2 === 0) this.big(ctx, tr('demo'), View.cx, 40, 2, ['#fcfcfc', '#e4e4fc', '#a4e4fc', '#3cbcfc', '#0078f8', '#0058f8', '#00288c'], null, '#000');
    if ((this.t >> 4) % 2) Font.draw(ctx, tr('pressStart'), View.cx, 196, '#fcfcfc', { align: 'center', shadow: '#000' });
  },

  drawReady(ctx) {
    const k = this.readyT, cx = View.cx;
    if (k < 40) {
      if (k < 8 || (k >> 3) % 2 === 0) this.big(ctx, tr('ready'), cx, 92, 3, ['#fcfcfc', '#e4e4fc', '#a4e4fc', '#3cbcfc', '#0078f8', '#0058f8', '#00288c'], null, '#000');
      return;
    }
    const sc = k < 48 ? Math.round(4 + (48 - k) * 0.6) : 4; // GO! fliegt groß rein
    ctx.globalAlpha = k > 70 ? (80 - k) / 10 : 1;
    this.big(ctx, tr('go'), cx, 90 - (sc - 4) * 3, sc, ['#fcfcfc', '#fce0a8', '#f8b800', '#f8b800', '#f87800', '#d82800', '#881400'], '#200000', '#000');
    ctx.globalAlpha = 1;
  },

  drawAnnounce(ctx) {
    const k = 72 - this.annT, sc = k < 6 ? 6 - Math.floor(k / 2) : 3;
    ctx.globalAlpha = this.annT < 15 ? this.annT / 15 : 1;
    this.big(ctx, tr('hype')[this.annIdx], View.cx, 70 - (sc - 3) * 3, sc, ['#fcfcfc', '#fce0a8', '#f8b800', '#fc7460', '#e83c20', '#a80020', '#580008'], null, '#000');
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

  drawPause(ctx) {
    const cx = View.cx, items = [tr('resume'), tr('toTitle')];
    const hint = tr(Input.device === 'pad' ? 'pausePad' : Input.device === 'touch' ? 'pauseTouch' : 'pauseKey');
    const pw = Math.min(View.w - 8, Math.max(140, Font.width(hint) + 16, ...items.map(s => Font.width(s) + 64)));
    ctx.fillStyle = '#000'; ctx.fillRect(cx - pw / 2, 96, pw, 70);
    ctx.strokeStyle = '#c89020'; ctx.strokeRect(cx - pw / 2 + 0.5, 96.5, pw - 1, 69);
    Font.draw(ctx, tr('pause'), cx, 104, '#fcfcfc', { align: 'center' });
    items.forEach((s, i) => {
      const on = (this.pauseSel || 0) === i;
      Font.draw(ctx, s, cx - 30, 120 + i * 12, on ? '#fcfcfc' : '#8c8c8c');
      if (on && (this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, cx - 44, 119 + i * 12);
    });
    Font.draw(ctx, hint, cx, 152, '#7c7c7c', { align: 'center' });
    if (!Audio8.ready()) Font.draw(ctx, tr('soundShort'), cx, 172, '#7c7c7c', { align: 'center' });
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
    Font.draw(ctx, tr('hudScore'), 36, 3, label, { align: 'right' }); Font.draw(ctx, pad(this.dispScore || 0, 6), 40, 3, this.dispScore < W.score ? '#fce0a8' : val, { shadow: '#000' });
    if (Options.easy) Font.draw(ctx, tr('tagEasy'), 82, 3, '#58f898');
    Font.draw(ctx, tr('hudTime'), boxCx - 13, 3, label, { align: 'right' });
    Font.draw(ctx, pad(W.time, 4), boxCx - 9, 3, W.time <= 30 && (W.frame & 16) ? '#fc7460' : val, { shadow: '#000' });
    Font.draw(ctx, tr('hudStage'), Wd - 35, 3, label, { align: 'right' });
    Font.draw(ctx, pad(W.stage + 1, 1) + '-' + (W.roomIdx + 1), Wd - 30, 3, val, { shadow: '#000' });
    Font.draw(ctx, tr('hudPlayer'), 6, 13, label);
    Font.draw(ctx, tr('hudEnemy'), 6, 22, label);
    const B = this.bars, ghostCols = ['#fcfcfc', '#f0d8c8', '#a88c80'];
    const bar = (y, v, cols, ghost = 0) => {
      R('#000', 51, y - 1, 65, 8);
      for (let i = 0; i < 16; i++) {
        const c = i < v ? cols : i < ghost ? ghostCols : ['#2c1010', '#1c0808', '#120404'];
        R(c[1], 52 + i * 4, y, 3, 6); R(c[0], 52 + i * 4, y, 3, 1); R(c[2], 52 + i * 4, y + 5, 3, 1);
      }
    };
    bar(13, Math.ceil(Math.max(0, p.hp) / p.maxHp * 16), p.hp <= p.maxHp / 4 && (W.frame & 16) ? ['#fcfcfc', '#fc7460', '#a80020'] : ['#fcbca0', '#e83c20', '#880c00'], B ? Math.ceil(B.p.g) : 0);
    let bv = this.bossBarValue();
    if (B && B.boss === W.boss) bv = Math.min(bv, B.fill);
    bar(22, bv, ['#fce0a8', '#f8b800', '#9c6400'], B ? Math.ceil(B.b.g) : 0);
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
    Font.draw(ctx, pad(W.lives, 2), right + 11, 22, W.lifeT > 0 && (W.frame & 8) ? '#58f898' : val, { shadow: '#000' });
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
    const cx = View.cx, R = (a, b) => Font.draw(ctx, b, cx + 68, a, '#fcfcfc', { align: 'right' });
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 80, 66, 160, 112);
    ctx.strokeStyle = '#f8b800'; ctx.strokeRect(cx - 79.5, 66.5, 159, 111);
    Font.draw(ctx, tr('clear'), cx, 74, '#f8b800', { align: 'center' });
    Font.draw(ctx, tr('timeBonus'), cx - 68, 90); R(90, String(W.time * 10));
    if (this.tallyPhase === 2) {
      Font.draw(ctx, tr('heartBonus'), cx - 68, 102); R(102, String(W.player.hearts * 100));
      Font.draw(ctx, tr('rankBonus'), cx - 68, 114, '#fce0a8'); R(114, String(this.rankBonus));
    }
    if (this.clearTime) { // Stage-Zeit + Bestzeit (links), Rang (rechts)
      Font.draw(ctx, tr('stageTime'), cx - 68, 134, '#a4e4fc'); Font.draw(ctx, this.fmtTime(this.clearTime), cx + 22, 134, '#fcfcfc', { align: 'right' });
      if (this.newBest) { if (this.t & 16) Font.draw(ctx, tr('newBest'), cx - 68, 150, '#f8b800'); }
      else { Font.draw(ctx, tr('bestTime'), cx - 68, 150, '#7c7c7c'); Font.draw(ctx, this.fmtTime(this.bestTime), cx + 22, 150, '#bcbcbc', { align: 'right' }); }
    }
    if (this.tallyPhase === 2 && this.rankT >= 17) { // Rang-Buchstabe wird aufgestempelt
      const sc = Math.max(4, 12 - (this.rankT - 17));
      const PAL_R = {
        S: ['#fcfcfc', '#fce0a8', '#f8b800', '#f8b800', '#f87800', '#d82800', '#881400'],
        A: ['#fcfcfc', '#fcbca0', '#fc7460', '#e83c20', '#d82800', '#a80020', '#580008'],
        B: ['#fcfcfc', '#a4e4fc', '#3cbcfc', '#0078f8', '#0058f8', '#0000bc', '#000080'],
        C: ['#fcfcfc', '#b8f8b8', '#58d854', '#00a800', '#008800', '#005800', '#003000'],
        D: ['#fcfcfc', '#bcbcbc', '#a0a0a0', '#7c7c7c', '#585858', '#383838', '#202020'],
      };
      Font.draw(ctx, tr('rank'), cx + 50, 126, '#7c7c7c', { align: 'center' });
      this.big(ctx, this.rank, cx + 50, 138 - (sc - 4) * 3, sc, PAL_R[this.rank], '#200000', '#000');
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
    [tr('start'), tr('options'), tr('hiTitle')].forEach((m, i) => {
      const on = this.menu === i;
      Font.draw(ctx, m, cx - 30, 97 + i * 11, on ? '#fcfcfc' : '#8c8c8c', { shadow: '#000' });
      if (on && (this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, cx - 44, 96 + i * 11);
    });
    const tags = [Options.easy && tr('tagEasy'), Options.maxWhip && tr('tagWhip'), Options.infHearts && tr('tagHearts')].filter(Boolean);
    if (tags.length) Font.draw(ctx, tags.join(' + '), cx, 84, '#58f898', { align: 'center', shadow: '#000' });
    const lines = this.controlLines(), lh = I18N.cjk ? 12 : 10;
    const bh = lines.length * lh + 6;
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(cx - 116, 136, 232, bh);
    ctx.fillStyle = '#c89020'; ctx.fillRect(cx - 116, 136, 232, 1); ctx.fillRect(cx - 116, 136 + bh - 1, 232, 1);
    lines.forEach(([l, c], i) => Font.draw(ctx, l, cx - 110, 141 + i * lh + (I18N.cjk ? 2 : 0), c));
    Font.draw(ctx, 'HI-SCORE ' + String(Math.max(this.hi, Scores.top())).padStart(6, '0'), cx, 214, '#7c7c7c', { align: 'center' });
    const pad = Input.padName;
    const foot = !Audio8.ready() && this.t > 90 ? tr('soundOn') : pad ? tr('padReady', pad) : '© 1691  NACHTMAHR';
    Font.draw(ctx, foot, cx, 226, pad && Audio8.ready() ? '#3cbcfc' : '#4c4c4c', { align: 'center' });
    if (window.BUILD && View.w >= 320) Font.draw(ctx, 'V' + window.BUILD, View.w - 4, 232, '#2c2c3c', { align: 'right' }); // schmal: würde den Fußtext überdecken
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
      [tr('inspired'), '#7c7c7c'], ['CASTLEVANIA - BLOODSTAINED - INFERNAX', '#bcbcbc'], ['MONKEY ISLAND', '#bcbcbc'], ['', ''],
      [tr('finalScore', String(W.score).padStart(6, '0')), '#f8b800'], ['', ''], [tr('thanks'), '#fcfcfc'],
    ];
    if (t > 380) {
      // weiterscrollen, bis die letzte Zeile ganz im Bild steht (vorher blieb der Abspann bei y=70 stehen
      // und alles ab „ERSTELLT MIT CLAUDE CODE" lag unter dem sichtbaren Bereich)
      const yEnd = 194 - (lines.length - 1) * 12;
      const y0 = Math.max(yEnd, 240 - (t - 380) * 0.4);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 32, w, 176); ctx.clip();
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 112, 32, 224, 176);
      lines.forEach(([s, c], i) => { if (s) Font.draw(ctx, s, cx, y0 + i * 12, c, { align: 'center', shadow: '#000' }); });
      ctx.restore();
    }
    if (t > 60 * 30 && (t >> 5) % 2) Font.draw(ctx, tr('pressStart'), cx, 222, '#7c7c7c', { align: 'center' });
  },
};

window.addEventListener('load', () => Game.init());
