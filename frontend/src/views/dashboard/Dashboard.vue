<template>
  <div class="dashboard-page">
    <div class="bento-grid">
      <!-- 左栏：审批 + 动态 -->
      <div class="bento-grid__col bento-grid__col--left">
        <ApprovalCard />
        <!-- 动态卡片 -->
        <section class="bento-card bento-activity">
          <div class="card-header">
            <h3 class="card-title">近期动态</h3>
            <div class="activity-nav" v-if="dashboardStore.activities.length > 0 && !dashboardStore.activityLoading">
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
          <div class="activity-body">
            <template v-if="dashboardStore.activityLoading">
              <div class="activity-skeleton" v-for="i in 5" :key="i">
                <div class="skeleton-circle" />
                <div class="skeleton-lines">
                  <div class="skeleton-line skeleton-line--title" />
                  <div class="skeleton-line skeleton-line--sub" />
                </div>
              </div>
            </template>
            <template v-else-if="dashboardStore.activities.length === 0">
              <div class="activity-empty">
                <t-icon name="time" size="28px" />
                <p>暂无动态</p>
              </div>
            </template>
            <template v-else>
              <div v-for="activity in paginatedActivities" :key="activity.id" class="activity-item"
                @click="handleActivityClick(activity)">
                <div class="activity-dot" :class="`activity-dot--${activity.type}`" />
                <div class="activity-content">
                  <span class="activity-name">{{ activity.name }}</span>
                  <span class="activity-time">{{ formatRelativeTime(activity.updatedAt) }}</span>
                </div>
                <span class="activity-type-badge" :class="`activity-type-badge--${activity.type}`">
                  {{ activity.type === 'formula' ? '配方' : '原料' }}
                </span>
              </div>
            </template>
          </div>
        </section>
      </div>
      <!-- 右栏：统计 + 快捷操作 + 配方 + 图表 -->
      <div class="bento-grid__col bento-grid__col--right">
        <!-- 统计卡片 -->
        <div class="stat-grid">
          <section v-for="item in statCards" :key="item.key" class="bento-card bento-stat"
            :class="[`bento-stat--${item.key}`]" @click="item.route && router.push(item.route)">
            <div class="stat-icon-wrap" :style="{ background: item.iconBg }">
              <t-icon :name="item.icon" size="22px" :style="{ color: item.iconColor }" />
            </div>
            <div class="stat-body">
              <span class="stat-value">
                <template v-if="dashboardStore.statsLoading">
                  <t-loading size="small" />
                </template>
                <template v-else>{{ item.display }}</template>
              </span>
              <span class="stat-label">{{ item.label }}</span>
            </div>
            <div v-if="item.route" class="stat-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </section>
        </div>
        <!-- 快捷操作卡片 -->
        <section class="bento-card bento-quick">
          <div class="card-header">
            <h3 class="card-title">快捷操作</h3>
          </div>
          <div class="quick-body" :class="{ 'quick-body--formulist': !isAdmin }">
            <template v-if="!isAdmin">
              <button class="quick-btn quick-btn--highlight" @click="router.push('/formulas/quick')">
                <div class="quick-icon"
                  style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(45, 212, 191, 0.15));">
                  <t-icon name="edit-1" size="20px" style="color: #10b981;" />
                </div>
                <span>快速录入</span>
              </button>
              <button class="quick-btn" @click="router.push('/ai-assistant')">
                <div class="quick-icon" style="background: rgba(168, 85, 247, 0.1);">
                  <t-icon name="precise-monitor" size="20px" style="color: #a855f7;" />
                </div>
                <span>AI 助手</span>
              </button>
              <button class="quick-btn" @click="router.push('/smart-tools')">
                <div class="quick-icon" style="background: rgba(16, 185, 129, 0.1);">
                  <t-icon name="tools" size="20px" style="color: var(--color-primary);" />
                </div>
                <span>智能工具</span>
              </button>
              <button class="quick-btn" @click="router.push('/formulas')">
                <div class="quick-icon" style="background: rgba(59, 130, 246, 0.1);">
                  <t-icon name="edit" size="20px" style="color: #3b82f6;" />
                </div>
                <span>配方管理</span>
              </button>
              <button class="quick-btn" @click="router.push('/materials')">
                <div class="quick-icon" style="background: rgba(245, 158, 11, 0.1);">
                  <t-icon name="chart-bar" size="20px" style="color: var(--color-warning);" />
                </div>
                <span>原料管理</span>
              </button>
              <button class="quick-btn" @click="router.push('/reports')">
                <div class="quick-icon" style="background: rgba(239, 68, 68, 0.1);">
                  <t-icon name="file-icon" size="20px" style="color: var(--color-danger);" />
                </div>
                <span>报告中心</span>
              </button>
            </template>
            <template v-else>
              <button class="quick-btn quick-btn--highlight" @click="router.push('/formulas/quick')">
                <div class="quick-icon"
                  style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(45, 212, 191, 0.15));">
                  <t-icon name="edit-1" size="20px" style="color: #10b981;" />
                </div>
                <span>快速录入</span>
              </button>
              <button class="quick-btn" @click="router.push('/formulas/new')">
                <div class="quick-icon" style="background: rgba(16, 185, 129, 0.1);">
                  <t-icon name="add" size="20px" style="color: var(--color-primary);" />
                </div>
                <span>新建配方</span>
              </button>
              <button class="quick-btn" @click="router.push('/system')">
                <div class="quick-icon" style="background: rgba(59, 130, 246, 0.1);">
                  <t-icon name="setting" size="20px" style="color: #3b82f6;" />
                </div>
                <span>系统管理</span>
              </button>
              <button class="quick-btn" @click="router.push('/model-management')">
                <div class="quick-icon" style="background: rgba(168, 85, 247, 0.1);">
                  <t-icon name="control-platform" size="20px" style="color: #a855f7;" />
                </div>
                <span>模型管理</span>
              </button>
              <button class="quick-btn" @click="router.push('/users')">
                <div class="quick-icon" style="background: rgba(245, 158, 11, 0.1);">
                  <t-icon name="user" size="20px" style="color: var(--color-warning);" />
                </div>
                <span>用户管理</span>
              </button>
            </template>
          </div>
        </section>
        <!-- 配方卡片 -->
        <section class="bento-card bento-formulas">
          <div class="card-header">
            <h3 class="card-title">精选配方</h3>
            <button class="card-link" @click="router.push('/formulas')">
              查看全部
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div class="formulas-body">
            <template v-if="formulaStore.loading">
              <div class="formula-skeleton" v-for="i in 3" :key="i">
                <div class="skeleton-line skeleton-line--title" />
                <div class="skeleton-line skeleton-line--sub" />
              </div>
            </template>
            <template v-else-if="featuredFormulas.length === 0">
              <div class="formulas-empty">
                <t-icon name="edit" size="28px" />
                <p>还没有配方</p>
                <t-button theme="primary" size="small" @click="router.push('/formulas/new')">创建配方</t-button>
              </div>
            </template>
            <template v-else>
              <div v-for="formula in featuredFormulas" :key="formula.id" class="formula-card"
                @click="router.push(`/formulas/${formula.id}`)">
                <div class="formula-color-bar" :style="{ background: getFormulaGradient(formula) }" />
                <div class="formula-info">
                  <span class="formula-name">{{ formula.name }}</span>
                  <span class="formula-meta">{{ formula.salesmanName || '--' }} · {{ formula.materials?.length || 0 }}
                    种原料</span>
                </div>
                <svg class="formula-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </template>
          </div>
        </section>
        <!-- 图表卡片 -->
        <section class="bento-card bento-chart">
          <div class="card-header">
            <h3 class="card-title">销量趋势</h3>
            <div class="chart-tabs">
              <button v-for="tab in chartTabs" :key="tab.value" class="chart-tab"
                :class="{ active: activeChartTab === tab.value }" @click="handleChartTab(tab.value)">{{ tab.label
                }}</button>
            </div>
          </div>
          <div class="chart-body" ref="chartRef">
            <template v-if="dashboardStore.trendLoading">
              <div class="chart-skeleton">
                <div class="skeleton-bar" v-for="i in 6" :key="i" :style="{ height: `${20 + Math.random() * 60}%` }" />
              </div>
            </template>
            <template v-else-if="dashboardStore.salesTrend.length === 0">
              <div class="chart-empty">
                <t-icon name="chart-line" size="32px" />
                <p>暂无销量数据</p>
              </div>
            </template>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted, nextTick, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { useDashboardStore } from "@/stores/dashboard";
