# PRD：原料筛选互斥条件功能

## 1. Executive Summary

**Problem Statement**：快速配方原料池的高级筛选中，同一维度（性状/口感）的多选选项之间缺少互斥关系约束。用户可以同时选中"颗粒"和"膏状"等互斥选项，导致筛选结果无意义（不存在同时具有这两种性状的原料），降低配方师筛选效率。

**Proposed Solution**：引入互斥规则数据模型，在筛选 UI 中自动处理互斥关系——选中 A 时自动取消互斥的 B，同时将互斥选项显示为禁用状态并附带提示，让用户清晰感知互斥约束。

**Success Criteria**：
1. 互斥规则可由管理员在枚举管理页面配置（CRUD）
2. 筛选时选中某选项，其互斥选项自动取消选中并变为禁用态
3. 禁用选项 hover 时显示互斥原因提示
4. 互斥规则变更后，前端筛选行为实时生效（无需刷新页面）
5. 种子数据预置已知互斥规则（性状 4 条 + 口感 4 条）

---

## 2. User Experience & Functionality

### 2.1 User Personas

| 角色 | 场景 |
|------|------|
| **配方师（formulist）** | 在快速配方面板筛选原料时，期望筛选条件符合业务逻辑，不会出现无意义的组合 |
| **管理员（admin）** | 在系统配置页面管理互斥规则，新增/编辑/删除互斥关系 |

### 2.2 User Stories

**US-1：筛选时自动处理互斥**
> As a 配方师, I want to 在高级筛选中点击某个选项时，与它互斥的选项自动取消并变为禁用态, so that 我不会误选互斥组合，筛选结果始终有意义。

**Acceptance Criteria**：
- 选中选项 A 后，与 A 互斥的所有选项 B 立即从筛选数组中移除
- 互斥选项 B 显示为灰色禁用态（`opacity: 0.4` + `cursor: not-allowed`）
- 禁用选项 hover 时显示 tooltip：`"与已选「A」互斥"`
- 取消选中 A 后，互斥选项 B 恢复可选状态
- 如果 A 和 B 互斥，选中 B 时同样自动取消 A

**US-2：管理员配置互斥规则**
> As a 管理员, I want to 在枚举管理页面配置互斥规则, so that 当业务规则变化时我可以自行调整，无需开发人员改代码。

**Acceptance Criteria**：
- 在枚举管理页面左侧导航新增"互斥规则"Tab
- 可新增互斥规则：选择分类 → 选择选项 A → 选择选项 B → 保存
- 可删除互斥规则
- 同一分类下的两个选项才能建立互斥关系
- 不允许自互斥（A ↔ A）
- 不允许重复规则（A ↔ B 和 B ↔ A 视为同一条）
- 删除枚举选项时，关联的互斥规则自动级联删除

**US-3：预置互斥种子数据**
> As a 管理员, I want to 系统初始化时预置已知互斥规则, so that 我不需要手动配置常见互斥关系。

**Acceptance Criteria**：
- 种子脚本预置以下互斥规则：

| 分类 | 选项 A | 选项 B | 业务原因 |
|------|--------|--------|---------|
| 性状 | 颗粒 | 膏状 | 物理形态互斥 |
| 性状 | 颗粒 | 粉末 | 颗粒≠粉末态 |
| 性状 | 液体 | 粉末 | 液态≠粉态 |
| 性状 | 液体 | 块状 | 液态≠固态 |
| 性状 | 膏状 | 粉末 | 膏态≠粉态 |
| 性状 | 膏状 | 块状 | 膏态≠固态 |
| 性状 | 膏状 | 澄清 | 膏状不透明 |
| 口感 | 甘味 | 咸味 | 甘咸互斥 |
| 口感 | 酸味 | 咸味 | 酸咸互斥 |
| 口感 | 清凉感 | 辛味 | 清凉≠辛辣 |
| 口感 | 滑润感 | 粗糙感 | 滑≠糙 |

### 2.3 Non-Goals

- 不处理跨维度互斥（如"性状=液体"与"口感=颗粒感"的互斥），当前业务无此需求
- 不处理功效（efficacy）维度的互斥，当前业务无此需求
- 不处理"三选一"等更复杂的互斥组（仅处理两两互斥）

---

