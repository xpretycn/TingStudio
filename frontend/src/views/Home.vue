<template>
  <div class="home-page" :class="{ collapsed: sidebarCollapsed }">
    <!-- 跳到主要内容（仅键盘/屏幕阅读器可见） -->
    <a href="#main-content" class="skip-link">跳到主要内容</a>
    <!-- 移动端遮罩层 -->
    <Transition name="drawer-fade">
      <div v-if="mobileDrawerOpen" class="mobile-overlay" @click="closeMobileDrawer" />
    </Transition>
    <!-- 左侧导航功能区 -->
    <aside class="left-sidebar" :class="{ 'mobile-drawer-open': mobileDrawerOpen }" aria-label="主导航">
      <!-- Logo - 固定顶部 -->
      <div class="sidebar-top" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-logo" @click="toggleSidebarCollapse" title="折叠/展开侧边栏">
          <div class="logo-cat" aria-hidden="true">
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
          <h1 v-show="!sidebarCollapsed" class="logo-text">TingStudio</h1>
          <t-icon v-show="sidebarCollapsed" name="menu-unfold" size="18px" class="collapse-expand-icon"
            @click.stop="toggleSidebarCollapse" />
        </div>

        <!-- 日期和天气信息卡片（参照 index.html 设计） -->
        <div v-show="!sidebarCollapsed" class="sidebar-info-card">
          <div class="info-card-inner">
            <!-- 左侧：日期 -->
            <div class="info-card-date">
              <p class="info-card-day">{{ currentDay }}</p>
              <p class="info-card-meta">{{ currentDate }} · {{ currentWeekday }}</p>
            </div>
            <!-- 右侧：天气（右对齐，图标+文字在上，温度+城市在下） -->
            <div class="info-card-weather">
              <template v-if="weatherStore.loading || weatherStore.geoLoading">
                <t-loading size="small" />
              </template>
              <template v-else>
                <!-- 上行：图标 + 天气描述 -->
                <div class="weather-top-row">
                  <span class="weather-icon-text">{{ weatherStore.weatherEmoji }}</span>
                  <span class="weather-status">{{ weatherStore.weatherText }}</span>
                  <button class="weather-refresh-btn" :class="{ 'is-refreshing': weatherStore.loading }"
                    :disabled="weatherStore.loading || weatherStore.geoLoading" title="刷新天气"
                    @click.stop="handleRefreshWeather">
                    <svg class="refresh-svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                  </button>
                </div>
                <!-- 下行：温度 + 城市 -->
                <p class="weather-bottom">{{ weatherStore.temperature }}°C · {{ weatherStore.cityName }}</p>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- 可滚动导航区域 -->
      <nav class="sidebar-nav" :class="{ collapsed: sidebarCollapsed }" aria-label="侧边栏导航">
        <div v-show="!sidebarCollapsed" class="nav-header" @click="toggleNav">
          <t-icon name="menu-fold" size="16px" class="nav-icon" />
          <span class="nav-title">功能导航</span>
          <span class="nav-toggle" :class="{ expanded: navExpanded }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        <div class="nav-content" :class="{ expanded: navExpanded || sidebarCollapsed }" role="menubar">
          <div v-for="item in navItems" :key="item.path" class="nav-item" :class="{ active: activePath === item.path }"
            role="menuitem" tabindex="0" :aria-current="activePath === item.path ? 'page' : undefined"
            :title="sidebarCollapsed ? item.label : undefined" @click="navigateTo(item.path)"
            @keydown="handleNavKeydown($event, item.path)">
            <div class="nav-item-icon" aria-hidden="true"><t-icon :name="item.icon" size="18px" /></div>
            <span v-show="!sidebarCollapsed" class="nav-item-text">{{ item.label }}</span>
            <div v-show="!sidebarCollapsed" class="nav-item-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>
      </nav>

      <!-- 新用户引导卡片 -->
      <div v-if="showGuideCard && !sidebarCollapsed" class="sidebar-guide">
        <div class="guide-header">
          <span class="guide-icon">🚀</span>
          <span class="guide-title">快速开始</span>
          <span class="guide-close" role="button" tabindex="0" aria-label="关闭引导" @click="dismissGuide"
            @keydown.enter="dismissGuide">&times;</span>
        </div>
        <div class="guide-steps">
          <div v-for="(step, index) in guideSteps" :key="index" class="guide-step"
            :class="{ active: guideStep === index, done: guideStep > index }" @click="handleGuideStep(index)">
            <div class="step-number">{{ guideStep > index ? '✓' : index + 1 }}</div>
            <span class="step-text">{{ step.label }}</span>
            <svg class="step-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>
        <div class="guide-action">
          <t-button theme="primary" size="small" @click="handleStartGuide">
            <template #icon><t-icon name="chevron-right" /></template>开始引导
          </t-button>
        </div>
      </div>
    </aside>

    <!-- 右侧内容展示区（hideHeader 页面移除顶部间距） -->
    <div class="right-content" :class="{ 'no-top-padding': route.meta.hideHeader }">
      <header v-if="!route.meta.hideHeader" class="content-header" role="banner">
        <!-- 左侧导航功能区 -->
        <div class="header-left">
          <!-- 移动端汉堡菜单 -->
          <button class="mobile-menu-btn" aria-label="打开菜单" @click="openMobileDrawer">
            <t-icon name="menu-fold" size="20px" />
          </button>
          <span class="title-icon" aria-hidden="true"><t-icon :name="pageIcon" size="20px" /></span>
          <div class="header-title-area">
            <t-breadcrumb max-item-width="200" separator=">" class="content-breadcrumb">
              <t-breadcrumb-item v-for="crumb in breadcrumbs" :key="crumb.path"
                @click="crumb.path && router.push(crumb.path)">
                {{ crumb.title }}
              </t-breadcrumb-item>
              <t-breadcrumb-item class="breadcrumb-current"
                :style="breadcrumbs.length > 0 ? { color: '#10B981' } : {}">{{
                  pageTitle }}</t-breadcrumb-item>
            </t-breadcrumb>
          </div>
        </div>
        <!-- 右侧操作区 -->
        <div class="header-actions">
          <!-- 圆形导航按钮组 -->
          <div class="header-nav-buttons">
            <button class="nav-circle-btn" title="后退" @click="handleGoBack">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
            <button class="nav-circle-btn" title="前进" @click="handleGoForward">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
            <button class="nav-circle-btn" title="刷新" @click="handleRefresh">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
            <!-- 锁屏按钮（圆形） -->
            <button class="nav-circle-btn" title="锁屏" @click="handleLock">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </button>
          </div>
          <!-- 用户区 -->
          <div class="header-user-section" style="margin-left: 8px;">
            <t-popup placement="bottom-right" trigger="hover" :visible="userMenuVisible"
              @visible-change="(v: boolean) => userMenuVisible = v">
              <div class="user-avatar-wrapper" role="button" tabindex="0" aria-haspopup="true"
                :aria-expanded="userMenuVisible" @keydown.enter="userMenuVisible = !userMenuVisible">
                <div class="user-avatar-wrap">
                  <img loading="lazy" class="user-avatar-img" :src="authStore.user?.avatar || '/avatar-default.jpg'"
                    :alt="authStore.user?.username || '用户'" />
                </div>
                <span class="user-display-name">{{ authStore.user?.username || '用户' }}</span>
                <svg class="user-avatar-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <template #content>
                <div class="user-menu-popup" role="menu">
                  <!-- 账号设置 -->
                  <div class="user-menu-item" role="menuitem" tabindex="0" @click="handleUserMenuClick('settings')"
                    @keydown.enter="handleUserMenuClick('settings')">
                    <t-icon name="setting" size="16px" />
                    <span>账号设置</span>
                  </div>

                  <!-- 切换外观（hover 子菜单） -->
                  <t-popup placement="right-top" trigger="hover">
                    <div class="user-menu-item user-menu-item--has-sub" role="menuitem" aria-haspopup="true">
                      <t-icon name="browse" size="16px" />
                      <span>切换外观</span>
                      <svg class="submenu-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                    <template #content>
                      <div class="user-submenu-popup" role="menu">
                        <div v-for="opt in themeModeOptions" :key="opt.value"
                          :class="['user-submenu-item', { active: themeStore.mode === opt.value }]" role="menuitem"
                          tabindex="0" @click="handleThemeSelect(opt.value)"
                          @keydown.enter="handleThemeSelect(opt.value)">
                          <t-icon :name="opt.icon" size="16px" />
                          <span>{{ opt.label }}</span>
                          <svg v-if="themeStore.mode === opt.value" class="check-icon" width="14" height="14"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                    </template>
                  </t-popup>

                  <!-- 切换品牌色（hover 子菜单） -->
                  <t-popup placement="right-top" trigger="hover">
                    <div class="user-menu-item user-menu-item--has-sub" role="menuitem" aria-haspopup="true">
                      <t-icon name="palette" size="16px" />
                      <span>切换品牌色</span>
                      <svg class="submenu-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </div>
                    <template #content>
                      <div class="user-submenu-popup" role="menu">
                        <div v-for="opt in brandColorOptions" :key="opt.value"
                          :class="['user-submenu-item', { active: themeStore.brandColor === opt.value }]"
                          role="menuitem" tabindex="0" @click="handleBrandSelect(opt.value)"
                          @keydown.enter="handleBrandSelect(opt.value)">
                          <span class="color-dot" :style="{ background: opt.dot }" />
                          <span>{{ opt.label }}</span>
                          <svg v-if="themeStore.brandColor === opt.value" class="check-icon" width="14" height="14"
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
                            stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </div>
                      </div>
                    </template>
                  </t-popup>

                  <!-- 切换账号 -->
                  <div class="user-menu-item" role="menuitem" tabindex="0" @click="handleUserMenuClick('switchAccount')"
                    @keydown.enter="handleUserMenuClick('switchAccount')">
                    <t-icon name="usergroup" size="16px" />
                    <span>切换账号</span>
                  </div>

                  <!-- 退出登录 -->
                  <div class="user-menu-item user-menu-item--danger" role="menuitem" tabindex="0"
                    @click="handleUserMenuClick('logout')" @keydown.enter="handleUserMenuClick('logout')">
                    <t-icon name="poweroff" size="16px" />
                    <span>退出登录</span>
                  </div>
                </div>
              </template>
            </t-popup>
          </div>
        </div>
      </header>
      <main id="main-content" class="content-body">
        <!-- 页面内容 -->
        <div class="content-main">
          <router-view v-slot="{ Component }">
            <transition :name="transitionName" mode="out-in">
              <component v-if="Component" :is="Component" :key="contentRefreshKey + route.fullPath" />
            </transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useFormulaStore } from '@/stores/formula';
