<template>
  <div class="account-settings" v-loading="false">
    <!-- 顶部 Header（参照 FormulaDetail 风格） -->
    <header class="detail-header">
      <div class="header-left">
        <button class="header-back-btn" @click="$router.back()" title="返回">
          <t-icon name="arrow-left" />
        </button>
        <div class="header-title-group">
          <nav class="header-breadcrumb">
            <a class="breadcrumb-link" @click="$router.push('/')">首页</a>
            <t-icon name="chevron-right" class="breadcrumb-sep" />
            <span class="breadcrumb-current">账号设置</span>
          </nav>
          <h2 class="page-title">账号设置</h2>
        </div>
      </div>
    </header>

    <!-- 主内容区域（左右两栏网格布局） -->
    <main class="detail-main">
      <!-- 左侧导航栏 -->
      <div class="detail-left-col">
        <section class="info-card nav-card">
          <h3 class="card-label">
            <t-icon name="setting" class="label-icon" />
            设置菜单
          </h3>
          <div class="nav-list">
            <div v-for="tab in tabs" :key="tab.value" class="nav-item" :class="{ active: activeTab === tab.value }"
              role="tab" tabindex="0" @click="activeTab = tab.value" @keydown.enter="activeTab = tab.value">
              <t-icon :name="tab.icon" size="16px" class="nav-icon" />
              <span>{{ tab.label }}</span>
              <t-icon v-if="activeTab === tab.value" name="chevron-right" size="12px" class="nav-arrow" />
            </div>
          </div>
        </section>

        <!-- 账号信息概览卡片 -->
        <section class="info-card">
          <h3 class="card-label">
            <t-icon name="user-circle" class="label-icon" />
            当前账号
          </h3>
          <div class="card-fields">
            <div class="field-item">
              <label><t-icon name="user" size="12px" /> 用户名</label>
              <p>{{ authStore.user?.username || '--' }}</p>
            </div>
            <div class="field-item">
              <label><t-icon name="lock-on" size="12px" /> 角色</label>
              <p>
                <t-tag :theme="authStore.user?.role === 'admin' ? 'warning' : 'primary'" variant="light-outline"
                  size="small">{{ authStore.user?.role === 'admin' ? '管理员' : '配方师' }}</t-tag>
              </p>
            </div>
            <div class="field-item">
              <label><t-icon name="time" size="12px" /> 注册时间</label>
              <p>{{ formatDate(authStore.user?.createdAt) }}</p>
            </div>
          </div>
        </section>
      </div>

      <!-- 右侧内容区 -->
      <div class="detail-right-col">
        <!-- 个人资料 -->
        <section v-show="activeTab === 'profile'" class="info-card content-card">
          <h3 class="card-label">
            <t-icon name="user-circle" class="label-icon" />
            个人资料
          </h3>

          <t-form ref="profileFormRef" :data="profileForm" :rules="profileRules" label-width="100px"
            scroll-to-first-error @submit="handleProfileSubmit">
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
                <input ref="avatarInputRef" type="file" accept="image/png,image/jpeg,image/gif" class="avatar-input"
                  @change="handleAvatarChange" />
                <t-button v-if="profileForm.avatar" variant="text" theme="danger" size="small"
                  @click="removeAvatar">移除头像</t-button>
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
              <t-input v-model="profileForm.displayName" placeholder="请输入昵称" clearable maxlength="50"
                show-limit-number />
            </t-form-item>

            <!-- 邮箱 -->
            <t-form-item label="邮箱" name="email">
              <t-input v-model="profileForm.email" placeholder="请输入邮箱地址" clearable />
              <template #tips>选填，用于接收通知</template>
            </t-form-item>

            <!-- 手机号 -->
            <t-form-item label="手机号" name="phone">
              <t-input v-model="profileForm.phone" placeholder="请输入11位手机号" clearable maxlength="11" />
              <template #tips>选填，格式如 13800138000</template>
            </t-form-item>

            <!-- 简介 -->
            <t-form-item label="个人简介" name="bio">
              <t-textarea v-model="profileForm.bio" placeholder="介绍一下自己吧..." :autosize="{ minRows: 3, maxRows: 6 }"
                maxlength="500" show-limit-number />
            </t-form-item>

            <t-form-item>
              <t-space>
                <t-button theme="primary" type="submit" :loading="profileLoading">保存资料</t-button>
              </t-space>
            </t-form-item>
          </t-form>
        </section>

        <!-- 账号安全 -->
        <div v-show="activeTab === 'security'" class="right-content-stack">
          <!-- 修改密码卡片 -->
          <section class="info-card content-card">
            <h3 class="card-label">
              <t-icon name="lock-on" class="label-icon" />
              修改密码
            </h3>
            <t-form ref="passwordFormRef" :data="passwordForm" :rules="passwordRules" label-width="100px"
              scroll-to-first-error @submit="handlePasswordSubmit">
              <t-form-item label="当前密码" name="oldPassword">
                <t-input v-model="passwordForm.oldPassword" type="password" placeholder="请输入当前密码" clearable />
              </t-form-item>

              <t-form-item label="新密码" name="newPassword">
                <t-input v-model="passwordForm.newPassword" type="password" placeholder="请输入新密码（至少6个字符）" clearable />
                <template #tips>密码长度至少6个字符</template>
              </t-form-item>

              <t-form-item label="确认新密码" name="confirmPassword">
                <t-input v-model="passwordForm.confirmPassword" type="password" placeholder="请再次输入新密码" clearable />
              </t-form-item>

              <t-form-item>
                <t-space>
                  <t-button theme="primary" type="submit" :loading="passwordLoading">修改密码</t-button>
                </t-space>
              </t-form-item>
            </t-form>
          </section>

          <!-- 账号信息卡片 -->
          <section class="info-card content-card">
            <h3 class="card-label">
              <t-icon name="info-circle" class="label-icon" />
              账号信息
            </h3>
            <div class="card-fields">
              <div class="field-item">
                <label><t-icon name="user" size="12px" /> 绑定邮箱</label>
                <p :class="{ 'text-muted': !profileForm.email }">{{ profileForm.email || '未绑定' }}</p>
              </div>
              <div class="field-item">
                <label><t-icon name="mobile" size="12px" /> 绑定手机</label>
                <p :class="{ 'text-muted': !profileForm.phone }">{{ profileForm.phone ? maskPhone(profileForm.phone) :
                  '未绑定' }}
                </p>
              </div>
              <div class="field-grid-2">
                <div class="field-item">
                  <label><t-icon name="time" size="12px" /> 注册时间</label>
                  <p>{{ formatDate(authStore.user?.createdAt) }}</p>
                </div>
                <div class="field-item">
                  <label><t-icon name="check-circle" size="12px" /> 账号状态</label>
                  <p style="color: var(--color-primary);">正常</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- 偏好设置 -->
        <div v-show="activeTab === 'preferences'" class="right-content-stack">
          <!-- 主题模式 -->
          <section class="info-card content-card">
            <h3 class="card-label">
              <t-icon name="palette" class="label-icon" />
              主题模式
            </h3>
            <div class="pref-section">
              <div class="pref-group">
                <div class="pref-group-label">外观模式</div>
                <div class="theme-mode-cards">
                  <div
                    v-for="opt in themeModeOptions"
                    :key="opt.value"
                    class="theme-mode-card"
                    :class="{ active: currentThemeMode === opt.value }"
                    @click="handleThemeModeChange(opt.value)"
                  >
                    <t-icon :name="opt.icon" size="24px" class="mode-icon" />
                    <span class="mode-label">{{ opt.label }}</span>
                    <div v-if="currentThemeMode === opt.value" class="mode-check">
                      <t-icon name="check" size="12px" />
                    </div>
                  </div>
                </div>
              </div>
              <div class="pref-group">
                <div class="pref-group-label">品牌色</div>
                <div class="brand-color-row">
                  <div
                    v-for="opt in brandColorOptions"
                    :key="opt.value"
                    class="brand-color-item"
                    :class="{ active: currentBrandColor === opt.value }"
                    @click="handleBrandColorChange(opt.value)"
                  >
                    <div class="color-swatch" :style="{ backgroundColor: opt.color }">
                      <t-icon v-if="currentBrandColor === opt.value" name="check" size="16px" />
                    </div>
                    <span class="color-label">{{ opt.label }}</span>
                  </div>
                </div>
              </div>
              <div class="pref-hint">
                <t-icon name="info-circle" size="14px" />
                <span>主题切换即时生效，无需手动保存</span>
              </div>
            </div>
          </section>

          <!-- 布局与显示偏好 -->
          <section class="info-card content-card">
            <h3 class="card-label">
              <t-icon name="layout" class="label-icon" />
              布局与显示
            </h3>
            <div class="pref-section">
              <div class="pref-row">
                <div class="pref-row-label">
                  <span>侧边栏默认收起</span>
                  <span class="pref-row-desc">登录后侧边栏默认折叠状态</span>
                </div>
                <t-switch v-model="prefForm.sidebarDefaultCollapsed" />
              </div>
              <div class="pref-row">
                <div class="pref-row-label">
                  <span>默认首页</span>
                  <span class="pref-row-desc">登录后默认跳转的页面</span>
                </div>
                <t-select
                  v-model="prefForm.defaultHomePage"
                  :options="homePageOptions"
                  style="width: 160px"
                  :popup-props="{ appendToBody: true }"
                />
              </div>
              <div class="pref-row">
                <div class="pref-row-label">
                  <span>表格每页条数</span>
                  <span class="pref-row-desc">列表页默认分页大小</span>
                </div>
                <t-select
                  v-model="prefForm.defaultPageSize"
                  :options="pageSizeOptions"
                  style="width: 160px"
                  :popup-props="{ appendToBody: true }"
                />
              </div>
            </div>
          </section>

          <!-- 业务偏好 -->
          <section class="info-card content-card">
            <h3 class="card-label">
              <t-icon name="formula" class="label-icon" />
              业务偏好
            </h3>
            <div class="pref-section">
              <div class="pref-row">
                <div class="pref-row-label">
                  <span>配方默认视图</span>
                  <span class="pref-row-desc">进入配方列表时的默认展示方式</span>
                </div>
                <div class="view-toggle">
                  <div
                    v-for="opt in formulaViewOptions"
                    :key="opt.value"
                    class="view-toggle-btn"
                    :class="{ active: prefForm.formulaDefaultView === opt.value }"
                    @click="prefForm.formulaDefaultView = opt.value"
                  >
                    <t-icon :name="opt.icon" size="16px" />
                    <span>{{ opt.label }}</span>
                  </div>
                </div>
              </div>
              <div class="pref-row">
                <div class="pref-row-label">
                  <span>默认导出格式</span>
                  <span class="pref-row-desc">导出配方时的首选文件格式</span>
                </div>
                <div class="view-toggle">
                  <div
                    v-for="opt in exportFormatOptions"
                    :key="opt.value"
                    class="view-toggle-btn"
                    :class="{ active: prefForm.defaultExportFormat === opt.value }"
                    @click="prefForm.defaultExportFormat = opt.value"
                  >
                    <t-icon :name="opt.icon" size="16px" />
                    <span>{{ opt.label }}</span>
                  </div>
                </div>
              </div>
              <div class="pref-row">
                <div class="pref-row-label">
                  <span>配方默认排序</span>
                  <span class="pref-row-desc">配方列表的默认排序方式</span>
                </div>
                <t-select
                  v-model="prefForm.formulaDefaultSort"
                  :options="formulaSortOptions"
                  style="width: 160px"
                  :popup-props="{ appendToBody: true }"
                />
              </div>
            </div>

            <div class="pref-actions">
              <t-space>
                <t-button theme="primary" :loading="prefSaving" @click="handlePrefSave">保存偏好</t-button>
                <t-button theme="default" variant="outline" @click="handlePrefReset">恢复默认</t-button>
              </t-space>
            </div>
          </section>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { usePreferencesStore } from '@/stores/preferences';
