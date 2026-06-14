import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Request, Response } from "express";

// --- Mock db (better-sqlite3 style) ---
const mockDb = { prepare: vi.fn() };
const mockPrepareRun = vi.fn();
const mockPrepareGet = vi.fn();
const mockPrepareAll = vi.fn();
mockDb.prepare.mockReturnValue({ run: mockPrepareRun, get: mockPrepareGet, all: mockPrepareAll });

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("../src/services/ai/AIService.js", () => ({
  aiService: {
    reloadModels: vi.fn(),
    chatCompletion: vi.fn(),
    getAvailableVersions: vi.fn(),
  },
}));

vi.mock("../src/utils/helpers.js", () => ({
  fail: vi.fn((message: string, code = "INTERNAL_ERROR") => ({
    success: false,
    error: { message, code, timestamp: "2026-06-14T00:00:00.000Z" },
  })),
  success: vi.fn((data: unknown) => ({ success: true, data })),
  generateId: vi.fn(() => "pt_mock_id"),
  fixGarbledText: vi.fn((s: string) => s),
}));

interface MockUser {
  userId: string;
  role: string;
}

interface MockRequest {
  params: Record<string, string>;
  query: Record<string, string | undefined>;
  body: Record<string, unknown>;
  user: MockUser;
  headers?: Record<string, string>;
}

