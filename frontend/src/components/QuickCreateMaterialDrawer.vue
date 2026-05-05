<template>
  <t-drawer
    :visible="visible"
    :on-close="handleClose"
    :header="false"
    :footer="false"
    placement="right"
    size="620px"
    class="quick-create-material-drawer"
    destroy-on-close
    :close-on-overlay-click="false"
    :show-overlay="true"
    aria-label="快速录入原料"
    role="dialog"
  >
    <div class="drawer-content">
      <div class="drawer-header">
        <div class="drawer-header-left">
          <div class="drawer-header-icon">
            <t-icon name="add" size="20px" />
          </div>
          <span class="drawer-header-title">快速录入原料</span>
        </div>
        <button type="button" class="drawer-close-btn" @click="handleClose" aria-label="关闭">
          <t-icon name="close" size="18px" />
        </button>
      </div>

      <t-form
        ref="formRef"
        :data="formData"
        :rules="formRules"
        label-align="top"
        @submit.prevent
        class="drawer-form"
      >
        <t-form-item label="原料名称" name="name">
          <t-input
            ref="nameInputRef"
            v-model="formData.name"
            placeholder="请输入原料名称"
            clearable
            :disabled="submitting"
          >
            <template #prefixIcon>
              <t-icon name="root-list" />
            </template>
          </t-input>
        </t-form-item>

        <div class="form-row-2col">
          <t-form-item label="原料编号" name="code" class="form-col">
            <t-input
              v-model="formData.code"
              placeholder="系统自动生成"
              readonly
              :disabled="true"
              class="code-readonly"
            >
              <template #prefixIcon>
                <t-icon name="certificate-1" />
              </template>
            </t-input>
          </t-form-item>

          <t-form-item label="单位" name="unit" class="form-col">
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

        <div class="form-row-2col">
          <t-form-item label="类型" name="materialType" class="form-col">
            <t-select v-model="formData.materialType" :disabled="submitting" placeholder="选择类型">
              <t-option value="herb" label="药材" />
              <t-option value="supplement" label="辅料" />
            </t-select>
            <div v-if="typeInferred" class="field-hint field-hint--info">
              <t-icon name="info-circle" size="12px" />
              <span>根据含量比公式自动判断</span>
            </div>
          </t-form-item>

          <t-form-item label="单价(元/KG)" name="unitPrice" class="form-col">
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

        <div v-if="!hasNutritionData && !showNutritionSection" class="nutrition-expand-wrapper">
          <t-button variant="text" size="small" @click="showNutritionSection = true" class="nutrition-expand-btn">
            <template #icon><t-icon name="add" size="14px" /></template>
            添加营养数据
          </t-button>
        </div>

        <div class="nutrition-section" v-if="hasNutritionData || showNutritionSection">
          <div class="nutrition-header">
            <t-icon name="chart-bar" size="16px" />
            <span>营养数据（每100g）</span>
            <span v-if="nutritionAutoFilledCount > 0" class="nutrition-auto-badge">
              {{ nutritionAutoFilledCount }} 项自动填充
            </span>
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

        <div v-if="missingFieldHints.length > 0" class="missing-fields-section">
          <div class="missing-fields-header">
            <t-icon name="error-circle" size="14px" />
            <span>建议补充以下信息</span>
          </div>
          <div class="missing-fields-list">
            <span v-for="hint in missingFieldHints" :key="hint.field" class="missing-field-tag"
              @click="hint.focus && hint.focus()">
              {{ hint.label }}
            </span>
          </div>
        </div>
      </t-form>
    </div>

    <div class="drawer-footer">
      <t-button
        variant="outline"
        :disabled="submitting"
        @click="handleClose"
        class="drawer-footer-btn"
      >
        <template #icon><t-icon name="close-circle" /></template>
        取消
      </t-button>
      <t-button
        theme="primary"
        :loading="submitting"
        @click="handleSubmit"
        class="drawer-footer-btn drawer-footer-btn--primary"
      >
        <template #icon><t-icon name="check" /></template>
        {{ submitting ? '创建中...' : '确认录入' }}
      </t-button>
    </div>
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
  --td-brand-color: #10b981;
  --td-brand-color-hover: #059669;
  --td-brand-color-active: #047857;
  --td-brand-color-light: rgba(16, 185, 129, 0.1);
  --td-brand-color-focus: rgba(16, 185, 129, 0.4);
  --td-brand-color-disabled: #a7f3d0;
  --td-brand-color-border-active: #10b981;
  --td-brand-color-border-hover: #10b981;
  --td-brand-color-border-focus: #10b981;

  :deep(.t-btn.t-btn--primary) {
    background-color: var(--td-brand-color) !important;
    border-color: var(--td-brand-color) !important;
  }

  :deep(.t-btn.t-btn--primary:hover:not(.t-btn--disabled)) {
    background-color: var(--td-brand-color-hover) !important;
    border-color: var(--td-brand-color-hover) !important;
  }

  :deep(.t-input.t-is-focused),
  :deep(.t-input-number.t-is-focused) {
    border-color: var(--td-brand-color) !important;
  }

  :deep(.t-input.t-is-focused .t-input__inner),
  :deep(.t-input-number.t-is-focused .t-input__inner) {
    box-shadow: 0 0 0 2px var(--td-brand-color-focus) !important;
  }
  :deep(.t-drawer__content-wrapper) {
    display: flex;
    flex-direction: column;
  }

  :deep(.t-drawer__body) {
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 24px 16px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 8px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;

  .drawer-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .drawer-header-icon {
    width: 36px;
    height: 36px;
    background: linear-gradient(135deg, #10b981, #059669);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
  }

  .drawer-header-title {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
  }

  .drawer-close-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
      color: #334155;
    }
  }
}

