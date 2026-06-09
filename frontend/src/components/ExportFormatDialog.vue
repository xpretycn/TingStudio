<script setup lang="ts">
import { ref } from "vue";

interface Props {
  visible: boolean;
  reportTitle?: string;
}

withDefaults(defineProps<Props>(), {
  reportTitle: "",
});

const emit = defineEmits<{
  (e: "update:visible", value: boolean): void;
  (e: "confirm", format: "pdf" | "excel"): void;
}>();

const selectedFormat = ref<"pdf" | "excel">("excel");
const exporting = ref(false);

const formats = [
  {
    value: "excel" as const,
    label: "Excel 格式",
    desc: "适合数据分析和二次处理",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>`,
  },
  {
    value: "pdf" as const,
    label: "PDF 格式",
    desc: "适合打印和存档",
    icon: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <path d="M9 15v-2h2a1 1 0 0 1 1 1v0a1 1 0 0 1-1 1H9z"/>
      <path d="M9 13h4"/>
    </svg>`,
  },
];

function handleExport() {
  exporting.value = true;
  emit("confirm", selectedFormat.value);
  setTimeout(() => {
    exporting.value = false;
    emit("update:visible", false);
  }, 500);
}
</script>

<template>
  <t-dialog :visible="visible" header="导出报告" :footer="false" width="360px"
    @update:visible="(val: boolean) => emit('update:visible', val)">
    <div class="export-format-content">
      <div v-if="reportTitle" class="export-title">{{ reportTitle }}</div>
      <div class="export-format-options">
        <div v-for="format in formats" :key="format.value" class="format-option"
          :class="{ selected: selectedFormat === format.value }" @click="selectedFormat = format.value">
          <div class="format-icon" v-html="format.icon"></div>
          <div class="format-info">
            <span class="format-name">{{ format.label }}</span>
            <span class="format-desc">{{ format.desc }}</span>
          </div>
          <div v-if="selectedFormat === format.value" class="format-check">
            <t-icon name="check-circle-filled" />
          </div>
        </div>
      </div>
      <div class="export-actions">
        <t-button variant="outline" @click="emit('update:visible', false)">取消</t-button>
        <t-button theme="primary" :loading="exporting" @click="handleExport">
          确认导出
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>

<style scoped lang="scss">
.export-format-content {
  padding: 8px 0;
}

.export-title {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border-light);
}

.export-format-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.format-option {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  &.selected {
    border-color: var(--color-info);
    background: var(--color-info-bg);
  }

  .format-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    background: var(--color-bg-page);
    border-radius: 8px;
    color: var(--color-text-regular);
    margin-right: 16px;

    .selected & {
      background: var(--color-primary);
      color: var(--color-text-white);
    }
  }

  .format-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .format-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-primary);
    }

    .format-desc {
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  }

  .format-check {
    color: var(--color-info);
    font-size: 20px;
  }
}

.export-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
