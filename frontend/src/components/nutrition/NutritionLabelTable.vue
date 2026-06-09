<script setup lang="ts">
import { computed } from "vue";
import type { NutritionLabelResult } from "@/api/nutrition";

const props = defineProps<{
  label?: NutritionLabelResult | null;
}>();

interface NutrientMeta {
  label: string;
  unit: string;
  isCore: boolean;
}

const NUTRIENT_META: Record<string, NutrientMeta> = {
  energy:       { label: "能量",       unit: "kJ",  isCore: true },
  protein:      { label: "蛋白质",     unit: "g",   isCore: true },
  fat:          { label: "脂肪",       unit: "g",   isCore: true },
  carbohydrate: { label: "碳水化合物", unit: "g",   isCore: true },
  sodium:       { label: "钠",         unit: "mg",  isCore: true },
  fiber:        { label: "膳食纤维",   unit: "g",   isCore: false },
  sugars:       { label: "糖",         unit: "g",   isCore: false },
  potassium:    { label: "钾",         unit: "mg",  isCore: false },
  calcium:      { label: "钙",         unit: "mg",  isCore: false },
  iron:         { label: "铁",         unit: "mg",  isCore: false },
  zinc:         { label: "锌",         unit: "mg",  isCore: false },
  magnesium:    { label: "镁",         unit: "mg",  isCore: false },
  phosphorus:   { label: "磷",         unit: "mg",  isCore: false },
  vitaminA:     { label: "维生素A",    unit: "μg",  isCore: false },
  vitaminC:     { label: "维生素C",    unit: "mg",  isCore: false },
  vitaminD:     { label: "维生素D",    unit: "μg",  isCore: false },
  vitaminE:     { label: "维生素E",    unit: "mg",  isCore: false },
  vitaminK:     { label: "维生素K",    unit: "μg",  isCore: false },
  vitaminB1:    { label: "维生素B1",   unit: "mg",  isCore: false },
  vitaminB2:    { label: "维生素B2",   unit: "mg",  isCore: false },
  vitaminB3:    { label: "维生素B3",   unit: "mg",  isCore: false },
  vitaminB6:    { label: "维生素B6",   unit: "mg",  isCore: false },
  vitaminB12:   { label: "维生素B12",  unit: "μg",  isCore: false },
  folate:       { label: "叶酸",       unit: "μg",  isCore: false },
  cholesterol:  { label: "胆固醇",     unit: "mg",  isCore: false },
  transFat:     { label: "反式脂肪酸", unit: "g",   isCore: false },
  saturatedFat: { label: "饱和脂肪酸", unit: "g",   isCore: false },
};

// 0界限归零阈值
const ZERO_THRESHOLD: Record<string, number> = {
  energy: 17, protein: 0.5, fat: 0.5, carbohydrate: 0.5, sodium: 5,
};

const CORE_ORDER = ["energy", "protein", "fat", "carbohydrate", "sodium"];

interface LabelItem {
  field: string;
  label: string;
  value: number;
  unit: string;
  nrvPercent: number | null;
  isZero: boolean;
  isCore: boolean;
}

const items = computed<LabelItem[]>(() => {
  const per100g = props.label?.per100g;
  const nrvPercent = props.label?.nrvPercent;
  if (!per100g) return [];

  const result: LabelItem[] = [];
  // 核心营养素按固定顺序
  for (const field of CORE_ORDER) {
    const meta = NUTRIENT_META[field];
    if (!meta || per100g[field] === undefined) continue;
    const rawValue = per100g[field];
    const threshold = ZERO_THRESHOLD[field];
    const isZero = threshold !== undefined && rawValue <= threshold;
    result.push({
      field,
      label: meta.label,
      value: isZero ? 0 : rawValue,
      unit: meta.unit,
      nrvPercent: nrvPercent?.[field] ?? null,
      isZero,
      isCore: true,
    });
  }
  // 扩展营养素按数据中的出现顺序
  for (const [field, rawValue] of Object.entries(per100g)) {
    if (CORE_ORDER.includes(field)) continue;
    const meta = NUTRIENT_META[field];
    if (!meta) continue;
    const threshold = ZERO_THRESHOLD[field];
    const isZero = threshold !== undefined && rawValue <= threshold;
    result.push({
      field,
      label: meta.label,
      value: isZero ? 0 : rawValue,
      unit: meta.unit,
      nrvPercent: nrvPercent?.[field] ?? null,
      isZero,
      isCore: false,
    });
  }
  return result;
});

const coreItems = computed(() => items.value.filter((i) => i.isCore));
const extendedItems = computed(() => items.value.filter((i) => !i.isCore));
const hasExtended = computed(() => extendedItems.value.length > 0);

function formatValue(item: LabelItem): string {
  if (item.isZero) return "0";
  return item.value.toFixed(item.value < 10 ? 1 : 0);
}

function formatNrv(nrv: number | null): string {
  if (nrv === null || nrv === 0) return "--";
  return `NRV${nrv.toFixed(1)}%`;
}

interface NutrientIcon {
  icon: string;
  colorClass: string;
}

