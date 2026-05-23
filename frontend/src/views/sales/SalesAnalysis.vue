<template>
  <div class="sales-analysis" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <div :key="initialized ? 'content' : 'skeleton'">
        <PageSkeleton v-if="!initialized && !loadError" type="table" :rows="5" :columns="7" />

        <template v-else>
          <div v-if="loadError" class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"
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
            <section class="dashboard-section">
              <div class="dashboard-grid">
                <div class="stat-card" v-for="(card, _idx) in dashboardCards" :key="card.label"
                  :style="{ animationDelay: `${(_idx + 1) * 0.1}s` }">
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
              </div>
            </section>

            <div class="analysis-grid analysis-grid--four-col">
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
                      <span class="legend-item"><i class="legend-dot" style="background:var(--color-primary)"></i>销售额（万元）</span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="chart-card rank-card">
                <div class="chart-header">
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    业务员销售额排行 TOP{{ topSalesmenByRevenue.length }}
                  </h3>
                  <div class="rank-nav" v-if="salesmanRankTotalPages > 1">
                    <button class="rank-nav-btn" :disabled="salesmanRankPage <= 1" @click="salesmanRankPage--"
                      title="上一页">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span class="rank-nav-page">{{ salesmanRankPage }} / {{ salesmanRankTotalPages }}</span>
                    <button class="rank-nav-btn" :disabled="salesmanRankPage >= salesmanRankTotalPages"
                      @click="salesmanRankPage++" title="下一页">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="chart-body">
                  <div v-if="topSalesmenByRevenue.length === 0" class="chart-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <p>暂无业务员销售数据</p>
                  </div>
                  <div v-else class="rank-list">
                    <div v-for="(item, idx) in paginatedTopSalesmenByRevenue" :key="item.salesmanId"
                      class="rank-item rank-item--purple">
                      <span class="rank-number" :class="{ 'rank-top': idx < 3, 'rank-top--purple': idx < 3 }">{{
                        (salesmanRankPage - 1) * 5 + idx + 1
                      }}</span>
                      <div class="rank-info">
                        <p class="rank-name">{{ item.salesmanName }}</p>
                        <div class="rank-bar-track">
                          <div class="rank-bar-fill rank-bar-fill--purple"
                            :style="{ width: getSalesmanRevenueWidth(item.totalRevenue) + '%' }"></div>
                        </div>
                      </div>
                      <span class="rank-value rank-value--purple">¥{{ (item.totalRevenue / 10000).toFixed(1)
                      }}<small>万</small></span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="chart-card rank-card">
                <div class="chart-header">
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    配方销售额排行 TOP{{ revenueTopFormulas.length }}
                  </h3>
                  <div class="rank-nav" v-if="revenueFormulaRankTotalPages > 1">
                    <button class="rank-nav-btn" :disabled="revenueFormulaRankPage <= 1"
                      @click="revenueFormulaRankPage--" title="上一页">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span class="rank-nav-page">{{ revenueFormulaRankPage }} / {{ revenueFormulaRankTotalPages }}</span>
                    <button class="rank-nav-btn" :disabled="revenueFormulaRankPage >= revenueFormulaRankTotalPages"
                      @click="revenueFormulaRankPage++" title="下一页">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="chart-body">
                  <div v-if="revenueTopFormulas.length === 0" class="chart-empty">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <p>暂无销售额排行数据</p>
                  </div>
                  <div v-else class="rank-list">
                    <div v-for="(item, idx) in paginatedRevenueTopFormulas" :key="item.formulaId"
                      class="rank-item rank-item--revenue">
                      <span class="rank-number" :class="{ 'rank-top': idx < 3, 'rank-top--green': idx < 3 }">{{
                        (revenueFormulaRankPage - 1) * 5 + idx + 1
                      }}</span>
                      <div class="rank-info">
                        <p class="rank-name">{{ item.formulaName }}</p>
                        <div class="rank-bar-track">
                          <div class="rank-bar-fill rank-bar-fill--green"
                            :style="{ width: getRevenueRankWidth(item.totalRevenue) + '%' }"></div>
                        </div>
                      </div>
                      <span class="rank-value rank-value--green">¥{{ (item.totalRevenue / 10000).toFixed(1)
                      }}<small>万</small></span>
                    </div>
                  </div>
                </div>
              </section>

              <section class="chart-card rank-card">
                <div class="chart-header">
                  <h3 class="chart-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 20V10" />
                      <path d="M18 20V4" />
                      <path d="M6 20v-4" />
                    </svg>
                    配方销量排行 TOP{{ topFormulas.length }}
                  </h3>
                  <div class="rank-nav" v-if="formulaRankTotalPages > 1">
                    <button class="rank-nav-btn" :disabled="formulaRankPage <= 1" @click="formulaRankPage--"
                      title="上一页">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span class="rank-nav-page">{{ formulaRankPage }} / {{ formulaRankTotalPages }}</span>
                    <button class="rank-nav-btn" :disabled="formulaRankPage >= formulaRankTotalPages"
                      @click="formulaRankPage++" title="下一页">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
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
                    <div v-for="(item, idx) in paginatedTopFormulas" :key="item.formulaId" class="rank-item">
                      <span class="rank-number" :class="{ 'rank-top': idx < 3 }">{{ (formulaRankPage - 1) * 5 + idx + 1
                      }}</span>
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
              <div class="data-center-toolbar" :class="{ 'has-batch-bar': selectedRows.length > 0 }">
                <Transition name="batch-bar-slide">
                  <div v-if="selectedRows.length > 0" class="batch-action-bar">
                    <div class="batch-info">
                      <span class="batch-count"><strong>{{ selectedRows.length }}</strong> 项已选择</span>
                      <div class="batch-divider"></div>
                      <div class="batch-buttons">
                        <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedRows.length} 条销量记录吗？删除后无法恢复。`"
                          @confirm="handleBatchDelete">
                          <button class="batch-action-btn">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" />
                            </svg>
                            批量删除
                          </button>
                        </t-popconfirm>
                        <button class="batch-action-btn" @click="handleBatchExport">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          批量导出
                        </button>
                      </div>
                    </div>
                    <button class="batch-cancel-btn" @click="clearSelection">取消</button>
                  </div>
                </Transition>

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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="2"
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
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="2"
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
                table-layout="auto" :selected-row-keys="selectedRowKeys" @select-change="handleSelectChange"
                @row-click="handleRowClick">
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
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="2"
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
                  <span class="qty-cell">{{ row.quantity?.toLocaleString() || 0 }}</span>
                </template>
                <template #revenue="{ row }">
                  <span class="rev-cell">¥{{ ((row.revenue || 0) / 10000).toFixed(2) }}</span>
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

    <!-- 底部快捷动态 -->
    <section v-if="initialized && !loadError" class="activity-section">
      <!-- 左：近期销量动态 -->
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期动态
          </h4>
          <div class="activity-nav">
            <button class="activity-nav-btn" :disabled="activityPage <= 1" @click="activityPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ activityPage }} / {{ activityTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="activityPage >= activityTotalPages" @click="activityNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
        <div class="timeline-list">
          <div v-for="(item, index) in activityList" :key="index" class="timeline-item"
            :class="{ 'timeline-item--last': index === activityList.length - 1 }">
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

      <!-- 右：销量管理助手 -->
      <div class="activity-card activity-card--assistant">
        <div class="assistant-header">
          <h4 class="assistant-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 20V10" />
              <path d="M18 20V4" />
              <path d="M6 20v-4" />
            </svg>
            销量管理助手
          </h4>
          <div class="sales-nav" v-if="salesTodoTotalPages > 1">
            <button class="activity-nav-btn" :disabled="salesTodoPage <= 1" @click="salesTodoPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ salesTodoPage }} / {{ salesTodoTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="salesTodoPage >= salesTodoTotalPages" @click="salesTodoNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div class="todo-list" v-if="paginatedSalesTodoItems.length > 0">
          <TransitionGroup name="todo-list" tag="div" class="todo-list__inner">
            <div v-for="(item, _idx) in paginatedSalesTodoItems" :key="item.id" class="todo-item"
              :class="'todo-item--' + item.priority">
              <div class="todo-item__icon" :class="'todo-item__icon--' + item.type">
                <svg v-if="item.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              </div>
              <div class="todo-item__content">
                <p class="todo-item__title">{{ item.title }}</p>
                <p class="todo-item__desc">{{ item.desc }}</p>
              </div>
              <button class="todo-item__action" @click="handleSalesTodoAction(item)" :title="item.actionText">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </TransitionGroup>
        </div>

        <div class="assistant-empty" v-else>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>太棒了！暂无待处理事项</p>
          <span>所有配方销量数据完整~</span>
        </div>

        <div class="assistant-footer">
          <span class="assistant-hint">{{ formulaStore.formulas?.length || 0 }} 个配方 · 共 {{
            displaySalesPendingItems.length
          }} 项待办</span>
          <button class="assistant-refresh-btn" @click="refreshSalesPending" title="刷新">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <svg class="assistant-bg-icon" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20V10" />
          <path d="M18 20V4" />
          <path d="M6 20v-4" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useSalesStore } from '@/stores/sales';
import { useSalesmanStore } from '@/stores/salesman';
import { useFormulaStore } from '@/stores/formula';
import { MessagePlugin } from 'tdesign-vue-next';
import type { SaleRecord } from '@/api/sales';
import SalesRecordDrawer from '@/components/SalesRecordDrawer.vue';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const salesStore = useSalesStore();
const salesmanStore = useSalesmanStore();
const formulaStore = useFormulaStore();

const initialized = ref(false);
const loadError = ref('');

const filterPeriodStart = ref('');
const filterPeriodEnd = ref('');
const filterSalesmanId = ref('');
const filterKeyword = ref('');

const drawerVisible = ref(false);
const drawerFormulaId = ref('');
const drawerEditRecord = ref<SaleRecord | null>(null);

const tableColumns = [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'formulaName', title: '配方信息', width: 220 },
  { colKey: 'salesmanName', title: '业务员', width: 120 },
  { colKey: 'periodStart', title: '统计周期', width: 130 },
  { colKey: 'periodType', title: '周期类型', width: 100 },
  { colKey: 'quantity', title: '销量（件）', width: 110 },
  { colKey: 'revenue', title: '销售额（万元）', width: 140 },
  { colKey: 'notes', title: '备注', width: 140, ellipsis: true },
  { colKey: 'operation', title: '操作', width: 100, align: 'center' as const, titleAlign: 'center' },
];

const dashboardCards = computed(() => {
  const stats = salesStore.stats;
  const comp = stats?.periodComparison;
  return [
    {
      label: '总销量',
      value: (stats?.totalQuantity || 0).toLocaleString(),
      unit: '件',
      badge: comp && comp.quantityGrowthRate !== 0 ? `${comp.quantityGrowthRate > 0 ? '+' : ''}${comp.quantityGrowthRate}%` : '--',
      badgeColor: (comp?.quantityGrowthRate || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
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
      badgeColor: (comp?.revenueGrowthRate || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: (comp?.revenueGrowthRate || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
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
      iconColor: 'var(--color-warning)',
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
  ];
});

const trendData = computed(() => salesStore.stats?.monthlyTrend || []);
const topFormulas = computed(() => salesStore.stats?.topFormulas || []);

const RANK_PAGE_SIZE = 5;

const salesmanRankPage = ref(1);
const revenueFormulaRankPage = ref(1);
const formulaRankPage = ref(1);

const revenueTopFormulas = computed(() => {
  const formulas = topFormulas.value;
  if (!formulas || formulas.length === 0) return [];
  return [...formulas]
    .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
    .slice(0, 10);
});

const topSalesmenByRevenue = computed(() => {
  const salesList = salesStore.sales;
  if (!salesList || salesList.length === 0) return [];

  const salesmanMap: Record<string, { salesmanId: string; salesmanName: string; totalRevenue: number; }> = {};

  for (const sale of salesList) {
    if (!sale.salesmanId) continue;
    if (!salesmanMap[sale.salesmanId]) {
      salesmanMap[sale.salesmanId] = {
        salesmanId: sale.salesmanId,
        salesmanName: sale.salesmanName || '未知',
        totalRevenue: 0
      };
    }
    salesmanMap[sale.salesmanId].totalRevenue += (sale.revenue || 0);
  }

  return Object.values(salesmanMap)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
});

const salesmanRankTotalPages = computed(() => Math.max(1, Math.ceil(topSalesmenByRevenue.value.length / RANK_PAGE_SIZE)));
const revenueFormulaRankTotalPages = computed(() => Math.max(1, Math.ceil(revenueTopFormulas.value.length / RANK_PAGE_SIZE)));
const formulaRankTotalPages = computed(() => Math.max(1, Math.ceil(topFormulas.value.length / RANK_PAGE_SIZE)));

const paginatedTopSalesmenByRevenue = computed(() => {
  const start = (salesmanRankPage.value - 1) * RANK_PAGE_SIZE;
  return topSalesmenByRevenue.value.slice(start, start + RANK_PAGE_SIZE);
});

const paginatedRevenueTopFormulas = computed(() => {
  const start = (revenueFormulaRankPage.value - 1) * RANK_PAGE_SIZE;
  return revenueTopFormulas.value.slice(start, start + RANK_PAGE_SIZE);
});

const paginatedTopFormulas = computed(() => {
  const start = (formulaRankPage.value - 1) * RANK_PAGE_SIZE;
  return topFormulas.value.slice(start, start + RANK_PAGE_SIZE);
});

const getSalesmanRevenueWidth = (val: number) => {
  const max = Math.max(...topSalesmenByRevenue.value.map(s => s.totalRevenue), 1);
  return Math.max(5, val / max * 100);
};

const maxTrendValue = computed(() => {
  const qMax = Math.max(...trendData.value.map(t => t.quantity), 1);
  return Math.ceil(qMax / 10) * 10;
});

const maxTrendRevenue = computed(() => {
  const rMax = Math.max(...trendData.value.map(t => t.revenue), 1);
  return Math.ceil(rMax / 10000);
});

const getBarHeight = (val: number, isRevenue = false) => {
  if (isRevenue) return Math.max(2, (val / 10000) / maxTrendRevenue.value * 100);
  return Math.max(2, val / maxTrendValue.value * 100);
};

const getRankWidth = (val: number) => {
  const max = Math.max(...topFormulas.value.map(f => f.totalQuantity), 1);
  return Math.max(5, val / max * 100);
};

const getRevenueRankWidth = (val: number) => {
  const max = Math.max(...revenueTopFormulas.value.map(f => f.totalRevenue || 0), 1);
  return Math.max(5, val / max * 100);
};

const formatMonth = (month: string) => {
  if (!month) return '';
  const parts = month.split('-');
  return `${parseInt(parts[1])}月`;
};

const formatPeriod = (periodStart: string) => {
  if (!periodStart) return '--';
  const parts = periodStart.split('-');
  return `${parts[0]}年${parseInt(parts[1])}月`;
};

const getPeriodLabel = (type: string) => ({ monthly: '月度', quarterly: '季度', yearly: '年度' }[type] || type);
const getPeriodTheme = (type: string) => ({ monthly: 'primary', quarterly: 'warning', yearly: 'default' }[type] as any || 'default');

const getAvatarColor = (text: string) => {
  const colors = [
    { bg: '#DBEAFE', text: '#3B82F6' }, { bg: '#FEE2E2', text: 'var(--color-danger)' },
    { bg: '#FEF3C7', text: 'var(--color-warning)' }, { bg: 'var(--color-primary-bg)', text: 'var(--color-primary)' },
    { bg: '#E0E7FF', text: '#6366F1' }, { bg: '#F3E8FF', text: '#A855F7' },
  ];
  const index = (text || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

const getInitial = (name: string) => (name || '?').charAt(0).toUpperCase();

const totalPages = computed(() => Math.ceil(salesStore.total / salesStore.pageSize) || 1);
const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = salesStore.currentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

const goPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  salesStore.currentPage = page;
  loadData();
};

const loadData = async () => {
  loadError.value = '';
  try {
    const params: Record<string, any> = {
      page: salesStore.currentPage,
      pageSize: salesStore.pageSize,
    };
    if (filterPeriodStart.value) params.periodStart = filterPeriodStart.value + '-01';
    if (filterPeriodEnd.value) params.periodEnd = filterPeriodEnd.value + '-01';
    if (filterSalesmanId.value) params.salesmanId = filterSalesmanId.value;
    if (filterKeyword.value) params.keyword = filterKeyword.value;

    await Promise.all([
      salesStore.fetchSales(params),
      salesStore.fetchStats({
        periodStart: params.periodStart,
        periodEnd: params.periodEnd,
      }),
    ]);
  } catch (e: any) {
    loadError.value = e.message || '加载失败，请稍后重试';
  }
};

const retryLoad = async () => {
  loadError.value = '';
  await loadData();
};

const handleFilter = () => {
  salesStore.currentPage = 1;
  loadData();
};

const openCreateDrawer = () => {
  drawerFormulaId.value = '';
  drawerEditRecord.value = null;
  drawerVisible.value = true;
};

const openEditDrawer = (row: SaleRecord) => {
  drawerFormulaId.value = row.formulaId;
  drawerEditRecord.value = row;
  drawerVisible.value = true;
};

const handleRowClick = (ctx: { row: SaleRecord; col?: { colKey: string; }; }) => {
  if (!ctx.col || ctx.col.colKey !== 'row-select') {
    openEditDrawer(ctx.row);
  }
};

const onDrawerSuccess = () => {
  loadData();
};

const handleDelete = async (row: SaleRecord) => {
  const ok = await salesStore.deleteSale(row.id);
  if (ok) await loadData();
};

const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<SaleRecord[]>([]);

const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: SaleRecord[]; }) => {
  selectedRowKeys.value = value;
  selectedRows.value = selectedRowData;
};

const clearSelection = () => {
  selectedRowKeys.value = [];
  selectedRows.value = [];
};

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return;
  const count = selectedRows.value.length;
  let successCount = 0;
  for (const row of selectedRows.value) {
    const ok = await salesStore.deleteSale(row.id);
    if (ok) successCount++;
  }
  MessagePlugin.success(`成功删除 ${successCount}/${count} 条销量记录`);
  clearSelection();
  await loadData();
};

const handleBatchExport = () => {
  if (selectedRows.value.length === 0) return;
  const data = selectedRows.value.map(r => ({
    配方名称: r.formulaName,
    业务员: r.salesmanName,
    统计周期: formatPeriod(r.periodStart),
    周期类型: getPeriodLabel(r.periodType),
    销量: r.quantity,
    销售额: r.revenue,
    备注: r.notes || '',
  }));
  const csv = [
    Object.keys(data[0]).join(','),
    ...data.map(row => Object.values(row).map(v => `"${v}"`).join(',')),
  ].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `销量数据导出_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  MessagePlugin.success(`已导出 ${selectedRows.value.length} 条销量记录`);
  clearSelection();
};

interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }

interface SalesTodoItem {
  id: string;
  type: 'warning' | 'info' | 'default';
  priority: 'high' | 'medium' | 'low';
  title: string;
  desc: string;
  actionText: string;
  actionType: 'edit' | 'view' | 'create';
  formulaId?: string;
}

const SALES_TODO_PAGE_SIZE = 3;
const salesTodoPage = ref(1);

const displaySalesPendingItems = computed<SalesTodoItem[]>(() => {
  const items: SalesTodoItem[] = [];
  const formulas = formulaStore.formulas || [];
  const salesList = salesStore.sales || [];

  for (const f of formulas) {
    const hasSalesData = salesList.some((s: any) => s.formulaId === f.id);
    if (!hasSalesData && f.status === 'published') {
      items.push({
        id: `nosales-${f.id}`,
        type: 'warning',
        priority: 'high',
        title: '销量数据待录入',
        desc: `「${f.name}」本月暂无销量数据`,
        actionText: '去录入',
        actionType: 'edit',
        formulaId: f.id
      });
    }

    if (f.status === 'draft') {
      items.push({
        id: `draft-${f.id}`,
        type: 'info',
        priority: 'medium',
        title: '配方未发布',
        desc: `「${f.name}」仍为草稿状态，无法统计销量`,
        actionText: '查看详情',
        actionType: 'view',
        formulaId: f.id
      });
    }
  }

  if (formulas.length === 0 || items.length === 0) {
    items.push(
      {
        id: 'mock-1', type: 'warning' as const, priority: 'high' as const,
        title: '销量待录入', desc: '「人参养荣汤」本月暂无销量数据', actionText: '去录入', actionType: 'edit' as const, formulaId: 'demo-001'
      },
      {
        id: 'mock-2', type: 'warning' as const, priority: 'high' as const,
        title: '销量待录入', desc: '「十全大补汤」本月暂无销量数据', actionText: '去录入', actionType: 'edit' as const, formulaId: 'demo-002'
      },
      {
        id: 'mock-3', type: 'info' as const, priority: 'medium' as const,
        title: '配方未发布', desc: '「归脾汤」仍为草稿状态，无法统计销量', actionText: '查看详情', actionType: 'view' as const, formulaId: 'demo-003'
      },
      {
        id: 'mock-4', type: 'default' as const, priority: 'low' as const,
        title: '数据更新提示', desc: '「补中益气汤」超过30天未更新销量', actionText: '去更新', actionType: 'edit' as const, formulaId: 'demo-004'
      },
    );
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items.slice(0, 8);
});

const salesTodoTotalPages = computed(() => Math.max(1, Math.ceil(displaySalesPendingItems.value.length / SALES_TODO_PAGE_SIZE)));

const paginatedSalesTodoItems = computed<SalesTodoItem[]>(() => {
  const start = (salesTodoPage.value - 1) * SALES_TODO_PAGE_SIZE;
  return displaySalesPendingItems.value.slice(start, start + SALES_TODO_PAGE_SIZE);
});

const salesTodoPrev = () => { if (salesTodoPage.value > 1) salesTodoPage.value--; };
const salesTodoNext = () => { if (salesTodoPage.value < salesTodoTotalPages.value) salesTodoPage.value++; };

const handleSalesTodoAction = (item: SalesTodoItem) => {
  if (item.actionType === 'edit' && item.formulaId) {
    drawerFormulaId.value = item.formulaId;
    drawerEditRecord.value = null;
    drawerVisible.value = true;
  }
};

const refreshSalesPending = async () => {
  await Promise.all([
    formulaStore.fetchFormulas(),
    loadData()
  ]);
  salesTodoPage.value = 1;
};

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [];
  const salesList = salesStore.sales;

  if (!salesList || salesList.length === 0) return items;

  const sortedSales = [...salesList].sort((a, b) =>
    new Date(b.updatedAt || b.createdAt || '').getTime() -
    new Date(a.updatedAt || a.createdAt || '').getTime()
  );

  for (const s of sortedSales.slice(0, 20)) {
    const timeAgo = formatTimeAgo(s.updatedAt || s.createdAt || '');
    if (s.quantity > 100) {
      items.push({
        type: 'success',
        title: '高销量录入',
        desc: `<strong>${s.salesmanName || '未知'}</strong> 录入 <span class="text-emerald-600 font-bold">${s.formulaName}</span> 销量 <span class="text-emerald-600 font-bold">${s.quantity}</span> 件，销售额 <span class="text-emerald-600 font-bold">¥${(s.revenue || 0).toLocaleString()}</span>`,
        time: timeAgo
      });
    } else if (s.revenue > 10000) {
      items.push({
        type: 'warning',
        title: '高销售额',
        desc: `<strong>${s.formulaName}</strong> 在 ${formatPeriod(s.periodStart)} 创造销售额 <span class="text-amber-600 font-bold">¥${(s.revenue / 10000).toFixed(1)}万</span>`,
        time: timeAgo
      });
    } else {
      items.push({
        type: 'info',
        title: '销量更新',
        desc: `<strong>${s.salesmanName || '未知'}</strong> 更新了 <span class="text-blue-600 font-bold">${s.formulaName}</span> 的 ${getPeriodLabel(s.periodType)}数据`,
        time: timeAgo
      });
    }
  }

  return items;
});

