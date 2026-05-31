<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { MessagePlugin } from 'tdesign-vue-next';
import { parseResultApi } from '@/api/parseResult';
import { ratioThresholdApi } from '@/api/ratioThreshold';
import type { RatioThresholdConfig } from '@/api/ratioThreshold';
import { useAuthStore } from '@/stores/auth';
import EnumManage from '@/views/system/EnumManage.vue';
import ExportCenter from '@/views/system/ExportCenter.vue';
import PermissionManage from '@/views/system/PermissionManage.vue';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');
const route = useRoute();

interface ConfigData {
  storageLimit: number;
  cleanupThresholdPercent: number;
  cleanupBatchPercent: number;
  maxFileSizeBytes: number;
  fileRetentionDays: number;
  fileStorageLimitBytes: number;
  fileStorageAlertPercent: number;
}

interface DegradationInfo {
  level: 'normal' | 'degraded' | '熔断';
  reason: string;
  recommendations: string[];
  systemStatus: {
    totalCount: number;
    storageLimit: number;
    usagePercent: number;
    cleanupThreshold: number;
    isOverThreshold: boolean;
  };
  lastCleanup: {
    deletedCount: number;
    triggerReason: string;
    degradationLevel: string;
  } | null;
}

const loading = ref(false);
const activeTab = ref('cache');
const navCollapsed = ref(false);

const configData = ref<ConfigData>({
  storageLimit: 5000,
  cleanupThresholdPercent: 95,
  cleanupBatchPercent: 5,
  maxFileSizeBytes: 5242880,
  fileRetentionDays: 90,
  fileStorageLimitBytes: 10737418240,
  fileStorageAlertPercent: 80,
});
const configForm = ref<ConfigData>({ ...configData.value });
const isEditing = ref(false);

const degradationInfo = ref<DegradationInfo | null>(null);
const cleanupLoading = ref(false);

// ─── 左侧导航（对齐 ModelManagement mm-nav） ───
const tabs = computed(() => {
  const base: Array<{ value: string; label: string; iconPath: string; }> = [
    {
      value: 'cache',
      label: '缓存配置',
      iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    },
    {
      value: 'ratio',
      label: '含量比配置',
      iconPath: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
    },
    {
      value: 'enum-manage',
      label: '原料枚举值',
      iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    },
    {
      value: 'export-center',
      label: '导出中心',
      iconPath: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    },
  ];
  if (isAdmin.value) {
    base.push({
      value: 'permission-manage',
      label: '权限管理',
      iconPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    });
  }
  return base;
});

const ratioThresholds = ref<RatioThresholdConfig>({
  normalLow: 0.98,
  normalHigh: 1.02,
  warningLow: 0.95,
  warningHigh: 1.05,
  highWarningLow: 0.92,
  highWarningHigh: 1.08,
  updatedAt: null,
  updatedBy: null,
});
const ratioForm = ref<RatioThresholdConfig>({ ...ratioThresholds.value });
const ratioEditing = ref(false);
const ratioSaving = ref(false);



async function fetchConfig() {
  try {
    const res = await parseResultApi.getConfig();
    configData.value = {
      storageLimit: res.storageLimit ?? 5000,
      cleanupThresholdPercent: res.cleanupThresholdPercent ?? 95,
      cleanupBatchPercent: res.cleanupBatchPercent ?? 5,
      maxFileSizeBytes: res.maxFileSizeBytes ?? 5242880,
      fileRetentionDays: res.fileRetentionDays ?? 90,
      fileStorageLimitBytes: res.fileStorageLimitBytes ?? 10737418240,
      fileStorageAlertPercent: res.fileStorageAlertPercent ?? 80,
    };
    configForm.value = { ...configData.value };
  } catch (error: unknown) {
    console.error('[SystemConfig] 获取配置失败:', error);
  }
}

async function fetchDegradation() {
  try {
    const res = await parseResultApi.getDegradation();
    degradationInfo.value = {
      level: res.level,
      reason: res.reason,
      recommendations: res.recommendations,
      systemStatus: res.systemStatus,
      lastCleanup: null,
    };
  } catch (error: unknown) {
    console.error('[SystemConfig] 获取降级信息失败:', error);
  }
}

