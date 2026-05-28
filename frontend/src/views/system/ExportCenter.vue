<template>
  <div class="export-center" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="5" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">导出管理中心</h3>
              <p class="toolbar-subtitle">管理配方导出任务、分享链接、导出模板与配置</p>
            </div>
          </div>
          <div class="toolbar-right-section">
            <div class="search-container">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input v-model="searchKeyword" class="search-input" placeholder="搜索任务名称..." @input="handleSearch"
                @clear="handleSearch" clearable />
            </div>
          </div>
        </div>

        <div class="export-body">
          <div class="export-nav" :class="{ 'export-nav--collapsed': navCollapsed }">
            <div v-for="tab in exportTabs" :key="tab.value" class="nav-tab" :class="{ active: activeTab === tab.value }"
              :title="navCollapsed ? tab.label : ''" role="tab" tabindex="0" @click="switchTab(tab.value)"
              @keydown.enter="switchTab(tab.value)">
              <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" v-html="tab.iconPath"></svg>
              <span class="nav-tab-label">{{ tab.label }}</span>
            </div>
            <button type="button" class="nav-collapse-btn" @click="toggleNavCollapse"
              :title="navCollapsed ? '展开导航' : '折叠导航'" aria-label="切换导航折叠状态">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"
                :style="{ transform: navCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </div>
          <div class="export-content">
            <div class="export-tab-panels">
              <!-- ====== Tab: 仪表盘 ====== -->
              <div v-show="activeTab === 'dashboard'" class="tab-panel">
                <div class="panel-inner">
                  <section class="dashboard-grid">
                    <div v-for="(card, idx) in dashboardCards" :key="card.label" class="stat-card"
                      :style="{ animationDelay: `${(idx + 1) * 0.1}s` }">
                      <div class="stat-card-top">
                        <div class="stat-icon" :style="{ background: card.iconBg, color: card.iconColor }">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                            stroke-linecap="round" stroke-linejoin="round" v-html="card.iconPath"></svg>
                        </div>
                        <span class="stat-badge" :style="{ color: card.badgeColor, background: card.badgeBg }">{{ card.badge }}</span>
                      </div>
                      <p class="stat-label">{{ card.label }}</p>
                      <p class="stat-value">{{ card.value }} <small class="stat-unit">{{ card.unit }}</small></p>
                    </div>
                  </section>

                  <div v-if="isAdmin" class="quick-export-section">
                    <div class="section-header-enhanced">
                      <div class="section-title-group">
                        <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                        </svg>
                        <h4 class="section-title-text">快捷导出</h4>
                      </div>
                    </div>
                    <div class="quick-export-grid">
                      <button class="quick-export-card" @click="handleQuickExport('weekly-report')">
                        <div class="quick-export-icon" style="background: #EFF6FF; color: #3B82F6;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                        </div>
                        <span class="quick-export-label">周报导出</span>
                      </button>
                      <button class="quick-export-card" @click="handleQuickExport('monthly-report')">
                        <div class="quick-export-icon" style="background: #F5F3FF; color: #8B5CF6;">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <span class="quick-export-label">月报导出</span>
                      </button>
                    </div>
                  </div>

                  <div class="activity-card activity-card--timeline" style="margin-top: 24px;">
                    <div class="activity-header">
                      <h4 class="activity-title">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                        </svg>
                        近期导出动态
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
                      <div v-for="(item, index) in pagedActivityItems" :key="index" class="timeline-item"
                        :class="{ 'timeline-item--last': index === pagedActivityItems.length - 1 }">
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

                  <div class="activity-card activity-card--assistant" style="margin-top: 24px;">
                    <div class="assistant-content">
                      <h4 class="assistant-title">导出小助手</h4>
                      <p class="assistant-desc">{{ assistantMessage }}</p>
                      <button class="assistant-btn" @click="activeTab = 'export'">查看导出任务</button>
                      <div class="assistant-footer">
                        <div class="assistant-avatar-group">
                          <span class="assistant-avatar">导</span>
                          <span class="assistant-avatar">出</span>
                          <span class="assistant-avatar">中</span>
                        </div>
                        <span class="assistant-hint">{{ exportStore.jobs?.length || 0 }} 个任务在列</span>
                      </div>
                    </div>
                    <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      stroke-width="1">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                  </div>
                </div>
              </div>

              <!-- ====== Tab: 导出任务 ====== -->
              <div v-show="activeTab === 'export'" class="tab-panel">
                <div class="panel-inner">
                  <div class="filter-section"
                    style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
                    <t-select v-model="filterForm.status" placeholder="任务状态" clearable style="width: 120px"
                      :popup-props="{ appendToBody: true }">
                      <t-option value="completed" label="已完成" />
                      <t-option value="failed" label="失败" />
                      <t-option value="processing" label="处理中" />
                      <t-option value="pending" label="待处理" />
                    </t-select>
                    <t-select v-model="filterForm.dataCategory" placeholder="导出维度" clearable style="width: 130px"
                      :popup-props="{ appendToBody: true }">
                      <t-option value="formula" label="配方" />
                      <t-option value="material" label="原料" />
                      <t-option value="weekly-report" label="周报" />
                      <t-option value="monthly-report" label="月报" />
                    </t-select>
                    <t-input v-model="filterForm.keyword" placeholder="搜索关键词" clearable style="width: 180px" />
                    <t-button theme="primary" @click="applyFilter">查询</t-button>
                    <t-button theme="default" @click="resetFilter">重置</t-button>
                  </div>

                  <div class="table-area">
                    <t-table :data="exportStore.jobs" :columns="jobColumns" :loading="exportStore.loading"
                      row-key="jobId" hover size="small" table-layout="auto">
                      <template #empty>
                        <t-empty description="暂无导出任务" role="status" />
                      </template>
                      <template #status="{ row }">
                        <t-tag :theme="jobStatusTheme(row.status)" variant="light">{{ jobStatusLabel(row.status)
                        }}</t-tag>
                      </template>
                      <template #exportType="{ row }">
                        <t-tag variant="light">{{ row.exportType?.toUpperCase() }}</t-tag>
                      </template>
                      <template #createdAt="{ row }">
                        {{ formatDateTime(row.createdAt) }}
                      </template>
                      <template #operation="{ row }">
                        <t-space :size="6">
                          <button v-if="row.status === 'completed'" class="action-btn action-btn--download"
                            @click="handleDownload(row)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                              <polyline points="7 10 12 15 17 10" />
                              <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                            下载
                          </button>
                          <button v-if="row.status === 'completed' || row.status === 'failed'"
                            class="action-btn action-btn--reexport" :disabled="reExportingId === row.jobId"
                            @click="handleReExport(row)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                            </svg>
                            {{ reExportingId === row.jobId ? '导出中...' : '重新导出' }}
                          </button>
                          <button v-if="row.status === 'failed' && reExportingId !== row.jobId"
                            class="action-btn action-btn--retry" @click="handleRetry(row)">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <polyline points="23 4 23 10 17 10" />
                              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
                            </svg>
                            重试
                          </button>
                        </t-space>
                      </template>
                    </t-table>

                    <div v-if="exportStore.total > 0 && activeTab === 'export'" class="table-pagination">
                      <div class="pagination-info">
                        显示第 {{ (exportStore.currentPage - 1) * exportStore.pageSize + 1 }}-{{
                          Math.min(exportStore.currentPage * exportStore.pageSize, exportStore.total)
                        }} 条，共 {{ exportStore.total }} 条数据
                      </div>
                      <div class="pagination-controls">
                        <button class="pagination-btn"
                          :class="{ 'pagination-btn--disabled': exportStore.currentPage === 1 }"
                          :disabled="exportStore.currentPage === 1"
                          @click="goToPage(exportStore.currentPage - 1)">上一页</button>
                        <template v-for="page in jobPageNumbers" :key="page">
                          <button v-if="page !== '...'" class="pagination-btn"
                            :class="{ 'pagination-btn--active': page === exportStore.currentPage }"
                            @click="typeof page === 'number' && goToPage(page)">{{ page }}</button>
                          <span v-else class="pagination-ellipsis">...</span>
                        </template>
                        <button class="pagination-btn"
                          :class="{ 'pagination-btn--disabled': exportStore.currentPage === jobTotalPages }"
                          :disabled="exportStore.currentPage === jobTotalPages"
                          @click="goToPage(exportStore.currentPage + 1)">下一页</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ====== Tab: 模板管理 ====== -->
              <div v-show="activeTab === 'templates'" class="tab-panel">
                <div class="panel-inner">
                  <div class="create-form-bar create-form-bar--header">
                    <span class="form-bar-title">模板列表</span>
                    <t-button theme="primary" @click="handleOpenTemplateDialog(null)">
                      <template #icon><t-icon name="add" /></template>新增模板
                    </t-button>
                  </div>
                  <div class="table-area">
                    <t-table :data="exportStore.templates" :columns="templateColumns" :loading="exportStore.loading"
                      row-key="templateId" hover size="small" table-layout="auto">
                      <template #empty><t-empty description="暂无模板" role="status" /></template>
                      <template #category="{ row }">
                        <t-tag variant="light" theme="success">{{ categoryLabel(row.category) }}</t-tag>
                      </template>
                      <template #type="{ row }">
                        <t-tag variant="light">{{ row.type?.toUpperCase() }}</t-tag>
                      </template>
                      <template #isDefault="{ row }">
                        <t-tag v-if="row.isDefault" theme="primary" variant="light">默认</t-tag>
                      </template>
                      <template #createdAt="{ row }">
                        {{ formatDateTime(row.createdAt) }}
                      </template>
                      <template #operation="{ row }">
                        <t-space :size="6">
                          <t-button variant="outline" theme="primary" size="small" class="btn-edit"
                            @click="handleOpenTemplateDialog(row)">
                            <template #icon><t-icon name="edit" /></template>编辑
                          </t-button>
                          <t-popconfirm content="确定要删除该模板吗？" @confirm="handleDeleteTemplate(row.templateId)">
                            <t-button variant="outline" theme="danger" size="small" class="btn-delete">
                              <template #icon><t-icon name="delete" /></template>删除
                            </t-button>
                          </t-popconfirm>
                        </t-space>
                      </template>
                    </t-table>

                    <div v-if="exportStore.templateTotal > 0 && activeTab === 'templates'" class="table-pagination">
                      <div class="pagination-info">
                        显示第 {{ (exportStore.templateCurrentPage - 1) * exportStore.templatePageSize + 1 }}-{{
                          Math.min(exportStore.templateCurrentPage * exportStore.templatePageSize,
                            exportStore.templateTotal)
                        }} 条，共 {{ exportStore.templateTotal }} 条数据
                      </div>
                      <div class="pagination-controls">
                        <button class="pagination-btn"
                          :class="{ 'pagination-btn--disabled': exportStore.templateCurrentPage === 1 }"
                          :disabled="exportStore.templateCurrentPage === 1"
                          @click="goToTemplatePage(exportStore.templateCurrentPage - 1)">上一页</button>
                        <template v-for="page in templatePageNumbers" :key="page">
                          <button v-if="page !== '...'" class="pagination-btn"
                            :class="{ 'pagination-btn--active': page === exportStore.templateCurrentPage }"
                            @click="typeof page === 'number' && goToTemplatePage(page)">{{ page }}</button>
                          <span v-else class="pagination-ellipsis">...</span>
                        </template>
                        <button class="pagination-btn"
                          :class="{ 'pagination-btn--disabled': exportStore.templateCurrentPage === templateTotalPages }"
                          :disabled="exportStore.templateCurrentPage === templateTotalPages"
                          @click="goToTemplatePage(exportStore.templateCurrentPage + 1)">下一页</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ====== Tab: 分享管理 ====== -->
              <div v-show="activeTab === 'share'" class="tab-panel">
                <div class="panel-inner">
                  <div class="create-form-bar">
                    <t-form :data="shareForm" layout="inline" @submit="handleCreateShare">
                      <t-form-item label="配方">
                        <t-select v-model="shareForm.formulaId" placeholder="选择配方" filterable clearable
                          :loading="formulaLoading" style="width: 220px" :popup-props="{ appendToBody: true }">
                          <t-option v-for="f in formulaList" :key="f.id" :value="f.id" :label="f.name" />
                        </t-select>
                      </t-form-item>
                      <t-form-item label="密码">
                        <t-input v-model="shareForm.password" placeholder="可选，留空则无需密码" style="width: 160px" />
                      </t-form-item>
                      <t-form-item label="有效期">
                        <t-date-picker v-model="shareForm.expireDate" style="width: 180px" placeholder="可选"
                          :popup-props="{ appendToBody: true }" />
                      </t-form-item>
                      <t-form-item>
                        <button type="submit" class="create-action-btn">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                          </svg>
                          创建分享
                        </button>
                      </t-form-item>
                    </t-form>
                  </div>

                  <div class="table-area">
                    <t-table :data="exportStore.shares" :columns="shareColumns" :loading="exportStore.loading"
                      row-key="shareId" hover size="small" table-layout="auto">
                      <template #empty><t-empty description="暂无分享记录" role="status" /></template>
                      <template #shareUrl="{ row }">
                        <t-tag variant="light" style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                          {{ row.shareUrl }}
                        </t-tag>
                      </template>
                      <template #status="{ row }">
                        <t-tag v-if="row.expireDate && new Date(row.expireDate) < new Date()" theme="danger"
                          variant="light">已过期</t-tag>
                        <t-tag v-else theme="success" variant="light">有效</t-tag>
                      </template>
                      <template #operation="{ row }">
                        <t-space :size="6">
                          <t-button variant="outline" theme="primary" size="small" @click="handleCopyShareUrl(row)">
                            <template #icon><t-icon name="link" /></template>复制链接
                          </t-button>
                          <t-popconfirm content="确定要删除该分享吗？" @confirm="handleDeleteShare(row.shareId)">
                            <t-button variant="outline" theme="danger" size="small" class="btn-delete">
                              <template #icon><t-icon name="delete" /></template>删除
                            </t-button>
                          </t-popconfirm>
                        </t-space>
                      </template>
                    </t-table>
                  </div>
                </div>
              </div>

              <!-- ====== Tab: 导出配置 ====== -->
              <div v-show="activeTab === 'config'" class="tab-panel">
                <div class="panel-inner">
                  <div class="section-header-enhanced">
                    <div class="section-title-group">
                      <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                      </svg>
                      <h4 class="section-title-text">导出中心配置</h4>
                    </div>
                    <div class="section-actions">
                      <span v-if="exportEditing" class="edit-hint">参数已修改，点击保存生效</span>
                    </div>
                  </div>

                  <div class="config-display-grid">
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">默认导出格式</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultExportFormat" :popup-props="{ appendToBody: true }">
                            <t-option value="excel" label="Excel" />
                            <t-option value="pdf" label="PDF" />
                          </t-select>
                        </template>
                        <template v-else>{{ exportConfig.defaultExportFormat === 'pdf' ? 'PDF' : 'Excel' }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">配方默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateFormula" filterable clearable :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in formulaTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateFormula) || '未设置' }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">原料默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateMaterial" filterable clearable :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in materialTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateMaterial) || '未设置' }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">周报默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateWeeklyReport" filterable clearable :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in reportTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateWeeklyReport) || '未设置' }}</template>
                      </div>
                    </div>
                  </div>

                  <div class="config-display-grid" style="margin-top: 16px;">
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">月报默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateMonthlyReport" filterable clearable :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in reportTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateMonthlyReport) || '未设置' }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">导出速率限制</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-input-number v-model="exportFormConfig.exportRateLimit" :min="1" :max="200" theme="column" />
                        </template>
                        <template v-else>{{ exportConfig.exportRateLimit }} <span class="config-info-unit">次/日</span></template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">文件命名模式</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-input v-model="exportFormConfig.fileNamingPattern" placeholder="{category}_{date}_{name}" />
                        </template>
                        <template v-else>{{ exportConfig.fileNamingPattern }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">自动删除天数</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-input-number v-model="exportFormConfig.autoDeleteDays" :min="0" :max="365" theme="column" />
                        </template>
                        <template v-else>{{ exportConfig.autoDeleteDays }} <span class="config-info-unit">天</span></template>
                      </div>
                    </div>
                  </div>

                  <div class="config-edit-bar">
                    <button v-if="!exportEditing" class="edit-config-btn" @click="startExportEdit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      更改参数
                    </button>
                    <template v-if="exportEditing">
                      <button class="cancel-btn" @click="cancelExportEdit">取消</button>
                      <button class="save-btn" :class="{ loading: exportSaving }" :disabled="exportSaving || !exportHasChanged" @click="saveExportConfig">
                        <t-loading v-if="exportSaving" size="14px" />
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        保存
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </t-card>
    </Transition>

    <t-dialog v-model:visible="showTemplateDialog" :header="editingTemplate ? '编辑模板' : '创建导出模板'"
      @confirm="handleSaveTemplate" @close="resetTemplateForm">
      <t-form :data="templateForm" label-width="100px">
        <t-form-item label="模板名称"><t-input v-model="templateForm.name" placeholder="请输入模板名称" /></t-form-item>
        <t-form-item label="模板分类">
          <t-select v-model="templateForm.category" :popup-props="{ appendToBody: true }">
            <t-option value="formula" label="配方" />
            <t-option value="material" label="原料" />
            <t-option value="weekly-report" label="周报" />
            <t-option value="monthly-report" label="月报" />
          </t-select>
        </t-form-item>
        <t-form-item label="类型">
          <t-select v-model="templateForm.type" :popup-props="{ appendToBody: true }">
            <t-option value="pdf" label="PDF" />
            <t-option value="excel" label="Excel" />
          </t-select>
        </t-form-item>
        <t-form-item label="描述"><t-textarea v-model="templateForm.description" placeholder="可选" /></t-form-item>
        <t-form-item label="设为默认"><t-switch v-model="templateForm.isDefault" /></t-form-item>
      </t-form>
    </t-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useExportStore } from '@/stores/export';
