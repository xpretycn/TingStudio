# 技术方案：快速配方录入功能

## 1. 架构设计

### 1.1 整体架构

在现有 Dashboard.vue 页面中集成快速录入面板，通过状态切换控制显示模式。

```
Dashboard.vue
├── [默认模式] 现有 Dashboard 内容（Bento Grid）
└── [录入模式] QuickFormulaPanel.vue（全屏覆盖）
    ├── QuickFormulaEntry.vue     ← 准入页面：填写配方名称（必填）
    ├── FormulaDashboard.vue     ← 实时仪表盘（上部）
    └── FormulaWorkspace.vue     ← 工作区（下部）
        ├── FormulaEditor.vue    ← 配方编辑区（左栏）
        └── MaterialPool.vue     ← 动态原料池（右栏）
            └── MaterialFish.vue ← 原料鱼动画单元
```

### 1.2 状态管理

新建 `useQuickFormulaStore`（Pinia Composition API 风格）：

```typescript
// stores/quickFormula.ts
interface QuickFormulaState {
  phase: 'entry' | 'editing'                // 准入阶段 / 编辑阶段
  formulaName: string                        // 本次配方名称（准入阶段必填）
  formulaStatus: 'new' | 'draft'             // 配方状态标签
  isEditMode: boolean                        // 是否处于录入模式
  formulaData: {
    ratioFactor: number                  // 主料系数
    supplementRatioFactor: number        // 辅料系数
    finishedWeight: number               // 成品重量
    packagingPrice: number               // 包材费用
    otherPrice: number                   // 其他费用
    profitMargin: number                 // 利润率
    materials: QuickFormulaMaterial[]    // 已选原料列表
  }
  poolFilter: {
    keyword: string                      // 搜索关键词
    type: 'all' | 'herb' | 'supplement' // 类型筛选
  }
  templateMode: 'none' | 'save' | 'load' // 模板操作状态
  hasUnsavedChanges: boolean             // 是否有未保存修改
}
```

### 1.3 数据流

```
用户操作 → QuickFormulaStore → 计算属性(实时) → UI 更新
                ↓
        FormulaDashboard (营养/成本)
        FormulaEditor (原料列表)
        MaterialPool (原料池)

提交 → FormulaStore.createFormula() → API → 后端
```

---

## 2. 模块划分

### 2.1 QuickFormulaPanel.vue（容器组件）

**职责**：录入模式切换、整体布局控制、数据状态保持

| Props | 类型 | 说明 |
|-------|------|------|
| visible | boolean | 是否显示录入面板 |

| Events | 说明 |
|--------|------|
| close | 关闭录入面板（触发未保存检测） |

**布局**：
- 全屏覆盖 Dashboard，z-index 高于 Dashboard 内容
- 准入阶段：居中展示 QuickFormulaEntry
- 编辑阶段：上部 30% FormulaDashboard + 下部 70% FormulaWorkspace（flex 布局，左 55% + 右 45%）

**数据状态保持**：
- 离开检测：监听 `beforeRouteLeave` 和浏览器 `beforeunload`
- 有未保存修改时弹出确认提示（`t-popconfirm`），引导保存草稿
- 草稿保存：将 `formulaName` + `formulaData` 序列化到 `localStorage`（key: `quick_formula_draft`）
- 草稿恢复：进入准入阶段时检测 localStorage，存在草稿则提供"从草稿恢复"选项
- 提交成功后自动清除 localStorage 草稿

### 2.2 FormulaDashboard.vue（实时仪表盘）

**职责**：展示实时计算的营养数据和成本信息

**数据来源**：`useQuickFormulaStore` 的 computed 属性

**展示指标**：

| 指标 | 计算逻辑 | 单位 |
|------|---------|------|
| 含量比 | Σ(用量/成品重量 × 系数) × 100 | % |
| 能量 | Σ(蛋白质×17 + 脂肪×37 + 碳水×17) | kJ |
| 蛋白质 | Σ(每100g蛋白质 × ratio) | g |
| 脂肪 | Σ(每100g脂肪 × ratio) | g |
| 碳水 | Σ(每100g碳水 × ratio) | g |
| 钠 | Σ(每100g钠 × ratio) | mg |
| 原料成本 | Σ(用量/1000 × 单价) | 元 |
| 成本小计 | 原料成本 + 包材 + 其他 | 元 |
| 最终报价 | 成本小计 × (1 + 利润率%) | 元 |

