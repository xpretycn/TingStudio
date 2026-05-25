<script setup lang="ts">
import { computed, ref, onMounted } from "vue"
import { useQuickFormulaStore } from "@/stores/quickFormula"
import { useMaterialStore } from "@/stores/material"
import type { Material } from "@/api/material"
import MaterialFish from "./MaterialFish.vue"
import type { QuickFormulaMaterial } from "@/types/quickFormula"

const store = useQuickFormulaStore()
const materialStore = useMaterialStore()
const poolAreaRef = ref<HTMLElement | null>(null)

onMounted(() => {
  if (materialStore.allMaterials.length === 0) {
    materialStore.fetchAllForSelect()
  }
})

/**
 * 基于汉字 Unicode 码点的拼音首字母提取
 * 使用 GB2312 编码区间映射，覆盖常用汉字
 * 对于非汉字字符：英文返回大写字母，其他返回 #
 */
function getPinyinInitial(text: string): string {
  if (!text) return "#"
  const ch = text.charAt(0)
  const code = ch.charCodeAt(0)
  if (code >= 65 && code <= 90) return ch
  if (code >= 97 && code <= 122) return ch.toUpperCase()
  if (code < 0x4e00 || code > 0x9fff) return "#"

  // 基于 Unicode 码点区间的拼音首字母映射
  // 每个条目 [码点下界, 首字母]，按码点升序排列
  // 从后向前匹配，找到第一个 code >= boundary 的条目
  const pinyinTable: [number, string][] = [
    [0x4E00, "A"], [0x4F4F, "B"], [0x5207, "B"], [0x5341, "C"],
    [0x54C8, "C"], [0x5639, "D"], [0x5883, "D"], [0x5B5D, "E"],
    [0x5C14, "F"], [0x5E73, "G"], [0x611A, "G"], [0x6291, "H"],
    [0x65A4, "J"], [0x68D8, "K"], [0x6C50, "L"], [0x706B, "M"],
    [0x7384, "N"], [0x7591, "P"], [0x7978, "Q"], [0x7E41, "R"],
    [0x8087, "S"], [0x8363, "T"], [0x8584, "W"], [0x87BA, "X"],
    [0x8AED, "Y"], [0x8F9B, "Z"],
  ]

  let result = "#"
  for (let i = pinyinTable.length - 1; i >= 0; i--) {
    if (code >= pinyinTable[i][0]) {
      result = pinyinTable[i][1]
      break
    }
  }
  return result
}

interface GroupedMaterial {
  letter: string
  materials: Material[]
}

const filteredMaterials = computed<Material[]>(() => {
  const addedIds = new Set(store.formulaData.materials.map((m) => m.materialId))
  let pool = materialStore.allMaterials.filter((m: Material) => !addedIds.has(m.id))

  if (store.poolFilter.keyword) {
    const kw = store.poolFilter.keyword.toLowerCase()
    pool = pool.filter((m: Material) => m.name.toLowerCase().includes(kw))
  }

  if (store.poolFilter.type !== "all") {
    pool = pool.filter((m: Material) => m.materialType === store.poolFilter.type)
  }

  return pool.sort((a, b) => {
    const ia = getPinyinInitial(a.name)
    const ib = getPinyinInitial(b.name)
    if (ia !== ib) return ia.localeCompare(ib)
    return a.name.localeCompare(b.name, "zh-CN")
  })
})

const herbMaterials = computed<Material[]>(() =>
  filteredMaterials.value.filter((m) => m.materialType === "herb")
)

const supplementMaterials = computed<Material[]>(() =>
  filteredMaterials.value.filter((m) => m.materialType === "supplement")
)

const herbGroups = computed<GroupedMaterial[]>(() => {
  const groups: Map<string, Material[]> = new Map()
  for (const m of herbMaterials.value) {
    const letter = getPinyinInitial(m.name)
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter)!.push(m)
  }
  return Array.from(groups.entries()).map(([letter, materials]) => ({ letter, materials }))
})

const supplementGroups = computed<GroupedMaterial[]>(() => {
  const groups: Map<string, Material[]> = new Map()
  for (const m of supplementMaterials.value) {
    const letter = getPinyinInitial(m.name)
    if (!groups.has(letter)) groups.set(letter, [])
    groups.get(letter)!.push(m)
  }
  return Array.from(groups.entries()).map(([letter, materials]) => ({ letter, materials }))
})

const allLetters = computed(() => {
  const letters = new Set<string>()
  for (const g of herbGroups.value) letters.add(g.letter)
  for (const g of supplementGroups.value) letters.add(g.letter)
  return Array.from(letters).sort()
})

function handleAdd(material: QuickFormulaMaterial) {
  store.addMaterial(material)
}

function clearFilter() {
  store.poolFilter.keyword = ""
  store.poolFilter.type = "all"
}

function scrollToLetter(letter: string) {
  if (!poolAreaRef.value) return
  const el = poolAreaRef.value.querySelector(`[data-letter="${letter}"]`)
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "start" })
  }
}

const typeOptions = [
  { label: "全部", value: "all" },
  { label: "主料", value: "herb" },
  { label: "辅料", value: "supplement" },
] as const
</script>

