<template>
  <div class="weekly-report" :aria-busy="!initialized">
    <Transition name="content-fade" mode="out-in">
      <div :key="initialized ? 'content' : 'skeleton'">
        <PageSkeleton v-if="!initialized && !loadError" type="detail" :rows="5" :columns="7" />

        <template v-else>
          <div v-if="loadError" class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <h3 class="error-title">数据加载失败</h3>
            <p class="error-desc">{{ loadError }}</p>
            <button class="retry-btn" @click="retryLoad">
              <t-icon name="refresh" />
              重新加载
            </button>
          </div>

          <template v-else>
            <header class="detail-header">
              <div class="header-left">
                <button class="header-back-btn" @click="goBack" title="返回报告列表">
                  <t-icon name="arrow-left" />
                </button>
                <div class="header-title-group">
                  <nav class="header-breadcrumb">
                    <a class="breadcrumb-link" @click="goBack">报告中心</a>
                    <t-icon name="chevron-right" class="breadcrumb-sep" />
                    <span class="breadcrumb-current">周报详情</span>
                  </nav>
                  <h2 class="detail-title">
                    {{ report?.title || '周报详情' }}
                    <span class="version-tag" v-if="report?.status">{{ statusLabel }}</span>
                  </h2>
                </div>
              </div>
              <div class="header-actions">
                <button class="header-action-btn" @click="handleEdit">
                  <t-icon name="edit" class="btn-icon" />
                  编辑
                </button>
                <button v-if="report?.status === 'draft'" class="header-action-btn header-action-btn--publish"
                  @click="handlePublish">
                  <t-icon name="check-circle" class="btn-icon" />
                  发布
                </button>
                <button class="header-action-btn" @click="handleExportPDF">
                  <t-icon name="file-pdf" class="btn-icon" />
                  导出 PDF
                </button>
                <button class="header-action-btn" @click="handleExportExcel">
                  <t-icon name="file-excel" class="btn-icon" />
                  导出 Excel
                </button>
              </div>
            </header>

            <section class="dashboard-section">
              <div class="dashboard-grid">
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
              </div>
            </section>

            <div class="report-sections">
              <div class="report-section-card" :style="{ borderLeftColor: '#3B82F6' }">
                <div class="section-header">
                  <div class="section-title-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <h3 class="section-title">配方完成情况</h3>
                  </div>
                </div>
                <div class="section-body">
                  <div v-if="hasFormulaData" class="chart-row">
                    <div v-if="dailyFormulaTrendOption" class="chart-container" style="flex: 60%;">
                      <div :ref="setChartRef('dailyFormulaTrend')" style="width:100%; height:300px;"></div>
                    </div>
                    <div v-else class="chart-empty-state" style="flex: 60%;">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                        stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                        <rect x="3" y="12" width="4" height="9" rx="1" />
                        <rect x="10" y="8" width="4" height="13" rx="1" />
                        <rect x="17" y="4" width="4" height="17" rx="1" />
                      </svg>
                      <p class="empty-title">暂无数据</p>
                      <p class="empty-subtitle">当有数据时将自动展示图表</p>
                    </div>
                    <div v-if="statusDistributionOption" class="chart-container" style="flex: 40%;">
                      <div :ref="setChartRef('statusDistribution')" style="width:100%; height:300px;"></div>
                    </div>
                    <div v-else class="chart-empty-state" style="flex: 40%;">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                        stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                        <rect x="3" y="12" width="4" height="9" rx="1" />
                        <rect x="10" y="8" width="4" height="13" rx="1" />
                        <rect x="17" y="4" width="4" height="17" rx="1" />
                      </svg>
                      <p class="empty-title">暂无数据</p>
                      <p class="empty-subtitle">当有数据时将自动展示图表</p>
                    </div>
                  </div>
                  <div v-else class="section-empty-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                      <rect x="3" y="12" width="4" height="9" rx="1" />
                      <rect x="10" y="8" width="4" height="13" rx="1" />
                      <rect x="17" y="4" width="4" height="17" rx="1" />
                    </svg>
                    <p class="section-empty-title">暂无配方数据</p>
                    <p class="section-empty-subtitle">当有配方数据时将自动展示分析图表</p>
                    <button class="section-empty-action" @click="retryLoad">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      刷新数据
                    </button>
                  </div>
                  <div class="stat-indicators" v-if="hasFormulaData && formulaIndicators">
                    <div class="stat-indicator" v-for="item in formulaIndicators" :key="item.label">
                      <span class="indicator-label">{{ item.label }}</span>
                      <span class="indicator-value">{{ item.value }} <small v-if="item.unit" class="indicator-unit">{{
                        item.unit }}</small></span>
                    </div>
                  </div>
                  <div class="section-text" v-if="reportData?.formulaSummary">
                    {{ reportData.formulaSummary }}
                  </div>
                </div>
              </div>

              <div class="report-section-card" :style="{ borderLeftColor: 'var(--color-primary)' }">
                <div class="section-header">
                  <div class="section-title-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <h3 class="section-title">销售数据统计</h3>
                  </div>
                </div>
                <div class="section-body">
                  <template v-if="hasSalesData">
                    <div class="chart-row">
                      <div v-if="dailySalesTrendOption" class="chart-container" style="flex: 60%;">
                        <div :ref="setChartRef('dailySalesTrend')" style="width:100%; height:300px;"></div>
                      </div>
                      <div v-else class="chart-empty-state" style="flex: 60%;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                          <rect x="3" y="12" width="4" height="9" rx="1" />
                          <rect x="10" y="8" width="4" height="13" rx="1" />
                          <rect x="17" y="4" width="4" height="17" rx="1" />
                        </svg>
                        <p class="empty-title">暂无数据</p>
                        <p class="empty-subtitle">当有数据时将自动展示图表</p>
                      </div>
                      <div v-if="topFormulasOption" class="chart-container" style="flex: 40%;">
                        <div :ref="setChartRef('topFormulas')" style="width:100%; height:300px;"></div>
                      </div>
                      <div v-else class="chart-empty-state" style="flex: 40%;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                          <rect x="3" y="12" width="4" height="9" rx="1" />
                          <rect x="10" y="8" width="4" height="13" rx="1" />
                          <rect x="17" y="4" width="4" height="17" rx="1" />
                        </svg>
                        <p class="empty-title">暂无数据</p>
                        <p class="empty-subtitle">当有数据时将自动展示图表</p>
                      </div>
                    </div>
                    <div class="chart-row" style="margin-top: 20px;">
                      <div v-if="weeklyComparisonOption" class="chart-container" style="flex: 100%;">
                        <div :ref="setChartRef('weeklyComparison')" style="width:100%; height:300px;"></div>
                      </div>
                      <div v-else class="chart-empty-state" style="flex: 100%;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                          <rect x="3" y="12" width="4" height="9" rx="1" />
                          <rect x="10" y="8" width="4" height="13" rx="1" />
                          <rect x="17" y="4" width="4" height="17" rx="1" />
                        </svg>
                        <p class="empty-title">暂无数据</p>
                        <p class="empty-subtitle">当有数据时将自动展示图表</p>
                      </div>
                    </div>
                  </template>
                  <div v-else class="section-empty-state">
                    <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                      stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <p class="section-empty-title">暂无销售数据</p>
                    <p class="section-empty-subtitle">当有销售数据时将自动展示分析图表</p>
                    <button class="section-empty-action" @click="retryLoad">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                        stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      刷新数据
                    </button>
                  </div>
                  <div class="stat-indicators" v-if="hasSalesData && salesIndicators">
                    <div class="stat-indicator" v-for="item in salesIndicators" :key="item.label">
                      <span class="indicator-label">{{ item.label }}</span>
                      <span class="indicator-value">{{ item.value }} <small v-if="item.unit" class="indicator-unit">{{
                        item.unit
                      }}</small></span>
                    </div>
                  </div>
                  <div class="section-text" v-if="reportData?.salesSummary">
                    {{ reportData.salesSummary }}
                  </div>
                </div>
              </div>

              <div ref="futurePlansRef" class="report-section-card" :class="{ 'editing-overflow': isEditingPlans }"
                :style="{ borderLeftColor: '#8B5CF6' }">
                <div class="section-header" @click="plansExpanded = !plansExpanded" style="cursor: pointer;">
                  <div class="section-title-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <h3 class="section-title">未来规划</h3>
                  </div>
                  <div class="header-right-actions">
                    <t-button v-if="!isEditingPlans" variant="text" theme="primary" size="small" @click.stop="startEditPlans">
                      <template #icon><t-icon name="edit-1" /></template>
                      编辑
                    </t-button>
                    <div v-else class="edit-actions" @click.stop>
                    <t-button variant="text" size="small" theme="primary" @click="savePlans">
                      <template #icon><t-icon name="check" /></template>
                      保存
                    </t-button>
                    <t-button variant="text" size="small" @click="cancelEditPlans">
                      <template #icon><t-icon name="close" /></template>
                      取消
                    </t-button>
                    </div>
                    <svg :class="{ 'collapse-icon': true, 'collapsed': !plansExpanded }" width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="var(--color-text-placeholder)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" @click.stop="plansExpanded = !plansExpanded">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </div>
              <div class="section-body" :class="{ 'editing-mode': isEditingPlans }" v-show="plansExpanded || isEditingPlans">
                  <template v-if="isEditingPlans">
                    <div class="edit-field">
                      <label class="edit-label">下周计划</label>
                      <t-textarea v-model="editForm.nextWeekPlans" :autosize="{ minRows: 2, maxRows: 6 }"
                        placeholder="请输入下周计划" />
                    </div>
                    <div class="edit-field">
                      <label class="edit-label">资源需求</label>
                      <t-textarea v-model="editForm.resourceNeeds" :autosize="{ minRows: 2, maxRows: 4 }"
                        placeholder="请输入资源需求" />
                    </div>
                    <div class="edit-field">
                      <label class="edit-label">预期目标</label>
                      <t-textarea v-model="editForm.expectedTargets" :autosize="{ minRows: 2, maxRows: 4 }"
                        placeholder="请输入预期目标" />
                    </div>
                    <div class="edit-field">
                      <label class="edit-label">风险评估</label>
                      <t-textarea v-model="editForm.riskAssessment" :autosize="{ minRows: 2, maxRows: 4 }"
                        placeholder="请输入风险评估" />
                    </div>
                  </template>
                  <template v-else>
                    <div class="plans-grid" v-if="reportData?.plans">
                      <div class="plan-item" v-if="hasPlanContent(reportData.plans.nextWeekPlans)">
                        <div class="plan-label">下周计划</div>
                        <div class="plan-content">{{ reportData.plans.nextWeekPlans }}</div>
                      </div>
                      <div class="plan-item" v-if="hasPlanContent(reportData.plans.resourceNeeds)">
                        <div class="plan-label">资源需求</div>
                        <div class="plan-content">{{ reportData.plans.resourceNeeds }}</div>
                      </div>
                      <div class="plan-item" v-if="hasPlanContent(reportData.plans.expectedTargets)">
                        <div class="plan-label">预期目标</div>
                        <div class="plan-content">{{ reportData.plans.expectedTargets }}</div>
                      </div>
                      <div class="plan-item" v-if="hasPlanContent(reportData.plans.riskAssessment)">
                        <div class="plan-label">风险评估</div>
                        <div class="plan-content">{{ reportData.plans.riskAssessment }}</div>
                      </div>
                      <div class="chart-empty-state"
                        v-if="!hasPlanContent(reportData.plans.nextWeekPlans) && !hasPlanContent(reportData.plans.resourceNeeds) && !hasPlanContent(reportData.plans.expectedTargets) && !hasPlanContent(reportData.plans.riskAssessment)">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="1.5"
                          stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3 2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        <p class="empty-title">暂无规划</p>
                        <p class="empty-subtitle">点击编辑按钮添加未来规划</p>
                      </div>
                    </div>
                    <div class="section-text" v-if="reportData?.futurePlans && !reportData?.plans">
                      {{ reportData.futurePlans }}
                    </div>
                  </template>
                </div>
              </div>

              <AIAnalysisPanel :report-data="report" report-type="weekly" />
            </div>
          </template>
        </template>
      </div>
    </Transition>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useReportStore } from '@/stores/report';
