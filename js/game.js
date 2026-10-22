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
    // Touch in der Pause: input.js wertet den Tipp aus (Menüpunkt wählen oder weiterspielen)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'play' && W.player.alive) { this.go('pause'); this.pauseSel = 0; Audio8.setMusicVolume(0.3); Audio8.muffle(true); }
    });
    this.resize();
    const q = new URLSearchParams(location.search);
    this.debugStage = q.has('stage') ? clamp(parseInt(q.get('stage'), 10) - 1, 0, Levels.STAGES.length - 1) : null;
    this.debugRoom = q.has('room') ? Math.max(0, parseInt(q.get('room'), 10) - 1) : 0;
    this.toTitle();
    if (window.Boot) Boot.onExit = () => { if (this.state === 'title' && !this.revealed) this.t = Math.max(this.t, 60); }; // Ladebildschirm blitzt weiß aus: Titel schlägt sofort ein
    let acc = 0, last = performance.now();
    const seen = new Set();
    const loop = (now) => {
      requestAnimationFrame(loop); // zuerst neu anmelden: ein Fehler darf die Schleife nicht beenden
      acc += Math.min(100, now - last); last = now;
      let n = 0;
      const t0 = performance.now();
      try {
        while (acc >= 1000 / 60 && n < 4) { acc -= 1000 / 60; n++; this.step(); }
        this.runWarm();
        if (!(window.Boot && Boot.cover)) this.render(); // unter dem deckenden Ladebildschirm nicht zeichnen
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
    if (Castle.on) Castle.newRun(); // Schloss: neues Spiel beginnt auf Stufe 1
    W.player = new Player();
    this.startStage(stage, room);
  },

  startStage(s, room = 0) {
    const say = !Castle.on || Castle.firstVisit(s); // Schloss: die Region nur beim ersten Betreten ansagen
    W.stage = s; W.time = Levels.STAGES[s].time; W.timeSub = 0; W.checkpoint = null; W.stageFrames = 0; W.miniDone = {};
    W.stats = { hits: 0, deaths: 0, combo: 0 };
    if (this.pendingView) this.applyView(this.pendingView);
    W.loadRoom(s, Math.min(room, Levels.STAGES[s].rooms.length - 1)); this.shoutT = 0; this.noteT = 0;
    if (Castle.on) Castle.settle(this.arrival);
    Audio8.stop();
    if (Castle.on && this.warmedStages && this.warmedStages.has(s)) this.warmJobs = []; else this.prewarmStage(s); // Schloss: Region schon vorgebaut
    this.go('card');
    if (say) Voice.say(Levels.STAGES[s].voice || 'stage' + (s + 1));
  },

  nextRoom() {
    if (this.state !== 'play') return;
    Audio8.sfx('door');
    this.fadeTo = Castle.on ? Castle.forward() : null; // Schloss: wohin führt dieser Ausgang?
    this.go('fade');
  },
  // Schloss-Modus: durch eine Tür (Rand, ↑-Tür, Ausgang) – Mosaik-Überblendung, dann castleEnter
  castleGo(tg) { Audio8.sfx('door'); this.fadeTo = tg; this.go('fade'); },
  castleEnter(tg) { // andere Region: Regionskarte wie ein Kapitelstart, sonst nur den Raum wechseln
    if (tg.s !== W.stage) { this.arrival = tg; this.startStage(tg.s, tg.r); this.arrival = null; return; }
    if (this.pendingView) this.applyView(this.pendingView);
    W.loadRoom(tg.s, tg.r); Castle.settle(tg); Audio8.play(W.songName(), null, 0.12);
  },
  titleItems() { // Titelmenü; der Moduswechsel lädt die Seite mit bzw. ohne ?castle neu
    if (!Castle.on) return ['start', 'castle', 'options', 'lang', 'scores', 'sections'];
    return [...(Castle.hasSave() ? ['cont'] : []), 'start', 'arcade', 'options', 'lang', 'scores', 'sections'];
  },
  switchMode(castle) { // Schloss-Modus ist Standard, ?arcade lädt das lineare Arcade-Spiel
    const u = new URL(location.href);
    ['castle', 'arcade', 'stage', 'room'].forEach(k => u.searchParams.delete(k));
    if (!castle) u.searchParams.set('arcade', '');
    location.href = u.toString().replace(/=(?=&|$)/g, ''); // leere Schalter ohne „=“ (?arcade&noboot)
  },
  // Schloss-Modus: am Spielstand der letzten Speicherkammer weiterspielen (Titel: FORTSETZEN, und nach Game Over)
  castleContinue() {
    const sv = Castle.loadSave();
    if (!sv) { this.go('charsel'); return; }
    if (sv.hero && HEROES.list.some(d => d.id === sv.hero)) Options.set('character', sv.hero);
    W.score = sv.score || 0; W.lives = sv.lives >= 0 ? sv.lives : 3; W.nextLife = (Math.floor(W.score / 20000) + 1) * 20000; this.runBest = 0;
    W.player = new Player(); Castle.applySave(W.player, sv);
    this.arrival = { s: sv.s, r: sv.r, place: sv.place }; this.startStage(sv.s, sv.r); this.arrival = null;
  },
  openWarp(c) { this.go('warp'); Castle.openWarp(c); Audio8.sfx('select'); }, // Warpkammer: ↑ öffnet die Schnellreise-Karte

  onPlayerDeath() {
    W.lives--; W.stats.deaths++;
    if (W.lives < 0) { this.saveHi(); this.sel = 0; this.go('gameover'); Audio8.play('over'); Voice.say('gameover'); return; }
    const p = W.player;
    p.hp = p.maxHp; p.hearts = Options.infHearts ? 99 : Math.max(5, p.hearts); p.whip = Options.maxWhip ? 3 : Math.max(1, p.whip - 1);
    this.go('respawn');
  },

  startClear() {
    if (Castle.on && Castle.bossBeaten()) return; // Schloss: Siegel statt Kapitelende, die Arena öffnet sich
    this.go('clear'); this.tallyPhase = 0; this.annT = 0; Audio8.play('clear'); Voice.say('clear'); this.recordTime(); this.rateStage(); },

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
    this.entry = { s: sc, st: allClear ? Levels.STAGES.length + 1 : W.stage + 1, c: Options.character, rank, chars: [...init].map(ch => Math.max(0, Scores.ALPHA.indexOf(ch))), pos: 0, rep: 0, done: false };
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
    const ids = HEROES.list.map(d => d.id), hero = this.demoN % 2 ? Options.character : ids[(ids.indexOf(Options.character) + Math.ceil(this.demoN / 2)) % ids.length]; // abwechselnd die anderen Helden
    W.score = 0; W.lives = 3; W.nextLife = 20000;
    const p = W.player = new Player();
    if (hero !== Options.character) p.setHero(HEROES.get(hero)); // ohne die Einstellung zu speichern
    const ds = Math.max(0, Levels.STAGES.findIndex(s => s.rooms.some(r => r.theme === 'courtyard')));
    W.stage = ds; W.time = Levels.STAGES[ds].time; W.timeSub = 0; W.checkpoint = null; W.stageFrames = 0; W.miniDone = {};
    W.stats = { hits: 0, deaths: 0, combo: 0 };
    W.loadRoom(ds, Math.max(0, Levels.STAGES[ds].rooms.findIndex(r => r.theme === 'courtyard'))); // Demo spielt im Burghof
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

  // Tutorial-Tafel (Achterschiff): Name des Moves, Gerät, Tasten – umbrochen, damit sie auch hochkant passt
  drawTut(ctx) {
    const s = W.tutSign; if (!s || s.a <= 0) return;
    const title = s.title(), dev = tr('tutDev.' + (Input.device || 'keys')), lh = I18N.cjk ? 13 : 10;
    const lines = [], words = s.text().split(' '), maxW = View.w - 24;
    for (const wd of words) { const cur = lines.length ? lines[lines.length - 1] + ' ' + wd : wd; if (lines.length && Font.width(cur) <= maxW) lines[lines.length - 1] = cur; else lines.push(wd); }
    const w = Math.min(View.w - 8, Math.max(Font.width(title) + Font.width(dev) + 26, ...lines.map(l => Font.width(l) + 14))), h = 16 + lines.length * lh;
    const x = Math.round(View.cx - w / 2), y = 36;
    ctx.globalAlpha = s.a;
    ctx.fillStyle = 'rgba(10,6,20,0.84)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y + 12, w, 1);
    Font.draw(ctx, title, x + 6, y + 3, '#f8d878', { shadow: '#000' });
    Font.draw(ctx, dev, x + w - 6, y + 3, '#8cc8fc', { align: 'right' });
    lines.forEach((l, i) => Font.draw(ctx, l, View.cx, y + 16 + i * lh, '#fcfcfc', { align: 'center', shadow: '#000' }));
    ctx.globalAlpha = 1;
  },
  // kleine Nachricht oben im Bild (z. B. Gruß an Infernax)
  note(key, ...args) { this.noteT = 240; this.noteKey = key; this.noteArgs = args; },
  drawNote(ctx) {
    const s = tr(this.noteKey, ...(this.noteArgs || [])), w = Font.width(s) + 12, x = Math.round(View.cx - w / 2), y = 48;
    ctx.globalAlpha = this.noteT < 20 ? this.noteT / 20 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.78)'; ctx.fillRect(x, y, w, 13);
    ctx.fillStyle = '#c89020'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + 12, w, 1);
    Font.draw(ctx, s, View.cx, y + 3, '#fce0a8', { align: 'center', shadow: '#3c2008' });
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
  rest() { this.restT = 170; }, // Rastfeuer entfacht: Schriftzug, das Bild hält kurz inne
  drawRest(ctx) { // dunkles Band quer durchs Bild, darin der Schriftzug in Glut – blendet weich ein und aus
    const k = this.restT, a = k > 140 ? (170 - k) / 30 : k < 40 ? k / 40 : 1;
    ctx.save(); ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(0, 70, 0, 130); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, 'rgba(0,0,0,0.7)'); g.addColorStop(0.7, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 70, View.w, 60);
    const txt = tr('restLit');
    this.big(ctx, txt, View.cx, 92, Font.width(txt) * 2 > View.w - 24 ? 1 : 2, ['#fcfcfc', '#fce0a8', '#f8b800', '#fc7460', '#e83c20', '#a80020', '#580008'], null, '#000');
    ctx.restore();
  },

  // Bestzeit pro Stage (getrennt für den Leicht-Modus), dauerhaft im Browser gespeichert
  recordTime() {
    const key = 'nachtmahr.best' + (W.stageDef.id ?? W.stage) + (Options.easy ? 'e' : ''), t = W.stageFrames;
    let best = 0;
    try { best = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { best = 0; }
    this.clearTime = t; this.newBest = !best || t < best; this.bestTime = this.newBest ? t : best;
    if (this.newBest) try { localStorage.setItem(key, String(t)); } catch (e) { /* privater Modus */ }
  },
  fmtTime(f) { const s = f / 60, m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(1); },

  // ---------------- Update ----------------
  step() {
    if (window.Boot && Boot.hold) { Input.update(); return; } // Ladebildschirm liegt noch darüber: Titel wartet, Tasten verfallen
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
    const titleish = ['title', 'options', 'sections', 'secload', 'charsel', 'intro', 'scores', 'entry'].includes(this.state);
    Audio8.ambience(titleish ? 'courtyard' : (this.state === 'play' || this.state === 'pause' || this.state === 'pausesec' || this.state === 'map' || this.state === 'warp' || this.state === 'status' || this.state === 'talk' || this.state === 'shop' || this.state === 'equip' || this.state === 'demo') && W.room ? W.room.theme : null);
    if (titleish && this.bootBg) this.bootBg.tick(); // Kulisse des Ladebildschirms unter den Menüs
    if (titleish) {
      FX.updateStorm(this.tStorm, View.w, () => { if (Audio8.ready()) setTimeout(() => Audio8.sfx('thunder'), 250 + Math.random() * 600); });
    }
    switch (this.state) {
      case 'title': { // Titelmenü (Schloss-Modus mit Spielstand: FORTSETZEN zuoberst)
        if (this.revealed && this.idleT > 60 * 20) { this.startScores(true); break; } // Attract-Modus
        const items = this.titleItems(), n = items.length;
        this.menu = Math.min(this.menu, n - 1);
        if (P.up || P.down) { this.menu = (this.menu + (P.down ? 1 : n - 1)) % n; Audio8.sfx('select'); }
        if (P.left || P.right) { Audio8.init(); this.menu = items.indexOf('lang'); this.cycleLang(P.left); Audio8.sfx('select'); break; } // Sprache: auf dem Titel jederzeit mit ◀ ▶
        if (P.start || P.jump || P.attack) {
          Audio8.init(); Audio8.sfx('select');
          const it = items[this.menu];
          if (it === 'cont') { this.castleContinue(); break; }
          if (it === 'castle' || it === 'arcade') { this.switchMode(it === 'castle'); break; } // Schloss-Modus (SotN) ⇄ Arcade
          if (it === 'options') { this.go('options'); this.optSel = 0; break; }
          if (it === 'lang') { this.cycleLang(false); break; }
          if (it === 'scores') { this.startScores(false); break; }
          if (it === 'sections') { this.go('sections'); break; } // Abschnittswahl fürs Testspielen
          this.go('charsel');
        }
        break;
      }
      case 'entry': this.updateEntry(P); break;
      case 'scores': this.updateScores(); break;
      case 'demo': this.updateDemo(); break;
      case 'options': this.updateOptions(P); break;
      case 'sections': this.updateSections(P); break;
      case 'pausesec': this.updateSections(P, true); break;
      case 'secload': // ein Bild Ladeanzeige ist schon zu sehen: jetzt den Abschnitt bauen (danach Kapitelkarte mit Ladebalken)
        if (this.t >= 2 && this.secGo) {
          const { e, ingame } = this.secGo; this.secGo = null;
          if (ingame) { Audio8.setMusicVolume(0.5); Audio8.muffle(false); W.player.hp = W.player.maxHp; this.startStage(e.s, e.r); }
          else this.newGame(e.s, e.r);
        }
        break;
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
      case 'card': // Schloss-Modus: Regionsname nur kurz (30–90 Bilder statt 75–140)
        if (this.warming()) break; // erst wenn die Stage fertig vorgebaut ist (Ladebalken auf der Karte)
        if ((this.t > (Castle.on ? 30 : 75) && !Voice.busy()) || this.t > (Castle.on ? 90 : 140) || ((P.start || P.jump || P.attack) && this.t > 12)) { this.go('play'); Audio8.play(W.songName()); Audio8.tempo(1); this.bossName = 0; this.hurryT = 0; this.readyT = 1; }
        break;
      case 'play': this.updatePlay(P); break;
      case 'pause': { // Pausenmenü: WEITER / (KARTE) / LEICHT-MODUS / ABSCHNITT WÄHLEN / ZUM TITEL
        const items = this.pauseItems(), n = items.length;
        if (P.up || P.down) { this.pauseSel = ((this.pauseSel || 0) + (P.down ? 1 : n - 1)) % n; Audio8.sfx('select'); }
        const tap = this.pauseAct !== undefined; // Touch: Menüpunkt angetippt
        if (tap) { this.pauseSel = this.pauseAct; this.pauseAct = undefined; }
        const it = items[this.pauseSel || 0], ok = tap || P.jump || P.attack;
        if (ok && it === 'easy') this.toggleEasy();
        else if (ok && it === 'map') { this.go('map'); Castle.openMap(); Audio8.sfx('select'); } // Schloss-Modus: Karte
        else if (ok && it === 'status') { this.go('status'); Audio8.sfx('select'); } // Schloss-Modus: Werte wie in SotN
        else if (ok && it === 'equip') { this.go('equip'); Castle.openEquip(); Audio8.sfx('select'); } // Schloss-Modus: Ausrüstung und Tränke
        else if (ok && it === 'skip') { // Schloss-Modus: Prolog (Schiff, Wald) überspringen – direkt ans Burgtor
          this.unpause = false; this.go('play'); Audio8.setMusicVolume(0.5); Audio8.muffle(false);
          this.castleGo({ s: Levels.STAGES.findIndex(st => st.id === 0), r: 0, place: 'start' });
        }
        else if (ok && it === 'sec') { this.go('pausesec'); Audio8.sfx('select'); } // Abschnittswahl mitten im Spiel
        else if (ok && it === 'title' && this.t > 10) {
          this.unpause = false; Audio8.setMusicVolume(0.5); Audio8.muffle(false); Audio8.sfx('select'); this.finishRun(false); // Score zählt trotzdem
        } else if (P.start || this.unpause || (ok && it === 'resume')) {
          this.unpause = false; this.go('play'); Audio8.setMusicVolume(0.5); Audio8.muffle(false); Audio8.sfx('pause'); }
        break;
      }
      case 'map': // Schlosskarte (nur ?castle): Angriff zoomt, Pfeile scrollen, Sprung/Start zurück zur Pause
        if ((P.start || P.jump) && this.t > 8) { this.go('pause'); this.pauseSel = this.pauseItems().indexOf('map'); Audio8.sfx('pause'); break; }
        Castle.mapInput(P);
        break;
      case 'status': // Statusbildschirm (nur ?castle): ←→ Werte/Zauber, Sprung/Angriff/Start zurück zur Pause
        if ((P.start || P.jump || P.attack) && this.t > 8) { this.go('pause'); this.pauseSel = this.pauseItems().indexOf('status'); Audio8.sfx('pause'); }
        else Castle.statusInput(P);
        break;
      case 'talk': { // Gespräch mit einer Figur (nur Schloss): die Welt steht still, Sprung/Angriff/↑ blättert, Start überspringt
        const r = Castle.talkInput(P);
        if (r) this.go(r === true ? 'play' : r); // beim Bibliothekar geht es weiter in den Laden
        break;
      }
      case 'shop': // Laden des Bibliothekars: ↑↓ wählt, Sprung/Angriff kauft, Start geht
        if (this.t > 8 && Castle.shopInput(P)) { this.go('play'); Audio8.sfx('pause'); }
        break;
      case 'equip': // Ausrüstung (Pause): ↑↓ wählt, ←→ wechselt, Sprung trinkt, Start zurück zur Pause
        if (this.t > 8 && Castle.equipInput(P)) { this.go('pause'); this.pauseSel = this.pauseItems().indexOf('equip'); Audio8.sfx('pause'); }
        break;
      case 'warp': { // Schnellreise (Warpkammer): Pfeile wählen das Ziel, Sprung/Angriff reist, Start zurück
        if (this.t < 8) break;
        const tg = Castle.warpInput(P);
        if (tg === 'cancel') { this.go('play'); Audio8.sfx('pause'); } else if (tg) { this.state = 'play'; Audio8.sfx('bigItem'); this.castleGo(tg); }
        break;
      }
      case 'fade':
        if (this.t === 18 && this.fadeTo) { // Schloss: Tür in einen anderen Raum (andere Region → Regionskarte)
          const tg = this.fadeTo; this.fadeTo = null; this.castleEnter(tg); break;
        }
        if (this.t === 18 && W.roomIdx + 1 >= W.stageDef.rooms.length) { // letzter Abschnitt ohne Bossarena (Ankunft am Burggraben): Kapitel geschafft –
          if (W.stage + 1 >= Levels.STAGES.length) { this.state = 'play'; W.stageClear(); break; } // ohne Abrechnungsbild (störte den Spielfluss), Bonus still gutgeschrieben
          this.recordTime(); this.rateStage(); W.addScore(W.time * 10 + W.player.hearts * 100 + (this.rankBonus || 0));
          W.player.hp = W.player.maxHp; this.startStage(W.stage + 1); break;
        }
        if (this.t === 18) { if (this.pendingView) this.applyView(this.pendingView); W.loadRoom(W.stage, W.roomIdx + 1); Audio8.play(W.songName(), null, 0.12); } // neuer Musikabschnitt: weich überblenden
        if (this.t > 30) this.state = 'play';
        break;
      case 'respawn':
        if (this.t === 30) {
          if (this.pendingView) this.applyView(this.pendingView);
          W.loadRoom(W.stage, W.roomIdx); W.applyCheckpoint(); W.time = W.stageDef.time;
          if (Castle.on) Castle.settle(null); // Türen und besiegte Bosse wiederherstellen
        }
        if (this.t > 44) { this.go('play'); Audio8.play(W.songName()); Audio8.tempo(1); this.hurryT = 0; this.readyT = 1; }
        break;
      case 'clear': this.updateClear(); break;
      case 'gameover': { // Arcade: CONTINUE? 9 … 0 – Taste drücken = sofort weiter in derselben Stage
        const left = 9 - Math.floor(this.t / 60);
        if (left >= 0 && this.t % 60 === 0) Audio8.sfx('tick');
        if (left >= 0 && (P.start || P.jump || P.attack) && this.t > 30) {
          this.runBest = Math.max(this.runBest || 0, W.score); // Score vor dem Continue zählt für die Bestenliste
          Audio8.sfx('bigItem');
          if (Castle.on && Castle.hasSave()) { this.castleContinue(); break; } // Schloss: zurück in die letzte Speicherkammer
          W.score = 0; W.lives = 3; W.nextLife = 20000; W.player = new Player(); this.startStage(W.stage);
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

  cycleLang(back) { // nächste Sprache – mit Hörprobe der Titelansage
    const L = I18N.LANGS, i = L.indexOf(Options.lang);
    Options.set('lang', L[(i + (back ? L.length - 1 : 1)) % L.length]);
    this.applyLang(); Voice.stop(); Voice.preload(); Voice.say('title'); this.langFx = 30;
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
    } else if (it.key === 'lang') this.cycleLang(left); else if (it.key === 'voice') {
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
    if (this.restT > 0) this.restT--;
    if (this.shoutT > 0) this.shoutT--;
    if (this.noteT > 0) this.noteT--;
    if (W.slowmo > 0) { W.slowmo--; if (this.t % 3) return; } // Zeitlupe
    if (Castle.on) Castle.preUpdate(P); // Schloss: Zauberbefehl erkannt → Angriff wird zum Zauber
    W.update(); this.updateBars();
    if (Castle.on && this.state === 'play') Castle.update(P); // Schloss: Kartenzellen aufdecken, Türen benutzen
    if (!W.cleared) W.stageFrames++;
    if (this.hurryT > 0) this.hurryT--;
    if (W.boss && this.bossName < 150) { if (this.bossName === 0) Voice.say(W.boss.voice || 'boss' + (W.stage + 1)); this.bossName++; }
    const p = W.player;
    if (p.alive && p.hp <= p.maxHp / 4 && this.t % 50 === 0) Audio8.sfx('beat');
    if (!Castle.on && p.alive && !W.cleared && W.freeze === 0 && ++W.timeSub >= 40) { // Schloss: kein Zeitlimit
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
      case 'sections': this.drawSections(ctx); break;
      case 'secload': this.drawSecLoad(ctx); break;
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
        if (this.state === 'pausesec') this.drawSections(ctx, true);
        if (this.state === 'map') Castle.draw(ctx, this.t);
        if (this.state === 'warp') Castle.draw(ctx, this.t, true);
        if (this.state === 'status') Castle.drawStatus(ctx, this.t);
        if (this.state === 'talk') Castle.drawTalk(ctx, this.t);
        if (this.state === 'shop') Castle.drawShop(ctx, this.t);
        if (this.state === 'equip') Castle.drawEquip(ctx, this.t);
        if (this.state === 'fade') this.mosaicFade(ctx, this.t < 18 ? this.t / 16 : 1 - (this.t - 18) / 12);
        if (this.state === 'respawn') this.mosaicFade(ctx, this.t < 30 ? this.t / 28 : 1 - (this.t - 30) / 14);
        if (this.hurryT > 0 && this.state === 'play') this.drawHurry(ctx);
        if (this.state === 'play' && W.boss && this.bossName > 0 && this.bossName < 150) this.drawBossBanner(ctx);
        if (this.state === 'play' && this.readyT > 0) this.drawReady(ctx);
        if (this.state === 'play' && this.annT > 0) this.drawAnnounce(ctx);
        if (this.state === 'play' && this.restT > 0) this.drawRest(ctx);
        if (this.state === 'play' && this.shoutT > 0) this.drawShout(ctx);
        if (this.state === 'play') this.drawTut(ctx);
        if (this.state === 'play' && this.noteT > 0) this.drawNote(ctx);
        if (this.state === 'play' && Castle.on) Castle.drawGoalToast(ctx); // Schloss: Wegweiser unten im Bild
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
    this.menuBg(ctx);
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
      Font.draw(ctx, e.st > Levels.STAGES.length ? tr('allClear') : String(e.st), cx + 66, y, c, { align: 'center' });
      const hd = HEROES.def(e.c); // Kopf-Symbol des Helden
      hd.icon.forEach((row, yy) => [...row].forEach((ch, xx) => { if (hd.iconPal[ch]) { ctx.fillStyle = hd.iconPal[ch]; ctx.fillRect(cx + 94 + xx, y + yy, 1, 1); } }));
    });
    if ((this.t >> 5) % 2) Font.draw(ctx, tr('pressStart'), cx, 224, '#bcbcbc', { align: 'center', shadow: '#000' });
  },

  drawEntry(ctx) {
    const cx = View.cx, e = this.entry, A = Scores.ALPHA;
    this.menuBg(ctx);
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

  // Leicht-Modus mitten im Spiel umschalten: doppelte Lebensleiste und doppelter Schaden, die Leiste wird mitskaliert
  toggleEasy() {
    const p = W.player, old = p.maxHp;
    Options.toggle('easy');
    p.maxHp = Options.maxHp; p.hp = Math.max(1, Math.min(p.maxHp, Math.round(p.hp * p.maxHp / old)));
    Audio8.sfx(Options.easy ? 'heart' : 'select');
  },
  // Touch im Pausenmenü: Tipp auf einen Menüpunkt wählt ihn (true), sonst geht es weiter
  pauseItems() { return Castle.on ? ['resume', 'map', 'status', 'equip', ...(Castle.inPrologue() ? ['skip'] : []), 'easy', 'sec', 'title'] : ['resume', 'easy', 'sec', 'title']; },
  pauseTouch(clientX, clientY) {
    const r = this.canvas.getBoundingClientRect(), y = (clientY - r.top) / r.height * 240;
    for (let i = 0; i < this.pauseItems().length; i++) if (y >= 117 + i * 12 && y < 129 + i * 12) { this.pauseAct = i; return true; }
    return false;
  },
  drawPause(ctx) {
    const ids = this.pauseItems(), extra = (ids.length - 4) * 12;
    const LABEL = { resume: tr('resume'), map: tr('mapTitle'), status: tr('castleStatus'), equip: tr('equipTitle'), skip: tr('castleSkipPrologue'), easy: tr('optEasy') + ': ' + tr(Options.easy ? 'on' : 'off'), sec: tr('secTitle'), title: tr('toTitle') };
    const cx = View.cx, items = ids.map(id => LABEL[id]);
    const hint = tr(Input.device === 'pad' ? 'pausePad' : Input.device === 'touch' ? 'pauseTouch' : 'pauseKey');
    const pw = Math.min(View.w - 8, Math.max(150, Font.width(hint) + 16, ...items.map(s => Font.width(s) + 96)));
    if (Castle.on) Castle.drawGoalBanner(ctx, 66); // Schloss: nächstes Ziel
    ctx.fillStyle = '#000'; ctx.fillRect(cx - pw / 2, 96, pw, 94 + extra);
    ctx.strokeStyle = '#c89020'; ctx.strokeRect(cx - pw / 2 + 0.5, 96.5, pw - 1, 93 + extra);
    Font.draw(ctx, tr('pause'), cx, 104, '#fcfcfc', { align: 'center' });
    items.forEach((s, i) => {
      const on = (this.pauseSel || 0) === i;
      Font.draw(ctx, s, cx - 46, 120 + i * 12, on ? (ids[i] === 'easy' && Options.easy ? '#58f898' : '#fcfcfc') : '#8c8c8c');
      if (on && (this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, cx - 60, 119 + i * 12);
    });
    Font.draw(ctx, hint, cx, 176 + extra, '#7c7c7c', { align: 'center' });
    if (!Audio8.ready()) Font.draw(ctx, tr('soundShort'), cx, 196 + extra, '#7c7c7c', { align: 'center' });
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
  // PS1-Schrift: der Schriftzug als Körper – nach hinten unten extrudiert (dunkle Flanken, je nach Winkel zur Seite) und
  // langsam um die Hochachse gedreht (seitlich gestaucht); zoom > 1 lässt ihn aus der Tiefe heranfliegen
  big3d(ctx, text, cx, y, scale, colors, ang, depth = 6, zoom = 1) {
    return this.text3d(ctx, text, cx, y, scale, colors, { ang, depth, zoom, wobble: 0.16, bob: 0.3, outline: true });
  },
  // PS2-Schrift: jeder Buchstabe ist ein eigener Körper – nach hinten unten extrudiert (Flanken aus der dunklen Farbe
  // des Verlaufs), wiegt sich phasenversetzt um die Hochachse (gestaucht, Flanken wandern zur Seite), schwingt sanft auf
  // und ab; ein Glanzstreifen läuft über die Vorderseiten. Erst alle Umrisse, dann alle Flanken, dann alle Fronten –
  // so verdeckt keine Flanke den Nachbarbuchstaben.
  text3d(ctx, text, cx, y, scale, colors, o = {}) {
    const fbk = Font.hasFB(text), top = fbk ? 3 : 0, H = fbk ? 12 : 7, w = Math.min(this.bigCanvas.width, Font.width(text) + 1);
    const T = performance.now() / 16.667, ang = o.ang || 0, zoom = o.zoom || 1, lite = View.lite;
    const depth = Math.max(1, Math.round((o.depth ?? Math.max(2, scale + 1)) * (lite ? 0.6 : 1))), wob = o.wobble ?? 0.2, bob = o.bob ?? 0.4;
    const paint = (col) => this.textLayer(text, col, w, H, top);
    const dark = Array.isArray(colors) ? colors[6] : colors, side = this.sideRamp(dark);
    const L = Font.layout(text), cw = Math.cos(ang) * zoom, mid = y - top * scale + (H * scale) / 2, step = Math.max(1, scale / 2) * zoom, ga = ctx.globalAlpha;
    const totalW = w * scale * cw, x0 = cx - totalW / 2, glossX = ((T * 2.6) % (totalW + 160)) - 80;
    const geo = L.map((g, i) => {
      if (g.ch === ' ') return null;
      const la = ang + Math.sin(T * 0.045 + i * 0.55) * wob, ca = Math.abs(Math.cos(la)) * zoom, sa = Math.sin(la);
      const lcx = x0 + (g.x + g.w / 2) * scale * cw, sw = Math.max(1, g.w * scale * ca), sh = H * scale * zoom;
      return { g, sa, dx: lcx - sw / 2, dy: mid - sh / 2 + Math.sin(T * 0.07 + i * 0.8) * bob * scale, sw, sh, lcx };
    });
    const put = (img, q, ox, oy) => ctx.drawImage(img, q.g.x, 0, q.g.w, H, Math.round(q.dx + ox), Math.round(q.dy + oy), q.sw, q.sh);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    if (o.shadow) { const sd = paint(o.shadow); ctx.globalAlpha = ga * 0.7; for (const q of geo) if (q) put(sd, q, scale + depth * step * 0.4, scale + depth * step * 0.8); ctx.globalAlpha = ga; }
    if (o.outline) { const ol = paint('#000'); for (const q of geo) if (q) for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) put(ol, q, ox, oy); }
    for (let k = depth; k >= 1; k--) { // Flanken von hinten nach vorn, vorne heller
      const img = paint(side[Math.min(3, Math.floor((depth - k) / depth * 4))]);
      for (const q of geo) if (q) put(img, q, k * step * (0.35 + q.sa * 1.4), k * step * 0.8);
    }
    const fr = paint(colors), wh = paint('#fcfcfc');
    for (const q of geo) {
      if (!q) continue;
      put(fr, q, 0, 0);
      const d = Math.abs(q.lcx - (x0 + glossX)); // Glanzstreifen
      if (d < 18 * scale) { ctx.globalAlpha = ga * (1 - d / (18 * scale)) * 0.55; put(wh, q, 0, 0); ctx.globalAlpha = ga; }
    }
    ctx.restore();
    return { x: Math.round(x0), w: totalW };
  },
  // Flankenfarben aus der dunkelsten Verlaufsfarbe: hinten fast schwarz, vorn etwas heller
  sideRamp(dark) {
    this.rampCache = this.rampCache || new Map();
    let r = this.rampCache.get(dark);
    if (r) return r;
    const m = /^#([0-9a-f]{6})$/i.exec(dark || ''), v = m ? parseInt(m[1], 16) : 0x2c0008, R = v >> 16, G = (v >> 8) & 255, B = v & 255;
    const f = (k) => `rgb(${Math.round(R * k)},${Math.round(G * k)},${Math.round(B * k)})`;
    r = [f(0.45), f(0.7), f(0.95), f(1.2)];
    this.rampCache.set(dark, r);
    return r;
  },
  // Schriftzug in einer Farbe (oder Zeilen-Verlauf) einmal malen und merken – das Malen über Clip-Zeilen ist teuer
  textLayer(text, cols, w, H, top) {
    const key = text + '|' + (Array.isArray(cols) ? cols.join(',') : cols);
    this.txtCache = this.txtCache || new Map();
    let c = this.txtCache.get(key);
    if (!c) {
      if (this.txtCache.size > 160) this.txtCache.clear();
      c = Sprites.canvas(w, H); const bx = c.getContext('2d');
      for (let r = 0; r < H; r++) { bx.save(); bx.beginPath(); bx.rect(0, r, w, 1); bx.clip(); Font.draw(bx, text, 0, top, Array.isArray(cols) ? cols[Math.min(6, Math.floor(r * 7 / H))] : cols); bx.restore(); }
      this.txtCache.set(key, c);
    }
    return c;
  },
  // Hintergründe aller Räume der Stage vorbauen (einer pro Frame, während der Kapitelkarte) – sonst stockt der Raumwechsel
  prewarmStage(s) {
    const rooms = Levels.STAGES[s].rooms, jobs = [];
    [...new Set(rooms.map(r => r.theme))].forEach(th => jobs.push(() => Tiles.build(th)));
    rooms.forEach(r => r.ents.forEach(e => { if (e.type === 'gears') jobs.push(() => buildGearTrain(e.list)); }));
    if (rooms.some(r => r.arena && r.arena.boss === 'count')) jobs.push(() => COUNT_ART.get());
    if (rooms.some(r => r.theme === 'ice')) jobs.push(() => IceCave.prewarm && W.room && W.room.theme === 'ice' && IceCave.prewarm());
    if (rooms.some(r => r.arena && r.arena.boss === 'medusa')) jobs.push(() => MEDUSA_ART.get());
    if (rooms.some(r => r.theme === 'cathedral' || r.theme === 'spire')) jobs.push(() => PS2.prewarm());
    if (rooms.some(r => r.theme === 'forest')) jobs.push(() => PS2.prewarmWoods());
    if (rooms.some(r => r.theme === 'expo')) jobs.push(() => Expo.prewarm());
    if (rooms.some(r => r.theme === 'ballroom')) jobs.push(() => Ball.prewarm());
    if (rooms.some(r => r.ents.some(e => e.type === 'grand'))) jobs.push(...PS2.chandJobs(54, 2)); // XXL-Kronleuchter: alle Drehstellungen vorab
    [...new Set(rooms.map(r => r.theme))].forEach(th => jobs.push(() => FX.drawFog(this.warmCtx(), th, { x: 0, y: 0 }, 0))); // Bodennebel je Thema
    jobs.push(() => this.warmRoom());
    this.warmJobs = jobs; this.warmTotal = jobs.length; this.warmDoneT = -1;
  },
  warming() { return !!(this.warmJobs && this.warmJobs.length); },
  // Vorbau-Schritte: pro gezeichnetem Bild so viele, wie in ~8 ms passen (mindestens einer) – nie mehrere schwere am Stück
  runWarm() {
    if (!this.warming() || this.state === 'play' || (this.state === 'card' && this.t < 2)) return; // die Karte mit dem Ladebalken erst zeigen
    const t0 = performance.now();
    do { try { this.warmJobs.shift()(); } catch (e) { console.warn(e); } } while (this.warmJobs.length && performance.now() - t0 < 8);
    if (!this.warmJobs.length) { this.warmDoneT = this.t; (this.warmedStages || (this.warmedStages = new Set())).add(W.stage); }
  },
  // erster Raum einmal unsichtbar zeichnen: alles, was sonst beim ersten Bild gebaut würde (Wald, Torhaus, Lichter …), ist danach fertig
  warmCtx() { const c = this.warmC && this.warmC.width === View.w ? this.warmC : (this.warmC = Sprites.canvas(View.w, 240)); return c.getContext('2d'); },
  warmRoom() {
    if (!W.room) return;
    const x = this.warmCtx();
    x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false;
    const f = W.frame; W.draw(x); W.frame = f;
  },
  // Ladebildschirm (js/boot.js): nur, was Titel und Ton sofort brauchen. Alles Weitere (gewählter Held, Gegnerfiguren, Weltkarte,
  // erste Stage, Heldenwahl, Vorspann, Kapitelkarte) baut sich nebenher als Hintergrund-Vorbau, während Ladebild und Titel
  // laufen (runWarm, ~8 ms pro Bild); startet man sehr schnell, wartet die Kapitelkarte mit ihrem Ladebalken.
  bootJobs() {
    const c = Sprites.canvas(View.w, 240), x = c.getContext('2d'), s = W.stage;
    const quiet = (fn) => () => { const st = this.state, t = this.t; try { fn(); } finally { this.state = st; this.t = t; } }; // Zeichnen ohne Zustandswechsel
    this.prewarmStage(0); const stageJobs = this.warmJobs.filter((j, i, a) => i < a.length - 1); // den Raum gibt es noch nicht
    this.warmJobs = [() => HEROES.get(Options.character), () => HEROES.ensureMonsters(), () => Mode7.mapData(), () => PS2.prewarmMap(), ...stageJobs,
      quiet(() => this.drawCharSel(x)), quiet(() => this.drawIntro(x)), quiet(() => { W.stage = 0; try { this.drawCard(x); } finally { W.stage = s; } })];
    this.warmTotal = this.warmJobs.length; this.warmDoneT = -1;
    const title = quiet(() => { // fertiger Titel (Logo-Einschlag und Ruhe) einmal unter dem Ladebild auf die echte Fläche: Schriftzüge, Feuer und Bilder liegen dann bereit
      const rv = this.revealed, rt = this.revealT;
      try { this.revealed = true; for (const t of [0, 40]) { this.revealT = t; this.drawTitle(this.ctx); } } finally { this.revealed = rv; this.revealT = rt; }
    });
    return [() => Audio8.prepare(), () => Tiles.build('courtyard'), () => FX.drawFog(x, 'courtyard', { x: 0, y: 0 }, 0), quiet(() => this.drawSkyScene(x)), title]; // in kleinen Stücken: das Ladebild wartet auf jedes
  },
  big(ctx, text, cx, y, scale, colors, shadow, outline) { // alle Großschriften (Ausrufe, Combo, Titel der Menüs, Boss-Namen): PS2-3D
    return this.text3d(ctx, text, cx, y, scale, colors, { shadow, outline: !!outline, depth: Math.max(2, scale + 1), wobble: 0.2, bob: 0.4 });
  },
  bigFlat(ctx, text, cx, y, scale, colors, shadow, outline) {
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
    if (Castle.on) { // Schloss: Stufe mit EXP-Leiste statt Punkten, Gold in der Mitte statt der (stehenden) Zeit
      Font.draw(ctx, 'LV', 18, 3, label, { align: 'right' }); Font.draw(ctx, pad(Castle.rpg.lv, 2), 22, 3, val, { shadow: '#000' });
      const k = clamp(Castle.expProgress(), 0, 1); R('#000', 37, 4, 66, 5); R('#1c2c14', 38, 5, 64, 3); R('#58f898', 38, 5, Math.round(64 * k), 3); R('#b8fcd0', 38, 5, Math.round(64 * k), 1);
      const mm = Castle.mpMax(); // MP, sobald ein Zauber gelernt ist
      if (mm) { const m = clamp(Castle.mp / mm, 0, 1); Font.draw(ctx, 'MP', 108, 3, label); R('#000', 120, 4, 28, 5); R('#0c1c34', 121, 5, 26, 3); R('#3cbcfc', 121, 5, Math.round(26 * m), 3); R('#a4e4fc', 121, 5, Math.round(26 * m), 1); }
      Font.draw(ctx, pad(this.dispScore || 0, 6), boxCx, 3, this.dispScore < W.score ? '#fce0a8' : '#f8b800', { align: 'center', shadow: '#000' });
    } else {
      Font.draw(ctx, tr('hudScore'), 36, 3, label, { align: 'right' }); Font.draw(ctx, pad(this.dispScore || 0, 6), 40, 3, this.dispScore < W.score ? '#fce0a8' : val, { shadow: '#000' });
      if (Options.easy) Font.draw(ctx, tr('tagEasy'), 82, 3, '#58f898');
      Font.draw(ctx, tr('hudTime'), boxCx - 13, 3, label, { align: 'right' });
      Font.draw(ctx, pad(W.time, 4), boxCx - 9, 3, W.time <= 30 && (W.frame & 16) ? '#fc7460' : val, { shadow: '#000' });
    }
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
    Font.draw(ctx, tr(p.pole ? 'hudPole' : p.sword ? 'hudSword' : 'hudWhip'), Wd - 60, 13, label);
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
    this.big(ctx, tr((W.boss && W.boss.nameKey) || W.stageDef.bossKey), cx + slide, 44, 2, ['#fce0a8', '#fce0a8', '#f8b800', '#f8b800', '#c89020', '#9c6400', '#6c4000'], null, '#000');
  },

  drawCard(ctx) {
    const cx = View.cx;
    (PS2.drawWorldMap || Mode7.drawMap)(ctx, View.w, this.t, W.stage); // Weltkarte im Hintergrund: PS2-3D-Landschaft
    ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.fillRect(0, 78, View.w, 124); // leichter, damit Karte und Burgen durchscheinen
    ctx.fillStyle = '#c89020'; ctx.fillRect(0, 78, View.w, 1); ctx.fillRect(0, 201, View.w, 1);
    const st = W.stageDef;
    Font.draw(ctx, tr('stageNo', W.stage + 1), cx, 86, '#d0c0a0', { align: 'center', shadow: '#000' });
    const nm = tr(st.nameKey);
    const z = Math.max(1, 3 - this.t / 8); // fliegt aus der Tiefe heran, dreht sich dann langsam
    this.big3d(ctx, nm, cx, 100, Font.width(nm) * 3 > View.w - 16 ? 2 : 3, LOGO, Math.sin(this.t * 0.035) * 0.28 + (z > 1 ? (z - 1) * 0.6 : 0), 5, 1 / z);
    const n = Levels.STAGES.length;
    const gap = n > 4 ? 38 : 48;
    for (let i = 0; i < n; i++) {
      const x = cx - Math.round((n - 1) * gap / 2) - 4 + i * gap;
      ctx.fillStyle = i < W.stage ? '#7c7c7c' : i === W.stage ? ((this.t >> 3) & 1 ? '#d82800' : '#f8b800') : '#3c3c3c';
      ctx.fillRect(x, 150, 8, 8);
      if (i < n - 1) { ctx.fillStyle = '#3c3c3c'; ctx.fillRect(x + 12, 153, gap - 16, 2); }
    }
    if (Castle.on) { // Schloss: Gefahrenstufe der Region statt Leben (Sterne leuchten rot)
      const k = Castle.tier(W.stage);
      Font.draw(ctx, tr('castleDanger') + ' ' + '*'.repeat(k) + '   LV ' + Castle.rpg.lv, cx, 176, k >= 4 ? '#fc7460' : '#e0e0e0', { align: 'center', shadow: '#000' });
    } else Font.draw(ctx, tr('lives', Math.max(0, W.lives)), cx, 176, '#e0e0e0', { align: 'center', shadow: '#000' });
    Font.draw(ctx, tr('bossIs', tr(st.bossKey)), cx, 190, '#b0b0b0', { align: 'center', shadow: '#000' });
    this.drawWarmBar(ctx, cx, 165);
  },
  drawSecLoad(ctx) { // Abschnitt gewählt: Kulisse des Ladebildschirms, Name des Abschnitts, Ladebalken bei 0 – sofort, bevor der Aufbau beginnt
    const cx = View.cx, e = this.secGo && this.secGo.e;
    this.menuBg(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 90, View.w, 56);
    if (e) this.bootText(ctx, e.label, cx, 100, '#fce0a8', '#400008');
    this.drawLoadBar(ctx, cx, 130, 0.03 + 0.02 * Math.sin(this.t * 0.3));
  },
  drawLoadBar(ctx, cx, y, k, flash = false, side = false) { // Ladebalken wie im Ladebildschirm: dunkles Bett, glühende Füllung, goldene Zier, Prozent darüber (side: rechts daneben)
    const bw = Math.min(side ? 130 : 170, View.w - 80), bx = Math.round(cx - bw / 2), fw = Math.round(bw * Math.max(0, Math.min(1, k)));
    if (side) this.bootText(ctx, Math.floor(k * 100) + '%', bx + bw + 10, y - 2, '#d0b8e0', '#000', 'left'); else this.bootText(ctx, Math.floor(k * 100) + '%', cx, y - 11, '#d0b8e0', '#000');
    ctx.fillStyle = '#1a0c20'; ctx.fillRect(bx - 1, y - 1, bw + 2, 6); ctx.fillStyle = '#3c2848'; ctx.fillRect(bx - 1, y - 1, bw + 2, 1);
    if (fw > 0) {
      const g = ctx.createLinearGradient(bx, 0, bx + fw, 0); g.addColorStop(0, '#580008'); g.addColorStop(0.7, '#d82800'); g.addColorStop(1, '#fcbca0');
      ctx.fillStyle = flash ? '#fcfcfc' : g; ctx.fillRect(bx, y, fw, 4);
      const eg = ctx.createRadialGradient(bx + fw, y + 2, 0, bx + fw, y + 2, 8); eg.addColorStop(0, 'rgba(255,170,90,0.8)'); eg.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = eg; ctx.fillRect(bx + fw - 8, y - 6, 16, 16); ctx.globalCompositeOperation = 'source-over';
    }
    ctx.fillStyle = '#c89020'; for (const ex of [bx - 5, bx + bw + 4]) { ctx.fillRect(ex, y + 1, 1, 1); ctx.fillRect(ex - 1, y + 2, 3, 1); ctx.fillRect(ex, y + 3, 1, 1); ctx.fillRect(ex - 1, y, 3, 1); }
  },
  drawWarmBar(ctx, cx, y) { // Ladebalken, solange die Stage vorgebaut wird; danach blitzt er auf und verschwindet
    if (!this.warmTotal) return;
    const left = this.warmJobs ? this.warmJobs.length : 0, k = 1 - left / this.warmTotal, since = this.warmDoneT >= 0 ? this.t - this.warmDoneT : -1;
    if (since > 24) return;
    ctx.save(); ctx.globalAlpha = since < 0 ? 1 : 1 - since / 24;
    this.drawLoadBar(ctx, cx, y, k, since >= 0 && since < 6, true); // auf der Kapitelkarte: Prozent rechts, darüber stehen die Stationen
    ctx.restore();
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
    Tiles.drawCloud7(ctx, this.t); // Mode-7-Wolkendecke, halb durchsichtig
    Tiles.drawLayer(ctx, L('storm'), cam0, this.t);
    Tiles.drawLayer(ctx, L('clouds'), cam0, this.t);
    FX.drawStormSky(ctx, this.tStorm, View.w);
    Tiles.drawLayer(ctx, L('peaks'), { x: 1500, y: 0 }, this.t);
    Tiles.drawLayer(ctx, L('mountains'), { x: 1500, y: 0 }, this.t);
    ctx.save(); ctx.translate(shake ? Math.round(rnd(-2, 2)) : 0, sink); Tiles.drawLayer(ctx, L('castle'), { x: (659 - View.w / 2) / 0.6, y: 0 }, this.t); ctx.restore(); // Low-Poly-Burg, mittig über dem Titel
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

  controlLines() { return tr(Input.device === 'pad' || Input.padName ? 'pad' : 'keys'); },

  // Titelmenü im Look des Ladebildschirms: dieselbe Kulisse (Blutmond, Burg, Wolken, Blitze, Regen) und dieselben glühenden
  // NACHTMAHR-Lettern an derselben Stelle – der Ladebildschirm blitzt weiß aus und blendet in genau dieses Bild über –, darunter
  // Menü, Steuerung und Bestwert in seiner 5x7-Schrift, der Kasten mit violettem Rand und goldener Zier wie der Ladebalken.
  drawTitle(ctx) {
    const cx = View.cx, bg = this.menuBg(ctx, true), t = this.t;
    if (!this.revealed) { ctx.fillStyle = `rgba(0,0,0,${Math.max(0, 0.85 - t / 200)})`; ctx.fillRect(0, 0, View.w, 240); return; } // Dunkelheit vor dem ersten Blitz
    const rv = this.revealT || 0, L = bg ? bg.layout() : { sub: 66 };
    this.bootText(ctx, tr('subtitle'), cx, L.sub, '#e8d4f0', '#14000c');
    // Menü
    const langTxt = tr('optLang') + '  < ' + I18N.NAMES[Options.lang] + ' >', msp = I18N.cjk ? 11 : 10;
    const tags = [Options.easy && tr('tagEasy'), Options.maxWhip && tr('tagWhip'), Options.infHearts && tr('tagHearts')].filter(Boolean);
    const lines = this.controlLines(), lh = I18N.cjk ? 11 : 9, bw = Math.min(View.w - 8, 240), bh = lines.length * lh + 7;
    const ids = this.titleItems(), ni = ids.length;
    const by = 228 - bh, my0 = Math.min(L.sub + 13, by - ni * msp - (tags.length ? 11 : 3));
    const fx = (this.langFx = Math.max(0, (this.langFx || 0) - 1)) > 0;
    const LABEL = { cont: tr('castleCont'), start: tr('start'), castle: tr('castleMode'), arcade: tr('arcadeMode'), options: tr('options'), lang: langTxt, scores: tr('hiTitle'), sections: tr('sections') };
    ids.map(id => LABEL[id]).forEach((m, i) => {
      const on = this.menu === i, y = my0 + i * msp, lang = ids[i] === 'lang';
      const col = on ? (lang && fx ? '#ffffff' : '#fce0a8') : lang ? '#d0b8e0' : ids[i] === 'sections' ? '#5c4a6c' : ids[i] === 'cont' ? '#fca070' : ids[i] === 'castle' || ids[i] === 'arcade' ? '#a4b4fc' : '#8c7a9c';
      if (on) { // Glut hinter dem gewählten Punkt
        const w = (I18N.cjk ? Font.width(m) : m.length * 6) + 24, gr = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
        gr.addColorStop(0, 'rgba(120,10,30,0)'); gr.addColorStop(0.5, `rgba(150,20,40,${0.42 + 0.12 * Math.sin(t * 0.1)})`); gr.addColorStop(1, 'rgba(120,10,30,0)');
        ctx.fillStyle = gr; ctx.fillRect(cx - w / 2, y - 2, w, msp);
      }
      this.bootText(ctx, m, cx, y, col, on ? '#400008' : '#000');
      if (on && (t >> 4) % 2 === 0) { const w = I18N.cjk ? Font.width(m) : m.length * 6 - 1; Sprites.draw(ctx, Sprites.S.heartS, Math.round(cx - w / 2 - 12), y - 1); }
    });
    if (tags.length) this.bootText(ctx, tags.join(' + '), cx, my0 + ni * msp + 1, '#58f898', '#000');
    // Steuerung im Kasten wie der Ladebalken
    const bx = Math.round(cx - bw / 2);
    ctx.fillStyle = 'rgba(6,2,10,0.74)'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#3c2848'; ctx.fillRect(bx, by, bw, 1); ctx.fillRect(bx, by + bh - 1, bw, 1); ctx.fillRect(bx, by, 1, bh); ctx.fillRect(bx + bw - 1, by, 1, bh);
    ctx.fillStyle = '#c89020'; for (const [ex, ey] of [[bx, by], [bx + bw - 1, by], [bx, by + bh - 1], [bx + bw - 1, by + bh - 1]]) { ctx.fillRect(ex - 1, ey, 3, 1); ctx.fillRect(ex, ey - 1, 1, 3); }
    lines.forEach(([l, c], i) => this.bootText(ctx, l, bx + 6, by + 4 + i * lh, i === 0 ? '#fce0a8' : /^#(a4e4fc|3cbcfc|58f898|00e8d8)$/i.test(c) ? '#fca070' : '#d0b8e0', '#000', 'left'));
    this.bootText(ctx, 'HI-SCORE ' + String(Math.max(this.hi, Scores.top())).padStart(6, '0'), 4, 3, '#8c7a9c', '#000', 'left'); // oben links, die Version oben rechts
    const pad = Input.padName;
    const foot = !Audio8.ready() && t > 90 ? tr('soundOn') : pad ? tr('padReady', pad) : '© 1691  NACHTMAHR';
    this.bootText(ctx, foot.replace('©', '(C)'), cx, 231, pad && Audio8.ready() ? '#fca070' : '#5c4a6c', '#000');
    if (window.BUILD && View.w >= 320) this.bootText(ctx, 'V' + window.BUILD, View.w - 3, 3, '#3c3050', null, 'right'); // wie im Ladebildschirm oben rechts
    if (rv < 14) { ctx.fillStyle = `rgba(255,248,240,${Math.max(0, 0.9 - rv * 0.065)})`; ctx.fillRect(0, 0, View.w, 240); } // das Weiß des Ladebildschirms blendet aus
  },

  // ---------------- Abschnittswahl (Testspielen): jeder Raum jeder Stage direkt anwählbar ----------------
  sectionList() {
    if (this.secList) return this.secList;
    const NAMES = { ship: 'SCHIFF', forest: 'WALD', courtyard: 'BURGHOF', foyer: 'EINGANGSHALLE', hall: 'HALLE', crypt: 'GRUFT', cave: 'HÖHLE', tower: 'UHRTURM', library: 'BIBLIOTHEK',
      glass: 'GLASTURM', gallery: 'GALERIE', bridge: 'BRÜCKE', vortex: 'STRUDEL', throne: 'THRONSAAL', ballroom: 'BALLSAAL', ice: 'EISHÖHLE', cathedral: 'SONNENKATHEDRALE', spire: 'SONNENTURM', expo: 'WINTERGARTEN' };
    const L = [];
    Levels.STAGES.forEach((st, s) => {
      L.push({ head: true, s, label: (s + 1) + '  ' + tr(st.nameKey) });
      st.rooms.forEach((r, i) => {
        let n = r.label || NAMES[r.theme] || r.theme.toUpperCase();
        if (r.bell) n = 'GLOCKENTURM'; else if (r.ents.some(e => e.type === 'tut')) n += ' (TUTORIAL)'; else if (r.ents.some(e => e.type === 'gate')) n += ' MIT TOR';
        if (r.arena) n += '  - BOSS'; else if (r.mini) n += '  - ZWISCHENGEGNER';
        L.push({ s, r: i, label: (s + 1) + '-' + (i + 1) + '  ' + n });
      });
    });
    return (this.secList = L);
  },
  updateSections(P, ingame = false) { // ingame: aus dem Pausenmenü – Held, Punkte und Leben bleiben, Enter führt zurück zur Pause
    const L = this.sectionList(), rooms = L.filter(e => !e.head);
    if (this.secSel === undefined) { let v = 0; try { v = parseInt(localStorage.getItem('nachtmahr.sec') || '0', 10) || 0; } catch (e) { /* privat */ } this.secSel = clamp(v, 0, rooms.length - 1); }
    if (P.up || P.down) { this.secSel = (this.secSel + (P.down ? 1 : rooms.length - 1)) % rooms.length; Audio8.sfx('select'); }
    if (P.left || P.right) { // ganze Stage weiter
      const s = rooms[this.secSel].s, ns = (s + (P.right ? 1 : Levels.STAGES.length - 1)) % Levels.STAGES.length;
      this.secSel = rooms.findIndex(e => e.s === ns); Audio8.sfx('select');
    }
    if (P.start && this.t > 8) { if (ingame) { this.go('pause'); this.pauseSel = this.pauseItems().indexOf('sec'); } else this.go('title'); Audio8.sfx('pause'); return; }
    if ((P.jump || P.attack) && this.t > 8) {
      const e = rooms[this.secSel];
      try { localStorage.setItem('nachtmahr.sec', String(this.secSel)); } catch (err) { /* privat */ }
      Audio8.init(); Audio8.sfx('bigItem');
      this.secGo = { e, ingame }; this.go('secload'); // erst die Ladeanzeige zeigen – der Aufbau des Abschnitts dauert spürbar
    }
  },
  drawSections(ctx, overlay = false) { // overlay: über dem eingefrorenen Spielbild (aus dem Pausenmenü)
    const cx = View.cx, L = this.sectionList(), rooms = L.filter(e => !e.head), sel = rooms[this.secSel || 0];
    if (!overlay) this.menuBg(ctx);
    ctx.fillStyle = overlay ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 32, View.w, overlay ? 208 : 176);
    this.big(ctx, tr('secTitle'), cx, 38, 2, LOGO, null, '#000');
    const idx = L.indexOf(sel), rows = 13, top = clamp(idx - 6, 0, Math.max(0, L.length - rows)), lx = Math.max(12, cx - 120);
    for (let k = 0; k < rows && top + k < L.length; k++) {
      const e = L[top + k], y = 58 + k * 11, on = e === sel;
      if (e.head) {
        Font.draw(ctx, e.label, lx, y, '#f8b800', { shadow: '#000' }); ctx.fillStyle = 'rgba(200,144,32,0.4)'; ctx.fillRect(lx, y + 8, 240, 1);
        if (Castle.on) { // Schloss: Erkundungsgrad der Region, rotes Siegel, wenn ihr Boss besiegt ist
          Font.draw(ctx, Math.floor(Castle.percent(e.s)) + '%', lx + 240, y, '#c8a0fc', { align: 'right', shadow: '#000' });
          const ar = Levels.STAGES[e.s].rooms.findIndex(d => d.arena);
          if (ar >= 0 && Castle.bossDone(e.s, ar)) { ctx.fillStyle = '#fc3c3c'; ctx.fillRect(lx + 200, y + 1, 5, 5); ctx.fillStyle = '#fce0a8'; ctx.fillRect(lx + 202, y + 3, 1, 1); }
        }
        continue;
      }
      if (on) { ctx.fillStyle = 'rgba(200,40,40,0.35)'; ctx.fillRect(lx + 4, y - 2, 244, 11); if ((this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, lx + 6, y - 1); }
      Font.draw(ctx, e.label, lx + 18, y, on ? '#fcfcfc' : '#a0a0b0', { shadow: '#000', wave: on ? 1.2 : 0, t: this.t });
      if (Castle.on) { const p = Castle.roomPercent(e.s, e.r); Font.draw(ctx, p + '%', lx + 240, y, p >= 100 ? '#f8b800' : p ? '#8c9cc8' : '#4c4c5c', { align: 'right', shadow: '#000' }); }
    }
    Font.draw(ctx, tr('secHelp'), cx, 212, '#7c7c8c', { align: 'center' });
  },

  drawOptions(ctx) {
    const cx = View.cx;
    this.menuBg(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(cx - 124, 38, 248, 168);
    ctx.fillStyle = '#c89020'; ctx.fillRect(cx - 124, 38, 248, 1); ctx.fillRect(cx - 124, 205, 248, 1); ctx.fillRect(cx - 118, 188, 236, 1);
    this.big(ctx, tr('options'), cx, 44, 2, LOGO, null, '#000');
    OPTION_ITEMS.forEach((it, i) => {
      const y = 64 + i * 14, on = this.optSel === i;
      if (on) { ctx.fillStyle = 'rgba(200,144,32,0.2)'; ctx.fillRect(cx - 118, y - 3, 236, 13); }
      Font.draw(ctx, tr(it.label), cx - 110, y, on ? '#fcfcfc' : '#9c9c9c', on ? { shadow: '#3c2008', wave: 1.2, t: this.t } : { shadow: '#000' });
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

  cap: (id) => id[0].toUpperCase() + id.slice(1),
  // Kulisse und Schrift des Ladebildschirms (boot.js) – Blutmond, Burg, Wolken, Blitze, Regen; einmal gebaut, je Bildbreite neu
  bootScene() {
    if (typeof bootEngine === 'undefined') return null;
    if (!this.bootBg) {
      const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d', { willReadFrequently: true }); return c; };
      const cv = document.createElement('canvas'); cv.width = View.w; cv.height = 240; // die Kulisse selbst: GPU-Leinwand, nur die Bauteile lesbar
      this.bootBg = bootEngine({ canvas: cv, mk, backdrop: true, lang: 'en', touch: false, build: '', progress: () => 1, jobsDone: () => true, emit: () => {}, raf: () => {} });
      this.bootBgW = 0;
    }
    if (this.bootBgW !== View.w) { this.bootBg.resize(View.w, 240); this.bootBgW = View.w; this.bootHead = null; }
    return this.bootBg;
  },
  menuBg(ctx, title = false) { // Kulisse des Ladebildschirms (mit den Titel-Lettern nur im Titelmenü)
    const bg = this.bootScene();
    if (!bg) { this.drawSkyScene(ctx); return null; }
    bg.title(title); bg.paint(); ctx.drawImage(bg.canvas, 0, 0); return bg;
  },
  bootText(ctx, s, x, y, col, sh = '#000', align = 'center') { // 5x7-Schrift des Ladebildschirms; CJK über die Spielschrift
    const B = this.bootBg;
    if (!B || I18N.cjk) { Font.draw(ctx, s, x, y, col, { align, shadow: sh }); return; }
    const n = B.norm(s), c = B.label(n, col, sh), w = n.length * 6 - 1;
    ctx.drawImage(c, Math.round(align === 'center' ? x - w / 2 : align === 'right' ? x - w : x), Math.round(y));
  },
  drawBootHeading(ctx, s, cx, y) { // glühende Lettern wie NACHTMAHR, wippend, mit Glut dahinter und Blut, das herabläuft
    const B = this.bootBg;
    if (!B || I18N.cjk) { this.big(ctx, s, cx, y, 2, LOGO, null, '#000'); return; }
    if (!this.bootHead || this.bootHead.s !== s) { // passt die Zeile nur mit Winzlettern, bricht sie am mittleren Leerzeichen um
      const n = B.norm(s), fit = (len) => Math.max(1, Math.min(3, Math.floor((View.w - 12) / (len * 7))));
      let parts = [n], bs = fit(n.length);
      if (bs < 2 && n.includes(' ')) {
        let best = -1; for (let i = 0; i < n.length; i++) if (n[i] === ' ' && (best < 0 || Math.abs(i - n.length / 2) < Math.abs(best - n.length / 2))) best = i;
        parts = [n.slice(0, best), n.slice(best + 1)]; bs = fit(Math.max(parts[0].length, parts[1].length));
      }
      this.bootHead = { s, B: bs, lines: parts.map(ln => B.heavy(ln, bs)) };
    }
    const H = this.bootHead, t = this.t, lh = 7 * H.B + H.B + 4, y0 = y - (H.lines.length - 1) * Math.round(lh * 0.4);
    let k0 = 0;
    H.lines.forEach((ln, li) => {
      const x0 = Math.round(cx - ln.w / 2), ly = y0 + li * lh;
      ln.letters.forEach((L, j) => {
        const i = k0 + j; if (!L) return;
        const X = x0 + L.x, Y = ly + Math.round(Math.sin(t * 0.06 + i * 0.75) * Math.max(1, H.B * 0.3)), mx = X + 3 * H.B, my = Y + 3.5 * H.B, r = 6 * H.B * (1 + 0.08 * Math.sin(t * 0.1 + i));
        const gl = ctx.createRadialGradient(mx, my, 0, mx, my, r); gl.addColorStop(0, `rgba(255,60,30,${0.22 + 0.3 * Math.max(0, 1 - t / 40)})`); gl.addColorStop(1, 'rgba(255,40,20,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gl; ctx.fillRect(mx - r, my - r, r * 2, r * 2); ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(L.c, X, Y);
        if (L.drip >= 0 && i % 3 === 1) { // Blut läuft von einem Fuß herab
          const len = Math.round(Math.min(H.B * 3, t * 0.04 * H.B)), dw = Math.max(1, Math.round(H.B / 2)), dx = X + L.drip + Math.round((H.B - dw) / 2), dy = Y + 7 * H.B + L.depth - 1;
          ctx.fillStyle = '#8c0c14'; ctx.fillRect(dx, dy, dw, len); ctx.fillStyle = '#d82820'; ctx.fillRect(dx, dy + len - 1, dw, 1);
          const k = (t + i * 37) % 120; if (len >= H.B * 3 && k < 40) { ctx.fillStyle = '#c41420'; ctx.fillRect(dx, dy + len + Math.round(k * k * 0.03), dw, dw); }
        }
      });
      k0 += ln.letters.length + 1;
    });
  },
  cap: (id) => id[0].toUpperCase() + id.slice(1),
  drawCharSel(ctx) {
    const cx = View.cx;
    this.menuBg(ctx);
    this.drawBootHeading(ctx, tr('choose'), cx, 18);
    // Karussell: der gewählte Held in der Mitte, die anderen daneben (gleitet beim Wechseln, passt auf jede Bildbreite)
    const sel = Math.max(0, HEROES.list.findIndex(d => d.id === Options.character));
    this.selX = this.selX === undefined ? sel : this.selX + (sel - this.selX) * 0.25;
    HEROES.list.forEach((d, i) => {
      const on = Options.character === d.id, pw = 134, px = Math.round(cx - pw / 2 + (i - this.selX) * (pw + 8)), py = 52, ph = 150, mid = px + pw / 2;
      if (px > View.w || px + pw < 0) return;
      ctx.fillStyle = on ? 'rgba(42,6,22,0.5)' : 'rgba(6,2,10,0.7)'; ctx.fillRect(px, py, pw, ph); // Rahmen wie der Ladebalken: dunkles Violett, goldene Zier
      ctx.fillStyle = on ? '#c89020' : '#3c2848';
      ctx.fillRect(px, py, pw, 1); ctx.fillRect(px, py + ph - 1, pw, 1); ctx.fillRect(px, py, 1, ph); ctx.fillRect(px + pw - 1, py, 1, ph);
      if (on) { ctx.fillStyle = '#fce0a8'; for (const [ex, ey] of [[px, py], [px + pw - 1, py], [px, py + ph - 1], [px + pw - 1, py + ph - 1]]) { ctx.fillRect(ex - 1, ey, 3, 1); ctx.fillRect(ex, ey - 1, 1, 3); } }
      const H = HEROES.get(d.id), spr = on ? H.walk[Math.floor(this.t / 5) % 8] : H.idle[Math.floor(this.t / 40) % 2];
      ctx.imageSmoothingEnabled = false;
      if (!on) ctx.globalAlpha = 0.7;
      ctx.drawImage(spr.c, mid - spr.c.width, py + 10, spr.c.width * 2, spr.c.height * 2);
      ctx.globalAlpha = 1;
      this.bootText(ctx, d.name, mid, py + 96, on ? '#fce0a8' : '#8c7a9c', on ? '#400008' : '#000');
      this.bootText(ctx, tr(d.id + 'Title'), mid, py + 108, on ? '#fc7460' : '#5c4a6c', '#14000c');
      tr(d.id + 'Desc').forEach((l, k) => this.bootText(ctx, l, mid, py + 121 + k * 11, on ? '#e8d4f0' : '#5c4a6c', '#14000c'));
      if (on && (this.t >> 4) % 2 === 0) Sprites.draw(ctx, Sprites.S.heartS, mid - 4, py + ph - 8);
    });
    const pulse = 0.55 + 0.45 * Math.sin(this.t * 0.1);
    ctx.globalAlpha = pulse; this.bootText(ctx, '<', 8, 124, '#fce0a8', '#400008', 'left'); this.bootText(ctx, '>', View.w - 8, 124, '#fce0a8', '#400008', 'right'); ctx.globalAlpha = 1;
    this.bootText(ctx, tr(Input.device === 'pad' ? 'selPad' : 'selKey'), cx, 214, '#d0b8e0', '#000');
  },

  drawIntro(ctx) {
    const cx = View.cx;
    this.menuBg(ctx);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 32, View.w, 176);
    const text = [...tr('intro'), '', ...tr('intro' + Game.cap(HEROES.def(Options.character).id))];
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
      ['', ''], [tr('end' + Game.cap(HEROES.def(Options.character).id)), '#f8b800'], [tr('endUntil'), '#f8b800'],
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
