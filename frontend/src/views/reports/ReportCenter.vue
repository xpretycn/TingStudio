<template>
  <div class="report-center" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <div :key="initialized ? 'content' : 'skeleton'">
        <PageSkeleton v-if="!initialized && !loadError" type="cards" :rows="6" />

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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
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

            <div class="report-content-area">
              <div class="data-center-toolbar">
                <Transition name="batch-bar-slide">
                  <div v-if="selectedReports.length > 0" class="batch-action-bar">
                    <div class="batch-info">
                      <span class="batch-count"><strong>{{ selectedReports.length }}</strong> 项已选择</span>
                      <div class="batch-divider"></div>
                      <div class="batch-buttons">
                        <button v-if="selectedReports.length === 2" class="batch-action-btn batch-action-btn--compare"
                          @click="handleCompare">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="7" height="7" rx="1" />
                            <rect x="14" y="14" width="7" height="7" rx="1" />
                            <line x1="14" y1="10.5" x2="10" y2="10.5" />
                            <line x1="10" y1="10.5" x2="10" y2="14" />
                            <line x1="10" y1="10.5" x2="14" y2="10.5" />
                            <line x1="14" y1="10.5" x2="14" y2="14" />
                          </svg>
                          对比报告
                        </button>
                        <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedReports.length} 个报告吗？删除后无法恢复。`"
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
                        <button class="batch-action-btn" @click="handleBatchArchive">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 8v13H3V8" />
                            <rect x="1" y="3" width="22" height="5" rx="2" />
                          </svg>
                          批量归档
                        </button>
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
                    <h3 class="toolbar-title">报告管理中心</h3>
                    <p class="toolbar-subtitle">查看和管理周报与月报，掌握业务全貌</p>
                  </div>
                </div>

                <div class="toolbar-right-section">
                  <div class="toolbar-filters">
                    <t-select v-model="filterStatus" :options="statusOptions" placeholder="报告状态" size="small"
                      :popup-props="{ attach: 'body' }" style="width: 120px" @change="handleFilter">
                      <template #prefixIcon>
                        <t-icon name="check-circle" style="font-size: 16px" />
                      </template>
                    </t-select>
                    <t-select v-model="filterType" :options="typeOptions" placeholder="报告类型" size="small"
                      :popup-props="{ attach: 'body' }" style="width: 120px" @change="handleFilter">
                      <template #prefixIcon>
                        <t-icon name="view-list" style="font-size: 16px" />
                      </template>
                    </t-select>
                    <t-date-range-picker :value="filterDateRange" mode="date" size="small" placeholder="选择日期范围"
                      clearable :popup-props="{ attach: 'body' }" @change="onDateRangeChange" />
                  </div>
                  <div class="search-container" role="search">
                    <label for="report-search-input" class="sr-only">搜索报告</label>
                    <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                      aria-hidden="true">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <t-input id="report-search-input" v-model="searchKeyword" class="search-input"
                      placeholder="搜索报告标题..." clearable aria-label="按报告标题搜索" />
                  </div>
                  <button class="add-report-btn" @click="handleGenerateWeekly" aria-label="生成周报">
                    <t-icon name="add" class="add-icon" />
                    生成周报
                  </button>
                  <button class="add-report-btn add-report-btn--monthly" @click="handleGenerateMonthly"
                    aria-label="生成月报">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                    生成月报
                  </button>
                  <button class="filter-btn" aria-label="筛选报告" aria-haspopup="true">
                    <t-icon name="filter" class="filter-icon" />
                    <span class="filter-dot"
                      v-if="filterType !== 'all' || filterStatus !== 'all' || filterDateRange.length > 0"></span>
                  </button>
                </div>
              </div>

              <EmptyState v-if="reportStore.reports.length === 0 && !reportStore.loading" title="暂无报告"
                description="还没有生成任何报告，点击上方按钮开始生成周报或月报">
                <template #action>
                  <button class="add-report-btn" @click="handleGenerateWeekly">
                    <t-icon name="add" class="add-icon" />
                    生成第一份报告
                  </button>
                </template>
              </EmptyState>

              <div v-else class="report-grid-grouped">
                <div v-for="group in groupedReports" :key="group.monthKey" class="report-month-group">
                  <div class="month-group-header">
                    <div class="month-label-wrap">
                      <span class="month-dot"></span>
                      <span class="month-label">{{ group.monthLabel }}</span>
                    </div>
                    <span class="month-count">{{ group.monthlyReports.length + group.weeklyReports.length }} 份</span>
                  </div>
                  <div class="month-group-content">
                    <div class="monthly-column">
                      <div v-for="report in group.monthlyReports" :key="report.id" class="report-list-card"
                        :class="{ 'report-list-card--selected': selectedReportIds.includes(report.id) }"
                        @click="handleCardClick(report)">
                        <div class="card-checkbox" @click.stop="toggleSelect(report)">
                          <svg v-if="selectedReportIds.includes(report.id)" width="18" height="18" viewBox="0 0 24 24"
                            fill="#059669" stroke="#059669" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <polyline points="20 6 9 17 4 12" stroke="#fff" stroke-width="2.5" fill="none" />
                          </svg>
                          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1"
                            stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                          </svg>
                        </div>
                        <div class="card-header">
                          <span class="type-badge" :class="`type-badge--${report.type}`">
                            {{ report.type === 'weekly' ? '周报' : '月报' }}
                          </span>
                          <span class="status-badge" :class="`status-badge--${report.status}`">
                            {{ statusLabel(report.status) }}
                          </span>
                        </div>
                        <h3 class="card-title">{{ report.title }}</h3>
                        <p class="card-period">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {{ formatDate(report.periodStart) }} - {{ formatDate(report.periodEnd) }}
                        </p>
                        <div class="card-footer">
                          <span class="card-creator">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {{ report.creatorName || '系统' }}
                          </span>
                          <span class="card-time">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {{ formatTimeAgo(report.createdAt) }}
                          </span>
                        </div>
                      </div>
                      <div v-if="group.monthlyReports.length === 0" class="column-empty"
                        :class="{ 'column-empty--loading': generatingType === `monthly-${group.monthKey}`, 'column-empty--error': generateError && generateErrorKey === `monthly-${group.monthKey}` }"
                        @click="handleGenerateForMonth('monthly', group.monthKey)">
                        <template v-if="generatingType === `monthly-${group.monthKey}`">
                          <svg class="column-empty-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          <span>正在生成月报...</span>
                        </template>
                        <template v-else-if="generateError && generateErrorKey === `monthly-${group.monthKey}`">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          <span>生成失败，点击重试</span>
                        </template>
                        <template v-else>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <span>点击生成月报</span>
                        </template>
                      </div>
                    </div>
                    <div class="weekly-column">
                      <div v-for="report in group.weeklyReports" :key="report.id" class="report-list-card"
                        :class="{ 'report-list-card--selected': selectedReportIds.includes(report.id) }"
                        @click="handleCardClick(report)">
                        <div class="card-checkbox" @click.stop="toggleSelect(report)">
                          <svg v-if="selectedReportIds.includes(report.id)" width="18" height="18" viewBox="0 0 24 24"
                            fill="#059669" stroke="#059669" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                            <polyline points="20 6 9 17 4 12" stroke="#fff" stroke-width="2.5" fill="none" />
                          </svg>
                          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1"
                            stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="4" />
                          </svg>
                        </div>
                        <div class="card-header">
                          <span class="type-badge" :class="`type-badge--${report.type}`">
                            {{ report.type === 'weekly' ? '周报' : '月报' }}
                          </span>
                          <span class="status-badge" :class="`status-badge--${report.status}`">
                            {{ statusLabel(report.status) }}
                          </span>
                        </div>
                        <h3 class="card-title">{{ report.title }}</h3>
                        <p class="card-period">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                            <line x1="16" y1="2" x2="16" y2="6" />
                            <line x1="8" y1="2" x2="8" y2="6" />
                            <line x1="3" y1="10" x2="21" y2="10" />
                          </svg>
                          {{ formatDate(report.periodStart) }} - {{ formatDate(report.periodEnd) }}
                        </p>
                        <div class="card-footer">
                          <span class="card-creator">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                            {{ report.creatorName || '系统' }}
                          </span>
                          <span class="card-time">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {{ formatTimeAgo(report.createdAt) }}
                          </span>
                        </div>
                      </div>
                      <div v-if="group.weeklyReports.length === 0" class="column-empty"
                        :class="{ 'column-empty--loading': generatingType === `weekly-${group.monthKey}`, 'column-empty--error': generateError && generateErrorKey === `weekly-${group.monthKey}` }"
                        @click="handleGenerateForMonth('weekly', group.monthKey)">
                        <template v-if="generatingType === `weekly-${group.monthKey}`">
                          <svg class="column-empty-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                          </svg>
                          <span>正在生成周报...</span>
                        </template>
                        <template v-else-if="generateError && generateErrorKey === `weekly-${group.monthKey}`">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="15" y1="9" x2="9" y2="15" />
                            <line x1="9" y1="9" x2="15" y2="15" />
                          </svg>
                          <span>生成失败，点击重试</span>
                        </template>
                        <template v-else>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          <span>点击生成周报</span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="reportStore.total > 0" class="table-pagination">
                <div class="pagination-info">
                  显示第 {{ (reportStore.currentPage - 1) * reportStore.pageSize + 1 }}-{{ Math.min(reportStore.currentPage
                    *
                    reportStore.pageSize, reportStore.total) }} 条，共 {{ reportStore.total }} 条数据
                </div>
                <div class="pagination-controls">
                  <button class="pagination-btn" :class="{ 'pagination-btn--disabled': reportStore.currentPage === 1 }"
                    :disabled="reportStore.currentPage === 1" @click="goPage(reportStore.currentPage - 1)">上一页</button>
                  <template v-for="page in pageNumbers" :key="page">
                    <button v-if="page !== '...'" class="pagination-btn"
                      :class="{ 'pagination-btn--active': page === reportStore.currentPage }"
                      @click="typeof page === 'number' && goPage(page)">{{ page }}</button>
                    <span v-else class="pagination-ellipsis">...</span>
                  </template>
                  <button class="pagination-btn"
                    :class="{ 'pagination-btn--disabled': reportStore.currentPage === totalPages }"
                    :disabled="reportStore.currentPage === totalPages"
                    @click="goPage(reportStore.currentPage + 1)">下一页</button>
                </div>
              </div>
            </div>

            <section class="activity-section">
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
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span class="activity-nav-page">{{ activityPage }} / {{ activityTotalPages }}</span>
                    <button class="activity-nav-btn" :disabled="activityPage >= activityTotalPages"
                      @click="activityNext" title="下一页">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
              <div class="activity-card activity-card--assistant">
                <div class="assistant-header">
                  <h4 class="assistant-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                    报告师小助手
                  </h4>
                  <div class="assistant-nav" v-if="todoTotalPages > 1">
                    <button class="activity-nav-btn" :disabled="todoPage <= 1" @click="todoPrev" title="上一页">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <span class="activity-nav-page">{{ todoPage }} / {{ todoTotalPages }}</span>
                    <button class="activity-nav-btn" :disabled="todoPage >= todoTotalPages" @click="todoNext"
                      title="下一页">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="todo-list" v-if="paginatedTodoItems.length > 0">
                  <div class="todo-list__inner">
                    <div v-for="(item, idx) in paginatedTodoItems" :key="item.id" class="todo-item"
                      :class="'todo-item--' + item.priority">
                      <div class="todo-item__icon" :class="'todo-item__icon--' + item.type">
                        <svg v-if="item.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path
                            d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <svg v-else-if="item.type === 'info'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                        </svg>
                      </div>
                      <div class="todo-item__content">
                        <p class="todo-item__title">{{ item.title }}</p>
                        <p class="todo-item__desc">{{ item.desc }}</p>
                      </div>
                      <button class="todo-item__action" @click="handleTodoAction(item)" :title="item.actionText">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div class="assistant-empty" v-else>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  <p>太棒了！暂无待处理事项</p>
                  <span>所有报告状态正常，继续保持~</span>
                </div>
                <div class="assistant-footer">
                  <span class="assistant-hint">{{ reportStore.total }} 份报告在库 · 共 {{ displayTodoItems.length }}
                    项待办</span>
                  <button class="assistant-refresh-btn" @click="refreshTodo" title="刷新">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                </div>
                <svg class="assistant-bg-icon" width="140" height="140" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
            </section>
          </template>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useReportStore } from '@/stores/report';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Report } from '@/api/report';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import EmptyState from '@/components/EmptyState.vue';

const router = useRouter();
const reportStore = useReportStore();

const initialized = ref(false);
const loadError = ref('');

const filterType = ref<string>('all');
const filterStatus = ref<string>('all');
const filterDateRange = ref<string[]>([]);
const searchKeyword = ref('');

const onDateRangeChange = (val: string[] | string) => {
  if (Array.isArray(val)) {
    filterDateRange.value = val;
  } else {
    filterDateRange.value = [];
  }
  handleFilter();
};

const selectedReportIds = ref<string[]>([]);
const selectedReports = ref<Report[]>([]);

const typeOptions = [
  { label: '全部类型', value: 'all' },
  { label: '周报', value: 'weekly' },
  { label: '月报', value: 'monthly' },
];

const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' },
];

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };
  return map[status] || status;
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

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

const totalPages = computed(() => Math.ceil(reportStore.total / reportStore.pageSize) || 1);

const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = reportStore.currentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

const goPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  reportStore.currentPage = page;
  loadData();
};

const loadData = async () => {
  loadError.value = '';
  try {
    const params: Record<string, any> = {
      page: reportStore.currentPage,
      pageSize: reportStore.pageSize,
    };
    if (filterType.value && filterType.value !== 'all') params.type = filterType.value;
    if (filterStatus.value && filterStatus.value !== 'all') params.status = filterStatus.value;
    if (filterDateRange.value && filterDateRange.value.length === 2) {
      params.startDate = filterDateRange.value[0];
      params.endDate = filterDateRange.value[1];
    }
    await reportStore.fetchReports(params);
  } catch (e: any) {
    loadError.value = e.message || '加载失败，请稍后重试';
  }
};

const retryLoad = async () => {
  loadError.value = '';
  await loadData();
};

const handleFilter = () => {
  reportStore.currentPage = 1;
  loadData();
};

const handleCardClick = (report: Report) => {
  const path = report.type === 'weekly'
    ? `/reports/weekly/${report.id}`
    : `/reports/monthly/${report.id}`;
  router.push(path);
};

const handleGenerateWeekly = () => {
  router.push({ path: '/reports/generate', query: { type: 'weekly' } });
};

const handleGenerateMonthly = () => {
  router.push({ path: '/reports/generate', query: { type: 'monthly' } });
};

const generatingType = ref('');
const generateError = ref('');
const generateErrorKey = ref('');

const handleGenerateForMonth = async (type: 'weekly' | 'monthly', monthKey: string) => {
  const key = `${type}-${monthKey}`;
  if (generatingType.value) return;
  generatingType.value = key;
  generateError.value = '';
  generateErrorKey.value = '';
  try {
    const [yearStr, monthStr] = monthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    let periodStart: string;
    let periodEnd: string;
    if (type === 'monthly') {
      periodStart = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    } else {
      const now = new Date();
      const dayOfWeek = now.getDay() || 7;
      const monday = new Date(now);
      monday.setDate(now.getDate() - dayOfWeek + 1);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      periodStart = fmt(monday);
      periodEnd = fmt(sunday);
    }
    const result = await reportStore.generateReport({
      type,
      periodStart,
      periodEnd,
    });
    if (result) {
      MessagePlugin.success(`${type === 'weekly' ? '周报' : '月报'}生成成功`);
      await loadData();
    }
  } catch (e: any) {
    generateError.value = e.message || '生成失败';
    generateErrorKey.value = key;
    MessagePlugin.error(generateError.value);
  } finally {
    generatingType.value = '';
  }
};

const toggleSelect = (report: Report) => {
  const idx = selectedReportIds.value.indexOf(report.id);
  if (idx >= 0) {
    selectedReportIds.value.splice(idx, 1);
    selectedReports.value = selectedReports.value.filter(r => r.id !== report.id);
  } else {
    selectedReportIds.value.push(report.id);
    selectedReports.value.push(report);
  }
};

const clearSelection = () => {
  selectedReportIds.value = [];
  selectedReports.value = [];
};

const handleBatchDelete = async () => {
  if (selectedReports.value.length === 0) return;
  const count = selectedReports.value.length;
  let successCount = 0;
  for (const report of selectedReports.value) {
    const ok = await reportStore.deleteReport(report.id);
    if (ok) successCount++;
  }
  MessagePlugin.success(`成功删除 ${successCount}/${count} 个报告`);
  clearSelection();
  await loadData();
};

const handleBatchArchive = async () => {
  if (selectedReports.value.length === 0) return;
  let successCount = 0;
  for (const report of selectedReports.value) {
    if (report.status !== 'archived') {
      const res = await reportStore.updateReport(report.id, { status: 'archived' });
      if (res) successCount++;
    }
  }
  MessagePlugin.success(`已归档 ${successCount} 个报告`);
  clearSelection();
  await loadData();
};

const handleBatchExport = () => {
  if (selectedReports.value.length === 0) return;
  MessagePlugin.success(`已选择 ${selectedReports.value.length} 个报告进行导出`);
  clearSelection();
};

const handleCompare = () => {
  if (selectedReports.value.length !== 2) return;
  const [a, b] = selectedReports.value;
  router.push({ path: '/reports/compare', query: { id1: a.id, id2: b.id } });
  clearSelection();
};

const ACTIVITY_PAGE_SIZE = 4;
const TODO_PAGE_SIZE = 3;

const dashboardCards = computed(() => {
  const total = reportStore.total ?? 0;
  const reports = reportStore.reports;
  const weeklyCount = reports.filter(r => r.type === 'weekly').length;
  const monthlyCount = reports.filter(r => r.type === 'monthly').length;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthCount = reports.filter(r => r.createdAt && r.createdAt.startsWith(thisMonth)).length;
  return [
    {
      label: '报告总数',
      value: total.toString(),
      unit: '份',
      badge: total > 0 ? `${total} 份` : '--',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>',
    },
    {
      label: '周报数量',
      value: weeklyCount.toString(),
      unit: '份',
      badge: weeklyCount > 0 ? `本周${weeklyCount}` : '持平',
      badgeColor: weeklyCount > 0 ? '#10B981' : '#94A3B8',
      badgeBg: weeklyCount > 0 ? '#ECFDF5' : '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    },
    {
      label: '月报数量',
      value: monthlyCount.toString(),
      unit: '份',
      badge: monthlyCount > 0 ? `本月${monthlyCount}` : '持平',
      badgeColor: monthlyCount > 0 ? '#10B981' : '#94A3B8',
      badgeBg: monthlyCount > 0 ? '#ECFDF5' : '#F1F5F9',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
    {
      label: '本月生成',
      value: thisMonthCount.toString(),
      unit: '份',
      badge: thisMonthCount > 0 ? `+${thisMonthCount}` : '--',
      badgeColor: thisMonthCount > 0 ? '#10B981' : '#94A3B8',
      badgeBg: thisMonthCount > 0 ? '#ECFDF5' : '#F1F5F9',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    },
  ];
});

const groupedReports = computed(() => {
  const reports = reportStore.reports;
  const groupMap = new Map<string, { monthKey: string; monthLabel: string; monthlyReports: Report[]; weeklyReports: Report[]; }>();
  for (const report of reports) {
    const date = new Date(report.periodStart);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groupMap.has(monthKey)) {
      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
      groupMap.set(monthKey, {
        monthKey,
        monthLabel: `${date.getFullYear()}年${monthNames[date.getMonth()]}`,
        monthlyReports: [],
        weeklyReports: [],
      });
    }
    const group = groupMap.get(monthKey)!;
    if (report.type === 'monthly') {
      group.monthlyReports.push(report);
    } else {
      group.weeklyReports.push(report);
    }
  }
  return Array.from(groupMap.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
});

const activityPage = ref(1);
const activityList = computed(() => {
  const items = allActivityItems.value;
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return items.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const allActivityItems = computed(() => {
  const items: { type: string; title: string; desc: string; time: string; }[] = [];
  const reports = reportStore.reports;
  for (const r of reports) {
    const typeLabel = r.type === 'weekly' ? '周报' : '月报';
    const statusLabel = r.status === 'published' ? '已发布' : r.status === 'draft' ? '草稿' : '已归档';
    const dotType = r.status === 'published' ? 'success' : r.status === 'draft' ? 'info' : 'warning';
    items.push({
      type: dotType,
      title: `${typeLabel}生成`,
      desc: `<strong class="text-emerald-600">${r.title || typeLabel}</strong> 已生成，状态：<strong>${statusLabel}</strong>`,
      time: formatTimeAgo(r.createdAt),
    });
  }
  return items.slice(0, 20);
});

const todoPage = ref(1);
const displayTodoItems = computed(() => {
  const items: { id: string; type: string; priority: string; title: string; desc: string; actionText: string; action: string; }[] = [];
  const reports = reportStore.reports;
  const draftReports = reports.filter(r => r.status === 'draft');
  for (const r of draftReports) {
    const typeLabel = r.type === 'weekly' ? '周报' : '月报';
    items.push({
      id: `draft-${r.id}`,
      type: 'warning',
      priority: 'high',
      title: `${typeLabel}待发布`,
      desc: `「${r.title || typeLabel}」当前为草稿状态，请审核后发布`,
      actionText: '去发布',
      action: 'publish',
    });
  }
  if (reports.length === 0) {
    items.push({
      id: 'create-first',
      type: 'info',
      priority: 'medium',
      title: '创建首份报告',
      desc: '还没有生成任何报告，点击生成第一份周报或月报',
      actionText: '去生成',
      action: 'generate',
    });
  }
  if (reports.length > 0) {
    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay() + 1);
    const hasThisWeekWeekly = reports.some(r => r.type === 'weekly' && new Date(r.periodStart) <= thisWeekStart && new Date(r.periodEnd) >= thisWeekStart);
    if (!hasThisWeekWeekly) {
      items.push({
        id: 'weekly-missing',
        type: 'default',
        priority: 'medium',
        title: '本周周报未生成',
        desc: '本周还没有生成周报，建议及时生成',
        actionText: '去生成',
        action: 'generate-weekly',
      });
    }
  }
  return items;
});
const paginatedTodoItems = computed(() => {
  const start = (todoPage.value - 1) * TODO_PAGE_SIZE;
  return displayTodoItems.value.slice(start, start + TODO_PAGE_SIZE);
});
const todoTotalPages = computed(() => Math.max(1, Math.ceil(displayTodoItems.value.length / TODO_PAGE_SIZE)));
const todoPrev = () => { if (todoPage.value > 1) todoPage.value--; };
const todoNext = () => { if (todoPage.value < todoTotalPages.value) todoPage.value++; };
const refreshTodo = () => { todoPage.value = 1; };

const handleTodoAction = (item: any) => {
  if (item.action === 'generate' || item.action === 'generate-weekly') {
    handleGenerateWeekly();
  } else if (item.action === 'publish') {
    const report = reportStore.reports.find(r => `draft-${r.id}` === item.id);
    if (report) {
      handleCardClick(report);
    }
  }
};

onMounted(async () => {
  try {
    await loadData();
  } catch (e: any) {
    loadError.value = e.message || '初始化失败';
  } finally {
    initialized.value = true;
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.report-center {
  padding: 0;
  animation: page-fade-in 0.4s ease;
}

.page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.report-content-area {
  position: relative;
  background: #fff;
  border-radius: 24px;
  border: 1px solid #F8FAFC;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.data-center-toolbar {
  padding: 24px 32px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  position: relative;
  background: linear-gradient(180deg, #f8fafc 0%, #fff 100%);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);

  .toolbar-left-section {
    flex: 1;
    min-width: 240px;

    .toolbar-title-section {
      .toolbar-title {
        font-size: 20px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 4px 0;
      }

      .toolbar-subtitle {
        font-size: 14px;
        color: #94a3b8;
        margin: 0;
      }
    }
  }

  .toolbar-right-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
    flex-wrap: wrap;
  }

  .toolbar-filters {
    display: flex;
    align-items: center;
    gap: 8px;

    :deep(.t-date-range-picker) {
      width: 280px;

      .t-range-input {
        width: 100%;
        background-color: #f8fafc;
        border: 1px solid transparent !important;
        border-radius: 12px;
        font-size: 14px;

        &:hover {
          border-color: #d1d5db !important;
        }

        &:focus-within {
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
          background-color: #fff;
          border-color: #10b981 !important;
        }
      }

      .t-range-input__inner {
        width: 100%;
      }

      .t-input__wrap {
        flex: 1;
        min-width: 0;
      }

      .t-input__inner {
        width: 100%;
      }

      .t-input {
        background-color: transparent;
        border: none !important;
        font-size: 14px;
      }
    }

    :deep(.t-select) {
      .t-input {
        background-color: #f8fafc;
        border: 1px solid transparent !important;
        border-radius: 12px;
        font-size: 14px;

        &:hover {
          border-color: #d1d5db !important;
        }

        &:focus-within {
          box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
          background-color: #fff;
          border-color: #10b981 !important;
        }
      }
    }
  }

  .search-container {
    position: relative;

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      font-size: 16px;
      z-index: 1;
      pointer-events: none;
    }

    .search-input {
      :deep(.t-input) {
        padding-left: 40px;
        padding-right: 16px;
        padding-top: 8px;
        padding-bottom: 8px;
        background-color: #f8fafc;
        border: none !important;
        border-radius: 12px;
        font-size: 14px;
        transition: all $transition-fast;
        width: 256px;

        &:focus {
          box-shadow: 0 0 0 2px rgba(167, 243, 208, 0.50);
          outline: none;
          background-color: #fff;
        }

        &::placeholder {
          color: #94a3b8;
        }
      }
    }
  }

  .add-report-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background-color: #1e293b;
    color: white;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 500;
    transition: all $transition-fast;
    box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15);
    border: none;
    cursor: pointer;

    &:hover {
      background-color: #334155;
    }

    &:active {
      background-color: #0f172a;
      transform: translateY(0);
    }

    &:focus-visible {
      outline: 2px solid #475569;
      outline-offset: 2px;
    }

    .add-icon {
      font-size: 18px;
      transition: transform 0.2s;
    }

    &:hover .add-icon {
      transform: rotate(90deg);
    }

    &--monthly {
      &:hover .add-icon {
        transform: none;
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  .filter-btn {
    position: relative;
    padding: 8px;
    color: #94a3b8;
    background-color: transparent;
    border: 1px solid #f1f5f9;
    border-radius: 8px;
    transition: all $transition-fast;
    cursor: pointer;

    &:hover {
      background-color: #f8fafc;
    }

    .filter-icon {
      font-size: 20px;
    }

    .filter-dot {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background-color: #10b981;
      border-radius: 50%;
      border: 2px solid white;
      transition: opacity 0.2s;
    }

    &:hover .filter-dot {
      opacity: 1;
    }
  }
}

.report-grid-grouped {
  padding: 24px;
  transition: padding-top $transition-normal;
  box-shadow: inset 0 2px 4px rgba(15, 23, 42, 0.03);
}

.report-month-group {
  margin-bottom: 36px;

  &:last-child {
    margin-bottom: 0;
  }
}

.month-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0 4px;
}

.month-label-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.month-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10B981, #059669);
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

.month-label {
  font-size: 17px;
  font-weight: 700;
  color: #1E293B;
  letter-spacing: 0.02em;
}

.month-count {
  font-size: 13px;
  color: #94A3B8;
  font-weight: 500;
}

.month-group-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;

  @media (max-width: 1024px) {
    flex-direction: column;
  }
}

.monthly-column {
  flex-shrink: 0;
  width: 340px;
  display: flex;
  flex-direction: column;
  gap: 20px;

  @media (max-width: 1024px) {
    width: 100%;
  }
}

.weekly-column {
  flex: 1;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, 340px);
  gap: 20px;

  @media (max-width: 1024px) {
    width: 100%;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.column-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 180px;
  border: 2px dashed #E2E8F0;
  border-radius: 24px;
  color: #94A3B8;
  font-size: 14px;
  background: #FAFBFC;
  cursor: pointer;
  transition: all $transition-normal;

  &:hover {
    border-color: #10B981;
    background: rgba(16, 185, 129, 0.04);
    color: #059669;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  &--loading {
    pointer-events: none;
    border-color: #10B981;
    background: rgba(16, 185, 129, 0.04);
    color: #059669;

    .column-empty-spinner {
      animation: spin 1s linear infinite;
    }
  }

  &--error {
    border-color: #FCA5A5;
    background: #FEF2F2;
    color: #EF4444;

    &:hover {
      border-color: #EF4444;
      background: #FEE2E2;
      color: #DC2626;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.report-list-card {
  position: relative;
  background: #fff;
  border: 1px solid #F1F5F9;
  border-radius: 24px;
  padding: 24px;
  cursor: pointer;
  transition: all $transition-normal;
  animation: dashboard-fade-in 0.5s ease both;

  &:hover {
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    border-color: #E2E8F0;
    transform: translateY(-2px);
  }

  &--selected {
    border-color: #10B981;
    background: rgba(209, 250, 229, 0.15);
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.15);
  }

  .card-checkbox {
    position: absolute;
    top: 16px;
    right: 16px;
    cursor: pointer;
    z-index: 2;
    opacity: 0;
    transition: opacity $transition-fast;

    svg {
      display: block;
    }
  }

  &:hover .card-checkbox,
  &--selected .card-checkbox {
    opacity: 1;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 6px;
    font-size: $font-size-caption;
    font-weight: $font-weight-bold;
    letter-spacing: $ls-caption;

    &--weekly {
      background: #DBEAFE;
      color: #2563EB;
    }

    &--monthly {
      background: #FEF3C7;
      color: #D97706;
    }
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 6px;
    font-size: $font-size-caption;
    font-weight: $font-weight-semibold;
    letter-spacing: $ls-caption;

    &--draft {
      background: #F1F5F9;
      color: #64748B;
    }

    &--published {
      background: #D1FAE5;
      color: #059669;
    }

    &--archived {
      background: #FEE2E2;
      color: #DC2626;
    }
  }

  .card-title {
    font-size: $font-size-h3;
    font-weight: $font-weight-bold;
    color: #1E293B;
    margin: 0 0 10px;
    letter-spacing: $ls-heading;
    line-height: $line-height-tight;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-period {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: $font-size-body-sm;
    color: #94A3B8;
    margin: 0 0 16px;
    letter-spacing: $ls-caption;

    svg {
      flex-shrink: 0;
    }
  }

  .card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 14px;
    border-top: 1px solid #F8FAFC;

    .card-creator,
    .card-time {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: $font-size-caption;
      color: #94A3B8;
      letter-spacing: $ls-caption;

      svg {
        flex-shrink: 0;
      }
    }
  }
}

@keyframes dashboard-fade-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.table-pagination {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-top: 1px solid #f8fafc;

  .pagination-info {
    font-size: $font-size-body;
    color: #94a3b8;
    font-weight: $font-weight-regular;
    white-space: nowrap;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .pagination-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: $radius-md;
    background-color: transparent;
    color: $text-regular;
    font-size: $font-size-body;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: $emerald-50;
      border-color: $emerald-400;
      color: $emerald-600;
    }

    &:active:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: $emerald-100;
      border-color: $emerald-500;
      color: $emerald-600;
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      color: $text-placeholder;
      background-color: transparent;
      border-color: #e2e8f0;
      pointer-events: none;
    }

    &.pagination-btn--active {
      background-color: $emerald-500;
      color: #fff;
      border-color: $emerald-500;
      font-weight: $font-weight-semibold;
      box-shadow: 0 1px 3px $overlay-emerald-25;
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
    font-size: $font-size-body;
    user-select: none;
  }
}

.batch-action-bar {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background-color: #059669;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  box-shadow: 0 4px 18px rgba(5, 150, 105, 0.25);

  .batch-info {
    display: flex;
    align-items: center;
    gap: 24px;

    .batch-count {
      font-weight: $font-weight-bold;
      font-size: $font-size-body;

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
      font-size: $font-size-body;
      font-weight: $font-weight-medium;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: $radius-sm;
      transition: all $transition-fast;

      &:hover {
        color: #d1fae5;
      }

      svg {
        width: 14px;
        height: 14px;
        stroke-width: 2;
      }
    }

    .batch-action-btn--compare {
      color: #fbbf24;

      &:hover {
        color: #fcd34d;
        background: rgba(251, 191, 36, 0.15);
      }
    }
  }

  .batch-cancel-btn {
    font-size: $font-size-body;
    font-weight: $font-weight-medium;
    border: 1px solid #34d399;
    padding: 4px 12px;
    border-radius: $radius-md;
    background: transparent;
    color: #fff;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background-color: #047857;
    }
  }
}

.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: all $transition-slow;
}

.batch-bar-slide-enter-from,
.batch-bar-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.batch-bar-slide-enter-to,
.batch-bar-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  text-align: center;

  .error-icon {
    margin-bottom: 16px;
  }

  .error-title {
    font-size: $font-size-h2;
    font-weight: $font-weight-bold;
    color: #1E293B;
    margin: 0 0 8px;
  }

  .error-desc {
    font-size: $font-size-body;
    color: #94A3B8;
    margin: 0 0 24px;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 20px;
    background-color: #1E293B;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-size: $font-size-body;
    font-weight: $font-weight-semibold;
    cursor: pointer;
    transition: all $transition-normal;

    &:hover {
      background-color: #334155;
    }
  }
}

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.3s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
  margin-bottom: 30px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }

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

.activity-section {
  margin-top: 30px;
  padding-bottom: 32px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
}

.activity-card {
  background-color: #fff;
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid #f8fafc;

  &--assistant {
    background: #fff;
    border: 1px solid #f8fafc;
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
  color: #1e293b;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.activity-nav {
  display: flex;
  align-items: center;
  gap: 6px;

  .activity-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid rgba(16, 185, 129, 0.2);
    background: rgba(16, 185, 129, 0.04);
    color: #10b981;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: rgba(16, 185, 129, 0.12);
      border-color: #10b981;
      color: #059669;
    }

    &:active:not(:disabled) {
      transform: scale(0.94);
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
    color: #94a3b8;
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
    background-color: #d1fae5;
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
    background-color: #10b981;
  }

  .timeline-dot--warning & {
    background-color: #f59e0b;
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
  color: #334155;
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 12px;
  color: #94a3b8;
  margin: 0 0 4px 0;

  :deep(.text-emerald-600) {
    color: #059669 !important;
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

.assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -32px -32px 16px -32px;
  padding: 20px 24px;
  background: linear-gradient(135deg, #10B981, #059669);
  border-radius: 24px 24px 0 0;

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

.assistant-nav {
  display: flex;
  align-items: center;
  gap: 6px;

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
    gap: 10px;
  }
}

.todo-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 14px;
  border: 1px solid #f1f5f9;
  transition: all 0.25s ease;
  cursor: default;
  animation: todoSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;

  &:hover {
    background: #f1f5f9;
    border-color: #e2e8f0;
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
      color: #475569;
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
    color: #1e293b;
    margin: 0 0 3px 0;
    line-height: 1.3;
  }

  &__desc {
    font-size: 12px;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
  }

  &__action {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: 1.5px solid #E2E8F0;
    background: #fff;
    color: #64748b;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: linear-gradient(135deg, #10B981, #059669);
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
  padding: 36px 20px 24px;

  svg {
    margin-bottom: 12px;
    color: #10b981;
    stroke: #10b981;
  }

  p {
    font-size: 15px;
    font-weight: 600;
    color: #0F172A;
    margin: 0 0 6px 0;
  }

  span {
    font-size: 13px;
    color: #94a3b8;
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
  color: #94a3b8;
}

.assistant-refresh-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1.5px solid #E2E8F0;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #475569;
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
  color: #10b981;
  pointer-events: none;
  z-index: 0;
}
</style>
