"use strict";

window.KreativIcons = (() => {
  const ui = window.KreativCreative, tools = window.KreativTools;
  const el = window.KreativPages.element;
  const svgNS = "http://www.w3.org/2000/svg";
  const favoritesKey = "kreativraum-icon-favorites-v1";
  const pageSize = 72;
  const categories = { Animals:"Tiere", Arrows:"Pfeile", Badges:"Abzeichen", Brand:"Marken", Buildings:"Gebäude", Charts:"Diagramme", Communication:"Kommunikation", Computers:"Computer", Currencies:"Währungen", Database:"Datenbanken", Design:"Design", Development:"Entwicklung", Devices:"Geräte", Document:"Dokumente", "E-commerce":"Shopping", Electrical:"Elektrik", Extensions:"Erweiterungen", Food:"Essen & Trinken", Games:"Spiele", Gender:"Geschlecht", Gestures:"Gesten", Health:"Gesundheit", Laundry:"Wäsche", Letters:"Buchstaben", Logic:"Logik", Map:"Karten & Orte", Math:"Mathematik", Media:"Medien", Mood:"Stimmung", Nature:"Natur", Numbers:"Zahlen", Photography:"Fotografie", Shapes:"Formen", Sport:"Sport", Symbols:"Symbole", System:"System", Text:"Text", Vehicles:"Fahrzeuge", "Version control":"Versionsverwaltung", Weather:"Wetter", Zodiac:"Sternzeichen", Other:"Weitere" };
  const aliases = { kamera:["camera"], foto:["photo","camera","picture","image"], bild:["photo","picture","image"], pfeil:["arrow","chevron"], herz:["heart"], stern:["star"], haus:["home","house"], suche:["search","zoom"], suchen:["search"], lupe:["search","zoom"], zahnrad:["settings"], einstellungen:["settings","adjustments"], benutzer:["user","person"], person:["user","person"], datei:["file","document"], ordner:["folder"], farbe:["color","palette"], pinsel:["brush"], schrift:["typography","font","text"], schloss:["lock"], schlussel:["key"], sonne:["sun"], mond:["moon"], regen:["rain"], wolke:["cloud"], telefon:["phone"], handy:["device-mobile","phone"], brief:["mail","letter"], nachricht:["message","mail"], papierkorb:["trash"], mull:["trash"], muell:["trash"], loschen:["trash","delete"], haken:["check"], speichern:["device-floppy","save","download"], herunterladen:["download"], teilen:["share"], kalender:["calendar"], uhr:["clock"], karte:["map","card"], ort:["map-pin","location"], auto:["car"], fahrrad:["bike"], zug:["train"], flugzeug:["plane"], kaffee:["coffee"], musik:["music"], spielen:["player-play","play"], auge:["eye"], werkzeug:["tool","hammer"], sicherheit:["shield","lock"], warenkorb:["shopping-cart","basket"], warnung:["alert"], blitz:["bolt"], glocke:["bell"], welt:["world","globe"], sprache:["language"], dokument:["file","document"], lachen:["mood-happy","mood-smile"] };
  const common = ["camera","photo","heart","star","home","search","user","settings","mail","check","arrow-right","download","palette","brush","typography","folder","file","calendar","clock","map-pin","phone","shopping-cart","sun","moon"];
  let root, catalogPromise, icons = [], byId = new Map(), filtered = [], selected = null, currentPage = 0;
  let styleFilter = "outline", onlyFavorites = false, favorites = new Set(), persistentFavorites = true, copying = false, automaticColor = true;
  const counted = new Set();
  const normalize = text => String(text).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/ß/g,"ss");

  function readFavorites() {
    try {
      const value = JSON.parse(localStorage.getItem(favoritesKey) || "[]");
      if (!Array.isArray(value)) throw new Error("Ungültige Favoriten");
      favorites = new Set(value.filter(id => typeof id === "string"));
    } catch { persistentFavorites = false; }
  }

  function loadCatalog() {
    if (window.TablerCatalog) return Promise.resolve(window.TablerCatalog);
    if (!catalogPromise) catalogPromise = new Promise((resolve,reject) => {
      const script = document.createElement("script");
      script.src = "vendor/tabler/catalog.js";
      script.onload = () => window.TablerCatalog ? resolve(window.TablerCatalog) : reject(new Error("Der lokale Iconbestand ist ungültig."));
      script.onerror = () => { script.remove(); reject(new Error("Iconbestand nicht gefunden. Bitte den Ordner vendor/tabler zusammen mit der App aufbewahren.")); };
      document.head.append(script);
    }).catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }

  function settings() {
    return {
      color: root.querySelector("#icons-color").value,
      size: Number(root.querySelector("#icons-size").value),
      stroke: Number(root.querySelector("#icons-stroke").value),
      background: root.querySelector("#icons-transparent").checked ? null : root.querySelector("#icons-background").value,
    };
  }

  function syncAutomaticColor() {
    if (automaticColor) root.querySelector("#icons-color").value = getComputedStyle(document.documentElement).getPropertyValue("--text").trim();
    root.querySelector(".icon-auto-color").setAttribute("aria-pressed", String(automaticColor));
    renderSelection();
  }

  function svgFor(icon, options, exporting = false) {
    const svg = document.createElementNS(svgNS,"svg");
    const attrs = { xmlns:svgNS, width:options.size, height:options.size, viewBox:"0 0 24 24", color:options.color, fill:icon.style === "filled" ? options.color : "none", stroke:icon.style === "filled" ? "none" : options.color, "stroke-width":options.stroke, "stroke-linecap":"round", "stroke-linejoin":"round" };
    for (const [key,value] of Object.entries(attrs)) svg.setAttribute(key,String(value));
    if (exporting) {
      svg.append(document.createComment(`\nTabler Icons ${window.TablerCatalog.version}\n${window.TablerCatalog.license}\n`));
      const title = document.createElementNS(svgNS,"title"); title.textContent = icon.name; svg.append(title);
    } else {
      svg.classList.add("catalog-svg"); svg.dataset.style = icon.style; svg.setAttribute("aria-hidden","true");
    }
    if (options.background) {
      const rect = document.createElementNS(svgNS,"rect");
      for (const [key,value] of Object.entries({width:24,height:24,fill:options.background,stroke:"none"})) rect.setAttribute(key,String(value));
      svg.append(rect);
    }
    for (const [tag, attributes] of icon.nodes) {
      const shape = document.createElementNS(svgNS,tag);
      for (const [key,value] of Object.entries(attributes)) shape.setAttribute(key,String(value));
      svg.append(shape);
    }
    return svg;
  }

  function serialize(icon,options) { return new XMLSerializer().serializeToString(svgFor(icon,options,true)); }
  function designKey(icon,options) { return JSON.stringify([icon.id,options.color,options.size,icon.style === "outline" ? options.stroke : 0,options.background]); }

  function syncActions() {
    const disabled = !selected || copying || root.dataset.exporting === "true";
    root.querySelectorAll(".icon-export, .icon-copy").forEach(button => { button.disabled = disabled; });
  }

  function renderSelection() {
    const options = settings();
    root.style.setProperty("--gallery-color",options.color);
    root.style.setProperty("--gallery-stroke",options.stroke);
    root.querySelector("#icons-color-value").textContent = options.color.toUpperCase();
    root.querySelector("#icons-stroke-value").textContent = new Intl.NumberFormat("de-DE").format(options.stroke);
    root.querySelector("#icons-background").disabled = options.background === null;
    const favorite = root.querySelector(".icon-favorite");
    favorite.disabled = !selected;
    favorite.setAttribute("aria-pressed",String(Boolean(selected && favorites.has(selected.id))));
    favorite.textContent = selected && favorites.has(selected.id) ? "★" : "☆";
    favorite.setAttribute("aria-label",selected && favorites.has(selected.id) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen");
    root.querySelector(".selected-icon-name").textContent = selected ? selected.name : "Kein Icon ausgewählt";
    root.querySelector(".selected-icon-meta").textContent = selected ? `${selected.style === "outline" ? "Outline" : "Filled"} · ${categories[selected.category] || selected.category} · ${options.size} × ${options.size} px` : "Wähle ein Icon aus der Galerie.";
    root.querySelector("#icons-stroke").disabled = !selected || selected.style === "filled";
    const preview = root.querySelector(".icon-large-preview");
    preview.replaceChildren();
    if (selected) preview.append(svgFor(selected,options));
    else preview.append(el("span","", "◇"));
    root.querySelectorAll(".icon-tile").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.icon === selected?.id)));
    syncActions();
  }

  function renderGrid() {
    const grid = root.querySelector(".icon-grid");
    grid.replaceChildren();
    const pages = Math.max(1,Math.ceil(filtered.length/pageSize));
    currentPage = Math.min(currentPage,pages-1);
    const options = {...settings(),background:null};
    const fragment = document.createDocumentFragment();
    for (const icon of filtered.slice(currentPage*pageSize,(currentPage+1)*pageSize)) {
      const button = el("button","icon-tile"); button.type = "button"; button.dataset.icon = icon.id;
      button.setAttribute("aria-label",`${icon.name} (${icon.style})`); button.title = `${icon.name} · ${icon.style}`;
      button.setAttribute("aria-pressed",String(icon.id === selected?.id));
      button.append(svgFor(icon,options),el("span","icon-tile-name",icon.name));
      if (favorites.has(icon.id)) { const star = el("span","tile-favorite","★"); star.setAttribute("aria-hidden","true"); button.append(star); }
      button.addEventListener("click",() => {
        selected = icon; renderSelection(); ui.status(root,"");
        if (window.matchMedia("(max-width: 760px)").matches) root.querySelector(".icon-detail").scrollIntoView({block:"start"});
      });
      fragment.append(button);
    }
    grid.append(fragment);
    root.querySelector(".gallery-empty").hidden = filtered.length !== 0;
    root.querySelector(".gallery-count").textContent = `${new Intl.NumberFormat("de-DE").format(filtered.length)} ${filtered.length === 1 ? "Icon" : "Icons"}`;
    root.querySelector(".gallery-page").textContent = `${currentPage+1} / ${pages}`;
    root.querySelector(".gallery-previous").disabled = currentPage === 0;
    root.querySelector(".gallery-next").disabled = currentPage >= pages-1;
    root.querySelector(".favorite-count").textContent = String([...favorites].filter(id => byId.has(id)).length);
    root.querySelector(".icon-grid-viewport").scrollTop = 0;
  }

  function applyFilters(resetPage = true) {
    const category = root.querySelector("#icons-category").value;
    const terms = normalize(root.querySelector("#icons-search").value).trim().split(/\s+/).filter(Boolean);
    filtered = icons.filter(icon => (styleFilter === "all" || icon.style === styleFilter)
      && (!category || icon.category === category) && (!onlyFavorites || favorites.has(icon.id))
      && terms.every(term => [term,...(aliases[term] || [])].some(word => icon.search.includes(word))));
    if (root.querySelector("#icons-sort").value === "name") filtered.sort((a,b) => a.name.localeCompare(b.name,"en") || a.style.localeCompare(b.style));
    if (resetPage) currentPage = 0;
    if (!selected || !filtered.some(icon => icon.id === selected.id)) selected = filtered[0] || null;
    renderGrid(); renderSelection();
  }

  async function exportIcon(format) {
    if (!selected || copying || root.dataset.exporting === "true") return;
    const icon = selected, options = settings(), source = serialize(icon,options);
    const svgBlob = new Blob([source],{type:"image/svg+xml;charset=utf-8"});
    const button = root.querySelector(`.icon-export[data-format="${format}"]`);
    const job = ui.saveDesign(root,button,async () => {
      if (format === "svg") return svgBlob;
      const url = URL.createObjectURL(svgBlob), image = new Image();
      try {
        image.src = url; await image.decode();
        const canvas = document.createElement("canvas"); canvas.width = canvas.height = options.size;
        canvas.getContext("2d").drawImage(image,0,0,options.size,options.size);
        return await ui.png(canvas);
      } finally { image.src = ""; URL.revokeObjectURL(url); }
    },`tabler-${icon.name}-${icon.style}.${format}`,{kind:"icons",name:`${icon.name} · ${icon.style}`,format},counted,designKey(icon,options));
    syncActions(); await job;
  }

  async function copySvg() {
    if (!selected || copying || root.dataset.exporting === "true") return;
    const icon = selected, options = settings(), key = designKey(icon,options);
    copying = true; syncActions();
    try {
      if (await ui.copy(serialize(icon,options),root)) {
        if (!counted.has(key)) { await tools.record({kind:"icons",name:`${icon.name} · ${icon.style}`,format:"svg"}); counted.add(key); }
      }
    } catch(error) { ui.status(root,error.message,true); }
    finally { copying = false; syncActions(); }
  }

  function init() {
    root = ui.shell("icons","Icongalerie",'<p>Der komplette lokale Tabler-Bestand bietet Outline- und Filled-Icons. Suche nach englischen Namen und Stichwörtern oder häufigen deutschen Begriffen wie „Kamera“, „Pfeil“ und „Papierkorb“. Kategorien, Stil und Favoriten lassen sich kombinieren.</p><p>Farbe, Strichstärke und Exportgröße gelten für die ausgewählte Grafik. Filled-Icons haben keine einstellbare Strichstärke. SVG bleibt skalierbar; PNG wird in der gewählten Pixelgröße exportiert. Der Hintergrund ist standardmäßig transparent.</p><p>Favoriten werden in diesem Browser gespeichert. SVG-Kopieren und Downloads desselben Designs zählen zusammen einmal je Sitzung in der Statistik.</p><p>Originale: <a href="https://tabler.io/icons" target="_blank" rel="noopener noreferrer">Tabler Icons</a> · MIT-Lizenz. Der <a href="vendor/tabler/LICENSE.txt" target="_blank" rel="noopener">Lizenztext</a> liegt lokal bei und ist im exportierten SVG enthalten.</p>');
    root.classList.add("icon-gallery");
    const layout = root.querySelector(".editing-grid"); layout.className = "gallery-layout";
    layout.innerHTML = `
      <div class="gallery-browser">
        <div class="gallery-toolbar">
          <label class="control-field gallery-search">Icons suchen<input id="icons-search" type="search" placeholder="Kamera, arrow, Herz …" autocomplete="off" maxlength="160"></label>
          <label class="control-field gallery-category">Kategorie<select id="icons-category"><option value="">Alle Kategorien</option></select></label>
          <div class="gallery-filter-row"><div class="icon-styles" role="group" aria-label="Icon-Stil"><button type="button" data-style="outline" aria-pressed="true">Outline</button><button type="button" data-style="filled" aria-pressed="false">Filled</button><button type="button" data-style="all" aria-pressed="false">Alle</button></div><button class="favorite-filter secondary-button" type="button" aria-pressed="false">☆ Favoriten <span class="favorite-count">0</span></button><label class="visually-hidden" for="icons-sort">Sortierung</label><select id="icons-sort" aria-label="Sortierung"><option value="popular">Häufig gebraucht</option><option value="name">Name A–Z</option></select></div>
        </div>
        <div class="gallery-results-heading"><span class="gallery-count" role="status">Iconbestand wird beim Öffnen geladen.</span><span class="gallery-source">Tabler Icons · lokal</span></div>
        <div class="icon-grid-viewport" role="region" aria-label="Icon-Auswahl" tabindex="0"><div class="icon-grid"></div><div class="gallery-empty" hidden><span aria-hidden="true">⌕</span><h2>Keine passenden Icons</h2><p>Probiere einen anderen Suchbegriff oder ändere die Filter.</p><button class="secondary-button gallery-reset" type="button">Filter zurücksetzen</button></div></div>
        <nav class="gallery-pagination" aria-label="Icon-Seiten"><button class="secondary-button gallery-previous" type="button" disabled>← Zurück</button><span class="gallery-page" role="status">1 / 1</span><button class="secondary-button gallery-next" type="button" disabled>Weiter →</button></nav>
        <button class="secondary-button gallery-retry" type="button" hidden>Iconbestand erneut laden</button>
      </div>
      <aside class="icon-detail" aria-label="Icon anpassen und exportieren">
        <div class="icon-detail-heading"><h2 class="selected-icon-name">Icon auswählen</h2><button class="icon-favorite" type="button" aria-label="Zu Favoriten hinzufügen" aria-pressed="false" disabled>☆</button></div>
        <p class="selected-icon-meta">Wähle ein Icon aus der Galerie.</p>
        <div class="icon-large-preview" role="img" aria-label="Vorschau des ausgewählten Icons"></div>
        <fieldset class="icon-settings"><legend class="visually-hidden">Darstellung</legend>
          <div class="control-row"><label class="control-field color-field">Farbe <input id="icons-color" type="color" value="#362b51"><span id="icons-color-value">#362B51</span></label><label class="control-field">Exportgröße<select id="icons-size"><option>24</option><option>32</option><option>48</option><option>64</option><option>128</option><option selected>256</option><option>512</option><option>1024</option></select><span>Pixel · PNG / SVG</span></label></div>
          <label class="stroke-control" for="icons-stroke"><span>Strichstärke <output id="icons-stroke-value" for="icons-stroke">2</output></span><input id="icons-stroke" type="range" min="0.5" max="3" step="0.25" value="2"></label>
          <div class="icon-background"><label><input id="icons-transparent" type="checkbox" checked> Transparent</label><label class="background-color-label">Hintergrund<input id="icons-background" type="color" value="#ffffff" disabled></label></div>
        </fieldset>
        <div class="icon-export-actions"><button class="primary-button icon-copy" type="button" disabled>SVG kopieren</button><button class="secondary-button icon-export" type="button" data-format="svg" disabled>SVG ↓</button><button class="secondary-button icon-export" type="button" data-format="png" disabled>PNG ↓</button></div>
      </aside>`;
    readFavorites();
    root.querySelector("#icons-search").addEventListener("input",() => applyFilters());
    for (const selector of ["#icons-category","#icons-sort"]) root.querySelector(selector).addEventListener("change",() => applyFilters());
    root.querySelectorAll(".icon-styles button").forEach(button => button.addEventListener("click",() => {
      styleFilter = button.dataset.style;
      if (selected && styleFilter !== "all") selected = byId.get(`${styleFilter}/${selected.name}`) || null;
      root.querySelectorAll(".icon-styles button").forEach(item => item.setAttribute("aria-pressed",String(item === button)));
      applyFilters();
    }));
    root.querySelector(".favorite-filter").addEventListener("click",event => { onlyFavorites = !onlyFavorites; event.currentTarget.setAttribute("aria-pressed",String(onlyFavorites)); applyFilters(); });
    root.querySelector(".icon-favorite").addEventListener("click",() => {
      if (!selected) return;
      if (favorites.has(selected.id)) favorites.delete(selected.id); else favorites.add(selected.id);
      try { localStorage.setItem(favoritesKey,JSON.stringify([...favorites])); } catch { persistentFavorites = false; }
      applyFilters(false);
      if (!persistentFavorites) ui.status(root,"Favoriten gelten hier nur für diese Sitzung; der Browserspeicher ist nicht verfügbar.");
    });
    root.querySelector(".gallery-reset").addEventListener("click",() => {
      root.querySelector("#icons-search").value = ""; root.querySelector("#icons-category").value = ""; styleFilter = "outline"; onlyFavorites = false;
      root.querySelector(".favorite-filter").setAttribute("aria-pressed","false");
      root.querySelectorAll(".icon-styles button").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.style === styleFilter)));
      applyFilters(); root.querySelector("#icons-search").focus();
    });
    root.querySelector(".gallery-previous").addEventListener("click",() => { currentPage--; renderGrid(); });
    root.querySelector(".gallery-next").addEventListener("click",() => { currentPage++; renderGrid(); });
    root.querySelector(".icon-settings").addEventListener("input",renderSelection);
    root.querySelector(".icon-settings").addEventListener("change",renderSelection);
    const autoColor = el("button", "icon-auto-color", "Automatisch");
    autoColor.type = "button"; autoColor.setAttribute("aria-pressed", "true"); autoColor.title = "Iconfarbe an Light-/Darkmode anpassen";
    root.querySelector("#icons-color-value").after(autoColor);
    const selectManualColor = () => { automaticColor = false; autoColor.setAttribute("aria-pressed", "false"); };
    root.querySelector("#icons-color").addEventListener("input", selectManualColor);
    root.querySelector("#icons-color").addEventListener("change", selectManualColor);
    autoColor.addEventListener("click", () => { automaticColor = true; syncAutomaticColor(); });
    window.addEventListener("kreativ-theme", syncAutomaticColor);
    root.querySelector(".icon-copy").addEventListener("click",copySvg);
    root.querySelectorAll(".icon-export").forEach(button => button.addEventListener("click",() => exportIcon(button.dataset.format)));
    root.querySelector(".gallery-retry").addEventListener("click",open);
    root.addEventListener("export-finished",syncActions);
    window.addEventListener("storage",event => { if (event.key === favoritesKey) { readFavorites(); if (icons.length) applyFilters(false); } });
    syncAutomaticColor();
  }

  async function open() {
    if (icons.length) return;
    root.setAttribute("aria-busy","true"); root.querySelector(".gallery-retry").hidden = true;
    root.querySelector(".gallery-count").textContent = "Lokale Icons werden geladen …";
    try {
      const catalog = await loadCatalog();
      if (icons.length) return;
      const sorted = catalog.icons.map(([name,style,category,tags,nodes]) => ({name,style,category,nodes,id:`${style}/${name}`,search:normalize([name,category,categories[category] || "",...tags].join(" "))}));
      sorted.sort((a,b) => {
        const rankA = common.indexOf(a.name), rankB = common.indexOf(b.name);
        return (rankA === -1 ? 999 : rankA) - (rankB === -1 ? 999 : rankB) || a.name.localeCompare(b.name,"en") || b.style.localeCompare(a.style);
      });
      icons = sorted; byId = new Map(icons.map(icon => [icon.id,icon]));
      for (const category of [...new Set(icons.map(icon => icon.category))].sort((a,b) => (categories[a] || a).localeCompare(categories[b] || b,"de"))) {
        const option = el("option","",categories[category] || category); option.value = category; root.querySelector("#icons-category").append(option);
      }
      root.querySelector(".gallery-source").textContent = `Tabler ${catalog.version} · ${new Intl.NumberFormat("de-DE").format(icons.length)} Icons`;
      applyFilters(); ui.status(root,"");
    } catch(error) {
      root.querySelector(".gallery-count").textContent = "Iconbestand nicht verfügbar";
      root.querySelector(".gallery-retry").hidden = false; ui.status(root,error.message,true);
    } finally { root.setAttribute("aria-busy","false"); }
  }
  return { init, open, get busy() { return copying; } };
})();
