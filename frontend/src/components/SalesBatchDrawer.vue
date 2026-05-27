<template>
  <t-drawer :visible="visible" :on-close="handleClose" :close-btn="false" :footer="false" size="860px" placement="right"
    class="sales-batch-drawer" destroy-on-close>
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
          </svg>
          <span class="header-title">批量录入销量数据</span>
        </div>
        <div class="header-actions">
          <button class="confirm-btn cancel-btn" @click="handleClose">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            取消
          </button>
          <button class="confirm-btn create-btn" :class="{ loading: submitting }" @click="handleSubmit"
            :disabled="submitting || tableData.length === 0">
            <t-loading v-if="submitting" size="14px" />
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            提交录入
          </button>
        </div>
      </div>
    </template>

    <div class="batch-drawer-body">
      <div class="drawer-card period-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>统计周期</span>
        </div>
        <div class="card-body">
          <div class="filter-row">
            <div class="filter-item">
              <label class="filter-label">周期类型</label>
              <t-radio-group v-model="periodType" variant="default-filled" size="small"
                @change="handlePeriodTypeChange">
                <t-radio-button value="monthly">月度</t-radio-button>
                <t-radio-button value="quarterly">季度</t-radio-button>
                <t-radio-button value="yearly">年度</t-radio-button>
              </t-radio-group>
            </div>
            <div class="filter-item">
              <label class="filter-label">周期值</label>
              <t-date-picker v-model="periodStart" mode="month" placeholder="选择月份" size="small"
                :disable-date="{ after: new Date() }" style="width: 150px" @change="handlePeriodChange" />
            </div>
            <div class="filter-item">
              <label class="filter-label">业务员</label>
              <t-select v-model="filterSalesmanId" placeholder="全部业务员" clearable filterable size="small"
                style="width: 150px" @change="handleSalesmanFilterChange">
                <t-option v-for="s in activeSalesmen" :key="s.id" :value="s.id" :label="s.name" />
              </t-select>
            </div>
            <div class="filter-item filter-item--action">
              <t-button variant="outline" size="small" :disabled="!periodStart" @click="handleCopyPrevious"
                :loading="copyingPrevious">
                <template #icon>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </template>
                复制上期数据
              </t-button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="resultSummary" class="drawer-card result-card"
        :class="resultSummary.failed > 0 ? 'result-card--error' : 'result-card--success'">
        <div class="card-body">
          <div class="result-summary">
            <span class="result-stat result-stat--success">✅ 成功 {{ resultSummary.succeeded }} 条</span>
            <span v-if="resultSummary.skipped > 0" class="result-stat result-stat--skip">⏭️ 跳过 {{ resultSummary.skipped
            }}
              条</span>
            <span v-if="resultSummary.failed > 0" class="result-stat result-stat--error">❌ 失败 {{ resultSummary.failed }}
              条</span>
          </div>
          <div v-if="failedResults.length > 0" class="result-details">
            <div v-for="r in failedResults" :key="r.index" class="result-detail-item">
              第 {{ r.index + 1 }} 行（{{ r.formulaCode }} / {{ r.salesmanName }}）：{{ r.message }}
            </div>
          </div>
          <div v-if="resultSummary.failed > 0" class="result-hint">
            💡 请修正失败行后重新提交，已成功的记录不受影响
          </div>
          <button class="result-close-btn" @click="resultSummary = null">✕</button>
        </div>
      </div>

      <div class="drawer-card data-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span>销量数据</span>
          <span class="card-header-count">已填写 {{ filledCount }} 行 / 共 {{ tableData.length }} 行</span>
        </div>
        <div class="card-body table-card-body">
          <div v-if="!periodStart" class="table-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p>请先选择统计周期</p>
          </div>
          <div v-else-if="tableData.length === 0" class="table-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <p>暂无配方数据</p>
          </div>
          <t-table v-else :data="tableData" :columns="tableColumns" row-key="formulaId" size="small"
            :max-height="tableMaxHeight" bordered>
            <template #formulaName="{ row }">
              <div class="formula-name-cell">
                <div class="formula-name-row">
                  <span class="formula-name-text">{{ row.formulaName }}</span>
                  <span class="formula-version-tag">{{ row.versionNumber }}</span>
                </div>
                <span class="formula-id-text">#{{ row.formulaId.slice(0, 8) }}</span>
              </div>
            </template>
            <template #salesmanId="{ row }">
              <span class="salesman-name-text">{{ row.salesmanName || '--' }}</span>
            </template>
            <template #quantity="{ row }">
              <div class="editable-cell"
                :class="{ 'from-previous': row.fromPreviousPeriod, 'has-error': row.validationError && !row.quantity && row.quantity !== 0 }">
                <t-input-number v-model="row.quantity" :min="0" :decimal-places="0" placeholder="输入销量" size="small"
                  theme="normal"
                  :format="(val: number) => val != null && val !== '' ? Number(val).toLocaleString('en-US') : ''" />
              </div>
            </template>
            <template #revenue="{ row }">
              <div class="editable-cell"
                :class="{ 'from-previous': row.fromPreviousPeriod, 'has-error': row.validationError && !row.revenue && row.revenue !== 0 }">
                <t-input-number v-model="row.revenue" :min="0" :decimal-places="2" placeholder="输入金额" size="small"
                  theme="normal"
                  :format="(val: number) => val != null && val !== '' ? Number(val).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : ''" />
              </div>
            </template>
            <template #notes="{ row }">
              <t-input v-model="row.notes" placeholder="备注" size="small" />
            </template>
          </t-table>
        </div>
      </div>

      <div class="drawer-footer">
        <div class="footer-left">
          <span class="merge-label">合并策略:</span>
          <t-select v-model="mergeMode" size="small" style="width: 100px" @change="handleMergeModeChange">
            <t-option value="accumulate" label="累加" />
            <t-option value="replace" label="覆盖" />
          </t-select>
          <span class="merge-hint">
            <template v-if="mergeMode === 'accumulate'">⚠️ 已有记录将按「累加」方式合并</template>
            <template v-else>⚠️ 已有记录将被新数据覆盖</template>
          </span>
        </div>
      </div>
    </div>
  </t-drawer>

  <t-dialog v-model:visible="closeConfirmVisible" header="确认关闭？" :footer="false" width="400px" placement="center">
    <div class="close-confirm-body">
      <p>当前已填写的数据尚未提交，关闭后数据将丢失。</p>
      <div class="close-confirm-actions">
        <t-button variant="outline" @click="closeConfirmVisible = false">继续编辑</t-button>
        <t-button theme="danger" @click="forceClose">确认关闭</t-button>
      </div>
    </div>
  </t-dialog>

  <t-dialog v-model:visible="mergeModeConfirmVisible" header="确认切换合并策略？" :footer="false" width="400px"
    placement="center">
    <div class="close-confirm-body">
      <p>覆盖模式将替换已有记录数据，确认切换？</p>
      <div class="close-confirm-actions">
        <t-button variant="outline" @click="cancelMergeModeChange">取消</t-button>
        <t-button theme="warning" @click="confirmMergeModeChange">确认切换</t-button>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import { useFormulaStore } from "@/stores/formula"
