<template>
  <div class="report-compare">
    <Transition name="content-fade" mode="out-in">
      <div :key="initialized ? 'content' : 'skeleton'">
        <PageSkeleton v-if="!initialized && !loadError" type="detail" :rows="5" :columns="7" />

        <template v-else>
          <div v-if="loadError" class="error-state">
            <div class="error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"
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
                    <span class="breadcrumb-current">报告对比</span>
                  </nav>
                  <h2 class="detail-title">报告对比分析</h2>
                </div>
              </div>
            </header>

            <section class="compare-dashboard" v-if="comparisonMetrics.length">
              <div class="compare-metrics-grid">
                <div class="compare-metric-card" v-for="metric in comparisonMetrics" :key="metric.label">
                  <div class="metric-label">{{ metric.label }}</div>
                  <div class="metric-values">
                    <div class="metric-side">
                      <span class="metric-value">{{ metric.value1 }}</span>
                      <span class="metric-unit">{{ metric.unit }}</span>
                    </div>
                    <div class="metric-diff" :class="metric.diffClass">
                      <svg v-if="metric.diff > 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                      <svg v-else-if="metric.diff < 0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                      <span>{{ metric.diffPercent }}</span>
                    </div>
                    <div class="metric-side">
                      <span class="metric-value">{{ metric.value2 }}</span>
                      <span class="metric-unit">{{ metric.unit }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div class="compare-sections">
              <div class="report-section-card" :style="{ borderLeftColor: '#3B82F6' }">
                <div class="section-header">
                  <div class="section-title-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <h3 class="section-title">配方数据对比</h3>
                  </div>
                </div>
                <div class="section-body">
                  <div class="chart-row">
                    <div class="chart-container" style="flex: 100%;">
                      <div ref="formulaCompareChartRef" style="width:100%; height:350px;"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="report-section-card" :style="{ borderLeftColor: '#10B981' }">
                <div class="section-header">
                  <div class="section-title-group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="1" x2="12" y2="23" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                    <h3 class="section-title">销售数据对比</h3>
                  </div>
                </div>
                <div class="section-body">
                  <div class="chart-row">
                    <div class="chart-container" style="flex: 100%;">
                      <div ref="salesCompareChartRef" style="width:100%; height:350px;"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReportStore } from '@/stores/report'
import * as echarts from 'echarts'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'
import type { Report } from '@/api/report'

const route = useRoute()
const router = useRouter()
const reportStore = useReportStore()

const initialized = ref(false)
const loadError = ref('')

const report1 = ref<Report | null>(null)
const report2 = ref<Report | null>(null)

const reportData1 = computed(() => {
  if (!report1.value?.dataJson) return null
  if (typeof report1.value.dataJson === 'string') {
    try { return JSON.parse(report1.value.dataJson) } catch { return null }
  }
  return report1.value.dataJson
})

const reportData2 = computed(() => {
  if (!report2.value?.dataJson) return null
  if (typeof report2.value.dataJson === 'string') {
    try { return JSON.parse(report2.value.dataJson) } catch { return null }
  }
  return report2.value.dataJson
})

const comparisonMetrics = computed(() => {
  const d1 = reportData1.value
  const d2 = reportData2.value
  if (!d1 || !d2) return []

  const calcDiff = (v1: number, v2: number) => {
    if (v2 === 0) return 0
    return ((v1 - v2) / Math.abs(v2)) * 100
  }

  const metrics = [
    { label: '新增配方', key1: 'newFormulas', key2: 'newFormulas', unit: '个' },
    { label: '完成配方', key1: 'completedFormulas', key2: 'completedFormulas', unit: '个' },
    { label: '销售总量', key1: 'totalQuantity', key2: 'totalQuantity', unit: '件' },
    { label: '销售额', key1: 'totalRevenue', key2: 'totalRevenue', unit: '万元', transform: (v: number) => (v / 10000).toFixed(1) },
  ]

  return metrics.map(m => {
    const raw1 = (d1 as any)[m.key1] ?? 0
    const raw2 = (d2 as any)[m.key2] ?? 0
    const v1 = m.transform ? m.transform(raw1) : raw1
    const v2 = m.transform ? m.transform(raw2) : raw2
    const diff = calcDiff(Number(raw1), Number(raw2))
    return {
      label: m.label,
      value1: v1,
      value2: v2,
      unit: m.unit,
      diff,
      diffPercent: diff !== 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : '0%',
      diffClass: diff > 0 ? 'diff-up' : diff < 0 ? 'diff-down' : 'diff-same',
    }
  })
})

const formulaCompareChartRef = ref<HTMLElement | null>(null)
const salesCompareChartRef = ref<HTMLElement | null>(null)
let formulaChartInstance: echarts.ECharts | null = null
let salesChartInstance: echarts.ECharts | null = null

