<template>
  <div class="home-page">
    <!-- 左侧导航功能区 -->
    <div class="left-sidebar">
      <!-- Logo - 固定顶部 -->
      <div class="sidebar-top">
        <div class="sidebar-logo">
          <div class="logo-cat">
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
          <h1 class="logo-text">TingStudio</h1>
        </div>

        <!-- 个人信息 + 祝福语并排 -->
        <div class="sidebar-user-card">
          <div class="user-main">
            <div class="user-avatar">
              <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="30" cy="20" r="14" fill="#FFB5C8" />
                <ellipse cx="30" cy="52" rx="20" ry="14" fill="#FFE8D6" />
                <circle cx="26" cy="19" r="2" fill="#5D4E60" />
                <circle cx="34" cy="19" r="2" fill="#5D4E60" />
                <ellipse cx="30" cy="23" rx="1.5" ry="1" fill="#FF8FAB" />
                <path d="M26 26Q30 30 34 26" stroke="#E8A0B0" stroke-width="1" fill="none" stroke-linecap="round" />
              </svg>
            </div>
            <div class="user-info">
              <div class="user-name">{{ authStore.user?.username || '用户' }}</div>
              <div class="user-role">配方师</div>
            </div>
          </div>
          <div class="user-blessing">
            <span class="blessing-icon">💖</span>
            <span class="blessing-text">{{ todayBlessing }}</span>
          </div>
        </div>

        <!-- 日期和天气并排 -->
        <div class="sidebar-info-row">
          <div class="info-chip info-date">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <div class="chip-text">
              <span class="chip-main">{{ currentDate }}</span>
              <span class="chip-sub">{{ currentWeekday }}</span>
            </div>
          </div>
          <div class="info-chip info-weather">
            <span class="weather-icon">{{ weather }}</span>
            <div class="chip-text">
              <span class="chip-main">{{ temperature }}</span>
              <span class="chip-sub">{{ city }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 可滚动导航区域 -->
      <div class="sidebar-nav">
        <div class="nav-header" @click="toggleNav">
          <span class="nav-icon">📋</span>
          <span class="nav-title">功能导航</span>
          <span class="nav-toggle" :class="{ expanded: navExpanded }">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </span>
        </div>
        <div class="nav-content" :class="{ expanded: navExpanded }">
          <div
            v-for="item in navItems"
            :key="item.path"
            class="nav-item"
            :class="{ active: activePath === item.path }"
            @click="navigateTo(item.path)"
          >
            <div class="nav-item-icon">{{ item.icon }}</div>
            <span class="nav-item-text">{{ item.label }}</span>
            <div class="nav-item-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <!-- 新用户引导卡片 -->
      <div v-if="showGuideCard" class="sidebar-guide">
        <div class="guide-header">
          <span class="guide-icon">🚀</span>
          <span class="guide-title">快速开始</span>
          <span class="guide-close" @click="dismissGuide">&times;</span>
        </div>
        <div class="guide-steps">
          <div
            v-for="(step, index) in guideSteps"
            :key="index"
            class="guide-step"
            :class="{ active: guideStep === index, done: guideStep > index }"
            @click="handleGuideStep(index)"
          >
            <div class="step-number">{{ guideStep > index ? '✓' : index + 1 }}</div>
            <span class="step-text">{{ step.label }}</span>
            <svg class="step-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        </div>
        <div class="guide-action">
          <t-button theme="primary" size="small" @click="handleStartGuide">
            <template #icon><t-icon name="chevron-right" /></template>开始引导
          </t-button>
        </div>
      </div>
    </div>

    <!-- 右侧内容展示区 -->
    <div class="right-content">
      <div class="content-header">
        <div class="header-left">
          <span class="title-icon">{{ pageIcon }}</span>
          <h2 class="content-title">{{ pageTitle }}</h2>
          <div class="header-nav-buttons">
            <t-button theme="default" size="medium" @click="handleGoBack" class="header-btn">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </template>
              后退
            </t-button>
            <t-button theme="default" size="medium" @click="handleGoForward" class="header-btn">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </template>
              前进
            </t-button>
            <t-button theme="default" size="medium" @click="handleRefresh" class="header-btn">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </template>
              刷新
            </t-button>
          </div>
        </div>
        <div class="header-actions">
          <div class="header-user-section">
            <t-button theme="default" size="medium" @click="handleLock" class="header-btn">
              <template #icon>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </template>
              锁屏
            </t-button>
            <t-popup placement="bottom-right" trigger="click" :visible="userMenuVisible" @visible-change="(v: boolean) => userMenuVisible = v">
              <div class="user-avatar-wrapper">
                <div class="user-avatar">{{ userInitial }}</div>
                <svg class="user-avatar-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
              <template #content>
                <div class="user-menu-popup">
                  <div v-for="item in userMenuItems" :key="item.value" :class="['user-menu-item', { 'user-menu-item--danger': item.danger }]" @click="handleUserMenuClick(item.value)">
                    <t-icon :name="item.icon" size="16px" />
                    <span>{{ item.content }}</span>
                  </div>
                </div>
              </template>
            </t-popup>
          </div>
        </div>
      </div>

      <!-- 滚动内容区域 -->
      <div ref="contentBodyRef" class="content-body">
        <div class="content-body-wrapper">
          <!-- 工具栏：左侧搜索/重置，右侧新增（仅列表页可见） -->
          <div v-if="showAddBtn" class="content-toolbar">
            <div class="toolbar-left">
              <div class="header-search">
                <t-input
                  v-model="searchKeyword"
                  :placeholder="searchPlaceholder"
                  clearable
                  class="search-input"
                  @enter="handleSearch"
                  @clear="handleSearch"
                >
                  <template #prefix-icon>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                  </template>
                </t-input>
                <t-button theme="primary" size="medium" @click="handleSearch" class="toolbar-btn">
                  <template #icon><t-icon name="search" /></template>
                  搜索
                </t-button>
                <t-button theme="default" size="medium" @click="handleReset" class="toolbar-btn">
                  <template #icon><t-icon name="refresh" /></template>
                  重置
                </t-button>
              </div>
            </div>
            <div class="toolbar-right">
              <t-button theme="primary" size="medium" @click="handleAdd" class="action-btn">
                <template #icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </template>
                新增
              </t-button>
            </div>
          </div>

          <!-- 页面内容 -->
          <div class="content-main">
            <router-view v-slot="{ Component }">
              <transition name="fade-slide" mode="out-in">
                <component :is="Component" :key="refreshKey" />
              </transition>
            </router-view>
          </div>
        </div>
      </div>

      <!-- 分页底栏 — 独立于 content-body，不随内容滚动 -->
      <div v-if="paginationStore.visible" class="content-footer">
        <div class="content-footer-inner">
          <t-pagination v-bind="paginationStore.paginationConfig" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePaginationStore } from '@/stores/pagination'
