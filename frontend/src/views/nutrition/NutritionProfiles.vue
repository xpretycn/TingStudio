<template>
  <div class="nutrition-profiles" :aria-busy="!initialized">
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
      <PageSkeleton v-if="!initialized" type="table" :rows="5" :columns="6" />
      <t-card v-else class="content-card" bordered>
        <div class="data-center-toolbar">
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">营养标准管理中心</h3>
              <p class="toolbar-subtitle">管理营养标准配置、指标值与合规检查基准</p>
            </div>
          </div>
          <div class="toolbar-right-section">
            <div class="search-container">
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input v-model="searchKeyword" class="search-input" placeholder="搜索标准名称..." @input="handleSearch"
                @clear="handleSearch" clearable />
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

        <t-table :data="filteredProfiles" :columns="columns" :loading="nutritionStore.loading" row-key="profileId" hover
          table-layout="auto">
          <template #empty><t-empty description="暂无营养标准" role="status" /></template>
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
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>编辑
              </button>
              <button v-if="!row.isPreset" class="table-action-btn table-action-btn--danger" @click="handleDelete(row)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>删除
              </button>
            </t-space>
          </template>
        </t-table>
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
import { ref, reactive, computed, onMounted } from 'vue';
import { useNutritionStore } from '@/stores/nutrition';
import { MessagePlugin, Dialog } from 'tdesign-vue-next';
import type { NutritionProfile } from '@/api/nutrition';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const nutritionStore = useNutritionStore();

const initialized = ref(false);
const searchKeyword = ref('');

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
  { colKey: 'name', title: '标准名称', width: 200 },
  { colKey: 'category', title: '适用类别', width: 120 },
  { colKey: 'isPreset', title: '预置', width: 80 },
  { colKey: 'targetCount', title: '指标数量', width: 120 },
  { colKey: 'createdAt', title: '创建时间', width: 180, cell: 'createdAt' },
  { colKey: 'operation', title: '操作', width: 220, align: 'center' }
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
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    },
    {
      label: '预置标准',
      value: presetCount.toString(),
      unit: '个',
      badge: presetCount > 0 ? '系统内置' : '无',
      badgeColor: 'var(--color-warning)',
      badgeBg: '#FFFBEB',
      iconBg: '#FFFBEB',
      iconColor: 'var(--color-warning)',
      iconPath: '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    },
    {
      label: '覆盖类别',
      value: categories.toString(),
      unit: '类',
      badge: `${categories} 类人群`,
      badgeColor: 'var(--color-text-placeholder)',
      badgeBg: '#F1F5F9',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
      iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    },
    {
      label: '总指标数',
      value: profiles.reduce((sum: number, p: NutritionProfile) => sum + Object.keys(p.targetValues || {}).length, 0).toString(),
      unit: '项',
      badge: '活跃',
      badgeColor: '#A855F7',
      badgeBg: '#FAF5FF',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
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

const handleSearch = () => { };
const handleFilter = () => { };

// handleCreate is called from template
// @ts-expect-error function called programmatically
async function _handleCreate() {
  if (!profileForm.name) { MessagePlugin.warning('请输入标准名称'); return; }
  if (!Object.keys(profileForm.targetValues).length) { MessagePlugin.warning('请至少添加一项营养指标'); return; }
  const result = await nutritionStore.createProfile({
    name: profileForm.name,
    category: profileForm.category,
    description: profileForm.description || undefined,
    targetValues: profileForm.targetValues
  });
  if (result.success) {
    MessagePlugin.success('创建成功');
    showDialog.value = false;
  } else {
    MessagePlugin.error(result.message || '创建失败');
  }
};

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
  const confirmed = await Dialog.confirm({
    header: '确认删除',
    content: `确定要删除营养标准"${row.name}"吗？`,
    confirmBtn: { theme: 'danger', content: '确定' },
    cancelBtn: { theme: 'default', content: '取消' },
  });
  if (confirmed) {
    const result = await nutritionStore.deleteProfile(row.profileId);
    if (result.success) MessagePlugin.success('删除成功');
    else MessagePlugin.error(result.message || '删除失败');
  }
};

const handleViewDetail = (row: NutritionProfile) => {
  currentProfile.value = row;
  detailVisible.value = true;
};

onMounted(async () => {
  await nutritionStore.fetchProfiles();
  initialized.value = true;
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
      background: #fff;
      padding: 24px;
      border-radius: var(--radius-4xl);
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
        color: #0F172A;
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
      background: linear-gradient(135deg, #374151, #1f2937);
      color: #fff;
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

  .table-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: var(--space-1-25) var(--space-2-5);
    border-radius: 8px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all $transition-fast;
    background: transparent;

    &--primary {
      color: #3b82f6;

      &:hover {
        background: #eff6ff;
      }
    }

    &--success {
      color: var(--color-primary);

      &:hover {
        background: #ecfdf5;
      }
    }

    &--danger {
      color: var(--color-danger);

      &:hover {
        background: #fef2f2;
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
    background-color: #fff;
    border-radius: var(--radius-4xl);
    padding: 32px;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
    border: 1px solid var(--color-bg-page);

    &--assistant {
      background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
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
    background: #f1f5f9;
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
    background: #fff;
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
      border-color: #3b82f6;

      .timeline-dot-inner {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #3b82f6;
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
    color: #fff;
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
