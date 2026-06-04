<script setup lang="ts">
import { computed } from "vue";
import type { NutritionLabelItem } from "@/api/nutrition";

const props = withDefaults(defineProps<{
  items?: NutritionLabelItem[];
}>(), {
  items: () => [],
});

const safeItems = computed(() => props.items ?? []);

const sortedItems = computed(() => {
  const core = safeItems.value.filter((i) => i.isCore);
  const extended = safeItems.value.filter((i) => !i.isCore);
  return [...core, ...extended];
});

const hasExtended = computed(() => safeItems.value.some((i) => !i.isCore));

function formatValue(item: NutritionLabelItem): string {
  if (item.isZero) return "0";
  return item.value.toFixed(item.value < 10 ? 1 : 0);
}

function formatNrv(nrv: number | null): string {
  if (nrv === null || nrv === 0) return "--";
  return `${nrv.toFixed(0)}%`;
}

const columns = computed(() => [
  { colKey: "label", title: "项目", width: "40%" },
  { colKey: "valueDisplay", title: "每100g", width: "30%" },
  { colKey: "nrvDisplay", title: "NRV%", width: "30%" },
]);

const tableData = computed(() =>
  sortedItems.value.map((item) => ({
    ...item,
    valueDisplay: `${formatValue(item)} ${item.unit}`,
    nrvDisplay: formatNrv(item.nrvPercent),
    _isCore: item.isCore,
  }))
);
</script>

<template>
  <div class="nutrition-label-table">
    <div class="label-header">
      <span class="label-title">营养成分表</span>
      <span class="label-subtitle">每100g</span>
    </div>
    <t-table
      :data="tableData"
      :columns="columns"
      row-key="field"
      :bordered="true"
      table-layout="auto"
      :row-class-name="(_row: Record<string, unknown>, _index: number, row: Record<string, unknown>) => (row._isCore ? 'row-core' : 'row-extended')"
      size="small"
      :header-affixed-top="false"
      disable-data-page
    >
      <template #label="{ row }">
        <span :class="{ 'label-core': row._isCore }">{{ row.label }}</span>
      </template>
      <template #valueDisplay="{ row }">
        <span :class="{ 'value-zero': row.isZero }">{{ row.valueDisplay }}</span>
      </template>
      <template #nrvDisplay="{ row }">
        <span class="nrv-cell">{{ row.nrvDisplay }}</span>
      </template>
    </t-table>
    <div v-if="hasExtended" class="label-divider-label">
      <span>— 核心营养素以上，扩展营养素以下 —</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.nutrition-label-table {
  border: 2px solid var(--color-text-primary);
  border-radius: $radius-xs;
  overflow: hidden;

  .label-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $space-2 $space-3;
    background: var(--color-bg-container-alt);
    border-bottom: 2px solid var(--color-text-primary);

    .label-title {
      font-size: $font-size-body;
      font-weight: $font-weight-bold;
      color: var(--color-text-primary);
    }

    .label-subtitle {
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
    }
  }

  :deep(.t-table) {
    font-size: $font-size-body-sm;

    th {
      background: var(--color-bg-container-alt);
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
      border-color: var(--color-text-primary);
      padding: $space-1-5 $space-2;
    }

    td {
      border-color: var(--color-border);
      padding: $space-1-5 $space-2;
      color: var(--color-text-regular);
    }

    .row-core td {
      border-bottom: 2px solid var(--color-text-primary);
    }

    .row-extended td {
      border-bottom: 1px solid var(--color-border);
    }
  }

  .label-core {
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
  }

  .value-zero {
    color: var(--color-text-placeholder);
  }

  .nrv-cell {
    font-variant-numeric: tabular-nums;
  }

  .label-divider-label {
    text-align: center;
    padding: $space-1-5 $space-2;
    font-size: $font-size-caption;
    color: var(--color-text-placeholder);
    background: var(--color-bg-container-alt);
    border-top: 1px dashed var(--color-border);
  }
}
</style>
