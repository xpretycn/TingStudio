<template>
  <div class="formula-detail" v-loading="loading">
    <template v-if="!loading && data">
      <!-- 顶部返回栏 -->
      <div class="detail-header">
        <t-button variant="text" @click="handleBack">
          <template #icon><t-icon name="chevron-left" /></template>返回
        </t-button>
        <span class="detail-title">配方详情 - {{ data.formulaName }}</span>
      </div>

      <!-- 表1: 营养成分表计算表格 -->
      <div class="table-card">
        <div class="table-title-row">
          <span class="formula-name">{{ data.formulaName }}</span>
        </div>
        <div class="formula-info-row">
          <span>成品重量：<b>{{ data.finishedWeight }}g</b></span>
          <span>含量比系数：<b>{{ data.ratioFactor }}</b></span>
        </div>
        <div class="table-title-row">
          <span class="table-title">营养成分表计算表格</span>
        </div>
        <t-table
          :data="calcTableData"
          :columns="calcColumns"
          row-key="name"
          size="small"
          bordered
          stripe
        >
          <template #ratio="{ row }">
            <template v-if="typeof row.ratio === 'number'">{{ (row.ratio * 100).toFixed(2) }}%</template>
            <template v-else>{{ row.ratio }}</template>
          </template>
        </t-table>
      </div>

      <!-- 表2: 营养成分表 + 技术处理依据 -->
      <div class="table-card">
        <div class="table-title-row">
          <span class="formula-name">{{ data.formulaName }}</span>
        </div>
        <div class="table-title-row">
          <div class="dual-title">
            <span class="table-title nutrition-label-title">营养成分表</span>
            <span class="table-title tech-basis-title">技术处理依据</span>
          </div>
        </div>
        <t-table
          :data="data.labelRows"
          :columns="labelColumns"
          row-key="item"
          size="small"
          bordered
          stripe
        >
          <template #nrvPercent="{ row }">
            {{ row.nrvPercent.toFixed(2) }}
          </template>
        </t-table>
      </div>

      <!-- 使用说明 -->
      <div class="notes-card">
        <div class="notes-title">使用说明：</div>
        <div class="notes-item">(1)含量比指原料在成品中含量比</div>
        <div class="notes-item">(2)每100g原料中营养素值通过中国食物成分表或原料营养标签或自检测中查找</div>
        <div class="notes-item">(3)营养素参考值(NRV)在GB 28050附录A查找</div>
        <div class="notes-item">(4)只需输入配料重量和各配料营养素值就可自动计算出营养成分表</div>
        <div class="notes-item">(5)通过技术处理就可以得出正式营养成分表</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { nutritionApi } from '@/api/nutrition'

const router = useRouter()
const route = useRoute()

const loading = ref(false)
const data = ref<any>(null)

const calcColumns = [
  { colKey: 'name', title: '原料名', width: 140 },
  { colKey: 'quantity', title: '配方(g)', width: 100 },
  { colKey: 'ratio', title: '含量比', width: 90, cell: 'ratio' },  // displayed as xx.xx%
  { colKey: 'energy', title: '能量(kJ/100g)', width: 130 },
  { colKey: 'protein', title: '蛋白质(g/100g)', width: 140 },
  { colKey: 'fat', title: '脂肪(g/100g)', width: 130 },
  { colKey: 'carbohydrate', title: '碳水化合物(g/100g)', width: 170 },
  { colKey: 'sodium', title: '钠(mg/100g)', width: 140 },
]

const labelColumns = [
  { colKey: 'item', title: '项目', width: 110 },
  { colKey: 'value', title: '每100克(g)', width: 110 },
  { colKey: 'unit', title: '', width: 120 },
  { colKey: 'nrvPercent', title: '营养素参考值%', width: 120 },
  { colKey: 'zeroThreshold', title: '0界限值', width: 130 },
  { colKey: 'tolerance', title: '允许误差范围', width: 140 },
]

const calcTableData = computed(() => {
  if (!data.value) return []
  return [
    ...data.value.calcRows,
    { name: '', quantity: '', ratio: '', energy: '', protein: '', fat: '', carbohydrate: '', sodium: '', _isEmpty: true },
    data.value.summaryRow,
    data.value.nrvRow,
    data.value.nrvPercentRow,
  ]
})

const handleBack = () => router.push('/formulas')

const loadData = async () => {
  loading.value = true
  try {
    const res = await nutritionApi.getFormulaNutritionTables(route.params.id as string)
    data.value = res.data
  } catch (error: any) {
    console.error('获取营养计算表格失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped lang="scss">
.formula-detail {
  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    .detail-title {
      font-size: 16px;
      font-weight: 600;
      color: #5D4E60;
    }
  }

  .table-card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 14px;
    border: 1.5px solid rgba(255, 181, 200, 0.2);
    box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);
    padding: 20px 24px;
    margin-bottom: 20px;
  }

  .table-title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;

    .formula-name {
      font-size: 18px;
      font-weight: 700;
      color: #5D4E60;
    }

    .table-title {
      font-size: 15px;
      font-weight: 600;
      color: #5D4E60;
    }

    .nutrition-label-title {
      color: #3A7BD5;
    }

    .tech-basis-title {
      color: #E8703A;
    }
  }

  .formula-info-row {
    display: flex;
    gap: 32px;
    justify-content: center;
    margin-bottom: 8px;
    font-size: 13px;
    color: #8B7E96;

    b {
      color: #5D4E60;
    }
  }

  .dual-title {
    display: flex;
    gap: 60px;
    justify-content: center;
  }

  // 技术处理依据列（第5、6列）着色
  :deep(.t-table) {
    font-size: 13px;

    .t-table__row--level-0:last-child {
      font-weight: 600;
    }

    // 0界限值列
    th:nth-child(5),
    td:nth-child(5) {
      background-color: rgba(232, 112, 58, 0.06) !important;
    }

    // 允许误差范围列
    th:nth-child(6),
    td:nth-child(6) {
      background-color: rgba(232, 112, 58, 0.1) !important;
    }

    // 表头加深
    th:nth-child(5),
    th:nth-child(6) {
      color: #E8703A;
      font-weight: 600;
    }
  }

  .notes-card {
    background: rgba(255, 255, 255, 0.92);
    border-radius: 14px;
    border: 1.5px solid rgba(255, 181, 200, 0.2);
    box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);
    padding: 16px 24px;

    .notes-title {
      font-size: 14px;
      font-weight: 600;
      color: #5D4E60;
      margin-bottom: 8px;
    }

    .notes-item {
      font-size: 13px;
      color: #9B8FA0;
      line-height: 1.8;
    }
  }
}
</style>
