<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { materialApi } from "@/api/material";
import type { MaterialVersion, CompareResult, CompareDiffItem } from "@/api/material";
import { splitDateTime } from "@/utils/timeFormat";

const route = useRoute();
const router = useRouter();
const materialId = route.params.id as string;

const loading = ref(true);
const compareLoading = ref(false);
const versions = ref<MaterialVersion[]>([]);
const materialName = ref("");
const currentVersion = ref(0);
const leftVersionId = ref<string>("");
const rightVersionId = ref<string>("");
const compareResult = ref<CompareResult | null>(null);

const versionOptions = computed(() =>
  versions.value.map((v) => ({
    value: v.id,
    label: `v${v.version} (${splitDateTime(v.createdAt).date})`,
  }))
);

const canCompare = computed(
  () =>
    leftVersionId.value &&
    rightVersionId.value &&
    leftVersionId.value !== rightVersionId.value
);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await materialApi.getVersions(materialId);
    materialName.value = res.materialName;
    currentVersion.value = res.currentVersion;
    versions.value = res.versions;

    if (route.query.v1 && route.query.v2) {
      leftVersionId.value = route.query.v1 as string;
      rightVersionId.value = route.query.v2 as string;
      if (canCompare.value) {
        await doCompare();
      }
    } else if (versions.value.length >= 2) {
      leftVersionId.value = versions.value[1].id;
      rightVersionId.value = versions.value[0].id;
    }
  } catch {
    MessagePlugin.error("获取版本历史失败");
    router.back();
  } finally {
    loading.value = false;
  }
});

async function doCompare() {
  if (!canCompare.value) {
    MessagePlugin.warning("请选择两个不同的版本");
    return;
  }
  compareLoading.value = true;
  try {
    compareResult.value = await materialApi.compareVersions(
      materialId,
      leftVersionId.value,
      rightVersionId.value
    );
  } catch {
    MessagePlugin.error("版本对比失败");
  } finally {
    compareLoading.value = false;
  }
}

function handleBack() {
  router.push({
    name: "MaterialVersions",
    params: { id: materialId },
  });
}

function goToList() {
  router.push({ name: "MaterialList" });
}

function getChangeClass(type: CompareDiffItem["type"]) {
  return `change-${type}`;
}

function getChangeMarker(item: CompareDiffItem) {
  switch (item.type) {
    case "increase":
    case "decrease":
      return item.change;
    case "unchanged":
      return "—";
    case "new":
      return "NEW";
    case "deleted":
      return "DEL";
    default:
      return "";
  }
}

function hasChanges(items: CompareDiffItem[]) {
  return items.some((item) => item.type !== "unchanged");
}

function countChanges(items: CompareDiffItem[]) {
  return items.filter((item) => item.type !== "unchanged").length;
}
</script>

