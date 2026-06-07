# 比例阈值 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-RT-20260607-001 |
| 路由文件 | backend/src/routes/ratioThresholds.ts |
| 控制器文件 | backend/src/controllers/ratioThresholdController.ts |
| Service文件 | backend/src/services/ratioFactorValidator.ts |
| 端点数 | 2 |
| 测试用例数 | 36 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|------|
| E01 | GET | /api/ratio-thresholds | 必须 | 任意角色 | 获取比例阈值配置 |
| E02 | PUT | /api/ratio-thresholds | 必须 | admin | 更新比例阈值配置 |

## 二、测试用例

### E01 GET /api/ratio-thresholds — 获取比例阈值配置

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E01-P01 | 数据库有配置记录 | 1. 已登录用户<br>2. ratio_threshold_configs表有记录 | GET /api/ratio-thresholds | 200, `{success:true, data:{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:1.08, updatedAt:"...", updatedBy:"..."}}` |
| E01-P02 | 数据库无配置记录（返回默认值） | 1. 已登录用户<br>2. ratio_threshold_configs表为空 | GET /api/ratio-thresholds | 200, `{success:true, data:{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:1.08, updatedAt:null, updatedBy:null}}` |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E01-E01 | 数据库查询异常 | 模拟异常 | GET /api/ratio-thresholds | 500, `{success:false, error:{message:"获取阈值配置失败", code:"INTERNAL_ERROR"}}` |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E01-R01 | 未登录访问 | 不携带Token | GET /api/ratio-thresholds | 401 |
| E01-R02 | formulist角色访问 | 已登录formulist | GET /api/ratio-thresholds | 200, 正常返回 |

#### 数据隔离
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E01-DI01 | 所有角色可见同一配置 | 已登录任意角色 | GET /api/ratio-thresholds | 200, 返回全局唯一配置（无数据隔离） |

---

### E02 PUT /api/ratio-thresholds — 更新比例阈值配置

#### 正向流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-P01 | 更新已有配置 | 1. 已登录admin用户<br>2. ratio_threshold_configs表有记录 | PUT Body: `{normalLow:0.97, normalHigh:1.03, warningLow:0.94, warningHigh:1.06, highWarningLow:0.91, highWarningHigh:1.09}` | 200, `{success:true, data:{normalLow:0.97, ..., updatedAt:"...", updatedBy:"userId"}, message:"阈值配置更新成功"}` |
| E02-P02 | 首次创建配置 | 1. 已登录admin<br>2. ratio_threshold_configs表为空 | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:1.08}` | 200, 创建新记录并返回 |

#### 异常流程
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-E01 | normalLow >= normalHigh | 已登录admin | PUT Body: `{normalLow:1.03, normalHigh:0.97, warningLow:0.94, warningHigh:1.06, highWarningLow:0.91, highWarningHigh:1.09}` | 400, `{success:false, error:{message:"正常范围下限必须小于上限", code:"VALIDATION_ERROR"}}` |
| E02-E02 | warningLow >= normalLow | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.99, warningHigh:1.06, highWarningLow:0.91, highWarningHigh:1.09}` | 400, `{success:false, error:{message:"预警范围必须包含正常范围"}}` |
| E02-E03 | normalHigh >= warningHigh | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.01, highWarningLow:0.91, highWarningHigh:1.09}` | 400, `{success:false, error:{message:"预警范围必须包含正常范围"}}` |
| E02-E04 | highWarningLow >= warningLow | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.96, highWarningHigh:1.09}` | 400, `{success:false, error:{message:"高级预警范围必须包含预警范围"}}` |
| E02-E05 | warningHigh >= highWarningHigh | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:1.04}` | 400, `{success:false, error:{message:"高级预警范围必须包含预警范围"}}` |
| E02-E06 | highWarningLow <= 0 | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0, highWarningHigh:1.08}` | 400, `{success:false, error:{message:"阈值必须大于0"}}` |
| E02-E07 | highWarningHigh > 2.0 | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:2.5}` | 400, `{success:false, error:{message:"高级预警上限不能超过2.0"}}` |
| E02-E08 | 数据库更新异常 | 模拟异常 | PUT Body: 合法值 | 500, `{success:false, error:{message:"更新阈值配置失败", code:"INTERNAL_ERROR"}}` |

#### 边界条件
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-B01 | normalLow和normalHigh极接近 | 已登录admin | PUT Body: `{normalLow:0.999, normalHigh:1.001, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:1.08}` | 200, 更新成功 |
| E02-B02 | highWarningHigh恰好为2.0 | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:2.0}` | 200, 更新成功（边界值） |
| E02-B03 | highWarningHigh为2.01 | 已登录admin | PUT Body: `{..., highWarningHigh:2.01}` | 400, 超过2.0 |
| E02-B04 | 所有阈值为极小正数 | 已登录admin | PUT Body: `{normalLow:0.01, normalHigh:0.02, warningLow:0.005, warningHigh:0.03, highWarningLow:0.001, highWarningHigh:0.04}` | 200, 更新成功 |
| E02-B05 | 阈值含负数 | 已登录admin | PUT Body: `{normalLow:-0.98, normalHigh:1.02, ...}` | 400, 阈值必须大于0 |

