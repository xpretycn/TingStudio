import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'tingstudio.db');

console.log('Database path:', dbPath);
console.log('File exists:', fs.existsSync(dbPath));
console.log('File size:', fs.statSync(dbPath).size);

try {
  const db = new Database(dbPath);
  console.log('Database opened successfully');
  
  try {
    db.pragma('journal_mode = WAL');
    console.log('WAL mode set');
  } catch (e) {
    console.error('WAL mode failed:', e.message);
  }
  
  db.pragma('foreign_keys = ON');
  console.log('Foreign keys enabled');
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables:', tables.map(r => r.name).join(', '));
  
  db.close();
  console.log('Database closed');
} catch (e) {
  console.error('Failed to open database:', e.message);
}
