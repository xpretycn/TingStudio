<template>
  <div class="ai-analysis-panel">
    <div class="report-section-card" :style="{ borderLeftColor: 'var(--color-primary)' }">
      <div class="section-header">
        <div class="section-title-group">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
            <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58 3.25 3.93" />
            <path d="M8.56 13.68C5.94 14.93 4 17.26 4 20h16c0-2.74-1.94-5.07-4.56-6.32" />
          </svg>
          <h3 class="section-title">AI 智能分析</h3>
        </div>
        <div class="header-actions">
          <template v-if="isGenerating">
            <div class="analysis-status analysis-status--loading">
              <t-icon name="loading" class="status-icon spin" />
              <span>AI 分析中</span>
              <span class="loading-timer">{{ formattedElapsedTime }}</span>
            </div>
          </template>
          <template v-else-if="hasError">
            <div class="analysis-status analysis-status--error">
              <t-icon name="close-circle-filled" class="status-icon" />
              <span>分析失败</span>
            </div>
          </template>
          <template v-else-if="hasAnalysisData">
            <div class="analysis-status analysis-status--success">
              <t-icon name="check-circle-filled" class="status-icon" />
              <span>分析完成</span>
            </div>
          </template>
          <template v-else>
            <div class="analysis-status analysis-status--pending">
              <t-icon name="info-circle" class="status-icon" />
              <span>暂无分析数据</span>
            </div>
          </template>

          <template v-if="hasAnalysisData && !isGenerating">
            <div class="action-btn-group">
              <button class="action-btn action-btn--copy" @click="handleCopy" title="复制报告内容">
                <t-icon name="file-copy" />
                <span>复制</span>
              </button>
              <button class="action-btn action-btn--download" @click="handleDownload" title="下载报告">
                <t-icon name="download" />
                <span>下载</span>
              </button>
              <button class="action-btn action-btn--regenerate" @click="handleRegenerate" :disabled="isGenerating || hasAnalysisData"
                :title="hasAnalysisData ? '已有分析报告，无需重新生成' : '重新生成报告'">
                <t-icon name="refresh" :class="{ spin: isGenerating }" />
                <span>重新生成</span>
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="section-body">
        <div v-if="isGenerating" class="ai-loading">
          <div class="ai-loading-visual">
            <div class="ai-orb-container">
              <div class="ai-orb ai-orb--outer"></div>
              <div class="ai-orb ai-orb--inner"></div>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round" class="ai-center-icon">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
              <circle cx="12" cy="7" r="3" fill="var(--color-primary)" opacity="0.15" />
              </svg>
            </div>
          </div>
          <div class="ai-loading-skeleton">
            <div class="skeleton-line long" />
            <div class="skeleton-line medium" />
            <div class="skeleton-line long" />
            <div class="skeleton-line short" />
            <div class="skeleton-line medium" />
            <div class="skeleton-line long" />
          </div>
          <p class="ai-loading-text">AI 正在深度分析报告数据，请稍候...</p>
          <p class="ai-loading-hint">分析完成后将自动保存并展示结果</p>
          <div class="ai-progress-bar">
            <div class="ai-progress-fill" :style="{ width: progressWidth + '%' }"></div>
          </div>
          <button class="ai-cancel-btn" @click="handleCancel" :disabled="!canCancel">
            <t-icon name="close" />
            取消分析
          </button>
        </div>

        <template v-else-if="hasError">
          <div class="ai-error">
            <div class="ai-error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h4 class="ai-error-title">AI 分析失败</h4>
            <p class="ai-error-message">{{ errorMessage }}</p>
            <div class="ai-error-actions">
              <button class="ai-retry-btn ai-retry-btn--primary" @click="handleRetry">
                <t-icon name="refresh" />
                重新尝试
              </button>
              <button class="ai-retry-btn ai-retry-btn--secondary" @click="handleClearError">
                <t-icon name="close" />
                关闭
              </button>
            </div>
          </div>
        </template>

        <template v-else-if="hasAnalysisData">
          <div class="ai-analysis-content" :class="{ 'content-fade-in': !isGenerating }">
            <div class="analysis-meta" v-if="analysisMeta">
              <span class="meta-item">
                <t-icon name="time" />
                {{ analysisMeta.generatedAt }}
              </span>
              <span class="meta-item" v-if="analysisMeta.model">
                <t-icon name="cpu" />
                {{ analysisMeta.model }}
              </span>
            </div>

            <div class="analysis-section" v-if="displayContent.summary">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span class="analysis-section-title">综合分析</span>
                <span v-if="displayContent.isTruncated" class="summary-truncate-hint">已精简至 {{ MAX_SUMMARY_LENGTH }} 字</span>
              </div>
              <div class="markdown-body" v-html="summaryHtml"></div>
            </div>

            <div class="analysis-section" v-if="displayContent.suggestions?.length">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                <span class="analysis-section-title">优化建议</span>
              </div>
              <ul class="analysis-list">
                <li v-for="(suggestion, idx) in displayContent.suggestions" :key="idx" class="analysis-list-item">
                  <span class="list-index">{{ idx + 1 }}</span>
                  <span>{{ suggestion }}</span>
                </li>
              </ul>
            </div>

            <div class="analysis-section" v-if="displayContent.risks?.length">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span class="analysis-section-title">风险提示</span>
              </div>
              <ul class="analysis-list risk-list">
                <li v-for="(risk, idx) in displayContent.risks" :key="idx" class="analysis-list-item">
                  <span class="list-index risk">{{ idx + 1 }}</span>
                  <span>{{ risk }}</span>
                </li>
              </ul>
            </div>

            <div class="analysis-section" v-if="displayContent.improvements?.length">
              <div class="analysis-section-header">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                  <polyline points="17 6 23 6 23 12" />
                </svg>
                <span class="analysis-section-title">改进方向</span>
              </div>
              <ul class="analysis-list">
                <li v-for="(improvement, idx) in displayContent.improvements" :key="idx" class="analysis-list-item">
                  <span class="list-index improve">{{ idx + 1 }}</span>
                  <span>{{ improvement }}</span>
                </li>
              </ul>
            </div>

            <div class="analysis-section analysis-section--raw" v-if="rawAnalysisText && !displayContent.summary">
              <div class="analysis-section-text raw-text">{{ rawAnalysisText }}</div>
            </div>
          </div>
        </template>

        <div v-else class="ai-empty">
          <div class="ai-empty-visual">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="1.5"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93L12 22" />
              <path d="M12 2a4 4 0 0 0-4 4c0 1.95 1.4 3.58-3.25 3.93" />
              <path d="M8.56 13.68C5.94 14.93 4 17.26 4 20h16c0-2.74-1.94-5.07-4.56-6.32" />
            </svg>
          </div>
          <p class="ai-empty-text">{{ emptyText }}</p>
          <button
            class="ai-generate-btn"
            @click="handleGenerate"
            :disabled="!canGenerate || isGenerating"
            :class="{ 'btn-disabled': !canGenerate || isGenerating }"
          >
            <t-icon name="magic-light" class="btn-icon" />
            <span>AI 智能分析报告</span>
            <span class="btn-hint">基于当前数据自动生成深度分析</span>
          </button>
          <p class="ai-empty-hint" v-if="props.reportData?.status === 'draft'">
            <t-icon name="info-circle" />
            提示：发布报告时也会自动触发 AI 分析
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { useReportStore } from '@/stores/report'
import { MessagePlugin } from 'tdesign-vue-next'
import { marked } from 'marked'
import type { Report, AIAnalysisData } from '@/api/report'

