<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { parseResultApi } from '@/api/parseResult';
import { ratioThresholdApi } from '@/api/ratioThreshold';
import type { RatioThresholdConfig } from '@/api/ratioThreshold';
import { useAuthStore } from '@/stores/auth';
import EnumManage from '@/views/settings/EnumManage.vue';

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');

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

interface StatisticsData {
  totalCount: number;
  successCount: number;
  failedCount: number;
  linkedCount: number;
  cacheHitRate: number;
  todayParses: number;
  storageUsagePercent: number;
  storageLimit: number;
}

interface ActivityItem {
  id: string;
  type: 'cleanup' | 'alert' | 'config_change' | 'degradation';
  message: string;
  time: string;
}

const loading = ref(false);
const activeTab = ref('cache');

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
const statistics = ref<StatisticsData | null>(null);
const activities = ref<ActivityItem[]>([]);
const cleanupLoading = ref(false);

const dashboardCards = computed(() => [
  {
    label: '总解析记录',
    value: statistics.value?.totalCount ?? 0,
    unit: '条',
    iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    iconBg: 'linear-gradient(135deg, #DBEAFE, #BFDBFE)',
    iconColor: '#3B82F6',
    badge: statistics.value?.storageUsagePercent ? `${statistics.value.storageUsagePercent}%` : '-',
    badgeColor: (statistics.value?.storageUsagePercent ?? 0) >= 95 ? 'var(--color-danger)' : 'var(--color-primary)',
    badgeBg: (statistics.value?.storageUsagePercent ?? 0) >= 95 ? '#FEE2E2' : 'var(--color-primary-bg)',
  },
  {
    label: '今日解析次数',
    value: statistics.value?.todayParses ?? 0,
    unit: '次',
    iconPath: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
    iconBg: 'linear-gradient(135deg, #FCE7F3, #FBCFE8)',
    iconColor: '#EC4899',
    badge: '实时',
    badgeColor: '#8B5CF6',
    badgeBg: '#EDE9FE',
  },
  {
    label: '缓存命中率',
    value: statistics.value?.cacheHitRate != null ? `${(statistics.value.cacheHitRate * 100).toFixed(1)}%` : '-',
    unit: '',
    iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    iconBg: 'linear-gradient(135deg, var(--color-primary-bg), var(--color-primary-lightest))',
    iconColor: 'var(--color-primary)',
    badge: 'AI 节省',
    badgeColor: 'var(--color-primary-dark)',
    badgeBg: 'var(--color-primary-bg)',
  },
  {
    label: '存储使用率',
    value: degradationInfo.value?.systemStatus?.usagePercent ?? 0,
    unit: '%',
    iconPath: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    iconBg: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
    iconColor: 'var(--color-warning)',
    badge: degradationInfo.value?.level === '熔断' ? '熔断' : degradationInfo.value?.level === 'degraded' ? '降级' : '正常',
    badgeColor: degradationInfo.value?.level === '熔断' ? 'var(--color-danger)' : degradationInfo.value?.level === 'degraded' ? 'var(--color-warning)' : 'var(--color-primary)',
    badgeBg: degradationInfo.value?.level === '熔断' ? '#FEE2E2' : degradationInfo.value?.level === 'degraded' ? '#FEF3C7' : 'var(--color-primary-bg)',
  },
]);

const tabs = [
  { value: 'cache', label: '缓存配置' },
  { value: 'ratio', label: '含量比配置' },
  { value: 'overview', label: '数据概览' },
  { value: 'enum-manage', label: '原料值管理' },
];

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

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const activityTotalPages = computed(() => Math.max(1, Math.ceil(activities.value.length / ACTIVITY_PAGE_SIZE)));
const pagedActivities = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return activities.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const assistantMessage = computed(() => {
  const usage = degradationInfo.value?.systemStatus?.usagePercent ?? 0;
  const rate = statistics.value?.cacheHitRate ?? 0;
  if (activeTab.value === 'ratio') {
    return `含量比校验阈值决定配方原料总含量比的判定级别。当前正常范围 [${ratioThresholds.value.normalLow}, ${ratioThresholds.value.normalHigh}]，超出高级预警范围 [${ratioThresholds.value.highWarningLow}, ${ratioThresholds.value.highWarningHigh}] 的配方将被拒绝创建。`;
  }
  if (usage >= 95) return '存储使用率已达 ' + usage + '%，系统已触发熔断保护。建议立即手动清理过期数据，或调整存储上限。';
  if (usage >= 80) return '存储使用率较高（' + usage + '%），建议关注清理阈值设置。缓存命中率 ' + (rate * 100).toFixed(1) + '%。';
  return '系统运行正常，存储使用率 ' + usage + '%，缓存命中率 ' + (rate * 100).toFixed(1) + '%。';
});

