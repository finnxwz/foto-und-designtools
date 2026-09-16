// Kleine Kataloge, keine Komplett-Downloads von Fontdateien.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import '../font-metadata.js';

const url='https://fonts.google.com/metadata/fonts';
const response=await fetch(url);
if(!response.ok)throw new Error(`Google-Fontkatalog: HTTP ${response.status}`);
const raw=await response.text();
const data=JSON.parse(raw.slice(raw.indexOf('{')));
if(!Array.isArray(data.familyMetadataList)||data.familyMetadataList.length<1500)throw new Error('Unvollständiger Google-Katalog.');
const categories={'Sans Serif':'sans-serif','Serif':'serif','Display':'display','Handwriting':'handwriting','Monospace':'monospace'};
const families=data.familyMetadataList.map(font=>({family:font.family,category:categories[font.category]||'unknown',variants:Object.keys(font.fonts),subsets:font.subsets||[],popularity:font.popularity||99999})).sort((a,b)=>a.family.localeCompare(b.family,'en'));
mkdirSync('vendor/fonts',{recursive:true});
const generated=new Date().toISOString();
writeFileSync('vendor/fonts/google-catalog.js',`/* Google Fonts family metadata. Source: ${url} */\nwindow.GoogleFontCatalog = ${JSON.stringify({generated,source:url,families})};\n`);
console.log(`Google Fonts: ${families.length} vollständige Schriftfamilien im Katalog.`);

if(process.platform==='win32') {
  const processResult=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/list-system-fonts.ps1'],{encoding:'utf8',maxBuffer:8*1024*1024});
  if(processResult.status!==0)throw new Error(processResult.stderr);
  const installed=JSON.parse(processResult.stdout.replace(/^\uFEFF/,''));
  const records=new Map(), googleByName=new Map(families.map(font=>[font.family.toLowerCase(),font]));
  for(const path of installed.files) {
    try {
      const bytes=readFileSync(path), faces=await KreativFontMetadata.inspect(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
      for(const face of faces) {
        const key=face.family.toLowerCase(), score=Math.abs(face.weight-400)+(face.italic?1000:0);
        if(!records.has(key)||score<records.get(key).score) records.set(key,{...face,score});
      }
    } catch { /* Nicht unterstützte/gesperrte Fontdateien bleiben über die Familienliste verfügbar. */ }
  }
  for(const family of installed.families)if(!records.has(family.toLowerCase()))records.set(family.toLowerCase(),{family,fullName:family,style:'Regular',weight:400,category:'unknown'});
  const local=[...records.values()].map(({score,...font})=>({...font,category:googleByName.get(font.family.toLowerCase())?.category||font.category})).sort((a,b)=>a.family.localeCompare(b.family,'de'));
  writeFileSync('vendor/fonts/system-catalog.js',`/* Namen und Typen installierter Windows-Schriften; keine Fontdateien oder Dateipfade. */\nwindow.SystemFontCatalog = ${JSON.stringify({generated,families:local})};\n`);
  console.log(`Dieser PC: ${local.length} installierte Schriftfamilien, ${local.filter(font=>font.category!=='unknown').length} mit erkanntem Typ.`);
}
