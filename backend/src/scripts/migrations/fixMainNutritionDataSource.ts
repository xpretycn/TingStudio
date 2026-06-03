/**
 * 数据修正脚本：修复 material_nutrition 主用值表中 data_source / source_detail 字段
 *
 * 背景：早期 setAuthoritativeFromSources 函数把 data_source 错误地保存为 source_type
 *       （如 'seed'、'excel_import'），把 source_detail 硬编码为"由 N 个字段组合"，
 *       用户看不出真实的数据来源。本脚本基于 field_sources_json 重新提取真实的
 *       "标准数据来源"标识（如《中国食物成分表》v1.0）。
 *
 * 使用：node --import tsx backend/src/scripts/migrations/fixMainNutritionDataSource.ts
 */

import { query, connectDatabase, closeDatabase } from "../../config/database-adapter.js";
import { now } from "../../utils/helpers.js";

type DbRow = Record<string, unknown>;

const FALLBACK_MAP: Record<string, string> = {
  seed: "《中国食物成分表》 v1.0",
  tianapi: "天眼查营养数据",
  excel_import: "Excel 外部数据",
  ai: "AI 估算",
  manual: "手工录入",
};

function extractDataSource(fieldSourcesJson: string | null): string {
  if (!fieldSourcesJson) return "";
  let fieldSources: Record<string, { sourceType: string; sourceDetail: string | null }> = {};
  try {
    fieldSources = JSON.parse(fieldSourcesJson);
  } catch {
    return "";
  }

  const seen = new Set<string>();
  const list: string[] = [];
  for (const fs of Object.values(fieldSources)) {
    if (!fs || seen.has(fs.sourceDetail || "")) continue;
    seen.add(fs.sourceDetail || "");

    const detail = fs.sourceDetail || "";
    const m = detail.match(/《[^》]+》/g);
    if (m && m.length > 0) {
      const std = m[m.length - 1];
      const ver = detail.match(/v\d+(\.\d+)*/i);
      list.push(ver ? `${std} ${ver[0]}` : std);
    } else {
      list.push(FALLBACK_MAP[fs.sourceType] || fs.sourceType);
    }
  }

  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `多源组合：${list.join("、")}`;
}

async function main() {
  await connectDatabase();
  console.log("[Fix] 开始修复 material_nutrition 主用值表 data_source / source_detail");

  const rows = (await query(
    "SELECT nutrition_id, field_sources_json, source_type FROM material_nutrition WHERE is_latest = 1",
  )).rows as DbRow[];

  let updated = 0;
  let unchanged = 0;

  for (const row of rows) {
    const newDataSource = extractDataSource(row.field_sources_json as string | null);
    if (!newDataSource) {
      unchanged++;
      continue;
    }
    if (row.source_type === newDataSource) {
      unchanged++;
      continue;
    }
    await query(
      "UPDATE material_nutrition SET data_source = ?, source_detail = ?, last_updated = ? WHERE nutrition_id = ? AND is_latest = 1",
      [newDataSource, newDataSource, now(), row.nutrition_id],
    );
    updated++;
    console.log(`  ✓ ${row.nutrition_id}: → ${newDataSource}`);
  }

  console.log(`[Fix] 完成：更新 ${updated} 条，跳过 ${unchanged} 条`);
  await closeDatabase();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[Fix] 失败:", err);
    process.exit(1);
  });