async function fetchRatioThresholds() {
  try {
    const res = await ratioThresholdApi.get();
    ratioThresholds.value = res;
    ratioForm.value = { ...res };
  } catch (error: unknown) {
    console.error('[SystemConfig] 获取含量比阈值失败:', error);
  }
}

const ratioHasChanged = computed(() =>
  ratioForm.value.normalLow !== ratioThresholds.value.normalLow ||
  ratioForm.value.normalHigh !== ratioThresholds.value.normalHigh ||
  ratioForm.value.warningLow !== ratioThresholds.value.warningLow ||
  ratioForm.value.warningHigh !== ratioThresholds.value.warningHigh ||
  ratioForm.value.highWarningLow !== ratioThresholds.value.highWarningLow ||
  ratioForm.value.highWarningHigh !== ratioThresholds.value.highWarningHigh
);

function startRatioEdit() {
  ratioForm.value = { ...ratioThresholds.value };
  ratioEditing.value = true;
}

function cancelRatioEdit() {
  ratioForm.value = { ...ratioThresholds.value };
  ratioEditing.value = false;
}

async function saveRatioThresholds() {
  if (!isAdmin.value) {
    MessagePlugin.error('无权修改配置');
    return;
  }
  try {
    ratioSaving.value = true;
    const res = await ratioThresholdApi.update({
      normalLow: ratioForm.value.normalLow,
      normalHigh: ratioForm.value.normalHigh,
      warningLow: ratioForm.value.warningLow,
      warningHigh: ratioForm.value.warningHigh,
      highWarningLow: ratioForm.value.highWarningLow,
      highWarningHigh: ratioForm.value.highWarningHigh,
    });
    ratioThresholds.value = res;
    ratioEditing.value = false;
    MessagePlugin.success('含量比阈值配置更新成功');
  } catch (error: unknown) {
    const err = error as { message?: string; };
    MessagePlugin.error('含量比阈值配置更新失败: ' + (err.message || '未知错误'));
  } finally {
    ratioSaving.value = false;
  }
}

const hasConfigChanged = computed(() =>
  configForm.value.storageLimit !== configData.value.storageLimit ||
  configForm.value.cleanupThresholdPercent !== configData.value.cleanupThresholdPercent ||
  configForm.value.cleanupBatchPercent !== configData.value.cleanupBatchPercent ||
  configForm.value.maxFileSizeBytes !== configData.value.maxFileSizeBytes ||
  configForm.value.fileRetentionDays !== configData.value.fileRetentionDays ||
  configForm.value.fileStorageLimitBytes !== configData.value.fileStorageLimitBytes ||
  configForm.value.fileStorageAlertPercent !== configData.value.fileStorageAlertPercent
);

function startEdit() {
  configForm.value = { ...configData.value };
  isEditing.value = true;
}

async function saveConfig() {
  if (!isAdmin.value) {
    MessagePlugin.error('无权修改配置');
    return;
  }
  try {
    loading.value = true;
    await parseResultApi.updateConfig(configForm.value);
    configData.value = { ...configForm.value };
    isEditing.value = false;
    MessagePlugin.success('配置更新成功');
  } catch (error: unknown) {
    const err = error as { message?: string; };
    MessagePlugin.error('配置更新失败: ' + (err.message || '未知错误'));
  } finally {
    loading.value = false;
  }
}

function cancelEdit() {
  configForm.value = { ...configData.value };
  isEditing.value = false;
}

async function triggerCleanup(dryRun: boolean = false) {
  if (!isAdmin.value) {
    MessagePlugin.error('无权执行清理操作');
    return;
  }
  try {
    cleanupLoading.value = true;
    const res = await parseResultApi.manualCleanup({ dryRun });
    const msg = dryRun ? `模拟清理：将删除 ${res.deleted} 条记录` : `成功清理 ${res.deleted} 条记录`;
    MessagePlugin.success(msg);
    await fetchDegradation();
  } catch {
    MessagePlugin.error('清理操作失败');
  } finally {
    cleanupLoading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([
    fetchConfig(),
    fetchDegradation(),
    fetchRatioThresholds(),
  ]);

  const tabParam = route.query.tab as string | undefined;
  if (tabParam && tabs.value.some(t => t.value === tabParam)) {
    activeTab.value = tabParam;
  }
});
</script>

