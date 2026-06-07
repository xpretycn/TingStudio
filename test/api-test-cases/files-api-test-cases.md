# 文件管理 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-FILE-20260607-001 |
| 路由文件 | backend/src/routes/files.ts |
| 控制器文件 | backend/src/controllers/fileController.ts |
| 服务文件 | 无（逻辑在控制器中） |
| 端点数 | 14 |
| 测试用例数 | 128 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| C01 | GET | /api/files | 是 | 文件列表查询 |
| C02 | GET | /api/files/stats | 是 | 文件统计 |
| C03 | POST | /api/files/upload | 是 | 上传文件 |
| C04 | POST | /api/files/batch-delete | 是 | 批量删除文件 |
| C05 | POST | /api/files/batch-archive | 是 | 批量归档文件 |
| C06 | POST | /api/files/fix-garbled | 是 | 修复乱码文件名 |
| C07 | GET | /api/files/:fileId | 是 | 获取文件详情 |
| C08 | GET | /api/files/:fileId/preview | 是 | 预览文件 |
| C09 | GET | /api/files/:fileId/thumbnail | 是 | 获取缩略图 |
| C10 | GET | /api/files/:fileId/download | 是 | 下载文件 |
| C11 | GET | /api/files/:fileId/audit | 是 | 获取文件审计日志 |
| C12 | POST | /api/files/:fileId/link | 是 | 关联文件 |
| C13 | POST | /api/files/:fileId/unlink | 是 | 取消关联 |
| C14 | GET | /api/files/:fileId/relations | 是 | 获取关联关系 |
| C15 | POST | /api/files/:fileId/reparse | 是 | 重新解析文件 |
| C16 | DELETE | /api/files/:fileId | 是(admin) | 删除文件 |

> 注：路由文件中定义了15个端点（含stats），但按任务描述为12个端点。实际按代码统计为15个端点+1个DELETE=16个路由定义。此处按实际代码列出。

## 二、测试用例

### C01 GET /api/files — 文件列表查询

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C01-P01 | 正向流程 | 获取全部文件列表 | 存在已上传文件 | GET /api/files | 200, `{success:true, data:{list:[...],total:N,stats:{total,parsed,linked,pending}}}` |
| C01-P02 | 正向流程 | 按关键词搜索 | 存在文件"配方表.xlsx" | GET /api/files?keyword=配方 | 200, list 包含匹配文件 |
| C01-P03 | 正向流程 | 按文件类型筛选 | 存在formula和material类型文件 | GET /api/files?fileType=formula | 200, list 仅包含 formula 类型 |
| C01-P04 | 正向流程 | 按状态筛选 | 存在不同状态文件 | GET /api/files?status=parsed | 200, list 仅包含 parsed 状态 |
| C01-P05 | 正向流程 | 按关联状态筛选 | 存在已关联和未关联文件 | GET /api/files?relatedStatus=unlinked | 200, list 仅包含未关联文件 |
| C01-P06 | 正向流程 | 按日期范围筛选 | 存在不同日期文件 | GET /api/files?startDate=2026-01-01&endDate=2026-06-30 | 200, list 仅包含日期范围内的文件 |
| C01-E01 | 异常流程 | 数据库查询异常 | 数据库连接失败 | GET /api/files | 500, `{success:false, message:"获取文件列表失败"}` |
| C01-B01 | 边界条件 | 无文件数据 | uploaded_files表为空 | GET /api/files | 200, `{data:{list:[],total:0,stats:{total:0,...}}}` |
| C01-B02 | 边界条件 | keyword含SQL注入字符 | 存在文件 | GET /api/files?keyword=' OR 1=1 -- | 200, 不执行注入，返回空或正常结果 |
| C01-B03 | 边界条件 | page为0 | 存在文件 | GET /api/files?page=0 | 200, 使用默认page=1 |
| C01-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files | 401 |
| C01-V01 | 参数校验 | relatedStatus为非法值 | 存在文件 | GET /api/files?relatedStatus=invalid | 200, 忽略该筛选条件 |
| C01-DI01 | 数据隔离 | 所有登录用户可见全部文件 | formulist用户A | GET /api/files | 200, 可见所有用户上传的文件（无created_by过滤） |

