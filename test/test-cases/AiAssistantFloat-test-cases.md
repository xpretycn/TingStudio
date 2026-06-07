# AiAssistantFloat 浮动助手组件测试用例

| 字段 | 值 |
|------|-----|
| 文档ID | TC-AF-20260606-002 |
| 版本 | v2.0 |
| 组件集 | AiAssistantFloat（8 文件） |
| 编写日期 | 2026-06-06 |
| 测试维度 | 7维度（P/E/B/U/L/R/S）+ 5类特殊场景 |

---

## 一、组件概览

| 序号 | 组件 | 职责 | 交互元素数 |
|------|------|------|-----------|
| 1 | AiAssistantFloat.vue | 顶层编排：路由监听、回填反馈、子组件组合 | 6 |
| 2 | FloatBubble.vue | 浮动气泡：拖拽、状态指示、快捷命令 | 7 |
| 3 | FloatDrawer.vue | 抽屉面板：可拖拽标题栏、全屏切换 | 5 |
| 4 | ChatInput.vue | 聊天输入：指令模板、文本域、发送 | 8 |
| 5 | ChatMessages.vue | 消息列表：卡片渲染、回填、操作按钮 | 17 |
| 6 | CompareCard.vue | 配方对比卡片（纯展示） | 0 |
| 7 | QuotationCard.vue | 报价单卡片（纯展示） | 0 |
| 8 | SubstituteCard.vue | 替代建议卡片（纯展示） | 0 |

**交互元素总计：43 个**

---

## 二、交互元素清单

### 2.1 AiAssistantFloat.vue（A01-A06）

| ID | 元素 | 类型 | 事件/行为 |
|----|------|------|----------|
| A01 | FloatBubble 子组件 | 容器 | @click→toggleOpen, @command→handleQuickCommand |
| A02 | FloatDrawer 子组件 | 容器 | @close→setOpen(false), @fullscreen→toggleFullscreen |
| A03 | ChatMessages 子组件 | 容器 | @fill→handleFill |
| A04 | ChatInput 子组件 | 容器 | @send→sendMessage |
| A05 | fill-feedback-overlay | div | @click→fillFeedback=null |
| A06 | feedback-close-btn | button | @click→fillFeedback=null |

### 2.2 FloatBubble.vue（B01-B07）

| ID | 元素 | 类型 | 事件/行为 |
|----|------|------|----------|
| B01 | float-bubble 根div | div | @mouseenter→showCommands=true, @mouseleave→showCommands=false, @mousedown→onDragStart, @touchstart→onDragStart |
| B02 | status-dot | span | 根据 healthStatus 显示 online(绿)/loading(黄)/error(红) |
| B03 | badge-dot | span | badgeCount>0 时显示，>99 显示 "99+" |
| B04 | cmd-popup | div | showCommands=true 且 dragging=false 时显示，含智能定位 |
| B05 | cmd-item: 含量比校验 | button | @click→emit("command","含量比校验") |
| B06 | cmd-item: 配方对比 | button | @click→emit("command","对比配方") |
| B07 | cmd-item: 报价单 | button | @click→emit("command","生成报价单") |

### 2.3 FloatDrawer.vue（C01-C05）

| ID | 元素 | 类型 | 事件/行为 |
|----|------|------|----------|
| C01 | drawer-header | div | @mousedown→onDragStart（全屏模式禁用）, @touchstart→onDragStart |
| C02 | header-avatar | img | 显示用户头像或默认头像 |
| C03 | header-title | span | 显示 store.dynamicTitle |
| C04 | 全屏切换按钮 | button | @click→emit("fullscreen") |
| C05 | 关闭按钮 | button | @click→emit("close") |

### 2.4 ChatInput.vue（I01-I08）

| ID | 元素 | 类型 | 事件/行为 |
|----|------|------|----------|
| I01 | cmd-toggle 按钮 | button | @click→showCommands=true |
| I02 | cmd-bar 指令模板栏 | div | 包含 4 个 cmd-chip |
| I03 | cmd-chip: 含量比校验 | button | @click→handleCommandClick("含量比校验") |
| I04 | cmd-chip: 营养成分 | button | @click→handleCommandClick("计算营养成分") |
| I05 | cmd-chip: 成本计算 | button | @click→handleCommandClick("计算成本") |
| I06 | cmd-chip: 配方对比 | button | @click→handleCommandClick("对比配方") |
| I07 | textarea | textarea | Enter 发送, Shift+Enter 换行, autoResize 最大 120px |
| I08 | send-btn | button | @click→handleSend, disabled 条件: disabled\|\|!text.trim() |

### 2.5 ChatMessages.vue（M01-M17）

| ID | 元素 | 类型 | 事件/行为 |
|----|------|------|----------|
| M01 | chat-messages 根div | div | @scroll→handleScroll |
| M02 | empty-hint | div | 消息为空时显示引导文案 |
| M03 | message-row | div | 按 msg.role 区分 user/assistant 布局 |
| M04 | CompareCard | 组件 | msg.displayType==='compare' 时渲染 |
| M05 | QuotationCard | 组件 | msg.displayType==='quotation' 时渲染 |
| M06 | SubstituteCard | 组件 | msg.displayType==='substitute' 时渲染 |
| M07 | parsed-fields | div | msg.fields 非空时显示已解析字段网格 |
| M08 | fill-btn | button | @click→emit("fill", msg.fields) |
| M09 | missing-fields | div | msg.missingFields 非空时显示缺失字段标签 |
| M10 | message-meta | div | 显示 model/latency/tokenUsage |
| M11 | 复制按钮(user) | button | @click→copyContent(msg.content) |
| M12 | 删除按钮(user) | button | @click→handleDelete(msg.id) |
| M13 | 复制按钮(assistant) | button | @click→copyContent(msg.content) |
| M14 | 重试按钮(assistant) | button | @click→handleRetry(msg) |
| M15 | typing-indicator | div | loading=true 时显示三点跳动动画 |
| M16 | scroll-bottom-btn | button | @click→scrollToBottomClick, 滚动距底部>300px 时显示 |
| M17 | scroll-btn-pulse | span | loading=true 且显示回到底部按钮时的脉冲指示 |

---

## 三、7维度测试用例

### 3.1 AiAssistantFloat.vue（A01-A06）

#### A01: FloatBubble 子组件

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | A01-P01 | 点击气泡打开抽屉 | isVisible=true, isOpen=false | 点击 FloatBubble | store.toggleOpen() 被调用，isOpen 变为 true |
| P | A01-P02 | 气泡仅未登录时隐藏 | authStore.isAuthenticated=false | 页面加载 | FloatBubble 的 v-show 条件为 false，气泡不可见 |
| P | A01-P03 | 气泡在抽屉打开时隐藏 | isOpen=true | 观察 DOM | FloatBubble 的 v-show="isVisible && !isOpen" 为 false |
| E | A01-E01 | 气泡点击时 store 异常 | store.toggleOpen 抛出异常 | 点击气泡 | 不应导致页面崩溃，异常被上层捕获 |
| B | A01-B01 | 快速连续点击气泡 | isOpen=false | 连续点击 5 次 | 仅触发一次 toggleOpen，最终状态为 isOpen=true |
| U | A01-U01 | 气泡显示状态指示灯 | healthStatus="online" | 观察气泡 | status-dot 显示绿色 |
| U | A01-U02 | 气泡显示角标数字 | badgeCount=5 | 观察气泡 | badge-dot 显示 "5" |
| L | A01-L01 | 气泡 tooltip 文案 | 悬停气泡 | 观察提示 | 显示 "AI 表单助手" |
| R | A01-R01 | 小屏幕下气泡位置 | viewport=375px | 页面加载 | 气泡不超出视口边界 |
| S | A01-S01 | 未认证时气泡不可见 | authStore.isAuthenticated=false | 检查 DOM | v-show 条件阻止渲染，不暴露功能入口 |

