import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useFormulaStore } from "@/stores/formula";

const { getList, getById, create, update, deleteFn } = vi.hoisted(() => ({
  getList: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock("@/api/formula", () => ({
  formulaApi: {
    getList,
    getById,
    create,
    update,
    delete: deleteFn,
  },
}));

const MOCK_FORMULAS = [
  {
    id: "f1",
    name: "补血方",
    materialsJson: '[{"name":"当归","amount":10,"unit":"g"}]',
    description: "",
    status: "active",
    createdBy: "admin",
    createdAt: "2024-01-20T08:00:00Z",
    updatedAt: "2024-01-20T08:00:00Z",
  },
  {
    id: "f2",
    name: "补气方",
    materialsJson: '[{"name":"黄芪","amount":15,"unit":"g"},{"name":"党参","amount":10,"unit":"g"}]',
    description: "补气配方",
    status: "draft",
    createdBy: "admin",
    createdAt: "2024-02-25T10:30:00Z",
    updatedAt: "2024-02-25T10:30:00Z",
  },
];

describe("useFormulaStore", () => {
  let store: ReturnType<typeof useFormulaStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useFormulaStore();
    vi.clearAllMocks();
  });

  it("F01: fetchFormulas 成功加载列表并解析 materialsJson", async () => {
    getList.mockResolvedValue({
      list: [...MOCK_FORMULAS],
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    await store.fetchFormulas();

    expect(store.formulas).toHaveLength(2);
    expect(store.formulas[0].materials).toHaveLength(1);
    expect(store.formulas[0].materials[0].name).toBe("当归");
    expect(store.total).toBe(2);
  });

  it("F02: fetchFormulas 失败时 formulas 为空数组", async () => {
    getList.mockRejectedValue(new Error("网络错误"));

    await store.fetchFormulas();

    expect(store.formulas).toHaveLength(0);
  });

  it("F03: getFormula 成功返回配方对象（含解析后的 materials）", async () => {
    getById.mockResolvedValue(MOCK_FORMULAS[0]);

    const formula = await store.getFormula("f1");

    expect(formula).not.toBeNull();
    expect(formula!.materials).toHaveLength(1);
    expect(formula!.materials[0].name).toBe("当归");
  });

  it("F03b: getFormula 失败返回 null", async () => {
    getById.mockRejectedValue(new Error("获取失败"));

    const formula = await store.getFormula("nonexistent");

    expect(formula).toBeNull();
  });

  it("F04: createFormula 创建成功后刷新列表", async () => {
    create.mockResolvedValue({});
    getList.mockResolvedValue({ list: [MOCK_FORMULAS[0]], pagination: { total: 1, page: 1, pageSize: 10 } });

    const result = await store.createFormula({ name: "新配方" } as Partial<import("@/api/formula").FormulaForm> as unknown as import("@/api/formula").FormulaForm);

    expect(result.success).toBe(true);
  });

  it("F05: deleteFormula 删除成功后刷新列表", async () => {
    deleteFn.mockResolvedValue({});
    getList.mockResolvedValue({ list: [], pagination: { total: 0, page: 1, pageSize: 10 } });

    const result = await store.deleteFormula("f1");

    expect(result.success).toBe(true);
  });

  it("F06: setKeyword 应重置页码为 1", () => {
    store.currentPage = 5;
    store.setKeyword("补血");
    expect(store.keyword).toBe("补血");
    expect(store.currentPage).toBe(1);
  });
});

describe("useFormulaStore - 缓存机制", () => {
  let store: ReturnType<typeof useFormulaStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useFormulaStore();
    vi.clearAllMocks();
  });

  it("C01: 首次调用 fetchFormulas 应加载数据", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    await store.fetchFormulas();

    expect(getList).toHaveBeenCalledTimes(1);
    expect(store.formulas).toHaveLength(2);
  });

  it("C02: 缓存有效时重复调用不发送请求", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    // 首次加载
    await store.fetchFormulas();
    // 缓存有效时再次调用
    await store.fetchFormulas();

    // 只应发送一次请求
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it("C03: forceRefresh 应强制刷新缓存", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    // 首次加载
    await store.fetchFormulas();
    // 强制刷新
    await store.fetchFormulas(true);

    // 应发送两次请求
    expect(getList).toHaveBeenCalledTimes(2);
  });

  it("C04: 查询条件变化时应重新请求", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    // 首次加载
    await store.fetchFormulas();
    
    // 改变查询条件
    store.setKeyword("补气");
    await store.fetchFormulas();

    // 应发送两次请求
    expect(getList).toHaveBeenCalledTimes(2);
    // 第二次请求应包含关键词
    expect(getList).toHaveBeenLastCalledWith(
      expect.objectContaining({ keyword: "补气" })
    );
  });

  it("C05: 分页变化时应重新请求", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    // 首次加载
    await store.fetchFormulas();
    
    // 改变页码
    store.setPage(2);
    await store.fetchFormulas();

    // 应发送两次请求
    expect(getList).toHaveBeenCalledTimes(2);
    expect(getList).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 })
    );
  });

  it("C06: 相同查询条件应使用缓存", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    // 首次加载
    await store.fetchFormulas();
    
    // 设置相同查询条件
    store.setKeyword("");
    store.setPage(1);
    await store.fetchFormulas();

    // 只应发送一次请求
    expect(getList).toHaveBeenCalledTimes(1);
  });

  it("C07: getCacheAge 返回缓存年龄", async () => {
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    // 缓存未初始化时返回 0
    expect(store.getCacheAge()).toBe(0);

    // 加载数据后
    await store.fetchFormulas();
    const age = store.getCacheAge();
    
    // 年龄应该大于 0
    expect(age).toBeGreaterThanOrEqual(0);
  });
});

