import Database from 'better-sqlite3';

const db = new Database('./data/tingstudio.db');

// 添加缺失的列
const columnsToAdd = [
  'display_name',
  'avatar', 
  'bio',
  'email',
  'phone'
];

columnsToAdd.forEach(column => {
  try {
    db.prepare(`ALTER TABLE users ADD COLUMN ${column} TEXT DEFAULT NULL`).run();
    console.log(`✅ 添加 ${column} 列成功`);
  } catch (e) {
    console.log(`ℹ️  ${column} 列已存在`);
  }
});

// 检查表结构
const columns = db.prepare('PRAGMA table_info(users)').all();
console.log('\nusers 表结构:');
columns.forEach(col => {
  console.log(`  ${col.name} (${col.type})`);
});

// 检查是否有 admin 用户，如果没有则创建
const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminUser) {
  console.log('\n⚠️  未找到 admin 用户，正在创建...');
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  
  db.prepare(`
    INSERT INTO users (id, username, password, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run('admin-001', 'admin', hashedPassword, 'admin');
  
  console.log('✅ admin 用户创建成功');
} else {
  console.log('\n✅ admin 用户已存在');
}

db.close();
console.log('\n✅ 数据库修复完成');