import { MessagePlugin } from 'tdesign-vue-next';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import {
  buildDailyFormulaTrendChart,
  buildStatusDistributionChart,
  buildDailySalesTrendChart,
  buildTopFormulasChart,
  buildWeeklyComparisonChart,
} from '@/utils/reportCharts';
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue';
import AIAnalysisPanel from '@/components/AIAnalysisPanel.vue';
import type { Report } from '@/api/report';

const route = useRoute();
const router = useRouter();
const reportStore = useReportStore();

const initialized = ref(false);
const loadError = ref('');

const report = computed<Report | null>(() => reportStore.currentReport);

const reportData = computed(() => {
  if (!report.value?.dataJson) return null;
  if (typeof report.value.dataJson === 'string') {
    try {
      return JSON.parse(report.value.dataJson);
    } catch {
      return null;
    }
  }
  return report.value.dataJson;
});

const chartRefs = ref<Record<string, HTMLElement | null>>({});
const chartInstances = ref<Record<string, echarts.ECharts | null>>({});

const setChartRef = (key: string) => (el: unknown) => {
  chartRefs.value[key] = el as HTMLElement | null;
};

const dailyFormulaTrendOption = computed(() => {
  const data = reportData.value?.formula?.dailyFormulaTrend;
  if (!data || data.length === 0) return null;
  try {
    const opt = buildDailyFormulaTrendChart(data);
    return opt;
  } catch (e) {
    console.error(`   ❌ buildDailyFormulaTrendChart 异常:`, e);
    return null;
  }
});

