# 原料管理版本化系统 - v1.1 & v2.0 规划

> 基于 MVP 已实现功能，规划后续两个版本的详细设计

---

## MVP 已实现功能清单（基线）

| 功能 | 状态 | 说明 |
|------|:----:|------|
| 原料编辑=创建新版本（核心） | ✅ 已实现 | 编辑已引用原料自动创建新版本 |
| 版本查看/切换界面 | ✅ 基础实现 | MaterialVersions.vue 时间线展示 |
| 配方中引用原料版本快照 | ⚠️ 格式定义 | materials_json 新增快照字段，但营养计算仍用实时查询 |
| 用户域隔离 | ✅ 已实现 | 配方师只能编辑自己的原料 |
| 版本对比功能 | ❌ 未实现 | changesSummary 仅返回占位文本 |
| 原料版本回收站 | ❌ 未实现 | 仅软删除，无恢复入口 |
| 批量更新原料引用 | ❌ 未实现 | 配方快照刷新接口未实现 |
| 变更摘要 | ❌ 未实现 | changesSummary 仅返回 "版本 v2" |
| 配方原料版本标签 | ❌ 未实现 | MaterialTableCore 未显示版本号 |

---

## v1.1 — 版本对比 + 版本列表 UI 增强

### 1.1 功能清单

| 功能 | 优先级 | 说明 |
|------|:------:|------|
| 版本对比（双版本 diff） | P0 | 对比两个版本的基本信息+营养数据差异 |
| 真实变更摘要 | P0 | 编辑时自动记录变更内容，替代占位文本 |
| 版本列表 UI 增强 | P1 | 版本列表增加筛选、搜索、分页 |
| 配方原料版本标签 | P1 | 配方编辑页显示原料版本号+最新/历史标签 |
| 快照刷新提示 | P1 | 配方中原料有新版本时提示刷新 |

### 1.2 版本对比 — 详细设计

#### 1.2.1 交互设计