## 3. Technical Specifications

### 3.1 Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Frontend                          │
│                                                     │
│  MaterialPool.vue                                   │
│  ├─ toggleMultiFilter() → 互斥自动取消逻辑          │
│  ├─ getExcludedValues() → 计算当前禁用选项           │
│  └─ tag-btn--disabled 样式 + tooltip 提示            │
│                                                     │
│  EnumManage.vue                                     │
│  └─ 新增"互斥规则"Tab → CRUD 互斥规则               │
│                                                     │
│  enumStore                                          │
│  └─ exclusionMap: Map<string, Set<string>>          │
│     (从 API 加载互斥规则，按 category 分组)          │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    Backend API                       │
│                                                     │
│  GET    /api/enums/exclusions        获取全部互斥规则 │
│  POST   /api/enums/exclusions        新增互斥规则    │
│  DELETE /api/enums/exclusions/:id    删除互斥规则    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                    Database                          │
│                                                     │
│  enum_exclusions 表                                 │
│  ├─ id (PK, UUID)                                   │
│  ├─ category (appearance | taste)                   │
│  ├─ value_a (选项A的value)                           │
│  ├─ value_b (选项B的value)                           │
│  ├─ created_at                                      │
│  └─ updated_at                                      │
│                                                     │
│  约束：UNIQUE(category, value_a, value_b)           │
│  约束：value_a < value_b（字典序，防重复）           │
└─────────────────────────────────────────────────────┘
```

### 3.2 Database Design

**新增表：`enum_exclusions`**

```sql
CREATE TABLE IF NOT EXISTS `enum_exclusions` (
  `id` TEXT PRIMARY KEY,
  `category` TEXT NOT NULL CHECK(category IN ('appearance', 'taste')),
  `value_a` TEXT NOT NULL,
  `value_b` TEXT NOT NULL,
  `created_at` TEXT NOT NULL DEFAULT (datetime('now')),
  `updated_at` TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(`category`, `value_a`, `value_b`),
  CHECK(`value_a` < `value_b`)
);

CREATE INDEX IF NOT EXISTS `idx_exclusion_category` ON `enum_exclusions`(`category`);
CREATE INDEX IF NOT EXISTS `idx_exclusion_value_a` ON `enum_exclusions`(`category`, `value_a`);
CREATE INDEX IF NOT EXISTS `idx_exclusion_value_b` ON `enum_exclusions`(`category`, `value_b`);
```

**设计说明**：
- `category` 限制为 `appearance` 和 `taste`（当前业务仅需这两个维度）
- `value_a < value_b` 约束确保 A↔B 和 B↔A 不会重复存储
- 外键约束通过应用层逻辑保证（删除枚举选项时级联删除关联互斥规则）
- `value_a`/`value_b` 存储 `enum_options.value`（与原料 JSON 字段中的值一致）

### 3.3 API Design

#### GET /api/enums/exclusions

获取全部互斥规则，按分类分组返回。

**Response**：
```json
{
  "success": true,
  "data": {
    "appearance": [
      { "id": "xxx", "category": "appearance", "valueA": "颗粒", "valueB": "膏状", "labelA": "颗粒", "labelB": "膏状" },
      { "id": "xxx", "category": "appearance", "valueA": "液体", "valueB": "粉末", "labelA": "液体", "labelB": "粉末" }
    ],
    "taste": [
      { "id": "xxx", "category": "taste", "valueA": "甘味", "valueB": "咸味", "labelA": "甘味", "labelB": "咸味" }
    ]
  }
}
```

#### POST /api/enums/exclusions

新增互斥规则（仅 admin）。

**Request Body**：
```json
{
  "category": "appearance",
  "valueA": "颗粒",
  "valueB": "膏状"
}
```

**Validation**：
- `category`：必填，必须为 `appearance` 或 `taste`
- `valueA`：必填，必须存在于 `enum_options` 表且 `is_active = 1`
- `valueB`：必填，必须存在于 `enum_options` 表且 `is_active = 1`
- `valueA` ≠ `valueB`
- 不允许重复规则

**Response**：
```json
{
  "success": true,
  "data": { "id": "xxx", "category": "appearance", "valueA": "颗粒", "valueB": "膏状" }
}
```

#### DELETE /api/enums/exclusions/:id

删除互斥规则（仅 admin）。

**Response**：
```json
{
  "success": true,
  "data": { "deletedId": "xxx" }
}
```

### 3.4 Frontend Data Flow

#### 3.4.1 互斥规则加载

```
App 启动 / 枚举 Store 初始化
  ↓