import { useFormulaStore } from "@/stores/formula";
import { formatCompact } from "@/utils/timeFormat";
import * as echarts from "echarts";
import ApprovalCard from "@/components/dashboard/ApprovalCard.vue";
import { useApprovalStore } from "@/stores/approval";

const router = useRouter();
const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const formulaStore = useFormulaStore();
const approvalStore = useApprovalStore();


const isAdmin = computed(() => authStore.user?.role === "admin");

const chartRef = ref<HTMLElement | null>(null);
let chartInstance: echarts.ECharts | null = null;
const activeChartTab = ref<"week" | "month" | "year">("month");
let isUnmounted = false;
let chartInitTimer: ReturnType<typeof setTimeout> | null = null;

const chartTabs = [
  { label: "周", value: "week" as const },
  { label: "月", value: "month" as const },
  { label: "年", value: "year" as const },
];

const statCards = computed(() => {
  const s = dashboardStore.stats;
  if (!isAdmin.value) {
    return [
      {
        key: "myFormulas",
        label: "我的配方",
        display: s ? formatCompact(s.formulas) : "--",
        icon: "edit",
        iconBg: "rgba(16, 185, 129, 0.1)",
        iconColor: "var(--color-primary)",
        route: "/formulas",
      },
      {
        key: "myMaterials",
        label: "我的原料",
        display: s ? formatCompact(s.materials) : "--",
        icon: "chart-bar",
        iconBg: "rgba(59, 130, 246, 0.1)",
        iconColor: "#3b82f6",
        route: "/materials",
      },
      {
        key: "myRevenue",
        label: "本月营收",
        display: s ? `¥${formatCompact(s.sales.revenue)}` : "--",
        icon: "chart",
        iconBg: "rgba(245, 158, 11, 0.1)",
        iconColor: "var(--color-warning)",
        route: "/sales",
      },
      {
        key: "myReport",
        label: "本月报告",
        display: s ? `${s.sales.formulaCount} 款` : "--",
        icon: "file-icon",
        iconBg: "rgba(168, 85, 247, 0.1)",
        iconColor: "#a855f7",
        route: "/reports",
      },
    ] as const;
  }
  return [
    {
      key: "formulas",
      label: "配方总数",
      display: s ? formatCompact(s.formulas) : "--",
      icon: "edit",
      iconBg: "rgba(16, 185, 129, 0.1)",
      iconColor: "var(--color-primary)",
      route: "/formulas",
    },
    {
      key: "materials",
      label: "原料总数",
      display: s ? formatCompact(s.materials) : "--",
      icon: "chart-bar",
      iconBg: "rgba(59, 130, 246, 0.1)",
      iconColor: "#3b82f6",
      route: "/materials",
    },
    {
      key: "revenue",
      label: "本月营收",
      display: s ? `¥${formatCompact(s.sales.revenue)}` : "--",
      icon: "chart",
      iconBg: "rgba(245, 158, 11, 0.1)",
      iconColor: "var(--color-warning)",
      route: "/sales",
    },
    {
      key: "sales",
      label: "销量配方",
      display: s ? `${s.sales.formulaCount} 款` : "--",
      icon: "shop",
      iconBg: "rgba(168, 85, 247, 0.1)",
      iconColor: "#a855f7",
      route: "/sales",
    },
  ] as const;
});

