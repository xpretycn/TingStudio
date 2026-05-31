<template>
  <t-drawer
    :visible="visible"
    :on-close="handleClose"
    :close-btn="false"
    :footer="false"
    placement="right"
    size="520px"
    class="quick-create-salesman-drawer"
    destroy-on-close
    :close-on-overlay-click="false"
    :close-on-esc-keydown="!submitting"
    :show-overlay="true"
    aria-label="快速创建业务员"
    role="dialog"
  >
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span class="header-title">快速创建业务员</span>
        </div>
        <div class="header-actions">
          <button class="confirm-btn create-btn" @click="handleSubmit" :disabled="submitting">
            <t-loading v-if="submitting" size="14px" />
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {{ submitting ? '创建中...' : '确认创建' }}
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
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-info)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
          <span>基本信息</span>
        </div>
        <div class="card-body">
          <t-form-item label="姓名" name="name">
            <t-input
              ref="nameInputRef"
              v-model="formData.name"
              placeholder="请输入业务员姓名"
              clearable
              :disabled="submitting"
              aria-label="业务员姓名"
              aria-required="true"
            />
          </t-form-item>
          <div class="form-row two-col">
            <t-form-item label="联系电话" name="phone" class="form-col">
              <t-input
                v-model="formData.phone"
                placeholder="系统自动生成"
                clearable
                :disabled="submitting"
                aria-label="联系电话"
              />
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
                <template #suffixIcon>
                  <t-tooltip content="工号由系统自动生成，格式：YW+5位数字" placement="top">
                    <t-icon name="lock-on" style="color: var(--color-text-placeholder); cursor: help;" />
                  </t-tooltip>
                </template>
              </t-input>
            </t-form-item>
          </div>
          <div class="form-row two-col">
            <t-form-item label="部门" name="department" class="form-col">
              <t-input
                v-model="formData.department"
                placeholder="请输入部门名称"
                clearable
                :disabled="submitting"
                aria-label="部门"
              />
            </t-form-item>
            <t-form-item label="邮箱" name="email" class="form-col">
              <t-input
                v-model="formData.email"
                placeholder="系统自动生成"
                clearable
                :disabled="submitting"
                aria-label="邮箱"
              />
            </t-form-item>
          </div>
        </div>
      </div>

      <div class="drawer-card note-card">
        <div class="card-header">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning)" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>备注信息</span>
        </div>
        <div class="card-body">
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
        </div>
      </div>
    </t-form>
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '创建业务员失败';
    MessagePlugin.error(msg)
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


  :deep(.t-input.t-is-focused),
  :deep(.t-input-number.t-is-focused) {
    border-color: var(--color-primary) !important;
  }

  :deep(.t-input.t-is-focused .t-input__inner),
  :deep(.t-input-number.t-is-focused .t-input__inner) {
    box-shadow: 0 0 0 2px var(--overlay-brand-30) !important;
  }
}

.quick-create-salesman-drawer {
  :deep(.t-drawer__content-wrapper) {
    box-shadow: -8px 0 30px rgba(0, 0, 0, 0.08);
  }

  :deep(.t-drawer__body) {
    padding: 0;
    overflow-x: hidden;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;

    .header-left {
      display: flex;
      align-items: center;
      gap: var(--space-2-5);

      .header-title {
        font-size: 17px;
        font-weight: 600;
        color: var(--color-text-primary);
      }
    }

    .header-actions {
      .confirm-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1-5);
        padding: var(--space-2) var(--space-4-5);
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;

        &.create-btn {
          background: var(--color-primary);
          color: var(--color-text-white);

          &:hover {
            background: var(--color-primary-dark);
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
    margin: 0 var(--space-7) 16px;

    &:first-of-type {
      margin-top: 16px;
    }

    border: 1px solid var(--color-border-light);
    border-radius: 12px;
    overflow: hidden;

    &:last-child {
      margin-bottom: 20px;
    }

    &.info-card {
      border-left: 3px solid var(--color-info);
    }

    &.note-card {
      border-left: 3px solid var(--color-warning);
    }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: var(--color-bg-page);
      border-bottom: 1px solid var(--color-border-light);

      span {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
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
    color: var(--color-text-primary);
    margin-bottom: var(--space-1-5);
  }

  :deep(.t-input) {
    border-radius: 8px;
    min-height: 38px;

    .t-input__inner {
      font-size: 14px;
    }
  }

  :deep(.t-textarea) {
    border-radius: 8px;
  }

  .code-readonly :deep(.t-input) {
    background: var(--color-bg-hover);
    cursor: not-allowed;

    .t-input__inner {
      color: var(--color-text-secondary);
      -webkit-text-fill-color: var(--color-text-secondary);
    }
  }
}
</style>