#### A02: FloatDrawer 子组件

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | A02-P01 | 关闭抽屉 | isOpen=true | 点击关闭按钮 | store.setOpen(false) 被调用，isOpen 变为 false |
| P | A02-P02 | 全屏切换 | isFullscreen=false | 点击全屏按钮 | store.toggleFullscreen() 被调用 |
| E | A02-E01 | 抽屉关闭时点击关闭 | isOpen=false | 点击关闭按钮 | 无异常，不触发额外操作 |
| B | A02-B01 | 快速切换全屏 | isFullscreen=false | 连续点击全屏按钮 3 次 | 最终状态为 isFullscreen=true（奇数次点击） |
| U | A02-U01 | 抽屉标题动态显示 | currentPageId="formula-add" | 打开抽屉 | 标题显示 "新增配方" |
| U | A02-U02 | 抽屉标题默认值 | currentPageId="" | 打开抽屉 | 标题显示 "AI 助手" |
| L | A02-L01 | 不同页面标题映射 | currentPageId="material-edit" | 打开抽屉 | 标题显示 "编辑原料" |
| R | A02-R01 | 小屏幕下抽屉宽度 | viewport=375px, drawerWidth=400 | 打开抽屉 | 抽屉宽度不超过视口 |
| S | A02-S01 | 抽屉 z-index 层级 | isOpen=true | 检查 DOM | z-index=10000，不被其他元素遮挡 |

#### A03: ChatMessages 子组件

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | A03-P01 | 回填字段触发 | 消息含 fields={name:"测试"} | 点击 fill-btn | handleFill 被调用，fillFeedback 非空 |
| P | A03-P02 | 回填结果显示 | fillFeedback 非空 | 观察反馈卡片 | 显示每个字段的 label/value/成功状态 |
| E | A03-E01 | 回填字段为空对象 | fields={} | 点击 fill-btn | fillFormFields 返回空数组，不显示反馈 |
| B | A03-B01 | 大量字段回填 | fields 含 20 个键值对 | 点击 fill-btn | 反馈卡片可滚动，max-height=60vh 生效 |
| U | A03-U01 | 回填成功行样式 | fillFeedback=[{success:true}] | 观察反馈行 | 行背景为默认色，状态显示 ✓ |
| U | A03-U02 | 回填失败行样式 | fillFeedback=[{success:false}] | 观察反馈行 | 行背景为红色淡底，状态显示 ✗ |
| L | A03-L01 | 回填字段标签映射 | fields={name:"测试"}, pageId="formula-add" | 观察反馈 | label 显示 "配方名称" 而非 "name" |
| R | A03-R01 | 反馈卡片小屏适配 | viewport=375px | 触发回填 | 卡片宽度 320px 不超出视口 |
| S | A03-S01 | 回填值不包含敏感信息 | fields 含密码字段 | 观察反馈 | 敏感字段值不在反馈中明文展示 |

#### A04: ChatInput 子组件

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | A04-P01 | 发送消息 | 输入 "测试消息" | 点击发送按钮 | store.sendMessage("测试消息") 被调用 |
| P | A04-P02 | loading 时禁用输入 | loading=true | 观察输入区 | textarea 和 send-btn 均为 disabled |
| E | A04-E01 | 发送空消息 | text="" | 点击发送按钮 | 不触发 emit("send") |
| E | A04-E02 | 发送纯空格消息 | text="   " | 点击发送按钮 | 不触发 emit("send")，text.trim() 为空 |
| B | A04-B01 | 发送超长消息 | text=10000 字符 | 点击发送 | 消息正常发送，不截断 |
| U | A04-U01 | 输入框自动增高 | 输入多行文本 | 观察 textarea | 高度随内容增长，最大 120px |
| U | A04-U02 | 发送后输入框重置 | 输入消息并发送 | 发送后观察 | text 清空，textarea 高度恢复为 1 行 |
| L | A04-L01 | placeholder 文案 | 初始状态 | 观察输入框 | 显示 "描述你要填写的内容…" |
| R | A04-R01 | 小屏输入区布局 | viewport=375px | 观察输入区 | 输入框和发送按钮不换行，布局正常 |
| S | A04-S01 | 输入内容不持久化 | 发送消息后刷新页面 | 检查 localStorage | 输入内容不被存储到本地 |

#### A05: fill-feedback-overlay

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | A05-P01 | 点击遮罩关闭反馈 | fillFeedback 非空 | 点击遮罩区域 | fillFeedback 变为 null，反馈消失 |
| P | A05-P02 | 点击卡片不关闭 | fillFeedback 非空 | 点击反馈卡片内容 | fillFeedback 不变（@click.stop 阻止冒泡） |
| E | A05-E01 | 反馈为 null 时不渲染 | fillFeedback=null | 检查 DOM | overlay 不存在于 DOM 中 |
| U | A05-U01 | 遮罩半透明背景 | fillFeedback 非空 | 观察遮罩 | 背景色为 rgba(93,78,96,0.3) |
| U | A05-U02 | 反馈卡片入场动画 | fillFeedback 从 null→非空 | 观察动画 | fade 过渡，opacity 0→1，持续 0.2s |
| B | A05-B01 | 大量反馈项滚动 | fillFeedback 含 50 项 | 观察卡片 | 卡片 max-height=60vh，内容可滚动 |
| R | A05-R01 | 小屏反馈卡片居中 | viewport=375px | 触发回填 | 卡片居中显示，宽度 320px |
| S | A05-S01 | 遮罩阻止底层交互 | fillFeedback 非空 | 点击遮罩外的页面元素 | 底层元素不可操作，z-index=10001 |

#### A06: feedback-close-btn

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | A06-P01 | 点击关闭按钮 | fillFeedback 非空 | 点击 "知道了" 按钮 | fillFeedback 变为 null |
| U | A06-U01 | 按钮渐变背景 | 悬停按钮 | 观察样式 | 背景从 gradient-btn 变为 gradient-btn-hover |
| L | A06-L01 | 按钮文案 | 观察按钮 | — | 显示 "知道了" |
| B | A06-B01 | 快速连续点击 | fillFeedback 非空 | 连续点击 3 次 | fillFeedback 变为 null，无异常 |

---

### 3.2 FloatBubble.vue（B01-B07）

