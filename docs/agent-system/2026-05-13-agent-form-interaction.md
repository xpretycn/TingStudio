# Agent 表单交互方案

> 版本：v1.1 | 日期：2026-05-13 | 状态：已实现

## 1. 概述

当前 Agent 的用户交互方式仅支持纯文本追问和简单的确认对话框，无法输出结构化表单供用户填写。本方案为 Agent 新增**表单交互能力**，使其能在聊天流中渲染可交互表单，收集结构化数据后执行工具。

### 1.1 当前交互方式

| 机制 | 实现方式 | 局限 |
|------|----------|------|
| 追问（follow_up） | 缺少参数时返回文本追问 | 纯文本提示，用户需手动组织回答格式 |
| 确认（confirm） | 写操作弹出确认对话框 | 简单的"确认/取消"，无法修改参数 |
| 结果展示 | AgentResultRenderer（table/card/toast） | 只读展示，无交互 |

### 1.2 目标

- Agent 能输出可交互表单（输入框、下拉选择、多选等）
- 表单嵌入聊天消息流，非弹窗
- 三层校验体系（前端即时 + 前端提交 + 后端业务）
- 提交失败时表单保持可编辑，错误回填到对应字段
- 提交成功后表单收起为只读摘要

## 2. 架构设计

### 2.1 数据流

```
用户: "帮我创建配方"
    │
    ▼
后端 LLM → 识别意图(create_formula) → 缺少参数
    │
    ▼ 返回 SSE form 事件（含表单 schema + 下拉选项数据）
    │
前端渲染 AgentFormRenderer（嵌入聊天流）
    │
    ▼ 用户填写表单
    │
前端 L1/L2 校验 ──失败──→ 字段下方红色提示，修正后继续
    │
    ▼ 通过
    │
POST /agent/submit-form { formId, toolName, params }
    │
    ▼
后端 L3 业务校验（工具 handler 内部）
    │
    ├──失败──→ 返回 { success: false, errors: [...] }
    │           前端回填错误到表单，用户修改后重新提交
    │
    ▼ 通过
    │
执行工具 → 返回结果
    │
    ▼
前端：表单收起为只读 + 下方展示执行结果（toast/card）
```

### 2.2 改动层级

| 层级 | 文件 | 改动 | 说明 |
|------|------|------|------|
| 后端 | dialogManager.ts | 新增 `form` 类型 DialogAction | 追问时返回表单 schema 而非纯文本 |
| 后端 | agentController.ts | SSE 新增 `form` 事件类型 | 发送表单 schema 到前端 |
| 后端 | agentController.ts | 新增 `submitForm` 方法 | 处理表单提交 |
| 后端 | routes/agent.ts | 新增 POST `/agent/submit-form` | 表单提交路由 |
| 前端 | AgentFormRenderer.vue | **新建** | 根据 schema 动态渲染表单 |
| 前端 | AIDashboard.vue | 处理 `form` SSE 事件 | 渲染表单组件到消息流 |
| 前端 | api/agent.ts | 新增 `submitForm` API | 表单提交接口 |

## 3. 表单 Schema 设计

### 3.1 类型定义

