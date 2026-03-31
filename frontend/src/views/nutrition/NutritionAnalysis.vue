<template>
  <div class="nutrition-analysis">
    <PageSkeleton v-if="!initialized" type="cards" :rows="3" />
    <div v-else>
    <!-- 选择器区域 -->
    <t-card class="content-card" bordered>
      <template #header>
        <div class="section-header">
          <span>配方营养分析</span>
        </div>
      </template>

      <t-form :data="analysisForm" layout="inline" @submit="handleAnalyze">
        <t-form-item label="选择配方">
          <t-select
            v-model="analysisForm.formulaId"
            placeholder="请选择配方"
            filterable
            clearable
            style="width: 300px"
          >
            <t-option
              v-for="f in formulaStore.formulas"
              :key="f.id"
              :value="f.id"
              :label="`${f.name} (${f.salesmanName})`"
            />
          </t-select>
        </t-form-item>
        <t-form-item label="营养标准">
          <t-select
            v-model="analysisForm.profileId"
            placeholder="可选，选择后进行合规检查"
            clearable
            style="width: 220px"
          >
            <t-option
              v-for="p in nutritionStore.profiles"
              :key="p.profileId"
              :value="p.profileId"
              :label="`${p.name} (${categoryLabel(p.category)})`"
            />
          </t-select>
        </t-form-item>
        <t-form-item>
          <t-space :size="8">
            <t-button theme="primary" type="submit" :loading="analyzing">
              <template #icon><t-icon name="chart" /></template>计算营养成分
            </t-button>
            <t-button
              v-if="nutritionStore.formulaNutrition?.per100gNutrition"
              theme="default"
              :loading="checking"
              @click="handleCheckCompliance"
            >
              <template #icon><t-icon name="check-circle" /></template>合规检查
            </t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>

    <!-- 营养分析结果 -->
    <t-card v-if="nutritionStore.formulaNutrition && analysisForm.formulaId" class="content-card" bordered style="margin-top: 16px;">
      <template #header>
        <div class="section-header">
          <span>营养成分计算结果</span>
          <t-tag theme="success" variant="light" size="medium">
            <template #icon><t-icon name="check-circle" /></template>计算完成
          </t-tag>
        </div>
      </template>

      <t-descriptions :column="2" bordered size="medium" title="配方信息">
        <t-descriptions-item label="配方名称">{{ nutritionStore.formulaNutrition.formulaName }}</t-descriptions-item>
        <t-descriptions-item label="总重量">{{ nutritionStore.formulaNutrition.totalWeight ?? '-' }} g</t-descriptions-item>
      </t-descriptions>

      <!-- 7.2.1 核心营养素卡片式布局 -->
      <div class="core-nutrition-section">
        <h4 class="section-title">
          <t-icon name="dashboard" size="18px" />
          <span>核心营养素（每100g）</span>
        </h4>
        <div class="nutrition-cards">
          <div
            v-for="card in coreNutritionCards"
            :key="card.key"
            class="nutrition-card"
            :class="card.statusClass"
          >
            <div class="card-header">
              <div class="card-icon" :style="{ background: card.iconBg }">
                <t-icon :name="card.icon" size="24px" />
              </div>
              <div class="card-title">{{ card.label }}</div>
            </div>
            <div class="card-value">
              <span class="value-number">{{ card.value }}</span>
              <span class="value-unit">{{ card.unit }}</span>
            </div>
            <!-- 7.2.2 NRV占比进度条 -->
            <div class="card-progress">
              <div class="progress-header">
                <span class="nrv-label">NRV占比</span>
                <span class="nrv-percent" :style="{ color: card.progressColor }">{{ card.nrvPercent }}%</span>
              </div>
              <t-progress
                :percentage="card.nrvPercent"
                :color="card.progressColor"
                :stroke-width="8"
                :show-label="false"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 7.2.3 原料贡献明细 -->
      <div v-if="materialBreakdown.length" class="contribution-section">
        <h4 class="section-title">
          <t-icon name="chart-pie" size="18px" />
          <span>原料营养贡献明细</span>
        </h4>
        <t-table
          :data="materialBreakdown"
          :columns="contributionColumns"
          row-key="materialId"
          size="small"
          bordered
          stripe
          max-height="400"
        >
          <template #materialName="{ row }">
            <div class="material-name-cell">
              <span>{{ row.materialName }}</span>
              <t-tag v-if="row.noNutritionData" theme="danger" variant="light" size="small">缺营养数据</t-tag>
            </div>
          </template>
          <template #percentage="{ row }">
            <div class="percentage-cell">
              <span class="percentage-value">{{ row.percentage }}%</span>
              <t-progress
                :percentage="row.percentage"
                color="#FF8FAB"
                :stroke-width="6"
                :show-label="false"
                style="width: 60px; margin-left: 8px;"
              />
            </div>
          </template>
          <template #nutritionContribution="{ row }">
            <t-popup placement="left" :disabled="!row.hasNutritionData">
              <template #content>
                <div class="nutrition-popup">
                  <div v-for="item in row.nutritionDetails" :key="item.key" class="nutrition-item">
                    <span class="item-label">{{ item.label }}:</span>
                    <span class="item-value">{{ item.value }} {{ item.unit }}</span>
                  </div>
                </div>
              </template>
              <t-button size="small" variant="text" :disabled="!row.hasNutritionData">
                <template #icon><t-icon name="view-list" /></template>
                查看详情
              </t-button>
            </t-popup>
          </template>
        </t-table>
      </div>

      <!-- 详细营养数据表格 -->
      <div class="nutrition-table-section">
        <h4 class="section-title">
          <t-icon name="view-list" size="18px" />
          <span>完整营养成分</span>
        </h4>
        <t-table
          :data="nutritionDataList"
          :columns="nutritionColumns"
          row-key="nutrient"
          size="small"
          bordered
          stripe
        >
          <template #value="{ row }">
            <span :class="{ 'over-limit': row.overLimit }">{{ row.value }}</span>
          </template>
        </t-table>
      </div>
    </t-card>

    <!-- 合规检查结果（独立 card，避免嵌套条件渲染问题） -->
    <t-card v-if="nutritionStore.complianceResult && nutritionStore.formulaNutrition" class="content-card" bordered style="margin-top: 16px;">
      <template #header>
        <div class="section-header">
          <span>合规检查结果</span>
          <t-tag :theme="nutritionStore.complianceResult.summary?.failed === 0 ? 'success' : 'warning'" variant="light" size="medium">
            <template #icon><t-icon name="check-circle" /></template>检查完成
          </t-tag>
        </div>
      </template>
      <!-- 7.3.3 汇总统计展示 -->
      <div class="compliance-summary">
        <div class="summary-item pass">
          <div class="summary-icon">🟢</div>
          <div class="summary-content">
            <span class="summary-count">{{ nutritionStore.complianceResult.summary?.passed || 0 }}</span>
            <span class="summary-label">达标</span>
          </div>
        </div>
        <div class="summary-item warning">
          <div class="summary-icon">🟡</div>
          <div class="summary-content">
            <span class="summary-count">{{ nutritionStore.complianceResult.summary?.warnings || 0 }}</span>
            <span class="summary-label">警告</span>
          </div>
        </div>
        <div class="summary-item fail">
          <div class="summary-icon">🔴</div>
          <div class="summary-content">
            <span class="summary-count">{{ nutritionStore.complianceResult.summary?.failed || 0 }}</span>
            <span class="summary-label">超标</span>
          </div>
        </div>
      </div>
      <t-alert
        :theme="nutritionStore.complianceResult.summary?.failed === 0 ? 'success' : 'warning'"
        :message="nutritionStore.complianceResult.summary?.failed === 0 ? '配方符合所选营养标准要求' : `配方有 ${nutritionStore.complianceResult.summary?.failed} 项指标不达标`"
        style="margin-bottom: 12px;"
      />
      <t-table
        v-if="nutritionStore.complianceResult?.complianceCheck?.length"
        :data="complianceDataList"
        :columns="complianceColumns"
        row-key="field"
        size="small"
        bordered
      >
        <template #status="{ row }">
          <t-tag :theme="row.status === 'pass' ? 'success' : row.status === 'warning' ? 'warning' : 'danger'" variant="light">
            {{ row.status === 'pass' ? '达标' : row.status === 'warning' ? '警告' : '超标' }}
          </t-tag>
        </template>
      </t-table>
    </t-card>

    <!-- 空状态 -->
    <t-card v-else-if="!nutritionStore.formulaNutrition || !analysisForm.formulaId" class="content-card empty-card" bordered style="margin-top: 16px;">
      <t-empty description="请选择一个配方进行营养分析">
        <template #action>
          <t-button theme="primary" @click="$router.push('/formulas')">
            <template #icon><t-icon name="chart" /></template>前往配方管理
          </t-button>
        </template>
      </t-empty>
    </t-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useFormulaStore } from '@/stores/formula'
