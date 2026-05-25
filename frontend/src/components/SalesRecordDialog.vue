<template>
  <t-dialog
    :visible="visible"
    :header="dialogTitle"
    :on-close="handleClose"
    :on-confirm="handleConfirm"
    :confirm-btn="{ content: isEdit ? '更新' : '录入', theme: 'primary', loading: submitting }"
    :cancel-btn="{ content: '取消' }"
    width="520px"
    placement="center"
    class="sales-record-dialog"
    destroy-on-close
  >
    <t-form ref="formRef" :data="formData" :rules="formRules" label-align="top" :on-submit="handleConfirm">
      <div class="form-grid">
        <t-form-item label="配方" name="formulaId">
          <t-select
            v-model="formData.formulaId"
            placeholder="选择配方"
            :disabled="!!formulaId"
            filterable
            clearable
            @change="handleFormulaChange"
          >
            <t-option v-for="f in formulaOptions" :key="f.id" :value="f.id" :label="f.name" />
          </t-select>
        </t-form-item>
        <t-form-item label="业务员" name="salesmanId">
          <t-select
            v-model="formData.salesmanId"
            placeholder="自动关联"
            :disabled="true"
          >
            <t-option v-for="s in salesmanOptions" :key="s.id" :value="s.id" :label="s.name" />
          </t-select>
        </t-form-item>
      </div>
      <div class="form-grid">
        <t-form-item label="统计周期" name="periodStart">
          <t-date-picker
            v-model="formData.periodStart"
            mode="month"
            placeholder="选择月份"
            :disable-date="{ after: new Date() }"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="周期类型" name="periodType">
          <t-radio-group v-model="formData.periodType" variant="default-filled">
            <t-radio-button value="monthly">月度</t-radio-button>
            <t-radio-button value="quarterly">季度</t-radio-button>
            <t-radio-button value="yearly">年度</t-radio-button>
          </t-radio-group>
        </t-form-item>
      </div>
      <div class="form-grid">
        <t-form-item label="销售数量（件）" name="quantity">
          <t-input-number
            v-model="formData.quantity"
            :min="0"
            :decimal-places="0"
            placeholder="输入销售数量"
            theme="normal"
            style="width: 100%"
          />
        </t-form-item>
        <t-form-item label="销售金额（元）" name="revenue">
          <t-input-number
            v-model="formData.revenue"
            :min="0"
            :decimal-places="2"
            placeholder="输入销售金额"
            theme="normal"
            style="width: 100%"
          />
        </t-form-item>
      </div>
      <t-form-item label="备注" name="notes">
        <t-textarea v-model="formData.notes" placeholder="可选备注信息" :maxlength="200" />
      </t-form-item>

      <div v-if="existingRecords.length > 0" class="existing-records">
        <p class="existing-title">该配方已有销量记录：</p>
        <div class="existing-list">
          <div v-for="r in existingRecords.slice(0, 5)" :key="r.id" class="existing-item">
            <span class="existing-period">{{ formatPeriod(r.periodStart) }}</span>
            <span class="existing-qty">{{ r.quantity }} 件</span>
            <span class="existing-rev">¥{{ r.revenue?.toFixed(2) }}</span>
          </div>
          <p v-if="existingRecords.length > 5" class="existing-more">... 共 {{ existingRecords.length }} 条记录</p>
        </div>
      </div>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
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

const dialogTitle = computed(() => isEdit.value ? '编辑销量记录' : '录入销量数据')

const formulaOptions = computed(() => formulaStore.formulas || [])
const salesmanOptions = computed(() => salesmanStore.salesmen || [])

const formData = ref({
  formulaId: '',
  salesmanId: '',
  periodType: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
  periodStart: '',
  quantity: 0,
  revenue: 0,
  notes: '',
})

const formRules = {
  formulaId: [{ required: true, message: '请选择配方' }],
  periodStart: [{ required: true, message: '请选择统计周期' }],
  quantity: [{ required: true, message: '请输入销售数量' }],
}

watch(() => props.visible, async (val) => {
  if (val) {
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
        quantity: 0,
        revenue: 0,
        notes: '',
      }
    }
    if (props.formulaId) {
      await loadExistingRecords(props.formulaId)
    }
  }
})

watch(() => formData.value.formulaId, async (val) => {
  if (val) {
    const formula = formulaStore.formulas.find(f => f.id === val)
    if (formula) {
      formData.value.salesmanId = formula.salesmanId
    }
    await loadExistingRecords(val)
  }
})

const handleFormulaChange = (val: string) => {
  if (!val) {
    formData.value.salesmanId = ''
    existingRecords.value = []
  }
}

const loadExistingRecords = async (formulaId: string) => {
  const records = await salesStore.getSalesByFormula(formulaId)
  existingRecords.value = records as SaleRecord[] || []
}

const formatPeriod = (periodStart: string) => {
  if (!periodStart) return ''
  const [y, m] = periodStart.split('-')
  return `${y}年${parseInt(m)}月`
}

const handleClose = () => {
  emit('update:visible', false)
}

const handleConfirm = async () => {
  const valid = await formRef.value?.validate()
  if (valid === false) return

  submitting.value = true
  try {
    if (isEdit.value && props.editRecord) {
      await salesStore.updateSale(props.editRecord.id, {
        quantity: formData.value.quantity,
        revenue: formData.value.revenue,
        notes: formData.value.notes,
      })
    } else {
      const periodStart = formData.value.periodStart + '-01'
      await salesStore.createSale({
        formulaId: formData.value.formulaId,
        salesmanId: formData.value.salesmanId,
        periodType: formData.value.periodType,
        periodStart,
        quantity: formData.value.quantity,
        revenue: formData.value.revenue,
        notes: formData.value.notes,
      })
    }
    emit('success')
    handleClose()
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.sales-record-dialog {
  :deep(.t-dialog__body) {
    padding: 16px 24px;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.existing-records {
  margin-top: 12px;
  padding: 12px;
  background: var(--color-bg-page);
  border-radius: 12px;
  border: 1px solid var(--color-border);

  .existing-title {
    font-size: 12px;
    color: var(--color-text-secondary);
    margin-bottom: 8px;
    font-weight: 600;
  }

  .existing-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .existing-item {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    padding: 4px 0;

    .existing-period {
      color: var(--color-text-secondary);
      min-width: 80px;
    }

    .existing-qty {
      color: #3b82f6;
      font-weight: 600;
    }

    .existing-rev {
      color: var(--color-primary);
      font-weight: 600;
    }
  }

  .existing-more {
    font-size: 12px;
    color: var(--color-text-placeholder);
    margin-top: 4px;
  }
}
</style>
