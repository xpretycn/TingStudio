# 枚举管理 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-ENUM-20260607-001 |
| 路由文件 | backend/src/routes/enums.ts |
| 控制器文件 | backend/src/controllers/enumController.ts |
| Service文件 | backend/src/services/enumService.ts |
| 端点数 | 5 |
| 测试用例数 | 73 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|------|
| D01 | GET | /api/enums | authMiddleware | 任意认证用户 | 获取所有枚举（按分类分组） |
| D02 | GET | /api/enums/:category | authMiddleware | 任意认证用户 | 按分类获取枚举 |
| D03 | POST | /api/enums | authMiddleware | admin（requirePermission） | 创建枚举选项 |
| D04 | PUT | /api/enums/:id | authMiddleware | admin（requirePermission） | 更新枚举选项 |
| D05 | DELETE | /api/enums/:id | authMiddleware | admin（requirePermission） | 删除枚举选项 |

## 二、测试用例

### D01 GET /api/enums — 获取所有枚举

**业务逻辑**：
- 查询enum_options表所有记录
- 按category分组：appearance、taste、efficacy
- 返回{appearance:[...], taste:[...], efficacy:[...]}
- 每个选项包含id/category/label/value/sortOrder/isActive/createdAt/updatedAt

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| D01-P01 | 正向流程 | 获取所有枚举 | admin用户已登录，enum_options有数据 | GET /api/enums | 200，{success:true, data:{appearance:[...], taste:[...], efficacy:[...]}} |
| D01-P02 | 正向流程 | 枚举列表为空 | admin用户已登录，enum_options无数据 | GET /api/enums | 200，{success:true, data:{appearance:[], taste:[], efficacy:[]}} |
| D01-P03 | 正向流程 | formulist可查看所有枚举 | formulist用户已登录 | GET /api/enums | 200，返回全部枚举数据 |
| D01-E01 | 异常流程 | 数据库查询异常 | 数据库连接异常 | GET /api/enums | 500，{success:false, message:"获取枚举列表失败"} |
| D01-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/enums | 401，{success:false, error:{code:"UNAUTHORIZED"}} |
| D01-R02 | 权限认证 | Token过期 | 使用过期Token | GET /api/enums | 401，{success:false, error:{code:"TOKEN_EXPIRED"}} |
| D01-DC01 | 数据一致性 | 枚举按sort_order排序 | admin用户已登录 | GET /api/enums | 每个分类内枚举按sort_order升序排列 |
| D01-DC02 | 数据一致性 | isActive为布尔值 | admin用户已登录 | GET /api/enums | 每个选项的isActive为true/false（非0/1） |
| D01-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录 | 连续两次 GET /api/enums | 两次响应数据一致 |
| D01-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/enums（无Body） | 400（validateBody校验失败） |
| D01-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace |
| D01-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/enums | 响应包含success:true和data，data为对象含3个分类key |

### D02 GET /api/enums/:category — 按分类获取枚举

