import http from "./http";
import type { Pagination } from "./http";

/** 排序字段 */
export type SortField = "createdAt" | "reviewedAt" | "formulaName" | "name" | "submittedByName" | "status";
export type SortOrder = "asc" | "desc";

/** 列表查询参数 */
export interface FetchListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  action?: string;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  dateRange?: string;
  materialType?: string;
}

export interface ReviewLog {
  action: string;
  reviewerName: string;
  comment: string | null;
  createdAt: string;
}

export interface ApprovalItem {
  versionId: string;
  formulaId: string;
  formulaName: string;
  formulaCode: string;
  versionNumber: string;
  versionName?: string;
  status: string;
  submittedBy?: string;
  submittedByName?: string;
  createdAt: string;
  latestReview?: ReviewLog | null;
}

export interface PendingReviewItem {
  versionId: string;
  formulaId: string;
  formulaName: string;
  formulaCode: string;
  versionNumber: string;
  versionName?: string;
  status: string;
  submittedBy: string;
  submittedByName: string;
  createdAt: string;
}

export interface ReviewedItem {
  versionId: string;
  formulaId: string;
  formulaName: string;
  formulaCode: string;
  versionNumber: string;
  versionName?: string;
  status: string;
  createdAt: string;
  submittedByName: string;
  action: string;
  comment: string | null;
  reviewedAt: string;
}

/** 原料提交记录（精简版，用于我的原料列表） */
export interface MaterialSubmissionItem {
  id: string;
  name: string;
  code: string;
  materialType: string;
  status: "draft" | "pending_review" | "published" | "rejected";
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const approvalApi = {
  getMySubmissions(params?: FetchListParams) {
    return http.get<unknown, { list: ApprovalItem[]; pagination: Pagination }>("/versions/my-submissions", { params });
  },

  getMySubmissionCounts() {
    return http.get<unknown, Record<string, number>>("/versions/my-submissions/counts");
  },

  getPendingReviews(params?: FetchListParams) {
    return http.get<unknown, { list: PendingReviewItem[]; pagination: Pagination }>("/versions/pending-review", {
      params,
    });
  },

  getReviewedHistory(params?: FetchListParams) {
    return http.get<unknown, { list: ReviewedItem[]; pagination: Pagination }>("/versions/reviewed-by-me", { params });
  },

  approveVersion(versionId: string, comment?: string) {
    return http.put(`/versions/approve/${versionId}`, { comment: comment || "" });
  },

  rejectVersion(versionId: string, comment: string) {
    return http.put(`/versions/reject/${versionId}`, { comment });
  },

  getReviewLogs(versionId: string) {
    return http.get<unknown, { versionId: string; logs: ReviewLog[] }>(`/versions/review-logs/${versionId}`);
  },

  submitVersion(versionId: string) {
    return http.post(`/versions/submit/${versionId}`);
  },

  getMyMaterialSubmissions(params?: FetchListParams) {
    return http.get<unknown, { list: MaterialSubmissionItem[]; pagination: Pagination }>("/materials/my-submissions", { params })
  },
};
