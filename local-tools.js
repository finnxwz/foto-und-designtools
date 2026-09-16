"use strict";

window.KreativTools = (() => {
  const statsKey = "kreativraum-statistics-v1";
  let memoryStats = emptyStats();
  let storageAvailable = true;
  let directory = null;
  let directoryGranted = false;
  let database = null;
  let saveQueue = Promise.resolve();
  const counters = { convert: "converted", resize: "resized", rename: "renamed", palette: "palettes", fonts: "fontPairs", qr: "qrCodes", icons: "iconsExported" };

  function emptyStats() {
    return { converted: 0, resized: 0, renamed: 0, palettes: 0, fontPairs: 0, qrCodes: 0, iconsExported: 0, recent: [] };
  }

  function readStats() {
    if (!storageAvailable) return memoryStats;
    try {
      const raw = localStorage.getItem(statsKey);
      if (raw) {
        const value = JSON.parse(raw);
        const migrated = emptyStats();
        for (const key of Object.values(counters)) {
          if (value[key] !== undefined && (!Number.isFinite(value[key]) || value[key] < 0)) throw new Error("Ungültige Statistik");
          migrated[key] = value[key] || 0;
        }
        if (!Array.isArray(value.recent)) throw new Error("Ungültige Statistik");
        migrated.recent = value.recent.filter(event => Object.hasOwn(counters, event.kind)).slice(0, 12);
        memoryStats = migrated;
      } else memoryStats = emptyStats();
    } catch {
      storageAvailable = false;
    }
    return memoryStats;
  }

  // Kleine Zähler und die letzten 12 Aktionen; Bilddaten werden nicht gespeichert.
  async function record(event) {
    if (!Object.hasOwn(counters, event.kind)) throw new Error("Unbekanntes Tool");
    const update = () => {
      const stats = readStats();
      stats[counters[event.kind]] += 1;
      const { kind, name, format, percent } = event;
      stats.recent = [{ kind, name, format, percent, date: new Date().toISOString() }, ...stats.recent].slice(0, 12);
      memoryStats = stats;
      try { localStorage.setItem(statsKey, JSON.stringify(stats)); }
      catch { storageAvailable = false; }
      window.dispatchEvent(new Event("kreativ-stats"));
    };
    if (navigator.locks && storageAvailable) {
      try { await navigator.locks.request(statsKey, update); }
      catch { update(); }
    } else update();
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const index = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1);
    return `${new Intl.NumberFormat("de-DE", { maximumFractionDigits: index === 0 ? 0 : 2 }).format(bytes / 1024 ** index)} ${units[index]}`;
  }

  function outputName(name, suffix, format = "png") {
    const stem = name.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(0, 150) || "Bild";
    return `${stem}${suffix}.${format === "jpeg" ? "jpg" : "png"}`;
  }

  async function loadImage(file) {
    if (!/\.(jpe?g|jfif|png|webp|avif|bmp)$/i.test(file.name) && !/^image\/(jpeg|png|webp|avif|bmp|x-ms-bmp)$/i.test(file.type)) {
      throw new Error("Bitte ein JPEG-, WEBP-, PNG-, AVIF- oder BMP-Bild verwenden.");
    }
    if (!file.size) throw new Error("Diese Datei ist leer.");
    // ImageBitmap berücksichtigt die EXIF-Ausrichtung und fixiert bei Animationen ein Einzelbild.
    if (typeof createImageBitmap === "function") {
      try {
        const image = await createImageBitmap(file, { imageOrientation: "from-image" });
        return { image, width: image.width, height: image.height, close: () => image.close() };
      } catch { /* Fallback für Formate, die nur das img-Element decodieren kann. */ }
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    try {
      image.src = url;
      await image.decode();
      return { image, width: image.naturalWidth, height: image.naturalHeight, close: () => { image.src = ""; URL.revokeObjectURL(url); } };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("Das Bild ist beschädigt oder dieses Bildformat wird von deinem Browser nicht unterstützt.");
    }
  }

  async function encodeImage(source, percent = 100, format = "png") {
    const width = Math.max(1, Math.round(source.width * percent / 100));
    const height = Math.max(1, Math.round(source.height * percent / 100));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    try {
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Für dieses Bild ist nicht genug Grafikspeicher verfügbar.");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      if (format === "jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
      }
      context.drawImage(source.image, 0, 0, width, height);
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Das Bild ist zu groß für den Export in diesem Browser.")), `image/${format}`, .95);
      });
      if (blob.type !== `image/${format}`) throw new Error("Dein Browser kann das gewählte Format nicht exportieren.");
      return { blob, width, height, percent, format };
    } finally {
      canvas.width = 0;
      canvas.height = 0;
    }
  }

  function notifyDirectory() { window.dispatchEvent(new Event("kreativ-directory")); }

  const directoryReady = new Promise((resolve) => {
    if (!("showDirectoryPicker" in window)) { resolve(); return; }
    try {
      const request = indexedDB.open("kreativraum-settings", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("settings");
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
      request.onsuccess = () => {
        database = request.result;
        const read = database.transaction("settings").objectStore("settings").get("directory");
        read.onerror = () => resolve();
        read.onsuccess = async () => {
          try {
            directory = read.result || null;
            directoryGranted = directory && await directory.queryPermission({ mode: "readwrite" }) === "granted";
          } catch { directory = null; }
          notifyDirectory();
          resolve();
        };
      };
    } catch { resolve(); }
  });

  async function chooseDirectory(change = false) {
    if (directory && !directoryGranted && !change) {
      directoryGranted = await directory.requestPermission({ mode: "readwrite" }) === "granted";
      notifyDirectory();
      if (!directoryGranted) throw new Error("Kein Ordnerzugriff erteilt. Du kannst den Browser-Download verwenden.");
      return;
    }
    const chosen = await window.showDirectoryPicker({ id: "kreativraum-output", mode: "readwrite", startIn: "desktop" });
    directory = chosen;
    directoryGranted = true;
    if (database) {
      try { database.transaction("settings", "readwrite").objectStore("settings").put(directory, "directory"); }
      catch { /* Der gewählte Ordner bleibt für diese Sitzung verfügbar. */ }
    }
    notifyDirectory();
  }

  function useDownloads() {
    directory = null;
    directoryGranted = false;
    if (database) {
      try { database.transaction("settings", "readwrite").objectStore("settings").delete("directory"); }
      catch { /* Kein dauerhafter Speicher verfügbar. */ }
    }
    notifyDirectory();
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return { method: "download", name };
  }

  async function writeFile(blob, name) {
    await directoryReady;
    if (!directory) return download(blob, name);
    const target = directory;
    if (await target.queryPermission({ mode: "readwrite" }) !== "granted") {
      directoryGranted = false;
      notifyDirectory();
      throw new Error("Bitte oben den Zielordner erneut freigeben oder auf Browser-Download wechseln. Dein Ergebnis ist weiterhin bereit.");
    }
    // Bestehende Dateien, einschließlich Originale, niemals überschreiben.
    let candidate = name;
    for (let index = 1; ; index += 1) {
      try { await target.getFileHandle(candidate); }
      catch (error) {
        if (error.name === "NotFoundError") break;
        if (error.name !== "TypeMismatchError") throw error;
      }
      const extension = name.lastIndexOf(".");
      candidate = extension > 0 ? `${name.slice(0, extension)} (${index})${name.slice(extension)}` : `${name} (${index})`;
    }
    const handle = await target.getFileHandle(candidate, { create: true });
    const writable = await handle.createWritable();
    try { await writable.write(blob); await writable.close(); }
    catch (error) { try { await writable.abort(); } catch { /* Stream schon geschlossen. */ } throw error; }
    return { method: "directory", name: candidate, directory: target.name };
  }

  function save(blob, name) {
    // Auch gleichnamige Exporte beider Tools werden nacheinander gespeichert.
    const job = saveQueue.then(() => writeFile(blob, name));
    saveQueue = job.catch(() => {});
    return job;
  }

  readStats();
  return {
    formatBytes, outputName, loadImage, encodeImage, save, record, readStats, chooseDirectory, useDownloads,
    directoryReady,
    get storageAvailable() { return storageAvailable; },
    get directoryState() { return { supported: "showDirectoryPicker" in window, name: directory?.name, granted: directoryGranted }; },
  };
})();
