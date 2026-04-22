<template>
  <div class="material-list" :aria-busy="!initialized" data-testid="material-list">
    <!-- 数据看板 -->
    <section class="dashboard-grid" data-testid="dashboard-grid">
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
        <!-- 工具栏 -->
        <div class="data-center-toolbar" data-testid="material-toolbar">
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
                    批量删除
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
                </div>
              </div>
              <button class="batch-cancel-btn" @click="clearSelection">取消</button>
            </div>
          </Transition>

          <!-- 左侧：标题和描述 -->
          <div class="toolbar-left-section">
            <div class="toolbar-title-section">
              <h3 class="toolbar-title">原料管理中心</h3>
              <p class="toolbar-subtitle">点击列表查看原料详情、营养成分与库存状态</p>
            </div>
          </div>

          <!-- 右侧：搜索和新增按钮 -->
          <div class="toolbar-right-section">
            <div class="search-container" role="search">
              <label for="material-search-input" class="sr-only">搜索原料</label>
              <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <t-input id="material-search-input" v-model="searchKeyword" class="search-input"
                placeholder="搜索原料名称、编码..." clearable aria-label="按原料名称或编码搜索" data-testid="material-search" />
            </div>
            <button class="add-formula-btn" @click="handleCreate" aria-label="录入新原料" data-testid="material-add-btn">
              <t-icon name="add" class="add-icon" />
              录入原料
            </button>
            <button class="filter-btn" aria-label="筛选原料类型" aria-haspopup="true">
              <t-icon name="filter" class="filter-icon" />
              <span class="filter-dot"></span>
            </button>
          </div>
        </div>

        <t-table :data="sortedMaterials" :columns="columns" :loading="materialStore.loading" :pagination="undefined"
          :sort="tableSort" row-key="id" hover table-layout="auto" @sort-change="onSortChange"
          :expanded-row-keys="expandedRowKeys" @expand-change="onExpandChange" @select-change="handleSelectChange"
          :selected-row-keys="selectedRowKeys">
          <template #name="{ row }">
            <div class="material-info">
              <div class="material-avatar" :style="{
                backgroundColor: getMaterialAvatar(row).bgColor,
                color: getMaterialAvatar(row).textColor
              }">
                {{ getMaterialAvatar(row).text }}
              </div>
              <div class="material-details">
                <p class="material-name">{{ row.name }}</p>
                <p class="material-code">CODE: {{ row.code }}</p>
              </div>
            </div>
          </template>


          <template #dataSource="{ row }">
            <span class="data-source-tag" :class="'data-source--' + (getDataSource(row) || 'manual')">
              <t-icon :name="getDataSourceIcon(row)" size="14px" />
              {{ getDataSourceLabel(row) }}
            </span>
          </template>

          <template #materialType="{ row }">
            <t-tag :theme="row.materialType === 'supplement' ? 'primary' : 'success'" variant="light" size="small"
              shape="round">
              {{ row.materialType === 'supplement' ? '辅料' : '药材' }}
            </t-tag>
          </template>

          <template #stock="{ row }">
            <span class="stock-value" :class="{ 'stock-low': row.stock < 50 }">{{ row.stock }} {{ row.unit }}</span>
          </template>

          <template #nutrition="{ row }">
            <t-tag v-if="nutritionMap[row.id]" theme="warning" variant="light" size="small" shape="round">
              <template #icon><t-icon name="chart-bar" size="14px" /></template>
              {{ nutritionMap[row.id] }}项营养
            </t-tag>
            <span v-else class="nutrition-empty">
              <t-icon name="info-circle" size="14px" />
              未录入
            </span>
          </template>

          <template #expandedRow="{ row }">
            <div class="expanded-content">
              <div class="nutrition-section" v-if="Object.keys(getExpandedNutrition(row)).length > 0">
                <div class="nutrition-header">
                  <h4>
                    <t-icon name="chart-bar" size="18px" />
                    营养成分分析
                  </h4>
                  <t-tag variant="light" theme="success" size="small">每100g含量</t-tag>
                </div>
                <div class="nutrition-grid">
                  <div v-for="(val, key) in getExpandedNutrition(row)" :key="key" class="nutrition-item"
                    :class="{ 'nutrition-item--highlight': isHighlightNutrient(key) }">
                    <label class="nutri-label">{{ getNutrientLabel(key) }}</label>
                    <span class="nutri-value">{{ val }}<small class="nutri-unit">g</small></span>
                    <div class="nutri-bar-track">
                      <div class="nutri-bar-fill" :style="{ width: getNutrientPercent(val, key) + '%' }"></div>
                    </div>
                    <span class="nutri-percent">{{ getNutrientPercent(val, key) }}%</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-nutrition">
                <t-icon name="info-circle" size="40px" />
                <p>暂无营养数据</p>
                <p class="empty-hint">请前往编辑页面录入该原料的营养成分信息</p>
              </div>
            </div>
          </template>

          <template #empty>
            <t-empty description="暂无原料数据" role="status">
              <template #action>
                <t-button theme="primary" @click="handleCreate">
                  <template #icon><t-icon name="add" /></template>录入第一个原料
                </t-button>
              </template>
            </t-empty>
          </template>

          <template #operation="{ row }">
            <div class="action-buttons" role="group" aria-label="原料操作">
              <button class="action-btn view-btn" @click="handleView(row)" title="查看" :aria-label="`查看原料${row.name}详情`">
                <t-icon name="browse" />
              </button>
              <button class="action-btn edit-btn" @click.stop="handleEdit(row)" title="编辑"
                :aria-label="`编辑原料${row.name}`">
                <t-icon name="edit-1" />
              </button>
              <t-popconfirm theme="danger" :content="`确定要删除原料「${row.name}」吗？`" @confirm="handleDelete(row)">
                <button class="action-btn delete-btn" title="删除" :aria-label="`删除原料${row.name}`">
                  <t-icon name="delete" />
                </button>
              </t-popconfirm>
            </div>
          </template>
        </t-table>

        <!-- 分页 -->
        <div v-if="materialStore.total > 0" class="table-pagination">
          <div class="pagination-info">
            显示第 {{ (materialStore.currentPage - 1) * materialStore.pageSize + 1 }}-{{ Math.min(materialStore.currentPage
              *
              materialStore.pageSize, materialStore.total) }} 条，共 {{ materialStore.total }} 条数据
          </div>
          <div class="pagination-controls">
            <button class="pagination-btn" :class="{ 'pagination-btn--disabled': materialStore.currentPage === 1 }"
              :disabled="materialStore.currentPage === 1"
              @click="materialStore.setPage(materialStore.currentPage - 1); loadMaterials()">上一页</button>
            <template v-for="page in pageNumbers" :key="page">
              <button v-if="page !== '...'" class="pagination-btn"
                :class="{ 'pagination-btn--active': page === materialStore.currentPage }"
                @click="typeof page === 'number' && (materialStore.setPage(page), loadMaterials())">{{ page }}
              </button>
              <span v-else class="pagination-ellipsis">...</span>
            </template>
            <button class="pagination-btn"
              :class="{ 'pagination-btn--disabled': materialStore.currentPage === totalPages }"
              :disabled="materialStore.currentPage === totalPages"
              @click="materialStore.setPage(materialStore.currentPage + 1); loadMaterials()">下一页</button>
          </div>
        </div>
      </t-card>
    </Transition>

    <!-- 底部快捷动态 -->
    <section class="activity-section">
      <!-- 左：近期原料变更 -->
      <div class="activity-card activity-card--timeline">
        <div class="activity-header">
          <h4 class="activity-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            近期原料变更记录
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
      <!-- 右：原料管理助手 -->
      <div class="activity-card activity-card--assistant">
        <div class="assistant-content">
          <h4 class="assistant-title">原料管理助手</h4>
          <p class="assistant-desc">{{ assistantMessage }}</p>
          <button class="assistant-btn" @click="handleCreate">录入新原料</button>
          <div class="assistant-footer">
            <div class="assistant-avatar-group">
              <span class="assistant-avatar">原</span>
              <span class="assistant-avatar">料</span>
              <span class="assistant-avatar">库</span>
            </div>
            <span class="assistant-hint">{{ materialStore.total }} 种原料在库</span>
          </div>
        </div>
        <svg class="assistant-bg-icon" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="1">
          <path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
    </section>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useMaterialStore } from '@/stores/material';
