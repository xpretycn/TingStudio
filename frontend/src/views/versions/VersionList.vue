<template>
  <div class="version-list">
    <t-card class="content-card" bordered>
      <template #header>
        <div class="page-header">
          <t-button variant="text" @click="handleBack"><template #icon><t-icon name="chevron-left" /></template>返回配方</t-button>
          <span class="page-title">版本管理</span>
        </div>
      </template>

      <div class="version-actions">
        <t-radio-group v-model="statusFilter" variant="default-filled" @change="fetchVersions">
          <t-radio-button value="">全部</t-radio-button>
          <t-radio-button value="draft">草稿</t-radio-button>
          <t-radio-button value="published">已发布</t-radio-button>
          <t-radio-button value="archived">已归档</t-radio-button>
        </t-radio-group>
        <t-button theme="primary" @click="handleCreateVersion" size="small"><template #icon><t-icon name="add" /></template>创建版本</t-button>
        <t-button theme="default" @click="handleCompare" size="small"><template #icon><t-icon name="compare" /></template>版本对比</t-button>
      </div>

      <t-table :data="versionStore.versions" :columns="columns" :loading="versionStore.loading" row-key="versionId" hover stripe>
        <template #empty><t-empty description="暂无版本数据" /></template>
        <template #status="{ row }">
          <t-tag :theme="statusTheme(row.status)" variant="light">{{ statusLabel(row.status) }}</t-tag>
        </template>
        <template #isCurrent="{ row }">
          <t-tag v-if="row.isCurrent" theme="primary" variant="light">当前版本</t-tag>
          <span v-else>-</span>
        </template>
        <template #operation="{ row }">
          <t-space :size="8">
            <t-button variant="text" size="small" @click="handleViewSnapshot(row)"><template #icon><t-icon name="browse" /></template>快照</t-button>
            <t-button v-if="row.status === 'draft'" variant="text" theme="primary" size="small" @click="handlePublish(row)"><template #icon><t-icon name="check-circle" /></template>发布</t-button>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <!-- 版本快照弹窗 -->
    <t-dialog v-model:visible="snapshotVisible" header="版本快照" width="700px">
      <div v-if="currentSnapshot">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="版本号">{{ currentSnapshot.versionNumber }}</t-descriptions-item>
          <t-descriptions-item label="版本名称">{{ currentSnapshot.versionName || '-' }}</t-descriptions-item>
          <t-descriptions-item label="配方名称">{{ currentSnapshot.snapshot?.name }}</t-descriptions-item>
          <t-descriptions-item label="客户">{{ currentSnapshot.snapshot?.customerName }}</t-descriptions-item>
        </t-descriptions>
        <div v-if="currentSnapshot.snapshot?.materials?.length" class="snapshot-materials">
          <h4>原料清单</h4>
          <t-table :data="currentSnapshot.snapshot.materials" :columns="materialColumns" size="small" bordered />
        </div>
        <div v-if="currentSnapshot.snapshot?.description" class="snapshot-desc">
          <h4>配方描述</h4>
          <p>{{ currentSnapshot.snapshot.description }}</p>
        </div>
        <div v-if="currentSnapshot.changes?.length" class="snapshot-changes">
          <h4>变更记录</h4>
          <div v-for="(change, i) in currentSnapshot.changes" :key="i" class="change-item">
            <t-tag :theme="changeTypeTheme(change.changeType)" size="small">{{ changeTypeLabel(change.changeType) }}</t-tag>
            <span>{{ change.fieldLabel }}</span>
            <span v-if="change.oldValue !== null">: {{ change.oldValue }} →</span>
            <span>{{ change.newValue }}</span>
          </div>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useVersionStore } from '@/stores/version'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const versionStore = useVersionStore()

const formulaId = route.params.formulaId as string
const statusFilter = ref('')
const snapshotVisible = ref(false)
const currentSnapshot = ref<any>(null)

const columns = [
  { colKey: 'versionNumber', title: '版本号', width: 120 },
  { colKey: 'versionName', title: '版本名称', ellipsis: true },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'isCurrent', title: '当前版本', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 180, fixed: 'right' }
]

const materialColumns = [
  { colKey: 'materialName', title: '原料名称', width: 200 },
  { colKey: 'quantity', title: '数量', width: 120 }
]

const statusTheme = (s: string) => s === 'published' ? 'success' : s === 'draft' ? 'warning' : 'default'
const statusLabel = (s: string) => s === 'published' ? '已发布' : s === 'draft' ? '草稿' : '已归档'
const changeTypeTheme = (t: string) => t === 'add' ? 'success' : t === 'delete' ? 'danger' : 'warning'
const changeTypeLabel = (t: string) => t === 'add' ? '新增' : t === 'delete' ? '删除' : '修改'

const fetchVersions = () => {
  versionStore.fetchVersions(formulaId, statusFilter.value ? { status: statusFilter.value } : undefined)
}

const handleBack = () => router.push('/formulas')

const handleCreateVersion = async () => {
  const result = await versionStore.createVersion(formulaId, { status: 'draft' })
  if (result.success) MessagePlugin.success(`版本 ${result.data?.versionNumber} 创建成功`)
  else MessagePlugin.error(result.message || '创建失败')
}

const handlePublish = async (row: any) => {
  const result = await versionStore.publishVersion(row.versionId)
  if (result.success) { MessagePlugin.success('发布成功'); fetchVersions() }
  else MessagePlugin.error(result.message || '发布失败')
}

const handleCompare = () => router.push(`/versions/compare/${formulaId}`)

const handleViewSnapshot = (row: any) => {
  currentSnapshot.value = row
  snapshotVisible.value = true
}

onMounted(() => { fetchVersions() })
</script>

<style scoped lang="scss">
.version-list {
  .content-card {
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
  }
  .page-header {
    display: flex; align-items: center; gap: 12px;
    .page-title { font-size: 16px; font-weight: 600; color: #5D4E60; }
  }
  .version-actions {
    display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  }
  .snapshot-materials, .snapshot-desc, .snapshot-changes {
    margin-top: 16px;
    h4 { margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #5D4E60; }
  }
  .snapshot-desc p {
    margin: 0; padding: 12px; background: #FFF9F7; border-radius: 8px; border-left: 3px solid #FFD6E0; color: #5D4E60;
  }
  .change-item {
    display: flex; align-items: center; gap: 6px; padding: 4px 0; font-size: 13px; color: #5D4E60;
  }
  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important; font-weight: 600 !important;
    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important; color: #fff !important;
      box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;
    }
  }
}
</style>