const initCharts = () => {
  const d1 = reportData1.value
  const d2 = reportData2.value
  if (!d1 || !d2) return

  if (formulaCompareChartRef.value) {
    if (formulaChartInstance) formulaChartInstance.dispose()
    formulaChartInstance = echarts.init(formulaCompareChartRef.value)
    formulaChartInstance.setOption({
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#E2E8F0', borderWidth: 1, textStyle: { color: '#334155', fontSize: 13 } },
      legend: { bottom: 0, textStyle: { color: '#64748B', fontSize: 12 } },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
      title: { text: '配方数据对比', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
      xAxis: {
        type: 'category',
        data: ['新增配方', '完成配方', '配方总数'],
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
      },
      series: [
        { name: report1.value?.title || '报告1', type: 'bar', data: [d1.newFormulas ?? 0, d1.completedFormulas ?? 0, d1.totalFormulaCount ?? 0], barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#3B82F6' } },
        { name: report2.value?.title || '报告2', type: 'bar', data: [d2.newFormulas ?? 0, d2.completedFormulas ?? 0, d2.totalFormulaCount ?? 0], barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#10B981' } },
      ],
    })
  }

  if (salesCompareChartRef.value) {
    if (salesChartInstance) salesChartInstance.dispose()
    salesChartInstance = echarts.init(salesCompareChartRef.value)
    salesChartInstance.setOption({
      tooltip: { trigger: 'axis', backgroundColor: 'rgba(255,255,255,0.96)', borderColor: '#E2E8F0', borderWidth: 1, textStyle: { color: '#334155', fontSize: 13 } },
      legend: { bottom: 0, textStyle: { color: '#64748B', fontSize: 12 } },
      grid: { left: '3%', right: '4%', bottom: '14%', top: '10%', containLabel: true },
      title: { text: '销售数据对比', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
      xAxis: {
        type: 'category',
        data: ['销售总量', '销售额(万)'],
        axisLine: { lineStyle: { color: '#E2E8F0' } },
        axisLabel: { color: '#94A3B8', fontSize: 11 },
      },
      yAxis: [
        {
          type: 'value',
          name: '销量',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
          axisLabel: { color: '#94A3B8', fontSize: 11 },
        },
        {
          type: 'value',
          name: '销售额',
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { color: '#94A3B8', fontSize: 11 },
        },
      ],
      series: [
        { name: report1.value?.title || '报告1', type: 'bar', data: [d1.totalQuantity ?? 0, ((d1.totalRevenue ?? 0) / 10000).toFixed(1)], barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#3B82F6' } },
        { name: report2.value?.title || '报告2', type: 'bar', data: [d2.totalQuantity ?? 0, ((d2.totalRevenue ?? 0) / 10000).toFixed(1)], barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0], color: '#10B981' } },
      ],
    })
  }
}

const handleResize = () => {
  formulaChartInstance?.resize()
  salesChartInstance?.resize()
}

const goBack = () => {
  router.push('/reports')
}

const loadData = async () => {
  loadError.value = ''
  try {
    const id1 = route.query.id1 as string
    const id2 = route.query.id2 as string
    if (!id1 || !id2) {
      loadError.value = '缺少报告 ID 参数'
      return
    }
    const [r1, r2] = await Promise.all([
      reportStore.fetchReportById(id1),
      reportStore.fetchReportById(id2),
    ])
    report1.value = r1
    report2.value = r2
    if (r1 && r2) {
      await reportStore.compareReports(id1, id2)
    }
  } catch (e: any) {
    loadError.value = e.message || '加载失败，请稍后重试'
  }
}

const retryLoad = async () => {
  loadError.value = ''
  await loadData()
}

watch([report1, report2], () => {
  if (report1.value?.dataJson && report2.value?.dataJson) {
    nextTick(() => {
      initCharts()
    })
  }
}, { immediate: true })

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  try {
    await loadData()
  } catch (e: any) {
    loadError.value = e.message || '初始化失败'
  } finally {
    initialized.value = true
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  formulaChartInstance?.dispose()
  salesChartInstance?.dispose()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.report-compare {
  padding: 0;
  padding-bottom: 32px;
  animation: page-fade-in 0.4s ease;
}

@keyframes page-fade-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
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
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
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

      .detail-title {
        margin: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 18px;
        font-weight: 700;
        color: #1e293b;
        line-height: 1.35;
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

.compare-dashboard {
  margin-top: 24px;
  margin-bottom: 24px;

  .compare-metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 24px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }
}

.compare-metric-card {
  background: #fff;
  padding: 24px;
  border-radius: 24px;
  border: 1px solid #fff;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  transition: all $transition-slow;

  &:hover {
    border-color: #DBEAFE;
    transform: translateY(-2px);
    box-shadow: 0 14px 36px -6px rgba(0, 0, 0, 0.08);
  }

  .metric-label {
    font-size: 14px;
    color: #94A3B8;
    margin-bottom: 12px;
    text-align: center;
  }

  .metric-values {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .metric-side {
    flex: 1;
    text-align: center;
  }

  .metric-value {
    font-size: 20px;
    font-weight: 700;
    color: #0F172A;
    display: block;
  }

  .metric-unit {
    font-size: 12px;
    color: #94A3B8;
  }

  .metric-diff {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 8px;
    border-radius: 8px;
    white-space: nowrap;
    flex-shrink: 0;

    &.diff-up {
      color: #10B981;
      background: #ECFDF5;
    }

    &.diff-down {
      color: #EF4444;
      background: #FEF2F2;
    }

    &.diff-same {
      color: #94A3B8;
      background: #F8FAFC;
    }
  }
}

.compare-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
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
    border-color: #dbeafe;
  }

  .section-header {
    padding: 14px 20px;
    background: #F8FAFC;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    justify-content: space-between;
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

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
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
    color: #64748B;
    margin: 0 0 24px;
    max-width: 400px;
  }

  .retry-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 24px;
    border-radius: 12px;
    border: none;
    background: #3B82F6;
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #2563EB;
      transform: translateY(-1px);
    }
  }
}
</style>
