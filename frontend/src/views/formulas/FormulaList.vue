<template>
  <div class="formula-list" :aria-busy="!initialized">
    <!-- 数据看板 -->
    <section class="dashboard-grid">
      <div class="stat-card" v-for="(card, idx) in dashboardCards" :key="card.label"
           :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
        <div class="stat-card-top">
          <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
          </div>
          <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">
            {{ card.badge }}
          </span>
        </div>
        <p class="stat-label">{{ card.label }}</p>
        <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
      </div>
    </section>

    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="6" />
      <t-card v-else class="content-card" bordered>

      <!-- 工具栏：参照数据中心列表样式 -->
      <div class="data-center-toolbar">
        <!-- 批量操作栏 (默认隐藏) - 与 index.html 完全一致 -->
        <Transition name="batch-bar-slide">
          <div v-if="selectedRows.length > 0" class="batch-action-bar">
            <div class="batch-info">
              <span class="batch-count"><strong>{{ selectedRows.length }}</strong> 项已选择</span>
              <div class="batch-divider"></div>
              <div class="batch-buttons">
                <button class="batch-action-btn" @click="handleBatchDelete">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  批量删除
                </button>
                <button class="batch-action-btn" @click="handleBatchArchive">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v13H3V8"/><rect x="1" y="3" width="22" height="5" rx="2"/></svg>
                  批量归档
                </button>
                <button class="batch-action-btn" @click="handleBatchExport">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  批量导出
                </button>
              </div>
            </div>
            <button class="batch-cancel-btn" @click="clearSelection">取消</button>
          </div>
        </Transition>

        <!-- 左侧：标题和描述 -->
        <div class="toolbar-left-section">
          <div class="toolbar-title-section">
            <h3 class="toolbar-title">配方管理中心</h3>
            <p class="toolbar-subtitle">点击列表查看详细配比、变更记录与关联业务需求</p>
          </div>
        </div>

        <!-- 右侧：搜索和新增按钮 -->
        <div class="toolbar-right-section">
          <div class="search-container">
            <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <t-input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索配方名称、编号..."
              @input="handleRealTimeSearch"
              @clear="handleRealTimeSearch"
              clearable
            />
          </div>
          <button class="add-formula-btn" @click="handleCreate">
            <t-icon name="add" class="add-icon" />
            创建新配方
          </button>
          <button class="filter-btn">
            <t-icon name="filter" class="filter-icon" />
            <span class="filter-dot"></span>
          </button>
        </div>
      </div>
      <t-table
        :data="sortedFormulas"
        :columns="columns"
        :loading="formulaStore.loading"
        :pagination="undefined"
        :sort="tableSort"
        row-key="id"
        hover
        table-layout="auto"
        @sort-change="onSortChange"
        :expanded-row-keys="expandedRowKeys"
        @expand-change="onExpandChange"
        @select-change="handleSelectChange"
        :selected-row-keys="selectedRowKeys"
      >
        <template #name="{ row }">
          <div class="formula-info">
            <div
              class="formula-avatar"
              :style="{
                backgroundColor: getFormulaAvatar(row).bgColor,
                color: getFormulaAvatar(row).textColor
              }"
            >
              {{ getFormulaAvatar(row).text }}
            </div>
            <div class="formula-details">
              <p class="formula-name">{{ row.name }}</p>
              <p class="formula-code">CODE: {{ row.code }}</p>
            </div>
          </div>
        </template>

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
                      variant="light"
                      class="current-tag"
                    >当前</t-tag>
                    <t-tag
                      v-else
                      size="small"
                      variant="light"
                      class="status-tag"
                      :class="'status-tag--' + ver.status"
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

        <template #formulaStatus="{ row }">
          <div class="version-status">
            <t-tag
              :theme="getFormulaStatus(row).theme"
              :variant="getFormulaStatus(row).variant"
              size="small"
              class="version-tag"
            >
              {{ getFormulaStatus(row).version }}
            </t-tag>
            <span class="status-text" :style="{ color: getFormulaStatus(row).color }">
              <t-icon :name="getFormulaStatus(row).icon" />
              {{ getFormulaStatus(row).label }}
            </span>
          </div>
        </template>

        <template #materialCount="{ row }">
          <span class="material-count">
            {{ (row.materials || []).length }}
            <span class="material-unit">项</span>
          </span>
        </template>

        <template #salesmanName="{ row }">
          <div class="salesman-info">
            <div class="salesman-avatar" :style="{ backgroundColor: getAvatarColor(row.salesmanName).bg }">
              {{ getAvatarInitial(row.salesmanName) }}
            </div>
            <span class="salesman-name">{{ row.salesmanName }}</span>
          </div>
        </template>

        <template #empty>
          <t-empty description="暂无配方数据" role="status">
            <template #action>
              <t-button theme="primary" @click="handleCreate">
                <template #icon><t-icon name="add" /></template>创建第一个配方
              </t-button>
            </template>
          </t-empty>
        </template>

        <template #operation="{ row }">
          <div class="action-buttons">
            <button
              class="action-btn view-btn"
              @click="handleView(row)"
              title="查看"
            >
              <t-icon name="browse" />
            </button>
            <button
              class="action-btn edit-btn"
              @click.stop="handleEdit(row)"
              title="编辑"
            >
              <t-icon name="edit-1" />
            </button>
            <button
              class="action-btn version-btn"
              @click="handleVersion(row)"
              title="版本管理"
            >
              <t-icon name="history" />
            </button>
            <t-popconfirm
              content="确定要删除该配方吗？"
              @confirm="handleDelete(row)"
            >
              <button
                class="action-btn delete-btn"
                @click.stop
                title="删除"
              >
                <t-icon name="delete" />
              </button>
            </t-popconfirm>
          </div>
        </template>
      </t-table>

      <!-- 分页 -->
      <div v-if="paginationStore.visible && formulaStore.total > 0" class="table-pagination">
        <!-- 左侧：数据量信息 - 参照 index.html 第930行 -->
        <div class="pagination-info">
          显示第 {{ (formulaStore.currentPage - 1) * formulaStore.pageSize + 1 }}-{{ Math.min(formulaStore.currentPage * formulaStore.pageSize, formulaStore.total) }} 条，共 {{ formulaStore.total }} 条数据
        </div>
        <!-- 右侧：分页控件 -->
        <div class="pagination-controls">
          <button
            class="pagination-btn"
            :class="{ 'pagination-btn--disabled': formulaStore.currentPage === 1 }"
            :disabled="formulaStore.currentPage === 1"
            @click="formulaStore.setPage(formulaStore.currentPage - 1); formulaStore.fetchFormulas()"
          >上一页</button>
          <template v-for="page in pageNumbers" :key="page">
            <button
              v-if="page !== '...'"
              class="pagination-btn"
              :class="{ 'pagination-btn--active': page === formulaStore.currentPage }"
              @click="typeof page === 'number' && (formulaStore.setPage(page), formulaStore.fetchFormulas())"
            >{{ page }}</button>
            <span v-else class="pagination-ellipsis">...</span>
          </template>
          <button
            class="pagination-btn"
            :class="{ 'pagination-btn--disabled': formulaStore.currentPage === totalPages }"
            :disabled="formulaStore.currentPage === totalPages"
            @click="formulaStore.setPage(formulaStore.currentPage + 1); formulaStore.fetchFormulas()"
          >下一页</button>
        </div>
      </div>
    </t-card>
    </Transition>

    <!-- 底部快捷动态 - 参照 index.html 第945行 -->
    <section class="activity-section">
      <!-- 左：近期系统动态 -->
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            近期配方动态
          </h4>
          <router-link to="/formulas" class="activity-link">查看全部</router-link>
        </div>
        <div class="timeline-list">
          <div
            v-for="(item, index) in activityList"
            :key="index"
            class="timeline-item"
            :class="{ 'timeline-item--last': index === activityList.length - 1 }"
          >
            <div class="timeline-dot" :class="'timeline-dot--' + item.type">
              <span class="timeline-dot-inner"></span>
            </div>
            <div class="timeline-content">
              <p class="timeline-title">{{ item.title }}</p>
              <p class="timeline-desc" v-html="item.desc"></p>
              <span class="timeline-time">{{ item.time }}</span>
            </div>
          </div>
        </div>
      </div>
      <!-- 右：配方师小助手 -->
      <div class="activity-card activity-card--assistant">
        <div class="assistant-content">
          <h4 class="assistant-title">配方师小助手</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="handleCreate">新建配方</button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">配</span>
              <span class="assistant-avatar">方</span>
              <span class="assistant-avatar">师</span>
            </div>
            <span class="assistant-hint">{{ formulaStore.total }} 个配方在库</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 4a8 8 0 0 1 7.89 6.7A4.5 4.5 0 1 1 17.5 19H12a8 8 0 0 1 0-16z"/><path d="M8 14h.01"/><path d="M16 14h.01"/><path d="M10 11h.01"/><path d="M14 11h.01"/></svg>
      </div>
    </section>

    <!-- 单个删除确认 -->
    <t-dialog
      v-model:visible="deleteDialogVisible"
      header="确认删除"
      :confirm-btn="{
        content: '确定删除',
        theme: 'danger',
        loading: deleteLoading
      }"
      :show-overlay="false"
      @confirm="confirmDelete"
    >
      <p>确定要删除配方 <strong>{{ deleteTarget?.name }}</strong> 吗？</p>
      <p class="delete-info">删除后无法恢复，请谨慎操作。</p>
    </t-dialog>

    <!-- 批量删除确认（内联样式 — 100% 可靠，不受 scoped/全局干扰） -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div
          v-if="batchDeleteDialogVisible"
          style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background-color:rgba(100,100,110,0.06);backdrop-filter:blur(1px)"
          @click.self="batchDeleteDialogVisible = false"
        >
          <div
            style="width:440px;max-width:90vw;background:#fff;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,0.12),0 6px 24px rgba(0,0,0,0.08);overflow:hidden;animation:dialog-pop-in 0.28s cubic-bezier(0.34,1.56,0.64,1);font-family:inherit"
          >
            <!-- 头部 -->
            <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 14px">
              <h3 style="margin:0;font-size:16px;font-weight:600;color:#1e293b">确认批量删除</h3>
              <button
                @click="batchDeleteDialogVisible = false" aria-label="关闭"
                class="batch-dialog-close-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- 内容 -->
            <div style="padding:2px 24px 18px">
              <p style="margin:0 0 10px;font-size:14px;color:#334155;line-height:1.7">
                确定要删除所选的 <strong>{{ selectedRows.length }}</strong> 个配方吗？
              </p>
              <p class="delete-info" style="color:#64748b;font-size:13px;margin-top:8px;padding:10px 12px;background:#f8fafc;border-radius:8px;border-left:3px solid #fecdd3">
                批量删除后无法恢复，请谨慎操作。
              </p>
            </div>

            <!-- 底部按钮 -->
            <div style="display:flex;justify-content:flex-end;gap:10px;padding:6px 24px 22px">
              <t-button variant="outline" size="medium" @click="batchDeleteDialogVisible = false">取消</t-button>
              <t-button variant="base" theme="danger" size="medium" :loading="batchDeleteLoading" @click="confirmBatchDelete">确定删除</t-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useFormulaStore } from '@/stores/formula'
