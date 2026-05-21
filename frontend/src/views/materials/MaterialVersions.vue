<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { MessagePlugin } from "tdesign-vue-next";
import { materialApi } from "@/api/material";
import type { MaterialVersion } from "@/api/material";
import { formatTimestamp } from "@/utils/timeFormat";

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

onMounted(async () => {
  loading.value = true;
  try {
    const res = await materialApi.getVersions(materialId);
    materialName.value = res.materialName;
    materialCode.value = res.materialCode;
    currentVersion.value = res.currentVersion;
    versions.value = res.versions;
  } catch (error: any) {
    MessagePlugin.error("获取版本历史失败");
    router.back();
  } finally {
    loading.value = false;
  }
});

async function viewVersion(versionId: string) {
  detailLoading.value = true;
  selectedVersionId.value = versionId;
  try {
    versionDetail.value = await materialApi.getVersionDetail(materialId, versionId);
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

function goBack() {
  router.push({ name: "MaterialList" });
}

function goToDetail() {
  router.push({ name: "MaterialDetail", params: { id: materialId } });
}

function formatChanges(version: MaterialVersion): string {
  if (version.changesSummary && version.changesSummary !== `版本 v${version.version}`) {
    return version.changesSummary;
  }
  return version.version === 1 ? "初始创建" : `版本 v${version.version} 更新`;
}
</script>

<template>
  <div class="version-history-page">
    <div class="page-header">
      <t-button variant="text" @click="goBack">
        <template #icon><t-icon name="arrow-left" /></template>
        返回原料列表
      </t-button>
    </div>

    <div class="material-info-card">
      <div class="material-info-header">
        <div class="material-title">
          <span class="material-name">{{ materialName }}</span>
          <span class="material-code">({{ materialCode }})</span>
          <t-tag theme="primary" variant="light" size="small">v{{ currentVersion }}</t-tag>
        </div>
        <t-button variant="outline" size="small" @click="goToDetail">
          查看原料详情
        </t-button>
      </div>
    </div>

    <div class="content-layout" v-if="!loading">
      <div class="version-list-section">
        <h3 class="section-title">版本时间线</h3>
        <div v-if="versions.length === 0" class="empty-state">
          <t-empty description="此原料尚无版本变更历史" />
        </div>
        <div v-else class="timeline">
          <div
            v-for="(ver, index) in versions"
            :key="ver.id"
            class="timeline-item"
            :class="{ active: selectedVersionId === ver.id, latest: ver.isLatest }"
          >
            <div class="timeline-dot">
              <div class="dot" :class="{ 'dot-active': ver.isLatest }"></div>
              <div v-if="index < versions.length - 1" class="timeline-line"></div>
            </div>
            <div class="timeline-content" @click="viewVersion(ver.id)">
              <div class="timeline-header">
                <span class="version-badge">v{{ ver.version }}</span>
                <t-tag v-if="ver.isLatest" theme="success" variant="light" size="small">最新</t-tag>
                <span class="timeline-time">{{ formatTimestamp(ver.createdAt) }}</span>
              </div>
              <div class="timeline-meta">
                <span class="operator">{{ ver.createdByName }}</span>
                <span class="role-tag" :class="ver.createdByRole === 'admin' ? 'role-admin' : 'role-formulist'">
                  {{ ver.createdByRole === "admin" ? "管理员" : "配方师" }}
                </span>
              </div>
              <div class="timeline-summary">{{ formatChanges(ver) }}</div>
              <t-button variant="text" size="small" class="view-detail-btn">查看此版本详情</t-button>
            </div>
          </div>
        </div>
      </div>

      <div class="version-detail-section">
        <h3 class="section-title">版本详情</h3>
        <div v-if="!versionDetail" class="detail-placeholder">
          <t-icon name="bulletpoint" size="48px" />
          <p>点击左侧版本查看详情</p>
        </div>
        <div v-else class="detail-content">
          <div class="detail-header">
            <t-tag theme="primary">v{{ versionDetail.version }}</t-tag>
            <span class="detail-status" v-if="versionDetail.isLatest">当前最新版本</span>
            <t-button variant="text" size="small" @click="closeDetail">关闭</t-button>
          </div>
          <div class="detail-body">
            <div class="detail-section">
              <h4>基本信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">原料名称</span>
                  <span class="value">{{ versionDetail.name }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">原料编码</span>
                  <span class="value">{{ versionDetail.code }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">类型</span>
                  <span class="value">{{ versionDetail.materialType === "herb" ? "药材" : "辅料" }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">单位</span>
                  <span class="value">{{ versionDetail.unit }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">库存</span>
                  <span class="value">{{ versionDetail.stock ?? "--" }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">单价</span>
                  <span class="value">{{ versionDetail.unitPrice != null ? `¥${Number(versionDetail.unitPrice).toFixed(2)}` : "暂未录入" }}</span>
                </div>
              </div>
            </div>
            <div v-if="versionDetail.nutrition" class="detail-section">
              <h4>营养成分（每100g）</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">蛋白质</span>
                  <span class="value">{{ versionDetail.nutrition.protein ?? "--" }}g</span>
                </div>
                <div class="detail-item">
                  <span class="label">脂肪</span>
                  <span class="value">{{ versionDetail.nutrition.fat ?? "--" }}g</span>
                </div>
                <div class="detail-item">
                  <span class="label">碳水化合物</span>
                  <span class="value">{{ versionDetail.nutrition.carbohydrate ?? "--" }}g</span>
                </div>
                <div class="detail-item">
                  <span class="label">钠</span>
                  <span class="value">{{ versionDetail.nutrition.sodium ?? "--" }}g</span>
                </div>
                <div class="detail-item">
                  <span class="label">热量</span>
                  <span class="value">{{ versionDetail.nutrition.calories ?? "--" }}kcal</span>
                </div>
                <div class="detail-item">
                  <span class="label">膳食纤维</span>
                  <span class="value">{{ versionDetail.nutrition.dietaryFiber ?? "--" }}g</span>
                </div>
              </div>
            </div>
            <div class="detail-section">
              <h4>版本信息</h4>
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="label">版本号</span>
                  <span class="value">v{{ versionDetail.version }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">创建人</span>
                  <span class="value">{{ versionDetail.createdByName || versionDetail.createdBy }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">创建时间</span>
                  <span class="value">{{ formatTimestamp(versionDetail.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.version-history-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 16px;
}

.material-info-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.material-info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.material-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.material-name {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a2e;
}

.material-code {
  font-size: 14px;
  color: #666;
}

.content-layout {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.version-list-section {
  flex: 1;
  min-width: 360px;
  max-width: 480px;
}

.version-detail-section {
  flex: 1.2;
  min-width: 360px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #1a1a2e;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.timeline {
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 16px;
  cursor: pointer;
  position: relative;

  &.active .timeline-content {
    border-color: #2d8cf0;
    background: #f0f8ff;
  }

  &.latest .dot {
    background: #52c41a;
    box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.2);
  }
}

.timeline-dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 20px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #d9d9d9;
  margin-top: 6px;
  flex-shrink: 0;
  z-index: 1;

  &.dot-active {
    background: #52c41a;
    box-shadow: 0 0 0 3px rgba(82, 196, 26, 0.2);
  }
}

.timeline-line {
  width: 2px;
  flex: 1;
  background: #e8e8e8;
  min-height: 24px;
}

.timeline-content {
  flex: 1;
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  transition: all 0.2s;

  &:hover {
    border-color: #2d8cf0;
    box-shadow: 0 2px 8px rgba(45, 140, 240, 0.1);
  }
}

.timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.version-badge {
  font-size: 16px;
  font-weight: 600;
  color: #2d8cf0;
}

.timeline-time {
  font-size: 12px;
  color: #999;
  margin-left: auto;
}

.timeline-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.operator {
  font-size: 13px;
  color: #555;
}

.role-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;

  &.role-admin {
    background: #fff1f0;
    color: #e8422f;
  }

  &.role-formulist {
    background: #f0f5ff;
    color: #2d8cf0;
  }
}

.timeline-summary {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
}

.view-detail-btn {
  padding: 0;
}

.detail-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #bbb;
  gap: 12px;

  p {
    font-size: 14px;
    margin: 0;
  }
}

.detail-content {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafafa;
}

.detail-status {
  font-size: 13px;
  color: #52c41a;
  font-weight: 500;
}

.detail-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 24px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f0f0;
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .label {
    font-size: 12px;
    color: #999;
  }

  .value {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }
}
</style>