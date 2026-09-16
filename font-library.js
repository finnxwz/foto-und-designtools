"use strict";

window.KreativFontLibrary = (() => {
  const types={"serif":"Serif","sans-serif":"Sans Serif","display":"Display","handwriting":"Handschrift","monospace":"Monospace","symbols":"Symbole","unknown":"Unbekannt"};
  const fonts=new Map(), loads=new Map();
  let catalogPromise, serial=0, overrides={};
  try { const saved=JSON.parse(localStorage.getItem("kreativraum-font-types")||"{}"); if(saved && typeof saved==="object" && !Array.isArray(saved)) overrides=saved; } catch {}
  const normalized=value=>value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"");
  const localId=family=>`local:${family.toLowerCase()}`;
  function add(font) {
    if(Object.hasOwn(types,overrides[font.id]))font.category=overrides[font.id];
    font.category=Object.hasOwn(types,font.category)?font.category:"unknown";
    font.search=normalized(`${font.family} ${types[font.category]} ${font.source}`);
    fonts.set(font.id,font);return font;
  }
  for(const [family,category] of [["Georgia","serif"],["Arial","sans-serif"],["Segoe UI","sans-serif"],["Times New Roman","serif"],["Verdana","sans-serif"],["Trebuchet MS","sans-serif"],["Courier New","monospace"]]) add({id:localId(family),family,fullName:family,category,source:"local",weight:400});
  const script=(url,global)=>window[global]?Promise.resolve(window[global]):new Promise((resolve,reject)=>{
    const node=document.createElement("script");node.src=url;
    node.onload=()=>window[global]?resolve(window[global]):reject(new Error("Der Schriftkatalog ist ungültig."));
    node.onerror=()=>{node.remove();reject(new Error("Ein lokaler Schriftkatalog fehlt. Bitte den Ordner vendor/fonts zusammen mit der App aufbewahren."));};document.head.append(node);
  });
  async function catalog() {
    if(!catalogPromise)catalogPromise=(async()=>{
      const results=await Promise.allSettled([script("vendor/fonts/google-catalog.js","GoogleFontCatalog"),script("vendor/fonts/system-catalog.js","SystemFontCatalog")]);
      if(results[0].status==="fulfilled")for(const font of results[0].value.families)add({...font,id:`google:${font.family}`,source:"google"});
      if(results[1].status==="fulfilled")for(const font of results[1].value.families)add({...font,id:localId(font.family),source:"local"});
      return {errors:results.filter(result=>result.status==="rejected").map(result=>result.reason.message)};
    })();
    return catalogPromise;
  }
  function cssQuote(value) { return `"${String(value).replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/[\r\n]/g," ")}"`; }
  function within(promise,ms,message) { let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(message)),ms);})]).finally(()=>clearTimeout(timer)); }
  function variant(font) {
    const all=(font.variants||[String(font.weight||400)]).map(value=>({weight:Number.parseInt(value,10),italic:value.endsWith("i")}));
    const upright=all.filter(item=>!item.italic);return (upright.length?upright:all).sort((a,b)=>Math.abs(a.weight-400)-Math.abs(b.weight-400))[0]||{weight:400,italic:false};
  }
  async function prepare(font) {
    const alias=`KreativPreview${++serial}`, choice=variant(font), faces=[];
    try {
      if(font.source==="google") {
        const axis=choice.italic?`ital,wght@1,${choice.weight}`:`wght@${choice.weight}`;
        const url=new URL("https://fonts.googleapis.com/css2");url.searchParams.set("family",`${font.family}:${axis}`);url.searchParams.set("display","swap");
        const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),15000);
        let css;
        try { const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`HTTP ${response.status}`);css=await response.text(); }
        finally {clearTimeout(timer);}
        for(const match of css.matchAll(/@font-face\s*\{([^}]+)\}/g)) {
          const block=match[1], source=block.match(/src:\s*url\((?:["']?)([^)'"\s]+)(?:["']?)\)/i)?.[1];
          if(!source)continue;
          const parsed=new URL(source);if(parsed.protocol!=="https:"||parsed.hostname!=="fonts.gstatic.com")throw new Error("Unerwartete Fontquelle.");
          const range=block.match(/unicode-range:\s*([^;]+);/i)?.[1];
          const face=new FontFace(alias,`url(${cssQuote(source)})`,{weight:String(choice.weight),style:choice.italic?"italic":"normal",...(range?{unicodeRange:range}:{})});
          document.fonts.add(face);faces.push(face);
        }
        if(!faces.length)throw new Error("Google hat keine passende Fontdatei geliefert.");
      } else {
        let source;
        if(font.buffer)source=font.buffer;
        else if(font.handle)source=await (await font.handle.blob()).arrayBuffer();
        else source=`local(${cssQuote(font.fullName||font.family)}), local(${cssQuote(font.postscriptName||font.family)})`;
        const face=new FontFace(alias,source,{weight:String(choice.weight),style:font.italic?"italic":"normal"});
        await face.load();document.fonts.add(face);faces.push(face);
      }
      return {alias,weight:choice.weight,style:font.italic||choice.italic?"italic":"normal",faces,font};
    } catch(error) {
      faces.forEach(face=>document.fonts.delete(face));
      throw new Error(font.source==="google"?`${font.family} konnte nicht von Google geladen werden. Bitte Internetverbindung prüfen oder eine PC-Schrift wählen.`:`${font.family} ist nicht verfügbar. Bitte PC-Schriften aktualisieren oder die Schriftdatei laden.`);
    }
  }
  async function load(id,text) {
    const font=fonts.get(id);if(!font)throw new Error("Diese Schrift ist nicht mehr im Katalog.");
    const key=id+":"+(font.revision||0);
    if(!loads.has(key))loads.set(key,prepare(font).catch(error=>{loads.delete(key);throw error;}));
    const prepared=await loads.get(key);
    try {
      const matches=await within(document.fonts.load(`${prepared.style} ${prepared.weight} 24px ${cssQuote(prepared.alias)}`,text||"Aa"),15000,"Die Schrift lädt zu lange. Bitte erneut versuchen.");
      if(!matches.length)throw new Error("Für diesen Beispieltext hat die Schrift keine passende Zeichenabdeckung.");
      return {...prepared,font:fonts.get(id)};
    } catch(error) {
      loads.delete(key);prepared.faces.filter(face=>face.status!=="loaded").forEach(face=>document.fonts.delete(face));
      throw new Error(`${font.family}: ${error.message}`);
    }
  }
  async function refreshLocal() {
    if(!window.queryLocalFonts)throw new Error("Die Live-Abfrage ist in Chrome/Edge verfügbar. Die mitgelieferte PC-Liste und eigene Fontdateien funktionieren auch hier.");
    // Direkt im Klick-Ereignis aufrufen: die Browser-Freigabe benötigt eine Nutzeraktion.
    const available=await window.queryLocalFonts();
    const groups=new Map();
    for(const handle of available) {
      const key=localId(handle.family), score=/^(regular|normal|roman|book)$/i.test(handle.style)?0:/italic|oblique/i.test(handle.style)?2:1;
      if(!groups.has(key)||score<groups.get(key).score)groups.set(key,{handle,score});
    }
    for(const [id,{handle}] of groups) {
      const old=fonts.get(id), google=fonts.get(`google:${handle.family}`);
      let category=old?.category||google?.category||"unknown";
      if(category==="unknown") {
        try { const metadata=await KreativFontMetadata.inspect(await (await handle.blob()).arrayBuffer());category=metadata[0]?.category||"unknown"; } catch {}
      }
      add({id,family:handle.family,fullName:handle.fullName,postscriptName:handle.postscriptName,category,source:"local",handle,weight:400,italic:/italic|oblique/i.test(handle.style),revision:(old?.revision||0)+1});
    }
    return groups.size;
  }
  async function upload(file) {
    const buffer=await file.arrayBuffer();
    const metadata=(await KreativFontMetadata.inspect(buffer))[0];
    const family=metadata?.family||file.name.replace(/\.[^.]+$/,"");
    const digest=await crypto.subtle.digest("SHA-256",buffer), hash=[...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,"0")).join("");
    const font=add({id:`upload:${hash}`,family,fullName:metadata?.fullName||family,category:metadata?.category||fonts.get(`google:${family}`)?.category||"unknown",source:"upload",buffer,weight:metadata?.weight||400,italic:metadata?.italic||false});
    try { await load(font.id,"Aa 0123");return font; }
    catch(error) {fonts.delete(font.id);throw error;}
  }
  function assignType(id,type) {
    const font=fonts.get(id);if(!font||font.source==="google"||!Object.hasOwn(types,type))return;
    overrides[id]=type;add({...font,category:type});
    try {localStorage.setItem("kreativraum-font-types",JSON.stringify(overrides));}catch{}
  }
  function list({source="all",type="all",search="",latin=false}={}) {
    const words=normalized(search).trim().split(/\s+/).filter(Boolean);
    return [...fonts.values()].filter(font=>(source==="all"||font.source===source)&&(type==="all"||font.category===type)&&words.every(word=>font.search.includes(word))&&(!latin||(font.source==="google"?font.subsets.includes("latin")||font.subsets.includes("latin-ext"):font.category!=="symbols"))).sort((a,b)=>a.family.localeCompare(b.family,"de")||a.source.localeCompare(b.source));
  }
  return {types,catalog,load,refreshLocal,upload,assignType,list,get:id=>fonts.get(id),localId};
})();
