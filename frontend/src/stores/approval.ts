import { ref } from "vue"
import { defineStore } from "pinia"
import { approvalApi, type ApprovalItem, type PendingReviewItem, type ReviewedItem } from "@/api/approval"
import { materialApi } from "@/api/material"

export const useApprovalStore = defineStore("approval", () => {
  const mySubmissions = ref<ApprovalItem[]>([])
  const pendingReviews = ref<PendingReviewItem[]>([])
  const reviewedHistory = ref<ReviewedItem[]>([])
  const loading = ref(false)
  const pendingCount = ref(0)
  const myTotal = ref(0)
  const pendingTotal = ref(0)
  const reviewedTotal = ref(0)
  const materialPendingReviews = ref<any[]>([])
  const materialPendingCount = ref(0)

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
    fetchMySubmissions,
    fetchPendingReviews,
    fetchReviewedHistory,
    approveVersion,
    rejectVersion,
    fetchMaterialPendingReviews,
    approveMaterial,
    rejectMaterial,
  }
})