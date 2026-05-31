import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../src/config/database-adapter.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  rowsToCamelCase: vi.fn((rows: Record<string, unknown>[]) =>
    rows.map((r) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    })
  ),
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
}));

describe("roleService - 角色服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAllRoles - 获取所有角色", () => {
    it("应该返回包含权限数和用户数的角色列表", async () => {
      const mockRows = [
        {
          id: "role-1",
          name: "管理员",
          role_key: "admin",
          description: "系统管理员",
          is_system: 1,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
          permission_count: 10,
          user_count: 2,
        },
        {
          id: "role-2",
          name: "配方师",
          role_key: "formulist",
          description: "配方管理",
          is_system: 0,
          created_at: "2026-02-01T00:00:00.000Z",
          updated_at: "2026-02-01T00:00:00.000Z",
          permission_count: 5,
          user_count: 8,
        },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const { getAllRoles } = await import("../src/services/roleService.js");
      const result = await getAllRoles();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining("FROM roles r")
      );
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("role-1");
      expect(result[0].permissionCount).toBe(10);
      expect(result[0].userCount).toBe(2);
    });

    it("应该在没有角色时返回空数组", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getAllRoles } = await import("../src/services/roleService.js");
      const result = await getAllRoles();

      expect(result).toEqual([]);
    });
  });

  describe("getRoleById - 根据ID获取角色", () => {
    it("应该返回角色及其权限列表", async () => {
      const mockRoleRow = {
        id: "role-1",
        name: "管理员",
        role_key: "admin",
        description: "系统管理员",
        is_system: 1,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      };
      const mockPermRows = [
        { id: "perm-1", permission_key: "formula:read", label: "查看配方", module: "formula", action: "read" },
        { id: "perm-2", permission_key: "formula:write", label: "编辑配方", module: "formula", action: "write" },
      ];
      mockQuery.mockResolvedValueOnce({ rows: [mockRoleRow] });
      mockQuery.mockResolvedValueOnce({ rows: mockPermRows });

      const { getRoleById } = await import("../src/services/roleService.js");
      const result = await getRoleById("role-1");

      expect(result).not.toBeNull();
      expect(result!.id).toBe("role-1");
      expect(result!.permissions).toHaveLength(2);
      expect(result!.permissions[0].permissionKey).toBe("formula:read");
    });

    it("应该在角色不存在时返回null", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getRoleById } = await import("../src/services/roleService.js");
      const result = await getRoleById("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("createRole - 创建角色", () => {
    it("应该成功创建角色并返回新记录", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: "mock-id-123",
            name: "测试角色",
            role_key: "test_role",
            description: "测试描述",
            is_system: 0,
            created_at: "2026-05-22T00:00:00.000Z",
            updated_at: "2026-05-22T00:00:00.000Z",
          },
        ],
      });

      const { createRole } = await import("../src/services/roleService.js");
      const result = await createRole({
        name: "测试角色",
        roleKey: "test_role",
        description: "测试描述",
      });

      expect(result.id).toBe("mock-id-123");
      expect(result.name).toBe("测试角色");
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it("应该在role_key重复时抛出DUPLICATE_ENTRY错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "existing-role" }] });

      const { createRole } = await import("../src/services/roleService.js");

      await expect(
        createRole({ name: "重复角色", roleKey: "admin", description: "" })
      ).rejects.toThrow("DUPLICATE_ENTRY");
    });
  });

  describe("updateRole - 更新角色", () => {
    it("应该在更新admin系统角色时抛出FORBIDDEN错误", async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: "role-1", role_key: "admin", is_system: 1 }],
      });

      const { updateRole } = await import("../src/services/roleService.js");

      await expect(
        updateRole("role-1", { name: "新名称", description: "新描述" })
      ).rejects.toThrow("FORBIDDEN");
    });

    it("应该在角色不存在时抛出NOT_FOUND错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { updateRole } = await import("../src/services/roleService.js");

      await expect(
        updateRole("nonexistent", { name: "名称", description: "描述" })
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("deleteRole - 删除角色", () => {
    it("应该在角色下有用户时抛出ROLE_HAS_USERS错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "role-2", is_system: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 3 }] });

      const { deleteRole } = await import("../src/services/roleService.js");

      await expect(deleteRole("role-2")).rejects.toThrow("ROLE_HAS_USERS");
    });

    it("应该在系统角色时抛出FORBIDDEN错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "role-1", is_system: 1 }] });

      const { deleteRole } = await import("../src/services/roleService.js");

      await expect(deleteRole("role-1")).rejects.toThrow("FORBIDDEN");
    });

    it("应该成功删除角色及其权限关联", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "role-3", is_system: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
      mockQuery.mockResolvedValueOnce({ affectedRows: 2 });
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

      const { deleteRole } = await import("../src/services/roleService.js");
      await deleteRole("role-3");

      expect(mockQuery).toHaveBeenCalledTimes(4);
      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM role_permissions WHERE role_id = ?",
        ["role-3"]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM roles WHERE id = ?",
        ["role-3"]
      );
    });
  });

  describe("getRolePermissions - 获取角色权限", () => {
    it("应该返回角色的权限列表", async () => {
      const mockPermRows = [
        { id: "perm-1", permission_key: "material:read", label: "查看原料", module: "material", action: "read" },
      ];
      mockQuery.mockResolvedValueOnce({ rows: mockPermRows });

      const { getRolePermissions } = await import("../src/services/roleService.js");
      const result = await getRolePermissions("role-1");

      expect(result).toHaveLength(1);
      expect(result[0].permissionKey).toBe("material:read");
    });
  });

  describe("updateRolePermissions - 更新角色权限", () => {
    it("应该在角色不存在时抛出NOT_FOUND错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { updateRolePermissions } = await import("../src/services/roleService.js");

      await expect(
        updateRolePermissions("nonexistent", ["perm-1"])
      ).rejects.toThrow("NOT_FOUND");
    });

    it("应该先删除旧权限再插入新权限", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "role-1" }] });
      mockQuery.mockResolvedValueOnce({ affectedRows: 3 });
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });
      mockQuery.mockResolvedValueOnce({ affectedRows: 1 });

      const { updateRolePermissions } = await import("../src/services/roleService.js");
      await updateRolePermissions("role-1", ["perm-1", "perm-2"]);

      expect(mockQuery).toHaveBeenCalledWith(
        "DELETE FROM role_permissions WHERE role_id = ?",
        ["role-1"]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)",
        ["role-1", "perm-1", "2026-05-22T00:00:00.000Z"]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        "INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)",
        ["role-1", "perm-2", "2026-05-22T00:00:00.000Z"]
      );
    });
  });

  describe("getRoleUserCount - 获取角色用户数", () => {
    it("应该返回角色下的用户数量", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 5 }] });

      const { getRoleUserCount } = await import("../src/services/roleService.js");
      const count = await getRoleUserCount("role-1");

      expect(count).toBe(5);
    });

    it("应该在没有查询结果时返回0", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getRoleUserCount } = await import("../src/services/roleService.js");
      const count = await getRoleUserCount("role-1");

      expect(count).toBe(0);
    });
  });
});
