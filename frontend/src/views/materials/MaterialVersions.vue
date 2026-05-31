<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { materialApi } from "@/api/material";
import type { Material, MaterialVersion } from "@/api/material";
import { useAuthStore } from "@/stores/auth";
import { formatTimestamp, splitDateTime } from "@/utils/timeFormat";
import PageSkeleton from "@/components/Skeleton/PageSkeleton.vue";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const materialId = route.params.id as string;

const isAdmin = computed(() => authStore.user?.role === "admin");

const loading = ref(true);
const initialized = ref(false);
const versionDetail = ref<Material | null>(null);
const detailLoading = ref(false);
const versions = ref<MaterialVersion[]>([]);
const materialName = ref("");
const materialCode = ref("");
const currentVersion = ref(0);
const selectedVersionId = ref<string | null>(null);
const selectedForCompare = ref<string[]>([]);
const searchKeyword = ref("");
const filterType = ref<"all" | "latest" | "history">("all");
const statusFilter = ref<string>("");
const materialStatus = ref<string>("draft");
const submitLoading = ref(false);

const statusOptions = [
  { value: "", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "pending_review", label: "待审批" },
  { value: "published", label: "已发布" },
];

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
  if (statusFilter.value) {
    result = result.filter((v) => getVersionStatus(v) === statusFilter.value);
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

const statusLabel = (s: string) =>
  s === 'published' ? '已发布' : s === 'pending_review' ? '待审批' : s === 'draft' ? '草稿' : '已归档';

function getVersionStatus(ver: MaterialVersion | null): string {
  if (!ver || ver.isLatest) return materialStatus.value;
  return "published";
}

const stored = localStorage.getItem('compare_versions');
if (stored) {
  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) selectedForCompare.value = parsed;
  } catch { /* ignore */ }
}

