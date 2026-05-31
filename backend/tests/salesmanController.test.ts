import { describe, it, expect, beforeEach, vi } from "vitest";
import { Request, Response } from "express";

const mockQuery = vi.fn();
vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data: unknown, message?: string) => ({
    success: true,
    message: message || "操作成功",
    data,
  })),
  successWithPagination: vi.fn(
    (list: unknown[], total: number, page: number, pageSize: number) => ({
      success: true,
      message: "查询成功",
      data: {
        list,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
    })
  ),
  buildPagination: vi.fn((p?: number, ps?: number) => ({
    page: p || 1,
    pageSize: ps || 20,
    offset: 0,
  })),
  buildLike: vi.fn((k: string) => `%${k}%`),
  rowToCamelCase: vi.fn((row: Record<string, unknown>) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      result[
        key.replace(/_([a-z])/g, (_match: string, c: string) => c.toUpperCase())
      ] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows: Record<string, unknown>[]) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[
          key.replace(/_([a-z])/g, (_match: string, c: string) => c.toUpperCase())
        ] = value;
      }
      return result;
    })
  ),
}));

describe("salesmanController - 业务员管理控制器", () => {
  let mockReq: Partial<Request> & { user?: { userId: string; role: string } };
  let mockRes: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockQuery.mockImplementation(() => Promise.resolve([[], null]));
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: undefined,
    };
    mockRes = {
      json: jsonMock,
      status: statusMock,
    };
  });

  describe("getSalesmen", () => {
    it("应该返回业务员分页列表", async () => {
      mockReq.query = {
        keyword: "张",
        status: "active",
        page: "1",
        pageSize: "20",
      };
      const salesmenRows = [
        {
          id: "s-001",
          name: "张三",
          code: "YW00001",
          status: "active",
          department: "销售一部",
          phone: "13800138001",
          email: "zhang@test.com",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "s-002",
          name: "张四",
          code: "YW00002",
          status: "active",
          department: "销售二部",
          phone: "13800138002",
          email: "zhang4@test.com",
          created_at: "2026-01-02T00:00:00.000Z",
        },
      ];
      mockQuery
        .mockResolvedValueOnce([salesmenRows, null])
        .mockResolvedValueOnce([[{ total: 2 }], null]);

      const { getSalesmen } = await import(
        "../src/controllers/salesmanController.js"
      );
      await getSalesmen(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            list: expect.arrayContaining([
              expect.objectContaining({ id: "s-001", name: "张三" }),
              expect.objectContaining({ id: "s-002", name: "张四" }),
            ]),
            pagination: expect.objectContaining({
              total: 2,
              page: 1,
              pageSize: 20,
            }),
          }),
        })
      );
    });
  });

  describe("getSalesman", () => {
    it("应该返回指定业务员详情", async () => {
      mockReq.params = { id: "s-001" };
      const salesmanRow = {
        id: "s-001",
        name: "张三",
        code: "YW00001",
        status: "active",
        department: "销售一部",
        phone: "13800138001",
        email: "zhang@test.com",
        created_at: "2026-01-01T00:00:00.000Z",
      };
      mockQuery.mockResolvedValueOnce([[salesmanRow], null]);

      const { getSalesman } = await import(
        "../src/controllers/salesmanController.js"
      );
      await getSalesman(mockReq as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: "s-001", name: "张三" }),
        })
      );
    });

    it("业务员不存在应返回404", async () => {
      mockReq.params = { id: "non-existent" };
      mockQuery.mockResolvedValueOnce([[], null]);

      const { getSalesman } = await import(
        "../src/controllers/salesmanController.js"
      );
      await getSalesman(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "业务员不存在",
        })
      );
    });
  });

  describe("createSalesman", () => {
    it("应该成功创建业务员并返回201", async () => {
      mockReq.body = {
        name: "李四",
        department: "销售一部",
        phone: "13900139001",
        email: "li@test.com",
      };
      mockReq.user = { userId: "user-001", role: "admin" };
      const newSalesmanRow = {
        id: "mock-id-123",
        name: "李四",
        code: "YW00002",
        status: "active",
        department: "销售一部",
        phone: "13900139001",
        email: "li@test.com",
        created_at: "2026-05-22T00:00:00.000Z",
      };
      mockQuery
        .mockResolvedValueOnce([[{ code: "YW00001" }], null])
        .mockResolvedValueOnce([[], null])
        .mockResolvedValueOnce([{ changes: 1 }, null])
        .mockResolvedValueOnce([[newSalesmanRow], null]);

      const { createSalesman } = await import(
        "../src/controllers/salesmanController.js"
      );
      await createSalesman(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: "mock-id-123",
            name: "李四",
          }),
        })
      );
    });

    it("工号冲突应返回409", async () => {
      mockReq.body = {
        name: "王五",
        department: "销售二部",
        phone: "13900139002",
        email: "wang@test.com",
      };
      mockReq.user = { userId: "user-001", role: "admin" };
      mockQuery
        .mockResolvedValueOnce([[{ code: "YW00001" }], null])
        .mockResolvedValueOnce([[], null])
        .mockRejectedValueOnce(
          new Error("UNIQUE constraint failed: salesmen.code")
        );

      const { createSalesman } = await import(
        "../src/controllers/salesmanController.js"
      );
      await createSalesman(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "业务员工号已存在",
        })
      );
    });
  });

  describe("deleteSalesman", () => {
    it("被配方引用时应返回400", async () => {
      mockReq.params = { id: "s-001" };
      mockQuery
        .mockResolvedValueOnce([[{ id: "s-001", name: "张三" }], null])
        .mockResolvedValueOnce([[{ cnt: 3 }], null]);

      const { deleteSalesman } = await import(
        "../src/controllers/salesmanController.js"
      );
      await deleteSalesman(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("已被 3 个配方引用"),
        })
      );
    });

    it("业务员不存在应返回404", async () => {
      mockReq.params = { id: "non-existent" };
      mockQuery.mockResolvedValueOnce([[], null]);

      const { deleteSalesman } = await import(
        "../src/controllers/salesmanController.js"
      );
      await deleteSalesman(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "业务员不存在",
        })
      );
    });
  });

  describe("toggleSalesmanStatus", () => {
    it("无效状态值应返回400", async () => {
      mockReq.params = { id: "s-001" };
      mockReq.body = { status: "invalid_status" };

      const { toggleSalesmanStatus } = await import(
        "../src/controllers/salesmanController.js"
      );
      await toggleSalesmanStatus(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "无效的状态值",
        })
      );
    });
  });
});
