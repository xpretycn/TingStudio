<template>
  <div class="material-list" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="8" />
      <t-card v-else class="content-card" bordered>
      <!-- 批量操作栏 -->
      <Transition name="batch-bar">
        <div v-if="selectedRows.length > 0" class="batch-action-bar">
          <div class="batch-info">
            <t-checkbox :checked="isAllSelected" :indeterminate="isIndeterminate" @change="handleSelectAll" />
            <span class="batch-count">已选 <strong>{{ selectedRows.length }}</strong> 项</span>
          </div>
          <div class="batch-actions">
            <t-popconfirm content="确定要删除所选原料吗？" @confirm="handleBatchDelete">
              <t-button theme="danger" variant="outline" size="small">
                <template #icon><t-icon name="delete" /></template>批量删除
              </t-button>
            </t-popconfirm>
            <t-button theme="default" variant="outline" size="small" @click="clearSelection">
              取消选择
            </t-button>
          </div>
        </div>
      </Transition>
      <t-table
        :data="sortedMaterials"
        :columns="columns"
        :loading="materialStore.loading"
        :pagination="undefined"
        :sort="tableSort"
        row-key="id"
        hover
        table-layout="auto"
        @sort-change="onSortChange"
        @select-change="handleSelectChange"
        :selected-row-keys="selectedRowKeys"
      >
        <template #stock="{ row }">
          {{ row.stock }} {{ row.unit }}
        </template>

        <template #materialType="{ row }">
          <t-tag
            :theme="row.materialType === 'supplement' ? 'primary' : 'success'"
            variant="light-outline"
            size="small"
          >
            {{ row.materialType === 'supplement' ? '辅料' : '药材' }}
          </t-tag>
        </template>

        <template #nutrition="{ row }">
          <t-tag
            v-if="nutritionMap[row.id]"
            theme="warning"
            variant="light-outline"
            size="small"
          >
            <template #icon><t-icon name="chart-bar" size="14px" /></template>
            {{ nutritionMap[row.id] }}项
          </t-tag>
          <span v-else style="color: $text-placeholder; font-size: $font-size-caption;">未录入</span>
        </template>

        <template #empty>
          <t-empty description="暂无原料数据" role="status">
            <template #action>
              <t-button theme="primary" @click="handleCreate">
                <template #icon><t-icon name="add" /></template>录入原料
              </t-button>
            </template>
          </t-empty>
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
      
      <!-- 分页 -->
      <div v-if="paginationStore.visible" class="table-pagination">
        <t-pagination aria-label="分页导航" v-bind="paginationStore.paginationConfig" />
      </div>
    </t-card>
    </Transition>

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
import { nutritionApi } from '@/api/nutrition'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Material } from '@/api/material'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const router = useRouter()
const materialStore = useMaterialStore()
const paginationStore = usePaginationStore()

const initialized = ref(false)

const searchForm = reactive({
  keyword: ''
})

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<Material | null>(null)
const nutritionMap = ref<Record<string, string>>({})
const selectedRowKeys = ref<(string | number)[]>([])
const selectedRows = ref<Material[]>([])
const tableSort = ref<any>(undefined)
const sortedMaterials = ref<Material[]>([])

const onSortChange = (sort: any) => {
  tableSort.value = sort
  if (!sort || !sort.sortBy) {
    sortedMaterials.value = [...materialStore.materials]
    return
  }
  const { sortBy, descending } = sort
  const col = columns.find(c => c.colKey === sortBy)
  if (col?.sorter) {
    sortedMaterials.value = [...materialStore.materials].sort((a, b) => {
      const result = (col.sorter as Function)(a, b)
      return descending ? -result : result
    })
  } else {
    sortedMaterials.value = [...materialStore.materials]
  }
}

watch(() => materialStore.materials, (val) => {
  if (tableSort.value?.sortBy) {
    onSortChange(tableSort.value)
  } else {
    sortedMaterials.value = [...val]
  }
}, { immediate: true })

// ─── 批量操作 ───
const isAllSelected = computed(() => {
  return selectedRowKeys.value.length > 0 && selectedRowKeys.value.length === materialStore.materials.length
})
const isIndeterminate = computed(() => {
  return selectedRowKeys.value.length > 0 && selectedRowKeys.value.length < materialStore.materials.length
})

const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: Material[] }) => {
  selectedRowKeys.value = value
  selectedRows.value = selectedRowData
}

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    selectedRowKeys.value = materialStore.materials.map(m => m.id)
    selectedRows.value = [...materialStore.materials]
  } else {
    clearSelection()
  }
}

const clearSelection = () => {
  selectedRowKeys.value = []
  selectedRows.value = []
}

const handleBatchDelete = async () => {
  const count = selectedRows.value.length
  try {
    for (const m of selectedRows.value) {
      await materialStore.deleteMaterial(m.id)
    }
    MessagePlugin.success(`成功删除 ${count} 个原料`)
    clearSelection()
  } catch {
    MessagePlugin.error('批量删除失败')
  }
}