import { useFormulaStore } from '@/stores/formula'
import { useMaterialStore } from '@/stores/material'
import { useSalesmanStore } from '@/stores/salesman'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const paginationStore = usePaginationStore()
const formulaStore = useFormulaStore()
const materialStore = useMaterialStore()
const salesmanStore = useSalesmanStore()

const navExpanded = ref(true)
const activePath = computed(() => {
  const path = route.path
  // 按最长前缀匹配，优先精确匹配，再按路径段前缀匹配
  const pathMap = [
    '/recent-formulas', '/formulas', '/materials', '/salesmen',
    '/exports', '/nutrition', '/tools'
  ]
  for (const key of pathMap) {
    if (path === key || path.startsWith(key + '/')) return key
  }
  // /versions/* 归属配方管理
  if (path.includes('/versions')) return '/formulas'
  return path
})
const searchKeyword = ref('')
const contentBodyRef = ref<HTMLElement | null>(null)

// 用户头像首字母
const userInitial = computed(() => {
  const name = authStore.user?.username || 'U'
  return name.charAt(0).toUpperCase()
})

// 用户下拉菜单
const userMenuVisible = ref(false)
const userMenuItems = [
  { content: '账号设置', value: 'settings', icon: 'setting' },
  { content: '主题', value: 'theme', icon: 'browse' },
  { content: '切换账号', value: 'switchAccount', icon: 'usergroup' },
  { content: '退出登录', value: 'logout', icon: 'poweroff', danger: true },
]

