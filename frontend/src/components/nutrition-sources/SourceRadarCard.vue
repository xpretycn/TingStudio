<template>
  <div class="radar-card">
    <div class="card-header">
      <h4 class="card-title">
        <t-icon name="chart" /> 来源形态对比
      </h4>
      <span class="card-hint">径向轴 = 各来源在 6 维营养指标上的归一化值</span>
    </div>
    <div v-if="!chartError" ref="chartRef" class="radar-canvas" :style="{ height: height + 'px' }"></div>
    <div v-if="chartError" class="radar-error">
      <t-empty description="图表加载失败" size="small" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { EChartsType, EChartsOption } from 'echarts'

interface RadarSeries {
  name: string
  values: number[]
  color: string
}

const props = withDefaults(defineProps<{
  series: RadarSeries[]
  indicators: string[]
  height?: number
  maxValue?: number
}>(), {
  height: 280,
  maxValue: 100,
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

const buildOption = (): EChartsOption => {
  const max = props.maxValue
  const root = document.documentElement
  const style = getComputedStyle(root)
  const textColor = style.getPropertyValue('--color-text-secondary').trim() || '#6b7280'
  const borderColor = style.getPropertyValue('--color-border-light').trim() || '#e5e7eb'
  const bgColor = style.getPropertyValue('--color-bg-container').trim() || '#ffffff'
  const textPrimary = style.getPropertyValue('--color-text-primary').trim() || '#1f2937'
  const primaryColor = style.getPropertyValue('--color-primary').trim() || '#10b981'
  const chartColors = getChartColors()
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: hexToRgba(bgColor, 0.95),
      borderColor,
      textStyle: { color: textPrimary, fontSize: 12 },
    },
    legend: {
      bottom: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: textColor },
    },
    radar: {
      indicator: props.indicators.map((name) => ({ name, max })),
      shape: 'polygon',
      splitNumber: 5,
      axisName: {
        color: textColor,
        fontSize: 11,
      },
      splitLine: {
        lineStyle: { color: 'rgba(128, 128, 128, 0.06)' },
      },
      splitArea: {
        areaStyle: {
          color: [hexToRgba(primaryColor, 0.02), hexToRgba(primaryColor, 0.04)],
        },
      },
      axisLine: {
        lineStyle: { color: 'rgba(128, 128, 128, 0.08)' },
      },
    },
    series: [
      {
        type: 'radar',
        symbol: 'circle',
        symbolSize: 5,
        data: props.series.map((s, i) => ({
          name: s.name,
          value: s.values,
          areaStyle: {
            color: s.color || chartColors[i % chartColors.length],
            opacity: 0.18,
          },
          lineStyle: {
            color: s.color || chartColors[i % chartColors.length],
            width: 2,
          },
          itemStyle: {
            color: s.color || chartColors[i % chartColors.length],
          },
        })),
      },
    ],
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
  () => [props.series, props.indicators, props.maxValue],
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
  background: $bg-container;
  border: 1px solid $border-color-light;
  border-radius: $radius-xl;
  padding: $space-3 $space-4;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: $space-2;
}

.card-title {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  margin: 0;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-semibold;
  color: $text-primary;
}

.card-hint {
  font-size: $font-size-caption;
  color: $text-tertiary;
}

.radar-canvas {
  width: 100%;
  min-height: 200px;
}

.radar-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
</style>
