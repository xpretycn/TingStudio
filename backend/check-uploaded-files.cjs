const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "data", "tingstudio.db");
const db = new Database(dbPath);

console.log("uploaded_files table schema:");
const schema = db.prepare("PRAGMA table_info(uploaded_files)").all();
schema.forEach(col => {
  console.log(`- ${col.name} (${col.type})`);
});

console.log("\nTesting simple SELECT:");
try {
  const test = db.prepare("SELECT file_id, original_name FROM uploaded_files LIMIT 1").all();
  console.log("✓ Simple SELECT OK, rows:", test.length);
} catch (e) {
  console.error("✗ Simple SELECT failed:", e.message);
}

console.log("\nTesting JOIN SELECT:");
try {
  const test2 = db.prepare(`
    SELECT uf.file_id, uf.original_name, u.username as uploaded_by_name
    FROM uploaded_files uf
    LEFT JOIN users u ON uf.uploaded_by = u.id
    LIMIT 1
  `).all();
  console.log("✓ JOIN SELECT OK, rows:", test2.length);
} catch (e) {
  console.error("✗ JOIN SELECT failed:", e.message);
}

console.log("\nTesting full SELECT:");
try {
  const test3 = db.prepare(`
    SELECT uf.*, u.username as uploaded_by_name,
      CASE
        WHEN uf.related_type = 'formula' THEN f.name
        WHEN uf.related_type = 'material' THEN m.name
        ELSE NULL
      END as related_name
     FROM uploaded_files uf
     LEFT JOIN users u ON uf.uploaded_by = u.id
     LEFT JOIN formulas f ON uf.related_id = f.id AND uf.related_type = 'formula'
     LEFT JOIN materials m ON uf.related_id = m.id AND uf.related_type = 'material'
     WHERE 1=1
     ORDER BY uf.uploaded_at DESC
     LIMIT 20 OFFSET 0
  `).all();
  console.log("✓ Full SELECT OK, rows:", test3.length);
} catch (e) {
  console.error("✗ Full SELECT failed:", e.message);
}

db.close();
