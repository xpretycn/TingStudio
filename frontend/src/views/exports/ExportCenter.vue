<template>
  <div class="export-center">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="5" />
    <div v-else>
    <t-tabs v-model="activeTab" @change="handleTabChange">
      <!-- ====== Tab 1: 导出任务 ====== -->
      <t-tab-panel value="export" label="导出任务">
        <t-card bordered>
          <template #header>
            <div class="section-header"><span>创建导出任务</span></div>
          </template>
          <t-form :data="exportForm" layout="inline" @submit="handleCreateJob">
            <t-form-item label="配方">
              <t-select
                v-model="exportForm.formulaId"
                placeholder="选择配方"
                filterable
                clearable
                :loading="formulaLoading"
                style="width: 220px"
              >
                <t-option v-for="f in formulaList" :key="f.id" :value="f.id" :label="f.name" />
              </t-select>
            </t-form-item>
            <t-form-item label="格式">
              <t-select v-model="exportForm.exportType" style="width: 140px">
                <t-option value="excel" label="Excel" />
                <t-option value="pdf" label="PDF" />
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" type="submit" :loading="creating">创建导出</t-button>
            </t-form-item>
          </t-form>
        </t-card>

        <t-card class="content-card" bordered style="margin-top: 16px;">
          <template #header><span>导出任务列表</span></template>
          <t-table
            :data="exportStore.jobs"
            :columns="jobColumns"
            :loading="exportStore.loading"
            :pagination="jobPagination"
            row-key="jobId"
            hover
            stripe
            size="small"
          >
            <template #empty>
              <t-empty description="暂无导出任务">
                <template #action>
                  <t-button theme="primary" @click="handleCreateJob">
                    <template #icon><t-icon name="add" /></template>创建导出任务
                  </t-button>
                </template>
              </t-empty>
            </template>
            <template #status="{ row }">
              <t-tag :theme="jobStatusTheme(row.status)" variant="light">{{ jobStatusLabel(row.status) }}</t-tag>
            </template>
            <template #exportType="{ row }">
              <t-tag variant="light">{{ row.exportType?.toUpperCase() }}</t-tag>
            </template>
            <template #operation="{ row }">
              <t-space :size="4">
                <t-button
                  v-if="row.status === 'completed'"
                  variant="text"
                  theme="primary"
                  size="small"
                  @click="handleDownload(row)"
                >
                  <template #icon><t-icon name="download" /></template>下载
                </t-button>
                <t-button
                  v-if="row.status === 'failed'"
                  variant="text"
                  theme="warning"
                  size="small"
                  :loading="retryingId === row.jobId"
                  @click="handleRetry(row)"
                >
                  <template #icon><t-icon name="refresh" /></template>重试
                </t-button>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>

      <!-- ====== Tab 2: 分享管理 ====== -->
      <t-tab-panel value="share" label="分享管理">
        <t-card bordered>
          <template #header>
            <div class="section-header"><span>创建分享链接</span></div>
          </template>
          <t-form :data="shareForm" layout="inline" @submit="handleCreateShare">
            <t-form-item label="配方">
              <t-select
                v-model="shareForm.formulaId"
                placeholder="选择配方"
                filterable
                clearable
                :loading="formulaLoading"
                style="width: 220px"
              >
                <t-option v-for="f in formulaList" :key="f.id" :value="f.id" :label="f.name" />
              </t-select>
            </t-form-item>
            <t-form-item label="密码">
              <t-input v-model="shareForm.password" placeholder="可选，留空则无需密码" style="width: 160px" />
            </t-form-item>
            <t-form-item label="有效期">
              <t-date-picker v-model="shareForm.expireDate" style="width: 180px" placeholder="可选" />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" type="submit">创建分享</t-button>
            </t-form-item>
          </t-form>
        </t-card>

        <t-card class="content-card" bordered style="margin-top: 16px;">
          <template #header><span>分享历史</span></template>
          <t-table
            :data="exportStore.shares"
            :columns="shareColumns"
            :loading="exportStore.loading"
            row-key="shareId"
            hover
            stripe
            size="small"
          >
            <template #empty><t-empty description="暂无分享记录" /></template>
            <template #shareUrl="{ row }">
              <t-tag variant="light" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                {{ row.shareUrl }}
              </t-tag>
            </template>
            <template #status="{ row }">
              <t-tag v-if="row.expireDate && new Date(row.expireDate) < new Date()" theme="danger" variant="light">已过期</t-tag>
              <t-tag v-else theme="success" variant="light">有效</t-tag>
            </template>
            <template #operation="{ row }">
              <t-space :size="4">
                <t-button variant="text" theme="primary" size="small" @click="handleCopyShareUrl(row)">
                  <template #icon><t-icon name="link" /></template>复制链接
                </t-button>
                <t-popconfirm content="确定要删除该分享吗？" @confirm="handleDeleteShare(row.shareId)">
                  <t-button variant="text" theme="danger" size="small">
                    <template #icon><t-icon name="delete" /></template>删除
                  </t-button>
                </t-popconfirm>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>

      <!-- ====== Tab 3: 导出模板 ====== -->
      <t-tab-panel value="templates" label="导出模板">
        <t-card bordered>
          <template #header>
            <div class="section-header">
              <span>模板列表</span>
              <t-button theme="primary" size="small" @click="handleOpenTemplateDialog(null)">
                <template #icon><t-icon name="add" /></template>新增模板
              </t-button>
            </div>
          </template>
          <t-table
            :data="exportStore.templates"
            :columns="templateColumns"
            :loading="exportStore.loading"
            row-key="templateId"
            hover
            stripe
            size="small"
          >
            <template #empty><t-empty description="暂无模板" /></template>
            <template #type="{ row }">
              <t-tag variant="light">{{ row.type?.toUpperCase() }}</t-tag>
            </template>
            <template #isDefault="{ row }">
              <t-tag v-if="row.isDefault" theme="primary" variant="light">默认</t-tag>
            </template>
            <template #operation="{ row }">
              <t-space :size="4">
                <t-button variant="text" theme="primary" size="small" @click="handleOpenTemplateDialog(row)">
                  <template #icon><t-icon name="edit" /></template>编辑
                </t-button>
                <t-popconfirm content="确定要删除该模板吗？" @confirm="handleDeleteTemplate(row.templateId)">
                  <t-button variant="text" theme="danger" size="small">
                    <template #icon><t-icon name="delete" /></template>删除
                  </t-button>
                </t-popconfirm>
              </t-space>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>

      <!-- ====== Tab 4: API 接口 ====== -->
      <t-tab-panel value="api" label="API 接口">
        <t-card bordered>
          <template #header>
            <div class="section-header">
              <span>接口列表</span>
              <t-button theme="primary" size="small" @click="showApiDialog = true">
                <template #icon><t-icon name="add" /></template>新增接口
              </t-button>
            </div>
          </template>
          <t-table
            :data="exportStore.apiInterfaces"
            :columns="apiColumns"
            :loading="exportStore.loading"
            row-key="interfaceId"
            hover
            stripe
            size="small"
          >
            <template #empty><t-empty description="暂无API接口" /></template>
            <template #method="{ row }">
              <t-tag :theme="methodTheme(row.method)" variant="light">{{ row.method }}</t-tag>
            </template>
            <template #auth="{ row }">
              <t-tag variant="light">{{ authLabel(row.authentication) }}</t-tag>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>
    </t-tabs>

    <!-- 模板编辑弹窗 -->
    <t-dialog
      v-model:visible="showTemplateDialog"
      :header="editingTemplate ? '编辑模板' : '创建导出模板'"
      @confirm="handleSaveTemplate"
      @close="resetTemplateForm"
    >
      <t-form :data="templateForm" label-width="100px">
        <t-form-item label="模板名称"><t-input v-model="templateForm.name" placeholder="请输入模板名称" /></t-form-item>
        <t-form-item label="类型">
          <t-select v-model="templateForm.type">
            <t-option value="pdf" label="PDF" />
            <t-option value="excel" label="Excel" />
            <t-option value="api" label="API" />
          </t-select>
        </t-form-item>
        <t-form-item label="描述"><t-textarea v-model="templateForm.description" placeholder="可选" /></t-form-item>
        <t-form-item label="设为默认"><t-switch v-model="templateForm.isDefault" /></t-form-item>
      </t-form>
    </t-dialog>

    <!-- API接口创建弹窗 -->
    <t-dialog
      v-model:visible="showApiDialog"
      header="创建API接口"
      @confirm="handleCreateApi"
      @close="resetApiForm"
    >
      <t-form :data="apiForm" label-width="100px">
        <t-form-item label="接口名称"><t-input v-model="apiForm.name" placeholder="请输入接口名称" /></t-form-item>
        <t-form-item label="端点URL"><t-input v-model="apiForm.endpoint" placeholder="/api/formulas/export" /></t-form-item>
        <t-form-item label="HTTP方法">
          <t-select v-model="apiForm.method" style="width: 100%">
            <t-option value="GET" label="GET" />
            <t-option value="POST" label="POST" />
            <t-option value="PUT" label="PUT" />
            <t-option value="DELETE" label="DELETE" />
          </t-select>
        </t-form-item>
        <t-form-item label="认证方式">
          <t-select v-model="apiForm.authentication" style="width: 100%">
            <t-option value="none" label="无认证" />
            <t-option value="apiKey" label="API Key" />
            <t-option value="basic" label="Basic Auth" />
            <t-option value="oauth" label="OAuth" />
          </t-select>
        </t-form-item>
        <t-form-item label="描述"><t-textarea v-model="apiForm.description" placeholder="可选" /></t-form-item>
      </t-form>
    </t-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useExportStore } from '@/stores/export'
