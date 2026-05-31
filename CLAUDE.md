# CLAUDE.md

此文件为 Claude Code（claude.ai/code）在此仓库中工作时提供指导。

## 项目概览

**TingStudio v2.9.0** — 食品配方工作数据管理平台（中草药功效配方行业）。前后端分离架构：Vue 3 + Express + SQLite。

## 工作流程：开工前先对齐（Grill-Me 模式）

对于**非琐碎的任务**（新增功能、架构设计、重构、数据模型变更），在开始写代码前必须执行以下流程：

1. **追问我计划** — 逐条遍历决策树，直到双方对齐
2. **一次问一个问题** — 不要一次性丢一堆问题给我
3. **自带推荐方案** — 每个问题附上你的推荐答案，让我确认或纠正
4. **先查代码再问人** — 如果问题能通过读代码/读数据库/读配置回答，直接查，不要问我

### 研发阶段工作流

```
你提需求
  → [Grill] 我追问澄清，你确认
  → 我按 CLAUDE.md 规范写代码
  → 我自动跑 /code-review 检查代码质量（无需你提醒）
  → 我提示你跑 /verify 或 /run 验证效果
  → 提交
```

**写完代码后自动执行：** 每次完成代码修改后，我**自动调用 `/code-review`** 检查当前改动，发现问题当场报告。不需要你记。

**复杂任务**先用 EnterPlanMode 出方案，你批准后再动手。**简单任务**（修样式、改文案、修类型错误）跳过追问和 review，直接做。

## 常用命令

### 开发

```bash
npm run dev                          # 同时启动前后端（concurrently）
cd backend && npm run dev            # tsx watch，端口 3000
cd frontend && npm run dev           # Vite，端口 5173
```

### 构建

```bash
npm run build                        # 后端 tsc + 前端 vite build
cd backend && npm run build          # 仅后端编译到 dist/
cd frontend && npm run build         # 仅前端构建
```

### 数据库

```bash
cd backend && npm run init-db        # 初始化表结构
cd backend && npm run seed           # 填充示例数据
cd backend && npx tsx src/scripts/migrations/createParseResultTables.ts  # 迁移脚本
```

### 测试

```bash
cd backend && npm run test           # Vitest
cd frontend && npm run test:run      # Vitest
cd frontend && npm run test:e2e      # Playwright
cd frontend && npm run test:coverage
```

### 开发注意事项

- 后端用 `tsx watch` 运行 TypeScript 源码，修改自动重启
- 生产部署用 `node dist/index.js`（需先 `npm run build`）
- 如果修改了后端代码但生产环境未生效，先检查 `dist/` 是否已重新编译

## 技术栈

| 层次 | 技术 |
|------|------|
| 前端框架 | Vue 3 + TypeScript + Vite 5, Composition API + `<script setup>` |
| UI 组件库 | TDesign Vue Next v1.9 |
| 状态管理 | Pinia（18 个 Store） |
| 路由 | Vue Router 4（懒加载） |
| 后端框架 | Express + TypeScript（ESM） |
| 数据库 | SQLite（better-sqlite3）WAL 模式，或 MySQL（mysql2） |
| 认证 | JWT Bearer Token（jsonwebtoken + bcryptjs），双角色 admin / formulist |
| AI 集成 | DeepSeek / 通义千问 / 智谱 GLM，SSE 流式 + 非流式 |
| 图表 | ECharts 6 |
| 测试 | Vitest + Playwright + vue-test-utils + supertest + MSW |

## 数据隔离

- **admin**：可查看所有配方/原料/业务员
- **formulist（普通用户）**：只能查看和操作自己创建的数据

## 架构要点

### 分层

```
后端：routes → controllers（轻量）→ services（业务逻辑）→ database
前端：View (Vue page) → Store (Pinia action) → API (axios) → 后端
```

### 后端中间件顺序

`helmet → cors → compression → morgan → express.json → requestLogger → optionalAuth`

- `optionalAuth`：全局，可选解析 Token；`authMiddleware`：路由级，强制要求
- 所有 Controller 使用 `try/catch` + `next(error)` 模式

### AI Agent 系统（核心特色）

位于 `backend/src/services/ai/agent/`，12 个子模块：

