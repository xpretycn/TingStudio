<template>
  <div
    class="source-list-item"
    :class="{
      'source-list-item--active': active,
      'source-list-item--selected': selected,
      'source-list-item--authoritative': isAuthoritative,
    }"
    @click="handleClick"
  >
    <div class="item-check">
      <t-checkbox
        v-if="selectable"
        :checked="selected"
        @click.stop="handleToggleSelect"
      />
    </div>
    <div class="item-icon">
      <t-icon :name="iconName" size="20px" />
    </div>
    <div class="item-main">
      <div class="item-header">
        <span class="item-title">{{ typeLabel }}</span>
        <t-tooltip
          v-if="isAuthoritative"
          content="当前主用来源：右侧对比页面的'主用值'、所有营养素计算与导出报告均采用此来源的数据"
          placement="top"
        >
          <span class="authoritative-badge" :aria-label="authoritativeBadgeLabel">
            <t-icon name="star-filled" class="authoritative-icon" />
            <span>主用</span>
          </span>
        </t-tooltip>
        <t-tooltip
          v-if="isDemo"
          content="演示数据：当前未配置真实 API Key，所拉取的数据为本地 mock 兜底值，并非来自天行API 真实接口"
          placement="top"
        >
          <span class="demo-badge" :aria-label="demoBadgeLabel">
            <t-icon name="alert-circle" class="demo-icon" />
            <span>演示</span>
          </span>
        </t-tooltip>
        <span v-if="source.totalScore > 0" class="item-score" :title="`综合评分 ${source.totalScore}`">
          {{ source.totalScore }}
        </span>
      </div>
      <div class="item-meta">
        <t-tag size="small" :theme="confidenceTheme" variant="light">
          {{ confidenceLabel }}
        </t-tag>
        <span class="item-time">{{ formatTimestamp(source.createdAt) }}</span>
      </div>
      <div v-if="dataSourceLabel" class="item-data-source" :title="source.sourceDetail">
        <t-icon name="bookmark" class="item-data-source-icon" />
        <span>{{ dataSourceLabel }}</span>
      </div>
      <div v-if="source.sourceDetail" class="item-detail">
        {{ truncate(source.sourceDetail, 50) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTimestamp } from '@/utils/timeFormat'
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_ICONS, CONFIDENCE_LABELS, CONFIDENCE_THEMES, DEMO_SOURCE_TYPES } from '@/constants/sourceTypes'
import type { SourceWithScore } from '@/api/nutritionSourceBatch'

const props = defineProps<{
  source: SourceWithScore
  active?: boolean
  selected?: boolean
  selectable?: boolean
  isAuthoritative?: boolean
}>()

const emit = defineEmits<{
  (e: 'click', source: SourceWithScore): void
  (e: 'toggle-select', source: SourceWithScore): void
}>()

const typeLabel = computed(() => SOURCE_TYPE_LABELS[props.source.sourceType] ?? props.source.sourceType)
const iconName = computed(() => SOURCE_TYPE_ICONS[props.source.sourceType] ?? 'ellipsis')
const confidenceLabel = computed(() => CONFIDENCE_LABELS[props.source.confidence] ?? '中可信')
const confidenceTheme = computed(() => CONFIDENCE_THEMES[props.source.confidence] ?? 'warning')

/** 当前来源是否标记为"演示数据"（如未配置真实 API Key 的天行API） */
const isDemo = computed(() => DEMO_SOURCE_TYPES.has(props.source.sourceType))

/** 主用徽章的可访问性文本，解释该特殊样式的含义 */
const authoritativeBadgeLabel = computed(() =>
  '主用来源：本卡片的营养数据被作为该原料的权威值使用，所有营养素对比、计算和导出均基于此来源',
)

/** 演示数据徽章的可访问性文本 */
const demoBadgeLabel = computed(() =>
  '演示数据：本卡片的数据并非来自真实外部接口，而是本地 mock 兜底值，仅供界面演示',
)

/**
 * 各类型默认对应的标准/权威数据来源。
 * 当数据库中 sourceDetail 未包含《xxx》格式时，
 * 按 sourceType 回退展示，让"种子库"始终能关联到《中国食物成分表》。
 */
