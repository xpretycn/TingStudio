<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from "vue"
import { useRouter, onBeforeRouteLeave } from "vue-router"
import { useQuickFormulaStore } from "@/stores/quickFormula"
import QuickFormulaEntry from "./QuickFormulaEntry.vue"
import FormulaDashboard from "./FormulaDashboard.vue"
import FormulaWorkspace from "./FormulaWorkspace.vue"

const router = useRouter()
const quickFormulaStore = useQuickFormulaStore()

const showCloseConfirm = ref(false)
const isFullscreen = ref(false)

function toggleFullscreen() {
  if (!isFullscreen.value) {
    const el = document.documentElement
    if (el.requestFullscreen) {
      el.requestFullscreen()
    }
    isFullscreen.value = true
  } else {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    isFullscreen.value = false
  }
}

function handleFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

let autoSaveTimer: ReturnType<typeof setTimeout> | null = null

const AUTO_SAVE_DELAY = 2000

const statusLabel = (() => {
  if (quickFormulaStore.formulaStatus === "draft") return "草稿"
  return "新建"
})()

const statusTagClass = quickFormulaStore.formulaStatus === "draft" ? "status-tag--draft" : "status-tag--new"

function navigateToDashboard() {
  router.push("/dashboard")
}

function handleClose() {
  if (quickFormulaStore.hasUnsavedChanges) {
    showCloseConfirm.value = true
    return
  }
  quickFormulaStore.exitEditMode()
  navigateToDashboard()
}

function confirmClose() {
  showCloseConfirm.value = false
  quickFormulaStore.saveDraft()
  quickFormulaStore.exitEditMode()
  navigateToDashboard()
}

function cancelClose() {
  showCloseConfirm.value = false
}

function handleBack() {
  if (quickFormulaStore.phase === "editing") {
    quickFormulaStore.phase = "entry"
  } else {
    handleClose()
  }
}

function handleSubmitSuccess() {
  navigateToDashboard()
}

function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  autoSaveTimer = setTimeout(() => {
    if (quickFormulaStore.hasUnsavedChanges && quickFormulaStore.phase === "editing") {
      quickFormulaStore.saveDraft()
    }
  }, AUTO_SAVE_DELAY)
}

watch(
  () => [quickFormulaStore.hasUnsavedChanges, quickFormulaStore.formulaData],
  () => {
    if (quickFormulaStore.phase === "editing") {
      scheduleAutoSave()
    }
  },
  { deep: true }
)

function handleBeforeUnload(event: BeforeUnloadEvent) {
  if (quickFormulaStore.hasUnsavedChanges) {
    event.preventDefault()
  }
}

onBeforeRouteLeave(() => {
  if (quickFormulaStore.hasUnsavedChanges) {
    quickFormulaStore.saveDraft()
  }
  quickFormulaStore.exitEditMode()
})

onMounted(() => {
  window.addEventListener("beforeunload", handleBeforeUnload)
  document.addEventListener("fullscreenchange", handleFullscreenChange)
})

onBeforeUnmount(() => {
  window.removeEventListener("beforeunload", handleBeforeUnload)
  document.removeEventListener("fullscreenchange", handleFullscreenChange)
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
    autoSaveTimer = null
  }
})
</script>

<template>
  <div class="quick-formula-panel" :class="{ 'quick-formula-panel--fullscreen': isFullscreen }">
    <header class="panel-header">
      <div class="header-left">
        <button class="header-btn" @click="handleBack">
          <t-icon name="chevron-left" size="20px" />
        </button>
        <span class="header-name">{{ quickFormulaStore.formulaName || "快速录入" }}</span>
        <span v-if="quickFormulaStore.phase === 'editing'" class="status-tag" :class="statusTagClass">
          {{ statusLabel }}
        </span>
      </div>
      <div class="header-right">
        <t-tooltip :content="isFullscreen ? '退出全屏' : '全屏模式'">
          <button class="header-btn" @click="toggleFullscreen">
            <t-icon :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" size="18px" />
          </button>
        </t-tooltip>
        <t-popconfirm
          v-model="showCloseConfirm"
          content="有未保存的更改，是否保存为草稿？"
          confirm-btn="保存草稿"
          cancel-btn="不保存"
          @confirm="confirmClose"
          @cancel="cancelClose"
        >
          <button class="header-btn" @click="handleClose">
            <t-icon name="close" size="20px" />
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 $space-4;
  border-bottom: 1px solid $border-color;
  background: $bg-container;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: $space-3;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: $radius-lg;
  border: none;
  background: transparent;
  color: $text-regular;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }
}

.header-name {
  font-size: $font-size-h3;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  letter-spacing: $ls-heading;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  padding: $space-0-5 $space-2-5;
  border-radius: $radius-pill;
  font-size: $font-size-micro;
  font-weight: $font-weight-medium;
  letter-spacing: $ls-caption;

  &--new {
    background: $overlay-emerald-08;
    color: $brand-emerald;
  }

  &--draft {
    background: $color-warning-bg;
    color: $color-warning;
  }
}

.header-right {
  display: flex;
  align-items: center;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: $space-4 $space-6;
}

.quick-formula-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: $bg-page;

  .panel-body {
    padding: $space-6;
  }
}
</style>