const featuredFormulas = computed(() => {
  const all = formulaStore.formulas;
  if (!isAdmin.value) {
    const userId = authStore.user?.id;
    return all.filter((f) => f.createdBy === userId).slice(0, 3);
  }
  return all.slice(0, 3);
});

const FORMULA_GRADIENTS = [
  "linear-gradient(135deg, var(--color-primary), var(--color-primary-light))",
  "linear-gradient(135deg, #3b82f6, #60a5fa)",
  "linear-gradient(135deg, #a855f7, #c084fc)",
  "linear-gradient(135deg, var(--color-warning), #fbbf24)",
  "linear-gradient(135deg, var(--color-danger), #f87171)",
];

const getFormulaGradient = (formula: { id: string; }) => {
  const index = formula.id.charCodeAt(0) % FORMULA_GRADIENTS.length;
  return FORMULA_GRADIENTS[index];
};

const formatRelativeTime = (dateStr: string): string => {
  if (!dateStr || dateStr === "-") return "--";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "刚刚";
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
};

const ACTIVITY_PAGE_SIZE = 4;
const activityPage = ref(1);

const activityTotalPages = computed(() =>
  Math.max(1, Math.ceil(dashboardStore.activities.length / ACTIVITY_PAGE_SIZE))
);

const paginatedActivities = computed(() => {
  const start = (activityPage.value - 1) * ACTIVITY_PAGE_SIZE;
  return dashboardStore.activities.slice(start, start + ACTIVITY_PAGE_SIZE);
});