<template>
  <div class="system-config">
    <!-- 主内容卡片 -->
    <t-card class="content-card" bordered>
      <div class="data-center-toolbar">
        <div class="toolbar-left-section">
          <div class="toolbar-title-section">
            <h3 class="toolbar-title">系统管理</h3>
            <p class="toolbar-subtitle">缓存配置、含量比校验、原料枚举值与系统状态</p>
          </div>
        </div>
      </div>

      <div class="mm-body">
        <!-- 左侧竖向导航（对齐 ModelManagement） -->
        <div class="mm-nav" :class="{ 'mm-nav--collapsed': navCollapsed }">
          <button type="button" class="nav-collapse-btn" @click="navCollapsed = !navCollapsed"
            :title="navCollapsed ? '展开导航' : '折叠导航'" aria-label="切换导航折叠状态">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"
              :style="{ transform: navCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div v-for="tab in tabs" :key="tab.value" class="nav-tab" :class="{ active: activeTab === tab.value }"
            :title="navCollapsed ? tab.label : ''" role="tab" tabindex="0" @click="activeTab = tab.value"
            @keydown.enter="activeTab = tab.value">
            <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round" v-html="tab.iconPath"></svg>
            <span class="nav-tab-label">{{ tab.label }}</span>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="mm-content">
          <Transition name="content-fade" mode="out-in">
            <!-- 缓存配置 Tab -->
            <div v-if="activeTab === 'cache'" key="cache" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  <h4 class="section-title-text">解析缓存配置</h4>
                </div>
                <div class="section-actions">
                  <span v-if="isEditing" class="edit-hint">参数已修改，点击保存生效</span>
                </div>
              </div>

              <div class="config-display-grid">
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">最大存储数量</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.storageLimit" :min="100" :max="100000" :step="100"
                        placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ configData.storageLimit }} <span class="config-info-unit">条</span>
                    </template>
                  </div>
                </div>
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">清理阈值</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.cleanupThresholdPercent" :min="50" :max="99" :step="5"
                        placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ configData.cleanupThresholdPercent }}<span class="config-info-unit">%</span>
                    </template>
                  </div>
                </div>
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">每次清理比例</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.cleanupBatchPercent" :min="1" :max="20" :step="1"
                        placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ configData.cleanupBatchPercent }}<span class="config-info-unit">%</span>
                    </template>
                  </div>
                </div>
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">单文件大小上限</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.maxFileSizeBytes" :min="1048576" :max="104857600"
                        :step="1048576" placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ (configData.maxFileSizeBytes / 1024 / 1024).toFixed(1) }} <span
                        class="config-info-unit">MB</span>
                    </template>
                  </div>
                </div>
              </div>

              <t-divider />

              <!-- 文件保留策略 -->
              <div class="section-header-enhanced" style="margin-top: 8px;">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <h4 class="section-title-text">文件保留策略</h4>
                </div>
              </div>

              <div class="config-display-grid">
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">原文件保留天数</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.fileRetentionDays" :min="7" :max="365" :step="1"
                        placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ configData.fileRetentionDays }} <span class="config-info-unit">天</span>
                    </template>
                  </div>
                </div>
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">存储空间上限</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.fileStorageLimitBytes" :min="1073741824" :max="107374182400"
                        :step="1073741824" placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ (configData.fileStorageLimitBytes / 1024 / 1024 / 1024).toFixed(0) }} <span
                        class="config-info-unit">GB</span>
                    </template>
                  </div>
                </div>
                <div class="config-info-card" :class="{ 'is-editing': isEditing }">
                  <div class="config-info-label">磁盘使用率告警</div>
                  <div class="config-info-value">
                    <template v-if="isEditing">
                      <t-input-number v-model="configForm.fileStorageAlertPercent" :min="50" :max="99" :step="5"
                        placeholder="请输入" theme="column" />
                    </template>
                    <template v-else>
                      {{ configData.fileStorageAlertPercent }}<span class="config-info-unit">%</span>
                    </template>
                  </div>
                </div>
              </div>

              <div class="config-edit-bar" v-if="isAdmin">
                <button v-if="!isEditing" class="edit-config-btn" @click="startEdit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  更改参数
                </button>
                <template v-if="isEditing">
                  <button class="cancel-btn" @click="cancelEdit">取消</button>
                  <button class="save-btn" :class="{ loading: loading }" :disabled="loading || !hasConfigChanged"
                    @click="saveConfig">
                    <t-loading v-if="loading" size="14px" />
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    保存配置
                  </button>
                </template>
              </div>

              <t-divider />

              <!-- 运行状态（精简：仅保留进度条+关键指标） -->
              <div class="section-header-enhanced" style="margin-top: 8px;">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                  <h4 class="section-title-text">运行状态</h4>
                </div>
              </div>

              <div class="status-progress-bar">
                <div class="progress-track">
                  <div class="progress-fill"
                    :style="{ width: Math.min(degradationInfo?.systemStatus?.usagePercent ?? 0, 100) + '%' }" :class="{
                      'progress-fill--danger': (degradationInfo?.systemStatus?.usagePercent ?? 0) >= 95,
                      'progress-fill--warning': (degradationInfo?.systemStatus?.usagePercent ?? 0) >= 80 && (degradationInfo?.systemStatus?.usagePercent ?? 0) < 95
                    }"></div>
                  <div class="progress-threshold"
                    :style="{ left: (degradationInfo?.systemStatus?.cleanupThreshold ?? configData.cleanupThresholdPercent) + '%' }">
                    <span class="progress-threshold-label">{{ degradationInfo?.systemStatus?.cleanupThreshold ??
                      configData.cleanupThresholdPercent }}%</span>
                  </div>
                </div>
                <div class="progress-labels">
                  <span>0%</span>
                  <span>{{ degradationInfo?.systemStatus?.usagePercent ?? 0 }}% 当前</span>
                  <span>100%</span>
                </div>
              </div>

              <!-- 建议措施 -->
              <div v-if="degradationInfo?.recommendations?.length" class="recommendations-section">
                <div v-for="(rec, idx) in degradationInfo.recommendations" :key="idx" class="recommendation-item">
                  <span class="recommendation-dot"></span>
                  <span>{{ rec }}</span>
                </div>
              </div>

              <div v-if="degradationInfo?.lastCleanup" class="last-cleanup-card">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>上次清理：删除 {{ degradationInfo.lastCleanup.deletedCount }} 条记录 — {{
                  degradationInfo.lastCleanup.triggerReason }}</span>
              </div>

              <t-divider />

              <!-- 手动清理 -->
              <div class="section-header-enhanced" style="margin-top: 8px;">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  <h4 class="section-title-text">手动清理</h4>
                </div>
              </div>

              <div class="cleanup-area">
                <p class="cleanup-desc">手动触发存储清理，删除最老的记录以释放存储空间。建议先执行模拟清理预览将要删除的记录数。</p>
                <div class="cleanup-actions" v-if="isAdmin">
                  <button class="dry-run-btn" :disabled="cleanupLoading" @click="triggerCleanup(true)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    模拟清理
                  </button>
                  <t-popconfirm content="确定执行清理吗？此操作不可撤销" :confirm-btn="{ content: '确认清理', theme: 'danger' }"
                    @confirm="triggerCleanup(false)">
                    <button class="cleanup-btn" :disabled="cleanupLoading">
                      <t-loading v-if="cleanupLoading" size="14px" />
                      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      立即清理
                    </button>
                  </t-popconfirm>
                </div>
                <t-empty v-else description="仅管理员可执行清理操作" />
              </div>
            </div>

            <!-- 含量比配置 Tab -->
            <div v-else-if="activeTab === 'ratio'" key="ratio" class="tab-panel">
              <div class="section-header-enhanced">
                <div class="section-title-group">
                  <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20V10" />
                    <path d="M18 20V4" />
                    <path d="M6 20v-4" />
                  </svg>
                  <h4 class="section-title-text">含量比校验级别配置</h4>
                </div>
                <div class="section-actions">
                  <span v-if="ratioEditing" class="edit-hint">参数已修改，点击保存生效</span>
                </div>
              </div>

              <p class="ratio-intro">
                含量比校验用于判断配方原料总含量比是否合理。系统根据以下阈值将校验结果分为4个级别，超出高级预警范围的配方将被拒绝创建。
              </p>

              <div class="ratio-levels-grid">
                <div class="ratio-level-card ratio-level-card--normal">
                  <div class="ratio-level-header">
                    <span class="ratio-level-dot ratio-level-dot--normal"></span>
                    <span class="ratio-level-name">正常 (normal)</span>
                  </div>
                  <p class="ratio-level-desc">含量比在此范围内，配方数据正常，无需审核</p>
                  <div class="ratio-level-range">
                    <template v-if="ratioEditing">
                      <t-input-number v-model="ratioForm.normalLow" :min="0.5" :max="1.0" :step="0.01"
                        :decimal-places="2" theme="column" size="small" />
                      <span class="ratio-range-sep">~</span>
                      <t-input-number v-model="ratioForm.normalHigh" :min="1.0" :max="1.5" :step="0.01"
                        :decimal-places="2" theme="column" size="small" />
                    </template>
                    <template v-else>
                      <span class="ratio-range-value">{{ ratioThresholds.normalLow }}</span>
                      <span class="ratio-range-sep">~</span>
                      <span class="ratio-range-value">{{ ratioThresholds.normalHigh }}</span>
                    </template>
                  </div>
                </div>

                <div class="ratio-level-card ratio-level-card--warning">
                  <div class="ratio-level-header">
                    <span class="ratio-level-dot ratio-level-dot--warning"></span>
                    <span class="ratio-level-name">预警 (warning)</span>
                  </div>
                  <p class="ratio-level-desc">含量比偏差较大，建议检查但仍可创建</p>
                  <div class="ratio-level-range">
                    <template v-if="ratioEditing">
                      <t-input-number v-model="ratioForm.warningLow" :min="0.3" :max="1.0" :step="0.01"
                        :decimal-places="2" theme="column" size="small" />
                      <span class="ratio-range-sep">~</span>
                      <t-input-number v-model="ratioForm.warningHigh" :min="1.0" :max="1.7" :step="0.01"
                        :decimal-places="2" theme="column" size="small" />
                    </template>
                    <template v-else>
                      <span class="ratio-range-value">{{ ratioThresholds.warningLow }}</span>
                      <span class="ratio-range-sep">~</span>
                      <span class="ratio-range-value">{{ ratioThresholds.warningHigh }}</span>
                    </template>
                  </div>
                </div>

                <div class="ratio-level-card ratio-level-card--high-warning">
                  <div class="ratio-level-header">
                    <span class="ratio-level-dot ratio-level-dot--high-warning"></span>
                    <span class="ratio-level-name">高级预警 (high_warning)</span>
                  </div>
                  <p class="ratio-level-desc">含量比严重偏差，需人工审核确认后方可创建</p>
                  <div class="ratio-level-range">
                    <template v-if="ratioEditing">
                      <t-input-number v-model="ratioForm.highWarningLow" :min="0.1" :max="1.0" :step="0.01"
                        :decimal-places="2" theme="column" size="small" />
                      <span class="ratio-range-sep">~</span>
                      <t-input-number v-model="ratioForm.highWarningHigh" :min="1.0" :max="2.0" :step="0.01"
                        :decimal-places="2" theme="column" size="small" />
                    </template>
                    <template v-else>
                      <span class="ratio-range-value">{{ ratioThresholds.highWarningLow }}</span>
                      <span class="ratio-range-sep">~</span>
                      <span class="ratio-range-value">{{ ratioThresholds.highWarningHigh }}</span>
                    </template>
                  </div>
                </div>

                <div class="ratio-level-card ratio-level-card--error">
                  <div class="ratio-level-header">
                    <span class="ratio-level-dot ratio-level-dot--error"></span>
                    <span class="ratio-level-name">错误 (error)</span>
                  </div>
                  <p class="ratio-level-desc">含量比超出高级预警范围，配方将被拒绝创建</p>
                  <div class="ratio-level-range">
                    <span class="ratio-range-label">&lt; {{ ratioEditing ? ratioForm.highWarningLow :
                      ratioThresholds.highWarningLow }}</span>
                    <span class="ratio-range-sep">或</span>
                    <span class="ratio-range-label">&gt; {{ ratioEditing ? ratioForm.highWarningHigh :
                      ratioThresholds.highWarningHigh }}</span>
                  </div>
                </div>
              </div>

              <div class="ratio-visual-bar">
                <div class="ratio-bar-track">
                  <div class="ratio-bar-segment ratio-bar-segment--error-l"
                    :style="{ width: ((ratioThresholds.highWarningLow - 0.5) / 1.0 * 100) + '%' }"></div>
                  <div class="ratio-bar-segment ratio-bar-segment--high-warning"
                    :style="{ width: ((ratioThresholds.warningLow - ratioThresholds.highWarningLow) / 1.0 * 100) + '%' }">
                  </div>
                  <div class="ratio-bar-segment ratio-bar-segment--warning"
                    :style="{ width: ((ratioThresholds.normalLow - ratioThresholds.warningLow) / 1.0 * 100) + '%' }">
                  </div>
                  <div class="ratio-bar-segment ratio-bar-segment--normal"
                    :style="{ width: ((ratioThresholds.normalHigh - ratioThresholds.normalLow) / 1.0 * 100) + '%' }">
                  </div>
                  <div class="ratio-bar-segment ratio-bar-segment--warning"
                    :style="{ width: ((ratioThresholds.warningHigh - ratioThresholds.normalHigh) / 1.0 * 100) + '%' }">
                  </div>
                  <div class="ratio-bar-segment ratio-bar-segment--high-warning"
                    :style="{ width: ((ratioThresholds.highWarningHigh - ratioThresholds.warningHigh) / 1.0 * 100) + '%' }">
                  </div>
                  <div class="ratio-bar-segment ratio-bar-segment--error-r"
                    :style="{ width: ((1.5 - ratioThresholds.highWarningHigh) / 1.0 * 100) + '%' }"></div>
                </div>
                <div class="ratio-bar-labels">
                  <span>0.5</span>
                  <span>{{ ratioThresholds.highWarningLow }}</span>
                  <span>{{ ratioThresholds.warningLow }}</span>
                  <span>{{ ratioThresholds.normalLow }}</span>
                  <span>1.0</span>
                  <span>{{ ratioThresholds.normalHigh }}</span>
                  <span>{{ ratioThresholds.warningHigh }}</span>
                  <span>{{ ratioThresholds.highWarningHigh }}</span>
                  <span>1.5</span>
                </div>
              </div>

              <div class="config-edit-bar" v-if="isAdmin">
                <button v-if="!ratioEditing" class="edit-config-btn" @click="startRatioEdit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  更改参数
                </button>
                <template v-if="ratioEditing">
                  <button class="cancel-btn" @click="cancelRatioEdit">取消</button>
                  <button class="save-btn" :class="{ loading: ratioSaving }" :disabled="ratioSaving || !ratioHasChanged"
                    @click="saveRatioThresholds">
                    <t-loading v-if="ratioSaving" size="14px" />
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    保存配置
                  </button>
                </template>
              </div>
            </div>

            <!-- 原料枚举值 Tab -->
            <div v-else-if="activeTab === 'enum-manage'" key="enum-manage" class="tab-panel">
              <EnumManage />
            </div>

            <!-- 导出中心 Tab -->
            <div v-else-if="activeTab === 'export-center'" key="export-center" class="tab-panel">
              <ExportCenter />
            </div>

            <!-- 权限管理 Tab -->
            <div v-else-if="activeTab === 'permission-manage'" key="permission-manage" class="tab-panel">
              <PermissionManage />
            </div>
          </Transition>
        </div>
      </div>
    </t-card>
  </div>
