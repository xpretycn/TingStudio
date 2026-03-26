<template>
  <div class="nutrition-analysis">
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
    <t-card v-if="nutritionStore.formulaNutrition" class="content-card" bordered style="margin-top: 16px;">
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

      <div class="nutrition-table-section">
        <h4>每100g营养成分</h4>
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

      <!-- 合规检查结果 -->
      <div v-if="nutritionStore.complianceResult" class="compliance-section">
        <h4>合规检查结果</h4>
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
      </div>
    </t-card>

    <!-- 空状态 -->
    <t-card v-else class="content-card empty-card" bordered style="margin-top: 16px;">
      <t-empty description="请选择一个配方进行营养分析" />
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useFormulaStore } from '@/stores/formula'
import { useNutritionStore } from '@/stores/nutrition'
import { MessagePlugin } from 'tdesign-vue-next'

const formulaStore = useFormulaStore()
const nutritionStore = useNutritionStore()

const analysisForm = reactive({ formulaId: '', profileId: '' })
const analyzing = ref(false)
const checking = ref(false)

const categoryMap: Record<string, string> = {
  infant: '婴幼儿', child: '儿童', adult: '成人', elderly: '老年', pregnant: '孕妇', special: '特殊'
}
const categoryLabel = (c: string) => categoryMap[c] || c

const nutrientInfoMap: Record<string, [string, string]> = {
  energy: ['能量', 'kcal'], protein: ['蛋白质', 'g'], fat: ['脂肪', 'g'], carbohydrate: ['碳水化合物', 'g'],
  fiber: ['膳食纤维', 'g'], sugars: ['糖类', 'g'], sodium: ['钠', 'mg'], potassium: ['钾', 'mg'],
  calcium: ['钙', 'mg'], iron: ['铁', 'mg'], zinc: ['锌', 'mg'], magnesium: ['镁', 'mg'],
  phosphorus: ['磷', 'mg'], vitaminA: ['维生素A', 'μg'], vitaminC: ['维生素C', 'mg'],
  vitaminD: ['维生素D', 'μg'], vitaminE: ['维生素E', 'mg'], vitaminK: ['维生素K', 'μg'],
  vitaminB1: ['维生素B1', 'mg'], vitaminB2: ['维生素B2', 'mg'], vitaminB3: ['维生素B3', 'mg'],
  vitaminB6: ['维生素B6', 'mg'], vitaminB12: ['维生素B12', 'μg'], folate: ['叶酸', 'μg'],
  cholesterol: ['胆固醇', 'mg'], transFat: ['反式脂肪', 'g'], saturatedFat: ['饱和脂肪', 'g'],
}

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
  const result = await nutritionStore.checkCompliance(
    analysisForm.formulaId,
    analysisForm.profileId || undefined
  )
  checking.value = false
  if (!result.success) MessagePlugin.error(result.message || '合规检查失败')
}

onMounted(async () => {
  await Promise.all([
    formulaStore.fetchFormulas(),
    nutritionStore.fetchProfiles()
  ])
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
  .nutrition-table-section, .compliance-section {
    margin-top: 20px;
    h4 {
      margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #5D4E60;
      display: flex; align-items: center; gap: 6px;
      &::before {
        content: ''; display: inline-block; width: 4px; height: 16px;
        background: linear-gradient(135deg, #FF8FAB, #FF6B8A); border-radius: 2px;
      }
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
