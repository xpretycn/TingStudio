// 提取每页所有 rect 的 y 坐标分布
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
  // 找所有 re 操作
  const reMatches = data.match(/(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+(-?\d+\.?\d*)\s+re/g) || [];
  const ys = reMatches.map(r => parseFloat(r.split(/\s+/)[1]));
  // 统计每个 y 值的 rect 数量
  const dist = {};
  for (const y of ys) {
    const key = y.toFixed(0);
    dist[key] = (dist[key] || 0) + 1;
  }
  console.log("Y distribution (top 20):");
  const entries = Object.entries(dist).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  for (const [y, count] of entries.slice(0, 30)) {
    console.log(`  y=${y}: ${count} rects`);
  }
}
