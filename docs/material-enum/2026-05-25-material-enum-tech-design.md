# 原料枚举字段管理 — 技术方案文档

> 日期：2026-05-25 | 版本：v1.0 | 状态：待确认

---

## 1. 架构概览

### 1.1 模块依赖关系

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端 (Vue 3)                              │
│                                                                   │
│  EnumManage.vue ──→ useEnumStore ──→ enum API ──→ http.ts       │
│  MaterialForm.vue ─┘                                    │        │
│  MaterialList.vue  ─┘                                   │        │
│  MaterialDetail.vue ┘                                   │        │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP /api
┌─────────────────────────────────────────────────────────────────┐
│                        后端 (Express)                             │
│                                                                   │
│  enumRoutes ──→ enumController ──→ enumService ──→ query()      │
│  materialRoutes → materialController → materialService ┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     数据库 (SQLite/MySQL)                         │
│                                                                   │
│  enum_options 表  |  materials 表 (+ 3 JSON 字段)               │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 新增文件清单

| 层级 | 文件路径 | 说明 |
|------|---------|------|
| 后端路由 | `backend/src/routes/enums.ts` | 枚举管理路由 |
| 后端控制器 | `backend/src/controllers/enumController.ts` | 枚举管理控制器 |
| 后端服务 | `backend/src/services/enumService.ts` | 枚举管理业务逻辑 |
| 后端迁移 | `backend/src/scripts/migrations/addEnumFieldsToMaterials.ts` | 原料表新增字段 |
| 后端种子 | `backend/src/scripts/seedEnumOptions.ts` | 枚举初始数据 |
| 前端API | `frontend/src/api/enum.ts` | 枚举 API 封装 |
| 前端Store | `frontend/src/stores/enum.ts` | 枚举 Store |
| 前端页面 | `frontend/src/views/settings/EnumManage.vue` | 枚举管理页面 |

### 1.3 修改文件清单

| 层级 | 文件路径 | 修改内容 |
|------|---------|---------|
| 后端路由 | `backend/src/routes/index.ts` | 注册 enumRoutes |
| 后端服务 | `backend/src/services/materialService.ts` | MaterialRow 新增3字段，查询/更新逻辑 |
| 后端控制器 | `backend/src/controllers/materialController.ts` | create/update 支持3字段 |
| 后端路由 | `backend/src/routes/materials.ts` | validateBody 新增3字段 |
| 前端API | `frontend/src/api/material.ts` | Material/MaterialForm 类型新增3字段 |
| 前端Store | `frontend/src/stores/material.ts` | 无需修改（透传） |
| 前端页面 | `frontend/src/views/materials/MaterialForm.vue` | 表单新增3个多选 |
| 前端页面 | `frontend/src/views/materials/MaterialList.vue` | 列表新增3列 |
| 前端页面 | `frontend/src/views/materials/MaterialDetail.vue` | 详情新增3字段展示 |
| 前端路由 | `frontend/src/router/index.ts` | 新增 /settings/enums 路由 |

---

## 2. 数据库设计

### 2.1 新建表：`enum_options`

```sql
CREATE TABLE IF NOT EXISTS `enum_options` (
  `id` TEXT PRIMARY KEY,
  `category` TEXT NOT NULL,          -- 分类：appearance / taste / efficacy
  `label` TEXT NOT NULL,             -- 显示文本（如"颗粒"）
  `value` TEXT NOT NULL,             -- 存储值（如"颗粒"）
  `sort_order` INTEGER NOT NULL DEFAULT 0,  -- 排序序号
  `is_active` INTEGER NOT NULL DEFAULT 1,   -- 是否启用（1=启用，0=停用）
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(`category`, `value`)
);
```

**设计说明**：
- `category` + `value` 唯一约束，防止同分类下重复值
- `sort_order` 支持未来排序需求
- `is_active` 支持软停用，已引用的原料不受影响
- `label` 和 `value` 分离，支持未来多语言或值映射

### 2.2 修改表：`materials` 新增3字段

```sql
ALTER TABLE `materials` ADD COLUMN `appearance_json` TEXT DEFAULT NULL;
ALTER TABLE `materials` ADD COLUMN `taste_json` TEXT DEFAULT NULL;
ALTER TABLE `materials` ADD COLUMN `efficacy_json` TEXT DEFAULT NULL;
```

**存储格式**：JSON 数组字符串，如 `'["颗粒","粉末"]'`、`'["苦味","草本香"]'`

---

## 3. 后端设计

### 3.1 枚举管理模块

#### 路由层 (`routes/enums.ts`)

| 方法 | 路径 | 中间件 | 说明 |
|------|------|--------|------|
| GET | `/` | authMiddleware | 获取所有枚举（按分类分组） |
| GET | `/:category` | authMiddleware | 获取指定分类的枚举列表 |
| POST | `/` | authMiddleware + requirePermission("admin") | 新增枚举值 |
| PUT | `/:id` | authMiddleware + requirePermission("admin") | 编辑枚举值 |
| DELETE | `/:id` | authMiddleware + requirePermission("admin") | 删除枚举值 |