import { useThemeStore } from '@/stores/theme';
import type { ThemeMode, BrandColor } from '@/stores/theme';
import { MessagePlugin } from 'tdesign-vue-next';
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next';

const authStore = useAuthStore();
const preferencesStore = usePreferencesStore();
const themeStore = useThemeStore();

const tabs = [
  { value: 'profile', label: '个人资料', icon: 'user-circle' },
  { value: 'security', label: '账号安全', icon: 'lock-on' },
  { value: 'preferences', label: '偏好设置', icon: 'setting-1' },
];
const activeTab = ref('profile');

// ─── 个人资料 ───
const profileFormRef = ref<FormInstanceFunctions>();
const profileLoading = ref(false);
const avatarInputRef = ref<HTMLInputElement>();

const profileForm = reactive({
  displayName: '',
  avatar: '',
  bio: '',
  email: '',
  phone: '',
});

const emailValidator = (val: string) => {
  if (!val) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
};

const phoneValidator = (val: string) => {
  if (!val) return true;
  return /^1[3-9]\d{9}$/.test(val);
};

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
};

const handleProfileSubmit = async ({ validateResult }: { validateResult: boolean | Record<string, unknown>[] }) => {
  if (validateResult !== true) return;
  profileLoading.value = true;
  try {
    const result = await authStore.updateProfile({
      display_name: profileForm.displayName || undefined,
      avatar: profileForm.avatar || undefined,
      bio: profileForm.bio || undefined,
      email: profileForm.email || undefined,
      phone: profileForm.phone || undefined,
    });
    if (result.success) {
      MessagePlugin.success('个人资料已更新');
    } else {
      MessagePlugin.error(result.message);
    }
  } finally {
    profileLoading.value = false;
  }
};

