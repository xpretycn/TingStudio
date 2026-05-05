<template>
  <div class="export-center" :aria-busy="!initialized">
    <!-- 数据看板 -->
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

    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="5" />
      <t-card v-else class="content-card" bordered>
        <!-- 工具栏 -->
        <div class="data-center-toolbar">
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">导出管理中心</h3>
              <p class="toolbar-subtitle">管理配方导出任务、分享链接与导出模板</p>
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
              <!-- ====== Tab 1: 导出任务 ====== -->
              <div v-show="activeTab === 'export'" class="tab-panel">
                <div class="panel-inner">
                  <div class="create-form-bar">
                    <t-form :data="exportForm" layout="inline" @submit="handleCreateJob">
                      <t-form-item label="配方">
                        <t-select v-model="exportForm.formulaId" placeholder="选择配方" filterable clearable
                          :loading="formulaLoading" style="width: 220px" :popup-props="{ appendToBody: true }">
                          <t-option v-for="f in formulaList" :key="f.id" :value="f.id" :label="f.name" />
                        </t-select>
                      </t-form-item>
                      <t-form-item label="格式">
                        <t-select v-model="exportForm.exportType" style="width: 140px"
                          :popup-props="{ appendToBody: true }">
                          <t-option value="excel" label="Excel" />
                          <t-option value="pdf" label="PDF" />
                        </t-select>
                      </t-form-item>
                      <t-form-item>
                        <button type="submit" class="create-action-btn" :disabled="creating">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                            <polyline points="7 10 12 15 17 10" />
                            <line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          {{ creating ? '创建中...' : '创建导出' }}
                        </button>
                      </t-form-item>
                    </t-form>
                  </div>

                  <div class="table-area">
                    <t-table :data="exportStore.jobs" :columns="jobColumns" :loading="exportStore.loading"
                      row-key="jobId" hover size="small" table-layout="auto">
                      <template #empty>
                        <t-empty description="暂无导出任务" role="status">
                          <template #action>
                            <button class="create-job-btn" @click="handleCreateJob">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                              </svg>
                              创建导出任务
                            </button>
                          </template>
                        </t-empty>
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
                          <t-button v-if="row.status === 'completed'" variant="outline" theme="primary" size="small"
                            @click="handleDownload(row)">
                            <template #icon><t-icon name="download" /></template>下载
                          </t-button>
                          <t-button v-if="row.status === 'failed'" variant="outline" theme="warning" size="small"
                            :loading="retryingId === row.jobId" @click="handleRetry(row)">
                            <template #icon><t-icon name="refresh" /></template>重试
                          </t-button>
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

              <!-- ====== Tab 2: 分享管理 ====== -->
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

              <!-- ====== Tab 3: 导出模板 ====== -->
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
                  </div>
                </div>
              </div>

              <!-- ====== Tab 4: API 接口 ====== -->
              <div v-show="activeTab === 'api'" class="tab-panel">
                <div class="panel-inner">
                  <div class="create-form-bar create-form-bar--header">
                    <span class="form-bar-title">接口列表</span>
                    <t-button theme="primary" @click="showApiDialog = true">
                      <template #icon><t-icon name="add" /></template>新增接口
                    </t-button>
                  </div>
                  <div class="table-area">
                    <t-table :data="exportStore.apiInterfaces" :columns="apiColumns" :loading="exportStore.loading"
                      row-key="interfaceId" hover size="small" table-layout="auto">
                      <template #empty><t-empty description="暂无API接口" role="status" /></template>
                      <template #method="{ row }">
                        <t-tag :theme="methodTheme(row.method)" variant="light">{{ row.method }}</t-tag>
                      </template>
                      <template #auth="{ row }">
                        <t-tag variant="light">{{ authLabel(row.authentication) }}</t-tag>
                      </template>
                    </t-table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </t-card>
    </Transition>

  <!-- 底部快捷动态 -->
  <section class="activity-section">
    <div class="activity-card activity-card--timeline">
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
    <div class="activity-card activity-card--assistant">
      <div class="assistant-content">
        <h4 class="assistant-title">导出小助手</h4>
        <p class="assistant-desc">{{ assistantMessage }}</p>
        <button class="assistant-btn" @click="activeTab = 'export'">创建导出任务</button>
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
  </section>

  <!-- 模板编辑弹窗 -->
  <t-dialog v-model:visible="showTemplateDialog" :header="editingTemplate ? '编辑模板' : '创建导出模板'"
    @confirm="handleSaveTemplate" @close="resetTemplateForm">
    <t-form :data="templateForm" label-width="100px">
      <t-form-item label="模板名称"><t-input v-model="templateForm.name" placeholder="请输入模板名称" /></t-form-item>
      <t-form-item label="类型">
        <t-select v-model="templateForm.type" :popup-props="{ appendToBody: true }">
          <t-option value="pdf" label="PDF" />
          <t-option value="excel" label="Excel" />
          <t-option value="api" label="API" />
        </t-select>
      </t-form-item>
      <t-form-item label="描述"><t-textarea v-model="templateForm.description" placeholder="可选" /></t-form-item>
      <t-form-item label="设为默认"><t-switch v-model="templateForm.isDefault" /></t-form-item>
    </t-form>
  </t-dialog>

  <!-- API接口创建弹窗 -->
  <t-dialog v-model:visible="showApiDialog" header="创建API接口" @confirm="handleCreateApi" @close="resetApiForm">
    <t-form :data="apiForm" label-width="100px">
      <t-form-item label="接口名称"><t-input v-model="apiForm.name" placeholder="请输入接口名称" /></t-form-item>
      <t-form-item label="端点URL"><t-input v-model="apiForm.endpoint" placeholder="/api/formulas/export" /></t-form-item>
      <t-form-item label="HTTP方法">
        <t-select v-model="apiForm.method" :popup-props="{ appendToBody: true }">
          <t-option value="GET" label="GET" />
          <t-option value="POST" label="POST" />
          <t-option value="PUT" label="PUT" />
          <t-option value="DELETE" label="DELETE" />
        </t-select>
      </t-form-item>
      <t-form-item label="认证方式">
        <t-select v-model="apiForm.authentication" :popup-props="{ appendToBody: true }">
          <t-option value="none" label="无认证" />
          <t-option value="apiKey" label="API Key" />
          <t-option value="basic" label="Basic Auth" />
          <t-option value="oauth" label="OAuth" />
        </t-select>
      </t-form-item>
      <t-form-item label="描述"><t-textarea v-model="apiForm.description" placeholder="可选" /></t-form-item>
    </t-form>
  </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useExportStore } from '@/stores/export';
