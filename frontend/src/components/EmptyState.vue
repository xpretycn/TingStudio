<template>
  <div class="empty-state">
    <div class="empty-illustration">
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" class="empty-cat">
        <!-- 猫咪身体 -->
        <ellipse cx="60" cy="75" rx="30" ry="25" fill="#FFE8D6" />
        <!-- 猫咪头 -->
        <circle cx="60" cy="52" r="22" fill="#FFE8D6" />
        <!-- 耳朵 -->
        <path d="M42 38L36 18L52 32Z" fill="#FFB5C8" />
        <path d="M78 38L84 18L68 32Z" fill="#FFB5C8" />
        <path d="M44 36L39 22L52 32Z" fill="#FFD6E0" />
        <path d="M76 36L81 22L68 32Z" fill="#FFD6E0" />
        <!-- 眼睛（闭着睡觉） -->
        <path d="M50 50Q53 53 56 50" stroke="#5D4E60" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <path d="M64 50Q67 53 70 50" stroke="#5D4E60" stroke-width="1.5" fill="none" stroke-linecap="round" />
        <!-- 嘴巴 -->
        <path d="M56 60Q60 63 64 60" stroke="#E8A0B0" stroke-width="1" fill="none" stroke-linecap="round" />
        <!-- 腮红 -->
        <ellipse cx="46" cy="57" rx="5" ry="3" fill="#FFB5C2" opacity="0.35" />
        <ellipse cx="74" cy="57" rx="5" ry="3" fill="#FFB5C2" opacity="0.35" />
        <!-- ZZZ -->
        <text x="82" y="38" font-size="11" fill="#C8AAB8" font-weight="500" font-family="PingFang SC, sans-serif">z</text>
        <text x="90" y="30" font-size="13" fill="#C8AAB8" font-weight="500" font-family="PingFang SC, sans-serif">z</text>
        <text x="98" y="22" font-size="15" fill="#C8AAB8" font-weight="600" font-family="PingFang SC, sans-serif">Z</text>
      </svg>
    </div>
    <div class="empty-text">
      <h3 class="empty-title">{{ title }}</h3>
      <p v-if="description" class="empty-description">{{ description }}</p>
    </div>
    <div v-if="$slots.action" class="empty-action">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
  description?: string
}>(), {
  title: '暂无数据',
  description: '',
})
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px 32px;
  text-align: center;
}

.empty-illustration {
  width: 120px;
  height: 120px;
  margin-bottom: 16px;

  .empty-cat {
    width: 100%;
    height: 100%;
    animation: emptyCatFloat 3s ease-in-out infinite;
  }
}

@keyframes emptyCatFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.empty-text {
  margin-bottom: 20px;

  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
    margin: 0 0 6px;
    letter-spacing: $ls-heading;
  }

  .empty-description {
    font-size: 13px;
    color: $text-secondary;
    margin: 0;
    line-height: $line-height-normal;
  }
}

.empty-action {
  :deep(.t-button) {
    border-radius: $radius-lg;
    font-weight: $font-weight-semibold;
  }
}
</style>
