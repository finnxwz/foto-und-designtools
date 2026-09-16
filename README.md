# Foto- und Designtools

Dein persönlicher, lokaler Werkzeugkasten für Foto und Design.

## Online öffnen

**GitHub Pages:** https://finnxwz.github.io/foto-und-designtools/

Die Website wird direkt aus dem Branch `main` veröffentlicht. Nach einem Push aktualisiert GitHub Pages die Seite automatisch. `.nojekyll` sorgt für die unveränderte Auslieferung der statischen Dateien.

Auch online werden deine Bilder und eigenen Fontdateien im Browser verarbeitet. Die Statistik wird im jeweiligen Browser gespeichert; die Online-Adresse und eine lokal geöffnete Datei haben getrennte Browserspeicher. Google Fonts werden bei Auswahl von Google geladen.

## Öffnen

Die Datei **index.html** mit einem Doppelklick im Browser öffnen. Es sind keine Installation und kein Server erforderlich. Foto-, Farbpaletten-, QR- und Icontools funktionieren offline. Im Schriftchecker werden ausgewählte **Google Fonts** bei Bedarf über das Internet geladen; installierte PC-Schriften und eigene Fontdateien bleiben lokal.

## Bildkonverter

1. Die Kachel **Bildkonverter** öffnen.
2. **PNG oder JPEG** als Ausgabeformat auswählen. Die Auswahl gilt für anschließend hinzugefügte Bilder.
3. Ein oder mehrere Bilder aus dem Explorer in den großen Drag-and-drop-Bereich ziehen oder über „Dateien auswählen“ öffnen.
4. Jedes Bild wird automatisch konvertiert und zum Speichern übergeben. Ein zusätzlicher Download-Button bleibt für jedes Ergebnis verfügbar.

Unterstützte Eingaben: JPEG/JPG/JFIF, WEBP, PNG, AVIF und BMP, soweit der Browser das jeweilige Bild decodieren kann. Fehlerhafte Dateien erhalten einen Hinweis; die restliche Warteschlange läuft weiter.

## Image Size Reducer

1. Bilder hineinziehen.
2. Für jedes Bild **PNG oder JPEG** wählen. PNG ist voreingestellt.
3. Die Varianten **75 %, 50 % und 20 %** vergleichen. Angezeigt werden die tatsächliche Dateigröße, die neuen Pixelabmessungen und der Unterschied zum Original.
4. Eine Variante auswählen und auf **Herunterladen** klicken. 50 % ist vorausgewählt; ohne Download-Klick wird nichts exportiert.

Die Prozentwerte beziehen sich auf **Breite und Höhe**, nicht auf die Dateigröße. Bei 50 % bleiben ungefähr 25 % der ursprünglichen Pixelanzahl. Die Größen werden durch vollständiges Berechnen der Dateien bestimmt und sind keine Schätzungen.

### PNG oder JPEG?

- **PNG:** verlustfreie Speicherung, Transparenz bleibt erhalten. Gerade bei Fotos kann die Datei trotz kleinerer Abmessungen größer als ein JPEG-Original werden.
- **JPEG:** hohe Qualitätsstufe von 95 %, jedoch verlustbehaftet. Transparente Bereiche werden weiß hinterlegt.
- Verkleinern reduziert immer die enthaltenen Bilddetails. Die App verwendet hochwertige Browser-Skalierung.
- Die Bildausrichtung aus EXIF wird berücksichtigt. Metadaten werden beim Export nicht übernommen. Animierte Eingaben werden als einzelnes Standbild exportiert.

## Bilder gesammelt umbenennen

- Bilder hinzufügen und Basisnamen, Startnummer, Ziffernanzahl sowie Trennzeichen wählen.
- Die Vorschau zeigt sofort die neuen Dateinamen; sortieren nach Auswahl, Dateiname oder Dateidatum ist möglich. Einzelne Dateien lassen sich aus der Liste entfernen.
- **ZIP herunterladen** bündelt alle umbenannten Kopien. **Dateien speichern** exportiert sie einzeln in den Zielordner bzw. als Browser-Downloads.
- Dateiendungen und Bilddaten bleiben unverändert. Die Originale werden nicht umbenannt oder überschrieben. Unzulässige Zeichen im Basisnamen werden durch Unterstriche ersetzt.

## Farbpalette aus einem Bild

