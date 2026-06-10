// 提取 PDF 中所有 rect 的 y 坐标
import { readFileSync } from "fs";
import { inflateSync } from "zlib";

const pdfPath = "d:/Program Data/workspace-codebd/TingStudio/test/pdf-table-test.pdf";
const buf = readFileSync(pdfPath);
const str = buf.toString("latin1");

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
  // 找所有 re 操作（矩形）：x y w h re
  const reMatches = data.match(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+re/g) || [];
  const ys = reMatches.map(r => {
    const parts = r.split(/\s+/);
    return parseFloat(parts[1]);
  }).sort((a, b) => b - a);
  console.log(`  Total rects: ${reMatches.length}`);
  console.log(`  Y range: ${Math.max(...ys).toFixed(1)} - ${Math.min(...ys).toFixed(1)}`);
  console.log(`  Top 10 y values: ${ys.slice(0, 10).map(y => y.toFixed(1)).join(", ")}`);
  console.log(`  Bottom 10 y values: ${ys.slice(-10).map(y => y.toFixed(1)).join(", ")}`);
}
