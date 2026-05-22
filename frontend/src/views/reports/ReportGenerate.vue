<template>
  <div class="report-generate">
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="goBack" title="返回报告列表">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="goBack">报告中心</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">生成报告</span>
          </nav>
          <h2 class="detail-title">生成报告</h2>
        </div>
      </div>
    </header>

    <main class="form-main">
      <div class="form-card">
        <t-form ref="formRef" :data="formData" :rules="formRules" label-align="top" @submit="handleGenerate">
          <div class="form-section">
            <h3 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              报告类型
            </h3>
            <t-form-item name="type">
              <t-radio-group v-model="formData.type" variant="default-filled" size="small" @change="handleTypeChange">
                <t-radio-button value="weekly">周报</t-radio-button>
                <t-radio-button value="monthly">月报</t-radio-button>
              </t-radio-group>
            </t-form-item>
          </div>

          <div class="form-section">
            <h3 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              时间范围
            </h3>
            <div class="date-range-row">
              <t-form-item label="开始日期" name="periodStart" class="date-field">
                <t-date-picker
                  v-model="formData.periodStart"
                  mode="date"
                  placeholder="选择开始日期"
                  clearable
                  style="width: 100%"
                />
              </t-form-item>
              <span class="date-separator">至</span>
              <t-form-item label="结束日期" name="periodEnd" class="date-field">
                <t-date-picker
                  v-model="formData.periodEnd"
                  mode="date"
                  placeholder="选择结束日期"
                  clearable
                  style="width: 100%"
                />
              </t-form-item>
            </div>
            <p class="date-hint">
              {{ formData.type === 'weekly' ? '选择周报范围，系统将自动计算该周的起止日期' : '选择月报范围，系统将自动计算该月的起止日期' }}
            </p>
          </div>

          <div class="form-section">
            <h3 class="section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              配置选项
            </h3>
            <div class="checkbox-group">
              <t-checkbox v-model="formData.includePlans">包含未来规划</t-checkbox>
              <t-checkbox v-model="formData.includeAIAnalysis">AI 智能分析</t-checkbox>
              <t-checkbox v-model="formData.includeMaterialWarning">包含原料预警</t-checkbox>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="action-btn action-btn--cancel" @click="handleCancel">
              取消
            </button>
            <button type="submit" class="action-btn action-btn--submit" :disabled="generating">
              <svg v-if="generating" class="spin-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              {{ generating ? '生成中...' : '确认生成' }}
            </button>
          </div>
        </t-form>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useReportStore } from '@/stores/report'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const reportStore = useReportStore()

const formRef = ref<FormInstanceFunctions>()
const generating = ref(false)

const formData = reactive({
  type: 'weekly' as 'weekly' | 'monthly',
  periodStart: '',
  periodEnd: '',
  includePlans: true,
  includeAIAnalysis: true,
  includeMaterialWarning: false,
})

const formRules: Record<string, FormRule[]> = {
  type: [{ required: true, message: '请选择报告类型' }],
  periodStart: [{ required: true, message: '请选择开始日期' }],
  periodEnd: [{ required: true, message: '请选择结束日期' }],
}