<template>
  <div class="version-compare" :aria-busy="loading">
    <template v-if="!loading">
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="handleBack" title="返回版本历史">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="goToList">原料管理</a>
              <span class="breadcrumb-sep">/</span>
              <a class="breadcrumb-link" @click="handleBack">版本历史</a>
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-current">版本对比</span>
            </nav>
            <h3 class="page-title">
              {{ materialName || "原料" }}
              <span v-if="currentVersion" class="version-tag">v{{ currentVersion }}</span>
            </h3>
          </div>
        </div>
      </header>

      <div class="compare-controls">
        <div class="version-selectors">
          <div class="selector-group">
            <span class="selector-label">基准版本</span>
            <t-select
              v-model="leftVersionId"
              :options="versionOptions"
              placeholder="选择基准版本"
              class="version-select"
              :popup-props="{ appendToBody: true }"
            />
          </div>
          <div class="selector-divider">
            <div class="divider-icon">
              <t-icon name="swap" />
            </div>
          </div>
          <div class="selector-group">
            <span class="selector-label">对比版本</span>
            <t-select
              v-model="rightVersionId"
              :options="versionOptions"
              placeholder="选择对比版本"
              class="version-select"
              :popup-props="{ appendToBody: true }"
            />
          </div>
        </div>
        <button
          class="compare-btn"
          :class="{ disabled: !canCompare }"
          :disabled="!canCompare || compareLoading"
          @click="doCompare"
        >
          <t-icon name="swap" />
          <span>{{ compareLoading ? "对比中..." : "开始对比" }}</span>
        </button>
      </div>

      <div v-if="compareLoading" class="compare-loading">
        <t-loading size="medium" text="正在对比版本差异..." />
      </div>

      <div v-else-if="compareResult" class="compare-results">
        <div class="result-summary">
          <div class="summary-card summary-left">
            <span class="summary-label">基准版本</span>
            <span class="summary-version">v{{ compareResult.left.version }}</span>
            <span class="summary-name">{{ compareResult.left.name }}</span>
          </div>
          <div class="summary-arrow">
            <t-icon name="arrow-right" />
          </div>
          <div class="summary-card summary-right">
            <span class="summary-label">对比版本</span>
            <span class="summary-version">v{{ compareResult.right.version }}</span>
            <span class="summary-name">{{ compareResult.right.name }}</span>
          </div>
        </div>

        <div class="diff-section">
          <div class="section-head">
            <div class="section-head-left">
              <h3 class="section-title">基本信息对比</h3>
              <span v-if="hasChanges(compareResult.diff.basic)" class="section-count">
                {{ countChanges(compareResult.diff.basic) }} 项变更
              </span>
              <span v-else class="section-count section-count-zero">无变更</span>
            </div>
          </div>
          <div class="diff-table">
            <div class="diff-table-header">
              <div class="diff-th diff-th-field">字段</div>
              <div class="diff-th diff-th-left">
                v{{ compareResult.left.version }}
              </div>
              <div class="diff-th diff-th-right">
                v{{ compareResult.right.version }}
              </div>
              <div class="diff-th diff-th-change">变化</div>
            </div>
            <div
              v-for="item in compareResult.diff.basic"
              :key="item.field"
              class="diff-row"
              :class="{ 'diff-row-changed': item.type !== 'unchanged' }"
            >
              <div class="diff-td diff-td-field">
                {{ item.label }}
              </div>
              <div class="diff-td diff-td-left" :class="{ 'value-deleted': item.type === 'deleted' }">
                {{ item.leftDisplay || "--" }}
              </div>
              <div class="diff-td diff-td-right" :class="{ 'value-new': item.type === 'new' }">
                {{ item.rightDisplay || "--" }}
              </div>
              <div class="diff-td diff-td-change">
                <span class="change-marker" :class="getChangeClass(item.type)">
                  {{ getChangeMarker(item) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="diff-section">
          <div class="section-head">
            <div class="section-head-left">
              <h3 class="section-title">营养成分对比</h3>
              <span v-if="hasChanges(compareResult.diff.nutrition)" class="section-count">
                {{ countChanges(compareResult.diff.nutrition) }} 项变更
              </span>
              <span v-else class="section-count section-count-zero">无变更</span>
            </div>
          </div>
          <div v-if="compareResult.diff.nutrition.length === 0" class="diff-empty">
            <t-icon name="chart-bar" size="32px" />
            <p>暂无营养成分数据</p>
          </div>
          <div v-else class="diff-table">
            <div class="diff-table-header">
              <div class="diff-th diff-th-field">营养素</div>
              <div class="diff-th diff-th-left">
                v{{ compareResult.left.version }}
              </div>
              <div class="diff-th diff-th-right">
                v{{ compareResult.right.version }}
              </div>
              <div class="diff-th diff-th-change">变化</div>
            </div>
            <div
              v-for="item in compareResult.diff.nutrition"
              :key="item.field"
              class="diff-row"
              :class="{ 'diff-row-changed': item.type !== 'unchanged' }"
            >
              <div class="diff-td diff-td-field">
                {{ item.label }}
              </div>
              <div class="diff-td diff-td-left" :class="{ 'value-deleted': item.type === 'deleted' }">
                {{ item.leftDisplay || "--" }}
              </div>
              <div class="diff-td diff-td-right" :class="{ 'value-new': item.type === 'new' }">
                {{ item.rightDisplay || "--" }}
              </div>
              <div class="diff-td diff-td-change">
                <span class="change-marker" :class="getChangeClass(item.type)">
                  {{ getChangeMarker(item) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="compare-empty">
        <div class="empty-visual">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <rect x="4" y="12" width="30" height="56" rx="6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.15" />
            <rect x="46" y="12" width="30" height="56" rx="6" stroke="currentColor" stroke-width="2" fill="none" opacity="0.15" />
            <path d="M35 40H45" stroke="currentColor" stroke-width="2" opacity="0.2" />
            <path d="M40 36L44 40L40 44" stroke="currentColor" stroke-width="2" opacity="0.2" />
            <rect x="10" y="24" width="18" height="2" rx="1" fill="currentColor" opacity="0.1" />
            <rect x="10" y="30" width="14" height="2" rx="1" fill="currentColor" opacity="0.08" />
            <rect x="10" y="36" width="18" height="2" rx="1" fill="currentColor" opacity="0.1" />
            <rect x="52" y="24" width="18" height="2" rx="1" fill="currentColor" opacity="0.1" />
            <rect x="52" y="30" width="14" height="2" rx="1" fill="currentColor" opacity="0.08" />
            <rect x="52" y="36" width="18" height="2" rx="1" fill="currentColor" opacity="0.1" />
          </svg>
        </div>
        <p class="empty-text">选择两个版本后点击对比</p>
        <p class="empty-hint">系统将展示字段级别的差异对比</p>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.version-compare {
  padding: 0 0 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: -20px;
  margin-right: -20px;
  padding: 8px 20px;
  background: $overlay-white-80;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid $border-color-light;
  animation: fadeInDown 0.3s ease both;

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;

    .back-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: $radius-lg;
      background: transparent;
      color: $text-tertiary;
      cursor: pointer;
      transition: all $transition-fast;
      font-size: 20px;

      &:hover {
        color: var(--color-primary);
        background: var(--color-primary-bg);
      }
    }

    .header-title-group {
      display: flex;
      flex-direction: column;
      gap: 4px;

      .header-breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 12px;
        line-height: 1;
        color: $text-tertiary;

        .breadcrumb-link {
          color: $text-tertiary;
          cursor: pointer;
          transition: color 0.15s;
          text-decoration: none;

          &:hover {
            color: var(--color-primary);
          }
        }

        .breadcrumb-sep {
          color: $text-placeholder;
        }

        .breadcrumb-current {
          color: $text-secondary;
        }
      }

      .page-title {
        margin: 0;
        font-size: $font-size-h2;
        font-weight: $font-weight-bold;
        color: $text-primary;
        line-height: 1.35;
        display: flex;
        align-items: center;
        gap: 8px;

        .version-tag {
          display: inline-flex;
          align-items: center;
          padding: 2px 10px;
          background: var(--color-primary-bg);
          color: var(--color-primary);
          font-size: 12px;
          font-weight: $font-weight-bold;
          border-radius: $radius-pill;
          font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
          letter-spacing: 0.02em;
        }
      }
    }
  }
}

.compare-controls {
  display: flex;
  align-items: flex-end;
  gap: 20px;
  margin-top: 24px;
  padding: 24px;
  background: $bg-container;
  border-radius: $radius-2xl;
  border: 1px solid $border-color;
  box-shadow: $shadow-elevation-1;
  animation: fadeIn 0.4s ease both;
}

.version-selectors {
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex: 1;
}

.selector-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .selector-label {
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    color: $text-secondary;
    letter-spacing: 0.02em;
  }

  .version-select {
    width: 100%;
  }
}

