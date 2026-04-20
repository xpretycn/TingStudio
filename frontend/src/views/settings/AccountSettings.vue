<template>
  <div class="account-settings">
    <t-card bordered>
      <template #header>
        <div class="settings-header">
          <h3 class="settings-title">账号设置</h3>
          <p class="settings-desc">管理您的个人资料和账号安全</p>
        </div>
      </template>

      <div class="settings-body">
        <!-- 左侧 Tab 导航 -->
        <div class="settings-nav">
          <div
            v-for="tab in tabs"
            :key="tab.value"
            class="nav-tab"
            :class="{ active: activeTab === tab.value }"
            role="tab"
            tabindex="0"
            @click="activeTab = tab.value"
            @keydown.enter="activeTab = tab.value"
          >
            <t-icon :name="tab.icon" size="18px" />
            <span class="nav-tab-label">{{ tab.label }}</span>
          </div>
        </div>

        <!-- 右侧内容区 -->
        <div class="settings-content">
          <!-- 个人资料 -->
          <div v-show="activeTab === 'profile'" class="tab-panel">
            <h4 class="section-title">个人资料</h4>
            <t-form
              ref="profileFormRef"
              :data="profileForm"
              :rules="profileRules"
              label-width="100px"
              scroll-to-first-error
              @submit="handleProfileSubmit"
            >
              <!-- 头像 -->
              <t-form-item label="头像">
                <div class="avatar-upload">
                  <div class="avatar-preview" @click="triggerAvatarUpload">
                    <img v-if="profileForm.avatar" loading="lazy" :src="profileForm.avatar" alt="头像" class="avatar-img" />
                    <div v-else class="avatar-placeholder">
                      <t-icon name="user-circle" size="48px" />
                    </div>
                    <div class="avatar-overlay">
                      <t-icon name="camera" size="20px" />
                      <span>更换头像</span>
                    </div>
                  </div>
                  <input
                    ref="avatarInputRef"
                    type="file"
                    accept="image/png,image/jpeg,image/gif"
                    class="avatar-input"
                    @change="handleAvatarChange"
                  />
                  <t-button
                    v-if="profileForm.avatar"
                    variant="text"
                    theme="danger"
                    size="small"
                    @click="removeAvatar"
                  >移除头像</t-button>
                </div>
                <div class="form-tips">支持 JPG、PNG、GIF 格式，文件大小不超过 2MB</div>
              </t-form-item>

              <!-- 用户名（只读） -->
              <t-form-item label="用户名">
                <t-input :value="authStore.user?.username" disabled>
                  <template #suffix>
                    <t-icon name="lock-on" />
                  </template>
                </t-input>
                <div class="form-tips">用户名不可修改</div>
              </t-form-item>

              <!-- 昵称 -->
              <t-form-item label="昵称" name="displayName">
                <t-input
                  v-model="profileForm.displayName"
                  placeholder="请输入昵称"
                  clearable
                  maxlength="50"
                  show-limit-number
                />
              </t-form-item>

              <!-- 邮箱 -->
              <t-form-item label="邮箱" name="email">
                <t-input
                  v-model="profileForm.email"
                  placeholder="请输入邮箱地址"
                  clearable
                />
                <template #tips>选填，用于接收通知</template>
              </t-form-item>

              <!-- 手机号 -->
              <t-form-item label="手机号" name="phone">
                <t-input
                  v-model="profileForm.phone"
                  placeholder="请输入11位手机号"
                  clearable
                  maxlength="11"
                />
                <template #tips>选填，格式如 13800138000</template>
              </t-form-item>

              <!-- 简介 -->
              <t-form-item label="个人简介" name="bio">
                <t-textarea
                  v-model="profileForm.bio"
                  placeholder="介绍一下自己吧..."
                  :autosize="{ minRows: 3, maxRows: 6 }"
                  maxlength="500"
                  show-limit-number
                />
              </t-form-item>

              <t-form-item>
                <t-space>
                  <t-button theme="primary" type="submit" :loading="profileLoading">保存资料</t-button>
                </t-space>
              </t-form-item>
            </t-form>
          </div>

          <!-- 账号安全 -->
          <div v-show="activeTab === 'security'" class="tab-panel">
            <h4 class="section-title">修改密码</h4>
            <t-form
              ref="passwordFormRef"
              :data="passwordForm"
              :rules="passwordRules"
              label-width="100px"
              scroll-to-first-error
              @submit="handlePasswordSubmit"
            >
              <t-form-item label="当前密码" name="oldPassword">
                <t-input
                  v-model="passwordForm.oldPassword"
                  type="password"
                  placeholder="请输入当前密码"
                  clearable
                />
              </t-form-item>

              <t-form-item label="新密码" name="newPassword">
                <t-input
                  v-model="passwordForm.newPassword"
                  type="password"
                  placeholder="请输入新密码（至少6个字符）"
                  clearable
                />
                <template #tips>密码长度至少6个字符</template>
              </t-form-item>

              <t-form-item label="确认新密码" name="confirmPassword">
                <t-input
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  placeholder="请再次输入新密码"
                  clearable
                />
              </t-form-item>

              <t-form-item>
                <t-space>
                  <t-button theme="primary" type="submit" :loading="passwordLoading">修改密码</t-button>
                </t-space>
              </t-form-item>
            </t-form>

            <t-divider />

            <h4 class="section-title">账号信息</h4>
            <div class="info-list">
              <div class="info-item">
                <span class="info-label">角色</span>
                <t-tag
                  :theme="authStore.user?.role === 'admin' ? 'warning' : 'primary'"
                  variant="light-outline"
                >{{ authStore.user?.role === 'admin' ? '管理员' : '配方师' }}</t-tag>
              </div>
              <div class="info-item">
                <span class="info-label">注册时间</span>
                <span class="info-value">{{ formatDate(authStore.user?.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">绑定邮箱</span>
                <span class="info-value" :class="{ 'text-muted': !profileForm.email }">
                  {{ profileForm.email || '未绑定' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">绑定手机</span>
                <span class="info-value" :class="{ 'text-muted': !profileForm.phone }">
                  {{ profileForm.phone ? maskPhone(profileForm.phone) : '未绑定' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </t-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'

const authStore = useAuthStore()

const tabs = [
  { value: 'profile', label: '个人资料', icon: 'user-circle' },
  { value: 'security', label: '账号安全', icon: 'lock-on' },
]
const activeTab = ref('profile')

// ─── 个人资料 ───
const profileFormRef = ref<FormInstanceFunctions>()
const profileLoading = ref(false)
const avatarInputRef = ref<HTMLInputElement>()

const profileForm = reactive({
  displayName: '',
  avatar: '',
  bio: '',
  email: '',
  phone: '',
})

const emailValidator = (val: string) => {
  if (!val) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
}

const phoneValidator = (val: string) => {
  if (!val) return true
  return /^1[3-9]\d{9}$/.test(val)
}

const profileRules: Record<string, FormRule[]> = {
  displayName: [
    { max: 50, message: '昵称不超过50个字符', trigger: 'blur' },
  ],
  email: [
    { validator: emailValidator, message: '请输入正确的邮箱地址', trigger: 'blur' },
  ],
  phone: [
    { validator: phoneValidator, message: '请输入正确的11位手机号', trigger: 'blur' },
  ],
  bio: [
    { max: 500, message: '简介不超过500个字符', trigger: 'blur' },
  ],
}

const handleProfileSubmit = async ({ validateResult }: any) => {
  if (validateResult !== true) return
  profileLoading.value = true
  try {
    const result = await authStore.updateProfile({
      display_name: profileForm.displayName || undefined,
      avatar: profileForm.avatar || undefined,
      bio: profileForm.bio || undefined,
      email: profileForm.email || undefined,
      phone: profileForm.phone || undefined,
    })
    if (result.success) {
      MessagePlugin.success('个人资料已更新')
    } else {
      MessagePlugin.error(result.message)
    }
  } finally {
    profileLoading.value = false
  }
}

const triggerAvatarUpload = () => {
  avatarInputRef.value?.click()
}

const handleAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    MessagePlugin.warning('图片大小不能超过 2MB')
    return
  }

  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
    MessagePlugin.warning('仅支持 JPG、PNG、GIF 格式')
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    profileForm.avatar = reader.result as string
  }
  reader.readAsDataURL(file)
}

const removeAvatar = () => {
  profileForm.avatar = ''
  if (avatarInputRef.value) avatarInputRef.value.value = ''
}

// ─── 修改密码 ───
const passwordFormRef = ref<FormInstanceFunctions>()
const passwordLoading = ref(false)

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const confirmPwdValidator = (val: string) => {
  return val === passwordForm.newPassword
}

const passwordRules: Record<string, FormRule[]> = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' },
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '新密码长度至少6个字符', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { validator: confirmPwdValidator, message: '两次输入的密码不一致', trigger: 'blur' },
  ],
}

const handlePasswordSubmit = async ({ validateResult }: any) => {
  if (validateResult !== true) return
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    MessagePlugin.error('两次输入的密码不一致')
    return
  }
  passwordLoading.value = true
  try {
    const result = await authStore.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    })
    if (result.success) {
      MessagePlugin.success('密码修改成功')
      passwordForm.oldPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      MessagePlugin.error(result.message)
    }
  } finally {
    passwordLoading.value = false
  }
}

