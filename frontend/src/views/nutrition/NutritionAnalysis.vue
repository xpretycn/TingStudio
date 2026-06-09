<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { formulaApi } from '@/api/formula';
import type { Formula, FormulaVersion } from '@/api/formula';
import { useNutritionStore } from '@/stores/nutrition';
import { useAuthStore } from '@/stores/auth';
import NutritionLabelTable from '@/components/nutrition/NutritionLabelTable.vue';
import MaterialContribution from '@/components/nutrition/MaterialContribution.vue';
import DataCoverageCard from '@/components/nutrition/DataCoverageCard.vue';
import NutritionClaimsCard from '@/components/nutrition/NutritionClaimsCard.vue';
import FortificationCheckCard from '@/components/nutrition/FortificationCheckCard.vue';
import AnalysisSummaryCard from '@/components/nutrition/AnalysisSummaryCard.vue';
import type { ClaimResult } from '@/api/nutrition';

const nutritionStore = useNutritionStore();
const authStore = useAuthStore();

interface SelectedRef {
  formulaId: string;
  versionId?: string;
  versionNumber?: string;
  versionStatus?: string;
  formulaName: string;
  isLatestPublished: boolean;
}

const selectedRef = ref<SelectedRef | null>(null);
const analyzing = ref(false);
const allFormulas = ref<Formula[]>([]);
let disposed = false;

const availableFormulas = computed(() => {
  const user = authStore.user;
  if (!user || user.role === 'admin') return allFormulas.value;
  return allFormulas.value.filter(f => f.createdBy === user.id);
});

const versionStatusMap: Record<string, { label: string; theme: "primary" | "warning" | "success" | "default" }> = {
  published: { label: '已发布', theme: 'success' },
  draft: { label: '草稿', theme: 'default' },
  pending_review: { label: '待审批', theme: 'warning' },
  archived: { label: '已归档', theme: 'default' },
};

function getStatusInfo(status: string) {
  return versionStatusMap[status] ?? { label: status, theme: 'default' as const };
}

const groupedFormulas = computed(() => {
  return availableFormulas.value.map((f) => {
    const versions = (f.versions ?? []).slice().sort((a, b) => {
      return a.versionNumber.localeCompare(b.versionNumber, undefined, { numeric: true });
    });
    return { formula: f, versions };
  });
});

const latestPublishedVersionId = (versions: FormulaVersion[]): string | undefined => {
  const published = versions.filter(v => v.status === 'published');
  if (published.length === 0) return undefined;
  return published[published.length - 1]?.versionId;
};

const isLatestPublishedVersion = (formula: Formula, versionId: string): boolean => {
  const versions = formula.versions ?? [];
  return latestPublishedVersionId(versions) === versionId;
};

const latestVersionHintText = computed(() => {
  if (!selectedRef.value) return '';
  const formula = allFormulas.value.find(f => f.id === selectedRef.value!.formulaId);
  if (!formula) return '';
  const latestId = latestPublishedVersionId(formula.versions ?? []);
  if (!latestId) return '（当前配方无已发布版本）';
  const latest = formula.versions?.find(v => v.versionId === latestId);
  return `（最新为 ${latest?.versionNumber ?? ''}）`;
});

const claimsSummary = computed(() => {
  const claims: ClaimResult[] = nutritionStore.analysisResult?.claims ?? [];
  const satisfied = claims.filter(c => c.satisfied).length;
  const unsatisfied = claims.length - satisfied;
  const total = claims.length;
  const ratio = total > 0 ? Math.round((satisfied / total) * 100) : 0;
  return { total, satisfied, unsatisfied, ratio };
});

const hasFortification = computed(() =>
  (nutritionStore.analysisResult?.fortificationChecks?.length ?? 0) > 0
);

// versionId → formulaId 映射（versionId 全局唯一，可直接作为 select value）
const versionToFormulaMap = computed(() => {
  const map = new Map<string, Formula>();
  for (const f of availableFormulas.value) {
    for (const v of f.versions ?? []) {
      map.set(v.versionId, f);
    }
  }
  return map;
});

function handleSelectChange(value: unknown) {
  if (!value || typeof value !== 'string') {
    selectedRef.value = null;
    return;
  }
  const formula = versionToFormulaMap.value.get(value);
  if (!formula) return;
  const version = formula.versions?.find(v => v.versionId === value);
  selectedRef.value = {
    formulaId: formula.id,
    versionId: value,
    versionNumber: version?.versionNumber,
    versionStatus: version?.status,
    formulaName: formula.name,
    isLatestPublished: isLatestPublishedVersion(formula, value),
  };
}

