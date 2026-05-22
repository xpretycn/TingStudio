import { ref } from "vue"
import { defineStore } from "pinia"
import { approvalApi, type ApprovalItem, type PendingReviewItem, type ReviewedItem } from "@/api/approval"

export const useApprovalStore = defineStore("approval", () => {
  const mySubmissions = ref<ApprovalItem[]>([])
  const pendingReviews = ref<PendingReviewItem[]>([])
  const reviewedHistory = ref<ReviewedItem[]>([])
  const loading = ref(false)
  const pendingCount = ref(0)
  const myTotal = ref(0)
  const pendingTotal = ref(0)
  const reviewedTotal = ref(0)

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

  return {
    mySubmissions,
    pendingReviews,
    reviewedHistory,
    loading,
    pendingCount,
    myTotal,
    pendingTotal,
    reviewedTotal,
    fetchMySubmissions,
    fetchPendingReviews,
    fetchReviewedHistory,
    approveVersion,
    rejectVersion,
  }
})