import { useMaterialStore } from '@/stores/material';
import { useSalesmanStore } from '@/stores/salesman';
import { useThemeStore } from '@/stores/theme';
import { useWeatherStore } from '@/stores/weather';
import { brandColorDots, brandColorLabels } from '@/assets/styles/tokens';
import type { BrandColor } from '@/stores/theme';
import { MessagePlugin } from 'tdesign-vue-next';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const formulaStore = useFormulaStore();
const materialStore = useMaterialStore();
const salesmanStore = useSalesmanStore();
const themeStore = useThemeStore();
const weatherStore = useWeatherStore();

// 品牌色选项
const brandColorOptions: Array<{ value: BrandColor; label: string; dot: string; }> = [
  { value: 'pink', label: brandColorLabels.pink, dot: brandColorDots.pink },
  { value: 'yellow', label: brandColorLabels.yellow, dot: brandColorDots.yellow },
  { value: 'blue', label: brandColorLabels.blue, dot: brandColorDots.blue },
  { value: 'green', label: brandColorLabels.green, dot: brandColorDots.green },
];

const themeModeLabels: Record<string, string> = {
  auto: '跟随系统',
  light: '亮色模式',
  dark: '暗色模式',
};

const navExpanded = ref(true);
const sidebarCollapsed = ref(false);
const mobileDrawerOpen = ref(false);
const contentRefreshKey = ref(0);
const activePath = computed(() => {
  const path = route.path;
  // 按最长前缀匹配，优先精确匹配，再按路径段前缀匹配
  const pathMap = [
    '/formulas', '/materials', '/salesmen',
    '/exports', '/nutrition', '/tools', '/ai-assistant'
  ];
  for (const key of pathMap) {
    if (path === key || path.startsWith(key + '/')) return key;
  }
  // /versions/* 归属配方管理
  if (path.includes('/versions')) return '/formulas';
  return path;
});

