<script setup lang="ts">
import { ref } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useQuickFormulaListStore } from "@/stores/quickFormulaList";

const emit = defineEmits<{
  submitted: [];
  publish: [];
  save: [];
  "request-create": [];
}>();

const store = useQuickFormulaStore();
const quickFormulaListStore = useQuickFormulaListStore();

const errorMessages = ref<string[]>([]);
const restoreFlashId = ref<string | null>(null);

function handleQuantityChange(materialId: string, value: number) {
  store.updateMaterialQuantity(materialId, value);
}

function handleUnitPriceChange(materialId: string, value: number) {
  store.updateMaterialUnitPrice(materialId, value);
}

function handleRestorePrice(materialId: string) {
  const m = store.formulaData.materials.find((item) => item.materialId === materialId);
  if (!m) return;
  store.restoreMaterialUnitPrice(materialId);
  restoreFlashId.value = materialId;
  setTimeout(() => { restoreFlashId.value = null; }, 600);
  MessagePlugin.success(`已恢复「${m.materialName}」单价为基价`);
}

function handleDelete(materialId: string) {
  store.removeMaterial(materialId);
}

function handleSave() {
  if (!quickFormulaListStore.selectedId) {
    MessagePlugin.info("请先创建配方");
    emit("request-create");
    return;
  }
  emit("save");
}

function handlePublish() {
  errorMessages.value = [];
  const errors = store.validate();
  if (errors.length > 0) {
    errorMessages.value = errors;
    return;
  }
  emit("publish");
}
</script>

