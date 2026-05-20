<template>
  <div class="register-page">
    <!-- ─── Left Panel: Animated Characters ─── -->
    <div class="left-panel">
      <div class="left-panel__decor">
        <div class="deco-grid" />
        <div class="deco-circle deco-circle-1" />
        <div class="deco-circle deco-circle-2" />
      </div>

      <div class="left-panel__content">
        <div class="brand">
          <div class="brand-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <span>TingStudio</span>
        </div>

        <div class="characters-area">
          <AnimatedCharacters
            :is-typing="isTyping"
            :has-secret="!!formData.password"
            :secret-visible="showPassword"
          />
        </div>

        <div class="footer-links">
          <span>智能配方管理</span>
          <span>客户资料维护</span>
          <span>数据安全可靠</span>
        </div>
      </div>
    </div>

    <!-- ─── Right Panel: Register Form ─── -->
    <div class="right-panel">
      <div class="right-panel__decor">
        <div class="deco-grid-light" />
        <div class="deco-glow deco-glow-1" />
        <div class="deco-glow deco-glow-2" />
      </div>

      <div class="form-card">
        <!-- Mobile-only avatar (hidden on desktop) -->
        <div class="mobile-avatar">
          <div class="avatar-ring">
            <div class="avatar-inner">
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
          <h2 class="mobile-title">TingStudio</h2>
        </div>

        <!-- Form header -->
        <div class="form-header">
          <div class="form-header__logo">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="50" cy="55" rx="38" ry="35" fill="#FFE8D6" />
              <path d="M22 35L12 8L35 30Z" fill="#FFB5C8" />
              <path d="M25 32L18 12L36 28Z" fill="#FFD1DC" />
              <path d="M78 35L88 8L65 30Z" fill="#FFB5C8" />
              <path d="M75 32L82 12L64 28Z" fill="#FFD1DC" />
              <ellipse cx="38" cy="52" rx="6" ry="7" fill="#5D4E60" />
              <ellipse cx="62" cy="52" rx="6" ry="7" fill="#5D4E60" />
              <ellipse cx="40" cy="49" rx="2" ry="2.5" fill="#fff" />
              <ellipse cx="64" cy="49" rx="2" ry="2.5" fill="#fff" />
              <ellipse cx="50" cy="62" rx="3.5" ry="2.5" fill="#FFB5C2" />
              <path d="M44 68Q50 73 56 68" stroke="#E8A0B0" stroke-width="1.2" fill="none" stroke-linecap="round" />
              <ellipse cx="32" cy="62" rx="6" ry="3.5" fill="#FFB5C2" opacity="0.35" />
              <ellipse cx="68" cy="62" rx="6" ry="3.5" fill="#FFB5C2" opacity="0.35" />
              <line x1="20" y1="60" x2="35" y2="62" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="20" y1="66" x2="35" y2="65" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="65" y1="62" x2="80" y2="60" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="65" y1="65" x2="80" y2="66" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <ellipse cx="35" cy="88" rx="10" ry="6" fill="#FFE8D6" />
              <ellipse cx="65" cy="88" rx="10" ry="6" fill="#FFE8D6" />
              <path
                d="M35 88C35 85 33 84 31 84C29 84 27 85 27 86C27 88 35 92 35 92C35 92 43 88 43 86C43 85 41 84 39 84C37 84 35 85 35 88Z"
                fill="#FF8FAB" />
            </svg>
          </div>
          <h2 class="form-header__title">加入我们 ~</h2>
          <p class="form-header__desc">创建你的小天地，开启全新旅程吧</p>
        </div>

        <!-- Register form -->
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
                @focus="isTyping = true"
                @blur="isTyping = false"
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
                :type="showPassword ? 'text' : 'password'"
                placeholder="请输入密码"
                size="large"
                clearable
                class="cute-input"
                @focus="isTyping = true"
                @blur="isTyping = false"
              >
                <template #prefix-icon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </template>
                <template #suffix-icon>
                  <button
                    type="button"
                    class="eye-btn"
                    @click="showPassword = !showPassword"
                  >
                    <svg v-if="showPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
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
                :type="showConfirmPassword ? 'text' : 'password'"
                placeholder="请再次输入密码"
                size="large"
                clearable
                class="cute-input"
                @focus="isTyping = true"
                @blur="isTyping = false"
              >
                <template #prefix-icon>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </template>
                <template #suffix-icon>
                  <button
                    type="button"
                    class="eye-btn"
                    @click="showConfirmPassword = !showConfirmPassword"
                  >
                    <svg v-if="showConfirmPassword" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                    <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
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

        <div class="form-footer">
          <span>已有账号？</span>
          <router-link to="/login" class="go-login">去登录 →</router-link>
        </div>
      </div>

      <div class="right-panel__copyright">
        © 2026 TingStudio · 用心记录每一天 ♡
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MessagePlugin } from 'tdesign-vue-next'
import type { FormInstanceFunctions, FormRule } from 'tdesign-vue-next'
import AnimatedCharacters from './AnimatedCharacters.vue'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)
const isTyping = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

