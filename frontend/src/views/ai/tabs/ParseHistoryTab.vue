<template>
  <div class="smart-history-tab">
    <DegradationBanner v-model:visible="showDegradationBanner" @config-click="goToConfig" />

    <div class="data-overview-cards">
      <div class="data-card card-emerald" @click="filterByStatus('all')">
        <div class="card-header">
          <t-icon name="chart-bar" size="24px" />
          <span class="card-title">总数</span>
        </div>
        <div class="card-value">
          <span class="value-number">{{ statistics.totalCount }}</span>
        </div>
      </div>

      <div class="data-card card-blue" @click="showStorageDetail = true">
        <div class="card-header">
          <t-icon name="chart-line" size="24px" />
          <span class="card-title">存储状态</span>
        </div>
        <div class="card-value">
          <span class="value-number">{{ statistics.usagePercent }}%</span>
        </div>
        <div class="card-progress">
          <div class="progress-bar" :class="getStorageClass()"
            :style="{ width: `${Math.min(statistics.usagePercent, 100)}%` }"></div>
        </div>
      </div>

      <div class="data-card card-amber" @click="filterByStatus('pending')">
        <div class="card-header">
          <t-icon name="time" size="24px" />
          <span class="card-title">待处理</span>
        </div>
        <div class="card-value">
          <span class="value-number">{{ statistics.statsByStatus?.pending || 0 }}</span>
        </div>
      </div>

      <div class="data-card card-purple" @click="filterByLinked()">
        <div class="card-header">
          <t-icon name="check-circle" size="24px" />
          <span class="card-title">已关联</span>
        </div>
        <div class="card-value">
          <span class="value-number">{{ linkedCount }}</span>
        </div>
      </div>
    </div>
    <!-- 工具栏 -->
    <div class="data-center-toolbar">
      <Transition name="batch-bar-slide">
        <div v-if="selectedIds.length > 0" class="batch-action-bar">
          <div class="batch-info">
            <t-checkbox :checked="selectAll" :indeterminate="isIndeterminate"
              @change="(checked: boolean) => handleSelectAll(checked)" />
            <span class="batch-count"><strong>{{ selectedIds.length }}</strong> 项已选择</span>
            <div class="batch-divider"></div>
            <div class="batch-buttons">
              <t-popconfirm theme="danger" content="确定删除选中的记录吗？此操作无法撤销。" @confirm="handleBatchDelete">
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

      <div class="toolbar-left-section">
        <div class="toolbar-title-section">
          <h3 class="toolbar-title">解析历史</h3>
          <p class="toolbar-subtitle">智能填单、智能导入、智能查询的操作记录</p>
        </div>
      </div>

      <div class="toolbar-right-section">
        <t-select v-model="searchParams.status" :options="statusOptions" placeholder="状态" clearable style="width: 100px"
          @change="handleSearch" />

        <t-date-range-picker v-model="dateRange" placeholder="时间范围" clearable @change="handleDateRangeChange"
          style="width: 260px" :popup-props="{ appendToBody: true }" />

        <div class="search-container" role="search">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <t-input v-model="searchParams.searchText" class="search-input" placeholder="搜索文件名或关键词..." clearable
            @enter="handleSearch" @change="handleSearch" />
        </div>

        <button class="add-formula-btn" @click="handleRefresh" title="刷新列表">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          刷新
        </button>
        <button class="add-formula-btn" @click="handleReset" title="重置筛选条件">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          重置
        </button>
      </div>
    </div>

    <div v-if="loading" class="history-loading">
      <t-loading size="medium" />
      <span>加载中...</span>
    </div>

    <div v-else-if="items.length === 0" class="history-empty">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-placeholder)" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p class="empty-title">暂无解析记录</p>
      <p class="empty-desc">使用智能填单、智能导入或智能查询后，记录将在此展示</p>
    </div>

    <div v-else class="history-list">
      <div v-for="item in items" :key="item.id" class="history-card" :class="['history-card--' + item.status, { 'history-card--highlight': highlightedId === item.id }]" :ref="(el) => handleCardRef(item.id, el)">
        <div class="history-card-header">
          <div class="history-card-type">
            <t-checkbox :model-value="selectedIds.includes(item.id)"
              @change="(checked: boolean) => toggleSelect(item.id, checked)" @click.stop />
            <span class="type-badge" :class="'type-badge--' + item.callType">{{ getCallTypeLabel(item.callType) }}</span>
            <span class="status-dot" :class="'status-dot--' + item.status"></span>
            <span class="status-text">{{ item.status === 'success' ? '成功' : item.status === 'failed' ? '失败' : '待处理'
            }}</span>
          </div>
          <div class="history-card-actions">
            <span class="history-card-time">{{ formatTime(item.createdAt) }}</span>
            <t-popconfirm content="确定删除此记录吗？此操作无法撤销。" :confirm-btn="{ content: '确认', theme: 'danger' }"
              @confirm="handleDelete(item.id)">
              <button class="delete-btn" type="button" title="删除此记录">
                <t-icon name="delete" />
              </button>
            </t-popconfirm>
          </div>
        </div>
        <div class="history-card-body" @click="showDetail(item)">
          <div class="history-card-meta">
            <span class="meta-item meta-item--file">
              <t-icon name="file" />
              {{ item.fileName }}
            </span>
            <span v-if="item.modelName" class="meta-item">
              <t-icon name="chat" />
              {{ item.modelName }}
            </span>
            <span v-if="item.useCount > 0" class="meta-item">
              <t-icon name="view" />
              使用 {{ item.useCount }} 次
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pagination.total > 0" class="table-pagination">
      <div class="pagination-info">
        显示第 {{ (pagination.page - 1) * pagination.pageSize + 1 }}-{{
          Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{
          pagination.total }} 条数据
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" :class="{ 'pagination-btn--disabled': pagination.page === 1 }"
          :disabled="pagination.page === 1" @click="handlePageChange({ page: pagination.page - 1 })">上一页</button>
        <template v-for="page in pageNumbers" :key="page">
          <button v-if="page !== '...'" class="pagination-btn"
            :class="{ 'pagination-btn--active': page === pagination.page }"
            @click="typeof page === 'number' && handlePageChange({ page })">{{ page }}</button>
          <span v-else class="pagination-ellipsis">...</span>
        </template>
        <button class="pagination-btn" :class="{ 'pagination-btn--disabled': pagination.page === totalPages }"
          :disabled="pagination.page === totalPages"
          @click="handlePageChange({ page: pagination.page + 1 })">下一页</button>
      </div>
    </div>

    <t-drawer v-model:visible="detailDrawerVisible" header="解析详情" :close-on-overlay-click="true" size="500px">
      <div v-if="currentDetail" class="detail-content">
        <t-divider>文件信息</t-divider>

        <div class="detail-section">
          <div class="detail-row">
            <span class="detail-label">文件名：</span>
            <span class="detail-value">{{ currentDetail.fileName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">哈希值：</span>
            <span class="detail-value detail-value--mono">{{ currentDetail.fileHash }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">文件大小：</span>
            <span class="detail-value">{{ formatFileSize(currentDetail.fileSize) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">解析类型：</span>
            <span class="detail-value">{{ getCallTypeLabel(currentDetail.callType) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">状态：</span>
            <span class="detail-value" :class="'status--' + currentDetail.status">
              {{ currentDetail.status === 'success' ? '成功' : currentDetail.status === 'failed' ? '失败' : '待处理' }}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">模型：</span>
            <span class="detail-value">{{ currentDetail.modelName || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">创建时间：</span>
            <span class="detail-value">{{ formatTimestamp(currentDetail.createdAt) }}</span>
          </div>
        </div>

        <t-divider>解析结果</t-divider>

        <div v-if="currentDetail.status === 'success'" class="detail-section">
          <t-button size="small" @click="copyResult">复制结果</t-button>
          <pre class="json-viewer">{{ JSON.stringify(currentDetail.parsedResult, null, 2) }}</pre>
        </div>

        <div v-else-if="currentDetail.status === 'failed'" class="detail-section error-section">
          <div class="error-message">{{ currentDetail.errorMessage || '解析失败' }}</div>
        </div>

        <div v-else class="detail-section">
          <t-loading />
          <span>正在解析中...</span>
        </div>

        <t-divider>操作</t-divider>

        <div class="detail-actions">
          <t-button theme="primary" @click="handleRestore">恢复解析结果</t-button>
          <t-popconfirm content="确定删除此记录吗？此操作无法撤销。" :confirm-btn="{ content: '确认', theme: 'danger' }"
            @confirm="handleDeleteFromDetail">
            <t-button theme="danger">删除记录</t-button>
          </t-popconfirm>
        </div>
      </div>
    </t-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { parseResultApi } from '@/api/parseResult';
import { MessagePlugin } from 'tdesign-vue-next';
import { formatTimestamp } from '@/utils/timeFormat';
import DegradationBanner from '@/components/DegradationBanner.vue';
import { useAiStore } from '@/stores/ai';
import type { ParseResultItem } from '@/api/parseResult';

const router = useRouter();
const aiStore = useAiStore();
const loading = ref(false);
const items = ref<ParseResultItem[]>([]);
const activeFilter = ref('all');
const searchParams = ref({
  searchText: '',
  status: '',
  startDate: '',
  endDate: '',
});
const dateRange = ref<[string, string] | []>([]);

const handleDateRangeChange = (value: [string, string] | null | []) => {
  if (value && Array.isArray(value) && value.length === 2) {
    searchParams.value.startDate = value[0];
    searchParams.value.endDate = value[1];
  } else {
    searchParams.value.startDate = '';
    searchParams.value.endDate = '';
  }
  pagination.value.page = 1;
  fetchData();
};

const detailDrawerVisible = ref(false);
const currentDetail = ref<ParseResultItem | null>(null);
const showStorageDetail = ref(false);
const showDegradationBanner = ref(true);
const selectedIds = ref<string[]>([]);
const batchDeleteLoading = ref(false);
const highlightedId = ref<string | null>(null);
const cardRefs = new Map<string, HTMLElement>();
const handleCardRef = (id: string, el: unknown) => {
  if (el) cardRefs.set(id, el as HTMLElement);
  else cardRefs.delete(id);
};

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
});

const statistics = ref({
  totalCount: 0,
  storageLimit: 5000,
  usagePercent: 0,
  cleanupThreshold: 95,
  cleanupBatchPercent: 5,
  statsByType: {} as Record<string, number>,
  statsByStatus: {} as Record<string, number>,
});

const linkedCount = computed(() => {
  return items.value.filter(item => item.isLinked).length;
});

const totalPages = computed(() => Math.ceil(pagination.value.total / pagination.value.pageSize) || 1);

const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = pagination.value.page;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

const selectAll = computed({
  get: () => selectedIds.value.length === items.value.length && items.value.length > 0,
  set: (val: boolean) => {
    selectedIds.value = val ? items.value.map(item => item.id) : [];
  }
});

const isIndeterminate = computed(() => {
  return selectedIds.value.length > 0 && selectedIds.value.length < items.value.length;
});

const statusOptions = [
  { label: '全部', value: '' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '待处理', value: 'pending' },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const params: Record<string, unknown> = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    };

    if (activeFilter.value !== 'all') {
      params.callType = activeFilter.value;
    }

    if (searchParams.value.searchText) {
      params.keyword = searchParams.value.searchText;
    }

    if (searchParams.value.status) {
      params.status = searchParams.value.status;
    }

    if (searchParams.value.startDate) {
      params.startDate = searchParams.value.startDate;
    }

    if (searchParams.value.endDate) {
      params.endDate = searchParams.value.endDate;
    }

    const res = await parseResultApi.list(params);
    items.value = res.list || [];
    if (res.pagination) {
      pagination.value.total = res.pagination.total;
    }

    // 高亮来自路由的指定记录
    const highlightId = aiStore.parseHistoryHighlight;
    if (highlightId && items.value.some((i: ParseResultItem) => i.id === highlightId)) {
      highlightedId.value = highlightId;
      aiStore.parseHistoryHighlight = null;
      await nextTick();
      const el = cardRefs.get(highlightId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { highlightedId.value = null; }, 3000);
      }
    }
  } catch (error) {
    console.error('Failed to fetch parse results:', error);
    items.value = [];
  } finally {
    loading.value = false;
  }
};

const fetchStatistics = async () => {
  try {
    const res = await parseResultApi.getStatistics();
    statistics.value = {
      totalCount: res.total,
      storageLimit: 5000,
      usagePercent: res.total > 0 ? Math.round((res.total / 5000) * 100) : 0,
      cleanupThreshold: 95,
      cleanupBatchPercent: 5,
      statsByType: {},
      statsByStatus: {},
    };
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
  }
};

const handleSearch = () => {
  pagination.value.page = 1;
  fetchData();
};

const handleRefresh = () => {
  searchParams.value = {
    searchText: '',
    status: '',
    startDate: '',
    endDate: '',
  };
  dateRange.value = [];
  pagination.value.page = 1;
  fetchData();
  fetchStatistics();
};

const handleReset = () => {
  searchParams.value = {
    searchText: '',
    status: '',
    startDate: '',
    endDate: '',
  };
  dateRange.value = [];
  pagination.value.page = 1;
  fetchData();
};

const filterByStatus = (status: string) => {
  if (status === 'all') {
    searchParams.value.status = '';
  } else {
    searchParams.value.status = status;
  }
  handleSearch();
};

const filterByLinked = () => {
  MessagePlugin.info('已关联记录的筛选功能开发中');
};

const handlePageChange = (pageInfo: Record<string, unknown>) => {
  pagination.value.page = Number(pageInfo.page) || 1;
  fetchData();
};

const showDetail = async (item: ParseResultItem) => {
  detailDrawerVisible.value = true;
  try {
    const res = await parseResultApi.getDetail(item.id);
    currentDetail.value = res;
  } catch (error) {
    console.error('Failed to fetch detail:', error);
    MessagePlugin.error('获取详情失败');
  }
};

const handleRestore = () => {
  if (!currentDetail.value) return;

  sessionStorage.setItem('restoreParseResult', JSON.stringify({
    id: currentDetail.value.id,
    parsedResult: currentDetail.value.parsedResult,
    fileName: currentDetail.value.fileName,
    callType: currentDetail.value.callType,
  }));

  MessagePlugin.success('已保存解析结果，请跳转到对应表单页面恢复');
  detailDrawerVisible.value = false;
};

const handleDelete = async (id: string) => {
  try {
    await parseResultApi.delete(id);
    MessagePlugin.success('删除成功');
    selectedIds.value = selectedIds.value.filter(itemId => itemId !== id);
    if (items.value.length <= 1 && pagination.value.page > 1) {
      pagination.value.page -= 1;
    }
    await fetchData();
    await fetchStatistics();
  } catch (error: unknown) {
    const err = error as { message?: string };
    MessagePlugin.error(err.message || '删除失败');
  }
};

const handleDeleteFromDetail = async () => {
  if (!currentDetail.value) return;
  await handleDelete(currentDetail.value.id);
  detailDrawerVisible.value = false;
};

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    MessagePlugin.warning('请先选择要删除的记录');
    return;
  }
  try {
    batchDeleteLoading.value = true;
    for (const id of selectedIds.value) {
      await parseResultApi.delete(id);
    }
    MessagePlugin.success(`成功删除 ${selectedIds.value.length} 条记录`);
    selectedIds.value = [];
    await fetchData();
    await fetchStatistics();
  } catch (error: unknown) {
    const err = error as { message?: string };
    MessagePlugin.error(err.message || '批量删除失败');
  } finally {
    batchDeleteLoading.value = false;
  }
};

const handleSelectAll = (checked: boolean) => {
  selectedIds.value = checked ? items.value.map(item => item.id) : [];
};

const clearSelection = () => {
  selectedIds.value = [];
};

const toggleSelect = (id: string, checked: boolean) => {
  if (checked) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value.push(id);
    }
  } else {
    selectedIds.value = selectedIds.value.filter(itemId => itemId !== id);
  }
};

const goToConfig = () => {
  router.push('/system/config');
};

const copyResult = async () => {
  if (!currentDetail.value?.parsedResult) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(currentDetail.value.parsedResult, null, 2));
    MessagePlugin.success('已复制到剪贴板');
  } catch {
    MessagePlugin.error('复制失败');
  }
};