import { usePaginationStore } from '@/stores/pagination';
import { nutritionApi } from '@/api/nutrition';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Material } from '@/api/material';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const materialStore = useMaterialStore();
const paginationStore = usePaginationStore();

const initialized = ref(false);

const searchKeyword = ref('');
const nutritionMap = ref<Record<string, string>>({});
const expandedNutrition = ref<Record<string, Record<string, number>>>({});
const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<Material[]>([]);
const tableSort = ref<any>(undefined);
const sortedMaterials = ref<Material[]>([]);
const expandedRowKeys = ref<(string | number)[]>([]);

// ─── 数据看板 ───
const dashboardCards = computed(() => {
  const total = materialStore.total || materialStore.materials?.length || 0;
  const herbCount = materialStore.materials?.filter((m: Material) => m.materialType !== 'supplement').length || 0;
  const supplementCount = materialStore.materials?.filter((m: Material) => m.materialType === 'supplement').length || 0;
  const nutritionCount = Object.keys(nutritionMap.value).length;

  return [
    {
      label: '原料库总量',
      value: total.toLocaleString(),
      unit: '种',
      badge: `${total > 0 ? '+' + Math.min(total, 99) : 0}`,
      badgeColor: '#10B981',
      badgeBg: '#ECFDF5',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96L12 12.01l8.73-5.05"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    },
    {
      label: '药材类',
      value: herbCount.toString(),
      unit: '种',
      badge: '主料',
      badgeColor: '#059669',
      badgeBg: '#D1FAE5',
      iconBg: '#FFFBEB',
      iconColor: '#F59E0B',
      iconPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    },
    {
      label: '辅料类',
      value: supplementCount.toString(),
      unit: '种',
      badge: '补充剂',
      badgeColor: '#D97706',
      badgeBg: '#FEF3C7',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    },
    {
      label: '已录营养',
      value: nutritionCount.toString(),
      unit: '项',
      badge: nutritionCount >= total && total > 0 ? '完整' : '待补全',
      badgeColor: nutritionCount >= total ? '#10B981' : '#EF4444',
      badgeBg: nutritionCount >= total ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#ECFDF5',
      iconColor: '#10B981',
      iconPath: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    },
  ];
});

// 营养成分标签映射
const nutrientLabels: Record<string, string> = {
  protein: '蛋白质',
  fat: '脂肪',
  carbohydrate: '碳水化合物',
  sodium: '钠',
  calories: '热量',
  dietaryFiber: '膳食纤维'
};

// 营养成分参考值（每100g推荐上限）
const nutrientMax: Record<string, number> = {
  protein: 40,
  fat: 30,
  carbohydrate: 80,
  sodium: 2,
  calories: 500,
  dietaryFiber: 20
};

const getNutrientLabel = (key: string): string => nutrientLabels[key] || key;
const getNutrientPercent = (value: number, key: string): number => {
  const max = nutrientMax[key] || 100;
  return Math.min(100, Math.round((value / max) * 100));
};
const isHighlightNutrient = (key: string): boolean => ['protein', 'fat', 'carbohydrate'].includes(key);

const onSortChange = (sort: any) => {
  tableSort.value = sort;
  if (!sort || !sort.sortBy) {
    sortedMaterials.value = [...materialStore.materials];
    return;
  }
  const { sortBy, descending } = sort;
  const col = columns.find(c => c.colKey === sortBy);
  if (col?.sorter) {
    sortedMaterials.value = [...materialStore.materials].sort((a, b) => {
      const result = (col.sorter as Function)(a, b);
      return descending ? -result : result;
    });
  } else {
    sortedMaterials.value = [...materialStore.materials];
  }
};

watch(() => materialStore.materials, (val) => {
  console.log('[MaterialList] materials watcher, count=', val.length);
  if (tableSort.value?.sortBy) {
    onSortChange(tableSort.value);
  } else {
    sortedMaterials.value = [...val];
  }
}, { immediate: true });

// 展开行
const onExpandChange = (keys: Array<string | number>) => {
  expandedRowKeys.value = keys;
};

const getExpandedNutrition = (row: any): Record<string, number> => {
  if (!row?.id) return {};
  if (!expandedNutrition.value[row.id]) {
    expandedNutrition.value[row.id] = getMockNutritionData(row);
  }
  return expandedNutrition.value[row.id];
};

// 模拟营养数据（当API无数据时使用fallback）
const getMockNutritionData = (row: any): Record<string, number> => {
  const idHash = row.id ? row.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) : 0;
  return {
    protein: Math.round((15 + (idHash % 25)) * 10) / 10,
    fat: Math.round((5 + (idHash % 15)) * 10) / 10,
    carbohydrate: Math.round((30 + (idHash % 40)) * 10) / 10,
    sodium: Math.round(((idHash % 200) / 100) * 10) / 10,
    calories: Math.round(150 + (idHash % 300)),
    dietaryFiber: Math.round((3 + (idHash % 12)) * 10) / 10
  };
};

