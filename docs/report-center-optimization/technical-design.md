# 报告中心功能优化 - 技术方案文档

## 一、架构设计

### 1.1 模块划分

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端模块 (Vue 3)                          │
├─────────────────────────────────────────────────────────────────┤
│  ReportCenter.vue          - 报告中心主页面                       │
│  ├── WeekSelectDrawer.vue  - 周报生成抽屉（新增）                  │
│  └── ExportFormatDialog.vue - 导出格式选择弹窗（新增）             │
├─────────────────────────────────────────────────────────────────┤
│  stores/report.ts          - 报告状态管理                         │
│  ├── fetchReports()         - 获取报告列表（带权限过滤）           │
│  ├── checkPeriodExists()    - 检查周期是否已生成（新增）           │
│  └── batchExport()          - 批量导出（新增）                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        后端模块 (Express)                        │
├─────────────────────────────────────────────────────────────────┤
│  reportController.ts                                            │
│  ├── getReportList()       - 获取报告列表（权限过滤已存在）        │
│  ├── generateReport()      - 生成报告（增加周期唯一性校验）        │
│  └── checkPeriodUniqueness() - 周期唯一性校验（新增）              │
├─────────────────────────────────────────────────────────────────┤
│  routes/reports.ts          - API路由                           │
│  └── POST /check-period     - 检查周期是否已存在（新增）           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 技术依赖

| 依赖 | 版本 | 用途 | 状态 |
|------|------|------|------|
| xlsx | ^0.18.5 | Excel导出 | 已有 |
| pdfkit | ^0.18.0 | PDF导出 | 已有 |
| TDesign Vue Next | ^1.9.6 | UI组件库 | 已有 |

---

## 二、功能模块设计

### 2.1 功能一：ISO周次计算组件

**文件**：`frontend/src/components/WeekSelectDrawer.vue`（新建）

**功能**：提供月份+周次选择器，生成正确的日期范围。

**组件Props**：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | boolean | false | 抽屉显示状态 |
| type | 'weekly' \| 'monthly' | 'weekly' | 报告类型 |

**组件Events**：

| 事件名 | 参数 | 说明 |
|--------|------|------|
| confirm | { periodStart, periodEnd, type } | 确认选择 |
| cancel | - | 取消操作 |

---

### 2.2 功能二：周期唯一性校验

**文件**：`backend/src/controllers/reportController.ts`（修改）

**新增校验逻辑**：

```typescript
// 在 generateReport 函数开头添加校验
export async function generateReport(req: any, res: Response) {
  const { type, periodStart, periodEnd } = req.body;
  const userId = req.user.userId;
  const userRole = await getUserRole(userId);

  if (userRole !== "admin") {
    return res.status(403).json({ success: false, message: "仅管理员可生成报告" });
  }

  // 周期唯一性校验（新增）
  const exists = await checkPeriodUniqueness(type, periodStart, periodEnd, userId);
  if (exists) {
    return res.status(409).json({
      success: false,
      message: type === 'weekly'
        ? "该周期的周报已存在，请勿重复生成"
        : "该月份的月报已存在，请勿重复生成"
    });
  }

  // ... 后续逻辑
}
```

**数据库变更**：

```sql
-- 新增 period_key 字段用于周期唯一性校验
ALTER TABLE reports ADD COLUMN period_key TEXT;
CREATE INDEX idx_reports_period_key ON reports(type, created_by, period_key);
```

---

### 2.3 功能三：导出格式选择弹窗

**文件**：`frontend/src/components/ExportFormatDialog.vue`（新建）

**功能**：单个报告导出时选择格式。

**组件Props**：

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible | boolean | false | 弹窗显示状态 |
| reportTitle | string | "" | 报告标题 |

**组件Events**：

| 事件名 | 参数 | 说明 |
|--------|------|------|
| confirm | format ('pdf' \| 'excel') | 确认导出 |
| update:visible | boolean | 关闭弹窗 |

