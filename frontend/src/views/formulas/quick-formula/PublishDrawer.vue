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
  <t-drawer
    :visible="visible"
    header="发布为正式配方"
    size="420px"
    placement="right"
    :close-on-overlay-click="false"
    @close="handleClose"
  >
    <div class="publish-form">
      <div class="form-field">
        <label class="field-label">
          业务员
          <span class="field-required">*</span>
        </label>
        <t-select
          v-model="formData.salesmanId"
          :options="salesmanOptions"
          placeholder="请选择业务员"
          :loading="salesmenLoading"
          clearable
          filterable
          :popup-props="{ appendToBody: true }"
        />
      </div>

      <div class="form-field">
        <label class="field-label">
          配方描述
          <span class="field-required">*</span>
        </label>
        <t-textarea
          v-model="formData.description"
          placeholder="请输入配方描述"
          :maxlength="2000"
          :autosize="{ minRows: 3, maxRows: 6 }"
        />
      </div>

      <div class="form-field">
        <label class="field-label">制备方法</label>
        <t-textarea
          v-model="formData.preparationMethod"
          placeholder="请输入制备方法（可选）"
          :maxlength="5000"
          :autosize="{ minRows: 3, maxRows: 8 }"
        />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <t-button theme="default" variant="outline" @click="handleClose">取消</t-button>
        <t-button
          theme="default"
          class="btn-emerald-fill"
          :loading="publishing"
          :disabled="!isFormValid"
          @click="handlePublish"
        >
          确认发布
        </t-button>
      </div>
    </template>
  </t-drawer>
</template>

<style lang="scss" scoped>
@use "@/assets/styles/variables" as *;

.publish-form {
  display: flex;
  flex-direction: column;
  gap: $space-6;
  padding: $space-2 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: $space-2;
}

.field-label {
  font-size: $font-size-body-sm;
  font-weight: $font-weight-medium;
  color: $text-primary;
  letter-spacing: $ls-caption;
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
    background-color: $text-placeholder !important;
    border-color: $text-placeholder !important;
    cursor: not-allowed;
  }
}
</style>