// 原料头像
const getMaterialAvatar = (row: any) => {
  const code = row.code || '';
  const name = row.name || '';
  const codeMatch = code.match(/^([A-Z]+)/);
  if (codeMatch) {
    return { text: codeMatch[1], bgColor: getAvatarColor(codeMatch[1]).bg, textColor: getAvatarColor(codeMatch[1]).text };
  }
  const initial = name.charAt(0).toUpperCase();
  return { text: initial || '?', bgColor: getAvatarColor(initial).bg, textColor: getAvatarColor(initial).text };
};

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

// 数据源相关（模拟数据）
const dataSourceMap: Record<string, string> = {
  'manual': '手动录入',
  'import': '批量导入',
  'api': 'API同步',
  'ai': 'AI生成'
};

const getDataSource = (row: any): string => {
  if (!row.id) return 'manual';
  const hash = row.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
  const sources = ['manual', 'import', 'api', 'ai'];
  return sources[hash % sources.length];
};

const getDataSourceLabel = (row: any): string => dataSourceMap[getDataSource(row)] || '手动录入';
const getDataSourceIcon = (row: any): string => {
  const source = getDataSource(row);
  const icons: Record<string, string> = {
    manual: 'edit',
    import: 'upload',
    api: 'cloud',
    ai: 'lightbulb'
  };
  return icons[source] || 'edit';
};

