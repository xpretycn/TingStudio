<template>
  <div class="error-page">
    <div class="error-bg">
      <div class="error-blob error-blob--1"></div>
      <div class="error-blob error-blob--2"></div>
      <div class="error-blob error-blob--3"></div>
      <div class="error-grid-overlay"></div>
    </div>

    <div class="error-container">
      <div class="error-card">
        <div class="error-brand">
          <div class="error-logo">
            <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="60" cy="60" r="56" fill="#FEE2E2" stroke="#FECACA" stroke-width="2"/>
              <circle cx="60" cy="50" r="24" fill="#FFE4E6" />
              <path d="M42 44L38 28L52 40Z" fill="#FDA4AF" />
              <path d="M78 44L82 28L68 40Z" fill="#FDA4AF" />
              <ellipse cx="51" cy="48" rx="3" ry="4" fill="#7C2D12" />
              <ellipse cx="69" cy="48" rx="3" ry="4" fill="#7C2D12" />
              <path d="M54 57Q60 63 66 57" stroke="#E8A0B0" stroke-width="2" fill="none" stroke-linecap="round"/>
              <line x1="36" y1="72" x2="84" y2="72" stroke="#F87171" stroke-width="3" stroke-linecap="round"/>
              <text x="60" y="95" text-anchor="middle" fill="#DC2626" font-size="14" font-weight="800">TingStudio</text>
            </svg>
          </div>
        </div>

        <h1 class="error-code">500</h1>
        <h2 class="error-title">服务器连接失败</h2>
        <p class="error-desc">
          后端服务未启动或网络连接异常，<br />请检查后端服务状态后重试。
        </p>

        <div class="error-actions">
          <button class="btn-primary" @click="handleRefresh">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              :class="{ 'spin': isRefreshing }">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            {{ isRefreshing ? '正在重连...' : '刷新重试' }}
          </button>
          <button class="btn-secondary" @click="goLogin">返回登录</button>
        </div>

        <div class="error-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>提示：请确保后端服务已启动（通常运行在 localhost:3000）</span>
        </div>
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
</script>

<style scoped lang="scss">
$brand-primary: #10b981;
$brand-danger: #ef4444;

.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfeff 30%, #fefce8 60%, #fff1f2 100%);
  position: relative;
  overflow: hidden;
}

.error-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;

  .error-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.5;
    animation: blobFloat 20s ease-in-out infinite;

    &--1 {
      width: 400px; height: 400px;
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(251, 146, 60, 0.1));
      top: -10%; left: -5%;
      animation-delay: 0s;
    }

    &--2 {
      width: 350px; height: 350px;
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(168, 85, 247, 0.06));
      bottom: -5%; right: -8%;
      animation-delay: -7s;
    }

    &--3 {
      width: 250px; height: 250px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(45, 212, 191, 0.05));
      top: 40%; left: 50%;
      animation-delay: -14s;
    }
  }

  .error-grid-overlay {
    position: absolute;
    inset: 0;
    background-image:
      radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.04) 1px, transparent 0);
    background-size: 32px 32px;
  }
}

@keyframes blobFloat {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(30px, -20px) scale(1.05); }
  66% { transform: translate(-20px, 20px) scale(0.95); }
}

.error-container {
  position: relative;
  z-index: 10;
  padding: 24px;
  width: 100%;
  max-width: 480px;
}

.error-card {
  background: #ffffff;
  border-radius: 32px;
  padding: 48px 40px 40px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.02),
    0 20px 40px -8px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(148, 163, 184, 0.08);
  text-align: center;
  animation: cardEnter 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.error-brand {
  margin-bottom: 20px;
  animation: logoBounce 1.2s ease both 0.2s;
}

@keyframes logoBounce {
  0% { opacity: 0; transform: scale(0.5); }
  50% { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}

.error-logo {
  width: 96px;
  height: 96px;
  margin: 0 auto;
  animation: logoWobble 3s ease-in-out infinite;

  svg {
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 8px 16px rgba(239, 68, 68, 0.15));
  }
}

@keyframes logoWobble {
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(-3deg); }
  30% { transform: rotate(2deg); }
  45% { transform: rotate(-1.5deg); }
  60% { transform: rotate(1deg); }
  75% { transform: rotate(-0.5deg); }
}

.error-code {
  font-size: 64px;
  font-weight: 900;
  color: $brand-danger;
  line-height: 1;
  margin: 0 0 8px;
  letter-spacing: -3px;
  animation: codePulse 2s ease-in-out infinite;
  background: linear-gradient(180deg, #ef4444, #dc2626);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

@keyframes codePulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.error-title {
  font-size: 22px;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 12px;
  letter-spacing: -0.01em;
}

.error-desc {
  font-size: 14px;
  color: #94a3b8;
  line-height: 1.7;
  margin: 0 0 32px;
}

.error-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 24px;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 28px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 8px 20px -4px rgba(16, 185, 129, 0.35);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 26px -4px rgba(16, 185, 129, 0.45);
    background: linear-gradient(135deg, #059669, #047857);
  }

  &:active {
    transform: translateY(0);
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
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

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
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #fefce8;
  border-radius: 12px;
  border: 1px solid #fef08a;
  font-size: 12px;
  color: #a16207;
  text-align: left;
  line-height: 1.6;

  svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: #ca8a04;
  }
}
</style>
