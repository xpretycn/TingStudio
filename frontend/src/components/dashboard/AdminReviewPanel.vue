<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useApprovalStore } from "@/stores/approval";
import { formatTimestamp } from "@/utils/timeFormat";

const router = useRouter();
const store = useApprovalStore();
const currentView = ref<"pending" | "history" | "material">("pending");
const searchKeyword = ref("");
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null);

// 筛选折叠
const filterExpanded = ref(false);

// 时间范围快捷选项
const dateRangeOptions = [
  { label: "今天", value: "today" },
  { label: "近3天", value: "3d" },
  { label: "近7天", value: "7d" },
  { label: "近30天", value: "30d" },
];

// 排序相关
type SortableField = "createdAt" | "formulaName" | "submittedByName";
const sortableFields: { key: SortableField; label: string }[] = [
  { key: "createdAt", label: "时间" },
  { key: "formulaName", label: "名称" },
  { key: "submittedByName", label: "提交人" },
];

function toggleSort(field: SortableField) {
  if (store.adminSortBy === field) {
    if (store.adminSortOrder === "asc") {
      store.adminSortOrder = "desc";
    } else {
      // 取消排序，恢复默认
      store.adminSortBy = "createdAt";
      store.adminSortOrder = "desc";
    }
  } else {
    store.adminSortBy = field;
    store.adminSortOrder = "asc";
  }
  fetchCurrentView();
}

// 获取激活的筛选数量
const activeFilterCount = computed(() => {
  let count = 0;
  if (store.adminDateRange.length > 0) count++;
  if (store.adminSubmitter) count++;
  if (currentView.value === "history" && store.adminReviewAction.length > 0 && !store.adminReviewAction.includes("all")) count++;
  return count;
});

// 重置筛选
function resetFilters() {
  store.adminDateRange = [];
  store.adminSubmitter = "";
  store.adminReviewAction = [];
  fetchCurrentView();
}

// 提交人列表（从当前数据中提取去重）
const submitterOptions = computed(() => {
  const names = new Set<string>();
  store.pendingReviews.forEach((item) => names.add(item.submittedByName));
  store.reviewedHistory.forEach((item) => names.add(item.submittedByName));
  return Array.from(names).sort().map((name) => ({ label: name, value: name }));
});

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
    const action = store.adminReviewAction.includes("all") || store.adminReviewAction.length === 0 ? undefined : store.adminReviewAction[0];
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
  const action = store.adminReviewAction.includes("all") || store.adminReviewAction.length === 0 ? undefined : store.adminReviewAction[0];
  store.fetchReviewedHistory({ keyword, action, page });
}

