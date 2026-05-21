# 技术方案：FormulaForm 页面布局优化与提交校验增强

> 日期：2026-05-21 | 模块：formulas | 关联 PRD：2026-05-21-formula-form-layout-prd.md

---

## 1. 架构概述

本次变更仅涉及前端两个 Vue 组件的模板和样式调整，不涉及后端 API、数据库、路由变更。

```
FormulaForm.vue
├── 区域一：基础信息（不变）
└── 区域二：配方数据工作区（重构）
    ├── MaterialTableCore（coefficient-bar 位置调整）
    └── 配方摘要栏（新增）
        ├── 含量比校验列
        ├── 配方报价列
        └── 提交校验列
```

---

## 2. MaterialTableCore.vue 变更详设

### 2.1 模板变更

**移动 coefficient-bar**：从组件顶层（L3-34）移入 `table-scroll-wrapper` 内部，位于 `materials-add-row` 之后、`materials-unit-row` 之前。

```html
<!-- 变更前 -->
<div class="material-table-core">
  <div v-if="mode === 'edit'" class="coefficient-bar">...</div>  ← 顶层
  <div class="card-header--materials">...</div>
  ...
  <div class="table-scroll-wrapper">
    ...
    <div class="materials-add-row">...</div>
    <div class="materials-unit-row">...</div>    ← unit-row
    ...
  </div>
</div>

<!-- 变更后 -->
<div class="material-table-core">
  <div class="card-header--materials">...</div>
  ...
  <div class="table-scroll-wrapper">
    ...
    <div class="materials-add-row">...</div>
    <div v-if="mode === 'edit'" class="coefficient-bar">...</div>  ← 移到这里
    <div class="materials-unit-row">...</div>
    ...
  </div>
</div>
```

### 2.2 样式变更

```scss
.coefficient-bar {
  // 变更前
  border-radius: 8px 8px 0 0;
  margin-bottom: 0;

  // 变更后
  border-radius: 8px;
  margin-top: 8px;
  margin-bottom: 8px;
}
```

---

## 3. FormulaForm.vue 变更详设

### 3.1 模板变更

#### 3.1.1 删除 zone-bottom-info

删除 L209-297 整个 section，包括 `quote-card` 和 `ratio-card`。

#### 3.1.2 新增配方摘要栏

在 `materials-table-wrapper` 之后新增：