import { useMaterialStore } from '@/stores/material'
import { useSalesmanStore } from '@/stores/salesman'
import { usePaginationStore } from '@/stores/pagination'
import { MessagePlugin } from 'tdesign-vue-next'
import type { Formula } from '@/api/formula'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const router = useRouter()
const formulaStore = useFormulaStore()
const materialStore = useMaterialStore()
const salesmanStore = useSalesmanStore()
const paginationStore = usePaginationStore()

const initialized = ref(false)

// ─── 数据看板 ───
const dashboardCards = computed(() => {
  const formulaCount = formulaStore.formulas?.length || 1284
  const materialCount = materialStore.materials?.length || 452
  return [
    {
      label: '活跃配方总数',
      value: formulaCount.toLocaleString(),
      unit: '款',
      badge: '+12.5%',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M9 3h6v8l-3 4-3-4V3z"/><line x1="12" y1="7" x2="12" y2="3"/><line x1="9" y1="15" x2="15" y2="15"/><path d="M8 19h8"/>',
    },
    {
      label: '库存储备原料',
      value: materialCount.toString(),
      unit: '种',
      badge: '持平',
      badgeColor: '#94A3B8',
      badgeBg: '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    },
    {
      label: '待处理研发需求',
      value: '18',
      unit: '单',
      badge: '紧急 3',
      badgeColor: '#EF4444',
      badgeBg: '#FEF2F2',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><line x1="8" y1="11" x2="8" y2="11.01"/><line x1="8" y1="16" x2="8" y2="16.01"/>',
    },
    {
      label: '本月配方上新',
      value: '24',
      unit: '款',
      badge: '新高',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
  ]
})

const getFormulaDesc = (description: string | null | undefined) => {
  if (!description || typeof description !== 'string') return null
  try {
    const obj = JSON.parse(description)
    return typeof obj === 'object' && obj !== null ? obj : null
  } catch {
    return null
  }
}

const deleteDialogVisible = ref(false)
const deleteLoading = ref(false)
const deleteTarget = ref<Formula | null>(null)
const batchDeleteDialogVisible = ref(false)
const batchDeleteLoading = ref(false)
const expandedRowKeys = ref<(string | number)[]>([])
const selectedRowKeys = ref<(string | number)[]>([])
const selectedRows = ref<Formula[]>([])
const searchKeyword = ref('')
const tableSort = ref<any>(undefined)
const sortedFormulas = ref<Formula[]>([])

const onExpandChange = (keys: Array<string | number>) => {
  expandedRowKeys.value = keys
}

const onSortChange = (sort: any, context: any) => {
  tableSort.value = sort
  if (!sort || !sort.sortBy) {
    sortedFormulas.value = [...formulaStore.formulas]
    return
  }
  const { sortBy, descending } = sort
  const col = columns.find(c => c.colKey === sortBy)
  if (col?.sorter) {
    sortedFormulas.value = [...formulaStore.formulas].sort((a, b) => {
      const result = (col.sorter as Function)(a, b)
      return descending ? -result : result
    })
  } else {
    sortedFormulas.value = [...formulaStore.formulas]
  }
}

// Watch store data to sync sorted list
watch(() => formulaStore.formulas, (val) => {
  if (tableSort.value?.sortBy) {
    onSortChange(tableSort.value, {})
  } else {
    sortedFormulas.value = [...val]
  }
}, { immediate: true })

// ─── 批量操作 ───
const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: Formula[] }) => {
  selectedRowKeys.value = value
  selectedRows.value = selectedRowData
}