#### B01: float-bubble 根div

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | B01-P01 | 鼠标悬停显示命令 | showCommands=false | 鼠标移入气泡 | showCommands 变为 true，cmd-popup 显示 |
| P | B01-P02 | 鼠标移出隐藏命令 | showCommands=true | 鼠标移出气泡 | showCommands 变为 false，cmd-popup 隐藏 |
| P | B01-P03 | 点击（非拖拽）触发 | initialized=true | mousedown→不移动→mouseup | dragMoved=false，emit("click") 被触发 |
| P | B01-P04 | 拖拽移动气泡 | initialized=true | mousedown→移动 10px→mouseup | dragMoved=true，emit("click") 不触发，气泡位置更新 |
| P | B01-P05 | 触摸拖拽 | 移动端 | touchstart→touchmove→touchend | 气泡跟随手指移动，位移>3px 判定为拖拽 |
| E | B01-E01 | 拖拽到视口边缘 | posX 接近 0 | 向左拖拽 | clamp() 限制 posX≥0，气泡不超出视口 |
| E | B01-E02 | 拖拽到视口右下角 | posX 接近 vw-56 | 向右下拖拽 | clamp() 限制 posX≤vw-56, posY≤vh-56 |
| B | B01-B01 | 拖拽位移阈值 3px | initialized=true | mousedown→移动 2px→mouseup | dragMoved=false，判定为点击，emit("click") 触发 |
| B | B01-B02 | 拖拽位移恰好 3px | initialized=true | mousedown→移动 3px→mouseup | dragMoved=true，判定为拖拽，emit("click") 不触发 |
| U | B01-U01 | 脉冲动画 | showPulse=true | 观察气泡 | bubble-inner 有 pulse-shadow 动画，2s 循环 |
| U | B01-U02 | 悬停放大效果 | 鼠标移入 | 观察 bubble-inner | transform: scale(1.1)，阴影增强 |
| U | B01-U03 | 按下缩小效果 | mousedown | 观察 bubble-inner | transform: scale(0.95) |
| R | B01-R01 | 窗口 resize 后位置修正 | 气泡在右下角 | 缩小窗口 | onResize 触发 clamp()，气泡不超出视口 |
| S | B01-S01 | 拖拽时隐藏命令弹窗 | showCommands=true, dragging | 开始拖拽 | cmd-popup 不显示（v-if="showCommands && !dragging"） |

#### B02: status-dot

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | B02-P01 | 在线状态 | healthStatus="online" | 观察状态灯 | 绿色圆点，class="status-dot--online" |
| P | B02-P02 | 加载中状态 | healthStatus="loading" | 观察状态灯 | 黄色圆点，class="status-dot--loading" |
| P | B02-P03 | 错误状态 | healthStatus="error" | 观察状态灯 | 红色圆点，class="status-dot--error" |
| E | B02-E01 | 未传 healthStatus | healthStatus=undefined | 观察状态灯 | 不添加修饰类，使用默认样式 |
| U | B02-U01 | 状态灯位置 | 观察气泡 | — | 位于气泡右下角，bottom:2px, right:2px，白色边框 |

#### B03: badge-dot

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | B03-P01 | 显示角标数字 | badgeCount=5 | 观察角标 | 显示 "5" |
| P | B03-P02 | 角标为 0 时不显示 | badgeCount=0 | 检查 DOM | badge-dot 不渲染 |
| P | B03-P03 | 角标为 null 时不显示 | badgeCount=undefined | 检查 DOM | badge-dot 不渲染 |
| B | B03-B01 | 角标超过 99 | badgeCount=100 | 观察角标 | 显示 "99+" |
| B | B03-B02 | 角标为 1 | badgeCount=1 | 观察角标 | 显示 "1" |
| U | B03-U01 | 角标位置和样式 | badgeCount=5 | 观察角标 | 位于气泡右上角，红色背景，白色文字，pointer-events:none |

#### B04: cmd-popup

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | B04-P01 | 鼠标悬停显示弹窗 | showCommands=false | 鼠标移入气泡 | cmd-popup 显示，含 3 个 cmd-item |
| P | B04-P02 | 拖拽时不显示弹窗 | dragging=true | 鼠标悬停 | cmd-popup 不显示 |
| E | B04-E01 | 鼠标快速移入移出 | — | 快速移入移出 | 弹窗正常显示/隐藏，无闪烁残留 |
| U | B04-U01 | 弹窗入场动画 | showCommands 从 false→true | 观察动画 | cmd-fade 过渡，opacity 0→1，translateY(4px)→0 |
| U | B04-U02 | 弹窗在气泡上方 | 气泡在页面底部 | 鼠标悬停 | showAbove=true，弹窗在气泡上方 |
| U | B04-U03 | 弹窗在气泡下方 | 气泡在页面顶部 | 鼠标悬停 | showAbove=false，弹窗在气泡下方 |
| R | B04-R01 | 弹窗水平定位-右侧 | 气泡在左侧 | 鼠标悬停 | hClass="cmd-popup--left"，弹窗左对齐 |
| R | B04-R02 | 弹窗水平定位-左侧 | 气泡在右侧 | 鼠标悬停 | hClass="cmd-popup--right"，弹窗右对齐 |

#### B05-B07: cmd-item 按钮

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | B05-P01 | 点击含量比校验 | cmd-popup 可见 | 点击 "含量比校验" | emit("command","含量比校验")，emit("click")，showCommands=false |
| P | B06-P01 | 点击配方对比 | cmd-popup 可见 | 点击 "配方对比" | emit("command","对比配方")，emit("click")，showCommands=false |
| P | B07-P01 | 点击报价单 | cmd-popup 可见 | 点击 "报价单" | emit("command","生成报价单")，emit("click")，showCommands=false |
| E | B05-E01 | 快速连续点击命令 | cmd-popup 可见 | 连续点击 2 次 | 仅触发一次 command 事件 |
| U | B05-U01 | 命令项悬停效果 | 鼠标悬停 | 观察 cmd-item | 背景变为 color-bg-hover |
| L | B05-L01 | 命令项文案 | 观察 cmd-popup | — | 显示 "含量比校验"、"配方对比"、"报价单" |
| S | B05-S01 | mousedown.stop 阻止冒泡 | cmd-popup 可见 | mousedown 在 cmd-item | 不触发气泡的 onDragStart |

---

### 3.3 FloatDrawer.vue（C01-C05）

#### C01: drawer-header

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | C01-P01 | 拖拽标题栏移动抽屉 | fullscreen=false | mousedown→移动→mouseup | 抽屉跟随移动，clamp 限制不超出视口 |
| P | C01-P02 | 全屏模式禁用拖拽 | fullscreen=true | mousedown 标题栏 | onDragStart 直接 return，不注册拖拽事件 |
| P | C01-P03 | 触摸拖拽 | fullscreen=false | touchstart→touchmove→touchend | 抽屉跟随移动 |
| E | C01-E01 | 拖拽到视口外 | posX 接近 0 | 向左拖拽 | clamp() 限制位置在视口内 |
| U | C01-U01 | 标题栏渐变背景 | visible=true | 观察标题栏 | background: gradient-brand，白色文字 |
| U | C01-U02 | 标题栏光标 | visible=true | 悬停标题栏 | cursor: grab，按下时 cursor: grabbing |
| R | C01-R01 | 窗口 resize 后位置修正 | 抽屉在右下角 | 缩小窗口 | onResize 触发 clamp()，抽屉不超出视口 |

#### C02: header-avatar

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | C02-P01 | 显示用户头像 | authStore.user.avatar 有值 | 观察标题栏 | 显示用户头像图片 |
| P | C02-P02 | 显示默认头像 | authStore.user.avatar 为空 | 观察标题栏 | 显示 /avatar-default.jpg |
| E | C02-E01 | 头像加载失败 | avatar URL 无效 | 观察标题栏 | 显示破碎图片或 alt 文本 |
| U | C02-U01 | 头像样式 | visible=true | 观察头像 | 32x32 圆形，rgba(255,255,255,0.2) 背景 |

#### C03: header-title

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | C03-P01 | 显示动态标题 | currentPageId="formula-add" | 观察标题 | 显示 "新增配方" |
| P | C03-P02 | 默认标题 | currentPageId="" | 观察标题 | 显示 "AI 助手" |
| L | C03-L01 | 所有页面标题映射 | 逐个设置 pageId | 观察标题 | formula-add→新增配方, material-edit→编辑原料, salesman-add→新增业务员 等 |

