/**
 * SQLite → MySQL 迁移脚本
 * 将 db.prepare(sql).all/get/run(params) 模式转换为 await query/execute(sql, [params]) 模式
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
  const original = content;

  // Skip files without db. patterns
  if (!content.includes("db.prepare(") && !content.includes("db.exec(") && !content.includes("db.pragma(")) continue;

  const lines = content.split("\n");
  const newLines: string[] = [];
  let i = 0;

  while (i < lines.length) {
    let line = lines[i];

    // Pattern 1: db.exec(`SQL`) → await execute(`SQL`, [])
    if (line.match(/^\s*db\.exec\(/)) {
      line = line.replace(/db\.exec\(\s*`/, "await execute(`").replace(/db\.exec\(\s*"/, 'await execute("');
      // exec doesn't take params in SQLite, but execute needs [] for MySQL
      if (line.includes("await execute(") && !line.includes(", []") && line.trim().endsWith(");")) {
        line = line.replace(/\);$/, ", []);");
      }
    }

    // Pattern 2: db.pragma(...) → skip (MySQL doesn't have pragmas)
    if (line.match(/^\s*db\.pragma\(/)) {
      i++;
      continue;
    }

    // Pattern 3: Multi-line db.prepare(sql).all/get/run(params)
    // We need to handle both single-line and multi-line patterns

    // Single-line: const result = db.prepare("SQL").all(param1, param2);
    // → const result = await query("SQL", [param1, param2]);
    const singleLineAll = line.match(/^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*db\.prepare\(\s*`([^`]*)`\s*\)\.all\(([^)]*)\);?$/);
    if (singleLineAll) {
      const [, indent, varName, sql, params] = singleLineAll;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}const ${varName} = (await query(\`${sql}\`, ${paramList})).rows;`;
    }

    const singleLineAll2 = line.match(/^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*db\.prepare\(\s*"([^"]*)"\s*\)\.all\(([^)]*)\);?$/);
    if (singleLineAll2) {
      const [, indent, varName, sql, params] = singleLineAll2;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}const ${varName} = (await query("${sql}", ${paramList})).rows;`;
    }

    // Single-line .get()
    const singleLineGet = line.match(/^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*db\.prepare\(\s*`([^`]*)`\s*\)\.get\(([^)]*)\)\s*(?:as\s+\w+)?;?$/);
    if (singleLineGet) {
      const [, indent, varName, sql, params] = singleLineGet;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}const ${varName} = (await query(\`${sql}\`, ${paramList})).rows[0];`;
    }

    const singleLineGet2 = line.match(/^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*db\.prepare\(\s*"([^"]*)"\s*\)\.get\(([^)]*)\)\s*(?:as\s+\w+)?;?$/);
    if (singleLineGet2) {
      const [, indent, varName, sql, params] = singleLineGet2;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}const ${varName} = (await query("${sql}", ${paramList})).rows[0];`;
    }

    // Single-line .run()
    const singleLineRun = line.match(/^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*db\.prepare\(\s*`([^`]*)`\s*\)\.run\(([^)]*)\);?$/);
    if (singleLineRun) {
      const [, indent, varName, sql, params] = singleLineRun;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}const ${varName} = await execute(\`${sql}\`, ${paramList});`;
    }

    const singleLineRun2 = line.match(/^(\s*)(?:const|let|var)\s+(\w+)\s*=\s*db\.prepare\(\s*"([^"]*)"\s*\)\.run\(([^)]*)\);?$/);
    if (singleLineRun2) {
      const [, indent, varName, sql, params] = singleLineRun2;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}const ${varName} = await execute("${sql}", ${paramList});`;
    }

    // Standalone .run() without assignment
    const standaloneRun = line.match(/^(\s*)db\.prepare\(\s*`([^`]*)`\s*\)\.run\(([^)]*)\);?$/);
    if (standaloneRun) {
      const [, indent, sql, params] = standaloneRun;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}await execute(\`${sql}\`, ${paramList});`;
    }

    const standaloneRun2 = line.match(/^(\s*)db\.prepare\(\s*"([^"]*)"\s*\)\.run\(([^)]*)\);?$/);
    if (standaloneRun2) {
      const [, indent, sql, params] = standaloneRun2;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}await execute("${sql}", ${paramList});`;
    }

    // Standalone .all() without assignment (rare)
    const standaloneAll = line.match(/^(\s*)db\.prepare\(\s*`([^`]*)`\s*\)\.all\(([^)]*)\);?$/);
    if (standaloneAll) {
      const [, indent, sql, params] = standaloneAll;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}await query(\`${sql}\`, ${paramList});`;
    }

    // Standalone .get() without assignment (rare)
    const standaloneGet = line.match(/^(\s*)db\.prepare\(\s*`([^`]*)`\s*\)\.get\(([^)]*)\);?$/);
    if (standaloneGet) {
      const [, indent, sql, params] = standaloneGet;
      const paramList = params.trim() ? `[${params}]` : "[]";
      line = `${indent}await query(\`${sql}\`, ${paramList});`;
    }

    // db.prepare(sql).run(...spreadParams) - spread pattern
    const spreadRun = line.match(/^(\s*)db\.prepare\(\s*`([^`]*)`\s*\)\.run\(\s*\.\.\.(\w+)\s*\);?$/);
    if (spreadRun) {
      const [, indent, sql, spreadVar] = spreadRun;
      line = `${indent}await execute(\`${sql}\`, ${spreadVar});`;
    }

    newLines.push(line);
    i++;
  }

  content = newLines.join("\n");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    totalFixed++;
    console.log(`CONVERTED: ${path.relative(SRC_DIR, filePath)}`);
  }
}

console.log(`\nTotal files converted: ${totalFixed}`);