const props = defineProps<{
  reportData: Report | null
  reportType: string
}>()

const reportStore = useReportStore()

const isGenerating = ref(false)
const hasError = ref(false)
const errorMessage = ref('')
const elapsedTime = ref(0)
let timerInterval: ReturnType<typeof setInterval> | null = null
let progressInterval: ReturnType<typeof setInterval> | null = null
const progressValue = ref(0)
const abortController = ref<AbortController | null>(null)

const canGenerate = computed(() => {
  return props.reportData?.id && props.reportData?.dataJson
})

const canCancel = computed(() => isGenerating.value)

const hasAnalysisData = computed(() => {
  return !!reportStore.aiAnalysis && !isGenerating.value && !hasError.value
})

const formattedElapsedTime = computed(() => {
  const seconds = Math.floor(elapsedTime.value / 1000)
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes > 0) {
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }
  return `${secs}s`
})

const progressWidth = computed(() => {
  const baseProgress = Math.min(progressValue.value, 90)
  const timeBonus = Math.min(elapsedTime.value / 120000 * 10, 10)
  return Math.min(baseProgress + timeBonus, 95)
})

const MAX_SUMMARY_LENGTH = 800

const getRawSummaryText = (raw: AIAnalysisData | null): string => {
  if (!raw) return ''
  if (raw.analysis && typeof raw.analysis === 'string') return raw.analysis
  if (raw.summary && typeof raw.summary === 'string') return raw.summary
  return ''
}

