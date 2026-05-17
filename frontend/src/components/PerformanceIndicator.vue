<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { parseResultApi } from '@/api/parseResult';

interface MetricsData {
  totalParseRequests: number;
  successfulRequests: number;
  failedRequests: number;
  pendingRequests: number;
  successRate: number;
  averageTokensUsed: number;
  totalTokensUsed: number;
  cacheHitRate: number;
  cacheHits: number;
  cacheMisses: number;
  storageUsage: {
    current: number;
    limit: number;
    percentage: number;
  };
  modelUsage: Array<{
    provider: string;
    modelName: string;
    count: number;
    percentage: number;
  }>;
  timeRange: {
    start: string;
    end: string;
  };
}

interface Alert {
  id: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
}

const loading = ref(false);
const metrics = ref<MetricsData | null>(null);
const alerts = ref<Alert[]>([]);
const dateRange = ref<[string, string]>(['', '']);

const activeAlertCount = computed(() => {
  return alerts.value.filter(a => a.severity === 'error' || a.severity === 'critical').length;
});

async function fetchMetrics() {
  try {
    loading.value = true;
    const res = await parseResultApi.getMetrics(dateRange.value[0] || undefined, dateRange.value[1] || undefined);
    metrics.value = res;
  } catch (error) {
    console.error('[PerformanceIndicator] Error fetching metrics:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchAlerts() {
  try {
    const res = await parseResultApi.getAlerts();
    alerts.value = res.alerts || [];
  } catch (error) {
    console.error('[PerformanceIndicator] Error fetching alerts:', error);
  }
}

function handleDateChange(value: [string, string]) {
  dateRange.value = value;
  fetchMetrics();
}

onMounted(() => {
  fetchMetrics();
  fetchAlerts();
});
</script>

<template>
  <div class="performance-indicator">
    <div class="indicator-header">
      <h3>性能指标</h3>
      <t-date-range-picker
        v-model="dateRange"
        :placeholder="['开始日期', '结束日期']"
        allow-input
        clearable
        @change="handleDateChange"
      />
    </div>

    <t-loading v-if="loading" />

    <div v-else-if="metrics" class="indicator-content">
      <div class="alerts-section" v-if="alerts.length > 0">
        <div class="alerts-header">
          <t-badge :count="activeAlertCount" :max-count="99">
            <span>活跃告警</span>
          </t-badge>
        </div>
        <div class="alerts-list">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="alert-item"
            :class="'alert-item--' + alert.severity"
          >
            <div class="alert-icon">
              <t-icon :name="alert.severity === 'critical' ? 'error-circle-filled' : 'warning-filled'" />
            </div>
            <div class="alert-content">
              <div class="alert-title">{{ alert.ruleName }}</div>
              <div class="alert-message">{{ alert.message }}</div>
              <div class="alert-meta">
                当前值: {{ alert.currentValue }} | 阈值: {{ alert.threshold }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="metric-card metric-card--success">
          <div class="metric-icon">✓</div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.successRate.toFixed(1) }}%</div>
            <div class="metric-label">成功率</div>
          </div>
        </div>

        <div class="metric-card metric-card--cache">
          <div class="metric-icon">⚡</div>
          <div class="metric-content">
            <div class="metric-value">{{ metrics.cacheHitRate.toFixed(1) }}%</div>
            <div class="metric-label">缓存命中率</div>
          </div>
        </div>

        <div class="metric-card metric-card--tokens">
          <div class="metric-icon">💎</div>
          <div class="metric-content">
            <div class="metric-value">{{ formatNumber(metrics.totalTokensUsed) }}</div>
            <div class="metric-label">总 Token 消耗</div>
          </div>
        </div>

        <div class="metric-card metric-card--requests">
          <div class="metric-icon">📊</div>
          <div class="metric-content">
            <div class="metric-value">{{ formatNumber(metrics.totalParseRequests) }}</div>
            <div class="metric-label">解析请求总数</div>
          </div>
        </div>
      </div>

      <div class="storage-section">
        <h4>存储使用</h4>
        <div class="storage-bar">
          <t-progress
            :percentage="metrics.storageUsage.percentage"
            :color="metrics.storageUsage.percentage >= 95 ? '#e34d59' : metrics.storageUsage.percentage >= 80 ? '#ed7b2f' : '#2a59a8'"
            :track-color="'#e8e8e8'"
            :label="false"
          />
        </div>
        <div class="storage-info">
          <span>{{ metrics.storageUsage.current }} / {{ metrics.storageUsage.limit }}</span>
          <span>{{ metrics.storageUsage.percentage.toFixed(1) }}%</span>
        </div>
      </div>

      <div class="model-usage-section" v-if="metrics.modelUsage.length > 0">
        <h4>模型使用统计</h4>
        <div class="model-list">
          <div
            v-for="model in metrics.modelUsage"
            :key="model.provider + model.modelName"
            class="model-item"
          >
            <div class="model-info">
              <span class="model-provider">{{ model.provider }}</span>
              <span class="model-name">{{ model.modelName }}</span>
            </div>
            <div class="model-stats">
              <span class="model-count">{{ model.count }} 次</span>
              <span class="model-percent">{{ model.percentage.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <div class="stats-summary">
        <div class="stat-row">
          <span class="stat-label">成功请求</span>
          <span class="stat-value stat-value--success">{{ metrics.successfulRequests }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">失败请求</span>
          <span class="stat-value stat-value--error">{{ metrics.failedRequests }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">待处理</span>
          <span class="stat-value stat-value--pending">{{ metrics.pendingRequests }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">平均 Token/请求</span>
          <span class="stat-value">{{ metrics.averageTokensUsed.toFixed(0) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">缓存命中</span>
          <span class="stat-value stat-value--success">{{ metrics.cacheHits }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">缓存未命中</span>
          <span class="stat-value stat-value--error">{{ metrics.cacheMisses }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}
</script>

<style lang="scss" scoped>
.performance-indicator {
  background: #fff;
  border-radius: 8px;
  padding: 16px;

  .indicator-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .alerts-section {
    margin-bottom: 16px;

    .alerts-header {
      margin-bottom: 8px;
      font-weight: 500;
    }

    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .alert-item {
      display: flex;
      gap: 8px;
      padding: 8px 12px;
      border-radius: 4px;

      &--critical {
        background: rgba(227, 77, 89, 0.1);
        border-left: 3px solid #e34d59;
      }

      &--error {
        background: rgba(238, 70, 70, 0.1);
        border-left: 3px solid #ee4648;
      }

      &--warning {
        background: rgba(237, 123, 47, 0.1);
        border-left: 3px solid #ed7b2f;
      }

      &--info {
        background: rgba(42, 89, 168, 0.1);
        border-left: 3px solid #2a59a8;
      }

      .alert-icon {
        font-size: 16px;
      }

      .alert-content {
        flex: 1;

        .alert-title {
          font-weight: 500;
          margin-bottom: 2px;
        }

        .alert-message {
          font-size: 13px;
          color: #666;
        }

        .alert-meta {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }
      }
    }
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 16px;

    .metric-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-radius: 8px;
      background: #f5f5f5;

      .metric-icon {
        font-size: 24px;
      }

      .metric-value {
        font-size: 20px;
        font-weight: bold;
      }

      .metric-label {
        font-size: 12px;
        color: #666;
      }

      &--success {
        background: rgba(42, 89, 168, 0.1);
        color: #2a59a8;
      }

      &--cache {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }

      &--tokens {
        background: rgba(139, 92, 246, 0.1);
        color: #8b5cf6;
      }

      &--requests {
        background: rgba(236, 72, 153, 0.1);
        color: #ec4899;
      }
    }
  }

  .storage-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .storage-bar {
      margin-bottom: 4px;
    }

    .storage-info {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: #666;
    }
  }

  .model-usage-section {
    margin-bottom: 16px;

    h4 {
      margin: 0 0 8px 0;
      font-size: 14px;
      font-weight: 500;
    }

    .model-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .model-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;

      .model-info {
        display: flex;
        gap: 8px;
        align-items: center;

        .model-provider {
          font-size: 12px;
          color: #666;
          background: #e8e8e8;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .model-name {
          font-weight: 500;
        }
      }

      .model-stats {
        display: flex;
        gap: 12px;
        font-size: 13px;

        .model-count {
          color: #666;
        }

        .model-percent {
          font-weight: 500;
          color: #2a59a8;
        }
      }
    }
  }

  .stats-summary {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;

      &:last-child {
        border-bottom: none;
      }

      .stat-label {
        color: #666;
      }

      .stat-value {
        font-weight: 500;

        &--success {
          color: #10b981;
        }

        &--error {
          color: #e34d59;
        }

        &--pending {
          color: #f59e0b;
        }
      }
    }
  }
}
</style>