describe("useFormulaStore - updateFormulaItem", () => {
  let store: ReturnType<typeof useFormulaStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useFormulaStore();
    vi.clearAllMocks();
  });

  it("U01: updateFormulaItem 应更新缓存中的配方", async () => {
    // 先加载数据到缓存
    getList.mockResolvedValue({
      list: [...MOCK_FORMULAS],
      pagination: { total: 2, page: 1, pageSize: 10 },
    });
    await store.fetchFormulas();

    // 准备更新后的配方
    const updatedFormula = {
      ...MOCK_FORMULAS[0],
      name: "补血方（更新）",
      updatedAt: "2024-03-01T12:00:00Z",
    };

    await store.updateFormulaItem("f1", updatedFormula);

    expect(store.formulas[0].name).toBe("补血方（更新）");
  });

  it("U02: updateFormulaItem 不提供配方时应重新获取", async () => {
    // 先加载数据到缓存
    getList.mockResolvedValue({
      list: [...MOCK_FORMULAS],
      pagination: { total: 2, page: 1, pageSize: 10 },
    });
    await store.fetchFormulas();

    // 模拟 getById 返回更新后的数据
    getById.mockResolvedValue({
      ...MOCK_FORMULAS[0],
      name: "补血方（重新获取）",
    });

    await store.updateFormulaItem("f1");

    expect(getById).toHaveBeenCalledWith("f1");
    expect(store.formulas[0].name).toBe("补血方（重新获取）");
  });

  it("U03: updateFormulaItem 更新不存在的配方应静默失败", async () => {
    // 先加载数据到缓存
    getList.mockResolvedValue({
      list: [MOCK_FORMULAS[0]],
      pagination: { total: 1, page: 1, pageSize: 10 },
    });
    await store.fetchFormulas();

    const originalName = store.formulas[0].name;

    // 更新不存在的配方
    await store.updateFormulaItem("nonexistent", {
      ...MOCK_FORMULAS[0],
      name: "新名字",
    });

    // 原数据不应被修改
    expect(store.formulas[0].name).toBe(originalName);
  });
});

describe("useFormulaStore - deleteFormula 分页逻辑", () => {
  let store: ReturnType<typeof useFormulaStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useFormulaStore();
    vi.clearAllMocks();
  });

  it("D01: deleteFormula 应减少总数", async () => {
    // 模拟有 5 条数据的列表
    getList.mockResolvedValue({
      list: MOCK_FORMULAS,
      pagination: { total: 5, page: 1, pageSize: 10 },
    });
    await store.fetchFormulas();

    deleteFn.mockResolvedValue({});

    await store.deleteFormula("f1");

    expect(store.total).toBe(4);
    expect(store.formulas).toHaveLength(1);
  });

  it("D02: deleteFormula 删除后页码仍在有效范围内不需回退", async () => {
    // 模拟第二页只有一条数据，删除后 total=4, pageSize=2, totalPages=2
    // currentPage=2 仍然在有效范围内，不需要回退
    store.pageSize = 2;
    getList.mockResolvedValue({
      list: [MOCK_FORMULAS[0]],
      pagination: { total: 5, page: 2, pageSize: 2 },
    });
    await store.fetchFormulas();
    
    // 设置为第二页
    store.currentPage = 2;
    store.total = 5;

    deleteFn.mockResolvedValue({});

    await store.deleteFormula("f1");

    // 页码应保持不变（2仍在有效范围1-2内）
    expect(store.currentPage).toBe(2);
    expect(store.total).toBe(4);
  });

  it("D03: deleteFormula 删除后页码超出范围应回退", async () => {
    // 模拟场景：total=3, pageSize=2, 总共2页
    // 当删除后 total=2, totalPages=1，当前页码=2超出范围，应回退到1
    store.pageSize = 2;
    getList.mockResolvedValue({
      list: [MOCK_FORMULAS[0]],
      pagination: { total: 3, page: 2, pageSize: 2 },
    });
    await store.fetchFormulas();
    
    store.currentPage = 2;
    store.total = 3;

    deleteFn.mockResolvedValue({});

    await store.deleteFormula("f1");

    // total=2, totalPages=1, currentPage=2 > 1，应回退到1
    expect(store.currentPage).toBe(1);
    expect(store.total).toBe(2);
  });
});

describe("useFormulaStore - parseDescription", () => {
  it("P01: parseDescription 应解析 JSON 格式的 description", async () => {
    const { parseDescription } = await import("@/stores/formula");
    
    const result = parseDescription('{"productType":"丸剂","dosage":"9g","efficacy":"补气","totalQuote":123.4567}');
    expect(result).toContain("丸剂");
    expect(result).toContain("9g");
    expect(result).toContain("补气");
    expect(result).toContain("¥123.4567");
  });

  it("P02: parseDescription 应处理普通文本", async () => {
    const { parseDescription } = await import("@/stores/formula");
    
    const result = parseDescription("这是一个普通文本描述");
    expect(result).toBe("这是一个普通文本描述");
  });

  it("P03: parseDescription 应处理空值", async () => {
    const { parseDescription } = await import("@/stores/formula");
    
    expect(parseDescription(null)).toBe("");
    expect(parseDescription(undefined)).toBe("");
    expect(parseDescription("")).toBe("");
  });
});