onMounted(async () => {
  loading.value = true;
  try {
    const [res, detail] = await Promise.all([
      materialApi.getVersions(materialId),
      materialApi.getById(materialId).catch(() => null),
    ]);
    materialName.value = res.materialName;
    materialCode.value = res.materialCode;
    currentVersion.value = res.currentVersion;
    versions.value = res.versions;
    if (detail) materialStatus.value = detail.status;
  } catch {
    MessagePlugin.error("获取版本历史失败");
    router.back();
  } finally {
    loading.value = false;
    initialized.value = true;
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



function goToCompare() {
  if (selectedForCompare.value.length >= 2) {
    const query: Record<string, string> = {
      v1: selectedForCompare.value[0],
      v2: selectedForCompare.value[1],
    };
    if (selectedForCompare.value[2]) {
      query.v3 = selectedForCompare.value[2];
    }
    router.push({
      name: "MaterialVersionCompare",
      params: { id: materialId },
      query,
    });
  } else if (versions.value.length >= 2) {
    router.push({ name: "MaterialVersionCompare", params: { id: materialId } });
  } else {
    MessagePlugin.warning("至少需要两个版本才能对比");
  }
}

function toggleSelect(id: string) {
  const idx = selectedForCompare.value.indexOf(id);
  if (idx >= 0) {
    selectedForCompare.value.splice(idx, 1);
  } else {
    if (selectedForCompare.value.length >= 3) {
      MessagePlugin.warning("最多选择 3 个版本进行对比");
      return;
    }
    selectedForCompare.value.push(id);
  }
  localStorage.setItem('compare_versions', JSON.stringify(selectedForCompare.value));
}

function clearCompareSelection() {
  selectedForCompare.value = [];
  localStorage.removeItem('compare_versions');
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

function formatChangeValue(val: unknown): string {
  if (val == null) return "--";
  if (typeof val === "number") {
    return Number.isInteger(val) ? String(val) : val.toFixed(2);
  }
  return String(val);
}

async function handleSubmitReview() {
  submitLoading.value = true;
  try {
    await materialApi.submitReview(materialId);
    MessagePlugin.success("原料已提交审批");
    materialStatus.value = "pending_review";
  } catch {
    MessagePlugin.error("提交审批失败");
  } finally {
    submitLoading.value = false;
  }
}

async function handleApprove() {
  try {
    await materialApi.approve(materialId);
    MessagePlugin.success("原料审批通过，已发布");
    materialStatus.value = "published";
    const detail = await materialApi.getById(materialId).catch(() => null);
    if (detail) materialStatus.value = detail.status;
  } catch {
    MessagePlugin.error("审批失败");
  }
}

const rejectDialogVisible = ref(false);
const rejectComment = ref("");

function handleReject() {
  rejectComment.value = "";
  rejectDialogVisible.value = true;
}

async function confirmReject() {
  if (!rejectComment.value.trim()) {
    MessagePlugin.warning("请填写驳回原因");
    return;
  }
  try {
    await materialApi.reject(materialId, rejectComment.value.trim());
    rejectDialogVisible.value = false;
    MessagePlugin.success("已驳回，原料已退回草稿状态");
    materialStatus.value = "draft";
    const detail = await materialApi.getById(materialId).catch(() => null);
    if (detail) materialStatus.value = detail.status;
  } catch {
    MessagePlugin.error("驳回失败");
  }
}
</script>

<template>
  <div class="version-list" :aria-busy="!initialized">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="7" />
    <template v-else>
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
          <div class="status-filter-group">
            <button v-for="opt in statusOptions" :key="opt.value" class="status-filter-btn"
              :class="{ active: statusFilter === opt.value }" @click="statusFilter = opt.value">{{
                opt.label }}</button>
          </div>
        </div>
      </header>
      <div class="content-layout">
        <!-- 版本时间线 -->
        <div class="timeline-section">
          <div class="section-head">
            <div class="section-head-left">
              <h3 class="section-title">版本时间线</h3>
              <span class="section-count">{{ filteredVersions.length }}</span>
            </div>
            <div class="section-head-right">
              <button class="section-compare-btn" :class="{ 'has-selection': selectedForCompare.length >= 2 }"
                :disabled="selectedForCompare.length < 2" @click="goToCompare">
                <t-icon name="swap" size="14px" />
                <span>版本对比</span>
                <span v-if="selectedForCompare.length" class="compare-badge">{{ selectedForCompare.length }}</span>
              </button>
              <button v-if="selectedForCompare.length" class="clear-compare-btn"
                @click="clearCompareSelection">清除选择</button>
            </div>
          </div>
          <div class="section-toolbar">
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
                    <span class="tl-status-chip" :class="'chip-' + getVersionStatus(ver)">{{
                      statusLabel(getVersionStatus(ver))
                    }}</span>
                  </div>
                  <span class="tl-date">{{
                    splitDateTime(ver.createdAt).date
                  }}</span>
                </div>

                <div v-if="ver.changesDetail && ver.changesDetail.length > 0" class="tl-changes">
                  <span v-for="(change, ci) in ver.changesDetail.slice(0, 4)" :key="ci" class="tl-change-chip"
                    :class="'chip-modify'">
                    <t-icon name="edit" size="12px" />
                    {{ change.label }}
                  </span>
                  <span v-if="ver.changesDetail.length > 4" class="tl-change-more">+{{ ver.changesDetail.length - 4
                  }}</span>
                </div>
                <p v-else class="tl-reason">{{ formatChanges(ver) }}</p>

                <div class="tl-card-footer">
                  <label class="tl-compare-label" @click.stop>
                    <input type="checkbox" class="tl-checkbox" :checked="selectedForCompare.includes(ver.id)"
                      @change="toggleSelect(ver.id)" />
                    <span class="tl-checkbox-text">加入对比</span>
                  </label>
                  <template v-if="ver.isLatest">
                    <t-popconfirm v-if="materialStatus === 'draft'" content="确定要提交审批吗？提交后需等待管理员审核。"
                      @confirm="handleSubmitReview">
                      <button class="tl-publish-btn" @click.stop :disabled="submitLoading">
                        <t-icon name="send" size="12px" />
                        提交审批
                      </button>
                    </t-popconfirm>
                    <template v-else-if="materialStatus === 'pending_review' && isAdmin">
                      <div class="tl-card-actions">
                        <t-popconfirm content="确定要批准该原料吗？批准后将发布该原料。" @confirm="handleApprove">
                          <button class="tl-publish-btn" @click.stop>
                            <t-icon name="check" size="12px" />
                            批准
                          </button>
                        </t-popconfirm>
                        <button class="tl-reject-btn" @click.stop="handleReject">
                          <t-icon name="close" size="12px" />
                          驳回
                        </button>
                      </div>
                    </template>
                    <span v-else-if="materialStatus === 'pending_review' && !isAdmin" class="tl-status-hint">
                      <t-icon name="time" size="12px" />
                      审批中
                    </span>
                    <span v-else-if="materialStatus === 'published'" class="tl-status-hint tl-status-published">
                      <t-icon name="check-circle" size="12px" />
                      已发布
                    </span>
                  </template>
                  <span v-else class="tl-status-hint tl-status-published">
                    <t-icon name="check-circle" size="12px" />
                    已发布
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <!-- 版本详情 -->
        <div class="detail-section">
          <!-- 版本快照 -->
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
          <div v-else class="detail-panel">
            <!-- 版本身份 -->
            <div class="detail-identity">
              <div class="identity-main">
                <span class="identity-version">v{{ selectedVersion.version }}</span>
              </div>
              <div class="identity-meta">
                <span class="identity-status" :class="'st-' + getVersionStatus(selectedVersion)">{{
                  statusLabel(getVersionStatus(selectedVersion)) }}</span>
                <span v-if="selectedVersion.isLatest" class="identity-current">当前版本</span>
                <span class="identity-time">{{ splitDateTime(selectedVersion.createdAt).date }}
                  {{ splitDateTime(selectedVersion.createdAt).time }}</span>
              </div>
            </div>
            <!-- 基本信息 -->
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
            <!-- 营养成分 -->
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
            <!-- 操作按钮 -->
            <div class="detail-actions">
              <t-popconfirm v-if="materialStatus === 'draft' && isAdmin && selectedVersion?.isLatest"
                content="确定要直接发布该原料吗？批准后将发布该原料。" @confirm="handleApprove">
                <button class="action-btn action-publish">
                  <t-icon name="send" /> 直接发布
                </button>
              </t-popconfirm>
              <t-popconfirm v-if="materialStatus === 'draft' && !isAdmin && selectedVersion?.isLatest"
                content="确定要提交审批吗？提交后需等待管理员审核。" @confirm="handleSubmitReview">
                <button class="action-btn action-submit" :disabled="submitLoading">
                  <t-icon name="send" /> 提交审批
                </button>
              </t-popconfirm>
              <template v-if="materialStatus === 'pending_review' && selectedVersion?.isLatest && isAdmin">
                <t-popconfirm content="确定要批准该原料吗？批准后将发布该原料。" @confirm="handleApprove">
                  <button class="action-btn action-publish">
                    <t-icon name="check" /> 批准发布
                  </button>
                </t-popconfirm>
                <button class="action-btn action-reject" @click="handleReject">
                  <t-icon name="close" /> 驳回
                </button>
              </template>
              <span v-if="materialStatus === 'pending_review' && selectedVersion?.isLatest && !isAdmin"
                class="pending-hint">
                <t-icon name="time" /> 等待管理员审核中…
              </span>
              <button class="action-btn action-secondary" @click="goToCompare">
                <t-icon name="swap" /> 对比版本
              </button>
            </div>
          </div>
        </div>
      </div>

      <t-dialog v-model:visible="rejectDialogVisible" header="驳回版本" :confirm-btn="{ content: '确认驳回', theme: 'danger' }"
        @confirm="confirmReject" :class="'version-create-dialog'">
        <div class="create-form">
          <label class="create-label">驳回原因 <span class="required">*</span></label>
          <textarea v-model="rejectComment" class="create-textarea" placeholder="请说明驳回原因，便于修改者了解问题" rows="3"></textarea>
        </div>
      </t-dialog>
    </template>
  </div>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.version-list {
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
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 84px;
  height: calc(100vh - 84px - 16px);
  overflow: hidden;

  .section-head,
  .section-toolbar {
    flex-shrink: 0;
  }

  .timeline,
  .empty-state {
    flex: 1;
    min-height: 0;
    overflow-y: auto;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: $border-color;
      border-radius: 4px;
    }
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
  padding: 20px 24px 16px;
  border-bottom: 1px solid $border-color-light;

  .section-head-left {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
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

  .section-compare-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border: 1px solid $border-color;
    border-radius: $radius-pill;
    background: transparent;
    color: $text-tertiary;
    font-size: $font-size-caption;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      border-color: var(--color-primary-light);
      color: var(--color-primary);
      background: var(--color-primary-bg);
    }

    &.has-selection {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-bg);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .compare-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      background: var(--color-primary);
      color: var(--color-text-white);
      font-size: 10px;
      font-weight: $font-weight-bold;
      border-radius: $radius-pill;
      line-height: 1;
    }
  }

  .clear-compare-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border: none;
    border-radius: $radius-pill;
    background: $color-danger-light;
    color: $color-danger;
    font-size: $font-size-caption;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $color-danger-medium;
    }
  }
}

