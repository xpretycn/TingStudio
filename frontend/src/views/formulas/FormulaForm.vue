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
        scroll-to-first-error
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
          <div>
            <t-input-number
              v-model="formData.finishedWeight"
              :min="0"
              :decimal-places="2"
              placeholder="请输入成品重量"
              style="width: 200px"
            />
            <span class="help-text">成品规格</span>
          </div>
        </t-form-item>

        <t-form-item label="主料含量比系数" name="ratioFactor">
          <div>
            <t-input-number
              v-model="formData.ratioFactor"
              :min="0.15"
              :max="0.25"
              :decimal-places="2"
              placeholder="默认0.18"
              style="width: 200px"
            />
            <span class="help-text">用于营养成分含量比计算，范围0.15-0.25。例：原料蛋白质含量10%，系数0.18，则成品蛋白质含量=10%×0.18=1.8%</span>
          </div>
        </t-form-item>

        <t-form-item label="辅料含量比系数" name="supplementRatioFactor">
          <div>
            <t-input-number
              v-model="formData.supplementRatioFactor"
              :min="0.5"
              :max="1.5"
              :decimal-places="2"
              placeholder="默认1.0"
              style="width: 200px"
            />
            <span class="help-text">辅料（如低聚异麦芽糖）含量比系数，范围0.5-1.5</span>
          </div>
        </t-form-item>

        <t-form-item label="原料清单" name="materials" :required="true">
          <div class="materials-section">
            <span class="help-text" style="display: block; margin-bottom: 12px;">请通过手动添加或Excel导入的方式录入原料清单，每种原料需选择原料名称并填写对应数量</span>

            <!-- Excel导入面板 -->
            <ExcelImportPanel @import="handleExcelImport" />

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
                    v-for="material in getFilteredMaterials(index)"
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

              <div class="manual-add">
                <t-button
                  theme="default"
                  size="small"
                  @click="addMaterial"
                >
                  <template #icon>
                    <t-icon name="add" />
                  </template>
                  手动添加原料
                </t-button>
              </div>
            </div>

            <div v-else class="manual-add">
              <t-button
                theme="default"
                size="small"
                @click="addMaterial"
              >
                <template #icon>
                  <t-icon name="add" />
                </template>
                手动添加原料
              </t-button>
            </div>
          </div>
        </t-form-item>

        <t-form-item label="配方描述" name="description">
          <t-textarea
            v-model="formData.description"
            placeholder="请输入配方描述"
            :autosize="{ minRows: 4, maxRows: 8 }"
          />
        </t-form-item>

        <t-form-item v-if="isEdit" label="升版原因" name="versionReason">
          <t-textarea
            v-model="formData.versionReason"
            placeholder="请输入升版原因（必填）"
            :autosize="{ minRows: 2, maxRows: 4 }"
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
import type { ParsedMaterial } from '@/api/excelImport'
import ExcelImportPanel from '@/components/ExcelImportPanel.vue'

const router = useRouter()
const route = useRoute()
const formulaStore = useFormulaStore()
const salesmanStore = useSalesmanStore()
const materialStore = useMaterialStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)
const materialSelectLoading = ref(false)
const materialSearchKeyword = ref('')

// 过滤原料列表：排除其他行已选的原料，防止重复添加
const getFilteredMaterials = (currentIndex: number) => {
  const list = materialStore.allMaterials ?? []
  const selectedIds = formData.materials
    .map((m: any, i: number) => i !== currentIndex && m.materialId ? m.materialId : null)
    .filter(Boolean)
  let result = list
  if (selectedIds.length > 0) {
    const idSet = new Set(selectedIds)
    result = list.filter(m => !idSet.has(m.id))
  }
  if (!materialSearchKeyword.value) return result
  const kw = materialSearchKeyword.value.toLowerCase()
  return result.filter(
    m => m.name.toLowerCase().includes(kw) || m.code.toLowerCase().includes(kw)
  )
}

const isEdit = computed(() => !!route.params.id)

const formData = reactive<any>({
  name: '',
  salesmanId: '',
  materials: [],
  finishedWeight: 0,
  ratioFactor: 0.18,
  supplementRatioFactor: 1.0,
  description: '',
  versionReason: ''
})

const validateMaterials = (value: MaterialItem[]) => {
  return value.length > 0
}

const validateRatioFactor = (val: number) => val >= 0.15 && val <= 0.25

const validateSupplementRatio = (val: number) => val >= 0.5 && val <= 1.5

const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入配方名称', trigger: 'blur' },
    { min: 2, message: '配方名称至少2个字符', trigger: 'blur' },
  ],
  salesmanId: [{ required: true, message: '请选择所属业务员', trigger: 'change' }],
  finishedWeight: [
    { required: true, message: '请输入成品重量', trigger: 'blur' },
  ],
  ratioFactor: [
    { required: true, message: '请输入主料含量比系数', trigger: 'blur' },
    { validator: validateRatioFactor, message: '主料含量比系数范围为0.15-0.25', trigger: 'blur' },
  ],
  supplementRatioFactor: [
    { required: true, message: '请输入辅料含量比系数', trigger: 'blur' },
    { validator: validateSupplementRatio, message: '辅料含量比系数范围为0.5-1.5', trigger: 'blur' },
  ],
  materials: [
    { validator: validateMaterials, message: '请至少添加一种原料', trigger: 'change' },
    {
      validator: (value: MaterialItem[]) => value.every(item => item.materialId && item.quantity > 0),
      message: '请完整填写所有原料信息', trigger: 'change',
    },
  ],
  versionReason: [{ required: true, message: '请填写升版原因', trigger: 'blur' }],
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

// 处理Excel导入的原料数据
const handleExcelImport = (materials: ParsedMaterial[]) => {
  // 清空现有原料清单，使用导入的数据
  formData.materials.splice(0, formData.materials.length, ...materials.map(m => ({
    materialId: m.materialId,
    materialName: m.materialName,
    quantity: m.quantity,
  })))
  MessagePlugin.success(`已导入 ${materials.length} 条原料`)
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    if (loading.value) return
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
        ratioFactor: formula.ratioFactor ?? 0.18,
        supplementRatioFactor: formula.supplementRatioFactor ?? 1.0,
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

    .manual-add {
      margin-bottom: 12px;
    }

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

  .help-text {
    margin-left: 12px;
    font-size: 12px;
    color: #999;
    line-height: 32px;
  }
}
</style>
