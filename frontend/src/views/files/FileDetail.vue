<template>
  <div class="file-detail" v-loading="loading">
    <template v-if="!loading && data">
      <header class="detail-header">
        <div class="header-left">
          <button class="header-back-btn" @click="handleBack" title="返回列表">
            <t-icon name="arrow-left" />
          </button>
          <div class="header-title-group">
            <nav class="header-breadcrumb">
              <a class="breadcrumb-link" @click="handleBack">文件管理</a>
              <t-icon name="chevron-right" class="breadcrumb-sep" />
              <span class="breadcrumb-current">文件详情</span>
            </nav>
            <h2 class="file-title">
              {{ data.originalName }}
              <span class="status-tag" :class="`status-tag--${data.status}`">{{ statusLabel }}</span>
            </h2>
          </div>
        </div>
        <div class="header-actions">
          <button class="header-action-btn" @click="handleReparse">
            <t-icon name="refresh" class="btn-icon" />
            重新解析
          </button>
          <button class="header-action-btn" @click="handleDownload">
            <t-icon name="download" class="btn-icon" />
            下载文件
          </button>
          <t-popconfirm v-if="isAdmin" content="确认删除此文件？删除后不可恢复" @confirm="handleDelete">
            <button class="header-action-btn header-action-btn--danger">
              <t-icon name="delete" class="btn-icon" />
              删除
            </button>
          </t-popconfirm>
        </div>
      </header>

      <main class="detail-main">
        <div class="detail-left-col">

          <section class="info-card">
            <h3 class="card-label">
              <t-icon name="folder" class="label-icon" />
              文件概况
            </h3>
            <div class="card-fields">
              <div class="field-item">
                <label><t-icon name="barcode" size="12px" /> 文件编号</label>
                <p class="mono-text">{{ data.fileId || '--' }}</p>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="file-icon" size="12px" /> 文件类型</label>
                  <p>{{ fileTypeLabel }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="layers" size="12px" /> 版本号</label>
                  <p>V{{ data.version || 1 }}</p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="file" size="12px" /> 文件大小</label>
                  <p>{{ formatFileSize(data.fileSize) }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="file-copy" size="12px" /> MIME类型</label>
                  <p class="mime-text">{{ data.mimeType || '--' }}</p>
                </div>
              </div>
              <div class="field-item">
                <label><t-icon name="check-circle" size="12px" /> 状态</label>
                <p>
                  <t-tag :theme="statusTheme" variant="light" size="small">{{ statusLabel }}</t-tag>
                </p>
              </div>
            </div>
          </section>

          <section class="info-card">
            <h3 class="card-label">
              <t-icon name="link" class="label-icon" />
              关联数据
            </h3>
            <div class="related-content">
              <template v-if="data.relations && data.relations.length > 0">
                <div class="related-list">
                  <div v-for="rel in data.relations" :key="rel.relationId" class="related-item">
                    <div class="related-item-info">
                      <t-tag theme="primary" variant="light" size="small" class="related-type-tag">
                        {{ rel.relatedType === 'formula' ? '配方' : '原料' }}
                      </t-tag>
                      <a class="related-name-link" @click="goToRelation(rel)">
                        {{ rel.relatedName }}
                      </a>
                    </div>
                    <div class="related-item-actions">
                      <t-dropdown :options="getRelationDropdownOptions(rel)"
                        @click="(data: any) => handleRelationAction(data.value, rel)" trigger="click">
                        <button class="related-edit-btn">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="12" cy="5" r="1" />
                            <circle cx="12" cy="19" r="1" />
                          </svg>
                        </button>
                      </t-dropdown>
                    </div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div class="related-empty">
                  <p class="related-empty-text">未关联数据</p>
                  <button class="related-link-btn" @click="openNewLink">
                    <t-icon name="link" size="14px" />
                    关联数据
                  </button>
                </div>
              </template>
              <button v-if="data.relations && data.relations.length > 0" class="related-add-btn" @click="openNewLink">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                添加关联
              </button>
            </div>
          </section>

          <section class="info-card">
            <h3 class="card-label">
              <t-icon name="user" class="label-icon" />
              上传信息
            </h3>
            <div class="upload-info-content">
              <div class="uploader-profile">
                <div class="uploader-avatar">
                  {{ (data.uploadedByName || data.uploadedBy || '?').charAt(0).toUpperCase() }}
                </div>
                <div>
                  <p class="uploader-name">{{ data.uploadedByName || data.uploadedBy || '--' }}</p>
                  <p class="uploader-id">{{ data.uploadedBy }}</p>
                </div>
              </div>
              <div class="upload-time-list">
                <div class="time-item">
                  <label><t-icon name="time" size="12px" /> 上传时间</label>
                  <p>{{ formatDate(data.uploadedAt) }}</p>
                </div>
                <div class="time-item">
                  <label><t-icon name="updated" size="12px" /> 最后访问</label>
                  <p>{{ data.lastAccessedAt ? formatDate(data.lastAccessedAt) : '--' }}</p>
                </div>
              </div>
            </div>
          </section>

          <section v-if="data.parseResultJson" class="info-card">
            <h3 class="card-label">
              <t-icon name="precise-monitor" class="label-icon" />
              解析结果
            </h3>
            <div class="parse-content">
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="robot" size="12px" /> AI 模型</label>
                  <p>{{ data.parseModel || '--' }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="time" size="12px" /> 解析时间</label>
                  <p>{{ formatDate(data.uploadedAt) }}</p>
                </div>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="chart" size="12px" /> 置信度</label>
                  <p :class="confidenceClass">{{ confidencePercent }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="coins" size="12px" /> Token 用量</label>
                  <p>{{ tokenUsage }}</p>
                </div>
              </div>
              <t-collapse>
                <t-collapse-panel header="解析结果 JSON">
                  <div class="parse-json-block">
                    <pre>{{ formatParseJson }}</pre>
                  </div>
                </t-collapse-panel>
              </t-collapse>
            </div>
          </section>

        </div>

        <div class="detail-right-col">

          <section class="preview-section">
            <div class="preview-header">
              <h3 class="preview-title">文件预览</h3>
              <t-button theme="primary" variant="text" size="small" @click="previewDialogVisible = true">
                <template #icon><t-icon name="fullscreen" /></template>
                全屏预览
              </t-button>
            </div>
            <div class="preview-body">
              <FilePreviewCard :fileId="data.fileId" />
            </div>
          </section>

          <FilePreviewDialog v-model:visible="previewDialogVisible" :fileId="data.fileId" />

          <section class="info-card audit-card">
            <div class="audit-header">
              <h3 class="card-label">
                <t-icon name="history" class="label-icon" />
                审计日志
              </h3>
              <div v-if="auditLogs.length > AUDIT_PAGE_SIZE" class="audit-pagination">
                <button class="audit-nav-btn" :disabled="auditPage <= 1" @click="auditPrev" title="上一页">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <span class="audit-nav-page">{{ auditPage }} / {{ auditTotalPages }}</span>
                <button class="audit-nav-btn" :disabled="auditPage >= auditTotalPages" @click="auditNext" title="下一页">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
            <div class="audit-timeline">
              <div v-if="auditLogs.length === 0" class="audit-empty">
                <t-empty description="暂无审计日志" size="small" />
              </div>
              <div v-for="log in pagedAuditLogs" :key="log.logId" class="audit-item">
                <div class="audit-dot" :class="`audit-dot--${getAuditActionColor(log.action)}`"></div>
                <div class="audit-content">
                  <div class="audit-top">
                    <t-icon :name="getAuditActionIcon(log.action)" class="audit-action-icon"
                      :class="`audit-icon--${getAuditActionColor(log.action)}`" />
                    <span class="audit-action-label">{{ getAuditActionLabel(log.action) }}</span>
                    <span class="audit-operator">{{ log.operator }}</span>
                  </div>
                  <p class="audit-time">{{ formatDate(log.timestamp) }}</p>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </template>

    <template v-if="!loading && !data">
      <div class="not-found">
        <t-empty description="文件不存在或已被删除" />
        <button class="header-action-btn" @click="handleBack" style="margin-top: 16px;">
          返回文件列表
        </button>
      </div>
    </template>

    <t-dialog v-model:visible="showLinkDialog" :confirm-btn="null" :cancel-btn="null" :close-btn="false"
      :close-on-overlay-click="false" :close-on-esc="false" width="520px" placement="center" class="link-dialog">
      <template #header>
        <div class="link-dialog-header">
          <div class="link-dialog-title">
            <svg class="link-dialog-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span>关联数据</span>
          </div>
        </div>
      </template>
      <div class="link-dialog-body">
        <div class="link-form-item">
          <label>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            关联类型
          </label>
          <t-select v-model="linkForm.relatedType" placeholder="选择关联类型" @change="handleLinkTypeChange">
            <t-option value="formula" label="配方" />
            <t-option value="material" label="原料" />
          </t-select>
        </div>
        <div class="link-form-item">
          <label>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            搜索记录
          </label>
          <div class="link-search-wrapper">
            <t-input v-model="linkForm.keyword" placeholder="输入名称搜索..." clearable @enter="handleLinkSearch"
              @clear="handleLinkSearchClear">
              <template #prefix-icon>
                <t-icon name="search" />
              </template>
            </t-input>
            <button class="link-search-btn" @click="handleLinkSearch"
              :disabled="linkSearching || !linkForm.keyword.trim()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              {{ linkSearching ? '搜索中...' : '搜索' }}
            </button>
          </div>
        </div>
        <div v-if="linkSearching" class="link-results-loading">
          <t-loading size="small" text="搜索中..." />
        </div>
        <div v-else-if="linkSearchResults.length > 0" class="link-results">
          <div class="link-results-header">
            <span class="link-results-count">找到 {{ linkSearchResults.length }} 条记录</span>
          </div>
          <t-radio-group v-model="linkForm.selectedId">
            <div v-for="item in linkSearchResults" :key="item.id" class="link-result-item"
              :class="{ 'link-result-item--selected': linkForm.selectedId === item.id }">
              <t-radio :value="item.id">
                <div class="link-result-content">
                  <span class="link-result-name">{{ item.name }}</span>
                  <span class="link-result-id">{{ item.id }}</span>
                </div>
              </t-radio>
            </div>
          </t-radio-group>
        </div>
        <div v-else-if="linkSearchFetched && linkSearchResults.length === 0" class="link-results-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <p>未找到匹配的记录</p>
          <span>请尝试其他关键词</span>
        </div>
        <div class="link-dialog-footer">
          <button class="link-close-btn" @click="handleLinkClose">
            关闭
          </button>
          <button class="link-confirm-btn" :disabled="!linkForm.selectedId || linkOperating" @click="handleLinkConfirm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ linkOperating ? '处理中...' : '确认关联' }}
          </button>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useFileStore } from '@/stores/file';
import { useAuthStore } from '@/stores/auth';
import { formulaApi } from '@/api/formula';
import { materialApi } from '@/api/material';
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next';
import FilePreviewCard from '@/components/FilePreviewCard.vue';
import FilePreviewDialog from '@/components/FilePreviewDialog.vue';
import type { AuditLog } from '@/api/file';

const router = useRouter();
const route = useRoute();
const fileStore = useFileStore();
const authStore = useAuthStore();

const loading = ref(false);
const previewDialogVisible = ref(false);
const data = ref<any>(null);
const auditLogs = ref<AuditLog[]>([]);
const AUDIT_PAGE_SIZE = 8;
const auditPage = ref(1);

const auditTotalPages = computed(() => Math.max(1, Math.ceil(auditLogs.value.length / AUDIT_PAGE_SIZE)));

const pagedAuditLogs = computed(() => {
  const start = (auditPage.value - 1) * AUDIT_PAGE_SIZE;
  return auditLogs.value.slice(start, start + AUDIT_PAGE_SIZE);
});

const auditPrev = () => { if (auditPage.value > 1) auditPage.value--; };
const auditNext = () => { if (auditPage.value < auditTotalPages.value) auditPage.value++; };
const showLinkDialog = ref(false);
const linkOperating = ref(false);
const linkForm = ref({
  relatedType: 'formula' as 'formula' | 'material',
  keyword: '',
  selectedId: '',
});
const linkSearchResults = ref<{ id: string; name: string; }[]>([]);
const linkSearching = ref(false);
const linkSearchFetched = ref(false);

const isAdmin = computed(() => authStore.user?.role === 'admin');

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    uploaded: '已上传',
    parsed: '已解析',
    linked: '已关联',
    orphaned: '未关联',
    archived: '已归档',
  };
  return map[data.value?.status] || data.value?.status || '--';
});

