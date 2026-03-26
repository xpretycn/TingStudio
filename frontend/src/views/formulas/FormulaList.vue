<template>
  <div class="formula-list">
    <t-card class="content-card" bordered>
      <t-table
        :data="formulaStore.formulas"
        :columns="columns"
        :loading="formulaStore.loading"
        :pagination="undefined"
        row-key="id"
        hover
        stripe
        :expandable="true"
      >
        <template #expandedRow="{ row }">
          <div class="expanded-content">
            <div class="description-section" v-if="getFormulaDesc(row.description)">
              <h4>配方信息</h4>
              <div class="desc-tags">
                <t-tag v-if="getFormulaDesc(row.description).productType" theme="primary" variant="light" size="medium">
                  {{ getFormulaDesc(row.description).productType }}
                </t-tag>
                <t-tag v-if="getFormulaDesc(row.description).dosage" theme="warning" variant="light" size="medium">
                  {{ getFormulaDesc(row.description).dosage }}
                </t-tag>
                <t-tag v-if="getFormulaDesc(row.description).efficacy" theme="success" variant="light" size="medium">
                  {{ getFormulaDesc(row.description).efficacy }}
                </t-tag>
                <t-tag v-if="getFormulaDesc(row.description).totalQuote != null" theme="danger" variant="light" size="medium">
                  报价: ¥{{ getFormulaDesc(row.description).totalQuote.toFixed(4) }}
                </t-tag>
              </div>
            </div>
            <div class="materials-section">
              <h4>原料清单</h4>
              <t-table
                :data="row.materials || []"
                :columns="materialColumns"
                size="small"
                bordered
              />
            </div>
          </div>
        </template>

        <template #salesmanName="{ row }">
          <t-tag theme="primary" variant="light">
            <template #icon>
              <t-icon name="user" />
            </template>
            {{ row.salesmanName }}
          </t-tag>
        </template>

        <template #materialCount="{ row }">
          <t-tag theme="success" variant="light">
            <template #icon>
              <t-icon name="layers" />
            </template>
            {{ (row.materials || []).length }} 种原料
          </t-tag>
        </template>

        <template #empty>
          <t-empty description="暂无配方数据" />
        </template>

        <template #operation="{ row }">
          <t-space :size="6">
            <t-button variant="outline" theme="default" size="small" @click="handleView(row)">
              <template #icon><t-icon name="browse" /></template>
              查看
            </t-button>
            <t-button variant="outline" theme="primary" size="small" class="btn-edit" @click.stop="handleEdit(row)">
              <template #icon>
                <t-icon name="edit" />
              </template>
              编辑
            </t-button>
            <t-dropdown :options="moreOptions(row)" @click="handleMoreAction">
              <t-button variant="outline" theme="default" size="small" class="btn-more" @click.stop>
                <template #icon>
                  <t-icon name="ellipsis" />
                </template>
                更多
              </t-button>
            </t-dropdown>
            <t-popconfirm
              content="确定要删除该配方吗？"
              @confirm="handleDelete(row)"
            >
              <t-button variant="outline" theme="danger" size="small" class="btn-delete" @click.stop>
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
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFormulaStore } from '@/stores/formula'
import { useSalesmanStore } from '@/stores/salesman'
import { usePaginationStore } from '@/stores/pagination'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Formula } from '@/api/formula'

const router = useRouter()
const formulaStore = useFormulaStore()
const salesmanStore = useSalesmanStore()
const paginationStore = usePaginationStore()

const getFormulaDesc = (description: string | null | undefined) => {
  if (!description || typeof description !== 'string') return null
  try {
    const obj = JSON.parse(description)
    return typeof obj === 'object' && obj !== null ? obj : null
  } catch {
    return null
  }
}

const searchForm = reactive({
  keyword: '',
  salesmanId: ''
})

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<Formula | null>(null)

const columns = [
  { colKey: 'name', title: '配方名称', width: 200 },
  { colKey: 'salesmanName', title: '所属业务员', width: 150 },
  { colKey: 'materialCount', title: '原料数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 230, fixed: 'right' }
]

const materialColumns = [
  { colKey: 'materialName', title: '原料名称', width: 200 },
  { colKey: 'quantity', title: '数量', width: 120 }
]

const pagination = computed(() => ({
  current: formulaStore.currentPage,
  pageSize: formulaStore.pageSize,
  total: formulaStore.total,
  onChange: (pageInfo: any) => {
    formulaStore.setPage(pageInfo.current)
    formulaStore.fetchFormulas()
  }
}))

// 注册分页到全局 paginationStore
onMounted(() => {
  paginationStore.register(pagination.value)
  // 监听分页数据变化，同步到 paginationStore
  watch(pagination, (val) => paginationStore.update(val), { deep: true })
})

onUnmounted(() => {
  paginationStore.unregister()
})

const handleSearch = () => {
  formulaStore.setKeyword(searchForm.keyword)
  if (searchForm.salesmanId) {
    formulaStore.setSalesmanId(searchForm.salesmanId)
  } else {
    formulaStore.setSalesmanId('')
  }
  formulaStore.fetchFormulas()
}

const handleReset = () => {
  searchForm.keyword = ''
  searchForm.salesmanId = ''
  formulaStore.setKeyword('')
  formulaStore.setSalesmanId('')
  formulaStore.fetchFormulas()
}

const handleCreate = () => {
  router.push('/formulas/new')
}

const handleView = (row: Formula) => {
  router.push(`/formulas/${row.id}`)
}

const handleEdit = (row: Formula) => {
  router.push(`/formulas/${row.id}/edit`)
}

const moreOptions = (row: Formula) => [
  { content: '版本管理', value: `version:${row.id}` },
  { content: '营养分析', value: `nutrition:${row.id}` },
  { content: '导出配方', value: `export:${row.id}` }
]

const handleMoreAction = (data: any) => {
  const [action, id] = data.value.split(':')
  if (action === 'version') router.push(`/versions/formula/${id}`)
  else if (action === 'nutrition') router.push({ path: '/nutrition', query: { formulaId: id } })
  else if (action === 'export') router.push({ path: '/exports', query: { formulaId: id } })
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
    salesmanStore.fetchSalesmen(),
    formulaStore.fetchFormulas()
  ])
})
</script>

<style scoped lang="scss">
.formula-list {
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

    .desc-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
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

  :deep(.btn-view) {
    display: none;
  }

  :deep(.btn-edit) {
    color: #2952CC !important;
    border-color: #C5D1F8 !important;
    background: #EDF2FF !important;

    :deep(.t-button__icon) {
      color: #2952CC !important;
    }

    &:hover {
      color: #0052D9 !important;
      border-color: #0052D9 !important;
      background: #ECF3FF !important;
    }
  }

  :deep(.btn-delete) {
    color: #D54941 !important;
    border-color: #F5C6C2 !important;
    background: #FFF1EF !important;

    :deep(.t-button__icon) {
      color: #D54941 !important;
    }

    &:hover {
      color: #E34D59 !important;
      border-color: #E34D59 !important;
      background: #FEF0EF !important;
    }
  }

  :deep(.btn-more) {
    color: #5D4E60 !important;
    border-color: #DCD3DE !important;
    background: rgba(255, 255, 255, 0.9) !important;

    :deep(.t-button__icon) {
      color: #5D4E60 !important;
    }

    &:hover {
      color: #2952CC !important;
      border-color: #2952CC !important;
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

    .t-table__row {
      cursor: pointer;
    }
  }
}
</style>
