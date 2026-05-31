import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/config/database-better-sqlite3.js", () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      get: vi.fn(() => undefined),
      run: vi.fn(),
    })),
  })),
}));

vi.mock("../src/controllers/modelController.js", () => ({
  checkAndFireAlerts: vi.fn(),
}));

describe("AIService", () => {
  let AIService: typeof import("../src/services/ai/AIService.js").AIService;
  type AIModelConfig = import("../src/services/ai/AIService.js").AIModelConfig;

  const testModels: AIModelConfig[] = [
    {
      name: "通义千问",
      provider: "dashscope",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: "sk-dashscope-key",
      model: "qwen-plus",
      visionModel: "qwen-vl-plus",
      description: "阿里云通义千问大模型",
      supportsVision: true,
    },
    {
      name: "智谱GLM",
      provider: "zhipu",
      baseUrl: "https://open.bigmodel.cn/api/paas/v4",
      apiKey: "sk-zhipu-key",
      model: "glm-4-flash",
      visionModel: "glm-4v-flash",
      visionMaxTokens: 1024,
      description: "智谱AI GLM系列大模型",
      supportsVision: true,
    },
    {
      name: "DeepSeek",
      provider: "deepseek",
      baseUrl: "https://api.deepseek.com/v1",
      apiKey: "",
      model: "deepseek-chat",
      description: "DeepSeek深度求索大模型",
      supportsVision: false,
    },
  ];

  beforeEach(async () => {
    vi.resetAllMocks();
    const mod = await import("../src/services/ai/AIService.js");
    AIService = mod.AIService;
  });

  describe("getAvailableModels", () => {
    it("仅返回配置了 apiKey 的模型", () => {
      const service = new AIService(testModels);
      const available = service.getAvailableModels();
      expect(available).toHaveLength(2);
      expect(available.every(m => m.apiKey !== "")).toBe(true);
      expect(available.map(m => m.provider)).toEqual(["dashscope", "zhipu"]);
    });
  });

  describe("getAllModels", () => {
    it("将已配置的 apiKey 掩码为 ***configured***", () => {
      const service = new AIService(testModels);
      const all = service.getAllModels();
      expect(all).toHaveLength(3);
      expect(all[0].apiKey).toBe("***configured***");
      expect(all[1].apiKey).toBe("***configured***");
      expect(all[2].apiKey).toBe("");
    });
  });

  describe("getModel", () => {
    it("根据 provider 返回对应模型", () => {
      const service = new AIService(testModels);
      const model = service.getModel("dashscope");
      expect(model).toBeDefined();
      expect(model!.provider).toBe("dashscope");
      expect(model!.name).toBe("通义千问");
    });

    it("未知 provider 返回 undefined", () => {
      const service = new AIService(testModels);
      const model = service.getModel("unknown-provider");
      expect(model).toBeUndefined();
    });
  });

  describe("getAvailableVersions", () => {
    it("返回 dashscope 的版本列表", () => {
      const service = new AIService(testModels);
      const versions = service.getAvailableVersions("dashscope");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].value).toBe("qwen-plus");
      expect(versions.some(v => v.value === "qwen-max")).toBe(true);
    });

    it("返回 zhipu 的版本列表", () => {
      const service = new AIService(testModels);
      const versions = service.getAvailableVersions("zhipu");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].value).toBe("glm-4-flash");
      expect(versions.some(v => v.value === "glm-5")).toBe(true);
    });

    it("返回 deepseek 的版本列表", () => {
      const service = new AIService(testModels);
      const versions = service.getAvailableVersions("deepseek");
      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].value).toBe("deepseek-chat");
      expect(versions.some(v => v.value === "deepseek-reasoner")).toBe(true);
    });

    it("未知 provider 但存在模型时返回单个版本选项", () => {
      const customModels: AIModelConfig[] = [
        {
          name: "自定义模型",
          provider: "custom-provider",
          baseUrl: "https://custom.api.com/v1",
          apiKey: "sk-custom",
          model: "custom-model-v1",
          description: "自定义模型",
          supportsVision: false,
        },
      ];
      const service = new AIService(customModels);
      const versions = service.getAvailableVersions("custom-provider");
      expect(versions).toHaveLength(1);
      expect(versions[0].value).toBe("custom-model-v1");
      expect(versions[0].label).toBe("custom-model-v1");
    });
  });

  describe("parseJSONResponse", () => {
    it("从 markdown 代码块中提取 JSON", () => {
      const input = '```json\n{"name": "测试", "value": 42}\n```';
      const result = AIService.parseJSONResponse(input) as Record<string, unknown>;
      expect(result).toEqual({ name: "测试", value: 42 });
    });

    it("从带周围文本的原始内容中提取 JSON", () => {
      const input = '以下是结果：\n{"name": "测试", "value": 99}\n以上是结果。';
      const result = AIService.parseJSONResponse(input) as Record<string, unknown>;
      expect(result).toEqual({ name: "测试", value: 99 });
    });
  });

  describe("chatCompletion", () => {
    it("未知 provider 时抛出错误", async () => {
      const service = new AIService(testModels);
      await expect(
        service.chatCompletion("unknown-provider", [{ role: "user", content: "hello" }]),
      ).rejects.toThrow("未知的 AI 模型: unknown-provider");
    });

    it("缺少 API Key 时抛出错误", async () => {
      const service = new AIService(testModels);
      await expect(
        service.chatCompletion("deepseek", [{ role: "user", content: "hello" }]),
      ).rejects.toThrow("未配置 API Key");
    });
  });
});
