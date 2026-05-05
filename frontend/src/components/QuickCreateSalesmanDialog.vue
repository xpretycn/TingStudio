<template>
  <t-dialog
    :visible="visible"
    :on-close="handleClose"
    :close-btn="true"
    :footer="false"
    width="520px"
    placement="center"
    class="quick-create-salesman-dialog"
    destroy-on-close
    :prevent-scroll-through="false"
    :close-on-overlay-click="false"
    :close-on-esc-keydown="!submitting"
    :show-overlay="false"
    :z-index="9999"
    aria-label="快速创建业务员"
    role="dialog"
  >
    <template #header>
      <div class="dialog-header">
        <div class="dialog-header-icon">
          <t-icon name="user-add" size="20px" />
        </div>
        <span class="dialog-header-title">快速创建业务员</span>
      </div>
    </template>

    <t-form
      ref="formRef"
      :data="formData"
      :rules="formRules"
      label-align="top"
      @submit.prevent
      class="dialog-form"
    >
      <t-form-item label="姓名" name="name">
        <t-input
          ref="nameInputRef"
          v-model="formData.name"
          placeholder="请输入业务员姓名"
          clearable
          :disabled="submitting"
          aria-label="业务员姓名"
          aria-required="true"
        >
          <template #prefixIcon>
            <t-icon name="user" />
          </template>
        </t-input>
      </t-form-item>

      <div class="form-row-2col">
        <t-form-item label="联系电话" name="phone" class="form-col">
          <t-input
            v-model="formData.phone"
            placeholder="系统自动生成"
            clearable
            :disabled="submitting"
            aria-label="联系电话"
          >
            <template #prefixIcon>
              <t-icon name="call" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item label="员工工号" name="code" class="form-col">
          <t-input
            v-model="formData.code"
            placeholder="后端自动生成"
            readonly
            :disabled="true"
            aria-label="员工工号（自动生成，不可编辑）"
            class="code-readonly"
          >
            <template #prefixIcon>
              <t-icon name="certificate-1" />
            </template>
            <template #suffixIcon>
              <t-tooltip content="工号由系统自动生成，格式：YW+5位数字" placement="top">
                <t-icon name="lock-on" style="color: #94a3b8; cursor: help;" />
              </t-tooltip>
            </template>
          </t-input>
        </t-form-item>
      </div>

      <div class="form-row-2col">
        <t-form-item label="部门" name="department" class="form-col">
          <t-input
            v-model="formData.department"
            placeholder="请输入部门名称"
            clearable
            :disabled="submitting"
            aria-label="部门"
          >
            <template #prefixIcon>
              <t-icon name="folder" />
            </template>
          </t-input>
        </t-form-item>

        <t-form-item label="邮箱" name="email" class="form-col">
          <t-input
            v-model="formData.email"
            placeholder="系统自动生成"
            clearable
            :disabled="submitting"
            aria-label="邮箱"
          >
            <template #prefixIcon>
              <t-icon name="mail" />
            </template>
          </t-input>
        </t-form-item>
      </div>

      <t-form-item label="备注" name="notes">
        <t-textarea
          v-model="formData.notes"
          placeholder="备注信息（选填）"
          :maxlength="200"
          :autosize="{ minRows: 2, maxRows: 5 }"
          :disabled="submitting"
          aria-label="备注信息"
        />
      </t-form-item>

      <div class="dialog-footer">
        <t-button
          variant="outline"
          :disabled="submitting"
          @click="handleClose"
          aria-label="取消创建业务员"
          class="dialog-footer-btn"
        >
          <template #icon><t-icon name="close-circle" /></template>
          取消
        </t-button>
        <t-button
          theme="primary"
          :loading="submitting"
          @click="handleSubmit"
          aria-label="确认创建业务员"
          class="dialog-footer-btn dialog-footer-btn--primary"
        >
          <template #icon><t-icon name="check" /></template>
          {{ submitting ? '创建中...' : '确认创建' }}
        </t-button>
      </div>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { salesmanApi } from '@/api/salesman'
import type { Salesman } from '@/api/salesman'