#### C04: 全屏切换按钮

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | C04-P01 | 切换全屏 | fullscreen=false | 点击全屏按钮 | emit("fullscreen")，图标切换为缩小图标 |
| P | C04-P02 | 退出全屏 | fullscreen=true | 点击全屏按钮 | emit("fullscreen")，图标切换为放大图标 |
| E | C04-E01 | mousedown.stop 阻止拖拽 | — | mousedown 全屏按钮 | 不触发标题栏拖拽 |
| U | C04-U01 | 全屏按钮图标 | fullscreen=false | 观察图标 | 显示四角放大 SVG 图标 |
| U | C04-U02 | 退出全屏图标 | fullscreen=true | 观察图标 | 显示四角缩小 SVG 图标 |
| L | C04-L01 | 按钮 title 提示 | fullscreen=false | 悬停按钮 | title 显示 "全屏" |
| L | C04-L02 | 按钮 title 提示 | fullscreen=true | 悬停按钮 | title 显示 "退出全屏" |

#### C05: 关闭按钮

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | C05-P01 | 点击关闭 | visible=true | 点击关闭按钮 | emit("close") 被触发 |
| E | C05-E01 | mousedown.stop 阻止拖拽 | — | mousedown 关闭按钮 | 不触发标题栏拖拽 |
| U | C05-U01 | 关闭按钮悬停效果 | 悬停关闭按钮 | 观察样式 | 背景变为 rgba(227,77,89,0.7) 红色 |
| L | C05-L01 | 按钮 title 提示 | 悬停关闭按钮 | — | title 显示 "关闭" |

---

### 3.4 ChatInput.vue（I01-I08）

#### I01: cmd-toggle 按钮

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | I01-P01 | 点击展开指令栏 | showCommands=false | 点击 cmd-toggle | showCommands 变为 true，cmd-bar 显示 |
| P | I01-P02 | 指令栏展开后隐藏 toggle | showCommands=true | 观察 DOM | cmd-toggle 不显示（v-if="!showCommands"） |
| U | I01-U01 | toggle 按钮虚线边框 | showCommands=false | 观察按钮 | border: 1px dashed，悬停时变为主题色 |
| L | I01-L01 | toggle 按钮文案 | 观察 cmd-toggle | — | 显示 "指令模板"（含加号图标） |

#### I02: cmd-bar 指令模板栏

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | I02-P01 | 显示 4 个指令模板 | showCommands=true | 观察 cmd-bar | 含量比校验、营养成分、成本计算、配方对比 |
| U | I02-U01 | 指令栏入场动画 | showCommands 从 false→true | 观察动画 | cmd-slide 过渡，opacity 0→1，translateY(-4px)→0 |
| R | I02-R01 | 小屏指令栏换行 | viewport=375px | 观察指令栏 | flex-wrap:wrap 生效，指令模板自动换行 |

#### I03-I06: cmd-chip 按钮

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | I03-P01 | 点击含量比校验 | showCommands=true | 点击 cmd-chip | emit("send","含量比校验")，showCommands=false |
| P | I04-P01 | 点击营养成分 | showCommands=true | 点击 cmd-chip | emit("send","计算营养成分")，showCommands=false |
| P | I05-P01 | 点击成本计算 | showCommands=true | 点击 cmd-chip | emit("send","计算成本")，showCommands=false |
| P | I06-P01 | 点击配方对比 | showCommands=true | 点击 cmd-chip | emit("send","对比配方")，showCommands=false |
| E | I03-E01 | disabled 时点击无效 | disabled=true | 点击 cmd-chip | 不触发 emit，按钮 opacity=0.4 |
| U | I03-U01 | 指令模板悬停效果 | 悬停 cmd-chip | 观察样式 | 边框和文字变为 emerald 色，背景淡绿 |
| L | I03-L01 | 指令模板文案 | 观察 cmd-bar | — | 含量比校验、营养成分、成本计算、配方对比 |

#### I07: textarea

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | I07-P01 | Enter 发送消息 | text="测试" | 按 Enter | handleSend 触发，emit("send","测试")，text 清空 |
| P | I07-P02 | Shift+Enter 换行 | text="测试" | 按 Shift+Enter | 不触发发送，textarea 内换行 |
| P | I07-P03 | 自动增高 | 输入多行文本 | 观察 textarea | 高度随内容增长，最大 120px |
| P | I07-P04 | 发送后重置高度 | 输入多行并发送 | 发送后观察 | textarea 高度恢复为 1 行 |
| E | I07-E01 | disabled 时不可输入 | disabled=true | 尝试输入 | textarea 不可聚焦，opacity=0.5 |
| B | I07-B01 | 输入恰好 120px 高度 | 输入大量文本 | 观察 textarea | 高度不超过 120px，出现滚动条 |
| U | I07-U01 | 聚焦时边框高亮 | 聚焦 textarea | 观察边框 | border-color 变为 color-primary，box-shadow 出现 |
| L | I07-L01 | placeholder 文案 | text="" | 观察输入框 | 显示 "描述你要填写的内容…" |
| R | I07-R01 | 小屏输入框宽度 | viewport=375px | 观察输入框 | 输入框自适应宽度，不溢出 |

#### I08: send-btn

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | I08-P01 | 点击发送 | text="测试" | 点击发送按钮 | emit("send","测试")，text 清空 |
| P | I08-P02 | 空文本时禁用 | text="" | 观察按钮 | disabled=true，opacity=0.4 |
| P | I08-P03 | loading 时禁用 | disabled=true | 观察按钮 | disabled=true，不可点击 |
| E | I08-E01 | 纯空格时禁用 | text="   " | 观察按钮 | disabled=true（text.trim() 为空） |
| U | I08-U01 | 悬停放大效果 | text 非空 | 悬停按钮 | transform: scale(1.05)，背景渐变加深 |
| U | I08-U02 | 发送按钮图标 | 观察按钮 | — | 显示纸飞机 SVG 图标 |

---

### 3.5 ChatMessages.vue（M01-M17）

#### M01: chat-messages 根div

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M01-P01 | 滚动触发 handleScroll | 消息列表可滚动 | 向上滚动 | showScrollBottom 根据距底部距离更新 |
| E | M01-E01 | scrollContainer 为 null | 组件未挂载 | 触发滚动 | handleScroll 中 if (!scrollContainer.value) return |
| U | M01-U01 | 自定义滚动条 | 消息列表可滚动 | 观察滚动条 | 宽度 4px，圆角，color-border 色 |
| R | M01-R01 | 小屏消息列表高度 | viewport=375px | 观察列表 | flex:1 自适应剩余高度 |

#### M02: empty-hint

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M02-P01 | 空消息显示引导 | messages=[] | 观察列表 | 显示猫咪 SVG 和引导文案 |
| P | M02-P02 | 有消息时隐藏 | messages.length>0 | 检查 DOM | empty-hint 不渲染 |
| U | M02-U01 | 猫咪 SVG 弹跳动画 | messages=[] | 观察动画 | catBounce 动画，4s 循环，上下 5px |
| L | M02-L01 | 引导文案 | messages=[] | 观察文案 | 显示 "描述你要填写的内容，我来帮你解析" |

#### M03: message-row

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M03-P01 | 用户消息右对齐 | msg.role="user" | 观察消息行 | justify-content: flex-end，头像在右侧 |
| P | M03-P02 | 助手消息左对齐 | msg.role="assistant" | 观察消息行 | 默认 flex-start，头像在左侧 |
| U | M03-U01 | 悬停显示操作按钮 | 消息存在 | 悬停消息行 | message-action-icons opacity 从 0 变为 1 |
| U | M03-U02 | 用户消息气泡样式 | msg.role="user" | 观察气泡 | 渐变背景，白色文字，右下圆角 4px |
| U | M03-U03 | 助手消息气泡样式 | msg.role="assistant" | 观察气泡 | 浅色背景，边框，左下圆角 4px |

