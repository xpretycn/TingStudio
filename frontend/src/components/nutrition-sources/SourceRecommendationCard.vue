<template>
  <section v-if="recommendation" class="recommendation-card">
    <div class="card-header">
      <div class="header-left">
        <t-icon name="star-filled" class="header-icon" />
        <span class="header-label">主用推荐</span>
        <t-tag size="small" theme="primary" variant="light">
          综合评分 {{ recommendation.totalScore }}
        </t-tag>
      </div>
      <t-button
        v-if="canApply"
        theme="primary"
        size="small"
        :loading="applying"
        @click="handleApply"
      >
        应用为主用
      </t-button>
    </div>
    <div class="card-body">
      <div class="info-row">
        <span class="info-label">来源类型</span>
        <span class="info-value">{{ typeLabel }}</span>
      </div>
      <div v-if="sourceDetail" class="info-row">
        <span class="info-label">来源详情</span>
        <span class="info-value">{{ sourceDetail }}</span>
      </div>
      <div class="info-row">
        <span class="info-label">置信度</span>
        <t-tag size="small" :theme="confidenceTheme" variant="light">
          {{ confidenceLabel }}
        </t-tag>
      </div>
      <div class="info-row">
        <span class="info-label">评分依据</span>
        <span class="info-value">
          置信 {{ recommendation.confScore }} · 时效 {{ recommendation.recencyScore }} · 匹配 {{ recommendation.matchScoreNorm }}
        </span>
      </div>
    </div>
  </section>
  <section v-else class="recommendation-card recommendation-card--empty">
    <div class="empty-content">
      <t-icon name="info-circle" size="20px" />
      <span>暂无推荐来源</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { SOURCE_TYPE_LABELS, CONFIDENCE_LABELS, CONFIDENCE_THEMES } from '@/constants/sourceTypes'
import type { ScoredSource } from '@/api/nutritionSourceBatch'

const props = defineProps<{
  recommendation: ScoredSource | null
  sourceType?: string
  sourceDetail?: string | null
  canApply?: boolean
  applying?: boolean
}>()

const emit = defineEmits<{
  (e: 'apply', recommendation: ScoredSource): void
}>()

const typeLabel = computed(() => {
  const key = props.sourceType ?? ''
  return SOURCE_TYPE_LABELS[key] ?? key ?? '未知'
})

const confidenceLabel = computed(() => CONFIDENCE_LABELS[props.recommendation?.confidence ?? 'medium'] ?? '中可信')
const confidenceTheme = computed(() => CONFIDENCE_THEMES[props.recommendation?.confidence ?? 'medium'] ?? 'warning')

function handleApply() {
  if (!props.recommendation) {
    MessagePlugin.warning('暂无推荐来源')
    return
  }
  emit('apply', props.recommendation)
}
</script>

<style lang="scss" scoped>
.recommendation-card {
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, $bg-container 100%);
  border: 1px solid var(--color-primary-lighter);
  border-radius: $radius-xl;
  padding: $space-4 $space-5;

  &--empty {
    background: $bg-container-alt;
    border-color: $border-color-light;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-3;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.header-icon {
  color: var(--color-primary);
  font-size: 18px;
}

.header-label {
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.info-row {
  display: flex;
  align-items: center;
  gap: $space-3;
  font-size: $font-size-body-sm;
}

.info-label {
  color: $text-tertiary;
  min-width: 72px;
}

.info-value {
  color: $text-primary;
}

.empty-content {
  display: flex;
  align-items: center;
  gap: $space-2;
  color: $text-tertiary;
  font-size: $font-size-body-sm;
}
</style>