</template>

<style lang="scss" scoped>
$overlay-emerald-25: rgba(16, 185, 129, 0.25);
$transition-fast: 0.15s ease;

.system-config {
  width: 100%;
  padding-bottom: 24px;

  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
  --td-brand-color-light: var(--color-primary-bg);
  --td-brand-color-focus: var(--overlay-brand-30);
  --td-brand-color-disabled: var(--color-primary-lighter);
  --td-brand-color-border-active: var(--color-primary);
  --td-brand-color-border-hover: var(--color-primary-dark);
  --td-brand-color-border-focus: var(--color-primary);
}

// ═══ 主内容卡片 ═══
.content-card {
  min-height: 500px;
  border-radius: var(--radius-4xl) !important;
  overflow: hidden;
  border: none;
  box-shadow: var(--shadow-elevation-1);

  :deep(.t-card__body) {
    padding: 0;
  }
}

.data-center-toolbar {
  padding: var(--space-7) 32px;
  border-bottom: 1px solid var(--color-bg-page);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  position: relative;
  min-height: 80px;

  .toolbar-left-section {
    flex: 1;
    min-width: 240px;

    .toolbar-title-section {
      .toolbar-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 4px 0;
      }

      .toolbar-subtitle {
        font-size: 14px;
        color: var(--color-text-placeholder);
        margin: 0;
      }
    }
  }
}