**0 界限归零规则**：
- 能量 ≤ 17kJ → 归零
- 蛋白质 ≤ 0.5g → 归零
- 脂肪 ≤ 0.5g → 归零
- 碳水 ≤ 0.5g → 归零
- 钠 ≤ 5mg → 归零
- 归零后重新计算能量

**视觉设计**：
- 卡片式布局，关键指标突出显示
- 含量比超过 100% 时红色警告
- 成本/报价使用品牌色高亮

### 2.3 FormulaEditor.vue（配方编辑区）

**职责**：配方参数调整、原料管理

**功能**：
1. **参数区**：主料系数、辅料系数、成品重量（t-input-number）
2. **原料列表**：
   - 按主料/辅料分组
   - 每行：序号、原料名称、类型标签、用量输入、版本选择、删除按钮
   - 用量修改触发实时计算
3. **费用区**：包材费用、其他费用、利润率
4. **操作区**：保存为模板、提交配方

**交互**：
- 用量输入使用 `t-input-number`，step=1，min=0
- 版本选择使用 `t-select`，数据来源 `materialStore.getVersions(id)`
- 删除使用 `t-popconfirm` 确认

### 2.4 MaterialPool.vue（动态原料池）

**职责**：原料浏览、筛选、添加

**功能**：
1. **筛选栏**：搜索框 + 类型筛选按钮 + 清除筛选
2. **原料池区域**：原料以"鱼"式动态游动
3. **Hover 浮层**：原料详情（版本、营养、成本）+ 添加按钮

**原料池数据来源**：
- `materialStore.allMaterials` 减去已添加到编辑区的原料
- 应用筛选条件后的结果

### 2.5 MaterialFish.vue（原料鱼动画单元）

**职责**：单个原料的动态展示

**动画方案**：CSS Animation（优先，性能优于 Canvas）

```css
@keyframes fishSwim {
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(30px, -15px) rotate(2deg); }
  50% { transform: translate(60px, 0) rotate(0deg); }
  75% { transform: translate(30px, 15px) rotate(-2deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}
```

**交互**：
- 默认状态：游动动画
- Hover 状态：`animation-play-state: paused`，显示浮层
- 浮层内容：原料名称、类型、版本、营养数据摘要、单价、添加按钮
- 点击添加按钮：调用 store 方法，原料移入编辑区

**性能优化**：
- 使用 CSS `will-change: transform` 启用 GPU 加速
- 每个原料动画延迟随机，避免同步运动
- 超出可视区域的原料使用 `visibility: hidden`

### 2.6 QuickFormulaEntry.vue（准入页面）

**职责**：进入编辑前填写配方名称，检测草稿恢复

**表单字段**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| 配方名称 | t-input | 是 | 本次配方名称，验证通过后才能进入编辑 |

**草稿恢复**：
- 进入准入页面时检测 `localStorage` 中的 `quick_formula_draft`
- 存在草稿时显示"发现未完成的配方草稿"提示
- 提供"从草稿恢复"和"重新开始"两个选项
- 恢复草稿时自动填充配方名称，跳过准入直接进入编辑阶段

**流程**：
1. 用户填写配方名称 → 验证不为空 → 进入编辑阶段
2. 或用户选择恢复草稿 → 自动填充名称 → 进入编辑阶段

### 2.7 一键提交逻辑（无弹窗）

**职责**：编辑完成后一键提交配方草稿

**提交规则**：
- 点击"提交"按钮直接提交，**不弹出任何对话框**
- 配方名称：自动使用准入阶段填写的 `formulaName`
- 业务员：默认填充当前用户关联的业务员（`authStore.user.salesmanId`），若用户无关联业务员则使用系统默认业务员
- 校验规则：配方名称不为空、至少 1 个原料、成品重量 > 0、含量比校验通过
- 校验不通过时在编辑区内联展示错误提示（红色文字，非弹窗）

