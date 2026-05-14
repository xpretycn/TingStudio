# 技术方案 — 悬浮球Agent增强（多轮对话+意图路由+工具调用）

> 版本: 1.0.0 | 日期: 2026-05-14 | 范围: 悬浮球AI助手FloatAgent

---

## 1. 架构变更总览

### 1.1 变更前后对比

```
【变更前】悬浮球Agent（仅表单填字段）
┌─────────────────────────────────────────────┐
│ AiAssistantFloat.vue                         │
│  ├─ FloatBubble.vue        (悬浮气泡)         │
│  ├─ FloatDrawer.vue        (抽屉面板)         │
│  ├─ ChatMessages.vue       (消息列表)          │
│  ├─ ChatInput.vue          (输入框)           │
│  └─ formFillAdapter.ts     (表单回填适配器)    │
├─ floatAgent.ts (store)                        │
│  └─ sendMessage() → POST /agent/parse-form    │
└─ agentController.ts                           │
     └─ parseForm() → LLM字段提取 → 返回JSON    │
└─────────────────────────────────────────────┘

【变更后】悬浮球Agent（双模：表单填字段 + Agent工具对话）
┌──────────────────────────────────────────────────────┐
│ AiAssistantFloat.vue                                  │
│  ├─ FloatBubble.vue  (增强：角标+快捷入口+状态灯)     │
│  ├─ FloatDrawer.vue  (增强：动态标题+指令模板栏)      │
│  ├─ ChatMessages.vue (增强：工具结果卡片)              │
│  ├─ ChatInput.vue    (增强：指令快捷按钮)              │
│  ├─ formFillAdapter.ts                               │
│  ├─ CompareCard.vue      (新：对比结果卡片)            │
│  ├─ QuotationCard.vue    (新：报价单卡片)              │
│  └─ SubstituteCard.vue   (新：替代建议卡片)            │
├─ floatAgent.ts (store) ─── 双路由                     │
│  ├─ classifyFloatIntent() → "fill"|"agent"           │
│  ├─ sendFillMessage()  → POST /agent/parse-form       │
│  └─ sendAgentMessage() → POST /agent/float-chat (SSE) │
└─ agentController.ts ─── 意图路由+新端点               │
     ├─ classifyFloatIntent() → 7类意图                 │
     ├─ floatChat() → fill→parseForm / 其他→floatReAct  │
     ├─ generateDescription() → 智能生成描述/制法        │
     ├─ getFieldHints() → 漏字段提示                     │
     └─ getHealth() → 健康检查                           │
  agentChatController.ts                                │
     └─ handleFloatReActStream() → SSE流式ReAct         │
  toolRegistration.ts (新增3个工具)                      │
     ├─ compare_formulas                                 │
     ├─ suggest_material_substitute                      │
     └─ generate_quotation                               │
  promptEngine.ts (增强)                                 │
     └─ 字段咨询知识库                                   │
└──────────────────────────────────────────────────────┘
```

### 1.2 核心变更原则

1. **双模路由**: 输入文本在前端/后端双重分类，非填字段类走Agent工具调用SSE流式
2. **意图分类规则**: 关键词匹配，无LLM调用（零延迟）。按优先级：compare > substitute > quotation > generate > calculate > consult > fill（默认）
3. **SSE复用**: 悬浮球Agent复用AIDashboard的SSE协议格式，前端统一事件处理
4. **独立会话**: 悬浮球使用独立session（非AIDashboard的会话），存储在sessionStore中
5. **表单内智能生成**: F2直接在FormulaForm.vue内增加按钮+调用独立接口，不经过ReAct

---

## 2. 模块详细设计

### 2.1 前端意图路由 — classifyFloatIntent

```typescript
// 前端 floatAgent.ts (store层)
function classifyFloatIntent(utterance: string): "fill" | "agent" {
  const text = utterance.toLowerCase();
  // agent类意图关键词
  if (/对比|比较|vs|区别|差异/.test(text)) return "agent";
  if (/替代|替换|代替|换掉|替补/.test(text)) return "agent";
  if (/报价|报价单|多少钱|售价|定价|价格/.test(text)) return "agent";
  if (/生成描述|生成制法|智能生成|写描述|写制法|帮我写/.test(text)) return "agent";
  if (/算|计算|校验|合规|营养|成本|含量比|系数/.test(text)) return "agent";
  if (/什么意思|合规吗|范围|规范|单位|标准|规则|是什么|怎么填|能不能|可以吗/.test(text)) return "agent";
  return "fill"; // 默认走表单填字段
}
```

### 2.2 后端意图路由 — classifyFloatIntent

```typescript
// 后端 agentController.ts
private classifyFloatIntent(utterance: string): "fill" | "consult" | "calculate"
  | "compare" | "substitute" | "quotation" | "generate" {
  // 关键词匹配，优先级从高到低
  if (/对比|比较|vs| versus|区别|差异/.test(text)) return "compare";
  if (/替代|替换|代替|换掉|替补/.test(text)) return "substitute";
  if (/报价|报价单|多少钱|售价|定价|价格/.test(text)) return "quotation";
  if (/生成描述|生成制法|智能生成|写描述|写制法|帮我写/.test(text)) return "generate";
  if (/算|计算|校验|合规|营养|成本|含量比|系数/.test(text)) return "calculate";
  if (/什么意思|合规吗|范围|规范|单位|标准|规则|是什么|怎么填|能不能|可以吗/.test(text)) return "consult";
  return "fill";
}
```

**补充确认**: 前端粗分类(fill/agent)和后端细分类(7类)同时存在。后端细分类仅用于未来扩展（如分开展示不同类型的结果），当前agent类统一走ReAct流程。

