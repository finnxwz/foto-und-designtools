import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export async function iconChecks({ evaluate, until, command, context, profile }) {
  async function edit(id,value,type='change') {
    await evaluate(`const input=document.getElementById(${JSON.stringify(id)}); input.value=${JSON.stringify(String(value))}; input.dispatchEvent(new Event(${JSON.stringify(type)},{bubbles:true}));`);
  }
  async function click(selector) { await evaluate(`document.querySelector(${JSON.stringify(selector)}).click();`); }
  async function exportDone() { await until(`document.getElementById('icons-view').dataset.exporting !== 'true' && !KreativIcons.busy`); }
  async function screenshot(name) {
    const image=await command('browsingContext.captureScreenshot',{context,origin:'document'});
    writeFileSync(join(profile,name+'.png'),Buffer.from(image.data,'base64'));
  }
  await evaluate(`location.hash='icons';`);
  await until(`document.getElementById('icons-view').getAttribute('aria-busy') === 'false' && document.querySelectorAll('.icon-tile').length > 0`);
  assert.equal(await evaluate(`return document.getElementById('icons-color').value === getComputedStyle(document.documentElement).getPropertyValue('--text').trim();`),true,'Icon-Standardfarbe folgt dem Textton');
  await click('.theme-toggle');
  assert.equal(await evaluate(`return document.getElementById('icons-color').value === getComputedStyle(document.documentElement).getPropertyValue('--text').trim();`),true,'Automatische Iconfarbe folgt dem Moduswechsel');
  await edit('icons-color','#1177cc','input');
  await click('.theme-toggle');
  assert.equal(await evaluate(`return document.getElementById('icons-color').value;`),'#1177cc','Manuelle Iconfarbe bleibt beim Moduswechsel erhalten');
  assert.equal(await evaluate(`return document.querySelector('.icon-auto-color').getAttribute('aria-pressed');`),'false');
  await click('.icon-auto-color');
  assert.equal(await evaluate(`return document.getElementById('icons-color').value === getComputedStyle(document.documentElement).getPropertyValue('--text').trim();`),true,'Automatisch stellt den Modus-Textton wieder her');
  assert.equal(await evaluate('return TablerCatalog.icons.length;'),6184);
  assert.equal(await evaluate(`return TablerCatalog.icons.filter(icon=>icon[1]==='outline').length;`),5130);
  assert.equal(await evaluate(`return TablerCatalog.icons.filter(icon=>icon[1]==='filled').length;`),1054);
  assert.equal(await evaluate(`return document.querySelectorAll('.icon-tile').length;`),72,'Nur eine Seite wird in den DOM geladen');
  const first=await evaluate(`return document.querySelector('.icon-tile').dataset.icon;`);
  await click('.gallery-next');
  assert.notEqual(await evaluate(`return document.querySelector('.icon-tile').dataset.icon;`),first);
  assert.equal(await evaluate(`return document.querySelector('.gallery-page').textContent;`),'2 / 72');
  await click('.gallery-previous');
  assert.equal(await evaluate(`return document.querySelector('.icon-tile').dataset.icon;`),first);

  await edit('icons-search','Kamera','input');
  assert.equal(await evaluate(`return !!document.querySelector('[data-icon="outline/camera"]');`),true,'Deutsches Suchwort findet Kamera');
  await edit('icons-category','Arrows');
  assert.equal(await evaluate(`return [...document.querySelectorAll('.icon-tile')].every(button=>TablerCatalog.icons.some(icon=>icon[1]+'/'+icon[0]===button.dataset.icon && icon[2]==='Arrows'));`),true,'Kategorie filtert zusätzlich zum Suchbegriff');
  await edit('icons-category','Zodiac');
  assert.equal(await evaluate(`return document.querySelector('.gallery-empty').hidden;`),false,'Leere Kombination zeigt Hinweis');
  assert.equal(await evaluate(`return [...document.querySelectorAll('.icon-export,.icon-copy')].every(button=>button.disabled);`),true,'Keine alten Ergebnisse bei leerer Suche exportieren');
  await click('.gallery-reset');
  await edit('icons-search','Pfeil','input');
  assert.equal(await evaluate(`return !!document.querySelector('[data-icon="outline/arrow-right"]');`),true);
  await edit('icons-search','camera','input');
  await click('[data-icon="outline/camera"]');
  await edit('icons-color','#1177cc','input');
  await edit('icons-size','512');
  await edit('icons-stroke','1.25','input');
  assert.equal(await evaluate(`return getComputedStyle(document.querySelector('.icon-large-preview svg')).stroke;`),'rgb(17, 119, 204)','Vorschau verwendet gewählte Farbe');
  assert.equal(await evaluate(`return getComputedStyle(document.querySelector('.icon-large-preview svg')).strokeWidth;`),'1.25px');
  await click('.icon-copy'); await exportDone();
  const svg=await evaluate('return clipboardTest;');
  assert.match(svg,/MIT License/); assert.match(svg,/stroke-width="1.25"/); assert.match(svg,/width="512"/);
  assert.equal(await evaluate(`const doc=new DOMParser().parseFromString(clipboardTest,'image/svg+xml');return doc.querySelector('parsererror')===null && doc.documentElement.namespaceURI==='http://www.w3.org/2000/svg';`),true,'Kopierter SVG-Code ist gültiges XML');
  assert.equal(await evaluate('return KreativTools.readStats().iconsExported;'),1);
  await click('.icon-export[data-format="svg"]'); await exportDone();
  assert.equal(await evaluate(`return testDownloads.at(-1).name;`),'tabler-camera-outline.svg');
  assert.equal(await evaluate(`return await (await fetch(testDownloads.at(-1).url)).text();`),svg,'Kopierter und heruntergeladener SVG sind identisch');
  await click('.icon-export[data-format="png"]'); await exportDone();
  assert.equal(await evaluate(`return testDownloads.at(-1).name;`),'tabler-camera-outline.png');
  assert.deepEqual(await evaluate(`
    const blob=await (await fetch(testDownloads.at(-1).url)).blob(); const image=await createImageBitmap(blob);
    const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);image.close();
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let colored=0;
    for(let i=0;i<pixels.length;i+=4) if(pixels[i+3]===255 && pixels[i]===17 && pixels[i+1]===119 && pixels[i+2]===204) colored++;
    return {size:[canvas.width,canvas.height],alpha:pixels[3],painted:colored>100};
  `),{size:[512,512],alpha:0,painted:true},'PNG hat richtige Abmessungen, Farbe und Transparenz');
  assert.equal(await evaluate('return KreativTools.readStats().iconsExported;'),1,'SVG-Kopie, SVG und PNG zählen zusammen einmal');
  await click('#icons-transparent');
  await edit('icons-background','#ffffff','input');
  await click('.icon-export[data-format="png"]'); await exportDone();
  assert.deepEqual(await evaluate(`const image=await createImageBitmap(await (await fetch(testDownloads.at(-1).url)).blob());const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();return [...ctx.getImageData(0,0,1,1).data];`),[255,255,255,255],'Farbiger Hintergrund landet im PNG');
  assert.equal(await evaluate('return KreativTools.readStats().iconsExported;'),2);

  await edit('icons-search','Herz','input');
  await click('.icon-styles button[data-style="filled"]');
  assert.equal(await evaluate(`return !!document.querySelector('[data-icon="filled/heart"]');`),true);
  await click('[data-icon="filled/heart"]');
  assert.equal(await evaluate(`return document.getElementById('icons-stroke').disabled;`),true,'Filled hat keine Strichstärke');
  await click('.icon-export[data-format="png"]'); await exportDone();
  assert.deepEqual(await evaluate(`const image=await createImageBitmap(await (await fetch(testDownloads.at(-1).url)).blob());const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);image.close();return [...ctx.getImageData(256,256,1,1).data];`),[17,119,204,255],'Filled-PNG ist wirklich gefüllt');
  assert.equal(await evaluate('return KreativTools.readStats().iconsExported;'),3);
  await click('.icon-favorite');
  assert.deepEqual(await evaluate(`return JSON.parse(localStorage.getItem('kreativraum-icon-favorites-v1'));`),['filled/heart']);
  await click('.favorite-filter');
  assert.equal(await evaluate(`return document.querySelectorAll('.icon-tile').length;`),1);
  await click('.icon-favorite');
  assert.equal(await evaluate(`return document.querySelectorAll('.icon-tile').length;`),0,'Entfernen aus Favoriten aktualisiert aktive Favoritenansicht');
  await click('.gallery-reset');
  await edit('icons-search','camera','input');
  await click('[data-icon="outline/camera"]');
  await click('.icon-favorite');
  assert.deepEqual(await evaluate(`return JSON.parse(localStorage.getItem('kreativraum-icon-favorites-v1'));`),['outline/camera']);

  // Schreibfehler zählen nicht als Export, fertige Ergebnisse bleiben erneut exportierbar.
  await evaluate(`window.showDirectoryPicker=async()=>({name:'Test',queryPermission:async()=>'granted',getFileHandle:async(name,options)=>{if(!options?.create)throw new DOMException('Fehlt','NotFoundError');return {createWritable:async()=>{throw new Error('Test-Schreibfehler');}};}});await KreativTools.chooseDirectory();`);
  await edit('icons-color','#cc3300','input');
  await click('.icon-export[data-format="svg"]'); await exportDone();
  assert.equal(await evaluate('return KreativTools.readStats().iconsExported;'),3);
  assert.match(await evaluate(`return document.querySelector('#icons-view .creative-status').textContent;`),/Test-Schreibfehler/);
  await evaluate('KreativTools.useDownloads();');
  await click('.icon-export[data-format="svg"]'); await exportDone();
  assert.equal(await evaluate('return KreativTools.readStats().iconsExported;'),4);

  await click('.gallery-reset');
  await edit('icons-sort','name');
  const names=await evaluate(`return [...document.querySelectorAll('.icon-tile')].map(button=>button.dataset.icon.split('/')[1]);`);
  assert.deepEqual(names,[...names].sort((a,b)=>a.localeCompare(b,'en')));
  await edit('icons-sort','popular');
  await click('.icon-auto-color');
  await click('#icons-transparent');
  for (const [width,height] of [[1920,900],[1280,720],[1024,650],[768,600],[360,640]]) {
    await command('browsingContext.setViewport',{context,viewport:{width,height},devicePixelRatio:1});
    await evaluate('window.scrollTo(0,0);');
    const layout=await evaluate(`const r=document.querySelector('.icon-detail').getBoundingClientRect();return {width:document.documentElement.scrollWidth,viewport:innerWidth,bottom:r.bottom,height:innerHeight,pageHeight:document.documentElement.scrollHeight};`);
    assert.ok(layout.width<=layout.viewport,'Galerie ohne horizontalen Überlauf');
    if (width>760) {
      if(layout.bottom>height || layout.pageHeight>height) { await screenshot(`icons-${width}-overflow`); console.log('Layout-Diagnose:',profile); }
      assert.ok(layout.bottom<=height,`Icon-Export bleibt bei ${width}×${height} im Fenster: ${layout.bottom}px`);
      assert.ok(layout.pageHeight<=height,`Desktopseite bleibt bei ${width}×${height} kompakt: ${layout.pageHeight}px`);
    }
  }
  await screenshot('icons-mobile');
  await command('browsingContext.setViewport',{context,viewport:{width:1280,height:720},devicePixelRatio:1});
  await screenshot('icons-desktop');
  assert.equal(await evaluate(`return performance.getEntriesByType('resource').some(item=>/^https?:/.test(item.name) && !['fonts.googleapis.com','fonts.gstatic.com'].includes(new URL(item.name).hostname));`),false,'Nur ausdrücklich ausgewählte Google-Fonts benötigen externe Ressourcen');
  await evaluate(`location.hash='stats';`);
  await until(`!document.getElementById('stats-view').hidden`);
  assert.equal(await evaluate(`return document.getElementById('stat-iconsExported').textContent;`),'4');
  console.log('OK: 6184 lokale Icons, Lazy Loading, Suche/Kategorien/Stile, Pagination, Favoriten, SVG/PNG-Farben/Transparenz/Filled, Kopieren, Fehlerfälle und Statistik.');
}
