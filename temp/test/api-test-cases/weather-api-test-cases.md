# 天气 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-WX-20260607-001 |
| 路由文件 | backend/src/routes/weather.ts |
| 端点数 | 2 |
| 测试用例数 | 40 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| C01 | GET | /api/weather/location | 无 | 代理高德地图IP定位API |
| C02 | GET | /api/weather/amap/* | 无 | 通用高德REST API代理 |

> 注：weather模块无需认证，为公开代理接口。

## 二、测试用例

### C01 GET /api/weather/location — 代理高德地图IP定位

**业务逻辑**：
- 从环境变量读取AMAP_KEY
- 代理请求高德IP定位API（v3/ip）
- 超时8秒（AbortSignal.timeout(8000)）
- AMAP_KEY未配置时返回500
- 高德API超时返回504，其他错误返回502

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| C01-P01 | 正向流程 | 成功获取IP定位 | AMAP_KEY已配置，高德API正常 | GET /api/weather/location | 200，{success:true, data:{province, city, adcode, ...}} |
| C01-P02 | 正向流程 | 返回高德原始数据格式 | AMAP_KEY已配置 | GET /api/weather/location | data包含高德API原始字段（province/city/adcode等） |
| C01-E01 | 异常流程 | AMAP_KEY未配置 | AMAP_KEY为空 | GET /api/weather/location | 500，{success:false, message:"未配置高德地图 Key"} |
| C01-E02 | 异常流程 | 高德API超时 | AMAP_KEY已配置，高德API响应超过8秒 | GET /api/weather/location | 504，{success:false, message:...} |
| C01-E03 | 异常流程 | 高德API返回非200 | AMAP_KEY已配置，高德API返回500 | GET /api/weather/location | 502，{success:false, message:"HTTP 500"} |
| C01-E04 | 异常流程 | 高德API返回无效JSON | AMAP_KEY已配置，高德返回非JSON | GET /api/weather/location | 502，{success:false, message:...} |
| C01-B01 | 边界条件 | 高德API返回空数据 | AMAP_KEY已配置，高德返回{} | GET /api/weather/location | 200，{success:true, data:{}} |
| C01-R01 | 权限认证 | 无需认证即可访问 | 无Token | GET /api/weather/location | 200（正常返回数据） |
| C01-I01 | 幂等性 | 重复请求结果一致 | AMAP_KEY已配置 | 连续两次 GET /api/weather/location | 两次均200，数据格式一致（具体值可能因IP变化） |
| C01-X-MD01 | 请求方法限制 | 使用POST方法 | — | POST /api/weather/location | 404或405 |
| C01-X-SE01 | 错误信息安全 | 502错误不泄露高德Key | 高德API异常 | 触发502错误 | 响应message不包含AMAP_KEY值 |
| C01-X-RF01 | 响应格式一致性 | 成功响应格式 | AMAP_KEY已配置 | GET /api/weather/location | 响应包含success:true和data字段 |
| C01-X-RF02 | 响应格式一致性 | 错误响应格式 | AMAP_KEY未配置 | GET /api/weather/location | 响应包含success:false和message字段（注意：无error对象，与标准格式不一致） |

### C02 GET /api/weather/amap/* — 通用高德REST API代理

**业务逻辑**：
- 代理所有高德Web服务API请求
- 路径映射：/api/weather/amap/* → https://restapi.amap.com/*
- query参数原样传递
- 超时10秒（AbortSignal.timeout(10000)）
- 成功时直接转发高德原始响应格式（非{success:true, data:...}包装）
- 超时返回504，其他错误返回502
- 错误时返回高德风格格式：{status:"0", info:..., infocode:...}

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| C02-P01 | 正向流程 | 代理天气查询 | AMAP_KEY已配置 | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key={AMAP_KEY} | 200，返回高德天气API原始响应 |
| C02-P02 | 正向流程 | 代理地理编码 | AMAP_KEY已配置 | GET /api/weather/amap/v3/place/text?keywords=广州&key={AMAP_KEY} | 200，返回高德地理编码API原始响应 |
| C02-P03 | 正向流程 | 代理关键词搜索 | AMAP_KEY已配置 | GET /api/weather/amap/v3/place/text?keywords=武汉&key={AMAP_KEY} | 200，返回高德搜索API原始响应 |
| C02-P04 | 正向流程 | 无query参数 | AMAP_KEY已配置 | GET /api/weather/amap/v3/ip | 200，高德API返回默认结果 |
| C02-E01 | 异常流程 | 高德API超时 | AMAP_KEY已配置，高德API响应超过10秒 | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key={AMAP_KEY} | 504，{status:"0", info:"代理服务错误: ...timeout...", infocode:"504"} |
| C02-E02 | 异常流程 | 高德API返回非200 | AMAP_KEY已配置 | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key=invalid | 502，{status:"0", info:"代理服务错误: 高德API HTTP ...", infocode:"502"} |
| C02-E03 | 异常流程 | 高德API不可达 | AMAP_KEY已配置，高德服务器不可达 | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key={AMAP_KEY} | 502，{status:"0", info:..., infocode:"502"} |
| C02-B01 | 边界条件 | 路径深度较大 | AMAP_KEY已配置 | GET /api/weather/amap/v3/place/text?keywords=test&key={AMAP_KEY} | 200，正常代理 |
| C02-B02 | 边界条件 | query参数含特殊字符 | AMAP_KEY已配置 | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key={AMAP_KEY}&extensions=all | 200，参数正确传递 |
| C02-V01 | 参数校验 | 路径为空 | — | GET /api/weather/amap | 路由不匹配或代理到高德根路径 |
| C02-R01 | 权限认证 | 无需认证即可访问 | 无Token | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key={AMAP_KEY} | 200（正常返回数据） |
| C02-I01 | 幂等性 | 重复请求结果一致 | AMAP_KEY已配置 | 连续两次相同请求 | 两次均200，数据格式一致 |
| C02-DC01 | 数据一致性 | 代理响应与直接请求高德一致 | AMAP_KEY已配置 | 分别通过代理和直接请求高德 | 响应内容一致（忽略时间戳差异） |
| C02-X-MD01 | 请求方法限制 | 使用POST方法 | — | POST /api/weather/amap/v3/weather/weatherInfo | 404或405 |
| C02-X-SE01 | 错误信息安全 | 502错误不泄露高德Key | 高德API异常 | 触发502错误 | 响应info字段不包含AMAP_KEY值 |
| C02-X-RF01 | 响应格式一致性 | 成功响应为高德原始格式 | AMAP_KEY已配置 | GET /api/weather/amap/v3/weather/weatherInfo?city=北京&key={AMAP_KEY} | 响应为高德API原始JSON格式（非{success:true, data:...}包装） |
| C02-X-RF02 | 响应格式一致性 | 错误响应为高德风格格式 | 高德API异常 | 触发502错误 | 响应包含status:"0"、info、infocode字段 |

## 三、特殊场景测试

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SQ-WX01 | 外部服务依赖 | 高德API维护中 | 高德API不可用 | GET /api/weather/location | 502，优雅降级 |
| X-SQ-WX02 | 外部服务依赖 | 高德API响应缓慢 | 高德API响应时间>8秒 | GET /api/weather/location | 504，超时处理 |
| X-SQ-WX03 | 外部服务依赖 | 高德API响应缓慢（amap代理） | 高德API响应时间>10秒 | GET /api/weather/amap/... | 504，超时处理 |
| X-MD-WX01 | 请求方法限制 | 所有端点仅支持GET | — | 对2个端点使用POST | 返回404或405 |
| X-SE-WX01 | 错误信息安全 | 错误响应不泄露AMAP_KEY | 高德API异常 | 触发各种错误 | 响应不包含AMAP_KEY值 |
| X-SE-WX02 | 错误信息安全 | 错误响应不泄露服务器内部信息 | 高德API异常 | 触发各种错误 | 响应不包含服务器IP、文件路径等 |
| X-RF-WX01 | 响应格式一致性 | location端点成功响应包含success字段 | AMAP_KEY已配置 | GET /api/weather/location | 响应包含success:true |
| X-RF-WX02 | 响应格式一致性 | amap代理成功响应为高德原始格式 | AMAP_KEY已配置 | GET /api/weather/amap/... | 响应不包含success字段，为高德原始格式 |
| X-CT-WX01 | Content-Type校验 | 代理返回JSON Content-Type | AMAP_KEY已配置 | GET /api/weather/location | 响应Content-Type为application/json |
| X-LB-WX01 | 请求体大小限制 | GET请求带Body | — | GET /api/weather/location，Body: {data:"large"} | 忽略请求体，正常返回 |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| C01 GET /location | 2 | 4 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 9 |
| C02 GET /amap/* | 4 | 3 | 2 | 1 | 1 | 0 | 1 | 1 | 0 | 13 |
| **合计** | **6** | **7** | **3** | **2** | **1** | **0** | **1** | **2** | **0** | **22** |

> 特殊场景测试10条，总计 22 + 10 = **32条**。
> 注：weather模块无需认证，数据隔离维度不适用。amap代理端点直接转发高德响应，响应格式与项目标准格式不同。