const triggerAvatarUpload = () => {
  avatarInputRef.value?.click();
};

const handleAvatarChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    MessagePlugin.warning('图片大小不能超过 2MB');
    return;
  }

  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
    MessagePlugin.warning('仅支持 JPG、PNG、GIF 格式');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    profileForm.avatar = reader.result as string;
  };
  reader.readAsDataURL(file);
};

const removeAvatar = () => {
  profileForm.avatar = '';
  if (avatarInputRef.value) avatarInputRef.value.value = '';
};

// ─── 修改密码 ───
const passwordFormRef = ref<FormInstanceFunctions>();
const passwordLoading = ref(false);

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const confirmPwdValidator = (val: string) => {
  return val === passwordForm.newPassword;
};

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
};

const handlePasswordSubmit = async ({ validateResult }: { validateResult: boolean | Record<string, unknown>[] }) => {
  if (validateResult !== true) return;
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    MessagePlugin.error('两次输入的密码不一致');
    return;
  }
  passwordLoading.value = true;
  try {
    const result = await authStore.changePassword({
      oldPassword: passwordForm.oldPassword,
      newPassword: passwordForm.newPassword,
    });
    if (result.success) {
      MessagePlugin.success('密码修改成功');
      passwordForm.oldPassword = '';
      passwordForm.newPassword = '';
      passwordForm.confirmPassword = '';
    } else {
      MessagePlugin.error(result.message);
    }
  } finally {
    passwordLoading.value = false;
  }
};