#### M04-M06: 卡片组件

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M04-P01 | CompareCard 渲染 | msg.displayType="compare", msg.toolData 非空 | 观察消息 | CompareCard 组件渲染，显示配方对比数据 |
| P | M05-P01 | QuotationCard 渲染 | msg.displayType="quotation", msg.toolData 非空 | 观察消息 | QuotationCard 组件渲染，显示报价数据 |
| P | M06-P01 | SubstituteCard 渲染 | msg.displayType="substitute", msg.toolData 非空 | 观察消息 | SubstituteCard 组件渲染，显示替代建议 |
| E | M04-E01 | toolData 为空 | msg.displayType="compare", msg.toolData=undefined | 观察消息 | CompareCard 不渲染（v-if 条件不满足） |
| E | M04-E02 | 非卡片类型不渲染卡片 | msg.displayType=undefined | 观察消息 | 无卡片组件渲染 |
| U | M04-U01 | 卡片与文本共存 | msg.displayType="compare", msg.content 非空 | 观察消息 | 卡片渲染，文本不渲染（isCardType 返回 true 时隐藏 bubble-text） |

#### M07: parsed-fields

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M07-P01 | 显示已解析字段 | msg.fields={name:"测试",weight:"100g"} | 观察消息 | 显示字段网格，每个字段显示 label 和 value |
| P | M07-P02 | fields 为空对象时不显示 | msg.fields={} | 检查 DOM | parsed-fields 不渲染 |
| E | M07-E01 | fields 为 undefined | msg.fields=undefined | 检查 DOM | parsed-fields 不渲染 |
| U | M07-U01 | 字段标签映射 | msg.fields={name:"测试"}, fieldLabelMap={name:"配方名称"} | 观察字段 | 显示 "配方名称" 而非 "name" |
| U | M07-U02 | 字段芯片样式 | msg.fields 非空 | 观察字段 | 背景色 color-primary-bg，key 为次要色，value 为主要色加粗 |
| L | M07-L01 | 已解析字段标题 | msg.fields 非空 | 观察标题 | 显示 "已解析字段"（含箭头图标） |

#### M08: fill-btn

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M08-P01 | 点击回填按钮 | msg.fields={name:"测试"} | 点击 fill-btn | emit("fill", msg.fields) 被触发 |
| E | M08-E01 | fields 为空时按钮不显示 | msg.fields={} | 检查 DOM | fill-btn 不渲染（parsed-fields 整体不渲染） |
| U | M08-U01 | 回填按钮悬停效果 | 悬停 fill-btn | 观察样式 | 背景变为 color-primary，文字变白 |
| L | M08-L01 | 回填按钮文案 | 观察 fill-btn | — | 显示 "回填到表单"（含加号图标） |

#### M09: missing-fields

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M09-P01 | 显示缺失字段 | msg.missingFields=["name","phone"] | 观察消息 | 显示 "还需提供：" + 2 个标签 |
| P | M09-P02 | 缺失字段为空时不显示 | msg.missingFields=[] | 检查 DOM | missing-fields 不渲染 |
| U | M09-U01 | 缺失字段标签样式 | msg.missingFields 非空 | 观察标签 | 橙色淡底，color-warning 色 |
| L | M09-L01 | 缺失字段标签映射 | msg.missingFields=["name"], fieldLabelMap={name:"姓名"} | 观察标签 | 显示 "姓名" 而非 "name" |
| L | M09-L02 | 缺失字段前缀文案 | msg.missingFields 非空 | 观察文案 | 显示 "还需提供：" |

#### M10: message-meta

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M10-P01 | 显示模型名称 | msg.metadata.model="deepseek" | 观察元数据 | 显示 "deepseek" 标签 |
| P | M10-P02 | 显示延迟时间 | msg.metadata.latency=500 | 观察元数据 | 显示 "500ms" |
| P | M10-P03 | 显示长延迟 | msg.metadata.latency=2500 | 观察元数据 | 显示 "2.5s" |
| P | M10-P04 | 显示 Token 用量 | msg.metadata.tokenUsage={total_tokens:150} | 观察元数据 | 显示 "Token：150"，title 含输入/输出明细 |
| E | M10-E01 | metadata 为空 | msg.metadata=undefined | 检查 DOM | message-meta 不渲染 |
| E | M10-E02 | latency 为 0 | msg.metadata.latency=0 | 观察元数据 | 延迟部分不显示（v-if 条件 latency>0） |
| U | M10-U01 | 元数据分隔符 | model 和 latency 同时存在 | 观察元数据 | 中间显示 "·" 分隔符 |

#### M11-M14: 消息操作按钮

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M11-P01 | 复制用户消息 | msg.role="user" | 点击复制按钮 | navigator.clipboard.writeText 被调用 |
| P | M12-P01 | 删除用户消息 | msg.role="user" | 点击删除按钮 | floatStore.deleteMessage(msg.id) 被调用 |
| P | M13-P01 | 复制助手消息 | msg.role="assistant" | 点击复制按钮 | navigator.clipboard.writeText 被调用 |
| P | M14-P01 | 重试助手消息 | msg.role="assistant" | 点击重试按钮 | floatStore.retryMessage(msg) 被调用 |
| E | M11-E01 | 剪贴板 API 不可用 | navigator.clipboard 不可用 | 点击复制 | 降级使用 document.execCommand("copy") |
| E | M14-E01 | 重试时无对应用户消息 | 助手消息前无用户消息 | 点击重试 | retryMessage 中 retryContent 为空，直接 return |
| U | M11-U01 | 操作按钮默认隐藏 | 未悬停消息 | 观察按钮 | opacity=0，不可见 |
| U | M11-U02 | 操作按钮悬停显示 | 悬停消息行 | 观察按钮 | opacity=1，过渡 0.2s |
| U | M11-U03 | 操作按钮点击缩放 | 点击操作按钮 | 观察按钮 | transform: scale(0.92) |
| L | M11-L01 | 复制按钮 title | 悬停复制按钮 | — | title 显示 "复制" |
| L | M12-L01 | 删除按钮 title | 悬停删除按钮 | — | title 显示 "删除" |
| L | M14-L01 | 重试按钮 title | 悬停重试按钮 | — | title 显示 "重试" |

#### M15: typing-indicator

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M15-P01 | loading 时显示打字指示 | loading=true | 观察列表 | 显示三点跳动动画 |
| P | M15-P02 | 非loading时隐藏 | loading=false | 检查 DOM | typing-indicator 不渲染 |
| U | M15-U01 | 三点跳动动画 | loading=true | 观察动画 | 3 个圆点依次跳动，1.2s 循环，延迟 0.15s/0.3s |
| U | M15-U02 | 打字指示器在助手消息行 | loading=true | 观察布局 | 位于 message-row--assistant 内，含助手头像 |

