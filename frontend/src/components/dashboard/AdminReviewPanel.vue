<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useApprovalStore } from "@/stores/approval";
import { formatTimestamp } from "@/utils/timeFormat";

const router = useRouter();
const store = useApprovalStore();
const currentView = ref<"pending" | "history" | "material">("pending");
const searchKeyword = ref("");
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const historyAction = ref<string>("all");

function goReview(formulaId: string) {
  router.push(`/versions/formula/${formulaId}`);
}

function goMaterial(materialId: string) {
  router.push(`/materials/${materialId}/versions`);
}

function fetchCurrentView() {
  const keyword = searchKeyword.value.trim() || undefined;
  if (currentView.value === "pending") {
    store.fetchPendingReviews({ keyword, page: 1 });
  } else if (currentView.value === "material") {
    store.fetchMaterialPendingReviews({ keyword, page: 1 });
  } else {
    const action = historyAction.value === "all" ? undefined : historyAction.value;
    store.fetchReviewedHistory({ keyword, action, page: 1 });
  }
}

function onSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => {
    fetchCurrentView();
  }, 300);
}

function toPage(val: unknown): number {
  if (typeof val === "number") return val
  if (val && typeof val === "object" && "current" in val) return (val as { current: number }).current
  return 1
}

function onPendingPageChange(val: unknown) {
  const page = toPage(val)
  const keyword = searchKeyword.value.trim() || undefined;
  store.fetchPendingReviews({ keyword, page });
}

function onMaterialPageChange(val: unknown) {
  const page = toPage(val)
  const keyword = searchKeyword.value.trim() || undefined;
  store.fetchMaterialPendingReviews({ keyword, page });
}

function onHistoryPageChange(val: unknown) {
  const page = toPage(val)
  const keyword = searchKeyword.value.trim() || undefined;
  const action = historyAction.value === "all" ? undefined : historyAction.value;
  store.fetchReviewedHistory({ keyword, action, page });
}

watch(currentView, () => {
  searchKeyword.value = "";
  historyAction.value = "all";
  fetchCurrentView();
});

watch(historyAction, () => {
  fetchCurrentView();
});

let pollTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  store.fetchPendingReviews({ page: 1 });
  store.fetchReviewedHistory({ page: 1 });
  store.fetchMaterialPendingReviews({ page: 1 });
  pollTimer = setInterval(() => {
    fetchCurrentView();
  }, 30000);
});

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer);
  if (searchTimer.value) clearTimeout(searchTimer.value);
});
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

    <div class="admin-review__search">
      <t-input v-model="searchKeyword" placeholder="搜索名称..." clearable size="small" @input="onSearchInput"
        @clear="fetchCurrentView">
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>
    </div>

    <div v-if="currentView === 'history'" class="admin-review__filter">
      <t-radio-group v-model="historyAction" variant="default-filled" size="small">
        <t-radio-button value="all">全部</t-radio-button>
        <t-radio-button value="approve">已通过</t-radio-button>
        <t-radio-button value="reject">已驳回</t-radio-button>
      </t-radio-group>
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
        <div v-if="store.pendingTotal > store.pendingPageSize" class="admin-review__pagination">
          <t-pagination :current="store.pendingPage" :page-size="store.pendingPageSize" :total="store.pendingTotal"
            size="small" :total-content="false" @current-change="onPendingPageChange" />
        </div>
      </div>

      <div v-else-if="currentView === 'material' && store.materialPendingReviews.length === 0"
        class="admin-review__empty">
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
              <t-button size="small" theme="primary" @click="goMaterial(item.id)">
                审核
              </t-button>
            </div>
          </div>
        </div>
        <div v-if="store.materialPendingCount > store.materialPendingPageSize" class="admin-review__pagination">
          <t-pagination :current="store.materialPendingPage" :page-size="store.materialPendingPageSize"
            :total="store.materialPendingCount" size="small" :total-content="false"
            @current-change="onMaterialPageChange" />
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
        <div v-if="store.reviewedTotal > store.reviewedPageSize" class="admin-review__pagination">
          <t-pagination :current="store.reviewedPage" :page-size="store.reviewedPageSize" :total="store.reviewedTotal"
            size="small" :total-content="false" @current-change="onHistoryPageChange" />
        </div>
      </div>
    </t-loading>
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

  &__search {
    margin-bottom: 12px;
  }

  &__filter {
    margin-bottom: 12px;
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

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    padding-top: 8px;
  }
}
</style>
