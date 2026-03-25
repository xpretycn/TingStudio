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

      <!-- 底部按钮 - 固定底部 -->
      <div class="sidebar-footer">
        <div class="footer-buttons">
          <t-button theme="default" variant="outline" size="large" @click="handleLock" class="lock-btn">
            <template #icon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </template>
            锁屏
          </t-button>
          <t-button theme="danger" variant="outline" size="large" @click="handleLogout" class="logout-btn">
            <template #icon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </template>
            退出
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
        </div>
        <div class="header-actions">
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
            <t-button theme="primary" size="medium" @click="handleSearch" class="header-btn">
              <template #icon><t-icon name="search" /></template>
              搜索
            </t-button>
            <t-button theme="default" size="medium" @click="handleReset" class="header-btn">
              <template #icon><t-icon name="refresh" /></template>
              重置
            </t-button>
          </div>
        </div>
        <div class="header-action-buttons">
          <t-button theme="primary" size="medium" @click="handleAdd" class="action-btn">
            <template #icon>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </template>
            新增
          </t-button>
          <t-button theme="default" size="medium" @click="handleRefresh" class="action-btn">
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

      <!-- 滚动内容区域 -->
      <div ref="contentBodyRef" class="content-body">
        <div class="content-body-wrapper">
          <!-- 内容装饰图标 -->
          <div class="content-decoration">
            <div class="decoration-icon decoration-icon-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
              </svg>
            </div>
            <div class="decoration-icon decoration-icon-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <div class="decoration-icon decoration-icon-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          </div>

          <!-- 页面内容 -->
          <div class="content-main">
            <router-view v-slot="{ Component }">
              <transition name="fade-slide" mode="out-in">
                <component :is="Component" />
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePaginationStore } from '@/stores/pagination'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const paginationStore = usePaginationStore()

const navExpanded = ref(true)
const activePath = computed(() => route.path)
const searchKeyword = ref('')
const contentBodyRef = ref<HTMLElement | null>(null)

// ─── 动态计算分页大小：根据 content-body 可用高度自动推算 ───
// 表格已知尺寸（基于 Home.vue 中 :deep(.t-table) 样式）：
//   wrapper padding: 16px + 16px = 32px
//   表头高度: th padding 12+12 + font~16 + border 1.5 ≈ 42px（运行时实际测量）
//   行高:     td padding 10+10 + font~16 + border 1  ≈ 37px（运行时实际测量）
//   安全余量: 4px
const calcDynamicPageSize = () => {
  const el = contentBodyRef.value
  if (!el) return 10

  const bodyHeight = el.clientHeight
  if (bodyHeight <= 0) return 10

  // 尝试从 DOM 测量表头和行高的实际像素值
  const wrapper = el.querySelector('.content-body-wrapper')
  const wrapperPaddingTop = wrapper ? parseFloat(getComputedStyle(wrapper).paddingTop) : 16
  const wrapperPaddingBottom = wrapper ? parseFloat(getComputedStyle(wrapper).paddingBottom) : 16
  const verticalPadding = wrapperPaddingTop + wrapperPaddingBottom

  const headerEl = el.querySelector('.t-table__header')
  const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 42

  const firstRowEl = el.querySelector('.t-table__body tr')
  const rowHeight = firstRowEl ? firstRowEl.getBoundingClientRect().height : 37

  if (rowHeight <= 0) return 10

  const available = bodyHeight - verticalPadding - headerHeight - 4
  return Math.max(1, Math.floor(available / rowHeight))
}

let resizeObserver: ResizeObserver | null = null

const setupDynamicPageSize = () => {
  const el = contentBodyRef.value
  if (!el) return

  const update = () => {
    // 等待表格渲染完成后再测量
    requestAnimationFrame(() => {
      const size = calcDynamicPageSize()
      paginationStore.setDynamicPageSize(size)
    })
  }

  resizeObserver = new ResizeObserver(update)
  resizeObserver.observe(el)

  // 路由变化后重新计算（子组件可能不同页面有不同表头高度）
  watch(() => route.path, () => {
    nextTick(update)
  })

  // 首次计算
  nextTick(update)
}

const teardownDynamicPageSize = () => {
  resizeObserver?.disconnect()
  resizeObserver = null
}


