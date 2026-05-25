# 代码风格规范

## 1. TypeScript 配置

- 后端 `tsconfig.json` 已启用 `strict: true`，新增代码应尽量避免类型错误
- 前端 `vue-tsc --noEmit` 为构建前置检查（CI 执行），开发阶段不强求
- **禁止使用 `any` 类型**：所有代码中**不允许出现 `any`**，必须使用具体类型。常用替代方案：

```typescript
// ❌ 错误
function handle(data: any) { ... }
const config: any = {}

// ✅ 正确
function handle(data: Record<string, unknown>) { ... }
function handle(data: unknown) { ... }
const config: Record<string, unknown> = {}
```

| 场景 | 替代 `any` 的方案 |
|------|------------------|
| 任意对象 | `Record<string, unknown>` |
| 未知类型 | `unknown`（需要类型守卫后才能使用） |
| 确定的接口 | 定义具体的 `interface` 或 `type` |
| 第三方库缺失类型 | 在 `types/` 下补充 `.d.ts` 声明文件 |
- 目标编译版本：ES2022

## 2. 命名约定

### 变量与函数
- 变量/函数：camelCase — `getUserInfo`、`formulaList`
- 常量：UPPER_SNAKE_CASE — `JWT_SECRET`、`DEFAULT_PAGE_SIZE`
- 布尔变量：is/has/can 前缀 — `isLoading`、`hasPermission`

### 类与接口
- 类/接口：PascalCase — `AIService`、`UserInfo`
- 类型文件统一放在 `types/` 目录下

### 文件命名
- 后端源文件：camelCase — `formulaController.ts`、`nutritionEngine.ts`
- 前端 Vue 组件：PascalCase — `MaterialList.vue`、`FormulaForm.vue`
- 前端工具/API/Store：camelCase — `timeFormat.ts`、`auth.ts`
- 测试文件：与源文件同名 + `.test.ts` / `.spec.ts`

## 3. Import 顺序

按以下分组排列，组间空一行：

```
1. Node 内置模块（path, crypto, fs...）
2. 第三方库（express, axios, jwt...）
3. 项目内部模块（使用 @/ 或相对路径）
```

示例：
```typescript
import crypto from "crypto";
import express from "express";
import jwt from "jsonwebtoken";

import { query } from "../config/database.js";
import { generateId, success } from "../utils/helpers.js";
```

## 4. 路径别名

- 后端：`@/*` → `./src/*`（tsconfig paths 已配置）
- 前端：`@/*` → `./src/*`（vite resolve.alias 已配置）
- 优先使用别名路径，避免深层 `../../../` 相对路径

## 5. 代码格式

- 缩进：2 空格
- 字符串：优先双引号 `"`（与项目现有代码一致）
- 末尾分号：不强制，与周围代码保持一致
- 行宽：建议 120 字符以内
- 尾随逗号：多行结构使用尾随逗号

## 6. 禁止行为

- 禁止使用 `// @ts-ignore`，应通过正确类型定义解决问题（可用 `@ts-expect-error` 并注释原因）
- 禁止在业务逻辑中使用 `console.log`，使用项目已有的 `logger` 工具
- **禁止声明但未使用**：禁止存在已声明但未使用的变量、函数、import、类型定义。写入代码前确认该声明确实会被使用，避免产生冗余代码
- 禁止硬编码魔法数字，应提取为命名常量
- 禁止使用 `any` 类型，必须定义具体类型
