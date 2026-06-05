<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { MessagePlugin } from "tdesign-vue-next"
import {
  getBackupList,
  createBackup,
  downloadBackup,
  restoreBackup,
  deleteBackup,
  uploadAndRestore,
} from "@/api/db"
import type { BackupInfo } from "@/api/db"
import { formatTimestamp, formatCompact } from "@/utils/timeFormat"

const backups = ref<BackupInfo[]>([])
const loading = ref(false)
const creatingBackup = ref(false)
const createDialogVisible = ref(false)
const restoringFile = ref("")
const uploadLoading = ref(false)
const uploadFileName = ref("")
const uploadFileRaw = ref<File | null>(null)
const uploadPopVisible = ref(false)

const columns = [
  { colKey: "fileName", title: "文件名", width: 260, ellipsis: true },
  { colKey: "fileSizeFormatted", title: "大小", width: 100 },
  { colKey: "createdAt", title: "创建时间", width: 180 },
  { colKey: "tableCount", title: "表数", width: 80, align: "center" as const },
  { colKey: "totalRows", title: "行数", width: 100, align: "right" as const },
  { colKey: "hash", title: "校验码", width: 140 },
  { colKey: "op", title: "操作", width: 220, fixed: "right" as const },
]

const hasBackups = computed(() => backups.value.length > 0)

function formatHash(hash: string): string {
  if (!hash) return "--"
  return hash.length > 16 ? hash.substring(0, 16) + "..." : hash
}

function formatTotalRows(rows: number): string {
  return formatCompact(rows)
}

async function fetchBackups() {
  loading.value = true
  try {
    backups.value = await getBackupList()
  } catch {
    // interceptor handles error
  } finally {
    loading.value = false
  }
}

function handleCreateBackup() {
  createDialogVisible.value = true
}

async function confirmCreateBackup() {
  creatingBackup.value = true
  try {
    await createBackup()
    MessagePlugin.success("备份创建成功")
    createDialogVisible.value = false
    await fetchBackups()
  } catch {
    // interceptor handles error
  } finally {
    creatingBackup.value = false
  }
}

async function handleDownload(fileName: string) {
  try {
    const blob = await downloadBackup(fileName)
    const url = window.URL.createObjectURL(blob instanceof Blob ? blob : new Blob([blob as unknown as BlobPart]))
    const link = document.createElement("a")
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    MessagePlugin.success("下载已开始")
  } catch {
    // interceptor handles error
  }
}

async function handleRestore(fileName: string) {
  restoringFile.value = fileName
  try {
    await restoreBackup(fileName)
    MessagePlugin.success("数据库已从备份恢复")
    await fetchBackups()
  } catch {
    // interceptor handles error
  } finally {
    restoringFile.value = ""
  }
}

async function handleDelete(fileName: string) {
  try {
    await deleteBackup(fileName)
    MessagePlugin.success("备份已删除")
    await fetchBackups()
  } catch {
    // interceptor handles error
  }
}

function handleUploadChange(files: Array<{ raw: File }>) {
  if (!files || files.length === 0) return
  const file = files[0].raw
  if (!file) return

  const ext = file.name.toLowerCase().split(".").pop()
  if (ext !== "json") {
    MessagePlugin.error("仅支持 .json 格式的备份文件")
    return
  }

  uploadFileRaw.value = file
  uploadFileName.value = file.name
  uploadPopVisible.value = true
}

async function confirmUploadRestore() {
  if (!uploadFileRaw.value) return
  uploadLoading.value = true
  try {
    await uploadAndRestore(uploadFileRaw.value)
    MessagePlugin.success("数据库已从上传文件恢复")
    uploadPopVisible.value = false
    uploadFileRaw.value = null
    uploadFileName.value = ""
    await fetchBackups()
  } catch {
    // interceptor handles error
  } finally {
    uploadLoading.value = false
  }
}

function cancelUploadRestore() {
  uploadPopVisible.value = false
  uploadFileRaw.value = null
  uploadFileName.value = ""
}

onMounted(fetchBackups)

defineExpose({ refresh: fetchBackups })
</script>

