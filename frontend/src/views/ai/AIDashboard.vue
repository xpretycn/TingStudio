<template>
  <div class="ai-dashboard" :aria-busy="isLoading" role="main" aria-label="AI 助手工作台">
    <!-- Phase 5: 全局错误提示 -->
    <Transition name="error-fade">
      <div v-if="globalError" class="global-error-toast" role="alert" aria-live="assertive">
        <t-icon name="error-circle" size="20px" />
        <span>{{ globalError }}</span>
        <button @click="globalError = null" class="error-close-btn" aria-label="关闭错误提示">×</button>
      </div>
    </Transition>

    <!-- ═══ 三栏布局容器 ═══ -->
    <div class="dashboard-layout">

      <!-- ═══ 左侧栏：数据卡片 + 快捷操作 ═══ -->
      <aside class="layout-sidebar layout-left">
        <section class="data-overview-cards">
          <TransitionGroup name="card-fade" tag="div" class="cards-grid">
            <div v-for="(card, index) in dataCards" :key="card.id" class="data-card"
              :class="[`card-${card.color}`, { loading: card.loading }]" :style="{ animationDelay: `${index * 0.1}s` }"
              @click="handleCardClick(card)">
              <div class="card-header">
                <t-icon :name="card.icon" size="24px" />
                <span class="card-title">{{ card.title }}</span>
              </div>

              <div class="card-value">
                <template v-if="card.loading">
                  <div class="skeleton-value"></div>
                </template>
                <template v-else>
                  <span class="value-number" :ref="el => { if (el) valueRefs[index] = el; }">
                    {{ formatNumber(card.value) }}
                  </span>
                </template>
              </div>

              <div class="card-trend" v-if="card.trend && !card.loading">
                <t-icon :name="getTrendIcon(card.trend.direction)" size="14px" />
                <span :class="`trend-${card.trend.direction}`">{{ card.trend.value }}</span>
              </div>

              <div class="card-badge" v-if="card.showBadge && (card.value ?? 0) > 0 && !card.loading">
                {{ card.value ?? 0 }}
              </div>
            </div>
          </TransitionGroup>
        </section>

        <!-- ═══ 快捷操作 ═══ -->
        <section class="quick-actions-row">
          <div class="quick-actions-grid">
            <button v-for="action in quickActions" :key="action.path" class="action-item"
              :class="{ primary: action.primary, 'ai-feature': action.isAIFeature }" @click="handleQuickAction(action)">
              <t-icon :name="action.icon" size="24px" />
              <span class="action-label">{{ action.label }}</span>
              <span v-if="action.badge" class="action-badge">{{ action.badge }}</span>
            </button>
          </div>
        </section>
      </aside>

      <!-- ═══ 中间主区：区域3 - AI对话区（核心） ═══ -->
      <main class="layout-main">
        <section class="ai-chat-section">
          <div class="chat-header">
            <div class="header-left">
              <h3 class="chat-title">💬 AI 智能助手</h3>
              <span class="model-indicator">当前模型: {{ displayModelName }}</span>
            </div>
            <div class="header-right">
              <button class="history-btn" @click="toggleHistory">
                <t-icon name="history" size="16px" /> 历史记录
              </button>
              <button class="new-chat-btn" @click="createNewSession">
                <t-icon name="add" size="16px" /> 新对话
              </button>
            </div>
          </div>

          <div class="chat-container">
            <!-- AI 对话 Tab 内容 -->
            <template v-if="activeTab === 'chat'">
              <!-- 历史会话侧边栏 -->
              <Transition name="slide">
                <aside v-if="showHistory" class="history-sidebar">
                  <div class="history-header">
                    <h4>历史会话</h4>
                    <button @click="showHistory = false" class="close-btn">×</button>
                  </div>
                  <div class="history-list">
                    <div v-for="session in sessions" :key="session.id" class="history-item"
                      :class="{ active: conversationId === session.id }" @click="switchToSession(session.id)">
                      <span class="session-title">{{ session.title }}</span>
                      <span class="session-time">{{ formatRelativeTime(session.updatedAt) }}</span>
                    </div>
                    <div v-if="sessions.length === 0" class="empty-sessions">
                      暂无历史会话
                    </div>
                  </div>
                </aside>
              </Transition>

              <!-- 消息区域 -->
              <div class="messages-wrapper" ref="messagesContainer">
                <!-- 欢迎消息 -->
                <div v-if="messages.length === 0" class="welcome-message">
                  <div class="welcome-header">
                    <div class="welcome-logo">
                      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
                        <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
                        <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
                        <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                        <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                        <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                        <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                        <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
                        <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none"
                          stroke-linecap="round" />
                        <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                        <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                      </svg>
                    </div>
                    <h3>你好！我是TingStudio AI助手</h3>
                  </div>
                  <p>我可以帮你：</p>
                  <ul class="welcome-features">
                    <li @click="handleQuickQuestion('分析销售数据和趋势')">✨ 分析销售数据和趋势</li>
                    <li @click="handleQuickQuestion('优化配方和降低成本')">✨ 优化配方和降低成本</li>
                    <li @click="handleQuickQuestion('管理原料库存和采购')">✨ 管理原料库存和采购</li>
                    <li @click="handleQuickQuestion('生成各类业务报告')">✨ 生成各类业务报告</li>
                  </ul>
                  <p class="welcome-hint">试试问我一个问题吧！</p>
                </div>

                <!-- 消息列表 -->
                <div v-for="msg in messages" :key="msg.id" class="message-item" :class="[`message-${msg.role}`]">
                  <!-- 用户消息 -->
                  <template v-if="msg.role === 'user'">
                    <div class="user-bubble">{{ msg.content }}</div>
                    <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
                  </template>

                  <!-- AI消息 -->
                  <template v-else-if="msg.role === 'assistant'">
                    <div class="avatar-logo">
                      <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
                        <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
                        <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
                        <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                        <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                        <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                        <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                        <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
                        <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none"
                          stroke-linecap="round" />
                        <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                        <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                      </svg>
                    </div>
                    <div class="assistant-bubble">
                      <div class="markdown-content" v-html="renderMarkdown(msg.content)"></div>

                      <!-- 可执行操作按钮组 -->
                      <div v-if="msg.actions?.length > 0" class="message-actions">
                        <button v-for="action in msg.actions" :key="action.id" class="action-btn"
                          @click="executeAction(action)">
                          <t-icon v-if="action.icon" :name="action.icon" size="14px" />
                          {{ action.label }}
                        </button>
                      </div>

                      <div class="message-meta" v-if="msg.metadata">
                        <span>{{ msg.metadata.model }}</span>
                        <span>·</span>
                        <span>{{ msg.metadata.latency }}ms</span>
                      </div>
                    </div>
                  </template>
                </div>

                <!-- 流式输出中的临时消息 -->
                <div v-if="isLoading && streamingContent" class="message-item message-assistant">
                  <div class="avatar-logo">
                    <svg viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="30" cy="32" r="20" fill="#FFE8D6" />
                      <path d="M14 22L10 4L26 16Z" fill="#FFB5C8" />
                      <path d="M46 22L50 4L34 16Z" fill="#FFB5C8" />
                      <ellipse cx="24" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                      <ellipse cx="36" cy="30" rx="3.5" ry="4" fill="#5D4E60" />
                      <ellipse cx="25" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                      <ellipse cx="37" cy="28.5" rx="1.2" ry="1.5" fill="#fff" />
                      <ellipse cx="30" cy="35.5" rx="2.5" ry="1.8" fill="#FFB5C2" />
                      <path d="M27 38Q30 42 33 38" stroke="#E8A0B0" stroke-width="1" fill="none"
                        stroke-linecap="round" />
                      <ellipse cx="20" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                      <ellipse cx="40" cy="36" rx="4" ry="2.5" fill="#FFB5C2" opacity="0.35" />
                    </svg>
                  </div>
                  <div class="assistant-bubble typing">
                    <div class="markdown-content" v-html="renderMarkdown(streamingContent)"></div>
                    <span class="cursor-blink">|</span>
                  </div>
                </div>

                <!-- 加载指示器 -->
                <div v-if="isLoading && !streamingContent" class="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>

              <!-- 快捷标签栏 -->
              <div class="quick-tags-bar">
                <button v-for="tag in quickTags" :key="tag" class="quick-tag" @click="inputText = tag; handleSend()">
                  {{ tag }}
                </button>
              </div>

              <!-- 输入框区域 -->
              <div class="chat-input-bar">
                <div class="input-wrapper">
                  <textarea v-model="inputText" placeholder="输入问题或指令... (Shift+Enter换行)"
                    @keydown.enter.exact="handleSend" :disabled="isLoading" rows="1" ref="textareaRef"></textarea>
                  <div class="input-actions">
                    <label class="attach-btn" title="上传图片">
                      <t-icon name="attach" size="18px" />
                      <input type="file" accept="image/*,.pdf,.xlsx" @change="handleFileUpload" hidden />
                    </label>
                    <button class="send-btn" @click="handleSend" :disabled="!inputText.trim() && !selectedFile"
                      :loading="isLoading">
                      <t-icon name="send" size="18px" />
                    </button>
                  </div>
                </div>
                <div class="input-hint">
                  AI基于 {{ displayModelName }} 模型 · 内容可能存在误差 · 支持图片上传
                </div>
              </div>
            </template>
          </div>
        </section>
      </main>

      <!-- ═══ 智能填单模态框 ═══ -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showSmartFormModal" class="modal-overlay" @click.self="showSmartFormModal = false">
            <div class="modal-container">
              <div class="modal-header">
                <h3>📝 智能填单</h3>
                <button @click="showSmartFormModal = false" class="modal-close-btn">×</button>
              </div>
              <div class="modal-body">
                <SmartFormTab @activity-add="addActivity" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- ═══ 智能导入模态框 ═══ -->
      <Teleport to="body">
        <Transition name="modal-fade">
          <div v-if="showSmartImportModal" class="modal-overlay" @click.self="showSmartImportModal = false">
            <div class="modal-container">
              <div class="modal-header">
                <h3>📥 智能导入</h3>
                <button @click="showSmartImportModal = false" class="modal-close-btn">×</button>
              </div>
              <div class="modal-body">
                <SmartImportTab @activity-add="addActivity" />
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <!-- ═══ 右侧栏：AI推荐 + 最近访问&待办 ═══ -->
      <aside class="layout-sidebar layout-right">
        <div class="ai-suggestion-bubble">
          <div class="bubble-header">
            <div class="ai-logo">
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
            <span class="bubble-title">AI 推荐操作</span>
            <button class="refresh-btn" @click="shuffleSuggestions" title="刷新推荐">
              <t-icon name="refresh" size="14px" />
            </button>
          </div>
          <div class="bubble-content">
            <div v-for="(suggestion, index) in displayedSuggestions" :key="index" class="suggestion-item"
              @click="handleSuggestionClick(suggestion.text)">
              <span class="suggestion-text">{{ suggestion.text }}</span>
              <t-icon name="chevron-right" size="14px" class="arrow-icon" />
            </div>
          </div>
          <div class="bubble-footer">
            <span class="footer-hint">基于你的使用习惯智能推荐</span>
          </div>
        </div>

        <!-- ═══ 最近访问 & 待办事项 ═══ -->
        <section class="activity-footer">
          <div class="recent-visits">
            <div class="section-header">
              <h4>🕐 最近访问</h4>
              <button class="clear-btn" @click="clearVisits" title="清除记录">清除</button>
            </div>
            <div class="visits-list">
              <div v-for="visit in recentVisits.slice(0, 5)" :key="visit.path" class="visit-item"
                @click="navigateTo(visit.path)">
                <t-icon :name="visit.icon" size="16px" />
                <span class="visit-title">{{ visit.title }}</span>
                <span class="visit-time">{{ formatRelativeTime(visit.timestamp) }}</span>
              </div>
              <div v-if="recentVisits.length === 0" class="empty-state">
                暂无访问记录
              </div>
            </div>
          </div>

          <div class="pending-tasks">
            <div class="section-header">
              <h4>📋 我的待办</h4>
            </div>
            <div class="tasks-list">
              <div v-for="task in pendingTasks" :key="task.id" class="task-item"
                :class="[`type-${task.type}`, `priority-${task.priority}`]">
                <button class="check-btn" @click="toggleTaskComplete(task.id)" title="标记完成">
                  <t-icon v-if="task.completed" name="check" size="12px" />
                  <span v-else class="check-circle"></span>
                </button>
                <div class="task-content">
                  <span class="task-title">{{ task.title }}</span>
                  <span class="task-meta">
                    {{ getTypeLabel(task.type) }} · {{ formatRelativeTime(task.createdAt) }}
                  </span>
                </div>
                <button v-if="task.relatedPath" class="go-btn" @click="navigateTo(task.relatedPath)">
                  <t-icon name="chevron-right" size="14px" />
                </button>
              </div>
              <div v-if="pendingTasks.length === 0 && !tasksLoading" class="empty-state">
                🎉 太棒了！没有待处理任务
              </div>
              <div v-if="tasksLoading" class="loading-state">
                <t-loading size="small" />
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { marked } from 'marked';
import http from '@/api/http';
import SmartFormTab from './tabs/SmartFormTab.vue';
import SmartImportTab from './tabs/SmartImportTab.vue';