import { useSalesmanStore } from "@/stores/salesman"
import { useSalesStore } from "@/stores/sales"
import type { BatchCreateRecord, BatchResult, BatchResultItem } from "@/api/sales"

interface BatchTableRow {
  formulaId: string
  formulaName: string
  formulaCode: string
  versionNumber: string
  salesmanId: string
  salesmanName: string
  quantity: number | undefined
  revenue: number | undefined
  notes: string
  fromPreviousPeriod: boolean
  validationError: string | null
  submitted: boolean
}

const props = defineProps<{
  visible: boolean
  defaultSalesmanId?: string
  defaultPeriodType?: string
  defaultPeriodStart?: string
}>()

const emit = defineEmits<{
  (e: "update:visible", val: boolean): void
  (e: "success"): void
}>()

const formulaStore = useFormulaStore()
const salesmanStore = useSalesmanStore()
const salesStore = useSalesStore()

const periodType = ref<"monthly" | "quarterly" | "yearly">("monthly")
const periodStart = ref("")
const filterSalesmanId = ref<string>("")
const mergeMode = ref<"accumulate" | "replace">("accumulate")
const tableData = ref<BatchTableRow[]>([])
const submitting = ref(false)
const copyingPrevious = ref(false)
const resultSummary = ref<BatchResult | null>(null)
const closeConfirmVisible = ref(false)
const mergeModeConfirmVisible = ref(false)
const previousMergeMode = ref<"accumulate" | "replace">("accumulate")

