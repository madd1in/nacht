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
| **2 Relikte (erledigt bis auf den Prüfer)** | Fluch am Burgtor, 9 Relikte (Doppelsprung, Dash, Ring-Greifen, Wandsprung, Steinbrecher, Fledermaus-, Nebel-, Wolfsgestalt, Dampfstiefel) auf Sockeln, bei Bossen und bei den Zwischengegnern Eishexe und Zugführer, rissiges Gestein vor Zusatzräumen, Dachboden nur fliegend, Kerkerzelle nur als Nebel, Gepäckraum im Hotel nur als Wolf. Selbsttest prüft Türen/Figuren/Gitter/Texte/Modelle/Puppen und die Erreichbarkeit aller Räume über Türen. Offen: Erreichbarkeit innerhalb der Räume (Sprunghöhen) | ganzes Schloss ohne Softlock durchspielbar |
| **3 RPG (fast erledigt)** | erledigt: EXP/Stufe mit LEVEL UP, max. HP/STR/CON je Stufe, Schadenszahlen, Beute, Statusbildschirm, Stufe im Spielstand, Ausrüstung (Waffe/Rüstung/Amulett) mit Drops und Einzelstücken, Tränke, Laden des Bibliothekars, Schlosskarte, drei Begleiter mit Stufen, MP und drei Zauber per Befehlseingabe, Bestiarium, Verkaufen. vier Zauber (mit Tetra-Seelen), Nebenaufträge mit Auftragsbuch. Offen: weitere Gestalten | Statusbildschirm, Shop |
| **4 Bosse & Siegel (erledigt)** | Arenen mit Hintertür, Siegeltor, eigenes Ende (Epilog der drei Figuren, Ergebnis mit Rang nach Erkundungsgrad, Neues Spiel+), neue Verbindungsräume | Abspann im Schloss-Modus |
| **4b Geschichte & Verzahnung (erledigt)** | drei Figuren mit absurden Gesprächen im Maniac-Mansion-Ton (zweiter Held, Bibliothekar, lila Tentakel), elf Szenen entlang der Relikte und Siegel; drei Schleifen (Geheimgang Kolosseum ↔ Brunnenschacht, Wehrgang Bergfried ↔ Glockenturm, Himmelsbrücke Kathedralendach ↔ Kuppel). Offen: weitere Figuren, Szene nach dem Grafen | jede Region über mindestens zwei Wege erreichbar |
| 5 Kür | Warp-Spiegel, Schlosskarte, Geheimwände (`X`/`Y` gibt es schon), „Umgedrehtes Schloss" als Mode-7-Spiegelung | 200 % |

### Prototyp (Phase 0 + 1) benutzen

- Seit 2026-10-22 ist der Schloss-Modus der **Standard**: `https://madouki.github.io/nacht/` startet das Schloss. Das lineare
  Arcade-Spiel gibt es unter `?arcade` oder im Titel über **ARCADE-MODUS** (zurück über **SCHLOSS-MODUS (SOTN)**); alte
  `?castle`-Links funktionieren weiter. Testschalter wie gehabt: `&stage=N&room=M`, `&noboot`.
- **Wegweiser:** das nächste Ziel in der empfohlenen Reihenfolge (Relikt finden, Boss besiegen, Siegeltor öffnen, Graf)
  steht oben im Pausenmenü und unten auf der Karte, der Zielraum blinkt golden auf der Karte (auch unbetreten); nach Fluch,
  Relikt, Boss und Fortsetzen blendet es sich unten im Bild ein.
- **Prolog überspringen** (zum Testen): solange man auf dem Schiff oder im Wald ist, Pause → PROLOG ÜBERSPRINGEN.
- **Testmodus** (Titel → TESTMODUS): Sprung zu acht Meilensteinen (Burgtor nach dem Fluch, Rabenfeder, Riesenfledermaus,
  Knochenriese, Medusa, Sonnenwächter, fünf Siegel, vor dem Grafen) mit passender Stufe, Gold, Relikten, Siegeln, Ausrüstung,
  Begleitern, Zaubern und freien Warpkammern; ältere Szenen gelten als gesehen. Der Testmodus speichert in eigene Plätze
  (`nachtmahr.test.*`, die Adresse bekommt `?test`), der echte Spielstand bleibt unberührt; Titel → TESTMODUS BEENDEN.
  HUD zeigt „TEST“ (mit * = unverwundbar). Pause → **TEST-WERKZEUGE**: unverwundbar, alle Relikte, Stufe +5, Gold +10000,
  alle Warpkammern, Karte aufdecken, Boss hier besiegen, zu einem Meilenstein, Selbsttest.
