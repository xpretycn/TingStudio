<template>
  <Transition name="batch-bar">
    <div v-if="selectedCount > 0" class="batch-action-bar">
      <div class="bar-info">
        <t-icon name="check-circle-filled" class="info-icon" />
        <span class="info-text">已选 <strong>{{ selectedCount }}</strong> 个来源</span>
      </div>
      <div class="bar-actions">
        <t-button
          theme="primary"
          size="small"
          :loading="authoritativeLoading"
          @click="emit('set-authoritative')"
        >
          <template #icon><t-icon name="star" /></template>
          批量设为主用
        </t-button>
        <t-popconfirm
          v-if="canArchive"
          content="归档后这些来源将不再参与对比，确认操作？"
          @confirm="emit('archive')"
        >
          <t-button theme="default" size="small" :loading="archiveLoading">
            <template #icon><t-icon name="archive" /></template>
            批量归档
          </t-button>
        </t-popconfirm>
        <t-button theme="default" variant="text" size="small" @click="emit('clear')">
          取消
        </t-button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{
  selectedCount: number
  canArchive?: boolean
  authoritativeLoading?: boolean
  archiveLoading?: boolean
}>()

const emit = defineEmits<{
  (e: 'set-authoritative'): void
  (e: 'archive'): void
  (e: 'clear'): void
}>()
</script>

<style lang="scss" scoped>
.batch-action-bar {
  position: fixed;
  bottom: $space-6;
  left: 50%;
  transform: translateX(-50%);
  z-index: $z-toast;
  display: flex;
  align-items: center;
  gap: $space-5;
  padding: $space-3 $space-5;
  background: $bg-container;
  border: 1px solid var(--color-primary);
  border-radius: $radius-2xl;
  box-shadow: $shadow-float;

  @media (max-width: 768px) {
    left: $space-3;
    right: $space-3;
    transform: none;
    flex-direction: column;
    align-items: stretch;
    gap: $space-3;
  }
}

.bar-info {
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: $font-size-body;
  color: $text-primary;
}

.info-icon {
  color: var(--color-primary);
  font-size: 18px;
}

.info-text strong {
  color: var(--color-primary-deep);
  font-weight: $font-weight-semibold;
  margin: 0 2px;
}

.bar-actions {
  display: flex;
  align-items: center;
  gap: $space-2;
}

.batch-bar-enter-active,
.batch-bar-leave-active {
  transition: all $transition-normal;
}

.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

@media (max-width: 768px) {
  .batch-bar-enter-from,
  .batch-bar-leave-to {
    transform: translateY(20px);
  }
}
</style>
