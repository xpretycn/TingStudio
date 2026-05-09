# TingStudio AI助手工作台 — 完整实施计划

> **版本**: v2.0 | **日期**: 2026-05-09  
> **状态**: 待实施 → 确认后开始编码  
> **作者**: AI Assistant

---

## 📋 一、项目总览

### 1.1 项目目标

将现有 `/ai-assistant` 页面改造为**智能业务工作台（Smart Dashboard）**，作为系统主入口（Home页），融合数据概览、快捷操作、AI对话、动态追踪于一体。

### 1.2 核心价值

- ✅ **一站式工作台**：减少页面跳转，提升工作效率
- ✅ **AI驱动**：智能推荐 + 自然语言交互
- ✅ **数据透明**：核心指标一目了然
- ✅ **情感化设计**：AI俏皮话增强用户体验

### 1.3 用户决策记录

| 决策项                | 选择                | 说明                          |
| --------------------- | ------------------- | ----------------------------- |
| 决策1：AI对话区位置   | A - 固定在页面中部  | 始终可见，作为核心功能        |
| 决策2：数据卡片数量   | A - 4个             | 配方/原料/销量/待办，简洁明了 |
| 决策3：欢迎语区域     | A - 需要 + AI俏皮话 | 增强情感化设计，每日自动生成  |
| 决策4：AI推荐展示方式 | A - 气泡卡片        | 视觉突出，引导使用            |
| 决策5：页面权限控制   | A - 所有角色相同    | 初期统一，后续迭代个性化      |

### 1.4 特殊需求

- **AI俏皮话**：每日自动生成1次（降低API调用成本）
- **默认首页**：用户登录后直接进入AI助手页
- **导航分组**：只展开当前所在分组（规则C）

---

## 🎯 二、产品定位与设计理念

### 2.1 定位

> **"以AI为核心的智能业务中枢"**

不是简单的功能列表页，而是融合数据洞察、快捷操作、AI推荐的**个性化工作空间**。

### 2.2 设计原则

1. **效率优先**：高频操作3次点击内完成
2. **数据驱动**：关键指标实时可见
3. **AI赋能**：自然语言降低使用门槛
4. **情感连接**：俏皮话+个性化问候

---

## 📐 三、页面结构设计

### 3.1 整体布局架构

```
┌─────────────────────────────────────────────────────────────┐
│  ╔══════ 区域0: 顶部欢迎栏 ═════════════════════════════╗ │
│  ║ ☀️ 早上好，Admin！今天是2026年5月9日 · 周五          ║ │
│  ║ 💬 "又是搬砖的一天，今天也要加油哦 💪" [点击换一条]    ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                             │
│  ╔══════ 区域1: 核心数据概览 (4列网格) ══════════════════╗ │
│  ║ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  ║ │
│  ║ │ 配方总数  │ │ 原料种类  │ │ 本月销量  │ │待处理任务│  ║ │
│  ║ │   128    │ │    56    │ │  ¥2.4M   │ │    3     │  ║ │
│  ║ │ ↑12%     │ │  +5新增  │ │  +18%↑   │ │          │  ║ │
│  ║ └──────────┘ └──────────┘ └──────────┘ └──────────┘  ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                             │
│  ╔══════ 区域2: 快捷操作 + AI推荐 ══════════════════════╗ │
│  ║                                                       ║ │
│  ║ ⚡ 快捷操作 (3x2网格)          🤖 AI推荐 (气泡卡)      ║ │
│  ║ ┌─────────┐ ┌─────────┐     ┌────────────────────┐   ║ │
│  ║ │+新建配方 │ │+添加原料 │     │ 💬 帮我分析本月   │   ║ │
│  ║ └─────────┘ └─────────┘     │    销量趋势       │   ║ │
│  ║ ┌─────────┐ ┌─────────┘     ├────────────────────┤   ║ │
│  ║ │生成周报 │ │ 导出数据       │ 💬 检查库存不足   │   ║ │
│  ║ └─────────┘ └─────────┘     └────────────────────┘   ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                             │
│  ╔══════ 区域3: AI对话区 (固定高度500px) ════════════════╗ │
│  ║                                                       ║ │
│  ║ 💬 AI 智能助手                    [历史] [新对话]      ║ │
│  ║ ┌─────────────────────────────────────────────────┐  ║ │
│  ║ │                                                 │  ║ │
│  ║ │  👤 你: 帮我看看最近7天的配方使用情况           │  ║ │
│  ║ │  🤖 AI: 根据数据分析... [查看详情]              │  ║ │
│  ║ │                                                 │  ║ │
│  ║ └─────────────────────────────────────────────────┘  ║ │
│  ║ [📊本月销量] [📝创建配方] [🧪库存预警]               ║ │
│  ║ ┌─────────────────────────────────────┐ [📎][发送]  ║ │
│  ║ │ 输入问题或指令...                   │            ║ │
│  ║ └─────────────────────────────────────┘            ║ │
│  ╚════════════════════════════════════════════════════════╝ │
│                                                             │
│  ╔══════ 区域4: 最近动态 & 待办 (2列并排) ════════════════╗ │
│  ║                                                       ║ │
│  ║ 🕐 最近访问              📋 我的待办                  ║ │
│  ║ ├─ 配方管理 (2分钟前)    ├─ ⬜ 审批配方 #F2024-088   ║ │
│  ║ ├─ 销量分析 (15分钟前)   ├─ ⬜ 补充原料库存         ║ │
│  ║ └─ 月报报告 (1小时前)    ├─ ⬜ 确认导出数据         ║ │
│  ╚════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 组件层级结构

```
AIDashboard.vue (主组件)
├── WelcomeBanner.vue (区域0: 欢迎栏)
│   ├── GreetingText (问候语)
│   ├── DateTimeInfo (日期时间)
│   ├── WeatherBadge (天气徽章)
│   └── WittyCommentCard (AI俏皮话卡片)
│
├── DataOverviewCards.vue (区域1: 数据概览)
│   └── DataCard[4] (单个数据卡片 x4)
│       ├── CardHeader (图标+标题)
│       ├── CardValue (数值+动画)
│       └── CardTrend (趋势指示器)
│
├── QuickActionsRow.vue (区域2: 快捷操作行)
│   ├── QuickActionsGrid.vue (左侧快捷按钮)
│   │   └── ActionButton[6]
│   └── AISuggestionBubble.vue (右侧AI推荐气泡)
│       ├── BubbleHeader
│       ├── SuggestionItem[3]
│       └── BubbleFooter
│
├── AIChatSection.vue (区域3: AI对话区) ★核心
│   ├── ChatHeader (标题栏+模型切换)
│   ├── HistorySidebar (历史会话侧边栏)
│   ├── MessagesArea (消息列表区)
│   │   ├── WelcomeMessage (首次进入欢迎)
│   │   ├── UserMessage (用户消息气泡)
│   │   ├── AssistantMessage (AI回复+可执行动作)
│   │   ├── StreamingMessage (流式输出中)
│   │   └── TypingIndicator (加载动画)
│   ├── QuickTagsBar (快捷标签栏)
│   └── ChatInputBar (输入框+附件+发送)
│
└── ActivityFooter.vue (区域4: 动态底部)
    ├── RecentVisits.vue (最近访问)
    │   └── VisitItem[5]
    └── PendingTasks.vue (待办事项)
        └── TaskItem[4]
