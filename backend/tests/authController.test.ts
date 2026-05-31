import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/database-adapter.js", () => ({
  query: vi.fn(),
  adaptSQL: vi.fn((sql: string) => sql),
  getDatabaseType: vi.fn(() => "sqlite"),
}));
vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data, message) => ({ success: true, message: message || "操作成功", data })),
  rowToCamelCase: vi.fn((row) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = value;
    }
    return result;
  }),
}));
vi.mock("../src/middleware/auth.js", () => ({
  generateToken: vi.fn(() => Promise.resolve("mock-jwt-token")),
}));
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(() => Promise.resolve("hashed-password")),
    compare: vi.fn(() => Promise.resolve(true)),
  },
}));

import bcrypt from "bcryptjs";
import { query } from "../src/config/database-adapter.js";
import { register, login, getCurrentUser, updateProfile, changePassword } from "../src/controllers/authController.js";

const mockQuery = vi.mocked(query);

function createMockReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    body: {},
    user: {},
    ...overrides,
  };
}

function createMockRes(): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("authController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    it("注册成功应返回 201", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const req = createMockReq({
        body: { username: "testuser", password: "123456" },
      });
      const res = createMockRes();

      await register(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "注册成功",
          data: expect.objectContaining({
            token: "mock-jwt-token",
          }),
        }),
      );
    });

    it("用户名已存在应返回 409", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: "existing-id" }] });

      const req = createMockReq({
        body: { username: "duplicate", password: "123456" },
      });
      const res = createMockRes();

      await register(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "用户名已存在",
      });
    });
  });

  describe("login", () => {
    it("登录成功应返回用户信息和 token", async () => {
      const dbUser = {
        id: "user-1",
        username: "testuser",
        password: "hashed-password",
        role: "formulist",
        role_id: null,
        display_name: "测试用户",
        avatar: null,
        bio: null,
        email: "test@example.com",
        phone: "13800138000",
        created_at: "2026-01-01T00:00:00.000Z",
      };
      mockQuery.mockResolvedValueOnce({ rows: [dbUser] });

      const req = createMockReq({
        body: { username: "testuser", password: "123456" },
      });
      const res = createMockRes();

      await login(req as never, res as never);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "登录成功",
          data: expect.objectContaining({
            token: "mock-jwt-token",
          }),
        }),
      );
    });

    it("用户不存在应返回 401", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const req = createMockReq({
        body: { username: "nouser", password: "123456" },
      });
      const res = createMockRes();

      await login(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "用户名或密码错误",
      });
    });

    it("密码错误应返回 401", async () => {
      const dbUser = {
        id: "user-1",
        username: "testuser",
        password: "hashed-password",
        role: "formulist",
        role_id: null,
        display_name: "测试",
        avatar: null,
        bio: null,
        email: "test@example.com",
        phone: "13800138000",
        created_at: "2026-01-01T00:00:00.000Z",
      };
      mockQuery.mockResolvedValueOnce({ rows: [dbUser] });
      vi.mocked(bcrypt.compare).mockResolvedValueOnce(false as never);

      const req = createMockReq({
        body: { username: "testuser", password: "wrongpass" },
      });
      const res = createMockRes();

      await login(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "用户名或密码错误",
      });
    });
  });

  describe("getCurrentUser", () => {
    it("获取当前用户成功", async () => {
      const dbUser = {
        id: "user-1",
        username: "testuser",
        role: "formulist",
        display_name: "测试用户",
        avatar: null,
        bio: null,
        email: "test@example.com",
        phone: "13800138000",
        created_at: "2026-01-01T00:00:00.000Z",
      };
      mockQuery.mockResolvedValueOnce({ rows: [dbUser] });

      const req = createMockReq({ user: { userId: "user-1" } });
      const res = createMockRes();

      await getCurrentUser(req as never, res as never);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        }),
      );
    });

    it("用户不存在应返回 404", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const req = createMockReq({ user: { userId: "nonexistent" } });
      const res = createMockRes();

      await getCurrentUser(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "用户不存在",
      });
    });
  });

  describe("changePassword", () => {
    it("缺少字段应返回 400", async () => {
      const req = createMockReq({
        body: { oldPassword: "", newPassword: "" },
        user: { userId: "user-1" },
      });
      const res = createMockRes();

      await changePassword(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "请输入当前密码和新密码",
      });
    });

    it("修改密码成功", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ password: "old-hashed" }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const req = createMockReq({
        body: { oldPassword: "oldpass", newPassword: "newpass123" },
        user: { userId: "user-1" },
      });
      const res = createMockRes();

      await changePassword(req as never, res as never);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "密码修改成功",
        }),
      );
    });
  });

  describe("updateProfile", () => {
    it("邮箱格式不正确应返回 400", async () => {
      const req = createMockReq({
        body: { email: "invalid-email" },
        user: { userId: "user-1" },
      });
      const res = createMockRes();

      await updateProfile(req as never, res as never);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "邮箱格式不正确",
      });
    });
  });
});
