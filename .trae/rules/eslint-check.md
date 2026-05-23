# ESLint 检查规范

## 1. 核心规则

- 修改前端 `.vue`、`.ts`、`.tsx` 文件后，**必须**运行 `npm run lint`（在 `frontend/` 目录下）检查是否有 lint 错误
- 如果 lint 报错，**必须**修复所有 error 和 warn 后才算任务完成
- 类型检查命令：`npm run typecheck`（在 `frontend/` 目录下），用于检测模块找不到、类型错误等问题

## 2. 检查时机

以下场景**必须**运行 lint：

- 新增或修改 Vue 组件（`.vue`）
- 新增或修改 TypeScript 文件（`.ts`、`.tsx`）
- 修改 import 语句
- 重构或重命名变量/函数/组件

## 3. 常见 lint 错误及修复

| 错误规则 | 说明 | 修复方式 |
|---------|------|---------|
| `no-unused-vars` / `@typescript-eslint/no-unused-vars` | 未使用的变量 | 删除或加 `_` 前缀 |
| `vue/no-unused-components` | 未使用的组件 | 删除 import 和模板引用 |
| `vue/no-unused-vars` | 模板中未使用的变量 | 删除或加 `_` 前缀 |
| `@typescript-eslint/no-explicit-any` | 使用了 `any` 类型 | 替换为具体类型 |
| `no-console` | 使用了 `console.log` | 移除或替换为 logger |
| `vue/no-v-html` | 使用了 `v-html` | 确保内容已 XSS 过滤 |
| `import/no-unresolved` | 模块找不到 | 检查路径和 tsconfig paths 配置 |

## 4. 命令参考

```bash
cd frontend

# 运行 lint 检查
npm run lint

# 自动修复可修复的问题
npm run lint:fix

# 类型检查（检测模块找不到、类型错误）
npm run typecheck
```

## 5. 禁止行为

- **禁止**忽略 lint 错误继续提交
- **禁止**使用 `// eslint-disable-next-line` 绕过规则，除非有明确注释说明原因
- **禁止**在 lint 报错后标记任务为完成
