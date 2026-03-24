<template>
  <div class="customer-form">
    <t-card bordered>
      <template #header>
        <div class="form-header">
          <t-button variant="text" @click="handleBack">
            <template #icon>
              <t-icon name="chevron-left" />
            </template>
            返回
          </t-button>
          <span class="form-title">{{ isEdit ? '编辑客户' : '新增客户' }}</span>
        </div>
      </template>

      <t-form
        ref="formRef"
        :data="formData"
        :rules="rules"
        label-width="100px"
        @submit="handleSubmit"
      >
        <t-form-item label="客户名称" name="name">
          <t-input
            v-model="formData.name"
            placeholder="请输入客户名称"
            clearable
          />
        </t-form-item>

        <t-form-item label="联系人" name="contact">
          <t-input
            v-model="formData.contact"
            placeholder="请输入联系人"
            clearable
          />
        </t-form-item>

        <t-form-item label="联系电话" name="phone">
          <t-input
            v-model="formData.phone"
            placeholder="请输入联系电话"
            clearable
          />
        </t-form-item>

        <t-form-item label="邮箱" name="email">
          <t-input
            v-model="formData.email"
            placeholder="请输入邮箱"
            clearable
          />
        </t-form-item>

        <t-form-item label="地址" name="address">
          <t-textarea
            v-model="formData.address"
            placeholder="请输入地址"
            :autosize="{ minRows: 3, maxRows: 5 }"
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
import { useCustomerStore } from '@/stores/customer'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'
import type { CustomerForm } from '@/api/customer'

const router = useRouter()
const route = useRoute()
const customerStore = useCustomerStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)

const isEdit = computed(() => !!route.params.id)

const formData = reactive<CustomerForm>({
  name: '',
  contact: '',
  phone: '',
  email: '',
  address: ''
})

const validatePhone = (value: string) => {
  if (!value) return true
  return /^1[3-9]\d{9}$/.test(value)
}

const validateEmail = (value: string) => {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入客户名称' },
    { min: 2, message: '客户名称至少2个字符' }
  ],
  contact: [{ required: true, message: '请输入联系人' }],
  phone: [
    { required: true, message: '请输入联系电话' },
    { validator: validatePhone, message: '请输入正确的手机号码' }
  ],
  email: [{ validator: validateEmail, message: '请输入正确的邮箱地址' }]
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    loading.value = true
    try {
      const id = route.params.id as string
      let result

      if (isEdit.value && id) {
        result = await customerStore.updateCustomer(id, formData)
      } else {
        result = await customerStore.createCustomer(formData)
      }

      if (result.success) {
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功')
        router.push('/customers')
      } else {
        MessagePlugin.error(result.message || '操作失败')
      }
    } finally {
      loading.value = false
    }
  }
}

const handleBack = () => {
  router.push('/customers')
}

onMounted(async () => {
  const id = route.params.id as string
  if (isEdit.value && id) {
    const customer = await customerStore.getCustomer(id)
    if (customer) {
      Object.assign(formData, {
        name: customer.name,
        contact: customer.contact || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || ''
      })
    }
  }
})
</script>

<style scoped lang="scss">
.customer-form {
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
}
</style>
