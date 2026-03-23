<template>
  <div class="formula-list">
    <t-card class="search-card" bordered>
      <t-form :data="searchForm" layout="inline" @submit="handleSearch">
        <t-form-item label="搜索">
          <t-input
            v-model="searchForm.keyword"
            placeholder="输入配方名称或客户名称"
            clearable
            style="width: 300px"
            @clear="handleSearch"
          >
            <template #suffix-icon>
              <t-icon name="search" />
            </template>
          </t-input>
        </t-form-item>
        <t-form-item label="客户">
          <t-select
            v-model="searchForm.customerId"
            placeholder="选择客户"
            clearable
            style="width: 200px"
          >
            <t-option
              v-for="customer in customerStore.customers"
              :key="customer.id"
              :value="customer.id"
              :label="customer.name"
            />
          </t-select>
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
          新增配方
        </t-button>
      </template>

      <t-table
        :data="formulaStore.filteredFormulas"
        :columns="columns"
        :loading="formulaStore.loading"
        :pagination="pagination"
        row-key="id"
        hover
        stripe
        :expandable="true"
      >
        <template #expandedRow="{ row }">
          <div class="expanded-content">
            <div class="materials-section">
              <h4>原料清单</h4>
              <t-table
                :data="row.materials"
                :columns="materialColumns"
                size="small"
                bordered
              />
            </div>
            <div v-if="row.description" class="description-section">
              <h4>配方描述</h4>
              <p>{{ row.description }}</p>
            </div>
          </div>
        </template>

        <template #customerName="{ row }">
          <t-tag theme="primary" variant="light">
            <template #icon>
              <t-icon name="user" />
            </template>
            {{ row.customerName }}
          </t-tag>
        </template>

        <template #materialCount="{ row }">
          <t-tag theme="success" variant="light">
            <template #icon>
              <t-icon name="layers" />
            </template>
            {{ row.materials.length }} 种原料
          </t-tag>
        </template>

        <template #empty>
          <t-empty description="暂无配方数据" />
        </template>

        <template #operation="{ row }">
          <t-space :size="8">
            <t-button variant="text" theme="primary" size="small" @click="handleEdit(row)">
              <template #icon>
                <t-icon name="edit" />
              </template>
              编辑
            </t-button>
            <t-popconfirm
              content="确定要删除该配方吗？"
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
      <p>确定要删除配方 <strong>{{ deleteTarget?.name }}</strong> 吗？</p>
      <p class="delete-info">删除后无法恢复，请谨慎操作。</p>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useFormulaStore } from '@/stores/formula'
import { useCustomerStore } from '@/stores/customer'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Formula } from '@/types/formula'

const router = useRouter()
const formulaStore = useFormulaStore()
const customerStore = useCustomerStore()

const searchForm = reactive({
  keyword: '',
  customerId: ''
})

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<Formula | null>(null)

const columns = [
  { colKey: 'name', title: '配方名称', width: 200 },
  { colKey: 'customerName', title: '所属客户', width: 150 },
  { colKey: 'materialCount', title: '原料数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' }
]

const materialColumns = [
  { colKey: 'materialName', title: '原料名称', width: 200 },
  { colKey: 'quantity', title: '数量', width: 120 }
]

const pagination = computed(() => ({
  current: formulaStore.query.page,
  pageSize: formulaStore.query.pageSize,
  total: formulaStore.total,
  showJumper: true,
  showSizeChanger: true,
  pageSizeOptions: [10, 20, 50, 100],
  onChange: (pageInfo: any) => {
    formulaStore.setQuery({ page: pageInfo.current, pageSize: pageInfo.pageSize })
  }
}))

const handleSearch = () => {
  formulaStore.setQuery({
    keyword: searchForm.keyword,
    customerId: searchForm.customerId,
    page: 1
  })
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.customerId = ''
  formulaStore.resetQuery()
}

const handleCreate = () => {
  router.push('/formulas/new')
}

const handleEdit = (row: Formula) => {
  router.push(`/formulas/${row.id}/edit`)
}

const handleDelete = (row: Formula) => {
  deleteTarget.value = row
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  deleteLoading.value = true
  try {
    const result = await formulaStore.deleteFormula(deleteTarget.value.id)
    if (result.success) {
      MessagePlugin.success('删除成功')
      deleteDialogVisible.value = false
      deleteTarget.value = null
    } else {
      MessagePlugin.error(result.message || '删除失败')
    }
  } finally {
    deleteLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    customerStore.fetchCustomers(),
    formulaStore.fetchFormulas()
  ])
})
</script>

<style scoped lang="scss">
.formula-list {
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

  .expanded-content {
    padding: 16px 24px;
    background-color: #FFF9F7;
    border-radius: 10px;
    border: 1px solid #FFF0F3;

    .materials-section {
      margin-bottom: 16px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #5D4E60;
        display: flex;
        align-items: center;
        gap: 6px;

        &::before {
          content: '';
          display: inline-block;
          width: 4px;
          height: 16px;
          background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
          border-radius: 2px;
        }
      }
    }
  }

  .description-section {
    h4 {
      margin: 0 0 8px 0;
      font-size: 15px;
      font-weight: 600;
      color: #5D4E60;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 16px;
        background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
        border-radius: 2px;
      }
    }

    p {
      margin: 0;
      font-size: 14px;
      color: #9B8FA0;
      line-height: 1.6;
      padding: 12px;
      background: white;
      border-radius: 8px;
      border-left: 3px solid #FFD6E0;
    }
  }

  .delete-warning {
    color: #E34D59;
    font-size: 14px;
    margin-top: 8px;
  }

  .delete-info {
    color: #5D4E60;
    font-size: 14px;
    margin-top: 8px;
    padding: 12px;
    background: #FFF9F7;
    border-radius: 8px;
    border-left: 3px solid #FFD6E0;
  }

  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important;
    font-weight: 600 !important;

    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important;
      box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;

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