const activityPrev = () => {
  if (activityPage.value > 1) activityPage.value--;
};

const activityNext = () => {
  if (activityPage.value < activityTotalPages.value) activityPage.value++;
};

const handleActivityClick = (activity: { type: string; id: string; }) => {
  if (activity.type === "formula") {
    router.push(`/formulas/${activity.id}`);
  } else {
    router.push(`/materials/${activity.id}`);
  }
};

const handleChartTab = (period: "week" | "month" | "year") => {
  if (isUnmounted) return;
  activeChartTab.value = period;
  dashboardStore.fetchSalesTrend(period);
};

const isDomReady = (): boolean => {
  if (isUnmounted) return false;
  if (!chartRef.value) return false;
  if (!chartRef.value.isConnected) return false;
  return true;
};

const initChart = () => {
  if (!isDomReady()) return;
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
  chartInstance = echarts.init(chartRef.value);
  updateChart();
};

const updateChart = () => {
  if (!isDomReady()) return;
  if (!chartInstance) return;
  const data = dashboardStore.salesTrend;
  if (!data || data.length === 0) return;

  const isDark = document.documentElement.getAttribute("theme-mode") === "dark";
  const textColor = isDark ? "var(--color-text-placeholder)" : "var(--color-text-secondary)";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.08)" : "rgba(0, 0, 0, 0.04)";

  const option: echarts.EChartsOption = {
    grid: {
      top: 16,
      right: 16,
      bottom: 28,
      left: 48,
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: isDark ? "var(--color-text-primary)" : "#fff",
      borderColor: isDark ? "var(--color-text-primary)" : "var(--color-border)",
      borderWidth: 1,
      textStyle: {
        color: isDark ? "var(--color-border)" : "var(--color-text-primary)",
        fontSize: 12,
      },
      formatter: (params: Record<string, unknown>) => {
        const p = (Array.isArray(params) ? params[0] : params) as Record<string, unknown>;
        return `<div style="font-weight:600;margin-bottom:4px">${p.axisValue}</div>
                <div>销量: ${p.value}</div>`;
      },
    },
    xAxis: {
      type: "category",
      data: data.map((d) => d.period),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        margin: 8,
      },
    },
    yAxis: {
      type: "value",
      splitLine: {
        lineStyle: { color: gridColor, type: "dashed" },
      },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
      },
    },
    series: [
      {
        type: "line",
        data: data.map((d) => d.quantity),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: {
          width: 2.5,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "var(--color-primary)" },
            { offset: 1, color: "var(--color-primary-light)" },
          ]),
        },
        itemStyle: {
          color: "var(--color-primary)",
          borderWidth: 2,
          borderColor: "#fff",
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(16, 185, 129, 0.2)" },
            { offset: 1, color: "rgba(16, 185, 129, 0.01)" },
          ]),
        },
      },
    ],
  };

  chartInstance.setOption(option, true);
};

