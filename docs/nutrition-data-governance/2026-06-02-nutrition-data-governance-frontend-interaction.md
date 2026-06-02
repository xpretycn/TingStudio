# 营养数据治理 - 前端交互方案

## 1. 整体交互流程

```
┌─────────────────────────────────────────────────────────────┐
│                    用户操作流程                                │
│                                                               │
│  1. 查看原料详情 → 看到来源标签 + 溯源信息                     │
│  2. 点击"查看所有来源" → 展开来源对比面板                      │
│  3. 点击"智能获取" → 从外部API获取数据 → 自动展示在对比面板     │
│  4. admin 在对比面板中逐字段选定 → 保存权威数据                │
│  5. 配方计算自动使用权威数据 → 快照锁定                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 原料详情页 (MaterialDetail.vue) 改动

### 2.1 营养数据来源标签

**位置**：营养成分网格中，每个营养素卡片的数值区域

**交互**：

```
┌─────────────────────────────────┐
│ 蛋白质                    1.9 g │
│ ████████░░░░░░░░  32%          │
│ 📚 种子库                        │  ← 新增：来源标签
└─────────────────────────────────┘
```

**来源标签样式**：

| 来源类型 | 图标 | 标签文字 | 标签颜色 |
|---------|------|---------|---------|
| `seed` | 📚 | 种子库 | 绿色 (success) |
| `tianapi` | 🌐 | 天行数据 | 蓝色 (primary) |
| `manual` | ✏️ | 手动录入 | 灰色 (default) |
| `ai` | 🤖 | AI估算 | 橙色 (warning) |
| `excel_import` | 📊 | Excel导入 | 紫色 |
| `other` | 📎 | 其他 | 灰色 (default) |
| 无来源 | — | 来源未知 | 灰色 (default) |

**实现方式**：
- 使用 `NutritionSourceTag.vue` 组件
- 接收 `sourceType` 和 `sourceDetail` props
- 鼠标悬停时 `t-tooltip` 显示 `sourceDetail` 详情
- 数据来源：从 `materialNutrition.fieldSources[field]` 读取

### 2.2 权威数据来源摘要

**位置**：营养成分区域右上角，现有"标准参考"标签旁

**交互**：

```
┌──────────────────────────────────────────────────┐
│  标准参考  │  📚 种子库  │  高可信度              │  ← 现有
│  来源构成: 3项种子库, 2项天行数据, 1项手动录入     │  ← 新增
└──────────────────────────────────────────────────┘
```

**实现方式**：
- 从 `fieldSources` 统计各来源类型数量
- 使用 `t-tag-group` 展示来源构成
- 无 `fieldSources` 时显示"来源未标记"

### 2.3 "查看所有来源"按钮

**位置**：来源摘要行右侧

**交互**：

```
┌──────────────────────────────────────────────────┐
│  来源构成: 3项种子库, 2项天行数据  [查看所有来源 ▼] │
└──────────────────────────────────────────────────┘
```

- 点击后展开 `NutritionSourceCompare.vue` 对比面板
- 再次点击收起
- 使用 `t-collapse` 动画过渡

---

## 3. 来源对比面板 (NutritionSourceCompare.vue)

### 3.1 面板布局

```
┌─────────────────────────────────────────────────────────────────────┐
│  营养数据来源对比                                          [收起 ▲] │
├──────────┬──────────┬──────────┬──────────┬────────────────────────┤
│ 营养素    │ 📚 种子库 │ 🌐 天行  │ ✏️ 手动   │ 权威值                 │
│          │ 高可信度  │ 中可信度  │ 中可信度  │                        │
├──────────┼──────────┼──────────┼──────────┼────────────────────────┤
│ 能量 kJ   │ 1018     │  980 ⚠️  │ 1050 ⚠️  │ 1018                   │
│ 蛋白质 g  │ 1.9      │  2.1 ⚠️  │ 1.9      │ 1.9                    │
│ 脂肪 g    │ 0.2      │  0.3 ⚠️  │ 0.2      │ 0.2                    │
│ 碳水 g    │ 12.4     │ 11.8 ⚠️  │ 12.4     │ 12.4                   │
│ 钠 mg    │ 18.6     │ 20.0 ⚠️  │ 18.6     │ 18.6                   │
│ ...      │ ...      │  ...     │ ...      │ ...                    │
├──────────┴──────────┴──────────┴──────────┴────────────────────────┤
│  差异摘要: 5项营养素有差异, 最大差异 50% (脂肪)                       │
│                                                      [智能获取 🌐] │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 差异高亮规则

| 差异程度 | 样式 |
|---------|------|
| 与权威值相同 | 正常文字 |
| 差异 < 10% | 浅黄色背景 + ⚠️ 标记 |
| 差异 10%-30% | 黄色背景 + ⚠️ 标记 |
| 差异 > 30% | 橙色背景 + ⚠️ 标记 |
| 权威值为 0，来源有值 | 浅蓝色背景 |

### 3.3 智能获取按钮

**位置**：对比面板底部右侧

