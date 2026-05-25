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
  const pendingTotal = ref(0)
  const reviewedTotal = ref(0)
  const materialPendingReviews = ref<Material[]>([])
  const materialPendingCount = ref(0)
  const myMaterialSubmissions = ref<MyMaterialItem[]>([])
  const myMaterialLoading = ref(false)
  const myMaterialTotal = ref(0)

  async function fetchMySubmissions(page = 1, pageSize = 50) {
    loading.value = true
    try {
      const data = await approvalApi.getMySubmissions({ page, pageSize })
      mySubmissions.value = data.list
      myTotal.value = data.pagination.total
    } catch {
      mySubmissions.value = []
    } finally {
      loading.value = false
    }
  }

  async function fetchPendingReviews(page = 1, pageSize = 50) {
    loading.value = true
    try {
      const data = await approvalApi.getPendingReviews({ page, pageSize })
      pendingReviews.value = data.list
      pendingCount.value = data.pagination.total
      pendingTotal.value = data.pagination.total
    } catch {
      pendingReviews.value = []
      pendingCount.value = 0
    } finally {
      loading.value = false
    }
  }

  async function fetchReviewedHistory(page = 1, pageSize = 50) {
    loading.value = true
    try {
      const data = await approvalApi.getReviewedHistory({ page, pageSize })
      reviewedHistory.value = data.list
      reviewedTotal.value = data.pagination.total
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

  async function fetchMaterialPendingReviews(page = 1, pageSize = 50) {
    try {
      const data = await materialApi.getPendingReviews({ page, pageSize })
      materialPendingReviews.value = data.list || []
      materialPendingCount.value = data.pagination?.total || 0
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

  async function fetchMyMaterialSubmissions(page = 1, pageSize = 100) {
    myMaterialLoading.value = true
    try {
      const data = await materialApi.getList({ page, pageSize })
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

  return {
    mySubmissions,
    pendingReviews,
    reviewedHistory,
    loading,
    pendingCount,
    myTotal,
    pendingTotal,
    reviewedTotal,
    materialPendingReviews,
    materialPendingCount,
    myMaterialSubmissions,
    myMaterialLoading,
    myMaterialTotal,
    fetchMySubmissions,
    fetchPendingReviews,
    fetchReviewedHistory,
    approveVersion,
    rejectVersion,
    fetchMaterialPendingReviews,
    approveMaterial,
    rejectMaterial,
    fetchMyMaterialSubmissions,
    submitMaterialForReview,
  }
})