#### 服务层 (`services/enumService.ts`)

核心方法：
- `getAllEnums()` → 按 category 分组返回 `{ appearance: [...], taste: [...], efficacy: [...] }`
- `getEnumsByCategory(category)` → 返回指定分类列表
- `createEnumOption(data)` → 新增，校验 category 合法性 + value 唯一性
- `updateEnumOption(id, data)` → 更新，校验 value 唯一性
- `deleteEnumOption(id)` → 删除，检查引用数量并返回
- `getReferenceCount(category, value)` → 统计使用该枚举值的原料数量

### 3.2 原料模块扩展

#### MaterialRow 接口扩展

```typescript
interface MaterialRow {
  // ... 现有字段
  appearance_json: string | null;
  taste_json: string | null;
  efficacy_json: string | null;
}
```

#### 查询层扩展

- `getMaterialList()` — SELECT 新增3字段，rowToCamelCase 自动转换
- `getMaterialDetail()` — 同上
- `createMaterial()` — INSERT 新增3字段
- `updateMaterial()` — UPDATE 新增3字段
- `createNewVersion()` — 复制时同步复制3字段

---

## 4. 前端设计

### 4.1 枚举管理页面 (`EnumManage.vue`)

**布局**：TDesign `t-tabs` 三 Tab（性状/口感/功效），每个 Tab 内：

```
┌──────────────────────────────────────────────┐
│  [搜索框]                    [+ 添加枚举值]  │
├──────────────────────────────────────────────┤
│  序号  |  枚举值  |  状态  |  操作          │
│  1     |  颗粒    |  启用  |  编辑 | 删除   │
│  2     |  膏状    |  启用  |  编辑 | 删除   │
│  ...                                         │
└──────────────────────────────────────────────┘
```

**交互**：
- 新增/编辑：`t-dialog` 弹窗，包含 label 输入框
- 删除：`t-popconfirm` 二次确认，若已使用显示引用数量
- 状态切换：`t-switch` 切换 is_active

### 4.2 原料表单集成 (`MaterialForm.vue`)

在现有表单"原料类型"字段下方新增3个 `t-select` 多选组件：

```vue
<t-form-item label="性状">
  <t-select v-model="formData.appearance" multiple :options="appearanceOptions" />
</t-form-item>
<t-form-item label="口感">
  <t-select v-model="formData.taste" multiple :options="tasteOptions" />
</t-form-item>
<t-form-item label="功效">
  <t-select v-model="formData.efficacy" multiple :options="efficacyOptions" />
</t-form-item>
```

选项数据从 `useEnumStore` 获取，页面加载时 `fetchEnums()` 拉取。

### 4.3 原料列表展示 (`MaterialList.vue`)

表格新增3列，使用 `t-tag` 渲染：

```vue
<template #appearance="{ row }">
  <template v-if="row.appearance?.length">
    <t-tag v-for="item in row.appearance.slice(0, 3)" :key="item" size="small">{{ item }}</t-tag>
    <t-tag v-if="row.appearance.length > 3" size="small" theme="primary">
      +{{ row.appearance.length - 3 }}
    </t-tag>
  </template>
  <span v-else>--</span>
</template>
```

### 4.4 原料详情展示 (`MaterialDetail.vue`)

在原料概况卡片中新增3行：

```
性状：[颗粒] [粉末]
口感：[苦味] [草本香] [涩感]
功效：[滋补肝肾] [养血安神]
```

---

## 5. 数据流

### 5.1 枚举管理流程

```
管理员操作 → EnumManage.vue → useEnumStore → enum API
    → POST/PUT/DELETE /api/enums → enumController → enumService → query()
    → enum_options 表
```

### 5.2 原料编辑流程

```
MaterialForm.vue 加载 → useEnumStore.fetchEnums()
    → GET /api/enums → enumController → enumService → query()
    → 返回选项数据 → 填充 t-select options

用户选择 → formData.appearance = ["颗粒", "粉末"]
    → 提交 → material API → materialController → materialService
    → JSON.stringify(["颗粒", "粉末"]) → 存入 appearance_json 字段
```

### 5.3 原料展示流程

```
MaterialList.vue / MaterialDetail.vue
    → 获取原料数据 → appearance_json: '["颗粒","粉末"]'
    → safeJsonParse() → ["颗粒", "粉末"]
    → t-tag 渲染
```

---

## 6. 缓存策略

枚举数据变更频率低、读取频率高，前端 Store 层实现内存缓存：

- `useEnumStore` 首次访问时拉取，后续直接返回缓存
- 枚举值变更（增删改）后自动刷新缓存
- 原料表单打开时若缓存为空则拉取

---

## 7. 错误处理

| 场景 | 处理方式 |
|------|---------|
| 新增重复枚举值 | 后端返回 409 DUPLICATE_ENTRY，前端提示"该选项已存在" |
| 删除已使用的枚举值 | 后端返回引用数量，前端二次确认 |
| 枚举接口异常 | 原料表单中枚举选项为空，不影响其他字段提交 |
| JSON 解析失败 | safeJsonParse 兜底返回空数组 |
