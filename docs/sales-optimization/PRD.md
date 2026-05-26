# PRD：销量分析模块优化

## 1. Executive Summary

**Problem Statement**：当前销量模块存在唯一约束不含业务员、后端路由未走 Controller 规范层、重复录入无合并策略、录入入口单一等问题，导致不同业务员无法分别录入同一配方同月销量，重复录入直接报错，数据管理体验差。

**Proposed Solution**：调整数据库唯一约束支持业务员维度、切换后端到 Controller 标准实现、新增重复录入智能合并策略、增加业务员维度录入入口。

**Success Criteria**：

1. 不同业务员可分别录入同一配方同月的销量，互不冲突
2. 同一配方+同一业务员+同一周期重复录入时，提供「累加」或「覆盖」选项，不再直接报错
3. 后端路由切换到 Controller 层，created\_by 取实际用户、period\_end 按周期类型正确计算
4. 销量分析页面、配方详情页面、业务员管理页面均可作为销量录入入口
5. 月份选择器禁止选择未来月份（维持现有行为）

## 2. User Experience & Functionality

### 2.1 User Personas

| 角色        | 说明                          |
| --------- | --------------------------- |
| admin     | 管理员，可查看全部数据，可录入/编辑/删除任意销量记录 |
| formulist | 配方师，仅可操作自己创建的数据             |

### 2.2 User Stories

**US-1：业务员维度销量录入**

> As a admin，I want 从业务员管理页面直接录入某业务员的销量数据，so that 不必先找到配方再录入。

* AC1：业务员列表页每行操作栏新增「录入销量」按钮

* AC2：点击后打开 SalesRecordDrawer，自动选中该业务员关联的配方列表

* AC3：录入成功后刷新业务员列表

**US-2：同一配方不同业务员同月销量**

> As a admin，I want 不同业务员可以分别录入同一配方同月的销量，so that 各业务员的销售贡献独立统计。

* AC1：数据库唯一约束包含 salesman\_id

* AC2：不同业务员录入同一配方同月销量时互不冲突

* AC3：统计排行按 salesman\_id 独立计算

**US-3：重复录入智能合并**

> As a admin，I want 同一配方+同一业务员+同一周期重复录入时，可以选择累加或覆盖，so that 不会因重复录入而报错。

* AC1：录入时检测到已有记录，弹出确认对话框

* AC2：对话框显示已有记录的销量和金额，提供「累加」和「覆盖」两个选项

* AC3：选择「累加」：新销量叠加到已有记录（quantity += 新值，revenue += 新值）

* AC4：选择「覆盖」：用新值替换已有记录

* AC5：后端 API 支持 mergeMode 参数（accumulate / replace）

**US-4：后端路由规范化**

> As a developer，I want 销量路由切换到 Controller 层标准实现，so that 代码规范统一、created\_by 正确记录、period\_end 正确计算。

* AC1：路由注册切换到 salesController

* AC2：created\_by 取 req.user.userId 而非硬编码 "system"

* AC3：period\_end 根据 periodType 正确计算月末/季末/年末

* AC4：返回数据使用 rowsToCamelCase 转换

**US-5：月份选择限制**

> As a admin，I want 录入销量时不能选择未来月份，so that 避免录入无效的预测数据。

* AC1：月份选择器 disable-date 禁止未来月份（维持现有行为）

* AC2：后端也校验 periodStart 不得晚于当前月份

### 2.3 Non-Goals

* 不做销量预测/趋势分析功能

* 不做销量审批流程

* 不做销量数据导入（Excel 批量导入）

* 不修改销量分析页面的展示逻辑和图表

## 3. Technical Specifications

### 3.1 Architecture Overview

```
前端入口（3个）                    后端 API
┌─────────────────┐
│ SalesAnalysis   │──┐
│ (销量分析页)     │  │
└─────────────────┘  │     ┌──────────────────┐     ┌──────────────────┐
┌─────────────────┐  ├────▶│ SalesRecordDrawer │────▶│ POST /api/sales  │
│ FormulaDetail   │──┤     │ (通用录入组件)     │     │ PUT /api/sales/:id│
│ (配方详情页)     │  │     └──────────────────┘     └────────┬─────────┘
└─────────────────┘  │                                        │
┌─────────────────┐  │                                        ▼
│ SalesmanList    │──┘                              ┌──────────────────┐
│ (业务员管理页)   │                                  │ salesController  │
└─────────────────┘                                  │ (标准Controller) │
                                                     └──────────────────┘
```

### 3.2 Integration Points

* **认证**：所有销量 API 需要 authMiddleware，created\_by 从 req.user 获取

* **数据库**：formula\_sales 表唯一约束变更，需迁移脚本

* **前端组件**：SalesRecordDrawer 增加 mergeMode 逻辑

### 3.3 Security & Privacy

* 销量数据遵循现有数据隔离规则（admin 全部可见，formulist 仅见自己创建的）

* 重复录入合并需前端确认，防止误操作

## 4. Risks & Roadmap

### 4.1 Phased Rollout

| 阶段 | 内容                          | 优先级 |
| -- | --------------------------- | --- |
| P0 | 数据库唯一约束迁移 + 后端切换 Controller | 高   |
| P0 | 重复录入智能合并（前后端）               | 高   |
| P1 | 业务员维度录入入口                   | 中   |
| P1 | 后端 periodStart 校验           | 中   |

### 4.2 Technical Risks

| 风险                         | 影响              | 缓解措施                                  |
| -------------------------- | --------------- | ------------------------------------- |
| 唯一约束变更需迁移现有数据              | 若现有数据违反新约束则迁移失败 | 迁移脚本先检测冲突数据，提示人工处理                    |
| Controller 切换可能改变 API 响应格式 | 前端解析失败          | Controller 使用 rowsToCamelCase，确保字段名一致 |

