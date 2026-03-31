<template>
  <div class="material-detail">
    <t-card bordered v-if="material">
      <template #header>
        <div class="detail-header">
          <div class="header-left">
            <t-button variant="text" @click="handleBack">
              <template #icon><t-icon name="chevron-left" /></template>返回
            </t-button>
            <span class="detail-title">原料详情 - {{ material.name }}</span>
            <t-tag v-if="material.materialType === 'supplement'" theme="primary" variant="light-outline">辅料</t-tag>
            <t-tag v-else theme="success" variant="light-outline">药材</t-tag>
            <t-tag :theme="(material.stock ?? 0) > 0 ? 'success' : 'danger'" variant="light">
              库存 {{ material.stock ?? 0 }} {{ material.unit }}
            </t-tag>
          </div>
          <t-button variant="text" size="medium" @click="router.push(`/materials/${route.params.id}/edit`)">
            <template #icon><t-icon name="edit" /></template>
            编辑
          </t-button>
        </div>
      </template>

      <t-descriptions :column="2" bordered size="medium">
        <t-descriptions-item label="原料编码">{{ material.code }}</t-descriptions-item>
        <t-descriptions-item label="原料名称">{{ material.name }}</t-descriptions-item>
        <t-descriptions-item label="原料类型">
          <t-tag v-if="material.materialType === 'supplement'" theme="primary" variant="light-outline" size="small">辅料</t-tag>
          <t-tag v-else theme="success" variant="light-outline" size="small">药材</t-tag>
        </t-descriptions-item>
        <t-descriptions-item label="单位">{{ material.unit || '-' }}</t-descriptions-item>
        <t-descriptions-item label="库存">
          <t-tag :theme="(material.stock ?? 0) > 0 ? 'success' : 'danger'" size="small">
            {{ material.stock ?? 0 }} {{ material.unit }}
          </t-tag>
        </t-descriptions-item>
        <t-descriptions-item label="创建时间">{{ material.createdAt }}</t-descriptions-item>
        <t-descriptions-item label="更新时间">{{ material.updatedAt }}</t-descriptions-item>
      </t-descriptions>

      <div class="nutrition-section">
        <div class="nutrition-header">
          <h4>营养成分（每100g）</h4>
          <div v-if="nutritionMeta.dataSource" class="nutrition-meta">
            <t-tag theme="default" variant="light" size="small">
              <template #icon><t-icon name="books" /></template>
              {{ nutritionMeta.dataSource }}
            </t-tag>
            <t-tag
              :theme="confidenceTheme"
              variant="light"
              size="small"
            >
              <template #icon><t-icon name="checked" /></template>
              {{ confidenceLabel }}
            </t-tag>
          </div>
        </div>
        <div v-if="nutritionLoading" style="text-align: center; padding: 24px;">
          <t-loading />
        </div>
        <t-table
          v-else-if="nutritionData.length"
          :data="nutritionData"
          :columns="nutritionColumns"
          row-key="nutrient"
          size="small"
          bordered
          stripe
        />
        <t-empty v-else description="暂无营养数据" />
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMaterialStore } from '@/stores/material'
import { useNutritionStore } from '@/stores/nutrition'

const router = useRouter()
const route = useRoute()
const materialStore = useMaterialStore()
const nutritionStore = useNutritionStore()

const material = ref<any>(null)
const nutritionLoading = ref(false)
const nutritionData = ref<any[]>([])
const nutritionMeta = reactive({
  dataSource: '',
  confidence: 'medium' as 'high' | 'medium' | 'low',
})

const confidenceMap: Record<string, { label: string; theme: 'success' | 'warning' | 'default' }> = {
  high: { label: '高可信度', theme: 'success' },
  medium: { label: '中可信度', theme: 'warning' },
  low: { label: '低可信度', theme: 'default' },
}

const confidenceLabel = computed(() => confidenceMap[nutritionMeta.confidence]?.label || '中可信度')
const confidenceTheme = computed(() => confidenceMap[nutritionMeta.confidence]?.theme || 'warning')

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

const nutritionColumns = [
  { colKey: 'nutrient', title: '营养成分', width: 200 },
  { colKey: 'value', title: '含量', width: 150 },
  { colKey: 'unit', title: '单位', width: 100 },
]

const handleBack = () => router.push('/materials')

const loadData = async () => {
  const id = route.params.id as string
  material.value = await materialStore.getMaterial(id)

  nutritionLoading.value = true
  try {
    const res = await nutritionStore.getMaterialNutrition(id)
    // axios 拦截器已经提取了 res.data，res 直接是营养数据对象
    if (res.success && res.data?.per100g) {
      nutritionData.value = Object.entries(res.data.per100g)
        .filter(([, value]) => value > 0)
        .map(([key, value]) => {
          const [name, unit] = nutrientInfoMap[key] || [key, '']
          return {
            nutrient: name,
            value: typeof value === 'number' ? value.toFixed(2) : String(value),
            unit,
          }
        })
      // 加载元数据
      if (res.data.dataSource) nutritionMeta.dataSource = res.data.dataSource
      if (res.data.confidence) nutritionMeta.confidence = res.data.confidence
    }
  } catch {
    // 营养数据获取失败不阻塞页面展示
  } finally {
    nutritionLoading.value = false
  }
}

onMounted(() => { loadData() })
</script>

<style scoped lang="scss">
.material-detail {
  .detail-header {
    display: flex; align-items: center; justify-content: space-between; width: 100%;
    .header-left { display: flex; align-items: center; gap: 12px; }
    .detail-title { font-size: 16px; font-weight: 600; color: #5D4E60; }
  }

  .nutrition-section {
    margin-top: 20px;

    .nutrition-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #5D4E60;
      display: flex;
      align-items: center;
      gap: 6px;

      &::before {
        content: '';
        display: inline-block;
        width: 4px;
        height: 16px;
        background: linear-gradient(135deg, #FF8FAB, #FF6B8A);
        border-radius: 2px;
      }
    }

    .nutrition-meta {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}
</style>