.section-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 24px 12px;

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
      background: var(--color-bg-container);
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
  margin-left: -32px;
  margin-right: -32px;
  padding: 8px 32px;
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

    .status-filter-group {
      display: flex;
      gap: var(--space-0-5);
      padding: var(--space-1);
      background: var(--color-primary-bg);
      border-radius: $radius-lg;
    }

    .status-filter-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-1-5) var(--space-3-5);
      border: none;
      border-radius: 8px;
      background: transparent;
      color: $text-tertiary;
      font-size: $font-size-caption;
      font-weight: $font-weight-medium;
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;

      &.active {
        background: $bg-container;
        color: var(--color-primary);
        font-weight: $font-weight-semibold;
        box-shadow: $shadow-xs;
      }

      &:hover:not(.active) {
        color: $text-regular;
      }
    }
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

  &.action-publish {
    background: var(--gradient-btn);
    color: $text-white;
    box-shadow: var(--shadow-brand-sm);

    &:hover {
      box-shadow: var(--shadow-brand-md);
      transform: translateY(-1px);
    }
  }

  &.action-submit {
    background: linear-gradient(135deg, var(--color-info) 0%, var(--color-info-dark) 100%);
    color: $text-white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);

    &:hover:not(:disabled) {
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &.action-reject {
    background: transparent;
    color: $color-danger;
    border: 1px solid $color-danger;

    &:hover {
      background: $color-danger-bg;
    }
  }
}

