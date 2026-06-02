<template>
  <span class="diff-badge" :class="`diff-badge--${severity}`">
    <span v-if="diffPercent > 0" class="diff-value">{{ formatted }}%</span>
    <span v-else class="diff-value diff-value--zero">一致</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  diffPercent: number
}>()

const formatted = computed(() => {
  return Number(props.diffPercent).toFixed(1)
})

const severity = computed<'success' | 'info' | 'warning' | 'danger'>(() => {
  const d = Math.abs(props.diffPercent)
  if (d < 1) return 'success'
  if (d < 3) return 'info'
  if (d < 5) return 'warning'
  return 'danger'
})
</script>

<style lang="scss" scoped>
.diff-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: $radius-xs;
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  letter-spacing: $ls-caption;
  line-height: 1.4;

  &--success {
    background: $color-success-light;
    color: $color-success;
  }
  &--info {
    background: $color-info-light;
    color: $color-info;
  }
  &--warning {
    background: $color-warning-light;
    color: $color-warning;
  }
  &--danger {
    background: $color-danger-light;
    color: $color-danger;
    font-weight: $font-weight-semibold;
  }
}

.diff-value--zero {
  opacity: 0.7;
}
</style>