.drawer-form {
  :deep(.t-form__item) {
    margin-bottom: 18px;
  }

  :deep(.t-form__label) {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }

  :deep(.t-input),
  :deep(.t-select),
  :deep(.t-input-number) {
    border-radius: 12px;
    min-height: 44px;
    background: #f8fafc;

    &.t-is-focused {
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
    }
  }
}

.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;

  .form-col {
    margin-bottom: 0;
  }
}

.code-readonly {
  :deep(.t-input) {
    background: #f1f5f9;
    cursor: not-allowed;

    .t-input__wrap {
      background: #f1f5f9;
    }

    .t-input__inner {
      color: #64748b;
      cursor: not-allowed;
      -webkit-text-fill-color: #64748b;
    }
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

.nutrition-section {
  margin-top: 4px;
  padding: 16px;
  background: #f0fdf4;
  border-radius: 12px;
  border: 1px solid #bbf7d0;

  .nutrition-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #15803d;
    margin-bottom: 12px;
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
      margin-bottom: 0;
      position: relative;

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

.missing-fields-section {
  margin-top: 12px;
  padding: 12px 14px;
  background: #fffbeb;
  border-radius: 10px;
  border: 1px solid #fde68a;

  .missing-fields-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #92400e;
    margin-bottom: 8px;
  }

  .missing-fields-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

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

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
  flex-shrink: 0;

  .drawer-footer-btn {
    min-width: 110px;
    height: 40px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    gap: 6px;

    &--primary {
      background: linear-gradient(135deg, var(--td-brand-color, #10b981), var(--td-brand-color-hover, #059669));
      border: none;
      color: #fff;

      &:hover {
        background: linear-gradient(135deg, var(--td-brand-color-hover, #059669), var(--td-brand-color-active, #047857));
      }
    }
  }
}
</style>

<style lang="scss">
/* TDesign drawer renders in portal, need global styles */
.t-drawer__body .drawer-footer .drawer-footer-btn.t-btn--primary {
  background: linear-gradient(135deg, #10b981, #059669) !important;
  border-color: transparent !important;
  color: #fff !important;
}

.t-drawer__body .drawer-footer .drawer-footer-btn.t-btn--primary:hover:not(.t-btn--disabled) {
  background: linear-gradient(135deg, #059669, #047857) !important;
}

.t-drawer__body .drawer-footer .drawer-footer-btn.t-btn--outline {
  border-color: #e2e8f0 !important;
  color: #64748b !important;
}

.t-drawer__body .drawer-footer .drawer-footer-btn.t-btn--outline:hover:not(.t-btn--disabled) {
  border-color: #cbd5e1 !important;
  background: #f8fafc !important;
  color: #334155 !important;
}
</style>
