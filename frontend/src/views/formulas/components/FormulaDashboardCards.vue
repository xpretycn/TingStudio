<template>
  <section class="dashboard-grid" data-testid="formula-dashboard">
    <div class="stat-card" v-for="(card, idx) in cards" :key="card.label"
      :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
      <div class="stat-card-top">
        <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
        </div>
        <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">
          {{ card.badge }}
        </span>
      </div>
      <p class="stat-label">{{ card.label }}</p>
      <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
    </div>
  </section>
</template>

<script setup lang="ts">
export interface DashboardCard {
  label: string;
  value: string;
  unit: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  iconBg: string;
  iconColor: string;
  iconPath: string;
}

defineProps<{
  cards: DashboardCard[];
}>();
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 0;

  .stat-card {
    background: var(--color-bg-container);
    padding: var(--space-2-5) 16px;
    border-radius: 12px;
    border: 1px solid var(--color-bg-container);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    transition: all $transition-slow;
    animation: dashboard-fade-in 0.5s ease forwards;
    opacity: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
      border-color: transparent;
    }

    .stat-card-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 4px;
    }

    .stat-icon {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      svg {
        width: 16px;
        height: 16px;
      }
    }

    .stat-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 1px var(--space-1-5);
      border-radius: 4px;
      white-space: nowrap;
    }

    .stat-label {
      font-size: 9px;
      color: var(--color-text-placeholder);
      margin-bottom: 1px;
      width: 100%;
    }

    .stat-value {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text-primary);
      line-height: 1.2;
      width: 100%;

      .stat-unit {
        font-size: 11px;
        font-weight: 400;
        color: var(--color-text-placeholder);
      }
    }
  }
}

@keyframes dashboard-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media screen and (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
}
</style>