const statusDistributionOption = computed(() => {
  const data = reportData.value?.formula?.statusDistribution;
  if (!data || data.length === 0) return null;
  try {
    const opt = buildStatusDistributionChart(data);
    return opt;
  } catch (e) {
    console.error(`   ❌ buildStatusDistributionChart 异常:`, e);
    return null;
  }
});

const dailySalesTrendOption = computed(() => {
  const data = reportData.value?.sales?.dailySalesTrend;
  if (!data || data.length === 0) return null;
  return buildDailySalesTrendChart(data);
});

const topFormulasOption = computed(() => {
  const data = reportData.value?.sales?.topFormulas;
  if (!data || data.length === 0) return null;
  return buildTopFormulasChart(data);
});

const weeklyComparisonOption = computed(() => {
  const data = reportData.value?.sales?.weeklyComparison;
  if (!data || data.length === 0) return null;
  return buildWeeklyComparisonChart(data);
});

const hasFormulaData = computed(() => !!(dailyFormulaTrendOption.value || statusDistributionOption.value));
const hasSalesData = computed(() => !!(dailySalesTrendOption.value || topFormulasOption.value || weeklyComparisonOption.value));

const formulaIndicators = computed(() => {
  const data = reportData.value?.formula;
  if (!data) return null;
  return [
    { label: '新增配方', value: data.newFormulaCount ?? 0, unit: '个' },
    { label: '完成配方', value: data.completedFormulaCount ?? 0, unit: '个' },
    { label: '完成率', value: data.completionRate != null ? `${data.completionRate}%` : '--', unit: '' },
    { label: '配方总数', value: data.totalFormulaCount ?? 0, unit: '个' },
  ];
});

