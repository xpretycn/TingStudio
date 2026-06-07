import Database from 'better-sqlite3';
const dbPath = './data/tingstudio.db';
const db = new Database(dbPath);
db.pragma('journal_mode = DELETE');
const r = db.prepare("SELECT count(*) as c FROM users").all();
console.log('tsx Users:', r[0].c);
db.close();
