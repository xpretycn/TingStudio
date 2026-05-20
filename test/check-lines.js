const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

for (let i = 4213; i <= 4225; i++) {
  const line = lines[i];
  const spaces = line.match(/^(\s*)/)[1].length;
  const braces = (line.match(/[{}]/g) || []).join('');
  console.log(`${i+1}: spaces=${spaces} braces='${braces}' | ${line}`);
}
