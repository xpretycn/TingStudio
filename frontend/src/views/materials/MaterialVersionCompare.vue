<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { materialApi } from "@/api/material";
import type { MaterialVersion, CompareResult, CompareDiffItem } from "@/api/material";
import { splitDateTime } from "@/utils/timeFormat";

const MAX_COMPARE_VERSIONS = 3;

const route = useRoute();
const router = useRouter();
const materialId = route.params.id as string;

const loading = ref(true);
const compareLoading = ref(false);
const versions = ref<MaterialVersion[]>([]);
const materialName = ref("");
const currentVersion = ref(0);
const compareResults = ref<CompareResult[]>([]);
const selectedVersionIds = ref<string[]>([]);

const canCompare = computed(() => selectedVersionIds.value.length >= 2);

const availableList = computed(() => {
  const currentIds = new Set(selectedVersionIds.value);
  return versions.value.filter((v) => !currentIds.has(v.id));
});

interface VersionValue {
  display: string;
  rawType: CompareDiffItem["type"];
  change: string;
}

interface MergedDiffItem {
  field: string;
  label: string;
  versionValues: VersionValue[];
}

function mergeDiffItems(
  results: CompareResult[],
  versionCount: number,
  diffKey: "basic" | "nutrition"
): MergedDiffItem[] {
  if (results.length === 0) return [];

  const fieldMap = new Map<string, MergedDiffItem>();

  for (let ri = 0; ri < results.length; ri++) {
    const items = results[ri].diff[diffKey];
    for (const item of items) {
      if (!fieldMap.has(item.field)) {
        fieldMap.set(item.field, {
          field: item.field,
          label: item.label,
          versionValues: Array.from({ length: versionCount }, () => ({
            display: "--",
            rawType: "unchanged" as CompareDiffItem["type"],
            change: "—",
          })),
        });
      }
      const merged = fieldMap.get(item.field)!;
      merged.versionValues[0] = {
        display: item.leftDisplay,
        rawType: item.type === "new" ? "new" : "unchanged",
        change: "—",
      };
      merged.versionValues[ri + 1] = {
        display: item.rightDisplay,
        rawType: item.type,
        change: item.change,
      };
    }
  }

  for (const merged of fieldMap.values()) {
    for (let vi = 1; vi < versionCount; vi++) {
      if (merged.versionValues[vi].display === "--" && merged.versionValues[0].display !== "--") {
        merged.versionValues[vi] = {
          display: merged.versionValues[0].display,
          rawType: "unchanged",
          change: "—",
        };
      }
    }
  }

  return Array.from(fieldMap.values());
}

const mergedBasicDiff = computed(() =>
  mergeDiffItems(compareResults.value, selectedVersionIds.value.length, "basic")
);

const mergedNutritionDiff = computed(() =>
  mergeDiffItems(compareResults.value, selectedVersionIds.value.length, "nutrition")
);