const router = useRouter();
const route = useRoute();

// ════════════════════════════════════════
// Tab 切换状态
// ════════════════════════════════════════
const activeTab = ref<'chat'>('chat');

// 模态框状态（用于智能填单/导入）
const showSmartFormModal = ref(false);
const showSmartImportModal = ref(false);

// ════════════════════════════════════════
// 状态定义
// ════════════════════════════════════════

// AI俏皮话
const wittyComment = ref('');
const wittyLoading = ref(false);
const FALLBACK_POOL = [
  "又是搬砖的一天，今天也要加油哦 💪",
  "配方调得再好，也别忘了喝水 🥤",
  "据说周五的配方成功率最高，是真的吗？🤔",
  "今天的原料价格波动了吗？快去看看吧 👀",
  "AI提示：连续工作2小时记得站起来活动一下 🏃",
  "周一综合症？不存在的，我们有AI助手呀 😎",
  "库存不足预警比闹钟还准时呢 ⏰",
  "今天的目标：完成3个配方优化任务 🎯"
];

// 数据卡片
interface DataCard {
  id: string;
  title: string;
  icon: string;
  value: number | null;
  trend: { direction: 'up' | 'down' | 'neutral'; value: string; } | null;
  loading: boolean;
  color: string;
  clickPath: string | null;
  showBadge?: boolean;
}

