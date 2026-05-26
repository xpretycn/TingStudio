<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import type { Material } from "@/api/material"
import type { QuickFormulaMaterial } from "@/types/quickFormula"

interface FishProps {
  material: Material
}

const props = defineProps<FishProps>()
const emit = defineEmits<{
  add: [material: QuickFormulaMaterial]
}>()

const isHovered = ref(false)
const animDuration = ref("10s")
const animDelay = ref("0s")
const cardDirection = ref<"top" | "bottom">("top")
const cardAlign = ref<"left" | "right">("left")

const isHerb = computed(() => props.material.materialType === "herb")

const typeLabel = computed(() => (isHerb.value ? "主料" : "辅料"))

const nutritionSummary = computed(() => {
  const n = props.material.nutrition
  if (!n) return null
  return {
    energy: (n.energy ?? 0).toFixed(1),
    protein: (n.protein ?? 0).toFixed(1),
    fat: (n.fat ?? 0).toFixed(1),
    carbohydrate: (n.carbohydrate ?? 0).toFixed(1),
    sodium: (n.sodium ?? 0).toFixed(1),
  }
})

const cardStyle = computed(() => {
  if (cardDirection.value === "bottom") {
    return {
      top: "calc(100% + 8px)",
      left: cardAlign.value === "right" ? "auto" : "0",
      right: cardAlign.value === "right" ? "0" : "auto",
      bottom: "auto",
      transform: "none",
    }
  }
  return {
    bottom: "calc(100% + 8px)",
    left: cardAlign.value === "right" ? "auto" : "0",
    right: cardAlign.value === "right" ? "0" : "auto",
    top: "auto",
    transform: "none",
  }
})

function handleAdd() {
  const mat: QuickFormulaMaterial = {
    materialId: props.material.id,
    materialName: props.material.name,
    quantity: 0,
    materialType: isHerb.value ? "herb" : "supplement",
    unitPrice: props.material.unitPrice ?? null,
    nutrition: props.material.nutrition ?? undefined,
    version: props.material.version,
  }
  emit("add", mat)
}

function handleMouseEnter(event: MouseEvent) {
  isHovered.value = true

  const fishEl = event.currentTarget as HTMLElement
  const poolEl = fishEl.closest(".pool-area")
  if (!poolEl) return

  const poolRect = poolEl.getBoundingClientRect()
  const fishRect = fishEl.getBoundingClientRect()

  const fishRelativeTop = fishRect.top - poolRect.top
  const fishRelativeLeft = fishRect.left - poolRect.left

  const isNearTop = fishRelativeTop < 180
  const isNearRight = fishRelativeLeft > poolRect.width * 0.5

  cardDirection.value = isNearTop ? "bottom" : "top"
  cardAlign.value = isNearRight ? "right" : "left"
}

onMounted(() => {
  const duration = 8 + Math.random() * 7
  const delay = Math.random() * 5
  animDuration.value = `${duration}s`
  animDelay.value = `${delay}s`
})
</script>

<template>
  <div
    class="material-fish"
    :class="{ 'material-fish--hovered': isHovered }"
    :style="{
      animationDuration: animDuration,
      animationDelay: animDelay,
    }"
    @mouseenter="handleMouseEnter"
    @mouseleave="isHovered = false"
  >
    <div class="fish-body" :class="{ 'fish-body--herb': isHerb, 'fish-body--supplement': !isHerb }">
      <span class="fish-name">{{ material.name }}</span>
      <span class="fish-type" :class="{ 'fish-type--herb': isHerb, 'fish-type--supplement': !isHerb }">
        {{ typeLabel }}
      </span>
    </div>

    <transition name="card-fade">
      <div v-if="isHovered" class="fish-info-card" :style="cardStyle">
        <div class="info-header">
          <span class="info-name">{{ material.name }}</span>
          <t-tag
            size="small"
            :theme="isHerb ? 'success' : 'warning'"
            variant="light"
          >
            {{ typeLabel }}
          </t-tag>
        </div>

        <div v-if="material.version" class="info-version">
          版本: v{{ material.version }}
        </div>

        <div v-if="nutritionSummary" class="info-nutrition">
          <div class="nutrition-row">
            <span class="nutrition-label">能量</span>
            <span class="nutrition-value">{{ nutritionSummary.energy }} kJ</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">蛋白质</span>
            <span class="nutrition-value">{{ nutritionSummary.protein }} g</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">脂肪</span>
            <span class="nutrition-value">{{ nutritionSummary.fat }} g</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">碳水</span>
            <span class="nutrition-value">{{ nutritionSummary.carbohydrate }} g</span>
          </div>
          <div class="nutrition-row">
            <span class="nutrition-label">钠</span>
            <span class="nutrition-value">{{ nutritionSummary.sodium }} mg</span>
          </div>
        </div>

        <div class="info-price">
          单价: {{ material.unitPrice != null ? `¥${material.unitPrice.toFixed(2)}/kg` : "暂未录入" }}
        </div>

        <t-button size="small" theme="primary" block @click.stop="handleAdd">
          <template #icon><t-icon name="add" /></template>
          添加
        </t-button>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

@keyframes fish-float {
  0% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
  100% {
    transform: translateY(0);
  }
}

.material-fish {
  position: relative;
  z-index: 1;
  animation: fish-float v-bind(animDuration) ease-in-out v-bind(animDelay) infinite;
  will-change: transform;
  cursor: pointer;

  &--hovered {
    animation-play-state: paused;
    z-index: 10;
  }
}

.fish-body {
  display: inline-flex;
  align-items: center;
  gap: $space-1-5;
  padding: $space-1 $space-3;
  border-radius: $radius-pill;
  transition: all $transition-fast;

  &--herb {
    background: $color-success-bg;
    border: 1px solid rgba(123, 198, 126, 0.25);
  }

  &--supplement {
    background: $color-warning-bg;
    border: 1px solid rgba(240, 160, 64, 0.25);
  }

  .material-fish--hovered & {
    box-shadow: $shadow-elevation-2;
    transform: scale(1.05);
  }
}

.fish-name {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  color: $text-primary;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fish-type {
  font-size: $font-size-micro;
  font-weight: $font-weight-semibold;
  padding: 1px $space-1;
  border-radius: $radius-xs;
  flex-shrink: 0;

  &--herb {
    background: rgba(123, 198, 126, 0.2);
    color: $emerald-600;
  }

  &--supplement {
    background: rgba(240, 160, 64, 0.2);
    color: #92400e;
  }
}

.fish-info-card {
  position: absolute;
  width: 200px;
  padding: $space-3;
  background: $bg-container;
  border-radius: $radius-xl;
  box-shadow: $shadow-elevation-3;
  border: 1px solid $border-color-light;
  z-index: 20;
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $space-2;
}

.info-name {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: $text-primary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-version {
  font-size: $font-size-caption;
  color: $text-tertiary;
}

.info-nutrition {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: $space-2;
  background: $bg-page;
  border-radius: $radius-md;
}

.nutrition-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: $font-size-caption;
  line-height: 1.6;

  .nutrition-label {
    color: $text-tertiary;
  }

  .nutrition-value {
    font-weight: $font-weight-medium;
    color: $text-secondary;
    font-variant-numeric: tabular-nums;
  }
}

.info-price {
  font-size: $font-size-caption;
  color: $text-secondary;
  font-weight: $font-weight-medium;
}

.card-fade-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.card-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}

.card-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
