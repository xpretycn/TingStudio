# 数据库管理 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-DB-20260607-001 |
| 路由文件 | backend/src/routes/db.ts |
| 控制器文件 | backend/src/controllers/dbController.ts |
| Service文件 | backend/src/services/dbService.ts |
| 端点数 | 14 |
| 测试用例数 | 186 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 权限 | 说明 |
|------|------|------|------|------|------|
| A01 | GET | /api/db/info | authMiddleware | admin | 获取数据库信息 |
| A02 | GET | /api/db/tables | authMiddleware | admin | 获取表列表 |
| A03 | GET | /api/db/tables/:tableName/schema | authMiddleware | admin | 获取表结构 |
| A04 | GET | /api/db/tables/:tableName/data | authMiddleware | admin | 获取表数据（分页） |
| A05 | GET | /api/db/backups | authMiddleware | admin | 获取备份列表 |
| A06 | POST | /api/db/backups | authMiddleware | admin | 创建备份 |
| A07 | GET | /api/db/backups/:fileName/download | authMiddleware | admin | 下载备份文件 |
| A08 | POST | /api/db/backups/:fileName/restore | authMiddleware | admin | 从备份恢复 |
| A09 | DELETE | /api/db/backups/:fileName | authMiddleware | admin | 删除备份 |
| A10 | POST | /api/db/backups/upload-restore | authMiddleware | admin | 上传文件并恢复 |
| A11 | GET | /api/db/scripts | authMiddleware | admin | 获取脚本列表 |
| A12 | POST | /api/db/scripts/:scriptId/execute | authMiddleware | admin | 执行脚本 |
| A13 | GET | /api/db/scripts/:scriptId/history | authMiddleware | admin | 获取脚本执行历史 |
| A14 | GET | /api/db/scripts/:scriptId/content | authMiddleware | admin | 获取脚本内容 |
| A15 | PUT | /api/db/scripts/:scriptId/content | authMiddleware | admin | 更新脚本内容 |
| A16 | GET | /api/db/scripts/:scriptId/versions | authMiddleware | admin | 获取脚本版本历史 |
| A17 | POST | /api/db/scripts/:scriptId/versions/restore | authMiddleware | admin | 恢复脚本版本 |

> 注：路由文件实际注册了17个端点（含A15-A17），文档按17个端点生成用例。

## 二、测试用例

### A01 GET /api/db/info — 获取数据库信息

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A01-P01 | 正向流程 | 管理员获取数据库信息 | admin用户已登录，数据库文件存在 | GET /api/db/info，Header: Authorization: Bearer {adminToken} | 200，{success:true, data:{dbType, dbPath, fileSize, fileSizeBytes, tableCount, totalRows, lastUpdated}} |
| A01-E01 | 异常流程 | 数据库文件不存在 | 数据库文件被删除 | GET /api/db/info，Header: Authorization: Bearer {adminToken} | 500，{success:false, error:{message:"获取数据库信息失败", code:"INTERNAL_ERROR"}} |
| A01-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/db/info | 401，{success:false, error:{message:..., code:"UNAUTHORIZED"}} |
| A01-R02 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/info，Header: Authorization: Bearer {formulistToken} | 403，{success:false, error:{message:"仅管理员可访问数据库管理功能", code:"FORBIDDEN"}} |
| A01-R03 | 权限认证 | Token过期 | 使用过期Token | GET /api/db/info，Header: Authorization: Bearer {expiredToken} | 401，{success:false, error:{code:"TOKEN_EXPIRED"}} |
| A01-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录 | 连续两次 GET /api/db/info | 两次响应的dbType、dbPath一致（fileSize/totalRows可能因并发操作不同） |
| A01-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/db/info | 404或405 |
| A01-X-SE01 | 错误信息安全 | 500错误不泄露堆栈 | 数据库文件异常 | 触发500错误 | 响应不包含stack trace、文件路径等内部信息 |
| A01-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/info | 响应包含success和data字段，data为对象 |

### A02 GET /api/db/tables — 获取表列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A02-P01 | 正向流程 | 管理员获取表列表 | admin用户已登录，数据库有表 | GET /api/db/tables | 200，{success:true, data:[{name, rowCount, columnCount, indexCount}]} |
| A02-P02 | 正向流程 | 空数据库表列表 | 数据库无业务表 | GET /api/db/tables | 200，{success:true, data:[]} |
| A02-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/tables | 403，{success:false, error:{code:"FORBIDDEN"}} |
| A02-R02 | 权限认证 | 未登录访问 | 无Token | GET /api/db/tables | 401 |
| A02-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录 | 连续两次 GET /api/db/tables | 两次响应的表名列表一致 |
| A02-X-MD01 | 请求方法限制 | 使用POST方法 | admin用户已登录 | POST /api/db/tables | 404或405 |
| A02-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/tables | data为数组，每个元素包含name、rowCount、columnCount、indexCount |

