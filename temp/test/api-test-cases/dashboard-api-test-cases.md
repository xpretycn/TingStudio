# 仪表盘 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-DASH-20260607-001 |
| 路由文件 | backend/src/routes/dashboard.ts |
| 控制器文件 | backend/src/controllers/dashboardController.ts |
| 端点数 | 3 |
| 测试用例数 | 54 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| B01 | GET | /api/dashboard/stats | authMiddleware | 获取仪表盘统计数据 |
| B02 | GET | /api/dashboard/activity | authMiddleware | 获取最近活动记录 |
| B03 | GET | /api/dashboard/sales-trend | authMiddleware | 获取销量趋势数据 |

## 二、测试用例

### B01 GET /api/dashboard/stats — 获取仪表盘统计数据

**业务逻辑**：
- admin用户：查询所有配方数、所有原料数、本月所有销量统计
- formulist用户：仅查询自己创建的配方数、原料数、本月销量统计
- 销量统计从formula_sales表查询，关联formulas表
- 返回formulas、materials、sales（quantity/revenue/formulaCount）、pendingTasks(固定0)

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| B01-P01 | 正向流程 | admin获取仪表盘统计 | admin用户已登录，数据库有配方、原料、销售数据 | GET /api/dashboard/stats | 200，{success:true, data:{formulas:N, materials:N, sales:{quantity, revenue, formulaCount}, pendingTasks:0}} |
| B01-P02 | 正向流程 | formulist获取仪表盘统计 | formulist用户已登录，有自己创建的数据 | GET /api/dashboard/stats | 200，data.formulas仅为自己创建的数量 |
| B01-P03 | 正向流程 | 无数据时获取统计 | 数据库无配方、原料、销售数据 | GET /api/dashboard/stats | 200，data.formulas=0, materials=0, sales.quantity=0 |
| B01-E01 | 异常流程 | 数据库查询异常 | 数据库连接异常 | GET /api/dashboard/stats | 500，{success:false, message:"获取仪表盘数据失败"} |
| B01-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/dashboard/stats | 401，{success:false, error:{code:"UNAUTHORIZED"}} |
| B01-R02 | 权限认证 | Token过期 | 使用过期Token | GET /api/dashboard/stats | 401，{success:false, error:{code:"TOKEN_EXPIRED"}} |
| B01-DI01 | 数据隔离 | admin可见全部配方数 | admin用户已登录，数据库有多个用户创建的配方 | GET /api/dashboard/stats | data.formulas为全部配方数 |
| B01-DI02 | 数据隔离 | formulist仅见自己的配方数 | formulist用户已登录，仅创建2个配方 | GET /api/dashboard/stats | data.formulas=2（仅自己创建的） |
| B01-DI03 | 数据隔离 | formulist仅见自己的原料数 | formulist用户已登录 | GET /api/dashboard/stats | data.materials仅为自己创建的原料数 |
| B01-DI04 | 数据隔离 | formulist仅见自己的销量统计 | formulist用户已登录 | GET /api/dashboard/stats | data.sales仅为自己配方的销量 |
| B01-DC01 | 数据一致性 | 配方数与实际一致 | admin用户已登录 | GET /api/dashboard/stats，然后直接查询formulas表 | data.formulas与SELECT COUNT(*) FROM formulas一致 |
| B01-DC02 | 数据一致性 | 销量统计为本月数据 | admin用户已登录，有本月和历史销售数据 | GET /api/dashboard/stats | data.sales仅包含本月(period_start >= 当月1号)的数据 |
| B01-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录，无并发写入 | 连续两次 GET /api/dashboard/stats | 两次响应数据一致 |
| B01-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/dashboard/stats | 404或405 |
| B01-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace或SQL信息 |
| B01-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/dashboard/stats | 响应包含success和data，data含formulas/materials/sales/pendingTasks |

### B02 GET /api/dashboard/activity — 获取最近活动记录