<template>
  <div class="formula-editor">
    <!-- 参数设置 -->
    <section class="editor-section">
      <div class="section-header">
        <t-icon name="setting-1" class="section-icon" />
        <span class="section-title">参数设置</span>
      </div>
      <div class="section-body">
        <div class="param-row-group">
          <div class="param-row">
            <label class="param-label">主料系数</label>
            <t-input-number v-model="store.formulaData.ratioFactor" :min="0.15" :max="0.25" :step="0.01"
              :decimal-places="2" theme="normal" size="small" />
          </div>
          <div class="param-row">
            <label class="param-label">辅料系数</label>
            <t-input-number v-model="store.formulaData.supplementRatioFactor" :min="0.5" :max="1.5" :step="0.01"
              :decimal-places="2" theme="normal" size="small" />
          </div>
          <div class="param-row">
            <label class="param-label">成品重量(g)</label>
            <t-input-number v-model="store.formulaData.finishedWeight" :min="1" :step="100" theme="normal"
              size="small" />
          </div>
        </div>
      </div>
    </section>
    <!-- 原料列表 -->
    <section class="editor-section">
      <div class="section-header">
        <t-icon name="view-list" class="section-icon" />
        <span class="section-title">原料列表</span>
        <span class="section-count">{{ store.formulaData.materials.length }}</span>
      </div>
      <div class="section-body">
        <template v-if="store.formulaData.materials.length > 0">
          <div class="material-table-header">
            <span class="col-index">#</span>
            <span class="col-name">原料名称</span>
            <span class="col-qty">用量(g)</span>
            <span class="col-price">单价(元/kg)</span>
            <span class="col-ratio">含量比</span>
            <span class="col-subtotal">小计</span>
            <span class="col-action">操作</span>
          </div>
          <div v-if="store.herbMaterials.length > 0" class="material-group">
            <div class="group-label">
              <span class="group-dot group-dot--herb" />
              主料
            </div>
            <div v-for="(material, index) in store.herbMaterials" :key="material.materialId" class="material-row"
              :class="{ 'material-row--price-adjusted': material.isPriceAdjusted }">
              <span class="material-index">{{ index + 1 }}</span>
              <span class="material-name">{{ material.materialName }}</span>
              <t-input-number :value="material.quantity" :min="0" :step="1" theme="normal" size="small"
                class="quantity-input" @change="(val: number) => handleQuantityChange(material.materialId, val)" />
              <div class="price-input-wrap">
                <t-input-number v-if="material.unitPrice != null" :value="material.unitPrice" :min="0"
                  :decimal-places="2" theme="normal" size="small" class="price-input"
                  @change="(val: number) => handleUnitPriceChange(material.materialId, val)" />
                <span v-else class="price-missing">未录入</span>
              </div>
              <span class="material-ratio">
                {{ store.calculateMaterialRatio(material) }}
              </span>
              <span class="material-subtotal"
                :class="{ 'material-subtotal--missing': store.calculateMaterialSubtotal(material) == null }">
                {{ store.calculateMaterialSubtotal(material) != null ? '¥' +
                  store.calculateMaterialSubtotal(material)!.toFixed(2) : '—' }}
              </span>
              <span class="material-action">
                <span v-if="material.isPriceAdjusted" class="col-adjust-badge"
                  :title="'基价: ¥' + (material.baseUnitPrice ?? '--') + '/kg'">
                  <svg viewBox="0 0 12 12" width="10" height="10">
                    <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z"
                      fill="var(--color-warning)" />
                  </svg>
                  价
                </span>
                <button v-if="material.isPriceAdjusted" type="button" class="col-restore-btn"
                  :class="{ 'col-restore-btn--flash': restoreFlashId === material.materialId }"
                  @click="handleRestorePrice(material.materialId)"
                  :title="'恢复基价: ¥' + (material.baseUnitPrice ?? '--') + '/kg'">
                  <t-icon name="rollback" size="12px" />
                </button>
                <t-popconfirm content="确认移除该原料？" @confirm="handleDelete(material.materialId)">
                  <button type="button" class="remove-material-btn" title="移除此原料" tabindex="-1">
                    <t-icon name="delete" size="12px" />
                  </button>
                </t-popconfirm>
              </span>
            </div>
          </div>

          <div v-if="store.supplementMaterials.length > 0" class="material-group">
            <div class="group-label">
              <span class="group-dot group-dot--supplement" />
              辅料
            </div>
            <div v-for="(material, index) in store.supplementMaterials" :key="material.materialId" class="material-row"
              :class="{ 'material-row--price-adjusted': material.isPriceAdjusted }">
              <span class="material-index">{{ store.herbMaterials.length + index + 1 }}</span>
              <span class="material-name">{{ material.materialName }}</span>
              <t-input-number :value="material.quantity" :min="0" :step="1" theme="normal" size="small"
                class="quantity-input" @change="(val: number) => handleQuantityChange(material.materialId, val)" />
              <div class="price-input-wrap">
                <t-input-number v-if="material.unitPrice != null" :value="material.unitPrice" :min="0"
                  :decimal-places="2" theme="normal" size="small" class="price-input"
                  @change="(val: number) => handleUnitPriceChange(material.materialId, val)" />
                <span v-else class="price-missing">未录入</span>
              </div>
              <span class="material-ratio material-ratio--supplement">
                {{ store.calculateMaterialRatio(material) }}
              </span>
              <span class="material-subtotal"
                :class="{ 'material-subtotal--missing': store.calculateMaterialSubtotal(material) == null }">
                {{ store.calculateMaterialSubtotal(material) != null ? '¥' +
                  store.calculateMaterialSubtotal(material)!.toFixed(2) : '—' }}
              </span>
              <span class="material-action">
                <span v-if="material.isPriceAdjusted" class="col-adjust-badge"
                  :title="'基价: ¥' + (material.baseUnitPrice ?? '--') + '/kg'">
                  <svg viewBox="0 0 12 12" width="10" height="10">
                    <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5Z"
                      fill="var(--color-warning)" />
                  </svg>
                  价
                </span>
                <button v-if="material.isPriceAdjusted" type="button" class="col-restore-btn"
                  :class="{ 'col-restore-btn--flash': restoreFlashId === material.materialId }"
                  @click="handleRestorePrice(material.materialId)"
                  :title="'恢复基价: ¥' + (material.baseUnitPrice ?? '--') + '/kg'">
                  <t-icon name="rollback" size="12px" />
                </button>
                <t-popconfirm content="确认移除该原料？" @confirm="handleDelete(material.materialId)">
                  <button type="button" class="remove-material-btn" title="移除此原料" tabindex="-1">
                    <t-icon name="delete" size="12px" />
                  </button>
                </t-popconfirm>
              </span>
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <t-icon name="add-circle" class="empty-icon" />
          <span class="empty-text">从右侧原料池添加原料</span>
        </div>
      </div>
    </section>
    <!-- 费用与操作 -->
    <section class="editor-section">
      <div class="section-header">
        <t-icon name="wallet" class="section-icon" />
        <span class="section-title">费用与操作</span>
      </div>
      <div class="section-body">
        <!-- 费用输入框 -->
        <div class="param-row-group">
          <div class="param-row">
            <label class="param-label">包材费用</label>
            <t-input-number v-model="store.formulaData.packagingPrice" :min="0" :decimal-places="2" theme="normal"
              size="small" />
          </div>
          <div class="param-row">
            <label class="param-label">其他费用</label>
            <t-input-number v-model="store.formulaData.otherPrice" :min="0" :decimal-places="2" theme="normal"
              size="small" />
          </div>
          <div class="param-row">
            <label class="param-label">利润率(%)</label>
            <t-input-number v-model="store.formulaData.profitMargin" :min="0" :max="100" :decimal-places="1"
              theme="normal" size="small" />
          </div>
        </div>
        <!-- 操作按钮区域 -->
        <div class="actions-area">
          <t-button variant="outline" block @click="handleSave">
            <template #icon><t-icon name="save" /></template>
            保存配方
          </t-button>
          <t-button theme="default" block class="btn-emerald-fill" :disabled="!quickFormulaListStore.selectedId"
            @click="handlePublish">
            <template #icon><t-icon name="upload" /></template>
            发布配方
          </t-button>
        </div>

        <div v-if="errorMessages.length > 0" class="error-list">
          <div v-for="(msg, idx) in errorMessages" :key="idx" class="error-item">
            <t-icon name="error-circle" size="14px" />
            <span>{{ msg }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.formula-editor {
  display: flex;
  flex-direction: column;
  gap: $space-4;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: $space-4;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 2px;
  }
}

