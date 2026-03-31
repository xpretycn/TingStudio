<template>
  <div class="formula-detail" v-loading="loading">
    <template v-if="!loading && data">
      <!-- 顶部返回栏 -->
      <div class="detail-header">
        <div class="header-left">
          <t-button variant="text" @click="handleBack">
            <template #icon><t-icon name="chevron-left" /></template>返回
          </t-button>
          <span class="detail-title">配方详情 - {{ data.formulaName }}</span>
        </div>
        <t-button variant="text" size="medium" @click="router.push(`/formulas/${route.params.id}/edit`)">
          <template #icon><t-icon name="edit" /></template>
          编辑
        </t-button>
      </div>

      <!-- 营养数据缺失警告 -->
      <t-alert
        v-if="missingMaterials.length > 0"
        :theme="missingMaterials.length === data.calcRows?.length ? 'warning' : 'info'"
        class="nutrition-warning"
      >
        <template #message>
          {{ missingMaterials.length === data.calcRows?.length
            ? '以下原料尚未录入营养数据，营养成分表无法计算：'
            : '以下原料营养数据缺失，计算结果可能不准确：'
          }}
          <t-tag v-for="name in missingMaterials" :key="name" theme="warning" variant="light" size="small" style="margin: 2px 4px 2px 0;">
            {{ name }}
          </t-tag>
        </template>
      </t-alert>

      <!-- 表1: 营养成分表计算表格 -->
      <div class="table-card">
        <div class="table-title-row">
          <span class="formula-name">{{ data.formulaName }}</span>
        </div>
        <div class="formula-info-row">
          <span>成品重量：<b class="highlight-weight">{{ data.finishedWeight }}g</b></span>
        </div>
        <div class="table-title-row">
          <span class="table-title">营养成分表计算表格</span>
        </div>
        <t-table
          v-if="missingMaterials.length < data.calcRows?.length"
          :data="calcTableData"
          :columns="calcColumns"
          row-key="name"
          size="small"
          bordered
          stripe
          table-layout="auto"
        >
          <template #ratio="{ row }">
            <template v-if="typeof row.ratio === 'number'">{{ (row.ratio * 100).toFixed(2) }}%</template>
            <template v-else>{{ row.ratio }}</template>
          </template>
          <template #name="{ row }">
            <span :class="{ 'missing-nutrition': row.hasEmptyNutrition }">
              {{ row.name }}
              <t-icon v-if="row.hasEmptyNutrition" name="error-circle" class="missing-nutrition-icon" />
            </span>
          </template>
        </t-table>
        <t-empty v-else description="请先为原料录入营养数据后再查看营养成分表" />
      </div>

      <!-- 表2: 营养成分表 + 技术处理依据 -->
      <div v-if="missingMaterials.length < data.calcRows?.length" class="table-card">
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
          table-layout="auto"
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
const missingMaterials = computed<string[]>(() => {
  return data.value?.missingNutritionMaterials || []
})

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
    // axios 拦截器已经提取了 res.data，所以这里直接使用 res
    data.value = res
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
    justify-content: space-between;
    margin-bottom: $space-4;

    .header-left {
      display: flex;
      align-items: center;
      gap: $space-3;
    }

    .detail-title {
      font-size: $font-size-h3;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }
  }

  .table-card {
    background: $overlay-white-92;
    border-radius: $radius-2xl;
    border: 1.5px solid $overlay-pink-lighter-20;
    box-shadow: $shadow-md;
    padding: $space-5 $space-6;
    margin-bottom: $space-5;
  }

  .table-title-row {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: $space-3;

    .formula-name {
      font-size: $font-size-h4;
      font-weight: $font-weight-bold;
      color: $text-primary;
    }

    .table-title {
      font-size: 15px;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    .nutrition-label-title {
      color: $color-info;
    }

    .tech-basis-title {
      color: $color-warning;
    }
  }

  .formula-info-row {
    display: flex;
    gap: $space-8;
    justify-content: center;
    margin-bottom: $space-2;
    font-size: $font-size-body-sm;
    color: $text-regular;

    b {
      color: $text-primary;
    }

    .highlight-weight {
      color: $color-warning;
      font-weight: $font-weight-bold;
      font-size: 15px;
      background: linear-gradient(135deg, $color-warning-light, $color-info-light);
      padding: 2px $space-2;
      border-radius: $radius-sm;
      border: 1px solid rgba($color-warning, 0.25);
    }
  }

  .nutrition-warning {
    margin-bottom: $space-4;
    border-radius: $radius-lg;
  }

  .missing-nutrition {
    color: $color-warning;
  }

  .missing-nutrition-icon {
    color: $color-warning-orange;
    margin-left: $space-1;
  }

  .dual-title {
    display: flex;
    gap: 60px;
    justify-content: center;
  }

  // 技术处理依据列（第5、6列）着色
  :deep(.t-table) {
    font-size: $font-size-body-sm;

    .t-table__row--level-0:last-child {
      font-weight: $font-weight-semibold;
    }

    // 0界限值列
    th:nth-child(5),
    td:nth-child(5) {
      background-color: $color-warning-light !important;
    }

    // 允许误差范围列
    th:nth-child(6),
    td:nth-child(6) {
      background-color: $color-warning-medium !important;
    }

    // 表头加深
    th:nth-child(5),
    th:nth-child(6) {
      color: $color-warning;
      font-weight: $font-weight-semibold;
    }
  }

  .notes-card {
    background: $overlay-white-92;
    border-radius: $radius-2xl;
    border: 1.5px solid $overlay-pink-lighter-20;
    box-shadow: $shadow-md;
    padding: $space-4 $space-6;

    .notes-title {
      font-size: $font-size-body;
      font-weight: $font-weight-semibold;
      color: $text-primary;
      margin-bottom: $space-2;
    }

    .notes-item {
      font-size: $font-size-body-sm;
      color: $text-secondary;
      line-height: 1.8;
    }
  }
}
</style>