const nutrientIconMap: Record<string, NutrientIcon> = {
  energy:       { icon: "flashlight",      colorClass: "nl-icon--energy" },
  protein:      { icon: "flag",            colorClass: "nl-icon--protein" },
  fat:          { icon: "rain-light",      colorClass: "nl-icon--fat" },
  carbohydrate: { icon: "chart-pie",       colorClass: "nl-icon--carb" },
  sodium:       { icon: "precise-monitor", colorClass: "nl-icon--sodium" },
  fiber:        { icon: "tree-round-dot",  colorClass: "nl-icon--fiber" },
  sugars:       { icon: "heart",           colorClass: "nl-icon--sugar" },
  calcium:      { icon: "circle",          colorClass: "nl-icon--mineral" },
  iron:         { icon: "circle",          colorClass: "nl-icon--mineral" },
  zinc:         { icon: "circle",          colorClass: "nl-icon--mineral" },
  potassium:    { icon: "circle",          colorClass: "nl-icon--mineral" },
};

const DEFAULT_ICON: NutrientIcon = { icon: "circle", colorClass: "nl-icon--default" };

function getIcon(field: string): NutrientIcon {
  return nutrientIconMap[field] ?? DEFAULT_ICON;
}
</script>

<template>
  <div class="nutrition-label-list">
    <template v-if="items.length > 0">
      <div
        v-for="item in coreItems"
        :key="item.field"
        class="nl-item"
        :class="{ 'nl-item--zero': item.isZero }"
      >
        <div class="nl-item-icon" :class="getIcon(item.field).colorClass">
          <t-icon :name="getIcon(item.field).icon" size="12px" />
        </div>
        <span class="nl-item-label">{{ item.label }}</span>
        <span class="nl-item-value">
          {{ formatValue(item) }}
          <small>{{ item.unit }}</small>
        </span>
        <span v-if="item.nrvPercent !== null && item.nrvPercent > 0" class="nl-nrv">
          {{ formatNrv(item.nrvPercent) }}
        </span>
      </div>

      <div v-if="hasExtended" class="nl-divider">
        <span>扩展营养素</span>
      </div>

      <div
        v-for="item in extendedItems"
        :key="item.field"
        class="nl-item"
        :class="{ 'nl-item--zero': item.isZero }"
      >
        <div class="nl-item-icon" :class="getIcon(item.field).colorClass">
          <t-icon :name="getIcon(item.field).icon" size="12px" />
        </div>
        <span class="nl-item-label">{{ item.label }}</span>
        <span class="nl-item-value">
          {{ formatValue(item) }}
          <small>{{ item.unit }}</small>
        </span>
        <span v-if="item.nrvPercent !== null && item.nrvPercent > 0" class="nl-nrv">
          {{ formatNrv(item.nrvPercent) }}
        </span>
      </div>
    </template>

    <div v-else class="nl-empty">暂无数据</div>
  </div>
</template>

<style lang="scss" scoped>
.nutrition-label-list {
  padding: $space-1 0;
}

.nl-item {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-1-5 $space-2;
  border-radius: $radius-md;
  transition: background $transition-fast;

  &:hover {
    background: var(--color-bg-hover);
  }

  &--zero {
    .nl-item-value {
      color: var(--color-text-placeholder);
    }
  }
}

.nl-item-icon {
  width: 22px;
  height: 22px;
  border-radius: $radius-sm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  :deep(svg),
  :deep(.t-icon) {
    color: inherit !important;
  }
}

.nl-icon--energy {
  background: rgba($chart-energy-deep, 0.08);
  color: $chart-energy-deep;
}

.nl-icon--protein {
  background: rgba($chart-protein-deep, 0.08);
  color: $chart-protein-deep;
}

.nl-icon--fat {
  background: rgba($chart-fat-deep, 0.08);
  color: $chart-fat-deep;
}

.nl-icon--carb {
  background: rgba($chart-carb-deep, 0.08);
  color: $chart-carb-deep;
}

.nl-icon--sodium {
  background: rgba($chart-sodium-deep, 0.08);
  color: $chart-sodium-deep;
}

.nl-icon--fiber {
  background: $overlay-emerald-08;
  color: $emerald-500;
}

.nl-icon--sugar {
  background: rgba($chart-protein-deep, 0.06);
  color: $chart-protein;
}

.nl-icon--mineral {
  background: rgba($chart-carb-deep, 0.06);
  color: $chart-carb-deep;
}

.nl-icon--default {
  background: var(--color-bg-container-alt);
  color: var(--color-text-placeholder);
}

.nl-item-label {
  flex: 1;
  font-size: $font-size-body-sm;
  color: var(--color-text-regular);
  min-width: 0;
}

.nl-item-value {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  small {
    font-size: $font-size-caption;
    font-weight: $font-weight-regular;
    color: var(--color-text-placeholder);
    margin-left: $space-0-5;
  }
}

.nl-nrv {
  display: inline-block;
  padding: 0 $space-1-5;
  border-radius: $radius-sm;
  background: $overlay-emerald-06;
  color: $emerald-600;
  font-size: 10px;
  font-weight: $font-weight-semibold;
  line-height: 1.8;
  white-space: nowrap;
  flex-shrink: 0;
}

.nl-divider {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2 $space-2 $space-1;

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--color-border-light);
  }

  span {
    font-size: $font-size-caption;
    color: var(--color-text-placeholder);
    white-space: nowrap;
  }
}

.nl-empty {
  text-align: center;
  padding: $space-6 $space-4;
  color: var(--color-text-placeholder);
  font-size: $font-size-body-sm;
}
</style>
