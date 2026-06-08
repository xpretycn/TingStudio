<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter, onBeforeRouteLeave } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useQuickFormulaListStore } from "@/stores/quickFormulaList";
import { useFormulaStore } from "@/stores/formula";
import QuickFormulaSidebar from "./QuickFormulaSidebar.vue";
import PublishDrawer from "./PublishDrawer.vue";
import FormulaWorkspace from "./FormulaWorkspace.vue";
import TemplateManager from "./TemplateManager.vue";
import type { QuickFormulaItem, QuickFormulaDraft, FormulaTemplate } from "@/types/quickFormula";

const router = useRouter();
const quickFormulaStore = useQuickFormulaStore();
const quickFormulaListStore = useQuickFormulaListStore();
const formulaStore = useFormulaStore();

const isFullscreen = ref(false);
const showPublishDrawer = ref(false);
const showTemplateManager = ref(false);
const currentQuickFormulaId = ref<string | null>(null);
const saving = ref(false);
const sidebarCollapsed = ref(false);
const triggerCreate = ref(false);
const sidebarRef = ref<InstanceType<typeof QuickFormulaSidebar> | null>(null);

const ratioPercent = computed(() => (quickFormulaStore.totalRatio * 100).toFixed(1));
const isRatioOver = computed(() => quickFormulaStore.totalRatio > 1);
const nutrition = computed(() => quickFormulaStore.nutritionSummary);

const nrvPercent = computed(() => quickFormulaStore.nrvPercent);

const headerTitle = computed(() => {
  if (currentQuickFormulaId.value) {
    const item = quickFormulaListStore.list.find((i) => i.id === currentQuickFormulaId.value);
    return item?.name || quickFormulaStore.formulaName || "快速录入";
  }
  return quickFormulaStore.formulaName || "快速录入";
});

const statusLabel = computed(() => {
  if (isCurrentPublished.value) return "已发布";
  if (quickFormulaStore.formulaStatus === "draft") return "草稿";
  if (currentQuickFormulaId.value) return "编辑中";
  return "新建";
});

const statusTagClass = computed(() => {
  if (isCurrentPublished.value) return "status-tag--published";
  if (quickFormulaStore.formulaStatus === "draft") return "status-tag--draft";
  if (currentQuickFormulaId.value) return "status-tag--editing";
  return "status-tag--new";
});

const currentFormulaItem = computed(() => {
  if (!currentQuickFormulaId.value) return null;
  return quickFormulaListStore.list.find((i) => i.id === currentQuickFormulaId.value) || null;
});

const isCurrentPublished = computed(() => currentFormulaItem.value?.status === "published");

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
    quickFormulaStore.formulaStatus = detail.status === "published" ? "published" : "draft";
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

async function handleSave(id?: string) {
  const targetId = id || currentQuickFormulaId.value;
  if (!targetId) return;
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
    const success = await quickFormulaListStore.saveQuickFormula(targetId, data);
    if (!success) return;
    quickFormulaStore.clearDraft();
    quickFormulaStore.hasUnsavedChanges = false;
    sidebarRef.value?.clearDraftBanner();
  } finally {
    saving.value = false;
  }
}

function handlePublished(_data: { formulaId: string; versionId: string; }) {
  MessagePlugin.success("配方已成功发布为正式配方");
  quickFormulaStore.clearDraft();
  currentQuickFormulaId.value = null;
  quickFormulaListStore.selectedId = null;
  quickFormulaStore.exitEditMode();
  // 使配方管理列表缓存失效，确保跳转后列表从 API 拉取最新数据
  formulaStore.invalidateCache();
  router.push("/formulas");
}

function handleLoadTemplate(template: FormulaTemplate) {
  quickFormulaStore.formulaData.ratioFactor = template.ratioFactor;
  quickFormulaStore.formulaData.supplementRatioFactor = template.supplementRatioFactor;
  quickFormulaStore.formulaData.finishedWeight = template.finishedWeight;
  quickFormulaStore.formulaData.packagingPrice = template.packagingPrice;
  quickFormulaStore.formulaData.otherPrice = template.otherPrice;
  quickFormulaStore.formulaData.profitMargin = template.profitMargin;
  quickFormulaStore.formulaData.materials = template.materials.map((m) => ({
    materialId: m.materialId,
    materialName: m.materialName,
    quantity: m.quantity,
    materialType: m.materialType as "herb" | "supplement",
    unitPrice: null,
    nutrition: undefined,
  }));
  MessagePlugin.success("模板已加载");
}