// ════════════════════════════════════════
// Phase 5: 错误处理与性能优化工具
// ════════════════════════════════════════

// 全局错误状态
const globalError = ref<string | null>(null);
const showErrorToast = (message: string) => {
  globalError.value = message;
  console.error('[Dashboard Error]', message);

  // 5秒后自动清除错误
  setTimeout(() => {
    if (globalError.value === message) {
      globalError.value = null;
    }
  }, 5000);
};

// 防抖函数（Phase 5 预留，按需启用）
// const debounce = <T extends (...args: any[]) => any>(
//   fn: T,
//   delay: number = 300
// ): ((...args: Parameters<T>) => void) => {
//   let timeoutId: ReturnType<typeof setTimeout>
//   return (...args: Parameters<T>) => {
//     clearTimeout(timeoutId)
//     timeoutId = setTimeout(() => fn(...args), delay)
//   }
// }

// 性能监控
const performanceMetrics = ref({
  loadTime: 0,
  apiCalls: 0,
  errors: 0,
  lastUpdated: null as Date | null
});

const recordPerformance = (metric: keyof typeof performanceMetrics.value, value?: any) => {
  if (metric === 'apiCalls' || metric === 'errors') {
    performanceMetrics.value[metric]++;
  } else if (metric === 'lastUpdated') {
    performanceMetrics.value[metric] = new Date();
  } else if (metric === 'loadTime' && typeof value === 'number') {
    performanceMetrics.value[metric] = value;
  }
};

// 使用防抖优化的搜索/输入处理（Phase 5 预留，按需启用）
// const debouncedHandleSend: ((...args: any[]) => void) | null = null

const dataCards = ref<DataCard[]>([
  {
    id: 'formulas',
    title: '配方总数',
    icon: 'edit',
    value: null,
    trend: null,
    loading: true,
    color: 'emerald',
    clickPath: '/formulas'
  },
  {
    id: 'materials',
    title: '原料种类',
    icon: 'chart-bar',
    value: null,
    trend: null,
    loading: true,
    color: 'blue',
    clickPath: '/materials'
  },
  {
    id: 'sales',
    title: '本月销量',
    icon: 'chart',
    value: null,
    trend: null,
    loading: true,
    color: 'purple',
    clickPath: '/sales'
  },
  {
    id: 'pending',
    title: '待处理任务',
    icon: 'time',
    value: null,
    trend: null,
    loading: true,
    color: 'amber',
    clickPath: null,
    showBadge: true
  }
]);

const valueRefs = ref<any[]>([]);

// 快捷操作
const quickActions = [
  { label: '+ 新建配方', icon: 'add-circle', path: '/formulas/new', primary: true },
  { label: '+ 添加原料', icon: 'add', path: '/materials/new' },
  { label: '生成周报', icon: 'file-icon', path: '/reports/generate?type=weekly' },
  { label: '导出数据', icon: 'download', path: '/exports' },
  { label: '📝 智能填单', icon: 'edit', path: 'smart-form', isAIFeature: true, badge: 'AI', action: 'tab' },
  { label: '📥 智能导入', icon: 'upload', path: 'smart-import', isAIFeature: true, badge: 'AI', action: 'tab' }
];

// AI推荐
interface Suggestion {
  text: string;
  category: string;
}

const STATIC_SUGGESTIONS: Suggestion[] = [
  { text: '帮我分析本月销量趋势 📈', category: 'analytics' },
  { text: '检查哪些原料库存不足 🧪', category: 'analytics' },
  { text: '生成本周业务周报 📝', category: 'reporting' },
  { text: '对比上月配方使用情况 📊', category: 'analytics' },
  { text: '预测下季度原料需求 🔮', category: 'optimization' },
  { text: '优化配方的成本结构 💰', category: 'optimization' },
  { text: '创建新的实验配方 🧪', category: 'creation' },
  { text: '导出本季度销售报表 📄', category: 'reporting' }
];

const displayedSuggestions = ref<Suggestion[]>([]);

// AI对话状态
const messages = ref<any[]>([]);
const inputText = ref('');
const isLoading = ref(false);
const streamingContent = ref('');
const conversationId = ref<string | null>(null);
const showHistory = ref(false);
const sessions = ref<any[]>([]);
const currentModel = ref('deepseek');
const selectedFile = ref<File | null>(null);

// 模型显示名称映射
const modelDisplayNames: Record<string, string> = {
  'deepseek': 'DeepSeek V3',
  'dashscope': '通义千问',
  'zhipu': '智谱GLM'
};

const displayModelName = computed(() => modelDisplayNames[currentModel.value] || currentModel.value);

const quickTags = ['📊 本月销量概况', '📝 创建新配方', '🧪 库存不足预警'];

// 最近访问
const recentVisits = ref<any[]>([]);

// 待办事项
const pendingTasks = ref<any[]>([]);
const tasksLoading = ref(false);

// DOM引用
const messagesContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// ════════════════════════════════════════
// 方法实现
// ════════════════════════════════════════

// 导航方法
const navigateTo = (path: string) => {
  router.push(path);
};

// 处理快捷操作点击（支持模态框和页面导航）
const handleQuickAction = (action: any) => {
  if (action.action === 'tab') {
    if (action.path === 'smart-form') {
      showSmartFormModal.value = true;
    } else if (action.path === 'smart-import') {
      showSmartImportModal.value = true;
    }
  } else {
    navigateTo(action.path);
  }
};

