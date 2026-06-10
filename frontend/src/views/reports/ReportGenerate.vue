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
            <div class="period-select-row">
              <t-form-item label="选择年份" class="period-field">
                <t-select v-model="selectedYear" :options="yearOptions" value-key="value" />
              </t-form-item>
              <t-form-item label="选择月份" class="period-field">
                <t-select v-model="selectedMonth" :options="monthOptions" value-key="value" />
              </t-form-item>
              <t-form-item v-if="formData.type === 'weekly'" label="选择周次" class="period-field">
                <t-select v-model="selectedWeek" placeholder="请选择周次">
                  <t-option v-for="week in weekOptions" :key="week.value" :value="week.value" :label="week.label" />
                </t-select>
              </t-form-item>
            </div>
            <div class="period-preview">
              <div class="preview-label">日期范围预览</div>
              <div class="preview-value">{{ periodPreview }}</div>
            </div>
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
            <button type="submit" class="action-btn action-btn--submit"
              :disabled="generating || (formData.type === 'weekly' && !selectedWeekInfo)">
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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useReportStore } from '@/stores/report';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import { getWeeksInMonth, getMonthsInYear, getCurrentMonth, getCurrentYear, getYearsRange, type WeekOption } from '@/utils/isoWeekUtils';

const router = useRouter();
const route = useRoute();
const reportStore = useReportStore();

const formRef = ref<FormInstanceFunctions>();
const generating = ref(false);

const currentYear = getCurrentYear();
const currentMonth = getCurrentMonth();

const selectedYear = ref(currentYear);
const selectedMonth = ref(currentMonth);
const selectedWeek = ref<number | null>(null);
const selectedWeekInfo = ref<WeekOption | null>(null);

const yearOptions = computed(() => getYearsRange(2024, currentYear + 1));
const monthOptions = computed(() => getMonthsInYear(selectedYear.value));
const weekOptions = computed<WeekOption[]>(() => {
  if (formData.type !== 'weekly') return [];
  return getWeeksInMonth(selectedYear.value, selectedMonth.value);
});

const formData = reactive({
  type: 'weekly' as 'weekly' | 'monthly',
  periodStart: '',
  periodEnd: '',
  includePlans: true,
  includeAIAnalysis: true,
  includeMaterialWarning: false,
});

const formRules: Record<string, FormRule[]> = {
  type: [{ required: true, message: '请选择报告类型' }],
};

const periodPreview = computed(() => {
  if (formData.type === 'monthly') {
    const monthStr = String(selectedMonth.value).padStart(2, '0');
    const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate();
    return `${selectedYear.value}年${selectedMonth.value}月（${selectedYear.value}-${monthStr}-01 ~ ${selectedYear.value}-${monthStr}-${lastDay}）`;
  }
  if (selectedWeekInfo.value) {
    return `${selectedWeekInfo.value.periodStart} ~ ${selectedWeekInfo.value.periodEnd}`;
  }
  return '请选择周次';
});

function updatePeriodFromSelection() {
  if (formData.type === 'weekly') {
    if (selectedWeekInfo.value) {
      formData.periodStart = selectedWeekInfo.value.periodStart;
      formData.periodEnd = selectedWeekInfo.value.periodEnd;
    } else {
      formData.periodStart = '';
      formData.periodEnd = '';
    }
  } else {
    const monthStr = String(selectedMonth.value).padStart(2, '0');
    const lastDay = new Date(selectedYear.value, selectedMonth.value, 0).getDate();
    const lastDayStr = String(lastDay).padStart(2, '0');
    formData.periodStart = `${selectedYear.value}-${monthStr}-01`;
    formData.periodEnd = `${selectedYear.value}-${monthStr}-${lastDayStr}`;
  }
}

watch(selectedMonth, () => {
  selectedWeek.value = null;
  selectedWeekInfo.value = null;
});

watch(selectedWeek, (val) => {
  if (val !== null) {
    selectedWeekInfo.value = weekOptions.value.find((w) => w.value === val) || null;
  } else {
    selectedWeekInfo.value = null;
  }
});

watch([selectedWeekInfo, selectedYear, selectedMonth], () => {
  updatePeriodFromSelection();
});

const handleTypeChange = (value: 'weekly' | 'monthly') => {
  formData.type = value;
  selectedWeek.value = null;
  selectedWeekInfo.value = null;
  if (value === 'monthly') {
    formData.includeMaterialWarning = true;
  } else {
    formData.includeMaterialWarning = false;
  }
  updatePeriodFromSelection();
};

const handleGenerate = async ({ validateResult }: { validateResult: boolean | Record<string, unknown>[]; }) => {
  if (validateResult !== true) return;
  if (generating.value) return;
  if (formData.type === 'weekly' && !selectedWeekInfo.value) {
    MessagePlugin.warning('请选择周次');
    return;
  }
  if (!formData.periodStart || !formData.periodEnd) {
    MessagePlugin.warning('请完善时间范围');
    return;
  }

  generating.value = true;
  try {
    const result = await reportStore.generateReport({
      type: formData.type,
      periodStart: formData.periodStart,
      periodEnd: formData.periodEnd,
      includePlans: formData.includePlans,
      includeAIAnalysis: formData.includeAIAnalysis,
    });
    if (result) {
      const path = formData.type === 'weekly'
        ? `/reports/weekly/${result.id}`
        : `/reports/monthly/${result.id}`;
      router.push(path);
    }
  } catch (error: unknown) {
    const err = error as { message?: string; };
    MessagePlugin.error(err.message || '生成报告失败，请重试');
  } finally {
    generating.value = false;
  }
};

const handleCancel = () => {
  router.push('/reports');
};

const goBack = () => {
  router.push('/reports');
};

onMounted(() => {
  const queryType = route.query.type as string;
  if (queryType === 'weekly' || queryType === 'monthly') {
    formData.type = queryType;
  }
  if (formData.type === 'monthly') {
    formData.includeMaterialWarning = true;
  }
  updatePeriodFromSelection();
});
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
  background-color: var(--color-bg-container);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border-light);
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
        background-color: var(--color-primary-bg);
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
  background: var(--color-bg-container);
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

.period-select-row {
  display: flex;
  align-items: stretch;
  gap: 16px;

  .period-field {
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
}

.period-preview {
  margin-top: 20px;
  padding: 16px;
  background: var(--color-bg-page);
  border-radius: 12px;

  .preview-label {
    font-size: $font-size-caption;
    color: var(--color-text-placeholder);
    margin-bottom: 8px;
  }

  .preview-value {
    font-size: $font-size-body;
    color: var(--color-text-primary);
    font-weight: $font-weight-semibold;
  }
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
    background-color: var(--color-primary);
    color: var(--color-text-white);
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);

    &:hover:not(:disabled) {
      background-color: var(--color-primary-light);
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
      background-color: var(--color-primary) !important;
      border-color: var(--color-primary) !important;
      color: var(--color-text-white) !important;
    }
  }
}

:deep(.t-select) {
  .t-input {
    background-color: var(--color-bg-page) !important;
    border: 1px solid var(--color-border) !important;
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
      background-color: var(--color-bg-container) !important;
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
