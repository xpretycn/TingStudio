import sqlite3 from 'better-sqlite3';

const db = sqlite3('./data/tingstudio.db');

console.log('=== 添加原料名称唯一约束 ===\n');

// 检查是否已存在 name 的唯一索引
const existingIndexes = db.prepare("PRAGMA index_list(materials)").all();
const nameUniqueIndex = existingIndexes.find(idx => 
  idx.unique === 1 && 
  db.prepare(`PRAGMA index_info('${idx.name}')`).all().some(col => col.name === 'name')
);

if (nameUniqueIndex) {
  console.log('✓ 原料名称唯一约束已存在:', nameUniqueIndex.name);
} else {
  console.log('开始添加原料名称唯一约束...');
  
  try {
    // 先确保没有重复的 name
    const nameCount = {};
    db.prepare('SELECT name, COUNT(*) as count FROM materials GROUP BY name HAVING count > 1').all().forEach(row => {
      nameCount[row.name] = row.count;
    });
    
    if (Object.keys(nameCount).length > 0) {
      console.log('发现重复名称，需要先清理:');
      Object.entries(nameCount).forEach(([name, count]) => {
        console.log(`  - ${name}: ${count}条`);
      });
      console.log('\n请先运行 fix-material-duplicates.mjs 清理重复数据！');
      process.exit(1);
    }
    
    // 创建唯一索引
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_name ON materials(name)');
    console.log('✓ 成功添加原料名称唯一约束: idx_materials_name');
    
    // 验证
    const newIndexes = db.prepare("PRAGMA index_list(materials)").all();
    const addedIndex = newIndexes.find(idx => idx.name === 'idx_materials_name');
    if (addedIndex) {
      console.log('✓ 验证通过：唯一索引已创建');
    }
    
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      console.log('✗ 添加失败：存在重复的原料名称');
      console.log('请先清理重复数据后再试！');
    } else {
      console.log('✗ 添加失败:', err.message);
    }
    process.exit(1);
  }
}

console.log('\n约束添加完成！');
