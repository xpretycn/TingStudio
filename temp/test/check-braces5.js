const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let lastBraceCount = 0;
let depthStack = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (i + 1 < 960 || i + 1 > 4220) continue;
  
  const trimmed = line.trim();
  
  for (const char of line) {
    if (char === '{') {
      braceCount++;
      depthStack.push({ line: i + 1, text: trimmed.substring(0, 40) });
    }
    else if (char === '}') {
      braceCount--;
      if (depthStack.length > 0) {
        const opened = depthStack.pop();
        if (braceCount < 0) {
          console.log(`MISMATCH at line ${i+1}:`);
          console.log(`  Closing } but stack has:`);
          depthStack.forEach((item, idx) => console.log(`    ${idx}: line ${item.line} - ${item.text}`));
        }
      }
    }
  }
  
  if (i + 1 >= 4100 && i + 1 <= 4225) {
    const indent = line.match(/^(\s*)/)[1].length;
    const marker = braceCount < lastBraceCount ? ' <-- CLOSED' : (braceCount > lastBraceCount ? ' <-- OPENED' : '');
    console.log(`${i+1}: [${braceCount}] indent=${indent}${marker} ${trimmed.substring(0, 70)}`);
  }
  
  lastBraceCount = braceCount;
}

console.log(`\nFinal brace count: ${braceCount}`);
console.log(`Unclosed blocks remaining: ${depthStack.length}`);
depthStack.forEach(item => console.log(`  line ${item.line}: ${item.text}`));