// 页面图标映射
const pageIcon = computed(() => {
  const iconMap: Record<string, string> = {
    '/recent-formulas': '🕐',
    '/formulas': '📝',
    '/materials': '🧪',
    '/customers': '👥',
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
    '/recent-formulas': '搜索配方名称或客户...',
    '/formulas': '搜索配方名称或客户...',
    '/materials': '搜索原料名称或编码...',
    '/customers': '搜索客户名称、联系人...',
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
  { path: '/materials', label: '原材料管理', icon: '🧪' },
  { path: '/customers', label: '客户管理', icon: '👥' },
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
    '/materials': '原材料管理',
    '/customers': '客户管理',
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

// 处理新增
const handleAdd = () => {
  const path = route.path
  if (path === '/formulas') {
    router.push('/formulas/new')
  } else if (path === '/materials') {
    router.push('/materials/new')
  } else if (path === '/customers') {
    router.push('/customers/new')
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

// 处理刷新
const handleRefresh = () => {
  window.location.reload()
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

// 获取城市定位
const getLocation = () => {
  const defaultCities = ['北京', '上海', '广州', '深圳']
  const setDefaultCity = () => {
    city.value = defaultCities[Math.floor(Math.random() * defaultCities.length)]
  }
  try {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => {
          const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京']
          city.value = cities[Math.floor(Math.random() * cities.length)]
        },
        () => {
          setDefaultCity()
        }
      )
    } else {
      setDefaultCity()
    }
  } catch {
    setDefaultCity()
  }
}

onMounted(() => {
  updateDateInfo()
  updateBlessing()
  updateWeather()
  getLocation()
  setupDynamicPageSize()
})

onUnmounted(() => {
  teardownDynamicPageSize()
})
</script>

<style scoped lang="scss">
// ───── Palette ─────
$pink-100: #FFF0F3;
$pink-200: #FFD6E0;
$pink-300: #FFB5C8;
$pink-400: #FF8FAB;
$pink-500: #FF6B8A;
$peach: #FFE8D6;
$cream: #FFF9F5;
$lavender: #F0E6FF;
$mauve: #E8D5F5;
$text-main: #5D4E60;
$text-sub: #9B8FA0;
$white: #fff;
$sidebar-w: 300px;

// ═══════════════════════════════════════
//  HOME PAGE — 禁止滚动，撑满视口
// ═══════════════════════════════════════
.home-page {
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: $cream;
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
  background: linear-gradient(180deg, #FFF9F7 0%, #FFF0F3 50%, #F0E6FF 100%);
  border-right: 2px solid rgba(255, 143, 171, 0.15);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -50%;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(255, 143, 171, 0.08), transparent 70%);
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
  border-bottom: 2px dashed rgba(255, 181, 200, 0.3);

  .logo-cat {
    width: 38px;
    height: 38px;
    flex-shrink: 0;

    svg {
      width: 100%;
      height: 100%;
      filter: drop-shadow(0 4px 12px rgba(255, 143, 171, 0.15));
      animation: catBounce 4s ease-in-out infinite;
    }
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: $text-main;
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
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 181, 200, 0.2);
  box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);

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
        color: $text-main;
        line-height: 1.3;
      }

      .user-role {
        font-size: 9px;
        background: linear-gradient(135deg, $pink-300, $pink-400);
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
    background: linear-gradient(135deg, rgba(255, 143, 171, 0.08), rgba(240, 230, 255, 0.08));
    border-radius: 8px;
    border-left: 3px solid $pink-300;

    .blessing-icon {
      font-size: 14px;
      animation: heartBeat 1.5s ease-in-out infinite;
      flex-shrink: 0;
    }

    .blessing-text {
      font-size: 11px;
      color: $text-main;
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
    background: rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    border: 1px solid rgba(255, 181, 200, 0.15);
    transition: all 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.8);
      box-shadow: 0 4px 12px rgba(255, 143, 171, 0.1);
    }
  }

  .info-date svg {
    color: $pink-500;
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
      color: $text-main;
      line-height: 1.3;
    }

    .chip-sub {
      font-size: 10px;
      color: $text-sub;
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
  scrollbar-color: rgba(255, 143, 171, 0.25) transparent;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 143, 171, 0.25);
    border-radius: 2px;
    &:hover {
      background: rgba(255, 143, 171, 0.45);
    }
  }

  .nav-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: linear-gradient(135deg, $pink-200, $pink-300);
    border-radius: 10px;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 2px 8px rgba(255, 107, 138, 0.15);

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 107, 138, 0.25);
    }

    .nav-icon { font-size: 16px; }

    .nav-title {
      font-size: 13px;
      font-weight: 600;
      color: $text-main;
      flex: 1;
      margin-left: 6px;
    }

    .nav-toggle {
      color: $text-main;
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
      background: rgba(255, 255, 255, 0.6);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
      border: 1px solid transparent;

      &:hover {
        background: rgba(255, 255, 255, 0.9);
        transform: translateX(4px);
        border-color: $pink-200;
        box-shadow: 0 2px 8px rgba(255, 143, 171, 0.1);
      }

      &.active {
        background: linear-gradient(135deg, $pink-400, $pink-500);
        color: white;
        box-shadow: 0 4px 12px rgba(255, 107, 138, 0.3);

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
        color: $text-main;
        font-weight: 500;
      }

      .nav-item-arrow {
        color: $text-sub;
        transition: all 0.3s;
        svg { width: 12px; height: 12px; }
      }
    }
  }
}

