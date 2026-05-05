import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

async function main() {
  const SQL = await initSqlJs();
  const dbPath = path.join(process.cwd(), 'data', 'tingstudio.db');
  
  let db;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Existing tables:', JSON.stringify(tables));

  const uploadedFilesExists = tables[0]?.values?.some((row: any[]) => row[0] === 'uploaded_files');
  console.log('uploaded_files exists:', uploadedFilesExists);

  if (!uploadedFilesExists) {
    console.log('Creating uploaded_files table...');
    db.exec(`
      CREATE TABLE uploaded_files (
        file_id TEXT PRIMARY KEY,
        original_name TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        mime_type TEXT NOT NULL,
        file_type TEXT NOT NULL CHECK(file_type IN ('formula', 'material')),
        status TEXT NOT NULL DEFAULT 'uploaded' CHECK(status IN ('uploaded', 'parsed', 'linked', 'orphaned', 'archived')),
        related_id TEXT DEFAULT NULL,
        related_type TEXT DEFAULT NULL CHECK(related_type IS NULL OR related_type IN ('formula', 'material')),
        parse_result_json TEXT DEFAULT NULL,
        parse_model TEXT DEFAULT NULL,
        parse_confidence REAL DEFAULT NULL,
        parse_usage_json TEXT DEFAULT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
        last_accessed_at TEXT DEFAULT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_related ON uploaded_files(related_id, related_type);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_type ON uploaded_files(file_type);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_status ON uploaded_files(status);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_by ON uploaded_files(uploaded_by);
      CREATE INDEX IF NOT EXISTS idx_uploaded_files_uploaded_at ON uploaded_files(uploaded_at);
    `);
    console.log('uploaded_files table created successfully');
  }

  const auditLogExists = tables[0]?.values?.some((row: any[]) => row[0] === 'file_audit_log');
  console.log('file_audit_log exists:', auditLogExists);

  if (!auditLogExists) {
    console.log('Creating file_audit_log table...');
    db.exec(`
      CREATE TABLE file_audit_log (
        log_id TEXT PRIMARY KEY,
        file_id TEXT NOT NULL,
        action TEXT NOT NULL CHECK(action IN ('upload', 'parse', 'link', 'unlink', 'reparse', 'download', 'delete', 'archive')),
        operator TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now')),
        detail_json TEXT DEFAULT NULL,
        ip_address TEXT DEFAULT NULL,
        FOREIGN KEY (file_id) REFERENCES uploaded_files(file_id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_file_audit_file ON file_audit_log(file_id);
      CREATE INDEX IF NOT EXISTS idx_file_audit_operator ON file_audit_log(operator);
      CREATE INDEX IF NOT EXISTS idx_file_audit_timestamp ON file_audit_log(timestamp);
    `);
    console.log('file_audit_log table created successfully');
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log('Database saved successfully');

  const verifyTables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables after migration:', JSON.stringify(verifyTables));

  db.close();
}

main().catch(console.error);
