import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useSalesmanStore } from "@/stores/salesman";

const { getList, getById, create, update, deleteFn } = vi.hoisted(() => ({
  getList: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock("@/api/salesman", () => ({
  salesmanApi: {
    getList,
    getById,
    create,
    update,
    delete: deleteFn,
  },
}));

const MOCK_SALESMEN = [
  {
    id: "s1",
    name: "张三",
    phone: "13800138001",
    region: "华东",
    status: "active",
    createdAt: "2024-01-10T08:00:00Z",
    updatedAt: "2024-01-10T08:00:00Z",
  },
  {
    id: "s2",
    name: "李四",
    phone: "13800138002",
    region: "华南",
    status: "active",
    createdAt: "2024-02-20T10:30:00Z",
    updatedAt: "2024-02-20T10:30:00Z",
  },
];

describe("useSalesmanStore", () => {
  let store: ReturnType<typeof useSalesmanStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useSalesmanStore();
    vi.clearAllMocks();
  });

  it("S01: fetchSalesmen 成功加载列表", async () => {
    getList.mockResolvedValue({
      list: [...MOCK_SALESMEN],
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    await store.fetchSalesmen();

    expect(store.salesmen).toHaveLength(2);
    expect(store.salesmen[0].name).toBe("张三");
    expect(store.total).toBe(2);
    expect(store.loading).toBe(false);
  });

  it("S02: fetchSalesmen 失败时 salesmen 为空", async () => {
    getList.mockRejectedValue(new Error("网络错误"));

    await store.fetchSalesmen();

    expect(store.salesmen).toHaveLength(0);
  });

  it("S03: createSalesman 创建成功", async () => {
    create.mockResolvedValue({});
    getList.mockResolvedValue({ list: [MOCK_SALESMEN[0]], pagination: { total: 1, page: 1, pageSize: 10 } });

    const result = await store.createSalesman({ name: "王五", phone: "13900139001" } as Partial<import("@/api/salesman").SalesmanForm> as unknown as import("@/api/salesman").SalesmanForm);

    expect(result.success).toBe(true);
  });

  it("S04: updateSalesman 更新成功", async () => {
    update.mockResolvedValue({});
    getList.mockResolvedValue({ list: [MOCK_SALESMEN[0]], pagination: { total: 1, page: 1, pageSize: 10 } });

    const result = await store.updateSalesman("s1", { name: "张三-更新" });

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith("s1", { name: "张三-更新" });
  });

  it("S05: deleteSalesman 删除成功", async () => {
    deleteFn.mockResolvedValue({});
    getList.mockResolvedValue({ list: [], pagination: { total: 0, page: 1, pageSize: 10 } });

    const result = await store.deleteSalesman("s1");

    expect(result.success).toBe(true);
  });

  it("S06: getSalesman 成功返回业务员对象", async () => {
    getById.mockResolvedValue(MOCK_SALESMEN[0]);

    const result = await store.getSalesman("s1");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("张三");
  });

  it("S07: getSalesman 失败返回 null", async () => {
    getById.mockRejectedValue(new Error("不存在"));

    const result = await store.getSalesman("xxx");

    expect(result).toBeNull();
  });

  it("S08: setKeyword 重置页码", () => {
    store.currentPage = 7;
    store.setKeyword("张");
    expect(store.keyword).toBe("张");
    expect(store.currentPage).toBe(1);
  });

  it("S09: setStatusFilter 设置状态筛选并重置页码", () => {
    store.currentPage = 3;
    store.setStatusFilter("inactive");
    expect(store.statusFilter).toBe("inactive");
    expect(store.currentPage).toBe(1);
  });

  it("S10: setPage 正确更新", () => {
    store.setPage(5);
    expect(store.currentPage).toBe(5);
  });
});
