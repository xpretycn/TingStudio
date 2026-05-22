<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { parseResultApi } from '@/api/parseResult';

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
}

const props = defineProps<{
  visible?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'config-click'): void;
}>();

const degradationInfo = ref<DegradationInfo | null>(null);
const loading = ref(false);
const collapsed = ref(false);

const isVisible = computed({
  get: () => props.visible ?? true,
  set: (val) => emit('update:visible', val),
});

const isDegraded = computed(() => {
  return degradationInfo.value?.level === 'degraded' || degradationInfo.value?.level === '熔断';
});

const theme = computed(() => {
  switch (degradationInfo.value?.level) {
    case '熔断':
      return 'error';
    case 'degraded':
      return 'warning';
    default:
      return 'success';
  }
});

const levelText = computed(() => {
  switch (degradationInfo.value?.level) {
    case '熔断':
      return '熔断保护';
    case 'degraded':
      return '性能降级';
    default:
      return '正常运行';
  }
});

const levelIcon = computed(() => {
  switch (degradationInfo.value?.level) {
    case '熔断':
      return 'error-circle-filled';
    case 'degraded':
      return 'warning-filled';
    default:
      return 'check-circle-filled';
  }
});

async function fetchDegradation() {
  try {
    loading.value = true;
    const res = await parseResultApi.getDegradation();
    degradationInfo.value = res;
  } catch (error) {
    console.error('[DegradationBanner] Error fetching degradation info:', error);
  } finally {
    loading.value = false;
  }
}

function handleConfigClick() {
  emit('config-click');
}

function dismiss() {
  isVisible.value = false;
}

onMounted(() => {
  fetchDegradation();
});
</script>

<template>
  <t-alert
    v-if="isVisible && isDegraded"
    :theme="theme"
    :title="levelText"
    :closeable="true"
    @close="dismiss"
    class="degradation-banner"
  >
    <template #icon>
      <t-icon :name="levelIcon" />
    </template>

    <div class="banner-content">
      <div class="banner-reason">
        {{ degradationInfo?.reason }}
      </div>

      <div class="banner-stats" v-if="degradationInfo?.systemStatus">
        <span class="stat-item">
          使用率：{{ degradationInfo.systemStatus.usagePercent }}%
        </span>
        <span class="stat-item">
          记录数：{{ degradationInfo.systemStatus.totalCount }} / {{ degradationInfo.systemStatus.storageLimit }}
        </span>
      </div>

      <div class="banner-recommendations" v-if="degradationInfo?.recommendations?.length && !collapsed">
        <div class="recommendations-title">建议：</div>
        <ul class="recommendations-list">
          <li v-for="(rec, index) in degradationInfo.recommendations" :key="index">
            {{ rec }}
          </li>
        </ul>
      </div>

      <div class="banner-actions">
        <t-button
          v-if="degradationInfo?.recommendations?.length"
          size="small"
          variant="text"
          @click="collapsed = !collapsed"
        >
          {{ collapsed ? '查看建议' : '收起' }}
        </t-button>
        <t-button size="small" variant="outline" @click="handleConfigClick">
          前往配置
        </t-button>
      </div>
    </div>
  </t-alert>
</template>

<style lang="scss" scoped>
.degradation-banner {
  margin-bottom: 16px;

  .banner-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .banner-reason {
    font-size: 14px;
    line-height: 1.5;
  }

  .banner-stats {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: #666;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }

  .banner-recommendations {
    background: rgba(255, 255, 255, 0.5);
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 13px;

    .recommendations-title {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .recommendations-list {
      margin: 0;
      padding-left: 16px;
      color: #555;

      li {
        margin-bottom: var(--space-0-5);

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  }

  .banner-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }
}
</style>