#### 参数校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-V01 | normalLow非数字 | 已登录admin | PUT Body: `{normalLow:"abc", normalHigh:1.02, ...}` | 400, `{success:false, error:{message:"正常范围阈值必须为数字", code:"VALIDATION_ERROR"}}` |
| E02-V02 | normalHigh非数字 | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:null, ...}` | 400, 正常范围阈值必须为数字 |
| E02-V03 | warningLow非数字 | 已登录admin | PUT Body: `{..., warningLow:undefined, ...}` | 400, 预警范围阈值必须为数字 |
| E02-V04 | warningHigh非数字 | 已登录admin | PUT Body: `{..., warningHigh:"abc", ...}` | 400, 预警范围阈值必须为数字 |
| E02-V05 | highWarningLow非数字 | 已登录admin | PUT Body: `{..., highWarningLow:{}, ...}` | 400, 高级预警范围阈值必须为数字 |
| E02-V06 | highWarningHigh非数字 | 已登录admin | PUT Body: `{..., highWarningHigh:[], ...}` | 400, 高级预警范围阈值必须为数字 |

#### 权限认证
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-R01 | 未登录更新 | 不携带Token | PUT /api/ratio-thresholds | 401 |
| E02-R02 | formulist角色更新 | 已登录formulist | PUT Body: 合法值 | 403, `{success:false, error:{message:"仅管理员可修改阈值配置", code:"FORBIDDEN"}}` |

#### 数据一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-DC01 | 更新后数据库记录正确 | 已登录admin | PUT更新 | ratio_threshold_configs表值已更新 |
| E02-DC02 | 更新后缓存同步 | 已登录admin | PUT更新 | setCachedThresholds被调用，内存缓存更新 |
| E02-DC03 | 更新后updatedBy正确 | 已登录admin | PUT更新 | updated_by字段为当前userId |

#### 幂等性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| E02-I01 | 重复更新相同值 | 已登录admin | 连续两次PUT相同body | 200, 两次均成功，数据库值不变 |

## 三、特殊场景测试

### X-C 计算准确性（阈值逻辑）
| 用例ID | 标题 | 前置条件 | 测试步骤 | 预期结果 |
|--------|------|----------|----------|----------|
| X-C01 | 阈值范围嵌套校验 | 已登录admin | PUT Body: `{normalLow:0.98, normalHigh:1.02, warningLow:0.95, warningHigh:1.05, highWarningLow:0.92, highWarningHigh:1.08}` | 200, 满足 highWarning < warning < normal < normalHigh < warningHigh < highWarningHigh |
| X-C02 | 默认阈值验证 | 数据库为空 | GET /api/ratio-thresholds | 默认值：normalLow=0.98, normalHigh=1.02, warningLow=0.95, warningHigh=1.05, highWarningLow=0.92, highWarningHigh=1.08 |

### X-MD 请求方法限制
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-MD01 | POST请求到PUT端点 | 已登录admin | POST /api/ratio-thresholds | 404 |
| X-MD02 | DELETE请求到GET端点 | 已登录用户 | DELETE /api/ratio-thresholds | 404 |

### X-SE 错误信息安全
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-SE01 | 500错误不暴露堆栈 | 触发服务端异常 | 任意触发500的请求 | 响应不包含堆栈信息 |
| X-SE02 | 多个校验错误同时返回 | 已登录admin | PUT Body: `{normalLow:1.03, normalHigh:0.97, ...}` | 400, 错误信息包含所有不满足的条件 |

### X-RF 响应格式一致性
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-RF01 | 成功响应格式 | 已登录用户 | GET /api/ratio-thresholds | `{success:true, data:{normalLow, normalHigh, warningLow, warningHigh, highWarningLow, highWarningHigh, updatedAt, updatedBy}}` |
| X-RF02 | 更新成功响应格式 | 已登录admin | PUT合法值 | 200, `{success:true, data:{...}, message:"阈值配置更新成功"}` |
| X-RF03 | 校验失败响应格式 | 已登录admin | PUT非法值 | 400, `{success:false, error:{message, code:"VALIDATION_ERROR"}}` |

### X-CT Content-Type校验
| 用例ID | 标题 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|
| X-CT01 | PUT请求非JSON | 已登录admin | PUT Content-Type: text/plain | 400 或 解析失败 |

## 四、测试覆盖率统计
| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| E01 | 2 | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 6 |
| E02 | 2 | 8 | 5 | 2 | 6 | 0 | 3 | 1 | 0 | 27 |
| **合计** | **4** | **9** | **5** | **4** | **6** | **0** | **3** | **1** | **1** | **33** |

特殊场景：X-C(2) + X-MD(2) + X-SE(2) + X-RF(3) + X-CT(1) = 10

**总用例数：33 + 10 = 43**（含2个端点，修正端点数为2）