const formData = reactive({
  username: '',
  password: '',
  confirmPassword: ''
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
.register-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: "PingFang SC", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow: hidden;
}

// ═══════════════════════════════════════
//  LEFT PANEL
// ═══════════════════════════════════════
.left-panel {
  position: relative;
  flex: 0 0 45%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 50%, var(--color-lavender) 100%);
  overflow: hidden;

  &__decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 100%;
    width: 100%;
    max-width: 550px;
  }
}

.deco-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 20px 20px;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);

  &-1 {
    top: 25%;
    right: 25%;
    width: 256px;
    height: 256px;
    background: rgba(255, 255, 255, 0.1);
  }

  &-2 {
    bottom: 25%;
    left: 25%;
    width: 384px;
    height: 384px;
    background: rgba(255, 255, 255, 0.05);
  }
}

.brand {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: white;

  &-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.characters-area {
  position: relative;
  z-index: 20;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  flex: 1;
  min-height: 400px;
}

.footer-links {
  position: relative;
  z-index: 20;
  display: flex;
  gap: 32px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);

  span {
    transition: color 0.2s;

    &:hover {
      color: white;
    }
  }
}

// ═══════════════════════════════════════
//  RIGHT PANEL
// ═══════════════════════════════════════
.right-panel {
  flex: 0 0 55%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: linear-gradient(180deg, var(--color-primary-bg) 0%, var(--color-bg-container) 40%);
  position: relative;
  overflow: hidden;

  &__decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__copyright {
    position: absolute;
    bottom: 20px;
    font-size: 11px;
    color: var(--color-text-secondary);
    z-index: 1;
  }
}

.deco-grid-light {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--overlay-brand-05) 1px, transparent 1px),
    linear-gradient(to bottom, var(--overlay-brand-05) 1px, transparent 1px);
  background-size: 24px 24px;
}

.deco-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(64px);
  opacity: 0.5;

  &-1 {
    bottom: -80px;
    right: -40px;
    width: 300px;
    height: 300px;
    background: var(--color-primary-lightest);
  }

  &-2 {
    top: -60px;
    left: -30px;
    width: 200px;
    height: 200px;
    background: var(--color-lavender);
  }
}

.form-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 40px 36px 28px;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 24px;
  border: 1px solid var(--overlay-brand-lighter-25);
  box-shadow: 0 4px 24px var(--overlay-brand-08), 0 1px 3px rgba(0, 0, 0, 0.04);
  animation: fadeSlideUp 0.7s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeSlideUp {
  from {
    opacity: 0;
    transform: translateY(24px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

// ───── Mobile Avatar (hidden on desktop) ─────
.mobile-avatar {
  display: none;
  text-align: center;
  margin-bottom: 24px;
}

.avatar-ring {
  display: inline-block;
  padding: 3px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-lighter), var(--color-lavender));
  margin-bottom: 10px;
}

.avatar-inner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-bg-container);
  display: flex;
  align-items: center;
  justify-content: center;

  svg {
    width: 48px;
    height: 48px;
  }
}

.mobile-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin: 0;
}

// ───── Form Header ─────
.form-header {
  margin-bottom: 32px;
  text-align: center;

  &__logo {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto 20px;
    width: 100px;
    height: 100px;

    svg {
      width: 100%;
      height: 100%;
      animation: catBounceSmall 4s ease-in-out infinite;
      filter: drop-shadow(0 4px 12px var(--overlay-brand-15));
    }
  }

  &__title {
    font-size: 24px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 8px 0;
  }

  &__desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.5;
  }
}

@keyframes catBounceSmall {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

// ───── Form Fields ─────
.field-wrap {
  width: 100%;

  +.field-wrap {
    margin-top: 4px;
  }
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 8px;
}

.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-primary-light);
  display: inline-block;
}