import { useAuthStore } from '@/stores/auth';
import { MessagePlugin } from 'tdesign-vue-next';
import { formulaApi } from '@/api/formula';
import type { ExportJob, ShareItem, ExportTemplate, ExportStatistics } from '@/api/export';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const exportStore = useExportStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');
const initialized = ref(false);
const activeTab = ref('dashboard');
const navCollapsed = ref(false);

function toggleNavCollapse() {
  navCollapsed.value = !navCollapsed.value;
}

const exportTabs = [
  { value: 'dashboard', label: '仪表盘', iconPath: '<path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/>' },
  { value: 'export', label: '导出任务', iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
  { value: 'templates', label: '模板管理', iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>' },
  { value: 'share', label: '分享管理', iconPath: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>' },
  { value: 'config', label: '导出配置', iconPath: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>' },
];

function switchTab(tab: string) {
  activeTab.value = tab;
  handleTabChange(tab);
}

const showTemplateDialog = ref(false);
const editingTemplate = ref<ExportTemplate | null>(null);
const retryingId = ref('');
const reExportingId = ref('');
const formulaLoading = ref(false);
const formulaList = ref<{ id: string; name: string }[]>([]);
const searchKeyword = ref('');

const shareForm = reactive({ formulaId: '', password: '', expireDate: '' });
const templateForm = reactive({ name: '', type: 'excel', category: 'formula', description: '', isDefault: false });

const statistics = ref<ExportStatistics | null>(null);
async function loadStatistics() {
  try {
    statistics.value = await exportStore.fetchStatistics() ?? null;
  } catch {
    /* handled by interceptor */
  }
}

const filterForm = ref({ status: '', dataCategory: '', keyword: '' });

function applyFilter() {
  exportStore.fetchJobs({
    status: filterForm.value.status || undefined,
    dataCategory: filterForm.value.dataCategory || undefined,
    page: 1,
    pageSize: exportStore.pageSize,
  });
}

function resetFilter() {
  filterForm.value = { status: '', dataCategory: '', keyword: '' };
  exportStore.fetchJobs({ page: 1, pageSize: exportStore.pageSize });
}

const dashboardCards = computed(() => {
  if (!statistics.value) return [];
  const s = statistics.value;
  return [
    {
      label: '导出任务',
      value: String(s.totalJobs),
      unit: '个',
      badge: s.completedJobs > 0 ? `已完成 ${s.completedJobs}` : '—',
      badgeColor: 'var(--color-primary)',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    },
    {
      label: '分享链接',
      value: String(s.activeShares),
      unit: '条',
      badge: s.activeShares > 0 ? `${s.activeShares} 活跃` : '无',
      badgeColor: 'var(--color-primary)',
      badgeBg: '#ECFDF5',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
      iconPath: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
    },
    {
      label: '导出模板',
      value: String(s.templateCount),
      unit: '个',
      badge: '可用',
      badgeColor: 'var(--color-text-placeholder)',
      badgeBg: '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: 'var(--color-warning)',
      iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    },
    {
      label: '完成率',
      value: s.totalJobs > 0 ? `${Math.round((s.completedJobs / s.totalJobs) * 100)}%` : '—',
      unit: '',
      badge: s.failedJobs > 0 ? `${s.failedJobs} 失败` : '正常',
      badgeColor: s.failedJobs > 0 ? 'var(--color-danger)' : 'var(--color-primary)',
      badgeBg: s.failedJobs > 0 ? '#FEE2E2' : 'var(--color-primary-bg)',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
  ];
});

const jobTotalPages = computed(() => Math.ceil(exportStore.total / exportStore.pageSize) || 1);
const jobPageNumbers = computed<(number | string)[]>(() => {
  const total = jobTotalPages.value;
  const current = exportStore.currentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});
const goToPage = (page: number) => {
  exportStore.setPage(page);
  exportStore.fetchJobs({ page, pageSize: exportStore.pageSize });
};

const templateTotalPages = computed(() => Math.ceil(exportStore.templateTotal / exportStore.templatePageSize) || 1);
const templatePageNumbers = computed<(number | string)[]>(() => {
  const total = templateTotalPages.value;
  const current = exportStore.templateCurrentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});
const goToTemplatePage = (page: number) => {
  exportStore.setTemplatePage(page);
  exportStore.fetchTemplates({ page, pageSize: exportStore.templatePageSize });
};

let searchTimer: ReturnType<typeof setTimeout> | null = null;
const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    // search logic placeholder
  }, 300);
};

const formatDateTime = (raw: string) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.substring(0, 19);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }
const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [];
  const jobs = exportStore.jobs || [];
  for (const job of jobs.slice(0, 20)) {
    if (job.status === 'completed') items.push({
      type: 'success', title: '导出完成', desc: `配方 <strong>${job.formulaName || '未知'}</strong> 已成功导出`, time: formatDateTime(job.createdAt)
    });
    else if (job.status === 'failed') items.push({
      type: 'warning', title: '导出失败', desc: `配方 <strong>${job.formulaName || '未知'}</strong> 导出失败${job.errorMessage ? ': ' + job.errorMessage : ''}`, time: formatDateTime(job.createdAt)
    });
    else if (job.status === 'processing') items.push({
      type: 'info', title: '处理中', desc: `配方 <strong>${job.formulaName || '未知'}</strong> 正在导出中...`, time: formatDateTime(job.createdAt)
    });
  }
  if (items.length === 0) items.push({ type: 'info', title: '暂无动态', desc: '最近没有导出操作记录', time: '' });
  return items;
});

