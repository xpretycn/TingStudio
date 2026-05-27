<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { ratioThresholdApi, type RatioThresholdConfig } from "@/api/ratioThreshold";

const props = defineProps<{
  sidebarCollapsed: boolean;
}>();

const emit = defineEmits<{
  "toggle-sidebar": [];
}>();

const quickFormulaStore = useQuickFormulaStore();

const ratioPercent = computed(() => (quickFormulaStore.totalRatio * 100).toFixed(1));

const thresholds = ref<RatioThresholdConfig>({
  normalLow: 0.98,
  normalHigh: 1.02,
  warningLow: 0.95,
  warningHigh: 1.05,
  highWarningLow: 0.92,
  highWarningHigh: 1.08,
  updatedAt: null,
  updatedBy: null,
});

onMounted(async () => {
  try {
    const res = await ratioThresholdApi.get();
    if (res) thresholds.value = res;
  } catch { /* 使用默认值 */ }
});

type RatioLevel = "normal" | "warning" | "high-warning" | "danger";

const ratioLevel = computed<RatioLevel>(() => {
  const r = quickFormulaStore.totalRatio;
  const t = thresholds.value;
  if (r >= t.normalLow && r <= t.normalHigh) return "normal";
  if (r >= t.warningLow && r <= t.warningHigh) return "warning";
  if (r >= t.highWarningLow && r <= t.highWarningHigh) return "high-warning";
  return "danger";
});

const ratioLevelLabel = computed(() => {
  const map: Record<RatioLevel, string> = {
    normal: "正常",
    warning: "轻微偏差",
    "high-warning": "偏差较大",
    danger: "超出范围",
  };
  return map[ratioLevel.value];
});

const nutrition = computed(() => quickFormulaStore.nutritionSummary);

const nutritionMetrics = computed(() => [
  {
    key: "energy",
    label: "能量",
    value: nutrition.value.energy.toFixed(1),
    unit: "kJ",
    icon: "flashlight",
    colorClass: "metric-icon--energy",
  },
  {
    key: "protein",
    label: "蛋白质",
    value: nutrition.value.protein.toFixed(1),
    unit: "g",
    icon: "flag",
    colorClass: "metric-icon--protein",
  },
  {
    key: "fat",
    label: "脂肪",
    value: nutrition.value.fat.toFixed(1),
    unit: "g",
    icon: "rain-light",
    colorClass: "metric-icon--fat",
  },
  {
    key: "carbohydrate",
    label: "碳水",
    value: nutrition.value.carbohydrate.toFixed(1),
    unit: "g",
    icon: "chart-pie",
    colorClass: "metric-icon--carb",
  },
  {
    key: "sodium",
    label: "钠",
    value: nutrition.value.sodium.toFixed(1),
    unit: "mg",
    icon: "precise-monitor",
    colorClass: "metric-icon--sodium",
  },
]);

const costMetrics = computed(() => [
  {
    key: "materialCost",
    label: "原料成本",
    value: quickFormulaStore.materialCost.toFixed(2),
    unit: "¥",
    icon: "shop",
    colorClass: "metric-icon--cost-material",
  },
  {
    key: "costSubtotal",
    label: "成本小计",
    value: quickFormulaStore.costSubtotal.toFixed(2),
    unit: "¥",
    icon: "calculator",
    colorClass: "metric-icon--cost-subtotal",
  },
  {
    key: "totalPrice",
    label: "最终报价",
    value: quickFormulaStore.totalPrice.toFixed(2),
    unit: "¥",
    icon: "money",
    colorClass: "metric-icon--cost-total",
  },
]);
</script>

