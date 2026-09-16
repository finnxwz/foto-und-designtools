"use strict";

window.KreativCreative = (() => {
  const tools = window.KreativTools, core = window.KreativCore;
  const el = window.KreativPages.element;
  let busy = 0;
  const imageAccept = ".jpg,.jpeg,.jfif,.webp,.png,.avif,.bmp,image/jpeg,image/webp,image/png,image/avif,image/bmp";

  function shell(id, title, help) {
    const root = document.getElementById(`${id}-view`);
    root.classList.add("editor-view", "creative-view");
    root.innerHTML = `
      <div class="editor-heading"><div class="tool-intro"><h1 id="${id}-title">${title}<span class="title-dot">.</span></h1></div><button class="text-button help-button" type="button" aria-haspopup="dialog">Hinweise ⓘ</button></div>
      <div class="output-panel"><div class="output-summary"><span class="panel-label">SPEICHERZIEL</span><p class="directory-status" aria-live="polite">Browser-Download</p></div><div class="output-actions"><button class="secondary-button choose-directory" type="button">Desktop / Ordner wählen</button><button class="text-button change-directory" type="button" hidden>Ordner ändern</button><button class="text-button use-downloads" type="button" hidden>Browser-Download</button></div><p class="directory-error inline-error" role="alert"></p></div>
      <div class="editing-grid"><div class="input-pane"><fieldset class="creative-settings"></fieldset></div><div class="results-pane"></div></div>
      <p class="creative-status" role="status"></p>
      <p class="storage-note" hidden>Die Statistik wird aktuell nur für diese Sitzung gespeichert.</p>
      <dialog class="tool-help" aria-labelledby="${id}-help"><button class="icon-button tool-help-close" type="button" aria-label="Hinweise schließen">×</button><h2 id="${id}-help">Gut zu wissen</h2>${help}<h3>Speichern</h3><p>Exporte werden im freigegebenen Ordner oder über deinen Browser gespeichert. Vorhandene Dateien werden nicht überschrieben. Bei Browser-Downloads zählt die Statistik die Übergabe an den Browser.</p></dialog>`;
    const dialog = root.querySelector("dialog");
    root.querySelector(".help-button").addEventListener("click", () => dialog.showModal());
    root.querySelector(".tool-help-close").addEventListener("click", () => dialog.close());
    if (id !== "fonts") KreativPages.setupDirectory(root);
    return root;
  }
  function status(root, text, error = false) {
    const message = root.querySelector(".creative-status");
    message.textContent = text;
    message.classList.toggle("inline-error", error);
  }
  function dropzone(root, id, accept, callback, multiple = true) {
    const input = el("input", "visually-hidden");
    input.type = "file"; input.id = `${id}-files`; input.accept = accept; input.multiple = multiple; input.tabIndex = -1;
    const drop = el("button", "drop-zone drop-purple"); drop.type = "button";
    drop.innerHTML = '<span class="drop-symbol" aria-hidden="true">↧</span><span class="drop-title">Bilder hier ablegen</span><span class="drop-copy">oder <span class="drop-link">Dateien auswählen</span></span>';
    root.querySelector(".input-pane").append(input, drop);
    let depth = 0;
    const add = files => { if (!drop.disabled && files.length) callback(Array.from(files)); };
    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { add(input.files); input.value = ""; });
    drop.addEventListener("dragenter", event => { event.preventDefault(); depth++; drop.classList.add("is-dragging"); });
    drop.addEventListener("dragover", event => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
    drop.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove("is-dragging"); });
    drop.addEventListener("drop", event => { event.preventDefault(); depth = 0; drop.classList.remove("is-dragging"); add(event.dataTransfer.files); });
    return drop;
  }
  function resultHeader(root, title) {
    const pane = root.querySelector(".results-pane");
    pane.innerHTML = `<div class="results-heading"><h2>${title} <span class="count-badge item-count">0</span></h2><button class="text-button clear-results" type="button" disabled>Liste leeren</button></div><div class="creative-results"></div>`;
    return pane;
  }
  async function copy(text, root) {
    try {
      try { await navigator.clipboard.writeText(text); }
      catch {
        const previous = document.activeElement;
        const field = el("textarea", "clipboard-fallback"); field.value = text; document.body.append(field); field.select();
        const copied = document.execCommand("copy"); field.remove(); previous?.focus();
        if (!copied) throw new Error("Die Zwischenablage ist nicht verfügbar. Bitte den Inhalt manuell kopieren oder herunterladen.");
      }
      status(root, "In die Zwischenablage kopiert.");
      return true;
    } catch (error) { status(root, error.message, true); return false; }
  }
  function png(canvas) {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG konnte nicht erstellt werden.")), "image/png"));
  }
  async function saveDesign(root, button, produce, name, event, counted, key) {
    if (root.dataset.exporting === "true") return;
    root.dataset.exporting = "true"; button.disabled = true; busy++;
    status(root, "Wird gespeichert …");
    try {
      const blob = await produce();
      const saved = await tools.save(blob, name);
      if (event && !counted.has(key)) { await tools.record(event); counted.add(key); }
      status(root, saved.method === "directory" ? "Im Zielordner gespeichert." : "Download an den Browser übergeben.");
    } catch (error) { status(root, error.message, true); }
    finally { root.dataset.exporting = "false"; button.disabled = false; busy--; root.dispatchEvent(new Event("export-finished")); }
  }

  function setupRename() {
    const root = shell("rename", "Bilder umbenennen", "<p>Wähle einen Basisnamen, die Startnummer und die Anzahl der Ziffern. Die Vorschau zeigt alle neuen Namen. Die Dateiendung und Bilddaten bleiben unverändert.</p><p>Das Tool exportiert umbenannte Kopien – deine ursprünglichen Dateien werden nicht umbenannt. ZIP bündelt alle Kopien in einem Download. Die Statistik zählt jedes erfolgreich exportierte Bild mit neuem Namen einmal je geladener Liste.</p>");
    const form = root.querySelector("fieldset");
    form.innerHTML = `<label class="control-field full-field">Basisname<input id="rename-prefix" value="Projekt" maxlength="100"></label><div class="control-row"><label class="control-field">Startnummer<input id="rename-start" type="number" min="0" max="999999999" step="1" value="1" required></label><label class="control-field">Ziffern<select id="rename-digits"><option value="2">2 · 01</option><option value="3" selected>3 · 001</option><option value="4">4 · 0001</option></select></label></div><div class="control-row"><label class="control-field">Trennzeichen<select id="rename-separator"><option value="_">Unterstrich</option><option value="-">Bindestrich</option><option value=" ">Leerzeichen</option></select></label><label class="control-field">Reihenfolge<select id="rename-order"><option value="input">Auswahl</option><option value="name">Dateiname</option><option value="date">Dateidatum</option></select></label></div>`;
    resultHeader(root, "Namensvorschau");
    const list = root.querySelector(".creative-results"), clear = root.querySelector(".clear-results");
    const actions = el("div", "export-actions");
    const zipButton = el("button", "primary-button", "ZIP herunterladen ↓"), filesButton = el("button", "secondary-button", "Dateien speichern ↓");
    zipButton.type = filesButton.type = "button"; actions.append(zipButton, filesButton); root.querySelector(".results-pane").append(actions);
    let items = [], plan = [], exporting = false, sequence = 0;
    const drop = dropzone(root, "rename", "image/*,.heic,.heif,.tif,.tiff,.svg,.ico", files => {
      for (const file of files) {
        if (!/^image\//.test(file.type) && !/\.(jpe?g|jfif|png|webp|avif|bmp|gif|tiff?|heic|heif|svg|ico)$/i.test(file.name)) { status(root, `${file.name}: Bitte eine Bilddatei wählen.`, true); continue; }
        items.push({ file, id: ++sequence, counted: new Set() });
      }
      render();
    });
    function render() {
      root.classList.toggle("has-files", items.length > 0);
      root.querySelector(".item-count").textContent = String(items.length);
      clear.disabled = !items.length || exporting;
      const start = root.querySelector("#rename-start");
      const valid = start.checkValidity() && start.value !== "";
      zipButton.disabled = filesButton.disabled = !items.length || !valid || exporting;
      const order = root.querySelector("#rename-order").value;
      const sorted = [...items];
      if (order === "name") sorted.sort((a,b) => a.file.name.localeCompare(b.file.name, "de", { numeric: true }));
      if (order === "date") sorted.sort((a,b) => a.file.lastModified-b.file.lastModified || a.id-b.id);
      plan = valid ? sorted.map((item,index) => ({ ...item, name: core.rename(item.file, index, root.querySelector("#rename-prefix").value, Number(start.value), Number(root.querySelector("#rename-digits").value), root.querySelector("#rename-separator").value) })) : [];
      list.replaceChildren();
      if (!items.length) list.append(el("div", "editor-empty", "Bilder hinzufügen, um die neuen Namen zu sehen."));
      if (!valid) list.append(el("p", "inline-error", "Bitte eine ganze Startnummer zwischen 0 und 999999999 eingeben."));
      for (const item of plan) {
        const row = el("div", "rename-row");
        const names = el("div", "rename-names");
        const old = el("span", "old-name", item.file.name), next = el("strong", "new-name", item.name);
        old.title = item.file.name; next.title = item.name;
        names.append(old, next);
        const remove = el("button", "text-button", "×"); remove.type = "button"; remove.setAttribute("aria-label", `${item.file.name} aus Liste entfernen`); remove.disabled = exporting;
        remove.addEventListener("click", () => { items = items.filter(entry => entry.id !== item.id); render(); });
        row.append(el("span", "rename-icon", "Aa"), names, remove); list.append(row);
      }
    }
    form.addEventListener("input", render); form.addEventListener("change", render);
    clear.addEventListener("click", () => { if (!exporting) { items = []; status(root, ""); render(); } });
    async function recordItem(item) {
      if (!item.counted.has(item.name)) { await tools.record({ kind: "rename", name: item.name }); item.counted.add(item.name); }
    }
    async function exportBatch(asZip) {
      if (exporting || !plan.length) return;
      const snapshot = [...plan]; exporting = true; busy++; form.disabled = true; drop.disabled = true; render();
      try {
        if (asZip) {
          status(root, "ZIP wird erstellt …");
          await tools.save(await core.zip(snapshot), "umbenannte-bilder.zip");
          for (const item of snapshot) await recordItem(item);
        } else {
          for (let i = 0; i < snapshot.length; i++) {
            status(root, `Speichert ${i+1} von ${snapshot.length} …`);
            await tools.save(snapshot[i].file, snapshot[i].name); await recordItem(snapshot[i]);
          }
        }
        status(root, `${snapshot.length} ${snapshot.length === 1 ? "Bild" : "Bilder"} zum Speichern übergeben. Originale unverändert.`);
      } catch (error) { status(root, error.message, true); }
      finally { exporting = false; busy--; form.disabled = false; drop.disabled = false; render(); }
    }
    zipButton.addEventListener("click", () => exportBatch(true)); filesButton.addEventListener("click", () => exportBatch(false)); render();
  }

  function setupPalette() {
    const root = shell("palette", "Farbpalette", "<p>Aus jedem Bild werden die dominanten Farben ermittelt. Transparente Pixel werden ignoriert, halbtransparente auf Weiß betrachtet. Bei einfarbigen Bildern enthält die Palette entsprechend weniger Farben.</p><p>Ein Klick auf eine Farbe kopiert HEX oder RGB. Du kannst alle Codes kopieren oder die Palette als PNG exportieren. Eine Palette zählt einmal pro erfolgreich eingelesenem Bild; eine andere Farbanzahl zählt nicht erneut.</p>");
    const form = root.querySelector("fieldset");
    form.innerHTML = `<div class="control-row"><label class="control-field">Farben<select id="palette-count"><option>3</option><option>4</option><option selected>5</option><option>6</option><option>7</option><option>8</option></select></label><label class="control-field">Farbcode<select id="palette-format"><option value="hex">HEX</option><option value="rgb">RGB</option></select></label></div>`;
    resultHeader(root, "Deine Paletten");
    const results = root.querySelector(".creative-results"), clear = root.querySelector(".clear-results");
    let records = [], queue = Promise.resolve(), jobs = 0;
    function code(color) { return root.querySelector("#palette-format").value === "hex" ? color.hex : `rgb(${color.rgb.join(", ")})`; }
    function draw(record) {
      record.colors = core.palette(record.pixels, Number(root.querySelector("#palette-count").value));
      record.card.replaceChildren();
      const header = el("div", "palette-header");
      const image = el("img", "palette-image"); image.src = record.url; image.alt = "";
      const name = el("h3", "file-name", record.file.name); name.title = record.file.name;
      header.append(image, name); record.card.append(header);
      const swatches = el("div", "palette-swatches");
      swatches.style.setProperty("--colors", record.colors.length);
      swatches.classList.toggle("many-colors", record.colors.length > 5);
      for (const color of record.colors) {
        const button = el("button", "palette-swatch"); button.type = "button"; button.setAttribute("aria-label", `${code(color)} kopieren`);
        const paint = el("span", "swatch-color"); paint.style.backgroundColor = color.hex;
        button.append(paint, el("strong", "swatch-code", code(color)), el("small", "", `${Math.round(color.share*100)} %`));
        button.addEventListener("click", () => copy(code(color), root)); swatches.append(button);
      }
      const actions = el("div", "export-actions");
      const copyAll = el("button", "secondary-button", "Alle Codes kopieren"), exportPNG = el("button", "primary-button", "Palette als PNG ↓");
      copyAll.type = exportPNG.type = "button";
      copyAll.addEventListener("click", () => copy(record.colors.map(code).join("\n"), root));
      exportPNG.addEventListener("click", () => {
        const colors = record.colors.slice();
        saveDesign(root, exportPNG, async () => {
          const canvas = document.createElement("canvas"); canvas.width = colors.length*240; canvas.height = 360;
          const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0,0,canvas.width,canvas.height);
          colors.forEach((color, i) => {
            ctx.fillStyle=color.hex; ctx.fillRect(i*240,0,240,260); ctx.fillStyle="#292d29"; ctx.font="600 24px Segoe UI, sans-serif"; ctx.fillText(color.hex,i*240+22,305); ctx.font="16px Segoe UI, sans-serif"; ctx.fillText(`RGB ${color.rgb.join(", ")}`,i*240+22,335);
          });
          return png(canvas);
        }, tools.outputName(record.file.name, "-palette"));
      });
      actions.append(copyAll,exportPNG); record.card.append(swatches,actions);
    }
    function sync() { root.classList.toggle("has-files", records.length > 0); root.querySelector(".item-count").textContent=String(records.length); clear.disabled=!records.length || jobs>0 || root.dataset.exporting === "true"; form.disabled=jobs>0; }
    dropzone(root, "palette", imageAccept, files => {
      for (const file of files) {
        const record = { file, card: el("article", "file-result palette-result"), url: null };
        record.card.append(el("p", "", `${file.name} · Farben werden ermittelt …`)); records.push(record); results.append(record.card); jobs++; busy++; sync();
        queue = queue.then(async () => {
          let source;
          try {
            source = await tools.loadImage(file);
            const scale=Math.min(1,128/Math.max(source.width,source.height));
            const canvas=document.createElement("canvas"); canvas.width=Math.max(1,Math.round(source.width*scale)); canvas.height=Math.max(1,Math.round(source.height*scale));
            const ctx=canvas.getContext("2d"); ctx.drawImage(source.image,0,0,canvas.width,canvas.height); record.pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
            record.url=URL.createObjectURL(file); draw(record); await tools.record({ kind:"palette", name:file.name });
          } catch(error) { record.pixels=null; record.card.replaceChildren(el("h3","file-name",file.name),el("p","inline-error",error.message)); }
          finally { source?.close(); jobs--; busy--; sync(); }
        });
      }
    });
    form.addEventListener("change", () => records.filter(record => record.pixels).forEach(draw));
    clear.addEventListener("click", () => { if (jobs || root.dataset.exporting === "true") return; records.forEach(record => { if(record.url) URL.revokeObjectURL(record.url); }); records=[]; results.replaceChildren(); status(root,""); sync(); });
    sync();
  }

  function setupQR() {
    const root=shell("qr","QR-Codes","<p>Ein Link oder Text wird direkt auf deinem Gerät in einen QR-Code umgewandelt, ohne Kurzlink oder Tracking. Umlaute und Emoji werden als UTF-8 codiert.</p><p>Wähle eine dunkle Codefarbe auf hellem Hintergrund. Der freie Rand bleibt mindestens vier Module breit. PNG wird mit ganzzahligen Pixeln pro Modul gerendert, SVG lässt sich beliebig skalieren. Die Statistik zählt exportierte Designs; PNG und SVG desselben Designs zählen zusammen einmal pro Sitzung.</p>");
    root.classList.add("has-files","always-preview");
    const form=root.querySelector("fieldset");
    form.innerHTML=`<label class="control-field">Link oder Text<textarea id="qr-text" rows="3" maxlength="2500" placeholder="https://deine-website.de">https://example.com</textarea></label><div class="control-row"><label class="control-field color-field">Codefarbe<input id="qr-foreground" type="color" value="#362b51"></label><label class="control-field color-field">Hintergrund<input id="qr-background" type="color" value="#ffffff"></label></div><div class="control-row"><label class="control-field">PNG-Größe<select id="qr-size"><option value="512">512 × 512 px</option><option value="1024" selected>1024 × 1024 px</option><option value="2048">2048 × 2048 px</option></select></label><label class="control-field">Rand (Module)<input id="qr-margin" type="number" min="4" max="12" step="1" value="4" required></label></div><label class="control-field">Fehlerkorrektur<select id="qr-level"><option value="MEDIUM">M · Standard</option><option value="QUARTILE">Q · Erhöht</option><option value="HIGH">H · Hoch</option></select></label>`;
    root.querySelector("#qr-foreground").value = "#292d29";
    const pane=root.querySelector(".results-pane");
    pane.innerHTML='<div class="results-heading"><h2>Vorschau</h2><span class="qr-meta"></span></div><div class="qr-preview"><canvas aria-label="Vorschau des QR-Codes" role="img"></canvas></div><div class="export-actions"><button class="primary-button qr-png" type="button">PNG herunterladen ↓</button><button class="secondary-button qr-svg" type="button">SVG herunterladen ↓</button></div>';
    const canvas=root.querySelector("canvas"), pngButton=root.querySelector(".qr-png"), svgButton=root.querySelector(".qr-svg"), counted=new Set();
    let current=null, timer;
    function render() {
      clearTimeout(timer); current=null; pngButton.disabled=svgButton.disabled=true;
      try {
        const marginField=root.querySelector("#qr-margin"); if(!marginField.checkValidity() || marginField.value==="") throw new Error("Bitte einen Rand zwischen 4 und 12 Modulen wählen.");
        const text=root.querySelector("#qr-text").value, foreground=root.querySelector("#qr-foreground").value, background=root.querySelector("#qr-background").value, margin=Number(marginField.value), size=Number(root.querySelector("#qr-size").value), level=root.querySelector("#qr-level").value;
        const fg=core.luminance(foreground), bg=core.luminance(background);
        if(fg>=bg || (bg+.05)/(fg+.05)<3) throw new Error("Bitte eine deutlich dunklere Codefarbe auf hellem Hintergrund wählen.");
        const code=core.qr(text,level), modules=code.size+2*margin, scale=Math.floor(size/modules), origin=Math.floor((size-code.size*scale)/2);
        canvas.width=canvas.height=size; const ctx=canvas.getContext("2d"); ctx.fillStyle=background; ctx.fillRect(0,0,size,size); ctx.fillStyle=foreground;
        for(let y=0;y<code.size;y++) for(let x=0;x<code.size;x++) if(code.getModule(x,y)) ctx.fillRect(origin+x*scale,origin+y*scale,scale,scale);
        current={text,foreground,background,margin,size,level,code};
        root.querySelector(".qr-meta").textContent=`${size} px · Version ${code.version}`; pngButton.disabled=svgButton.disabled=false; status(root,"");
      } catch(error) { canvas.width=canvas.height=1; root.querySelector(".qr-meta").textContent=""; status(root,error.message,true); }
    }
    form.addEventListener("input",()=>{ current=null; pngButton.disabled=svgButton.disabled=true; clearTimeout(timer); timer=setTimeout(render,120); }); form.addEventListener("change",render);
    function exportQR(format,button) {
      if(!current) return;
      const {code,...settings}=current, svg=core.qrSvg(code,settings.foreground,settings.background,settings.margin);
      // PNG-Snapshot vor dem ersten await; weitere Änderungen beeinflussen diesen Export nicht.
      const blob=format==="png" ? png(canvas) : Promise.resolve(new Blob([svg],{type:"image/svg+xml"}));
      saveDesign(root,button,()=>blob,`qr-code.${format}`,{kind:"qr",name:"QR-Code",format},counted,JSON.stringify(settings));
    }
    pngButton.addEventListener("click",()=>exportQR("png",pngButton)); svgButton.addEventListener("click",()=>exportQR("svg",svgButton)); render();
    root.addEventListener("export-finished", () => { pngButton.disabled = svgButton.disabled = !current; });
  }
  function init() { setupRename(); setupPalette(); setupQR(); }
  return { init, shell, status, copy, png, saveDesign, get busy() { return busy > 0; } };
})();