**业务逻辑**：
- category为路径参数，取值：appearance/taste/efficacy
- activeOnly查询参数：true时仅返回is_active=1的选项
- 按sort_order排序

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| D02-P01 | 正向流程 | 获取appearance分类枚举 | admin用户已登录，有appearance数据 | GET /api/enums/appearance | 200，{success:true, data:[{id, category:"appearance", label, value, sortOrder, isActive, createdAt, updatedAt}]} |
| D02-P02 | 正向流程 | 获取taste分类枚举 | admin用户已登录 | GET /api/enums/taste | 200，data中category均为"taste" |
| D02-P03 | 正向流程 | 获取efficacy分类枚举 | admin用户已登录 | GET /api/enums/efficacy | 200，data中category均为"efficacy" |
| D02-P04 | 正向流程 | 使用activeOnly参数 | admin用户已登录，有active和inactive选项 | GET /api/enums/appearance?activeOnly=true | 200，data中所有选项isActive=true |
| D02-P05 | 正向流程 | 不使用activeOnly参数 | admin用户已登录 | GET /api/enums/appearance | 200，返回所有选项（含isActive=false的） |
| D02-P06 | 正向流程 | formulist可按分类查看 | formulist用户已登录 | GET /api/enums/appearance | 200，返回appearance分类枚举 |
| D02-E01 | 异常流程 | 无效的分类名 | admin用户已登录 | GET /api/enums/invalid_category | 200，data为空数组（Service层不校验分类名，SQL返回空结果） |
| D02-E02 | 异常流程 | 数据库查询异常 | 数据库连接异常 | GET /api/enums/appearance | 500，{success:false, message:"获取枚举列表失败"} |
| D02-B01 | 边界条件 | 分类下无枚举 | admin用户已登录 | GET /api/enums/appearance（appearance表为空） | 200，{success:true, data:[]} |
| D02-B02 | 边界条件 | activeOnly为非"true"值 | admin用户已登录 | GET /api/enums/appearance?activeOnly=yes | 200，activeOnly=false，返回全部 |
| D02-V01 | 参数校验 | category为空 | admin用户已登录 | GET /api/enums/ | 路由不匹配（回退到D01） |
| D02-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/enums/appearance | 401 |
| D02-DC01 | 数据一致性 | 按sort_order排序 | admin用户已登录 | GET /api/enums/appearance | data[0].sortOrder <= data[1].sortOrder <= ... |
| D02-DC02 | 数据一致性 | activeOnly=true仅返回活跃选项 | admin用户已登录 | GET /api/enums/appearance?activeOnly=true | 所有返回项isActive=true |
| D02-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录 | 连续两次 GET /api/enums/appearance | 两次响应数据一致 |
| D02-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/enums/appearance | 400（validateBody校验失败）或路由不匹配 |
| D02-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/enums/appearance | data为数组，每个元素camelCase格式 |

### D03 POST /api/enums — 创建枚举选项

**业务逻辑**：
- 仅admin可操作（requirePermission("admin")）
- 请求体校验：category（必填，string）、label（必填，1-20字符）、value（必填，1-20字符）
- Service层校验：category必须为appearance/taste/efficacy之一
- 同一category下value唯一（DUPLICATE_ENTRY）
- 自动计算sortOrder（当前最大值+1）
- is_active默认为1

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| D03-P01 | 正向流程 | 创建appearance枚举 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"棕褐色", value:"brown"} | 201，{success:true, data:{id, category:"appearance", label:"棕褐色", value:"brown", sortOrder:N, isActive:true}} |
| D03-P02 | 正向流程 | 创建taste枚举 | admin用户已登录 | POST /api/enums，Body:{category:"taste", label:"甘", value:"sweet"} | 201，data.category="taste" |
| D03-P03 | 正向流程 | 创建efficacy枚举 | admin用户已登录 | POST /api/enums，Body:{category:"efficacy", label:"清热", value:"clear_heat"} | 201，data.category="efficacy" |
| D03-P04 | 正向流程 | sortOrder自动递增 | admin用户已登录，appearance分类已有3个选项 | POST /api/enums，Body:{category:"appearance", label:"新选项", value:"new"} | 201，data.sortOrder=4 |
| D03-E01 | 异常流程 | 重复value | admin用户已登录，appearance下已有value="brown" | POST /api/enums，Body:{category:"appearance", label:"棕色", value:"brown"} | 409，{success:false, error:{message:"该分类下已存在相同选项", code:"DUPLICATE_ENTRY"}} |
| D03-E02 | 异常流程 | 无效的category | admin用户已登录 | POST /api/enums，Body:{category:"invalid", label:"测试", value:"test"} | 400，{success:false, error:{message:"无效的枚举分类", code:"VALIDATION_ERROR"}} |
| D03-B01 | 边界条件 | label为1字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"a", value:"a"} | 201，创建成功 |
| D03-B02 | 边界条件 | label为20字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"12345678901234567890", value:"test20"} | 201，创建成功 |
| D03-B03 | 边界条件 | label超过20字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"123456789012345678901", value:"test21"} | 400，validateBody校验失败 |
| D03-B04 | 边界条件 | value为1字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"测试", value:"x"} | 201，创建成功 |
| D03-B05 | 边界条件 | value为20字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"测试", value:"12345678901234567890"} | 201，创建成功 |
| D03-B06 | 边界条件 | value超过20字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"测试", value:"123456789012345678901"} | 400，validateBody校验失败 |
| D03-V01 | 参数校验 | 缺少category | admin用户已登录 | POST /api/enums，Body:{label:"测试", value:"test"} | 400，validateBody校验失败 |
| D03-V02 | 参数校验 | 缺少label | admin用户已登录 | POST /api/enums，Body:{category:"appearance", value:"test"} | 400，validateBody校验失败 |
| D03-V03 | 参数校验 | 缺少value | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"测试"} | 400，validateBody校验失败 |
| D03-V04 | 参数校验 | label为空字符串 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"", value:"test"} | 400，validateBody校验失败（minLength:1） |
| D03-V05 | 参数校验 | value为空字符串 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"测试", value:""} | 400，validateBody校验失败 |
| D03-V06 | 参数校验 | category为非字符串 | admin用户已登录 | POST /api/enums，Body:{category:123, label:"测试", value:"test"} | 400，validateBody校验失败 |
| D03-V07 | 参数校验 | label含特殊字符 | admin用户已登录 | POST /api/enums，Body:{category:"appearance", label:"<script>alert(1)</script>", value:"xss"} | 201或400（取决于validateBody是否过滤HTML） |
| D03-R01 | 权限认证 | 未登录访问 | 无Token | POST /api/enums | 401 |
| D03-R02 | 权限认证 | formulist角色创建 | formulist用户已登录 | POST /api/enums，Body:{category:"appearance", label:"测试", value:"test"} | 403，{success:false, error:{code:"FORBIDDEN"}} |
| D03-R03 | 权限认证 | Token过期 | 使用过期Token | POST /api/enums | 401 |
| D03-DC01 | 数据一致性 | 创建后数据库记录正确 | admin用户已登录 | POST创建后查询enum_options | 数据库中存在对应记录，is_active=1，sortOrder正确 |
| D03-DC02 | 数据一致性 | 创建后GET /api/enums可见 | admin用户已登录 | POST创建后 GET /api/enums | 新创建的选项出现在对应分类中 |
| D03-I01 | 幂等性 | 重复创建相同value | admin用户已登录 | 两次POST相同category+value | 第一次201，第二次409（DUPLICATE_ENTRY） |
| D03-S01 | 状态流转 | 分类下无选项时创建第一个 | admin用户已登录，appearance分类为空 | POST /api/enums，Body:{category:"appearance", label:"首个", value:"first"} | 201，sortOrder=1 |
| D03-X-CT01 | Content-Type校验 | 非JSON请求体 | admin用户已登录 | POST /api/enums，Content-Type: text/plain | 400或415 |
| D03-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace |
| D03-X-RF01 | 响应格式一致性 | 成功响应格式 | admin用户已登录 | POST /api/enums（有效Body） | 201，{success:true, data:{...}} |

