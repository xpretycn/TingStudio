<template>
  <t-dialog
    :visible="visible"
    header="批量设为主用"
    :width="560"
    :confirm-btn="null"
    :cancel-btn="null"
    @close="emit('update:visible', false)"
  >
    <div class="dialog-content">
      <p class="dialog-desc">
        将从所选 <strong>{{ selectedSourceIds.length }}</strong> 个来源中，按下方策略为各营养素选取主用值。
      </p>

      <t-form label-align="top">
        <t-form-item label="选取策略">
          <t-radio-group v-model="strategy" @change="handleStrategyChange">
            <t-radio-button value="best-deviation">
              <t-icon name="chart" /> 综合评分
            </t-radio-button>
            <t-radio-button value="highest-confidence">
              <t-icon name="check-circle" /> 最高可信度
            </t-radio-button>
            <t-radio-button value="newest">
              <t-icon name="time" /> 最新时间
            </t-radio-button>
            <t-radio-button value="manual">
              <t-icon name="edit" /> 手动指定
            </t-radio-button>
          </t-radio-group>
        </t-form-item>

        <t-form-item v-if="strategy === 'manual'" label="字段 → 来源">
          <div class="manual-mapping">
            <div
              v-for="(item, idx) in manualMappings"
              :key="idx"
              class="mapping-row"
            >
              <span class="mapping-field">{{ item.label }}</span>
              <t-icon name="arrow-right" />
              <t-select
                v-model="item.sourceId"
                :popup-props="{ appendToBody: true }"
                size="small"
                placeholder="选择来源"
                style="flex: 1"
              >
                <t-option
                  v-for="src in selectedSources"
                  :key="src.sourceId"
                  :value="src.sourceId"
                  :label="`${typeLabel(src.sourceType)} (${confidenceLabel(src.confidence)})`"
                />
              </t-select>
            </div>
          </div>
        </t-form-item>
      </t-form>

      <t-alert
        v-if="strategy !== 'manual'"
        theme="info"
      >
        <template #message>
          <span>系统将自动为各营养素分配主用值，操作完成后可在原页面查看效果。</span>
        </template>
      </t-alert>
    </div>

    <template #footer>
      <t-button theme="default" @click="emit('update:visible', false)">取消</t-button>
      <t-button theme="primary" :loading="loading" @click="handleConfirm">确认</t-button>
    </template>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { SOURCE_TYPE_LABELS, CONFIDENCE_LABELS } from '@/constants/sourceTypes'
import type { SourceWithScore } from '@/api/nutritionSourceBatch'

const props = defineProps<{
  visible: boolean
  selectedSourceIds: string[]
  selectedSources: SourceWithScore[]
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'confirm', payload: {
    strategy: 'best-deviation' | 'manual' | 'highest-confidence' | 'newest'
    sourceIds?: string[]
    fieldSelections?: Record<string, string>
  }): void
}>()

type StrategyKey = 'best-deviation' | 'manual' | 'highest-confidence' | 'newest'

const strategy = ref<StrategyKey>('best-deviation')

const CORE_FIELDS = [
  { field: 'energy', label: '能量 (kJ)' },
  { field: 'protein', label: '蛋白质 (g)' },
  { field: 'fat', label: '脂肪 (g)' },
  { field: 'carbohydrate', label: '碳水化合物 (g)' },
  { field: 'sodium', label: '钠 (mg)' },
  { field: 'fiber', label: '膳食纤维 (g)' },
  { field: 'calcium', label: '钙 (mg)' },
  { field: 'iron', label: '铁 (mg)' },
]

const manualMappings = ref<{ field: string; label: string; sourceId: string }[]>([])

function typeLabel(t: string) {
  return SOURCE_TYPE_LABELS[t] ?? t
}
function confidenceLabel(c: string) {
  return CONFIDENCE_LABELS[c] ?? c
}

watch(
  () => [props.visible, strategy.value] as const,
  ([visible, s]) => {
    if (visible && s === 'manual' && manualMappings.value.length === 0) {
      manualMappings.value = CORE_FIELDS.map((f) => ({
        field: f.field,
        label: f.label,
        sourceId: props.selectedSources[0]?.sourceId ?? '',
      }))
    }
    if (!visible) {
      manualMappings.value = []
      strategy.value = 'best-deviation'
    }
  },
)

function handleStrategyChange(val: string | number | boolean) {
  strategy.value = val as StrategyKey
}

function handleConfirm() {
  if (props.selectedSourceIds.length === 0) return

  if (strategy.value === 'manual') {
    const fieldSelections: Record<string, string> = {}
    for (const m of manualMappings.value) {
      if (m.sourceId) {
        fieldSelections[m.field] = m.sourceId
      }
    }
    if (Object.keys(fieldSelections).length === 0) {
      MessagePlugin.warning('请至少为一个营养素选择来源')
      return
    }
    emit('confirm', {
      strategy: 'manual',
      sourceIds: props.selectedSourceIds,
      fieldSelections,
    })
  } else {
    emit('confirm', {
      strategy: strategy.value,
      sourceIds: props.selectedSourceIds,
    })
  }
}
</script>

<style lang="scss" scoped>
.dialog-content {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.dialog-desc {
  margin: 0;
  font-size: $font-size-body-sm;
  color: var(--color-text-secondary);

  strong {
    color: var(--color-primary-deep);
    font-weight: $font-weight-semibold;
  }
}

.manual-mapping {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  max-height: 320px;
  overflow-y: auto;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-3;
  background: var(--color-bg-container-alt);
  border-radius: $radius-md;
}

.mapping-field {
  font-size: $font-size-body-sm;
  color: var(--color-text-primary);
  font-weight: $font-weight-medium;
  min-width: 110px;
}
</style>