**提交流程**：
1. 前端校验通过
2. 构建 `FormulaForm` 数据（name=formulaName, salesmanId=默认值, materials, finishedWeight, ratioFactor, supplementRatioFactor, packagingPrice, otherPrice, profitMargin）
3. 调用 `formulaStore.createFormula(form)` 创建草稿
4. 成功后：清除 localStorage 草稿、提示成功、清空编辑区、退出录入模式

### 2.7 TemplateManager.vue（模板管理）

**职责**：模板的创建、列表、加载、删除

**模板数据结构**：
```typescript
interface FormulaTemplate {
  id: string
  name: string
  description: string | null
  ratioFactor: number
  supplementRatioFactor: number
  finishedWeight: number
  materials: TemplateMaterial[]
  packagingPrice: number
  otherPrice: number
  profitMargin: number
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

interface TemplateMaterial {
  materialId: string
  materialName: string
  quantity: number
  materialType: string
}
```

---

## 3. 依赖关系

### 3.1 前端新增文件

```
frontend/src/
├── views/dashboard/
│   └── quick-formula/
│       ├── QuickFormulaPanel.vue      ← 容器
│       ├── QuickFormulaEntry.vue      ← 准入页面
│       ├── FormulaDashboard.vue       ← 仪表盘
│       ├── FormulaWorkspace.vue       ← 工作区容器
│       ├── FormulaEditor.vue          ← 编辑区
│       ├── MaterialPool.vue           ← 原料池
│       ├── MaterialFish.vue           ← 原料鱼
│       └── TemplateManager.vue        ← 模板管理
├── stores/
│   └── quickFormula.ts                ← 新 Store
├── api/
│   └── formulaTemplate.ts             ← 模板 API
└── types/
    └── quickFormula.ts                ← 类型定义
```

### 3.2 后端新增文件

```
backend/src/
├── controllers/
│   └── formulaTemplateController.ts   ← 模板控制器
├── routes/
│   └── formulaTemplates.ts            ← 模板路由
└── scripts/migrations/
    └── addFormulaTemplatesTable.ts    ← 建表迁移
```

### 3.3 修改的现有文件

| 文件 | 修改内容 |
|------|---------|
| `Dashboard.vue` | 添加"快速录入"入口按钮 + QuickFormulaPanel 组件 |
| `frontend/src/router/index.ts` | 无需修改（集成在 Dashboard 内） |
| `backend/src/routes/index.ts` | 注册模板路由 |
| `frontend/src/stores/material.ts` | 可能需要扩展 fetchAllForSelect 返回营养数据 |

---

## 4. 关键技术决策

### 4.1 原料池动画：CSS Animation vs Canvas

| 方案 | 优点 | 缺点 |
|------|------|------|
| CSS Animation | 简单、GPU 加速、hover 交互方便 | 大量元素时 DOM 压力大 |
| Canvas | 性能好、灵活 | hover 检测复杂、开发成本高 |

**决策**：使用 **CSS Animation**。理由：
1. 原料数量通常 < 200，DOM 压力可控
2. CSS hover 交互天然支持，无需额外计算
3. `animation-play-state: paused` 原生支持 hover 停止
4. 开发效率高，维护成本低

### 4.2 实时计算：debounce 策略

- 用量修改：debounce 300ms 后触发计算
- 系数/成品重量修改：debounce 300ms
- 原料增删：立即触发计算（无 debounce）

### 4.3 模板与配方版本的关系

模板**不绑定**配方版本。模板仅保存配方结构（系数、原料列表、费用参数），加载模板时重新查询原料最新数据。理由：
1. 原料营养数据可能更新，模板应使用最新值
2. 避免模板与版本耦合导致维护困难

### 4.4 Dashboard 集成方式

**方案**：在 Dashboard 中以全屏覆盖方式展示录入面板，而非新路由页面。

理由：
1. 用户需求明确"集成到 Dashboard"
2. 全屏覆盖比新页面切换更快
3. 可随时收起回到 Dashboard，体验流畅