- Ein oder mehrere Bilder einlesen und zwischen drei und acht dominanten Farben wählen. Bilder mit weniger unterschiedlichen Farben liefern entsprechend weniger Farben.
- Ein Klick auf eine Farbkachel kopiert ihren **HEX- oder RGB-Code**. Alle Codes lassen sich auch gemeinsam kopieren.
- **Palette als PNG** exportiert die Farbfelder einschließlich HEX-/RGB-Beschriftung.
- Die Farbanalyse erfolgt auf einer verkleinerten Vorschau mittels gewichtetem Clustering. Vollständig transparente Bereiche werden ignoriert; teilweise transparente Pixel werden auf Weiß betrachtet.

## Schriftkombinationen

- Der vollständige mitgelieferte **Google-Fonts-Katalog mit 1.946 Familien** und ein Abbild der **550 auf diesem PC gefundenen Familien** stehen zur Auswahl. Ein Klick auf den Schriftnamen öffnet die Suche mit Quellen- und Typfiltern.
- Für Überschrift und Fließtext jeweils den **Typ für Zufall** wählen: Serif, Sans Serif, Display, Handschrift, Monospace, Symbole, Unbekannt oder alle Typen. **Neue Kombi würfeln** stellt eine neue Kombination zusammen, die diese Filter einhält.
- Unter **Filter & Feineinstellungen** lässt sich der Zufall auf Google Fonts, diesen PC oder eigene Dateien begrenzen. Die Option **Lateinische Zeichen** ist voreingestellt; sie schließt nichtlateinische Google-Familien und lokale Symbolschriften aus dem Zufallspool aus.
- **Je drei Überschriften und Blocktexte** aus den Bereichen Designstudio, Magazin und Produktseite lassen sich unabhängig auswählen. Größen, Zeilenabstand und linksbündiger Satz/Blocksatz sind einstellbar.
- **Schriftquellen → PC neu einlesen** ergänzt die aktuelle lokale Liste in Chrome/Edge nach einer Browser-Freigabe. In anderen Browsern bleibt das mitgelieferte PC-Abbild verfügbar. Nach Änderungen an den installierten Fonts kann dieses über das Build-Skript aktualisiert werden.
- **Schriftquellen → Schriftdateien +** lädt WOFF, WOFF2, TTF und OTF. Eigene Dateien werden nicht hochgeladen und bleiben bis zum Neuladen verfügbar.
- Google-Schriften werden erst nach der Auswahl geladen, nicht der gesamte Fontbestand. Für neue Downloads wird Internet benötigt. Die Vorschau zeigt den Namen der tatsächlich geladenen Schrift. Bei Ladefehlern bleibt die bisherige Vorschau mit einer Fehlermeldung erhalten; fehlende Glyphen innerhalb einer Schrift kann der Browser durch Ersatzglyphen darstellen.
- Typen lokaler Fonts werden nach Möglichkeit aus OpenType-Metadaten erkannt. Nicht eindeutig klassifizierbare Fonts bleiben **Unbekannt** und lassen sich unter **Filter & Feineinstellungen** manuell zuordnen.
- Der **Export-Button und das Speicherziel wurden aus dem Fontchecker entfernt**. Die Statistik zählt jetzt erfolgreich angezeigte, bewusst ausgewählte oder gewürfelte Kombinationen, einmal pro Paar und Sitzung. Ein Wechsel der Beispieltexte oder Größen erhöht den Zähler nicht.

## QR-Codes gestalten

- Link oder Text eingeben; die Vorschau aktualisiert sich automatisch. Auch Umlaute, Emoji und andere Schriften werden unterstützt.
- Codefarbe, Hintergrund, Rand, PNG-Größe und Fehlerkorrektur anpassen.
- Export als **PNG mit 512, 1024 oder 2048 Pixeln** oder als skalierbare **SVG**.
- Der Rand beträgt mindestens vier Module. PNG-Module werden auf ganze Pixel ausgerichtet. Ein zu geringer Kontrast oder ein zu langer Inhalt wird angezeigt; ein ungültiges Ergebnis kann nicht exportiert werden.
- Keine Kurzlinks, kein Tracking, keine Verbindung zu einem QR-Dienst. Der Generator ist lokal enthalten.

## Icongalerie

