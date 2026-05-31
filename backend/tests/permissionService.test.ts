import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));
vi.mock("../src/config/database-adapter.js", () => ({ query: mockQuery }));
vi.mock("../src/utils/helpers.js", () => ({
  rowsToCamelCase: vi.fn((rows: Record<string, unknown>[]) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase())] = value;
      }
      return result;
    })
  ),
}));

import { getAllPermissions, getPermissionsByRoleId, getPermissionsGroupedByModule } from "../src/services/permissionService.js";

const permissionRows = [
  { id: "p1", module: "material", action: "view", permission_key: "material:view", label: "查看原料", description: "查看原料列表", sort_order: 1, created_at: "2026-01-01T00:00:00Z" },
  { id: "p2", module: "material", action: "edit", permission_key: "material:edit", label: "编辑原料", description: "编辑原料信息", sort_order: 2, created_at: "2026-01-01T00:00:00Z" },
  { id: "p3", module: "formula", action: "view", permission_key: "formula:view", label: "查看配方", description: "查看配方列表", sort_order: 3, created_at: "2026-01-01T00:00:00Z" },
  { id: "p4", module: "system", action: "manage", permission_key: "system:manage", label: "系统管理", description: "管理系统配置", sort_order: 4, created_at: "2026-01-01T00:00:00Z" },
];

describe("permissionService - 权限服务", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  describe("getAllPermissions()", () => {
    it("应该查询所有权限并返回 camelCase 结果", async () => {
      mockQuery.mockResolvedValue({ rows: permissionRows });

      const result = await getAllPermissions();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT id, module, action, permission_key, label, description, sort_order, created_at FROM permissions ORDER BY sort_order"
      );
      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty("permissionKey", "material:view");
      expect(result[0]).toHaveProperty("sortOrder", 1);
    });

    it("应该在没有权限数据时返回空数组", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await getAllPermissions();

      expect(result).toEqual([]);
    });

    it("应该在数据库返回 null rows 时返回空数组", async () => {
      mockQuery.mockResolvedValue({ rows: null });

      const result = await getAllPermissions();

      expect(result).toEqual([]);
    });
  });

  describe("getPermissionsByRoleId()", () => {
    it("应该根据角色 ID 返回权限 key 列表", async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { permission_key: "material:view" },
          { permission_key: "formula:view" },
        ],
      });

      const result = await getPermissionsByRoleId("role-123");

      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT p.permission_key FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id WHERE rp.role_id = ?",
        ["role-123"]
      );
      expect(result).toEqual(["material:view", "formula:view"]);
    });

    it("应该在角色没有任何权限时返回空数组", async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await getPermissionsByRoleId("role-empty");

      expect(result).toEqual([]);
    });

    it("应该在数据库返回 null rows 时返回空数组", async () => {
      mockQuery.mockResolvedValue({ rows: null });

      const result = await getPermissionsByRoleId("role-456");

      expect(result).toEqual([]);
    });
  });

  describe("getPermissionsGroupedByModule()", () => {
    it("应该按模块分组并映射中文标签", async () => {
      mockQuery.mockResolvedValue({ rows: permissionRows });

      const result = await getPermissionsGroupedByModule();

      expect(result).toHaveLength(3);
      const materialGroup = result.find((g) => g.module === "material");
      expect(materialGroup).toBeDefined();
      expect(materialGroup!.moduleLabel).toBe("原料管理");
      expect(materialGroup!.permissions).toHaveLength(2);

      const formulaGroup = result.find((g) => g.module === "formula");
      expect(formulaGroup).toBeDefined();
      expect(formulaGroup!.moduleLabel).toBe("配方管理");
      expect(formulaGroup!.permissions).toHaveLength(1);

      const systemGroup = result.find((g) => g.module === "system");
      expect(systemGroup).toBeDefined();
      expect(systemGroup!.moduleLabel).toBe("系统配置");
    });

    it("应该对未知模块使用模块名作为标签", async () => {
      mockQuery.mockResolvedValue({
        rows: [
          { id: "p5", module: "unknown_module", action: "view", permission_key: "unknown_module:view", label: "未知模块查看", description: "", sort_order: 5, created_at: "2026-01-01T00:00:00Z" },
        ],
      });

      const result = await getPermissionsGroupedByModule();

      expect(result).toHaveLength(1);
      expect(result[0].moduleLabel).toBe("unknown_module");
    });
  });
});
