---
trigger: always_on
---
# 代码质量验证规范

## 1. 核心规则

- 代码质量验证（lint / typecheck / 类型检查）**不作为任务完成的强制要求**，以任务完成速度优先
- 仅在以下场景**按需**运行：
  - 用户明确要求时
  - 提交/合入 PR 前（由 CI 自动完成）
  - 构建/部署前发现有明显错误时

## 2. 参考命令

```bash
cd frontend
npm run lint           # 可选：ESLint 检查
npm run lint:fix       # 可选：自动修复
npm run typecheck      # 可选：vue-tsc 类型检查
```

## 3. 任务完成标准

- 代码逻辑正确、无明显语法错误即可标记完成
- **不需要**额外运行 lint 或 typecheck 来验证
- CI/CD 会在部署流水线中自动执行 lint / typecheck / test