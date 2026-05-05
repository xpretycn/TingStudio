<template>
  <div class="ai-analysis-panel">
    <div class="report-section-card" :style="{ borderLeftColor: '#8B5CF6' }">
      <div class="section-header">
        <div class="section-title-group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
            <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
            <path d="M8.56 13.68C5.94 14.93 4 17.26 4 20h16c0-2.74-1.94-5.07-4.56-6.32" />
          </svg>
          <h3 class="section-title">AI 智能分析</h3>
        </div>
        <t-button
          v-if="!analysisResult && !reportStore.aiAnalysisLoading"
          theme="primary"
          size="small"
          @click="fetchAnalysis"
        >
          <template #icon><t-icon name="lightbulb" /></template>
          获取 AI 分析
        </t-button>
      </div>
      <div class="section-body">
        <div v-if="reportStore.aiAnalysisLoading" class="ai-loading">
          <div class="ai-loading-skeleton">
            <div class="skeleton-line long" />
            <div class="skeleton-line medium" />
            <div class="skeleton-line long" />
            <div class="skeleton-line short" />
          </div>
          <p class="ai-loading-text">AI 正在分析报告数据...</p>
        </div>

        <template v-else-if="analysisResult">
          <div class="ai-analysis-content">
            <div class="analysis-section" v-if="analysisResult.summary">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span class="analysis-section-title">综合分析</span>
              </div>
              <p class="analysis-section-text">{{ analysisResult.summary }}</p>
            </div>

            <div class="analysis-section" v-if="analysisResult.suggestions?.length">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span class="analysis-section-title">优化建议</span>
              </div>
              <ul class="analysis-list">
                <li v-for="(suggestion, idx) in analysisResult.suggestions" :key="idx" class="analysis-list-item">
                  <span class="list-index">{{ idx + 1 }}</span>
                  <span>{{ suggestion }}</span>
                </li>
              </ul>
            </div>

            <div class="analysis-section" v-if="analysisResult.risks?.length">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span class="analysis-section-title">风险提示</span>
              </div>
              <ul class="analysis-list risk-list">
                <li v-for="(risk, idx) in analysisResult.risks" :key="idx" class="analysis-list-item">
                  <span class="list-index risk">{{ idx + 1 }}</span>
                  <span>{{ risk }}</span>
                </li>
              </ul>
            </div>

            <div class="analysis-section" v-if="analysisResult.improvements?.length">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <span class="analysis-section-title">改进方向</span>
              </div>
              <ul class="analysis-list">
                <li v-for="(improvement, idx) in analysisResult.improvements" :key="idx" class="analysis-list-item">
                  <span class="list-index improve">{{ idx + 1 }}</span>
                  <span>{{ improvement }}</span>
                </li>
              </ul>
            </div>
          </div>
        </template>

        <div v-else class="ai-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
            <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
            <path d="M8.56 13.68C5.94 14.93 4 17.26 4 20h16c0-2.74-1.94-5.07-4.56-6.32" />
          </svg>
          <p class="ai-empty-text">点击上方按钮获取 AI 智能分析建议</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useReportStore } from '@/stores/report'

const props = defineProps<{
  reportData: any
  reportType: string
}>()

const reportStore = useReportStore()

const analysisResult = computed(() => reportStore.aiAnalysis)

const fetchAnalysis = async () => {
  if (!props.reportData || !props.reportData.id) return
  await reportStore.getAIAnalysis(props.reportData, props.reportType)
}

onMounted(() => {
  if (!analysisResult.value && !reportStore.aiAnalysisLoading) {
    fetchAnalysis()
  }
})

watch(() => props.reportData?.id, (newId, oldId) => {
  if (newId && newId !== oldId && !analysisResult.value && !reportStore.aiAnalysisLoading) {
    fetchAnalysis()
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.ai-analysis-panel {
  margin-top: 0;

  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
  --td-brand-color-1: var(--color-primary);
  --td-brand-color-2: var(--color-primary);
  --td-brand-color-3: var(--color-primary);
  --td-brand-color-4: var(--color-primary);
  --td-brand-color-5: var(--color-primary);
  --td-brand-color-6: var(--color-primary);
  --td-brand-color-7: var(--color-primary);
  --td-brand-color-8: var(--color-primary);
  --td-brand-color-9: var(--color-primary);

  :deep(.t-button--theme-primary) {
    background-color: var(--color-primary);
    border-color: var(--color-primary);

    &:hover {
      background-color: var(--color-primary-dark);
      border-color: var(--color-primary-dark);
    }

    &:active {
      background-color: var(--color-primary-deep);
      border-color: var(--color-primary-deep);
    }
  }
}

.report-section-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  border-left: 4px solid #8B5CF6;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: all $transition-slow;

  &:hover {
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
  }

  .section-header {
    padding: 14px 20px;
    background: #F8FAFC;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .section-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #0F172A;
    margin: 0;
  }

  .section-body {
    padding: 20px;
  }
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
}

.ai-loading-skeleton {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 40%, #f1f5f9 60%, #e2e8f0 100%);
  background-size: 400% 100%;
  animation: shimmer 2s ease-in-out infinite;

  &.long { width: 100%; }
  &.medium { width: 75%; }
  &.short { width: 50%; }
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.ai-loading-text {
  font-size: 13px;
  color: #8B5CF6;
  font-weight: 500;
  margin: 0;
}

.ai-analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.analysis-section {
  padding: 16px;
  border-radius: 12px;
  background: #FAFAFE;
  border: 1px solid #f1f5f9;
}

.analysis-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.analysis-section-title {
  font-size: 14px;
  font-weight: 600;
  color: #0F172A;
}

.analysis-section-text {
  font-size: 14px;
  color: #475569;
  line-height: 1.7;
  margin: 0;
}

.analysis-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.analysis-list-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  font-size: 14px;
  color: #475569;
  line-height: 1.6;
}

.list-index {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: #ECFDF5;
  color: #10B981;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.risk {
    background: #FEF3C7;
    color: #F59E0B;
  }

  &.improve {
    background: #EFF6FF;
    color: #3B82F6;
  }
}

.risk-list .analysis-list-item {
  color: #92400E;
}

.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0;
}

.ai-empty-text {
  font-size: 14px;
  color: #94A3B8;
  margin: 0;
}
</style>