```typescript
interface FormSchema {
  formId: string;
  title: string;
  description?: string;
  fields: FormField[];
  submitLabel?: string;
  cancelLabel?: string;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'textarea' | 'multiselect' | 'material-list';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>;
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  dependsOn?: string;
  errorMessage?: string;
}

interface FormSubmitResult {
  success: boolean;
  data?: any;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

### 3.2 字段类型说明

| type | 渲染组件 | 适用场景 | 示例 |
|------|----------|----------|------|
| `text` | `<t-input>` | 名称、编码等文本 | 配方名称 |
| `number` | `<t-input-number>` | 数值型数据 | 成品重量、单价 |
| `select` | `<t-select>` | 单选下拉 | 业务员、原料类型 |
| `multiselect` | `<t-select multiple>` | 多选下拉 | 原料列表 |
| `date` | `<t-date-picker>` | 日期选择 | 统计月份 |
| `textarea` | `<t-textarea>` | 长文本 | 描述、备注 |
| `material-list` | 自定义组件 | 原料+用量列表 | 配方原料 |

### 3.3 Schema 生成规则

表单 schema 由后端 `dialogManager` 根据工具的 `paramsSchema`（Zod 定义）自动生成：

1. **必填字段** → `required: true`
2. **Zod `.describe()`** → `label`
3. **Zod `.min(1)`** → `validation: { min: 1 }`
4. **Zod `z.enum()`** → `type: 'select'` + `options`
5. **Zod `z.number()`** → `type: 'number'`
6. **Zod `z.string()`** → `type: 'text'`
7. **特殊字段名约定**：
   - `*_name` 且工具涉及 salesman → `type: 'select'`，options 从数据库加载
   - `materials` → `type: 'material-list'`
   - `*description*` → `type: 'textarea'`

## 4. 前端渲染

### 4.1 表单在聊天流中的位置

表单作为 assistant 消息的一部分渲染，与普通文本消息并列：

```
┌─────────────────────────────────────────────────────┐
│  🤖 AI助手                                          │
│  好的，我来帮您创建配方，请填写以下信息：               │
│                                                     │
│  ┌─────────────────────────────────────────────┐    │
│  │  📋 创建新配方                                │    │
│  │─────────────────────────────────────────────│    │
│  │  配方名称 *                                   │    │
│  │  [ 请输入配方名称                        ]    │    │
│  │  业务员 *          [▼ 选择业务员      ]       │    │
│  │  成品重量(g) *     [ 0                   ]    │    │
│  │  原料列表          [+ 添加原料]               │    │
│  │  描述              [                      ]    │    │
│  │                                              │    │
│  │           [ 取消 ]  [ ✅ 创建配方 ]           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  🖼️ DeepSeek V3 · 1.2s · Token：523                │
└─────────────────────────────────────────────────────┘
```

### 4.2 表单状态流转

```
editable（可编辑）
    │
    ├── 用户点击"提交" → 校验失败 → 保持 editable + 显示错误
    │
    ├── 用户点击"提交" → 校验通过 → 提交到后端
    │       │
    │       ├── 后端返回成功 → submitted（只读收起）
    │       │
    │       └── 后端返回失败 → editable + 回填错误
    │
    └── 用户点击"取消" → cancelled（只读收起，灰色）
```

### 4.3 提交成功后的只读状态

```
┌─────────────────────────────────────────┐
│  📋 创建新配方                    ✅ 已提交 │
│  配方名称：正阳御湿膏                       │
│  业务员：张三 | 成品重量：500g              │
│  原料：黄芪200g、当归150g                   │
└─────────────────────────────────────────┘
```

## 5. 校验机制

### 5.1 三层校验体系

| 层级 | 位置 | 校验内容 | 错误处理 |
|------|------|----------|----------|
| **L1 前端即时校验** | AgentFormRenderer.vue | 必填、类型、范围、格式 | 字段下方红色提示，提交按钮禁用 |
| **L2 前端提交校验** | 提交前全量校验 | 跨字段校验（如成品重量>0） | 弹出校验摘要，定位到第一个错误字段 |
| **L3 后端业务校验** | 工具 handler | 原料存在性、含量比、业务员存在性 | 返回结构化错误，前端回填到表单 |

### 5.2 L1 即时校验示例

```
成品重量(g) *
[ -5                              ]
⚠️ 请输入大于0的数值

配方名称 *
[                                 ]
⚠️ 此项为必填

           [ 取消 ]  [ 创建配方（灰禁用）]
