import { describe, it, expect, beforeEach, vi } from "vitest";
import { Response } from "express";

const { mockQuery, mockTransaction, mockValidateRatioFactor } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockTransaction: vi.fn(<T>(fn: () => T): T => fn()),
  mockValidateRatioFactor: vi.fn(() => ({
    allowed: true,
    level: "normal",
    message: "",
  })),
}));

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  query: mockQuery,
  transaction: mockTransaction,
}));

vi.mock("../src/utils/helpers.js", () => ({
  generateId: vi.fn(() => "mock-id-123"),
  now: vi.fn(() => "2026-05-22T00:00:00.000Z"),
  success: vi.fn((data, message) => ({
    success: true,
    message: message || "操作成功",
    data,
  })),
  successWithPagination: vi.fn((list, total, page, pageSize) => ({
    success: true,
    message: "查询成功",
    data: {
      list,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    },
  })),
  buildPagination: vi.fn((p, ps) => ({ page: p || 1, pageSize: ps || 20, offset: 0 })),
  buildLike: vi.fn((k) => `%${k}%`),
  rowToCamelCase: vi.fn((row) => {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
      result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
    }
    return result;
  }),
  rowsToCamelCase: vi.fn((rows) =>
    rows.map((r: Record<string, unknown>) => {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(r)) {
        result[key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] = value;
      }
      return result;
    }),
  ),
  generateFormulaCode: vi.fn(() => "FM123"),
}));

vi.mock("../src/services/ratioFactorValidator.js", () => ({
  validateRatioFactor: mockValidateRatioFactor,
  DEFAULT_THRESHOLDS: {},
}));

import {
  getFormula,
  createFormula,
  deleteFormula,
  updateFormula,
  publishFormula,
} from "../src/controllers/formulaController.js";

