import { describe, it, expect, vi, beforeEach } from "vitest";

const mockQuery = vi.fn();

vi.mock("../src/config/database-adapter.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  buildPagination: vi.fn((page, pageSize) => ({ page: page || 1, pageSize: pageSize || 20, offset: 0 })),
  buildLike: vi.fn((keyword) => `%${keyword}%`),
  rowsToCamelCase: vi.fn((rows) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
        result[camelKey] = value;
      }
      return result;
    })
  ),
  rowToCamelCase: vi.fn((row) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camelKey] = value;
    }
    return result;
  }),
}));

describe("userService - 用户服务", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserList - 获取用户列表", () => {
    it("无筛选条件时返回分页用户列表", async () => {
      const mockRows = [
        {
          id: "user-001",
          username: "zhangsan",
          role: "admin",
          display_name: "张三",
          email: "zhang@test.com",
          phone: "13800000001",
          is_active: 1,
          role_id: "role-001",
          created_at: "2026-05-22T00:00:00.000Z",
          role_name: "管理员",
        },
        {
          id: "user-002",
          username: "lisi",
          role: "formulist",
          display_name: "李四",
          email: "li@test.com",
          phone: "13800000002",
          is_active: 1,
          role_id: "role-002",
          created_at: "2026-05-22T01:00:00.000Z",
          role_name: "配方师",
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 2 }] });
      mockQuery.mockResolvedValueOnce({ rows: mockRows });

      const { getUserList } = await import("../src/services/userService.js");
      const result = await getUserList({});

      expect(result.list).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 2,
        totalPages: 1,
      });
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("有关键字筛选时构建正确的WHERE条件", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 1 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getUserList } = await import("../src/services/userService.js");
      await getUserList({ keyword: "张三" });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[0]).toContain("WHERE");
      expect(countCall[0]).toContain("LIKE");
      expect(countCall[1]).toEqual(["%张三%", "%张三%", "%张三%"]);

      const dataCall = mockQuery.mock.calls[1];
      expect(dataCall[0]).toContain("LIKE");
      expect(dataCall[1]).toEqual(["%张三%", "%张三%", "%张三%", 20, 0]);
    });

    it("有角色和状态筛选时构建正确的WHERE条件", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getUserList } = await import("../src/services/userService.js");
      await getUserList({ roleId: "role-002", isActive: 1 });

      const countCall = mockQuery.mock.calls[0];
      expect(countCall[0]).toContain("role_id = ?");
      expect(countCall[0]).toContain("is_active = ?");
      expect(countCall[1]).toEqual(["role-002", 1]);

      const dataCall = mockQuery.mock.calls[1];
      expect(dataCall[1]).toEqual(["role-002", 1, 20, 0]);
    });

    it("无用户时返回空列表", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { getUserList } = await import("../src/services/userService.js");
      const result = await getUserList({});

      expect(result.list).toEqual([]);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
      });
    });
  });

  describe("updateUserRole - 更新用户角色", () => {
    it("成功更新用户角色并返回更新后的用户信息", async () => {
      const mockRole = { id: "role-002", role_key: "formulist", name: "配方师" };
      const mockUpdatedUser = {
        id: "user-001",
        username: "zhangsan",
        role: "formulist",
        display_name: "张三",
        email: "zhang@test.com",
        phone: "13800000001",
        is_active: 1,
        role_id: "role-002",
        created_at: "2026-05-22T00:00:00.000Z",
      };

      mockQuery.mockResolvedValueOnce({ rows: [mockRole] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const { updateUserRole } = await import("../src/services/userService.js");
      const result = await updateUserRole("user-001", "role-002");

      expect(mockQuery).toHaveBeenCalledTimes(3);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT id, role_key, name FROM roles WHERE id = ?",
        ["role-002"]
      );
      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE users SET role_id = ?, role = ?, updated_at = ? WHERE id = ?",
        ["role-002", "formulist", "2026-05-22T00:00:00.000Z", "user-001"]
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("角色不存在时抛出NOT_FOUND错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { updateUserRole } = await import("../src/services/userService.js");

      await expect(updateUserRole("user-001", "role-nonexistent")).rejects.toThrow("NOT_FOUND");
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("更新角色时应正确传递role_key字段", async () => {
      const mockRole = { id: "role-001", role_key: "admin", name: "管理员" };

      mockQuery.mockResolvedValueOnce({ rows: [mockRole] });
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "user-002", role: "admin" }] });

      const { updateUserRole } = await import("../src/services/userService.js");
      await updateUserRole("user-002", "role-001");

      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[0]).toContain("UPDATE users SET role_id = ?, role = ?");
      expect(updateCall[1][1]).toBe("admin");
    });
  });

  describe("toggleUserActive - 切换用户启用状态", () => {
    it("禁用自己时抛出CANNOT_DISABLE_SELF错误", async () => {
      const { toggleUserActive } = await import("../src/services/userService.js");

      await expect(toggleUserActive("user-001", 0, "user-001")).rejects.toThrow("CANNOT_DISABLE_SELF");
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("用户不存在时抛出NOT_FOUND错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { toggleUserActive } = await import("../src/services/userService.js");

      await expect(toggleUserActive("user-nonexistent", 0, "user-001")).rejects.toThrow("NOT_FOUND");
      expect(mockQuery).toHaveBeenCalledTimes(1);
    });

    it("禁用admin用户时抛出CANNOT_DISABLE_ADMIN错误", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "user-002", role: "admin" }] });

      const { toggleUserActive } = await import("../src/services/userService.js");

      await expect(toggleUserActive("user-002", 0, "user-001")).rejects.toThrow("CANNOT_DISABLE_ADMIN");
    });

    it("成功启用非admin用户时更新is_active字段", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "user-002", role: "formulist" }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { toggleUserActive } = await import("../src/services/userService.js");
      await toggleUserActive("user-002", 1, "user-001");

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledWith(
        "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?",
        [1, "2026-05-22T00:00:00.000Z", "user-002"]
      );
    });

    it("禁用非admin用户时正常执行", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "user-003", role: "formulist" }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const { toggleUserActive } = await import("../src/services/userService.js");
      await toggleUserActive("user-003", 0, "user-001");

      const updateCall = mockQuery.mock.calls[1];
      expect(updateCall[1]).toEqual([0, "2026-05-22T00:00:00.000Z", "user-003"]);
    });
  });

  describe("getUserCountByRoleId - 按角色统计用户数", () => {
    it("返回指定角色的用户数量", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 5 }] });

      const { getUserCountByRoleId } = await import("../src/services/userService.js");
      const result = await getUserCountByRoleId("role-002");

      expect(result).toBe(5);
      expect(mockQuery).toHaveBeenCalledWith(
        "SELECT COUNT(*) AS cnt FROM users WHERE role_id = ?",
        ["role-002"]
      );
    });

    it("无匹配用户时返回0", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ cnt: 0 }] });

      const { getUserCountByRoleId } = await import("../src/services/userService.js");
      const result = await getUserCountByRoleId("role-nonexistent");

      expect(result).toBe(0);
    });
  });
});