### A03 GET /api/db/tables/:tableName/schema — 获取表结构

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A03-P01 | 正向流程 | 获取存在的表结构 | admin用户已登录 | GET /api/db/tables/users/schema | 200，{success:true, data:{name:"users", columns:[...], indexes:[...], foreignKeys:[...]}} |
| A03-P02 | 正向流程 | 获取含索引的表结构 | admin用户已登录 | GET /api/db/tables/materials/schema | 200，data.indexes长度>0 |
| A03-E01 | 异常流程 | 表不存在 | admin用户已登录 | GET /api/db/tables/nonexistent/schema | 404，{success:false, error:{message:"表 nonexistent 不存在", code:"NOT_FOUND"}} |
| A03-E02 | 异常流程 | 表名含特殊字符（SQL注入） | admin用户已登录 | GET /api/db/tables/users;DROP%20TABLE%20users/schema | 500，服务端拒绝（正则校验`/^[a-zA-Z0-9_]+$/`） |
| A03-B01 | 边界条件 | 空字符串表名 | admin用户已登录 | GET /api/db/tables//schema | 400或路由不匹配 |
| A03-B02 | 边界条件 | 超长表名 | admin用户已登录 | GET /api/db/tables/{256字符表名}/schema | 500，"无效的表名格式" |
| A03-V01 | 参数校验 | 表名含空格 | admin用户已登录 | GET /api/db/tables/user%20name/schema | 500，"无效的表名格式" |
| A03-V02 | 参数校验 | 表名含连字符 | admin用户已登录 | GET /api/db/tables/my-table/schema | 500，"无效的表名格式" |
| A03-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/tables/users/schema | 403 |
| A03-X-SE01 | 错误信息安全 | 500错误不泄露SQL | admin用户已登录 | 使用非法表名触发错误 | 响应不含SQL语句或堆栈信息 |
| A03-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/tables/users/schema | data包含name、columns、indexes、foreignKeys |

### A04 GET /api/db/tables/:tableName/data — 获取表数据

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A04-P01 | 正向流程 | 默认分页获取表数据 | admin用户已登录，users表有数据 | GET /api/db/tables/users/data | 200，{success:true, data:{columns:[...], rows:[...], pagination:{page:1, pageSize:20, total, totalPages}}} |
| A04-P02 | 正向流程 | 指定分页参数 | admin用户已登录 | GET /api/db/tables/users/data?page=2&pageSize=10 | 200，pagination.page=2, pagination.pageSize=10 |
| A04-P03 | 正向流程 | 带搜索参数 | admin用户已登录，users表有数据 | GET /api/db/tables/users/data?search=admin | 200，rows中包含匹配结果 |
| A04-P04 | 正向流程 | 带排序参数 | admin用户已登录 | GET /api/db/tables/users/data?sort=created_at&order=DESC | 200，rows按created_at降序排列 |
| A04-E01 | 异常流程 | 表不存在 | admin用户已登录 | GET /api/db/tables/nonexistent/data | 500，错误信息包含"不存在" |
| A04-E02 | 异常流程 | 排序字段含特殊字符 | admin用户已登录 | GET /api/db/tables/users/data?sort=name;DROP%20TABLE%20users | 500，"无效的排序字段名" |
| A04-B01 | 边界条件 | page=0 | admin用户已登录 | GET /api/db/tables/users/data?page=0 | 200，自动修正为page=1 |
| A04-B02 | 边界条件 | pageSize=0 | admin用户已登录 | GET /api/db/tables/users/data?pageSize=0 | 200，使用默认pageSize=20 |
| A04-B03 | 边界条件 | 超大pageSize | admin用户已登录 | GET /api/db/tables/users/data?pageSize=99999 | 200，返回对应数量行 |
| A04-B04 | 边界条件 | 搜索空字符串 | admin用户已登录 | GET /api/db/tables/users/data?search= | 200，返回全部数据（无过滤） |
| A04-B05 | 边界条件 | 搜索SQL注入 | admin用户已登录 | GET /api/db/tables/users/data?search=' OR 1=1-- | 200，搜索作为普通字符串处理 |
| A04-V01 | 参数校验 | page为非数字 | admin用户已登录 | GET /api/db/tables/users/data?page=abc | 200，使用默认page=1 |
| A04-V02 | 参数校验 | order参数非法 | admin用户已登录 | GET /api/db/tables/users/data?order=INVALID | 200，默认ASC |
| A04-V03 | 参数校验 | 表名含特殊字符 | admin用户已登录 | GET /api/db/tables/drop%20table/data | 500，"无效的表名格式" |
| A04-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/tables/users/data | 403 |
| A04-DC01 | 数据一致性 | 分页数据总数一致 | admin用户已登录，表有数据 | 分别请求page=1和page=2 | total值一致，rows无重复 |
| A04-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/tables/users/data | data包含columns、rows、pagination，pagination含page/pageSize/total/totalPages |

