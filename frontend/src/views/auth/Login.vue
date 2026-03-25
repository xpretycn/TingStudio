<template>
  <div class="login-page">
    <!-- ─── Left Panel: Branding & Illustration ─── -->
    <div class="left-panel">
      <div class="left-panel__decor">
        <div class="left-panel__blob left-panel__blob--1"></div>
        <div class="left-panel__blob left-panel__blob--2"></div>
        <div class="left-panel__blob left-panel__blob--3"></div>
        <span v-for="i in 8" :key="'h'+i" class="float-heart" :style="heartStyle(i)">♥</span>
        <span v-for="i in 10" :key="'s'+i" class="twinkle-star" :style="starStyle(i)">✦</span>
      </div>

      <div class="left-panel__content">
        <!-- Cute illustration -->
        <div class="illustration">
          <div class="illustration__cat">
            <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Cloud / cushion -->
              <ellipse cx="160" cy="220" rx="120" ry="30" fill="rgba(255,255,255,0.15)" />
              <!-- Main body -->
              <ellipse cx="160" cy="180" rx="70" ry="60" fill="#FFE8D6" />
              <!-- Head -->
              <circle cx="160" cy="120" r="55" fill="#FFE8D6" />
              <!-- Left ear -->
              <path d="M115 90L105 45L140 80Z" fill="#FFB5C8" />
              <path d="M120 85L112 55L137 78Z" fill="#FFD1DC" />
              <!-- Right ear -->
              <path d="M205 90L215 45L180 80Z" fill="#FFB5C8" />
              <path d="M200 85L208 55L183 78Z" fill="#FFD1DC" />
              <!-- Eyes -->
              <ellipse cx="142" cy="118" rx="7" ry="8" fill="#5D4E60" />
              <ellipse cx="178" cy="118" rx="7" ry="8" fill="#5D4E60" />
              <ellipse cx="144" cy="115" rx="2.5" ry="3" fill="#fff" />
              <ellipse cx="180" cy="115" rx="2.5" ry="3" fill="#fff" />
              <!-- Nose -->
              <ellipse cx="160" cy="132" rx="4" ry="3" fill="#FFB5C2" />
              <!-- Mouth -->
              <path d="M152 138Q160 145 168 138" stroke="#E8A0B0" stroke-width="1.5" fill="none" stroke-linecap="round" />
              <!-- Blush -->
              <ellipse cx="130" cy="130" rx="10" ry="6" fill="#FFB5C2" opacity="0.35" />
              <ellipse cx="190" cy="130" rx="10" ry="6" fill="#FFB5C2" opacity="0.35" />
              <!-- Whiskers -->
              <line x1="118" y1="125" x2="138" y2="128" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="118" y1="133" x2="138" y2="132" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="182" y1="128" x2="202" y2="125" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="182" y1="132" x2="202" y2="133" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <!-- Front paws -->
              <ellipse cx="135" cy="225" rx="18" ry="12" fill="#FFE8D6" />
              <ellipse cx="185" cy="225" rx="18" ry="12" fill="#FFE8D6" />
              <!-- Paw pads -->
              <circle cx="130" cy="228" r="3" fill="#FFB5C2" opacity="0.4" />
              <circle cx="139" cy="226" r="3" fill="#FFB5C2" opacity="0.4" />
              <circle cx="181" cy="226" r="3" fill="#FFB5C2" opacity="0.4" />
              <circle cx="190" cy="228" r="3" fill="#FFB5C2" opacity="0.4" />
              <!-- Tail -->
              <path d="M230 190Q260 160 250 130Q245 115 255 105" stroke="#FFE8D6" stroke-width="10" fill="none" stroke-linecap="round" />
              <!-- Holding a small heart -->
              <g transform="translate(95, 200) scale(0.6)">
                <path d="M10 6C10 2 6 0 3 0S0 2 0 4C0 8 10 16 10 16S20 8 20 4C20 2 17 0 14 0S10 2 10 6Z" fill="#FF8FAB" />
              </g>
            </svg>
          </div>
          <!-- Sparkles around cat -->
          <div class="illustration__sparkle illustration__sparkle--1">✨</div>
          <div class="illustration__sparkle illustration__sparkle--2">💖</div>
          <div class="illustration__sparkle illustration__sparkle--3">🌸</div>
          <div class="illustration__sparkle illustration__sparkle--4">💫</div>
        </div>

        <!-- Branding text -->
        <div class="brand-text">
          <h1 class="brand-text__title">
            <span class="brand-text__icon">♡</span>
            TingStudio
          </h1>
          <p class="brand-text__subtitle">你的专属工作数据小管家</p>
          <p class="brand-text__desc">在这里记录每一个灵感，管理每一份配方，<br />让工作变得轻松又可爱~</p>
        </div>

        <!-- Feature tags -->
        <div class="feature-tags">
          <div class="feature-tag">
            <span class="feature-tag__dot"></span>
            智能配方管理
          </div>
          <div class="feature-tag">
            <span class="feature-tag__dot"></span>
            客户资料维护
          </div>
          <div class="feature-tag">
            <span class="feature-tag__dot"></span>
            数据安全可靠
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Right Panel: Login Form ─── -->
    <div class="right-panel">
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
          <!-- Cat logo -->
          <div class="form-header__logo">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Head -->
              <ellipse cx="50" cy="55" rx="38" ry="35" fill="#FFE8D6" />
              <!-- Left ear -->
              <path d="M22 35L12 8L35 30Z" fill="#FFB5C8" />
              <path d="M25 32L18 12L36 28Z" fill="#FFD1DC" />
              <!-- Right ear -->
              <path d="M78 35L88 8L65 30Z" fill="#FFB5C8" />
              <path d="M75 32L82 12L64 28Z" fill="#FFD1DC" />
              <!-- Eyes -->
              <ellipse cx="38" cy="52" rx="6" ry="7" fill="#5D4E60" />
              <ellipse cx="62" cy="52" rx="6" ry="7" fill="#5D4E60" />
              <ellipse cx="40" cy="49" rx="2" ry="2.5" fill="#fff" />
              <ellipse cx="64" cy="49" rx="2" ry="2.5" fill="#fff" />
              <!-- Nose -->
              <ellipse cx="50" cy="62" rx="3.5" ry="2.5" fill="#FFB5C2" />
              <!-- Mouth -->
              <path d="M44 68Q50 73 56 68" stroke="#E8A0B0" stroke-width="1.2" fill="none" stroke-linecap="round" />
              <!-- Blush -->
              <ellipse cx="32" cy="62" rx="6" ry="3.5" fill="#FFB5C2" opacity="0.35" />
              <ellipse cx="68" cy="62" rx="6" ry="3.5" fill="#FFB5C2" opacity="0.35" />
              <!-- Whiskers -->
              <line x1="20" y1="60" x2="35" y2="62" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="20" y1="66" x2="35" y2="65" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="65" y1="62" x2="80" y2="60" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="65" y1="65" x2="80" y2="66" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <!-- Paws -->
              <ellipse cx="35" cy="88" rx="10" ry="6" fill="#FFE8D6" />
              <ellipse cx="65" cy="88" rx="10" ry="6" fill="#FFE8D6" />
              <!-- Heart in paw -->
              <path d="M35 88C35 85 33 84 31 84C29 84 27 85 27 86C27 88 35 92 35 92C35 92 43 88 43 86C43 85 41 84 39 84C37 84 35 85 35 88Z" fill="#FF8FAB" />
            </svg>
          </div>
          <h2 class="form-header__title">欢迎回来 ~</h2>
          <p class="form-header__desc">登录你的小天地，开始今天的工作吧</p>
        </div>

        <!-- Login form -->
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

          <t-form-item>
            <t-button
              type="submit"
              theme="primary"
              size="large"
              block
              :loading="loading"
              class="cute-btn"
            >
              <span class="btn-text">♥ 登 录</span>
            </t-button>
          </t-form-item>
        </t-form>

        <div class="form-footer">
          <span>还没有账号？</span>
          <router-link to="/register" class="go-register">去注册 →</router-link>
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

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstanceFunctions>()
const loading = ref(false)

