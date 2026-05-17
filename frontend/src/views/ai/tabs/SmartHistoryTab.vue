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

    <div class="search-toolbar">
      <t-input
        v-model="searchParams.fileName"
        placeholder="搜索文件名..."
        clearable
        @enter="handleSearch"
      >
        <template #prefix-icon>
          <t-icon name="search" />
        </template>
      </t-input>

      <t-select
        v-model="searchParams.status"
        :options="statusOptions"
        placeholder="状态"
        clearable
        style="width: 100px"
      />

      <t-input
        v-model="searchParams.keyword"
        placeholder="关键词搜索..."
        clearable
        @enter="handleSearch"
        style="width: 160px"
      />

      <t-date-range-picker
        v-model="dateRange"
        placeholder="时间范围"
        clearable
        @change="handleDateRangeChange"
        style="width: 280px"
        :popup-props="{ appendToBody: true }"
      />

      <t-button @click="handleSearch">搜索</t-button>
      <t-button variant="outline" @click="handleReset">重置</t-button>
    </div>

    <div class="batch-toolbar" v-if="items.length > 0">
      <t-checkbox v-model="selectAll" :indeterminate="isIndeterminate" @change="handleSelectAll">
        全选
      </t-checkbox>
      <span class="selected-count" v-if="selectedIds.length > 0">
        已选择 {{ selectedIds.length }} 项
      </span>
      <t-popconfirm v-if="selectedIds.length > 0" content="确定删除选中的记录吗？此操作无法撤销。"
        :confirm-btn="{ content: '确认', theme: 'danger' }" @confirm="handleBatchDelete">
        <t-button size="small" theme="danger" variant="outline">
          批量删除
        </t-button>
      </t-popconfirm>
    </div>

    <div v-if="loading" class="history-loading">
      <t-loading size="medium" />
      <span>加载中...</span>
    </div>

    <div v-else-if="items.length === 0" class="history-empty">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p class="empty-title">暂无解析记录</p>
      <p class="empty-desc">使用智能填单、智能导入或智能查询后，记录将在此展示</p>
    </div>

    <div v-else class="history-list">
      <div v-for="item in items" :key="item.id" class="history-card" :class="'history-card--' + item.status">
        <div class="history-card-header">
          <div class="history-card-type">
            <t-checkbox :value="item.id" v-model="selectedIds" @click.stop />
            <span class="type-badge" :class="'type-badge--' + item.callType">{{ item.callTypeLabel }}</span>
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
            <span v-if="item.usedCount > 0" class="meta-item">
              <t-icon name="view" />
              使用 {{ item.usedCount }} 次
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="pagination.total > 0" class="table-pagination">
      <div class="pagination-info">
        显示第 {{ (pagination.page - 1) * pagination.pageSize + 1 }}-{{
          Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，共 {{ pagination.total }} 条数据
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
            <span class="detail-value">{{ currentDetail.callTypeLabel }}</span>
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

const router = useRouter();
const aiStore = useAiStore();
const loading = ref(false);
const items = ref<any[]>([]);
const activeFilter = ref('all');
const searchParams = ref({
  fileName: '',
  status: '',
  keyword: '',
  startDate: '',
  endDate: '',
});
const dateRange = ref<[string, string] | null>(null);

const handleDateRangeChange = (value: [string, string] | null) => {
  if (value && value.length === 2) {
    searchParams.value.startDate = value[0];
    searchParams.value.endDate = value[1];
  } else {
    searchParams.value.startDate = '';
    searchParams.value.endDate = '';
  }
};

const detailDrawerVisible = ref(false);
const currentDetail = ref<any>(null);
const showStorageDetail = ref(false);
const showDegradationBanner = ref(true);
const selectedIds = ref<string[]>([]);
const batchDeleteLoading = ref(false);

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

const totalPages = computed(() => {
  return Math.ceil(pagination.value.total / pagination.value.pageSize) || 1;
});

const pageNumbers = computed(() => {
  const total = totalPages.value;
  const current = pagination.value.page;
  const pages: (number | string)[] = [];

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push('...');
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (current < total - 2) pages.push('...');
    pages.push(total);
  }

  return pages;
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

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '智能填单', value: 'parse_formula' },
  { label: '智能导入', value: 'parse_nutrition' },
];

const statusOptions = [
  { label: '全部', value: '' },
  { label: '成功', value: 'success' },
  { label: '失败', value: 'failed' },
  { label: '待处理', value: 'pending' },
];

const fetchData = async () => {
  loading.value = true;
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
    };

    if (activeFilter.value !== 'all') {
      params.callType = activeFilter.value;
    }

    if (searchParams.value.fileName) {
      params.fileName = searchParams.value.fileName;
    }

    if (searchParams.value.status) {
      params.status = searchParams.value.status;
    }

    if (searchParams.value.keyword) {
      params.keyword = searchParams.value.keyword;
    }

    if (searchParams.value.startDate) {
      params.startDate = searchParams.value.startDate;
    }

    if (searchParams.value.endDate) {
      params.endDate = searchParams.value.endDate;
    }

    const res = await parseResultApi.list(params);
    items.value = res.list || [];
    pagination.value = res.pagination || { page: 1, pageSize: 20, total: 0 };
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
    statistics.value = res;
  } catch (error) {
    console.error('Failed to fetch statistics:', error);
  }
};