const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));
const pagedActivityItems = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return allActivityItems.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const assistantMessages = [
  '支持 Excel 和 PDF 多格式导出，满足不同场景需求',
  '分享链接可设置密码保护，确保数据安全',
  '自定义导出模板，一键生成标准化文档',
];
const assistantMessage = computed(() => assistantMessages[Math.floor(Date.now() / 8000) % assistantMessages.length]);

async function fetchFormulaList() {
  formulaLoading.value = true;
  try {
    const res = await formulaApi.getList({ page: 1, pageSize: 200 });
    formulaList.value = res.list;
  } catch {
    // ignore
  } finally {
    formulaLoading.value = false;
  }
}

function handleTabChange(tab: string) {
  if (tab === 'dashboard') {
    loadStatistics();
    exportStore.fetchJobs({ page: 1 });
  } else if (tab === 'export') {
    exportStore.fetchJobs({ page: 1 });
  } else if (tab === 'templates') {
    exportStore.fetchTemplates({ page: 1, pageSize: exportStore.templatePageSize });
  } else if (tab === 'share') {
    exportStore.fetchShares();
  } else if (tab === 'config') {
    loadExportConfig();
    exportStore.fetchTemplates({ pageSize: 100 });
  }
}

async function handleQuickExport(dataCategory: string) {
  const result = await exportStore.createJob({
    dataCategory,
    exportType: 'excel',
  } as Parameters<typeof exportStore.createJob>[0]);
  if (result.success) {
    const resultData = result.data as { jobId: string; status: string; errorMessage?: string } | undefined;
    if (resultData?.status === 'completed') {
      MessagePlugin.success('导出任务已完成，请在任务列表中点击下载');
    } else if (resultData?.status === 'failed') {
      MessagePlugin.error(`导出失败: ${resultData.errorMessage || '未知错误'}`);
    } else {
      MessagePlugin.success('导出任务已创建');
    }
    activeTab.value = 'export';
  } else {
    MessagePlugin.error(result.message || '创建失败');
  }
}

