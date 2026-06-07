# Excel导入 接口测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ATC-IMP-20260607-001 |
| 路由文件 | backend/src/routes/excelImport.ts |
| 控制器文件 | backend/src/controllers/excelImportController.ts |
| 服务文件 | 无（逻辑在控制器中） |
| 端点数 | 2 |
| 测试用例数 | 38 |

## 一、接口清单
| 编号 | 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|------|
| B01 | GET | /api/import/formula/template | 是 | 下载配方导入模板 |
| B02 | POST | /api/import/formula/parse | 是 | 解析上传的Excel配方文件 |

## 二、测试用例

### B01 GET /api/import/formula/template — 下载配方导入模板

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| B01-P01 | 正向流程 | 成功下载模板 | 用户已登录 | GET /api/import/formula/template | 200, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, Content-Disposition: attachment; filename=formula-import-template.xlsx, 返回有效Excel文件 |
| B01-P02 | 正向流程 | 模板包含正确工作表 | 用户已登录 | GET /api/import/formula/template | Excel文件包含"配方导入模板"和"使用说明"两个工作表 |
| B01-P03 | 正向流程 | 模板包含示例数据 | 用户已登录 | GET /api/import/formula/template | "配方导入模板"工作表第2行起有示例数据（佛手、低聚异麦芽糖） |
| B01-E01 | 异常流程 | 服务端XLSX库异常 | XLSX模块加载失败 | GET /api/import/formula/template | 500, `{success:false, message:"生成模板失败"}` |
| B01-B01 | 边界条件 | 无查询参数 | 用户已登录 | GET /api/import/formula/template | 200, 正常下载 |
| B01-R01 | 权限认证 | 未登录下载模板 | 无Token | GET /api/import/formula/template | 401 |
| B01-R02 | 权限认证 | admin下载模板 | admin用户 | GET /api/import/formula/template | 200 |
| B01-R03 | 权限认证 | formulist下载模板 | formulist用户 | GET /api/import/formula/template | 200 |
| B01-I01 | 幂等性 | 多次下载模板内容一致 | 用户已登录 | 连续2次 GET | 两次返回的文件内容一致 |
| B01-X-CT01 | Content-Type | 响应Content-Type正确 | 用户已登录 | GET /api/import/formula/template | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| B01-X-RF01 | 响应格式 | 文件下载响应格式 | 用户已登录 | GET | Content-Disposition 包含 filename=formula-import-template.xlsx |
| B01-X-MD01 | 方法限制 | POST方法不被允许 | 用户已登录 | POST /api/import/formula/template | 404 或 405 |

### B02 POST /api/import/formula/parse — 解析上传的Excel配方文件

