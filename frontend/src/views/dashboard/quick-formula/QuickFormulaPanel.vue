<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import QuickFormulaEntry from "./QuickFormulaEntry.vue";
import FormulaDashboard from "./FormulaDashboard.vue";
import FormulaWorkspace from "./FormulaWorkspace.vue";

const router = useRouter();
const quickFormulaStore = useQuickFormulaStore();

const showCloseConfirm = ref(false);
const isFullscreen = ref(false);

function toggleFullscreen() {
  if (!isFullscreen.value) {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen();
    }
    isFullscreen.value = true;
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
    isFullscreen.value = false;
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement;
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

const AUTO_SAVE_DELAY = 2000;

const statusLabel = (() => {
  if (quickFormulaStore.formulaStatus === "draft") return "草稿";
  return "新建";
})();

const statusTagClass = quickFormulaStore.formulaStatus === "draft" ? "status-tag--draft" : "status-tag--new";

function navigateToDashboard() {
  router.push("/dashboard");
}

function handleClose() {
  if (quickFormulaStore.hasUnsavedChanges) {
    showCloseConfirm.value = true;
    return;
  }
  quickFormulaStore.exitEditMode();
  navigateToDashboard();
}

function confirmClose() {
  showCloseConfirm.value = false;
  quickFormulaStore.saveDraft();
  quickFormulaStore.exitEditMode();
  navigateToDashboard();
}

function cancelClose() {
  showCloseConfirm.value = false;
}

function handleBack() {
  if (quickFormulaStore.phase === "editing") {
    quickFormulaStore.phase = "entry";
  } else {
    handleClose();
  }
}

function handleSubmitSuccess() {
  navigateToDashboard();
}

function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    if (quickFormulaStore.hasUnsavedChanges && quickFormulaStore.phase === "editing") {
      quickFormulaStore.saveDraft();
    }
  }, AUTO_SAVE_DELAY);
}

watch(
  () => [quickFormulaStore.hasUnsavedChanges, quickFormulaStore.formulaData],
  () => {
    if (quickFormulaStore.phase === "editing") {
      scheduleAutoSave();
    }
  },
  { deep: true }
);

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (quickFormulaStore.hasUnsavedChanges) {
    event.preventDefault();
  }
}

onBeforeRouteLeave(() => {
  if (quickFormulaStore.hasUnsavedChanges) {
    quickFormulaStore.saveDraft();
  }
  quickFormulaStore.exitEditMode();
});

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload);
  document.addEventListener("fullscreenchange", handleFullscreenChange);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload);
  document.removeEventListener("fullscreenchange", handleFullscreenChange);
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
});
</script>

<template>
  <div class="quick-formula-panel" :class="{ 'quick-formula-panel--fullscreen': isFullscreen }">
    <header class="panel-header">
      <div class="header-left">
        <button class="header-back-btn" @click="handleBack" title="返回" aria-label="返回">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="navigateToDashboard">工作台</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">快速录入</span>
          </nav>
          <h2 class="formula-title">
            {{ quickFormulaStore.formulaName || "快速录入" }}
            <span v-if="quickFormulaStore.phase === 'editing'" class="title-status-tag" :class="statusTagClass">
              {{ statusLabel }}
            </span>
          </h2>
        </div>
      </div>
      <div class="header-actions">
        <t-tooltip :content="isFullscreen ? '退出全屏' : '全屏模式'">
          <button class="header-action-btn secondary" @click="toggleFullscreen"
            :aria-label="isFullscreen ? '退出全屏' : '全屏模式'">
            <t-icon :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" class="btn-icon" />
          </button>
        </t-tooltip>
        <t-popconfirm v-model="showCloseConfirm" content="有未保存的更改，是否保存为草稿？" confirm-btn="保存草稿" cancel-btn="不保存"
          @confirm="confirmClose" @cancel="cancelClose">
          <button class="header-action-btn secondary" @click="handleClose" aria-label="关闭">
            <t-icon name="close" class="btn-icon" />
            关闭
          </button>
        </t-popconfirm>
      </div>
    </header>
    <div class="panel-body">
      <QuickFormulaEntry v-if="quickFormulaStore.phase === 'entry'" />
      <template v-else>
        <FormulaDashboard />
        <FormulaWorkspace @submitted="handleSubmitSuccess" />
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.quick-formula-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.panel-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px $space-5;
  background-color: $overlay-white-80;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid $border-color-light;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-4;
}

.header-back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: $radius-xl;
  background: transparent;
  color: $text-placeholder;
  cursor: pointer;
  transition: all $transition-fast;
  font-size: 20px;

  &:hover {
    color: $emerald-500;
    background-color: $emerald-50;
  }
}

.header-title-group {
  display: flex;
  flex-direction: column;
  gap: $space-1-5;
}

.header-breadcrumb {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  font-size: 12px;
  line-height: 1;
}

.breadcrumb-link {
  color: $text-placeholder;
  cursor: pointer;
  transition: color 0.15s;
  text-decoration: none;

  &:hover {
    color: $emerald-500;
  }
}

.breadcrumb-sep {
  font-size: 12px;
  color: $text-placeholder;
}

.breadcrumb-current {
  color: $text-secondary;
}

.formula-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: $space-2;
  font-size: 18px;
  font-weight: 700;
  color: $text-primary;
  line-height: 1.35;
}

.title-status-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: $radius-pill;
  font-size: 12px;
  font-weight: 700;

  &--new {
    background: $overlay-emerald-08;
    color: $brand-emerald;
  }

  &--draft {
    background: $color-warning-bg;
    color: $color-warning;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.header-action-btn {
  display: inline-flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-4;
  background-color: $emerald-500;
  color: #ffffff;
  border: none;
  border-radius: $radius-xl;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 10px 15px -3px $overlay-emerald-25;
  cursor: pointer;
  transition: all $transition-fast;

  .btn-icon {
    font-size: 18px;
  }

  &:hover {
    background-color: $emerald-600;
    transform: translateY(-1px);
    box-shadow: 0 14px 20px -3px $overlay-emerald-35;
  }

  &:active {
    transform: translateY(0);
    background-color: var(--color-primary-deep);
  }

  &.secondary {
    background-color: $border-color-light;
    color: $text-secondary;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10);

    &:hover {
      background-color: var(--color-border);
      color: $text-secondary;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.10);
    }
  }
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: $space-4 $space-6;

  > :deep(.formula-dashboard) {
    flex: 4.5;
    overflow: hidden;
  }

  > :deep(.formula-workspace) {
    flex: 5.5;
    min-height: 0;
    overflow: hidden;
  }
}

.quick-formula-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: $bg-page;

  .panel-body {
    padding: $space-4;
  }
}
</style>
