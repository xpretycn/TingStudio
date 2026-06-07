import 'dotenv/config';
import { config } from './src/config/index.js';
import Database from 'better-sqlite3';
import fs from 'fs';

console.log('Config database path:', config.database.path);
console.log('CWD:', process.cwd());
console.log('File exists:', fs.existsSync(config.database.path));

if (fs.existsSync(config.database.path)) {
  console.log('File size:', fs.statSync(config.database.path).size);
  const bytes = fs.readFileSync(config.database.path);
  console.log('Header:', Buffer.from(bytes.buffer, 0, 16).toString('ascii'));
}

try {
  const db = new Database(config.database.path);
  console.log('Database opened successfully');
  db.pragma('journal_mode = WAL');
  console.log('WAL mode set');
  db.pragma('foreign_keys = ON');
  console.log('Foreign keys enabled');
  db.close();
} catch (e) {
  console.error('Failed:', e.message, e.code);
}
