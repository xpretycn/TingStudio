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
                  <t-popconfirm theme="danger" :content="`确定要删除所选的 ${selectedRows.length} 个原料吗？删除后无法恢复。`"
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
            <button class="add-formula-btn" @click="handleRefreshList" title="刷新列表" aria-label="刷新原料列表">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
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
          row-key="id" hover table-layout="auto" :expanded-row-keys="expandedRowKeys" @expand-change="onExpandChange"
          @row-click="handleRowClick" @select-change="handleSelectChange" :selected-row-keys="selectedRowKeys">
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

          <template #version="{ row }">
            <div class="version-cell">
              <t-tag
                :theme="row.isLatest ? 'success' : 'default'"
                variant="light"
                size="small"
                style="cursor: pointer;"
                @click.stop="handleViewVersions(row)"
              >
                v{{ row.version }}
              </t-tag>
              <t-tooltip :content="`共 ${row.totalVersions} 个版本`" v-if="row.totalVersions > 1">
                <span class="version-count" @click.stop="handleViewVersions(row)">· {{ row.totalVersions }}版</span>
              </t-tooltip>
            </div>
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

          <template #createdAt="{ row }">
            <span v-if="row.createdAt" class="date-cell">{{ formatDateCell(row.createdAt) }}</span>
            <span v-else class="text-muted">—</span>
          </template>

          <template #unitPrice="{ row }">
            <span v-if="row.unitPrice != null" class="mat-price-cell">¥{{ Number(row.unitPrice).toFixed(2) }}</span>
            <span v-else class="mat-price-cell mat-price-empty">--</span>
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
                <button class="empty-add-btn" @click="handleCreate">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  录入第一个原料
                </button>
              </template>
            </t-empty>
          </template>

          <template #operation="{ row }">
            <div class="action-buttons" role="group" aria-label="原料操作">
              <button class="action-btn view-btn" @click.stop="handleViewVersions(row)" title="版本历史"
                :aria-label="`查看${row.name}的版本历史`">
                <t-icon name="layers" />
              </button>
              <button v-if="row.isOwner || isAdmin" class="action-btn edit-btn" @click.stop="handleEdit(row)" title="编辑"
                :aria-label="`编辑原料${row.name}`">
                <t-icon name="edit-1" />
              </button>
              <t-popconfirm v-if="isAdmin" theme="danger" :content="`确定要删除原料「${row.name}」吗？`" @confirm="handleDelete(row)">
                <button class="action-btn delete-btn" title="删除" :aria-label="`删除原料${row.name}`" @click.stop>
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
        <div class="assistant-header">
          <h4 class="assistant-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 7h-9" />
              <path d="M14 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-3" />
              <circle cx="9" cy="11" r="2" />
            </svg>
            原料管理助手
          </h4>
          <div class="assistant-nav" v-if="matTodoTotalPages > 1">
            <button class="activity-nav-btn" :disabled="matTodoPage <= 1" @click="matTodoPrev" title="上一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="activity-nav-page">{{ matTodoPage }} / {{ matTodoTotalPages }}</span>
            <button class="activity-nav-btn" :disabled="matTodoPage >= matTodoTotalPages" @click="matTodoNext"
              title="下一页">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>

        <div class="todo-list" v-if="paginatedMatTodoItems.length > 0">
          <TransitionGroup name="todo-list" tag="div" class="todo-list__inner">
            <div v-for="item in paginatedMatTodoItems" :key="item.id" class="todo-item"
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
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
              <div class="todo-item__content">
                <p class="todo-item__title">{{ item.title }}</p>
                <p class="todo-item__desc">{{ item.desc }}</p>
              </div>
              <button class="todo-item__action" @click="handleMatTodoAction(item)" :title="item.actionText">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </TransitionGroup>
        </div>

        <div class="assistant-empty" v-else>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-light)" stroke-width="1.5"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <p>太棒了！暂无待处理事项</p>
          <span>所有原料数据完整，继续保持~</span>
        </div>

        <div class="assistant-footer">
          <span class="assistant-hint">{{ materialStore.total }} 种原料在库 · 共 {{ displayMatPendingItems.length }}
            项待办</span>
          <button class="assistant-refresh-btn" @click="refreshMatPending" title="刷新">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
          </button>
        </div>

        <svg class="assistant-bg-icon" width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round">
          <path
            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>
    </section>


  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, onActivated, watch, nextTick, h } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useMaterialStore } from '@/stores/material';