// ═══ 左侧竖向导航（对齐 ModelManagement mm-nav） ═══
.mm-body {
  display: flex;
  gap: 0;
  min-height: 480px;
}

.mm-nav {
  width: 170px;
  flex-shrink: 0;
  padding: 24px 12px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;

  &--collapsed {
    width: 56px;
    padding: 24px var(--space-1-5);

    .nav-tab {
      justify-content: center;
      padding: 12px 0;

      .nav-tab-icon {
        width: 24px;
        height: 24px;
      }

      .nav-tab-label {
        display: none;
      }
    }

    .nav-collapse-btn {
      margin: 0 auto 12px auto;
      width: 36px;
      height: 36px;
    }
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    padding: 12px 16px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 500;
    border: 1px solid transparent;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;

    .nav-tab-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
      background: var(--color-bg-page);
      color: var(--color-text-primary);
    }

    &.active {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: white;
      box-shadow: 0 4px 12px $overlay-emerald-25;
      border-color: transparent;
      font-weight: 600;
    }

    .nav-tab-label {
      flex: 1;
      transition: opacity 0.2s ease;
    }
  }

  .nav-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-bg-container);
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 12px;
    color: var(--color-text-placeholder);

    &:hover {
      background: var(--color-bg-page);
      color: var(--color-text-secondary);
      border-color: var(--color-border);
    }
  }
}

