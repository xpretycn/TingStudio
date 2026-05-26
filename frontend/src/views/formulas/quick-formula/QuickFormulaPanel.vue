<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useQuickFormulaListStore } from "@/stores/quickFormulaList";
import QuickFormulaSidebar from "./QuickFormulaSidebar.vue";
import PublishDrawer from "./PublishDrawer.vue";
import FormulaWorkspace from "./FormulaWorkspace.vue";
import type { QuickFormulaItem, QuickFormulaDraft } from "@/types/quickFormula";

const router = useRouter();
const quickFormulaStore = useQuickFormulaStore();
const quickFormulaListStore = useQuickFormulaListStore();

const isFullscreen = ref(false);
const showPublishDrawer = ref(false);
const currentQuickFormulaId = ref<string | null>(null);
const saving = ref(false);
const sidebarCollapsed = ref(false);

const ratioPercent = computed(() => (quickFormulaStore.totalRatio * 100).toFixed(1));
const isRatioOver = computed(() => quickFormulaStore.totalRatio > 1);
const nutrition = computed(() => quickFormulaStore.nutritionSummary);

const headerTitle = computed(() => {
  if (currentQuickFormulaId.value) {
    const item = quickFormulaListStore.list.find((i) => i.id === currentQuickFormulaId.value);
    return item?.name || quickFormulaStore.formulaName || "快速录入";
  }
  return quickFormulaStore.formulaName || "快速录入";
});

const statusLabel = computed(() => {
  if (quickFormulaStore.formulaStatus === "draft") return "草稿";
  if (currentQuickFormulaId.value) return "编辑中";
  return "新建";
});

const statusTagClass = computed(() => {
  if (quickFormulaStore.formulaStatus === "draft") return "status-tag--draft";
  if (currentQuickFormulaId.value) return "status-tag--editing";
  return "status-tag--new";
});

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

function handleBack() {
  if (quickFormulaStore.hasUnsavedChanges) {
    quickFormulaStore.saveDraft();
  }
  quickFormulaStore.exitEditMode();
  router.push("/formulas");
}

function handleSubmitSuccess() {
  router.push("/formulas");
}

function handleSelectPublished(_item: QuickFormulaItem) {
  MessagePlugin.info("已发布的配方请在配方管理中查看详情");
}

async function handleSelectQuickFormula(item: QuickFormulaItem) {
  currentQuickFormulaId.value = item.id;
  quickFormulaListStore.selectedId = item.id;
  quickFormulaStore.enterEditing(item.name);

  const detail = await quickFormulaListStore.loadQuickFormula(item.id);
  if (detail) {
    quickFormulaStore.formulaName = detail.name;
    quickFormulaStore.formulaData.ratioFactor = detail.ratioFactor;
    quickFormulaStore.formulaData.supplementRatioFactor = detail.supplementRatioFactor;
    quickFormulaStore.formulaData.finishedWeight = detail.finishedWeight;
    quickFormulaStore.formulaData.packagingPrice = detail.packagingPrice;
    quickFormulaStore.formulaData.otherPrice = detail.otherPrice;
    quickFormulaStore.formulaData.profitMargin = detail.profitMargin;
    quickFormulaStore.formulaData.materials = detail.materials.map((m) => ({
      materialId: m.materialId,
      materialName: m.materialName,
      quantity: m.quantity,
      materialType: m.materialType,
      unitPrice: m.unitPrice ?? null,
      nutrition: m.nutrition,
      version: m.version,
    }));
    quickFormulaStore.formulaStatus = "draft";
  }
}

function handleQuickFormulaCreated(item: QuickFormulaItem) {
  currentQuickFormulaId.value = item.id;
  quickFormulaListStore.selectedId = item.id;
  quickFormulaStore.enterEditing(item.name);
}

async function handleRestoreDraft(draft: QuickFormulaDraft) {
  const item = await quickFormulaListStore.createQuickFormula(draft.formulaName);
  if (item) {
    currentQuickFormulaId.value = item.id;
    quickFormulaListStore.selectedId = item.id;
  }
}

async function handleSave() {
  if (!currentQuickFormulaId.value) return;
  saving.value = true;
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
    };
    await quickFormulaListStore.saveQuickFormula(currentQuickFormulaId.value, data);
  } finally {
    saving.value = false;
  }
}

