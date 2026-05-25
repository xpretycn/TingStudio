<template>
  <div class="salesman-form">
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="handleBack" title="返回列表">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="handleBack">业务员管理</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">{{ isEdit ? '编辑业务员' : '新增业务员' }}</span>
          </nav>
          <h2 class="formula-title">{{ isEdit ? '编辑业务员' : '新增业务员' }}</h2>
        </div>
      </div>
      <div class="header-actions">
        <button class="header-action-btn secondary" @click="handleBack">
          <t-icon name="close" class="btn-icon" />
          取消
        </button>
        <button class="header-action-btn" @click="handleSubmit({ validateResult: true })">
          <t-icon name="save" class="btn-icon" />
          {{ isEdit ? '保存' : '创建' }}
        </button>
      </div>
    </header>

    <main class="form-main">
      <t-form ref="formRef" :data="formData" :rules="rules" scroll-to-first-error @submit="handleSubmit">
        <div class="form-grid">
          <div class="form-grid-left animate-fade-in">
            <section class="form-section">
              <h3 class="section-title">
                <t-icon name="user-circle" class="section-icon" />
                基础信息录入
              </h3>
              <div class="section-content space-y-6">
                <div class="form-field">
                  <label class="field-label">姓名 <span class="required">*</span></label>
                  <t-input v-model="formData.name" placeholder="请输入姓名" clearable class="field-input"
                    data-field="name" />
                </div>

                <div class="grid grid-cols-2 gap-6">
                  <div class="form-field">
                    <label class="field-label">工号 <span class="required">*</span></label>
                    <t-input v-model="formData.code" placeholder="请输入工号" clearable class="field-input"
                      data-field="code" />
                  </div>
                  <div class="form-field">
                    <label class="field-label">部门</label>
                    <t-input v-model="formData.department" placeholder="请输入部门" clearable class="field-input"
                      data-field="department" />
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-6">
                  <div class="form-field">
                    <label class="field-label">电话</label>
                    <t-input v-model="formData.phone" placeholder="请输入 11 位手机号" clearable maxlength="11"
                      class="field-input" data-field="phone" />
                    <p class="field-help">选填，格式如 13800138000</p>
                  </div>
                  <div class="form-field">
                    <label class="field-label">邮箱</label>
                    <t-input v-model="formData.email" placeholder="请输入邮箱地址" clearable class="field-input"
                      data-field="email" />
                    <p class="field-help">选填，格式如 user@example.com</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div class="form-grid-right animate-fade-in" style="animation-delay: 0.1s;">
            <section class="upload-panel">
              <div class="upload-panel-bg"></div>
              <div class="upload-panel-content">
                <div class="upload-header">
                  <div class="upload-icon-wrap">
                    <t-icon name="image" />
                  </div>
                  <div class="upload-title-group">
                    <h3 class="upload-title">头像上传</h3>
                    <p class="upload-subtitle">支持 JPG、PNG 格式，建议尺寸 200×200</p>
                  </div>
                </div>

                <div class="upload-body">
                  <div v-if="!avatarPreview" class="upload-zone" :class="{ 'drag-over': isDragOver }"
                    @click="triggerUpload" @dragover.prevent="handleDragOver" @dragleave="handleDragLeave"
                    @drop.prevent="handleDrop">
                    <input ref="fileInputRef" type="file" accept=".jpg,.jpeg,.png" style="display: none;"
                      @change="handleFileChange" />
                    <div class="upload-zone-icon">
                      <t-icon name="cloud-upload" />
                    </div>
                    <div class="upload-zone-text">
                      <p class="upload-zone-title">点击或拖拽上传头像</p>
                      <p class="upload-zone-hint">支持 .jpg, .png (最大 2MB)</p>
                    </div>
                  </div>

                  <div v-else class="preview-area">
                    <div class="preview-image-wrap">
                      <img loading="lazy" :src="avatarPreview" alt="头像预览" class="preview-image" />
                    </div>
                    <div class="preview-actions">
                      <button type="button" class="preview-btn preview-btn--primary" @click="triggerUpload">
                        <t-icon name="edit" /> 更换
                      </button>
                      <button type="button" class="preview-btn preview-btn--danger" @click="removeAvatar">
                        <t-icon name="delete" /> 删除
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </t-form>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSalesmanStore } from '@/stores/salesman';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';
import type { SalesmanForm } from '@/api/salesman';

const router = useRouter();
const route = useRoute();
const salesmanStore = useSalesmanStore();

const formRef = ref<FormInstanceFunctions>();
const loading = ref(false);
const isEdit = computed(() => !!route.params.id);

const formData = reactive<SalesmanForm>({
  name: '', code: '', department: '', phone: '', email: ''
});

const fileInputRef = ref<HTMLInputElement>();
const avatarPreview = ref<string>('');
const isDragOver = ref(false);
const avatarFile = ref<File | null>(null);

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const triggerUpload = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  validateAndPreview(file);
};