.mm-content {
  flex: 1;
  min-width: 0;
  padding: 24px var(--space-7);
  border-left: 1px solid var(--color-bg-page);
}

@keyframes content-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.tab-panel {
  animation: content-fade-in 0.3s ease forwards;
}

// ═══ 区块标题 ═══
.section-header-enhanced {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  .section-title-group {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
  }

  .section-title-icon {
    flex-shrink: 0;
  }

  .section-title-text {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .section-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
}

.edit-hint {
  font-size: 12px;
  color: var(--color-warning);
  background: var(--color-warning-bg);
  padding: 4px var(--space-2-5);
  border-radius: 6px;
  border: 1px solid var(--color-warning-light);
}

// ═══ 配置展示卡片 ═══
.config-display-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 12px;

  .config-info-card {
    background: var(--color-bg-page);
    border: 1px solid var(--color-bg-page);
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    &.is-editing {
      background: var(--color-primary-bg);
      border-color: var(--color-primary-lighter);

      .config-info-label {
        color: var(--color-primary-dark);
      }
    }
  }

  .config-info-label {
    font-size: 13px;
    color: var(--color-text-placeholder);
    margin-bottom: 8px;
  }

  .config-info-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--color-text-primary);

    .config-info-unit {
      font-size: 14px;
      font-weight: 400;
      color: var(--color-text-placeholder);
    }

    :deep(.t-input-number) {
      width: 100%;

      .t-input-number__input {
        input {
          font-size: 16px;
          font-weight: 600;
          height: 38px;
        }
      }
    }
  }
}

