<template>
  <t-dialog
    v-model:visible="visible"
    header="操作确认"
    :confirm-btn="{ content: '确认执行', theme: 'warning' }"
    :cancel-btn="{ content: '取消' }"
    @confirm="$emit('confirm')"
    @close="$emit('cancel')"
    width="480px"
    :close-on-overlay-click="false"
  >
    <div class="tool-confirm-dialog">
      <div class="confirm-warning">
        <t-icon name="error-circle" size="24px" style="color: var(--color-warning)" />
        <span>此操作需要确认</span>
      </div>
      <div class="confirm-message">{{ message }}</div>
      <div v-if="params && Object.keys(params).length > 0" class="confirm-params">
        <div class="params-title">操作参数：</div>
        <div v-for="(value, key) in params" :key="key" class="param-item">
          <span class="param-key">{{ fieldLabels[key] || key }}</span>
          <span class="param-value">{{ value }}</span>
        </div>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";

const props = defineProps<{
  show: boolean;
  message: string;
  toolName?: string;
  params?: Record<string, unknown>;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const visible = ref(false);

watch(() => props.show, (val) => {
  visible.value = val;
});

watch(visible, (val) => {
  if (!val) emit("cancel");
});

const fieldLabels: Record<string, string> = {
  name: "名称",
  salesman_name: "业务员",
  finished_weight: "成品重量(g)",
  ratio_factor: "系数",
  materials: "原料列表",
  description: "描述",
  phone: "手机号",
  region: "区域",
  code: "编码",
  unit: "单位",
  stock: "库存",
  id: "ID",
};
</script>

<style scoped lang="scss">
.tool-confirm-dialog {
  .confirm-warning {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .confirm-message {
    padding: 12px 16px;
    background: var(--color-warning-bg);
    border: 1px solid var(--color-warning);
    border-radius: 8px;
    color: var(--color-warning-dark);
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .confirm-params {
    .params-title {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin-bottom: 8px;
    }

    .param-item {
      display: flex;
      justify-content: space-between;
      padding: var(--space-1-5) 0;
      border-bottom: 1px solid var(--color-border-light);
      font-size: 13px;

      .param-key {
        color: var(--color-text-secondary);
      }

      .param-value {
        color: var(--color-text-primary);
        font-weight: 500;
      }
    }
  }
}
</style>
