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
        scroll-to-first-error
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
            <div class="title-left">
              <t-icon name="chart-bar" size="18px" />
              <span>营养成分（每100g）</span>
              <t-tag v-if="hasNutrition" theme="success" variant="light" size="small">已录入</t-tag>
            </div>
            <div class="title-actions">
              <t-button size="small" variant="text" @click="expandAllGroups">
                <template #icon><t-icon name="unfold-more" /></template>
                展开全部
              </t-button>
              <t-button size="small" variant="text" @click="collapseAllGroups">
                <template #icon><t-icon name="unfold-less" /></template>
                收起全部
              </t-button>
            </div>
          </div>

          <!-- 分组折叠面板 -->
          <t-collapse
            :value="Object.keys(collapseExpanded).filter(k => collapseExpanded[k])"
            @change="handleCollapseChange"
          >
            <t-collapse-panel
              v-for="group in nutritionFieldGroups"
              :key="group.title"
              :value="group.title"
            >
              <template #header>
                <div class="group-header">
                  <t-icon :name="group.icon" size="16px" />
                  <span>{{ group.title }}</span>
                  <t-tag size="small" variant="light" theme="default">
                    {{ group.fields.length }}项
                  </t-tag>
                </div>
              </template>
              <div class="nutrition-grid">
                <t-form-item
                  v-for="field in group.fields"
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
            </t-collapse-panel>
          </t-collapse>

          <div class="nutrition-meta">
            <t-form-item label="数据来源">
              <t-input
                v-model="nutritionMeta.dataSource"
                placeholder="如：中国食物成分表（第6版）"
                clearable
                style="width: 320px"
              />
            </t-form-item>

            <t-form-item label="数据可信度">
              <t-radio-group v-model="nutritionMeta.confidence" variant="default-filled">
                <t-radio-button
                  v-for="opt in confidenceOptions"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </t-radio-button>
              </t-radio-group>
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
    { required: true, message: '请输入原料编码', trigger: 'blur' },
    { pattern: /^[A-Z0-9-]+$/, message: '编码只能包含大写字母、数字和横线', trigger: 'change' },
  ],
  name: [
    { required: true, message: '请输入原料名称', trigger: 'blur' },
    { min: 2, message: '原料名称至少2个字符', trigger: 'change' },
  ],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  stock: [{ required: true, message: '请输入库存数量', trigger: 'blur' }],
}

// 营养成分字段定义（按组分类）
const nutritionFieldGroups = [
  {
    title: '基础营养成分',
    icon: 'chart-bar',
    expanded: true,
    fields: [
      { key: 'energy', label: '能量', unit: 'kJ', decimals: 1, placeholder: '千焦' },
      { key: 'protein', label: '蛋白质', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'fat', label: '脂肪', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'carbohydrate', label: '碳水化合物', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'fiber', label: '膳食纤维', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'sugars', label: '糖', unit: 'g', decimals: 2, placeholder: '克' },
    ]
  },
  {
    title: '矿物质',
    icon: 'layers',
    expanded: false,
    fields: [
      { key: 'sodium', label: '钠', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'potassium', label: '钾', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'calcium', label: '钙', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'iron', label: '铁', unit: 'mg', decimals: 2, placeholder: '毫克' },
      { key: 'zinc', label: '锌', unit: 'mg', decimals: 2, placeholder: '毫克' },
      { key: 'magnesium', label: '镁', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'phosphorus', label: '磷', unit: 'mg', decimals: 1, placeholder: '毫克' },
    ]
  },
  {
    title: '维生素',
    icon: 'sun',
    expanded: false,
    fields: [
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
    ]
  },
  {
    title: '其他',
    icon: 'more',
    expanded: false,
    fields: [
      { key: 'cholesterol', label: '胆固醇', unit: 'mg', decimals: 1, placeholder: '毫克' },
      { key: 'saturatedFat', label: '饱和脂肪', unit: 'g', decimals: 2, placeholder: '克' },
      { key: 'transFat', label: '反式脂肪', unit: 'g', decimals: 2, placeholder: '克' },
    ]
  }
]

// 展开状态管理
const collapseExpanded = reactive<Record<string, boolean>>({
  '基础营养成分': true,
  '矿物质': false,
  '维生素': false,
  '其他': false
})