const getCallTypeLabel = (callType: string): string => {
  const labels: Record<string, string> = {
    parse_formula: "解析配方",
    parse_material: "解析原料",
    parse_nutrition: "解析营养",
    natural_search: "自然检索",
    smart_search: "智能检索",
    parse_file_image: "图片提取",
    unknown: "其他",
  };
  return labels[callType] || callType;
};

const getStorageClass = () => {
  const percent = statistics.value.usagePercent;
  if (percent >= 95) return 'progress--danger';
  if (percent >= 80) return 'progress--warning';
  return 'progress--success';
};

const formatTime = (time: string) => {
  if (!time) return '';
  const d = new Date(time);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
  return d.toLocaleString('zh-CN');
};

const formatFileSize = (bytes: number) => {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

watch(activeFilter, () => {
  pagination.value.page = 1;
  fetchData();
});

watch(() => aiStore.parseHistoryRefreshKey, () => {
  fetchData();
  fetchStatistics();
});

onMounted(() => {
  fetchData();
  fetchStatistics();
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.smart-history-tab {
  min-height: 400px;
  padding: 20px;
}

.data-overview-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.data-center-toolbar {
  padding: 32px 12px;
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
    min-width: 200px;

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
        transition: all 0.2s;
        width: 270px;

        &:focus {
          box-shadow: 0 0 0 2px rgba(167, 243, 208, 0.50);
          outline: none;
          background-color: var(--color-bg-container);
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
    transition: all 0.2s;
    box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15);
    border: none;
    cursor: pointer;

    &:hover {
      background-color: var(--color-text-primary);
    }

    svg {
      flex-shrink: 0;
    }
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
  color: #{$text-white};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
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
      color: #{$text-white};
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: all 0.2s;

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
    color: #{$text-white};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background-color: var(--color-primary-deep);
    }
  }
}

.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: all 0.3s;
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

.data-card {
  background: var(--color-bg-page);
  border-radius: 10px;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);

    &.card-emerald {
      border-color: var(--color-primary);
    }

    &.card-blue {
      border-color: var(--color-info);
    }

    &.card-purple {
      border-color: var(--color-lavender);
    }

    &.card-amber {
      border-color: var(--color-warning);
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: var(--space-1-5);
    margin-bottom: var(--space-1-5);

    .card-title {
      font-size: 12px;
      color: var(--color-text-secondary);
      font-weight: 500;
    }
  }

  .card-value {
    .value-number {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      color: var(--color-text-primary);
    }
  }

  .card-progress {
    margin-top: var(--space-1-5);
    height: 3px;
    background: var(--color-border);
    border-radius: var(--radius-2xs);
    overflow: hidden;

    .progress-bar {
      height: 100%;
      transition: width 0.3s;

      &.progress--success {
        background: var(--color-primary);
      }

      &.progress--warning {
        background: var(--color-warning);
      }

      &.progress--danger {
        background: var(--color-danger);
      }
    }
  }

  &.card-emerald .card-header {
    color: var(--color-primary);
  }

  &.card-blue .card-header {
    color: var(--color-info);
  }

  &.card-purple .card-header {
    color: var(--color-lavender);
  }

  &.card-amber .card-header {
    color: var(--color-warning);
  }
}

