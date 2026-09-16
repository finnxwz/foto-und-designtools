// Versionierter, lokaler Tabler-Bestand. Nur dieser Build benötigt Internet.
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const version = '3.46.0';
const integrity = 'f2RYFl3fzPwj5WO82x6en0dmkjefxEfOm16D1ByM6cj/McNiwOkL4VaPUoP9VVIrXAD9WnTSVFr70px703b//A==';
const url = `https://registry.npmjs.org/@tabler/icons/-/icons-${version}.tgz`;
const response = await fetch(url);
if (!response.ok) throw new Error(`Download fehlgeschlagen: ${response.status}`);
const archive = Buffer.from(await response.arrayBuffer());
if (createHash('sha512').update(archive).digest('base64') !== integrity) throw new Error('Prüfsumme des Icon-Pakets stimmt nicht.');

// Nur vier bekannte Dateien aus dem TAR lesen; keine Pfade aus dem Archiv extrahieren.
const wanted = new Set(['package/icons.json', 'package/tabler-nodes-outline.json', 'package/tabler-nodes-filled.json', 'package/LICENSE']);
const files = new Map(), tar = gunzipSync(archive);
for (let position = 0; position + 512 <= tar.length;) {
  const header = tar.subarray(position, position + 512);
  const name = header.subarray(0,100).toString().replace(/\0.*$/s,'');
  if (!name) break;
  const size = parseInt(header.subarray(124,136).toString().replace(/\0.*$/s,'').trim(),8);
  if (!Number.isSafeInteger(size) || size < 0 || position + 512 + size > tar.length) throw new Error('Ungültiges TAR-Archiv.');
  if (wanted.has(name)) files.set(name, tar.subarray(position + 512, position + 512 + size).toString('utf8'));
  position += 512 + Math.ceil(size/512)*512;
}
for (const name of wanted) if (!files.has(name)) throw new Error(`Datei fehlt im Paket: ${name}`);
const metadata = JSON.parse(files.get('package/icons.json'));
const allowedTags = new Set(['path','line','circle','rect','ellipse','polygon','polyline']);
const allowedAttributes = new Set(['d','x','y','x1','y1','x2','y2','width','height','rx','ry','cx','cy','r','points','stroke','stroke-width','fill','fill-rule','clip-rule','stroke-linecap','stroke-linejoin','opacity','transform']);
const icons = [];
for (const style of ['outline','filled']) {
  const nodes = JSON.parse(files.get(`package/tabler-nodes-${style}.json`));
  for (const [name, shapes] of Object.entries(nodes)) {
    if (!/^[a-z0-9-]+$/.test(name)) throw new Error(`Ungültiger Iconname: ${name}`);
    for (const [tag, attributes] of shapes) {
      if (!allowedTags.has(tag)) throw new Error(`Unbekanntes SVG-Element: ${tag}`);
      for (const [key,value] of Object.entries(attributes)) {
        if (!allowedAttributes.has(key) || /url\s*\(|javascript:|[<>]/i.test(String(value))) throw new Error(`Unbekanntes SVG-Attribut: ${name}/${key}`);
      }
    }
    const meta = metadata[name] || {};
    icons.push([name, style, meta.category || 'Other', meta.tags || [], shapes]);
  }
}
if (icons.length < 6000) throw new Error('Der Iconbestand ist unerwartet klein.');
mkdirSync('vendor/tabler', { recursive:true });
writeFileSync('vendor/tabler/LICENSE.txt', files.get('package/LICENSE'));
writeFileSync('vendor/tabler/catalog.js', `/* Tabler Icons ${version} · MIT · Copyright (c) 2020-2026 Paweł Kuna. See LICENSE.txt. */\nwindow.TablerCatalog = ${JSON.stringify({version, license:files.get('package/LICENSE'), icons})};\n`);
writeFileSync('vendor/tabler/manifest.json', JSON.stringify({version, source:url, integrity:`sha512-${integrity}`, total:icons.length, outline:icons.filter(icon=>icon[1]==='outline').length, filled:icons.filter(icon=>icon[1]==='filled').length},null,2));
console.log(`Tabler ${version}: ${icons.length} Icons lokal erstellt (${icons.filter(icon=>icon[1]==='outline').length} Outline / ${icons.filter(icon=>icon[1]==='filled').length} Filled).`);