#### M16: scroll-bottom-btn

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M16-P01 | 滚动远离底部时显示 | 滚动距底部>300px | 观察按钮 | scroll-bottom-btn 显示 |
| P | M16-P02 | 滚动到底部时隐藏 | 滚动距底部<300px | 观察按钮 | scroll-bottom-btn 隐藏 |
| P | M16-P03 | 点击回到底部 | 按钮可见 | 点击按钮 | scrollToBottom() 被调用，showScrollBottom=false |
| E | M16-E01 | scrollContainer 为 null | 组件未挂载 | 触发滚动 | handleScroll 中 if (!scrollContainer.value) return |
| U | M16-U01 | 按钮入场动画 | showScrollBottom 从 false→true | 观察动画 | scroll-btn-fade 过渡，opacity 0→1，translateY(10px)→0 |
| U | M16-U02 | 按钮悬停效果 | 悬停按钮 | 观察样式 | 背景变为 emerald，上移 2px |
| L | M16-L01 | 按钮 title 提示 | 悬停按钮 | — | title 显示 "回到底部" |

#### M17: scroll-btn-pulse

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | M17-P01 | loading 时显示脉冲 | loading=true, showScrollBottom=true | 观察按钮 | 显示 emerald 脉冲圆点 |
| P | M17-P02 | 非 loading 时隐藏 | loading=false | 观察按钮 | 脉冲圆点不显示 |
| U | M17-U01 | 脉冲动画 | loading=true | 观察动画 | scroll-pulse 动画，1.5s 循环，emerald 色扩散 |

---

### 3.6 CompareCard.vue（纯展示）

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | CC-P01 | 完整数据渲染 | data 含 formulaA/B, materialDiff, nutritionA/B | 观察卡片 | 显示配方信息、原料差异表、营养对比 |
| P | CC-P02 | 无原料差异 | data.materialDiff=[] | 观察卡片 | 原料差异 section 不显示 |
| P | CC-P03 | 无营养数据 | data.nutritionA/B=undefined | 观察卡片 | 营养对比 section 不显示 |
| E | CC-E01 | formulaA 为空 | data.formulaA=undefined | 观察卡片 | A 侧信息为空，不报错 |
| B | CC-B01 | 大量原料差异 | materialDiff 含 30 项 | 观察卡片 | 差异表格正常显示，可滚动 |
| U | CC-U01 | 差值正数样式 | item.diff=5 | 观察差值 | color: color-primary（diff-up） |
| U | CC-U02 | 差值负数样式 | item.diff=-3 | 观察差值 | color: color-danger（diff-down） |
| U | CC-U03 | 差值为零样式 | item.diff=0 | 观察差值 | color: color-text-placeholder（diff-zero） |
| U | CC-U04 | 仅一方有原料 | item.onlyIn!=="both" | 观察行 | 行背景为淡粉色（diff-row--only） |
| L | CC-L01 | 卡片标题 | 观察卡片 | — | 显示 "配方对比分析" |
| L | CC-L02 | 差异表表头 | 观察差异表 | — | 显示 "原料"、"A(g)"、"B(g)"、"差值" |

### 3.7 QuotationCard.vue（纯展示）

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | QC-P01 | 完整数据渲染 | data 含 formula, costBreakdown, profitMargin, unitCost | 观察卡片 | 显示成本明细、建议售价、单位成本、原料明细 |
| P | QC-P02 | 无单位成本 | data.unitCost=undefined | 观察卡片 | 单位成本行不显示 |
| P | QC-P03 | 无原料明细 | data.costBreakdown.breakdown=[] | 观察卡片 | 原料明细 section 不显示 |
| E | QC-E01 | costBreakdown 为空 | data.costBreakdown=undefined | 观察卡片 | 金额显示 undefined，不报错 |
| B | QC-B01 | 大量原料明细 | breakdown 含 50 项 | 观察卡片 | 明细表格正常显示 |
| U | QC-U01 | 成本小计样式 | 观察 cost-val--sub | — | color: color-warning |
| U | QC-U02 | 利润额样式 | 观察 cost-val--profit | — | color: color-primary |
| U | QC-U03 | 建议售价样式 | 观察总行 | — | 渐变绿色背景，18px 加粗 |
| L | QC-L01 | 卡片标题 | 观察卡片 | — | 显示 "智能报价单" |
| L | QC-L02 | 成本项标签 | 观察成本网格 | — | 原料小计、包装成本、其他费用、成本小计、利润率、利润额 |
| L | QC-L03 | 建议售前标签 | 观察总行 | — | 显示 "建议售价" |

### 3.8 SubstituteCard.vue（纯展示）

| 维度 | ID | 用例名 | 前置条件 | 操作 | 预期结果 |
|------|-----|--------|---------|------|---------|
| P | SC-P01 | 完整数据渲染 | data 含 original, substitutes | 观察卡片 | 显示原始原料信息、替代列表 |
| P | SC-P02 | 无替代原料 | data.substitutes=[] | 观察卡片 | 显示空状态文案 |
| P | SC-P03 | 自定义空状态消息 | data.message="暂无同类型替代原料" | 观察卡片 | 显示自定义消息 |
| E | SC-E01 | original 为空 | data.original=undefined | 观察卡片 | 原始原料信息为空，不报错 |
| U | SC-U01 | 替代项悬停效果 | 悬停 sub-item | 观察样式 | 背景变为 color-bg-hover |
| U | SC-U02 | 排名编号样式 | 观察 sub-rank | — | 渐变背景圆形，白色加粗数字 |
| U | SC-U03 | 相似度徽章样式 | 观察 sim-badge | — | emerald 淡底，圆角胶囊 |
| L | SC-L01 | 卡片标题 | 观察卡片 | — | 显示 "原料替代建议" |
| L | SC-L02 | 原始原料标签 | 观察原始原料区 | — | 显示 "原始原料：" |
| L | SC-L03 | 类型标签映射 | type="herb" | 观察类型 | 显示 "药材" |
| L | SC-L04 | 类型标签映射 | type="supplement" | 观察类型 | 显示 "辅料" |

---

## 四、跨组件联动测试

| ID | 联动场景 | 涉及组件 | 操作步骤 | 预期结果 |
|----|---------|---------|---------|---------|
| XLINK-01 | 气泡点击→抽屉打开→字段提示 | A01→A02→A03 | 1. 点击气泡 2. 抽屉打开 3. 检查消息列表 | store.toggleOpen()→isOpen=true→fetchFieldHints→checkMissingFieldsLocal→showMissingFieldsHint |
| XLINK-02 | 输入消息→AI回复→回填 | A04→A03→A05 | 1. 输入 "配方名称为测试" 2. AI 返回 fields 3. 点击回填 | sendMessage→sendFillMessage→handleFill→fillFeedback 显示 |
| XLINK-03 | 快捷命令→AI回复 | B05→A04→A03 | 1. 悬停气泡 2. 点击 "含量比校验" 3. 观察 AI 回复 | handleQuickCommand→sendMessage→sendAgentMessage→SSE 流式回复 |
| XLINK-04 | 抽屉关闭→气泡显示 | A02→A01 | 1. 抽屉打开 2. 点击关闭 | isOpen=false→FloatBubble v-show 变为 true |
| XLINK-05 | 路由变化→标题更新→消息清空 | 路由→C03→A03 | 1. 从配方页导航到原料页 | pageId 更新→dynamicTitle 变化→contextMode="page" 时 messages 清空 |
| XLINK-06 | 回填反馈→关闭→重新回填 | A05/A06→A03 | 1. 触发回填 2. 关闭反馈 3. 再次回填 | fillFeedback=null→再次回填时新反馈正常显示 |
| XLINK-07 | 全屏切换→布局变化 | C04→A02/A03/A04 | 1. 点击全屏 2. 观察布局 | fullscreen=true→抽屉全屏，标题栏不可拖拽，内容区自适应 |
| XLINK-08 | 指令模板→发送→loading→回复 | I03→I07/I08→M15 | 1. 点击指令模板 2. 观察 loading 3. AI 回复 | send→loading=true→typing-indicator→SSE 流→loading=false |