import { useNutritionStore } from '@/stores/nutrition'
import { MessagePlugin } from 'tdesign-vue-next'
import PageSkeleton from '@/components/Skeleton/PageSkeleton.vue'

const formulaStore = useFormulaStore()
const nutritionStore = useNutritionStore()

const initialized = ref(false)

const analysisForm = reactive({ formulaId: '', profileId: '' })
const analyzing = ref(false)
const checking = ref(false)

const categoryMap: Record<string, string> = {
  infant: '婴幼儿', child: '儿童', adult: '成人', elderly: '老年', pregnant: '孕妇', special: '特殊'
}
const categoryLabel = (c: string) => categoryMap[c] || c

const nutrientInfoMap: Record<string, [string, string]> = {
  energy: ['能量', 'kJ'], protein: ['蛋白质', 'g'], fat: ['脂肪', 'g'], carbohydrate: ['碳水化合物', 'g'],
  fiber: ['膳食纤维', 'g'], sugars: ['糖类', 'g'], sodium: ['钠', 'mg'], potassium: ['钾', 'mg'],
  calcium: ['钙', 'mg'], iron: ['铁', 'mg'], zinc: ['锌', 'mg'], magnesium: ['镁', 'mg'],
  phosphorus: ['磷', 'mg'], vitaminA: ['维生素A', 'μg'], vitaminC: ['维生素C', 'mg'],
  vitaminD: ['维生素D', 'μg'], vitaminE: ['维生素E', 'mg'], vitaminK: ['维生素K', 'μg'],
  vitaminB1: ['维生素B1', 'mg'], vitaminB2: ['维生素B2', 'mg'], vitaminB3: ['维生素B3', 'mg'],
  vitaminB6: ['维生素B6', 'mg'], vitaminB12: ['维生素B12', 'μg'], folate: ['叶酸', 'μg'],
  cholesterol: ['胆固醇', 'mg'], transFat: ['反式脂肪', 'g'], saturatedFat: ['饱和脂肪', 'g'],
}

