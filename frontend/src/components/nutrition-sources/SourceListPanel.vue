<template>
  <aside class="source-list-panel">
    <div class="panel-header">
      <h3 class="panel-title">
        <t-icon name="data" />
        数据来源
        <span class="title-count">{{ filteredSources.length }}</span>
      </h3>
      <t-button
        v-if="selectedIds.length > 0"
        theme="default"
        variant="text"
        size="small"
        @click="emit('clear-selection')"
      >
        取消选择
      </t-button>
    </div>

    <div class="panel-toolbar">
      <t-select
        v-model="typeFilter"
        multiple
        clearable
        placeholder="来源类型"
        :popup-props="{ appendToBody: true }"
        size="small"
      >
        <t-option v-for="t in SOURCE_TYPE_OPTIONS" :key="t.value" :value="t.value" :label="t.label" />
      </t-select>
    </div>

    <div class="panel-list">
      <div v-if="filteredSources.length === 0" class="empty-state">
        <t-empty description="暂无数据来源" />
      </div>
      <div
        v-for="source in filteredSources"
        :key="source.sourceId"
      >
        <SourceListItem
          :source="source"
          :active="activeId === source.sourceId"
          :selected="selectedIds.includes(source.sourceId)"
          :selectable="true"
          :is-authoritative="isAuthoritative(source.sourceId)"
          @click="handleClick(source.sourceId)"
          @toggle-select="handleToggleSelect(source.sourceId)"
        />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SourceListItem from './SourceListItem.vue'
import { SOURCE_TYPE_OPTIONS } from '@/constants/sourceTypes'
import type { SourceWithScore } from '@/api/nutritionSourceBatch'

const props = defineProps<{
  sources: SourceWithScore[]
  activeId?: string | null
  selectedIds: string[]
  authoritativeSourceId?: string | null
}>()

const emit = defineEmits<{
  (e: 'select', id: string): void
  (e: 'toggle-select', id: string): void
  (e: 'clear-selection'): void
  (e: 'filter-type-change', types: string[]): void
}>()

const typeFilter = ref<string[]>([])

const filteredSources = computed(() => {
  if (typeFilter.value.length === 0) return props.sources
  return props.sources.filter((s) => typeFilter.value.includes(s.sourceType))
})

function handleClick(id: string) {
  emit('select', id)
}

function handleToggleSelect(id: string) {
  emit('toggle-select', id)
}

function isAuthoritative(id: string) {
  return props.authoritativeSourceId === id
}

watch(typeFilter, (val) => {
  emit('filter-type-change', val)
})
</script>

<style lang="scss" scoped>
.source-list-panel {
  display: flex;
  flex-direction: column;
  background: $bg-container;
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $space-4;
  border-bottom: 1px solid $border-color-light;
  flex-shrink: 0;
}

.panel-title {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin: 0;
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.title-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: $radius-pill;
  background: var(--color-primary-bg);
  color: var(--color-primary-deep);
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
}

.panel-toolbar {
  padding: $space-3 $space-4;
  border-bottom: 1px solid $border-color-light;
  flex-shrink: 0;
}

.panel-list {
  flex: 1;
  overflow-y: auto;
  padding: $space-3;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.empty-state {
  padding: $space-8 0;
}
</style>
