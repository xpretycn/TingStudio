<template>
  <div class="float-bubble" :class="{ 'float-bubble--pulse': showPulse }"
    :style="bubbleStyle"
    @mouseenter="showCommands = true"
    @mouseleave="showCommands = false"
    @mousedown.prevent="onDragStart"
    @touchstart.prevent="onDragStart"
    :title="tooltip">

    <!-- 状态指示灯 -->
    <span class="status-dot" :class="`status-dot--${healthStatus}`"></span>

    <!-- 主气泡 -->
    <div class="bubble-inner">
      <svg class="bubble-logo" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
        <path d="M14 22L10 4L26 16Z" fill="var(--color-primary-lighter)" />
        <path d="M46 22L50 4L34 16Z" fill="var(--color-primary-lighter)" />
        <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
        <path d="M27 38Q30 42 33 38" stroke="var(--color-primary-dark)" stroke-width="1" fill="none" stroke-linecap="round" />
        <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
        <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
      </svg>

      <!-- 角标 -->
      <span v-if="badgeCount != null && badgeCount > 0" class="badge-dot">{{ badgeCount > 99 ? '99+' : badgeCount }}</span>
    </div>

    <!-- 快捷命令弹出层 -->
    <Transition name="cmd-fade">
      <div v-if="showCommands && !dragging" class="cmd-popup"
        :class="[popupPlacement.hClass, { 'cmd-popup--below': !popupPlacement.showAbove }]">
        <button v-for="cmd in commandList" :key="cmd.label" class="cmd-item"
          @mousedown.stop @click.stop="handleCommand(cmd.command)">
          <span class="cmd-icon" v-html="cmd.icon"></span>
          <span class="cmd-label">{{ cmd.label }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const props = defineProps<{
  position: "right" | "left";
  showPulse: boolean;
  tooltip?: string;
  badgeCount?: number;
  healthStatus?: "online" | "loading" | "error";
}>();

const emit = defineEmits<{
  click: [];
  command: [command: string];
}>();

const showCommands = ref(false);

const commandList = [
  { label: "含量比校验", command: "含量比校验", icon: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>' },
  { label: "配方对比", command: "对比配方", icon: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="5" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/><rect x="9" y="3" width="5" height="10" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/></svg>' },
  { label: "报价单", command: "生成报价单", icon: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.2" fill="none"/><path d="M4 6h8M4 9h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' },
];

const BUBBLE_SIZE = 56;
const MARGIN = 80;
const POPUP_W_EST = 140;
const POPUP_H_EST = 150;

const posX = ref(0);
const posY = ref(0);
const initialized = ref(false);
const viewportW = ref(window.innerWidth);
const viewportH = ref(window.innerHeight);

const popupPlacement = computed(() => {
  const vw = viewportW.value;
  const bx = posX.value;
  const by = posY.value;

  let hClass: string;
  const overflowRight = bx + POPUP_W_EST > vw;
  const overflowLeft = bx + BUBBLE_SIZE - POPUP_W_EST < 0;

  if (overflowRight && !overflowLeft) {
    hClass = "cmd-popup--right";
  } else if (overflowLeft && !overflowRight) {
    hClass = "cmd-popup--left";
  } else {
    hClass = bx + BUBBLE_SIZE / 2 > vw / 2 ? "cmd-popup--right" : "cmd-popup--left";
  }

  const spaceAbove = by;
  const spaceBelow = viewportH.value - by - BUBBLE_SIZE;
  const showAbove = spaceAbove >= POPUP_H_EST || spaceAbove >= spaceBelow;

  return { hClass, showAbove };
});

const dragging = ref(false);
const dragMoved = ref(false);
const startClientX = ref(0);
const startClientY = ref(0);
const startPosX = ref(0);
const startPosY = ref(0);

function initPosition() {
  if (initialized.value) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  posX.value = props.position === "right" ? vw - BUBBLE_SIZE - MARGIN : MARGIN;
  posY.value = vh - BUBBLE_SIZE - MARGIN;
  initialized.value = true;
}

const bubbleStyle = computed(() => ({
  left: `${posX.value}px`,
  top: `${posY.value}px`,
}));

function clamp(x: number, y: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.max(0, Math.min(x, vw - BUBBLE_SIZE)),
    y: Math.max(0, Math.min(y, vh - BUBBLE_SIZE)),
  };
}

function onDragStart(e: MouseEvent | TouchEvent) {
  initPosition();
  const point = "touches" in e ? e.touches[0] : e;
  startClientX.value = point.clientX;
  startClientY.value = point.clientY;
  startPosX.value = posX.value;
  startPosY.value = posY.value;
  dragging.value = true;
  dragMoved.value = false;

  if ("touches" in e) {
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);
    window.addEventListener("touchcancel", onDragEnd);
  } else {
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  }
}

function onDragMove(e: MouseEvent | TouchEvent) {
  if (!dragging.value) return;
  e.preventDefault();
  const point = "touches" in e ? e.touches[0] : e;
  const dx = point.clientX - startClientX.value;
  const dy = point.clientY - startClientY.value;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved.value = true;
  }

  const clamped = clamp(startPosX.value + dx, startPosY.value + dy);
  posX.value = clamped.x;
  posY.value = clamped.y;
}

function onDragEnd() {
  dragging.value = false;
  window.removeEventListener("mousemove", onDragMove);
  window.removeEventListener("mouseup", onDragEnd);
  window.removeEventListener("touchmove", onDragMove);
  window.removeEventListener("touchend", onDragEnd);
  window.removeEventListener("touchcancel", onDragEnd);
  showCommands.value = false;

  if (!dragMoved.value) {
    emit("click");
  }
}

function handleCommand(cmd: string) {
  showCommands.value = false;
  emit("command", cmd);
  emit("click");
}

function onResize() {
  viewportW.value = window.innerWidth;
  viewportH.value = window.innerHeight;
  if (!initialized.value) return;
  const clamped = clamp(posX.value, posY.value);
  posX.value = clamped.x;
  posY.value = clamped.y;
}

onMounted(() => {
  initPosition();
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped lang="scss">
.float-bubble {
  position: fixed;
  z-index: 9999;
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  .bubble-inner {
    position: relative;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: $gradient-brand;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 24px rgba(255, 107, 138, 0.35);
    transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease;

    &:hover {
      transform: scale(1.1);
      box-shadow: 0 12px 32px rgba(255, 107, 138, 0.45);
    }

    &:active {
      transform: scale(0.95);
    }
  }

  .bubble-logo {
    width: 40px;
    height: 40px;
  }

  &--pulse .bubble-inner {
    animation: pulse-shadow 2s ease-out infinite;
  }

  /* 状态指示灯 */
  .status-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid #fff;
    z-index: 2;

    &--online { background: var(--color-primary); }
    &--loading { background: var(--color-warning); }
    &--error { background: var(--color-danger); }
  }

  /* 角标 */
  .badge-dot {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 var(--space-1-25);
    border-radius: var(--radius-md);
    background: var(--color-danger);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    line-height: 18px;
    text-align: center;
    box-shadow: 0 2px 6px rgba(239, 68, 68, 0.4);
    pointer-events: none;
  }

  /* 快捷命令弹出层 */
  .cmd-popup {
    position: absolute;
    bottom: 68px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: var(--space-1-5);
    background: $bg-container;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(93, 78, 96, 0.18);
    min-width: 110px;
    max-height: calc(100vh - 140px);
    overflow-y: auto;

    &--left {
      left: 0;
    }

    &--right {
      right: 0;
    }

    &--below {
      bottom: auto;
      top: 68px;
    }

    .cmd-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: var(--space-2) 12px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: $text-primary;
      font-size: 13px;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;

      &:hover {
        background: $bg-hover;
      }

      .cmd-icon {
        display: flex;
        align-items: center;
        color: $brand-emerald;
        flex-shrink: 0;
      }

      .cmd-label {
        font-weight: 500;
      }
    }
  }
}

.cmd-fade-enter-active,
.cmd-fade-leave-active {
  transition: opacity 0.15s, transform 0.15s;
}
.cmd-fade-enter-from,
.cmd-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@keyframes pulse-shadow {
  0% {
    box-shadow: 0 8px 24px rgba(255, 107, 138, 0.35), 0 0 0 0 rgba(255, 107, 138, 0.5);
  }
  70% {
    box-shadow: 0 8px 24px rgba(255, 107, 138, 0.35), 0 0 0 16px rgba(255, 107, 138, 0);
  }
  100% {
    box-shadow: 0 8px 24px rgba(255, 107, 138, 0.35), 0 0 0 0 rgba(255, 107, 138, 0);
  }
}
</style>