.tl-compare-label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  cursor: pointer;
  user-select: none;

  .tl-checkbox {
    appearance: none;
    width: 16px;
    height: 16px;
    border: 1.5px solid $border-color;
    border-radius: 4px;
    cursor: pointer;
    position: relative;
    transition: all $transition-fast;
    flex-shrink: 0;

    &:checked {
      background: var(--color-primary);
      border-color: var(--color-primary);

      &::after {
        content: "";
        position: absolute;
        top: 1px;
        left: 4px;
        width: 4px;
        height: 8px;
        border: solid $text-white;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }

    &:hover:not(:checked) {
      border-color: var(--color-primary-lighter);
    }
  }

  .tl-checkbox-text {
    font-size: $font-size-caption;
    color: $text-tertiary;
    transition: color $transition-fast;
  }

  &:hover .tl-checkbox-text {
    color: $text-secondary;
  }
}

.tl-card-footer {
  margin-top: var(--space-2-5);
  padding-top: 8px;
  border-top: 1px solid $border-color-light;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tl-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tl-publish-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border: 1px solid var(--color-primary-lighter);
  border-radius: $radius-pill;
  background: var(--color-primary-bg);
  color: var(--color-primary);
  font-size: 11px;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: var(--color-primary);
    color: $text-white;
    border-color: var(--color-primary);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.tl-reject-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border: 1px solid $color-danger;
  border-radius: $radius-pill;
  background: transparent;
  color: $color-danger;
  font-size: 11px;
  font-weight: $font-weight-medium;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $color-danger-bg;
  }
}

