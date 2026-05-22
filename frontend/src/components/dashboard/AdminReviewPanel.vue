<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import { useApprovalStore } from "@/stores/approval"
import { formatTimestamp } from "@/utils/timeFormat"
import type { PendingReviewItem } from "@/api/approval"

const store = useApprovalStore()
const currentView = ref<"pending" | "history">("pending")

const rejectDialogVisible = ref(false)
const rejectComment = ref("")
const rejectTarget = ref<PendingReviewItem | null>(null)
const rejectSubmitting = ref(false)

const approveComment = ref("")

function onApprove(item: PendingReviewItem) {
  store.approveVersion(item.versionId, approveComment.value || undefined).then(
    () => {
      MessagePlugin.success(`${item.formulaName} 已通过审批`)
      approveComment.value = ""
    }
  )
}

function openReject(item: PendingReviewItem) {
  rejectTarget.value = item
  rejectComment.value = ""
  rejectDialogVisible.value = true
}

async function onRejectConfirm() {
  if (!rejectComment.value.trim()) {
    MessagePlugin.warning("请填写驳回原因")
    return
  }
  if (!rejectTarget.value) return
  rejectSubmitting.value = true
  try {
    await store.rejectVersion(rejectTarget.value.versionId, rejectComment.value.trim())
    MessagePlugin.success(`${rejectTarget.value.formulaName} 已驳回`)
    rejectDialogVisible.value = false
  } catch {
    MessagePlugin.error("驳回操作失败")
  } finally {
    rejectSubmitting.value = false
  }
}

watch(currentView, (val) => {
  if (val === "history") {
    store.fetchReviewedHistory()
  } else {
    store.fetchPendingReviews()
  }
})

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  store.fetchPendingReviews()
  store.fetchReviewedHistory()
  pollTimer = setInterval(() => {
    if (currentView.value === "pending") {
      store.fetchPendingReviews()
    } else {
      store.fetchReviewedHistory()
    }
  }, 30000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
</script>

<template>
  <div class="admin-review">
    <div class="admin-review__tabs">
      <t-tabs v-model="currentView" size="medium">
        <t-tab-panel value="pending" :label="`待审核 (${store.pendingCount})`" />
        <t-tab-panel value="history" :label="`已审核 (${store.reviewedTotal})`" />
      </t-tabs>
    </div>

    <t-loading :loading="store.loading" size="small">
      <div
        v-if="currentView === 'pending' && store.pendingReviews.length === 0"
        class="admin-review__empty"
      >
        <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
        <p>暂无待审核配方</p>
        <span>所有配方均已审核完毕</span>
      </div>

      <div
        v-else-if="currentView === 'pending' && store.pendingReviews.length > 0"
      >
        <div class="admin-review__list">
          <div
            v-for="item in store.pendingReviews"
            :key="item.versionId"
            class="admin-review__item"
          >
            <div class="admin-review__item-info">
              <router-link
                :to="`/formulas/${item.formulaId}`"
                class="admin-review__item-name"
              >
                {{ item.formulaName }}
              </router-link>
              <span class="admin-review__item-meta">
                {{ item.formulaCode }} · {{ item.versionNumber }} · 提交人: {{ item.submittedByName }}
              </span>
            </div>
            <span class="admin-review__item-time">{{
              formatTimestamp(item.createdAt)
            }}</span>
            <div class="admin-review__item-actions">
              <t-button size="small" theme="primary" @click="onApprove(item)">
                通过
              </t-button>
              <t-button size="small" theme="danger" variant="outline" @click="openReject(item)">
                驳回
              </t-button>
            </div>
          </div>
        </div>
      </div>

      <div
        v-else-if="currentView === 'history' && store.reviewedHistory.length === 0"
        class="admin-review__empty"
      >
        <t-icon name="history" size="48px" />
        <p>暂无审核记录</p>
        <span>审核操作的历史将在此显示</span>
      </div>

      <div
        v-else-if="currentView === 'history' && store.reviewedHistory.length > 0"
      >
        <div class="admin-review__list">
          <div
            v-for="item in store.reviewedHistory"
            :key="item.versionId"
            class="admin-review__item"
          >
            <div class="admin-review__item-info">
              <router-link
                :to="`/formulas/${item.formulaId}`"
                class="admin-review__item-name"
              >
                {{ item.formulaName }}
              </router-link>
              <span class="admin-review__item-meta">
                {{ item.formulaCode }} · {{ item.versionNumber }} · 提交人: {{ item.submittedByName }}
              </span>
            </div>
            <span class="admin-review__item-time">{{
              formatTimestamp(item.reviewedAt)
            }}</span>
            <div class="admin-review__item-result">
              <t-tag
                :theme="item.action === 'approve' ? 'success' : 'danger'"
                variant="light"
                size="small"
              >
                <t-icon :name="item.action === 'approve' ? 'check-circle' : 'close-circle'" />
                {{ item.action === 'approve' ? '已通过' : '已驳回' }}
              </t-tag>
            </div>
          </div>
        </div>
      </div>
    </t-loading>

    <t-dialog
      v-model:visible="rejectDialogVisible"
      header="驳回配方"
      :confirm-btn="{ content: '确认驳回', theme: 'danger', loading: rejectSubmitting }"
      @confirm="onRejectConfirm"
      width="480px"
    >
      <div class="admin-review__reject-form">
        <p v-if="rejectTarget" class="admin-review__reject-target">
          配方: <strong>{{ rejectTarget.formulaName }}</strong>
          ({{ rejectTarget.versionNumber }})
        </p>
        <p class="admin-review__reject-hint">请填写驳回原因，配方师将看到此信息</p>
        <t-textarea
          v-model="rejectComment"
          placeholder="请输入驳回原因（必填）"
          :maxlength="500"
          :autosize="{ minRows: 3, maxRows: 6 }"
        />
      </div>
    </t-dialog>
  </div>
</template>

<style lang="scss" scoped>
.admin-review {
  &__tabs {
    margin-bottom: 12px;
    --td-brand-color: var(--color-primary);
  }

  :deep(.t-tabs__track) {
    background: var(--color-primary);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 0;
    color: var(--td-text-color-placeholder);

    p {
      margin: 12px 0 4px;
      font-size: 14px;
      color: var(--td-text-color-secondary);
    }

    span {
      font-size: 12px;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 10px 16px;
    border: 1px solid var(--td-component-border);
    border-radius: var(--td-radius-medium);
    background: var(--td-bg-color-secondarycontainer);
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--color-primary);
    }

    &-info {
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
      white-space: nowrap;

      &:hover {
        text-decoration: underline;
      }
    }

    &-meta {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
      white-space: nowrap;
    }

    &-time {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
      white-space: nowrap;
      flex-shrink: 0;
    }

    &-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
  }

  &__reject-form {
    p {
      margin: 0 0 8px;
      font-size: 13px;
    }
  }

  &__reject-target {
    color: var(--td-text-color-primary);
  }

  &__reject-hint {
    color: var(--td-text-color-placeholder);
  }
}
</style>