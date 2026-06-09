<script setup lang="ts">
import { computed } from "vue";
import type { CoverageResult } from "@/api/nutrition";

const props = defineProps<{
  coverage: CoverageResult;
}>();

const coveragePercent = computed(() => {
  return Math.round(props.coverage.coverageRate * 100);
});

const coverageColor = computed(() => {
  if (coveragePercent.value >= 80) return "var(--color-success)";
  if (coveragePercent.value >= 60) return "var(--color-warning)";
  return "var(--color-danger)";
});

const confidenceTheme = computed<"success" | "warning" | "danger">(() => {
  if (props.coverage.confidenceLevel === "high") return "success";
  if (props.coverage.confidenceLevel === "medium") return "warning";
  return "danger";
});

const confidenceLabel = computed(() => {
  const map: Record<string, string> = {
    high: "高",
    medium: "中",
    low: "低",
  };
  return map[props.coverage.confidenceLevel ?? "low"] ?? "低";
});

const missingNames = computed(() =>
  props.coverage.missingMaterials.map((m) => m.materialName)
);
</script>

<template>
  <t-card class="data-coverage-card" :bordered="true">
    <template #title>
      <div class="card-title">
        <t-icon name="view-module" class="card-title-icon" />
        <span>数据覆盖度</span>
      </div>
    </template>
    <template #subtitle>
      <span>原料营养数据完整度评估</span>
    </template>
    <div class="coverage-body">
      <div class="coverage-main">
        <div class="coverage-ring">
          <t-progress
            :percentage="coveragePercent"
            :color="coverageColor"
            theme="circle"
            :size="120"
            :stroke-width="8"
            :track-color="'var(--color-bg-container-alt)'"
          >
            <template #label>
              <div class="ring-label">
                <span class="ring-value" :style="{ color: coverageColor }">
                  {{ coveragePercent }}
                </span>
                <span class="ring-unit">%</span>
              </div>
            </template>
          </t-progress>
        </div>
        <div class="coverage-info">
          <div class="coverage-title">数据覆盖度</div>
          <div class="coverage-detail">
            <span class="detail-num">{{ coverage.withNutrition }}</span>
            <span class="detail-sep">/</span>
            <span class="detail-total">{{ coverage.totalMaterials }}</span>
            <span class="detail-text">种原料已录入</span>
          </div>
          <div class="coverage-confidence">
            <span class="confidence-label">置信度</span>
            <t-tag
              :theme="confidenceTheme"
              size="small"
              variant="light"
            >
              {{ confidenceLabel }}
            </t-tag>
          </div>
        </div>
      </div>
      <div v-if="missingNames.length > 0" class="coverage-missing">
        <div class="missing-title">
          <t-icon name="info-circle" size="14px" />
          <span>缺失营养数据的原料</span>
        </div>
        <div class="missing-list">
          <t-tag
            v-for="name in missingNames"
            :key="name"
            theme="default"
            size="small"
            variant="light-outline"
            class="missing-tag"
          >
            {{ name }}
          </t-tag>
        </div>
      </div>
    </div>
  </t-card>
</template>

<style lang="scss" scoped>
.data-coverage-card {
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

.coverage-body {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.coverage-main {
  display: flex;
  align-items: center;
  gap: $space-5;
}

.coverage-ring {
  flex-shrink: 0;

  .ring-label {
    display: flex;
    align-items: baseline;
    justify-content: center;

    .ring-value {
      font-size: $font-size-h1;
      font-weight: $font-weight-bold;
      line-height: 1;
    }

    .ring-unit {
      font-size: $font-size-body;
      color: var(--color-text-secondary);
      margin-left: 1px;
    }
  }
}

.coverage-info {
  display: flex;
  flex-direction: column;
  gap: $space-1-5;

  .coverage-title {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    color: var(--color-text-primary);
  }

  .coverage-detail {
    font-size: $font-size-body-sm;
    color: var(--color-text-secondary);

    .detail-num {
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }

    .detail-sep {
      margin: 0 2px;
      color: var(--color-text-placeholder);
    }

    .detail-total {
      font-variant-numeric: tabular-nums;
    }

    .detail-text {
      margin-left: $space-1;
    }
  }

  .coverage-confidence {
    display: flex;
    align-items: center;
    gap: $space-1;

    .confidence-label {
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
    }
  }
}

.coverage-missing {
  padding: $space-3;
  background: $color-warning-bg;
  border-radius: $radius-md;

  .missing-title {
    display: flex;
    align-items: center;
    gap: $space-1;
    font-size: $font-size-caption;
    font-weight: $font-weight-medium;
    color: $color-warning;
    margin-bottom: $space-2;
  }

  .missing-list {
    display: flex;
    flex-wrap: wrap;
    gap: $space-1;

    .missing-tag {
      font-size: $font-size-micro;
    }
  }
}
</style>
