<template>
  <t-drawer :visible="visible" :on-close="handleClose" :close-btn="false" :footer="false" size="520px" placement="right"
    class="sales-record-drawer" destroy-on-close>
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span class="header-title">{{ isEdit ? '编辑销量记录' : '录入销量数据' }}</span>
        </div>
        <div class="header-actions">
          <button class="confirm-btn" :class="[submitting ? 'loading' : '', isEdit ? 'update-btn' : 'create-btn']"
            @click="handleConfirm" :disabled="submitting">
            <t-loading v-if="submitting" size="14px" />
            <svg v-else-if="isEdit" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ isEdit ? '更新' : '确认录入' }}
          </button>
        </div>
      </div>
    </template>

    <t-form ref="formRef" :data="formData" :rules="formRules" label-align="top" @submit.prevent>
      <div class="drawer-card info-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3h6v8l-3 4-3-4V3z" />
            <line x1="12" y1="7" x2="12" y2="3" />
            <line x1="9" y1="15" x2="15" y2="15" />
            <path d="M8 19h8" />
          </svg>
          <span>配方信息</span>
        </div>
        <div class="card-body">
          <t-form-item label="选择配方" name="formulaId">
            <t-select v-model="formData.formulaId" placeholder="请选择配方" :disabled="!!formulaId" filterable clearable
              @change="handleFormulaChange">
              <t-option v-for="f in formulaOptions" :key="f.id" :value="f.id" :label="f.name" />
            </t-select>
          </t-form-item>
          <t-form-item label="关联业务员">
            <div class="readonly-field">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{{ formData.salesmanId ? currentSalesmanName : '选择配方后自动关联' }}</span>
            </div>
          </t-form-item>
        </div>
      </div>

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
          <div class="form-row two-col">
            <t-form-item label="统计月份" name="periodStart">
              <t-date-picker v-model="formData.periodStart" mode="month" placeholder="选择月份"
                :disable-date="{ after: new Date() }" />
            </t-form-item>
            <t-form-item label="周期类型" name="periodType">
              <t-radio-group v-model="formData.periodType" variant="default-filled" size="small">
                <t-radio-button value="monthly">月度</t-radio-button>
                <t-radio-button value="quarterly">季度</t-radio-button>
                <t-radio-button value="yearly">年度</t-radio-button>
              </t-radio-group>
            </t-form-item>
          </div>
        </div>
      </div>

      <div class="drawer-card data-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span>销售数据</span>
        </div>
        <div class="card-body">
          <div class="form-row two-col">
            <t-form-item label="销售数量（件）" name="quantity">
              <t-input-number v-model="formData.quantity" :min="0" :decimal-places="0" placeholder="输入数量"
                theme="normal" />
            </t-form-item>
            <t-form-item label="销售金额（万元）" name="revenue">
              <t-input-number v-model="formData.revenue" :min="0" :decimal-places="2" placeholder="输入金额"
                theme="normal" />
            </t-form-item>
          </div>
        </div>
      </div>

      <div class="drawer-card note-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>备注信息</span>
        </div>
        <div class="card-body">
          <t-form-item label="" name="notes" class="form-item-full">
            <t-textarea v-model="formData.notes" placeholder="数据来自财务统计" :maxlength="200"
              :autosize="{ minRows: 4, maxRows: 8 }" />
          </t-form-item>
        </div>
      </div>

      <div v-if="existingRecords.length > 0" class="drawer-card history-card">
        <div class="card-header warn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>已有记录 ({{ existingRecords.length }})</span>
        </div>
        <div class="card-body">
          <div class="history-list">
            <div v-for="r in existingRecords.slice(0, 5)" :key="r.id" class="history-item">
              <span class="history-period">{{ formatPeriod(r.periodStart) }}</span>
              <t-tag :theme="getPeriodTheme(r.periodType)" variant="light" size="small">{{ getPeriodLabel(r.periodType)
                }}</t-tag>
              <span class="history-qty"><b>{{ r.quantity }}</b> 件</span>
              <span class="history-rev">¥{{ r.revenue?.toFixed(2) }}</span>
            </div>
            <p v-if="existingRecords.length > 5" class="history-more">
              还有 {{ existingRecords.length - 5 }} 条记录未显示...
            </p>
          </div>
        </div>
      </div>
    </t-form>
  </t-drawer>

  <t-dialog v-model:visible="mergeDialogVisible" header="检测到已有销量记录" :footer="false" width="440px" placement="center">
    <div class="merge-dialog-body" v-if="duplicateRecord">
      <div class="merge-info">
        <div class="merge-info-row"><span class="merge-label">已有销量</span><span class="merge-value">{{ duplicateRecord.quantity }} 件</span></div>
        <div class="merge-info-row"><span class="merge-label">已有金额</span><span class="merge-value">¥{{ ((duplicateRecord.revenue || 0) / 10000).toFixed(2) }}万</span></div>
        <div class="merge-info-row"><span class="merge-label">本次录入</span><span class="merge-value">{{ formData.quantity || 0 }} 件</span></div>
        <div class="merge-info-row"><span class="merge-label">本次金额</span><span class="merge-value">¥{{ (formData.revenue || 0).toFixed(2) }}万</span></div>
      </div>
      <div class="merge-actions">
        <button class="merge-btn merge-btn--accumulate" @click="handleMerge('accumulate')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          累加合并
          <small>{{ (duplicateRecord.quantity || 0) + (formData.quantity || 0) }} 件 / ¥{{ (((duplicateRecord.revenue || 0) / 10000 + (formData.revenue || 0))).toFixed(2) }}万</small>
        </button>
        <button class="merge-btn merge-btn--replace" @click="handleMerge('replace')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          覆盖更新
          <small>{{ formData.quantity || 0 }} 件 / ¥{{ (formData.revenue || 0).toFixed(2) }}万</small>
        </button>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { useFormulaStore } from '@/stores/formula'