// 用户菜单点击
const handleUserMenuClick = (value: string) => {
  userMenuVisible.value = false
  switch (value) {
    case 'settings':
      MessagePlugin.info('账号设置功能开发中')
      break
    case 'theme':
      MessagePlugin.info('主题切换功能开发中')
      break
    case 'switchAccount':
      handleLogout()
      break
    case 'logout':
      handleLogout()
      break
  }
}




// 页面图标映射
const pageIcon = computed(() => {
  const iconMap: Record<string, string> = {
    '/recent-formulas': '🕐',
    '/formulas': '📝',
    '/materials': '🧪',
    '/salesmen': '🤝',
    '/exports': '📤',
    '/nutrition': '🥗',
    '/tools': '🛠️'
  }
  if (iconMap[route.path]) return iconMap[route.path]
  for (const key of Object.keys(iconMap)) {
    if (route.path.startsWith(key)) return iconMap[key]
  }
  if (route.path.includes('/versions')) return '📋'
  return '🏠'
})

// 搜索框占位符
const searchPlaceholder = computed(() => {
  const placeholderMap: Record<string, string> = {
    '/recent-formulas': '搜索配方名称或业务员...',
    '/formulas': '搜索配方名称或业务员...',
    '/materials': '搜索原料名称或编码...',
    '/salesmen': '搜索姓名、工号或电话...',
    '/exports': '搜索导出记录...',
    '/nutrition': '搜索营养标准...',
    '/tools': '搜索工具...'
  }
  if (placeholderMap[route.path]) return placeholderMap[route.path]
  for (const key of Object.keys(placeholderMap)) {
    if (route.path.startsWith(key)) return placeholderMap[key]
  }
  return '搜索...'
})

// 导航菜单项
const navItems = [
  { path: '/recent-formulas', label: '最近配方', icon: '🕐' },
  { path: '/formulas', label: '配方管理', icon: '📝' },
  { path: '/materials', label: '原材管理', icon: '🧪' },
  { path: '/salesmen', label: '业务员管理', icon: '🤝' },
  { path: '/exports', label: '导出中心', icon: '📤' },
  { path: '/nutrition', label: '营养分析', icon: '🥗' },
  { path: '/tools', label: '工具箱', icon: '🛠️' }
]

// 日期和星期
const currentDate = ref('')
const currentWeekday = ref('')

// 天气信息
const city = ref('北京')
const weather = ref('☀️')
const temperature = ref('26°C')

// 今日祝福语
const todayBlessing = ref('愿你今天灵感如泉涌，创造美好配方！')

// 页面标题
const pageTitle = computed(() => {
  const titleMap: Record<string, string> = {
    '/recent-formulas': '最近配方',
    '/formulas': '配方管理',
    '/materials': '原料管理',
    '/salesmen': '业务员管理',
    '/exports': '导出中心',
    '/nutrition': '营养分析',
    '/tools': '工具箱'
  }
  if (titleMap[route.path]) return titleMap[route.path]
  for (const [key, value] of Object.entries(titleMap)) {
    if (route.path.startsWith(key)) return value
  }
  if (route.path.includes('/versions')) return '版本管理'
  return '欢迎'
})

// 切换导航栏展开状态
const toggleNav = () => {
  navExpanded.value = !navExpanded.value
}

// 导航到指定路径
const navigateTo = (path: string) => {
  router.push(path)
}

// 工具栏：仅在列表页显示，表单页/详情页/编辑页隐藏
const showAddBtn = computed(() => {
  const path = route.path
  const listPages = ['/materials', '/formulas', '/salesmen', '/nutrition/profiles', '/tools']
  // 精确匹配列表页（不含子路径），导出中心和营养分析页隐藏新增按钮
  return listPages.some(p => path === p)
})

// 处理新增
const handleAdd = () => {
  const path = route.path
  if (path === '/formulas') {
    router.push('/formulas/new')
  } else if (path === '/materials') {
    router.push('/materials/new')
  } else if (path === '/salesmen') {
    router.push('/salesmen/new')
  } else if (path === '/exports') {
    MessagePlugin.info('请从配方列表选择配方进行导出')
  } else if (path === '/nutrition') {
    MessagePlugin.info('请从配方列表选择配方进行营养分析')
  } else if (path === '/recent-formulas') {
    MessagePlugin.info('请从配方管理新增配方')
  } else if (path === '/tools') {
    MessagePlugin.info('工具箱功能开发中')
  }
}