import { usePaginationStore } from '@/stores/pagination';
import { useAuthStore } from '@/stores/auth';
import { nutritionApi } from '@/api/nutrition';
import { MessagePlugin } from 'tdesign-vue-next';
import type { Material } from '@/api/material';
import { materialApi } from '@/api/material';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';

const router = useRouter();
const route = useRoute();
const materialStore = useMaterialStore();
const paginationStore = usePaginationStore();
const authStore = useAuthStore();

const isAdmin = computed(() => authStore.user?.role === "admin");

const initialized = ref(false);

const searchKeyword = ref('');
const nutritionMap = ref<Record<string, string>>({});
const expandedNutrition = ref<Record<string, Record<string, number>>>({});
const selectedRowKeys = ref<(string | number)[]>([]);
const selectedRows = ref<Material[]>([]);
const sortKey = ref<string>('');
const sortOrder = ref<'asc' | 'desc' | ''>('');
const sortedMaterials = ref<Material[]>([]);
const expandedRowKeys = ref<(string | number)[]>([]);

// ─── 数据看板（使用数据库全量统计）───
const stats = ref({ total: 0, herbCount: 0, supplementCount: 0, nutritionCount: 0 });

const fetchStats = async () => {
  try {
    const res = await materialApi.getStats();
    stats.value = res;
  } catch (e) {
    console.error('获取原料统计数据失败', e);
  }
};