### C02 GET /api/files/stats — 文件统计

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C02-P01 | 正向流程 | 获取文件统计 | 存在文件数据 | GET /api/files/stats | 200, `{success:true, data:{total,parsed,linked,pending,totalSize}}` |
| C02-B01 | 边界条件 | 无文件数据 | uploaded_files表为空 | GET /api/files/stats | 200, `{data:{total:0,parsed:0,linked:0,pending:0,totalSize:0}}` |
| C02-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/stats | 401 |
| C02-DC01 | 数据一致性 | 统计数据与列表一致 | 存在文件 | 分别请求 /api/files 和 /api/files/stats | stats.total 等于列表 total |

### C03 POST /api/files/upload — 上传文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C03-P01 | 正向流程 | 上传xlsx文件 | 用户已登录 | POST, file=valid.xlsx, fileType=formula | 201, `{success:true, data:{fileId,originalName,storagePath,...}, message:"文件上传成功"}` |
| C03-P02 | 正向流程 | 上传图片文件 | 用户已登录 | POST, file=test.png, fileType=material | 201 |
| C03-P03 | 正向流程 | 上传csv文件 | 用户已登录 | POST, file=data.csv | 201 |
| C03-P04 | 正向流程 | 默认fileType为formula | 用户已登录 | POST, file=valid.xlsx（无fileType） | 201, file_type="formula" |
| C03-E01 | 异常流程 | 未上传文件 | 用户已登录 | POST, 无file字段 | 400, `{success:false, message:"请上传文件"}` |
| C03-E02 | 异常流程 | 上传不支持的文件类型 | 用户已登录 | POST, file=test.exe | multer拒绝，"不支持的文件类型" |
| C03-E03 | 异常流程 | 上传超过10MB的文件 | 用户已登录 | POST, file=11mb.xlsx | multer拒绝，文件大小超限 |
| C03-B01 | 边界条件 | 上传文件名含中文 | 用户已登录 | POST, file=配方数据.xlsx | 201, original_name 正确保存中文 |
| C03-B02 | 边界条件 | 上传文件名含特殊字符 | 用户已登录 | POST, file=test(1).xlsx | 201, 文件名正确处理 |
| C03-B03 | 边界条件 | 上传刚好10MB的文件 | 用户已登录 | POST, file=10mb.xlsx | 201 或 multer拒绝（边界值） |
| C03-V01 | 参数校验 | file字段名不正确 | 用户已登录 | POST, 字段名为"document" | 400, "请上传文件" |
| C03-R01 | 权限认证 | 未登录上传 | 无Token | POST, file=valid.xlsx | 401 |
| C03-R02 | 权限认证 | admin上传文件 | admin用户 | POST, file=valid.xlsx | 201 |
| C03-R03 | 权限认证 | formulist上传文件 | formulist用户 | POST, file=valid.xlsx | 201 |
| C03-DC01 | 数据一致性 | 上传后数据库记录正确 | 用户已登录 | POST 上传 | uploaded_files 表存在记录，status='uploaded'，version=1 |
| C03-DC02 | 数据一致性 | 上传后审计日志正确 | 用户已登录 | POST 上传 | file_audit_log 存在 action='upload' 的记录 |
| C03-DC03 | 数据一致性 | 文件实际存储到磁盘 | 用户已登录 | POST 上传 | 磁盘 data/uploads/{fileType}/{yyyy-mm}/ 目录下存在文件 |
| C03-S01 | 状态流转 | 上传后文件状态为uploaded | 用户已登录 | POST 上传 | status='uploaded' |
| C03-I01 | 幂等性 | 上传同名文件生成不同ID | 用户已登录 | 连续2次上传同名文件 | 两次均201，fileId 不同 |

