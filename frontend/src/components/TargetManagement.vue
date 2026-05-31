<template>
  <div class="target-management">
    <div class="target-toolbar">
      <t-button theme="primary" size="small" @click="openCreateDialog">
        <template #icon><t-icon name="add" /></template>
        新增目标
      </t-button>
    </div>

    <div v-if="targets.length === 0" class="target-empty">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-border)" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
      <p class="target-empty-text">暂无目标数据，点击上方按钮创建</p>
    </div>

    <div v-else class="target-list">
      <div v-for="target in targets" :key="target.id" class="target-card">
        <div class="target-card-header">
          <div class="target-card-info">
            <t-tag
              :theme="target.periodType === 'quarterly' ? 'primary' : 'warning'"
              variant="light"
              size="small"
            >
              {{ target.periodType === 'quarterly' ? '季度' : '年度' }}
            </t-tag>
            <span class="target-period">{{ formatDate(target.periodStart) }} - {{ formatDate(target.periodEnd) }}</span>
          </div>
          <div class="target-card-actions">
            <t-button variant="text" size="small" @click="openEditDialog(target)">
              <template #icon><t-icon name="edit-1" /></template>
            </t-button>
            <t-button variant="text" size="small" theme="danger" @click="handleDeleteTarget(target.id)">
              <template #icon><t-icon name="delete" /></template>
            </t-button>
          </div>
        </div>
        <div class="target-metrics" v-if="parseTargetsJson(target.targetsJson)?.length">
          <div v-for="(metric, idx) in parseTargetsJson(target.targetsJson)" :key="idx" class="target-metric-item">
            <div class="metric-header">
              <span class="metric-name">{{ metric.name }}</span>
              <span class="metric-rate" :class="{ warning: metric.rate < 60, danger: metric.rate < 30 }">
                {{ metric.rate ?? 0 }}%
              </span>
            </div>
            <div class="metric-progress-bar">
              <div
                class="progress-fill"
                :style="{ width: Math.min(metric.rate ?? 0, 100) + '%' }"
                :class="{ warning: (metric.rate ?? 0) < 60, danger: (metric.rate ?? 0) < 30 }"
              />
            </div>
            <div class="metric-detail">
              目标: {{ metric.target ?? '--' }} | 实际: {{ metric.actual ?? '--' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <t-dialog
      v-model:visible="dialogVisible"
      :header="isEditing ? '编辑目标' : '新增目标'"
      :confirm-btn="{ loading: dialogLoading }"
      @confirm="handleDialogConfirm"
      @close="resetDialogForm"
      width="560px"
    >
      <t-form :data="dialogForm" layout="vertical">
        <t-form-item label="周期类型">
          <t-select v-model="dialogForm.periodType" placeholder="请选择周期类型">
            <t-option value="quarterly" label="季度" />
            <t-option value="yearly" label="年度" />
          </t-select>
        </t-form-item>
        <div class="date-range-row">
          <t-form-item label="开始日期" style="flex: 1;">
            <t-input v-model="dialogForm.periodStart" placeholder="YYYY-MM-DD" />
          </t-form-item>
          <t-form-item label="结束日期" style="flex: 1;">
            <t-input v-model="dialogForm.periodEnd" placeholder="YYYY-MM-DD" />
          </t-form-item>
        </div>
        <t-form-item label="目标指标">
          <div class="dynamic-metrics">
            <div v-for="(metric, idx) in dialogForm.metrics" :key="idx" class="dynamic-metric-row">
              <t-input
                v-model="metric.name"
                placeholder="指标名称"
                style="flex: 1;"
              />
              <t-input
                v-model="metric.target"
                placeholder="目标值"
                style="flex: 1;"
              />
              <t-button
                variant="text"
                theme="danger"
                size="small"
                @click="removeMetric(idx)"
                :disabled="dialogForm.metrics.length <= 1"
              >
                <template #icon><t-icon name="remove" /></template>
              </t-button>
            </div>
            <t-button variant="dashed" block @click="addMetric">
              <template #icon><t-icon name="add" /></template>
              添加指标
            </t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useReportStore } from '@/stores/report'
import { MessagePlugin } from 'tdesign-vue-next'
import type { ReportTarget } from '@/api/report'

const reportStore = useReportStore()

const targets = ref<ReportTarget[]>([])

const dialogVisible = ref(false)
const dialogLoading = ref(false)
const isEditing = ref(false)
const editingTargetId = ref<string | null>(null)

const dialogForm = ref({
  periodType: 'quarterly' as 'quarterly' | 'yearly',
  periodStart: '',
  periodEnd: '',
  metrics: [{ name: '', target: '' }],
})

const parseTargetsJson = (targetsJson: unknown) => {
  if (!targetsJson) return []
  if (typeof targetsJson === 'string') {
    try { return JSON.parse(targetsJson) } catch { return [] }
  }
  return Array.isArray(targetsJson) ? targetsJson : []
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

const loadTargets = async () => {
  const res = await reportStore.fetchTargets()
  targets.value = res || []
}

const openCreateDialog = () => {
  isEditing.value = false
  editingTargetId.value = null
  dialogForm.value = {
    periodType: 'quarterly',
    periodStart: '',
    periodEnd: '',
    metrics: [{ name: '', target: '' }],
  }
  dialogVisible.value = true
}

const openEditDialog = (target: ReportTarget) => {
  isEditing.value = true
  editingTargetId.value = target.id
  const metrics = parseTargetsJson(target.targetsJson)
  dialogForm.value = {
    periodType: target.periodType as 'quarterly' | 'yearly',
    periodStart: target.periodStart,
    periodEnd: target.periodEnd,
    metrics: metrics.length > 0 ? metrics.map((m: Record<string, unknown>) => ({ name: String(m.name || ''), target: String(m.target ?? '') })) : [{ name: '', target: '' }],
  }
  dialogVisible.value = true
}

const addMetric = () => {
  dialogForm.value.metrics.push({ name: '', target: '' })
}

const removeMetric = (idx: number) => {
  if (dialogForm.value.metrics.length > 1) {
    dialogForm.value.metrics.splice(idx, 1)
  }
}

const handleDialogConfirm = async () => {
  if (!dialogForm.value.periodStart || !dialogForm.value.periodEnd) {
    MessagePlugin.warning('请填写日期范围')
    return
  }
  const validMetrics = dialogForm.value.metrics.filter(m => m.name.trim())
  if (validMetrics.length === 0) {
    MessagePlugin.warning('请至少添加一个指标')
    return
  }

  dialogLoading.value = true
  try {
    const targetsJson = validMetrics.map(m => ({
      name: m.name,
      target: m.target,
      actual: 0,
      rate: 0,
    }))

    if (isEditing.value && editingTargetId.value) {
      const { reportApi } = await import('@/api/report')
      await reportApi.updateTarget(editingTargetId.value, {
        periodType: dialogForm.value.periodType,
        periodStart: dialogForm.value.periodStart,
        periodEnd: dialogForm.value.periodEnd,
        targetsJson,
      })
    } else {
      await reportApi_createTarget({
        periodType: dialogForm.value.periodType,
        periodStart: dialogForm.value.periodStart,
        periodEnd: dialogForm.value.periodEnd,
        targetsJson,
      })
    }
    dialogVisible.value = false
    await loadTargets()
  } catch (error: unknown) {
    console.error('保存目标失败:', error)
  } finally {
    dialogLoading.value = false
  }
}

const reportApi_createTarget = async (data: { periodType: string; periodStart: string; periodEnd: string; targetsJson?: unknown }) => {
  const { reportApi } = await import('@/api/report')
  return reportApi.createTarget(data)
}

const handleDeleteTarget = async (id: string) => {
  const { reportApi } = await import('@/api/report')
  try {
    await reportApi.deleteTarget(id)
    MessagePlugin.success('目标已删除')
    await loadTargets()
  } catch (error: unknown) {
    console.error('删除目标失败:', error)
  }
}

const resetDialogForm = () => {
  dialogForm.value = {
    periodType: 'quarterly',
    periodStart: '',
    periodEnd: '',
    metrics: [{ name: '', target: '' }],
  }
}

onMounted(() => {
  loadTargets()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.target-management {
  width: 100%;
}

.target-toolbar {
  margin-bottom: 16px;
}

.target-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0;
}

.target-empty-text {
  font-size: 14px;
  color: var(--color-text-placeholder);
  margin: 0;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.target-card {
  padding: 16px;
  border-radius: 12px;
  background: var(--color-bg-page);
  border: 1px solid var(--color-border-light);
  transition: all $transition-fast;

  &:hover {
    border-color: var(--color-primary-bg);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.06);
  }
}

.target-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.target-card-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.target-period {
  font-size: 13px;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.target-card-actions {
  display: flex;
  gap: 4px;
}

.target-metrics {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.target-metric-item {
  padding: var(--space-2-5) 12px;
  border-radius: 8px;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border-light);

  .metric-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-1-5);
  }

  .metric-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .metric-rate {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-primary);

    &.warning {
      color: var(--color-warning);
    }

    &.danger {
      color: var(--color-danger);
    }
  }

  .metric-progress-bar {
    height: 6px;
    border-radius: var(--radius-xs);
    background: var(--color-border);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    border-radius: var(--radius-xs);
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
    transition: width 0.6s ease;

    &.warning {
      background: linear-gradient(90deg, var(--color-warning), var(--color-warning));
    }

    &.danger {
      background: linear-gradient(90deg, var(--color-danger), var(--color-danger));
    }
  }

  .metric-detail {
    font-size: 12px;
    color: var(--color-text-placeholder);
    margin-top: 4px;
  }
}

.date-range-row {
  display: flex;
  gap: 12px;
}

.dynamic-metrics {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dynamic-metric-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