// ─── sidebar-footer：固定底部 ───
.sidebar-footer {
  flex-shrink: 0;
  padding: 14px 18px 18px;
  border-top: 2px dashed rgba(255, 181, 200, 0.25);
  background: linear-gradient(180deg, transparent, rgba(255, 240, 243, 0.5));

  .footer-buttons {
    display: flex;
    gap: 8px;

    .lock-btn,
    .logout-btn {
      flex: 1;
      height: 38px !important;
      border-radius: 10px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      border: 2px solid $pink-400 !important;
      color: $pink-500 !important;
      background: rgba(255, 255, 255, 0.8) !important;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover {
        background: linear-gradient(135deg, $pink-400, $pink-500) !important;
        color: white !important;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(255, 107, 138, 0.3) !important;
      }

      &:active {
        transform: translateY(1px) scale(0.98);
        transition: all 0.15s ease-out;
      }

      :deep(.t-button__icon) {
        color: inherit !important;
      }
    }

    .logout-btn {
      border-color: #E34D59 !important;
      color: #E34D59 !important;

      &:hover {
        background: linear-gradient(135deg, #FF6B8A, #E34D59) !important;
        color: white !important;
      }
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
  gap: 10px;
  padding: 8px 16px;
}

.content-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1.5px solid rgba(255, 181, 200, 0.2);
  box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);

  // 左侧：图标 + 标题 — 左对齐
  .header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    .title-icon {
      font-size: 24px;
      line-height: 1;
    }

    .content-title {
      font-size: 22px;
      font-weight: 700;
      color: $text-main;
      margin: 0;
      white-space: nowrap;
    }
  }

  // 中间：搜索区域 — 居中对齐
  .header-actions {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-width: 0;

    .header-search {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 800px;

      .search-input {
        flex: 1;
        min-width: 120px;

        :deep(.t-input) {
          height: 36px;
          border-radius: 10px;
          border: 1.5px solid $pink-200;
          background: rgba(255, 240, 243, 0.3);

          &:hover { border-color: $pink-300; }
          &:focus-within {
            border-color: $pink-400;
            box-shadow: 0 0 0 3px rgba(255, 143, 171, 0.1);
          }

          .t-input__wrap { color: $text-main; font-size: 13px; }
          .t-input__prefix { color: $pink-400; }
        }
      }

      .header-btn {
        height: 36px !important;
        border-radius: 10px !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        flex-shrink: 0;
        padding: 0 14px;

        &.t-button--theme-primary {
          background: linear-gradient(135deg, $pink-400, $pink-500) !important;
          border: none !important;

          &:hover {
            background: linear-gradient(135deg, $pink-300, $pink-400) !important;
            transform: translateY(-1px);
          }
          :deep(.t-button__icon) { color: white !important; }
        }

        &.t-button--theme-default {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 1.5px solid $pink-200 !important;
          color: $text-main !important;

          &:hover {
            border-color: $pink-400 !important;
            color: $pink-500 !important;
          }
          :deep(.t-button__icon) { color: $pink-400 !important; }
        }
      }
    }
  }

  // 右侧：新增 / 刷新按钮 — 右对齐
  .header-action-buttons {
    display: flex;
    gap: 8px;
    flex-shrink: 0;

    .action-btn {
      height: 36px !important;
      border-radius: 10px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      padding: 0 14px;
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);

      &.t-button--theme-primary {
        background: linear-gradient(135deg, $pink-400, $pink-500) !important;
        border: none !important;
        box-shadow: 0 4px 16px rgba(255, 107, 138, 0.3);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(255, 107, 138, 0.4);
          background: linear-gradient(135deg, $pink-300, $pink-400) !important;
        }

        &:active {
          transform: translateY(1px) scale(0.98);
        }

        :deep(.t-button__icon) { color: white !important; }
      }

      &.t-button--theme-default {
        background: rgba(255, 255, 255, 0.9) !important;
        border: 1.5px solid $pink-200 !important;
        color: $text-main !important;

        &:hover {
          border-color: $pink-400 !important;
          color: $pink-500 !important;
          transform: translateY(-2px);
        }

        &:active {
          transform: translateY(1px) scale(0.98);
        }

        :deep(.t-button__icon) { color: $pink-400 !important; }
      }
    }
  }
}

