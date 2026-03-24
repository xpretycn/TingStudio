<template>
  <div class="salesman-form">
    <t-card bordered>
      <template #header>
        <div class="form-header">
          <t-button variant="text" @click="handleBack"><template #icon><t-icon name="chevron-left" /></template>返回</t-button>
          <span class="form-title">{{ isEdit ? '编辑业务员' : '新增业务员' }}</span>
        </div>
      </template>
      <t-form ref="formRef" :data="formData" :rules="rules" label-width="100px" @submit="handleSubmit">
        <t-form-item label="姓名" name="name">
          <t-input v-model="formData.name" placeholder="请输入姓名" clearable />
        </t-form-item>
        <t-form-item label="工号" name="code">
          <t-input v-model="formData.code" placeholder="请输入工号" clearable :disabled="isEdit" />
        </t-form-item>
        <t-form-item label="部门" name="department">
          <t-input v-model="formData.department" placeholder="请输入部门" clearable />
        </t-form-item>
        <t-form-item label="电话" name="phone">
          <t-input v-model="formData.phone" placeholder="请输入电话" clearable />
        </t-form-item>
        <t-form-item label="邮箱" name="email">
          <t-input v-model="formData.email" placeholder="请输入邮箱" clearable />
        </t-form-item>
        <t-form-item>
          <t-space>
            <t-button theme="primary" type="submit" :loading="loading">{{ isEdit ? '保存' : '创建' }}</t-button>
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
import { useSalesmanStore } from '@/stores/salesman'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'
import type { SalesmanForm } from '@/api/salesman'

const router = useRouter()
const route = useRoute()
const salesmanStore = useSalesmanStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)
const isEdit = computed(() => !!route.params.id)

const formData = reactive<SalesmanForm>({
  name: '', code: '', department: '', phone: '', email: ''
})

const rules: Record<string, FormRule[]> = {
  name: [{ required: true, message: '请输入姓名' }, { min: 2, message: '姓名至少2个字符' }],
  code: [{ required: true, message: '请输入工号' }]
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    loading.value = true
    try {
      const id = route.params.id as string
      const result = isEdit.value && id
        ? await salesmanStore.updateSalesman(id, formData)
        : await salesmanStore.createSalesman(formData)
      if (result.success) {
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功')
        router.push('/salesmen')
      } else {
        MessagePlugin.error(result.message || '操作失败')
      }
    } finally {
      loading.value = false
    }
  }
}

const handleBack = () => router.push('/salesmen')

onMounted(async () => {
  const id = route.params.id as string
  if (isEdit.value && id) {
    const salesman = await salesmanStore.getSalesman(id)
    if (salesman) {
      Object.assign(formData, {
        name: salesman.name,
        code: salesman.code,
        department: salesman.department || '',
        phone: salesman.phone || '',
        email: salesman.email || ''
      })
    }
  }
})
</script>

<style scoped lang="scss">
.salesman-form {
  .form-header {
    display: flex; align-items: center; gap: 12px;
    .form-title { font-size: 16px; font-weight: 600; color: #5D4E60; }
  }
}
</style>