// 用户下拉菜单
const userMenuVisible = ref(false);
// 主题模式选项
const themeModeOptions = [
  { value: 'auto' as const, label: '跟随系统', icon: 'laptop' },
  { value: 'light' as const, label: '亮色模式', icon: 'browse' },
  { value: 'dark' as const, label: '暗色模式', icon: 'browse' },
] as const;

// 选择主题模式
const handleThemeSelect = (mode: 'auto' | 'light' | 'dark') => {
  themeStore.setMode(mode);
  MessagePlugin.success(`已切换为${themeModeLabels[mode]}`);
};

// 选择品牌色
const handleBrandSelect = (color: BrandColor) => {
  themeStore.setBrandColor(color);
  MessagePlugin.success(`品牌色已切换为${brandColorLabels[color]}`);
};

// 用户菜单点击（保留 settings / switchAccount / logout）
const handleUserMenuClick = (value: string) => {
  userMenuVisible.value = false;
  switch (value) {
    case 'settings':
      router.push('/settings');
      break;
    case 'switchAccount':
      handleLogout();
      break;
    case 'logout':
      handleLogout();
      break;
  }
};




// 页面图标映射
const pageIcon = computed(() => {
  const iconMap: Record<string, string> = {
    '/formulas': 'edit',
    '/materials': 'chart-bar',
    '/salesmen': 'usergroup',
    '/exports': 'download',
    '/nutrition': 'chart-pie',
    '/tools': 'setting',
    '/ai-assistant': 'precise-monitor',
    '/settings': 'user-circle'
  };
  if (iconMap[route.path]) return iconMap[route.path];
  for (const key of Object.keys(iconMap)) {
    if (route.path.startsWith(key)) return iconMap[key];
  }
  if (route.path.includes('/versions')) return 'list';
  return 'home';
});

// 导航菜单项
const navItems = [
  { path: '/ai-assistant', label: 'AI 助手', icon: 'precise-monitor' },
  { path: '/formulas', label: '配方管理', icon: 'edit' },
  { path: '/materials', label: '原材管理', icon: 'chart-bar' },
  { path: '/salesmen', label: '业务员管理', icon: 'usergroup' },
  { path: '/exports', label: '导出中心', icon: 'download' },
  { path: '/nutrition', label: '营养分析', icon: 'chart-pie' },
  { path: '/tools', label: '工具箱', icon: 'setting' },
];

// 日期和星期
const currentDate = ref('');
const currentWeekday = ref('');
const currentDay = ref('');