// ─── 工具函数 ───
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

const maskPhone = (phone: string) => {
  if (phone.length === 11) {
    return phone.slice(0, 3) + '****' + phone.slice(7)
  }
  return phone
}

// ─── 初始化 ───
onMounted(async () => {
  await authStore.fetchCurrentUser()
  const u = authStore.user
  if (u) {
    profileForm.displayName = u.displayName || ''
    profileForm.avatar = u.avatar || ''
    profileForm.bio = u.bio || ''
    profileForm.email = u.email || ''
    profileForm.phone = u.phone || ''
  }
})
</script>

<style scoped lang="scss">
.account-settings {
  // 卡片入场动画
  :deep(.t-card) {
    animation: fadeInUp 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }

  .settings-header {
    .settings-title {
      font-size: $font-size-h3;
      font-weight: $font-weight-semibold;
      color: $text-primary;
      margin: 0 0 4px;
    }

    .settings-desc {
      font-size: $font-size-body;
      color: $text-secondary;
      margin: 0;
    }
  }

  .settings-body {
    display: flex;
    gap: $space-5;
    min-height: 400px;
  }

  // 左侧导航
  .settings-nav {
    width: 180px;
    flex-shrink: 0;

    .nav-tab {
      display: flex;
      align-items: center;
      gap: $space-3;
      padding: $space-3 $space-4;
      border-radius: $radius-md;
      cursor: pointer;
      transition: all $transition-fast;
      color: $text-secondary;
      font-size: $font-size-body;
      border: 1px solid transparent;
      margin-bottom: $space-1;

      &:hover {
        background: $bg-page;
        color: $text-primary;
        border-color: $border-color-light;
      }

      &.active {
        background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
        color: white;
        box-shadow: var(--shadow-brand-sm);
        border-color: transparent;
        font-weight: $font-weight-medium;

        :deep(.t-icon) {
          color: white;
        }
      }

      .nav-tab-label {
        flex: 1;
      }
    }
  }

  // 右侧内容
  .settings-content {
    flex: 1;
    min-width: 0;
  }

  .section-title {
    font-size: $font-size-h4;
    font-weight: $font-weight-semibold;
    color: $text-primary;
    margin: 0 0 $space-5;
    padding-bottom: $space-3;
    border-bottom: 1px solid $border-color-light;

    &::before {
      content: '';
      display: inline-block;
      width: 4px;
      height: 18px;
      background: linear-gradient(180deg, var(--color-primary), var(--color-primary-light));
      border-radius: 2px;
      margin-right: $space-2;
      vertical-align: middle;
    }
  }

  // 表单提示
  .form-tips {
    font-size: $font-size-caption;
    color: $text-placeholder;
    margin-top: $space-1;
    line-height: 1.4;
  }

  // 头像上传
  .avatar-upload {
    display: flex;
    align-items: flex-end;
    gap: $space-3;

    .avatar-preview {
      position: relative;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      border: 2px solid $border-color-light;
      flex-shrink: 0;
      transition: border-color 0.2s;

      &:hover {
        border-color: var(--color-primary-lighter);

        .avatar-overlay {
          opacity: 1;
        }
      }

      .avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: $bg-page;
        color: $text-placeholder;
      }

      .avatar-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        opacity: 0;
        transition: opacity 0.2s;
        color: white;
        font-size: 11px;
      }
    }

    .avatar-input {
      display: none;
    }
  }

  // 账号信息列表
  .info-list {
    .info-item {
      display: flex;
      align-items: center;
      padding: $space-3 0;
      border-bottom: 1px solid $border-color-light;

      &:last-child {
        border-bottom: none;
      }

      .info-label {
        width: 100px;
        flex-shrink: 0;
        color: $text-secondary;
        font-size: $font-size-body;
      }

      .info-value {
        color: $text-primary;
        font-size: $font-size-body;

        &.text-muted {
          color: $text-placeholder;
        }
      }
    }
  }

  // 表单控件样式增强
  :deep(.t-form__item) {
    transition: background-color 0.3s;
    border-radius: $radius-md;
    padding: 2px $space-2;

    &.t-is-error {
      background-color: $color-danger-light;

      .t-input,
      .t-is-focused .t-input__wrap {
        border-color: $color-danger !important;
        box-shadow: $shadow-danger-xs !important;
      }
    }

    .t-form__tips {
      color: $text-secondary;
      font-size: $font-size-caption;
    }
  }
}

// 响应式：小屏幕导航改为横向
@media screen and (max-width: 768px) {
  .account-settings {
    .settings-body {
      flex-direction: column;
    }

    .settings-nav {
      width: 100%;
      display: flex;
      gap: $space-2;

      .nav-tab {
        flex: 1;
        justify-content: center;
        margin-bottom: 0;
      }
    }
  }
}
</style>