const assistantButtonText = computed(() => {
  if (activeTab.value === 'cache') return '查看含量比配置';
  if (activeTab.value === 'ratio') return '查看数据概览';
  return '返回缓存配置';
});

const handleAssistantAction = () => {
  if (activeTab.value === 'cache') activeTab.value = 'ratio';
  else if (activeTab.value === 'ratio') activeTab.value = 'overview';
  else activeTab.value = 'cache';
};

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
    activities.value.push(...generateActivitiesFromDegradation(degradationInfo.value));
  } catch (error: unknown) {
    console.error('[SystemConfig] 获取降级信息失败:', error);
  }
}

async function fetchStatistics() {
  try {
    const res = await parseResultApi.getStatistics();
    statistics.value = {
      totalCount: res.total,
      successCount: res.total - res.unlinked,
      failedCount: res.unlinked,
      linkedCount: res.linked,
      cacheHitRate: res.total > 0 ? res.linked / res.total : 0,
      todayParses: 0,
      storageUsagePercent: res.totalSize > 0 ? Math.round((res.total / 5000) * 100) : 0,
      storageLimit: 5000,
    };
  } catch (error: unknown) {
    console.error('[SystemConfig] 获取统计失败:', error);
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
    activities.value.unshift({
      id: 'ratio-' + Date.now(),
      type: 'config_change',
      message: `更新含量比校验阈值：正常 [${res.normalLow}, ${res.normalHigh}]，预警 [${res.warningLow}, ${res.warningHigh}]，高级预警 [${res.highWarningLow}, ${res.highWarningHigh}]`,
      time: '刚刚',
    });
  } catch (error: unknown) {
    const err = error as { message?: string; };
    MessagePlugin.error('含量比阈值配置更新失败: ' + (err.message || '未知错误'));
  } finally {
    ratioSaving.value = false;
  }
}

function generateActivitiesFromDegradation(info: DegradationInfo): ActivityItem[] {
  const items: ActivityItem[] = [];
  if (info.lastCleanup) {
    items.push({
      id: 'last-cleanup',
      type: 'cleanup',
      message: `自动清理触发：删除 ${info.lastCleanup.deletedCount} 条记录，原因：${info.lastCleanup.triggerReason}`,
      time: '',
    });
  }
  if (info.level !== 'normal') {
    items.push({
      id: 'current-status',
      type: 'degradation',
      message: `系统状态：${info.level === '熔断' ? '已触发熔断保护' : '性能降级'} — ${info.reason}`,
      time: '',
    });
  }
  return items;
}

function generateSuggestions(): string[] {
  const suggestions: string[] = [];
  const usage = degradationInfo.value?.systemStatus?.usagePercent ?? 0;
  const rate = statistics.value?.cacheHitRate ?? 0;

  if (usage >= 95) {
    suggestions.push('存储使用率已达 ' + usage + '%，已触发自动熔断保护，建议立即手动清理过期数据');
  } else if (usage >= 80) {
    suggestions.push('存储使用率较高（' + usage + '%），建议关注清理阈值设置，适时清理历史数据');
  } else {
    suggestions.push('存储状态正常，当前使用率 ' + usage + '%，系统运行良好');
  }

  if (rate < 0.3) {
    suggestions.push('缓存命中率较低（' + (rate * 100).toFixed(1) + '%），相同文件重复上传时未命中缓存，建议检查文件哈希计算逻辑');
  } else if (rate >= 0.3 && rate < 0.6) {
    suggestions.push('缓存命中率一般（' + (rate * 100).toFixed(1) + '%），有一定优化空间');
  } else {
    suggestions.push('缓存命中率良好（' + (rate * 100).toFixed(1) + '%），有效节省 AI 调用成本');
  }

  return suggestions;
}

