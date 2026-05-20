const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let inStyle = false;
let styleStart = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('<style') || line.includes('</style>')) {
    console.log(`${i+1}: STYLE TAG: ${line.trim().substring(0, 80)}`);
    if (line.includes('<style') && !inStyle) {
      inStyle = true;
      styleStart = i + 1;
    }
    if (line.includes('</style>')) {
      inStyle = false;
      console.log(`\nStyle block ended at line ${i+1}, braceCount=${braceCount}`);
    }
    continue;
  }
  
  if (!inStyle) continue;
  
  for (const char of line) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
  }
  
  if (braceCount < 0) {
    console.log(`\nERROR NEGATIVE at line ${i+1}: braceCount=${braceCount}`);
    console.log(`  Line: ${line}`);
    console.log(`  Context (10 lines before):`);
    for (let j = Math.max(0, i-10); j <= i; j++) {
      console.log(`  ${j+1}: ${lines[j]}`);
    }
    break;
  }
}

console.log(`\nFinal brace count after style end: ${braceCount}`);