```
┌─────────────────────────────────────────────────────────────┐
│  ← 返回版本历史                                              │
│                                                             │
│  当归 (DG001) · 版本对比                                     │
│                                                             │
│  ┌── 选择对比版本 ──────────────────────────────────────────┐│
│  │  左侧: [▼ v1 (2026-05-15)]     右侧: [▼ v2 (2026-05-21)]││
│  └──────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌── 对比结果 ──────────────────────────────────────────────┐│
│  │                                                          ││
│  │  基本信息                                                 ││
│  │  ┌──────────┬──────────────┬──────────────┬────────────┐ ││
│  │  │  字段     │  v1          │  v2          │  变更      │ ││
│  │  ├──────────┼──────────────┼──────────────┼────────────┤ ││
│  │  │  名称     │  当归        │  当归        │  —        │ ││
│  │  │  单价     │  ¥25.00     │  ¥28.00     │  ↑ +12%   │ ││
│  │  │  库存     │  300g       │  500g       │  ↑ +67%   │ ││
│  │  │  类型     │  药材        │  药材        │  —        │ ││
│  │  └──────────┴──────────────┴──────────────┴────────────┘ ││
│  │                                                          ││
│  │  营养成分（每100g）                                        ││
│  │  ┌──────────┬──────────────┬──────────────┬────────────┐ ││
│  │  │  营养素   │  v1          │  v2          │  变更      │ ││
│  │  ├──────────┼──────────────┼──────────────┼────────────┤ ││
│  │  │  蛋白质   │  3.2g       │  3.5g       │  ↑ +9%    │ ││
│  │  │  脂肪     │  1.0g       │  1.2g       │  ↑ +20%   │ ││
│  │  │  碳水     │  8.5g       │  10.0g      │  ↑ +18%   │ ││
│  │  │  钠       │  0.03g      │  0.05g      │  ↑ +67%   │ ││
│  │  │  热量     │  55kcal     │  68kcal     │  ↑ +24%   │ ││
│  │  └──────────┴──────────────┴──────────────┴────────────┘ ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

#### 1.2.2 变更标记规则

| 变化幅度 | 标记 | 颜色 |
|---------|------|------|
| 值增大 | `↑ +N%` | 绿色 |
| 值减小 | `↓ -N%` | 红色 |
| 无变化 | `—` | 灰色 |
| 新增字段 | `NEW` | 蓝色 |
| 删除字段 | `DEL` | 红色删除线 |

#### 1.2.3 新增接口

```
GET /api/materials/:id/versions/compare?v1=<versionId1>&v2=<versionId2>
```

**响应示例**：

```json
{
  "success": true,
  "data": {
    "left": { "versionId": "mat_v1", "version": 1, "name": "当归", ... },
    "right": { "versionId": "mat_v2", "version": 2, "name": "当归", ... },
    "diff": {
      "basic": [
        { "field": "unitPrice", "label": "单价", "left": 25.00, "right": 28.00, "change": "+12%", "type": "increase" },
        { "field": "stock", "label": "库存", "left": 300, "right": 500, "change": "+67%", "type": "increase" }
      ],
      "nutrition": [
        { "field": "protein", "label": "蛋白质", "left": 3.2, "right": 3.5, "change": "+9%", "type": "increase" },
        { "field": "fat", "label": "脂肪", "left": 1.0, "right": 1.2, "change": "+20%", "type": "increase" }
      ]
    }
  }
}
```

#### 1.2.4 前端组件

新增 `MaterialVersionCompare.vue`：

```
frontend/src/views/materials/
├── MaterialVersions.vue          ← 增强：增加"对比"按钮
└── MaterialVersionCompare.vue    ← 新增：版本对比页面
```

路由：

```typescript
{
  path: 'materials/:id/versions/compare',
  name: 'MaterialVersionCompare',
  component: () => import('@/views/materials/MaterialVersionCompare.vue'),
  meta: { title: '版本对比', hideHeader: true }
}
```

### 1.3 真实变更摘要 — 详细设计

#### 1.3.1 数据库变更

`materials` 表新增字段：

```sql
ALTER TABLE materials ADD COLUMN changes_json TEXT DEFAULT NULL;
```

`changes_json` 格式：

```json
[
  { "field": "unitPrice", "label": "单价", "old": 25.00, "new": 28.00 },
  { "field": "stock", "label": "库存", "old": 300, "new": 500 }
]
```

#### 1.3.2 后端逻辑

创建新版本时，自动对比新旧数据，生成变更摘要：

```typescript
// materialService.ts - createNewVersion 增强
function buildChangesSummary(current: MaterialRow, newData: Record<string, any>): string {
  const changes: Array<{ field: string; label: string; old: any; new: any }> = [];
  const fieldLabels: Record<string, string> = {
    name: "名称", unit: "单位", stock: "库存",
    unit_price: "单价", material_type: "类型", data_source: "数据源"
  };

  for (const [key, label] of Object.entries(fieldLabels)) {
    const oldVal = (current as any)[key];
    const newVal = newData[snakeToCamel(key)] ?? newData[key];
    if (newVal !== undefined && oldVal !== newVal) {
      changes.push({ field: key, label, old: oldVal, new: newVal });
    }
  }

  return JSON.stringify(changes);
}
```

#### 1.3.3 前端展示

版本历史页的 `changesSummary` 从占位文本升级为结构化展示：

```
● v2  ← 最新
  │ 2026-05-21 14:30 · 由 管理员（张三）编辑
  │ 变更内容：
  │   • 单价：¥25.00 → ¥28.00
  │   • 库存：300g → 500g
  │ [查看此版本详情] [与 v1 对比]
```

### 1.4 配方原料版本标签 — 详细设计

#### 1.4.1 MaterialTableCore.vue 增强

在配方编辑页的原料表格中，每行增加版本信息列：

```
┌──────────┬─────────┬────────┬────────┬────────┐
│ 原料名称   │ 编码     │ 版本    │ 用量    │ 操作   │
├──────────┼─────────┼────────┼────────┼────────┤
│ 当归      │ DG001   │ v2 ✨  │ 150g   │ [删除] │
│ 黄芪      │ HQ002   │ v1 ⚠️  │ 120g   │ [删除] │
└──────────┴─────────┴────────┴────────┴────────┘

✨ = 最新版本（绿色标签）
⚠️ = 有新版本可用（黄色标签，hover 显示 "此原料已更新至 v2"）
```

#### 1.4.2 新增接口

```
GET /api/formulas/:id/check-material-updates
```

检查配方中原料是否有新版本，返回更新列表。

### 1.5 快照刷新提示 — 详细设计

#### 1.5.1 交互设计

```
当配方中的原料有新版本时，配方编辑页顶部显示提示条：

