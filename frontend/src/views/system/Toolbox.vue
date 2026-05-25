<template>
  <div class="tools-page">
    <!-- 工具卡片网格 -->
    <div class="tools-grid">
      <div v-for="tool in tools" :key="tool.id" class="tool-card" @click="handleToolClick(tool)">
        <div class="tool-icon" :style="{ background: tool.bgColor }">
          {{ tool.icon }}
        </div>
        <div class="tool-info">
          <h3 class="tool-title">{{ tool.title }}</h3>
          <p class="tool-desc">{{ tool.description }}</p>
        </div>
        <div class="tool-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </div>

    <!-- 天气详情区域 -->
    <div class="weather-section">
      <div class="weather-card">
        <div class="weather-header">
          <h3 class="weather-section-title">
            <span class="weather-section-icon">🌤️</span>
            实时天气
          </h3>
          <div class="weather-actions">
            <t-input
              v-model="searchKeyword"
              placeholder="搜索城市..."
              clearable
              size="small"
              class="city-search-input"
              @enter="handleSearch"
              @clear="handleClearSearch"
            >
              <template #prefix-icon>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </template>
            </t-input>
            <t-tooltip content="自动定位">
              <t-button
                theme="default"
                size="small"
                :loading="weatherStore.geoLoading"
                class="locate-btn"
                @click="weatherStore.autoLocate()"
              >
                <template #icon>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="22" y2="12" />
                  </svg>
                </template>
              </t-button>
            </t-tooltip>
          </div>
        </div>

        <!-- 搜索结果下拉 -->
        <div v-if="weatherStore.searchResults.length > 0" class="search-dropdown">
          <div
            v-for="city in weatherStore.searchResults"
            :key="city.id"
            class="search-item"
            @click="handleSelectCity(city)"
          >
            <span class="search-item-name">{{ city.name }}</span>
            <span class="search-item-detail">{{ city.adm1 }} · {{ city.adm2 }}</span>
          </div>
        </div>

        <!-- 加载状态 -->
        <div v-if="weatherStore.loading" class="weather-loading">
          <t-loading size="medium" text="正在获取天气数据..." />
        </div>

        <!-- 错误提示 -->
        <t-alert
          v-else-if="weatherStore.errorMsg"
          :theme="weatherStore.rateLimited ? 'warning' : 'error'"
          class="weather-error"
          closable
          @close="weatherStore.errorMsg = ''"
        >
          {{ weatherStore.errorMsg }}
        </t-alert>

        <!-- 天气数据展示 -->
        <div v-else-if="weatherStore.hasWeather" class="weather-content">
          <div class="weather-main">
            <div class="weather-temp-area">
              <span class="weather-emoji-lg">{{ weatherStore.weatherEmoji }}</span>
              <span class="weather-temp">{{ weatherStore.temperature }}<small>°C</small></span>
              <span class="weather-text">{{ weatherStore.weatherText }}</span>
            </div>
            <div class="weather-city">{{ weatherStore.cityName }}</div>
            <div v-if="weatherStore.updateTime" class="weather-update">
              更新于 {{ formatTime(weatherStore.updateTime) }}
            </div>
          </div>

          <div class="weather-details">
            <div class="detail-item">
              <span class="detail-label">体感温度</span>
              <span class="detail-value">{{ weatherStore.feelsLike }}°C</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">相对湿度</span>
              <span class="detail-value">{{ weatherStore.humidity }}%</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">风向风力</span>
              <span class="detail-value">{{ weatherStore.windDir }} {{ weatherStore.windScale }}级</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">风速</span>
              <span class="detail-value">{{ weatherStore.windSpeed }} km/h</span>
            </div>
          </div>
        </div>

        <!-- 无数据占位 -->
        <div v-else class="weather-empty">
          <span class="empty-icon">🌡️</span>
          <p>点击定位按钮或搜索城市名查看天气</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { MessagePlugin } from 'tdesign-vue-next'
import { useWeatherStore } from '@/stores/weather'
import type { CityLocation } from '@/api/weather'
import {
  gradientToolPink,
  gradientToolPurple,
  gradientToolBlue,
  gradientToolOrange,
  gradientToolGreen,
  gradientToolGray,
} from '@/assets/styles/tokens'

const weatherStore = useWeatherStore()
const searchKeyword = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const tools = ref([
  {
    id: 1,
    icon: '🧮',
    title: '配方计算器',
    description: '快速计算配方成分比例和成本',
    bgColor: gradientToolPink
  },
  {
    id: 2,
    icon: '📊',
    title: '数据统计',
    description: '查看配方和客户数据统计报表',
    bgColor: gradientToolPurple
  },
  {
    id: 3,
    icon: '🔍',
    title: '配方搜索',
    description: '按关键词快速查找配方',
    bgColor: gradientToolBlue
  },
  {
    id: 4,
    icon: '📋',
    title: '模板管理',
    description: '创建和管理常用配方模板',
    bgColor: gradientToolOrange
  },
  {
    id: 5,
    icon: '💾',
    title: '数据备份',
    description: '备份和恢复重要数据',
    bgColor: gradientToolGreen
  },
  {
    id: 6,
    icon: '⚙️',
    title: '系统设置',
    description: '配置系统参数和偏好设置',
    bgColor: gradientToolGray
  }
])

const handleToolClick = (tool: { id: number; icon: string; title: string; description: string; bgColor: string }) => {
  MessagePlugin.info(`${tool.title} 功能开发中，敬请期待~`)
}

