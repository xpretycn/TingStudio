<template>
  <div class="mm-body">
    <div class="mm-nav" :class="{ 'mm-nav--collapsed': navCollapsed }">
      <button type="button" class="nav-collapse-btn" @click="navCollapsed = !navCollapsed"
        :title="navCollapsed ? '展开导航' : '折叠导航'" aria-label="切换导航折叠状态">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round"
          :style="{ transform: navCollapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <div v-for="item in navItems" :key="item.value" class="nav-tab"
        :class="{ active: activeNav === item.value }"
        :title="navCollapsed ? item.label : ''" role="tab" tabindex="0"
        @click="activeNav = item.value"
        @keydown.enter="activeNav = item.value">
        <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" v-html="item.iconPath"></svg>
        <span class="nav-tab-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="mm-content">
      <Transition name="content-fade" mode="out-in">
        <div :key="activeNav" class="tab-panel">
          <RoleManage v-if="activeNav === 'roles'" />
          <UserManage v-if="activeNav === 'users'" />
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import RoleManage from './RoleManage.vue'
import UserManage from './UserManage.vue'

type NavKey = 'roles' | 'users'
const activeNav = ref<NavKey>('roles')
const navCollapsed = ref(false)

const navItems: { value: NavKey; label: string; iconPath: string }[] = [
  { value: 'roles', label: '角色管理', iconPath: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
  { value: 'users', label: '用户管理', iconPath: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
]
</script>

<style lang="scss" scoped>
@use "@/assets/styles/variables.scss" as *;

.mm-body {
  display: flex;
  gap: 0;
  min-height: 480px;
}

.mm-nav {
  width: 170px;
  flex-shrink: 0;
  padding: 24px 12px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;

  &--collapsed {
    width: 56px;
    padding: 24px var(--space-1-5);

    .nav-tab {
      justify-content: center;
      padding: 12px 0;

      .nav-tab-icon {
        width: 24px;
        height: 24px;
      }

      .nav-tab-label {
        display: none;
      }
    }

    .nav-collapse-btn {
      margin: 0 auto 12px auto;
      width: 36px;
      height: 36px;
    }
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: var(--space-2-5);
    padding: 12px 16px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--color-text-secondary);
    font-size: 14px;
    font-weight: 500;
    border: 1px solid transparent;
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;

    .nav-tab-icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover {
      background: #f1f5f9;
      color: var(--color-text-primary);
    }

    &.active {
      background: linear-gradient(
        135deg,
        var(--color-primary),
        var(--color-primary-dark)
      );
      color: white;
      box-shadow: 0 4px 12px $overlay-emerald-25;
      border-color: transparent;
      font-weight: 600;
    }

    .nav-tab-label {
      flex: 1;
      transition: opacity 0.2s ease;
    }
  }

  .nav-collapse-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 12px;
    color: var(--color-text-placeholder);

    &:hover {
      background: #f1f5f9;
      color: var(--color-text-secondary);
      border-color: #cbd5e1;
    }
  }
}

.mm-content {
  flex: 1;
  min-width: 0;
  padding: 24px var(--space-7);
  border-left: 1px solid #f1f5f9;
}

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.2s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .mm-body {
    flex-direction: column;
  }

  .mm-nav {
    width: 100% !important;
    flex-direction: row;
    padding: 8px;
    overflow-x: auto;
    border-bottom: 1px solid #f1f5f9;

    .nav-collapse-btn {
      display: none;
    }

    .nav-tab {
      padding: 8px 12px;
      margin-bottom: 0;
      margin-right: 4px;

      .nav-tab-icon {
        width: 16px;
        height: 16px;
      }

      .nav-tab-label {
        font-size: 13px;
      }
    }
  }

  .mm-content {
    padding: 16px;
    border-left: none;
  }
}
</style>
