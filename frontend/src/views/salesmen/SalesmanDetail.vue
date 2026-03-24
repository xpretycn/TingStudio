<template>
  <div class="salesman-detail">
    <t-card bordered v-if="salesman">
      <template #header>
        <div class="detail-header">
          <t-button variant="text" @click="handleBack"><template #icon><t-icon name="chevron-left" /></template>返回</t-button>
          <span class="detail-title">业务员详情 - {{ salesman.name }}</span>
          <t-tag :theme="salesman.status === 'active' ? 'success' : 'default'" variant="light">{{ salesman.status === 'active' ? '活跃' : '停用' }}</t-tag>
        </div>
      </template>

      <t-tabs v-model="activeTab">
        <t-tab-panel value="info" label="基本信息">
          <t-descriptions :column="2" bordered>
            <t-descriptions-item label="姓名">{{ salesman.name }}</t-descriptions-item>
            <t-descriptions-item label="工号">{{ salesman.code }}</t-descriptions-item>
            <t-descriptions-item label="部门">{{ salesman.department || '-' }}</t-descriptions-item>
            <t-descriptions-item label="电话">{{ salesman.phone || '-' }}</t-descriptions-item>
            <t-descriptions-item label="邮箱">{{ salesman.email || '-' }}</t-descriptions-item>
            <t-descriptions-item label="创建时间">{{ salesman.createdAt }}</t-descriptions-item>
          </t-descriptions>
        </t-tab-panel>

        <t-tab-panel value="customers" label="关联客户">
          <div class="tab-actions">
            <t-button theme="primary" size="small" @click="showLinkCustomerDialog = true"><template #icon><t-icon name="add" /></template>关联客户</t-button>
          </div>
          <t-table :data="salesman.linkedCustomers || []" :columns="customerColumns" row-key="id" hover stripe size="small">
            <template #empty><t-empty description="暂无关联客户" /></template>
            <template #relationType="{ row }">
              <t-tag :theme="row.relationType === 'primary' ? 'warning' : 'default'" variant="light">{{ row.relationType === 'primary' ? '主业务员' : '辅助业务员' }}</t-tag>
            </template>
            <template #customerActions="{ row }">
              <t-popconfirm content="确定解除关联？" @confirm="handleUnlinkCustomer(row)">
                <t-button variant="text" theme="danger" size="small"><template #icon><t-icon name="link-unlink" /></template>解除</t-button>
              </t-popconfirm>
            </template>
          </t-table>
        </t-tab-panel>

        <t-tab-panel value="formulists" label="对接配方师">
          <div class="tab-actions">
            <t-button theme="primary" size="small" @click="showLinkFormulistDialog = true"><template #icon><t-icon name="add" /></template>对接配方师</t-button>
          </div>
          <t-table :data="salesman.linkedFormulists || []" :columns="formulistColumns" row-key="id" hover stripe size="small">
            <template #empty><t-empty description="暂无对接配方师" /></template>
            <template #cooperationMode="{ row }">
              <t-tag :theme="row.cooperationMode === 'direct' ? 'success' : 'primary'" variant="light">{{ row.cooperationMode === 'direct' ? '直接对接' : '间接对接' }}</t-tag>
            </template>
            <template #formulistActions="{ row }">
              <t-button variant="text" size="small" @click="openCommunicationLog(row)"><template #icon><t-icon name="chat" /></template>沟通记录</t-button>
            </template>
          </t-table>
        </t-tab-panel>
      </t-tabs>
    </t-card>

    <!-- 关联客户弹窗 -->
    <t-dialog v-model:visible="showLinkCustomerDialog" header="关联客户" :confirm-btn="{ loading: linkLoading }" @confirm="confirmLinkCustomer">
      <t-form :data="linkCustomerForm" label-width="100px">
        <t-form-item label="客户ID" name="customerId">
          <t-input v-model="linkCustomerForm.customerId" placeholder="请输入客户ID" />
        </t-form-item>
        <t-form-item label="关联类型">
          <t-radio-group v-model="linkCustomerForm.relationType">
            <t-radio value="primary">主业务员</t-radio>
            <t-radio value="secondary">辅助业务员</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 对接配方师弹窗 -->
    <t-dialog v-model:visible="showLinkFormulistDialog" header="对接配方师" :confirm-btn="{ loading: linkLoading }" @confirm="confirmLinkFormulist">
      <t-form :data="linkFormulistForm" label-width="100px">
        <t-form-item label="配方师ID" name="formulistId">
          <t-input v-model="linkFormulistForm.formulistId" placeholder="请输入配方师用户ID" />
        </t-form-item>
        <t-form-item label="对接模式">
          <t-radio-group v-model="linkFormulistForm.cooperationMode">
            <t-radio value="direct">直接对接</t-radio>
            <t-radio value="indirect">间接对接</t-radio>
          </t-radio-group>
        </t-form-item>
      </t-form>
    </t-dialog>

    <!-- 沟通记录弹窗 -->
    <t-dialog v-model:visible="showCommDialog" header="沟通记录" width="700px">
      <div class="comm-log-list">
        <t-empty v-if="commLogs.length === 0" description="暂无沟通记录" />
        <div v-for="log in commLogs" :key="log.id" class="comm-log-item">
          <div class="comm-log-header">
            <t-tag size="small">{{ log.type }}</t-tag>
            <span class="comm-log-time">{{ log.createdAt }}</span>
          </div>
          <p class="comm-log-content">{{ log.content }}</p>
        </div>
      </div>
      <template #footer>
        <t-input v-model="newCommContent" placeholder="添加沟通记录..." @enter="addCommLog" />
      </template>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSalesmanStore } from '@/stores/salesman'