// 批量操作
const handleSelectChange = (value: Array<string | number>, { selectedRowData }: { selectedRowData: Material[]; }) => {
  selectedRowKeys.value = value;
  selectedRows.value = selectedRowData;
};

const clearSelection = () => {
  selectedRowKeys.value = [];
  selectedRows.value = [];
};

const handleBatchDelete = async () => {
  const count = selectedRows.value.length;
  try {
    for (const m of selectedRows.value) {
      await materialStore.deleteMaterial(m.id);
    }
    MessagePlugin.success(`成功删除 ${count} 个原料`);
    clearSelection();
  } catch {
    MessagePlugin.error('批量删除失败');
  }
};

const handleBatchExport = () => {
  if (selectedRows.value.length === 0) return;
  MessagePlugin.success(`已选择 ${selectedRows.value.length} 个原料进行导出`);
  clearSelection();
};

const columns = [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'name', title: '原料信息', width: 180, sorter: (a: any, b: any) => a.name.localeCompare(b.name, 'zh') },
  { colKey: 'dataSource', title: '数据源', width: 100, align: 'center' },
  { colKey: 'materialType', title: '类型', width: 100, align: 'center', sorter: (a: any, b: any) => (a.materialType || '').localeCompare(b.materialType || '') },
  { colKey: 'unit', title: '单位', width: 80, align: 'center' },
  { colKey: 'stock', title: '库存', width: 100, sorter: (a: any, b: any) => (a.stock || 0) - (b.stock || 0) },
  { colKey: 'nutrition', title: '营养', width: 110, align: 'center' },
  { colKey: 'createdAt', title: '创建时间', width: 160, sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
  { colKey: 'operation', title: '操作', width: 120, align: 'center', className: 'operation-col-center' }
];