Im Bereich **Design** findest du die Galerie mit dem vollständigen **Tabler-Icons-Bestand v3.46.0**: **6.184 Icons**, davon 5.130 Outline und 1.054 Filled.

- Suche nach englischen Namen und Tags sowie häufigen deutschen Begriffen wie **Kamera**, **Pfeil**, **Herz**, **Papierkorb** oder **Einstellungen**.
- Kombiniere Suche mit Kategorien, **Outline / Filled / Alle**, Favoriten und alphabetischer Sortierung.
- Die Galerie zeigt 72 Icons pro Seite. Nur die sichtbare Seite wird gerendert; die Liste lässt sich innerhalb der Galerie scrollen.
- Ein Klick öffnet die Detailvorschau. **Farbe**, **Exportgröße von 24 bis 1024 Pixeln**, **Strichstärke** und **Hintergrund** lassen sich einstellen. Filled-Icons benötigen keine Strichstärke.
- Die Iconfarbe ist zunächst **automatisch**: `#292d29` im Lightmode und `#efefe7` im Darkmode. Eine manuell ausgewählte Farbe bleibt beim Moduswechsel bestehen. **Automatisch** stellt die Modusfarbe wieder her. Das gilt auch für SVG-Kopien und Exporte.
- **SVG kopieren**, **SVG herunterladen** oder **PNG herunterladen**. Der Hintergrund ist standardmäßig transparent. Alle Exporte verwenden die gewählten Einstellungen.
- Der Stern merkt Favoriten lokal in diesem Browser. Ist der Browserspeicher nicht verfügbar, bleiben Favoriten für die Sitzung erhalten.
- Auf dem Desktop bleiben Vorschau und Export neben der Galerie. Auf kleinen Bildschirmen führt die Icon-Auswahl zur Detailansicht unterhalb der Galerie.

