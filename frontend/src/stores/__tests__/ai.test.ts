import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useAiStore } from "@/stores/ai";

const { getModels, parseFormula, parseMaterial, naturalSearch } = vi.hoisted(() => ({
  getModels: vi.fn(),
  parseFormula: vi.fn(),
  parseMaterial: vi.fn(),
  naturalSearch: vi.fn(),
}));

vi.mock("@/api/ai", () => ({
  aiApi: {
    getModels,
    parseFormula,
    parseMaterial,
    naturalSearch,
  },
}));

const MOCK_MODELS = [
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", icon: "🟢" },
  { id: "claude", name: "Claude", provider: "Anthropic", icon: "🟠" },
];

describe("useAiStore", () => {
  let store: ReturnType<typeof useAiStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAiStore();
    vi.clearAllMocks();
  });

  it("AI01: 初始状态应为空", () => {
    expect(store.models).toHaveLength(0);
    expect(store.selectedModel).toBe("");
    expect(store.parseResult).toBeNull();
    expect(store.searchResult).toBeNull();
  });

  it("AI02: fetchModels 加载模型列表并默认选中第一个", async () => {
    getModels.mockResolvedValue({
      available: [MOCK_MODELS[0]],
      all: MOCK_MODELS,
    });

    await store.fetchModels();

    expect(store.models).toHaveLength(1);
    expect(store.allModels).toHaveLength(2);
    expect(store.selectedModel).toBe("OpenAI");
  });

  it("AI03: parseFormula 解析成功设置结果", async () => {
    store.selectedModel = "OpenAI";
    const mockResult = { name: "解析配方-A", materials: [], description: "" };
    parseFormula.mockResolvedValue(mockResult);

    await store.parseFormula(new File(["test"], "test.pdf"));

    expect(store.parseResult).toEqual(mockResult);
    expect(store.parseLoading).toBe(false);
    expect(store.parseError).toBe("");
  });

  it("AI04: parseFormula 无选中模型时直接返回", async () => {
    store.selectedModel = "";
    await store.parseFormula(new File(["test"], "test.pdf"));
    expect(parseFormula).not.toHaveBeenCalled();
  });

  it("AI05: parseFormula 失败设置错误信息", async () => {
    store.selectedModel = "OpenAI";
    parseFormula.mockRejectedValue({ response: { data: { message: "解析超时" } } });

    await store.parseFormula(new File(["test"], "test.pdf"));

    expect(store.parseError).toContain("解析超时");
    expect(store.parseResult).toBeNull();
  });

  it("AI06: naturalSearch 成功并记录历史", async () => {
    store.selectedModel = "OpenAI";
    const mockResult = { items: [{ name: "当归" }] };
    naturalSearch.mockResolvedValue(mockResult);

    await store.naturalSearch("补气原料");

    expect(store.searchResult).toEqual(mockResult);
    expect(store.searchHistory).toContain("补气原料");
  });

  it("AI07: searchHistory 最多保留 10 条", async () => {
    store.selectedModel = "OpenAI";
    naturalSearch.mockResolvedValue({ items: [] });
    for (let i = 1; i <= 12; i++) {
      await store.naturalSearch(`搜索词${i}`);
    }
    expect(store.searchHistory).toHaveLength(10);
    expect(store.searchHistory[0]).toBe("搜索词12");
  });

  it("AI08: clearParseResult 清除解析结果", () => {
    (store as any)._parseResult = { name: "test" };
    (store as any)._parseError = "some error";
    store.clearParseResult();
    expect(store.parseResult).toBeNull();
    expect(store.parseError).toBe("");
  });

  it("AI09: clearMaterialParseResult 清除原料解析结果", () => {
    (store as any)._materialParseResult = { nutritionData: {} };
    (store as any)._materialParseError = "err";
    store.clearMaterialParseResult();
    expect(store.materialParseResult).toBeNull();
    expect(store.materialParseError).toBe("");
  });

  it("AI10: clearSearchResult 清除检索结果", () => {
    (store as any)._searchResult = { items: [] };
    (store as any)._searchError = "err";
    store.clearSearchResult();
    expect(store.searchResult).toBeNull();
    expect(store.searchError).toBe("");
  });
});