const suggestions = computed(() => generateSuggestions());

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
    activities.value.unshift({
      id: 'config-' + Date.now(),
      type: 'config_change',
      message: `更新存储配置：上限 ${configForm.value.storageLimit} 条，清理阈值 ${configForm.value.cleanupThresholdPercent}%，文件保留 ${configForm.value.fileRetentionDays} 天`,
      time: '刚刚',
    });
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
    activities.value.unshift({
      id: 'cleanup-' + Date.now(),
      type: 'cleanup',
      message: `${dryRun ? '模拟' : ''}清理操作：${msg}`,
      time: '刚刚',
    });
    await fetchDegradation();
    await fetchStatistics();
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
    fetchStatistics(),
    fetchRatioThresholds(),
  ]);
});


</script>

<template>
  <div class="system-config">

    <t-card class="content-card" bordered>

      <div class="data-center-toolbar">
        <div class="toolbar-left-section">
          <div class="toolbar-title-section">
            <h3 class="toolbar-title">系统管理</h3>
            <p class="toolbar-subtitle">缓存配置、含量比校验、原料值管理与系统状态</p>
          </div>
        </div>
        <div class="toolbar-tabs">
          <div v-for="tab in tabs" :key="tab.value" class="toolbar-tab" :class="{ active: activeTab === tab.value }"
            role="tab" tabindex="0" @click="activeTab = tab.value" @keydown.enter="activeTab = tab.value">
            {{ tab.label }}
          </div>
        </div>
      </div>

      <div class="tab-content">
        <Transition name="content-fade" mode="out-in">
          <!-- 缓存配置 Tab（合并原存储配置 + 统计数据 + 系统状态） -->
          <div v-if="activeTab === 'cache'" key="cache" class="tab-panel">
            <!-- 存储参数配置 -->
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

            <!-- 文件保留策略配置 -->
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
              <div class="section-actions">
                <span v-if="isEditing" class="edit-hint">参数已修改，点击保存生效</span>
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

            <!-- 统计数据（合并自原统计数据 tab） -->
            <div class="section-header-enhanced" style="margin-top: 8px;">
              <div class="section-title-group">
                <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3B82F6"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="6" y1="20" x2="6" y2="14" />
                </svg>
                <h4 class="section-title-text">配置概览</h4>
              </div>
            </div>

            <div v-if="statistics" class="statistics-grid">
              <div class="statistics-item">
                <div class="statistics-item-icon" style="background: #DBEAFE; color: #3B82F6;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
                <div class="statistics-item-body">
                  <span class="statistics-item-value">{{ statistics.totalCount }}</span>
                  <span class="statistics-item-label">总记录数</span>
                </div>
              </div>
              <div class="statistics-item">
                <div class="statistics-item-icon"
                  style="background: var(--color-primary-bg); color: var(--color-primary);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div class="statistics-item-body">
                  <span class="statistics-item-value">{{ statistics.successCount }}</span>
                  <span class="statistics-item-label">成功</span>
                </div>
              </div>
              <div class="statistics-item">
                <div class="statistics-item-icon" style="background: #FEE2E2; color: var(--color-danger);">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
                <div class="statistics-item-body">
                  <span class="statistics-item-value">{{ statistics.failedCount }}</span>
                  <span class="statistics-item-label">失败</span>
                </div>
              </div>
              <div class="statistics-item">
                <div class="statistics-item-icon" style="background: #EDE9FE; color: #8B5CF6;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
                <div class="statistics-item-body">
                  <span class="statistics-item-value">{{ statistics.linkedCount }}</span>
                  <span class="statistics-item-label">已关联</span>
                </div>
              </div>
            </div>
            <div v-else class="data-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              <p class="data-empty-text">暂无统计数据</p>
              <p class="data-empty-hint">产生解析记录后，统计数据将在此展示</p>
            </div>

            <t-divider />

            <!-- 系统运行状态 -->
            <div class="degradation-content">
              <!-- 解析缓存状态 -->
              <div class="status-section" style="margin-bottom: 16px;">
                <h5 class="status-section-title">解析缓存状态</h5>
                <div class="status-metrics">
                  <div class="status-metric">
                    <div class="status-metric-value">{{ degradationInfo?.systemStatus?.totalCount ?? 0 }}</div>
                    <div class="status-metric-label">当前记录数</div>
                  </div>
                  <div class="status-metric">
                    <div class="status-metric-value">{{ degradationInfo?.systemStatus?.storageLimit ??
                      configData.storageLimit }}
                    </div>
                    <div class="status-metric-label">存储上限</div>
                  </div>
                  <div class="status-metric">
                    <div class="status-metric-value"
                      :class="{ 'text-danger': (degradationInfo?.systemStatus?.usagePercent ?? 0) >= 95 }">
                      {{ degradationInfo?.systemStatus?.usagePercent ?? 0 }}%
                    </div>
                    <div class="status-metric-label">存储使用率</div>
                  </div>
                  <div class="status-metric">
                    <div class="status-metric-value">{{ degradationInfo?.systemStatus?.cleanupThreshold ??
                      configData.cleanupThresholdPercent }}%</div>
                    <div class="status-metric-label">清理阈值</div>
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
              </div>

              <!-- 文件保留策略状态 -->
              <div class="status-section" style="margin-bottom: 16px;">
                <h5 class="status-section-title">文件保留策略状态</h5>
                <div class="status-metrics">
                  <div class="status-metric">
                    <div class="status-metric-value">{{ configData.fileRetentionDays }}</div>
                    <div class="status-metric-label">原文件保留天数</div>
                  </div>
                  <div class="status-metric">
                    <div class="status-metric-value">{{ (configData.fileStorageLimitBytes / 1024 / 1024 /
                      1024).toFixed(0) }} GB
                    </div>
                    <div class="status-metric-label">存储空间上限</div>
                  </div>
                  <div class="status-metric">
                    <div class="status-metric-value">{{ configData.fileStorageAlertPercent }}%</div>
                    <div class="status-metric-label">告警阈值</div>
                  </div>
                </div>
              </div>

              <!-- 建议措施 -->
              <div v-if="degradationInfo?.recommendations?.length" class="recommendations-section">
                <div class="recommendations-title">建议措施</div>
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
                  degradationInfo.lastCleanup.triggerReason
                }}</span>
              </div>
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
                <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
                    <t-input-number v-model="ratioForm.normalLow" :min="0.5" :max="1.0" :step="0.01" :decimal-places="2"
                      theme="column" size="small" />
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
                    ratioThresholds.highWarningLow
                  }}</span>
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

          <!-- 数据概览 Tab（原仪表盘） -->
          <div v-else-if="activeTab === 'overview'" key="overview" class="tab-panel">
            <div class="section-header-enhanced">
              <div class="section-title-group">
                <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6366F1"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                <h4 class="section-title-text">数据概览</h4>
              </div>
            </div>

            <div class="dashboard-grid">
              <div v-for="(card, idx) in dashboardCards" :key="card.label" class="stat-card"
                :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
                <div class="stat-card-top">
                  <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
                  </div>
                  <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">{{ card.badge
                  }}</span>
                </div>
                <p class="stat-label">{{ card.label }}</p>
                <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
              </div>
            </div>

            <!-- 操作建议 -->
            <div class="section-header-enhanced" style="margin-top: 24px;">
              <div class="section-title-group">
                <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-warning)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18h6" />
                  <path d="M10 22h4" />
                  <path
                    d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                </svg>
                <h4 class="section-title-text">操作建议</h4>
              </div>
            </div>

            <div v-if="suggestions.length > 0" class="suggestion-list">
              <div v-for="(suggestion, idx) in suggestions" :key="idx" class="suggestion-item">
                <div class="suggestion-bulb">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 18h6" />
                    <path d="M10 22h4" />
                    <path
                      d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
                  </svg>
                </div>
                <span class="suggestion-text">{{ suggestion }}</span>
              </div>
            </div>
            <div v-else class="data-empty">
              <p class="data-empty-text">暂无建议</p>
              <p class="data-empty-hint">系统运行后将根据状态生成操作建议</p>
            </div>
          </div>

          <!-- 原料值管理 Tab -->
          <div v-else-if="activeTab === 'enum-manage'" key="enum-manage" class="tab-panel">
            <EnumManage />
          </div>
        </Transition>
      </div>
    </t-card>

    <!-- 底部：近期动态 + 系统助手（还原模型管理样式） -->
    <section class="activity-section">
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期动态
          </h4>
          <div class="activity-nav">
            <button class="activity-nav-btn" :disabled="activityPage <= 1" @click="activityPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ activityPage }} / {{ activityTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="activityPage >= activityTotalPages" @click="activityNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <div v-if="activities.length > 0" class="timeline-list">
          <div v-for="(item, index) in pagedActivities" :key="item.id" class="timeline-item"
            :class="{ 'timeline-item--last': index === pagedActivities.length - 1 }">
            <div class="timeline-dot" :class="'timeline-dot--' + item.type">
              <span class="timeline-dot-inner"></span>
            </div>
            <div class="timeline-content">
              <p class="timeline-title">{{ item.message }}</p>
              <span v-if="item.time" class="timeline-time">{{ item.time }}</span>
            </div>
          </div>
        </div>
        <div v-else class="timeline-list">
          <div class="timeline-item timeline-item--last">
            <div class="timeline-dot timeline-dot--info">
              <span class="timeline-dot-inner"></span>
            </div>
            <div class="timeline-content">
              <p class="timeline-title">暂无动态</p>
              <span class="timeline-time">系统运行后将在此展示清理、配置变更等操作记录</span>
            </div>
          </div>
        </div>
      </div>

      <div class="activity-card activity-card--assistant">
        <div class="assistant-content">
          <h4 class="assistant-title">系统助手</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="handleAssistantAction">
            {{ assistantButtonText }}
          </button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">系</span>
              <span class="assistant-avatar">统</span>
              <span class="assistant-avatar">AI</span>
            </div>
            <span class="assistant-hint">{{ degradationInfo?.systemStatus?.totalCount ?? 0 }} 条记录</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <path d="M12 2L2 7L12 12L22 7L12 2Z" />
          <path d="M2 17L12 22L22 17" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M2 12L12 17L22 12" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
    </section>

  </div>