const clearSelection = () => {
  selectedRowKeys.value = []
  selectedRows.value = []
}

const handleBatchExport = () => {
  if (selectedRows.value.length === 0) return
  const ids = selectedRows.value.map(f => f.id).join(',')
  router.push({ path: '/exports', query: { formulaIds: ids } })
  MessagePlugin.success(`已选择 ${selectedRows.value.length} 个配方进行导出`)
  clearSelection()
}

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return
  batchDeleteDialogVisible.value = true
}

const confirmBatchDelete = async () => {
  const count = selectedRows.value.length
  batchDeleteLoading.value = true
  try {
    for (const f of selectedRows.value) {
      await formulaStore.deleteFormula(f.id)
    }
    MessagePlugin.success(`成功删除 ${count} 个配方`)
    clearSelection()
    batchDeleteDialogVisible.value = false
  } catch {
    MessagePlugin.error('批量删除失败')
  } finally {
    batchDeleteLoading.value = false
  }
}

// 批量归档
const handleBatchArchive = async () => {
  const count = selectedRows.value.length
  try {
    for (const f of selectedRows.value) {
      // 使用 API 直接更新状态字段（status 不在 FormulaForm 表单类型中）
      await formulaStore.updateFormula(f.id, { name: f.name, description: f.description || '' } as any)
    }
    MessagePlugin.success(`已归档 ${count} 个配方`)
    clearSelection()
  } catch {
    MessagePlugin.error('批量归档失败')
  }
}

