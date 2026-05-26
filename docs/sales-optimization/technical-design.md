# 技术方案：销量分析模块优化

## 1. 架构变更概览

### 1.1 当前架构问题

| 问题 | 现状 | 目标 |
|------|------|------|
| 后端路由 | `routes/sales.ts` 内联 SQL，未走 Controller | 切换到 `salesController.ts` |
| 唯一约束 | `UNIQUE(formula_id, period_type, period_start)` | `UNIQUE(formula_id, salesman_id, period_type, period_start)` |
| 重复录入 | 直接报 400 错误 | 智能合并（累加/覆盖） |
| 录入入口 | 销量分析页 + 配方详情页 | 新增业务员管理页入口 |
| created_by | 硬编码 "system" | 取 req.user.userId |
| period_end | 等于 period_start | 按周期类型计算 |

### 1.2 变更范围

```
backend/
├── src/
│   ├── config/
│   │   └── database-better-sqlite3.ts   -- 修改建表 DDL（唯一约束）
│   ├── controllers/
│   │   └── salesController.ts           -- 修改（增加 mergeMode 逻辑）
│   ├── routes/
│   │   ├── index.ts                     -- 修改（切换到 controller 路由）
│   │   └── sales.ts                     -- 重写（改用 controller）
│   ├── middleware/
│   │   └── validate.ts                  -- 新增销量录入验证规则
│   └── scripts/migrations/
│       └── addSalesmanIdToSalesUnique.ts -- 新增迁移脚本
frontend/
├── src/
│   ├── components/
│   │   └── SalesRecordDrawer.vue        -- 修改（增加合并确认逻辑）
│   ├── api/
│   │   └── sales.ts                     -- 修改（createSale 增加 mergeMode 参数）
│   ├── stores/
│   │   └── sales.ts                     -- 修改（createSale 传参调整）
│   └── views/
│       └── sales/
│           └── SalesAnalysis.vue        -- 微调（适配新响应格式）
```

## 2. 数据库变更

### 2.1 唯一约束迁移

**迁移脚本**：`addSalesmanIdToSalesUnique.ts`

```sql
-- Step 1: 检测冲突数据
SELECT formula_id, period_type, period_start, COUNT(*) as cnt
FROM formula_sales
GROUP BY formula_id, period_type, period_start
HAVING cnt > 1;

-- Step 2: 如有冲突，合并为按 salesman_id 最小的记录保留
-- （实际场景中不太可能有冲突，因为旧约束已保证唯一）

-- Step 3: 删除旧约束，创建新约束
DROP INDEX IF EXISTS idx_fs_unique;
CREATE UNIQUE INDEX idx_fs_unique ON formula_sales(formula_id, salesman_id, period_type, period_start);
```

### 2.2 DDL 变更

```sql
-- 旧
UNIQUE(formula_id, period_type, period_start)

-- 新
UNIQUE(formula_id, salesman_id, period_type, period_start)
```

## 3. 后端变更

### 3.1 路由切换

**routes/sales.ts** 重写为标准 Controller 路由：

```typescript
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  getSalesList, getSalesByFormula, getSalesStats,
  createSale, updateSale, deleteSale
} from "../controllers/salesController.js";

export const salesRoutes = Router();

salesRoutes.get("/", authMiddleware, getSalesList);
salesRoutes.get("/stats", authMiddleware, getSalesStats);
salesRoutes.get("/formula/:formulaId", authMiddleware, getSalesByFormula);
salesRoutes.post("/", authMiddleware, createSale);
salesRoutes.put("/:id", authMiddleware, updateSale);
salesRoutes.delete("/:id", authMiddleware, deleteSale);
```

### 3.2 Controller 变更

**salesController.ts - createSale** 增加 mergeMode 逻辑：

