# PRD：FormulaForm 页面布局优化与提交校验增强

> 日期：2026-05-21 | 模块：formulas | 优先级：High

---

## 1. Executive Summary

**问题**：FormulaForm.vue 页面中，原料配比表、配方报价、含量比校验三个强关联模块分散在不同区域，用户需上下滚动才能完成"填原料→看报价→校验→提交"的完整工作流。同时缺少提交前校验汇总机制，用户点击提交后才发现问题。

**方案**：将报价和校验整合为紧跟原料表的"配方摘要栏"，新增 `submitBlockReasons` 提交校验机制，消除信息重复，形成连贯的垂直工作流。

**成功指标**：
- 用户完成配方填写所需滚动次数从 3+ 降至 1-2
- 提交失败率降低 50%（通过前置校验提前发现问题）
- 含量比校验信息从 2 处展示精简为 1 处

---

## 2. User Experience & Functionality

### 2.1 User Personas

| 角色 | 使用场景 | 痛点 |
|------|---------|------|
| **formulist** | 日常创建/编辑配方 | 填完原料后需滚动到底部看报价，再滚回来修改，反复操作 |
| **admin** | 审核和管理配方 | 提交时才发现含量比异常，需要返回修改后重新填写 |

### 2.2 User Stories

**US-1：连贯的配方数据工作流**
> 作为配方师，我希望在原料表下方直接看到报价和校验结果，这样我不需要上下滚动就能完成"填原料→看报价→校验→提交"的完整流程。

**验收标准**：
- [x] 原料表、报价、校验在同一视觉区域内
- [x] 修改原料后报价实时更新，无需滚动
- [x] 含量比校验结果紧跟原料表展示

**US-2：提交前校验汇总**
> 作为配方师，我希望在提交前就能看到所有阻塞项和警告项，这样我可以一次性修正所有问题，而不是提交后逐个修复。

**验收标准**：
- [x] 提交按钮上方展示所有 error/warning 项
- [x] 有 error 项时提交按钮 disabled
- [x] 有 warning 项时提交按钮可用但显示提醒
- [x] 阻塞项包含：配方名称、业务员、成品重量、原料完整性、含量比校验、单价缺失、升版原因

**US-3：系数输入与计算结果就近展示**
> 作为配方师，我希望主料系数、辅料系数、成品重量的输入区域靠近合计行和含量比校验结果，这样我能直观看到系数调整对计算结果的影响。

**验收标准**：
- [x] coefficient-bar 移到 unit-row 上方
- [x] 修改系数后含量比和报价立即更新

### 2.3 Non-Goals

- 不改变后端 API
- 不改变 MaterialTableCore 的核心逻辑（仅移动模板位置）
- 不新增页面或路由
- 不改变配方的数据结构

---

## 3. Technical Specifications

### 3.1 变更文件清单

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `frontend/src/components/formula/MaterialTableCore.vue` | 模板调整 | coefficient-bar 位置移动 |
| `frontend/src/views/formulas/FormulaForm.vue` | 布局重构 + 交互增强 | 拆除 zone-bottom-info、新增摘要栏、新增 submitBlockReasons |

### 3.2 布局变更

**Before**（当前）：
```
区域一：基础信息
区域二：原料配比表
区域四：底部信息区（报价 | 含量比校验）  ← 分离
```

**After**（目标）：
```
区域一：基础信息
区域二：配方数据工作区
  ├── 原料配比表（MaterialTableCore）
  │     ├── card-header
  │     ├── 原料行...
  │     ├── coefficient-bar    ← 从顶部移入
  │     ├── unit-row
  │     ├── total-row
  │     └── ratio-validation-bar
  └── 配方摘要栏（新增）
        ├── 含量比校验（紧凑版）
        ├── 配方报价
        └── 提交校验 + 按钮
```

### 3.3 submitBlockReasons 校验规则

| 校验项 | 类型 | 条件 |
|--------|------|------|
| 配方名称为空 | error | `!formData.name?.trim()` |
| 未选择业务员 | error | `!formData.salesmanId` |
| 成品重量 ≤ 0 | error | `!formData.finishedWeight \|\| formData.finishedWeight <= 0` |
| 无原料 | error | `formData.materials.length === 0` |
| 原料信息不完整 | error | 存在 materialId 为空或 quantity ≤ 0 的原料 |
| 含量比校验失败 | error | `ratioValidation.level === 'error'` |
| 含量比严重偏差 | warning | `ratioValidation.level === 'high_warning'` |
| 原料单价缺失 | warning | `priceQuote.missingPrices.length > 0` |
| 升版原因为空（编辑模式） | error | `isEdit && !formData.versionReason?.trim()` |

### 3.4 提交按钮状态

| 条件 | 按钮状态 | 文案 |
|------|---------|------|
| 存在 error 类型阻塞项 | disabled | "存在 N 项错误，无法提交" |
| 仅有 warning 类型项 | 可用（emerald） | "确认创建" |
| 无任何阻塞项 | 可用（emerald） | "确认创建" |

---

## 4. Risks & Mitigation

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| coefficient-bar 移动后样式错位 | 中 | 移动后调整 margin/border-radius |
| 摘要栏三列在窄屏下拥挤 | 低 | 响应式断点 900px 以下切换为单列 |
| submitBlockReasons 与现有 handleSubmit 校验逻辑冲突 | 中 | handleSubmit 中保留含量比弹窗确认逻辑，submitBlockReasons 仅做前置展示 |

---

## 5. Phased Rollout

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | MaterialTableCore coefficient-bar 位置调整 | 待开发 |
| Phase 2 | FormulaForm 摘要栏 + submitBlockReasons | 待开发 |
| Phase 3 | 样式打磨 + 响应式适配 | 待开发 |
