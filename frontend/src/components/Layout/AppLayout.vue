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
  background-color: $bg-page;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 $space-6;
  background: $gradient-brand;
  box-shadow: $shadow-header;
  height: $header-height;

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
        border-radius: $radius-circle;
        background: $overlay-white-25;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(4px);
        cursor: pointer;
        transition: transform $transition-normal;

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
        font-size: $font-size-h2;
        font-weight: $font-weight-bold;
        color: $text-white;
        letter-spacing: 0.5px;
      }
    }
  }

  .header-center {
    flex: 2;
    display: flex;
    justify-content: center;

    :deep(.t-breadcrumb) {
      color: $text-white-80;
      font-size: $font-size-body;
    }

    :deep(.t-breadcrumb__item) {
      color: $text-white-80;

      &:last-child {
        color: $text-white;
        font-weight: $font-weight-medium;
      }
    }
  }

  .header-right {
    display: flex;
    align-items: center;

    .header-button {
      color: $text-white;
      padding: $space-2 $space-4;
      font-size: $font-size-body;
      transition: all $transition-normal;

      :deep(.t-button__icon) {
        color: $text-white;
      }

      &:hover {
        background-color: $overlay-white-20;
        border-radius: $radius-lg;
      }
    }

    .user-button {
      color: $text-white;
      padding: $space-2 $space-4;
      font-size: $font-size-body;
      transition: all $transition-normal;
      border: 1px solid $overlay-white-30;
      border-radius: $radius-pill;

      :deep(.t-button__icon) {
        color: $text-white;
      }

      .username {
        margin: 0 $space-1;
        color: $text-white;
        font-size: $font-size-body;
        font-weight: $font-weight-medium;
      }

      &:hover {
        background-color: $overlay-white-20;
        border-color: $overlay-white-40;
        box-shadow: $shadow-float;
      }
    }
  }
}

.app-aside {
  width: $aside-width;
  background: $bg-container;
  border-right: 1px solid $border-color;
  overflow-y: auto;
  box-shadow: $shadow-aside;

  .menu-header {
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-4 $space-5;
    border-bottom: 1px solid $border-color-light;
    background: $bg-sidebar-header;

    .menu-emoji {
      font-size: $font-size-body;
      color: $brand-primary;
    }

    .menu-title {
      font-size: $font-size-body-sm;
      font-weight: $font-weight-semibold;
      color: $text-primary;
    }
  }

  :deep(.t-menu) {
    height: calc(100% - 56px);
    border: none;
    padding: $space-2 $space-3;
  }

  :deep(.t-menu__item) {
    height: $menu-item-height;
    line-height: $menu-item-height;
    font-size: $font-size-body;
    border-radius: $menu-item-radius;
    margin-bottom: $space-1;
    transition: all $transition-normal;
    padding: 0 $space-4;
    display: flex;
    align-items: center;
  }

  :deep(.t-menu__item .t-icon) {
    margin-right: 10px;
    color: $text-secondary;
    transition: color $transition-normal;
  }

  :deep(.t-menu__item .menu-text) {
    color: $text-primary;
    font-weight: $font-weight-medium;
    transition: color $transition-normal;
  }

  :deep(.t-menu__item:hover) {
    background-color: $bg-hover;
    transform: translateX(2px);
  }

  :deep(.t-menu__item:hover .t-icon) {
    color: $brand-primary;
  }

  :deep(.t-menu__item:hover .menu-text) {
    color: $brand-primary;
  }

  :deep(.t-menu__item.t-menu__item--active) {
    background: $gradient-btn;
    box-shadow: $shadow-brand;
  }

  :deep(.t-menu__item.t-menu__item--active .t-icon) {
    color: $text-white;
  }

  :deep(.t-menu__item.t-menu__item--active .menu-text) {
    color: $text-white;
    font-weight: $font-weight-semibold;
  }
}

.app-content {
  padding: $content-padding;
  overflow-y: auto;
  background-color: $bg-page;
}
</style>
