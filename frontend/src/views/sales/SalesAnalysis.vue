<template>
  <div class="sales-analysis" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <div :key="initialized ? 'content' : 'skeleton'">
        <PageSkeleton v-if="!initialized && !loadError" type="table" :rows="5" :columns="7" />

        <template v-else>
          <div v-if="loadError" class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 class="error-title">数据加载失败</h3>
            <p class="error-desc">{{ loadError }}</p>
            <button class="retry-btn" @click="retryLoad">
              <t-icon name="refresh" />
              重新加载
            </button>
          </div>

          <template v-else>
            <section class="dashboard-grid">
              <div class="stat-card" v-for="(card, idx) in dashboardCards" :key="card.label"
                :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
                <div class="stat-card-top">
                  <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
                  </div>
                  <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">
                    {{ card.badge }}
                  </span>
                </div>
                <p class="stat-label">{{ card.label }}</p>
                <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
              </div>
            </section>

            <div class="analysis-grid">
              <section class="chart-card trend-card">
                <div class="chart-header">
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    月度销量趋势
                  </h3>
                </div>
                <div class="chart-body">
                  <div v-if="trendData.length === 0" class="chart-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <p>暂无趋势数据</p>
                  </div>
                  <div v-else class="trend-chart">
                    <div class="trend-y-axis">
                      <span>{{ maxTrendValue }}</span>
                      <span>{{ Math.round(maxTrendValue / 2) }}</span>
                      <span>0</span>
                    </div>
                    <div class="trend-bars">
                      <div v-for="(item, idx) in trendData" :key="idx" class="trend-bar-group">
                        <div class="trend-bar-wrapper">
                          <div class="trend-bar bar-quantity" :style="{ height: getBarHeight(item.quantity) + '%' }">
                            <span class="bar-tooltip">{{ item.quantity }}件</span>
                          </div>
                          <div class="trend-bar bar-revenue"
                            :style="{ height: getBarHeight(item.revenue, true) + '%' }">
                            <span class="bar-tooltip">¥{{ (item.revenue / 10000).toFixed(1) }}万</span>
                          </div>
                        </div>
                        <span class="trend-label">{{ formatMonth(item.month) }}</span>
                      </div>
                    </div>
                    <div class="trend-legend">
                      <span class="legend-item"><i class="legend-dot" style="background:#3b82f6"></i>销量（件）</span>
                      <span class="legend-item"><i class="legend-dot" style="background:#10b981"></i>销售额（万元）</span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="chart-card rank-card">
                <div class="chart-header">
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                    配方销量排行 TOP{{ topFormulas.length }}
                  </h3>
                </div>
                <div class="chart-body">
                  <div v-if="topFormulas.length === 0" class="chart-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                    <p>暂无排行数据</p>
                  </div>
                  <div v-else class="rank-list">
                    <div v-for="(item, idx) in topFormulas" :key="item.formulaId" class="rank-item">
                      <span class="rank-number" :class="{ 'rank-top': idx < 3 }">{{ idx + 1 }}</span>
                      <div class="rank-info">
                        <p class="rank-name">{{ item.formulaName }}</p>
                        <div class="rank-bar-track">
                          <div class="rank-bar-fill" :style="{ width: getRankWidth(item.totalQuantity) + '%' }"></div>
                        </div>
                      </div>
                      <span class="rank-value">{{ item.totalQuantity }}<small>件</small></span>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <t-card class="content-card" bordered>
              <div class="data-center-toolbar">
                <div class="toolbar-left-section">
                  <div class="toolbar-title-section">
                    <h3 class="toolbar-title">销量明细</h3>
                    <p class="toolbar-subtitle">查看所有配方销量记录，支持筛选与排序</p>
                  </div>
                </div>
                <div class="toolbar-right-section">
                  <div class="filter-group">
                    <div class="filter-item">
                      <label class="filter-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                        起始月份
                      </label>
                      <t-date-picker v-model="filterPeriodStart" mode="month" placeholder="选择起始月" clearable size="small"
                        style="width: 140px" @change="handleFilter" />
                    </div>
                    <div class="filter-item">
                      <label class="filter-label">结束月份</label>
                      <t-date-picker v-model="filterPeriodEnd" mode="month" placeholder="选择结束月" clearable size="small"
                        style="width: 140px" @change="handleFilter" />
                    </div>
                    <div class="filter-item">
                      <label class="filter-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                        业务员
                      </label>
                      <t-select v-model="filterSalesmanId" placeholder="全部业务员" clearable filterable size="small"
                        style="width: 140px" @change="handleFilter">
                        <t-option v-for="s in salesmanStore.salesmen" :key="s.id" :value="s.id" :label="s.name" />
                      </t-select>
                    </div>
                    <div class="search-container" role="search">
                      <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                      </svg>
                      <t-input v-model="filterKeyword" placeholder="搜索配方名称..." clearable size="small"
                        aria-label="搜索配方名称" @change="handleFilter" />
                    </div>
                    <button class="add-formula-btn" @click="openCreateDrawer" aria-label="录入销量数据">
                      <t-icon name="add" class="add-icon" />
                      录入销量
                    </button>
                  </div>
                </div>
              </div>

              <t-table :data="salesStore.sales" :columns="tableColumns" :loading="salesStore.loading" row-key="id" hover
                table-layout="auto">
                <template #empty>
                  <t-empty description="暂无销量数据">
                    <template #action>
                      <button class="add-formula-btn" @click="openCreateDrawer">
                        <t-icon name="add" class="add-icon" />
                        录入销量
                      </button>
                    </template>
                  </t-empty>
                </template>
                <template #formulaName="{ row }">
                  <div class="formula-cell">
                    <div class="formula-avatar-sm" :style="{
                      backgroundColor: getAvatarColor(row.formulaName || '').bg,
                      color: getAvatarColor(row.formulaName || '').text,
                    }">
                      {{ getInitial(row.formulaName) }}
                    </div>
                    <div class="formula-detail">
                      <span class="formula-name-text">{{ row.formulaName || '--' }}</span>
                      <span class="formula-code-text" v-if="row.formulaCode">{{ row.formulaCode }}</span>
                    </div>
                  </div>
                </template>
                <template #salesmanName="{ row }">
                  <div class="salesman-cell">
                    <div class="salesman-avatar-sm" :style="{ backgroundColor: getAvatarColor(row.salesmanName).bg }">
                      {{ getInitial(row.salesmanName) }}
                    </div>
                    <span>{{ row.salesmanName || '--' }}</span>
                  </div>
                </template>
                <template #periodStart="{ row }">
                  <span class="period-tag">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    {{ formatPeriod(row.periodStart) }}
                  </span>
                </template>
                <template #periodType="{ row }">
                  <t-tag :theme="getPeriodTheme(row.periodType)" variant="light" size="small">
                    {{ getPeriodLabel(row.periodType) }}
                  </t-tag>
                </template>
                <template #quantity="{ row }">
                  <span class="qty-cell">
                    <span class="qty-value">{{ row.quantity?.toLocaleString() || 0 }}</span>
                    <small class="qty-unit">件</small>
                  </span>
                </template>
                <template #revenue="{ row }">
                  <span class="rev-cell">
                    ¥{{ (row.revenue || 0).toLocaleString('zh-CN', {
                      minimumFractionDigits: 2, maximumFractionDigits: 2
                    })
                    }}
                  </span>
                </template>
                <template #operation="{ row }">
                  <div class="action-buttons" role="group" :aria-label="`操作 ${row.formulaName}`">
                    <button class="action-btn edit-btn" @click.stop="openEditDrawer(row)" title="编辑"
                      :aria-label="`编辑${row.formulaName}的销量记录`">
                      <t-icon name="edit-1" />
                    </button>
                    <t-popconfirm theme="danger"
                      :content="`确定要删除「${row.formulaName}」在${formatPeriod(row.periodStart)}的销量记录吗？`"
                      @confirm="handleDelete(row)">
                      <button class="action-btn delete-btn" @click.stop title="删除"
                        :aria-label="`删除${row.formulaName}的销量记录`">
                        <t-icon name="delete" />
                      </button>
                    </t-popconfirm>
                  </div>
                </template>
              </t-table>

              <div v-if="salesStore.total > 0" class="table-pagination">
                <div class="pagination-info">
                  显示第 {{ (salesStore.currentPage - 1) * salesStore.pageSize + 1 }}-{{
                    Math.min(salesStore.currentPage * salesStore.pageSize, salesStore.total) }} 条，
                  共 {{ salesStore.total }} 条数据
                </div>
                <div class="pagination-controls">
                  <button class="pagination-btn" :class="{ 'pagination-btn--disabled': salesStore.currentPage === 1 }"
                    :disabled="salesStore.currentPage === 1" @click="goPage(salesStore.currentPage - 1)">上一页</button>
                  <template v-for="page in pageNumbers" :key="page">
                    <button v-if="page !== '...'" class="pagination-btn"
                      :class="{ 'pagination-btn--active': page === salesStore.currentPage }"
                      @click="typeof page === 'number' && goPage(page)">{{ page }}</button>
                    <span v-else class="pagination-ellipsis">...</span>
                  </template>
                  <button class="pagination-btn"
                    :class="{ 'pagination-btn--disabled': salesStore.currentPage === totalPages }"
                    :disabled="salesStore.currentPage === totalPages"
                    @click="goPage(salesStore.currentPage + 1)">下一页</button>
                </div>
              </div>
            </t-card>
          </template>
        </template>
      </div>
    </Transition>

    <SalesRecordDrawer v-model:visible="drawerVisible" :formula-id="drawerFormulaId" :edit-record="drawerEditRecord"
      @success="onDrawerSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useSalesStore } from '@/stores/sales'
