---
trigger: always_on
---
# Vue 组件规范

## 1. 组件文件组织

```
frontend/src/
├── views/              — 页面级组件（按业务模块分目录）
│   ├── materials/      — MaterialList.vue, MaterialDetail.vue, MaterialForm.vue
│   ├── formulas/       — FormulaList.vue, FormulaDetail.vue, FormulaForm.vue
│   ├── ai/             — AiAssistant.vue, AIDashboard.vue
│   └── ...
├── components/         — 通用可复用组件
│   ├── EmptyState.vue
│   ├── Skeleton/
│   └── AiAssistantFloat/
└── ...
```

## 2. 组件命名

- 页面组件：PascalCase — `MaterialList.vue`、`FormulaDetail.vue`
- 通用组件：PascalCase — `EmptyState.vue`、`PageSkeleton.vue`
- 组件目录：PascalCase — `AiAssistantFloat/`
- 组件内 name 属性：与文件名一致

### 页面组件命名模式

| 类型 | 命名 | 示例 |
|------|------|------|
| 列表页 | `{Module}List.vue` | `MaterialList.vue` |
| 详情页 | `{Module}Detail.vue` | `FormulaDetail.vue` |
| 表单页 | `{Module}Form.vue` | `MaterialForm.vue` |
| 对比页 | `{Module}Compare.vue` | `FormulaCompare.vue` |

## 3. 组件结构顺序

```vue
<script setup lang="ts">
// 1. Vue API imports
import { ref, computed, onMounted } from 'vue'
// 2. 第三方库 imports
import { MessagePlugin } from 'tdesign-vue-next'
// 3. 项目内部 imports
import { useMaterialStore } from '@/stores/material'
import type { Material } from '@/api/material'

// 4. Props & Emits
const props = defineProps<{ ... }>()
const emit = defineEmits<{ ... }>()

// 5. Composables & Stores
const materialStore = useMaterialStore()
const router = useRouter()

// 6. Reactive state
const loading = ref(false)
const list = ref<Material[]>([])

// 7. Computed
const filteredList = computed(() => ...)

// 8. Methods
async function fetchData() { ... }

// 9. Lifecycle
onMounted(() => { fetchData() })
</script>

<template>
  ...
</template>

<style lang="scss" scoped>
...
</style>
```

## 4. UI 组件库

- 项目使用 **TDesign Vue Next**（`tdesign-vue-next`）
- **必须**优先使用 TDesign 组件，禁止自行实现已有组件
- 常用组件：`t-table`、`t-form`、`t-dialog`、`t-button`、`t-input`、`t-message`
- 图标使用 TDesign 内置图标：`<t-icon name="xxx" />`
- 消息提示使用 `MessagePlugin.success()` / `MessagePlugin.error()`

## 5. 状态管理（Pinia）

- Store 文件放在 `frontend/src/stores/` 下
- 使用 Composition API 风格（`defineStore('name', () => { ... })`）
- 每个业务模块一个 Store：`material.ts`、`formula.ts`、`auth.ts`
- Store 命名：`use{Module}Store` — `useMaterialStore`、`useAuthStore`
- 异步操作返回 `{ success, message? }` 格式

## 6. 路由配置

- 路由定义在 `frontend/src/router/index.ts`
- 使用懒加载：`component: () => import("@/views/...")`
- 路由 name 使用 PascalCase：`name: "MaterialList"`
- 需要 auth 的路由设置 `meta: { requiresAuth: true }`
- 隐藏顶栏的页面设置 `meta: { hideHeader: true }`

## 7. 样式规范

- 使用 SCSS 预处理器
- 全局变量在 `@/assets/styles/variables.scss` 中定义（已通过 vite 自动注入）
- 组件样式**必须**使用 `scoped`
- 颜色、间距等使用 CSS 变量或 TDesign token，禁止硬编码

## 8. 禁止行为

- 禁止在组件中直接调用 axios，应通过 `@/api/` 层
- 禁止在模板中使用复杂表达式，应提取为 computed
- 禁止在多个组件中复制粘贴相同逻辑，应提取为 composable
- 禁止使用 `v-html` 除非内容已经过 XSS 过滤
- 禁止直接操作 DOM，应使用 Vue 的响应式系统