```html
<div class="formula-summary-bar" v-if="formData.materials.length > 0">
  <div class="summary-col summary-col--ratio">
    <div class="summary-col-header">
      <t-icon name="check-circle" size="14px" />
      <span>含量比校验</span>
      <span class="ratio-status-badge" :class="'badge--' + ratioValidation.level">
        {{ ratioValidation.level === 'normal' ? '通过' : ratioValidation.level === 'warning' ? '预警' : '异常' }}
      </span>
    </div>
    <div class="summary-col-body">
      <div class="ratio-bar-track">
        <div class="ratio-bar-fill" :style="{ width: ratioBarWidth }"></div>
        <div class="ratio-bar-marker" :style="{ left: ratioMarkerLeft }"></div>
      </div>
      <div class="ratio-labels">
        <span>0.92</span><span>0.98</span><span class="center">1.00</span><span>1.02</span><span>1.08</span>
      </div>
      <div class="ratio-value">
        总和：<strong>{{ ratioValidation.totalRatio.toFixed(5) }}</strong>
        <span class="deviation" :class="'deviation--' + ratioValidation.level">{{ ratioDeviationText }}</span>
      </div>
    </div>
  </div>

  <div class="summary-col summary-col--quote">
    <div class="summary-col-header">
      <t-icon name="currency-exchange" size="14px" />
      <span>配方报价</span>
    </div>
    <div class="summary-col-body">
      <div v-if="priceQuote.adjustedCount > 0" class="quote-toolbar">
        <span class="qt-badge-info">
          <svg viewBox="0 0 14 14" width="13" height="13">
            <path d="M7 1L8.75 5.25L13 6L9.75 9L10.5 13.25L7 11L3.5 13.25L4.25 9L1 6L5.25 5.25Z" fill="#f59e0b" />
          </svg>
          {{ priceQuote.adjustedCount }} 项单价已调整
        </span>
      </div>
      <p v-if="priceQuote.missingPrices.length > 0" class="quote-warn-text">
        <t-icon name="error-circle" /> 以下原料未录入单价：{{ priceQuote.missingPrices.join('、') }}
      </p>
      <div class="quote-summary">
        <div class="qs-row qs-total">
          <label><t-icon name="outbox" size="14px" class="qs-label-icon" /> 原料成本</label>
          <span>¥{{ priceQuote.materialTotal.toFixed(2) }}</span>
        </div>
        <div class="qs-row">
          <label><t-icon name="shop" size="14px" class="qs-label-icon" /> 包材费用</label>
          <div class="qs-input-wrap">
            <t-input-number v-model="formData.packagingPrice" :min="0" :precision="2" size="small" theme="normal" style="width:160px" />
            <span class="qs-unit">元</span>
          </div>
        </div>
        <div class="qs-row">
          <label><t-icon name="edit-1" size="14px" class="qs-label-icon" /> 其他费用</label>
          <div class="qs-input-wrap">
            <t-input-number v-model="formData.otherPrice" :min="0" :precision="2" size="small" theme="normal" style="width:160px" />
            <span class="qs-unit">元</span>
          </div>
        </div>
        <div class="qs-divider"></div>
        <div class="qs-row qs-subtotal">
          <label><t-icon name="wallet" size="14px" class="qs-label-icon" /> 成本小计</label>
          <span>¥{{ priceQuote.costSubtotal.toFixed(2) }}</span>
        </div>
        <div class="qs-row">
          <label><t-icon name="chart-pie" size="14px" class="qs-label-icon" /> 利润率</label>
          <div class="qs-input-wrap">
            <t-input-number v-model="formData.profitMargin" :min="0" :max="999" :precision="1" size="small" theme="normal" style="width:160px" />
            <span class="qs-unit">%</span>
          </div>
        </div>
        <div class="qs-divider qs-divider--bold"></div>
        <div class="qs-row qs-final">
          <label><t-icon name="money-filled" size="16px" class="qs-label-icon qs-label-icon--final" /> 最终报价</label>
          <span>¥{{ priceQuote.totalPrice.toFixed(2) }}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="summary-col summary-col--submit">
    <div class="summary-col-header">
      <t-icon name="check-circle" size="14px" />
      <span>提交校验</span>
    </div>
    <div class="summary-col-body">
      <div v-if="submitBlockReasons.length" class="submit-block-reasons">
        <div v-for="(reason, idx) in submitBlockReasons" :key="idx" class="sbr-item" :class="'sbr-item--' + reason.type">
          <span class="sbr-dot"></span>
          <span class="sbr-text">{{ reason.message }}</span>
        </div>
      </div>
      <div v-else class="submit-all-clear">
        <t-icon name="check-circle" size="16px" />
        <span>所有校验项通过</span>
      </div>
      <t-button
        theme="success"
        block
        @click="handleSubmit({ validateResult: true })"
        :loading="loading"
        :disabled="loading || submitBlockReasons.some(r => r.type === 'error')"
      >
        <template #icon><t-icon name="check-circle" /></template>
        {{ submitBlockReasons.some(r => r.type === 'error') ? `存在 ${submitBlockReasons.filter(r => r.type === 'error').length} 项错误，无法提交` : (isEdit ? '保存配方' : '创建配方') }}
      </t-button>
    </div>
  </div>
</div>
```

### 3.2 Script 变更

#### 3.2.1 新增 submitBlockReasons computed

