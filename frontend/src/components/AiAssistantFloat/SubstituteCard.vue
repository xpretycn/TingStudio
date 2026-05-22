<template>
  <div class="substitute-card">
    <div class="card-header">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 12L8 4l4 8" stroke="var(--color-primary)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="8" cy="9" r="1" fill="var(--color-primary)"/>
      </svg>
      <span>原料替代建议</span>
    </div>

    <div class="original-info">
      <span class="ori-label">原始原料：</span>
      <span class="ori-name">{{ data.original?.name }}</span>
      <span class="ori-type">{{ typeLabel(data.original?.type) }}</span>
      <span v-if="data.original?.unitPrice" class="ori-price">&yen;{{ data.original.unitPrice }}/kg</span>
    </div>

    <div v-if="data.substitutes?.length" class="sub-list">
      <div v-for="(sub, idx) in data.substitutes" :key="sub.id" class="sub-item">
        <div class="sub-rank">{{ idx + 1 }}</div>
        <div class="sub-info">
          <span class="sub-name">{{ sub.name }}</span>
          <span class="sub-type">{{ typeLabel(sub.type) }}</span>
        </div>
        <div class="sub-meta">
          <span v-if="sub.unitPrice" class="sub-price">&yen;{{ sub.unitPrice }}/kg</span>
          <span v-if="sub.stock != null" class="sub-stock">库存:{{ sub.stock }}</span>
        </div>
        <div class="sub-similarity">
          <span class="sim-badge">{{ sub.similarity }}</span>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      {{ data.message || '暂无同类型替代原料' }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  data: any;
}>();

function typeLabel(t: string): string {
  return t === "herb" ? "药材" : t === "supplement" ? "辅料" : t || "";
}
</script>

<style scoped lang="scss">
.substitute-card {
  background: $bg-container;
  border: 1px solid $border-color-light;
  border-radius: 12px;
  padding: var(--space-3-5);
  margin: 8px 0;
  font-size: 13px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-weight: 600;
  color: $text-primary;
  margin-bottom: var(--space-2-5);
}

.original-info {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: 8px var(--space-2-5);
  background: $bg-page;
  border-radius: 8px;
  margin-bottom: var(--space-2-5);
  font-size: 12px;
  flex-wrap: wrap;

  .ori-label { color: $text-tertiary; }
  .ori-name { font-weight: 600; color: $text-primary; }
  .ori-type { color: $text-tertiary; background: $border-color-light; padding: 1px 6px; border-radius: 4px; font-size: 11px; }
  .ori-price { color: var(--color-primary); font-weight: 500; margin-left: auto; }
}

.sub-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
}

.sub-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px var(--space-2-5);
  background: $bg-page;
  border-radius: 8px;
  font-size: 12px;
  transition: background 0.15s;

  &:hover {
    background: $bg-hover;
  }
}

.sub-rank {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: $gradient-brand;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sub-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);

  .sub-name {
    font-weight: 500;
    color: $text-primary;
  }

  .sub-type {
    font-size: 11px;
    color: $text-tertiary;
  }
}

.sub-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-0-5);

  .sub-price {
    color: var(--color-primary);
    font-weight: 500;
  }

  .sub-stock {
    font-size: 10px;
    color: $text-tertiary;
  }
}

.sub-similarity {
  .sim-badge {
    display: inline-block;
    padding: var(--space-0-5) 8px;
    border-radius: 10px;
    background: rgba(16, 185, 129, 0.1);
    color: var(--color-primary);
    font-size: 11px;
    font-weight: 500;
  }
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: $text-tertiary;
  font-size: 13px;
}
</style>