function createMockRes(): Record<string, unknown> {
  const res: Record<string, unknown> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("formulaController - 配方管理控制器", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateRatioFactor.mockReturnValue({
      allowed: true,
      level: "normal",
      message: "",
    });
  });

  describe("getFormula - 获取单个配方", () => {
    it("配方存在时返回配方详情", async () => {
      const mockFormula = {
        id: "f-001",
        name: "测试配方",
        salesman_id: "s-001",
        salesman_name: "张三",
        materials_json: "[]",
        finished_weight: 500,
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        packaging_price: 0,
        other_price: 0,
        profit_margin: 20,
        description: "测试描述",
        created_by: "user-001",
        created_at: "2026-05-22T00:00:00.000Z",
      };

      mockQuery
        .mockResolvedValueOnce([[mockFormula]])
        .mockResolvedValueOnce([[{ version_number: "v1.0" }]]);

      const req = { params: { id: "f-001" } };
      const res = createMockRes();

      await getFormula(
        req as unknown as Parameters<typeof getFormula>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
    });

    it("配方不存在时返回404", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = { params: { id: "non-existent" } };
      const res = createMockRes();

      await getFormula(
        req as unknown as Parameters<typeof getFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "配方不存在" }),
      );
    });
  });

  describe("createFormula - 创建配方", () => {
    it("创建配方成功", async () => {
      const mockSalesman = { name: "张三" };
      const mockCreatedFormula = {
        id: "mock-id-123",
        name: "新配方",
        code: "FM123",
        salesman_id: "s-001",
        salesman_name: "张三",
        materials_json: "[]",
        finished_weight: 500,
        ratio_factor: 0.18,
        supplement_ratio_factor: 1.0,
        packaging_price: 0,
        other_price: 0,
        profit_margin: 20,
        description: "测试",
        created_by: "user-001",
        created_at: "2026-05-22T00:00:00.000Z",
      };

      mockQuery
        .mockResolvedValueOnce([[mockSalesman]])
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce([[mockCreatedFormula]]);

      const req = {
        body: {
          name: "新配方",
          salesmanId: "s-001",
          materials: [],
          finishedWeight: 500,
          ratioFactor: 0.18,
        },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await createFormula(
        req as unknown as Parameters<typeof createFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(201);
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
    });

    it("业务员不存在时返回400", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = {
        body: {
          name: "新配方",
          salesmanId: "non-existent",
          materials: [],
          finishedWeight: 500,
          ratioFactor: 0.18,
        },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await createFormula(
        req as unknown as Parameters<typeof createFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "业务员不存在" }),
      );
    });

    it("ratioFactor校验不通过时返回400", async () => {
      mockValidateRatioFactor.mockReturnValue({
        allowed: false,
        level: "warning",
        message: "含量比异常",
        description: "含量比超出阈值",
      });
      mockQuery.mockResolvedValueOnce([[{ name: "张三" }]]);

      const req = {
        body: {
          name: "新配方",
          salesmanId: "s-001",
          materials: [
            { materialId: "m-001", materialName: "原料A", quantity: 100 },
          ],
          finishedWeight: 500,
          ratioFactor: 0.18,
        },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await createFormula(
        req as unknown as Parameters<typeof createFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "含量比异常" }),
      );
    });
  });

  describe("deleteFormula - 删除配方", () => {
    it("创建者本人删除配方成功", async () => {
      mockQuery
        .mockResolvedValueOnce([[{ id: "f-001", created_by: "user-001" }]])
        .mockResolvedValueOnce({ changes: 1 });

      const req = {
        params: { id: "f-001" },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await deleteFormula(
        req as unknown as Parameters<typeof deleteFormula>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
    });

    it("配方不存在时返回404", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = {
        params: { id: "non-existent" },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await deleteFormula(
        req as unknown as Parameters<typeof deleteFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "配方不存在" }),
      );
    });

    it("非管理员删除他人配方返回403", async () => {
      mockQuery.mockResolvedValueOnce([[{ id: "f-001", created_by: "other-user" }]]);

      const req = {
        params: { id: "f-001" },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await deleteFormula(
        req as unknown as Parameters<typeof deleteFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "无权删除他人配方" }),
      );
    });
  });

  describe("updateFormula - 更新配方", () => {
    it("原料变更时缺少升版原因返回400", async () => {
      const req = {
        params: { id: "f-001" },
        body: {
          name: "更新配方",
          materials: [
            { materialId: "m-001", materialName: "原料A", quantity: 100 },
          ],
          versionReason: "",
        },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await updateFormula(
        req as unknown as Parameters<typeof updateFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "请填写升版原因" }),
      );
    });

    it("配方不存在时返回404", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = {
        params: { id: "non-existent" },
        body: {
          name: "更新配方",
          versionReason: "调整参数",
        },
        user: { userId: "user-001", role: "formulist" },
      };
      const res = createMockRes();

      await updateFormula(
        req as unknown as Parameters<typeof updateFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "配方不存在" }),
      );
    });
  });

  describe("publishFormula - 发布配方", () => {
    it("发布配方成功", async () => {
      const mockVersion = {
        version_id: "v-001",
        formula_id: "f-001",
        version_number: "v1.0",
        status: "draft",
        is_current: 1,
      };

      mockQuery
        .mockResolvedValueOnce([[{ id: "f-001" }]])
        .mockResolvedValueOnce([[mockVersion]])
        .mockResolvedValueOnce({ changes: 1 })
        .mockResolvedValueOnce([[{ ...mockVersion, status: "published" }]]);

      const req = {
        params: { id: "f-001" },
        user: { userId: "user-001", role: "admin" },
      };
      const res = createMockRes();

      await publishFormula(
        req as unknown as Parameters<typeof publishFormula>[0],
        res as unknown as Response,
      );

      expect(res.json).toHaveBeenCalled();
      const callArgs = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(callArgs.success).toBe(true);
    });

    it("当前版本已发布时返回400", async () => {
      mockQuery
        .mockResolvedValueOnce([[{ id: "f-001" }]])
        .mockResolvedValueOnce([
          [{ version_id: "v-001", status: "published", is_current: 1 }],
        ]);

      const req = {
        params: { id: "f-001" },
        user: { userId: "user-001", role: "admin" },
      };
      const res = createMockRes();

      await publishFormula(
        req as unknown as Parameters<typeof publishFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "当前版本已发布，无需重复发布",
        }),
      );
    });

    it("配方不存在时返回404", async () => {
      mockQuery.mockResolvedValueOnce([[]]);

      const req = {
        params: { id: "non-existent" },
        user: { userId: "user-001", role: "admin" },
      };
      const res = createMockRes();

      await publishFormula(
        req as unknown as Parameters<typeof publishFormula>[0],
        res as unknown as Response,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: "配方不存在" }),
      );
    });
  });

  describe("ratio validation - 含量比校验", () => {
    const mockOldFormula = {
      id: "f-001",
      name: "旧配方",
      code: "FM001",
      salesman_id: "s-001",
      salesman_name: "张三",
      materials_json: JSON.stringify([
        { materialId: "m-001", materialName: "原料A", quantity: 100, materialType: "herb" },
      ]),
      finished_weight: 500,
      ratio_factor: 0.18,
      supplement_ratio_factor: 1.0,
      packaging_price: 0,
      other_price: 0,
      profit_margin: 20,
      description: "测试描述",
      preparation_method: null,
      created_by: "user-001",
      created_at: "2026-05-01T00:00:00.000Z",
    };

    describe("create - 创建时校验", () => {
      it("F01: Returns 400 when totalRatio is in error level (< 0.92 or > 1.08)", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: false,
          level: "error",
          totalRatio: 0.85,
          message: "含量比校验失败（偏差 -15.00%）",
          description: "原料含量比总和为 0.85000，偏差 -15.00% 超出允许范围 [0.92, 1.08]",
          requiresManualReview: false,
        });
        mockQuery.mockReturnValueOnce([[{ name: "张三" }]]);

        const req = {
          body: {
            name: "错误配方",
            salesmanId: "s-001",
            materials: [{ materialId: "m-001", materialName: "原料A", quantity: 100 }],
            finishedWeight: 500,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.message).toContain("含量比");
        expect(mockValidateRatioFactor).toHaveBeenCalled();
      });

      it("F02: Returns 201 when totalRatio is in normal level", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: true,
          level: "normal",
          totalRatio: 1.0,
          message: "含量比校验通过",
          description: "在正常范围内",
          requiresManualReview: false,
        });
        mockQuery
          .mockReturnValueOnce([[{ name: "张三" }]])
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce([[{ id: "mock-id-123", name: "新配方", code: "FM123", materials_json: "[]", finished_weight: 500, created_at: "2026-05-22T00:00:00.000Z" }]]);

        const req = {
          body: {
            name: "新配方",
            salesmanId: "s-001",
            materials: [],
            finishedWeight: 500,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(201);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(true);
      });

      it("F03: Returns 201 when totalRatio is in warning level (allowed)", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: true,
          level: "warning",
          totalRatio: 0.96,
          message: "含量比偏差预警（偏差 -4.00%）",
          description: "原料含量比总和为 0.96000，超出正常范围，建议检查",
          requiresManualReview: false,
        });
        mockQuery
          .mockReturnValueOnce([[{ name: "张三" }]])
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce([[{ id: "mock-id-123", name: "新配方", code: "FM123", materials_json: "[]", finished_weight: 500, created_at: "2026-05-22T00:00:00.000Z" }]]);

        const req = {
          body: {
            name: "新配方",
            salesmanId: "s-001",
            materials: [],
            finishedWeight: 500,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(201);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(true);
      });

      it("F04: Returns 201 when totalRatio is in high_warning level (allowed with review)", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: true,
          level: "high_warning",
          totalRatio: 1.06,
          message: "含量比严重偏差（偏差 6.00%）",
          description: "原料含量比总和为 1.06000，严重偏离标准值，需要人工审核",
          requiresManualReview: true,
        });
        mockQuery
          .mockReturnValueOnce([[{ name: "张三" }]])
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce([[{ id: "mock-id-123", name: "新配方", code: "FM123", materials_json: "[]", finished_weight: 500, created_at: "2026-05-22T00:00:00.000Z" }]]);

        const req = {
          body: {
            name: "新配方",
            salesmanId: "s-001",
            materials: [],
            finishedWeight: 500,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(201);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(true);
      });
    });

    describe("update - 更新时校验", () => {
      it("F10: Returns 400 when updated materials cause error level", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: false,
          level: "error",
          totalRatio: 0.80,
          message: "含量比校验失败（偏差 -20.00%）",
          description: "原料含量比总和为 0.80000，偏差 -20.00% 超出允许范围",
          requiresManualReview: false,
        });
        mockQuery.mockReturnValueOnce([[mockOldFormula]]);

        const req = {
          params: { id: "f-001" },
          body: {
            materials: [
              { materialId: "m-001", materialName: "原料A", quantity: 50 },
            ],
            versionReason: "调整用量",
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await updateFormula(
          req as unknown as Parameters<typeof updateFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.message).toContain("含量比");
      });

      it("F11: Returns 200 when updated materials are valid", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: true,
          level: "normal",
          totalRatio: 1.0,
          message: "含量比校验通过",
          description: "在正常范围内",
          requiresManualReview: false,
        });
        const updatedFormula = {
          id: "f-001",
          name: "旧配方",
          code: "FM001",
          materials_json: "[]",
          finished_weight: 500,
          created_at: "2026-05-22T00:00:00.000Z",
        };
        mockQuery
          .mockReturnValueOnce([[mockOldFormula]])
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce([[{ version_number: "v1.0" }]])
          .mockReturnValueOnce([[]])
          .mockReturnValueOnce({ changes: 1 })
          .mockReturnValueOnce([[updatedFormula]]);

        const req = {
          params: { id: "f-001" },
          body: {
            materials: [
              { materialId: "m-001", materialName: "原料A", quantity: 100 },
            ],
            versionReason: "调整用量",
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await updateFormula(
          req as unknown as Parameters<typeof updateFormula>[0],
          res as unknown as Response,
        );

        expect(res.json).toHaveBeenCalled();
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(true);
      });
    });

    describe("edge cases - 边界情况", () => {
      it("F20: Empty materials array returns 400", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: false,
          level: "error",
          totalRatio: 0,
          message: "无原料数据",
          description: "配方未包含任何原料，无法进行含量比校验",
          requiresManualReview: false,
        });
        mockQuery.mockReturnValueOnce([[{ name: "张三" }]]);

        const req = {
          body: {
            name: "空配方",
            salesmanId: "s-001",
            materials: [],
            finishedWeight: 500,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.message).toBe("无原料数据");
      });

      it("F21: Zero finishedWeight returns 400", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: false,
          level: "error",
          totalRatio: 0,
          message: "成品重量无效",
          description: "成品重量必须大于0才能进行含量比校验",
          requiresManualReview: false,
        });
        mockQuery.mockReturnValueOnce([[{ name: "张三" }]]);

        const req = {
          body: {
            name: "零重量配方",
            salesmanId: "s-001",
            materials: [{ materialId: "m-001", materialName: "原料A", quantity: 100 }],
            finishedWeight: 0,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(false);
        expect(body.message).toBe("成品重量无效");
      });

      it("F22: NaN quantity in materials handled gracefully", async () => {
        mockValidateRatioFactor.mockReturnValue({
          allowed: false,
          level: "error",
          totalRatio: NaN,
          message: "含量比校验失败",
          description: "配方数据存在错误，无法创建",
          requiresManualReview: false,
        });
        mockQuery.mockReturnValueOnce([[{ name: "张三" }]]);

        const req = {
          body: {
            name: "NaN配方",
            salesmanId: "s-001",
            materials: [{ materialId: "m-001", materialName: "原料A", quantity: NaN }],
            finishedWeight: 500,
            ratioFactor: 0.18,
          },
          user: { userId: "user-001", role: "formulist" },
        };
        const res = createMockRes();

        await createFormula(
          req as unknown as Parameters<typeof createFormula>[0],
          res as unknown as Response,
        );

        expect(res.status).toHaveBeenCalledWith(400);
        const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(body.success).toBe(false);
      });
    });
  });
});
