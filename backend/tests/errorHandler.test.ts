import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { errorHandler, notFoundHandler } from "../src/middleware/errorHandler.js";

interface MockResponse {
  statusCode: number;
  body: Record<string, unknown>;
  status(code: number): MockResponse;
  json(data: Record<string, unknown>): MockResponse;
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    body: {},
    status(code: number): MockResponse {
      res.statusCode = code;
      return res;
    },
    json(data: Record<string, unknown>): MockResponse {
      res.body = data;
      return res;
    },
  };
  return res;
}

function createMockReq(method: string, path: string) {
  return { method, path };
}

const originalNodeEnv = process.env.NODE_ENV;

describe("errorHandler 中间件", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    process.env.NODE_ENV = originalNodeEnv;
  });

  it("500 错误返回通用消息 Internal server error", () => {
    const err = new Error("数据库连接失败") as Error & { status?: number; code?: string };
    err.status = 500;
    const req = createMockReq("GET", "/api/materials");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(res.statusCode).toBe(500);
    const error = res.body.error as Record<string, unknown>;
    expect(error.message).toBe("Internal server error");
  });

  it("非 500 错误返回实际错误消息", () => {
    const err = new Error("资源不存在") as Error & { status?: number; code?: string };
    err.status = 404;
    const req = createMockReq("GET", "/api/materials/123");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(res.statusCode).toBe(404);
    const error = res.body.error as Record<string, unknown>;
    expect(error.message).toBe("资源不存在");
  });

  it("错误码在响应中被保留", () => {
    const err = new Error("未授权") as Error & { status?: number; code?: string };
    err.status = 401;
    err.code = "TOKEN_EXPIRED";
    const req = createMockReq("POST", "/api/formulas");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    const error = res.body.error as Record<string, unknown>;
    expect(error.code).toBe("TOKEN_EXPIRED");
  });

  it("响应包含 timestamp、path、method", () => {
    const err = new Error("测试错误") as Error & { status?: number; code?: string };
    err.status = 400;
    const req = createMockReq("DELETE", "/api/materials/456");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    const error = res.body.error as Record<string, unknown>;
    expect(error.timestamp).toBeTruthy();
    expect(typeof error.timestamp).toBe("string");
    expect(error.path).toBe("/api/materials/456");
    expect(error.method).toBe("DELETE");
  });

  it("开发环境包含堆栈信息", () => {
    process.env.NODE_ENV = "development";
    const err = new Error("开发环境错误") as Error & { status?: number; code?: string };
    err.status = 500;
    const req = createMockReq("GET", "/api/test");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    const error = res.body.error as Record<string, unknown>;
    expect(error.stack).toBeTruthy();
    expect(typeof error.stack).toBe("string");
    expect((error.stack as string).length).toBeGreaterThan(0);
  });

  it("生产环境不包含堆栈信息", () => {
    process.env.NODE_ENV = "production";
    const err = new Error("生产环境错误") as Error & { status?: number; code?: string };
    err.status = 500;
    const req = createMockReq("GET", "/api/test");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    const error = res.body.error as Record<string, unknown>;
    expect(error.stack).toBeUndefined();
  });

  it("未指定 code 时默认为 INTERNAL_ERROR", () => {
    const err = new Error("未知错误") as Error & { status?: number; code?: string };
    const req = createMockReq("GET", "/api/unknown");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    const error = res.body.error as Record<string, unknown>;
    expect(error.code).toBe("INTERNAL_ERROR");
  });

  it("未指定 status 时默认为 500", () => {
    const err = new Error("无状态码错误") as Error & { status?: number; code?: string };
    const req = createMockReq("POST", "/api/test");
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(res.statusCode).toBe(500);
    const error = res.body.error as Record<string, unknown>;
    expect(error.message).toBe("Internal server error");
  });
});

describe("notFoundHandler 中间件", () => {
  it("返回 404 并包含正确的消息格式", () => {
    const req = createMockReq("GET", "/api/unknown-route");
    const res = createMockRes();

    notFoundHandler(req as never, res as never);

    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    const error = res.body.error as Record<string, unknown>;
    expect(error.message).toBe("Route GET /api/unknown-route not found");
    expect(error.code).toBe("NOT_FOUND");
    expect(error.timestamp).toBeTruthy();
    expect(typeof error.timestamp).toBe("string");
  });
});
