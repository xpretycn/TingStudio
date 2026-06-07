import "dotenv/config";
import Database from 'better-sqlite3';
import { config } from './src/config/index.js';

console.log('DB path:', config.database.path);
console.log('DB type:', config.database.type);

const db = new Database(config.database.path);
db.pragma('journal_mode = DELETE');
db.pragma('foreign_keys = ON');
const r = db.prepare("SELECT count(*) as c FROM users").all();
console.log('Users:', r[0].c);
db.close();
console.log('SUCCESS');
