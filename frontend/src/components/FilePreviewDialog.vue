<template>
  <t-dialog v-model:visible="dialogVisible" :footer="false" :close-on-overlay-click="true" :close-on-esc-keydown="true"
    width="90vw" placement="center" class="file-preview-dialog" @close="handleClose">
    <template #header>
      <div class="dialog-header">
        <div class="dialog-header-left">
          <t-icon name="file-icon" class="dialog-file-icon" />
          <span class="dialog-filename">{{ fileName }}</span>
          <t-tag v-if="fileType" size="small" :theme="fileType === 'formula' ? 'primary' : 'success'" variant="light">{{
            fileType === 'formula' ? '配方' : '原料' }}</t-tag>
        </div>
        <!-- <button class="dialog-close-btn" @click="handleClose">
          <t-icon name="close" size="20px" />
        </button> -->
      </div>
    </template>

    <div class="dialog-body">
      <div v-if="previewLoading" class="preview-loading">
        <t-loading size="medium" text="正在加载预览..." />
      </div>

      <div v-else-if="previewData" class="preview-content">
        <template v-if="previewData.type === 'excel'">
          <div v-if="previewData.sheets && previewData.sheets.length > 0" class="excel-preview">
            <div v-if="previewData.sheets.length > 1" class="sheet-tabs">
              <button v-for="(sheet, idx) in previewData.sheets" :key="idx" class="sheet-tab"
                :class="{ 'sheet-tab--active': activeSheet === idx }" @click="switchSheet(idx)">
                {{ sheet.name }}
              </button>
            </div>
            <div v-if="currentSheet" class="sheet-content">
              <div class="table-wrapper">
                <table class="preview-table">
                  <thead>
                    <tr>
                      <th class="row-num-col">#</th>
                      <th v-for="(header, hi) in currentSheet.headers" :key="hi">{{ header }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, ri) in currentSheet.rows" :key="ri" :class="{ 'row-even': ri % 2 === 1 }">
                      <td class="row-num-col">{{ ri + 1 }}</td>
                      <td v-for="(cell, ci) in row" :key="ci" :class="{ 'cell-number': typeof cell === 'number' }">{{
                        cell ?? '' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <t-empty v-else description="无可用的工作表数据" />
        </template>

        <template v-else-if="previewData.type === 'image'">
          <div class="image-preview" @mousedown="startDrag" @mousemove="onDrag" @mouseup="stopDrag"
            @mouseleave="stopDrag" @wheel.prevent="onWheel">
            <img v-if="previewData.url" :src="previewData.url" :alt="fileName" class="preview-image"
              :style="{ transform: `scale(${imgScale}) translate(${imgTx}px, ${imgTy}px)` }" />
            <t-empty v-else description="图片加载失败" />
          </div>
          <div class="image-toolbar">
            <button class="img-ctrl-btn" @click="zoomOut"><t-icon name="remove" size="14px" /></button>
            <span class="img-scale-label">{{ Math.round(imgScale * 100) }}%</span>
            <button class="img-ctrl-btn" @click="zoomIn"><t-icon name="add" size="14px" /></button>
            <button class="img-ctrl-btn" @click="resetZoom"><t-icon name="fullscreen-2" size="14px" /></button>
          </div>
        </template>
      </div>

      <div v-else class="preview-empty">
        <t-icon name="file-unknown" size="48px" style="color: var(--color-text-placeholder)" />
        <p>该文件格式暂不支持预览</p>
        <t-button theme="primary" size="small" @click="handleDownload">下载文件</t-button>
      </div>
    </div>

    <div class="dialog-footer">
      <div class="footer-left">
        <t-tag v-if="previewData?.truncated" theme="warning" variant="light" size="small">
          仅展示前 {{ previewData?.totalRows }} 行，请下载查看完整内容
        </t-tag>
      </div>
      <div class="footer-right">
        <button class="footer-link" @click="goToDetail">查看详情</button>
        <t-button theme="primary" size="small" @click="handleDownload">
          <template #icon><t-icon name="download" /></template>
          下载完整文件
        </t-button>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useFileStore } from '@/stores/file';

const props = defineProps<{
  fileId: string;
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void;
}>();

const router = useRouter();
const fileStore = useFileStore();
const activeSheet = ref(0);
const imgScale = ref(1);
const imgTx = ref(0);
const imgTy = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0, tx: 0, ty: 0 });

const dialogVisible = computed({
  get: () => props.visible,
  set: (val) => emit('update:visible', val),
});

const previewLoading = computed(() => fileStore.previewLoading);
const previewData = computed(() => fileStore.previewData);
const fileName = computed(() => fileStore.currentFile?.originalName || '文件预览');
const fileType = computed(() => fileStore.currentFile?.fileType || null);

const currentSheet = computed(() => {
  const sheets = previewData.value?.sheets;
  if (!sheets || sheets.length === 0) return null;
  return sheets[activeSheet.value] || sheets[0];
});