const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));

const activityList = computed<ActivityItem[]>(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return allActivityItems.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});

const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const _assistantMessage = computed(() => {
  const total = salesStore.total;
  const stats = salesStore.stats;
  const activeFormulas = stats?.topFormulas?.length || 0;
  if (total === 0) return '您还没有录入任何销量数据，点击下方按钮开始第一条销量记录吧！';
  if (total < 10) return `当前共有 ${total} 条销量记录，建议继续补充各配方的销售数据。`;
  return `当前共有 ${total} 条销量记录，覆盖 ${activeFormulas} 个配方，数据表现良好！`;
});

function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '刚刚';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

onMounted(async () => {
  try {
    await Promise.all([
      salesmanStore.fetchSalesmen(),
      formulaStore.fetchFormulas(),
      loadData()
    ]);
  } catch (e: any) {
    loadError.value = e.message || '初始化失败';
  } finally {
    initialized.value = true;
  }
});
</script>

<style scoped lang="scss">
@use 'sass:color';
@use '@/assets/styles/variables.scss' as *;

.sales-analysis {
  padding: 0;
  padding-bottom: 32px;
  animation: page-fade-in 0.4s ease;
}

.dashboard-section {
  margin-bottom: 30px;

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

.activity-section {
  margin-top: 30px;
  padding-bottom: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
}

.activity-card {
  background-color: #fff;
  border-radius: var(--radius-4xl);
  padding: 32px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid var(--color-bg-page);

  &--assistant {
    background: #fff;
    border: 1px solid var(--color-bg-page);
    color: #0F172A;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  }
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.activity-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.activity-nav {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);

  .activity-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.04);
    color: var(--color-primary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.12);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      border-color: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
      background: transparent;
    }
  }

  .activity-nav-page {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    min-width: 36px;
    text-align: center;
    user-select: none;
  }
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  position: relative;
  padding-bottom: 24px;

  &:not(.timeline-item--last)::after {
    content: '';
    position: absolute;
    left: 11px;
    top: 28px;
    bottom: 0;
    width: 1px;
    background-color: #f1f5f9;
  }
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 10;
  position: relative;

  &--success {
    background-color: var(--color-primary-bg);
  }

  &--warning {
    background-color: #fef3c7;
  }

  &--info {
    background-color: #dbeafe;
  }
}