enumStore.fetchEnums() 同时加载互斥规则
  ↓
GET /api/enums/exclusions → exclusionMap
  ↓
exclusionMap 结构：Map<category, Map<value, Set<excludedValue>>>
  例：exclusionMap.get("appearance").get("颗粒") → Set(["膏状", "粉末"])
```

#### 3.4.2 筛选交互流程

```
用户点击选项 A
  ↓
toggleMultiFilter('appearance', '颗粒')
  ↓
1. 检查 A 是否已选中
   - 已选中 → 取消选中，恢复所有互斥选项为可选
   - 未选中 → 选中 A
2. 选中 A 后：
   a. 查询 exclusionMap 获取 A 的互斥选项集合
   b. 从 poolFilter.appearance 中移除所有互斥选项
   c. 标记互斥选项为禁用态
3. 禁用选项 hover → tooltip "与已选「颗粒」互斥"
```

#### 3.4.3 禁用状态计算

```typescript
const disabledValues = computed(() => {
  const result: Record<string, Set<string>> = { appearance: new Set(), taste: new Set(), efficacy: new Set() };
  for (const field of ["appearance", "taste"] as const) {
    const selected = store.poolFilter[field];
    for (const val of selected) {
      const excluded = enumStore.getExcludedValues(field, val);
      for (const ex of excluded) {
        result[field].add(ex);
      }
    }
  }
  return result;
});
```

### 3.5 EnumManage.vue 扩展

在左侧导航新增"互斥规则"Tab，右侧展示互斥规则卡片列表：

- 卡片显示：`「选项A」↔「选项B」`，标注分类标签
- 新增弹窗：选择分类 → 选择选项 A（下拉）→ 选择选项 B（下拉）→ 保存
- 删除：`t-popconfirm` 二次确认
- 选项 A/B 的下拉选项来自当前分类的活跃枚举值

### 3.6 Security & Privacy

- 互斥规则 CRUD 接口需 `authMiddleware` + `requirePermission("admin")`
- 查询接口需 `authMiddleware`（所有登录用户可读）
- 输入校验：`validateBody` 中间件校验 category/valueA/valueB
- 防注入：参数化查询

---

## 4. Risks & Roadmap

### 4.1 Phased Rollout

| Phase | 内容 | 状态 |
|-------|------|------|
| **v1.0** | 数据库表 + 后端 API + 前端筛选互斥逻辑 + 种子数据 | 本次实现 |
| **v1.1** | EnumManage 互斥规则管理 UI | 本次实现 |
| **v2.0** | 功效维度互斥支持（需业务确认规则） | 待定 |

### 4.2 Technical Risks

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 枚举选项删除后互斥规则残留 | 孤儿数据 | 删除枚举选项时级联删除关联互斥规则 |
| 互斥规则与枚举选项值不一致 | 筛选逻辑异常 | 新增规则时校验 valueA/valueB 必须存在于活跃枚举 |
| 大量互斥规则影响性能 | 前端计算慢 | 互斥规则数量有限（<100条），Map 查询 O(1)，无性能风险 |

---

## 5. Implementation Checklist

### 后端
- [ ] 迁移脚本：创建 `enum_exclusions` 表
- [ ] 种子脚本：预置互斥规则数据
- [ ] Service 层：`exclusionService.ts`（CRUD + 校验）
- [ ] Controller 层：`exclusionController.ts`
- [ ] Route 层：`exclusions.ts`（注册到 `/enums/exclusions`）
- [ ] `enumService.deleteEnumOption` 增加级联删除互斥规则逻辑

### 前端
- [ ] API 层：`enum.ts` 增加互斥规则接口
- [ ] Store 层：`enum.ts` 增加 `exclusionMap` + `getExcludedValues()`
- [ ] MaterialPool.vue：互斥筛选逻辑 + 禁用态 UI + tooltip
- [ ] EnumManage.vue：新增"互斥规则"Tab + CRUD UI
- [ ] 类型定义更新