// ─── 工具函数 ───
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const maskPhone = (phone: string) => {
  if (phone.length === 11) {
    return phone.slice(0, 3) + '****' + phone.slice(7);
  }
  return phone;
};

// ─── 偏好设置 ───
const themeModeOptions = [
  { value: 'auto', label: '跟随系统', icon: 'browse' },
  { value: 'light', label: '浅色模式', icon: 'sunny' },
  { value: 'dark', label: '深色模式', icon: 'moon' },
] as const

const brandColorOptions = [
  { value: 'pink', label: '玫瑰', color: '#ec4899' },
  { value: 'yellow', label: '琥珀', color: '#f59e0b' },
  { value: 'blue', label: '天青', color: '#3b82f6' },
  { value: 'green', label: '翡翠', color: '#10b981' },
] as const

const homePageOptions = [
  { value: '/dashboard', label: '工作台' },
  { value: '/formulas', label: '配方管理' },
  { value: '/materials', label: '原料管理' },
  { value: '/sales', label: '销量分析' },
]

const pageSizeOptions = [
  { value: 5, label: '5 条/页' },
  { value: 8, label: '8 条/页' },
  { value: 10, label: '10 条/页' },
  { value: 20, label: '20 条/页' },
]

const formulaViewOptions = [
  { value: 'card', label: '卡片视图', icon: 'view-module' },
  { value: 'table', label: '列表视图', icon: 'view-list' },
] as const

const exportFormatOptions = [
  { value: 'excel', label: 'Excel (.xlsx)', icon: 'file-excel' },
  { value: 'pdf', label: 'PDF', icon: 'file-pdf' },
] as const

const formulaSortOptions = [
  { value: 'updatedAt', label: '最近更新' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'name', label: '名称排序' },
  { value: 'salesman', label: '业务员排序' },
]

const prefForm = reactive({
  themeMode: preferencesStore.preferences.themeMode || 'auto',
  brandColor: preferencesStore.preferences.brandColor || 'pink',
  sidebarDefaultCollapsed: preferencesStore.preferences.sidebarDefaultCollapsed ?? false,
  defaultHomePage: preferencesStore.preferences.defaultHomePage || '/formulas',
  defaultPageSize: preferencesStore.preferences.defaultPageSize || 8,
  formulaDefaultView: preferencesStore.preferences.formulaDefaultView || 'card',
  defaultExportFormat: preferencesStore.preferences.defaultExportFormat || 'excel',
  formulaDefaultSort: preferencesStore.preferences.formulaDefaultSort || 'updatedAt',
})

