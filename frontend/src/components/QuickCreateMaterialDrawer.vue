<template>
  <t-drawer
    :visible="visible"
    :on-close="handleClose"
    :close-btn="false"
    :footer="false"
    placement="right"
    size="520px"
    class="quick-create-material-drawer"
    destroy-on-close
    :close-on-overlay-click="false"
    :show-overlay="true"
    aria-label="快速录入原料"
    role="dialog"
  >
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
          </svg>
          <span class="header-title">快速录入原料</span>
        </div>
        <div class="header-actions">
          <button class="confirm-btn create-btn" @click="handleSubmit" :disabled="submitting">
            <t-loading v-if="submitting" size="14px" />
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ submitting ? '创建中...' : '确认录入' }}
          </button>
        </div>
      </div>
    </template>

    <t-form
      ref="formRef"
      :data="formData"
      :rules="formRules"
      label-align="top"
      @submit.prevent
    >
      <div class="drawer-card info-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>基本信息</span>
        </div>
        <div class="card-body">
          <t-form-item label="原料名称" name="name">
            <t-input
              ref="nameInputRef"
              v-model="formData.name"
              placeholder="请输入原料名称"
              clearable
              :disabled="submitting"
            />
          </t-form-item>
          <div class="form-row two-col">
            <t-form-item label="原料编号">
              <t-input
                v-model="formData.code"
                placeholder="系统自动生成"
                readonly
                :disabled="true"
                class="code-readonly"
              />
            </t-form-item>
            <t-form-item label="单位" name="unit">
              <t-select v-model="formData.unit" :disabled="submitting" placeholder="选择单位">
                <t-option value="g" label="克(g)" />
                <t-option value="kg" label="千克(kg)" />
                <t-option value="ml" label="毫升(ml)" />
                <t-option value="L" label="升(L)" />
                <t-option value="个" label="个" />
                <t-option value="片" label="片" />
              </t-select>
            </t-form-item>
          </div>
          <div class="form-row two-col">
            <t-form-item label="类型" name="materialType">
              <t-select v-model="formData.materialType" :disabled="submitting" placeholder="选择类型">
                <t-option value="herb" label="药材" />
                <t-option value="supplement" label="辅料" />
              </t-select>
              <div v-if="typeInferred" class="field-hint field-hint--info">
                <t-icon name="info-circle" size="12px" />
                <span>根据含量比公式自动判断</span>
              </div>
            </t-form-item>
            <t-form-item label="单价(元/KG)" name="unitPrice">
              <t-input-number
                v-model="formData.unitPrice"
                :min="0"
                :decimal-places="2"
                placeholder="手动输入单价"
                theme="normal"
                :disabled="submitting"
                style="width: 100%"
              />
              <div class="field-hint field-hint--warn">
                <t-icon name="info-circle" size="12px" />
                <span>需手动输入，不自动填充</span>
              </div>
            </t-form-item>
          </div>
        </div>
      </div>

      <div class="drawer-card nutrition-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
            <line x1="6" y1="1" x2="6" y2="4" />
            <line x1="10" y1="1" x2="10" y2="4" />
            <line x1="14" y1="1" x2="14" y2="4" />
          </svg>
          <span>营养数据（每100g）</span>
          <span v-if="nutritionAutoFilledCount > 0" class="nutrition-auto-badge">
            {{ nutritionAutoFilledCount }} 项自动填充
          </span>
        </div>
        <div class="card-body">
          <div v-if="!hasNutritionData && !showNutritionSection" class="nutrition-expand-wrapper">
            <t-button variant="text" size="small" @click="showNutritionSection = true" class="nutrition-expand-btn">
              <template #icon><t-icon name="add" size="14px" /></template>
              添加营养数据
            </t-button>
          </div>
          <div class="nutrition-grid">
            <t-form-item label="蛋白质(g)" name="protein" class="nutrition-col">
              <t-input-number
                v-model="formData.protein"
                :min="0"
                :decimal-places="2"
                placeholder="输入蛋白质"
                theme="normal"
                :disabled="submitting"
                style="width: 100%"
                :class="{ 'field-auto-filled': autoFilledFields.protein }"
              />
              <span v-if="autoFilledFields.protein" class="field-auto-tag">AI填充</span>
            </t-form-item>
            <t-form-item label="脂肪(g)" name="fat" class="nutrition-col">
              <t-input-number
                v-model="formData.fat"
                :min="0"
                :decimal-places="2"
                placeholder="输入脂肪"
                theme="normal"
                :disabled="submitting"
                style="width: 100%"
                :class="{ 'field-auto-filled': autoFilledFields.fat }"
              />
              <span v-if="autoFilledFields.fat" class="field-auto-tag">AI填充</span>
            </t-form-item>
            <t-form-item label="碳水化合物(g)" name="carbohydrate" class="nutrition-col">
              <t-input-number
                v-model="formData.carbohydrate"
                :min="0"
                :decimal-places="2"
                placeholder="输入碳水"
                theme="normal"
                :disabled="submitting"
                style="width: 100%"
                :class="{ 'field-auto-filled': autoFilledFields.carbohydrate }"
              />
              <span v-if="autoFilledFields.carbohydrate" class="field-auto-tag">AI填充</span>
            </t-form-item>
            <t-form-item label="钠(mg)" name="sodium" class="nutrition-col">
              <t-input-number
                v-model="formData.sodium"
                :min="0"
                :decimal-places="2"
                placeholder="输入钠"
                theme="normal"
                :disabled="submitting"
                style="width: 100%"
                :class="{ 'field-auto-filled': autoFilledFields.sodium }"
              />
              <span v-if="autoFilledFields.sodium" class="field-auto-tag">AI填充</span>
            </t-form-item>
          </div>
        </div>
      </div>

      <div v-if="missingFieldHints.length > 0" class="drawer-card hint-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>建议补充以下信息</span>
        </div>
        <div class="card-body">
          <div class="missing-fields-list">
            <span v-for="hint in missingFieldHints" :key="hint.field" class="missing-field-tag"
              @click="hint.focus && hint.focus()">
              {{ hint.label }}
            </span>
          </div>
        </div>
      </div>
    </t-form>
  </t-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { materialApi } from '@/api/material'
