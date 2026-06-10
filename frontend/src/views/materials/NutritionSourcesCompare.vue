<template>
  <div class="nutrition-sources-compare" :aria-busy="store.loading">
    <PageSkeleton v-if="store.loading && !store.comparison" type="detail" />
    <template v-else>
      <header class="detail-header">
        <div class="header-left">
          <button class="header-back-btn" @click="handleBack" title="返回原料详情">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">原料管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <a class="breadcrumb-link" @click="handleBack">{{ materialName }}</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">营养数据来源对比</span>
            </nav>
            <h2 class="material-title">
              {{ materialName }}
              <span class="title-version-tag">{{ store.activeSources.length }} 来源</span>
              <span v-if="store.summary" class="title-status-tag title-status-tag--published">
                平均偏差 {{ store.summary.avgDiffPercent }}%
              </span>
            </h2>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-action-btn header-action-btn--ghost" @click="showSnapshotDialog = true">
            <t-icon name="history" class="btn-icon" />
            变更历史
          </button>
          <t-dropdown trigger="click" :popup-props="{ appendToBody: true }">
            <button class="header-action-btn">
              <t-icon name="send" class="btn-icon" />
              导出报告
            </button>
            <template #dropdown>
              <t-dropdown-menu>
                <t-dropdown-item @click="handleExport('excel')">
                  <t-icon name="file-excel" /> Excel 格式
                </t-dropdown-item>
                <t-dropdown-item @click="handleExport('pdf')">
                  <t-icon name="file-pdf" /> PDF 格式
                </t-dropdown-item>
              </t-dropdown-menu>
            </template>
          </t-dropdown>
        </div>
      </header>

      <div class="page-content">
        <div class="content-left">
          <SourceListPanel :sources="store.scoredSources" :active-id="activeSourceId"
            :selected-ids="store.selectedSourceIds" :authoritative-source-id="store.currentAuthoritativeSourceId"
            @select="handleSourceSelect" @toggle-select="handleToggleSelect" @clear-selection="store.clearSelection()"
            @filter-type-change="handleTypeFilterChange" />
        </div>

        <div class="content-right">
          <div v-if="radarSeries.length > 1" class="radar-section">
            <SourceRadarCard :series="radarSeries" :indicators="radarIndicators" :units="radarUnits" :height="320" />
          </div>
          <div class="view-tabs">
            <t-tabs :value="store.activeView" @change="handleViewChange">
              <t-tab-panel value="overview" label="概览">
                <template #label>
                  <span class="tab-label">
                    <t-icon name="view-module" /> 概览 <kbd class="tab-kbd">1</kbd>
                  </span>
                </template>
              </t-tab-panel>
              <t-tab-panel value="value" label="数值对比">
                <template #label>
                  <span class="tab-label">
                    <t-icon name="table" /> 数值对比 <kbd class="tab-kbd">2</kbd>
                  </span>
                </template>
              </t-tab-panel>
              <t-tab-panel value="deviation" label="偏差分析">
                <template #label>
                  <span class="tab-label">
                    <t-icon name="chart" /> 偏差分析 <kbd class="tab-kbd">3</kbd>
                  </span>
                </template>
              </t-tab-panel>
              <t-tab-panel value="history" label="历史">
                <template #label>
                  <span class="tab-label">
                    <t-icon name="time" /> 历史 <kbd class="tab-kbd">4</kbd>
                  </span>
                </template>
              </t-tab-panel>
            </t-tabs>
          </div>

          <div class="view-content">
            <Transition name="fade" mode="out-in">
              <div v-if="store.activeView === 'overview'" key="overview">
                <SourceOverview :nutrients="store.comparison?.nutrients ?? null"
                  :recommend-candidates="store.recommendCandidates"
                  :sources="store.sources"
                  :active-authoritative-source-id="store.currentAuthoritativeSourceId"
                  :summary="store.summary"
                  :can-apply="canEdit" :applying="applying" @drill-down="handleDrillDown"
                  @apply="handleApplyRecommendation" />
              </div>
              <div v-else-if="store.activeView === 'value'" key="value">
                <SourceValueTable :nutrients="store.comparison?.nutrients ?? null" :sources="store.activeSources" />
              </div>
              <div v-else-if="store.activeView === 'deviation'" key="deviation">
                <SourceDeviationChart :nutrients="store.comparison?.nutrients ?? null" :sources="store.activeSources" />
              </div>
              <div v-else-if="store.activeView === 'history'" key="history">
                <SourceHistoryTimeline :sources="store.activeSources" />
              </div>
            </Transition>
          </div>
        </div>
      </div>

      <SourceBatchActionBar :selected-count="store.selectedSourceIds.length" :can-archive="canArchive"
        :authoritative-loading="applying" :archive-loading="archiving"
        @set-authoritative="showSetAuthoritativeDialog = true" @archive="handleBatchArchive"
        @clear="store.clearSelection()" />

      <SourceSetAuthoritativeDialog v-model:visible="showSetAuthoritativeDialog"
        :selected-source-ids="store.selectedSourceIds" :selected-sources="selectedScoredSources" :loading="applying"
        @confirm="handleBatchSetAuthoritative" />

      <SourceSnapshotDialog v-model:visible="showSnapshotDialog" :material-id="materialId" />

      <Transition name="hint-fade">
        <div v-if="showShortcutHint" class="shortcut-hint">
          <span v-for="h in shortcutHints" :key="h.key">
            <kbd>{{ h.key }}</kbd> {{ h.label }}
          </span>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useNutritionSourceCompareStore } from '@/stores/nutritionSourceCompare';