### C04 POST /api/files/batch-delete — 批量删除文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C04-P01 | 正向流程 | admin批量删除文件 | admin用户，存在多个文件 | POST, `{fileIds:["f001","f002"]}` | 200, `{success:true, data:{deleted:2,failed:0}}` |
| C04-P02 | 正向流程 | 部分文件不存在 | admin用户 | POST, `{fileIds:["f001","nonexist"]}` | 200, `{data:{deleted:1,failed:1}}` |
| C04-E01 | 异常流程 | formulist无权批量删除 | formulist用户 | POST, `{fileIds:["f001"]}` | 403, `{success:false, message:"仅管理员可批量删除文件"}` |
| C04-E02 | 异常流程 | fileIds为空数组 | admin用户 | POST, `{fileIds:[]}` | 400, `{success:false, message:"请提供要删除的文件ID列表"}` |
| C04-E03 | 异常流程 | fileIds不是数组 | admin用户 | POST, `{fileIds:"f001"}` | 400 |
| C04-V01 | 参数校验 | 缺少fileIds字段 | admin用户 | POST, `{}` | 400 |
| C04-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{fileIds:["f001"]}` | 401 |
| C04-DC01 | 数据一致性 | 删除后数据库记录消失 | admin用户 | POST batch-delete | uploaded_files 表中无已删除记录 |
| C04-DC02 | 数据一致性 | 删除后磁盘文件消失 | admin用户 | POST batch-delete | 磁盘上对应文件被删除 |
| C04-DC03 | 数据一致性 | 删除后审计日志正确 | admin用户 | POST batch-delete | file_audit_log 存在 action='delete', detail.batch=true |
| C04-X-BT01 | 批量操作 | 批量删除大量文件 | admin用户，存在50个文件 | POST, fileIds含50个ID | 200, deleted=50 |

### C05 POST /api/files/batch-archive — 批量归档文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C05-P01 | 正向流程 | 批量归档文件 | 用户已登录，存在多个文件 | POST, `{fileIds:["f001","f002"]}` | 200, `{success:true, data:{archived:2,failed:0}}` |
| C05-P02 | 正向流程 | 部分文件不存在 | 用户已登录 | POST, `{fileIds:["f001","nonexist"]}` | 200, `{data:{archived:1,failed:1}}` |
| C05-E01 | 异常流程 | fileIds为空数组 | 用户已登录 | POST, `{fileIds:[]}` | 400, `{success:false, message:"请提供要归档的文件ID列表"}` |
| C05-E02 | 异常流程 | fileIds不是数组 | 用户已登录 | POST, `{fileIds:"f001"}` | 400 |
| C05-V01 | 参数校验 | 缺少fileIds字段 | 用户已登录 | POST, `{}` | 400 |
| C05-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{fileIds:["f001"]}` | 401 |
| C05-DC01 | 数据一致性 | 归档后文件状态变为archived | 用户已登录 | POST batch-archive | 数据库中 status='archived' |
| C05-DC02 | 数据一致性 | 归档后审计日志正确 | 用户已登录 | POST batch-archive | file_audit_log 存在 action='archive', detail.batch=true |
| C05-S01 | 状态流转 | 文件状态从uploaded→archived | 存在uploaded状态文件 | POST batch-archive | status 变为 'archived' |
| C05-X-BT01 | 批量操作 | 批量归档大量文件 | 存在50个文件 | POST, fileIds含50个ID | 200, archived=50 |

### C06 POST /api/files/fix-garbled — 修复乱码文件名

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C06-P01 | 正向流程 | 修复乱码文件名 | 存在乱码文件名记录 | POST /api/files/fix-garbled | 200, `{success:true, data:{total:N,fixed:M}}` |
| C06-P02 | 正向流程 | 无乱码文件名 | 所有文件名正常 | POST /api/files/fix-garbled | 200, `{data:{total:N,fixed:0}}` |
| C06-B01 | 边界条件 | 无文件数据 | uploaded_files表为空 | POST /api/files/fix-garbled | 200, `{data:{total:0,fixed:0}}` |
| C06-R01 | 权限认证 | 未登录访问 | 无Token | POST /api/files/fix-garbled | 401 |
| C06-DC01 | 数据一致性 | 修复后文件名正确 | 存在乱码文件名 | POST fix-garbled | 数据库中 original_name 被正确修复 |
| C06-I01 | 幂等性 | 重复执行修复 | 存在乱码文件名 | 连续2次 POST | 第二次 fixed=0 |