import { useSalesmanStore } from '@/stores/salesman'
import type { SaleRecord } from '@/api/sales'
import SalesRecordDrawer from '@/components/SalesRecordDrawer.vue'

const salesStore = useSalesStore()
const salesmanStore = useSalesmanStore()

const initialized = ref(false)
const loadError = ref('')

const filterPeriodStart = ref('')
const filterPeriodEnd = ref('')
const filterSalesmanId = ref('')
const filterKeyword = ref('')

const drawerVisible = ref(false)
const drawerFormulaId = ref('')
const drawerEditRecord = ref<SaleRecord | null>(null)

const tableColumns = [
  { colKey: 'formulaName', title: '配方信息', width: 220 },
  { colKey: 'salesmanName', title: '业务员', width: 120 },
  { colKey: 'periodStart', title: '统计周期', width: 130 },
  { colKey: 'periodType', title: '周期类型', width: 100 },
  { colKey: 'quantity', title: '销量', width: 110 },
  { colKey: 'revenue', title: '销售额', width: 140 },
  { colKey: 'notes', title: '备注', width: 140, ellipsis: true },
  { colKey: 'operation', title: '操作', width: 100, align: 'center' as const },
]

const dashboardCards = computed(() => {
  const stats = salesStore.stats
  const comp = stats?.periodComparison
  return [
    {
      label: '总销量',
      value: (stats?.totalQuantity || 0).toLocaleString(),
      unit: '件',
      badge: comp && comp.quantityGrowthRate !== 0 ? `${comp.quantityGrowthRate > 0 ? '+' : ''}${comp.quantityGrowthRate}%` : '--',
      badgeColor: (comp?.quantityGrowthRate || 0) >= 0 ? '#10B981' : '#EF4444',
      badgeBg: (comp?.quantityGrowthRate || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
    {
      label: '总销售额',
      value: stats?.totalRevenue ? (stats.totalRevenue / 10000).toFixed(1) : '0',
      unit: '万元',
      badge: comp && comp.revenueGrowthRate !== 0 ? `${comp.revenueGrowthRate > 0 ? '+' : ''}${comp.revenueGrowthRate}%` : '--',
      badgeColor: (comp?.revenueGrowthRate || 0) >= 0 ? '#10B981' : '#EF4444',
      badgeBg: (comp?.revenueGrowthRate || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    },
    {
      label: '活跃配方',
      value: (stats?.topFormulas?.length || 0).toString(),
      unit: '款',
      badge: '有销量',
      badgeColor: '#3B82F6',
      badgeBg: '#EFF6FF',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<path d="M9 3h6v8l-3 4-3-4V3z"/><line x1="12" y1="7" x2="12" y2="3"/><line x1="9" y1="15" x2="15" y2="15"/><path d="M8 19h8"/>',
    },
    {
      label: '活跃业务员',
      value: (stats?.topSalesmen?.length || 0).toString(),
      unit: '人',
      badge: '有贡献',
      badgeColor: '#8B5CF6',
      badgeBg: '#F5F3FF',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    },
  ]
})

const trendData = computed(() => salesStore.stats?.monthlyTrend || [])
const topFormulas = computed(() => salesStore.stats?.topFormulas || [])

const maxTrendValue = computed(() => {
  const qMax = Math.max(...trendData.value.map(t => t.quantity), 1)
  return Math.ceil(qMax / 10) * 10
})

const maxTrendRevenue = computed(() => {
  const rMax = Math.max(...trendData.value.map(t => t.revenue), 1)
  return Math.ceil(rMax / 10000)
})

const getBarHeight = (val: number, isRevenue = false) => {
  if (isRevenue) return Math.max(2, (val / 10000) / maxTrendRevenue.value * 100)
  return Math.max(2, val / maxTrendValue.value * 100)
}

const getRankWidth = (val: number) => {
  const max = Math.max(...topFormulas.value.map(f => f.totalQuantity), 1)
  return Math.max(5, val / max * 100)
}

const formatMonth = (month: string) => {
  if (!month) return ''
  const parts = month.split('-')
  return `${parseInt(parts[1])}月`
}

const formatPeriod = (periodStart: string) => {
  if (!periodStart) return '--'
  const parts = periodStart.split('-')
  return `${parts[0]}年${parseInt(parts[1])}月`
}

const getPeriodLabel = (type: string) => ({ monthly: '月度', quarterly: '季度', yearly: '年度' }[type] || type)
const getPeriodTheme = (type: string) => ({ monthly: 'primary', quarterly: 'warning', yearly: 'default' }[type] as any || 'default')

const getAvatarColor = (text: string) => {
  const colors = [
    { bg: '#DBEAFE', text: '#3B82F6' }, { bg: '#FEE2E2', text: '#EF4444' },
    { bg: '#FEF3C7', text: '#F59E0B' }, { bg: '#D1FAE5', text: '#10B981' },
    { bg: '#E0E7FF', text: '#6366F1' }, { bg: '#F3E8FF', text: '#A855F7' },
  ]
  const index = (text || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
  return colors[index]
}

const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase()

const totalPages = computed(() => Math.ceil(salesStore.total / salesStore.pageSize) || 1)
const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value
  const current = salesStore.currentPage
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, '...', total]
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const goPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return
  salesStore.currentPage = page
  loadData()
}

const loadData = async () => {
  loadError.value = ''
  try {
    const params: Record<string, any> = {
      page: salesStore.currentPage,
      pageSize: salesStore.pageSize,
    }
    if (filterPeriodStart.value) params.periodStart = filterPeriodStart.value + '-01'
    if (filterPeriodEnd.value) params.periodEnd = filterPeriodEnd.value + '-01'
    if (filterSalesmanId.value) params.salesmanId = filterSalesmanId.value
    if (filterKeyword.value) params.keyword = filterKeyword.value

    await Promise.all([
      salesStore.fetchSales(params),
      salesStore.fetchStats({
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      }),
    ])
  } catch (e: any) {
    loadError.value = e.message || '加载失败，请稍后重试'
  }
}

const retryLoad = async () => {
  loadError.value = ''
  await loadData()
}

const handleFilter = () => {
  salesStore.currentPage = 1
  loadData()
}

const openCreateDrawer = () => {
  drawerFormulaId.value = ''
  drawerEditRecord.value = null
  drawerVisible.value = true
}

const openEditDrawer = (row: SaleRecord) => {
  drawerFormulaId.value = row.formulaId
  drawerEditRecord.value = row
  drawerVisible.value = true
}

const onDrawerSuccess = () => {
  loadData()
}

const handleDelete = async (row: SaleRecord) => {
  const ok = await salesStore.deleteSale(row.id)
  if (ok) await loadData()
}

onMounted(async () => {
  try {
    await salesmanStore.fetchSalesmen()
    await loadData()
  } catch (e: any) {
    loadError.value = e.message || '初始化失败'
  } finally {
    initialized.value = true
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.sales-analysis {
  padding: 0;
  padding-bottom: 32px;
  animation: page-fade-in 0.4s ease;
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;

  .error-icon {
    margin-bottom: 16px;
    opacity: 0.8;
  }

  .error-title {
    font-size: 18px;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 8px;
  }

  .error-desc {
    font-size: 14px;
    color: #64748B;
    margin: 0 0 24px;
    max-width: 400px;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    border-radius: 12px;
    border: none;
    background: $brand-primary;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: darken($brand-primary, 8%);
      transform: translateY(-1px);
    }
  }
}

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
    transition: all $transition-slow;
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
      width: 48px;
      height: 48px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .stat-label {
      font-size: 14px;
      color: #94A3B8;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #0F172A;
      line-height: 1.2;

      .stat-unit {
        font-size: 14px;
        font-weight: 400;
        color: #94A3B8;
      }
    }
  }
}

@keyframes dashboard-fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.analysis-grid {
  display: grid;
  grid-template-columns: 1.3fr 0.7fr;
  gap: 24px;
  margin-bottom: 30px;
}

.chart-card {
  background: #fff;
  border-radius: 24px;
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  overflow: hidden;

  .chart-header {
    padding: 20px 24px 0;

    .chart-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }
  }

  .chart-body {
    padding: 20px 24px 24px;
  }

  .chart-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 40px 0;
    color: #94A3B8;
    font-size: 14px;

    p {
      margin: 0;
    }
  }
}