```

---

## 🔧 四、详细模块设计

### 4.0 区域0：顶部欢迎栏

#### 功能描述

展示个性化问候语、日期天气信息、以及**AI生成的每日俏皮话**。

#### 数据结构伪代码

```typescript
interface WelcomeBannerState {
  username: string; // 从 authStore 获取
  currentTime: Date; // 实时更新
  wittyComment: string; // AI生成的俏皮话
  weatherInfo: {
    // 从 weatherStore 获取
    icon: string;
    temperature: number;
    city: string;
  };
}

// 问候语规则
const getGreeting = (hour: number): string => {
  if (hour >= 6 && hour < 12) return "早上好 ☀️";
  if (hour >= 12 && hour < 14) return "中午好 🌤️";
  if (hour >= 14 && hour < 18) return "下午好 ⛅";
  if (hour >= 18 && hour < 22) return "晚上好 🌙";
  return "夜深了 🌟";
};
```

#### AI俏皮话生成逻辑

```typescript
// 核心配置
const WITTY_COMMENT_CONFIG = {
  refreshInterval: 24 * 60 * 60 * 1000, // 24小时刷新一次
  storageKey: "witty_comment", // localStorage key
  apiEndpoint: "/api/ai/witty-comment", // API端点
};

// 获取或生成俏皮话
const getWittyComment = async (): Promise<string> => {
  const today = new Date().toDateString();
  const cacheKey = `${WITTY_COMMENT_CONFIG.storageKey}_${today}`;
  const cached = localStorage.getItem(cacheKey);

  // 优先使用今日缓存
  if (cached) {
    return JSON.parse(cached).comment;
  }

  try {
    // 调用API生成
    const response = await fetch(WITTY_COMMENT_CONFIG.apiEndpoint, {
      method: "POST",
      body: JSON.stringify({
        timeOfDay: getTimeOfDay(),
        userRole: authStore.user?.role,
        recentActivity: getRecentActivity(),
      }),
    });

    const data = await response.json();

    // 缓存到localStorage（按天）
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        comment: data.comment,
        timestamp: Date.now(),
      }),
    );

    return data.comment;
  } catch (error) {
    // API失败时降级到本地预设池
    return getRandomFromFallbackPool();
  }
};

// 本地预设池（降级策略）
const FALLBACK_POOL = [
  "又是搬砖的一天，今天也要加油哦 💪",
  "配方调得再好，也别忘了喝水 🥤",
  "据说周五的配方成功率最高，是真的吗？🤔",
  "今天的原料价格波动了吗？快去看看吧 👀",
  "AI提示：连续工作2小时记得站起来活动一下 🏃",
  "周一综合症？不存在的，我们有AI助手呀 😎",
  "库存不足预警比闹钟还准时呢 ⏰",
  "今天的目标：完成3个配方优化任务 🎯",
];