const statusTheme = computed(() => {
  const map: Record<string, string> = {
    uploaded: 'primary',
    parsed: 'primary',
    linked: 'success',
    orphaned: 'warning',
    archived: 'default',
  };
  return map[data.value?.status] || 'default';
});

const fileTypeLabel = computed(() => {
  const map: Record<string, string> = {
    formula: '配方文件',
    material: '原料文件',
  };
  return map[data.value?.fileType] || data.value?.fileType || '--';
});

const confidencePercent = computed(() => {
  if (data.value?.parseConfidence == null) return '--';
  return `${(data.value.parseConfidence * 100).toFixed(1)}%`;
});

const confidenceClass = computed(() => {
  if (data.value?.parseConfidence == null) return '';
  const c = data.value.parseConfidence;
  if (c >= 0.8) return 'confidence-high';
  if (c >= 0.5) return 'confidence-medium';
  return 'confidence-low';
});

const tokenUsage = computed(() => {
  if (!data.value?.parseUsageJson) return '--';
  try {
    const usage = JSON.parse(data.value.parseUsageJson);
    return usage.total_tokens ?? usage.total ?? '--';
  } catch {
    return '--';
  }
});

const formatParseJson = computed(() => {
  if (!data.value?.parseResultJson) return '';
  try {
    return JSON.stringify(JSON.parse(data.value.parseResultJson), null, 2);
  } catch {
    return data.value.parseResultJson;
  }
});