Der Iconbestand liegt unter `vendor/tabler/` und wird erst beim ersten Öffnen der Galerie als lokales Script geladen. Die fertige Website benötigt dafür weder Internet noch einen Server. Die Originale stammen von [Tabler Icons](https://tabler.io/icons) unter der **MIT-Lizenz**; der Lizenztext liegt bei und wird als Kommentar in kopierte/exportierte SVGs aufgenommen.

## Direkt auf den Desktop speichern

In unterstützten **Chrome-/Edge-Versionen** gibt es die Schaltfläche **„Desktop / Ordner wählen“**:

1. Den Desktop im Ordnerdialog auswählen und Schreibzugriff erlauben.
2. Danach werden Exporte automatisch in diesen Ordner geschrieben.
3. Der Ordner wird nach Möglichkeit lokal gemerkt. Fordert der Browser bei einem späteren Start erneut eine Freigabe, auf **„Ordner erneut freigeben“** klicken.

Bestehende Dateien werden nicht überschrieben: Bei Namenskollisionen werden Zusätze wie `(1)` und `(2)` angehängt. Originale bleiben erhalten.

Ohne Ordnerfreigabe bzw. in anderen Browsern nutzt die App normale Browser-Downloads. **Damit diese auf dem Desktop landen, den Downloadordner in den Browsereinstellungen auf Desktop setzen.** Bei mehreren automatischen Downloads kann eine Browser-Freigabe erforderlich sein. Ein blockierter Download lässt sich über den Download-Button erneut anstoßen.

## Statistik

Im Header auf **Statistik** klicken:

- Anzahl erfolgreicher Konvertierungen in PNG oder JPEG
- Anzahl exportierter Verkleinerungen
- Anzahl umbenannter und exportierter Bilder
- Anzahl erfolgreich erstellter Farbpaletten
- Anzahl erfolgreich getesteter Schriftkombinationen
- Anzahl exportierter QR-Designs
- Anzahl übernommener Icon-Designs (SVG-Kopie oder SVG-/PNG-Export)
- Die letzten zwölf Aktionen

Konvertierungen und Farbpaletten zählen nach erfolgreicher Berechnung. Verkleinerungen, Umbenennungen und QR-Designs zählen beim Speichern in den Zielordner bzw. beim Anstoßen des Browser-Downloads. Ob ein normaler Browser-Download tatsächlich abgeschlossen wurde, kann eine Website nicht prüfen. Wiederholte Exporte derselben geladenen Variante bzw. desselben Designs werden nicht mehrfach gezählt. Bei Umbenennungen wird pro Bild und neuem Dateinamen gezählt, unabhängig davon, ob einzeln oder als ZIP exportiert wird. PNG und SVG desselben QR-Designs zählen zusammen einmal.

Schriftkombinationen zählen nach erfolgreichem Laden beider ausgewählten Fonts. Die anfängliche Standardvorschau, fehlgeschlagene Ladevorgänge und wiederholte Ansichten desselben Paars zählen nicht erneut. Frühere Schrift-Exportzähler werden erhalten und weitergeführt; ältere Aktionen bleiben im Verlauf als Exporte gekennzeichnet.

Bei Icons zählt auch das erfolgreiche Kopieren des SVG-Codes. Kopieren und Herunterladen desselben Icons mit denselben Einstellungen zählen pro Sitzung zusammen einmal. Favorisieren, Suchen und Auswählen erhöhen den Zähler nicht.

Die Statistik liegt ausschließlich im lokalen Browserspeicher. Sie enthält Zähler, Aktionsnamen und Zeitpunkte, keine Bilddaten oder QR-Inhalte. Bestehende Konvertierungs-/Resize-Zähler werden übernommen. Speicherersparnis und Größenvergleiche wurden aus der Statistik entfernt. Bei nicht verfügbarem Browserspeicher wird ein Hinweis angezeigt und die App zählt nur innerhalb der Sitzung. Löschen der Website-Daten entfernt die gespeicherte Statistik.

## Bedienung

- Die Startseite ist in **Foto** (Konverter, Reducer, Umbenennen) und **Design** (Farbpalette, Schriftkombis, QR-Codes, Icongalerie) aufgeteilt, mit zentriertem Titel und passenden Kachelgrafiken.
- Die Tool-Seiten sind für ein einzelnes Bild als kompakte Bildschirmansicht gestaltet: auf dem Desktop Eingabe und Ergebnis nebeneinander, auf schmalen Bildschirmen mit verkleinertem Drop-Bereich nach dem Einlesen. Bei mehreren Bildern wächst die Ergebnisliste nach unten.
- Ausführliche Informationen zu Speicherziel, Formaten und Skalierung erreichst du in jedem Tool über **Hinweise**.
- Helles und dunkles Design über das Symbol oben rechts; die Auswahl wird nach Möglichkeit gespeichert.
- Jedes Tool besitzt eine eigene Pastellfarbe für Kachel, Illustration, Buttons und Unterseite: **Apricot** (Konverter), **Salbei** (Reducer), **Hellblau** (Umbenennen), **Rosé** (Farbpalette), **Vanille** (Schriftkombis), **Mint** (QR-Codes) und **Pfirsich** (Icongalerie). Allgemeine Akzente und das PNG-Favicon verwenden ein neutrales Grün.
- Im Lightmode sorgen dunklere Hinweistexte, deckende Kachelbeschriftungen und klarere Eingabe-, Auswahl- und Fokusrahmen für höheren Kontrast. Die Pastellflächen bleiben erhalten.
- Alle Seiten sind per Maus, Touch und Tastatur bedienbar.
- Seitenwechsel innerhalb der App erhalten die Bildlisten und laufende Aufgaben. Neuladen oder Schließen entfernt die Bildlisten.
- **Liste leeren** gibt die Ergebnisse im Arbeitsspeicher frei. Bereits gespeicherte Dateien und Statistiken bleiben erhalten.

## Aufbau

- `index.html`: Startseite, Kacheln und Seitenbereiche
- `styles.css`: Grundgestaltung und Startseite
- `tools.css`: Tool- und Statistiklayouts
- `theme.css`: zentrale Pastellfarben, gemeinsame Akzente und Light-/Darkmode-Anpassungen
- `app.js`: Designumschaltung und Navigation
- `local-tools.js`: Bildverarbeitung, lokale Speicherung und Statistikablage
- `tool-pages.js`: Drag-and-drop, Warteschlangen, Ergebnisansichten und Statistik
- `creative-core.js`: ZIP-Erstellung, Namensschema, Farbanalyse und QR-Export
- `creative-tools.js` / `creative-tools.css`: neue Foto- und Designtools
- `font-checker.js` / `font-checker.css`: Fontauswahl, Typfilter, Zufallsgenerator und Beispieltexte
- `font-library.js`: lokale und Google-Fonts-Kataloge, Fontdateien und Browser-Freigabe
- `font-metadata.js`: OpenType-Namen und Schrifttypen aus TTF/OTF/TTC/WOFF
- `vendor/fonts/`: Google-Fonts-Katalog und Familienliste dieses PCs
- `scripts/build-font-catalogs.mjs` / `scripts/list-system-fonts.ps1`: Kataloge aktualisieren
- `icon-gallery.js` / `icon-gallery.css`: Suche, Filter, Favoriten, Vorschau und Export von Icons
- `vendor/tabler/`: lokaler Tabler-Bestand einschließlich Lizenz, Herkunft und Prüfsumme
- `scripts/build-icons.mjs`: reproduzierbarer Import von Tabler Icons 3.46.0
- `vendor/qrcodegen.js`: lokal eingebundener QR-Generator von Project Nayuki (MIT)
- `favicon.png`: hochauflösendes Favicon, **1024 × 1024 Pixel**, transparente Ecken
- `scripts/build-assets.mjs`: reproduzierbare Erstellung des Favicons und der lokalen Bibliotheken
- `tests/browser-smoke.mjs`: automatisierte Browserprüfung ohne zusätzliche Pakete
- `tests/creative-checks.mjs`: ZIP-, Farbpaletten-, Schrift-, QR- und Statistiktests
- `tests/icon-checks.mjs`: Icon-Suche, Pagination, Favoriten, SVG-/PNG-Ausgabe, Kopieren und Statistik
- `tests/font-checks.mjs`: tatsächliches Laden von Google-/PC-Schriften, Typfilter, Zufall, Beispieltexte, Ladefehler und Statistik

Die Unterseiten verwenden `#convert`, `#resize`, `#rename`, `#palette`, `#fonts`, `#qr`, `#icons` und `#stats` innerhalb derselben lokalen Datei. Dadurch benötigen sie keinen Server, teilen denselben Browserspeicher und behalten laufende Aufgaben beim Seitenwechsel.

## Entwicklungstest

Voraussetzungen nur für den Test: Node.js ab Version 24 und eine aktuelle Firefox-Version unter Windows. Für den Test eigener Schriftdateien wird `C:\Windows\Fonts\arial.ttf` verwendet; der Google-Fonts-Test benötigt Internet. Der Artefaktordner muss bereits existieren.

```powershell
node tests/browser-smoke.mjs "C:\Program Files\Mozilla Firefox\firefox.exe" "C:\Pfad\zum\Testordner"
```

Der Test verwendet ein separates Browserprofil und selbst erzeugte Bilder. Geprüft werden Bildverarbeitung, Drag-and-drop, EXIF, Transparenz, Größenvarianten, unveränderte Bildbytes im ZIP, Farbanalyse, echte lokale und Google-Fontdateien, Statistikmigration und kompakte Layouts. Ein unabhängiger, lokal eingebundener **jsQR-Decoder** liest die QR-Vorschau sowie PNG- und SVG-Exporte zurück, einschließlich Unicode und langer Inhalte. Download-Auslösung, Ordnerzugriff und die lokale Font-Freigabe werden abgefangen bzw. simuliert; die Verarbeitung der Fontdateien selbst läuft echt. Screenshots bleiben im Artefaktordner erhalten, die eigens erzeugten Browser-Profildaten werden nach dem Test entfernt. Native Chrome-/Edge-Freigabedialoge sind nicht Bestandteil dieses Firefox-Tests.

Die fertige Website benötigt keinen Build-Schritt. Nur zum Neuerstellen der Assets: `node scripts/build-assets.mjs` erzeugt das Favicon; mit `--vendor` werden zusätzlich die versionierten Bibliotheken heruntergeladen. Lizenzhinweise stehen unter `vendor/` und `tests/vendor/`.

`node scripts/build-icons.mjs` erstellt den lokalen Iconbestand aus dem versionierten offiziellen npm-Paket. Der Download wird anhand seiner fest hinterlegten SHA-512-Prüfsumme geprüft. Dieser Entwicklungsschritt benötigt Internet; die fertige Galerie nicht.

`node scripts/build-font-catalogs.mjs` aktualisiert den vollständigen Google-Familienkatalog und das Abbild der installierten Schriftfamilien dieses Windows-PCs. Die tatsächlichen Google-Fontdateien werden anschließend nur auf Auswahl im Browser geladen.