<template>
  <div class="material-pool">
    <div class="pool-filter">
      <t-input
        v-model="store.poolFilter.keyword"
        placeholder="搜索原料"
        clearable
        size="small"
        class="filter-search"
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>

      <div class="filter-types">
        <button
          v-for="opt in typeOptions"
          :key="opt.value"
          class="type-btn"
          :class="{ 'type-btn--active': store.poolFilter.type === opt.value }"
          @click="store.poolFilter.type = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <t-button variant="text" size="small" @click="clearFilter">
        <template #icon><t-icon name="refresh" /></template>
        重置
      </t-button>
    </div>

    <div class="pool-content">
      <div ref="poolAreaRef" class="pool-area">
        <template v-if="filteredMaterials.length > 0">
          <!-- 主料区 -->
          <template v-if="herbGroups.length > 0 && (store.poolFilter.type === 'all' || store.poolFilter.type === 'herb')">
            <div class="type-section">
              <div class="type-section-header">
                <span class="type-section-icon type-section-icon--herb">&#9679;</span>
                <span class="type-section-title">主料</span>
                <span class="type-section-count">{{ herbMaterials.length }}</span>
              </div>
              <div
                v-for="group in herbGroups"
                :key="'herb-' + group.letter"
                :data-letter="group.letter"
                class="letter-group"
              >
                <div class="letter-header">{{ group.letter }}</div>
                <div class="letter-materials">
                  <MaterialFish
                    v-for="material in group.materials"
                    :key="material.id"
                    :material="material"
                    @add="handleAdd"
                  />
                </div>
              </div>
            </div>
          </template>

          <!-- 辅料区 -->
          <template v-if="supplementGroups.length > 0 && (store.poolFilter.type === 'all' || store.poolFilter.type === 'supplement')">
            <div class="type-section">
              <div class="type-section-header">
                <span class="type-section-icon type-section-icon--supplement">&#9679;</span>
                <span class="type-section-title">辅料</span>
                <span class="type-section-count">{{ supplementMaterials.length }}</span>
              </div>
              <div
                v-for="group in supplementGroups"
                :key="'supplement-' + group.letter"
                :data-letter="group.letter"
                class="letter-group"
              >
                <div class="letter-header">{{ group.letter }}</div>
                <div class="letter-materials">
                  <MaterialFish
                    v-for="material in group.materials"
                    :key="material.id"
                    :material="material"
                    @add="handleAdd"
                  />
                </div>
              </div>
            </div>
          </template>
        </template>
        <div v-else class="pool-empty">
          <t-icon name="search" class="pool-empty-icon" />
          <span class="pool-empty-text">没有匹配的原料</span>
        </div>
      </div>

      <!-- A-Z 索引栏 -->
      <div v-if="allLetters.length > 0" class="letter-index">
        <button
          v-for="letter in allLetters"
          :key="letter"
          class="index-btn"
          @click="scrollToLetter(letter)"
        >
          {{ letter }}
        </button>
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
  align-items: center;
  gap: $space-2;
  padding: $space-3;
  background: $bg-container;
  border-radius: $radius-3xl $radius-3xl 0 0;
  border: 1px solid $border-color-light;
  border-bottom: none;

  .filter-search {
    flex: 1;
    min-width: 0;
  }
}

.filter-types {
  display: flex;
  gap: $space-1;
  flex-shrink: 0;
}

.type-btn {
  padding: $space-1 $space-3;
  border: 1px solid $border-color;
  border-radius: $radius-pill;
  background: $bg-container;
  font-size: $font-size-caption;
  font-weight: $font-weight-medium;
  color: $text-secondary;
  cursor: pointer;
  transition: all $transition-fast;
  white-space: nowrap;

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
  background: linear-gradient(
    180deg,
    rgba(16, 185, 129, 0.03) 0%,
    rgba(16, 185, 129, 0.06) 40%,
    rgba(16, 185, 129, 0.04) 70%,
    rgba(16, 185, 129, 0.08) 100%
  );
}

.type-section {
  margin-bottom: $space-4;

  &:last-child {
    margin-bottom: 0;
  }
}

.type-section-header {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding-bottom: $space-2;
  margin-bottom: $space-2;
  border-bottom: 1px solid $border-color-light;
}

.type-section-icon {
  font-size: 10px;

  &--herb {
    color: $emerald-500;
  }

  &--supplement {
    color: #f0a040;
  }
}

.type-section-title {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.type-section-count {
  font-size: $font-size-caption;
  color: $text-tertiary;
  background: $bg-page;
  padding: 0 $space-2;
  border-radius: $radius-pill;
}

.letter-group {
  margin-bottom: $space-3;

  &:last-child {
    margin-bottom: 0;
  }
}

.letter-header {
  font-size: $font-size-caption;
  font-weight: $font-weight-bold;
  color: $emerald-500;
  padding: $space-1 0;
  margin-bottom: $space-1;
  position: sticky;
  top: 0;
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.06) 80%, transparent);
  z-index: 1;
}

.letter-materials {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.letter-index {
  width: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: $space-1 0;
  background: $bg-container;
  border-left: 1px solid $border-color-light;
  overflow-y: auto;
  flex-shrink: 0;

  &::-webkit-scrollbar {
    display: none;
  }
}

.index-btn {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  font-size: 10px;
  font-weight: $font-weight-medium;
  color: $text-tertiary;
  cursor: pointer;
  border-radius: $radius-sm;
  transition: all $transition-fast;
  flex-shrink: 0;

  &:hover {
    background: $overlay-emerald-10;
    color: $emerald-500;
  }

  &:active {
    background: $overlay-emerald-15;
    color: $emerald-600;
  }
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