.editor-section {
  background: var(--color-bg-container);
  border-radius: $radius-3xl;
  border: 1px solid var(--color-border-light);
  padding: $space-5;
  box-shadow: $shadow-elevation-1;
}

.section-header {
  display: flex;
  align-items: center;
  gap: $space-2;
  margin-bottom: $space-4;

  .section-icon {
    color: $emerald-500;
    font-size: 16px;
  }

  .section-title {
    font-size: $font-size-h4;
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
  }

  .section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 $space-1-5;
    border-radius: $radius-pill;
    background: $overlay-emerald-10;
    color: $emerald-600;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
  }
}

.section-body {
  display: flex;
  flex-direction: column;
  gap: $space-3;
}

.param-row-group {
  display: flex;
  gap: $space-3;

  .param-row {
    flex: 1;
    min-width: 0;
  }

  .param-label {
    min-width: auto;
    white-space: nowrap;
  }
}

.param-row {
  display: flex;
  align-items: center;
  gap: $space-3;

  .param-label {
    min-width: 80px;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-medium;
    color: var(--color-text-regular);
    flex-shrink: 0;
  }

  :deep(.t-input-number) {
    flex: 1;
    min-width: 0;
  }
}

.material-group {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.material-table-header {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-1 $space-3;
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  color: var(--color-text-placeholder);
  border-bottom: 1px solid var(--color-border-light);
  letter-spacing: $ls-caption;

  .col-index {
    width: 20px;
    text-align: center;
    flex-shrink: 0;
  }

  .col-name {
    flex: 1;
    min-width: 0;
    text-align: left;
  }

  .col-qty {
    width: 90px;
    text-align: center;
    flex-shrink: 0;
  }

  .col-price {
    width: 90px;
    text-align: center;
    flex-shrink: 0;
  }

  .col-ratio {
    width: 60px;
    text-align: center;
    flex-shrink: 0;
  }

  .col-subtotal {
    width: 60px;
    text-align: center;
    flex-shrink: 0;
  }

  .col-action {
    min-width: 50px;
    flex-shrink: 0;
    text-align: center;
  }
}

.group-label {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  color: var(--color-text-placeholder);
  padding-bottom: $space-1;
  border-bottom: 1px solid var(--color-border-light);
}

.group-dot {
  width: 6px;
  height: 6px;
  border-radius: $radius-circle;

  &--herb {
    background: $color-success;
  }

  &--supplement {
    background: $color-warning;
  }
}

.material-row {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-1-5 $space-3;
  background: var(--color-bg-page);
  border-radius: $radius-lg;
  transition: background $transition-fast;

  &:hover {
    background: var(--color-bg-hover);
  }

  &--price-adjusted {
    border-left: 3px solid $color-warning;
    background: linear-gradient(90deg, var(--color-warning-bg) 0%, transparent 100%);

    .material-name {
      color: var(--color-warning-dark);
      font-weight: $font-weight-semibold;
    }
  }

  .material-index {
    width: 20px;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    color: var(--color-text-placeholder);
    text-align: center;
    flex-shrink: 0;
  }

  .material-name {
    flex: 1;
    min-width: 0;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-medium;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: left;
  }

  .quantity-input {
    width: 90px;
    flex-shrink: 0;

    :deep(.t-input__inner) {
      text-align: center;
    }
  }

  .price-input-wrap {
    width: 90px;
    flex-shrink: 0;

    .price-input {
      width: 100%;

      :deep(.t-input__inner) {
        text-align: center;
      }
    }

    .price-missing {
      font-size: $font-size-caption;
      color: $color-warning;
      font-weight: $font-weight-medium;
    }
  }

  .material-ratio {
    width: 60px;
    text-align: center;
    font-size: $font-size-caption;
    font-weight: $font-weight-medium;
    color: var(--color-text-regular);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;

    &--supplement {
      color: $color-warning-orange;
    }
  }

  .material-subtotal {
    width: 60px;
    text-align: center;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;

    &--missing {
      color: var(--color-text-placeholder);
    }
  }

  .material-action {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $space-0-5;
    flex-shrink: 0;
    min-width: 50px;
  }
}

.col-adjust-badge {
  display: inline-flex;
  align-items: center;
  gap: $space-0-5;
  font-size: 10px;
  line-height: 1.4;
  padding: $space-0-5 $space-1-5;
  border-radius: 6px;
  background: linear-gradient(135deg, var(--color-warning-bg), var(--color-warning-border));
  color: var(--color-warning-dark);
  font-weight: $font-weight-bold;
  flex-shrink: 0;
  cursor: help;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background: linear-gradient(135deg, var(--color-warning-border), var(--color-warning-border));
    transform: scale(1.05);
  }
}

