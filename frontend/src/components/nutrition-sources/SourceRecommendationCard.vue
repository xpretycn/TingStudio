<template>
  <div class="recommendation-card">
    <div v-if="candidates.length === 0" class="recommendation-empty">
      <t-empty description="暂无推荐结果，请先触发评分" size="small" />
    </div>

    <div v-else class="candidates-list">
      <div
        v-for="(c, idx) in candidates"
        :key="c.sourceId"
        class="candidate-item"
        :class="{
          'candidate-item--primary': idx === 0,
          'candidate-item--authoritative': c.sourceId === activeAuthoritativeSourceId,
        }"
      >
        <div class="candidate-header">
          <div class="candidate-header-left">
            <span v-if="idx === 0" class="rank-badge rank-badge--gold" title="系统首选推荐">
              <t-icon name="star-filled" size="12px" />
              <span>推荐</span>
            </span>
            <span v-else class="rank-badge rank-badge--gray">#{{ idx + 1 }}</span>

            <t-icon :name="iconFor(c.sourceType)" size="14px" />
            <span class="candidate-type">{{ typeLabel(c.sourceType) }}</span>

            <t-tooltip
              v-if="isDemoSource(c.sourceType)"
              content="演示数据：当前未配置真实 API Key"
              placement="top"
            >
              <t-tag size="small" theme="warning" variant="light" class="demo-tag">演示</t-tag>
            </t-tooltip>

            <t-tag size="small" variant="light" :theme="confidenceTheme(c.confidence)">
              {{ confidenceLabel(c.confidence) }}
            </t-tag>

            <span v-if="c.sourceId === activeAuthoritativeSourceId" class="current-authoritative-tag">
              <t-icon name="check-circle-filled" size="12px" />
              <span>当前主用</span>
            </span>
          </div>

          <div class="candidate-score">
            <span class="score-value">{{ c.totalScore.toFixed(1) }}</span>
            <span class="score-label">综合分</span>
          </div>
        </div>

        <div class="candidate-detail">
          <span class="detail-label">来源详情:</span>
          <span class="detail-text">{{ c.sourceDetail || '—' }}</span>
        </div>

        <div v-if="c.scoreBreakdown" class="candidate-breakdown">
          <span
            v-for="item in c.scoreBreakdown"
            :key="item.label"
            class="breakdown-chip"
            :title="`${item.label}: ${item.score.toFixed(1)}/${item.maxScore}（${item.reason}）`"
          >
            <span class="chip-label">{{ item.label }}</span>
            <span class="chip-score">{{ item.score.toFixed(1) }}</span>
          </span>
        </div>

        <div class="candidate-actions">
          <t-button
            v-if="c.sourceId === activeAuthoritativeSourceId"
            size="small"
            theme="success"
            variant="outline"
            disabled
          >
            <template #icon>
              <t-icon name="check-circle-filled" />
            </template>
            已是主用
          </t-button>
          <t-popconfirm
            v-else
            :content="confirmText(c, idx)"
            placement="top-right"
            :confirm-btn-props="{ theme: 'primary', content: '确认替换' }"
            :cancel-btn-props="{ content: '取消' }"
            @confirm="handleApply(c.sourceId)"
          >
            <t-button
              size="small"
              theme="primary"
              :loading="applyingId === c.sourceId"
            >
              <template #icon>
                <t-icon :name="idx === 0 ? 'check' : 'check-circle-filled'" />
              </template>
              {{ idx === 0 ? '一键应用为主用' : '应用此候选为主用' }}
            </t-button>
          </t-popconfirm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import {
  SOURCE_TYPE_LABELS,
  SOURCE_TYPE_ICONS,
  CONFIDENCE_LABELS,
  CONFIDENCE_THEMES,
  DEMO_SOURCE_TYPES,
} from '@/constants/sourceTypes'
import type { ScoredSource, NutritionSource } from '@/api/nutritionSourceBatch'
import { useNutritionSourceCompareStore } from '@/stores/nutritionSourceCompare'

const store = useNutritionSourceCompareStore()

const props = withDefaults(defineProps<{
  /** top N 主用推荐候选（按综合分降序） */
  candidates: ScoredSource[]
  /** 所有 source 列表，用于匹配 sourceId 显示信息 */
  sources?: NutritionSource[]
  /** 当前主用来源 ID */
  activeAuthoritativeSourceId?: string | null
}>(), {
  sources: () => [],
  activeAuthoritativeSourceId: null,
})

