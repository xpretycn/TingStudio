<template>
  <div class="export-center">
    <t-tabs v-model="activeTab">
      <t-tab-panel value="export" label="导出任务">
        <t-card bordered>
          <template #header>
            <div class="section-header">
              <span>创建导出任务</span>
            </div>
          </template>
          <t-form :data="exportForm" layout="inline" @submit="handleCreateJob">
            <t-form-item label="配方ID">
              <t-input v-model="exportForm.formulaId" placeholder="输入配方ID" style="width: 200px" />
            </t-form-item>
            <t-form-item label="格式">
              <t-select v-model="exportForm.exportType" style="width: 140px">
                <t-option value="pdf" label="PDF" />
                <t-option value="excel" label="Excel" />
                <t-option value="api" label="API" />
              </t-select>
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" type="submit" :loading="creating">创建导出</t-button>
            </t-form-item>
          </t-form>
        </t-card>

        <t-card class="content-card" bordered style="margin-top: 16px;">
          <template #header><span>导出任务列表</span></template>
          <t-table :data="exportStore.jobs" :columns="jobColumns" :loading="exportStore.loading" :pagination="jobPagination" row-key="jobId" hover stripe size="small">
            <template #empty><t-empty description="暂无导出任务" /></template>
            <template #status="{ row }">
              <t-tag :theme="jobStatusTheme(row.status)" variant="light">{{ jobStatusLabel(row.status) }}</t-tag>
            </template>
            <template #exportType="{ row }">
              <t-tag variant="light">{{ row.exportType?.toUpperCase() }}</t-tag>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>

      <t-tab-panel value="share" label="分享管理">
        <t-card bordered>
          <template #header>
            <div class="section-header"><span>创建分享链接</span></div>
          </template>
          <t-form :data="shareForm" layout="inline" @submit="handleCreateShare">
            <t-form-item label="配方ID">
              <t-input v-model="shareForm.formulaId" placeholder="输入配方ID" style="width: 200px" />
            </t-form-item>
            <t-form-item label="密码">
              <t-input v-model="shareForm.password" placeholder="可选" style="width: 140px" />
            </t-form-item>
            <t-form-item label="有效期">
              <t-date-picker v-model="shareForm.expireDate" style="width: 180px" />
            </t-form-item>
            <t-form-item>
              <t-button theme="primary" type="submit">创建分享</t-button>
            </t-form-item>
          </t-form>
        </t-card>
      </t-tab-panel>

      <t-tab-panel value="templates" label="导出模板">
        <t-card bordered>
          <template #header>
            <div class="section-header">
              <span>模板列表</span>
              <t-button theme="primary" size="small" @click="showTemplateDialog = true"><template #icon><t-icon name="add" /></template>新增模板</t-button>
            </div>
          </template>
          <t-table :data="exportStore.templates" :columns="templateColumns" :loading="exportStore.loading" row-key="templateId" hover stripe size="small">
            <template #empty><t-empty description="暂无模板" /></template>
            <template #type="{ row }">
              <t-tag variant="light">{{ row.type?.toUpperCase() }}</t-tag>
            </template>
            <template #isDefault="{ row }">
              <t-tag v-if="row.isDefault" theme="primary" variant="light">默认</t-tag>
            </template>
          </t-table>
        </t-card>
      </t-tab-panel>
    </t-tabs>

    <!-- 模板创建弹窗 -->
    <t-dialog v-model:visible="showTemplateDialog" header="创建导出模板" @confirm="handleCreateTemplate">
      <t-form :data="templateForm" label-width="100px">
        <t-form-item label="模板名称"><t-input v-model="templateForm.name" /></t-form-item>
        <t-form-item label="类型">
          <t-select v-model="templateForm.type"><t-option value="pdf" label="PDF" /><t-option value="excel" label="Excel" /><t-option value="api" label="API" /></t-select>
        </t-form-item>
        <t-form-item label="设为默认"><t-switch v-model="templateForm.isDefault" /></t-form-item>
      </t-form>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useExportStore } from '@/stores/export'
import { MessagePlugin } from 'tdesign-vue-next'

const exportStore = useExportStore()
const activeTab = ref('export')
const showTemplateDialog = ref(false)
const creating = ref(false)

const exportForm = reactive({ formulaId: '', exportType: 'pdf' })
const shareForm = reactive({ formulaId: '', password: '', expireDate: '' })
const templateForm = reactive({ name: '', type: 'pdf', isDefault: false })

const jobColumns = [
  { colKey: 'jobId', title: '任务ID', width: 120, ellipsis: true },
  { colKey: 'formulaId', title: '配方ID', width: 120 },
  { colKey: 'exportType', title: '格式', width: 80 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'errorMessage', title: '错误信息', ellipsis: true }
]

const templateColumns = [
  { colKey: 'name', title: '模板名称' },
  { colKey: 'type', title: '类型', width: 100 },
  { colKey: 'isDefault', title: '默认', width: 80 },
  { colKey: 'createdAt', title: '创建时间', width: 180 }
]

const jobPagination = computed(() => ({
  current: exportStore.currentPage,
  pageSize: exportStore.pageSize,
  total: exportStore.total,
  showJumper: true,
  onChange: (info: any) => { exportStore.setPage(info.current) }
}))

const jobStatusTheme = (s: string) => s === 'completed' ? 'success' : s === 'failed' ? 'danger' : s === 'processing' ? 'warning' : 'default'
const jobStatusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }[s] || s)

const handleCreateJob = async () => {
  if (!exportForm.formulaId) { MessagePlugin.warning('请输入配方ID'); return }
  creating.value = true
  const result = await exportStore.createJob(exportForm)
  creating.value = false
  if (result.success) { MessagePlugin.success('导出任务已创建'); exportStore.fetchJobs() }
  else MessagePlugin.error(result.message || '创建失败')
}

const handleCreateShare = async () => {
  if (!shareForm.formulaId) { MessagePlugin.warning('请输入配方ID'); return }
  const result = await exportStore.createShare({
    formulaId: shareForm.formulaId,
    password: shareForm.password || undefined,
    expireDate: shareForm.expireDate || undefined
  })
  if (result.success) {
    MessagePlugin.success(`分享链接: ${result.data.shareUrl}`)
    shareForm.formulaId = ''
    shareForm.password = ''
  } else MessagePlugin.error(result.message || '创建失败')
}

const handleCreateTemplate = async () => {
  if (!templateForm.name) { MessagePlugin.warning('请输入模板名称'); return }
  const result = await exportStore.createTemplate(templateForm)
  if (result.success) { MessagePlugin.success('模板创建成功'); showTemplateDialog.value = false; templateForm.name = '' }
  else MessagePlugin.error(result.message || '创建失败')
}

onMounted(() => {
  exportStore.fetchJobs()
  exportStore.fetchTemplates()
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
