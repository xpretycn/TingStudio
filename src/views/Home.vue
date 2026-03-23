<template>
  <div class="home-page">
    <!-- 左侧导航功能区 -->
    <div class="left-sidebar">
      <!-- Logo -->
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

      <!-- 个人信息 -->
      <div class="sidebar-user">
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

      <!-- 日期和天气 -->
      <div class="sidebar-info">
        <div class="info-item">
          <div class="info-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div class="info-content">
            <div class="info-label">今日</div>
            <div class="info-value">{{ currentDate }}</div>
            <div class="info-sub">{{ currentWeekday }}</div>
          </div>
        </div>

        <div class="info-item">
          <div class="info-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          </div>
          <div class="info-content">
            <div class="info-label">{{ city }} · {{ weather }}</div>
            <div class="info-value">{{ temperature }}</div>
          </div>
        </div>
      </div>

      <!-- 今日祝福语 -->
      <div class="sidebar-blessing">
        <div class="blessing-icon">💖</div>
        <div class="blessing-text">{{ todayBlessing }}</div>
      </div>

      <!-- 视觉分隔线 -->
      <div class="sidebar-divider">
        <div class="divider-line"></div>
        <div class="divider-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v6m0 6v6m5.121-5.121l-4.242 4.242m-5.758-5.758L2.879 7.879m11.313 0l-4.242 4.242m-5.758-5.758L2.879 16.121" />
          </svg>
        </div>
        <div class="divider-line"></div>
      </div>

      <!-- 可折叠导航栏 -->
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

      <!-- 退出登录和锁屏 -->
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
        <h2 class="content-title">{{ pageTitle }}</h2>
        <div class="content-actions">
          <t-button theme="primary" size="large" @click="handleAdd" class="action-btn">
            <template #icon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </template>
            新增
          </t-button>
          <t-button theme="default" size="large" @click="handleRefresh" class="action-btn">
            <template #icon>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <polyline points="1 20 1 14 7 14" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </template>
            刷新
          </t-button>
        </div>
      </div>

      <!-- 动态内容区域 -->
      <div class="content-body">
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

          <!-- 内容区域 -->
          <div class="content-main">
            <router-view v-slot="{ Component }">
              <transition name="fade-slide" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MessagePlugin } from 'tdesign-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const navExpanded = ref(true)
const activePath = computed(() => route.path)

// 导航菜单项
const navItems = [
  { path: '/recent-formulas', label: '最近配方', icon: '🕐' },
  { path: '/formulas', label: '配方管理', icon: '📝' },
  { path: '/materials', label: '原材料管理', icon: '🧪' },
  { path: '/customers', label: '客户管理', icon: '👥' },
  { path: '/tools', label: '工具箱', icon: '🛠️' }
]

// 日期和星期
const currentDate = ref('')
const currentWeekday = ref('')

// 天气信息
const city = ref('北京')
const weather = ref('☀️ 晴')
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
    '/tools': '工具箱'
  }
  return titleMap[route.path] || '欢迎'
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
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  currentDate.value = `${year}-${month}-${day}`

  const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  currentWeekday.value = weekdays[now.getDay()]
}

// 随机祝福语
const blessings = [
  '愿你今天灵感如泉涌，创造美好配方！',
  '每一份努力都会有回报，加油！',
  '保持热爱，奔赴山海~',
  '今天的你依然闪闪发光 ✨',
  '愿所有的美好都如期而至',
  '相信自己，你可以做得更好！'
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
  weather.value = `${w.icon} ${w.text}`
  temperature.value = w.temp
}

// 获取城市定位
const getLocation = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // 根据经纬度获取城市（这里简化处理，实际需要调用地理编码API）
        const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京']
        const index = Math.floor(Math.random() * cities.length)
        city.value = cities[index]
      },
      (error) => {
        console.error('获取定位失败:', error)
        // 使用默认城市
        const cities = ['北京', '上海', '广州', '深圳']
        city.value = cities[Math.floor(Math.random() * cities.length)]
      }
    )
  } else {
    const cities = ['北京', '上海', '广州', '深圳']
    city.value = cities[Math.floor(Math.random() * cities.length)]
  }
}

onMounted(() => {
  updateDateInfo()
  updateBlessing()
  updateWeather()
  getLocation()
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

.home-page {
  display: flex;
  min-height: 100vh;
  background: $cream;
  font-family: 'PingFang SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

// ───── Left Sidebar ─────
.left-sidebar {
  width: 320px;
  background: linear-gradient(180deg, #FFF9F7 0%, #FFF0F3 50%, #F0E6FF 100%);
  border-right: 2px solid rgba(255, 143, 171, 0.15);
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
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
  }
}

// Logo
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px dashed rgba(255, 181, 200, 0.3);

  .logo-cat {
    width: 40px;
    height: 40px;
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

// User Info
.sidebar-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 181, 200, 0.2);
  box-shadow: 0 2px 12px rgba(255, 143, 171, 0.08);

  .user-avatar {
    width: 36px;
    height: 36px;
    flex-shrink: 0;

    svg {
      width: 100%;
      height: 100%;
    }
  }

  .user-info {
    flex: 1;

    .user-name {
      font-size: 13px;
      font-weight: 600;
      color: $text-main;
      margin-bottom: 2px;
    }

    .user-role {
      font-size: 10px;
      color: $text-sub;
      background: linear-gradient(135deg, $pink-300, $pink-400);
      color: white;
      padding: 1px 6px;
      border-radius: 6px;
      display: inline-block;
    }
  }
}

// Date & Weather
.sidebar-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;

  .info-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: rgba(255, 255, 255, 0.5);
    border-radius: 10px;
    border: 1px solid rgba(255, 181, 200, 0.15);
    transition: all 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.8);
      transform: translateX(4px);
      box-shadow: 0 4px 12px rgba(255, 143, 171, 0.1);
    }

    .info-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, $pink-100, $pink-200);
      display: flex;
      align-items: center;
      justify-content: center;
      color: $pink-500;
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;

      .info-label {
        font-size: 10px;
        color: $text-sub;
        margin-bottom: 2px;
      }

      .info-value {
        font-size: 13px;
        font-weight: 600;
        color: $text-main;
      }

      .info-sub {
        font-size: 11px;
        color: $pink-500;
        margin-top: 1px;
      }
    }
  }
}