.timeline-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  .timeline-dot--success & {
    background-color: var(--color-primary);
  }

  .timeline-dot--warning & {
    background-color: var(--color-warning);
  }

  .timeline-dot--info & {
    background-color: #3b82f6;
  }
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0 0 4px 0;

  :deep(.text-emerald-600) {
    color: var(--color-primary-dark) !important;
    font-weight: 700 !important;
  }

  :deep(.text-amber-600) {
    color: #d97706 !important;
    font-weight: 700 !important;
  }

  :deep(.text-blue-600) {
    color: #2563eb !important;
    font-weight: 700 !important;
  }

  :deep(strong) {
    font-weight: 700;
  }
}

.timeline-time {
  font-size: 10px;
  color: #cbd5e1;
  text-transform: uppercase;
  display: inline-block;
  margin-top: 4px;
}

.activity-card--assistant {
  .assistant-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -32px -32px 16px -32px;
    padding: 20px 24px;
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    border-radius: var(--radius-4xl) var(--radius-4xl) 0 0;

    .assistant-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
  }

  .sales-nav {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);

    .activity-nav-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: 8px;
      border: 1.5px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.5);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: rgba(255, 255, 255, 0.15);
        color: rgba(255, 255, 255, 0.5);
        background: transparent;
      }
    }

    .activity-nav-page {
      font-size: 12px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.85);
      min-width: 32px;
      text-align: center;
      user-select: none;
    }
  }

  .todo-list {
    &__inner {
      display: flex;
      flex-direction: column;
      gap: var(--space-2-5);
    }
  }

  .todo-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: var(--space-3-5);
    background: var(--color-bg-page);
    border-radius: 14px;
    border: 1px solid #f1f5f9;
    transition: all 0.25s ease;
    cursor: default;
    animation: todoSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;

    &:hover {
      background: #f1f5f9;
      border-color: var(--color-border);
      transform: translateX(4px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }

    &--high {
      background: #FFFBEB;
      border-color: #FEF08A;

      &:hover {
        background: #FEF9C3;
        border-color: #FDE047;
      }

      .todo-item__title {
        color: #92400E;
      }

      .todo-item__desc {
        color: #78716C;
      }
    }

    &--medium {
      background: #EFF6FF;
      border-color: #BFDBFE;

      &:hover {
        background: #DBEAFE;
        border-color: #93C5FD;
      }

      .todo-item__title {
        color: #1E40AF;
      }

      .todo-item__desc {
        color: var(--color-text-secondary);
      }
    }

    &--low,
    &:not(&--high):not(&--medium) {
      background: #F5F3FF;
      border-color: #DDD6FE;

      &:hover {
        background: #EDE9FE;
        border-color: #C4B5FD;
      }

      .todo-item__title {
        color: #5B21B6;
      }

      .todo-item__desc {
        color: #6B7280;
      }
    }

    &__icon {
      flex-shrink: 0;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;

      &--warning {
        background: linear-gradient(135deg, #FEF3C7, #FDE68A);
        color: #D97706;
      }

      &--info {
        background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
        color: #2563EB;
      }

      &--default {
        background: linear-gradient(135deg, #EDE9FE, #DDD6FE);
        color: #7C3AED;
      }
    }

    &__content {
      flex: 1;
      min-width: 0;
    }

    &__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary);
      margin: 0 0 var(--space-1) 0;
      line-height: 1.3;
    }

    &__desc {
      font-size: 12px;
      color: var(--color-text-secondary);
      margin: 0;
      line-height: 1.4;
    }

    &__action {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1.5px solid var(--color-border);
      background: #fff;
      color: var(--color-text-secondary);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        border-color: transparent;
        color: #fff;
        transform: scale(1.05);
      }
    }
  }

  @keyframes todoSlideIn {
    from {
      opacity: 0;
      transform: translateX(-12px);
    }

    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  .assistant-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: var(--space-8) 20px 24px;

    svg {
      margin-bottom: 12px;
      stroke: var(--color-primary);
    }

    p {
      font-size: 15px;
      font-weight: 600;
      color: #0F172A;
      margin: 0 0 var(--space-1-5) 0;
    }

    span {
      font-size: 13px;
      color: var(--color-text-placeholder);
    }
  }

  .assistant-footer {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .assistant-hint {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }

  .assistant-refresh-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid var(--color-border);
    background: #fff;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
      color: var(--color-text-secondary);
      transform: rotate(180deg);
    }
  }

  .assistant-bg-icon {
    position: absolute;
    right: -20px;
    bottom: -20px;
    width: 140px;
    height: 140px;
    opacity: 0.08;
    transform: rotate(-12deg);
    color: var(--color-primary);
    pointer-events: none;
    z-index: 0;
  }
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
  padding: var(--space-16) 20px;
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
    color: var(--color-text-secondary);
    margin: 0 0 24px;
    max-width: 400px;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: var(--space-2-5) 24px;
    border-radius: 12px;
    border: none;
    background: $brand-primary;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: color.adjust($brand-primary, $lightness: -8%);
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
    border-radius: var(--radius-4xl);
    border: 1px solid #fff;
    box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
    transition: all $transition-slow;
    animation: dashboard-fade-in 0.5s ease forwards;
    opacity: 0;

    &:hover {
      border-color: var(--color-primary-bg);
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
      padding: var(--space-0-5) 8px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .stat-label {
      font-size: 14px;
      color: var(--color-text-placeholder);
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
        color: var(--color-text-placeholder);
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
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 30px;

  &--four-col {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 1600px) {
    grid-template-columns: repeat(2, 1fr);

    &--four-col {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;

    &--four-col {
      grid-template-columns: 1fr;
    }
  }
}

.chart-card {
  background: #fff;
  border-radius: var(--radius-4xl);
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  overflow: hidden;

  .chart-header {
    padding: 20px 24px 0;
    display: flex;
    justify-content: space-between;
    align-items: center;

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
    color: var(--color-text-placeholder);
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
    color: var(--color-text-placeholder);
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
    gap: var(--space-1);
    width: 100%;
    height: 200px;
    justify-content: center;
  }

  .trend-bar {
    width: 12px;
    border-radius: 4px 4px var(--radius-2xs) var(--radius-2xs);
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
      background: var(--color-text-primary);
      color: #fff;
      font-size: 11px;
      padding: var(--space-1) 8px;
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
        border-top-color: var(--color-text-primary);
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
    background: linear-gradient(180deg, var(--color-primary-light), var(--color-primary));
  }

  .trend-label {
    margin-top: 8px;
    font-size: 12px;
    color: var(--color-text-secondary);
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
      gap: var(--space-1-5);
      font-size: 12px;
      color: var(--color-text-secondary);

      .legend-dot {
        width: 10px;
        height: 10px;
        border-radius: var(--radius-xs);
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

.rank-nav {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);

  .rank-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1.5px solid rgba(59, 130, 246, 0.2);
    background: rgba(59, 130, 246, 0.04);
    color: #3B82F6;
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: rgba(59, 130, 246, 0.12);
      border-color: #3B82F6;
      color: #2563eb;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      border-color: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
      background: transparent;
    }
  }

  .rank-nav-page {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    min-width: 32px;
    text-align: center;
    user-select: none;
  }
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--space-2-5) 12px;
  border-radius: 12px;
  transition: background 0.2s;

  &:hover {
    background: var(--color-bg-page);
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
    color: var(--color-text-placeholder);
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
      color: var(--color-text-primary);
      margin: 0 0 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rank-bar-track {
      height: 6px;
      background: #F1F5F9;
      border-radius: var(--radius-xs);
      overflow: hidden;
    }

    .rank-bar-fill {
      height: 100%;
      border-radius: var(--radius-xs);
      background: linear-gradient(90deg, #FDE68A, var(--color-warning));
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
      color: var(--color-text-placeholder);
    }
  }
}

.content-card {
  min-height: 400px;
  background-color: #fff;
  border-radius: var(--radius-5xl) !important;
  border: 1px solid var(--color-bg-page) !important;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  transition: all $transition-slow;

  &:hover {
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05);
    border-color: #ecfdf5 !important;
  }

  :deep(.t-card__body) {
    padding: 0 !important;
    overflow: hidden;
    border-radius: 0 0 var(--radius-5xl) var(--radius-5xl);
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
  padding: 20px var(--space-7);
  border-bottom: 1px solid #F1F5F9;
  flex-wrap: wrap;
  gap: 12px;
  position: relative;
  min-height: 88px;

  &.has-batch-bar {
    border-bottom: none;
  }

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
        color: var(--color-text-placeholder);
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

      .add-formula-btn {
        margin-left: auto;
      }
    }

    .filter-item {
      display: flex;
      align-items: center;
      gap: var(--space-1-5);

      .filter-label {
        font-size: 12px;
        color: var(--color-text-secondary);
        white-space: nowrap;
        display: flex;
        align-items: center;
        gap: var(--space-1);
      }
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 10px;
        color: var(--color-text-placeholder);
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
  background-color: var(--color-text-primary);
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15);

  &:hover {
    background-color: var(--color-text-primary);
    transform: translateY(-1px);
  }

  .add-icon {
    font-size: 16px;
  }
}

.formula-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);

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
      color: var(--color-text-placeholder);
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
  color: var(--color-text-secondary);
}

