import { connectDatabase, query, closeDatabase } from "../config/database.js";
import { generateMaterialCode } from "../utils/helpers.js";

async function fixAllMaterialCodes() {
  console.log("════════════════════════════════════════════════════════");
  console.log(" 原料编码全面修复 — 批量修正所有 MAT### 格式");
  console.log("════════════════════════════════════════════════════════\n");

  await connectDatabase();

  const [badRows]: any[] = await query(
    "SELECT id, name, code, data_source FROM materials WHERE code LIKE 'MAT%' ORDER BY name",
  );
  console.log(`发现 ${badRows.length} 条 MAT### 记录\n`);

  let deletedCount = 0;
  let updatedCount = 0;
  let migratedFormulaCount = 0;
  const errors: string[] = [];

  for (const bad of badRows) {
    const newCode = generateMaterialCode(bad.name);
    console.log(`[${bad.code}] ${bad.name} → ${newCode}`);

    // 检查同名非 MAT 记录
    const [duplicates]: any[] = await query(
      "SELECT id, name, code FROM materials WHERE name = ? AND code NOT LIKE 'MAT%'",
      [bad.name],
    );

    if (duplicates.length > 0) {
      const good = duplicates[0];
      console.log(`  ⚠ 重复存在: ${good.id} (${good.code})`);

      // 搜索 formula_versions.snapshot_json 中引用了 bad.id 的记录
      const [versions]: any[] = await query(
        "SELECT version_id, formula_id, snapshot_json FROM formula_versions WHERE snapshot_json LIKE ?",
        [`%"${bad.id}"%`],
      );

      for (const v of versions) {
        let snapshot: any;
        try {
          snapshot = JSON.parse(v.snapshot_json);
        } catch {
          continue;
        }
        let changed = false;

        // 替换 ingredients 中的 materialId
        if (Array.isArray(snapshot.ingredients)) {
          for (const ing of snapshot.ingredients) {
            if (ing.materialId === bad.id) {
              ing.materialId = good.id;
              changed = true;
            }
          }
        }

        if (changed) {
          await query(
            "UPDATE formula_versions SET snapshot_json = ?, updated_at = datetime('now') WHERE version_id = ?",
            [JSON.stringify(snapshot), v.version_id],
          );
          migratedFormulaCount++;
          console.log(`  ↻ 版本 ${v.version_id} 的配方引用已迁移`);
        }
      }

      // 迁移营养数据
      const [nutriCnt]: any[] = await query("SELECT COUNT(*) as cnt FROM material_nutrition WHERE material_id = ?", [
        bad.id,
      ]);
      if (nutriCnt[0].cnt > 0) {
        const [targetCnt]: any[] = await query("SELECT COUNT(*) as cnt FROM material_nutrition WHERE material_id = ?", [
          good.id,
        ]);
        if (targetCnt[0].cnt === 0) {
          await query("UPDATE material_nutrition SET material_id = ? WHERE material_id = ?", [good.id, bad.id]);
          console.log(`  ↻ 营养数据迁移`);
        } else {
          await query("DELETE FROM material_nutrition WHERE material_id = ?", [bad.id]);
          console.log(`  🗑 营养数据删除(目标已有)`);
        }
      }

      await query("DELETE FROM materials WHERE id = ?", [bad.id]);
      deletedCount++;
      console.log(`  ✅ 已删除重复\n`);
    } else {
      try {
        await query("UPDATE materials SET code = ?, updated_at = datetime('now') WHERE id = ?", [newCode, bad.id]);
        updatedCount++;
        console.log(`  ✅ 编码更新为 ${newCode}\n`);
      } catch (e: any) {
        const msg = String(e.message || e);
        if (msg.includes("UNIQUE") || msg.includes("constraint")) {
          const altCode = newCode + "_" + String(bad.id).slice(-3);
          try {
            await query("UPDATE materials SET code = ?, updated_at = datetime('now') WHERE id = ?", [altCode, bad.id]);
            updatedCount++;
            console.log(`  ✅ 冲突，使用备选: ${altCode}\n`);
          } catch (e2: any) {
            errors.push(`${bad.name}: ${e2.message}`);
            console.log(`  ❌ 备选也失败\n`);
          }
        } else {
          errors.push(`${bad.name}: ${msg}`);
          console.log(`  ❌ 失败: ${msg}\n`);
        }
      }
    }
  }

  // ── 验证 ──
  console.log("\n" + "═".repeat(60));
  console.log("验证结果");
  console.log("═".repeat(60));

  const [remainingBad]: any[] = await query(
    "SELECT name, code FROM materials WHERE code LIKE 'MAT%'",
  );

  const [allMats]: any[] = await query("SELECT name, code FROM materials");
  let finalGood = 0,
    finalBad2 = 0;
  for (const m of allMats) {
    /^MAT\d{3}$/.test(m.code) ? finalBad2++ : finalGood++;
  }

  console.log(`\n  删除重复:     ${deletedCount} 条`);
  console.log(`  更新编码:     ${updatedCount} 条`);
  console.log(`  迁移配方引用: ${migratedFormulaCount} 处`);
  console.log(`\n  ✅ 合规编码:   ${finalGood} 条`);
  console.log(`  ❌ 遗留 MAT#: ${remainingBad.length} 条`);

  if (remainingBad.length > 0) {
    console.log("\n遗留:");
    for (const r of remainingBad) console.log(`  ${r.name}: ${r.code}`);
  }
  if (errors.length > 0) {
    console.log("\n错误:");
    for (const e of errors) console.log(`  ${e}`);
  }

  console.log("\n" + (remainingBad.length === 0 ? "✅ 全部修复完成！" : "⚠ 部分未完成"));
  await closeDatabase();
}

fixAllMaterialCodes().catch(err => {
  console.error("失败:", err);
  process.exit(1);
});