| 用例ID | 维度 | 用例名称 | 前置条件 | 请求参数 | 预期结果 |
|--------|------|----------|----------|----------|----------|
| B02-P01 | 正向流程 | 解析有效Excel文件（原料已存在） | 用户已登录，materials表存在"佛手" | POST, file=valid.xlsx（含"佛手" 108g） | 200, `{success:true, data:{materials:[{materialId,materialName:"佛手",quantity:108,isNew:false}],errors:[],warnings:[],missingMaterials:[],summary:{total:1,existing:1,new:0,hasErrors:false,hasMissingMaterials:false}}}` |
| B02-P02 | 正向流程 | 解析含新原料的Excel | 用户已登录，materials表不存在"新原料A" | POST, file=valid.xlsx（含"新原料A" 50g） | 200, `{data:{materials:[{materialId:null,materialName:"新原料A",quantity:50,isNew:true}],missingMaterials:["新原料A"],summary:{new:1,hasMissingMaterials:true}}}` |
| B02-P03 | 正向流程 | 解析含混合数据的Excel | 用户已登录，部分原料存在 | POST, file=valid.xlsx（含已存在和不存在原料） | 200, summary.existing>0 且 summary.new>0 |
| B02-P04 | 正向流程 | 支持中文列名 | 用户已登录 | POST, file=中文字段.xlsx（列名"原料名称""数量(g)"） | 200, 正确解析 |
| B02-P05 | 正向流程 | 支持英文字段名 | 用户已登录 | POST, file=英文字段.xlsx（列名"materialName""quantity"） | 200, 正确解析 |
| B02-P06 | 正向流程 | 自动去除特殊空白字符 | 用户已登录 | POST, file=含BOM和零宽空格.xlsx | 200, 原料名称被正确清理 |
| B02-E01 | 异常流程 | 未上传文件 | 用户已登录 | POST, 无file字段 | 400, `{success:false, message:"请上传Excel文件"}` |
| B02-E02 | 异常流程 | 上传空Excel文件 | 用户已登录 | POST, file=empty.xlsx（只有表头无数据） | 400, `{success:false, message:"Excel文件为空，请填入配方数据"}` |
| B02-E03 | 异常流程 | 上传非Excel文件 | 用户已登录 | POST, file=test.txt | multer拒绝，错误提示"只支持Excel文件(.xlsx, .xls)" |
| B02-E04 | 异常流程 | Excel中原料名称为空 | 用户已登录 | POST, file=含空名称.xlsx | 200, `{data:{errors:["第N行：原料名称不能为空"]}}` |
| B02-E05 | 异常流程 | Excel中数量为0或负数 | 用户已登录 | POST, file=含0数量.xlsx | 200, `{data:{errors:["第N行：xxx 的数量必须大于0"]}}` |
| B02-E06 | 异常流程 | Excel中数量为非数字 | 用户已登录 | POST, file=含非数字.xlsx | 200, errors 包含数量相关错误 |
| B02-E07 | 异常流程 | 解析过程异常 | 用户已登录，上传损坏的Excel | POST, file=corrupted.xlsx | 500, `{success:false, message:"解析Excel文件失败"}` |
| B02-B01 | 边界条件 | 上传超大Excel文件（>5MB） | 用户已登录 | POST, file=large.xlsx（>5MB） | multer拒绝，文件大小超限 |
| B02-B02 | 边界条件 | Excel含大量行数据 | 用户已登录 | POST, file=1000rows.xlsx | 200, 正确解析所有行 |
| B02-B03 | 边界条件 | Excel中数量为极大值 | 用户已登录 | POST, file=含极大数量.xlsx | 200, 正确解析（quantity为极大浮点数） |
| B02-B04 | 边界条件 | Excel中原料名称超长 | 用户已登录 | POST, file=超长名称.xlsx | 200, 正确解析（名称可能很长） |
| B02-B05 | 边界条件 | Excel中含空行 | 用户已登录 | POST, file=含空行.xlsx | 200, 空行被跳过 |
| B02-V01 | 参数校验 | 文件字段名不正确 | 用户已登录 | POST, file字段名为"document"而非"file" | 400, "请上传Excel文件" |
| B02-R01 | 权限认证 | 未登录上传文件 | 无Token | POST, file=valid.xlsx | 401 |
| B02-R02 | 权限认证 | admin上传文件 | admin用户 | POST, file=valid.xlsx | 200 |
| B02-R03 | 权限认证 | formulist上传文件 | formulist用户 | POST, file=valid.xlsx | 200 |
| B02-S01 | 状态流转 | 原料名称通过编码匹配 | 用户已登录，materials表有code="M001"对应"佛手" | POST, file=含编码.xlsx（使用编码而非名称） | 200, 通过编码匹配到原料 |
| B02-DC01 | 数据一致性 | 解析结果数量精度正确 | 用户已登录 | POST, file=含小数.xlsx（数量108.5） | 200, quantity=108.5 |
| B02-DC02 | 数据一致性 | missingMaterials去重 | 用户已登录，同一新原料出现多次 | POST, file=含重复新原料.xlsx | 200, missingMaterials 数组中无重复项 |
| B02-I01 | 幂等性 | 重复上传同一文件 | 用户已登录 | 连续2次 POST 同一文件 | 两次结果一致 |
| B02-DI01 | 数据隔离 | 不同用户解析结果独立 | 用户A和用户B分别上传 | 各自POST | 各自返回独立结果，互不影响 |