</template>

<style lang="scss" scoped>
$overlay-emerald-04: rgba(16, 185, 129, 0.04);
$overlay-emerald-15: rgba(16, 185, 129, 0.15);
$overlay-white-15: rgba(255, 255, 255, 0.15);
$overlay-white-20: rgba(255, 255, 255, 0.2);
$overlay-white-30: rgba(255, 255, 255, 0.3);
$transition-fast: 0.15s ease;
$transition-normal: 0.25s ease;

.system-config {
  padding: 0;
}

.content-card {
  border-radius: var(--radius-4xl) !important;
  overflow: hidden;
  border: none;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

  :deep(.t-card__body) {
    padding: 0;
  }
}

.data-center-toolbar {
  padding: 24px;
  border-bottom: 1px solid var(--color-bg-page);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;

  .toolbar-title-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .toolbar-title {
    font-size: 20px;
    font-weight: 700;
    color: #0F172A;
    margin: 0;
    line-height: 1.3;
  }

  .toolbar-subtitle {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-placeholder);
  }
}

.toolbar-tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
}

.toolbar-tab {
  padding: 8px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: #0F172A;
  }

  &.active {
    background: #fff;
    color: #4F46E5;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  }
}

.tab-content {
  padding: 24px 24px;
}

.tab-panel {
  min-height: 300px;
}

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
    color: #0F172A;
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
  background: #FFFBEB;
  padding: 4px var(--space-2-5);
  border-radius: 6px;
  border: 1px solid #FDE68A;
}