// 刷新俏皮话
const refreshWittyComment = async () => {
  if (wittyLoading.value) return;
  wittyLoading.value = true;

  try {
    const today = new Date().toDateString();
    const cacheKey = `witty_comment_${today}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      wittyComment.value = JSON.parse(cached).comment;
    } else {
      // 随机选择一条（Phase 2将接入真实API）
      await new Promise(resolve => setTimeout(resolve, 300)); // 模拟延迟
      const randomComment = FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
      wittyComment.value = randomComment;

      localStorage.setItem(cacheKey, JSON.stringify({
        comment: randomComment,
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.error('Failed to load witty comment:', error);
    wittyComment.value = FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
  } finally {
    wittyLoading.value = false;
  }
};

// 数据卡片点击
const handleCardClick = (card: DataCard) => {
  if (card.clickPath) {
    navigateTo(card.clickPath);
  }
};

// 格式化数字（大数以万为单位）
const formatNumber = (num: number | null): string => {
  if (num === null) return '0';
  if (typeof num === 'string') return num;
  if (num >= 10000) {
    const wan = (num / 10000).toFixed(num % 10000 === 0 ? 0 : 1);
    return `${wan}万`;
  }
  return num.toLocaleString('zh-CN');
};

// 趋势图标
const getTrendIcon = (direction: string): string => {
  switch (direction) {
    case 'up': return 'arrow-up';
    case 'down': return 'arrow-down';
    default: return 'minus';
  }
};

// 洗牌算法
const shuffleSuggestions = () => {
  const shuffled = [...STATIC_SUGGESTIONS].sort(() => Math.random() - 0.5);
  displayedSuggestions.value = shuffled.slice(0, 3);
};

// 推荐点击
const handleSuggestionClick = (text: string) => {
  inputText.value = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
  handleSend();
};

// 快速提问（从欢迎消息功能列表）
const handleQuickQuestion = (question: string) => {
  inputText.value = question;
  handleSend();
};

// 添加活动记录（来自智能填单/导入组件）
const addActivity = (activity: any) => {
  console.log('[Activity] 新活动:', activity);
};

// 发送消息
const handleSend = async () => {
  const content = inputText.value.trim();
  if (!content && !selectedFile.value) return;
  if (isLoading.value) return;

  // 添加用户消息
  messages.value.push({
    id: Date.now().toString(),
    role: 'user',
    content,
    timestamp: new Date()
  });

  inputText.value = '';
  selectedFile.value = null;

  await nextTick();
  scrollToBottom();

  // 记录开始时间
  const startTime = Date.now();

  // 显示加载状态
  isLoading.value = true;
  streamingContent.value = '';

  try {
    const token = localStorage.getItem('tingstudio_token');

    // 使用 fetch + SSE 流式接收响应
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: content,
        model: currentModel.value,
        conversationId: conversationId.value
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              // 流式传输完成
              messages.value.push({
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: fullContent,
                timestamp: new Date(),
                metadata: {
                  model: currentModel.value,
                  tokens: fullContent.length,
                  latency: Date.now() - startTime
                }
              });

              streamingContent.value = '';
              isLoading.value = false;
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'token') {
                // 接收到文本 token
                streamingContent.value += parsed.content;
                fullContent += parsed.content;
                autoScrollToBottom();
              } else if (parsed.type === 'complete') {
                // 接收完成（包含完整元数据）
                const responseContent = parsed.content || fullContent;
                messages.value.push({
                  id: (Date.now() + 1).toString(),
                  role: 'assistant',
                  content: responseContent,
                  timestamp: new Date(),
                  metadata: {
                    model: parsed.model || currentModel.value,
                    tokens: parsed.tokens || fullContent.length,
                    latency: parsed.latency || 0
                  },
                  // Phase 4: 自动提取可执行操作
                  actions: parseActionsFromResponse(responseContent)
                });

                streamingContent.value = '';
                isLoading.value = false;
                return;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message || 'AI 服务错误');
              }
            } catch (parseError) {
              // 忽略解析错误，继续处理下一行
              console.warn('SSE parse warning:', parseError);
            }
          }
        }
      }
    }

    // 如果没有通过 SSE 完成，手动完成
    if (fullContent && !messages.value.find(m => m.id === (Date.now() + 1).toString())) {
      messages.value.push({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: new Date(),
        metadata: {
          model: currentModel.value,
          tokens: fullContent.length,
          latency: Date.now() - startTime
        },
        // Phase 4: 自动提取可执行操作
        actions: parseActionsFromResponse(fullContent)
      });
      streamingContent.value = '';
    }

    isLoading.value = false;

  } catch (error: any) {
    console.error('Chat error:', error);

    // Phase 5: 显示错误提示给用户
    recordPerformance('errors');
    showErrorToast(`AI 对话失败: ${error.message || '网络连接异常'}`);

    // Fallback 到 mock 响应（当后端不可用时）
    console.warn('Falling back to mock response due to:', error.message);

    await new Promise(resolve => setTimeout(resolve, 800));
    const mockResponse = getMockResponse(content);

    // 模拟流式输出效果
    let currentIndex = 0;
    const streamInterval = setInterval(() => {
      if (currentIndex < mockResponse.length) {
        streamingContent.value += mockResponse[currentIndex];
        currentIndex++;
        autoScrollToBottom();
      } else {
        clearInterval(streamInterval);

        messages.value.push({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: mockResponse,
          timestamp: new Date(),
          metadata: {
            model: currentModel.value,
            tokens: mockResponse.length,
            latency: 800
          },
          // Phase 4: 自动提取可执行操作
          actions: parseActionsFromResponse(mockResponse)
        });

        streamingContent.value = '';
        isLoading.value = false;
      }
    }, 15);
  }
};

// 初始化防抖函数（Phase 5 预留，按需启用）
// debouncedHandleSend = debounce(handleSend, 200)

// 模拟响应（Phase 3替换为真实API）
const getMockResponse = (query: string): string => {
  if (query.includes('销量')) {
    return `根据数据分析，本月销量呈现以下特点：\n\n📊 **总销售额**: ¥2,450,000 (+18% vs 上月)\n📈 **增长最快**: 配方#F2024-088 (+32%)\n⚠️ **需要关注**: 华南地区销量下降5%\n\n建议重点关注华南地区的市场推广策略。`;
  }
  if (query.includes('配方')) {
    return `关于配方的优化建议：\n\n✅ 当前热门配方TOP3已更新\n🔬 建议优化原料配比以降低成本约8%\n📝 可以尝试新建实验配方进行测试\n\n需要我帮你创建新配方吗？`;
  }
  if (query.includes('库存')) {
    return `库存预警信息：\n\n🚨 **紧急**: 维生素C库存仅剩3天用量\n⚠️ **注意**: 蛋白粉库存低于安全线\n✅ **正常**: 其他原料库存充足\n\n建议立即安排维生素C的采购订单。`;
  }
  return `收到你的问题："${query}"\n\n作为TingStudio AI助手，我可以帮助你：\n- 分析销售数据和趋势\n- 优化配方和降低成本\n- 管理原料库存\n- 生成各类报告\n\n请告诉我你具体想了解什么？`;
};

// Markdown渲染
const renderMarkdown = (content: string): string => {
  try {
    return marked(content) as string;
  } catch (e) {
    return content;
  }
};

// 执行操作（Phase 4: 完整实现）
interface ActionItem {
  id: string;
  label: string;
  icon?: string;
  type: 'navigate' | 'api' | 'copy' | 'download' | 'create';
  payload?: any;
}

// 操作类型定义
const ACTION_PATTERNS = {
  navigate: /(?:跳转|前往|打开|查看|进入)\s*(?:页面|)?【?([^\】]+)】?/g,
  create: /(?:创建|新建|添加|生成)\s*(?:新的|)?【?([^\】]+)】?/g,
  export: /(?:导出|下载|保存|输出)\s*(?:为|成|到)?【?([^\】]+)】?/g,
  copy: /(?:复制|拷贝)\s*(?:文本|内容|数据)?【?([^\】]+)】?/g,
  search: /(?:搜索|查找|查询)\s*(?:关于|)?【?([^\】]+)】?/g
};