### D04 PUT /api/enums/:id — 更新枚举选项

**业务逻辑**：
- 仅admin可操作
- 可更新label、value、isActive
- 更新value时检查同分类下是否重复（排除自身）
- 更新value时同步更新materials表中的JSON字段（syncMaterialJsonField）
- 无更新字段时返回当前数据

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| D04-P01 | 正向流程 | 更新label | admin用户已登录，枚举选项存在 | PUT /api/enums/{id}，Body:{label:"新标签"} | 200，{success:true, data:{label:"新标签", ...}} |
| D04-P02 | 正向流程 | 更新value | admin用户已登录，枚举选项存在 | PUT /api/enums/{id}，Body:{value:"new_value"} | 200，data.value="new_value" |
| D04-P03 | 正向流程 | 更新isActive | admin用户已登录，枚举选项存在 | PUT /api/enums/{id}，Body:{isActive:false} | 200，data.isActive=false |
| D04-P04 | 正向流程 | 同时更新多个字段 | admin用户已登录 | PUT /api/enums/{id}，Body:{label:"新标签", value:"new_val", isActive:false} | 200，三个字段均更新 |
| D04-P05 | 正向流程 | 更新value时同步materials表 | admin用户已登录，materials表中有引用旧value的记录 | PUT /api/enums/{id}，Body:{value:"new_value"} | materials表中对应JSON字段中的旧value被替换为新value |
| D04-E01 | 异常流程 | 枚举选项不存在 | admin用户已登录 | PUT /api/enums/nonexistent-id，Body:{label:"测试"} | 404，{success:false, error:{message:"枚举选项不存在", code:"NOT_FOUND"}} |
| D04-E02 | 异常流程 | 更新value与同分类其他选项重复 | admin用户已登录，同分类下已有value="existing" | PUT /api/enums/{otherId}，Body:{value:"existing"} | 409，{success:false, error:{message:"该分类下已存在相同选项", code:"DUPLICATE_ENTRY"}} |
| D04-B01 | 边界条件 | Body为空对象 | admin用户已登录 | PUT /api/enums/{id}，Body:{} | 200，返回当前数据（无字段更新） |
| D04-B02 | 边界条件 | isActive为0 | admin用户已登录 | PUT /api/enums/{id}，Body:{isActive:0} | 200，isActive=false |
| D04-B03 | 边界条件 | 更新value为自身当前值 | admin用户已登录 | PUT /api/enums/{id}，Body:{value:"当前值"} | 200，正常更新（不触发重复检查，因为data.value === current.value） |
| D04-V01 | 参数校验 | id为空 | admin用户已登录 | PUT /api/enums/ | 路由不匹配 |
| D04-V02 | 参数校验 | label超过20字符 | admin用户已登录 | PUT /api/enums/{id}，Body:{label:"123456789012345678901"} | 200或400（PUT端点未配置validateBody） |
| D04-R01 | 权限认证 | 未登录访问 | 无Token | PUT /api/enums/{id} | 401 |
| D04-R02 | 权限认证 | formulist角色更新 | formulist用户已登录 | PUT /api/enums/{id}，Body:{label:"测试"} | 403 |
| D04-DC01 | 数据一致性 | 更新后数据库记录正确 | admin用户已登录 | PUT更新后查询enum_options | 数据库中记录已更新，updated_at已变更 |
| D04-DC02 | 数据一致性 | 更新value后materials JSON同步 | admin用户已登录，materials表有引用 | PUT更新value | materials表中对应JSON字段已同步更新 |
| D04-I01 | 幂等性 | 重复更新同一字段 | admin用户已登录 | 连续两次 PUT /api/enums/{id}，Body:{label:"新标签"} | 两次均200，最终数据一致 |
| D04-S01 | 状态流转 | 将isActive从true改为false | admin用户已登录，选项isActive=true | PUT /api/enums/{id}，Body:{isActive:false} | 200，isActive=false，GET /api/enums/:category?activeOnly=true不再包含此选项 |
| D04-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace |
| D04-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | PUT /api/enums/{id}（有效Body） | 200，{success:true, data:{...}} |

