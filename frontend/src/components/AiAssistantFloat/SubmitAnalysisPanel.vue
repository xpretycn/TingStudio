<template>
  <div class="submit-analysis-panel">
    <div class="panel-header" @click="expanded = !expanded">
      <div class="panel-header-left">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/>
          <path d="M8 5v4M8 11v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <span>提交问题分析</span>
      </div>
      <div class="panel-header-right">
        <span v-if="errorCount" class="error-badge">{{ errorCount }}</span>
        <span v-else-if="warningCount" class="warning-badge">{{ warningCount }}</span>
        <span v-else class="pass-text">全部通过</span>
        <svg class="panel-arrow" :class="{ 'panel-arrow--open': expanded }" width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>

    <Transition name="panel-slide">
      <div v-if="expanded" class="panel-body">
        <!-- 错误项 -->
        <div v-if="errors.length" class="issue-group">
          <div class="issue-group-header issue-group-header--error">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/>
              <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <span>{{ errors.length }} 项错误（阻止提交）</span>
          </div>
          <div class="issue-list">
            <div v-for="(item, idx) in errors" :key="idx" class="issue-item issue-item--error">
              <div class="issue-item-main">
                <span class="issue-item-dot"></span>
                <span class="issue-item-text">{{ item.message }}</span>
              </div>
              <div v-if="item.suggestion" class="issue-item-suggestion">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M8 4v5M8 11v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ item.suggestion }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 警告项 -->
        <div v-if="warnings.length" class="issue-group">
          <div class="issue-group-header issue-group-header--warning">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v10M8 13v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.2" fill="none"/>
            </svg>
            <span>{{ warnings.length }} 项警告（建议处理）</span>
          </div>
          <div class="issue-list">
            <div v-for="(item, idx) in warnings" :key="idx" class="issue-item issue-item--warning">
              <div class="issue-item-main">
                <span class="issue-item-dot"></span>
                <span class="issue-item-text">{{ item.message }}</span>
              </div>
              <div v-if="item.suggestion" class="issue-item-suggestion">
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <path d="M8 4v5M8 11v0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span>{{ item.suggestion }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 全部通过 -->
        <div v-if="!errors.length && !warnings.length" class="all-pass">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.2" fill="none"/>
            <path d="M5 8l2 2 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>表单校验全部通过，可以提交</span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

export interface SubmitIssue {
  type: "error" | "warning";
  message: string;
  suggestion?: string;
}

const props = defineProps<{
  issues: SubmitIssue[];
}>();

const expanded = ref(true);

const errors = computed(() => props.issues.filter(i => i.type === "error"));
const warnings = computed(() => props.issues.filter(i => i.type === "warning"));
const errorCount = computed(() => errors.value.length);
const warningCount = computed(() => warnings.value.length);
</script>

<style scoped lang="scss">
.submit-analysis-panel {
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

.error-badge, .warning-badge {
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
}

.error-badge {
  background: var(--color-danger);
}

.warning-badge {
  background: var(--color-warning);
}

.pass-text {
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

.issue-group {
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

.issue-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.issue-item {
  padding: 6px 8px;
  border-radius: 6px;
  font-size: 12px;

  &--error {
    background: rgba(227, 77, 89, 0.04);
  }

  &--warning {
    background: rgba(240, 160, 64, 0.04);
  }

  &-main {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  &-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    margin-top: 4px;
    flex-shrink: 0;

    .issue-item--error & {
      background: var(--color-danger);
    }

    .issue-item--warning & {
      background: var(--color-warning);
    }
  }

  &-text {
    color: var(--color-text-primary);
    line-height: 1.4;
  }

  &-suggestion {
    display: flex;
    align-items: flex-start;
    gap: 4px;
    margin-top: 4px;
    margin-left: 12px;
    color: var(--color-text-secondary);
    font-size: 11px;
    line-height: 1.4;

    svg {
      margin-top: 2px;
      flex-shrink: 0;
      color: var(--color-primary);
    }
  }
}

.all-pass {
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