const executeAction = (action: ActionItem) => {
  console.log('Execute action:', action);

  switch (action.type) {
    case 'navigate':
      if (action.payload?.path) {
        router.push(action.payload.path);
      }
      break;

    case 'create':
      if (action.payload?.type === 'formula') {
        router.push('/formulas/new');
      } else if (action.payload?.type === 'material') {
        router.push('/materials/new');
      } else if (action.payload?.type === 'report') {
        router.push('/reports/generate');
      }
      break;

    case 'copy':
      if (action.payload?.text) {
        navigator.clipboard.writeText(action.payload.text).then(() => {
          // 显示复制成功提示（使用简单的console，后续可接入Toast）
          console.log('✅ 已复制到剪贴板');
        });
      }
      break;

    case 'download':
      if (action.payload?.url || action.payload?.path) {
        const url = action.payload.url || action.payload.path;
        window.open(url.startsWith('http') ? url : `${window.location.origin}${url}`, '_blank');
      }
      break;

    default:
      console.warn('Unknown action type:', action.type);
  }
};

// 从 AI 响应中提取可操作的动作
const parseActionsFromResponse = (content: string): ActionItem[] => {
  const actions: ActionItem[] = [];

  // 检测导航类操作
  const navMatches = content.matchAll(ACTION_PATTERNS.navigate);
  for (const match of navMatches) {
    const target = match[1]?.trim();
    if (target) {
      let path = '';

      // 关键词映射到路由路径
      if (target.includes('配方') || target.includes('formula')) path = '/formulas';
      else if (target.includes('原料') || target.includes('material')) path = '/materials';
      else if (target.includes('销量') || target.includes('销售')) path = '/sales';
      else if (target.includes('报告')) path = '/reports';
      else if (target.includes('导出')) path = '/exports';
      else if (target.includes('文件')) path = '/files';
      else if (target.includes('营养')) path = '/nutrition';
      else if (target.includes('工具')) path = '/tools';

      if (path) {
        actions.push({
          id: `nav_${Date.now()}_${actions.length}`,
          label: `查看${target}`,
          icon: 'chevron-right',
          type: 'navigate',
          payload: { path, target }
        });
      }
    }
  }

  // 检测创建类操作
  const createMatches = content.matchAll(ACTION_PATTERNS.create);
  for (const match of createMatches) {
    const target = match[1]?.trim();
    if (target) {
      let type: 'formula' | 'material' | 'report' | undefined;

      if (target.includes('配方')) type = 'formula';
      else if (target.includes('原料')) type = 'material';
      else if (target.includes('报告') || target.includes('周报') || target.includes('月报')) type = 'report';

      if (type) {
        actions.push({
          id: `create_${Date.now()}_${actions.length}`,
          label: `创建${target}`,
          icon: 'add-circle',
          type: 'create',
          payload: { type, target }
        });
      }
    }
  }

  return actions.slice(0, 3); // 最多显示3个操作按钮
};

// AI 推荐智能更新（基于用户行为）
const updateSuggestionsBasedOnContext = () => {
  const currentPath = route.path;

  // 根据当前所在页面调整推荐
  if (currentPath.includes('/formulas')) {
    displayedSuggestions.value = [
      { text: '📊 分析这个配方的成本结构', category: 'analytics' },
      { text: '🔬 推荐相似的高销量配方', category: 'optimization' },
      { text: '⚠️ 检查原料库存是否充足', category: 'analytics' }
    ];
  } else if (currentPath.includes('/sales')) {
    displayedSuggestions.value = [
      { text: '📈 预测下月销量趋势', category: 'analytics' },
      { text: '📝 生成本月销售报告', category: 'reporting' },
      { text: '🔍 对比去年同期数据', category: 'analytics' }
    ];
  } else if (currentPath.includes('/materials')) {
    displayedSuggestions.value = [
      { text: '💰 分析原料价格波动趋势', category: 'analytics' },
      { text: '🚨 库存不足预警清单', category: 'analytics' },
      { text: '📋 生成采购建议单', category: 'optimization' }
    ];
  } else {
    // 默认推荐（已在 onMounted 中初始化）
    shuffleSuggestions();
  }
};

// 历史会话管理
const toggleHistory = () => {
  showHistory.value = !showHistory.value;
  if (showHistory.value) {
    loadSessions();
  }
};

const createNewSession = () => {
  conversationId.value = null;
  messages.value = [];
  showHistory.value = false;
};

const loadSessions = async () => {
  // Phase 3对接API
  sessions.value = [];
};

const switchToSession = async (sessionId: string) => {
  // Phase 3对接API
  console.log('Switch to session:', sessionId);
  showHistory.value = false;
};

// 文件上传
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) {
    selectedFile.value = file;
    handleSend();
  }
};

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const autoScrollToBottom = () => {
  if (messagesContainer.value) {
    const isNearBottom = messagesContainer.value.scrollHeight -
      messagesContainer.value.scrollTop -
      messagesContainer.value.clientHeight < 100;

    if (isNearBottom) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  }
};

// 最近访问管理
const VISITS_STORAGE_KEY = 'tingstudio_recent_visits';

const loadRecentVisits = () => {
  try {
    const stored = localStorage.getItem(VISITS_STORAGE_KEY);
    recentVisits.value = stored ? JSON.parse(stored) : [];
  } catch {
    recentVisits.value = [];
  }
};

const clearVisits = () => {
  recentVisits.value = [];
  localStorage.removeItem(VISITS_STORAGE_KEY);
};

// 待办事项管理
const TYPE_LABELS: Record<string, string> = {
  approval: '待审批',
  action: '待处理',
  reminder: '提醒'
};

const getTypeLabel = (type: string): string => {
  return TYPE_LABELS[type] || type;
};

const fetchPendingTasks = async () => {
  tasksLoading.value = true;
  try {
    // Phase 2对接真实API，这里用mock数据
    await new Promise(resolve => setTimeout(resolve, 500));
    pendingTasks.value = [];
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
  } finally {
    tasksLoading.value = false;
  }
};

const toggleTaskComplete = async (taskId: string) => {
  // Phase 2对接API
  pendingTasks.value = pendingTasks.value.filter(t => t.id !== taskId);

  // 更新数据卡片中的待办计数
  const pendingCard = dataCards.value.find(c => c.id === 'pending');
  if (pendingCard && pendingCard.value !== null) {
    pendingCard.value = Math.max(0, (pendingCard.value as number) - 1);
  }
};

// 时间格式化
const formatTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return d.toLocaleDateString('zh-CN');
};