import { salesmanApi } from '@/api/salesman'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const salesmanStore = useSalesmanStore()

const salesman = ref<any>(null)
const activeTab = ref('info')

const showLinkCustomerDialog = ref(false)
const showLinkFormulistDialog = ref(false)
const showCommDialog = ref(false)
const linkLoading = ref(false)

const linkCustomerForm = reactive({ customerId: '', relationType: 'primary' })
const linkFormulistForm = reactive({ formulistId: '', cooperationMode: 'direct' })
const currentRelationId = ref('')

const commLogs = ref<any[]>([])
const newCommContent = ref('')

const customerColumns = [
  { colKey: 'customerName', title: '客户名称' },
  { colKey: 'customerPhone', title: '电话' },
  { colKey: 'relationType', title: '关联类型', width: 120 },
  { colKey: 'startDate', title: '关联日期', width: 120 },
  { colKey: 'customerActions', title: '操作', width: 80 }
]

const formulistColumns = [
  { colKey: 'formulistName', title: '配方师' },
  { colKey: 'cooperationMode', title: '对接模式', width: 120 },
  { colKey: 'priority', title: '优先级', width: 80 },
  { colKey: 'createdAt', title: '创建时间', width: 120 },
  { colKey: 'formulistActions', title: '操作', width: 120 }
]

const handleBack = () => router.push('/salesmen')

const handleUnlinkCustomer = async (row: any) => {
  const result = await salesmanStore.unlinkCustomer(row.id)
  if (result.success) {
    MessagePlugin.success('已解除关联')
    await loadData()
  }
}

const confirmLinkCustomer = async () => {
  if (!linkCustomerForm.customerId) { MessagePlugin.warning('请输入客户ID'); return }
  linkLoading.value = true
  const result = await salesmanStore.linkCustomer(route.params.id as string, linkCustomerForm)
  linkLoading.value = false
  if (result.success) {
    MessagePlugin.success('关联成功')
    showLinkCustomerDialog.value = false
    linkCustomerForm.customerId = ''
    await loadData()
  }
}

const confirmLinkFormulist = async () => {
  if (!linkFormulistForm.formulistId) { MessagePlugin.warning('请输入配方师ID'); return }
  linkLoading.value = true
  const result = await salesmanStore.linkCustomer(route.params.id as string, { ...linkFormulistForm, customerId: linkFormulistForm.formulistId, relationType: linkFormulistForm.cooperationMode })
  // Use the actual API
  linkLoading.value = false
  try {
    await salesmanApi.linkFormulist(route.params.id as string, linkFormulistForm)
    MessagePlugin.success('对接成功')
    showLinkFormulistDialog.value = false
    linkFormulistForm.formulistId = ''
    await loadData()
  } catch (e: any) {
    MessagePlugin.error(e.message || '对接失败')
  }
}

const openCommunicationLog = async (row: any) => {
  currentRelationId.value = row.id
  showCommDialog.value = true
  try {
    const res = await salesmanApi.getCommunicationLogs(row.id)
    commLogs.value = res.data || []
  } catch { commLogs.value = [] }
}

const addCommLog = async () => {
  if (!newCommContent.value.trim()) return
  try {
    await salesmanApi.addCommunicationLog(currentRelationId.value, { type: 'message', content: newCommContent.value })
    newCommContent.value = ''
    const res = await salesmanApi.getCommunicationLogs(currentRelationId.value)
    commLogs.value = res.data || []
  } catch (e: any) {
    MessagePlugin.error(e.message || '添加失败')
  }
}

const loadData = async () => {
  salesman.value = await salesmanStore.getSalesman(route.params.id as string)
}

onMounted(() => { loadData() })
</script>

<style scoped lang="scss">
.salesman-detail {
  .detail-header {
    display: flex; align-items: center; gap: 12px;
    .detail-title { font-size: 16px; font-weight: 600; color: #5D4E60; }
  }
  .tab-actions { margin-bottom: 12px; }
  .comm-log-item {
    padding: 12px; margin-bottom: 8px; background: #FFF9F7; border-radius: 8px; border-left: 3px solid #FFD6E0;
    .comm-log-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .comm-log-time { font-size: 12px; color: #9B8FA0; }
    .comm-log-content { margin: 0; font-size: 14px; color: #5D4E60; }
  }
}
</style>