const emit = defineEmits<{
  (e: 'apply', sourceId: string): void
}>()

const applyingId = ref<string | null>(null)

function typeLabel(t: string): string {
  return SOURCE_TYPE_LABELS[t] ?? t
}

function iconFor(t: string): string {
  return SOURCE_TYPE_ICONS[t] ?? 'ellipsis'
}

function confidenceLabel(c: string): string {
  return CONFIDENCE_LABELS[c] ?? c
}

function confidenceTheme(c: string): 'success' | 'warning' | 'default' {
  return CONFIDENCE_THEMES[c] ?? 'warning'
}

function isDemoSource(t: string): boolean {
  return DEMO_SOURCE_TYPES.has(t)
}

/**
 * 二次确认文案：明确告知用户会发生什么
 *  - 第 1 名："一键应用" → 强调系统推荐 + 替换全部营养素
 *  - 第 2/3 名：列出与当前主用的差异
 */
function confirmText(c: ScoredSource, idx: number): string {
  const typeText = typeLabel(c.sourceType)
  if (idx === 0) {
    return `将使用「${typeText}·${c.sourceDetail || ''}」作为主用值，覆盖 27 项营养素的当前数据，是否继续？`
  }
  return `确定将主用值切换为「${typeText}·${c.sourceDetail || ''}」吗？将覆盖当前 27 项营养素。`
}

async function handleApply(sourceId: string) {
  applyingId.value = sourceId
  try {
    // 使用 best-deviation 策略切换为该 source 的全量数据
    const result = await store.batchSetAuthoritative({
      strategy: 'best-deviation',
      sourceIds: [sourceId],
    })
    if (result.success) {
      MessagePlugin.success('已应用为主用值')
      emit('apply', sourceId)
    } else {
      MessagePlugin.error(result.message ?? '应用失败')
    }
  } finally {
    applyingId.value = null
  }
}
</script>

<style lang="scss" scoped>
.recommendation-card {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.recommendation-empty {
  padding: $space-4 0;
}

.candidates-list {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.candidate-item {
  position: relative;
  padding: $space-2-5 $space-3;
  border: 1px solid var(--color-border-light);
  border-radius: $radius-lg;
  background: var(--color-bg-container);
  transition: all 0.2s;

  &:hover {
    border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
  }

  &--primary {
    border-color: var(--color-primary);
    background: linear-gradient(
      135deg,
      var(--color-primary-bg) 0%,
      var(--color-bg-container) 100%
    );
  }

  &--authoritative {
    border-left: 4px solid var(--color-primary);
    padding-left: $space-2;
  }
}

.candidate-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
  margin-bottom: $space-1-5;
}

.candidate-header-left {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}

.candidate-type {
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.demo-tag {
  flex-shrink: 0;
}

.current-authoritative-tag {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px 1px 4px;
  background: var(--color-primary);
  color: $text-on-primary;
  border-radius: $radius-pill;
  font-size: 11px;
  font-weight: $font-weight-semibold;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px 1px 4px;
  border-radius: $radius-pill;
  font-size: 11px;
  font-weight: $font-weight-semibold;
  flex-shrink: 0;

  &--gold {
    background: $color-warning;
    color: $text-on-primary;
  }

  &--gray {
    background: var(--color-bg-container-alt);
    color: var(--color-text-secondary);
  }
}

.candidate-score {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.1;
  flex-shrink: 0;
}

.score-value {
  font-size: $font-size-h3;
  font-weight: $font-weight-bold;
  color: var(--color-primary);
  font-variant-numeric: tabular-nums;
}

.score-label {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.candidate-detail {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $font-size-body-sm;
  color: var(--color-text-secondary);
  margin-bottom: $space-1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-label {
  color: var(--color-text-placeholder);
  flex-shrink: 0;
}

.detail-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.candidate-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
  margin-bottom: $space-2;
}

.breakdown-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-bg-container-alt);
  border-radius: $radius-sm;
  font-size: $font-size-caption;
  cursor: help;
}

.chip-label {
  color: var(--color-text-placeholder);
}

.chip-score {
  color: var(--color-text-primary);
  font-weight: $font-weight-semibold;
  font-variant-numeric: tabular-nums;
}

.candidate-actions {
  display: flex;
  justify-content: flex-end;
  gap: $space-1;
}
</style>