watch(
  () => dashboardStore.salesTrend,
  () => {
    if (!isDomReady()) return;
    nextTick(() => {
      if (!isDomReady()) return;
      if (dashboardStore.salesTrend.length > 0) {
        if (!chartInstance) {
          initChart();
        } else {
          updateChart();
        }
      }
    });
  },
  { deep: true }
);

const handleResize = () => {
  if (!isDomReady()) return;
  chartInstance?.resize();
};

onBeforeUnmount(() => {
  isUnmounted = true;
  if (chartInitTimer) {
    clearTimeout(chartInitTimer);
    chartInitTimer = null;
  }
  if (chartInstance) {
    chartInstance.dispose();
    chartInstance = null;
  }
});

onMounted(async () => {
  isUnmounted = false;
  dashboardStore.fetchAll();
  if (formulaStore.formulas.length === 0) {
    formulaStore.fetchFormulas();
  }
  if (isAdmin.value) {
    approvalStore.fetchPendingReviews({ page: 1 });
  } else {
    approvalStore.fetchMySubmissions({ page: 1 });
  }
  await nextTick();
  if (!isDomReady()) return;
  if (dashboardStore.salesTrend.length > 0) {
    initChart();
  } else {
    chartInitTimer = setTimeout(() => {
      if (!isDomReady()) return;
      if (dashboardStore.salesTrend.length > 0) {
        initChart();
      }
    }, 1500);
  }
  window.addEventListener("resize", handleResize);
});

onUnmounted(() => {
  window.removeEventListener("resize", handleResize);
});
</script>

<style scoped lang="scss">
.dashboard-page {
  min-height: 100%;
  padding: 4px 4px 24px;
}

.bento-grid {
  display: grid;
  grid-template-columns: 6fr 4fr;
  gap: 16px;
}

.bento-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.04);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.bento-grid__col {
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--left {
    min-height: 560px;

    .bento-card {
      width: 100%;
    }
  }

  &--right {
    .bento-card {
      width: 100%;
    }
  }
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.bento-stat {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-3-5);
  padding: 20px;

  .stat-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .stat-body {
    flex: 1;
    min-width: 0;
  }

  .stat-value {
    display: block;
    font-size: 22px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.2;
  }

  .stat-label {
    display: block;
    font-size: 12px;
    color: var(--color-text-placeholder);
    margin-top: var(--space-0-5);
  }

  .stat-arrow {
    color: #cbd5e1;
    transition: all 0.2s ease;
    flex-shrink: 0;
  }

  &:hover .stat-arrow {
    color: var(--color-primary);
    transform: translateX(3px);
  }
}

