const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let lastBraceCount = braceCount;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  
  for (const char of line) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
  }
  
  if (braceCount < 0) {
    console.log(`ERROR NEGATIVE at line ${i+1}: braceCount=${braceCount}`);
    console.log(`  Line: ${line}`);
    break;
  }
  
  if (i + 1 >= 1555 && i + 1 <= 1600) {
    const indent = line.match(/^(\s*)/)[1].length;
    const marker = braceCount < lastBraceCount ? ' <-- CLOSED' : (braceCount > lastBraceCount ? ' <-- OPENED' : '');
    console.log(`${i+1}: [${braceCount}] indent=${indent} ${marker} ${line.substring(0, 70)}`);
  }
  
  lastBraceCount = braceCount;
}

console.log('\nFinal brace count:', braceCount);