// ═══ 编辑操作栏 ═══
.config-edit-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  margin-bottom: 20px;

  .cancel-btn {
    padding: 8px 20px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-bg-container);
    color: var(--color-text-secondary);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-text-placeholder);
      color: var(--color-text-primary);
    }
  }

  .save-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px 20px;
    border: none;
    border-radius: 8px;
    background: var(--color-primary);
    color: var(--color-text-white);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: var(--color-primary-dark);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    &.loading {
      opacity: 0.8;
    }
  }
}

.edit-config-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1-5) var(--space-3-5);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-bg-container);
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-primary-lighter);
    color: var(--color-primary);
    background: var(--color-primary-bg);
  }
}

// ═══ 运行状态进度条 ═══
.status-progress-bar {
  padding: 8px 0;

  .progress-track {
    height: 8px;
    background: var(--color-bg-page);
    border-radius: 4px;
    position: relative;
    overflow: visible;
  }

  .progress-fill {
    height: 100%;
    border-radius: 4px;
    background: var(--color-primary);
    transition: width 0.6s ease;

    &--warning {
      background: var(--color-warning);
    }

    &--danger {
      background: var(--color-danger);
    }
  }

  .progress-threshold {
    position: absolute;
    top: -4px;
    width: 2px;
    height: 16px;
    background: var(--color-text-secondary);
  }

  .progress-threshold-label {
    position: absolute;
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 10px;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .progress-labels {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    color: var(--color-text-placeholder);
    margin-top: var(--space-1-5);
  }
}

// ═══ 建议措施 ═══
.recommendations-section {
  margin-top: 16px;

  .recommendation-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 13px;
    color: var(--color-text-secondary);
    padding: var(--space-1-5) 0;
  }

  .recommendation-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
    flex-shrink: 0;
    margin-top: var(--space-1-5);
  }
}