const formatFileSize = (bytes: number) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (date: string | Date) => {
  if (!date) return '--';
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const getAuditActionIcon = (action: string) => {
  const map: Record<string, string> = {
    upload: 'upload',
    parse: 'precise-monitor',
    link: 'link',
    download: 'download',
    delete: 'delete',
  };
  return map[action] || 'operation';
};

const getAuditActionLabel = (action: string) => {
  const map: Record<string, string> = {
    upload: '上传',
    parse: '解析',
    link: '关联',
    download: '下载',
    delete: '删除',
  };
  return map[action] || action;
};

const getAuditActionColor = (action: string) => {
  const map: Record<string, string> = {
    upload: 'green',
    parse: 'blue',
    link: 'green',
    download: 'grey',
    delete: 'red',
  };
  return map[action] || 'grey';
};

const handleBack = () => {
  router.push('/files');
};

const handleReparse = async () => {
  if (!data.value) return;
  const result = await fileStore.reparseFile(data.value.fileId, data.value.parseModel || 'gpt-4o');
  if (result.success) {
    await loadData();
  }
};

const handleDownload = async () => {
  if (!data.value) return;
  await fileStore.downloadFile(data.value.fileId, data.value.originalName);
};

const handleDelete = async () => {
  if (!data.value) return;
  const result = await fileStore.deleteFile(data.value.fileId);
  if (result.success) {
    router.push('/files');
  }
};

const handleLinkSearch = async () => {
  const { relatedType, keyword } = linkForm.value;
  if (!keyword.trim()) return;
  linkSearching.value = true;
  linkSearchFetched.value = false;
  try {
    if (relatedType === 'formula') {
      const res = await formulaApi.getList({ keyword, page: 1, pageSize: 20 });
      linkSearchResults.value = (res.list || []).map((f: any) => ({ id: f.id, name: f.name }));
    } else {
      const res = await materialApi.getList({ keyword, page: 1, pageSize: 20 });
      linkSearchResults.value = (res.list || []).map((m: any) => ({ id: m.id, name: m.name }));
    }
    linkSearchFetched.value = true;
  } catch {
    linkSearchResults.value = [];
    linkSearchFetched.value = true;
  } finally {
    linkSearching.value = false;
  }
};

const handleLinkSearchClear = () => {
  linkSearchResults.value = [];
  linkSearchFetched.value = false;
  linkForm.value.selectedId = '';
};

const handleLinkTypeChange = () => {
  linkSearchResults.value = [];
  linkSearchFetched.value = false;
  linkForm.value.selectedId = '';
  linkForm.value.keyword = '';
};

const handleLinkClose = () => {
  showLinkDialog.value = false;
  linkForm.value = { relatedType: 'formula', keyword: '', selectedId: '' };
  linkSearchResults.value = [];
  linkSearchFetched.value = false;
  linkOperating.value = false;
};

const openNewLink = () => {
  linkForm.value = { relatedType: 'formula', keyword: '', selectedId: '' };
  linkSearchResults.value = [];
  linkSearchFetched.value = false;
  showLinkDialog.value = true;
};

const goToRelation = (rel: any) => {
  if (rel.relatedType === 'formula') {
    router.push(`/formulas/${rel.relatedId}`);
  } else if (rel.relatedType === 'material') {
    router.push(`/materials/${rel.relatedId}`);
  }
};

const getRelationDropdownOptions = (_rel: any) => {
  return [
    {
      content: '解除关联',
      value: 'unlink',
      prefixIcon: () =>
        h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: '#ef4444', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M18 6L6 18' }),
          h('path', { d: 'M6 6l12 12' }),
        ]),
    },
    {
      content: '重新关联',
      value: 'relink',
      prefixIcon: () =>
        h('svg', { width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('polyline', { points: '23 4 23 10 17 10' }),
          h('path', { d: 'M20.49 15a9 9 0 1 1-2.12-9.36L23 10' }),
        ]),
    },
  ];
};

