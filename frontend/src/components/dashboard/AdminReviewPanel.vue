<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue"
import { useRouter } from "vue-router"
import { useApprovalStore } from "@/stores/approval"
import { formatTimestamp } from "@/utils/timeFormat"
import { MessagePlugin } from "tdesign-vue-next"

const router = useRouter()
const store = useApprovalStore()
const currentView = ref<"pending" | "history" | "material">("pending")

const rejectDialogVisible = ref(false)
const rejectTargetId = ref("")
const rejectTargetName = ref("")
const rejectComment = ref("")

function goReview(formulaId: string) {
  router.push(`/versions/formula/${formulaId}`)
}

function goMaterial(materialId: string) {
  router.push(`/materials/${materialId}`)
}

async function handleApproveMaterial(id: string) {
  try {
    await store.approveMaterial(id)
    MessagePlugin.success("原料审批通过")
  } catch {
    MessagePlugin.error("审批失败")
  }
}

function handleOpenRejectMaterial(id: string, name: string) {
  rejectTargetId.value = id
  rejectTargetName.value = name
  rejectComment.value = ""
  rejectDialogVisible.value = true
}

async function handleConfirmReject() {
  if (!rejectComment.value.trim()) {
    MessagePlugin.warning("请填写驳回原因")
    return false
  }
  try {
    await store.rejectMaterial(rejectTargetId.value, rejectComment.value.trim())
    rejectDialogVisible.value = false
    MessagePlugin.success("已驳回")
  } catch {
    MessagePlugin.error("驳回失败")
  }
  return true
}

watch(currentView, (val) => {
  if (val === "history") {
    store.fetchReviewedHistory()
  } else if (val === "material") {
    store.fetchMaterialPendingReviews()
  } else {
    store.fetchPendingReviews()
  }
})

let pollTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  store.fetchPendingReviews()
  store.fetchReviewedHistory()
  store.fetchMaterialPendingReviews()
  pollTimer = setInterval(() => {
    if (currentView.value === "pending") {
      store.fetchPendingReviews()
    } else if (currentView.value === "material") {
      store.fetchMaterialPendingReviews()
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
        <t-tab-panel value="pending" :label="`配方待审 (${store.pendingCount})`" />
        <t-tab-panel value="material" :label="`原料待审 (${store.materialPendingCount})`" />
        <t-tab-panel value="history" :label="`已审核 (${store.reviewedTotal})`" />
      </t-tabs>
    </div>

    <t-loading :loading="store.loading" size="small">
      <div v-if="currentView === 'pending' && store.pendingReviews.length === 0" class="admin-review__empty">
        <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
        <p>暂无待审核配方</p>
        <span>所有配方均已审核完毕</span>
      </div>

      <div v-else-if="currentView === 'pending' && store.pendingReviews.length > 0">
        <div class="admin-review__list">
          <div v-for="item in store.pendingReviews" :key="item.versionId" class="admin-review__item">
            <div class="admin-review__item-info">
              <router-link :to="`/versions/formula/${item.formulaId}`" class="admin-review__item-name">
                {{ item.formulaName }}
              </router-link>
              <span class="admin-review__item-meta">
                {{ item.formulaCode }} · {{ item.versionNumber }} · #{{ item.versionId.slice(0, 8) }} · 提交人: {{
                  item.submittedByName }}
              </span>
            </div>
            <span class="admin-review__item-time">{{
              formatTimestamp(item.createdAt)
            }}</span>
            <div class="admin-review__item-actions">
              <t-button size="small" theme="primary" @click="goReview(item.formulaId)">
                审核
              </t-button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentView === 'material' && store.materialPendingReviews.length === 0" class="admin-review__empty">
        <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
        <p>暂无待审核原料</p>
        <span>所有原料均已审核完毕</span>
      </div>

      <div v-else-if="currentView === 'material' && store.materialPendingReviews.length > 0">
        <div class="admin-review__list">
          <div v-for="item in store.materialPendingReviews" :key="item.id" class="admin-review__item">
            <div class="admin-review__item-info">
              <a class="admin-review__item-name" @click="goMaterial(item.id)">
                {{ item.name }}
              </a>
              <span class="admin-review__item-meta">
                {{ item.code }} · {{ item.materialType === 'supplement' ? '辅料' : '药材' }}
              </span>
            </div>
            <span class="admin-review__item-time">{{
              formatTimestamp(item.createdAt)
            }}</span>
            <div class="admin-review__item-actions">
              <t-button size="small" theme="primary" @click="handleApproveMaterial(item.id)">
                通过
              </t-button>
              <t-button size="small" theme="danger" variant="outline" @click="handleOpenRejectMaterial(item.id, item.name)">
                驳回
              </t-button>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentView === 'history' && store.reviewedHistory.length === 0" class="admin-review__empty">
        <t-icon name="history" size="48px" />
        <p>暂无审核记录</p>
        <span>审核操作的历史将在此显示</span>
      </div>

      <div v-else-if="currentView === 'history' && store.reviewedHistory.length > 0">
        <div class="admin-review__list">
          <div v-for="item in store.reviewedHistory" :key="item.versionId" class="admin-review__item">
            <div class="admin-review__item-info">
              <router-link :to="`/versions/formula/${item.formulaId}`" class="admin-review__item-name">
                {{ item.formulaName }}
              </router-link>
              <span class="admin-review__item-meta">
                {{ item.formulaCode }} · {{ item.versionNumber }} · #{{ item.versionId.slice(0, 8) }} · 提交人: {{
                  item.submittedByName }}
              </span>
            </div>
            <span class="admin-review__item-time">{{
              formatTimestamp(item.reviewedAt)
            }}</span>
            <div class="admin-review__item-result">
              <t-tag :theme="item.action === 'approve' ? 'success' : 'danger'" variant="light" size="small">
                <t-icon :name="item.action === 'approve' ? 'check-circle' : 'close-circle'" />
                {{ item.action === 'approve' ? '已通过' : '已驳回' }}
              </t-tag>
            </div>
          </div>
        </div>
      </div>
    </t-loading>

    <t-dialog v-model:visible="rejectDialogVisible" header="驳回原料" :confirm-btn="{ content: '确认驳回', theme: 'danger' }" :on-confirm="handleConfirmReject" :on-close="() => rejectDialogVisible = false">
      <div style="padding: 8px 0;">
        <p style="margin-bottom: 12px; font-size: 14px; color: var(--color-text-secondary);">驳回原料「{{ rejectTargetName }}」，请填写驳回原因：</p>
        <t-input v-model="rejectComment" placeholder="请输入驳回原因" :maxlength="200" />
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
}
</style>