### D05 DELETE /api/enums/:id — 删除枚举选项

**业务逻辑**：
- 仅admin可操作
- 删除前检查materials表中的引用数量（getReferenceCount）
- 同时删除enum_exclusions表中的关联记录
- 返回deletedId和referenceCount

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| D05-P01 | 正向流程 | 删除存在的枚举选项 | admin用户已登录，选项存在 | DELETE /api/enums/{id} | 200，{success:true, data:{deletedId, referenceCount}} |
| D05-P02 | 正向流程 | 删除被materials引用的选项 | admin用户已登录，选项被3条material引用 | DELETE /api/enums/{id} | 200，data.referenceCount=3 |
| D05-P03 | 正向流程 | 删除时清理enum_exclusions | admin用户已登录，选项在enum_exclusions中有记录 | DELETE /api/enums/{id} | enum_exclusions中对应记录被删除 |
| D05-E01 | 异常流程 | 删除不存在的选项 | admin用户已登录 | DELETE /api/enums/nonexistent-id | 404，{success:false, error:{message:"枚举选项不存在", code:"NOT_FOUND"}} |
| D05-B01 | 边界条件 | id为空 | admin用户已登录 | DELETE /api/enums/ | 路由不匹配 |
| D05-V01 | 参数校验 | id含特殊字符 | admin用户已登录 | DELETE /api/enums/;DROP%20TABLE | 404（找不到该id的记录） |
| D05-R01 | 权限认证 | 未登录访问 | 无Token | DELETE /api/enums/{id} | 401 |
| D05-R02 | 权限认证 | formulist角色删除 | formulist用户已登录 | DELETE /api/enums/{id} | 403 |
| D05-DC01 | 数据一致性 | 删除后数据库记录不存在 | admin用户已登录 | DELETE后查询enum_options | 该id的记录已不存在 |
| D05-DC02 | 数据一致性 | 删除后GET /api/enums不再包含 | admin用户已登录 | DELETE后 GET /api/enums | 对应分类中不再包含已删除选项 |
| D05-I01 | 幂等性 | 重复删除同一选项 | admin用户已登录 | 连续两次 DELETE /api/enums/{id} | 第一次200，第二次404 |
| D05-S01 | 状态流转 | 删除被引用的选项后materials数据不变 | admin用户已登录，选项被material引用 | DELETE /api/enums/{id} | materials表中的JSON字段不变（仅返回referenceCount，不阻止删除） |
| D05-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库异常 | 触发500错误 | 响应不含stack trace |
| D05-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | DELETE /api/enums/{id} | 200，{success:true, data:{deletedId, referenceCount}} |

