const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let inString = false;
let stringChar = '';
let braceCount = 0;

for (let i = 0; i < lines.length; i++) {
  if (i + 1 < 961 || i + 1 > 4220) continue;
  
  const line = lines[i];
  let newInString = false;
  let newStringChar = stringChar;
  
  for (let j = 0; j < line.length; j++) {
    const char = line[j];
    const prevChar = j > 0 ? line[j - 1] : '';
    
    if (inString) {
      if (char === newStringChar && prevChar !== '\\') {
        newInString = false;
        newStringChar = '';
      }
    } else {
      if (char === '"' || char === "'") {
        newInString = true;
        newStringChar = char;
      }
    }
  }
  
  if (inString && !newInString) {
    console.log(`String ended at line ${i + 1}: ${line.trim().substring(0, 60)}`);
  }
  if (!inString && newInString) {
    console.log(`String started at line ${i + 1}: ${line.trim().substring(0, 60)}`);
  }
  
  inString = newInString;
  stringChar = newStringChar;
}

if (inString) {
  console.log(`\nWARNING: String never closed! Still in ${stringChar} string`);
}