function handlePublished(_data: { formulaId: string; versionId: string; }) {
  MessagePlugin.success("配方已成功发布为正式配方");
  currentQuickFormulaId.value = null;
  quickFormulaListStore.selectedId = null;
  quickFormulaStore.exitEditMode();
  router.push("/formulas");
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
  quickFormulaListStore.fetchList();
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
        <t-popup v-if="currentQuickFormulaId" trigger="hover" placement="bottom-end"
          :popup-props="{ appendToBody: true, showArrow: true }">
          <button class="header-action-btn secondary">
            <t-icon name="chart" class="btn-icon" />
            速览
          </button>
          <template #content>
            <div class="nutrition-quick">
              <div class="nq-header">
                <t-icon name="chart-pie" size="14px" class="nq-header-icon" />
                <span class="nq-header-text">营养速览</span>
              </div>
              <div class="nq-divider"></div>
              <div class="nq-item" :class="{ 'nq-item--danger': isRatioOver }">
                <div class="nq-item-icon nq-icon--ratio">
                  <t-icon name="chart" size="12px" />
                </div>
                <span class="nq-item-label">含量比</span>
                <span class="nq-item-value">{{ ratioPercent }}%</span>
              </div>
              <div class="nq-item">
                <div class="nq-item-icon nq-icon--energy">
                  <t-icon name="flashlight" size="12px" />
                </div>
                <span class="nq-item-label">能量</span>
                <span class="nq-item-value">{{ nutrition.energy.toFixed(1) }} <small>kJ</small></span>
              </div>
              <div class="nq-item">
                <div class="nq-item-icon nq-icon--protein">
                  <t-icon name="flag" size="12px" />
                </div>
                <span class="nq-item-label">蛋白质</span>
                <span class="nq-item-value">{{ nutrition.protein.toFixed(1) }} <small>g</small></span>
              </div>
              <div class="nq-item">
                <div class="nq-item-icon nq-icon--fat">
                  <t-icon name="rain-light" size="12px" />
                </div>
                <span class="nq-item-label">脂肪</span>
                <span class="nq-item-value">{{ nutrition.fat.toFixed(1) }} <small>g</small></span>
              </div>
              <div class="nq-item">
                <div class="nq-item-icon nq-icon--carb">
                  <t-icon name="chart-pie" size="12px" />
                </div>
                <span class="nq-item-label">碳水</span>
                <span class="nq-item-value">{{ nutrition.carbohydrate.toFixed(1) }} <small>g</small></span>
              </div>
              <div class="nq-divider"></div>
              <div class="nq-item nq-item--highlight">
                <div class="nq-item-icon nq-icon--price">
                  <t-icon name="money" size="12px" />
                </div>
                <span class="nq-item-label">报价</span>
                <span class="nq-item-value">¥{{ quickFormulaStore.totalPrice.toFixed(2) }}</span>
              </div>
            </div>
          </template>
        </t-popup>
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
      <QuickFormulaSidebar :is-editing="!!currentQuickFormulaId" v-model:collapsed="sidebarCollapsed"
        @select="handleSelectQuickFormula" @select-published="handleSelectPublished" @create="handleQuickFormulaCreated"
        @restore-draft="handleRestoreDraft" />
      <div class="panel-main">
        <FormulaWorkspace :sidebar-collapsed="sidebarCollapsed" @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed"
          @submitted="handleSubmitSuccess" />
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
      color: $text-white;
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
        background-color: $emerald-600;
      }

      &:disabled {
        background-color: var(--color-text-placeholder);
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }

      &.secondary {
        background-color: $border-color-light;
        color: var(--color-text-secondary);
        box-shadow: $shadow-elevation-1;

        &:hover {
          background-color: var(--color-border);
          color: var(--color-text-secondary);
          box-shadow: $shadow-elevation-2;
        }

        &:active {
          background-color: $border-color;
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
  position: relative;
}

.panel-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: $space-3 $space-4;
  min-width: 0;

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

.nutrition-quick {
  min-width: 200px;
  padding: $space-1 0;
}

.nq-header {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1-5 $space-3 $space-1;
}

.nq-header-icon {
  color: $emerald-500;
}

.nq-header-text {
  font-size: $font-size-caption;
  font-weight: $font-weight-bold;
  color: $text-primary;
  letter-spacing: $ls-caption;
}

.nq-divider {
  height: 1px;
  background: $border-color-light;
  margin: $space-1 $space-2;
}

.nq-item {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1 $space-3;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
  }

  &--danger {
    .nq-item-value {
      color: $color-danger;
      font-weight: $font-weight-bold;
    }

    .nq-icon--ratio {
      background: $color-danger-medium;
      color: $color-danger;
    }
  }

  &--highlight {
    background: $overlay-emerald-04;

    .nq-item-value {
      color: $emerald-600;
      font-weight: $font-weight-bold;
    }
  }
}

.nq-item-icon {
  width: 20px;
  height: 20px;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.nq-icon--ratio {
  background: $overlay-emerald-08;
  color: $emerald-500;
}

.nq-icon--energy {
  background: rgba($chart-energy-deep, 0.08);
  color: $chart-energy-deep;
}

.nq-icon--protein {
  background: rgba($chart-protein-deep, 0.08);
  color: $chart-protein-deep;
}

.nq-icon--fat {
  background: rgba($chart-fat-deep, 0.08);
  color: $chart-fat-deep;
}

.nq-icon--carb {
  background: rgba($chart-carb-deep, 0.08);
  color: $chart-carb-deep;
}

.nq-icon--price {
  background: $overlay-emerald-08;
  color: $emerald-500;
}

.nq-item-label {
  flex: 1;
  font-size: $font-size-caption;
  color: $text-tertiary;
}

.nq-item-value {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: $text-primary;

  small {
    font-size: $font-size-caption;
    font-weight: $font-weight-regular;
    color: $text-tertiary;
    margin-left: $space-0-5;
  }
}
</style>
