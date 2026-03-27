const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');

console.log('=== 更新原料类型数据 ===\n');

// 常见的辅料名称列表
const supplementNames = [
  '低聚异麦芽糖', '竹叶黄酮', '蜂蜜', '冰糖', '白糖', '红糖', '盐', 
  '柠檬酸', '维生素C', '乳糖', '蔗糖', '果糖', '葡萄糖', '淀粉',
  '明胶', '卡拉胶', '黄原胶', '阿拉伯胶', '琼脂', '果胶'
];

try {
  // 查找所有原料
  const allMaterials = db.prepare('SELECT id, name FROM materials').all();
  console.log(`总共 ${allMaterials.length} 个原料`);
  
  let updatedCount = 0;
  
  // 更新辅料类型
  const updateStmt = db.prepare('UPDATE materials SET material_type = ? WHERE id = ?');
  
  allMaterials.forEach(material => {
    const isSupplement = supplementNames.some(supplement => 
      material.name.includes(supplement) || supplement.includes(material.name)
    );
    
    if (isSupplement) {
      updateStmt.run('supplement', material.id);
      console.log(`✓ 更新 ${material.name} 为辅料`);
      updatedCount++;
    }
  });
  
  console.log(`\n✅ 更新完成，共修改 ${updatedCount} 个原料为辅料类型`);
  
  // 显示更新后的数据示例
  console.log('\n更新后的原料类型分布:');
  const typeStats = db.prepare(`
    SELECT material_type, COUNT(*) as count 
    FROM materials 
    GROUP BY material_type
  `).all();
  
  typeStats.forEach(stat => {
    console.log(`  ${stat.material_type}: ${stat.count} 个`);
  });
  
  // 显示辅料示例
  console.log('\n辅料示例:');
  const supplements = db.prepare(`
    SELECT name, material_type 
    FROM materials 
    WHERE material_type = 'supplement' 
    LIMIT 10
  `).all();
  
  supplements.forEach(sup => {
    console.log(`  ${sup.name}: ${sup.material_type}`);
  });
  
} catch (error) {
  console.error('❌ 更新过程中出错:', error);
} finally {
  db.close();
}