// NRV 参考值（与后端一致）
const NRV: Record<string, number> = {
  energy: 8400, protein: 60, fat: 60, carbohydrate: 300, sodium: 2000,
}

// 核心营养素配置
const CORE_NUTRIENTS = [
  { key: 'energy', label: '能量', unit: 'kJ', icon: 'flashlight', iconBg: 'linear-gradient(135deg, #FFE066, #FFD700)' },
  { key: 'protein', label: '蛋白质', unit: 'g', icon: 'heart', iconBg: 'linear-gradient(135deg, #FF8FAB, #FF6B8A)' },
  { key: 'fat', label: '脂肪', unit: 'g', icon: 'drop', iconBg: 'linear-gradient(135deg, #A8E6CF, #7BC96F)' },
  { key: 'carbohydrate', label: '碳水化合物', unit: 'g', icon: 'chart-bar', iconBg: 'linear-gradient(135deg, #B8D4E3, #7EB6D9)' },
  { key: 'sodium', label: '钠', unit: 'mg', icon: 'tips', iconBg: 'linear-gradient(135deg, #DDA0DD, #BA55D3)' },
] as const

// 7.2.1 + 7.2.2 核心营养素卡片数据
interface NutritionCard {
  key: string
  label: string
  unit: string
  value: string
  icon: string
  iconBg: string
  nrvPercent: number
  progressColor: string
  statusClass: string
}