import { useSalesmanStore } from '@/stores/salesman'
import { useSalesStore } from '@/stores/sales'
import type { SaleRecord, DuplicateEntryData } from '@/api/sales'

const props = defineProps<{
  visible: boolean
  formulaId?: string
  salesmanId?: string
  editRecord?: SaleRecord | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'success'): void
}>()

const formulaStore = useFormulaStore()
const salesmanStore = useSalesmanStore()
const salesStore = useSalesStore()

const formRef = ref()
const submitting = ref(false)
const existingRecords = ref<SaleRecord[]>([])
const mergeDialogVisible = ref(false)
const duplicateRecord = ref<DuplicateEntryData | null>(null)

const isEdit = computed(() => !!props.editRecord)

const formulaOptions = computed(() => {
  const all = formulaStore.formulas || []
  if (props.salesmanId) {
    return all.filter(f => f.salesmanId === props.salesmanId)
  }
  return all
})

const currentSalesmanName = computed(() => {
  if (!formData.value.salesmanId) return ''
  const sm = salesmanStore.salesmen.find(s => s.id === formData.value.salesmanId)
  return sm?.name || ''
})

const formData = ref({
  formulaId: '',
  salesmanId: '',
  periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  periodStart: '',
  quantity: undefined as number | undefined,
  revenue: undefined as number | undefined,
  notes: '',
})

const formRules = {
  formulaId: [{ required: true, message: '请选择配方', trigger: 'change' }],
  periodStart: [{ required: true, message: '请选择统计月份', trigger: 'change' }],
  quantity: [{ required: true, message: '请输入销售数量', trigger: 'blur' }],
}

watch(() => props.visible, async (val) => {
  if (val) {
    await ensureDataLoaded()
    if (props.editRecord) {
      formData.value = {
        formulaId: props.editRecord.formulaId,
        salesmanId: props.editRecord.salesmanId,
        periodType: props.editRecord.periodType,
        periodStart: props.editRecord.periodStart?.substring(0, 7),
        quantity: props.editRecord.quantity,
        revenue: Math.round((props.editRecord.revenue || 0) / 10000 * 100) / 100,
        notes: props.editRecord.notes || '',
      }
    } else {
      const now = new Date()
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      formData.value = {
        formulaId: props.formulaId || '',
        salesmanId: props.salesmanId || '',
        periodType: 'monthly',
        periodStart: curMonth,
        quantity: undefined,
        revenue: undefined,
        notes: '',
      }
    }
    if (formData.value.formulaId) {
      await loadExistingRecords(formData.value.formulaId)
    } else {
      existingRecords.value = []
    }
  }
})

watch(() => formData.value.formulaId, async (val) => {
  if (val) {
    const formula = formulaStore.formulas.find(f => f.id === val)
    if (formula && formula.salesmanId) {
      formData.value.salesmanId = formula.salesmanId
    }
    await loadExistingRecords(val)
  } else {
    formData.value.salesmanId = props.salesmanId || ''
    existingRecords.value = []
  }
})

const ensureDataLoaded = async () => {
  if (formulaStore.formulas.length === 0) await formulaStore.fetchFormulas()
  if (salesmanStore.salesmen.length === 0) await salesmanStore.fetchSalesmen()
}

const handleFormulaChange = () => { }

const loadExistingRecords = async (fid: string) => {
  try {
    const records = await salesStore.getSalesByFormula(fid)
    existingRecords.value = records || []
  } catch {
    existingRecords.value = []
  }
}

const formatPeriod = (ps: string) => {
  if (!ps) return '--'
  const parts = ps.split('-')
  return `${parts[0]}年${parseInt(parts[1])}月`
}

const getPeriodLabel = (type: string) => ({ monthly: '月度', quarterly: '季度', yearly: '年度' }[type] || type)
const getPeriodTheme = (type: string) => ({ monthly: 'primary', quarterly: 'warning', yearly: 'default' }[type] || 'default')

const handleClose = () => emit('update:visible', false)