// 页面标题 — 优先使用 route.meta.title
const pageTitle = computed(() => {
  const meta = route.meta?.title as string | undefined;
  if (meta) return meta;
  const titleMap: Record<string, string> = {
    '/formulas': '配方管理',
    '/materials': '原料管理',
    '/salesmen': '业务员管理',
    '/exports': '导出中心',
    '/nutrition': '营养分析',
    '/tools': '工具箱',
    '/ai-assistant': 'AI 助手',
    '/settings': '账号设置'
  };
  for (const [key, value] of Object.entries(titleMap)) {
    if (route.path === key || route.path.startsWith(key + '/')) return value;
  }
  if (route.path.includes('/versions')) return '版本管理';
  return '欢迎';
});

// 切换导航栏展开状态
const toggleNav = () => {
  navExpanded.value = !navExpanded.value;
};

// 切换侧边栏折叠
const toggleSidebarCollapse = () => {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  if (sidebarCollapsed.value) {
    navExpanded.value = true; // 折叠时自动展开导航列表
  }
};

// 移动端抽屉模式
const openMobileDrawer = () => {
  mobileDrawerOpen.value = true;
};
const closeMobileDrawer = () => {
  mobileDrawerOpen.value = false;
};

// 面包屑 — 根据当前路由路径构建层级
const breadcrumbs = computed(() => {
  const path = route.path;

  // 列表页无父级，不需要面包屑
  const listPaths = [
    '/formulas', '/materials', '/salesmen',
    '/exports', '/nutrition', '/tools', '/ai-assistant', '/settings'
  ];
  if (listPaths.includes(path)) return [];

  // 面包屑层级定义：子页面 → 父页面（列表页）
  // pathToParent 返回可导航的父路径和标题
  const parentMap: Record<string, string> = {
    // 原料子页面
    '/materials/new': '/materials',
    // 配方子页面
    '/formulas/new': '/formulas',
    // 业务员子页面
    '/salesmen/new': '/salesmen',
  };

  // 前缀匹配的父级
  const prefixParents: Array<{ prefix: string; parentPath: string; parentTitle: string; }> = [
    { prefix: '/materials/', parentPath: '/materials', parentTitle: '原料管理' },
    { prefix: '/formulas/', parentPath: '/formulas', parentTitle: '配方管理' },
    { prefix: '/salesmen/', parentPath: '/salesmen', parentTitle: '业务员管理' },
    { prefix: '/versions/', parentPath: '/formulas', parentTitle: '配方管理' },
    { prefix: '/nutrition/profiles', parentPath: '/nutrition', parentTitle: '营养分析' },
  ];

  // 版本页面需要二级面包屑：配方管理 > 版本管理
  if (path.startsWith('/versions/')) {
    return [
      { title: '配方管理', path: '/formulas' },
    ];
  }

  // 营养标准页面：营养分析 > 营养标准
  if (path === '/nutrition/profiles') {
    return [
      { title: '营养分析', path: '/nutrition' },
    ];
  }

  // 精确匹配
  if (parentMap[path]) {
    const parentPath = parentMap[path];
    const parentTitle = listPaths.includes(parentPath)
      ? (navItems.find(n => n.path === parentPath)?.label || '')
      : '';
    return parentTitle ? [{ title: parentTitle, path: parentPath }] : [];
  }

  // 前缀匹配（如 /materials/123, /formulas/123, /formulas/123/edit）
  for (const { prefix, parentPath, parentTitle } of prefixParents) {
    if (path.startsWith(prefix) && path !== parentPath) {
      // 跳过营养分析本身（已归入 listPaths）
      if (parentPath === '/nutrition' && path === '/nutrition') continue;
      return [{ title: parentTitle, path: parentPath }];
    }
  }

  return [];
});

// 路由过渡方向感知
const transitionName = ref('fade-slide');
watch(() => route.path, (to, from) => {
  if (!from) { transitionName.value = 'fade-slide'; return; }
  // 列表→详情/新建/编辑 → slide-left
  const detailPattern = /\/(new|\d+|edit)$/;
  const toIsDetail = detailPattern.test(to);
  const fromIsDetail = detailPattern.test(from);
  if (toIsDetail && !fromIsDetail) {
    transitionName.value = 'slide-left';
  } else if (!toIsDetail && fromIsDetail) {
    transitionName.value = 'slide-right';
  } else {
    transitionName.value = 'fade-slide';
  }
});

// 导航到指定路径
const navigateTo = (path: string) => {
  router.push(path);
  if (mobileDrawerOpen.value) closeMobileDrawer();
};

// 刷新子页面（只刷新右侧内容区域）
const handleRefresh = () => {
  contentRefreshKey.value++;
};

// 刷新天气
const handleRefreshWeather = async () => {
  if (weatherStore.loading || weatherStore.geoLoading) return;
  await weatherStore.refresh();
};

// 后退 — 返回上一级列表页
const handleGoBack = () => {
  const path = route.path;
  if (path === '/formulas/new') {
    router.push('/formulas');
  } else if (path.startsWith('/formulas/') && path !== '/formulas') {
    router.push('/formulas');
  } else if (path === '/materials/new') {
    router.push('/materials');
  } else if (path.startsWith('/materials/') && path !== '/materials') {
    router.push('/materials');
  } else {
    router.back();
  }
};