const coreNutritionCards = computed<NutritionCard[]>(() => {
  const per100g = nutritionStore.formulaNutrition?.per100gNutrition
  if (!per100g) return []

  return CORE_NUTRIENTS.map(nutrient => {
    const rawValue = per100g[nutrient.key] || 0
    const value = typeof rawValue === 'number' ? rawValue.toFixed(2) : String(rawValue)
    const nrv = NRV[nutrient.key] || 1
    const nrvPercent = Math.min(Math.round((rawValue / nrv) * 10000) / 100, 150)

    // 根据营养素类型和占比计算状态颜色
    let progressColor = '#FF8FAB'
    let statusClass = ''

    // 能量和钠：限制型营养素，低为好
    if (nutrient.key === 'energy' || nutrient.key === 'fat' || nutrient.key === 'sodium') {
      if (nrvPercent < 80) {
        progressColor = '#52C41A'
        statusClass = 'status-good'
      } else if (nrvPercent <= 120) {
        progressColor = '#FAAD14'
        statusClass = 'status-warning'
      } else {
        progressColor = '#FF4D4F'
        statusClass = 'status-danger'
      }
    }
    // 蛋白质和碳水化合物：推荐型营养素，高为好
    else {
      if (nrvPercent >= 80) {
        progressColor = '#52C41A'
        statusClass = 'status-good'
      } else if (nrvPercent >= 50) {
        progressColor = '#FAAD14'
        statusClass = 'status-warning'
      } else {
        progressColor = '#FF4D4F'
        statusClass = 'status-danger'
      }
    }

    return {
      key: nutrient.key,
      label: nutrient.label,
      unit: nutrient.unit,
      value,
      icon: nutrient.icon,
      iconBg: nutrient.iconBg,
      nrvPercent,
      progressColor,
      statusClass,
    }
  })
})

// 7.2.3 原料贡献明细
const contributionColumns = [
  { colKey: 'materialName', title: '原料名称', width: 200, ellipsis: true },
  { colKey: 'quantity', title: '用量(g)', width: 100 },
  { colKey: 'percentage', title: '重量占比', width: 180 },
  { colKey: 'nutritionContribution', title: '营养贡献', width: 120 },
]

interface MaterialBreakdownRow {
  materialId: string
  materialName: string
  quantity: number
  percentage: number
  hasNutritionData: boolean
  noNutritionData: boolean
  nutritionDetails: Array<{ key: string; label: string; value: string; unit: string }>
}

const materialBreakdown = computed<MaterialBreakdownRow[]>(() => {
  const breakdown = nutritionStore.formulaNutrition?.materialBreakdown
  if (!breakdown || !Array.isArray(breakdown)) return []

  return breakdown.map((item: any) => {
    const hasNutritionData = item.nutritionContribution && Object.keys(item.nutritionContribution).length > 0
    const noNutritionData = !hasNutritionData || (item.nutritionContribution && Object.values(item.nutritionContribution).every((v: any) => v === 0))

    // 构建营养贡献详情
    const nutritionDetails: Array<{ key: string; label: string; value: string; unit: string }> = []
    if (item.nutritionContribution) {
      for (const [key, val] of Object.entries(item.nutritionContribution)) {
        const info = nutrientInfoMap[key]
        if (info && val && Number(val) > 0) {
          nutritionDetails.push({
            key,
            label: info[0],
            value: Number(val).toFixed(2),
            unit: info[1],
          })
        }
      }
    }

    return {
      materialId: item.materialId || item.materialName,
      materialName: item.materialName,
      quantity: item.quantity || 0,
      percentage: Math.round(item.percentage * 100) / 100,
      hasNutritionData: nutritionDetails.length > 0,
      noNutritionData,
      nutritionDetails,
    }
  })
})

