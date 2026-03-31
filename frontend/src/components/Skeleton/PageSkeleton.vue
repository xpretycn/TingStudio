<template>
  <div class="page-skeleton">
    <!-- 表格骨架 -->
    <template v-if="type === 'table'">
      <div class="skeleton-toolbar">
        <div class="skeleton-input" style="width: 200px;" />
        <div class="skeleton-btn" style="width: 80px;" />
      </div>
      <div class="skeleton-table">
        <div class="skeleton-table-header">
          <div v-for="i in columns" :key="i" class="skeleton-th" />
        </div>
        <div v-for="i in rows" :key="i" class="skeleton-table-row">
          <div v-for="j in columns" :key="j" class="skeleton-td" />
        </div>
      </div>
    </template>

    <!-- 卡片网格骨架 -->
    <template v-if="type === 'cards'">
      <div class="skeleton-toolbar">
        <div class="skeleton-input" style="width: 260px;" />
        <div class="skeleton-btn" style="width: 100px;" />
      </div>
      <div class="skeleton-cards">
        <div v-for="i in rows" :key="i" class="skeleton-card">
          <div class="skeleton-card-title" />
          <div class="skeleton-card-body">
            <div class="skeleton-progress" />
            <div class="skeleton-progress" style="width: 60%;" />
          </div>
        </div>
      </div>
    </template>

    <!-- 详情页骨架 -->
    <template v-if="type === 'detail'">
      <div class="skeleton-detail-card">
        <div class="skeleton-detail-header">
          <div class="skeleton-input" style="width: 36px; height: 36px; border-radius: 50%;" />
          <div class="skeleton-input" style="width: 200px; height: 22px;" />
          <div style="flex: 1;" />
          <div class="skeleton-btn" style="width: 60px; height: 32px;" />
        </div>
        <div class="skeleton-desc-grid">
          <div v-for="i in 8" :key="i" class="skeleton-desc-item">
            <div class="skeleton-input" style="width: 60px; height: 12px; opacity: 0.5;" />
            <div class="skeleton-input" style="width: 100px; height: 16px; margin-top: 6px;" />
          </div>
        </div>
        <div class="skeleton-section-title" />
        <div class="skeleton-table">
          <div class="skeleton-table-header">
            <div class="skeleton-th" style="flex: 2;" />
            <div class="skeleton-th" style="flex: 1;" />
            <div class="skeleton-th" style="flex: 1;" />
          </div>
          <div v-for="i in 6" :key="i" class="skeleton-table-row">
            <div class="skeleton-td" style="flex: 2;" />
            <div class="skeleton-td" style="flex: 1;" />
            <div class="skeleton-td" style="flex: 1;" />
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  type?: 'table' | 'cards' | 'detail'
  rows?: number
  columns?: number
}>(), {
  type: 'table',
  rows: 5,
  columns: 5,
})
</script>

<style scoped lang="scss">
.page-skeleton {
  padding: $space-1 0;
}

// Toolbar skeleton
.skeleton-toolbar {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-bottom: $space-5;
  padding: 0 $space-1;
}

.skeleton-input,
.skeleton-btn {
  height: 32px;
  border-radius: $radius-md;
  background: linear-gradient(90deg, $brand-primary-bg 25%, $skeleton-shimmer 50%, $brand-primary-bg 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

// Table skeleton
.skeleton-table {
  border-radius: $radius-lg;
  overflow: hidden;
  border: 1px solid $border-color;
}

.skeleton-table-header {
  display: flex;
  background: $bg-page;
  padding: $space-3 $space-4;
  gap: $space-2;
  border-bottom: 1px solid $border-color;
}

.skeleton-table-row {
  display: flex;
  padding: 14px $space-4;
  gap: $space-2;
  border-bottom: 1px solid $skeleton-border;

  &:last-child {
    border-bottom: none;
  }
}

.skeleton-th,
.skeleton-td {
  flex: 1;
  height: 16px;
  border-radius: $radius-xs;
  background: linear-gradient(90deg, $brand-primary-bg 25%, $skeleton-shimmer 50%, $brand-primary-bg 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}

.skeleton-th {
  height: 14px;
  opacity: 0.6;
}

// Cards skeleton
.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: $space-4;
}

.skeleton-card {
  padding: $space-5;
  border-radius: $radius-xl;
  border: 1px solid $border-color;
  background: $bg-container;

  .skeleton-card-title {
    height: 18px;
    width: 60%;
    margin-bottom: $space-4;
    border-radius: $radius-sm;
    background: linear-gradient(90deg, $brand-primary-bg 25%, $skeleton-shimmer 50%, $brand-primary-bg 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }

  .skeleton-card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .skeleton-progress {
    height: 8px;
    width: 80%;
    border-radius: $radius-xs;
    background: linear-gradient(90deg, $brand-primary-bg 25%, $skeleton-shimmer 50%, $brand-primary-bg 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }
}

@keyframes skeleton-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

// Detail skeleton
.skeleton-detail-card {
  padding: $space-5;
  border-radius: $radius-lg;
  border: 1px solid $border-color;
  background: $bg-container;
}

.skeleton-detail-header {
  display: flex;
  align-items: center;
  gap: $space-3;
  margin-bottom: $space-5;
}

.skeleton-desc-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $space-4;
  margin-bottom: $space-6;
  padding: $space-4;
  border-radius: $radius-md;
  background: $bg-page;
}

.skeleton-desc-item {
  display: flex;
  flex-direction: column;
}

.skeleton-section-title {
  height: 16px;
  width: 140px;
  border-radius: $radius-xs;
  margin-bottom: $space-3;
  background: linear-gradient(90deg, $brand-primary-bg 25%, $skeleton-shimmer 50%, $brand-primary-bg 75%);
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.5s ease-in-out infinite;
}
</style>
