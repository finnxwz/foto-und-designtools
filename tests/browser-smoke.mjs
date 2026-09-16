// Abhängigkeitenfreier Browsertest: Node >= 22 und Firefox mit WebDriver BiDi.
// Aufruf: node tests/browser-smoke.mjs <firefox.exe> <vorhandener Artefaktordner>
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { creativeChecks } from "./creative-checks.mjs";
import { iconChecks } from "./icon-checks.mjs";

const [firefoxPath, artifactRoot] = process.argv.slice(2);
if (!firefoxPath || !artifactRoot) throw new Error("Firefox-Pfad und vorhandenen Artefaktordner angeben.");
const profile = mkdtempSync(join(artifactRoot, "kreativraum-browser-"));
// Im isolierten Testprofil keine Startseiten-/Empfehlungsdaten im Hintergrund laden.
writeFileSync(join(profile, "user.js"), [
  'user_pref("browser.startup.homepage", "about:blank");',
  'user_pref("browser.startup.homepage_override.mstone", "ignore");',
  'user_pref("browser.newtabpage.enabled", false);',
  'user_pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);',
  'user_pref("browser.newtabpage.activity-stream.discoverystream.enabled", false);',
  'user_pref("browser.shell.checkDefaultBrowser", false);',
].join("\n"));
const port = 9400 + Math.floor(Math.random() * 400);
const browser = spawn(firefoxPath, ["--headless", "--no-remote", "--profile", profile, "--remote-debugging-port", String(port)], { stdio: ["ignore", "pipe", "pipe"] });
let browserLog = "";
browser.stderr.on("data", (chunk) => { browserLog += chunk; });
browser.stdout.on("data", (chunk) => { browserLog += chunk; });
let socket;
let session = false;
let sequence = 0;
const waiting = new Map();
const errors = [];

function command(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { waiting.delete(id); reject(new Error(`Timeout: ${method}`)); }, 30000);
    waiting.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