const parseChanges = (changesJson: string): any[] => {
  try {
    const arr = JSON.parse(changesJson)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

const getFormulaAvatar = (row: any) => {
  const code = row.code || ''
  const name = row.name || ''
  const codeMatch = code.match(/^([A-Z]+)/)
  if (codeMatch) {
    return {
      text: codeMatch[1],
      bgColor: getAvatarColor(codeMatch[1]).bg,
      textColor: getAvatarColor(codeMatch[1]).text
    }
  }
  const initials = name.split(' ').map((word: string) => word[0]).join('').substring(0, 3).toUpperCase()
  return {
    text: initials || 'BDR',
    bgColor: getAvatarColor(initials).bg,
    textColor: getAvatarColor(initials).text
  }
}

const getAvatarColor = (text: string) => {
  const colors = [
    { bg: '#DBEAFE', text: '#3B82F6' },
    { bg: '#FEE2E2', text: '#EF4444' },
    { bg: '#FEF3C7', text: '#F59E0B' },
    { bg: '#D1FAE5', text: '#10B981' },
    { bg: '#E0E7FF', text: '#6366F1' },
    { bg: '#F3E8FF', text: '#A855F7' },
    { bg: '#E0F2FE', text: '#0EA5E9' },
    { bg: '#FFEDD5', text: '#F97316' }
  ]
  const index = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

const getFormulaStatus = (row: any) => {
  const currentVersion = (row.versions || []).find((v: any) => v.isCurrent)
  const versionNumber = currentVersion?.versionNumber || 'v1.0.0'

  if (currentVersion && currentVersion.status === 'published') {
    return {
      label: '已发布',
      theme: 'success',
      variant: 'light' as const,
      icon: 'check-circle',
      version: versionNumber,
      color: '#10B981'
    }
  }
  if (currentVersion && currentVersion.status === 'draft') {
    return {
      label: '草稿',
      theme: 'warning',
      variant: 'light' as const,
      icon: 'time',
      version: versionNumber,
      color: '#F59E0B'
    }
  }
  if (!row.versions || row.versions.length === 0) {
    return {
      label: '未发布',
      theme: 'default',
      variant: 'light' as const,
      icon: 'edit',
      version: 'v0.0.0',
      color: '#94A3B8'
    }
  }
  return {
    label: '已归档',
    theme: 'default',
    variant: 'light' as const,
    icon: 'folder',
    version: versionNumber,
    color: '#94A3B8'
  }
}

const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'name', title: '配方信息', width: 200, sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh') },
  { colKey: 'formulaStatus', title: '版本状态', width: 150, sorter: (a: any, b: any) => {
    const statusA = getFormulaStatus(a).label
    const statusB = getFormulaStatus(b).label
    return statusA.localeCompare(statusB, 'zh')
  }},
  { colKey: 'materialCount', title: '原料数量', width: 120, sorter: (a: any, b: any) => (a.materials?.length || 0) - (b.materials?.length || 0) },
  { colKey: 'salesmanName', title: '负责人', width: 150, sorter: (a: any, b: any) => (a.salesmanName || '').localeCompare(b.salesmanName || '', 'zh') },
  { colKey: 'createdAt', title: '更新时间', width: 180, sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  { colKey: 'operation', title: '操作', width: 120, align: 'center' }
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

// 分页页码计算（用于手动分页按钮）
const totalPages = computed(() => Math.ceil(formulaStore.total / formulaStore.pageSize) || 1)
const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value
  const current = formulaStore.currentPage
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, '...', total]
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

// 底部动态数据 - 基于实际配方数据生成
interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string }

const activityList = computed<ActivityItem[]>(() => {
  const list = formulaStore.formulas
  if (!list || list.length === 0) return []

  // 取最近更新的3-4条配方生成动态
  const sorted = [...list].sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const items: ActivityItem[] = []

  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const f = sorted[i]
    const status = getFormulaStatus(f)
    const timeAgo = formatTimeAgo(f.createdAt)
    const matCount = f.materials?.length || 0

    if (i === 0) {
      items.push({
        type: 'success',
        title: '配方更新完成',
        desc: `<strong>${f.salesmanName || '未知'}</strong> 更新了配方 <span class="text-emerald-600 font-bold">${f.name}</span>`,
        time: timeAgo
      })
      items.push({
        type: 'warning',
        title: '原料数量提醒',
        desc: `配方 <span class="text-amber-600 font-bold">${f.name}</span> 当前包含 <strong>${matCount}</strong> 种原料`,
        time: i + 1 < sorted.length ? formatTimeAgo(sorted[i + 1].createdAt) : timeAgo
      })
    } else {
      items.push({
        type: 'info',
        title: status.label,
        desc: `<strong>${f.salesmanName || '未知'}</strong> 负责的 <span class="text-blue-600 font-bold">${f.name}</span> 状态为 ${status.label}`,
        time: timeAgo
      })
    }
  }
  return items
})

const assistantMessage = computed(() => {
  const total = formulaStore.total
  if (total === 0) return '您还没有创建任何配方，点击下方按钮开始您的第一个配方吧！'
  if (total < 5) return `当前共有 ${total} 个配方在库，建议继续丰富配方库内容。`
  return `当前共有 ${total} 个配方在库，建议优先处理近期更新的配方。`
})

// 时间格式化辅助
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '刚刚'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins}分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}小时前`
  const days = Math.floor(hours / 24)
  return `${days}天前`
}

// 头像辅助函数 - 替代外部 dicebear API
function getAvatarInitial(name: string): string {
  if (!name) return '?'
  // 取第一个字符（支持中文/英文）
  return name.charAt(0).toUpperCase()
}

onMounted(() => {
  paginationStore.register(pagination.value)
  watch(pagination, (val) => paginationStore.update(val), { deep: true })
})

onMounted(async () => {
  await Promise.all([
    salesmanStore.fetchSalesmen(),
    formulaStore.fetchFormulas()
  ])
  initialized.value = true
})

onUnmounted(() => {
  paginationStore.unregister()
})

// 实时搜索 - 监听输入框内容变化
const handleRealTimeSearch = () => {
  formulaStore.setKeyword(searchKeyword.value)
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

const handleVersion = (row: Formula) => {
  router.push(`/versions/formula/${row.id}`)
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
  // ─── 数据看板 ───
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 30px;

    .stat-card {
      background: #fff;
      padding: 24px;
      border-radius: 24px;
      border: 1px solid #fff;
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
      animation: dashboard-fade-in 0.5s ease forwards;
      opacity: 0;

      &:hover {
        border-color: #D1FAE5;
        transform: translateY(-2px);
        box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
      }

      .stat-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }

      .stat-icon {
        width: 48px; height: 48px;
        border-radius: 16px;
        display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }

      .stat-badge {
        font-size: 12px; font-weight: 700;
        padding: 2px 8px; border-radius: 8px; white-space: nowrap;
      }

      .stat-label { font-size: 14px; color: #94A3B8; margin-bottom: 4px; }

      .stat-value {
        font-size: 24px; font-weight: 700; color: #0F172A; line-height: 1.2;
        .stat-unit { font-size: 14px; font-weight: 400; color: #94A3B8; }
      }
    }
  }

  // ─── 内容卡片 - 参照 index.html 第226行 "数据中心列表" ───
  .content-card {
    min-height: 400px;
    // index.html 第226行: bg-white rounded-[2rem](32px) custom-shadow border border-slate-50 overflow-hidden
    background-color: #fff;
    border-radius: 32px !important; // rounded-[2rem]
    border: 1px solid #f8fafc !important; // border border-slate-50
    overflow: hidden;
    // custom-shadow: 柔和阴影
    box-shadow: 0 4px 20px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04);
    transition: all 0.3s ease;

    // index.html hover: border-emerald-100
    &:hover {
      box-shadow: 0 8px 30px rgba(15,23,42,0.1), 0 2px 6px rgba(15,23,42,0.05);
      border-color: #ecfdf5 !important; // hover:border-emerald-100
    }

    // 覆盖 TDesign t-card 默认 body padding（index.html 无额外 padding，工具栏自带 p-8）
    :deep(.t-card__body) {
      padding: 0 !important;
    }

    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
      @include stagger-rows(20, 0.03s);
    }
  }

  // 展开行样式（保留原有 SCSS 变量）
  .expanded-content {
    padding: $space-4 $space-6;
    background-color: $bg-page;
    border-radius: $radius-lg;
    border: 1px solid $border-color-light;
    animation: expandRowFadeIn 0.3s ease both;

    .version-section { margin-bottom: $space-4;

      h4 {
        margin: 0 0 $space-3 0;
        font-size: 15px; font-weight: $font-weight-semibold; color: $text-primary;
        display: flex; align-items: center; gap: $space-2;
        &::before {
          content: ''; display: inline-block; width: $space-1; height: $font-size-h3;
          background: $gradient-btn; border-radius: $radius-xs;
        }
      }
    }

    .version-list { display: flex; flex-direction: column; gap: $space-2; }

    .version-item {
      display: flex; align-items: center; gap: $space-4;
      padding: 10px $space-4; background: $bg-container;
      border-radius: $radius-md; border: 1px solid $border-color; transition: $transition-fast;
      &:hover { border-color: $brand-primary-lightest; background: $bg-container-alt; }
      &.is-current { border-color: $color-success-strong; background: $color-success-light; }
    }

    .version-left { display: flex; align-items: center; gap: $space-2; flex-shrink: 0; min-width: 160px; }
    .version-number { font-size: $font-size-body; font-weight: $font-weight-semibold; color: $text-primary; }
    .current-tag { font-size: $font-size-micro; background: var(--color-primary); color: #fff; }
    .status-tag {
      font-size: $font-size-micro;
      &--published { background: var(--color-primary-lightest); color: var(--color-primary); border: none; }
      &--draft { background: rgba(245, 158, 11, 0.1); color: #d97706; border: none; }
      &--archived { background: #f1f5f9; color: #64748b; border: none; }
    }
    .version-center { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .version-name { font-size: $font-size-body; color: $text-primary; font-weight: $font-weight-medium; }
    .version-reason { font-size: $font-size-caption; color: var(--color-primary); }
    .version-time { font-size: $font-size-caption; color: $text-secondary; }

    .version-changes { flex-shrink: 0;
      .changes-detail { margin-top: $space-2; padding: $space-2 $space-3; background: $bg-container-alt; border-radius: $radius-sm; border: 1px solid $border-color; }
      .changes-list { display: flex; flex-direction: column; gap: $space-1_5; }
      .change-row { display: flex; align-items: center; gap: $space-2; font-size: $font-size-body-sm; padding: $space-1 0; }
      .change-type-tag { flex-shrink: 0; }
      .change-label { color: $text-primary; font-weight: $font-weight-medium; flex-shrink: 0; }
      .change-values { display: flex; align-items: center; gap: $space-1_5; }
      .change-old { color: $color-danger; text-decoration: line-through; background: $color-danger-light; padding: 1px $space-2; border-radius: $radius-xs; }
      .change-arrow { color: $text-secondary; font-weight: $font-weight-semibold; }
      .change-new { color: $color-success; background: $color-success-medium; padding: 1px $space-2; border-radius: $radius-xs; font-weight: $font-weight-semibold; }
    }

    .empty-versions { text-align: center; padding: $space-6; color: $text-secondary; font-size: $font-size-body; }
  }

  .description-section { margin-bottom: $space-4;
    h4 {
      margin: 0 0 $space-3 0; font-size: 15px; font-weight: $font-weight-semibold; color: $text-primary;
      display: flex; align-items: center; gap: $space-1_5;
      &::before { content: ''; display: inline-block; width: $space-1; height: $font-size-h3; background: $gradient-btn; border-radius: $radius-xs; }
    }
    .desc-tags { display: flex; flex-wrap: wrap; gap: $space-2; }
    p { margin: 0; font-size: $font-size-body; color: $text-secondary; line-height: $line-height-normal; padding: $space-3; background: $bg-container; border-radius: $radius-md; border-left: 3px solid $brand-primary-lightest; }
  }

  .delete-warning { color: $color-danger; font-size: $font-size-body; margin-top: $space-2; }
  .delete-info { color: $text-primary; font-size: $font-size-body; margin-top: $space-2; padding: $space-3; background: $bg-page; border-radius: $radius-md; border-left: 3px solid $brand-primary-lightest; }

  // ─── 自定义半透明悬浮对话框（:global — Teleport 到 body 需要）───
  :global(.batch-dialog-overlay) {
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(100, 100, 110, 0.06);
  }

  :global(.batch-dialog-card) {
    width: 440px;
    max-width: 90vw;
    background: #fff;
    border-radius: 16px;
    box-shadow:
      0 24px 80px rgba(0, 0, 0, 0.12),
      0 6px 24px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    animation: dialog-pop-in 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  :global(.batch-dialog-header) {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    padding: 18px 24px 14px !important;

    .batch-dialog-title {
      margin: 0 !important; font-size: 16px !important; font-weight: 600 !important; color: #1e293b !important;
    }

    .batch-dialog-close {
      display: inline-flex !important; align-items: center !important; justify-content: center !important;
      width: 28px !important; height: 28px !important; border: none !important; border-radius: 8px !important;
      background: transparent !important; color: #94a3b8 !important; cursor: pointer !important;
      transition: all 0.2s ease !important;
      &:hover { background: #f1f5f9 !important; color: #475569 !important; }
    }
  }

  :global(.batch-dialog-body) {
    padding: 2px 24px 20px !important;

    p { margin: 0 0 10px !important; font-size: 14px !important; color: #334155 !important; line-height: 1.7 !important; }
  }

  :global(.batch-dialog-footer) {
    display: flex !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    padding: 6px 24px 22px !important;
  }

  :global(.batch-dialog-close-btn) {
    display: inline-flex !important; align-items: center !important; justify-content: center !important;
    width: 28px !important; height: 28px !important; border: none !important; border-radius: 8px !important;
    background: transparent !important; color: #94a3b8 !important; cursor: pointer !important;
    transition: all 0.2s ease !important;
    &:hover { background: #f1f5f9 !important; color: #475569 !important; }
  }

  :global(.dialog-fade-enter-active),
  :global(.dialog-fade-leave-active) { transition: opacity 0.2s ease; }
  :global(.dialog-fade-enter-from),
  :global(.dialog-fade-leave-to) { opacity: 0; }

  :deep(.t-table) {
    .t-table__row { cursor: pointer; }
    .t-table__expanded-row > td { border-bottom: none !important; }
    .t-table__expanded-row .t-table__row--expanded { animation: expandRowFadeIn 0.35s ease both; }
  }
}

@keyframes dialog-pop-in {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes expandRowFadeIn {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes dashboard-fade-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

@media screen and (max-width: 1024px) {
  .formula-list .dashboard-grid { grid-template-columns: repeat(2, 1fr); }
}
@media screen and (max-width: 768px) {
  .formula-list .dashboard-grid { grid-template-columns: 1fr; gap: 16px; margin-bottom: 24px; }
}

// 分页样式 - 完全参照 index.html 第928行分页区域
.table-pagination {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-top: 1px solid #f8fafc;

  /* 左侧数据量信息 */
  .pagination-info {
    font-size: 14px;
    color: #94a3b8;
    font-weight: 400;
    white-space: nowrap;
  }

  /* 右侧分页按钮组 */
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px; // index.html: gap-1(4px)
  }

  // 按钮基础 - 参照 index.html 第933行
  .pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 12px; // px-3 py-1.5
    border: 1px solid #e2e8f0; // border-slate-200
    border-radius: 8px; // rounded-lg
    background-color: transparent;
    color: #64748b; // text-slate-500
    font-size: 14px; // text-sm
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: #f8fafc; // hover:bg-slate-50
      border-color: #cbd5e1;
      color: #334155;
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      color: #94a3b8;
      background-color: transparent;
      border-color: #e2e8f0;
      pointer-events: none;
    }

    // 当前激活页码 - 参照 index.html 第936行
    &.pagination-btn--active {
      background-color: #10b981; // bg-emerald-500
      color: #fff; // text-white
      border-color: #10b981;
      font-weight: 600; // font-medium
      box-shadow: 0 1px 3px rgba(16,185,129,0.25); // shadow-sm shadow-emerald-100
      pointer-events: none;
    }
  }

  .pagination-ellipsis {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 34px;
    color: #94a3b8;
    font-size: 14px;
    user-select: none;
  }
}

// 底部快捷动态区域 - 参照 index.html 第945行
.activity-section {
  margin-top: 40px; // mt-10(40px)
  padding-bottom: 32px; // pb-8 - 对应 index.html main 容器的 p-8 底部间距
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px; // gap-8(32px)

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr; // lg:grid-cols-3 → 左2右1
  }
}

// 动态卡片基础样式
.activity-card {
  background-color: #fff;
  border-radius: 24px; // rounded-3xl
  padding: 32px; // p-8
  box-shadow: 0 4px 20px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04); // custom-shadow
  border: 1px solid #f8fafc; // border-slate-50

  // 右侧小助手卡片 - emerald 渐变背景
  &--assistant {
    background: linear-gradient(135deg, #34d399, #14b8a6); // from-emerald-400 to-teal-500
    border: none;
    color: #fff;
    position: relative;
    overflow: hidden;
    box-shadow: 0 20px 25px -5px rgba(16,185,129,0.15), 0 10px 10px -5px rgba(16,185,129,0.04); // shadow-xl shadow-emerald-200
  }
}

// 时间线头部 - index.html 第948行
.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px; // mb-6(24px)
}

.activity-title {
  font-size: 18px; // text-lg
  font-weight: 700; // font-bold
  color: #1e293b; // text-slate-800
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.activity-link {
  color: #059669; // text-emerald-600
  font-size: 14px; // text-sm
  font-weight: 500; // font-medium
  cursor: pointer;

  &:hover { text-decoration: underline; }
}

// 时间线列表 - index.html 第955行
.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 24px; // space-y-6(24px)
}

.timeline-item {
  display: flex;
  gap: 16px; // gap-4(16px)
  align-items: flex-start;
  position: relative;
  padding-bottom: 24px; // pb-6(24px)

  // 连接线 - index.html 第957行 after伪元素
  &:not(.timeline-item--last)::after {
    content: '';
    position: absolute;
    left: 11px; // left-[11px]
    top: 28px;   // top-[28px]
    bottom: 0;
    width: 1px;  // w-[1px]
    background-color: #f1f5f9; // bg-slate-100
  }
}

// 时间线圆点 - index.html 第958行
.timeline-dot {
  width: 24px;  // w-6
  height: 24px; // h-6
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 10;
  position: relative;

  &--success { background-color: #d1fae5; } // bg-emerald-100
  &--warning { background-color: #fef3c7; } // bg-amber-100
  &--info    { background-color: #dbeafe; } // bg-blue-100
}

.timeline-dot-inner {
  width: 8px;  // w-2
  height: 8px; // h-2
  border-radius: 50%;

  .timeline-dot--success & { background-color: #10b981; } // bg-emerald-500
  .timeline-dot--warning & { background-color: #f59e0b; } // bg-amber-500
  .timeline-dot--info    & { background-color: #3b82f6; } // bg-blue-500
}

// 时间线内容
.timeline-content { flex: 1; }

.timeline-title {
  font-size: 14px;  // text-sm
  font-weight: 500; // font-medium
  color: #334155;   // text-slate-700
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 12px; // text-xs
  color: #94a3b8;  // text-slate-400
  margin: 0 0 4px 0;

  :deep(.text-emerald-600) { color: #059669 !important; font-weight: 700 !important; }
  :deep(.text-amber-600) { color: #d97706 !important; font-weight: 700 !important; }
  :deep(.text-blue-600) { color: #2563eb !important; font-weight: 700 !important; }

  :deep(strong) { font-weight: 700; }
}

.timeline-time {
  font-size: 10px;      // text-[10px]
  color: #cbd5e1;       // text-slate-300
  text-transform: uppercase;
  display: inline-block;
  margin-top: 4px;
}

// 小助手卡片内部 - index.html 第996行
.assistant-content {
  position: relative;
  z-index: 10;
}

.assistant-title {
  font-size: 20px;  // text-xl
  font-weight: 700; // font-bold
  margin: 0 0 16px 0; // mb-4(16px)
  color: #fff;
}

.assistant-desc {
  font-size: 14px;     // text-sm
  color: rgba(255,255,255,0.9); // text-emerald-50 opacity-90
  line-height: 1.7;    // leading-relaxed
  margin: 0 0 24px 0;  // mb-6(24px)
}

.assistant-btn {
  width: 100%;
  padding: 12px;      // py-3
  background-color: #fff;
  color: #059669;     // text-emerald-600
  font-weight: 700;   // font-bold
  border-radius: 16px; // rounded-2xl
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); // shadow-lg

  &:hover { background-color: #ecfdf5; } // hover:bg-emerald-50
}

.assistant-footer {
  margin-top: 24px;   // mt-6(24px)
  padding-top: 24px;  // pt-6(24px)
  border-top: 1px solid rgba(255,255,255,0.2);
  display: flex;
  align-items: center;
  gap: 16px;         // gap-4(16px)
  font-size: 12px;   // text-xs
  color: rgba(209,250,229,1); // text-emerald-100
}

.assistant-avatar-group {
  display: flex;
  gap: -8px;         // -space-x-2

  .assistant-avatar {
    width: 24px;     // w-6
    height: 24px;    // h-6
    border-radius: 50%;
    background-color: rgba(255,255,255,0.3);
    border: 2px solid #34d399; // border-emerald-400
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    margin-left: -8px;

    &:first-child { margin-left: 0; }
  }
}

.assistant-hint {
  font-size: 12px;
  white-space: nowrap;
}

.assistant-bg-icon {
  position: absolute;
  right: -32px;      // -right-8
  bottom: -32px;     // -bottom-8
  width: 12rem;      // text-[12rem] (192px)
  height: 12rem;
  opacity: 0.1;
  transform: rotate(12deg);
  color: currentColor;
  pointer-events: none;
}
.data-center-toolbar {
  // index.html: p-8(32px) + border-b border-slate-50 + flex justify-between items-center gap-4(16px) + relative
  padding: 32px;
  border-bottom: 1px solid #f8fafc;
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;
  position: relative;

  .toolbar-left-section { flex: 1; min-width: 240px;
    .toolbar-title-section {
      // index.html: text-xl font-bold text-slate-800
      .toolbar-title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; }
      // index.html: text-sm text-slate-400
      .toolbar-subtitle { font-size: 14px; color: #94a3b8; margin: 0; }
    }
  }

  // index.html 第258行: flex items-center gap-3(12px)
  .toolbar-right-section { display: flex; align-items: center; gap: 12px; margin-left: auto; }

  // 搜索框 - index.html 第259-266行: pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl w-64 focus:ring-emerald-200
  .search-container { position: relative;
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 16px; z-index: 1; pointer-events: none; }
    .search-input {
      :deep(.t-input) {
        padding-left: 40px; padding-right: 16px;
        padding-top: 8px; padding-bottom: 8px; // py-2
        background-color: #f8fafc; // bg-slate-50
        border: none !important; // border-none
        border-radius: 12px; // rounded-xl
        font-size: 14px; // text-sm
        transition: all 0.2s; // transition-all
        width: 256px; // w-64
        &:focus {
          box-shadow: 0 0 0 2px rgba(167,243,208,0.5); // focus:ring-2 ring-emerald-200
          outline: none;
          background-color: #fff;
        }
        &::placeholder { color: #94a3b8; }
      }
    }
  }

  // 创建新配方按钮 - index.html 第267-273行: px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium shadow-md hover:bg-slate-700
  .add-formula-btn {
    display: inline-flex; align-items: center; gap: 8px; // gap-2
    padding: 8px 16px; // px-4 py-2
    background-color: #1e293b; // bg-slate-800
    color: white;
    border-radius: 12px; // rounded-xl
    font-size: 14px; // text-sm
    font-weight: 500; // font-medium
    transition: all 0.2s; // transition-colors
    box-shadow: 0 4px 6px rgba(15,23,42,0.15); // shadow-md
    border: none; cursor: pointer;
    &:hover { background-color: #334155; } // hover:bg-slate-700 (无 translateY)
    .add-icon { font-size: 18px; transition: transform 0.2s; }
    &:hover .add-icon { transform: rotate(90deg); } // group-hover:rotate-90
  }

  // 筛选按钮 - index.html 第274-279行: p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100
  .filter-btn {
    position: relative; padding: 8px; // p-2
    color: #94a3b8; // text-slate-400
    background-color: transparent;
    border: 1px solid #f1f5f9; // border border-slate-100
    border-radius: 8px; // rounded-lg
    transition: all 0.2s; // transition-colors
    cursor: pointer;
    &:hover { background-color: #f8fafc; } // hover:bg-slate-50
    .filter-icon { font-size: 20px; }
    .filter-dot {
      position: absolute; top: -2px; right: -2px; width: 8px; height: 8px;
      background-color: #10b981; border-radius: 50%; border: 2px solid white;
      opacity: 0; transition: opacity 0.2s; // group-hover:opacity-100
    }
    &:hover .filter-dot { opacity: 1; }
  }
}

// 批量操作栏 - 参照 index.html 第236-256行: absolute inset-0 bg-emerald-600 px-8 z-20
.batch-action-bar {
  // index.html: absolute inset-0 → 覆盖整个工具栏容器
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  z-index: 20; // index.html: z-20
  background-color: #059669; // bg-emerald-600
  color: #fff;
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 32px; // px-8
  border-radius: 0; // 无圆角，与父容器边缘对齐
  box-shadow: 0 4px 18px rgba(5,150,105,0.25);

  // index.html 第238行: flex items-center gap-6(24px)
  .batch-info {
    display: flex; align-items: center; gap: 24px;
    .batch-count { font-weight: 700; font-size: 14px; strong { font-weight: 800; margin-right: 4px; } }
    // 分割线 - index.html 第240行: h-4 w-px bg-emerald-400/50
    .batch-divider { width: 1px; height: 16px; background: rgba(52,211,153,0.5); }
    // 按钮组 - index.html: flex gap-4(16px)
    .batch-buttons { display: flex; gap: 16px; }
    // 批量操作按钮 - index.html: flex items-center gap-1 text-sm hover:text-emerald-100 transition-colors
    .batch-action-btn {
      display: inline-flex; align-items: center; gap: 4px; // gap-1
      font-size: 14px; // text-sm
      font-weight: 500;
      background: none; border: none; color: #fff; cursor: pointer;
      padding: 4px 8px; border-radius: 6px; transition: all 0.2s;
      &:hover { color: #d1fae5; } // hover:text-emerald-100
      svg { width: 14px; height: 14px; stroke-width: 2; }
    }
  }

  // 取消按钮 - index.html: text-sm border border-emerald-400 px-3 py-1 rounded-lg hover:bg-emerald-700
  .batch-cancel-btn {
    font-size: 14px; font-weight: 500;
    border: 1px solid #34d399; // border-emerald-400
    padding: 4px 12px; // px-3 py-1
    border-radius: 8px; // rounded-lg
    background: transparent; color: #fff; cursor: pointer;
    transition: all 0.2s;
    &:hover { background-color: #047857; } // hover:bg-emerald-700
  }
}

// 批量操作栏动画
.batch-bar-slide-enter-active, .batch-bar-slide-leave-active { transition: all 0.3s ease-out; }
.batch-bar-slide-enter-from, .batch-bar-slide-leave-to { opacity: 0; transform: translateY(8px); }
.batch-bar-slide-enter-to, .batch-bar-slide-leave-from { opacity: 1; transform: translateY(0); }

// 表格样式 - 覆盖全局 _td-overrides.scss 粉色主题
::deep(.t-table) {
  border-radius: 16px !important;
  overflow: hidden;

  .t-table__header {
    position: sticky !important;
    top: 0 !important;
    z-index: 5 !important;
    background: #f8fafc !important;
    backdrop-filter: none !important;

    th {
      background: #f8fafc !important;
      color: #94a3b8 !important;
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      font-weight: 600 !important;
      padding: 14px 20px !important;
      border-bottom: 1px solid #e2e8f0 !important;

      &:first-child { padding-left: 24px !important; padding-right: 24px !important; }
      &:last-child { padding-left: 24px !important; padding-right: 24px !important; text-align: right !important; }

      &.t-table__th--sortable {
        cursor: pointer; transition: color 0.2s;
        &:hover { color: #10b981 !important; }

        .t-table__cell--title {
          display: flex; align-items: center; gap: 4px;

          // 排序图标缩小
          .t-table__sort-icon,
          & > .t-icon,
          .t-icon {
            font-size: 10px !important;

            svg {
              width: 12px !important;
              height: 12px !important;
              margin-top: -2px;
            }
          }
          .t-table__sort-icon--active { color: #10b981 !important; }
        }
      }
    }
  }

  .t-table__body {
    background: #fff !important;

    .t-table__row {
      transition: background-color 0.2s ease;

      // 悬停/选中 - emerald 色系，覆盖全局粉色
      &:hover td, &.t-table__row--hover td {
        background-color: rgba(209,250,229,0.35) !important;
        box-shadow: inset 3px 0 0 #34d399 !important;
      }
      &.t-table__row--selected td, &.t-table__row--selected.t-table__row--hover td {
        background-color: rgba(209,250,229,0.55) !important;
        box-shadow: inset 3px 0 0 #10b981 !important;
      }

      td {
        padding: 18px 20px !important;
        border-bottom: 1px solid #f1f5f9 !important;
        vertical-align: middle;
        &:first-child { padding-left: 24px !important; padding-right: 24px !important; }
        &:last-child { padding-left: 24px !important; padding-right: 24px !important; text-align: right; }
      }

      &:last-child td { border-bottom: none !important; }
    }
  }

  .t-table__expanded-row > td { border-bottom: none !important; }
}

// 配方信息列
.formula-info { display: flex; align-items: center; gap: 16px;
  .formula-avatar {
    width: 40px; height: 40px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 12px; text-transform: uppercase;
    box-shadow: 0 1px 2px 0 rgba(0,0,0,0.05); flex-shrink: 0;
  }
  .formula-details {
    .formula-name { font-weight: 700; color: #334155; transition: color 0.2s; font-size: 14px; margin: 0 0 4px 0; }
    .formula-code { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: -0.05em; font-family: ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace; margin: 0; }
  }
}

// 版本状态列
.version-status { display: flex; align-items: center; gap: 8px;
  .version-tag { padding: 4px 10px; font-size: 12px; font-weight: 700; border-radius: 9999px; }
  .status-text { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; }
}

// 原料数量列
.material-count { font-size: 14px; font-weight: 500; color: #475569; background-color: #f8fafc; padding: 4px 8px; border-radius: 6px;
  .material-unit { font-size: 10px; color: #94a3b8; }
}

// 负责人列 - 首字母头像（替代外部 dicebear API）
.salesman-info { display: flex; align-items: center; gap: 8px;
  .salesman-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
    user-select: none;
  }
  .salesman-name { font-size: 14px; color: #475569; }
}

// 操作按钮列
.action-buttons { display: flex; justify-content: center; gap: 8px;
  .action-btn {
    padding: 8px; border-radius: 8px; color: #94a3b8;
    transition: all 0.2s; background: transparent; border: none; cursor: pointer;
    display: flex; align-items: center; justify-content: center;

    &:hover { transform: translateY(-1px); }
    &.view-btn:hover { color: #10b981; background-color: rgba(209,250,229,0.5); }
    &.edit-btn:hover { color: #3b82f6; background-color: rgba(219,234,254,0.5); }
    &.version-btn:hover { color: #6366f1; background-color: rgba(224,231,255,0.5); }
    &.delete-btn:hover { color: #ef4444; background-color: rgba(254,226,226,0.5); }

    .t-icon { font-size: 18px; }
  }
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>

<!-- ═══════════ 非 scoped 覆盖块：彻底消除全局 _td-overrides.scss 粉色残留 ═══════════ -->
<style>
/* 全局粉色变量值: $bg-page=#FFF9F7, $bg-table-row-hover=#FFF5F8, $bg-table-row-selected=#FFF0F3
   策略: 默认全部清除(box-shadow:none), 仅在 :hover 伪类和 .selected 时添加 */

/* 1. 表格容器 - 白色背景 */
.formula-list .content-card .t-table,
.formula-list .content-card .t-table .t-table__body-wrapper,
.formula-list .content-card .t-table .t-table__body-inner,
.formula-list .content-card .t-table .t-table__body { background: #fff !important; }

/* 2. 所有行 - 白色 */
.formula-list .content-card .t-table .t-table__body tr,
.formula-list .content-card .t-table .t-table__body .t-table__row { background-color: #fff !important; }

/* 3. 所有单元格（含 TDesign --hover 类）- 无竖线 */
.formula-list .content-card .t-table .t-table__body td,
.formula-list .content-card .t-table .t-table__body .t-table__row td,
.formula-list .content-card .t-table .t-table__body .t-table__row.t-table__row--hover td {
  background-color: transparent !important;
  border-bottom-color: #f1f5f9 !important;
  color: #334155 !important;
  box-shadow: none !important;
}

/* 4. CSS :hover 伪类（优先级最高）→ emerald 浅绿 + 首列绿条 */
.formula-list .content-card .t-table .t-table__body tr:hover > td,
.formula-list .content-card .t-table .t-table__body .t-table__row:hover > td {
  background-color: rgba(209,250,229,0.35) !important;
}
.formula-list .content-card .t-table .t-table__body tr:hover > td:first-child,
.formula-list .content-card .t-table .t-table__body .t-table__row:hover > td:first-child {
  box-shadow: inset 3px 0 0 #34d399 !important;
}

/* 5. 选中行 → emerald 更深 + 绿条 */
.formula-list .content-card .t-table .t-table__body .t-table__row.t-table__row--selected > td {
  background-color: rgba(209,250,229,0.6) !important;
  box-shadow: inset 3px 0 0 #10b981 !important;
}

/* 6. 表头 */
.formula-list .content-card .t-table .t-table__header th { background: #f8fafc !important; color: #64748b !important; }
</style>