---

## 五、特殊场景测试

### X-AI: AI 功能

| ID | 场景 | 前置条件 | 操作 | 预期结果 |
|----|------|---------|------|---------|
| X-AI-01 | SSE 流式对话 | pageId="formula-add" | 输入 "对比配方" | sendAgentMessage 触发，SSE 流逐步更新 aiMsg.content |
| X-AI-02 | SSE chunk 事件 | SSE 流进行中 | 接收 data: {"type":"chunk","content":"测试"} | appendMessageContent 追加 "测试" 到消息内容 |
| X-AI-03 | SSE tool_result 事件 | SSE 流进行中 | 接收 data: {"type":"tool_result","displayType":"compare","data":{...}} | 消息更新 displayType 和 toolData，CompareCard 渲染 |
| X-AI-04 | SSE write_guidance 事件 | SSE 流进行中 | 接收 data: {"type":"write_guidance","message":"需要前往编辑页"} | 消息内容更新为引导文案 |
| X-AI-05 | SSE done 事件 | SSE 流完成 | 接收 data: {"type":"done","sessionId":"xxx","model":"deepseek","latency":500} | sessionId 更新，metadata 附加到消息 |
| X-AI-06 | SSE error 事件 | SSE 流出错 | 接收 data: {"type":"error","message":"模型调用失败"} | 消息内容更新为错误信息 |
| X-AI-07 | SSE content_clear 事件 | SSE 流进行中 | 接收 data: {"type":"content_clear"} | 消息内容清空为 "" |
| X-AI-08 | 多轮对话上下文保持 | 已有 3 轮对话 | 发送第 4 轮消息 | context 取最近 6 条消息（slice(-6)）发送给后端 |
| X-AI-09 | AI 响应超时反馈 | fetch 请求超过 30s | 等待响应 | 最终 catch 到网络错误，显示 "网络异常，请稍后重试" |
| X-AI-10 | 写意图拦截引导 | 输入 "帮我删除配方" | 发送消息 | classifyFloatIntent 返回 "agent"，sendAgentMessage 触发，后端返回 write_guidance |
| X-AI-11 | 填充意图识别 | 输入 "配方名称是测试" | 发送消息 | classifyFloatIntent 返回 "fill"，sendFillMessage 触发 |
| X-AI-12 | Agent 意图识别-对比 | 输入 "对比这两个配方" | 发送消息 | classifyFloatIntent 返回 "agent"（匹配 "对比"） |
| X-AI-13 | Agent 意图识别-替代 | 输入 "有没有替代原料" | 发送消息 | classifyFloatIntent 返回 "agent"（匹配 "替代"） |
| X-AI-14 | Agent 意图识别-报价 | 输入 "生成报价单" | 发送消息 | classifyFloatIntent 返回 "agent"（匹配 "报价"） |
| X-AI-15 | Agent 意图识别-计算 | 输入 "计算成本" | 发送消息 | classifyFloatIntent 返回 "agent"（匹配 "计算"） |
| X-AI-16 | Agent 意图识别-规则 | 输入 "含量比合规吗" | 发送消息 | classifyFloatIntent 返回 "agent"（匹配 "合规"） |
| X-AI-17 | SSE 流非 200 响应 | 后端返回 500 | 发送 agent 消息 | updateMessage 设置 content 为 err.error 或 "请求失败" |
| X-AI-18 | SSE 流无 body | resp.body 为 null | 发送 agent 消息 | updateMessage 设置 content 为 "无法读取响应流" |
| X-AI-19 | SSE JSON 解析错误 | 接收非法 JSON | SSE 流进行中 | 忽略该 chunk，继续处理后续数据 |
| X-AI-20 | 健康检查定时 | authStore.isAuthenticated=true | 等待 60s | fetchHealth 被定时调用，status-dot 更新 |

### X-AS: 异步任务

| ID | 场景 | 前置条件 | 操作 | 预期结果 |
|----|------|---------|------|---------|
| X-AS-01 | SSE 流进行中关闭抽屉 | loading=true | 关闭抽屉 | SSE 流继续执行，loading 状态不变，消息仍会更新 |
| X-AS-02 | SSE 流进行中发送新消息 | loading=true | 输入新消息 | ChatInput disabled=true，无法发送 |
| X-AS-03 | loading 状态管理 | 发送消息 | 观察 loading 变化 | 发送前 loading=false→发送后 loading=true→完成后 loading=false |
| X-AS-04 | fetchFieldHints 异步 | pageId 非空 | 路由变化 | fetchFieldHints 异步调用，不阻塞 UI |
| X-AS-05 | loadConfig 异步 | 首次进入页面 | 路由变化 | loadConfig 异步加载，configLoaded 变为 true |
| X-AS-06 | 多个异步请求并发 | 打开抽屉 | toggleOpen | fetchFieldHints 和 checkMissingFieldsLocal 并发执行 |
| X-AS-07 | 定时器清理 | 组件挂载后 | 卸载组件 | healthTimer 和 fieldHintsTimer 被 clearInterval 清理 |
| X-AS-08 | fieldHintsTimer 定时刷新 | authStore.isAuthenticated=true, pageId 非空 | 等待 3s | refreshLocalFieldHints 被定时调用 |

### X-AU: 登录会话

| ID | 场景 | 前置条件 | 操作 | 预期结果 |
|----|------|---------|------|---------|
| X-AU-01 | 未登录时浮动助手不可见 | authStore.isAuthenticated=false | 页面加载 | isVisible=false，FloatBubble 和 FloatDrawer 均不显示 |
| X-AU-02 | 登录后浮动助手显示 | authStore.isAuthenticated=true | 登录 | isVisible 根据 enabled 和 enabledPages 计算 |
| X-AU-03 | Token 过期跳转 | SSE 请求返回 401 | 发送 agent 消息 | HTTP 拦截器自动清除 Token，跳转登录页 |
| X-AU-04 | Token 自动注入 | authStore.isAuthenticated=true | 发送 agent 消息 | fetch 请求头包含 Authorization: Bearer {token} |
| X-AU-05 | 未认证时不启动定时器 | authStore.isAuthenticated=false | 组件挂载 | healthTimer 和 fieldHintsTimer 不启动 |
| X-AU-06 | 认证状态变化时定时器行为 | 从已认证变为未认证 | 退出登录 | 定时器仍运行但内部 if 判断跳过执行 |

### X-R: 浏览器路由

| ID | 场景 | 前置条件 | 操作 | 预期结果 |
|----|------|---------|------|---------|
| X-R-01 | 路由变化联动 pageId | route.name="FormulaNew" | 导航到新增配方页 | ROUTE_PAGE_MAP 映射 pageId="formula-add" |
| X-R-02 | 未知路由不映射 | route.name="Dashboard" | 导航到仪表盘 | pageId=""，isVisible=false |
| X-R-03 | 不同页面显示不同标题 | pageId="material-add" | 导航到新增原料页 | dynamicTitle="新增原料" |
| X-R-04 | 不同页面显示不同字段提示 | pageId="formula-add" | 打开抽屉 | FIELD_LABEL_MAPS["formula-add"] 提供字段标签映射 |
| X-R-05 | 路由变化时消息清空 | contextMode="page" | 从配方页导航到原料页 | messages 清空，sessionId 重置 |
| X-R-06 | 路由变化时消息保留 | contextMode="global" | 从配方页导航到原料页 | messages 保留，sessionId 保留 |
| X-R-07 | 路由变化时加载配置 | configLoaded=false | 首次导航到表单页 | store.loadConfig() 被调用 |
| X-R-08 | 路由变化时刷新字段提示 | pageId 变化 | 导航到新页面 | fetchFieldHints + refreshLocalFieldHints 被调用 |
| X-R-09 | isVisible 变化时刷新字段提示 | isVisible 从 false→true | 进入表单页 | fetchFieldHints 被调用 |

