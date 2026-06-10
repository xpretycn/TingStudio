<template>
  <t-collapse v-model="expanded">
    <t-collapse-panel value="compare" header="营养数据来源对比">
      <template #headerRightContent>
        <t-button
          v-if="isAdmin && hasSelections"
          theme="success"
          variant="text"
          size="small"
          :loading="submitting"
          @click.stop="handleSubmitAuthoritative"
        >
          ✅ 应用选定
        </t-button>
        <t-button
          theme="primary"
          variant="text"
          size="small"
          :loading="enriching"
          @click.stop="handleEnrich"
        >
          🌐 智能获取
        </t-button>
      </template>

      <div v-if="loading" class="compare-loading">
        <t-loading />
      </div>

      <div v-else-if="!comparison || comparison.summary.totalSources === 0" class="compare-empty">
        <div class="empty-icon">📋</div>
        <div class="empty-text">暂无多源数据</div>
        <div class="empty-desc">当前营养数据仅有一个来源，无法对比</div>
        <t-button theme="primary" size="small" @click="handleEnrich" :loading="enriching">
          🌐 智能获取营养数据
        </t-button>
      </div>

      <div v-else class="compare-content">
        <div class="compare-summary">
          <span>差异摘要: {{ comparison.summary.diffCount }}项营养素有差异</span>
          <span v-if="comparison.summary.maxDiffPercent > 0">
            , 最大差异 {{ comparison.summary.maxDiffPercent }}%
          </span>
          <span v-if="isAdmin" class="compare-hint">
            · 点击来源单元格选择权威值
          </span>
        </div>

        <div class="compare-table-wrapper">
          <table class="compare-table">
            <thead>
              <tr>
                <th class="col-nutrient">营养素</th>
                <th class="col-authoritative">权威值</th>
                <th
                  v-for="src in activeSources"
                  :key="src.sourceId"
                  class="col-source"
                >
                  <div class="source-header">
                    <NutritionSourceTag
                      :source-type="src.sourceType"
                      :source-detail="src.sourceDetail"
                    />
                    <t-tag
                      :theme="src.confidence === 'high' ? 'success' : src.confidence === 'low' ? 'warning' : 'default'"
                      size="small"
                      variant="light-outline"
                    >
                      {{ src.confidence === 'high' ? '高' : src.confidence === 'low' ? '低' : '中' }}
                    </t-tag>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="nutrient in comparison.nutrients"
                :key="nutrient.field"
              >
                <td class="col-nutrient">
                  {{ nutrient.label }}
                  <span class="unit">{{ nutrient.unit }}</span>
                </td>
                <td class="col-authoritative">
                  {{ formatValue(nutrient.authoritativeValue) }}
                </td>
                <td
                  v-for="src in activeSources"
                  :key="src.sourceId"
                  class="col-source"
                  :class="[
                    getCellClass(nutrient, src.sourceId),
                    { 'cell-selected': fieldSelections[nutrient.field] === src.sourceId },
                    { 'cell-selectable': isAdmin },
                  ]"
                  @click="isAdmin && handleSelectField(nutrient.field, src.sourceId)"
                >
                  <div class="cell-content">
                    <span>{{ formatValue(getSourceValue(nutrient, src.sourceId)) }}</span>
                    <span v-if="getSourceDiff(nutrient, src.sourceId) > 0" class="diff-badge">⚠️</span>
                    <t-icon
                      v-if="fieldSelections[nutrient.field] === src.sourceId"
                      name="check-circle-filled"
                      class="selected-icon"
                    />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="isAdmin && hasSelections" class="compare-actions">
          <t-button theme="success" size="small" :loading="submitting" @click="handleSubmitAuthoritative">
            ✅ 应用选定（{{ Object.keys(fieldSelections).length }}项）
          </t-button>
          <t-button theme="default" variant="text" size="small" @click="fieldSelections = {}">
            清除选择
          </t-button>
        </div>
      </div>
    </t-collapse-panel>
  </t-collapse>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { useNutritionSourceStore } from '@/stores/nutritionSource'
import { useAuthStore } from '@/stores/auth'
import NutritionSourceTag from './NutritionSourceTag.vue'
import type { SourceComparisonNutrient } from '@/api/nutritionSource'

const props = defineProps<{
  materialId: string
  visible?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'authoritative-updated'): void
}>()

const nutritionSourceStore = useNutritionSourceStore()
const authStore = useAuthStore()
const expanded = ref<string[]>(props.visible ? ['compare'] : [])
const enriching = ref(false)
const submitting = ref(false)
const fieldSelections = ref<Record<string, string>>({})

const isAdmin = computed(() => authStore.role === 'admin')
const loading = computed(() => nutritionSourceStore.loading)
const comparison = computed(() => nutritionSourceStore.comparison)
const hasSelections = computed(() => Object.keys(fieldSelections.value).length > 0)

