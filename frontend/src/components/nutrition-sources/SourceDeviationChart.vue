<template>
  <div class="deviation-chart">
    <div class="chart-header">
      <h3 class="chart-title">
        <t-icon name="chart" /> 偏差热力图
      </h3>
      <p class="chart-subtitle">颜色越深表示该来源在该营养素上偏差越大</p>
    </div>

    <div v-if="!nutrients || nutrients.length === 0" class="empty">
      <t-empty description="暂无数据" />
    </div>
    <div v-else class="heatmap-grid">
      <div class="heatmap-row heatmap-row--header">
        <div class="heatmap-cell heatmap-cell--corner">营养素</div>
        <div
          v-for="src in sources"
          :key="src.sourceId"
          class="heatmap-cell heatmap-cell--header"
        >
          <t-icon :name="iconFor(src.sourceType)" size="12px" />
          <span>{{ typeLabel(src.sourceType) }}</span>
        </div>
      </div>
      <div
        v-for="n in nutrients"
        :key="n.field"
        class="heatmap-row"
      >
        <div class="heatmap-cell heatmap-cell--label">{{ n.label }}</div>
        <div
          v-for="src in sources"
          :key="src.sourceId"
          class="heatmap-cell heatmap-cell--value"
          :class="`severity-${getSeverity(getDiffPercent(n, src.sourceId))}`"
          :title="`${n.label}: ${getDiffPercent(n, src.sourceId).toFixed(1)}%`"
        >
          {{ getDiffPercent(n, src.sourceId).toFixed(1) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { SOURCE_TYPE_SHORT_LABELS, SOURCE_TYPE_ICONS } from '@/constants/sourceTypes'
import type { SourceComparisonNutrient, NutritionSource } from '@/api/nutritionSource'

const props = defineProps<{
  nutrients: SourceComparisonNutrient[] | null
  sources: NutritionSource[]
}>()

function typeLabel(t: string) {
  return SOURCE_TYPE_SHORT_LABELS[t] ?? t
}
function iconFor(t: string) {
  return SOURCE_TYPE_ICONS[t] ?? 'ellipsis'
}

function getDiffPercent(n: SourceComparisonNutrient, sourceId: string): number {
  const found = n.sources.find((s) => s.sourceId === sourceId)
  return Math.abs(found?.diffPercent ?? 0)
}

function getSeverity(diff: number): 'success' | 'info' | 'warning' | 'danger' {
  if (diff < 1) return 'success'
  if (diff < 3) return 'info'
  if (diff < 5) return 'warning'
  return 'danger'
}
</script>

<style lang="scss" scoped>
.deviation-chart {
  padding: $space-5;
  background: $bg-container;
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;
}

.chart-header {
  margin-bottom: $space-4;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: 0 0 $space-1 0;
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.chart-subtitle {
  margin: 0;
  font-size: $font-size-caption;
  color: $text-tertiary;
}

.empty {
  padding: $space-12 0;
}

.heatmap-grid {
  display: flex;
  flex-direction: column;
  border-radius: $radius-md;
  overflow: hidden;
  border: 1px solid $border-color-light;
}

.heatmap-row {
  display: grid;
  grid-template-columns: 100px repeat(v-bind('sources.length'), 1fr);

  &:not(:last-child) {
    border-bottom: 1px solid $border-color-light;
  }
}

.heatmap-cell {
  padding: $space-2 $space-3;
  font-size: $font-size-caption;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  font-variant-numeric: tabular-nums;

  &--corner {
    background: $bg-container-alt;
    font-weight: $font-weight-semibold;
    justify-content: flex-start;
    color: $text-primary;
  }

  &--header {
    background: $bg-container-alt;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    gap: $space-1;
    font-size: $font-size-caption;
  }

  &--label {
    justify-content: flex-start;
    font-weight: $font-weight-medium;
    color: $text-primary;
    background: $bg-container-alt;
    border-right: 1px solid $border-color-light;
  }

  &--value {
    color: $text-primary;
    font-weight: $font-weight-medium;
  }
}

.severity-success { background: $color-success-light; color: $color-success; }
.severity-info { background: $color-info-light; color: $color-info; }
.severity-warning { background: $color-warning-light; color: $color-warning; font-weight: $font-weight-semibold; }
.severity-danger { background: $color-danger-light; color: $color-danger; font-weight: $font-weight-bold; }
</style>