const handleConfirm = async () => {
  let valid = false
  try {
    valid = await formRef.value?.validate()
  } catch {
    valid = false
  }

  if (!valid) return

  submitting.value = true
  try {
    const qty = Number(formData.value.quantity) || 0
    const rev = Math.round((Number(formData.value.revenue) || 0) * 10000 * 100) / 100
    const periodStart = formData.value.periodStart + '-01'

    if (isEdit.value && props.editRecord) {
      await salesStore.updateSale(props.editRecord.id, { quantity: qty, revenue: rev, notes: formData.value.notes })
      MessagePlugin.success('销量记录更新成功')
      emit('success')
      handleClose()
    } else {
      const result = await salesStore.createSale({
        formulaId: formData.value.formulaId,
        salesmanId: formData.value.salesmanId,
        periodType: formData.value.periodType,
        periodStart,
        quantity: qty,
        revenue: rev,
        notes: formData.value.notes,
      })
      if (result.success) {
        emit('success')
        handleClose()
      } else if (result.code === 'DUPLICATE_ENTRY' && result.data) {
        duplicateRecord.value = result.data
        mergeDialogVisible.value = true
      }
    }
  } finally {
    submitting.value = false
  }
}

const handleMerge = async (mode: 'accumulate' | 'replace') => {
  submitting.value = true
  try {
    const qty = Number(formData.value.quantity) || 0
    const rev = Math.round((Number(formData.value.revenue) || 0) * 10000 * 100) / 100
    const result = await salesStore.createSale({
      formulaId: formData.value.formulaId,
      salesmanId: formData.value.salesmanId,
      periodType: formData.value.periodType,
      periodStart: formData.value.periodStart + '-01',
      quantity: qty,
      revenue: rev,
      notes: formData.value.notes,
      mergeMode: mode,
    })
    if (result.success) {
      mergeDialogVisible.value = false
      MessagePlugin.success(mode === 'accumulate' ? '销量数据已累加合并' : '销量数据已覆盖更新')
      emit('success')
      handleClose()
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.sales-record-drawer {
  :deep(.t-drawer__body) {
    padding: 20px;
    overflow-y: auto;
  }

  :deep(.t-drawer__header) {
    padding: 16px 20px;
    border-bottom: 1px solid var(--color-border);
  }
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
      color: var(--color-text-primary);
    }
  }

  .header-actions {
    display: flex;
    align-items: center;

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

      &.create-btn {
        background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
        color: var(--color-text-white);
        box-shadow: 0 2px 8px var(--overlay-brand-25, rgba(0, 0, 0, 0.2));

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px var(--overlay-brand-35, rgba(0, 0, 0, 0.3));
        }
      }

      &.update-btn {
        background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
        color: var(--color-text-white);
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
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 16px;
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

    &.warn {
      background: var(--color-warning-bg);
      color: var(--color-warning);
      border-color: var(--color-warning);
    }
  }

  .card-body {
    padding: var(--space-3-5) 16px;
  }
}

.info-card {
  border-left: 3px solid var(--color-info);
}

.period-card {
  border-left: 3px solid var(--color-warning);
}

.data-card {
  border-left: 3px solid var(--color-primary);
}

.note-card {
  border-left: 3px solid var(--color-text-placeholder);
}

.history-card {
  border-left: 3px solid var(--color-warning);
  background: var(--color-warning-bg);
  border-color: var(--color-warning);
}

.form-row {
  margin-bottom: 0;

  &.two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 12px;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.form-item-full {
  :deep(.t-form__item) {
    margin-bottom: 0;
  }
}

.readonly-field {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: var(--space-2) 12px;
  background: var(--color-bg-page);
  border-radius: 8px;
  border: 1px dashed var(--color-text-placeholder);
  min-height: 36px;
  color: var(--color-text-placeholder);
  font-size: 13px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
}

.history-item {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  padding: var(--space-2) var(--space-2-5);
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  font-size: 12.5px;

  .history-period {
    color: var(--color-text-secondary);
    font-weight: 500;
    min-width: 72px;
  }

  .history-qty {
    color: var(--color-info);
    font-weight: 700;

    b {
      font-size: 14px;
    }
  }

  .history-rev {
    color: var(--color-primary-dark);
    font-weight: 600;
    margin-left: auto;
  }
}

.history-more {
  font-size: 12px;
  color: var(--color-warning-dark);
  text-align: center;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed var(--color-warning);
}

.merge-dialog-body {
  .merge-info {
    margin-bottom: 20px;
    padding: 16px;
    background: var(--color-bg-page);
    border-radius: 12px;
  }
  .merge-info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
  }
  .merge-label {
    color: var(--color-text-secondary);
  }
  .merge-value {
    font-weight: 600;
    color: var(--color-text-primary);
  }
  .merge-actions {
    display: flex;
    gap: 12px;
  }
  .merge-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 16px 12px;
    border-radius: 12px;
    border: 2px solid var(--color-border);
    background: var(--color-bg-container);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--color-text-primary);
    small {
      font-size: 12px;
      font-weight: 400;
      color: var(--color-text-placeholder);
    }
    &--accumulate {
      &:hover {
        border-color: var(--color-primary);
        background: var(--color-success-bg);
        color: var(--color-primary-dark);
      }
    }
    &--replace {
      &:hover {
        border-color: var(--color-info);
        background: var(--color-info-bg);
        color: var(--color-info);
      }
    }
  }
}
</style>
