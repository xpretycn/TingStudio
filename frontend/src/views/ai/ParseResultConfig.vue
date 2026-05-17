<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { MessagePlugin } from 'tdesign-vue-next';
import { parseResultApi } from '@/api/parseResult';
import { useAuthStore } from '@/stores/auth';

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

interface ConfigData {
  storageLimit: number;
  cleanupThresholdPercent: number;
  cleanupBatchPercent: number;
  maxFileSizeBytes: number;
}

const authStore = useAuthStore();
const isAdmin = computed(() => authStore.userInfo?.role === 'admin');

const loading = ref(false);
const degradationInfo = ref<DegradationInfo | null>(null);
const configData = ref<ConfigData>({
  storageLimit: 5000,
  cleanupThresholdPercent: 95,
  cleanupBatchPercent: 5,
  maxFileSizeBytes: 5242880,
});
const configForm = ref<ConfigData>({ ...configData.value });
const showConfigEdit = ref(false);
const cleanupLoading = ref(false);

const statusColor = computed(() => {
  switch (degradationInfo.value?.level) {
    case 'normal':
      return 'success';
    case 'degraded':
      return 'warning';
    case '熔断':
      return 'danger';
    default:
      return 'default';
  }
});

const statusText = computed(() => {
  switch (degradationInfo.value?.level) {
    case 'normal':
      return '正常运行';
    case 'degraded':
      return '性能降级';
    case '熔断':
      return '熔断保护';
    default:
      return '未知';
  }
});

const usagePercent = computed(() => {
  return degradationInfo.value?.systemStatus?.usagePercent || 0;
});

async function fetchDegradationInfo() {
  try {
    const res = await parseResultApi.getDegradation();
    degradationInfo.value = res;
  } catch (error: any) {
    console.error('[ParseResultConfig] Error fetching degradation info:', error);
  }
}

async function fetchConfig() {
  try {
    const res = await parseResultApi.getConfig();
    configData.value = {
      storageLimit: Number(res.storage_limit?.value) || 5000,
      cleanupThresholdPercent: Number(res.cleanup_threshold_percent?.value) || 95,
      cleanupBatchPercent: Number(res.cleanup_batch_percent?.value) || 5,
      maxFileSizeBytes: Number(res.max_file_size_bytes?.value) || 5242880,
    };
    configForm.value = { ...configData.value };
  } catch (error: any) {
    console.error('[ParseResultConfig] Error fetching config:', error);
  }
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
    showConfigEdit.value = false;
    MessagePlugin.success('配置更新成功');
  } catch (error: any) {
    MessagePlugin.error('配置更新失败');
  } finally {
    loading.value = false;
  }
}

async function triggerCleanup(dryRun: boolean = false) {
  if (!isAdmin.value) {
    MessagePlugin.error('无权执行清理操作');
    return;
  }

  try {
    cleanupLoading.value = true;
    const res = await parseResultApi.manualCleanup({ dryRun });
    MessagePlugin.success(dryRun ? `Dry Run: 将清理 ${res.deletedCount} 条记录` : `成功清理 ${res.deletedCount} 条记录`);
    await fetchDegradationInfo();
  } catch (error: any) {
    MessagePlugin.error('清理操作失败');
  } finally {
    cleanupLoading.value = false;
  }
}

function cancelEdit() {
  configForm.value = { ...configData.value };
  showConfigEdit.value = false;
}

onMounted(() => {
  fetchDegradationInfo();
  fetchConfig();
});
</script>