const activeSources = computed(() => {
  if (!comparison.value) return []
  const sourceMap = new Map<string, { sourceId: string; sourceType: string; sourceDetail: string | null; confidence: string }>()
  for (const nutrient of comparison.value.nutrients) {
    for (const src of nutrient.sources) {
      if (!sourceMap.has(src.sourceId)) {
        sourceMap.set(src.sourceId, {
          sourceId: src.sourceId,
          sourceType: src.sourceType,
          sourceDetail: src.sourceDetail,
          confidence: src.confidence,
        })
      }
    }
  }
  return [...sourceMap.values()]
})

watch(() => props.visible, (val) => {
  if (val) {
    expanded.value = ['compare']
    nutritionSourceStore.fetchComparison(props.materialId)
  }
})

watch(expanded, (val) => {
  if (val.includes('compare') && !comparison.value) {
    nutritionSourceStore.fetchComparison(props.materialId)
  }
})

function handleSelectField(field: string, sourceId: string) {
  if (fieldSelections.value[field] === sourceId) {
    const updated = { ...fieldSelections.value }
    delete updated[field]
    fieldSelections.value = updated
  } else {
    fieldSelections.value = { ...fieldSelections.value, [field]: sourceId }
  }
}

function getSourceValue(nutrient: SourceComparisonNutrient, sourceId: string): number {
  return nutrient.sources.find((s) => s.sourceId === sourceId)?.value ?? 0
}

function getSourceDiff(nutrient: SourceComparisonNutrient, sourceId: string): number {
  return nutrient.sources.find((s) => s.sourceId === sourceId)?.diffPercent ?? 0
}

function getCellClass(nutrient: SourceComparisonNutrient, sourceId: string): string {
  const diff = getSourceDiff(nutrient, sourceId)
  if (diff === 0) return ''
  if (diff > 30) return 'cell-high-diff'
  if (diff > 10) return 'cell-medium-diff'
  return 'cell-low-diff'
}

function formatValue(val: number): string {
  if (val === 0) return '0'
  if (Number.isInteger(val)) return String(val)
  return val.toFixed(2)
}

async function handleEnrich() {
  enriching.value = true
  try {
    const result = await nutritionSourceStore.enrichNutrition(props.materialId)
    if (result.success && result.data) {
      if (result.data.summary.totalNotFound > 0 && result.data.summary.totalFound === 0) {
        MessagePlugin.info('未找到匹配的营养数据')
      }
    }
  } finally {
    enriching.value = false
  }
}

async function handleSubmitAuthoritative() {
  if (!hasSelections.value) return
  submitting.value = true
  try {
    const result = await nutritionSourceStore.setAuthoritative(props.materialId, fieldSelections.value)
    if (result.success) {
      MessagePlugin.success(`已更新 ${Object.keys(fieldSelections.value).length} 个字段的权威数据`)
      fieldSelections.value = {}
      emit('authoritative-updated')
      await nutritionSourceStore.fetchComparison(props.materialId)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.compare-loading,
.compare-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-6, 24px);
  gap: var(--space-2, 8px);
}

.empty-icon {
  font-size: 32px;
}

.empty-text {
  font-size: var(--font-size-body, 14px);
  font-weight: 500;
}

.empty-desc {
  font-size: var(--font-size-caption, 12px);
  color: var(--color-text-secondary, rgba(0, 0, 0, 0.6));
  margin-bottom: var(--space-2, 8px);
}

.compare-summary {
  font-size: var(--font-size-caption, 12px);
  color: var(--color-text-secondary, rgba(0, 0, 0, 0.6));
  margin-bottom: var(--space-3, 12px);
}

.compare-hint {
  color: var(--color-primary, #0052d9);
  margin-left: var(--space-1, 4px);
}

.compare-table-wrapper {
  overflow-x: auto;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-caption, 12px);

  th, td {
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border: 1px solid var(--color-border, #dcdcdc);
    text-align: right;
    white-space: nowrap;
  }

  th {
    background: var(--color-bg-container, #f3f3f3);
    font-weight: 500;
    text-align: center;
  }

  .col-nutrient {
    text-align: left;
    font-weight: 500;
    min-width: 100px;
  }

  .col-authoritative {
    font-weight: 600;
    min-width: 80px;
  }

  .col-source {
    min-width: 80px;
  }
}

.cell-selectable {
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: rgba(0, 82, 217, 0.06) !important;
  }
}

.cell-selected {
  background: rgba(0, 82, 217, 0.1) !important;
  outline: 2px solid var(--color-primary, #0052d9);
  outline-offset: -2px;
}

.cell-content {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.selected-icon {
  color: var(--color-primary, #0052d9);
  font-size: 14px;
  margin-left: 2px;
}

.unit {
  color: var(--color-text-secondary, rgba(0, 0, 0, 0.6));
  margin-left: 2px;
  font-size: 11px;
}

.source-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.diff-badge {
  margin-left: 2px;
}

.compare-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  margin-top: var(--space-3, 12px);
  padding-top: var(--space-3, 12px);
  border-top: 1px solid var(--color-border, #dcdcdc);
}

.cell-low-diff {
  background: rgba(234, 179, 8, 0.08);
}

.cell-medium-diff {
  background: rgba(234, 179, 8, 0.15);
}

.cell-high-diff {
  background: rgba(245, 158, 11, 0.2);
}
</style>