// ─── 滚动内容卡片 ───
.content-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1.5px solid rgba(255, 181, 200, 0.2);
  box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 143, 171, 0.2) transparent;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 143, 171, 0.2);
    border-radius: 3px;
    &:hover { background: rgba(255, 143, 171, 0.4); }
  }

  .content-body-wrapper {
    position: relative;
    padding: 16px 20px;
    min-height: 100%;

    .content-decoration {
      position: absolute;
      top: 0;
      right: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;

      .decoration-icon {
        position: absolute;
        opacity: 0.08;
        animation: float 6s ease-in-out infinite;

        &.decoration-icon-1 {
          top: 20px; right: 40px;
          color: $pink-400;
          animation-delay: 0s;
        }
        &.decoration-icon-2 {
          top: 120px; right: 100px;
          color: $pink-300;
          animation-delay: 1s;
        }
        &.decoration-icon-3 {
          top: 80px; right: 180px;
          color: $lavender;
          animation-delay: 2s;
        }
      }
    }

    .content-main {
      position: relative;
      z-index: 1;

      // 隐藏子组件内置的 t-card 容器（content-body 已提供卡片效果）
      :deep(.t-card) {
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
      }

      :deep(.t-card__body) {
        padding: 0 !important;
      }

      // ─── 表格统一样式 ───
      :deep(.t-table) {
        border: 1px solid rgba(255, 181, 200, 0.15);

        // 固定表头 — 不随滚动
        .t-table__header {
          position: sticky;
          top: 0;
          z-index: 10;
          background: linear-gradient(135deg, rgba(255, 248, 245, 0.98), rgba(255, 240, 243, 0.98));
          backdrop-filter: blur(8px);

          th {
            background: transparent !important;
            color: $text-main !important;
            font-weight: 600 !important;
            font-size: 13px !important;
            border-bottom: 1.5px solid rgba(255, 181, 200, 0.2) !important;
            padding: 12px 16px !important;

            .t-table__cell-text {
              color: $text-main !important;
              font-weight: 600 !important;
            }
          }
        }

        // 表体行
        .t-table__body {
          td {
            font-size: 13px;
            color: $text-main;
            border-bottom: 1px solid rgba(255, 220, 230, 0.15) !important;
            padding: 10px 16px !important;
          }

          tr:hover td {
            background: rgba(255, 240, 243, 0.5) !important;
          }

          .t-table__row--stripe td {
            background: rgba(255, 248, 245, 0.4) !important;
          }
        }

        // 展开行
        .t-table__expanded-row {
          background: $cream !important;
        }
      }

      // 隐藏子组件内置的分页（已迁移到 content-footer）
      :deep(.t-table__pagination) {
        display: none;
      }

      // ─── 空状态统一样式 ───
      :deep(.t-empty) {
        padding: 40px 0;
        background: transparent !important;

        .t-empty__image {
          svg {
            color: $pink-300;
          }
        }

        .t-empty__description {
          color: $text-sub;
          font-size: 14px;
          font-weight: 500;
        }
      }

      // ─── 表单卡片统一样式 ───
      :deep(.t-card) {
        .t-card__header {
          border-bottom: 1.5px solid rgba(255, 181, 200, 0.15);
          padding: 12px 16px;
        }
      }

      // ─── 按钮统一样式 ───
      :deep(.t-button) {
        border-radius: 10px !important;
        font-weight: 600 !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;

        &.t-button--theme-primary {
          background: linear-gradient(135deg, $pink-400, $pink-500) !important;
          border: none !important;
          color: white !important;
          box-shadow: 0 2px 8px rgba(255, 107, 138, 0.25);

          &:hover {
            background: linear-gradient(135deg, $pink-300, $pink-400) !important;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(255, 107, 138, 0.35);
          }

          &:active {
            transform: translateY(1px) scale(0.98);
          }

          .t-button__text { color: white !important; }
          .t-button__icon { color: white !important; }
        }

        &.t-button--theme-default {
          background: rgba(255, 255, 255, 0.9) !important;
          border: 1.5px solid $pink-200 !important;
          color: $text-main !important;

          &:hover {
            border-color: $pink-400 !important;
            color: $pink-500 !important;
            transform: translateY(-1px);
          }

          &:active {
            transform: translateY(1px) scale(0.98);
          }

          .t-button__icon { color: $pink-400 !important; }
        }

        &.t-button--theme-danger {
          background: linear-gradient(135deg, #FF6B8A, #E34D59) !important;
          border: none !important;
          color: white !important;

          &:hover {
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(227, 77, 89, 0.35);
          }

          .t-button__text { color: white !important; }
          .t-button__icon { color: white !important; }
        }

        &.t-button--variant-text {
          color: $pink-400 !important;
          border-radius: 10px !important;

          .t-button__text { color: $pink-400 !important; }
          .t-button__icon { color: $pink-400 !important; }

          &:hover {
            background-color: rgba(255, 240, 243, 0.8) !important;
            color: $pink-500 !important;

            .t-button__text { color: $pink-500 !important; }
            .t-button__icon { color: $pink-500 !important; }
          }

          &:active {
            background-color: rgba(255, 214, 224, 0.5) !important;
          }
        }

        &.t-button--size-medium {
          height: 36px !important;
          padding: 0 16px !important;
        }

        &.t-button--size-small {
          height: 30px !important;
          padding: 0 10px !important;
          font-size: 12px !important;
        }
      }
    }
  }
}