.qty-cell {
  font-size: 14px;
  font-weight: 700;
  color: #3B82F6;
}

.rev-cell {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-primary-dark);
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--color-text-secondary);

    &.edit-btn:hover {
      background: #EFF6FF;
      border-color: #93C5FD;
      color: #3B82F6;
    }

    &.delete-btn:hover {
      background: #FEF2F2;
      border-color: #FCA5A5;
      color: var(--color-danger);
    }
  }
}

:deep(.t-table) {
  .t-table__body tr {
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover td {
      background-color: #F0FDF4 !important;
      border-color: transparent !important;
      box-shadow: none !important;
    }
  }

  .t-table__row--selected td,
  .t-table__body .t-table__row--selected:hover td {
    background-color: transparent !important;
    border-right-color: transparent !important;
    box-shadow: none !important;
  }

  td {
    border-bottom: 1px solid #f1f5f9 !important;
    vertical-align: middle !important;

    &:last-child {
      text-align: center !important;

      .action-buttons {
        justify-content: center !important;
      }
    }
  }

  th:last-child {
    text-align: center !important;

    .t-table__th-cell-inner {
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      width: 100% !important;
    }
  }

  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
  --td-brand-color-disabled: var(--color-primary-lightest);
  --td-brand-color-light: #{$overlay-emerald-10};
  --td-brand-color-focus: #{$overlay-emerald-40};
  --td-brand-color-border-active: var(--color-primary);
  --td-brand-color-border-hover: var(--color-primary);
  --td-brand-color-border-focus: var(--color-primary);

  .t-checkbox .t-checkbox__input.is-checked .t-checkbox__input__inner,
  .t-checkbox .t-checkbox__input.is-indeterminate .t-checkbox__input__inner {
    background-color: var(--td-brand-color) !important;
    border-color: var(--td-brand-color) !important;
  }

  .t-checkbox .t-checkbox__input.is-checked .t-checkbox__input__inner::after,
  .t-checkbox .t-checkbox__input.is-indeterminate .t-checkbox__input__inner::after {
    border-color: #{$text-white} !important;
  }

  .t-checkbox .t-checkbox__input:hover .t-checkbox__input__inner {
    border-color: var(--td-brand-color) !important;
  }

  .t-checkbox .t-checkbox__input.is-focus .t-checkbox__input__inner {
    box-shadow: 0 0 0 2px var(--td-brand-color-focus) !important;
  }
}

