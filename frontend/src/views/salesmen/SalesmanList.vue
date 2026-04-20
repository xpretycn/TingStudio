<template>
  <div class="salesman-list" :aria-busy="!initialized">
    <!-- 数据看板 -->
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
                  <button class="batch-action-btn" @click="handleBatchDelete">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    批量停用
                  </button>
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
          :sort="tableSort" row-key="id" hover table-layout="auto" @sort-change="onSortChange"
          :selected-row-keys="selectedRowKeys" @select-change="handleSelectChange">
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

          <template #empty>
            <t-empty description="暂无业务员数据" role="status">
              <template #action>
                <t-button theme="primary" @click="handleCreate">
                  <template #icon><t-icon name="add" /></template>添加业务员
                </t-button>
              </template>
            </t-empty>
          </template>

          <template #operation="{ row }">
            <div class="action-buttons" role="group" aria-label="业务员操作">
              <button class="action-btn view-btn" @click="handleView(row)" title="查看"
                :aria-label="`查看业务员${row.name}详情`">
                <t-icon name="browse" />
              </button>
              <button class="action-btn edit-btn" @click.stop="handleEdit(row)" title="编辑"
                :aria-label="`编辑业务员${row.name}`">
                <t-icon name="edit-1" />
              </button>
              <t-popconfirm v-if="row.status === 'active'" content="确定要停用该业务员吗？" @confirm="handleToggleStatus(row)">
                <button class="action-btn delete-btn" @click.stop title="停用" :aria-label="`停用业务员${row.name}`">
                  <t-icon name="poweroff" />
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
        <div class="assistant-content">
          <h4 class="assistant-title">业务员小助手</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="handleCreate">添加业务员</button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">业</span>
              <span class="assistant-avatar">务</span>
              <span class="assistant-avatar">员</span>
            </div>
            <span class="assistant-hint">{{ salesmanStore.total }} 个业务员在库</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
    </section>

    <!-- 批量停用确认 -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div v-if="batchDeleteDialogVisible"
          style="position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background-color:rgba(100,100,110,0.06);backdrop-filter:blur(1px)"
          @click.self="batchDeleteDialogVisible = false">
          <div
            style="width:440px;max-width:90vw;background:#fff;border-radius:16px;box-shadow:0 24px 80px rgba(0,0,0,0.12),0 6px 24px rgba(0,0,0,0.08);overflow:hidden;animation:dialog-pop-in 0.28s cubic-bezier(0.34,1.56,0.64,1);font-family:inherit">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 14px">
              <h3 style="margin:0;font-size:16px;font-weight:600;color:#1e293b">确认批量停用</h3>
              <button @click="batchDeleteDialogVisible = false" aria-label="关闭" class="batch-dialog-close-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round">
                  <path d="M18 6L6 18" />
                  <path d="M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div style="padding:2px 24px 18px">
              <p style="margin:0 0 10px;font-size:14px;color:#334155;line-height:1.7">
                确定要停用所选的 <strong>{{ selectedRows.length }}</strong> 个业务员吗？
              </p>
              <p class="delete-info"
                style="color:#64748b;font-size:13px;margin-top:8px;padding:10px 12px;background:#f8fafc;border-radius:8px;border-left:3px solid #fecdd3">
                停用后该业务员将无法登录系统，请谨慎操作。
              </p>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;padding:6px 24px 22px">
              <t-button variant="outline" size="medium" @click="batchDeleteDialogVisible = false">取消</t-button>
              <t-button variant="base" theme="danger" size="medium" :loading="batchDeleteLoading"
                @click="confirmBatchDelete">确定停用</t-button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSalesmanStore } from '@/stores/salesman';
import { usePaginationStore } from '@/stores/pagination';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Salesman } from '@/api/salesman';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const salesmanStore = useSalesmanStore();
const paginationStore = usePaginationStore();

const initialized = ref(false);

const searchKeyword = ref('');
const tableSort = ref<any>(undefined);
const sortedSalesmen = ref<Salesman[]>([]);
const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<Salesman[]>([]);
const batchDeleteDialogVisible = ref(false);
const batchDeleteLoading = ref(false);
let searchTimer: ReturnType<typeof setTimeout> | null = null;

