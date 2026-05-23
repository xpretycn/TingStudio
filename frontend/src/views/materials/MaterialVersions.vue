<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { materialApi } from "@/api/material";
import type { MaterialVersion } from "@/api/material";
import { formatTimestamp, splitDateTime } from "@/utils/timeFormat";

const route = useRoute();
const router = useRouter();
const materialId = route.params.id as string;

const loading = ref(true);
const versionDetail = ref<any>(null);
const detailLoading = ref(false);
const versions = ref<MaterialVersion[]>([]);
const materialName = ref("");
const materialCode = ref("");
const currentVersion = ref(0);
const selectedVersionId = ref<string | null>(null);
const compareTargetId = ref<string | null>(null);
const searchKeyword = ref("");
const filterType = ref<"all" | "latest" | "history">("all");

const selectedVersion = computed(() =>
  versions.value.find((v) => v.id === selectedVersionId.value) ?? null
);

const filteredVersions = computed(() => {
  let result = versions.value;
  if (filterType.value === "latest") {
    result = result.filter((v) => v.isLatest);
  } else if (filterType.value === "history") {
    result = result.filter((v) => !v.isLatest);
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.trim().toLowerCase();
    result = result.filter((v) =>
      String(v.version).includes(kw) ||
      v.createdByName?.toLowerCase().includes(kw)
    );
  }
  return result;
});

onMounted(async () => {
  loading.value = true;
  try {
    const res = await materialApi.getVersions(materialId);
    materialName.value = res.materialName;
    materialCode.value = res.materialCode;
    currentVersion.value = res.currentVersion;
    versions.value = res.versions;
  } catch {
    MessagePlugin.error("获取版本历史失败");
    router.back();
  } finally {
    loading.value = false;
  }
});

async function selectVersion(ver: MaterialVersion) {
  selectedVersionId.value = ver.id;
  detailLoading.value = true;
  try {
    versionDetail.value = await materialApi.getVersionDetail(
      materialId,
      ver.id
    );
  } catch {
    MessagePlugin.error("获取版本详情失败");
  } finally {
    detailLoading.value = false;
  }
}

function closeDetail() {
  versionDetail.value = null;
  selectedVersionId.value = null;
}

function handleBack() {
  router.push({ name: "MaterialList" });
}

function goToDetail() {
  router.push({ name: "MaterialDetail", params: { id: materialId } });
}

function goToCompare() {
  if (compareTargetId.value && selectedVersionId.value && compareTargetId.value !== selectedVersionId.value) {
    router.push({
      name: "MaterialVersionCompare",
      params: { id: materialId },
      query: { v1: compareTargetId.value, v2: selectedVersionId.value },
    });
  } else if (versions.value.length >= 2) {
    router.push({ name: "MaterialVersionCompare", params: { id: materialId } });
  } else {
    MessagePlugin.warning("至少需要两个版本才能对比");
  }
}

function startCompare(ver: MaterialVersion) {
  if (!compareTargetId.value) {
    compareTargetId.value = ver.id;
    MessagePlugin.info(`已选择 v${ver.version} 作为对比基准，请选择另一个版本`);
  } else if (compareTargetId.value === ver.id) {
    compareTargetId.value = null;
    MessagePlugin.info("已取消选择");
  } else {
    router.push({
      name: "MaterialVersionCompare",
      params: { id: materialId },
      query: { v1: compareTargetId.value, v2: ver.id },
    });
  }
}

function formatChanges(version: MaterialVersion): string {
  if (
    version.changesSummary &&
    version.changesSummary !== `版本 v${version.version}`
  ) {
    return version.changesSummary;
  }
  return version.version === 1 ? "初始创建" : `版本 v${version.version} 更新`;
}

function formatChangeValue(val: any): string {
  if (val == null) return "--";
  if (typeof val === "number") {
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  }
  return String(val);
}
</script>

