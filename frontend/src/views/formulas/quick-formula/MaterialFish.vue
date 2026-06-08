<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import type { Material } from "@/api/material"
import type { QuickFormulaMaterial } from "@/types/quickFormula"

interface FishProps {
  material: Material
  freeMove?: boolean
  freePos?: { x: number; y: number }
}

const props = withDefaults(defineProps<FishProps>(), {
  freeMove: false,
})
const emit = defineEmits<{
  add: [material: QuickFormulaMaterial]
}>()

const isHovered = ref(false)
const animDuration = ref("10s")
const animDelay = ref("0s")
const cardDirection = ref<"top" | "bottom">("top")
const cardAlign = ref<"left" | "right">("left")
const freePos = ref({ x: 0, y: 0 })
let hideTimer: ReturnType<typeof setTimeout> | null = null

const isHerb = computed(() => props.material.materialType === "herb")

// 包围盒尺寸（与 MaterialPool 算法保持一致：基于名字长度）
const fishBox = computed(() => {
  const len = props.material.name.length
  let halfW: number
  if (len <= 2) halfW = 36
  else if (len === 3) halfW = 42
  else if (len === 4) halfW = 48
  else if (len === 5) halfW = 52
  else halfW = 55
  return { halfW, halfH: 14 }
})

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
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
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

function handleMouseLeave() {
  hideTimer = setTimeout(() => {
    isHovered.value = false
  }, 300)
}

function handleCardEnter() {
  if (hideTimer) {
    clearTimeout(hideTimer)
    hideTimer = null
  }
}

function handleCardLeave() {
  isHovered.value = false
}

onMounted(() => {
  const duration = 8 + Math.random() * 7
  const delay = Math.random() * 5
  animDuration.value = `${duration}s`
  animDelay.value = `${delay}s`

  if (props.freeMove && props.freePos) {
    freePos.value = { ...props.freePos }
  }
})

watch(
  () => props.freePos,
  (pos) => {
    if (props.freeMove && pos) {
      freePos.value = { ...pos }
    }
  },
)
</script>

<template>
  <div
    class="material-fish"
    :class="{
      'material-fish--hovered': isHovered,
      'material-fish--free': freeMove,
    }"
    :style="freeMove
      ? {
        '--fish-anim-duration': animDuration,
        '--fish-anim-delay': animDelay,
        '--fish-x': freePos.x + 'px',
        '--fish-y': freePos.y + 'px',
      }
      : {
        '--fish-anim-duration': animDuration,
        '--fish-anim-delay': animDelay,
      }"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
  >
    <div class="fish-body" :class="{ 'fish-body--herb': isHerb, 'fish-body--supplement': !isHerb }">
      <span class="fish-name">{{ material.name }}</span>
      <span class="fish-type" :class="{ 'fish-type--herb': isHerb, 'fish-type--supplement': !isHerb }">
        {{ typeLabel }}
      </span>
    </div>

    <transition name="card-fade">
      <div v-if="isHovered" class="fish-info-card" :style="cardStyle"
        @mouseenter="handleCardEnter" @mouseleave="handleCardLeave">
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

        <t-button size="small" theme="default" block class="btn-emerald-fill" @click.stop="handleAdd">
          <template #icon><t-icon name="add" /></template>
          添加
        </t-button>
      </div>
    </transition>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.material-fish {
  position: relative;
  z-index: 1;
  animation: fish-float var(--fish-anim-duration, 10s) ease-in-out var(--fish-anim-delay, 0s) infinite;
  will-change: transform;
  cursor: pointer;

  &--hovered {
    animation-play-state: paused;
    z-index: 10;
  }

  &--free {
    position: absolute;
    top: var(--fish-y, 0);
    left: var(--fish-x, 0);
    /* 中心点定位：x,y 是 fish 中心点，用 translate 反向补偿 */
    transform: translate(-50%, -50%);
    /* 关闭 keyframe 浮动，由 RAF 每帧直接驱动 --fish-x/--fish-y */
    animation: none;
    /* 抗锯齿：避免高速位移模糊 */
    backface-visibility: hidden;

    /* 自由模式下 hover 仍然放大 */
    &.material-fish--hovered {
      transform: translate(-50%, -50%) scale(1.08);
    }
  }
}

@keyframes fish-float {
  0% {
    transform: translate(var(--fish-shift-x, 0px), var(--fish-shift-y, 0px));
  }
  50% {
    transform: translate(var(--fish-shift-x, 0px), calc(var(--fish-shift-y, 0px) - 3px));
  }
  100% {
    transform: translate(var(--fish-shift-x, 0px), var(--fish-shift-y, 0px));
  }
}

.fish-body {
  display: inline-flex;
  align-items: center;
  gap: $space-1;
  padding: $space-0-5 $space-2;
  border-radius: $radius-pill;
  transition: all $transition-fast;

  &--herb {
    background: $color-success-bg;
    border: 1px solid $color-success-strong;
  }

  &--supplement {
    background: $color-warning-bg;
    border: 1px solid $color-warning-alpha-light;
  }

  .material-fish--hovered & {
    box-shadow: $shadow-elevation-2;
    transform: scale(1.05);
  }
}

.fish-name {
  font-size: 11px;
  font-weight: $font-weight-medium;
  color: var(--color-text-primary);
  max-width: 52px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}

.fish-type {
  font-size: 9px;
  font-weight: $font-weight-semibold;
  padding: 0 $space-0-5;
  border-radius: $radius-xs;
  flex-shrink: 0;
  line-height: 1.4;

  &--herb {
    background: $color-success-medium;
    color: $emerald-600;
  }

  &--supplement {
    background: $color-warning-medium;
    color: $color-warning-orange;
  }
}

.fish-info-card {
  position: absolute;
  width: 200px;
  padding: $space-3;
  background: var(--color-bg-container);
  border-radius: $radius-xl;
  box-shadow: $shadow-elevation-3;
  border: 1px solid var(--color-border-light);
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
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-version {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.info-nutrition {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: $space-2;
  background: var(--color-bg-page);
  border-radius: $radius-md;
}

.nutrition-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: $font-size-caption;
  line-height: 1.6;

  .nutrition-label {
    color: var(--color-text-placeholder);
  }

  .nutrition-value {
    font-weight: $font-weight-medium;
    color: var(--color-text-regular);
    font-variant-numeric: tabular-nums;
  }
}

.info-price {
  font-size: $font-size-caption;
  color: var(--color-text-regular);
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

.btn-emerald-fill {
  background-color: $emerald-500 !important;
  color: $text-white !important;
  border-color: $emerald-500 !important;

  &:hover {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:active {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }
}
</style>