### C07 GET /api/files/:fileId — 获取文件详情

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C07-P01 | 正向流程 | 获取存在的文件详情 | 存在文件 fileId=f001 | GET /api/files/f001 | 200, `{success:true, data:{fileId,originalName,storagePath,fileSize,mimeType,...,relations:[...]}}` |
| C07-E01 | 异常流程 | 文件不存在 | 无 | GET /api/files/nonexist | 404, `{success:false, message:"文件不存在"}` |
| C07-B01 | 边界条件 | fileId为空字符串 | 无 | GET /api/files/ | 404（路由不匹配） |
| C07-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/f001 | 401 |
| C07-DC01 | 数据一致性 | 访问后更新last_accessed_at | 存在文件 | GET /api/files/f001 | 数据库中 last_accessed_at 被更新 |
| C07-DC02 | 数据一致性 | 返回的关联关系正确 | 文件有关联 | GET /api/files/f001 | data.relations 包含 file_relations 记录 |

### C08 GET /api/files/:fileId/preview — 预览文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C08-P01 | 正向流程 | 预览Excel文件 | 存在xlsx文件 | GET /api/files/f001/preview | 200, `{success:true, data:{type:"excel",sheets:[{name,headers,rows}],activeSheet,sheetNames,totalRows,truncated}}` |
| C08-P02 | 正向流程 | 预览图片文件 | 存在png文件 | GET /api/files/f002/preview | 200, `{success:true, data:{type:"image",url:"/api/files/f002/download",thumbnailUrl:"/api/files/f002/thumbnail"}}` |
| C08-P03 | 正向流程 | 指定sheet索引 | 存在多sheet的xlsx文件 | GET /api/files/f001/preview?sheet=1 | 200, 返回第2个sheet数据 |
| C08-P04 | 正向流程 | 限制最大行数 | 存在大Excel文件 | GET /api/files/f001/preview?maxRows=10 | 200, truncated=true（如超过10行） |
| C08-E01 | 异常流程 | 文件不存在 | 无 | GET /api/files/nonexist/preview | 404, `{message:"文件不存在"}` |
| C08-E02 | 异常流程 | 文件已丢失（磁盘不存在） | 数据库有记录但文件被删 | GET /api/files/f003/preview | 404, `{message:"文件已丢失"}` |
| C08-E03 | 异常流程 | 不支持预览的文件类型 | 存在.exe文件 | GET /api/files/f004/preview | 400, `{message:"不支持预览该文件类型"}` |
| C08-B01 | 边界条件 | Excel文件只有表头无数据 | 存在空数据xlsx文件 | GET /api/files/f005/preview | 200, `{data:{headers:[...],rows:[],totalRows:0}}` |
| C08-B02 | 边界条件 | sheet索引超出范围 | 存在1个sheet的文件 | GET /api/files/f001/preview?sheet=5 | 200, 返回最后一个sheet |
| C08-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/f001/preview | 401 |
| C08-DC01 | 数据一致性 | 预览后审计日志记录 | 存在文件 | GET preview | file_audit_log 存在 action='download', detail.action='preview' |