watch(() => props.visible, async (val) => {
  if (val && props.fileId) {
    activeSheet.value = 0;
    imgScale.value = 1;
    imgTx.value = 0;
    imgTy.value = 0;
    await fileStore.fetchPreview(props.fileId);
  }
});

function switchSheet(idx: number) {
  activeSheet.value = idx;
  fileStore.fetchPreview(props.fileId, { sheet: idx });
}

function handleClose() {
  emit('update:visible', false);
}

function goToDetail() {
  handleClose();
  router.push(`/files/${props.fileId}`);
}

function handleDownload() {
  if (fileStore.currentFile) {
    fileStore.downloadFile(props.fileId, fileStore.currentFile.originalName);
  }
}

function zoomIn() { imgScale.value = Math.min(5, imgScale.value + 0.25); }
function zoomOut() { imgScale.value = Math.max(0.25, imgScale.value - 0.25); }
function resetZoom() { imgScale.value = 1; imgTx.value = 0; imgTy.value = 0; }

function startDrag(e: MouseEvent) {
  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY, tx: imgTx.value, ty: imgTy.value };
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  imgTx.value = dragStart.value.tx + (e.clientX - dragStart.value.x);
  imgTy.value = dragStart.value.ty + (e.clientY - dragStart.value.y);
}

function stopDrag() { isDragging.value = false; }

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  imgScale.value = Math.min(5, Math.max(0.25, imgScale.value + delta));
}
</script>

<style scoped lang="scss">
.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 8px;

  .dialog-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);

    .dialog-file-icon {
      color: var(--color-primary);
      font-size: 18px;
    }

    .dialog-filename {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .dialog-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text-placeholder);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
      color: var(--color-text-secondary);
    }
  }
}

.dialog-body {
  min-height: 60vh;
  max-height: 75vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.preview-loading,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: var(--color-text-placeholder);
  font-size: 14px;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.excel-preview {
  flex: 1;
  display: flex;
  flex-direction: column;

  .sheet-tabs {
    display: flex;
    gap: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
    padding-bottom: 8px;
    flex-shrink: 0;
  }

  .sheet-tab {
    padding: var(--space-1-5) 16px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: #fff;
    color: var(--color-text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-page);
      border-color: #cbd5e1;
    }

    &--active {
      background: #ecfdf5;
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
      font-weight: 600;
    }
  }

  .sheet-content {
    flex: 1;
    overflow: hidden;
  }

  .table-wrapper {
    overflow: auto;
    max-height: 65vh;
    border: 1px solid #f1f5f9;
    border-radius: 12px;
  }

  .preview-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;

    th {
      background: var(--color-bg-page);
      color: var(--color-text-secondary);
      font-weight: 600;
      text-align: left;
      padding: var(--space-2-5) var(--space-3-5);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .row-num-col {
      position: sticky;
      left: 0;
      background: var(--color-bg-page);
      color: var(--color-text-placeholder);
      font-size: 12px;
      text-align: center;
      width: 50px;
      min-width: 50px;
      z-index: 1;
    }

    th.row-num-col {
      z-index: 3;
    }

    td {
      padding: 8px var(--space-3-5);
      border-bottom: 1px solid var(--color-bg-page);
      color: var(--color-text-primary);
      white-space: nowrap;
    }

    .cell-number {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }

    .row-even td {
      background: #fafbfc;
    }

    tbody tr:hover td {
      background: #ecfdf5;
    }
  }
}

.image-preview {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  cursor: grab;
  user-select: none;
  overflow: hidden;

  &:active {
    cursor: grabbing;
  }

  .preview-image {
    max-width: 100%;
    max-height: 65vh;
    object-fit: contain;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    transition: transform 0.2s ease;
    pointer-events: none;
  }
}

.image-toolbar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 0 4px;
  flex-shrink: 0;

  .img-ctrl-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: #fff;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  .img-scale-label {
    font-size: 12px;
    color: var(--color-text-placeholder);
    min-width: 40px;
    text-align: center;
  }
}

.dialog-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  margin-top: auto;

  .footer-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .footer-link {
    background: none;
    border: none;
    color: var(--color-primary);
    font-size: 13px;
    cursor: pointer;
    text-decoration: underline;
    transition: color 0.2s;

    &:hover {
      color: var(--color-primary-dark);
    }
  }
}
</style>

<style>
.file-preview-dialog .t-dialog {
  border-radius: var(--radius-4xl) !important;
  max-height: 85vh !important;
  display: flex !important;
  flex-direction: column !important;
  animation: dialogPopIn 0.2s ease !important;
}

@keyframes dialogPopIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }

  to {
    opacity: 1;
    transform: scale(1);
  }
}

.file-preview-dialog .t-dialog__body {
  flex: 1 !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
}
</style>