.trend-chart {
  .trend-y-axis {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 200px;
    float: left;
    width: 40px;
    text-align: right;
    padding-right: 8px;
    font-size: 11px;
    color: #94A3B8;
  }

  .trend-bars {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    height: 200px;
    margin-left: 48px;
    padding-right: 4px;
  }

  .trend-bar-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 32px;
  }

  .trend-bar-wrapper {
    display: flex;
    align-items: flex-end;
    gap: 3px;
    width: 100%;
    height: 200px;
    justify-content: center;
  }

  .trend-bar {
    width: 12px;
    border-radius: 4px 4px 2px 2px;
    position: relative;
    cursor: pointer;
    transition: all 0.25s ease;
    min-height: 4px;

    &:hover {
      filter: brightness(1.08);
      transform: scaleX(1.15);
    }

    .bar-tooltip {
      position: absolute;
      top: -28px;
      left: 50%;
      transform: translateX(-50%);
      background: #1E293B;
      color: #fff;
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      z-index: 2;

      &::after {
        content: '';
        position: absolute;
        bottom: -4px;
        left: 50%;
        transform: translateX(-50%);
        border: 4px solid transparent;
        border-top-color: #1E293B;
      }
    }

    &:hover .bar-tooltip {
      opacity: 1;
    }
  }

  .bar-quantity {
    background: linear-gradient(180deg, #60A5FA, #3B82F6);
  }

  .bar-revenue {
    background: linear-gradient(180deg, #34D399, #10B981);
  }

  .trend-label {
    margin-top: 8px;
    font-size: 12px;
    color: #64748B;
    font-weight: 500;
  }

  .trend-legend {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #F1F5F9;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #64748B;

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: 3px;
        display: inline-block;
      }
    }
  }
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  transition: background 0.2s;

  &:hover {
    background: #F8FAFC;
  }

  .rank-number {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    color: #94A3B8;
    background: #F1F5F9;
    flex-shrink: 0;

    &.rank-top {
      background: linear-gradient(135deg, #FEF3C7, #FDE68A);
      color: #D97706;
    }
  }

  .rank-info {
    flex: 1;
    min-width: 0;

    .rank-name {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rank-bar-track {
      height: 6px;
      background: #F1F5F9;
      border-radius: 3px;
      overflow: hidden;
    }

    .rank-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #FDE68A, #F59E0B);
      transition: width 0.6s ease;
    }
  }

  .rank-value {
    font-size: 14px;
    font-weight: 700;
    color: #0F172A;
    flex-shrink: 0;

    small {
      font-size: 11px;
      font-weight: 400;
      color: #94A3B8;
    }
  }
}

