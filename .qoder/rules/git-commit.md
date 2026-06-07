---
trigger: always_on
---
# Git 提交规范

## 1. Commit Message 格式

```
<type>(<scope>): <subject>
```

### type 类型（必填）

| type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 修复 Bug |
| `docs` | 文档变更 |
| `style` | 代码格式调整（不影响逻辑） |
| `refactor` | 重构（不新增功能、不修复 Bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖变更 |
| `ci` | CI/CD 配置变更 |

### scope 范围（可选）

按模块划分：`auth`、`formula`、`material`、`salesman`、`nutrition`、`export`、`ai`、`agent`、`frontend`、`backend`、`db`、`deploy`

### subject 主题（必填）

- 中文或英文均可，与项目现有风格保持一致
- 不超过 50 个字符
- 不加句号

## 2. 示例

```
feat(formula): 添加配方对比功能
fix(auth): 修复 Token 过期后未正确跳转登录页
refactor(material): 优化原料列表查询性能
chore(deps): 升级 vitest 到 v4
ci: 添加 E2E 测试到 CI 流水线
```

## 3. 提交粒度

- 每次提交只做一件事，避免混合多种变更
- 新功能 + 对应测试可以放在同一提交
- 重构和功能变更分开提交

## 4. 禁止行为

- 禁止提交 `node_modules/`、`dist/`、`.env`、`*.db` 等文件
- 禁止使用无意义的提交信息（如 `update`、`fix bug`、`wip`）
- 禁止在提交中包含密钥、密码、Token 等敏感信息
- 禁止强制推送到 `main` 分支
