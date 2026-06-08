<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useApprovalStore, type MyMaterialItem, type SortField, type SortOrder } from "@/stores/approval";
import { formatTimestamp } from "@/utils/timeFormat";
import type { ApprovalItem } from "@/api/approval";

const router = useRouter();
const store = useApprovalStore();
const activeTab = ref("all");
const moduleTab = ref("formula");
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
type MySortableField = "createdAt" | "formulaName" | "status";
const mySortableFields: { key: MySortableField; label: string }[] = [
  { key: "createdAt", label: "时间" },
  { key: "formulaName", label: "名称" },
  { key: "status", label: "状态" },
];

function toggleSort(field: MySortableField) {
  if (store.myListSortBy === field) {
    if (store.myListSortOrder === "asc") {
      store.myListSortOrder = "desc";
    } else {
      store.myListSortBy = "createdAt";
      store.myListSortOrder = "desc";
    }
  } else {
    store.myListSortBy = field;
    store.myListSortOrder = "asc";
  }
  fetchCurrentData();
}

// 激活筛选数量
const activeFilterCount = computed(() => {
  let count = 0;
  if (store.myListDateRange.length > 0) count++;
  if (moduleTab.value === "material" && store.myListMaterialType.length > 0) count++;
  return count;
});

// 重置筛选
function resetFilters() {
  store.myListDateRange = [];
  store.myListMaterialType = [];
  fetchCurrentData();
}

const statusMap: Record<string, { label: string; theme: string; }> = {
  pending_review: { label: "待审核", theme: "warning" },
  published: { label: "已通过", theme: "success" },
  draft: { label: "草稿", theme: "default" },
  archived: { label: "已归档", theme: "default" },
};

function statusLabel(status: string, item: ApprovalItem): string {
  if (item.latestReview?.action === "reject") return "已驳回";
  return statusMap[status]?.label || status;
}

function statusTheme(status: string, item: ApprovalItem): string {
  if (item.latestReview?.action === "reject") return "danger";
  return statusMap[status]?.theme || "default";
}

function materialStatusLabel(status: string, item: MyMaterialItem): string {
  if (item.latestReview?.action === "reject" && status === "draft") return "已驳回";
  return statusMap[status]?.label || status;
}

function materialStatusTheme(status: string, item: MyMaterialItem): string {
  if (item.latestReview?.action === "reject" && status === "draft") return "danger";
  return statusMap[status]?.theme || "default";
}

function progressStep(status: string): number {
  if (status === "pending_review") return 1;
  if (status === "published" || status === "archived") return 2;
  return 0;
}

const expandedItems = ref<Set<string>>(new Set());

function toggleExpand(versionId: string) {
  if (expandedItems.value.has(versionId)) {
    expandedItems.value.delete(versionId);
  } else {
    expandedItems.value.add(versionId);
  }
}

const materialExpandedItems = ref<Set<string>>(new Set());

function toggleMaterialExpand(materialId: string) {
  if (materialExpandedItems.value.has(materialId)) {
    materialExpandedItems.value.delete(materialId);
  } else {
    materialExpandedItems.value.add(materialId);
  }
}

function goMaterial(materialId: string) {
  router.push(`/materials/${materialId}/versions`);
}

function goToFormulaVersion(formulaId: string) {
  router.push(`/versions/formula/${formulaId}`);
}

function getMaterialTypeLabel(type: string): string {
  return type === "supplement" ? "辅料" : "药材";
}

function getFilterStatus(): string | undefined {
  if (activeTab.value === "all") return undefined;
  if (activeTab.value === "rejected") return "rejected";
  return activeTab.value;
}

function fetchCurrentData() {
  const keyword = searchKeyword.value.trim() || undefined;
  const status = getFilterStatus();
  if (moduleTab.value === "formula") {
    store.fetchMySubmissions({
      keyword,
      status,
      page: 1,
      sortBy: store.myListSortBy === "formulaName" ? "formulaName" :
              store.myListSortBy === "status" ? undefined as unknown as SortField : "createdAt",
      sortOrder: store.myListSortOrder,
      dateRange: store.myListDateRange[0] || undefined,
    });
  } else {
    store.fetchMyMaterialSubmissions({
      keyword,
      status,
      page: 1,
      sortBy: store.myListSortBy === "formulaName" ? "name" as SortField :
              store.myListSortBy === "status" ? undefined as unknown as SortField : "createdAt",
      sortOrder: store.myListSortOrder,
      dateRange: store.myListDateRange[0] || undefined,
    });
  }
}

