<template>
  <div class="error-page">
    <!-- ─── Left Panel: Branding & Illustration ─── -->
    <div class="left-panel">
      <div class="left-panel__decor">
        <div class="left-panel__blob left-panel__blob--1"></div>
        <div class="left-panel__blob left-panel__blob--2"></div>
        <div class="left-panel__blob left-panel__blob--3"></div>
        <span v-for="i in 6" :key="'h' + i" class="float-heart" :style="heartStyle(i)">♥</span>
        <span v-for="i in 8" :key="'s' + i" class="twinkle-star" :style="starStyle(i)">✦</span>
      </div>

      <div class="left-panel__content">
        <div class="illustration">
          <div class="illustration__cat">
            <svg viewBox="0 0 320 260" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="160" cy="220" rx="120" ry="30" fill="rgba(255,255,255,0.15)" />
              <ellipse cx="160" cy="180" rx="70" ry="60" fill="#FFE8D6" />
              <circle cx="160" cy="120" r="55" fill="#FFE8D6" />
              <path d="M115 90L105 45L140 80Z" fill="#FFB5C8" />
              <path d="M120 85L112 55L137 78Z" fill="#FFD1DC" />
              <path d="M205 90L215 45L180 80Z" fill="#FFB5C8" />
              <path d="M200 85L208 55L183 78Z" fill="#FFD1DC" />
              <ellipse cx="142" cy="118" rx="7" ry="8" fill="#5D4E60" />
              <ellipse cx="178" cy="118" rx="7" ry="8" fill="#5D4E60" />
              <ellipse cx="144" cy="115" rx="2.5" ry="3" fill="#fff" />
              <ellipse cx="180" cy="115" rx="2.5" ry="3" fill="#fff" />
              <ellipse cx="160" cy="132" rx="4" ry="3" fill="#FFB5C2" />
              <path d="M152 138Q160 145 168 138" stroke="#E8A0B0" stroke-width="1.5" fill="none"
                stroke-linecap="round" />
              <ellipse cx="130" cy="130" rx="10" ry="6" fill="#FFB5C2" opacity="0.35" />
              <ellipse cx="190" cy="130" rx="10" ry="6" fill="#FFB5C2" opacity="0.35" />
              <line x1="118" y1="125" x2="138" y2="128" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="118" y1="133" x2="138" y2="132" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="182" y1="128" x2="202" y2="125" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <line x1="182" y1="132" x2="202" y2="133" stroke="#E8A0B0" stroke-width="1" opacity="0.4" />
              <ellipse cx="135" cy="225" rx="18" ry="12" fill="#FFE8D6" />
              <ellipse cx="185" cy="225" rx="18" ry="12" fill="#FFE8D6" />
              <circle cx="130" cy="228" r="3" fill="#FFB5C2" opacity="0.4" />
              <circle cx="139" cy="226" r="3" fill="#FFB5C2" opacity="0.4" />
              <circle cx="181" cy="226" r="3" fill="#FFB5C2" opacity="0.4" />
              <circle cx="190" cy="228" r="3" fill="#FFB5C2" opacity="0.4" />
              <path d="M230 190Q260 160 250 130Q245 115 255 105" stroke="#FFE8D6" stroke-width="10" fill="none"
                stroke-linecap="round" />
              <g transform="translate(95, 200) scale(0.6)">
                <path d="M10 6C10 2 6 0 3 0S0 2 0 4C0 8 10 16 10 16S20 8 20 4C20 2 17 0 14 0S10 2 10 6Z"
                  fill="#FF8FAB" />
              </g>
            </svg>
          </div>
          <div class="illustration__sparkle illustration__sparkle--1">✨</div>
          <div class="illustration__sparkle illustration__sparkle--2">💖</div>
          <div class="illustration__sparkle illustration__sparkle--3">🌸</div>
          <div class="illustration__sparkle illustration__sparkle--4">💫</div>
        </div>

        <div class="brand-text">
          <h1 class="brand-text__title">
            <span class="brand-text__icon">♡</span>
            TingStudio
          </h1>
          <p class="brand-text__subtitle">你的专属工作数据小管家</p>
          <p class="brand-text__desc">在这里记录每一个灵感，管理每一份配方，<br />让工作变得轻松又可爱~</p>
        </div>

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

    <!-- ─── Right Panel: Error Info Card ─── -->
    <div class="right-panel">
      <div class="error-card">
        <div class="error-header">
          <div class="error-header__logo">
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
          <h2 class="error-header__title">哎呀 ~ 出错了</h2>
          <p class="error-header__desc">服务器暂时休息中，请稍后再试哦~</p>
        </div>

        <div class="error-code-section">
          <div class="error-code">500</div>
          <div class="error-code-label">服务器连接失败</div>
        </div>

        <div class="error-desc">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>后端服务未启动或网络连接异常，请检查后端服务状态后重试。</span>
        </div>

        <div class="error-actions">
          <button class="btn-primary" @click="handleRefresh" :class="{ 'is-loading': isRefreshing }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              :class="{ 'spin': isRefreshing }">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {{ isRefreshing ? '正在重连...' : '刷新重试' }}
          </button>
          <button class="btn-secondary" @click="goLogin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            返回登录
          </button>
        </div>

        <div class="error-hint">
          <span class="hint-icon">💡</span>
          <span>提示：请确保后端服务已启动（通常运行在 localhost:3000）</span>
        </div>
      </div>

      <div class="right-panel__copyright">
        © 2026 TingStudio · 用心记录每一天 ♡
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isRefreshing = ref(false);

