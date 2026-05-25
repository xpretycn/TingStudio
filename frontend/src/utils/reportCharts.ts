import type { EChartsOption } from 'echarts'

const reportChartPalette = [
  '#10B981',
  '#3B82F6',
  '#F59E0B',
  '#8B5CF6',
  '#EF4444',
  '#06B6D4',
  '#6366F1',
  '#EC4899',
]

const baseChartConfig = {
  color: reportChartPalette,
  tooltip: {
    trigger: 'axis' as const,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    textStyle: { color: '#334155', fontSize: 13 },
    padding: [12, 16],
    extraCssText: 'border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);',
  },
  legend: {
    bottom: 0,
    textStyle: { color: '#64748B', fontSize: 12 },
    itemWidth: 12,
    itemHeight: 12,
    itemGap: 20,
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '14%',
    top: '10%',
    containLabel: true,
  },
}

export function buildDailyFormulaTrendChart(data: Array<{ date: string; new: number; completed: number }>): EChartsOption {
  return {
    ...baseChartConfig,
    title: { text: '每日配方新增/完成趋势', left: 'center', top: 0, textStyle: { fontSize: 13, fontWeight: 600, color: '#334155', padding: [8, 0, 0, 0] } },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(5)),
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
      { name: '新增', type: 'bar', data: data.map(d => d.new), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '完成', type: 'bar', data: data.map(d => d.completed), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
    ],
  }
}

export function buildStatusDistributionChart(data: Array<{ status: string; count: number }>): EChartsOption {
  const hasManyItems = data.length > 6
  return {
    color: reportChartPalette,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: hasManyItems
      ? { orient: 'vertical' as const, right: 0, top: 'middle', textStyle: { color: '#64748B', fontSize: 11 } }
      : { bottom: 0, textStyle: { color: '#64748B', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: hasManyItems ? ['35%', '50%'] : ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.map(d => ({ name: d.status, value: d.count })),
    }],
  }
}

export function buildDailySalesTrendChart(data: Array<{ date: string; quantity: number; revenue: number }>): EChartsOption {
  return {
    ...baseChartConfig,
    title: { text: '每日销量/销售额趋势', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date.substring(5)),
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
      { name: '销量', type: 'bar', data: data.map(d => d.quantity), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '销售额', type: 'line', yAxisIndex: 1, data: data.map(d => d.revenue), smooth: true, lineStyle: { width: 2 }, symbolSize: 6 },
    ],
  }
}

export function buildTopFormulasChart(data: Array<{ formulaName: string; totalQuantity: number; totalRevenue: number }>): EChartsOption {
  const sorted = [...data].sort((a, b) => a.totalQuantity - b.totalQuantity)
  return {
    ...baseChartConfig,
    title: { text: '热销配方 TOP5', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
    grid: { left: '3%', right: '10%', bottom: '5%', top: '15%', containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#F1F5F9', type: 'dashed' } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(d => d.formulaName?.substring(0, 6) || ''),
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#334155', fontSize: 12 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(d => d.totalQuantity),
      barWidth: '50%',
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', fontSize: 11, color: '#64748B', formatter: '{c}' },
    }],
  }
}

export function buildWeeklyComparisonChart(data: Array<{ week: string; quantity: number; revenue: number }>): EChartsOption {
  return {
    ...baseChartConfig,
    title: { text: '近4周销量趋势', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
    xAxis: {
      type: 'category',
      data: data.map(d => d.week),
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
      { name: '销量', type: 'line', data: data.map(d => d.quantity), smooth: true, lineStyle: { width: 2 }, symbolSize: 6, areaStyle: { opacity: 0.1 } },
      { name: '销售额', type: 'line', yAxisIndex: 1, data: data.map(d => d.revenue), smooth: true, lineStyle: { width: 2 }, symbolSize: 6, areaStyle: { opacity: 0.1 } },
    ],
  }
}

export function buildMonthlyTrendChart(data: Array<{ month: string; quantity: number; revenue: number; formulaCount: number }>): EChartsOption {
  return {
    ...baseChartConfig,
    title: { text: '近6个月趋势', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
    xAxis: {
      type: 'category',
      data: data.map(d => d.month),
      axisLine: { lineStyle: { color: '#E2E8F0' } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
    },
    yAxis: [
      {
        type: 'value',
        name: '销量/配方数',
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
      { name: '销量', type: 'bar', data: data.map(d => d.quantity), barWidth: '20%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '配方数', type: 'bar', data: data.map(d => d.formulaCount), barWidth: '20%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '销售额', type: 'line', yAxisIndex: 1, data: data.map(d => d.revenue), smooth: true, lineStyle: { width: 2 }, symbolSize: 6 },
    ],
  }
}

export function buildFormulaTypeDistributionChart(data: Array<{ type: string; quantity: number; revenue: number }>): EChartsOption {
  const hasManyItems = data.length > 6
  return {
    color: reportChartPalette,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: hasManyItems
      ? { orient: 'vertical' as const, right: 0, top: 'middle', textStyle: { color: '#64748B', fontSize: 11 } }
      : { bottom: 0, textStyle: { color: '#64748B', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: hasManyItems ? ['35%', '50%'] : ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 8, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' } },
      data: data.map(d => ({ name: d.type?.substring(0, 8) || '其他', value: d.revenue })),
    }],
  }
}

export function buildWeeklyBreakdownChart(data: Array<{ week: string; quantity: number; revenue: number }>): EChartsOption {
  return {
    ...baseChartConfig,
    title: { text: '各周销量对比', left: 'center', textStyle: { fontSize: 14, fontWeight: 600, color: '#334155' } },
    xAxis: {
      type: 'category',
      data: data.map(d => d.week),
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
      { name: '销量', type: 'bar', data: data.map(d => d.quantity), barWidth: '30%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '销售额', type: 'line', yAxisIndex: 1, data: data.map(d => d.revenue), smooth: true, lineStyle: { width: 2 }, symbolSize: 6 },
    ],
  }
}