import { MessagePlugin } from 'tdesign-vue-next';
import { formulaApi } from '@/api/formula';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const exportStore = useExportStore();
const initialized = ref(false);
const activeTab = ref('export');
const navCollapsed = ref(false);

function toggleNavCollapse() {
  navCollapsed.value = !navCollapsed.value;
}

const exportTabs = [
  {
    value: 'export',
    label: '导出任务',
    iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
  },
  {
    value: 'share',
    label: '分享管理',
    iconPath: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
  },
  {
    value: 'templates',
    label: '导出模板',
    iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
  },
  {
    value: 'api',
    label: 'API 接口',
    iconPath: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  },
];

function switchTab(tab: string) {
  activeTab.value = tab;
  handleTabChange(tab);
}
const showTemplateDialog = ref(false);
const showApiDialog = ref(false);
const editingTemplate = ref<any>(null);
const creating = ref(false);
const retryingId = ref('');
const formulaLoading = ref(false);
const formulaList = ref<any[]>([]);
const searchKeyword = ref('');

const exportForm = reactive({ formulaId: '', exportType: 'pdf' });
const shareForm = reactive({ formulaId: '', password: '', expireDate: '' });
const templateForm = reactive({ name: '', type: 'excel', description: '', isDefault: false });
const apiForm = reactive({ name: '', endpoint: '', method: 'POST', authentication: 'none', description: '' });