---

### 2.4 功能四：批量导出

**文件**：`frontend/src/stores/report.ts`（修改）

```typescript
const batchExport = async (reportIds: string[], format: 'excel' | 'pdf') => {
  try {
    MessagePlugin.warning('正在准备导出文件...');

    if (format === 'excel') {
      // 批量Excel导出：多个报告合并为一个Excel文件（多Sheet）
      const response = await http.post(
        '/reports/batch-export/excel',
        { reportIds },
        { responseType: 'blob' }
      );

      const blob = new Blob([response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `批量报告_${formatDate(new Date())}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      MessagePlugin.success(`成功导出 ${reportIds.length} 份报告`);
    } else {
      // PDF批量导出：逐个下载
      for (const id of reportIds) {
        await exportPdf(id);
      }
      MessagePlugin.success(`成功导出 ${reportIds.length} 份PDF报告`);
    }
  } catch (error) {
    console.error('批量导出失败:', error);
    MessagePlugin.error('批量导出失败');
  }
};
```

---

## 三、数据流设计

### 3.1 报告生成数据流

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   前端选择   │     │   周期唯一性校验  │     │   报告生成       │
│  月份+周次   │────▶│  POST /check     │────▶│  POST /generate  │
│              │     │    -period       │     │                  │
└──────────────┘     └─────────────────┘     └──────────────────┘
                            │
                            ▼
                     周期已存在 → 返回409错误
                     周期不存在 → 允许生成
```

### 3.2 权限过滤数据流

```
┌──────────────┐     ┌─────────────────┐     ┌──────────────────┐
│   用户登录   │     │   获取角色       │     │   数据过滤       │
│  获取Token   │────▶│  admin/formulist │────▶│  SQL WHERE条件   │
│              │     │                 │     │                  │
└──────────────┘     └─────────────────┘     └──────────────────┘
                                                  │
                                                  ▼
                                    ┌──────────────────────────┐
                                    │  formulist:              │
                                    │  (created_by = ? OR      │
                                    │   status = 'published')   │
                                    │                          │
                                    │  admin: 无过滤           │
                                    └──────────────────────────┘
```

---

## 四、文件变更清单

### 4.1 新建文件

| 文件路径 | 说明 |
|---------|------|
| `frontend/src/components/WeekSelectDrawer.vue` | 月份+周次选择抽屉组件 |
| `frontend/src/components/ExportFormatDialog.vue` | 导出格式选择弹窗组件 |
| `frontend/src/utils/isoWeekUtils.ts` | ISO周次计算工具函数 |
| `backend/src/utils/isoWeekUtils.ts` | 后端ISO周次计算工具函数 |

### 4.2 修改文件

| 文件路径 | 修改内容 |
|---------|---------|
| `frontend/src/views/reports/ReportCenter.vue` | 集成WeekSelectDrawer，修改生成按钮逻辑 |
| `frontend/src/stores/report.ts` | 新增batchExport、checkPeriodExists方法 |
| `frontend/src/api/report.ts` | 新增checkPeriodExists、batchExportExcel API |
| `backend/src/controllers/reportController.ts` | 增加周期唯一性校验、checkPeriodExists、batchExportExcel |
| `backend/src/routes/reports.ts` | 新增check-period、batch-export/excel路由 |
| `backend/src/utils/reportExcelExporter.ts` | 新增批量导出函数 |
| `backend/src/config/database-better-sqlite3.ts` | 新增period_key字段迁移 |

---

## 五、测试策略

| 测试用例 | 测试内容 |
|---------|---------|
| ISO周次计算 | 验证跨年周次、月末周次计算正确 |
| 周期唯一性 | 验证重复生成报告被正确拦截 |
| 权限过滤 | 验证配方师无法查看他人报告 |
| 导出功能 | 验证PDF/Excel格式正确 |
| 批量导出 | 验证多报告合并导出 |