const tableMaxHeight = computed(() => `calc(100vh - 380px)`)

const activeSalesmen = computed(() =>
  (salesmanStore.allSalesmen || []).filter((s) => s.status === "active")
)

const filledCount = computed(() =>
  tableData.value.filter(
    (r) => (r.quantity !== undefined && r.quantity > 0) || (r.revenue !== undefined && r.revenue > 0)
  ).length
)

const failedResults = computed(() =>
  resultSummary.value?.results.filter((r) => r.status === "failed") || []
)

const tableColumns = [
  { colKey: "formulaName", title: "配方名称", width: "auto", cell: "formulaName" },
  { colKey: "salesmanId", title: "业务员", width: 100, cell: "salesmanId" },
  { colKey: "quantity", title: "销量(件)", width: 110, cell: "quantity" },
  { colKey: "revenue", title: "金额(万元)", width: 110, cell: "revenue" },
  { colKey: "notes", title: "备注", width: "auto", cell: "notes" },
]

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      await ensureDataLoaded()
      periodType.value = (props.defaultPeriodType as "monthly" | "quarterly" | "yearly") || "monthly"
      const now = new Date()
      const defaultPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
      periodStart.value = props.defaultPeriodStart || defaultPeriod
      filterSalesmanId.value = props.defaultSalesmanId || ""
      mergeMode.value = "accumulate"
      resultSummary.value = null
      if (periodStart.value) {
        loadFormulaTable()
      }
    }
  }
)

const ensureDataLoaded = async () => {
  await formulaStore.fetchFormulas()
  await salesmanStore.fetchAllForSelect()
}

const loadFormulaTable = () => {
  let formulas = formulaStore.formulas || []
  if (filterSalesmanId.value) {
    formulas = formulas.filter((f) => f.salesmanId === filterSalesmanId.value)
  }
  const allSalesmanList = salesmanStore.allSalesmen || []
  const allSalesmanIds = new Set(allSalesmanList.map((s) => s.id))
  const salesmanNameMap = new Map(allSalesmanList.map((s) => [s.id, s.name]))
  const salesmanByNameMap = new Map(allSalesmanList.map((s) => [s.name, s.id]))
  tableData.value = formulas.map((f) => {
    const hasValidSalesman = f.salesmanId && allSalesmanIds.has(f.salesmanId)
    let resolvedSalesmanId = ""
    let salesmanName = ""
    if (hasValidSalesman) {
      resolvedSalesmanId = f.salesmanId
      salesmanName = salesmanNameMap.get(f.salesmanId) || f.salesmanName || ""
    } else if (f.salesmanName && salesmanByNameMap.has(f.salesmanName)) {
      resolvedSalesmanId = salesmanByNameMap.get(f.salesmanName)!
      salesmanName = f.salesmanName
    } else if (f.salesmanId && f.salesmanName) {
      resolvedSalesmanId = f.salesmanId
      salesmanName = f.salesmanName + "(已离职)"
    } else {
      salesmanName = f.salesmanName || ""
    }
    return {
      formulaId: f.id,
      formulaName: f.name,
      formulaCode: f.code || "",
      versionNumber: f.currentVersionNumber || "v1.0",
      salesmanId: resolvedSalesmanId,
      salesmanName,
      quantity: undefined,
      revenue: undefined,
      notes: "财务统计",
      fromPreviousPeriod: false,
      validationError: null,
      submitted: false,
    }
  })
  applyNoteTabindex()
}

