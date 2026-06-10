const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '..', 'frontend', 'src', 'views', 'ai', 'AiWorkspace.vue');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace ALL occurrences
content = content.replace(/box-shadow: 0 0 0 3px rgba\(16, 185, 129, 0\.1\);/g, 'box-shadow: 0 0 0 3px var(--color-primary-bg);');
content = content.replace(/background: #cbd5e1;/g, 'background: var(--color-border);');
content = content.replace(/background: #f0fdf4;/g, 'background: var(--color-bg-hover);');
content = content.replace(/border-color: #cbd5e1;/g, 'border-color: var(--color-border-dark);');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done');
