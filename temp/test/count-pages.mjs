// 统计 PDF 中实际的页数
import { readFileSync } from "fs";

const pdfPath = "d:/Program Data/workspace-codebd/TingStudio/test/pdf-table-test.pdf";
const buf = readFileSync(pdfPath);
const str = buf.toString("latin1");

// 找 /Type /Page 对象（不是 /Pages）
const pageMatches = str.match(/\/Type\s*\/Page[^s]/g) || [];
const pagesMatches = str.match(/\/Type\s*\/Pages/g) || [];
console.log("/Type /Page objects:", pageMatches.length);
console.log("/Type /Pages objects:", pagesMatches.length);

// 看 /Pages 对象的 Kids
const pagesObj = str.match(/\/Type\s*\/Pages\s*<<[^>]*>>/);
if (pagesObj) {
  const kidsMatch = pagesObj[0].match(/\/Kids\s*\[([^\]]*)\]/);
  if (kidsMatch) {
    const kids = kidsMatch[1].split(/\s+/).filter(s => s.endsWith("R"));
    console.log("Kids references:", kids.length, kids);
  }
}