```typescript
const submitBlockReasons = computed(() => {
  const reasons: { type: 'error' | 'warning'; message: string }[] = [];

  if (!formData.name?.trim()) {
    reasons.push({ type: 'error', message: '配方名称不能为空' });
  }
  if (!formData.salesmanId) {
    reasons.push({ type: 'error', message: '请选择所属业务员' });
  }
  if (!formData.finishedWeight || formData.finishedWeight <= 0) {
    reasons.push({ type: 'error', message: '成品重量必须大于 0' });
  }
  if (formData.materials.length === 0) {
    reasons.push({ type: 'error', message: '请至少添加一种原料' });
  } else {
    const incomplete = formData.materials.filter(
      (m: any) => !m.materialId || !m.quantity || m.quantity <= 0
    );
    if (incomplete.length > 0) {
      reasons.push({ type: 'error', message: `${incomplete.length} 种原料信息不完整（缺少名称或用量）` });
    }
  }
  if (priceQuote.value.missingPrices.length > 0) {
    reasons.push({ type: 'warning', message: `${priceQuote.value.missingPrices.length} 种原料未录入单价：${priceQuote.value.missingPrices.join('、')}` });
  }
  if (ratioValidation.value.level === 'error') {
    reasons.push({ type: 'error', message: `含量比校验失败：${ratioValidation.value.message}` });
  }
  if (ratioValidation.value.level === 'high_warning') {
    reasons.push({ type: 'warning', message: `含量比严重偏差：${ratioValidation.value.message}` });
  }
  if (ratioValidation.value.level === 'warning') {
    reasons.push({ type: 'warning', message: `含量比偏差预警：${ratioValidation.value.message}` });
  }
  if (isEdit.value && !formData.versionReason?.trim()) {
    reasons.push({ type: 'error', message: '编辑模式下请填写升版原因' });
  }

  return reasons;
});
```

#### 3.2.2 handleSubmit 保留现有逻辑

`handleSubmit` 中的含量比弹窗确认逻辑（L744-791）保持不变，`submitBlockReasons` 仅做前置展示，不替代提交时的确认流程。

### 3.3 样式变更

#### 3.3.1 删除样式

- `.zone-bottom-info` 及其子样式（`.bottom-grid`、独立的 `.ratio-card`、`.quote-card`）
- 保留 `.quote-summary`、`.qs-row` 等报价相关样式（摘要栏复用）

#### 3.3.2 新增样式

```scss
.formula-summary-bar {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0;
  margin-top: 20px;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  overflow: hidden;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}

.summary-col {
  padding: 20px 24px;

  & + & {
    border-left: 1px solid #e2e8f0;

    @media (max-width: 900px) {
      border-left: none;
      border-top: 1px solid #e2e8f0;
    }
  }
}

.summary-col-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;

  .t-icon { color: #10b981; font-size: 14px; }
}

.summary-col-body {
  // 各列内容区
}

// 含量比校验列
.summary-col--ratio {
  .ratio-bar-track { /* 复用现有样式 */ }
  .ratio-labels { /* 复用现有样式 */ }
  .ratio-value { /* 复用现有样式 */ }
  .ratio-status-badge { /* 复用现有 ratio-status 样式 */ }
}

// 报价列
.summary-col--quote {
  .quote-summary { /* 复用现有样式 */ }
}

// 提交校验列
.summary-col--submit {
  .submit-block-reasons {
    margin-bottom: 16px;
  }

  .sbr-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 6px 0;
    font-size: 12px;

    .sbr-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-top: 5px;
      flex-shrink: 0;
    }

    &--error .sbr-dot { background: #ef4444; }
    &--warning .sbr-dot { background: #f59e0b; }
    &--error .sbr-text { color: #dc2626; }
    &--warning .sbr-text { color: #d97706; }
  }

  .submit-all-clear {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 0;
    font-size: 13px;
    color: #16a34a;
    font-weight: 500;
    margin-bottom: 16px;
  }
}
```

---

## 4. 数据流

```
formData.materials ──→ priceQuote (computed) ──→ 摘要栏报价列
                   ──→ ratioValidation (computed) ──→ 摘要栏校验列
                                                      ──→ submitBlockReasons (computed) ──→ 提交按钮状态
```

所有数据均为前端 computed，无新增 API 调用。

---

## 5. 测试要点

| 测试场景 | 预期结果 |
|---------|---------|
| 添加原料后摘要栏出现 | 摘要栏三列正常展示 |
| 修改原料用量 | 报价和含量比实时更新 |
| 配方名称为空 | submitBlockReasons 显示 error，提交按钮 disabled |
| 含量比异常 | submitBlockReasons 显示 error/warning，按钮状态对应 |
| 编辑模式未填升版原因 | submitBlockReasons 显示 error |
| 所有校验通过 | 显示"所有校验项通过"，按钮可用 |
| 窄屏（<900px） | 摘要栏切换为单列垂直布局 |
| coefficient-bar 在 unit-row 上方 | 系数输入在合计行上方，修改系数后含量比立即更新 |
