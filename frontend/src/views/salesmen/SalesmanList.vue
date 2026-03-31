<template>
  <div class="salesman-list">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="8" />
    <t-card v-else class="content-card" bordered>
      <t-table :data="salesmanStore.salesmen" :columns="columns" :loading="salesmanStore.loading" :pagination="undefined" row-key="id" hover stripe table-layout="auto">
        <template #empty>
          <t-empty description="暂无业务员数据">
            <template #action>
              <t-button theme="primary" @click="handleCreate">
                <template #icon><t-icon name="add" /></template>添加业务员
              </t-button>
            </template>
          </t-empty>
        </template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 'active' ? 'success' : 'default'" variant="light">{{ row.status === 'active' ? '活跃' : '停用' }}</t-tag>
        </template>
        <template #operation="{ row }">
          <t-space :size="6">
            <t-button variant="outline" theme="default" size="small" @click="handleView(row)"><template #icon><t-icon name="browse" /></template>查看</t-button>
            <t-button variant="outline" theme="primary" size="small" class="btn-edit" @click.stop="handleEdit(row)"><template #icon><t-icon name="edit" /></template>编辑</t-button>
            <t-popconfirm v-if="row.status === 'active'" content="确定要停用该业务员吗？" @confirm="handleToggleStatus(row)">
              <t-button variant="outline" theme="danger" size="small" class="btn-delete" @click.stop><template #icon><t-icon name="poweroff" /></template>停用</t-button>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesmanStore } from '@/stores/salesman'
import { usePaginationStore } from '@/stores/pagination'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Salesman } from '@/api/salesman'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const router = useRouter()
const salesmanStore = useSalesmanStore()
const paginationStore = usePaginationStore()

const initialized = ref(false)

const searchForm = reactive({ keyword: '', status: '' })

const columns = [
  { colKey: 'name', title: '姓名', width: 120 },
  { colKey: 'code', title: '工号', width: 120 },
  { colKey: 'department', title: '部门', width: 140 },
  { colKey: 'phone', title: '电话', width: 150 },
  { colKey: 'email', title: '邮箱', width: 160 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 180 }
]

const pagination = computed(() => ({
  current: salesmanStore.currentPage,
  pageSize: salesmanStore.pageSize,
  total: salesmanStore.total,
  onChange: (pageInfo: any) => {
    salesmanStore.setPage(pageInfo.current)
    salesmanStore.fetchSalesmen()
  }
}))

// 监听全局搜索事件（来自首页搜索框）
const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || ''
  searchForm.keyword = keyword
  salesmanStore.setKeyword(keyword)
  salesmanStore.fetchSalesmen()
}

// 注册分页到全局 paginationStore
onMounted(async () => {
  window.addEventListener('global-search', handleGlobalSearch)
  paginationStore.register(pagination.value)
  watch(pagination, (val) => paginationStore.update(val), { deep: true })
  await salesmanStore.fetchSalesmen()
  initialized.value = true
})

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch)
  paginationStore.unregister()
})

const handleSearch = () => {
  salesmanStore.setKeyword(searchForm.keyword)
  salesmanStore.setStatusFilter(searchForm.status)
  salesmanStore.fetchSalesmen()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  salesmanStore.setKeyword('')
  salesmanStore.setStatusFilter('')
  salesmanStore.fetchSalesmen()
}

const handleCreate = () => router.push('/salesmen/new')
const handleView = (row: Salesman) => router.push(`/salesmen/${row.id}`)
const handleEdit = (row: Salesman) => router.push(`/salesmen/${row.id}/edit`)

const handleToggleStatus = async (row: Salesman) => {
  const result = await salesmanStore.deleteSalesman(row.id)
  if (result.success) MessagePlugin.success('已停用')
  else MessagePlugin.error(result.message || '操作失败')
}

</script>

<style scoped lang="scss">
.salesman-list {
  .content-card {
    min-height: 400px;
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
    &:hover { box-shadow: 0 4px 20px rgba(255, 107, 138, 0.1); }
  }
  :deep(.btn-view) { display: none; }
  :deep(.btn-edit) {
    color: #2952CC !important;
    border-color: #C5D1F8 !important;
    background: #EDF2FF !important;
    :deep(.t-button__icon) { color: #2952CC !important; }
    &:hover { color: #0052D9 !important; border-color: #0052D9 !important; background: #ECF3FF !important; }
  }
  :deep(.btn-delete) {
    color: #D54941 !important;
    border-color: #F5C6C2 !important;
    background: #FFF1EF !important;
    :deep(.t-button__icon) { color: #D54941 !important; }
    &:hover { color: #E34D59 !important; border-color: #E34D59 !important; background: #FEF0EF !important; }
  }
  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important; font-weight: 600 !important;
    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important; color: #fff !important;
      box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255, 107, 138, 0.4) !important; }
    }
    &.t-button--theme-default {
      background: rgba(255, 255, 255, 0.9) !important;
      border: 2px solid #FFD6E0 !important; color: #5D4E60 !important;
      &:hover { border-color: #FF8FAB !important; color: #FF6B8A !important; }
    }
    &.t-button--variant-text { &:hover { background-color: #FFF0F3 !important; } }
  }
  :deep(.t-table) { .t-table__row--hover { background-color: #FFFBFA; } .t-table__row { cursor: pointer; } }
}
</style>