// 刷新子页面
const refreshKey = ref(0)
const handleRefresh = () => {
  refreshKey.value++
}

// 后退 — 返回上一级列表页
const handleGoBack = () => {
  const path = route.path
  if (path === '/formulas/new') {
    router.push('/formulas')
  } else if (path.startsWith('/formulas/') && path !== '/formulas') {
    router.push('/formulas')
  } else if (path === '/materials/new') {
    router.push('/materials')
  } else if (path.startsWith('/materials/') && path !== '/materials') {
    router.push('/materials')
  } else {
    router.back()
  }
}

// 前进
const handleGoForward = () => {
  router.forward()
}

// 处理搜索 — 通过自定义事件传递给子页面
const handleSearch = () => {
  window.dispatchEvent(new CustomEvent('global-search', { detail: searchKeyword.value }))
}

// 处理重置 — 通过自定义事件通知子页面
const handleReset = () => {
  searchKeyword.value = ''
  window.dispatchEvent(new CustomEvent('global-search', { detail: '' }))
}

// 处理退出登录
const handleLogout = () => {
  authStore.logout()
  MessagePlugin.success('已退出登录~')
  router.push('/login')
}

// 处理锁屏
const handleLock = () => {
  MessagePlugin.info('锁屏功能开发中')
}

// ─── 新用户引导 ───
const GUIDE_DISMISSED_KEY = 'ting-guide-dismissed'
const guideStep = ref(0)
const guideSteps = [
  { label: '录入原料库', path: '/materials' },
  { label: '创建配方', path: '/formulas/new' },
  { label: '分析营养成分', path: '/nutrition' },
]

const showGuideCard = computed(() => {
  if (localStorage.getItem(GUIDE_DISMISSED_KEY)) return false
  return formulaStore.formulas.length === 0 &&
    materialStore.materials.length === 0 &&
    salesmanStore.salesmen.length === 0
})

const dismissGuide = () => {
  localStorage.setItem(GUIDE_DISMISSED_KEY, '1')
  guideStep.value = 0
}

const handleGuideStep = (index: number) => {
  router.push(guideSteps[index].path)
  guideStep.value = index + 1
}

const handleStartGuide = () => {
  handleGuideStep(0)
}

// 更新日期信息
const updateDateInfo = () => {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentDate.value = `${month}月${day}日`
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  currentWeekday.value = weekdays[now.getDay()]
}

// 随机祝福语
const blessings = [
  '愿你今天灵感如泉涌！',
  '每一份努力都有回报！',
  '保持热爱，奔赴山海~',
  '今天的你闪闪发光 ✨',
  '美好如期而至',
  '相信自己，加油！'
]

const updateBlessing = () => {
  const index = Math.floor(Math.random() * blessings.length)
  todayBlessing.value = blessings[index]
}

// 随机天气
const weatherOptions = [
  { icon: '☀️', text: '晴', temp: '26°C' },
  { icon: '⛅', text: '多云', temp: '24°C' },
  { icon: '🌤️', text: '晴间多云', temp: '25°C' },
  { icon: '🌧️', text: '小雨', temp: '22°C' }
]

const updateWeather = () => {
  const index = Math.floor(Math.random() * weatherOptions.length)
  const w = weatherOptions[index]
  weather.value = w.icon
  temperature.value = w.temp
}

// 随机城市
const getLocation = () => {
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京']
  city.value = cities[Math.floor(Math.random() * cities.length)]
}

onMounted(() => {
  updateDateInfo()
  updateBlessing()
  updateWeather()
  getLocation()
})
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
  background: $bg-page;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

// ═══════════════════════════════════════
//  LEFT SIDEBAR — flex 纵向三段布局
// ═══════════════════════════════════════
.left-sidebar {
  width: 300px;
  max-width: 300px;
  min-width: 300px;
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  background: $gradient-sidebar;
  border-right: 2px solid $overlay-pink-15;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, $overlay-pink-08, transparent 70%);
    pointer-events: none;
    z-index: 0;
  }

  // 确保子元素在伪元素之上
  > * { position: relative; z-index: 1; }
}

// ─── sidebar-top：Logo + 用户 + 日期天气（固定顶部）───
.sidebar-top {
  flex-shrink: 0;
  padding: 20px 18px 14px;
}