// 数据加载（Phase 2: 对接真实API）
const fetchDashboardData = async () => {
  try {
    const response = await http.get('/dashboard/stats', { _logLabel: 'Dashboard Stats' });

    dataCards.value = dataCards.value.map((card) => {
      let value: number | null = null;
      let trend = null;

      switch (card.id) {
        case 'formulas':
          value = response.formulas || 0;
          trend = { direction: 'up' as const, value: '+12%' };
          break;
        case 'materials':
          value = response.materials || 0;
          trend = { direction: 'up' as const, value: '+5新增' };
          break;
        case 'sales':
          value = response.sales?.revenue || 0;
          trend = { direction: 'up' as const, value: '+18%' };
          break;
        case 'pending':
          value = response.pendingTasks || 0;
          trend = null;
          break;
      }

      return {
        ...card,
        value,
        trend,
        loading: false
      };
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);

    // Phase 5: 记录错误但不显示提示（使用 fallback 数据）
    recordPerformance('errors');
    console.warn('[Dashboard] 使用默认数据作为 fallback');

    // Fallback: 使用默认值显示
    dataCards.value = dataCards.value.map((card, index) => ({
      ...card,
      value: [128, 56, 2400000, 3][index],
      trend: index < 3 ?
        { direction: index % 2 === 0 ? 'up' as const : 'neutral' as const, value: index === 0 ? '+12%' : index === 1 ? '+5新增' : '+18%' }
        : null,
      loading: false
    }));
  }
};

// ════════════════════════════════════════
// 生命周期
// ════════════════════════════════════════

onMounted(async () => {
  // Phase 5: 记录加载开始时间
  const loadStartTime = Date.now();

  // 并行加载数据
  await Promise.all([
    refreshWittyComment(),
    fetchDashboardData(),
    loadRecentVisits(),
    fetchPendingTasks(),
    shuffleSuggestions()
  ]);

  // Phase 4: 根据当前路由初始化推荐内容
  updateSuggestionsBasedOnContext();

  // 监听路由变化，动态更新 AI 推荐
  watch(() => route.path, () => {
    updateSuggestionsBasedOnContext();
  });

  // 自动调整输入框高度
  watch(inputText, () => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto';
      textareaRef.value.style.height = Math.min(textareaRef.value.scrollHeight, 120) + 'px';
    }
  });

  // Phase 5: 键盘快捷键支持
  const handleKeyboardShortcuts = (e: KeyboardEvent) => {
    // Ctrl/Cmd + Enter 发送消息
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoading.value && inputText.value.trim()) {
        handleSend();
      }
    }

    // Escape 清空输入框
    if (e.key === 'Escape' && document.activeElement?.tagName === 'TEXTAREA') {
      inputText.value = '';
    }

    // Ctrl/Cmd + / 聚焦到输入框
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      textareaRef.value?.focus();
    }
  };

  window.addEventListener('keydown', handleKeyboardShortcuts);

  // Phase 5: 记录性能指标
  recordPerformance('loadTime', Date.now() - loadStartTime);
  console.log(`[Dashboard] 加载完成, 耗时=${Date.now() - loadStartTime}ms`)

    // 清理函数（在 onUnmounted 中调用）
    ; (window as any).__dashboardCleanup = () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
});

onUnmounted(() => {
  // Phase 5: 清理键盘事件监听器
  if ((window as any).__dashboardCleanup) {
    ; (window as any).__dashboardCleanup();
    delete (window as any).__dashboardCleanup;
  }
});
</script>

<style scoped lang="scss">
// ════════════════════════════════════════
// Phase 5: 全局错误提示样式
// ════════════════════════════════════════
.global-error-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 10000;
  background: linear-gradient(135deg, #fee2e2, #fecaca);
  color: #991b1b;
  padding: 16px 24px;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(239, 68, 68, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 480px;
  border-left: 4px solid #ef4444;
  animation: slideInRight 0.3s ease-out;

  .error-close-btn {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #991b1b;
    opacity: 0.7;
    transition: all 0.2s;
    margin-left: auto;

    &:hover {
      opacity: 1;
      transform: scale(1.1);
    }
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.error-fade-enter-active,
.error-fade-leave-active {
  transition: all 0.3s ease;
}

.error-fade-enter-from,
.error-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.ai-dashboard {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 106px);
  overflow: hidden;
}

.dashboard-layout {
  display: grid;
  grid-template-columns: 260px 1fr 280px;
  gap: 20px;
  align-items: start;
  height: 100%;
  overflow: hidden;
}

.layout-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.layout-left {
  max-height: 100%;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
}

.layout-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  overflow: hidden;
}

.layout-right {
  max-height: 100%;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 2px;
  }
}

// ════════════════════════════════════════
// 区域1: 数据卡片
// ════════════════════════════════════════
.data-overview-cards {
  .cards-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
}

.data-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  border: 2px solid transparent;
  animation: cardFadeIn 0.5s ease both;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);

    &.card-emerald {
      border-color: #10B981;
    }

    &.card-blue {
      border-color: #3B82F6;
    }

    &.card-purple {
      border-color: #8B5CF6;
    }

    &.card-amber {
      border-color: #F59E0B;
    }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .card-title {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
    }
  }

  .card-value {
    margin-bottom: 8px;

    .value-number {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .skeleton-value {
      height: 28px;
      width: 80px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 6px;
    }
  }

  .card-trend {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;

    .trend-up {
      color: #10B981;
    }

    .trend-down {
      color: #EF4444;
    }

    .trend-neutral {
      color: #64748b;
    }
  }

  .card-badge {
    position: absolute;
    top: 16px;
    right: 16px;
    background: #EF4444;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    border-radius: 12px;
  }

  // 卡片主题色
  &.card-emerald .card-header {
    color: #10B981;
  }

  &.card-blue .card-header {
    color: #3B82F6;
  }

  &.card-purple .card-header {
    color: #8B5CF6;
  }

  &.card-amber .card-header {
    color: #F59E0B;
  }

  &.loading {
    pointer-events: none;
  }

  @media (max-width: 1200px) {
    .cards-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .cards-grid {
      grid-template-columns: 1fr;
    }
  }
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }

  100% {
    background-position: 200% 0;
  }
}

.card-fade-enter-active,
.card-fade-leave-active {
  transition: all 0.3s ease;
}

.card-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

// ════════════════════════════════════════
// 区域2: 快捷操作 + AI推荐
// ════════════════════════════════════════
.quick-actions-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.quick-actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  .action-item {
    padding: 14px 12px;
    border-radius: 10px;
    border: 2px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: white;
    position: relative;

    &:hover {
      border-color: #10B981;
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
    }

    &:active {
      transform: translateY(-1px);
    }

    &.primary {
      background: linear-gradient(135deg, #10B981, #059669);
      color: white;
      border-color: transparent;

      &:hover {
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      }
    }

    &.ai-feature::after {
      content: '✨';
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 16px;
    }

    .action-label {
      font-size: 13px;
      font-weight: 500;
      text-align: center;
    }

    .action-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
    }
  }

  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.ai-suggestion-bubble {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #bae6fd;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  height: fit-content;

  &::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 30px;
    width: 0;
    height: 0;
    border-top: 10px solid transparent;
    border-bottom: 10px solid transparent;
    border-right: 12px solid #bae6fd;
  }

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;

    .ai-logo {
      width: 28px;
      height: 28px;
      flex-shrink: 0;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    .bubble-title {
      font-weight: 600;
      color: #0369a1;
      flex: 1;
    }

    .refresh-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #0ea5e9;
      padding: 4px;
      border-radius: 50%;

      &:hover {
        background: #bae6fd;
      }
    }
  }

  .bubble-content {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .suggestion-item {
      padding: 12px 16px;
      background: white;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-left: 3px solid transparent;

      &:hover {
        background: #f0fdf4;
        border-left-color: #10B981;
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      }

      .suggestion-text {
        font-size: 14px;
        color: #334155;
      }

      .arrow-icon {
        color: #94a3b8;
        transition: transform 0.2s;
      }

      &:hover .arrow-icon {
        transform: translateX(4px);
        color: #10B981;
      }
    }
  }

  .bubble-footer {
    margin-top: 12px;
    text-align: center;

    .footer-hint {
      font-size: 11px;
      color: #64748b;
    }
  }

  @media (max-width: 992px) {
    grid-column: 1 / -1;

    &::before {
      display: none;
    }
  }
}

