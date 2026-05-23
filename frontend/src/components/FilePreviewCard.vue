<template>
  <div class="file-preview-card">
    <div class="preview-toolbar">
      <div class="toolbar-left">
        <t-icon name="browse" class="toolbar-icon" />
        <span class="toolbar-title">文件预览</span>
      </div>
      <div class="toolbar-right">
        <template v-if="previewData?.type === 'excel' && previewData.sheets && previewData.sheets.length > 1">
          <div class="sheet-tabs-inline">
            <button v-for="(sheet, idx) in previewData.sheets" :key="idx" class="sheet-tab-sm"
              :class="{ 'sheet-tab-sm--active': activeSheet === idx }" @click="switchSheet(idx)">
              {{ sheet.name }}
            </button>
          </div>
        </template>
        <template v-if="previewData?.type === 'image'">
          <button class="toolbar-btn" @click="zoomIn" title="放大">
            <t-icon name="zoom-in" size="16px" />
          </button>
          <button class="toolbar-btn" @click="zoomOut" title="缩小">
            <t-icon name="zoom-out" size="16px" />
          </button>
          <button class="toolbar-btn" @click="resetZoom" title="适应宽度">
            <t-icon name="fullscreen-2" size="16px" />
          </button>
        </template>
        <!-- <button class="toolbar-btn" @click="openFullscreen" title="全屏预览">
          <t-icon name="fullscreen" size="16px" />
        </button> -->
        <button class="toolbar-btn" @click="toggleCollapse" :title="collapsed ? '展开' : '收起'">
          <t-icon :name="collapsed ? 'chevron-down' : 'chevron-up'" size="16px" />
        </button>
      </div>
    </div>

    <div v-if="!collapsed" class="preview-body" :style="{ height: previewHeight + 'px' }">
      <div v-if="previewLoading" class="preview-loading">
        <t-loading size="medium" text="正在加载预览..." />
      </div>

      <div v-else-if="previewError" class="preview-error">
        <t-icon name="close-circle" size="32px" style="color: var(--color-danger)" />
        <p>预览加载失败</p>
        <t-button size="small" @click="loadPreview">重试</t-button>
      </div>

      <div v-else-if="previewData" class="preview-content">
        <template v-if="previewData.type === 'excel'">
          <div v-if="currentSheet" class="excel-preview-inline">
            <div v-if="previewData.truncated" class="truncate-notice">
              <t-icon name="info-circle" size="14px" />
              仅展示前 {{ previewData.totalRows }} 行，请下载查看完整内容
            </div>
            <div class="table-scroll">
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
                    <td v-for="(cell, ci) in row" :key="ci" :class="{ 'cell-number': typeof cell === 'number' }">{{ cell
                      ?? '' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <t-empty v-else description="无可用的工作表数据" />
        </template>

        <template v-else-if="previewData.type === 'image'">
          <div class="image-preview-inline" @mousedown="startDrag" @mousemove="onDrag" @mouseup="stopDrag"
            @mouseleave="stopDrag" @wheel.prevent="onWheel">
            <img v-if="previewData.url" :src="previewData.url" :alt="fileName" class="preview-img"
              :style="{ transform: `scale(${imgScale}) translate(${imgTx}px, ${imgTy}px)` }" @load="onImageLoad" />
          </div>
        </template>
      </div>

      <div v-else class="preview-empty">
        <t-icon name="file-unknown" size="40px" style="color: var(--color-text-placeholder)" />
        <p>该文件格式暂不支持预览</p>
        <t-button size="small" theme="primary" @click="handleDownload">下载文件</t-button>
      </div>
    </div>

    <div v-if="!collapsed" class="preview-resize-handle" @mousedown="startResize"></div>

    <FilePreviewDialog v-model:visible="dialogVisible" :fileId="fileId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useFileStore } from '@/stores/file';
import FilePreviewDialog from './FilePreviewDialog.vue';

const props = defineProps<{
  fileId: string;
}>();

const fileStore = useFileStore();

const activeSheet = ref(0);
const collapsed = ref(false);
const previewHeight = ref(400);
const previewError = ref(false);
const dialogVisible = ref(false);
const imgScale = ref(1);
const imgTx = ref(0);
const imgTy = ref(0);
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0, tx: 0, ty: 0 });
const isResizing = ref(false);
const resizeStart = ref({ y: 0, h: 0 });

