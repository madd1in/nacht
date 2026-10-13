# NACHTMAHR 🌕🦇

Ein 8-Bit Gothic-Action-Platformer im Stil der NES-Klassiker. Läuft direkt im Browser, ohne Build-Schritt und ohne Abhängigkeiten.

> Anno 1691. Alle hundert Jahre erwacht Graf Nachtmahr unter dem Blutmond.
> Henrik Morgenstern ergreift die Peitsche seiner Ahnen und betritt die verfluchte Burg …

## Spielen

**Live:** https://madd1in.github.io/nachtmahr/

Lokal: `index.html` über einen beliebigen statischen Server öffnen, z. B. `python -m http.server`.

## Steuerung

| Aktion | Tastatur | Gamepad | Touch |
|---|---|---|---|
| Laufen / Ducken / Treppen | Pfeile oder WASD | D-Pad / Stick | D-Pad |
| Springen | Z, K, Leertaste | A | A |
| Peitsche | X, J | X / B | B |
| Spezialwaffe | C, L oder Oben + Peitsche | Y / RB | SUB |
| Pause | Enter, Esc, P | Start | START |
| Ton an/aus | M | – | – |

Treppen: Am Fuß der Treppe **Oben** halten, oben auf der Treppe **Unten** halten.

## Inhalt

- 3 Stages mit 6 Räumen: Burghof, Eingangshalle, Katakomben, Gruft, Bergfried, Thronsaal
- 3 Bosse: Riesenfledermaus, Knochenriese, Graf Nachtmahr (mit zweiter Phase)
- Gegner: Ghule, Fledermäuse, Flammenschädel, Skelette, Ritter, Sumpfmänner, Knochensäulen
- Peitsche in 3 Stufen, 4 Spezialwaffen (Dolch, Axt, Weihwasser, Kreuz), Rosenkranz, Braten in der Wand
- Klassische Treppen, Rückstoß bei Treffern, Wasser, Stacheln, bewegliche Plattformen
- Eigener Chiptune-Soundtrack und Soundeffekte, live per WebAudio synthetisiert (2× Puls, Dreieck, Rauschen wie beim NES)
- Highscore wird lokal gespeichert, Touch-Steuerung für Smartphones

## Technik

Vanilla JavaScript + Canvas 2D (256×240, NES-Auflösung), alle Pixel-Grafiken stehen als ASCII-Raster im Code, Kacheln und Hintergründe werden prozedural erzeugt.

| Datei | Inhalt |
|---|---|
| `js/font.js` | 5×7-Bitmap-Schrift |
| `js/sprites.js`, `js/sprites2.js` | Pixel-Art: Held, Items, Gegner, Bosse |
| `js/tiles.js` | Kacheln und Parallax-Hintergründe |
| `js/audio.js` | Chiptune-Engine, Musik und SFX |
| `js/input.js` | Tastatur, Gamepad, Touch |
| `js/levels.js` | Leveldaten (Builder-API) |
| `js/entities.js` | Physik und Spielerfigur |
| `js/enemies.js` | Gegner, Items, Projektile, Effekte |
| `js/bosses.js` | Bosskämpfe |
| `js/world.js`, `js/game.js` | Spielwelt, Zustände, HUD, Hauptschleife |

Debug: `?stage=2` bzw. `?stage=3` startet direkt in einer späteren Stage.

Ein Fan-Projekt mit eigenen Figuren, eigener Grafik und eigener Musik.
