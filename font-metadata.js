"use strict";

// OpenType-Metadaten für echte lokale Familiennamen und Schrifttypen.
// Keine Fontdateien werden hochgeladen. Unbekannte Typen bleiben ausdrücklich unbekannt.
globalThis.KreativFontMetadata = (() => {
  const tag = (view, offset) => String.fromCharCode(...new Uint8Array(view.buffer, view.byteOffset + offset, 4));
  function category(os2, post) {
    if (post?.byteLength >= 16 && new DataView(post).getUint32(12) !== 0) return "monospace";
    if (!os2 || os2.byteLength < 42) return "unknown";
    const v = new DataView(os2), family = v.getUint8(30), kind = v.getUint8(32), serif = v.getUint8(33), proportion = v.getUint8(35);
    if (kind === 2 && proportion === 9) return "monospace";
    if (kind === 3 || family === 10) return "handwriting";
    if (kind === 4 || family === 9) return "display";
    if (kind === 5 || family === 12) return "symbols";
    if (kind === 2 && serif >= 2 && serif <= 10) return "serif";
    if (kind === 2 && serif >= 11 && serif <= 15) return "sans-serif";
    if (family >= 1 && family <= 7) return "serif";
    if (family === 8) return "sans-serif";
    return "unknown";
  }
  function names(buffer) {
    if (!buffer || buffer.byteLength < 6) return {};
    const view = new DataView(buffer), count = view.getUint16(2), start = view.getUint16(4), found = new Map();
    for (let i = 0; i < count; i++) {
      const p = 6 + i * 12; if (p + 12 > buffer.byteLength) break;
      const platform = view.getUint16(p), language = view.getUint16(p + 4), id = view.getUint16(p + 6), length = view.getUint16(p + 8), offset = start + view.getUint16(p + 10);
      if (![1,2,4,6,16,17].includes(id) || offset + length > buffer.byteLength) continue;
      const bytes = new Uint8Array(buffer, offset, length);
      const text = new TextDecoder(platform === 0 || platform === 3 ? "utf-16be" : "windows-1252").decode(bytes).replace(/\0/g, "").trim();
      const score = (platform === 3 ? 4 : platform === 0 ? 3 : 1) + (language === 0x409 ? 2 : 0);
      if (text && (!found.has(id) || found.get(id).score < score)) found.set(id, { text, score });
    }
    return { family: found.get(16)?.text || found.get(1)?.text, fullName: found.get(4)?.text, postscriptName: found.get(6)?.text, style: found.get(17)?.text || found.get(2)?.text || "Regular" };
  }
  async function inspect(buffer) {
    const view = new DataView(buffer); if (view.byteLength < 12) return [];
    const signature = tag(view, 0), offsets = [];
    if (signature === "ttcf") {
      const count = view.getUint32(8); if (count > 1024 || 12 + count * 4 > view.byteLength) return [];
      for (let i=0;i<count;i++) offsets.push(view.getUint32(12+i*4));
    } else offsets.push(0);
    const result = [];
    for (const offset of offsets) {
      if (offset + 12 > view.byteLength || signature === "wOF2") continue;
      const woff = signature === "wOFF", count = view.getUint16(woff ? 12 : offset+4), directory = woff ? 44 : offset+12, stride = woff ? 20 : 16;
      if (count > 512 || directory + count * stride > view.byteLength) continue;
      const tables = new Map();
      for (let i=0;i<count;i++) {
        const p=directory+i*stride, name=tag(view,p);
        if (!["name","OS/2","post"].includes(name)) continue;
        const start=view.getUint32(p+(woff?4:8)), length=view.getUint32(p+(woff?8:12));
        if (start+length>view.byteLength) continue;
        let data=buffer.slice(start,start+length);
        if (woff && length<view.getUint32(p+12)) {
          try { data=await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer(); }
          catch { continue; }
        }
        tables.set(name,data);
      }
      const info=names(tables.get("name")), os2=tables.get("OS/2");
      if (!info.family) continue;
      result.push({ ...info, category:category(os2,tables.get("post")), weight:os2?.byteLength>=6?new DataView(os2).getUint16(4):400, italic:/italic|oblique|kursiv/i.test(info.style) });
    }
    return result;
  }
  return { inspect };
})();