const salesIndicators = computed(() => {
  const data = reportData.value?.sales;
  if (!data) return null;
  return [
    { label: '本周销量', value: data.weeklyQuantity ?? 0, unit: '件' },
    { label: '本周销售额', value: data.weeklyRevenue != null ? `¥${(data.weeklyRevenue / 10000).toFixed(1)}` : '--', unit: '万元' },
    { label: '销量增长率', value: data.quantityGrowthRate != null ? `${data.quantityGrowthRate > 0 ? '+' : ''}${data.quantityGrowthRate}%` : '--', unit: '' },
    { label: '销售额增长率', value: data.revenueGrowthRate != null ? `${data.revenueGrowthRate > 0 ? '+' : ''}${data.revenueGrowthRate}%` : '--', unit: '' },
  ];
});

const initChart = (key: string, option: EChartsOption) => {
  const el = chartRefs.value[key];
  if (!el) return;

  const existingInstance = chartInstances.value[key];
  if (existingInstance) {
    try {
      existingInstance.setOption(option);
      return;
    } catch {
      existingInstance.dispose();
    }
  }

  try {
    const instance = echarts.init(el);
    instance.setOption(option);
    chartInstances.value[key] = instance;
  } catch (e) {
    console.error(`[WeeklyReport] ❌ initChart("${key}") 异常:`, e);
  }
};

const initAllCharts = () => {
  const chartMap = [
    { key: 'dailyFormulaTrend', option: dailyFormulaTrendOption.value },
    { key: 'statusDistribution', option: statusDistributionOption.value },
    { key: 'dailySalesTrend', option: dailySalesTrendOption.value },
    { key: 'topFormulas', option: topFormulasOption.value },
    { key: 'weeklyComparison', option: weeklyComparisonOption.value },
  ];

  for (const { key, option } of chartMap) {
    if (option && chartRefs.value[key]) {
      initChart(key, option);
    }
  }
};