- **Selbsttest** (`Castle.selfCheck()`, im Testmodus bei jedem Meilenstein und in den Werkzeugen, Ergebnis in der Konsole):
  Karte ohne Überlappung, ↑-Türen und Figuren auf Boden mit Platz darüber, Funde nicht in der Wand, alle Verbindungen finden
  ihre Räume, alle Texte (Gegenstände, Szenen, Zauber, Werkzeuge) vorhanden.
- **Fortsetzungspunkt:** beim Pausieren, bei jedem Raumwechsel und wenn der Tab versteckt oder der Browser geschlossen wird,
  merkt sich das Spiel Raum, Stelle (auf festem Boden die aktuelle, sonst der letzte sichere Punkt), Energie, MP, Stufe und
  Gold. Titel → FORTSETZEN nimmt den neueren von Fortsetzungspunkt und Speicherkammer; nach Game Over zählt wie in SotN nur
  die Speicherkammer (der Fortsetzungspunkt verfällt). Im Prolog gibt es keinen Fortsetzungspunkt.
- **Karte auf Select:** Select/Ansicht-Taste (Tastatur: Tab) blendet die Karte durchscheinend über dem laufenden Spiel ein,
  um den Helden zentriert (noch einmal drücken: weg); in der Pause öffnet Select die große Karte. Im Arcade-Modus bleibt die
  Ansicht-Taste der Tonschalter.
- **Türen:** ↑-Türen sind Steinbögen wie die Speicherkammer (Quaderring, Schlussstein, Fackelschein, zwei Wandfackeln),
  verschlossen mit eisernem Fallgitter; das Siegeltor hat violette Runen. Seitenausgänge zeigen schon aus zwölf Kacheln
  Entfernung einen Lichtschein und drei große Winkelpfeile, die zum Rand laufen.
- **Laden:** Regionswechsel zeigen den Regionsnamen nur kurz (30–90 Bilder statt 75–140); eine schon vorgebaute Region wird
  in derselben Sitzung nicht noch einmal vorgebaut.
- **Relikte:** Beim ersten Betreten des Burghofs raubt der Fluch des Grafen Doppelsprung, Dash, Wandsprung und Ring-Greifen
  (Kante packen und Rutschen bleiben; im Prolog auf dem Schiff geht noch alles). Sie liegen als leuchtende Kugeln auf Sockeln:
  Rabenfeder (Doppelsprung) am Ende des Kolosseums, Enterhaken (Ringe) in der Eishöhle; Schattenmantel (Dash) bei der
  Riesenfledermaus, Katzenkralle (Wandsprung) beim Knochenriesen, Steinbrecher bei Medusa – der Boss lässt sein Relikt in der
  Arena zurück. Empfohlene Reihenfolge: Kolosseum → Glockenturm → Riesenfledermaus → Katakomben → Knochenriese → Bergfried →
  Medusa → Sonnenkathedrale / Wintergarten → Thron. Die Sperren stecken in `Player.startDash`, `wallDir`, `tryLatch` (in
  `castle.js` umhüllt) und dem Doppelsprung-Flag `canDouble`; `entities.js` bleibt unverändert.
- **Gefahrenstufen:** Prolog und Burghof 1, Katakomben 2, Bergfried 3, Sonnenkathedrale 4, Wintergarten 5, Thron 6, Verlies 7.
  Je Stufe über 1: Gegner +50 % Lebensenergie (Bosse +30 %), +25 % Schaden (auch Geschosse), +60 % EXP. Die Regionskarte
  zeigt GEFAHR *** und die eigene Stufe.
