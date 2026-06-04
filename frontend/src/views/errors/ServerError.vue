<template>
  <div class="server-error-page">
    <div class="empty-wrapper">
      <div class="empty">
        <div class="empty-header">
          <div class="empty-media" data-variant="icon">
            <div class="server-icon-wrapper">
              <svg class="server-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
                <path d="M18 10h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2" opacity="0.4" />
              </svg>
              <div class="server-bars">
                <span class="bar bar-1"></span>
                <span class="bar bar-2"></span>
                <span class="bar bar-3"></span>
              </div>
            </div>
          </div>
          <div class="empty-title">500</div>
          <div class="empty-description">
            <span class="error-headline">服务器开小差啦 ~</span>
            <span class="error-sub">后端服务暂时休息中，请稍后再试哦~</span>
          </div>
        </div>

        <div class="empty-content">
          <div class="error-detail-card">
            <div class="error-detail-row">
              <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>后端服务未启动或网络连接异常</span>
            </div>
            <div class="error-hint-row">
              <span class="hint-emoji">💡</span>
              <span>请确保后端服务已启动（通常运行在 <strong>localhost:3000</strong>）</span>
            </div>
          </div>

          <div class="action-buttons">
            <button class="btn btn-default group" :disabled="isRefreshing" @click="handleRefresh">
              <svg
                class="refresh-icon"
                :class="{ 'is-spinning': isRefreshing }"
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              {{ isRefreshing ? '正在重连...' : '刷新重试' }}
            </button>

            <button class="btn btn-outline group" @click="goHome">
              <svg class="home-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              返回首页
            </button>

            <button class="btn btn-outline group" @click="goLogin">
              <svg class="login-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              返回登录
            </button>
          </div>
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

const goHome = () => {
  router.push('/');
};

const goLogin = () => {
  router.push('/login');
};
</script>

<style scoped lang="scss">
.server-error-page {
  position: relative;
  min-height: 100vh;
  width: 100%;
  overflow: hidden;
  background: var(--color-bg-page);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 600px 400px at 50% 30%, rgba(239, 68, 68, 0.04) 0%, transparent 70%),
      radial-gradient(ellipse 400px 300px at 20% 80%, rgba(16, 185, 129, 0.03) 0%, transparent 60%);
    pointer-events: none;
  }
}

.empty-wrapper {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 16px;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 480px;
  min-height: 0;
}

.empty-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  margin-bottom: 0;
}

.empty-media {
  position: relative;
  margin-bottom: 24px;
}

.server-icon-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.server-icon {
  width: 80px;
  height: 80px;
  color: var(--color-text-placeholder);
  stroke: var(--color-text-secondary);
  opacity: 0.35;
}

.server-bars {
  position: absolute;
  right: -12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
}

.bar {
  display: block;
  width: 3px;
  border-radius: 2px;
  background: var(--color-danger);
  opacity: 0.7;

  &-1 {
    height: 8px;
    animation: barPulse 1.2s ease-in-out infinite 0s;
  }
  &-2 {
    height: 14px;
    animation: barPulse 1.2s ease-in-out infinite 0.2s;
  }
  &-3 {
    height: 10px;
    animation: barPulse 1.2s ease-in-out infinite 0.4s;
  }
}

@keyframes barPulse {
  0%, 100% { opacity: 0.3; transform: scaleY(0.7); }
  50% { opacity: 0.9; transform: scaleY(1); }
}

.empty-title {
  font-size: 80px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -4px;
  background: linear-gradient(135deg, #ef4444 0%, #f97316 50%, #eab308 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-bottom: 12px;
  font-family: 'Inter', 'SF Pro Display', -apple-system, sans-serif;
  animation: titleFloat 4s ease-in-out infinite;
}

@keyframes titleFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

.empty-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  max-width: 340px;

  .error-headline {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-primary);
    line-height: 1.3;
  }

  .error-sub {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.6;
  }
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  margin-top: 8px;
}

.error-detail-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  background: var(--color-bg-container);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
}

.error-detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  color: var(--color-warning-dark);
  line-height: 1.5;

  .error-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    color: var(--color-warning);
    stroke-width: 2;
  }
}

.error-hint-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
  font-size: 13px;
  color: #166534;
  line-height: 1.6;

  .hint-emoji {
    flex-shrink: 0;
    font-size: 14px;
    margin-top: 1px;
  }

  strong {
    font-weight: 600;
    font-family: 'Fira Code', 'Monaco', monospace;
    background: rgba(22, 101, 52, 0.08);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 12px;
  }
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  width: 100%;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  border: 1.5px solid transparent;
  outline: none;

  &:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  &.btn-default {
    background: linear-gradient(135deg, var(--color-primary), var(--color-primary-dark));
    color: white;
    border-color: var(--color-primary);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);

      .refresh-icon {
        transform: rotate(-45deg);
      }
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }

    .refresh-icon.is-spinning {
      animation: spin 0.8s linear infinite;
      transform: none !important;
    }
  }

  &.btn-outline {
    background: var(--color-bg-container);
    color: var(--color-text-secondary);
    border-color: var(--color-border);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);

    &:hover:not(:disabled) {
      background: var(--color-bg-page);
      border-color: var(--color-border-light);
      color: var(--color-text-primary);
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media screen and (max-width: 480px) {
  .empty-title {
    font-size: 64px;
    letter-spacing: -3px;
  }

  .empty-description {
    .error-headline {
      font-size: 16px;
    }
    .error-sub {
      font-size: 13px;
    }
  }

  .action-buttons {
    flex-direction: column;

    .btn {
      width: 100%;
    }
  }

  .error-detail-card {
    padding: 14px 16px;
  }
}
</style>