.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: var(--space-16) 24px;
  color: var(--color-text-placeholder);
  font-size: 14px;

  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .empty-desc {
    font-size: 13px;
    color: var(--color-text-placeholder);
    margin: 0;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.2s;

  &:hover {
    border-color: var(--color-text-placeholder);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &--error {
    border-left: 3px solid var(--color-danger);
  }

  &--success {
    border-left: 3px solid var(--color-primary);
  }

  &--pending {
    border-left: 3px solid var(--color-warning);
  }

  &--highlight {
    border-color: var(--color-info);
    border-left: 3px solid var(--color-info);
    background: var(--color-info-bg);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
    animation: highlightPulse 3s ease;
  }
}

.history-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2-5);
}

.history-card-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.history-card-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.delete-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 8px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--color-text-placeholder);
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: var(--color-danger);
    background: #{$color-danger-light};
  }
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: var(--space-0-5) var(--space-2-5);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;

  &--parse_formula {
    background: var(--color-info-bg);
    color: var(--color-info);
  }

  &--parse_nutrition {
    background: var(--color-lavender);
    color: var(--color-lavender);
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &--success {
    background: var(--color-primary);
  }

  &--error {
    background: var(--color-danger);
  }

  &--pending {
    background: var(--color-warning);
  }
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.history-card-time {
  font-size: 12px;
  color: var(--color-text-placeholder);
}

.history-card-body {
  cursor: pointer;
}

.history-card-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .meta-item {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: var(--color-text-secondary);

    &.meta-item--file {
      font-weight: 500;
      color: var(--color-text-primary);
    }
  }
}

