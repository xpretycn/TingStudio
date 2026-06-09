<script setup lang="ts">
import { computed } from "vue";
import type { AnalysisSummary } from "@/api/nutrition";

const props = defineProps<{
  summary: AnalysisSummary;
}>();

type LevelColor = "good" | "warning" | "poor";

const levelColorMap: Record<LevelColor, string> = {
  good: "var(--color-success)",
  warning: "var(--color-warning)",
  poor: "var(--color-danger)",
};

const levelLabelMap: Record<LevelColor, string> = {
  good: "良好",
  warning: "注意",
  poor: "不足",
};

const fortificationStatusMap: Record<string, { label: string; level: LevelColor }> = {
  compliant: { label: "合规", level: "good" },
  warning: { label: "需关注", level: "warning" },
  non_compliant: { label: "不合规", level: "poor" },
};

const indicators = computed(() => [
  {
    key: "coverage",
    label: "数据覆盖度",
    level: props.summary.coverageLevel,
    color: levelColorMap[props.summary.coverageLevel],
    display: levelLabelMap[props.summary.coverageLevel],
  },
  {
    key: "compliance",
    label: "达标率",
    level: props.summary.complianceLevel,
    color: levelColorMap[props.summary.complianceLevel],
    display: levelLabelMap[props.summary.complianceLevel],
  },
  {
    key: "claims",
    label: "可用声称",
    level: props.summary.claimsCount > 0 ? "good" : "poor",
    color: props.summary.claimsCount > 0 ? "var(--color-success)" : "var(--color-danger)",
    display: `${props.summary.claimsCount} 项`,
  },
  {
    key: "fortification",
    level: fortificationStatusMap[props.summary.fortificationStatus]?.level ?? "good",
    color: levelColorMap[fortificationStatusMap[props.summary.fortificationStatus]?.level ?? "good"],
    display: fortificationStatusMap[props.summary.fortificationStatus]?.label ?? "合规",
  },
]);
</script>

<template>
  <t-card class="analysis-summary-card" :bordered="true">
    <template #title>
      <div class="card-title">
        <t-icon name="chart-analytics" class="card-title-icon" />
        <span>分析摘要</span>
      </div>
    </template>
    <template #subtitle>
      <span>核心指标综合判定</span>
    </template>
    <div class="summary-body">
      <div class="summary-indicators">
        <div
          v-for="item in indicators"
          :key="item.key"
          class="indicator-item"
        >
          <span class="indicator-dot" :style="{ background: item.color }" />
          <div class="indicator-content">
            <span class="indicator-label">{{ item.label }}</span>
            <span class="indicator-value" :style="{ color: item.color }">
              {{ item.display }}
            </span>
          </div>
        </div>
      </div>
      <div class="summary-one-line">
        <span class="one-line-text">{{ summary.oneLineSummary }}</span>
      </div>
    </div>
  </t-card>
</template>

<style lang="scss" scoped>
.analysis-summary-card {
  border-radius: $radius-xl !important;

  :deep(.t-card__body) {
    padding: $space-5 !important;
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: $space-2;

  .card-title-icon {
    color: var(--color-primary);
    font-size: $font-size-h4;
  }
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.summary-indicators {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-3;
}

.indicator-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  background: var(--color-bg-container-alt);
  border-radius: $radius-md;

  .indicator-dot {
    width: 8px;
    height: 8px;
    border-radius: $radius-circle;
    flex-shrink: 0;
  }

  .indicator-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    .indicator-label {
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .indicator-value {
      font-size: $font-size-h3;
      font-weight: $font-weight-bold;
      line-height: $line-height-tight;
    }
  }
}

.summary-one-line {
  padding: $space-3 $space-4;
  background: var(--color-primary-bg);
  border-radius: $radius-md;
  border-left: 3px solid var(--color-primary);

  .one-line-text {
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    color: var(--color-text-primary);
    line-height: $line-height-normal;
  }
}
</style>