import { MessagePlugin } from 'tdesign-vue-next'
import { formulaApi } from '@/api/formula'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const route = useRoute()
const exportStore = useExportStore()
const initialized = ref(false)
const activeTab = ref('export')
const showTemplateDialog = ref(false)
const showApiDialog = ref(false)
const editingTemplate = ref<any>(null)
const creating = ref(false)
const retryingId = ref('')
const formulaLoading = ref(false)
const formulaList = ref<any[]>([])

const exportForm = reactive({ formulaId: '', exportType: 'pdf' })
const shareForm = reactive({ formulaId: '', password: '', expireDate: '' })
const templateForm = reactive({ name: '', type: 'excel', description: '', isDefault: false })
const apiForm = reactive({ name: '', endpoint: '', method: 'POST', authentication: 'none', description: '' })

// 加载配方列表（供下拉选择）
async function fetchFormulaList() {
  formulaLoading.value = true
  try {
    const res = await formulaApi.getList({ page: 1, pageSize: 200 })
    formulaList.value = res.list
  } catch {
    // ignore
  } finally {
    formulaLoading.value = false
  }
}

// Tab 切换时加载数据
function handleTabChange(tab: string) {
  if (tab === 'export') exportStore.fetchJobs({ page: 1 })
  else if (tab === 'share') exportStore.fetchShares()
  else if (tab === 'templates') exportStore.fetchTemplates()
  else if (tab === 'api') exportStore.fetchApiInterfaces()
}