const getRandomFromFallbackPool = (): string => {
  return FALLBACK_POOL[Math.floor(Math.random() * FALLBACK_POOL.length)];
};
```

#### 视觉样式要点

```scss
.welcome-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 24px 32px;
  border-radius: 16px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  overflow: hidden;

  // 装饰性背景元素
  &::before {
    content: "";
    position: absolute;
    top: -50%;
    right: -20%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.1), transparent);
    border-radius: 50%;
  }

  .greeting {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .date-info {
    font-size: 14px;
    opacity: 0.9;
  }

  .witty-comment-card {
    background: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(10px);
    padding: 12px 20px;
    border-radius: 12px;
    max-width: 400px;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.25);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .comment-icon {
      margin-right: 8px;
    }

    .refresh-hint {
      font-size: 11px;
      opacity: 0.7;
      margin-left: 8px;
    }
  }

  // 移动端适配
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
    gap: 16px;

    .greeting {
      font-size: 22px;
    }
    .witty-comment-card {
      max-width: 100%;
    }
  }
}
```

#### 生命周期管理

```typescript
onMounted(async () => {
  // 1. 初始化用户信息
  username.value = authStore.user?.username || "用户";

  // 2. 生成初始俏皮话
  wittyComment.value = await getWittyComment();

  // 3. 启动定时器（每24小时检查是否需要刷新）
  setInterval(
    async () => {
      const today = new Date().toDateString();
      const cacheKey = `witty_comment_${today}`;
      const cached = localStorage.getItem(cacheKey);

      // 如果没有今天的缓存，则刷新
      if (!cached) {
        wittyComment.value = await getWittyComment();
      }
    },
    60 * 60 * 1000,
  ); // 每小时检查一次（但实际每天只请求1次API）
});
```

---

### 4.1 区域1：核心数据概览卡片

#### 功能描述

展示4个核心业务指标的数据卡片，支持点击跳转、实时更新、趋势显示。

#### 卡片配置

```typescript
interface DataCardConfig {
  id: string;
  title: string;
  icon: string;
  dataSource: string; // API端点
  color: string; // 主题色
  clickPath: string | null; // 点击跳转路径
  showBadge?: boolean; // 是否显示角标
}

const DATA_CARDS_CONFIG: DataCardConfig[] = [
  {
    id: "formulas",
    title: "配方总数",
    icon: "edit",
    dataSource: "/api/formulas/stats",
    color: "#10B981", // emerald green
    clickPath: "/formulas",
  },
  {
    id: "materials",
    title: "原料种类",
    icon: "chart-bar",
    dataSource: "/api/materials/stats",
    color: "#3B82F6", // blue
    clickPath: "/materials",
  },
  {
    id: "sales",
    title: "本月销量",
    icon: "chart",
    dataSource: "/api/sales/monthly-summary",
    color: "#8B5CF6", // purple
    clickPath: "/sales",
  },
  {
    id: "pending",
    title: "待处理任务",
    icon: "time",
    dataSource: "/api/tasks/pending-count",
    color: "#F59E0B", // amber
    clickPath: null, // 弹出待办模态框
    showBadge: true,
  },
];
```

#### 数据获取逻辑

```typescript
// 并行获取所有卡片数据
const fetchAllStats = async (): Promise<void> => {
  // 显示骨架屏
  cards.value = cards.value.map(card => ({ ...card, loading: true }));

  try {
    // 方案A：并行请求各个独立API
    const results = await Promise.allSettled(
      DATA_CARDS_CONFIG.map(config => api.get(config.dataSource).then(res => res.data)),
    );

    // 更新每个卡片的数据
    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        cards.value[index] = {
          ...cards.value[index],
          value: result.value.count || result.value.total,
          trend: result.value.trend,
          loading: false,
        };
      } else {
        // 请求失败处理
        console.error(`Failed to load ${DATA_CARDS_CONFIG[index].id}:`, result.reason);
        cards.value[index].loading = false;
      }
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
  }
};

// 优化方案B：使用聚合API（后端实现）
// GET /api/dashboard/stats 返回所有统计数据
// 减少HTTP请求数量，提升性能
```

#### 数字递增动画

```typescript
// 使用 requestAnimationFrame 实现平滑数字递增
const animateNumber = (element: HTMLElement, targetValue: number, duration: number = 1000): void => {
  const startTime = performance.now();
  const startValue = 0;

  const updateNumber = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // easeOutExpo 缓动函数
    const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);

    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);

    element.textContent = formatNumber(currentValue);

    if (progress < 1) {
      requestAnimationFrame(updateNumber);
    }
  };

  requestAnimationFrame(updateNumber);
};
```

#### 骨架屏设计

```vue
<!-- 加载状态 -->
<template v-if="card.loading">
  <div class="data-card skeleton">
    <div class="skeleton-icon"></div>
    <div class="skeleton-title"></div>
    <div class="skeleton-value"></div>
    <div class="skeleton-trend"></div>
  </div>
</template>