const pagination = computed(() => ({
  current: materialStore.currentPage,
  pageSize: materialStore.pageSize,
  total: materialStore.total,
  onChange: (pageInfo: any) => {
    materialStore.setPage(pageInfo.current);
    loadMaterials();
  }
}));

const totalPages = computed(() => Math.ceil(materialStore.total / materialStore.pageSize) || 1);
const pageNumbers = computed<(number | string)[]>(() => {
  const total = totalPages.value;
  const current = materialStore.currentPage;
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current - 1, current, current + 1, '...', total];
});

// 底部活动数据
interface ActivityItem { type: 'success' | 'warning' | 'info'; title: string; desc: string; time: string; }

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const allActivityItems = computed<ActivityItem[]>(() => {
  const list = materialStore.materials;
  if (!list || list.length === 0) return [];

  const items: ActivityItem[] = [];
  const events: { m: typeof list[0]; action: 'created' | 'updated'; time: string; }[] = [];

  for (const m of list) {
    const created = new Date(m.createdAt).getTime();
    const updated = new Date(m.updatedAt).getTime();
    if (updated > created) {
      events.push({ m, action: 'updated', time: m.updatedAt });
    }
    events.push({ m, action: 'created', time: m.createdAt });
  }

  events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  for (let i = 0; i < events.length; i++) {
    const { m, action, time } = events[i];
    const type = m.materialType === 'supplement' ? 'warning' : 'success';
    const typeName = m.materialType === 'supplement' ? '辅料' : '药材';
    const timeAgo = formatTimeAgo(time);

    if (action === 'created') {
      items.push({
        type,
        title: `新录入：${m.name}`,
        desc: `<strong>${m.name}</strong> 已加入原料库（${typeName}），编码 <span class="text-emerald-600 font-bold">${m.code}</span>，当前库存 ${m.stock}${m.unit}`,
        time: timeAgo
      });
    } else {
      items.push({
        type: 'info',
        title: `信息更新：${m.name}`,
        desc: `<strong>${m.name}</strong> 原料信息已更新，编码 <span class="text-emerald-600 font-bold">${m.code}</span>，当前库存 ${m.stock}${m.unit}`,
        time: timeAgo
      });
    }

    if (items.length >= 20) break;
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
  const total = materialStore.total;
  if (total === 0) return '您还没有录入任何原料，点击下方按钮开始建立您的原料库吧！';
  if (total < 10) return `当前共有 ${total} 种原料在库，建议继续丰富原料种类。`;
  return `当前共有 ${total} 种原料在库，建议定期检查营养数据和库存状态。`;
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

onMounted(() => {
  window.addEventListener('global-search', handleGlobalSearch);
  paginationStore.register(pagination.value);
  watch(pagination, (val) => paginationStore.update(val), { deep: true });
  loadMaterials();
});

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch);
  paginationStore.unregister();
});