const truncateText = (text: string, maxLen: number): { text: string; truncated: boolean } => {
  if (text.length <= maxLen) return { text, truncated: false }
  let cut = text.slice(0, maxLen)
  const lastNewline = cut.lastIndexOf('\n')
  if (lastNewline > maxLen * 0.6) {
    cut = cut.slice(0, lastNewline)
  }
  return { text: cut.trimEnd() + '\n\n*（内容已精简，显示前 ' + maxLen + ' 字）*', truncated: true }
}

const displayContent = computed(() => {
  const raw = reportStore.aiAnalysis
  if (!raw) return {}

  const rawText = getRawSummaryText(raw)
  const { text: summaryRaw, truncated } = truncateText(rawText, MAX_SUMMARY_LENGTH)

  let suggestions: string[] = []
  let improvements: string[] = []
  let risks: string[] = []

  if (raw.suggestions?.length) {
    suggestions = raw.suggestions.map((s) => typeof s === 'string' ? s : String(s))
  }
  if (raw.risks?.length) {
    risks = raw.risks.map((r) => typeof r === 'string' ? r : String(r))
  }
  if (raw.improvements?.length) {
    improvements = raw.improvements.map((i) => typeof i === 'string' ? i : String(i))
  }

  return {
    summary: summaryRaw,
    isTruncated: truncated,
    suggestions,
    risks,
    improvements,
  }
})

const summaryHtml = computed(() => {
  const text = displayContent.value.summary
  if (!text) return ''

  try {
    marked.setOptions({
      breaks: true,
      gfm: true,
    })
    const rendered = marked.parse(text) as string
    return rendered
  } catch {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')
  }
})

const rawAnalysisText = computed(() => {
  return getRawSummaryText(reportStore.aiAnalysis)
})

