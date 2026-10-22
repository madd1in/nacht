# NACHTMAHR → Schloss-Modus im Stil von *Symphony of the Night*

Stand: 2026-10-21. Ziel: aus den 7 linearen Kapiteln (28 Räume) ein zusammenhängendes Schloss machen, das man frei
erkundet: Relikte schalten Moves frei und öffnen Gebiete, Bosse bewachen Regionen, eine Karte zeigt den Erkundungsgrad,
dazu eine leichte RPG-Schicht. Grafik, Engine, Räume und Gegner bleiben; der Arcade-Modus (Kapitel, Zeit, Leben,
Highscore) bleibt unverändert daneben bestehen. Beide Modi teilen sich die Räume aus `js/levels.js`.

## 1. Ausgangslage im Code

| Baustein | Heute | Für das Schloss |
|---|---|---|
| `js/levels.js` | `room(w, theme, h)` mit `start`, **einem** Ausgang (`exit(x)` rechts oder `exitAt(...)` oben), `arena(boss)` am Raumende; `STAGES` = 7 Kapitel mit `rooms[]` | Räume bekommen eine feste `id` und mehrere Türen; `STAGES` bleibt für den Arcade-Modus |
| `js/world.js` `loadRoom(stage, roomIdx)` | setzt den Helden auf `def.start`; Ausgangszone → `Game.nextRoom()` → nächster Index | `loadRoom(roomId, doorId)`: Held erscheint an der Gegentür, Blickrichtung in den Raum |
| `js/game.js` | Zustände `title … card → play ⇄ pause → fade → clear`; Pause = WEITER / LEICHT / ABSCHNITT / TITEL | neue Zustände `map`, später `equip`/`status`; kein Kapitelwechsel, keine Zeit, keine Leben |
| `js/entities.js` `Player` | alle Moves sind immer da: Doppelsprung (`canDouble`, Z. 391), Dash/Luft-Dash (`startDash`, Z. 339), Wandsprung (`wallJump`, Z. 388), Kante packen (Z. 482), Ring-Pendeln (Z. 701), Rutschen | Moves an Relikte koppeln: `p.has('dash')` an genau diesen Stellen |
| Engelsstatuen (`Statue`, `js/props.js`) | Kontrollpunkt im Raum, heilt 37,5 % | bleiben Rücksetzpunkte; Speichern übernehmen eigene Speicherräume |
| `Relic`-Prop | Sockel mit Fund (`oneUp`, `heartB`) | derselbe Sockel trägt die Bewegungs-Relikte |

## 2. Ein Schloss statt sieben Kapiteln

### Regionen

```
                         BERGFRIED-KRONE:  Brücke ── Ballsaal ── Thronsaal [GRAF]
                                              │
                                          Glasturm ↑
                                              │
  SONNENKATHEDRALE                        Seelenstrudel ◄── Siegeltor (5 Siegel)
  Dach [SONNENWÄCHTER]                        │
     │ Sonnenturm ↑                           │
  Kathedrale ── Uhrturm ↑ ── Bibliothek ↑ ── Marmorgalerie [MEDUSA] ── Bergfried-Turm
                                                                            │
                                                     Glockenturm ↑ ─────────┘
                                                          │ (Sims, Doppelsprung)
  Prolog: Tutorial-Schiff ► Schiff ► Wald ► BURGHOF ── EINGANGSHALLE [S] ── Große Halle [RIESENFLEDERMAUS] ── Glastür ── WINTERGARTEN:
                                                          │ Kellertreppe              Palmenhaus ── Maschinenhalle ── Kuppel ↑ ── [MENSCHENFALLE]
                                                          ▼
  KATAKOMBEN:  Höhlensee ── Brunnenschacht ↑ ── Eishöhle ── Eisturm ↓ ── Gruft [KNOCHENRIESE] ── Gruftaufzug ↑ (Abkürzung zur Kellertreppe)
```

Die Eingangshalle wird zum Knotenpunkt wie der Eingang in SotN: geradeaus die Große Halle, oben über den Galerie-Sims
der Glockenturm, unten eine neue Kellertreppe in die Katakomben, in der Mitte das versiegelte Tor zum Thron.