```

### 5.3 L3 后端业务校验错误回填

```
┌─────────────────────────────────────────┐
│  ⛔ 提交失败，请修正以下问题：              │
│  • 原料"灵芝"不存在于数据库中              │
│  • 含量比校验未通过：总和为0.85，低于0.92   │
│─────────────────────────────────────────│
│  原料列表                                │
│  ┌──────────────────────────────────┐   │
│  │ 灵芝  100g  ✕   ← 红色高亮       │   │
│  │ 黄芪  200g  ✕                    │   │
│  └──────────────────────────────────┘   │
│  ⚠️ 以下原料不存在：灵芝。可用原料：黄芪... │
│                                         │
│           [ 取消 ]  [ 重新提交 ]          │
└─────────────────────────────────────────┘
```

## 6. API 接口

### 6.1 SSE `form` 事件

后端通过 SSE 发送表单 schema：

```
event: form
data: {
  "formId": "create_formula_1683967200",
  "title": "创建新配方",
  "fields": [
    { "name": "name", "label": "配方名称", "type": "text", "required": true },
    { "name": "salesman_name", "label": "业务员", "type": "select", "required": true, "options": [...] },
    { "name": "finished_weight", "label": "成品重量(g)", "type": "number", "required": true, "validation": { "min": 1 } },
    { "name": "materials", "label": "原料列表", "type": "material-list" },
    { "name": "description", "label": "描述", "type": "textarea" }
  ],
  "submitLabel": "创建配方",
  "toolName": "create_formula"
}
```

### 6.2 POST `/agent/submit-form`

请求：

```json
{
  "sessionId": "sess_xxx",
  "formId": "create_formula_1683967200",
  "toolName": "create_formula",
  "params": {
    "name": "正阳御湿膏",
    "salesman_name": "张三",
    "finished_weight": 500,
    "materials": [
      { "name": "黄芪", "quantity": 200 },
      { "name": "当归", "quantity": 150 }
    ],
    "description": "祛湿配方"
  }
}
```

成功响应：

```json
{
  "success": true,
  "data": {
    "id": "f_xxx",
    "code": "F-20260513-001",
    "name": "正阳御湿膏"
  }
}
```

失败响应（校验错误）：

```json
{
  "success": false,
  "errors": [
    { "field": "materials", "message": "以下原料在数据库中不存在：灵芝。当前可用原料：黄芪、当归..." },
    { "field": "finished_weight", "message": "含量比校验未通过：总和为0.85，低于0.92" }
  ]
}
```

## 7. 特殊字段：material-list

配方原料列表是特殊的复合字段，需要自定义渲染组件：

### 7.1 渲染形式

```
原料列表
┌──────────────────────────────────────────┐
│  [+ 添加原料]                              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ 原料: [▼ 黄芪        ]  用量: [200]g │  │
│  │                                [✕] │  │
│  ├────────────────────────────────────┤  │
│  │ 原料: [▼ 当归        ]  用量: [150]g │  │
│  │                                [✕] │  │
│  └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 7.2 选项数据来源

后端在 form schema 的 `options` 中预加载原料列表：

```json
{
  "name": "materials",
  "type": "material-list",
  "options": [
    { "label": "黄芪", "value": "黄芪", "type": "herb" },
    { "label": "当归", "value": "当归", "type": "herb" },
    { "label": "白术", "value": "白术", "type": "herb" }
  ]
}
```

## 8. 测试方案

### 8.1 功能测试用例

| 编号 | 场景 | 操作 | 预期结果 |
|------|------|------|----------|
| T1 | 创建配方-表单渲染 | 输入"帮我创建配方" | 显示包含5个字段的表单 |
| T2 | 创建配方-必填校验 | 不填任何字段点提交 | 必填字段下方显示红色提示 |
| T3 | 创建配方-数值校验 | 成品重量输入-5 | 显示"请输入大于0的数值" |
| T4 | 创建配方-业务员下拉 | 点击业务员下拉 | 显示数据库中已有业务员列表 |
| T5 | 创建配方-原料多选 | 点击添加原料 | 显示原料下拉，选择后显示用量输入框 |
| T6 | 创建配方-提交成功 | 填写完整信息后提交 | 表单收起为只读 + 下方显示成功结果 |
| T7 | 创建配方-后端校验失败 | 选择不存在的原料后提交 | 表单保持可编辑 + 错误回填到原料字段 |
| T8 | 创建配方-取消 | 点击取消 | 表单收起为灰色"已取消"状态 |
| T9 | 创建原料-表单渲染 | 输入"添加原料" | 显示原料表单 |
| T10 | 普通对话 | 输入"你好" | 不显示表单，正常文本回复 |

### 8.2 边界测试