// ====== 导出任务 ======
const jobColumns = [
  { colKey: 'jobId', title: '任务ID', width: 120, ellipsis: true },
  { colKey: 'formulaName', title: '配方名称', width: 140, ellipsis: true },
  { colKey: 'exportType', title: '格式', width: 80, cell: 'exportType' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createdAt', title: '创建时间', width: 170 },
  { colKey: 'errorMessage', title: '错误信息', ellipsis: true },
  { colKey: 'operation', title: '操作', width: 130, cell: 'operation' },
]

const jobPagination = computed(() => ({
  current: exportStore.currentPage,
  pageSize: exportStore.pageSize,
  total: exportStore.total,
  showJumper: true,
  onChange: (info: any) => {
    exportStore.setPage(info.current)
    exportStore.fetchJobs({ page: info.current, pageSize: exportStore.pageSize })
  }
}))

const jobStatusTheme = (s: string) => s === 'completed' ? 'success' : s === 'failed' ? 'danger' : s === 'processing' ? 'warning' : 'default'
const jobStatusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }[s] || s)

async function handleCreateJob() {
  if (!exportForm.formulaId) { MessagePlugin.warning('请选择配方'); return }
  creating.value = true
  const result = await exportStore.createJob(exportForm)
  creating.value = false
  if (result.success) {
    if (result.data?.status === 'completed') {
      MessagePlugin.success('导出完成，正在下载...')
      const ext = exportForm.exportType === 'pdf' ? 'pdf' : 'xlsx'
      await exportStore.downloadFile(result.data.jobId, result.data.fileName || `配方导出.${ext}`, exportForm.exportType)
    } else if (result.data?.status === 'failed') {
      MessagePlugin.error(`导出失败: ${result.data.errorMessage || '未知错误'}`)
    } else {
      MessagePlugin.success('导出任务已创建')
    }
    exportStore.fetchJobs({ page: 1 })
  } else {
    MessagePlugin.error(result.message || '创建失败')
  }
}

