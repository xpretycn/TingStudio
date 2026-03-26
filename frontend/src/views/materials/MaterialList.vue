<template>
  <div class="material-list">
    <t-card class="content-card" bordered>
      <t-table
        :data="materialStore.materials"
        :columns="columns"
        :loading="materialStore.loading"
        :pagination="undefined"
        row-key="id"
        hover
        stripe
      >
        <template #stock="{ row }">
          <t-tag :theme="row.stock > 0 ? 'success' : 'danger'">
            <template #icon>
              <t-icon :name="row.stock > 0 ? 'check-circle' : 'error-circle'" />
            </template>
            {{ row.stock }} {{ row.unit }}
          </t-tag>
        </template>

        <template #empty>
          <t-empty description="暂无原料数据" />
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
            <t-popconfirm
              content="确定要删除该原料吗？"
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
        content: '确定',
        theme: 'danger',
        loading: deleteLoading
      }"
      @confirm="confirmDelete"
    >
      <p>确定要删除原料 <strong>{{ deleteTarget?.name }}</strong> 吗？</p>
      <p class="delete-info">
        删除后无法恢复，请谨慎操作。
      </p>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useMaterialStore } from '@/stores/material'
import { usePaginationStore } from '@/stores/pagination'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Material } from '@/api/material'

const router = useRouter()
const materialStore = useMaterialStore()
const paginationStore = usePaginationStore()

const searchForm = reactive({
  keyword: ''
})

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<Material | null>(null)

const columns = [
  { colKey: 'code', title: '原料编码', width: 120 },
  { colKey: 'name', title: '原料名称', width: 200 },
  { colKey: 'materialType', title: '类型', width: 90, cell: (h: any, { row }: any) => {
    if (row.materialType === 'supplement') {
      return h('t-tag', { theme: 'primary', variant: 'light-outline', size: 'small' }, '辅料')
    }
    return h('t-tag', { theme: 'success', variant: 'light-outline', size: 'small' }, '药材')
  }},
  { colKey: 'ratioFactor', title: '含量比系数', width: 110 },
  { colKey: 'unit', title: '单位', width: 80 },
  { colKey: 'stock', title: '库存', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 150, fixed: 'right' }
]

const pagination = computed(() => ({
  current: materialStore.currentPage,
  pageSize: materialStore.pageSize,
  total: materialStore.total,
  onChange: (pageInfo: any) => {
    materialStore.setPage(pageInfo.current)
    materialStore.fetchMaterials()
  }
}))

// 注册分页到全局 paginationStore
onMounted(() => {
  window.addEventListener('global-search', handleGlobalSearch)
  paginationStore.register(pagination.value)
  watch(pagination, (val) => paginationStore.update(val), { deep: true })
  materialStore.fetchMaterials()
})

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch)
  paginationStore.unregister()
})

const handleReset = () => {
  searchForm.keyword = ''
  materialStore.setKeyword('')
  materialStore.fetchMaterials()
}

// 监听全局搜索事件（来自首页搜索框）
const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || ''
  searchForm.keyword = keyword
  materialStore.setKeyword(keyword)
  materialStore.fetchMaterials()
}

const handleCreate = () => {
  router.push('/materials/new')
}

const handleView = (row: Material) => {
  router.push(`/materials/${row.id}`)
}

const handleEdit = (row: Material) => {
  router.push(`/materials/${row.id}/edit`)
}

const handleDelete = (row: Material) => {
  deleteTarget.value = row
  deleteDialogVisible.value = true
}

const confirmDelete = async () => {
  if (!deleteTarget.value) return

  deleteLoading.value = true
  try {
    const result = await materialStore.deleteMaterial(deleteTarget.value.id)
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
</script>

<style scoped lang="scss">
.material-list {
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