const handleRefresh = async () => {
  isRefreshing.value = true;
  await new Promise(r => setTimeout(r, 1500));
  window.location.reload();
};

const goLogin = () => {
  router.push('/login');
};

const heartStyle = (i: number) => ({
  left: `${5 + i * 15}%`,
  animationDelay: `${i * 1.5}s`,
  fontSize: `${14 + (i % 3) * 8}px`,
  color: `hsl(${340 + i * 6}, 80%, ${72 + i * 2}%)`
});

const starStyle = (i: number) => ({
  left: `${3 + i * 12}%`,
  top: `${8 + (i % 5) * 18}%`,
  animationDelay: `${i * 0.7}s`,
  fontSize: `${10 + (i % 3) * 5}px`,
  color: `hsl(${280 + i * 12}, 70%, ${75 + i * 2}%)`
});
</script>

<style scoped lang="scss">
$brand-primary: #ff6b8a;
$brand-primary-light: #ff8fab;
$brand-primary-lighter: #ffc2d1;
$brand-primary-lightest: #fff0f3;
$text-primary: #1e293b;
$text-secondary: #64748b;
$text-dim: #94a3b8;
$text-white: #ffffff;
$color-lavender: #e8d5f5;
$decor-mauve: #ffd1dc;
$overlay-pink-20: rgba(255, 107, 138, 0.2);
$overlay-pink-15: rgba(255, 107, 138, 0.15);
$overlay-pink-12: rgba(255, 107, 138, 0.12);
$overlay-white-35: rgba(255, 255, 255, 0.35);
$overlay-pink-bg-40: rgba(255, 240, 243, 0.4);
$overlay-pink-bg-60: rgba(255, 240, 243, 0.6);
$overlay-white-65: rgba(255, 255, 255, 0.65);
$overlay-pink-lighter-20: rgba(255, 194, 209, 0.2);
$transition-fast: 0.2s ease;
$transition-slow: 0.4s cubic-bezier(0.16, 1, 0.3, 1);
$shadow-brand-xs: 0 2px 8px rgba(255, 107, 138, 0.15);
$shadow-brand-sm: 0 4px 12px rgba(255, 107, 138, 0.2);
$shadow-brand-md: 0 6px 20px rgba(255, 107, 138, 0.25);
$shadow-brand-lg: 0 10px 30px rgba(255, 107, 138, 0.3);

.error-page {
  display: flex;
  min-height: 100vh;
  width: 100%;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  overflow: hidden;
}

.left-panel {
  position: relative;
  flex: 0 0 30%;
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
      background: radial-gradient(circle, $brand-primary-lightest, transparent 70%);
    }

    &--2 {
      width: 280px;
      height: 280px;
      bottom: -60px;
      left: -40px;
      background: radial-gradient(circle, $color-lavender, transparent 70%);
    }

    &--3 {
      width: 180px;
      height: 180px;
      top: 50%;
      left: 20%;
      background: radial-gradient(circle, $decor-mauve, transparent 70%);
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
  to { opacity: 1; transform: translateX(0); }
}

