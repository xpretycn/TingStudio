<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useMaterialStore } from "@/stores/material";
import { useEnumStore } from "@/stores/enum";
import type { Material } from "@/api/material";
import MaterialFish from "./MaterialFish.vue";
import type { QuickFormulaMaterial } from "@/types/quickFormula";

const store = useQuickFormulaStore();
const materialStore = useMaterialStore();
const enumStore = useEnumStore();

const showAdvancedFilter = ref(false);
const viewMode = ref<"grid" | "pool">("grid");

onMounted(() => {
  if (materialStore.allMaterials.length === 0) {
    materialStore.fetchAllForSelect();
  }
  if (!enumStore.loaded) {
    enumStore.fetchEnums();
  }
});

const appearanceOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("appearance")
);

const tasteOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("taste")
);

const efficacyOptions = computed(() =>
  enumStore.getActiveOptionsByCategory("efficacy")
);

const activeAdvancedCount = computed(() => {
  let count = 0;
  if (store.poolFilter.appearance.length > 0) count++;
  if (store.poolFilter.taste.length > 0) count++;
  if (store.poolFilter.efficacy.length > 0) count++;
  return count;
});

const hasAdvancedOptions = computed(() =>
  appearanceOptions.value.length > 0 || tasteOptions.value.length > 0 || efficacyOptions.value.length > 0
);

const filteredMaterials = computed<Material[]>(() => {
  const addedIds = new Set(store.formulaData.materials.map((m) => m.materialId));
  let pool = materialStore.allMaterials.filter((m: Material) => !addedIds.has(m.id));

  if (store.poolFilter.keyword) {
    const kw = store.poolFilter.keyword.toLowerCase();
    pool = pool.filter((m: Material) => m.name.toLowerCase().includes(kw));
  }

  if (store.poolFilter.type !== "all") {
    pool = pool.filter((m: Material) => m.materialType === store.poolFilter.type);
  }

  if (store.poolFilter.appearance.length > 0) {
    pool = pool.filter((m: Material) => {
      if (!m.appearance) return false;
      return store.poolFilter.appearance.some((v) => m.appearance!.includes(v));
    });
  }

  if (store.poolFilter.taste.length > 0) {
    pool = pool.filter((m: Material) => {
      if (!m.taste) return false;
      return store.poolFilter.taste.some((v) => m.taste!.includes(v));
    });
  }

  if (store.poolFilter.efficacy.length > 0) {
    pool = pool.filter((m: Material) => {
      if (!m.efficacy) return false;
      return store.poolFilter.efficacy.some((v) => m.efficacy!.includes(v));
    });
  }

  return pool;
});

const herbCount = computed(() => filteredMaterials.value.filter((m: Material) => m.materialType === "herb").length);
const supplementCount = computed(() => filteredMaterials.value.filter((m: Material) => m.materialType === "supplement").length);

function handleAdd(material: QuickFormulaMaterial) {
  store.addMaterial(material);
}

function clearFilter() {
  store.poolFilter.keyword = "";
  store.poolFilter.type = "all";
  store.poolFilter.appearance = [];
  store.poolFilter.taste = [];
  store.poolFilter.efficacy = [];
}

function toggleMultiFilter(field: "appearance" | "taste" | "efficacy", value: string) {
  const arr = store.poolFilter[field];
  const idx = arr.indexOf(value);
  if (idx === -1) {
    arr.push(value);
  } else {
    arr.splice(idx, 1);
  }
}

function removeAdvancedFilter(field: "appearance" | "taste" | "efficacy", value: string) {
  toggleMultiFilter(field, value);
}

const fishPositions = computed(() => {
  const count = filteredMaterials.value.length;
  if (count === 0) return new Map<string, { x: number; y: number; }>();

  const cols = Math.max(1, Math.ceil(Math.sqrt(count * 0.8)));
  const rows = Math.ceil(count / cols);
  const cellW = 90 / cols;
  const cellH = 90 / rows;
  const fishW = 18;
  const fishH = 8;

  const positions = new Map<string, { x: number; y: number; }>();
  filteredMaterials.value.forEach((m, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const maxOffsetX = Math.max(cellW - fishW, 0);
    const maxOffsetY = Math.max(cellH - fishH, 0);
    const offsetX = Math.random() * maxOffsetX;
    const offsetY = Math.random() * maxOffsetY;
    positions.set(m.id, {
      x: col * cellW + offsetX + 3,
      y: row * cellH + offsetY + 3,
    });
  });
  return positions;
});

const typeOptions = [
  { label: "全部", value: "all" },
  { label: "主料", value: "herb" },
  { label: "辅料", value: "supplement" },
] as const;
</script>

