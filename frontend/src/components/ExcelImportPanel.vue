<template>
  <div class="excel-import-panel">
    <!-- 操作说明 -->
    <t-alert theme="info" :close-btn="null">
      <template #title>
        <span class="guide-title">Excel导入说明</span>
      </template>
      <div class="guide-content">
        <p>1. 点击「下载模板」获取Excel模板文件</p>
        <p>2. 在模板中填写原料信息（带*为必填项）</p>
        <p>3. 点击「上传文件」导入已填写的Excel文件</p>
        <p>4. 系统将自动填充配方原料清单</p>
      </div>
    </t-alert>

    <!-- 操作按钮 -->
    <div class="import-actions">
      <t-button theme="primary" @click="downloadTemplate" :loading="downloading">
        <template #icon><t-icon name="download" /></template>
        下载模板
      </t-button>
      
      <t-upload
        ref="uploadRef"
        :show-upload-file="false"
        :before-upload="beforeUpload"
        :request-method="handleUpload"
        accept=".xlsx,.xls"
      >
        <t-button theme="success" :loading="uploading">
          <template #icon><t-icon name="upload" /></template>
          上传文件
        </t-button>
      </t-upload>
    </div>

    <!-- 解析结果 -->
    <div v-if="parseResult" class="parse-result">
      <!-- 摘要信息 -->
      <t-card class="result-summary" :bordered="false">
        <div class="summary-content">
          <span class="summary-item">
            <t-icon name="file-excel" />
            共解析 <strong>{{ parseResult.summary.total }}</strong> 条原料
          </span>
          <span class="summary-item success">
            <t-icon name="check-circle" />
            已匹配 <strong>{{ parseResult.summary.existing }}</strong> 条
          </span>
          <span v-if="parseResult.summary.new > 0" class="summary-item warning">
            <t-icon name="error-circle" />
            新原料 <strong>{{ parseResult.summary.new }}</strong> 条
          </span>
        </div>
      </t-card>

      <!-- 错误信息 -->
      <t-alert
        v-if="parseResult.errors.length > 0"
        theme="error"
        title="解析错误"
        :close-btn="null"
        class="result-alert"
      >
        <ul class="error-list">
          <li v-for="(err, idx) in parseResult.errors" :key="idx">{{ err }}</li>
        </ul>
      </t-alert>

      <!-- 缺失原料提示 -->
      <t-alert
        v-if="parseResult.missingMaterials.length > 0"
        theme="warning"
        title="以下原料在系统中不存在，请先录入原料信息"
        :close-btn="null"
        class="result-alert"
      >
        <div class="missing-materials">
          <t-tag
            v-for="name in parseResult.missingMaterials"
            :key="name"
            theme="warning"
            variant="light"
            class="missing-tag"
          >
            {{ name }}
          </t-tag>
        </div>
        <t-button
          theme="primary"
          size="small"
          class="go-materials-btn"
          @click="goToMaterials"
        >
          前往原料管理
        </t-button>
      </t-alert>

      <!-- 警告信息 -->
      <t-alert
        v-if="parseResult.warnings.length > 0"
        theme="warning"
        title="提示信息"
        :close-btn="null"
        class="result-alert"
      >
        <ul class="warning-list">
          <li v-for="(warn, idx) in parseResult.warnings" :key="idx">{{ warn }}</li>
        </ul>
      </t-alert>

      <!-- 解析数据预览 -->
      <t-card v-if="validMaterials.length > 0" class="preview-card" :bordered="false">
        <template #header>
          <div class="preview-header">
            <span>原料预览</span>
            <t-space>
              <t-button theme="default" size="small" @click="cancelImport">取消导入</t-button>
              <t-button theme="primary" size="small" @click="confirmImport">确认导入</t-button>
            </t-space>
          </div>
        </template>
        <t-table :data="validMaterials" :columns="previewColumns" size="small" :max-height="300">
          <template #materialType="{ row }">
            <t-tag :theme="row.materialType === 'supplement' ? 'primary' : 'success'" variant="light" size="small">
              {{ row.materialType === 'supplement' ? '辅料' : '药材' }}
            </t-tag>
          </template>
          <template #status="{ row }">
            <t-tag :theme="row.isNew ? 'danger' : 'success'" variant="light" size="small">
              {{ row.isNew ? '未录入' : '已匹配' }}
            </t-tag>
          </template>
        </t-table>
      </t-card>
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

const previewColumns = [
  { colKey: 'materialName', title: '原料名称', width: 120 },
  { colKey: 'materialType', title: '类型', width: 80 },
  { colKey: 'quantity', title: '数量(g)', width: 80 },
  { colKey: 'status', title: '状态', width: 80 },
]

// 有效的原料（已匹配的）
const validMaterials = computed(() => {
  if (!parseResult.value) return []
  return parseResult.value.materials.filter(m => !m.isNew)
})

// 下载模板
async function downloadTemplate() {
  downloading.value = true
  try {
    const response = await excelImportApi.downloadTemplate()
    const blob = new Blob([response as any], {
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
  } catch (error: any) {
    MessagePlugin.error(error.message || '下载模板失败')
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
    parseResult.value = result
    if (result.errors.length > 0) {
      MessagePlugin.warning(`解析完成，但有 ${result.errors.length} 个错误`)
    } else if (result.missingMaterials.length > 0) {
      MessagePlugin.warning(`解析完成，有 ${result.missingMaterials.length} 个原料未录入`)
    } else {
      MessagePlugin.success(`解析成功，共 ${result.summary.total} 条原料`)
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '解析文件失败')
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
</script>

<style scoped lang="scss">
.excel-import-panel {
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.guide-title {
  font-weight: 600;
}

.guide-content {
  margin-top: 8px;
  font-size: 13px;
  color: #666;
  
  p {
    margin: 4px 0;
  }
}

.import-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.parse-result {
  margin-top: 16px;
  
  .result-summary {
    margin-bottom: 12px;
    background: #fff;
    
    .summary-content {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      
      .summary-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        
        &.success {
          color: #2ba471;
        }
        
        &.warning {
          color: #e37318;
        }
      }
    }
  }
  
  .result-alert {
    margin-bottom: 12px;
    
    ul {
      margin: 8px 0 0;
      padding-left: 20px;
    }
    
    .missing-materials {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 8px 0;
    }
    
    .go-materials-btn {
      margin-top: 8px;
    }
  }
  
  .preview-card {
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }
}
</style>