const analysisMeta = computed(() => {
  const raw = reportStore.aiAnalysis
  if (!raw) return null

  let generatedAt = ''
  let model = ''

  if (raw.createdAt) {
    try {
      const d = new Date(raw.createdAt)
      generatedAt = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch { generatedAt = '' }
  }

  if (raw.model) {
    model = raw.model
  } else if (raw.provider) {
    model = raw.provider
  }

  if (!generatedAt && !model) return null

  return { generatedAt, model }
})

const startTimer = () => {
  elapsedTime.value = 0
  progressValue.value = 0

  timerInterval = setInterval(() => {
    elapsedTime.value += 1000
  }, 1000)

  let simulatedProgress = 0
  progressInterval = setInterval(() => {
    const increment = Math.random() * 3 + 0.5
    simulatedProgress = Math.min(simulatedProgress + increment, 85)
    progressValue.value = simulatedProgress
  }, 800)
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
  if (progressInterval) {
    clearInterval(progressInterval)
    progressInterval = null
  }
  progressValue.value = 100
}

const handleGenerate = async () => {
  if (!canGenerate.value || isGenerating.value) return

  isGenerating.value = true
  hasError.value = false
  errorMessage.value = ''

  abortController.value = new AbortController()

  startTimer()

  try {
    if (!props.reportData) return

    const reportId = props.reportData.id
    const reportDataForAI = {
      type: props.reportType,
      periodStart: props.reportData.periodStart,
      periodEnd: props.reportData.periodEnd,
      dataJson: props.reportData.dataJson,
    }

    await reportStore.generateAndSaveAIAnalysis(reportId, reportDataForAI, props.reportType)

    MessagePlugin.success({
      content: 'AI 智能分析报告生成完成',
      duration: 3000,
    })
  } catch (error: unknown) {
    console.error('[AIAnalysisPanel] AI 分析失败:', error)

    hasError.value = true
    errorMessage.value = error instanceof Error ? error.message : '网络异常，请检查连接后重试'

    MessagePlugin.error({
      content: errorMessage.value,
      duration: 5000,
    })
  } finally {
    stopTimer()
    isGenerating.value = false
    abortController.value = null
  }
}

const handleCancel = () => {
  if (abortController.value) {
    abortController.value.abort()
    abortController.value = null
  }

  stopTimer()
  isGenerating.value = false

  MessagePlugin.info({
    content: '已取消 AI 分析',
    duration: 2000,
  })
}

const handleRetry = () => {
  hasError.value = false
  errorMessage.value = ''
  handleGenerate()
}

const handleClearError = () => {
  hasError.value = false
  errorMessage.value = ''
}

const handleRegenerate = () => {
  reportStore.aiAnalysis = null
  handleGenerate()
}

const handleCopy = async () => {
  const raw = reportStore.aiAnalysis
  if (!raw) return

  let copyText = `AI 智能分析报告\n${'='.repeat(40)}\n`

  if (analysisMeta.value?.generatedAt) {
    copyText += `生成时间: ${analysisMeta.value.generatedAt}\n`
  }
  if (analysisMeta.value?.model) {
    copyText += `分析模型: ${analysisMeta.value.model}\n`
  }
  copyText += '\n'

  if (displayContent.value.summary) {
    copyText += `【综合分析】\n${displayContent.value.summary}\n\n`
  }

  if (displayContent.value.suggestions?.length) {
    copyText += `【优化建议】\n`
    displayContent.value.suggestions.forEach((s: string, i: number) => {
      copyText += `${i + 1}. ${s}\n`
    })
    copyText += '\n'
  }

  if (displayContent.value.risks?.length) {
    copyText += `【风险提示】\n`
    displayContent.value.risks.forEach((r: string, i: number) => {
      copyText += `${i + 1}. ${r}\n`
    })
    copyText += '\n'
  }

  if (displayContent.value.improvements?.length) {
    copyText += `【改进方向】\n`
    displayContent.value.improvements.forEach((imp: string, i: number) => {
      copyText += `${i + 1}. ${imp}\n`
    })
  }

  if (rawAnalysisText.value && !displayContent.value.summary) {
    copyText += rawAnalysisText.value
  }

  try {
    await navigator.clipboard.writeText(copyText)
    MessagePlugin.success('已复制到剪贴板，可随时粘贴使用 (Ctrl+V)')
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = copyText
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    MessagePlugin.success('已复制到剪贴板，可随时粘贴使用 (Ctrl+V)')
  }
}

const handleDownload = () => {
  const raw = reportStore.aiAnalysis
  if (!raw) return

  let downloadText = `AI 智能分析报告\n${'='.repeat(40)}\n`

  if (analysisMeta.value?.generatedAt) {
    downloadText += `生成时间: ${analysisMeta.value.generatedAt}\n`
  }
  if (analysisMeta.value?.model) {
    downloadText += `分析模型: ${analysisMeta.value.model}\n`
  }
  downloadText += '\n'

  if (displayContent.value.summary) {
    downloadText += `【综合分析】\n${displayContent.value.summary}\n\n`
  }

  if (displayContent.value.suggestions?.length) {
    downloadText += `【优化建议】\n`
    displayContent.value.suggestions.forEach((s: string, i: number) => {
      downloadText += `${i + 1}. ${s}\n`
    })
    downloadText += '\n'
  }

  if (displayContent.value.risks?.length) {
    downloadText += `【风险提示】\n`
    displayContent.value.risks.forEach((r: string, i: number) => {
      downloadText += `${i + 1}. ${r}\n`
    })
    downloadText += '\n'
  }

  if (displayContent.value.improvements?.length) {
    downloadText += `【改进方向】\n`
    displayContent.value.improvements.forEach((imp: string, i: number) => {
      downloadText += `${i + 1}. ${imp}\n`
    })
  }

  if (rawAnalysisText.value && !displayContent.value.summary) {
    downloadText += rawAnalysisText.value
  }

  const blob = new Blob([downloadText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `AI智能分析报告-${props.reportData?.title || '月报'}-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  MessagePlugin.success('报告下载成功')
}

const emptyText = computed(() => {
  if (!props.reportData?.id) {
    return '报告数据无效'
  }
  return '该报告暂无AI分析数据'
})

watch(() => reportStore.aiAnalysisLoading, (val) => {
  if (val && !isGenerating.value) {
    isGenerating.value = true
    startTimer()
  } else if (!val && isGenerating.value) {
    stopTimer()
    isGenerating.value = false
    abortController.value = null
  }
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.ai-analysis-panel {
  margin-top: 0;

  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);

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
  background: var(--color-bg-container);
  border-radius: 20px;
  border: 1px solid var(--color-border-light);
  border-left: 4px solid var(--color-primary);
  box-shadow: var(--shadow-elevation-1);
  overflow: hidden;
  transition: all $transition-slow;

  &:hover {
    box-shadow: var(--shadow-elevation-2);
  }

  .section-header {
    padding: var(--space-3-5) 20px;
    background: var(--color-bg-page);
    border-bottom: 1px solid var(--color-border-light);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }

  .section-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .section-body {
    padding: 20px;
  }
}

.analysis-status {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: 13px;
  padding: 4px 12px;
  border-radius: 20px;

  .status-icon {
    font-size: 14px;
  }

  &--loading {
    background: linear-gradient(135deg, var(--color-info-bg), var(--color-info-bg));
    color: var(--color-info);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  &--pending {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
  }

  &--success {
    background: linear-gradient(135deg, var(--color-success-bg), var(--color-primary-bg));
    color: var(--color-primary-dark);
  }

  &--error {
    background: linear-gradient(135deg, var(--color-danger-bg), var(--color-danger-bg));
    color: var(--color-danger);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 var(--overlay-brand-30);
  }
  50% {
    box-shadow: 0 0 0 6px transparent;
  }
}

.loading-timer {
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
  font-weight: 600;
  font-size: 12px;
  opacity: 0.8;
}

.action-btn-group {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px var(--space-2-5);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-primary-bg);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--copy:hover {
    border-color: var(--color-info);
    color: var(--color-info);
    background: var(--color-info-bg);
  }

  &--download:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-success-bg);
  }

  &--regenerate {
    &:hover:not(:disabled) {
      border-color: var(--color-warning);
      color: var(--color-warning);
      background: var(--color-warning-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: var(--color-bg-page);
      border-color: var(--color-border);
      color: var(--color-text-placeholder);
    }
  }

  span {
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    span {
      display: none;
    }
  }
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 32px 0;
}

.ai-loading-visual {
  margin-bottom: 8px;
}

.ai-orb-container {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ai-orb {
  position: absolute;
  border-radius: 50%;
  opacity: 0.3;

  &--outer {
    width: 70px;
    height: 70px;
    background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
    animation: orb-pulse-outer 2s ease-in-out infinite;
  }

  &--inner {
    width: 45px;
    height: 45px;
    background: radial-gradient(circle, var(--color-primary-lighter) 0%, transparent 70%);
    animation: orb-pulse-inner 2s ease-in-out infinite 0.3s;
  }
}

@keyframes orb-pulse-outer {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0.5; }
}

@keyframes orb-pulse-inner {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.2); opacity: 0.7; }
}

.ai-center-icon {
  position: relative;
  z-index: 1;
  animation: icon-float 3s ease-in-out infinite;
}

@keyframes icon-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.ai-loading-skeleton {
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  gap: var(--space-2-5);
}

.skeleton-line {
  height: 13px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--color-border-light) 0%, var(--color-border) 40%, var(--color-border-light) 60%, var(--color-border) 100%);
  background-size: 400% 100%;
  animation: shimmer 2s ease-in-out infinite;

  &.long { width: 100%; }
  &.medium { width: 72%; }
  &.short { width: 48%; }
}

@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.ai-loading-text {
  font-size: 14px;
  color: var(--color-primary);
  font-weight: 500;
  margin: 0;
}

.ai-loading-hint {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0;
}

.ai-progress-bar {
  width: 100%;
  max-width: 320px;
  height: 4px;
  background: var(--color-lavender);
  border-radius: var(--radius-2xs);
  overflow: hidden;
}

.ai-progress-fill {
  height: 100%;
  background: var(--gradient-brand);
  border-radius: var(--radius-2xs);
  transition: width 0.5s ease;
  animation: progress-shimmer 2s ease-in-out infinite;
}

@keyframes progress-shimmer {
  0% { opacity: 0.8; }
  50% { opacity: 1; }
  100% { opacity: 0.8; }
}

.ai-cancel-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: 8px 20px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    border-color: var(--color-danger);
    color: var(--color-danger);
    background: var(--color-danger-bg);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.ai-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
  text-align: center;
}

.ai-error-icon {
  opacity: 0.85;
}

.ai-error-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.ai-error-message {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  max-width: 340px;
  line-height: 1.5;
}

.ai-error-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.ai-retry-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-2-5) var(--space-6);
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &--primary {
    background: var(--gradient-btn);
    color: var(--color-text-white);
    box-shadow: var(--shadow-brand-sm);

    &:hover {
      transform: translateY(-1px);
      box-shadow: var(--shadow-brand-md);
    }
  }

  &--secondary {
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);

    &:hover {
      background: var(--color-border);
    }
  }
}

.ai-analysis-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
  animation: content-enter 0.4s ease;
}

.content-fade-in {
  animation: content-enter 0.5s ease;
}

@keyframes content-enter {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.analysis-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: var(--space-2-5) var(--space-3-5);
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border-light);
  border-radius: 10px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: var(--space-1-25);
  font-size: 12px;
  color: var(--color-text-placeholder);

  :deep(.t-icon) {
    font-size: 14px;
  }
}

.analysis-section {
  padding: var(--space-4-5);
  border-radius: 14px;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-border-light);
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary-lightest);
    box-shadow: var(--shadow-brand-xs);
  }

  &--raw {
    background: var(--color-bg-page);
  }
}

.analysis-section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.analysis-section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.analysis-section-text {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.75;
  margin: 0;

  :deep(strong) {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  &.raw-text {
    white-space: pre-wrap;
    word-break: break-word;
  }
}

.summary-truncate-hint {
  font-size: 11px;
  font-weight: 500;
  padding: var(--space-0-5) 8px;
  border-radius: 6px;
  background: var(--color-lavender);
  color: var(--color-primary-dark);
  margin-left: auto;
  flex-shrink: 0;
}

.markdown-body {
  font-size: 14px;
  color: var(--color-text-regular);
  line-height: 1.8;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    color: var(--color-text-regular);
    font-weight: 700;
    margin-top: 16px;
    margin-bottom: 8px;
    line-height: 1.4;

    &:first-child { margin-top: 0; }
  }

  :deep(h2) {
    font-size: 16px;
    padding-bottom: var(--space-1-5);
    border-bottom: 2px solid var(--color-lavender);
  }

  :deep(h3) {
    font-size: 15px;
    color: var(--color-primary-deep);
  }

  :deep(p) {
    margin: 0 0 12px;

    &:last-child { margin-bottom: 0; }
  }

  :deep(strong) {
    color: var(--color-text-primary);
    font-weight: 700;
    background: linear-gradient(120deg, var(--overlay-brand-08) 0%, var(--overlay-brand-12) 100%);
    padding: 1px 4px;
    border-radius: var(--radius-xs);
  }

  :deep(em) {
    font-style: italic;
    color: var(--color-primary-deep);
  }

  :deep(code) {
    font-family: 'SF Mono', 'Monaco', 'Consolas', 'Liberation Mono', monospace;
    font-size: 13px;
    background: var(--color-primary-bg);
    color: var(--color-primary-dark);
    padding: var(--space-0-5) var(--space-1-5);
    border-radius: 4px;
    border: 1px solid var(--color-lavender);
  }

  :deep(pre) {
    background: var(--color-primary-bg);
    border: 1px solid var(--color-lavender);
    border-radius: 10px;
    padding: var(--space-3-5) var(--space-4-5);
    overflow-x: auto;
    margin: 12px 0;

    code {
      background: none;
      border: none;
      padding: 0;
      font-size: 13px;
    }
  }

  :deep(ul), :deep(ol) {
    padding-left: 20px;
    margin: var(--space-2-5) 0;

    li {
      margin-bottom: var(--space-1-5);
      padding: var(--space-1-5) var(--space-2-5);
      border-radius: 8px;
      background: linear-gradient(135deg, var(--color-primary-bg), var(--color-primary-bg));
      border: 1px solid var(--color-primary-bg);
      transition: all 0.15s;

      &:hover {
        border-color: var(--color-primary-lightest);
        background: var(--color-primary-bg);
        transform: translateX(2px);
      }

      p { margin: 0; }
    }
  }

  :deep(ul) {
    list-style-type: none;

    li {
      position: relative;
      padding-left: var(--space-7);

      &::before {
        content: '';
        position: absolute;
        left: 10px;
        top: 14px;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--gradient-brand);
        box-shadow: 0 0 0 3px var(--overlay-brand-12);
      }
    }
  }

  :deep(ol) {
    li {
      counter-increment: md-ol;
      padding-left: var(--space-7);

      &::before {
        content: counter(md-ol);
        position: absolute;
        left: 4px;
        top: 6px;
        width: 20px;
        height: 20px;
        border-radius: 6px;
        background: var(--gradient-btn);
        color: var(--color-text-white);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: var(--shadow-brand);
      }
    }

    counter-reset: md-ol;
    counter-increment: md-ol;
  }

  :deep(blockquote) {
    margin: 12px 0;
    padding: var(--space-2-5) 16px;
    border-left: 4px solid var(--color-primary);
    background: linear-gradient(90deg, var(--overlay-brand-05), transparent);
    border-radius: 0 10px 10px 0;
    color: var(--color-text-secondary);
    font-style: italic;

    p { margin: 0; }
  }

  :deep(hr) {
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-lavender), transparent);
    margin: 16px 0;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0;
    font-size: 13px;

    th, td {
      padding: 8px 12px;
      border: 1px solid var(--color-lavender);
      text-align: left;
    }

    th {
      background: var(--color-primary-bg);
      font-weight: 600;
      color: var(--color-primary-deep);
    }

    tr:nth-child(even) td {
      background: var(--color-primary-bg);
    }
  }
}

.analysis-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2-5);
}

.analysis-list-item {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2-5);
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.65;
}

.list-index {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  background: var(--color-success-bg);
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;

  &.risk {
    background: var(--color-warning-bg);
    color: var(--color-warning);
  }

  &.improve {
    background: var(--color-info-bg);
    color: var(--color-info);
  }
}

.risk-list .analysis-list-item {
  color: var(--color-warning);
}

.ai-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 20px;
}

.ai-empty-visual {
  opacity: 0.5;
}

.ai-empty-text {
  font-size: 14px;
  color: var(--color-text-placeholder);
  margin: 0;
}

.ai-generate-btn {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1-5);
  padding: 16px var(--space-8);
  border: none;
  border-radius: 16px;
  background: var(--gradient-brand);
  color: var(--color-text-white);
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: var(--shadow-brand-lg), var(--shadow-brand-xs);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.15),
      transparent
    );
    transition: left 0.6s ease;
  }

  &:hover:not(.btn-disabled) {
    transform: translateY(-3px) scale(1.02);
    box-shadow: var(--shadow-brand-lg), var(--shadow-brand-sm);

    &::before {
      left: 100%;
    }
  }

  &:active:not(.btn-disabled) {
    transform: translateY(-1px) scale(0.99);
  }

  &.btn-disabled {
    opacity: 0.5;
    cursor: not-allowed;
    box-shadow: none;
  }

  .btn-icon {
    font-size: 20px;
    animation: magic-sparkle 2s ease-in-out infinite;
  }

  span:first-of-type {
    letter-spacing: 0.03em;
  }

  .btn-hint {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.75;
    letter-spacing: 0.02em;
  }
}

@keyframes magic-sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.1); }
}

.ai-empty-hint {
  display: flex;
  align-items: center;
  gap: var(--space-1-25);
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0;
  padding: 8px 16px;
  background: var(--color-bg-page);
  border-radius: 8px;

  :deep(.t-icon) {
    font-size: 14px;
    color: var(--color-warning);
  }
}

@media (max-width: 768px) {
  .report-section-card .section-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .action-btn-group {
    flex-wrap: wrap;
  }

  .ai-generate-btn {
    padding: var(--space-3-5) var(--space-7);
    font-size: 14px;
  }

  .analysis-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .ai-error-actions {
    flex-direction: column;
    width: 100%;

    .ai-retry-btn {
      justify-content: center;
    }
  }
}
</style>