<style>
.skeleton {
  &-icon,
  &-title,
  &-value,
  &-trend {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }

  &-icon {
    width: 40px;
    height: 40px;
    margin-bottom: 12px;
  }
  &-title {
    width: 80px;
    height: 16px;
    margin-bottom: 16px;
  }
  &-value {
    width: 120px;
    height: 32px;
    margin-bottom: 12px;
  }
  &-trend {
    width: 60px;
    height: 14px;
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
</style>
```

#### 自动刷新机制

```typescript
// 每5分钟自动刷新数据
let refreshInterval: ReturnType<typeof setInterval>;

onMounted(() => {
  fetchAllStats(); // 初始加载

  refreshInterval = setInterval(
    () => {
      fetchAllStats();
    },
    5 * 60 * 1000,
  ); // 5分钟
});

onUnmounted(() => {
  // 清理定时器防止内存泄漏
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});
```

---

### 4.2 区域2：快捷操作 + AI推荐

#### 左侧：快捷操作网格

##### 配置定义

```typescript
interface QuickAction {
  label: string;
  icon: string;
  path: string;
  primary?: boolean; // 主要按钮样式
  isAIFeature?: boolean; // AI功能标记
  badge?: string; // 角标文字
  permission?: string; // 权限控制（可选）
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "+ 新建配方",
    icon: "add-circle",
    path: "/formulas/new",
    primary: true,
  },
  {
    label: "+ 添加原料",
    icon: "add",
    path: "/materials/new",
  },
  {
    label: "生成周报",
    icon: "file-icon",
    path: "/reports/generate?type=weekly",
  },
  {
    label: "导出数据",
    icon: "download",
    path: "/exports",
  },
  {
    label: "✨ 智能填单",
    icon: "edit",
    path: "/tools?tab=ai-form",
    isAIFeature: true,
    badge: "NEW",
  },
  {
    label: "批量导入",
    icon: "upload",
    path: "/tools?tab=import",
  },
];
```

##### 网格布局样式

```scss
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr); // 3列2行
  gap: 12px;

  .action-item {
    padding: 16px;
    border-radius: 12px;
    border: 2px solid #e2e8f0;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: white;

    &:hover {
      border-color: #10b981;
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.15);
    }

    &:active {
      transform: translateY(-1px);
    }

    // 主要按钮特殊样式
    &.primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border-color: transparent;

      &:hover {
        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
      }
    }

    // AI功能标记
    &.ai-feature {
      position: relative;

      &::after {
        content: "✨";
        position: absolute;
        top: 8px;
        right: 8px;
        font-size: 16px;
      }
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

  // 响应式调整
  @media (max-width: 992px) {
    grid-template-columns: repeat(2, 1fr); // 2列3行
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr; // 单列堆叠
  }
}
```

#### 右侧：AI推荐气泡卡

##### 推荐内容池

```typescript
interface AISuggestion {
  text: string;
  category: "analytics" | "creation" | "optimization" | "reporting";
  priority: number; // 优先级权重
}

// 静态推荐池
const STATIC_SUGGESTIONS: AISuggestion[] = [
  { text: "帮我分析本月销量趋势 📈", category: "analytics", priority: 9 },
  { text: "检查哪些原料库存不足 🧪", category: "analytics", priority: 8 },
  { text: "生成本周业务周报 📝", category: "reporting", priority: 7 },
  { text: "对比上月配方使用情况 📊", category: "analytics", priority: 6 },
  { text: "预测下季度原料需求 🔮", category: "optimization", priority: 5 },
  { text: "优化配方的成本结构 💰", category: "optimization", priority: 7 },
  { text: "创建新的实验配方 🧪", category: "creation", priority: 6 },
  { text: "导出本季度销售报表 📄", category: "reporting", priority: 5 },
];