.col-restore-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: $radius-sm;
  border: 1px solid var(--color-border);
  background: var(--color-bg-container);
  color: var(--color-text-regular);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: var(--color-bg-hover);
    border-color: var(--color-border);
    color: var(--color-primary-dark);
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }

  &--flash {
    animation: restore-flash 0.5s ease;
  }
}

.remove-material-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: $radius-sm;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;

  &:hover {
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: $color-danger;
    transform: scale(1.1);
  }

  &:active {
    transform: scale(0.95);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-8 $space-4;

  .empty-icon {
    font-size: 32px;
    color: var(--color-text-placeholder);
  }

  .empty-text {
    font-size: $font-size-body-sm;
    color: var(--color-text-placeholder);
  }
}

.actions-area {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding-top: $space-4;
  border-top: 1px solid var(--color-border-light);
}

.error-list {
  display: flex;
  flex-direction: column;
  gap: $space-1-5;
  padding-top: $space-3;
}

.error-item {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  font-size: $font-size-body-sm;
  color: $color-danger;
  font-weight: $font-weight-medium;
}

.btn-emerald-fill {
  background-color: var(--color-primary) !important;
  color: #fff !important;
  border-color: var(--color-primary) !important;

  &:hover {
    background-color: var(--color-primary-dark) !important;
    border-color: var(--color-primary-dark) !important;
  }

  &:active {
    background-color: var(--color-primary-deep) !important;
    border-color: var(--color-primary-deep) !important;
  }

  &:disabled {
    background-color: var(--color-text-placeholder) !important;
    border-color: var(--color-text-placeholder) !important;
    cursor: not-allowed;
  }
}

@keyframes restore-flash {
  0% {
    background: var(--color-primary-bg);
    box-shadow: 0 0 0 0 var(--overlay-emerald-40);
  }

  50% {
    background: var(--color-primary-lightest);
    box-shadow: 0 0 8px 2px var(--overlay-emerald-30);
  }

  100% {
    background: var(--color-bg-container);
    box-shadow: none;
  }
}
</style>
