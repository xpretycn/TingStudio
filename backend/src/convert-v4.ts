/**
 * SQLite → MySQL 转换脚本 v4
 * 处理跨行的 db.prepare(SQL).method(params) 模式
 * 策略：找到 db.prepare( 开始，匹配到对应的 ).method(，然后替换
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
  "services/ai/AIService.ts",
  "services/dbService.ts",
];

let totalFixed = 0;

function findMatchingParen(content: string, startIdx: number): number {
  let depth = 0;
  for (let i = startIdx; i < content.length; i++) {
    if (content[i] === "(") depth++;
    if (content[i] === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function convertFile(filePath: string, relPath: string): void {
  let content = fs.readFileSync(filePath, "utf8");
  if (!content.includes("db.prepare(") && !content.includes("db.exec(")) {
    console.log(`OK: ${relPath}`);
    return;
  }

  const original = content;
  let offset = 0;

  while (true) {
    const idx = content.indexOf("db.prepare(", offset);
    if (idx === -1) break;

    // Find the closing ) of db.prepare(...)
    const prepareOpen = idx + "db.prepare(".length - 1; // index of (
    const prepareClose = findMatchingParen(content, prepareOpen);
    if (prepareClose === -1) {
      offset = idx + 1;
      continue;
    }

    // Extract the SQL argument
    const sqlArg = content.substring(prepareOpen + 1, prepareClose).trim();

    // Check what follows: .all(, .get(, .run(
    const afterClose = content.substring(prepareClose + 1).trimStart();
    let method: string | null = null;
    let methodMatch: RegExpMatchArray | null = null;

    if (afterClose.startsWith(".all(")) {
      method = "all";
      methodMatch = afterClose.match(/^\.all\(/);
    } else if (afterClose.startsWith(".get(")) {
      method = "get";
      methodMatch = afterClose.match(/^\.get\(/);
    } else if (afterClose.startsWith(".run(")) {
      method = "run";
      methodMatch = afterClose.match(/^\.run\(/);
    }

    if (!method || !methodMatch) {
      offset = idx + 1;
      continue;
    }

    // Find the method's closing )
    const methodOpenIdx = prepareClose + 1 + (content.substring(prepareClose + 1).indexOf(methodMatch[0])) + methodMatch[0].length - 1;
    const methodClose = findMatchingParen(content, methodOpenIdx);
    if (methodClose === -1) {
      offset = idx + 1;
      continue;
    }

    // Extract method params
    const methodParams = content.substring(methodOpenIdx + 1, methodClose).trim();

    // Check for trailing 'as Type' after .get()
    let trailingAs = "";
    const afterMethod = content.substring(methodClose + 1);
    const asMatch = afterMethod.match(/^\s*as\s+\w+/);
    if (asMatch && method === "get") {
      trailingAs = asMatch[0];
    }

    // Build replacement
    let replacement: string;
    const paramsStr = methodParams
      ? (methodParams.startsWith("...") ? methodParams.slice(3) : `[${methodParams}]`)
      : "[]";

    if (method === "all") {
      replacement = `(await query(${sqlArg}, ${paramsStr})).rows`;
    } else if (method === "get") {
      replacement = `(await query(${sqlArg}, ${paramsStr})).rows[0]${trailingAs}`;
    } else {
      // run
      replacement = `await execute(${sqlArg}, ${paramsStr})`;
    }

    // Replace the entire db.prepare(...).method(...) with the replacement
    const endIdx = methodClose + 1 + (trailingAs ? trailingAs.length : 0);
    content = content.substring(0, idx) + replacement + content.substring(endIdx);

    offset = idx + replacement.length;
  }

  // Handle db.exec() → await execute()
  content = content.replace(
    /db\.exec\(\s*((?:`[\s\S]*?`|"[^"]*?"|'[^']*?'))\s*\)/g,
    (_match, sql) => `await execute(${sql}, [])`
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

for (const relPath of TARGET_FILES) {
  const filePath = path.join(SRC_DIR, relPath);
  if (!fs.existsSync(filePath)) {
    console.log(`SKIP: ${relPath}`);
    continue;
  }
  convertFile(filePath, relPath);
}

console.log(`\nTotal files converted: ${totalFixed}`);
