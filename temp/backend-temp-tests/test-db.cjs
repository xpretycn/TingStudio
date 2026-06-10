const Database = require('better-sqlite3');

// Test 1: Create fresh DB with WAL mode
try {
  const db = new Database('./data/tingstudio.db');
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('WAL mode works! Tables:', tables.map(r => r.name).join(', '));
  db.close();
} catch (e) {
  console.error('WAL mode failed:', e.message);
  // Try DELETE mode
  try {
    const fs = require('fs');
    if (fs.existsSync('./data/tingstudio.db')) fs.unlinkSync('./data/tingstudio.db');
    if (fs.existsSync('./data/tingstudio.db-wal')) fs.unlinkSync('./data/tingstudio.db-wal');
    if (fs.existsSync('./data/tingstudio.db-shm')) fs.unlinkSync('./data/tingstudio.db-shm');
    const db2 = new Database('./data/tingstudio.db');
    db2.pragma('journal_mode = DELETE');
    db2.pragma('foreign_keys = ON');
    console.log('DELETE mode works!');
    db2.close();
  } catch (e2) {
    console.error('DELETE mode also failed:', e2.message);
  }
}
