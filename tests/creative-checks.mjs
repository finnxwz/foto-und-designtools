import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32 } from 'node:zlib';
import { fontChecks } from './font-checks.mjs';

export async function creativeChecks({ evaluate, until, command, context, profile }) {
  async function page(name) {
    await evaluate(`location.hash = '${name}';`);
    await until(`!document.getElementById('${name}-view').hidden`);
  }
  async function screenshot(name) {
    const image = await command('browsingContext.captureScreenshot', { context, origin: 'document' });
    writeFileSync(join(profile, name + '.png'), Buffer.from(image.data, 'base64'));
  }
  async function fits(name) {
    await page(name);
    for (const [width,height] of [[1280,720],[1024,650],[768,600],[390,740],[360,640]]) {
      await command('browsingContext.setViewport', { context, viewport:{width,height}, devicePixelRatio:1 });
      const geometry = await evaluate(`return {height:document.documentElement.scrollHeight, width:document.documentElement.scrollWidth, viewport:innerHeight, vw:innerWidth};`);
      if (geometry.height > geometry.viewport || geometry.width > geometry.vw) { await screenshot(`${name}-${width}-overflow`); console.log('Layout-Diagnose:', profile); }
      assert.ok(geometry.height <= geometry.viewport, `${name}: ${width}×${height}, Inhalt ${geometry.height}px`);
      assert.ok(geometry.width <= geometry.vw, `${name}: kein horizontaler Überlauf`);
    }
    await command('browsingContext.setViewport', { context, viewport:{width:1280,height:720}, devicePixelRatio:1 });
    await screenshot(name);
  }

  assert.deepEqual(await evaluate(`const image=new Image(); image.src='favicon.png'; await image.decode(); return [image.naturalWidth,image.naturalHeight];`),[1024,1024],'Hochauflösendes PNG-Favicon vorhanden');
  await page('rename');
  await evaluate(`addTestFiles('rename',[testFiles.png,testFiles.jpeg],true); const prefix=document.getElementById('rename-prefix'); prefix.value='Urlaub/2026'; prefix.dispatchEvent(new Event('input',{bubbles:true})); const start=document.getElementById('rename-start'); start.value='10'; start.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.deepEqual(await evaluate(`return [...document.querySelectorAll('.new-name')].map(node=>node.textContent);`),['Urlaub_2026_010.png','Urlaub_2026_011.jpeg']);
  await evaluate(`document.querySelector('#rename-view .export-actions .primary-button').click();`);
  await until(`KreativTools.readStats().renamed === 2 && !KreativCreative.busy`);
  const archive = await evaluate(`const blob=await (await fetch(testDownloads.at(-1).url)).blob(); return {name:testDownloads.at(-1).name, bytes:Array.from(new Uint8Array(await blob.arrayBuffer())), originals:await Promise.all([testFiles.png,testFiles.jpeg].map(async file=>Array.from(new Uint8Array(await file.arrayBuffer()))))};`);
  assert.equal(archive.name,'umbenannte-bilder.zip');
  const bytes = Buffer.from(archive.bytes);
  let position=0;
  for (const [index,name] of ['Urlaub_2026_010.png','Urlaub_2026_011.jpeg'].entries()) {
    assert.equal(bytes.readUInt32LE(position),0x04034b50);
    assert.equal(bytes.readUInt16LE(position+8),0,'ZIP speichert ohne Neukompression');
    const size=bytes.readUInt32LE(position+18), nameSize=bytes.readUInt16LE(position+26);
    assert.equal(bytes.subarray(position+30,position+30+nameSize).toString('utf8'),name);
    const data=bytes.subarray(position+30+nameSize,position+30+nameSize+size);
    assert.deepEqual([...data],archive.originals[index],'Bildbytes im ZIP sind unverändert');
    assert.equal(bytes.readUInt32LE(position+14),crc32(data),'ZIP-Prüfsumme mit unabhängigem zlib prüfen');
    position+=30+nameSize+size;
  }
  assert.equal(bytes.readUInt32LE(position),0x02014b50,'Zentrales ZIP-Verzeichnis vorhanden');
  assert.equal(bytes.readUInt32LE(bytes.length-22),0x06054b50);
  assert.equal(bytes.readUInt16LE(bytes.length-12),2);
  await evaluate(`document.querySelector('#rename-view .export-actions .secondary-button').click();`);
  await until(`!KreativCreative.busy`);
  assert.equal(await evaluate('return KreativTools.readStats().renamed;'),2,'ZIP und einzelne Downloads werden nicht doppelt gezählt');
  await evaluate(`const start=document.getElementById('rename-start'); start.value='-1'; start.dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await evaluate(`return document.querySelector('#rename-view .export-actions .primary-button').disabled;`),true);
  await evaluate(`const start=document.getElementById('rename-start'); start.value='10'; start.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('#rename-view .rename-row:last-child button').click();`);
  await fits('rename');

  await page('palette');
  await evaluate(`
    const c=document.createElement('canvas');c.width=100;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,50,80);ctx.fillStyle='#0000ff';ctx.fillRect(50,0,50,80);
    const blob=await new Promise(resolve=>c.toBlob(resolve));window.paletteTest=new File([blob],'farben.png',{type:'image/png'});
    addTestFiles('palette',[paletteTest],true);
  `);
  await until(`KreativTools.readStats().palettes === 1 && !KreativCreative.busy`);
  assert.deepEqual(await evaluate(`return [...document.querySelectorAll('.swatch-code')].map(node=>node.textContent).sort();`),['#0000FF','#FF0000']);
  await evaluate(`Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.clipboardTest=text;}}});document.querySelector('.palette-swatch').click();`);
  await until(`Boolean(window.clipboardTest)`);
  assert.match(await evaluate(`return clipboardTest;`),/^#(?:FF0000|0000FF)$/);
  await evaluate(`document.getElementById('palette-format').value='rgb';document.getElementById('palette-format').dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('#palette-view .export-actions .secondary-button').click();`);
  await until(`clipboardTest.startsWith('rgb')`);
  assert.match(await evaluate(`return clipboardTest;`),/rgb\(255, 0, 0\)/);
  await evaluate(`document.querySelector('#palette-view .export-actions .primary-button').click();`);
  await until(`!KreativCreative.busy`);
  assert.equal(await evaluate(`return testDownloads.at(-1).name;`),'farben-palette.png');
  assert.deepEqual(await evaluate(`const image=await createImageBitmap(await (await fetch(testDownloads.at(-1).url)).blob());const size=[image.width,image.height];image.close();return size;`),[480,360]);
  await evaluate(`document.getElementById('palette-count').value='8';document.getElementById('palette-count').dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await evaluate(`return KreativTools.readStats().palettes;`),1);
  await fits('palette');
  await evaluate(`const c=document.createElement('canvas');c.width=c.height=10;const b=await new Promise(resolve=>c.toBlob(resolve));addTestFiles('palette',[new File([b],'transparent.png',{type:'image/png'})]);`);
  await until(`!KreativCreative.busy`);
  assert.equal(await evaluate(`return KreativTools.readStats().palettes;`),1,'Vollständig transparente Bilder zählen nicht');
  assert.equal(await evaluate(`return document.querySelectorAll('#palette-view .palette-result .inline-error').length;`),1);
  await evaluate(`
    document.querySelector('#palette-view .clear-results').click();
    const c=document.createElement('canvas');c.width=128;c.height=80;const ctx=c.getContext('2d');
    ['#FF0000','#00FF00','#0000FF','#FFFF00','#00FFFF','#FF00FF','#000000','#FFFFFF'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*16,0,16,80);});
    const blob=await new Promise(resolve=>c.toBlob(resolve));addTestFiles('palette',[new File([blob],'acht-farben.png',{type:'image/png'})]);
  `);
  await until(`KreativTools.readStats().palettes === 2 && !KreativCreative.busy`);
  assert.equal(await evaluate(`return document.querySelectorAll('#palette-view .palette-swatch').length;`),8);
  await fits('palette');

  const fontPairs=await fontChecks({evaluate,until,command,context,profile});

  await page('qr');
  await evaluate(`await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('tests/vendor/jsQR.js',location.href).href;script.onload=resolve;script.onerror=reject;document.head.append(script);});`);
  async function decodedCanvas() { return evaluate(`const c=document.querySelector('#qr-view canvas'),ctx=c.getContext('2d');return jsQR(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height)?.data;`); }
  assert.equal(await decodedCanvas(),'https://example.com','QR-Vorschau durch unabhängigen Decoder lesbar');
  const unicode='https://beispiel.de/Grüße?motiv=☀️&text=日本語';
  await evaluate(`document.getElementById('qr-text').value=${JSON.stringify(unicode)};document.getElementById('qr-text').dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await decodedCanvas(),unicode,'UTF-8 inklusive Emoji und nichtlateinischer Schrift');
  await evaluate(`document.querySelector('.qr-png').click();`);
  await until(`KreativTools.readStats().qrCodes === 1 && !KreativCreative.busy`);
  assert.equal(await evaluate(`const image=await createImageBitmap(await (await fetch(testDownloads.at(-1).url)).blob());const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();return jsQR(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height)?.data;`),unicode,'Exportierte PNG ist decodierbar');
  await evaluate(`document.querySelector('.qr-svg').click();`);
  await until(`!KreativCreative.busy`);
  assert.equal(await evaluate(`return KreativTools.readStats().qrCodes;`),1,'PNG/SVG desselben QR-Designs zählen einmal');
  assert.equal(await evaluate(`
    const blob=await (await fetch(testDownloads.at(-1).url)).blob();const text=await blob.text();const doc=new DOMParser().parseFromString(text,'image/svg+xml');
    doc.documentElement.setAttribute('width','1024');doc.documentElement.setAttribute('height','1024');const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(doc)],{type:'image/svg+xml'}));
    const image=new Image();image.src=url;await image.decode();const c=document.createElement('canvas');c.width=c.height=1024;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);URL.revokeObjectURL(url);
    return jsQR(ctx.getImageData(0,0,1024,1024).data,1024,1024)?.data;
  `),unicode,'Auch der SVG-Export ist decodierbar');
  await evaluate(`document.getElementById('qr-text').value='Langer Text: '+ 'abcdef0123456789'.repeat(40);document.getElementById('qr-text').dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await decodedCanvas(),'Langer Text: '+'abcdef0123456789'.repeat(40),'Mehrblock-QR mit hoher Version');
  await evaluate(`document.getElementById('qr-text').value='';document.getElementById('qr-text').dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await evaluate(`return document.querySelector('.qr-png').disabled && document.querySelector('.qr-svg').disabled;`),true,'Leerer Inhalt exportiert keinen alten QR-Code');
  await evaluate(`document.getElementById('qr-text').value='https://example.com';document.getElementById('qr-foreground').value='#ffffff';document.getElementById('qr-foreground').dispatchEvent(new Event('change',{bubbles:true}));`);
  assert.equal(await evaluate(`return document.querySelector('.qr-png').disabled;`),true,'Unlesbare identische Farben abfangen');
  await evaluate(`document.getElementById('qr-foreground').value='#292d29';document.getElementById('qr-foreground').dispatchEvent(new Event('change',{bubbles:true}));`);
  await fits('qr');

  await page('stats');
  assert.deepEqual(await evaluate(`return ['renamed','palettes','fontPairs','qrCodes'].map(key=>Number(document.getElementById('stat-'+key).textContent));`),[2,2,fontPairs,1]);
  assert.equal(await evaluate(`return /NETTO|EINGESPART|MEHR SPEICHER/.test(document.getElementById('stats-view').textContent);`),false);
  await screenshot('statistik-neu');
  console.log('OK: ZIP/Originalbytes, Umbenennung, Farbcluster/Kopieren/PNG, Schriftvorschau, QR-PNG/SVG unabhängig decodiert, neue Zähler und kompakte Layouts.');
  return {fontPairs};
}