const formData = reactive({
  username: 'admin',
  password: 'admin123'
})

const rules: Record<string, FormRule[]> = {
  username: [
    { required: true, message: '请输入用户名哦~', trigger: 'blur' },
    { min: 3, message: '用户名至少3个字符呢', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码哦~', trigger: 'blur' },
    { min: 6, message: '密码至少6个字符呢', trigger: 'blur' }
  ]
}

const heartStyle = (i: number) => ({
  left: `${5 + i * 12}%`,
  animationDelay: `${i * 1.5}s`,
  fontSize: `${14 + (i % 3) * 8}px`,
  color: `hsl(${340 + i * 6}, 80%, ${72 + i * 2}%)`
})

const starStyle = (i: number) => ({
  left: `${3 + i * 10}%`,
  top: `${8 + (i % 5) * 18}%`,
  animationDelay: `${i * 0.7}s`,
  fontSize: `${10 + (i % 3) * 5}px`,
  color: `hsl(${280 + i * 12}, 70%, ${75 + i * 2}%)`
})

const handleSubmit = async ({ validateResult }: any) => {
  if (validateResult === true) {
    loading.value = true
    try {
      const result = await authStore.login({
        username: formData.username,
        password: formData.password
      })
      if (result.success) {
        MessagePlugin.success('登录成功啦~ 欢迎回来！')
        router.push('/')
      } else {
        MessagePlugin.error(result.message || '登录失败了，再试试吧~')
      }
    } finally {
      loading.value = false
    }
  }
}
</script>

<style scoped lang="scss">
// ───── Palette ─────
$pink-100: #FFF0F3;
$pink-200: #FFD6E0;
$pink-300: #FFB5C8;
$pink-400: #FF8FAB;
$pink-500: #FF6B8A;
$peach:    #FFE8D6;
$cream:    #FFF9F5;
$lavender: #F0E6FF;
$mauve:    #E8D5F5;
$text-main: #5D4E60;
$text-sub:  #9B8FA0;
$white:     #fff;

.login-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

// ═══════════════════════════════════════
//  LEFT PANEL
// ═══════════════════════════════════════
.left-panel {
  position: relative;
  flex: 0 0 52%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: linear-gradient(155deg, #FFF0F3 0%, #FFE4EE 25%, #F0E6FF 55%, #FFF0F3 100%);
  overflow: hidden;

  &__decor {
    position: absolute;
    inset: 0;
    pointer-events: none;
    overflow: hidden;
  }

  &__blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(50px);
    opacity: 0.45;

    &--1 {
      width: 350px;
      height: 350px;
      top: -80px;
      right: -60px;
      background: radial-gradient(circle, $pink-200, transparent 70%);
    }
    &--2 {
      width: 280px;
      height: 280px;
      bottom: -60px;
      left: -40px;
      background: radial-gradient(circle, $lavender, transparent 70%);
    }
    &--3 {
      width: 180px;
      height: 180px;
      top: 50%;
      left: 20%;
      background: radial-gradient(circle, $mauve, transparent 70%);
      opacity: 0.3;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
    text-align: center;
    animation: fadeSlideRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
}

.float-heart {
  position: absolute;
  bottom: -20px;
  animation: floatUp 10s ease-in-out infinite;
  opacity: 0;
  user-select: none;
}

.twinkle-star {
  position: absolute;
  animation: twinkle 3.5s ease-in-out infinite;
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
  50% { opacity: 0.6; transform: scale(1.15); }
}

@keyframes fadeSlideRight {
  from { opacity: 0; transform: translateX(-30px); }
  to   { opacity: 1; transform: translateX(0); }
}

// ───── Illustration ─────
.illustration {
  position: relative;
  width: 280px;
  height: 240px;
  margin: 0 auto 32px;

  &__cat {
    width: 100%;
    height: 100%;
    animation: catBounce 4s ease-in-out infinite;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 8px 20px rgba(255, 143, 171, 0.2));
    }
  }

  &__sparkle {
    position: absolute;
    font-size: 20px;
    animation: sparkleFloat 3s ease-in-out infinite;

    &--1 { top: 10px; right: 10px; animation-delay: 0s; font-size: 22px; }
    &--2 { top: 50%; left: -10px; animation-delay: 0.8s; font-size: 18px; }
    &--3 { bottom: 30px; right: 0; animation-delay: 1.6s; font-size: 20px; }
    &--4 { top: 20px; left: 20px; animation-delay: 2.2s; font-size: 16px; }
  }
}

@keyframes catBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

@keyframes sparkleFloat {
  0%, 100% { opacity: 0.3; transform: translateY(0) scale(0.8); }
  50% { opacity: 1; transform: translateY(-6px) scale(1.1); }
}

// ───── Brand Text ─────
.brand-text {
  margin-bottom: 28px;

  &__title {
    font-size: 30px;
    font-weight: 700;
    color: $text-main;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__icon {
    color: $pink-400;
    font-size: 26px;
    animation: heartBeat 1.5s ease-in-out infinite;
  }

  &__subtitle {
    font-size: 16px;
    font-weight: 600;
    color: $pink-400;
    margin: 0 0 10px 0;
  }

  &__desc {
    font-size: 14px;
    color: $text-sub;
    line-height: 1.7;
    margin: 0;
  }
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.2); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
}

// ───── Feature Tags ─────
.feature-tags {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.feature-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 13px;
  color: $text-main;
  font-weight: 500;
  border: 1px solid rgba(255, 181, 200, 0.2);

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $pink-400;
    flex-shrink: 0;
  }
}

