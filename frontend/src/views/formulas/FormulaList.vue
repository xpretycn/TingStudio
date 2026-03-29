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
        :expanded-row-keys="expandedRowKeys"
        @expand-change="onExpandChange"
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
            <div class="version-section">
              <h4>版本记录 <t-tag size="small" variant="light" theme="primary">{{ row.versions?.length || 0 }} 个版本</t-tag></h4>
              <div v-if="row.versions && row.versions.length" class="version-list">
                <div
                  v-for="ver in row.versions"
                  :key="ver.versionId"
                  class="version-item"
                  :class="{ 'is-current': ver.isCurrent }"
                >
                  <div class="version-left">
                    <span class="version-number">{{ ver.versionNumber }}</span>
                    <t-tag
                      v-if="ver.isCurrent"
                      size="small"
                      theme="success"
                      variant="dark"
                      class="current-tag"
                    >当前</t-tag>
                    <t-tag
                      v-else
                      :theme="ver.status === 'published' ? 'primary' : ver.status === 'draft' ? 'warning' : 'default'"
                      size="small"
                      variant="light"
                    >{{ ver.status === 'published' ? '已发布' : ver.status === 'draft' ? '草稿' : '已归档' }}</t-tag>
                  </div>
                  <div class="version-center">
                    <span class="version-name">{{ ver.versionName }}</span>
                    <span v-if="ver.versionReason" class="version-reason">原因: {{ ver.versionReason }}</span>
                    <span class="version-time">{{ ver.createdAt }}</span>
                  </div>
                  <div v-if="ver.changesJson && parseChanges(ver.changesJson).length" class="version-changes">
                    <div class="changes-detail">
                      <div class="changes-list">
                        <div
                          v-for="(change, ci) in parseChanges(ver.changesJson)"
                          :key="ci"
                          class="change-row"
                        >
                          <t-tag
                            size="small"
                            :theme="change.changeType === 'add' ? 'success' : change.changeType === 'delete' ? 'danger' : 'warning'"
                            variant="light"
                            class="change-type-tag"
                          >{{ change.changeType === 'add' ? '新增' : change.changeType === 'delete' ? '删除' : '修改' }}</t-tag>
                          <span class="change-label">{{ change.fieldLabel }}</span>
                          <span class="change-values">
                            <span v-if="change.oldValue !== null" class="change-old">{{ change.oldValue }}</span>
                            <span v-if="change.oldValue !== null && change.newValue !== null" class="change-arrow">→</span>
                            <span v-if="change.newValue !== null" class="change-new">{{ change.newValue }}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="empty-versions">暂无版本记录</div>
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

        <template #formulaStatus="{ row }">
          <t-tag
            :theme="getFormulaStatus(row).theme"
            :variant="getFormulaStatus(row).variant"
            size="medium"
          >
            <template #icon>
              <t-icon :name="getFormulaStatus(row).icon" />
            </template>
            {{ getFormulaStatus(row).label }}
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
const expandedRowKeys = ref<(string | number)[]>([])

const onExpandChange = (keys: Array<string | number>) => {
  expandedRowKeys.value = keys
}

const parseChanges = (changesJson: string): any[] => {
  try {
    const arr = JSON.parse(changesJson)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const getFormulaStatus = (row: any) => {
  const currentVersion = (row.versions || []).find((v: any) => v.isCurrent)
  if (currentVersion && currentVersion.status === 'published') {
    return { label: '已发布', theme: 'success', variant: 'light' as const, icon: 'check-circle' }
  }
  if (currentVersion && currentVersion.status === 'draft') {
    return { label: '草稿', theme: 'warning', variant: 'light' as const, icon: 'edit' }
  }
  if (!row.versions || row.versions.length === 0) {
    return { label: '未发布', theme: 'default', variant: 'light' as const, icon: 'time' }
  }
  return { label: '已归档', theme: 'default', variant: 'light' as const, icon: 'folder' }
}

const columns = [
  { colKey: 'name', title: '配方名称', width: 200 },
  { colKey: 'salesmanName', title: '所属业务员', width: 150 },
  { colKey: 'formulaStatus', title: '状态', width: 100 },
  { colKey: 'materialCount', title: '原料数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180 },
  { colKey: 'operation', title: '操作', width: 230, fixed: 'right' }
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

onMounted(async () => {
  window.addEventListener('global-search', handleGlobalSearch)
  await Promise.all([
    salesmanStore.fetchSalesmen(),
    formulaStore.fetchFormulas()
  ])
})

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch)
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

// 监听全局搜索事件（来自首页搜索框）
const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || ''
  searchForm.keyword = keyword
  handleSearch()
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

    .version-section {
      margin-bottom: 16px;

      h4 {
        margin: 0 0 12px 0;
        font-size: 15px;
        font-weight: 600;
        color: #5D4E60;
        display: flex;
        align-items: center;
        gap: 8px;

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

    .version-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .version-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 10px 16px;
      background: white;
      border-radius: 8px;
      border: 1px solid #F0F0F0;
      transition: all 0.2s;

      &:hover {
        border-color: #FFD6E0;
        background: #FFFDFC;
      }

      &.is-current {
        border-color: #D9F7BE;
        background: #F6FFED;
      }
    }

    .version-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      min-width: 160px;
    }

    .version-number {
      font-size: 14px;
      font-weight: 600;
      color: #5D4E60;
    }

    .current-tag {
      font-size: 11px;
    }

    .version-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .version-name {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .version-reason {
      font-size: 12px;
      color: #FF6B8A;
      background: #FFF0F3;
      padding: 1px 8px;
      border-radius: 4px;
    }

    .version-time {
      font-size: 12px;
      color: #9B8FA0;
    }

    .version-changes {
      flex-shrink: 0;

      .changes-detail {
        margin-top: 8px;
        padding: 10px 14px;
        background: #FAFAFA;
        border-radius: 6px;
        border: 1px solid #F0F0F0;
      }

      .changes-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .change-row {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 13px;
        padding: 4px 0;
      }

      .change-type-tag {
        flex-shrink: 0;
      }

      .change-label {
        color: #5D4E60;
        font-weight: 500;
        flex-shrink: 0;
      }

      .change-values {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .change-old {
        color: #E34D59;
        text-decoration: line-through;
        background: #FEF0EF;
        padding: 1px 8px;
        border-radius: 4px;
      }

      .change-arrow {
        color: #9B8FA0;
        font-weight: 600;
      }

      .change-new {
        color: #2BA471;
        background: #E8F8F2;
        padding: 1px 8px;
        border-radius: 4px;
        font-weight: 600;
      }

      .changes-empty {
        text-align: center;
        color: #9B8FA0;
        font-size: 13px;
        padding: 8px 0;
      }
    }

    .empty-versions {
      text-align: center;
      padding: 24px;
      color: #9B8FA0;
      font-size: 14px;
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