async function handleAnalyze() {
  if (!selectedRef.value) {
    MessagePlugin.warning('请先选择配方');
    return;
  }
  analyzing.value = true;
  try {
    const result = await nutritionStore.analyzeFormula(selectedRef.value.formulaId);
    if (!result.success) {
      MessagePlugin.error(result.message || '分析失败');
    }
  } finally {
    analyzing.value = false;
  }
}

function autoSelectDefault() {
  for (const { formula, versions } of groupedFormulas.value) {
    const latestId = latestPublishedVersionId(versions);
    if (latestId) {
      handleSelectChange(latestId);
      return;
    }
  }
  if (availableFormulas.value.length > 0) {
    const first = availableFormulas.value[0];
    const firstVersion = first.versions?.[0]?.versionId;
    if (firstVersion) handleSelectChange(firstVersion);
  }
}

onMounted(async () => {
  try {
    const res = await formulaApi.getList({ page: 1, pageSize: 999 });
    if (!disposed) {
      allFormulas.value = res.list;
      autoSelectDefault();
    }
  } catch {
    if (!disposed) {
      MessagePlugin.error('获取配方列表失败');
    }
  }
});

onBeforeUnmount(() => {
  disposed = true;
});
</script>

<template>
  <div class="nutrition-analysis-page">
    <div class="header-card">
      <div class="header-left">
        <h2 class="page-title">配方营养分析</h2>
        <p class="page-subtitle">基于 GB 28050 / GB 14880 国标，计算营养成分并判定含量声称与强化剂合规性</p>
      </div>
      <div class="header-right">
        <t-select
          :model-value="selectedRef?.versionId ?? ''"
          placeholder="选择配方（默认最新已发布版本）"
          filterable
          clearable
          class="formula-select"
          :popup-props="{ appendToBody: true }"
          @change="handleSelectChange"
        >
          <t-option-group
            v-for="group in groupedFormulas"
            :key="group.formula.id"
            :label="`${group.formula.name} (${group.formula.salesmanName})`"
            :divider="true"
          >
            <t-option
              v-for="v in group.versions"
              :key="v.versionId"
              :value="v.versionId"
              :label="`${group.formula.name} ${v.versionNumber}`"
            >
              <div class="version-option">
                <span class="version-num">{{ v.versionNumber }}</span>
                <t-tag
                  size="small"
                  variant="light"
                  :theme="getStatusInfo(v.status).theme"
                  class="version-status-tag"
                >
                  {{ getStatusInfo(v.status).label }}
                </t-tag>
                <t-tag
                  v-if="v.versionId === latestPublishedVersionId(group.versions)"
                  size="small"
                  variant="light"
                  theme="primary"
                  class="version-latest-tag"
                >
                  最新
                </t-tag>
              </div>
            </t-option>
          </t-option-group>
        </t-select>
        <div v-if="selectedRef" class="version-hint">
          <t-icon v-if="!selectedRef.isLatestPublished" name="info-circle-filled" class="hint-icon" />
          <span v-if="selectedRef.isLatestPublished" class="hint-text">
            已选：{{ selectedRef.versionNumber }} · {{ versionStatusMap[selectedRef.versionStatus ?? '']?.label || selectedRef.versionStatus }}
          </span>
          <span v-else class="hint-text">
            已选：{{ selectedRef.versionNumber }} · 非最新已发布版本{{ latestVersionHintText }}
          </span>
        </div>
        <t-button theme="primary" :loading="analyzing" :disabled="!selectedRef" @click="handleAnalyze">
          {{ analyzing ? '分析中...' : '开始分析' }}
        </t-button>
      </div>
    </div>

    <div v-if="nutritionStore.analysisResult" class="nutrition-content-card">
      <div class="analysis-grid">
        <!-- 第一行：摘要 + 覆盖度 -->
        <div class="grid-cell grid-cell--half">
          <AnalysisSummaryCard :summary="nutritionStore.analysisResult.summary" />
        </div>
        <div class="grid-cell grid-cell--half">
          <DataCoverageCard :coverage="nutritionStore.analysisResult.coverage" />
        </div>

        <!-- 第二行：左列（成分表+声称统计竖排） | 右列（原料贡献） -->
        <div class="grid-cell grid-cell--left-stack">
          <div class="left-stack-inner">
            <t-card class="section-card" :bordered="true">
              <template #title>
                <div class="card-title">
                  <t-icon name="view-list" class="card-title-icon" />
                  <span>营养成分表</span>
                </div>
              </template>
              <template #subtitle>
                <span>每100g · GB 28050 格式</span>
              </template>
              <div class="section-body nutrition-table-body">
                <NutritionLabelTable :label="nutritionStore.analysisResult?.nutritionLabel" />
              </div>
            </t-card>
            <t-card class="section-card claims-stat-card" :bordered="true">
              <template #title>
                <div class="card-title">
                  <t-icon name="check-circle" class="card-title-icon card-title-icon--success" />
                  <span>声称判定概览</span>
                </div>
              </template>
              <template #subtitle>
                <span>GB 28050 附录 C.1</span>
              </template>
              <div class="section-body claims-stat-body">
                <div class="claims-stat-ring">
                  <svg viewBox="0 0 80 80" class="ring-svg">
                    <circle cx="40" cy="40" r="34" class="ring-track" />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      class="ring-progress"
                      :stroke-dasharray="213.6"
                      :stroke-dashoffset="213.6 - (213.6 * claimsSummary.ratio / 100)"
                    />
                  </svg>
                  <div class="ring-value">
                    <span class="ring-num">{{ claimsSummary.ratio }}</span>
                    <span class="ring-unit">%</span>
                  </div>
                </div>
                <div class="claims-stat-info">
                  <div class="stat-line">
                    <span class="stat-dot stat-dot--success" />
                    <span class="stat-label">已满足</span>
                    <span class="stat-value stat-value--success">{{ claimsSummary.satisfied }}</span>
                  </div>
                  <div class="stat-line">
                    <span class="stat-dot stat-dot--default" />
                    <span class="stat-label">未满足</span>
                    <span class="stat-value">{{ claimsSummary.unsatisfied }}</span>
                  </div>
                  <div class="stat-line stat-line--total">
                    <span class="stat-label">合计</span>
                    <span class="stat-value">{{ claimsSummary.total }} 项</span>
                  </div>
                </div>
              </div>
            </t-card>
          </div>
        </div>
        <div class="grid-cell grid-cell--right-main">
          <t-card class="section-card" :bordered="true">
            <template #title>
              <div class="card-title">
                <t-icon name="chart-analytics" class="card-title-icon" />
                <span>原料贡献分析</span>
              </div>
            </template>
            <template #subtitle>
              <span>各原料营养素贡献占比</span>
            </template>
            <div class="section-body">
              <MaterialContribution :materials="nutritionStore.analysisResult.materialContributions" />
            </div>
          </t-card>
        </div>

        <!-- 强化剂独立行（仅当有数据时显示） -->
        <div v-if="hasFortification" class="grid-cell grid-cell--full">
          <t-card class="section-card" :bordered="true">
            <template #title>
              <div class="card-title">
                <t-icon name="filter" class="card-title-icon" />
                <span>强化剂合规</span>
              </div>
            </template>
            <template #subtitle>
              <span>GB 14880 标准</span>
            </template>
            <div class="section-body">
              <FortificationCheckCard :checks="nutritionStore.analysisResult.fortificationChecks" />
            </div>
          </t-card>
        </div>

        <!-- 第三行：声称清单（紧凑展示） -->
        <div class="grid-cell grid-cell--full">
          <NutritionClaimsCard :claims="nutritionStore.analysisResult.claims" />
        </div>
      </div>
    </div>

    <div v-else-if="!analyzing" class="nutrition-content-card">
      <div class="empty-state">
        <t-empty description="选择配方并点击「开始分析」查看营养分析结果" />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/assets/styles/variables.scss' as *;