const applyNoteTabindex = () => {
  nextTick(() => {
    const tableEl = document.querySelector(".sales-batch-drawer .t-table")
    if (!tableEl) return
    const noteCells = tableEl.querySelectorAll('td:last-child .t-input input')
    noteCells.forEach((input) => {
      ; (input as HTMLInputElement).setAttribute("tabindex", "-1")
    })
  })
}

const handlePeriodTypeChange = () => {
  if (periodStart.value) {
    loadFormulaTable()
  }
}

const handlePeriodChange = () => {
  resultSummary.value = null
  if (periodStart.value) {
    loadFormulaTable()
  } else {
    tableData.value = []
  }
}

const handleSalesmanFilterChange = () => {
  resultSummary.value = null
  if (periodStart.value) {
    loadFormulaTable()
  }
}

const handleCopyPrevious = async () => {
  if (!periodStart.value) return

  const prevPeriod = calcPreviousPeriod(periodStart.value, periodType.value)
  if (!prevPeriod) {
    MessagePlugin.warning("无法计算上期周期")
    return
  }

  copyingPrevious.value = true
  try {
    const res = await salesStore.fetchSales({
      periodStart: prevPeriod + "-01",
      periodEnd: prevPeriod + "-31",
      pageSize: 200,
    })
    const previousRecords = salesStore.sales

    if (!previousRecords || previousRecords.length === 0) {
      MessagePlugin.info("上期无销量数据可复制")
      return
    }

    let filledCount = 0
    let skippedCount = 0

    for (const record of previousRecords) {
      const row = tableData.value.find(
        (r) => r.formulaId === record.formulaId && r.salesmanId === record.salesmanId
      )
      if (!row) continue

      const hasUserInput =
        (row.quantity !== undefined && row.quantity > 0) ||
        (row.revenue !== undefined && row.revenue > 0)

      if (hasUserInput) {
        skippedCount++
        continue
      }

      row.quantity = record.quantity
      row.revenue = Math.round((record.revenue || 0) / 10000 * 100) / 100
      row.fromPreviousPeriod = true
      filledCount++
    }

    MessagePlugin.success(
      `已复制 ${filledCount} 条上期数据${skippedCount > 0 ? `，${skippedCount} 条已有数据未覆盖` : ""}`
    )
  } catch (error: unknown) {
    MessagePlugin.error("获取上期数据失败")
  } finally {
    copyingPrevious.value = false
  }
}

const calcPreviousPeriod = (current: string, type: string): string | null => {
  const [yearStr, monthStr] = current.split("-")
  const year = parseInt(yearStr)
  const month = parseInt(monthStr)

  if (type === "monthly") {
    if (month === 1) return `${year - 1}-12`
    return `${year}-${String(month - 1).padStart(2, "0")}`
  } else if (type === "quarterly") {
    const currentQ = Math.ceil(month / 3)
    if (currentQ === 1) return `${year - 1}-10`
    const prevQStart = (currentQ - 1) * 3 - 2
    return `${year}-${String(prevQStart).padStart(2, "0")}`
  } else {
    return `${year - 1}-01`
  }
}