### 2.3 FloatChat SSE流程

```
用户输入 → classifyFloatIntent(utterance)
  ├─ "fill" → POST /agent/parse-form → 返回JSON → 显示字段解析结果
  └─ "agent" → POST /agent/float-chat (SSE)
       ├─ setupSSE (心跳+超时)
       ├─ buildSystemPrompt (含pageContext)
       ├─ ReAct循环 (最多5轮)
       │   ├─ callLLMWithTools (流式输出chunk)
       │   ├─ tool_calls判断
       │   │   ├─ 无 → 输出完成
       │   │   └─ 有 → content_clear → 执行工具 → 返回tool_result
       │   └─ 循环
       ├─ needsSummary判断 → 需要则请求LLM生成总结
       ├─ 存储消息到sessionStore
       └─ done事件 (sessionId + usage + latency)
```

### 2.4 FloatChat SSE事件协议

| 事件类型 | 方向 | 数据格式 | 说明 |
|---------|------|---------|------|
| chunk | server→client | `{ type: "chunk", content: "..." }` | LLM流式文本块 |
| content_clear | server→client | `{ type: "content_clear" }` | 清空已渲染的预回复 |
| tool_calls | server→client | `{ type: "tool_calls", calls: [{name, arguments}] }` | 工具调用通知 |
| tool_result | server→client | `{ type: "tool_result", name, toolName, data, success, displayType }` | 工具执行结果 |
| write_guidance | server→client | `{ type: "write_guidance", toolName, params, message, navigationLink }` | 写入操作被拦截的导航指引 |
| done | server→client | `{ type: "done", sessionId, usage, model, latency }` | 流式响应完成 |
| error | server→client | `{ type: "error", message }` | 错误信息 |

### 2.5 新增3个Tool

#### compare_formulas
- **描述**: 对比两个配方的营养成分、原料组成和成本差异
- **输入**: `{ formula_a: string, formula_b: string }`
- **输出**: 两个配方的完整营养数据 + 原料差异对比表
- **实现**: 调用nutritionEngine.calculate + 原料列表差集计算

#### suggest_material_substitute
- **描述**: 为指定原料提供替代建议，基于同类型原料匹配
- **输入**: `{ material_name: string, quantity?: number }`
- **输出**: 原始原料信息 + 候选替代列表(最多5个)
- **实现**: 查materials表同类型原料，按名称排序

#### generate_quotation
- **描述**: 为指定配方生成智能报价单，含原料明细、成本计算和建议售价
- **输入**: `{ formula_id?: string, formula_name?: string, profit_margin_percent?: number, packaging_cost?: number }`
- **输出**: 配方信息 + 成本明细(原料/包装/利润) + 单位成本
- **实现**: 查formulas表→解析materials_json→查materials表取单价→调用costCalculator

### 2.6 智能生成描述/制法（F2）

不经过Agent ReAct流程，独立接口:
```
POST /agent/generate-description
Body: { formulaName, materials, finishedWeight, revisionReason?, existingDescription?, type? }

响应: { success: true, data: { content: string, type: string } }
```

**Prompt设计**:
- 新建模式: 根据配方名称+原料列表生成描述或制法
- 升版模式: 根据升版原因+现有描述+新旧差异生成更新描述

### 2.7 UI组件增强

#### FloatBubble增强
- **角标**: 右上角红点+数字(fieldHintsCount)，触发fetchFieldHints()
- **快捷入口**: 悬停显示"含量比校验"、"配方对比"、"报价单"三个按钮
- **状态灯**: 底部小圆点，颜色由agentHealthStatus决定

#### FloatDrawer增强
- **动态标题**: 从固定"AI 助手"改为`dynamicTitle`（如"新增配方"）
- **指令模板栏**: 输入框上方增加"+ 指令模板"行，点击填充预设指令

---

## 3. 核心数据流

### 3.1 表单填字段流程（现有，不变）

```
用户输入"名称叫佛手玫苓膏，成品重量200g"
  → sendFillMessage()
  → POST /agent/parse-form
  → LLM解析出 {fields: {name: "佛手玫苓膏", finished_weight: 200}, message: "..."}
  → 显示结果 + 回填按钮
  → fillFormFields() → 回填表单
```

### 3.2 Agent对话流程（新增）

```
用户输入"帮我计算这个配方的营养成分"
  → sendAgentMessage()
  → POST /agent/float-chat (SSE)
  → 后端意图路由: "calculate"
  → ReAct循环 → LLM调用calculate_nutrition工具
  → 流式返回chunk → content_clear → tool_result → 总结chunk → done
  → 前端渲染toolData到ChatMessages
```

### 3.3 漏字段轮询（新增）

```
route.name变更 → setPageId()
  → fetchFieldHints() → GET /agent/field-hints?pageId=xxx
  → fieldHintsCount更新 → FloatBubble角标更新
  → 每30秒轮询（仅当悬浮球未打开时）
```

---

## 4. 错误处理与降级

| 场景 | 处理方式 |
|------|---------|
| SSE连接中断 | 前端显示"连接已断开"提示，loading=false |
| LLM调用超时 | 后端发送error事件，前端显示"模型响应超时" |
| Tool执行失败 | tool_result中success=false，LLM在下一轮回复中告知用户 |
| 意图无法识别 | 默认走fill（parseForm），LLM会返回解析失败提示 |
| 模型异常 | health接口返回error状态，气泡显示红色状态灯 |
| 无匹配工具结果 | LLM返回"数据库中暂无相关数据" |