const loadMaterials = async () => {
  await materialStore.fetchMaterials();
  initialized.value = true;
  loadNutritionStatus();
};

const loadNutritionStatus = async () => {
  const materials = materialStore.materials;
  if (!materials.length) return;
  const map: Record<string, string> = {};
  const promises = materials.map(async (m: Material) => {
    try {
      const res = await nutritionApi.getMaterialNutrition(m.id) as any;
      if (res?.per100g) {
        const count = Object.keys(res.per100g).filter(k => res.per100g[k] > 0).length;
        if (count > 0) map[m.id] = `${count}`;
      }
    } catch { /* no data */ }
  });
  await Promise.all(promises);
  nutritionMap.value = map;
};

const handleGlobalSearch = (e: Event) => {
  const keyword = (e as CustomEvent).detail || '';
  searchKeyword.value = keyword;
  materialStore.setKeyword(keyword);
  loadMaterials();
};

const handleRealTimeSearch = () => {
  materialStore.setKeyword(searchKeyword.value);
  materialStore.fetchMaterials();
};

// 监听 searchKeyword 变化后触发搜索（此时 v-model 已更新）
watch(searchKeyword, () => {
  handleRealTimeSearch();
});

const handleCreate = () => {
  router.push('/materials/new');
};

const handleView = (row: Material) => {
  router.push(`/materials/${row.id}`);
};

const handleEdit = (row: Material) => {
  router.push(`/materials/${row.id}/edit`);
};