.bento-chart {
  .chart-body {
    height: 220px;
    margin-top: 12px;
  }

  .chart-skeleton {
    height: 100%;
    display: flex;
    align-items: flex-end;
    gap: 12px;
    padding: 0 8px;

    .skeleton-bar {
      flex: 1;
      background: linear-gradient(180deg, #f1f5f9 0%, var(--color-border) 100%);
      border-radius: 6px 6px 0 0;
      animation: shimmer 1.5s ease-in-out infinite;
    }
  }

  .chart-empty {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
    gap: 8px;

    p {
      margin: 0;
      font-size: 13px;
    }
  }
}

.bento-formulas {
  .formulas-body {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: var(--space-2-5);
  }

  .formula-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;

    &:hover {
      background: var(--color-bg-page);
      border-color: var(--color-border);

      .formula-arrow {
        color: var(--color-primary);
        transform: translateX(3px);
      }
    }

    .formula-color-bar {
      width: 4px;
      height: 36px;
      border-radius: var(--radius-2xs);
      flex-shrink: 0;
    }

    .formula-info {
      flex: 1;
      min-width: 0;
    }

    .formula-name {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .formula-meta {
      display: block;
      font-size: 12px;
      color: var(--color-text-placeholder);
      margin-top: var(--space-0-5);
    }

    .formula-arrow {
      color: #cbd5e1;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }
  }

  .formulas-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 0;
    color: #cbd5e1;
    gap: 8px;

    p {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-placeholder);
    }
  }
}

.bento-activity {
  .activity-body {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
  }

  .activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: var(--space-2-5) 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--color-bg-page);
    }
  }

  .activity-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;

    &--formula {
      background: var(--color-primary);
    }

    &--material {
      background: #3b82f6;
    }
  }

  .activity-content {
    flex: 1;
    min-width: 0;
  }

  .activity-name {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #0f172a;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-time {
    display: block;
    font-size: 11px;
    color: var(--color-text-placeholder);
    margin-top: 1px;
  }

  .activity-type-badge {
    font-size: 11px;
    padding: var(--space-0-5) 8px;
    border-radius: 6px;
    font-weight: 500;
    flex-shrink: 0;

    &--formula {
      background: rgba(16, 185, 129, 0.08);
      color: var(--color-primary);
    }

    &--material {
      background: rgba(59, 130, 246, 0.08);
      color: #3b82f6;
    }
  }

  .activity-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 0;
    color: #cbd5e1;
    gap: 8px;

    p {
      margin: 0;
      font-size: 13px;
      color: var(--color-text-placeholder);
    }
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
      border: 1.5px solid rgba(16, 185, 129, 0.2);
      background: rgba(16, 185, 129, 0.04);
      color: var(--color-primary);
      cursor: pointer;
      transition: all 0.15s ease;

      &:hover:not(:disabled) {
        background: rgba(16, 185, 129, 0.12);
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
}

.bento-quick {
  .quick-body {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-2-5);

    &--formulist {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .quick-btn {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    padding: var(--space-3-5);
    border-radius: 12px;
    border: 1px solid var(--color-border);
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-primary);

    &--highlight {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.06), rgba(45, 212, 191, 0.06));
      border-color: rgba(16, 185, 129, 0.25);

      &:hover {
        border-color: var(--color-primary);
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(45, 212, 191, 0.12));
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.15);
      }
    }

    &:hover {
      border-color: var(--color-primary);
      background: var(--color-bg-page);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.08);
    }

    &:active {
      transform: scale(0.98);
    }

    .quick-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;

  .card-title {
    font-size: 15px;
    font-weight: 600;
    color: #0f172a;
    margin: 0;
  }

  .card-link {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--color-text-placeholder);
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      color: var(--color-primary);
      background: rgba(16, 185, 129, 0.06);
    }
  }
}

.chart-tabs {
  display: flex;
  gap: var(--space-0-5);
  background: #f1f5f9;
  border-radius: 8px;
  padding: var(--space-0-5);

  .chart-tab {
    padding: 4px 12px;
    font-size: 12px;
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--color-text-placeholder);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
      background: #fff;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    &:hover:not(.active) {
      color: var(--color-text-secondary);
    }
  }
}

@keyframes shimmer {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.skeleton-line {
  height: 10px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f1f5f9 25%, var(--color-border) 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: skeletonSlide 1.5s ease-in-out infinite;

  &--title {
    width: 60%;
    margin-bottom: var(--space-1-5);
  }

  &--sub {
    width: 40%;
  }
}

.skeleton-circle {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-border);
  flex-shrink: 0;
  animation: shimmer 1.5s ease-in-out infinite;
}

