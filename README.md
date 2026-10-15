# NACHTMAHR 🌕🦇

Gothic-Action-Platformer im Stil von Castlevania (NES-Look mit SNES-Effekten) – läuft direkt im Browser, ohne Build-Schritt.

> Anno 1691. Alle hundert Jahre erwacht Graf Nachtmahr unter dem Blutmond …

**Live:** https://madd1in.github.io/nacht/

## Steuerung

| Aktion | Tastatur | Xbox-Controller | Touch |
|---|---|---|---|
| Laufen / Ducken / Treppen | Pfeile, WASD | Stick / Kreuz | Stick (linke Hälfte) |
| Springen, Doppelsprung | Z, K, Leertaste | A | A |
| Angriff in 8 Richtungen | X, J (+ Richtung) | X / B | B |
| Peitsche drehen / Schwertwirbel | Angriff halten | Angriff halten | B halten |
| Ankerring: einhaken & pendeln | schräg hoch angreifen, Z = abspringen | dito | dito |
| Rutschen (unverwundbar) | Unten + Z | Unten + A | Unten + A |
| Spezialwaffe / Heiliger Sturm | C / C halten | Y / Y halten | SUB |
| Pause · Ton · Vollbild | Enter · M · F | Menü · Ansicht | II |

## Inhalt

- **2 Helden**: Henrik (Peitsche) und Ragnor, Barbar aus dem Norden (Breitschwert + Wurfseil)
- **3 Stages, 12 Räume** inkl. Kletterschächten und dem *Seelenstrudel* mit drehender Walze wie in Super Castlevania IV
- **Glasturm** vor dem Thronsaal: senkrechter Aufstieg zwischen riesigen gotischen Buntglasfenstern – drehende Rosetten (Mode 7), farbige Lichtbahnen, Blitze lassen das Glas aufleuchten, ferner Chor
- **Ankunft per Schiff** (wie in Bloodstained): hohe Galeone im Sturm – über Strickleitern hinauf in die Takelage bis in den Mastkorb, mit **Seilrutschen** von Mast zu Mast; Fischmenschen entern von See aus, **Seeadler** stoßen im Sturzflug herab; eigenes Seemannslied im 6/8-Takt – am Bug „Land in Sicht!“, das Schiff kracht an die Mole und die Laufplanke fällt
- **Mode-7-Seegang**: das ganze Bild rollt und stampft mit dem Schiff (Drehpunkt an der Wasserlinie – oben im Mast schwankt es stärker), riesige Segel blähen sich zeilenweise im Wind (HDMA) samt Blutmond-Wappen
- **Mode-7-Ozean**: perspektivisches Meer mit Höhenfeld – Dünungsberge rollen heran, eine Monsterwelle türmt sich über den Horizont, ein Riesenkrake reckt seine Fangarme aus dem Wasser
- **3 Bosse** mit Kino-Auftritt, Musik-Eskalation in Phase 2 und Zeitlupen-Finale; der Graf verwandelt den Thronsaal in einen Strudel
- **6 Sprachen**: Deutsch, Englisch, Französisch, Spanisch, Japanisch, Chinesisch (Optionen → Sprache)
- **Sprachausgabe**: Erzähler, Stage-Ansagen, Boss-Auftritte und Spott des Grafen – Studioaufnahmen (ElevenLabs) für EN/FR/ES/JA/ZH, Deutsch über die Browser-Stimme
- **Arcade-Flow**: BEREIT?/LOS! beim Start, hochrollender Score, Combo-Ansager mit Zeitbalken, Rang S–D mit Bonus, Bestzeit pro Stage, Lebensleisten mit Nachlauf, Boss-Leiste füllt sich beim Auftritt, 1UP-Anzeige, gedämpfte Musik im Pausenmenü
- **Bestenliste & Attract-Modus**: TOP 10 mit 3-Buchstaben-Initialen (Tastatur, Controller, Touch; getrennt für den Leicht-Modus); nach 20 s im Titel wechseln Bestenliste und eine Demo, in der die KI spielt
- **Blutmond-Kerzen**: eine rote Kerze pro Stage – 12 Sekunden doppelte Punkte, mehr Herzen, rote Nacht
- **Raumklang**: Stereo-Effekte nach Position, eigenes Ambiente pro Gebiet (Regen, Turmwind, Uhrwerk, Tropfen, Ketten, Orgel), Schritte
- **SNES-Effekte**: schwankender Glockenturm beim Glockenschlag, Kamera-Zoom beim Boss-Auftritt, drehende Rosette im Thronsaal, drehende HDMA-Walze, XXL-Kronleuchter mit Mode-7-Drehung, Mode-7-Weltkarte, Mosaik-Übergänge, animierte Lichtstrahlen und weiche Farbsäume
- **Spielgefühl**: Combos mit Punkte-Multiplikator, Pixel-Zerfall besiegter Gegner, Schockwellen, Trefferstopp, Nachbilder, Look-Ahead-Kamera, Herzschlag bei wenig Leben
- **Welt**: Gewitter mit Blitzen, Ankerringe, Pendel-Kronleuchter mit begehbaren Etagen, drehende Zahnrad-Plattformen, Aufzüge, Bröckelsteine, Checkpoint-Statuen, Truhen, Gespenster
- **Optionen**: Leicht-Modus (2× Leben, 2× Schaden), maximale Waffe, unendlich Herzen, Musik, Sprachausgabe, Sprache, Röhren-Look, Vollbild
- **Musik**: eigener Chiptune-Soundtrack, live synthetisiert (Puls + Echo, Dreieck, Drumkit mit Doppelbass, Orgel-Fläche)

## Technik

Vanilla JavaScript + Canvas 2D, 240 px hoch, Breite passt sich dem Bildschirm an (randlos). Alle Grafiken entstehen im Code.

`?stage=3&room=3` startet direkt in einem Raum (zum Testen).
