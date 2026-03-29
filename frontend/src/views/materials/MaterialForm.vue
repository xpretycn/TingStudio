<template>
  <div class="material-form">
    <t-card bordered>
      <template #header>
        <div class="form-header">
          <t-button variant="text" @click="handleBack">
            <template #icon>
              <t-icon name="chevron-left" />
            </template>
            返回
          </t-button>
          <span class="form-title">{{ isEdit ? '编辑原料' : '新增原料' }}</span>
        </div>
      </template>

      <t-form
        ref="formRef"
        :data="formData"
        :rules="rules"
        label-width="100px"
        @submit="handleSubmit"
      >
        <t-form-item label="原料编码" name="code">
          <t-input
            v-model="formData.code"
            placeholder="请输入原料编码"
            clearable
          />
        </t-form-item>

        <t-form-item label="原料类型" name="materialType">
          <t-radio-group v-model="formData.materialType">
            <t-radio value="herb">药材</t-radio>
            <t-radio value="supplement">辅料</t-radio>
          </t-radio-group>
        </t-form-item>

        <t-form-item label="原料名称" name="name">
          <t-input
            v-model="formData.name"
            placeholder="请输入原料名称"
            clearable
          />
        </t-form-item>

        <t-form-item label="单位" name="unit">
          <t-select
            v-model="formData.unit"
            placeholder="请选择单位"
            :options="unitOptions"
            clearable
          />
        </t-form-item>

        <t-form-item label="库存数量" name="stock">
          <t-input-number
            v-model="formData.stock"
            :min="0"
            placeholder="请输入库存数量"
            style="width: 200px"
          />
        </t-form-item>

        <!-- 营养成分录入 -->
        <div v-if="showNutrition" class="nutrition-section">
          <div class="section-title">
            <t-icon name="chart-bar" size="18px" />
            <span>营养成分（每100g）</span>
            <t-tag v-if="hasNutrition" theme="success" variant="light" size="small">已录入</t-tag>
          </div>

          <div class="nutrition-grid">
            <t-form-item
              v-for="field in nutritionFields"
              :key="field.key"
              :label="field.label"
            >
              <div class="nutrition-input">
                <t-input-number
                  v-model="nutritionData[field.key]"
                  :min="0"
                  :decimal-places="field.decimals"
                  :placeholder="field.placeholder"
                  theme="normal"
                  style="width: 160px"
                />
                <span class="nutrition-unit">{{ field.unit }}</span>
              </div>
            </t-form-item>
          </div>

          <t-form-item label="数据来源">
            <t-input
              v-model="nutritionMeta.dataSource"
              placeholder="如：中国食物成分表（第6版）"
              clearable
              style="width: 320px"
            />
          </t-form-item>

          <t-form-item label="备注">
            <t-input
              v-model="nutritionMeta.notes"
              placeholder="可选备注信息"
              clearable
              style="width: 320px"
            />
          </t-form-item>
        </div>

        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit" :loading="loading">
              {{ isEdit ? '保存' : '创建' }}
            </t-button>
            <t-button v-if="isEdit && !showNutrition" theme="default" @click="showNutrition = true">
              <template #icon><t-icon name="add" /></template>
              录入营养成分
            </t-button>
            <t-button v-if="showNutrition" theme="default" @click="handleClearNutrition">
              清空营养数据
            </t-button>
            <t-button theme="default" @click="handleBack">取消</t-button>
          </t-space>
        </t-form-item>
      </t-form>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMaterialStore } from '@/stores/material'
import { nutritionApi } from '@/api/nutrition'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const materialStore = useMaterialStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)
const showNutrition = ref(false)
const hasNutrition = ref(false)

const isEdit = computed(() => !!route.params.id)

const formData = reactive<any>({
  code: '',
  name: '',
  unit: '',
  stock: 0,
  materialType: 'herb',
})

