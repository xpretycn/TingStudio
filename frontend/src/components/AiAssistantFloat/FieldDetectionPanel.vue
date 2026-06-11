<template>
  <div class="field-detection-panel">
    <div class="panel-header" @click="expanded = !expanded">
      <div class="panel-header-left">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/>
          <path d="M5 8h6M8 5v6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
        </svg>
        <span>字段检测结果</span>
      </div>
      <div class="panel-header-right">
        <span class="panel-summary">
          <span v-if="requiredMissing.length" class="summary-badge summary-badge--error">{{ requiredMissing.length }}</span>
          <span v-if="recommendedMissing.length" class="summary-badge summary-badge--warning">{{ recommendedMissing.length }}</span>
          <span v-if="!requiredMissing.length && !recommendedMissing.length" class="summary-ok">全部已填</span>
        </span>
        <svg class="panel-arrow" :class="{ 'panel-arrow--open': expanded }" width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <Transition name="panel-slide">
      <div v-if="expanded" class="panel-body">
        <!-- 必填缺失 -->
        <div v-if="requiredMissing.length" class="field-group">
          <div class="field-group-header field-group-header--error">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/>
              <path d="M8 5v4M8 11v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>必填字段缺失（{{ requiredMissing.length }}）</span>
          </div>
          <div class="field-list">
            <div v-for="field in requiredMissing" :key="field.key" class="field-item field-item--error" @click="handleFieldClick(field)">
              <span class="field-item-dot"></span>
              <span class="field-item-label">{{ field.label }}</span>
              <span class="field-item-consult">咨询</span>
            </div>
          </div>
        </div>

        <!-- 建议填写 -->
        <div v-if="recommendedMissing.length" class="field-group">
          <div class="field-group-header field-group-header--warning">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v10M8 13v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2" fill="none"/>
            </svg>
            <span>建议填写（{{ recommendedMissing.length }}）</span>
          </div>
          <div class="field-list">
            <div v-for="field in recommendedMissing" :key="field.key" class="field-item field-item--warning" @click="handleFieldClick(field)">
              <span class="field-item-dot"></span>
              <span class="field-item-label">{{ field.label }}</span>
              <span class="field-item-consult">咨询</span>
            </div>
          </div>
        </div>

        <!-- 全部完成 -->
        <div v-if="!requiredMissing.length && !recommendedMissing.length" class="field-all-done">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>所有字段已填写完整</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

export interface FieldItem {
  key: string;
  label: string;
  level: "required" | "recommended";
}

defineProps<{
  requiredMissing: FieldItem[];
  recommendedMissing: FieldItem[];
}>();

const emit = defineEmits<{
  consult: [fieldKey: string];
}>();

const expanded = ref(true);

function handleFieldClick(field: FieldItem) {
  emit("consult", field.key);
}
</script>

<style scoped lang="scss">
.field-detection-panel {
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-bg-container);
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: var(--color-bg-hover);
  }

  &-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  &-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.panel-summary {
  display: flex;
  align-items: center;
  gap: 4px;
}

.summary-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;

  &--error {
    background: var(--color-danger);
  }

  &--warning {
    background: var(--color-warning);
  }
}

.summary-ok {
  font-size: 12px;
  color: $brand-emerald;
  font-weight: 500;
}

.panel-arrow {
  color: var(--color-text-placeholder);
  transition: transform 0.2s;

  &--open {
    transform: rotate(180deg);
  }
}

.panel-body {
  padding: 0 16px 10px;
}

.field-group {
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }

  &-header {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 6px;

    &--error {
      color: var(--color-danger);
    }

    &--warning {
      color: var(--color-warning);
    }
  }
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
  font-size: 12px;

  &:hover {
    background: var(--color-bg-hover);

    .field-item-consult {
      opacity: 1;
    }
  }

  &--error {
    color: var(--color-text-primary);
  }

  &--warning {
    color: var(--color-text-secondary);
  }

  &-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;

    .field-item--error & {
      background: var(--color-danger);
    }

    .field-item--warning & {
      background: var(--color-warning);
    }
  }

  &-label {
    flex: 1;
  }

  &-consult {
    font-size: 11px;
    color: var(--color-primary);
    opacity: 0;
    transition: opacity 0.15s;
    font-weight: 500;
  }
}

.field-all-done {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $brand-emerald;
  padding: 4px 0;
}

.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}
</style>
