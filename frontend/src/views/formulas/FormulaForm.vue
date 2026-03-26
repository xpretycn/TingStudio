<template>
  <div class="formula-form">
    <t-card bordered>
      <template #header>
        <div class="form-header">
          <t-button variant="text" @click="handleBack">
            <template #icon>
              <t-icon name="chevron-left" />
            </template>
            返回
          </t-button>
          <span class="form-title">{{ isEdit ? '编辑配方' : '新增配方' }}</span>
        </div>
      </template>

      <t-form
        ref="formRef"
        :data="formData"
        :rules="rules"
        label-width="100px"
        @submit="handleSubmit"
      >
        <t-form-item label="配方名称" name="name">
          <t-input
            v-model="formData.name"
            placeholder="请输入配方名称"
            clearable
          />
        </t-form-item>

        <t-form-item label="所属业务员" name="salesmanId">
          <t-select
            v-model="formData.salesmanId"
            placeholder="请选择业务员"
            clearable
            filterable
          >
            <t-option
              v-for="salesman in salesmanStore.salesmen"
              :key="salesman.id"
              :value="salesman.id"
              :label="salesman.name"
            />
          </t-select>
        </t-form-item>

        <t-form-item label="成品重量(g)" name="finishedWeight">
          <t-input-number
            v-model="formData.finishedWeight"
            :min="0"
            :decimal-places="2"
            placeholder="请输入成品重量"
            style="width: 280px"
          />
        </t-form-item>

        <t-form-item label="原料清单" name="materials">
          <div class="materials-section">
            <t-button
              theme="default"
              size="small"
              @click="addMaterial"
            >
              <template #icon>
                <t-icon name="add" />
              </template>
              添加原料
            </t-button>

            <div v-if="formData.materials.length > 0" class="materials-list">
              <div
                v-for="(item, index) in formData.materials"
                :key="index"
                class="material-item"
              >
                <t-select
                  v-model="item.materialId"
                  placeholder="搜索或选择原料"
                  clearable
                  filterable
                  :loading="materialSelectLoading"
                  style="width: 280px; margin-right: 12px"
                  :filter-icon="() => null"
                  @search="handleMaterialSearch"
                  @change="handleMaterialChange(index)"
                  @focus="handleMaterialFocus"
                >
                  <t-option
                    v-for="material in filteredMaterials"
                    :key="material.id"
                    :value="material.id"
                    :label="`${material.name} (${material.unit})`"
                  >
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                      <span>{{ material.name }} ({{ material.unit }})</span>
                      <t-tag
                        v-if="material.materialType === 'supplement'"
                        theme="primary"
                        variant="light-outline"
                        size="small"
                        style="margin-left: 8px;"
                      >辅料</t-tag>
                      <t-tag v-else theme="success" variant="light-outline" size="small" style="margin-left: 8px;">药材</t-tag>
                    </div>
                  </t-option>
                  <template #empty>
                    <div style="padding: 8px 0; text-align: center; color: #999;">
                      {{ materialSearchKeyword ? '未找到匹配原料' : '暂无原料数据' }}
                    </div>
                  </template>
                </t-select>

                <t-input-number
                  v-model="item.quantity"
                  :min="0"
                  placeholder="数量"
                  style="width: 150px; margin-right: 12px"
                />

                <t-button
                  theme="danger"
                  variant="text"
                  size="small"
                  @click="removeMaterial(index)"
                >
                  <template #icon>
                    <t-icon name="delete" />
                  </template>
                </t-button>
              </div>
            </div>

            <t-empty v-else description="请添加原料" size="small" />
          </div>
        </t-form-item>

        <t-form-item label="配方描述" name="description">
          <t-textarea
            v-model="formData.description"
            placeholder="请输入配方描述"
            :autosize="{ minRows: 4, maxRows: 8 }"
          />
        </t-form-item>

        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit" :loading="loading">
              {{ isEdit ? '保存' : '创建' }}
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
import { useFormulaStore } from '@/stores/formula'
import { useSalesmanStore } from '@/stores/salesman'
import { useMaterialStore } from '@/stores/material'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'
import type { FormulaForm, MaterialItem } from '@/api/formula'

