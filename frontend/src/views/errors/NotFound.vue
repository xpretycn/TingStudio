<template>
  <div class="not-found-page">
    <div class="empty-wrapper">
      <div class="empty">
        <div class="empty-header">
          <div class="empty-media" data-variant="icon">
            <div class="icon-container">
              <svg class="ghost-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 22h6c5 0 8-3.5 8-7s-3-7-8-7c-.9 0-1.75.1-2.55.28A4 4 0 1 0 10 12a5 5 0 0 0-2 .42V16a2 2 0 0 1-2 2H4v2h5Z" />
                <path d="M15 11h.01" />
              </svg>
            </div>
          </div>
          <div class="empty-title">404</div>
          <div class="empty-description">
            <span class="desc-main">页面不存在</span>
            <span class="desc-sub">您访问的页面可能已被移动或删除。</span>
          </div>
        </div>

        <div class="empty-content">
          <div class="action-buttons">
            <button class="btn btn-default group" @click="goHome">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="home-icon transition-transform group-hover:scale-110">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Go Home
            </button>

            <button class="btn btn-outline group" @click="goBack">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                class="back-icon transition-transform group-hover:-translate-x-1">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Go Back
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

const goHome = () => {
  router.push('/');
};

const goBack = () => {
  window.history.back();
};
</script>

<style scoped lang="scss">
.not-found-page {
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
      radial-gradient(ellipse 500px 350px at 50% 35%, rgba(59, 130, 246, 0.04) 0%, transparent 70%),
      radial-gradient(ellipse 300px 250px at 25% 80%, rgba(139, 92, 246, 0.03) 0%, transparent 60%);
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
  margin-bottom: 20px;
}

.icon-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 14px;
  background: var(--color-bg-container);
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.06),
    0 1px 2px rgba(15, 23, 42, 0.04),
    inset 0 0 0 1px rgba(15, 23, 42, 0.05);
}

.ghost-icon {
  width: 32px;
  height: 32px;
  color: var(--color-text-placeholder);
  opacity: 0.45;
}

.empty-title {
  font-size: 72px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -3px;
  background: linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
  margin-bottom: 12px;
  font-family: 'Inter', 'SF Pro Display', -apple-system, sans-serif;
}

.empty-description {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 320px;

  .desc-main {
    font-size: 17px;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.4;
  }

  .desc-sub {
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
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  svg {
    flex-shrink: 0;
    transition: transform 0.2s ease;
  }

  &.btn-default {
    background: #18181b;
    color: #fafafa;
    border-color: #18181b;

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 14px rgba(24, 24, 27, 0.25);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &.btn-outline {
    background: var(--color-bg-container);
    color: var(--color-text-secondary);
    border-color: var(--color-border-light);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);

    &:hover {
      background: var(--color-bg-page);
      border-color: var(--color-border);
      color: var(--color-text-primary);
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(15, 23, 42, 0.08);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

@media screen and (max-width: 480px) {
  .empty-title {
    font-size: 60px;
    letter-spacing: -2px;
  }

  .empty-description {
    .desc-main {
      font-size: 15px;
    }
    .desc-sub {
      font-size: 13px;
    }
  }

  .action-buttons {
    flex-direction: column;

    .btn {
      width: 100%;
    }
  }
}
</style>
