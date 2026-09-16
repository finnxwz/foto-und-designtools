# Lokale QR-Bibliothek

`qrcodegen.js` basiert auf **QR Code generator v1.8.0** von Project Nayuki (MIT).
Quelle: https://github.com/nayuki/QR-Code-generator/tree/v1.8.0

Der TypeScript-Quelltext wurde mit Nodes TypeScript-Transformation in JavaScript übersetzt. Der Lizenztext steht in der Datei. Die Bibliothek wird vollständig lokal geladen.

Erneutes Erstellen (Node >= 24): `node scripts/build-assets.mjs --vendor`.
Dabei werden auch das PNG-Favicon sowie jsQR 1.4.0 als unabhängiger Decoder **ausschließlich für Tests** erstellt/heruntergeladen.
