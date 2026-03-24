<template>
  <div class="salesman-list">
    <t-card class="search-card" bordered>
      <t-form :data="searchForm" layout="inline" @submit="handleSearch">
        <t-form-item label="搜索">
          <t-input v-model="searchForm.keyword" placeholder="输入姓名、工号或电话" clearable style="width: 260px" @clear="handleSearch">
            <template #suffix-icon><t-icon name="search" /></template>
          </t-input>
        </t-form-item>
        <t-form-item label="状态">
          <t-select v-model="searchForm.status" placeholder="全部" clearable style="width: 140px">
            <t-option value="active" label="活跃" />
            <t-option value="inactive" label="停用" />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-space :size="8">
            <t-button theme="primary" type="submit"><template #icon><t-icon name="search" /></template>搜索</t-button>
            <t-button theme="default" @click="handleReset"><template #icon><t-icon name="refresh" /></template>重置</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card class="content-card" bordered>
      <template #actions>
        <t-button theme="primary" @click="handleCreate" size="large"><template #icon><t-icon name="add" /></template>新增业务员</t-button>
      </template>

      <t-table :data="salesmanStore.salesmen" :columns="columns" :loading="salesmanStore.loading" :pagination="pagination" row-key="id" hover stripe>
        <template #empty><t-empty description="暂无业务员数据" /></template>
        <template #status="{ row }">
          <t-tag :theme="row.status === 'active' ? 'success' : 'default'" variant="light">{{ row.status === 'active' ? '活跃' : '停用' }}</t-tag>
        </template>
        <template #operation="{ row }">
          <t-space :size="8">
            <t-button variant="text" theme="default" size="small" class="btn-view" @click="handleView(row)"><template #icon><t-icon name="browse" /></template>查看</t-button>
            <t-button variant="text" theme="primary" size="small" class="btn-edit" @click="handleEdit(row)"><template #icon><t-icon name="edit" /></template>编辑</t-button>
            <t-popconfirm v-if="row.status === 'active'" content="确定要停用该业务员吗？" @confirm="handleToggleStatus(row)">
              <t-button variant="text" theme="danger" size="small"><template #icon><t-icon name="poweroff" /></template>停用</t-button>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSalesmanStore } from '@/stores/salesman'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Salesman } from '@/api/salesman'

const router = useRouter()
const salesmanStore = useSalesmanStore()

const searchForm = reactive({ keyword: '', status: '' })

const columns = [
  { colKey: 'name', title: '姓名', width: 120 },
  { colKey: 'code', title: '工号', width: 120 },
  { colKey: 'department', title: '部门', width: 140 },
  { colKey: 'phone', title: '电话', width: 150 },
  { colKey: 'email', title: '邮箱', ellipsis: true },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 180, fixed: 'right' }
]

const pagination = computed(() => ({
  current: salesmanStore.currentPage,
  pageSize: salesmanStore.pageSize,
  total: salesmanStore.total,
  showJumper: true,
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  onChange: (pageInfo: any) => { salesmanStore.setPage(pageInfo.current) }
}))

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
  const result = await salesmanStore.updateSalesman(row.id, { status: 'inactive' })
  if (result.success) MessagePlugin.success('已停用')
  else MessagePlugin.error(result.message || '操作失败')
}

onMounted(() => { salesmanStore.fetchSalesmen() })
</script>

<style scoped lang="scss">
.salesman-list {
  .search-card {
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
    &:hover { box-shadow: 0 4px 20px rgba(255, 107, 138, 0.1); }
  }
  .content-card {
    min-height: 400px;
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
    &:hover { box-shadow: 0 4px 20px rgba(255, 107, 138, 0.1); }
  }
  :deep(.btn-view) {
    background: linear-gradient(135deg, #A78BFA, #7C3AED) !important;
    border: none !important; color: #fff !important;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3) !important;
    &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4) !important; }
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
  :deep(.t-table) { .t-table__row--hover { background-color: #FFFBFA; } }
}
</style>