const handleSearch = () => {
  pagination.value.page = 1;
  fetchData();
};

const handleReset = () => {
  searchParams.value = {
    fileName: '',
    status: '',
    keyword: '',
    startDate: '',
    endDate: '',
  };
  dateRange.value = null;
  pagination.value.page = 1;
  nextTick(() => {
    fetchData();
  });
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

const handleRefresh = () => {
  fetchData();
  fetchStatistics();
};

const handlePageChange = (pageInfo: any) => {
  pagination.value.page = pageInfo.page;
  fetchData();
};

const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize;
  pagination.value.page = 1;
  fetchData();
};

const showDetail = async (item: any) => {
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
    await fetchData();
    await fetchStatistics();
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败');
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
  } catch (error: any) {
    MessagePlugin.error(error.message || '批量删除失败');
  } finally {
    batchDeleteLoading.value = false;
  }
};

const handleSelectAll = (checked: boolean) => {
  selectedIds.value = checked ? items.value.map(item => item.id) : [];
};

const goToConfig = () => {
  router.push('/ai/parse-result-config');
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

.search-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .t-input {
    flex: 1;
    max-width: 300px;
  }
}

.data-card {
  background: #f8fafc;
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
      border-color: #10B981;
    }

    &.card-blue {
      border-color: #3B82F6;
    }

    &.card-purple {
      border-color: #8B5CF6;
    }

    &.card-amber {
      border-color: #F59E0B;
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;

    .card-title {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
  }

  .card-value {
    .value-number {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.2;
      color: #1e293b;
    }
  }

  .card-progress {
    margin-top: 6px;
    height: 3px;
    background: #e2e8f0;
    border-radius: 2px;
    overflow: hidden;

    .progress-bar {
      height: 100%;
      transition: width 0.3s;

      &.progress--success {
        background: #10b981;
      }

      &.progress--warning {
        background: #f59e0b;
      }

      &.progress--danger {
        background: #ef4444;
      }
    }
  }

  &.card-emerald .card-header {
    color: #10B981;
  }

  &.card-blue .card-header {
    color: #3B82F6;
  }

  &.card-purple .card-header {
    color: #8B5CF6;
  }

  &.card-amber .card-header {
    color: #F59E0B;
  }
}

.batch-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 12px;

  .selected-count {
    font-size: 13px;
    color: #666;
  }
}

.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  color: #94a3b8;
  font-size: 14px;

  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: #64748b;
    margin: 0;
  }

  .empty-desc {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.2s;

  &:hover {
    border-color: #cbd5e1;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &--error {
    border-left: 3px solid #ef4444;
  }

  &--success {
    border-left: 3px solid #10b981;
  }

  &--pending {
    border-left: 3px solid #f59e0b;
  }
}

.history-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
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
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #ef4444;
    background: #fef2f2;
  }
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;

  &--parse_formula {
    background: #eff6ff;
    color: #3b82f6;
  }

  &--parse_nutrition {
    background: #faf5ff;
    color: #a855f7;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &--success {
    background: #10b981;
  }

  &--error {
    background: #ef4444;
  }

  &--pending {
    background: #f59e0b;
  }
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.history-card-time {
  font-size: 12px;
  color: #94a3b8;
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
    color: #64748b;

    &.meta-item--file {
      font-weight: 500;
      color: #1e293b;
    }
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
    font-size: 14px;
    color: #94a3b8;
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
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background-color: transparent;
    color: #6e6178;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
    user-select: none;

    &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
      background-color: #ecfdf5;
      border-color: #a7f3d0;
      color: #059669;
    }

    &.pagination-btn--disabled {
      opacity: 0.5;
      cursor: not-allowed !important;
      color: #d4c5d0;
      background-color: transparent;
      border-color: #e2e8f0;
      pointer-events: none;
    }

    &.pagination-btn--active {
      background-color: #10b981;
      color: #fff;
      border-color: #10b981;
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
    color: #94a3b8;
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
      border-bottom: 1px solid #f1f5f9;

      .detail-label {
        width: 100px;
        color: #64748b;
        font-size: 14px;
      }

      .detail-value {
        flex: 1;
        color: #1e293b;
        font-size: 14px;

        &.detail-value--mono {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          word-break: break-all;
        }

        &.status--success {
          color: #10b981;
        }

        &.status--error {
          color: #ef4444;
        }

        &.status--pending {
          color: #f59e0b;
        }
      }
    }

    .json-viewer {
      margin-top: 12px;
      padding: 12px;
      background: #f8fafc;
      border-radius: 8px;
      font-size: 12px;
      max-height: 300px;
      overflow: auto;
    }

    &.error-section {
      .error-message {
        padding: 16px;
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        color: #dc2626;
        font-size: 14px;
      }
    }
  }

  .detail-actions {
    display: flex;
    gap: 12px;
  }
}
</style>
