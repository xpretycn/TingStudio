const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Create fresh database
const dbPath = './data/tingstudio.db';

// Remove existing files
if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
if (fs.existsSync(dbPath + '-wal')) fs.unlinkSync(dbPath + '-wal');
if (fs.existsSync(dbPath + '-shm')) fs.unlinkSync(dbPath + '-shm');

// Create new database with WAL mode
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Read and execute init SQL
const initSql = fs.readFileSync('./src/scripts/init.sql', 'utf8');
db.exec(initSql);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Database initialized with tables:', tables.map(r => r.name).join(', '));

db.close();
console.log('Database created successfully at', dbPath);
