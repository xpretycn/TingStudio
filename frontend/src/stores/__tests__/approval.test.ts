import { describe, it, expect, vi, beforeEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useApprovalStore } from "@/stores/approval";

const { approvalApiMock, materialApiMock, useAuthStoreMock } = vi.hoisted(() => ({
  approvalApiMock: {
    getMySubmissions: vi.fn(),
    getMySubmissionCounts: vi.fn(),
    getPendingReviews: vi.fn(),
    getReviewedHistory: vi.fn(),
    approveVersion: vi.fn(),
    rejectVersion: vi.fn(),
    getMyMaterialSubmissions: vi.fn(),
  },
  materialApiMock: {
    getPendingReviews: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    getReviewLogs: vi.fn(),
    getMyMaterialCounts: vi.fn(),
  },
  useAuthStoreMock: vi.fn(),
}));

vi.mock("@/api/approval", () => ({ approvalApi: approvalApiMock }));
vi.mock("@/api/material", () => ({ materialApi: materialApiMock }));
vi.mock("@/stores/auth", () => ({ useAuthStore: useAuthStoreMock }));

const MOCK_PENDING_REVIEWS = [
  {
    versionId: "v1",
    formulaId: "f1",
    formulaName: "四物汤",
    formulaCode: "SW001",
    versionNumber: "1.0",
    status: "pending_review",
    submittedBy: "u1",
    submittedByName: "张三",
    createdAt: "2026-05-01T10:00:00Z",
  },
];

const MOCK_REVIEWED_HISTORY = [
  {
    versionId: "v2",
    formulaId: "f2",
    formulaName: "八珍汤",
    formulaCode: "BZ001",
    versionNumber: "2.0",
    status: "published",
    createdAt: "2026-04-20T08:00:00Z",
    submittedByName: "李四",
    action: "approve",
    comment: "通过",
    reviewedAt: "2026-04-21T08:00:00Z",
  },
];

const MOCK_MY_SUBMISSIONS = [
  {
    versionId: "v3",
    formulaId: "f3",
    formulaName: "六味地黄丸",
    formulaCode: "LW001",
    versionNumber: "1.0",
    status: "pending_review",
    submittedBy: "u2",
    submittedByName: "user1",
    createdAt: "2026-05-02T09:00:00Z",
  },
];

const MOCK_STATUS_COUNTS = { draft: 5, pending_review: 3, published: 10, rejected: 2 };

const MOCK_PAGINATION = { page: 1, pageSize: 6, total: 1, totalPages: 1 };
const MOCK_EMPTY_PAGINATION = { page: 1, pageSize: 6, total: 0, totalPages: 0 };

describe("useApprovalStore", () => {
  let store: ReturnType<typeof useApprovalStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useApprovalStore();
    vi.clearAllMocks();
    useAuthStoreMock.mockReturnValue({ user: { role: "admin" } });
  });

  it("AP01: fetchPendingReviews returns formula pending list", async () => {
    approvalApiMock.getPendingReviews.mockResolvedValue({
      list: MOCK_PENDING_REVIEWS,
      pagination: MOCK_PAGINATION,
    });

    await store.fetchPendingReviews();

    expect(store.pendingReviews).toHaveLength(1);
    expect(store.pendingReviews[0].formulaName).toBe("四物汤");
    expect(store.pendingCount).toBe(1);
    expect(store.pendingTotal).toBe(1);
    expect(store.pendingPage).toBe(1);
    expect(store.loading).toBe(false);
    expect(approvalApiMock.getPendingReviews).toHaveBeenCalledTimes(1);
  });

  it("AP02: fetchReviewedHistory returns history", async () => {
    approvalApiMock.getReviewedHistory.mockResolvedValue({
      list: MOCK_REVIEWED_HISTORY,
      pagination: MOCK_PAGINATION,
    });

    await store.fetchReviewedHistory();

    expect(store.reviewedHistory).toHaveLength(1);
    expect(store.reviewedHistory[0].formulaName).toBe("八珍汤");
    expect(store.reviewedHistory[0].action).toBe("approve");
    expect(store.reviewedTotal).toBe(1);
    expect(store.reviewedPage).toBe(1);
    expect(store.loading).toBe(false);
    expect(approvalApiMock.getReviewedHistory).toHaveBeenCalledTimes(1);
  });

  it("AP03: approveVersion succeeds -> version published", async () => {
    approvalApiMock.getPendingReviews.mockResolvedValue({
      list: [],
      pagination: MOCK_EMPTY_PAGINATION,
    });

    await store.approveVersion("v1", "通过");

    expect(approvalApiMock.approveVersion).toHaveBeenCalledWith("v1", "通过");
    expect(approvalApiMock.getPendingReviews).toHaveBeenCalledTimes(1);
    expect(store.loading).toBe(false);
  });

  it("AP04: approveVersion fails -> error", async () => {
    approvalApiMock.approveVersion.mockRejectedValue(new Error("审批失败"));

    await expect(store.approveVersion("v1")).rejects.toThrow("审批失败");

    expect(approvalApiMock.approveVersion).toHaveBeenCalledWith("v1", undefined);
  });

  it("AP05: rejectVersion with comment succeeds", async () => {
    approvalApiMock.getPendingReviews.mockResolvedValue({
      list: [],
      pagination: MOCK_EMPTY_PAGINATION,
    });

    await store.rejectVersion("v1", "配方比例不合理");

    expect(approvalApiMock.rejectVersion).toHaveBeenCalledWith("v1", "配方比例不合理");
    expect(approvalApiMock.getPendingReviews).toHaveBeenCalledTimes(1);
  });

  it("AP06: rejectVersion without comment fails", async () => {
    approvalApiMock.rejectVersion.mockImplementation((_id: string, comment: string) => {
      if (!comment) return Promise.reject(new Error("拒绝理由不能为空"));
      return Promise.resolve();
    });

    await expect(store.rejectVersion("v1", "")).rejects.toThrow("拒绝理由不能为空");
    expect(approvalApiMock.rejectVersion).toHaveBeenCalledWith("v1", "");
  });

  it("AP07: fetchMySubmissions returns own submissions", async () => {
    approvalApiMock.getMySubmissions.mockResolvedValue({
      list: MOCK_MY_SUBMISSIONS,
      pagination: MOCK_PAGINATION,
    });

    await store.fetchMySubmissions();

    expect(store.mySubmissions).toHaveLength(1);
    expect(store.mySubmissions[0].formulaName).toBe("六味地黄丸");
    expect(store.myTotal).toBe(1);
    expect(store.myPage).toBe(1);
    expect(store.loading).toBe(false);
  });

  it("AP08: fetchMyStatusCounts returns status counts", async () => {
    approvalApiMock.getMySubmissionCounts.mockResolvedValue(MOCK_STATUS_COUNTS);

    await store.fetchMyStatusCounts();

    expect(store.myStatusCounts).toEqual(MOCK_STATUS_COUNTS);
    expect(store.myStatusCounts.draft).toBe(5);
    expect(store.myStatusCounts.pending_review).toBe(3);
    expect(store.myStatusCounts.published).toBe(10);
    expect(store.myStatusCounts.rejected).toBe(2);
  });
});
