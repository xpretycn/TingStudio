<template>
  <div class="agent-form-renderer">
    <div class="form-header">
      <h4 class="form-title">{{ formSchema.title }}</h4>
      <p v-if="formSchema.description" class="form-desc">{{ formSchema.description }}</p>
    </div>

    <div class="form-body">
      <div v-for="field in formSchema.fields" :key="field.name" class="form-field"
        :class="{ 'has-error': errors[field.name] }">
        <label class="field-label">
          {{ field.label }}
          <span v-if="field.required" class="required-mark">*</span>
        </label>

        <template v-if="field.type === 'text'">
          <t-input v-model="formData[field.name]" :placeholder="field.placeholder || ''"
            :status="errors[field.name] ? 'error' : undefined" @blur="validateField(field)" />
        </template>

        <template v-else-if="field.type === 'number'">
          <t-input-number v-model="formData[field.name]" :placeholder="field.placeholder || ''"
            :min="field.validation?.min" :max="field.validation?.max"
            :status="errors[field.name] ? 'error' : undefined" @blur="validateField(field)" />
        </template>

        <template v-else-if="field.type === 'textarea'">
          <t-textarea v-model="formData[field.name]" :placeholder="field.placeholder || ''" :maxlength="500"
            :status="errors[field.name] ? 'error' : undefined" @blur="validateField(field)" />
        </template>

        <template v-else-if="field.type === 'select'">
          <t-select v-model="formData[field.name]" :placeholder="field.placeholder || '请选择'"
            :options="field.options?.map(o => ({ label: o.label, value: o.value }))"
            :status="errors[field.name] ? 'error' : undefined" @change="validateField(field)" clearable />
        </template>

        <template v-else-if="field.type === 'multiselect'">
          <t-select v-model="formData[field.name]" :placeholder="field.placeholder || '请选择'" multiple
            :options="field.options?.map(o => ({ label: o.label, value: o.value }))"
            :status="errors[field.name] ? 'error' : undefined" @change="validateField(field)" clearable />
        </template>

        <template v-else-if="field.type === 'date'">
          <t-date-picker v-model="formData[field.name]" :placeholder="field.placeholder || '请选择日期'"
            :status="errors[field.name] ? 'error' : undefined" @change="validateField(field)" clearable />
        </template>

        <template v-else-if="field.type === 'material-list'">
          <div class="material-list-field">
            <div v-for="(item, idx) in materialItems" :key="idx" class="material-item-row">
              <t-select v-model="item.name" placeholder="选择原料"
                :options="field.options?.map(o => ({ label: o.label, value: o.value }))" class="material-name-select"
                @change="onMaterialChange(idx)" clearable />
              <t-input-number v-model="item.quantity" placeholder="用量(g)" :min="0" class="material-qty-input" />
              <button class="material-remove-btn" @click="removeMaterialItem(idx)" title="移除">×</button>
            </div>
            <button class="material-add-btn" @click="addMaterialItem">+ 添加原料</button>
          </div>
        </template>

        <div v-if="errors[field.name]" class="field-error">{{ errors[field.name] }}</div>
      </div>
    </div>

    <div class="form-footer">
      <t-button theme="default" variant="outline" @click="handleCancel">
        {{ formSchema.cancelLabel || '取消' }}
      </t-button>
      <t-button theme="primary" :loading="submitting" @click="handleSubmit">
        {{ formSchema.submitLabel || '提交' }}
      </t-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from "vue";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea" | "multiselect" | "material-list";
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string; type?: string }>;
  defaultValue?: unknown;
  validation?: { min?: number; max?: number; pattern?: string; message?: string };
  errorMessage?: string;
}

export interface FormSchema {
  formId: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
  toolName: string;
}

const props = defineProps<{
  formSchema: FormSchema;
}>();

const emit = defineEmits<{
  submit: [formData: Record<string, unknown>];
  cancel: [];
}>();

const formData = reactive<Record<string, unknown>>({});
const errors = reactive<Record<string, string>>({});
const submitting = ref(false);
const materialItems = ref<Array<{ name: string; quantity: number }>>([]);

onMounted(() => {
  for (const field of props.formSchema.fields) {
    if (field.type === "material-list") {
      materialItems.value = [];
    } else if (field.defaultValue !== undefined) {
      formData[field.name] = field.defaultValue;
    } else if (field.type === "multiselect") {
      formData[field.name] = [];
    } else if (field.type === "number") {
      formData[field.name] = undefined;
    } else {
      formData[field.name] = "";
    }
  }
});