- **Zusatzräume** (nur im Schloss-Modus, hinten an ihre Region gehängt, eigener Platz auf der Karte): Kolosseum (Tür im
  Burghof, Stufe 2, Gegner kommen immer nach – zum Aufleveln), Unterirdischer Kanal (Tür in der Gruft, Stufe 3, führt ins
  Palmenhaus: Schleife Katakomben ↔ Wintergarten), Schatzkammer (Tür auf der linken Galerie der Bibliothek, Stufe 3), Verlies
  (Tür unten im Glasturm, Stufe 7). Kanal, Schatzkammer und Verlies sind mit rissigem Gestein verschlossen, das erst der
  Steinbrecher zerschlägt (vom Palmenhaus aus ist der Kanal offen; von innen bricht das Gestein). In jedem Zusatzraum
  steht ein **Lebensgefäß** (max. HP +4 für immer). Dazu zwei Zusatzräume ohne Gefäß, die Regionen verbinden: **Wehrgang**
  (Stufe 3, Mauerkrone mit zwei Scharten) und **Himmelsbrücke** (Stufe 5, Steg über dem Wolkenmeer mit Lücken).
- **Schleifen (2D-Open-World):** Geheimgang am rechten Ende des Kolosseums ↔ Tür im Brunnenschacht (Burghof ↔ Katakomben
  ohne Kellertür); Tür im Bergfried-Turm (x 40) → Wehrgang → Tür auf der Plattform im Glockenturm (Bergfried ↔ Burghof);
  Kathedralendach (hinter dem Sonnenwächter) → Himmelsbrücke → Kuppel (hinter der Menschenfalle). In eine Arena mit
  lebendem Boss führt keine Schleife: solange er lebt, ist die Tür „VON DER ANDEREN SEITE VERRIEGELT" (Torbedingung
  `beat`, für die Rückrichtung `back`).
