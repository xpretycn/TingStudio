<template>
  <div class="register-page">
    <!-- Background decorations -->
    <div class="bg-decor">
      <div class="bg-blob bg-blob--1"></div>
      <div class="bg-blob bg-blob--2"></div>
      <span v-for="i in 5" :key="i" class="float-heart" :style="heartStyle(i)">♥</span>
      <span v-for="i in 6" :key="'s'+i" class="twinkle-star" :style="starStyle(i)">✦</span>
    </div>

    <div class="register-card">
      <!-- Avatar -->
      <div class="avatar-area">
        <div class="avatar-ring">
          <div class="avatar-circle">
            <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
              <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
              <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
              <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
              <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
              <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
              <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
              <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
              <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none" stroke-linecap="round" />
              <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
              <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
            </svg>
          </div>
        </div>
        <h1 class="app-name">TingStudio</h1>
        <p class="app-tagline">~ 创建你的小天地 ~</p>
      </div>

      <t-form
        ref="formRef"
        :data="formData"
        :rules="rules"
        label-width="0"
        @submit="handleSubmit"
      >
        <t-form-item name="username">
          <div class="field-wrap">
            <label class="field-label">
              <span class="label-dot"></span>
              用户名
            </label>
            <t-input
              v-model="formData.username"
              placeholder="请输入用户名"
              size="large"
              clearable
              class="cute-input"
            >
              <template #prefix-icon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </template>
            </t-input>
          </div>
        </t-form-item>

        <t-form-item name="password">
          <div class="field-wrap">
            <label class="field-label">
              <span class="label-dot"></span>
              密码
            </label>
            <t-input
              v-model="formData.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              clearable
              class="cute-input"
            >
              <template #prefix-icon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </template>
            </t-input>
          </div>
        </t-form-item>

        <t-form-item name="confirmPassword">
          <div class="field-wrap">
            <label class="field-label">
              <span class="label-dot"></span>
              确认密码
            </label>
            <t-input
              v-model="formData.confirmPassword"
              type="password"
              placeholder="请再次输入密码"
              size="large"
              clearable
              class="cute-input"
            >
              <template #prefix-icon>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </template>
            </t-input>
          </div>
        </t-form-item>

        <t-form-item>
          <t-button
            type="submit"
            theme="primary"
            size="large"
            block
            :loading="loading"
            class="cute-btn"
          >
            <span class="btn-text">♡ 注 册</span>
          </t-button>
        </t-form-item>
      </t-form>

      <div class="card-footer">
        <span>已有账号？</span>
        <router-link to="/login" class="go-login">去登录 →</router-link>
      </div>
    </div>

    <div class="bottom-note">© 2026 TingStudio · 用心记录每一天 ♡</div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const heartStyle = (i: number) => ({
  left: `${10 + i * 18}%`,
  animationDelay: `${i * 1.4}s`,
  fontSize: `${14 + (i % 3) * 6}px`,
  color: `hsl(${340 + i * 8}, 80%, ${72 + i * 3}%)`
})

const starStyle = (i: number) => ({
  left: `${5 + i * 16}%`,
  top: `${12 + (i % 3) * 28}%`,
  animationDelay: `${i * 0.9}s`,
  fontSize: `${10 + (i % 3) * 4}px`,
  color: `hsl(${30 + i * 18}, 85%, ${78 + i * 2}%)`
})

const validateConfirmPassword = (value: string) => {
  return value === formData.password
}

const rules: Record<string, FormRule[]> = {
  username: [
    { required: true, message: '请输入用户名哦~', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符呢', trigger: 'blur' },
    { max: 20, message: '用户名最多20个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码哦~', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符呢', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码哦~', trigger: 'blur' },
    { validator: validateConfirmPassword, message: '两次输入的密码不一致呢', trigger: 'blur' }
  ]
}

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    loading.value = true
    try {
      const result = await authStore.register({
        username: formData.username,
        password: formData.password
      })
      if (result.success) {
        MessagePlugin.success('注册成功啦~')
        router.push('/')
      } else {
        MessagePlugin.error(result.message || '注册失败了，再试试吧~')
      }
    } finally {
      loading.value = false
    }
  }
}
</script>

<style scoped lang="scss">
// ───── 使用全局 design-tokens（通过 Vite additionalData 自动注入）─────

