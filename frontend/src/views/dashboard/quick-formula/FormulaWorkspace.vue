<script setup lang="ts">
import { useQuickFormulaStore } from "@/stores/quickFormula"
import FormulaEditor from "./FormulaEditor.vue"
import MaterialPool from "./MaterialPool.vue"
import type { QuickFormulaMaterial } from "@/types/quickFormula"

const emit = defineEmits<{
  "save-template": []
  "submitted": []
}>()

const quickFormulaStore = useQuickFormulaStore()

function handleAddMaterial(material: QuickFormulaMaterial) {
  quickFormulaStore.addMaterial(material)
}

function handleSaveTemplate() {
  emit("save-template")
}

function handleSubmitSuccess() {
  emit("submitted")
}
</script>

<template>
  <div class="formula-workspace">
    <div class="workspace-panel workspace-panel--editor">
      <FormulaEditor @save-template="handleSaveTemplate" @submitted="handleSubmitSuccess" />
    </div>
    <div class="workspace-panel workspace-panel--pool">
      <MaterialPool @add="handleAddMaterial" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.formula-workspace {
  display: flex;
  gap: $space-6;
  min-height: 500px;
}

.workspace-panel {
  background: $bg-container;
  border-radius: $radius-3xl;
  border: 1px solid $border-color-light;
  box-shadow: $shadow-elevation-1;
  overflow: hidden;

  &--editor {
    flex: 0 0 55%;
    max-width: 55%;
    padding: $space-5;
    overflow-y: auto;
  }

  &--pool {
    flex: 0 0 calc(45% - #{$space-6});
    max-width: calc(45% - #{$space-6});
    display: flex;
    flex-direction: column;
  }
}

@media screen and (max-width: 1200px) {
  .formula-workspace {
    flex-direction: column;
  }

  .workspace-panel {
    &--editor,
    &--pool {
      flex: none;
      max-width: 100%;
    }
  }
}
</style>
