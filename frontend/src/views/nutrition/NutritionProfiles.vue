<template>
  <div class="nutrition-profiles" :aria-busy="!initialized">
    <!-- 仪表盘卡片 -->
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
    <!-- 内容卡片 -->
    <Transition name="content-fade" mode="out-in">
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="6" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <!-- 批量操作栏 (默认隐藏) -->
          <Transition name="batch-bar-slide">
            <div v-if="selectedRows.length > 0" class="batch-action-bar">
              <div class="batch-info">
                <span class="batch-count"><strong>{{ selectedRows.length }}</strong> 项已选择</span>
                <div class="batch-divider"></div>
                <div class="batch-buttons">
                  <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedRows.length} 个标准吗？预置标准不会被删除。`"
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
              <h3 class="toolbar-title">营养标准管理中心</h3>
              <p class="toolbar-subtitle">管理营养标准配置、指标值与合规检查基准</p>
            </div>
          </div>

          <!-- 右侧：搜索和新增按钮 -->
          <div class="toolbar-right-section">
            <div class="search-container">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input v-model="searchKeyword" class="search-input" placeholder="搜索标准名称..." clearable />
            </div>
            <t-select v-model="filterForm.category" placeholder="全部类别" clearable style="width: 140px"
              :popup-props="{ appendToBody: true }" @change="handleFilter">
              <t-option value="infant" label="婴幼儿" />
              <t-option value="child" label="儿童" />
              <t-option value="adult" label="成人" />
              <t-option value="elderly" label="老年" />
              <t-option value="pregnant" label="孕妇" />
              <t-option value="special" label="特殊" />
            </t-select>
            <button class="add-formula-btn" @click="showDialog = true; resetForm()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              新增标准
            </button>
          </div>
        </div>

        <t-table :data="pagedProfiles" :columns="columns" :loading="nutritionStore.loading" row-key="profileId" hover
          table-layout="auto" @select-change="handleSelectChange" :selected-row-keys="selectedRowKeys">
          <template #empty>
            <t-empty description="暂无营养标准" role="status">
              <template #action>
                <button class="add-formula-btn" @click="showDialog = true; resetForm()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  创建第一个标准
                </button>
              </template>
            </t-empty>
          </template>
          <template #category="{ row }">
            <t-tag :theme="categoryTheme(row.category)" variant="light">{{ categoryLabel(row.category) }}</t-tag>
          </template>
          <template #targetCount="{ row }">
            <t-tag theme="primary" variant="light">{{ Object.keys(row.targetValues || {}).length }} 项指标</t-tag>
          </template>
          <template #isPreset="{ row }">
            <t-tag v-if="row.isPreset" theme="warning" variant="light" size="small">预置</t-tag>
            <span v-else class="text-muted">—</span>
          </template>
          <template #createdAt="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
          <template #operation="{ row }">
            <t-space :size="4">
              <button class="table-action-btn table-action-btn--primary" @click="handleViewDetail(row)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>详情
              </button>
              <button v-if="!row.isPreset" class="table-action-btn table-action-btn--success" @click="handleEdit(row)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>编辑
              </button>
              <t-popconfirm v-if="!row.isPreset" theme="danger" :content="`确定要删除标准「${row.name}」吗？`"
                @confirm="handleDelete(row)">
                <button class="table-action-btn table-action-btn--danger">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" />
                  </svg>删除
                </button>
              </t-popconfirm>
            </t-space>
          </template>
        </t-table>

        <!-- 分页 -->
        <div v-if="totalCount > 0" class="table-pagination">
          <div class="pagination-info">
            显示第 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, totalCount) }} 条，共 {{
              totalCount }}
            条数据
          </div>
          <div class="pagination-controls">
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': currentPage === 1 }"
              :disabled="currentPage === 1" @click="setPage(currentPage - 1)">上一页</button>
            <template v-for="page in pageNumbers" :key="page">
              <button v-if="page !== '...'" class="pagination-btn"
                :class="{ 'pagination-btn--active': page === currentPage }"
                @click="typeof page === 'number' && setPage(page)">{{ page }}</button>
              <span v-else class="pagination-ellipsis">...</span>
            </template>
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': currentPage === totalPages }"
              :disabled="currentPage === totalPages" @click="setPage(currentPage + 1)">下一页</button>
          </div>
        </div>
      </t-card>
    </Transition>
    <!-- 活动卡片 -->
    <section class="activity-section">
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期操作动态
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
          <h4 class="assistant-title">营养标准助手</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="showDialog = true; resetForm()">创建新标准</button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">营</span>
              <span class="assistant-avatar">养</span>
              <span class="assistant-avatar">标</span>
            </div>
            <span class="assistant-hint">{{ nutritionStore.profiles?.length || 0 }} 个标准在列</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </div>
    </section>

    <t-dialog v-model:visible="showDialog" :header="isEditMode ? '编辑营养标准' : '新增营养标准'" width="600px"
      @confirm="handleSave">
      <t-form :data="profileForm" label-width="100px">
        <t-form-item label="标准名称">
          <t-input v-model="profileForm.name" placeholder="例如：GB 10765 婴幼儿配方" />
        </t-form-item>
        <t-form-item label="适用类别">
          <t-select v-model="profileForm.category" :popup-props="{ appendToBody: true }">
            <t-option value="infant" label="婴幼儿" />
            <t-option value="child" label="儿童" />
            <t-option value="adult" label="成人" />
            <t-option value="elderly" label="老年" />
            <t-option value="pregnant" label="孕妇" />
            <t-option value="special" label="特殊" />
          </t-select>
        </t-form-item>
        <t-form-item label="描述">
          <t-textarea v-model="profileForm.description" placeholder="可选描述" />
        </t-form-item>
        <t-form-item label="营养指标">
          <div class="target-values-editor">
            <div v-for="(val, key) in profileForm.targetValues" :key="key" class="target-row">
              <t-input :value="key" @change="(v: string) => updateTargetKey(key, v)" placeholder="指标名"
                style="width: 160px" />
              <t-input-number :value="val" @change="(v: number) => updateTargetVal(key, v)" placeholder="值"
                style="width: 140px" />
              <t-button variant="text" theme="danger" size="small" @click="removeTarget(key as string)">
                <template #icon><t-icon name="delete" /></template>
              </t-button>
            </div>
            <t-button variant="dashed" size="small" @click="addTarget" style="width: 100%;">
              <template #icon><t-icon name="add" /></template>添加指标
            </t-button>
          </div>
        </t-form-item>
      </t-form>
    </t-dialog>

    <t-dialog v-model:visible="detailVisible" :header="currentProfile?.name" width="600px" :footer="false">
      <div v-if="currentProfile">
        <t-descriptions :column="2" bordered>
          <t-descriptions-item label="标准名称">{{ currentProfile.name }}</t-descriptions-item>
          <t-descriptions-item label="适用类别">{{ categoryLabel(currentProfile.category) }}</t-descriptions-item>
          <t-descriptions-item label="描述" :span="2">{{ currentProfile.description || '无' }}</t-descriptions-item>
        </t-descriptions>
        <div class="detail-targets">
          <h4>营养指标值</h4>
          <t-table :data="profileTargetList" :columns="targetDetailColumns" size="small" bordered />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useNutritionStore } from '@/stores/nutrition';
import { usePaginationStore } from '@/stores/pagination';
import { MessagePlugin } from 'tdesign-vue-next';
import type { NutritionProfile } from '@/api/nutrition';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const nutritionStore = useNutritionStore();
const paginationStore = usePaginationStore();

const initialized = ref(false);
const searchKeyword = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<NutritionProfile[]>([]);

const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: NutritionProfile[]; }) => {
  selectedRowKeys.value = value;
  selectedRows.value = selectedRowData;
};

const clearSelection = () => {
  selectedRowKeys.value = [];
  selectedRows.value = [];
};

const handleBatchDelete = async () => {
  if (selectedRows.value.length === 0) return;
  const deletable = selectedRows.value.filter((p: NutritionProfile) => !p.isPreset);
  if (deletable.length === 0) {
    MessagePlugin.warning('所选标准均为预置标准，不可删除');
    return;
  }
  for (const p of deletable) {
    await nutritionStore.deleteProfile(p.profileId);
  }
  MessagePlugin.success(`已删除 ${deletable.length} 个标准`);
  clearSelection();
};

const filterForm = reactive({ category: '' });
const showDialog = ref(false);
const detailVisible = ref(false);
const isEditMode = ref(false);
const editingProfileId = ref('');
const currentProfile = ref<NutritionProfile | null>(null);

const profileForm = reactive({
  name: '',
  category: 'adult' as string,
  description: '',
  targetValues: {} as Record<string, number>
});

const formatDateTime = (raw: string) => {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.substring(0, 19);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const categoryMap: Record<string, string> = {
  infant: '婴幼儿', child: '儿童', adult: '成人', elderly: '老年', pregnant: '孕妇', special: '特殊'
};
const categoryLabel = (c: string) => categoryMap[c] || c;
const categoryTheme = (c: string) => c === 'infant' ? 'warning' : c === 'adult' ? 'primary' : 'success';

const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50 },
  { colKey: 'name', title: '标准名称', width: 200 },
  { colKey: 'category', title: '适用类别', width: 120 },
  { colKey: 'isPreset', title: '预置', width: 80 },
  { colKey: 'targetCount', title: '指标数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 200, align: 'center', cell: 'operation' }
];

const targetDetailColumns = [
  { colKey: 'nutrient', title: '营养成分', width: 200 },
  { colKey: 'value', title: '标准值' }
];

const filteredProfiles = computed(() => {
  let list = nutritionStore.profiles || [];
  if (filterForm.category) list = list.filter((p: NutritionProfile) => p.category === filterForm.category);
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.toLowerCase().trim();
    list = list.filter((p: NutritionProfile) => p.name?.toLowerCase().includes(kw));
  }
  return list;
});

const totalCount = computed(() => filteredProfiles.value.length);
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value) || 1);

const pagedProfiles = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredProfiles.value.slice(start, start + pageSize.value);
});

const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = currentPage.value;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

const setPage = (page: number) => {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
};

watch([searchKeyword, () => filterForm.category], () => {
  currentPage.value = 1;
});

const profileTargetList = computed(() => {
  if (!currentProfile.value?.targetValues) return [];
  return Object.entries(currentProfile.value.targetValues).map(([k, v]) => ({ nutrient: k, value: v }));
});

const dashboardCards = computed(() => {
  const profiles = nutritionStore.profiles || [];
  const total = profiles.length;
  const presetCount = profiles.filter((p: NutritionProfile) => p.isPreset).length;
  const customCount = total - presetCount;
  const categories = new Set(profiles.map((p: NutritionProfile) => p.category)).size;
  return [
    {
      label: '营养标准',
      value: total.toString(),
      unit: '个',
      badge: customCount > 0 ? `自定义 ${customCount}` : '—',
      badgeColor: 'var(--color-primary)',
      badgeBg: 'var(--color-emerald-50)',
      iconBg: 'var(--color-info-bg)',
      iconColor: 'var(--color-info)',
      iconPath: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    },
    {
      label: '预置标准',
      value: presetCount.toString(),
      unit: '个',
      badge: presetCount > 0 ? '系统内置' : '无',
      badgeColor: 'var(--color-warning)',
      badgeBg: 'var(--color-warning-bg)',
      iconBg: 'var(--color-warning-bg)',
      iconColor: 'var(--color-warning)',
      iconPath: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    },
    {
      label: '覆盖类别',
      value: categories.toString(),
      unit: '类',
      badge: `${categories} 类人群`,
      badgeColor: 'var(--color-text-placeholder)',
      badgeBg: 'var(--color-bg-hover)',
      iconBg: 'var(--color-emerald-50)',
      iconColor: 'var(--color-primary)',
      iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    },
    {
      label: '总指标数',
      value: profiles.reduce((sum: number, p: NutritionProfile) => sum + Object.keys(p.targetValues || {}).length, 0).toString(),
      unit: '项',
      badge: '活跃',
      badgeColor: 'var(--color-purple-500)',
      badgeBg: 'var(--color-purple-50)',
      iconBg: 'var(--color-purple-50)',
      iconColor: 'var(--color-purple-500)',
      iconPath: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    },
  ];
});

interface ActivityItem { type: 'success' | 'info'; title: string; desc: string; time: string; }
const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const items: ActivityItem[] = [];
  const profiles = nutritionStore.profiles || [];
  for (const p of profiles.slice(0, 20)) {
    items.push({
      type: 'success',
      title: p.isPreset ? '预置标准可用' : '自定义标准创建',
      desc: `营养标准 <strong>${p.name || '未知'}</strong> 已就绪，包含 <strong>${Object.keys(p.targetValues || {}).length}</strong> 项指标`,
      time: formatDateTime(p.createdAt),
    });
  }
  if (items.length === 0) items.push({ type: 'info', title: '暂无动态', desc: '还没有营养标准操作记录', time: '' });
  return items;
});

const activityTotalPages = computed(() => Math.max(1, Math.ceil(allActivityItems.value.length / ACTIVITY_PAGE_SIZE)));
const pagedActivityItems = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return allActivityItems.value.slice(start, start + ACTIVITY_PAGE_SIZE);
});
const activityPrev = () => { if (activityPage.value > 1) activityPage.value--; };
const activityNext = () => { if (activityPage.value < activityTotalPages.value) activityPage.value++; };

const assistantMessage = computed(() => {
  const total = nutritionStore.profiles?.length || 0;
  if (total === 0) return '还没有营养标准，点击下方按钮创建第一个标准吧！';
  if (total < 3) return `已有 ${total} 个标准，建议补充更多类别的营养标准以完善分析能力。`;
  return `当前有 ${total} 个营养标准，覆盖多种人群类别，可进行全面的合规检查。`;
});

const resetForm = () => {
  profileForm.name = '';
  profileForm.category = 'adult';
  profileForm.description = '';
  profileForm.targetValues = {};
};

const addTarget = () => {
  profileForm.targetValues[`指标${Object.keys(profileForm.targetValues).length + 1}`] = 0;
};

const updateTargetKey = (oldKey: string, newKey: string) => {
  if (oldKey === newKey) return;
  const val = profileForm.targetValues[oldKey];
  delete profileForm.targetValues[oldKey];
  profileForm.targetValues[newKey] = val;
};

const updateTargetVal = (key: string, val: number) => {
  profileForm.targetValues[key] = val;
};

const removeTarget = (key: string) => {
  delete profileForm.targetValues[key];
};

const handleFilter = () => { };

const handleEdit = (row: NutritionProfile) => {
  isEditMode.value = true;
  editingProfileId.value = row.profileId;
  profileForm.name = row.name;
  profileForm.category = row.category;
  profileForm.description = row.description || '';
  profileForm.targetValues = { ...row.targetValues };
  showDialog.value = true;
};

const handleSave = async () => {
  if (!profileForm.name) { MessagePlugin.warning('请输入标准名称'); return; }
  if (!Object.keys(profileForm.targetValues).length) { MessagePlugin.warning('请至少添加一项营养指标'); return; }

  let result;
  if (isEditMode.value && editingProfileId.value) {
    result = await nutritionStore.updateProfile(editingProfileId.value, {
      name: profileForm.name,
      category: profileForm.category,
      description: profileForm.description || undefined,
      targetValues: profileForm.targetValues
    });
  } else {
    result = await nutritionStore.createProfile({
      name: profileForm.name,
      category: profileForm.category,
      description: profileForm.description || undefined,
      targetValues: profileForm.targetValues
    });
  }

  if (result.success) {
    MessagePlugin.success(isEditMode.value ? '更新成功' : '创建成功');
    showDialog.value = false;
  } else {
    MessagePlugin.error(result.message || (isEditMode.value ? '更新失败' : '创建失败'));
  }
};

const handleDelete = async (row: NutritionProfile) => {
  if (row.isPreset) { MessagePlugin.warning('预置营养标准不可删除'); return; }
  const result = await nutritionStore.deleteProfile(row.profileId);
  if (result.success) MessagePlugin.success('删除成功');
  else MessagePlugin.error(result.message || '删除失败');
};

const handleViewDetail = (row: NutritionProfile) => {
  currentProfile.value = row;
  detailVisible.value = true;
};

onMounted(async () => {
  await nutritionStore.fetchProfiles();
  initialized.value = true;
  paginationStore.register({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: totalCount.value,
    onChange: (pageInfo: { current: number; pageSize: number; }) => {
      currentPage.value = pageInfo.current;
      if (pageInfo.pageSize !== pageSize.value) {
        pageSize.value = pageInfo.pageSize;
        currentPage.value = 1;
      }
    }
  });
  watch([currentPage, pageSize, totalCount], () => {
    paginationStore.update({
      current: currentPage.value,
      pageSize: pageSize.value,
      total: totalCount.value
    });
  });
});

onBeforeUnmount(() => {
  paginationStore.unregister();
});
</script>

<style scoped lang="scss">
.nutrition-profiles {
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;
    margin-bottom: 30px;

    .stat-card {
      background: var(--color-bg-container);
      padding: 24px;
      border-radius: var(--radius-4xl);
      border: 1px solid var(--color-bg-container);
      box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
      transition: all $transition-slow;
      animation: dashboard-fade-in 0.5s ease forwards;
      opacity: 0;

      &:hover {
        border-color: var(--color-info-bg);
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

  .content-card {
    min-height: 400px;
    border-radius: var(--radius-4xl) !important;
    overflow: hidden;
    border: none;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);

    :deep(.t-card__body) {
      padding: 0;
    }

    :deep(.t-table) {
      --td-brand-color: var(--color-emerald);
      --td-brand-color-hover: var(--color-success);
      --td-border-level-1-color: transparent;
      --td-border-level-2-color: transparent;

      &::before,
      &::after {
        display: none !important;
      }

      .t-table__header th {
        background: var(--color-bg-page) !important;
        color: var(--color-text-secondary) !important;
        border-color: var(--color-bg-page) !important;
        border-left: none !important;
        border-right: none !important;
        border-top: none !important;
      }

      .t-table__body .t-table__row {
        animation: rowFadeIn 0.3s ease both;

        td {
          padding: 12px 16px !important;
          border-bottom: 1px solid var(--color-bg-hover) !important;
          border-left: none !important;
          border-right: none !important;
          border-top: none !important;
          border-color: var(--color-bg-hover) !important;
          vertical-align: middle;
          font-size: 13px !important;
          box-sizing: border-box !important;
          position: relative;
          overflow: hidden;

          &::before,
          &::after {
            display: none !important;
            content: none !important;
          }
        }

        &:last-child td {
          border-bottom: none !important;
        }

        &--selected,
        &--selected.t-table__row--hover {
          >td {
            background-color: rgba(209, 250, 229, 0.55) !important;
            border-color: rgba(209, 250, 229, 0.8) !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: 1px solid rgba(209, 250, 229, 0.8) !important;
            box-shadow: none !important;

            &:first-child {
              box-shadow: inset 3px 0 0 var(--color-emerald) !important;
            }
          }
        }

        &:hover:not(.t-table__row--selected)>td:first-child {
          box-shadow: inset 3px 0 0 var(--color-primary-light);
        }
      }

      .t-table__inner-border {
        display: none !important;
      }
    }
  }

  .table-pagination {
    padding: 16px 24px 8px;
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
        color: var(--color-text-white);
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
        width: 240px;
        border-radius: 12px !important;
        transition: all $transition-normal;

        &:focus-within {
          width: 280px;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
        }

        :deep(.t-input__inner) {
          padding-left: 38px !important;
        }
      }
    }

    .add-formula-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1-5);
      padding: var(--space-2-5) 20px;
      border-radius: 12px;
      background: linear-gradient(135deg, var(--color-text-primary), var(--color-text-secondary));
      color: var(--color-text-white);
      font-size: 13px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      transition: all $transition-normal;
      white-space: nowrap;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(55, 65, 81, 0.35);
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  .text-muted {
    color: var(--color-text-placeholder);
  }

  .batch-action-bar {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    background-color: var(--color-primary-dark);
    color: var(--color-text-white);
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
        color: var(--color-text-white);
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
      color: var(--color-text-white);
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background-color: var(--color-primary-deep);
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

  .table-action-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-2-5);
    border-radius: var(--radius-xs);
    font-size: $font-size-caption;
    font-weight: $font-weight-medium;
    cursor: pointer;
    transition: all $transition-fast;
    white-space: nowrap;
    border: none;

    svg {
      width: 14px;
      height: 14px;
      stroke-width: 2;
    }

    &--primary {
      color: var(--color-info);
      background: rgba(24, 144, 255, 0.08);

      &:hover {
        background: rgba(24, 144, 255, 0.15);
        color: var(--color-info-dark);
      }
    }

    &--success {
      color: var(--color-success);
      background: rgba(123, 198, 126, 0.08);

      &:hover {
        background: rgba(123, 198, 126, 0.15);
      }
    }

    &--danger {
      color: var(--color-danger);
      background: rgba(227, 77, 89, 0.06);

      &:hover {
        background: rgba(227, 77, 89, 0.12);
      }
    }
  }

  .target-values-editor {
    width: 100%;

    .target-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
  }

  .detail-targets {
    margin-top: 16px;

    h4 {
      margin: 0 0 12px 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
      display: flex;
      align-items: center;
      gap: var(--space-1-5);

      &::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 18px;
        background: linear-gradient(135deg, var(--color-primary), var(--color-primary-light));
        border-radius: var(--radius-2xs);
      }
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
    background-color: var(--color-bg-container);
    border-radius: var(--radius-4xl);
    padding: 32px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid var(--color-bg-page);

    &--assistant {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
      border: none;
      color: var(--color-text-white);
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
    font-size: 17px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .activity-nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .activity-nav-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 8px;
    border: none;
    background: var(--color-bg-hover);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: var(--color-border);
      color: var(--color-text-primary);
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  .activity-nav-page {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    min-width: 40px;
    text-align: center;
  }

  .timeline-list {
    position: relative;

    &::before {
      content: '';
      position: absolute;
      left: 11px;
      top: 8px;
      bottom: 8px;
      width: 2px;
      background: var(--color-border);
      border-radius: 1px;
    }
  }

  .timeline-item {
    display: flex;
    gap: 16px;
    position: relative;
    padding-bottom: 20px;

    &:last-child {
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
    z-index: 1;
    background: var(--color-bg-container);
    border: 2px solid var(--color-border);

    &--success {
      border-color: var(--color-primary);

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-primary);
      }
    }

    &--info {
      border-color: var(--color-info);

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-info);
      }
    }

    &--warning {
      border-color: var(--color-warning);

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--color-warning);
      }
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
    line-height: 1.5;
    margin: 0 0 4px 0;

    strong {
      color: var(--color-text-primary);
      font-weight: 600;
    }
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
    line-height: 1.6;
    margin: 0 0 20px 0;
    min-height: 42px;
  }

  .assistant-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-2-5) 24px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    color: var(--color-text-white);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all $transition-normal;
    backdrop-filter: blur(10px);

    &:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
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
    width: 30px;
    height: 30px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
    backdrop-filter: blur(4px);
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
    transform: rotate(-15deg);
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
}
</style>

<style lang="scss">
.nutrition-profiles-page {
  .t-table {
    --td-brand-color: var(--color-emerald) !important;
    --td-brand-color-hover: var(--color-success) !important;
    --td-border-level-1-color: transparent !important;
    --td-border-level-2-color: transparent !important;

    .t-table__inner-border,
    .t-table__inner-border::before,
    .t-table__inner-border::after {
      display: none !important;
    }

    .t-table__header th {
      border-left: none !important;
      border-right: none !important;
      border-top: none !important;
      border-color: var(--color-bg-page) !important;
    }

    .t-table__body .t-table__row td {
      border-left: none !important;
      border-right: none !important;
      border-top: none !important;
      border-bottom: 1px solid var(--color-bg-hover) !important;
      position: relative;

      &::before,
      &::after {
        display: none !important;
        content: none !important;
      }
    }

    .t-table__row.t-table__row--selected>td,
    .t-table__row.t-table__row--selected.t-table__row--hover>td {
      background-color: rgba(209, 250, 229, 0.55) !important;
      box-shadow: none !important;
      border-left: none !important;
      border-right: none !important;
      border-top: none !important;
      border-bottom: 1px solid rgba(209, 250, 229, 0.8) !important;
      border-color: rgba(209, 250, 229, 0.8) !important;
    }

    .t-table__row.t-table__row--selected>td:first-child,
    .t-table__row.t-table__row--selected.t-table__row--hover>td:first-child {
      box-shadow: inset 3px 0 0 var(--color-emerald) !important;
    }

    .t-table__row__text {
      &::after {
        display: none !important;
      }
    }
  }
}
</style>
