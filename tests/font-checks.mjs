import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {join} from 'node:path';

export async function fontChecks({evaluate,until,command,context,profile}) {
  const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click();`);
  const change=(id,value,event='change')=>evaluate(`const node=document.getElementById(${JSON.stringify(id)});node.value=${JSON.stringify(String(value))};node.dispatchEvent(new Event(${JSON.stringify(event)},{bubbles:true}));`);
  async function settled(){await until(`!KreativFonts.busy && document.querySelector('.font-specimen').getAttribute('aria-busy')==='false'`);}
  async function pick(role,id){
    await click(`#fonts-${role}`);await change('font-browser-search',KreativName(id),'input');
    await evaluate(`const option=[...document.querySelectorAll('.font-browser-option')].find(button=>button.dataset.fontId===${JSON.stringify(id)});if(!option)throw new Error('Schrift nicht gefunden: '+${JSON.stringify(id)});option.click();`);
    await settled();
  }
  function KreativName(id){return id.slice(id.indexOf(':')+1);}
  await evaluate(`location.hash='fonts';`);
  await until(`KreativFontLibrary.list({source:'google'}).length>1500 && !document.querySelector('.font-random').disabled && !!document.querySelector('.sample-body').dataset.fontId`);
  assert.equal(await evaluate(`return KreativFontLibrary.list({source:'google'}).length;`),await evaluate(`return GoogleFontCatalog.families.length;`),'Vollständiger Google-Katalog ist auswählbar');
  assert.equal(await evaluate(`return SystemFontCatalog.families.every(font=>!!KreativFontLibrary.get(KreativFontLibrary.localId(font.family)));`),true,'Alle Familien aus dem PC-Abbild sind auswählbar');
  assert.equal(await evaluate(`return document.querySelector('#fonts-view .fonts-export, #fonts-view .export-actions, #fonts-view .output-panel')===null;`),true,'Fontchecker hat weder Export noch Speicherziel');
  assert.equal(await evaluate(`return document.querySelectorAll('#fonts-heading-example option').length;`),3);
  assert.equal(await evaluate(`return document.querySelectorAll('#fonts-body-example option').length;`),3);
  assert.equal(await evaluate(`return KreativTools.readStats().fontPairs;`),0,'Initiale Standardansicht wird nicht gezählt');

  await pick('heading','local:times new roman');
  assert.equal(await evaluate(`return document.querySelector('.sample-heading').dataset.fontId;`),'local:times new roman');
  await until(`KreativTools.readStats().fontPairs===1`);
  await change('fonts-random-source','local');await change('fonts-heading-type','monospace');await change('fonts-body-type','serif');
  await click('.font-random');await settled();
  assert.deepEqual(await evaluate(`return ['heading','body'].map(role=>{const font=KreativFontLibrary.get(document.getElementById('fonts-'+role).dataset.fontId);return [font.source,font.category];});`),[['local','monospace'],['local','serif']]);
  assert.equal(await evaluate(`return document.querySelector('.font-retry').hidden;`),true,'Zufallspaar lädt tatsächlich');
  const pair=await evaluate(`return ['heading','body'].map(role=>document.getElementById('fonts-'+role).dataset.fontId);`);
  await click('.font-random');await settled();
  assert.notDeepEqual(await evaluate(`return ['heading','body'].map(role=>document.getElementById('fonts-'+role).dataset.fontId);`),pair,'Erneutes Würfeln wechselt die Kombination');
  const countBeforeExamples=await evaluate(`return KreativTools.readStats().fontPairs;`);
  const headingTexts=[],bodyTexts=[];
  for(let i=0;i<3;i++){
    await change('fonts-heading-example',i);await change('fonts-body-example',i);await settled();
    headingTexts.push(await evaluate(`return document.querySelector('.sample-heading').textContent;`));bodyTexts.push(await evaluate(`return document.querySelector('.sample-body').textContent;`));
  }
  assert.equal(new Set(headingTexts).size,3);assert.equal(new Set(bodyTexts).size,3);
  assert.equal(await evaluate(`return KreativTools.readStats().fontPairs;`),countBeforeExamples,'Beispielwechsel zählt nicht als neue Fontkombi');
  await change('fonts-random-source','upload');await click('.font-random');
  assert.match(await evaluate(`return document.querySelector('#fonts-view .creative-status').textContent;`),/keine passende Kombination/);
  assert.equal(await evaluate(`return KreativTools.readStats().fontPairs;`),countBeforeExamples);

  const input=await command('script.evaluate',{expression:"document.getElementById('fonts-files')",target:{context},awaitPromise:false});
  await command('input.setFiles',{context,element:{sharedId:input.result.sharedId},files:['C:\\Windows\\Fonts\\arial.ttf']});
  await until(`document.querySelector('.sample-heading').dataset.source==='upload' && !KreativFonts.busy`);
  assert.equal(await evaluate(`return KreativFontLibrary.get(document.querySelector('.sample-heading').dataset.fontId).category;`),'sans-serif','OpenType-Metadaten erkennen Arial als Sans Serif');
  await evaluate(`window.localFontBuffer=KreativFontLibrary.get(document.querySelector('.sample-heading').dataset.fontId).buffer;window.queryLocalFonts=async()=>[{family:'Lokale Testschrift',fullName:'Lokale Testschrift Regular',style:'Regular',postscriptName:'TestRegular',blob:async()=>new Blob([localFontBuffer])}];`);
  await click('.font-local-access');await until(`!document.querySelector('.font-local-access').disabled`);
  await pick('heading','local:lokale testschrift');
  assert.equal(await evaluate(`return document.querySelector('.sample-heading').dataset.fontId;`),'local:lokale testschrift','Live-PC-Schrift wird über die freigegebenen Fontbytes geladen');
  await evaluate(`window.queryLocalFonts=async()=>{throw new DOMException('Abgelehnt','NotAllowedError');};`);
  await click('.font-local-access');await until(`!document.querySelector('.font-local-access').disabled`);
  assert.match(await evaluate(`return document.querySelector('#fonts-view .creative-status').textContent;`),/vorhandene PC-Liste/);
  assert.ok(await evaluate(`return KreativFontLibrary.list({source:'local'}).length;`)>100);

  // Echte Google-CSS- und Fontdatei laden, nicht nur einen Familiennamen anzeigen.
  await pick('body','local:arial');
  await pick('heading','google:Roboto');
  assert.equal(await evaluate(`return document.querySelector('.sample-heading').dataset.fontId;`),'google:Roboto',await evaluate(`return document.querySelector('#fonts-view .creative-status').textContent;`));
  assert.equal(await evaluate(`const alias=document.querySelector('.sample-heading').style.fontFamily.replace(/"/g,'');return [...document.fonts].some(face=>face.family===alias&&face.status==='loaded');`),true,'Google-Fontdatei ist wirklich decodiert');
  assert.equal(await evaluate(`return performance.getEntriesByType('resource').some(entry=>entry.name.startsWith('https://fonts.gstatic.com/'));`),true);

  const beforeFailure=await evaluate(`return KreativTools.readStats().fontPairs;`);
  await evaluate(`window.realFontLoad=KreativFontLibrary.load;KreativFontLibrary.load=(id,text)=>id==='google:ABeeZee'?Promise.reject(new Error('Offline-Test')):realFontLoad(id,text);`);
  await pick('heading','google:ABeeZee');
  assert.equal(await evaluate(`return document.querySelector('.sample-heading').dataset.fontId;`),'google:Roboto','Fehler ersetzt die Vorschau nicht still durch eine Fallbackschrift');
  assert.equal(await evaluate(`return document.querySelector('.font-retry').hidden;`),false);
  assert.equal(await evaluate(`return KreativTools.readStats().fontPairs;`),beforeFailure,'Fehlgeschlagene Fontauswahl zählt nicht');
  await evaluate(`KreativFontLibrary.load=realFontLoad;`);
  await pick('heading','google:Roboto');
  assert.equal(await evaluate(`return KreativTools.readStats().fontPairs;`),beforeFailure,'Wiederholte Kombination wird nicht erneut gezählt');

  // Eine langsame ältere Auswahl darf eine neuere Auswahl nicht überschreiben.
  await evaluate(`KreativFontLibrary.load=async(id,text)=>{if(id==='local:georgia')await new Promise(resolve=>setTimeout(resolve,350));return realFontLoad(id,text);};`);
  await click('#fonts-heading');await change('font-browser-search','Georgia','input');await click('.font-browser-option[data-font-id="local:georgia"]');
  await pick('heading','local:courier new');await new Promise(resolve=>setTimeout(resolve,450));
  assert.equal(await evaluate(`return document.querySelector('.sample-heading').dataset.fontId;`),'local:courier new');
  await evaluate(`KreativFontLibrary.load=realFontLoad;`);
  await pick('heading','google:Roboto');await change('fonts-random-source','all');await change('fonts-heading-type','serif');await change('fonts-body-type','sans-serif');
  await change('fonts-heading-example',0);await change('fonts-body-example',0);await settled();

  for(const [width,height] of [[1280,720],[1024,650],[768,600],[390,740],[360,640]]){
    await command('browsingContext.setViewport',{context,viewport:{width,height},devicePixelRatio:1});await evaluate(`window.scrollTo(0,0);`);
    const layout=await evaluate(`return {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,viewport:innerWidth,vh:innerHeight};`);
    if(layout.height>height||layout.width>width){const shot=await command('browsingContext.captureScreenshot',{context,origin:'document'});writeFileSync(join(profile,`fonts-${width}-overflow.png`),Buffer.from(shot.data,'base64'));console.log('Font-Layout:',profile);}
    assert.ok(layout.width<=layout.viewport,'Fontchecker ohne horizontalen Überlauf');assert.ok(layout.height<=layout.vh,`Fontchecker bei ${width}×${height}: ${layout.height}px`);
  }
  await command('browsingContext.setViewport',{context,viewport:{width:1280,height:720},devicePixelRatio:1});
  const screenshot=await command('browsingContext.captureScreenshot',{context,origin:'document'});writeFileSync(join(profile,'fonts-neu.png'),Buffer.from(screenshot.data,'base64'));
  console.log('OK: Vollständige Google-/PC-Kataloge, echte Fontdateien, Typfilter/Zufall, 3+3 Beispiele, lokaler Fontzugriff, Ladefehler/Races und Preview-Statistik.');
  return await evaluate(`return KreativTools.readStats().fontPairs;`);
}
