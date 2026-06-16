import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(import.meta.dirname);

function walkDir(dir: string): string[] {
  const results: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts") && !fullPath.endsWith("fix-imports.ts") && !fullPath.endsWith("migrate-db.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = walkDir(SRC_DIR);
let totalFixed = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, "utf8");
  let changed = false;

  // Skip files that don't have getDb or database-better-sqlite3 references
  if (!content.includes("getDb") && !content.includes("database-better-sqlite3") && !content.includes("better-sqlite3")) continue;

  // 1. Remove `import Database from "better-sqlite3"` lines
  if (content.includes('import Database from "better-sqlite3"')) {
    content = content.replace(/import Database from "better-sqlite3";?\n?/g, "");
    changed = true;
  }

  // 2. Remove `import { getDb, ... } from "../config/database-better-sqlite3.js"` (already handled but double-check)
  if (content.includes("database-better-sqlite3")) {
    content = content.replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]*database-better-sqlite3\.js['"];?\n?/g, "");
    content = content.replace(/const\s*\{[^}]*\}\s*=\s*await\s*import\s*\(['"][^'"]*database-better-sqlite3\.js['"]\);?\n?/g, "");
    changed = true;
  }

  // 3. Replace `const db = getDb();` patterns
  content = content.replace(/const db = getDb\(\);?\n?/g, "");
  if (!content.includes("const db = getDb()")) changed = true;

  // 4. Replace `db.prepare(sql).all(params)` → `await query(sql, [params])`
  // Pattern: db.prepare(`...`).all(param1, param2) or db.prepare("...").all(param)
  // This is complex - we'll do simpler replacements

  // 5. Replace `db.prepare(sql).get(params)` → `(await query(sql, [params])).rows[0]`
  // 6. Replace `db.prepare(sql).run(params)` → `await execute(sql, [params])`

  // For now, just log files that still have getDb() calls
  if (content.includes("getDb()")) {
    console.log(`STILL HAS getDb(): ${path.relative(SRC_DIR, filePath)}`);
  }

  if (changed) {
    fs.writeFileSync(filePath, content, "utf8");
    totalFixed++;
    console.log(`CLEANED: ${path.relative(SRC_DIR, filePath)}`);
  }
}

console.log(`\nTotal files cleaned: ${totalFixed}`);