### A05 GET /api/db/backups — 获取备份列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A05-P01 | 正向流程 | 有备份文件时获取列表 | admin用户已登录，backup目录有备份文件 | GET /api/db/backups | 200，{success:true, data:[{fileName, version, exportedAt, tableCount, totalRows, hash, fileSize}]} |
| A05-P02 | 正向流程 | 无备份文件时获取列表 | admin用户已登录，backup目录为空 | GET /api/db/backups | 200，{success:true, data:[]} |
| A05-P03 | 正向流程 | backup目录不存在 | backup目录未创建 | GET /api/db/backups | 200，{success:true, data:[]} |
| A05-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/backups | 403 |
| A05-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录 | 连续两次 GET /api/db/backups | 两次响应的备份列表一致 |
| A05-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/backups | data为数组，每个元素包含fileName/version/exportedAt/tableCount/totalRows/hash/fileSize |

### A06 POST /api/db/backups — 创建备份

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A06-P01 | 正向流程 | 成功创建备份 | admin用户已登录，数据库有数据 | POST /api/db/backups | 201，{success:true, data:{fileName, version:"2.0", exportedAt, tableCount, totalRows, fileSize, hash}} |
| A06-P02 | 正向流程 | 备份文件密码脱敏 | admin用户已登录，users表有密码字段 | POST /api/db/backups | 备份文件中users表的password字段为"[REDACTED]" |
| A06-P03 | 正向流程 | 备份文件API Key脱敏 | admin用户已登录，ai_models表有api_key字段 | POST /api/db/backups | 备份文件中ai_models表的api_key字段为"[REDACTED]" |
| A06-P04 | 正向流程 | 备份超过10个自动清理 | backup目录已有10个备份文件 | POST /api/db/backups | 创建新备份后，仅保留最新10个 |
| A06-P05 | 正向流程 | backup目录不存在时自动创建 | backup目录不存在 | POST /api/db/backups | 自动创建目录并成功备份 |
| A06-E01 | 异常流程 | 数据库文件被锁定 | 数据库正在被其他进程写入 | POST /api/db/backups | 500，{success:false, error:{code:"INTERNAL_ERROR"}} |
| A06-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | POST /api/db/backups | 403 |
| A06-DC01 | 数据一致性 | 备份数据与数据库一致 | admin用户已登录 | POST /api/db/backups，然后下载备份文件 | 备份中各表行数与数据库实际行数一致 |
| A06-I01 | 幂等性 | 连续创建备份 | admin用户已登录 | 连续两次 POST /api/db/backups | 两次均201，文件名不同（时间戳不同） |
| A06-X-SQ01 | SQLite并发写入 | 并发创建备份 | admin用户已登录 | 同时发送2个 POST /api/db/backups | 至少一个成功，无数据损坏 |
| A06-X-SE01 | 错误信息安全 | 500错误不泄露路径 | 数据库异常 | 触发500错误 | 响应不暴露服务器文件路径 |
| A06-X-CT01 | Content-Type校验 | 不需要请求体 | admin用户已登录 | POST /api/db/backups，Content-Type: application/json，Body: {} | 201，忽略请求体 |

### A07 GET /api/db/backups/:fileName/download — 下载备份文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A07-P01 | 正向流程 | 下载存在的备份文件 | admin用户已登录，备份文件存在 | GET /api/db/backups/tingstudio_backup_2026-06-07T00-00-00.json/download | 200，Content-Type: application/json，Content-Disposition: attachment |
| A07-E01 | 异常流程 | 下载不存在的备份文件 | admin用户已登录 | GET /api/db/backups/tingstudio_backup_nonexistent.json/download | 404，{success:false, error:{message:"备份文件不存在", code:"NOT_FOUND"}} |
| A07-E02 | 异常流程 | 文件名格式非法 | admin用户已登录 | GET /api/db/backups/../../etc/passwd/download | 500，"无效的备份文件名格式" |
| A07-B01 | 边界条件 | 文件名含路径遍历字符 | admin用户已登录 | GET /api/db/backups/../config.json/download | 500，"无效的备份文件名格式" |
| A07-V01 | 参数校验 | 文件名缺少 | admin用户已登录 | GET /api/db/backups//download | 400或路由不匹配 |
| A07-V02 | 参数校验 | 文件名非.json后缀 | admin用户已登录 | GET /api/db/backups/backup.txt/download | 500，"无效的备份文件名格式" |
| A07-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/backups/{fileName}/download | 403 |
| A07-X-SE01 | 错误信息安全 | 路径遍历不泄露文件 | admin用户已登录 | 尝试路径遍历 | 不返回系统文件内容 |
| A07-X-RF01 | 响应格式一致性 | 下载响应为原始JSON | admin用户已登录 | GET /api/db/backups/{fileName}/download | 响应为JSON格式，含version/tables/meta等字段 |