const CATEGORY_MAP: Record<string, string> = { formula: '配方', material: '原料', 'weekly-report': '周报', 'monthly-report': '月报' };
function categoryLabel(category: string) { return CATEGORY_MAP[category] || category || '未分类'; }
const jobColumns = [
  { colKey: 'jobId', title: '任务ID', width: 120, ellipsis: true },
  { colKey: 'formulaName', title: '配方名称', width: 140, ellipsis: true },
  {
    colKey: 'dataCategory', title: '导出维度', width: 100, cell: (_h: unknown, { row }: { row: { dataCategory: string } }) => {
      return CATEGORY_MAP[row.dataCategory] || row.dataCategory || '配方'
    }
  },
  { colKey: 'exportType', title: '格式', width: 80, cell: 'exportType' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createdAt', title: '创建时间', width: 170, cell: 'createdAt' },
  { colKey: 'errorMessage', title: '错误信息', ellipsis: true },
  { colKey: 'operation', title: '操作', width: 200, cell: 'operation', align: 'center' },
];

const jobStatusTheme = (s: string) => s === 'completed' ? 'success' : s === 'failed' ? 'danger' : s === 'processing' ? 'warning' : 'default';
const jobStatusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }[s] || s);

async function handleDownload(row: ExportJob) {
  const ext = row.exportType === 'pdf' ? 'pdf' : 'xlsx';
  await exportStore.downloadFile(row.jobId, row.fileName || `配方导出.${ext}`, row.exportType);
}