const handleDelete = async (row: Material) => {
  try {
    const result = await materialStore.deleteMaterial(row.id);
    if (result.success) {
      MessagePlugin.success('删除成功');
      loadNutritionStatus();
    } else {
      MessagePlugin.error(result.message || '删除失败');
    }
  } catch (e) {
    MessagePlugin.error('删除失败');
  }
};
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.material-list {

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

  // ─── 内容卡片 ───
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
    }
  }

  // 展开行样式
  .expanded-content {
    padding: 24px 28px;
    background-color: #f8fafc;
    border-radius: 16px;
    border: 1px solid #e2e8f0;
    animation: expandRowFadeIn 0.3s ease both;

    .nutrition-section {
      .nutrition-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;

        h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 8px;

          &::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 20px;
            background: linear-gradient(180deg, #34d399, #10b981);
            border-radius: 2px;
          }
        }
      }
    }

    .nutrition-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .nutrition-item {
      padding: 16px 18px;
      background: #fff;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
      transition: all $transition-fast;
      position: relative;

      &:hover {
        border-color: #d1fae5;
        box-shadow: 0 2px 8px $overlay-emerald-08;
        transform: translateY(-2px);
      }

      &--highlight {
        border-color: #d1fae5;
        background: linear-gradient(135deg, #ffffff, #f0fdf4);

        .nutri-label {
          color: #059669;
        }

        .nutri-value {
          color: #047857;
        }
      }

      .nutri-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: #94a3b8;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
      }

      .nutri-value {
        display: block;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 22px;
        font-weight: 800;
        color: #334155;
        margin-bottom: 10px;

        .nutri-unit {
          font-size: 14px;
          font-weight: 500;
          color: #94a3b8;
          margin-left: 2px;
        }
      }

      .nutri-bar-track {
        width: 100%;
        height: 6px;
        background: #f1f5f9;
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: 6px;

        .nutri-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          background: linear-gradient(90deg, #34d399, #10b981);
        }
      }

      .nutri-percent {
        display: block;
        text-align: right;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 12px;
        font-weight: 600;
        color: #10b981;
      }
    }

    .empty-nutrition {
      text-align: center;
      padding: 48px 32px;
      color: #94a3b8;

      .t-icon {
        font-size: 40px;
        color: #cbd5e1;
        margin-bottom: 12px;
      }

      p {
        margin: 8px 0 0;
        font-size: 15px;
        font-weight: 500;
      }

      .empty-hint {
        font-size: 13px;
        color: #cbd5e1;
        margin-top: 8px;
      }
    }
  }

  // 工具栏
  .data-center-toolbar {
    padding: 32px;
    border-bottom: 1px solid #f8fafc;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    position: relative;

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

  // 批量操作栏
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
    border-radius: 0;
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

  .delete-info {
    color: #334155;
    font-size: 14px;
    margin-top: 8px;
    padding: 10px 12px;
    background: #f8fafc;
    border-radius: 8px;
    border-left: 3px solid #fecdd3;
  }

  // 表格样式
  :deep(.t-table) {
    border-radius: 16px !important;
    overflow: hidden;

    .t-table__header {
      position: sticky !important;
      top: 0 !important;
      z-index: 5 !important;
      background: #f8fafc !important;

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
        }

        &:last-child {
          text-align: right !important;
          padding-right: 24px !important;
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

        &.t-table__row--selected td {
          background-color: rgba(209, 250, 229, 0.55) !important;
          box-shadow: inset 3px 0 0 #10b981 !important;
        }

        td {
          padding: 18px 20px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          vertical-align: middle;

          &:first-child {
            padding-left: 24px !important;
          }

          &:last-child {
            text-align: right;
            padding-right: 24px !important;
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
  }
}

// 原料信息列
.material-info {
  display: flex;
  align-items: center;
  gap: 16px;

  .material-avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 12px;
    text-transform: uppercase;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  }

  .material-details {
    .material-name {
      font-weight: 700;
      color: #334155;
      font-size: 14px;
      margin: 0 0 4px 0;
    }

    .material-code {
      font-size: 12px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: -0.05em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      margin: 0;
    }
  }
}

// 库存值
.stock-value {
  font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #334155;

  &.stock-low {
    color: #ef4444;
  }
}

// 营养空标签
.nutrition-empty {
  color: #cbd5e1;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

// 数据源tag
.data-source-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  transition: all $transition-fast;

  .t-icon {
    font-size: 14px;
  }

  &--manual {
    background-color: #EFF6FF;
    color: #3B82F6;
  }

  &--import {
    background-color: #F0FDF4;
    color: #10B981;
  }

  &--api {
    background-color: #FFFBEB;
    color: #F59E0B;
  }

  &--ai {
    background-color: #FAF5FF;
    color: #A855F7;
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;

  .action-btn {
    padding: 8px;
    border-radius: 8px;
    color: #94a3b8;
    transition: all $transition-fast;
    background: transparent;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;

    &:hover {
      transform: translateY(-1px);
    }

    &.view-btn:hover {
      color: #10b981;
      background-color: rgba(209, 250, 229, 0.50);
    }

    &.edit-btn:hover {
      color: #3b82f6;
      background-color: rgba(219, 234, 254, 0.50);
    }

    &.delete-btn:hover {
      color: #ef4444;
      background-color: rgba(254, 226, 226, 0.50);
    }

    .t-icon {
      font-size: 18px;
    }
  }
}

// 分页样式
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

// 活动区域
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
    background: linear-gradient(135deg, #34d399, #14b8a6);
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

  :deep(.text-amber-600) {
    color: #d97706 !important;
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

.assistant-content {
  position: relative;
  z-index: 10;
}

.assistant-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 16px 0;
  color: #fff;
}

.assistant-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.7;
  margin: 0 0 24px 0;
}

.assistant-btn {
  width: 100%;
  padding: 12px;
  background-color: #fff;
  color: #059669;
  font-weight: 700;
  border-radius: 16px;
  border: none;
  cursor: pointer;
  transition: all $transition-fast;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);

  &:hover {
    background-color: #ecfdf5;
  }
}

.assistant-footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: rgba(209, 250, 229, 1);
}

.assistant-avatar-group {
  display: flex;

  .assistant-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.3);
    border: 2px solid #34d399;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 600;
    margin-left: -8px;

    &:first-child {
      margin-left: 0;
    }
  }
}

