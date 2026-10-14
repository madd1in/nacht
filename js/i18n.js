// Mehrsprachigkeit: alle Texte in DE / EN / FR / ES / JA / ZH. tr('schlüssel', ...werte) liefert Text oder Liste.
'use strict';

const I18N = (() => {
  const LANGS = ['de', 'en', 'fr', 'es', 'ja', 'zh'];
  const NAMES = { de: 'DEUTSCH', en: 'ENGLISH', fr: 'FRANÇAIS', es: 'ESPAÑOL', ja: '日本語', zh: '中文' };
  const Y = '#f8b800', G = '#bcbcbc', C = '#a4e4fc';
  const S = {
    // ---------------- Titel ----------------
    subtitle: { de: 'EIN VAMPIRJÄGER-ABENTEUER', en: 'A VAMPIRE HUNTER SAGA', fr: 'UNE SAGA DE CHASSEUR DE VAMPIRES', es: 'UNA SAGA DE CAZAVAMPIROS', ja: '吸血鬼ハンターの物語', zh: '吸血鬼猎人传说' },
    start: { de: 'SPIEL STARTEN', en: 'START GAME', fr: 'JOUER', es: 'JUGAR', ja: 'ゲームスタート', zh: '开始游戏' },
    options: { de: 'OPTIONEN', en: 'OPTIONS', fr: 'OPTIONS', es: 'OPCIONES', ja: 'オプション', zh: '选项' },
    tagEasy: { de: 'LEICHT', en: 'EASY', fr: 'FACILE', es: 'FÁCIL', ja: 'イージー', zh: '简单' },
    tagWhip: { de: 'MAX-PEITSCHE', en: 'MAX WHIP', fr: 'FOUET MAX', es: 'LÁTIGO MÁX', ja: '最強ムチ', zh: '满级鞭' },
    tagHearts: { de: 'HERZEN 99', en: 'HEARTS 99', fr: 'COEURS 99', es: 'CORAZONES 99', ja: 'ハート99', zh: '红心99' },
    soundOn: { de: 'KLICK ODER TASTE = TON AN', en: 'CLICK OR PRESS A KEY FOR SOUND', fr: 'CLIC OU TOUCHE = SON', es: 'CLIC O TECLA = SONIDO', ja: 'クリックでサウンドON', zh: '点击开启声音' },
    soundShort: { de: 'KLICK = TON AN', en: 'CLICK = SOUND ON', fr: 'CLIC = SON', es: 'CLIC = SONIDO', ja: 'クリックで音ON', zh: '点击开启声音' },
    padReady: { de: '{0} BEREIT', en: '{0} READY', fr: '{0} PRÊTE', es: '{0} LISTO', ja: '{0} 接続OK', zh: '{0} 已就绪' },
    padOn: { de: '{0} VERBUNDEN', en: '{0} CONNECTED', fr: '{0} CONNECTÉE', es: '{0} CONECTADO', ja: '{0} 接続', zh: '{0} 已连接' },
    padOff: { de: 'CONTROLLER GETRENNT', en: 'CONTROLLER DISCONNECTED', fr: 'MANETTE DÉCONNECTÉE', es: 'MANDO DESCONECTADO', ja: 'コントローラー切断', zh: '手柄已断开' },
    stickHint: { de: 'LINKE HÄLFTE: STEUERN', en: 'LEFT HALF: MOVE', fr: 'MOITIÉ GAUCHE : BOUGER', es: 'MITAD IZQUIERDA: MOVER', ja: '左半分: 移動', zh: '左半屏: 移动' },
    keys: {
      de: [['PFEILE  LAUFEN, DUCKEN, TREPPEN', Y], ['Z SPRINGEN (2X)  UNTEN+Z RUTSCHEN', G], ['X ANGRIFF+RICHTUNG  HALTEN=DREHEN', G], ['C SPEZIALWAFFE  HALTEN=HEIL. STURM', G], ['RINGE: SCHRÄG HOCH PEITSCHEN, PENDELN', C], ['ENTER PAUSE  M TON  F VOLLBILD', G]],
      en: [['ARROWS  MOVE, CROUCH, STAIRS', Y], ['Z JUMP (2X)  DOWN+Z SLIDE', G], ['X ATTACK+DIRECTION  HOLD=SPIN', G], ['C SUBWEAPON  HOLD=HOLY STORM', G], ['RINGS: WHIP DIAGONALLY UP, SWING', C], ['ENTER PAUSE  M SOUND  F FULLSCREEN', G]],
      fr: [['FLÈCHES  MARCHER, ACCROUPIR, ESCALIER', Y], ['Z SAUT (2X)  BAS+Z GLISSADE', G], ['X ATTAQUE+DIR.  MAINTENIR=TOURNOYER', G], ['C ARME SECONDAIRE  MAINT.=TEMPÊTE', G], ['ANNEAUX: FOUET EN DIAGONALE', C], ['ENTRÉE PAUSE  M SON  F PLEIN ÉCRAN', G]],
      es: [['FLECHAS  MOVER, AGACHARSE, ESCALERAS', Y], ['Z SALTO (2X)  ABAJO+Z DESLIZAR', G], ['X ATAQUE+DIRECCIÓN  MANTENER=GIRAR', G], ['C ARMA SECUNDARIA  MANTENER=TORMENTA', G], ['ANILLAS: LÁTIGO EN DIAGONAL', C], ['ENTER PAUSA  M SONIDO  F PANTALLA', G]],
      ja: [['矢印キー  移動・しゃがみ・階段', Y], ['Z ジャンプ(2回)  下+Z スライディング', G], ['X 攻撃+方向  長押しで回転', G], ['C サブウェポン  長押しで聖なる嵐', G], ['リング: 斜め上にムチで掴まる', C], ['ENTER ポーズ  M 音  F 全画面', G]],
      zh: [['方向键  移动、蹲下、楼梯', Y], ['Z 跳跃(2次)  下+Z 滑铲', G], ['X 攻击+方向  按住=旋转', G], ['C 副武器  按住=圣光风暴', G], ['圆环: 斜上方挥鞭摆荡', C], ['ENTER 暂停  M 声音  F 全屏', G]],
    },
    pad: {
      de: [['STICK LAUFEN/TREPPEN  A SPRINGEN (2X)', Y], ['X/B ANGRIFF+RICHTUNG  HALTEN=DREHEN', G], ['Y SPEZIALWAFFE  HALTEN=HEIL. STURM', G], ['UNTEN+A RUTSCHEN  RINGE: SCHRÄG HOCH', C], ['MENÜ PAUSE    ANSICHT TON', G]],
      en: [['STICK MOVE/STAIRS  A JUMP (2X)', Y], ['X/B ATTACK+DIRECTION  HOLD=SPIN', G], ['Y SUBWEAPON  HOLD=HOLY STORM', G], ['DOWN+A SLIDE  RINGS: DIAGONAL UP', C], ['MENU PAUSE    VIEW SOUND', G]],
      fr: [['STICK MARCHER  A SAUT (2X)', Y], ['X/B ATTAQUE+DIR.  MAINTENIR=TOURNOYER', G], ['Y ARME SECONDAIRE  MAINT.=TEMPÊTE', G], ['BAS+A GLISSADE  ANNEAUX: DIAGONALE', C], ['MENU PAUSE    AFFICHAGE SON', G]],
      es: [['STICK MOVER  A SALTO (2X)', Y], ['X/B ATAQUE+DIR.  MANTENER=GIRAR', G], ['Y ARMA SECUNDARIA  MANTENER=TORMENTA', G], ['ABAJO+A DESLIZAR  ANILLAS: DIAGONAL', C], ['MENÚ PAUSA    VISTA SONIDO', G]],
      ja: [['スティック 移動  A ジャンプ(2回)', Y], ['X/B 攻撃+方向  長押しで回転', G], ['Y サブウェポン  長押しで聖なる嵐', G], ['下+A スライディング  リング: 斜め上', C], ['MENU ポーズ  VIEW 音', G]],
      zh: [['摇杆 移动  A 跳跃(2次)', Y], ['X/B 攻击+方向  按住=旋转', G], ['Y 副武器  按住=圣光风暴', G], ['下+A 滑铲  圆环: 斜上方', C], ['MENU 暂停  VIEW 声音', G]],
    },
    // ---------------- Optionen ----------------
    optEasy: { de: 'LEICHT-MODUS', en: 'EASY MODE', fr: 'MODE FACILE', es: 'MODO FÁCIL', ja: 'イージーモード', zh: '简单模式' },
    optEasyH: { de: 'DOPPELTE LEBEN + DOPPELTER SCHADEN', en: 'DOUBLE HEALTH + DOUBLE DAMAGE', fr: 'VIE DOUBLE + DÉGÂTS DOUBLES', es: 'VIDA DOBLE + DAÑO DOBLE', ja: '体力2倍 + 攻撃力2倍', zh: '双倍生命 + 双倍伤害' },
    optWhip: { de: 'MAXIMALE PEITSCHE', en: 'MAX WHIP', fr: 'FOUET MAXIMUM', es: 'LÁTIGO MÁXIMO', ja: '最強ムチ', zh: '满级鞭子' },
    optWhipH: { de: 'MORGENSTERN AB SPIELBEGINN', en: 'MORNING STAR FROM THE START', fr: 'ÉTOILE DU MATIN DÈS LE DÉBUT', es: 'LUCERO DESDE EL INICIO', ja: '最初からモーニングスター', zh: '开局即获得晨星鞭' },
    optHearts: { de: 'UNENDLICH HERZEN', en: 'INFINITE HEARTS', fr: 'COEURS INFINIS', es: 'CORAZONES INFINITOS', ja: 'ハート無限', zh: '无限红心' },
    optHeartsH: { de: 'SPEZIALWAFFEN OHNE LIMIT', en: 'UNLIMITED SUBWEAPONS', fr: 'ARMES SECONDAIRES ILLIMITÉES', es: 'ARMAS SECUNDARIAS SIN LÍMITE', ja: 'サブウェポン使い放題', zh: '副武器无限使用' },
    optMusic: { de: 'MUSIK', en: 'MUSIC', fr: 'MUSIQUE', es: 'MÚSICA', ja: '音楽', zh: '音乐' },
    optMusicH: { de: 'PFEIL LINKS/RECHTS', en: 'ARROW LEFT/RIGHT', fr: 'FLÈCHE GAUCHE/DROITE', es: 'FLECHA IZQ./DER.', ja: '左右で調整', zh: '左右调整' },
    optVoice: { de: 'SPRACHAUSGABE', en: 'VOICE', fr: 'VOIX', es: 'VOZ', ja: '音声', zh: '语音' },
    optVoiceH: { de: 'ERZÄHLER, BOSSE, STAGES', en: 'NARRATOR, BOSSES, STAGES', fr: 'NARRATEUR, BOSS, NIVEAUX', es: 'NARRADOR, JEFES, NIVELES', ja: 'ナレーション・ボス・ステージ', zh: '旁白、首领、关卡' },
    optLang: { de: 'SPRACHE', en: 'LANGUAGE', fr: 'LANGUE', es: 'IDIOMA', ja: '言語', zh: '语言' },
    optLangH: { de: 'TEXT + STIMME', en: 'TEXT + VOICE', fr: 'TEXTE + VOIX', es: 'TEXTO + VOZ', ja: 'テキスト+音声', zh: '文字+语音' },
    optCrt: { de: 'RÖHRENLOOK', en: 'CRT LOOK', fr: 'EFFET CRT', es: 'EFECTO CRT', ja: 'ブラウン管', zh: '显像管效果' },
    optCrtH: { de: 'SCANLINES + VIGNETTE', en: 'SCANLINES + VIGNETTE', fr: 'LIGNES + VIGNETTE', es: 'LÍNEAS + VIÑETA', ja: '走査線 + 周辺減光', zh: '扫描线 + 暗角' },
    optFull: { de: 'VOLLBILD', en: 'FULLSCREEN', fr: 'PLEIN ÉCRAN', es: 'PANTALLA COMPLETA', ja: '全画面', zh: '全屏' },
    optFullH: { de: 'TASTE F SCHALTET JEDERZEIT UM', en: 'KEY F TOGGLES ANYTIME', fr: 'TOUCHE F À TOUT MOMENT', es: 'TECLA F EN CUALQUIER MOMENTO', ja: 'Fキーでいつでも切替', zh: '随时按F键切换' },
    optBack: { de: 'ZURÜCK', en: 'BACK', fr: 'RETOUR', es: 'VOLVER', ja: 'もどる', zh: '返回' },
    on: { de: 'AN', en: 'ON', fr: 'OUI', es: 'SÍ', ja: 'ON', zh: '开' },
    off: { de: 'AUS', en: 'OFF', fr: 'NON', es: 'NO', ja: 'OFF', zh: '关' },
    optNavPad: { de: 'KREUZ WÄHLEN  A ÄNDERN  MENÜ ZURÜCK', en: 'D-PAD SELECT  A CHANGE  MENU BACK', fr: 'CROIX CHOISIR  A CHANGER  MENU RETOUR', es: 'CRUCETA ELEGIR  A CAMBIAR  MENÚ VOLVER', ja: '十字で選択  Aで変更  MENUで戻る', zh: '十字键选择  A改变  MENU返回' },
    optNavKey: { de: 'PFEILE WÄHLEN  Z ÄNDERN  ENTER ZURÜCK', en: 'ARROWS SELECT  Z CHANGE  ENTER BACK', fr: 'FLÈCHES CHOISIR  Z CHANGER  ENTRÉE', es: 'FLECHAS ELEGIR  Z CAMBIAR  ENTER', ja: '矢印で選択  Zで変更  ENTERで戻る', zh: '方向键选择  Z改变  ENTER返回' },
    // ---------------- Heldenwahl ----------------
    choose: { de: 'WÄHLE DEINEN HELDEN', en: 'CHOOSE YOUR HERO', fr: 'CHOISIS TON HÉROS', es: 'ELIGE TU HÉROE', ja: 'ヒーローを選べ', zh: '选择你的英雄' },
    henrikTitle: { de: 'VAMPIRJÄGER', en: 'VAMPIRE HUNTER', fr: 'CHASSEUR DE VAMPIRES', es: 'CAZAVAMPIROS', ja: 'ヴァンパイアハンター', zh: '吸血鬼猎人' },
    henrikDesc: { de: ['MORGENSTERN-PEITSCHE', 'GROSSE REICHWEITE'], en: ['MORNING STAR WHIP', 'LONG REACH'], fr: ['FOUET ÉTOILE DU MATIN', 'GRANDE PORTÉE'], es: ['LÁTIGO LUCERO', 'GRAN ALCANCE'], ja: ['モーニングスター', 'リーチが長い'], zh: ['晨星鞭', '攻击距离远'] },
    ragnorTitle: { de: 'BARBAR AUS DEM NORDEN', en: 'BARBARIAN OF THE NORTH', fr: 'BARBARE DU NORD', es: 'BÁRBARO DEL NORTE', ja: '北の蛮族', zh: '北方蛮族' },
    ragnorDesc: { de: ['BREITSCHWERT', 'WEITER HIEBBOGEN'], en: ['BROADSWORD', 'WIDE SWING'], fr: ['ÉPÉE LARGE', 'GRAND ARC'], es: ['ESPADA ANCHA', 'GRAN ARCO'], ja: ['大剣', '広い斬撃'], zh: ['阔剑', '大范围斩击'] },
    selPad: { de: 'STICK WÄHLEN   A = LOS', en: 'STICK SELECT   A = GO', fr: 'STICK CHOISIR   A = GO', es: 'STICK ELEGIR   A = YA', ja: 'スティックで選択  A = 決定', zh: '摇杆选择  A = 确定' },
    selKey: { de: 'PFEILE WÄHLEN   Z / ENTER = LOS', en: 'ARROWS SELECT   Z / ENTER = GO', fr: 'FLÈCHES CHOISIR   Z / ENTRÉE = GO', es: 'FLECHAS ELEGIR   Z / ENTER = YA', ja: '矢印で選択  Z / ENTER = 決定', zh: '方向键选择  Z / ENTER = 确定' },
    // ---------------- Vorspann ----------------
    intro: {
      de: ['ANNO 1691.', 'ALLE HUNDERT JAHRE ERWACHT', 'GRAF NACHTMAHR UNTER DEM BLUTMOND.'],
      en: ['ANNO 1691.', 'EVERY HUNDRED YEARS, COUNT NACHTMAHR', 'RISES BENEATH THE BLOOD MOON.'],
      fr: ['AN DE GRÂCE 1691.', 'TOUS LES CENT ANS, LE COMTE NACHTMAHR', 'SE LÈVE SOUS LA LUNE DE SANG.'],
      es: ['AÑO 1691.', 'CADA CIEN AÑOS, EL CONDE NACHTMAHR', 'DESPIERTA BAJO LA LUNA DE SANGRE.'],
      ja: ['1691年。', '百年に一度、血の月の下で', 'ナハトマール伯爵が蘇る。'],
      zh: ['公元1691年。', '每隔一百年，纳赫特马尔伯爵', '便会在血月之下苏醒。'],
    },
    introHenrik: {
      de: ['HENRIK MORGENSTERN ERGREIFT', 'DIE PEITSCHE SEINER AHNEN', 'UND BETRITT DIE VERFLUCHTE BURG ...'],
      en: ['HENRIK MORGENSTERN TAKES UP', 'THE WHIP OF HIS ANCESTORS', 'AND ENTERS THE CURSED CASTLE ...'],
      fr: ['HENRIK MORGENSTERN SAISIT', 'LE FOUET DE SES ANCÊTRES ET PÉNÈTRE', 'DANS LE CHÂTEAU MAUDIT ...'],
      es: ['HENRIK MORGENSTERN EMPUÑA', 'EL LÁTIGO DE SUS ANCESTROS', 'Y ENTRA EN EL CASTILLO MALDITO ...'],
      ja: ['ヘンリク・モルゲンシュテルンは', '祖先の鞭を手に、', '呪われた城へ踏み込む……'],
      zh: ['亨里克·摩根施特恩', '手握祖传之鞭，', '踏入被诅咒的城堡……'],
    },
    introRagnor: {
      de: ['RAGNOR, BARBAR AUS DEM NORDEN,', 'ZIEHT SEIN BREITSCHWERT GEGEN DIE NACHT', 'UND STÜRMT DIE VERFLUCHTE BURG ...'],
      en: ['RAGNOR, BARBARIAN OF THE NORTH,', 'DRAWS HIS BROADSWORD', 'AGAINST THE NIGHT ...'],
      fr: ['RAGNOR, BARBARE DU NORD,', 'TIRE SA GRANDE ÉPÉE', 'CONTRE LA NUIT ...'],
      es: ['RAGNOR, BÁRBARO DEL NORTE,', 'DESENVAINA SU ESPADA', 'CONTRA LA NOCHE ...'],
      ja: ['北の蛮族ラグノルは、', '夜に向かって', '大剣を抜く……'],
      zh: ['北方蛮族拉格诺尔，', '向黑夜', '拔出他的巨剑……'],
    },
    next: { de: 'START = WEITER', en: 'START = SKIP', fr: 'START = PASSER', es: 'START = SALTAR', ja: 'START = スキップ', zh: 'START = 跳过' },
    // ---------------- Stages & Bosse ----------------
    stageNo: { de: 'STAGE 0{0}', en: 'STAGE 0{0}', fr: 'NIVEAU 0{0}', es: 'NIVEL 0{0}', ja: 'ステージ {0}', zh: '第{0}关' },
    stage1: { de: 'DER BURGHOF', en: 'THE COURTYARD', fr: 'LA COUR', es: 'EL PATIO', ja: '城の中庭', zh: '城堡庭院' },
    stage2: { de: 'DIE KATAKOMBEN', en: 'THE CATACOMBS', fr: 'LES CATACOMBES', es: 'LAS CATACUMBAS', ja: '地下墓所', zh: '地下墓穴' },
    stage3: { de: 'DER BERGFRIED', en: 'THE KEEP', fr: 'LE DONJON', es: 'LA TORRE', ja: '天守', zh: '主塔' },
    boss1: { de: 'RIESENFLEDERMAUS', en: 'GIANT BAT', fr: 'CHAUVE-SOURIS GÉANTE', es: 'MURCIÉLAGO GIGANTE', ja: '巨大コウモリ', zh: '巨型蝙蝠' },
    boss2: { de: 'KNOCHENRIESE', en: 'BONE GIANT', fr: "GÉANT D'OS", es: 'GIGANTE DE HUESO', ja: '骨の巨人', zh: '骸骨巨人' },
    boss3: { de: 'GRAF NACHTMAHR', en: 'COUNT NACHTMAHR', fr: 'COMTE NACHTMAHR', es: 'CONDE NACHTMAHR', ja: 'ナハトマール伯爵', zh: '纳赫特马尔伯爵' },
    lives: { de: 'LEBEN {0}', en: 'LIVES {0}', fr: 'VIES {0}', es: 'VIDAS {0}', ja: '残機 {0}', zh: '生命 {0}' },
    bossIs: { de: 'BOSS: {0}', en: 'BOSS: {0}', fr: 'BOSS : {0}', es: 'JEFE: {0}', ja: 'ボス: {0}', zh: '首领: {0}' },
    // ---------------- HUD & Spiel ----------------
    hudScore: { de: 'SCORE', en: 'SCORE', fr: 'SCORE', es: 'PTS', ja: 'SCORE', zh: 'SCORE' },
    hudTime: { de: 'ZEIT', en: 'TIME', fr: 'TEMPS', es: 'TIEMPO', ja: 'TIME', zh: 'TIME' },
    hudStage: { de: 'STAGE', en: 'STAGE', fr: 'NIV.', es: 'NIVEL', ja: 'STAGE', zh: 'STAGE' },
    hudPlayer: { de: 'SPIELER', en: 'PLAYER', fr: 'JOUEUR', es: 'JUGADOR', ja: 'PLAYER', zh: 'PLAYER' },
    hudEnemy: { de: 'GEGNER', en: 'ENEMY', fr: 'ENNEMI', es: 'ENEMIGO', ja: 'ENEMY', zh: 'ENEMY' },
    hudWhip: { de: 'PEITSCHE', en: 'WHIP', fr: 'FOUET', es: 'LÁTIGO', ja: 'WHIP', zh: 'WHIP' },
    hudSword: { de: 'SCHWERT', en: 'SWORD', fr: 'ÉPÉE', es: 'ESPADA', ja: 'SWORD', zh: 'SWORD' },
    scoreX: { de: 'PUNKTE X{0}', en: 'SCORE X{0}', fr: 'SCORE X{0}', es: 'PUNTOS X{0}', ja: 'スコア X{0}', zh: '得分 X{0}' },
    pause: { de: 'PAUSE', en: 'PAUSE', fr: 'PAUSE', es: 'PAUSA', ja: 'ポーズ', zh: '暂停' },
    pausePad: { de: 'MENÜ-TASTE DRÜCKEN', en: 'PRESS MENU', fr: 'APPUIE SUR MENU', es: 'PULSA MENÚ', ja: 'MENUで再開', zh: '按MENU继续' },
    pauseTouch: { de: 'TIPPEN = WEITER', en: 'TAP TO CONTINUE', fr: 'TOUCHE = REPRENDRE', es: 'TOCA = SEGUIR', ja: 'タップで再開', zh: '点击继续' },
    pauseKey: { de: 'START DRÜCKEN', en: 'PRESS START', fr: 'APPUIE SUR START', es: 'PULSA START', ja: 'STARTで再開', zh: '按START继续' },
    clear: { de: 'STAGE GESCHAFFT!', en: 'STAGE CLEAR!', fr: 'NIVEAU TERMINÉ !', es: '¡NIVEL SUPERADO!', ja: 'ステージクリア！', zh: '过关！' },
    timeBonus: { de: 'ZEITBONUS', en: 'TIME BONUS', fr: 'BONUS TEMPS', es: 'BONO TIEMPO', ja: 'タイムボーナス', zh: '时间奖励' },
    heartBonus: { de: 'HERZBONUS', en: 'HEART BONUS', fr: 'BONUS COEURS', es: 'BONO CORAZÓN', ja: 'ハートボーナス', zh: '红心奖励' },
    cont: { de: 'WEITERSPIELEN', en: 'CONTINUE', fr: 'CONTINUER', es: 'CONTINUAR', ja: 'コンティニュー', zh: '继续' },
    toTitle: { de: 'ZUM TITEL', en: 'TITLE SCREEN', fr: 'ÉCRAN TITRE', es: 'MENÚ PRINCIPAL', ja: 'タイトルへ', zh: '返回标题' },
    plusLife: { de: '+LEBEN', en: '+LIFE', fr: '+VIE', es: '+VIDA', ja: '+回復', zh: '+生命' },
    riposte: { de: 'KONTER!', en: 'PARRY!', fr: 'PARADE !', es: '¡PARADA!', ja: 'はじき返し！', zh: '反击！' },
    continueQ: { de: 'WEITERSPIELEN?', en: 'CONTINUE?', fr: 'CONTINUER ?', es: '¿CONTINUAR?', ja: 'コンティニュー？', zh: '继续？' },
    hurry: { de: 'BEEILUNG!', en: 'HURRY UP!', fr: 'VITE !', es: '¡DEPRISA!', ja: '急げ！', zh: '快点！' },
    checkpoint: { de: 'CHECKPOINT', en: 'CHECKPOINT', fr: 'SAUVEGARDE', es: 'GUARDADO', ja: 'チェックポイント', zh: '检查点' },
    pressStart: { de: 'START DRÜCKEN', en: 'PRESS START', fr: 'APPUIE SUR START', es: 'PULSA START', ja: 'スタートを押せ', zh: '按开始键' },
    // ---------------- Abspann ----------------
    ending: {
      de: ['DER BLUTMOND VERBLASST.', 'GRAF NACHTMAHR IST BESIEGT,', 'SEINE BURG ZERFÄLLT ZU STAUB.'],
      en: ['THE BLOOD MOON FADES.', 'COUNT NACHTMAHR IS DEFEATED,', 'HIS CASTLE CRUMBLES TO DUST.'],
      fr: ['LA LUNE DE SANG PÂLIT.', 'LE COMTE NACHTMAHR EST VAINCU,', 'SON CHÂTEAU TOMBE EN POUSSIÈRE.'],
      es: ['LA LUNA DE SANGRE SE DESVANECE.', 'EL CONDE NACHTMAHR HA CAÍDO,', 'SU CASTILLO SE HACE POLVO.'],
      ja: ['血の月は消えゆく。', 'ナハトマール伯爵は滅び、', '城は塵となって崩れ去った。'],
      zh: ['血月消逝。', '纳赫特马尔伯爵已被击败，', '他的城堡化为尘土。'],
    },
    endHenrik: { de: 'HENRIK MORGENSTERN KEHRT HEIM -', en: 'HENRIK MORGENSTERN RETURNS HOME -', fr: 'HENRIK MORGENSTERN RENTRE CHEZ LUI -', es: 'HENRIK MORGENSTERN VUELVE A CASA -', ja: 'ヘンリクは故郷へ帰る―', zh: '亨里克回到了故乡——' },
    endRagnor: { de: 'RAGNOR ZIEHT WEITER GEN NORDEN -', en: 'RAGNOR RIDES ON TO THE NORTH -', fr: 'RAGNOR REPART VERS LE NORD -', es: 'RAGNOR PARTE HACIA EL NORTE -', ja: 'ラグノルは北へ旅立つ―', zh: '拉格诺尔向北方远去——' },
    endUntil: { de: 'BIS ZUM NÄCHSTEN JAHRHUNDERT ...', en: 'UNTIL THE NEXT CENTURY ...', fr: "JUSQU'AU PROCHAIN SIÈCLE ...", es: 'HASTA EL PRÓXIMO SIGLO ...', ja: '次の百年まで……', zh: '直到下一个世纪……' },
    credits: { de: 'PROGRAMM, GRAFIK, MUSIK', en: 'CODE, GRAPHICS, MUSIC', fr: 'CODE, GRAPHISMES, MUSIQUE', es: 'CÓDIGO, GRÁFICOS, MÚSICA', ja: 'プログラム・グラフィック・音楽', zh: '程序、美术、音乐' },
    madeWith: { de: 'ERSTELLT MIT CLAUDE CODE', en: 'MADE WITH CLAUDE CODE', fr: 'CRÉÉ AVEC CLAUDE CODE', es: 'HECHO CON CLAUDE CODE', ja: 'CLAUDE CODEで制作', zh: '使用 CLAUDE CODE 制作' },
    voiceBy: { de: 'STIMME: ELEVENLABS', en: 'VOICE: ELEVENLABS', fr: 'VOIX : ELEVENLABS', es: 'VOZ: ELEVENLABS', ja: '音声: ELEVENLABS', zh: '配音: ELEVENLABS' },
    finalScore: { de: 'ENDPUNKTZAHL {0}', en: 'FINAL SCORE {0}', fr: 'SCORE FINAL {0}', es: 'PUNTUACIÓN FINAL {0}', ja: 'ファイナルスコア {0}', zh: '最终得分 {0}' },
    thanks: { de: 'DANKE FÜRS SPIELEN!', en: 'THANKS FOR PLAYING!', fr: "MERCI D'AVOIR JOUÉ !", es: '¡GRACIAS POR JUGAR!', ja: 'プレイありがとう！', zh: '感谢游玩！' },
    // ---------------- Gesprochene Zeilen (Text für die Browser-Stimme, falls keine Aufnahme vorliegt) ----------------
    'v.title': { de: 'Nachtmahr. Der Blutmond erwacht.', en: 'Nachtmahr. The blood moon awakens.', fr: "Nachtmahr. La lune de sang s'éveille.", es: 'Nachtmahr. La luna de sangre despierta.', ja: 'ナハトマール。血の月が目覚める。', zh: '纳赫特马尔。血月苏醒。' },
    'v.intro': { de: 'Anno 1691. Alle hundert Jahre erwacht Graf Nachtmahr unter dem Blutmond.', en: 'Anno 1691. Every hundred years, Count Nachtmahr rises beneath the blood moon.', fr: 'An de grâce 1691. Tous les cent ans, le comte Nachtmahr se lève sous la lune de sang.', es: 'Año 1691. Cada cien años, el conde Nachtmahr despierta bajo la luna de sangre.', ja: '1691年。百年に一度、血の月の下でナハトマール伯爵が蘇る。', zh: '公元1691年。每隔一百年，纳赫特马尔伯爵便会在血月之下苏醒。' },
    'v.henrik': { de: 'Henrik Morgenstern ergreift die Peitsche seiner Ahnen und betritt die verfluchte Burg.', en: 'Henrik Morgenstern takes up the whip of his ancestors and enters the cursed castle.', fr: 'Henrik Morgenstern saisit le fouet de ses ancêtres et pénètre dans le château maudit.', es: 'Henrik Morgenstern empuña el látigo de sus ancestros y entra en el castillo maldito.', ja: 'ヘンリク・モルゲンシュテルンは祖先の鞭を手に、呪われた城へ踏み込む。', zh: '亨里克·摩根施特恩手握祖传之鞭，踏入被诅咒的城堡。' },
    'v.ragnor': { de: 'Ragnor, Barbar aus dem Norden, zieht sein Breitschwert gegen die Nacht.', en: 'Ragnor, barbarian of the north, draws his broadsword against the night.', fr: 'Ragnor, barbare du Nord, tire sa grande épée contre la nuit.', es: 'Ragnor, bárbaro del norte, desenvaina su espada contra la noche.', ja: '北の蛮族ラグノルは、夜に向かって大剣を抜く。', zh: '北方蛮族拉格诺尔，向黑夜拔出他的巨剑。' },
    'v.stage1': { de: 'Stage eins. Der Burghof.', en: 'Stage one. The castle courtyard.', fr: 'Niveau un. La cour du château.', es: 'Nivel uno. El patio del castillo.', ja: 'ステージ1。城の中庭。', zh: '第一关。城堡庭院。' },
    'v.stage2': { de: 'Stage zwei. Die Katakomben.', en: 'Stage two. The catacombs.', fr: 'Niveau deux. Les catacombes.', es: 'Nivel dos. Las catacumbas.', ja: 'ステージ2。地下墓所。', zh: '第二关。地下墓穴。' },
    'v.stage3': { de: 'Stage drei. Der Bergfried.', en: 'Stage three. The keep.', fr: 'Niveau trois. Le donjon.', es: 'Nivel tres. La torre del homenaje.', ja: 'ステージ3。天守。', zh: '第三关。主塔。' },
    'v.boss1': { de: 'Die Riesenfledermaus!', en: 'The giant bat!', fr: 'La chauve-souris géante !', es: '¡El murciélago gigante!', ja: '巨大コウモリ！', zh: '巨型蝙蝠！' },
    'v.boss2': { de: 'Der Knochenriese!', en: 'The bone giant!', fr: "Le géant d'os !", es: '¡El gigante de hueso!', ja: '骨の巨人！', zh: '骸骨巨人！' },
    'v.boss3': { de: 'Graf Nachtmahr!', en: 'Count Nachtmahr!', fr: 'Le comte Nachtmahr !', es: '¡El conde Nachtmahr!', ja: 'ナハトマール伯爵！', zh: '纳赫特马尔伯爵！' },
    'v.taunt': { de: 'Narr! Spüre die wahre Macht der Nacht!', en: 'Fool! Feel the true power of the night!', fr: 'Insensé ! Goûte au vrai pouvoir de la nuit !', es: '¡Necio! ¡Siente el verdadero poder de la noche!', ja: '愚か者め！夜の真の力を思い知れ！', zh: '愚蠢！感受黑夜真正的力量吧！' },
    'v.clear': { de: 'Stage geschafft!', en: 'Stage clear!', fr: 'Niveau terminé !', es: '¡Nivel superado!', ja: 'ステージクリア！', zh: '过关！' },
    'v.gameover': { de: 'Game Over.', en: 'Game over.', fr: 'Partie terminée.', es: 'Fin del juego.', ja: 'ゲームオーバー。', zh: '游戏结束。' },
    'v.ending': { de: 'Der Blutmond verblasst. Graf Nachtmahr ist besiegt. Bis zum nächsten Jahrhundert.', en: 'The blood moon fades. Count Nachtmahr is defeated. Until the next century.', fr: "La lune de sang pâlit. Le comte Nachtmahr est vaincu. Jusqu'au prochain siècle.", es: 'La luna de sangre se desvanece. El conde Nachtmahr ha sido derrotado. Hasta el próximo siglo.', ja: '血の月は消えゆく。ナハトマール伯爵は滅びた。次の百年まで。', zh: '血月消逝。纳赫特马尔伯爵已被击败。直到下一个世纪。' },
  };
  function t(key, ...args) {
    const e = S[key];
    if (!e) return key;
    const v = e[Options.lang] ?? e.en ?? e.de;
    return typeof v === 'string' ? v.replace(/\{(\d)\}/g, (_, i) => args[i]) : v;
  }
  // Standardsprache aus dem Browser (nur beim allerersten Start)
  function detect() {
    const l = (navigator.languages && navigator.languages[0]) || navigator.language || 'de';
    const k = l.slice(0, 2).toLowerCase();
    return LANGS.includes(k) ? k : 'en';
  }
  return { LANGS, NAMES, t, detect, get cjk() { return Options.lang === 'ja' || Options.lang === 'zh'; } };
})();
const tr = I18N.t;