const waitForDomAndInitCharts = (attempt = 0) => {
  const MAX_ATTEMPTS = 8;
  if (attempt >= MAX_ATTEMPTS) return;

  const pendingKeys = ['dailyFormulaTrend', 'statusDistribution', 'dailySalesTrend', 'topFormulas', 'weeklyComparison']
    .filter(key => {
      const option = (
        key === 'dailyFormulaTrend' ? dailyFormulaTrendOption.value :
        key === 'statusDistribution' ? statusDistributionOption.value :
        key === 'dailySalesTrend' ? dailySalesTrendOption.value :
        key === 'topFormulas' ? topFormulasOption.value :
        weeklyComparisonOption.value
      );
      return option && !chartRefs.value[key];
    });

  if (pendingKeys.length === 0) {
    initAllCharts();
    return;
  }

  setTimeout(() => waitForDomAndInitCharts(attempt + 1), 80 + attempt * 60);
};

const handleResize = () => {
  Object.values(chartInstances.value).forEach(instance => instance?.resize());
};

const statusLabel = computed(() => {
  const map: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档',
  };
  return map[report.value?.status || ''] || '未知';
});

const dashboardCards = computed(() => {
  const data = reportData.value;
  const formula = data?.formula || {};
  const sales = data?.sales || {};
  return [
    {
      label: '新增配方',
      value: formula.newFormulaCount ?? 0,
      unit: '个',
      badge: formula.newFormulaCountGrowth != null ? `${formula.newFormulaCountGrowth > 0 ? '+' : ''}${formula.newFormulaCountGrowth}%` : '--',
      badgeColor: (formula.newFormulaCountGrowth || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: (formula.newFormulaCountGrowth || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#EFF6FF',
      iconColor: '#3B82F6',
      iconPath: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>',
    },
    {
      label: '完成配方',
      value: formula.completedFormulaCount ?? 0,
      unit: '个',
      badge: formula.completedFormulaCountGrowth != null ? `${formula.completedFormulaCountGrowth > 0 ? '+' : ''}${formula.completedFormulaCountGrowth}%` : '--',
      badgeColor: (formula.completedFormulaCountGrowth || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: (formula.completedFormulaCountGrowth || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#ECFDF5',
      iconColor: 'var(--color-primary)',
      iconPath: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    },
    {
      label: '销售总量',
      value: (sales.weeklyQuantity ?? 0).toLocaleString(),
      unit: '件',
      badge: sales.quantityGrowthRate != null ? `${sales.quantityGrowthRate > 0 ? '+' : ''}${sales.quantityGrowthRate}%` : '--',
      badgeColor: (sales.quantityGrowthRate || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: (sales.quantityGrowthRate || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#FFFBEB',
      iconColor: 'var(--color-warning)',
      iconPath: '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    },
    {
      label: '销售额',
      value: sales.weeklyRevenue ? (sales.weeklyRevenue / 10000).toFixed(1) : '0',
      unit: '万元',
      badge: sales.revenueGrowthRate != null ? `${sales.revenueGrowthRate > 0 ? '+' : ''}${sales.revenueGrowthRate}%` : '--',
      badgeColor: (sales.revenueGrowthRate || 0) >= 0 ? 'var(--color-primary)' : 'var(--color-danger)',
      badgeBg: (sales.revenueGrowthRate || 0) >= 0 ? '#ECFDF5' : '#FEF2F2',
      iconBg: '#FAF5FF',
      iconColor: '#A855F7',
      iconPath: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    },
  ];
});

const goBack = () => {
  router.push('/reports');
};

const futurePlansRef = ref<HTMLElement | null>(null);

const hasPlanContent = (value: unknown): boolean => {
  if (!value) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim() !== '' && value !== '[]';
  return true;
};

const handleEdit = () => {
  startEditPlans();
  nextTick(() => {
    futurePlansRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const handleExportPDF = () => {
  if (report.value?.id) {
    reportStore.exportPdf(report.value.id);
  }
};

const handleExportExcel = () => {
  if (report.value?.id) {
    reportStore.exportExcel(report.value.id);
  }
};

const isEditingPlans = ref(false);
const plansExpanded = ref(true);

const hasAnyPlansData = computed(() => {
  const data = reportData.value;
  if (!data) return false;
  if (data.plans) {
    const p = data.plans;
    if (hasPlanContent(p.nextWeekPlans) || hasPlanContent(p.resourceNeeds) || hasPlanContent(p.expectedTargets) || hasPlanContent(p.riskAssessment)) return true;
  }
  if (data.futurePlans && data.futurePlans.trim()) return true;
  return false;
});

watch(hasAnyPlansData, (val) => {
  plansExpanded.value = val;
}, { immediate: true });
const editForm = ref({
  nextWeekPlans: '',
  resourceNeeds: '',
  expectedTargets: '',
  riskAssessment: '',
});

const startEditPlans = () => {
  const plans = reportData.value?.plans || {};
  const toStr = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '';
    return v ? String(v) : '';
  };
  editForm.value = {
    nextWeekPlans: toStr(plans.nextWeekPlans),
    resourceNeeds: toStr(plans.resourceNeeds),
    expectedTargets: toStr(plans.expectedTargets),
    riskAssessment: toStr(plans.riskAssessment),
  };
  isEditingPlans.value = true;
};

const cancelEditPlans = () => {
  isEditingPlans.value = false;
};

const savePlans = async () => {
  if (!report.value?.id) return;
  const currentDataJson = reportData.value || {};
  const updatedDataJson = {
    ...currentDataJson,
    plans: { ...editForm.value },
  };
  await reportStore.updateReport(report.value.id, { dataJson: updatedDataJson });
  isEditingPlans.value = false;
};

const handlePublish = async () => {
  if (!report.value || report.value.status === 'published') return;

  // 准备报告数据用于AI分析
  const reportDataForAI = {
    id: report.value.id,
    type: 'weekly',
    title: report.value.title,
    periodStart: report.value.periodStart,
    periodEnd: report.value.periodEnd,
    dataJson: report.value.dataJson
  };

  const res = await reportStore.publishReport(report.value.id, reportDataForAI, 'weekly');
  if (res) {
    MessagePlugin.success('报告已发布，AI智能分析正在生成中...');
  }
};

const loadData = async () => {
  loadError.value = '';
  try {
    const id = route.params.id as string;
    if (id) {
      await reportStore.fetchReportById(id);
    } else {
      loadError.value = '缺少报告 ID';
    }
  } catch (e: unknown) {
    const err = e as { message?: string };
    loadError.value = err.message || '加载失败，请稍后重试';
  }
};

const retryLoad = async () => {
  loadError.value = '';
  await loadData();
};

watch(() => reportStore.currentReport, (report) => {
  if (report?.dataJson) {
    nextTick(() => {
      setTimeout(() => waitForDomAndInitCharts(0), 60);
    });
  }
}, { immediate: true });

onMounted(async () => {
  window.addEventListener('resize', handleResize);
  try {
    await loadData();
  } catch (e: unknown) {
    const err = e as { message?: string };
    loadError.value = err.message || '初始化失败';
  } finally {
    initialized.value = true;
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', handleResize);
  Object.values(chartInstances.value).forEach(instance => instance?.dispose());
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.weekly-report {
  padding: 0;
  padding-bottom: 32px;
  animation: page-fade-in 0.4s ease;

  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
}

@keyframes page-fade-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

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
      color: var(--color-text-placeholder);
      cursor: pointer;
      transition: all 0.2s;
      font-size: 20px;

      &:hover {
        color: var(--color-primary);
        background-color: #ecfdf5;
      }
    }

    .header-title-group {
      display: flex;
      flex-direction: column;
      gap: var(--space-1-5);

      .header-breadcrumb {
        display: flex;
        align-items: center;
        gap: var(--space-1-5);
        font-size: 12px;
        line-height: 1;

        .breadcrumb-link {
          color: var(--color-text-placeholder);
          cursor: pointer;
          transition: color 0.15s;
          text-decoration: none;

          &:hover {
            color: var(--color-primary);
          }
        }

        .breadcrumb-sep {
          font-size: 12px;
          color: var(--color-text-placeholder);
        }

        .breadcrumb-current {
          color: var(--color-text-secondary);
        }
      }

      .detail-title {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 700;
        color: var(--color-text-primary);
        line-height: 1.35;

        .version-tag {
          display: inline-block !important;
          padding: var(--space-0-5) 8px;
          background-color: var(--color-primary-bg);
          color: var(--color-primary-dark);
          font-size: 10px;
          font-weight: 900;
          border-radius: 6px;
          line-height: 1.6;
          white-space: nowrap;
          letter-spacing: 0.02em;
          flex-shrink: 0;
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
      background-color: var(--color-primary);
      color: #ffffff;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 700;
      box-shadow: var(--shadow-brand-sm);
      cursor: pointer;
      transition: all 0.2s;

      .btn-icon {
        font-size: 18px;
      }

      &:hover {
        background-color: var(--color-primary-dark);
        transform: translateY(-1px);
        box-shadow: var(--shadow-brand-md);
      }

      &:active {
        transform: translateY(0);
        background-color: var(--color-primary-deep);
      }
    }

    .header-action-btn--publish {
      background-color: var(--color-primary-dark);

      &:hover {
        background-color: var(--color-primary-deep);
      }

      &:active {
        background-color: #065F46;
      }
    }
  }
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.dashboard-section {
  margin-top: 24px;
  margin-bottom: 30px;

  .dashboard-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

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
    border-color: var(--color-primary-bg);
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

.report-sections {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.report-section-card {
  background: #fff;
  border-radius: 20px;
  border: 1px solid #f1f5f9;
  border-left: 4px solid #3B82F6;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.04);
  overflow: hidden;
  transition: all $transition-slow;

  &:hover {
    box-shadow: 0 8px 30px rgba(15, 23, 42, 0.08);
    border-color: #ecfdf5;
  }

  .section-header {
    padding: var(--space-3-5) 20px;
    background: var(--color-bg-page);
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;

    :deep(.t-button) {
      color: var(--color-primary);
    }

    :deep(.t-button:hover) {
      color: var(--color-primary-dark);
    }
  }

  .header-right-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .collapse-icon {
    transition: transform 0.25s ease;
    cursor: pointer;

    &:hover {
      stroke: var(--color-text-secondary);
    }

    &.collapsed {
      transform: rotate(-90deg);
    }
  }

  .section-title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    color: #0F172A;
    margin: 0;
  }

  .section-body {
    padding: 20px;
  }

  .section-body.editing-mode {
    box-shadow: inset 0 0 0 2px var(--color-primary);
    border-radius: 0 0 20px 20px;
    overflow: visible;
    max-height: none;
  }

  &.editing-overflow {
    overflow: visible;
  }

  .section-text {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.7;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }
}

.chart-row {
  display: flex;
  gap: 20px;
}

.chart-container {
  border-radius: 12px;
  background: #fff;
  border: 1px solid #f1f5f9;
}

.chart-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: var(--color-bg-page);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  padding: 32px 16px;

  .empty-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    margin: 12px 0 4px;
  }

  .empty-subtitle {
    font-size: 12px;
    color: #CBD5E1;
    margin: 0;
  }
}

.section-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  background: var(--color-bg-page);
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  padding: 40px 20px;

  .section-empty-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-text-placeholder);
    margin: 16px 0 4px;
  }

  .section-empty-subtitle {
    font-size: 13px;
    color: #CBD5E1;
    margin: 0 0 20px;
  }

  .section-empty-action {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: 8px 20px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: #fff;
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: #ECFDF5;
    }
  }
}

.stat-indicators {
  display: flex;
  gap: 16px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid #f1f5f9;
}

.stat-indicator {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  border-radius: 12px;
  background: var(--color-bg-page);
  border: 1px solid #f1f5f9;

  .indicator-label {
    font-size: 12px;
    color: var(--color-text-placeholder);
    font-weight: 500;
  }

  .indicator-value {
    font-size: 18px;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.2;

    .indicator-unit {
      font-size: 12px;
      font-weight: 400;
      color: var(--color-text-placeholder);
    }
  }
}

.edit-actions {
  display: flex;
  gap: 4px;
}

.edit-field {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.edit-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-1-5);
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.plan-item {
  padding: 12px 16px;
  border-radius: 12px;
  background: var(--color-bg-page);
  border: 1px solid #f1f5f9;

  .plan-label {
    font-size: 12px;
    font-weight: 600;
    color: #8B5CF6;
    margin-bottom: var(--space-1-5);
  }

  .plan-content {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--space-16) 20px;
  text-align: center;

  .error-icon {
    margin-bottom: 16px;
    opacity: 0.8;
  }

  .error-title {
    font-size: 18px;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 8px;
  }

  .error-desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0 0 24px;
    max-width: 400px;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1-5);
    padding: var(--space-2-5) 24px;
    border-radius: 12px;
    border: none;
    background: $emerald-500;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: $emerald-600;
      transform: translateY(-1px);
    }
  }
}
</style>