.edit-config-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1-5) var(--space-3-5);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: #fff;
  color: var(--color-text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #3B82F6;
    color: #3B82F6;
    background: #F0F7FF;
  }
}

.config-display-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 12px;

  .config-info-card {
    background: var(--color-bg-page);
    border: 1px solid #f1f5f9;
    border-radius: 12px;
    padding: 20px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-border);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    }

    &.is-editing {
      background: #F0F7FF;
      border-color: #93C5FD;

      .config-info-label {
        color: #2563EB;
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
    color: #0F172A;

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
    background: #fff;
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
    background: #3B82F6;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: #2563EB;
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

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  .statistics-item {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: var(--color-bg-page);
    border: 1px solid #f1f5f9;
    border-radius: 14px;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-border);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }
  }

  .statistics-item-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .statistics-item-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
  }

  .statistics-item-value {
    font-size: 20px;
    font-weight: 700;
    color: #0F172A;
  }

  .statistics-item-label {
    font-size: 13px;
    color: var(--color-text-placeholder);
  }
}

.degradation-content {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .status-banner {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3-5);
    padding: 16px 20px;
    border-radius: 12px;

    &--normal {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;

      .status-banner-icon {
        color: #22C55E;
      }
    }

    &--degraded {
      background: #FFFBEB;
      border: 1px solid #FDE68A;

      .status-banner-icon {
        color: var(--color-warning);
      }
    }

    &--熔断 {
      background: #FEF2F2;
      border: 1px solid #FECACA;

      .status-banner-icon {
        color: var(--color-danger);
      }
    }

    .status-banner-icon {
      flex-shrink: 0;
      margin-top: var(--space-0-5);
    }

    .status-banner-text {
      font-size: 14px;
      color: var(--color-text-primary);

      strong {
        display: block;
        margin-bottom: 4px;
      }

      p {
        margin: 0;
        color: var(--color-text-secondary);
      }
    }
  }

  .status-section {
    .status-section-title {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
  }

  .status-metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }

  .status-metric {
    text-align: center;
    padding: 16px;
    background: var(--color-bg-page);
    border-radius: 12px;
  }

  .status-metric-value {
    font-size: 22px;
    font-weight: 700;
    color: #0F172A;

    &.text-danger {
      color: var(--color-danger);
    }
  }

  .status-metric-label {
    font-size: 12px;
    color: var(--color-text-placeholder);
    margin-top: 4px;
  }

  .status-progress-bar {
    padding: 8px 0;

    .progress-track {
      height: 8px;
      background: #f1f5f9;
      border-radius: 4px;
      position: relative;
      overflow: visible;
    }

    .progress-fill {
      height: 100%;
      border-radius: 4px;
      background: #3B82F6;
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

  .recommendations-section {
    .recommendations-title {
      font-size: 14px;
      font-weight: 600;
      color: #0F172A;
      margin-bottom: var(--space-2-5);
    }

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
      background: #3B82F6;
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
  }
}

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
    background: #f1f5f9;
    color: var(--color-text-secondary);
    border: 1px solid var(--color-border);

    &:hover:not(:disabled) {
      background: var(--color-border);
    }
  }

  .cleanup-btn {
    background: var(--color-danger);
    color: #fff;

    &:hover:not(:disabled) {
      background: var(--color-danger);
    }
  }
}