// ─── 数据看板 ───
const dashboardCards = computed(() => {
  const jobs = exportStore.jobs || [];
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j: any) => j.status === 'completed').length;
  const shares = exportStore.shares || [];
  const templates = exportStore.templates || [];
  return [
    {
      label: '导出任务',
      value: totalJobs.toString(),
      unit: '个',
      badge: completedJobs > 0 ? `已完成 ${completedJobs}` : '—',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>',
    },
    {
      label: '分享链接',
      value: shares.length.toString(),
      unit: '条',
      badge: shares.length > 0 ? '活跃' : '无',
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>',
    },
    {
      label: '导出模板',
      value: templates.length.toString(),
      unit: '套',
      badge: '可用',
      badgeColor: '#94A3B8',
      badgeBg: '#F1F5F9',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    },
    {
      label: 'API 接口',
      value: (exportStore.apiInterfaces || []).length.toString(),
      unit: '个',
      badge: '在线',
      badgeColor: '#A855F7',
      badgeBg: '#FAF5FF',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    },
  ];
});

// ─── 分页 ───
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

// ─── 搜索 ───
let searchTimer: ReturnType<typeof setTimeout> | null = null;
const handleSearch = () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    // 搜索逻辑（可扩展）
  }, 300);
};

const formatDateTime = (raw: string) => raw ? raw.replace('T', ' ').replace('Z', '').substring(0, 19) : '';

// ─── 动态时间线 ───
interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }
const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [];
  const jobs = exportStore.jobs || [];
  for (const j of jobs.slice(0, 20)) {
    const job = j as any;
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

// 加载配方列表（供下拉选择）
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

// Tab 切换时加载数据
function handleTabChange(tab: string) {
  if (tab === 'export') exportStore.fetchJobs({ page: 1 });
  else if (tab === 'share') exportStore.fetchShares();
  else if (tab === 'templates') exportStore.fetchTemplates();
  else if (tab === 'api') exportStore.fetchApiInterfaces();
}

// ====== 导出任务 ======
const jobColumns = [
  { colKey: 'jobId', title: '任务ID', width: 120, ellipsis: true },
  { colKey: 'formulaName', title: '配方名称', width: 140, ellipsis: true },
  { colKey: 'exportType', title: '格式', width: 80, cell: 'exportType' },
  { colKey: 'status', title: '状态', width: 100, cell: 'status' },
  { colKey: 'createdAt', title: '创建时间', width: 170, cell: 'createdAt' },
  { colKey: 'errorMessage', title: '错误信息', ellipsis: true },
  { colKey: 'operation', title: '操作', width: 130, cell: 'operation', align: 'center' },
];

const jobStatusTheme = (s: string) => s === 'completed' ? 'success' : s === 'failed' ? 'danger' : s === 'processing' ? 'warning' : 'default';
const jobStatusLabel = (s: string) => ({ pending: '待处理', processing: '处理中', completed: '已完成', failed: '失败' }[s] || s);

async function handleCreateJob() {
  if (!exportForm.formulaId) { MessagePlugin.warning('请选择配方'); return; }
  creating.value = true;
  const result = await exportStore.createJob(exportForm);
  creating.value = false;
  if (result.success) {
    const data = result.data as { jobId: string; status: string; fileName?: string; errorMessage?: string; } | undefined;
    if (data?.status === 'completed') {
      MessagePlugin.success('导出完成，正在下载...');
      await exportStore.downloadFile(data.jobId, data.fileName || `配方导出.${exportForm.exportType === 'pdf' ? 'pdf' : 'xlsx'}`, exportForm.exportType);
    } else if (data?.status === 'failed') {
      MessagePlugin.error(`导出失败: ${data.errorMessage || '未知错误'}`);
    } else {
      MessagePlugin.success('导出任务已创建');
    }
    exportStore.fetchJobs({ page: 1 });
  } else {
    MessagePlugin.error(result.message || '创建失败');
  }
}

async function handleDownload(row: any) {
  const ext = row.exportType === 'pdf' ? 'pdf' : 'xlsx';
  await exportStore.downloadFile(row.jobId, row.fileName || `配方导出.${ext}`, row.exportType);
}

async function handleRetry(row: any) {
  retryingId.value = row.jobId;
  const result = await exportStore.retryJob(row.jobId);
  retryingId.value = '';
  if (result.success) {
    MessagePlugin.success('重试成功');
  } else {
    MessagePlugin.error(result.message || '重试失败');
  }
}

// ====== 分享管理 ======
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
    // @ts-ignore
    MessagePlugin.success(`分享链接已创建: ${result.data.shareUrl}`);
    shareForm.formulaId = '';
    shareForm.password = '';
    shareForm.expireDate = '';
    exportStore.fetchShares();
  } else {
    MessagePlugin.error(result.message || '创建失败');
  }
}

