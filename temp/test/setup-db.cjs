const Database = require('better-sqlite3');
const db = new Database('./data/tingstudio.db');
const now = new Date().toISOString();
const adminId = 'moczhnczr655jbfj';

// Create missing tables
const tables = [
  `CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, role_key TEXT NOT NULL UNIQUE,
    description TEXT, is_system INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY, module TEXT NOT NULL, action TEXT NOT NULL,
    permission_key TEXT NOT NULL UNIQUE, label TEXT NOT NULL,
    description TEXT, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL, permission_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY (role_id, permission_id)
  )`,
  `CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, type TEXT NOT NULL, title TEXT NOT NULL,
    period_start TEXT NOT NULL, period_end TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', data_json TEXT, ai_analysis TEXT,
    generated_by TEXT DEFAULT 'manual', published_at TEXT,
    created_by TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS report_targets (
    id TEXT PRIMARY KEY, period_type TEXT NOT NULL,
    period_start TEXT NOT NULL, period_end TEXT NOT NULL,
    targets_json TEXT, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS uploaded_files (
    id TEXT PRIMARY KEY, original_name TEXT NOT NULL,
    storage_path TEXT NOT NULL, file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT, file_type TEXT DEFAULT 'formula',
    status TEXT NOT NULL DEFAULT 'uploaded', parse_model TEXT,
    version INTEGER NOT NULL DEFAULT 1, related_id TEXT, related_type TEXT,
    last_accessed_at TEXT, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS file_audit_log (
    id TEXT PRIMARY KEY, file_id TEXT NOT NULL, action TEXT NOT NULL,
    operator TEXT, timestamp TEXT NOT NULL, detail_json TEXT, ip_address TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS file_relations (
    id TEXT PRIMARY KEY, file_id TEXT NOT NULL, related_id TEXT NOT NULL,
    related_type TEXT NOT NULL, created_by TEXT NOT NULL, created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS export_center_config (
    id TEXT PRIMARY KEY, config_key TEXT NOT NULL UNIQUE,
    config_value TEXT, config_type TEXT NOT NULL DEFAULT 'string',
    description TEXT, updated_by TEXT, updated_at TEXT NOT NULL
  )`
];

for (const sql of tables) {
  try { db.exec(sql); } catch(e) { console.log('Skip:', e.message.substring(0, 60)); }
}

// Create roles
db.prepare('INSERT OR IGNORE INTO roles (id, name, role_key, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run('role_admin_001', '系统管理员', 'admin', '系统管理员', 1, now, now);
db.prepare('INSERT OR IGNORE INTO roles (id, name, role_key, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  .run('role_formulist_001', '配方师', 'formulist', '配方师', 1, now, now);

// Update user role_ids
db.prepare('UPDATE users SET role_id = ? WHERE role = ?').run('role_admin_001', 'admin');
db.prepare('UPDATE users SET role_id = ? WHERE role = ?').run('role_formulist_001', 'formulist');

// Create permissions
const perms = [
  ['perm_material_read', 'material', 'read', 'material:read', '查看原料', '', 1],
  ['perm_material_write', 'material', 'write', 'material:write', '编辑原料', '', 2],
  ['perm_formula_read', 'formula', 'read', 'formula:read', '查看配方', '', 3],
  ['perm_formula_write', 'formula', 'write', 'formula:write', '编辑配方', '', 4],
  ['perm_ai_read', 'ai', 'read', 'ai:read', '使用AI', '', 5],
  ['perm_ai_write', 'ai', 'write', 'ai:write', 'AI配置', '', 6],
  ['perm_nutrition_read', 'nutrition', 'read', 'nutrition:read', '查看营养', '', 7],
  ['perm_file_read', 'file', 'read', 'file:read', '查看文件', '', 8],
  ['perm_file_write', 'file', 'write', 'file:write', '管理文件', '', 9],
  ['perm_export_read', 'export', 'read', 'export:read', '查看导出', '', 10],
  ['perm_export_write', 'export', 'write', 'export:write', '执行导出', '', 11],
  ['perm_system_config', 'system', 'config', 'system:config', '系统配置', '', 12],
  ['perm_user_read', 'user', 'read', 'user:read', '查看用户', '', 13],
  ['perm_user_write', 'user', 'write', 'user:write', '管理用户', '', 14],
  ['perm_permission_read', 'permission', 'read', 'permission:read', '查看权限', '', 15],
  ['perm_permission_write', 'permission', 'write', 'permission:write', '管理权限', '', 16],
  ['perm_report_read', 'report', 'read', 'report:read', '查看报表', '', 17],
  ['perm_report_write', 'report', 'write', 'report:write', '管理报表', '', 18],
];
const insertPerm = db.prepare('INSERT OR IGNORE INTO permissions (id, module, action, permission_key, label, description, sort_order, created_at) VALUES (?,?,?,?,?,?,?,?)');
for (const p of perms) { insertPerm.run(...p, now); }

// Assign all permissions to admin role
const allPermIds = perms.map(p => p[0]);
for (const pid of allPermIds) {
  db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?,?,?)').run('role_admin_001', pid, now);
}

// Assign basic permissions to formulist
const formulistPermIds = ['perm_material_read','perm_material_write','perm_formula_read','perm_formula_write',
  'perm_ai_read','perm_ai_write','perm_nutrition_read','perm_file_read','perm_file_write',
  'perm_export_read','perm_export_write','perm_report_read','perm_report_write'];
for (const pid of formulistPermIds) {
  db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?,?,?)').run('role_formulist_001', pid, now);
}

// Create test data
db.prepare('INSERT OR IGNORE INTO salesmen (id, name, code, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?)')
  .run('sales_test_001', '[test]业务员1', 'S001', 'active', adminId, now, now);
db.prepare('INSERT OR IGNORE INTO materials (id, name, code, unit, material_type, created_by, created_at, updated_at, version, is_latest, is_deleted, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
  .run('mat_test_001', '[test]佛手', 'M001', 'g', 'herb', adminId, now, now, 1, 1, 0, 'published');
db.prepare('INSERT OR IGNORE INTO materials (id, name, code, unit, material_type, created_by, created_at, updated_at, version, is_latest, is_deleted, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
  .run('mat_test_002', '[test]低聚异麦芽糖', 'M002', 'g', 'supplement', adminId, now, now, 1, 1, 0, 'published');
const mats = JSON.stringify([{materialId:'mat_test_001',name:'[test]佛手',quantity:108,unit:'g'}]);
db.prepare('INSERT OR IGNORE INTO formulas (id, name, salesman_id, salesman_name, materials_json, created_by, created_at, updated_at, finished_weight) VALUES (?,?,?,?,?,?,?,?,?)')
  .run('f_test_001', '[test]测试配方1', 'sales_test_001', '[test]业务员1', mats, adminId, now, now, 500);
db.prepare('INSERT OR IGNORE INTO formulas (id, name, salesman_id, salesman_name, materials_json, created_by, created_at, updated_at, finished_weight) VALUES (?,?,?,?,?,?,?,?,?)')
  .run('f_test_002', '[test]测试配方2', 'sales_test_001', '[test]业务员1', mats, adminId, now, now, 300);

// Ensure admin password
db.prepare('UPDATE users SET password = ? WHERE username = ?').run('$2a$10$Hf8Lz7oVj1XR5yJa0YXKUu8mKQ9fN3pW2vB4xR6sT8uD1gH3iJ5Km', 'admin');

console.log('Database setup complete!');
db.close();
