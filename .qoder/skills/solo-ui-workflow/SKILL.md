---
name: solo-ui-workflow
description: SOLO 全流程开发+动态主题 UI。启用 workflow-orchestrator 和 project-ui-dynamic-theme 双技能，严格按流程执行：需求澄清→输出文档→确认→编码→测试→交付；所有界面必须使用 CSS 主题变量动态配色，禁止写死色值，先出文档确认后编码。当用户要求 SOLO 开发、全流程 UI 开发时触发。
---

# SOLO 全流程开发 + 动态主题 UI

启用 **workflow-orchestrator** 和 **project-ui-dynamic-theme** 双技能，严格按流程执行完整开发。

## 执行流程

```
需求澄清 → 输出文档 → 确认 → 编码 → 测试 → 交付
```

## 核心约束

1. 所有界面**必须使用 CSS 主题变量**动态配色，禁止写死色值
2. **先出文档，确认后编码** — 不跳过文档阶段
3. 主题色变化时，按钮/选中/悬浮/边框/文字强调**自动同步变色**
4. 交互、圆角、阴影、间距、字体**固定不变**
5. 所有页面视觉与交互保持一致

## 引用的技能和规则

- `workflow-orchestrator` — 工作流编排
- `project-ui-dynamic-theme` — 动态主题 UI 规范
- `design-tokens` — 设计令牌
- `vue-component` — Vue 组件规范
