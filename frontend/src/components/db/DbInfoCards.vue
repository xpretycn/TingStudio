<script setup lang="ts">
import { computed } from "vue"
import type { DbInfo } from "@/api/db"
import { formatTimestamp } from "@/utils/timeFormat"
import {
  gradientToolPink,
  gradientToolPurple,
  gradientToolBlue,
  gradientToolOrange,
} from "@/assets/styles/tokens"

const props = defineProps<{
  info: DbInfo
}>()

interface CardItem {
  icon: string
  label: string
  value: string
  bgColor: string
}

const cards = computed<CardItem[]>(() => [
  {
    icon: "📦",
    label: "数据库类型",
    value: props.info.dbType.toUpperCase(),
    bgColor: gradientToolPink,
  },
  {
    icon: "📊",
    label: "总表数",
    value: String(props.info.tableCount),
    bgColor: gradientToolPurple,
  },
  {
    icon: "💾",
    label: "文件大小",
    value: props.info.fileSize,
    bgColor: gradientToolBlue,
  },
  {
    icon: "🕐",
    label: "最后更新",
    value: props.info.lastUpdated ? formatTimestamp(props.info.lastUpdated) : "--",
    bgColor: gradientToolOrange,
  },
])
</script>

<template>
  <div class="db-info-cards">
    <div v-for="card in cards" :key="card.label" class="info-card">
      <div class="card-icon" :style="{ background: card.bgColor }">
        {{ card.icon }}
      </div>
      <div class="card-content">
        <span class="card-label">{{ card.label }}</span>
        <span class="card-value">{{ card.value }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.db-info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: $overlay-white-80;
  backdrop-filter: blur(10px);
  border-radius: $radius-3xl;
  border: 2px solid $overlay-pink-lighter-15;
  box-shadow: $shadow-xs;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-brand-sm;
    border-color: $overlay-pink-lighter-30;
  }

  .card-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .card-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .card-label {
      font-size: $font-size-caption;
      color: var(--color-text-secondary);
      line-height: 1;
    }

    .card-value {
      font-size: $font-size-h3;
      font-weight: $font-weight-semibold;
      color: var(--color-text-primary);
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

// ─── 暗色模式适配 ───
[data-theme="dark"] {
  .info-card {
    background: var(--color-bg-container);
    border-color: var(--color-border);
    box-shadow: none;

    &:hover {
      box-shadow: $shadow-elevation-1;
      border-color: var(--color-primary-lighter);
    }
  }
}
</style>
