<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue"
import { useRouter, onBeforeRouteLeave } from "vue-router"
import { MessagePlugin } from "tdesign-vue-next"
import { useQuickFormulaStore } from "@/stores/quickFormula"
import { useQuickFormulaListStore } from "@/stores/quickFormulaList"
import QuickFormulaEntry from "./QuickFormulaEntry.vue"
import QuickFormulaSidebar from "./QuickFormulaSidebar.vue"
import PublishDrawer from "./PublishDrawer.vue"
import FormulaDashboard from "./FormulaDashboard.vue"
import FormulaWorkspace from "./FormulaWorkspace.vue"
import type { QuickFormulaItem } from "@/types/quickFormula"

const router = useRouter()
const quickFormulaStore = useQuickFormulaStore()
const quickFormulaListStore = useQuickFormulaListStore()

const isFullscreen = ref(false)
const showPublishDrawer = ref(false)
const currentQuickFormulaId = ref<string | null>(null)
const saving = ref(false)

const headerTitle = computed(() => {
  if (currentQuickFormulaId.value) {
    const item = quickFormulaListStore.list.find((i) => i.id === currentQuickFormulaId.value)
    return item?.name || quickFormulaStore.formulaName || "快速录入"
  }
  return quickFormulaStore.formulaName || "快速录入"
})

const statusLabel = computed(() => {
  if (quickFormulaStore.formulaStatus === "draft") return "草稿"
  if (currentQuickFormulaId.value) return "编辑中"
  return "新建"
})

const statusTagClass = computed(() => {
  if (quickFormulaStore.formulaStatus === "draft") return "status-tag--draft"
  if (currentQuickFormulaId.value) return "status-tag--editing"
  return "status-tag--new"
})

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

function handleBack() {
  if (quickFormulaStore.hasUnsavedChanges) {
    quickFormulaStore.saveDraft()
  }
  quickFormulaStore.exitEditMode()
  router.push("/formulas")
}

function handleSubmitSuccess() {
  router.push("/formulas")
}

async function handleSelectQuickFormula(item: QuickFormulaItem) {
  currentQuickFormulaId.value = item.id
  quickFormulaListStore.selectedId = item.id
  quickFormulaStore.enterEditing(item.name)

  // 加载快速配方详情并填充 store
  const detail = await quickFormulaListStore.loadQuickFormula(item.id)
  if (detail) {
    quickFormulaStore.formulaName = detail.name
    quickFormulaStore.formulaData.ratioFactor = detail.ratioFactor
    quickFormulaStore.formulaData.supplementRatioFactor = detail.supplementRatioFactor
    quickFormulaStore.formulaData.finishedWeight = detail.finishedWeight
    quickFormulaStore.formulaData.packagingPrice = detail.packagingPrice
    quickFormulaStore.formulaData.otherPrice = detail.otherPrice
    quickFormulaStore.formulaData.profitMargin = detail.profitMargin
    quickFormulaStore.formulaData.materials = detail.materials.map((m) => ({
      materialId: m.materialId,
      materialName: m.materialName,
      quantity: m.quantity,
      materialType: m.materialType,
      unitPrice: m.unitPrice ?? null,
      nutrition: m.nutrition,
      version: m.version,
    }))
    quickFormulaStore.formulaStatus = "draft"
  }
}

function handleSelectPublished(item: QuickFormulaItem) {
  // 已发布的快速配方：复用创建新配方
  MessagePlugin.info(`复用已发布配方「${item.name}」创建新配方`)
  handleSelectQuickFormula(item)
}

function handleQuickFormulaCreated(item: QuickFormulaItem) {
  currentQuickFormulaId.value = item.id
  quickFormulaListStore.selectedId = item.id
  quickFormulaStore.enterEditing(item.name)
}

async function handleEntryStart(name: string) {
  const item = await quickFormulaListStore.createQuickFormula(name)
  if (item) {
    currentQuickFormulaId.value = item.id
    quickFormulaListStore.selectedId = item.id
    quickFormulaStore.enterEditing(name)
  }
}

async function handleSave() {
  if (!currentQuickFormulaId.value) return
  saving.value = true
  try {
    const data: Record<string, unknown> = {
      name: quickFormulaStore.formulaName,
      ratioFactor: quickFormulaStore.formulaData.ratioFactor,
      supplementRatioFactor: quickFormulaStore.formulaData.supplementRatioFactor,
      finishedWeight: quickFormulaStore.formulaData.finishedWeight,
      packagingPrice: quickFormulaStore.formulaData.packagingPrice,
      otherPrice: quickFormulaStore.formulaData.otherPrice,
      profitMargin: quickFormulaStore.formulaData.profitMargin,
      materials: quickFormulaStore.formulaData.materials,
    }
    await quickFormulaListStore.saveQuickFormula(currentQuickFormulaId.value, data)
  } finally {
    saving.value = false
  }
}