// 前进
const handleGoForward = () => {
  router.forward();
};

// 处理退出登录
const handleLogout = () => {
  authStore.logout();
  MessagePlugin.success('已退出登录~');
  router.push('/login');
};

// 处理锁屏
const handleLock = () => {
  MessagePlugin.info('锁屏功能开发中');
};

// ─── 新用户引导 ───
const GUIDE_DISMISSED_KEY = 'ting-guide-dismissed';
const guideStep = ref(0);
const guideSteps = [
  { label: '录入原料库', path: '/materials' },
  { label: '创建配方', path: '/formulas/new' },
  { label: '分析营养成分', path: '/nutrition' },
];

const showGuideCard = computed(() => {
  if (localStorage.getItem(GUIDE_DISMISSED_KEY)) return false;
  return formulaStore.formulas.length === 0 &&
    materialStore.materials.length === 0 &&
    salesmanStore.salesmen.length === 0;
});

const dismissGuide = () => {
  localStorage.setItem(GUIDE_DISMISSED_KEY, '1');
  guideStep.value = 0;
};

const handleGuideStep = (index: number) => {
  router.push(guideSteps[index].path);
  guideStep.value = index + 1;
};

const handleStartGuide = () => {
  handleGuideStep(0);
};

// 更新日期信息
const updateDateInfo = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  currentDay.value = day;
  currentDate.value = `${month}月`;
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  currentWeekday.value = weekdays[now.getDay()];
};



// ─── 键盘导航 ───
const handleNavKeydown = (e: KeyboardEvent, path: string) => {
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      navigateTo(path);
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      e.preventDefault();
      focusNextNavItem(e.target as HTMLElement);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      e.preventDefault();
      focusPrevNavItem(e.target as HTMLElement);
      break;
    case 'Home':
      e.preventDefault();
      focusFirstNavItem();
      break;
    case 'End':
      e.preventDefault();
      focusLastNavItem();
      break;
  }
};

const focusNextNavItem = (current: HTMLElement) => {
  const items = current.parentElement?.querySelectorAll<HTMLElement>('[role="menuitem"]');
  if (!items) return;
  const idx = Array.from(items).indexOf(current);
  const next = items[(idx + 1) % items.length];
  next?.focus();
};

const focusPrevNavItem = (current: HTMLElement) => {
  const items = current.parentElement?.querySelectorAll<HTMLElement>('[role="menuitem"]');
  if (!items) return;
  const idx = Array.from(items).indexOf(current);
  const prev = items[(idx - 1 + items.length) % items.length];
  prev?.focus();
};

const focusFirstNavItem = () => {
  const first = document.querySelector<HTMLElement>('[role="menuitem"]');
  first?.focus();
};

const focusLastNavItem = () => {
  const items = document.querySelectorAll<HTMLElement>('[role="menuitem"]');
  const last = items[items.length - 1];
  last?.focus();
};

onMounted(() => {
  updateDateInfo();
  weatherStore.init();

  // Ctrl+B 切换侧边栏折叠
  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'b') {
      e.preventDefault();
      toggleSidebarCollapse();
    }
  });
});
</script>

<style scoped lang="scss">
// ═══════════════════════════════════════
//  HOME PAGE — 禁止滚动，撑满视口
// ═══════════════════════════════════════
.home-page {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: #F8FAFC; // slate-50 — 匹配参考设计整体背景色
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

// ═══════════════════════════════════════
//  LEFT SIDEBAR — flex 纵向三段布局
// ═══════════════════════════════════════
.left-sidebar {
  width: 220px;
  max-width: 220px;
  min-width: 220px;
  flex: 0 0 220px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: $bg-container;
  border-radius: 0;
  position: relative;
  overflow: hidden;
  border-right: 1px solid #F1F5F9; // slate-100 — 匹配参考设计 aside 右边框
  box-shadow: $shadow-elevation-1;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1),
    flex-basis 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  >* {
    position: relative;
    z-index: 1;
  }
}

// ─── sidebar-top：Logo + 用户 + 日期天气（固定顶部）───
.sidebar-top {
  flex-shrink: 0;
  padding: 16px 14px 12px;
}

// Logo
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid $border-color-light;

  .logo-cat {
    width: 38px;
    height: 38px;
    flex-shrink: 0;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 4px 12px var(--overlay-brand-15));
      animation: catBounce 4s ease-in-out infinite;
    }
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: $text-primary;
    margin: 0;
    letter-spacing: 0.5px;
  }
}

@keyframes catBounce {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-5px);
  }
}