async function handleCopyShareUrl(row: any) {
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

// ====== 模板管理 ======
const templateColumns = [
  { colKey: 'name', title: '模板名称' },
  { colKey: 'type', title: '类型', width: 100, cell: 'type' },
  { colKey: 'isDefault', title: '默认', width: 80, cell: 'isDefault' },
  { colKey: 'createdAt', title: '创建时间', width: 170, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 130, cell: 'operation' },
];

function handleOpenTemplateDialog(template: any) {
  if (template) {
    editingTemplate.value = template;
    templateForm.name = template.name;
    templateForm.type = template.type;
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
      description: templateForm.description,
      formatConfig: {},
      isDefault: templateForm.isDefault,
    });
  } else {
    result = await exportStore.createTemplate({
      name: templateForm.name,
      type: templateForm.type,
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

// ====== API 接口 ======
const apiColumns = [
  { colKey: 'name', title: '接口名称' },
  { colKey: 'endpoint', title: '端点URL', width: 220, ellipsis: true },
  { colKey: 'method', title: '方法', width: 90, cell: 'method' },
  { colKey: 'authentication', title: '认证', width: 100, cell: 'auth' },
  { colKey: 'description', title: '描述', ellipsis: true },
  { colKey: 'operation', title: '操作', width: 130, cell: 'operation', align: 'center' },
];

const methodTheme = (m: string) => m === 'GET' ? 'success' : m === 'POST' ? 'primary' : m === 'PUT' ? 'warning' : 'danger';
const authLabel = (a: string) => ({ none: '无认证', apiKey: 'API Key', basic: 'Basic Auth', oauth: 'OAuth' }[a] || a);

async function handleCreateApi() {
  if (!apiForm.name) { MessagePlugin.warning('请输入接口名称'); return; }
  // API 创建逻辑可扩展
  showApiDialog.value = false;
  MessagePlugin.success('API 接口已保存');
}

function resetApiForm() {
  apiForm.name = '';
  apiForm.endpoint = '';
  apiForm.method = 'POST';
  apiForm.authentication = 'none';
  apiForm.description = '';
}

onMounted(async () => {
  await Promise.all([fetchFormulaList(), exportStore.fetchJobs({ page: 1 })]);
  initialized.value = true;
});
</script>

<style scoped lang="scss">
.export-center {

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
    }

    .search-container {
      position: relative;
      display: flex;
      align-items: center;

      .search-icon {
        position: absolute;
        left: 14px;
        color: #94a3b8;
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

  // ─── 内容卡片 ───
  .content-card {
    border-radius: 32px !important;
    overflow: hidden;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid #f8fafc !important;
    transition: all $transition-slow;

    &:hover {
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.09), 0 2px 6px rgba(15, 23, 42, 0.04);
    }

    :deep(.t-card__body) {
      padding: 0 !important;
    }

    :deep(.t-tabs__nav-container) {
      padding: 0 32px;
      background: transparent;
    }

    :deep(.t-tabs__nav-wrap) {
      background: transparent;
    }

    :deep(.t-tabs__nav-item) {
      font-size: 14px;
      font-weight: 500;
      padding: 12px 16px;
      color: #64748b;
      transition: all $transition-normal;
      border-radius: 12px;
      margin-right: 4px;

      &:hover {
        color: #334155;
        background: #f1f5f9;
      }

      &.t-tabs__nav-item--active {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }

    :deep(.t-tabs__bar) {
      display: none;
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
        padding: 24px 6px;

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
        gap: 10px;
        padding: 12px 16px;
        border-radius: 12px;
        cursor: pointer;
        transition: all $transition-normal;
        color: #64748b;
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
          color: #334155;
        }

        &.active {
          background: linear-gradient(135deg, #10B981, #059669);
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
        border: 1px solid #e2e8f0;
        background: transparent;
        color: #94a3b8;
        cursor: pointer;
        margin-top: 12px;
        transition: all 0.2s;

        &:hover {
          background: #f1f5f9;
          color: #334155;
          border-color: #cbd5e1;
        }
      }
    }

    .export-content {
      flex: 1;
      min-width: 0;
      overflow: hidden;
    }

    .export-tab-panels {}

    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
    }
  }

  // ─── 面板内部布局 ───
  .panel-inner {
    padding: 24px 32px;
  }

  .create-job-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border-radius: 12px;
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: all $transition-normal;
    white-space: nowrap;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    svg {
      flex-shrink: 0;
    }
  }

  .create-form-bar {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px 24px;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    margin-bottom: 20px;
    border: 1px solid #e2e8f0;

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
      color: #1e293b;
    }
  }

  .create-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 18px;
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #10b981, #059669);
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
      background: #f8fafc;
      font-weight: 600;
      color: #475569;
      font-size: 13px;
      letter-spacing: 0.02em;
    }

    :deep(.t-table__body td) {
      font-size: 14px;
      color: #334155;
    }

    :deep(.t-table__body tr:hover td) {
      background: #f0fdf4;
    }
  }

  // ─── 分页 ───
  .table-pagination {
    padding: 20px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
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
      color: #64748b;
      font-size: 14px;
      cursor: pointer;
      transition: all $transition-fast;
      white-space: nowrap;
      user-select: none;

      &:hover:not(.pagination-btn--disabled):not(.pagination-btn--active) {
        background-color: #f8fafc;
        border-color: #cbd5e1;
        color: #334155;
      }

      &.pagination-btn--disabled {
        opacity: 0.5;
        cursor: not-allowed !important;
        color: #94a3b8;
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

  // ─── 底部活动区域 ───
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
      background: linear-gradient(135deg, #10B981, #059669);
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
      color: #10b981;
    }

    &--warning {
      background: #fffbeb;
      color: #f59e0b;
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
    color: #1e293b;
    margin: 0 0 4px 0;
  }

  .timeline-desc {
    font-size: 13px;
    color: #64748b;
    line-height: 1.6;
    margin: 0 0 4px 0;
  }

  .timeline-time {
    font-size: 12px;
    color: #94a3b8;
  }

  // ─── 助手卡片 ───
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
    gap: 6px;
    padding: 10px 22px;
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
    gap: 6px;
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
}

// ─── 动画 ───
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

.dialog-fade-enter-active {
  animation: dialog-fade-in 0.2s ease forwards;
}

.dialog-fade-leave-active {
  animation: dialog-fade-out 0.15s ease forwards;
}

@keyframes dialog-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes dialog-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}
</style>