function handlePublished(_data: { formulaId: string; versionId: string }) {
  MessagePlugin.success("配方已成功发布为正式配方")
  currentQuickFormulaId.value = null
  quickFormulaListStore.selectedId = null
  quickFormulaStore.exitEditMode()
  router.push("/formulas")
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
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="handleBack" title="返回列表" aria-label="返回配方列表">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="handleBack">配方管理</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">快速录入</span>
          </nav>
          <h2 class="formula-title">
            {{ headerTitle }}
            <span v-if="quickFormulaStore.phase === 'editing' || currentQuickFormulaId" class="title-status-tag"
              :class="statusTagClass">
              {{ statusLabel }}
            </span>
          </h2>
        </div>
      </div>
      <div class="header-actions">
        <button class="header-action-btn secondary" @click="handleBack" aria-label="取消，返回列表">
          <t-icon name="close" class="btn-icon" />
          取消
        </button>
        <button v-if="currentQuickFormulaId" class="header-action-btn" :disabled="saving" @click="handleSave">
          <t-icon name="save" class="btn-icon" />
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <button v-if="currentQuickFormulaId" class="header-action-btn" @click="showPublishDrawer = true">
          <t-icon name="upload" class="btn-icon" />
          发布
        </button>
        <t-tooltip :content="isFullscreen ? '退出全屏' : '全屏模式'">
          <button class="header-action-btn secondary" @click="toggleFullscreen"
            :aria-label="isFullscreen ? '退出全屏' : '全屏模式'">
            <t-icon :name="isFullscreen ? 'fullscreen-exit' : 'fullscreen'" class="btn-icon" />
          </button>
        </t-tooltip>
      </div>
    </header>
    <div class="panel-body">
      <QuickFormulaSidebar @select="handleSelectQuickFormula" @select-published="handleSelectPublished"
        @create="handleQuickFormulaCreated" />
      <div class="panel-main">
        <QuickFormulaEntry v-if="!currentQuickFormulaId" @start="handleEntryStart" />
        <template v-else>
          <FormulaDashboard />
          <FormulaWorkspace @submitted="handleSubmitSuccess" />
        </template>
      </div>
    </div>
    <PublishDrawer :visible="showPublishDrawer" :quick-formula-id="currentQuickFormulaId || ''"
      @update:visible="showPublishDrawer = $event" @published="handlePublished" />
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Header 区域 — 精确复刻 FormulaForm.vue
// 布局：sticky 顶栏 | 左侧：返回+面包屑+标题 | 右侧：emerald按钮
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

.detail-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 24px;
  background-color: $overlay-white-80;
  backdrop-filter: blur(12px);
  border-bottom: 1px solid $border-color-light;
  animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
  flex-shrink: 0;

  // ── 左侧：返回按钮 + 标题组 ──
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .header-back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 12px;
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
      gap: var(--space-1-5);

      .header-breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 12px;
        line-height: 1;

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
          color: var(--color-text-secondary);
        }
      }

      .formula-title {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
        line-height: 1.35;

        .title-status-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          border-radius: $radius-pill;
          font-size: 12px;
          font-weight: 700;

          &.status-tag--new {
            background: $overlay-emerald-08;
            color: $brand-emerald;
          }

          &.status-tag--draft {
            background: $color-warning-bg;
            color: $color-warning;
          }

          &.status-tag--editing {
            background: $color-info-bg;
            color: $color-info;
          }
        }
      }
    }
  }

  // ── 右侧：操作按钮组（emerald 绿色系）──
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;

    .header-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background-color: $emerald-500;
      color: #ffffff;
      border: none;
      border-radius: 12px;
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

      &:disabled {
        background-color: var(--color-text-placeholder);
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }

      // 次要按钮样式
      &.secondary {
        background-color: $border-color-light;
        color: var(--color-text-secondary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.10);

        &:hover {
          background-color: var(--color-border);
          color: var(--color-text-secondary);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.10);
        }

        &:active {
          background-color: #cbd5e1;
        }
      }
    }
  }
}

.panel-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.panel-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: $space-4 $space-6;
  min-width: 0;

  > :deep(.formula-dashboard) {
    flex: none;
    overflow: hidden;
  }

  > :deep(.formula-workspace) {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
}

.quick-formula-panel--fullscreen {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: $bg-page;

  .panel-main {
    padding: $space-4;
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
