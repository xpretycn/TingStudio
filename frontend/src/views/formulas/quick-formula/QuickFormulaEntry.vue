<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import type { QuickFormulaDraft } from "@/types/quickFormula";

const quickFormulaStore = useQuickFormulaStore();

const emit = defineEmits<{
  start: [name: string];
}>();

const formulaName = ref("");
const draft = ref<QuickFormulaDraft | null>(null);

function handleStart() {
  const name = formulaName.value.trim();
  if (!name) return;
  emit("start", name);
}

function handleRestoreDraft() {
  if (draft.value) {
    quickFormulaStore.restoreDraft(draft.value);
    emit("start", draft.value.formulaName);
  }
}

function handleDiscardDraft() {
  quickFormulaStore.clearDraft();
  draft.value = null;
}

onMounted(() => {
  const loaded = quickFormulaStore.loadDraft();
  if (loaded) {
    draft.value = loaded;
  }
});
</script>

<template>
  <div class="quick-formula-entry">
    <div class="entry-card">
      <div class="entry-icon">
        <t-icon name="edit" size="32px" />
      </div>
      <h2 class="entry-title">快速录入配方</h2>
      <p class="entry-desc">输入配方名称，开始快速录入原料和营养数据</p>

      <div class="entry-form">
        <t-input v-model="formulaName" placeholder="请输入本次配方名称" size="large" clearable :maxlength="50"
          @keydown.enter="handleStart" />
        <t-button theme="default" size="large" block class="btn-emerald-fill" :disabled="!formulaName.trim()"
          @click="handleStart">
          <template #icon><t-icon name="play-circle" /></template>
          开始编辑
        </t-button>
      </div>

      <div v-if="draft" class="draft-section">
        <div class="draft-header">
          <t-icon name="time" size="16px" />
          <span>发现未完成的配方草稿：{{ draft.formulaName }}</span>
        </div>
        <div class="draft-actions">
          <t-button theme="default" class="btn-emerald-fill" @click="handleRestoreDraft">
            <template #icon><t-icon name="rollback" /></template>
            从草稿恢复
          </t-button>
          <t-button theme="default" variant="outline" class="btn-emerald-outline" @click="handleDiscardDraft">
            重新开始
          </t-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.quick-formula-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.entry-card {
  width: 420px;
  max-width: 90vw;
  background: var(--color-bg-container);
  border-radius: $radius-3xl;
  padding: $space-10 $space-8;
  box-shadow: $shadow-elevation-2;
  border: 1px solid var(--color-border-light);
  text-align: center;
}

.entry-icon {
  width: 64px;
  height: 64px;
  border-radius: $radius-2xl;
  background: $overlay-emerald-08;
  color: $brand-emerald;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: $space-5;
}

.entry-title {
  font-size: $font-size-h1;
  font-weight: $font-weight-bold;
  color: var(--color-text-primary);
  margin: 0 0 $space-2;
  letter-spacing: $ls-heading;
}

.entry-desc {
  font-size: $font-size-body-sm;
  color: var(--color-text-regular);
  margin: 0 0 $space-8;
  line-height: $line-height-normal;
}

.entry-form {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.draft-section {
  margin-top: $space-6;
  padding-top: $space-5;
  border-top: 1px dashed var(--color-border);
}

.draft-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1-5;
  font-size: $font-size-body-sm;
  color: $color-warning;
  margin-bottom: $space-4;
}

.draft-actions {
  display: flex;
  gap: $space-3;
  justify-content: center;
}

.btn-emerald-fill {
  background-color: $emerald-500 !important;
  color: $text-white !important;
  border-color: $emerald-500 !important;

  &:hover {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:active {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:disabled {
    background-color: var(--color-text-placeholder) !important;
    border-color: var(--color-text-placeholder) !important;
    cursor: not-allowed;
  }
}

.btn-emerald-outline {
  color: $emerald-500 !important;
  border-color: $emerald-500 !important;

  &:hover {
    color: $emerald-600 !important;
    border-color: $emerald-600 !important;
    background-color: $overlay-emerald-04 !important;
  }

  &:active {
    color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }
}
</style>
