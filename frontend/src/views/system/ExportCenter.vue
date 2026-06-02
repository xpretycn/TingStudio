<template>
  <div class="export-center" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="5" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">导出管理中心</h3>
              <p class="toolbar-subtitle">管理配方导出任务、导出模板与配置</p>
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
          <div class="export-tabs-bar">
            <div v-for="tab in exportTabs" :key="tab.value" class="horizontal-tab"
              :class="{ active: activeTab === tab.value }" role="tab" tabindex="0" @click="switchTab(tab.value)"
              @keydown.enter="switchTab(tab.value)">
              <svg class="horizontal-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" v-html="tab.iconPath"></svg>
              <span class="horizontal-tab-label">{{ tab.label }}</span>
            </div>
          </div>
          <div class="export-content">
            <div class="export-tab-panels">
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
                        <div class="format-status-cell">
                          <t-tag variant="light" size="small">{{ row.exportType?.toUpperCase() }}</t-tag>
                          <t-tag :theme="jobStatusTheme(row.status)" variant="light" size="small">{{ jobStatusLabel(row.status) }}</t-tag>
                        </div>
                      </template>
                      <template #createdAt="{ row }">
                        {{ formatDateTime(row.createdAt) }}
                      </template>
                      <template #operation="{ row }">
                        <t-popup trigger="hover" placement="bottom-right" :popup-props="{ appendToBody: true }">
                          <button class="action-dropdown-btn" @click.stop title="操作">
                            <t-icon name="more" />
                          </button>
                          <template #content>
                            <div class="action-menu">
                              <div v-if="row.status === 'completed'" class="action-menu-item" @click="handleDownload(row)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                <span>下载</span>
                              </div>
                              <div v-if="row.status === 'completed' || row.status === 'failed'" class="action-menu-item" @click="handleReExport(row)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                                <span>{{ reExportingId === row.jobId ? '导出中...' : '重新导出' }}</span>
                              </div>
                              <div v-if="row.status === 'failed' && reExportingId !== row.jobId" class="action-menu-item action-menu-item--warning" @click="handleRetry(row)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                                <span>重试</span>
                              </div>
                            </div>
                          </template>
                        </t-popup>
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
                  <div class="section-header-enhanced">
                    <div class="section-title-group">
                      <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                      <h4 class="section-title-text">业务模块模板配置</h4>
                    </div>
                    <span class="section-title-count">共 {{ 4 }} 个模块</span>
                  </div>

                  <div v-if="categoryCards.length === 0 && !exportStore.loading" class="empty-state">
                    <div class="empty-icon-wrap">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)"
                        stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="9" y1="21" x2="9" y2="9" />
                      </svg>
                    </div>
                    <p class="empty-text">暂无模板配置</p>
                    <p class="empty-hint">为各业务模块配置导出模板，选择导出字段和格式</p>
                  </div>

                  <div v-else class="template-category-grid">
                    <div v-for="card in categoryCards" :key="card.category" class="template-category-card">
                      <div class="tcc-header">
                        <div class="tcc-icon-wrap" :style="{ background: card.iconBg }">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" :stroke="card.iconColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="card.iconSvg"></svg>
                        </div>
                        <div class="tcc-title-group">
                          <h5 class="tcc-title">{{ card.name }}</h5>
                          <span class="tcc-subtitle">{{ card.categoryLabel }}</span>
                        </div>
                      </div>
                      <div class="tcc-body">
                        <div class="tcc-stat-row">
                          <div class="tcc-stat">
                            <span class="tcc-stat-value">{{ card.templateCount }}</span>
                            <span class="tcc-stat-label">模板数量</span>
                          </div>
                          <div class="tcc-stat">
                            <span class="tcc-stat-value">{{ card.defaultFormat }}</span>
                            <span class="tcc-stat-label">默认格式</span>
                          </div>
                          <div class="tcc-stat">
                            <span class="tcc-stat-value">{{ card.selectedFieldCount }}/{{ card.totalFieldCount }}</span>
                            <span class="tcc-stat-label">已选字段</span>
                          </div>
                        </div>
                      </div>
                      <div class="tcc-footer">
                        <button class="tcc-config-btn" @click="openTemplateDrawer(card.category)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="3" />
                            <path
                              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                          </svg>
                          配置模板
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- ====== Tab: 模板管理（Admin） ====== -->
              <div v-show="activeTab === 'template-admin'" class="tab-panel">
                <div class="panel-inner">
                  <div class="tmpl-admin-toolbar">
                    <div class="tmpl-toolbar-left">
                      <t-select v-model="tmplFilter.category" placeholder="全部类别" clearable style="width: 130px"
                        :popup-props="{ appendToBody: true }" @change="fetchAdminTemplateList">
                        <t-option value="formula" label="配方" />
                        <t-option value="material" label="原料" />
                        <t-option value="weekly-report" label="周报" />
                        <t-option value="monthly-report" label="月报" />
                      </t-select>
                      <t-select v-model="tmplFilter.format" placeholder="全部格式" clearable style="width: 120px"
                        :popup-props="{ appendToBody: true }" @change="fetchAdminTemplateList">
                        <t-option value="pdf" label="PDF" />
                        <t-option value="excel" label="Excel" />
                      </t-select>
                    </div>
                    <div class="tmpl-toolbar-right">
                      <button v-if="isAdmin" class="create-action-btn" @click="openCreateTemplateDialog">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                        新建模板
                      </button>
                    </div>
                  </div>

                  <div class="table-area">
                    <t-table :data="adminTemplateList" :columns="adminTemplateColumns" :loading="exportStore.loading"
                      row-key="templateId" hover size="small" table-layout="auto" :pagination="adminTemplatePagination"
                      @page-change="onAdminTemplatePageChange">
                      <template #empty>
                        <t-empty description="暂无导出模板" role="status" />
                      </template>
                      <template #name="{ row }">
                        <div class="tmpl-name-cell">
                          <span class="tmpl-name-text">{{ row.name }}</span>
                          <t-tag v-if="row.isDefault === 1" theme="primary" variant="light" size="small">默认</t-tag>
                        </div>
                      </template>
                      <template #category="{ row }">
                        <t-tag variant="light">{{ categoryLabel(row.category) }}</t-tag>
                      </template>
                      <template #type="{ row }">
                        <t-tag :theme="row.type === 'pdf' ? 'warning' : 'success'" variant="light" size="small">
                          {{ row.type.toUpperCase() }}
                        </t-tag>
                      </template>
                      <template #fieldCount="{ row }">
                        {{ getTemplateFieldCount(row) }}
                      </template>
                      <template #createdAt="{ row }">
                        {{ formatDateTime(row.createdAt) }}
                      </template>
                      <template #operation="{ row }">
                        <t-space :size="6">
                          <t-button v-if="isAdmin" variant="outline" theme="primary" size="small"
                            @click="openEditTemplateDialog(row)">
                            编辑
                          </t-button>
                          <t-button v-if="isAdmin" variant="outline" size="small" @click="handleCopyTemplate(row)">
                            复制
                          </t-button>
                          <t-popconfirm v-if="isAdmin" content="确定要删除该模板吗？删除后不可恢复。"
                            @confirm="handleAdminDeleteTemplate(row.templateId)">
                            <t-button variant="outline" theme="danger" size="small">删除</t-button>
                          </t-popconfirm>
                          <t-button v-if="isAdmin && row.isDefault !== 1" variant="text" theme="primary" size="small"
                            @click="handleSetDefault(row.templateId)">
                            设为默认
                          </t-button>
                          <span v-if="!isAdmin" class="readonly-hint">只读</span>
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
                      <svg class="section-title-icon" width="20" height="20" viewBox="0 0 24 24" fill="none"
                        stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="3" />
                        <path
                          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
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
                          <t-select v-model="exportFormConfig.defaultExportFormat"
                            :popup-props="{ appendToBody: true }">
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
                          <t-select v-model="exportFormConfig.defaultTemplateFormula" filterable clearable
                            :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in formulaTemplates" :key="t.templateId" :value="t.templateId"
                              :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateFormula) || '未设置' }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">原料默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateMaterial" filterable clearable
                            :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in materialTemplates" :key="t.templateId" :value="t.templateId"
                              :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateMaterial) || '未设置' }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">周报默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateWeeklyReport" filterable clearable
                            :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in reportTemplates" :key="t.templateId" :value="t.templateId"
                              :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateWeeklyReport) || '未设置'
                          }}</template>
                      </div>
                    </div>
                  </div>

                  <div class="config-display-grid" style="margin-top: 16px;">
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">月报默认模板</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-select v-model="exportFormConfig.defaultTemplateMonthlyReport" filterable clearable
                            :popup-props="{ appendToBody: true }" placeholder="选择模板">
                            <t-option v-for="t in reportTemplates" :key="t.templateId" :value="t.templateId"
                              :label="t.name" />
                          </t-select>
                        </template>
                        <template v-else>{{ getTemplateName(exportConfig.defaultTemplateMonthlyReport) || '未设置'
                          }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">导出速率限制</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-input-number v-model="exportFormConfig.exportRateLimit" :min="1" :max="200"
                            theme="column" />
                        </template>
                        <template v-else>{{ exportConfig.exportRateLimit }} <span
                            class="config-info-unit">次/日</span></template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">文件命名模式</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-input v-model="exportFormConfig.fileNamingPattern"
                            placeholder="{category}_{date}_{name}" />
                        </template>
                        <template v-else>{{ exportConfig.fileNamingPattern }}</template>
                      </div>
                    </div>
                    <div class="config-info-card" :class="{ 'is-editing': exportEditing }">
                      <div class="config-info-label">自动删除天数</div>
                      <div class="config-info-value">
                        <template v-if="exportEditing">
                          <t-input-number v-model="exportFormConfig.autoDeleteDays" :min="0" :max="365"
                            theme="column" />
                        </template>
                        <template v-else>{{ exportConfig.autoDeleteDays }} <span
                            class="config-info-unit">天</span></template>
                      </div>
                    </div>
                  </div>

                  <div class="config-edit-bar">
                    <button v-if="!exportEditing" class="edit-config-btn" @click="startExportEdit">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                      更改参数
                    </button>
                    <template v-if="exportEditing">
                      <button class="cancel-btn" @click="cancelExportEdit">取消</button>
                      <button class="save-btn" :class="{ loading: exportSaving }"
                        :disabled="exportSaving || !exportHasChanged" @click="saveExportConfig">
                        <t-loading v-if="exportSaving" size="14px" />
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                          stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12" />
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

    <t-drawer v-model:visible="templateDrawerVisible" :header="drawerTitle" :footer="false" :size="drawerSize"
      :attach="'body'" :close-on-overlay-click="false" :class="{ 'template-drawer--with-preview': previewVisible }">
      <div class="template-drawer-body" :class="{ 'with-preview': previewVisible }">
        <div class="td-config-panel" :class="{ collapsed: previewVisible }">
          <div class="td-section">
            <div class="td-section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>导出格式配置</span>
            </div>
            <div class="td-config-form">
              <div class="td-form-row">
                <label class="td-form-label">默认导出格式</label>
                <t-select v-model="formConfig.exportFormat" :popup-props="{ appendToBody: true }" style="width: 120px">
                  <t-option value="pdf" label="PDF" />
                  <t-option value="excel" label="Excel" />
                </t-select>
              </div>
              <div class="td-form-row">
                <label class="td-form-label">默认模板</label>
                <div class="td-form-row-inner">
                  <t-select v-model="formConfig.defaultTemplateId" :popup-props="{ appendToBody: true }" style="flex: 1"
                    clearable :placeholder="'选择模板'">
                    <t-option v-for="t in drawerTemplates" :key="t.templateId" :value="t.templateId" :label="t.name" />
                  </t-select>
                  <button class="td-add-btn" @click="handleAddTemplate">新增</button>
                  <button v-if="formConfig.defaultTemplateId" class="td-delete-btn"
                    @click="handleDeleteSelectedTemplate">删除</button>
                </div>
              </div>
              <div class="td-form-row">
                <label class="td-form-label">页面方向</label>
                <t-select v-model="formConfig.orientation" :popup-props="{ appendToBody: true }" style="width: 120px">
                  <t-option value="portrait" label="纵向" />
                  <t-option value="landscape" label="横向" />
                </t-select>
                <label class="td-form-label" style="margin-left: 16px">纸张大小</label>
                <t-select v-model="formConfig.pageSize" :popup-props="{ appendToBody: true }" style="width: 100px">
                  <t-option value="A4" label="A4" />
                  <t-option value="A3" label="A3" />
                  <t-option value="Letter" label="Letter" />
                </t-select>
              </div>
              <div class="td-form-row">
                <label class="td-form-label">字号</label>
                <t-select v-model="formConfig.fontSize" :popup-props="{ appendToBody: true }" style="width: 100px">
                  <t-option :value="10" label="10" />
                  <t-option :value="11" label="11" />
                  <t-option :value="12" label="12" />
                  <t-option :value="14" label="14" />
                  <t-option :value="16" label="16" />
                </t-select>
              </div>
              <div class="td-form-row td-form-row--checks">
                <t-checkbox v-model="formConfig.includeHeader">显示页眉</t-checkbox>
                <t-checkbox v-model="formConfig.includeFooter">显示页脚</t-checkbox>
              </div>
            </div>
          </div>

          <div class="td-section">
            <div class="td-section-header">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                <rect x="9" y="3" width="6" height="4" rx="1" />
                <path d="M9 14l2 2 4-4" />
              </svg>
              <span>导出字段配置</span>
              <span class="td-section-actions">
                <t-button size="small" variant="text" @click="selectAllFields">全选</t-button>
                <t-button size="small" variant="text" @click="deselectAllFields">全不选</t-button>
                <t-button size="small" variant="text" @click="resetFieldsToDefault">恢复默认</t-button>
              </span>
            </div>
            <div class="td-field-groups">
              <div v-for="group in drawerFieldGroups" :key="group.groupName" class="td-field-group">
                <div class="td-field-group-title">
                  <span :class="group.required ? 'td-required-mark' : 'td-optional-mark'">
                    {{ group.required ? '◆' : '◇' }}
                  </span>
                  {{ group.groupName }}
                  <span v-if="group.required" class="td-required-badge">必选</span>
                </div>
                <div class="td-field-chips">
                  <t-checkbox v-for="field in group.fields" :key="field.key" :checked="selectedFields.has(field.key)"
                    :disabled="group.required" @change="(val: boolean) => toggleField(field.key, val)">
                    {{ field.label }}
                  </t-checkbox>
                </div>
              </div>
            </div>
          </div>

          <div class="td-actions">
            <t-button variant="outline" @click="closeTemplateDrawer">取消</t-button>
            <t-button variant="outline" theme="primary" @click="handleSaveAndPreview">
              <template #icon><t-icon name="view-module" /></template>保存并预览
            </t-button>
            <t-button theme="primary" @click="handleSaveTemplateConfig">保存</t-button>
          </div>
        </div>

        <div v-if="previewVisible" class="template-preview-panel">
          <div class="tpp-header">
            <div class="tpp-header-left">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span>模板预览</span>
            </div>
            <t-button size="small" variant="text" @click="handleBackToEdit">
              <t-icon name="close" />
            </t-button>
          </div>
          <div class="tpp-controls">
            <div class="tpp-control-item">
              <label>预览数据</label>
              <t-select v-model="previewDataIndex" :popup-props="{ appendToBody: true }" size="small"
                style="width: 180px" @change="fetchPreviewData">
                <t-option v-for="(item, idx) in previewDataList" :key="idx" :value="idx" :label="item.label" />
              </t-select>
            </div>
            <div class="tpp-control-item">
              <label>预览格式</label>
              <t-select v-model="previewFormat" :popup-props="{ appendToBody: true }" size="small" style="width: 100px">
                <t-option value="pdf" label="PDF 排版" />
                <t-option value="excel" label="Excel 排版" />
              </t-select>
            </div>
          </div>
          <div class="tpp-content">
            <div v-if="previewLoading" class="tpp-loading">
              <t-loading size="medium" text="加载预览数据..." />
            </div>
            <div v-else-if="previewFields.length === 0" class="tpp-empty">
              <p>请先选择导出字段</p>
            </div>
            <div v-else class="tpp-preview-table">
              <table>
                <thead>
                  <tr>
                    <th style="width: 30%">字段</th>
                    <th>值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="pf in previewFields" :key="pf.key">
                    <td class="tpp-field-label">{{ pf.label }}</td>
                    <td class="tpp-field-value">{{ pf.value || '--' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="tpp-footer">
            <t-button size="small" variant="outline" @click="handleBackToEdit">返回编辑</t-button>
          </div>
        </div>
      </div>
    </t-drawer>

    <t-dialog v-model:visible="showTemplateDialog" :header="editingTemplate ? '编辑模板' : '创建导出模板'"
      @confirm="handleSaveTemplate" @close="resetTemplateDialogForm">
      <t-form :data="templateDialogForm" label-width="100px">
        <t-form-item label="模板名称"><t-input v-model="templateDialogForm.name" placeholder="请输入模板名称" /></t-form-item>
        <t-form-item label="模板分类" v-if="!drawerCategory">
          <t-select v-model="templateDialogForm.category" :popup-props="{ appendToBody: true }">
            <t-option value="formula" label="配方" />
            <t-option value="material" label="原料" />
            <t-option value="weekly-report" label="周报" />
            <t-option value="monthly-report" label="月报" />
          </t-select>
        </t-form-item>
        <t-form-item label="类型">
          <t-select v-model="templateDialogForm.type" :popup-props="{ appendToBody: true }">
            <t-option value="pdf" label="PDF" />
            <t-option value="excel" label="Excel" />
          </t-select>
        </t-form-item>
        <t-form-item label="描述"><t-textarea v-model="templateDialogForm.description" placeholder="可选" /></t-form-item>
        <t-form-item label="设为默认"><t-switch v-model="templateDialogForm.isDefault" /></t-form-item>
      </t-form>
    </t-dialog>

    <!-- ====== 模板编辑弹窗（Admin 完整版） ====== -->
    <t-dialog v-model:visible="showTemplateEditDialog" :header="tmplEditDialogTitle"
      :confirm-btn="{ content: '保存', theme: 'primary' }" width="720px" :close-on-overlay-click="false"
      @confirm="handleSaveEditTemplate" @close="resetTemplateEditForm">
      <div class="tmpl-edit-body">
        <!-- 基本信息 -->
        <div class="tmpl-edit-section">
          <div class="tmpl-edit-section-title">基本信息</div>
          <t-form :data="tmplEditForm" label-width="90px" layout="inline">
            <div class="tmpl-edit-form-grid">
              <t-form-item label="模板名称" class="tmpl-edit-form-full">
                <t-input v-model="tmplEditForm.name" placeholder="请输入模板名称" />
              </t-form-item>
              <t-form-item label="描述说明" class="tmpl-edit-form-full">
                <t-textarea v-model="tmplEditForm.description" placeholder="可选，描述该模板的用途" :autosize="{ minRows: 2 }" />
              </t-form-item>
              <t-form-item label="所属类别">
                <t-select v-model="tmplEditForm.category" :popup-props="{ appendToBody: true }" style="width: 180px">
                  <t-option value="formula" label="配方" />
                  <t-option value="material" label="原料" />
                  <t-option value="weekly-report" label="周报" />
                  <t-option value="monthly-report" label="月报" />
                </t-select>
              </t-form-item>
              <t-form-item label="导出格式">
                <t-select v-model="tmplEditForm.type" :popup-props="{ appendToBody: true }" style="width: 140px">
                  <t-option value="pdf" label="PDF" />
                  <t-option value="excel" label="Excel" />
                </t-select>
              </t-form-item>
            </div>
          </t-form>
        </div>

        <!-- 选择导出内容 -->
        <div class="tmpl-edit-section">
          <div class="tmpl-edit-section-title">
            <span>选择导出内容</span>
            <div class="tmpl-field-actions">
              <t-button size="small" variant="text" @click="editSelectAllFields">全选</t-button>
              <t-button size="small" variant="text" @click="editDeselectAllFields">全不选</t-button>
              <t-button size="small" variant="text" @click="editResetFieldsToDefault">恢复默认</t-button>
            </div>
          </div>
          <div class="tmpl-field-groups-scroll">
            <div v-for="group in tmplEditFieldGroups" :key="group.groupName" class="tmpl-edit-field-group">
              <div class="tmpl-group-header">
                <span class="tmpl-group-required-mark" :class="group.required ? 'is-required' : ''">
                  {{ group.required ? '\u25C6' : '\u25C7' }}
                </span>
                <span class="tmpl-group-name">{{ group.groupName }}</span>
                <t-tag v-if="group.required" theme="danger" variant="light" size="small">必选</t-tag>
              </div>
              <div class="tmpl-group-fields">
                <t-checkbox v-for="field in group.fields" :key="field.key"
                  :model-value="tmplSelectedFields.has(field.key)" :disabled="group.required"
                  @change="(val: boolean) => editToggleField(field.key, val)">
                  {{ field.label }}
                </t-checkbox>
              </div>
            </div>
          </div>
        </div>

        <!-- 格式设置 -->
        <div class="tmpl-edit-section">
          <div class="tmpl-edit-section-title">格式设置</div>
          <div class="tmpl-format-grid">
            <div class="tmpl-format-item">
              <label class="tmpl-format-label">页面方向</label>
              <t-select v-model="tmplEditFormat.orientation" :popup-props="{ appendToBody: true }" style="width: 120px">
                <t-option value="portrait" label="纵向" />
                <t-option value="landscape" label="横向" />
              </t-select>
            </div>
            <div class="tmpl-format-item">
              <label class="tmpl-format-label">纸张大小</label>
              <t-select v-model="tmplEditFormat.pageSize" :popup-props="{ appendToBody: true }" style="width: 110px">
                <t-option value="A4" label="A4" />
                <t-option value="A3" label="A3" />
                <t-option value="Letter" label="Letter" />
              </t-select>
            </div>
            <div class="tmpl-format-item">
              <label class="tmpl-format-label">字号</label>
              <t-select v-model="tmplEditFormat.fontSize" :popup-props="{ appendToBody: true }" style="width: 100px">
                <t-option :value="10" label="10pt" />
                <t-option :value="11" label="11pt" />
                <t-option :value="12" label="12pt" />
                <t-option :value="14" label="14pt" />
                <t-option :value="16" label="16pt" />
              </t-select>
            </div>
            <div class="tmpl-format-item tmpl-format-item--check">
              <t-checkbox v-model="tmplEditFormat.includeHeader">显示页眉</t-checkbox>
            </div>
            <div class="tmpl-format-item tmpl-format-item--check">
              <t-checkbox v-model="tmplEditFormat.includeFooter">显示页脚</t-checkbox>
            </div>
          </div>
        </div>
      </div>
    </t-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useExportStore } from '@/stores/export';
import { useAuthStore } from '@/stores/auth';
import { MessagePlugin } from 'tdesign-vue-next';
import { formulaApi } from '@/api/formula';
import { materialApi } from '@/api/material';
import type { ExportJob, ExportTemplate, ExportStatistics } from '@/api/export';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import {
  EXPORT_FIELD_CONFIG, CATEGORY_META, getDefaultFields, getTotalFieldCount,
  getSelectedFieldCount, getAllFieldKeys, getRequiredFieldKeys,
} from '@/utils/fieldConfig';
import type { FieldGroup } from '@/utils/fieldConfig';

const exportStore = useExportStore();
const authStore = useAuthStore();
const isAdmin = computed(() => authStore.user?.role === 'admin');
const initialized = ref(false);
const activeTab = ref('export');

const exportTabs = [
  { value: 'export', label: '导出任务', iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>' },
  { value: 'templates', label: '模板配置', iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>' },
  { value: 'template-admin', label: '模板管理', iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>' },
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
const searchKeyword = ref('');

const templateDialogForm = reactive({ name: '', type: 'excel' as string, category: 'formula' as string, description: '', isDefault: false });

// ====== 模板管理（Admin） ======
const showTemplateEditDialog = ref(false);
const editingTemplateId = ref<string | null>(null);
const tmplFilter = reactive({ category: '' as string, format: '' as string });
const adminTemplateList = ref<ExportTemplate[]>([]);
const adminTemplatePage = ref(1);
const adminTemplatePageSize = ref(10);
const adminTemplateTotal = ref(0);

const tmplEditForm = reactive({
  name: '',
  description: '',
  category: 'formula' as string,
  type: 'excel' as string,
  isDefault: false,
});

const tmplEditFormat = reactive({
  orientation: 'portrait' as string,
  pageSize: 'A4',
  fontSize: 12 as number,
  includeHeader: true,
  includeFooter: true,
});

const tmplSelectedFields = ref<Set<string>>(new Set());

const tmplEditDialogTitle = computed(() => {
  if (editingTemplateId.value) return '编辑模板';
  return '创建导出模板';
});

const tmplEditFieldGroups = computed(() => EXPORT_FIELD_CONFIG[tmplEditForm.category] || []);

const adminTemplateColumns = [
  { colKey: 'name', title: '模板名称', width: 200, ellipsis: true, cell: 'name' },
  { colKey: 'category', title: '类别', width: 100, cell: 'category' },
  { colKey: 'type', title: '格式', width: 90, cell: 'type' },
  { colKey: 'fieldCount', title: '字段数', width: 80, align: 'center' },
  {
    colKey: 'isDefault', title: '默认', width: 70, align: 'center',
    cell: (_h: unknown, { row }: { row: ExportTemplate }) => row.isDefault === 1 ? '\u2713' : '--',
  },
  { colKey: 'createdAt', title: '创建时间', width: 170, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 280, cell: 'operation', align: 'center' },
];

const adminTemplatePagination = computed(() => ({
  current: adminTemplatePage.value,
  pageSize: adminTemplatePageSize.value,
  total: adminTemplateTotal.value,
  showPageSize: false,
  showJumper: false,
}));

function getTemplateFieldCount(template: ExportTemplate): number {
  const cfg = template.formatConfig;
  if (!cfg || typeof cfg !== 'object') return 0;
  const fields = (cfg as Record<string, unknown>).selectedFields;
  if (Array.isArray(fields)) return fields.length;
  return 0;
}

async function fetchAdminTemplateList() {
  const params: Record<string, unknown> = {
    page: adminTemplatePage.value,
    pageSize: adminTemplatePageSize.value,
  };
  if (tmplFilter.category) params.category = tmplFilter.category;
  if (tmplFilter.format) params.type = tmplFilter.format;
  await exportStore.fetchTemplates(params);
  adminTemplateList.value = exportStore.templates;
  adminTemplateTotal.value = exportStore.templateTotal;
}

function onAdminTemplatePageChange(pageInfo: { current: number; pageSize: number }) {
  adminTemplatePage.value = pageInfo.current;
  adminTemplatePageSize.value = pageInfo.pageSize;
  fetchAdminTemplateList();
}

function openCreateTemplateDialog() {
  editingTemplateId.value = null;
  resetTemplateEditForm();
  tmplEditForm.category = 'formula';
  tmplSelectedFields.value = new Set(getDefaultFields('formula'));
  showTemplateEditDialog.value = true;
}

function openEditTemplateDialog(template: ExportTemplate) {
  editingTemplateId.value = template.templateId;
  tmplEditForm.name = template.name;
  tmplEditForm.description = template.description || '';
  tmplEditForm.category = template.category || 'formula';
  tmplEditForm.type = template.type;
  tmplEditForm.isDefault = template.isDefault === 1;

  const cfg = template.formatConfig && typeof template.formatConfig === 'object'
    ? template.formatConfig as Record<string, unknown>
    : {};
  tmplEditFormat.orientation = (cfg.orientation as string) || 'portrait';
  tmplEditFormat.pageSize = (cfg.pageSize as string) || 'A4';
  tmplEditFormat.fontSize = (cfg.fontSize as number) || 12;
  tmplEditFormat.includeHeader = ((cfg.includeHeader as boolean) ?? true);
  tmplEditFormat.includeFooter = ((cfg.includeFooter as boolean) ?? true);

  const fields = (cfg.selectedFields as string[]) || getDefaultFields(tmplEditForm.category);
  tmplSelectedFields.value = new Set(fields);

  showTemplateEditDialog.value = true;
}

function resetTemplateEditForm() {
  tmplEditForm.name = '';
  tmplEditForm.description = '';
  tmplEditForm.category = 'formula';
  tmplEditForm.type = 'excel';
  tmplEditForm.isDefault = false;
  tmplEditFormat.orientation = 'portrait';
  tmplEditFormat.pageSize = 'A4';
  tmplEditFormat.fontSize = 12;
  tmplEditFormat.includeHeader = true;
  tmplEditFormat.includeFooter = true;
  tmplSelectedFields.value = new Set();
  editingTemplateId.value = null;
}

function editToggleField(key: string, value: boolean) {
  if (value) {
    tmplSelectedFields.value.add(key);
  } else {
    tmplSelectedFields.value.delete(key);
  }
  tmplSelectedFields.value = new Set(tmplSelectedFields.value);
}

function editSelectAllFields() {
  tmplSelectedFields.value = new Set(getAllFieldKeys(tmplEditForm.category));
}

function editDeselectAllFields() {
  const requiredKeys = getRequiredFieldKeys(tmplEditForm.category);
  tmplSelectedFields.value = new Set(requiredKeys);
}

function editResetFieldsToDefault() {
  tmplSelectedFields.value = new Set(getDefaultFields(tmplEditForm.category));
}

async function handleSaveEditTemplate() {
  if (!tmplEditForm.name.trim()) {
    MessagePlugin.warning('请输入模板名称');
    return;
  }
  const formatConfig = {
    selectedFields: Array.from(tmplSelectedFields.value),
    requiredFields: getRequiredFieldKeys(tmplEditForm.category),
    exportFormat: tmplEditForm.type,
    orientation: tmplEditFormat.orientation,
    pageSize: tmplEditFormat.pageSize,
    fontSize: tmplEditFormat.fontSize,
    includeHeader: tmplEditFormat.includeHeader,
    includeFooter: tmplEditFormat.includeFooter,
  };
  const payload = {
    name: tmplEditForm.name.trim(),
    description: tmplEditForm.description.trim() || '',
    category: tmplEditForm.category,
    type: tmplEditForm.type,
    formatConfig,
    isDefault: tmplEditForm.isDefault,
  };
  let result: { success: boolean; message?: string };
  if (editingTemplateId.value) {
    result = await exportStore.updateTemplate(editingTemplateId.value, payload);
  } else {
    result = await exportStore.createTemplate(payload);
  }
  if (result.success) {
    MessagePlugin.success(editingTemplateId.value ? '模板已更新' : '模板已创建');
    showTemplateEditDialog.value = false;
    await fetchAdminTemplateList();
  } else {
    MessagePlugin.error(result.message || '操作失败');
  }
}

async function handleCopyTemplate(template: ExportTemplate) {
  const newName = template.name.includes(' \u526F\u672C')
    ? template.name.replace(/ \u526F\u672C.*$/, '') + ' (\u526F\u672C2)'
    : template.name + ' (\u526F\u672C)';
  const cfg = template.formatConfig && typeof template.formatConfig === 'object'
    ? { ...(template.formatConfig as Record<string, unknown>) }
    : {};
  const result = await exportStore.createTemplate({
    name: newName,
    description: (template.description || '') + ' [\u526F\u672C]',
    category: template.category || 'formula',
    type: template.type,
    formatConfig: {
      ...cfg,
      selectedFields: (cfg.selectedFields as string[]).length > 0
        ? (cfg.selectedFields as string[])
        : getDefaultFields(template.category || 'formula'),
      requiredFields: getRequiredFieldKeys(template.category || 'formula'),
    },
    isDefault: false,
  });
  if (result.success) {
    MessagePlugin.success('模板已复制');
    await fetchAdminTemplateList();
  } else {
    MessagePlugin.error(result.message || '复制失败');
  }
}

async function handleAdminDeleteTemplate(templateId: string) {
  const result = await exportStore.deleteTemplate(templateId);
  if (result.success) {
    MessagePlugin.success('模板已删除');
    await fetchAdminTemplateList();
  } else {
    MessagePlugin.error(result.message || '删除失败');
  }
}

async function handleSetDefault(templateId: string) {
  const result = await exportStore.updateTemplate(templateId, { isDefault: true });
  if (result.success) {
    MessagePlugin.success('已设为默认模板');
    await fetchAdminTemplateList();
  } else {
    MessagePlugin.error(result.message || '设置失败');
  }
}

const templateDrawerVisible = ref(false);
const drawerCategory = ref('');
const previewVisible = ref(false);
const previewLoading = ref(false);
const previewFormat = ref('pdf');
const previewDataIndex = ref(0);
const previewRawData = ref<Record<string, unknown>>({});
const previewDataList = ref<Array<{ label: string; id: string }>>([]);

const formConfig = reactive({
  exportFormat: 'pdf' as string,
  defaultTemplateId: '' as string,
  orientation: 'portrait' as string,
  pageSize: 'A4' as string,
  fontSize: 12 as number,
  includeHeader: true,
  includeFooter: true,
});

const selectedFields = ref<Set<string>>(new Set());

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
      badgeBg: 'var(--color-emerald-50)',
      iconBg: 'var(--color-info-bg)',
      iconColor: 'var(--color-info)',
      iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    },
    {
      label: '分享链接',
      value: String(s.activeShares),
      unit: '条',
      badge: s.activeShares > 0 ? `${s.activeShares} 活跃` : '无',
      badgeColor: 'var(--color-primary)',
      badgeBg: 'var(--color-emerald-50)',
      iconBg: 'var(--color-emerald-50)',
      iconColor: 'var(--color-primary)',
      iconPath: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
    },
    {
      label: '导出模板',
      value: String(s.templateCount),
      unit: '个',
      badge: '可用',
      badgeColor: 'var(--color-text-placeholder)',
      badgeBg: 'var(--color-bg-hover)',
      iconBg: 'var(--color-warning-bg)',
      iconColor: 'var(--color-warning)',
      iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    },
    {
      label: '完成率',
      value: s.totalJobs > 0 ? `${Math.round((s.completedJobs / s.totalJobs) * 100)}%` : '—',
      unit: '',
      badge: s.failedJobs > 0 ? `${s.failedJobs} 失败` : '正常',
      badgeColor: s.failedJobs > 0 ? 'var(--color-danger)' : 'var(--color-primary)',
      badgeBg: s.failedJobs > 0 ? 'var(--color-danger-bg)' : 'var(--color-primary-bg)',
      iconBg: 'var(--color-emerald-50)',
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
  '自定义导出模板，一键生成标准化文档',
];
const assistantMessage = computed(() => assistantMessages[Math.floor(Date.now() / 8000) % assistantMessages.length]);

function handleTabChange(tab: string) {
  if (tab === 'dashboard') {
    loadStatistics();
    exportStore.fetchJobs({ page: 1 });
  } else if (tab === 'export') {
    exportStore.fetchJobs({ page: 1 });
  } else if (tab === 'templates') {
    exportStore.fetchTemplates({ pageSize: 100 });
  } else if (tab === 'template-admin') {
    fetchAdminTemplateList();
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
  { colKey: 'status', title: '格式/状态', width: 130, cell: 'status' },
  { colKey: 'createdAt', title: '创建时间', width: 170, cell: 'createdAt' },
  { colKey: 'errorMessage', title: '错误信息', ellipsis: true },
  { colKey: 'operation', title: '操作', width: 80, cell: 'operation', align: 'center' },
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

async function handleOpenTemplateDialog(template: ExportTemplate | null) {
  if (template) {
    editingTemplate.value = template;
    templateDialogForm.name = template.name;
    templateDialogForm.type = template.type;
    templateDialogForm.category = template.category || 'formula';
    templateDialogForm.description = template.description || '';
    templateDialogForm.isDefault = !!template.isDefault;
  } else {
    editingTemplate.value = null;
    resetTemplateDialogForm();
  }
  showTemplateDialog.value = true;
}

function resetTemplateDialogForm() {
  templateDialogForm.name = '';
  templateDialogForm.type = 'excel';
  templateDialogForm.category = drawerCategory.value || 'formula';
  templateDialogForm.description = '';
  templateDialogForm.isDefault = false;
  editingTemplate.value = null;
}

async function handleSaveTemplate() {
  if (!templateDialogForm.name.trim()) { MessagePlugin.warning('请输入模板名称'); return; }
  const config = editingTemplate.value?.formatConfig || {};
  const payload = {
    name: templateDialogForm.name.trim(),
    type: templateDialogForm.type,
    category: editingTemplate.value?.category || templateDialogForm.category,
    description: templateDialogForm.description.trim() || '',
    formatConfig: JSON.stringify(config),
    isDefault: templateDialogForm.isDefault ? 1 : 0,
  };
  let result: { success: boolean; message?: string; data?: Record<string, unknown> };
  if (editingTemplate.value) {
    result = await exportStore.updateTemplate(editingTemplate.value.templateId, payload);
  } else {
    result = await exportStore.createTemplate(payload);
  }
  if (result.success) {
    MessagePlugin.success(editingTemplate.value ? '模板已更新' : '模板已创建');
    showTemplateDialog.value = false;
    await exportStore.fetchTemplates({ category: drawerCategory.value || undefined, pageSize: 100 });
  } else {
    MessagePlugin.error(result.message || '操作失败');
  }
}

async function handleDeleteTemplate(templateId: string) {
  const result = await exportStore.deleteTemplate(templateId);
  if (result.success) {
    MessagePlugin.success('模板已删除');
    await exportStore.fetchTemplates({ category: drawerCategory.value || undefined, pageSize: 100 });
  } else {
    MessagePlugin.error(result.message || '删除失败');
  }
}

async function handleDeleteSelectedTemplate() {
  if (!formConfig.defaultTemplateId) return;
  await handleDeleteTemplate(formConfig.defaultTemplateId);
  formConfig.defaultTemplateId = '';
}

function handleAddTemplate() {
  resetTemplateDialogForm();
  editingTemplate.value = null;
  showTemplateDialog.value = true;
}

// ====== Drawer 模板配置 ======
const drawerSize = computed(() => previewVisible.value ? '900px' : '600px');

const drawerTitle = computed(() => {
  const meta = CATEGORY_META[drawerCategory.value];
  if (!meta) return '配置模板';
  return `配置模板 - ${meta.name}`;
});

const categoryCards = computed(() => {
  const categories = ['formula', 'material', 'weekly-report', 'monthly-report'];
  return categories.map((cat) => {
    const meta = CATEGORY_META[cat];
    const templates = exportStore.templates.filter((t: ExportTemplate) => t.category === cat);
    const defaultTemplate = templates.find((t: ExportTemplate) => t.isDefault === 1);
    const totalFields = getTotalFieldCount(cat);
    const defaultTemplateFields = defaultTemplate?.formatConfig && typeof defaultTemplate.formatConfig === 'object' && 'selectedFields' in defaultTemplate.formatConfig
      ? (defaultTemplate.formatConfig as Record<string, unknown>).selectedFields as string[] || []
      : getDefaultFields(cat);
    return {
      category: cat,
      name: meta?.name || cat,
      categoryLabel: CATEGORY_MAP[cat] || cat,
      iconSvg: getCategoryIcon(cat),
      iconBg: getCategoryIconBg(cat),
      iconColor: getCategoryIconColor(cat),
      templateCount: templates.length,
      defaultFormat: defaultTemplate ? defaultTemplate.type.toUpperCase() : '--',
      selectedFieldCount: getSelectedFieldCount(cat, defaultTemplateFields),
      totalFieldCount: totalFields,
    };
  });
});

const drawerTemplates = computed(() =>
  exportStore.templates.filter((t: ExportTemplate) => t.category === drawerCategory.value));

const drawerFieldGroups = computed(() => EXPORT_FIELD_CONFIG[drawerCategory.value] || []);

const previewFields = computed(() => {
  const groups = EXPORT_FIELD_CONFIG[drawerCategory.value];
  if (!groups) return [];
  const result: Array<{ key: string; label: string; value: string }> = [];
  for (const group of groups) {
    for (const field of group.fields) {
      if (selectedFields.value.has(field.key)) {
        const value = previewRawData.value[field.key];
        result.push({
          key: field.key,
          label: field.label,
          value: value !== undefined && value !== null ? String(value) : '--',
        });
      }
    }
  }
  return result;
});

function openTemplateDrawer(category: string) {
  drawerCategory.value = category;
  previewVisible.value = false;
  previewRawData.value = {};
  previewDataList.value = [];
  previewDataIndex.value = 0;

  const templates = exportStore.templates.filter((t: ExportTemplate) => t.category === category);
  const defaultTemplate = templates.find((t: ExportTemplate) => t.isDefault === 1) || templates[0];
  if (defaultTemplate) {
    const cfg = defaultTemplate.formatConfig || {};
    formConfig.exportFormat = (cfg as Record<string, unknown>).exportFormat as string || defaultTemplate.type || 'pdf';
    formConfig.defaultTemplateId = defaultTemplate.templateId;
    formConfig.orientation = (cfg as Record<string, unknown>).orientation as string || 'portrait';
    formConfig.pageSize = (cfg as Record<string, unknown>).pageSize as string || 'A4';
    formConfig.fontSize = (cfg as Record<string, unknown>).fontSize as number || 12;
    formConfig.includeHeader = ((cfg as Record<string, unknown>).includeHeader as boolean) ?? true;
    formConfig.includeFooter = ((cfg as Record<string, unknown>).includeFooter as boolean) ?? true;
    const fields = (cfg as Record<string, unknown>).selectedFields as string[] || getDefaultFields(category);
    selectedFields.value = new Set(fields);
  } else {
    formConfig.exportFormat = 'pdf';
    formConfig.defaultTemplateId = '';
    formConfig.orientation = 'portrait';
    formConfig.pageSize = 'A4';
    formConfig.fontSize = 12;
    formConfig.includeHeader = true;
    formConfig.includeFooter = true;
    selectedFields.value = new Set(getDefaultFields(category));
  }

  templateDrawerVisible.value = true;
}

function closeTemplateDrawer() {
  templateDrawerVisible.value = false;
  previewVisible.value = false;
  drawerCategory.value = '';
}

function toggleField(key: string, value: boolean) {
  if (value) {
    selectedFields.value.add(key);
  } else {
    selectedFields.value.delete(key);
  }
  selectedFields.value = new Set(selectedFields.value);
}

function selectAllFields() {
  const allKeys = getAllFieldKeys(drawerCategory.value);
  selectedFields.value = new Set(allKeys);
}

function deselectAllFields() {
  const requiredKeys = getRequiredFieldKeys(drawerCategory.value);
  selectedFields.value = new Set(requiredKeys);
}

function resetFieldsToDefault() {
  const defaults = getDefaultFields(drawerCategory.value);
  selectedFields.value = new Set(defaults);
}

async function handleSaveAndPreview() {
  await handleSaveTemplateConfig(true);
  await fetchPreviewDataList();
  previewVisible.value = true;
}

async function handleSaveTemplateConfig(silent = false) {
  if (!formConfig.defaultTemplateId) {
    if (!silent) MessagePlugin.warning('请选择默认模板');
    return;
  }
  const config = {
    selectedFields: Array.from(selectedFields.value),
    requiredFields: getRequiredFieldKeys(drawerCategory.value),
    exportFormat: formConfig.exportFormat,
    orientation: formConfig.orientation,
    pageSize: formConfig.pageSize,
    fontSize: formConfig.fontSize,
    includeHeader: formConfig.includeHeader,
    includeFooter: formConfig.includeFooter,
  };
  const result = await exportStore.updateTemplate(formConfig.defaultTemplateId, {
    formatConfig: config,
    isDefault: 1,
  } as Parameters<typeof exportStore.updateTemplate>[1]);
  if (result.success) {
    if (!silent) MessagePlugin.success('模板配置已保存');
    await exportStore.fetchTemplates({ category: drawerCategory.value, pageSize: 100 });
  } else {
    if (!silent) MessagePlugin.error(result.message || '保存失败');
  }
}

async function fetchPreviewDataList() {
  previewLoading.value = true;
  previewDataList.value = [];
  try {
    if (drawerCategory.value === 'formula') {
      const res = await formulaApi.getList({ page: 1, pageSize: 10 });
      previewDataList.value = (res.list || []).map((item: { id: string; name: string }) => ({
        id: item.id,
        label: item.name,
      }));
    } else if (drawerCategory.value === 'material') {
      const res = await materialApi.getList({ page: 1, pageSize: 10 });
      previewDataList.value = (res.list || []).map((item: { id: string; name: string }) => ({
        id: item.id,
        label: item.name,
      }));
    } else {
      previewDataList.value = [];
    }
    if (previewDataList.value.length > 0) {
      previewDataIndex.value = 0;
      await fetchPreviewData();
    }
  } catch {
    previewDataList.value = [];
  } finally {
    previewLoading.value = false;
  }
}

async function fetchPreviewData() {
  const item = previewDataList.value[previewDataIndex.value];
  if (!item) return;
  previewLoading.value = true;
  try {
    if (drawerCategory.value === 'formula') {
      const res = await formulaApi.getById(item.id);
      previewRawData.value = (res as Record<string, unknown>) || {};
    } else if (drawerCategory.value === 'material') {
      const res = await materialApi.getById(item.id);
      previewRawData.value = (res as Record<string, unknown>) || {};
    } else {
      previewRawData.value = {
        periodRange: '2026-05-19 ~ 2026-05-25',
        generatedAt: new Date().toISOString(),
        newFormulasCount: '12',
        newMaterialsCount: '5',
        exportCount: '28',
        topFormulas: '枸杞养生茶、当归四物汤...',
        salesmanStats: '张三(8)、李四(6)...',
        dataCutoffTime: new Date().toISOString(),
        generatedBy: previewRawData.value.generatedBy || 'admin',
      };
    }
  } catch {
    previewRawData.value = {};
  } finally {
    previewLoading.value = false;
  }
}

function handleBackToEdit() {
  previewVisible.value = false;
}

function getCategoryIcon(cat: string): string {
  const icons: Record<string, string> = {
    formula: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    material: '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'weekly-report': '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
    'monthly-report': '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  };
  return icons[cat] || '';
}

function getCategoryIconBg(cat: string): string {
  const bgs: Record<string, string> = { formula: 'var(--color-info-bg)', material: 'var(--color-warning-bg)', 'weekly-report': 'var(--color-emerald-50)', 'monthly-report': 'var(--color-info-bg)' };
  return bgs[cat] || 'var(--color-bg-hover)';
}

function getCategoryIconColor(cat: string): string {
  const colors: Record<string, string> = { formula: 'var(--color-info)', material: 'var(--color-warning)', 'weekly-report': 'var(--color-emerald)', 'monthly-report': 'var(--color-info)' };
  return colors[cat] || 'var(--color-text-secondary)';
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
  await Promise.all([exportStore.fetchJobs({ page: 1 }), loadStatistics()]);
  initialized.value = true;
});

onBeforeUnmount(() => {
  showTemplateDialog.value = false;
  showTemplateEditDialog.value = false;
  templateDrawerVisible.value = false;
  previewVisible.value = false;
});
</script>

<style scoped lang="scss">
.export-center {

  .content-card {
    border-radius: var(--radius-5xl) !important;
    overflow: hidden;
    box-shadow: var(--shadow-elevation-1);
    border: 1px solid var(--color-border-light) !important;
    transition: all $transition-slow;

    &:hover {
      box-shadow: var(--shadow-lg);
    }

    :deep(.t-card__body) {
      padding: 0 !important;
    }

    .export-body {
      display: flex;
      flex-direction: column;
      gap: 0;
      min-height: 480px;
    }

    .export-tabs-bar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 20px 32px 0;
      background: transparent;
      border-bottom: 1px solid var(--color-bg-page);
    }

    .horizontal-tab {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: 10px 20px;
      border-radius: 10px 10px 0 0;
      cursor: pointer;
      transition: all $transition-normal;
      color: var(--color-text-secondary);
      font-size: 14px;
      font-weight: 500;
      border: 1px solid transparent;
      border-bottom: none;
      margin-bottom: -1px;
      white-space: nowrap;
      position: relative;
      z-index: 1;

      .horizontal-tab-icon {
        width: 18px;
        height: 18px;
        flex-shrink: 0;
      }

      &:hover {
        color: var(--color-text-primary);
        background: rgba(0, 0, 0, 0.03);
      }

      &.active {
        color: var(--color-primary);
        background: var(--color-bg-container);
        border-color: var(--color-border);
        border-bottom-color: var(--color-bg-container);
        font-weight: 600;
        box-shadow: var(--shadow-xs);
      }

      .horizontal-tab-label {
        flex: 1;
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
          box-shadow: 0 0 0 3px var(--color-info-bg);
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
      background: var(--color-bg-container);
      padding: 24px;
      border-radius: var(--radius-4xl);
      border: 1px solid var(--color-border-light);
      box-shadow: var(--shadow-sm);
      transition: all $transition-slow;
      animation: dashboard-fade-in 0.5s ease forwards;
      opacity: 0;

      &:hover {
        border-color: var(--color-info-border);
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
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
        color: var(--color-text-primary);
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
      border: 1px solid var(--color-border-light);
      background: var(--color-bg-container);
      cursor: pointer;
      transition: all $transition-normal;

      &:hover {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-brand-sm);
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
      color: var(--color-text-primary);
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
    background: var(--color-warning-bg);
    padding: 4px var(--space-2-5);
    border-radius: $radius-sm;
    border: 1px solid var(--color-warning-light);
  }

  .config-display-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 12px;

    .config-info-card {
      background: var(--color-bg-page);
      border: 1px solid var(--color-border-light);
      border-radius: 12px;
      padding: 20px;
      transition: all 0.2s;

      &:hover {
        border-color: var(--color-border);
        box-shadow: var(--shadow-xs);
      }

      &.is-editing {
        background: var(--color-info-bg);
        border-color: var(--color-info-border);

        .config-info-label {
          color: var(--color-info-dark);
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
      color: var(--color-text-primary);

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
      border-radius: $radius-md;
      background: var(--color-bg-container);
      color: var(--color-text-secondary);
      font-size: 13px;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        border-color: var(--color-info);
        color: var(--color-info);
        background: var(--color-info-bg);
      }
    }

    .cancel-btn {
      padding: 8px 20px;
      border: 1px solid var(--color-border);
      border-radius: $radius-md;
      background: var(--color-bg-container);
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
      border-radius: $radius-md;
      background: var(--color-primary);
      color: $text-white;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: var(--color-primary-light);
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

  .create-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px var(--space-4-5);
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: var(--color-text-white);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-normal;
    white-space: nowrap;
    box-shadow: $shadow-brand-sm;

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px $overlay-emerald-35;
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
    background: var(--color-bg-container);
    border-radius: $radius-3xl;
    border: 1px solid var(--color-border-light);
    border-radius: $radius-3xl;
    border: 1px solid var(--color-border-light);
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
      background: var(--color-emerald-50);
    }
  }

  .format-status-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .action-dropdown-btn {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      background: var(--color-bg-page);
      border-color: var(--color-border);
      color: var(--color-text-primary);
    }
  }

  .action-menu {
    min-width: 130px;
    padding: 4px 0;

    .action-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: var(--color-text-primary);
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;

      &:hover { background: $border-color-light; }

      svg { flex-shrink: 0; }
    }

    .action-menu-item--warning {
      color: var(--color-warning);
      &:hover { background: var(--color-warning-light); }
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
        border-color: var(--color-border);
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
        color: $text-white;
        border-color: var(--color-primary);
        font-weight: 600;
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
      color: var(--color-text-placeholder);
      font-size: 14px;
      user-select: none;
    }
  }

  .activity-card {
    background-color: var(--color-bg-container);
    border-radius: var(--radius-4xl);
    padding: 32px;
    box-shadow: var(--shadow-elevation-1);
    border: 1px solid var(--color-border-light);

    &--assistant {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      border: none;
      color: var(--color-text-white);
      position: relative;
      overflow: hidden;
      box-shadow: $overlay-emerald-15 $overlay-emerald-04;
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
      border: 1.5px solid var(--color-info-medium);
      background: var(--color-info-bg);
      color: var(--color-info);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover:not(:disabled) {
        background: var(--color-info-medium);
        border-color: var(--color-info);
        color: var(--color-info-dark);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
        border-color: var(--color-border-light);
        color: var(--color-text-placeholder);
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
      background: var(--color-border-light);
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
      background: var(--color-emerald-50);
      color: var(--color-primary);
    }

    &--warning {
      background: var(--color-warning-bg);
      color: var(--color-warning);
    }

    &--info {
      background: var(--color-info-bg);
      color: var(--color-info);
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
    border-radius: $radius-2xl;
    border: 2px solid var(--overlay-white-35);
    background: var(--overlay-white-15);
    color: var(--color-text-white);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    backdrop-filter: blur(8px);
    transition: all $transition-normal;

    &:hover {
      background: $overlay-white-25;
      border-color: $overlay-white-50;
      transform: translateY(-1px);
    }
  }

  .assistant-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid $overlay-white-15;
  }

  .assistant-avatar-group {
    display: flex;
    gap: var(--space-1-5);
  }

  .assistant-avatar {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--overlay-white-20);
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

// ====== 模板管理卡片 ======
.section-header-enhanced {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);

  .section-title-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .section-title-icon {
    flex-shrink: 0;
  }

  .section-title-text {
    font-size: var(--font-size-lg);
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .section-title-count {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px var(--space-4);

  .empty-icon-wrap {
    margin-bottom: var(--space-3);
  }

  .empty-text {
    font-size: var(--font-size-md);
    color: var(--color-text-secondary);
    margin: 0 0 var(--space-1);
  }

  .empty-hint {
    font-size: var(--font-size-sm);
    color: var(--color-text-placeholder);
    margin: 0;
  }
}

.template-category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.template-category-card {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: var(--shadow-md);
    border-color: var(--color-primary-border);
  }
}

.tcc-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-2);
}

.tcc-icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.tcc-title-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tcc-title {
  font-size: var(--font-size-md);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
  line-height: 1.3;
}

.tcc-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
}

.tcc-body {
  padding: var(--space-2) var(--space-4);
  flex: 1;
}

.tcc-stat-row {
  display: flex;
  gap: var(--space-4);
}

.tcc-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tcc-stat-value {
  font-size: var(--font-size-lg);
  font-weight: 700;
  color: var(--color-text-primary);
}

.tcc-stat-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
}

.tcc-footer {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border-light);
}

.tcc-config-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  padding: var(--space-1-5) var(--space-4);
  background: var(--color-primary);
  color: $text-white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: var(--color-primary-light);
    box-shadow: $shadow-brand-sm;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
}

// ====== 模板 Drawer ======
.template-drawer-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: var(--space-4);

  &.with-preview {
    flex-direction: row;
    gap: 0;
    padding-bottom: 0;
    height: 100%;
    overflow: hidden;

    .td-config-panel {
      width: 340px;
      min-width: 340px;
      flex-shrink: 0;
      overflow-y: auto;
      padding-right: var(--space-3);
    }

    .template-preview-panel {
      flex: 1;
      min-width: 320px;
    }
  }
}

.td-config-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);

  &.collapsed {
    gap: var(--space-2);

    .td-section {
      padding: var(--space-2);
    }

    .td-section-header {
      margin-bottom: var(--space-1);
    }

    .td-config-form {
      gap: var(--space-1);
    }

    .td-form-row {
      flex-wrap: wrap;
    }

    .td-field-groups {
      max-height: 200px;
    }

    .td-actions {
      padding-top: var(--space-1);
    }
  }
}

