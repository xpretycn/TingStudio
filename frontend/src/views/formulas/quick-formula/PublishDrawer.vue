<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue"
import { salesmanApi } from "@/api/salesman"
import type { Salesman } from "@/api/salesman"
import { useQuickFormulaListStore } from "@/stores/quickFormulaList"
import type { PublishData } from "@/types/quickFormula"

const props = defineProps<{
  visible: boolean
  quickFormulaId: string
}>()

const emit = defineEmits<{
  "update:visible": [val: boolean]
  published: [data: { formulaId: string; versionId: string }]
}>()

const store = useQuickFormulaListStore()

const salesmen = ref<Salesman[]>([])
const salesmenLoading = ref(false)
const publishing = ref(false)

const formData = ref<PublishData>({
  salesmanId: "",
  description: "",
  preparationMethod: "",
})

const salesmanOptions = computed(() =>
  salesmen.value.map((s) => ({
    label: s.name,
    value: s.id,
  }))
)

const isFormValid = computed(() => {
  return formData.value.salesmanId.trim() !== "" && formData.value.description.trim() !== ""
})

async function fetchSalesmen() {
  salesmenLoading.value = true
  try {
    const res = await salesmanApi.getList({ pageSize: 100 })
    salesmen.value = res.list || []
  } catch {
    // HTTP 拦截器已自动提示
  } finally {
    salesmenLoading.value = false
  }
}

function handleClose() {
  emit("update:visible", false)
}

async function handlePublish() {
  if (!isFormValid.value || !props.quickFormulaId) return
  publishing.value = true
  try {
    const result = await store.publishQuickFormula(props.quickFormulaId, {
      salesmanId: formData.value.salesmanId,
      description: formData.value.description,
      preparationMethod: formData.value.preparationMethod || undefined,
    })
    if (result) {
      emit("published", result)
      handleClose()
    }
  } finally {
    publishing.value = false
  }
}

function resetForm() {
  formData.value = {
    salesmanId: "",
    description: "",
    preparationMethod: "",
  }
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      resetForm()
      fetchSalesmen()
    }
  }
)

onMounted(() => {
  if (props.visible) {
    fetchSalesmen()
  }
})
</script>

<template>
  <t-drawer :visible="visible" size="420px" placement="right" :close-on-overlay-click="true" @close="handleClose">
    <template #header>
      <div class="drawer-header">
        <div class="drawer-header-icon">
          <t-icon name="upload" size="20px" />
        </div>
        <div class="drawer-header-text">
          <span class="drawer-header-title">发布为正式配方</span>
          <span class="drawer-header-desc">将快速配方发布为正式配方，发布后可进入配方管理查看</span>
        </div>
      </div>
    </template>
    <div class="publish-form">
      <div class="publish-tip">
        <t-icon name="info-circle" size="14px" class="tip-icon" />
        <span>发布后快速配方状态将变为"已发布"，不可再编辑</span>
      </div>
      <div class="form-field">
        <label class="field-label">
          <t-icon name="user" size="14px" class="field-icon" />
          业务员
          <span class="field-required">*</span>
        </label>
        <t-select v-model="formData.salesmanId" :options="salesmanOptions" placeholder="请选择业务员"
          :loading="salesmenLoading" clearable filterable :popup-props="{ appendToBody: true }" />
      </div>

      <div class="form-field">
        <label class="field-label">
          <t-icon name="file-copy" size="14px" class="field-icon" />
          配方描述
          <span class="field-required">*</span>
        </label>
        <t-textarea v-model="formData.description" placeholder="请输入配方描述" :maxlength="2000"
          :autosize="{ minRows: 3, maxRows: 6 }" />
      </div>

      <div class="form-field">
        <label class="field-label">
          <t-icon name="file-paste" size="14px" class="field-icon" />
          制备方法
        </label>
        <t-textarea v-model="formData.preparationMethod" placeholder="请输入制备方法（可选）" :maxlength="5000"
          :autosize="{ minRows: 3, maxRows: 8 }" />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <t-button theme="default" variant="outline" @click="handleClose">
          <template #icon><t-icon name="close" /></template>
          取消
        </t-button>
        <t-button theme="default" class="btn-emerald-fill" :loading="publishing" :disabled="!isFormValid"
          @click="handlePublish">
          <template #icon><t-icon name="upload" /></template>
          确认发布
        </t-button>
      </div>
    </template>
  </t-drawer>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.drawer-header {
  display: flex;
  align-items: flex-start;
  gap: $space-3;
}

.drawer-header-icon {
  width: 40px;
  height: 40px;
  border-radius: $radius-lg;
  background: $overlay-emerald-08;
  color: $emerald-500;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.drawer-header-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.drawer-header-title {
  font-size: $font-size-h4;
  font-weight: $font-weight-bold;
  color: var(--color-text-primary);
  line-height: 1.4;
}

.drawer-header-desc {
  font-size: $font-size-caption;
  color: var(--color-text-placeholder);
  line-height: 1.4;
}

.publish-form {
  display: flex;
  flex-direction: column;
  gap: $space-5;
  padding: $space-2 0;
}

.publish-tip {
  display: flex;
  align-items: center;
  gap: $space-2;
  padding: $space-2-5 $space-3;
  background: $color-info-bg;
  border-radius: $radius-lg;
  border: 1px solid rgba($color-info, 0.15);

  .tip-icon {
    color: $color-info;
    flex-shrink: 0;
  }

  span {
    font-size: $font-size-caption;
    color: $color-info;
    line-height: 1.5;
  }
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.field-label {
  display: flex;
  align-items: center;
  gap: $space-1-5;
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  color: var(--color-text-primary);
  letter-spacing: $ls-caption;
}

.field-icon {
  color: $emerald-500;
  flex-shrink: 0;
}

.field-required {
  color: $color-danger;
  margin-left: 2px;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: $space-3;
}

.btn-emerald-fill {
  background-color: $emerald-500 !important;
  color: $text-white !important;
  border-color: $emerald-500 !important;

  &:hover {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:active {
    background-color: $emerald-600 !important;
    border-color: $emerald-600 !important;
  }

  &:disabled {
    background-color: var(--color-text-placeholder) !important;
    border-color: var(--color-text-placeholder) !important;
    cursor: not-allowed;
  }
}
</style>