onMounted(async () => {
  loading.value = true;
  try {
    const res = await materialApi.getVersions(materialId);
    materialName.value = res.materialName;
    currentVersion.value = res.currentVersion;
    versions.value = res.versions;

    const qV1 = Array.isArray(route.query.v1) ? route.query.v1[0] : route.query.v1;
    const qV2 = Array.isArray(route.query.v2) ? route.query.v2[0] : route.query.v2;
    const qV3 = Array.isArray(route.query.v3) ? route.query.v3[0] : route.query.v3;

    if (qV1 && qV2) {
      selectedVersionIds.value = [qV1 as string, qV2 as string];
      if (qV3) {
        selectedVersionIds.value.push(qV3 as string);
      }
      if (canCompare.value) {
        await doCompare();
      }
    } else if (qV1) {
      selectedVersionIds.value = [qV1 as string];
    } else if (versions.value.length >= 3) {
      selectedVersionIds.value = [versions.value[2].id, versions.value[1].id, versions.value[0].id];
      await doCompare();
    } else if (versions.value.length >= 2) {
      selectedVersionIds.value = [versions.value[1].id, versions.value[0].id];
      await doCompare();
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
    MessagePlugin.warning("请至少选择两个不同的版本");
    return;
  }
  compareLoading.value = true;
  try {
    const ids = selectedVersionIds.value;
    const baseId = ids[0];
    const promises: Promise<CompareResult>[] = [];
    for (let i = 1; i < ids.length; i++) {
      promises.push(materialApi.compareVersions(materialId, baseId, ids[i]));
    }
    compareResults.value = await Promise.all(promises);
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

function handleAddVersion(versionId: string) {
  if (selectedVersionIds.value.length >= MAX_COMPARE_VERSIONS) return;
  selectedVersionIds.value.push(versionId);
  if (canCompare.value) {
    doCompare();
  }
}

function handleRemove(versionId: string) {
  selectedVersionIds.value = selectedVersionIds.value.filter((id) => id !== versionId);
  compareResults.value = [];
  if (canCompare.value) {
    doCompare();
  }
}

function handleSetBase(idx: number) {
  if (idx <= 0) return;
  const newIds = [...selectedVersionIds.value];
  const temp = newIds[0];
  newIds[0] = newIds[idx];
  newIds[idx] = temp;
  selectedVersionIds.value = newIds;
  if (canCompare.value) {
    doCompare();
  }
}

function onConfirmReset() {
  selectedVersionIds.value = [];
  compareResults.value = [];
}

function getChangeClass(type: CompareDiffItem["type"]) {
  return `change-${type}`;
}

function getDiffClassForVersion(idx: number, val: VersionValue): string {
  if (idx === 0) {
    if (val.rawType === "new") return "diff-missing";
    return "";
  }
  if (val.rawType === "unchanged") return "";
  if (val.rawType === "increase" || val.rawType === "decrease") return "diff-changed";
  if (val.rawType === "new") return "diff-added";
  if (val.rawType === "deleted") return "diff-missing";
  return "";
}

function formatDate(val: string | undefined) {
  if (!val) return "--";
  return splitDateTime(val).date;
}

function getVersionInfo(versionId: string) {
  return versions.value.find((v) => v.id === versionId);
}
</script>

<template>
  <div class="version-compare" :aria-busy="loading">
    <template v-if="!loading">
      <header class="detail-header">
        <div class="header-left">
          <button class="header-back-btn" @click="handleBack" title="返回版本历史">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="goToList">原料管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <a class="breadcrumb-link" @click="handleBack">版本历史</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">版本对比</span>
            </nav>
            <h2 class="page-main-title">
              {{ materialName || "原料" }}
              <span class="title-version-tag">{{ selectedVersionIds.length }} 版对比</span>
            </h2>
          </div>
        </div>
        <div class="header-actions">
          <span class="compare-count">
            当前对比版本数: <strong>{{ selectedVersionIds.length }}</strong>/{{ MAX_COMPARE_VERSIONS }}
          </span>
          <t-popconfirm content="确定要清除所有对比项吗？" @confirm="onConfirmReset">
            <button class="reset-btn" title="重置对比">重置对比</button>
          </t-popconfirm>
        </div>
      </header>

      <main class="detail-main">
        <div v-if="selectedVersionIds.length === 0" class="empty-state">
          <t-icon name="view-module" class="empty-icon" />
          <p class="empty-text">暂无选中的版本，请先从版本管理页面添加</p>
          <button class="back-select-btn" @click="handleBack">返回选择</button>
        </div>

        <div v-else class="compare-grid">
          <div v-for="(verId, idx) in selectedVersionIds" :key="verId" class="compare-card"
            :class="{ 'is-base-card': idx === 0 }" :style="{ animationDelay: `${idx * 0.1}s` }">
            <div class="card-header">
              <div class="card-header-top">
                <span class="version-tag-pill" :class="{ 'base-pill': idx === 0 }">
                  v{{ getVersionInfo(verId)?.version || "?" }}<template v-if="idx === 0"> · 基准</template>
                </span>
                <div class="card-actions-right">
                  <button v-if="idx !== 0" class="pin-btn" @click="handleSetBase(idx)" title="设为基准版本">
                    <t-icon name="pin" />
                  </button>
                  <button class="remove-btn" @click="handleRemove(verId)" title="移除对比">
                    <t-icon name="delete" />
                  </button>
                </div>
              </div>
              <h3 class="card-title">{{ getVersionInfo(verId)?.name || materialName || "--" }}</h3>
              <p class="card-meta">
                <t-icon name="calendar" /> {{ formatDate(getVersionInfo(verId)?.createdAt) }}
              </p>
            </div>

            <div class="card-body">
              <template v-if="compareResults.length > 0 && !compareLoading">
                <h4 class="section-label">基本信息</h4>
                <div v-if="mergedBasicDiff.length > 0" class="ingredients-list">
                  <div v-for="item in mergedBasicDiff" :key="item.field" class="ingredient-item"
                    :class="getDiffClassForVersion(idx, item.versionValues[idx])">
                    <div class="ing-top">
                      <span class="ing-name">{{ item.label }}</span>
                      <div class="ing-right">
                        <span class="ing-value">{{ item.versionValues[idx].display || "--" }}</span>
                        <span v-if="item.versionValues[idx].rawType !== 'unchanged'" class="change-badge"
                          :class="getChangeClass(item.versionValues[idx].rawType)">
                          {{ item.versionValues[idx].change }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div v-else class="no-available">
                  <t-icon name="check-circle" />
                  <span>基本信息无差异</span>
                </div>

                <h4 class="section-label">营养成分</h4>
                <div v-if="mergedNutritionDiff.length === 0" class="no-available">
                  <t-icon name="info-circle" />
                  <span>暂无营养成分数据</span>
                </div>
                <div v-else class="ingredients-list">
                  <div v-for="item in mergedNutritionDiff" :key="item.field" class="ingredient-item"
                    :class="getDiffClassForVersion(idx, item.versionValues[idx])">
                    <div class="ing-top">
                      <span class="ing-name">{{ item.label }}</span>
                      <div class="ing-right">
                        <span class="ing-value">{{ item.versionValues[idx].display || "--" }}</span>
                        <span v-if="item.versionValues[idx].rawType !== 'unchanged'" class="change-badge"
                          :class="getChangeClass(item.versionValues[idx].rawType)">
                          {{ item.versionValues[idx].change }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else-if="compareLoading" class="no-available">
                <t-loading size="small" text="正在对比..." />
              </div>
              <div v-else class="no-available">
                <t-icon name="info-circle" />
                <span>等待选择更多版本后自动对比</span>
              </div>
            </div>
          </div>

          <div v-if="selectedVersionIds.length < MAX_COMPARE_VERSIONS" class="compare-card add-placeholder-card"
            :style="{ animationDelay: `${selectedVersionIds.length * 0.1}s` }">
            <div class="card-header">
              <div class="card-header-top">
                <span class="version-tag-pill placeholder-tag">待选择</span>
              </div>
              <h3 class="card-title placeholder-title">添加对比版本</h3>
              <p class="card-meta">
                还可添加 <strong>{{ MAX_COMPARE_VERSIONS - selectedVersionIds.length }}</strong> 个版本
              </p>
            </div>

            <div class="card-body">
              <h4 class="section-label">可选版本</h4>
              <div class="available-list" v-if="availableList.length > 0">
                <div v-for="item in availableList" :key="item.id" class="available-item"
                  @click="handleAddVersion(item.id)">
                  <div class="avail-top">
                    <span class="avail-ver-num">v{{ item.version }}</span>
                    <t-icon name="chevron-right" class="avail-arrow" />
                  </div>
                  <p class="avail-name">{{ item.name || "未命名" }}</p>
                  <p class="avail-date">{{ formatDate(item.createdAt) }}</p>
                </div>
              </div>
              <div v-else class="no-available">
                <t-icon name="info-circle" />
                <span>暂无更多可对比版本</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

$radius-2xl: 2rem;

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.version-compare {
  .detail-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -32px;
    margin-right: -32px;
    padding: 8px 32px;
    background-color: var(--color-bg-container);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--color-border-light);
    animation: fadeInDown 0.35s ease both;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .header-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: var(--color-text-placeholder);
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: var(--color-primary);
          background-color: var(--color-primary-bg);
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

          .breadcrumb-link {
            color: var(--color-text-placeholder);
            cursor: pointer;
            text-decoration: none;
            transition: color 0.15s;

            &:hover {
              color: var(--color-primary);
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: var(--color-text-placeholder);
          }

          .breadcrumb-current {
            color: var(--color-text-secondary);
          }
        }

        .page-main-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          gap: 8px;

          .title-version-tag {
            display: inline-flex;
            align-items: center;
            padding: 2px 10px;
            background: var(--color-primary-bg);
            color: var(--color-primary);
            font-size: 12px;
            font-weight: 700;
            border-radius: 999px;
            font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
          }
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .compare-count {
        font-size: 12px;
        color: var(--color-text-placeholder);
        font-weight: 500;

        strong {
          color: var(--color-primary);
          font-weight: 700;
        }
      }

      .reset-btn {
        padding: 8px var(--space-4-5);
        background: rgba(244, 63, 94, 0.08);
        color: var(--color-danger);
        border: 1px solid rgba(244, 63, 94, 0.2);
        border-radius: 12px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          background: rgba(244, 63, 94, 0.15);
          border-color: rgba(244, 63, 94, 0.35);
        }
      }
    }
  }

  .detail-main {
    padding: 32px 0;
    animation: fadeInDown 0.35s ease both;
    animation-delay: 0.05s;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-16) 24px;
    gap: 16px;

    .empty-icon {
      font-size: 64px;
      color: var(--color-text-placeholder);
      opacity: 0.2;
    }

    .empty-text {
      font-size: 14px;
      color: var(--color-text-placeholder);
    }

    .back-select-btn {
      padding: var(--space-2-5) var(--space-7);
      background: var(--color-primary);
      color: $text-white;
      border: none;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.2);
      transition: all $transition-fast;

      &:hover {
        background: var(--color-primary-dark);
        transform: translateY(-1px);
        box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.3);
      }
    }
  }

  .compare-grid {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    padding-bottom: 24px;

    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-primary-bg);
      border-radius: 10px;
    }
  }

  .compare-card {
    min-width: 340px;
    max-width: 400px;
    flex-shrink: 0;
    background: var(--color-bg-container);
    border-radius: $radius-2xl;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    border: 1px solid var(--color-bg-page);
    overflow: hidden;
    animation: slideIn 0.5s ease-out both;

    &.is-base-card {
      border-color: #bbf7d0;
      box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08);

      .card-header {
        background: linear-gradient(135deg, var(--color-emerald-50) 0%, var(--color-emerald-50) 100%);
        border-bottom-color: var(--color-primary-bg);
      }
    }

    .card-header {
      padding: 24px;
      border-bottom: 1px solid var(--color-bg-page);
      background: rgba(248, 250, 252, 0.30);
      position: relative;

      .card-header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .version-tag-pill {
        display: inline-block;
        padding: 4px var(--space-2-5);
        background: var(--color-primary-bg);
        color: var(--color-primary-dark);
        font-size: 10px;
        font-weight: 900;
        border-radius: 6px;
        font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;

        &.base-pill {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: $text-white;
          letter-spacing: 0.05em;
        }
      }

      .card-actions-right {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .pin-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-placeholder);
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 15px;

        &:hover {
          color: var(--color-primary);
          background-color: var(--color-emerald-50);
          transform: rotate(-30deg);
        }
      }

      .remove-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--color-text-placeholder);
        cursor: pointer;
        transition: color 0.2s;
        font-size: 16px;

        &:hover {
          color: var(--color-danger);
        }
      }

      .card-title {
        margin: 0 0 var(--space-1-5);
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
      }

      .card-meta {
        display: flex;
        align-items: center;
        gap: 4px;
        margin: 0;
        font-size: 12px;
        color: var(--color-text-placeholder);
      }
    }

    .card-body {
      padding: 24px;

      .section-label {
        font-size: 10px;
        font-weight: 900;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin: 0 0 16px;

        &:not(:first-child) {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid var(--color-bg-page);
        }
      }

      .ingredients-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 32px;
      }

      .ingredient-item {
        padding: var(--space-3-5) 16px;
        margin-bottom: var(--space-2-5);
        border-radius: 16px;
        border: 1px solid var(--color-bg-page);
        transition: all $transition-fast;
        background: rgba(248, 250, 252, 0.50);

        &.diff-added {
          background: var(--color-emerald-50);
          color: var(--color-primary-dark);
          font-weight: 700;
        }

        &.diff-changed {
          background: var(--color-warning-bg);
          color: var(--color-warning);
          font-weight: 700;
        }

        &.diff-missing {
          border-style: dashed;
          border-color: var(--color-danger-border);
          background: var(--color-danger-bg);

          .ing-name {
            color: var(--color-danger) !important;
            text-decoration: line-through;
            font-weight: 700;
          }

          .ing-value {
            color: var(--color-danger) !important;
            font-weight: 900;
          }
        }

        .ing-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-1-5);

          .ing-name {
            font-size: 14px;
            font-weight: 700;
            color: inherit;
          }

          .ing-right {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .ing-value {
            font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
            font-size: 14px;
            font-weight: 900;
            color: inherit;
          }
        }

        .change-badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
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
      }

      .no-available {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 32px 16px;
        font-size: 13px;
        color: var(--color-text-placeholder);

        .t-icon {
          font-size: 18px;
        }
      }
    }
  }

  .add-placeholder-card {
    border: 2px dashed var(--color-border);
    background: var(--color-bg-page);
    overflow: visible;

    .placeholder-tag {
      background: var(--color-bg-hover);
      color: var(--color-text-placeholder);
    }

    .placeholder-title {
      color: var(--color-text-placeholder);
    }

    .card-header {
      background: transparent;
      border-bottom: 1px dashed var(--color-border);

      .card-meta strong {
        color: var(--color-primary);
        font-weight: 700;
      }
    }

    .card-body {
      .available-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5);
      }

      .available-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: var(--space-3-5) 16px;
        border-radius: 12px;
        border: 1px solid var(--color-border-light);
        background: var(--color-bg-container);
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          border-color: var(--color-primary);
          background: var(--color-emerald-50);
          box-shadow: 0 1px 3px rgba(16, 185, 129, 0.08);

          .avail-ver-num {
            color: var(--color-primary);
          }

          .avail-arrow {
            color: var(--color-primary);
            transform: translateX(3px);
          }

          .avail-name {
            color: var(--color-primary-dark);
          }
        }

        &:active {
          transform: scale(0.98);
        }

        .avail-top {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .avail-ver-num {
            font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
            font-size: 13px;
            font-weight: 900;
            color: var(--color-text-secondary);
            transition: color 0.2s;
          }

          .avail-arrow {
            font-size: 16px;
            color: var(--color-text-placeholder);
            transition: all $transition-fast;
          }
        }

        .avail-name {
          margin: 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
          transition: color 0.2s;
        }

        .avail-date {
          margin: 0;
          font-size: 11px;
          color: var(--color-text-placeholder);
        }
      }

      .no-available {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 32px 16px;
        font-size: 13px;
        color: var(--color-text-placeholder);

        .t-icon {
          font-size: 18px;
        }
      }
    }
  }

  // ─── 暗色模式适配 ───
  [data-theme="dark"] {
    .compare-card {
      box-shadow: $shadow-elevation-1;
      border-color: var(--color-border);

      &.is-base-card {
        border-color: var(--color-primary-lighter);
        box-shadow: $shadow-elevation-2;

        .card-header {
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(34, 197, 94, 0.08) 100%);
          border-bottom-color: var(--color-border);
        }
      }

      .card-header {
        background: var(--color-bg-container-alt);
        border-bottom-color: var(--color-border);
      }

      .card-body {
        .ingredient-item {
          background: var(--color-bg-container-alt);
          border-color: var(--color-border);

          &.diff-missing {
            background: rgba(239, 68, 68, 0.08);
            border-color: rgba(239, 68, 68, 0.2);
          }

          .ing-bar-track {
            background: var(--color-border);
          }
        }
      }
    }

    .add-placeholder-card {
      border-color: var(--color-border);
      background: transparent;

      .card-header {
        border-bottom-color: var(--color-border);
      }

      .available-item {
        background: var(--color-bg-container-alt);
        border-color: var(--color-border);

        &:hover {
          background: rgba(16, 185, 129, 0.08);
          box-shadow: none;
        }
      }
    }

    .detail-header {
      border-bottom-color: var(--color-border);
    }
  }
}
</style>