function validateField(field: FormField): boolean {
  const value = formData[field.name];

  if (field.required && (value === undefined || value === null || value === "")) {
    errors[field.name] = `${field.label}不能为空`;
    return false;
  }

  if (field.type === "number" && value !== undefined && value !== null && value !== "") {
    const num = Number(value);
    if (isNaN(num)) {
      errors[field.name] = `${field.label}必须是数字`;
      return false;
    }
    if (field.validation?.min !== undefined && num < field.validation.min) {
      errors[field.name] = field.validation.message || `${field.label}不能小于${field.validation.min}`;
      return false;
    }
    if (field.validation?.max !== undefined && num > field.validation.max) {
      errors[field.name] = field.validation.message || `${field.label}不能大于${field.validation.max}`;
      return false;
    }
  }

  if (field.validation?.pattern && value) {
    const regex = new RegExp(field.validation.pattern);
    if (!regex.test(String(value))) {
      errors[field.name] = field.validation.message || `${field.label}格式不正确`;
      return false;
    }
  }

  delete errors[field.name];
  return true;
}

function validateAll(): boolean {
  let valid = true;
  for (const field of props.formSchema.fields) {
    if (field.type === "material-list") continue;
    if (!validateField(field)) valid = false;
  }

  const materialField = props.formSchema.fields.find(f => f.type === "material-list");
  if (materialField?.required && materialItems.value.length === 0) {
    errors[materialField.name] = "请至少添加一种原料";
    valid = false;
  }

  return valid;
}

function addMaterialItem() {
  materialItems.value.push({ name: "", quantity: 0 });
}

function removeMaterialItem(idx: number) {
  materialItems.value.splice(idx, 1);
}

function onMaterialChange(_idx: number) {
  const materialField = props.formSchema.fields.find(f => f.type === "material-list");
  if (materialField && errors[materialField.name] && materialItems.value.length > 0) {
    delete errors[materialField.name];
  }
}

function buildSubmitData(): Record<string, unknown> {
  const result: Record<string, unknown> = { ...formData };

  const materialField = props.formSchema.fields.find(f => f.type === "material-list");
  if (materialField) {
    result[materialField.name] = materialItems.value
      .filter(item => item.name)
      .map(item => ({
        name: item.name,
        quantity: item.quantity,
      }));
  }

  return result;
}

async function handleSubmit() {
  if (!validateAll()) return;

  submitting.value = true;
  try {
    const data = buildSubmitData();
    emit("submit", data);
  } finally {
    submitting.value = false;
  }
}

function handleCancel() {
  emit("cancel");
}
</script>

<style scoped lang="scss">
.agent-form-renderer {
  margin: 8px 0;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--color-bg-container);

  .form-header {
    padding: 12px 16px;
    background: linear-gradient(135deg, var(--color-info-bg) 0%, var(--color-info-bg) 100%);
    border-bottom: 1px solid var(--color-border);

    .form-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .form-desc {
      margin: 4px 0 0;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  }

  .form-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: var(--space-3-5);

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &.has-error {
        :deep(.t-input),
        :deep(.t-textarea__inner),
        :deep(.t-select) {
          border-color: var(--color-danger);
        }
      }

      .field-label {
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-primary);

        .required-mark {
          color: var(--color-danger);
          margin-left: var(--space-0-5);
        }
      }

      .field-error {
        font-size: 12px;
        color: var(--color-danger);
        margin-top: var(--space-0-5);
      }
    }
  }

  .material-list-field {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .material-item-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .material-name-select {
        flex: 1;
      }

      .material-qty-input {
        width: 120px;
      }

      .material-remove-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: var(--color-danger-bg);
        color: var(--color-danger);
        border-radius: 6px;
        cursor: pointer;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &:hover {
          background: var(--color-danger-border);
        }
      }
    }

    .material-add-btn {
      border: 1px dashed var(--color-text-placeholder);
      background: transparent;
      color: var(--color-text-secondary);
      padding: var(--space-1-5) 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      text-align: center;

      &:hover {
        border-color: var(--color-info);
        color: var(--color-info);
        background: var(--color-info-bg);
      }
    }
  }

  .form-footer {
    padding: 12px 16px;
    border-top: 1px solid var(--color-border);
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    background: var(--color-bg-page);
  }
}
</style>