.content-card {
  min-height: 400px;
  background-color: #fff;
  border-radius: 32px !important;
  border: 1px solid #f8fafc !important;
  overflow: visible;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all $transition-slow;

  &:hover {
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05);
    border-color: #ecfdf5 !important;
  }

  :deep(.t-card__body) {
    padding: 0 !important;
    overflow: visible;
  }

  :deep(.t-table__body .t-table__row) {
    animation: rowFadeIn 0.3s ease both;
  }
}

@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.data-center-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 28px;
  border-bottom: 1px solid #F1F5F9;
  flex-wrap: wrap;
  gap: 12px;

  .toolbar-left-section {
    .toolbar-title-section {
      h3.toolbar-title {
        font-size: 16px;
        font-weight: 700;
        color: #0F172A;
        margin: 0 0 4px;
      }

      p.toolbar-subtitle {
        font-size: 13px;
        color: #94A3B8;
        margin: 0;
      }
    }
  }

  .toolbar-right-section {
    .filter-group {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: 6px;

      .filter-label {
        font-size: 12px;
        color: #64748B;
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: 3px;
      }
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 10px;
        color: #94A3B8;
        pointer-events: none;
      }

      :deep(.t-input) {
        padding-left: 32px;
      }
    }
  }
}

.add-formula-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  border: none;
  background-color: #1e293b;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15);

  &:hover {
    background-color: #334155;
    transform: translateY(-1px);
  }

  .add-icon {
    font-size: 16px;
  }
}

