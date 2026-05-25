<template>
  <div class="chart-container">
    <div v-if="title" class="chart-title">{{ title }}</div>
    <div class="chart-wrapper" :style="{ height: height + 'px' }">
      <div v-if="loading" class="chart-loading">
        <t-loading size="small" />
      </div>
      <div v-else-if="!hasData" class="chart-empty">
        <span class="chart-empty-text">{{ emptyText }}</span>
      </div>
      <div v-else ref="chartRef" class="chart-canvas" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { EChartsType, EChartsOption } from 'echarts'

const props = withDefaults(defineProps<{
  title?: string
  height?: number
  loading?: boolean
  option?: EChartsOption
  emptyText?: string
}>(), {
  title: '',
  height: 300,
  loading: false,
  emptyText: '暂无图表数据',
})

const chartRef = ref<HTMLElement | null>(null)
let chartInstance: EChartsType | null = null

const hasData = computed(() => {
  return props.option && Object.keys(props.option).length > 0
})

const initChart = async () => {
  if (!chartRef.value || !hasData.value) return
  try {
    const echarts = await import('echarts')
    if (chartInstance) {
      chartInstance.dispose()
    }
    chartInstance = echarts.init(chartRef.value) as EChartsType
    if (props.option) {
      chartInstance.setOption(props.option)
    }
  } catch {
    // ECharts not available in Phase 1
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

watch(() => props.option, () => {
  if (chartInstance && props.option) {
    chartInstance.setOption(props.option)
  } else {
    initChart()
  }
}, { deep: true })

watch(() => props.loading, (val) => {
  if (!val && hasData.value) {
    setTimeout(initChart, 100)
  }
})

onMounted(() => {
  if (!props.loading && hasData.value) {
    setTimeout(initChart, 100)
  }
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

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.chart-container {
  background: #fff;
  border-radius: var(--radius-4xl);
  border: 1px solid #f1f5f9;
  box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  padding: 20px;

  .chart-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin-bottom: 16px;
  }
}

.chart-wrapper {
  position: relative;
  width: 100%;
}

.chart-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;

  .chart-empty-text {
    font-size: 13px;
    color: var(--color-text-placeholder);
  }
}

.chart-canvas {
  width: 100%;
  height: 100%;
}
</style>
