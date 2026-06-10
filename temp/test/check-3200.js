const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let indent = 0;

for (let i = 3190; i <= 3300; i++) {
  const line = lines[i];
  if (!line) continue;
  
  const trimmed = line.trim();
  const spaces = line.match(/^(\s*)/)[1].length;
  
  let changes = '';
  for (const char of line) {
    if (char === '{') {
      braceCount++;
      changes += '{';
    }
    else if (char === '}') {
      braceCount--;
      changes += '}';
    }
  }
  
  if (changes) {
    console.log(`${i+1}: [${braceCount}] spaces=${spaces} ${changes} | ${trimmed.substring(0, 60)}`);
  } else if (trimmed.startsWith('//') || trimmed.length === 0) {
    // Skip comments and empty lines
  } else {
    console.log(`${i+1}: [${braceCount}] spaces=${spaces}     | ${trimmed.substring(0, 60)}`);
  }
}
