const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');

console.log('=== 完成剩余迁移步骤 ===');

try {
  // 检查 formula_versions 表是否已有 ratio_factor 字段
  const versionFields = db.prepare("PRAGMA table_info(formula_versions)").all();
  const hasRatioFactorInVersions = versionFields.some(f => f.name === 'ratio_factor');
  
  if (!hasRatioFactorInVersions) {
    console.log('1. 为 formula_versions 表添加 ratio_factor 字段...');
    db.exec(`
      ALTER TABLE formula_versions ADD COLUMN ratio_factor REAL NOT NULL DEFAULT 0.18
    `);
    console.log('   ✓ 添加完成');
  } else {
    console.log('1. formula_versions 表已存在 ratio_factor 字段，跳过');
  }
  
  // 检查是否需要迁移数据到 formula_versions 表
  console.log('2. 检查并迁移数据到 formula_versions 表...');
  const versionsWithoutRatio = db.prepare(
    "SELECT COUNT(*) as count FROM formula_versions WHERE ratio_factor IS NULL"
  ).get();
  
  if (versionsWithoutRatio.count > 0) {
    console.log(`   发现 ${versionsWithoutRatio.count} 个版本缺少 ratio_factor，进行迁移...`);
    
    // 获取所有配方的 ratio_factor 值
    const formulas = db.prepare("SELECT id, ratio_factor FROM formulas").all();
    const formulaRatioMap = {};
    formulas.forEach(f => {
      formulaRatioMap[f.id] = f.ratio_factor;
    });
    
    // 更新每个版本
    const stmt = db.prepare("UPDATE formula_versions SET ratio_factor = ? WHERE version_id = ?");
    db.transaction(() => {
      db.prepare("SELECT version_id, formula_id FROM formula_versions WHERE ratio_factor IS NULL")
        .all()
        .forEach(version => {
          const ratioFactor = formulaRatioMap[version.formula_id] || 0.18;
          stmt.run(ratioFactor, version.version_id);
        });
    })();
    
    console.log('   ✓ 数据迁移完成');
  } else {
    console.log('   所有版本均已包含 ratio_factor，无需迁移');
  }
  
  // 验证结果
  console.log('3. 验证迁移结果...');
  const versionCheck = db.prepare("SELECT COUNT(*) as total, COUNT(ratio_factor) as with_ratio FROM formula_versions").get();
  console.log(`   formula_versions 表: 总计 ${versionCheck.total} 条记录，其中 ${versionCheck.with_ratio} 条包含 ratio_factor`);
  
  if (versionCheck.total === versionCheck.with_ratio) {
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