// 300ms 防抖搜索
function handleSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    weatherStore.clearSearch()
    return
  }
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    weatherStore.searchAndFetchWeather(keyword)
  }, 300)
}

function handleClearSearch() {
  searchKeyword.value = ''
  weatherStore.clearSearch()
}

function handleSelectCity(city: CityLocation) {
  searchKeyword.value = city.name
  weatherStore.selectCity(city)
}

function formatTime(updateTime: string): string {
  if (!updateTime) return ''
  try {
    const date = new Date(updateTime)
    const h = String(date.getHours()).padStart(2, '0')
    const m = String(date.getMinutes()).padStart(2, '0')
    return `${h}:${m}`
  } catch {
    return updateTime
  }
}
</script>

<style scoped lang="scss">
.tools-page {
  width: 100%;
}

.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.tool-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: $overlay-white-80;
  backdrop-filter: blur(10px);
  border-radius: $radius-3xl;
  border: 2px solid $overlay-pink-lighter-15;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: $shadow-xs;

  &:hover {
    transform: translateY(-4px);
    box-shadow: $shadow-brand-sm;
    border-color: $overlay-pink-lighter-30;
  }

  &:active {
    transform: translateY(-2px) scale(0.98);
    transition: all 0.15s ease-out;
  }

  .tool-icon {
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    flex-shrink: 0;
  }

  .tool-info {
    flex: 1;

    .tool-title {
      font-size: 16px;
      font-weight: 600;
      color: $text-primary;
      margin: 0 0 var(--space-1-5) 0;
    }

    .tool-desc {
      font-size: 13px;
      color: $text-secondary;
      margin: 0;
      line-height: 1.5;
    }
  }

  .tool-arrow {
    color: $text-secondary;
    transition: all $transition-slow;
    flex-shrink: 0;
  }

  &:hover .tool-arrow {
    color: $brand-primary;
    transform: translateX(4px);
  }
}

// ─── 天气详情区域 ───
.weather-section {
  position: relative;
}

.weather-card {
  padding: 24px;
  background: $overlay-white-80;
  backdrop-filter: blur(10px);
  border-radius: $radius-3xl;
  border: 2px solid var(--overlay-brand-lighter-15);
  box-shadow: $shadow-xs;
}

.weather-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  .weather-section-title {
    font-size: 16px;
    font-weight: 600;
    color: $text-primary;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 8px;

    .weather-section-icon {
      font-size: 20px;
    }
  }

  .weather-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .city-search-input {
      width: 200px;

      :deep(.t-input) {
        border-radius: 10px;
        border-color: var(--color-primary-lightest);
        background: var(--overlay-brand-bg-30);

        &:hover { border-color: var(--color-primary-lighter); }
        &:focus-within {
          border-color: var(--color-primary-light);
          box-shadow: 0 0 0 3px var(--overlay-brand-10);
        }
      }
    }

    .locate-btn {
      flex-shrink: 0;
      border-radius: 10px;
    }
  }
}

// 搜索结果下拉
.search-dropdown {
  margin: -12px 0 16px;
  padding: var(--space-1-5);
  background: $bg-container;
  border-radius: 12px;
  border: 1.5px solid var(--color-primary-lightest);
  box-shadow: $shadow-md;

  .search-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-2-5) 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: var(--overlay-brand-08);
    }

    .search-item-name {
      font-size: 14px;
      font-weight: 500;
      color: $text-primary;
    }

    .search-item-detail {
      font-size: 12px;
      color: $text-secondary;
    }
  }
}

// 加载状态
.weather-loading {
  display: flex;
  justify-content: center;
  padding: 40px 0;
}

// 错误提示
.weather-error {
  margin-bottom: 0;
}

// 天气数据
.weather-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.weather-main {
  text-align: center;

  .weather-temp-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    margin-bottom: 8px;

    .weather-emoji-lg {
      font-size: 56px;
      line-height: 1;
      filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
    }

    .weather-temp {
      font-size: 48px;
      font-weight: 700;
      color: $text-primary;
      line-height: 1;
      letter-spacing: -2px;

      small {
        font-size: 20px;
        font-weight: 500;
        color: $text-secondary;
        vertical-align: super;
        letter-spacing: 0;
      }
    }

    .weather-text {
      font-size: 20px;
      font-weight: 500;
      color: var(--color-primary);
    }
  }

  .weather-city {
    font-size: 16px;
    color: $text-secondary;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .weather-update {
    font-size: 12px;
    color: $text-placeholder;
  }
}

.weather-details {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;

  .detail-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-3-5) 16px;
    background: $bg-page;
    border-radius: 12px;
    border: 1px solid $border-color-light;
    transition: all $transition-slow;

    &:hover {
      box-shadow: $shadow-xs;
      border-color: var(--color-primary-lightest);
    }

    .detail-label {
      font-size: 13px;
      color: $text-secondary;
    }

    .detail-value {
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }
  }
}

// 无数据占位
.weather-empty {
  text-align: center;
  padding: 40px 0;
  color: $text-secondary;

  .empty-icon {
    font-size: 48px;
    display: block;
    margin-bottom: 12px;
    opacity: 0.6;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
}

// Responsive
@media screen and (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }

  .tool-card {
    padding: 20px;

    .tool-icon {
      width: 56px;
      height: 56px;
      font-size: 28px;
    }
  }

  .weather-header {
    flex-direction: column;
    align-items: flex-start;

    .weather-actions {
      width: 100%;

      .city-search-input {
        flex: 1;
        width: auto;
      }
    }
  }

  .weather-details {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>