.illustration {
  position: relative;
  width: 260px;
  height: 220px;
  margin: 0 auto 28px;

  &__cat {
    width: 100%;
    height: 100%;
    animation: catBounce 4s ease-in-out infinite;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 8px 20px $overlay-pink-20);
    }
  }

  &__sparkle {
    position: absolute;
    font-size: 18px;
    animation: sparkleFloat 3s ease-in-out infinite;

    &--1 { top: 8px; right: 8px; animation-delay: 0s; font-size: 20px; }
    &--2 { top: 45%; left: -8px; animation-delay: 0.8s; font-size: 16px; }
    &--3 { bottom: 25px; right: 0; animation-delay: 1.6s; font-size: 18px; }
    &--4 { top: 18px; left: 16px; animation-delay: 2.2s; font-size: 14px; }
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

.brand-text {
  margin-bottom: 24px;

  &__title {
    font-size: 28px;
    font-weight: 700;
    color: $text-primary;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  &__icon {
    color: $brand-primary-light;
    font-size: 24px;
    animation: heartBeat 1.5s ease-in-out infinite;
  }

  &__subtitle {
    font-size: 15px;
    font-weight: 600;
    color: $brand-primary-light;
    margin: 0 0 10px 0;
  }

  &__desc {
    font-size: 13px;
    color: $text-secondary;
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

.feature-tags {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.feature-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: $overlay-white-65;
  backdrop-filter: blur(8px);
  border-radius: 20px;
  font-size: 12px;
  color: $text-primary;
  font-weight: 500;
  border: 1px solid $overlay-pink-lighter-20;

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: $brand-primary-light;
    flex-shrink: 0;
  }
}

.right-panel {
  flex: 0 0 70%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 40px;
  background: $text-white;
  position: relative;

  &__copyright {
    position: absolute;
    bottom: 20px;
    font-size: 11px;
    color: $text-dim;
  }
}

.error-card {
  width: 100%;
  max-width: 420px;
  animation: fadeSlideUp 0.7s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.error-header {
  margin-bottom: 28px;
  text-align: center;

  &__logo {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    margin: 0 auto 18px;
    width: 90px;
    height: 90px;

    svg {
      width: 100%;
      height: 100%;
      animation: catBounceSmall 4s ease-in-out infinite;
      filter: drop-shadow(0 4px 12px $overlay-pink-15);
    }
  }

  &__title {
    font-size: 22px;
    font-weight: 700;
    color: $text-primary;
    margin: 0 0 8px 0;
  }

  &__desc {
    font-size: 13px;
    color: $text-secondary;
    margin: 0;
    line-height: 1.5;
  }
}

@keyframes catBounceSmall {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

.error-code-section {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #FEF2F2, #FEE2E2);
  border-radius: 20px;
  border: 1px solid #FECACA;

  .error-code {
    font-size: 56px;
    font-weight: 900;
    color: #EF4444;
    line-height: 1;
    letter-spacing: -3px;
    animation: codePulse 2s ease-in-out infinite;
  }

  .error-code-label {
    font-size: 13px;
    font-weight: 600;
    color: #DC2626;
    margin-top: 6px;
  }
}

@keyframes codePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.error-desc {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 14px 16px;
  background: #FFFBEB;
  border-radius: 12px;
  border: 1px solid #FEF08A;
  font-size: 13px;
  color: #a16207;
  text-align: left;
  line-height: 1.6;
  margin-bottom: 24px;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: #ca8a04;
  }
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, $brand-primary-light, $brand-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all $transition-slow;
  box-shadow: $shadow-brand-md;
  position: relative;
  overflow: hidden;

  &:hover:not(.is-loading) {
    transform: translateY(-2px);
    box-shadow: $shadow-brand-lg;
  }

  &:active:not(.is-loading) {
    transform: translateY(0);
  }

  &.is-loading {
    opacity: 0.85;
    cursor: not-allowed;
  }

  .spin {
    animation: spin 0.8s linear infinite;
  }
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 12px 24px;
  border: 1.5px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  color: #64748b;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    border-color: #cbd5e1;
    background: #f8fafc;
    color: #475569;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.error-hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #F0FDF4;
  border-radius: 12px;
  border: 1px solid #BBF7D0;
  font-size: 12px;
  color: #166534;
  text-align: left;
  line-height: 1.6;

  .hint-icon {
    font-size: 16px;
  }
}

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

@media screen and (max-width: 768px) {
  .error-page {
    flex-direction: column;
  }

  .left-panel {
    display: none;
  }

  .right-panel {
    background: linear-gradient(180deg, $brand-primary-bg 0%, #FFF5F7 50%, $text-white 100%);
    padding: 32px 24px;
    min-height: 100vh;
  }

  .error-card {
    max-width: 100%;
  }
}
</style>