.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background-color: #fff;
  border-top: 1px solid var(--color-bg-page);
  border-radius: 0 0 var(--radius-5xl) var(--radius-5xl);

  .pagination-info {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;

    .pagination-btn {
      min-width: 36px;
      height: 34px;
      padding: 0 var(--space-2-5);
      border-radius: 10px;
      border: 1px solid var(--color-border);
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: var(--color-text-secondary);
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(.pagination-btn--disabled) {
        border-color: var(--color-primary-lighter);
        color: var(--color-primary-dark);
        background: #ECFDF5;
      }

      &.pagination-btn--active {
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
        color: #fff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
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


.rank-item--revenue {
  .rank-top--green {
    background: linear-gradient(135deg, var(--color-primary-bg), var(--color-primary-lightest));
    color: var(--color-primary-dark);
  }

  .rank-value--green {
    color: var(--color-primary-dark);
  }

  .rank-bar-fill--green {
    background: linear-gradient(90deg, var(--color-primary-lightest), var(--color-primary));
  }
}

.rank-item--purple {
  .rank-top--purple {
    background: linear-gradient(135deg, #EDE9FE, #DDD6FE);
    color: #7C3AED;
  }

  .rank-value--purple {
    color: #7C3AED;
  }

  .rank-bar-fill--purple {
    background: linear-gradient(90deg, #DDD6FE, #8B5CF6);
  }
}

.batch-action-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background-color: var(--color-primary-dark);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px var(--space-7);
  border-radius: var(--radius-5xl) var(--radius-5xl) 0 0;

  .batch-info {
    display: flex;
    align-items: center;
    gap: 24px;

    .batch-count {
      font-weight: 700;
      font-size: 14px;

      strong {
        font-weight: 800;
        margin-right: 4px;
      }
    }

    .batch-divider {
      width: 1px;
      height: 16px;
      background: rgba(52, 211, 153, 0.5);
    }

    .batch-buttons {
      display: flex;
      gap: 16px;
    }

    .batch-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 500;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        color: var(--color-primary-bg);
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }

  .batch-cancel-btn {
    padding: var(--space-1-5) 16px;
    border-radius: 8px;
    border: 1.5px solid rgba(255, 255, 255, 0.4);
    background: transparent;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.6);
    }
  }
}

.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: all 0.25s ease;
}

.batch-bar-slide-enter-from,
.batch-bar-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.todo-list-enter-active,
.todo-list-leave-active {
  transition: all 0.3s ease;
}

.todo-list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.todo-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.todo-list-move {
  transition: transform 0.3s ease;
}

.activity-section {
  margin-top: 30px;
  padding-bottom: 0;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
}

.activity-card {
  background-color: #fff;
  border-radius: var(--radius-4xl);
  padding: 32px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid var(--color-bg-page);

  &--assistant {
    background: #fff;
    border: 1px solid var(--color-bg-page);
    color: #0F172A;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  }
}

.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.activity-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.activity-nav {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);

  .activity-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.04);
    color: var(--color-primary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.12);
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
      border-color: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
      background: transparent;
    }
  }

  .activity-nav-page {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    min-width: 36px;
    text-align: center;
    user-select: none;
  }
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.timeline-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  position: relative;
  padding-bottom: 24px;

  &:not(.timeline-item--last)::after {
    content: '';
    position: absolute;
    left: 11px;
    top: 28px;
    bottom: 0;
    width: 1px;
    background-color: #f1f5f9;
  }
}

