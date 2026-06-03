// 输出每页的内容文字
import { readFileSync } from "fs";
import { inflateSync } from "zlib";

const pdfPath = "d:/Program Data/workspace-codebd/TingStudio/test/pdf-table-test.pdf";
const buf = readFileSync(pdfPath);
const str = buf.toString("latin1");

// 找 ToUnicode CMap 以解码 CID
const cmapStr = str.match(/\/CIDInit\s*\/ProcSet\s*findresource\s*begincidrange[\s\S]*?endcidrange\s*endcmap/);
if (cmapStr) {
  console.log("CMap found, length:", cmapStr[0].length);
  // 找 begincidrange
  const lines = cmapStr[0].split("\n");
  const cmap = new Map();
  for (const line of lines) {
    const m = line.match(/<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>\s+<([0-9A-Fa-f]+)>/);
    if (m) {
      const start = parseInt(m[1], 16);
      const end = parseInt(m[2], 16);
      const unicode = parseInt(m[3], 16);
      for (let i = 0; start + i <= end; i++) {
        cmap.set(start + i, unicode + i);
      }
    }
  }
  console.log("CMap entries:", cmap.size);

  // 找 Page 对象的 Contents
  const pageObjRe = /(\d+)\s+\d+\s+obj\s*<<[^>]*\/Type\s*\/Page[^s][^>]*\/Contents\s*(\d+)\s+\d+\s+R[^>]*>>/g;
  let m;
  let pageNum = 0;
  while ((m = pageObjRe.exec(str)) !== null) {
    pageNum++;
    const contentsRef = m[2];
    const streamRe = new RegExp(`${contentsRef}\\s+\\d+\\s+obj\\s*<<([^>]*)>>\\s*stream\\n([\\s\\S]*?)\\nendstream`);
    const sm = streamRe.exec(str);
    if (!sm) continue;
    const dict = sm[1];
    let data = sm[2];
    if (/Filter\s*\/FlateDecode/.test(dict)) {
      try {
        data = inflateSync(Buffer.from(data, "latin1")).toString("latin1");
      } catch {}
    }
    console.log(`\n=== Page ${pageNum} ===`);
    // 找所有 TJ 数组并解码
    const tjRe = /<([0-9A-Fa-f]+)>/g;
    let tj;
    let allText = "";
    while ((tj = tjRe.exec(data)) !== null) {
      const hex = tj[1];
      let decoded = "";
      for (let i = 0; i < hex.length; i += 4) {
        const cid = parseInt(hex.substr(i, 4), 16);
        const unicode = cmap.get(cid);
        if (unicode) decoded += String.fromCodePoint(unicode);
        else decoded += `[${cid.toString(16).padStart(4, "0")}]`;
      }
      allText += decoded + " | ";
    }
    console.log(allText.substring(0, 2000));
  }
}
