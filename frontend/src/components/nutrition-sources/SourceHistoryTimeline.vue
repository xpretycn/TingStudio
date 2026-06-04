<template>
  <div class="history-timeline">
    <div class="timeline-header">
      <h3 class="timeline-title">
        <t-icon name="time" /> 历史变更
      </h3>
      <span class="timeline-count">共 {{ sources.length }} 条记录</span>
    </div>

    <div v-if="sources.length === 0" class="empty">
      <t-empty description="暂无历史记录" />
    </div>
    <ol v-else class="timeline-list">
      <li
        v-for="(src, idx) in sources"
        :key="src.sourceId"
        class="timeline-item"
        :class="{ 'timeline-item--active': idx === 0 }"
      >
        <div class="timeline-dot" :class="`timeline-dot--${src.confidence}`"></div>
        <div class="timeline-content">
          <div class="timeline-row">
            <div class="timeline-meta">
              <t-icon :name="iconFor(src.sourceType)" size="14px" />
              <span class="timeline-type">{{ typeLabel(src.sourceType) }}</span>
              <t-tag size="small" variant="light" :theme="confidenceTheme(src.confidence)">
                {{ confidenceLabel(src.confidence) }}可信
              </t-tag>
              <t-tag v-if="idx === 0" size="small" theme="primary" variant="light">
                最新
              </t-tag>
            </div>
            <span class="timeline-time">{{ formatTimestamp(src.createdAt) }}</span>
          </div>
          <div v-if="src.sourceDetail" class="timeline-detail">
            {{ src.sourceDetail }}
          </div>
          <div v-if="src.notes" class="timeline-notes">
            <t-icon name="notes" size="12px" /> {{ src.notes }}
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { formatTimestamp } from '@/utils/timeFormat'
import { SOURCE_TYPE_LABELS, SOURCE_TYPE_ICONS, CONFIDENCE_SHORT_LABELS, CONFIDENCE_THEMES } from '@/constants/sourceTypes'
import type { NutritionSource } from '@/api/nutritionSource'

defineProps<{
  sources: NutritionSource[]
}>()

function typeLabel(t: string) {
  return SOURCE_TYPE_LABELS[t] ?? t
}
function iconFor(t: string) {
  return SOURCE_TYPE_ICONS[t] ?? 'ellipsis'
}
function confidenceLabel(c: string) {
  return CONFIDENCE_SHORT_LABELS[c] ?? '中'
}
function confidenceTheme(c: string): 'success' | 'warning' | 'default' {
  return CONFIDENCE_THEMES[c] ?? 'warning'
}
</script>

<style lang="scss" scoped>
.history-timeline {
  padding: $space-5;
  background: var(--color-bg-container);
  border-radius: $radius-xl;
  border: 1px solid var(--color-border-light);
}

.timeline-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-4;
}

.timeline-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: 0;
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.timeline-count {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.empty {
  padding: $space-12 0;
}

.timeline-list {
  list-style: none;
  margin: 0;
  padding: 0;
  position: relative;
}

.timeline-list::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 12px;
  bottom: 12px;
  width: 2px;
  background: var(--color-border-light);
}

.timeline-item {
  display: flex;
  gap: $space-3;
  padding: $space-3 0;
  position: relative;

  &--active .timeline-dot {
    background: var(--color-primary);
    box-shadow: 0 0 0 4px var(--color-primary-bg);
  }
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: $radius-circle;
  background: var(--color-bg-container);
  border: 2px solid var(--color-border);
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  margin-top: 4px;

  &--high { background: $color-success; border-color: $color-success; }
  &--medium { background: $color-warning; border-color: $color-warning; }
  &--low { background: $color-danger; border-color: $color-danger; }
}

.timeline-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.timeline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-3;
  flex-wrap: wrap;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.timeline-type {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.timeline-time {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.timeline-detail {
  font-size: $font-size-body-sm;
  color: var(--color-text-secondary);
  word-break: break-all;
}

.timeline-notes {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
  padding: $space-1-5 $space-2;
  background: var(--color-bg-container-alt);
  border-radius: $radius-xs;
}
</style>
