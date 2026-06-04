<script setup lang="ts">
import { computed } from "vue";
import type { MaterialContributionItem } from "@/api/nutrition";

const props = withDefaults(defineProps<{
  materials?: MaterialContributionItem[];
}>(), {
  materials: () => [],
});

const coreNutrientKeys = computed(() => {
  const keys = new Set<string>();
  props.materials.forEach((m) => {
    Object.keys(m.contributionPercent ?? {}).forEach((k) => keys.add(k));
  });
  return Array.from(keys).slice(0, 4);
});

const columns = computed(() => [
  { colKey: "materialName", title: "原料名称", width: "22%" },
  { colKey: "materialType", title: "类型", width: "10%" },
  { colKey: "quantity", title: "用量(g)", width: "10%" },
  { colKey: "ratio", title: "含量比", width: "10%" },
  ...coreNutrientKeys.value.map((key) => ({
    colKey: `contrib_${key}`,
    title: key,
    width: "12%",
  })),
]);

const tableData = computed(() =>
  props.materials.map((m) => {
    const row: Record<string, unknown> = {
      ...m,
      ratioDisplay: `${((m.ratio ?? 0) * 100).toFixed(1)}%`,
    };
    coreNutrientKeys.value.forEach((key) => {
      const percent = (m.contributionPercent ?? {})[key];
      row[`contrib_${key}`] = percent != null ? percent : null;
    });
    return row;
  })
);

function getTypeLabel(type: string): string {
  return type === "herb" ? "药材" : "辅料";
}

function getTypeTheme(type: string): "primary" | "success" {
  return type === "herb" ? "primary" : "success";
}

function formatPercent(val: number | null): string {
  if (val == null) return "--";
  return `${val.toFixed(1)}%`;
}

function getProgressColor(val: number): string {
  if (val >= 40) return "#ff4d4f";
  if (val >= 20) return "#faad14";
  return "#52c41a";
}
</script>

<template>
  <div class="material-contribution">
    <t-table
      :data="tableData"
      :columns="columns"
      row-key="materialId"
      :bordered="true"
      table-layout="auto"
      size="small"
      expand-icon
      :expanded-row-keys="[]"
      :expanded-row-render="() => null"
      disable-data-page
    >
      <template #materialName="{ row }">
        <div class="material-name-cell">
          <span>{{ row.materialName }}</span>
          <t-tag
            v-if="!row.hasNutritionData"
            theme="warning"
            size="small"
            variant="light"
          >
            数据缺失
          </t-tag>
        </div>
      </template>
      <template #materialType="{ row }">
        <t-tag
          :theme="getTypeTheme(row.materialType)"
          size="small"
          variant="light"
        >
          {{ getTypeLabel(row.materialType) }}
        </t-tag>
      </template>
      <template #quantity="{ row }">
        {{ row.quantity.toFixed(1) }}
      </template>
      <template #ratio="{ row }">
        {{ row.ratioDisplay }}
      </template>
      <template v-for="key in coreNutrientKeys" :key="key" #[`contrib_${key}`]="{ row }">
        <div class="contribution-cell">
          <t-progress
            :percentage="row[`contrib_${key}`] ?? 0"
            :color="getProgressColor(row[`contrib_${key}`] ?? 0)"
            size="small"
            :label="false"
          />
          <span class="contribution-percent">{{ formatPercent(row[`contrib_${key}`]) }}</span>
        </div>
      </template>
      <template #expandedRow="{ row }">
        <div class="expanded-detail">
          <div class="detail-title">完整营养素贡献明细</div>
          <div class="detail-grid">
            <div
              v-for="(val, nutrientKey) in row.contributions"
              :key="nutrientKey"
              class="detail-item"
            >
              <span class="detail-key">{{ nutrientKey }}</span>
              <span class="detail-val">{{ Number(val).toFixed(2) }}</span>
              <span class="detail-percent">
                {{ formatPercent(row.contributionPercent[nutrientKey as string] ?? null) }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </t-table>
  </div>
</template>

<style lang="scss" scoped>
.material-contribution {
  :deep(.t-table) {
    font-size: $font-size-body-sm;

    th {
      background: var(--color-bg-container-alt);
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
      padding: $space-2 $space-2;
    }

    td {
      padding: $space-2 $space-2;
      color: var(--color-text-regular);
    }
  }

  .material-name-cell {
    display: flex;
    align-items: center;
    gap: $space-1;
  }

  .contribution-cell {
    display: flex;
    align-items: center;
    gap: $space-1;

    :deep(.t-progress) {
      flex: 1;
      min-width: 40px;
    }

    .contribution-percent {
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
      min-width: 42px;
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
  }

  .expanded-detail {
    padding: $space-3 $space-4;
    background: var(--color-bg-container-alt);

    .detail-title {
      font-size: $font-size-caption;
      font-weight: $font-weight-medium;
      color: var(--color-text-secondary);
      margin-bottom: $space-2;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: $space-1-5;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: $space-1;
      font-size: $font-size-caption;

      .detail-key {
        color: var(--color-text-secondary);
        min-width: 60px;
      }

      .detail-val {
        color: var(--color-text-primary);
        font-weight: $font-weight-medium;
        font-variant-numeric: tabular-nums;
      }

      .detail-percent {
        color: var(--color-primary);
        font-variant-numeric: tabular-nums;
      }
    }
  }
}
</style>
