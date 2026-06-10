import Database from 'better-sqlite3';
const db = new Database('d:/ProgramData/workspace-codeby/ting-studio/backend/data/tingstudio.db');
db.pragma('journal_mode = DELETE');
const r = db.prepare("SELECT count(*) as c FROM users").all();
console.log('tsx Users:', r[0].c);
db.close();
