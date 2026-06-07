---
trigger: always_on
---
# 设计令牌规范（DESIGN.md）

本规则引用项目根目录的 `DESIGN.md` 作为视觉设计令牌的**唯一权威来源**。

## 核心规则

- 所有颜色、字体、间距、圆角、阴影、动效、组件样式**必须**以 `DESIGN.md` 中的令牌为准
- 新增样式时**必须**引用设计令牌，禁止硬编码任意值
- 颜色：使用 `var(--color-primary)` 或 SCSS `$brand-primary`
- 间距：使用 `var(--space-4)` 或 SCSS `$space-4`
- 圆角：使用 `var(--radius-md)` 或 SCSS `$radius-md`

## 校验命令

```bash
npx @google/design.md lint DESIGN.md
```