.data-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: var(--space-16) 0;

  .data-empty-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    margin: 0;
  }

  .data-empty-hint {
    font-size: 13px;
    color: #cbd5e1;
    margin: 0;
  }
}

// ═══ 含量比配置 Tab ═══
.ratio-intro {
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: 0 0 24px 0;
  padding: 12px 16px;
  background: #F5F3FF;
  border: 1px solid #E9E5FF;
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
  border: 1px solid #f1f5f9;
  background: #fff;
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
  }

  &--normal {
    border-left: 4px solid var(--color-primary);
    background: #F0FDF4;
  }

  &--warning {
    border-left: 4px solid var(--color-warning);
    background: #FFFBEB;
  }

  &--high-warning {
    border-left: 4px solid #8B5CF6;
    background: #F5F3FF;
  }

  &--error {
    border-left: 4px solid var(--color-danger);
    background: #FEF2F2;
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
    background: #8B5CF6;
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
  color: #0F172A;

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
  color: #0F172A;
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
    background: #FEE2E2;
  }

  &--high-warning {
    background: #E9D5FF;
  }

  &--warning {
    background: #FEF3C7;
  }

  &--normal {
    background: var(--color-primary);
  }

  &--error-r {
    background: #FEE2E2;
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

// ═══ 仪表盘（数据概览 Tab 内） ═══
.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;

  .stat-card {
    background: #fff;
    padding: 24px;
    border-radius: var(--radius-4xl);
    border: 1px solid #fff;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;
    animation: dashboard-fade-in 0.5s ease forwards;
    opacity: 0;

    &:hover {
      border-color: #DBEAFE;
      transform: translateY(-2px);
      box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
    }

    .stat-card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-badge {
      font-size: 12px;
      font-weight: 700;
      padding: var(--space-0-5) 8px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .stat-label {
      font-size: 14px;
      color: var(--color-text-placeholder);
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.2;

      .stat-unit {
        font-size: 14px;
        font-weight: 400;
        color: var(--color-text-placeholder);
      }
    }
  }
}

@keyframes dashboard-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ═══ 操作建议（数据概览 Tab 内） ═══
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .suggestion-item {
    display: flex;
    align-items: flex-start;
    gap: var(--space-2-5);
    padding: 12px var(--space-3-5);
    background: #FFFBEB;
    border: 1px solid #FEF3C7;
    border-radius: 10px;
    transition: all 0.2s;

    &:hover {
      background: #FEF3C7;
    }
  }

  .suggestion-bulb {
    color: var(--color-warning);
    flex-shrink: 0;
    margin-top: 1px;
  }

  .suggestion-text {
    font-size: 13px;
    color: var(--color-text-primary);
    line-height: 1.5;
  }
}