<template>
  <div class="parse-result-config">
    <t-card title="系统状态" class="status-card">
      <template #subtitle>
        <t-tag :theme="statusColor" variant="light">
          {{ statusText }}
        </t-tag>
      </template>

      <div class="status-content">
        <div class="status-indicator">
          <div class="usage-ring" :class="`usage-ring--${degradationInfo?.level || 'normal'}`">
            <div class="usage-ring__value">{{ usagePercent }}%</div>
            <div class="usage-ring__label">存储使用率</div>
          </div>
        </div>

        <div class="status-stats">
          <div class="stat-item">
            <div class="stat-item__label">当前记录数</div>
            <div class="stat-item__value">{{ degradationInfo?.systemStatus?.totalCount || 0 }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-item__label">存储上限</div>
            <div class="stat-item__value">{{ degradationInfo?.systemStatus?.storageLimit || 0 }}</div>
          </div>
          <div class="stat-item">
            <div class="stat-item__label">清理阈值</div>
            <div class="stat-item__value">{{ degradationInfo?.systemStatus?.cleanupThreshold || 95 }}%</div>
          </div>
        </div>

        <div class="status-progress">
          <t-progress
            :percentage="usagePercent"
            :color="usagePercent >= 95 ? '#e34d59' : usagePercent >= 80 ? '#ed7b2f' : '#2a59a8'"
            :track-color="'#e8e8e8'"
            :label="false"
          />
        </div>

        <div class="status-reason" v-if="degradationInfo?.reason">
          <t-alert :theme="degradationInfo.level === '熔断' ? 'error' : degradationInfo.level === 'degraded' ? 'warning' : 'success'">
            {{ degradationInfo.reason }}
          </t-alert>
        </div>

        <div class="status-recommendations" v-if="degradationInfo?.recommendations?.length">
          <div class="recommendations-title">建议措施：</div>
          <ul class="recommendations-list">
            <li v-for="(rec, index) in degradationInfo.recommendations" :key="index">
              {{ rec }}
            </li>
          </ul>
        </div>

        <div class="last-cleanup" v-if="degradationInfo?.lastCleanup">
          <t-divider />
          <div class="cleanup-info">
            <span>上次清理：删除 {{ degradationInfo.lastCleanup.deletedCount }} 条记录</span>
            <span>原因：{{ degradationInfo.lastCleanup.triggerReason }}</span>
          </div>
        </div>
      </div>
    </t-card>

    <t-card title="存储配置" class="config-card">
      <template #actions>
        <t-button
          v-if="isAdmin && !showConfigEdit"
          size="small"
          variant="outline"
          @click="showConfigEdit = true"
        >
          编辑配置
        </t-button>
      </template>

      <div v-if="!showConfigEdit" class="config-display">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="最大存储数量">
            {{ configData.storageLimit }} 条
          </t-descriptions-item>
          <t-descriptions-item label="清理阈值">
            {{ configData.cleanupThresholdPercent }}%
          </t-descriptions-item>
          <t-descriptions-item label="每次清理比例">
            {{ configData.cleanupBatchPercent }}%
          </t-descriptions-item>
          <t-descriptions-item label="单文件大小上限">
            {{ (configData.maxFileSizeBytes / 1024 / 1024).toFixed(1) }} MB
          </t-descriptions-item>
        </t-descriptions>
      </div>

      <div v-else class="config-edit">
        <t-form label-align="top">
          <t-form-item label="最大存储数量">
            <t-input-number
              v-model="configForm.storageLimit"
              :min="100"
              :max="100000"
              :step="100"
              placeholder="请输入最大存储数量"
            />
            <template #help>
              <span class="help-text">范围：100 - 100,000 条记录</span>
            </template>
          </t-form-item>

          <t-form-item label="清理阈值">
            <t-input-number
              v-model="configForm.cleanupThresholdPercent"
              :min="50"
              :max="99"
              :step="5"
              placeholder="请输入清理阈值"
            />
            <template #help>
              <span class="help-text">存储达到此百分比时触发自动清理（50% - 99%）</span>
            </template>
          </t-form-item>

          <t-form-item label="每次清理比例">
            <t-input-number
              v-model="configForm.cleanupBatchPercent"
              :min="1"
              :max="20"
              :step="1"
              placeholder="请输入清理比例"
            />
            <template #help>
              <span class="help-text">每次清理最老记录的百分比（1% - 20%）</span>
            </template>
          </t-form-item>

          <t-form-item label="单文件大小上限">
            <t-input-number
              v-model="configForm.maxFileSizeBytes"
              :min="1048576"
              :max="104857600"
              :step="1048576"
              placeholder="请输入文件大小上限"
            />
            <template #help>
              <span class="help-text">单位：字节（1MB - 100MB）</span>
            </template>
          </t-form-item>
        </t-form>

        <div class="config-actions">
          <t-button variant="outline" @click="cancelEdit">取消</t-button>
          <t-button theme="primary" :loading="loading" @click="saveConfig">保存</t-button>
        </div>
      </div>
    </t-card>

    <t-card title="手动清理" class="cleanup-card">
      <template #help>
        仅管理员可执行清理操作
      </template>

      <div class="cleanup-actions" v-if="isAdmin">
        <t-space>
          <t-button
            theme="primary"
            variant="outline"
            :loading="cleanupLoading"
            @click="triggerCleanup(true)"
          >
            模拟清理
          </t-button>
          <t-popconfirm
            content="确定执行清理吗？此操作不可撤销"
            :confirm-btn="{ content: '确认', theme: 'danger' }"
            @confirm="triggerCleanup(false)"
          >
            <t-button theme="danger" :loading="cleanupLoading">
              立即清理
            </t-button>
          </t-popconfirm>
        </t-space>
      </div>

      <t-empty v-else description="仅管理员可执行清理操作" />
    </t-card>
  </div>
</template>

<style lang="scss" scoped>
.parse-result-config {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

.status-card {
  .status-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .status-indicator {
    display: flex;
    justify-content: center;
    padding: 16px 0;
  }

  .usage-ring {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 4px solid;

    &--normal {
      border-color: #2a59a8;
      background: rgba(42, 89, 168, 0.1);
    }

    &--degraded {
      border-color: #ed7b2f;
      background: rgba(237, 123, 47, 0.1);
    }

    &--熔断 {
      border-color: #e34d59;
      background: rgba(227, 77, 89, 0.1);
    }

    &__value {
      font-size: 24px;
      font-weight: bold;
    }

    &__label {
      font-size: 12px;
      color: #666;
    }
  }

  .status-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;

    .stat-item {
      text-align: center;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;

      &__label {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }

      &__value {
        font-size: 18px;
        font-weight: bold;
      }
    }
  }

  .status-progress {
    padding: 0 16px;
  }

  .status-reason {
    margin-top: 8px;
  }

  .status-recommendations {
    background: #f5f5f5;
    padding: 12px;
    border-radius: 8px;

    .recommendations-title {
      font-weight: bold;
      margin-bottom: 8px;
    }

    .recommendations-list {
      margin: 0;
      padding-left: 20px;
      color: #666;

      li {
        margin-bottom: 4px;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .last-cleanup {
    .cleanup-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 12px;
      color: #666;
    }
  }
}

.config-card {
  .config-display {
    padding: 8px 0;
  }

  .config-edit {
    padding: 16px 0;

    .help-text {
      font-size: 12px;
      color: #999;
    }

    .config-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
  }
}

.cleanup-card {
  .cleanup-actions {
    padding: 16px 0;
    display: flex;
    justify-content: center;
  }
}
</style>
