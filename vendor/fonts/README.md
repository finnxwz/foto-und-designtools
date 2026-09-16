# Schriftkataloge

## Google Fonts

`google-catalog.js` enthält den vollständigen Familienkatalog des Build-Zeitpunkts: **1.946 Familien** mit Kategorien, verfügbaren Schnitten und Zeichenbereichen.

Quelle: https://fonts.google.com/metadata/fonts

Die Fontdateien sind nicht gebündelt. Erst wenn eine Familie ausgewählt oder gewürfelt wird, lädt der Browser ihre CSS-Definition von `fonts.googleapis.com` und die für den Beispieltext benötigten Fontdateien von `fonts.gstatic.com`. Es werden keine eigenen Schriftdateien hochgeladen. Den Google-Endpunkten werden Familienname und benötigter Schnitt, nicht die Beispieltexte übermittelt.

## Auf diesem PC installierte Schriften

`system-catalog.js` enthält **550 Familien**, die beim Build über Windows-Fontregistrierungen und `InstalledFontCollection` gefunden wurden. Enthalten sind Familien-/Fontnamen und OpenType-Kategorien, keine Fontdateien und keine Dateipfade. Die Daten sind ein Abbild dieses PCs, keine universelle Liste für beliebige Geräte.

Im Browser ergänzt **Schriftquellen → PC neu einlesen** die Liste über `queryLocalFonts()` (Chrome/Edge, Freigabe erforderlich). Schrifttypen werden aus OpenType-Tabellen (`OS/2`, PANOSE, `post`) und passenden Google-Metadaten ermittelt. Fehlt die Information, bleibt der Typ „Unbekannt“. Lokale Zuordnungen können im Checker bearbeitet werden.

## Aktualisieren

Im Projektordner unter Windows mit Node >= 24:

```powershell
node scripts/build-font-catalogs.mjs
```

Das Skript lädt den aktuellen Google-Familienkatalog und erstellt das PC-Abbild neu. Es kopiert keine installierten Fontdateien in das Projekt. Beide Kataloge werden erst beim Öffnen des Fontcheckers als lokale Scripts geladen, sodass dafür kein Server erforderlich ist.