### C09 GET /api/files/:fileId/thumbnail — 获取缩略图

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C09-P01 | 正向流程 | 获取图片缩略图 | 存在png文件，sharp库可用 | GET /api/files/f002/thumbnail | 200, Content-Type: image/jpeg, 返回缩略图二进制数据 |
| C09-E01 | 异常流程 | 文件不存在 | 无 | GET /api/files/nonexist/thumbnail | 404 |
| C09-E02 | 异常流程 | 文件已丢失 | 数据库有记录但文件被删 | GET /api/files/f003/thumbnail | 404, `{message:"文件已丢失"}` |
| C09-E03 | 异常流程 | 非图片文件不支持缩略图 | 存在xlsx文件 | GET /api/files/f001/thumbnail | 404, `{message:"该文件类型不支持缩略图"}` |
| C09-E04 | 异常流程 | sharp库不可用 | 存在图片文件，sharp加载失败 | GET /api/files/f002/thumbnail | 302 重定向到 /api/files/f002/download |
| C09-B01 | 边界条件 | 缩略图缓存头正确 | 存在图片文件 | GET thumbnail | Cache-Control: public, max-age=86400 |
| C09-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/f002/thumbnail | 401 |

### C10 GET /api/files/:fileId/download — 下载文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C10-P01 | 正向流程 | 下载存在的文件 | 存在文件 | GET /api/files/f001/download | 200, 返回文件流，Content-Disposition: attachment |
| C10-E01 | 异常流程 | 文件不存在 | 无 | GET /api/files/nonexist/download | 404, `{message:"文件不存在"}` |
| C10-E02 | 异常流程 | 文件已丢失 | 数据库有记录但文件被删 | GET /api/files/f003/download | 404, `{message:"文件已丢失"}` |
| C10-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/f001/download | 401 |
| C10-DC01 | 数据一致性 | 下载后更新last_accessed_at | 存在文件 | GET download | 数据库中 last_accessed_at 被更新 |
| C10-DC02 | 数据一致性 | 下载后审计日志记录 | 存在文件 | GET download | file_audit_log 存在 action='download' |
| C10-X-CT01 | Content-Type | 下载响应Content-Type正确 | xlsx文件 | GET download | Content-Type 为文件实际 mime_type |
| C10-X-RF01 | 响应格式 | 下载响应包含Content-Disposition | 存在文件 | GET download | Content-Disposition: attachment; filename=... |

### C11 GET /api/files/:fileId/audit — 获取文件审计日志

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C11-P01 | 正向流程 | 获取文件的审计日志 | 存在文件且有审计记录 | GET /api/files/f001/audit | 200, `{success:true, data:[{logId,fileId,action,operator,timestamp,detailJson,ipAddress}]}` |
| C11-P02 | 正向流程 | 文件无审计日志 | 存在文件但无审计记录 | GET /api/files/f002/audit | 200, `{data:[]}` |
| C11-B01 | 边界条件 | fileId不存在 | 无 | GET /api/files/nonexist/audit | 200, `{data:[]}`（不报错） |
| C11-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/f001/audit | 401 |
| C11-DC01 | 数据一致性 | 审计日志按时间倒序 | 存在多条审计记录 | GET audit | data 按timestamp DESC排序 |

### C12 POST /api/files/:fileId/link — 关联文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C12-P01 | 正向流程 | 关联文件到配方 | 存在文件和配方 formulaId=f001 | POST, `{relatedId:"f001",relatedType:"formula"}` | 200, `{success:true, data:null, message:"文件关联成功"}` |
| C12-P02 | 正向流程 | 关联文件到原料 | 存在文件和原料 materialId=m001 | POST, `{relatedId:"m001",relatedType:"material"}` | 200 |
| C12-E01 | 异常流程 | 缺少relatedId | 存在文件 | POST, `{relatedType:"formula"}` | 400, `{message:"缺少关联ID或关联类型"}` |
| C12-E02 | 异常流程 | 缺少relatedType | 存在文件 | POST, `{relatedId:"f001"}` | 400 |
| C12-E03 | 异常流程 | 文件不存在 | 无 | POST, `{relatedId:"f001",relatedType:"formula"}` | 404, `{message:"文件不存在"}` |
| C12-E04 | 异常流程 | 关联的记录不存在 | 存在文件，formulaId不存在 | POST, `{relatedId:"nonexist",relatedType:"formula"}` | 400, `{message:"关联的记录不存在"}` |
| C12-V01 | 参数校验 | relatedType为非法值 | 存在文件 | POST, `{relatedId:"f001",relatedType:"invalid"}` | 400（关联记录不存在） |
| C12-R01 | 权限认证 | 未登录访问 | 无Token | POST, `{relatedId:"f001",relatedType:"formula"}` | 401 |
| C12-DC01 | 数据一致性 | 关联后文件状态变为linked | 存在uploaded状态文件 | POST link | status='linked', related_id 和 related_type 被设置 |
| C12-DC02 | 数据一致性 | 关联后审计日志记录 | 存在文件 | POST link | file_audit_log 存在 action='link' |
| C12-DC03 | 数据一致性 | file_relations表记录正确 | 存在文件 | POST link | file_relations 表存在关联记录 |
| C12-S01 | 状态流转 | uploaded→linked | 存在uploaded状态文件 | POST link | status 从 'uploaded' 变为 'linked' |
| C12-I01 | 幂等性 | 重复关联同一文件 | 文件已关联到f001 | POST link again | 200（INSERT OR IGNORE），不报错 |

