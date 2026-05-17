<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { parseResultApi } from '@/api/parseResult';

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  triggeredAt: string;
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

const props = defineProps<{
  visible?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'acknowledge', alert: Alert): void;
}>();

const alerts = ref<Alert[]>([]);
const loading = ref(false);
const lastUpdate = ref<string | null>(null);
let refreshTimer: number | null = null;

const isVisible = computed({
  get: () => props.visible ?? true,
  set: (val) => emit('update:visible', val),
});

const criticalAlerts = computed(() => {
  return alerts.value.filter(a => a.severity === 'critical' && !a.acknowledged);
});

const errorAlerts = computed(() => {
  return alerts.value.filter(a => a.severity === 'error' && !a.acknowledged);
});

const warningAlerts = computed(() => {
  return alerts.value.filter(a => a.severity === 'warning' && !a.acknowledged);
});

const hasActiveAlerts = computed(() => {
  return alerts.value.some(a => !a.acknowledged);
});

const alertSummary = computed(() => {
  return {
    critical: criticalAlerts.value.length,
    error: errorAlerts.value.length,
    warning: warningAlerts.value.length,
    total: alerts.value.filter(a => !a.acknowledged).length,
  };
});

async function fetchAlerts() {
  try {
    loading.value = true;
    const res = await parseResultApi.getAlerts();
    alerts.value = res.alerts || [];
    lastUpdate.value = new Date().toLocaleTimeString();
  } catch (error) {
    console.error('[AlertNotification] Error fetching alerts:', error);
  } finally {
    loading.value = false;
  }
}

function handleAcknowledge(alert: Alert) {
  emit('acknowledge', alert);
  fetchAlerts();
}

function dismiss() {
  isVisible.value = false;
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'critical':
      return 'error-circle-filled';
    case 'error':
      return 'close-circle-filled';
    case 'warning':
      return 'warning-filled';
    default:
      return 'info-circle-filled';
  }
}

function getSeverityTheme(severity: string) {
  switch (severity) {
    case 'critical':
      return 'danger';
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

function formatTime(time: string) {
  const date = new Date(time);
  return date.toLocaleString();
}

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
  if (props.autoRefresh && props.refreshInterval) {
    refreshTimer = window.setInterval(fetchAlerts, props.refreshInterval);
  }
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

watch(() => props.autoRefresh, (newVal) => {
  if (newVal) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

onMounted(() => {
  fetchAlerts();
  if (props.autoRefresh) {
    startAutoRefresh();
  }
});
</script>

<template>
  <t-card class="alert-notification" v-if="isVisible && hasActiveAlerts">
    <template #header>
      <div class="notification-header">
        <div class="header-title">
          <t-badge :count="alertSummary.total" :max-count="99">
            <span>告警通知</span>
          </t-badge>
        </div>
        <div class="header-actions">
          <span class="last-update" v-if="lastUpdate">更新于 {{ lastUpdate }}</span>
          <t-button size="small" variant="text" @click="fetchAlerts" :loading="loading">
            刷新
          </t-button>
          <t-button size="small" variant="text" @click="dismiss">
            收起
          </t-button>
        </div>
      </div>
    </template>

    <div class="alert-list">
      <t-alert
        v-for="alert in criticalAlerts"
        :key="alert.id"
        :theme="getSeverityTheme(alert.severity) as any"
        :title="alert.ruleName"
        :content="alert.message"
        class="alert-item"
      >
        <template #icon>
          <t-icon :name="getSeverityIcon(alert.severity)" />
        </template>
        <template #operation>
          <t-button size="small" variant="text" @click="handleAcknowledge(alert)">
            确认
          </t-button>
        </template>
      </t-alert>

      <t-alert
        v-for="alert in errorAlerts"
        :key="alert.id"
        :theme="getSeverityTheme(alert.severity) as any"
        :title="alert.ruleName"
        :content="alert.message"
        class="alert-item"
      >
        <template #icon>
          <t-icon :name="getSeverityIcon(alert.severity)" />
        </template>
        <template #operation>
          <t-button size="small" variant="text" @click="handleAcknowledge(alert)">
            确认
          </t-button>
        </template>
      </t-alert>

      <t-alert
        v-for="alert in warningAlerts"
        :key="alert.id"
        :theme="getSeverityTheme(alert.severity) as any"
        :title="alert.ruleName"
        :content="alert.message"
        class="alert-item"
      >
        <template #icon>
          <t-icon :name="getSeverityIcon(alert.severity)" />
        </template>
        <template #operation>
          <t-button size="small" variant="text" @click="handleAcknowledge(alert)">
            确认
          </t-button>
        </template>
      </t-alert>
    </div>

    <template #footer>
      <div class="notification-footer">
        <span class="footer-info">
          共 {{ alertSummary.total }} 个活跃告警
        </span>
      </div>
    </template>
  </t-card>
</template>

<style lang="scss" scoped>
.alert-notification {
  margin-bottom: 16px;

  .notification-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-title {
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;

      .last-update {
        font-size: 12px;
        color: #999;
      }
    }
  }

  .alert-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;

    .alert-item {
      margin-bottom: 0;
    }
  }

  .notification-footer {
    text-align: center;
    font-size: 12px;
    color: #999;
  }
}
</style>