// Fisher-Yates 洗牌算法（公平随机）
const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// 获取随机3条推荐
const getRandomSuggestions = (count: number = 3): AISuggestion[] => {
  const shuffled = shuffleArray(STATIC_SUGGESTIONS);
  return shuffled.slice(0, count);
};
```

##### 动态推荐API（未来扩展）

```typescript
// 可选：调用AI接口获取个性化推荐
const fetchDynamicSuggestions = async (): Promise<AISuggestion[]> => {
  try {
    const response = await api.post("/api/ai/suggestions", {
      userId: authStore.user?.id,
      context: "dashboard",
      recentActions: getRecentUserActions(),
      timeOfDay: getTimeOfDay(),
    });

    return response.data.suggestions;
  } catch (error) {
    // 降级到静态推荐
    console.warn("Failed to fetch dynamic suggestions, using fallback");
    return getRandomSuggestions();
  }
};
```

##### 气泡卡样式

```scss
.ai-suggestion-bubble {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 2px solid #bae6fd;
  border-radius: 20px;
  padding: 20px;
  position: relative;
  height: fit-content;

  // 左侧小三角箭头
  &::before {
    content: "";
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

    .ai-avatar {
      font-size: 24px;
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
        border-left-color: #10b981;
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
        color: #10b981;
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
}
```

---

### 4.3 区域3：AI对话区（★核心重点）

#### 功能概述

这是整个工作台的**灵魂模块**。提供嵌入式聊天界面，支持：

- 多轮对话上下文保持
- 流式输出（打字机效果）
- Markdown渲染
- 文件上传（图片OCR）
- 快捷标签
- 历史会话管理
- AI回复中的可执行操作

#### 数据模型

```typescript
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  metadata?: {
    model: string; // 使用的AI模型
    tokens: number; // token消耗
    latency: number; // 响应延迟(ms)
  };
  actions?: Action[]; // 可执行的操作按钮
  attachments?: Attachment[]; // 附件（图片等）
}

interface Action {
  id: string;
  type: "navigate" | "create" | "export" | "api-call" | "download";
  label: string;
  payload: any;
  icon?: string;
}

interface Session {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  preview: string; // 最后一条消息摘要
}
```

#### 核心方法：发送消息

```typescript
const sendMessage = async (content: string, attachment?: File): Promise<void> => {
  // 1. 添加用户消息
  const userMessage: Message = {
    id: generateId(),
    role: "user",
    content,
    timestamp: new Date(),
    attachments: attachment ? [{ name: attachment.name, type: attachment.type }] : undefined,
  };

  messages.value.push(userMessage);
  inputText.value = "";

  // 2. 滚动到底部
  await nextTick();
  scrollToBottom();

  // 3. 显示加载状态
  isLoading.value = true;

  try {
    // 4. 构建请求体
    const requestBody: any = {
      message: content,
      conversation_id: conversationId.value,
      stream: true, // 启用流式输出
    };

    // 5. 处理文件上传
    if (attachment) {
      if (attachment.type.startsWith("image/")) {
        requestBody.image = await fileToBase64(attachment);
      }
    }

    // 6. 发起流式请求
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authStore.token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 7. 处理SSE流式响应
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";
    const startTime = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));

            if (data.content) {
              assistantContent += data.content;
              streamingContent.value = assistantContent; // 实时更新UI

              // 自动滚动到底部
              autoScrollToBottom();
            }

            // 提取conversation_id（首次响应）
            if (data.conversation_id && !conversationId.value) {
              conversationId.value = data.conversation_id;
            }

            // 提取模型信息
            if (data.model) {
              currentModel.value = data.model;
            }
          } catch (e) {
            // 忽略解析错误（可能是空行或注释）
          }
        }
      }
    }

    // 8. 完成后添加到消息列表
    const assistantMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: assistantContent,
      timestamp: new Date(),
      metadata: {
        model: currentModel.value,
        tokens: estimateTokens(assistantContent),
        latency: Date.now() - startTime,
      },
    };

    // 9. 解析可执行操作
    parseActions(assistantMessage);

    messages.value.push(assistantMessage);
  } catch (error) {
    console.error("Chat error:", error);

    // 添加错误提示消息
    messages.value.push({
      id: generateId(),
      role: "assistant",
      content: "抱歉，AI服务暂时不可用。请稍后重试，或检查网络连接。",
      timestamp: new Date(),
    });
  } finally {
    isLoading.value = false;
    streamingContent.value = "";
  }
};
```

#### 操作解析器

```typescript
// 解析AI回复中的[action:]标签
const parseActions = (message: Message): void => {
  const actionRegex = /\[action:(\w+):([^\]]+)\]/g;
  const actions: Action[] = [];
  let match;

  while ((match = actionRegex.exec(message.content)) !== null) {
    actions.push({
      id: generateId(),
      type: match[1] as Action["type"],
      payload: match[2],
      label: getActionLabel(match[1], match[2]),
      icon: getActionIcon(match[1]),
    });
  }

  if (actions.length > 0) {
    message.actions = actions;
  }
};

// 执行操作
const executeAction = async (action: Action): Promise<void> => {
  switch (action.type) {
    case "navigate":
      router.push(action.payload);
      break;

    case "create":
      if (action.payload === "formula") {
        router.push("/formulas/new?ai=true");
      } else if (action.payload === "material") {
        router.push("/materials/new?ai=true");
      }
      break;

    case "export":
      triggerExport(action.payload);
      break;

    case "download":
      downloadFile(action.payload);
      break;

    case "api-call":
      await callCustomAPI(action.payload);
      break;
  }
};

// 操作类型映射表
const ACTION_CONFIG = {
  navigate: { labelTemplate: "前往{payload}", icon: "chevron-right" },
  create: { labelTemplate: "创建{payload}", icon: "add-circle" },
  export: { labelTemplate: "导出{payload}", icon: "download" },
  download: { labelTemplate: "下载{payload}", icon: "download" },
  "api-call": { labelTemplate: "执行操作", icon: "code" },
};
```

#### 历史会话管理

```typescript
// 会话相关状态
const sessions = ref<Session[]>([]);
const showHistory = ref(false);

// 加载历史会话列表
const loadSessions = async (): Promise<void> => {
  try {
    const response = await api.get("/api/ai/sessions?limit=20");
    sessions.value = response.data.sessions.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
    }));
  } catch (error) {
    console.error("Failed to load sessions:", error);
  }
};

// 创建新会话
const createNewSession = (): void => {
  conversationId.value = null;
  messages.value = [];
  showHistory.value = false;
};

// 切换到指定会话
const switchToSession = async (sessionId: string): Promise<void> => {
  try {
    const response = await api.get(`/api/ai/sessions/${sessionId}`);
    const sessionData = response.data.session;

    conversationId.value = sessionId;
    messages.value = sessionData.messages.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
      ...(m.content?.includes("[action:") ? { actions: parseExistingActions(m.content) } : {}),
    }));

    showHistory.value = false;
  } catch (error) {
    console.error("Failed to switch session:", error);
    showErrorToast("切换会话失败");
  }
};
```

#### Markdown渲染配置

```typescript
// 使用 marked + highlight.js
import { marked } from "marked";
import hljs from "highlight.js";

// 配置marked选项
marked.setOptions({
  highlight: function (code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (e) {}
    }
    return hljs.highlightAuto(code).value;
  },
  breaks: true, // 支持换行
  gfm: true, // 支持GitHub风格Markdown
});