### A08 POST /api/db/backups/:fileName/restore — 从备份恢复

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A08-P01 | 正向流程 | 成功从备份恢复 | admin用户已登录，备份文件存在且有效 | POST /api/db/backups/tingstudio_backup_2026-06-07T00-00-00.json/restore | 200，{success:true, data:{fileName, tableCount, insertedRows, skippedRows, restoredAt}} |
| A08-E01 | 异常流程 | 备份文件不存在 | admin用户已登录 | POST /api/db/backups/tingstudio_backup_nonexistent.json/restore | 500，错误信息包含"不存在" |
| A08-E02 | 异常流程 | 备份文件格式无效 | admin用户已登录，备份文件内容为非JSON | POST /api/db/backups/{corruptedFile}/restore | 500，错误信息包含"无效的备份文件格式" |
| A08-E03 | 异常流程 | 备份文件缺少必要字段 | admin用户已登录，备份JSON缺少tables字段 | POST /api/db/backups/{invalidFile}/restore | 500，"无效的备份文件格式" |
| A08-E04 | 异常流程 | 文件名格式非法 | admin用户已登录 | POST /api/db/backups/../../etc/passwd/restore | 500，"无效的备份文件名格式" |
| A08-B01 | 边界条件 | 恢复空备份（无表数据） | admin用户已登录，备份文件tables为空数组 | POST /api/db/backups/{emptyBackup}/restore | 200，insertedRows=0, skippedRows=0 |
| A08-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | POST /api/db/backups/{fileName}/restore | 403 |
| A08-DC01 | 数据一致性 | 恢复后数据与备份一致 | admin用户已登录 | 先备份，修改数据，再恢复 | 恢复后各表数据与备份时一致 |
| A08-DC02 | 数据一致性 | 恢复时外键约束处理 | admin用户已登录 | 恢复含外键关联的表 | foreign_keys临时关闭，恢复后重新启用 |
| A08-I01 | 幂等性 | 重复恢复同一备份 | admin用户已登录 | 连续两次 POST /api/db/backups/{fileName}/restore | 两次均成功，第二次数据与第一次一致（先DELETE再INSERT） |
| A08-S01 | 状态流转 | 恢复前自动清空目标表 | admin用户已登录，表中有数据 | POST /api/db/backups/{fileName}/restore | 恢复前先DELETE目标表数据，再INSERT备份数据 |
| A08-X-SQ01 | SQLite并发写入 | 并发恢复操作 | admin用户已登录 | 同时发送2个恢复请求 | 至少一个成功，数据库不损坏（事务保护） |
| A08-X-SE01 | 错误信息安全 | 500错误不泄露SQL | admin用户已登录 | 使用损坏的备份文件 | 响应不包含SQL语句或堆栈信息 |

### A09 DELETE /api/db/backups/:fileName — 删除备份

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A09-P01 | 正向流程 | 成功删除备份文件 | admin用户已登录，备份文件存在 | DELETE /api/db/backups/tingstudio_backup_2026-06-07T00-00-00.json | 200，{success:true, data:{fileName, deleted:true}} |
| A09-E01 | 异常流程 | 删除不存在的备份文件 | admin用户已登录 | DELETE /api/db/backups/tingstudio_backup_nonexistent.json | 500，错误信息包含"不存在" |
| A09-E02 | 异常流程 | 文件名格式非法 | admin用户已登录 | DELETE /api/db/backups/../../etc/passwd | 500，"无效的备份文件名格式" |
| A09-B01 | 边界条件 | 文件名含路径遍历 | admin用户已登录 | DELETE /api/db/backups/../config.json | 500，"无效的备份文件名格式" |
| A09-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | DELETE /api/db/backups/{fileName} | 403 |
| A09-DC01 | 数据一致性 | 删除后文件不再出现在列表 | admin用户已登录 | DELETE后 GET /api/db/backups | 列表中不再包含已删除的文件 |
| A09-I01 | 幂等性 | 重复删除同一文件 | admin用户已登录 | 连续两次 DELETE 同一文件 | 第一次200，第二次500（文件不存在） |
| A09-X-SE01 | 错误信息安全 | 路径遍历不删除系统文件 | admin用户已登录 | 尝试路径遍历删除 | 不删除系统文件，返回"无效的备份文件名格式" |

