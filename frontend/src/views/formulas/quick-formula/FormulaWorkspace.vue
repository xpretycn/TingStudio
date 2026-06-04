<script setup lang="ts">
import { useQuickFormulaStore } from "@/stores/quickFormula";
import FormulaEditor from "./FormulaEditor.vue";
import FormulaDashboard from "./FormulaDashboard.vue";
import MaterialPool from "./MaterialPool.vue";
import type { QuickFormulaMaterial } from "@/types/quickFormula";

const props = defineProps<{
  sidebarCollapsed: boolean;
}>();

const emit = defineEmits<{
  submitted: [];
  "toggle-sidebar": [];
  publish: [];
  save: [];
  "request-create": [];
}>();

const quickFormulaStore = useQuickFormulaStore();

function handleAddMaterial(material: QuickFormulaMaterial) {
  quickFormulaStore.addMaterial(material);
}

function handleSubmitSuccess() {
  emit("submitted");
}

function handlePublish() {
  emit("publish");
}

function handleSave() {
  emit("save");
}

function handleRequestCreate() {
  emit("request-create");
}
</script>

<template>
  <div class="formula-workspace">
    <div class="workspace-panel workspace-panel--dashboard">
      <FormulaDashboard :sidebar-collapsed="props.sidebarCollapsed" @toggle-sidebar="emit('toggle-sidebar')" />
    </div>
    <div class="workspace-panel workspace-panel--editor">
      <FormulaEditor @submitted="handleSubmitSuccess" @publish="handlePublish" @save="handleSave"
        @request-create="handleRequestCreate" />
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
  gap: $space-3;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.workspace-panel {
  background: var(--color-bg-container);
  border-radius: $radius-3xl;
  border: 1px solid var(--color-border-light);
  box-shadow: $shadow-elevation-1;
  display: flex;
  flex-direction: column;
  min-height: 0;

  &--dashboard {
    flex: 0 0 8%;
    max-width: 8%;
    min-width: 140px;
    overflow: hidden;
  }

  &--editor {
    flex: 0 0 45%;
    max-width: 45%;
    overflow: hidden;
  }

  &--pool {
    flex: 1;
    min-width: 0;
    overflow: hidden;
  }
}

@media screen and (max-width: 1200px) {
  .workspace-panel {
    &--dashboard {
      flex: 0 0 15%;
      max-width: 15%;
    }

    &--editor {
      flex: 0 0 calc(55% - #{$space-3});
      max-width: calc(55% - #{$space-3});
    }

    &--pool {
      flex: 0 0 30%;
      max-width: 30%;
      min-height: 300px;
    }
  }
}

@media screen and (max-width: 900px) {
  .formula-workspace {
    flex-direction: column;
  }

  .workspace-panel {

    &--editor,
    &--dashboard,
    &--pool {
      flex: none;
      max-width: 100%;
      min-width: 0;
    }
  }
}
</style>