function handleRequestCreate() {
  triggerCreate.value = true;
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
  quickFormulaListStore.selectedId = null;
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
  <div class="quick-formula-panel-host" :class="{ 'quick-formula-panel-host--fullscreen': isFullscreen }">
    <Teleport to="body" :disabled="!isFullscreen">
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
            <!-- 速览按钮 -->
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
                    <span class="nq-item-value">{{ nutrition.energy.toFixed(1) }} <small>kJ</small>
                      <span class="nq-nrv">NRV{{ nrvPercent.energy.toFixed(1) }}%</span>
                    </span>
                  </div>
                  <div class="nq-item">
                    <div class="nq-item-icon nq-icon--protein">
                      <t-icon name="flag" size="12px" />
                    </div>
                    <span class="nq-item-label">蛋白质</span>
                    <span class="nq-item-value">{{ nutrition.protein.toFixed(1) }} <small>g</small>
                      <span class="nq-nrv">NRV{{ nrvPercent.protein.toFixed(1) }}%</span>
                    </span>
                  </div>
                  <div class="nq-item">
                    <div class="nq-item-icon nq-icon--fat">
                      <t-icon name="rain-light" size="12px" />
                    </div>
                    <span class="nq-item-label">脂肪</span>
                    <span class="nq-item-value">{{ nutrition.fat.toFixed(1) }} <small>g</small>
                      <span class="nq-nrv">NRV{{ nrvPercent.fat.toFixed(1) }}%</span>
                    </span>
                  </div>
                  <div class="nq-item">
                    <div class="nq-item-icon nq-icon--carb">
                      <t-icon name="chart-pie" size="12px" />
                    </div>
                    <span class="nq-item-label">碳水</span>
                    <span class="nq-item-value">{{ nutrition.carbohydrate.toFixed(1) }} <small>g</small>
                      <span class="nq-nrv">NRV{{ nrvPercent.carbohydrate.toFixed(1) }}%</span>
                    </span>
                  </div>
                  <div class="nq-item">
                    <div class="nq-item-icon nq-icon--sodium">
                      <t-icon name="precise-monitor" size="12px" />
                    </div>
                    <span class="nq-item-label">钠</span>
                    <span class="nq-item-value">{{ nutrition.sodium.toFixed(1) }} <small>mg</small>
                      <span class="nq-nrv">NRV{{ nrvPercent.sodium.toFixed(1) }}%</span>
                    </span>
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
            <button v-if="currentQuickFormulaId" class="header-action-btn" :disabled="saving || isCurrentPublished"
              @click="handleSave()">
              <t-icon name="save" class="btn-icon" />
              {{ saving ? '保存中...' : '保存' }}
            </button>
            <t-tooltip v-if="currentQuickFormulaId && isCurrentPublished" content="已发布的配方不可修改">
              <button class="header-action-btn" disabled>
                <t-icon name="upload" class="btn-icon" />
                发布
              </button>
            </t-tooltip>
            <button v-else-if="currentQuickFormulaId" class="header-action-btn" @click="showPublishDrawer = true">
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
          <QuickFormulaSidebar ref="sidebarRef" :is-editing="!!currentQuickFormulaId"
            v-model:collapsed="sidebarCollapsed" :current-quick-formula-id="currentQuickFormulaId"
            v-model:trigger-create="triggerCreate" @select="handleSelectQuickFormula"
            @select-published="handleSelectPublished" @create="handleQuickFormulaCreated"
            @restore-draft="handleRestoreDraft"
            @save-template="showTemplateManager = true"
            @show-template-manager="showTemplateManager = true" />
          <div class="panel-main">
            <FormulaWorkspace :sidebar-collapsed="sidebarCollapsed"
              @toggle-sidebar="sidebarCollapsed = !sidebarCollapsed" @submitted="handleSubmitSuccess"
              @publish="showPublishDrawer = true" @save="handleSave" @request-create="handleRequestCreate" />
          </div>
        </div>
        <PublishDrawer :visible="showPublishDrawer" :quick-formula-id="currentQuickFormulaId || ''"
          @update:visible="showPublishDrawer = $event" @published="handlePublished" />
        <TemplateManager :visible="showTemplateManager" @close="showTemplateManager = false"
          @load="handleLoadTemplate" />
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.quick-formula-panel-host {
  display: contents;

  &--fullscreen {
    display: block;
    position: fixed;
    inset: 0;
    z-index: -1;
    pointer-events: none;
    visibility: hidden;
  }
}

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
  background-color: var(--color-bg-container);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border-light);
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
      color: var(--color-text-placeholder);
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
          color: var(--color-text-placeholder);
          cursor: pointer;
          transition: color 0.15s;
          text-decoration: none;

          &:hover {
            color: $emerald-500;
          }
        }

        .breadcrumb-sep {
          font-size: 12px;
          color: var(--color-text-placeholder);
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

          &.status-tag--published {
            background: var(--color-primary-lighter);
            color: var(--color-primary);
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
      background-color: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: 0 10px 15px -3px rgba(255, 107, 138, 0.25);
      cursor: pointer;
      transition: all $transition-fast;

      .btn-icon {
        font-size: 18px;
      }

      &:hover {
        background-color: var(--color-primary-dark);
        transform: translateY(-1px);
        box-shadow: 0 14px 20px -3px rgba(255, 107, 138, 0.35);
      }

      &:active {
        transform: translateY(0);
        background-color: var(--color-primary-dark);
      }

      &:disabled {
        background-color: var(--color-text-placeholder);
        cursor: not-allowed;
        box-shadow: none;
        transform: none;
      }

      &.secondary {
        background-color: var(--color-border-light);
        color: var(--color-text-secondary);
        box-shadow: $shadow-elevation-1;

        &:hover {
          background-color: var(--color-border);
          color: var(--color-text-secondary);
          box-shadow: $shadow-elevation-2;
        }

        &:active {
          background-color: var(--color-border);
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
  background: var(--color-bg-page);

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

:global(.nutrition-quick) {
  min-width: 280px;
  padding: $space-2 0;
}

:global(.nq-header) {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1-5 $space-3 $space-1;
}

:global(.nq-header-icon) {
  color: $emerald-500;
}

:global(.nq-header-text) {
  font-size: $font-size-caption;
  font-weight: $font-weight-bold;
  color: var(--color-text-primary);
  letter-spacing: $ls-caption;
}

:global(.nq-divider) {
  height: 1px;
  background: var(--color-border-light);
  margin: $space-1 $space-2;
}

:global(.nq-item) {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1 $space-3;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: var(--color-bg-hover);
  }
}

:global(.nq-item--danger) {
  :global(.nq-item-value) {
    color: $color-danger;
    font-weight: $font-weight-bold;
  }

  :global(.nq-icon--ratio) {
    background: $color-danger-medium;
    color: $color-danger;
  }
}

:global(.nq-item--highlight) {
  background: $overlay-emerald-04;

  :global(.nq-item-value) {
    color: $emerald-600;
    font-weight: $font-weight-bold;
  }
}

:global(.nq-item-icon) {
  width: 20px;
  height: 20px;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

:global(.nq-item-icon svg),
:global(.nq-item-icon .t-icon) {
  color: inherit !important;
}

:global(.nq-icon--ratio) {
  background: $overlay-emerald-08;
  color: $emerald-500;
}

:global(.nq-icon--energy) {
  background: rgba($chart-energy-deep, 0.08);
  color: $chart-energy-deep;
}

:global(.nq-icon--protein) {
  background: rgba($chart-protein-deep, 0.08);
  color: $chart-protein-deep;
}

:global(.nq-icon--fat) {
  background: rgba($chart-fat-deep, 0.08);
  color: $chart-fat-deep;
}

:global(.nq-icon--carb) {
  background: rgba($chart-carb-deep, 0.08);
  color: $chart-carb-deep;
}

:global(.nq-icon--sodium) {
  background: rgba($chart-sodium-deep, 0.08);
  color: $chart-sodium-deep;
}

:global(.nq-icon--price) {
  background: $overlay-emerald-08;
  color: $emerald-500;
}

:global(.nq-item-label) {
  flex: 1;
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

:global(.nq-item-value) {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);

  small {
    font-size: $font-size-caption;
    font-weight: $font-weight-regular;
    color: var(--color-text-placeholder);
    margin-left: $space-0-5;
  }
}

:global(.nq-nrv) {
  display: inline-block;
  margin-left: $space-1;
  padding: 0 $space-1;
  border-radius: $radius-sm;
  background: $overlay-emerald-04;
  color: $emerald-600;
  font-size: 10px;
  font-weight: $font-weight-semibold;
  line-height: 1.6;
  white-space: nowrap;
}
</style>