## 三、特殊场景测试

### X-UP 文件上传

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-UP-01 | 文件上传 | 上传.xlsx格式文件 | 用户已登录 | POST, file=valid.xlsx | 200, 正常解析 |
| X-UP-02 | 文件上传 | 上传.xls格式文件 | 用户已登录 | POST, file=valid.xls | 200, 正常解析 |
| X-UP-03 | 文件上传 | 上传.csv格式文件 | 用户已登录 | POST, file=test.csv | multer拒绝，"只支持Excel文件(.xlsx, .xls)" |
| X-UP-04 | 文件上传 | 上传.png图片 | 用户已登录 | POST, file=test.png | multer拒绝 |
| X-UP-05 | 文件上传 | 上传无扩展名文件 | 用户已登录 | POST, file=nofile（无扩展名） | multer拒绝 |
| X-UP-06 | 文件上传 | 上传文件大小刚好5MB | 用户已登录 | POST, file=5mb.xlsx | 200 或 multer拒绝（边界值） |
| X-UP-07 | 文件上传 | 上传文件大小5.01MB | 用户已登录 | POST, file=5.01mb.xlsx | multer拒绝，文件大小超限 |
| X-UP-08 | 文件上传 | 上传空文件（0字节） | 用户已登录 | POST, file=empty.xlsx（0字节） | 400 或解析失败 |

### X-MD 请求方法限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-MD-01 | 方法限制 | 模板下载不支持POST | 用户已登录 | POST /api/import/formula/template | 404 或 405 |
| X-MD-02 | 方法限制 | 文件解析不支持GET | 用户已登录 | GET /api/import/formula/parse | 404 或 405 |

### X-SE 错误信息安全

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-SE-01 | 错误安全 | 解析失败不暴露堆栈 | 上传损坏文件 | POST parse | 错误消息不包含完整堆栈信息 |
| X-SE-02 | 错误安全 | 文件类型错误不暴露服务器路径 | 上传非Excel文件 | POST parse | 错误消息仅提示"只支持Excel文件" |

### X-RF 响应格式一致性

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-RF-01 | 响应格式 | 解析成功响应结构 | 上传有效文件 | POST parse | `{success:true, data:{materials,errors,warnings,missingMaterials,summary}}` |
| X-RF-02 | 响应格式 | 解析失败响应结构 | 上传空文件 | POST parse | `{success:false, message:"Excel文件为空..."}` |

### X-CT Content-Type校验

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-CT-01 | Content-Type | 模板下载响应Content-Type | 用户已登录 | GET template | Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet |
| X-CT-02 | Content-Type | 解析接口请求需multipart/form-data | 用户已登录 | POST parse, Content-Type: application/json | 400, 无法解析文件 |

### X-LB 请求体大小限制

| 用例ID | 场景 | 用例名称 | 前置条件 | 操作 | 预期结果 |
|--------|------|----------|----------|------|----------|
| X-LB-01 | 大小限制 | 文件大小超过5MB被拒绝 | 用户已登录 | POST, file=6mb.xlsx | multer拒绝，fileSize超限 |

## 四、测试覆盖率统计

| 端点 | 正向 | 异常 | 边界 | 权限 | 校验 | 状态 | 一致 | 幂等 | 隔离 | 合计 |
|------|------|------|------|------|------|------|------|------|------|------|
| B01 | 3 | 1 | 1 | 3 | 0 | 0 | 0 | 1 | 0 | 9 |
| B02 | 6 | 7 | 5 | 3 | 1 | 1 | 2 | 1 | 1 | 27 |
| 特殊(X-UP) | - | - | - | - | - | - | - | - | - | 8 |
| 特殊(X-MD) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-SE) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-RF) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-CT) | - | - | - | - | - | - | - | - | - | 2 |
| 特殊(X-LB) | - | - | - | - | - | - | - | - | - | 1 |
| **合计** | **9** | **8** | **6** | **6** | **1** | **1** | **2** | **2** | **1** | **53** |
