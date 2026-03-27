const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');

console.log('=== 修复 materials 表结构 ===\n');

try {
  // 检查是否已存在 material_type 字段
  const fields = db.prepare('PRAGMA table_info(materials)').all();
  const hasMaterialType = fields.some(f => f.name === 'material_type');
  
  if (hasMaterialType) {
    console.log('✓ material_type 字段已存在');
  } else {
    console.log('添加 material_type 字段...');
    db.exec(`
      ALTER TABLE materials ADD COLUMN material_type TEXT NOT NULL DEFAULT 'herb' CHECK(material_type IN ('herb', 'supplement'))
    `);
    console.log('✓ material_type 字段添加成功');
  }
  
  // 验证表结构
  console.log('\n更新后的 materials 表字段:');
  const updatedFields = db.prepare('PRAGMA table_info(materials)').all();
  updatedFields.forEach(field => {
    console.log(`  ${field.name} (${field.type}) ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
  });
  
  // 检查数据示例
  console.log('\n数据示例:');
  const samples = db.prepare('SELECT id, name, material_type FROM materials LIMIT 5').all();
  samples.forEach(mat => {
    console.log(`  ${mat.name}: ${mat.material_type || 'NULL'}`);
  });
  
  console.log('\n✅ 表结构修复完成');
  
} catch (error) {
  console.error('❌ 修复过程中出错:', error);
} finally {
  db.close();
}