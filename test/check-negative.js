const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let problemFound = false;

for (let i = 0; i < lines.length; i++) {
  if (i + 1 < 961 || i + 1 > 4220) continue;
  
  const line = lines[i];
  
  for (const char of line) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
  }
  
  if (braceCount < 0 && !problemFound) {
    console.log(`First negative brace count at line ${i+1}: ${braceCount}`);
    console.log(`Context (5 lines before):`);
    for (let j = Math.max(0, i-5); j <= i; j++) {
      console.log(`  ${j+1}: ${lines[j]}`);
    }
    problemFound = true;
  }
}

console.log(`Final brace count: ${braceCount}`);