const props = defineProps<{
  visible: boolean
  defaultName: string
}>()

const emit = defineEmits<{
  (e: 'update:visible', val: boolean): void
  (e: 'created', salesman: Salesman): void
}>()

const formRef = ref()
const nameInputRef = ref()
const submitting = ref(false)

const formData = ref({
  name: '',
  phone: '',
  code: '',
  department: '销售部',
  email: '',
  notes: '',
})

const phoneValidator = (val: string): boolean | string => {
  if (!val) return true
  return /^1[3-9]\d{9}$/.test(val) || '请输入正确的手机号格式'
}

const emailValidator = (val: string): boolean | string => {
  if (!val) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) || '请输入正确的邮箱格式'
}

const formRules = {
  name: [{ required: true, message: '请输入业务员姓名', trigger: 'blur' }],
  phone: [{ validator: phoneValidator, trigger: 'blur' }],
  email: [{ validator: emailValidator, trigger: 'blur' }],
}

const generateAutoPhone = (): string => {
  const prefixes = ['130', '131', '132', '133', '135', '136', '137', '138', '139',
    '150', '151', '152', '153', '155', '156', '157', '158', '159',
    '170', '176', '177', '178', '180', '181', '182', '183', '185', '186', '187', '188', '189']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0')
  return prefix + suffix
}

const generateAutoEmail = (name: string): string => {
  const domains = ['company.com', 'tingstudio.cn', 'work.cn']
  const domain = domains[Math.floor(Math.random() * domains.length)]
  const pinyin = name ? name.toLowerCase().replace(/\s+/g, '.').replace(/[^\w.]/g, '') : 'user'
  const seq = String(Math.floor(Math.random() * 900) + 100)
  return `${pinyin}${seq}@${domain}`
}

watch(() => props.visible, async (val) => {
  if (val) {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const autoPhone = generateAutoPhone()
    const autoEmail = generateAutoEmail(props.defaultName || '')
    formData.value = {
      name: props.defaultName || '',
      phone: autoPhone,
      code: 'YW*****（创建后生成）',
      department: '销售部',
      email: autoEmail,
      notes: `由 AI 解析创建于 ${dateStr}`,
    }
    await nextTick()
    nameInputRef.value?.focus?.()
  }
})

const handleClose = () => {
  if (submitting.value) return
  emit('update:visible', false)
}

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
    const created = await salesmanApi.create({
      name: formData.value.name,
      department: formData.value.department || undefined,
      phone: formData.value.phone || undefined,
      email: formData.value.email || undefined,
    })
    MessagePlugin.success('业务员创建成功')
    emit('created', created)
    handleClose()
  } catch (error: any) {
    MessagePlugin.error(error?.message || '创建业务员失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.quick-create-salesman-dialog {
  :deep(.t-dialog__modal) {
    background: transparent !important;
  }

  :deep(.t-dialog__position) {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
  }

  :deep(.t-dialog__ctx) {
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1);
    position: relative !important;
    margin: auto !important;
  }

  :deep(.t-dialog__header) {
    padding: 24px 28px 0;
    border-bottom: none;
  }

  :deep(.t-dialog__body) {
    padding: 20px 28px 8px;
  }
}

.dialog-header {
  display: flex;
  align-items: center;
  gap: 10px;

  .dialog-header-icon {
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

  .dialog-header-title {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
  }
}

.dialog-form {
  :deep(.t-form__item) {
    margin-bottom: 18px;
  }

  :deep(.t-form__label) {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
  }

  :deep(.t-input) {
    border-radius: 12px;
    min-height: 44px;
    background: #f8fafc;

    .t-input__wrap {
      border-radius: 12px;
      min-height: 44px;
    }

    &.t-is-focused {
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
    }
  }

  :deep(.t-textarea) {
    border-radius: 12px;
    background: #f8fafc;

    .t-textarea__wrap {
      border-radius: 12px;
    }

    &.t-is-focused {
      box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
    }
  }
}

.form-row-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;

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

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 8px;
  padding-bottom: 4px;

  .dialog-footer-btn {
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