const unitOptions = [
  { label: '千克 (kg)', value: 'kg' },
  { label: '克 (g)', value: 'g' },
  { label: '升 (L)', value: 'L' },
  { label: '毫升 (mL)', value: 'mL' },
  { label: '个', value: '个' },
  { label: '件', value: '件' },
  { label: '包', value: '包' },
  { label: '箱', value: '箱' }
]

const rules: Record<string, FormRule[]> = {
  code: [
    { required: true, message: '请输入原料编码' },
    { pattern: /^[A-Z0-9-]+$/, message: '编码只能包含大写字母、数字和横线' }
  ],
  name: [
    { required: true, message: '请输入原料名称' },
    { min: 2, message: '原料名称至少2个字符' }
  ],
  unit: [{ required: true, message: '请选择单位' }],
  stock: [{ required: true, message: '请输入库存数量' }]
}

// 营养成分字段定义
const nutritionFields = [
  { key: 'energy', label: '能量', unit: 'kJ', decimals: 1, placeholder: '千焦' },
  { key: 'protein', label: '蛋白质', unit: 'g', decimals: 2, placeholder: '克' },
  { key: 'fat', label: '脂肪', unit: 'g', decimals: 2, placeholder: '克' },
  { key: 'carbohydrate', label: '碳水化合物', unit: 'g', decimals: 2, placeholder: '克' },
  { key: 'fiber', label: '膳食纤维', unit: 'g', decimals: 2, placeholder: '克' },
  { key: 'sugars', label: '糖', unit: 'g', decimals: 2, placeholder: '克' },
  { key: 'sodium', label: '钠', unit: 'mg', decimals: 1, placeholder: '毫克' },
  { key: 'potassium', label: '钾', unit: 'mg', decimals: 1, placeholder: '毫克' },
  { key: 'calcium', label: '钙', unit: 'mg', decimals: 1, placeholder: '毫克' },
  { key: 'iron', label: '铁', unit: 'mg', decimals: 2, placeholder: '毫克' },
  { key: 'zinc', label: '锌', unit: 'mg', decimals: 2, placeholder: '毫克' },
  { key: 'magnesium', label: '镁', unit: 'mg', decimals: 1, placeholder: '毫克' },
  { key: 'phosphorus', label: '磷', unit: 'mg', decimals: 1, placeholder: '毫克' },
  { key: 'vitaminA', label: '维生素A', unit: 'μg RE', decimals: 1, placeholder: '微克视黄醇当量' },
  { key: 'vitaminC', label: '维生素C', unit: 'mg', decimals: 2, placeholder: '毫克' },
  { key: 'vitaminD', label: '维生素D', unit: 'μg', decimals: 2, placeholder: '微克' },
  { key: 'vitaminE', label: '维生素E', unit: 'mg α-TE', decimals: 2, placeholder: '毫克' },
  { key: 'vitaminB1', label: '维生素B1', unit: 'mg', decimals: 3, placeholder: '毫克' },
  { key: 'vitaminB2', label: '维生素B2', unit: 'mg', decimals: 3, placeholder: '毫克' },
  { key: 'vitaminB3', label: '烟酸(B3)', unit: 'mg', decimals: 2, placeholder: '毫克' },
  { key: 'vitaminB6', label: '维生素B6', unit: 'mg', decimals: 3, placeholder: '毫克' },
  { key: 'vitaminB12', label: '维生素B12', unit: 'μg', decimals: 2, placeholder: '微克' },
  { key: 'folate', label: '叶酸', unit: 'μg DFE', decimals: 1, placeholder: '微克' },
  { key: 'cholesterol', label: '胆固醇', unit: 'mg', decimals: 1, placeholder: '毫克' },
  { key: 'saturatedFat', label: '饱和脂肪', unit: 'g', decimals: 2, placeholder: '克' },
  { key: 'transFat', label: '反式脂肪', unit: 'g', decimals: 2, placeholder: '克' },
]

const nutritionData = reactive<Record<string, number>>(
  Object.fromEntries(nutritionFields.map(f => [f.key, 0]))
)
const nutritionMeta = reactive({
  dataSource: '',
  notes: '',
})

