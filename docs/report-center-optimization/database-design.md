# 报告中心功能优化 - 数据库设计文档

## 一、变更概述

本次优化对 `reports` 表新增 `period_key` 字段，用于支持周期唯一性校验功能。

---

## 二、变更详情

### 2.1 reports 表新增字段

```sql
ALTER TABLE reports ADD COLUMN period_key TEXT;

CREATE INDEX idx_reports_period_key ON reports(type, created_by, period_key);
```

### 2.2 字段说明

| 字段名 | 类型 | 可空 | 默认值 | 说明 |
|--------|------|------|--------|------|
| period_key | TEXT | 是 | NULL | 周期唯一标识 |

---

## 三、period_key 生成规则

### 3.1 周报（weekly）

格式：`YYYY-Www`

- `YYYY`：年份（4位数字）
- `W`：固定字符，表示周
- `ww`：ISO周数（2位数字，不足前补0）

**示例**：
- 2026年第22周：`2026-W22`
- 2026年第1周：`2026-W01`

**计算规则**：
- ISO 8601 标准
- 每周从**周一**开始，到**周日**结束
- 第1周：包含该年1月4日的那个周

### 3.2 月报（monthly）

格式：`YYYY-MM`

- `YYYY`：年份（4位数字）
- `MM`：月份（2位数字，不足前补0）

**示例**：
- 2026年5月：`2026-05`
- 2026年12月：`2026-12`

---

## 四、唯一性约束

### 4.1 约束条件

```sql
-- 同一用户、同一报告类型、同一周期只能有一条记录
WHERE type = ? AND created_by = ? AND period_key = ?
```

### 4.2 索引设计

```sql
CREATE INDEX idx_reports_period_key ON reports(type, created_by, period_key);
```

该复合索引支持以下查询场景：
- 按报告类型查询
- 按创建者查询
- 按周期查询
- 按类型+创建者+周期组合查询（唯一性校验）

---

## 五、数据迁移

### 5.1 迁移脚本

数据库初始化时通过 `ensureColumn` 函数自动添加字段：

```typescript
// backend/src/config/database-better-sqlite3.ts
ensureColumn(dbInstance, "reports", "period_key", "TEXT", "NULL");
try {
  dbInstance.exec("CREATE INDEX IF NOT EXISTS idx_reports_period_key ON reports(type, created_by, period_key)");
} catch (_err) {}
```

### 5.2 迁移时机

- **新数据库**：表创建时自动包含该字段
- **已有数据库**：通过 `runAutoMigrations` 函数自动检测并添加字段

---

## 六、后端代码实现

### 6.1 ISO 周次计算工具

**文件**：`backend/src/utils/isoWeekUtils.ts`

```typescript
export function getISOWeekInfo(dateStr: string): ISOWeekInfo {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const daysSinceYearStart = Math.floor(
    (date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000)
  );
  const dayOfWeek = startOfYear.getDay() || 7;
  const week = Math.ceil((daysSinceYearStart + dayOfWeek) / 7);
  return { year, week: Math.min(week, 53) };
}

export function getISOWeekKey(dateStr: string): string {
  const { year, week } = getISOWeekInfo(dateStr);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function getMonthKey(dateStr: string): string {
  return dateStr.substring(0, 7);
}
```

### 6.2 周次计算示例

| 日期 | ISO 周数 | period_key |
|------|---------|------------|
| 2026-05-25（周一） | 第22周 | 2026-W22 |
| 2026-05-31（周日） | 第22周 | 2026-W22 |
| 2026-06-01（周一） | 第23周 | 2026-W23 |
| 2025-12-29（周一） | 2026年第1周 | 2026-W01 |
| 2026-01-04（周日） | 2026年第1周 | 2026-W01 |

---

## 七、前端工具

**文件**：`frontend/src/utils/isoWeekUtils.ts`

与后端保持一致的 ISO 周次计算工具，供前端组件使用。

---

## 八、注意事项

1. **周期边界**：跨年的周（如2025年12月底属于2026年第1周）需正确处理
2. **闰年**：闰年的周数计算需确保准确
3. **时区**：日期计算使用本地时区，与后端保持一致
4. **数据迁移**：已有数据可通过后台任务批量补充 `period_key` 值
