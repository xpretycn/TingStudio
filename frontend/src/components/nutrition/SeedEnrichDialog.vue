<template>
  <t-dialog
    :visible="visible"
    :header="`从种子库填充 - ${materialName}`"
    :width="700"
    placement="center"
    :footer="false"
    @close="handleClose"
  >
    <div class="seed-enrich-dialog__body">
      <!-- Loading -->
      <div v-if="loading" class="seed-enrich-dialog__loading">
        <t-loading size="medium" text="正在从种子库搜索匹配数据..." />
      </div>

      <!-- Empty state -->
      <div v-else-if="!enrichResult || !enrichResult.found" class="seed-enrich-dialog__empty">
        <t-icon name="search" size="48px" class="empty-icon" />
        <div class="empty-text">未找到匹配的种子库数据</div>
        <div class="empty-desc">当前原料在种子库中没有对应的营养数据记录</div>
      </div>

      <!-- Result content -->
      <div v-else class="seed-enrich-dialog__content">
        <!-- Source info -->
        <div class="source-info">
          <NutritionSourceTag source-type="seed" :source-detail="enrichResult.sourceDetail" />
          <t-tag
            :theme="confidenceTheme"
            size="small"
            variant="light-outline"
          >
            {{ confidenceLabel }}
          </t-tag>
          <span class="match-score">匹配度: {{ (enrichResult.matchScore * 100).toFixed(0) }}%</span>
        </div>

        <!-- Select all -->
        <div class="select-all-row">
          <t-checkbox :checked="isAllSelected" :indeterminate="isPartialSelected" @change="handleToggleAll">
            全选非零字段
          </t-checkbox>
          <span class="selected-count">已选 {{ selectedFields.size }} 项</span>
        </div>

        <!-- Comparison table -->
        <div class="comparison-table-wrapper">
          <table class="comparison-table">
            <thead>
              <tr>
                <th class="col-check" />
                <th class="col-nutrient">营养素</th>
                <th class="col-current">当前值</th>
                <th class="col-seed">种子库值</th>
                <th class="col-diff">差异</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in comparisonRows"
                :key="row.field"
                :class="{ 'row-selected': selectedFields.has(row.field) }"
              >
                <td class="col-check">
                  <t-checkbox
                    :checked="selectedFields.has(row.field)"
                    @change="handleToggleField(row.field)"
                  />
                </td>
                <td class="col-nutrient">
                  {{ row.label }}
                  <span class="unit">{{ row.unit }}</span>
                </td>
                <td class="col-current">
                  {{ formatValue(row.currentValue) }}
                </td>
                <td class="col-seed">
                  {{ formatValue(row.seedValue) }}
                </td>
                <td class="col-diff">
                  <span :class="diffClass(row.diffPercent)">
                    {{ formatDiff(row.diffPercent) }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Actions -->
        <div class="seed-enrich-dialog__actions">
          <t-button theme="default" @click="handleClose">取消</t-button>
          <t-button
            theme="primary"
            :disabled="selectedFields.size === 0"
            @click="handleConfirm"
          >
            确认填充（{{ selectedFields.size }} 项）
          </t-button>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import { nutritionSourceApi } from "@/api/nutritionSource"
import type { EnrichResult } from "@/api/nutritionSource"
import NutritionSourceTag from "./NutritionSourceTag.vue"

const NUTRIENT_LABELS: Record<string, string> = {
  energy: "能量",
  protein: "蛋白质",
  fat: "脂肪",
  carbohydrate: "碳水化合物",
  fiber: "膳食纤维",
  sugars: "糖",
  sodium: "钠",
  potassium: "钾",
  calcium: "钙",
  iron: "铁",
  zinc: "锌",
  magnesium: "镁",
  phosphorus: "磷",
  vitaminA: "维生素A",
  vitaminC: "维生素C",
  vitaminD: "维生素D",
  vitaminE: "维生素E",
  vitaminK: "维生素K",
  vitaminB1: "维生素B1",
  vitaminB2: "维生素B2",
  vitaminB3: "维生素B3",
  vitaminB6: "维生素B6",
  vitaminB12: "维生素B12",
  folate: "叶酸",
  cholesterol: "胆固醇",
  transFat: "反式脂肪",
  saturatedFat: "饱和脂肪",
}

const NUTRIENT_UNITS: Record<string, string> = {
  energy: "kJ",
  protein: "g",
  fat: "g",
  carbohydrate: "g",
  fiber: "g",
  sugars: "g",
  sodium: "mg",
  potassium: "mg",
  calcium: "mg",
  iron: "mg",
  zinc: "mg",
  magnesium: "mg",
  phosphorus: "mg",
  vitaminA: "μg",
  vitaminC: "mg",
  vitaminD: "μg",
  vitaminE: "mg",
  vitaminK: "μg",
  vitaminB1: "mg",
  vitaminB2: "mg",
  vitaminB3: "mg",
  vitaminB6: "mg",
  vitaminB12: "μg",
  folate: "μg",
  cholesterol: "mg",
  transFat: "g",
  saturatedFat: "g",
}

interface ComparisonRow {
  field: string
  label: string
  unit: string
  currentValue: number
  seedValue: number
  diffPercent: number
}

const props = defineProps<{
  visible: boolean
  materialName: string
  materialId: string
  currentNutrition: Record<string, number>
}>()

const emit = defineEmits<{
  "update:visible": [value: boolean]
  confirm: [data: {
    nutritionData: Record<string, number>
    dataSource: string
    confidence: string
    sourceType: string
    notes: string
  }]
}>()

const loading = ref(false)
const enrichResult = ref<EnrichResult | null>(null)
const selectedFields = ref<Set<string>>(new Set())

const confidenceTheme = computed<"success" | "warning" | "default">(() => {
  if (!enrichResult.value) return "default"
  const c = enrichResult.value.confidence
  if (c === "high") return "success"
  if (c === "medium") return "warning"
  return "default"
})

const confidenceLabel = computed(() => {
  if (!enrichResult.value) return ""
  const c = enrichResult.value.confidence
  if (c === "high") return "权威来源"
  if (c === "medium") return "中等可信"
  return "参考估算"
})

const comparisonRows = computed<ComparisonRow[]>(() => {
  if (!enrichResult.value) return []
  const seedData = enrichResult.value.per100g
  const rows: ComparisonRow[] = []

  for (const [field, seedValue] of Object.entries(seedData)) {
    if (!(field in NUTRIENT_LABELS)) continue
    const currentValue = props.currentNutrition[field] ?? 0
    let diffPercent = 0
    if (currentValue !== 0) {
      diffPercent = Math.abs(((seedValue - currentValue) / currentValue) * 100)
    } else if (seedValue !== 0) {
      diffPercent = 100
    }

    rows.push({
      field,
      label: NUTRIENT_LABELS[field] ?? field,
      unit: NUTRIENT_UNITS[field] ?? "",
      currentValue,
      seedValue,
      diffPercent,
    })
  }

  return rows
})

const nonZeroFields = computed(() => {
  return new Set(
    comparisonRows.value
      .filter((row) => row.seedValue !== 0)
      .map((row) => row.field),
  )
})

const isAllSelected = computed(() => {
  if (nonZeroFields.value.size === 0) return false
  for (const field of nonZeroFields.value) {
    if (!selectedFields.value.has(field)) return false
  }
  return true
})

const isPartialSelected = computed(() => {
  if (nonZeroFields.value.size === 0) return false
  let hasSelected = false
  let hasUnselected = false
  for (const field of nonZeroFields.value) {
    if (selectedFields.value.has(field)) {
      hasSelected = true
    } else {
      hasUnselected = true
    }
  }
  return hasSelected && hasUnselected
})

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await fetchSeedData()
    } else {
      resetState()
    }
  },
)

