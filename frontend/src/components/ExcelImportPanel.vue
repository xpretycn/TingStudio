<template>
  <div class="excel-import-panel">
    <!-- 操作说明 -->
    <t-alert theme="info" :close-btn="null">
      <template #title>
        <span class="guide-title">Excel导入说明</span>
      </template>
      <div class="guide-content">
        <p>1. <a class="guide-link" @click="downloadTemplate">下载模板</a> 获取Excel模板文件</p>
        <p>2. 在模板中填写原料信息（带*为必填项）</p>
        <p>3. <a class="guide-link" @click="triggerUpload">上传文件</a> 导入已填写的Excel</p>
        <p>4. 系统将自动填充配方原料清单</p>
      </div>
    </t-alert>

    <!-- 操作按钮 -->
    <div class="import-actions">
      <button type="button" class="import-btn import-btn--download" @click="downloadTemplate"
        :disabled="downloading">
        <t-icon name="download" size="12px" />
        {{ downloading ? '下载中...' : '下载模板' }}
      </button>

      <t-upload ref="uploadRef" :show-upload-file="false" :before-upload="beforeUpload" :request-method="handleUpload"
        accept=".xlsx,.xls">
        <button type="button" class="import-btn import-btn--upload" :disabled="uploading">
          <t-icon name="upload" size="12px" />
          {{ uploading ? '上传中...' : '上传文件' }}
        </button>
      </t-upload>
    </div>

    <!-- 解析结果 -->
    <div v-if="parseResult" class="parse-result">
      <!-- 摘要信息 -->
      <div class="parse-summary-bar">
        <div class="parse-summary-left">
          <h4 class="parse-summary-title">解析结果</h4>
          <span class="parse-summary-badge parse-summary-badge--total">
            <t-icon name="file-excel" size="12px" />
            {{ parseResult.summary.total }} 条
          </span>
          <span class="parse-summary-badge parse-summary-badge--success">
            <t-icon name="check-circle" size="12px" />
            {{ parseResult.summary.existing }} 条已匹配
          </span>
          <span v-if="parseResult.summary.new > 0"
            class="parse-summary-badge parse-summary-badge--warning">
            <t-icon name="error-circle" size="12px" />
            {{ parseResult.summary.new }} 条新原料
          </span>
        </div>
      </div>

      <!-- 错误信息 -->
      <div v-if="parseResult.errors.length > 0" class="parse-alert-bar parse-alert-bar--error">
        <div class="parse-alert-left">
          <t-icon name="close-circle-filled" size="14px" />
          <span class="parse-alert-badge parse-alert-badge--error">错误</span>
          <span class="parse-alert-desc">{{ parseResult.errors.length }} 个解析错误</span>
        </div>
        <ul class="parse-alert-list">
          <li v-for="(err, idx) in parseResult.errors" :key="idx">{{ err }}</li>
        </ul>
      </div>

      <!-- 缺失原料提示 -->
      <div v-if="parseResult.missingMaterials.length > 0"
        class="parse-alert-bar parse-alert-bar--warning">
        <div class="parse-alert-left">
          <t-icon name="error-circle" size="14px" />
          <span class="parse-alert-badge parse-alert-badge--warning">缺失</span>
          <span class="parse-alert-desc">{{ parseResult.missingMaterials.length }} 个原料未录入</span>
        </div>
        <div class="parse-missing-tags">
          <t-tag v-for="name in parseResult.missingMaterials" :key="name" theme="warning"
            variant="light" size="small" class="missing-tag">
            {{ name }}
          </t-tag>
        </div>
        <button type="button" class="go-materials-btn" @click="goToMaterials">
          <t-icon name="arrow-right" size="12px" />
          前往录入
        </button>
      </div>

      <!-- 警告信息 -->
      <div v-if="parseResult.warnings.length > 0" class="parse-alert-bar parse-alert-bar--info">
        <div class="parse-alert-left">
          <t-icon name="info-circle" size="14px" />
          <span class="parse-alert-badge parse-alert-badge--info">提示</span>
          <span class="parse-alert-desc">{{ parseResult.warnings.length }} 条提示信息</span>
        </div>
        <ul class="parse-alert-list">
          <li v-for="(warn, idx) in parseResult.warnings" :key="idx">{{ warn }}</li>
        </ul>
      </div>

      <!-- 解析数据预览 -->
      <div v-if="validMaterials.length > 0" class="parse-preview">
        <div class="parse-preview-header">
          <div class="parse-preview-header-left">
            <h4 class="parse-preview-title">原料预览</h4>
            <span class="parse-preview-badge">{{ validMaterials.length }} 种</span>
          </div>
          <div class="parse-preview-actions">
            <button type="button" class="parse-action-btn parse-action-btn--cancel"
              @click="cancelImport">
              取消导入
            </button>
            <button type="button" class="parse-action-btn parse-action-btn--confirm"
              @click="confirmImport">
              确认导入
            </button>
          </div>
        </div>
        <div class="parse-table">
          <div class="parse-table-header">
            <span class="pt-col pt-col-name">原料名称</span>
            <span class="pt-col pt-col-type">类型</span>
            <span class="pt-col pt-col-qty">用量(g)</span>
            <span class="pt-col pt-col-status">状态</span>
          </div>
          <div v-for="(row, idx) in validMaterials" :key="idx" class="parse-table-row">
            <span class="pt-col pt-col-name">
              <span class="pt-name-text">{{ row.materialName }}</span>
            </span>
            <span class="pt-col pt-col-type">
              <t-tag
                :class="row.materialType === 'supplement' ? 'material-type-tag--supplement' : 'material-type-tag--herb'"
                size="small">
                {{ row.materialType === 'supplement' ? '辅料' : '药材' }}
              </t-tag>
            </span>
            <span class="pt-col pt-col-qty">{{ row.quantity }}</span>
            <span class="pt-col pt-col-status">
              <t-tag :theme="row.isNew ? 'danger' : 'success'" variant="light" size="small">
                {{ row.isNew ? '未录入' : '已匹配' }}
              </t-tag>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MessagePlugin } from 'tdesign-vue-next'
