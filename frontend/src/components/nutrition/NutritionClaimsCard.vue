<script setup lang="ts">
import { computed, ref } from "vue";
import type { ClaimResult } from "@/api/nutrition";

const props = defineProps<{
  claims: ClaimResult[];
}>();

const satisfiedClaims = computed(() =>
  props.claims.filter((c) => c.satisfied)
);

const unsatisfiedClaims = computed(() =>
  props.claims.filter((c) => !c.satisfied)
);

const showSatisfied = ref(true);
const showUnsatisfied = ref(true);

function formatGap(gap: number): string {
  if (gap > 0) return `+${gap.toFixed(1)}`;
  return gap.toFixed(1);
}

function formatValue(val: number, unit: string): string {
  return `${val.toFixed(1)} ${unit}`;
}
</script>

<template>
  <t-card class="nutrition-claims-card" :bordered="true">
    <template #title>
      <div class="card-title">
        <t-icon name="check-circle" class="card-title-icon" />
        <span>含量声称判定</span>
        <span class="claims-summary-inline">
          <t-tag theme="success" size="small" variant="light" class="summary-tag">
            已满足 {{ satisfiedClaims.length }}
          </t-tag>
          <t-tag theme="default" size="small" variant="light" class="summary-tag">
            未满足 {{ unsatisfiedClaims.length }}
          </t-tag>
        </span>
      </div>
    </template>
    <template #subtitle>
      <span>GB 28050 附录 C.1 · 按声明含量阈值判定</span>
    </template>

    <div class="claims-body">
      <div v-if="satisfiedClaims.length > 0" class="claims-group claims-group--satisfied">
        <div class="group-header" @click="showSatisfied = !showSatisfied">
          <span class="group-icon">✓</span>
          <span class="group-title">已满足的声称</span>
          <t-tag theme="success" size="small" variant="light">
            {{ satisfiedClaims.length }}
          </t-tag>
          <t-icon :name="showSatisfied ? 'chevron-down' : 'chevron-right'" class="toggle-icon" />
        </div>
        <div v-show="showSatisfied" class="claims-list">
          <div
            v-for="claim in satisfiedClaims"
            :key="claim.claim"
            class="claim-item claim-item--satisfied"
          >
            <div class="claim-main">
              <span class="claim-name">{{ claim.claim }}</span>
              <span class="claim-field">({{ claim.field }})</span>
            </div>
            <div class="claim-detail">
              <span class="detail-value">{{ formatValue(claim.currentValue, claim.unit) }}</span>
              <span class="detail-vs">vs</span>
              <span class="detail-threshold">{{ formatValue(claim.threshold, claim.unit) }}</span>
            </div>
            <div class="claim-meta">
              <span class="detail-gap detail-gap--positive">{{ formatGap(claim.gap) }}</span>
              <span class="claim-standard">{{ claim.standard }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="unsatisfiedClaims.length > 0" class="claims-group claims-group--unsatisfied">
        <div class="group-header" @click="showUnsatisfied = !showUnsatisfied">
          <span class="group-icon">✗</span>
          <span class="group-title">未满足的声称</span>
          <t-tag theme="default" size="small" variant="light">
            {{ unsatisfiedClaims.length }}
          </t-tag>
          <t-icon :name="showUnsatisfied ? 'chevron-down' : 'chevron-right'" class="toggle-icon" />
        </div>
        <div v-show="showUnsatisfied" class="claims-list">
          <div
            v-for="claim in unsatisfiedClaims"
            :key="claim.claim"
            class="claim-item claim-item--unsatisfied"
          >
            <div class="claim-main">
              <span class="claim-name">{{ claim.claim }}</span>
              <span class="claim-field">({{ claim.field }})</span>
            </div>
            <div class="claim-detail">
              <span class="detail-value">{{ formatValue(claim.currentValue, claim.unit) }}</span>
              <span class="detail-vs">vs</span>
              <span class="detail-threshold">{{ formatValue(claim.threshold, claim.unit) }}</span>
            </div>
            <div class="claim-meta">
              <span class="detail-gap detail-gap--negative">{{ formatGap(claim.gap) }}</span>
              <span class="claim-standard">{{ claim.standard }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="claims.length === 0" class="claims-empty">
        <t-icon name="info-circle" size="20px" />
        <span>暂无含量声称判定数据</span>
      </div>
    </div>
  </t-card>
</template>

<style lang="scss" scoped>
.nutrition-claims-card {
  border-radius: $radius-xl !important;

  :deep(.t-card__body) {
    padding: $space-5 !important;
  }
}

.claims-body {
  display: flex;
  flex-direction: column;
  gap: $space-4;
}

.claims-group {
  .group-header {
    display: flex;
    align-items: center;
    gap: $space-1-5;
    margin-bottom: $space-2-5;
    cursor: pointer;
    user-select: none;
    padding: $space-1 0;

    .group-icon {
      font-size: $font-size-body;
      font-weight: $font-weight-bold;
      width: 18px;
      height: 18px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: $radius-circle;
    }

    .group-title {
      font-size: $font-size-body;
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
    }

    .toggle-icon {
      margin-left: auto;
      color: var(--color-text-placeholder);
    }
  }

  &--satisfied .group-header .group-icon {
    color: $color-success;
    background: $color-success-bg;
  }

  &--unsatisfied .group-header .group-icon {
    color: var(--color-danger);
    background: var(--color-danger-bg);
  }
}

.claims-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: $space-2-5;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.claim-item {
  padding: $space-2-5 $space-3;
  border-radius: $radius-md;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  gap: $space-1;
  min-width: 0;

  &--satisfied {
    background: $color-success-bg;
    border-color: $color-success-alpha-light;
  }

  &--unsatisfied {
    background: var(--color-bg-container-alt);
    border-color: var(--color-border-light);
  }

  .claim-main {
    display: flex;
    align-items: baseline;
    gap: $space-1;
    min-width: 0;

    .claim-name {
      font-size: $font-size-body-sm;
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .claim-field {
      font-size: $font-size-micro;
      color: var(--color-text-placeholder);
      flex-shrink: 0;
    }
  }

  .claim-detail {
    display: flex;
    align-items: center;
    gap: $space-1;
    font-size: $font-size-caption;
    color: var(--color-text-secondary);

    .detail-value {
      font-weight: $font-weight-medium;
      color: var(--color-text-primary);
      font-variant-numeric: tabular-nums;
    }

    .detail-vs {
      color: var(--color-text-placeholder);
    }

    .detail-threshold {
      font-variant-numeric: tabular-nums;
    }
  }

  .claim-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-1;

    .detail-gap {
      font-size: $font-size-caption;
      font-weight: $font-weight-semibold;
      font-variant-numeric: tabular-nums;

      &--positive {
        color: $color-success;
      }

      &--negative {
        color: $color-danger;
      }
    }

    .claim-standard {
      font-size: $font-size-micro;
      color: var(--color-text-placeholder);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.claims-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $space-2;
  padding: $space-6 0;
  font-size: $font-size-body-sm;
  color: var(--color-text-placeholder);
}

.card-title {
  display: flex;
  align-items: center;
  gap: $space-2;

  .card-title-icon {
    color: $color-success;
    font-size: $font-size-h4;
  }

  .claims-summary-inline {
    display: inline-flex;
    align-items: center;
    gap: $space-1;
    margin-left: $space-1;

    .summary-tag {
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