const validateTableData = (): string[] => {
  const errors: string[] = []
  for (let i = 0; i < tableData.value.length; i++) {
    const row = tableData.value[i]
    const hasInput =
      (row.quantity !== undefined && row.quantity > 0) ||
      (row.revenue !== undefined && row.revenue > 0)

    if (!hasInput) continue

    row.validationError = null

    if (!row.salesmanId) {
      row.validationError = "配方未关联业务员"
      errors.push(`第 ${i + 1} 行：配方「${row.formulaName}」未关联业务员`)
    }

    if (row.quantity !== undefined && row.quantity < 0) {
      row.validationError = "销量必须为非负整数"
      errors.push(`第 ${i + 1} 行：销量必须为非负整数`)
    }

    if (row.revenue !== undefined && row.revenue < 0) {
      row.validationError = "金额必须为非负数"
      errors.push(`第 ${i + 1} 行：金额必须为非负数`)
    }
  }

  const filledRows = tableData.value.filter(
    (r) => (r.quantity !== undefined && r.quantity > 0) || (r.revenue !== undefined && r.revenue > 0)
  )
  const keyMap = new Map<string, number[]>()
  for (let i = 0; i < tableData.value.length; i++) {
    const row = tableData.value[i]
    const hasInput =
      (row.quantity !== undefined && row.quantity > 0) ||
      (row.revenue !== undefined && row.revenue > 0)
    if (!hasInput || !row.salesmanId) continue

    const key = `${row.formulaId}_${row.salesmanId}_${periodType.value}_${periodStart.value}`
    if (!keyMap.has(key)) keyMap.set(key, [])
    keyMap.get(key)!.push(i)
  }
  for (const [, indices] of keyMap) {
    if (indices.length > 1) {
      errors.push(`第 ${indices.map((i) => i + 1).join("、")} 行数据重复`)
    }
  }

  return errors
}

const handleSubmit = async () => {
  const errors = validateTableData()
  if (errors.length > 0) {
    MessagePlugin.error(errors[0])
    return
  }

  const records: BatchCreateRecord[] = []
  for (const row of tableData.value) {
    if (row.submitted) continue

    const hasInput =
      (row.quantity !== undefined && row.quantity > 0) ||
      (row.revenue !== undefined && row.revenue > 0)
    if (!hasInput) continue

    records.push({
      formulaId: row.formulaId,
      salesmanId: row.salesmanId,
      periodType: periodType.value,
      periodStart: periodStart.value + "-01",
      quantity: row.quantity || 0,
      revenue: Math.round((row.revenue || 0) * 10000 * 100) / 100,
      notes: row.notes || undefined,
    })
  }

  if (records.length === 0) {
    MessagePlugin.warning("没有可提交的数据")
    return
  }

  submitting.value = true
  try {
    const result = await salesStore.batchCreateSales(records, mergeMode.value)
    if (result.success) {
      const data = result.data
      if (data.failed === 0) {
        MessagePlugin.success(`批量录入成功，共 ${data.succeeded} 条`)
        emit("success")
        emit("update:visible", false)
      } else {
        resultSummary.value = data
        for (const r of data.results) {
          if (r.status === "success" || r.status === "merged") {
            if (tableData.value[r.index]) {
              tableData.value[r.index].submitted = true
            }
          }
        }
      }
    }
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  const hasUnsubmittedData = tableData.value.some(
    (r) =>
      !r.submitted &&
      ((r.quantity !== undefined && r.quantity > 0) || (r.revenue !== undefined && r.revenue > 0))
  )
  if (hasUnsubmittedData) {
    closeConfirmVisible.value = true
  } else {
    emit("update:visible", false)
  }
}

const forceClose = () => {
  closeConfirmVisible.value = false
  emit("update:visible", false)
}

const handleMergeModeChange = (val: unknown) => {
  const newMode = val as "accumulate" | "replace"
  if (newMode === "replace") {
    previousMergeMode.value = mergeMode.value
    mergeModeConfirmVisible.value = true
  }
}

const cancelMergeModeChange = () => {
  mergeMode.value = previousMergeMode.value
  mergeModeConfirmVisible.value = false
}

const confirmMergeModeChange = () => {
  mergeModeConfirmVisible.value = false
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.sales-batch-drawer {
  :deep(.t-drawer__body) {
    padding: 0;
    overflow: hidden;
  }

  :deep(.t-drawer__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
  }
}

.batch-drawer-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px;
  overflow: hidden;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .header-title {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .confirm-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: 8px var(--space-4-5);
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      &.cancel-btn {
        background: #fff;
        color: var(--color-text-secondary);
        border: 1px solid var(--color-border);

        &:hover {
          color: var(--color-text-primary);
          border-color: var(--color-text-secondary);
        }
      }

      &.create-btn {
        background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
        color: #fff;
        box-shadow: 0 2px 8px var(--overlay-brand-25, rgba(0, 0, 0, 0.2));

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px var(--overlay-brand-35, rgba(0, 0, 0, 0.3));
        }
      }

      &:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }

      &.loading {
        opacity: 0.85;
      }
    }
  }
}

