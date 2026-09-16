// Einmalige Asset-Erstellung. Die fertige App benötigt weder Node noch Internet.
import { stripTypeScriptTypes } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const name = Buffer.from(type);
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  name.copy(result, 4); data.copy(result, 8);
  result.writeUInt32BE(crc32(Buffer.concat([name, data])), result.length - 4);
  return result;
}

// Markenstern in neutralem Grün, als antialiaste 1024×1024-PNG mit transparenten Ecken.
const size = 1024;
const pixels = Buffer.alloc((size * 4 + 1) * size);
const points = [[32,12],[37,27],[52,32],[37,37],[32,52],[27,37],[12,32],[27,27]];
function insideStar(x, y) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a,b] = points[i], [c,d] = points[j];
    if ((b > y) !== (d > y) && x < (c-a)*(y-b)/(d-b)+a) inside = !inside;
  }
  return inside;
}
for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
  let count = 0, r = 0, g = 0, b = 0;
  for (let sy = 0; sy < 4; sy++) for (let sx = 0; sx < 4; sx++) {
    const px = (x + (sx + .5)/4)/16, py = (y + (sy + .5)/4)/16;
    const dx = Math.max(18-px, 0, px-46), dy = Math.max(18-py, 0, py-46);
    if (dx*dx + dy*dy > 18*18) continue;
    const color = insideStar(px,py) ? [61,75,55] : [227,233,223];
    count++; r+=color[0]; g+=color[1]; b+=color[2];
  }
  const offset = y*(size*4+1)+1+x*4;
  if (count) { pixels[offset]=Math.round(r/count); pixels[offset+1]=Math.round(g/count); pixels[offset+2]=Math.round(b/count); pixels[offset+3]=Math.round(count/16*255); }
}
const header = Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
writeFileSync('favicon.png', Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR',header), chunk('IDAT',deflateSync(pixels)), chunk('IEND',Buffer.alloc(0))]));
console.log('favicon.png · 1024 × 1024 px');

if (process.argv.includes('--vendor')) {
  async function source(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${response.status}: ${url}`);
    return response.text();
  }
  mkdirSync('vendor', { recursive: true });
  const qr = await source('https://raw.githubusercontent.com/nayuki/QR-Code-generator/v1.8.0/typescript-javascript/qrcodegen.ts');
  const license = qr.slice(0, qr.indexOf('"use strict"'));
  const compiled = stripTypeScriptTypes(qr, { mode: 'transform', sourceMap: false });
  writeFileSync('vendor/qrcodegen.js', `${license}\n${compiled}\nwindow.QrEncoder = qrcodegen;\n`);
  mkdirSync('tests/vendor', { recursive: true });
  const decoder = await source('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js');
  writeFileSync('tests/vendor/jsQR.js', decoder);
  writeFileSync('tests/vendor/jsQR-LICENSE.txt', await source('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/LICENSE'));
  console.log('QR-Generator v1.8.0 und unabhängiger Testdecoder jsQR v1.4.0 lokal bereitgestellt.');
}
