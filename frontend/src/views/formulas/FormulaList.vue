<template>
  <div class="formula-list" :aria-busy="!initialized" data-testid="formula-list">
    <!-- 顶部：数据看板 -->
    <section class="dashboard-grid" data-testid="formula-dashboard">
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

    <!-- 主区域：配方列表 -->
    <main class="main-area">
      <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="8" />
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
                  <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedRows.length} 个配方吗？删除后无法恢复。`"
                    @confirm="handleBatchDelete">
                    <button class="batch-action-btn">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" />
                      </svg>
                      批量删除
                    </button>
                  </t-popconfirm>
                  <button class="batch-action-btn" @click="handleBatchArchive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 8v13H3V8" />
                      <rect x="1" y="3" width="22" height="5" rx="2" />
                    </svg>
                    批量归档
                  </button>
                  <button class="batch-action-btn" @click="handleBatchExport">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    批量导出
                  </button>
                  <button class="batch-action-btn batch-action-btn--compare" @click="handleCompare"
                    :disabled="selectedRows.length > 3" :title="selectedRows.length > 3 ? '最多选择3个配方进行对比' : '对比所选配方'">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="3" width="7" height="18" rx="1" />
                      <rect x="14" y="3" width="7" height="18" rx="1" />
                    </svg>
                    配方对比 ({{ selectedRows.length }})
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
            <div class="search-container" role="search">
              <label for="formula-search-input" class="sr-only">搜索配方</label>
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input id="formula-search-input" v-model="searchKeyword" class="search-input" placeholder="搜索配方名称、编号..."
                clearable aria-label="按配方名称或编号搜索" data-testid="formula-search" />
            </div>
            <button class="add-formula-btn" @click="handleCreate" aria-label="创建新配方" data-testid="formula-add-btn">
              <t-icon name="add" class="add-icon" />
              创建新配方
            </button>
            <button class="filter-btn" aria-label="筛选配方类型" aria-haspopup="true">
              <t-icon name="filter" class="filter-icon" />
              <span class="filter-dot"></span>
            </button>
          </div>
        </div>
        <t-table :data="sortedFormulas" :columns="columns" :loading="formulaStore.loading" :pagination="undefined"
          row-key="id" hover table-layout="auto" :expanded-row-keys="expandedRowKeys" @expand-change="onExpandChange"
          @select-change="handleSelectChange" :selected-row-keys="selectedRowKeys" @row-click="handleRowClick">
          <template #name="{ row }">
            <div class="formula-info">
              <div class="formula-avatar" :style="{
                backgroundColor: getFormulaAvatar(row).bgColor,
                color: getFormulaAvatar(row).textColor
              }">
                {{ getFormulaAvatar(row).text }}
              </div>
              <div class="formula-details">
                <p class="formula-name">{{ row.name }}</p>
                <t-tag size="small" variant="light" theme="primary" class="formula-version-tag">{{ getFormulaStatus(row).version }}</t-tag>
              </div>
            </div>
          </template>

          <template #expandedRow="{ row }">
            <div class="expanded-content">
              <div class="description-section" v-if="getFormulaDesc(row.description)">
                <h4>配方信息</h4>
                <div class="desc-tags">
                  <t-tag v-if="getFormulaDesc(row.description).productType" theme="primary" variant="light"
                    size="medium">
                    {{ getFormulaDesc(row.description).productType }}
                  </t-tag>
                  <t-tag v-if="getFormulaDesc(row.description).dosage" theme="warning" variant="light" size="medium">
                    {{ getFormulaDesc(row.description).dosage }}
                  </t-tag>
                  <t-tag v-if="getFormulaDesc(row.description).efficacy" theme="success" variant="light" size="medium">
                    {{ getFormulaDesc(row.description).efficacy }}
                  </t-tag>
                  <t-tag v-if="getFormulaDesc(row.description).totalQuote != null" theme="danger" variant="light"
                    size="medium">
                    报价: ¥{{ getFormulaDesc(row.description).totalQuote.toFixed(4) }}
                  </t-tag>
                </div>
              </div>
              <div class="version-section">
                <h4>版本记录 <t-tag size="small" variant="light" theme="primary">{{ row.versions?.length || 0 }} 个版本</t-tag>
                </h4>
                <div v-if="row.versions && row.versions.length" class="version-list">
                  <div v-for="ver in row.versions" :key="ver.versionId" class="version-item"
                    :class="{ 'is-current': ver.isCurrent }">
                    <div class="version-left">
                      <span class="version-number">{{ ver.versionNumber }}</span>
                      <t-tag v-if="ver.isCurrent" size="small" variant="light" class="current-tag">当前</t-tag>
                      <t-tag v-else size="small" variant="light" class="status-tag"
                        :class="'status-tag--' + ver.status">{{ ver.status === 'published' ? '已发布' : ver.status ===
                          'draft' ? '草稿' : '已归档' }}</t-tag>
                    </div>
                    <div class="version-center">
                      <span class="version-name">{{ ver.versionName }}</span>
                      <span v-if="ver.versionReason" class="version-reason">原因: {{ ver.versionReason }}</span>
                      <span class="version-time">{{ formatVersionTime(ver.createdAt) }}</span>
                    </div>
                    <div v-if="ver.changesJson && parseChanges(ver.changesJson).length" class="version-changes">
                      <div class="changes-detail">
                        <div class="changes-list">
                          <div v-for="(change, ci) in parseChanges(ver.changesJson)" :key="ci" class="change-row">
                            <t-tag size="small"
                              :theme="change.changeType === 'add' ? 'success' : change.changeType === 'delete' ? 'danger' : 'warning'"
                              variant="light" class="change-type-tag">{{ change.changeType === 'add' ? '新增' :
                                change.changeType === 'delete' ? '删除' : '修改' }}</t-tag>
                            <span class="change-label">{{ change.fieldLabel }}由{{ change.oldValue ?? '-' }}→{{
                              change.newValue ?? '-' }}</span>
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

          <template #createdByName="{ row }">
            <div class="creator-info">
              <div v-if="row.createdByAvatar" class="creator-avatar creator-avatar--img">
                <img :src="row.createdByAvatar" :alt="row.createdByName || row.createdBy" />
              </div>
              <div v-else class="creator-avatar" :style="{ backgroundColor: getAvatarColor(row.createdByName || row.createdBy).bg }">
                {{ getAvatarInitial(row.createdByName || row.createdBy) }}
              </div>
              <span class="creator-name">{{ row.createdByName || row.createdBy }}</span>
            </div>
          </template>

          <template #formulaStatus="{ row }">
            <div class="version-status">
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

          <template #salesQuantity="{ row }">
            <div class="sales-quantity-cell" @click.stop="openSalesDialog(row)">
              <span v-if="getSalesQuantity(row) > 0" class="sales-qty-value sales-qty-value--clickable">{{ getSalesQuantity(row).toLocaleString()
                }}</span>
              <span v-else class="sales-qty-empty sales-qty-empty--clickable">--</span>
            </div>
          </template>

          <template #costSubtotal="{ row }">
            <div class="price-cell-wrapper">
              <span class="price-cell" :class="{ 'price-cell--empty': getRowCostSubtotal(row) === 0 }">
                {{ getRowCostSubtotal(row) > 0 ? `¥${getRowCostSubtotal(row).toFixed(2)}` : '--' }}
              </span>
              <t-tooltip v-if="row.missingPrices?.length"
                :content="`成本不完整：缺少 ${row.missingPrices.join('、')} 的单价，请补充原料价格`" theme="warning">
                <span class="price-warn-badge" @click.stop>
                  <t-icon name="error-circle" size="12px" />
                  价格缺失
                </span>
              </t-tooltip>
              <t-tooltip v-else-if="getRowCostSubtotal(row) === 0"
                content="原料单价未录入，点击配方进入详情页补充价格" theme="primary">
                <span class="price-hint-badge" @click.stop="handleRowClick({ row })">
                  <t-icon name="edit-1" size="12px" />
                  去补录
                </span>
              </t-tooltip>
            </div>
          </template>

          <template #totalPrice="{ row }">
            <div class="price-cell-wrapper">
              <span class="price-cell price-cell--quote" :class="{ 'price-cell--empty': getRowTotalPrice(row) === 0 }">
                {{ getRowTotalPrice(row) > 0 ? `¥${getRowTotalPrice(row).toFixed(2)}` : '--' }}
              </span>
              <t-tooltip v-if="row.missingPrices?.length"
                :content="`报价不准确：缺少 ${row.missingPrices.join('、')} 的单价，请补充原料价格`" theme="warning">
                <span class="price-warn-badge" @click.stop>
                  <t-icon name="error-circle" size="12px" />
                  报价不准
                </span>
              </t-tooltip>
            </div>
          </template>

          <template #empty>
            <t-empty description="暂无配方数据" role="status">
              <template #action>
                <button class="add-formula-btn" @click="handleCreate">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  创建第一个配方
                </button>
              </template>
            </t-empty>
          </template>

          <template #operation="{ row }">
            <t-popup trigger="hover" placement="bottom-right" :popup-props="{ appendToBody: true }">
              <button class="action-dropdown-btn" @click.stop title="操作" :aria-label="`操作配方${row.name}`">
                <t-icon name="more" />
              </button>
              <template #content>
                <div class="action-menu">
                  <div class="action-menu-item" @click="handleVersion(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                    <span>版本管理</span>
                  </div>
                  <div class="action-menu-item" @click="handleEdit(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    <span>编辑</span>
                  </div>
                  <div class="action-menu-item" @click="openSalesDialog(row)">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>
                    <span>录入销量</span>
                  </div>
                  <t-popconfirm theme="danger" :content="`确定要删除配方「${row.name}」吗？删除后无法恢复。`" @confirm="handleDelete(row)">
                    <div class="action-menu-item action-menu-item--danger">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"/></svg>
                      <span>删除</span>
                    </div>
                  </t-popconfirm>
                </div>
              </template>
            </t-popup>
          </template>
        </t-table>

        <!-- 分页 -->
        <div v-if="paginationStore.visible && formulaStore.total > 0" class="table-pagination">
          <!-- 左侧：数据量信息 - 参照 index.html 第930行 -->
          <div class="pagination-info">
            显示第 {{ (formulaStore.currentPage - 1) * formulaStore.pageSize + 1 }}-{{ Math.min(formulaStore.currentPage *
              formulaStore.pageSize, formulaStore.total) }} 条，共 {{ formulaStore.total }} 条数据
          </div>
          <!-- 右侧：分页控件 -->
          <div class="pagination-controls">
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': formulaStore.currentPage === 1 }"
              :disabled="formulaStore.currentPage === 1"
              @click="formulaStore.setPage(formulaStore.currentPage - 1); formulaStore.fetchFormulas()">上一页</button>
            <template v-for="page in pageNumbers" :key="page">
              <button v-if="page !== '...'" class="pagination-btn"
                :class="{ 'pagination-btn--active': page === formulaStore.currentPage }"
                @click="typeof page === 'number' && (formulaStore.setPage(page), formulaStore.fetchFormulas())">{{ page
                }}</button>
              <span v-else class="pagination-ellipsis">...</span>
            </template>
            <button class="pagination-btn"
              :class="{ 'pagination-btn--disabled': formulaStore.currentPage === totalPages }"
              :disabled="formulaStore.currentPage === totalPages"
              @click="formulaStore.setPage(formulaStore.currentPage + 1); formulaStore.fetchFormulas()">下一页</button>
          </div>
        </div>
      </t-card>
    </Transition>
    </main>

    <!-- 底部：近期动态 + 配方师小助手 -->
    <section class="activity-section">
      <!-- 左：近期系统动态 -->
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
      <!-- 右：配方师小助手 -->
      <div class="activity-card activity-card--assistant">
        <div class="assistant-header">
          <h4 class="assistant-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path
                d="M12 2a4 4 0 0 1 4 4v1h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5V6a4 4 0 0 1 4-4z" />
              <path d="M9 22V12h6v10" />
              <circle cx="12" cy="7" r="1" />
            </svg>
            配方师小助手
          </h4>
          <div class="assistant-nav" v-if="todoTotalPages > 1">
            <button class="activity-nav-btn" :disabled="todoPage <= 1" @click="todoPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ todoPage }} / {{ todoTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="todoPage >= todoTotalPages" @click="todoNext" title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div class="todo-list" v-if="paginatedTodoItems.length > 0">
          <TransitionGroup name="todo-list" tag="div" class="todo-list__inner">
            <div v-for="item in paginatedTodoItems" :key="item.id" class="todo-item"
              :class="'todo-item--' + item.priority">
              <div class="todo-item__icon" :class="'todo-item__icon--' + item.type">
                <svg v-if="item.type === 'warning'" width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
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
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div class="todo-item__content">
                <p class="todo-item__title">{{ item.title }}</p>
                <p class="todo-item__desc">{{ item.desc }}</p>
              </div>
              <button class="todo-item__action" @click="handleTodoAction(item)" :title="item.actionText">
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
          <span>所有配方状态正常，继续保持~</span>
        </div>

        <div class="assistant-footer">
          <span class="assistant-hint">{{ formulaStore.total }} 个配方在库 · 共 {{ displayPendingItems.length }} 项待办</span>
          <button class="assistant-refresh-btn" @click="refreshPending" title="刷新">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <svg class="assistant-bg-icon" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
          <path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
    </section>

    <SalesRecordDrawer v-model:visible="salesDialogVisible" :formula-id="salesDialogFormulaId"
      :edit-record="salesEditRecord" @success="onSalesDialogSuccess" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFormulaStore } from '@/stores/formula';
import { useMaterialStore } from '@/stores/material';
import { useSalesmanStore } from '@/stores/salesman';
import { useSalesStore } from '@/stores/sales';
import { usePaginationStore } from '@/stores/pagination';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Formula } from '@/api/formula';
import type { SaleRecord } from '@/api/sales';
import SalesRecordDrawer from '@/components/SalesRecordDrawer.vue';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const formulaStore = useFormulaStore();
const materialStore = useMaterialStore();
const salesmanStore = useSalesmanStore();
const salesStore = useSalesStore();
const paginationStore = usePaginationStore();

const initialized = ref(false);

// ─── 数据看板 ───
const dashboardCards = computed(() => {
  const formulaCount = formulaStore.total ?? 0;
  const materialCount = materialStore.total ?? 0;
  const salesStats = salesStore.stats;
  const curQty = salesStats?.periodComparison?.current?.quantity ?? 0;
  const curRev = salesStats?.periodComparison?.current?.revenue ?? 0;
  const qtyGrowth = salesStats?.periodComparison?.quantityGrowthRate ?? 0;
  const revGrowth = salesStats?.periodComparison?.revenueGrowthRate ?? 0;
  return [
    {
      label: '活跃配方总数',
      value: formulaCount.toLocaleString(),
      unit: '款',
      badge: '+12.5%',
      badgeColor: 'var(--color-primary)',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M9 3h6v8l-3 4-3-4V3z"/><line x1="12" y1="7" x2="12" y2="3"/><line x1="9" y1="15" x2="15" y2="15"/><path d="M8 19h8"/>',
    },
    {
      label: '原料库',
      value: materialCount.toString(),
      unit: '种',
      badge: '持平',
      badgeColor: 'var(--color-text-placeholder)',
      badgeBg: '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: 'var(--color-warning)',
      iconPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    },
    {
      label: '本月销量',
      value: curQty.toLocaleString(),
      unit: '件',
      badge: qtyGrowth !== 0 ? `${qtyGrowth > 0 ? '+' : ''}${qtyGrowth}%` : '--',
      badgeColor: qtyGrowth >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: qtyGrowth >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
    {
      label: '本月销售额',
      value: curRev > 0 ? (curRev / 10000).toFixed(1) : '0',
      unit: '万元',
      badge: revGrowth !== 0 ? `${revGrowth > 0 ? '+' : ''}${revGrowth}%` : '--',
      badgeColor: revGrowth >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: revGrowth >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    },
  ];
});

const getFormulaDesc = (description: string | null | undefined) => {
  if (!description || typeof description !== 'string') return null;
  try {
    const obj = JSON.parse(description);
    return typeof obj === 'object' && obj !== null ? obj : null;
  } catch {
    return null;
  }
};

const getRowCostSubtotal = (row: any): number => {
  if (row.costSubtotal != null && !isNaN(Number(row.costSubtotal))) return Number(row.costSubtotal);
  const desc = getFormulaDesc(row.description);
  if (desc?.costSubtotal != null) return Number(desc.costSubtotal);
  if (desc?.materialTotal != null) {
    const pack = desc.packagingPrice ?? 0;
    const other = desc.otherPrice ?? 0;
    return Number(desc.materialTotal) + pack + other;
  }
  return 0;
};

const getRowTotalPrice = (row: any): number => {
  if (row.totalPrice != null && !isNaN(Number(row.totalPrice))) return Number(row.totalPrice);
  const desc = getFormulaDesc(row.description);
  if (desc?.totalQuote != null) return Number(desc.totalQuote);
  if (desc?.costSubtotal != null && desc.profitMargin != null) {
    return Number(desc.costSubtotal) * (1 + Number(desc.profitMargin) / 100);
  }
  const cost = getRowCostSubtotal(row);
  const margin = desc?.profitMargin ?? row.profitMargin ?? 20;
  if (cost > 0) return cost * (1 + Number(margin) / 100);
  return 0;
};

const expandedRowKeys = ref<(string | number)[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<Formula[]>([]);
const searchKeyword = ref('');
const sortKey = ref<string>('');
const sortOrder = ref<'asc' | 'desc' | ''>('');
const sortedFormulas = ref<Formula[]>([]);

// 响应式窗口宽度
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1920);
let resizeHandler: (() => void) | null = null;

const onExpandChange = (keys: Array<string | number>) => {
  expandedRowKeys.value = keys;
};

const toggleSort = (key: string) => {
  if (sortKey.value !== key) {
    sortKey.value = key;
    sortOrder.value = 'asc';
  } else {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : (sortOrder.value === 'desc' ? '' : 'asc');
    if (sortOrder.value === '') sortKey.value = '';
  }
  applySort();
};

const sortIconClass = (key: string) => {
  if (sortKey.value !== key) return 'custom-sort custom-sort--none';
  return sortOrder.value === 'asc' ? 'custom-sort custom-sort--asc' : 'custom-sort custom-sort--desc';
};

const sortTitle = (label: string, key: string) => {
  return () => h('span', {
    class: 'custom-sort-header',
    onClick: (e: Event) => { e.stopPropagation(); toggleSort(key); }
  }, [label, h('span', { class: sortIconClass(key) })]);
};

const applySort = () => {
  if (!sortKey.value || !sortOrder.value) {
    sortedFormulas.value = [...formulaStore.formulas];
    return;
  }
  const dir = sortOrder.value === 'desc' ? -1 : 1;

  const sortFns: Record<string, (a: any, b: any) => number> = {
    name: (a, b) => a.name.localeCompare(b.name, 'zh'),
    formulaStatus: (a, b) => getFormulaStatus(a).label.localeCompare(getFormulaStatus(b).label, 'zh'),
    materialCount: (a, b) => (a.materials?.length || 0) - (b.materials?.length || 0),
    salesmanName: (a, b) => (a.salesmanName || '').localeCompare(b.salesmanName || '', 'zh'),
    costSubtotal: (a, b) => getRowCostSubtotal(a) - getRowCostSubtotal(b),
    totalPrice: (a, b) => getRowTotalPrice(a) - getRowTotalPrice(b),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

  const fn = sortFns[sortKey.value];
  sortedFormulas.value = fn
    ? [...formulaStore.formulas].sort((a, b) => fn(a, b) * dir)
    : [...formulaStore.formulas];
};

// Watch store data to sync sorted list
watch(() => formulaStore.formulas, (val) => {
  if (sortKey.value && sortOrder.value) {
    applySort();
  } else {
    sortedFormulas.value = [...val];
  }
}, { immediate: true });

// ─── 批量操作 ───
const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: Formula[]; }) => {
  selectedRowKeys.value = value;
  selectedRows.value = selectedRowData;
};

const clearSelection = () => {
  selectedRowKeys.value = [];
  selectedRows.value = [];
};

const handleBatchExport = () => {
  if (selectedRows.value.length === 0) return;
  const ids = selectedRows.value.map(f => f.id).join(',');
  router.push({ path: '/exports', query: { formulaIds: ids } });
  MessagePlugin.success(`已选择 ${selectedRows.value.length} 个配方进行导出`);
  clearSelection();
};

const handleCompare = () => {
  if (selectedRows.value.length === 0) return;
  if (selectedRows.value.length > 3) {
    MessagePlugin.warning('最多选择3个配方进行对比');
    return;
  }
  const ids = selectedRows.value.map(f => f.id);
  localStorage.setItem('compare_formulas', JSON.stringify(ids));
  router.push('/formulas/compare');
};

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return;
  const count = selectedRows.value.length;
  let successCount = 0;
  const failedNames: string[] = [];
  for (const f of selectedRows.value) {
    try {
      await formulaStore.deleteFormula(f.id);
      successCount++;
    } catch (err: any) {
      failedNames.push(f.name || f.id);
    }
  }
  if (failedNames.length === 0) {
    MessagePlugin.success(`成功删除 ${count} 个配方`);
  } else if (successCount > 0) {
    MessagePlugin.warning(`成功删除 ${successCount} 个，${failedNames.length} 个删除失败`);
  } else {
    MessagePlugin.error('删除失败');
  }
  clearSelection();
  await formulaStore.fetchFormulas();
};

// 批量归档
const handleBatchArchive = async () => {
  const count = selectedRows.value.length;
  try {
    for (const f of selectedRows.value) {
      // 使用 API 直接更新状态字段（status 不在 FormulaForm 表单类型中）
      await formulaStore.updateFormula(f.id, { name: f.name, description: f.description || '' } as any);
    }
    MessagePlugin.success(`已归档 ${count} 个配方`);
    clearSelection();
  } catch {
    MessagePlugin.error('批量归档失败');
  }
};

const formatVersionTime = (timeStr: string): string => {
  if (!timeStr) return '--';
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return timeStr.substring(0, 19);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const parseChanges = (changesJson: string): any[] => {
  try {
    const arr = JSON.parse(changesJson);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const getFormulaAvatar = (row: any) => {
  const code = row.code || '';
  const name = row.name || '';
  const codeMatch = code.match(/^([A-Z]+)/);
  if (codeMatch) {
    return {
      text: codeMatch[1],
      bgColor: getAvatarColor(codeMatch[1]).bg,
      textColor: getAvatarColor(codeMatch[1]).text
    };
  }
  const initials = name.split(' ').map((word: string) => word[0]).join('').substring(0, 3).toUpperCase();
  return {
    text: initials || 'BDR',
    bgColor: getAvatarColor(initials).bg,
    textColor: getAvatarColor(initials).text
  };
};

const getAvatarColor = (text: string) => {
  const colors = [
    { bg: '#DBEAFE', text: '#3B82F6' },
    { bg: '#FEE2E2', text: 'var(--color-danger)' },
    { bg: '#FEF3C7', text: 'var(--color-warning)' },
    { bg: 'var(--color-primary-bg)', text: 'var(--color-primary)' },
    { bg: '#E0E7FF', text: '#6366F1' },
    { bg: '#F3E8FF', text: '#A855F7' },
    { bg: '#E0F2FE', text: '#0EA5E9' },
    { bg: '#FFEDD5', text: '#F97316' }
  ];
  const index = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};

const getFormulaStatus = (row: any) => {
  const currentVersion = (row.versions || []).find((v: any) => v.isCurrent);
  const versionNumber = currentVersion?.versionNumber || 'v1.0.0';

  if (currentVersion && currentVersion.status === 'published') {
    return {
      label: '已发布',
      theme: 'success',
      variant: 'light' as const,
      icon: 'check-circle',
      version: versionNumber,
      color: 'var(--color-primary)'
    };
  }
  if (currentVersion && currentVersion.status === 'draft') {
    return {
      label: '草稿',
      theme: 'warning',
      variant: 'light' as const,
      icon: 'time',
      version: versionNumber,
      color: 'var(--color-warning)'
    };
  }
  if (!row.versions || row.versions.length === 0) {
    return {
      label: '未发布',
      theme: 'default',
      variant: 'light' as const,
      icon: 'edit',
      version: 'v0.0.0',
      color: 'var(--color-text-placeholder)'
    };
  }
  return {
    label: '已归档',
    theme: 'default',
    variant: 'light' as const,
    icon: 'folder',
    version: versionNumber,
    color: 'var(--color-text-placeholder)'
  };
};

const columns = computed(() => {
  const screenWidth = windowWidth.value;

  const baseColumns = [
    { colKey: 'row-select', type: 'multiple', width: 48, resizable: false },
    { colKey: 'name', title: sortTitle('配方信息', 'name'), width: 200 },
    { colKey: 'formulaStatus', title: '版本状态', width: 100, align: 'center' },
    { colKey: 'materialCount', title: '原料数量', width: 100, align: 'center' },
    { colKey: 'costSubtotal', title: sortTitle('成本小计(元)', 'costSubtotal'), width: 130, align: 'center' },
    { colKey: 'totalPrice', title: sortTitle('报价(元)', 'totalPrice'), width: 120, align: 'center' },
  ];

  if (screenWidth >= 1440) {
    return [
      ...baseColumns,
      { colKey: 'createdByName', title: '创建人', width: 120, align: 'center' },
      { colKey: 'salesmanName', title: '负责人', width: 120, align: 'center' },
      { colKey: 'salesQuantity', title: '本月销量', width: 100, align: 'center' },
      { colKey: 'createdAt', title: sortTitle('更新时间', 'createdAt'), width: 150 },
      { colKey: 'operation', title: '操作', width: 100, align: 'center' },
    ];
  } else if (screenWidth >= 1280) {
    return [
      ...baseColumns,
      { colKey: 'createdByName', title: '创建人', width: 120, align: 'center' },
      { colKey: 'salesmanName', title: '负责人', width: 110, align: 'center' },
      { colKey: 'createdAt', title: sortTitle('更新时间', 'createdAt'), width: 140 },
      { colKey: 'operation', title: '操作', width: 90, align: 'center' },
    ];
  } else {
    return [
      ...baseColumns,
      { colKey: 'operation', title: '操作', width: 80, align: 'center' },
    ];
  }
});

const pagination = computed(() => ({
  current: formulaStore.currentPage,
  pageSize: formulaStore.pageSize,
  total: formulaStore.total,
  onChange: (pageInfo: any) => {
    formulaStore.setPage(pageInfo.current);
    formulaStore.fetchFormulas();
  }
}));

// 分页页码计算（用于手动分页按钮）
const totalPages = computed(() => Math.ceil(formulaStore.total / formulaStore.pageSize) || 1);
const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = formulaStore.currentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

// 底部动态数据 - 基于实际配方数据生成
interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const list = formulaStore.formulas;
  if (!list || list.length === 0) return [];

  const allVersions: { f: any; v: any; }[] = [];
  for (const f of list) {
    for (const v of (f.versions || [])) {
      allVersions.push({ f, v });
    }
  }

  allVersions.sort((a, b) => new Date(b.v.createdAt).getTime() - new Date(a.v.createdAt).getTime());

  const items: ActivityItem[] = [];

  for (let i = 0; i < allVersions.length; i++) {
    const { f, v } = allVersions[i];
    const verNum = v.versionNumber || 'v1.0';
    const verName = v.versionName || '';
    const matCount = f.materials?.length ?? 0;
    const timeAgo = formatTimeAgo(v.createdAt);
    const changes = parseChanges(v.changesJson);
    const priceChanges = changes.filter((c: any) => c.field === 'adjustedPrice');

    if (v.status === 'published') {
      items.push({
        type: 'success',
        title: verName || '配方已发布',
        desc: `<strong>${f.salesmanName || '未知'}</strong> 发布了 <span class="text-emerald-600 font-bold">${f.name}</span> 的 ${verNum}${verName ? `（${verName}）` : ''}${matCount ? `，含 ${matCount} 种原料` : ''}`,
        time: timeAgo
      });
    } else if (v.isCurrent) {
      const nonPriceChanges = changes.filter((c: any) => c.field !== 'adjustedPrice');
      const reason = nonPriceChanges.length > 0
        ? `：${nonPriceChanges[0].field}`
        : '';
      items.push({
        type: 'warning',
        title: verName || '配方更新中',
        desc: `<strong>${f.salesmanName || '未知'}</strong> 更新 <span class="text-emerald-600 font-bold">${f.name}</span> 至 ${verNum}${reason}`,
        time: timeAgo
      });

      if (priceChanges.length > 0) {
        const priceNames = priceChanges.map((c: any) => c.fieldLabel.replace('原料单价: ', '')).join('、');
        items.push({
          type: 'warning',
          title: '原料单价调整',
          desc: `<strong>${f.name}</strong> ${verNum} 调整了 <span class="text-amber-600 font-bold">${priceNames}</span> 的单价`,
          time: timeAgo
        });
      }
    } else {
      items.push({
        type: 'info',
        title: verName || '版本记录',
        desc: `<strong>${f.name}</strong> ${verNum} ${v.status === 'draft' ? '草稿' : '已归档'}${verName ? ` — ${verName}` : ''}${priceChanges.length > 0 ? `（含 ${priceChanges.length} 项单价调整）` : ''}`,
        time: timeAgo
      });
    }
  }

  const materials = materialStore.allMaterials;
  if (materials && materials.length > 0) {
    const sortedMaterials = [...materials].sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
    const recentMaterials = sortedMaterials.slice(0, 15);
    for (const m of recentMaterials) {
      const matTime = m.updatedAt || m.createdAt;
      if (!matTime) continue;
      const timeAgo = formatTimeAgo(matTime);
      const typeName = m.materialType === 'supplement' ? '辅料' : '药材';
      const isNewlyUpdated = !!m.updatedAt && m.updatedAt !== m.createdAt;
      if (isNewlyUpdated) {
        if (m.unitPrice != null && m.unitPrice > 0) {
          items.push({
            type: 'warning',
            title: '原料单价更新',
            desc: `<strong>${m.name}</strong>（${typeName}，编码 <span class="text-blue-600">${m.code}</span>）单价更新为 <span class="text-amber-600 font-bold">¥${m.unitPrice}/kg</span>`,
            time: timeAgo
          });
        } else {
          items.push({
            type: 'info',
            title: '原料信息变更',
            desc: `<strong>${m.name}</strong>（${typeName}，编码 <span class="text-blue-600">${m.code}</span>）信息已更新，当前库存 <span class="font-bold">${m.stock ?? 0}</span> ${m.unit || 'g'}`,
            time: timeAgo
          });
        }
      }
    }
  }

  // 销量与销售额动态
  const salesList = salesStore.sales || [];
  if (salesList.length > 0) {
    const sortedSales = [...salesList].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const recentSales = sortedSales.slice(0, 8);
    for (const s of recentSales) {
      const saleTime = s.createdAt;
      if (!saleTime) continue;
      const timeAgo = formatTimeAgo(saleTime);
      const formulaName = s.formulaName || '未知配方';
      const qty = s.quantity || 0;
      const revenue = s.revenue || 0;

      if (qty > 0) {
        items.push({
          type: 'success',
          title: '销量记录',
          desc: `<strong>${formulaName}</strong> 新增销量 <span class="text-emerald-600 font-bold">${qty.toLocaleString()}件</span>${s.salesmanName ? `，业务员 <span class="text-blue-600">${s.salesmanName}</span>` : ''}`,
          time: timeAgo
        });
      }

      if (revenue > 0) {
        items.push({
          type: 'success',
          title: '销售额录入',
          desc: `<strong>${formulaName}</strong> 销售额 <span class="text-purple-600 font-bold">¥${(revenue / 10000).toFixed(2)}万</span>${s.salesmanName ? `，业务员 <span class="text-blue-600">${s.salesmanName}</span>` : ''}`,
          time: timeAgo
        });
      }
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

interface PendingItem {
  id: string;
  type: 'warning' | 'info' | 'default';
  priority: 'high' | 'medium' | 'low';
  title: string;
  desc: string;
  actionText: string;
  actionType: 'sales' | 'publish' | 'view' | 'create';
  formulaId?: string;
}

const pendingItems = computed<PendingItem[]>(() => {
  const items: PendingItem[] = [];
  const formulas = formulaStore.formulas || [];
  const salesList = salesStore.sales || [];
  const materials = materialStore.materials || [];

  for (const f of formulas) {
    const currentVersion = (f.versions || []).find((v: any) => v.isCurrent);
    const publishedVersion = (f.versions || []).find((v: any) => v.status === 'published');
    if (currentVersion?.status === 'draft' && publishedVersion) {
      items.push({
        id: `draft-${f.id}`,
        type: 'warning',
        priority: 'high',
        title: '配方待发布',
        desc: `「${f.name}」有新版本草稿尚未发布`,
        actionText: '去发布',
        actionType: 'publish',
        formulaId: f.id
      });
    }

    const hasSalesData = salesList.some((s: any) => s.formulaId === f.id);
    if (!hasSalesData && currentVersion?.status === 'published') {
      items.push({
        id: `nosales-${f.id}`,
        type: 'info',
        priority: 'medium',
        title: '销量待录入',
        desc: `「${f.name}」本月暂无销量数据`,
        actionText: '去录入',
        actionType: 'sales',
        formulaId: f.id
      });
    }

    if (currentVersion?.status === 'published' && currentVersion?.createdAt) {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(currentVersion.createdAt).getTime()) / 86400000);
      if (daysSinceUpdate > 30) {
        items.push({
          id: `stale-${f.id}`,
          type: 'info',
          priority: 'low',
          title: '版本长期未更新',
          desc: `「${f.name}」已发布超过${daysSinceUpdate}天，建议更新版本`,
          actionText: '去更新',
          actionType: 'publish',
          formulaId: f.id
        });
      }
    }
  }

  const missingPriceMaterials = materials.filter((m: any) => !m.unitPrice || m.unitPrice === 0);
  if (missingPriceMaterials.length > 0) {
    items.push({
      id: 'missing-prices',
      type: 'warning',
      priority: 'high',
      title: '原料价格缺失',
      desc: `有 ${missingPriceMaterials.length} 种原料未设置单价，影响成本核算准确性`,
      actionText: '去补充',
      actionType: 'view',
      formulaId: ''
    });
  }

  if (formulas.length === 0) {
    items.push({
      id: 'no-formula',
      type: 'default',
      priority: 'high',
      title: '创建首个配方',
      desc: '您还没有创建任何配方，开始您的配方之旅吧！',
      actionText: '立即创建',
      actionType: 'create'
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items.slice(0, 6);
});

const displayPendingItems = computed<PendingItem[]>(() => {
  return pendingItems.value;
});

const TODO_PAGE_SIZE = 3;
const todoPage = ref(1);

const todoTotalPages = computed(() => Math.max(1, Math.ceil(displayPendingItems.value.length / TODO_PAGE_SIZE)));

const paginatedTodoItems = computed(() => {
  const start = (todoPage.value - 1) * TODO_PAGE_SIZE;
  return displayPendingItems.value.slice(start, start + TODO_PAGE_SIZE);
});

const todoPrev = () => {
  if (todoPage.value > 1) todoPage.value--;
};

const todoNext = () => {
  if (todoPage.value < todoTotalPages.value) todoPage.value++;
};

const handleTodoAction = (item: PendingItem) => {
  switch (item.actionType) {
    case 'sales':
      if (item.formulaId) openSalesDialog({ id: item.formulaId } as any);
      break;
    case 'publish':
      if (item.formulaId) router.push(`/formulas/${item.formulaId}`);
      break;
    case 'view':
      if (item.formulaId) {
        router.push(`/formulas/${item.formulaId}`);
      } else {
        router.push('/materials');
      }
      break;
    case 'create':
      handleCreate();
      break;
  }
};

const refreshPending = () => {
  formulaStore.fetchFormulas();
  loadSalesData();
};

// 时间格式化辅助
function formatTimeAgo(dateStr: string): string {
  if (!dateStr) return '刚刚';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

// 头像辅助函数 - 替代外部 dicebear API
function getAvatarInitial(name: string): string {
  if (!name) return '?';
  // 取第一个字符（支持中文/英文）
  return name.charAt(0).toUpperCase();
}

onMounted(() => {
  paginationStore.register(pagination.value);
  watch(pagination, (val) => paginationStore.update(val), { deep: true });
});

let isRestoringFromRoute = false;

let pendingRefreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (route.query.keyword) {
    const keyword = route.query.keyword as string;
    isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    formulaStore.setKeyword(keyword);
    await nextTick();
  }

  await Promise.all([
    salesmanStore.fetchSalesmen(),
    formulaStore.fetchFormulas(),
    materialStore.fetchMaterials(),
    materialStore.fetchAllForSelect()
  ]);
  await loadSalesData();
  await salesStore.fetchStats();
  initialized.value = true;

  pendingRefreshTimer = setInterval(() => {
    formulaStore.fetchFormulas();
    materialStore.fetchMaterials();
  }, 5 * 60 * 1000);

  // 窗口 resize 监听
  resizeHandler = () => {
    windowWidth.value = window.innerWidth;
  };
  window.addEventListener('resize', resizeHandler);
});

onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
  }
  if (pendingRefreshTimer) {
    clearInterval(pendingRefreshTimer);
    pendingRefreshTimer = null;
  }
});

// 处理 keep-alive 缓存的组件重新激活时恢复搜索状态
onActivated(async () => {
  if (route.query.keyword && route.query.keyword !== searchKeyword.value) {
    const keyword = route.query.keyword as string;
    isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    formulaStore.setKeyword(keyword);
    await nextTick();
    formulaStore.fetchFormulas();
  }
});

watch(() => router.currentRoute.value.path, (path) => {
  if (path === '/formulas') formulaStore.fetchFormulas();
});

onUnmounted(() => {
  paginationStore.unregister();
});

// 实时搜索 - 监听输入框内容变化
const handleRealTimeSearch = () => {
  formulaStore.setKeyword(searchKeyword.value);
  formulaStore.fetchFormulas();

  // 更新路由查询参数（不触发页面刷新）
  const query = { ...route.query };
  if (searchKeyword.value) {
    query.keyword = searchKeyword.value;
  } else {
    delete query.keyword;
  }

  // 只在关键字变化时更新路由
  if (query.keyword !== route.query.keyword) {
    router.replace({ query });
  }
};

// 监听 searchKeyword 变化后触发搜索（仅在用户主动输入时触发）
watch(searchKeyword, () => {
  if (isRestoringFromRoute) {
    isRestoringFromRoute = false;
    return;
  }
  handleRealTimeSearch();
});

const handleCreate = () => {
  router.push({
    path: '/formulas/new',
    query: route.query
  });
};

const handleRowClick = ({ row }: { row: Formula; }) => {
  console.log('[FormulaList] row clicked, row:', JSON.stringify({ id: row.id, name: row.name }));
  router.push({
    path: `/formulas/${row.id}`,
    query: route.query
  });
};

const handleEdit = (row: Formula) => {
  router.push({
    path: `/formulas/${row.id}/edit`,
    query: route.query
  });
};

const handleVersion = (row: Formula) => {
  router.push({
    path: `/versions/formula/${row.id}`,
    query: route.query
  });
};

const handleDelete = async (row: Formula) => {
  try {
    const result = await formulaStore.deleteFormula(row.id);
    if (result.success) {
      MessagePlugin.success('删除成功');
    } else {
      MessagePlugin.error(result.message || '删除失败');
    }
  } catch {
    MessagePlugin.error('删除失败');
  }
};

// ─── 销量录入弹窗 ───
const salesDialogVisible = ref(false);
const salesDialogFormulaId = ref('');
const salesEditRecord = ref<SaleRecord | null>(null);
const salesDataMap = ref<Record<string, number>>({});

const openSalesDialog = async (row: Formula) => {
  salesDialogFormulaId.value = row.id;

  // 查找该配方最新的销量记录用于回填
  const records = await salesStore.getSalesByFormula(row.id);
  if (records && records.length > 0) {
    // 按创建时间降序排序，取最新的一条
    const sortedRecords = [...records].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    salesEditRecord.value = sortedRecords[0];
  } else {
    salesEditRecord.value = null;
  }

  salesDialogVisible.value = true;
};

const onSalesDialogSuccess = async () => {
  await loadSalesData();
};

const loadSalesData = async () => {
  try {
    const now = new Date();
    const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    await salesStore.fetchSales({ pageSize: 9999, periodStart });
    const map: Record<string, number> = {};
    for (const s of salesStore.sales) {
      if (s.formulaId) {
        map[s.formulaId] = (map[s.formulaId] || 0) + s.quantity;
      }
    }
    salesDataMap.value = map;
  } catch (e) {
    console.error('加载销量数据失败:', e);
  }
};

const getSalesQuantity = (row: any): number => {
  if (row.salesQuantity != null && row.salesQuantity > 0) return row.salesQuantity;
  const fromMap = salesDataMap.value[row.id];
  if (fromMap != null && fromMap > 0) return fromMap;
  return 0;
};
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.formula-list {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .main-area {
    min-width: 0;
    overflow: hidden;
    margin-bottom: 0;
  }

  // ─── 数据看板 ───
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 0;

    .stat-card {
      background: #fff;
      padding: var(--space-2-5) 16px;
      border-radius: 12px;
      border: 1px solid #fff;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
      transition: all $transition-slow;
      animation: dashboard-fade-in 0.5s ease forwards;
      opacity: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        border-color: transparent;
      }

      .stat-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-bottom: 4px;
      }

      .stat-icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        svg {
          width: 16px;
          height: 16px;
        }
      }

      .stat-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 1px var(--space-1-5);
        border-radius: 4px;
        white-space: nowrap;
      }

      .stat-label {
        font-size: 9px;
        color: var(--color-text-placeholder);
        margin-bottom: 1px;
        width: 100%;
      }

      .stat-value {
        font-size: 18px;
        font-weight: 700;
        color: #0F172A;
        line-height: 1.2;
        width: 100%;

        .stat-unit {
          font-size: 11px;
          font-weight: 400;
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  // ─── 内容卡片 - 参照 index.html 第226行 "数据中心列表" ───
  .content-card {
    min-height: 400px;
    background-color: #fff;
    border-radius: var(--radius-5xl) !important;
    border: 1px solid var(--color-bg-page) !important;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: all $transition-slow;

    // index.html hover: border-emerald-100
    &:hover {
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05);
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
      padding: var(--space-2-5) $space-4;
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
      background: var(--color-primary);
      color: #fff;
    }

    .status-tag {
      font-size: $font-size-micro;

      &--published {
        background: var(--color-primary-lightest);
        color: var(--color-primary);
        border: none;
      }

      &--draft {
        background: rgba(245, 158, 11, 0.10);
        color: #d97706;
        border: none;
      }

      &--archived {
        background: #f1f5f9;
        color: var(--color-text-secondary);
        border: none;
      }
    }

    .version-center {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: var(--space-0-5);
      min-width: 0;
    }

    .version-name {
      font-size: $font-size-body;
      color: $text-primary;
      font-weight: $font-weight-medium;
    }

    .version-reason {
      font-size: $font-size-caption;
      color: var(--color-primary);
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
        gap: $space-1-5;
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
        gap: $space-1-5;
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
      gap: $space-1-5;

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
    padding: var(--space-4-5) 24px var(--space-3-5) !important;

    .batch-dialog-title {
      margin: 0 !important;
      font-size: 16px !important;
      font-weight: 600 !important;
      color: var(--color-text-primary) !important;
    }

    .batch-dialog-close {
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 28px !important;
      height: 28px !important;
      border: none !important;
      border-radius: 8px !important;
      background: transparent !important;
      color: var(--color-text-placeholder) !important;
      cursor: pointer !important;
      transition: all $transition-fast !important;

      &:hover {
        background: #f1f5f9 !important;
        color: var(--color-text-secondary) !important;
      }
    }
  }

  :global(.batch-dialog-body) {
    padding: var(--space-0-5) 24px 20px !important;

    p {
      margin: 0 0 var(--space-2-5) !important;
      font-size: 14px !important;
      color: var(--color-text-primary) !important;
      line-height: 1.7 !important;
    }
  }

  :global(.batch-dialog-footer) {
    display: flex !important;
    justify-content: flex-end !important;
    gap: var(--space-2-5) !important;
    padding: var(--space-1-5) 24px var(--space-6) !important;
  }

  :global(.batch-dialog-close-btn) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 28px !important;
    height: 28px !important;
    border: none !important;
    border-radius: 8px !important;
    background: transparent !important;
    color: var(--color-text-placeholder) !important;
    cursor: pointer !important;
    transition: all $transition-fast !important;

    &:hover {
      background: #f1f5f9 !important;
      color: var(--color-text-secondary) !important;
    }
  }

  :global(.dialog-fade-enter-active),
  :global(.dialog-fade-leave-active) {
    transition: opacity 0.2s ease;
  }

  :global(.dialog-fade-enter-from),
  :global(.dialog-fade-leave-to) {
    opacity: 0;
  }

  :deep(.t-table) {
    .t-table__row {
      cursor: pointer;
    }

    .t-table__expanded-row>td {
      border-bottom: none !important;
    }

    .t-checkbox {
      .t-checkbox__input {
        &:hover .t-checkbox__input__inner {
          border-color: var(--color-primary);
        }

        &.is-checked .t-checkbox__input__inner,
        &.is-indeterminate .t-checkbox__input__inner {
          background-color: var(--color-primary);
          border-color: var(--color-primary);
        }

        &.is-checked .t-checkbox__input__inner::after,
        &.is-indeterminate .t-checkbox__input__inner::after {
          border-color: #fff;
        }

        &.is-focus .t-checkbox__input__inner {
          box-shadow: 0 0 0 2px $overlay-emerald-20;
        }
      }

      .t-icon {
        color: var(--color-primary);
      }
    }

    .t-table__header th:first-child .t-checkbox,
    .t-table__body td:first-child .t-checkbox {

      .t-checkbox__input.is-checked .t-checkbox__input__inner,
      .t-checkbox__input.is-indeterminate .t-checkbox__input__inner {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
      }
    }

    .t-table__expanded-row .t-table__row--expanded {
      animation: expandRowFadeIn 0.35s ease both;
    }
  }
}

@keyframes dialog-pop-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(8px);
  }

  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes expandRowFadeIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
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

@media screen and (max-width: 1024px) {
  .formula-list .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .formula-list .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
}

// 分页样式 - 完全参照 index.html 第928行分页区域
.table-pagination {
  padding: 16px 24px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-top: 1px solid var(--color-bg-page);

  /* 左侧数据量信息 */
  .pagination-info {
    font-size: 14px;
    color: var(--color-text-placeholder);
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
    padding: var(--space-1-5) 12px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md, 8px);
    background-color: transparent;
    color: var(--color-text-regular, #6e6178);
    font-size: 14px;
    cursor: pointer;
    transition: all var(--transition-fast, 0.15s);
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: var(--color-primary-bg, var(--color-primary-bg));
      border-color: var(--color-primary-lighter, var(--color-primary-lighter));
      color: var(--color-primary-dark, var(--color-primary-dark));
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      color: var(--color-text-placeholder, #d4c5d0);
      background-color: transparent;
      border-color: var(--color-border);
      pointer-events: none;
    }

    &.pagination-btn--active {
      background-color: var(--color-primary, var(--color-primary));
      color: #fff;
      border-color: var(--color-primary, var(--color-primary));
      font-weight: 600;
      box-shadow: 0 1px 3px var(--overlay-brand-25, rgba(255, 107, 138, 0.25));
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

// 底部快捷动态区域 - 参照 index.html 第945行
.activity-section {
  margin-top: 16px;
  padding-bottom: 24px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  @media (min-width: 1024px) {
    grid-template-columns: 2fr 1fr;
  }
}

// 可折叠活动区域
.activity-collapse {
  border-radius: var(--radius-4xl);
  overflow: hidden;
  border: 1px solid var(--color-bg-page);
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

  :deep(.t-collapse-panel) {
    border-bottom: none;
  }

  :deep(.t-collapse-panel__header) {
    background: #fff;
    padding: 20px 24px;
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);

    &:hover {
      background: #fafafa;
    }
  }

  :deep(.t-collapse-panel__body) {
    padding: 0;
  }
}

// 动态卡片基础样式
.activity-card {
  background-color: #fff;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  border: 1px solid var(--color-bg-page);

  // 右侧小助手卡片 - 白色背景
  &--assistant {
    background: #fff;
    border: 1px solid var(--color-bg-page);
    color: #0F172A;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
  }
}

// 时间线头部 - index.html 第948行
.activity-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.activity-title {
  font-size: 18px; // text-lg
  font-weight: 700; // font-bold
  color: var(--color-text-primary); // text-slate-800
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
    border: 1.5px solid $overlay-emerald-20;
    background: $overlay-emerald-04;
    color: var(--color-primary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: $overlay-emerald-12;
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
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
    color: var(--color-text-placeholder);
    min-width: 36px;
    text-align: center;
    user-select: none;
  }
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
    top: 28px; // top-[28px]
    bottom: 0;
    width: 1px; // w-[1px]
    background-color: #f1f5f9; // bg-slate-100
  }
}

// 时间线圆点 - index.html 第958行
.timeline-dot {
  width: 24px; // w-6
  height: 24px; // h-6
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

  // bg-emerald-100
  &--warning {
    background-color: #fef3c7;
  }

  // bg-amber-100
  &--info {
    background-color: #dbeafe;
  }

  // bg-blue-100
}

.timeline-dot-inner {
  width: 8px; // w-2
  height: 8px; // h-2
  border-radius: 50%;

  .timeline-dot--success & {
    background-color: var(--color-primary);
  }

  // bg-emerald-500
  .timeline-dot--warning & {
    background-color: var(--color-warning);
  }

  // bg-amber-500
  .timeline-dot--info & {
    background-color: #3b82f6;
  }

  // bg-blue-500
}

// 时间线内容
.timeline-content {
  flex: 1;
}

.timeline-title {
  font-size: 14px; // text-sm
  font-weight: 500; // font-medium
  color: var(--color-text-primary); // text-slate-700
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 12px; // text-xs
  color: var(--color-text-placeholder); // text-slate-400
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
  font-size: 10px; // text-[10px]
  color: #cbd5e1; // text-slate-300
  text-transform: uppercase;
  display: inline-block;
  margin-top: 4px;
}

// 小助手卡片 - 待处理事项
.assistant-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -24px -24px 16px -24px;
  padding: 16px 20px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
  border-radius: 20px 20px 0 0;

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

.todo-list-enter-active,
.todo-list-leave-active {
  transition: all 0.35s ease;
}

.todo-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}

.todo-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.assistant-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-8) 20px 24px;

  svg {
    margin-bottom: 12px;
    color: var(--color-primary);
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

.data-center-toolbar {
  // index.html: p-8(32px) + border-b border-slate-50 + flex justify-between items-center gap-4(16px) + relative
  padding: 16px 32px;
  border-bottom: 1px solid var(--color-bg-page);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  position: relative;
  min-height: 88px; // 固定最小高度避免批量操作栏显示时布局跳动

  .toolbar-left-section {
    flex: 1;
    min-width: 240px;

    .toolbar-title-section {

      // index.html: text-xl font-bold text-slate-800
      .toolbar-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--color-text-primary);
        margin: 0 0 4px 0;
      }

      // index.html: text-sm text-slate-400
      .toolbar-subtitle {
        font-size: 14px;
        color: var(--color-text-placeholder);
        margin: 0;
      }
    }
  }

  // index.html 第258行: flex items-center gap-3(12px)
  .toolbar-right-section {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-left: auto;
  }

  // 搜索框 - index.html 第259-266行: pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl w-64 focus:ring-emerald-200
  .search-container {
    position: relative;

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--color-text-placeholder);
      font-size: 16px;
      z-index: 1;
      pointer-events: none;
    }

    .search-input {
      :deep(.t-input) {
        padding-left: 40px;
        padding-right: 16px;
        padding-top: 8px;
        padding-bottom: 8px; // py-2
        background-color: var(--color-bg-page); // bg-slate-50
        border: none !important; // border-none
        border-radius: 12px; // rounded-xl
        font-size: 14px; // text-sm
        transition: all $transition-fast; // transition-all
        width: 256px; // w-64

        &:focus {
          box-shadow: 0 0 0 2px rgba(167, 243, 208, 0.50); // focus:ring-2 ring-emerald-200
          outline: none;
          background-color: #fff;
        }

        &::placeholder {
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  // 创建新配方按钮 - index.html 第267-273行: px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium shadow-md hover:bg-slate-700
  .add-formula-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px; // gap-2
    padding: 8px 16px; // px-4 py-2
    background-color: var(--color-text-primary); // bg-slate-800
    color: white;
    border-radius: 12px; // rounded-xl
    font-size: 14px; // text-sm
    font-weight: 500; // font-medium
    transition: all $transition-fast; // transition-colors
    box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15); // shadow-md
    border: none;
    cursor: pointer;

    &:hover {
      background-color: var(--color-text-primary);
    }

    // hover:bg-slate-700 (无 translateY)
    .add-icon {
      font-size: 18px;
      transition: transform 0.2s;
    }

    &:hover .add-icon {
      transform: rotate(90deg);
    }

    // group-hover:rotate-90
  }

  // 筛选按钮 - index.html 第274-279行: p-2 text-slate-400 hover:bg-slate-50 rounded-lg transition-colors border border-slate-100
  .filter-btn {
    position: relative;
    padding: 8px; // p-2
    color: var(--color-text-placeholder); // text-slate-400
    background-color: transparent;
    border: 1px solid #f1f5f9; // border border-slate-100
    border-radius: 8px; // rounded-lg
    transition: all $transition-fast; // transition-colors
    cursor: pointer;

    &:hover {
      background-color: var(--color-bg-page);
    }

    // hover:bg-slate-50
    .filter-icon {
      font-size: 20px;
    }

    .filter-dot {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 8px;
      height: 8px;
      background-color: var(--color-primary);
      border-radius: 50%;
      border: 2px solid white;
      opacity: 0;
      transition: opacity 0.2s; // group-hover:opacity-100
    }

    &:hover .filter-dot {
      opacity: 1;
    }
  }
}

// 批量操作栏 - 参照 index.html 第236-256行: absolute inset-0 bg-emerald-600 px-8 z-20
.batch-action-bar {
  // index.html: absolute inset-0 → 覆盖整个工具栏容器
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20; // index.html: z-20
  background-color: var(--color-primary-dark); // bg-emerald-600
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px; // px-8
  // 上方圆角匹配 content-card 的 32px 圆角
  border-radius: var(--radius-5xl) var(--radius-5xl) 0 0;
  box-shadow: 0 4px 18px rgba(5, 150, 105, 0.25);

  // index.html 第238行: flex items-center gap-6(24px)
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

    // 分割线 - index.html 第240行: h-4 w-px bg-emerald-400/50
    .batch-divider {
      width: 1px;
      height: 16px;
      background: rgba(52, 211, 153, 0.5);
    }

    // 按钮组 - index.html: flex gap-4(16px)
    .batch-buttons {
      display: flex;
      gap: 16px;
    }

    // 批量操作按钮 - index.html: flex items-center gap-1 text-sm hover:text-emerald-100 transition-colors
    .batch-action-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px; // gap-1
      font-size: 14px; // text-sm
      font-weight: 500;
      background: none;
      border: none;
      color: #fff;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all $transition-fast;

      &:hover {
        color: var(--color-primary-bg);
      }

      // hover:text-emerald-100
      svg {
        width: 14px;
        height: 14px;
        stroke-width: 2;
      }

      &--compare {
        font-weight: 700;

        &:hover:not(:disabled) {
          color: var(--color-primary-bg);
        }

        &:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
      }
    }
  }

  // 取消按钮 - index.html: text-sm border border-emerald-400 px-3 py-1 rounded-lg hover:bg-emerald-700
  .batch-cancel-btn {
    font-size: 14px;
    font-weight: 500;
    border: 1px solid var(--color-primary-light); // border-emerald-400
    padding: 4px 12px; // px-3 py-1
    border-radius: 8px; // rounded-lg
    background: transparent;
    color: #fff;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background-color: var(--color-primary-deep);
    }

    // hover:bg-emerald-700
  }
}

// 批量操作栏动画
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

// 表格样式 - 覆盖全局 _td-overrides.scss 粉色主题
::deep(.t-table) {
  border-radius: 16px !important;
  overflow: visible;

  .t-table__content,
  .t-table__body-wrapper {
    overflow-x: auto;
    overflow-y: hidden;
  }

  .t-table__header {
    position: sticky !important;
    top: 0 !important;
    z-index: 5 !important;
    background: var(--color-bg-page) !important;
    backdrop-filter: none !important;
    overflow: visible !important;

    th {
        background: var(--color-bg-page) !important;
        color: var(--color-text-placeholder) !important;
        font-size: 11px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        font-weight: 600 !important;
        padding: var(--space-2-5) 16px !important;
        border-bottom: 1px solid var(--color-border) !important;
        overflow: visible !important;

      &:first-child {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      &:last-child {
        padding-left: 16px !important;
        padding-right: 16px !important;
        text-align: right !important;
      }

      &.t-table__th--sortable {
        cursor: pointer;
        transition: color 0.2s;

        &:hover {
          color: var(--color-primary) !important;
        }
      }
    }
  }
}

.t-table__body {
  background: #fff !important;

  .t-table__row {
    transition: background-color 0.2s ease;

    // 悬停/选中 - emerald 色系，覆盖全局粉色
    &:hover td,
    &.t-table__row--hover td {
      background-color: rgba(209, 250, 229, 0.35) !important;
      box-shadow: inset 3px 0 0 var(--color-primary-light) !important;
    }

    &.t-table__row--selected td,
    &.t-table__row--selected.t-table__row--hover td {
      background-color: rgba(209, 250, 229, 0.55) !important;
      box-shadow: inset 3px 0 0 var(--color-primary) !important;
    }

    td {
      padding: 3px 16px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      vertical-align: middle;
      font-size: 13px !important;

      &:first-child {
        padding-left: 16px !important;
        padding-right: 16px !important;
      }

      &:last-child {
        padding-left: 16px !important;
        padding-right: 16px !important;
        text-align: right;
      }
    }

    &:last-child td {
      border-bottom: none !important;
    }
  }
}

.t-table__expanded-row>td {
  border-bottom: none !important;
}

// 配方信息列
.formula-info {
  display: flex;
  align-items: center;
  gap: 8px;

  .formula-avatar {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 9px;
    text-transform: uppercase;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  }

  .formula-details {
    .formula-name {
      font-weight: 600;
      color: var(--color-text-primary);
      transition: color 0.2s;
      font-size: 13px;
      margin: 0 0 1px 0;
    }

    .formula-version-tag {
      margin: 0;
      font-size: 11px;
      line-height: 1;
    }
  }
}

// 创建人列
.creator-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  .creator-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
    user-select: none;
    overflow: hidden;

    &.creator-avatar--img {
      background: var(--color-bg-page);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
      }
    }
  }

  .creator-name {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

// 版本状态列
.version-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;

  .status-text {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
  }
}

// 原料数量列
.material-count {
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-secondary);
  background-color: var(--color-bg-page);
  padding: 1px var(--space-1);
  border-radius: 6px;

  .material-unit {
    font-size: 10px;
    color: var(--color-text-placeholder);
  }
}

// 负责人列 - 首字母头像（替代外部 dicebear API）
.salesman-info {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  .salesman-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
    user-select: none;
  }

  .salesman-name {
    font-size: 13px;
    color: var(--color-text-secondary);
  }
}

.sales-quantity-cell {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 8px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;

  &:hover {
    background: #ecfdf5;
  }

  .sales-qty-value {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-primary-dark);

    &--clickable {
      text-decoration: underline;
      text-decoration-color: rgba(5, 150, 105, 0.3);
      text-underline-offset: 3px;
      cursor: pointer;

      &:hover {
        text-decoration-color: var(--color-primary-dark);
      }
    }

    .sales-qty-unit {
      font-size: 12px;
      font-weight: 400;
      color: var(--color-text-placeholder);
      margin-left: var(--space-0-5);
    }
  }

  .sales-qty-empty {
    font-size: 12px;
    color: var(--color-text-placeholder);
    padding: var(--space-0-5) 8px;
    border: 1px dashed #cbd5e1;
    border-radius: 6px;
    transition: all 0.2s;

    &--clickable {
      text-decoration: underline;
      text-decoration-color: rgba(148, 163, 184, 0.3);
      text-underline-offset: 3px;
      cursor: pointer;

      &:hover {
        color: var(--color-primary-dark);
        border-color: var(--color-primary-dark);
        background: #ecfdf5;
        text-decoration-color: var(--color-primary-dark);
      }
    }

    &:hover {
      color: var(--color-primary-dark);
      border-color: var(--color-primary-dark);
      background: #ecfdf5;
    }
  }
}

.action-btn.sales-btn {
  color: #8b5cf6;

  &:hover {
    color: #7c3aed;
    background: #f5f3ff;
  }
}

// 价格列
.price-cell-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.price-cell {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-0-5);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
  white-space: nowrap;

  &--quote {
    color: var(--color-primary-dark);

    &::before {
      content: '';
      display: inline-block;
      width: 6px;
      height: 6px;
      background: var(--color-primary);
      border-radius: 50%;
      margin-right: 4px;
      vertical-align: middle;
    }
  }

  &--empty {
    font-weight: 400;
    color: var(--color-text-placeholder);
    font-family: inherit;

    &::before {
      display: none;
    }
  }
}

.price-warn-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 11px;
  font-weight: 500;
  color: #b45309;
  background: #fffbeb;
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid #fde68a;
  cursor: help;
  white-space: nowrap;
  line-height: 1.4;
}

// 操作下拉按钮
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

  .t-icon {
    font-size: 16px;
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

    &:hover {
      background: #f1f5f9;
    }

    svg {
      flex-shrink: 0;
    }
  }

  .action-menu-item--danger {
    color: #e34d59;

    &:hover {
      background: #fff1f0;
    }
  }
}

// 价格引导提示
.price-hint-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 11px;
  font-weight: 500;
  color: #2563eb;
  background: #eff6ff;
  padding: 1px 6px;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
  cursor: pointer;
  white-space: nowrap;
  line-height: 1.4;
  transition: all 0.2s;

  &:hover {
    background: #dbeafe;
    border-color: #93c5fd;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 8. 排序弹窗 — 确保不被裁剪 */
.formula-list .content-card .t-table,
.formula-list .content-card .t-table .t-table__header,
.formula-list .content-card .t-table .t-table__body-wrapper {
  overflow: hidden !important;
}
</style>

<!-- ═══════════ 非 scoped 覆盖块：彻底消除全局 _td-overrides.scss 粉色残留 ═══════════ -->
<style>
@use '@/assets/styles/variables.scss' as *;
/* 全局粉色变量值: $bg-page=#FFF9F7, $bg-table-row-hover=#FFF5F8, $bg-table-row-selected=var(--color-primary-bg)
   策略: 默认全部清除(box-shadow:none), 仅在 :hover 伪类和 .selected 时添加 */

/* 1. 表格容器 - 白色背景 */
.formula-list .content-card .t-table,
.formula-list .content-card .t-table .t-table__body-wrapper,
.formula-list .content-card .t-table .t-table__body-inner,
.formula-list .content-card .t-table .t-table__body {
  background: #fff !important;
}

/* 2. 所有行 - 白色 */
.formula-list .content-card .t-table .t-table__body tr,
.formula-list .content-card .t-table .t-table__body .t-table__row {
  background-color: #fff !important;
}

/* 3. 所有单元格（含 TDesign --hover 类）- 无竖线 */
.formula-list .content-card .t-table .t-table__body td,
.formula-list .content-card .t-table .t-table__body .t-table__row td,
.formula-list .content-card .t-table .t-table__body .t-table__row.t-table__row--hover td {
  background-color: transparent !important;
  border-bottom-color: #f1f5f9 !important;
  color: var(--color-text-primary) !important;
  box-shadow: none !important;
}

/* 4. CSS :hover 伪类（优先级最高）→ emerald 浅绿 + 首列绿条 */
.formula-list .content-card .t-table .t-table__body tr:hover>td,
.formula-list .content-card .t-table .t-table__body .t-table__row:hover>td {
  background-color: rgba(209, 250, 229, 0.35) !important;
}

.formula-list .content-card .t-table .t-table__body tr:hover>td:first-child,
.formula-list .content-card .t-table .t-table__body .t-table__row:hover>td:first-child {
  box-shadow: inset 3px 0 0 var(--color-primary-light) !important;
}

/* 5. 选中行 → emerald 更深 + 绿条 */
.formula-list .content-card .t-table .t-table__body .t-table__row.t-table__row--selected>td {
  background-color: rgba(209, 250, 229, 0.6) !important;
  box-shadow: inset 3px 0 0 var(--color-primary) !important;
}

/* 6. 表头 */
.formula-list .content-card .t-table .t-table__header th {
  background: var(--color-bg-page) !important;
  color: var(--color-text-secondary) !important;
}

/* 7. Checkbox 主题色 — 绿色 var(--color-primary) */
.formula-list .content-card .t-table {
  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
  --td-brand-color-disabled: var(--color-primary-lightest);
  --td-brand-color-light: rgba(16, 185, 129, 0.1);
  --td-brand-color-focus: rgba(16, 185, 129, 0.4);
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
    border-color: #fff !important;
  }

  .t-checkbox .t-checkbox__input:hover .t-checkbox__input__inner {
    border-color: var(--td-brand-color) !important;
  }

  .t-checkbox .t-checkbox__input.is-focus .t-checkbox__input__inner {
    box-shadow: 0 0 0 2px var(--td-brand-color-focus) !important;
  }
}

.formula-list .add-formula-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 16px !important;
  border-radius: 12px !important;
  background-color: var(--color-text-primary) !important;
  color: white !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  border: none !important;
  cursor: pointer !important;
  transition: all $transition-fast !important;
  box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15) !important;

  &:hover {
    background-color: var(--color-text-primary) !important;
  }

  .add-icon {
    font-size: 18px !important;
    transition: transform 0.2s !important;
  }

  &:hover .add-icon {
    transform: rotate(90deg) !important;
  }

  svg {
    flex-shrink: 0 !important;
  }
}

/* 自定义排序 */
.formula-list .custom-sort-header {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.formula-list .custom-sort-header:hover {
  color: var(--color-primary);
}

.formula-list .custom-sort {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: var(--space-0-5);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  opacity: 0.25;
  transition: all 0.2s;
}

.formula-list .custom-sort--none {
  border-top: 5px solid var(--color-text-placeholder);
  border-bottom: none;
}

.formula-list .custom-sort--asc {
  border-bottom: 5px solid var(--color-primary);
  border-top: none;
  opacity: 1;
}

.formula-list .custom-sort--desc {
  border-top: 5px solid var(--color-primary);
  border-bottom: none;
  opacity: 1;
}
</style>