const nutritionDataList = computed(() => {
  if (!nutritionStore.formulaNutrition?.per100gNutrition) return []
  return Object.entries(nutritionStore.formulaNutrition.per100gNutrition)
    .map(([key, value]) => {
      const [name, unit] = nutrientInfoMap[key] || [key, '']
      return {
        nutrient: name,
        value: typeof value === 'number' ? value.toFixed(2) : String(value),
        unit,
        overLimit: false
      }
    })
})

const nutritionColumns = [
  { colKey: 'nutrient', title: '营养成分', width: 200 },
  { colKey: 'value', title: '含量', width: 150 },
  { colKey: 'unit', title: '单位', width: 100 },
]

const complianceColumns = [
  { colKey: 'label', title: '营养成分', width: 150 },
  { colKey: 'actualValue', title: '实际值', width: 120 },
  { colKey: 'status', title: '状态', width: 100 },
  { colKey: 'message', title: '说明', width: 300 }
]

const complianceDataList = computed(() => {
  if (!nutritionStore.complianceResult?.complianceCheck) return []
  return nutritionStore.complianceResult.complianceCheck.map((item: any) => ({
    ...item,
    actualValue: typeof item.actualValue === 'number' ? item.actualValue.toFixed(2) : String(item.actualValue),
  }))
})

const handleAnalyze = async () => {
  if (!analysisForm.formulaId) {
    MessagePlugin.warning('请选择配方')
    return
  }
  analyzing.value = true
  nutritionStore.formulaNutrition = null
  nutritionStore.complianceResult = null
  const result = await nutritionStore.calculateFormulaNutrition(analysisForm.formulaId)
  analyzing.value = false
  if (!result.success) MessagePlugin.error(result.message || '计算失败')
}

const handleCheckCompliance = async () => {
  if (!analysisForm.formulaId) return
  checking.value = true
  nutritionStore.complianceResult = null
  const result = await nutritionStore.checkCompliance(
    analysisForm.formulaId,
    analysisForm.profileId || undefined
  )
  checking.value = false
  if (!result.success) {
    MessagePlugin.error(result.message || '合规检查失败')
  }
}

// 监听配方选择变化，当取消选择或切换时清除计算结果
watch(
  () => analysisForm.formulaId,
  (newFormulaId, oldFormulaId) => {
    // 如果配方 ID 变为空或被修改，清除之前的计算结果
    if (!newFormulaId || newFormulaId !== oldFormulaId) {
      nutritionStore.formulaNutrition = null
      nutritionStore.complianceResult = null
    }
  }
)

onMounted(async () => {
  await Promise.all([
    formulaStore.fetchFormulas(),
    nutritionStore.fetchProfiles()
  ])
  initialized.value = true
})
</script>

