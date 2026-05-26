<script setup lang="ts">
import { computed } from "vue";
import { useQuickFormulaStore } from "@/stores/quickFormula";

const quickFormulaStore = useQuickFormulaStore();

const ratioPercent = computed(() => (quickFormulaStore.totalRatio * 100).toFixed(1));

const isRatioOver = computed(() => quickFormulaStore.totalRatio > 1);

const nutrition = computed(() => quickFormulaStore.nutritionSummary);

const nutritionMetrics = computed(() => [
  {
    key: "energy",
    label: "能量",
    value: nutrition.value.energy.toFixed(1),
    unit: "kJ",
    icon: "lightning",
    color: "#ffd700",
    bg: "rgba(255, 215, 0, 0.08)",
  },
  {
    key: "protein",
    label: "蛋白质",
    value: nutrition.value.protein.toFixed(1),
    unit: "g",
    icon: "flag",
    color: "#ff8fab",
    bg: "rgba(255, 143, 171, 0.08)",
  },
  {
    key: "fat",
    label: "脂肪",
    value: nutrition.value.fat.toFixed(1),
    unit: "g",
    icon: "drop",
    color: "#7bc96f",
    bg: "rgba(123, 201, 111, 0.08)",
  },
  {
    key: "carbohydrate",
    label: "碳水",
    value: nutrition.value.carbohydrate.toFixed(1),
    unit: "g",
    icon: "chart-pie",
    color: "#7eb6d9",
    bg: "rgba(126, 182, 217, 0.08)",
  },
  {
    key: "sodium",
    label: "钠",
    value: nutrition.value.sodium.toFixed(1),
    unit: "mg",
    icon: "precise-monitor",
    color: "#ba55d3",
    bg: "rgba(186, 85, 211, 0.08)",
  },
]);

const costMetrics = computed(() => [
  {
    key: "materialCost",
    label: "原料成本",
    value: quickFormulaStore.materialCost.toFixed(2),
    unit: "¥",
    icon: "shop",
    color: "#ff8fab",
    bg: "rgba(255, 143, 171, 0.08)",
  },
  {
    key: "costSubtotal",
    label: "成本小计",
    value: quickFormulaStore.costSubtotal.toFixed(2),
    unit: "¥",
    icon: "calculator",
    color: "#f0a040",
    bg: "rgba(240, 160, 64, 0.08)",
  },
  {
    key: "totalPrice",
    label: "最终报价",
    value: quickFormulaStore.totalPrice.toFixed(2),
    unit: "¥",
    icon: "money-circle",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.08)",
  },
]);
</script>

<template>
  <div class="formula-dashboard">
    <!-- 营养成分 -->
    <div class="dashboard-section">
      <h3 class="section-title">营养成分</h3>
      <div class="metrics-grid">
        <div class="metric-card" :class="{ 'metric-card--warning': isRatioOver }">
          <div class="metric-icon" :class="{ 'metric-icon--warning': isRatioOver }">
            <t-icon name="chart" size="14px" />
          </div>
          <div class="metric-body">
            <span class="metric-label">含量比</span>
            <span class="metric-value" :class="{ 'metric-value--danger': isRatioOver }">
              {{ ratioPercent }}<span class="metric-unit">%</span>
            </span>
          </div>
        </div>
        <div v-for="item in nutritionMetrics" :key="item.key" class="metric-card">
          <div class="metric-icon" :style="{ background: item.bg, color: item.color }">
            <t-icon :name="item.icon" size="14px" />
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
    <!-- 成本核算 -->
    <div class="dashboard-section">
      <h3 class="section-title">成本核算</h3>
      <div class="metrics-grid metrics-grid--cost">
        <div v-for="item in costMetrics" :key="item.key" class="metric-card">
          <div class="metric-icon" :style="{ background: item.bg, color: item.color }">
            <t-icon :name="item.icon" size="14px" />
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
  gap: $space-4;
  margin-bottom: 0;
}

.dashboard-section {
  min-width: 0;
  background: $bg-container;
  border-radius: $radius-3xl;
  border: 1px solid $border-color-light;
  box-shadow: $shadow-elevation-1;
  padding: $space-4;

  &:first-child {
    flex: 2;
  }

  &:last-child {
    flex: 1;
  }
}

.section-title {
  font-size: $font-size-h4;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  margin: 0 0 $space-2;
  letter-spacing: $ls-heading;
}

.metrics-grid {
  display: flex;
  gap: $space-2;
  flex-wrap: nowrap;
  overflow: hidden;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-2 $space-2-5;
  background: $bg-container;
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;
  transition: all $transition-fast;
  flex: 1;
  min-width: 0;
  overflow: hidden;

  &:hover {
    box-shadow: $shadow-elevation-1;
    border-color: $border-color;
  }

  &--warning {
    border-color: $color-danger;
    background: $color-danger-light;
  }
}

.metric-icon {
  width: 26px;
  height: 26px;
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: $overlay-emerald-08;
  color: $brand-emerald;

  &--warning {
    background: $color-danger-medium;
    color: $color-danger;
  }
}

.metric-body {
  flex: 1;
  min-width: 0;
}

.metric-label {
  display: block;
  font-size: $font-size-caption;
  color: $text-tertiary;
  letter-spacing: $ls-caption;
  white-space: nowrap;
}

.metric-value {
  display: block;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-bold;
  color: $text-primary;
  line-height: $line-height-tight;
  white-space: nowrap;

  &--danger {
    color: $color-danger;
  }
}

.metric-unit {
  font-size: $font-size-caption;
  font-weight: $font-weight-regular;
  color: $text-tertiary;
  margin-left: $space-0-5;
}

@media screen and (max-width: 1200px) {
  .formula-dashboard {
    flex-direction: column;
  }
}
</style>