.timeline-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 10;
  position: relative;

  &--success {
    background-color: var(--color-primary-bg);
  }

  &--warning {
    background-color: #fef3c7;
  }

  &--info {
    background-color: #dbeafe;
  }
}

.timeline-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  .timeline-dot--success & {
    background-color: var(--color-primary);
  }

  .timeline-dot--warning & {
    background-color: var(--color-warning);
  }

  .timeline-dot--info & {
    background-color: #3b82f6;
  }
}

.timeline-content {
  flex: 1;
}

.timeline-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0 0 4px 0;

  :deep(.text-emerald-600) {
    color: var(--color-primary-dark) !important;
    font-weight: 700 !important;
  }

  :deep(.text-amber-600) {
    color: #d97706 !important;
    font-weight: 700 !important;
  }

  :deep(.text-blue-600) {
    color: #2563eb !important;
    font-weight: 700 !important;
  }

  :deep(strong) {
    font-weight: 700;
  }
}

.timeline-time {
  font-size: 10px;
  color: #cbd5e1;
  text-transform: uppercase;
  display: inline-block;
  margin-top: 4px;
}

.assistant-content {
  position: relative;
  z-index: 10;
}

.assistant-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #fff;
}

.assistant-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  margin: 0 0 24px 0;
}

.assistant-btn {
  width: 100%;
  padding: 12px;
  background-color: #fff;
  color: var(--color-primary-dark);
  font-weight: 700;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #ecfdf5;
  }
}

.assistant-footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: rgba(209, 213, 219, 1);
}

.assistant-avatar-group {
  display: flex;
  gap: 0;

  .assistant-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.3);
    border: 2px solid var(--color-primary-light);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    margin-left: -8px;

    &:first-child {
      margin-left: 0;
    }
  }
}

.assistant-hint {
  font-size: 12px;
  white-space: nowrap;
}

.assistant-bg-icon {
  position: absolute;
  right: -32px;
  bottom: -32px;
  width: 12rem;
  height: 12rem;
  opacity: 0.1;
  transform: rotate(12deg);
  color: currentColor;
  pointer-events: none;
}
</style>