.formula-skeleton,
.activity-skeleton {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;

  .skeleton-lines {
    flex: 1;
  }
}

@keyframes skeletonSlide {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

@media screen and (max-width: 1200px) {
  .bento-grid {
    grid-template-columns: 1fr;
  }

  .bento-grid__col--left,
  .bento-grid__col--right {
    min-height: auto;
  }

  .bento-grid__col--left {
    min-height: 440px;
  }

  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .bento-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .bento-stat {
    grid-column: 1 !important;
  }

  .bento-grid__col--left,
  .bento-grid__col--right {
    min-height: auto;
  }

  .bento-grid__col--left {
    min-height: 400px;
  }

  .bento-quick .quick-body {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 480px) {
  .bento-grid {
    gap: var(--space-2-5);
  }

  .bento-card {
    padding: 16px;
    border-radius: 12px;
  }

  .bento-quick .quick-body {
    grid-template-columns: 1fr;
  }
}

:root[theme-mode="dark"] {
  .bento-card {
    background: var(--color-text-primary);
    border-color: rgba(255, 255, 255, 0.06);

    &:hover {
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
    }
  }

  .bento-stat {
    .stat-value {
      color: var(--color-border);
    }

    .stat-label {
      color: var(--color-text-secondary);
    }
  }

  .card-header {
    .card-title {
      color: var(--color-border);
    }
  }

  .bento-chart {
    .chart-skeleton .skeleton-bar {
      background: linear-gradient(180deg, var(--color-text-primary) 0%, var(--color-text-primary) 100%);
    }

    .chart-empty {
      color: var(--color-text-secondary);
    }
  }

  .bento-formulas {
    .formula-card {
      &:hover {
        background: #0f172a;
        border-color: rgba(255, 255, 255, 0.08);
      }
    }

    .formula-name {
      color: var(--color-border);
    }

    .formula-meta {
      color: var(--color-text-secondary);
    }

    .formula-arrow {
      color: var(--color-text-secondary);
    }

    .formulas-empty {
      color: var(--color-text-secondary);

      p {
        color: var(--color-text-secondary);
      }
    }
  }

  .bento-activity {
    .activity-item:hover {
      background: #0f172a;
    }

    .activity-name {
      color: var(--color-border);
    }

    .activity-time {
      color: var(--color-text-secondary);
    }

    .activity-empty {
      color: var(--color-text-secondary);

      p {
        color: var(--color-text-secondary);
      }
    }

    .activity-nav {
      .activity-nav-btn {
        border-color: rgba(16, 185, 129, 0.15);
        background: rgba(16, 185, 129, 0.06);

        &:hover:not(:disabled) {
          background: rgba(16, 185, 129, 0.18);
          border-color: var(--color-primary-light);
        }

        &:disabled {
          opacity: 0.25;
          border-color: rgba(148, 163, 184, 0.1);
          color: var(--color-text-secondary);
          background: transparent;
        }
      }

      .activity-nav-page {
        color: var(--color-text-secondary);
      }
    }
  }

  .bento-quick {
    .quick-btn {
      border-color: rgba(255, 255, 255, 0.08);
      background: #0f172a;
      color: #cbd5e1;

      &:hover {
        border-color: var(--color-primary);
        background: #162033;
      }
    }
  }

  .chart-tabs {
    background: #0f172a;

    .chart-tab {
      color: var(--color-text-secondary);

      &.active {
        background: var(--color-text-primary);
        color: var(--color-border);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      &:hover:not(.active) {
        color: var(--color-text-placeholder);
      }
    }
  }

  .skeleton-line {
    background: linear-gradient(90deg, var(--color-text-primary) 25%, var(--color-text-primary) 50%, var(--color-text-primary) 75%);
  }

  .skeleton-circle {
    background: var(--color-text-primary);
  }
}
</style>
