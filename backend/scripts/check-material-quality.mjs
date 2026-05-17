import { connectDatabase, getDb, closeDatabase } from "../src/config/database.js";
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

await connectDatabase();
const db = getDb();

console.log("═══════════════════════════════════════════════════════════════");
console.log("  原料数据质量检查报告");
console.log("═══════════════════════════════════════════════════════════════\n");

console.log("【1. 原料名称重复检查】");
const duplicates = db.prepare(`
  SELECT name, COUNT(*) as cnt, GROUP_CONCAT(id, '|') as ids
  FROM materials
  GROUP BY name
  HAVING cnt > 1
`).all();

if (duplicates.length === 0) {
  console.log("  ✅ 未发现重复名称\n");
} else {
  console.log(`  ❌ 发现 ${duplicates.length} 组重复名称:\n`);
  for (const dup of duplicates) {
    const ids = dup.ids.split('|');
    console.log(`  📌 "${dup.name}" - ${dup.cnt}条记录`);
    for (const id of ids) {
      const mat = db.prepare("SELECT id, code, created_at FROM materials WHERE id = ?").get(id);
      console.log(`     - ID: ${id}, 编码: ${mat.code}, 创建时间: ${mat.created_at}`);
    }
    console.log("");
  }
}

console.log("【2. 原料总数统计】");
const total = db.prepare("SELECT COUNT(*) as cnt FROM materials").get();
console.log(`  总原料数: ${total.cnt}`);

console.log("\n【3. 按类型统计】");
const byType = db.prepare(`
  SELECT material_type, COUNT(*) as cnt
  FROM materials
  GROUP BY material_type
`).all();
for (const t of byType) {
  console.log(`  ${t.material_type === 'herb' ? '药材' : '辅料'}: ${t.cnt}条`);
}

console.log("\n【4. 空名称检查】");
const emptyName = db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE name IS NULL OR name = ''").get();
console.log(`  空名称记录: ${emptyName.cnt}条`);

console.log("\n【5. 空编码检查】");
const emptyCode = db.prepare("SELECT COUNT(*) as cnt FROM materials WHERE code IS NULL OR code = ''").get();
console.log(`  空编码记录: ${emptyCode.cnt}条`);

console.log("\n【6. 数据库约束检查】");
const indexes = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='materials'").all();
let hasNameUnique = false;
let hasCodeUnique = false;
for (const idx of indexes) {
  if (idx.name.includes('name')) hasNameUnique = true;
  if (idx.name.includes('code')) hasCodeUnique = true;
  console.log(`  索引: ${idx.name}`);
}
console.log(`  ✓ name字段唯一索引: ${hasNameUnique ? '已存在' : '❌ 不存在'}`);
console.log(`  ✓ code字段唯一索引: ${hasCodeUnique ? '已存在' : '❌ 不存在'}`);

console.log("\n═══════════════════════════════════════════════════════════════");
console.log("  报告生成完毕");
console.log("═══════════════════════════════════════════════════════════════");

await closeDatabase();