.formula-cell {
  display: flex;
  align-items: center;
  gap: 10px;

  .formula-avatar-sm {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .formula-detail {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    .formula-name-text {
      font-size: 14px;
      font-weight: 600;
      color: #0F172A;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .formula-code-text {
      font-size: 12px;
      color: #94A3B8;
    }
  }
}

.salesman-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .salesman-avatar-sm {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: #fff;
    flex-shrink: 0;
  }
}

.period-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #475569;
}

.qty-cell {
  .qty-value {
    font-size: 14px;
    font-weight: 700;
    color: #3B82F6;
  }

  .qty-unit {
    font-size: 11px;
    color: #94A3B8;
    font-weight: 400;
    margin-left: 2px;
  }
}

.rev-cell {
  font-size: 14px;
  font-weight: 600;
  color: #059669;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid #E2E8F0;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    color: #64748B;

    &.edit-btn:hover {
      background: #EFF6FF;
      border-color: #93C5FD;
      color: #3B82F6;
    }

    &.delete-btn:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: #EF4444;
    }
  }
}

.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 28px;
  border-top: 1px solid #F1F5F9;

  .pagination-info {
    font-size: 13px;
    color: #64748B;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;

    .pagination-btn {
      min-width: 36px;
      height: 34px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(.pagination-btn--disabled) {
        border-color: #93C5FD;
        color: #3B82F6;
        background: #EFF6FF;
      }

      &.pagination-btn--active {
        background: #3B82F6;
        color: #fff;
        border-color: #3B82F6;
      }

      &.pagination-btn--disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .pagination-ellipsis {
      color: #CBD5E1;
      padding: 0 4px;
      font-size: 13px;
    }
  }
}
</style>
