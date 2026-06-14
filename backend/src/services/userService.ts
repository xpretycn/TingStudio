import { query } from "../config/database-adapter.js";
import { buildPagination, buildLike, rowsToCamelCase, now, generateId } from "../utils/helpers.js";
import bcrypt from "bcryptjs";

interface UserListRow {
  id: string;
  username: string;
  role: string;
  displayName: string;
  email: string;
  phone: string;
  isActive: number;
  roleId: string | null;
  roleName: string | null;
  createdAt: string;
}

interface UserListFilters {
  keyword?: string;
  roleId?: string;
  isActive?: number;
  page?: number;
  pageSize?: number;
}

interface UserListResult {
  list: UserListRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export async function getUserList(filters: UserListFilters): Promise<UserListResult> {
  const { keyword, roleId, isActive, page, pageSize } = filters;
  const { page: p, pageSize: size, offset } = buildPagination(page, pageSize);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (keyword) {
    conditions.push("(u.username LIKE ? OR u.display_name LIKE ? OR u.email LIKE ?)");
    const likeVal = buildLike(keyword);
    params.push(likeVal, likeVal, likeVal);
  }

  if (roleId) {
    conditions.push("u.role_id = ?");
    params.push(roleId);
  }

  if (isActive !== undefined && isActive !== null) {
    conditions.push("u.is_active = ?");
    params.push(isActive);
  }

  const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countResult = await query<{ cnt: number }>("SELECT COUNT(*) AS cnt FROM users u " + whereClause, params);
  const total = Number((countResult.rows || [])[0]?.cnt || 0);

  const result = await query<Record<string, unknown>>(
    `SELECT u.id, u.username, u.role, u.display_name, u.email, u.phone, u.is_active, u.role_id, u.created_at,
       r.name AS role_name
     FROM users u LEFT JOIN roles r ON u.role_id = r.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, size, offset],
  );

  const list = rowsToCamelCase<UserListRow>(result.rows || []);

  // Fallback: if role_name is null (role_id not set), derive from role field
  const ROLE_DISPLAY_MAP: Record<string, string> = { admin: "管理员", formulist: "配方师" };
  for (const user of list) {
    if (!user.roleName && user.role) {
      user.roleName = ROLE_DISPLAY_MAP[user.role] || user.role;
    }
  }

  return {
    list,
    pagination: {
      page: p,
      pageSize: size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
}

export async function updateUserRole(userId: string, roleId: string): Promise<Record<string, unknown>> {
  const roleResult = await query<Record<string, unknown>>("SELECT id, role_key, name FROM roles WHERE id = ?", [
    roleId,
  ]);
  const role = (roleResult.rows || [])[0];
  if (!role) {
    throw new Error("NOT_FOUND");
  }

  const currentTime = now();
  await query("UPDATE users SET role_id = ?, role = ?, updated_at = ? WHERE id = ?", [
    roleId,
    (role as Record<string, unknown>).role_key,
    currentTime,
    userId,
  ]);

  const userResult = await query<Record<string, unknown>>(
    "SELECT id, username, role, display_name, email, phone, is_active, role_id, created_at FROM users WHERE id = ?",
    [userId],
  );
  return (userResult.rows || [])[0] as Record<string, unknown>;
}

export async function toggleUserActive(userId: string, isActive: number, currentUserId: string): Promise<void> {
  if (userId === currentUserId) {
    throw new Error("CANNOT_DISABLE_SELF");
  }

  const userResult = await query<Record<string, unknown>>("SELECT id, role FROM users WHERE id = ?", [userId]);
  const user = (userResult.rows || [])[0];
  if (!user) {
    throw new Error("NOT_FOUND");
  }

  if (user.role === "admin" && isActive === 0) {
    throw new Error("CANNOT_DISABLE_ADMIN");
  }

  const currentTime = now();
  await query("UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?", [isActive, currentTime, userId]);
}

export async function createUser(params: {
  username: string;
  password: string;
  role?: string;
  displayName?: string;
  email?: string;
  phone?: string;
}): Promise<Record<string, unknown>> {
  const { username, password, role = "formulist", displayName, email, phone } = params;

  // 检查用户名是否已存在
  const existing = await query<Record<string, unknown>>("SELECT id FROM users WHERE username = ?", [username]);
  if ((existing.rows || []).length > 0) {
    throw new Error("DUPLICATE_USERNAME");
  }

  const userId = generateId();
  const hashedPassword = await bcrypt.hash(password, 10);
  const currentTime = now();

  // 查找角色 ID
  const roleResult = await query<Record<string, unknown>>("SELECT id FROM roles WHERE role_key = ?", [role]);
  const roleId = ((roleResult.rows || [])[0]?.id as string | undefined) || null;

  await query(
    `INSERT INTO users (id, username, password, role, role_id, display_name, email, phone, is_active, must_change_password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?)`,
    [
      userId,
      username,
      hashedPassword,
      role,
      roleId,
      displayName || null,
      email || null,
      phone || null,
      currentTime,
      currentTime,
    ],
  );

  const result = await query<Record<string, unknown>>(
    "SELECT id, username, role, role_id, display_name, email, phone, is_active, must_change_password, created_at FROM users WHERE id = ?",
    [userId],
  );
  return (result.rows || [])[0] as Record<string, unknown>;
}

export async function getUserCountByRoleId(roleId: string): Promise<number> {
  const result = await query("SELECT COUNT(*) AS cnt FROM users WHERE role_id = ?", [roleId]);
  const row = (result.rows || [])[0] as Record<string, unknown> | undefined;
  return row ? Number(row.cnt) : 0;
}
