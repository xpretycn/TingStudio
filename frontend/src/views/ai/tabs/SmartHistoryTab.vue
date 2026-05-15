<template>
  <div class="smart-history-tab">
    <div class="history-toolbar">
      <div class="history-filters">
        <button v-for="f in filterOptions" :key="f.value" type="button" class="filter-btn"
          :class="{ active: activeFilter === f.value }" @click="activeFilter = f.value">
          {{ f.label }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="history-loading">
      <t-loading size="medium" />
      <span>加载中...</span>
    </div>

    <div v-else-if="items.length === 0" class="history-empty">
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" stroke-width="1.5"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <p class="empty-title">暂无解析记录</p>
      <p class="empty-desc">使用智能填单、智能导入或智能查询后，记录将在此展示</p>
    </div>

    <div v-else class="history-list">
      <div v-for="item in items" :key="item.id" class="history-card" :class="'history-card--' + item.status">
        <div class="history-card-header">
          <div class="history-card-type">
            <span class="type-badge" :class="'type-badge--' + item.callType">{{ item.toolLabel }}</span>
            <span class="status-dot" :class="'status-dot--' + item.status"></span>
            <span class="status-text">{{ item.status === 'success' ? '成功' : '失败' }}</span>
          </div>
          <span class="history-card-time">{{ formatTime(item.createdAt) }}</span>
        </div>
        <div class="history-card-body">
          <div class="history-card-meta">
            <span class="meta-item meta-item--model">
              <img v-if="getModelLogo(item.provider)" :src="getModelLogo(item.provider)" :alt="item.modelName"
                class="model-logo-mini" @error="(e: Event) => handleLogoError(e, item.provider)" />
              <span v-else class="model-letter-mini" :style="{ color: getFallbackColor(item.provider) }">
                {{ getFallbackLetter(item.provider) }}
              </span>
              <span class="model-name-text">{{ item.modelName }}</span>
            </span>
            <span v-if="item.totalTokens" class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
              </svg>
              {{ item.totalTokens }} tokens
            </span>
            <span v-if="item.latencyMs" class="meta-item">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {{ formatLatency(item.latencyMs) }}
            </span>
          </div>
          <p v-if="item.requestSummary" class="history-card-summary">{{ item.requestSummary }}</p>
          <p v-if="item.status !== 'success' && item.errorMessage" class="history-card-error">
            {{ item.errorMessage }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="pagination.total > 0" class="table-pagination">
      <div class="pagination-info">
        显示第 {{ (pagination.page - 1) * pagination.pageSize + 1 }}-{{
          Math.min(pagination.page * pagination.pageSize, pagination.total) }} 条，
        共 {{ pagination.total }} 条数据
      </div>
      <div class="pagination-controls">
        <button class="pagination-btn" :class="{ 'pagination-btn--disabled': pagination.page === 1 }"
          :disabled="pagination.page === 1" @click="goPage(pagination.page - 1)">上一页</button>
        <template v-for="page in pageNumbers" :key="page">
          <button v-if="page !== '...'" class="pagination-btn"
            :class="{ 'pagination-btn--active': page === pagination.page }"
            @click="typeof page === 'number' && goPage(page)">{{ page }}</button>
          <span v-else class="pagination-ellipsis">...</span>
        </template>
        <button class="pagination-btn"
          :class="{ 'pagination-btn--disabled': pagination.page >= pagination.totalPages }"
          :disabled="pagination.page >= pagination.totalPages"
          @click="goPage(pagination.page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { modelApi } from '@/api/model'

const loading = ref(false)
const items = ref<any[]>([])
const pageSize = 10
const activeFilter = ref('all')

const pagination = ref({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
})

const filterOptions = [
  { label: '全部', value: 'all' },
  { label: '智能填单', value: 'parse_formula' },
  { label: '智能导入', value: 'parse_nutrition' },
  { label: '智能查询', value: 'natural_search' },
]

const pageNumbers = computed<(number | string)[]>(() => {
  const total = pagination.value.totalPages
  const current = pagination.value.page
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, '...', total]
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
})

const goPage = (page: number) => {
  if (page < 1 || page > pagination.value.totalPages) return
  pagination.value.page = page
  fetchData()
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize,
    }
    if (activeFilter.value !== 'all') {
      params.callType = activeFilter.value
    }
    const res = await modelApi.getSmartToolHistory(params)
    const data = res.data || res
    items.value = data.list || []
    pagination.value = data.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 }
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

watch(activeFilter, () => {
  pagination.value.page = 1
  fetchData()
})

const MODEL_LOGO_MAP: Record<string, string> = {
  openai: 'openai',
  gpt: 'openai',
  chatgpt: 'openai',
  anthropic: 'claude',
  claude: 'claude',
  google: 'google',
  gemini: 'google',
  deepseek: 'deepseek',
  qwen: 'qwen',
  tongyi: 'qwen',
  dashscope: 'qwen',
  zhipu: 'zhipu',
  chatglm: 'zhipu',
  glm: 'zhipu',
  baidu: 'baidu',
  wenxin: 'baidu',
  doubao: 'bytedance',
  bytedance: 'bytedance',
  moonshot: 'moonshot',
  kimi: 'moonshot',
  minimax: 'minimax',
  hunyuan: 'tencent',
  tencent: 'tencent',
}

