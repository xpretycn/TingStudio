<template>
  <div class="salesman-list" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="8" />
      <t-card v-else class="content-card" bordered>
      <t-table :data="sortedSalesmen" :columns="columns" :loading="salesmanStore.loading" :pagination="undefined" :sort="tableSort" row-key="id" hover table-layout="auto" @sort-change="onSortChange">
        <template #empty>
          <t-empty description="暂无业务员数据" role="status">
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
    </Transition>
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
const tableSort = ref<any>(undefined)
const sortedSalesmen = ref<any[]>([])

const onSortChange = (sort: any) => {
  tableSort.value = sort
  if (!sort || !sort.sortBy) {
    sortedSalesmen.value = [...salesmanStore.salesmen]
    return
  }
  const { sortBy, descending } = sort
  const col = columns.find(c => c.colKey === sortBy)
  if (col?.sorter) {
    sortedSalesmen.value = [...salesmanStore.salesmen].sort((a, b) => {
      const result = (col.sorter as Function)(a, b)
      return descending ? -result : result
    })
  } else {
    sortedSalesmen.value = [...salesmanStore.salesmen]
  }
}

watch(() => salesmanStore.salesmen, (val) => {
  if (tableSort.value?.sortBy) {
    onSortChange(tableSort.value)
  } else {
    sortedSalesmen.value = [...val]
  }
}, { immediate: true })

const columns = [
  { colKey: 'name', title: '姓名', width: 120, sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh') },
  { colKey: 'code', title: '工号', width: 120, sorter: (a: any, b: any) => a.code.localeCompare(b.code) },
  { colKey: 'department', title: '部门', width: 140, sorter: (a: any, b: any) => (a.department || '').localeCompare(b.department || '', 'zh') },
  { colKey: 'phone', title: '电话', width: 150 },
  { colKey: 'email', title: '邮箱', width: 160 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'createdAt', title: '创建时间', width: 180, sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  { colKey: 'operation', title: '操作', width: 180, align: 'center' }
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
    box-shadow: $shadow-xs;
    &:hover { box-shadow: $shadow-md; }

    // 表格行 stagger 入场动画
    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
      @include stagger-rows(20, 0.03s);
    }
  }
  // 按钮和表格样式由全局 _td-overrides.scss 统一覆盖
  :deep(.t-table) { .t-table__row { cursor: pointer; } }
}
</style>