async function handleRetry(row: ExportJob) {
  retryingId.value = row.jobId;
  const result = await exportStore.retryJob(row.jobId);
  retryingId.value = '';
  if (result.success) {
    MessagePlugin.success('重试成功');
  } else {
    MessagePlugin.error(result.message || '重试失败');
  }
}

async function handleReExport(row: ExportJob) {
  reExportingId.value = row.jobId;
  const result = await exportStore.reExportJob(row.jobId);
  reExportingId.value = '';
  if (result.success) {
    MessagePlugin.success('重新导出完成，请在任务列表中点击下载');
  } else {
    MessagePlugin.error(result.message || '重新导出失败');
  }
}

const shareColumns = [
  { colKey: 'shareId', title: '分享ID', width: 120, ellipsis: true },
  { colKey: 'formulaName', title: '配方', width: 140 },
  { colKey: 'shareUrl', title: '分享链接', cell: 'shareUrl' },
  { colKey: 'password', title: '密码', width: 80 },
  { colKey: 'expireDate', title: '有效期', width: 120 },
  { colKey: 'downloadCount', title: '下载次数', width: 90 },
  { colKey: 'status', title: '状态', width: 80, cell: 'status' },
  { colKey: 'operation', title: '操作', width: 150, cell: 'operation', align: 'center' },
];

async function handleCreateShare() {
  if (!shareForm.formulaId) { MessagePlugin.warning('请选择配方'); return; }
  const result = await exportStore.createShare({
    formulaId: shareForm.formulaId,
    password: shareForm.password || undefined,
    expireDate: shareForm.expireDate || undefined,
  });
  if (result.success && result.data) {
    MessagePlugin.success(`分享链接已创建: ${result.data.shareUrl}`);
    shareForm.formulaId = '';
    shareForm.password = '';
    shareForm.expireDate = '';
    exportStore.fetchShares();
  } else {
    MessagePlugin.error(result.message || '创建失败');
  }
}

async function handleCopyShareUrl(row: ShareItem) {
  try {
    const baseUrl = window.location.origin;
    const fullUrl = `${baseUrl}${row.shareUrl}`;
    await navigator.clipboard.writeText(fullUrl);
    MessagePlugin.success('链接已复制到剪贴板');
  } catch {
    MessagePlugin.warning('复制失败，请手动复制');
  }
}

async function handleDeleteShare(shareId: string) {
  const result = await exportStore.deleteShare(shareId);
  if (result.success) MessagePlugin.success('分享已删除');
  else MessagePlugin.error(result.message || '删除失败');
}

const templateColumns = [
  { colKey: 'name', title: '模板名称' },
  { colKey: 'category', title: '分类', width: 90, cell: 'category' },
  { colKey: 'type', title: '类型', width: 100, cell: 'type' },
  { colKey: 'isDefault', title: '默认', width: 80, cell: 'isDefault' },
  { colKey: 'createdAt', title: '创建时间', width: 170, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 130, cell: 'operation' },
];