┌──────────────────────────────────────────────────────────────┐
│ ⚠️ 部分原料已有新版本                                         │
│ • 当归: v1 → v2 (单价、库存已更新)                             │
│ • 黄芪: v1 → v2 (营养数据已更新)                               │
│                                                              │
│ 刷新快照将更新配方中的营养数据，可能影响营养分析结果。             │
│                                                              │
│  [暂不刷新]    [立即刷新快照]                                   │
└──────────────────────────────────────────────────────────────┘
```

#### 1.5.2 新增接口

```
POST /api/formulas/:id/refresh-snapshots
```

请求体（可选，指定刷新哪些原料）：

```json
{ "materialIds": ["mat_001", "mat_003"] }
```

响应：

```json
{
  "success": true,
  "data": {
    "refreshedCount": 2,
    "unchangedCount": 1,
    "details": [
      { "materialId": "mat_001", "materialName": "当归", "fromVersion": 1, "toVersion": 2, "nutritionChanged": true }
    ]
  }
}
```

### 1.6 文件变更清单

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `backend/src/services/materialService.ts` | 🔧 增强 | 新增 compareVersions、buildChangesSummary |
| `backend/src/controllers/materialController.ts` | 🔧 增强 | 新增 compareVersions 接口 |
| `backend/src/routes/materials.ts` | 🔧 增强 | 新增 compare 路由 |
| `backend/src/controllers/formulaController.ts` | 🔧 增强 | 新增 refreshSnapshots、checkMaterialUpdates |
| `backend/src/routes/formulas.ts` | 🔧 增强 | 新增快照刷新路由 |
| `backend/src/scripts/migrations/addChangesJsonToMaterials.ts` | ✨ 新增 | changes_json 字段迁移 |
| `frontend/src/views/materials/MaterialVersionCompare.vue` | ✨ 新增 | 版本对比页面 |
| `frontend/src/views/materials/MaterialVersions.vue` | 🔧 增强 | 对比按钮+变更摘要结构化 |
| `frontend/src/components/formula/MaterialTableCore.vue` | 🔧 增强 | 版本标签列 |
| `frontend/src/views/formulas/FormulaForm.vue` | 🔧 增强 | 快照刷新提示条 |
| `frontend/src/api/material.ts` | 🔧 增强 | 新增 compareVersions API |
| `frontend/src/api/formula.ts` | 🔧 增强 | 新增 refreshSnapshots、checkMaterialUpdates API |
| `frontend/src/router/index.ts` | 🔧 增强 | 版本对比路由 |

---

## v2.0 — 回收站 + 批量引用更新

### 2.1 功能清单

| 功能 | 优先级 | 说明 |
|------|:------:|------|
| 原料版本回收站 | P0 | 软删除的版本可恢复 |
| 批量引用更新 | P0 | 将多个配方中的旧版本原料批量切换到新版本 |
| 版本合并/清理 | P1 | 合并冗余版本，清理无引用的历史版本 |
| 版本锁定 | P2 | 锁定特定版本防止被清理 |

### 2.2 原料版本回收站 — 详细设计

#### 2.2.1 交互设计

```
┌─────────────────────────────────────────────────────────────┐
│  原料管理  ·  回收站                                          │
│                                                             │
│  ┌── 筛选 ─────────────────────────────────────────────────┐│
│  │  搜索: [________]   删除时间: [最近7天 ▼]   [查询]       ││
│  └──────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌──────────┬──────────┬──────────┬──────────┬─────────────┐│
│  │  原料名称  │  编码     │  版本     │  删除时间   │  操作      ││
│  ├──────────┼──────────┼──────────┼──────────┼─────────────┤│
│  │  当归     │  DG001   │  v1      │  05-20   │ [恢复] [永久删除] ││
│  │  黄芪     │  HQ002   │  v1      │  05-18   │ [恢复] [永久删除] ││
│  └──────────┴──────────┴──────────┴──────────┴─────────────┘│
│                                                             │
│  已选择 2 项  [批量恢复]  [批量永久删除]                        │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2.2 恢复逻辑

```
恢复操作：
  1. 设置 is_deleted = 0
  2. 如果该 code 下没有 is_latest = 1 的版本 → 设置恢复版本 is_latest = 1
  3. 如果该 code 下已有 is_latest = 1 的版本 → 恢复版本 is_latest = 0（作为历史版本）
  4. 恢复关联的 material_nutrition 数据
```

#### 2.2.3 永久删除逻辑

```
永久删除（仅 admin，二次确认）：
  1. 检查是否被配方引用 → 有引用则拒绝
  2. 物理删除 material_nutrition 关联数据
  3. 物理删除 materials 记录
  4. 不可恢复
```