### Türen (alle in beide Richtungen, sofern nicht anders vermerkt)

| Tür | Seite A | Seite B | Bedingung |
|---|---|---|---|
| Wald → Burghof | Wald, rechts | Burghof, links | Prolog-Ende; zurück nur bis zur Mole (Schiff legt ab) |
| Burghof ↔ Eingangshalle | Burghof, rechts (Torbogen, rutschen) | Eingangshalle, unten links | – |
| Eingangshalle ↔ Große Halle | Eingangshalle, unten rechts | Große Halle, links | – |
| Eingangshalle ↔ Glockenturm | Galerie-Sims oben (31,7) | Glockenturm, unten links | Doppelsprung |
| Glockenturm ↔ Bergfried-Turm | Glockenturm, oben rechts | Bergfried-Turm, links | – |
| Bergfried-Turm ↔ Marmorgalerie | rechts | links | – |
| Marmorgalerie ↔ Bibliothek | Galerie rechts (hinter Medusa) | Bibliothek, unten links | Wandsprung (im Raum) |
| Bibliothek ↔ Uhrturm | Bibliothek, oben rechts | Uhrturm, unten links | – |
| Uhrturm ↔ Kathedrale | Uhrturm, oben | Kathedrale, links | – |
| Kathedrale ↔ Sonnenturm ↔ Dach | wie heute, plus Rückweg | | Ring, Wandsprung, Dash |
| Eingangshalle ↔ Kellertreppe (neu) ↔ Höhlensee | Eingangshalle unten | Höhlensee, links | Dash (See) |
| Höhlensee ↔ Brunnenschacht ↔ Eishöhle | wie heute, plus Rückweg | | – |
| Eishöhle → Eisturm → Gruft | Eishöhle rechts, Eisturm-Fuß | Gruft links | **Einbahn** (Rutschpartie abwärts) |
| Gruft ↔ Gruftaufzug (neu) ↔ Kellertreppe | Gruft rechts (hinter dem Knochenriesen) | Kellertreppe | Rückweg für den Eisturm |
| Große Halle ↔ Glastür ↔ Palmenhaus | Große Halle rechts (hinter der Fledermaus) | Palmenhaus links | Glasschlüssel |
| Palmenhaus ↔ Maschinenhalle ↔ Kuppel-Aufstieg ↔ Kuppel | wie heute, plus Rückweg | | – |
| Eingangshalle ↔ Seelenstrudel | Siegeltor in der Hallenmitte | Strudel links | 5 Siegel |
| Strudel ↔ Glasturm ↔ Brücke ↔ Ballsaal ↔ Thronsaal | wie heute, plus Rückweg | | Ring, Dash |

Einbahn-Stellen und ihr Rückweg:

- **Eisturm** (Rutschpartie abwärts): Rückweg über den neuen Gruftaufzug.
- **Brücke** (bricht hinter dem Helden weg): nur beim ersten Überqueren; danach bleiben die Lücken, mit Dash in beide Richtungen schaffbar.
- **Schiff und Seilrutschen**: Prolog, nicht wieder betretbar. Die Mole am Waldrand bleibt als Sackgasse.
- Bröckelnde Steine (`Crumble` hat `home`) und Aufzüge pendeln schon heute zurück; das reicht für den Rückweg.

### Bosse und Arenen

Arenen liegen heute in den letzten `View.w` Pixeln eines Raums (`View.w` schwankt zwischen 256 und 640). Im Schloss
bekommt jede Arena eine zweite Tür hinter dem Boss, die sich nach dem Sieg öffnet. Der Sieg wird im Spielstand
gemerkt (`flags.boss_gbat` usw.), damit der Boss beim nächsten Besuch nicht wieder erscheint (heute nur `W.miniDone`
für die laufende Stage).

## 3. Speicherräume

- Neue Mini-Räume (16×13 Kacheln = 1 Kartenzelle) mit einer **roten** Engelsstatue (Variante von `Statue`): volle
  Heilung, Spielstand schreiben, auf der Karte rot wie in SotN.
