import http from "./http"
import type { Pagination } from "./http"

export interface ReviewLog {
  action: string
  reviewerName: string
  comment: string | null
  createdAt: string
}

export interface ApprovalItem {
  versionId: string
  formulaId: string
  formulaName: string
  formulaCode: string
  versionNumber: string
  versionName?: string
  status: string
  submittedBy?: string
  submittedByName?: string
  createdAt: string
  latestReview?: ReviewLog | null
}

export interface PendingReviewItem {
  versionId: string
  formulaId: string
  formulaName: string
  formulaCode: string
  versionNumber: string
  versionName?: string
  status: string
  submittedBy: string
  submittedByName: string
  createdAt: string
}

export interface ReviewedItem {
  versionId: string
  formulaId: string
  formulaName: string
  formulaCode: string
  versionNumber: string
  versionName?: string
  status: string
  createdAt: string
  submittedByName: string
  action: string
  comment: string | null
  reviewedAt: string
}

export const approvalApi = {
  getMySubmissions(params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    return http.get<unknown, { list: ApprovalItem[]; pagination: Pagination }>("/versions/my-submissions", { params })
  },

  getPendingReviews(params?: { page?: number; pageSize?: number; keyword?: string }) {
    return http.get<unknown, { list: PendingReviewItem[]; pagination: Pagination }>("/versions/pending-review", { params })
  },

  getReviewedHistory(params?: { page?: number; pageSize?: number; keyword?: string; action?: string }) {
    return http.get<unknown, { list: ReviewedItem[]; pagination: Pagination }>("/versions/reviewed-by-me", { params })
  },

  approveVersion(versionId: string, comment?: string) {
    return http.put(`/versions/approve/${versionId}`, { comment: comment || "" })
  },

  rejectVersion(versionId: string, comment: string) {
    return http.put(`/versions/reject/${versionId}`, { comment })
  },

  getReviewLogs(versionId: string) {
    return http.get<unknown, { versionId: string; logs: ReviewLog[] }>(`/versions/review-logs/${versionId}`)
  },

  submitVersion(versionId: string) {
    return http.post(`/versions/submit/${versionId}`)
  },
}