.template-drawer--with-preview {
  :deep(.t-drawer__body) {
    display: flex !important;
    flex-direction: row !important;
    padding: var(--space-4) !important;
    overflow: hidden !important;
  }
}

.td-section {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-3);
}

.td-section-header {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  margin-bottom: var(--space-3);
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.td-section-actions {
  margin-left: auto;
  display: flex;
  gap: var(--space-1);
}

.td-config-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.td-form-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.td-form-row--checks {
  gap: var(--space-4);
}

.td-form-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  white-space: nowrap;
  min-width: 80px;
}

.td-form-row-inner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
}

.td-add-btn {
  padding: var(--space-1) var(--space-2-5);
  border: 1px solid var(--color-primary);
  color: var(--color-primary);
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--color-primary-bg);
  }
}

.td-delete-btn {
  padding: var(--space-1) var(--space-2-5);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
  background: transparent;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: var(--color-danger-bg);
  }
}

.td-field-groups {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  max-height: 360px;
  overflow-y: auto;
}

.td-field-group {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
}

.td-field-group-title {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.td-required-mark {
  color: var(--color-danger);
  font-size: var(--font-size-xs);
}

.td-optional-mark {
  color: var(--color-text-placeholder);
  font-size: var(--font-size-xs);
}

.td-required-badge {
  font-size: var(--font-size-2xs);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  padding: 1px 6px;
  border-radius: var(--radius-xs);
}

.td-field-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.td-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border-light);
}

