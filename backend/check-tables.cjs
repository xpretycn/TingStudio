const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');

console.log('=== 检查数据库表结构 ===\n');

// 检查 materials 表
console.log('materials 表字段:');
const materialsFields = db.prepare('PRAGMA table_info(materials)').all();
materialsFields.forEach(field => {
  console.log(`  ${field.name} (${field.type}) ${field.dflt_value ? `DEFAULT ${field.dflt_value}` : ''}`);
});

console.log('\nmaterials 表数据示例:');
const sampleMaterials = db.prepare('SELECT id, name, material_type FROM materials LIMIT 5').all();
sampleMaterials.forEach(mat => {
  console.log(`  ${mat.name}: ${mat.material_type}`);
});

// 检查是否有缺少 material_type 的记录
const missingTypeCount = db.prepare('SELECT COUNT(*) as count FROM materials WHERE material_type IS NULL OR material_type = ""').get();
console.log(`\n缺少 material_type 的记录数: ${missingTypeCount.count}`);

db.close();