<template>
  <t-layout class="app-layout">
    <t-header class="app-header">
      <div class="header-left">
        <div class="logo-wrapper">
          <div class="logo-avatar">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="19" r="12" fill="#FFE8D6" />
              <path d="M8 14L6 4L14 11Z" fill="#FFD1DC" />
              <path d="M28 14L30 4L22 11Z" fill="#FFD1DC" />
              <ellipse cx="14" cy="18" rx="2.5" ry="3" fill="#5D4E60" />
              <ellipse cx="22" cy="18" rx="2.5" ry="3" fill="#5D4E60" />
              <ellipse cx="14.5" cy="17" rx="1" ry="1.2" fill="#fff" />
              <ellipse cx="22.5" cy="17" rx="1" ry="1.2" fill="#fff" />
              <ellipse cx="18" cy="22" rx="1.8" ry="1.2" fill="#FFB5C2" />
              <path d="M16 23.5Q18 26 20 23.5" stroke="#E8A0B0" stroke-width="0.8" fill="none" stroke-linecap="round" />
              <ellipse cx="11" cy="22" rx="3" ry="2" fill="#FFB5C2" opacity="0.35" />
              <ellipse cx="25" cy="22" rx="3" ry="2" fill="#FFB5C2" opacity="0.35" />
            </svg>
          </div>
          <h1 class="app-title">TingStudio</h1>
        </div>
      </div>
      <div class="header-center">
        <t-breadcrumb>
          <t-breadcrumb-item>首页</t-breadcrumb-item>
          <t-breadcrumb-item>{{ pageTitle }}</t-breadcrumb-item>
        </t-breadcrumb>
      </div>
      <div class="header-right">
        <t-space :size="8">
          <t-button variant="text" class="header-button" @click="handleRefresh">
            <template #icon>
              <t-icon name="refresh" />
            </template>
            刷新
          </t-button>
          <t-button variant="text" class="header-button" @click="handleBack" v-if="canGoBack">
            <template #icon>
              <t-icon name="chevron-left" />
            </template>
            返回
          </t-button>
          <t-dropdown :options="userOptions" @click="handleUserMenuClick">
            <t-button variant="text" class="user-button">
              <template #icon>
                <t-icon name="user" />
              </template>
              <span class="username">{{ authStore.user?.username }}</span>
              <t-icon name="chevron-down" size="small" />
            </t-button>
          </t-dropdown>
        </t-space>
      </div>
    </t-header>

    <t-layout>
      <t-aside class="app-aside">
        <div class="menu-header">
          <span class="menu-emoji">♡</span>
          <span class="menu-title">功能导航</span>
        </div>
        <t-menu
          :value="activeMenu"
          :default-value="activeMenu"
          @change="handleMenuChange"
          theme="light"
        >
          <t-menu-item value="/recent-formulas">
            <template #icon>
              <t-icon name="time" size="20px" />
            </template>
            <span class="menu-text">最近配方</span>
          </t-menu-item>
          <t-menu-item value="/formulas">
            <template #icon>
              <t-icon name="layers" size="20px" />
            </template>
            <span class="menu-text">配方管理</span>
          </t-menu-item>
          <t-menu-item value="/materials">
            <template #icon>
              <t-icon name="shop" size="20px" />
            </template>
            <span class="menu-text">原料管理</span>
          </t-menu-item>
          <t-menu-item value="/salesmen">
            <template #icon>
              <t-icon name="usergroup" size="20px" />
            </template>
            <span class="menu-text">业务员管理</span>
          </t-menu-item>
        </t-menu>
      </t-aside>

      <t-content class="app-content">
        <router-view />
      </t-content>
    </t-layout>
  </t-layout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/recent-formulas')) return '/recent-formulas'
  if (path.startsWith('/materials')) return '/materials'
  if (path.startsWith('/formulas')) return '/formulas'
  if (path.startsWith('/salesmen')) return '/salesmen'
  if (path.startsWith('/versions')) return '/formulas'
  if (path.startsWith('/exports')) return '/exports'
  if (path.startsWith('/nutrition')) return '/nutrition'
  if (path.startsWith('/tools')) return '/tools'
  return '/recent-formulas'
})

const pageTitle = computed(() => {
  const path = route.path
  if (path.startsWith('/recent-formulas')) return '最近配方'
  if (path.startsWith('/materials')) return '原料管理'
  if (path.startsWith('/formulas')) return '配方管理'
  if (path.startsWith('/salesmen')) return '业务员管理'
  if (path.startsWith('/versions')) return '版本管理'
  if (path.startsWith('/exports')) return '导出中心'
  if (path.startsWith('/nutrition')) return '营养分析'
  if (path.startsWith('/tools')) return '工具箱'
  return '首页'
})