**业务逻辑**：
- 查询最近更新的配方和原料，合并后按updated_at降序排列
- admin可见全部，formulist仅见自己创建的
- limit参数控制返回数量，默认10，最大20
- 配方和原料各取一半（halfLimit = floor(limit/2)）

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| B02-P01 | 正向流程 | admin获取最近活动 | admin用户已登录，有配方和原料更新记录 | GET /api/dashboard/activity | 200，{success:true, data:[{id, name, code, updatedAt, type}]}，type为"formula"或"material" |
| B02-P02 | 正向流程 | 指定limit参数 | admin用户已登录 | GET /api/dashboard/activity?limit=5 | 200，返回最多5条记录 |
| B02-P03 | 正向流程 | 无活动记录 | 数据库无配方和原料 | GET /api/dashboard/activity | 200，{success:true, data:[]} |
| B02-P04 | 正向流程 | 仅配方有更新 | 数据库仅有配方更新，无原料 | GET /api/dashboard/activity | 200，data中type均为"formula" |
| B02-E01 | 异常流程 | 数据库查询异常 | 数据库连接异常 | GET /api/dashboard/activity | 500，{success:false, message:"获取最近活动失败"} |
| B02-B01 | 边界条件 | limit=0 | admin用户已登录 | GET /api/dashboard/activity?limit=0 | 200，自动修正为0，返回空数组 |
| B02-B02 | 边界条件 | limit=100 | admin用户已登录 | GET /api/dashboard/activity?limit=100 | 200，自动修正为20（最大值） |
| B02-B03 | 边界条件 | limit=1 | admin用户已登录 | GET /api/dashboard/activity?limit=1 | 200，halfLimit=0，返回0条 |
| B02-V01 | 参数校验 | limit为非数字 | admin用户已登录 | GET /api/dashboard/activity?limit=abc | 200，使用默认值10 |
| B02-V02 | 参数校验 | limit为负数 | admin用户已登录 | GET /api/dashboard/activity?limit=-1 | 200，Math.min(-1, 20)=-1，返回空数组 |
| B02-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/dashboard/activity | 401 |
| B02-R02 | 权限认证 | Token过期 | 使用过期Token | GET /api/dashboard/activity | 401 |
| B02-DI01 | 数据隔离 | admin可见全部活动 | admin用户已登录，有多个用户的数据 | GET /api/dashboard/activity | data包含所有用户创建的配方和原料 |
| B02-DI02 | 数据隔离 | formulist仅见自己的活动 | formulist用户已登录 | GET /api/dashboard/activity | data仅包含自己创建的配方和原料 |
| B02-DC01 | 数据一致性 | 活动按更新时间降序 | admin用户已登录 | GET /api/dashboard/activity | data[0].updatedAt >= data[1].updatedAt >= ... |
| B02-DC02 | 数据一致性 | 配方和原料各取一半 | admin用户已登录，limit=10 | GET /api/dashboard/activity?limit=10 | 配方最多5条，原料最多5条，合并后最多10条 |
| B02-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录，无并发写入 | 连续两次 GET /api/dashboard/activity | 两次响应数据一致 |
| B02-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/dashboard/activity | 404或405 |
| B02-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace |
| B02-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/dashboard/activity | data为数组，每个元素含id/name/code/updatedAt/type |

### B03 GET /api/dashboard/sales-trend — 获取销量趋势数据

