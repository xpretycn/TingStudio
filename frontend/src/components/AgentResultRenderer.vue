<template>
  <div class="agent-result-renderer">
    <template v-if="displayType === 'table'">
      <div class="result-table-wrapper">
        <t-table
          :data="tableData"
          :columns="tableColumns"
          :max-height="300"
          size="small"
          stripe
          bordered
        />
        <div v-if="tableData.length > 0" class="result-meta">
          共 {{ tableData.length }} 条记录
        </div>
      </div>
    </template>

    <template v-else-if="displayType === 'card'">
      <div class="result-cards">
        <div v-for="(item, index) in cardItems" :key="index" class="result-card">
          <div class="card-label">{{ item.label }}</div>
          <div class="card-value">{{ item.value }}</div>
        </div>
      </div>
    </template>

    <template v-else-if="displayType === 'toast'">
      <div class="result-toast" :class="{ success: isSuccess, error: !isSuccess }">
        <t-icon :name="isSuccess ? 'check-circle' : 'close-circle'" size="20px" />
        <span>{{ isSuccess ? '操作成功' : '操作失败' }}</span>
      </div>
    </template>

    <template v-else>
      <div class="result-default">
        <pre v-if="typeof data === 'object'">{{ JSON.stringify(data, null, 2) }}</pre>
        <span v-else>{{ data }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  displayType: string;
  data: any;
  isSuccess?: boolean;
}>();

const tableData = computed(() => {
  if (Array.isArray(props.data)) return props.data;
  if (props.data?.rows && Array.isArray(props.data.rows)) return props.data.rows;
  if (props.data?.data && Array.isArray(props.data.data)) return props.data.data;
  return [];
});

const tableColumns = computed(() => {
  const first = tableData.value[0];
  if (!first || typeof first !== "object") return [];
  return Object.keys(first).map((key) => ({
    colKey: key,
    title: key,
    ellipsis: true,
    width: 150,
  }));
});

const cardItems = computed(() => {
  if (!props.data || typeof props.data !== "object") return [];
  if (Array.isArray(props.data)) {
    return props.data.map((item: any, i: number) => ({
      label: item.label || item.name || `项目 ${i + 1}`,
      value: item.value ?? item.amount ?? JSON.stringify(item),
    }));
  }
  return Object.entries(props.data).map(([key, value]) => ({
    label: key,
    value: typeof value === "object" ? JSON.stringify(value) : String(value),
  }));
});
</script>

<style scoped lang="scss">
.agent-result-renderer {
  margin: 8px 0;

  .result-table-wrapper {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;

    .result-meta {
      padding: 6px 12px;
      background: #f8fafc;
      font-size: 12px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
  }

  .result-cards {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;

    .result-card {
      padding: 10px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      min-width: 120px;

      .card-label {
        font-size: 12px;
        color: #64748b;
        margin-bottom: 4px;
      }

      .card-value {
        font-size: 16px;
        font-weight: 600;
        color: #1e293b;
      }
    }
  }

  .result-toast {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;

    &.success {
      background: #ecfdf5;
      color: #059669;
    }

    &.error {
      background: #fef2f2;
      color: #dc2626;
    }
  }

  .result-default {
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 8px;
    font-size: 13px;
    color: #475569;

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-all;
      font-size: 12px;
    }
  }
}
</style>
