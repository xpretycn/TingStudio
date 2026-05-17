import sqlite3 from 'better-sqlite3';

const db = sqlite3('./data/tingstudio.db');

console.log('=== 原料表约束检查 ===\n');

// 检查 materials 表结构
console.log('=== materials 表结构 ===');
const tableInfo = db.prepare("PRAGMA table_info(materials)").all();
tableInfo.forEach(col => {
  const pk = col.pk ? ' [PK]' : '';
  const notNull = col.notnull ? ' [NOT NULL]' : '';
  const dflt = col.dflt_value !== null ? ` [DEFAULT: ${col.dflt_value}]` : '';
  console.log(`  ${col.name}: ${col.type}${pk}${notNull}${dflt}`);
});

// 检查索引
console.log('\n=== materials 表索引 ===');
const indexes = db.prepare("PRAGMA index_list(materials)").all();
if (indexes.length === 0) {
  console.log('  无索引');
} else {
  indexes.forEach(idx => {
    console.log(`  ${idx.name} (unique: ${idx.unique})`);
    const indexInfo = db.prepare(`PRAGMA index_info('${idx.name}')`).all();
    indexInfo.forEach(col => {
      console.log(`    - ${col.name}`);
    });
  });
}

// 检查是否存在 name 字段的唯一约束
console.log('\n=== 检查 name 字段唯一性 ===');
const hasUniqueName = indexes.some(idx => 
  idx.unique === 1 && 
  db.prepare(`PRAGMA index_info('${idx.name}')`).all().some(col => col.name === 'name')
);

if (hasUniqueName) {
  console.log('  ✓ name 字段存在唯一约束');
} else {
  console.log('  ✗ name 字段没有唯一约束（漏洞！）');
}

// 检查代码字段约束
console.log('\n=== 检查 code 字段约束 ===');
const hasUniqueCode = indexes.some(idx => 
  idx.unique === 1 && 
  db.prepare(`PRAGMA index_info('${idx.name}')`).all().some(col => col.name === 'code')
);

if (hasUniqueCode) {
  console.log('  ✓ code 字段存在唯一约束');
} else {
  console.log('  ⚠ code 字段没有唯一约束');
}

console.log('\n检查完成！');