watch(currentView, () => {
  searchKeyword.value = "";
  // 切换 tab 时重置筛选条件
  store.adminDateRange = [];
  store.adminSubmitter = "";
  store.adminReviewAction = [];
  store.adminSortBy = "createdAt";
  store.adminSortOrder = "desc";
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

    <!-- 可折叠筛选栏 -->
    <div class="admin-review__filter-bar">
      <div class="admin-review__filter-toggle" @click="filterExpanded = !filterExpanded">
        <t-icon :name="filterExpanded ? 'chevron-up' : 'chevron-down'" />
        <span>筛选</span>
        <t-tag v-if="activeFilterCount > 0" size="small" variant="light" theme="primary">
          {{ activeFilterCount }}
        </t-tag>
      </div>

      <div v-show="filterExpanded" class="admin-review__filter-content">
        <!-- 时间范围 -->
        <div class="admin-review__filter-row">
          <span class="admin-review__filter-label">
            <t-icon name="time" size="14px" /> 时间范围
          </span>
          <div class="admin-review__filter-options">
            <t-check-tag-group v-model="store.adminDateRange" @change="fetchCurrentView()">
              <t-check-tag v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </t-check-tag>
            </t-check-tag-group>
            <button
              v-if="store.adminDateRange.length > 0"
              class="admin-review__filter-clear-btn"
              @click="store.adminDateRange = []; fetchCurrentView()"
            >
              <t-icon name="close-circle-filled" size="12px" />
            </button>
          </div>
        </div>

        <!-- 提交人（非已审核tab显示） -->
        <div v-if="currentView !== 'history'" class="admin-review__filter-row">
          <span class="admin-review__filter-label">
            <t-icon name="user" size="14px" /> 提交人
          </span>
          <t-select
            v-model="store.adminSubmitter"
            placeholder="全部提交人"
            clearable
            size="small"
            :options="submitterOptions"
            style="width: 140px;"
            @change="fetchCurrentView()"
          />
        </div>

        <!-- 审核结果（仅已审核tab显示） -->
        <div v-if="currentView === 'history'" class="admin-review__filter-row">
          <span class="admin-review__filter-label">
            <t-icon name="check-circle" size="14px" /> 审核结果
          </span>
          <t-check-tag-group v-model="store.adminReviewAction" @change="fetchCurrentView()">
            <t-check-tag value="all">全部</t-check-tag>
            <t-check-tag value="approve">已通过</t-check-tag>
            <t-check-tag value="reject">已驳回</t-check-tag>
          </t-check-tag-group>
        </div>

        <div class="admin-review__filter-footer">
          <button class="admin-review__reset-btn" @click="resetFilters()">重置筛选</button>
        </div>
      </div>
    </div>

    <t-loading :loading="store.loading" size="small">
      <div v-if="currentView === 'pending' && store.pendingReviews.length === 0" class="admin-review__empty">
        <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
        <p>暂无待审核配方</p>
        <span>所有配方均已审核完毕</span>
      </div>

      <div v-else-if="currentView === 'pending' && store.pendingReviews.length > 0">
        <!-- 排序列头（数据>5条时显示） -->
        <div v-if="store.pendingReviews.length > 5" class="admin-review__sort-header">
          <span
            class="admin-review__sort-col admin-review__sort-col--name"
            :class="{ active: store.adminSortBy === 'formulaName' }"
            @click="toggleSort('formulaName')"
          >
            名称
            <span v-if="store.adminSortBy === 'formulaName'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="admin-review__sort-col admin-review__sort-col--submitter"
            :class="{ active: store.adminSortBy === 'submittedByName' }"
            @click="toggleSort('submittedByName')"
          >
            提交人
            <span v-if="store.adminSortBy === 'submittedByName'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="admin-review__sort-col admin-review__sort-col--time"
            :class="{ active: store.adminSortBy === 'createdAt' }"
            @click="toggleSort('createdAt')"
          >
            时间
            <span v-if="store.adminSortBy === 'createdAt'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
        </div>
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
        <!-- 排序列头（数据>5条时显示） -->
        <div v-if="store.materialPendingReviews.length > 5" class="admin-review__sort-header">
          <span
            class="admin-review__sort-col admin-review__sort-col--name"
            :class="{ active: store.adminSortBy === 'formulaName' }"
            @click="toggleSort('formulaName')"
          >
            名称
            <span v-if="store.adminSortBy === 'formulaName'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="admin-review__sort-col admin-review__sort-col--time"
            :class="{ active: store.adminSortBy === 'createdAt' }"
            @click="toggleSort('createdAt')"
          >
            时间
            <span v-if="store.adminSortBy === 'createdAt'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
        </div>
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
        <!-- 排序列头（数据>5条时显示） -->
        <div v-if="store.reviewedHistory.length > 5" class="admin-review__sort-header">
          <span
            class="admin-review__sort-col admin-review__sort-col--name"
            :class="{ active: store.adminSortBy === 'formulaName' }"
            @click="toggleSort('formulaName')"
          >
            名称
            <span v-if="store.adminSortBy === 'formulaName'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="admin-review__sort-col admin-review__sort-col--submitter"
            :class="{ active: store.adminSortBy === 'submittedByName' }"
            @click="toggleSort('submittedByName')"
          >
            提交人
            <span v-if="store.adminSortBy === 'submittedByName'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="admin-review__sort-col admin-review__sort-col--time"
            :class="{ active: store.adminSortBy === 'createdAt' }"
            @click="toggleSort('createdAt')"
          >
            审核时间
            <span v-if="store.adminSortBy === 'createdAt'" class="admin-review__sort-arrow">
              {{ store.adminSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
        </div>
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

    &-result {
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
  }

  &__pagination {
    display: flex;
    justify-content: center;
    margin-top: 12px;
    padding-top: 8px;
  }

  &__filter-bar {
    margin-bottom: 8px;
  }

  &__filter-toggle {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid var(--td-component-border);
    border-radius: var(--td-radius-medium);
    cursor: pointer;
    font-size: 12px;
    color: var(--td-text-color-secondary);
    background: var(--td-bg-color-container);
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  &__filter-content {
    margin-top: 8px;
    padding: 10px 12px;
    border: 1px solid var(--td-component-border);
    border-radius: var(--td-radius-medium);
    background: var(--td-bg-color-secondarycontainer);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__filter-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__filter-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    white-space: nowrap;
    min-width: 70px;
  }

  &__filter-options {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  &__filter-clear-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: none;
    color: var(--td-text-color-placeholder);
    cursor: pointer;
    border-radius: 50%;

    &:hover {
      color: var(--color-danger);
      background: rgba(var(--color-danger-rgb, 255,82,82), 0.08);
    }
  }

  &__filter-footer {
    display: flex;
    justify-content: flex-end;
    padding-top: 4px;
    border-top: 1px dashed var(--td-component-border);
  }

  &__reset-btn {
    font-size: 12px;
    color: var(--td-text-color-placeholder);
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px 8px;
    border-radius: var(--td-radius-small);

    &:hover {
      color: var(--color-primary);
      background: rgba(var(--color-primary-rgb, 16,185,129), 0.06);
    }
  }

  &__sort-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 16px;
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    border-bottom: 1px solid var(--td-component-border);
    user-select: none;
  }

  &__sort-col {
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    transition: color 0.15s;
    white-space: nowrap;

    &:hover {
      color: var(--td-text-color-secondary);
    }

    &.active {
      color: var(--color-primary);
      font-weight: 500;
    }

    &--name { flex: 1; }
    &--submitter { width: 80px; text-align: center; }
    &--time { width: 100px; text-align: right; }
  }

  &__sort-arrow {
    font-size: 10px;
  }
}
</style>
