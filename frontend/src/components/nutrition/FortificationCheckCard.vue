<script setup lang="ts">
import { computed } from "vue";
import type { FortificationCheckItem } from "@/api/nutrition";

const props = defineProps<{
  checks: FortificationCheckItem[];
}>();

const isEmpty = computed(() => props.checks.length === 0);

const columns = [
  { colKey: "materialName", title: "原料名称", width: "20%" },
  { colKey: "nutrient", title: "营养素", width: "15%" },
  { colKey: "usageAmountPerKg", title: "使用量(mg/kg)", width: "18%" },
  { colKey: "allowedRange", title: "允许范围", width: "20%" },
  { colKey: "statusDisplay", title: "状态", width: "15%" },
  { colKey: "standard", title: "标准", width: "12%" },
];

const tableData = computed(() =>
  props.checks.map((c) => ({
    ...c,
    usageAmountPerKgDisplay: c.usageAmountPerKg.toFixed(1),
    allowedRange: formatRange(c.minAllowed, c.maxAllowed),
    statusDisplay: getStatusLabel(c.status),
    _status: c.status,
  }))
);

function formatRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "--";
  if (min == null) return `<= ${max!.toFixed(0)}`;
  if (max == null) return `>= ${min.toFixed(0)}`;
  return `${min.toFixed(0)} ~ ${max.toFixed(0)}`;
}

function getStatusLabel(status: FortificationCheckItem["status"]): string {
  const map: Record<string, string> = {
    compliant: "合规",
    below_min: "偏低",
    exceeded: "偏高",
    not_in_standard: "未收录",
  };
  return map[status] ?? status;
}

function getStatusTheme(
  status: FortificationCheckItem["status"]
): "success" | "primary" | "danger" | "default" {
  const map: Record<string, "success" | "primary" | "danger" | "default"> = {
    compliant: "success",
    below_min: "primary",
    exceeded: "danger",
    not_in_standard: "default",
  };
  return map[status] ?? "default";
}
</script>

<template>
  <t-card class="fortification-check-card" :bordered="true">
    <div v-if="isEmpty" class="check-empty">
      <t-icon name="check-circle" size="24px" style="color: #52c41a" />
      <span>无辅料原料，无需检查</span>
    </div>
    <t-table
      v-else
      :data="tableData"
      :columns="columns"
      row-key="materialId"
      :bordered="true"
      table-layout="auto"
      size="small"
      disable-data-page
    >
      <template #usageAmountPerKg="{ row }">
        <span class="amount-cell">{{ row.usageAmountPerKgDisplay }}</span>
      </template>
      <template #statusDisplay="{ row }">
        <t-tag
          :theme="getStatusTheme(row._status)"
          size="small"
          variant="light"
        >
          {{ row.statusDisplay }}
        </t-tag>
      </template>
    </t-table>
  </t-card>
</template>

<style lang="scss" scoped>
.fortification-check-card {
  border-radius: $radius-xl;

  :deep(.t-card__body) {
    padding: $space-4;
  }

  :deep(.t-table) {
    font-size: $font-size-body-sm;

    th {
      background: $bg-container-alt;
      font-weight: $font-weight-semibold;
      color: $text-primary;
      padding: $space-2;
    }

    td {
      padding: $space-2;
      color: $text-regular;
    }
  }
}

.check-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $space-2;
  padding: $space-8 0;
  font-size: $font-size-body-sm;
  color: $text-secondary;
}

.amount-cell {
  font-variant-numeric: tabular-nums;
}
</style>
