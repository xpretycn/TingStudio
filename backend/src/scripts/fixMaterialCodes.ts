import { connectDatabase, query, closeDatabase } from "../config/database.js";

async function fixMaterialCodes() {
  console.log("════════════════════════════════════════════════════════");
  console.log(" 原料编码修复脚本");
  console.log("════════════════════════════════════════════════════════\n");

  await connectDatabase();

  // ── 1. 删除重复的 麦冬 (excel_import 版) ──
  console.log("步骤 1: 删除重复 麦冬 (moj817y79pk7uq38 / MAT070)");
  const [dupeMaidong]: any[] = await query("SELECT id, name, code, data_source FROM materials WHERE id = ?", [
    "moj817y79pk7uq38",
  ]);
  if (dupeMaidong && dupeMaidong.length > 0) {
    const m = dupeMaidong[0];
    await query("DELETE FROM material_nutrition WHERE material_id = ?", [m.id]);
    await query("DELETE FROM materials WHERE id = ?", [m.id]);
    console.log(`  ✓ 已删除: ${m.name} (${m.code}) [${m.data_source}]`);
  } else {
    console.log("  ⚠ 未找到，可能已删除");
  }

  // ── 2. 删除重复的 重瓣红玫瑰 (excel_import 版) ──
  console.log("\n步骤 2: 删除重复 重瓣红玫瑰 (moj817y6pemnnwwk / MAT055)");
  const [dupeRose]: any[] = await query("SELECT id, name, code, data_source FROM materials WHERE id = ?", [
    "moj817y6pemnnwwk",
  ]);
  if (dupeRose && dupeRose.length > 0) {
    const m = dupeRose[0];
    await query("DELETE FROM material_nutrition WHERE material_id = ?", [m.id]);
    await query("DELETE FROM materials WHERE id = ?", [m.id]);
    console.log(`  ✓ 已删除: ${m.name} (${m.code}) [${m.data_source}]`);
  } else {
    console.log("  ⚠ 未找到，可能已删除");
  }

  // ── 3. 修正 西洋参 编码 MAT071 → XYX ──
  console.log("\n步骤 3: 修正 西洋参 编码 MAT071 → XYX");
  const [xiys]: any[] = await query("SELECT id, name, code FROM materials WHERE name = '西洋参'");
  if (xiys && xiys.length > 0) {
    const m = xiys[0];
    if (m.code.startsWith("MAT") && m.code.length <= 6) {
      await query("UPDATE materials SET code = 'XYX', updated_at = datetime('now') WHERE id = ?", [m.id]);
      console.log(`  ✓ 已更新: ${m.name} ${m.code} → XYX`);
    } else {
      console.log(`  ℹ 当前编码已是: ${m.code}，无需修改`);
    }
  } else {
    console.log("  ⚠ 未找到西洋参记录");
  }

  // ── 4. 验证 ──
  console.log("\n步骤 4: 验证结果");
  const [verify]: any[] = await query(
    "SELECT name, code, data_source FROM materials WHERE name IN ('麦冬','西洋参','重瓣红玫瑰') ORDER BY name",
  );
  console.log("");
  for (const r of verify) {
    const tag = r.code.match(/^MAT\d{3}$/) ? " ❌" : " ✅";
    console.log(`  ${tag} ${r.name}: code=${r.code}, source=${r.data_source}`);
  }

  const [legacy]: any[] = await query(
    "SELECT name, code FROM materials WHERE code LIKE 'MAT___' AND length(code) = 6 AND name IN ('麦冬','西洋参','重瓣红玫瑰')",
  );
  if (legacy.length > 0) {
    console.log(`\n  ⚠ 这3个原料仍有遗留旧编码:`);
    for (const m of legacy) console.log(`   - ${m.name}: ${m.code}`);
  } else {
    console.log("\n  ✅ 这3个原料编码已全部修正！");
  }

  console.log("\n════════════════════════════════════════════════════════");
  console.log("✅ 修复完成！");
  console.log("════════════════════════════════════════════════════════");
  await closeDatabase();
}

fixMaterialCodes().catch(err => {
  console.error("失败:", err);
  process.exit(1);
});
