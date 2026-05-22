import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useVersionStore } from "@/stores/version";

const {
  submit,
  approve,
  reject,
  getPendingReview,
  getReviewLogs,
  getMaterialUpdates,
  refreshSnapshot,
  setCurrentVersion,
} = vi.hoisted(() => ({
  submit: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  getPendingReview: vi.fn(),
  getReviewLogs: vi.fn(),
  getMaterialUpdates: vi.fn(),
  refreshSnapshot: vi.fn(),
  setCurrentVersion: vi.fn(),
}));

vi.mock("@/api/version", () => ({
  versionApi: {
    submit,
    approve,
    reject,
    getPendingReview,
    getReviewLogs,
    getMaterialUpdates,
    refreshSnapshot,
    setCurrentVersion,
    getList: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    publish: vi.fn(),
    compare: vi.fn(),
  },
}));

describe("useVersionStore", () => {
  let store: ReturnType<typeof useVersionStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useVersionStore();
    vi.clearAllMocks();
  });

  it("V01: submitVersion 成功提交审批", async () => {
    submit.mockResolvedValue({ versionId: "v-001", status: "pending_review" });

    const result = await store.submitVersion("v-001", { comment: "请审核" });

    expect(result.success).toBe(true);
    expect(submit).toHaveBeenCalledWith("v-001", { comment: "请审核" });
  });

  it("V02: submitVersion 失败返回错误信息", async () => {
    submit.mockRejectedValue(new Error("提交审批失败"));

    const result = await store.submitVersion("v-001");

    expect(result.success).toBe(false);
    expect(result.message).toContain("提交审批失败");
  });

  it("V03: approveVersion 成功批准版本", async () => {
    approve.mockResolvedValue({ versionId: "v-001", status: "published" });

    const result = await store.approveVersion("v-001", { comment: "审核通过" });

    expect(result.success).toBe(true);
    expect(approve).toHaveBeenCalledWith("v-001", { comment: "审核通过" });
  });

  it("V04: approveVersion 失败返回错误信息", async () => {
    approve.mockRejectedValue(new Error("批准失败"));

    const result = await store.approveVersion("v-001");

    expect(result.success).toBe(false);
    expect(result.message).toContain("批准失败");
  });

  it("V05: rejectVersion 成功驳回版本", async () => {
    reject.mockResolvedValue({ versionId: "v-001", status: "draft" });

    const result = await store.rejectVersion("v-001", "配方比例有误，请修改后重新提交");

    expect(result.success).toBe(true);
    expect(reject).toHaveBeenCalledWith("v-001", { comment: "配方比例有误，请修改后重新提交" });
  });

  it("V06: rejectVersion 失败返回错误信息", async () => {
    reject.mockRejectedValue(new Error("驳回失败"));

    const result = await store.rejectVersion("v-001", "原因");

    expect(result.success).toBe(false);
    expect(result.message).toContain("驳回失败");
  });

  it("V07: fetchPendingReviews 成功获取待审核列表", async () => {
    const pendingData = {
      list: [
        { versionId: "v-001", formulaName: "配方A", status: "pending_review" },
        { versionId: "v-002", formulaName: "配方B", status: "pending_review" },
      ],
      pagination: { total: 2, page: 1, pageSize: 20 },
    };
    getPendingReview.mockResolvedValue(pendingData);

    const result = await store.fetchPendingReviews({ page: 1, pageSize: 20 });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(pendingData);
    expect(getPendingReview).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
  });

  it("V08: fetchPendingReviews 失败返回错误信息", async () => {
    getPendingReview.mockRejectedValue(new Error("获取待审核列表失败"));

    const result = await store.fetchPendingReviews();

    expect(result.success).toBe(false);
    expect(result.message).toContain("获取待审核列表失败");
  });

  it("V09: fetchReviewLogs 成功获取审核日志", async () => {
    const logsData = {
      logs: [
        { reviewLogId: "rl-001", versionId: "v-001", action: "submit", comment: "提交审核", createdAt: "2024-01-01T00:00:00Z" },
        { reviewLogId: "rl-002", versionId: "v-001", action: "approve", comment: "审核通过", createdAt: "2024-01-02T00:00:00Z" },
      ],
    };
    getReviewLogs.mockResolvedValue(logsData);

    const result = await store.fetchReviewLogs("v-001");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(logsData);
    expect(store.reviewLogs).toHaveLength(2);
    expect(store.reviewLogs[0].reviewLogId).toBe("rl-001");
    expect(getReviewLogs).toHaveBeenCalledWith("v-001");
  });

  it("V10: fetchReviewLogs 失败返回错误信息", async () => {
    getReviewLogs.mockRejectedValue(new Error("获取审核日志失败"));

    const result = await store.fetchReviewLogs("v-001");

    expect(result.success).toBe(false);
    expect(result.message).toContain("获取审核日志失败");
  });

  it("V11: fetchMaterialUpdates 成功获取原料更新信息", async () => {
    const updatesData = {
      formulaId: "f-001",
      formulaName: "配方A",
      versionId: "v-001",
      versionNumber: "1.0",
      materials: [
        { materialId: "m-001", materialName: "当归", isLatest: false, priceChanged: true },
      ],
      hasUpdates: true,
      hasPriceChanges: true,
      totalMaterials: 1,
      outdatedCount: 1,
      priceChangedCount: 1,
    };
    getMaterialUpdates.mockResolvedValue(updatesData);

    const result = await store.fetchMaterialUpdates("f-001");

    expect(result.success).toBe(true);
    expect(result.data).toEqual(updatesData);
    expect(store.materialUpdates).toEqual(updatesData);
    expect(getMaterialUpdates).toHaveBeenCalledWith("f-001");
  });

  it("V12: fetchMaterialUpdates 失败返回错误信息", async () => {
    getMaterialUpdates.mockRejectedValue(new Error("检查原料更新失败"));

    const result = await store.fetchMaterialUpdates("f-001");

    expect(result.success).toBe(false);
    expect(result.message).toContain("检查原料更新失败");
  });

  it("V13: refreshSnapshot 成功刷新原料快照", async () => {
    const snapshotData = { formulaId: "f-001", snapshotUpdated: true };
    refreshSnapshot.mockResolvedValue(snapshotData);

    const result = await store.refreshSnapshot("f-001", { materialIds: ["m-001", "m-002"] });

    expect(result.success).toBe(true);
    expect(result.data).toEqual(snapshotData);
    expect(refreshSnapshot).toHaveBeenCalledWith("f-001", { materialIds: ["m-001", "m-002"] });
  });

  it("V14: refreshSnapshot 失败返回错误信息", async () => {
    refreshSnapshot.mockRejectedValue(new Error("刷新原料数据失败"));

    const result = await store.refreshSnapshot("f-001");

    expect(result.success).toBe(false);
    expect(result.message).toContain("刷新原料数据失败");
  });

  it("V15: setCurrentVersion 成功切换当前版本", async () => {
    setCurrentVersion.mockResolvedValue({ message: "已切换" });

    const result = await store.setCurrentVersion("v-002");

    expect(result.success).toBe(true);
    expect(setCurrentVersion).toHaveBeenCalledWith("v-002");
  });

  it("V16: setCurrentVersion 失败返回错误信息", async () => {
    setCurrentVersion.mockRejectedValue(new Error("切换当前版本失败"));

    const result = await store.setCurrentVersion("v-002");

    expect(result.success).toBe(false);
    expect(result.message).toContain("切换当前版本失败");
  });

  it("V17: loading 状态在异步操作期间正确切换", async () => {
    let resolveSubmit: () => void;
    submit.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve; })
    );

    expect(store.loading).toBe(false);

    const promise = store.submitVersion("v-001");

    expect(store.loading).toBe(true);

    resolveSubmit!();
    await promise;

    expect(store.loading).toBe(false);
  });
});