### C13 POST /api/files/:fileId/unlink — 取消关联

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C13-P01 | 正向流程 | 取消指定关联 | 文件已关联到f001 | POST, `{relatedId:"f001",relatedType:"formula"}` | 200, `{message:"取消关联成功"}` |
| C13-P02 | 正向流程 | 取消全部关联 | 文件有多个关联 | POST, `{}`（无relatedId和relatedType） | 200, 所有 file_relations 被删除 |
| C13-E01 | 异常流程 | 文件不存在 | 无 | POST, `{relatedId:"f001",relatedType:"formula"}` | 404 |
| C13-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| C13-DC01 | 数据一致性 | 取消关联后状态变为parsed | 文件仅有一个关联 | POST unlink | status='parsed', related_id=NULL |
| C13-DC02 | 数据一致性 | 取消一个关联后切换到下一个 | 文件有2个关联 | POST unlink第一个 | related_id 切换为第二个关联 |
| C13-DC03 | 数据一致性 | 取消关联后审计日志记录 | 存在文件 | POST unlink | file_audit_log 存在 action='unlink' |
| C13-S01 | 状态流转 | linked→parsed | 文件仅有一个关联 | POST unlink | status 从 'linked' 变为 'parsed' |

### C14 GET /api/files/:fileId/relations — 获取关联关系

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C14-P01 | 正向流程 | 获取文件的关联关系 | 文件有关联 | GET /api/files/f001/relations | 200, `{success:true, data:[{relationId,fileId,relatedId,relatedType,relatedName,createdBy,createdAt}]}` |
| C14-P02 | 正向流程 | 文件无关联 | 文件无关联 | GET /api/files/f002/relations | 200, `{data:[]}` |
| C14-R01 | 权限认证 | 未登录访问 | 无Token | GET /api/files/f001/relations | 401 |
| C14-DC01 | 数据一致性 | 关联按创建时间排序 | 文件有多个关联 | GET relations | data 按 created_at ASC 排序 |

### C15 POST /api/files/:fileId/reparse — 重新解析文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C15-P01 | 正向流程 | 重新解析文件 | 存在文件 | POST, `{model:"gpt-4"}` | 200, `{success:true, data:null, message:"重新解析已触发"}` |
| C15-P02 | 正向流程 | 不指定model使用原模型 | 存在文件，parse_model="gpt-3.5" | POST, `{}` | 200, parse_model 保持不变 |
| C15-E01 | 异常流程 | 文件不存在 | 无 | POST, `{model:"gpt-4"}` | 404 |
| C15-R01 | 权限认证 | 未登录访问 | 无Token | POST | 401 |
| C15-DC01 | 数据一致性 | 重新解析后版本号+1 | 存在文件 version=1 | POST reparse | version 变为 2 |
| C15-DC02 | 数据一致性 | 重新解析后审计日志记录 | 存在文件 | POST reparse | file_audit_log 存在 action='reparse' |
| C15-S01 | 状态流转 | 解析后文件状态不变 | 存在parsed状态文件 | POST reparse | status 保持 'parsed'（仅更新parse_model和version） |