async function handleDownload(row: any) {
  const ext = row.exportType === 'pdf' ? 'pdf' : 'xlsx'
  await exportStore.downloadFile(row.jobId, row.fileName || `配方导出.${ext}`, row.exportType)
}

async function handleRetry(row: any) {
  retryingId.value = row.jobId
  const result = await exportStore.retryJob(row.jobId)
  retryingId.value = ''
  if (result.success) {
    MessagePlugin.success('重试成功')
  } else {
    MessagePlugin.error(result.message || '重试失败')
  }
}

// ====== 分享管理 ======
const shareColumns = [
  { colKey: 'shareId', title: '分享ID', width: 120, ellipsis: true },
  { colKey: 'formulaName', title: '配方', width: 140 },
  { colKey: 'shareUrl', title: '分享链接', cell: 'shareUrl' },
  { colKey: 'password', title: '密码', width: 80 },
  { colKey: 'expireDate', title: '有效期', width: 120 },
  { colKey: 'downloadCount', title: '下载次数', width: 90 },
  { colKey: 'status', title: '状态', width: 80, cell: 'status' },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation' },
]

async function handleCreateShare() {
  if (!shareForm.formulaId) { MessagePlugin.warning('请选择配方'); return }
  const result = await exportStore.createShare({
    formulaId: shareForm.formulaId,
    password: shareForm.password || undefined,
    expireDate: shareForm.expireDate || undefined,
  })
  if (result.success) {
    MessagePlugin.success(`分享链接已创建: ${result.data.shareUrl}`)
    shareForm.formulaId = ''
    shareForm.password = ''
    shareForm.expireDate = ''
    exportStore.fetchShares()
  } else {
    MessagePlugin.error(result.message || '创建失败')
  }
}

async function handleCopyShareUrl(row: any) {
  try {
    const baseUrl = window.location.origin
    const fullUrl = `${baseUrl}${row.shareUrl}`
    await navigator.clipboard.writeText(fullUrl)
    MessagePlugin.success('链接已复制到剪贴板')
  } catch {
    MessagePlugin.warning('复制失败，请手动复制')
  }
}

async function handleDeleteShare(shareId: string) {
  const result = await exportStore.deleteShare(shareId)
  if (result.success) MessagePlugin.success('分享已删除')
  else MessagePlugin.error(result.message || '删除失败')
}