- `agentChatController.ts` — ReAct 流式聊天控制器（SSE）
- `agentController.ts` — 意图路由、对话管理
- `intentEngine.ts` — 意图识别（查询/创建/修改/删除）
- `toolRegistration.ts` — 工具注册（配方/原料 CRUD）
- `llmService.ts` — LLM 流式调用
- `promptEngine.ts` — 提示词引擎 v3.0.0
- `agentWriteGuard.ts` — 写操作权限守卫
- `sessionStore.ts` — SQLite 持久化会话
- 前端对应：`frontend/src/components/AiAssistantFloat/`（8 个组件）

### 解析结果缓存

智能填单（配方解析 + 原料营养解析）使用文件 MD5 哈希做缓存去重：

1. 上传文件 → 计算 `crypto.createHash("md5").update(fileContent).digest("hex")`
2. 查询 `parse_results WHERE user_id + file_hash + status='success' + call_type`
3. 命中则直接返回缓存结果，不调用 AI API
4. 未命中则调用 AI → 保存结果到 `parse_results` → 返回

后端修改后务必重新编译 `dist/`，否则可能运行过时代码。

## 关键约定

### 数据库查询

```typescript
// SELECT 返回数组，需解构
const [rows] = query("SELECT * FROM formulas WHERE id = ?", [id]);

// INSERT/UPDATE/DELETE
query("INSERT INTO formulas (...) VALUES (...)", [values]);
```

### ESM 模块

后端 `package.json` 设置 `"type": "module"`，所有内部 import **必须包含 `.js` 扩展名**：

- ✅ `import { query } from '../config/database.js'`
- ❌ `import { query } from '../config/database'`

### API 响应格式

```json
{ "success": true, "data": { ... } }
```

前端 Axios 拦截器自动解开 `data` 包装，API 调用直接返回数据体。401 自动清除 Token 并跳转登录页。

### 时间处理

- 后端存储/返回：ISO 8601 UTC（带 `Z`），如 `2026-05-03T14:21:47.611Z`
- 前端展示：本地时区可读格式，使用 `@/utils/timeFormat.ts` 中的 `formatTimestamp()`
- 禁止使用 `toISOString()` 展示时间（返回 UTC）
- 禁止直接渲染原始 UTC 字符串

### 数据展示规范

| 场景 | 规则 |
|------|------|
| 金额/价格 | 保留 2 位小数，null 显示"暂未录入" |
| 百分比 | 分子为 0 时显示 `0%`，非 0 时保留 1-2 位 |
| 空值/null | 价格用"暂未录入"，普通文本用 `--`，无操作用"暂无" |
| 数字缩略 | 使用 `formatCompact()`：`1234` → `1.2K`，`12340000` → `1234万` |
| 日期（无时间） | 使用 `formatDate()`：`2026-05-03T14:21:47.611Z` → `2026-05-03` |

## TypeScript 严格编码规范（Matt Pocock 风格）

目标是写出**真正的 TypeScript**，而非"披着 TS 外衣的 JS 代码"。类型系统是安全网，不是装饰。

### 核心原则

1. **`any` 全面禁用** — 任何地方出现 `any` 都需要被审查。用 `unknown` 替代，配合类型守卫窄化。
   - ❌ `const data: any = fetchResult()`
   - ✅ `const data: unknown = fetchResult()`
   - ✅ `if (typeof data === 'object' && data && 'id' in data) { /* data 在此作用域内被窄化 */ }`

2. **禁止 `as` 类型断言** — 类型断言绕过编译器检查。用类型守卫、`satisfies` 或重构类型替代。
   - ❌ `const user = data as User`
   - ✅ 自定义 type guard：`function isUser(val: unknown): val is User { ... }`
   - ✅ 保留更宽类型后用 `satisfies` 校验：`const user = data satisfies User`（仅校验形状，不窄化）

3. **`as const` 默认使用** — 字面量数组/对象默认用 `as const`，保留精确类型，消除类型宽度泄露。
   - ❌ `const ROLES = ['admin', 'formulist']` → 类型为 `string[]`
   - ✅ `const ROLES = ['admin', 'formulist'] as const` → 类型为 `readonly ['admin', 'formulist']`
   - ✅ 搭配 `(typeof ROLES)[number]` 提取联合类型：`type Role = 'admin' | 'formulist'`