| 编号 | 场景 | 预期结果 |
|------|------|----------|
| B1 | 网络断开时提交表单 | 显示网络错误提示，表单保持可编辑 |
| B2 | 同时打开多个表单 | 每个表单独立，互不影响 |
| B3 | 表单提交后刷新页面 | 历史消息中表单显示为只读摘要 |
| B4 | 原料列表超过50项 | 下拉支持搜索过滤 |
| B5 | 长文本描述 | textarea 自适应高度 |

## 9. 实现优先级

| 阶段 | 内容 | 优先级 |
|------|------|--------|
| P0 | 后端 form schema 生成 + SSE 事件 + submit-form 接口 | 高 |
| P0 | 前端 AgentFormRenderer 基础字段（text/number/select/textarea） | 高 |
| P0 | 前端 L1/L2 校验 + 提交/取消交互 | 高 |
| P1 | material-list 复合字段组件 | 中 |
| P1 | 后端 L3 校验错误回填 | 中 |
| P2 | 表单只读收起/已取消状态 | 低 |
| P2 | 历史会话中表单恢复 | 低 |

## 10. 实现记录

### 10.1 已完成文件清单

| 文件 | 改动类型 | 说明 |
|------|----------|------|
| `backend/src/services/ai/agent/dialogManager.ts` | 重写 | 新增 `form` DialogActionType、FormField/FormSchema 接口、generateFormSchema() 方法 |
| `backend/src/services/ai/agent/agentController.ts` | 修改 | 新增 form SSE 事件处理、submitForm 方法、validateFormData 方法、inferTargetTable/findMissingParams/tryGenerateFormFromResponse 辅助方法、pendingForms 持久化 |
| `backend/src/services/ai/agent/promptEngine.ts` | 修改 | 修改系统提示词，引导LLM在参数不完整时也直接调用工具，由系统生成表单 |
| `backend/src/routes/agent.ts` | 修改 | 新增 POST `/agent/submit-form` 路由 |
| `backend/src/config/database-better-sqlite3.ts` | 修改 | 新增 `agent_pending_forms` 表 |
| `frontend/src/components/AgentFormRenderer.vue` | 新建 | 动态表单渲染组件，支持 text/number/select/multiselect/date/textarea/material-list 7种字段类型 |
| `frontend/src/views/ai/AIDashboard.vue` | 修改 | 新增 form SSE 事件处理、AgentFormRenderer 组件渲染、handleFormSubmit/handleFormCancel 方法 |
| `frontend/src/api/agent.ts` | 修改 | 新增 submitForm API 方法 |

### 10.2 实现要点

1. **表单触发机制（双重保障）**：
   - **路径A（LLM直接调用工具）**：当LLM调用 `requiresConfirmation` 工具时，先尝试生成 formSchema，成功则发送 `form` SSE 事件，否则回退到 `confirm` 事件
   - **路径B（LLM文本追问时后处理）**：当LLM返回文本追问（无工具调用）时，`tryGenerateFormFromResponse()` 通过关键词匹配检测用户意图，自动生成表单
   - **系统提示词引导**：修改了 promptEngine 中的系统提示词，引导LLM在参数不完整时也直接调用工具，减少路径B的触发频率

2. **表单 Schema 生成**：`DialogManager.generateFormSchema()` 解析工具的 Zod paramsSchema，结合预定义的字段类型映射（FIELD_TYPES）、标签映射（FIELD_LABELS）、校验规则（FIELD_VALIDATIONS），自动生成表单结构。select 类型字段从数据库加载选项。

3. **三层校验实现**：
   - L1（前端即时）：`AgentFormRenderer.validateField()` 在 blur/change 时触发
   - L2（前端提交）：`AgentFormRenderer.validateAll()` 在提交前全量校验
   - L3（后端业务）：`agentController.validateFormData()` + 工具 handler 内部校验

4. **表单持久化**：pendingForms 存储在 `agent_pending_forms` 数据库表中，支持页面刷新后恢复。

5. **material-list 特殊字段**：自定义渲染，每行包含原料下拉选择 + 用量输入 + 删除按钮，支持动态添加/移除行。

6. **表单状态**：通过 `msg.formSubmitted` 和 `msg.formSubmitSuccess` 控制表单显示/隐藏，提交后显示结果提示。
