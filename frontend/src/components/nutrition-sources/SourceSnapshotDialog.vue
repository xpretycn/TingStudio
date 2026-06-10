<template>
  <t-dialog
    :visible="visible"
    header="营养数据来源 · 变更历史"
    :width="720"
    :footer="false"
    @close="emit('update:visible', false)"
  >
    <div class="snapshot-dialog">
      <div class="dialog-toolbar">
        <t-input
          v-model="searchKeyword"
          placeholder="搜索操作人/操作/备注"
          clearable
          size="small"
          style="width: 280px"
        >
          <template #prefix-icon><t-icon name="search" /></template>
        </t-input>
        <t-button theme="default" size="small" :loading="loading" @click="handleRefresh">
          <template #icon><t-icon name="refresh" /></template>
          刷新
        </t-button>
      </div>

      <div v-if="filteredSnapshots.length === 0 && !loading" class="empty">
        <t-empty description="暂无变更历史" />
      </div>

      <ol v-else class="snapshot-list">
        <li
          v-for="snap in filteredSnapshots"
          :key="snap.snapshotId"
          class="snapshot-item"
          :class="`snapshot-item--${snap.action}`"
          @click="toggleExpand(snap.snapshotId)"
        >
          <div class="item-dot" :class="`item-dot--${actionTheme(snap.action)}`">
            <t-icon :name="actionIcon(snap.action)" />
          </div>
          <div class="item-content">
            <div class="item-header">
              <span class="item-action">{{ snap.actionLabel }}</span>
              <span class="item-time">{{ formatTimestamp(snap.createdAt) }}</span>
            </div>
            <div class="item-meta">
              <span class="meta-operator">
                <t-icon name="user" size="12px" />
                {{ snap.operatorName || snap.operatorId || '系统' }}
              </span>
              <span class="meta-affected">
                <t-icon name="link" size="12px" />
                {{ snap.affectedSourceIds.length }} 个来源
              </span>
            </div>
            <div v-if="snap.note" class="item-note">{{ snap.note }}</div>
            <div v-if="expandedId === snap.snapshotId" class="item-payload">
              <pre>{{ formatJson(snap.payload) }}</pre>
            </div>
          </div>
          <t-icon
            class="item-toggle"
            :name="expandedId === snap.snapshotId ? 'chevron-up' : 'chevron-down'"
            size="14px"
          />
        </li>
      </ol>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { formatTimestamp } from '@/utils/timeFormat'
import { MessagePlugin } from 'tdesign-vue-next'
import { nutritionSourceBatchApi } from '@/api/nutritionSourceBatch'

interface SnapshotItem {
  snapshotId: string
  action: string
  actionLabel: string
  operatorId: string
  operatorName: string | null
  affectedSourceIds: string[]
  payload: Record<string, unknown>
  note: string | null
  createdAt: string
}

const props = defineProps<{
  visible: boolean
  materialId: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
}>()

const snapshots = ref<SnapshotItem[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const expandedId = ref<string | null>(null)

const filteredSnapshots = computed(() => {
  const k = searchKeyword.value.trim().toLowerCase()
  if (!k) return snapshots.value
  return snapshots.value.filter((s) => {
    return (
      (s.actionLabel ?? '').toLowerCase().includes(k) ||
      (s.operatorName ?? '').toLowerCase().includes(k) ||
      (s.operatorId ?? '').toLowerCase().includes(k) ||
      (s.note ?? '').toLowerCase().includes(k)
    )
  })
})

async function loadSnapshots() {
  if (!props.materialId) return
  loading.value = true
  try {
    const res = await nutritionSourceBatchApi.listSnapshots(props.materialId, 100)
    snapshots.value = res.snapshots
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '加载失败'
    MessagePlugin.error(msg)
  } finally {
    loading.value = false
  }
}

function handleRefresh() {
  loadSnapshots()
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function formatJson(payload: Record<string, unknown>): string {
  return JSON.stringify(payload, null, 2)
}

function actionTheme(action: string): 'primary' | 'warning' | 'success' | 'default' {
  if (action === 'batch_set_authoritative') return 'primary'
  if (action === 'batch_archive') return 'warning'
  if (action === 'batch_restore') return 'success'
  return 'default'
}

function actionIcon(action: string): string {
  if (action === 'batch_set_authoritative') return 'star'
  if (action === 'batch_archive') return 'archive'
  if (action === 'batch_restore') return 'rollback'
  return 'edit'
}

watch(
  () => props.visible,
  (val) => {
    if (val && props.materialId) {
      loadSnapshots()
    }
  },
)
</script>

<style lang="scss" scoped>
.snapshot-dialog {
  display: flex;
  flex-direction: column;
  gap: $space-3;
  max-height: 60vh;
}

.dialog-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
}

.empty {
  padding: $space-12 0;
}

.snapshot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  max-height: 480px;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.snapshot-item {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
  padding: $space-3;
  background: var(--color-bg-container-alt);
  border-radius: $radius-md;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--color-primary-bg);
    border-color: var(--color-primary-lighter);
  }

  &--batch_set_authoritative {
    border-left: 3px solid var(--color-primary);
  }
  &--batch_archive {
    border-left: 3px solid $color-warning;
  }
  &--batch_restore {
    border-left: 3px solid $color-success;
  }
}

.item-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: $radius-circle;
  flex-shrink: 0;
  font-size: 14px;

  &--primary { background: var(--color-primary-bg); color: var(--color-primary); }
  &--warning { background: $color-warning-light; color: $color-warning; }
  &--success { background: $color-success-light; color: $color-success; }
  &--default { background: var(--color-bg-hover); color: var(--color-text-secondary); }
}

.item-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
}

.item-action {
  font-size: $font-size-body;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.item-time {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.item-meta {
  display: flex;
  align-items: center;
  gap: $space-3;
  font-size: $font-size-caption;
  color: var(--color-text-secondary);
}

.meta-operator,
.meta-affected {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
}

.item-note {
  font-size: $font-size-caption;
  color: var(--color-text-secondary);
  padding: $space-1-5 $space-2;
  background: var(--color-bg-container);
  border-radius: $radius-xs;
  border-left: 2px solid var(--color-primary);
}

.item-payload {
  margin-top: $space-2;
  padding: $space-2;
  background: var(--color-bg-page);
  border-radius: $radius-xs;
  border: 1px solid var(--color-border);
  font-family: $font-family-mono;
  font-size: $font-size-caption;
  max-height: 200px;
  overflow: auto;

  pre {
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.item-toggle {
  color: var(--color-text-placeholder);
  align-self: center;
  flex-shrink: 0;
}
</style>