.drawer-card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) 16px;
    background: var(--color-bg-page);
    border-bottom: 1px solid var(--color-border);
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);

    .card-header-count {
      margin-left: auto;
      font-weight: 400;
      font-size: 12px;
      color: var(--color-text-placeholder);
    }
  }

  .card-body {
    padding: var(--space-3) 16px;
  }
}

.period-card {
  border-left: 3px solid var(--color-warning);
}

.data-card {
  border-left: 3px solid var(--color-primary);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  .card-body {
    flex: 1;
    overflow: auto;
    padding: 0;
  }
}

.result-card {
  border-left: 3px solid var(--color-primary);

  &--error {
    border-left-color: var(--color-danger);
    background: #FEF2F2;
    border-color: #FECACA;
  }

  &--success {
    border-left-color: #10B981;
    background: #F0FDF4;
    border-color: #BBF7D0;
  }

  .card-body {
    position: relative;
  }

  .result-close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    color: var(--color-text-placeholder);
    padding: 4px;
  }
}

.result-summary {
  display: flex;
  gap: 16px;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 8px;

  .result-stat--success {
    color: #10B981;
  }

  .result-stat--skip {
    color: #F59E0B;
  }

  .result-stat--error {
    color: var(--color-danger);
  }
}

.result-details {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-secondary);

  .result-detail-item {
    padding: 4px 0;
    border-bottom: 1px dashed var(--color-border);
    color: var(--color-danger);
  }
}

.result-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.filter-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;

  .filter-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .filter-label {
      font-size: 12px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }

    &--action {
      margin-left: auto;
    }
  }
}

.table-card-body {
  :deep(.t-table) {
    font-size: 12.5px;
    table-layout: fixed;
  }

  :deep(.t-table__body td) {
    padding: 4px 8px;
  }

  :deep(.t-table__header th) {
    padding: 8px;
    font-size: 12px;
    font-weight: 600;
  }
}

.table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: var(--color-text-placeholder);

  p {
    margin-top: 12px;
    font-size: 13px;
  }
}

.formula-name-cell {
  .formula-name-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .formula-name-text {
    font-weight: 500;
    font-size: 12.5px;
    white-space: nowrap;
  }

  .formula-version-tag {
    display: inline-block;
    padding: 0 4px;
    font-size: 10px;
    font-weight: 500;
    line-height: 16px;
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb, 59, 130, 246), 0.1);
    border-radius: 3px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .formula-id-text {
    display: block;
    margin-top: 1px;
    font-size: 11px;
    color: var(--color-text-placeholder);
    font-family: monospace;
    white-space: nowrap;
  }
}

.salesman-name-text {
  font-size: 12.5px;
  color: var(--color-text-primary);
}

.editable-cell {
  :deep(.t-input-number) {
    width: 100%;
    min-width: 0;
  }

  :deep(.t-input-number .t-input) {
    width: 100%;
    min-width: 0;
  }

  &.from-previous {
    :deep(.t-input-number) {
      background: rgba(59, 130, 246, 0.06);
      border-radius: 4px;
    }
  }

  &.has-error {
    :deep(.t-input-number) {
      border-color: var(--color-danger);
    }
  }
}

.drawer-footer {
  flex-shrink: 0;
  padding: 12px 0 0;
  border-top: 1px solid var(--color-border);
  margin-top: auto;

  .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .merge-label {
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .merge-hint {
      font-size: 12px;
      color: var(--color-text-placeholder);
    }
  }
}

.close-confirm-body {
  p {
    font-size: 14px;
    color: var(--color-text-primary);
    margin-bottom: 20px;
  }

  .close-confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
}
</style>