4. **函数必须有完整的类型签名** — 参数和返回值**都必须**显式标注类型（返回值类型可让编译器检查实现是否有误）。
   - ❌ `function processData(data: any) { return data.value }`
   - ❌ `async function fetchUser(id: string) { return await db.find(id) }`（返回值类型被推断）
   - ✅ `async function fetchUser(id: string): Promise<User | null> { ... }`
   - ✅ 内部辅助函数或回调可依赖上下文推断，但导出函数/公开 API 必须显式标注返回值

5. **泛型必须带约束** — 泛型参数不要裸写，用 `extends` 约束。
   - ❌ `function first<T>(arr: T[]): T`
   - ✅ `function first<T extends { id: unknown }>(arr: T[]): T`
   - ✅ 知道 T 是对象类型时：`<T extends Record<string, unknown>>`

### 类型设计

6. **用 discriminated union 替代可选项做状态区分** — 不要用一个对象里一堆可选字段表示不同状态。
   - ❌ `{ type?: 'create' | 'edit', id?: number, data?: FormData }`（同时为 undefined 时含义模糊）
   - ✅ `{ kind: 'create'; defaultValues?: Partial<FormData> } | { kind: 'edit'; id: number; data: FormData }`
   - 使用时通过 `switch (x.kind)` 穷尽检查，每个分支只访问该分支存在的字段

7. **`satisfies` 优先于类型注解** — 需要校验形状但不希望类型被收窄为接口时使用。
   - ❌ `const config: Config = { api: 'https://...', retry: 3 }` → `config.retry` 类型为 `number`
   - ✅ `const config = { api: 'https://...', retry: 3 } satisfies Config` → `config.retry` 类型为 `3`（字面量）
   - 场景：校验配置对象、常量字典、枚举映射时，`satisfies` 保留最精确的类型信息

8. **`interface` vs `type` 选择**：
   - 对外 API、对象形状、类实现契约 → `interface`（可扩展、报错信息更清晰）
   - 联合类型、交叉类型、工具类型、映射类型 → `type`
   - 保持一致性：同一个项目中新增类型先看上下文风格

9. **品牌类型（Branded Types）用于运行时不可区分的值** — 防止传错参数顺序。
   - ❌ `function createFormula(name: string, userId: number, formulaId: number)`（容易把 userId 和 formulaId 传反）
   - ✅ `type FormulaId = number & { __brand: 'FormulaId' }; type UserId = number & { __brand: 'UserId' }`
   - ✅ 配合构造函数：`function asFormulaId(n: number): FormulaId { return n as FormulaId }`
   - 适用于 ID 字段、货币金额、物理单位等语义不同但底层类型相同的场景

### 控制流与窄化

10. **穷尽性检查（Exhaustive Check）** — switch 或 if-else 分支必须覆盖所有可能性，新增枚举值时报错。
    - ✅ 每个 `switch` 加 `default`: `const _exhaustive: never = x; return _exhaustive;`
    - ✅ 或者在每个 if-else 链末尾用 `throw new Error('Unreachable: ' + x satisfies never)`

11. **类型守卫优先于属性检测** — 不要在逻辑中频繁使用 `as` 或 `in` 操作符做类型窄化。
    - ❌ `if ('role' in obj) /* ... */`
    - ✅ `function hasRole(obj: unknown): obj is { role: string } { return typeof obj === 'object' && obj !== null && 'role' in obj; }`

12. **联合类型用 switch 穷尽窄化，不要用 if-else 链** — switch 让编译器检查每个分支，且能被 exhaustive check 兜底。
    - ✅ `switch (status) { case 'loading': ...; case 'success': ...; case 'error': ...; default: const _: never = status; }`

### 工程实践

13. **禁止 `@ts-ignore` 和 `@ts-expect-error`** — 出现就是技术债务。必须附带 Issue/注释说明原因并计划修复。
    - 如遇第三方库类型问题，用 `declare module` 补充类型声明，而不是沉默错误

