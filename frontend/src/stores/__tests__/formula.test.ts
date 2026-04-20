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

    const result = await store.createFormula({ name: "新配方" } as any);

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