.register-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(160deg, $brand-primary-bg 0%, $bg-pink-peach 35%, $color-lavender 70%, $brand-primary-bg 100%);
  overflow: hidden;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.bg-decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.45;
  &--1 { width: 350px; height: 350px; top: -80px; right: -60px; background: radial-gradient(circle, $brand-primary-lightest, transparent 70%); }
  &--2 { width: 250px; height: 250px; bottom: -50px; left: -40px; background: radial-gradient(circle, $color-lavender, transparent 70%); }
}

.float-heart {
  position: absolute;
  bottom: -20px;
  animation: floatUp 8s ease-in-out infinite;
  opacity: 0;
  user-select: none;
}

.twinkle-star {
  position: absolute;
  animation: twinkle 3s ease-in-out infinite;
  user-select: none;
  opacity: 0.4;
}

@keyframes floatUp {
  0% { transform: translateY(0) rotate(0deg) scale(0.5); opacity: 0; }
  12% { opacity: 0.55; }
  80% { opacity: 0.2; }
  100% { transform: translateY(-100vh) rotate(20deg) scale(1); opacity: 0; }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.15; transform: scale(0.7); }
  50% { opacity: 0.6; transform: scale(1.1); }
}

.register-card {
  position: relative;
  z-index: 1;
  width: 92%;
  max-width: 420px;
  padding: 40px 36px 28px;
  background: $overlay-white-82;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  border: 1.5px solid $overlay-pink-lighter-25;
  box-shadow: 0 4px 24px $overlay-pink-12, 0 1px 3px $overlay-black-05;
  animation: cardIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(30px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.avatar-area {
  text-align: center;
  margin-bottom: 28px;
}

.avatar-ring {
  display: inline-block;
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, $brand-primary-lighter, $color-lavender);
  margin-bottom: 12px;
}

.avatar-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: $text-white;
  display: flex;
  align-items: center;
  justify-content: center;
  svg { width: 52px; height: 52px; }
}

.app-name {
  font-size: 24px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 4px 0;
}

.app-tagline {
  font-size: 13px;
  color: $text-secondary;
  margin: 0;
}

.field-wrap {
  width: 100%;
  + .field-wrap { margin-top: 4px; }
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 8px;
}

.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $brand-primary-light;
}

.cute-input {
  :deep(.t-input) {
    border-radius: 14px;
    border: 1.5px solid $brand-primary-lightest;
    background: $overlay-pink-bg-40;
    height: 46px;
    padding-left: 42px;
    transition: all 0.3s ease;
    &:hover { border-color: $brand-primary-lighter; background: $overlay-pink-bg-60; }
    &:focus-within, &.t-is-focused { border-color: $brand-primary-light; background: $text-white; box-shadow: 0 0 0 4px $overlay-pink-12; }
    .t-input__wrap { color: $text-primary; font-size: 14px; }
    &::placeholder { color: $text-caption-muted !important; }
  }
  :deep(.t-input__prefix) { margin-right: 10px; color: $brand-primary-light; display: flex; align-items: center; }
}

.cute-btn {
  height: 46px !important;
  border-radius: 14px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  letter-spacing: 1px;
  background: linear-gradient(135deg, $brand-primary-light, $brand-primary) !important;
  border: none !important;
  box-shadow: 0 4px 16px $shadow-brand-md;
  transition: all 0.3s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 8px 24px $shadow-brand-lg; }
  &:active { transform: translateY(0); }
  .btn-text { color: $text-white; }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 20px;
  margin-top: 8px;
  border-top: 1px dashed $brand-primary-lightest;
  font-size: 13px;
  color: $text-secondary;
  .go-login {
    color: $brand-primary;
    text-decoration: none;
    font-weight: 600;
    &:hover { color: $brand-primary-light; text-decoration: none; }
  }
}

.bottom-note {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: $text-secondary;
  opacity: 0.6;
  white-space: nowrap;
}

@media screen and (max-width: 480px) {
  .register-card { padding: 32px 20px 24px; border-radius: 20px; width: 94%; }
  .app-name { font-size: 20px; }
  .cute-input :deep(.t-input) { height: 44px; border-radius: 12px; }
  .cute-btn { height: 44px !important; border-radius: 12px !important; }
}
</style>