14. **泛型工具类型优先于手写循环** — 使用内置工具类型（`Pick`、`Omit`、`Partial`、`Required`、`Extract`、`Exclude`、`ReturnType`、`Parameters`）表达类型变换，避免手写复杂映射。

15. **Promise 类型必须处理** — `Promise<Result>` 而非 `Promise<any>`。异步函数的错误分支必须有类型体现。
    - ✅ `async function get(): Promise<Result | ErrorResult>`
    - ❌ `async function get(): Promise<any>`

16. **JSON 序列化安全的类型** — 接口定义中区分"数据库原始类型"和"序列化后类型"（如 `Date` → `string`）。
    - 数据库层：`created_at: Date`
    - API 响应：`created_at: string`（ISO 8601）
    - 用工具类型转换：`type Serialized<T> = T extends Date ? string : T extends Array<infer U> ? Array<Serialized<U>> : T`

17. **避免过度抽象** — 三层以上的泛型嵌套、复杂的条件类型、工具类型链，优先用 `// 解释为什么这样做` 注释说明目的。如果一段 TS 类型花了 10 行还没说清楚意思，拆成命名别名。

### 检查清单（代码审查时逐条过）

- [ ] 没有 `any` 出现
- [ ] 没有 `as` 类型断言
- [ ] 导出函数有显式返回类型
- [ ] switch 语句有 exhaustive check
- [ ] discriminated union 替代了可选项模式
- [ ] `const` 声明用了 `as const`
- [ ] 泛型有 `extends` 约束
- [ ] 没有 `@ts-ignore` / `@ts-expect-error`

### Vue 3 编码规范（基于 Anthony Fu）

#### 核心原则

- **始终使用 Composition API + `<script setup lang="ts">`**，禁止 Options API
- **优先 TypeScript** 而非 JavaScript
- **性能优先**：不需要深层响应式时用 `shallowRef` 替代 `ref`
- **禁止使用 Reactive Props 解构**（会丢失响应性）

#### 组件标准模板（简写）

```vue
<script setup lang="ts">
const props = defineProps<{ title: string; count?: number }>()
const emit = defineEmits<{ update: [value: string] }>()
const model = defineModel<string>()
const doubled = computed(() => (props.count ?? 0) * 2)
watch(() => props.title, v => console.log('Title changed:', v))
onMounted(() => console.log('Component mounted'))
</script>
<template><div>{{ title }} - {{ doubled }}</div></template>
```

#### 常用导入

```ts
import { ref, shallowRef, computed, reactive, readonly, toRef, toRefs, toValue } from 'vue'
import { watch, watchEffect, watchPostEffect, onWatcherCleanup } from 'vue'
import { onMounted, onUpdated, onUnmounted, onBeforeMount, onBeforeUpdate, onBeforeUnmount } from 'vue'
import { nextTick, defineComponent, defineAsyncComponent } from 'vue'
// Built-in: Transition, Teleport, Suspense, KeepAlive, v-memo, custom directives
```

### Pinia Store 规范（基于 Anthony Fu）

#### 核心原则

- **优先 Setup Store 模式**（Composition API 风格）处理复杂逻辑、组合式函数和 watcher
- 简单状态用 Options Store 模式即可

#### Setup Store 模板

```ts
import { defineStore } from 'pinia'
export const useXxxStore = defineStore('xxx', () => {
  const count = ref(0)
  const doubled = computed(() => count.value * 2)
  function increment() { count.value++ }
  return { count, doubled, increment }
})
```

#### 关键规则

| 场景 | 规则 |
|------|------|
| 解构 state/getter | **必须用 `storeToRefs()`** 保持响应性 |
| 解构 actions | 可以直接解构（已绑定到 store） |
| 在组件外使用 | 在函数内部调用 `useStore()`，禁止模块顶层调用（尤其 SSR） |
| 组件测试 | 使用 `@pinia/testing` 模拟 store |
| HMR | 每个 store 添加 HMR 支持以提升开发体验 |

```ts
// 组件中正确用法
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'

const store = useUserStore()
const { name, role } = storeToRefs(store)  // ✅ 保持响应性
const { login, logout } = store            // ✅ actions 可直接解构
```

### Vitest 测试规范（基于 Anthony Fu）