// ═══════════════════════════════════════
//  RIGHT PANEL
// ═══════════════════════════════════════
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: $white;
  position: relative;

  &__copyright {
    position: absolute;
    bottom: 20px;
    font-size: 11px;
    color: #C8C0CC;
  }
}

.form-card {
  width: 100%;
  max-width: 400px;
  animation: fadeSlideUp 0.7s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
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
  background: linear-gradient(135deg, $pink-300, $lavender);
  margin-bottom: 10px;
}

.avatar-inner {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: $white;
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
  color: $text-main;
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
      filter: drop-shadow(0 4px 12px rgba(255, 143, 171, 0.15));
    }
  }

  &__title {
    font-size: 24px;
    font-weight: 700;
    color: $text-main;
    margin: 0 0 8px 0;
  }

  &__desc {
    font-size: 14px;
    color: $text-sub;
    margin: 0;
    line-height: 1.5;
  }
}

@keyframes catBounceSmall {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

// ───── Form Fields ─────
.field-wrap {
  width: 100%;

  + .field-wrap {
    margin-top: 4px;
  }
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: $text-main;
  margin-bottom: 8px;
}

.label-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $pink-400;
  display: inline-block;
}

.cute-input {
  :deep(.t-input) {
    border-radius: 14px;
    border: 1.5px solid $pink-200;
    background: rgba(255, 240, 243, 0.4);
    height: 48px;
    padding-left: 42px;
    transition: all 0.3s ease;

    &:hover {
      border-color: $pink-300;
      background: rgba(255, 240, 243, 0.6);
    }

    &:focus-within,
    &.t-is-focused {
      border-color: $pink-400;
      background: $white;
      box-shadow: 0 0 0 4px rgba(255, 143, 171, 0.12);
    }

    .t-input__wrap {
      color: $text-main;
      font-size: 14px;
    }

    &::placeholder {
      color: #C8AAB8 !important;
    }
  }

  :deep(.t-input__prefix) {
    margin-right: 10px;
    color: $pink-400;
    display: flex;
    align-items: center;
  }

  :deep(.t-input__suffix) {
    color: $pink-300;
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
  background: linear-gradient(135deg, $pink-400, $pink-500) !important;
  border: none !important;
  box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3);
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  // Ripple effect background
  &::before {
    content: '';
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
    box-shadow: 0 8px 24px rgba(255, 107, 138, 0.4);
    background: linear-gradient(135deg, $pink-300, $pink-400) !important;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:active {
    transform: translateY(1px) scale(0.98);
    box-shadow: 0 2px 12px rgba(255, 107, 138, 0.35);
    background: linear-gradient(135deg, $pink-400, $pink-500) !important;
    transition: all 0.15s ease-out;

    // Expand ripple effect
    &::before {
      width: 300px;
      height: 300px;
      transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                  height 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3),
                0 0 0 4px rgba(255, 143, 171, 0.25);
  }

  // Loading state
  &[class*='loading'] {
    opacity: 0.85;
    cursor: not-allowed;
    transform: none !important;
    box-shadow: 0 2px 8px rgba(255, 107, 138, 0.2) !important;
  }

  .btn-text {
    color: $white;
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
  border-top: 1px dashed $pink-200;
  font-size: 13px;
  color: $text-sub;

  .go-register {
    color: $pink-500;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
      color: $pink-400;
      text-decoration: none;
    }
  }
}

// ═══════════════════════════════════════
//  RESPONSIVE
// ═══════════════════════════════════════

// Tablet: narrow left panel
@media screen and (max-width: 1024px) {
  .left-panel {
    flex: 0 0 45%;
    padding: 36px 32px;
  }

  .illustration {
    width: 220px;
    height: 190px;
  }

  .brand-text__title {
    font-size: 24px;
  }

  .feature-tags {
    gap: 8px;
  }

  .feature-tag {
    font-size: 12px;
    padding: 6px 12px;
  }
}

// Mobile: single column
@media screen and (max-width: 768px) {
  .login-page {
    flex-direction: column;
  }

  .left-panel {
    display: none;
  }

  .right-panel {
    background: linear-gradient(180deg, $pink-100 0%, $cream 50%, $white 100%);
    padding: 32px 24px;
    min-height: 100vh;
  }

  // Show mobile avatar
  .mobile-avatar {
    display: block;
  }

  .form-card {
    max-width: 100%;
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