async function fetchSeedData() {
  loading.value = true
  enrichResult.value = null
  selectedFields.value = new Set()

  try {
    let result: { results: EnrichResult[] }
    if (props.materialId) {
      // 已有原料 ID：走 enrichNutrition 接口
      result = await nutritionSourceApi.enrichNutrition(props.materialId, ["seed"]) as unknown as { results: EnrichResult[] }
    } else {
      // 新建原料：按名称搜索种子库
      result = await nutritionSourceApi.searchSeedByName(props.materialName) as unknown as { results: EnrichResult[] }
    }
    const seedResult = result.results?.find((r: EnrichResult) => r.sourceType === "seed")
    if (seedResult) {
      enrichResult.value = seedResult
      // Default: select all non-zero seed fields
      const defaultSelected = new Set<string>()
      for (const [field, value] of Object.entries(seedResult.per100g)) {
        if (value !== 0 && field in NUTRIENT_LABELS) {
          defaultSelected.add(field)
        }
      }
      selectedFields.value = defaultSelected
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "搜索种子库数据失败"
    MessagePlugin.error(msg)
  } finally {
    loading.value = false
  }
}

function resetState() {
  enrichResult.value = null
  selectedFields.value = new Set()
}

function handleToggleField(field: string) {
  const updated = new Set(selectedFields.value)
  if (updated.has(field)) {
    updated.delete(field)
  } else {
    updated.add(field)
  }
  selectedFields.value = updated
}

function handleToggleAll(checked: boolean | ((val: boolean) => boolean)) {
  const isChecked = typeof checked === "function" ? checked(isAllSelected.value) : checked
  if (isChecked) {
    selectedFields.value = new Set(nonZeroFields.value)
  } else {
    selectedFields.value = new Set()
  }
}

function handleConfirm() {
  if (!enrichResult.value || selectedFields.value.size === 0) return

  const nutritionData: Record<string, number> = {}
  for (const field of selectedFields.value) {
    nutritionData[field] = enrichResult.value.per100g[field] ?? 0
  }

  emit("confirm", {
    nutritionData,
    dataSource: enrichResult.value.sourceDetail ?? "种子库",
    confidence: enrichResult.value.confidence,
    sourceType: enrichResult.value.sourceType,
    notes: `从种子库填充，匹配度 ${(enrichResult.value.matchScore * 100).toFixed(0)}%`,
  })
  handleClose()
}

function handleClose() {
  emit("update:visible", false)
}

function formatValue(val: number): string {
  if (val === 0) return "0"
  if (Number.isInteger(val)) return String(val)
  return val.toFixed(2)
}

function formatDiff(percent: number): string {
  if (percent === 0) return "--"
  return `${percent > 0 ? "+" : ""}${percent.toFixed(1)}%`
}

function diffClass(percent: number): string {
  if (percent === 0) return "diff-none"
  if (percent > 20) return "diff-high"
  if (percent > 5) return "diff-medium"
  return "diff-low"
}
</script>

<style lang="scss" scoped>
.seed-enrich-dialog__body {
  min-height: 200px;
}

.seed-enrich-dialog__loading,
.seed-enrich-dialog__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-8, 32px) 0;
  gap: var(--space-3, 12px);
}

