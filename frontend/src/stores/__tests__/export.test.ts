import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useExportStore } from "@/stores/export";

const mockCreateJob = vi.hoisted(() => vi.fn(() => Promise.resolve({ id: "j1", status: "pending" })));

vi.mock("@/api/export", () => ({
  exportApi: {
    getTemplates: vi.fn(() => Promise.resolve([{ id: "t1", name: "标准模板" }])),
    createTemplate: vi.fn(() => Promise.resolve()),
    updateTemplate: vi.fn(() => Promise.resolve()),
    deleteTemplate: vi.fn(() => Promise.resolve()),
    createJob: mockCreateJob,
    getJobs: vi.fn(() => Promise.resolve({ list: [], pagination: { total: 0 } })),
    getJob: vi.fn(() => Promise.resolve({ id: "j1", status: "completed" })),
    retryJob: vi.fn(() => Promise.resolve()),
    downloadFile: vi.fn(() => Promise.resolve({ data: new ArrayBuffer(0) })),
    createShare: vi.fn(() => Promise.resolve({ id: "s1", token: "abc" })),
    getShares: vi.fn(() => Promise.resolve([])),
    deleteShare: vi.fn(() => Promise.resolve()),
    getApiInterfaces: vi.fn(() => Promise.resolve([])),
    createApiInterface: vi.fn(() => Promise.resolve()),
  },
}));

describe("Export Store", () => {
  let store: ReturnType<typeof useExportStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useExportStore();
    mockCreateJob.mockResolvedValue({ id: "j1", status: "pending" });
  });

  it("EXP-01: 初始状态应正确设置", () => {
    expect(store.loading).toBe(false);
    expect(store.templates).toEqual([]);
    expect(store.jobs).toEqual([]);
    expect(store.shares).toEqual([]);
    expect(store.total).toBe(0);
    expect(store.currentPage).toBe(1);
    expect(store.pageSize).toBe(10);
  });

  it("EXP-02: fetchTemplates 应加载模板列表", async () => {
    await store.fetchTemplates();
    expect(store.templates.length).toBeGreaterThan(0);
    expect(store.loading).toBe(false);
  });

  it("EXP-03: createTemplate 应创建模板并刷新列表", async () => {
    const result = await store.createTemplate({
      name: "新模板",
      type: "excel",
      formatConfig: {},
    });
    expect(result.success).toBe(true);
  });

  it("EXP-04: updateTemplate 应更新模板并刷新列表", async () => {
    const result = await store.updateTemplate("t1", {
      name: "更新模板",
      type: "excel",
      formatConfig: {},
    });
    expect(result.success).toBe(true);
  });

  it("EXP-05: deleteTemplate 应删除模板并刷新列表", async () => {
    const result = await store.deleteTemplate("t1");
    expect(result.success).toBe(true);
  });

  it("EXP-06: createJob 应创建导出任务", async () => {
    const result = await store.createJob({
      formulaId: "f1",
      exportType: "excel",
    });
    expect(result.success).toBe(true);
    expect(result.data.id).toBe("j1");
  });

  it("EXP-07: fetchJobs 应加载任务列表和分页信息", async () => {
    await store.fetchJobs();
    expect(Array.isArray(store.jobs)).toBe(true);
  });

  it("EXP-08: getJob 应返回单个任务详情或 null", async () => {
    const job = await store.getJob("j1");
    expect(job).not.toBeNull();
    expect(job?.id).toBe("j1");
  });

  it("EXP-09: retryJob 应重试任务并刷新列表", async () => {
    const result = await store.retryJob("j1");
    expect(result.success).toBe(true);
  });

  it("EXP-10: createShare 应创建分享链接", async () => {
    const result = await store.createShare({
      formulaId: "f1",
      shareType: "public",
    });
    expect(result.success).toBe(true);
  });

  it("EXP-11: fetchShares 应加载分享列表", async () => {
    await store.fetchShares();
    expect(Array.isArray(store.shares)).toBe(true);
  });

  it("EXP-12: deleteShare 应删除分享并刷新列表", async () => {
    const result = await store.deleteShare("s1");
    expect(result.success).toBe(true);
  });

  it("EXP-13: fetchApiInterfaces 应加载接口列表", async () => {
    await store.fetchApiInterfaces();
    expect(Array.isArray(store.apiInterfaces)).toBe(true);
  });

  it("EXP-14: setPage 应更新当前页码", () => {
    store.setPage(3);
    expect(store.currentPage).toBe(3);
  });

  it("EXP-15: API 失败时应返回 success: false", async () => {
    mockCreateJob.mockRejectedValueOnce(new Error("服务异常"));
    const result = await store.createJob({ formulaId: "f1", exportType: "excel" });
    expect(result.success).toBe(false);
  });
});
