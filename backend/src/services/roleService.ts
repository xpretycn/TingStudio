import { query } from "../config/database-adapter.js";
import { generateId, now, rowToCamelCase, rowsToCamelCase } from "../utils/helpers.js";

interface RoleRow {
  id: string;
  name: string;
  roleKey: string;
  description: string;
  isSystem: number;
  createdAt: string;
  updatedAt: string;
  permissionCount?: number;
  userCount?: number;
}

interface RoleWithPermissions extends RoleRow {
  permissions: Array<{ id: string; permissionKey: string; label: string; module: string; action: string }>;
}

interface CreateRoleData {
  name: string;
  roleKey: string;
  description: string;
}

interface UpdateRoleData {
  name: string;
  description: string;
}

export async function getAllRoles(): Promise<RoleRow[]> {
  const result = await query<Record<string, unknown>>(
    `SELECT r.id, r.name, r.role_key, r.description, r.is_system, r.created_at, r.updated_at,
       (SELECT COUNT(*) FROM role_permissions WHERE role_id = r.id) AS permission_count,
       (SELECT COUNT(*) FROM users WHERE role_id = r.id) AS user_count
     FROM roles r ORDER BY r.is_system DESC, r.created_at ASC`
  );
  return rowsToCamelCase<RoleRow>(result.rows || []);
}

export async function getRoleById(id: string): Promise<RoleWithPermissions | null> {
  const result = await query<Record<string, unknown>>(
    "SELECT id, name, role_key, description, is_system, created_at, updated_at FROM roles WHERE id = ?",
    [id]
  );
  const row = (result.rows || [])[0];
  if (!row) return null;

  const role = rowToCamelCase<RoleRow>(row);

  const permResult = await query<Record<string, unknown>>(
    `SELECT p.id, p.permission_key, p.label, p.module, p.action
     FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ? ORDER BY p.sort_order`,
    [id]
  );
  const permissions = rowsToCamelCase<{ id: string; permissionKey: string; label: string; module: string; action: string }>(permResult.rows || []);

  return { ...role, permissions };
}

export async function createRole(data: CreateRoleData): Promise<RoleRow> {
  const id = generateId();
  const currentTime = now();

  const existingResult = await query("SELECT id FROM roles WHERE role_key = ?", [data.roleKey]);
  if ((existingResult.rows || []).length > 0) {
    throw new Error("DUPLICATE_ENTRY");
  }

  await query(
    "INSERT INTO roles (id, name, role_key, description, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, 0, ?, ?)",
    [id, data.name, data.roleKey, data.description || "", currentTime, currentTime]
  );

  const result = await query<Record<string, unknown>>("SELECT id, name, role_key, description, is_system, created_at, updated_at FROM roles WHERE id = ?", [id]);
  return rowToCamelCase<RoleRow>((result.rows || [])[0]);
}

export async function updateRole(id: string, data: UpdateRoleData): Promise<RoleRow> {
  const existingResult = await query<Record<string, unknown>>("SELECT id, role_key, is_system FROM roles WHERE id = ?", [id]);
  const existing = (existingResult.rows || [])[0];
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  const isSystem = existing.is_system;
  if (isSystem === 1 && existing.role_key === "admin") {
    throw new Error("FORBIDDEN");
  }

  const currentTime = now();
  await query(
    "UPDATE roles SET name = ?, description = ?, updated_at = ? WHERE id = ?",
    [data.name, data.description || "", currentTime, id]
  );

  const result = await query<Record<string, unknown>>("SELECT id, name, role_key, description, is_system, created_at, updated_at FROM roles WHERE id = ?", [id]);
  return rowToCamelCase<RoleRow>((result.rows || [])[0]);
}

export async function deleteRole(id: string): Promise<void> {
  const existingResult = await query<Record<string, unknown>>("SELECT id, is_system FROM roles WHERE id = ?", [id]);
  const existing = (existingResult.rows || [])[0];
  if (!existing) {
    throw new Error("NOT_FOUND");
  }

  if (existing.is_system === 1) {
    throw new Error("FORBIDDEN");
  }

  const userCountResult = await query("SELECT COUNT(*) AS cnt FROM users WHERE role_id = ?", [id]);
  const userCount = (userCountResult.rows || [])[0] as Record<string, unknown> | undefined;
  if (userCount && Number(userCount.cnt) > 0) {
    throw new Error("ROLE_HAS_USERS");
  }

  await query("DELETE FROM role_permissions WHERE role_id = ?", [id]);
  await query("DELETE FROM roles WHERE id = ?", [id]);
}

export async function getRolePermissions(roleId: string): Promise<Array<{ id: string; permissionKey: string; label: string; module: string; action: string }>> {
  const result = await query<Record<string, unknown>>(
    `SELECT p.id, p.permission_key, p.label, p.module, p.action
     FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id
     WHERE rp.role_id = ? ORDER BY p.sort_order`,
    [roleId]
  );
  return rowsToCamelCase<{ id: string; permissionKey: string; label: string; module: string; action: string }>(result.rows || []);
}

export async function updateRolePermissions(roleId: string, permissionIds: string[]): Promise<void> {
  const existingResult = await query("SELECT id FROM roles WHERE id = ?", [roleId]);
  if ((existingResult.rows || []).length === 0) {
    throw new Error("NOT_FOUND");
  }

  const currentTime = now();
  await query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);

  for (const permId of permissionIds) {
    await query(
      "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)",
      [roleId, permId, currentTime]
    );
  }
}

export async function getRoleUserCount(roleId: string): Promise<number> {
  const result = await query("SELECT COUNT(*) AS cnt FROM users WHERE role_id = ?", [roleId]);
  const row = (result.rows || [])[0] as Record<string, unknown> | undefined;
  return row ? Number(row.cnt) : 0;
}
