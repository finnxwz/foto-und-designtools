"use strict";

window.KreativFonts = (() => {
  const library=window.KreativFontLibrary, ui=window.KreativCreative, el=window.KreativPages.element;
  const sources={google:"Google Fonts",local:"Dieser PC",upload:"Eigene Datei"};
  const headings=["Gute Ideen.","Form folgt Gefühl.","Gestaltung, die bleibt."];
  const paragraphs=[
    "Gute Gestaltung beginnt mit einer klaren Idee. Farben, Formen und Typografie geben ihr Ausdruck. So wird aus einem ersten Gedanken ein Auftritt, der im Gedächtnis bleibt.",
    "Ein neuer Blick auf vertraute Dinge: Wir nehmen uns Zeit für Details, entdecken überraschende Perspektiven und erzählen Geschichten, die über den ersten Eindruck hinausgehen.",
    "Weniger suchen, mehr gestalten. Unsere Werkzeuge bringen Ordnung in deinen Alltag und lassen Raum für das Wesentliche. Einfach ausprobieren und den eigenen Stil finden."
  ];
  const sampleNames=["Designstudio","Magazin","Produktseite"];
  const state={heading:{id:library.localId("Georgia"),applied:null},body:{id:library.localId("Arial"),applied:null}};
  const counted=new Set();
  let root, opened=false, ready=false, request=0, loading=false, pendingCount=false, pickerRole="heading", pickerPage=0;
  const pageSize=60;
  function options(select,entries,first) {
    if(first) {const item=el("option","",first);item.value="all";select.append(item);}
    for(const [value,label] of Object.entries(entries)){const item=el("option","",label);item.value=value;select.append(item);}
  }
  function sourceCounts() {
    const all=library.list(), count=source=>new Intl.NumberFormat("de-DE").format(all.filter(font=>font.source===source).length);
    root.querySelector(".font-source-counts").textContent=`${count("google")} Google · ${count("local")} PC · ${count("upload")} eigene`;
    root.querySelector(".font-random").disabled=!ready||loading;
  }
  function text(role) {return role==="heading"?headings[Number(root.querySelector("#fonts-heading-example").value)]:paragraphs[Number(root.querySelector("#fonts-body-example").value)];}
  function renderChoices() {
    for(const role of ["heading","body"]){
      const font=library.get(state[role].id), button=root.querySelector(`#fonts-${role}`);
      button.dataset.fontId=state[role].id;
      button.querySelector("strong").textContent=font?.family||"Schrift wählen";
      button.querySelector("small").textContent=font?`${sources[font.source]} · ${library.types[font.category]}`:"Nicht im Katalog";
      button.title=font?`${font.family} · ${sources[font.source]} · ${library.types[font.category]}`:"Schrift wählen";
      const assigned=root.querySelector(`#fonts-${role}-assigned-type`);assigned.disabled=!font||font.source==="google";assigned.value=font?.category||"unknown";
    }
  }
  function renderPreview() {
    for(const role of ["heading","body"]){
      const node=root.querySelector(role==="heading"?".sample-heading":".sample-body"), applied=state[role].applied;
      node.textContent=text(role);
      if(applied){
        node.style.fontFamily=`"${applied.alias}"`;node.style.fontWeight=applied.weight;node.style.fontStyle=applied.style;
        node.dataset.fontId=applied.font.id;node.dataset.source=applied.font.source;
      }
      root.querySelector(`.preview-${role}-family`).textContent=applied?`${applied.font.family} · ${sources[applied.font.source]}`:"Vorschau wird geladen";
    }
    const fields=[...root.querySelectorAll(".font-adjustments input[type=number]")];
    if(fields.some(field=>!field.checkValidity()||field.value==="")){ui.status(root,"Bitte gültige Größen und Zeilenabstände eingeben.",true);return;}
    root.querySelector(".sample-heading").style.fontSize=`${root.querySelector("#fonts-title-size").value}px`;
    root.querySelector(".sample-body").style.fontSize=`${root.querySelector("#fonts-text-size").value}px`;
    root.querySelector(".sample-body").style.lineHeight=root.querySelector("#fonts-line-height").value;
    root.querySelector(".sample-body").style.textAlign=root.querySelector("#fonts-align").value;
  }
  async function showPair(count=false) {
    pendingCount ||= count;
    const token=++request, chosen={heading:state.heading.id,body:state.body.id};
    loading=true;sourceCounts();root.querySelector(".font-retry").hidden=true;
    renderChoices();renderPreview();
    root.querySelector(".font-specimen").setAttribute("aria-busy","true");
    ui.status(root,"Schriften werden geladen …");
    const results=await Promise.allSettled([library.load(chosen.heading,text("heading")),library.load(chosen.body,text("body"))]);
    if(token!==request)return;
    const errors=[];
    results.forEach((result,index)=>{
      const role=index===0?"heading":"body", button=root.querySelector(`#fonts-${role}`);
      button.classList.toggle("font-load-error",result.status==="rejected");
      if(result.status==="fulfilled")state[role].applied=result.value;
      else errors.push(`${role==="heading"?"Überschrift":"Fließtext"}: ${result.reason.message}`);
    });
    loading=false;sourceCounts();renderPreview();root.querySelector(".font-specimen").setAttribute("aria-busy","false");
    root.querySelector(".font-retry").hidden=!errors.length;
    if(errors.length){ui.status(root,`${errors.join(" ")} Die Beschriftung der Vorschau zeigt die tatsächlich verwendete Schrift.`,true);return;}
    ui.status(root,"");
    if(pendingCount){
      pendingCount=false;
      const key=JSON.stringify([chosen.heading,chosen.body]);
      if(!counted.has(key)){
        counted.add(key);
        await KreativTools.record({kind:"fonts",name:`${state.heading.applied.font.family} + ${state.body.applied.font.family}`,format:"preview"});
      }
    }
  }
  function randomIndex(length) {const value=new Uint32Array(1);crypto.getRandomValues(value);return Math.floor(value[0]/4294967296*length);}
  async function randomize() {
    if(!ready||loading)return;
    const source=root.querySelector("#fonts-random-source").value, latin=root.querySelector("#fonts-latin").checked;
    const a=library.list({source,type:root.querySelector("#fonts-heading-type").value,latin});
    const b=library.list({source,type:root.querySelector("#fonts-body-type").value,latin});
    if(!a.length||!b.length){ui.status(root,"Für diese Typen und Quelle gibt es keine passende Kombination. Bitte die Filter ändern oder weitere PC-Schriften einlesen.",true);return;}
    let first,second;
    for(let i=0;i<24;i++){
      first=a[randomIndex(a.length)];const different=b.filter(font=>font.family.toLowerCase()!==first.family.toLowerCase());second=(different.length?different:b)[randomIndex(different.length||b.length)];
      if(first.id!==state.heading.id||second.id!==state.body.id)break;
    }
    if(first.id===state.heading.id&&second.id===state.body.id){
      first=a.find(font=>font.id!==state.heading.id)||first;
      second=b.find(font=>font.id!==state.body.id&&font.family!==first.family)||b.find(font=>font.id!==state.body.id)||second;
    }
    if(first.id===state.heading.id&&second.id===state.body.id){ui.status(root,"Mit diesen Filtern ist nur die bereits gezeigte Kombination möglich.");return;}
    state.heading.id=first.id;state.body.id=second.id;await showPair(true);
  }

  function renderPicker() {
    const dialog=root.querySelector(".font-browser"), list=dialog.querySelector(".font-browser-list");
    const matches=library.list({source:dialog.querySelector("#font-browser-source").value,type:dialog.querySelector("#font-browser-type").value,search:dialog.querySelector("#font-browser-search").value});
    const pages=Math.max(1,Math.ceil(matches.length/pageSize));pickerPage=Math.min(pickerPage,pages-1);list.replaceChildren();
    for(const font of matches.slice(pickerPage*pageSize,(pickerPage+1)*pageSize)){
      const button=el("button","font-browser-option");button.type="button";button.dataset.fontId=font.id;button.dataset.category=font.category;button.dataset.source=font.source;
      button.setAttribute("role","option");button.setAttribute("aria-selected",String(font.id===state[pickerRole].id));
      button.append(el("strong","",font.family),el("span","",`${sources[font.source]} · ${library.types[font.category]}`));
      button.addEventListener("click",()=>{state[pickerRole].id=font.id;dialog.close();showPair(true);});list.append(button);
    }
    dialog.querySelector(".font-browser-empty").hidden=matches.length>0;
    dialog.querySelector(".font-browser-count").textContent=`${new Intl.NumberFormat("de-DE").format(matches.length)} Familien · ${pickerPage+1} / ${pages}`;
    dialog.querySelector(".font-browser-prev").disabled=pickerPage===0;dialog.querySelector(".font-browser-next").disabled=pickerPage===pages-1;list.scrollTop=0;
  }
  function openPicker(role) {
    const dialog=root.querySelector(".font-browser");pickerRole=role;pickerPage=0;
    dialog.querySelector("#font-browser-title").textContent=role==="heading"?"Schrift für die Überschrift":"Schrift für den Fließtext";
    dialog.querySelector("#font-browser-search").value="";dialog.querySelector("#font-browser-source").value="all";dialog.querySelector("#font-browser-type").value="all";
    renderPicker();dialog.showModal();dialog.querySelector("#font-browser-search").focus();
  }
  function init() {
    root=ui.shell("fonts","Schriftkombis",'<p>Der vollständige mitgelieferte Google-Fonts-Katalog und ein Abbild der auf diesem PC installierten Schriftfamilien stehen zur Auswahl. Nur tatsächlich ausgewählte Google-Schriften werden über fonts.googleapis.com / fonts.gstatic.com geladen. Dafür ist Internet nötig; die Foto-, QR- und Icontools bleiben offline nutzbar.</p><p>„PC neu einlesen“ fragt in Chrome/Edge nach einer Freigabe und ergänzt die aktuelle Liste. Andere Browser verwenden den mitgelieferten PC-Katalog oder eigene WOFF-, WOFF2-, TTF- und OTF-Dateien. Die PC-Liste gehört zu diesem Rechner und kann auf einem anderen Gerät abweichen.</p><p>Der Zufallsgenerator verwendet die Typen für Überschrift und Fließtext getrennt. Google-Typen stammen aus dem Katalog; lokale Typen werden aus OpenType-Metadaten erkannt. Unbekannte lokale Typen kannst du unter Feineinstellungen zuordnen. „Lateinische Zeichen“ schließt nichtlateinische Google-Fonts und Symbolschriften beim Würfeln aus.</p><p>Je drei Überschriften und Fließtexte lassen sich unabhängig kombinieren. Nicht jede Schrift enthält jedes Zeichen; fehlende Glyphen werden vom Browser ersetzt. Die Vorschau nennt die tatsächlich geladene Schrift. Getestete Kombinationen zählen einmal je Sitzung, nach erfolgreichem Laden beider Schriften. Es gibt keinen Export mehr.</p>');
    root.classList.add("font-checker","has-files");root.querySelector(".output-panel").remove();
    const saveHelp=[...root.querySelectorAll(".tool-help h3")].find(node=>node.textContent==="Speichern");
    if(saveHelp){saveHelp.nextElementSibling?.remove();saveHelp.remove();}
    const workspace=root.querySelector(".editing-grid");workspace.className="font-workspace";
    const sourcebar=el("div","font-sources");sourcebar.innerHTML='<span class="font-source-counts" role="status">Schriftkatalog bereit zum Laden</span><details class="font-source-menu"><summary>Schriftquellen</summary><div><button class="secondary-button font-local-access" type="button">PC neu einlesen</button><button class="secondary-button font-upload" type="button">Schriftdateien +</button></div></details><input id="fonts-files" type="file" class="visually-hidden" accept=".woff,.woff2,.ttf,.otf" multiple tabindex="-1">';workspace.before(sourcebar);
    workspace.innerHTML=`<div class="font-control-panel">
      <div class="font-role-grid">${["heading","body"].map(role=>`<section class="font-role"><h2>${role==="heading"?"Überschrift":"Fließtext"}</h2><button id="fonts-${role}" class="font-picker" type="button" aria-haspopup="dialog"><strong>Schrift wählen</strong><small>Dieser PC</small><span aria-hidden="true">⌄</span></button><label class="control-field">Typ für Zufall<select id="fonts-${role}-type"></select></label></section>`).join("")}</div>
      <div class="font-random-settings"><label class="control-field">Zufall aus<select id="fonts-random-source"><option value="all">Allen Quellen</option><option value="google">Google Fonts</option><option value="local">Diesem PC</option><option value="upload">Eigenen Dateien</option></select></label><label class="font-latin"><input id="fonts-latin" type="checkbox" checked> Lateinische Zeichen</label></div>
      <button class="primary-button font-random" type="button" disabled><span aria-hidden="true">⚄</span> Neue Kombi würfeln</button>
      <details class="font-adjustments"><summary>Feineinstellungen</summary><div class="control-row"><label class="control-field">Überschrift (px)<input id="fonts-title-size" type="number" min="20" max="72" value="36" required></label><label class="control-field">Fließtext (px)<input id="fonts-text-size" type="number" min="12" max="24" value="14" required></label><label class="control-field">Zeilenabstand<input id="fonts-line-height" type="number" min="1.1" max="2" step="0.1" value="1.5" required></label><label class="control-field">Textsatz<select id="fonts-align"><option value="left">Linksbündig</option><option value="justify">Blocksatz</option></select></label><label class="control-field">Lokaler Typ: Überschrift<select id="fonts-heading-assigned-type"></select></label><label class="control-field">Lokaler Typ: Fließtext<select id="fonts-body-assigned-type"></select></label></div></details>
    </div><div class="font-preview-panel"><div class="font-examples"><label class="control-field">Beispielüberschrift<select id="fonts-heading-example"></select></label><label class="control-field">Beispieltext<select id="fonts-body-example"></select></label></div><article class="font-specimen" aria-label="Vorschau der Schriftkombination"><div class="preview-heading-family font-preview-label"></div><h2 class="sample-heading">Gute Ideen.</h2><div class="font-text-divider"></div><div class="preview-body-family font-preview-label"></div><p class="sample-body"></p></article><button class="text-button font-retry" type="button" hidden>Schriften erneut laden</button></div>`;
    const adjustments=root.querySelector(".font-adjustments");
    adjustments.querySelector("summary").textContent="Filter & Feineinstellungen";
    adjustments.querySelector("summary").after(root.querySelector(".font-random-settings"));
    const dialog=el("dialog","font-browser");dialog.setAttribute("aria-labelledby","font-browser-title");
    dialog.innerHTML='<button class="icon-button font-browser-close" type="button" aria-label="Schriftauswahl schließen">×</button><h2 id="font-browser-title">Schrift auswählen</h2><div class="font-browser-filters"><label class="control-field">Suchen<input id="font-browser-search" type="search" placeholder="Roboto, Georgia, …" autocomplete="off"></label><label class="control-field">Quelle<select id="font-browser-source"></select></label><label class="control-field">Typ<select id="font-browser-type"></select></label></div><div class="font-browser-list" role="listbox" aria-label="Schriftfamilien"></div><p class="font-browser-empty" hidden>Keine passende Schrift. Probiere einen anderen Namen oder Filter.</p><div class="font-browser-footer"><button class="secondary-button font-browser-prev" type="button">← Zurück</button><span class="font-browser-count" role="status"></span><button class="secondary-button font-browser-next" type="button">Weiter →</button></div>';root.append(dialog);
    options(dialog.querySelector("#font-browser-source"),sources,"Alle Quellen");options(dialog.querySelector("#font-browser-type"),library.types,"Alle Typen");
    for(const role of ["heading","body"]){
      options(root.querySelector(`#fonts-${role}-type`),library.types,"Alle Typen");root.querySelector(`#fonts-${role}-type`).value=role==="heading"?"serif":"sans-serif";
      options(root.querySelector(`#fonts-${role}-assigned-type`),library.types);
      options(root.querySelector(`#fonts-${role}-example`),Object.fromEntries(sampleNames.map((name,index)=>[index,name])));
      root.querySelector(`#fonts-${role}`).addEventListener("click",()=>openPicker(role));
      root.querySelector(`#fonts-${role}-example`).addEventListener("change",()=>{renderPreview();if(ready)showPair();});
      root.querySelector(`#fonts-${role}-assigned-type`).addEventListener("change",event=>{library.assignType(state[role].id,event.target.value);renderChoices();});
    }
    root.querySelector(".font-adjustments").addEventListener("input",renderPreview);root.querySelector(".font-adjustments").addEventListener("change",renderPreview);
    root.querySelector(".font-random").addEventListener("click",randomize);root.querySelector(".font-retry").addEventListener("click",()=>showPair());
    dialog.querySelector(".font-browser-close").addEventListener("click",()=>dialog.close());
    for(const selector of ["#font-browser-source","#font-browser-type"] )dialog.querySelector(selector).addEventListener("change",()=>{pickerPage=0;renderPicker();});
    dialog.querySelector("#font-browser-search").addEventListener("input",()=>{pickerPage=0;renderPicker();});
    dialog.querySelector(".font-browser-prev").addEventListener("click",()=>{pickerPage--;renderPicker();});dialog.querySelector(".font-browser-next").addEventListener("click",()=>{pickerPage++;renderPicker();});
    dialog.querySelector(".font-browser-list").addEventListener("keydown",event=>{const list=[...dialog.querySelectorAll(".font-browser-option")],index=list.indexOf(document.activeElement);let next;if(event.key==="ArrowDown")next=Math.min(index+1,list.length-1);if(event.key==="ArrowUp")next=Math.max(index-1,0);if(event.key==="Home")next=0;if(event.key==="End")next=list.length-1;if(next!==undefined&&list[next]){event.preventDefault();list[next].focus();}});
    const access=root.querySelector(".font-local-access");
    access.title=window.queryLocalFonts?"Aktuelle installierte Schriftfamilien freigeben":"Live-Aktualisierung in Chrome/Edge; die mitgelieferte PC-Liste ist bereits verfügbar";
    access.addEventListener("click",async()=>{
      root.querySelector(".font-source-menu").open=false;
      access.disabled=true;
      try { const pending=library.refreshLocal();ui.status(root,"PC-Schriften werden eingelesen …");const count=await pending;sourceCounts();renderChoices();ui.status(root,`${count} Schriftfamilien vom Browser eingelesen.`); }
      catch(error){ui.status(root,error.name==="NotAllowedError"?"Kein Zugriff freigegeben. Die vorhandene PC-Liste ist weiterhin verfügbar.":error.message,true);}
      finally {access.disabled=false;}
    });
    const upload=root.querySelector("#fonts-files");root.querySelector(".font-upload").addEventListener("click",()=>{root.querySelector(".font-source-menu").open=false;upload.click();});
    upload.addEventListener("change",async()=>{
      let last=null;const errors=[];
      for(const file of upload.files){try{last=await library.upload(file);}catch{errors.push(file.name);}}
      upload.value="";sourceCounts();
      if(last){state.heading.id=last.id;await showPair(true);}
      if(errors.length)ui.status(root,`Nicht geladen: ${errors.join(", ")}. Bitte gültige Fontdateien verwenden.`,true);
    });
    renderChoices();renderPreview();
    document.addEventListener("pointerdown",event=>{const menu=root.querySelector(".font-source-menu");if(!menu.contains(event.target))menu.open=false;});
  }
  async function open() {
    if(opened)return;opened=true;
    const result=await library.catalog();ready=true;sourceCounts();renderChoices();if(root.querySelector(".font-browser").open)renderPicker();await showPair();
    if(result.errors.length)ui.status(root,result.errors.join(" "),true);
  }
  function closePicker() {root.querySelector(".font-browser[open]")?.close();}
  return {init,open,closePicker,get busy(){return loading;}};
})();