const getWeekRange = (date: Date) => {
  const day = date.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setDate(date.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { start: monday, end: sunday }
}

const getMonthRange = (date: Date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  start.setHours(0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

const formatDateStr = (date: Date) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const autoFillDates = (type: 'weekly' | 'monthly') => {
  const now = new Date()
  if (type === 'weekly') {
    const { start, end } = getWeekRange(now)
    formData.periodStart = formatDateStr(start)
    formData.periodEnd = formatDateStr(end)
    formData.includeMaterialWarning = false
  } else {
    const { start, end } = getMonthRange(now)
    formData.periodStart = formatDateStr(start)
    formData.periodEnd = formatDateStr(end)
    formData.includeMaterialWarning = true
  }
}

const handleTypeChange = (value: 'weekly' | 'monthly') => {
  autoFillDates(value)
}

const handleGenerate = async ({ validateResult }: any) => {
  if (validateResult !== true) return
  if (generating.value) return

  generating.value = true
  try {
    const result = await reportStore.generateReport({
      type: formData.type,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd,
      includePlans: formData.includePlans,
      includeAIAnalysis: formData.includeAIAnalysis,
    })
    if (result) {
      const path = formData.type === 'weekly'
        ? `/reports/weekly/${result.id}`
        : `/reports/monthly/${result.id}`
      router.push(path)
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '生成报告失败，请重试')
  } finally {
    generating.value = false
  }
}

const handleCancel = () => {
  router.push('/reports')
}

const goBack = () => {
  router.push('/reports')
}

onMounted(() => {
  const queryType = route.query.type as string
  if (queryType === 'weekly' || queryType === 'monthly') {
    formData.type = queryType
  }
  autoFillDates(formData.type)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.report-generate {
  padding: 0;
  padding-bottom: 32px;
  animation: page-fade-in 0.4s ease;
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.detail-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: -32px;
  margin-right: -32px;
  padding: 16px 32px;
  background-color: rgba(255, 255, 255, 0.80);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #f1f5f9;
  animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 12px;
      background: transparent;
      color: var(--color-text-placeholder);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 20px;

      &:hover {
        color: var(--color-primary);
        background-color: #ecfdf5;
      }
    }

    .header-title-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1-5);

      .header-breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 12px;
        line-height: 1;

        .breadcrumb-link {
          color: var(--color-text-placeholder);
          cursor: pointer;
          transition: color 0.15s;
          text-decoration: none;

          &:hover {
            color: var(--color-primary);
          }
        }

        .breadcrumb-sep {
          font-size: 12px;
          color: var(--color-text-placeholder);
        }

        .breadcrumb-current {
          color: var(--color-text-secondary);
        }
      }

      .detail-title {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
        line-height: 1.35;
      }
    }
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-main {
  margin-top: 24px;
  animation: fadeInUp 0.5s ease-out forwards;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-card {
  background: #fff;
  border-radius: var(--radius-4xl);
  padding: 32px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid var(--color-bg-page);
}

.form-section {
  margin-bottom: 32px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--color-bg-page);

  &:last-of-type {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
  }

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: $font-size-body;
    font-weight: $font-weight-bold;
    color: var(--color-text-placeholder);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin: 0 0 20px;

    svg {
      flex-shrink: 0;
    }
  }
}

.date-range-row {
  display: flex;
  align-items: stretch;
  gap: 16px;

  .date-field {
    flex: 1;

    :deep(.t-form__item) {
      margin-bottom: 0;
    }

    :deep(.t-form__label) {
      margin-bottom: var(--space-1-5);
      min-height: 22px;
      display: flex;
      align-items: center;
    }
  }

  .date-separator {
    font-size: $font-size-body;
    color: var(--color-text-placeholder);
    font-weight: $font-weight-medium;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
  }
}

.date-hint {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
  margin: 8px 0 0;
  letter-spacing: $ls-caption;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 16px;

  :deep(.t-checkbox) {
    font-size: $font-size-body;
    color: var(--color-text-primary);

    .t-checkbox__label {
      font-size: $font-size-body;
    }
  }
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--color-bg-page);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-1-5);
  padding: var(--space-2-5) 24px;
  border-radius: 12px;
  font-size: $font-size-body;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: all $transition-normal;
  border: none;
  letter-spacing: $ls-body;

  &--cancel {
    background-color: #F1F5F9;
    color: var(--color-text-secondary);

    &:hover {
      background-color: var(--color-border);
      color: var(--color-text-secondary);
    }
  }

  &--submit {
    background-color: var(--color-text-primary);
    color: #fff;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);

    &:hover:not(:disabled) {
      background-color: var(--color-text-primary);
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  }
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

:deep(.t-radio-group) {
  .t-radio-button {
    border-radius: 10px !important;

    &.t-is-checked {
      background-color: var(--color-text-primary) !important;
      border-color: var(--color-text-primary) !important;
      color: #fff !important;
    }
  }
}

:deep(.t-date-picker) {
  .t-input {
    background-color: var(--color-bg-page) !important;
    border: 1px solid #F1F5F9 !important;
    border-radius: 12px !important;
    padding: var(--space-2-5) 16px !important;
    min-height: 44px;
    font-size: $font-size-body !important;
    color: var(--color-text-primary) !important;
    transition: all $transition-fast;

    &:hover:not(.t-is-disabled) {
      border-color: var(--color-border) !important;
    }

    &.t-is-focused {
      background-color: #fff !important;
      border-color: transparent !important;
      box-shadow: 0 0 0 2px var(--color-primary) !important;
      outline: none !important;
    }

    &::placeholder {
      color: var(--color-text-placeholder) !important;
    }
  }

  .t-input__wrap {
    border: none !important;
    box-shadow: none !important;
    background: transparent !important;
  }
}

:deep(.t-form__label) {
  font-size: $font-size-body;
  font-weight: $font-weight-bold;
  color: var(--color-text-primary);
}
</style>