import { excelImportApi, type ParseResult, type ParsedMaterial } from '@/api/excelImport'

const router = useRouter()
const emit = defineEmits<{
  (e: 'import', materials: ParsedMaterial[]): void
}>()

const downloading = ref(false)
const uploading = ref(false)
const parseResult = ref<ParseResult | null>(null)
const uploadRef = ref()

const validMaterials = computed(() => {
  if (!parseResult.value) return []
  return parseResult.value.materials.filter(m => !m.isNew)
})

// 下载模板
async function downloadTemplate() {
  downloading.value = true
  try {
    const response = await excelImportApi.downloadTemplate()
    const blob = new Blob([response as unknown as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '配方导入模板.xlsx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    MessagePlugin.success('模板下载成功')
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '下载模板失败';
    MessagePlugin.error(msg)
  } finally {
    downloading.value = false
  }
}

// 上传前验证
function beforeUpload(file: { raw: File }) {
  const rawFile = file.raw
  const isExcel = rawFile.name.endsWith('.xlsx') || rawFile.name.endsWith('.xls')
  if (!isExcel) {
    MessagePlugin.error('只能上传Excel文件(.xlsx, .xls)')
    return false
  }
  const isLt5M = rawFile.size / 1024 / 1024 < 5
  if (!isLt5M) {
    MessagePlugin.error('文件大小不能超过5MB')
    return false
  }
  return true
}

// 上传并解析
async function handleUpload(options: { raw: File }) {
  uploading.value = true
  parseResult.value = null

  try {
    const result = await excelImportApi.parseFormulaExcel(options.raw)
    parseResult.value = result.data
    const data = result.data
    if (data.errors?.length > 0) {
      MessagePlugin.warning(`解析完成，但有 ${data.errors.length} 个错误`)
    } else if (data.missingMaterials?.length > 0) {
      MessagePlugin.warning(`解析完成，有 ${data.missingMaterials.length} 个原料未录入`)
    } else {
      MessagePlugin.success(`解析成功，共 ${data.summary?.total ?? 0} 条原料`)
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '解析文件失败';
    MessagePlugin.error(msg)
  } finally {
    uploading.value = false
  }
}

// 确认导入
function confirmImport() {
  if (!parseResult.value) return

  if (parseResult.value.missingMaterials.length > 0) {
    MessagePlugin.warning('请先录入缺失的原料')
    return
  }

  emit('import', parseResult.value.materials)
  parseResult.value = null
  MessagePlugin.success('原料已导入配方')
}

// 取消导入
function cancelImport() {
  parseResult.value = null
  MessagePlugin.success('已取消导入')
}

// 前往原料管理
function goToMaterials() {
  router.push('/materials')
}

function triggerUpload() {
  uploadRef.value?.click?.()
  const input = uploadRef.value?.$el?.querySelector?.('input[type="file"]')
  if (input) input.click()
}
</script>

<style scoped lang="scss">
@import "@/assets/styles/variables.scss";

.excel-import-panel {
  padding: $space-4;
  background: $bg-container-alt;
  border-radius: $radius-md;
  margin-bottom: $space-5;
}

.guide-title {
  font-weight: $font-weight-semibold;
}

.guide-content {
  margin-top: $space-2;
  font-size: $font-size-body-sm;
  color: $text-regular;

  p {
    margin: $space-1 0;
  }

  .guide-link {
    color: #7c3aed;
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover {
      color: #6d28d9;
    }
  }
}

.import-actions {
  display: flex;
  gap: $space-3;
  margin-top: $space-4;
  justify-content: flex-end;
}

.import-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &--download {
    border-color: var(--color-border);
    background: transparent;
    color: var(--color-text-secondary);

    &:hover:not(:disabled) {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: var(--color-text-primary);
    }
  }

  &--upload {
    border-color: #7c3aed;
    background: #7c3aed;
    color: #fff;

    &:hover:not(:disabled) {
      background: #6d28d9;
      border-color: #6d28d9;
    }
  }
}

.parse-result {
  margin-top: $space-4;
}

.parse-summary-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px var(--space-3-5) 8px;

  .parse-summary-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .parse-summary-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  .parse-summary-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 600;
    padding: 1px 8px;
    border-radius: 10px;

    &--total {
      color: var(--color-primary);
      background: rgba(16, 185, 129, 0.1);
    }

    &--success {
      color: var(--color-primary-dark);
      background: rgba(16, 185, 129, 0.1);
    }

    &--warning {
      color: #d97706;
      background: rgba(245, 158, 11, 0.1);
    }
  }
}