function onSearchInput() {
  if (searchTimer.value) clearTimeout(searchTimer.value);
  searchTimer.value = setTimeout(() => {
    fetchCurrentData();
  }, 300);
}

function toPage(val: unknown): number {
  if (typeof val === "number") return val;
  if (val && typeof val === "object" && "current" in val) return (val as { current: number; }).current;
  return 1;
}

function onFormulaPageChange(val: unknown) {
  const page = toPage(val);
  const keyword = searchKeyword.value.trim() || undefined;
  const status = getFilterStatus();
  store.fetchMySubmissions({ keyword, status, page });
}

const formulaTotalPages = computed(() => Math.ceil(store.myTotal / store.myPageSize));
const materialTotalPages = computed(() => Math.ceil(store.myMaterialTotal / store.myMaterialPageSize));

onMounted(() => {
  store.fetchMySubmissions({ page: 1 });
  store.fetchMyMaterialSubmissions({ page: 1 });
  store.fetchMyStatusCounts();
  store.fetchMyMaterialStatusCounts();
});

watch(moduleTab, () => {
  activeTab.value = "all";
  searchKeyword.value = "";
  store.myListMaterialType = []; // 重置类型筛选
  store.fetchMySubmissions({ page: 1 });
  store.fetchMyMaterialSubmissions({ page: 1 });
});

watch(activeTab, () => {
  fetchCurrentData();
});
</script>

