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
import { useMaterialStore } from '@/stores/material'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'
import type { MaterialForm } from '@/api/material'

const router = useRouter()
const route = useRoute()
const materialStore = useMaterialStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)

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
    { required: true, message: '请输入原料编码' },
    { pattern: /^[A-Z0-9-]+$/, message: '编码只能包含大写字母、数字和横线' }
  ],
  name: [
    { required: true, message: '请输入原料名称' },
    { min: 2, message: '原料名称至少2个字符' }
  ],
  unit: [{ required: true, message: '请选择单位' }],
  stock: [{ required: true, message: '请输入库存数量' }]
}



const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
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
    }
  }
})
</script>

<style scoped lang="scss">
.material-form {
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