// 渲染函数
const renderMarkdown = (content: string): string => {
  return marked(content);
};
```

#### 文件上传处理

```typescript
const handleFileUpload = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  // 文件大小限制（最大5MB）
  if (file.size > 5 * 1024 * 1024) {
    showErrorToast("文件大小不能超过5MB");
    return;
  }

  // 支持的图片格式
  const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (imageTypes.includes(file.type)) {
    // 图片：转换为base64发送给AI
    await sendMessage(`[图片] 请解析这张${file.name}`, file);
  } else {
    // 其他文件暂不支持
    showErrorToast("暂支持上传图片文件（JPG/PNG/GIF/WebP）");
  }

  // 重置input以允许重复选择同一文件
  input.value = "";
};

// File转Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};
```

---

### 4.4 区域4：最近动态 & 待办事项

#### 最近访问（RecentVisits）

```typescript
interface VisitRecord {
  path: string;
  title: string;
  icon: string;
  timestamp: Date;
}

const STORAGE_KEY = "tingstudio_recent_visits";
const MAX_RECORDS = 10;

// 访问页面时调用（可在路由守卫中全局触发）
const recordVisit = (path: string, title: string, icon: string): void => {
  const visits = loadVisits();

  // 去重：移除已存在的同路径记录
  const filtered = visits.filter(v => v.path !== path);

  // 添加新记录到头部
  const newVisit: VisitRecord = {
    path,
    title,
    icon,
    timestamp: new Date(),
  };

  filtered.unshift(newVisit);

  // 只保留最近N条
  const trimmed = filtered.slice(0, MAX_RECORDS);

  // 持久化
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
};

// 加载记录
const loadVisits = (): VisitRecord[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// 清除记录
const clearVisits = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  visits.value = [];
};

// 格式化相对时间
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "刚刚";
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  return date.toLocaleDateString();
};
```

#### 待办事项（PendingTasks）

```typescript
interface Task {
  id: string;
  title: string;
  type: "approval" | "action" | "reminder";
  priority: "high" | "medium" | "low";
  createdAt: Date;
  relatedPath?: string;
  completed: boolean;
}

const fetchTasks = async (): Promise<void> => {
  loading.value = true;
  try {
    const response = await api.get("/api/tasks/pending?limit=4");
    tasks.value = response.data.tasks.map((t: any) => ({
      ...t,
      createdAt: new Date(t.createdAt),
    }));
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
  } finally {
    loading.value = false;
  }
};

// 快速完成任务
const toggleComplete = async (taskId: string): Promise<void> => {
  try {
    await api.patch(`/api/tasks/${taskId}/complete`);

    // 乐观更新：立即从列表移除
    tasks.value = tasks.value.filter(t => t.id !== taskId);

    // 触发父组件刷新数据卡片中的待办计数
    emit("task-completed");

    showToast("任务已完成 ✓", "success");
  } catch (error) {
    console.error("Failed to complete task:", error);
    showToast("操作失败，请重试", "error");
  }
};

// 类型标签映射
const TYPE_LABELS: Record<Task["type"], string> = {
  approval: "待审批",
  action: "待处理",
  reminder: "提醒",
};

const TYPE_COLORS: Record<Task["type"], string> = {
  approval: "#f59e0b", // amber
  action: "#3b82f6", // blue
  reminder: "#6b7280", // gray
};
```

---

## 🗂️ 五、左侧导航栏重构方案

### 5.1 新导航数据结构

```typescript
interface NavGroup {
  id: string;
  label: string;
  icon: string;
  defaultExpanded: boolean;
  children: NavChild[];
}

interface NavChild {
  path: string;
  label: string;
  icon: string;
}

interface HeroNavItem {
  id: string;
  type: "hero"; // 特殊英雄入口
  path: string;
  label: string;
  icon: string;
  description: string;
  highlight: boolean;
  alwaysVisible: boolean;
}

// 完整导航配置
const navConfig = {
  // 特殊项：AI助手（始终置顶，独立一档）
  hero: {
    id: "ai-home",
    type: "hero" as const,
    path: "/ai-assistant",
    label: "AI 助手",
    icon: "precise-monitor",
    description: "智能工作台",
    highlight: true,
    alwaysVisible: true,
  },

  // 分组1：业务管理
  groups: [
    {
      id: "business",
      label: "业务管理",
      icon: "edit",
      defaultExpanded: false,
      children: [
        { path: "/formulas", label: "配方管理", icon: "edit" },
        { path: "/materials", label: "原料管理", icon: "chart-bar" },
        { path: "/salesmen", label: "业务员管理", icon: "usergroup" },
      ],
    },
    {
      id: "analytics",
      label: "数据洞察",
      icon: "chart",
      defaultExpanded: false,
      children: [
        { path: "/sales", label: "销量分析", icon: "chart" },
        { path: "/reports", label: "报告中心", icon: "file-icon" },
        { path: "/nutrition", label: "营养分析", icon: "chart-pie" },
      ],
    },
    {
      id: "tools",
      label: "工具箱",
      icon: "setting",
      defaultExpanded: false,
      children: [
        { path: "/files", label: "文件管理", icon: "folder" },
        { path: "/exports", label: "导出中心", icon: "download" },
        { path: "/tools", label: "智能工具", icon: "setting" },
      ],
    },
  ],

  // 条件渲染：管理员专属分组
  adminGroup: {
    id: "system",
    label: "系统设置",
    icon: "control-platform",
    defaultExpanded: false,
    children: [{ path: "/model-management", label: "模型管理", icon: "control-platform" }],
  },
};
```

### 5.2 分组展开状态管理（规则C）

```typescript
// 状态
const expandedGroups = ref<Set<string>>(new Set());
const activePath = computed(() => route.path);