### C16 DELETE /api/files/:fileId — 删除文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| C16-P01 | 正向流程 | admin删除文件 | admin用户，存在文件 | DELETE /api/files/f001 | 200, `{success:true, data:null, message:"文件删除成功"}` |
| C16-E01 | 异常流程 | formulist无权删除 | formulist用户 | DELETE /api/files/f001 | 403, `{success:false, message:"仅管理员可执行此操作"}` |
| C16-E02 | 异常流程 | 文件不存在 | admin用户 | DELETE /api/files/nonexist | 404, `{message:"文件不存在"}` |
| C16-B01 | 边界条件 | fileId为空字符串 | admin用户 | DELETE /api/files/ | 404（路由不匹配） |
| C16-R01 | 权限认证 | 未登录访问 | 无Token | DELETE /api/files/f001 | 401 |
| C16-R02 | 权限认证 | 仅admin可删除 | formulist用户 | DELETE /api/files/f001 | 403 |
| C16-DC01 | 数据一致性 | 删除后数据库记录消失 | admin用户 | DELETE | uploaded_files 表中无该记录 |
| C16-DC02 | 数据一致性 | 删除后磁盘文件消失 | admin用户 | DELETE | 磁盘上对应文件被删除 |
| C16-DC03 | 数据一致性 | 删除后审计日志记录 | admin用户 | DELETE | file_audit_log 存在 action='delete' |
| C16-I01 | 幂等性 | 重复删除同一文件 | admin用户 | 连续2次 DELETE | 第一次200，第二次404 |

## 三、特殊场景测试

### X-UP 文件上传

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-UP-01 | 文件上传 | 上传.xlsx格式 | 用户已登录 | POST, file=test.xlsx | 201 |
| X-UP-02 | 文件上传 | 上传.xls格式 | 用户已登录 | POST, file=test.xls | 201 |
| X-UP-03 | 文件上传 | 上传.csv格式 | 用户已登录 | POST, file=test.csv | 201 |
| X-UP-04 | 文件上传 | 上传.png格式 | 用户已登录 | POST, file=test.png | 201 |
| X-UP-05 | 文件上传 | 上传.jpg格式 | 用户已登录 | POST, file=test.jpg | 201 |
| X-UP-06 | 文件上传 | 上传.jpeg格式 | 用户已登录 | POST, file=test.jpeg | 201 |
| X-UP-07 | 文件上传 | 上传.gif格式 | 用户已登录 | POST, file=test.gif | 201 |
| X-UP-08 | 文件上传 | 上传.webp格式 | 用户已登录 | POST, file=test.webp | 201 |
| X-UP-09 | 文件上传 | 上传.pdf格式 | 用户已登录 | POST, file=test.pdf | multer拒绝，"不支持的文件类型" |
| X-UP-10 | 文件上传 | 上传.docx格式 | 用户已登录 | POST, file=test.docx | multer拒绝 |
| X-UP-11 | 文件上传 | 上传.exe格式 | 用户已登录 | POST, file=test.exe | multer拒绝 |
| X-UP-12 | 文件上传 | 文件大小刚好10MB | 用户已登录 | POST, file=10mb.xlsx | 201 或 multer拒绝（边界值） |
| X-UP-13 | 文件上传 | 文件大小10.01MB | 用户已登录 | POST, file=10.01mb.xlsx | multer拒绝 |
| X-UP-14 | 文件上传 | 文件名含中文乱码 | 用户已登录 | POST, file=乱码文件名.xlsx | 201, fixMulterOriginalname 自动修复 |

### X-BT 批量操作

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-BT-01 | 批量操作 | 批量删除含不存在ID | admin用户 | POST batch-delete, fileIds含不存在ID | 200, deleted=N, failed=M |
| X-BT-02 | 批量操作 | 批量归档含不存在ID | 用户已登录 | POST batch-archive, fileIds含不存在ID | 200, archived=N, failed=M |
| X-BT-03 | 批量操作 | 批量操作fileIds含空字符串 | admin用户 | POST batch-delete, fileIds含"" | failed+1 |