const currentThemeMode = computed(() => themeStore.mode)
const currentBrandColor = computed(() => themeStore.brandColor)

function handleThemeModeChange(mode: ThemeMode) {
  prefForm.themeMode = mode
  themeStore.setMode(mode)
  preferencesStore.updatePreferences({ themeMode: mode })
}

function handleBrandColorChange(color: BrandColor) {
  prefForm.brandColor = color
  themeStore.setBrandColor(color)
  preferencesStore.updatePreferences({ brandColor: color })
}

const prefSaving = ref(false)

async function handlePrefSave() {
  prefSaving.value = true
  try {
    const result = await preferencesStore.updatePreferences({
      sidebarDefaultCollapsed: prefForm.sidebarDefaultCollapsed,
      defaultHomePage: prefForm.defaultHomePage,
      defaultPageSize: prefForm.defaultPageSize,
      formulaDefaultView: prefForm.formulaDefaultView,
      defaultExportFormat: prefForm.defaultExportFormat,
      formulaDefaultSort: prefForm.formulaDefaultSort,
    })
    if (result.success) {
      MessagePlugin.success('偏好设置已保存')
    } else {
      MessagePlugin.error(result.message || '保存失败')
    }
  } finally {
    prefSaving.value = false
  }
}

async function handlePrefReset() {
  const result = await preferencesStore.resetToDefault()
  if (result.success) {
    prefForm.themeMode = 'auto'
    prefForm.brandColor = 'pink'
    prefForm.sidebarDefaultCollapsed = false
    prefForm.defaultHomePage = '/formulas'
    prefForm.defaultPageSize = 8
    prefForm.formulaDefaultView = 'card'
    prefForm.defaultExportFormat = 'excel'
    prefForm.formulaDefaultSort = 'updatedAt'
    themeStore.setMode('auto')
    themeStore.setBrandColor('pink')
    MessagePlugin.success('已恢复默认偏好')
  } else {
    MessagePlugin.error(result.message || '重置失败')
  }
}

/** 同步 prefForm 与 store 中的偏好设置 */
function syncPrefForm() {
  const p = preferencesStore.preferences
  prefForm.themeMode = p.themeMode || 'auto'
  prefForm.brandColor = p.brandColor || 'pink'
  prefForm.sidebarDefaultCollapsed = p.sidebarDefaultCollapsed ?? false
  prefForm.defaultHomePage = p.defaultHomePage || '/formulas'
  prefForm.defaultPageSize = p.defaultPageSize || 8
  prefForm.formulaDefaultView = p.formulaDefaultView || 'card'
  prefForm.defaultExportFormat = p.defaultExportFormat || 'excel'
  prefForm.formulaDefaultSort = p.formulaDefaultSort || 'updatedAt'
}

