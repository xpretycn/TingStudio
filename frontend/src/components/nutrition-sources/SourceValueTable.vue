<template>
  <div class="value-table-wrapper">
    <div class="table-toolbar">
      <span class="toolbar-label">共 {{ nutrients?.length ?? 0 }} 项营养素</span>
      <t-radio-group v-model="diffMode" size="small">
        <t-radio-button value="percent">偏差%</t-radio-button>
        <t-radio-button value="absolute">绝对差</t-radio-button>
      </t-radio-group>
    </div>
    <div class="table-scroll">
      <table class="value-table">
        <thead>
          <tr>
            <th class="col-nutrient">营养素</th>
            <th class="col-value">主用值</th>
            <th
              v-for="src in sources"
              :key="src.sourceId"
              class="col-source"
            >
              <div class="source-th">
                <t-icon :name="iconFor(src.sourceType)" size="14px" />
                <span class="source-th-name">{{ typeLabel(src.sourceType) }}</span>
                <t-tag size="small" variant="light" :theme="confidenceTheme(src.confidence)">
                  {{ confidenceLabel(src.confidence) }}
                </t-tag>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="n in nutrients" :key="n.field">
            <td class="col-nutrient">
              <div class="nutrient-name">
                {{ n.label }}
                <span class="nutrient-unit">{{ n.unit }}</span>
              </div>
            </td>
            <td class="col-value col-value--auth">
              {{ formatValue(n.authoritativeValue) }}
            </td>
            <td
              v-for="src in sources"
              :key="src.sourceId"
              class="col-source"
            >
              <div class="cell-content">
                <div class="cell-value">{{ formatValue(getValue(n, src.sourceId)) }}</div>
                <SourceDiffBadge
                  v-if="diffMode === 'percent'"
                  :diff-percent="getDiffPercent(n, src.sourceId)"
                />
                <span v-else class="cell-abs-diff">
                  {{ formatAbsDiff(getValue(n, src.sourceId), n.authoritativeValue) }}
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import SourceDiffBadge from './SourceDiffBadge.vue'
import { SOURCE_TYPE_SHORT_LABELS, SOURCE_TYPE_ICONS, CONFIDENCE_SHORT_LABELS, CONFIDENCE_THEMES } from '@/constants/sourceTypes'
import type { SourceComparisonNutrient } from '@/api/nutritionSource'
import type { NutritionSource } from '@/api/nutritionSource'

const props = defineProps<{
  nutrients: SourceComparisonNutrient[] | null
  sources: NutritionSource[]
}>()

const diffMode = ref<'percent' | 'absolute'>('percent')

function typeLabel(t: string) {
  return SOURCE_TYPE_SHORT_LABELS[t] ?? t
}
function iconFor(t: string) {
  return SOURCE_TYPE_ICONS[t] ?? 'ellipsis'
}
function confidenceLabel(c: string) {
  return CONFIDENCE_SHORT_LABELS[c] ?? '中'
}
function confidenceTheme(c: string): 'success' | 'warning' | 'default' {
  return CONFIDENCE_THEMES[c] ?? 'warning'
}

function getValue(n: SourceComparisonNutrient, sourceId: string): number {
  const found = n.sources.find((s) => s.sourceId === sourceId)
  return found?.value ?? 0
}

function getDiffPercent(n: SourceComparisonNutrient, sourceId: string): number {
  const found = n.sources.find((s) => s.sourceId === sourceId)
  return found?.diffPercent ?? 0
}

function formatValue(v: number) {
  if (v == null) return '--'
  if (v === 0) return '0'
  return Number(v).toFixed(2)
}

function formatAbsDiff(v: number, base: number) {
  if (v == null) return '--'
  const diff = v - base
  const sign = diff > 0 ? '+' : ''
  return `${sign}${diff.toFixed(2)}`
}
</script>

<style lang="scss" scoped>
.value-table-wrapper {
  display: flex;
  flex-direction: column;
  background: $bg-container;
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;
  overflow: hidden;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-3 $space-4;
  border-bottom: 1px solid $border-color-light;
}

.toolbar-label {
  font-size: $font-size-caption;
  color: $text-tertiary;
}

.table-scroll {
  overflow-x: auto;
}

.value-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: $font-size-body-sm;
  table-layout: auto;

  th, td {
    padding: $space-3 $space-4;
    text-align: left;
    border-bottom: 1px solid $border-color-light;
  }

  th {
    background: $bg-container-alt;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    white-space: nowrap;
  }

  .col-nutrient {
    min-width: 120px;
    position: sticky;
    left: 0;
    background: $bg-container;
    z-index: 1;
  }

  thead .col-nutrient {
    background: $bg-container-alt;
  }

  .col-value {
    min-width: 100px;
    text-align: right;
  }

  .col-value--auth {
    background: var(--color-primary-bg);
    font-weight: $font-weight-semibold;
    color: var(--color-primary-deep);
  }

  .col-source {
    min-width: 140px;
  }
}

.source-th {
  display: flex;
  align-items: center;
  gap: $space-1-5;
}

.source-th-name {
  font-weight: $font-weight-semibold;
}

.cell-content {
  display: flex;
  flex-direction: column;
  gap: $space-1;
  align-items: flex-start;
}

.cell-value {
  font-size: $font-size-body;
  color: $text-primary;
  font-variant-numeric: tabular-nums;
}

.cell-abs-diff {
  font-size: $font-size-caption;
  color: $text-tertiary;
  font-variant-numeric: tabular-nums;
}

.nutrient-name {
  font-weight: $font-weight-medium;
  color: $text-primary;
}

.nutrient-unit {
  margin-left: $space-1;
  font-size: $font-size-caption;
  color: $text-tertiary;
  font-weight: $font-weight-regular;
}
</style>
