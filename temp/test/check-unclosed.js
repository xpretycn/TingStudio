const fs = require('fs');
const content = fs.readFileSync('d:/Program Data/workspace-codebd/TingStudio/frontend/src/views/formulas/FormulaForm.vue', 'utf8');
const lines = content.split('\n');

let braceCount = 0;
let openBlocks = [];
let closeBlocks = [];

for (let i = 0; i < lines.length; i++) {
  if (i + 1 < 961 || i + 1 > 4220) continue;
  
  const line = lines[i];
  const trimmed = line.trim();
  
  for (const char of line) {
    if (char === '{') {
      braceCount++;
      openBlocks.push({ line: i + 1, text: trimmed.substring(0, 50), count: braceCount });
    }
    else if (char === '}') {
      braceCount--;
      if (openBlocks.length > 0) {
        const opened = openBlocks.pop();
        closeBlocks.push({ line: i + 1, text: opened.text, openedAt: opened.line });
      }
    }
  }
}

console.log('Unclosed blocks (opened but never closed):');
openBlocks.forEach(item => {
  console.log(`  Line ${item.line}: ${item.text} (count=${item.count})`);
});

console.log('\nLast 10 opened blocks:');
openBlocks.slice(-10).forEach(item => {
  console.log(`  Line ${item.line}: ${item.text}`);
});

console.log('\nFinal brace count:', braceCount);