// ====== 预览面板 ======
.template-preview-panel {
  flex: 1;
  border-left: 1px solid var(--color-border-light);
  display: flex;
  flex-direction: column;
  background: var(--color-bg-primary);
  overflow: hidden;

  .tpp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  .tpp-header-left {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .tpp-controls {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-2) var(--space-4);
    border-bottom: 1px solid var(--color-border-light);
    flex-shrink: 0;
  }

  .tpp-control-item {
    display: flex;
    flex-direction: column;
    gap: 2px;

    label {
      font-size: var(--font-size-2xs);
      color: var(--color-text-placeholder);
    }
  }

  .tpp-content {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-3) var(--space-4);
  }

  .tpp-loading {
    display: flex;
    justify-content: center;
    padding: var(--space-8);
  }

  .tpp-empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;

    p {
      color: var(--color-text-placeholder);
      font-size: var(--font-size-sm);
    }
  }

  .tpp-preview-table {
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--font-size-sm);
    }

    th {
      background: var(--color-bg-secondary);
      padding: var(--space-1-5) var(--space-2);
      text-align: left;
      font-weight: 500;
      color: var(--color-text-secondary);
      border-bottom: 1px solid var(--color-border-light);
    }

    td {
      padding: var(--space-1-5) var(--space-2);
      border-bottom: 1px solid var(--color-border-light);
    }
  }

  .tpp-field-label {
    color: var(--color-text-secondary);
    font-weight: 500;
  }

  .tpp-field-value {
    color: var(--color-text-primary);
    word-break: break-all;
  }

  .tpp-footer {
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--color-border-light);
    display: flex;
    justify-content: flex-end;
    flex-shrink: 0;
  }
}