### X-MD 请求方法限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-MD-01 | 方法限制 | 文件列表不支持POST | 用户已登录 | POST /api/files | 404 或 405 |
| X-MD-02 | 方法限制 | 文件上传不支持GET | 用户已登录 | GET /api/files/upload | 404 |
| X-MD-03 | 方法限制 | 文件删除不支持PUT | admin用户 | PUT /api/files/f001 | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SE-01 | 错误安全 | 文件不存在不暴露服务器路径 | 用户已登录 | GET /api/files/nonexist | 错误消息为"文件不存在"，不包含磁盘路径 |
| X-SE-02 | 错误安全 | 上传失败不暴露内部信息 | 用户已登录 | POST upload 异常 | 错误消息不包含堆栈信息 |
| X-SE-03 | 错误安全 | 下载失败不暴露文件路径 | 用户已登录 | GET download 文件丢失 | 错误消息为"文件已丢失"，不包含绝对路径 |

### X-RF 响应格式一致性

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-RF-01 | 响应格式 | 成功响应包含success字段 | 用户已登录 | GET /api/files | `{success:true, data:{...}}` |
| X-RF-02 | 响应格式 | 错误响应包含message字段 | 用户已登录 | GET /api/files/nonexist | `{success:false, message:"文件不存在"}` |

### X-CT Content-Type校验

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-CT-01 | Content-Type | 文件上传需multipart/form-data | 用户已登录 | POST upload, Content-Type: application/json | 400, 无法解析文件 |
| X-CT-02 | Content-Type | 缩略图响应为image/jpeg | 存在图片文件 | GET thumbnail | Content-Type: image/jpeg |

### X-LB 请求体大小限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-LB-01 | 大小限制 | 上传文件超过10MB被拒绝 | 用户已登录 | POST, file=11mb.xlsx | multer拒绝 |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| C01 | 6 | 1 | 3 | 1 | 1 | 0 | 0 | 0 | 1 | 13 |
| C02 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 4 |
| C03 | 4 | 3 | 3 | 3 | 1 | 1 | 3 | 1 | 0 | 19 |
| C04 | 2 | 3 | 0 | 1 | 3 | 0 | 3 | 0 | 0 | 12 |
| C05 | 2 | 2 | 0 | 1 | 2 | 1 | 2 | 0 | 0 | 10 |
| C06 | 2 | 0 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 6 |
| C07 | 1 | 1 | 1 | 1 | 0 | 0 | 2 | 0 | 0 | 6 |
| C08 | 4 | 3 | 2 | 1 | 0 | 0 | 1 | 0 | 0 | 11 |
| C09 | 1 | 4 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 7 |
| C10 | 1 | 2 | 0 | 1 | 0 | 0 | 2 | 0 | 0 | 6 |
| C11 | 2 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 0 | 5 |
| C12 | 2 | 4 | 0 | 1 | 1 | 1 | 3 | 1 | 0 | 13 |
| C13 | 2 | 1 | 0 | 1 | 0 | 1 | 3 | 0 | 0 | 8 |
| C14 | 2 | 0 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 4 |
| C15 | 2 | 1 | 0 | 1 | 0 | 1 | 2 | 0 | 0 | 7 |
| C16 | 1 | 2 | 1 | 2 | 0 | 0 | 3 | 1 | 0 | 10 |
| 特殊(X-UP) | - | - | - | - | - | - | - | - | - | 14 |
| 特殊(X-BT) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-MD) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-SE) | - | - | - | - | - | - | - | - | - | 3 |
| 特殊(X-RF) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-CT) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-LB) | - | - | - | - | - | - | - | - | - | 1 |
| **合计** | **37** | **27** | **14** | **20** | **8** | **6** | **29** | **4** | **1** | **168** |
