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
        <t-icon v-if="isAuthoritative" name="star-filled" class="authoritative-icon" />
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
      <div v-if="source.sourceDetail" class="item-detail">
        {{ truncate(source.sourceDetail, 50) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTimestamp } from '@/utils/timeFormat'
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_ICONS, CONFIDENCE_LABELS, CONFIDENCE_THEMES } from '@/constants/sourceTypes'
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
  background: $bg-container;
  cursor: pointer;
  transition: all $transition-fast;
  position: relative;
  min-height: 88px;

  &:hover {
    background: $bg-hover;
    border-color: $border-color-light;
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
  color: $text-primary;
}

.authoritative-icon {
  color: var(--color-primary);
  font-size: 14px;
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
  color: $text-secondary;
}

.item-time {
  color: $text-tertiary;
  font-size: $font-size-caption;
}

.item-detail {
  font-size: $font-size-caption;
  color: $text-tertiary;
  line-height: 1.4;
  word-break: break-all;
}
</style>
