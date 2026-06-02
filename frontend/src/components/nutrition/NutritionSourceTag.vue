<template>
  <t-tooltip :content="sourceDetail || ''" :disabled="!sourceDetail">
    <t-tag :theme="tagTheme" size="small" variant="light" class="source-tag">
      {{ icon }} {{ label }}
    </t-tag>
  </t-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  sourceType: string
  sourceDetail?: string | null
  size?: 'small' | 'medium'
}>()

const SOURCE_CONFIG: Record<string, { icon: string; label: string; theme: string }> = {
  seed: { icon: '📚', label: '种子库', theme: 'success' },
  tianapi: { icon: '🌐', label: '天行数据', theme: 'primary' },
  manual: { icon: '✏️', label: '手动录入', theme: 'default' },
  ai: { icon: '🤖', label: 'AI估算', theme: 'warning' },
  excel_import: { icon: '📊', label: 'Excel导入', theme: 'primary' },
  other: { icon: '📎', label: '其他', theme: 'default' },
}

const config = computed(() => SOURCE_CONFIG[props.sourceType] || SOURCE_CONFIG.other)
const icon = computed(() => config.value.icon)
const label = computed(() => config.value.label)
const tagTheme = computed(() => config.value.theme as 'success' | 'primary' | 'default' | 'warning')
</script>

<style lang="scss" scoped>
.source-tag {
  margin-left: var(--space-1, 4px);
  font-size: var(--font-size-small, 12px);
  cursor: default;
}
</style>