.nutrition-analysis-page {
  padding: $space-2 0 $content-padding;
  animation: page-fade-in 0.4s ease;
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.header-card {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: $space-4;
  padding: $space-6 $space-8;
  margin-bottom: $space-6;
  background: var(--color-bg-container);
  border-radius: var(--radius-4xl);
  border: 1px solid var(--color-border);
  box-shadow: $shadow-elevation-2;
  background-image: linear-gradient(135deg, var(--color-bg-container) 0%, var(--color-bg-container-alt) 100%);

  .formula-select {
    width: 270px;
  }

  .version-hint {
    display: flex;
    align-items: center;
    gap: $space-1;
    font-size: $font-size-body-sm;
    color: var(--color-text-secondary);
    background: var(--color-bg-container-alt);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: $space-1 $space-3;
    max-width: 360px;

    .hint-icon {
      color: var(--color-warning);
      flex-shrink: 0;
    }

    .hint-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  @media (max-width: 768px) {
    .formula-select {
      width: 100%;
    }
    .version-hint {
      max-width: 100%;
    }
  }

  .header-left {
    flex: 1;
    min-width: 240px;

    .page-title {
      font-size: $font-size-h1;
      font-weight: $font-weight-bold;
      letter-spacing: $ls-display;
      color: var(--color-text-primary);
      margin: 0 0 $space-1 0;
    }

    .page-subtitle {
      font-size: $font-size-body;
      color: var(--color-text-placeholder);
      margin: 0;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: $space-3;
    flex-shrink: 0;

    @media (max-width: 768px) {
      width: 100%;

      :deep(.t-select) {
        flex: 1;
        min-width: 0;
      }
    }
  }
}

.version-option {
  display: flex;
  align-items: center;
  gap: $space-2;

  .version-num {
    font-weight: $font-weight-medium;
    color: var(--color-text-primary);
    font-size: $font-size-body;
  }

  .version-status-tag,
  .version-latest-tag {
    margin-left: $space-1;
  }
}

.nutrition-content-card {
  background: var(--color-bg-container);
  border-radius: var(--radius-4xl);
  border: 1px solid var(--color-bg-page);
  box-shadow: $shadow-elevation-1;
  overflow: hidden;
  transition: box-shadow $transition-slow;

  &:hover {
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 640px) {
    border-radius: var(--radius-3xl);
  }
}

.analysis-grid {
  padding: $space-6;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: $space-5;

  @media (max-width: 1280px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: $space-4;
    gap: $space-4;
  }
}

.grid-cell {
  min-width: 0;

  &--half {
    grid-column: span 2;
    @media (max-width: 1280px) {
      grid-column: span 2;
    }
    @media (max-width: 768px) {
      grid-column: span 1;
    }
  }

  &--quarter {
    grid-column: span 1;
  }

  &--double {
    grid-column: span 2;
    @media (max-width: 768px) {
      grid-column: span 1;
    }
  }

  &--left-stack {
    grid-column: span 1;

    .left-stack-inner {
      display: flex;
      flex-direction: column;
      gap: $space-5;
      height: 100%;

      > :deep(.t-card) {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;

        :deep(.t-card__body) {
          flex: 1;
          display: flex;
          flex-direction: column;
        }
      }
    }

    @media (max-width: 1280px) {
      grid-column: span 2;
    }
    @media (max-width: 768px) {
      grid-column: span 1;
    }
  }

  &--right-main {
    grid-column: span 3;

    @media (max-width: 1280px) {
      grid-column: span 2;
    }
    @media (max-width: 768px) {
      grid-column: span 1;
    }
  }

  &--full {
    grid-column: 1 / -1;
  }

  > :deep(.t-card),
  > :deep(.section-card) {
    border-radius: $radius-xl !important;
    border: 1px solid var(--color-border-light);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    transition: box-shadow $transition-normal;
    height: 100%;

    &:hover {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .t-card__body {
      padding: $space-5 !important;
    }
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: $space-2;

  .card-title-icon {
    color: var(--color-primary);
    font-size: $font-size-h4;
    flex-shrink: 0;

    &--success {
      color: $color-success;
    }
  }
}

.section-body {
  min-height: 0;
}

.nutrition-table-body {
  padding: 0 $space-1;
}

.claims-stat-card {
  :deep(.t-card__body) {
    padding: $space-5 !important;
  }
}

.claims-stat-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-3;
  padding: $space-1 0;
}

.claims-stat-ring {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;

  .ring-svg {
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  .ring-track {
    fill: none;
    stroke: var(--color-bg-container-alt);
    stroke-width: 6;
  }

  .ring-progress {
    fill: none;
    stroke: $color-success;
    stroke-width: 6;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.6s ease;
  }

  .ring-value {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1px;
    color: $color-success;
    line-height: 1;

    .ring-num {
      font-size: 18px;
      font-weight: $font-weight-bold;
      line-height: 1;
    }

    .ring-unit {
      font-size: 12px;
      font-weight: $font-weight-medium;
      line-height: 1;
    }
  }
}

.claims-stat-info {
  display: flex;
  flex-direction: column;
  gap: $space-1-5;
  width: 100%;
  min-width: 0;

  .stat-line {
    display: flex;
    align-items: center;
    gap: $space-1-5;
    font-size: $font-size-body-sm;

    &--total {
      margin-top: $space-1;
      padding-top: $space-2;
      border-top: 1px solid var(--color-border-light);
      color: var(--color-text-secondary);
    }
  }

  .stat-dot {
    width: 8px;
    height: 8px;
    border-radius: $radius-circle;
    flex-shrink: 0;

    &--success {
      background: $color-success;
    }

    &--default {
      background: var(--color-text-placeholder);
    }
  }

  .stat-label {
    color: var(--color-text-secondary);
    flex: 1;
  }

  .stat-value {
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;

    &--success {
      color: $color-success;
    }
  }
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: $space-6;
}
</style>