**业务逻辑**：
- 支持period参数：month（默认）、week、year
- admin查询全部销量，formulist仅查询自己配方的销量
- 查询最近12个月的数据
- 按period分组，返回period/quantity/revenue/orderCount

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| B03-P01 | 正向流程 | 默认月度趋势 | admin用户已登录，有销售数据 | GET /api/dashboard/sales-trend | 200，{success:true, data:[{period:"2026-06", quantity, revenue, orderCount}]} |
| B03-P02 | 正向流程 | 周度趋势 | admin用户已登录 | GET /api/dashboard/sales-trend?period=week | 200，data中period格式为"2026-W23" |
| B03-P03 | 正向流程 | 年度趋势 | admin用户已登录 | GET /api/dashboard/sales-trend?period=year | 200，data中period格式为"2026" |
| B03-P04 | 正向流程 | 无销售数据 | 数据库无formula_sales记录 | GET /api/dashboard/sales-trend | 200，{success:true, data:[]} |
| B03-P05 | 正向流程 | formulist获取自己的趋势 | formulist用户已登录 | GET /api/dashboard/sales-trend | 200，data仅包含自己配方的销量 |
| B03-E01 | 异常流程 | 数据库查询异常 | 数据库连接异常 | GET /api/dashboard/sales-trend | 500，{success:false, message:"获取销量趋势失败"} |
| B03-B01 | 边界条件 | period为无效值 | admin用户已登录 | GET /api/dashboard/sales-trend?period=invalid | 200，默认使用month分组 |
| B03-V01 | 参数校验 | period为大写 | admin用户已登录 | GET /api/dashboard/sales-trend?period=MONTH | 200，默认使用month分组（switch区分大小写） |
| B02-V02 | 参数校验 | period为空字符串 | admin用户已登录 | GET /api/dashboard/sales-trend?period= | 200，默认使用month分组 |
| B03-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/dashboard/sales-trend | 401 |
| B03-R02 | 权限认证 | Token过期 | 使用过期Token | GET /api/dashboard/sales-trend | 401 |
| B03-DI01 | 数据隔离 | admin可见全部销量 | admin用户已登录 | GET /api/dashboard/sales-trend | data包含所有配方的销量 |
| B03-DI02 | 数据隔离 | formulist仅见自己的销量 | formulist用户已登录 | GET /api/dashboard/sales-trend | data仅包含自己配方的销量（JOIN formulas WHERE created_by=userId） |
| B03-DC01 | 数据一致性 | 趋势数据仅包含最近12个月 | admin用户已登录，有超过12个月的数据 | GET /api/dashboard/sales-trend | data中不包含12个月前的数据 |
| B03-DC02 | 数据一致性 | 趋势按period升序排列 | admin用户已登录 | GET /api/dashboard/sales-trend | data[0].period <= data[1].period <= ... |
| B03-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录，无并发写入 | 连续两次 GET /api/dashboard/sales-trend | 两次响应数据一致 |
| B03-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/dashboard/sales-trend | 404或405 |
| B03-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace |
| B03-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/dashboard/sales-trend | data为数组，每个元素含period/quantity/revenue/orderCount |

## 三、特殊场景测试

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SQ-DASH01 | SQLite并发写入 | 并发请求统计和活动 | 多个用户同时访问 | 同时GET /stats和GET /activity | 两个请求均正常返回 |
| X-MD-DASH01 | 请求方法限制 | 所有端点仅支持GET | admin用户已登录 | 对3个端点分别使用POST/PUT/DELETE | 返回404或405 |
| X-SE-DASH01 | 错误信息安全 | 所有500错误不泄露堆栈 | 数据库异常 | 触发各种500错误 | 响应不含stack trace、SQL语句 |
| X-RF-DASH01 | 响应格式一致性 | 所有成功响应格式一致 | admin用户已登录 | 遍历3个端点 | 所有成功响应包含success:true和data字段 |
| X-DI-DASH01 | 数据隔离 | 同一数据不同角色看到不同结果 | admin和formulist同时存在 | 分别用admin和formulist Token请求 | admin看到全部数据，formulist仅看到自己的 |
| X-DI-DASH02 | 数据隔离 | formulist无数据时返回空 | formulist用户未创建任何数据 | GET /api/dashboard/stats | data.formulas=0, materials=0, sales.quantity=0 |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| B01 GET /stats | 3 | 1 | 0 | 2 | 0 | 0 | 2 | 1 | 4 | 13 |
| B02 GET /activity | 4 | 1 | 3 | 2 | 2 | 0 | 2 | 1 | 2 | 17 |
| B03 GET /sales-trend | 5 | 1 | 1 | 2 | 2 | 0 | 2 | 1 | 2 | 16 |
| **合计** | **12** | **3** | **4** | **6** | **4** | **0** | **6** | **3** | **8** | **46** |

> 特殊场景测试6条，总计 46 + 6 = **52条**。