- **Geschichte** (Ton: schräg wie *Maniac Mansion* – trockene Pointen, absurde Alltagsdetails im Gruselschloss, die
  Wegweiser-Infos stecken trotzdem in jeder Szene): Im Burghof wartet gleich nach dem Fluch der **zweite Held** (der nächste nach dem gespielten: Henrik →
  Ragnor → Kaspar → Henrik) – auch ihn hat der Fluch getroffen. Er erzählt vom Grafen und den Relikten, schickt einen ins
  Kolosseum und hält danach die Eingangshalle: nach jedem Relikt hat er dort Neues (wo der nächste Boss wartet, was hinter
  der Kellertür, der Turmtür und den rissigen Mauern liegt), mit fünf Siegeln steht er auf der Galerie am Siegeltor. Der
  **Bibliothekar** in der Bibliothek des Bergfrieds (neben dem Lesepult) kennt die Chronik des Grafen (einst Puppenspieler –
  Kaspar hat eine eigene Zeile), verrät mit dem Steinbrecher die Schatzkammer und heilt bei jedem Gespräch (HP, Herzen auf 10).
  Der **lila Tentakel** vom Schiff hat überlebt, wurde vom Grafen gefeuert und sitzt jetzt in einem Eimer Meerwasser: am
  Eingang des Kolosseums (Plan zur Weltherrschaft, Schritt 1: Beine besorgen – und der Tipp zur Rabenfeder), später auf
  der Himmelsbrücke (erobert die Wolken, zahlt 1000 Gold Schweigegeld, „nur leicht klebrig").
  Neue Szene: „!" über der Figur und eine grüne Marke auf der Karte; das Gespräch beginnt beim Herantreten, die Welt steht
  still. Sprung/Angriff/↑ schreibt die Seite fertig bzw. blättert, Start überspringt. Danach wiederholt ↑ vor der Figur
  den Rat. Das Fenster zeigt Porträt (Figur links, Held rechts), Namen und Schreibmaschinentext; es steht oben, wenn die
  Sprecher unten im Bild stehen. Gesehene Szenen liegen in `flag['story_<id>']`, Texte in allen sechs Sprachen in `i18n.js`
  (`story_<id>` = Seiten „A:/H:/K:/L:/T:Text", `story_<id>Again`).
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
- **Speicherkammern** (Steinnische mit Sarg und Kerzen): hineingehen sichert den Spielstand und füllt Energie (und Herzen auf
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
- **Ausrüstung** (Pause → **AUSRÜSTUNG**): drei Plätze – Waffe (Beschläge und Runen für jede Heldenwaffe: Silberbeschlag
  ATT +2, Blutrune +4, Drachenzahn +7), Rüstung (Lederwams DEF +2, Kettenhemd +4, Spiegelpanzer +7), Amulett (Herzamulett
  max. HP +8, Blutstein heilt 1 HP alle 4 s, Glücksmünze 2,5× Beute, Ring der Gier 1,5× Gold). ATT/DEF zählen wie STR/CON-Punkte
  (je +5 % Schaden bzw. +4 % Abwehr). ↑↓ wählt, ←→ oder Sprung wechselt, auf Heiltrank (50 %) und Elixier (100 %) trinkt Sprung.
  Einzelstücke schweben in den Zusatzräumen (Kolosseum Lederwams, Kanal Blutstein, Schatzkammer Ring der Gier, Verlies
  Drachenzahn, Wehrgang Glücksmünze, Himmelsbrücke Spiegelpanzer); ein Fund für einen leeren Platz wird gleich angelegt.
  Gegner lassen mit 3 % etwas fallen (nach Gefahrenstufe; Doppeltes wird zum Heiltrank), Bosse ein Elixier.
- **Begleiter** (Familiars wie in SotN, vierter Platz im Ausrüstungsmenü, immer nur einer): **Fledermausjunges** (liegt nach
  dem Sieg über die Riesenfledermaus in ihrer Arena – „hält dich für seine Mutter“; stürzt sich auf Gegner), **Fee im Glas**
  (Laden, 7000; heilt 12 % + 2 % je Stufe, sobald die Energie unter die Hälfte fällt, dann 15 s Pause; will Komplimente),
  **Tentakelchen** (der Neffe des lila Tentakels – dieser gibt ihn im Kolosseum mit, sobald man die Rabenfeder hat; haut zu,
  was nah kommt, und redet zu viel). Jeder Treffer bzw. jede Heilung gibt Erfahrung, alle 12 Punkte eine Stufe (bis LV 9:
  mehr Schaden, kürzere Pausen). Begleiter treffen nur Gegner und Bosse (deren Trefferzonen), nie Kerzen, Geschosse oder
  Geheimwände; Sprechblasen mit absurden Sprüchen. Stufen liegen in `famx` im Karten-Spielstand.
- **Bestiarium** (Pause → STATUS, ←→ bis zur dritten Seite, ↑↓ wählt): 21 Gegnerarten und 8 Bosse wie die Gegnerliste in
  SotN, mit Siegen je Art und absurdem Eintrag (unbesiegte Arten bleiben „???“). Die erste besiegte Art meldet „NEU IM
  BESTIARIUM“. Gezählt wird über den Klassennamen des Gegners (`best` im Karten-Spielstand; bleibt bei Neues Spiel+).
- **Verkaufen:** im Laden des Bibliothekars wechselt ←→ zwischen KAUFEN und VERKAUFEN. Verkaufen lässt sich alles außer
  Zauberbüchern, Schlosskarte, Begleitern und dem einzigen angelegten Stück; halber Ladenpreis, Einzelstücke zu festen
  Preisen (z. B. Drachenzahn 6000). Der Erlös wird auch im Speicherkammer-Spielstand gutgeschrieben.
- **Ende im Schloss-Modus:** nach dem Grafen verabschieden sich zweiter Held, Bibliothekar und lila Tentakel über dem
  Morgenhimmel (Gesprächsfenster, absurd wie gewohnt), dann **SCHLOSS BEFREIT**: Erkundungsgrad, Spielzeit, Stufe, Besiegte,
  Relikte, Lebensgefäße, Gold und ein Rang nach Erkundungsgrad (S ab 95 %, A ab 80 %, B ab 60 %, sonst C) mit Kommentar.
  Wahl: **NEUES SPIEL+** (Stufe, EXP, Gold, Ausrüstung, Begleiter, Zauber und gesehene Szenen bleiben; Karte, Relikte, Bosse,
  Gefäße, Warpkammern und rissige Wände auf Anfang; der Fluch schlägt wieder zu; je Runde +2 Gefahrenstufen; Start am Burgtor)
  oder der bekannte **Abspann**. Test: Pause → TEST-WERKZEUGE → ZUM ENDE.
- **Nebenaufträge** (Status, vierte Seite „AUFTRÄGE“: Auftraggeber, gefundene Stücke, erledigt):
  **Die Ausreißer** (Bibliothekar: Kochbuch im Hotel, Liebesroman auf dem Wehrgang, Telefonbuch im Bahnhof → Zauberbuch
  **Tetra-Seelen**, ↑ ↗ → ↘ ↓ + Angriff, 20 MP, vier Seelen), **Die Koffer aus Zimmer 7** (Portier: Kolosseum, Dachboden,
  Kanal → Portiersmütze, MP +12), **Die Untertasse** (Gefangener, seit 1391 vermisst, liegt in der Minibar von Zimmer 13 →
  Eisenkugel, ATT +4). `QUESTS`, Szenen mit `give`/`take`; die Stücke bleiben beim Auftraggeber. Ausrüstung kann jetzt
  auch MP geben (`gear('mp')`).
- **Karte:** Figuren als Marke (blinkt gelb, wenn sie etwas Neues zu erzählen haben).
- **Spiegelkabinett und der Doppelgänger** (Tür in der Marmorgalerie, x 34, Stufe 4): Marmorsaal mit Standspiegeln aus
  Blender, die den Helden spiegeln – solange der Doppelgänger lebt, mit Verzögerung. Er tritt aus dem rechten Spiegel: dein
  eigenes Bild in Dunkelviolett mit roten Augen, deine Waffe und Reichweite, hält Abstand, springt, weicht deinen Hieben mit
  einem Rückwärts-Dash aus; ab halber Energie Nachbilder und Schattendolche. Lohn (`MINI_LOOT`): **Schattenzwilling** –
  Begleiter, der 18 Bilder hinter dir herläuft und jeden Hieb wiederholt. Hinten eine brüchige Wand (Mauerbraten, Goldsack),
  dahinter eine Nische mit der Tür zum Spiegeltunnel.
- **Spiegeltunnel** (Thema `mirror`): das ganze Spielfeld rollt mit dem Fortschritt einmal um die Bildmitte (`def.roll`,
  `W.roll`, world.js `applyCamFx` mit Kulisse `W.rollBack`: Kaleidoskop aus Spiegelringen in den Ecken) – in der Mitte steht
  alles kopfüber, die Steuerung bleibt. Boden spiegelt, Standspiegel spiegeln verzögert. **Spiegelschacht:** Zylinder
  (`wrap`, Turmmantel aus Spiegelfeldern in ps2.js) zum Hochklettern, dreht sich um die senkrechte Achse; oben eine Tür auf
  die Empore der Marmorgalerie (Schleife).
- **Selbsttest – Erreichbarkeit:** Breitensuche vom Wald über Türen und Ausgänge; jeder Raum, der so nicht erreichbar ist,
  wird gemeldet („Raum unerreichbar“).
- **Lokschuppen und der Zugführer:** Tür am linken Bahnsteig (x 14) in den Lokschuppen über dem Bahnhof (Stufe 3). Links
  stehen Lok und Wasserkran, oben ein Kransims mit Lebensgefäß; rechts die Arena des **Zugführers** – einer riesigen
  Schaffnerpuppe (Blender, zwölf Posen in `img/cond3d.png`, Bildkarte `K3C`): ruckt heran, holt mit der Fahrkartenzange aus
  und stürmt durch die Halle (danach verschnauft er), wirft Glut aus der Laterne im Bogen, pfeift Druckwellen über den
  Boden; ab halber Energie schneller und ruft zwei Puppen. Lohn: **Dampfstiefel** (`MINI_RELIC`).
- **Dampfstiefel:** ↑ + DASH am Boden = Supersprung (gut 8 Kacheln senkrecht, steuerbar, danach ist der Doppelsprung frei;
  von unten prallt man an Simsen ab, also neben dem Sims abspringen). Neue Ziele: Kransims im Lokschuppen, **Signalbrücke**
  unter dem Bahnhofsdach (Schallplatte „Morgenröte“, Truhe). Status → Zauber-Seite listet ihn bei den Verwandlungen.
- **Zimmer 13** (Tür auf der Hotel-Galerie, x 46): `gate: { item: 'keyring' }` – der Schlüsselbund des Gefangenen, der „in
  kein Schloss passt“, passt genau hier. Der Portier erkennt ihn (Szene conc3), drinnen wohnt jetzt der lila Tentakel im
  Eimer neben dem Messingbett (Szene tent4) und schenkt das **Daunenkissen** (Rüstung, DEF +5).
- **Wolfsgestalt** (Relikt „Seele des Wolfs“, erscheint neben dem Eistor, sobald die Eishexe am Fuß des Eisturms besiegt
  ist; wer daran vorbeiläuft oder einen älteren Spielstand hat, findet es am Anfang der Gruft – `MINI_RELIC`): ↓ ↘ → + Sprung
  verwandelt (4 MP, dann 1 MP je Sekunde, bei 0 MP zurück, sobald Platz ist). Der Wolf ist flach (12 px) und schnell, springt,
  Angriff = Biss mit einem Satz nach vorn (trifft jeden Gegner einmal, Schaden wächst mit der Stufe), ↑ am Boden verwandelt
  zurück (stehend, sonst geduckt; in der Klappe nicht). Nur der Wolf passt durch **Haustierklappen** (`def.grates` mit `pet`).
  Zauber-Seite: alle Verwandlungen als Zeilen mit Befehl und Kosten. Treffer und Stürze ändern keine Tiergestalt mehr
  (`setCrouch` ist in Tiergestalt gesperrt – vorher konnte ein Treffer die Fledermaus auf Heldengröße ziehen).
- **Hotel Krat** (Hommage an die Lobby aus „Lies of P“, eigene Texte und Figuren): Tür mit Schild im Burghof (x 50), Lobby
  über dem Burghof, eigenes Kachelthema `hotel` (grüne Damasttapete, Mahagoni, Messing-Gaslampen, Regenfenster mit der
  Stadt dahinter, roter Läufer, Galerie). Sicherer Ort ohne Gegner: **Sternlampe** = Speicherkammer, **Aufzug** =
  Warpkammer, **Grammophon** (↑): legt gefundene oder gekaufte **Schallplatten** auf (zehn Stücke des Schlosses, Liste mit
  ???), **der Portier** – eine Holzpuppe mit Monokel, die nicht lügen kann: lügt er doch, wächst seine Nase (`~` vor einer
  Gesprächsseite) – mit eigenem Laden (Bademantel DEF +3 mit langsamer Heilung, Platten, Tränke). Unter der Galerie hinter
  der Haustierklappe der Gepäckraum (Lebensgefäß, Platte, Truhe). Musik: ruhiger Walzer in d-Moll ohne Schlagzeug.
- **Bahnhof Krat** links neben dem Hotel (Stufe 2): Bahnhofshalle aus Eisen und Glas (Thema `station`), Bahnsteigkante,
  Fußgängerbrücke, Abfahrtstafel mit Fallblättern (absurde Ziele), Uhr; die Dampflok „KRAT“ steht mit zwei Wagen unter
  Dampf hinter der Bahnsteigkante. Gegner: **Puppen** (Gepäckträger ohne Fäden: ruckeln heran, holen aus, springen; im
  Bestiarium), Raben. Lebensgefäß auf der Brücke, Platte, Truhe am Stellwerk.
- **Blender-Modelle (PS2-Look):** Dampflok mit Tender, Personenwagen, Bahnsteigdach (kachelbar), Bank, Gaslaterne,
  Bahnhofsuhr, Ortsschild, Empfangstresen, Schlüsselbrett, Grammophon, Sternlampe, Aufzug, Ohrensessel, Gepäckwagen –
  in Blender aus Grundkörpern gebaut, orthografisch mit 16 px je Meter gerendert, in `img/krat3d.png` gepackt; die Bildkarte
  `K3` in castle.js nennt Lage, Anker und Zusatzpunkte (Schornstein für den Dampf, Lampen fürs Licht). `def.decor` setzt sie
  in die Räume (`CastleDecor`), Räder verschwinden per Abschneiden hinter der Bahnsteigkante.
- **Nebelgestalt** (Relikt „Asche des Nebels“, liegt nach dem Sieg über die Menschenfalle in ihrer Arena): ↑ ↓ + Sprung
  verwandelt (6 MP, dann 1 MP alle 0,5 s), langsam schwebender Nebel, unverwundbar, schwebt durch **Gitter** (`def.grates`,
  `CastleGrate`: schieben jeden zurück, der kein Nebel ist). Sprung oder Angriff verwandelt zurück, wenn Platz ist (nicht
  mitten im Gitter). Der **Kerker** (Tür mitten im Kolosseum, x 50) ist früh betretbar: hinter einem bis zur Decke vermauerten
  Gitter sitzt **der Gefangene** (seit 1391, wegen Falschparkens mit einer Kutsche, hat Tee). Er spricht schon durchs Gitter
  (größere Reichweite `reach`), als Nebel in seiner Zelle schenkt er den **Schlüsselbund** (Amulett, ATT +2, DEF +2); dort
  liegen auch ein Lebensgefäß und eine Truhe. Der zweite Held erklärt den Weg (Szene „fog“). Relikte jetzt 7. Die
  Verwandlungen rechnen ab den Füßen (die Befehle enden oft geduckt).
- **Fledermausgestalt** (Relikt „Seele der Fledermaus“, liegt nach dem Sieg über den Sonnenwächter in seiner Arena):
  ↓ ↑ + Sprung verwandelt (4 MP, dann 1 MP alle 0,6 s, bei 0 MP von selbst zurück), Sprung oder Angriff verwandelt zurück,
  wenn Platz ist. Die Fledermaus fliegt frei, ist 10×10 groß und fliegt auch durch Seitenausgänge; ein Raumwechsel
  verwandelt zurück. Nur fliegend erreichbar: ein Sims unter der Decke der Eingangshalle (x 66–70) mit Tür zum
  **Dachboden** (Stufe 3, Lebensgefäß, Gummihuhn mit Seilrolle: mehr Beute und Gold). Der zweite Held erklärt es
  (Szene „wings“), Status → Zauber-Seite zeigt den Befehl. Code: `toBat`/`fromBat`/`batUpdate`/`batDraw` umhüllen
  `Player.update`/`draw` (entities.js bleibt unverändert). Relikte jetzt 6.
- **Zauber** wie in SotN: Befehl mit dem Steuerkreuz, dann Angriff (der Hieb entfällt). Gezeigt mit Blick nach rechts:
  **Seelenruf** ← → ↑ ↓ (5 MP, eine Seele sucht sich einen Gegner), **Höllenfeuer** ↑ ↓ ↘ → (12 MP, drei Feuerbälle im Fächer),
  **Seelenraub** ← → ↘ ↓ ↙ ← → (24 MP, trifft alles im Bild, jede Seele heilt). Gelernt aus Zauberbüchern im Laden (2500 /
  6000 / 12000). MP erst mit dem ersten Buch: 24 + 3 je Stufe, +1 alle 0,75 s, voll in der Speicherkammer und beim
  Bibliothekar; Leiste im HUD neben der EXP. Schaden wächst mit der Stufe. Pause → STATUS, ←→ blättert zur Zauber-Seite
  (Befehle, MP-Kosten). Die Befehlserkennung läuft vor `W.update` (`Castle.preUpdate`) und löscht dort den Angriffsdruck.
- **Laden des Bibliothekars:** nach jedem Gespräch mit ihm (↑) öffnet sein Laden (rollt bei mehr als acht Zeilen) – Heiltrank
  800, Elixier 4000, Lederwams 2000, Kettenhemd 6000, Silberbeschlag 3000, Herzamulett 5000, Fee im Glas 7000, Zauberbücher,
  **Schlosskarte** 3000 (zeigt auf der Karte alle unbetretenen Räume
  grau; der Erkundungsgrad zählt weiter nur Betretenes). Gold = Punkte; Ausrüstung gibt es nur einmal. Besitz wird wie die
  Relikte sofort gemerkt (`inv`, `eq` im Karten-Spielstand), ein Kauf zieht das Gold auch im Speicherkammer-Spielstand ab.
- Code: `js/castle.js` (Regionen `REGION_AT`, Verbindungen `LINKS`, Türen `CastleDoor`, Kammern `CHAMBERS`/`CastleChamber`,
  Szenen `BEATS`/`CastleNPC`, Spielstand, Karte), Einbindung in `js/game.js` (`castleGo`/`castleEnter`, `nextRoom`,
  `startStage`, `startClear`, Pausenmenü, Titelmenü `titleItems`/`castleContinue`, Zustände `map`, `warp`, `status`, `talk`,
  `equip`, `shop`); Ausrüstung `GEAR`/`FINDS`/`DROPS`/`STOCK`/`BOSS_LOOT`, `CastleLoot`, Begleiter `CastleFamiliar`/`famTick`, Zauber `SPELLS`/`preUpdate`/`CastleSpell`.
- Daten: `localStorage['nachtmahr.resume']` = Fortsetzungspunkt (Testmodus: `nachtmahr.test.map` / `.castle` / `.resume`);
  `localStorage['nachtmahr.map']` = `{ v: 1, rooms: { "<stage-id>:<raum>": [Zellnummern] }, boss, mini, warp, vessel, relic, crack, flag, inv, eq, famx, best }`,
  `localStorage['nachtmahr.castle']` = Spielstand der letzten Speicherkammer; `Castle.reset()` in der Konsole löscht alles.
