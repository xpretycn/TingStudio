<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useQuickFormulaStore } from "@/stores/quickFormula";
import { useMaterialStore } from "@/stores/material";
import { useEnumStore } from "@/stores/enum";
import type { Material } from "@/api/material";
import MaterialFish from "./MaterialFish.vue";
import type { QuickFormulaMaterial } from "@/types/quickFormula";

const store = useQuickFormulaStore();
const materialStore = useMaterialStore();
const enumStore = useEnumStore();

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

const typeOptions = [
  { label: "全部", value: "all" },
  { label: "主料", value: "herb" },
  { label: "辅料", value: "supplement" },
] as const;
</script>

<template>
  <div class="material-pool">
    <div class="pool-filter">
      <t-input v-model="store.poolFilter.keyword" placeholder="搜索原料" clearable size="small" class="filter-search">
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>

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

      <t-button variant="text" size="small" @click="clearFilter" class="filter-reset">
        <template #icon><t-icon name="refresh" /></template>
        重置
      </t-button>
    </div>

    <div class="pool-content">
      <div class="pool-area">
        <template v-if="filteredMaterials.length > 0">
          <div class="pool-materials">
            <MaterialFish v-for="material in filteredMaterials" :key="material.id" :material="material"
              @add="handleAdd" />
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
    width: 100%;
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
  padding: $space-1 $space-2-5;
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

.filter-reset {
  align-self: flex-end;
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
      rgba(16, 185, 129, 0.03) 0%,
      rgba(16, 185, 129, 0.06) 40%,
      rgba(16, 185, 129, 0.04) 70%,
      rgba(16, 185, 129, 0.08) 100%);
}

.pool-materials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