// ─── 数据看板 ───
const dashboardCards = computed(() => {
  const total = salesmanStore.salesmen?.length || 0;
  const activeCount = salesmanStore.salesmen?.filter((s: Salesman) => s.status === 'active').length || 0;
  const departments = new Set((salesmanStore.salesmen || []).map((s: Salesman) => s.department).filter(Boolean));
  return [
    {
      label: '业务员总数',
      value: total.toString(),
      unit: '人',
      badge: activeCount > 0 ? `活跃 ${activeCount}` : '—',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    },
    {
      label: '活跃业务员',
      value: activeCount.toString(),
      unit: '人',
      badge: activeCount > 0 ? '在线' : '无',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
    {
      label: '部门数量',
      value: departments.size.toString(),
      label: '个',
      badge: '组织',
      badgeColor: '#94A3B8',
      badgeBg: '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
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
const onSortChange = (sort: any) => {
  tableSort.value = sort;
  if (!sort || !sort.sortBy) {
    sortedSalesmen.value = [...salesmanStore.salesmen];
    return;
  }
  const { sortBy, descending } = sort;
  const col = columns.find(c => c.colKey === sortBy);
  if (col?.sorter) {
    sortedSalesmen.value = [...salesmanStore.salesmen].sort((a, b) => {
      const result = (col.sorter as Function)(a, b);
      return descending ? -result : result;
    });
  } else {
    sortedSalesmen.value = [...salesmanStore.salesmen];
  }
};

watch(() => salesmanStore.salesmen, (val) => {
  if (tableSort.value?.sortBy) {
    onSortChange(tableSort.value);
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

const handleBatchDelete = () => {
  if (selectedRows.value.length === 0) return;
  batchDeleteDialogVisible.value = true;
};

const confirmBatchDelete = async () => {
  const count = selectedRows.value.length;
  batchDeleteLoading.value = true;
  try {
    for (const s of selectedRows.value) {
      await salesmanStore.deleteSalesman(s.id);
    }
    MessagePlugin.success(`成功停用 ${count} 个业务员`);
    clearSelection();
    batchDeleteDialogVisible.value = false;
  } catch {
    MessagePlugin.error('批量停用失败');
  } finally {
    batchDeleteLoading.value = false;
  }
};

// ─── 表格列定义 ───
const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'name', title: '姓名', width: 180, sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh') },
  { colKey: 'code', title: '工号', width: 120, sorter: (a: any, b: any) => a.code.localeCompare(b.code) },
  { colKey: 'department', title: '部门', width: 140, sorter: (a: any, b: any) => (a.department || '').localeCompare(b.department || '', 'zh') },
  { colKey: 'phone', title: '电话', width: 150 },
  { colKey: 'email', title: '邮箱', width: 200 },
  { colKey: 'status', title: '状态', width: 100, sorter: (a: any, b: any) => a.status.localeCompare(b.status) },
  { colKey: 'createdAt', title: '创建时间', width: 180, sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  { colKey: 'operation', title: '操作', width: 120, align: 'center' }
];

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

const assistantMessage = computed(() => {
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
    { bg: '#FEE2E2', text: '#EF4444' },
    { bg: '#FEF3C7', text: '#F59E0B' },
    { bg: '#D1FAE5', text: '#10B981' },
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
  salesmanStore.fetchSalesmen();
};

onMounted(async () => {
  window.addEventListener('global-search', handleGlobalSearch);
  paginationStore.register(pagination.value);
  watch(pagination, (val) => paginationStore.update(val), { deep: true });
  await salesmanStore.fetchSalesmen();
  initialized.value = true;
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
  }, 300);
};

const handleCreate = () => router.push('/salesmen/new');
const handleView = (row: Salesman) => router.push(`/salesmen/${row.id}`);
const handleEdit = (row: Salesman) => router.push(`/salesmen/${row.id}/edit`);

const handleToggleStatus = async (row: Salesman) => {
  try {
    const result = await salesmanStore.deleteSalesman(row.id);
    if (result.success) MessagePlugin.success(`${row.name} 已停用`);
    else MessagePlugin.error(result.message || '操作失败');
  } catch {
    MessagePlugin.error('停用失败');
  }
};
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.salesman-list {

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

  // ─── 工具栏 ───
  .data-center-toolbar {
    padding: 32px;
    border-bottom: 1px solid #f8fafc;
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
    }

    .search-container {
      position: relative;

      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: #94a3b8;
        pointer-events: none;
      }

      .search-input {
        padding-left: 36px !important;
        width: 256px;
        background-color: #f8fafc !important;
        border: none !important;
        border-radius: 12px !important;

        &:focus {
          box-shadow: 0 0 0 2px $overlay-emerald-20 !important;
        }
      }
    }

    .add-formula-btn {
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

      .add-icon {
        font-size: 18px;
        transition: transform 0.2s;
      }

      &:hover .add-icon {
        transform: rotate(90deg);
      }
    }

    .filter-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      cursor: pointer;
      transition: all $transition-fast;
      position: relative;

      &:hover {
        background-color: #eff6ff;
        border-color: #3b82f6;
        color: #3b82f6;
      }

      .filter-icon {
        font-size: 18px;
        color: #64748b;
      }

      .filter-dot {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 6px;
        height: 6px;
        background-color: #ef4444;
        border-radius: 50%;
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
      background-color: #059669;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 32px;
      // 上方圆角匹配 content-card 的 32px 圆角
      border-radius: 32px 32px 0 0;
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
            color: #d1fae5;
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
        border: 1px solid #34d399;
        padding: 4px 12px;
        border-radius: 8px;
        background: transparent;
        color: #fff;
        cursor: pointer;
        transition: all $transition-fast;

        &:hover {
          background-color: #047857;
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
    border-radius: 32px !important;
    border: 1px solid #f8fafc !important;
    // 移除 overflow-hidden 以避免裁剪绝对定位的批量操作栏
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: all $transition-slow;

    &:hover {
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05);
      border-color: #eff6ff !important;
    }

    :deep(.t-card__body) {
      padding: 0 !important;
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
    gap: 12px;
  }

  .salesman-avatar {
    width: 38px;
    height: 38px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .salesman-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .salesman-name {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #0F172A;
  }

  .salesman-code {
    margin: 0;
    font-size: 12px;
    color: #94A3B8;
  }

  .text-muted {
    color: #CBD5E1;
    font-size: 13px;
  }

  // ─── 状态标签 ───
  .status-wrapper {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-tag--active {
    background: $overlay-emerald-08;
    color: #059669;
    border: none;
  }

  .status-tag--inactive {
    background: #f1f5f9;
    color: #64748b;
    border: none;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;

    &--active {
      background: #10B981;
      box-shadow: 0 0 6px $overlay-emerald-40;
    }

    &--inactive {
      background: #94A3B8;
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
    color: #64748B;

    &:hover {
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    &.view-btn:hover {
      color: #3B82F6;
      border-color: #bfdbfe;
      background: #eff6ff;
    }

    &.edit-btn:hover {
      color: #10B981;
      border-color: #a7f3d0;
      background: #ecfdf5;
    }

    &.delete-btn:hover {
      color: #EF4444;
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
    border-top: 1px solid #f8fafc;

    .pagination-info {
      font-size: 14px;
      color: #94a3b8;
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
      border-radius: var(--radius-md, 8px);
      background-color: transparent;
      color: var(--color-text-regular, #6e6178);
      font-size: 14px;
      cursor: pointer;
      transition: all var(--transition-fast, 0.15s);
      white-space: nowrap;
      user-select: none;

      &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
        background-color: var(--color-primary-bg, #fff0f3);
        border-color: var(--color-primary-lighter, #ffb5c8);
        color: var(--color-primary-dark, #e8a0b0);
      }

      &.pagination-btn--disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
        color: var(--color-text-placeholder, #d4c5d0);
        background-color: transparent;
        border-color: #e2e8f0;
        pointer-events: none;
      }

      &.pagination-btn--active {
        background-color: var(--color-primary, #ff6b8a);
        color: #fff;
        border-color: var(--color-primary, #ff6b8a);
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
      color: #94a3b8;
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
            color: #10b981 !important;
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
              color: #10b981 !important;
            }
          }
        }
      }
    }

    .t-table__body {
      background: #fff !important;

      .t-table__row {
        td {
          padding: 18px 20px !important;
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
          border-color: #10b981;
        }

        &.is-checked .t-checkbox__input__inner,
        &.is-indeterminate .t-checkbox__input__inner {
          background-color: #10b981;
          border-color: #10b981;
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
        color: #10b981;
      }
    }

    .t-table__header th:first-child .t-checkbox,
    .t-table__body td:first-child .t-checkbox {

      .t-checkbox__input.is-checked .t-checkbox__input__inner,
      .t-checkbox__input.is-indeterminate .t-checkbox__input__inner {
        background-color: #10b981;
        border-color: #10b981;
      }
    }

    .t-table__expanded-row .t-table__row--expanded {
      animation: expandRowFadeIn 0.35s ease both;
    }
  }

  // ─── 动态区域 ───
  .activity-section {
    margin-top: 40px;
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
      background: linear-gradient(135deg, #10B981, #059669);
      border: none;
      color: #fff;
      position: relative;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px $overlay-emerald-15, 0 10px 10px -5px $overlay-emerald-04;
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
      color: #94a3b8;
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
    margin-top: 2px;

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
      background: #10B981;
    }

    &--warning .timeline-dot-inner {
      background: #F59E0B;
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
    color: #64748b;
    line-height: 1.5;
  }

  .timeline-time {
    font-size: 12px;
    color: #94A3B8;
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
    padding: 10px 24px;
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
    color: #94a3b8;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: #f1f5f9;
      color: #475569;
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

@media screen and (max-width: 1024px) {
  .salesman-list .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .salesman-list .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
}
</style>

<style lang="scss">
@use '@/assets/styles/variables.scss' as *;

.salesman-list .content-card .t-table .t-table__body tr td,
.salesman-list .content-card .t-table .t-table__body .t-table__row--selected td,
.salesman-list .content-card .t-table .t-table__body .t-table__row--hover td,
.salesman-list .content-card .t-table .t-table__body .t-table__row--selected.t-table__row--hover td {
  background-color: #fff !important;
  box-shadow: none !important;
  border-left: none !important;
}
</style>