```typescript
export async function createSale(req: any, res: Response) {
  const { formulaId, salesmanId, periodType, periodStart, quantity, revenue, notes, mergeMode } = req.body;
  const userId = req.user.userId;
  const periodEnd = calcPeriodEnd(periodStart, periodType || 'monthly');

  // 校验 periodStart 不得晚于当前月份
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  if (periodStart > currentMonth) {
    return res.status(400).json({ success: false, message: "不能录入未来月份的销量数据", code: "VALIDATION_ERROR" });
  }

  // 检测重复记录（新约束维度）
  const [existing] = await query(
    "SELECT * FROM formula_sales WHERE formula_id = ? AND salesman_id = ? AND period_type = ? AND period_start = ?",
    [formulaId, salesmanId, periodType || 'monthly', periodStart]
  );

  if (existing && existing.length > 0) {
    const existingRecord = existing[0];

    if (mergeMode === 'accumulate') {
      // 累加模式
      const newQty = (existingRecord.quantity || 0) + (quantity || 0);
      const newRev = (existingRecord.revenue || 0) + (revenue || 0);
      await query(
        "UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?",
        [newQty, newRev, notes || existingRecord.notes, now(), existingRecord.id]
      );
      const [updated] = await query("SELECT * FROM formula_sales WHERE id = ?", [existingRecord.id]);
      return res.json(success(rowToCamelCase(updated[0]), "销量数据已累加合并"));
    }

    if (mergeMode === 'replace') {
      // 覆盖模式
      await query(
        "UPDATE formula_sales SET quantity = ?, revenue = ?, notes = ?, updated_at = ? WHERE id = ?",
        [quantity || 0, revenue || 0, notes || existingRecord.notes, now(), existingRecord.id]
      );
      const [updated] = await query("SELECT * FROM formula_sales WHERE id = ?", [existingRecord.id]);
      return res.json(success(rowToCamelCase(updated[0]), "销量数据已覆盖更新"));
    }

    // 未指定 mergeMode，返回 409 提示前端让用户选择
    return res.status(409).json({
      success: false,
      message: "该配方在此周期已有销量记录",
      code: "DUPLICATE_ENTRY",
      data: rowToCamelCase(existingRecord)
    });
  }

  // 无重复，正常创建
  // ...原有创建逻辑
}
```

### 3.3 请求验证规则

```typescript
const saleCreateSchema = {
  formulaId: { type: 'string', required: true },
  salesmanId: { type: 'string', required: true },
  periodType: { type: 'string', required: true, enum: ['monthly', 'quarterly', 'yearly'] },
  periodStart: { type: 'string', required: true },
  quantity: { type: 'number', required: true, min: 0 },
  revenue: { type: 'number', required: true, min: 0 },
  notes: { type: 'string', required: false },
  mergeMode: { type: 'string', required: false, enum: ['accumulate', 'replace'] },
};
```

## 4. 前端变更

### 4.1 SalesRecordDrawer.vue 变更

**新增合并确认对话框**：

当 createSale 返回 409 (DUPLICATE_ENTRY) 时：
1. 显示确认对话框，展示已有记录信息
2. 提供「累加合并」和「覆盖更新」两个按钮
3. 用户选择后，携带 mergeMode 参数重新提交

```
┌──────────────────────────────────────┐
│  ⚠️ 检测到已有销量记录                │
│                                      │
│  配方：人参养荣汤                     │
│  业务员：张三                         │
│  周期：2026年5月（月度）              │
│  已有销量：150 件 / ¥12.5万          │
│  本次录入：80 件 / ¥6.2万            │
│                                      │
│  请选择处理方式：                     │
│                                      │
│  [累加合并]  累加后：230件 / ¥18.7万  │
│  [覆盖更新]  覆盖后：80件 / ¥6.2万    │
│  [取 消]                             │
└──────────────────────────────────────┘
```

### 4.2 API 层变更

**sales.ts - createSale** 增加 mergeMode 参数：

```typescript
create(data: SaleCreateParams & { mergeMode?: 'accumulate' | 'replace' }) {
  return http.post('/sales', data);
}
```

### 4.3 业务员管理页入口

在业务员列表页（SalesmanList.vue）每行操作栏新增「录入销量」按钮，点击后：
1. 打开 SalesRecordDrawer
2. 传入 salesmanId，自动筛选该业务员关联的配方
3. SalesRecordDrawer 需支持 salesmanId prop（新增）

### 4.4 SalesRecordDrawer Props 扩展

```typescript
const props = defineProps<{
  visible: boolean
  formulaId?: string       // 已有：预选配方
  salesmanId?: string      // 新增：预选业务员
  editRecord?: SaleRecord | null
}>()
```

当传入 salesmanId 时：
- 配方选择器只显示该业务员关联的配方
- 业务员字段自动填充且不可修改

## 5. 兼容性考虑

### 5.1 API 响应格式

Controller 层使用 `rowsToCamelCase` 转换字段名，需确保与前端现有字段名一致：

| 数据库字段 | Controller 返回 | 前端期望 |
|-----------|----------------|---------|
| formula_name | formulaName | formulaName ✅ |
| formula_code | formulaCode | formulaCode ✅ |
| salesman_name | salesmanName | salesmanName ✅ |
| period_type | periodType | periodType ✅ |
| period_start | periodStart | periodStart ✅ |
| period_end | periodEnd | periodEnd ✅ |

### 5.2 分页响应格式

Controller 使用 `successWithPagination`，格式为：

```json
{
  "success": true,
  "data": {
    "list": [...],
    "pagination": { "page": 1, "pageSize": 10, "total": 100 }
  }
}
```

前端 Store 已按此格式解析，无需调整。

### 5.3 Stats 响应格式

Controller 的 `getSalesStats` 返回格式与当前路由一致，字段名需确保 camelCase。
