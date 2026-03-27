const Database = require('better-sqlite3');
const { join } = require('path');

const DB_PATH = join(process.cwd(), 'data', 'tingstudio.db');

console.log('=== 迁移：为 formulas 和 formula_versions 表添加 ratio_factor 和 supplement_ratio_factor 字段 ===');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

try {
  const formulaFields = db.prepare("PRAGMA table_info(formulas)").all();
  const versionFields = db.prepare("PRAGMA table_info(formula_versions)").all();

  // formulas 表
  const hasRatioInFormulas = formulaFields.some(f => f.name === 'ratio_factor');
  if (!hasRatioInFormulas) {
    console.log('1. 为 formulas 表添加 ratio_factor 字段...');
    db.exec(`ALTER TABLE formulas ADD COLUMN ratio_factor REAL NOT NULL DEFAULT 0.18`);
    console.log('   ✓ 添加完成');
  } else {
    console.log('1. formulas 表已存在 ratio_factor 字段，跳过');
  }

  const hasSupplementInFormulas = formulaFields.some(f => f.name === 'supplement_ratio_factor');
  if (!hasSupplementInFormulas) {
    console.log('2. 为 formulas 表添加 supplement_ratio_factor 字段...');
    db.exec(`ALTER TABLE formulas ADD COLUMN supplement_ratio_factor REAL NOT NULL DEFAULT 1.0`);
    console.log('   ✓ 添加完成');
  } else {
    console.log('2. formulas 表已存在 supplement_ratio_factor 字段，跳过');
  }

  // formula_versions 表
  const hasRatioInVersions = versionFields.some(f => f.name === 'ratio_factor');
  if (!hasRatioInVersions) {
    console.log('3. 为 formula_versions 表添加 ratio_factor 字段...');
    db.exec(`ALTER TABLE formula_versions ADD COLUMN ratio_factor REAL NOT NULL DEFAULT 0.18`);
    console.log('   ✓ 添加完成');
  } else {
    console.log('3. formula_versions 表已存在 ratio_factor 字段，跳过');
  }

  const hasSupplementInVersions = versionFields.some(f => f.name === 'supplement_ratio_factor');
  if (!hasSupplementInVersions) {
    console.log('4. 为 formula_versions 表添加 supplement_ratio_factor 字段...');
    db.exec(`ALTER TABLE formula_versions ADD COLUMN supplement_ratio_factor REAL NOT NULL DEFAULT 1.0`);
    console.log('   ✓ 添加完成');
  } else {
    console.log('4. formula_versions 表已存在 supplement_ratio_factor 字段，跳过');
  }

  // 验证结果
  console.log('5. 验证迁移结果...');
  const formulaCheck = db.prepare("SELECT COUNT(*) as total, COUNT(ratio_factor) as with_ratio, COUNT(supplement_ratio_factor) as with_sup FROM formulas").get();
  console.log(`   formulas 表: 总计 ${formulaCheck.total} 条记录，ratio_factor: ${formulaCheck.with_ratio}, supplement_ratio_factor: ${formulaCheck.with_sup}`);

  const versionCheck = db.prepare("SELECT COUNT(*) as total, COUNT(ratio_factor) as with_ratio, COUNT(supplement_ratio_factor) as with_sup FROM formula_versions").get();
  console.log(`   formula_versions 表: 总计 ${versionCheck.total} 条记录，ratio_factor: ${versionCheck.with_ratio}, supplement_ratio_factor: ${versionCheck.with_sup}`);

  if (formulaCheck.total === formulaCheck.with_ratio && formulaCheck.total === formulaCheck.with_sup &&
      versionCheck.total === versionCheck.with_ratio && versionCheck.total === versionCheck.with_sup) {
    console.log('✅ 迁移完成！所有表结构和数据均已正确设置');
  } else {
    console.log('⚠️  迁移未完全完成，请检查数据一致性');
  }
} catch (error) {
  console.error('❌ 迁移过程中发生错误:', error);
  process.exit(1);
} finally {
  db.close();
  console.log('数据库连接已关闭');
}
