<template>
  <div class="salesman-list" :aria-busy="!initialized">
    <!-- 数据看板 -->
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
          <p class="stat-value">
            <span class="stat-value-left">
              {{ card.value }} <small class="stat-unit">{{ card.unit }}</small>
            </span>
            <span v-if="card.topName" class="stat-top-name">
              <span class="champion-icon">🏆</span>
              {{ card.topName }}
            </span>
          </p>
        </div>
      </div>
    </section>

    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="6" />
      <t-card v-else class="content-card" bordered>
        <!-- 工具栏 -->
        <div class="data-center-toolbar">
          <!-- 批量操作栏 (默认隐藏) -->
          <Transition name="batch-bar-slide">
            <div v-if="selectedRows.length > 0" class="batch-action-bar">
              <div class="batch-info">
                <span class="batch-count"><strong>{{ selectedRows.length }}</strong> 项已选择</span>
                <div class="batch-divider"></div>
                <div class="batch-buttons">
                  <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedRows.length} 个业务员吗？删除后无法恢复。`"
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
                </div>
              </div>
              <button class="batch-cancel-btn" @click="clearSelection">取消</button>
            </div>
          </Transition>

          <!-- 左侧：标题和描述 -->
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">业务员管理中心</h3>
              <p class="toolbar-subtitle">查看业务员信息、管理状态与部门归属</p>
            </div>
          </div>

          <!-- 右侧：搜索和新增按钮 -->
          <div class="toolbar-right-section">
            <div class="search-container" role="search">
              <label for="salesman-search-input" class="sr-only">搜索业务员</label>
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input id="salesman-search-input" v-model="searchKeyword" class="search-input"
                placeholder="搜索业务员姓名、工号..." @input="handleRealTimeSearch" @clear="handleRealTimeSearch" clearable
                aria-label="按业务员姓名或工号搜索" />
            </div>
            <button class="add-formula-btn" @click="handleCreate" aria-label="添加新业务员">
              <t-icon name="add" class="add-icon" />
              添加业务员
            </button>
            <button class="filter-btn" aria-label="筛选业务员状态" aria-haspopup="true">
              <t-icon name="filter" class="filter-icon" />
              <span class="filter-dot"></span>
            </button>
          </div>
        </div>

        <t-table :data="sortedSalesmen" :columns="columns" :loading="salesmanStore.loading" :pagination="undefined"
          row-key="id" hover table-layout="auto" @row-click="handleRowClick" :selected-row-keys="selectedRowKeys"
          @select-change="handleSelectChange">
          <template #name="{ row }">
            <div class="salesman-info">
              <div class="salesman-avatar" :style="{ backgroundColor: getAvatarColor(row.name).bg }">
                {{ getAvatarInitial(row.name) }}
              </div>
              <div class="salesman-details">
                <p class="salesman-name">{{ row.name }}</p>
                <p class="salesman-code">工号: {{ row.code }}</p>
              </div>
            </div>
          </template>

          <template #department="{ row }">
            <t-tag v-if="row.department" theme="primary" variant="light" size="medium">{{ row.department }}</t-tag>
            <span v-else class="text-muted">—</span>
          </template>

          <template #status="{ row }">
            <div class="status-wrapper">
              <t-tag :theme="row.status === 'active' ? 'success' : 'default'" variant="light" size="small"
                :class="'status-tag--' + row.status">
                {{ row.status === 'active' ? '活跃' : '停用' }}
              </t-tag>
              <span class="status-dot" :class="'status-dot--' + row.status"></span>
            </div>
          </template>

          <template #email="{ row }">
            <span v-if="row.email" class="email-cell">{{ formatEmail(row.email) }}</span>
            <span v-else class="text-muted">—</span>
          </template>

          <template #empty>
            <t-empty description="暂无业务员数据" role="status">
              <template #action>
                <button class="add-formula-btn" @click="handleCreate">
                  <t-icon name="add" class="add-icon" />
                  添加业务员
                </button>
              </template>
            </t-empty>
          </template>

          <template #operation="{ row }">
            <div class="action-buttons" role="group" aria-label="业务员操作">
              <button class="action-btn edit-btn" @click.stop="handleEdit(row)" title="编辑"
                :aria-label="`编辑业务员${row.name}`">
                <t-icon name="edit-1" />
              </button>
              <t-popconfirm v-if="row.status === 'active'" content="确定要停用该业务员吗？" @confirm="handleToggleStatus(row)">
                <button class="action-btn status-btn" @click.stop title="停用" :aria-label="`停用业务员${row.name}`">
                  <t-icon name="poweroff" />
                </button>
              </t-popconfirm>
              <t-popconfirm content="确定要删除该业务员吗？删除后无法恢复。" @confirm="handleDelete(row)">
                <button class="action-btn delete-btn" @click.stop title="删除" :aria-label="`删除业务员${row.name}`">
                  <t-icon name="delete" />
                </button>
              </t-popconfirm>
            </div>
          </template>
        </t-table>

        <!-- 分页 -->
        <div v-if="paginationStore.visible && salesmanStore.total > 0" class="table-pagination">
          <div class="pagination-info">
            显示第 {{ (salesmanStore.currentPage - 1) * salesmanStore.pageSize + 1 }}-{{
              Math.min(salesmanStore.currentPage * salesmanStore.pageSize, salesmanStore.total)
            }} 条，共 {{ salesmanStore.total }} 条数据
          </div>
          <div class="pagination-controls">
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': salesmanStore.currentPage === 1 }"
              :disabled="salesmanStore.currentPage === 1"
              @click="salesmanStore.setPage(salesmanStore.currentPage - 1); salesmanStore.fetchSalesmen()">上一页</button>
            <template v-for="page in pageNumbers" :key="page">
              <button v-if="page !== '...'" class="pagination-btn"
                :class="{ 'pagination-btn--active': page === salesmanStore.currentPage }"
                @click="typeof page === 'number' && (salesmanStore.setPage(page), salesmanStore.fetchSalesmen())">{{
                  page
                }}</button>
              <span v-else class="pagination-ellipsis">...</span>
            </template>
            <button class="pagination-btn"
              :class="{ 'pagination-btn--disabled': salesmanStore.currentPage === totalPages }"
              :disabled="salesmanStore.currentPage === totalPages"
              @click="salesmanStore.setPage(salesmanStore.currentPage + 1); salesmanStore.fetchSalesmen()">下一页</button>
          </div>
        </div>
      </t-card>
    </Transition>

    <!-- 底部快捷动态 -->
    <section class="activity-section">
      <!-- 近期业务员动态 -->
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期业务员动态
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
      <!-- 业务员小助手 -->
      <div class="activity-card activity-card--assistant">
        <div class="assistant-header">
          <h4 class="assistant-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            业务员小助手
          </h4>
          <div class="sm-nav" v-if="smTodoTotalPages > 1">
            <button class="activity-nav-btn" :disabled="smTodoPage <= 1" @click="smTodoPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ smTodoPage }} / {{ smTodoTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="smTodoPage >= smTodoTotalPages" @click="smTodoNext" title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div class="todo-list" v-if="paginatedSmTodoItems.length > 0">
          <TransitionGroup name="todo-list" tag="div" class="todo-list__inner">
            <div v-for="(item, _idx) in paginatedSmTodoItems" :key="item.id" class="todo-item"
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
              <button class="todo-item__action" @click="handleSmTodoAction(item)" :title="item.actionText">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </TransitionGroup>
        </div>

        <div class="assistant-empty" v-else>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>太棒了！暂无待处理事项</p>
          <span>所有业务员配方状态正常~</span>
        </div>

        <div class="assistant-footer">
          <span class="assistant-hint">{{ salesmanStore.total }} 名业务员 · 共 {{ displaySmPendingItems.length }} 项待办</span>
          <button class="assistant-refresh-btn" @click="refreshSmPending" title="刷新">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <svg class="assistant-bg-icon" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSalesmanStore } from '@/stores/salesman';
import { useSalesStore } from '@/stores/sales';
import { useFormulaStore } from '@/stores/formula';
import { usePaginationStore } from '@/stores/pagination';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Salesman } from '@/api/salesman';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const salesmanStore = useSalesmanStore();
const salesStore = useSalesStore();
const formulaStore = useFormulaStore();
const paginationStore = usePaginationStore();

const initialized = ref(false);

const searchKeyword = ref('');
const sortKey = ref<string>('');
const sortOrder = ref<'asc' | 'desc' | ''>('');
const sortedSalesmen = ref<Salesman[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<Salesman[]>([]);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// ─── 数据看板 ───
const dashboardCards = computed(() => {
  const total = salesmanStore.total ?? 0;
  const activeCount = salesmanStore.salesmen?.filter((s: Salesman) => s.status === 'active').length || 0;

  const salesList = salesStore.sales || [];
  const salesmanRevenueMap: Record<string, { name: string; revenue: number; }> = {};
  const salesmanQuantityMap: Record<string, { name: string; quantity: number; }> = {};

  for (const sale of salesList) {
    const saleSalesmanId = String(sale.salesmanId || '');
    if (!saleSalesmanId) continue;
    if (!salesmanRevenueMap[saleSalesmanId]) {
      const salesman = salesmanStore.salesmen?.find((s: Salesman) => String(s.id) === saleSalesmanId);
      const salesmanName = salesman?.name || '未知';
      salesmanRevenueMap[saleSalesmanId] = { name: salesmanName, revenue: 0 };
      salesmanQuantityMap[saleSalesmanId] = { name: salesmanName, quantity: 0 };
    }
    salesmanRevenueMap[saleSalesmanId].revenue += (sale.revenue || 0);
    salesmanQuantityMap[saleSalesmanId].quantity += (sale.quantity || 0);
  }

  const revenueRanking = Object.values(salesmanRevenueMap).sort((a, b) => b.revenue - a.revenue);
  const quantityRanking = Object.values(salesmanQuantityMap).sort((a, b) => b.quantity - a.quantity);

  const topRevenueSalesman = revenueRanking[0];
  const topQuantitySalesman = quantityRanking[0];

  return [
    {
      label: '业务员总数',
      value: total.toString(),
      unit: '人',
      badge: activeCount > 0 ? `活跃 ${activeCount}` : '—',
      badgeColor: 'var(--color-primary)',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    },
    {
      label: '销售额第一',
      value: topRevenueSalesman ? `¥${(topRevenueSalesman.revenue / 10000).toFixed(1)}万` : '—',
      unit: '',
      topName: topRevenueSalesman ? topRevenueSalesman.name : '',
      badge: topRevenueSalesman ? 'TOP1' : '—',
      badgeColor: '#8B5CF6',
      badgeBg: '#F5F3FF',
      iconBg: '#F5F3FF',
      iconColor: '#8B5CF6',
      iconPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    },
    {
      label: '销量第一',
      value: topQuantitySalesman ? `${(topQuantitySalesman.quantity / 10000).toFixed(2)}万件` : '—',
      unit: '',
      topName: topQuantitySalesman ? topQuantitySalesman.name : '',
      badge: topQuantitySalesman ? 'TOP1' : '—',
      badgeColor: 'var(--color-warning)',
      badgeBg: '#FFFBEB',
      iconBg: '#FFFBEB',
      iconColor: 'var(--color-warning)',
      iconPath: '<path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/>',
    },
    {
      label: '本月新增',
      value: '0',
      unit: '人',
      badge: '待统计',
      badgeColor: '#A855F7',
      badgeBg: '#FAF5FF',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>',
    },
  ];
});

// ─── 排序 ───
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
    sortedSalesmen.value = [...salesmanStore.salesmen];
    return;
  }
  const dir = sortOrder.value === 'desc' ? -1 : 1;

  const sortFns: Record<string, (a: any, b: any) => number> = {
    name: (a, b) => a.name.localeCompare(b.name, 'zh'),
    code: (a, b) => a.code.localeCompare(b.code),
    department: (a, b) => (a.department || '').localeCompare(b.department || '', 'zh'),
    status: (a, b) => a.status.localeCompare(b.status),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

  const fn = sortFns[sortKey.value];
  sortedSalesmen.value = fn
    ? [...salesmanStore.salesmen].sort((a, b) => fn(a, b) * dir)
    : [...salesmanStore.salesmen];
};

watch(() => salesmanStore.salesmen, (val) => {
  if (sortKey.value && sortOrder.value) {
    applySort();
  } else {
    sortedSalesmen.value = [...val];
  }
}, { immediate: true });

// ─── 批量操作 ───
const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: Salesman[]; }) => {
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
  const failedNames: string[] = [];
  for (const s of selectedRows.value) {
    try {
      await salesmanStore.deleteSalesman(s.id);
      successCount++;
    } catch {
      failedNames.push(s.name || s.id);
    }
  }
  if (failedNames.length === 0) {
    MessagePlugin.success(`成功删除 ${count} 个业务员`);
  } else if (successCount > 0) {
    MessagePlugin.warning(`成功删除 ${successCount} 个，${failedNames.length} 个删除失败（可能被配方引用）`);
  } else {
    MessagePlugin.error('删除失败，所选业务员可能已被配方引用');
  }
  clearSelection();
  await salesmanStore.fetchSalesmen();
};

// ─── 表格列定义 ───
const columns = computed(() => [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'name', title: sortTitle('姓名', 'name'), width: 180 },
  { colKey: 'code', title: sortTitle('工号', 'code'), width: 120 },
  { colKey: 'department', title: sortTitle('部门', 'department'), width: 140 },
  { colKey: 'phone', title: '电话', width: 150 },
  { colKey: 'email', title: '邮箱', width: 200 },
  { colKey: 'status', title: sortTitle('状态', 'status'), width: 100 },
  { colKey: 'createdAt', title: sortTitle('创建时间', 'createdAt'), width: 180 },
  { colKey: 'operation', title: '操作', width: 120, align: 'center', className: 'operation-col-center' }
]);

// ─── 分页 ───
const pagination = computed(() => ({
  current: salesmanStore.currentPage,
  pageSize: salesmanStore.pageSize,
  total: salesmanStore.total,
  onChange: (pageInfo: any) => {
    salesmanStore.setPage(pageInfo.current);
    salesmanStore.fetchSalesmen();
  }
}));

const totalPages = computed(() => Math.ceil(salesmanStore.total / salesmanStore.pageSize) || 1);
const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = salesmanStore.currentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

// ─── 动态时间线 ───
interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const list = salesmanStore.salesmen;
  if (!list || list.length === 0) return [];

  const items: ActivityItem[] = [];
  for (const s of list.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())) {
    items.push({
      type: s.status === 'active' ? 'success' : 'warning',
      title: s.name,
      desc: `<strong>${s.department || '未分配部门'}</strong> · 工号 <span class="text-emerald-600 font-bold">${s.code}</span>${s.phone ? ` · ${s.phone}` : ''}`,
      time: formatTimeAgo(s.createdAt)
    });
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
  const total = salesmanStore.total;
  if (total === 0) return '您还没有添加任何业务员，点击下方按钮开始吧！';
  if (total < 5) return `当前共有 ${total} 个业务员在库，建议继续丰富团队。`;
  return `当前共有 ${total} 个业务员在库。`;
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
  return `${days}天前`;
}

function getAvatarInitial(name: string): string {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

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

// ─── 全局搜索监听 ───
const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || '';
  searchKeyword.value = keyword;
  salesmanStore.setKeyword(keyword);

  // 更新路由查询参数
  const query = { ...route.query };
  if (keyword) {
    query.keyword = keyword;
  } else {
    delete query.keyword;
  }
  router.replace({ query });

  salesmanStore.fetchSalesmen();
};

let _isRestoringFromRoute = false;

onMounted(async () => {
  window.addEventListener('global-search', handleGlobalSearch);
  paginationStore.register(pagination.value);
  watch(pagination, (val) => paginationStore.update(val), { deep: true });

  if (route.query.keyword) {
    const keyword = route.query.keyword as string;
    _isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    salesmanStore.setKeyword(keyword);
    await nextTick();
  }

  await salesmanStore.fetchSalesmen();
  initialized.value = true;
});

// 处理 keep-alive 缓存的组件重新激活时恢复搜索状态
onActivated(async () => {
  if (route.query.keyword && route.query.keyword !== searchKeyword.value) {
    const keyword = route.query.keyword as string;
    _isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    salesmanStore.setKeyword(keyword);
    await nextTick();
    salesmanStore.fetchSalesmen();
  }
});

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch);
  paginationStore.unregister();
});

// ─── 操作函数 ───
const handleRealTimeSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    salesmanStore.setKeyword(searchKeyword.value);
    salesmanStore.fetchSalesmen();

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
  }, 300);
};

interface SmTodoItem {
  id: string;
  type: 'warning' | 'info' | 'default';
  priority: 'high' | 'medium' | 'low';
  title: string;
  desc: string;
  actionText: string;
  actionType: 'view' | 'formulas';
  salesmanId?: string;
}

const displaySmPendingItems = computed<SmTodoItem[]>(() => {
  const items: SmTodoItem[] = [];
  const salesmen = salesmanStore.salesmen || [];
  const salesList = salesStore.sales || [];

  for (const s of salesmen) {
    const salesmanFormulas = formulaStore.formulas?.filter((f: any) => f.salesmanId === s.id) || [];

    if (salesmanFormulas.length > 0) {
      for (const f of salesmanFormulas) {
        const currentVersion = (f.versions || []).find((v: any) => v.isCurrent);
        if (!currentVersion && f.versions && f.versions.length > 0) {
          items.push({
            id: `draft-${s.id}-${f.id}`,
            type: 'warning',
            priority: 'high',
            title: '配方草稿未发布',
            desc: `${s.name} 的「${f.name}」有草稿版本`,
            actionText: '去发布',
            actionType: 'view',
            salesmanId: s.id
          });
        }
      }

      const hasPublishedFormula = salesmanFormulas.some((f: any) => {
        const cv = (f.versions || []).find((v: any) => v.isCurrent);
        return cv?.status === 'published';
      });

      if (!hasPublishedFormula && salesmanFormulas.length > 0 && !items.find(i => i.salesmanId === s.id)) {
        items.push({
          id: `nopub-${s.id}`,
          type: 'info',
          priority: 'medium',
          title: '暂无已发布配方',
          desc: `${s.name} 尚无已发布的配方`,
          actionText: '查看配方',
          actionType: 'formulas',
          salesmanId: s.id
        });
      }
    } else {
      const hasSalesRecord = salesList.some((sale: any) => sale.salesmanId === s.id);
      if (!hasSalesRecord && s.status === 'active') {
        items.push({
          id: `nosales-${s.id}`,
          type: 'default',
          priority: 'low',
          title: '无销售记录',
          desc: `${s.name} 本月暂无销售记录`,
          actionText: '录入销量',
          actionType: 'view',
          salesmanId: s.id
        });
      }
    }
  }

  if (salesmen.length === 0 || items.length === 0) {
    items.push(
      {
        id: 'sm-mock-1', type: 'warning' as const, priority: 'high' as const,
        title: '配方待发布', desc: '周伯通 的「人参养颜膏」有新版本草稿未发布', actionText: '去处理', actionType: 'view' as const
      },
      {
        id: 'sm-mock-2', type: 'info' as const, priority: 'medium' as const,
        title: '配方状态提醒', desc: '杨康 有2个配方处于草稿状态', actionText: '查看详情', actionType: 'formulas' as const
      },
      {
        id: 'sm-mock-3', type: 'default' as const, priority: 'low' as const,
        title: '销售数据缺失', desc: '杨过 本月暂无销售数据，请及时录入', actionText: '去录入', actionType: 'view' as const
      },
    );
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items.slice(0, 6);
});

const SM_TODO_PAGE_SIZE = 3;
const smTodoPage = ref(1);

const smTodoTotalPages = computed(() => Math.max(1, Math.ceil(displaySmPendingItems.value.length / SM_TODO_PAGE_SIZE)));

const paginatedSmTodoItems = computed(() => {
  const start = (smTodoPage.value - 1) * SM_TODO_PAGE_SIZE;
  return displaySmPendingItems.value.slice(start, start + SM_TODO_PAGE_SIZE);
});

const smTodoPrev = () => { if (smTodoPage.value > 1) smTodoPage.value--; };
const smTodoNext = () => { if (smTodoPage.value < smTodoTotalPages.value) smTodoPage.value++; };

const handleSmTodoAction = (item: SmTodoItem) => {
  switch (item.actionType) {
    case 'view':
      if (item.salesmanId) handleView({ id: item.salesmanId } as Salesman);
      break;
    case 'formulas':
      router.push('/formulas');
      break;
  }
};

const refreshSmPending = () => {
  salesmanStore.fetchSalesmen();
};

const handleCreate = () => {
  router.push({
    path: '/salesmen/new',
    query: route.query
  });
};
const handleView = (row: Salesman) => {
  router.push({
    path: `/salesmen/${row.id}`,
    query: route.query
  });
};

const formatEmail = (email: string) => {
  if (!email) return '';
  const atIndex = email.indexOf('@');
  if (atIndex === -1) return email;
  const username = email.substring(0, atIndex);
  const domain = email.substring(atIndex);
  return `${username}\n${domain}`;
};

const handleRowClick = (ctx: { row: Salesman; col?: { colKey: string; }; }) => {
  if (!ctx.col || ctx.col.colKey !== 'row-select') {
    handleView(ctx.row);
  }
};

const handleEdit = (row: Salesman) => {
  router.push({
    path: `/salesmen/${row.id}/edit`,
    query: route.query
  });
};

const handleToggleStatus = async (row: Salesman) => {
  try {
    const newStatus = row.status === 'active' ? 'inactive' : 'active';
    const result = await salesmanStore.toggleSalesmanStatus(row.id, newStatus);
    if (result.success) {
      MessagePlugin.success(result.message || `${row.name} 已${newStatus === 'inactive' ? '停用' : '启用'}`);
      clearSelection();
    } else {
      MessagePlugin.error(result.message || '操作失败');
    }
  } catch {
    MessagePlugin.error('操作失败');
  }
};

const handleDelete = async (row: Salesman) => {
  try {
    const result = await salesmanStore.deleteSalesman(row.id);
    if (result.success) {
      MessagePlugin.success(`${row.name} 已删除`);
      clearSelection();
    } else {
      MessagePlugin.error(result.message || '删除失败');
    }
  } catch {
    MessagePlugin.error('删除失败');
  }
};
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.salesman-list {
  display: flex;
  flex-direction: column;
  gap: 16px;

  // ─── 数据看板布局 ───
  .dashboard-section {
    margin-bottom: 0;
  }

  // ─── 数据看板 ───
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }

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
        white-space: pre-line;
        word-break: break-word;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;

        .stat-value-left {
          display: inline-flex;
          align-items: baseline;
          gap: var(--space-0-5);
        }

        .stat-top-name {
          font-size: 11px;
          font-weight: 600;
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #D97706;
          flex-shrink: 0;

          .champion-icon {
            display: inline-block;
            font-size: 14px;
            animation: championFloat 2s ease-in-out infinite;
          }
        }

        .stat-unit {
          font-size: 11px;
          font-weight: 400;
          color: var(--color-text-placeholder);
        }
      }
    }
  }

  // ─── 工具栏 ───
  .data-center-toolbar {
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
      margin-left: auto;
    }

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
          padding-bottom: 8px;
          background-color: var(--color-bg-page);
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
            color: var(--color-text-placeholder);
          }
        }
      }
    }

    .add-formula-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background-color: var(--color-text-primary);
      color: white;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 500;
      transition: all $transition-fast;
      box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15);
      border: none;
      cursor: pointer;

      &:hover {
        background-color: var(--color-text-primary);
      }

      .add-icon {
        font-size: 18px;
        transition: transform 0.2s;
      }

      &:hover .add-icon {
        transform: rotate(90deg);
      }
    }

    .filter-btn {
      position: relative;
      padding: 8px;
      color: var(--color-text-placeholder);
      background-color: transparent;
      border: 1px solid #f1f5f9;
      border-radius: 8px;
      transition: all $transition-fast;
      cursor: pointer;

      &:hover {
        background-color: var(--color-bg-page);
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
        background-color: var(--color-primary);
        border-radius: 50%;
        border: 2px solid white;
        opacity: 0;
        transition: opacity 0.2s;
      }

      &:hover .filter-dot {
        opacity: 1;
      }
    }

    // ─── 批量操作栏 ───
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
      padding: 20px 32px;
      // 上方圆角匹配 content-card 的 32px 圆角
      border-radius: var(--radius-5xl) var(--radius-5xl) 0 0;
      box-shadow: 0 4px 18px rgba(5, 150, 105, 0.25);

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
          background: rgba(52, 211, 153, 0.50);
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
          transition: all $transition-fast;

          &:hover {
            color: var(--color-primary-bg);
          }

          svg {
            width: 14px;
            height: 14px;
            stroke-width: 2;
          }
        }
      }

      .batch-cancel-btn {
        font-size: 14px;
        font-weight: 500;
        border: 1px solid var(--color-primary-light);
        padding: 4px 12px;
        border-radius: 8px;
        background: transparent;
        color: #fff;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          background-color: var(--color-primary-deep);
        }
      }
    }
  }

  // ─── 批量操作栏动画 ───
  :deep(.batch-bar-slide-enter-active),
  :deep(.batch-bar-slide-leave-active) {
    transition: all $transition-slow;
  }

  :deep(.batch-bar-slide-enter-from),
  :deep(.batch-bar-slide-leave-to) {
    opacity: 0;
    transform: translateY(-8px);
  }

  // ─── 内容卡片 ───
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
      @include stagger-rows(20, 0.03s);
    }
  }

  // ─── 业务员信息列 ───
  .salesman-info {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .salesman-avatar {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .salesman-details {
    .salesman-name {
      margin: 0 0 1px 0;
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
    }

    .salesman-code {
      margin: 0;
      font-size: 11px;
      color: var(--color-text-placeholder);
      line-height: 1;
    }
  }

  .text-muted {
    color: #CBD5E1;
    font-size: 13px;
  }

  .email-cell {
    display: inline-flex;
    flex-direction: column;
    line-height: 1.4;
    font-size: 13px;
    color: var(--color-text-secondary);
    white-space: pre-line;
    word-break: break-all;
  }

  // ─── 状态标签 ───
  .status-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
  }

  .status-tag--active {
    background: $overlay-emerald-08;
    color: var(--color-primary-dark);
    border: none;
  }

  .status-tag--inactive {
    background: #f1f5f9;
    color: var(--color-text-secondary);
    border: none;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &--active {
      background: var(--color-primary);
      box-shadow: 0 0 6px $overlay-emerald-40;
    }

    &--inactive {
      background: var(--color-text-placeholder);
    }
  }

  // ─── 操作按钮 ───
  .action-buttons {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid transparent;
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
    transition: all $transition-fast;
    color: var(--color-text-secondary);

    &:hover {
      background: var(--color-bg-page);
      border-color: var(--color-border);
    }

    &.view-btn:hover {
      color: #3B82F6;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    &.edit-btn:hover {
      color: var(--color-primary);
      border-color: var(--color-primary-lightest);
      background: #ecfdf5;
    }

    &.status-btn:hover {
      color: var(--color-warning);
      border-color: #fde68a;
      background: #fffbeb;
    }

    &.delete-btn:hover {
      color: var(--color-danger);
      border-color: #fecaca;
      background: #fef2f2;
    }
  }

  // ─── 分页样式 ───
  .table-pagination {
    padding: 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #fff;
    border-top: 1px solid var(--color-bg-page);
    border-radius: 0 0 var(--radius-5xl) var(--radius-5xl);

    .pagination-info {
      font-size: 14px;
      color: var(--color-text-placeholder);
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

  // ─── 表格样式 - 覆盖全局粉色主题，使用绿色主题 ───
  :deep(.t-table) {
    border-radius: 16px !important;
    overflow: hidden;

    .t-table__header {
      position: sticky !important;
      top: 0 !important;
      z-index: 5 !important;
      background: var(--color-bg-page) !important;
      backdrop-filter: none !important;

      th {
        background: var(--color-bg-page) !important;
        color: var(--color-text-placeholder) !important;
        font-size: 12px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
        font-weight: 600 !important;
        padding: var(--space-3-5) 20px !important;
        border-bottom: 1px solid var(--color-border) !important;

        &:first-child {
          padding-left: 24px !important;
          padding-right: 24px !important;
        }

        &:last-child {
          padding-left: 24px !important;
          padding-right: 24px !important;
          text-align: right !important;
        }

        &.t-table__th--sortable {
          cursor: pointer;
          transition: color 0.2s;

          &:hover {
            color: var(--color-primary) !important;
          }

          .t-table__cell--title {
            display: flex;
            align-items: center;
            gap: 4px;

            .t-table__sort-icon,
            &>.t-icon,
            .t-icon {
              font-size: 10px !important;

              svg {
                width: 12px !important;
                height: 12px !important;
                margin-top: -2px;
              }
            }

            .t-table__sort-icon--active {
              color: var(--color-primary) !important;
            }
          }
        }
      }
    }

    .t-table__body {
      background: #fff !important;

      .t-table__row {
        td {
          padding: var(--space-4-5) 20px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          vertical-align: middle;
          background-color: #fff !important;

          &:first-child {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }

          &:last-child {
            padding-left: 24px !important;
            padding-right: 24px !important;
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
          border-color: #{$text-white};
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

  // ─── 动态区域 ───
  .activity-section {
    margin-top: 8px;
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
      border: 1.5px solid rgba(59, 130, 246, 0.20);
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
    }

    &--warning {
      background: #fffbeb;
    }

    &--info {
      background: #eff6ff;
    }

    .timeline-dot-inner {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--color-primary);
    }

    &--warning .timeline-dot-inner {
      background: var(--color-warning);
    }

    &--info .timeline-dot-inner {
      background: #3B82F6;
    }
  }

  .timeline-content {
    flex: 1;
    min-width: 0;
  }

  .timeline-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #0F172A;
  }

  .timeline-desc {
    margin: 0 0 4px;
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .timeline-time {
    font-size: 12px;
    color: var(--color-text-placeholder);
  }

  // ─── 小助手卡片 ───
  .assistant-content {
    position: relative;
    z-index: 1;
  }

  .assistant-title {
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 8px;
  }

  .assistant-desc {
    font-size: 14px;
    opacity: 0.9;
    margin: 0 0 20px;
    line-height: 1.6;
  }

  .assistant-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: var(--space-2-5) 24px;
    background: $overlay-white-20;
    border: 1px solid $overlay-white-30;
    border-radius: 12px;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $overlay-white-30;
      transform: translateY(-1px);
    }
  }

  .assistant-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid $overlay-white-20;
  }

  .assistant-avatar-group {
    display: flex;
    gap: -8px;
  }

  .assistant-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: $overlay-white-25;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    margin-left: -8px;
    border: 2px solid $overlay-white-50;

    &:first-child {
      margin-left: 0;
    }
  }

  .assistant-hint {
    font-size: 13px;
    opacity: 0.8;
  }

  .assistant-bg-icon {
    position: absolute;
    right: -10px;
    bottom: -10px;
    opacity: 0.1;
    color: #fff;
  }

  // ─── 表格覆盖 ───
  :deep(.t-table) {
    .t-table__row {
      cursor: pointer;
    }

    .t-checkbox {
      .t-checkbox__input {
        &:hover .t-checkbox__input__inner {
          border-color: #3b82f6;
        }

        &.is-checked .t-checkbox__input__inner,
        &.is-indeterminate .t-checkbox__input__inner {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }

        &.is-focus .t-checkbox__input__inner {
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.20);
        }
      }
    }
  }

  // ─── 批量对话框 ───
  :global(.dialog-fade-enter-active),
  :global(.dialog-fade-leave-active) {
    transition: opacity 0.2s ease;
  }

  :global(.dialog-fade-enter-from),
  :global(.dialog-fade-leave-to) {
    opacity: 0;
  }

  :global(.batch-dialog-close-btn) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--color-text-placeholder);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: #f1f5f9;
      color: var(--color-text-secondary);
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

@keyframes rowFadeIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes expandRowFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
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

@keyframes championFloat {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-3px);
  }
}

// ─── 业务员小助手卡片 ───
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

  .sm-nav {
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

@media screen and (max-width: 1024px) {
  .salesman-list .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .salesman-list .activity-section {
    grid-template-columns: 1fr;
  }
}

@media screen and (max-width: 768px) {
  .salesman-list .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 24px;
  }
}
</style>

<style lang="scss">
@use '@/assets/styles/variables.scss' as *;

.salesman-list .add-formula-btn {
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
}

.salesman-list .content-card .t-table .t-table__body tr td,
.salesman-list .content-card .t-table .t-table__body .t-table__row--selected td,
.salesman-list .content-card .t-table .t-table__body .t-table__row--hover td,
.salesman-list .content-card .t-table .t-table__body .t-table__row--selected.t-table__row--hover td {
  background-color: #fff !important;
  box-shadow: none !important;
  border-left: none !important;
}

/* 操作列强制居中 */
.salesman-list .content-card .t-table .t-table__body td.operation-col-center {
  text-align: center !important;
  vertical-align: middle !important;
}

.salesman-list .operation-col-center {
  text-align: center !important;
}

.salesman-list .operation-col-center>div,
.salesman-list .action-buttons {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

/* 自定义排序 */
.salesman-list .custom-sort-header {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.salesman-list .custom-sort-header:hover {
  color: var(--color-primary);
}

.salesman-list .custom-sort {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: var(--space-0-5);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  opacity: 0.25;
  transition: all 0.2s;
}

.salesman-list .custom-sort--none {
  border-top: 5px solid var(--color-text-placeholder);
  border-bottom: none;
}

.salesman-list .custom-sort--asc {
  border-bottom: 5px solid var(--color-primary);
  border-top: none;
  opacity: 1;
}

.salesman-list .custom-sort--desc {
  border-top: 5px solid var(--color-primary);
  border-bottom: none;
  opacity: 1;
}
</style>