**交互**：
1. 点击"智能获取 🌐"
2. 按钮变为 loading 状态，文字变为"获取中..."
3. 调用 `POST /api/materials/:id/enrich-nutrition`
4. 成功后：
   - 新来源列自动出现在对比表格中
   - 显示 `MessagePlugin.success("已获取 N 条来源数据")`
5. 失败后：
   - 未命中：`MessagePlugin.info("未找到匹配的营养数据")`
   - 功能未启用：`MessagePlugin.warning("外部营养数据功能未启用")`
   - 网络错误：`MessagePlugin.error("获取失败，请稍后重试")`

### 3.4 空状态

当原料无多源数据时：

```
┌──────────────────────────────────────────────────┐
│                                                    │
│           📋 暂无多源数据                          │
│    当前营养数据仅有一个来源，无法对比               │
│                                                    │
│           [ 智能获取营养数据 🌐 ]                   │
│                                                    │
└──────────────────────────────────────────────────┘
```

---

## 4. 原料编辑页 (MaterialForm.vue) 改动

### 4.1 营养数据来源元信息增强

**位置**：营养数据折叠面板底部，现有"数据来源"输入框区域

**现有**：

```
数据来源: [中国食物成分表（第6版）     ]
数据可信度: ○高 ○中 ○低
备注: [                              ]
```

**增强后**：

```
数据来源: [中国食物成分表（第6版）     ]
数据可信度: ○高 ○中 ○低
来源类型:  [手动录入 ▼]                          ← 新增
备注: [                              ]
```

**来源类型下拉**：
- 仅展示，不可编辑（由系统根据保存来源自动设置）
- 选项：手动录入 / 种子库 / 天行数据 / AI估算 / Excel导入 / 其他 / 组合来源
- 编辑现有数据时，从 `sourceType` 读取并展示
- 新建原料时，默认"手动录入"

### 4.2 保存行为变更

**现有流程**：`saveNutrition()` → `nutritionApi.setMaterialNutrition()`

**增强后**：
1. `saveNutrition()` → `nutritionApi.setMaterialNutrition()`（不变）
2. 后端自动将数据同步写入 `material_nutrition_sources`（source_type='manual'）
3. 前端无需额外调用

---

## 5. 原料列表页改动

### 5.1 来源筛选条件

**位置**：列表顶部筛选区域

**新增筛选**：

```
营养数据来源: [全部 ▼]
```

选项：
- 全部
- 仅手动录入
- 仅外部API
- 仅种子库
- 无营养数据

**实现方式**：
- 后端 `GET /api/materials` 新增 `nutritionSource` 查询参数
- 前端使用 `t-select` 组件

### 5.2 列表项来源标记

**位置**：原料列表每行的营养数据列

**交互**：

```
┌──────┬──────┬──────────────┬────────┐
│ 编码  │ 名称  │ 营养数据      │ 来源    │  ← 新增"来源"列
├──────┼──────┼──────────────┼────────┤
│ M001 │ 山药  │ 9项已录入     │ 📚+🌐  │
│ M002 │ 枸杞  │ 9项已录入     │ 📚     │
│ M003 │ 黄精  │ 4项已录入     │ ✏️     │
│ M004 │ 竹叶  │ 未录入        │ —      │
└──────┴──────┴──────────────┴────────┘
```

**来源列展示规则**：
- 统计该原料在 `material_nutrition_sources` 中的活跃来源类型
- 每种来源类型显示对应图标
- 无来源数据时显示"—"

---

## 6. 新增组件规格

### 6.1 NutritionSourceTag.vue

**文件位置**：`frontend/src/components/nutrition/NutritionSourceTag.vue`

**Props**：

| Prop | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `sourceType` | string | ✅ | — | 来源类型枚举值 |
| `sourceDetail` | string | ❌ | null | 来源详细描述（tooltip） |
| `size` | string | ❌ | 'small' | 标签大小：small/medium |

**模板**：

```vue
<t-tooltip :content="sourceDetail || ''" :disabled="!sourceDetail">
  <t-tag :theme="tagTheme" :size="size" variant="light">
    {{ icon }} {{ label }}
  </t-tag>
</t-tooltip>
```

### 6.2 NutritionSourceCompare.vue

**文件位置**：`frontend/src/components/nutrition/NutritionSourceCompare.vue`

**Props**：

| Prop | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `materialId` | string | ✅ | — | 原料 ID |
| `visible` | boolean | ✅ | false | 面板是否展开 |

**Emits**：

| 事件 | 参数 | 说明 |
|------|------|------|
| `update:visible` | boolean | 展开/收起状态变更 |
| `authoritative-updated` | void | 权威数据已更新 |

**内部状态**：

| 变量 | 类型 | 说明 |
|------|------|------|
| `comparison` | `SourceComparison \| null` | 对比数据 |
| `loading` | `boolean` | 加载状态 |
| `enriching` | `boolean` | 智能获取中 |

**数据获取**：
- `watch(visible)` → 调用 `nutritionSourceApi.getSourcesCompare(materialId)`
- 智能获取 → 调用 `materialApi.enrichNutrition(materialId)` → 刷新对比数据