<style scoped lang="scss">
.nutrition-analysis {
  .section-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .content-card {
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.06);
    &:hover { box-shadow: 0 4px 20px rgba(255, 107, 138, 0.1); }
  }
  .empty-card {
    min-height: 300px;
    display: flex; align-items: center; justify-content: center;
  }

  // 统一 section 标题样式
  .section-title {
    margin: 0 0 16px 0;
    font-size: 15px;
    font-weight: 600;
    color: #5D4E60;
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 181, 200, 0.2);

    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 16px;
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
      border-radius: 2px;
    }
  }

  // 7.2.1 核心营养素卡片布局
  .core-nutrition-section {
    margin-top: 24px;
    padding: 20px;
    background: linear-gradient(135deg, #FFF9F7 0%, #FFF5FB 100%);
    border-radius: 14px;
    border: 1.5px solid rgba(255, 181, 200, 0.2);
  }

  .nutrition-cards {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;

    @media (max-width: 1200px) {
      grid-template-columns: repeat(3, 1fr);
    }
    @media (max-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
    }
    @media (max-width: 480px) {
      grid-template-columns: 1fr;
    }
  }

  .nutrition-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(255, 107, 138, 0.08);
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 181, 200, 0.15);

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(255, 107, 138, 0.15);
    }

    &.status-good {
      border-color: rgba(82, 196, 26, 0.3);
      .card-header .card-icon { box-shadow: 0 4px 12px rgba(82, 196, 26, 0.25); }
    }
    &.status-warning {
      border-color: rgba(250, 173, 20, 0.3);
      .card-header .card-icon { box-shadow: 0 4px 12px rgba(250, 173, 20, 0.25); }
    }
    &.status-danger {
      border-color: rgba(255, 77, 79, 0.3);
      .card-header .card-icon { box-shadow: 0 4px 12px rgba(255, 77, 79, 0.25); }
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;

      .card-icon {
        width: 40px;
        height: 40px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      .card-title {
        font-size: 14px;
        font-weight: 600;
        color: #5D4E60;
      }
    }

    .card-value {
      margin-bottom: 12px;

      .value-number {
        font-size: 24px;
        font-weight: 700;
        color: #2D2D2D;
        margin-right: 4px;
      }

      .value-unit {
        font-size: 12px;
        color: #9B8FA0;
      }
    }

    // 7.2.2 进度条样式
    .card-progress {
      .progress-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 6px;

        .nrv-label {
          font-size: 11px;
          color: #9B8FA0;
        }

        .nrv-percent {
          font-size: 13px;
          font-weight: 600;
        }
      }
    }
  }

  // 7.2.3 原料贡献明细
  .contribution-section {
    margin-top: 24px;
    padding: 20px;
    background: #fff;
    border-radius: 14px;
    border: 1px solid rgba(255, 181, 200, 0.15);
  }

  .material-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .percentage-cell {
    display: flex;
    align-items: center;

    .percentage-value {
      font-weight: 600;
      color: #5D4E60;
      min-width: 50px;
    }
  }

  .nutrition-popup {
    padding: 8px 4px;
    max-height: 300px;
    overflow-y: auto;

    .nutrition-item {
      padding: 4px 0;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      font-size: 12px;

      .item-label {
        color: #9B8FA0;
      }

      .item-value {
        color: #2D2D2D;
        font-weight: 500;
      }
    }
  }

  .nutrition-table-section, .compliance-section {
    margin-top: 20px;
  }

  // 7.3.3 合规检查汇总统计
  .compliance-summary {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #F8F9FA 0%, #F1F3F4 100%);
    border-radius: 12px;

    .summary-item {
      display: flex;
      align-items: center;
      gap: 10px;

      .summary-icon {
        font-size: 20px;
      }

      .summary-content {
        display: flex;
        flex-direction: column;

        .summary-count {
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
        }

        .summary-label {
          font-size: 12px;
          color: #9B8FA0;
        }
      }

      &.pass .summary-count { color: #52C41A; }
      &.warning .summary-count { color: #FAAD14; }
      &.fail .summary-count { color: #FF4D4F; }
    }
  }

  .over-limit { color: #E34D59; font-weight: 600; }
  :deep(.t-button) {
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
    border-radius: 12px !important; font-weight: 600 !important;
    &.t-button--theme-primary {
      background: linear-gradient(135deg, #FF8FAB, #FF6B8A) !important;
      border: none !important; color: #fff !important;
      box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3) !important;
      &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255, 107, 138, 0.4) !important; }
    }
    &.t-button--theme-default {
      background: rgba(255, 255, 255, 0.9) !important;
      border: 2px solid #FFD6E0 !important; color: #5D4E60 !important;
      &:hover { border-color: #FF8FAB !important; color: #FF6B8A !important; }
    }
  }
}
</style>
