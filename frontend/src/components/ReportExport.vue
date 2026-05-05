<template>
  <div class="report-export-bar">
    <div class="export-buttons">
      <t-button
        variant="outline"
        :loading="pdfLoading"
        @click="handleExportPdf"
      >
        <template #icon><t-icon name="file-pdf" /></template>
        导出 PDF
      </t-button>
      <t-button
        variant="outline"
        :loading="excelLoading"
        @click="handleExportExcel"
      >
        <template #icon><t-icon name="file-excel" /></template>
        导出 Excel
      </t-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useReportStore } from '@/stores/report'

const props = defineProps<{
  reportId: string
  reportTitle?: string
}>()

const emit = defineEmits<{
  (e: 'export-pdf', id: string): void
  (e: 'export-excel', id: string): void
}>()

const reportStore = useReportStore()

const pdfLoading = ref(false)
const excelLoading = ref(false)

const handleExportPdf = async () => {
  pdfLoading.value = true
  try {
    await reportStore.exportPdf(props.reportId)
    emit('export-pdf', props.reportId)
  } finally {
    pdfLoading.value = false
  }
}

const handleExportExcel = async () => {
  excelLoading.value = true
  try {
    await reportStore.exportExcel(props.reportId)
    emit('export-excel', props.reportId)
  } finally {
    excelLoading.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.report-export-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.export-buttons {
  display: flex;
  gap: 8px;

  :deep(.t-button) {
    border-radius: 10px;
    font-weight: 600;
    transition: all 0.15s ease;

    &:hover {
      transform: translateY(-1px);
    }

    &:active {
      transform: scale(0.96);
    }
  }
}
</style>