function handleOpenTemplateDialog(template: ExportTemplate | null) {
  if (template) {
    editingTemplate.value = template;
    templateForm.name = template.name;
    templateForm.type = template.type;
    templateForm.category = template.category || 'formula';
    templateForm.description = template.description || '';
    templateForm.isDefault = !!template.isDefault;
  } else {
    editingTemplate.value = null;
    resetTemplateForm();
  }
  showTemplateDialog.value = true;
}

function resetTemplateForm() {
  templateForm.name = '';
  templateForm.type = 'excel';
  templateForm.category = 'formula';
  templateForm.description = '';
  templateForm.isDefault = false;
  editingTemplate.value = null;
}

async function handleSaveTemplate() {
  if (!templateForm.name) { MessagePlugin.warning('请输入模板名称'); return; }
  let result;
  if (editingTemplate.value) {
    result = await exportStore.updateTemplate(editingTemplate.value.templateId, {
      name: templateForm.name,
      type: templateForm.type,
      category: templateForm.category,
      description: templateForm.description,
      formatConfig: {},
      isDefault: templateForm.isDefault,
    });
  } else {
    result = await exportStore.createTemplate({
      name: templateForm.name,
      type: templateForm.type,
      category: templateForm.category,
      description: templateForm.description,
      formatConfig: {},
      isDefault: templateForm.isDefault,
    });
  }
  if (result.success) {
    MessagePlugin.success(editingTemplate.value ? '模板更新成功' : '模板创建成功');
    showTemplateDialog.value = false;
  } else {
    MessagePlugin.error(result.message || '操作失败');
  }
}

async function handleDeleteTemplate(templateId: string) {
  const result = await exportStore.deleteTemplate(templateId);
  if (result.success) MessagePlugin.success('模板已删除');
  else MessagePlugin.error(result.message || '删除失败');
}

const exportConfig = ref({
  defaultExportFormat: 'excel',
  defaultTemplateFormula: '',
  defaultTemplateMaterial: '',
  defaultTemplateWeeklyReport: '',
  defaultTemplateMonthlyReport: '',
  exportRateLimit: 50,
  fileNamingPattern: '{category}_{date}_{name}',
  autoDeleteDays: 30,
});
const exportFormConfig = ref({ ...exportConfig.value });
const exportEditing = ref(false);
const exportSaving = ref(false);
const exportHasChanged = computed(() =>
  exportFormConfig.value.defaultExportFormat !== exportConfig.value.defaultExportFormat ||
  exportFormConfig.value.defaultTemplateFormula !== exportConfig.value.defaultTemplateFormula ||
  exportFormConfig.value.defaultTemplateMaterial !== exportConfig.value.defaultTemplateMaterial ||
  exportFormConfig.value.defaultTemplateWeeklyReport !== exportConfig.value.defaultTemplateWeeklyReport ||
  exportFormConfig.value.defaultTemplateMonthlyReport !== exportConfig.value.defaultTemplateMonthlyReport ||
  exportFormConfig.value.exportRateLimit !== exportConfig.value.exportRateLimit ||
  exportFormConfig.value.fileNamingPattern !== exportConfig.value.fileNamingPattern ||
  exportFormConfig.value.autoDeleteDays !== exportConfig.value.autoDeleteDays
);

const formulaTemplates = computed(() => exportStore.templates.filter((t: ExportTemplate) => t.category === 'formula'));
const materialTemplates = computed(() => exportStore.templates.filter((t: ExportTemplate) => t.category === 'material'));
const reportTemplates = computed(() => exportStore.templates.filter((t: ExportTemplate) => t.category === 'weekly-report' || t.category === 'monthly-report'));

function getTemplateName(templateId: string): string {
  if (!templateId) return '';
  const t = exportStore.templates.find((tpl: ExportTemplate) => tpl.templateId === templateId);
  return t ? t.name : '(已删除)';
}

function startExportEdit() {
  exportFormConfig.value = { ...exportConfig.value };
  exportEditing.value = true;
}

function cancelExportEdit() {
  exportFormConfig.value = { ...exportConfig.value };
  exportEditing.value = false;
}

async function saveExportConfig() {
  exportSaving.value = true;
  try {
    await exportStore.updateConfig([
      { configKey: 'default_export_format', configValue: exportFormConfig.value.defaultExportFormat },
      { configKey: 'default_template_formula', configValue: exportFormConfig.value.defaultTemplateFormula },
      { configKey: 'default_template_material', configValue: exportFormConfig.value.defaultTemplateMaterial },
      { configKey: 'default_template_weekly_report', configValue: exportFormConfig.value.defaultTemplateWeeklyReport },
      { configKey: 'default_template_monthly_report', configValue: exportFormConfig.value.defaultTemplateMonthlyReport },
      { configKey: 'export_rate_limit', configValue: String(exportFormConfig.value.exportRateLimit) },
      { configKey: 'file_naming_pattern', configValue: exportFormConfig.value.fileNamingPattern },
      { configKey: 'auto_delete_days', configValue: String(exportFormConfig.value.autoDeleteDays) },
    ]);
    exportConfig.value = { ...exportFormConfig.value };
    exportEditing.value = false;
    MessagePlugin.success('导出配置更新成功');
  } catch (err: unknown) {
    const error = err as { message?: string };
    MessagePlugin.error('导出配置更新失败: ' + (error.message || '未知错误'));
  } finally {
    exportSaving.value = false;
  }
}

async function loadExportConfig() {
  try {
    const configList = await exportStore.fetchConfig();
    if (configList) {
      const getVal = (key: string, fallback: string) => {
        const item = configList.find(c => c.configKey === key);
        return item ? item.configValue : fallback;
      };
      exportConfig.value = {
        defaultExportFormat: getVal('default_export_format', 'excel'),
        defaultTemplateFormula: getVal('default_template_formula', ''),
        defaultTemplateMaterial: getVal('default_template_material', ''),
        defaultTemplateWeeklyReport: getVal('default_template_weekly_report', ''),
        defaultTemplateMonthlyReport: getVal('default_template_monthly_report', ''),
        exportRateLimit: Number(getVal('export_rate_limit', '50')),
        fileNamingPattern: getVal('file_naming_pattern', '{category}_{date}_{name}'),
        autoDeleteDays: Number(getVal('auto_delete_days', '30')),
      };
      exportFormConfig.value = { ...exportConfig.value };
    }
  } catch {
    /* handled */
  }
}