// 扁平化字段列表（用于初始化数据）
const nutritionFields = nutritionFieldGroups.flatMap(g => g.fields)

const nutritionData = reactive<Record<string, number>>(
  Object.fromEntries(nutritionFields.map(f => [f.key, 0]))
)
const nutritionMeta = reactive({
  dataSource: '',
  notes: '',
  confidence: 'medium' as 'high' | 'medium' | 'low',
})

const confidenceOptions = [
  { label: '高（实验室检测）', value: 'high' },
  { label: '中（文献数据）', value: 'medium' },
  { label: '低（估算值）', value: 'low' },
]

const handleClearNutrition = () => {
  for (const field of nutritionFields) {
    nutritionData[field.key] = 0
  }
  nutritionMeta.dataSource = ''
  nutritionMeta.notes = ''
  nutritionMeta.confidence = 'medium'
}

// 折叠面板展开/收起
const handleCollapseChange = (value: string[]) => {
  for (const key of Object.keys(collapseExpanded)) {
    collapseExpanded[key] = value.includes(key)
  }
}

// 展开全部分组
const expandAllGroups = () => {
  for (const key of Object.keys(collapseExpanded)) {
    collapseExpanded[key] = true
  }
}

// 收起全部分组
const collapseAllGroups = () => {
  for (const key of Object.keys(collapseExpanded)) {
    collapseExpanded[key] = false
  }
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
      confidence: nutritionMeta.confidence,
    })
  } catch (error: any) {
    console.error('保存营养成分失败:', error)
  }
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    if (loading.value) return
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
    // http 拦截器已解包 response.data，res 直接是营养数据对象或 null
    const res = await nutritionApi.getMaterialNutrition(materialId) as any
    if (res && res.per100g) {
      hasNutrition.value = true
      showNutrition.value = true
      const per100g = res.per100g || {}
      for (const key of Object.keys(per100g)) {
        if (per100g[key] !== undefined && per100g[key] !== null) {
          nutritionData[key] = Number(per100g[key])
        }
      }
      if (res.dataSource) nutritionMeta.dataSource = res.dataSource
      if (res.notes) nutritionMeta.notes = res.notes
      if (res.confidence) nutritionMeta.confidence = res.confidence
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
  // 表单卡片入场动画
  :deep(.t-card) {
    animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  // 营养折叠面板 stagger 入场
  :deep(.t-collapse-panel) {
    animation: fadeInUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;
    @include stagger-rows(8, 0.06s);
  }

  .form-header {
    display: flex;
    align-items: center;
    gap: $space-3;

    .form-title {
      font-size: $font-size-h3;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }
  }

  .nutrition-section {
    margin-top: $space-4;
    padding: $space-5;
    background: linear-gradient(135deg, $bg-page 0%, $bg-pink-warm 100%);
    border-radius: $radius-2xl;
    border: 1.5px solid $overlay-pink-lighter-20;

    .section-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: $font-size-body-sm;
      font-weight: $font-weight-bold;
      color: $text-primary;
      margin-bottom: $space-4;
      padding-bottom: $space-3;
      border-bottom: 1px solid $overlay-pink-lighter-15;

      .title-left {
        display: flex;
        align-items: center;
        gap: $space-2;
      }

      .title-actions {
        display: flex;
        align-items: center;
        gap: $space-1;
      }
    }

    .group-header {
      display: flex;
      align-items: center;
      gap: $space-2;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }

    .nutrition-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0 $space-6;
      padding: $space-2 0;

      @media (max-width: 640px) {
        grid-template-columns: 1fr;
      }
    }

    .nutrition-input {
      display: flex;
      align-items: center;
      gap: $space-2;

      .nutrition-unit {
        flex-shrink: 0;
        font-size: $font-size-caption;
        color: $text-secondary;
        background: $overlay-white-70;
        padding: $space-1 10px;
        border-radius: $radius-md;
        white-space: nowrap;
        min-width: 60px;
        text-align: center;
      }
    }

    .nutrition-meta {
      margin-top: $space-4;
      padding-top: $space-4;
      border-top: 1px solid $overlay-pink-lighter-15;
    }
  }
}
</style>
