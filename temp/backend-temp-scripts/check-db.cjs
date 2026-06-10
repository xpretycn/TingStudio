const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "data", "tingstudio.db");
console.log("DB path:", dbPath);

if (!fs.existsSync(dbPath)) {
  console.log("DB file does NOT exist!");
} else {
  console.log("DB file exists, size:", fs.statSync(dbPath).size, "bytes");
}

try {
  const db = new Database(dbPath);
  console.log("DB opened successfully!");
  
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log("\nTables in DB:");
  tables.forEach(t => console.log("-", t.name));
  
  const hasFormulaTemplates = tables.some(t => t.name === "formula_templates");
  console.log("\nHas formula_templates?", hasFormulaTemplates ? "YES" : "NO");
  
  const hasUploadedFiles = tables.some(t => t.name === "uploaded_files");
  console.log("Has uploaded_files?", hasUploadedFiles ? "YES" : "NO");
  
  db.close();
} catch (e) {
  console.error("DB error:", e.message);
}