const previewLoading = computed(() => fileStore.previewLoading);
const previewData = computed(() => fileStore.previewData);
const fileName = computed(() => fileStore.currentFile?.originalName || '');

const currentSheet = computed(() => {
  const sheets = previewData.value?.sheets;
  if (!sheets || sheets.length === 0) return null;
  return sheets[activeSheet.value] || sheets[0];
});

async function loadPreview() {
  previewError.value = false;
  try {
    const result = await fileStore.fetchPreview(props.fileId, { sheet: activeSheet.value });
    if (!result) previewError.value = true;
  } catch {
    previewError.value = true;
  }
}

function switchSheet(idx: number) {
  activeSheet.value = idx;
  loadPreview();
}

function toggleCollapse() {
  collapsed.value = !collapsed.value;
}

function _openFullscreen() {
  dialogVisible.value = true;
}

function zoomIn() {
  imgScale.value = Math.min(5, imgScale.value + 0.25);
}

function zoomOut() {
  imgScale.value = Math.max(0.25, imgScale.value - 0.25);
}

function resetZoom() {
  imgScale.value = 1;
  imgTx.value = 0;
  imgTy.value = 0;
}

function startDrag(e: MouseEvent) {
  isDragging.value = true;
  dragStart.value = { x: e.clientX, y: e.clientY, tx: imgTx.value, ty: imgTy.value };
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  imgTx.value = dragStart.value.tx + (e.clientX - dragStart.value.x);
  imgTy.value = dragStart.value.ty + (e.clientY - dragStart.value.y);
}

function stopDrag() {
  isDragging.value = false;
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1;
  imgScale.value = Math.min(5, Math.max(0.25, imgScale.value + delta));
}

function onImageLoad() {
  resetZoom();
}

function startResize(e: MouseEvent) {
  isResizing.value = true;
  resizeStart.value = { y: e.clientY, h: previewHeight.value };
  const onMove = (ev: MouseEvent) => {
    if (!isResizing.value) return;
    const diff = ev.clientY - resizeStart.value.y;
    previewHeight.value = Math.min(800, Math.max(200, resizeStart.value.h + diff));
  };
  const onUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function handleDownload() {
  if (fileStore.currentFile) {
    fileStore.downloadFile(props.fileId, fileStore.currentFile.originalName);
  }
}

watch(() => props.fileId, (newId) => {
  if (newId) {
    activeSheet.value = 0;
    loadPreview();
  }
});

onMounted(() => {
  if (props.fileId) loadPreview();
});
</script>

<style scoped lang="scss">
.file-preview-card {
  background: #fff;
  border-radius: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  animation: fadeInUp 0.4s ease;
}

.preview-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .toolbar-icon {
      color: var(--color-primary);
      font-size: 18px;
    }

    .toolbar-title {
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
  }

  .sheet-tabs-inline {
    display: flex;
    gap: 4px;
    margin-right: 8px;
  }

  .sheet-tab-sm {
    padding: 4px 12px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: #fff;
    color: var(--color-text-secondary);
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-page);
    }

    &--active {
      background: #ecfdf5;
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
      font-weight: 600;
    }
  }

  .toolbar-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: #fff;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: var(--color-bg-page);
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
}

.preview-body {
  overflow: hidden;
  position: relative;
  transition: height 0.2s ease;
}

.preview-loading,
.preview-error,
.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  color: var(--color-text-placeholder);
  font-size: 14px;
}

.preview-content {
  height: 100%;
  overflow: hidden;
}

.excel-preview-inline {
  height: 100%;
  display: flex;
  flex-direction: column;

  .truncate-notice {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px 16px;
    background: #fffbeb;
    color: #b45309;
    font-size: 12px;
    border-bottom: 1px solid #fef3c7;
  }

  .table-scroll {
    flex: 1;
    overflow: auto;
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

.image-preview-inline {
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-page);
  user-select: none;

  &:active {
    cursor: grabbing;
  }

  .preview-img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    transition: transform 0.2s ease;
    pointer-events: none;
  }
}

.preview-resize-handle {
  height: 6px;
  background: transparent;
  cursor: ns-resize;
  position: relative;

  &::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 40px;
    height: 3px;
    border-radius: var(--radius-2xs);
    background: var(--color-border);
    transition: background 0.2s;
  }

  &:hover::after {
    background: var(--color-primary);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
