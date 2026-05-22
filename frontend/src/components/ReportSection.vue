<template>
  <div class="report-section-card" :class="[`section-${theme}`, { editing }]">
    <div class="section-header">
      <div class="section-header-left">
        <span class="section-icon" :style="{ color: iconColor }">
          <t-icon :name="icon" size="18px" />
        </span>
        <span class="section-title">{{ title }}</span>
      </div>
      <div class="section-header-right">
        <slot name="header-actions" />
        <button v-if="editable && !editing" class="section-edit-btn" @click="startEdit">
          <t-icon name="edit" size="14px" />
        </button>
        <template v-if="editing">
          <button class="section-save-btn" @click="saveEdit">
            <t-icon name="check" size="14px" />
          </button>
          <button class="section-cancel-btn" @click="cancelEdit">
            <t-icon name="close" size="14px" />
          </button>
        </template>
      </div>
    </div>
    <div class="section-body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  title: string
  icon?: string
  theme?: string
  iconColor?: string
  editable?: boolean
}>(), {
  icon: 'file',
  theme: 'formula',
  iconColor: '#3B82F6',
  editable: false,
})

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'save'): void
  (e: 'cancel'): void
}>()

const editing = ref(false)

const startEdit = () => {
  editing.value = true
  emit('edit')
}

const saveEdit = () => {
  editing.value = false
  emit('save')
}

const cancelEdit = () => {
  editing.value = false
  emit('cancel')
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.report-section-card {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  margin-bottom: 20px;
  overflow: hidden;
  transition: all 0.25s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
  }

  &.editing {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-bg);
  }

  &.section-formula { border-left: 3px solid #3B82F6; }
  &.section-sales { border-left: 3px solid var(--color-primary); }
  &.section-plans { border-left: 3px solid #8B5CF6; }
  &.section-summary { border-left: 3px solid var(--color-warning); }
  &.section-trend { border-left: 3px solid #06B6D4; }
  &.section-target { border-left: 3px solid var(--color-primary); }
  &.section-team { border-left: 3px solid #6366F1; }
  &.section-issues { border-left: 3px solid var(--color-danger); }
}

.section-header {
  padding: var(--space-3-5) 20px;
  background: var(--color-bg-page);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2-5);

  .section-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
  }

  .section-icon {
    display: flex;
    align-items: center;
  }

  .section-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    letter-spacing: 0.3px;
  }

  .section-header-right {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
  }
}

.section-body {
  padding: 20px;
}

.section-edit-btn,
.section-save-btn,
.section-cancel-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: #fff;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;

  &:hover {
    background: var(--color-bg-page);
    color: var(--color-primary);
    border-color: var(--color-primary-light);
  }
}

.section-save-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;

  &:hover {
    background: var(--color-primary-dark);
    border-color: var(--color-primary-dark);
    color: #fff;
  }
}

.section-cancel-btn:hover {
  background: #FEF2F2;
  color: var(--color-danger);
  border-color: #FCA5A5;
}
</style>
