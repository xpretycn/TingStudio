<template>
  <div class="file-management" :aria-busy="!initialized" data-testid="file-management">
    <section class="dashboard-grid" data-testid="file-dashboard">
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
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="8" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <Transition name="batch-bar-slide">
            <div v-if="selectedRows.length > 0" class="batch-action-bar">
              <div class="batch-info">
                <span class="batch-count"><strong>{{ selectedRows.length }}</strong> 项已选择</span>
                <div class="batch-divider"></div>
                <div class="batch-buttons">
                  <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedRows.length} 个文件吗？删除后无法恢复。`"
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

          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">文件管理中心</h3>
              <p class="toolbar-subtitle">点击列表查看文件详情、关联数据与解析记录</p>
            </div>
          </div>

          <div class="toolbar-right-section">
            <div class="search-container" role="search">
              <label for="file-search-input" class="sr-only">搜索文件</label>
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input id="file-search-input" v-model="searchKeyword" class="search-input" placeholder="搜索文件名..."
                clearable aria-label="按文件名搜索" data-testid="file-search" />
            </div>
            <button class="filter-btn" aria-label="筛选文件类型" aria-haspopup="true" @click="filterVisible = !filterVisible">
              <t-icon name="filter" class="filter-icon" />
              <span class="filter-dot"></span>
            </button>
          </div>
        </div>
        <t-table :data="sortedFiles" :columns="columns" :loading="fileStore.loading" :pagination="undefined"
          row-key="fileId" hover table-layout="auto" @select-change="handleSelectChange"
          :selected-row-keys="selectedRowKeys" @row-click="handleRowClick" @row-dblclick="handleRowDblClick">
          <template #originalName="{ row }">
            <div class="file-info">
              <div class="file-icon-wrapper" :class="'file-icon--' + row.fileType">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div class="file-details">
                <p class="file-name">{{ row.originalName }}</p>
                <t-tag v-if="!row.relatedId" size="small" variant="light" theme="warning" class="unlink-tag">未关联</t-tag>
              </div>
            </div>
          </template>

          <template #fileType="{ row }">
            <t-tag :theme="row.fileType === 'formula' ? 'primary' : 'success'" variant="light" size="small">
              {{ row.fileType === 'formula' ? '配方' : '原料' }}
            </t-tag>
          </template>

          <template #fileSize="{ row }">
            <span class="file-size-text">{{ formatFileSize(row.fileSize) }}</span>
          </template>

          <template #relatedName="{ row }">
            <span v-if="row.relatedId && row.relatedName" class="related-link" @click.stop="handleRelatedClick(row)">
              {{ row.relatedName }}
            </span>
            <t-tag v-else size="small" variant="light" theme="default">未关联</t-tag>
          </template>

          <template #fileFormat="{ row }">
            <t-tag :theme="row.mimeType?.startsWith('image/') ? 'warning' : 'primary'" variant="light" size="small">
              {{ row.mimeType?.startsWith('image/') ? '图片' : 'Excel' }}
            </t-tag>
          </template>

          <template #uploadedAt="{ row }">
            <span class="time-text">{{ formatDate(row.uploadedAt) }}</span>
          </template>

          <template #empty>
            <t-empty description="暂无文件数据" role="status" />
          </template>

          <template #operation="{ row }">
            <div class="action-buttons" role="group" aria-label="文件操作">
              <button class="action-btn preview-btn" @click.stop="handlePreview(row)" title="预览"
                :aria-label="`预览文件${row.originalName}`">
                <t-icon name="browse" />
              </button>
              <button class="action-btn download-btn" @click.stop="handleDownload(row)" title="下载"
                :aria-label="`下载文件${row.originalName}`">
                <t-icon name="download" />
              </button>
              <t-popconfirm v-if="isAdmin" content="确定要删除该文件吗？" @confirm="handleDelete(row)">
                <button class="action-btn delete-btn" @click.stop title="删除" :aria-label="`删除文件${row.originalName}`">
                  <t-icon name="delete" />
                </button>
              </t-popconfirm>
            </div>
          </template>
        </t-table>

        <div v-if="paginationStore.visible && fileStore.total > 0" class="table-pagination">
          <div class="pagination-info">
            显示第 {{ ((fileStore.queryParams.page ?? 1) - 1) * (fileStore.queryParams.pageSize ?? 20) + 1 }}-{{
              Math.min((fileStore.queryParams.page ?? 1) * (fileStore.queryParams.pageSize ?? 20), fileStore.total) }} 条，共
            {{
              fileStore.total }} 条数据
          </div>
          <div class="pagination-controls">
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': fileStore.queryParams.page === 1 }"
              :disabled="fileStore.queryParams.page === 1"
              @click="fileStore.setPage((fileStore.queryParams.page ?? 1) - 1); fileStore.fetchFiles()">上一页</button>
            <template v-for="page in pageNumbers" :key="page">
              <button v-if="page !== '...'" class="pagination-btn"
                :class="{ 'pagination-btn--active': page === fileStore.queryParams.page }"
                @click="typeof page === 'number' && (fileStore.setPage(page), fileStore.fetchFiles())">{{ page
                }}</button>
              <span v-else class="pagination-ellipsis">...</span>
            </template>
            <button class="pagination-btn"
              :class="{ 'pagination-btn--disabled': fileStore.queryParams.page === totalPages }"
              :disabled="fileStore.queryParams.page === totalPages"
              @click="fileStore.setPage((fileStore.queryParams.page ?? 1) + 1); fileStore.fetchFiles()">下一页</button>
          </div>
        </div>
      </t-card>
    </Transition>

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
            文件管理助手
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>太棒了！暂无待处理事项</p>
          <span>所有文件状态正常，继续保持~</span>
        </div>

        <div class="assistant-footer">
          <span class="assistant-hint">{{ fileStore.total }} 个文件在库 · 共 {{ displayPendingItems.length }} 项待办</span>
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
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      </div>
    </section>

    <FilePreviewDialog v-model:visible="previewDialogVisible" :file-id="previewFileId" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFileStore } from '@/stores/file';
import { useAuthStore } from '@/stores/auth';
import { usePaginationStore } from '@/stores/pagination';
import { MessagePlugin } from 'tdesign-vue-next';
import { fileApi } from '@/api/file';
import type { UploadedFile } from '@/api/file';
import FilePreviewDialog from '@/components/FilePreviewDialog.vue';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const fileStore = useFileStore();
const authStore = useAuthStore();
const paginationStore = usePaginationStore();

const initialized = ref(false);
const isAdmin = computed(() => authStore.user?.role === 'admin');

const formatStorageSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
};

const dashboardCards = computed(() => {
  const s = fileStore.stats;
  return [
    {
      label: '文件总数',
      value: s.total.toString(),
      unit: '个文件',
      badge: s.total > 0 ? `${s.total}` : '0',
      badgeColor: '#3B82F6',
      badgeBg: '#EFF6FF',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
    },
    {
      label: '已解析',
      value: s.parsed.toString(),
      unit: '个文件',
      badge: s.total > 0 ? `${Math.round((s.parsed / s.total) * 100)}%` : '--',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
    },
    {
      label: '已关联',
      value: s.linked.toString(),
      unit: '条数据',
      badge: s.linked > 0 ? `${s.linked}` : '0',
      badgeColor: '#8B5CF6',
      badgeBg: '#F5F3FF',
      iconBg: '#F5F3FF',
      iconColor: '#8B5CF6',
      iconPath: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
    },
    {
      label: '存储占用',
      value: formatStorageSize(s.totalSize || 0),
      unit: '',
      badge: s.totalSize > 1073741824 ? '超限' : '正常',
      badgeColor: s.totalSize > 1073741824 ? '#EF4444' : '#10B981',
      badgeBg: s.totalSize > 1073741824 ? '#FEE2E2' : '#ECFDF5',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    },
  ];
});

const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<UploadedFile[]>([]);
const searchKeyword = ref('');
const filterVisible = ref(false);
const sortKey = ref<string>('');
const sortOrder = ref<'asc' | 'desc' | ''>('');
const sortedFiles = ref<UploadedFile[]>([]);

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
    sortedFiles.value = [...fileStore.files];
    return;
  }
  const dir = sortOrder.value === 'desc' ? -1 : 1;

  const sortFns: Record<string, (a: UploadedFile, b: UploadedFile) => number> = {
    originalName: (a, b) => (a.originalName || '').localeCompare(b.originalName || '', 'zh'),
    fileType: (a, b) => (a.fileType || '').localeCompare(b.fileType || '', 'zh'),
    fileSize: (a, b) => (a.fileSize || 0) - (b.fileSize || 0),
    relatedName: (a, b) => (a.relatedName || '').localeCompare(b.relatedName || '', 'zh'),
    mimeType: (a, b) => (a.mimeType || '').localeCompare(b.mimeType || ''),
    uploadedByName: (a, b) => (a.uploadedByName || '').localeCompare(b.uploadedByName || '', 'zh'),
    uploadedAt: (a, b) => new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(),
  };

  const fn = sortFns[sortKey.value];
  sortedFiles.value = fn
    ? [...fileStore.files].sort((a, b) => fn(a, b) * dir)
    : [...fileStore.files];
};

watch(() => fileStore.files, (val) => {
  if (sortKey.value && sortOrder.value) {
    applySort();
  } else {
    sortedFiles.value = [...val];
  }
}, { immediate: true });

const previewDialogVisible = ref(false);
const previewFileId = ref('');

const columns = computed(() => [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'originalName', title: sortTitle('文件名', 'originalName'), width: 200 },
  { colKey: 'fileType', title: sortTitle('文件类型', 'fileType'), width: 100, align: 'center' },
  { colKey: 'fileSize', title: sortTitle('文件大小', 'fileSize'), width: 100, align: 'center' },
  { colKey: 'relatedName', title: sortTitle('关联数据', 'relatedName'), width: 150 },
  { colKey: 'fileFormat', title: sortTitle('文件形式', 'mimeType'), width: 100, align: 'center' },
  { colKey: 'uploadedByName', title: sortTitle('上传者', 'uploadedByName'), width: 120 },
  { colKey: 'uploadedAt', title: sortTitle('上传时间', 'uploadedAt'), width: 165 },
  { colKey: 'operation', title: '操作', width: 160, align: 'center' },
]);

const totalPages = computed(() => Math.ceil(fileStore.total / (fileStore.queryParams.pageSize ?? 20)) || 1);

const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = fileStore.queryParams.page ?? 1;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

const formatFileSize = (bytes: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
};

const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: UploadedFile[]; }) => {
  selectedRowKeys.value = value;
  selectedRows.value = selectedRowData;
};

const clearSelection = () => {
  selectedRowKeys.value = [];
  selectedRows.value = [];
};

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return;
  const ids = selectedRows.value.map(f => f.fileId);
  await fileStore.batchDelete(ids);
  clearSelection();
};



const handleRowClick = ({ row }: { row: UploadedFile; }) => {
  router.push({ path: `/files/${row.fileId}`, query: route.query });
};

const handleRowDblClick = ({ row }: { row: UploadedFile; }) => {
  previewFileId.value = row.fileId;
  previewDialogVisible.value = true;
};

const handlePreview = (row: UploadedFile) => {
  previewFileId.value = row.fileId;
  previewDialogVisible.value = true;
};

const handleDelete = async (row: UploadedFile) => {
  await fileStore.deleteFile(row.fileId);
};

const handleDownload = async (row: UploadedFile) => {
  try {
    const response = await fileApi.download(row.fileId);
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = row.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    MessagePlugin.success('下载成功');
  } catch (error) {
    MessagePlugin.error('下载失败');
  }
};

const handleRelatedClick = (row: UploadedFile) => {
  if (row.relatedId && row.relatedType === 'formula') {
    router.push(`/formulas/${row.relatedId}`);
  } else if (row.relatedId && row.relatedType === 'material') {
    router.push(`/materials/${row.relatedId}`);
  }
};

const handleEditLink = (row: UploadedFile) => {
  router.push({ path: `/files/${row.fileId}`, query: { action: 'editLink' } });
};



interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const list = fileStore.files;
  if (!list || list.length === 0) return [];
  const items: ActivityItem[] = [];
  const sorted = [...list].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

  for (const f of sorted) {
    const timeAgo = formatTimeAgo(f.uploadedAt);
    if (f.status === 'parsed') {
      items.push({
        type: 'success',
        title: '文件解析完成',
        desc: `<strong>${f.originalName}</strong> 已成功解析${f.parseConfidence ? `，置信度 <span class="text-emerald-600 font-bold">${(f.parseConfidence * 100).toFixed(0)}%</span>` : ''}`,
        time: timeAgo,
      });
    } else if (f.status === 'linked') {
      items.push({
        type: 'success',
        title: '文件已关联',
        desc: `<strong>${f.originalName}</strong> 已关联至 <span class="text-blue-600 font-bold">${f.relatedName || '数据'}</span>`,
        time: timeAgo,
      });
    } else if (f.status === 'uploaded') {
      items.push({
        type: 'warning',
        title: '文件待解析',
        desc: `<strong>${f.originalName}</strong> 已上传，等待解析处理`,
        time: timeAgo,
      });
    } else if (f.status === 'orphaned') {
      items.push({
        type: 'info',
        title: '文件未关联',
        desc: `<strong>${f.originalName}</strong> 尚未关联任何数据`,
        time: timeAgo,
      });
    } else {
      items.push({
        type: 'info',
        title: '文件已归档',
        desc: `<strong>${f.originalName}</strong> 已归档`,
        time: timeAgo,
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

interface PendingItem {
  id: string;
  type: 'warning' | 'info' | 'default';
  priority: 'high' | 'medium' | 'low';
  title: string;
  desc: string;
  actionText: string;
  actionType: 'link' | 'reparse' | 'view' | 'upload';
  fileId?: string;
}

const pendingItems = computed<PendingItem[]>(() => {
  const items: PendingItem[] = [];
  const files = fileStore.files || [];
  const unlinked = files.filter(f => !f.relatedId && f.status !== 'archived');
  const parseFailed = files.filter(f => f.status === 'uploaded');
  const lowConfidence = files.filter(f => f.parseConfidence !== null && f.parseConfidence < 0.7);

  if (unlinked.length > 0) {
    items.push({
      id: 'unlinked-files',
      type: 'warning',
      priority: 'high',
      title: `${unlinked.length}个文件未关联数据`,
      desc: '这些文件已解析但尚未关联配方或原料',
      actionText: '去关联',
      actionType: 'link',
    });
  }

  if (parseFailed.length > 0) {
    items.push({
      id: 'parse-failed',
      type: 'warning',
      priority: 'high',
      title: `${parseFailed.length}个文件解析失败`,
      desc: '这些文件上传后尚未完成解析',
      actionText: '重新解析',
      actionType: 'reparse',
    });
  }

  if (lowConfidence.length > 0) {
    items.push({
      id: 'low-confidence',
      type: 'info',
      priority: 'medium',
      title: `${lowConfidence.length}个文件解析置信度低`,
      desc: '解析结果置信度低于70%，建议重新解析',
      actionText: '查看详情',
      actionType: 'view',
    });
  }

  if (files.length === 0) {
    items.push({
      id: 'no-files',
      type: 'default',
      priority: 'high',
      title: '上传第一个文件',
      desc: '您还没有上传任何文件，开始您的文件管理之旅吧！',
      actionText: '立即上传',
      actionType: 'upload',
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return items.slice(0, 6);
});

const displayPendingItems = computed<PendingItem[]>(() => pendingItems.value);

const TODO_PAGE_SIZE = 3;
const todoPage = ref(1);

const todoTotalPages = computed(() => Math.max(1, Math.ceil(displayPendingItems.value.length / TODO_PAGE_SIZE)));

const paginatedTodoItems = computed(() => {
  const start = (todoPage.value - 1) * TODO_PAGE_SIZE;
  return displayPendingItems.value.slice(start, start + TODO_PAGE_SIZE);
});

const todoPrev = () => { if (todoPage.value > 1) todoPage.value--; };
const todoNext = () => { if (todoPage.value < todoTotalPages.value) todoPage.value++; };

const handleTodoAction = (item: PendingItem) => {
  switch (item.actionType) {
    case 'link':
      router.push('/files');
      break;
    case 'reparse':
      if (item.fileId) {
        fileStore.reparseFile(item.fileId, 'gpt-4o');
      } else {
        router.push('/files');
      }
      break;
    case 'view':
      if (item.fileId) {
        router.push(`/files/${item.fileId}`);
      } else {
        router.push('/files');
      }
      break;
    case 'upload':
      break;
  }
};

const refreshPending = () => {
  fileStore.fetchFiles();
  fileStore.fetchStats();
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
  return `${days}天前`;
}

onMounted(() => {
  paginationStore.register({
    current: fileStore.queryParams.page ?? 1,
    pageSize: fileStore.queryParams.pageSize ?? 20,
    total: fileStore.total,
    onChange: (pageInfo: { current: number; pageSize: number; }) => {
      fileStore.setPage(pageInfo.current);
      fileStore.fetchFiles();
    },
  });
});

let isRestoringFromRoute = false;
let pendingRefreshTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  if (route.query.keyword) {
    const keyword = route.query.keyword as string;
    isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    fileStore.queryParams.keyword = keyword;
    await nextTick();
  }

  await Promise.all([
    fileStore.fetchFiles(),
    fileStore.fetchStats(),
  ]);
  initialized.value = true;

  pendingRefreshTimer = setInterval(() => {
    fileStore.fetchFiles();
    fileStore.fetchStats();
  }, 5 * 60 * 1000);
});

onUnmounted(() => {
  if (pendingRefreshTimer) {
    clearInterval(pendingRefreshTimer);
    pendingRefreshTimer = null;
  }
  paginationStore.unregister();
});

onActivated(async () => {
  if (route.query.keyword && route.query.keyword !== searchKeyword.value) {
    const keyword = route.query.keyword as string;
    isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    fileStore.queryParams.keyword = keyword;
    await nextTick();
    fileStore.fetchFiles();
  }
});

watch(searchKeyword, (newVal) => {
  if (isRestoringFromRoute) {
    isRestoringFromRoute = false;
    return;
  }
  fileStore.queryParams.keyword = newVal;
  fileStore.setPage(1);
  fileStore.fetchFiles();

  const query = { ...route.query };
  if (newVal) {
    query.keyword = newVal;
  } else {
    delete query.keyword;
  }
  if (query.keyword !== route.query.keyword) {
    router.replace({ query });
  }
});

watch(() => router.currentRoute.value.path, (path) => {
  if (path === '/files') fileStore.fetchFiles();
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.file-management {

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

  .content-card {
    min-height: 400px;
    background-color: #fff;
    border-radius: 32px !important;
    border: 1px solid #f8fafc !important;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    transition: all $transition-slow;

    &:hover {
      box-shadow: 0 8px 30px rgba(15, 23, 42, 0.10), 0 2px 6px rgba(15, 23, 42, 0.05);
      border-color: #ecfdf5 !important;
    }

    :deep(.t-card__body) {
      padding: 0 !important;
    }

    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
      @include stagger-rows(20, 0.03s);
    }
  }

  .data-center-toolbar {
    padding: 32px;
    border-bottom: 1px solid #f8fafc;
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
        opacity: 0;
        transition: opacity 0.2s;
      }

      &:hover .filter-dot {
        opacity: 1;
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
    background-color: #059669;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 32px;
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

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.3s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

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
    background: #f8fafc !important;
    backdrop-filter: none !important;
    overflow: visible !important;

    th {
      background: #f8fafc !important;
      color: #94a3b8 !important;
      font-size: 12px !important;
      text-transform: uppercase !important;
      letter-spacing: 0.05em !important;
      font-weight: 600 !important;
      padding: 14px 20px !important;
      border-bottom: 1px solid #e2e8f0 !important;
      overflow: visible !important;

      &:first-child {
        padding-left: 24px !important;
        padding-right: 24px !important;
      }

      &:last-child {
        padding-left: 24px !important;
        padding-right: 24px !important;
        text-align: right !important;
      }
    }
  }
}

.t-table__body {
  background: #fff !important;

  .t-table__row {
    transition: background-color 0.2s ease;

    &:hover td,
    &.t-table__row--hover td {
      background-color: rgba(209, 250, 229, 0.35) !important;
      box-shadow: inset 3px 0 0 #34d399 !important;
    }

    &.t-table__row--selected td,
    &.t-table__row--selected.t-table__row--hover td {
      background-color: rgba(209, 250, 229, 0.55) !important;
      box-shadow: inset 3px 0 0 #10b981 !important;
    }

    td {
      padding: 18px 20px !important;
      border-bottom: 1px solid #f1f5f9 !important;
      vertical-align: middle;

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

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;

  .file-icon-wrapper {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    &.file-icon--formula {
      background: #EFF6FF;
      color: #3B82F6;
    }

    &.file-icon--material {
      background: #ECFDF5;
      color: #10B981;
    }
  }

  .file-details {
    display: flex;
    flex-direction: column;
    gap: 2px;

    .file-name {
      font-weight: 600;
      color: #334155;
      font-size: 14px;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }

    .unlink-tag {
      align-self: flex-start;
    }
  }
}

.file-size-text {
  font-size: 13px;
  color: #64748b;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.related-link {
  font-size: 14px;
  color: #3b82f6;
  cursor: pointer;
  font-weight: 500;
  transition: color 0.2s;

  &:hover {
    color: #2563eb;
    text-decoration: underline;
  }
}

.time-text {
  font-size: 13px;
  color: #64748b;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 8px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    color: #64748b;
    transition: all 0.2s ease;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      transform: translateY(-1px);
      background: #f8fafc;
      border-color: #e2e8f0;
    }

    &.edit-btn:hover {
      color: #10b981;
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    &.preview-btn:hover {
      color: #3b82f6;
      background: #eff6ff;
      border-color: #bfdbfe;
    }

    &.reparse-btn:hover {
      color: #f59e0b;
      background: #fffbeb;
      border-color: #fde68a;
    }

    &.delete-btn:hover {
      color: #ef4444;
      background: #fef2f2;
      border-color: #fecaca;
    }

    .t-icon {
      font-size: 18px;
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
    border: 1.5px solid $overlay-emerald-20;
    background: $overlay-emerald-04;
    color: #10b981;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: $overlay-emerald-12;
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

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;

  .upload-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .upload-label {
    font-size: 14px;
    font-weight: 600;
    color: #334155;
  }

  .upload-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px 0;
  }

  .upload-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 8px;
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
    transform: translateY(6px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media screen and (max-width: 1024px) {
  .file-management .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .file-management .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }
}
</style>

<style>
@use '@/assets/styles/variables.scss' as *;

.file-management .content-card .t-table,
.file-management .content-card .t-table .t-table__body-wrapper,
.file-management .content-card .t-table .t-table__body-inner,
.file-management .content-card .t-table .t-table__body {
  background: #fff !important;
}

.file-management .content-card .t-table .t-table__body tr,
.file-management .content-card .t-table .t-table__body .t-table__row {
  background-color: #fff !important;
}

.file-management .content-card .t-table .t-table__body td,
.file-management .content-card .t-table .t-table__body .t-table__row td,
.file-management .content-card .t-table .t-table__body .t-table__row.t-table__row--hover td {
  background-color: transparent !important;
  border-bottom-color: #f1f5f9 !important;
  color: #334155 !important;
  box-shadow: none !important;
}

.file-management .content-card .t-table .t-table__body tr:hover>td,
.file-management .content-card .t-table .t-table__body .t-table__row:hover>td {
  background-color: rgba(209, 250, 229, 0.35) !important;
}

.file-management .content-card .t-table .t-table__body tr:hover>td:first-child,
.file-management .content-card .t-table .t-table__body .t-table__row:hover>td:first-child {
  box-shadow: inset 3px 0 0 #34d399 !important;
}

.file-management .content-card .t-table .t-table__body .t-table__row.t-table__row--selected>td {
  background-color: rgba(209, 250, 229, 0.6) !important;
  box-shadow: inset 3px 0 0 #10b981 !important;
}

.file-management .content-card .t-table .t-table__header th {
  background: #f8fafc !important;
  color: #64748b !important;
}

.file-management .content-card .t-table {
  --td-brand-color: #10b981;
  --td-brand-color-hover: #059669;
  --td-brand-color-active: #047857;
  --td-brand-color-disabled: #a7f3d0;
  --td-brand-color-light: rgba(16, 185, 129, 0.1);
  --td-brand-color-focus: rgba(16, 185, 129, 0.4);
  --td-brand-color-border-active: #10b981;
  --td-brand-color-border-hover: #10b981;
  --td-brand-color-border-focus: #10b981;

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

.file-management .add-formula-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: 8px !important;
  padding: 8px 16px !important;
  border-radius: 12px !important;
  background-color: #1e293b !important;
  color: white !important;
  font-size: 14px !important;
  font-weight: 500 !important;
  border: none !important;
  cursor: pointer !important;
  transition: all 0.15s !important;
  box-shadow: 0 4px 6px rgba(15, 23, 42, 0.15) !important;

  &:hover {
    background-color: #334155 !important;
  }

  svg {
    flex-shrink: 0 !important;
  }
}

.file-management .content-card .t-table,
.file-management .content-card .t-table .t-table__header,
.file-management .content-card .t-table .t-table__body-wrapper {
  overflow: hidden !important;
}

/* 自定义排序 */
.file-management .custom-sort-header {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.file-management .custom-sort-header:hover {
  color: #10b981;
}

.file-management .custom-sort {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: 2px;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  opacity: 0.25;
  transition: all 0.2s;
}

.file-management .custom-sort--none {
  border-top: 5px solid #94a3b8;
  border-bottom: none;
}

.file-management .custom-sort--asc {
  border-bottom: 5px solid #10b981;
  border-top: none;
  opacity: 1;
}

.file-management .custom-sort--desc {
  border-top: 5px solid #10b981;
  border-bottom: none;
  opacity: 1;
}
</style>