// ─── 日期 & 天气信息卡片（参照 index.html 设计：左日期右天气）───
.sidebar-info-card {
  flex-shrink: 0;
  margin-bottom: 12px;
  background: var(--color-primary-dark);
  border-radius: 16px;
  padding: 16px;
  color: #fff;
  position: relative;
  overflow: hidden;

  .info-card-inner {
    position: relative;
    z-index: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  // ─── 左侧日期 ──
  .info-card-date {
    .info-card-day {
      font-size: 24px;
      font-weight: 700;
      line-height: 1;
      color: #fff;
    }

    .info-card-meta {
      font-size: 12px;
      opacity: 0.7;
      margin-top: 4px;
    }
  }

  // ─── 右侧天气（右对齐，与参考设计一致）───
  .info-card-weather {
    text-align: right;

    // 上行：图标 + 天气文字 + 刷新按钮（flex 右对齐）
    .weather-top-row {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      margin-bottom: 2px;

      .weather-icon-text {
        font-size: 16px;
        line-height: 1;
      }

      .weather-status {
        font-size: 13px;
        font-weight: 500;
      }
    }

    // 下行：温度 · 城市（小字半透明，与参考设计一致）
    .weather-bottom {
      font-size: 12px;
      opacity: 0.7;
      margin: 0;
      white-space: nowrap;
    }

    // ─── 刷新按钮（精致小巧，融入设计）───
    @keyframes refresh-spin {
      from {
        transform: rotate(0deg);
      }

      to {
        transform: rotate(360deg);
      }
    }

    .weather-refresh-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border: none;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.12);
      color: rgba(255, 255, 255, 0.75);
      cursor: pointer;
      transition: all $transition-normal;

      &:hover {
        background: rgba(255, 255, 255, 0.25);
        color: #fff;
        transform: rotate(90deg);
      }

      &:active {
        transform: scale(0.88) rotate(90deg);
      }

      &:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      &.is-refreshing {
        pointer-events: none;

        .refresh-svg {
          animation: refresh-spin 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
        }
      }

      .refresh-svg {
        width: 12px;
        height: 12px;
        transition: transform 0.3s ease;
      }
    }
  }
}

// ─── sidebar-nav：可滚动导航区域 ───
.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 14px;

  &,
  * {
    scrollbar-width: thin !important;
    scrollbar-color: #10b981 transparent !important;
  }

  &::-webkit-scrollbar,
  *::-webkit-scrollbar {
    width: 5px !important;
    height: 5px !important;
  }

  &::-webkit-scrollbar-track,
  *::-webkit-scrollbar-track {
    background: transparent !important;
  }

  &::-webkit-scrollbar-thumb,
  *::-webkit-scrollbar-thumb {
    background: #10b981 !important;
    border-radius: 3px !important;

    &:hover {
      background: #059669 !important;
    }
  }

  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    background: $bg-page;
    border-radius: 8px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: all $transition-slow;
    border: 1px solid $border-color-light;

    &:hover {
      box-shadow: $shadow-xs;
    }

    .nav-icon {
      color: $text-primary;
      flex-shrink: 0;
    }

    .nav-title {
      font-size: 13px;
      font-weight: 600;
      color: $text-primary;
      flex: 1;
      margin-left: 6px;
    }

    .nav-toggle {
      color: $text-primary;
      transition: transform 0.3s;

      &.expanded {
        transform: rotate(180deg);
      }

      svg {
        width: 14px;
        height: 14px;
      }
    }
  }

  .nav-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1);

    &.expanded {
      max-height: 500px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      background: $bg-page;
      border-radius: 8px;
      cursor: pointer;
      transition: all $transition-fast;
      border: 1px solid transparent;

      &:hover {
        background: $bg-container;
        border-color: $border-color-light;
        box-shadow: $shadow-xs;
      }

      &:focus-visible {
        background: $bg-page;
        border-radius: 8px;
        outline: none;
      }

      &.active {
        background: linear-gradient(135deg, var(--color-primary-light), var(--color-primary));
        color: white;
        box-shadow: var(--shadow-brand-sm);
        border-color: transparent;

        .nav-item-icon {
          color: white;
        }

        .nav-item-arrow {
          color: white;
          transform: translateX(4px);
        }

        .nav-item-text {
          color: white;
          font-weight: 600;
        }
      }

      .nav-item-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        color: var(--color-primary-light);
      }

      .nav-item-text {
        flex: 1;
        font-size: 13px;
        color: $text-primary;
        font-weight: 500;
      }

      .nav-item-arrow {
        color: $text-secondary;
        transition: all $transition-slow;

        svg {
          width: 12px;
          height: 12px;
        }
      }
    }
  }
}

// ─── 新用户引导卡片（Level 2 玻璃态） ───
.sidebar-guide {
  flex-shrink: 0;
  margin: 0 18px 16px;
  padding: 14px;
  background: $overlay-white-60;
  backdrop-filter: blur(10px);
  border-radius: 14px;
  border: 1px solid var(--overlay-brand-lighter-15);
  box-shadow: 0 4px 16px var(--overlay-brand-10);

  .guide-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .guide-icon {
      font-size: 18px;
    }

    .guide-title {
      flex: 1;
      font-size: 13px;
      font-weight: 700;
      color: $text-primary;
    }

    .guide-close {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 14px;
      color: $text-secondary;
      cursor: pointer;
      transition: all $transition-fast;

      &:hover {
        background: var(--overlay-brand-15);
        color: var(--color-primary);
      }
    }
  }

  .guide-steps {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;

    .guide-step {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      transition: all $transition-fast;
      border: 1px solid transparent;

      &:hover {
        background: var(--overlay-brand-bg-60);
        border-color: var(--color-primary-lightest);
      }

      &.active {
        background: linear-gradient(135deg, var(--color-primary-lighter), var(--color-primary-light));

        .step-number {
          background: white;
          color: var(--color-primary);
        }

        .step-text {
          color: white;
          font-weight: 600;
        }

        .step-arrow {
          color: white;
        }
      }

      &.done .step-number {
        background: $chart-progress-good;
        color: white;
      }

      .step-number {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: var(--color-primary-bg);
        color: var(--color-primary);
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .step-text {
        flex: 1;
        font-size: 12px;
        color: $text-primary;
        font-weight: 500;
      }

      .step-arrow {
        color: $text-secondary;
        flex-shrink: 0;
      }
    }
  }

  .guide-action {
    :deep(.t-button) {
      width: 100%;
    }
  }
}