<template>
  <div class="material-pool">
    <div class="pool-filter">
      <div class="filter-top-row">
        <t-input v-model="store.poolFilter.keyword" placeholder="搜索原料" clearable size="small" class="filter-search">
          <template #prefix-icon>
            <t-icon name="search" />
          </template>
        </t-input>
        <t-button variant="text" size="small" @click="clearFilter" class="filter-reset">
          <template #icon><t-icon name="refresh" /></template>
          重置
        </t-button>
        <div class="filter-top-actions">
          <button class="view-toggle-btn" :class="{ active: viewMode === 'grid' }" title="网格排列"
            @click="viewMode = 'grid'">
            <t-icon name="view-module" size="16px" />
          </button>
          <button class="view-toggle-btn" :class="{ active: viewMode === 'pool' }" title="自由游动"
            @click="viewMode = 'pool'">
            <t-icon name="fish" size="16px" />
          </button>
        </div>
      </div>

      <div class="filter-row">
        <span class="filter-label">类型</span>
        <div class="filter-tags">
          <button v-for="opt in typeOptions" :key="opt.value" class="tag-btn"
            :class="{ 'tag-btn--active': store.poolFilter.type === opt.value }"
            @click="store.poolFilter.type = opt.value">
            {{ opt.label }}
          </button>
        </div>
      </div>

      <div v-if="activeAdvancedCount > 0" class="active-filters">
        <template v-if="store.poolFilter.appearance.length > 0">
          <span v-for="v in store.poolFilter.appearance" :key="'app-' + v" class="active-filter-tag"
            @click="removeAdvancedFilter('appearance', v)">
            {{ v }} <t-icon name="close" size="10px" />
          </span>
        </template>
        <template v-if="store.poolFilter.taste.length > 0">
          <span v-for="v in store.poolFilter.taste" :key="'taste-' + v" class="active-filter-tag"
            @click="removeAdvancedFilter('taste', v)">
            {{ v }} <t-icon name="close" size="10px" />
          </span>
        </template>
        <template v-if="store.poolFilter.efficacy.length > 0">
          <span v-for="v in store.poolFilter.efficacy" :key="'eff-' + v" class="active-filter-tag"
            @click="removeAdvancedFilter('efficacy', v)">
            {{ v }} <t-icon name="close" size="10px" />
          </span>
        </template>
      </div>

      <button v-if="hasAdvancedOptions" class="advanced-toggle" @click="showAdvancedFilter = !showAdvancedFilter">
        <t-icon :name="showAdvancedFilter ? 'chevron-up' : 'chevron-down'" size="14px" />
        高级筛选
        <span v-if="activeAdvancedCount > 0" class="advanced-count">{{ activeAdvancedCount }}</span>
      </button>

      <div v-if="showAdvancedFilter" class="advanced-filters">
        <div v-if="appearanceOptions.length > 0" class="filter-row">
          <span class="filter-label">性状</span>
          <div class="filter-tags">
            <button v-for="opt in appearanceOptions" :key="opt.value" class="tag-btn"
              :class="{ 'tag-btn--active': store.poolFilter.appearance.includes(opt.value) }"
              @click="toggleMultiFilter('appearance', opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="tasteOptions.length > 0" class="filter-row">
          <span class="filter-label">口感</span>
          <div class="filter-tags">
            <button v-for="opt in tasteOptions" :key="opt.value" class="tag-btn"
              :class="{ 'tag-btn--active': store.poolFilter.taste.includes(opt.value) }"
              @click="toggleMultiFilter('taste', opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>

        <div v-if="efficacyOptions.length > 0" class="filter-row">
          <span class="filter-label">功效</span>
          <div class="filter-tags">
            <button v-for="opt in efficacyOptions" :key="opt.value" class="tag-btn"
              :class="{ 'tag-btn--active': store.poolFilter.efficacy.includes(opt.value) }"
              @click="toggleMultiFilter('efficacy', opt.value)">
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="pool-counter">
      <span class="counter-item">
        <span class="counter-dot counter-dot--herb"></span>
        主料 <strong>{{ herbCount }}</strong>
      </span>
      <span class="counter-item">
        <span class="counter-dot counter-dot--supplement"></span>
        辅料 <strong>{{ supplementCount }}</strong>
      </span>
      <span class="counter-total">共 {{ filteredMaterials.length }} 项</span>
    </div>

    <div class="pool-content">
      <div class="pool-area">
        <template v-if="filteredMaterials.length > 0">
          <div v-if="viewMode === 'grid'" class="pool-materials">
            <MaterialFish v-for="material in filteredMaterials" :key="material.id" :material="material"
              @add="handleAdd" />
          </div>
          <div v-else class="pool-free">
            <MaterialFish v-for="material in filteredMaterials" :key="material.id" :material="material"
              :free-move="true" :free-pos="fishPositions.get(material.id)" @add="handleAdd" />
          </div>
        </template>
        <div v-else class="pool-empty">
          <t-icon name="search" class="pool-empty-icon" />
          <span class="pool-empty-text">没有匹配的原料</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.material-pool {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.pool-filter {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding: $space-3;
  background: $bg-container;
  border-radius: $radius-3xl $radius-3xl 0 0;
  border: 1px solid $border-color-light;
  border-bottom: none;

  .filter-search {
    flex: 1;
  }
}

.filter-top-row {
  display: flex;
  gap: $space-2;
  align-items: center;
}

.filter-top-actions {
  display: flex;
  gap: $space-0-5;
  flex-shrink: 0;
}

.view-toggle-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  background: $bg-container;
  color: $text-tertiary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: $emerald-500;
    color: $emerald-500;
  }

  &.active {
    background: $overlay-emerald-08;
    border-color: $emerald-500;
    color: $emerald-500;
  }
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: $space-2;
}