.selector-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 6px;
  flex-shrink: 0;

  .divider-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: $radius-circle;
    background: var(--color-primary-bg);
    color: var(--color-primary);
    font-size: 18px;
  }
}

.compare-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: 8px var(--space-4-5);
  height: 40px;
  border: none;
  border-radius: $radius-lg;
  background: var(--color-primary);
  color: #fff;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: all $transition-smooth;
  white-space: nowrap;
  line-height: 1;
  flex-shrink: 0;

  .t-icon {
    font-size: 16px;
  }

  &:hover:not(.disabled) {
    opacity: 0.9;
  }

  &.disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.compare-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) 24px;
  margin-top: 24px;
  background: $bg-container;
  border-radius: $radius-2xl;
  border: 1px solid $border-color;
  box-shadow: $shadow-elevation-1;
}

.compare-results {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 24px;
  animation: fadeIn 0.4s ease both;
}

.result-summary {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background: $bg-container;
  border-radius: $radius-2xl;
  border: 1px solid $border-color;
  box-shadow: $shadow-elevation-1;
}

.summary-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: var(--space-3-5) var(--space-4-5);
  border-radius: $radius-xl;
  border: 1px solid $border-color-light;

  .summary-label {
    font-size: $font-size-micro;
    font-weight: $font-weight-semibold;
    color: $text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .summary-version {
    font-size: $font-size-h2;
    font-weight: $font-weight-bold;
    color: var(--color-primary);
    font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
    line-height: 1.2;
  }

  .summary-name {
    font-size: $font-size-body-sm;
    color: $text-secondary;
  }

  &.summary-left {
    background: var(--color-primary-bg);
  }

  &.summary-right {
    background: $color-info-bg;
  }
}

