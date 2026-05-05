<template>
  <t-drawer
    :visible="visible"
    :on-close="handleClose"
    :header="false"
    :footer="false"
    placement="right"
    size="680px"
    class="quick-create-salesman-drawer"
    destroy-on-close
    :close-on-overlay-click="false"
    :close-on-esc-keydown="!submitting"
    :show-overlay="true"
    aria-label="快速创建业务员"
    role="dialog"
  >
    <div class="drawer-content">
      <div class="drawer-header">
        <div class="drawer-header-left">
          <div class="drawer-header-icon">
            <t-icon name="user-add" size="20px" />
          </div>
          <div class="drawer-header-text">
            <span class="drawer-header-title">快速创建业务员</span>
            <span class="drawer-header-desc">填写业务员基本信息，系统将自动生成工号</span>
          </div>
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
      </t-form>
    </div>

    <div class="drawer-footer">
      <t-button
        variant="outline"
        :disabled="submitting"
        @click="handleClose"
        aria-label="取消创建业务员"
        class="drawer-footer-btn drawer-footer-btn--cancel"
      >
        <template #icon><t-icon name="close-circle" /></template>
        取消
      </t-button>
      <t-button
        theme="primary"
        :loading="submitting"
        @click="handleSubmit"
        aria-label="确认创建业务员"
        class="drawer-footer-btn drawer-footer-btn--primary"
      >
        <template #icon><t-icon name="check" /></template>
        {{ submitting ? '创建中...' : '确认创建' }}
      </t-button>
    </div>
  </t-drawer>
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
    emit('update:visible', false)
  } catch (error: any) {
    MessagePlugin.error(error?.message || '创建业务员失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.quick-create-salesman-drawer {
  --td-brand-color: var(--color-primary);
  --td-brand-color-hover: var(--color-primary-dark);
  --td-brand-color-active: var(--color-primary-deep);
  --td-brand-color-light: var(--color-primary-bg);
  --td-brand-color-focus: var(--overlay-brand-30);
  --td-brand-color-disabled: var(--color-primary-lighter);
  --td-brand-color-border-active: var(--color-primary);
  --td-brand-color-border-hover: var(--color-primary-dark);
  --td-brand-color-border-focus: var(--color-primary);

  :deep(.t-drawer__content-wrapper) {
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.08);
  }

  :deep(.t-drawer__body) {
    padding: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  :deep(.drawer-footer-btn.t-btn--primary),
  :deep(.t-btn.t-btn--primary) {
    background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark))) !important;
    border-color: transparent !important;
    color: #fff !important;
    box-shadow: var(--shadow-brand-sm, 0 4px 12px var(--overlay-brand-30)) !important;
  }

  :deep(.drawer-footer-btn.t-btn--primary:hover):not(.t-btn--disabled),
  :deep(.t-btn.t-btn--primary:hover):not(.t-btn--disabled) {
    background: var(--gradient-btn-hover, linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-deep))) !important;
    box-shadow: var(--shadow-brand-md, 0 6px 16px var(--overlay-brand-35)) !important;
  }

  :deep(.t-btn.t-btn--outline) {
    border-color: #e2e8f0 !important;
    color: #64748b !important;
  }

  :deep(.t-btn.t-btn--outline:hover):not(.t-btn--disabled) {
    border-color: #cbd5e1 !important;
    background: #f8fafc !important;
    color: #334155 !important;
  }

  :deep(.t-input.t-is-focused),
  :deep(.t-input-number.t-is-focused) {
    border-color: var(--color-primary) !important;
  }

  :deep(.t-input.t-is-focused .t-input__inner),
  :deep(.t-input-number.t-is-focused .t-input__inner) {
    box-shadow: 0 0 0 2px var(--overlay-brand-30) !important;
  }
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 28px 20px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 4px;

    &:hover {
      background: #cbd5e1;
    }
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px 20px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 12px;
  position: sticky;
  top: 0;
  background: #fff;
  z-index: 1;

  .drawer-header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .drawer-header-icon {
    width: 40px;
    height: 40px;
    background: var(--gradient-brand, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    box-shadow: var(--shadow-brand-sm, 0 4px 12px var(--overlay-brand-25));
  }

  .drawer-header-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .drawer-header-title {
    font-size: 17px;
    font-weight: 700;
    color: #0f172a;
  }

  .drawer-header-desc {
    font-size: 12px;
    color: #94a3b8;
  }

  .drawer-close-btn {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    background: transparent;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: #fef2f2;
      border-color: #fecaca;
      color: #ef4444;
      transform: scale(1.05);
    }

    &:active {
      transform: scale(0.95);
    }
  }
}

.drawer-form {
  :deep(.t-form__item) {
    margin-bottom: 24px;
  }

  :deep(.t-form__label) {
    font-size: 13px;
    font-weight: 600;
    color: #334155;
    margin-bottom: 6px;
  }

  :deep(.t-input) {
    border-radius: 12px;
    min-height: 46px;
    background: #f8fafc;
    transition: all 0.2s;

    .t-input__wrap {
      border-radius: 12px;
      min-height: 46px;
      border-color: #e2e8f0;
    }

    .t-input__inner {
      font-size: 14px;
    }

    &:hover .t-input__wrap {
      border-color: var(--color-primary);
    }

    &.t-is-focused {
      box-shadow: 0 0 0 3px var(--overlay-brand-15);

      .t-input__wrap {
        border-color: var(--color-primary);
      }
    }
  }

  :deep(.t-textarea) {
    border-radius: 12px;
    background: #f8fafc;
    transition: all 0.2s;

    .t-textarea__wrap {
      border-radius: 12px;
      border-color: #e2e8f0;
    }

    &:hover .t-textarea__wrap {
      border-color: var(--color-primary);
    }

    &.t-is-focused {
      box-shadow: 0 0 0 3px var(--overlay-brand-15);

      .t-textarea__wrap {
        border-color: var(--color-primary);
      }
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
      border-color: #e2e8f0;
    }

    .t-input__inner {
      color: #64748b;
      cursor: not-allowed;
      -webkit-text-fill-color: #64748b;
    }

    &:hover .t-input__wrap {
      border-color: #e2e8f0;
    }
  }
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 28px;
  border-top: 1px solid #f1f5f9;
  background: #fff;
  flex-shrink: 0;

  .drawer-footer-btn {
    min-width: 120px;
    height: 44px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    gap: 6px;
    transition: all 0.2s;

    &--cancel {
      border-color: #e2e8f0;
      color: #64748b;

      &:hover {
        border-color: #cbd5e1;
        background: #f8fafc;
        color: #334155;
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
      }
    }

    &--primary {
      background: var(--gradient-btn, linear-gradient(135deg, var(--color-primary), var(--color-primary-dark)));
      border: none;
      color: #fff;
      box-shadow: var(--shadow-brand-sm, 0 4px 12px var(--overlay-brand-30));

      &:hover {
        background: var(--gradient-btn-hover, linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-deep)));
        box-shadow: var(--shadow-brand-md, 0 6px 16px var(--overlay-brand-35));
        transform: translateY(-1px);
      }

      &:active {
        transform: translateY(0);
        box-shadow: var(--shadow-brand-xs, 0 2px 8px var(--overlay-brand-25));
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