const validateAndPreview = (file: File) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!validTypes.includes(file.type)) {
    MessagePlugin.error('仅支持 JPG、PNG 格式图片');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    MessagePlugin.error('图片大小不能超过 2MB');
    return;
  }
  avatarFile.value = file;
  const reader = new FileReader();
  reader.onload = () => {
    avatarPreview.value = reader.result as string;
  };
  reader.readAsDataURL(file);
};

const handleDragOver = () => {
  isDragOver.value = true;
};

const handleDragLeave = () => {
  isDragOver.value = false;
};

const handleDrop = (e: DragEvent) => {
  isDragOver.value = false;
  const file = e.dataTransfer?.files[0];
  if (file) validateAndPreview(file);
};

const removeAvatar = () => {
  avatarPreview.value = '';
  avatarFile.value = null;
  if (fileInputRef.value) fileInputRef.value.value = '';
};

const phoneValidator = (val: string) => {
  if (!val) return true;
  return /^1[3-9]\d{9}$/.test(val);
};

const emailValidator = (val: string) => {
  if (!val) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
};

const rules: Record<string, FormRule[]> = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名需 2-20 个字符', trigger: 'blur' },
  ],
  code: [
    { required: true, message: '请输入工号', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '工号只能包含字母、数字、下划线和横线', trigger: 'blur' },
  ],
  department: [
    { max: 50, message: '部门名称不超过 50 个字符', trigger: 'blur' },
  ],
  phone: [
    { validator: phoneValidator, message: '请输入正确的 11 位手机号（如 13800138000）', trigger: 'blur' },
  ],
  email: [
    { validator: emailValidator, message: '请输入正确的邮箱地址（如 user@example.com）', trigger: 'blur' },
  ],
};

const handleSubmit = async ({ validateResult }: { validateResult: boolean | Record<string, unknown>[] }) => {
  if (validateResult === true) {
    if (loading.value) return;
    loading.value = true;
    try {
      const id = route.params.id as string;
      const result = isEdit.value && id
        ? await salesmanStore.updateSalesman(id, formData)
        : await salesmanStore.createSalesman(formData);
      if (result.success) {
        MessagePlugin.success(isEdit.value ? '保存成功' : '创建成功');
        router.push({
          path: '/salesmen',
          query: route.query
        });
      } else {
        MessagePlugin.error(result.message || '操作失败');
      }
    } finally {
      loading.value = false;
    }
  }
};

const handleBack = () => {
  router.push({
    path: '/salesmen',
    query: route.query
  });
};