.table-pagination {
  padding: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-container);
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
    transition: all 0.15s;
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: var(--color-emerald-50);
      border-color: var(--color-primary-lightest);
      color: var(--color-primary-dark);
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      color: var(--color-text-placeholder);
      background-color: transparent;
      border-color: var(--color-border);
      pointer-events: none;
    }

    &.pagination-btn--active {
      background-color: var(--color-primary);
      color: var(--color-text-white);
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

.detail-content {
  .detail-section {
    margin-bottom: 24px;

    .detail-row {
      display: flex;
      padding: 8px 0;
      border-bottom: 1px solid var(--color-border-light);

      .detail-label {
        width: 100px;
        color: var(--color-text-secondary);
        font-size: 14px;
      }

      .detail-value {
        flex: 1;
        color: var(--color-text-primary);
        font-size: 14px;

        &.detail-value--mono {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          word-break: break-all;
        }

        &.status--success {
          color: var(--color-primary);
        }

        &.status--error {
          color: var(--color-danger);
        }

        &.status--pending {
          color: var(--color-warning);
        }
      }
    }

    .json-viewer {
      margin-top: 12px;
      padding: 12px;
      background: var(--color-bg-page);
      border-radius: 8px;
      font-size: 12px;
      max-height: 300px;
      overflow: auto;
    }

    &.error-section {
      .error-message {
        padding: 16px;
        background: var(--color-danger-bg);
        border: 1px solid var(--color-danger-border);
        border-radius: 8px;
        color: var(--color-danger);
        font-size: 14px;
      }
    }
  }

  .detail-actions {
    display: flex;
    gap: 12px;
  }
}

@keyframes highlightPulse {
  0% { background: var(--color-info-bg); }
  50% { background: var(--color-info-bg); }
  100% { background: var(--color-info-bg); }
}
</style>
