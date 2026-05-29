import { query, execute, connectDatabase } from "../../config/database-adapter.js";
import { generateId, now } from "../../utils/helpers.js";

interface ColumnInfo {
  name: string;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const result = await query<ColumnInfo>("PRAGMA table_info(" + tableName + ")");
  return (result.rows || []).some((r) => r.name === columnName);
}

async function recordExists(tableName: string, column: string, value: string): Promise<boolean> {
  const result = await query("SELECT id FROM " + tableName + " WHERE " + column + " = ?", [value]);
  return (result.rows || []).length > 0;
}

export async function runMigration(): Promise<void> {
  console.log("[Migration] 开始 RBAC 权限表迁移...");

  await query(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role_key TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      is_system INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);
  console.log("[Migration] roles 表已就绪");

  await query(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      permission_key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `);
  console.log("[Migration] permissions 表已就绪");

  await query(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      role_id TEXT NOT NULL,
      permission_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (role_id, permission_id)
    )
  `);
  console.log("[Migration] role_permissions 表已就绪");

  await query("CREATE INDEX IF NOT EXISTS idx_roles_role_key ON roles(role_key)");
  await query("CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module)");
  await query("CREATE INDEX IF NOT EXISTS idx_permissions_permission_key ON permissions(permission_key)");
  await query("CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id)");
  await query("CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id)");
  console.log("[Migration] 索引已创建");

  const currentTime = now();

  const adminExists = await recordExists("roles", "role_key", "admin");
  if (!adminExists) {
    const adminId = generateId();
    await query(
      "INSERT INTO roles (id, name, role_key, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [adminId, "管理员", "admin", "系统管理员，拥有所有权限", 1, currentTime, currentTime]
    );
    console.log("[Migration] admin 系统角色已插入");
  } else {
    console.log("[Migration] admin 系统角色已存在，跳过");
  }

  const formulistExists = await recordExists("roles", "role_key", "formulist");
  if (!formulistExists) {
    const formulistId = generateId();
    await query(
      "INSERT INTO roles (id, name, role_key, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [formulistId, "配方师", "formulist", "配方师，拥有基本业务权限", 1, currentTime, currentTime]
    );
    console.log("[Migration] formulist 系统角色已插入");
  } else {
    console.log("[Migration] formulist 系统角色已存在，跳过");
  }

  const permissionDefs: Array<{ module: string; action: string; permissionKey: string; label: string; sortOrder: number }> = [
    { module: "material", action: "read", permissionKey: "material:read", label: "查看原料", sortOrder: 1 },
    { module: "material", action: "write", permissionKey: "material:write", label: "编辑原料", sortOrder: 2 },
    { module: "formula", action: "read", permissionKey: "formula:read", label: "查看配方", sortOrder: 3 },
    { module: "formula", action: "write", permissionKey: "formula:write", label: "编辑配方", sortOrder: 4 },
    { module: "ai", action: "read", permissionKey: "ai:read", label: "使用AI助手", sortOrder: 5 },
    { module: "ai", action: "write", permissionKey: "ai:write", label: "配置AI助手", sortOrder: 6 },
    { module: "nutrition", action: "read", permissionKey: "nutrition:read", label: "查看营养分析", sortOrder: 7 },
    { module: "nutrition", action: "write", permissionKey: "nutrition:write", label: "编辑营养分析", sortOrder: 8 },
    { module: "file", action: "read", permissionKey: "file:read", label: "查看文件", sortOrder: 9 },
    { module: "file", action: "write", permissionKey: "file:write", label: "管理文件", sortOrder: 10 },
    { module: "export", action: "read", permissionKey: "export:read", label: "查看导出", sortOrder: 11 },
    { module: "export", action: "write", permissionKey: "export:write", label: "执行导出", sortOrder: 12 },
    { module: "system", action: "read", permissionKey: "system:read", label: "查看系统配置", sortOrder: 13 },
    { module: "system", action: "write", permissionKey: "system:write", label: "修改系统配置", sortOrder: 14 },
    { module: "user", action: "read", permissionKey: "user:read", label: "查看用户", sortOrder: 15 },
    { module: "user", action: "write", permissionKey: "user:write", label: "管理用户", sortOrder: 16 },
    { module: "permission", action: "read", permissionKey: "permission:read", label: "查看权限", sortOrder: 17 },
    { module: "permission", action: "write", permissionKey: "permission:write", label: "管理权限", sortOrder: 18 },
  ];

  for (const perm of permissionDefs) {
    const permExists = await recordExists("permissions", "permission_key", perm.permissionKey);
    if (!permExists) {
      const permId = generateId();
      await query(
        "INSERT INTO permissions (id, module, action, permission_key, label, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [permId, perm.module, perm.action, perm.permissionKey, perm.label, "", perm.sortOrder, currentTime]
      );
    }
  }
  console.log("[Migration] 权限记录已插入");

  const formulistRoleResult = await query("SELECT id FROM roles WHERE role_key = ?", ["formulist"]);
  const formulistRoleId = (formulistRoleResult.rows || [])[0]?.id;
  if (formulistRoleId) {
    const formulistPermKeys = [
      "material:read", "material:write",
      "formula:read", "formula:write",
      "ai:read", "ai:write",
      "nutrition:read", "nutrition:write",
      "file:read",
      "export:read", "export:write",
    ];

    for (const permKey of formulistPermKeys) {
      const permResult = await query("SELECT id FROM permissions WHERE permission_key = ?", [permKey]);
      const permId = (permResult.rows || [])[0]?.id;
      if (permId) {
        const rpExists = await query(
          "SELECT 1 FROM role_permissions WHERE role_id = ? AND permission_id = ?",
          [formulistRoleId, permId]
        );
        if ((rpExists.rows || []).length === 0) {
          await query(
            "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)",
            [formulistRoleId, permId, currentTime]
          );
        }
      }
    }
    console.log("[Migration] formulist 默认权限已分配");
  }

  const hasRoleId = await columnExists("users", "role_id");
  if (!hasRoleId) {
    await query("ALTER TABLE users ADD COLUMN role_id TEXT DEFAULT NULL");
    console.log("[Migration] users.role_id 字段已添加");
  } else {
    console.log("[Migration] users.role_id 字段已存在，跳过");
  }

  const hasIsActive = await columnExists("users", "is_active");
  if (!hasIsActive) {
    await query("ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1");
    console.log("[Migration] users.is_active 字段已添加");
  } else {
    console.log("[Migration] users.is_active 字段已存在，跳过");
  }

  await query(
    "UPDATE users SET role_id = (SELECT id FROM roles WHERE role_key = users.role) WHERE role_id IS NULL AND users.role IN ('admin', 'formulist')"
  );
  console.log("[Migration] 现有用户角色已迁移");

  console.log("[Migration] RBAC 权限表迁移完成");
}

connectDatabase()
  .then(() => runMigration())
  .then(() => {
    console.log("\n迁移完成！");
    process.exit(0);
  })
  .catch((err: unknown) => {
    console.error("迁移失败:", err);
    process.exit(1);
  });
