const Database = require('d:/ProgramData/workspace-codeby/ting-studio/backend/node_modules/better-sqlite3');
const db = new Database('d:/ProgramData/workspace-codeby/ting-studio/backend/data/tingstudio.db');
db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = ON');
const r = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
console.log('Tables:', r.length);
db.close();
console.log('DB test passed');
