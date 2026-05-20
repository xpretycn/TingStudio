const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let indent = 0;

for (let i = 0; i < lines.length; i++) {
  if (i + 1 < 961 || i + 1 > 4220) continue;
  
  const line = lines[i];
  const spaces = line.match(/^(\s*)/)[1].length;
  const trimmed = line.trim();
  
  let braceChange = 0;
  for (const char of line) {
    if (char === '{') {
      braceCount++;
      braceChange++;
    }
    else if (char === '}') {
      braceCount--;
      braceChange--;
    }
  }
  
  // Track indent level
  if (braceChange > 0) indent = spaces;
  else if (braceChange < 0) {
    // Closing brace - check if it's at a different indent
  }
  
  // Print important changes
  if (spaces === 0 && trimmed !== '' && !trimmed.startsWith('//')) {
    console.log(`${i+1}: [${braceCount}] spaces=0 indent=0 | ${trimmed.substring(0, 60)}`);
  }
  
  // Print lines with significant content
  if ((spaces === 0 || braceCount > 5) && trimmed !== '' && !trimmed.startsWith('//')) {
    if (spaces === 0) {
      console.log(`${i+1}: [${braceCount}] spaces=0 | ${trimmed.substring(0, 60)}`);
    }
  }
}