import { useAuthStore } from '@/stores/auth';
import { useMaterialStore } from '@/stores/material';
import { MessagePlugin } from 'tdesign-vue-next';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import SourceListPanel from '@/components/nutrition-sources/SourceListPanel.vue';
import SourceOverview from '@/components/nutrition-sources/SourceOverview.vue';
import SourceValueTable from '@/components/nutrition-sources/SourceValueTable.vue';
import SourceDeviationChart from '@/components/nutrition-sources/SourceDeviationChart.vue';
import SourceHistoryTimeline from '@/components/nutrition-sources/SourceHistoryTimeline.vue';
import SourceBatchActionBar from '@/components/nutrition-sources/SourceBatchActionBar.vue';
import SourceSetAuthoritativeDialog from '@/components/nutrition-sources/SourceSetAuthoritativeDialog.vue';
import SourceRadarCard from '@/components/nutrition-sources/SourceRadarCard.vue';
import SourceSnapshotDialog from '@/components/nutrition-sources/SourceSnapshotDialog.vue';
import { useViewShortcuts } from '@/composables/useViewShortcuts';
import type { ScoredSource } from '@/api/nutritionSourceBatch';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const materialStore = useMaterialStore();
const store = useNutritionSourceCompareStore();

const materialId = computed(() => String(route.params.id));
const materialName = ref('原料');
const activeSourceId = ref<string | null>(null);
const applying = ref(false);
const archiving = ref(false);
const showSetAuthoritativeDialog = ref(false);
const showSnapshotDialog = ref(false);
const showShortcutHint = ref(true);

const RADAR_FIELDS = [
  { field: 'energy', label: '能量', unit: 'kJ' },
  { field: 'protein', label: '蛋白质', unit: 'g' },
  { field: 'fat', label: '脂肪', unit: 'g' },
  { field: 'carbohydrate', label: '碳水', unit: 'g' },
  { field: 'sodium', label: '钠', unit: 'mg' },
  { field: 'fiber', label: '纤维', unit: 'g' },
];

const radarIndicators = computed(() => RADAR_FIELDS.map((f) => f.label));
const radarUnits = computed(() => RADAR_FIELDS.map((f) => f.unit));

const SOURCE_TYPE_NAME_MAP: Record<string, string> = {
  manual: '手工录入',
  tianapi: '天行API',
  seed: '种子库',
  ai: 'AI估算',
  excel_import: 'Excel导入',
  other: '其他',
};