// ====== 模板管理 ======
const templateColumns = [
  { colKey: 'name', title: '模板名称' },
  { colKey: 'type', title: '类型', width: 100, cell: 'type' },
  { colKey: 'isDefault', title: '默认', width: 80, cell: 'isDefault' },
  { colKey: 'createdAt', title: '创建时间', width: 170 },
  { colKey: 'operation', title: '操作', width: 130, cell: 'operation' },
]

function handleOpenTemplateDialog(template: any) {
  if (template) {
    editingTemplate.value = template
    templateForm.name = template.name
    templateForm.type = template.type
    templateForm.description = template.description || ''
    templateForm.isDefault = !!template.isDefault
  } else {
    editingTemplate.value = null
    resetTemplateForm()
  }
  showTemplateDialog.value = true
}

function resetTemplateForm() {
  templateForm.name = ''
  templateForm.type = 'excel'
  templateForm.description = ''
  templateForm.isDefault = false
  editingTemplate.value = null
}

async function handleSaveTemplate() {
  if (!templateForm.name) { MessagePlugin.warning('请输入模板名称'); return }
  let result
  if (editingTemplate.value) {
    result = await exportStore.updateTemplate(editingTemplate.value.templateId, {
      name: templateForm.name,
      type: templateForm.type,
      description: templateForm.description,
      formatConfig: {},
      isDefault: templateForm.isDefault,
    })
  } else {
    result = await exportStore.createTemplate({
      name: templateForm.name,
      type: templateForm.type,
      description: templateForm.description,
      formatConfig: {},
      isDefault: templateForm.isDefault,
    })
  }
  if (result.success) {
    MessagePlugin.success(editingTemplate.value ? '模板更新成功' : '模板创建成功')
    showTemplateDialog.value = false
  } else {
    MessagePlugin.error(result.message || '操作失败')
  }
}

async function handleDeleteTemplate(templateId: string) {
  const result = await exportStore.deleteTemplate(templateId)
  if (result.success) MessagePlugin.success('模板已删除')
  else MessagePlugin.error(result.message || '删除失败')
}

// ====== API 接口 ======
const apiColumns = [
  { colKey: 'name', title: '接口名称' },
  { colKey: 'endpoint', title: '端点', ellipsis: true },
  { colKey: 'method', title: '方法', width: 90, cell: 'method' },
  { colKey: 'authentication', title: '认证', width: 100, cell: 'auth' },
  { colKey: 'createdAt', title: '创建时间', width: 170 },
]

const methodTheme = (m: string) => m === 'GET' ? 'success' : m === 'POST' ? 'primary' : m === 'PUT' ? 'warning' : 'danger'
const authLabel = (a: string) => ({ none: '无认证', apiKey: 'API Key', basic: 'Basic', oauth: 'OAuth' }[a] || a)

function resetApiForm() {
  apiForm.name = ''
  apiForm.endpoint = ''
  apiForm.method = 'POST'
  apiForm.authentication = 'none'
  apiForm.description = ''
}

async function handleCreateApi() {
  if (!apiForm.name || !apiForm.endpoint) { MessagePlugin.warning('请填写接口名称和端点'); return }
  const result = await exportStore.createApiInterface(apiForm)
  if (result.success) {
    MessagePlugin.success('API接口创建成功')
    showApiDialog.value = false
    resetApiForm()
  } else {
    MessagePlugin.error(result.message || '创建失败')
  }
}

// ====== 初始化 ======
onMounted(async () => {
  await fetchFormulaList()

  // 读取 URL query 中的 formulaId
  const queryFormulaId = route.query.formulaId as string
  if (queryFormulaId) {
    exportForm.formulaId = queryFormulaId
    activeTab.value = 'export'
  }

  // 加载默认 Tab 数据
  await exportStore.fetchJobs({ page: 1 })
  initialized.value = true
})
</script>

<style scoped lang="scss">
.export-center {
  .section-header { display: flex; align-items: center; justify-content: space-between; }
  .content-card { box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06); }
  :deep(.t-button--theme-primary) {
    background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
    border: none !important; color: #fff !important;
    box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;
  }
}
</style>