// ====== 模板管理（Admin） ======
.tmpl-admin-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
  gap: var(--space-2);

  .tmpl-toolbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .tmpl-toolbar-right {
    display: flex;
    align-items: center;
  }
}

.tmpl-name-cell {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);

  .tmpl-name-text {
    font-weight: 500;
    color: var(--color-text-primary);
  }
}

.readonly-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
  padding: 2px 8px;
  background: var(--color-bg-page);
  border-radius: var(--radius-sm);
}

// ====== 模板编辑弹窗 ======
.tmpl-edit-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 65vh;
  overflow-y: auto;
  padding-right: var(--space-1);
}

.tmpl-edit-section {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-secondary);
}

.tmpl-edit-section-title {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  justify-content: space-between;

  .tmpl-field-actions {
    display: flex;
    gap: var(--space-1);
  }
}

.tmpl-edit-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 var(--space-6);

  .tmpl-edit-form-full {
    grid-column: 1 / -1;
  }

  :deep(.t-form-item) {
    margin-bottom: var(--space-3);
  }
}

.tmpl-field-groups-scroll {
  max-height: 280px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding-right: var(--space-1);
}

.tmpl-edit-field-group {
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-3);
  background: var(--color-bg-primary);
}

.tmpl-group-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-bottom: var(--space-2);
}

.tmpl-group-required-mark {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);

  &.is-required {
    color: var(--color-danger);
  }
}

.tmpl-group-name {
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.tmpl-group-fields {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.tmpl-format-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-3) var(--space-4);
}

.tmpl-format-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);

  &--check {
    grid-column: span 1;
    justify-content: flex-end;
  }
}

.tmpl-format-label {
  font-size: var(--font-size-xs);
  color: var(--color-text-placeholder);
}
</style>