// ─── 分页底栏 — 独立于 content-body，不随内容滚动 ───
.content-footer {
  flex-shrink: 0;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(12px);
  border-radius: 14px;
  border: 1.5px solid rgba(255, 181, 200, 0.2);
  box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);

  .content-footer-inner {
    display: flex;
    justify-content: flex-end;

    // ─── 分页组件主题色 ───
    :deep(.t-pagination) {
      .t-pagination__total {
        color: $text-sub;
        font-size: 13px;
      }

      .t-pagination__btn {
        color: $text-main;
        border-radius: 8px;
        min-width: 32px;
        height: 32px;
        border: 1px solid transparent;
        transition: all 0.3s;

        &:hover:not(.t-is-disabled):not(.t-is-current) {
          color: $pink-500;
          border-color: $pink-300;
          background: rgba(255, 143, 171, 0.08);
        }
      }

      .t-is-current {
        background: linear-gradient(135deg, $pink-400, $pink-500) !important;
        color: white !important;
        border-radius: 8px !important;
        border: none !important;
        box-shadow: 0 2px 8px rgba(255, 107, 138, 0.3);
        font-weight: 600;
      }

      .t-pagination__select {
        border-color: $pink-200 !important;
        border-radius: 8px !important;
        color: $text-main !important;

        &:hover {
          border-color: $pink-300 !important;
        }
      }

      .t-pagination__jumper-input {
        border-color: $pink-200 !important;
        border-radius: 8px !important;
        color: $text-main !important;
        width: 48px;

        &:focus,
        &:hover {
          border-color: $pink-400 !important;
          box-shadow: 0 0 0 2px rgba(255, 143, 171, 0.1);
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
    .sidebar-footer { padding: 10px 14px 14px; }
  }

  .right-content {
    gap: 8px;
    padding: 8px 12px;
  }

  .content-header {
    flex-wrap: wrap;
    padding: 10px 14px;

    .header-left .content-title { font-size: 18px; }

    .header-actions {
      flex-wrap: wrap;

      .header-search {
        max-width: 100%;
        flex: 1 1 auto;
      }
    }
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

    .header-actions {
      flex-wrap: wrap;
    }

    .header-action-buttons .action-btn { flex: 1; }
  }
}
</style>