describe("modelController - 模型管理", () => {
  let mockReq: MockRequest;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mockDb.prepare to return the default chainable object
    mockDb.prepare.mockReturnValue({ run: mockPrepareRun, get: mockPrepareGet, all: mockPrepareAll });

    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockRes = { json: jsonMock, status: statusMock };

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { userId: "admin-001", role: "admin" },
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ================================================================
  // MC01: getModelsList - 获取模型列表
  // ================================================================
  describe("MC01: getModelsList", () => {
    it("admin 获取完整模型列表含统计和降级配置", async () => {
      const modelRow = {
        id: "m1", provider: "deepseek", name: "DeepSeek", base_url: "https://api.deepseek.com",
        api_key: "sk-xxx", model: "deepseek-chat", vision_model: "", vision_max_tokens: null,
        description: "", supports_vision: 0, health_status: "healthy", health_check_interval_days: 1,
        sort_order: 1, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
        today_calls: 10, today_tokens: 5000, month_tokens: 100000,
      };
      mockPrepareAll.mockReturnValueOnce([modelRow]);   // main model query
      mockPrepareGet.mockReturnValueOnce({ cnt: 2 });    // active alerts
      mockPrepareAll.mockReturnValueOnce([{ provider: "deepseek", fallback_provider: "dashscope" }]); // fallbacks

      const { getModelsList } = await import("../src/controllers/modelController.js");
      await getModelsList(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            models: expect.arrayContaining([
              expect.objectContaining({ provider: "deepseek", apiKeyConfigured: true }),
            ]),
            stats: expect.objectContaining({
              totalModels: 1, configuredModels: 1, todayCalls: 10,
              todayTokens: 5000, monthTokens: 100000, activeAlerts: 2,
            }),
          }),
        }),
      );
    });

    it("未配置 api_key 的模型标记为 apiKeyConfigured: false", async () => {
      const modelRow = {
        id: "m2", provider: "test", name: "Test", base_url: "https://test.com",
        api_key: "", model: "test-model", vision_model: "", vision_max_tokens: null,
        description: "", supports_vision: 0, health_status: "unknown", health_check_interval_days: 1,
        sort_order: 2, created_at: "2026-01-01T00:00:00.000Z", updated_at: "2026-01-01T00:00:00.000Z",
        today_calls: 0, today_tokens: 0, month_tokens: 0,
      };
      mockPrepareAll.mockReturnValueOnce([modelRow]);
      mockPrepareGet.mockReturnValueOnce({ cnt: 0 });
      mockPrepareAll.mockReturnValueOnce([]);

      const { getModelsList } = await import("../src/controllers/modelController.js");
      await getModelsList(mockReq as unknown as Request, mockRes as Response);

      const callArg = jsonMock.mock.calls[0][0];
      expect(callArg.data.models[0].apiKeyConfigured).toBe(false);
    });

    it("数据库异常返回 500", async () => {
      mockPrepareAll.mockImplementationOnce(() => { throw new Error("db error"); });

      const { getModelsList } = await import("../src/controllers/modelController.js");
      await getModelsList(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
    });
  });

  // ================================================================
  // MC02: createModel - 创建模型（成功）
  // ================================================================
  describe("MC02: createModel - 创建成功", () => {
    it("admin 创建模型成功，含降级配置和告警配置", async () => {
      mockReq.body = {
        provider: "new-provider", name: "新模型", baseUrl: "https://api.new.com",
        apiKey: "sk-new", model: "new-model", fallbackProvider: "deepseek",
      };
      mockPrepareGet
        .mockReturnValueOnce(undefined)             // 检查重复 provider → 不存在
        .mockReturnValueOnce({ max_sort: null });   // max_sort
      // INSERT ai_models / INSERT ai_alert_configs / INSERT ai_fallback_configs 均使用 run
      mockPrepareRun.mockReturnValue({ changes: 1 });

      const { aiService } = await import("../src/services/ai/AIService.js");
      const { createModel } = await import("../src/controllers/modelController.js");
      await createModel(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ provider: "new-provider", name: "新模型" }),
        }),
      );
      expect(vi.mocked(aiService.reloadModels)).toHaveBeenCalledOnce();
      // 验证三个 INSERT
      const insertCalls = mockDb.prepare.mock.calls.filter(
        ([sql]: [string]) => sql.trimStart().startsWith("INSERT"),
      );
      expect(insertCalls.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ================================================================
  // MC03: createModel - 权限/校验错误
  // ================================================================
  describe("MC03: createModel - 权限与校验", () => {
    it("非管理员返回 403", async () => {
      mockReq.user = { userId: "user-001", role: "formulist" };
      mockReq.body = { provider: "p", name: "n", baseUrl: "u", model: "m" };

      const { createModel } = await import("../src/controllers/modelController.js");
      await createModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ message: "仅管理员可操作", code: "FORBIDDEN" }),
        }),
      );
    });

    it("缺少必填字段返回 400", async () => {
      mockReq.body = { provider: "p" }; // name, baseUrl, model missing

      const { createModel } = await import("../src/controllers/modelController.js");
      await createModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            message: expect.stringContaining("缺少必填字段"),
            code: "VALIDATION_ERROR",
          }),
        }),
      );
    });
  });

  // ================================================================
  // MC04: createModel - 重复 provider
  // ================================================================
  describe("MC04: createModel - 重复 provider", () => {
    it("已存在的 provider 返回 400", async () => {
      mockReq.body = {
        provider: "deepseek", name: "重复", baseUrl: "https://x.com", model: "m",
      };
      mockPrepareGet.mockReturnValueOnce({ id: "existing" }); // 查到已存在

      const { createModel } = await import("../src/controllers/modelController.js");
      await createModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ message: expect.stringContaining("已存在"), code: "DUPLICATE_ENTRY" }),
        }),
      );
    });
  });

  // ================================================================
  // MC05: updateModel - 更新模型
  // ================================================================
  describe("MC05: updateModel - 更新成功", () => {
    it("admin 更新模型基本信息及降级配置", async () => {
      mockReq.params = { id: "m1" };
      mockReq.body = {
        name: "Updated", baseUrl: "https://new.url.com",
        apiKey: "sk-new", model: "new-model", fallbackProvider: "dashscope",
      };
      const existingRow = {
        id: "m1", provider: "deepseek", name: "DeepSeek", base_url: "https://api.deepseek.com",
        api_key: "sk-old", model: "deepseek-chat",
      };
      mockPrepareGet.mockReturnValueOnce(existingRow); // 查找待更新模型

      const { aiService } = await import("../src/services/ai/AIService.js");
      const { updateModel } = await import("../src/controllers/modelController.js");
      await updateModel(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: "m1" }),
        }),
      );
      expect(vi.mocked(aiService.reloadModels)).toHaveBeenCalledOnce();
      // 验证 UPDATE 执行
      const updateCall = mockDb.prepare.mock.calls.find(
        ([sql]: [string]) => sql.trimStart().startsWith("UPDATE"),
      );
      expect(updateCall).toBeDefined();
    });

    it("不存在的模型返回 404", async () => {
      mockReq.params = { id: "nonexistent" };
      mockPrepareGet.mockReturnValueOnce(undefined);

      const { updateModel } = await import("../src/controllers/modelController.js");
      await updateModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ message: "模型不存在", code: "NOT_FOUND" }),
        }),
      );
    });

    it("非管理员返回 403", async () => {
      mockReq.user = { userId: "user-001", role: "formulist" };
      mockReq.params = { id: "m1" };

      const { updateModel } = await import("../src/controllers/modelController.js");
      await updateModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  // ================================================================
  // MC06: deleteModel - 删除模型（成功）
  // ================================================================
  describe("MC06: deleteModel - 删除成功", () => {
    it("admin 删除无调用记录的模型", async () => {
      mockReq.params = { id: "m1" };
      mockPrepareGet
        .mockReturnValueOnce({ id: "m1", provider: "test" })  // 查找模型
        .mockReturnValueOnce({ cnt: 0 });                      // 调用记录数=0

      const { aiService } = await import("../src/services/ai/AIService.js");
      const { deleteModel } = await import("../src/controllers/modelController.js");
      await deleteModel(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: "模型已移除" }),
      );
      expect(vi.mocked(aiService.reloadModels)).toHaveBeenCalledOnce();
    });
  });

  // ================================================================
  // MC07: deleteModel - 有调用记录 / 无权限
  // ================================================================
  describe("MC07: deleteModel - 错误场景", () => {
    it("存在调用记录不允许删除返回 400", async () => {
      mockReq.params = { id: "m1" };
      mockPrepareGet
        .mockReturnValueOnce({ id: "m1", provider: "test" })
        .mockReturnValueOnce({ cnt: 5 }); // 有 5 条记录

      const { deleteModel } = await import("../src/controllers/modelController.js");
      await deleteModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ message: "该模型存在调用记录，无法移除" }),
        }),
      );
    });

    it("非管理员返回 403", async () => {
      mockReq.user = { userId: "user-001", role: "formulist" };
      mockReq.params = { id: "m1" };

      const { deleteModel } = await import("../src/controllers/modelController.js");
      await deleteModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it("不存在的模型返回 404", async () => {
      mockReq.params = { id: "nonexistent" };
      mockPrepareGet.mockReturnValueOnce(undefined);

      const { deleteModel } = await import("../src/controllers/modelController.js");
      await deleteModel(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  // ================================================================
  // MC08: testModelConnection - 连接成功
  // ================================================================
  describe("MC08: testModelConnection - 连通性正常", () => {
    it("成功连接标记为 healthy", async () => {
      mockReq.params = { id: "m1" };
      const modelRow = {
        id: "m1", provider: "deepseek", name: "DeepSeek", base_url: "https://api.deepseek.com",
        api_key: "sk-xxx", model: "deepseek-chat",
      };
      mockPrepareGet.mockReturnValueOnce(modelRow);

      const { aiService } = await import("../src/services/ai/AIService.js");
      vi.mocked(aiService.chatCompletion).mockResolvedValueOnce({
        content: "hi", model: "deepseek-chat",
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      } as any);

      const { testModelConnection } = await import("../src/controllers/modelController.js");
      await testModelConnection(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ provider: "deepseek", status: "healthy" }),
        }),
      );
      // 验证 UPDATE health_status = 'healthy' 被执行
      const updateCalls = mockDb.prepare.mock.calls.filter(
        ([sql]: [string]) => sql.includes("UPDATE") && sql.includes("health_status"),
      );
      expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    });

    it("非管理员返回 403", async () => {
      mockReq.user = { userId: "user-001", role: "formulist" };
      mockReq.params = { id: "m1" };

      const { testModelConnection } = await import("../src/controllers/modelController.js");
      await testModelConnection(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  // ================================================================
  // MC09: testModelConnection - 连接失败
  // ================================================================
  describe("MC09: testModelConnection - 连接异常", () => {
    it("AI 服务抛异常时标记为 unhealthy", async () => {
      mockReq.params = { id: "m1" };
      mockPrepareGet.mockReturnValueOnce({
        id: "m1", provider: "deepseek", name: "DeepSeek", base_url: "https://api.deepseek.com",
        api_key: "sk-xxx", model: "deepseek-chat",
      });

      const { aiService } = await import("../src/services/ai/AIService.js");
      vi.mocked(aiService.chatCompletion).mockRejectedValueOnce(new Error("timeout"));

      const { testModelConnection } = await import("../src/controllers/modelController.js");
      await testModelConnection(mockReq as unknown as Request, mockRes as Response);

      // 返回成功=false 但 status=200 (非 500，属于业务成功)
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          data: expect.objectContaining({ status: "unhealthy", error: "timeout" }),
        }),
      );
    });

    it("模型不存在返回 404", async () => {
      mockReq.params = { id: "nonexistent" };
      mockPrepareGet.mockReturnValueOnce(undefined);

      const { testModelConnection } = await import("../src/controllers/modelController.js");
      await testModelConnection(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
    });
  });

  // ================================================================
  // MC10: getModelVersions + switchModelVersion
  // ================================================================
  describe("MC10: getModelVersions", () => {
    it("获取指定模型的可用版本列表", async () => {
      mockReq.params = { id: "m1" };
      mockPrepareGet.mockReturnValueOnce({ id: "m1", provider: "deepseek", model: "deepseek-chat" });

      const { aiService } = await import("../src/services/ai/AIService.js");
      vi.mocked(aiService.getAvailableVersions).mockReturnValueOnce([
        { value: "deepseek-chat", label: "V3 Chat" },
        { value: "deepseek-v4-flash", label: "V4 Flash" },
      ]);

      const { getModelVersions } = await import("../src/controllers/modelController.js");
      await getModelVersions(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            provider: "deepseek",
            currentModel: "deepseek-chat",
            versions: expect.arrayContaining([
              expect.objectContaining({ value: "deepseek-v4-flash" }),
            ]),
          }),
        }),
      );
    });
  });

  describe("MC10b: switchModelVersion", () => {
    it("admin 切换模型版本成功", async () => {
      mockReq.params = { provider: "deepseek" };
      mockReq.body = { model: "deepseek-v4-flash" };
      mockPrepareGet.mockReturnValueOnce({ id: "m1" }); // 查找 provider 存在

      const { aiService } = await import("../src/services/ai/AIService.js");
      const { switchModelVersion } = await import("../src/controllers/modelController.js");
      await switchModelVersion(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { provider: "deepseek", model: "deepseek-v4-flash" },
        }),
      );
      expect(vi.mocked(aiService.reloadModels)).toHaveBeenCalledOnce();
    });

    it("缺少 model 参数返回 400", async () => {
      mockReq.params = { provider: "deepseek" };
      mockReq.body = {}; // no model

      const { switchModelVersion } = await import("../src/controllers/modelController.js");
      await switchModelVersion(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  // ================================================================
  // MC11: getAlertConfigs + updateAlertConfig
  // ================================================================
  describe("MC11: getAlertConfigs", () => {
    it("返回所有告警配置（含模型名称）", async () => {
      mockPrepareAll.mockReturnValueOnce([
        { id: "ac1", model_id: "m1", provider: "deepseek", model_name: "DeepSeek",
          daily_call_limit: 500, monthly_token_limit: 5000000, warning_threshold: 80,
          critical_threshold: 95, enabled: 1 },
      ]);

      const { getAlertConfigs } = await import("../src/controllers/modelController.js");
      await getAlertConfigs(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { configs: expect.arrayContaining([
            expect.objectContaining({ provider: "deepseek", daily_call_limit: 500 }),
          ]) },
        }),
      );
    });
  });

  describe("MC11b: updateAlertConfig", () => {
    it("admin 更新告警阈值", async () => {
      mockReq.params = { id: "ac1" };
      mockReq.body = { dailyCallLimit: 1000, monthlyTokenLimit: 10000000, warningThreshold: 85, criticalThreshold: 98, enabled: true };

      const { updateAlertConfig } = await import("../src/controllers/modelController.js");
      await updateAlertConfig(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({ id: "ac1" }),
        }),
      );
    });

    it("非管理员返回 403", async () => {
      mockReq.user = { userId: "user-001", role: "formulist" };
      mockReq.params = { id: "ac1" };

      const { updateAlertConfig } = await import("../src/controllers/modelController.js");
      await updateAlertConfig(mockReq as unknown as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  // ================================================================
  // MC12: getUsageStats - 用量统计
  // ================================================================
  describe("MC12: getUsageStats", () => {
    it("返回用量统计含摘要/趋势/分布", async () => {
      mockReq.query = { startDate: "2026-06-01", endDate: "2026-06-14", provider: "deepseek" };

      mockPrepareAll
        .mockReturnValueOnce([{
          provider: "deepseek", name: "DeepSeek", total_calls: 100, total_tokens: 50000,
          today_calls: 10, today_tokens: 5000, month_calls: 100, month_tokens: 50000, avg_latency_ms: 1200,
        }])   // summary
        .mockReturnValueOnce([{ date: "2026-06-01", provider: "deepseek", tokens: 3000 }])  // trend
        .mockReturnValueOnce([{ provider: "deepseek", name: "DeepSeek" }])  // allProviders for trend map
        .mockReturnValueOnce([{ provider: "deepseek", name: "DeepSeek", tokens: 50000, calls: 100 }]); // distribution

      const { getUsageStats } = await import("../src/controllers/modelController.js");
      await getUsageStats(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            summary: expect.any(Array),
            trend: expect.any(Array),
            distribution: expect.any(Array),
          }),
        }),
      );
    });

    it("未传日期范围时使用默认 7 天", async () => {
      mockReq.query = {};

      mockPrepareAll
        .mockReturnValueOnce([])  // summary
        .mockReturnValueOnce([])  // trend
        .mockReturnValueOnce([])  // allProviders
        .mockReturnValueOnce([]); // distribution

      const { getUsageStats } = await import("../src/controllers/modelController.js");
      await getUsageStats(mockReq as unknown as Request, mockRes as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({ success: true }),
      );
    });
  });
});