@media (max-width: 992px) {
  .quick-actions-row {
    grid-template-columns: 1fr;
  }
}

// ════════════════════════════════════════
// 区域3: AI对话区
// ════════════════════════════════════════
.ai-chat-section {
  flex: 1;
  min-height: 520px;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  overflow: hidden;

  .chat-header {
    padding: 16px 24px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafbfc;

    .chat-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .model-indicator {
      font-size: 12px;
      color: #64748b;
      background: #f1f5f9;
      padding: 4px 12px;
      border-radius: 12px;
      margin-left: 12px;
    }

    .header-actions,
    .header-right {
      display: flex;
      gap: 8px;

      button {
        padding: 6px 14px;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        color: #475569;
        transition: all 0.2s;

        &:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }
      }
    }
  }

  // Tab 导航栏样式
  .ai-tabs-nav {
    display: flex;
    gap: 8px;
    padding: 12px 24px;
    background: white;
    border-bottom: 1px solid #f1f5f9;
    overflow-x: auto;

    &::-webkit-scrollbar {
      display: none;
    }

    .ai-tab-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      background: white;
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
      font-size: 14px;
      color: #64748b;

      &:hover {
        border-color: #0052D9;
        color: #0052D9;
        background: #f0f7ff;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 82, 217, 0.1);
      }

      &.active {
        background: linear-gradient(135deg, #0052D9, #003DB3);
        color: white;
        border-color: transparent;
        box-shadow: 0 4px 12px rgba(0, 82, 217, 0.25);

        .tab-desc {
          color: rgba(255, 255, 255, 0.85);
        }
      }

      .tab-icon {
        font-size: 18px;
      }

      .tab-label {
        font-weight: 600;
        font-size: 14px;
      }

      .tab-desc {
        font-size: 11px;
        color: #94a3b8;
        margin-left: 4px;
      }
    }
  }

  // Tab 内容面板
  .tab-content-panel {
    flex: 1;
    overflow-y: auto;
    background: #fafbfc;
  }

  .chat-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  .history-sidebar {
    width: 280px;
    border-right: 1px solid #e2e8f0;
    background: #fafbfc;
    overflow-y: auto;
    transition: transform 0.3s ease;

    .history-header {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      color: #64748b;
    }

    .history-item {
      padding: 12px 16px;
      cursor: pointer;
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;

      &:hover {
        background: #f1f5f9;
      }

      &.active {
        background: #e0f2fe;
        border-left: 3px solid #0ea5e9;
      }

      .session-title {
        font-size: 14px;
        font-weight: 500;
        color: #334155;
        margin-bottom: 4px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .session-time {
        font-size: 12px;
        color: #94a3b8;
      }
    }

    .empty-sessions {
      padding: 40px 16px;
      text-align: center;
      color: #94a3b8;
      font-size: 14px;
    }
  }

  .messages-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    scroll-behavior: smooth;

    &::-webkit-scrollbar {
      width: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: #cbd5e1;
      border-radius: 3px;

      &:hover {
        background: #94a3b8;
      }
    }
  }

  .message-item {
    margin-bottom: 20px;
    display: flex;
    gap: 12px;
    animation: fadeInUp 0.3s ease;

    &.message-user {
      flex-direction: row-reverse;

      .user-bubble {
        background: linear-gradient(135deg, #10B981, #059669);
        color: white;
        max-width: 70%;
        padding: 12px 18px;
        border-radius: 18px 18px 4px 18px;
        word-wrap: break-word;
        line-height: 1.5;
      }

      .message-time {
        font-size: 11px;
        color: #94a3b8;
        margin-top: 4px;
      }
    }

    &.message-assistant {
      .avatar-logo {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        flex-shrink: 0;
        background: white;
        padding: 3px;
        overflow: hidden;

        svg {
          width: 100%;
          height: 100%;
        }
      }

      .assistant-bubble {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        max-width: 80%;
        padding: 16px 20px;
        border-radius: 18px 18px 18px 4px;

        .markdown-content {
          line-height: 1.6;

          h1,
          h2,
          h3 {
            color: #1e293b;
            margin-top: 12px;
            margin-bottom: 8px;
          }

          p {
            margin-bottom: 8px;
          }

          code {
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'Monaco', monospace;
            font-size: 13px;
          }

          pre {
            background: #1e293b;
            color: #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            overflow-x: auto;
            margin: 12px 0;

            code {
              background: transparent;
              color: inherit;
            }
          }

          ul,
          ol {
            padding-left: 20px;
            margin-bottom: 8px;
          }

          li {
            margin-bottom: 4px;
          }

          strong {
            font-weight: 600;
            color: #1e293b;
          }
        }

        .message-actions {
          margin-top: 16px;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;

          .action-btn {
            padding: 8px 16px;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            border: none;
            border-radius: 20px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;

            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            }
          }
        }

        .message-meta {
          margin-top: 12px;
          font-size: 11px;
          color: #94a3b8;
          display: flex;
          gap: 6px;
        }
      }

      &.typing .cursor-blink {
        animation: blink 1s step-end infinite;
        color: #10B981;
        font-weight: bold;
        margin-left: 2px;
      }
    }
  }

  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 16px 20px;
    background: #f8fafc;
    border-radius: 18px;
    width: fit-content;

    span {
      width: 8px;
      height: 8px;
      background: #94a3b8;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }

      &:nth-child(2) {
        animation-delay: -0.16s;
      }
    }
  }

  .welcome-message {
    text-align: center;
    padding: 40px 20px;

    .welcome-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 20px;
    }

    .welcome-logo {
      width: 64px;
      height: 64px;

      svg {
        width: 100%;
        height: 100%;
      }
    }

    h3 {
      font-size: 22px;
      color: #1e293b;
      margin-bottom: 0;
    }

    p {
      color: #64748b;
      margin-bottom: 8px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 20px 0;
      text-align: left;
      display: inline-block;

      li {
        padding: 8px 0;
        color: #475569;

        &::before {
          content: '✨ ';
          margin-right: 8px;
        }
      }
    }

    .welcome-hint {
      color: #10B981;
      font-weight: 500;
      margin-top: 16px;
    }

    .welcome-features {
      list-style: none;
      padding: 0;
      margin: 16px 0;

      li {
        padding: 10px 16px;
        margin: 6px 0;
        background: #f8fafc;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        border: 1px solid transparent;

        &:hover {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border-color: #bae6fd;
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0, 82, 217, 0.1);
        }

        &:active {
          transform: translateX(2px);
        }
      }
    }
  }

  .quick-tags-bar {
    padding: 12px 24px;
    display: flex;
    gap: 8px;
    overflow-x: auto;
    border-top: 1px solid #f1f5f9;
    background: #fafbfc;

    &::-webkit-scrollbar {
      display: none;
    }

    .quick-tag {
      padding: 6px 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      font-size: 13px;
      white-space: nowrap;
      cursor: pointer;
      transition: all 0.2s;
      color: #475569;

      &:hover {
        background: #dbeafe;
        border-color: #93c5fd;
        color: #2563eb;
        transform: translateY(-1px);
      }
    }
  }

  .chat-input-bar {
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    background: white;

    .input-wrapper {
      display: flex;
      align-items: flex-end;
      gap: 12px;
      background: #f8fafc;
      border: 2px solid #e2e8f0;
      border-radius: 24px;
      padding: 8px 16px;
      transition: all 0.25s ease;

      &:focus-within {
        border-color: #10B981;
        box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        background: white;
      }

      textarea {
        flex: 1;
        border: none;
        outline: none;
        resize: none;
        font-size: 14px;
        line-height: 1.5;
        max-height: 120px;
        min-height: 24px;
        background: transparent;
        font-family: inherit;
        color: #334155;

        &::placeholder {
          color: #94a3b8;
        }
      }

      .input-actions {
        display: flex;
        align-items: center;
        gap: 8px;

        .attach-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          position: relative;

          input[type="file"] {
            position: absolute;
            inset: 0;
            opacity: 0;
            cursor: pointer;
          }

          &:hover {
            background: #f1f5f9;
            color: #10B981;
          }
        }

        .send-btn {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #10B981, #059669);
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

          &:hover:not(:disabled) {
            transform: scale(1.08);
            box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
          }

          &:active:not(:disabled) {
            transform: scale(0.95);
          }

          &:disabled {
            background: #cbd5e1;
            cursor: not-allowed;
            opacity: 0.6;
          }
        }
      }
    }

    .input-hint {
      margin-top: 8px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {

  0%,
  80%,
  100% {
    transform: scale(0);
  }

  40% {
    transform: scale(1);
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: transform 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(-100%);
}

// ════════════════════════════════════════
// Phase 5: 响应式设计 + 性能优化
// ════════════════════════════════════════
@media (max-width: 1400px) {
  .dashboard-layout {
    grid-template-columns: 220px 1fr 240px;
    gap: 16px;
  }
}

@media (max-width: 1200px) {
  .dashboard-layout {
    grid-template-columns: 200px 1fr 200px;
    gap: 12px;
  }

  .layout-left .cards-grid {
    grid-template-columns: 1fr 1fr;
  }

  .quick-actions-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 992px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
    gap: 12px;
    height: auto;
  }

  .layout-left,
  .layout-right {
    position: static;
    max-height: none;
  }

  .ai-dashboard {
    height: auto;
  }

  .layout-left .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .layout-left,
  .layout-main,
  .layout-right {
    order: unset;
  }

  .ai-chat-section {
    min-height: 400px;
  }

  .global-error-toast {
    left: 12px;
    right: 12px;
    max-width: none;
    top: 12px;
  }
}

@media (max-width: 480px) {
  .layout-left .cards-grid {
    grid-template-columns: 1fr !important;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr !important;
  }

  .chat-input-bar {
    flex-direction: column;

    .input-wrapper {
      width: 100%;
    }

    .input-actions {
      width: 100%;
      justify-content: center;
      margin-top: 8px;
    }
  }
}

// ════════════════════════════════════════
// Phase 5: 无障碍性增强 (a11y)
// ════════════════════════════════════════

// 高对比度模式支持
@media (prefers-contrast: high) {
  .ai-dashboard {
    border: 2px solid #000;
  }

  .data-card,
  .chat-section {
    border-width: 2px;
  }
}

// 减少动画模式（尊重用户偏好）
@media (prefers-reduced-motion: reduce) {

  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

// 焦点可见性（键盘导航）
*:focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 4px;
}

// 屏幕阅读器专用文本（视觉隐藏但可读）
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

// 性能优化：使用 GPU 加速
.data-card,
.chat-message,
.action-btn,
.quick-tag {
  will-change: transform;
  backface-visibility: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

// 滚动性能优化
.messages-container {
  scroll-behavior: smooth;
  overscroll-behavior: contain;

  // 使用 passive 事件监听器提升滚动性能
  &::-webkit-scrollbar {
    width: 6px;

    &-thumb {
      background: rgba(148, 163, 184, 0.5);
      border-radius: 3px;

      &:hover {
        background: rgba(148, 163, 184, 0.8);
      }
    }
  }
}

// ════════════════════════════════════════
// 区域4: 底部活动区
// ════════════════════════════════════════
.activity-footer {
  border-radius: 16px;
  padding: 20px;
  border: 2px solid #bae6fd;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .clear-btn,
    .view-all {
      font-size: 12px;
      color: #64748b;
      background: none;
      border: none;
      cursor: pointer;
      text-decoration: none;

      &:hover {
        color: #10B981;
      }
    }
  }
}

.visit-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  margin-bottom: 4px;

  &:hover {
    background: #f8fafc;
    transform: translateX(4px);
  }

  .visit-title {
    flex: 1;
    font-size: 14px;
    color: #334155;
  }

  .visit-time {
    font-size: 12px;
    color: #94a3b8;
  }
}