### A10 POST /api/db/backups/upload-restore — 上传文件并恢复

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A10-P01 | 正向流程 | 上传有效JSON备份并恢复 | admin用户已登录 | POST /api/db/backups/upload-restore，multipart/form-data，file字段为有效JSON | 200，{success:true, data:{originalName, tableCount, insertedRows, skippedRows, restoredAt}} |
| A10-E01 | 异常流程 | 未上传文件 | admin用户已登录 | POST /api/db/backups/upload-restore，无file字段 | 400，{success:false, error:{message:"缺少备份文件", code:"VALIDATION_ERROR"}} |
| A10-E02 | 异常流程 | 上传非JSON文件 | admin用户已登录 | POST /api/db/backups/upload-restore，file字段为.txt文件 | multer拒绝，错误"仅支持 .json 格式的备份文件" |
| A10-E03 | 异常流程 | 上传无效JSON内容 | admin用户已登录 | POST /api/db/backups/upload-restore，file字段为.json但内容无效 | 500，"无法解析上传的文件" |
| A10-E04 | 异常流程 | 上传JSON缺少必要字段 | admin用户已登录 | POST /api/db/backups/upload-restore，file为{version:"1.0"} | 500，"无效的备份文件格式，缺少必要字段" |
| A10-B01 | 边界条件 | 上传超大文件（接近100MB限制） | admin用户已登录 | POST /api/db/backups/upload-restore，file接近100MB | 正常处理或返回文件大小超限错误 |
| A10-B02 | 边界条件 | 上传空JSON文件 | admin用户已登录 | POST /api/db/backups/upload-restore，file为{} | 500，"无效的备份文件格式" |
| A10-V01 | 参数校验 | 文件字段名错误 | admin用户已登录 | POST /api/db/backups/upload-restore，字段名为"file"而非"backup" | 400，"缺少备份文件" |
| A10-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | POST /api/db/backups/upload-restore | 403 |
| A10-DC01 | 数据一致性 | 上传恢复后数据与文件一致 | admin用户已登录 | 上传有效备份文件 | 数据库数据与备份文件内容一致 |
| A10-X-LB01 | 请求体大小限制 | 超过100MB文件 | admin用户已登录 | 上传>100MB的文件 | multer拒绝，返回文件大小超限错误 |
| A10-X-SE01 | 错误信息安全 | 恢复失败不泄露内部信息 | admin用户已登录 | 上传损坏的备份文件 | 响应不包含堆栈或SQL信息 |

### A11 GET /api/db/scripts — 获取脚本列表

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A11-P01 | 正向流程 | 获取脚本列表 | admin用户已登录 | GET /api/db/scripts | 200，{success:true, data:{categories:[...], scripts:[...], total}} |
| A11-P02 | 正向流程 | 脚本列表包含执行状态 | admin用户已登录，有脚本执行记录 | GET /api/db/scripts | scripts中每个元素包含lastExecutedAt和lastStatus |
| A11-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/scripts | 403 |
| A11-I01 | 幂等性 | 重复请求结果一致 | admin用户已登录 | 连续两次 GET /api/db/scripts | 两次响应的脚本列表一致 |
| A11-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/scripts | data包含categories（数组）、scripts（数组）、total（数字） |

### A12 POST /api/db/scripts/:scriptId/execute — 执行脚本

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A12-P01 | 正向流程 | 执行低风险脚本 | admin用户已登录，脚本存在 | POST /api/db/scripts/verify-data/execute | 200，{success:true, data:{scriptId, scriptName, status:"completed", durationMs, resultSummary}} |
| A12-P02 | 正向流程 | 执行脚本记录日志 | admin用户已登录 | POST /api/db/scripts/verify-data/execute | db_script_logs表新增一条记录，status为"completed"或"failed" |
| A12-P03 | 正向流程 | 脚本执行失败返回失败信息 | admin用户已登录，脚本会抛出异常 | POST /api/db/scripts/{failScript}/execute | 200，data.status="failed"，data.errorMessage非空 |
| A12-E01 | 异常流程 | 脚本不存在 | admin用户已登录 | POST /api/db/scripts/nonexistent/execute | 500，错误信息包含"脚本不存在" |
| A12-E02 | 异常流程 | 脚本文件不存在 | admin用户已登录，脚本注册但文件缺失 | POST /api/db/scripts/{missingFileScript}/execute | 200，data.status="failed"，errorMessage包含"脚本文件不存在" |
| A12-E03 | 异常流程 | 脚本ID含特殊字符 | admin用户已登录 | POST /api/db/scripts/;DROP%20TABLE/execute | 500，"无效的脚本ID格式" |
| A12-B01 | 边界条件 | 脚本ID为空 | admin用户已登录 | POST /api/db/scripts//execute | 400或路由不匹配 |
| A12-V01 | 参数校验 | 脚本ID含空格 | admin用户已登录 | POST /api/db/scripts/my%20script/execute | 500，"无效的脚本ID格式" |
| A12-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | POST /api/db/scripts/verify-data/execute | 403 |
| A12-DC01 | 数据一致性 | 执行日志记录完整 | admin用户已登录 | POST /api/db/scripts/verify-data/execute | db_script_logs中记录包含scriptId、triggeredBy、startedAt、completedAt |
| A12-X-SQ01 | SQLite并发写入 | 并发执行同一脚本 | admin用户已登录 | 同时发送2个执行请求 | 两个请求均返回结果，日志记录2条 |
| A12-X-SE01 | 错误信息安全 | 脚本执行错误不泄露路径 | admin用户已登录 | 执行失败的脚本 | 响应不暴露服务器文件路径 |