try {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      socket = await new Promise((resolve, reject) => {
        const candidate = new WebSocket(`ws://127.0.0.1:${port}/session`);
        candidate.addEventListener("open", () => resolve(candidate), { once: true });
        candidate.addEventListener("error", reject, { once: true });
      });
      break;
    } catch { await delay(150); }
  }
  if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error(`Firefox nicht erreichbar: ${browserLog}`);
  socket.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);
    if (data.method === "log.entryAdded" && data.params.level === "error") errors.push(data.params.text);
    const request = waiting.get(data.id);
    if (!request) return;
    clearTimeout(request.timer);
    waiting.delete(data.id);
    if (data.type === "error") request.reject(new Error(`${data.error}: ${data.message}`));
    else request.resolve(data.result);
  });
  await command("session.new", { capabilities: {} });
  session = true;
  await command("session.subscribe", { events: ["log.entryAdded"] });
  const { context } = await command("browsingContext.create", { type: "tab" });
  const url = pathToFileURL(resolve("index.html")).href;
  await command("browsingContext.navigate", { context, url, wait: "complete" });

  async function evaluate(expression) {
    const response = await command("script.evaluate", { expression: `(async () => JSON.stringify(await (async () => { ${expression} })()))()`, target: { context }, awaitPromise: true });
    if (response.type === "exception") throw new Error(response.exceptionDetails.text);
    return response.result.value === undefined ? undefined : JSON.parse(response.result.value);
  }
  async function until(expression) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      if (await evaluate(`return Boolean(${expression});`)) return;
      await delay(100);
    }
    throw new Error(`Bedingung nicht erreicht: ${expression}`);
  }

  async function assertSingleImageFits(page) {
    await evaluate(`location.hash = '${page}';`);
    await until(`!document.getElementById('${page}-view').hidden`);
    for (const [width, height] of [[1920, 900], [1366, 650], [1280, 720], [1024, 650], [768, 600], [390, 740], [360, 640]]) {
      await command("browsingContext.setViewport", { context, viewport: { width, height }, devicePixelRatio: 1 });
      const layout = await evaluate(`
        const root = document.getElementById('${page}-view');
        const controls = [...root.querySelectorAll('.drop-zone, select, .size-options, .file-body .primary-button')];
        return {
          height: document.documentElement.scrollHeight,
          viewport: innerHeight,
          visible: controls.every(node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight; }),
          horizontal: document.documentElement.scrollWidth <= innerWidth
        };
      `);
      if (layout.height > layout.viewport || !layout.visible) {
        const screenshot = await command("browsingContext.captureScreenshot", { context, origin: "document" });
        const path = join(profile, `${page}-${width}x${height}-overflow.png`);
        writeFileSync(path, Buffer.from(screenshot.data, "base64"));
        console.log(`Layout-Diagnose: ${path}`);
      }
      assert.ok(layout.height <= layout.viewport, `${page} ohne Scrollen bei ${width}×${height}: Inhalt ${layout.height}px`);
      assert.ok(layout.visible, `${page}: Alle Bedienelemente sichtbar bei ${width}×${height}`);
      assert.ok(layout.horizontal, `${page}: Kein horizontaler Überlauf bei ${width}×${height}`);
    }
  }

  assert.equal(await evaluate("return document.querySelectorAll('.tool-card[href]').length;"), 7);
  assert.equal(await evaluate("return typeof window.TablerCatalog;"), "undefined", "Icons werden erst beim Öffnen der Galerie geladen");
  assert.deepEqual(await evaluate("return [...document.querySelectorAll('#photo-tools .tool-card')].map(card => card.hash);"), ["#convert", "#resize", "#rename"]);
  assert.deepEqual(await evaluate("return [...document.querySelectorAll('#design-tools .tool-card')].map(card => card.hash);"), ["#palette", "#fonts", "#qr", "#icons"]);
  assert.equal(await evaluate("return new Set([...document.querySelectorAll('.tool-card')].map(card => getComputedStyle(card).backgroundColor)).size;"),7,"Jede Startseiten-Kachel hat eine eigene Farbe");
  assert.equal(await evaluate(`return [...document.querySelectorAll('.tool-card')].every(card=>{const view=document.querySelector(card.hash+'-view');return getComputedStyle(card).getPropertyValue('--tool-surface')===getComputedStyle(view).getPropertyValue('--tool-surface');});`),true,"Kachel und Unterseite teilen dieselbe Pastellfarbe");
  await command("browsingContext.setViewport", { context, viewport: { width: 1280, height: 800 }, devicePixelRatio: 1 });
  assert.ok(await evaluate(`
    const range = document.createRange(); range.selectNodeContents(document.getElementById('page-title'));
    const bounds = range.getBoundingClientRect();
    return Math.abs((bounds.left + bounds.right) / 2 - document.documentElement.clientWidth / 2) < 3;
  `), "Startseitentitel tatsächlich horizontal zentriert");
  await evaluate("await Promise.all(document.getAnimations().map(animation => animation.finished));");
  const homeScreenshot = await command("browsingContext.captureScreenshot", { context, origin: "document" });
  writeFileSync(join(profile, "startseite.png"), Buffer.from(homeScreenshot.data, "base64"));
  await evaluate(`
    window.testDownloads = [];
    const realClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (this.download) { testDownloads.push({ name: this.download, url: this.href }); return; }
      return realClick.call(this);
    };
    window.testFiles = {};
    const canvas = document.createElement('canvas'); canvas.width = 200; canvas.height = 100;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#8855bb'; ctx.fillRect(0, 0, 100, 100);
    for (const format of ['png', 'jpeg', 'webp']) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/' + format, .95));
      testFiles[format] = new File([blob], 'test.' + format, { type: blob.type });
    }
    window.addTestFiles = (kind, files, drop = false) => {
      const transfer = new DataTransfer(); files.forEach(file => transfer.items.add(file));
      if (drop) document.querySelector('#' + kind + '-view .drop-zone').dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
      else { const input = document.querySelector('#' + kind + '-files'); input.files = transfer.files; input.dispatchEvent(new Event('change')); }
    };
    location.hash = 'convert';
    addTestFiles('convert', [testFiles.jpeg, testFiles.webp, new File(['kaputt'], 'kaputt.jpg', { type: 'image/jpeg' }), new File(['text'], 'kein-bild.txt')], true);
  `);
  await until("!document.querySelector('#convert-view .clear-results').disabled");
  assert.equal(await evaluate("return testDownloads.length;"), 2, "JPEG und WEBP werden automatisch als PNG heruntergeladen");
  assert.deepEqual(await evaluate("return testDownloads.map(item => item.name);"), ["test-konvertiert.png", "test-konvertiert.png"]);
  assert.equal(await evaluate("return KreativTools.readStats().converted;"), 2, "Fehlerhafte Dateien zählen nicht");
  assert.equal(await evaluate("return document.querySelectorAll('#convert-view .inline-error.file-message').length;"), 2);

  await evaluate(`
    document.querySelector('#convert-view .clear-results').click();
    document.getElementById('convert-format').value = 'jpeg';
    document.getElementById('convert-format').dispatchEvent(new Event('change'));
    addTestFiles('convert', [testFiles.png]);
  `);
  await until("testDownloads.length === 3 && !document.querySelector('#convert-view .clear-results').disabled");
  assert.deepEqual(await evaluate(`
    const item = testDownloads[2]; const blob = await (await fetch(item.url)).blob();
    const bitmap = await createImageBitmap(blob); const c = document.createElement('canvas'); c.width = bitmap.width; c.height = bitmap.height;
    const ctx = c.getContext('2d'); ctx.drawImage(bitmap, 0, 0); const pixel = [...ctx.getImageData(150, 50, 1, 1).data]; bitmap.close();
    return { name: item.name, type: blob.type, width: c.width, height: c.height, white: pixel.every(value => value >= 250) };
  `), { name: "test-konvertiert.jpg", type: "image/jpeg", width: 200, height: 100, white: true });
  await assertSingleImageFits("convert");

  await evaluate("location.hash = 'resize'; addTestFiles('resize', [testFiles.png]);");
  await until("!document.querySelector('#resize-view .clear-results').disabled");
  assert.deepEqual(await evaluate("return [...document.querySelectorAll('.size-dimensions')].map(node => node.textContent);"), ["150 × 75 px", "100 × 50 px", "40 × 20 px"]);
  assert.equal(await evaluate("return KreativTools.readStats().resized;"), 0, "Vorschauen zählen nicht als Exporte");
  await assertSingleImageFits("resize");
  await evaluate("document.querySelector('#resize-view .help-button').click();");
  assert.equal(await evaluate("return document.querySelector('#resize-view .tool-help').open;"), true, "Hinweise separat zugänglich");
  await evaluate("document.querySelector('#resize-view .tool-help-close').click();");
  await evaluate("document.querySelector('#resize-view .file-body .primary-button').click();");
  await until("KreativTools.readStats().resized === 1");
  assert.equal(await evaluate("return testDownloads.at(-1).name;"), "test-50prozent.png");
  const exported = await evaluate(`
    const blob = await (await fetch(testDownloads.at(-1).url)).blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(bitmap, 0, 0);
    const result = { width: bitmap.width, height: bitmap.height, bytes: blob.size, type: blob.type, alpha: ctx.getImageData(75, 25, 1, 1).data[3] }; bitmap.close(); return result;
  `);
  assert.equal(exported.width, 100);
  assert.equal(exported.height, 50);
  assert.equal(exported.type, "image/png");
  assert.equal(exported.alpha, 0, "PNG behält transparente Bildbereiche");
  assert.equal(await evaluate("return document.querySelector('#stat-saved');"), null, "Speicherersparnis aus Statistik entfernt");
  await evaluate("document.querySelector('#resize-view .file-body .primary-button').click();");
  await until("testDownloads.length === 5");
  assert.equal(await evaluate("return KreativTools.readStats().resized;"), 1, "Wiederholter Download wird nicht doppelt gezählt");

  await evaluate(`
    const select = document.querySelector('#resize-view .file-body select'); select.value = 'jpeg'; select.dispatchEvent(new Event('change'));
  `);
  await until("!document.querySelector('#resize-view .file-body select').disabled");
  await evaluate("document.querySelector('#resize-view input[value=\"20\"]').click(); document.querySelector('#resize-view .file-body .primary-button').click();");
  await until("KreativTools.readStats().resized === 2");
  assert.equal(await evaluate("return testDownloads.at(-1).name;"), "test-20prozent.jpg");

  // EXIF-Orientierung 6: ein 200×100-JPEG muss nach dem Decodieren 100×200 ergeben.
  assert.deepEqual(await evaluate(`
    const original = new Uint8Array(await testFiles.jpeg.arrayBuffer());
    const exif = new Uint8Array([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
    const file = new File([original.slice(0,2), exif, original.slice(2)], 'rotated.jpg', {type:'image/jpeg'});
    const source = await KreativTools.loadImage(file); const result = {width: source.width, height: source.height}; source.close(); return result;
  `), { width: 100, height: 200 });

  // Ordner-API simulieren: Kollisionen, Erfolg und verweigerte Schreibrechte.
  assert.deepEqual(await evaluate(`
    const files = new Map([['test.png', new Blob(['original'])]]); let granted = true;
    const directory = { name: 'Desktop', queryPermission: async () => granted ? 'granted' : 'denied', getFileHandle: async (name, options) => {
      if (!files.has(name) && !options?.create) throw new DOMException('Fehlt', 'NotFoundError');
      return { createWritable: async () => ({ write: async blob => files.set(name, blob), close: async () => {}, abort: async () => {} }) };
    }};
    window.showDirectoryPicker = async () => directory; await KreativTools.chooseDirectory();
    const blob = new Blob(['neu']);
    const saved = await Promise.all([KreativTools.save(blob, 'test.png'), KreativTools.save(blob, 'test.png')]);
    granted = false; let rejected = false; try { await KreativTools.save(blob, 'blocked.png'); } catch { rejected = true; }
    KreativTools.useDownloads();
    return { names: saved.map(item => item.name), original: await files.get('test.png').text(), rejected };
  `), { names: ["test (1).png", "test (2).png"], original: "original", rejected: true });
  // Auch JPEG-Ergebnisse nach dem Download und mit sichtbarer Ordnerauswahl müssen passen.
  await assertSingleImageFits("convert");
  await assertSingleImageFits("resize");

  await evaluate("location.hash = 'stats';");
  await until("!document.getElementById('stats-view').hidden");
  assert.equal(await evaluate("return document.getElementById('stat-converted').textContent;"), "3");
  assert.equal(await evaluate("return document.getElementById('stat-resized').textContent;"), "2");
  await command("browsingContext.setViewport", { context, viewport: { width: 1280, height: 1000 }, devicePixelRatio: 1 });
  const statsScreenshot = await command("browsingContext.captureScreenshot", { context });
  writeFileSync(join(profile, "statistik.png"), Buffer.from(statsScreenshot.data, "base64"));
  await evaluate("location.hash = 'resize';");
  await until("!document.getElementById('resize-view').hidden");
  await command("browsingContext.setViewport", { context, viewport: { width: 1280, height: 720 }, devicePixelRatio: 1 });
  const desktopScreenshot = await command("browsingContext.captureScreenshot", { context, origin: "document" });
  writeFileSync(join(profile, "reducer-desktop.png"), Buffer.from(desktopScreenshot.data, "base64"));
  await command("browsingContext.setViewport", { context, viewport: { width: 360, height: 800 }, devicePixelRatio: 1 });
  for (const page of ["home", "convert", "resize", "stats"]) {
    await evaluate(`location.hash = '${page}';`);
    await until(`!document.getElementById('${page}-view').hidden`);
    assert.equal(await evaluate("return document.documentElement.scrollWidth <= innerWidth;"), true, `Kein horizontaler Überlauf: ${page}`);
  }
  await evaluate("location.hash = 'resize'; document.querySelector('.theme-toggle').click();");
  await until("!document.getElementById('resize-view').hidden");
  const mobileScreenshot = await command("browsingContext.captureScreenshot", { context, origin: "document" });
  writeFileSync(join(profile, "reducer-mobile.png"), Buffer.from(mobileScreenshot.data, "base64"));

  await evaluate("addTestFiles('resize', [testFiles.png, testFiles.jpeg]);");
  await until("!document.querySelector('#resize-view .clear-results').disabled");
  assert.equal(await evaluate("return document.querySelectorAll('#resize-view .file-result').length;"), 3);
  assert.ok(await evaluate("return document.documentElement.scrollHeight > innerHeight;"), "Mehrere Bilder dürfen die Seite verlängern");
  await evaluate("document.querySelector('#resize-view .clear-results').click();");
  assert.equal(await evaluate("return document.querySelector('#resize-view').classList.contains('has-files');"), false, "Liste leeren stellt die große Dropzone wieder her");

  const creativeStats = await creativeChecks({ evaluate, until, command, context, profile });
  await iconChecks({ evaluate, until, command, context, profile });

  await command("browsingContext.reload", { context, wait: "complete" });
  assert.equal(await evaluate("return KreativTools.readStats().converted;"), 3, "Statistik bleibt nach Neuladen erhalten");
  assert.equal(await evaluate("return KreativTools.readStats().resized;"), 2);
  assert.deepEqual(await evaluate("const s=KreativTools.readStats(); return [s.renamed,s.palettes,s.fontPairs,s.qrCodes];"),[2,2,creativeStats.fontPairs,1],"Neue Statistiken bleiben erhalten");
  assert.equal(await evaluate("return KreativTools.readStats().iconsExported;"),4,"Icon-Statistik bleibt erhalten");
  await evaluate("location.hash='icons';");
  await until("document.querySelectorAll('.icon-tile').length > 0");
  assert.equal(await evaluate("return document.querySelector('.icon-favorite').getAttribute('aria-pressed');"),'true',"Icon-Favorit bleibt nach Neuladen erhalten");
  const savedStatistics = await evaluate("return KreativTools.readStats();");
  await evaluate(`localStorage.setItem('kreativraum-statistics-v1', JSON.stringify({converted:11,resized:7,inputBytes:123,outputBytes:456,recent:[{kind:'convert',name:'alt.jpg',format:'png',date:new Date().toISOString()}]}));`);
  await command("browsingContext.reload", { context, wait: "complete" });
  assert.deepEqual(await evaluate("const s=KreativTools.readStats(); return [s.converted,s.resized,s.renamed,s.palettes,s.fontPairs,s.qrCodes];"),[11,7,0,0,0,0],"Alte Statistik bleibt beim Schemawechsel erhalten");
  await evaluate(`localStorage.setItem('kreativraum-statistics-v1', ${JSON.stringify(JSON.stringify(savedStatistics))});`);
  await command("browsingContext.reload", { context, wait: "complete" });
  assert.equal(await evaluate(`
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Voll', 'QuotaExceededError'); };
    try {
      await KreativTools.record({kind:'convert', name:'memory-1.png', format:'png', inputBytes:10, outputBytes:10});
      await KreativTools.record({kind:'convert', name:'memory-2.png', format:'png', inputBytes:10, outputBytes:10});
      return KreativTools.readStats().converted;
    } finally { Storage.prototype.setItem = originalSet; }
  `), 5, "Bei vollem Browserspeicher bleiben neue Zähler im Sitzungsspeicher erhalten");
  assert.equal(await evaluate("return document.querySelector('#stats-view .storage-note').hidden;"), false);
  assert.deepEqual(errors, [], "Keine JavaScript-Fehler im Browser");
  console.log("OK: Drag-and-drop, Batch, JPEG/WEBP→PNG, PNG→JPEG, Transparenz, EXIF, Resize, echte Bytes, Downloads, Statistik, Ordnerkollisionen, Berechtigungsfehler, mobile Layouts und Persistenz.");
  console.log(`Screenshots: ${profile}`);
} finally {
  if (session && socket?.readyState === WebSocket.OPEN) {
    try { await command("browser.close"); } catch { /* Browser beendet oder Verbindung bereits geschlossen. */ }
  }
  socket?.close();
  browser.kill();
  for (const request of waiting.values()) clearTimeout(request.timer);
  // Nur das eigens erzeugte Testprofil aufräumen; Screenshots als Prüfarbelege behalten.
  await delay(600);
  for (const entry of readdirSync(profile)) {
    if (entry.endsWith(".png")) continue;
    try { rmSync(join(profile, entry), { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }); }
    catch { /* Einzelne Browserdateien können kurzzeitig noch gesperrt sein. */ }
  }
}