.filter-label {
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  color: $text-tertiary;
  flex-shrink: 0;
  line-height: 26px;
  min-width: 28px;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
  flex: 1;
  min-width: 0;
}

.tag-btn {
  padding: $space-0-5 $space-2;
  border: 1px solid $border-color;
  border-radius: $radius-pill;
  background: $bg-container;
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;
  line-height: 1.4;

  &:hover {
    border-color: $emerald-500;
    color: $emerald-500;
  }

  &--active {
    background: $overlay-emerald-10;
    border-color: $emerald-500;
    color: $emerald-600;
    font-weight: $font-weight-semibold;
  }
}

.active-filters {
  display: flex;
  flex-wrap: wrap;
  gap: $space-1;
}

.active-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: $space-0-5;
  padding: $space-0-5 $space-1-5;
  background: $overlay-emerald-08;
  border-radius: $radius-pill;
  font-size: $font-size-micro;
  color: $emerald-600;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $overlay-emerald-15;
  }
}

.advanced-toggle {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: $space-0-5 0;
  border: none;
  background: transparent;
  font-size: $font-size-caption;
  color: $text-tertiary;
  cursor: pointer;
  transition: color $transition-fast;

  &:hover {
    color: $emerald-500;
  }
}

.advanced-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 $space-0-5;
  border-radius: $radius-circle;
  background: $emerald-500;
  color: $text-white;
  font-size: 10px;
  font-weight: $font-weight-bold;
  line-height: 1;
}

.advanced-filters {
  display: flex;
  flex-direction: column;
  gap: $space-2;
  padding-top: $space-2;
  border-top: 1px solid $border-color-light;
}

.filter-reset {
  flex-shrink: 0;
}

.pool-counter {
  display: flex;
  align-items: center;
  gap: $space-2-5;
  padding: $space-1-5 $space-3;
  background: $bg-container;
  border: 1px solid $border-color-light;
  border-top: none;
  font-size: $font-size-caption;
  color: $text-tertiary;
}

.counter-item {
  display: inline-flex;
  align-items: center;
  gap: $space-1;

  strong {
    color: $text-secondary;
    font-weight: $font-weight-bold;
  }
}

.counter-dot {
  width: 6px;
  height: 6px;
  border-radius: $radius-circle;
  flex-shrink: 0;

  &--herb {
    background: $emerald-500;
  }

  &--supplement {
    background: $color-warning;
  }
}

.counter-total {
  margin-left: auto;
  font-size: $font-size-micro;
  color: $text-placeholder;
}

.pool-content {
  flex: 1;
  display: flex;
  min-height: 0;
  border: 1px solid $border-color-light;
  border-top: none;
  border-radius: 0 0 $radius-3xl $radius-3xl;
  overflow: hidden;
}

.pool-area {
  flex: 1;
  overflow-y: auto;
  padding: $space-3;
  background: linear-gradient(180deg,
      $overlay-emerald-04 0%,
      $overlay-emerald-06 40%,
      $overlay-emerald-05 70%,
      $overlay-emerald-08 100%);
}

.pool-materials {
  display: flex;
  flex-wrap: wrap;
  gap: $space-2;
}

.pool-free {
  position: relative;
  min-height: 100%;
}

.pool-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: $space-3;

  .pool-empty-icon {
    font-size: 40px;
    color: $text-placeholder;
  }

  .pool-empty-text {
    font-size: $font-size-body-sm;
    color: $text-tertiary;
  }
}
</style>