.parse-alert-bar {
  padding: 8px var(--space-3-5);
  font-size: 12px;
  border-top: 1px solid transparent;

  &--error {
    background: rgba(220, 38, 38, 0.06);
    border-color: rgba(220, 38, 38, 0.15);
    color: #b91c1c;
  }

  &--warning {
    background: rgba(245, 158, 11, 0.06);
    border-color: rgba(245, 158, 11, 0.15);
    color: #b45309;
  }

  &--info {
    background: rgba(99, 102, 241, 0.06);
    border-color: rgba(99, 102, 241, 0.15);
    color: #4338ca;
  }

  .parse-alert-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .parse-alert-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;

    &--error {
      background: rgba(220, 38, 38, 0.15);
      color: #b91c1c;
    }

    &--warning {
      background: rgba(245, 158, 11, 0.15);
      color: #b45309;
    }

    &--info {
      background: rgba(99, 102, 241, 0.15);
      color: #4338ca;
    }
  }

  .parse-alert-desc {
    font-size: 11px;
    font-weight: 500;
  }

  .parse-alert-list {
    margin: var(--space-1-5) 0 0 var(--space-6);
    padding-left: 16px;
    font-size: 11px;
    line-height: 1.6;
  }

  .parse-missing-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1-5);
    margin: var(--space-1-5) 0 0 var(--space-6);

    .missing-tag {
      font-size: 11px;
    }
  }

  .go-materials-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    margin-left: var(--space-6);
    padding: 4px var(--space-2-5);
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.3);
    background: rgba(245, 158, 11, 0.08);
    color: #b45309;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(245, 158, 11, 0.15);
      border-color: rgba(245, 158, 11, 0.5);
    }
  }
}

.parse-preview {
  margin-top: 8px;

  .parse-preview-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px var(--space-3-5) 8px;

    .parse-preview-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .parse-preview-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;
    }

    .parse-preview-badge {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-primary);
      background: rgba(16, 185, 129, 0.1);
      padding: 1px 8px;
      border-radius: 10px;
    }

    .parse-preview-actions {
      display: flex;
      align-items: center;
      gap: var(--space-1-5);
    }

    .parse-action-btn {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid;

      &--cancel {
        border-color: var(--color-border);
        background: #fff;
        color: var(--color-text-secondary);

        &:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: var(--color-text-primary);
        }
      }

      &--confirm {
        border-color: var(--color-primary);
        background: var(--color-primary);
        color: #fff;

        &:hover {
          background: var(--color-primary-dark);
          border-color: var(--color-primary-dark);
        }
      }
    }
  }
}

.parse-table {
  .parse-table-header {
    display: grid;
    grid-template-columns: 1fr 80px 80px 80px;
    gap: 4px;
    padding: var(--space-2-5) var(--space-3-5);
    font-size: 11px;
    font-weight: 800;
    color: $emerald-600;
    letter-spacing: 0.05em;
    background: $overlay-emerald-08;
  }

  .parse-table-row {
    display: grid;
    grid-template-columns: 1fr 80px 80px 80px;
    gap: 4px;
    padding: var(--space-2) var(--space-3-5);
    font-size: 12px;
    color: var(--color-text-primary);
    border-top: 1px solid rgba(148, 163, 184, 0.08);
    align-items: center;

    &:nth-child(even) {
      background: rgba(248, 250, 252, 0.5);
    }

    &:hover {
      background: $overlay-emerald-04;
    }
  }

  .pt-col {
    &-name {
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: var(--space-1-5);

      .pt-name-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    &-type,
    &-qty,
    &-status {
      text-align: center;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    &-qty {
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
  }

  .material-type-tag--herb {
    background: rgba(16, 185, 129, 0.1);
    color: var(--color-primary-dark);
    border-color: var(--color-primary-lightest);
    font-size: 10px;
    padding: 0 4px;
    height: 18px;
    line-height: 16px;
  }

  .material-type-tag--supplement {
    background: rgba(99, 102, 241, 0.1);
    color: #4f46e5;
    border-color: #c7d2fe;
    font-size: 10px;
    padding: 0 4px;
    height: 18px;
    line-height: 16px;
  }
}
</style>