### A13 GET /api/db/scripts/:scriptId/history — 获取脚本执行历史

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A13-P01 | 正向流程 | 获取脚本执行历史 | admin用户已登录，有执行记录 | GET /api/db/scripts/verify-data/history | 200，{success:true, data:[{id, scriptId, scriptName, triggeredBy, status, startedAt, completedAt, durationMs, resultSummary, errorMessage}]} |
| A13-P02 | 正向流程 | 指定limit参数 | admin用户已登录 | GET /api/db/scripts/verify-data/history?limit=5 | 200，返回最多5条记录 |
| A13-P03 | 正向流程 | 无执行历史 | admin用户已登录，脚本未执行过 | GET /api/db/scripts/verify-data/history | 200，{success:true, data:[]} |
| A13-B01 | 边界条件 | limit=0 | admin用户已登录 | GET /api/db/scripts/verify-data/history?limit=0 | 200，自动修正为1 |
| A13-B02 | 边界条件 | limit=999 | admin用户已登录 | GET /api/db/scripts/verify-data/history?limit=999 | 200，自动修正为50（最大值） |
| A13-B03 | 边界条件 | limit为负数 | admin用户已登录 | GET /api/db/scripts/verify-data/history?limit=-1 | 200，自动修正为1 |
| A13-V01 | 参数校验 | limit为非数字 | admin用户已登录 | GET /api/db/scripts/verify-data/history?limit=abc | 200，使用默认值10 |
| A13-V02 | 参数校验 | 脚本ID含特殊字符 | admin用户已登录 | GET /api/db/scripts/;DROP/history | 500，"无效的脚本ID格式" |
| A13-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/scripts/verify-data/history | 403 |
| A13-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/scripts/verify-data/history | data为数组，每个元素camelCase格式 |

### A14 GET /api/db/scripts/:scriptId/content — 获取脚本内容

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A14-P01 | 正向流程 | 获取存在的脚本内容 | admin用户已登录，脚本文件存在 | GET /api/db/scripts/verify-data/content | 200，{success:true, data:{content, scriptPath}} |
| A14-E01 | 异常流程 | 脚本不存在 | admin用户已登录 | GET /api/db/scripts/nonexistent/content | 500，"脚本不存在" |
| A14-E02 | 异常流程 | 脚本文件不存在 | admin用户已登录，脚本注册但文件缺失 | GET /api/db/scripts/{missingFile}/content | 500，"脚本文件不存在" |
| A14-V01 | 参数校验 | 脚本ID含特殊字符 | admin用户已登录 | GET /api/db/scripts/;DROP/content | 500，"无效的脚本ID格式" |
| A14-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/scripts/verify-data/content | 403 |
| A14-X-SE01 | 错误信息安全 | 不泄露脚本文件绝对路径 | admin用户已登录 | GET /api/db/scripts/verify-data/content | data.scriptPath为相对路径，非绝对路径 |

### A15 PUT /api/db/scripts/:scriptId/content — 更新脚本内容

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A15-P01 | 正向流程 | 更新脚本内容 | admin用户已登录，脚本存在 | PUT /api/db/scripts/verify-data/content，Body:{content:"console.log('test')"} | 200，{success:true, data:{scriptPath}} |
| A15-P02 | 正向流程 | 更新时自动保存版本 | admin用户已登录 | PUT /api/db/scripts/verify-data/content，Body:{content:"new content"} | db_script_versions表新增一条旧版本记录 |
| A15-P03 | 正向流程 | 带变更摘要更新 | admin用户已登录 | PUT /api/db/scripts/verify-data/content，Body:{content:"new", changeSummary:"修复bug"} | 版本记录的change_summary为"修复bug" |
| A15-P04 | 正向流程 | 内容未变不创建版本 | admin用户已登录 | PUT /api/db/scripts/verify-data/content，Body:{content:"与当前内容相同"} | db_script_versions表不新增记录 |
| A15-E01 | 异常流程 | 脚本不存在 | admin用户已登录 | PUT /api/db/scripts/nonexistent/content | 500，"脚本不存在" |
| A15-E02 | 异常流程 | 脚本文件不存在 | admin用户已登录 | PUT /api/db/scripts/{missingFile}/content | 500，"脚本文件不存在" |
| A15-V01 | 参数校验 | 缺少content字段 | admin用户已登录 | PUT /api/db/scripts/verify-data/content，Body:{} | 400，{success:false, error:{message:"Content is required", code:"VALIDATION_ERROR"}} |
| A15-V02 | 参数校验 | content为非字符串 | admin用户已登录 | PUT /api/db/scripts/verify-data/content，Body:{content:123} | 400，{success:false, error:{message:"Content is required", code:"VALIDATION_ERROR"}} |
| A15-V03 | 参数校验 | 脚本ID含特殊字符 | admin用户已登录 | PUT /api/db/scripts/;DROP/content | 500，"无效的脚本ID格式" |
| A15-B01 | 边界条件 | changeSummary超长 | admin用户已登录 | PUT /api/db/scripts/verify-data/content，Body:{content:"x", changeSummary:201字符} | changeSummary自动截断为200字符 |
| A15-B02 | 边界条件 | 版本数超过MAX_VERSIONS_PER_SCRIPT | admin用户已登录，已有20个版本 | PUT 更新内容 | 自动清理最旧版本，保留20个 |
| A15-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | PUT /api/db/scripts/verify-data/content | 403 |
| A15-DC01 | 数据一致性 | 更新后文件内容与请求一致 | admin用户已登录 | PUT 更新后 GET 脚本内容 | 返回的content与PUT请求的content一致 |
| A15-X-SE01 | 错误信息安全 | 写入失败不泄露路径 | admin用户已登录 | 文件系统只读 | 响应不暴露服务器文件路径 |