const handleRelationAction = async (action: string, rel: any) => {
  if (action === 'unlink') {
    DialogPlugin.confirm({
      header: '确认解除关联',
      body: `确定要解除与「${rel.relatedName}」的关联吗？`,
      confirmBtn: { content: '解除', theme: 'danger' },
      cancelBtn: { content: '取消' },
      onConfirm: async () => {
        const result = await fileStore.unlinkFile(data.value.fileId, rel.relatedId, rel.relatedType);
        if (result.success) {
          await loadData();
          MessagePlugin.success('已解除关联');
        }
      },
    });
  } else if (action === 'relink') {
    linkForm.value = { relatedType: rel.relatedType, keyword: '', selectedId: '' };
    linkSearchResults.value = [];
    linkSearchFetched.value = false;
    showLinkDialog.value = true;
  }
};

const handleLinkConfirm = async () => {
  const { selectedId, relatedType } = linkForm.value;
  if (!selectedId || !data.value) {
    MessagePlugin.warning('请选择要关联的记录');
    return;
  }
  linkOperating.value = true;
  try {
    const result = await fileStore.linkFile(data.value.fileId, selectedId, relatedType);
    if (result.success) {
      showLinkDialog.value = false;
      linkForm.value = { relatedType: 'formula', keyword: '', selectedId: '' };
      linkSearchResults.value = [];
      linkSearchFetched.value = false;
      await loadData();
      MessagePlugin.success('关联成功');
    }
  } catch {
    MessagePlugin.error('关联操作失败');
  } finally {
    linkOperating.value = false;
  }
};