import { nutritionApi } from '@/api/nutrition'
import type { Material } from '@/api/material'
import type { ParsedMaterial } from '@/api/ai'

export interface MaterialFormData {
  name: string
  code: string
  unit: string
  materialType: string
  unitPrice: number | undefined
  protein: number | undefined
  fat: number | undefined
  carbohydrate: number | undefined
  sodium: number | undefined
}

const props = defineProps<{
  visible: boolean
  materialData: ParsedMaterial | null
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'created', material: Material): void
}>()

const formRef = ref()
const nameInputRef = ref()
const submitting = ref(false)
const typeInferred = ref(false)
const showNutritionSection = ref(false)

const autoFilledFields = ref<Record<string, boolean>>({
  protein: false,
  fat: false,
  carbohydrate: false,
  sodium: false,
})

const formData = ref<MaterialFormData>({
  name: '',
  code: '自动生成',
  unit: 'g',
  materialType: 'herb',
  unitPrice: undefined,
  protein: undefined,
  fat: undefined,
  carbohydrate: undefined,
  sodium: undefined,
})

const hasNutritionData = computed(() => {
  return formData.value.protein != null || formData.value.fat != null ||
    formData.value.carbohydrate != null || formData.value.sodium != null
})

const nutritionAutoFilledCount = computed(() => {
  return Object.values(autoFilledFields.value).filter(Boolean).length
})

const missingFieldHints = computed(() => {
  const hints: { field: string; label: string; focus?: () => void }[] = []
  if (!formData.value.unitPrice && formData.value.unitPrice !== 0) {
    hints.push({ field: 'unitPrice', label: '单价' })
  }
  if (formData.value.protein == null && formData.value.fat == null &&
    formData.value.carbohydrate == null && formData.value.sodium == null) {
    hints.push({ field: 'nutrition', label: '营养数据' })
  }
  return hints
})

