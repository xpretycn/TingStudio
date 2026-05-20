const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  for (const char of line) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
  }
  
  if (i + 1 >= 1555 && i + 1 <= 1600) {
    const indent = line.match(/^(\s*)/)[1].length;
    console.log(`${i+1}: [${braceCount}] indent=${indent} ${line.substring(0, 70)}`);
  }
}

console.log('\nFinal brace count:', braceCount);
