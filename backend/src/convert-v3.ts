/**
 * SQLite → MySQL 转换脚本 v3
 * 处理 db.prepare(sql).all(...params) 和 db.prepare(sql).run(...params) 的 spread 模式
 * 以及 db.prepare(sql, params).method() 的错误模式
 */
import fs from "fs";
import path from "path";

const SRC_DIR = path.resolve(import.meta.dirname);

const TARGET_FILES = [
  "controllers/modelController.ts",
  "controllers/parseResultController.ts",
  "controllers/aiController.ts",
  "services/ai/ModelHealthChecker.ts",
  "services/ai/agent/toolRegistration.ts",
  "services/business/salespersonService.ts",
  "services/business/salesAnalysisService.ts",
  "services/parseResultMonitoringService.ts",
  "services/parseResultCleanupService.ts",
  "services/ai/AIService.ts",
];

let totalFixed = 0;

for (const relPath of TARGET_FILES) {
  const filePath = path.join(SRC_DIR, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${relPath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("db.prepare(") && !content.includes("db.exec(")) {
    console.log(`OK (no db.prepare): ${relPath}`);
    continue;
  }

  const original = content;

  // Pattern: db.prepare(sql).all(...params) → (await query(sql, params)).rows
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.all\(\s*\.\.\.(\w+)\s*\)/g,
    (_match, sql, spreadVar) => {
      return `(await query(${sql}, ${spreadVar})).rows`;
    }
  );

  // Pattern: db.prepare(sql).get(...params) → (await query(sql, params)).rows[0]
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.get\(\s*\.\.\.(\w+)\s*\)/g,
    (_match, sql, spreadVar) => {
      return `(await query(${sql}, ${spreadVar})).rows[0]`;
    }
  );

  // Pattern: db.prepare(sql).run(...params) → await execute(sql, params)
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.run\(\s*\.\.\.(\w+)\s*\)/g,
    (_match, sql, spreadVar) => {
      return `await execute(${sql}, ${spreadVar})`;
    }
  );

  // Pattern: db.prepare(sql).all() with no params → (await query(sql, [])).rows
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.all\(\s*\)/g,
    (_match, sql) => {
      return `(await query(${sql}, [])).rows`;
    }
  );

  // Pattern: db.prepare(sql).get() with no params → (await query(sql, [])).rows[0]
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.get\(\s*\)/g,
    (_match, sql) => {
      return `(await query(${sql}, [])).rows[0]`;
    }
  );

  // Pattern: db.prepare(sql).run() with no params → await execute(sql, [])
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.run\(\s*\)/g,
    (_match, sql) => {
      return `await execute(${sql}, [])`;
    }
  );

  // Pattern: db.prepare(sql).all(param1, param2, ...) with inline params
  // Already handled by v2, but catch any remaining
  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.all\(([^)]*)\)/g,
    (_match, sql, params) => {
      const p = params.trim();
      return `(await query(${sql}, ${p ? `[${p}]` : "[]"})).rows`;
    }
  );

  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.get\(([^)]*)\)/g,
    (_match, sql, params) => {
      const p = params.trim();
      return `(await query(${sql}, ${p ? `[${p}]` : "[]"})).rows[0]`;
    }
  );

  content = content.replace(
    /db\.prepare\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)\.run\(([^)]*)\)/g,
    (_match, sql, params) => {
      const p = params.trim();
      return `await execute(${sql}, ${p ? `[${p}]` : "[]"})`;
    }
  );

  // Handle db.exec() → await execute()
  content = content.replace(
    /db\.exec\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)/g,
    (_match, sql) => {
      return `await execute(${sql}, [])`;
    }
  );

  // Remove db.pragma() calls
  content = content.replace(/\s*db\.pragma\([^)]*\);?\n?/g, "\n");

  // Fix datetime('now') → CURRENT_TIMESTAMP
  content = content.replace(/datetime\('now'\)/g, "CURRENT_TIMESTAMP");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    totalFixed++;
    console.log(`CONVERTED: ${relPath}`);
  } else {
    console.log(`NO CHANGE: ${relPath}`);
  }
}

console.log(`\nTotal files converted: ${totalFixed}`);