// ═══════════════════════════════════════
//  RIGHT CONTENT — 与 index.html main 区域一致
// ═══════════════════════════════════════
.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow-y: auto; // 页面滚动参照 index.html
  padding: 12px 32px 32px; // padding-top 减少10px，其他保持32px

  &.no-top-padding {
    padding-top: 0; // hideHeader 页面消除顶部间距（子组件自带 detail-header）
  }
}

// ─── 内容头部（Clean Minimalist 风格 — 匹配参考设计顶栏）───
.content-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  // 去除玻璃态，改为简洁透明（匹配参考设计的无背景顶栏）

  // 左侧：图标 + 面包屑
  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 1;
    min-width: 0;

    .title-icon {
      display: flex;
      align-items: center;
      color: var(--color-primary);
      line-height: 1;
      flex-shrink: 0;
    }
  }

  // ─── 圆形导航按钮组（参考设计 w-10 h-10 rounded-full）───
  .header-nav-buttons {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .nav-circle-btn {
      width: 40px;
      height: 40px;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #fff;
      border: 1px solid $border-color-light;
      color: $text-secondary; // slate-600 ≈ #475569
      cursor: pointer;
      transition: all $transition-fast;
      flex-shrink: 0;

      svg {
        flex-shrink: 0;
      }

      &:hover {
        background: #F8FAFC; // slate-50
        border-color: #E2E8F0; // slate-200
        color: var(--color-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06); // shadow-sm
      }

      &:active {
        transform: scale(0.96);
      }

      &:focus-visible {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-bg);
      }
    }
  }

  // 右侧：导航按钮 + 用户区
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;

    .header-user-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    // ─── 胶囊形用户头像区（参考设计 rounded-full p-1.5 pr-4）───
    .user-avatar-wrapper {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      padding: 6px 16px 6px 6px; // p-1.5 pr-4 → 6px 16px
      border-radius: 9999px; // rounded-full / pill shape
      background: #fff;
      border: 1px solid $border-color-light;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); // shadow-sm
      transition: all $transition-normal;

      .user-avatar-wrap {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        overflow: hidden;
        flex-shrink: 0;
        border: 2px solid var(--color-primary-bg);

        .user-avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      }

      .user-display-name {
        font-size: 14px;
        font-weight: 500;
        color: $text-primary; // slate-900
        white-space: nowrap;
        line-height: 1;
      }

      .user-avatar-arrow {
        color: $text-secondary; // slate-400
        flex-shrink: 0;
        transition: transform 0.3s ease;
      }

      &:hover {
        background: #F8FAFC; // slate-50
        border-color: #E2E8F0; // slate-200
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);

        .user-avatar-arrow {
          transform: rotate(180deg);
          color: var(--color-primary);
        }
      }
    }
  }
}

// ─── 用户下拉菜单（Level 3 玻璃态 — Popup 层级）───
.user-menu-popup {
  padding: 4px;
  min-width: 150px;
  border-radius: 10px;
  background: transparent;
  backdrop-filter: none;
  border: none;
  box-shadow: none;

  .user-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: $text-primary;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: var(--overlay-brand-08);
      color: var(--color-primary);
    }

    &--danger {
      color: $color-danger;

      &:hover {
        background: $color-danger-light;
        color: $color-danger;
      }
    }

    &--has-sub {
      .submenu-arrow {
        margin-left: auto;
        opacity: 0.4;
        transition: opacity 0.2s;
      }

      &:hover .submenu-arrow {
        opacity: 0.7;
      }
    }
  }
}

// ─── 用户菜单子菜单（Theme / Brand Color）───
.user-submenu-popup {
  padding: 4px;
  min-width: 140px;
  border-radius: 10px;
  background: $overlay-white-98;
  backdrop-filter: blur(12px);
  border: 1.5px solid var(--overlay-brand-lighter-20);
  box-shadow: $shadow-xl;

  .user-submenu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: $text-primary;
    cursor: pointer;
    transition: all $transition-fast;

    .color-dot {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      flex-shrink: 0;
      border: 1.5px solid $overlay-white-50;
      box-shadow: 0 1px 3px $shadow-brand-xs;
    }

    .check-icon {
      margin-left: auto;
      color: var(--color-primary);
    }

    &:hover {
      background: var(--overlay-brand-08);
      color: var(--color-primary);
    }

    &.active {
      background: var(--overlay-brand-08);
      color: var(--color-primary);
      font-weight: 500;
    }
  }
}