const handleClearNutrition = () => {
  for (const field of nutritionFields) {
    nutritionData[field.key] = 0
  }
  nutritionMeta.dataSource = ''
  nutritionMeta.notes = ''
}

const buildPer100g = (): Record<string, number> => {
  const result: Record<string, number> = {}
  for (const field of nutritionFields) {
    const val = nutritionData[field.key]
    if (val !== undefined && val !== null && val > 0) {
      result[field.key] = val
    }
  }
  return result
}

const saveNutrition = async (materialId: string) => {
  const per100g = buildPer100g()
  if (Object.keys(per100g).length === 0) return

  try {
    await nutritionApi.setMaterialNutrition(materialId, {
      per100g,
      dataSource: nutritionMeta.dataSource || undefined,
      notes: nutritionMeta.notes || undefined,
    })
  } catch (error: any) {
    console.error('保存营养成分失败:', error)
  }
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    loading.value = true
    try {
      const id = route.params.id as string
      let result

      if (isEdit.value && id) {
        result = await materialStore.updateMaterial(id, formData)
      } else {
        result = await materialStore.createMaterial(formData)
      }

      if (result.success) {
        // 保存营养数据
        if (showNutrition.value) {
          const materialId = isEdit.value ? id : (result as any).data?.id
          if (materialId) {
            await saveNutrition(materialId)
          }
        }
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功')
        router.push('/materials')
      } else {
        MessagePlugin.error(result.message || '操作失败')
      }
    } finally {
      loading.value = false
    }
  }
}

const handleBack = () => {
  router.push('/materials')
}

const loadNutrition = async (materialId: string) => {
  try {
    // http 拦截器已解包 response.data，res 直接是 { success, data } 结构
    const res = await nutritionApi.getMaterialNutrition(materialId) as any
    if (res?.success && res?.data) {
      const data = res.data
      hasNutrition.value = true
      const per100g = data.per100g || {}
      for (const key of Object.keys(per100g)) {
        if (per100g[key] !== undefined && per100g[key] !== null) {
          nutritionData[key] = Number(per100g[key])
        }
      }
      if (data.dataSource) nutritionMeta.dataSource = data.dataSource
      if (data.notes) nutritionMeta.notes = data.notes
    }
  } catch {
    // no nutrition data yet, which is fine
  }
}

onMounted(async () => {
  const id = route.params.id as string
  if (isEdit.value && id) {
    const material = await materialStore.getMaterial(id)
    if (material) {
      Object.assign(formData, {
        code: material.code,
        name: material.name,
        unit: material.unit,
        stock: material.stock,
        materialType: material.materialType || 'herb',
      })
      // 加载已有营养数据（不自动展开，只标记状态）
      await loadNutrition(id)
    }
  } else {
    // 新建时默认展开营养录入
    showNutrition.value = true
  }
})
</script>

<style scoped lang="scss">
.material-form {
  .form-header {
    display: flex;
    align-items: center;
    gap: 12px;

    .form-title {
      font-size: 16px;
      font-weight: 600;
      color: #5D4E60;
    }
  }

  .nutrition-section {
    margin-top: 16px;
    padding: 20px;
    background: linear-gradient(135deg, #FFF9F7 0%, #FFF5FB 100%);
    border-radius: 14px;
    border: 1.5px solid rgba(255, 181, 200, 0.2);

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 700;
      color: #5D4E60;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 181, 200, 0.15);
    }

    .nutrition-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 24px;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .nutrition-input {
      display: flex;
      align-items: center;
      gap: 8px;

      .nutrition-unit {
        flex-shrink: 0;
        font-size: 12px;
        color: #9B8FA0;
        background: rgba(255, 255, 255, 0.7);
        padding: 4px 10px;
        border-radius: 8px;
        white-space: nowrap;
        min-width: 60px;
        text-align: center;
      }
    }
  }
}
</style>
