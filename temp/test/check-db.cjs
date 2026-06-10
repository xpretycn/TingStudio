const Database = require('better-sqlite3');
const path = require('path');
const dbPath = 'd:\\Program Data\\workspace-codebd\\TingStudio\\backend\\data\\tingstudio.db';
const db = new Database(dbPath);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('TABLES:', JSON.stringify(tables.map(t => t.name), null, 2));
const templateTable = tables.find(t => t.name === 'formula_templates');
if (templateTable) {
  const cols = db.prepare("PRAGMA table_info(formula_templates)").all();
  console.log('COLUMNS:', JSON.stringify(cols, null, 2));
  const count = db.prepare("SELECT COUNT(*) as cnt FROM formula_templates").get();
  console.log('COUNT:', count.cnt);
} else {
  console.log('formula_templates table does NOT exist');
}
db.close();
