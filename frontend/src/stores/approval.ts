import { ref } from "vue"
import { defineStore } from "pinia"
import { approvalApi, type ApprovalItem, type PendingReviewItem, type ReviewedItem } from "@/api/approval"
import { materialApi, type Material } from "@/api/material"

export interface MyMaterialItem {
  id: string
  name: string
  code: string
  materialType: string
  status: "draft" | "pending_review" | "published"
  version: number
  createdBy: string
  createdAt: string
  updatedAt: string
  isLatest: number
  latestReview?: {
    action: string
    reviewerName: string | null
    comment: string | null
    createdAt: string
  } | null
}

export const useApprovalStore = defineStore("approval", () => {
  const mySubmissions = ref<ApprovalItem[]>([])
  const pendingReviews = ref<PendingReviewItem[]>([])
  const reviewedHistory = ref<ReviewedItem[]>([])
  const loading = ref(false)
  const pendingCount = ref(0)
  const myTotal = ref(0)
  const myPage = ref(1)
  const myPageSize = ref(10)
  const pendingTotal = ref(0)
  const pendingPage = ref(1)
  const pendingPageSize = ref(10)
  const reviewedTotal = ref(0)
  const reviewedPage = ref(1)
  const reviewedPageSize = ref(10)
  const materialPendingReviews = ref<Material[]>([])
  const materialPendingCount = ref(0)
  const materialPendingPage = ref(1)
  const materialPendingPageSize = ref(10)
  const myMaterialSubmissions = ref<MyMaterialItem[]>([])
  const myMaterialLoading = ref(false)
  const myMaterialTotal = ref(0)
  const myMaterialPage = ref(1)
  const myMaterialPageSize = ref(10)
  const myStatusCounts = ref<Record<string, number>>({ draft: 0, pending_review: 0, published: 0, rejected: 0 })
  const myMaterialStatusCounts = ref<Record<string, number>>({ draft: 0, pending_review: 0, published: 0, rejected: 0 })

  async function fetchMySubmissions(params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    loading.value = true
    try {
      const page = params?.page ?? myPage.value
      const pageSize = params?.pageSize ?? myPageSize.value
      const data = await approvalApi.getMySubmissions({ page, pageSize, keyword: params?.keyword, status: params?.status })
      mySubmissions.value = data.list
      myTotal.value = data.pagination.total
      myPage.value = data.pagination.page
      myPageSize.value = data.pagination.pageSize
    } catch {
      mySubmissions.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchMyStatusCounts() {
    try {
      const data = await approvalApi.getMySubmissionCounts()
      myStatusCounts.value = data
    } catch {
      // ignore
    }
  }

  async function fetchPendingReviews(params?: { page?: number; pageSize?: number; keyword?: string }) {
    loading.value = true
    try {
      const page = params?.page ?? pendingPage.value
      const pageSize = params?.pageSize ?? pendingPageSize.value
      const data = await approvalApi.getPendingReviews({ page, pageSize, keyword: params?.keyword })
      pendingReviews.value = data.list
      pendingCount.value = data.pagination.total
      pendingTotal.value = data.pagination.total
      pendingPage.value = data.pagination.page
      pendingPageSize.value = data.pagination.pageSize
    } catch {
      pendingReviews.value = []
      pendingCount.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchReviewedHistory(params?: { page?: number; pageSize?: number; keyword?: string; action?: string }) {
    loading.value = true
    try {
      const page = params?.page ?? reviewedPage.value
      const pageSize = params?.pageSize ?? reviewedPageSize.value
      const data = await approvalApi.getReviewedHistory({ page, pageSize, keyword: params?.keyword, action: params?.action })
      reviewedHistory.value = data.list
      reviewedTotal.value = data.pagination.total
      reviewedPage.value = data.pagination.page
      reviewedPageSize.value = data.pagination.pageSize
    } catch {
      reviewedHistory.value = []
      reviewedTotal.value = 0
    } finally {
      loading.value = false
    }
  }

  async function approveVersion(versionId: string, comment?: string) {
    await approvalApi.approveVersion(versionId, comment)
    await fetchPendingReviews()
  }

  async function rejectVersion(versionId: string, comment: string) {
    await approvalApi.rejectVersion(versionId, comment)
    await fetchPendingReviews()
  }

  async function fetchMaterialPendingReviews(params?: { page?: number; pageSize?: number; keyword?: string }) {
    try {
      const page = params?.page ?? materialPendingPage.value
      const pageSize = params?.pageSize ?? materialPendingPageSize.value
      const data = await materialApi.getPendingReviews({ page, pageSize, keyword: params?.keyword })
      materialPendingReviews.value = data.list || []
      materialPendingCount.value = data.pagination?.total || 0
      materialPendingPage.value = data.pagination?.page ?? page
      materialPendingPageSize.value = data.pagination?.pageSize ?? pageSize
    } catch {
      materialPendingReviews.value = []
      materialPendingCount.value = 0
    }
  }

  async function approveMaterial(id: string, comment?: string) {
    await materialApi.approve(id, comment)
    await fetchMaterialPendingReviews()
    await fetchPendingReviews()
  }

  async function rejectMaterial(id: string, comment: string) {
    await materialApi.reject(id, comment)
    await fetchMaterialPendingReviews()
    await fetchPendingReviews()
  }

  async function fetchMyMaterialSubmissions(params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) {
    myMaterialLoading.value = true
    try {
      const page = params?.page ?? myMaterialPage.value
      const pageSize = params?.pageSize ?? myMaterialPageSize.value
      const data = await materialApi.getList({ page, pageSize, keyword: params?.keyword, status: params?.status, scope: "mine" })
      const ownedMaterials = (data.list || []).filter((m: Material) => m.isOwner)

      const items: MyMaterialItem[] = await Promise.all(
        ownedMaterials.map(async (m: Material) => {
          let latestReview: MyMaterialItem["latestReview"] = null
          if (m.status === "draft") {
            try {
              const logs = await materialApi.getReviewLogs(m.id)
              const rejectLog = logs.find((log) => log.action === "reject")
              if (rejectLog) {
                latestReview = {
                  action: rejectLog.action,
                  reviewerName: rejectLog.reviewerName,
                  comment: rejectLog.comment,
                  createdAt: rejectLog.createdAt,
                }
              }
            } catch {
              // ignore individual log fetch errors
            }
          }
          return {
            id: m.id,
            name: m.name,
            code: m.code,
            materialType: m.materialType,
            status: m.status,
            version: m.version,
            createdBy: m.createdBy,
            createdAt: m.createdAt,
            updatedAt: m.updatedAt,
            isLatest: m.isLatest,
            latestReview,
          }
        }),
      )

      myMaterialSubmissions.value = items
      myMaterialTotal.value = items.length
      myMaterialPage.value = data.pagination?.page ?? page
      myMaterialPageSize.value = data.pagination?.pageSize ?? pageSize
    } catch {
      myMaterialSubmissions.value = []
      myMaterialTotal.value = 0
    } finally {
      myMaterialLoading.value = false
    }
  }

  async function submitMaterialForReview(id: string, comment?: string) {
    await materialApi.submitReview(id, comment)
    await fetchMyMaterialSubmissions()
  }

  async function fetchMyMaterialStatusCounts() {
    try {
      const data = await materialApi.getMyMaterialCounts()
      myMaterialStatusCounts.value = data
    } catch {
      // ignore
    }
  }

  return {
    mySubmissions,
    pendingReviews,
    reviewedHistory,
    loading,
    pendingCount,
    myTotal,
    myPage,
    myPageSize,
    myStatusCounts,
    myMaterialStatusCounts,
    pendingTotal,
    pendingPage,
    pendingPageSize,
    reviewedTotal,
    reviewedPage,
    reviewedPageSize,
    materialPendingReviews,
    materialPendingCount,
    materialPendingPage,
    materialPendingPageSize,
    myMaterialSubmissions,
    myMaterialLoading,
    myMaterialTotal,
    myMaterialPage,
    myMaterialPageSize,
    fetchMySubmissions,
    fetchMyStatusCounts,
    fetchPendingReviews,
    fetchReviewedHistory,
    approveVersion,
    rejectVersion,
    fetchMaterialPendingReviews,
    approveMaterial,
    rejectMaterial,
    fetchMyMaterialSubmissions,
    submitMaterialForReview,
    fetchMyMaterialStatusCounts,
  }
})
