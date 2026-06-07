---
name: full-dev-workflow
description: 全流程启动（双技能）。启用 workflow-orchestrator 和 project-ui-dynamic-theme 双技能，按企业级标准执行：需求澄清→输出开发文档→确认→组件化编码→自测→修复→交付；所有样式使用 CSS 主题变量动态渲染，禁止写死色值。当用户要求全流程开发、完整开发流程时触发。
---

# 全流程启动（双技能）

启用 **workflow-orchestrator** 和 **project-ui-dynamic-theme** 双技能，按企业级标准执行完整开发流程。

## 执行流程

```
需求澄清 → 输出开发文档 → 确认 → 组件化编码 → 自测 → 修复 → 交付
```

## 核心约束

1. 所有样式**必须使用 CSS 主题变量**动态渲染，禁止写死色值
2. 严格按 workflow-orchestrator 编排的流程执行
3. 每完成一步标记完成，进入下一步
4. 编码完成后自动执行代码审查