// 判断某个分组是否应该展开
const shouldExpandGroup = (groupId: string): boolean => {
  const group = [...navConfig.groups, navConfig.adminGroup].find(g => g.id === groupId);

  if (!group) return false;

  // 规则C：如果当前路由在该分组的子菜单中，自动展开
  const isActiveInGroup = group.children.some(
    child => activePath.value === child.path || activePath.value.startsWith(child.path + "/"),
  );

  return expandedGroups.value.has(groupId) || isActiveInGroup;
};

// 切换分组展开状态
const toggleGroup = (groupId: string): void => {
  const newSet = new Set(expandedGroups.value);

  if (newSet.has(groupId)) {
    newSet.delete(groupId);
  } else {
    newSet.add(groupId);
  }

  expandedGroups.value = newSet;

  // 持久化到localStorage
  saveExpandedState(newSet);
};

// 初始化展开状态
const initializeExpandedGroups = (): void => {
  const saved = localStorage.getItem("nav_expanded_groups");

  if (saved) {
    try {
      expandedGroups.value = new Set(JSON.parse(saved));
    } catch {
      expandedGroups.value = new Set();
    }
  } else {
    autoExpandCurrentGroup();
  }
};

// 自动展开包含当前路由的分组
const autoExpandCurrentGroup = (): void => {
  const allGroups = [...navConfig.groups];
  if (isAdmin.value) allGroups.push(navConfig.adminGroup);

  for (const group of allGroups) {
    if (group.children.some(child => activePath.value.startsWith(child.path))) {
      expandedGroups.value.add(group.id);
      break;
    }
  }
};