.cute-input {
  :deep(.t-input) {
    border-radius: 14px;
    border: 1.5px solid var(--color-primary-lightest);
    background: var(--overlay-brand-05) !important;
    height: 48px;
    padding-left: 42px;
    transition: all var(--transition-slow);

    &:hover {
      border-color: var(--color-primary-lighter);
      background: var(--overlay-brand-08) !important;
    }

    &:focus-within,
    &.t-is-focused {
      border-color: var(--color-primary-light);
      background: #ffffff !important;
      box-shadow: 0 0 0 4px var(--overlay-brand-12);
    }

    &.t-is-error {
      border-color: var(--color-danger);
      box-shadow: 0 0 0 4px rgba(227, 77, 89, 0.12);
    }

    .t-input__wrap {
      color: var(--color-text-primary);
      font-size: 14px;
      caret-color: var(--color-primary);
      background: transparent !important;
    }

    .t-input__inner {
      color: var(--color-text-primary);
      background: transparent !important;

      &::selection {
        background: var(--overlay-brand-20);
        color: var(--color-text-primary);
      }

      &:-webkit-autofill,
      &:-webkit-autofill:hover,
      &:-webkit-autofill:focus,
      &:-webkit-autofill:active {
        -webkit-text-fill-color: var(--color-text-primary);
        -webkit-box-shadow: 0 0 0 48px #ffffff inset !important;
        caret-color: var(--color-primary);
        transition: background-color 5000s ease-in-out 0s;
      }
    }

    &::placeholder {
      color: var(--color-text-placeholder) !important;
    }
  }

  :deep(.t-input__prefix) {
    margin-right: 10px;
    color: var(--color-primary-light);
    display: flex;
    align-items: center;
  }

  :deep(.t-input__suffix) {
    color: var(--color-primary-lighter);
  }
}

.eye-btn {
  background: none;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  transition: color 0.2s;

  &:hover {
    color: #3f3f46;
  }
}

// ───── Button ─────
.cute-btn {
  position: relative;
  height: 48px !important;
  border-radius: 14px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  letter-spacing: 1px;
  background: var(--gradient-btn) !important;
  border: none !important;
  box-shadow: var(--shadow-brand-md);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.35);
    transform: translate(-50%, -50%);
    transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1),
      height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    pointer-events: none;
    z-index: 1;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-brand-lg);
    background: var(--gradient-btn-hover) !important;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:active {
    transform: translateY(1px) scale(0.98);
    box-shadow: var(--shadow-brand-sm);
    background: var(--gradient-btn) !important;
    transition: all 0.15s ease-out;

    &::before {
      width: 300px;
      height: 300px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1),
        height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  &:focus {
    outline: none;
    box-shadow: var(--shadow-brand-md),
      0 0 0 4px var(--overlay-brand-25);
  }

  &[class*="loading"] {
    opacity: 0.85;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: var(--shadow-brand-xs) !important;
  }

  .btn-text {
    color: var(--color-text-white);
    position: relative;
    z-index: 2;
  }
}

// ───── Form Footer ─────
.form-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 20px;
  margin-top: 8px;
  border-top: 1px dashed var(--color-primary-lightest);
  font-size: 13px;
  color: var(--color-text-secondary);

  .go-login {
    color: var(--color-primary);
    text-decoration: none;
    font-weight: 600;
    transition: all var(--transition-fast);

    &:hover {
      color: var(--color-primary-light);
      text-decoration: none;
    }
  }
}

// ═══════════════════════════════════════
//  RESPONSIVE
// ═══════════════════════════════════════

@media screen and (max-width: 1024px) {
  .left-panel {
    flex: 0 0 45%;
    padding: 36px 32px;
  }

  .characters-area {
    transform: scale(0.8);
  }
}

@media screen and (max-width: 768px) {
  .register-page {
    flex-direction: column;
  }

  .left-panel {
    display: none;
  }

  .right-panel {
    background: linear-gradient(180deg, var(--color-primary-bg) 0%, var(--color-primary-lightest) 50%, var(--color-bg-container) 100%);
    padding: 32px 24px;
    min-height: 100vh;
  }

  .mobile-avatar {
    display: block;
  }

  .form-card {
    max-width: 100%;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    border: none;
    box-shadow: none;
    padding: 0;
  }
}

@media screen and (max-width: 480px) {
  .right-panel {
    padding: 24px 16px;
  }

  .form-header {
    margin-bottom: 24px;

    &__logo {
      width: 80px;
      height: 80px;
      margin-bottom: 16px;
    }

    &__title {
      font-size: 22px;
    }

    &__desc {
      font-size: 13px;
    }
  }

  .cute-input {
    :deep(.t-input) {
      height: 44px;
      border-radius: 12px;
    }
  }

  .cute-btn {
    height: 44px !important;
    border-radius: 12px !important;
  }
}
</style>