const formRules = {
  name: [
    { required: true, message: '请输入原料名称', trigger: 'blur' },
    { min: 1, message: '原料名称不能为空', trigger: 'blur' },
  ],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  materialType: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

/**
 * 根据 AI 解析的含量比公式自动判断原料类型
 * 含量比公式含 *0.18 → 药材 (herb)
 * 含量比公式含 *1.0 → 辅料 (supplement)
 */
function inferMaterialType(ratioFormula?: string): { type: string; inferred: boolean } {
  if (!ratioFormula) return { type: 'herb', inferred: false }
  if (ratioFormula.includes('*1.0') || ratioFormula.includes('*1.00')) {
    return { type: 'supplement', inferred: true }
  }
  return { type: 'herb', inferred: true }
}

watch(() => props.visible, async (val) => {
  if (val) {
    const md = props.materialData
    const { type, inferred } = inferMaterialType(md?.ratioFormula)
    typeInferred.value = inferred

    const nd = md
    const protein = nd?.protein != null && nd.protein > 0 ? nd.protein : undefined
    const fat = nd?.fat != null && nd.fat > 0 ? nd.fat : undefined
    const carbohydrate = nd?.carbohydrate != null && nd.carbohydrate > 0 ? nd.carbohydrate : undefined
    const sodium = nd?.sodium != null && nd.sodium > 0 ? nd.sodium : undefined

    autoFilledFields.value = {
      protein: protein != null,
      fat: fat != null,
      carbohydrate: carbohydrate != null,
      sodium: sodium != null,
    }

    showNutritionSection.value = false

    formData.value = {
      name: md?.name || '',
      code: '自动生成',
      unit: md?.unit || 'g',
      materialType: type,
      unitPrice: undefined,
      protein,
      fat,
      carbohydrate,
      sodium,
    }

    await nextTick()
    const inputEl = nameInputRef.value?.$el?.querySelector('input') || nameInputRef.value
    if (inputEl) {
      inputEl.focus?.()
      await nextTick()
      inputEl.select?.()
    }
  }
})

const handleClose = () => {
  if (submitting.value) return
  emit('update:visible', false)
}

/**
 * 提交流程（按设计文档规范）：
 * 1. 表单验证
 * 2. GET /api/materials/next-code → 获取系统生成的原料编号
 * 3. POST /api/materials → 创建原料
 * 4. 如有营养数据 → PUT /api/nutrition/material/:id → 保存营养数据
 * 5. 自动匹配新创建的原料到配方原料列表
 * 6. 关闭抽屉，原料匹配状态更新为"已匹配"
 */
const handleSubmit = async () => {
  let valid = false
  try {
    valid = await formRef.value?.validate()
  } catch {
    valid = false
  }
  if (!valid) return

  submitting.value = true
  try {
    let code = ''
    try {
      const codeRes = await materialApi.getNextCode(formData.value.name)
      code = codeRes?.code || ''
    } catch {
      code = 'YL' + Date.now().toString().slice(-6)
    }

    const created = await materialApi.create({
      name: formData.value.name,
      code,
      unit: formData.value.unit || undefined,
      materialType: formData.value.materialType || undefined,
      unitPrice: formData.value.unitPrice || undefined,
    })

    const materialId = (created as any)?.id || (created as any)?.data?.id
    if (materialId && hasNutritionData.value) {
      const per100g: Record<string, number> = {}
      if (formData.value.protein != null && formData.value.protein > 0) per100g.protein_g = formData.value.protein
      if (formData.value.fat != null && formData.value.fat > 0) per100g.fat_g = formData.value.fat
      if (formData.value.carbohydrate != null && formData.value.carbohydrate > 0) per100g.carbohydrate_g = formData.value.carbohydrate
      if (formData.value.sodium != null && formData.value.sodium > 0) per100g.sodium_mg = formData.value.sodium
      if (Object.keys(per100g).length > 0) {
        try {
          await nutritionApi.setMaterialNutrition(materialId, {
            per100g,
            dataSource: 'AI配方解析',
            confidence: 'medium',
          })
        } catch {
          // 营养数据保存失败不影响原料创建
        }
      }
    }

    MessagePlugin.success(`原料「${formData.value.name}」创建成功`)
    emit('created', created)
    emit('update:visible', false)
  } catch (error: any) {
    MessagePlugin.error(error?.message || '创建原料失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.quick-create-material-drawer {
  :deep(.t-drawer__content-wrapper) {
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.08);
  }

  :deep(.t-drawer__body) {
    padding: 0;
    overflow-x: hidden;
  }

  :deep(.t-input.t-is-focused),
  :deep(.t-input-number.t-is-focused) {
    border-color: #10b981 !important;
  }

  :deep(.t-input.t-is-focused .t-input__inner),
  :deep(.t-input-number.t-is-focused .t-input__inner) {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.4) !important;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;

    .header-left {
      display: flex;
      align-items: center;
      gap: 10px;

      .header-title {
        font-size: 17px;
        font-weight: 600;
        color: #1e293b;
      }
    }

    .header-actions {
      .confirm-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 7px 18px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;

        &.create-btn {
          background: #10b981;
          color: #fff;

          &:hover {
            background: #059669;
          }
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        svg {
          flex-shrink: 0;
        }
      }
    }
  }

  .drawer-card {
    margin: 0 28px 16px;

    &:first-of-type {
      margin-top: 16px;
    }

    border: 1px solid #f1f5f9;
    border-radius: 12px;
    overflow: hidden;

    &:last-child {
      margin-bottom: 20px;
    }

    &.info-card {
      border-left: 3px solid #3b82f6;
    }

    &.nutrition-card {
      border-left: 3px solid #10b981;
    }

    &.hint-card {
      border-left: 3px solid #f59e0b;
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #f8fafc;
      border-bottom: 1px solid #f1f5f9;

      span {
        font-size: 14px;
        font-weight: 600;
        color: #334155;
      }
    }

    .card-body {
      padding: 16px;

      .form-row {
        display: flex;
        gap: 16px;

        &.two-col > * {
          flex: 1;
          min-width: 0;
        }
      }
    }
  }

  :deep(.t-form__item) {
    margin-bottom: 20px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  :deep(.t-form__label) {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }

  :deep(.t-input),
  :deep(.t-select),
  :deep(.t-input-number) {
    border-radius: 8px;
    min-height: 38px;
  }

  .code-readonly :deep(.t-input) {
    background: #f1f5f9;
    cursor: not-allowed;

    .t-input__inner {
      color: #64748b;
      -webkit-text-fill-color: #64748b;
    }
  }

  .field-hint {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
    font-size: 11px;

    &--info {
      color: #10b981;
    }

    &--warn {
      color: #f59e0b;
    }
  }

  .nutrition-expand-wrapper {
    padding: 16px 0;
    display: flex;
    justify-content: center;
  }

  .nutrition-auto-badge {
    margin-left: auto;
    font-size: 11px;
    font-weight: 500;
    color: #059669;
    background: #d1fae5;
    padding: 2px 8px;
    border-radius: 6px;
  }

  .nutrition-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;

    .nutrition-col {
      position: relative;
      margin-bottom: 0;

      :deep(.t-form__label) {
        font-size: 12px;
        color: #166534;
      }

      :deep(.t-input-number.field-auto-filled) {
        background: #ecfdf5;
        border-color: #86efac;
      }
    }
  }

  .field-auto-tag {
    position: absolute;
    top: 0;
    right: 0;
    font-size: 10px;
    color: #059669;
    background: #d1fae5;
    padding: 1px 6px;
    border-radius: 4px;
    font-weight: 600;
  }

  .missing-fields-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    .missing-field-tag {
      font-size: 11px;
      color: #b45309;
      background: #fef3c7;
      padding: 3px 10px;
      border-radius: 6px;
      font-weight: 600;
      cursor: default;
      border: 1px dashed #fcd34d;
    }
  }
}
</style>