const DEFAULT_DATA_SOURCE: Record<string, string> = {
  seed: '《中国食物成分表》 v1.0',
  tianapi: '天眼查营养数据',
  excel_import: 'Excel 外部数据',
  ai: 'AI 估算',
  manual: '手工录入',
  other: '其他来源',
}

/**
 * 提取数据来源的"标准/权威来源"标识。
 * 优先从 sourceDetail 中匹配书名号包裹的来源（如《中国食物成分表》v1.0），
 * 未匹配时按 sourceType 回退到默认标准来源。
 */
const dataSourceLabel = computed(() => {
  const detail = props.source.sourceDetail
  if (detail) {
    const standardMatch = detail.match(/《[^》]+》/g)
    if (standardMatch && standardMatch.length > 0) {
      const last = standardMatch[standardMatch.length - 1]
      const versionMatch = detail.match(/v\d+(\.\d+)*/i)
      return versionMatch ? `${last} ${versionMatch[0]}` : last
    }
  }
  // 未匹配到《xxx》时按 sourceType 回退
  return DEFAULT_DATA_SOURCE[props.source.sourceType] ?? ''
})

function truncate(text: string, maxLen: number) {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

function handleClick() {
  emit('click', props.source)
}

function handleToggleSelect() {
  emit('toggle-select', props.source)
}
</script>

<style lang="scss" scoped>
.source-list-item {
  display: flex;
  align-items: flex-start;
  gap: $space-2-5;
  padding: $space-3;
  border-radius: $radius-lg;
  border: 1px solid transparent;
  background: var(--color-bg-container);
  cursor: pointer;
  transition: all $transition-fast;
  position: relative;
  min-height: 88px;

  &:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border);
  }

  &--active {
    background: var(--color-primary-bg);
    border-color: var(--color-primary-light);
  }

  &--selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary-light);
  }

  &--authoritative {
    border-left: 4px solid var(--color-primary);
    padding-left: $space-2-5;
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-primary-bg) 70%, transparent) 0%,
      color-mix(in srgb, var(--color-primary-bg) 20%, transparent) 100%
    );

    &:hover {
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--color-primary-bg) 85%, transparent) 0%,
        color-mix(in srgb, var(--color-primary-bg) 35%, transparent) 100%
      );
    }
  }
}

.item-check {
  padding-top: 2px;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: $radius-md;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  flex-shrink: 0;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.item-header {
  display: flex;
  align-items: center;
  gap: $space-1-5;
}

.item-title {
  font-size: $font-size-body;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.authoritative-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px 1px 4px;
  background: var(--color-primary);
  color: $text-on-primary;
  border-radius: $radius-pill;
  font-size: 11px;
  font-weight: $font-weight-semibold;
  line-height: 1.4;
  cursor: help;
  user-select: none;
}

.authoritative-icon {
  color: $text-on-primary;
  font-size: 12px;
  flex-shrink: 0;
}

.demo-badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 1px 6px 1px 4px;
  background: $color-warning-bg;
  color: $color-warning-orange;
  border: 1px dashed $color-warning;
  border-radius: $radius-pill;
  font-size: 11px;
  font-weight: $font-weight-semibold;
  line-height: 1.4;
  cursor: help;
  user-select: none;
}

.demo-icon {
  color: $color-warning;
  font-size: 12px;
  flex-shrink: 0;
}

.item-score {
  margin-left: auto;
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  color: var(--color-primary-deep);
  background: var(--color-primary-bg);
  padding: 1px 6px;
  border-radius: $radius-xs;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-caption;
  color: var(--color-text-secondary);
}

.item-time {
  color: var(--color-text-placeholder);
  font-size: $font-size-caption;
}

.item-data-source {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: 2px 8px;
  margin-top: 2px;
  align-self: flex-start;
  background: linear-gradient(135deg, var(--color-primary-bg) 0%, color-mix(in srgb, var(--color-primary-bg) 60%, var(--color-bg-container)) 100%);
  color: var(--color-primary-deep);
  border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
  border-radius: $radius-sm;
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  line-height: 1.4;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-data-source-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.item-data-source span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-detail {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
  line-height: 1.4;
  word-break: break-all;
}
</style>
