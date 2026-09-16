"use strict";

window.KreativPages = (() => {
  const tools = window.KreativTools;
  const sizes = [75, 50, 20];
  const accept = ".jpg,.jpeg,.jfif,.webp,.png,.avif,.bmp,image/jpeg,image/webp,image/png,image/avif,image/bmp";
  let nextId = 0;
  let pending = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatSelect(id) {
    const label = element("label", "format-control", "Ausgabeformat");
    const select = element("select");
    select.id = id;
    label.htmlFor = id;
    for (const [value, text] of [["png", "PNG · verlustfrei"], ["jpeg", "JPEG · Qualität 95 %"]]) {
      const option = element("option", "", text);
      option.value = value;
      select.append(option);
    }
    label.append(select);
    return { label, select };
  }

  function formatNote(format) {
    return format === "jpeg"
      ? "JPEG: Qualität 95 %, weißer Hintergrund."
      : "PNG: verlustfrei, transparent. Dateigröße kann steigen.";
  }

  function savingText(before, after) {
    const difference = before - after;
    if (difference === 0) return "Gleich groß wie das Original";
    const percent = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(Math.abs(difference) / before * 100);
    return `${tools.formatBytes(Math.abs(difference))} ${difference > 0 ? "kleiner" : "größer"} (${percent} %)`;
  }

  function shell(kind) {
    const convert = kind === "convert";
    const root = document.getElementById(`${kind}-view`);
    root.classList.add("editor-view");
    root.dataset.fileCount = "0";
    root.innerHTML = `
      <div class="editor-heading">
        <div class="tool-intro"><h1 id="${kind}-title">${convert ? "Bildkonverter" : "Image Size Reducer"}<span class="title-dot">.</span></h1></div>
        <button class="text-button help-button" type="button" aria-haspopup="dialog">Hinweise ⓘ</button>
      </div>
      <div class="output-panel">
        <div class="output-summary"><span class="panel-label">SPEICHERZIEL</span><p class="directory-status" aria-live="polite">Browser-Download</p></div>
        <div class="output-actions"><button class="secondary-button choose-directory" type="button">Desktop / Ordner wählen</button><button class="text-button change-directory" type="button" hidden>Ordner ändern</button><button class="text-button use-downloads" type="button" hidden>Browser-Download</button></div>
        <p class="directory-error inline-error" role="alert"></p>
      </div>
      <div class="editing-grid">
      <div class="input-pane">
      <div class="tool-settings"></div>
      <input class="file-input visually-hidden" id="${kind}-files" type="file" multiple accept="${accept}" tabindex="-1">
      <button class="drop-zone ${convert ? "drop-purple" : "drop-lime"}" type="button" aria-describedby="${kind}-formats">
        <span class="drop-symbol" aria-hidden="true">${convert ? "↧" : "⤢"}</span>
        <span class="drop-title">Bilder hier ablegen</span>
        <span class="drop-copy">oder <span class="drop-link">Dateien auswählen</span></span>
        <span class="drop-formats" id="${kind}-formats">JPEG · WEBP · PNG · AVIF · BMP</span>
      </button>
      </div>
      <div class="results-pane">
      <div class="results-heading"><h2>Deine Bilder <span class="count-badge file-count">0</span></h2><button class="text-button clear-results" type="button" disabled>Liste leeren</button></div>
      <p class="queue-status" role="status">Bereit für deine Bilder.</p>
      <div class="file-results"></div>
      <div class="editor-empty"><span aria-hidden="true">${convert ? "↧" : "⤢"}</span><p>${convert ? "Dein Ergebnis erscheint hier." : "75 %, 50 % oder 20 %"}</p><small>${convert ? "Konvertierung und Download starten automatisch." : "Bild hinzufügen, Format und Größe wählen."}</small></div>
      </div>
      </div>
      <p class="storage-note" hidden>Dein Browser erlaubt keine dauerhafte Statistikablage. Die Zähler gelten aktuell nur für diese Sitzung.</p>
      <dialog class="tool-help" aria-labelledby="${kind}-help-title">
        <button class="icon-button tool-help-close" type="button" aria-label="Hinweise schließen">×</button>
        <h2 id="${kind}-help-title">Gut zu wissen</h2>
        <h3>Speichern</h3>
        <p>Mit „Desktop / Ordner wählen“ kannst du in Chrome oder Edge einen Zielordner freigeben. Ohne Freigabe gilt der Downloadordner deines Browsers – stelle ihn bei Bedarf auf Desktop. Bei mehreren automatischen Downloads kann eine Browser-Freigabe nötig sein. Blockierte Downloads lassen sich über den Download-Button erneut starten.</p>
        <h3>Format & Bildgröße</h3>
        <p>${convert ? "Das gewählte Format gilt für neu hinzugefügte Bilder. Die Bildabmessungen bleiben erhalten." : "75, 50 und 20 % beziehen sich auf Breite und Höhe, nicht auf die Dateigröße. Die angezeigten Dateigrößen werden tatsächlich berechnet. Kleinere Abmessungen bedeuten weniger Bilddetails."}</p>
        <p>PNG speichert verlustfrei und erhält Transparenz, kann aber größer als das Original sein. JPEG verwendet 95 % Qualität mit verlustbehafteter Kompression; transparente Bereiche werden weiß.</p>
        <p>Bei Animationen wird ein Einzelbild exportiert. Metadaten werden nicht übernommen. Deine Originaldateien bleiben erhalten.</p>
      </dialog>
    `;
    const help = root.querySelector(".tool-help");
    root.querySelector(".help-button").addEventListener("click", () => help.showModal());
    root.querySelector(".tool-help-close").addEventListener("click", () => help.close());
    return root;
  }

  function setupDirectory(root) {
    const choose = root.querySelector(".choose-directory");
    const change = root.querySelector(".change-directory");
    const fallback = root.querySelector(".use-downloads");
    const error = root.querySelector(".directory-error");
    function render() {
      const state = tools.directoryState;
      choose.hidden = !state.supported || Boolean(state.name && state.granted);
      choose.textContent = state.name ? "Ordner erneut freigeben" : "Desktop / Ordner wählen";
      change.hidden = !state.name;
      fallback.hidden = !state.name;
      root.querySelector(".directory-status").textContent = state.name
        ? `${state.name} · ${state.granted ? "aktiv" : "Freigabe nötig"}`
        : "Browser-Download";
      error.textContent = "";
    }
    async function select(changeFolder) {
      error.textContent = "";
      try { await tools.chooseDirectory(changeFolder); }
      catch (failure) {
        if (failure.name !== "AbortError") error.textContent = `Ordner konnte nicht freigegeben werden. ${failure.message}`;
      }
    }
    choose.addEventListener("click", () => select(false));
    change.addEventListener("click", () => select(true));
    fallback.addEventListener("click", () => tools.useDownloads());
    window.addEventListener("kreativ-directory", render);
    tools.directoryReady.then(render);
    render();
  }

  function makeRecord(file, root) {
    const id = `image-${++nextId}`;
    const card = element("article", "file-result");
    const header = element("div", "file-header");
    const thumbnail = element("img", "file-thumbnail");
    thumbnail.alt = "";
    thumbnail.hidden = true;
    const info = element("div", "file-info");
    const name = element("h3", "file-name", file.name);
    name.title = file.name;
    name.id = `${id}-name`;
    card.setAttribute("aria-labelledby", name.id);
    const metadata = element("p", "file-metadata", `${tools.formatBytes(file.size)} · Original`);
    const state = element("span", "file-state", "Wartet …");
    const body = element("div", "file-body");
    const status = element("p", "file-message", "Wird gleich verarbeitet.");
    status.setAttribute("role", "status");
    info.append(name, metadata);
    header.append(thumbnail, info, state);
    card.append(header, body, status);
    root.querySelector(".file-results").append(card);
    return { id, file, card, thumbnail, metadata, state, body, status, urls: [], counted: new Set(), busy: false };
  }

  function showThumbnail(record, blob) {
    record.urls.forEach((url) => URL.revokeObjectURL(url));
    record.urls = [URL.createObjectURL(blob)];
    record.thumbnail.src = record.urls[0];
    record.thumbnail.hidden = false;
  }

  async function exportResult(record, result, button, kind) {
    if (record.busy) return;
    record.busy = true;
    pending += 1;
    if (button) button.disabled = true;
    record.state.textContent = "Speichert …";
    record.status.classList.remove("inline-error");
    const suffix = kind === "convert" ? "-konvertiert" : `-${result.percent}prozent`;
    try {
      const saved = await tools.save(result.blob, tools.outputName(record.file.name, suffix, result.format));
      record.state.textContent = saved.method === "directory" ? "Gespeichert ✓" : "Download angestoßen";
      record.status.textContent = saved.method === "directory"
        ? `In „${saved.directory}“ gespeichert.`
        : "An den Browser übergeben. Bei Bedarf erneut herunterladen.";
      record.status.title = saved.name;
      const key = `${result.format}-${result.percent}`;
      if (kind === "resize" && !record.counted.has(key)) {
        record.counted.add(key);
        await tools.record({ kind, name: record.file.name, format: result.format, percent: result.percent, inputBytes: record.file.size, outputBytes: result.blob.size });
      }
    } catch (failure) {
      record.state.textContent = "Download bereit";
      record.status.classList.add("inline-error");
      record.status.textContent = `Speichern fehlgeschlagen. ${failure.message} Bitte erneut herunterladen.`;
    } finally {
      record.busy = false;
      pending -= 1;
      if (button) button.disabled = false;
      window.dispatchEvent(new Event("kreativ-queue"));
    }
  }

  async function convertRecord(record, format) {
    const source = await tools.loadImage(record.file);
    let result;
    try {
      record.metadata.textContent = `${tools.formatBytes(record.file.size)} · ${source.width} × ${source.height} px · Original`;
      result = await tools.encodeImage(source, 100, format);
    } finally { source.close(); }
    showThumbnail(record, result.blob);
    record.body.append(element("p", "result-size", `${format.toUpperCase()} · ${tools.formatBytes(result.blob.size)} · ${result.width} × ${result.height} px`));
    const button = element("button", "primary-button", `${format.toUpperCase()} herunterladen ↓`);
    button.type = "button";
    button.addEventListener("click", () => exportResult(record, result, button, "convert"));
    record.body.append(button);
    await tools.record({ kind: "convert", name: record.file.name, format, inputBytes: record.file.size, outputBytes: result.blob.size });
    await exportResult(record, result, button, "convert");
  }

  async function resizeRecord(record) {
    const { label, select } = formatSelect(`${record.id}-format`);
    const note = element("p", "format-note");
    const options = element("div", "size-options");
    options.setAttribute("role", "radiogroup");
    options.setAttribute("aria-label", "Bildabmessungen auswählen");
    const download = element("button", "primary-button");
    download.type = "button";
    download.disabled = true;
    record.body.append(label, note, options, download);
    let selected = null;

    async function calculate() {
      record.busy = true;
      pending += 1;
      window.dispatchEvent(new Event("kreativ-queue"));
      select.disabled = true;
      download.disabled = true;
      options.replaceChildren();
      selected = null;
      const format = select.value;
      note.textContent = formatNote(format);
      record.state.textContent = "Berechnet …";
      record.status.classList.remove("inline-error");
      record.status.textContent = "Die Varianten werden vollständig berechnet – keine geschätzten Dateigrößen.";
      let source;
      try {
        source = await tools.loadImage(record.file);
        record.metadata.textContent = `${tools.formatBytes(record.file.size)} · ${source.width} × ${source.height} px · Original`;
        // Nur die drei Varianten des gewählten Formats bleiben im Speicher.
        const results = [];
        for (const percent of sizes) {
          record.state.textContent = `Berechnet ${percent} % …`;
          results.push(await tools.encodeImage(source, percent, format));
        }
        for (const result of results) {
          const label = element("label", "size-option");
          const radio = element("input");
          radio.type = "radio";
          radio.name = `${record.id}-size`;
          radio.value = String(result.percent);
          const text = element("span", "size-option-content");
          text.append(
            element("strong", "size-percent", `${result.percent} %`),
            element("span", "size-dimensions", `${result.width} × ${result.height} px`),
            element("strong", "size-bytes", tools.formatBytes(result.blob.size)),
            element("span", result.blob.size < record.file.size ? "size-difference positive" : "size-difference", savingText(record.file.size, result.blob.size)),
          );
          label.append(radio, text);
          const choose = () => {
            selected = result;
            download.textContent = `${result.percent} % als ${format.toUpperCase()} herunterladen ↓`;
            showThumbnail(record, result.blob);
          };
          radio.addEventListener("change", choose);
          if (result.percent === 50) { radio.checked = true; choose(); }
          options.append(label);
        }
        download.disabled = false;
        record.state.textContent = "Bereit ✓";
        record.status.textContent = "Prozentwerte = Breite und Höhe. Größe wählen und herunterladen.";
      } catch (failure) {
        record.state.textContent = "Nicht verarbeitet";
        record.status.classList.add("inline-error");
        record.status.textContent = failure.message;
      } finally {
        source?.close();
        select.disabled = false;
        record.busy = false;
        pending -= 1;
        window.dispatchEvent(new Event("kreativ-queue"));
      }
    }

    select.addEventListener("change", calculate);
    download.addEventListener("click", async () => {
      if (!selected || record.busy) return;
      select.disabled = true;
      options.querySelectorAll("input").forEach((radio) => { radio.disabled = true; });
      await exportResult(record, selected, download, "resize");
      select.disabled = false;
      options.querySelectorAll("input").forEach((radio) => { radio.disabled = false; });
    });
    await calculate();
  }

  function setupTool(kind) {
    const root = shell(kind);
    setupDirectory(root);
    let select;
    if (kind === "convert") {
      const control = formatSelect("convert-format");
      select = control.select;
      const note = element("p", "format-note", formatNote(select.value));
      root.querySelector(".tool-settings").append(control.label, note);
      select.addEventListener("change", () => { note.textContent = formatNote(select.value); });
    }
    const input = root.querySelector(".file-input");
    const drop = root.querySelector(".drop-zone");
    const clear = root.querySelector(".clear-results");
    const records = [];
    const queue = [];
    let working = false;
    let dragDepth = 0;

    function renderQueue() {
      root.dataset.fileCount = String(records.length);
      root.classList.toggle("has-files", records.length > 0);
      root.querySelector(".file-count").textContent = String(records.length);
      clear.disabled = !records.length || working || records.some((record) => record.busy);
      root.querySelector(".queue-status").textContent = working
        ? `Bilder werden verarbeitet${queue.length ? ` · ${queue.length} in der Warteschlange` : ""} …`
        : "";
    }

    async function runQueue() {
      if (working) return;
      working = true;
      pending += 1;
      renderQueue();
      try {
        while (queue.length) {
          const { record, format } = queue.shift();
          record.state.textContent = "Verarbeitet …";
          renderQueue();
          try {
            if (kind === "convert") await convertRecord(record, format);
            else await resizeRecord(record);
          } catch (failure) {
            record.state.textContent = "Nicht verarbeitet";
            record.status.classList.add("inline-error");
            record.status.textContent = failure.message || "Dieses Bild konnte nicht verarbeitet werden.";
          }
        }
      } finally {
        working = false;
        pending -= 1;
        renderQueue();
      }
    }

    function addFiles(files) {
      for (const file of files) {
        const record = makeRecord(file, root);
        records.push(record);
        queue.push({ record, format: select?.value || "png" });
      }
      if (queue.length) runQueue();
    }

    drop.addEventListener("click", () => input.click());
    input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });
    drop.addEventListener("dragenter", (event) => { event.preventDefault(); dragDepth += 1; drop.classList.add("is-dragging"); });
    drop.addEventListener("dragover", (event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; });
    drop.addEventListener("dragleave", () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) drop.classList.remove("is-dragging"); });
    drop.addEventListener("drop", (event) => {
      event.preventDefault();
      dragDepth = 0;
      drop.classList.remove("is-dragging");
      addFiles(event.dataTransfer.files);
    });
    clear.addEventListener("click", () => {
      if (working || records.some((record) => record.busy)) return;
      records.forEach((record) => record.urls.forEach((url) => URL.revokeObjectURL(url)));
      records.length = 0;
      root.querySelector(".file-results").replaceChildren();
      renderQueue();
    });
    window.addEventListener("kreativ-queue", renderQueue);
  }

  function setupStats() {
    document.getElementById("stats-view").innerHTML = `
      <a class="back-link" href="#home">← Alle Tools</a>
      <div class="tool-intro"><h1 id="stats-title">Deine Statistik<span class="title-dot">.</span></h1></div>
      <div class="stats-grid">
        <article class="stat-card stat-purple"><span class="panel-label">BILDER KONVERTIERT</span><strong id="stat-converted">0</strong><p>Erfolgreich in PNG oder JPEG umgewandelt</p></article>
        <article class="stat-card stat-lime"><span class="panel-label">VARIANTEN EXPORTIERT</span><strong id="stat-resized">0</strong><p>Verkleinerte Bilder zum Speichern übergeben</p></article>
        <article class="stat-card stat-peach"><span class="panel-label">BILDER UMBENANNT</span><strong id="stat-renamed">0</strong><p>Mit neuen Dateinamen exportiert</p></article>
        <article class="stat-card stat-peach"><span class="panel-label">FARBPALETTEN ERSTELLT</span><strong id="stat-palettes">0</strong><p>Farben erfolgreich aus Bildern extrahiert</p></article>
        <article class="stat-card stat-purple"><span class="panel-label">SCHRIFTKOMBIS GETESTET</span><strong id="stat-fontPairs">0</strong><p>Ausgewählte Kombinationen erfolgreich angezeigt</p></article>
        <article class="stat-card stat-lime"><span class="panel-label">QR-CODES EXPORTIERT</span><strong id="stat-qrCodes">0</strong><p>Eigene QR-Designs als PNG oder SVG exportiert</p></article>
        <article class="stat-card stat-purple"><span class="panel-label">ICONS ÜBERNOMMEN</span><strong id="stat-iconsExported">0</strong><p>Als SVG kopiert oder als SVG / PNG exportiert</p></article>
      </div>
      <div class="results-heading"><h2>Zuletzt erledigt</h2><span class="section-note">Deine letzten 12 Aktionen</span></div>
      <div id="recent-actions" class="recent-actions"></div>
      <p class="processing-note">Konvertierungen und Farbpaletten zählen nach erfolgreicher Berechnung, ausgewählte Schriftkombinationen nach erfolgreichem Laden der Vorschau. Die anderen Tools zählen beim Export; bei Icons zählt auch erfolgreiches SVG-Kopieren. Dasselbe Ergebnis zählt innerhalb der Sitzung nicht erneut. Bisherige Schrift-Exportzähler werden weitergeführt. Beim Browser-Download zählt die Übergabe an den Browser; der Abschluss kann nicht geprüft werden.</p>
      <p class="processing-note">Die Statistik wird in diesem Browser gespeichert. Beim Löschen der Website-Daten gehen die Zähler verloren. Bilder werden nicht dauerhaft in der App gespeichert.</p>
      <p class="storage-note" hidden>Dein Browser erlaubt keine dauerhafte Statistikablage. Die Zähler gelten aktuell nur für diese Sitzung.</p>
    `;
  }

  function renderStats() {
    const stats = tools.readStats();
    const number = new Intl.NumberFormat("de-DE");
    for (const key of ["converted", "resized", "renamed", "palettes", "fontPairs", "qrCodes", "iconsExported"]) document.getElementById(`stat-${key}`).textContent = number.format(stats[key]);
    const recent = document.getElementById("recent-actions");
    recent.replaceChildren();
    if (!stats.recent.length) recent.append(element("p", "empty-state", "Noch ganz viel Platz für deine ersten Bilder. Leg mit einem Tool los – der Rest zählt sich von selbst."));
    for (const event of stats.recent) {
      const row = element("div", "recent-row");
      const info = element("div", "recent-info");
      const labels = { convert: `Konvertiert → ${event.format?.toUpperCase() || "Bild"}`, resize: `Verkleinert auf ${event.percent} %`, rename: "Umbenannt & exportiert", palette: "Farbpalette erstellt", fonts: event.format === "preview" ? "Schriftkombination getestet" : "Schriftkombination exportiert", qr: "QR-Code exportiert", icons: "Icon kopiert / exportiert" };
      const icons = { convert: "↧", resize: "⤢", rename: "Aa", palette: "◕", fonts: "Tt", qr: "▦", icons: "◇" };
      info.append(element("strong", "", event.name), element("span", "", labels[event.kind]));
      const date = new Date(event.date);
      const timestamp = element("time", "", Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("de-DE", { dateStyle: "short", timeStyle: "short" }).format(date));
      timestamp.dateTime = event.date;
      row.append(element("span", `activity-icon ${["convert", "fonts"].includes(event.kind) ? "activity-purple" : "activity-lime"}`, icons[event.kind]), info, timestamp);
      recent.append(row);
    }
    document.querySelectorAll(".storage-note").forEach((note) => { note.hidden = tools.storageAvailable; });
  }

  function init() {
    setupTool("convert");
    setupTool("resize");
    setupStats();
    renderStats();
    window.addEventListener("kreativ-stats", renderStats);
    window.addEventListener("storage", renderStats);
    // Dateien neben der Dropzone sollen die lokale App nicht durch ein Bild ersetzen.
    for (const type of ["dragover", "drop"]) {
      window.addEventListener(type, (event) => {
        if (Array.from(event.dataTransfer?.types || []).includes("Files")) event.preventDefault();
      });
    }
    window.addEventListener("beforeunload", (event) => {
      if (pending || window.KreativCreative?.busy || window.KreativIcons?.busy) { event.preventDefault(); event.returnValue = ""; }
    });
  }

  return { init, renderStats, setupDirectory, element };
})();
