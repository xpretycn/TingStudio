<template>
  <div class="source-overview">
    <div class="overview-top">
      <h3 class="overview-title">
        <t-icon name="view-module" /> 5 大核心指标偏差概览
      </h3>
      <span v-if="summary" class="overview-summary">
        共 {{ summary.totalNutrients }} 项 · 平均偏差 {{ summary.avgDiffPercent }}% · 最大 {{ summary.maxDiffPercent }}%
      </span>
    </div>

    <div class="heatmap">
      <div
        v-for="(item, idx) in coreNutrients"
        :key="item.field"
        class="heatmap-cell"
        @click="emit('drill-down', item.field)"
      >
        <div class="cell-label">{{ item.label }}</div>
        <div class="cell-bar">
          <div
            class="cell-fill"
            :class="`cell-fill--${item.severity}`"
            :style="{ width: Math.min(100, item.diffPercent * 5) + '%' }"
          ></div>
        </div>
        <div class="cell-value">
          <span :class="`cell-diff cell-diff--${item.severity}`">
            {{ item.diffPercent.toFixed(1) }}%
          </span>
        </div>
      </div>
    </div>

    <SourceRecommendationCard
      v-if="recommendCandidates.length > 0"
      :candidates="recommendCandidates"
      :sources="sources"
      :active-authoritative-source-id="activeAuthoritativeSourceId"
      :can-apply="canApply"
      @apply="handleApply"
    />

    <div v-if="nutrients && nutrients.length > 0" class="metric-cards">
      <div class="metric-card" v-for="card in metricCards" :key="card.label">
        <div class="metric-icon" :class="`metric-icon--${card.theme}`">
          <t-icon :name="card.icon" size="18px" />
        </div>
        <div class="metric-content">
          <div class="metric-label">{{ card.label }}</div>
          <div class="metric-value">{{ card.value }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SourceRecommendationCard from './SourceRecommendationCard.vue'
import type { SourceComparisonNutrient, NutritionSource } from '@/api/nutritionSource'
import type { ScoredSource } from '@/api/nutritionSourceBatch'

const props = defineProps<{
  nutrients: SourceComparisonNutrient[] | null
  /** 兼容旧 API：仅展示 top 1 推荐（已弃用，推荐用 recommendCandidates） */
  recommendation?: ScoredSource | null
  /** 推荐候选 top N（按 totalScore 降序） */
  recommendCandidates: ScoredSource[]
  /** 全量 source 列表，用于展示更多上下文 */
  sources: NutritionSource[]
  /** 当前主用来源 ID */
  activeAuthoritativeSourceId?: string | null
  summary: {
    totalSources: number
    totalNutrients: number
    diffCount: number
    maxDiffPercent: number
    avgDiffPercent: number
  } | null
  canApply?: boolean
  applying?: boolean
}>()

const emit = defineEmits<{
  (e: 'drill-down', field: string): void
  (e: 'apply', sourceId: string): void
}>()

const CORE_FIELDS = ['energy', 'protein', 'fat', 'carbohydrate', 'sodium']

const coreNutrients = computed(() => {
  if (!props.nutrients) return []
  return props.nutrients
    .filter((n) => CORE_FIELDS.includes(n.field))
    .map((n) => {
      const maxDiff = n.sources.length > 0
        ? Math.max(...n.sources.map((s) => Math.abs(s.diffPercent)))
        : 0
      return {
        field: n.field,
        label: n.label,
        diffPercent: maxDiff,
        severity: getSeverity(maxDiff),
      }
    })
})

function getSeverity(diff: number): 'success' | 'info' | 'warning' | 'danger' {
  if (diff < 1) return 'success'
  if (diff < 3) return 'info'
  if (diff < 5) return 'warning'
  return 'danger'
}

const metricCards = computed(() => {
  if (!props.summary) return []
  return [
    {
      label: '数据来源',
      value: String(props.summary.totalSources),
      icon: 'server',
      theme: 'primary',
    },
    {
      label: '营养素',
      value: String(props.summary.totalNutrients),
      icon: 'view-list',
      theme: 'info',
    },
    {
      label: '有差异项',
      value: String(props.summary.diffCount),
      icon: 'swap',
      theme: 'warning',
    },
    {
      label: '平均偏差',
      value: `${props.summary.avgDiffPercent}%`,
      icon: 'chart',
      theme: 'success',
    },
  ]
})

function handleApply(sourceId: string) {
  // 转发 sourceId 给父组件，由父组件调用 store.batchSetAuthoritative
  emit('apply', sourceId)
}
</script>

<style lang="scss" scoped>
.source-overview {
  display: flex;
  flex-direction: column;
  gap: $space-5;
  padding: $space-5;
}

.overview-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: $space-3;
}

.overview-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: 0;
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.overview-summary {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.heatmap {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: $space-3;
}

.heatmap-cell {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3;
  background: var(--color-bg-container-alt);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all $transition-fast;
  border: 1px solid var(--color-border);

  &:hover {
    background: var(--color-primary-bg);
    border-color: var(--color-primary-lighter);
  }
}

.cell-label {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.cell-bar {
  height: 6px;
  background: var(--color-bg-hover);
  border-radius: $radius-pill;
  overflow: hidden;
}

.cell-fill {
  height: 100%;
  border-radius: $radius-pill;
  transition: width $transition-normal;

  &--success { background: $color-success; }
  &--info { background: $color-info; }
  &--warning { background: $color-warning; }
  &--danger { background: $color-danger; }
}

.cell-value {
  display: flex;
  align-items: baseline;
}

.cell-diff {
  font-size: $font-size-body;
  font-weight: $font-weight-semibold;

  &--success { color: $color-success; }
  &--info { color: $color-info; }
  &--warning { color: $color-warning; }
  &--danger { color: $color-danger; }
}

.metric-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: $space-3;
  padding: $space-3 $space-4;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: $radius-md;
}

.metric-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-md;

  &--primary { background: var(--color-primary-bg); color: var(--color-primary); }
  &--info { background: $color-info-light; color: $color-info; }
  &--warning { background: $color-warning-light; color: $color-warning; }
  &--success { background: $color-success-light; color: $color-success; }
}

.metric-content {
  display: flex;
  flex-direction: column;
}

.metric-label {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.metric-value {
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

@media (max-width: 1199px) {
  .heatmap {
    grid-template-columns: repeat(3, 1fr);
  }
  .metric-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .heatmap {
    grid-template-columns: repeat(2, 1fr);
  }
  .metric-cards {
    grid-template-columns: 1fr;
  }
}
</style>
