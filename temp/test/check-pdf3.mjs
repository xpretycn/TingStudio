// 直接检查 PDF 中所有文本流
import { readFileSync } from "fs";
import { inflateSync } from "zlib";

const pdfPath = "d:/Program Data/workspace-codebd/TingStudio/test/pdf-table-test.pdf";
const buf = readFileSync(pdfPath);
const str = buf.toString("latin1");

// 找 Page 对象
const pageMatches = str.match(/\/Type\s*\/Page[^s]/g) || [];
console.log("Page objects:", pageMatches.length);

// 找每个 Page 的 Contents 引用
const pageObjRe = /(\d+)\s+\d+\s+obj\s*<<[^>]*\/Type\s*\/Page[^s][^>]*\/Contents\s*(\d+)\s+\d+\s+R[^>]*>>/g;
let m;
const pages = [];
while ((m = pageObjRe.exec(str)) !== null) {
  pages.push({ pageNum: m[1], contentsRef: m[2] });
}
console.log("Pages with content:", pages);

// 找每个 Contents stream 并提取
for (const p of pages) {
  console.log(`\n=== Page ${p.pageNum}, Contents ref ${p.contentsRef} ===`);
  // 找 stream 对象
  const streamRe = new RegExp(`${p.contentsRef}\\s+\\d+\\s+obj\\s*<<([^>]*)>>\\s*stream\\n([\\s\\S]*?)\\nendstream`);
  const sm = streamRe.exec(str);
  if (!sm) {
    console.log("  (no stream found)");
    continue;
  }
  const dict = sm[1];
  let data = sm[2];
  // 检查是否压缩
  if (/Filter\s*\/FlateDecode/.test(dict)) {
    try {
      const compressed = Buffer.from(data, "latin1");
      data = inflateSync(compressed).toString("latin1");
    } catch (e) {
      console.log("  (decompression failed:", e.message, ")");
    }
  }
  // 提取所有 Tj/TJ 文本
  const tjAll = data.match(/\(((?:\\.|[^()\\])*)\)\s*Tj/g) || [];
  const tjArrays = data.match(/\[\s*((?:\\.|[^\[\]\\])*)\s*\]\s*TJ/g) || [];
  console.log("  Tj strings:", tjAll.length);
  console.log("  TJ arrays:", tjArrays.length);
  for (const t of [...tjAll, ...tjArrays].slice(0, 20)) {
    console.log("    ", t.slice(0, 120));
  }
  // 找 rect
  const rects = data.match(/\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*\s+\d+\.?\d*\s+re/g) || [];
  console.log("  Rects:", rects.length);
}