// ═══ 底部：近期动态 + 系统助手（还原模型管理样式） ═══
.activity-section {
  margin-top: 24px;
  padding-bottom: 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
}

.activity-card {
  background-color: #fff;
  border-radius: var(--radius-4xl);
  padding: 32px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid var(--color-bg-page);

  &--assistant {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    border: none;
    color: #fff;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px $overlay-emerald-15, 0 10px 10px -5px $overlay-emerald-04;
  }
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.activity-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.activity-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: var(--color-border);
    color: var(--color-text-primary);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.activity-nav-page {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-placeholder);
  min-width: 40px;
  text-align: center;
}

.timeline-list {
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 11px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--color-border);
    border-radius: 1px;
  }
}

.timeline-item {
  display: flex;
  gap: 16px;
  position: relative;
  padding-bottom: 20px;

  &--last {
    padding-bottom: 0;
  }
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 1;
  background: #fff;
  border: 2px solid var(--color-border);

  &--cleanup {
    border-color: var(--color-danger);

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-danger);
    }
  }

  &--alert {
    border-color: var(--color-warning);

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-warning);
    }
  }

  &--config_change {
    border-color: #3b82f6;

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
    }
  }

  &--degradation {
    border-color: #8b5cf6;

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #8b5cf6;
    }
  }

  &--info {
    border-color: #3b82f6;

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #3b82f6;
    }
  }
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
}

.timeline-time {
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.assistant-content {
  position: relative;
  z-index: 1;
}

.assistant-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 8px 0;
}

.assistant-desc {
  font-size: 14px;
  opacity: 0.9;
  line-height: 1.6;
  margin: 0 0 20px 0;
  min-height: 42px;
}

.assistant-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-2-5) 24px;
  border-radius: 12px;
  background: $overlay-white-20;
  backdrop-filter: blur(10px);
  border: 1px solid $overlay-white-30;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-normal;

  &:hover {
    background: $overlay-white-30;
    transform: translateY(-2px);
  }
}

.assistant-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid $overlay-white-15;
}

.assistant-avatar-group {
  display: flex;
  gap: var(--space-1-5);
}

.assistant-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: $overlay-white-20;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  backdrop-filter: blur(4px);
}

.assistant-hint {
  font-size: 12px;
  opacity: 0.75;
}

.assistant-bg-icon {
  position: absolute;
  right: -10px;
  bottom: -10px;
  opacity: 0.08;
  transform: rotate(-15deg);
}

// ═══ 过渡动画 ═══
.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.15s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

// ═══ 响应式 ═══
@media (max-width: 1200px) {
  .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .config-display-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .statistics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .config-display-grid {
    grid-template-columns: 1fr;
  }

  .statistics-grid {
    grid-template-columns: 1fr;
  }

  .ratio-levels-grid {
    grid-template-columns: 1fr;
  }

  .activity-section {
    grid-template-columns: 1fr;
  }

  .degradation-content .status-metrics {
    grid-template-columns: repeat(2, 1fr);
  }

  .toolbar-tabs {
    width: 100%;
    margin-top: 12px;
  }
}

@media (max-width: 400px) {
  .degradation-content .status-metrics {
    grid-template-columns: 1fr;
  }
}
</style>
