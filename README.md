# NACHTMAHR 🌕🦇

Ein 8-Bit Gothic-Action-Platformer im Stil der NES-Klassiker. Läuft direkt im Browser, ohne Build-Schritt und ohne Abhängigkeiten.

> Anno 1691. Alle hundert Jahre erwacht Graf Nachtmahr unter dem Blutmond.
> Henrik Morgenstern ergreift die Peitsche seiner Ahnen und betritt die verfluchte Burg …

## Spielen

**Live:** https://madd1in.github.io/nachtmahr/

Lokal: `index.html` über einen beliebigen statischen Server öffnen, z. B. `python -m http.server`.

## Steuerung

| Aktion | Tastatur | Xbox-Controller (Edge/Chrome) | Touch |
|---|---|---|---|
| Laufen / Ducken / Treppen | Pfeile oder WASD | Linker Stick / Steuerkreuz | D-Pad |
| Springen / Doppelsprung | Z, K, Leertaste | A | A |
| Angriff (Peitsche/Schwert) | X, J | X oder B | B |
| Spezialwaffe | C, L oder Oben + Angriff | Y, RB oder RT | SUB |
| Heiliger Sturm (ab 10 Herzen) | C gedrückt halten | Y gedrückt halten | SUB halten |
| Pause | Enter, Esc, P | Menü-Taste | START |
| Ton an/aus | M | Ansicht-Taste | – |
| Röhren-Look an/aus | V | – | – |

Controller vibrieren bei Treffern, Bossen und Blitzen. Treppen: am Fuß **Oben** halten, oben **Unten** halten.

## Inhalt

- **2 Helden**: Henrik (Vampirjäger, Morgenstern-Peitsche) oder Ragnor (Barbar aus dem Norden, Breitschwert mit Hiebbogen)
- **3 Stages, 9 Räume**: Burghof im Gewitter, Glockenturm, Eingangshalle, Katakomben, Brunnenschacht, Gruft, Turmsockel, Uhrwerk, Thronsaal – inklusive drei vertikaler Kletterabschnitte
- **3 Bosse**: Riesenfledermaus, Knochenriese, Graf Nachtmahr (mit zweiter Phase)
- **Gegner**: Ghule, Fledermäuse, Raben, Flammenschädel, Skelette, Ritter, Sumpfmänner, Knochensäulen
- **Mechaniken**: Doppelsprung mit Salto, schwingende Kronleuchter als Plattformen, Aufzüge, bröckelnde Steine, Checkpoint-Engelsstatuen, Schatztruhen, Treppen, „Heiliger Sturm“-Spezialangriff
- **Optionen**: Leicht-Modus (doppelte Lebensleiste und doppelter Schaden), maximale Waffe ab Start, unendlich Herzen, Musiklautstärke, Röhren-Look
- **Fair**: Abgründe, Wasser und Stacheln kosten Leben statt eines ganzen Versuchs und setzen auf den letzten sicheren Stand zurück
- **Darstellung**: randloses Vollbild in jedem Seitenverhältnis (Breite passt sich an), dynamisches Licht, Wasserspiegelungen, Nebel, Parallax
- **Musik**: eigener Chiptune-Soundtrack, live per WebAudio synthetisiert (2× Puls + Echo, Dreieck, Rausch-Drumkit)

## Technik

Vanilla JavaScript + Canvas 2D (256×240, NES-Auflösung), alle Pixel-Grafiken stehen als ASCII-Raster im Code, Kacheln und Hintergründe werden prozedural erzeugt.

| Datei | Inhalt |
|---|---|
| `js/font.js` | 5×7-Bitmap-Schrift |
| `js/sprites.js`, `js/sprites2.js` | Pixel-Art: Held, Items, Gegner, Bosse |
| `js/view.js`, `js/options.js` | Bildbreite und Optionen |
| `js/hero.js` | Helden-Baukasten (Kopf/Torso + berechnete Beine) |
| `js/tiles.js` | Kacheln und Parallax-Hintergründe |
| `js/fx.js` | Licht, Vignette, Nebel, Umgebungspartikel |
| `js/audio.js` | Chiptune-Engine, Musik und SFX |
| `js/input.js` | Tastatur, Gamepad, Touch |
| `js/levels.js` | Leveldaten (Builder-API) |
| `js/entities.js` | Physik und Spielerfigur |
| `js/enemies.js` | Gegner, Items, Projektile, Effekte |
| `js/props.js` | Kronleuchter, Aufzüge, Bröckelsteine, Statuen, Truhen, Raben |
| `js/bosses.js` | Bosskämpfe |
| `js/world.js`, `js/game.js` | Spielwelt, Zustände, HUD, Hauptschleife |

Debug: `?stage=2&room=2` startet direkt in Stage 2, Raum 2.

Ein Fan-Projekt mit eigenen Figuren, eigener Grafik und eigener Musik.
