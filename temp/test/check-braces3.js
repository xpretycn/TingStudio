const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;

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
  
  if (i + 1 >= 3250 && i + 1 <= 3290) {
    const indent = line.match(/^(\s*)/)[1].length;
    const marker = trimmed.startsWith('}') ? ' <-- CLOSING' : '';
    console.log(`${i+1}: [${braceCount}] indent=${indent}${marker} ${line.substring(0, 70)}`);
  }
}

console.log('\nFinal brace count:', braceCount);
