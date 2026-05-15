import { getDb, connectDatabase } from "../../config/database-better-sqlite3.js";

connectDatabase();

function fixGarbledText(text: string): string {
  if (!text) return text;
  try {
    const fixed = Buffer.from(text, "latin1").toString("utf8");
    const hasChinese = /[\u4e00-\u9fff]/.test(fixed);
    if (!hasChinese || fixed === text) return text;

    let result = fixed.replace(/\ufffd/g, "");

    const colonIdx = result.indexOf(": ");
    if (colonIdx > 0 && colonIdx < 20) {
      const afterColon = result.substring(colonIdx + 2);
      if (/[\u4e00-\u9fff]/.test(afterColon)) {
        const prefix = result.substring(0, colonIdx);
        if (!/[\u4e00-\u9fff]/.test(prefix)) {
          const knownPrefixes = ["解析配方文件", "解析原料营养文件", "Agent对话", "智能查询"];
          const matched = knownPrefixes.find((p) => text.startsWith(p.substring(0, 2)));
          if (matched) {
            result = matched + ": " + afterColon;
          } else {
            result = afterColon;
          }
        }
      }
    }

    return result;
  } catch {
    return text;
  }
}

function fixResidualPrefix(text: string): string {
  if (!text) return text;
  const residualPatterns: { pattern: RegExp; replacement: string }[] = [
    { pattern: /^M:\s*/, replacement: "解析配方文件: " },
    { pattern: /^[㐟]%\{:\s*/, replacement: "解析原料营养文件: " },
  ];
  for (const { pattern, replacement } of residualPatterns) {
    if (pattern.test(text)) {
      return text.replace(pattern, replacement);
    }
  }
  return text;
}

function isGarbled(text: string): boolean {
  if (!text) return false;
  const fixed = fixGarbledText(text);
  if (fixed === text) return false;
  return /[\u4e00-\u9fff]/.test(fixed);
}

function needsFix(text: string): boolean {
  if (!text) return false;
  if (isGarbled(text)) return true;
  if (fixResidualPrefix(text) !== text) return true;
  return false;
}

async function migrateFixGarbledSummary() {
  console.log("开始迁移：修复 ai_usage_logs 中 request_summary 的中文乱码...");

  try {
    const db = getDb();

    const rows = db
      .prepare(
        `SELECT id, request_summary FROM ai_usage_logs WHERE request_summary IS NOT NULL AND request_summary != ''`
      )
      .all() as any[];

    console.log(`找到 ${rows.length} 条含 request_summary 的记录`);

    const updateStmt = db.prepare(
      `UPDATE ai_usage_logs SET request_summary = ? WHERE id = ?`
    );

    const fixMany = db.transaction((items: { id: string; fixed: string }[]) => {
      for (const item of items) {
        updateStmt.run(item.fixed, item.id);
      }
    });

    const toFix: { id: string; fixed: string }[] = [];

    for (const row of rows) {
      let fixed = row.request_summary;
      if (isGarbled(row.request_summary)) {
        fixed = fixGarbledText(row.request_summary);
      }
      fixed = fixResidualPrefix(fixed);
      if (fixed !== row.request_summary) {
        toFix.push({ id: row.id, fixed });
        console.log(`  修复: "${row.request_summary}"`);
        console.log(`    → "${fixed}"`);
      }
    }

    if (toFix.length > 0) {
      fixMany(toFix);
      console.log(`✓ 成功修复 ${toFix.length} 条乱码记录`);
    } else {
      console.log("✓ 无需修复，所有记录编码正常");
    }
  } catch (error: any) {
    console.error("✗ 迁移失败:", error.message);
    throw error;
  }
}

migrateFixGarbledSummary()
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err) => {
    console.error("迁移失败:", err);
    process.exit(1);
  });