.empty-icon {
  color: var(--color-text-placeholder, #9a8da2);
}

.empty-text {
  font-size: var(--font-size-body, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-regular, #6e6178);
}

.empty-desc {
  font-size: var(--font-size-caption, 12px);
  color: var(--color-text-secondary, #756a7c);
}

.seed-enrich-dialog__content {
  display: flex;
  flex-direction: column;
  gap: var(--space-3, 12px);
}

.source-info {
  display: flex;
  align-items: center;
  gap: var(--space-2, 8px);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  background: var(--color-bg-container-alt, #f7f8fa);
  border-radius: var(--radius-md, 8px);
}

.match-score {
  font-size: var(--font-size-caption, 12px);
  color: var(--color-text-secondary, #756a7c);
  margin-left: auto;
}

.select-all-row {
  display: flex;
  align-items: center;
  gap: var(--space-3, 12px);
  padding: var(--space-1, 4px) 0;
}

.selected-count {
  font-size: var(--font-size-caption, 12px);
  color: var(--color-text-secondary, #756a7c);
  margin-left: auto;
}

.comparison-table-wrapper {
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--color-border, #e4e7ed);
  border-radius: var(--radius-md, 8px);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-caption, 12px);

  th,
  td {
    padding: var(--space-2, 8px) var(--space-3, 12px);
    text-align: center;
    white-space: nowrap;
    border-bottom: 1px solid var(--color-border-light, #f2f4f7);
  }

  th {
    background: var(--color-bg-container-alt, #f7f8fa);
    font-weight: var(--font-weight-medium, 500);
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .col-check {
    width: 40px;
    text-align: center;
  }

  .col-nutrient {
    text-align: left;
    font-weight: var(--font-weight-medium, 500);
    min-width: 120px;
  }

  .col-current {
    min-width: 80px;
  }

  .col-seed {
    min-width: 80px;
    font-weight: var(--font-weight-semibold, 600);
  }

  .col-diff {
    min-width: 70px;
    text-align: center;
  }

  tbody tr {
    transition: background var(--transition-fast, 0.15s ease);

    &:hover {
      background: var(--color-bg-hover, #f2f4f7);
    }

    &:last-child td {
      border-bottom: none;
    }
  }

  .row-selected {
    background: var(--color-primary-bg, #fff0f3);
  }
}

.unit {
  color: var(--color-text-placeholder, #9a8da2);
  margin-left: 2px;
  font-size: var(--font-size-micro, 11px);
}

.diff-none {
  color: var(--color-text-placeholder, #9a8da2);
}

.diff-low {
  color: var(--color-success, #7bc67e);
}

.diff-medium {
  color: var(--color-warning, #f0a040);
}

.diff-high {
  color: var(--color-danger, #e34d59);
}

.seed-enrich-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2, 8px);
  padding-top: var(--space-3, 12px);
  border-top: 1px solid var(--color-border-light, #f2f4f7);
}
</style>

<style lang="scss">
/* 非 scoped：确保 dialog 居中时可滚动，不超出视口 */
.t-dialog__ctx .t-dialog__position.t-dialog--center {
  /* 用 block 替代 flex center，配合子元素 margin:auto 实现“短居中、长可滚动” */
  align-items: flex-start;
  padding-top: 24px;
  padding-bottom: 24px;
}

.t-dialog__ctx .t-dialog__position.t-dialog--center > .t-dialog {
  margin-top: auto;
  margin-bottom: auto;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .t-dialog__body {
    overflow: visible;
  }
}
</style>