onMounted(async () => {
  await Promise.all([fetchFormulaList(), exportStore.fetchJobs({ page: 1 }), loadStatistics()]);
  initialized.value = true;
});
</script>

<style scoped lang="scss">
.export-center {

  .content-card {
    border-radius: var(--radius-5xl) !important;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid var(--color-bg-page) !important;
    transition: all $transition-slow;

    &:hover {
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.09), 0 2px 6px rgba(15, 23, 42, 0.04);
    }

    :deep(.t-card__body) {
      padding: 0 !important;
    }

    .export-body {
      display: flex;
      gap: 0;
      min-height: 480px;
    }

    .export-nav {
      width: 170px;
      flex-shrink: 0;
      padding: 24px 12px;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      position: relative;

      &--collapsed {
        width: 56px;
        padding: 24px var(--space-1-5);

        .nav-tab {
          justify-content: center;
          padding: 12px 0;

          .nav-tab-icon {
            width: 24px;
            height: 24px;
          }

          .nav-tab-label {
            display: none;
          }
        }

        .nav-collapse-btn {
          margin: 0 auto;
          width: 36px;
          height: 36px;
        }
      }

      .nav-tab {
        display: flex;
        align-items: center;
        gap: var(--space-2-5);
        padding: 12px 16px;
        border-radius: 12px;
        cursor: pointer;
        transition: all $transition-normal;
        color: var(--color-text-secondary);
        font-size: 14px;
        font-weight: 500;
        border: 1px solid transparent;
        margin-bottom: 8px;
        white-space: nowrap;
        overflow: hidden;

        .nav-tab-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        &:hover {
          background: #f1f5f9;
          color: var(--color-text-primary);
        }

        &.active {
          background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
          color: white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
          border-color: transparent;
          font-weight: 600;
        }

        .nav-tab-label {
          flex: 1;
          transition: opacity 0.2s ease;
        }
      }

      .nav-collapse-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid var(--color-border);
        background: transparent;
        color: var(--color-text-placeholder);
        cursor: pointer;
        margin-top: 12px;
        transition: all 0.2s;

        &:hover {
          background: #f1f5f9;
          color: var(--color-text-primary);
          border-color: #cbd5e1;
        }
      }
    }

    .export-content {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
    }
  }

  .data-center-toolbar {
    padding: 32px;
    border-bottom: 1px solid var(--color-bg-page);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    position: relative;
    min-height: 88px;

    .toolbar-left-section {
      flex: 1;
      min-width: 240px;

      .toolbar-title-section {
        .toolbar-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0 0 4px 0;
        }

        .toolbar-subtitle {
          font-size: 14px;
          color: var(--color-text-placeholder);
          margin: 0;
        }
      }
    }

    .toolbar-right-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 14px;
        color: var(--color-text-placeholder);
        pointer-events: none;
        z-index: 1;
      }

      .search-input {
        width: 260px;
        border-radius: 12px !important;
        transition: all $transition-normal;

        &:focus-within {
          width: 300px;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }

        :deep(.t-input__inner) {
          padding-left: 38px !important;
        }
      }
    }
  }

  .panel-inner {
    padding: 24px 32px;
  }

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;

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
        border-color: #DBEAFE;
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

  .quick-export-section {
    margin-top: 24px;

    .quick-export-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .quick-export-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px 24px;
      border-radius: 14px;
      border: 1px solid #f1f5f9;
      background: #fff;
      cursor: pointer;
      transition: all 0.25s ease;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.1);
        transform: translateY(-2px);
      }

      .quick-export-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .quick-export-label {
        font-size: 15px;
        font-weight: 600;
        color: var(--color-text-primary);
      }
    }
  }

  .section-header-enhanced {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .section-title-group {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);
    }

    .section-title-icon {
      flex-shrink: 0;
    }

    .section-title-text {
      font-size: 16px;
      font-weight: 600;
      color: #0F172A;
      margin: 0;
    }

    .section-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
  }

  .edit-hint {
    font-size: 12px;
    color: var(--color-warning);
    background: #FFFBEB;
    padding: 4px var(--space-2-5);
    border-radius: 6px;
    border: 1px solid #FDE68A;
  }

  .config-display-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 12px;

    .config-info-card {
      background: var(--color-bg-page);
      border: 1px solid #f1f5f9;
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;

      &:hover {
        border-color: var(--color-border);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      }

      &.is-editing {
        background: #F0F7FF;
        border-color: #93C5FD;

        .config-info-label {
          color: #2563EB;
        }
      }
    }

    .config-info-label {
      font-size: 13px;
      color: var(--color-text-placeholder);
      margin-bottom: 8px;
    }

    .config-info-value {
      font-size: 22px;
      font-weight: 700;
      color: #0F172A;

      .config-info-unit {
        font-size: 14px;
        font-weight: 400;
        color: var(--color-text-placeholder);
      }

      :deep(.t-input-number) {
        width: 100%;

        .t-input-number__input {
          input {
            font-size: 16px;
            font-weight: 600;
            height: 38px;
          }
        }
      }
    }
  }

  .config-edit-bar {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    margin-bottom: 20px;

    .edit-config-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: var(--space-1-5) var(--space-3-5);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: #fff;
      color: var(--color-text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: #3B82F6;
        color: #3B82F6;
        background: #F0F7FF;
      }
    }

    .cancel-btn {
      padding: 8px 20px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: #fff;
      color: var(--color-text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--color-text-placeholder);
        color: var(--color-text-primary);
      }
    }

    .save-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: 8px 20px;
      border: none;
      border-radius: 8px;
      background: #3B82F6;
      color: #fff;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: #2563EB;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &.loading {
        opacity: 0.8;
      }
    }
  }

  .create-form-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: linear-gradient(135deg, var(--color-bg-page) 0%, #f1f5f9 100%);
    border-radius: 16px;
    margin-bottom: 20px;
    border: 1px solid var(--color-border);

    :deep(.t-form) {
      width: 100%;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
    }

    :deep(.t-form-item) {
      margin-bottom: 0;
    }

    &--header {
      justify-content: space-between;
      background: transparent;
      border: none;
      padding: 0 0 16px 0;
      margin-bottom: 0;
      border-bottom: 1px solid #f1f5f9;
    }

    .form-bar-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
  }

  .create-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px var(--space-4-5);
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-normal;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }

  .table-area {
    background: #fff;
    border-radius: 16px;
    border: 1px solid #f1f5f9;
    overflow: hidden;

    :deep(.t-table) {
      border: none;
    }

    :deep(.t-table__header th) {
      background: var(--color-bg-page);
      font-weight: 600;
      color: var(--color-text-secondary);
      font-size: 13px;
      letter-spacing: 0.02em;
    }

    :deep(.t-table__body td) {
      font-size: 14px;
      color: var(--color-text-primary);
    }

    :deep(.t-table__body tr:hover td) {
      background: #f0fdf4;
    }
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;
    border: 1px solid transparent;
    line-height: 1.5;

    &--download {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      color: #fff;
      border-color: transparent;
      box-shadow: 0 1px 4px rgba(16, 185, 129, 0.2);

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 3px 10px rgba(16, 185, 129, 0.35);
      }

      &:active {
        transform: translateY(0);
        box-shadow: 0 1px 3px rgba(16, 185, 129, 0.2);
      }
    }

    &--reexport {
      background: transparent;
      color: var(--color-primary-dark);
      border-color: var(--color-primary-lighter);
      background-color: #ecfdf5;

      &:hover:not(:disabled) {
        background: var(--color-primary-bg);
        border-color: var(--color-primary);
        color: var(--color-primary-deep);
      }

      &:active:not(:disabled) {
        background: var(--color-primary-lightest);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &--retry {
      background: transparent;
      color: var(--color-warning);
      border-color: #fcd34d;
      background-color: #fffbeb;

      &:hover:not(:disabled) {
        background: #fef3c7;
        border-color: var(--color-warning);
        color: #d97706;
      }

      &:active:not(:disabled) {
        background: #fde68a;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    svg {
      flex-shrink: 0;
    }
  }

  .table-pagination {
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--color-bg-page);

    .pagination-info {
      font-size: 14px;
      color: var(--color-text-placeholder);
      font-weight: 400;
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
      padding: var(--space-1-5) 12px;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background-color: transparent;
      color: var(--color-text-secondary);
      font-size: 14px;
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;
      user-select: none;

      &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
        background-color: var(--color-bg-page);
        border-color: #cbd5e1;
        color: var(--color-text-primary);
      }

      &.pagination-btn--disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
        color: var(--color-text-placeholder);
        pointer-events: none;
      }

      &.pagination-btn--active {
        background-color: var(--color-primary);
        color: #fff;
        border-color: var(--color-primary);
        font-weight: 600;
        box-shadow: 0 1px 3px rgba(16, 185, 129, 0.25);
        pointer-events: none;
      }
    }

    .pagination-ellipsis {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 34px;
      color: var(--color-text-placeholder);
      font-size: 14px;
      user-select: none;
    }
  }

  .activity-card {
    background-color: #fff;
    border-radius: var(--radius-4xl);
    padding: 32px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid var(--color-bg-page);

    &--assistant {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      border: none;
      color: #fff;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(16, 185, 129, 0.15), 0 10px 10px -5px rgba(16, 185, 129, 0.04);
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
      border: 1.5px solid rgba(59, 130, 246, 0.2);
      background: rgba(59, 130, 246, 0.04);
      color: #3B82F6;
      cursor: pointer;
      transition: all $transition-fast;

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
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    padding-bottom: 20px;
    position: relative;

    &:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 11px;
      top: 28px;
      bottom: 0;
      width: 2px;
      background: #f1f5f9;
    }

    &--last {
      padding-bottom: 0;
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
    margin-top: var(--space-0-5);

    &--success {
      background: #ecfdf5;
      color: var(--color-primary);
    }

    &--warning {
      background: #fffbeb;
      color: var(--color-warning);
    }

    &--info {
      background: #eff6ff;
      color: #3b82f6;
    }

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
    }
  }

  .timeline-content {
    flex: 1;
    min-width: 0;
  }

  .timeline-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0 0 4px 0;
  }

  .timeline-desc {
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin: 0 0 4px 0;
  }

  .timeline-time {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }

  .assistant-content {
    position: relative;
    z-index: 1;
  }

  .assistant-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px 0;
  }

  .assistant-desc {
    font-size: 14px;
    opacity: 0.9;
    line-height: 1.7;
    margin: 0 0 20px 0;
  }

  .assistant-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: var(--space-2-5) var(--space-6);
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all $transition-normal;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
      border-color: rgba(255, 255, 255, 0.5);
      transform: translateY(-1px);
    }
  }

  .assistant-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
  }

  .assistant-avatar-group {
    display: flex;
    gap: var(--space-1-5);
  }

  .assistant-avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }

  .assistant-hint {
    font-size: 12px;
    opacity: 0.75;
  }

  .assistant-bg-icon {
    position: absolute;
    right: -10px;
    bottom: -10px;
    opacity: 0.08;
    transform: rotate(-12deg);
  }

  @media (max-width: 1200px) {
    .dashboard-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .config-display-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .quick-export-section .quick-export-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 768px) {
    .dashboard-grid {
      grid-template-columns: 1fr;
    }

    .config-display-grid {
      grid-template-columns: 1fr;
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

@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateX(-8px);
  }

  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.content-fade-enter-active {
  animation: content-fade-in 0.35s ease forwards;
}

.content-fade-leave-active {
  animation: content-fade-out 0.2s ease forwards;
}

@keyframes content-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes content-fade-out {
  from {
    opacity: 1;
    transform: translateY(0);
  }

  to {
    opacity: 0;
    transform: translateY(-8px);
  }
}
</style>
