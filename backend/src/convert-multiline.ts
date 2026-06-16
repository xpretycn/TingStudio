/**
 * SQLite → MySQL 多行转换脚本 v2
 * 处理多行 db.prepare(sql).all/get/run(params) 模式
 */
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
    } else if (entry.isFile() && fullPath.endsWith(".ts") && !fullPath.endsWith(".d.ts") && !fullPath.endsWith("fix-imports.ts") && !fullPath.endsWith("migrate-db.ts") && !fullPath.endsWith("convert-db-calls.ts")) {
      results.push(fullPath);
    }
  }
  return results;
}

// Target files - controllers and services only
const TARGET_DIRS = ["controllers", "services", "routes", "scripts", "utils"];

const allFiles = walkDir(SRC_DIR).filter(f => {
  const rel = path.relative(SRC_DIR, f);
  return TARGET_DIRS.some(d => rel.startsWith(d + path.sep) || rel.startsWith(d + "/"));
});

let totalFixed = 0;

for (const filePath of allFiles) {
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("db.prepare(") && !content.includes("db.exec(") && !content.includes("db.pragma(")) continue;

  const original = content;

  // Strategy: replace db.prepare() patterns using regex with DOTALL
  // Pattern: db.prepare(`...multi-line SQL...`).method(params)

  // 1. db.prepare(`SQL`).all(param1, param2) → (await query(`SQL`, [param1, param2])).rows
  // 2. db.prepare(`SQL`).get(param1) → (await query(`SQL`, [param1])).rows[0]
  // 3. db.prepare(`SQL`).run(param1, param2) → await execute(`SQL`, [param1, param2])

  // Handle .all() with backtick SQL
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.all\(([^)]*)\)/g,
    (_match, sql, params) => {
      const p = params.trim();
      return `(await query(${sql}, ${p ? `[${p}]` : "[]"})).rows`;
    }
  );

  // Handle .get() with backtick SQL
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.get\(([^)]*)\)/g,
    (_match, sql, params) => {
      const p = params.trim();
      return `(await query(${sql}, ${p ? `[${p}]` : "[]"})).rows[0]`;
    }
  );

  // Handle .run() with backtick SQL
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.run\(([^)]*)\)/g,
    (_match, sql, params) => {
      const p = params.trim();
      return `await execute(${sql}, ${p ? `[${p}]` : "[]"})`;
    }
  );

  // Handle db.exec(`SQL`) → await execute(`SQL`, [])
  content = content.replace(
    /db\.exec\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)/g,
    (_match, sql) => {
      return `await execute(${sql}, [])`;
    }
  );

  // Remove db.pragma() calls entirely
  content = content.replace(/\s*db\.pragma\([^)]*\);?\n?/g, "\n");

  // Fix datetime('now') → CURRENT_TIMESTAMP in SQL strings
  content = content.replace(/datetime\('now'\)/g, "CURRENT_TIMESTAMP");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    totalFixed++;
    console.log(`CONVERTED: ${path.relative(SRC_DIR, filePath)}`);
  }
}

console.log(`\nTotal files converted: ${totalFixed}`);