<template>
  <div class="my-approval">
    <div class="my-approval__module-tabs">
      <t-tabs v-model="moduleTab" size="medium">
        <t-tab-panel value="formula" label="配方审批" />
        <t-tab-panel value="material" :label="`原料审批 (${store.myMaterialTotal})`" />
      </t-tabs>
    </div>

    <div class="my-approval__search">
      <t-input v-model="searchKeyword" placeholder="搜索名称..." clearable size="small" @input="onSearchInput"
        @clear="fetchCurrentData">
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>
    </div>

    <!-- 可折叠筛选栏 -->
    <div class="my-approval__filter-bar">
      <div class="my-approval__filter-toggle" @click="filterExpanded = !filterExpanded">
        <t-icon :name="filterExpanded ? 'chevron-up' : 'chevron-down'" />
        <span>筛选</span>
        <t-tag v-if="activeFilterCount > 0" size="small" variant="light" theme="primary">
          {{ activeFilterCount }}
        </t-tag>
      </div>

      <div v-show="filterExpanded" class="my-approval__filter-content">
        <!-- 时间范围 -->
        <div class="my-approval__filter-row">
          <span class="my-approval__filter-label">
            <t-icon name="time" size="14px" /> 时间范围
          </span>
          <div class="my-approval__filter-options">
            <t-check-tag-group v-model="store.myListDateRange" @change="fetchCurrentData()">
              <t-check-tag v-for="opt in dateRangeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </t-check-tag>
            </t-check-tag-group>
            <button
              v-if="store.myListDateRange.length > 0"
              class="my-approval__filter-clear-btn"
              @click="store.myListDateRange = []; fetchCurrentData()"
            >
              <t-icon name="close-circle-filled" size="12px" />
            </button>
          </div>
        </div>

        <!-- 类型筛选（仅原料审批tab） -->
        <div v-if="moduleTab === 'material'" class="my-approval__filter-row">
          <span class="my-approval__filter-label">
            <t-icon name="category" size="14px" /> 类型
          </span>
          <t-check-tag-group v-model="store.myListMaterialType" @change="fetchCurrentData()">
            <t-check-tag value="">全部</t-check-tag>
            <t-check-tag value="herb">药材</t-check-tag>
            <t-check-tag value="supplement">辅料</t-check-tag>
          </t-check-tag-group>
        </div>

        <div class="my-approval__filter-footer">
          <button class="my-approval__reset-btn" @click="resetFilters()">重置筛选</button>
        </div>
      </div>
    </div>

    <template v-if="moduleTab === 'formula'">
      <div class="my-approval__tabs">
        <t-tabs v-model="activeTab" size="medium">
          <t-tab-panel value="all" :label="`全部 (${store.myTotal})`" />
          <t-tab-panel value="draft" :label="`草稿 (${store.myStatusCounts.draft})`" />
          <t-tab-panel value="pending_review" :label="`待审核 (${store.myStatusCounts.pending_review})`" />
          <t-tab-panel value="published" :label="`已通过 (${store.myStatusCounts.published})`" />
          <t-tab-panel value="rejected" :label="`已驳回 (${store.myStatusCounts.rejected})`" />
        </t-tabs>
      </div>

      <t-loading :loading="store.loading" size="small">
        <div v-if="store.mySubmissions.length === 0" class="my-approval__empty">
          <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
          <p>暂无审批记录</p>
          <span>提交配方后，审批状态将在此显示</span>
        </div>

        <div v-if="store.mySubmissions.length > 5" class="my-approval__sort-header">
          <span
            class="my-approval__sort-col my-approval__sort-col--name"
            :class="{ active: store.myListSortBy === 'formulaName' }"
            @click="toggleSort('formulaName')"
          >
            名称
            <span v-if="store.myListSortBy === 'formulaName'" class="my-approval__sort-arrow">
              {{ store.myListSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="my-approval__sort-col my-approval__sort-col--status"
            :class="{ active: store.myListSortBy === 'status' }"
            @click="toggleSort('status')"
          >
            状态
            <span v-if="store.myListSortBy === 'status'" class="my-approval__sort-arrow">
              {{ store.myListSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="my-approval__sort-col my-approval__sort-col--time"
            :class="{ active: store.myListSortBy === 'createdAt' }"
            @click="toggleSort('createdAt')"
          >
            时间
            <span v-if="store.myListSortBy === 'createdAt'" class="my-approval__sort-arrow">
              {{ store.myListSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
        </div>

        <div v-else class="my-approval__list">
          <div v-for="item in store.mySubmissions" :key="item.versionId" class="my-approval__item">
            <div class="my-approval__item-header">
              <div class="my-approval__item-info">
                <router-link :to="`/versions/formula/${item.formulaId}`" class="my-approval__item-name">
                  {{ item.formulaName }}
                </router-link>
                <span class="my-approval__item-meta">
                  {{ item.formulaCode }} · {{ item.versionNumber }} · #{{ item.versionId.slice(0, 8) }}
                </span>
              </div>
              <div class="my-approval__item-right">
                <t-tag :theme="statusTheme(item.status, item)" variant="light" size="small">
                  {{ statusLabel(item.status, item) }}
                </t-tag>
                <span class="my-approval__item-time">{{
                  formatTimestamp(item.createdAt)
                }}</span>
              </div>
            </div>

            <div class="my-approval__progress">
              <div class="my-approval__progress-step" :class="{ active: true }">
                <span class="my-approval__progress-dot"></span>
                <span class="my-approval__progress-label">草稿</span>
              </div>
              <div class="my-approval__progress-line" :class="{ active: progressStep(item.status) >= 1 }"></div>
              <div class="my-approval__progress-step" :class="{ active: progressStep(item.status) >= 1 }">
                <span class="my-approval__progress-dot"></span>
                <span class="my-approval__progress-label">审核中</span>
              </div>
              <div class="my-approval__progress-line" :class="{ active: progressStep(item.status) >= 2 }"></div>
              <div class="my-approval__progress-step" :class="{
                active: progressStep(item.status) >= 2,
                rejected: item.latestReview?.action === 'reject',
              }">
                <span class="my-approval__progress-dot"></span>
                <span class="my-approval__progress-label">
                  {{ item.latestReview?.action === "reject" ? "已驳回" : "已发布" }}
                </span>
              </div>
            </div>

            <div v-if="item.status === 'draft'" class="my-approval__submit-row">
              <t-button size="small" theme="primary" variant="outline" @click="goToFormulaVersion(item.formulaId)">
                提交审批
              </t-button>
            </div>

            <div v-if="item.latestReview?.action === 'reject'" class="my-approval__reject-reason">
              <div class="my-approval__reject-toggle" @click="toggleExpand(item.versionId)">
                <t-icon :name="expandedItems.has(item.versionId)
                  ? 'chevron-up'
                  : 'chevron-down'
                  " />
                <span>驳回意见</span>
              </div>
              <div v-if="expandedItems.has(item.versionId)" class="my-approval__reject-content">
                <p class="my-approval__reject-comment">
                  {{ item.latestReview.comment || "未提供具体原因" }}
                </p>
                <p class="my-approval__reject-meta">
                  驳回人: {{ item.latestReview.reviewerName }}
                  · {{ formatTimestamp(item.latestReview.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="store.myTotal > store.myPageSize" class="my-approval__pagination">
          <t-pagination :current="store.myPage" :page-size="store.myPageSize" :total="store.myTotal" size="small"
            :total-content="false" @current-change="onFormulaPageChange" />
        </div>
      </t-loading>
    </template>

    <template v-if="moduleTab === 'material'">
      <div class="my-approval__tabs">
        <t-tabs v-model="activeTab" size="medium">
          <t-tab-panel value="all" :label="`全部 (${store.myMaterialTotal})`" />
          <t-tab-panel value="draft" :label="`草稿 (${store.myMaterialStatusCounts.draft})`" />
          <t-tab-panel value="pending_review" :label="`待审核 (${store.myMaterialStatusCounts.pending_review})`" />
          <t-tab-panel value="published" :label="`已通过 (${store.myMaterialStatusCounts.published})`" />
          <t-tab-panel value="rejected" :label="`已驳回 (${store.myMaterialStatusCounts.rejected})`" />
        </t-tabs>
      </div>

      <t-loading :loading="store.myMaterialLoading" size="small">
        <div v-if="store.myMaterialSubmissions.length === 0" class="my-approval__empty">
          <t-icon name="check-circle" size="48px" color="var(--td-success-color)" />
          <p>暂无原料审批记录</p>
          <span>创建原料后，可在此提交审批</span>
        </div>

        <div v-if="store.myMaterialSubmissions.length > 5" class="my-approval__sort-header">
          <span
            class="my-approval__sort-col my-approval__sort-col--name"
            :class="{ active: store.myListSortBy === 'formulaName' }"
            @click="toggleSort('formulaName')"
          >
            名称
            <span v-if="store.myListSortBy === 'formulaName'" class="my-approval__sort-arrow">
              {{ store.myListSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="my-approval__sort-col my-approval__sort-col--status"
            :class="{ active: store.myListSortBy === 'status' }"
            @click="toggleSort('status')"
          >
            状态
            <span v-if="store.myListSortBy === 'status'" class="my-approval__sort-arrow">
              {{ store.myListSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
          <span
            class="my-approval__sort-col my-approval__sort-col--time"
            :class="{ active: store.myListSortBy === 'createdAt' }"
            @click="toggleSort('createdAt')"
          >
            时间
            <span v-if="store.myListSortBy === 'createdAt'" class="my-approval__sort-arrow">
              {{ store.myListSortOrder === 'asc' ? '\u2191' : '\u2193' }}
            </span>
          </span>
        </div>

        <div v-else class="my-approval__list">
          <div v-for="item in store.myMaterialSubmissions" :key="item.id" class="my-approval__item">
            <div class="my-approval__item-header">
              <div class="my-approval__item-info">
                <a class="my-approval__item-name" @click="goMaterial(item.id)">
                  {{ item.name }}
                </a>
                <span class="my-approval__item-meta">
                  {{ item.code }} · {{ getMaterialTypeLabel(item.materialType) }}
                </span>
              </div>
              <div class="my-approval__item-right">
                <t-tag :theme="materialStatusTheme(item.status, item)" variant="light" size="small">
                  {{ materialStatusLabel(item.status, item) }}
                </t-tag>
                <span class="my-approval__item-time">{{
                  formatTimestamp(item.updatedAt)
                }}</span>
              </div>
            </div>

            <div class="my-approval__progress">
              <div class="my-approval__progress-step" :class="{ active: true }">
                <span class="my-approval__progress-dot"></span>
                <span class="my-approval__progress-label">草稿</span>
              </div>
              <div class="my-approval__progress-line" :class="{ active: progressStep(item.status) >= 1 }"></div>
              <div class="my-approval__progress-step" :class="{ active: progressStep(item.status) >= 1 }">
                <span class="my-approval__progress-dot"></span>
                <span class="my-approval__progress-label">审核中</span>
              </div>
              <div class="my-approval__progress-line" :class="{ active: progressStep(item.status) >= 2 }"></div>
              <div class="my-approval__progress-step" :class="{
                active: progressStep(item.status) >= 2,
                rejected: item.latestReview?.action === 'reject',
              }">
                <span class="my-approval__progress-dot"></span>
                <span class="my-approval__progress-label">
                  {{ item.latestReview?.action === "reject" ? "已驳回" : "已发布" }}
                </span>
              </div>
            </div>

            <div v-if="item.status === 'draft'" class="my-approval__submit-row">
              <t-button size="small" theme="primary" variant="outline" @click="goMaterial(item.id)">
                {{ item.latestReview?.action === 'reject' ? '重新提交' : '提交审批' }}
              </t-button>
            </div>

            <div v-if="item.latestReview?.action === 'reject'" class="my-approval__reject-reason">
              <div class="my-approval__reject-toggle" @click="toggleMaterialExpand(item.id)">
                <t-icon :name="materialExpandedItems.has(item.id)
                  ? 'chevron-up'
                  : 'chevron-down'
                  " />
                <span>驳回意见</span>
              </div>
              <div v-if="materialExpandedItems.has(item.id)" class="my-approval__reject-content">
                <p class="my-approval__reject-comment">
                  {{ item.latestReview.comment || "未提供具体原因" }}
                </p>
                <p class="my-approval__reject-meta">
                  驳回人: {{ item.latestReview.reviewerName }}
                  · {{ formatTimestamp(item.latestReview.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div v-if="materialTotalPages > 1" class="my-approval__pagination">
          <button class="pagination-btn" :class="{ 'pagination-btn--disabled': store.myMaterialPage === 1 }"
            :disabled="store.myMaterialPage === 1"
            @click="store.fetchMyMaterialSubmissions({ page: store.myMaterialPage - 1 })">上一页</button>
          <span class="pagination-page">{{ store.myMaterialPage }} / {{ materialTotalPages }}</span>
          <button class="pagination-btn"
            :class="{ 'pagination-btn--disabled': store.myMaterialPage === materialTotalPages }"
            :disabled="store.myMaterialPage === materialTotalPages"
            @click="store.fetchMyMaterialSubmissions({ page: store.myMaterialPage + 1 })">下一页</button>
        </div>
      </t-loading>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.my-approval {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  &__module-tabs {
    margin-bottom: 4px;
    --td-brand-color: var(--color-primary);
  }

  &__search {
    margin-top: 8px;
    margin-bottom: 4px;
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
    padding: 6px 12px;
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
    &--status { width: 70px; text-align: center; }
    &--time { width: 90px; text-align: right; }
  }

  &__sort-arrow {
    font-size: 10px;
  }

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
    gap: 12px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__item {
    border: 1px solid var(--td-component-border);
    border-radius: var(--td-radius-medium);
    padding: 12px 16px;
    background: var(--td-bg-color-secondarycontainer);
    transition: border-color 0.2s;

    &:hover {
      border-color: var(--color-primary);
    }

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
    }

    &-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    &-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-primary);
      text-decoration: none;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    &-meta {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
    }

    &-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    &-time {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
    }
  }

  &__submit-row {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--td-component-border);
    display: flex;
    justify-content: flex-end;
  }

  &__progress {
    display: flex;
    align-items: center;
    gap: 0;
    padding: 0 4px;

    &-step {
      display: flex;
      align-items: center;
      gap: 6px;
      opacity: 0.4;

      &.active {
        opacity: 1;
      }

      &.rejected {
        color: var(--td-error-color);
      }
    }

    &-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--td-text-color-placeholder);
      flex-shrink: 0;

      .active & {
        background: var(--color-primary);
      }

      .rejected & {
        background: var(--td-error-color);
      }
    }

    &-label {
      font-size: 12px;
      white-space: nowrap;
      color: var(--td-text-color-secondary);

      .active & {
        color: var(--td-text-color-primary);
      }
    }

    &-line {
      flex: 1;
      min-width: 24px;
      height: 2px;
      background: var(--td-component-border);
      margin: 0 4px;

      &.active {
        background: var(--color-primary);
      }
    }
  }

  &__reject-reason {
    margin-top: 10px;
    border-top: 1px dashed var(--td-component-border);
    padding-top: 8px;
  }

  &__reject-toggle {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 12px;
    color: var(--td-error-color);
    user-select: none;
  }

  &__reject-content {
    margin-top: 8px;
  }

  &__reject-comment {
    font-size: 13px;
    color: var(--td-error-color);
    background: var(--td-error-color-1);
    padding: 8px 12px;
    border-radius: var(--td-radius-medium);
    margin: 0 0 4px;
  }

  &__reject-meta {
    font-size: 11px;
    color: var(--td-text-color-placeholder);
    margin: 0;
  }

  &__pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-top: 12px;
    padding-top: 8px;
    flex-shrink: 0;

    .pagination-page {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
      min-width: 36px;
      text-align: center;
      user-select: none;
    }

    .pagination-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 14px;
      border: 1px solid var(--td-component-border);
      border-radius: 6px;
      background-color: transparent;
      color: var(--td-text-color-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      user-select: none;

      &:hover:not(.pagination-btn--disabled) {
        background-color: var(--td-brand-color-light);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      &.pagination-btn--disabled {
        opacity: 0.4;
        cursor: not-allowed;
        color: var(--td-text-color-placeholder);
        pointer-events: none;
      }
    }
  }
}
</style>
