"use strict";

window.KreativCore = (() => {
  const encoder = new TextEncoder();
  const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
    for (let bit = 0; bit < 8; bit++) n = (n >>> 1) ^ ((n & 1) ? 0xedb88320 : 0);
    return n >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
    return (crc ^ 0xffffffff) >>> 0;
  }
  // ZIP STORE: unveränderte Bildbytes, UTF-8-Dateinamen, kein erneutes Komprimieren.
  async function zip(entries) {
    if (entries.length > 65535) throw new Error("Zu viele Dateien für ein ZIP-Archiv.");
    const parts = [], directory = [];
    let offset = 0, directorySize = 0;
    for (const entry of entries) {
      const name = encoder.encode(entry.name);
      const bytes = new Uint8Array(await entry.file.arrayBuffer());
      if (bytes.length + offset + name.length + 30 > 0xffffffff) throw new Error("Bitte das Archiv in kleinere Stapel unter 4 GB aufteilen.");
      const crc = crc32(bytes);
      const header = new Uint8Array(30), view = new DataView(header.buffer);
      view.setUint32(0, 0x04034b50, true); view.setUint16(4, 20, true); view.setUint16(6, 0x800, true);
      view.setUint16(12, 33, true); view.setUint32(14, crc, true); view.setUint32(18, bytes.length, true); view.setUint32(22, bytes.length, true); view.setUint16(26, name.length, true);
      parts.push(header, name, bytes);
      const central = new Uint8Array(46), cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x800, true); cv.setUint16(14, 33, true);
      cv.setUint32(16, crc, true); cv.setUint32(20, bytes.length, true); cv.setUint32(24, bytes.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true);
      directory.push(central, name); directorySize += central.length + name.length;
      offset += header.length + name.length + bytes.length;
    }
    if (offset + directorySize + 22 > 0xffffffff) throw new Error("Das ZIP-Archiv ist zu groß.");
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true); ev.setUint32(12, directorySize, true); ev.setUint32(16, offset, true);
    return new Blob([...parts, ...directory, end], { type: "application/zip" });
  }

  function rename(file, index, prefix, start, digits, separator) {
    const safe = prefix.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/[. ]+$/, "").slice(0, 100) || "Bild";
    const extension = file.name.match(/\.[^.]+$/)?.[0] || "";
    return `${safe}${separator}${String(start + index).padStart(digits, "0")}${extension}`;
  }

  // Gewichtetes k-means auf einem kleinen Farbhistogramm statt auf Millionen Pixeln.
  function palette(data, count) {
    const histogram = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 16) continue;
      const alpha = data[i + 3] / 255;
      const rgb = [0, 1, 2].map(channel => Math.round(data[i + channel] * alpha + 255 * (1 - alpha)));
      const key = (rgb[0] >> 3) << 10 | (rgb[1] >> 3) << 5 | rgb[2] >> 3;
      const item = histogram.get(key) || { sum: [0, 0, 0], weight: 0 };
      item.weight++; rgb.forEach((value, channel) => { item.sum[channel] += value; }); histogram.set(key, item);
    }
    if (!histogram.size) throw new Error("Dieses Bild enthält keine sichtbaren Farben.");
    const points = [...histogram.values()].map(item => ({ rgb: item.sum.map(value => value / item.weight), weight: item.weight })).sort((a, b) => b.weight - a.weight);
    const distance = (a, b) => 2 * (a[0] - b[0]) ** 2 + 4 * (a[1] - b[1]) ** 2 + 3 * (a[2] - b[2]) ** 2;
    const centers = [points[0].rgb.slice()];
    while (centers.length < Math.min(count, points.length)) {
      let best = null, score = 0;
      for (const point of points) {
        const candidate = Math.min(...centers.map(center => distance(point.rgb, center))) * Math.sqrt(point.weight);
        if (candidate > score) { best = point; score = candidate; }
      }
      if (!best || score < 1) break;
      centers.push(best.rgb.slice());
    }
    let buckets;
    for (let iteration = 0; iteration < 18; iteration++) {
      buckets = centers.map(() => ({ sum: [0, 0, 0], weight: 0 }));
      for (const point of points) {
        let nearest = 0;
        for (let i = 1; i < centers.length; i++) if (distance(point.rgb, centers[i]) < distance(point.rgb, centers[nearest])) nearest = i;
        buckets[nearest].weight += point.weight;
        point.rgb.forEach((value, channel) => { buckets[nearest].sum[channel] += value * point.weight; });
      }
      let shift = 0;
      buckets.forEach((bucket, index) => {
        if (!bucket.weight) return;
        const updated = bucket.sum.map(value => value / bucket.weight);
        shift += distance(updated, centers[index]); centers[index] = updated;
      });
      if (shift < .1) break;
    }
    const total = points.reduce((sum, point) => sum + point.weight, 0);
    const result = buckets.filter(bucket => bucket.weight).map(bucket => {
      const rgb = bucket.sum.map(value => Math.round(value / bucket.weight));
      return { rgb, hex: "#" + rgb.map(value => value.toString(16).padStart(2, "0")).join("").toUpperCase(), share: bucket.weight / total };
    });
    return result.sort((a, b) => b.share - a.share);
  }
  function luminance(hex) {
    const rgb = hex.match(/[a-f0-9]{2}/gi).map(part => parseInt(part, 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
  }
  function qr(text, level = "MEDIUM") {
    const { QrCode, QrSegment } = window.QrEncoder;
    if (!text.trim()) throw new Error("Bitte einen Link oder Text eingeben.");
    const bytes = Array.from(encoder.encode(text));
    try { return QrCode.encodeSegments([QrSegment.makeEci(26), QrSegment.makeBytes(bytes)], QrCode.Ecc[level]); }
    catch { throw new Error("Der Inhalt ist für diese Fehlerkorrektur zu lang. Bitte kürzen oder eine niedrigere Stufe wählen."); }
  }
  function qrSvg(code, foreground, background, margin) {
    const size = code.size + margin * 2;
    const paths = [];
    for (let y = 0; y < code.size; y++) for (let x = 0; x < code.size; x++) if (code.getModule(x, y)) paths.push(`M${x + margin},${y + margin}h1v1h-1z`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="${background}"/><path d="${paths.join("")}" fill="${foreground}"/></svg>`;
  }
  return { crc32, zip, rename, palette, luminance, qr, qrSvg };
})();