const radarSeries = computed(() => {
  const sources = store.activeSources;
  if (sources.length === 0) return [];

  const nutrientNutrients = store.comparison?.nutrients ?? [];

  return sources.slice(0, 6).map((src, idx) => {
    const values: number[] = [];
    for (const fieldDef of RADAR_FIELDS) {
      const n = nutrientNutrients.find((nn) => nn.field === fieldDef.field);
      const v = n?.sources.find((s) => s.sourceId === src.sourceId)?.value ?? 0;
      values.push(v);
    }
    const typeName = SOURCE_TYPE_NAME_MAP[src.sourceType] ?? src.sourceType;
    return {
      name: `${typeName} #${idx + 1}`,
      values,
    };
  });
});

const shortcutHints = [
  { key: '1', label: '概览' },
  { key: '2', label: '数值' },
  { key: '3', label: '偏差' },
  { key: '4', label: '历史' },
];

useViewShortcuts({
  '1': () => store.setView('overview'),
  '2': () => store.setView('value'),
  '3': () => store.setView('deviation'),
  '4': () => store.setView('history'),
  '?': () => {
    showShortcutHint.value = !showShortcutHint.value;
  },
  'Escape': () => {
    if (showSetAuthoritativeDialog.value) {
      showSetAuthoritativeDialog.value = false;
    } else if (showSnapshotDialog.value) {
      showSnapshotDialog.value = false;
    } else {
      store.clearSelection();
    }
  },
});

const shortcutHintTimer = setTimeout(() => {
  showShortcutHint.value = false;
}, 4000);

const canEdit = computed(() => authStore.user?.role === 'admin');

const canArchive = computed(() => {
  return authStore.user?.role === 'admin' || authStore.user?.role === 'formulist';
});

const selectedScoredSources = computed(() => {
  const set = new Set(store.selectedSourceIds);
  return store.scoredSources.filter((s) => set.has(s.sourceId));
});

async function loadData() {
  store.resetForNewMaterial(materialId.value);
  await store.fetchAll(materialId.value);
  try {
    const material = await materialStore.getMaterial(materialId.value);
    materialName.value = material?.name ?? '原料';
  } catch {
    materialName.value = '原料';
  }
}

function handleBack() {
  router.push(`/materials/${materialId.value}`);
}

function handleSourceSelect(id: string) {
  activeSourceId.value = activeSourceId.value === id ? null : id;
}

function handleToggleSelect(id: string) {
  store.toggleSourceSelection(id);
}

function handleTypeFilterChange(types: string[]) {
  store.setFilters({ sourceTypes: types });
}

function handleViewChange(val: string | number) {
  store.setView(val as 'overview' | 'value' | 'deviation' | 'history');
}

function handleDrillDown(field: string) {
  store.setSelectedNutrient(field);
  store.setView('value');
}

function handleExport(format: 'excel' | 'pdf') {
  store.exportAs(format);
}

async function handleApplyRecommendation(sourceId: string) {
  if (!canEdit.value) {
    MessagePlugin.warning('当前账号无权限切换主用源');
    return;
  }
  applying.value = true;
  try {
    const result = await store.batchSetAuthoritative({
      strategy: 'best-deviation',
      sourceIds: [sourceId],
    });
    if (result.success) {
      MessagePlugin.success('已应用推荐为主用值');
    }
  } finally {
    applying.value = false;
  }
}

async function handleBatchSetAuthoritative(payload: {
  strategy: 'best-deviation' | 'manual' | 'highest-confidence' | 'newest';
  sourceIds?: string[];
  fieldSelections?: Record<string, string>;
}) {
  applying.value = true;
  try {
    const result = await store.batchSetAuthoritative(payload);
    if (result.success) {
      showSetAuthoritativeDialog.value = false;
      store.clearSelection();
    }
  } finally {
    applying.value = false;
  }
}

async function handleBatchArchive() {
  if (store.selectedSourceIds.length === 0) return;
  archiving.value = true;
  try {
    await store.batchArchive(store.selectedSourceIds);
  } finally {
    archiving.value = false;
  }
}

watch(
  () => route.params.id,
  (id) => {
    if (id) loadData();
  },
);

onMounted(() => {
  loadData();
});

onUnmounted(() => {
  clearTimeout(shortcutHintTimer);
});
</script>

<style lang="scss" scoped>
.nutrition-sources-compare {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - #{$header-height});
  background: var(--color-bg-page);
}

