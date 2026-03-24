<template>
  <div class="customer-list">
    <t-card class="search-card" bordered>
      <t-form :data="searchForm" layout="inline" @submit="handleSearch">
        <t-form-item label="搜索">
          <t-input
            v-model="searchForm.keyword"
            placeholder="输入客户名称、联系人或电话"
            clearable
            style="width: 300px"
            @clear="handleSearch"
          >
            <template #suffix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item>
          <t-space :size="8">
            <t-button theme="primary" type="submit">
              <template #icon>
                <t-icon name="search" />
              </template>
              搜索
            </t-button>
            <t-button theme="default" @click="handleReset">
              <template #icon>
                <t-icon name="refresh" />
              </template>
              重置
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>

    <t-card class="content-card" bordered>
      <template #actions>
        <t-button theme="primary" @click="handleCreate" size="large">
          <template #icon>
            <t-icon name="add" />
          </template>
          新增客户
        </t-button>
      </template>

      <t-table
        :data="customerStore.filteredCustomers"
        :columns="columns"
        :loading="customerStore.loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
      >
        <template #empty>
          <t-empty description="暂无客户数据" />
        </template>

        <template #operation="{ row }">
          <t-space :size="8">
            <t-button variant="text" theme="default" size="small" class="btn-view" @click="handleView(row)">
              <template #icon>
                <t-icon name="browse" />
              </template>
              查看
            </t-button>
            <t-button variant="text" theme="primary" size="small" class="btn-edit" @click="handleEdit(row)">
              <template #icon>
                <t-icon name="edit" />
              </template>
              编辑
            </t-button>
            <t-popconfirm
              content="确定要删除该客户吗？删除后将同时删除关联的配方。"
              @confirm="handleDelete(row)"
            >
              <t-button variant="text" theme="danger" size="small">
                <template #icon>
                  <t-icon name="delete" />
                </template>
                删除
              </t-button>
            </t-popconfirm>
          </t-space>
        </template>
      </t-table>
    </t-card>

    <t-dialog
      v-model:visible="deleteDialogVisible"
      header="确认删除"
      :confirm-btn="{
        content: '确定删除',
        theme: 'danger',
        loading: deleteLoading
      }"
      @confirm="confirmDelete"
    >
      <p>确定要删除客户 <strong>{{ deleteTarget?.name }}</strong> 吗？</p>
      <p class="delete-warning">此操作将同时删除该客户关联的所有配方，且无法恢复。</p>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCustomerStore } from '@/stores/customer'
import { useFormulaStore } from '@/stores/formula'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Customer } from '@/types/customer'

const router = useRouter()
const customerStore = useCustomerStore()
const formulaStore = useFormulaStore()

const searchForm = reactive({
  keyword: ''
})

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<Customer | null>(null)

const columns = [
  { colKey: 'name', title: '客户名称', width: 200 },
  { colKey: 'contact', title: '联系人', width: 120 },
  { colKey: 'phone', title: '联系电话', width: 150 },
  { colKey: 'email', title: '邮箱', width: 200 },
  { colKey: 'address', title: '地址', ellipsis: true },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' }
]

const pagination = computed(() => ({
  current: customerStore.query.page,
  pageSize: customerStore.query.pageSize,
  total: customerStore.total,
  showJumper: true,
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  onChange: (pageInfo: any) => {
    customerStore.setQuery({ page: pageInfo.current, pageSize: pageInfo.pageSize })
  }
}))

const handleSearch = () => {
  customerStore.setQuery({ keyword: searchForm.keyword, page: 1 })
}

const handleReset = () => {
  searchForm.keyword = ''
  customerStore.resetQuery()
}

const handleCreate = () => {
  router.push('/customers/new')
}

const handleView = (row: Customer) => {
  router.push(`/customers/${row.id}/edit`)
}

const handleEdit = (row: Customer) => {
  router.push(`/customers/${row.id}/edit`)
}

const handleDelete = (row: Customer) => {
  const relatedFormulas = formulaStore.getFormulasByCustomer(row.id)
  if (relatedFormulas.length > 0) {
    MessagePlugin.warning(`该客户关联了 ${relatedFormulas.length} 个配方，删除后配方也将被删除`)
  }
  deleteTarget.value = row
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  deleteLoading.value = true
  try {
    const result = await customerStore.deleteCustomer(deleteTarget.value.id)
    if (result.success) {
      MessagePlugin.success('删除成功')
      deleteDialogVisible.value = false
      deleteTarget.value = null
      formulaStore.fetchFormulas()
    } else {
      MessagePlugin.error(result.message || '删除失败')
    }
  } finally {
    deleteLoading.value = false
  }
}

onMounted(() => {
  customerStore.fetchCustomers()
  formulaStore.fetchFormulas()
})
</script>

<style scoped lang="scss">
.customer-list {
  .search-card {
    margin-bottom: 16px;
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: 0 4px 20px rgba(255, 107, 138, 0.1);
    }
  }

  .content-card {
    min-height: 400px;
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
    transition: box-shadow 0.3s;

    &:hover {
      box-shadow: 0 4px 20px rgba(255, 107, 138, 0.1);
    }
  }

  .delete-warning {
    color: #E34D59;
    font-size: 14px;
    margin-top: 8px;
    padding: 12px;
    background: #FFF5F5;
    border-radius: 8px;
    border-left: 3px solid #E34D59;
  }

  :deep(.btn-view) {
    background: linear-gradient(135deg, #A78BFA, #7C3AED) !important;
    border: none !important;
    color: #fff !important;
    box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3) !important;

    :deep(.t-button__text) {
      color: #fff !important;
    }

    :deep(.t-button__icon) {
      color: #fff !important;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(124, 58, 237, 0.4) !important;
      background: linear-gradient(135deg, #C4B5FD, #A78BFA) !important;
    }

    &:active {
      transform: translateY(1px) scale(0.98);
    }
  }

  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important;
    font-weight: 600 !important;

    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important;
      color: #fff !important;
      box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;

      :deep(.t-button__text) {
        color: #fff !important;
      }

      :deep(.t-button__icon) {
        color: #fff !important;
      }

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(255, 107, 138, 0.4) !important;
        background: linear-gradient(135deg, #FFB5C8, #FF8FAB) !important;
      }

      &:active {
        transform: translateY(1px) scale(0.98);
        box-shadow: 0 2px 12px rgba(255, 107, 138, 0.35) !important;
      }

      :deep(.t-button__icon) {
        color: white !important;
      }
    }

    &.t-button--theme-default {
      background: rgba(255, 255, 255, 0.9) !important;
      border: 2px solid #FFD6E0 !important;
      color: #5D4E60 !important;

      &:hover {
        border-color: #FF8FAB !important;
        color: #FF6B8A !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 143, 171, 0.2);
      }

      &:active {
        transform: translateY(1px) scale(0.98);
      }

      :deep(.t-button__icon) {
        color: #FF8FAB !important;
      }
    }

    &.t-button--theme-danger {
      background: linear-gradient(135deg, #FF6B8A, #E34D59) !important;
      border: none !important;
      color: #fff !important;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(227, 77, 89, 0.4) !important;
      }

      &:active {
        transform: translateY(1px) scale(0.98);
      }
    }

    &.t-button--variant-text {
      &:hover {
        background-color: #FFF0F3 !important;
      }

      &:active {
        background-color: #FFD6E0 !important;
      }
    }
  }

  :deep(.t-table) {
    .t-table__row--hover {
      background-color: #FFFBFA;
    }
  }
}
</style>