<template>
  <div class="formula-dashboard">
    <div class="sidebar-trigger-card" @click="emit('toggle-sidebar')"
      :title="props.sidebarCollapsed ? '展开配方列表' : '折叠配方列表'">
      <t-icon :name="props.sidebarCollapsed ? 'chevron-right' : 'chevron-left'" size="14px"
        class="sidebar-trigger-icon" />
      <span class="sidebar-trigger-label">{{ props.sidebarCollapsed ? '配方' : '收起' }}</span>
    </div>

    <div class="dashboard-section">
      <h3 class="section-title">
        <t-icon name="chart-pie" size="12px" class="section-title-icon" />
        营养成分
      </h3>
      <div class="metrics-list">
        <div class="metric-card" :class="`metric-card--ratio-${ratioLevel}`">
          <div class="metric-icon" :class="`metric-icon--ratio-${ratioLevel}`">
            <t-icon name="chart" size="12px" />
          </div>
          <div class="metric-body">
            <span class="metric-label">含量比</span>
            <span class="metric-value" :class="`metric-value--ratio-${ratioLevel}`">
              {{ ratioPercent }}<span class="metric-unit">%</span>
            </span>
            <span v-if="ratioLevel !== 'normal'" class="ratio-warning-text"
              :class="`ratio-warning-text--${ratioLevel}`">{{ ratioLevelLabel }}</span>
          </div>
        </div>
        <div v-for="item in nutritionMetrics" :key="item.key" class="metric-card">
          <div class="metric-icon" :class="item.colorClass">
            <t-icon :name="item.icon" size="12px" />
          </div>
          <div class="metric-body">
            <span class="metric-label">{{ item.label }}</span>
            <span class="metric-value">
              {{ item.value }}<span class="metric-unit">{{ item.unit }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="dashboard-section">
      <h3 class="section-title">
        <t-icon name="money" size="12px" class="section-title-icon" />
        成本核算
      </h3>
      <div class="metrics-list">
        <div v-for="item in costMetrics" :key="item.key" class="metric-card">
          <div class="metric-icon" :class="item.colorClass">
            <t-icon :name="item.icon" size="12px" />
          </div>
          <div class="metric-body">
            <span class="metric-label">{{ item.label }}</span>
            <span class="metric-value">
              {{ item.unit }}{{ item.value }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.formula-dashboard {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: $space-2;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 2px;
  }
}

.dashboard-section {
  background: $bg-container;
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;
  box-shadow: $shadow-elevation-1;
  padding: $space-2-5 $space-2;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: $space-1;
}

.section-title {
  display: flex;
  align-items: center;
  gap: $space-1;
  font-size: $font-size-caption;
  font-weight: $font-weight-bold;
  color: $text-secondary;
  margin: 0 0 $space-1-5;
  letter-spacing: $ls-caption;
}

.section-title-icon {
  color: $emerald-500;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: $space-1;
  padding: $space-1 $space-1-5;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: $bg-hover;
  }

  &--ratio-normal {
    background: $overlay-emerald-08;
  }

  &--ratio-warning {
    background: $color-warning-bg;
  }

  &--ratio-high-warning {
    background: rgba($color-warning-orange, 0.08);
  }

  &--ratio-danger {
    background: $color-danger-light;
  }
}

.metric-icon {
  width: 20px;
  height: 20px;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: $overlay-emerald-08;
  color: $brand-emerald;

  &--ratio-normal {
    background: $overlay-emerald-08;
    color: $brand-emerald;
  }

  &--ratio-warning {
    background: $color-warning-bg;
    color: $color-warning;
  }

  &--ratio-high-warning {
    background: rgba($color-warning-orange, 0.12);
    color: $color-warning-orange;
  }

  &--ratio-danger {
    background: $color-danger-medium;
    color: $color-danger;
  }

  &--energy {
    background: rgba($chart-energy-deep, 0.08);
    color: $chart-energy-deep;
  }

  &--protein {
    background: rgba($chart-protein-deep, 0.08);
    color: $chart-protein-deep;
  }

  &--fat {
    background: rgba($chart-fat-deep, 0.08);
    color: $chart-fat-deep;
  }

  &--carb {
    background: rgba($chart-carb-deep, 0.08);
    color: $chart-carb-deep;
  }

  &--sodium {
    background: rgba($chart-sodium-deep, 0.08);
    color: $chart-sodium-deep;
  }

  &--cost-material {
    background: rgba($chart-protein-deep, 0.08);
    color: $chart-protein-deep;
  }

  &--cost-subtotal {
    background: $color-warning-bg;
    color: $color-warning;
  }

  &--cost-total {
    background: $overlay-emerald-08;
    color: $emerald-500;
  }
}

.metric-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.metric-label {
  font-size: $font-size-caption;
  color: $text-tertiary;
  letter-spacing: $ls-caption;
  white-space: nowrap;
  line-height: 1.2;
}

.metric-value {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-bold;
  color: $text-primary;
  line-height: 1.3;
  white-space: nowrap;

  &--ratio-normal {
    color: $emerald-600;
  }

  &--ratio-warning {
    color: $color-warning;
  }

  &--ratio-high-warning {
    color: $color-warning-orange;
  }

  &--ratio-danger {
    color: $color-danger;
  }
}

.ratio-warning-text {
  font-size: 10px;
  font-weight: $font-weight-semibold;
  line-height: 1.3;
  white-space: nowrap;

  &--warning {
    color: $color-warning;
  }

  &--high-warning {
    color: $color-warning-orange;
  }

  &--danger {
    color: $color-danger;
  }
}

.metric-unit {
  font-size: $font-size-caption;
  font-weight: $font-weight-regular;
  color: $text-tertiary;
  margin-left: 1px;
}

.sidebar-trigger-card {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: $space-1;
  padding: $space-1-5 $space-2;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary-lighter);
  border-radius: $radius-xl;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--color-primary-lighter);
    box-shadow: $shadow-elevation-1;
  }

  &:active {
    transform: scale(0.97);
  }
}

.sidebar-trigger-icon {
  color: var(--color-primary-deep);
  flex-shrink: 0;
}

.sidebar-trigger-label {
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  color: var(--color-primary-deep);
  letter-spacing: $ls-caption;
  white-space: nowrap;
}
</style>
