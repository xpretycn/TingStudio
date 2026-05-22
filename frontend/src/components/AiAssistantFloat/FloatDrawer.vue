<template>
  <Transition name="drawer">
    <div v-if="visible" class="float-drawer" :class="{ 'float-drawer--fullscreen': fullscreen }"
      :style="drawerStyle" ref="drawerRef">
      <div class="drawer-header"
        @mousedown.prevent="onDragStart"
        @touchstart.prevent="onDragStart">
        <div class="header-left">
          <img v-if="userAvatar" :src="userAvatar" alt="用户头像" class="header-avatar" />
          <img v-else src="/avatar-default.jpg" alt="默认头像" class="header-avatar" />
          <span class="header-title">{{ title }}</span>
        </div>
        <div class="header-actions">
          <button class="action-btn" @mousedown.stop @click="$emit('fullscreen')" :title="fullscreen ? '退出全屏' : '全屏'">
            <svg v-if="!fullscreen" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 10v4h4M6 2H2v4M10 2h4v4M14 10v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="action-btn action-btn--close" @mousedown.stop @click="$emit('close')" title="关闭">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="drawer-body">
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from "vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();

const props = defineProps<{
  visible: boolean;
  fullscreen: boolean;
  position: "right" | "left";
  width: number;
  title?: string;
}>();

defineEmits<{
  close: [];
  fullscreen: [];
}>();

const userAvatar = computed(() => authStore.user?.avatar || "");

const drawerRef = ref<HTMLElement | null>(null);

const posX = ref(0);
const posY = ref(0);
const positionInitialized = ref(false);

const dragging = ref(false);
const startClientX = ref(0);
const startClientY = ref(0);
const startPosX = ref(0);
const startPosY = ref(0);

function initPosition() {
  if (positionInitialized.value) return;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = props.width;
  const h = vh * 0.8;
  if (props.position === "right") {
    posX.value = vw - w - 32;
  } else {
    posX.value = 32;
  }
  posY.value = vh - h - 32;
  positionInitialized.value = true;
}

function clamp(x: number, y: number) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = props.width;
  const h = vh * 0.8;
  return {
    x: Math.max(0, Math.min(x, vw - w)),
    y: Math.max(0, Math.min(y, vh - h)),
  };
}

const drawerStyle = computed(() => {
  if (props.fullscreen) return {};
  initPosition();
  return {
    left: `${posX.value}px`,
    top: `${posY.value}px`,
    width: `${props.width}px`,
    height: "80vh",
  };
});

function onDragStart(e: MouseEvent | TouchEvent) {
  if (props.fullscreen) return;
  initPosition();
  const point = "touches" in e ? e.touches[0] : e;
  startClientX.value = point.clientX;
  startClientY.value = point.clientY;
  startPosX.value = posX.value;
  startPosY.value = posY.value;
  dragging.value = true;

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
}

function onResize() {
  if (!positionInitialized.value) return;
  const clamped = clamp(posX.value, posY.value);
  posX.value = clamped.x;
  posY.value = clamped.y;
}

watch(() => props.visible, (val) => {
  if (val) {
    nextTick(() => initPosition());
  }
});

onMounted(() => {
  window.addEventListener("resize", onResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", onResize);
});
</script>

<style scoped lang="scss">
.float-drawer {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: $bg-container;
  box-shadow: 0 16px 48px rgba(93, 78, 96, 0.15), 0 2px 8px rgba(255, 107, 138, 0.1);
  border: 1px solid $border-color;
  overflow: hidden;

  &--fullscreen {
    inset: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    border-radius: 0;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: $gradient-brand;
  color: $text-white;
  flex-shrink: 0;
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    pointer-events: none;
  }

  .header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    object-fit: cover;
  }

  .header-title {
    font-size: $font-size-h3;
    font-weight: $font-weight-semibold;
    letter-spacing: $ls-heading;
  }

  .header-actions {
    display: flex;
    gap: 4px;
  }

  .action-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: rgba(255, 255, 255, 0.15);
    color: $text-white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    &--close:hover {
      background: rgba(227, 77, 89, 0.7);
    }
  }
}

.drawer-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.drawer-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.drawer-leave-active {
  transition: all 0.25s ease-in;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