const canGoBack = computed(() => {
  return route.path !== '/recent-formulas'
})

const userOptions = [
  {
    content: '个人设置',
    value: 'settings',
    prefixIcon: 'setting'
  },
  {
    content: '帮助文档',
    value: 'help',
    prefixIcon: 'help-circle'
  },
  {
    content: '退出登录',
    value: 'logout',
    prefixIcon: 'logout'
  }
]

const handleUserMenuClick = (data: any) => {
  if (data.value === 'logout') {
    authStore.logout()
    MessagePlugin.success('已退出登录~')
    router.push('/login')
  } else if (data.value === 'settings') {
    MessagePlugin.info('设置功能开发中')
  } else if (data.value === 'help') {
    MessagePlugin.info('帮助文档功能开发中')
  }
}

const handleMenuChange = (value: string) => {
  router.push(value)
}

const handleRefresh = () => {
  window.location.reload()
}

const handleBack = () => {
  router.back()
}
</script>

<style scoped lang="scss">
.app-layout {
  height: 100vh;
  background-color: #FFF9F7;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: linear-gradient(135deg, #FF8FAB 0%, #FF6B8A 50%, #E8A0B0 100%);
  box-shadow: 0 2px 12px rgba(255, 107, 138, 0.2);
  height: 64px;

  .header-left {
    display: flex;
    align-items: center;
    flex: 1;

    .logo-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;

      .logo-avatar {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        cursor: pointer;
        transition: transform 0.3s;

        svg {
          width: 28px;
          height: 28px;
        }

        &:hover {
          transform: rotate(10deg) scale(1.05);
        }
      }

      .app-title {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: white;
        letter-spacing: 0.5px;
      }
    }
  }

  .header-center {
    flex: 2;
    display: flex;
    justify-content: center;

    :deep(.t-breadcrumb) {
      color: rgba(255, 255, 255, 0.9);
      font-size: 14px;
    }

    :deep(.t-breadcrumb__item) {
      color: rgba(255, 255, 255, 0.8);

      &:last-child {
        color: white;
        font-weight: 500;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;

    .header-button {
      color: white;
      padding: 8px 16px;
      font-size: 14px;
      transition: all 0.3s;

      :deep(.t-button__icon) {
        color: white;
      }

      &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 10px;
      }
    }

    .user-button {
      color: white;
      padding: 8px 16px;
      font-size: 14px;
      transition: all 0.3s;
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;

      :deep(.t-button__icon) {
        color: white;
      }

      .username {
        margin: 0 4px;
        color: white;
        font-size: 14px;
        font-weight: 500;
      }

      &:hover {
        background-color: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.4);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
    }
  }
}

.app-aside {
  width: 220px;
  background: white;
  border-right: 1px solid #FFE0E8;
  overflow-y: auto;
  box-shadow: 2px 0 8px rgba(255, 107, 138, 0.04);

  .menu-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid #FFF0F3;
    background: linear-gradient(135deg, #FFF9F7 0%, #FFF0F3 100%);

    .menu-emoji {
      font-size: 16px;
      color: #FF6B8A;
    }

    .menu-title {
      font-size: 15px;
      font-weight: 600;
      color: #5D4E60;
    }
  }

  :deep(.t-menu) {
    height: calc(100% - 56px);
    border: none;
    padding: 8px 12px;
  }

  :deep(.t-menu__item) {
    height: 46px;
    line-height: 46px;
    font-size: 14px;
    border-radius: 12px;
    margin-bottom: 4px;
    transition: all 0.3s;
    padding: 0 16px;
    display: flex;
    align-items: center;
  }

  :deep(.t-menu__item .t-icon) {
    margin-right: 10px;
    color: #9B8FA0;
    transition: color 0.3s;
  }

  :deep(.t-menu__item .menu-text) {
    color: #5D4E60;
    font-weight: 500;
    transition: color 0.3s;
  }

  :deep(.t-menu__item:hover) {
    background-color: #FFF0F3;
    transform: translateX(2px);
  }

  :deep(.t-menu__item:hover .t-icon) {
    color: #FF6B8A;
  }

  :deep(.t-menu__item:hover .menu-text) {
    color: #FF6B8A;
  }

  :deep(.t-menu__item.t-menu__item--active) {
    background: linear-gradient(135deg, #FF8FAB 0%, #FF6B8A 100%);
    box-shadow: 0 2px 8px rgba(255, 107, 138, 0.25);
  }

  :deep(.t-menu__item.t-menu__item--active .t-icon) {
    color: white;
  }

  :deep(.t-menu__item.t-menu__item--active .menu-text) {
    color: white;
    font-weight: 600;
  }
}

.app-content {
  padding: 24px;
  overflow-y: auto;
  background-color: #FFF9F7;
}
</style>
