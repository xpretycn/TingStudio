<script setup lang="ts">
import { ref } from "vue";
import { MessagePlugin } from "tdesign-vue-next";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useFormulaStore } from "@/stores/formula";
import { useAuthStore } from "@/stores/auth";
import { useSalesmanStore } from "@/stores/salesman";
import type { FormulaForm } from "@/api/formula";
import type { QuickFormulaMaterial } from "@/types/quickFormula";

const emit = defineEmits<{
  "save-template": [];
  "submitted": [];
}>();

const store = useQuickFormulaStore();
const formulaStore = useFormulaStore();
const authStore = useAuthStore();
const salesmanStore = useSalesmanStore();

const submitting = ref(false);
const errorMessages = ref<string[]>([]);

function handleQuantityChange(materialId: string, value: number) {
  store.updateMaterialQuantity(materialId, value);
}

function handleDelete(materialId: string) {
  store.removeMaterial(materialId);
}

async function handleSubmit() {
  errorMessages.value = [];
  const errors = store.validate();
  if (errors.length > 0) {
    errorMessages.value = errors;
    return;
  }

  submitting.value = true;
  try {
    if (salesmanStore.allSalesmen.length === 0) {
      await salesmanStore.fetchAllForSelect();
    }

    const firstSalesman = salesmanStore.allSalesmen[0];
    const salesmanId = authStore.user?.id || firstSalesman?.id || "default-salesman-id";

    const form: FormulaForm = {
      name: store.formulaName,
      salesmanId,
      materials: store.formulaData.materials.map((m: QuickFormulaMaterial) => ({
        materialId: m.materialId,
        materialName: m.materialName,
        quantity: m.quantity,
      })),
      finishedWeight: store.formulaData.finishedWeight,
      ratioFactor: store.formulaData.ratioFactor,
      supplementRatioFactor: store.formulaData.supplementRatioFactor,
      packagingPrice: store.formulaData.packagingPrice,
      otherPrice: store.formulaData.otherPrice,
      profitMargin: store.formulaData.profitMargin,
    };

    const result = await formulaStore.createFormula(form);
    if (result.success) {
      MessagePlugin.success("配方提交成功");
      store.clearDraft();
      store.exitEditMode();
      emit("submitted");
    } else {
      errorMessages.value = [result.message || "提交失败，请重试"];
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "提交失败，请重试";
    errorMessages.value = [msg];
  } finally {
    submitting.value = false;
  }
}

function handleSaveTemplate() {
  emit("save-template");
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
            <t-input-number v-model="store.formulaData.finishedWeight" :min="1" :step="100" theme="normal" size="small" />
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
          <div v-if="store.herbMaterials.length > 0" class="material-group">
            <div class="group-label">
              <span class="group-dot group-dot--herb" />
              主料
            </div>
            <div v-for="(material, index) in store.herbMaterials" :key="material.materialId" class="material-row">
              <span class="material-index">{{ index + 1 }}</span>
              <span class="material-name">{{ material.materialName }}</span>
              <t-tag size="small" theme="success" variant="light">主料</t-tag>
              <t-input-number :value="material.quantity" :min="0" :step="1" theme="normal" size="small"
                class="quantity-input" @change="(val: number) => handleQuantityChange(material.materialId, val)" />
              <t-popconfirm content="确认移除该原料？" @confirm="handleDelete(material.materialId)">
                <t-icon name="delete" class="delete-icon" />
              </t-popconfirm>
            </div>
          </div>

          <div v-if="store.supplementMaterials.length > 0" class="material-group">
            <div class="group-label">
              <span class="group-dot group-dot--supplement" />
              辅料
            </div>
            <div v-for="(material, index) in store.supplementMaterials" :key="material.materialId" class="material-row">
              <span class="material-index">{{ store.herbMaterials.length + index + 1 }}</span>
              <span class="material-name">{{ material.materialName }}</span>
              <t-tag size="small" theme="warning" variant="light">辅料</t-tag>
              <t-input-number :value="material.quantity" :min="0" :step="1" theme="normal" size="small"
                class="quantity-input" @change="(val: number) => handleQuantityChange(material.materialId, val)" />
              <t-popconfirm content="确认移除该原料？" @confirm="handleDelete(material.materialId)">
                <t-icon name="delete" class="delete-icon" />
              </t-popconfirm>
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

        <div class="actions-area">
          <t-button variant="outline" block @click="handleSaveTemplate">
            <template #icon><t-icon name="folder" /></template>
            保存为模板
          </t-button>
          <t-button theme="primary" block :loading="submitting" @click="handleSubmit">
            <template #icon><t-icon name="check-circle" /></template>
            提交配方
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
}

.editor-section {
  background: $bg-container;
  border-radius: $radius-3xl;
  border: 1px solid $border-color-light;
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
    color: $text-primary;
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
    min-width: 90px;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-medium;
    color: $text-secondary;
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
  gap: $space-2;
}

.group-label {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  color: $text-tertiary;
  padding-bottom: $space-1;
  border-bottom: 1px solid $border-color-light;
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
  gap: $space-2;
  padding: $space-2 $space-3;
  background: $bg-page;
  border-radius: $radius-lg;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
  }

  .material-index {
    width: 20px;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    color: $text-tertiary;
    text-align: center;
    flex-shrink: 0;
  }

  .material-name {
    flex: 1;
    min-width: 0;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-medium;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .quantity-input {
    width: 100px;
    flex-shrink: 0;
  }

  .delete-icon {
    color: $text-tertiary;
    cursor: pointer;
    flex-shrink: 0;
    transition: color $transition-fast;

    &:hover {
      color: $color-danger;
    }
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
    color: $text-placeholder;
  }

  .empty-text {
    font-size: $font-size-body-sm;
    color: $text-tertiary;
  }
}

.actions-area {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding-top: $space-4;
  border-top: 1px solid $border-color-light;
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
</style>