// ─── 主体内容区域（参照 index.html 设计，取消内部滚动）───
.content-body {
  flex: 1;
  min-height: 0;

  .content-main {
    position: relative;
    z-index: 1;
  }
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }

  50% {
    transform: translateY(-20px) rotate(5deg);
  }
}

// ═══════════════════════════════════════
//  SIDEBAR COLLAPSED — 折叠态 72px 图标模式
// ═══════════════════════════════════════
.home-page.collapsed {
  .left-sidebar {
    width: 72px;
    max-width: 72px;
    min-width: 72px;
    flex: 0 0 72px;
  }

  .sidebar-top {
    padding: 16px 10px 12px;
    align-items: center;

    .sidebar-logo {
      justify-content: center;
      margin-bottom: 8px;
      padding-bottom: 8px;
    }
  }

  .sidebar-nav {
    padding: 8px 10px;

    .nav-content .nav-item {
      justify-content: center;
      padding: 10px;
    }
  }
}

.sidebar-logo {
  cursor: pointer;
  transition: all $transition-slow;

  &:hover .logo-cat svg {
    transform: translateY(-3px);
  }
}

.collapse-expand-icon {
  color: var(--color-primary-light);
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: var(--color-primary);
  }
}

// ─── 面包屑（参考设计 text-sm text-slate-500 + 当前页品牌色）───
.header-title-area {
  display: flex;
  align-items: center;
  min-width: 0;

  .content-breadcrumb {
    :deep(.t-breadcrumb) {
      font-size: 14px; // text-sm

      .t-breadcrumb-item {
        .t-breadcrumb__inner {
          color: var(--color-primary); // 绿色主题色，一直显示
          font-weight: 400;
        }
      }

      // 当前页：固定绿色 #10B981 (rgb(16, 185, 129)) + medium
      .t-breadcrumb-item.breadcrumb-current {
        .t-breadcrumb__inner {
          color: #10B981 !important;
          font-weight: 500 !important;
        }
      }

      .t-breadcrumb__separator {
        color: #94A3B8; // slate-400
      }
    }
  }
}

// ═══════════════════════════════════════
//  RESPONSIVE
// ═══════════════════════════════════════

// 桌面端隐藏移动端汉堡按钮
.mobile-menu-btn {
  display: none;
}

// 桌面端隐藏遮罩层
.mobile-overlay {
  display: none;
}

@media screen and (max-width: 1024px) {
  .left-sidebar {
    width: 260px;
    max-width: 300px;
    min-width: 0;
    flex: 0 0 260px;

    .sidebar-top {
      padding: 16px 14px 10px;
    }

    .sidebar-nav {
      padding: 10px 14px;
    }
  }

  .right-content {
    padding: 24px; // 缩小为 p-6 以适应较小屏幕
  }

  .content-header {
    flex-wrap: wrap;
    gap: 12px;
    margin-bottom: 24px; // 缩小底部间距
  }
}

@media screen and (max-width: 768px) {
  .home-page {
    flex-direction: column;
  }

  // 移动端汉堡菜单按钮
  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: $radius-md;
    background: transparent;
    color: var(--color-primary);
    cursor: pointer;
    flex-shrink: 0;
    transition: background $transition-fast;

    &:hover {
      background: var(--overlay-brand-08);
    }
  }

  // 移动端遮罩层
  .mobile-overlay {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.35);
    z-index: calc(#{$z-sidebar} - 1);
    backdrop-filter: blur(2px);
  }

  // 侧边栏抽屉模式
  .left-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: 280px !important;
    max-width: 280px !important;
    min-width: 280px !important;
    flex: 0 0 280px !important;
    z-index: $z-sidebar;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0;
    box-shadow: none;

    &.mobile-drawer-open {
      transform: translateX(0);
      box-shadow: $shadow-xl;
    }

    .sidebar-nav {
      flex: 1;
    }
  }

  .right-content {
    flex: 1;
    padding: 16px; // 缩小为 p-4 以适应移动端
  }

  .content-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    margin-bottom: 16px;

    .header-left {
      flex-wrap: wrap;
      gap: 8px;
    }

    .header-actions {
      justify-content: space-between;
    }
  }

  // 抽屉过渡动画
  .drawer-fade-enter-active,
  .drawer-fade-leave-active {
    transition: opacity 0.25s ease;
  }

  .drawer-fade-enter-from,
  .drawer-fade-leave-to {
    opacity: 0;
  }
}
</style>

<style lang="scss">
.header-user-section {

  .t-popup__content,
  .t-popup__content>* {
    border: none !important;
    outline: none !important;
  }

  .t-popup__content {
    padding: 4px !important;
    min-width: 150px !important;
    border-radius: 10px !important;
    background: rgba(255, 255, 255, 0.98) !important;
    backdrop-filter: blur(12px) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 1px 4px rgba(16, 185, 129, 0.06) !important;
  }
}
</style>