- 8 Stück: Burghof, vor Medusa, Kellertreppe, vor der Gruft, Uhrturm→Kathedrale, vor dem Dach, Palmenhaus-Eingang, vor dem Thron.
- Die blauen Statuen in den Räumen bleiben Rücksetzpunkte: normal führt der Tod zum letzten Speicherraum (SotN),
  im Leicht-Modus zurück zur letzten Statue.
- Später: 3–4 Warp-Spiegel in Speicherräumen gegen lange Rückwege.

## 4. Karte

- Raster aus Zellen zu 16×13 Kacheln (ungefähr ein Bildschirm). Eine Zelle wird aufgedeckt, sobald der Held sie betritt.
- Darstellung wie in SotN: betretene Zellen blau, Raumgrenzen weiß, Türen gold, Speicherräume rot, Bosse markiert, Held blinkt.
- Erkundungsgrad in Prozent. Es zählen nur Zellen mit Stand- oder Fundstelle (Boden unter Luft, Treppen, Kerzen,
  Truhen, Ringe, Aufzüge), damit 100 % erreichbar sind; reine Himmelszellen über dem Schiff zählen nicht.
- Später: Relikt „Schlosskarte" (beim Bibliothekar) zeigt nicht betretene Räume grau; eigene Kartentaste
  (Xbox „Ansicht", heute Ton – Ton wandert ins Optionsmenü).

**Prototyp in diesem Schritt:** siehe Abschnitt 9.

## 5. Relikte schalten Moves frei

Der Prolog auf dem Schiff bleibt das Tutorial mit allen Moves. Am Burgtor reißt der Fluch des Grafen dem Helden die
Relikte vom Leib, sie verstreuen sich im Schloss (wie Alucard bei Tod). Grundausstattung: Laufen, Springen, Peitsche,
Rutschen, Kante packen, Spezialwaffe.

| Relikt | Move | Fundort | Öffnet |
|---|---|---|---|
| Rabenfeder | Doppelsprung | Riesenfledermaus (Große Halle) | Galerie-Sims → Glockenturm |
| Schattenmantel | Dash + Luft-Dash | Medusa (Marmorgalerie) | Höhlensee (9 Kacheln Wasser), Brücke |
| Enterhaken | Ring-Pendeln | Versteck in der Eishöhle | Eisturm, Kathedrale, Strudel |
| Katzenkralle | Wandsprung | Knochenriese (Gruft) | Bibliothek, Uhrturm, Sonnenturm |
| Glasschlüssel | – | Sonnenwächter (Dach) | Glastür → Wintergarten |
| Siegel I–V | – | je ein Boss | Siegeltor → Thron |

Umsetzung: `Player.has(relic)` (immer `true` im Arcade-Modus) an den fünf Stellen in `entities.js`. Die Sperren
stehen schon in den Räumen: Wandsprung-Schächte im Glockenturm und in der Bibliothek, Dash-Lücken im Höhlensee und auf
der Brücke, Ringe über Schluchten. Der Reliktsockel ist der vorhandene `Relic`-Prop mit neuem `loot`.

## 6. RPG-Schicht

- **EXP / Level:** jeder Gegnertyp gibt EXP (Basiswert × Regionsstufe). Bedarf je Stufe `20·L² + 10·L`
  (L2: 30, L5: 550, L10: 2100, L20: 8200). Aufstieg: +5 HP, +2 MP, +1 STR, +1 CON, volle Heilung, „LEVEL UP!".
- **HP / MP:** HP ersetzt die heutige Lebensleiste (Leicht-Modus verdoppelt weiter). MP regeneriert langsam und
  bezahlt den Heiligen Sturm und den Ladeangriff (heute 10 Herzen). Herzen bleiben Munition der Spezialwaffen.
  Schadenszahlen über `W.popup`.
- **Ausrüstung:** Waffe (heldenspezifisch: Peitsche, Schwert, Hellebarde; die heutigen Peitschenstufen `p.whip`
  werden Waffenstufen), Kopf, Rüstung, Umhang, 2× Talisman.
- **Drops:** Gegner bekommen Droptabellen (häufig/selten, Glück erhöht die Chance); Kerzen und Truhen behalten
  ihre heutigen Drops. Gold (`$`) wird beim Bibliothekar am Lesepult ausgegeben: Tränke, Schlosskarte, Ausrüstung.
- **Menü:** Pause → KARTE / AUSRÜSTUNG / RELIKTE / STATUS. Punkte, Zeit, Leben und Rang gibt es nur im Arcade-Modus.

## 7. Kapitel → Regionen

| Kapitel heute | Region im Schloss | Boss | Belohnung |
|---|---|---|---|
| 1 Die Ankunft | Prolog (linear) | Tentakel (Zwischengegner) | – (Tutorial, dann Fluch am Tor) |
| 2 Der Burghof | Burgtor + Glockenturm | Riesenfledermaus | Rabenfeder, Siegel I |
| 4 Der Bergfried | Westtürme (Bergfried-Turm, Galerie, Bibliothek, Uhrturm) | Medusa | Schattenmantel, Siegel II |
| 3 Die Katakomben | Katakomben | Knochenriese | Katzenkralle, Siegel III |
| 5 Die Sonnenkathedrale | Sonnenkathedrale | Sonnenwächter | Glasschlüssel, Siegel IV |
| 6 Der Wintergarten | Wintergarten | Menschenfalle | Siegel V |
| 7 Der Thron der Nacht | Bergfried-Krone | Graf Nachtmahr | Ende, Bonus bei 100 % |

Medusa rückt vor den Knochenriesen; die Regionsstufe der Gegner gleicht das aus. Musik läuft pro Region weiter wie
heute pro Kapitel (`W.songName()`), Regionsname als Einblendung beim ersten Betreten statt der Kapitelkarte.

## 8. Risiken

1. **Spielstände:** `localStorage` kann leer sein (privater Modus, gelöschte Daten, Xbox Edge räumt auf), Schreiben
   ist synchron. Der Prototyp speichert unter `stage-id:raum-index`; wird `levels.js` umsortiert, verrutschen die
   Kartendaten. Darum ab Phase 1 feste Raum-IDs, ein Versionsfeld mit Migration, mehrere Slots und ein
   Export-Code als Sicherung. Klein halten (Bitsets statt Listen).
2. **Leistung auf Handy und Xbox:** heute wird beim Kapitelstart das ganze Kapitel vorgebaut (`prewarmStage`).
   Mit Türen zwischen beliebigen Räumen drohen Ruckler am Raumwechsel. Abhilfe: Nachbarräume in Leerlauf-Frames
   vorbauen (`runWarm` gibt es schon), LRU-Cache für gebaute Räume, Karte in eine Offscreen-Leinwand cachen und nur bei
   neuen Zellen neu zeichnen, `localStorage` nur bei neuen Zellen und beim Speichern schreiben.
3. **Test-Bots:** `clip/regress.js` läuft die Kapitel linear ab. Für das Schloss braucht es (a) einen Tür-Test
   A→B→A für jedes Türpaar, (b) einen Erreichbarkeits-Prüfer (Breitensuche über den Türgraphen mit Relikt-Bedingungen:
   jedes Relikt ist erreichbar, bevor es gebraucht wird; keine Einbahn ohne Rückweg), (c) Bots für jeden Raum in
   beiden Richtungen (`Input.setDemo`), (d) Speichern/Laden im Kreis, (e) den Karten-Test aus diesem Prototyp.
4. **Leveldesign:** alle Räume sind von links unten nach rechts/oben gebaut. Rückwärts fehlen Spawnpunkte, Hinweise
   zeigen in die falsche Richtung, Arenen hängen am rechten Rand mit `camLock`. Das ist der größte Brocken.
5. **Balance:** ohne Zeitlimit und Leben fällt der Arcade-Druck weg; die Kapitel-Reihenfolge ändert sich. EXP-Kurve
   und Regionsstufen müssen das tragen.
6. **Umfang:** neue Texte in 6 Sprachen, Sprachausgabe für Relikte und Regionen, Musik je Region.
7. **Arcade-Modus nicht beschädigen:** jede Schloss-Logik hinter `Castle.on`; der Arcade-Regressionstest bleibt Pflicht.

## 9. Fahrplan

| Phase | Inhalt | Fertig, wenn |
|---|---|---|
| **0 (erledigt)** | `?castle`: Pause → KARTE, betretene Zellen aufdecken, Heldenposition, Erkundungsgrad, Speicherung in `localStorage` | Karte im Browser getestet, Arcade unverändert |
| **1 (Prototyp erledigt)** | Kapitel werden Regionen eines Schlosses: Türen in beide Richtungen, Knoten Eingangshalle (Keller-, Turm-, Siegeltor), Wege hinter den Bossen, Einbahnen mit Rückweg, eine Karte für das ganze Schloss, Bosse geben Siegel und bleiben besiegt, kein Zeitlimit | alle Regionen frei begehbar, Thron hinter 5 Siegeln |
| **1b (teilweise erledigt)** | erledigt: Speicherkammern mit Spielstand, „Fortsetzen" im Titel und nach Game Over, Warpkammern mit Schnellreise über die Karte. Offen: feste Raum-IDs, Regionsmusik ohne Neustart, Spielstand-Slots | Spielstand überlebt Umsortieren von `levels.js` |
| 2 Relikte | `Player.has()`, Fluch-Szene, Reliktsockel, Erreichbarkeits-Prüfer | ganzes Schloss ohne Softlock durchspielbar |
| **3 RPG (teilweise erledigt)** | erledigt: EXP/Stufe mit LEVEL UP, max. HP/STR/CON je Stufe, Schadenszahlen, Beute, Statusbildschirm, Stufe im Spielstand. Offen: MP, Ausrüstungsmenü, Bibliothekar-Shop | Statusbildschirm, Shop |
| 4 Bosse & Siegel | Arenen mit Hintertür, Siegeltor, Ende, neue Verbindungsräume | Abspann im Schloss-Modus |
| 5 Kür | Warp-Spiegel, Schlosskarte, Geheimwände (`X`/`Y` gibt es schon), „Umgedrehtes Schloss" als Mode-7-Spiegelung | 200 % |

### Prototyp (Phase 0 + 1) benutzen

- `https://madouki.github.io/nacht/?castle` (lokal `index.html?castle`), optional mit `&stage=N&room=M`. Ohne `?castle`
  bleibt alles wie im Arcade-Modus.
- **Türen:** zurück in den vorigen Raum geht es am linken Rand (gegen den Rand laufen; ein goldener Pfeil erscheint),
  in Turmräumen ohne Rand (Sonnenturm, Kuppel-Aufstieg) mit ↑ an der Starttür. Torbögen mit ↑ betritt man ebenfalls mit ↑.
- **Eingangshalle als Knoten:** Kellertür unten links → Katakomben, Turmtür auf dem Sims → Bergfried,
  Siegeltor auf der Galerie → Thron der Nacht (erst mit 5 Siegeln; sonst Meldung „SIEGELTOR: n/5 SIEGEL").
- **Hinter den Bossen:** Große Halle (Riesenfledermaus) → Wintergarten, Marmorgalerie (Medusa) → Sonnenkathedrale,
  Gruft (Knochenriese) → Aufzug zurück zur Kellertür (Einbahn). Bis zum Sieg: „DER WEG IST NOCH VERSPERRT".
- **Bosse:** der Orb schließt kein Kapitel mehr ab, sondern gibt ein Siegel („SIEGEL n/5 – EIN NEUER WEG IST OFFEN");
  die Arena öffnet sich, der Boss bleibt besiegt (auch nach Neuladen). Beim Grafen gibt es wie gewohnt den Abspann.
  Zwischengegner (Tentakel, Eishexe) bleiben ebenfalls besiegt.
- **Einbahnen:** vom Schiff (Prolog), vom Eisturm (Rutschpartie) und von der einstürzenden Brücke führt kein Weg zurück;
  der Rückweg aus den Katakomben ist der Gruftaufzug.
- **Regionen:** ein Regionswechsel zeigt die Kapitelkarte als Regionsnamen (Ansage nur beim ersten Betreten). Kein
  Zeitlimit; Tod → Wiedereinstieg an der letzten Statue oder an der Tür, durch die man gekommen ist.
- **Karte:** Pause → **KARTE** zeigt das ganze Schloss (Regionen um die Eingangshalle: Prolog links, Katakomben unten,
  Bergfried oben, Sonnenkathedrale oben rechts, Wintergarten rechts, Thron ganz oben). Angriff zoomt, im Zoom scrollen
  die Pfeile, Sprung/Start schließt. Unten: Erkundungsgrad der Region und des Schlosses, Siegel n/5.
- **Abschnittswahl:** im Schloss-Modus mit Erkundungsgrad je Raum und Region; ein rotes Siegel zeigt besiegte Regionsbosse.
- **Speicherkammern** (rote Nische mit Sarg): hineingehen sichert den Spielstand und füllt Energie (und Herzen auf
  mindestens 10) auf. Je Region eine, dazu am Waldrand des Prologs; auf der Karte rot. Der Spielstand übersteht Neuladen
  und neue Browser-Sitzungen: im Titel steht dann **FORTSETZEN** ganz oben, und nach Game Over geht es zur letzten
  Speicherkammer. Gesichert werden Ort, Held, Herzen, Spezialwaffe, Peitsche, Punkte und Leben; Karte, Siegel und
  Warpkammern werden ohnehin laufend gemerkt. „SPIEL STARTEN" beginnt auf dem Schiff, Karte und Siegel bleiben.
- **Warpkammern** (blaue Nische mit Strudel) neben den Speicherkammern (Thron: am Torbogen vor der Brücke): betreten
  schaltet sie frei, ↑ öffnet die **SCHNELLREISE**-Karte, Pfeile wählen eine freigeschaltete Kammer, Sprung reist hin.
  Engelsstatuen sind auf der Karte jetzt blau, damit Rot für die Speicherkammern frei ist.
- **RPG:** besiegte Gegner geben EXP (Punktwert ÷ 15, Bosse ÷ 20); Stufe n braucht insgesamt 15·n·(n−1) EXP
  (LV2 30, LV5 300, LV10 1350). Jede Stufe: +2 max. HP, +1 STR (+5 % Schaden für Peitsche und Spezialwaffen),
  +1 CON (erlittener Schaden ÷ (1 + 4 % je Punkt), mindestens 1). „LEVEL UP!" als Ausruf. Treffer zeigen Schadenszahlen
  (Schaden × 10, Bosse gelb), Gegner lassen Gold, große Herzen und Braten fallen, Bosse einen großen Geldsack. Das HUD
  zeigt LV mit EXP-Leiste und Gold statt Punkten und Zeit; Pause → **STATUS** (HP, EXP, NEXT, GOLD, KILLS, STR, CON, ATT,
  DEF, Spielzeit, Erkundungsgrad, Siegel, Warpkammern). Stufe, EXP, Besiegte und Spielzeit sichert die Speicherkammer;
  „SPIEL STARTEN" beginnt auf Stufe 1. Treffer werden an der gesunkenen Energie der Gegner erkannt (keine Gegnerklasse
  geändert); STR/CON wirken über `Options.dmgMul` und `Player.hurt`, nur mit `?castle`.
- Code: `js/castle.js` (Regionen `REGION_AT`, Verbindungen `LINKS`, Türen `CastleDoor`, Kammern `CHAMBERS`/`CastleChamber`,
  Spielstand, Karte), Einbindung in `js/game.js` (`castleGo`/`castleEnter`, `nextRoom`, `startStage`, `startClear`,
  Pausenmenü, Titelmenü `titleItems`/`castleContinue`, Zustände `map` und `warp`).
- Daten: `localStorage['nachtmahr.map']` = `{ v: 1, rooms: { "<stage-id>:<raum>": [Zellnummern] }, boss: {…}, mini: {…}, warp: {…} }`,
  `localStorage['nachtmahr.castle']` = Spielstand der letzten Speicherkammer; `Castle.reset()` in der Konsole löscht alles.
