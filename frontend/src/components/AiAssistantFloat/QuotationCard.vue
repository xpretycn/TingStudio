<template>
  <div class="quotation-card">
    <div class="card-header">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="12" height="12" rx="2" stroke="var(--color-primary)" stroke-width="1.2" fill="none" />
        <path d="M4 6h8M4 9h5" stroke="var(--color-primary)" stroke-width="1.2" stroke-linecap="round" />
      </svg>
      <span>智能报价单</span>
      <span class="formula-name">{{ data.formula?.name }}</span>
    </div>

    <div class="cost-grid">
      <div class="cost-item">
        <span class="cost-label">原料小计</span>
        <span class="cost-val">&yen;{{ data.costBreakdown?.material_subtotal?.toFixed(2) }}</span>
      </div>
      <div class="cost-item">
        <span class="cost-label">包装成本</span>
        <span class="cost-val">&yen;{{ data.costBreakdown?.packaging_cost?.toFixed(2) }}</span>
      </div>
      <div class="cost-item">
        <span class="cost-label">其他费用</span>
        <span class="cost-val">&yen;{{ data.costBreakdown?.other_costs?.toFixed(2) }}</span>
      </div>
      <div class="cost-item">
        <span class="cost-label">成本小计</span>
        <span class="cost-val cost-val--sub">&yen;{{ data.costBreakdown?.cost_subtotal?.toFixed(2) }}</span>
      </div>
      <div class="cost-item">
        <span class="cost-label">利润率</span>
        <span class="cost-val">{{ data.profitMargin }}%</span>
      </div>
      <div class="cost-item">
        <span class="cost-label">利润额</span>
        <span class="cost-val cost-val--profit">&yen;{{ data.costBreakdown?.profit_amount?.toFixed(2) }}</span>
      </div>
    </div>

    <div class="total-row">
      <span class="total-label">建议售价</span>
      <span class="total-val">&yen;{{ data.costBreakdown?.total_price?.toFixed(2) }}</span>
    </div>

    <div v-if="data.unitCost" class="unit-cost-row">
      <span>每公斤成本：&yen;{{ data.unitCost?.per_kg_cost?.toFixed(2) }}</span>
      <span>每100g成本：&yen;{{ data.unitCost?.per_100g_cost?.toFixed(2) }}</span>
    </div>

    <div v-if="data.costBreakdown?.breakdown?.length" class="section">
      <div class="section-title">原料明细</div>
      <div class="mat-table">
        <div class="mat-row mat-row--header">
          <span>原料</span>
          <span>用量(g)</span>
          <span>单价(元/kg)</span>
          <span>小计</span>
        </div>
        <div v-for="item in data.costBreakdown.breakdown" :key="item.name" class="mat-row">
          <span>{{ item.name }}</span>
          <span>{{ item.quantity }}</span>
          <span>{{ item.unit_price }}</span>
          <span>&yen;{{ item.subtotal?.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  data: any;
}>();
</script>

<style scoped lang="scss">
.quotation-card {
  background: $bg-container;
  border: 1px solid $border-color-light;
  border-radius: 12px;
  padding: var(--space-3-5);
  margin: 8px 0;
  font-size: 13px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 12px;

  .formula-name {
    font-weight: 400;
    color: $text-tertiary;
    font-size: 12px;
    margin-left: auto;
  }
}

.cost-grid {
  display: grid;
  gap: var(--space-1-5);
  margin-bottom: var(--space-2-5);
}

.cost-item {
  display: flex;
  justify-content: space-between;
  padding: var(--space-1-25) var(--space-2-5);
  background: $bg-page;
  border-radius: 6px;
  font-size: 12px;

  .cost-label {
    color: $text-secondary;
  }

  .cost-val {
    font-weight: 500;
    color: $text-primary;

    &--sub {
      color: var(--color-warning);
    }

    &--profit {
      color: var(--color-primary);
    }
  }
}

.total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2-5);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02));
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 8px;
  margin-bottom: 8px;

  .total-label {
    font-weight: 600;
    color: $text-primary;
  }

  .total-val {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-primary);
  }
}

.unit-cost-row {
  display: flex;
  gap: 16px;
  padding: var(--space-1-5) var(--space-2-5);
  font-size: 11px;
  color: $text-tertiary;
}

.section {
  margin-top: var(--space-2-5);

  .section-title {
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: var(--space-1-5);
    font-size: 12px;
  }
}

.mat-table {
  border: 1px solid $border-color-light;
  border-radius: 8px;
  overflow: hidden;
}

.mat-row {
  display: grid;
  grid-template-columns: 1fr 60px 70px 60px;
  padding: var(--space-1-5) var(--space-2-5);
  font-size: 12px;
  gap: 4px;

  &--header {
    background: $bg-page;
    font-weight: 600;
    color: $text-tertiary;
  }

  &:not(:last-child) {
    border-bottom: 1px solid $border-color-light;
  }
}
</style>
