<template>
  <Transition name="drawer">
    <div v-if="visible" class="float-drawer" :class="{ 'float-drawer--fullscreen': fullscreen }"
      :style="drawerStyle">
      <div class="drawer-header">
        <div class="header-left">
          <svg class="header-avatar" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
            <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
            <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
            <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
            <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
            <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
            <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
            <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
            <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none" stroke-linecap="round" />
          </svg>
          <span class="header-title">AI 助手</span>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="$emit('fullscreen')" :title="fullscreen ? '退出全屏' : '全屏'">
            <svg v-if="!fullscreen" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 10v4h4M6 2H2v4M10 2h4v4M14 10v4h-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <button class="action-btn action-btn--close" @click="$emit('close')" title="关闭">
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
import { computed } from "vue";

const props = defineProps<{
  visible: boolean;
  fullscreen: boolean;
  position: "right" | "left";
  width: number;
}>();

defineEmits<{
  close: [];
  fullscreen: [];
}>();

const drawerStyle = computed(() => {
  if (props.fullscreen) return {};
  const side = props.position === "right" ? "right" : "left";
  return {
    [side]: "32px",
    width: `${props.width}px`,
    height: "80vh",
  };
});
</script>

<style scoped lang="scss">
@use "@/assets/styles/design-tokens" as *;

.float-drawer {
  position: fixed;
  bottom: 32px;
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

  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .header-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
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