#### 2.2.4 新增接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/materials/trash` | GET | 回收站列表（is_deleted=1 的记录） |
| `/api/materials/:id/restore` | POST | 恢复单个版本 |
| `/api/materials/:id/permanent-delete` | DELETE | 永久删除（物理删除） |
| `/api/materials/batch-restore` | POST | 批量恢复 |
| `/api/materials/batch-permanent-delete` | POST | 批量永久删除 |

#### 2.2.5 前端组件

```
frontend/src/views/materials/
├── MaterialList.vue              ← 增强：导航入口
├── MaterialTrash.vue             ← 新增：回收站页面
└── MaterialVersions.vue          ← 增强：删除版本入口
```

路由：

```typescript
{
  path: 'materials/trash',
  name: 'MaterialTrash',
  component: () => import('@/views/materials/MaterialTrash.vue'),
  meta: { title: '原料回收站', requiresAuth: true }
}
```

### 2.3 批量引用更新 — 详细设计

#### 2.3.1 交互设计

```
┌─────────────────────────────────────────────────────────────┐
│  原料管理  ·  批量引用更新                                     │
│                                                             │
│  以下配方引用了旧版本的原料，可批量更新到最新版本：               │
│                                                             │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  □  温补气血方                                            ││
│  │     引用旧版本: 当归 v1 → 可更新至 v2                      ││
│  │     影响范围: 营养数据将重新计算                            ││
│  │                                                          ││
│  │  □  四物汤改良方                                          ││
│  │     引用旧版本: 当归 v1, 黄芪 v1 → 可更新至 v2, v2         ││
│  │     影响范围: 营养数据将重新计算                            ││
│  │                                                          ││
│  │  □  当归养血膏                                            ││
│  │     引用旧版本: 当归 v1 → 可更新至 v2                      ││
│  │     影响范围: 营养数据将重新计算                            ││
│  └──────────────────────────────────────────────────────────┘│
│                                                             │
│  已选择 2 个配方                                              │
│  [取消]    [批量更新选中配方]                                   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.2 更新逻辑

```
批量更新流程：
  1. 查询所有引用旧版本原料的配方
  2. 用户选择要更新的配方
  3. 对每个配方：
     a. 遍历 materials_json
     b. 查找引用了旧版本的原料
     c. 查询最新版本的营养数据
     d. 更新 snapshotNutrition 和 materialVersion
     e. 重新计算配方营养成分
  4. 返回更新结果汇总
```

#### 2.3.3 新增接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/materials/:id/affected-formulas` | GET | 查询引用旧版本的配方列表 |
| `/api/materials/batch-update-references` | POST | 批量更新配方中的原料引用 |

**批量更新请求体**：

```json
{
  "materialId": "mat_001",
  "targetVersion": 2,
  "formulaIds": ["f_001", "f_002"],
  "updateNutrition": true
}
```

**批量更新响应**：

```json
{
  "success": true,
  "data": {
    "updatedCount": 2,
    "failedCount": 0,
    "details": [
      {
        "formulaId": "f_001",
        "formulaName": "温补气血方",
        "updatedMaterials": ["当归 v1 → v2"],
        "nutritionRecalculated": true
      },
      {
        "formulaId": "f_002",
        "formulaName": "四物汤改良方",
        "updatedMaterials": ["当归 v1 → v2"],
        "nutritionRecalculated": true
      }
    ]
  }
}
```

### 2.4 版本合并/清理 — 详细设计（P1）

#### 2.4.1 使用场景

当原料版本链过长（如 v1 → v2 → v3 → v4 → v5），且中间版本无配方引用时，可合并清理：

```
清理前:  v1(无引用) → v2(无引用) → v3(有引用) → v4(无引用) → v5(最新)
清理后:  v3(有引用) → v5(最新)

v1, v2, v4 被移入回收站
```

#### 2.4.2 清理规则

| 规则 | 说明 |
|------|------|
| 有引用的版本不清理 | 被配方引用的版本必须保留 |
| 最新版本不清理 | is_latest=1 的版本始终保留 |
| 清理 = 软删除 | 移入回收站，可恢复 |
| 清理后版本号不变 | v3 和 v5 的版本号保持不变 |

#### 2.4.3 新增接口

```
POST /api/materials/:id/cleanup-versions
```

请求体：

```json
{
  "keepReferenced": true,
  "keepLatest": true,
  "dryRun": true
}
```

响应（dryRun=true 时预览，不实际执行）：