.summary-arrow {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: $text-placeholder;
  font-size: 20px;
}

.diff-section {
  background: $bg-container;
  border-radius: $radius-2xl;
  border: 1px solid $border-color;
  box-shadow: $shadow-elevation-1;
  overflow: hidden;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;

  .section-head-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title {
    margin: 0;
    font-size: $font-size-h4;
    font-weight: $font-weight-bold;
    color: $text-primary;
    line-height: 1.3;
  }

  .section-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    height: 22px;
    padding: 0 var(--space-2);
    background: var(--color-primary-bg);
    color: var(--color-primary);
    font-size: $font-size-micro;
    font-weight: $font-weight-bold;
    border-radius: $radius-pill;
    line-height: 1;

    &.section-count-zero {
      background: var(--overlay-brand-05);
      color: $text-tertiary;
    }
  }
}

.diff-table {
  padding: 16px 24px 24px;
}

.diff-table-header {
  display: grid;
  grid-template-columns: 140px 1fr 1fr 100px;
  gap: 12px;
  padding: 10px 16px;
  background: var(--overlay-brand-05);
  border-radius: $radius-lg $radius-lg 0 0;
  border-bottom: 1px solid $border-color-light;
}

.diff-th {
  font-size: $font-size-caption;
  font-weight: $font-weight-semibold;
  color: $text-tertiary;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  &.diff-th-field {
    color: $text-secondary;
  }

  &.diff-th-left {
    text-align: left;
  }

  &.diff-th-right {
    text-align: left;
  }

  &.diff-th-change {
    text-align: center;
  }
}

.diff-row {
  display: grid;
  grid-template-columns: 140px 1fr 1fr 100px;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-light;
  transition: background $transition-fast;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: var(--overlay-brand-03);
  }

  &.diff-row-changed {
    background: var(--overlay-brand-03);

    &:hover {
      background: var(--overlay-brand-05);
    }
  }
}

.diff-td {
  font-size: $font-size-body-sm;
  color: $text-primary;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &.diff-td-field {
    font-weight: $font-weight-semibold;
    color: $text-secondary;
    font-size: $font-size-caption;
  }

  &.diff-td-left,
  &.diff-td-right {
    font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
    font-size: $font-size-caption;
  }

  &.diff-td-change {
    text-align: center;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &.value-deleted {
    text-decoration: line-through;
    color: $text-placeholder;
  }

  &.value-new {
    color: $color-info;
    font-weight: $font-weight-semibold;
  }
}

.change-marker {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: $radius-pill;
  font-size: $font-size-micro;
  font-weight: $font-weight-bold;
  letter-spacing: 0.02em;
  white-space: nowrap;

  &.change-increase {
    background: $color-success-bg;
    color: $color-success;
  }

  &.change-decrease {
    background: $color-danger-bg;
    color: $color-danger;
  }

  &.change-unchanged {
    background: transparent;
    color: $text-placeholder;
    padding: 2px 4px;
  }

  &.change-new {
    background: $color-info-bg;
    color: $color-info;
  }

  &.change-deleted {
    background: $color-danger-bg;
    color: $color-danger;
    text-decoration: line-through;
  }
}

.diff-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) 24px;
  text-align: center;
  color: $text-placeholder;
  gap: 12px;

  p {
    margin: 0;
    font-size: $font-size-body;
    color: $text-tertiary;
  }
}

.compare-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) 24px;
  margin-top: 24px;
  text-align: center;
  background: $bg-container;
  border-radius: $radius-2xl;
  border: 1px solid $border-color;
  box-shadow: $shadow-elevation-1;
  animation: fadeIn 0.4s ease both;

  .empty-visual {
    color: $text-placeholder;
    margin-bottom: 16px;
  }

  .empty-text {
    margin: 0 0 8px;
    font-size: $font-size-body;
    color: $text-tertiary;
  }

  .empty-hint {
    margin: 0;
    font-size: $font-size-caption;
    color: $text-placeholder;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