.tl-status-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: $radius-pill;
  font-size: 11px;
  font-weight: $font-weight-medium;
  color: $text-tertiary;
  background: $bg-cool-gray;

  &.tl-status-published {
    color: $color-success;
    background: $color-success-bg;
  }
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid $border-color-light;

  .pending-hint {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px var(--space-4);
    background: $color-info-bg;
    color: $color-info;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-medium;
    border-radius: $radius-lg;

    .t-icon {
      animation: spin 2s linear infinite;
    }
  }
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

.tl-status-chip {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  font-size: 10px;
  font-weight: $font-weight-semibold;
  border-radius: $radius-pill;
  letter-spacing: 0.03em;

  &.chip-draft {
    background: $color-warning-bg;
    color: $color-warning;
  }

  &.chip-pending_review {
    background: $color-info-bg;
    color: $color-info;
  }

  &.chip-published {
    background: $color-success-bg;
    color: $color-success;
  }

  &.chip-archived {
    background: $bg-cool-gray;
    color: $text-tertiary;
  }
}

.tl-date {
  font-size: $font-size-caption;
  color: $text-tertiary;
  white-space: nowrap;
  flex-shrink: 0;
  margin-top: var(--space-1);
}

.tl-changes {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.tl-change-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-0-5) 8px;
  font-size: 10px;
  font-weight: $font-weight-medium;
  border-radius: $radius-pill;
  line-height: 1.4;

  &.chip-add {
    background: $color-success-bg;
    color: $color-success;
  }

  &.chip-delete {
    background: $color-danger-bg;
    color: $color-danger;
  }

  &.chip-modify {
    background: $color-info-bg;
    color: $color-info;
  }
}

.tl-change-more {
  display: inline-flex;
  align-items: center;
  padding: var(--space-0-5) 8px;
  font-size: 10px;
  font-weight: $font-weight-medium;
  color: $text-tertiary;
  background: $bg-cool-gray;
  border-radius: $radius-pill;
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

  .identity-status {
    display: inline-flex;
    align-items: center;
    padding: var(--space-1) var(--space-2-5);
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    border-radius: $radius-pill;

    &.st-draft {
      background: $color-warning-bg;
      color: $color-warning;
    }

    &.st-pending_review {
      background: $color-info-bg;
      color: $color-info;
    }

    &.st-published {
      background: $color-success-bg;
      color: $color-success;
    }

    &.st-archived {
      background: $bg-cool-gray;
      color: $text-tertiary;
    }
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

.create-form {
  .create-label {
    display: block;
    margin-bottom: 8px;
    font-size: $font-size-body-sm;
    font-weight: $font-weight-medium;
    color: $text-primary;

    .required {
      color: $color-danger;
    }
  }

  .create-textarea {
    display: block;
    width: 100%;
    padding: var(--space-2-5) 12px;
    border: 1px solid $border-color;
    border-radius: $radius-md;
    font-size: $font-size-body-sm;
    font-family: inherit;
    color: $text-primary;
    background: $bg-container;
    resize: vertical;
    transition: border-color $transition-fast;
    outline: none;
    box-sizing: border-box;

    &::placeholder {
      color: $text-placeholder;
    }

    &:focus {
      border-color: var(--color-primary-light);
      box-shadow: 0 0 0 2px var(--overlay-brand-10);
    }
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

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>

<style lang="scss">
.t-dialog.version-create-dialog {
  .t-dialog__footer .t-btn--theme-primary {
    background: linear-gradient(135deg, var(--color-emerald-400) 0%, var(--color-emerald) 100%) !important;
    border: none;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

    &:hover {
      background: linear-gradient(135deg, var(--color-emerald-400) 0%, var(--color-emerald-400) 100%) !important;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35);
    }
  }
}
</style>