// ─── 初始化 ───
onMounted(async () => {
  await authStore.fetchCurrentUser();
  const u = authStore.user;
  if (u) {
    profileForm.displayName = u.displayName || '';
    profileForm.avatar = u.avatar || '';
    profileForm.bio = u.bio || '';
    profileForm.email = u.email || '';
    profileForm.phone = u.phone || '';
  }
  await preferencesStore.fetchPreferences();
  syncPrefForm();
});
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.account-settings {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Header 区域 — 复刻 FormulaDetail 风格
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  .detail-header {
    position: sticky;
    top: 0;
    z-index: 40;
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-left: -32px;
    margin-right: -32px;
    padding: 16px 32px;
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

        .page-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text-primary);
          line-height: 1.35;
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 主内容区域 — 网格布局（参照 FormulaDetail）
  // ═══════════════════════════════════════

  .detail-main {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: $space-6;
    margin-top: $space-6;
    margin-bottom: $space-6;
    padding-bottom: $space-6;

    .detail-left-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 3;
      }

      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    .detail-right-col {
      grid-column: span 12;

      @media (min-width: 1024px) {
        grid-column: span 9;
      }

      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    // ══ 通用卡片样式（匹配 FormulaDetail info-card） ══
    .info-card {
      background: var(--color-bg-container);
      padding: $space-6;
      border-radius: $radius-2xl;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      border: 1px solid var(--color-bg-page);
      animation: fadeInUp 0.35s ease both;

      .card-label {
        font-size: 14px;
        font-weight: 700;
        color: var(--color-text-placeholder);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        margin-bottom: $space-5;
        display: flex;
        align-items: center;
        gap: 8px;

        .label-icon {
          font-size: 16px;
          color: var(--color-primary);
          opacity: 0.7;
        }
      }
    }

    // ══ 字段网格（参照 FormulaDetail card-fields） ══
    .card-fields {
      display: flex;
      flex-direction: column;
      gap: $space-3;

      .field-item {
        padding: $space-3;
        background: var(--color-bg-page);
        border-radius: $radius-xl;
        border: 1px solid #f1f5f9;

        label {
          display: flex;
          align-items: center;
          gap: var(--space-1-5);
          font-size: 10px;
          font-weight: 700;
          color: var(--color-text-placeholder);
          text-transform: uppercase;
          margin-bottom: 4px;

          .t-icon {
            color: var(--color-primary);
            opacity: 0.55;
            flex-shrink: 0;
          }
        }

        p {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;

          &.text-muted {
            color: #cbd5e1;
          }
        }
      }

      .field-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: $space-3;
      }
    }

    // ══ 左侧导航卡片 ══
    .nav-card {
      .nav-list {
        display: flex;
        flex-direction: column;
        gap: $space-2;
      }

      .nav-item {
        display: flex;
        align-items: center;
        gap: $space-3;
        padding: $space-3 $space-4;
        border-radius: $radius-lg;
        cursor: pointer;
        transition: all $transition-fast;
        color: var(--color-text-secondary);
        font-size: 14px;
        font-weight: 500;
        border: 1px solid transparent;
        position: relative;

        .nav-icon {
          color: var(--color-text-placeholder);
          transition: color $transition-fast;
        }

        .nav-arrow {
          margin-left: auto;
          color: transparent;
          transition: all $transition-fast;
        }

        &:hover {
          background: var(--color-bg-page);
          color: var(--color-text-primary);
          border-color: #f1f5f9;

          .nav-icon {
            color: var(--color-primary);
          }
        }

        &.active {
          background: linear-gradient(135deg, #ecfdf5, var(--color-primary-bg));
          color: var(--color-primary-dark);
          border-color: var(--color-primary-lightest);
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.08);

          .nav-icon {
            color: var(--color-primary-dark);
          }

          .nav-arrow {
            color: var(--color-primary-dark);
            opacity: 0.7;
          }
        }
      }
    }

    // ══ 右侧内容卡片堆叠 ══
    .right-content-stack {
      display: flex;
      flex-direction: column;
      gap: $space-6;
    }

    // ══ 内容卡片内表单增强 ══
    .content-card {
      :deep(.t-form) {
        max-width: 560px;
      }

      :deep(.t-form__item) {
        margin-bottom: $space-5;
      }

      :deep(.t-form__label) {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
      }

      :deep(.t-input),
      :deep(.t-textarea) {
        border-radius: $radius-lg;
        border-color: var(--color-border);
        transition: all 0.2s;

        &:hover {
          border-color: #cbd5e1;
        }

        &.t-is-focused,
        &.t-is-focus-within {
          border-color: var(--color-primary-lightest);
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
      }

      :deep(.t-button--variant-base-theme-primary) {
        background-color: var(--color-primary);
        border-color: var(--color-primary);
        border-radius: $radius-lg;
        font-weight: 600;
        padding: 8px 24px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);

        &:hover {
          background-color: var(--color-primary-dark);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(16, 185, 129, 0.3);
        }
      }
    }

    // 表单提示文字
    .form-tips {
      font-size: 12px;
      color: var(--color-text-placeholder);
      margin-top: var(--space-1-5);
      line-height: 1.4;
    }

    // ══ 偏好设置样式 ══
    .pref-section {
      display: flex;
      flex-direction: column;
      gap: $space-5;
    }

    .pref-group {
      .pref-group-label {
        font-size: 13px;
        font-weight: 600;
        color: var(--color-text-secondary);
        margin-bottom: $space-3;
      }
    }

    .theme-mode-cards {
      display: flex;
      gap: $space-3;

      .theme-mode-card {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $space-2;
        padding: $space-4 $space-3;
        border-radius: $radius-xl;
        border: 2px solid var(--color-border);
        cursor: pointer;
        transition: all $transition-fast;
        position: relative;
        background: var(--color-bg-page);

        .mode-icon {
          color: var(--color-text-placeholder);
          transition: color $transition-fast;
        }

        .mode-label {
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-secondary);
        }

        .mode-check {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--color-primary);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        &:hover {
          border-color: var(--color-primary-lightest);
          background: var(--color-primary-bg);

          .mode-icon {
            color: var(--color-primary);
          }
        }

        &.active {
          border-color: var(--color-primary);
          background: linear-gradient(135deg, var(--color-primary-bg), rgba(16, 185, 129, 0.05));
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);

          .mode-icon {
            color: var(--color-primary-dark);
          }

          .mode-label {
            color: var(--color-primary-dark);
            font-weight: 600;
          }
        }
      }
    }

    .brand-color-row {
      display: flex;
      gap: $space-4;

      .brand-color-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: $space-1-5;
        cursor: pointer;

        .color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          transition: all $transition-fast;
          border: 3px solid transparent;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .color-label {
          font-size: 12px;
          color: var(--color-text-placeholder);
          font-weight: 500;
        }

        &:hover .color-swatch {
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        &.active {
          .color-swatch {
            border-color: var(--color-primary-dark);
            transform: scale(1.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
          }

          .color-label {
            color: var(--color-primary-dark);
            font-weight: 600;
          }
        }
      }
    }

    .pref-hint {
      display: flex;
      align-items: center;
      gap: $space-2;
      padding: $space-2-5 $space-3;
      border-radius: $radius-lg;
      background: var(--color-primary-bg);
      font-size: 12px;
      color: var(--color-primary-dark);

      .t-icon {
        color: var(--color-primary);
        flex-shrink: 0;
      }
    }

    .pref-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: $space-4;
      padding: $space-3-5 $space-4;
      border-radius: $radius-xl;
      background: var(--color-bg-page);
      border: 1px solid #f1f5f9;
      transition: all $transition-fast;

      &:hover {
        border-color: var(--color-primary-lightest);
      }

      .pref-row-label {
        display: flex;
        flex-direction: column;
        gap: 2px;

        > span:first-child {
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .pref-row-desc {
          font-size: 12px;
          color: var(--color-text-placeholder);
        }
      }
    }

    .view-toggle {
      display: flex;
      gap: $space-1;
      background: var(--color-bg-page);
      border-radius: $radius-lg;
      padding: 3px;
      border: 1px solid var(--color-border);

      .view-toggle-btn {
        display: flex;
        align-items: center;
        gap: $space-1-5;
        padding: $space-1-5 $space-3;
        border-radius: $radius-md;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-secondary);
        transition: all $transition-fast;
        white-space: nowrap;

        .t-icon {
          color: var(--color-text-placeholder);
        }

        &:hover {
          color: var(--color-primary);
        }

        &.active {
          background: var(--color-bg-container);
          color: var(--color-primary-dark);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);

          .t-icon {
            color: var(--color-primary);
          }
        }
      }
    }

    .pref-actions {
      margin-top: $space-4;
      padding-top: $space-4;
      border-top: 1px solid #f1f5f9;
    }

    // 头像上传（保持原有交互，美化外观）
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
        border: 2px solid var(--color-border);
        flex-shrink: 0;
        transition: all 0.25s;

        &:hover {
          border-color: var(--color-primary-lightest);
          box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);

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
          background: linear-gradient(135deg, var(--color-bg-page), #ecfdf5);
          color: var(--color-text-placeholder);
        }

        .avatar-overlay {
          position: absolute;
          inset: 0;
          background: rgba(16, 185, 129, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-0-5);
          opacity: 0;
          transition: opacity 0.25s;
          color: white;
          font-size: 11px;
          font-weight: 500;
        }
      }

      .avatar-input {
        display: none;
      }
    }
  }

  // ═══ 动画关键帧 ═══
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

  // ═══ 响应式适配 ═══
  @media (max-width: 768px) {
    .detail-header {
      padding: 12px 16px;
      flex-direction: column;
      gap: 12px;

      .header-left {
        width: 100%;

        .page-title {
          font-size: 16px;
        }
      }
    }

    .detail-main {
      grid-template-columns: 1fr;
    }

    .card-fields .field-grid-2 {
      grid-template-columns: 1fr;
    }
  }
}
</style>