const dashboardCards = computed(() => {
  const { total, herbCount, supplementCount } = stats.value;
  const nutritionCount = Object.keys(nutritionMap.value).length;

  return [
    {
      label: '原料库总量',
      value: total.toLocaleString(),
      unit: '种',
      badge: `${total > 0 ? '+' + Math.min(total, 99) : 0}`,
      badgeColor: 'var(--color-primary)',
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
      badgeColor: 'var(--color-primary-dark)',
      badgeBg: 'var(--color-primary-bg)',
      iconBg: '#FFFBEB',
      iconColor: 'var(--color-warning)',
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
      badgeColor: nutritionCount >= total ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: nutritionCount >= total ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
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
    sortedMaterials.value = [...materialStore.materials];
    return;
  }
  const dir = sortOrder.value === 'desc' ? -1 : 1;

  const sortFns: Record<string, (a: any, b: any) => number> = {
    name: (a, b) => a.name.localeCompare(b.name, 'zh'),
    materialType: (a, b) => (a.materialType || '').localeCompare(b.materialType || ''),
    unitPrice: (a, b) => (a.unitPrice ?? 0) - (b.unitPrice ?? 0),
    stock: (a, b) => (a.stock || 0) - (b.stock || 0),
    dataSource: (a, b) => (a.dataSource || 'manual').localeCompare(b.dataSource || 'manual'),
    createdAt: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  };

  const fn = sortFns[sortKey.value];
  sortedMaterials.value = fn
    ? [...materialStore.materials].sort((a, b) => fn(a, b) * dir)
    : [...materialStore.materials];
};

watch(() => materialStore.materials, (val) => {
  console.log('[MaterialList] materials watcher, count=', val.length);
  if (sortKey.value && sortOrder.value) {
    applySort();
  } else {
    sortedMaterials.value = [...val];
  }
}, { immediate: true });

// 展开行
const onExpandChange = (keys: Array<string | number>) => {
  expandedRowKeys.value = keys;
  const newKeys = keys.filter(k => !expandedNutrition.value[String(k)]);
  newKeys.forEach(key => {
    const row = materialStore.materials.find((m: any) => String(m.id) === String(key));
    if (row) loadExpandedNutrition(row);
  });
};

const getExpandedNutrition = (row: any): Record<string, number> => {
  if (!row?.id) return {};
  return expandedNutrition.value[row.id] || {};
};

const loadExpandedNutrition = async (row: any) => {
  if (!row?.id) return;
  if (expandedNutrition.value[row.id]) return;
  try {
    const res = await nutritionApi.getMaterialNutrition(row.id, true) as any;
    const per100g = res?.per100g || res?.data?.per100g || {};
    if (Object.keys(per100g).length > 0) {
      expandedNutrition.value[row.id] = per100g;
    }
  } catch {
    // API无数据时不设置，展开行显示空状态
  }
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

// 数据源相关（真实数据）
const dataSourceMap: Record<string, string> = {
  'manual': '手动录入',
  'batch_import': '批量导入',
  'api_sync': 'API同步',
};

const getDataSource = (row: any): string => row.dataSource || 'manual';

const getDataSourceLabel = (row: any): string => dataSourceMap[getDataSource(row)] || '手动录入';
const getDataSourceIcon = (row: any): string => {
  const source = getDataSource(row);
  const icons: Record<string, string> = {
    manual: 'edit',
    batch_import: 'upload',
    api_sync: 'cloud',
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
  if (selectedRows.value.length === 0) return;
  const count = selectedRows.value.length;
  let successCount = 0;
  const failedNames: string[] = [];
  for (const m of selectedRows.value) {
    try {
      await materialStore.deleteMaterial(m.id);
      successCount++;
    } catch (err: any) {
      failedNames.push(m.name || m.id);
    }
  }
  if (failedNames.length === 0) {
    MessagePlugin.success(`成功删除 ${count} 个原料`);
  } else if (successCount > 0) {
    MessagePlugin.warning(`成功删除 ${successCount} 个，${failedNames.length} 个删除失败`);
  } else {
    MessagePlugin.error('删除失败，所选原料可能已被配方引用');
  }
  clearSelection();
  await Promise.all([materialStore.fetchMaterials(), materialStore.fetchAllForSelect()]);
  loadNutritionStatus();
};

const handleBatchExport = () => {
  if (selectedRows.value.length === 0) return;
  MessagePlugin.success(`已选择 ${selectedRows.value.length} 个原料进行导出`);
  clearSelection();
};

const columns = computed(() => [
  { colKey: 'row-select', type: 'multiple', width: 50, resizable: false },
  { colKey: 'name', title: sortTitle('原料信息', 'name'), width: 180 },
  { colKey: 'version', title: '版本', width: 100, align: 'center' },
  { colKey: 'dataSource', title: sortTitle('数据源', 'dataSource'), width: 120, align: 'center' },
  { colKey: 'materialType', title: sortTitle('类型', 'materialType'), width: 100, align: 'center' },
  { colKey: 'unitPrice', title: sortTitle('单价(元/kg)', 'unitPrice'), width: 120, align: 'center' },
  { colKey: 'nutrition', title: '营养', width: 110, align: 'center' },
  { colKey: 'stock', title: sortTitle('库存', 'stock'), width: 100, align: 'center' },
  { colKey: 'createdAt', title: sortTitle('创建时间', 'createdAt'), width: 160 },
  { colKey: 'operation', title: '操作', width: 150, align: 'center', className: 'operation-col-center' }
]);

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
  const list = materialStore.allMaterials;
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
      const hasPrice = m.unitPrice != null && m.unitPrice > 0;
      items.push({
        type: hasPrice ? 'warning' : 'info',
        title: hasPrice ? `单价更新：${m.name}` : `信息更新：${m.name}`,
        desc: hasPrice
          ? `<strong>${m.name}</strong>（${typeName}，编码 <span class="text-blue-600">${m.code}</span>）单价更新为 <span class="text-amber-600 font-bold">¥${m.unitPrice}/kg</span>`
          : `<strong>${m.name}</strong> 原料信息已更新，编码 <span class="text-emerald-600 font-bold">${m.code}</span>，当前库存 ${m.stock}${m.unit}`,
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

interface MatTodoItem {
  id: string;
  type: 'warning' | 'info' | 'default';
  priority: 'high' | 'medium' | 'low';
  title: string;
  desc: string;
  actionText: string;
  actionType: 'edit' | 'view' | 'create';
  materialId?: string;
}

const displayMatPendingItems = computed<MatTodoItem[]>(() => {
  const items: MatTodoItem[] = [];
  const materials = materialStore.materials || [];

  for (const m of materials) {
    if (!m.unitPrice && m.unitPrice !== 0) {
      items.push({
        id: `noprice-${m.id}`,
        type: 'warning',
        priority: 'high',
        title: '单价未录入',
        desc: `「${m.name}」尚未设置单价信息`,
        actionText: '去编辑',
        actionType: 'edit',
        materialId: m.id
      });
    }

    if (!m.nutrition || Object.keys(m.nutrition || {}).length === 0) {
      items.push({
        id: `nonutri-${m.id}`,
        type: 'info',
        priority: 'medium',
        title: '营养素缺失',
        desc: `「${m.name}」营养素数据为空`,
        actionText: '去补充',
        actionType: 'edit',
        materialId: m.id
      });
    }

    if (m.stock != null && m.stock < 50 && m.stock > 0) {
      items.push({
        id: `lowstock-${m.id}`,
        type: 'warning',
        priority: 'low',
        title: '库存偏低',
        desc: `「${m.name}」仅剩 ${m.stock} ${m.unit || 'g'}`,
        actionText: '查看详情',
        actionType: 'view',
        materialId: m.id
      });
    }
  }

  if (materials.length === 0) {
    // 无数据时不显示模拟提醒
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return items.slice(0, 8);
});

const MAT_TODO_PAGE_SIZE = 3;
const matTodoPage = ref(1);

const matTodoTotalPages = computed(() => Math.max(1, Math.ceil(displayMatPendingItems.value.length / MAT_TODO_PAGE_SIZE)));

const paginatedMatTodoItems = computed(() => {
  const start = (matTodoPage.value - 1) * MAT_TODO_PAGE_SIZE;
  return displayMatPendingItems.value.slice(start, start + MAT_TODO_PAGE_SIZE);
});

const matTodoPrev = () => { if (matTodoPage.value > 1) matTodoPage.value--; };
const matTodoNext = () => { if (matTodoPage.value < matTodoTotalPages.value) matTodoPage.value++; };

const handleMatTodoAction = (item: MatTodoItem) => {
  switch (item.actionType) {
    case 'edit':
      if (item.materialId) handleEdit({ id: item.materialId } as Material);
      break;
    case 'view':
      if (item.materialId) handleView({ id: item.materialId } as Material);
      break;
    case 'create':
      handleCreate();
      break;
  }
};

const refreshMatPending = () => {
  materialStore.fetchMaterials();
};

const handleRefreshList = () => {
  searchKeyword.value = '';
  materialStore.clearKeyword();
  router.replace({ query: {} });
  loadMaterials();
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

onMounted(async () => {
  window.addEventListener('global-search', handleGlobalSearch);
  paginationStore.register(pagination.value);
  watch(pagination, (val) => paginationStore.update(val), { deep: true });

  // 从路由查询参数恢复搜索关键字（在加载数据之前）
  if (route.query.keyword) {
    const keyword = route.query.keyword as string;
    // 设置标志位，防止 watch 触发重复搜索
    isRestoringFromRoute = true;
    searchKeyword.value = keyword;
    materialStore.setKeyword(keyword);
    // 等待 DOM 更新，确保输入框显示关键字
    await nextTick();
  } else if (materialStore.keyword) {
    // 路由无关键字但 store 有，同步到本地状态
    searchKeyword.value = materialStore.keyword;
  }

  loadMaterials();
  fetchStats();
});

// 处理 keep-alive 缓存的组件重新激活时恢复搜索状态
onActivated(async () => {
  if (route.query.keyword) {
    if (route.query.keyword !== searchKeyword.value) {
      const keyword = route.query.keyword as string;
      isRestoringFromRoute = true;
      searchKeyword.value = keyword;
      materialStore.setKeyword(keyword);
      await nextTick();
      materialStore.fetchMaterials();
    }
  } else {
    if (searchKeyword.value || materialStore.keyword) {
      searchKeyword.value = '';
      materialStore.clearKeyword();
      materialStore.fetchMaterials();
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('global-search', handleGlobalSearch);
  paginationStore.unregister();
});

const loadMaterials = async () => {
  await Promise.all([
    materialStore.fetchMaterials(),
    materialStore.fetchAllForSelect()
  ]);
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

  // 更新路由查询参数
  const query = { ...route.query };
  if (keyword) {
    query.keyword = keyword;
  } else {
    delete query.keyword;
  }
  router.replace({ query });

  loadMaterials();
};

const handleRealTimeSearch = () => {
  materialStore.setKeyword(searchKeyword.value);
  materialStore.fetchMaterials();

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
};

// 监听 searchKeyword 变化后触发搜索（仅在用户主动输入时触发）
let isRestoringFromRoute = false;
watch(searchKeyword, () => {
  // 如果正在从路由参数恢复，不触发搜索（避免重复请求）
  if (isRestoringFromRoute) {
    isRestoringFromRoute = false;
    return;
  }
  handleRealTimeSearch();
});

const handleCreate = () => {
  router.push('/materials/new');
};

const handleView = (row: Material) => {
  router.push({
    path: `/materials/${row.id}`,
    query: route.query
  });
};

const formatDateCell = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const datePart = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const timePart = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
  return `${datePart}\n${timePart}`;
};

const handleRowClick = (ctx: { row: Material; col?: { colKey: string; }; }) => {
  if (!ctx.col || ctx.col.colKey !== 'row-select') {
    handleView(ctx.row);
  }
};

const handleEdit = (row: Material) => {
  router.push({
    path: `/materials/${row.id}/edit`,
    query: route.query
  });
};

const handleViewVersions = (row: Material) => {
  router.push({
    path: `/materials/${row.id}/versions`,
    query: route.query
  });
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
  display: flex;
  flex-direction: column;
  gap: 16px;

  // ─── 数据看板 ───
  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    margin-bottom: 0;

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
        width: 100%;

        .stat-unit {
          font-size: 11px;
          font-weight: 400;
          color: var(--color-text-placeholder);
        }
      }
    }
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
    }

    :deep(.t-table__body .t-table__row) {
      animation: rowFadeIn 0.3s ease both;
      @include stagger-rows(20, 0.03s);
    }
  }

  // 展开行样式
  .expanded-content {
    padding: 24px var(--space-7);
    background-color: var(--color-bg-page);
    border-radius: 16px;
    border: 1px solid var(--color-border);
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
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          gap: 8px;

          &::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 20px;
            background: linear-gradient(180deg, var(--color-primary-light), var(--color-primary));
            border-radius: var(--radius-2xs);
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
      padding: 16px var(--space-4-5);
      background: #fff;
      border-radius: 12px;
      border: 1px solid #f1f5f9;
      transition: all $transition-fast;
      position: relative;

      &:hover {
        border-color: var(--color-primary-bg);
        box-shadow: 0 2px 8px $overlay-emerald-08;
        transform: translateY(-2px);
      }

      &--highlight {
        border-color: var(--color-primary-bg);
        background: linear-gradient(135deg, #ffffff, #f0fdf4);

        .nutri-label {
          color: var(--color-primary-dark);
        }

        .nutri-value {
          color: var(--color-primary-deep);
        }
      }

      .nutri-label {
        display: block;
        font-size: 11px;
        font-weight: 600;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: var(--space-1-5);
      }

      .nutri-value {
        display: block;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 22px;
        font-weight: 800;
        color: var(--color-text-primary);
        margin-bottom: var(--space-2-5);

        .nutri-unit {
          font-size: 14px;
          font-weight: 500;
          color: var(--color-text-placeholder);
          margin-left: var(--space-0-5);
        }
      }

      .nutri-bar-track {
        width: 100%;
        height: 6px;
        background: #f1f5f9;
        border-radius: 999px;
        overflow: hidden;
        margin-bottom: var(--space-1-5);

        .nutri-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          background: linear-gradient(90deg, var(--color-primary-light), var(--color-primary));
        }
      }

      .nutri-percent {
        display: block;
        text-align: right;
        font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
        font-size: 12px;
        font-weight: 600;
        color: var(--color-primary);
      }
    }

    .empty-nutrition {
      text-align: center;
      padding: 48px 32px;
      color: var(--color-text-placeholder);

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
    padding: 16px 32px;
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
  }

  // 批量操作栏
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

  .delete-info {
    color: var(--color-text-primary);
    font-size: 14px;
    margin-top: 8px;
    padding: var(--space-2-5) 12px;
    background: var(--color-bg-page);
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
      background: var(--color-bg-page) !important;

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
          box-shadow: inset 3px 0 0 var(--color-primary-light) !important;
        }

        &.t-table__row--selected td {
          background-color: rgba(209, 250, 229, 0.55) !important;
          box-shadow: inset 3px 0 0 var(--color-primary) !important;
        }

        td {
          padding: var(--space-4-5) 20px !important;
          border-bottom: 1px solid #f1f5f9 !important;
          vertical-align: middle;

          &:first-child {
            padding-left: 24px !important;
          }

          &:last-child {
            padding-right: 24px !important;

            &:not(.operation-col-center) {
              text-align: right;
            }
          }

          &.operation-col-center {
            text-align: center !important;
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
  gap: 8px;

  .material-avatar {
    width: 24px;
    height: 24px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 9px;
    text-transform: uppercase;
    box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    flex-shrink: 0;
  }

  .material-details {
    .material-name {
      font-weight: 600;
      color: var(--color-text-primary);
      font-size: 13px;
      margin: 0 0 1px 0;
    }

    .material-code {
      font-size: 11px;
      color: var(--color-text-placeholder);
      text-transform: uppercase;
      letter-spacing: -0.05em;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      margin: 0;
      line-height: 1;
    }
  }
}

// 库存值
.stock-value {
  font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);

  &.stock-low {
    color: var(--color-danger);
  }
}

.mat-price-cell {
  display: inline-block;
  text-align: center;
  font-family: ui-monospace, SFMono-Regular, 'Cascadia Code', monospace;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);

  &.mat-price-empty {
    font-weight: 400;
    color: var(--color-text-placeholder);
    font-family: inherit;
  }
}

.date-cell {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.4;
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: pre-line;
}

// 类型
.version-cell {
  display: flex;
  align-items: center;
  gap: var(--space-1-5);
  justify-content: center;

  .version-count {
    font-size: 11px;
    color: var(--color-text-placeholder);
    cursor: pointer;

    &:hover {
      color: var(--color-primary);
    }
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
  gap: var(--space-1-5);
  font-size: 12px;
  font-weight: 500;
  padding: 4px var(--space-2-5);
  border-radius: 999px;
  transition: all $transition-fast;

  .t-icon {
    font-size: 14px;
  }

  &--manual {
    background-color: #EFF6FF;
    color: #3B82F6;
  }

  &--batch_import {
    background-color: #F0FDF4;
    color: var(--color-primary);
  }

  &--api_sync {
    background-color: #FFFBEB;
    color: var(--color-warning);
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;

  .action-btn {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
    background: transparent;
    border: 1px solid transparent;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      transform: translateY(-1px);
      background: var(--color-bg-page);
      border-color: var(--color-border);
    }

    &.view-btn:hover {
      color: #8b5cf6;
      background: #f5f3ff;
      border-color: #ddd6fe;
    }

    &.edit-btn:hover {
      color: var(--color-primary);
      background: #ecfdf5;
      border-color: var(--color-primary-lightest);
    }

    &.delete-btn:hover {
      color: var(--color-danger);
      background: #fef2f2;
      border-color: #fecaca;
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

// 活动区域
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
    border: 1.5px solid $overlay-emerald-20;
    background: $overlay-emerald-04;
    color: var(--color-primary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover:not(:disabled) {
      background: $overlay-emerald-12;
      border-color: var(--color-primary);
      color: var(--color-primary-dark);
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
    background-color: var(--color-primary-bg);
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
    background-color: var(--color-primary);
  }

  .timeline-dot--warning & {
    background-color: var(--color-warning);
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
  color: var(--color-text-primary);
  margin: 0 0 4px 0;
}

.timeline-desc {
  font-size: 12px;
  color: var(--color-text-placeholder);
  margin: 0 0 4px 0;

  :deep(.text-emerald-600) {
    color: var(--color-primary-dark) !important;
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

// 小助手卡片 - 待处理事项
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

.assistant-nav {
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
  color: var(--color-text-primary) !important;
  box-shadow: none !important;
}

.material-list .content-card .t-table .t-table__body tr:hover>td,
.material-list .content-card .t-table .t-table__body .t-table__row:hover>td {
  background-color: rgba(209, 250, 229, 0.35) !important;
}

.material-list .empty-add-btn {
  display: inline-flex !important;
  align-items: center !important;
  gap: var(--space-1-5) !important;
  padding: var(--space-2-5) 20px !important;
  border-radius: 12px !important;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)) !important;
  color: #fff !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  border: none !important;
  cursor: pointer !important;
  transition: all $transition-normal !important;
  white-space: nowrap !important;

  &:hover:not(:disabled) {
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35) !important;
  }

  &:active:not(:disabled) {
    transform: translateY(0) !important;
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25) !important;
  }

  &:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
  }

  svg {
    flex-shrink: 0 !important;
  }
}

.material-list .content-card .t-table .t-table__body tr:hover>td:first-child,
.material-list .content-card .t-table .t-table__body .t-table__row:hover>td:first-child {
  box-shadow: inset 3px 0 0 var(--color-primary-light) !important;
}

.material-list .content-card .t-table .t-table__body .t-table__row.t-table__row--selected>td {
  background-color: rgba(209, 250, 229, 0.6) !important;
  box-shadow: inset 3px 0 0 var(--color-primary) !important;
}

.material-list .content-card .t-table .t-table__header th {
  background: var(--color-bg-page) !important;
  color: var(--color-text-secondary) !important;
}

/* 操作列和数据列居中对齐 */
.material-list .content-card .t-table .t-table__header th[col-data-index="operation"],
.material-list .content-card .t-table .t-table__header th[col-data-index="materialType"],
.material-list .content-card .t-table .t-table__header th[col-data-index="unit"],
.material-list .content-card .t-table .t-table__header th[col-data-index="nutrition"],
.material-list .content-card .t-table .t-table__header th[col-data-index="dataSource"] {
  text-align: center !important;
}

.material-list .content-card .t-table .t-table__body td.operation-col-center,
.material-list .content-card .t-table .t-table__body td[data-colkey="materialType"],
.material-list .content-card .t-table .t-table__body td[data-colkey="unit"],
.material-list .content-card .t-table .t-table__body td[data-colkey="nutrition"],
.material-list .content-card .t-table .t-table__body td[data-colkey="dataSource"] {
  text-align: center !important;
  vertical-align: middle !important;
}

/* 操作列强制居中 */
.material-list .operation-col-center {
  text-align: center !important;
}

.material-list .operation-col-center>div,
.material-list .action-buttons {
  display: flex !important;
  justify-content: center !important;
  align-items: center !important;
}

/* 自定义排序 */
.material-list .custom-sort-header {
  cursor: pointer;
  user-select: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.material-list .custom-sort-header:hover {
  color: var(--color-primary);
}

.material-list .custom-sort {
  display: inline-block;
  width: 0;
  height: 0;
  margin-left: var(--space-0-5);
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  opacity: 0.25;
  transition: all 0.2s;
}

.material-list .custom-sort--none {
  border-top: 5px solid var(--color-text-placeholder);
  border-bottom: none;
}

.material-list .custom-sort--asc {
  border-bottom: 5px solid var(--color-primary);
  border-top: none;
  opacity: 1;
}

.material-list .custom-sort--desc {
  border-top: 5px solid var(--color-primary);
  border-bottom: none;
  opacity: 1;
}
</style>