const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'code', title: '原料编码', width: 100, sorter: (a: any, b: any) => a.code.localeCompare(b.code) },
  { colKey: 'name', title: '原料名称', width: 200, sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh') },
  { colKey: 'materialType', title: '类型', width: 90, sorter: (a: any, b: any) => (a.materialType || '').localeCompare(b.materialType || '') },
  { colKey: 'unit', title: '单位', width: 80 },
  { colKey: 'stock', title: '库存', width: 90, sorter: (a: any, b: any) => (a.stock || 0) - (b.stock || 0) },
  { colKey: 'nutrition', title: '营养', width: 90 },
  { colKey: 'createdAt', title: '创建时间', width: 150, sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  { colKey: 'operation', title: '操作', width: 200, align: 'center' }
]

const pagination = computed(() => ({
  current: materialStore.currentPage,
  pageSize: materialStore.pageSize,
  total: materialStore.total,
  onChange: (pageInfo: any) => {
    materialStore.setPage(pageInfo.current)
    loadMaterials()
  }
}))

// 注册分页到全局 paginationStore
onMounted(() => {
  window.addEventListener('global-search', handleGlobalSearch)
  paginationStore.register(pagination.value)
  watch(pagination, (val) => paginationStore.update(val), { deep: true })
  loadMaterials()
})

// 加载原料列表并刷新营养状态
const loadMaterials = async () => {
  await materialStore.fetchMaterials()
  initialized.value = true
  loadNutritionStatus()
}

// 批量检查营养数据状态
const loadNutritionStatus = async () => {
  const materials = materialStore.materials
  if (!materials.length) return
  const map: Record<string, string> = {}
  const promises = materials.map(async (m: Material) => {
    try {
      // axios 拦截器已经提取了 res.data，res 直接是营养数据对象
      const res = await nutritionApi.getMaterialNutrition(m.id) as any
      // res 的结构：{ per100g: {...}, dataSource?: string, notes?: string }
      if (res?.per100g) {
        const count = Object.keys(res.per100g).filter(k => res.per100g[k] > 0).length
        if (count > 0) map[m.id] = `${count}`
      }
    } catch { /* no data */ }
  })
  await Promise.all(promises)
  nutritionMap.value = map
}

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch)
  paginationStore.unregister()
})

const handleReset = () => {
  searchForm.keyword = ''
  materialStore.setKeyword('')
  loadMaterials()
}

// 监听全局搜索事件（来自首页搜索框）
const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || ''
  searchForm.keyword = keyword
  materialStore.setKeyword(keyword)
  loadMaterials()
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
      loadNutritionStatus()
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
  // ─── 批量操作栏 ───
  .batch-action-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-3;
    padding: $space-3 $space-4;
    margin-bottom: $space-4;
    background: linear-gradient(135deg, $brand-primary-bg, $overlay-pink-bg-60);
    border: 1.5px solid $brand-primary-lightest;
    border-radius: $radius-lg;
    animation: batchBarSlideIn 0.3s ease both;

    .batch-info {
      display: flex;
      align-items: center;
      gap: $space-2;

      .batch-count {
        font-size: $font-size-body-sm;
        color: $text-primary;
      }
    }

    .batch-actions {
      display: flex;
      align-items: center;
      gap: $space-2;
    }
  }

  .content-card {
    min-height: 400px;
    box-shadow: $shadow-xs;
    transition: box-shadow $transition-normal;

    &:hover {
      box-shadow: $shadow-md;
    }

    // 表格行 stagger 入场动画
    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
      @include stagger-rows(20, 0.03s);
    }
  }

  .delete-warning {
    color: $color-danger;
    font-size: $font-size-body;
    margin-top: $space-2;
    padding: $space-3;
    background: $color-danger-light;
    border-radius: $radius-md;
    border-left: 3px solid $color-danger;
  }

  .delete-info {
    color: $text-primary;
    font-size: $font-size-body;
    margin-top: $space-2;
    padding: $space-3;
    background: $bg-page;
    border-radius: $radius-md;
    border-left: 3px solid $brand-primary-lightest;
  }

  // 按钮和表格样式由全局 _td-overrides.scss 统一覆盖，此处仅保留行级细节
  :deep(.t-table) {
    .t-table__row { cursor: pointer; }
  }
}

@keyframes batchBarSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// 分页样式
.table-pagination {
  margin-top: 16px;
  padding: 12px 0;
  display: flex;
  justify-content: flex-end;
  
  :deep(.t-pagination) {
    .t-pagination__total {
      color: var(--text-secondary);
      font-size: 13px;
    }

    .t-pagination__btn {
      color: var(--text-primary);
      border-radius: 8px;
      min-width: 32px;
      
      &:hover {
        color: var(--color-primary);
        border-color: var(--color-primary-light);
        background: var(--color-primary-lightest);
      }

      &.t-is-disabled {
        color: var(--text-disabled);
        border-color: var(--border-color-light);
      }

      &.t-is-current {
        color: #fff;
        background: var(--color-primary);
        border-color: var(--color-primary);
        font-weight: 600;
      }
    }

    .t-pagination__select {
      border-color: var(--color-primary-lightest);
      border-radius: 8px;
      color: var(--text-primary);
    }

    .t-pagination__jumper-input {
      border-color: var(--color-primary-lightest);
      border-radius: 8px;
      color: var(--text-primary);
    }
  }
}
</style>
