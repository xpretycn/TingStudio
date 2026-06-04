<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRouter } from "vue-router";
import { useApprovalStore, type MyMaterialItem } from "@/stores/approval";
import { formatTimestamp } from "@/utils/timeFormat";
import type { ApprovalItem } from "@/api/approval";

const router = useRouter();
const store = useApprovalStore();
const activeTab = ref("all");
const moduleTab = ref("formula");
const searchKeyword = ref("");
const searchTimer = ref<ReturnType<typeof setTimeout> | null>(null);

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
    store.fetchMySubmissions({ keyword, status, page: 1 });
  } else {
    store.fetchMyMaterialSubmissions({ keyword, status, page: 1 });
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

const materialPageNumbers = computed<(number | string)[]>(() => {
  const total = materialTotalPages.value;
  const current = store.myMaterialPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "...", total];
  if (current >= total - 2) return [1, "...", total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
});

onMounted(() => {
  store.fetchMySubmissions({ page: 1 });
  store.fetchMyMaterialSubmissions({ page: 1 });
  store.fetchMyStatusCounts();
  store.fetchMyMaterialStatusCounts();
});

watch(moduleTab, () => {
  activeTab.value = "all";
  searchKeyword.value = "";
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
          <div class="pagination-info">
            显示第 {{ (store.myMaterialPage - 1) * store.myMaterialPageSize + 1 }}-{{ Math.min(store.myMaterialPage *
              store.myMaterialPageSize, store.myMaterialTotal) }} 条，共 {{ store.myMaterialTotal }} 条数据
          </div>
          <div class="pagination-controls">
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': store.myMaterialPage === 1 }"
              :disabled="store.myMaterialPage === 1"
              @click="store.fetchMyMaterialSubmissions({ page: store.myMaterialPage - 1 })">上一页</button>
            <template v-for="page in materialPageNumbers" :key="page">
              <button v-if="page !== '...'" class="pagination-btn"
                :class="{ 'pagination-btn--active': page === store.myMaterialPage }"
                @click="typeof page === 'number' && store.fetchMyMaterialSubmissions({ page })">{{ page }}</button>
              <span v-else class="pagination-ellipsis">...</span>
            </template>
            <button class="pagination-btn"
              :class="{ 'pagination-btn--disabled': store.myMaterialPage === materialTotalPages }"
              :disabled="store.myMaterialPage === materialTotalPages"
              @click="store.fetchMyMaterialSubmissions({ page: store.myMaterialPage + 1 })">下一页</button>
          </div>
        </div>
      </t-loading>
    </template>
  </div>
</template>

<style lang="scss" scoped>
.my-approval {
  &__module-tabs {
    margin-bottom: 4px;
    --td-brand-color: var(--color-primary);
  }

  &__search {
    margin-top: 8px;
    margin-bottom: 4px;
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
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    padding-top: 8px;

    .pagination-info {
      font-size: 12px;
      color: var(--td-text-color-placeholder);
      white-space: nowrap;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .pagination-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      border: 1px solid var(--td-component-border);
      border-radius: 6px;
      background-color: transparent;
      color: var(--td-text-color-secondary);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      user-select: none;

      &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
        background-color: var(--td-brand-color-light);
        border-color: var(--color-primary);
        color: var(--color-primary);
      }

      &.pagination-btn--disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
        color: var(--td-text-color-placeholder);
        background-color: transparent;
        border-color: var(--td-component-border);
        pointer-events: none;
      }

      &.pagination-btn--active {
        background-color: var(--color-primary);
        color: #fff;
        border-color: var(--color-primary);
        font-weight: 600;
        pointer-events: none;
      }
    }

    .pagination-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 26px;
      color: var(--td-text-color-placeholder);
      font-size: 12px;
      user-select: none;
    }
  }
}
</style>
