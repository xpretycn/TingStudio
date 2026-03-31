<template>
  <div class="formula-list">
    <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="6" />
    <t-card v-else class="content-card" bordered>
      <t-table
        :data="formulaStore.formulas"
        :columns="columns"
        :loading="formulaStore.loading"
        :pagination="undefined"
        row-key="id"
        hover
        stripe
        table-layout="auto"
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
          <t-empty description="暂无配方数据">
            <template #action>
              <t-button theme="primary" @click="handleCreate">
                <template #icon><t-icon name="add" /></template>创建第一个配方
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
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const router = useRouter()
const formulaStore = useFormulaStore()
const salesmanStore = useSalesmanStore()
const paginationStore = usePaginationStore()

const initialized = ref(false)

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
  { colKey: 'operation', title: '操作', width: 230 }
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
  initialized.value = true
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
    box-shadow: $shadow-xs;
    transition: box-shadow $transition-normal;

    &:hover {
      box-shadow: $shadow-md;
    }
  }

  .expanded-content {
    padding: $space-4 $space-6;
    background-color: $bg-page;
    border-radius: $radius-lg;
    border: 1px solid $border-color-light;

    .version-section {
      margin-bottom: $space-4;

      h4 {
        margin: 0 0 $space-3 0;
        font-size: 15px;
        font-weight: $font-weight-semibold;
        color: $text-primary;
        display: flex;
        align-items: center;
        gap: $space-2;

        &::before {
          content: '';
          display: inline-block;
          width: $space-1;
          height: $font-size-h3;
          background: $gradient-btn;
          border-radius: $radius-xs;
        }
      }
    }

    .version-list {
      display: flex;
      flex-direction: column;
      gap: $space-2;
    }

    .version-item {
      display: flex;
      align-items: center;
      gap: $space-4;
      padding: 10px $space-4;
      background: $bg-container;
      border-radius: $radius-md;
      border: 1px solid $border-color;
      transition: $transition-fast;

      &:hover {
        border-color: $brand-primary-lightest;
        background: $bg-container-alt;
      }

      &.is-current {
        border-color: $color-success-strong;
        background: $color-success-light;
      }
    }

    .version-left {
      display: flex;
      align-items: center;
      gap: $space-2;
      flex-shrink: 0;
      min-width: 160px;
    }

    .version-number {
      font-size: $font-size-body;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    .current-tag {
      font-size: $font-size-micro;
    }

    .version-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .version-name {
      font-size: $font-size-body;
      color: $text-primary;
      font-weight: $font-weight-medium;
    }

    .version-reason {
      font-size: $font-size-caption;
      color: $brand-primary;
      background: $brand-primary-bg;
      padding: 1px $space-2;
      border-radius: $radius-xs;
    }

    .version-time {
      font-size: $font-size-caption;
      color: $text-secondary;
    }

    .version-changes {
      flex-shrink: 0;

      .changes-detail {
        margin-top: $space-2;
        padding: $space-2 $space-3;
        background: $bg-container-alt;
        border-radius: $radius-sm;
        border: 1px solid $border-color;
      }

      .changes-list {
        display: flex;
        flex-direction: column;
        gap: $space-1_5;
      }

      .change-row {
        display: flex;
        align-items: center;
        gap: $space-2;
        font-size: $font-size-body-sm;
        padding: $space-1 0;
      }

      .change-type-tag {
        flex-shrink: 0;
      }

      .change-label {
        color: $text-primary;
        font-weight: $font-weight-medium;
        flex-shrink: 0;
      }

      .change-values {
        display: flex;
        align-items: center;
        gap: $space-1_5;
      }

      .change-old {
        color: $color-danger;
        text-decoration: line-through;
        background: $color-danger-light;
        padding: 1px $space-2;
        border-radius: $radius-xs;
      }

      .change-arrow {
        color: $text-secondary;
        font-weight: $font-weight-semibold;
      }

      .change-new {
        color: $color-success;
        background: $color-success-medium;
        padding: 1px $space-2;
        border-radius: $radius-xs;
        font-weight: $font-weight-semibold;
      }

      .changes-empty {
        text-align: center;
        color: $text-secondary;
        font-size: $font-size-body-sm;
        padding: $space-2 0;
      }
    }

    .empty-versions {
      text-align: center;
      padding: $space-6;
      color: $text-secondary;
      font-size: $font-size-body;
    }
  }

  .description-section {
    margin-bottom: $space-4;

    h4 {
      margin: 0 0 $space-3 0;
      font-size: 15px;
      font-weight: $font-weight-semibold;
      color: $text-primary;
      display: flex;
      align-items: center;
      gap: $space-1_5;

      &::before {
        content: '';
        display: inline-block;
        width: $space-1;
        height: $font-size-h3;
        background: $gradient-btn;
        border-radius: $radius-xs;
      }
    }

    .desc-tags {
      display: flex;
      flex-wrap: wrap;
      gap: $space-2;
    }

    p {
      margin: 0;
      font-size: $font-size-body;
      color: $text-secondary;
      line-height: $line-height-normal;
      padding: $space-3;
      background: $bg-container;
      border-radius: $radius-md;
      border-left: 3px solid $brand-primary-lightest;
    }
  }

  .delete-warning {
    color: $color-danger;
    font-size: $font-size-body;
    margin-top: $space-2;
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

  :deep(.btn-view) {
    display: none;
  }

  :deep(.btn-edit) {
    color: $color-info !important;
    border-color: $color-info-strong !important;
    background: $color-info-light !important;

    :deep(.t-button__icon) {
      color: $color-info !important;
    }

    &:hover {
      color: $color-info-dark !important;
      border-color: $color-info-dark !important;
      background: $color-info-medium !important;
    }
  }

  :deep(.btn-delete) {
    color: $color-danger !important;
    border-color: $color-danger-medium !important;
    background: $color-danger-light !important;

    :deep(.t-button__icon) {
      color: $color-danger !important;
    }

    &:hover {
      color: $color-danger !important;
      border-color: $color-danger !important;
      background: $color-danger-medium !important;
    }
  }

  :deep(.btn-more) {
    color: $text-primary !important;
    border-color: $border-color !important;
    background: $overlay-white-90 !important;

    :deep(.t-button__icon) {
      color: $text-primary !important;
    }

    &:hover {
      color: $color-info !important;
      border-color: $color-info !important;
    }
  }

  // 按钮和表格样式由全局 main.scss 统一覆盖，此处仅保留行级细节
  :deep(.t-table) {
    .t-table__row { cursor: pointer; }
  }
}
</style>