.last-cleanup-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg-page);
  border-radius: 10px;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-top: 12px;
}

// ═══ 手动清理 ═══
.cleanup-area {
  .cleanup-desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin-bottom: 16px;
  }

  .cleanup-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .dry-run-btn,
  .cleanup-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px var(--space-4-5);
    border: none;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .dry-run-btn {
    background: var(--color-bg-page);
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);

    &:hover:not(:disabled) {
      background: var(--color-border);
    }
  }

  .cleanup-btn {
    color: var(--color-text-white);

    &:hover:not(:disabled) {
      background: var(--color-danger);
    }
  }
}

// ═══ 含量比配置 ═══
.ratio-intro {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 0 24px 0;
  padding: 12px 16px;
  background: var(--color-primary-bg);
  border: 1px solid var(--color-primary-lighter);
  border-radius: 10px;
}

.ratio-levels-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.ratio-level-card {
  padding: 20px;
  border-radius: 14px;
  border: 1px solid var(--color-bg-page);
  background: var(--color-bg-container);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }

  &--normal {
    border-left: 4px solid var(--color-primary);
    background: var(--color-success-bg);
  }

  &--warning {
    border-left: 4px solid var(--color-warning);
    background: var(--color-warning-bg);
  }

  &--high-warning {
    border-left: 4px solid $color-info;
    background: var(--color-info-bg);
  }

  &--error {
    border-left: 4px solid var(--color-danger);
    background: var(--color-error-bg);
  }
}

.ratio-level-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.ratio-level-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;

  &--normal {
    background: var(--color-primary);
  }

  &--warning {
    background: var(--color-warning);
  }

  &--high-warning {
    background: $color-info;
  }

  &--error {
    background: var(--color-danger);
  }
}

.ratio-level-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}

.ratio-level-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.ratio-level-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);

  :deep(.t-input-number) {
    width: 100px;

    .t-input-number__input input {
      font-size: 14px;
      font-weight: 600;
      text-align: center;
    }
  }
}

.ratio-range-sep {
  color: var(--color-text-placeholder);
  font-weight: 400;
}

.ratio-range-value {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  min-width: 40px;
  text-align: center;
}

.ratio-range-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.ratio-visual-bar {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--color-bg-page);
  border-radius: 12px;
}

.ratio-bar-track {
  display: flex;
  height: 24px;
  border-radius: 6px;
  overflow: hidden;
}

.ratio-bar-segment {
  height: 100%;
  transition: width 0.3s ease;

  &--error-l {
    background: var(--color-error-bg);
  }

  &--high-warning {
    background: $color-lavender;
  }

  &--warning {
    background: var(--color-warning-bg);
  }

  &--normal {
    background: var(--color-primary);
  }

  &--error-r {
    background: var(--color-error-bg);
  }
}

.ratio-bar-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--color-text-placeholder);
  margin-top: var(--space-1-5);
  padding: 0 var(--space-0-5);
}

// ═══ 过渡动画 ═══
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.2s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

// ═══ 响应式 ═══
@media (max-width: 1200px) {
  .config-display-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .config-display-grid {
    grid-template-columns: 1fr;
  }

  .ratio-levels-grid {
    grid-template-columns: 1fr;
  }

  .mm-body {
    flex-direction: column;
  }

  .mm-nav {
    width: 100%;
    flex-direction: row;
    padding: 12px;
    overflow-x: auto;
    border-bottom: 1px solid var(--color-bg-page);

    &--collapsed {
      width: 100%;
      padding: 12px;
    }
  }

  .nav-collapse-btn {
    display: none;
  }

  .mm-content {
    border-left: none;
    padding: 16px;
  }
}
</style>
