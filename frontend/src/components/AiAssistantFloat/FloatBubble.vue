<template>
  <div class="float-bubble" :class="[`float-bubble--${position}`, { 'float-bubble--pulse': showPulse }]"
    @click="$emit('click')" :title="tooltip">
    <div class="bubble-inner">
      <svg class="bubble-logo" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
        <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
        <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
        <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
        <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
        <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
        <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none" stroke-linecap="round" />
        <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
        <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
      </svg>
    </div>
    <span v-if="showPulse" class="pulse-ring"></span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  position: "right" | "left";
  showPulse: boolean;
  tooltip?: string;
}>();

defineEmits<{
  click: [];
}>();
</script>

<style scoped lang="scss">
@use "@/assets/styles/design-tokens" as *;

.float-bubble {
  position: fixed;
  bottom: 32px;
  z-index: 9999;
  cursor: pointer;
  user-select: none;

  &--right {
    right: 32px;
  }

  &--left {
    left: 32px;
  }

  .bubble-inner {
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

  &--pulse .pulse-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid $brand-primary;
    transform: translate(-50%, -50%);
    animation: pulse-expand 2s ease-out infinite;
    pointer-events: none;
  }
}

@keyframes pulse-expand {
  0% {
    width: 56px;
    height: 56px;
    opacity: 0.6;
  }
  100% {
    width: 88px;
    height: 88px;
    opacity: 0;
  }
}
</style>
