import { describe, it, expect, vi, beforeEach } from "vitest";
import { IntentEngine, IntentType } from "../src/services/ai/agent/intentEngine.js";

const mockChatCompletion = vi.fn();

beforeEach(() => {
  mockChatCompletion.mockReset();
});

function createEngine(): IntentEngine {
  return new IntentEngine(mockChatCompletion, "dashscope");
}

describe("IntentEngine", () => {
  it("识别查询意图 - 查看配方列表", async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        intent: "query_data",
        params: { target: "formula" },
        confidence: 0.9,
        missingParams: [],
        targetTable: "formula",
        targetAction: "query_formulas",
      }),
    });

    const engine = createEngine();
    const result = await engine.recognize("查看配方列表");

    expect(result.intent).toBe(IntentType.QUERY_DATA);
    expect(result.params.target).toBe("formula");
    expect(result.confidence).toBe(0.9);
    expect(result.targetTable).toBe("formula");
    expect(result.targetAction).toBe("query_formulas");
    expect(mockChatCompletion).toHaveBeenCalledWith(
      "dashscope",
      expect.arrayContaining([
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user" }),
      ]),
      { temperature: 0.1 }
    );
  });

  it("识别创建意图 - 新建一个配方", async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        intent: "create_data",
        params: { name: "新配方" },
        confidence: 0.85,
        missingParams: ["salesman_name", "finished_weight"],
        targetTable: "formula",
        targetAction: "create_formula",
      }),
    });

    const engine = createEngine();
    const result = await engine.recognize("新建一个配方");

    expect(result.intent).toBe(IntentType.CREATE_DATA);
    expect(result.confidence).toBe(0.85);
    expect(result.missingParams).toEqual(["salesman_name", "finished_weight"]);
    expect(result.targetTable).toBe("formula");
    expect(result.targetAction).toBe("create_formula");
  });

  it("识别计算意图 - 帮我计算营养成分", async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        intent: "calculate",
        params: { calculationType: "nutrition" },
        confidence: 0.92,
        missingParams: [],
        targetTable: "formula",
        targetAction: "calculate_nutrition",
      }),
    });

    const engine = createEngine();
    const result = await engine.recognize("帮我计算营养成分");

    expect(result.intent).toBe(IntentType.CALCULATE);
    expect(result.params.calculationType).toBe("nutrition");
    expect(result.confidence).toBe(0.92);
    expect(result.targetAction).toBe("calculate_nutrition");
  });

  it("识别聊天意图 - 你好", async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        intent: "chat",
        params: {},
        confidence: 0.95,
        missingParams: [],
      }),
    });

    const engine = createEngine();
    const result = await engine.recognize("你好");

    expect(result.intent).toBe(IntentType.CHAT);
    expect(result.confidence).toBe(0.95);
    expect(result.missingParams).toEqual([]);
  });

  it("结合上下文消息识别意图", async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        intent: "query_data",
        params: { target: "material" },
        confidence: 0.88,
        missingParams: [],
        targetTable: "material",
        targetAction: "query_materials",
      }),
    });

    const engine = createEngine();
    const contextMessages = [
      { role: "user", content: "我之前在查看配方" },
      { role: "assistant", content: "好的，请问还有什么需要？" },
    ];
    const result = await engine.recognize("还有哪些原料", contextMessages);

    expect(result.intent).toBe(IntentType.QUERY_DATA);
    expect(result.targetTable).toBe("material");
    expect(mockChatCompletion).toHaveBeenCalledWith(
      "dashscope",
      expect.arrayContaining([
        expect.objectContaining({ role: "system" }),
        expect.objectContaining({ role: "user" }),
      ]),
      { temperature: 0.1 }
    );
    const userMessage = mockChatCompletion.mock.calls[0][1][1].content;
    expect(userMessage).toContain("我之前在查看配方");
    expect(userMessage).toContain("还有哪些原料");
  });

  it("无效 JSON 响应返回 UNCLEAR", async () => {
    mockChatCompletion.mockResolvedValue({
      content: "这不是一个有效的JSON响应",
    });

    const engine = createEngine();
    const result = await engine.recognize("查看配方");

    expect(result.intent).toBe(IntentType.UNCLEAR);
    expect(result.confidence).toBe(0);
    expect(result.params).toEqual({});
    expect(result.missingParams).toEqual([]);
  });

  it("chatCompletion 抛出异常返回 UNCLEAR 且 confidence 为 0", async () => {
    mockChatCompletion.mockRejectedValue(new Error("网络超时"));

    const engine = createEngine();
    const result = await engine.recognize("查看配方列表");

    expect(result.intent).toBe(IntentType.UNCLEAR);
    expect(result.confidence).toBe(0);
    expect(result.params).toEqual({});
    expect(result.missingParams).toEqual([]);
  });

  it("无效的 intent 类型返回 UNCLEAR", async () => {
    mockChatCompletion.mockResolvedValue({
      content: JSON.stringify({
        intent: "unknown_intent",
        params: {},
        confidence: 0.7,
        missingParams: [],
      }),
    });

    const engine = createEngine();
    const result = await engine.recognize("随便说点什么");

    expect(result.intent).toBe(IntentType.UNCLEAR);
    expect(result.confidence).toBe(0);
    expect(result.params).toEqual({});
  });
});