### A16 GET /api/db/scripts/:scriptId/versions — 获取脚本版本历史

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A16-P01 | 正向流程 | 获取脚本版本历史 | admin用户已登录，有版本记录 | GET /api/db/scripts/verify-data/versions | 200，{success:true, data:[{id, scriptId, scriptName, scriptPath, content, savedBy, savedAt, changeSummary}]} |
| A16-P02 | 正向流程 | 指定limit参数 | admin用户已登录 | GET /api/db/scripts/verify-data/versions?limit=10 | 200，返回最多10条 |
| A16-P03 | 正向流程 | 无版本历史 | admin用户已登录，脚本未修改过 | GET /api/db/scripts/verify-data/versions | 200，{success:true, data:[]} |
| A16-B01 | 边界条件 | limit=0 | admin用户已登录 | GET /api/db/scripts/verify-data/versions?limit=0 | 200，自动修正为1 |
| A16-B02 | 边界条件 | limit=999 | admin用户已登录 | GET /api/db/scripts/verify-data/versions?limit=999 | 200，自动修正为50 |
| A16-V01 | 参数校验 | 脚本ID含特殊字符 | admin用户已登录 | GET /api/db/scripts/;DROP/versions | 500，"无效的脚本ID格式" |
| A16-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | GET /api/db/scripts/verify-data/versions | 403 |
| A16-X-RF01 | 响应格式一致性 | 响应结构符合规范 | admin用户已登录 | GET /api/db/scripts/verify-data/versions | data为数组，每个元素camelCase格式 |

### A17 POST /api/db/scripts/:scriptId/versions/restore — 恢复脚本版本

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求 | 预期结果 |
|--------|------|----------|----------|------|----------|
| A17-P01 | 正向流程 | 成功恢复脚本版本 | admin用户已登录，版本记录存在 | POST /api/db/scripts/verify-data/versions/restore，Body:{versionId:"xxx"} | 200，{success:true, data:{scriptPath}} |
| A17-P02 | 正向流程 | 恢复前自动备份当前内容 | admin用户已登录 | POST /api/db/scripts/verify-data/versions/restore | db_script_versions新增一条"恢复版本前自动备份"的记录 |
| A17-E01 | 异常流程 | 版本不存在 | admin用户已登录 | POST /api/db/scripts/verify-data/versions/restore，Body:{versionId:"nonexistent"} | 500，"版本记录不存在" |
| A17-E02 | 异常流程 | 脚本不存在 | admin用户已登录 | POST /api/db/scripts/nonexistent/versions/restore | 500，"脚本不存在" |
| A17-V01 | 参数校验 | 缺少versionId | admin用户已登录 | POST /api/db/scripts/verify-data/versions/restore，Body:{} | 400，{success:false, error:{message:"Script ID and version ID are required", code:"VALIDATION_ERROR"}} |
| A17-V02 | 参数校验 | versionId含特殊字符 | admin用户已登录 | POST /api/db/scripts/verify-data/versions/restore，Body:{versionId:";DROP"} | 500，"无效的ID格式" |
| A17-V03 | 参数校验 | 脚本ID含特殊字符 | admin用户已登录 | POST /api/db/scripts/;DROP/versions/restore | 500，"无效的ID格式" |
| A17-R01 | 权限认证 | formulist角色访问 | formulist用户已登录 | POST /api/db/scripts/verify-data/versions/restore | 403 |
| A17-DC01 | 数据一致性 | 恢复后脚本内容与版本一致 | admin用户已登录 | 恢复后 GET 脚本内容 | content与版本记录中的content一致 |
| A17-I01 | 幂等性 | 重复恢复同一版本 | admin用户已登录 | 连续两次恢复同一versionId | 两次均成功，内容一致（第二次恢复前也会自动备份） |
| A17-X-SE01 | 错误信息安全 | 恢复失败不泄露路径 | admin用户已登录 | 使用不存在的versionId | 响应不暴露服务器文件路径 |