<template>
  <div class="version-list" :aria-busy="loading">
    <template v-if="!loading">
      <!-- 页面标题 -->
      <header class="page-header">
        <div class="header-left">
          <button class="back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">原料管理</a>
              <span class="breadcrumb-sep">/</span>
              <span class="breadcrumb-current">版本历史</span>
            </nav>
            <h3 class="page-title">
              {{ materialName || "原料" }}
              <span v-if="currentVersion" class="version-tag">v{{ currentVersion }}</span>
            </h3>
          </div>
        </div>
        <div class="header-actions">
          <button v-if="compareTargetId" class="action-btn action-primary" @click="goToCompare">
            <t-icon name="swap" />
            <span>对比 (v{{ versions.find(v => v.id === compareTargetId)?.version }})</span>
          </button>
          <button class="action-btn action-secondary" @click="goToCompare">
            <t-icon name="swap" />
            <span>版本对比</span>
          </button>
          <button class="action-btn action-secondary" @click="goToDetail">
            <t-icon name="browse" />
            <span>查看详情</span>
          </button>
        </div>
      </header>
      <!-- 内容区域 -->
      <div class="content-layout">
        <!-- 版本时间线 -->
        <div class="timeline-section">
          <div class="section-head">
            <div class="section-head-left">
              <h3 class="section-title">版本时间线</h3>
              <span class="section-count">{{ filteredVersions.length }}</span>
            </div>
            <div class="section-head-right">
              <t-input v-model="searchKeyword" placeholder="搜索版本号/操作人" size="small" clearable class="version-search">
                <template #prefix-icon>
                  <t-icon name="search" />
                </template>
              </t-input>
              <div class="filter-tabs">
                <button class="filter-tab" :class="{ active: filterType === 'all' }"
                  @click="filterType = 'all'">全部</button>
                <button class="filter-tab" :class="{ active: filterType === 'latest' }"
                  @click="filterType = 'latest'">最新</button>
                <button class="filter-tab" :class="{ active: filterType === 'history' }"
                  @click="filterType = 'history'">历史</button>
              </div>
            </div>
          </div>

          <div v-if="versions.length === 0" class="empty-state">
            <div class="empty-icon">
              <t-icon name="bulletpoint" size="40px" />
            </div>
            <p class="empty-text">暂无版本数据</p>
            <p class="empty-hint">编辑原料后系统会自动创建新版本</p>
          </div>

          <div v-else-if="filteredVersions.length === 0" class="empty-state">
            <div class="empty-icon">
              <t-icon name="search" size="40px" />
            </div>
            <p class="empty-text">未找到匹配的版本</p>
            <p class="empty-hint">尝试调整搜索关键词或筛选条件</p>
          </div>

          <div v-else class="timeline">
            <div v-for="(ver, index) in filteredVersions" :key="ver.id" class="timeline-item" :class="{
              active: selectedVersionId === ver.id,
              'item-current': ver.isLatest,
            }">
              <div class="timeline-connector">
                <div class="tl-dot" :class="{ 'dot-current': ver.isLatest }">
                  <div v-if="ver.isLatest" class="dot-pulse"></div>
                </div>
                <div v-if="index < filteredVersions.length - 1" class="tl-line"></div>
              </div>

              <div class="tl-card" @click="selectVersion(ver)">
                <div class="tl-card-top">
                  <div class="tl-card-header">
                    <span class="tl-version-badge">v{{ ver.version }}</span>
                    <span v-if="ver.isLatest" class="tl-current-tag">最新</span>
                    <span v-if="compareTargetId === ver.id" class="tl-compare-tag">基准</span>
                  </div>
                  <span class="tl-date">{{
                    splitDateTime(ver.createdAt).date
                    }}</span>
                </div>

                <div class="tl-meta">
                  <span class="tl-operator">{{ ver.createdByName }}</span>
                  <span class="tl-role-tag" :class="ver.createdByRole === 'admin'
                    ? 'role-admin'
                    : 'role-formulist'
                    ">
                    {{
                      ver.createdByRole === "admin" ? "管理员" : "配方师"
                    }}
                  </span>
                </div>

                <div v-if="ver.changesDetail && ver.changesDetail.length > 0" class="tl-changes-list">
                  <div v-for="(change, ci) in ver.changesDetail.slice(0, 3)" :key="ci" class="tl-change-item">
                    <span class="change-label">{{ change.label }}</span>
                    <span class="change-values">{{ formatChangeValue(change.old) }} → {{ formatChangeValue(change.new)
                      }}</span>
                  </div>
                  <span v-if="ver.changesDetail.length > 3" class="change-more">+{{ ver.changesDetail.length - 3 }}
                    项变更</span>
                </div>
                <p v-else class="tl-reason">{{ formatChanges(ver) }}</p>

                <div class="tl-card-actions">
                  <button v-if="versions.length >= 2" class="tl-action-btn" @click.stop="startCompare(ver)"
                    title="对比此版本">
                    <t-icon name="swap" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 版本详情 -->
        <div class="detail-section">
          <div class="section-head">
            <h3 class="section-title">版本快照</h3>
            <button v-if="selectedVersion" class="section-close-btn" @click="closeDetail" title="关闭详情">
              <t-icon name="close" />
            </button>
          </div>

          <div v-if="!selectedVersion" class="detail-empty">
            <div class="detail-empty-visual">
              <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                <rect x="8" y="12" width="56" height="48" rx="6" stroke="currentColor" stroke-width="2" fill="none"
                  opacity="0.2" />
                <rect x="16" y="40" width="40" height="2" rx="1" fill="currentColor" opacity="0.12" />
                <rect x="16" y="46" width="28" height="2" rx="1" fill="currentColor" opacity="0.08" />
                <circle cx="36" cy="28" r="8" stroke="currentColor" stroke-width="2" fill="none" opacity="0.2"
                  stroke-dasharray="2 2" />
                <line x1="42" y1="34" x2="48" y2="40" stroke="currentColor" stroke-width="2" opacity="0.2" />
              </svg>
            </div>
            <p class="detail-empty-text">
              选择左侧版本查看<br />原料快照与变更详情
            </p>
          </div>
          <!-- 版本详情内容 -->
          <div v-else class="detail-panel">
            <!-- 版本身份信息 -->
            <div class="detail-identity">
              <div class="identity-main">
                <span class="identity-version">v{{ selectedVersion.version }}</span>
              </div>
              <div class="identity-meta">
                <span v-if="selectedVersion.isLatest" class="identity-current">当前版本</span>
                <span class="identity-time">{{ splitDateTime(selectedVersion.createdAt).date }}
                  {{ splitDateTime(selectedVersion.createdAt).time }}</span>
              </div>
            </div>
            <!-- 版本基本信息 -->
            <div class="detail-card detail-snapshot">
              <h4 class="detail-card-title">基本信息</h4>
              <div class="snapshot-grid">
                <div class="snapshot-field">
                  <t-icon name="layers" class="sn-field-icon" />
                  <span class="sn-field-label">原料名称</span>
                  <span class="sn-field-value">{{
                    versionDetail?.name || materialName || "--"
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="barcode" class="sn-field-icon" />
                  <span class="sn-field-label">原料编码</span>
                  <span class="sn-field-value">{{
                    versionDetail?.code || materialCode || "--"
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="root-list" class="sn-field-icon" />
                  <span class="sn-field-label">类型</span>
                  <span class="sn-field-value">{{
                    versionDetail?.materialType === "herb" ? "药材" : "辅料"
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="edit-1" class="sn-field-icon" />
                  <span class="sn-field-label">单位</span>
                  <span class="sn-field-value">{{
                    versionDetail?.unit || "--"
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="layers" class="sn-field-icon" />
                  <span class="sn-field-label">库存</span>
                  <span class="sn-field-value">{{
                    versionDetail?.stock ?? "--"
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="barcode" class="sn-field-icon" />
                  <span class="sn-field-label">单价</span>
                  <span class="sn-field-value">{{
                    versionDetail?.unitPrice != null
                      ? `¥${Number(versionDetail.unitPrice).toFixed(2)}`
                      : "暂未录入"
                  }}</span>
                </div>
              </div>
            </div>
            <!-- 版本营养成分 -->
            <div v-if="versionDetail?.nutrition" class="detail-card detail-nutrition">
              <h4 class="detail-card-title">营养成分（每100g）</h4>
              <div class="nutrition-grid">
                <div class="nutrition-item">
                  <span class="nutrition-label">蛋白质</span>
                  <span class="nutrition-value">{{ versionDetail.nutrition.protein ?? "--" }}g</span>
                </div>
                <div class="nutrition-item">
                  <span class="nutrition-label">脂肪</span>
                  <span class="nutrition-value">{{ versionDetail.nutrition.fat ?? "--" }}g</span>
                </div>
                <div class="nutrition-item">
                  <span class="nutrition-label">碳水化合物</span>
                  <span class="nutrition-value">{{ versionDetail.nutrition.carbohydrate ?? "--" }}g</span>
                </div>
                <div class="nutrition-item">
                  <span class="nutrition-label">钠</span>
                  <span class="nutrition-value">{{ versionDetail.nutrition.sodium ?? "--" }}mg</span>
                </div>
                <div class="nutrition-item">
                  <span class="nutrition-label">能量</span>
                  <span class="nutrition-value">{{ versionDetail.nutrition.energy ?? "--" }}kJ</span>
                </div>
                <div class="nutrition-item">
                  <span class="nutrition-label">膳食纤维</span>
                  <span class="nutrition-value">{{ versionDetail.nutrition.fiber ?? "--" }}g</span>
                </div>
              </div>
            </div>
            <!-- 版本信息 -->
            <div class="detail-card detail-version-info">
              <h4 class="detail-card-title">版本信息</h4>
              <div class="snapshot-grid">
                <div class="snapshot-field">
                  <t-icon name="root-list" class="sn-field-icon" />
                  <span class="sn-field-label">版本号</span>
                  <span class="sn-field-value">v{{ versionDetail?.version || selectedVersion.version }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="user" class="sn-field-icon" />
                  <span class="sn-field-label">创建人</span>
                  <span class="sn-field-value">{{
                    versionDetail?.createdByName ||
                    versionDetail?.createdBy ||
                    selectedVersion.createdByName ||
                    "--"
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="time" class="sn-field-icon" />
                  <span class="sn-field-label">创建时间</span>
                  <span class="sn-field-value">{{
                    formatTimestamp(
                      versionDetail?.createdAt || selectedVersion.createdAt
                    )
                  }}</span>
                </div>
                <div class="snapshot-field">
                  <t-icon name="edit-1" class="sn-field-icon" />
                  <span class="sn-field-label">变更摘要</span>
                  <span v-if="selectedVersion.changesDetail && selectedVersion.changesDetail.length > 0"
                    class="sn-field-value sn-changes-detail">
                    <span v-for="(change, ci) in selectedVersion.changesDetail" :key="ci" class="sn-change-row">
                      {{ change.label }}: {{ formatChangeValue(change.old) }} → {{ formatChangeValue(change.new) }}
                    </span>
                  </span>
                  <span v-else class="sn-field-value">{{ formatChanges(selectedVersion) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.version-list {
  padding: 0 0 20px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
}

.content-layout {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  margin-top: 24px;
  animation: fadeIn 0.4s ease both;
}

.timeline-section,
.detail-section {
  background: $bg-container;
  border-radius: $radius-2xl;
  border: 1px solid $border-color;
  box-shadow: $shadow-elevation-1;
}

.timeline-section {
  flex: 0 0 485px;
  max-width: 485px;
  align-self: flex-start;
  position: sticky;
  top: calc(88px + 24px);
  max-height: calc(100vh - 88px - 48px);
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: $border-color;
    border-radius: 4px;
  }
}

.detail-section {
  flex: 1;
  min-width: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 0;

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
  }

  .section-close-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: $text-tertiary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      color: $text-regular;
      background: var(--overlay-brand-08);
    }
  }

  .section-head-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .version-search {
    width: 180px;
  }

  .filter-tabs {
    display: flex;
    gap: 2px;
    background: $bg-container;
    border-radius: $radius-md;
    padding: 2px;
  }

  .filter-tab {
    padding: 3px 10px;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: $text-tertiary;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;

    &:hover {
      color: $text-secondary;
    }

    &.active {
      background: #fff;
      color: var(--color-primary);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }
  }
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
          font-family: ui-monospace, SFMono-Regular, "Cascadia Code",
            monospace;
          letter-spacing: 0.02em;
        }
      }
    }
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: 8px var(--space-4-5);
  border: none;
  border-radius: $radius-lg;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  cursor: pointer;
  transition: all $transition-smooth;
  white-space: nowrap;
  line-height: 1;

  .t-icon {
    font-size: 16px;
  }

  &.action-secondary {
    background: transparent;
    color: $text-secondary;
    border: 1px solid $border-color;

    &:hover {
      border-color: var(--color-primary-light);
      color: var(--color-primary);
      background: var(--color-primary-bg);
    }
  }

  &.action-primary {
    background: var(--color-primary);
    color: #fff;

    &:hover {
      opacity: 0.9;
    }
  }
}

.tl-compare-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  background: $color-info-bg;
  color: $color-info;
  font-size: 10px;
  font-weight: $font-weight-bold;
  border-radius: $radius-pill;
  letter-spacing: 0.03em;
}

.tl-changes-list {
  margin-top: var(--space-1-5);
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tl-change-item {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  font-size: $font-size-caption;
  line-height: 1.5;

  .change-label {
    color: $text-tertiary;
    flex-shrink: 0;
  }

  .change-values {
    color: var(--color-primary);
    font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
    font-size: 11px;
  }
}

.change-more {
  font-size: 10px;
  color: $text-placeholder;
  margin-top: 2px;
}

.tl-card-actions {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-1-5);
  opacity: 0;
  transition: opacity $transition-fast;

  .tl-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border: 1px solid $border-color-light;
    border-radius: $radius-md;
    background: transparent;
    color: $text-tertiary;
    cursor: pointer;
    transition: all $transition-fast;
    font-size: 14px;

    &:hover {
      color: var(--color-primary);
      border-color: var(--color-primary-light);
      background: var(--color-primary-bg);
    }
  }
}

.timeline-item:hover .tl-card-actions {
  opacity: 1;
}

.sn-changes-detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: $font-size-body-sm !important;
}

.sn-change-row {
  display: block;
  line-height: 1.5;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-16) 24px;

  .empty-icon {
    color: $text-placeholder;
    margin-bottom: 12px;
  }

  .empty-text {
    margin: 0 0 16px;
    font-size: $font-size-body;
    color: $text-tertiary;
  }

  .empty-hint {
    margin: -8px 0 16px;
    font-size: $font-size-caption;
    color: $text-placeholder;
  }
}

.timeline {
  padding: 16px 20px 20px;
}

.timeline-item {
  display: flex;
  gap: var(--space-3-5);
  cursor: pointer;
  transition: opacity $transition-fast;

  &.active .tl-card {
    border-color: var(--color-primary);
    background: var(--color-primary-bg);
    box-shadow: 0 0 0 1px var(--color-primary-light);
  }

  &.item-current .tl-card {
    .tl-version-badge {
      color: var(--color-primary);
    }
  }
}

.timeline-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 20px;
  flex-shrink: 0;

  .tl-dot {
    width: 12px;
    height: 12px;
    border-radius: $radius-circle;
    background: $border-color;
    margin-top: var(--space-3-5);
    flex-shrink: 0;
    z-index: 1;
    position: relative;
    transition: all $transition-fast;

    &.dot-current {
      background: var(--color-primary);
      box-shadow: 0 0 0 4px var(--overlay-brand-15);
    }
  }

  .dot-pulse {
    position: absolute;
    inset: -4px;
    border-radius: $radius-circle;
    border: 2px solid var(--color-primary);
    animation: pulseRing 2s ease-out infinite;
  }

  .tl-line {
    width: 2px;
    flex: 1;
    min-height: 20px;
    background: linear-gradient(to bottom, $border-color, transparent);
  }
}

.tl-card {
  flex: 1;
  background: $bg-container;
  border: 1px solid $border-color-light;
  border-radius: $radius-xl;
  padding: var(--space-3-5) 16px;
  margin-bottom: var(--space-3-5);
  transition: all $transition-smooth;

  &:hover {
    border-color: var(--color-primary-lighter);
    box-shadow: $shadow-elevation-1;
  }
}

.tl-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.tl-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tl-version-badge {
  font-size: $font-size-h4;
  font-weight: $font-weight-bold;
  color: var(--color-primary);
  font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
  line-height: 1.2;
}

.tl-current-tag {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 10px;
  font-weight: $font-weight-bold;
  border-radius: $radius-pill;
  letter-spacing: 0.03em;
}

.tl-date {
  font-size: $font-size-caption;
  color: $text-tertiary;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: var(--space-1);
}

.tl-meta {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  margin-top: 6px;
}

.tl-operator {
  font-size: $font-size-caption;
  color: $text-secondary;
}

.tl-role-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: $radius-xs;
  font-weight: $font-weight-semibold;

  &.role-admin {
    background: $color-warning-bg;
    color: $color-warning;
  }

  &.role-formulist {
    background: $color-info-bg;
    color: $color-info;
  }
}

.tl-reason {
  margin: var(--space-1-5) 0 0;
  font-size: $font-size-body-sm;
  color: $text-regular;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

.detail-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) 24px;
  text-align: center;

  .detail-empty-visual {
    color: $text-placeholder;
    margin-bottom: 16px;
  }

  .detail-empty-text {
    margin: 0;
    font-size: $font-size-body;
    color: $text-tertiary;
    line-height: 1.7;
  }
}

.detail-panel {
  padding: 24px;
}

.detail-identity {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid $border-color-light;

  .identity-main {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 8px;
  }

  .identity-version {
    font-size: 28px;
    font-weight: $font-weight-bold;
    color: $text-primary;
    font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
    line-height: 1.2;
  }

  .identity-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    flex-wrap: wrap;
  }

  .identity-current {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2-5);
    background: var(--overlay-brand-08);
    color: var(--color-primary);
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    border-radius: $radius-pill;
  }

  .identity-time {
    font-size: $font-size-caption;
    color: $text-tertiary;
    margin-left: auto;
  }
}

.detail-card {
  margin-bottom: 20px;

  .detail-card-title {
    margin: 0 0 12px;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.snapshot-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.snapshot-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  padding: 12px var(--space-3-5);
  background: var(--overlay-brand-05);
  border-radius: $radius-md;
  position: relative;

  .sn-field-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 14px;
    color: var(--color-primary-light);
    opacity: 0.5;
  }

  .sn-field-label {
    font-size: $font-size-micro;
    font-weight: $font-weight-semibold;
    color: $text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .sn-field-value {
    font-size: $font-size-h4;
    font-weight: $font-weight-semibold;
    color: $text-primary;
  }
}

.nutrition-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 10px;
}

.nutrition-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: $color-success-bg;
  border-radius: $radius-md;

  .nutrition-label {
    font-size: $font-size-micro;
    font-weight: $font-weight-semibold;
    color: $text-tertiary;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .nutrition-value {
    font-size: $font-size-body;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    font-family: ui-monospace, SFMono-Regular, "Cascadia Code", monospace;
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

@keyframes pulseRing {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }

  50% {
    transform: scale(1.6);
    opacity: 0;
  }

  100% {
    transform: scale(1.6);
    opacity: 0;
  }
}
</style>