// Logo
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 14px;
  border-bottom: 2px dashed $overlay-pink-lighter-30;

  .logo-cat {
    width: 38px;
    height: 38px;
    flex-shrink: 0;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 4px 12px $overlay-pink-15);
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
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

// ─── 个人信息 + 祝福语并排卡片 ───
.sidebar-user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 80px;
  flex-shrink: 0;
  padding: 12px;
  background: $overlay-white-60;
  backdrop-filter: blur(10px);
  border-radius: 14px;
  margin-bottom: 12px;
  border: 1px solid $overlay-pink-lighter-20;
  box-shadow: 0 2px 12px $overlay-pink-08;

  .user-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .user-avatar {
      width: 34px;
      height: 34px;
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .user-info {
      .user-name {
        font-size: 13px;
        font-weight: 600;
        color: $text-primary;
        line-height: 1.3;
      }

      .user-role {
        font-size: 9px;
        background: linear-gradient(135deg, $brand-primary-lighter, $brand-primary-light);
        color: white;
        padding: 1px 6px;
        border-radius: 6px;
        display: inline-block;
        margin-top: 2px;
      }
    }
  }

  .user-blessing {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    background: linear-gradient(135deg, $overlay-pink-08, $color-lavender-alpha);
    border-radius: 8px;
    border-left: 3px solid $brand-primary-lighter;

    .blessing-icon {
      font-size: 14px;
      animation: heartBeat 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }

    .blessing-text {
      font-size: 11px;
      color: $text-primary;
      line-height: 1.5;
      font-weight: 500;
      white-space: normal;
      word-break: break-all;
    }
  }
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.2); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
}

// ─── 日期 & 天气并排 ───
.sidebar-info-row {
  display: flex;
  gap: 8px;

  .info-chip {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: $overlay-white-50;
    border-radius: 10px;
    border: 1px solid $overlay-pink-lighter-15;
    transition: all 0.3s;

    &:hover {
      background: $overlay-white-80;
      box-shadow: 0 4px 12px $overlay-pink-10;
    }
  }

  .info-date svg {
    color: $brand-primary;
    flex-shrink: 0;
  }

  .weather-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .chip-text {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .chip-main {
      font-size: 12px;
      font-weight: 600;
      color: $text-primary;
      line-height: 1.3;
    }

    .chip-sub {
      font-size: 10px;
      color: $text-secondary;
      line-height: 1.3;
    }
  }
}

// ─── sidebar-nav：可滚动导航区域 ───
.sidebar-nav {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 18px;
  scrollbar-width: thin;
  scrollbar-color: $overlay-pink-25 transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: $overlay-pink-25;
    border-radius: 2px;
    &:hover {
      background: $overlay-pink-45;
    }
  }

  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: linear-gradient(135deg, $brand-primary-lightest, $brand-primary-lighter);
    border-radius: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: $shadow-brand-xs;

    &:hover {
      transform: translateY(-2px);
      box-shadow: $shadow-brand;
    }

    .nav-icon { font-size: 16px; }

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
      &.expanded { transform: rotate(180deg); }
      svg { width: 14px; height: 14px; }
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
      padding: 10px 12px;
      background: $overlay-white-60;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
      border: 1px solid transparent;

      &:hover {
        background: $overlay-white-90;
        transform: translateX(4px);
        border-color: $brand-primary-lightest;
        box-shadow: 0 2px 8px $overlay-pink-10;
      }

      &.active {
        background: linear-gradient(135deg, $brand-primary-light, $brand-primary);
        color: white;
        box-shadow: $shadow-brand-md;

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
        font-size: 16px;
        flex-shrink: 0;
      }

      .nav-item-text {
        flex: 1;
        font-size: 13px;
        color: $text-primary;
        font-weight: 500;
      }

      .nav-item-arrow {
        color: $text-secondary;
        transition: all 0.3s;
        svg { width: 12px; height: 12px; }
      }
    }
  }
}

