import sqlite3 from 'better-sqlite3';

const db = sqlite3('./data/tingstudio.db');

console.log('=== 原料重复数据处理 ===\n');

// 需要删除的重复记录ID（保留最新创建/更新的，删除其他）
const idsToDelete = [
  'moldtk2pyi9z6d6u',  // 低聚异麦芽糖 - WUMC (旧，2026-04-30)
  'mop430np5m21l7ih',  // 测试栀子1 (旧)
  'mop430pskhctoo15',  // 测试白术1 (旧)
  'mop430oeit9r8hbo',  // 测试百合1 (旧)
  'mop430p2se3b05ag',  // 测试薄荷1 (旧)
  'moldtk2rkn4nhgn7',  // 莱菔子 - LFZ (旧，2026-04-30)
  'moldtk2o7up69cxx',  // 阿胶 - EJ (旧，2026-04-30)
];

// 显示待删除记录信息
console.log('=== 待删除记录 ===');
idsToDelete.forEach(id => {
  const mat = db.prepare('SELECT name, code, created_at FROM materials WHERE id = ?').get(id);
  if (mat) {
    console.log(`  ${mat.name} (${mat.code}) - ${mat.created_at}`);
  }
});

// 执行删除
console.log('\n=== 执行删除 ===');
const deleteStmt = db.prepare('DELETE FROM materials WHERE id = ?');
let deletedCount = 0;
let errors = [];

idsToDelete.forEach(id => {
  try {
    const result = deleteStmt.run(id);
    if (result.changes > 0) {
      deletedCount += result.changes;
      console.log(`  ✓ 已删除: ${id}`);
    } else {
      console.log(`  ✗ 未找到: ${id}`);
    }
  } catch (err) {
    errors.push({ id, error: err.message });
    console.log(`  ✗ 删除失败: ${id} - ${err.message}`);
  }
});

console.log(`\n共删除记录数: ${deletedCount}`);
if (errors.length > 0) {
  console.log(`删除失败数: ${errors.length}`);
}

// 验证剩余数据
console.log('\n=== 验证处理结果 ===');
const remaining = db.prepare('SELECT COUNT(*) as count FROM materials').get();
console.log(`剩余原料总数: ${remaining.count}`);

// 检查是否还有重复
const nameCount = {};
db.prepare('SELECT name FROM materials').all().forEach(m => {
  const name = m.name.trim();
  nameCount[name] = (nameCount[name] || 0) + 1;
});

const duplicates = Object.keys(nameCount).filter(name => nameCount[name] > 1);
console.log(`剩余重复名称数: ${duplicates.length}`);

if (duplicates.length > 0) {
  console.log('仍存在的重复名称:');
  duplicates.forEach(name => {
    console.log(`  - ${name} (${nameCount[name]}条)`);
  });
} else {
  console.log('✓ 所有重复名称已处理完毕');
}

// 显示保留的记录
console.log('\n=== 保留的记录（低聚异麦芽糖）===');
const keptRecords = db.prepare("SELECT id, name, code, created_at FROM materials WHERE name LIKE '%低聚异麦芽糖%'").all();
keptRecords.forEach(r => {
  console.log(`  ${r.name} (${r.code}) - ${r.id} - ${r.created_at}`);
});

console.log('\n处理完成！');