```json
{
  "success": true,
  "data": {
    "totalVersions": 5,
    "willKeep": 2,
    "willRemove": 3,
    "removableVersions": [
      { "version": 1, "id": "mat_v1", "reason": "无配方引用" },
      { "version": 2, "id": "mat_v2", "reason": "无配方引用" },
      { "version": 4, "id": "mat_v4", "reason": "无配方引用" }
    ]
  }
}
```

### 2.5 版本锁定 — 详细设计（P2）

#### 2.5.1 使用场景

关键版本的原料（如已用于生产标签的版本）需要锁定，防止被清理或批量更新覆盖。

#### 2.5.2 数据库变更

```sql
ALTER TABLE materials ADD COLUMN is_locked INTEGER NOT NULL DEFAULT 0;
```

#### 2.5.3 锁定规则

| 规则 | 说明 |
|------|------|
| 锁定版本不可被清理 | 即使无引用也不出现在清理列表中 |
| 锁定版本的快照不可被批量更新 | 批量引用更新时跳过锁定版本 |
| 仅 admin 可锁定/解锁 | 权限控制 |

#### 2.5.4 新增接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/materials/:id/lock` | POST | 锁定版本 |
| `/api/materials/:id/unlock` | POST | 解锁版本 |

### 2.6 文件变更清单

| 文件 | 操作 | 说明 |
|------|:----:|------|
| `backend/src/services/materialService.ts` | 🔧 增强 | 新增回收站/恢复/永久删除/批量引用更新/清理/锁定逻辑 |
| `backend/src/controllers/materialController.ts` | 🔧 增强 | 新增回收站相关接口 |
| `backend/src/controllers/formulaController.ts` | 🔧 增强 | 新增批量引用更新接口 |
| `backend/src/routes/materials.ts` | 🔧 增强 | 新增回收站/恢复/永久删除路由 |
| `backend/src/routes/formulas.ts` | 🔧 增强 | 新增批量引用更新路由 |
| `backend/src/scripts/migrations/addIsLockedToMaterials.ts` | ✨ 新增 | is_locked 字段迁移 |
| `frontend/src/views/materials/MaterialTrash.vue` | ✨ 新增 | 回收站页面 |
| `frontend/src/views/materials/MaterialList.vue` | 🔧 增强 | 回收站入口 |
| `frontend/src/views/materials/MaterialVersions.vue` | 🔧 增强 | 锁定/清理操作 |
| `frontend/src/api/material.ts` | 🔧 增强 | 新增回收站/恢复/锁定 API |
| `frontend/src/api/formula.ts` | 🔧 增强 | 新增批量引用更新 API |
| `frontend/src/router/index.ts` | 🔧 增强 | 回收站路由 |

---

## 版本路线图总览

```
MVP (已完成)                    v1.1 (下一步)                   v2.0 (未来)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 版本化核心逻辑               📋 版本对比（双版本 diff）       📋 回收站页面
✅ 用户域隔离                   📋 真实变更摘要                 📋 恢复/永久删除
✅ 版本历史页（基础）            📋 版本列表 UI 增强             📋 批量引用更新
✅ 版本化编辑提示               📋 配方原料版本标签             📋 版本合并/清理
✅ 软删除                       📋 快照刷新提示                 📋 版本锁定
                               📋 快照刷新接口                 
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  后端: 1 service + 1 controller  后端: 增强 2 service + 2 ctrl   后端: 增强 2 service + 2 ctrl
  前端: 1 新页面 + 2 增强         前端: 1 新页面 + 4 增强         前端: 1 新页面 + 3 增强
  测试: 8 用例                   测试: 预计 15+ 用例             测试: 预计 20+ 用例
```

### 依赖关系

```
v1.1 的"快照刷新"依赖 v1.1 的"配方原料版本标签"
v2.0 的"批量引用更新"依赖 v1.1 的"快照刷新接口"
v2.0 的"版本清理"依赖 v2.0 的"回收站"
v2.0 的"版本锁定"独立，可与回收站并行开发
```

### 建议开发顺序

```
v1.1:
  1. 真实变更摘要（后端优先，数据基础）
  2. 版本对比（依赖变更摘要数据）
  3. 配方原料版本标签
  4. 快照刷新提示 + 接口
  5. 版本列表 UI 增强

v2.0:
  1. 回收站（基础功能）
  2. 批量引用更新（依赖 v1.1 的快照刷新）
  3. 版本清理（依赖回收站）
  4. 版本锁定（独立，可并行）
```