// ─── 新用户引导卡片 ───
.sidebar-guide {
  flex-shrink: 0;
  margin: 0 18px 16px;
  padding: 14px;
  background: $overlay-white-70;
  backdrop-filter: blur(10px);
  border-radius: 14px;
  border: 1.5px solid $overlay-pink-lighter-25;
  box-shadow: 0 4px 16px $overlay-pink-10;

  .guide-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .guide-icon { font-size: 18px; }
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
      transition: all 0.2s;

      &:hover {
        background: $overlay-pink-15;
        color: $brand-primary;
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
      transition: all 0.2s;
      border: 1px solid transparent;

      &:hover {
        background: $overlay-pink-bg-60;
        border-color: $brand-primary-lightest;
      }

      &.active {
        background: linear-gradient(135deg, $brand-primary-lighter, $brand-primary-light);
        .step-number { background: white; color: $brand-primary; }
        .step-text { color: white; font-weight: 600; }
        .step-arrow { color: white; }
      }

      &.done .step-number {
        background: $chart-progress-good;
        color: white;
      }

      .step-number {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: $brand-primary-bg;
        color: $brand-primary;
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
//  RIGHT CONTENT — 仅此区域滚动
// ═══════════════════════════════════════
.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  gap: 2px;
  padding: 8px 16px;
}

.content-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 14px;
  background: $overlay-white-92;
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1.5px solid $overlay-pink-lighter-20;
  box-shadow: 0 2px 12px $overlay-pink-08;

  // 左侧：图标 + 标题 — 左对齐
  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    .header-nav-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: 16px;
      padding-left: 16px;
      border-left: 1.5px solid $overlay-pink-lighter-25;
    }

    .title-icon {
      font-size: 20px;
      line-height: 1;
    }

    .content-title {
      font-size: 18px;
      font-weight: 700;
      color: $text-primary;
      margin: 0;
      white-space: nowrap;
    }
  }

  // 统一按钮样式（后退、前进、刷新、锁屏）— 尺寸由全局覆盖
  .header-btn {
    flex-shrink: 0;

    &.t-button--theme-default {
      &:hover {
        background: linear-gradient(135deg, $brand-primary-light, $brand-primary) !important;
        color: white !important;
        border-color: $brand-primary !important;
        :deep(.t-button__icon) { color: white !important; }
      }
    }
  }

  // 右侧：导航 + 操作按钮
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
    margin-left: auto;

    .header-user-section {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .user-avatar-wrapper {
      display: flex;
      align-items: center;
      gap: 4px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 10px;
      transition: all 0.3s ease;

      &:hover {
        background: $overlay-pink-08;
      }

      .user-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: linear-gradient(135deg, $brand-primary-light, $brand-primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 700;
        flex-shrink: 0;
        box-shadow: $shadow-brand-xs;
      }

      .user-avatar-arrow {
        color: $brand-primary-light;
        flex-shrink: 0;
        transition: transform 0.3s ease;
      }

      &:hover .user-avatar-arrow {
        transform: rotate(180deg);
      }
    }

  }
}

// ─── 用户下拉菜单 ───
.user-menu-popup {
  padding: 4px;
  min-width: 150px;
  border-radius: 10px;
  background: $overlay-white-98;
  backdrop-filter: blur(12px);
  border: 1.5px solid $overlay-pink-lighter-20;
  box-shadow: $shadow-xl;

  .user-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: $text-primary;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: $overlay-pink-08;
      color: $brand-primary;
    }

    &--danger {
      color: $color-danger;

      &:hover {
        background: $color-danger-light;
        color: $color-danger;
      }
    }
  }
}

