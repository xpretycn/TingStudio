import { query } from "../config/database-adapter.js";
import { rowsToCamelCase } from "../utils/helpers.js";

interface PermissionRow {
  id: string;
  module: string;
  action: string;
  permissionKey: string;
  label: string;
  description: string;
  sortOrder: number;
  createdAt: string;
}

interface GroupedPermission {
  module: string;
  moduleLabel: string;
  permissions: PermissionRow[];
}

const MODULE_LABELS: Record<string, string> = {
  material: "原料管理",
  formula: "配方管理",
  ai: "AI助手",
  nutrition: "营养分析",
  file: "文件管理",
  export: "数据导出",
  system: "系统配置",
  user: "用户管理",
  permission: "权限管理",
};

export async function getAllPermissions(): Promise<PermissionRow[]> {
  const result = await query<Record<string, unknown>>(
    "SELECT id, module, action, permission_key, label, description, sort_order, created_at FROM permissions ORDER BY sort_order"
  );
  return rowsToCamelCase<PermissionRow>(result.rows || []);
}

export async function getPermissionsByRoleId(roleId: string): Promise<string[]> {
  const result = await query<Record<string, unknown>>(
    "SELECT p.permission_key FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?",
    [roleId]
  );
  const rows = rowsToCamelCase<{ permissionKey: string }>(result.rows || []);
  return rows.map((r) => r.permissionKey);
}

export async function getPermissionsGroupedByModule(): Promise<GroupedPermission[]> {
  const allPerms = await getAllPermissions();
  const grouped: Record<string, GroupedPermission> = {};

  for (const perm of allPerms) {
    const mod = perm.module;
    if (!grouped[mod]) {
      grouped[mod] = {
        module: mod,
        moduleLabel: MODULE_LABELS[mod] || mod,
        permissions: [],
      };
    }
    grouped[mod].permissions.push(perm);
  }

  return Object.values(grouped);
}