.task-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 10px;
  margin-bottom: 6px;
  border-left: 3px solid #e2e8f0;
  transition: all 0.2s;

  &.type-approval {
    border-left-color: #f59e0b;
  }

  &.type-action {
    border-left-color: #3b82f6;
  }

  &.type-reminder {
    border-left-color: #6b7280;
  }

  &:hover {
    background: #f8fafc;
  }

  .check-btn {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid #d1d5db;
    background: white;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
    color: white;

    &:hover {
      border-color: #10B981;
      background: #10B981;
    }

    .check-circle {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #d1d5db;
    }
  }

  .task-content {
    flex: 1;

    .task-title {
      font-size: 14px;
      color: #334155;
      font-weight: 500;
      display: block;
      margin-bottom: 2px;
    }

    .task-meta {
      font-size: 12px;
      color: #94a3b8;
    }
  }

  .go-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    cursor: pointer;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &:hover {
      background: #10B981;
      color: white;
    }
  }
}

.empty-state,
.loading-state {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 14px;
}

// ════════════════════════════════════════
// 全局响应式
// ════════════════════════════════════════
@media (max-width: 480px) {
  .layout-left .cards-grid {
    grid-template-columns: 1fr !important;
  }

  .quick-actions-grid {
    grid-template-columns: 1fr !important;
  }
}

// ════════════════════════════════════════
// 智能填单/导入模态框
// ════════════════════════════════════════
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafbfc;
  border-radius: 16px 16px 0 0;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: #1e293b;
    margin: 0;
  }
}

.modal-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f1f5f9;
  font-size: 20px;
  cursor: pointer;
  color: #64748b;
  transition: all 0.2s;

  &:hover {
    background: #e2e8f0;
    color: #334155;
  }
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

// 模态框动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>