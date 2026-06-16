
import crypto from "crypto";

const db = new Database("./data/tingstudio.db");

const now = new Date().toISOString();

const perms = [
  ["material", "read", "material:read", "查看原料", 1],
  ["material", "write", "material:write", "编辑原料", 2],
  ["formula", "read", "formula:read", "查看配方", 3],
  ["formula", "write", "formula:write", "编辑配方", 4],
  ["ai", "read", "ai:read", "使用AI助手", 5],
  ["ai", "write", "ai:write", "配置AI助手", 6],
  ["nutrition", "read", "nutrition:read", "查看营养分析", 7],
  ["nutrition", "write", "nutrition:write", "编辑营养分析", 8],
  ["file", "read", "file:read", "查看文件", 9],
  ["file", "write", "file:write", "管理文件", 10],
  ["export", "read", "export:read", "查看导出", 11],
  ["export", "write", "export:write", "执行导出", 12],
  ["system", "read", "system:read", "查看系统配置", 13],
  ["system", "write", "system:write", "修改系统配置", 14],
  ["user", "read", "user:read", "查看用户", 15],
  ["user", "write", "user:write", "管理用户", 16],
  ["permission", "read", "permission:read", "查看权限", 17],
  ["permission", "write", "permission:write", "管理权限", 18],
];

const existingCount = (await query("SELECT COUNT(*) AS cnt FROM permissions", [])).rows[0] as { cnt: number };
if (existingCount.cnt > 0) {
  console.log("Permissions already exist (" + existingCount.cnt + " records), skipping seed.");
} else {
  const stmt = db.prepare(
    "INSERT INTO permissions (id, module, action, permission_key, label, description, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  for (const p of perms) {
    stmt.run(crypto.randomUUID(), p[0], p[1], p[2], p[3], "", p[4], now);
  }
  console.log("Inserted " + perms.length + " permissions.");
}

const formulistPermKeys = [
  "material:read", "material:write",
  "formula:read", "formula:write",
  "ai:read", "ai:write",
  "nutrition:read", "nutrition:write",
  "file:read",
  "export:read", "export:write",
];

const formulistRole = (await query("SELECT id FROM roles WHERE role_key = ?", ["formulist"])).rows[0] as { id: string } | undefined;
if (formulistRole) {
  const rpCount = (await query("SELECT COUNT(*) AS cnt FROM role_permissions WHERE role_id = ?", [formulistRole.id])).rows[0] as { cnt: number };
  if (rpCount.cnt === 0) {
    const rpStmt = db.prepare(
      "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)"
    );
    for (const pk of formulistPermKeys) {
      const perm = (await query("SELECT id FROM permissions WHERE permission_key = ?", [pk])).rows[0] as { id: string } | undefined;
      if (perm) rpStmt.run(formulistRole.id, perm.id, now);
    }
    console.log("Assigned " + formulistPermKeys.length + " permissions to formulist role.");
  } else {
    console.log("Formulist role already has " + rpCount.cnt + " permissions.");
  }
}

await execute("UPDATE roles SET is_system = 1 WHERE role_key = ?", ["admin"]);
console.log("Updated admin role is_system to 1.");

const finalCount = (await query("SELECT COUNT(*) AS cnt FROM permissions", [])).rows[0] as { cnt: number };
console.log("Total permissions: " + finalCount.cnt);

db.close();
console.log("Done.");