onMounted(async () => {
  const id = route.params.id as string;
  if (isEdit.value && id) {
    const salesman = await salesmanStore.getSalesman(id);
    if (salesman) {
      Object.assign(formData, {
        name: salesman.name,
        code: salesman.code,
        department: salesman.department || '',
        phone: salesman.phone || '',
        email: salesman.email || ''
      });
    }
  } else {
    const now = Date.now();
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    formData.code = `YW${now.toString().slice(-3)}${random}`;
    formData.department = '销售部';
    formData.phone = `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
    formData.email = `salesman${now.toString().slice(-6)}@tingstudio.com`;
  }
});
</script>

<style scoped lang="scss">
.salesman-form {

  .detail-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -32px;
    margin-right: -32px;
    padding: 8px 32px;
    background-color: rgba(255, 255, 255, 0.80);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid #f1f5f9;
    animation: fadeInDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) both;

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;

      .header-back-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        border-radius: 12px;
        background: transparent;
        color: var(--color-text-placeholder);
        cursor: pointer;
        transition: all $transition-fast;
        font-size: 20px;

        &:hover {
          color: var(--color-primary);
          background-color: #ecfdf5;
        }
      }

      .header-title-group {
        display: flex;
        flex-direction: column;
        gap: var(--space-1-5);

        .header-breadcrumb {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: 12px;
          line-height: 1;

          .breadcrumb-link {
            color: var(--color-text-placeholder);
            cursor: pointer;
            transition: color 0.15s;
            text-decoration: none;

            &:hover {
              color: var(--color-primary);
            }
          }

          .breadcrumb-sep {
            font-size: 12px;
            color: var(--color-text-placeholder);
          }

          .breadcrumb-current {
            color: var(--color-text-secondary);
          }
        }

        .formula-title {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.35;
        }
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;

      .header-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background-color: var(--color-primary);
        color: #ffffff;
        border: none;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 700;
        box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.25);
        cursor: pointer;
        transition: all $transition-fast;

        .btn-icon {
          font-size: 18px;
        }

        &:hover {
          background-color: var(--color-primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 14px 20px -3px rgba(16, 185, 129, 0.35);
        }

        &:active {
          transform: translateY(0);
          background-color: var(--color-primary-deep);
        }

        &.secondary {
          background-color: #f1f5f9;
          color: var(--color-text-secondary);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

          &:hover {
            background-color: var(--color-border);
            color: var(--color-text-secondary);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }

          &:active {
            background-color: #cbd5e1;
          }
        }
      }
    }
  }

  .upload-panel {
    background: linear-gradient(145deg, #ffffff 0%, var(--color-bg-page) 50%, #f1f5f9 100%);
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(16, 185, 129, 0.06);
    color: var(--color-text-primary);
    position: relative;
    overflow: hidden;
    animation: fadeInUp 0.5s ease both;
    animation-delay: 0.15s;
    border: 1px solid rgba(148, 163, 184, 0.15);

    .upload-panel-bg {
      position: absolute;
      top: -40px;
      right: -40px;
      width: 180px;
      height: 180px;
      background: radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%);
      filter: blur(60px);
      border-radius: 50%;
    }

    .upload-panel-content {
      position: relative;
      z-index: 1;
    }

    .upload-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 24px;

      .upload-icon-wrap {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, var(--color-primary), #2dd4bf);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 20px;
      }

      .upload-title-group {
        .upload-title {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: var(--color-text-primary);
        }

        .upload-subtitle {
          margin: var(--space-0-5) 0 0;
          font-size: 12px;
          color: var(--color-text-placeholder);
        }
      }
    }

    .upload-body {
      .upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 24px;
        border: 2px dashed var(--color-border);
        border-radius: 20px;
        background-color: var(--color-bg-page);
        cursor: pointer;
        transition: all $transition-slow;

        &:hover,
        &.drag-over {
          border-color: var(--color-primary);
          background-color: #ecfdf5;

          .upload-zone-icon {
            color: var(--color-primary);
            transform: scale(1.08);
          }

          .upload-zone-title {
            color: var(--color-primary-dark);
          }
        }

        &.drag-over {
          transform: scale(1.01);
        }

        .upload-zone-icon {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          color: var(--color-text-placeholder);
          transition: all $transition-slow;
          margin-bottom: 16px;
        }

        .upload-zone-text {
          text-align: center;

          .upload-zone-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--color-text-secondary);
            margin: 0 0 var(--space-1-5);
            transition: color 0.2s;
          }

          .upload-zone-hint {
            font-size: 12px;
            color: var(--color-text-placeholder);
            margin: 0;
          }
        }
      }

      .preview-area {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;

        .preview-image-wrap {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          overflow: hidden;
          border: 3px solid #f1f5f9;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
          background-color: var(--color-bg-page);

          .preview-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }

        .preview-actions {
          display: flex;
          gap: 12px;

          .preview-btn {
            display: inline-flex;
            align-items: center;
            gap: var(--space-1-5);
            padding: 8px var(--space-4-5);
            border: none;
            border-radius: 12px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all $transition-fast;

            .t-icon {
              font-size: 15px;
            }

            &--primary {
              background-color: var(--color-primary);
              color: #fff;

              &:hover {
                background-color: var(--color-primary-dark);
                transform: translateY(-1px);
              }
            }

            &--danger {
              background-color: #fef2f2;
              color: var(--color-danger);

              &:hover {
                background-color: #fee2e2;
                transform: translateY(-1px);
              }
            }
          }
        }
      }
    }
  }

  .form-main {
    margin-top: 24px;
    padding-bottom: 32px;
    animation: fadeInUp 0.5s ease-out forwards;

    .form-grid {
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 32px;

      @media (max-width: 1023px) {
        grid-template-columns: 1fr;
      }
    }

    .form-grid-left {
      grid-column: span 7;
      display: flex;
      flex-direction: column;
      gap: 32px;

      @media (max-width: 1023px) {
        grid-column: span 12;
      }
    }

    .form-grid-right {
      grid-column: span 5;
      display: flex;
      flex-direction: column;
      gap: 32px;

      @media (max-width: 1023px) {
        grid-column: span 12;
      }
    }

    .grid-cols-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }

    .gap-6 {
      gap: 24px;
    }

    .space-y-6>*+* {
      margin-top: 24px;
    }
  }

  .form-section {
    background: #fff;
    padding: 32px;
    border-radius: 2.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    border: 1px solid var(--color-bg-page);
    animation: fadeInUp 0.35s ease both;

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      color: var(--color-text-placeholder);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      margin: 0 0 24px;

      .section-icon {
        color: var(--color-primary);
        font-size: 16px;
      }
    }

    .section-content {
      .form-field {
        .field-label {
          display: block;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: 8px;

          .required {
            color: #f43f5e;
          }
        }

        .field-input {
          width: 100%;
        }

        .field-help {
          margin-top: 4px;
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        :deep(.t-input) {
          background-color: var(--color-bg-page) !important;
          border: 1px solid #f1f5f9 !important;
          border-radius: 16px !important;
          padding: var(--space-3-5) 20px !important;
          min-height: 48px;
          font-size: 14px !important;
          color: var(--color-text-primary) !important;
          transition: all $transition-fast;

          &:hover:not(.t-is-disabled) {
            border-color: var(--color-border) !important;
          }

          &.t-is-focused {
            background-color: #fff !important;
            border-color: transparent !important;
            box-shadow: 0 0 0 2px var(--color-primary) !important;
            outline: none !important;
          }

          &::placeholder {
            color: var(--color-text-placeholder) !important;
          }
        }

        :deep(.t-input__wrap) {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
        }
      }
    }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(16px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-12px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fadeInUp 0.5s ease-out both;
    animation-delay: 0.05s;
  }
}
</style>
