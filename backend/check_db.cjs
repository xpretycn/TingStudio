const Database = require('better-sqlite3');
const db = new Database('data/tingstudio.db');
console.log('formula_templates exists:', !!db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='formula_templates'").get());
console.log('migrations:', db.prepare('SELECT * FROM schema_migrations ORDER BY version').all());