const FALLBACK_ICONS: Record<string, { letter: string; color: string }> = {
  openai: { letter: 'O', color: '#10a37f' },
  claude: { letter: 'C', color: '#d97757' },
  google: { letter: 'G', color: '#4285f4' },
  deepseek: { letter: 'D', color: '#4b6bfb' },
  qwen: { letter: 'Q', color: '#6366f1' },
  dashscope: { letter: 'Q', color: '#6366f1' },
  zhipu: { letter: 'Z', color: '#4268fa' },
  baidu: { letter: 'B', color: '#2932e1' },
  bytedance: { letter: 'D', color: '#25f4ee' },
  moonshot: { letter: 'M', color: '#000' },
  minimax: { letter: 'M', color: '#615ced' },
  tencent: { letter: 'T', color: '#0052d9' },
}

const getModelSlug = (provider: string): string => {
  const p = (provider || '').toLowerCase()
  for (const [key, slug] of Object.entries(MODEL_LOGO_MAP)) {
    if (p.includes(key)) return slug
  }
  return ''
}

const getModelLogo = (provider: string): string => {
  const slug = getModelSlug(provider)
  if (!slug) return ''
  return `https://unpkg.com/@lobehub/icons-static-svg@latest/icons/${slug}.svg`
}

const getFallbackLetter = (provider: string): string => {
  const slug = getModelSlug(provider)
  return FALLBACK_ICONS[slug]?.letter || (provider || '?')[0].toUpperCase()
}

const getFallbackColor = (provider: string): string => {
  const slug = getModelSlug(provider)
  return FALLBACK_ICONS[slug]?.color || '#94a3b8'
}

const handleLogoError = (e: Event, _provider: string) => {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    const fallback = parent.querySelector('.model-letter-mini')
    if (fallback) (fallback as HTMLElement).style.display = 'flex'
  }
}

const formatTime = (time: string) => {
  if (!time) return ''
  const d = new Date(time)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  return d.toLocaleString('zh-CN')
}

const formatLatency = (ms: number) => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

onMounted(fetchData)
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables.scss' as *;

.smart-history-tab {
  min-height: 400px;
}

.history-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.history-filters {
  display: flex;
  gap: 6px;

  .filter-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    background: transparent;
    color: #64748b;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: #f1f5f9;
      color: #334155;
    }

    &.active {
      background: #f0fdf4;
      border-color: #86efac;
      color: #059669;
      font-weight: 600;
    }
  }
}

.history-loading,
.history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  color: #94a3b8;
  font-size: 14px;

  .empty-title {
    font-size: 16px;
    font-weight: 600;
    color: #64748b;
    margin: 0;
  }

  .empty-desc {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-card {
  background: #fff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  padding: 16px 20px;
  transition: all 0.2s;

  &:hover {
    border-color: #e2e8f0;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }

  &--error {
    border-left: 3px solid #ef4444;
  }

  &--success {
    border-left: 3px solid #10b981;
  }
}

.history-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.history-card-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;

  &--parse_formula {
    background: #eff6ff;
    color: #3b82f6;
  }

  &--parse_nutrition {
    background: #faf5ff;
    color: #a855f7;
  }

  &--natural_search {
    background: #fff7ed;
    color: #f97316;
  }
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;

  &--success {
    background: #10b981;
  }

  &--error {
    background: #ef4444;
  }
}

.status-text {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
}

.history-card-time {
  font-size: 12px;
  color: #94a3b8;
}

.history-card-body {
  .history-card-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;

    .meta-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: #64748b;

      svg {
        color: #94a3b8;
        flex-shrink: 0;
      }
    }

    .meta-item--model {
      gap: 6px;

      .model-logo-mini {
        width: 18px;
        height: 18px;
        object-fit: contain;
        flex-shrink: 0;
      }

      .model-letter-mini {
        display: none;
        width: 18px;
        height: 18px;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: 700;
        background: #f1f5f9;
        border-radius: 4px;
        flex-shrink: 0;
      }

      .model-name-text {
        font-weight: 500;
      }
    }
  }

  .history-card-summary {
    font-size: 13px;
    color: #475569;
    margin: 8px 0 0 0;
    line-height: 1.5;
  }

  .history-card-error {
    font-size: 13px;
    color: #ef4444;
    margin: 8px 0 0 0;
    line-height: 1.5;
  }
}

.table-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 0 0 0;
  margin-top: 24px;
  border-top: 1px solid #f8fafc;

  .pagination-info {
    font-size: 13px;
    color: #64748B;
  }

  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 4px;

    .pagination-btn {
      min-width: 36px;
      height: 34px;
      padding: 0 10px;
      border-radius: 10px;
      border: 1px solid #E2E8F0;
      background: #fff;
      font-size: 13px;
      font-weight: 500;
      color: #475569;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(.pagination-btn--disabled) {
        border-color: #6EE7B7;
        color: #059669;
        background: #ECFDF5;
      }

      &.pagination-btn--active {
        background: linear-gradient(135deg, #10B981, #059669);
        color: #fff;
        border-color: transparent;
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
      }

      &.pagination-btn--disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    .pagination-ellipsis {
      color: #CBD5E1;
      padding: 0 4px;
      font-size: 13px;
    }
  }
}
</style>