---

## 7. 前端 API 封装

### 7.1 nutritionSource.ts

**文件位置**：`frontend/src/api/nutritionSource.ts`

```typescript
interface NutritionSource {
  sourceId: string;
  materialId: string;
  sourceType: string;
  sourceDetail: string | null;
  per100g: Record<string, number>;
  confidence: string;
  matchScore: number | null;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  isActive: number;
}

interface SourceComparison {
  materialId: string;
  materialName: string;
  authoritative: {
    sourceType: string;
    sourceDetail: string | null;
    per100g: Record<string, number>;
  };
  nutrients: {
    field: string;
    label: string;
    unit: string;
    authoritativeValue: number;
    sources: {
      sourceId: string;
      sourceType: string;
      sourceDetail: string | null;
      confidence: string;
      value: number;
      diff: number;
      diffPercent: number;
    }[];
  }[];
  summary: {
    totalSources: number;
    totalNutrients: number;
    diffCount: number;
    maxDiffPercent: number;
    avgDiffPercent: number;
  };
}

export const nutritionSourceApi = {
  getSources(materialId: string, params?: { includeInactive?: boolean }): Promise<NutritionSource[]>,
  addSource(materialId: string, data: { sourceType: string; per100g: Record<string, number>; sourceDetail?: string; confidence?: string; matchScore?: number; notes?: string }): Promise<NutritionSource>,
  updateSource(materialId: string, sourceId: string, data: { sourceDetail?: string; confidence?: string; notes?: string }): Promise<void>,
  deleteSource(materialId: string, sourceId: string): Promise<void>,
  getSourcesCompare(materialId: string): Promise<SourceComparison>,
  setAuthoritative(materialId: string, fieldSelections: Record<string, string>): Promise<{ updatedFields: number; sourceType: string; fieldSources: Record<string, { sourceId: string; sourceType: string; sourceDetail: string }> }>,
};
```

### 7.2 material.ts 新增方法

```typescript
export const materialApi = {
  // ... 现有方法
  enrichNutrition(materialId: string, sources?: string[]): Promise<EnrichResult>,
  bulkEnrichNutrition(data: { materialIds?: string[]; sources?: string[]; overwriteExisting?: boolean }): Promise<BulkEnrichResult>,
};
```

---

## 8. 前端 Store 封装

### 8.1 nutritionSource.ts

**文件位置**：`frontend/src/stores/nutritionSource.ts`

**Store 名称**：`useNutritionSourceStore`

**状态**：

| 变量 | 类型 | 初始值 |
|------|------|--------|
| `loading` | `ref<boolean>` | `false` |
| `sources` | `ref<NutritionSource[]>` | `[]` |
| `comparison` | `ref<SourceComparison \| null>` | `null` |

**Actions**：

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `fetchSources(materialId)` | 获取来源列表 | `{ success, data? }` |
| `fetchComparison(materialId)` | 获取来源对比 | `{ success, data? }` |
| `addSource(materialId, data)` | 添加来源 | `{ success, message? }` |
| `deleteSource(materialId, sourceId)` | 软删除来源 | `{ success, message? }` |
| `setAuthoritative(materialId, fieldSelections)` | 字段级权威选定 | `{ success, message? }` |

---

## 9. 交互状态流转

### 9.1 查看来源对比

```
[初始] 面板收起
  │
  ├─ 点击"查看所有来源"
  │    ├─ loading=true
  │    ├─ 调用 getSourcesCompare API
  │    ├─ 成功 → 渲染对比表格
  │    └─ 失败 → 显示错误提示
  │
  ├─ 点击"智能获取"
  │    ├─ enriching=true
  │    ├─ 调用 enrichNutrition API
  │    ├─ 成功 → 刷新对比数据 + success 提示
  │    └─ 失败 → 错误提示
  │
  └─ 点击"收起"
       └─ 面板收起，数据保留
```

### 9.2 权威数据选定（Phase 2 实现，本次仅预留接口）

```
[Phase 2] 来源对比面板中
  │
  ├─ 每个营养素行新增下拉选择器
  │    └─ 选项：各来源的值 + 来源标签
  │
  ├─ 切换来源 → 该行值实时更新
  │
  └─ 点击"保存权威数据"
       ├─ 调用 setAuthoritative API
       ├─ 成功 → success 提示 + emit('authoritative-updated')
       └─ 失败 → 错误提示
```

---

## 10. 设计令牌引用

所有新增组件样式**必须**引用项目设计令牌：

| 样式属性 | 令牌 | 用途 |
|---------|------|------|
| 来源标签颜色 | `var(--color-success)` / `var(--color-primary)` 等 | 区分来源类型 |
| 差异高亮背景 | `var(--color-warning-light)` / `var(--color-warning)` | 差异程度标记 |
| 面板间距 | `var(--space-4)` / `var(--space-6)` | 对比面板内间距 |
| 表格边框 | `var(--border-color)` | 对比表格边框 |
| 字体大小 | `var(--font-size-body)` / `var(--font-size-small)` | 表格文字 |