<template>
  <div class="db-backup">
    <div class="backup-actions">
      <t-button theme="primary" variant="outline" @click="handleCreateBackup">
        <template #icon>
          <span class="action-icon">📥</span>
        </template>
        创建新备份
      </t-button>

      <t-popconfirm
        v-model:visible="uploadPopVisible"
        theme="warning"
        :content="`⚠️ 危险操作确认\n\n即将从上传文件「${uploadFileName}」恢复数据库，当前数据将被覆盖！\n此操作不可撤销，请确认是否继续？`"
        @confirm="confirmUploadRestore"
        @cancel="cancelUploadRestore"
      >
        <t-button theme="default" :loading="uploadLoading" @click="() => {}">
          <template #icon>
            <span class="action-icon">📤</span>
          </template>
          上传备份恢复
        </t-button>
      </t-popconfirm>

      <t-upload
        v-show="false"
        accept=".json"
        :auto-upload="false"
        :max="1"
        :size-limit="{ size: 100, unit: 'MB' }"
        @change="handleUploadChange"
      />
    </div>

    <div class="backup-hint">
      <t-tag theme="default" variant="light" size="small">支持 .json 格式，最大 100MB</t-tag>
    </div>

    <t-loading :loading="loading">
      <div v-if="hasBackups" class="backup-table-wrap">
        <t-table
          :data="backups"
          :columns="columns"
          row-key="fileName"
          table-layout="auto"
          hover
          size="small"
        >
          <template #fileName="{ row }">
            <t-tooltip :content="row.fileName">
              <span class="cell-filename">{{ row.fileName }}</span>
            </t-tooltip>
          </template>

          <template #createdAt="{ row }">
            <span class="cell-time">{{ formatTimestamp(row.createdAt || row.exportedAt) }}</span>
          </template>

          <template #totalRows="{ row }">
            <span class="cell-number">{{ formatTotalRows(row.totalRows) }}</span>
          </template>

          <template #hash="{ row }">
            <t-tooltip :content="row.hash">
              <span class="cell-hash">{{ formatHash(row.hash) }}</span>
            </t-tooltip>
          </template>

          <template #op="{ row }">
            <div class="cell-actions">
              <t-button
                theme="default"
                size="small"
                variant="text"
                @click="handleDownload(row.fileName)"
              >
                下载
              </t-button>

              <t-popconfirm
                theme="warning"
                content="⚠️ 危险操作确认\n\n即将从备份文件恢复数据库，当前数据将被覆盖！\n此操作不可撤销，请确认是否继续？"
                @confirm="handleRestore(row.fileName)"
              >
                <t-button
                  theme="warning"
                  size="small"
                  variant="text"
                  :loading="restoringFile === row.fileName"
                >
                  恢复
                </t-button>
              </t-popconfirm>

              <t-popconfirm
                content="确定删除此备份文件？"
                @confirm="handleDelete(row.fileName)"
              >
                <t-button
                  theme="danger"
                  size="small"
                  variant="text"
                >
                  删除
                </t-button>
              </t-popconfirm>
            </div>
          </template>
        </t-table>
      </div>

      <div v-else class="backup-empty">
        <t-empty description="暂无备份记录，点击上方按钮创建第一个备份" />
      </div>
    </t-loading>

    <t-dialog
      v-model:visible="createDialogVisible"
      header="创建数据库备份"
      :confirm-btn="{ loading: creatingBackup, content: '确认创建' }"
      :cancel-btn="'取消'"
      @confirm="confirmCreateBackup"
    >
      <div class="create-dialog-body">
        <t-alert theme="info" :close-btn="false">
          即将导出当前数据库的完整备份，包括所有表结构和数据。此操作可能需要几秒钟时间，请确认是否继续？
        </t-alert>
      </div>
    </t-dialog>
  </div>
</template>

<style lang="scss" scoped>
.db-backup {
  padding: 20px 0;
}

.backup-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  .action-icon {
    font-size: 14px;
  }
}

.backup-hint {
  margin-bottom: 16px;
}

.backup-table-wrap {
  background: $overlay-white-80;
  backdrop-filter: blur(10px);
  border-radius: $radius-3xl;
  border: 2px solid $overlay-pink-lighter-15;
  box-shadow: $shadow-xs;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    box-shadow: $shadow-brand-sm;
    border-color: $overlay-pink-lighter-30;
  }
}

.cell-filename {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  max-width: 240px;
  vertical-align: middle;
}

.cell-time {
  font-size: $font-size-caption;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}

.cell-number {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}

.cell-hash {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
  font-family: "Fira Code", "Consolas", "Monaco", monospace;
  letter-spacing: 0.3px;
}

.cell-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.backup-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  background: $overlay-white-80;
  backdrop-filter: blur(10px);
  border-radius: $radius-3xl;
  border: 2px solid $overlay-pink-lighter-15;
  box-shadow: $shadow-xs;
}

// ─── 暗色模式适配 ───
[data-theme="dark"] {
  .backup-table-wrap {
    background: var(--color-bg-container);
    border-color: var(--color-border);
    box-shadow: none;

    &:hover {
      box-shadow: $shadow-elevation-1;
      border-color: var(--color-primary-lighter);
    }
  }

  .backup-empty {
    background: var(--color-bg-container);
    border-color: var(--color-border);
    box-shadow: none;
  }
}

.create-dialog-body {
  padding: 8px 0;
}

@media screen and (max-width: 768px) {
  .backup-actions {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