// Blessing
.sidebar-blessing {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: linear-gradient(135deg, rgba(255, 143, 171, 0.1), rgba(240, 230, 255, 0.1));
  border-radius: 10px;
  margin-bottom: 12px;
  border: 1px solid rgba(255, 143, 171, 0.2);

  .blessing-icon {
    font-size: 18px;
    animation: heartBeat 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  .blessing-text {
    flex: 1;
    font-size: 11px;
    color: $text-main;
    line-height: 1.5;
    font-weight: 500;
  }
}

@keyframes heartBeat {
  0%, 100% { transform: scale(1); }
  15% { transform: scale(1.2); }
  30% { transform: scale(1); }
  45% { transform: scale(1.15); }
}

// Divider
.sidebar-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
  padding: 0 8px;

  .divider-line {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg,
      transparent,
      rgba(255, 181, 200, 0.4),
      rgba(240, 230, 255, 0.4),
      rgba(255, 181, 200, 0.4),
      transparent
    );
    border-radius: 1px;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255, 143, 171, 0.3), transparent);
      animation: shimmer 3s ease-in-out infinite;
    }
  }

  .divider-icon {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, $pink-200, $lavender);
    display: flex;
    align-items: center;
    justify-content: center;
    color: $pink-500;
    box-shadow: 0 2px 8px rgba(255, 143, 171, 0.15);
    animation: pulse 2s ease-in-out infinite;
    flex-shrink: 0;

    svg {
      width: 16px;
      height: 16px;
    }
  }
}

@keyframes shimmer {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 2px 8px rgba(255, 143, 171, 0.15); }
  50% { transform: scale(1.05); box-shadow: 0 4px 12px rgba(255, 143, 171, 0.25); }
}

// Navigation
.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-bottom: 12px;
  min-height: 0;

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

    .nav-icon {
      font-size: 16px;
    }

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
      max-height: 300px;
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

        svg {
          width: 12px;
          height: 12px;
        }
      }
    }
  }
}

// Footer
.sidebar-footer {
  .footer-buttons {
    display: flex;
    gap: 8px;

    .lock-btn,
    .logout-btn {
      flex: 1;
      height: 40px !important;
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

// ───── Right Content ─────
.right-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 2px solid rgba(255, 181, 200, 0.15);
  box-shadow: 0 2px 8px rgba(255, 143, 171, 0.05);

  .content-title {
    font-size: 26px;
    font-weight: 700;
    color: $text-main;
    margin: 0;
  }

  .content-actions {
    display: flex;
    gap: 12px;

    .action-btn {
      height: 44px !important;
      border-radius: 12px !important;
      font-size: 14px !important;
      font-weight: 600 !important;
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
          box-shadow: 0 2px 12px rgba(255, 107, 138, 0.35);
        }

        :deep(.t-button__icon) {
          color: white !important;
        }
      }

      &.t-button--theme-default {
        background: rgba(255, 255, 255, 0.9) !important;
        border: 2px solid $pink-200 !important;
        color: $text-main !important;

        &:hover {
          border-color: $pink-400 !important;
          color: $pink-500 !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 143, 171, 0.2);
        }

        &:active {
          transform: translateY(1px) scale(0.98);
        }

        :deep(.t-button__icon) {
          color: $pink-400 !important;
        }
      }
    }
  }
}

.content-body {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;

  .content-body-wrapper {
    position: relative;
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
          top: 20px;
          right: 40px;
          color: $pink-400;
          animation-delay: 0s;
        }

        &.decoration-icon-2 {
          top: 120px;
          right: 100px;
          color: $pink-300;
          animation-delay: 1s;
        }

        &.decoration-icon-3 {
          top: 80px;
          right: 180px;
          color: $lavender;
          animation-delay: 2s;
        }
      }
    }

    .content-main {
      position: relative;
      z-index: 1;
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(5deg);
  }
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

// Responsive
@media screen and (max-width: 1024px) {
  .left-sidebar {
    width: 280px;
    padding: 20px 16px;
  }

  .content-header {
    padding: 20px 24px;

    .content-title {
      font-size: 22px;
    }
  }

  .content-body {
    padding: 20px 24px;
  }
}

@media screen and (max-width: 768px) {
  .home-page {
    flex-direction: column;
  }

  .left-sidebar {
    width: 100%;
    max-height: 280px;
    overflow-y: auto;

    .sidebar-nav {
      flex: 0 0 auto;
    }
  }

  .right-content {
    flex: 1;
  }

  .content-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;

    .content-actions {
      justify-content: stretch;

      .action-btn {
        flex: 1;
      }
    }
  }
}
</style>
