<template>
  <t-drawer :visible="visible" :on-close="handleClose" :close-btn="true" size="520px" placement="right"
    class="sales-record-drawer" destroy-on-close>
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
          <span class="header-title">{{ isEdit ? '编辑销量记录' : '录入销量数据' }}</span>
        </div>
        <div class="header-actions">
          <button class="action-btn confirm-btn" :class="{ loading: submitting }" @click="handleConfirm"
            :disabled="submitting">
            <t-loading v-if="submitting" size="12px" />
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 3h6v8l-3 4-3-4V3z" />
            <line x1="12" y1="7" x2="12" y2="3" />
            <line x1="9" y1="15" x2="15" y2="15" />
            <path d="M8 19h8" />
          </svg>
          <span>配方信息</span>
        </div>
        <div class="card-body">
          <div class="form-row two-col">
            <t-form-item label="选择配方" name="formulaId">
              <t-select v-model="formData.formulaId" placeholder="请选择配方" :disabled="!!formulaId" filterable clearable
                @change="handleFormulaChange">
                <t-option v-for="f in formulaOptions" :key="f.id" :value="f.id" :label="f.name" />
              </t-select>
            </t-form-item>
            <t-form-item label="关联业务员">
              <div class="readonly-field">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
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
      </div>

      <div class="drawer-card period-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>备注信息</span>
        </div>
        <div class="card-body">
          <t-form-item label="" name="notes" class="form-item-full">
            <t-textarea v-model="formData.notes" placeholder="可选备注，如促销活动、渠道来源等" :maxlength="200"
              :autosize="{ minRows: 2, maxRows: 4 }" />
          </t-form-item>
        </div>
      </div>

      <div v-if="existingRecords.length > 0" class="drawer-card history-card">
        <div class="card-header warn">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2"
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
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { useFormulaStore } from '@/stores/formula'
import { useSalesmanStore } from '@/stores/salesman'
import { useSalesStore } from '@/stores/sales'
import type { SaleRecord } from '@/api/sales'

const props = defineProps<{
  visible: boolean
  formulaId?: string
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

const isEdit = computed(() => !!props.editRecord)

const formulaOptions = computed(() => formulaStore.formulas || [])

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
        periodStart: props.editRecord.periodStart,
        quantity: props.editRecord.quantity,
        revenue: props.editRecord.revenue,
        notes: props.editRecord.notes || '',
      }
    } else {
      const now = new Date()
      const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      formData.value = {
        formulaId: props.formulaId || '',
        salesmanId: '',
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
    formData.value.salesmanId = ''
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
  } catch (_e) {
    existingRecords.value = []
  }
}

const formatPeriod = (ps: string) => {
  if (!ps) return '--'
  const parts = ps.split('-')
  return `${parts[0]}年${parseInt(parts[1])}月`
}

const getPeriodLabel = (type: string) => ({ monthly: '月度', quarterly: '季度', yearly: '年度' }[type] || type)
const getPeriodTheme = (type: string) => ({ monthly: 'primary', quarterly: 'warning', yearly: 'default' } as any || 'default')

const handleClose = () => emit('update:visible', false)

const handleConfirm = async () => {
  let valid = false
  try {
    valid = await formRef.value?.validate()
  } catch (_e) {
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
    } else {
      await salesStore.createSale({
        formulaId: formData.value.formulaId,
        salesmanId: formData.value.salesmanId,
        periodType: formData.value.periodType,
        periodStart,
        quantity: qty,
        revenue: rev,
        notes: formData.value.notes,
      })
      MessagePlugin.success('销量数据录入成功')
    }
    emit('success')
    handleClose()
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
    border-bottom: 1px solid #E2E8F0;
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
      color: #0F172A;
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .action-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 7px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      border: none;

      &.confirm-btn {
        background: linear-gradient(135deg, #10B981, #059669);
        color: #fff;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.35);

        &:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.45);
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
}

.drawer-card {
  background: #fff;
  border: 1px solid #E2E8F0;
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;

  .card-header {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 16px;
    background: #F8FAFC;
    border-bottom: 1px solid #E2E8F0;
    font-size: 13px;
    font-weight: 700;
    color: #334155;

    &.warn {
      background: #FFFBEB;
      color: #D97706;
      border-color: #FDE68A;
    }
  }

  .card-body {
    padding: 14px 16px;
  }
}

.info-card {
  border-left: 3px solid #3B82F6;
}

.period-card {
  border-left: 3px solid #F59E0B;
}

.data-card {
  border-left: 3px solid #10B981;
}

.note-card {
  border-left: 3px solid #94A3B8;
}

.history-card {
  border-left: 3px solid #D97706;
  background: #FFFBEB;
  border-color: #FDE68A;
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
  padding: 9px 12px;
  background: #F8FAFC;
  border-radius: 8px;
  border: 1px dashed #CBD5E1;
  min-height: 36px;
  color: #94A3B8;
  font-size: 13px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  font-size: 12.5px;

  .history-period {
    color: #475569;
    font-weight: 500;
    min-width: 72px;
  }

  .history-qty {
    color: #3B82F6;
    font-weight: 700;

    b {
      font-size: 14px;
    }
  }

  .history-rev {
    color: #059669;
    font-weight: 600;
    margin-left: auto;
  }
}

.history-more {
  font-size: 12px;
  color: #B45309;
  text-align: center;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed #FCD34D;
}
</style>