const router = useRouter()
const route = useRoute()
const formulaStore = useFormulaStore()
const salesmanStore = useSalesmanStore()
const materialStore = useMaterialStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)
const materialSelectLoading = ref(false)
const materialSearchKeyword = ref('')

// 远程搜索结果（优先使用搜索结果，无搜索时用全量）
const filteredMaterials = computed(() => {
  const list = materialStore.allMaterials ?? []
  if (!materialSearchKeyword.value) return list
  const kw = materialSearchKeyword.value.toLowerCase()
  return list.filter(
    m => m.name.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
  )
})

const isEdit = computed(() => !!route.params.id)

const formData = reactive<any>({
  name: '',
  salesmanId: '',
  materials: [],
  finishedWeight: 0,
  description: ''
})

const validateMaterials = (value: MaterialItem[]) => {
  return value.length > 0
}

const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入配方名称' },
    { min: 2, message: '配方名称至少2个字符' }
  ],
  salesmanId: [{ required: true, message: '请选择所属业务员' }],
  finishedWeight: [{ required: true, message: '请输入成品重量' }],
  materials: [
    { validator: validateMaterials, message: '请至少添加一种原料' },
    {
      validator: (value: MaterialItem[]) => {
        return value.every(item => item.materialId && item.quantity > 0)
      },
      message: '请完整填写所有原料信息'
    }
  ]
}

const addMaterial = () => {
  formData.materials.push({
    materialId: '',
    materialName: '',
    quantity: 0,
  })
}

const removeMaterial = (index: number) => {
  formData.materials.splice(index, 1)
}

const handleMaterialChange = (index: number) => {
  const item = formData.materials[index]
  const material = materialStore.allMaterials.find(m => m.id === item.materialId)
  if (material) {
    item.materialName = material.name
  }
}

const handleMaterialSearch = (keyword: string) => {
  materialSearchKeyword.value = keyword
}

const handleMaterialFocus = () => {
  if (!materialStore.allMaterials || materialStore.allMaterials.length === 0) {
    materialSelectLoading.value = true
    materialStore.fetchAllForSelect().finally(() => {
      materialSelectLoading.value = false
    })
  }
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    loading.value = true
    try {
      const id = route.params.id as string
      let result

      if (isEdit.value && id) {
        result = await formulaStore.updateFormula(id, formData)
      } else {
        result = await formulaStore.createFormula(formData)
      }

      if (result.success) {
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功')
        router.push('/formulas')
      } else {
        MessagePlugin.error(result.message || '操作失败')
      }
    } finally {
      loading.value = false
    }
  }
}

const handleBack = () => {
  router.push('/formulas')
}

onMounted(async () => {
  await Promise.all([
    salesmanStore.fetchSalesmen(),
    materialStore.fetchAllForSelect()
  ])

  const id = route.params.id as string
  if (isEdit.value && id) {
    const formula = await formulaStore.getFormula(id)
    if (formula) {
      const allMats = materialStore.allMaterials ?? []
      const materials = (formula.materials || []).map((m: any) => {
        // 校正 materialId：若当前原料列表中找不到该 ID，则通过名称匹配
        let materialId = m.materialId
        if (!allMats.find(mat => mat.id === materialId) && m.materialName) {
          const matched = allMats.find(mat => mat.name === m.materialName)
          if (matched) materialId = matched.id
        }
        return { materialId, materialName: m.materialName, quantity: m.quantity }
      })
      Object.assign(formData, {
        name: formula.name,
        salesmanId: formula.salesmanId,
        materials,
        finishedWeight: formula.finishedWeight || 0,
        description: formula.description || ''
      })
    }
  }
})
</script>

<style scoped lang="scss">
.formula-form {
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

  .materials-section {
    width: 100%;

    .materials-list {
      margin-top: 12px;

      .material-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        margin-bottom: 8px;
        background-color: #FFF9F7;
        border-radius: 10px;
        border: 1px solid #FFF0F3;
      }
    }
  }
}
</style>
