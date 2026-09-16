# Tabler Icons – lokal

- **Version:** 3.46.0
- **Bestand:** 6.184 Icons (5.130 Outline, 1.054 Filled)
- **Quelle:** https://tabler.io/icons / https://github.com/tabler/tabler-icons
- **Lizenz:** MIT, vollständiger Text in `LICENSE.txt`

`catalog.js` enthält SVG-Geometrien, Namen, Kategorien und englische Suchbegriffe aus dem offiziellen npm-Paket `@tabler/icons`. Es wird erst beim Öffnen der Icongalerie als lokales Script geladen, damit die App auch per `file://` ohne Server funktioniert.

Reproduzierbarer Build: `node scripts/build-icons.mjs` (Node >= 24, Internet nur für den Build). Version und SHA-512-Prüfsumme sind fest vorgegeben; der Build liest nur die bekannten JSON-/Lizenzdateien und prüft die SVG-Elemente und Attribute. Paketquelle und Bestandszahlen stehen in `manifest.json`.

Die exportierten SVGs enthalten die MIT-Lizenz als Kommentar. PNG-Dateien werden aus den angepassten SVGs lokal im Browser gerendert.