## 三、特殊场景测试

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SQ-DB01 | SQLite并发写入 | 并发创建备份和恢复 | admin用户已登录 | 同时POST创建备份和POST恢复备份 | 两个操作不互相干扰，数据库不损坏 |
| X-SQ-DB02 | SQLite并发写入 | 并发执行多个脚本 | admin用户已登录 | 同时执行2个不同脚本 | 两个脚本均正常完成，日志记录正确 |
| X-MD-DB01 | 请求方法限制 | GET端点使用POST | admin用户已登录 | POST /api/db/info | 404或405 |
| X-MD-DB02 | 请求方法限制 | POST端点使用GET | admin用户已登录 | GET /api/db/backups（创建备份） | 200，返回备份列表而非创建备份 |
| X-MD-DB03 | 请求方法限制 | DELETE端点使用GET | admin用户已登录 | GET /api/db/backups/{fileName}（删除） | 200，返回备份列表而非删除 |
| X-SE-DB01 | 错误信息安全 | 所有500错误不泄露堆栈 | admin用户已登录 | 触发各种500错误 | 响应不含stack trace、文件路径、SQL语句 |
| X-SE-DB02 | 错误信息安全 | 备份文件密码脱敏 | admin用户已登录 | 创建备份并下载 | 备份JSON中users.password为"[REDACTED]" |
| X-SE-DB03 | 错误信息安全 | 备份文件API Key脱敏 | admin用户已登录 | 创建备份并下载 | 备份JSON中ai_models.api_key为"[REDACTED]" |
| X-RF-DB01 | 响应格式一致性 | 所有成功响应包含success:true | admin用户已登录 | 遍历所有GET/POST/PUT/DELETE端点 | 所有成功响应包含success:true和data字段 |
| X-RF-DB02 | 响应格式一致性 | 所有错误响应包含error对象 | admin用户已登录 | 触发各种错误 | 错误响应包含success:false和error:{message, code} |
| X-CT-DB01 | Content-Type校验 | POST请求Content-Type | admin用户已登录 | POST /api/db/backups/upload-restore，Content-Type非multipart/form-data | multer拒绝或400 |
| X-LB-DB01 | 请求体大小限制 | 上传文件超过100MB | admin用户已登录 | 上传>100MB文件 | multer拒绝，返回文件大小超限 |
| X-SE-DB04 | 安全-路径遍历 | 备份文件名路径遍历 | admin用户已登录 | 使用../../etc/passwd作为fileName | 正则校验拒绝，不返回系统文件 |
| X-SE-DB05 | 安全-SQL注入 | 表名SQL注入 | admin用户已登录 | 使用SQL注入作为tableName | 正则校验`/^[a-zA-Z0-9_]+$/`拒绝 |
| X-SE-DB06 | 安全-SQL注入 | 脚本ID SQL注入 | admin用户已登录 | 使用SQL注入作为scriptId | 正则校验`/^[a-zA-Z0-9\-_]+$/`拒绝 |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| A01 GET /info | 1 | 1 | 0 | 3 | 0 | 0 | 0 | 1 | 0 | 6 |
| A02 GET /tables | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 0 | 5 |
| A03 GET /tables/:name/schema | 2 | 2 | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 9 |
| A04 GET /tables/:name/data | 4 | 2 | 5 | 1 | 3 | 0 | 1 | 0 | 0 | 16 |
| A05 GET /backups | 3 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 5 |
| A06 POST /backups | 5 | 1 | 0 | 1 | 0 | 0 | 1 | 1 | 0 | 9 |
| A07 GET /backups/:name/download | 1 | 2 | 2 | 1 | 2 | 0 | 0 | 0 | 0 | 8 |
| A08 POST /backups/:name/restore | 1 | 4 | 1 | 1 | 0 | 1 | 2 | 1 | 0 | 11 |
| A09 DELETE /backups/:name | 1 | 2 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 7 |
| A10 POST /backups/upload-restore | 1 | 4 | 2 | 1 | 1 | 0 | 1 | 0 | 0 | 10 |
| A11 GET /scripts | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 4 |
| A12 POST /scripts/:id/execute | 3 | 3 | 1 | 1 | 1 | 0 | 1 | 0 | 0 | 10 |
| A13 GET /scripts/:id/history | 3 | 0 | 3 | 1 | 2 | 0 | 0 | 0 | 0 | 9 |
| A14 GET /scripts/:id/content | 1 | 2 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 5 |
| A15 PUT /scripts/:id/content | 4 | 2 | 2 | 1 | 3 | 0 | 1 | 0 | 0 | 13 |
| A16 GET /scripts/:id/versions | 3 | 0 | 2 | 1 | 1 | 0 | 0 | 0 | 0 | 7 |
| A17 POST /scripts/:id/versions/restore | 2 | 2 | 0 | 1 | 3 | 0 | 1 | 1 | 0 | 10 |
| **合计** | **39** | **27** | **21** | **19** | **19** | **1** | **9** | **8** | **0** | **143** |

> 注：db模块所有端点仅admin可访问，数据隔离维度（DI）不适用（无created_by区分），记为0。
> 特殊场景测试15条，总计 143 + 15 = **158条**。