.assistant-hint {
  font-size: 12px;
  white-space: nowrap;
}

.assistant-bg-icon {
  position: absolute;
  right: -32px;
  bottom: -32px;
  width: 12rem;
  height: 12rem;
  opacity: 0.1;
  transform: rotate(12deg);
  color: currentColor;
  pointer-events: none;
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

.batch-bar-slide-enter-active,
.batch-bar-slide-leave-active {
  transition: all $transition-slow;
}

.batch-bar-slide-enter-from,
.batch-bar-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media screen and (max-width: 1024px) {
  .material-list .dashboard-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .material-list .expanded-content .nutrition-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .material-list .dashboard-grid {
    grid-template-columns: 1fr;
    gap: 16px;
    margin-bottom: 24px;
  }

  .material-list .expanded-content .nutrition-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<style>
@use '@/assets/styles/variables.scss' as *;

.material-list .content-card .t-table,
.material-list .content-card .t-table .t-table__body-wrapper,
.material-list .content-card .t-table .t-table__body-inner,
.material-list .content-card .t-table .t-table__body {
  background: #fff !important;
}

.material-list .content-card .t-table .t-table__body tr,
.material-list .content-card .t-table .t-table__body .t-table__row {
  background-color: #fff !important;
}

.material-list .content-card .t-table .t-table__body td,
.material-list .content-card .t-table .t-table__body .t-table__row td,
.material-list .content-card .t-table .t-table__body .t-table__row.t-table__row--hover td {
  background-color: transparent !important;
  border-bottom-color: #f1f5f9 !important;
  color: #334155 !important;
  box-shadow: none !important;
}

.material-list .content-card .t-table .t-table__body tr:hover>td,
.material-list .content-card .t-table .t-table__body .t-table__row:hover>td {
  background-color: rgba(209, 250, 229, 0.35) !important;
}

.material-list .content-card .t-table .t-table__body tr:hover>td:first-child,
.material-list .content-card .t-table .t-table__body .t-table__row:hover>td:first-child {
  box-shadow: inset 3px 0 0 #34d399 !important;
}

.material-list .content-card .t-table .t-table__body .t-table__row.t-table__row--selected>td {
  background-color: rgba(209, 250, 229, 0.6) !important;
  box-shadow: inset 3px 0 0 #10b981 !important;
}

.material-list .content-card .t-table .t-table__header th {
  background: #f8fafc !important;
  color: #64748b !important;
}

/* 操作列和数据列居中对齐 */
.material-list .content-card .t-table .t-table__header th[col-data-index="operation"],
.material-list .content-card .t-table .t-table__header th[col-data-index="materialType"],
.material-list .content-card .t-table .t-table__header th[col-data-index="unit"],
.material-list .content-card .t-table .t-table__header th[col-data-index="nutrition"],
.material-list .content-card .t-table .t-table__header th[col-data-index="dataSource"] {
  text-align: center !important;
}

.material-list .content-card .t-table .t-table__body td[data-colkey="operation"],
.material-list .content-card .t-table .t-table__body td[data-colkey="materialType"],
.material-list .content-card .t-table .t-table__body td[data-colkey="unit"],
.material-list .content-card .t-table .t-table__body td[data-colkey="nutrition"],
.material-list .content-card .t-table .t-table__body td[data-colkey="dataSource"] {
  text-align: center !important;
  vertical-align: middle !important;
}

/* 操作列居中 - 使用 className 选择器 */
.material-list .operation-col-center {
  text-align: center !important;
}

.material-list :deep(.operation-col-center) {
  text-align: center !important;
  justify-content: center !important;
}

/* 操作按钮容器强制居中 */
.material-list .action-buttons {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}
</style>