.detail-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: -32px;
  margin-right: -32px;
  padding: 8px 32px;
  background-color: color-mix(in srgb, var(--color-bg-container) 80%, transparent);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-3;
  flex: 1;
  min-width: 0;
}

.header-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all $transition-fast;
  font-size: 20px;

  &:hover {
    color: var(--color-primary);
    background: var(--color-primary-bg);
  }
}

.header-title-group {
  min-width: 0;
  flex: 1;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $font-size-caption;
  color: var(--color-text-tertiary);
  margin-bottom: 2px;
}

.breadcrumb-link {
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: var(--color-primary);
  }
}

.breadcrumb-sep {
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.breadcrumb-current {
  color: var(--color-text-secondary);
  font-weight: $font-weight-medium;
}

.material-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: 0;
  font-size: $font-size-h2;
  font-weight: $font-weight-bold;
  color: var(--color-text-primary);
}

.title-version-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  background: var(--color-bg-cool-gray);
  color: var(--color-text-secondary);
  border-radius: $radius-xs;
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  font-variant-numeric: tabular-nums;
}

.title-status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: $radius-xs;
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;

  &--draft {
    background: var(--color-warning-bg);
    color: $color-warning;
  }

  &--pending {
    background: var(--color-warning-bg);
    color: $color-warning;
  }

  &--published {
    background: $color-success-light;
    color: $color-success;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: 8px 16px;
  background-color: var(--color-primary);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: 12px;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-bold;
  box-shadow: var(--shadow-brand-sm);
  cursor: pointer;
  transition: all $transition-fast;

  .btn-icon {
    font-size: 16px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-brand-md);
  }

  &--ghost {
    background-color: var(--color-bg-container);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
    box-shadow: none;

    &:hover {
      background-color: var(--color-bg-container-alt);
      box-shadow: none;
      transform: none;
    }
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-content {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  // 左右栏间距调整为 18px（$space-4-5）
  gap: $space-4-5;
  padding: $space-4 4px;
  min-height: 0;
  overflow: hidden;
}

.content-left {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.content-right {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: var(--color-bg-container);
  border-radius: $radius-xl;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.view-tabs {
  padding: 0 $space-4;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.tab-label {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  font-size: $font-size-body;
}

.tab-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  margin-left: $space-1;
  background: var(--color-bg-cool-gray);
  color: var(--color-text-tertiary);
  border-radius: $radius-xs;
  font-family: $font-family-mono;
  font-size: 10px;
  font-weight: $font-weight-semibold;
  line-height: 1;
}

.radar-section {
  padding: $space-3 $space-4 0 $space-4;
  flex-shrink: 0;
}

.shortcut-hint {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: $space-4;
  padding: $space-2 $space-4;
  background: color-mix(in srgb, var(--color-text-primary) 85%, transparent);
  color: var(--color-text-on-primary);
  border-radius: $radius-pill;
  font-size: $font-size-caption;
  box-shadow: $shadow-float;

  span {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: color-mix(in srgb, currentColor 18%, transparent);
    border: 1px solid color-mix(in srgb, currentColor 25%, transparent);
    border-radius: $radius-xs;
    font-family: $font-family-mono;
    font-size: 11px;
    font-weight: $font-weight-semibold;
  }
}

.hint-fade-enter-active,
.hint-fade-leave-active {
  transition: all $transition-normal;
}

.hint-fade-enter-from,
.hint-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

.view-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity $transition-normal;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1199px) {
  .page-content {
    grid-template-columns: 280px 1fr;
    padding: $space-3 $space-4;
  }

  .detail-header {
    padding: 8px 16px;
  }
}

@media (max-width: 768px) {
  .page-content {
    grid-template-columns: 1fr;
    padding: $space-3;
  }

  .content-left {
    max-height: 240px;
  }

  .detail-header {
    padding: 8px 12px;
    flex-wrap: wrap;
    gap: $space-2;
  }

  .material-title {
    font-size: $font-size-h3;
  }

  .header-actions {
    flex-direction: column;
    align-items: flex-end;
    gap: $space-1;
  }

  .header-action-btn {
    padding: 6px 10px;
    font-size: $font-size-caption;
  }
}
</style>