// ─── 滚动内容卡片 ───
.content-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: $overlay-white-92;
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1.5px solid $overlay-pink-lighter-20;
  box-shadow: 0 2px 12px $overlay-pink-08;
  scrollbar-width: thin;
  scrollbar-color: $overlay-pink-20 transparent;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: $overlay-pink-20;
    border-radius: 3px;
    &:hover { background: $overlay-pink-40; }
  }

  .content-body-wrapper {
    position: relative;
    padding: 16px 20px;
    min-height: 100%;

    // 工具栏：左侧搜索/重置，右侧新增
    .content-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 12px;
      flex-shrink: 0;

      .toolbar-left {
        flex-shrink: 0;

        .header-search {
          display: flex;
            align-items: center;
            gap: 8px;

            .search-input {
              width: 320px;

            :deep(.t-input) {
              height: 32px;
              border-radius: 10px;
              border: 1.5px solid $brand-primary-lightest;
              background: $overlay-pink-bg-30;

              &:hover { border-color: $brand-primary-lighter; }
              &:focus-within {
                border-color: $brand-primary-light;
                box-shadow: 0 0 0 3px $overlay-pink-10;
              }

              .t-input__wrap { color: $text-primary; font-size: 12px; }
              .t-input__prefix { color: $brand-primary-light; }
            }
          }

          .toolbar-btn {
            flex-shrink: 0;
          }
        }
      }

      .toolbar-right {
        flex-shrink: 0;

        .action-btn {
          flex-shrink: 0;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

          &.t-button--theme-primary {
            box-shadow: $shadow-brand-md;

            &:hover {
              transform: translateY(-2px);
              box-shadow: $shadow-brand-lg;
            }
          }
        }
      }
    }

    .content-main {
      position: relative;
      z-index: 1;

      // 表格样式增强（仅保留 main.scss 未覆盖的行级细节）
      :deep(.t-table) {
        border: 1px solid $overlay-pink-lighter-15;

        .t-table__body td {
          font-size: 12px;
          color: $text-primary;
          border-bottom: 1px solid $overlay-pink-bg-15 !important;
          padding: 8px 12px !important;
        }

        .t-table__body tr:hover td {
          background: $bg-hover !important;
        }
      }
    }
  }
}

// ─── 分页底栏 — 独立于 content-body，不随内容滚动 ───
.content-footer {
  flex-shrink: 0;
  padding: 6px 16px;
  background: $overlay-white-92;
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1.5px solid $overlay-pink-lighter-20;
  box-shadow: 0 2px 12px $overlay-pink-08;

  .content-footer-inner {
    display: flex;
    justify-content: flex-end;

    // ─── 分页组件主题色 ───
    :deep(.t-pagination) {
      .t-pagination__total {
        color: $text-secondary;
        font-size: 13px;
      }

      .t-pagination__btn {
        color: $text-primary;
        border-radius: 8px;
        min-width: 32px;
        height: 32px;
        border: 1px solid transparent;
        transition: all 0.3s;

        &:hover:not(.t-is-disabled):not(.t-is-current) {
          color: $brand-primary;
          border-color: $brand-primary-lighter;
          background: $overlay-pink-08;
        }
      }

      .t-is-current {
        background: linear-gradient(135deg, $brand-primary-light, $brand-primary) !important;
        color: white !important;
        border-radius: 8px !important;
        border: none !important;
        box-shadow: $shadow-brand-md;
        font-weight: 600;
      }

      .t-pagination__select {
        border-color: $brand-primary-lightest !important;
        border-radius: 8px !important;
        color: $text-primary !important;

        &:hover {
          border-color: $brand-primary-lighter !important;
        }
      }

      .t-pagination__jumper-input {
        border-color: $brand-primary-lightest !important;
        border-radius: 8px !important;
        color: $text-primary !important;
        width: 48px;

        &:focus,
        &:hover {
          border-color: $brand-primary-light !important;
          box-shadow: 0 0 0 2px $overlay-pink-10;
        }
      }
    }
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(5deg); }
}

// Transition
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

// ═══════════════════════════════════════
//  RESPONSIVE
// ═══════════════════════════════════════
@media screen and (max-width: 1024px) {
  .left-sidebar {
    width: 260px;
    max-width: 300px;
    min-width: 0;
    flex: 0 0 260px;

    .sidebar-top { padding: 16px 14px 10px; }
    .sidebar-nav { padding: 10px 14px; }
  }

  .right-content {
    gap: 8px;
    padding: 8px 12px;
  }

  .content-header {
    flex-wrap: wrap;
    padding: 10px 14px;

    .header-left .content-title { font-size: 18px; }
  }

  .content-body {
    .content-body-wrapper {
      padding: 14px 16px;
    }
  }

  .content-footer {
    padding: 8px 14px;
  }
}

@media screen and (max-width: 768px) {
  .home-page {
    flex-direction: column;
  }

  .left-sidebar {
    width: 100%;
    max-width: 300px;
    flex: 0 0 auto;
    max-height: 45vh;

    .sidebar-nav { flex: 1; }
  }

  .right-content {
    flex: 1;
    gap: 8px;
    padding: 6px 10px;
  }

  .content-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .content-body {
    .content-body-wrapper {
      .content-toolbar {
        flex-direction: column;
        align-items: stretch;
        gap: 8px;
      }
    }
  }
}
</style>