## 三、特殊场景测试

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SQ-ENUM01 | SQLite并发写入 | 并发创建同分类同value枚举 | admin用户已登录 | 同时POST两个相同category+value | 至少一个409（DUPLICATE_ENTRY），数据库不损坏 |
| X-SQ-ENUM02 | SQLite并发写入 | 并发更新同一枚举 | admin用户已登录 | 同时PUT更新同一id的不同字段 | 至少一个成功，最终数据一致 |
| X-SQ-ENUM03 | SQLite并发写入 | 并发删除和更新同一枚举 | admin用户已登录 | 同时DELETE和PUT同一id | 一个成功一个失败（404），数据库不损坏 |
| X-MD-ENUM01 | 请求方法限制 | GET端点使用POST | admin用户已登录 | POST /api/enums（无Body） | 400（validateBody校验失败） |
| X-MD-ENUM02 | 请求方法限制 | POST端点使用GET | admin用户已登录 | GET /api/enums（创建） | 200，返回枚举列表（GET /api/enums路由匹配） |
| X-MD-ENUM03 | 请求方法限制 | PUT端点使用GET | admin用户已登录 | GET /api/enums/{id} | 200，返回分类枚举（GET /api/enums/:category路由匹配） |
| X-MD-ENUM04 | 请求方法限制 | DELETE端点使用GET | admin用户已登录 | GET /api/enums/{id} | 200，返回分类枚举（不执行删除） |
| X-SE-ENUM01 | 错误信息安全 | 所有500错误不泄露堆栈 | 数据库异常 | 触发各种500错误 | 响应不含stack trace、SQL语句 |
| X-RF-ENUM01 | 响应格式一致性 | 所有成功响应包含success:true | admin用户已登录 | 遍历5个端点的成功场景 | 所有成功响应包含success:true和data字段 |
| X-RF-ENUM02 | 响应格式一致性 | 所有错误响应包含error对象 | admin用户已登录 | 触发400/404/409错误 | 错误响应包含success:false和error:{message, code} |
| X-CT-ENUM01 | Content-Type校验 | POST请求非JSON | admin用户已登录 | POST /api/enums，Content-Type: text/plain | 400或415 |
| X-CT-ENUM02 | Content-Type校验 | PUT请求非JSON | admin用户已登录 | PUT /api/enums/{id}，Content-Type: text/plain | 400或415 |
| X-DI-ENUM01 | 数据隔离 | 枚举数据对所有认证用户可见 | admin和formulist同时存在 | 分别用admin和formulist Token GET /api/enums | 两人看到相同的枚举数据（枚举无created_by字段） |
| X-DI-ENUM02 | 数据隔离 | 仅admin可创建/更新/删除 | admin和formulist同时存在 | formulist尝试POST/PUT/DELETE | 403，FORBIDDEN |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| D01 GET / | 3 | 1 | 0 | 2 | 0 | 0 | 2 | 1 | 0 | 9 |
| D02 GET /:category | 6 | 2 | 2 | 1 | 1 | 0 | 2 | 1 | 0 | 15 |
| D03 POST / | 4 | 2 | 6 | 3 | 7 | 1 | 2 | 1 | 0 | 26 |
| D04 PUT /:id | 5 | 2 | 3 | 2 | 2 | 1 | 2 | 1 | 0 | 18 |
| D05 DELETE /:id | 3 | 1 | 1 | 2 | 1 | 1 | 2 | 1 | 0 | 12 |
| **合计** | **21** | **8** | **12** | **10** | **11** | **3** | **10** | **5** | **0** | **80** |

> 特殊场景测试14条，总计 80 + 14 = **94条**。
> 注：枚举数据无created_by字段，数据隔离维度（DI）不适用于读写操作，记为0。但权限隔离通过requirePermission("admin")实现。