#### 核心原则

- 使用 Jest 兼容 API，与 Vite 共享配置/插件管道
- 优先多线程并行执行测试
- 利用智能 watch 模式（仅重跑受影响的测试）

#### 测试组织模板

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'

describe('ComponentName', () => {
  beforeEach(() => { /* 公共 setup */ })
  it('should render correctly', () => {
    const wrapper = mount(Component, { props: { title: 'Test' } })
    expect(wrapper.text()).toContain('Test')
  })
  it('should handle edge case', () => { /* 边界用例 */ })
})
```

#### 关键规则

| 场景 | 推荐做法 |
|------|----------|
| Mock 函数 | `vi.fn()` / `vi.spyOn()` |
| Mock 模块 | `vi.mock('module-path')` |
| Mock 定时器 | `vi.useFakeTimers()` / `vi.useRealTimers()` |
| 快照测试 | `toMatchSnapshot()` / 行内快照 |
| 类型测试 | `expectTypeOf()` / `assertType()` |
| 测试环境 | 默认 `node`，DOM 操作用 `jsdom` 或 `happy-dom` |
| 代码覆盖率 | V8（默认）或 Istanbul 提供器 |

#### 高级用法

- **Concurrent**：`it.concurrent('test', ...)` 并发执行
- **Test Context**：`test.extend()` 自定义 fixtures
- **Sharding**：`--shard=1/4` 分片加速 CI
- **Filtering**：`--tags` / `--changed` 按标签或变更文件筛选

### 系统化调试规范（基于 systematic-debugging）

遇到 Bug 时按以下流程操作，不要盲目改代码：

1. **复现** — 确认 Bug 能稳定复现，记录复现步骤和输入数据
2. **缩小范围** — 用二分法定位：注释一半代码 / 回滚一半提交 / 二分 API 调用链
3. **提出假设** — 基于现象提出可能的根因（不要只有一个假设）
4. **验证假设** — 加日志/断点验证，确认真正的根因
5. **修复** — 只改根因，不连带改无关代码
6. **回归验证** — 确认 Bug 不再复现，且不影响已有功能
7. **加测试** — 补一个针对此场景的测试用例，防止回归

### 改后验证规范（基于 verification-before-completion）

每个功能修改完成后必须按以下清单验证：

- [ ] 改前的问题/需求是否已解决
- [ ] 跑一遍相关测试（`npm run test` 对应模块）
- [ ] 边界情况是否处理了（空数据、极限值、网络错误）
- [ ] 是否引入了 TypeScript 类型错误（`npm run build` 检查）
- [ ] UI 修改：极端屏幕尺寸下是否正常（如果有）
- [ ] 数据修改：回查数据库确认数据正确性（如果有）

### 二次确认交互

所有删除/批量/危险操作使用 `t-popconfirm` 气泡确认框，禁止使用 `t-dialog` 弹窗。

### TDesign 组件避坑

- 禁止使用 `fixed` 列（与全局 `position: sticky` 顶栏冲突），用 `table-layout="auto"`
- 卡片内的 `t-select` / `t-date-picker` 必须加 `:popup-props="{ appendToBody: true }"`，防止被 `overflow: hidden` 裁剪

## 环境变量

### 后端必填

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 3000 |
| `JWT_SECRET` | JWT 签名密钥 |
| `CORS_ORIGIN` | 允许的跨域源，开发环境 `http://localhost:5173` |

### 后端可选

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_TYPE` | 数据库类型 | `sqlite`（可选 `mysql`） |
| `AI_DASHSCOPE_API_KEY` | 阿里云 DashScope | 空 |
| `AI_ZHIPU_API_KEY` | 智谱 GLM | 空 |
| `AI_DEEPSEEK_API_KEY` | DeepSeek | 空 |

### 前端

| 变量 | 说明 |
|------|------|
| `VITE_AMAP_KEY` | 高德地图 Web 服务 API Key（天气功能，可选） |

### AI Provider Base URL

| Provider | Base URL |
|----------|----------|
| DashScope | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| Zhipu | `https://open.bigmodel.cn/api/paas/v4` |
| DeepSeek | `https://api.deepseek.com/v1` |
