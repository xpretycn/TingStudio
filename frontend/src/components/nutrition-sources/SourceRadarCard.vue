<template>
  <div class="radar-card">
    <div class="card-header">
      <h4 class="card-title">
        <t-icon name="chart" /> 来源形态对比
      </h4>
      <span class="card-hint">每项营养素按最高值归一化（=100%），柱顶显示真实数值</span>
    </div>
    <div v-if="!chartError" ref="chartRef" class="radar-canvas" :style="{ height: height + 'px' }"></div>
    <div v-if="chartError" class="radar-error">
      <t-empty description="图表加载失败" size="small" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import type { EChartsType, EChartsOption } from 'echarts'

interface RadarSeries {
  name: string
  values: number[]
  color: string
}

interface IndicatorMeta {
  label: string
  unit: string
}

const props = withDefaults(defineProps<{
  series: RadarSeries[]
  indicators: string[]
  /** 与 indicators 一一对应的单位 */
  units?: string[]
  height?: number
}>(), {
  height: 280,
  units: () => [],
})

const chartRef = ref<HTMLElement | null>(null)
const chartError = ref(false)
let chartInstance: EChartsType | null = null

function getChartColors(): string[] {
  const root = document.documentElement
  const style = getComputedStyle(root)
  return [
    style.getPropertyValue('--color-primary').trim() || '#10b981',
    style.getPropertyValue('--color-info').trim() || '#3b82f6',
    style.getPropertyValue('--color-warning').trim() || '#f59e0b',
    style.getPropertyValue('--color-danger').trim() || '#ef4444',
    style.getPropertyValue('--color-success').trim() || '#10b981',
    style.getPropertyValue('--color-primary-light').trim() || '#34d399',
  ]
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** 每个营养指标内独立做归一化（最大值=100），同时保留原始真实值用于标签展示 */
const normalizedSeries = computed(() => {
  const indicators = props.indicators
  const indicatorCount = indicators.length
  // indicatorMax[i] = 所有来源在第 i 个指标上的最大值
  const indicatorMax: number[] = new Array(indicatorCount).fill(0)
  for (const s of props.series) {
    for (let i = 0; i < indicatorCount; i++) {
      const v = s.values[i] ?? 0
      if (v > indicatorMax[i]) indicatorMax[i] = v
    }
  }
  return props.series.map((s) => {
    const normalized: number[] = []
    const ratios: number[] = []
    for (let i = 0; i < indicatorCount; i++) {
      const raw = s.values[i] ?? 0
      const max = indicatorMax[i] || 1
      const r = (raw / max) * 100
      normalized.push(Number(r.toFixed(1)))
      ratios.push(r)
    }
    return {
      ...s,
      normalized,
      ratios,
    }
  })
})

const buildOption = (): EChartsOption => {
  const root = document.documentElement
  const style = getComputedStyle(root)
  const textColor = style.getPropertyValue('--color-text-secondary').trim() || '#6b7280'
  const borderColor = style.getPropertyValue('--color-border').trim() || '#e5e7eb'
  const bgColor = style.getPropertyValue('--color-bg-container').trim() || '#ffffff'
  const textPrimary = style.getPropertyValue('--color-text-primary').trim() || '#1f2937'
  const chartColors = getChartColors()
  const series = normalizedSeries.value

  return {
    grid: { top: 30, left: 36, right: 16, bottom: 56, containLabel: true },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: hexToRgba(bgColor, 0.96),
      borderColor,
      textStyle: { color: textPrimary, fontSize: 12 },
      confine: true,
      formatter: (params: unknown) => {
        const list = (Array.isArray(params) ? params : [params]) as Array<{
          seriesName: string
          value: number
          color: string
          dataIndex: number
          axisValue: string
        }>
        const first = list[0]
        const idx = first.dataIndex ?? 0
        const axisLabel = first.axisValue ?? ''
        const unit = props.units[idx] ?? ''
        let html = `<div style="font-weight:600;margin-bottom:6px;">${axisLabel}${unit ? `<span style="color:${textColor};font-weight:400;">（${unit}/100g）</span>` : ''}</div>`
        for (const item of list) {
          const src = series.find((s) => s.name === item.seriesName)
          const raw = src?.values?.[idx] ?? 0
          const ratio = (item.value ?? 0).toFixed(0)
          const rawText = Number.isInteger(raw) ? String(raw) : raw.toFixed(1)
          html += `<div style="display:flex;align-items:center;gap:6px;line-height:1.7;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:2px;background:${item.color};"></span>
            <span style="min-width:80px;">${item.seriesName}</span>
            <span style="margin-left:auto;font-weight:600;">${rawText} ${unit}</span>
            <span style="color:${textColor};font-size:11px;">${ratio}%</span>
          </div>`
        }
        return html
      },
    },
    legend: {
      bottom: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: textColor },
    },
    xAxis: {
      type: 'category',
      data: props.indicators,
      axisLine: { lineStyle: { color: borderColor } },
      axisTick: { show: false },
      axisLabel: {
        color: textColor,
        fontSize: 11,
        interval: 0,
        formatter: (val: string) => {
          // 长单位挤一挤
          return val.length > 3 ? val : val
        },
      },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: 'rgba(128, 128, 128, 0.08)' } },
      axisLabel: {
        color: textColor,
        fontSize: 10,
        formatter: (val: number) => `${val}%`,
      },
    },
    series: series.map((s, i) => {
      const color = s.color || chartColors[i % chartColors.length]
      return {
        name: s.name,
        type: 'bar',
        barMaxWidth: 28,
        data: s.normalized,
        itemStyle: {
          color,
          borderRadius: [4, 4, 0, 0],
        },
        emphasis: {
          itemStyle: { color, opacity: 0.85 },
        },
        // 柱顶显示真实数值（默认隐藏，hover 高亮时显示）
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: textPrimary,
          formatter: (params: { dataIndex: number; value: number }) => {
            const raw = s.values[params.dataIndex] ?? 0
            const unit = props.units[params.dataIndex] ?? ''
            // 控制浮点位数
            const text = Number.isInteger(raw) ? raw : raw.toFixed(1)
            return `${text}${unit}`
          },
        },
      }
    }),
  }
}

const initChart = async () => {
  if (!chartRef.value) return
  try {
    const echarts = await import('echarts')
    if (chartInstance) chartInstance.dispose()
    chartInstance = echarts.init(chartRef.value) as EChartsType
    chartInstance.setOption(buildOption())
    chartError.value = false
  } catch (err) {
    chartError.value = true
    console.warn('[Radar] ECharts init failed', err)
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(
  () => [props.series, props.indicators, props.units],
  () => {
    if (chartInstance) {
      chartInstance.setOption(buildOption(), true)
    } else {
      nextTick(initChart)
    }
  },
  { deep: true },
)

onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
})
</script>

<style lang="scss" scoped>
.radar-card {
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: $radius-xl;
  padding: $space-3 $space-4;
  // 兜底：即使 ECharts tooltip 渲染到容器外，也不让 card 撑大溢出
  overflow: hidden;
  min-width: 0;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-2;
  flex-wrap: wrap;
  gap: $space-1;
}

.card-title {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  margin: 0;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: var(--color-text-primary);
}

.card-hint {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
}

.radar-canvas {
  width: 100%;
  min-height: 200px;
  // 防止 ECharts 实例超出 card 边界
  position: relative;
  overflow: hidden;
}

.radar-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