const loadData = async () => {
  const fileId = (route.params.id || '') as string;
  if (!fileId || fileId === 'undefined') return;

  loading.value = true;
  try {
    const res = await fileStore.getFile(fileId);
    data.value = res;
    if (res) {
      const logs = await fileStore.fetchAuditLog(fileId);
      auditLogs.value = logs || [];
    }
  } catch (error: any) {
    console.error('获取文件详情失败:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => { loadData(); });

watch(() => route.params.id, (newId) => {
  if (newId && newId !== 'undefined') {
    loadData();
  }
});

watch(() => route.query.action, (action) => {
  if (action === 'editLink' && data.value) {
    nextTick(() => {
      openNewLink();
      router.replace({ query: {} });
    });
  }
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.file-detail {
  .detail-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -32px;
    margin-right: -32px;
    padding: 16px 32px;
    background-color: rgba(255, 255, 255, 0.80);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f1f5f9;
    animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .header-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: #10b981;
          background-color: #ecfdf5;
        }
      }

      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: 6px;

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          line-height: 1;

          .breadcrumb-link {
            color: #94a3b8;
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: #10b981;
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: #94a3b8;
          }

          .breadcrumb-current {
            color: #475569;
          }
        }

        .file-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
          line-height: 1.35;

          .status-tag {
            display: inline-block;
            padding: 2px 8px;
            font-size: 10px;
            font-weight: 900;
            border-radius: 6px;
            line-height: 1.6;
            white-space: nowrap;
            letter-spacing: 0.02em;
            flex-shrink: 0;

            &--uploaded {
              background-color: #ede9fe;
              color: #7c3aed;
            }

            &--parsed {
              background-color: #dbeafe;
              color: #2563eb;
            }

            &--linked {
              background-color: #d1fae5;
              color: #059669;
            }

            &--orphaned {
              background-color: #fef3c7;
              color: #d97706;
            }

            &--archived {
              background-color: #f1f5f9;
              color: #64748b;
            }
          }
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .header-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background-color: #10b981;
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25);
        cursor: pointer;
        transition: all $transition-fast;

        .btn-icon {
          font-size: 18px;
        }

        &:hover {
          background-color: #059669;
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.35);
        }

        &:active {
          transform: translateY(0);
          background-color: #047857;
        }

        &--danger {
          background-color: #ef4444;
          box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.25);

          &:hover {
            background-color: #dc2626;
            box-shadow: 0 14px 20px -3px rgba(239, 68, 68, 0.35);
          }

          &:active {
            background-color: #b91c1c;
          }
        }
      }
    }
  }

  .detail-main {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: $space-6;
    margin-top: $space-6;
    margin-bottom: $space-6;
    padding-bottom: $space-6;

    .detail-left-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 3;
      }

      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    .detail-right-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 9;
      }

      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    .info-card {
      background: #fff;
      padding: $space-6;
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px;
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: $space-5;
        display: flex;
        align-items: center;
        gap: 8px;

        .label-icon {
          font-size: 16px;
          color: #10b981;
          opacity: 0.7;
        }
      }
    }

    .card-fields {
      display: flex;
      flex-direction: column;
      gap: $space-3;

      .field-item {
        padding: $space-3;
        background: #f8fafc;
        border-radius: $radius-xl;
        border: 1px solid #f1f5f9;

        label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: #10b981;
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 14px;
          font-weight: 700;
          color: #334155;
          margin: 0;
        }

        .mono-text {
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        }

        .mime-text {
          font-size: 12px;
          word-break: break-all;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        }
      }

      .field-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: $space-3;

        .field-item {
          p {
            font-family: inherit;
          }
        }
      }
    }

    .related-content {
      .related-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .related-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 8px 12px;
        background: #f0fdf4;
        border-radius: 10px;
        border: 1px solid #bbf7d0;
        transition: all 0.15s ease;

        &:hover {
          border-color: #86efac;
        }

        .related-item-info {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }

        .related-type-tag {
          flex-shrink: 0;
        }

        .related-name-link {
          font-size: 13px;
          font-weight: 600;
          color: #059669;
          cursor: pointer;
          text-decoration: none;
          transition: color 0.15s;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &:hover {
            color: #047857;
            text-decoration: underline;
          }
        }

        .related-item-actions {
          flex-shrink: 0;
        }

        .related-edit-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          background: transparent;
          color: #64748b;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s ease;

          &:hover {
            background: #f1f5f9;
            color: #334155;
            border-color: #cbd5e1;
          }
        }
      }

      .related-add-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        margin-top: 8px;
        background: transparent;
        color: var(--color-primary, #10b981);
        border: 1px dashed #a7f3d0;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;

        &:hover {
          background: #ecfdf5;
          border-color: var(--color-primary, #10b981);
        }
      }

      .related-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: $space-5 $space-3;
        background: #f8fafc;
        border-radius: $radius-xl;
        border: 1px dashed #e2e8f0;

        .related-empty-text {
          font-size: 13px;
          color: #94a3b8;
          margin: 0;
        }

        .related-link-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: #10b981;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all $transition-fast;

          &:hover {
            background: #059669;
            transform: translateY(-1px);
          }
        }
      }
    }

    .upload-info-content {
      display: flex;
      flex-direction: column;
      gap: $space-4;

      .uploader-profile {
        display: flex;
        align-items: center;
        gap: $space-3;

        .uploader-avatar {
          width: 44px;
          height: 44px;
          border-radius: $radius-xl;
          background: linear-gradient(135deg, #ecfdf5, #dbeafe);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
          font-size: 18px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .uploader-name {
          font-weight: 700;
          color: #1e293b;
          font-size: 14px;
          margin: 0;
        }

        .uploader-id {
          font-size: 11px;
          color: #94a3b8;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          margin: 2px 0 0;
        }
      }

      .upload-time-list {
        display: flex;
        flex-direction: column;
        gap: $space-3;

        .time-item {
          padding: $space-3;
          background: #f8fafc;
          border-radius: $radius-xl;
          border: 1px solid #f1f5f9;

          label {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            font-weight: 700;
            color: #94a3b8;
            text-transform: uppercase;
            margin-bottom: 4px;

            .t-icon {
              color: #10b981;
              opacity: 0.55;
              flex-shrink: 0;
            }
          }

          p {
            font-size: 13px;
            font-weight: 600;
            color: #334155;
            margin: 0;
          }
        }
      }
    }

    .parse-content {
      display: flex;
      flex-direction: column;
      gap: $space-3;

      .confidence-high {
        color: #10b981;
        font-weight: 700;
      }

      .confidence-medium {
        color: #f59e0b;
        font-weight: 700;
      }

      .confidence-low {
        color: #ef4444;
        font-weight: 700;
      }

      .parse-json-block {
        max-height: 300px;
        overflow: auto;
        background: #f8fafc;
        border-radius: $radius-xl;
        border: 1px solid #f1f5f9;
        padding: $space-3;

        pre {
          margin: 0;
          font-size: 12px;
          line-height: 1.6;
          color: #334155;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
          white-space: pre-wrap;
          word-break: break-all;
        }
      }
    }

    .preview-section {
      background: #fff;
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid #f8fafc;
      overflow: hidden;
      animation: fadeInUp 0.4s ease both;

      .preview-header {
        padding: $space-5 $space-6;
        border-bottom: 1px solid #f8fafc;
        background: rgba(248, 250, 252, 0.5);
        display: flex;
        justify-content: space-between;
        align-items: center;

        .preview-title {
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          margin: 0;
        }
      }

      .preview-body {
        min-height: 400px;
        padding: $space-4;
      }
    }

    .audit-card {
      .audit-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: $space-5;

        .card-label {
          margin-bottom: 0;
        }
      }
      .audit-timeline {
        display: flex;
        flex-direction: column;
        gap: 0;

        .audit-empty {
          padding: $space-5 0;
        }

        .audit-item {
          display: flex;
          gap: $space-3;
          position: relative;
          padding: $space-2 0;

          &:not(:last-child)::after {
            content: '';
            position: absolute;
            left: 7px;
            top: 30px;
            bottom: 0;
            width: 2px;
            background: #f1f5f9;
          }

          .audit-dot {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            z-index: 1;
            flex-shrink: 0;
            margin-top: 4px;

            &--green {
              background: #10b981;
              border: 3px solid #d1fae5;
            }

            &--blue {
              background: #3b82f6;
              border: 3px solid #dbeafe;
            }

            &--grey {
              background: #94a3b8;
              border: 3px solid #f1f5f9;
            }

            &--red {
              background: #ef4444;
              border: 3px solid #fee2e2;
            }
          }

          .audit-content {
            flex: 1;
            min-width: 0;

            .audit-top {
              display: flex;
              align-items: center;
              gap: 6px;
              margin-bottom: 2px;

              .audit-action-icon {
                font-size: 14px;

                &.audit-icon--green {
                  color: #10b981;
                }

                &.audit-icon--blue {
                  color: #3b82f6;
                }

                &.audit-icon--grey {
                  color: #94a3b8;
                }

                &.audit-icon--red {
                  color: #ef4444;
                }
              }

              .audit-action-label {
                font-size: 13px;
                font-weight: 600;
                color: #334155;
              }

              .audit-operator {
                font-size: 12px;
                color: #94a3b8;
                margin-left: auto;
              }
            }

            .audit-time {
              font-size: 12px;
              color: #94a3b8;
              margin: 0;
            }
          }
        }
      }

      .audit-pagination {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;

        .audit-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          cursor: pointer;
          transition: all 0.15s;

          &:hover:not(:disabled) {
            background: #ecfdf5;
            border-color: #a7f3d0;
            color: #059669;
          }

          &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
        }

        .audit-nav-page {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
          user-select: none;
        }
      }
    }
  }

  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 0;
  }

  .link-dialog-header {
    .link-dialog-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;

      .link-dialog-icon {
        color: var(--color-primary, #10b981);
        flex-shrink: 0;
      }
    }
  }

  .link-dialog-body {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .link-form-item {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: #475569;

        svg {
          color: var(--color-primary, #10b981);
          opacity: 0.7;
          flex-shrink: 0;
        }
      }
    }

    .link-search-wrapper {
      display: flex;
      gap: 8px;
      align-items: center;

      .t-input {
        flex: 1;
      }

      .link-search-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 7px 14px;
        background: var(--color-primary, #10b981);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
        flex-shrink: 0;

        &:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
          filter: brightness(0.95);
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        svg {
          flex-shrink: 0;
        }
      }
    }

    .link-results-loading {
      display: flex;
      justify-content: center;
      padding: 24px 0;
    }

    .link-results {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      overflow: hidden;

      .link-results-header {
        padding: 8px 14px;
        background: #f8fafc;
        border-bottom: 1px solid #f1f5f9;

        .link-results-count {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
      }

      max-height: 280px;
      overflow-y: auto;

      .link-result-item {
        padding: 10px 14px;
        border-radius: 0;
        transition: all 0.15s ease;
        border-bottom: 1px solid #f8fafc;
        border-left: 3px solid transparent;

        &:last-child {
          border-bottom: none;
        }

        &:hover {
          background: #f8fafc;
        }

        &--selected {
          border-left-color: var(--color-primary, #10b981);

          .link-result-name {
            color: var(--color-primary-dark, #059669);
            font-weight: 600;
          }

          .link-result-id {
            color: var(--color-primary, #10b981);
          }
        }

        .link-result-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .link-result-name {
          font-size: 14px;
          color: #334155;
          font-weight: 500;
        }

        .link-result-id {
          font-size: 11px;
          color: #94a3b8;
          font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        }
      }
    }

    .link-results-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 28px 16px;
      gap: 8px;

      svg {
        margin-bottom: 4px;
      }

      p {
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin: 0;
      }

      span {
        font-size: 12px;
        color: #94a3b8;
      }
    }

    .link-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 8px;
      border-top: 1px solid #f1f5f9;
      margin-top: 4px;

      .link-close-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        background: #fff;
        color: #475569;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #334155;
        }

        &:active {
          background: #f1f5f9;
        }
      }

      .link-confirm-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 18px;
        background: var(--color-primary, #10b981);
        color: #fff;
        border: none;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

        &:hover:not(:disabled) {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
          filter: brightness(0.95);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &:disabled {
          opacity: 0.45;
          cursor: not-allowed;
          box-shadow: none;
        }

        svg {
          flex-shrink: 0;
        }
      }
    }

  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 640px) {
    .detail-header {
      padding: 12px 16px;
      flex-direction: column;
      gap: 12px;

      .header-left {
        width: 100%;
        justify-content: flex-start;

        .header-title-group {
          .file-title {
            font-size: 16px;

            .status-tag {
              display: none;
            }
          }

          .header-breadcrumb {
            font-size: 11px;
          }
        }
      }

      .header-actions {
        width: 100%;
        justify-content: flex-end;

        .header-action-btn {
          padding: 6px 14px;
          font-size: 13px;

          .btn-icon {
            font-size: 16px;
          }
        }
      }
    }

    .detail-main {
      grid-template-columns: 1fr;
    }
  }
}
</style>

<style lang="scss">
.link-dialog {
  .t-dialog__footer {
    display: none;
  }

  .t-dialog__close {
    display: none;
  }
}
</style>
