const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('TABLES:', tables.map(t => t.name).join(', '));
const has = tables.find(t => t.name === 'formula_templates');
if (has) {
  const cols = db.prepare("PRAGMA table_info(formula_templates)").all();
  console.log('FORMULA_TEMPLATES COLUMNS:', JSON.stringify(cols, null, 2));
  const cnt = db.prepare("SELECT COUNT(*) as c FROM formula_templates").get();
  console.log('COUNT:', cnt.c);
} else {
  console.log('formula_templates MISSING');
}
db.close();
