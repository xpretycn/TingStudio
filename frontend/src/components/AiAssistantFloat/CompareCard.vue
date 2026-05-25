<template>
  <div class="compare-card">
    <div class="card-header">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="3" width="5" height="10" rx="1" stroke="var(--color-primary)" stroke-width="1.2" fill="none" />
        <rect x="9" y="3" width="5" height="10" rx="1" stroke="var(--color-primary)" stroke-width="1.2" fill="none" />
      </svg>
      <span>配方对比分析</span>
    </div>

    <div class="formula-info">
      <div class="info-item">
        <span class="info-tag tag-a">A</span>
        <span class="info-name">{{ data.formulaA?.name }}</span>
        <span class="info-detail">{{ data.formulaA?.finishedWeight }}g</span>
      </div>
      <div class="info-vs">VS</div>
      <div class="info-item">
        <span class="info-tag tag-b">B</span>
        <span class="info-name">{{ data.formulaB?.name }}</span>
        <span class="info-detail">{{ data.formulaB?.finishedWeight }}g</span>
      </div>
    </div>

    <div v-if="data.materialDiff?.length" class="section">
      <div class="section-title">原料差异</div>
      <div class="diff-table">
        <div class="diff-row diff-row--header">
          <span class="diff-col diff-col--name">原料</span>
          <span class="diff-col diff-col--num">A(g)</span>
          <span class="diff-col diff-col--num">B(g)</span>
          <span class="diff-col diff-col--diff">差值</span>
        </div>
        <div v-for="item in data.materialDiff" :key="item.name" class="diff-row"
          :class="{ 'diff-row--only': item.onlyIn !== 'both' }">
          <span class="diff-col diff-col--name">{{ item.name }}</span>
          <span class="diff-col diff-col--num">{{ item.quantityA }}</span>
          <span class="diff-col diff-col--num">{{ item.quantityB }}</span>
          <span class="diff-col diff-col--diff" :class="diffClass(item.diff)">
            {{ item.diff > 0 ? '+' : '' }}{{ item.diff }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="data.nutritionA || data.nutritionB" class="section">
      <div class="section-title">营养成分对比</div>
      <div class="nutrition-grid">
        <div class="nutri-item">
          <span class="nutri-label">能量(kcal)</span>
          <span class="nutri-val-a">{{ data.nutritionA?.energy?.toFixed?.(1) }}</span>
          <span class="nutri-val-b">{{ data.nutritionB?.energy?.toFixed?.(1) }}</span>
        </div>
        <div class="nutri-item">
          <span class="nutri-label">蛋白质(g)</span>
          <span class="nutri-val-a">{{ data.nutritionA?.protein?.toFixed?.(1) }}</span>
          <span class="nutri-val-b">{{ data.nutritionB?.protein?.toFixed?.(1) }}</span>
        </div>
        <div class="nutri-item">
          <span class="nutri-label">脂肪(g)</span>
          <span class="nutri-val-a">{{ data.nutritionA?.fat?.toFixed?.(1) }}</span>
          <span class="nutri-val-b">{{ data.nutritionB?.fat?.toFixed?.(1) }}</span>
        </div>
        <div class="nutri-item">
          <span class="nutri-label">碳水(g)</span>
          <span class="nutri-val-a">{{ data.nutritionA?.carbohydrate?.toFixed?.(1) }}</span>
          <span class="nutri-val-b">{{ data.nutritionB?.carbohydrate?.toFixed?.(1) }}</span>
        </div>
        <div class="nutri-item">
          <span class="nutri-label">钠(mg)</span>
          <span class="nutri-val-a">{{ data.nutritionA?.sodium?.toFixed?.(1) }}</span>
          <span class="nutri-val-b">{{ data.nutritionB?.sodium?.toFixed?.(1) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface FormulaInfo {
  name: string;
  finishedWeight: number;
}

interface MaterialDiffItem {
  name: string;
  quantityA: number;
  quantityB: number;
  diff: number;
  onlyIn: string;
}

interface NutritionInfo {
  energy: number;
  protein: number;
  fat: number;
  carbohydrate: number;
  sodium: number;
}

interface CompareData {
  formulaA?: FormulaInfo;
  formulaB?: FormulaInfo;
  materialDiff?: MaterialDiffItem[];
  nutritionA?: NutritionInfo;
  nutritionB?: NutritionInfo;
}

defineProps<{
  data: CompareData;
}>();

function diffClass(v: number): string {
  if (v > 0) return "diff-up";
  if (v < 0) return "diff-down";
  return "diff-zero";
}
</script>

<style scoped lang="scss">
.compare-card {
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
}

.formula-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--space-3-5);

  .info-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
  }

  .info-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    color: #fff;

    &.tag-a { background: var(--color-primary); }
    &.tag-b { background: var(--color-primary); }
  }

  .info-name {
    font-weight: 500;
    color: $text-primary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .info-detail {
    color: $text-tertiary;
    font-size: 12px;
  }

  .info-vs {
    font-weight: 700;
    font-size: 11px;
    color: $text-tertiary;
    flex-shrink: 0;
  }
}

.section {
  margin-top: 12px;

  .section-title {
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: 8px;
    font-size: 12px;
  }
}

.diff-table {
  border: 1px solid $border-color-light;
  border-radius: 8px;
  overflow: hidden;
}

.diff-row {
  display: flex;
  padding: var(--space-1-5) var(--space-2-5);
  font-size: 12px;

  &--header {
    background: $bg-page;
    font-weight: 600;
    color: $text-tertiary;
  }

  &--only {
    background: rgba(255, 107, 138, 0.04);
  }

  &:not(:last-child) {
    border-bottom: 1px solid $border-color-light;
  }
}

.diff-col {
  &--name { flex: 1; }
  &--num { width: 50px; text-align: right; }
  &--diff { width: 50px; text-align: right; font-weight: 600; }
}

.diff-up { color: var(--color-primary); }
.diff-down { color: var(--color-danger); }
.diff-zero { color: $text-tertiary; }

.nutrition-grid {
  display: grid;
  gap: var(--space-1-5);
}

.nutri-item {
  display: grid;
  grid-template-columns: 1fr 60px 60px;
  padding: var(--space-1-25) var(--space-2-5);
  background: $bg-page;
  border-radius: 6px;
  font-size: 12px;

  .nutri-label { color: $text-secondary; }
  .nutri-val-a { text-align: right; color: var(--color-primary); font-weight: 500; }
  .nutri-val-b { text-align: right; color: var(--color-primary); font-weight: 500; }
}
</style>