### X-DC: 数据一致性

| ID | 场景 | 前置条件 | 操作 | 预期结果 |
|----|------|---------|------|---------|
| X-DC-01 | 回填结果与表单字段对应 | pageId="formula-add", fields={name:"测试",finished_weight:"100"} | 点击回填 | fillFormFields 查找 data-field="name" 和 data-field="finished_weight" 对应的输入框 |
| X-DC-02 | 部分回填失败处理 | fields={name:"测试",unknown_field:"值"} | 点击回填 | name 回填成功(✓)，unknown_field 回填失败(✗)，反馈卡片均显示 |
| X-DC-03 | TDesign Select 回填 | data-field 对应 t-select 组件 | 点击回填 | fillTDesignSelect 尝试匹配选项文本或 data-value |
| X-DC-04 | TDesign RadioGroup 回填 | data-field 对应 t-radio-group 组件 | 点击回填 | fillTDesignRadioGroup 尝试匹配 radio value 或标签文本 |
| X-DC-05 | TDesign InputNumber 回填 | data-field 对应 t-input-number 组件 | 点击回填 | fillTDesignInputNumber 设置内部 input 值 |
| X-DC-06 | 原料列表特殊回填 | fields={materials:"枸杞:10,红枣:5"} | 点击回填 | 拆分为 material_name="枸杞" + material_amount="10" 等 |
| X-DC-07 | 回填后字段提示刷新 | 回填前 missingFields=["name"] | 回填 name 后 | 500ms 后 refreshLocalFieldHints 更新，badgeCount 减少 |
| X-DC-08 | 回填值 null/undefined 跳过 | fields={name:"测试",age:null} | 点击回填 | age 字段被跳过（if value===null continue） |
| X-DC-09 | findInput 多选择器降级 | data-field 不存在 | 点击回填 | 依次尝试 name/id/testid 选择器，最终返回 "未找到对应输入框" |
| X-DC-10 | setNativeValue 触发 Vue 响应 | 回填 TDesign Input | 点击回填 | dispatchEvent("input") + dispatchEvent("change") 确保 Vue 响应式更新 |
| X-DC-11 | SSE sessionId 一致性 | 多轮对话 | 发送多条消息 | sessionId 在 fill 和 agent 模式间共享，后端可追踪会话 |
| X-DC-12 | 重试消息内容一致性 | 助手消息回复异常 | 点击重试 | retryMessage 找到前一条用户消息，重新 sendMessage |
| X-DC-13 | 删除消息不影响其他消息 | messages 含 3 条 | 删除第 2 条 | 第 1、3 条消息保留，id 不变 |

---

## 六、覆盖率统计

### 6.1 交互元素覆盖

| 组件 | 交互元素数 | P | E | B | U | L | R | S | 合计 |
|------|-----------|---|---|---|---|---|---|---|------|
| AiAssistantFloat.vue | 6 | 8 | 4 | 4 | 9 | 5 | 4 | 4 | 38 |
| FloatBubble.vue | 7 | 9 | 4 | 3 | 7 | 2 | 3 | 2 | 30 |
| FloatDrawer.vue | 5 | 6 | 2 | 1 | 6 | 3 | 1 | 1 | 20 |
| ChatInput.vue | 8 | 10 | 3 | 2 | 7 | 3 | 2 | 1 | 28 |
| ChatMessages.vue | 17 | 20 | 6 | 2 | 15 | 9 | 1 | 0 | 53 |
| CompareCard.vue | 0 | 3 | 1 | 1 | 4 | 2 | 0 | 0 | 11 |
| QuotationCard.vue | 0 | 3 | 1 | 1 | 3 | 3 | 0 | 0 | 11 |
| SubstituteCard.vue | 0 | 4 | 1 | 0 | 3 | 4 | 0 | 0 | 12 |
| **合计** | **43** | **63** | **22** | **14** | **54** | **31** | **11** | **8** | **203** |

### 6.2 特殊场景覆盖

| 类别 | 用例数 |
|------|--------|
| X-AI: AI 功能 | 20 |
| X-AS: 异步任务 | 8 |
| X-AU: 登录会话 | 6 |
| X-R: 浏览器路由 | 9 |
| X-DC: 数据一致性 | 13 |
| **合计** | **56** |

### 6.3 跨组件联动覆盖

| 类别 | 用例数 |
|------|--------|
| 跨组件联动 | 8 |

### 6.4 总计

| 统计项 | 数量 |
|--------|------|
| 7维度测试用例 | 203 |
| 特殊场景用例 | 56 |
| 跨组件联动用例 | 8 |
| **总用例数** | **267** |

### 6.5 维度覆盖率

| 维度 | 用例数 | 占比 |
|------|--------|------|
| P (正向) | 63 | 31.0% |
| E (异常) | 22 | 10.8% |
| B (边界) | 14 | 6.9% |
| U (视觉) | 54 | 26.6% |
| L (文案) | 31 | 15.3% |
| R (响应式) | 11 | 5.4% |
| S (安全) | 8 | 3.9% |

---

## 七、附录

### A. ROUTE_PAGE_MAP 映射表

| 路由名 | pageId | dynamicTitle |
|--------|--------|-------------|
| FormulaNew | formula-add | 新增配方 |
| FormulaEdit | formula-edit | 编辑配方 |
| MaterialNew | material-add | 新增原料 |
| MaterialEdit | material-edit | 编辑原料 |
| SalesmanNew | salesman-add | 新增业务员 |
| SalesmanEdit | salesman-edit | 编辑业务员 |

### B. FIELD_LABEL_MAPS 映射表

| pageId | 字段映射 |
|--------|---------|
| formula-add/edit | name→配方名称, finished_weight→成品重量, ratio_factor→系数, salesman_name→业务员, description→描述, materials→原料列表 |
| material-add/edit | name→原料名称, code→编码, material_type→原料类型, unit→单位, stock→库存, unit_price→单价, description→描述 |
| salesman-add/edit | name→姓名, phone→手机号, region→区域, department→部门, email→邮箱, code→工号 |

### C. REQUIRED_FIELDS 映射表

| pageId | 必填字段 |
|--------|---------|
| formula-add/edit | name, finished_weight, salesman_name |
| material-add/edit | name, material_type, unit |
| salesman-add/edit | name, phone |

### D. classifyFloatIntent 关键词映射

| 意图 | 关键词正则 |
|------|-----------|
| agent | 对比\|比较\|vs\|区别\|差异\|替代\|替换\|代替\|换掉\|替补\|报价\|报价单\|多少钱\|售价\|定价\|价格\|生成描述\|生成制法\|智能生成\|写描述\|写制法\|帮我写\|算\|计算\|校验\|合规\|营养\|成本\|含量比\|系数\|什么意思\|合规吗\|范围\|规范\|单位\|标准\|规则\|是什么\|怎么填\|能不能\|可以吗 |
| fill | 不匹配上述任何关键词 |

### E. formFillAdapter 选择器优先级

| 优先级 | 选择器 |
|--------|--------|
| 1 | `[data-field="${key}"]` |
| 2 | `input[name="${key}"]` |
| 3 | `textarea[name="${key}"]` |
| 4 | `select[name="${key}"]` |
| 5 | `[data-testid="${key}"]` |
| 6 | `#${key}` |
