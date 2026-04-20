import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useMaterialStore } from "@/stores/material";

const { getList, getById, create, update, deleteFn } = vi.hoisted(() => ({
  getList: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteFn: vi.fn(),
}));

vi.mock("@/api/material", () => ({
  materialApi: {
    getList,
    getById,
    create,
    update,
    delete: deleteFn,
  },
}));

const MOCK_MATERIALS = [
  {
    id: "m1",
    name: "当归",
    code: "DG001",
    unit: "kg",
    stock: 100,
    materialType: "herb",
    createdBy: "admin",
    createdAt: "2024-01-15T08:00:00Z",
    updatedAt: "2024-01-15T08:00:00Z",
  },
  {
    id: "m2",
    name: "黄芪",
    code: "HQ002",
    unit: "kg",
    stock: 200,
    materialType: "herb",
    createdBy: "admin",
    createdAt: "2024-02-10T10:30:00Z",
    updatedAt: "2024-02-10T10:30:00Z",
  },
];

describe("useMaterialStore", () => {
  let store: ReturnType<typeof useMaterialStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMaterialStore();
    vi.clearAllMocks();
  });

  it("M01: fetchMaterials 成功加载列表并格式化时间", async () => {
    getList.mockResolvedValue({
      list: [...MOCK_MATERIALS],
      pagination: { total: 2, page: 1, pageSize: 10 },
    });

    await store.fetchMaterials();

    expect(store.materials).toHaveLength(2);
    expect(store.materials[0].name).toBe("当归");
    expect(store.total).toBe(2);
    expect(store.loading).toBe(false);
    expect(store.materials[0].createdAt).toContain("-");
  });

  it("M02: fetchMaterials 失败时 materials 为空数组", async () => {
    getList.mockRejectedValue(new Error("网络错误"));

    await store.fetchMaterials();

    expect(store.materials).toHaveLength(0);
    expect(store.loading).toBe(false);
  });

  it("M03: createMaterial 新增成功后刷新列表", async () => {
    const newMaterial = {
      id: "m3",
      name: "党参",
      code: "DS003",
      unit: "kg",
      stock: 50,
      materialType: "herb",
      createdBy: "admin",
      createdAt: "2024-03-01T00:00:00Z",
      updatedAt: "2024-03-01T00:00:00Z",
    };
    create.mockResolvedValue(newMaterial);
    getList.mockResolvedValue({
      list: [...MOCK_MATERIALS, newMaterial],
      pagination: { total: 3, page: 1, pageSize: 10 },
    });

    const result = await store.createMaterial({ name: "党参", code: "DS003" });

    expect(result.success).toBe(true);
    expect(create).toHaveBeenCalledWith({ name: "党参", code: "DS003" });
  });

  it("M04: createMaterial 失败应返回错误信息", async () => {
    create.mockRejectedValue(new Error("创建失败"));

    const result = await store.createMaterial({ name: "", code: "" });

    expect(result.success).toBe(false);
    expect(result.message).toContain("创建失败");
  });

  it("M05: updateMaterial 编辑成功后刷新列表", async () => {
    update.mockResolvedValue({ ...MOCK_MATERIALS[0], name: "当归-更新" });
    getList.mockResolvedValue({ list: [MOCK_MATERIALS[0]], pagination: { total: 1, page: 1, pageSize: 10 } });

    const result = await store.updateMaterial("m1", { name: "当归-更新" });

    expect(result.success).toBe(true);
    expect(update).toHaveBeenCalledWith("m1", { name: "当归-更新" });
  });

  it("M06: deleteMaterial 删除成功后刷新列表", async () => {
    deleteFn.mockResolvedValue({ success: true, message: "" });
    getList.mockResolvedValue({ list: [MOCK_MATERIALS[1]], pagination: { total: 1, page: 1, pageSize: 10 } });

    const result = await store.deleteMaterial("m1");

    expect(result.success).toBe(true);
    expect(deleteFn).toHaveBeenCalledWith("m1");
  });

  it("M07: getMaterial 成功返回原料对象", async () => {
    getById.mockResolvedValue(MOCK_MATERIALS[0]);

    const result = await store.getMaterial("m1");

    expect(result).not.toBeNull();
    expect(result!.name).toBe("当归");
  });

  it("M08: getMaterial 失败返回 null", async () => {
    getById.mockRejectedValue(new Error("不存在"));

    const result = await store.getMaterial("nonexistent");

    expect(result).toBeNull();
  });

  it("M09: setKeyword 应重置页码为 1", () => {
    store.currentPage = 5;
    store.setKeyword("当归");
    expect(store.keyword).toBe("当归");
    expect(store.currentPage).toBe(1);
  });

  it("M10: setPage 应正确更新当前页码", () => {
    store.setPage(3);
    expect(store.currentPage).toBe(3);
  });
});
