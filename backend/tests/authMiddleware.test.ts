import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";
import { getPermissionsByRoleId } from "../src/services/permissionService.js";
import { generateToken, authMiddleware, requirePermission, optionalAuth } from "../src/middleware/auth.js";

vi.mock("jsonwebtoken", () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock("../src/services/permissionService.js", () => ({
  getPermissionsByRoleId: vi.fn(),
}));

function createMockReq(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    headers: {},
    ...overrides,
  };
}

function createMockRes(): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function createMockNext(): ReturnType<typeof vi.fn> {
  return vi.fn();
}

describe("auth 中间件", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateToken", () => {
    it("admin 角色应生成包含全部权限的 token", async () => {
      vi.mocked(jwt.sign).mockReturnValue("admin-token" as never);

      const result = await generateToken({
        userId: "u1",
        username: "admin",
        role: "admin",
      });

      expect(result).toBe("admin-token");
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: "u1",
          userId: "u1",
          username: "admin",
          role: "admin",
          roleId: null,
          permissions: ["*"],
        }),
        expect.any(String),
        { expiresIn: "7d" },
      );
      expect(getPermissionsByRoleId).not.toHaveBeenCalled();
    });

    it("非 admin 角色有 roleId 时应查询权限并生成 token", async () => {
      vi.mocked(getPermissionsByRoleId).mockResolvedValue(["formula:read", "formula:write"]);
      vi.mocked(jwt.sign).mockReturnValue("role-token" as never);

      const result = await generateToken({
        userId: "u2",
        username: "formulist",
        role: "formulist",
        roleId: "role-123",
      });

      expect(result).toBe("role-token");
      expect(getPermissionsByRoleId).toHaveBeenCalledWith("role-123");
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: ["formula:read", "formula:write"],
          roleId: "role-123",
        }),
        expect.any(String),
        { expiresIn: "7d" },
      );
    });

    it("非 admin 角色无 roleId 时权限为空数组", async () => {
      vi.mocked(jwt.sign).mockReturnValue("no-role-token" as never);

      const result = await generateToken({
        userId: "u3",
        username: "guest",
        role: "formulist",
      });

      expect(result).toBe("no-role-token");
      expect(getPermissionsByRoleId).not.toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: [],
          roleId: null,
        }),
        expect.any(String),
        { expiresIn: "7d" },
      );
    });
  });

  describe("authMiddleware", () => {
    it("有效 token 应设置 req.user 并调用 next", () => {
      const decoded = {
        userId: "u1",
        role: "admin",
        roleId: null,
        permissions: ["*"],
      };
      vi.mocked(jwt.verify).mockReturnValue(decoded as never);

      const req = createMockReq({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = createMockRes();
      const next = createMockNext();

      authMiddleware(req as never, res as never, next);

      expect(req.user).toEqual({
        userId: "u1",
        role: "admin",
        roleId: undefined,
        permissions: ["*"],
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("无 authorization 头应返回 401 UNAUTHORIZED", () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      authMiddleware(req as never, res as never, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "Missing or invalid authorization header", code: "UNAUTHORIZED" },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("格式错误的 authorization 头应返回 401 UNAUTHORIZED", () => {
      const req = createMockReq({
        headers: { authorization: "Basic abc123" },
      });
      const res = createMockRes();
      const next = createMockNext();

      authMiddleware(req as never, res as never, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "Missing or invalid authorization header", code: "UNAUTHORIZED" },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("过期 token 应返回 401 TOKEN_EXPIRED", () => {
      const error = new Error("jwt expired");
      error.name = "TokenExpiredError";
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw error;
      });

      const req = createMockReq({
        headers: { authorization: "Bearer expired-token" },
      });
      const res = createMockRes();
      const next = createMockNext();

      authMiddleware(req as never, res as never, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "Token has expired", code: "TOKEN_EXPIRED" },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("无效 token 应返回 401 INVALID_TOKEN", () => {
      const error = new Error("invalid signature");
      error.name = "JsonWebTokenError";
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw error;
      });

      const req = createMockReq({
        headers: { authorization: "Bearer bad-token" },
      });
      const res = createMockRes();
      const next = createMockNext();

      authMiddleware(req as never, res as never, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "Invalid token", code: "INVALID_TOKEN" },
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("requirePermission", () => {
    it("admin 用户应通过任意权限检查", () => {
      const middleware = requirePermission("formula:delete");
      const req = createMockReq({
        user: { userId: "u1", role: "admin", permissions: ["*"] },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req as never, res as never, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("拥有所需权限的用户应通过检查", () => {
      const middleware = requirePermission("formula:write");
      const req = createMockReq({
        user: { userId: "u2", role: "formulist", permissions: ["formula:read", "formula:write"] },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req as never, res as never, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("缺少权限的用户应返回 403 FORBIDDEN", () => {
      const middleware = requirePermission("formula:delete");
      const req = createMockReq({
        user: { userId: "u2", role: "formulist", permissions: ["formula:read"] },
      });
      const res = createMockRes();
      const next = createMockNext();

      middleware(req as never, res as never, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "Insufficient permissions. Required: formula:delete", code: "FORBIDDEN" },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("无用户信息应返回 401 UNAUTHORIZED", () => {
      const middleware = requirePermission("formula:read");
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      middleware(req as never, res as never, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "Authentication required", code: "UNAUTHORIZED" },
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("optionalAuth", () => {
    it("有效 token 应设置 req.user 并调用 next", () => {
      const decoded = {
        userId: "u1",
        role: "formulist",
        roleId: "role-1",
        permissions: ["formula:read"],
      };
      vi.mocked(jwt.verify).mockReturnValue(decoded as never);

      const req = createMockReq({
        headers: { authorization: "Bearer valid-token" },
      });
      const res = createMockRes();
      const next = createMockNext();

      optionalAuth(req as never, res as never, next);

      expect(req.user).toEqual({
        userId: "u1",
        role: "formulist",
        roleId: "role-1",
        permissions: ["formula:read"],
      });
      expect(next).toHaveBeenCalled();
    });

    it("无 token 时应直接调用 next 不报错", () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = createMockNext();

      optionalAuth(req as never, res as never, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("无效 token 时应直接调用 next 不报错", () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error("invalid token");
      });

      const req = createMockReq({
        headers: { authorization: "Bearer invalid-token" },
      });
      const res = createMockRes();
      const next = createMockNext();

      optionalAuth(req as never, res as never, next);

      expect(req.user).toBeUndefined();
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