// 保存状态
const saveExpandedState = (groups: Set<string>): void => {
  localStorage.setItem("nav_expanded_groups", JSON.stringify([...groups]));
};
```

---

## 🔌 六、后端API需求清单

### 6.1 新增API端点

| 端点                      | 方法  | 功能               | 参数                                    | 响应                                         | 缓存策略 |
| ------------------------- | ----- | ------------------ | --------------------------------------- | -------------------------------------------- | -------- |
| `/api/ai/witty-comment`   | POST  | 生成AI俏皮话       | `{timeOfDay, userRole, recentActivity}` | `{comment, id}`                              | 1天      |
| `/api/dashboard/stats`    | GET   | 批量获取工作台数据 | 无                                      | `{formulas, materials, sales, pendingTasks}` | 5分钟    |
| `/api/tasks/pending`      | GET   | 获取待办事项       | `limit=4`                               | `{tasks: [...]}`                             | 实时     |
| `/api/tasks/:id/complete` | PATCH | 标记任务完成       | 无                                      | `{success: true}`                            | 无       |
| `/api/ai/chat`            | POST  | AI对话（支持流式） | `{message, conversation_id, stream}`    | SSE流                                        | 无       |
| `/api/ai/sessions`        | GET   | 获取历史会话       | `limit=20`                              | `{sessions: [...]}`                          | 实时     |
| `/api/ai/sessions/:id`    | GET   | 获取会话详情       | 无                                      | `{session: {...}}`                           | 实时     |
| `/api/ai/suggestions`     | POST  | 获取AI推荐         | `{userId, context}`                     | `{suggestions: [...]}`                       | 1小时    |

### 6.2 需修改的现有API

| 端点                         | 修改内容                      |
| ---------------------------- | ----------------------------- |
| `/api/formulas/stats`        | 统一返回格式 `{count, trend}` |
| `/api/materials/stats`       | 统一返回格式 `{count, trend}` |
| `/api/sales/monthly-summary` | 确保返回trend数据             |
| `/api/ai/chat`               | 确认支持SSE流式输出           |

---

## 📱 七、响应式适配策略

### 断点与布局变化

| 断点范围    | 设备类型   | 数据卡      | 快捷操作      | AI对话          | 底部区域   | 导航     |
| ----------- | ---------- | ----------- | ------------- | --------------- | ---------- | -------- |
| ≥1400px     | Desktop XL | 4列         | 3×2+气泡并排  | 高度500px       | 2列并排    | 正常     |
| 1200-1399px | Desktop L  | 4列         | 3×2+气泡稍窄  | 高度450px       | 2列并排    | 正常     |
| 992-1199px  | Tablet L   | 2×2         | 3×2+气泡换行  | 高度400px       | Tab切换    | 正常     |
| 768-991px   | Tablet M   | 2列         | 2×3+AI移入Tab | 高度350px可折叠 | Tab切换    | 折叠     |
| <768px      | Mobile     | 1列横向滑动 | 横向滚动列表  | 全屏覆盖        | 隐藏或抽屉 | 汉堡菜单 |

---

## 🚀 八、实施步骤与优先级

### Phase 1: 核心框架搭建（Day 1）

**目标**: 可运行的页面骨架

- [ ] 创建 `AIDashboard.vue` 主组件
- [ ] 实现4区域的HTML结构 + 基础样式
- [ ] 集成到路由 `/ai-assistant`
- [ ] 修改 `Home.vue` 导航配置（分组折叠）
- [ ] 修改默认路由 `/` → 重定向到 `/ai-assistant`
- [ ] 测试基础布局和响应式

**产出**: 页面可访问，显示静态mock数据

### Phase 2: 数据集成（Day 2）

**目标**: 真实数据驱动

- [ ] 实现数据概览卡片API对接
- [ ] 添加骨架屏加载态
- [ ] 数字递增动画
- [ ] 实现最近访问localStorage读写
- [ ] 实现待办事项API对接 + 快速完成功能
- [ ] 实现AI俏皮话API（含fallback机制）

**产出**: 所有区域显示真实数据，有加载态

### Phase 3: AI对话核心功能（Day 3-4）

**目标**: 可用的AI聊天界面

- [ ] 实现AI对话UI（消息列表、输入框、发送）
- [ ] 对接后端 `/api/ai/chat` 流式API
- [ ] 实现打字机效果 + 加载动画
- [ ] Markdown渲染集成
- [ ] 快捷标签功能
- [ ] 文件上传（图片OCR）
- [ ] 历史会话侧边栏
- [ ] 会话创建/切换逻辑

**产出**: 完整可用的AI对话功能

### Phase 4: AI推荐与交互增强（Day 5）

**目标**: 智能体验提升

- [ ] 实现AI推荐气泡卡
- [ ] 点击推荐自动填充对话框
- [ ] 解析AI回复中的[action:]标签
- [ ] 执行跳转/创建/导出等操作
- [ ] 快捷操作按钮跳转
- [ ] 欢迎语动画入场效果

**产出**: 智能化的交互体验

### Phase 5: 打磨与优化（Day 6）

**目标**: 生产级质量

- [ ] 错误处理与边界情况
- [ ] 性能优化（懒加载、虚拟滚动）
- [ ] 无障碍性（ARIA标签、键盘导航）
- [ ] 各断点的详细测试
- [ ] 用户反馈收集准备
- [ ] 文档编写

**产出**: 可上线的完整功能

### ⌨️ 键盘快捷键

- Ctrl/Cmd + Enter → 发送消息
- Escape → 清空输入框
- Ctrl/Cmd + / → 聚焦到输入框

---

## ❗ 九、风险与应对

| 风险            | 影响        | 应对措施                                              |
| --------------- | ----------- | ----------------------------------------------------- |
| AI流式API不稳定 | 对话体验差  | ① 降级为非流式<br>② 本地Mock模式<br>③ 友好错误提示    |
| 数据概览API慢   | 首屏加载慢  | ① 并行请求<br>② 骨架屏<br>③ 缓存5分钟                 |
| 移动端空间不足  | 布局混乱    | ① AI对话全屏覆盖<br>② Tab切换底部区域<br>③ 渐进式展示 |
| 俏皮话API成本高 | 运营成本高  | ① 本地池随机（免费）<br>② 每日仅请求1次<br>③ 缓存1天  |
| 历史浏览器兼容  | CSS动画异常 | ① 渐进增强<br>② Postcss前缀<br>③ 降级方案             |

---

## ✅ 十、验收标准 checklist

### 功能完整性

- [ ] 登录后直接进入AI助手工作台
- [ ] 4个数据卡片正确显示且可点击跳转
- [ ] 6个快捷操作按钮正常工作
- [ ] AI推荐气泡可点击并触发对话
- [ ] AI对话可发送/接收消息
- [ ] 流式输出效果正常（打字机）
- [ ] 快捷标签可用
- [ ] 文件上传（图片）可发送
- [ ] 历史会话可查看/切换
- [ ] 最近访问自动记录
- [ ] 待办事项可快速完成
- [ ] AI俏皮话每日刷新/点击刷新
- [ ] 左侧导航分组折叠正常（规则C）

### 视觉与交互

- [ ] 欢迎语渐变背景美观
- [ ] 数据卡片数字递增动画流畅
- [ ] AI对话区固定高度，不遮挡其他区域
- [ ] 消息气泡样式区分用户/AI
- [ ] Markdown渲染正确（表格/代码块）
- [ ] 加载态（骨架屏/打字指示器）清晰
- [ ] Hover/Focus状态反馈明显
- [ ] 过渡动画平滑自然

### 性能要求

- [ ] 首屏加载 < 3秒
- [ ] API并行请求，无串行等待
- [ ] 长消息列表虚拟滚动（>100条时）
- [ ] 图片上传压缩（>2MB时）
- [ ] 内存无泄漏（定时器清理）

### 兼容性

- [ ] Chrome/Edge 最新版完美运行
- [ ] Firefox/Safari 无明显异常
- [ ] 移动端 Safari (iOS) 基本可用
- [ ] 1366x768分辨率正常显示
- [ ] 1920x1080最佳体验

---

## 📌 十一、最终确认

在开始编码前，请确认：

- [ ] **本实施计划已审阅完毕**
- [ ] **所有伪代码逻辑清晰**
- [ ] **UI布局符合预期**
- [ ] **技术方案可行**
- [ ] **风险应对措施接受**
- [ ] **验收标准认可**
- [ ] **可以开始编码** ← 请勾选此项！

---

## 🎬 下一步行动

**一旦你确认以上计划（特别是勾选最后的"可以开始编码"），我将立即按照 Phase 1-5 的顺序开始编码实现！**

预计总工期：**6个工作日**（可并行压缩至4天）

**有任何疑问或需要调整的地方，请随时告诉我！** 🚀

---

_文档版本历史_

- v1.0 (2026-05-09): 初始版本，基于用户需求讨论生成
- v2.0 (2026-05-09): 修改AI俏皮话频率为1天1次，形成正式文档
