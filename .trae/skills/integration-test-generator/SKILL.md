---
name: integration-test-generator
description: 扫描前后端代码，自动生成前后端联调测试用例文档，覆盖CRUD全链路、认证端到端、权限联动、营养计算、AI流式响应、契约验证等27个场景+19个契约维度。当用户要求生成联调测试用例、集成测试用例、前后端联调测试时触发。
---

# 前后端联调测试用例生成器

扫描前后端代码，生成结构化联调测试用例文档，覆盖 27 个联调场景 + 19 个契约维度，验证从前端操作到后端响应再到前端展示的全链路闭环。

## 触发词

生成联调测试用例、集成测试用例、前后端联调测试、联调测试文档、集成测试覆盖

## 与其他测试技能的关系

| 技能 | 测试范围 | 本技能补充了什么 |
|------|---------|---------------|
| ui-test-case-generator | 前端 UI 交互 | 验证"按钮能点"，但不验证"点了之后后端对不对" |
| api-test-case-generator | 后端 API 接口 | 验证"接口能通"，但不验证"前端能不能正确处理响应" |
| **integration-test-generator** | **前后端全链路** | **验证"点了按钮→API请求→DB变化→API响应→UI展示"全闭环** |

## 执行流程

```
确定目标模块 → 扫描前后端代码 → 生成联调场景用例 → 生成契约验证用例 → 输出文档
```

### 阶段 1：确定目标模块

#### 用户指定了模块

直接使用，支持以下格式：
- 页面路径：`frontend/src/views/formulas/FormulaList.vue`
- 模块名称：`formulas`、`配方`
- 多个模块：逗号分隔

#### 用户未指定模块

采用**分层扫描**策略：

**索引层（自动，<1s）**：

1. 扫描 `frontend/src/views/` 和 `backend/src/routes/`，快速统计模块和端点数
2. 按模块分组，输出选择清单：

```
扫描到 8 个业务模块：

【核心业务】
  1. formulas      — 前端 5 页面 + 后端 8 端点（配方CRUD/对比/营养计算）
  2. materials     — 前端 3 页面 + 后端 12 端点（原料CRUD/导入导出）
  3. nutrition     — 前端 2 页面 + 后端 6 端点（营养方案/预设）
  4. salesmen      — 前端 2 页面 + 后端 6 端点（业务员管理）

【AI 系统】
  5. ai            — 前端 2 页面 + 后端 18 端点（AI对话/NL2SQL）

【认证系统】
  6. auth          — 前端 2 页面 + 后端 4 端点（登录/注册/权限）

建议：核心业务模块优先生成联调用例。
请输入编号（多选用逗号，all 全部，推荐 1,2,5）：
```

3. 用户选择模式与前端一致（单选/多选/all/关键词匹配）
4. 上下文推断：刚修改了某模块 → 推断为该模块

**深度层（选定后触发，3-8s/模块）**：

用户选定后，读取前端页面+Store+API层+后端路由+控制器+Service+数据库表完整内容。

**批量模式优化**：与前端一致（并行扫描、增量缓存、优先级排序、进度提示）

### 阶段 2：扫描前后端代码

#### 前端扫描

| 层 | 文件 | 提取内容 |
|----|------|---------|
| 页面层 | `views/**/*.vue` | 可操作元素、事件绑定、条件渲染、Loading 状态 |
| Store 层 | `stores/*.ts` | API 调用、状态管理、错误处理、乐观更新 |
| API 层 | `api/*.ts` | 请求方法、URL、参数类型、响应类型（TypeScript 接口） |
| 工具层 | `utils/*.ts` | timeFormat、数字格式化、数据转换逻辑 |

#### 后端扫描

| 层 | 文件 | 提取内容 |
|----|------|---------|
| 路由层 | `routes/*.ts` | HTTP 方法、路径、中间件（认证/权限） |
| 控制器层 | `controllers/*.ts` | 请求参数、校验规则、响应结构 |
| Service 层 | `services/*.ts` | 业务逻辑、计算公式、错误处理、事务 |
| 数据层 | `scripts/init.sql` + `migrations/` | 表结构、约束、外键 |

#### 契约提取

对每个 API 调用，提取前后端契约对照：

```
前端 API 调用 → 请求方法 + URL + 参数类型 + 响应类型
后端路由定义 → HTTP方法 + 路径 + validateBody + 响应格式
→ 对比：端点/方法/参数/响应/错误码是否一致
```

### 阶段 3：生成联调场景用例

#### 联调场景（27 个）

**分类一：CRUD 基础（7 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-01 | CRUD 全链路 | I-CRUD | 前端创建→API入库→列表刷新→编辑→更新→删除，7层验证 |
| I-02 | 认证端到端 | I-AUTH | 登录→Token注入→鉴权请求→Token过期→401拦截→跳转登录 |
| I-03 | 数据隔离联调 | I-ISO | formulist登录→只看到自己数据→尝试访问他人→被拒 |
| I-04 | 错误传播 | I-ERR | 后端错误码→前端提示→UI状态回滚 |
| I-05 | 异步流程联调 | I-ASYNC | 长时间操作→Loading→成功/超时/失败→UI恢复 |
| I-06 | 并发竞态 | I-CONC | 两个标签页/用户同时编辑→冲突处理 |
| I-07 | 跨模块联动 | I-CROSS | 一个模块操作影响另一个模块展示 |

**分类二：业务核心（8 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-08 | 文件上传下载链路 | I-FILE | 上传→解析→校验→部分导入→错误报告；导出→下载→内容一致 |
| I-09 | 营养计算全链路 | I-NUTR | 添加药材/辅料→ratio_factor计算→零界限归零→能量重算→NRV%→前端展示 |
| I-10 | 权限联动联调 | I-PERM | admin/formulist看到不同UI按钮+直接URL访问被拦截+API也被拒 |
| I-11 | 搜索筛选联调 | I-SRCH | 筛选参数→后端查询→分页一致→筛选后操作→状态保持 |
| I-12 | 越权操作联调 | I-OWNS | formulist用他人资源ID调API→403 |
| I-13 | 批量操作链路 | I-BATCH | 批量导入部分成功→错误行提示；批量删除有依赖→部分失败 |
| I-14 | AI流式响应联调 | I-SSE | AI查询→SSE流→逐字渲染→中途断开→重试/降级 |
| I-15 | 数据格式转换联调 | I-FMT | DB snake_case→API camelCase→前端渲染；ISO8601→timeFormat；数值精度 |

**分类三：边界场景（2 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-16 | 多标签页状态同步 | I-TAB | Tab A修改→Tab B旧数据→Tab B操作→冲突处理 |
| I-17 | 路由守卫联调 | I-GUARD | 直接URL访问→前后端双重校验→未登录跳转→登录后回原页 |

**分类四：业务特有（4 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-18 | 配方对比链路 | I-CMP | 选择两个配方→后端对比API→前端差异展示 |
| I-19 | AI NL2SQL链路 | I-NL2SQL | 自然语言→SQL生成→sqlValidator白名单→执行→结果展示 |
| I-20 | 预设数据保护联调 | I-PRESET | is_preset=true→UI按钮隐藏+API拒绝双重校验 |
| I-21 | 关联完整性+成本重算 | I-REF | 删除被引用原料→拒绝/提示；修改原料价格→配方成本联动 |

**分类五：请求生命周期（1 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-22 | 请求取消/限流/中断恢复 | I-LIFE | 快速切换页面请求取消；429限流提示；断网恢复后状态同步 |

**分类六：数据一致性（3 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-23 | 导出内容一致性 | I-EXP | 页面展示数据与导出Excel内容一致 |
| I-24 | AI供应商故障转移 | I-FAILOVER | 主provider超时→自动切备用→前端无感知 |
| I-25 | 乐观更新与回滚 | I-OPT | 前端先更新UI→API失败→UI回滚→状态一致 |

**分类七：可靠性保障（2 个）**

| 编号 | 场景 | 前缀 | 说明 |
|------|------|------|------|
| I-26 | 请求防抖/去重 | I-DEDUP | 双击提交→只创建一条；快速重复操作不产生重复数据 |
| I-27 | 事务完整性联调 | I-TXN | 多步操作中途失败→DB回滚→前端提示→无半完成状态 |

#### 每条用例包含

| 字段 | 说明 |
|------|------|
| 用例ID | 场景前缀 + 序号（如 I-CRUD01、I-NUTR01） |
| 用例名称 | 简明描述联调场景 |
| 前置条件 | 执行前必须满足的状态（含前后端数据准备） |
| 操作步骤 | 前端操作序列（点击/输入/导航） |
| 7层验证点 | 每层的预期结果 |
| 测试数据 | 需要准备的测试数据（前后端） |

### 阶段 4：生成契约验证用例

#### 契约维度（19 个）

**基础契约（6 个）**

| 编号 | 维度 | 前缀 | 说明 |
|------|------|------|------|
| C-01 | 端点匹配 | C-EP | 前端调用的URL与后端路由一致 |
| C-02 | HTTP方法匹配 | C-METHOD | GET/POST/PUT/DELETE对齐 |
| C-03 | 请求体格式 | C-REQ | 前端发送的字段名/类型 vs 后端validateBody规则 |
| C-04 | 响应体格式 | C-RES | 后端返回的字段名/类型 vs 前端TypeScript接口 |
| C-05 | 错误码覆盖 | C-ERR | 后端可能返回的错误码 vs 前端是否都有处理 |
| C-06 | 分页格式 | C-PAGE | 后端分页结构 vs 前端分页组件期望 |

**数据契约（6 个）**

| 编号 | 维度 | 前缀 | 说明 |
|------|------|------|------|
| C-07 | 字段命名契约 | C-NAME | 后端rowToCamelCase转换 vs 前端接口定义 |
| C-08 | Null/空值契约 | C-NULL | 后端返回null vs 空字符串 vs 不返回字段，前端兜底处理 |
| C-09 | 日期格式契约 | C-DATE | 后端ISO 8601 UTC vs 前端timeFormat.ts |
| C-10 | 数值精度契约 | C-PREC | 后端原始数值 vs 前端toFixed规则（金额2位/偏差1位/NRV 2位） |
| C-11 | 枚举值契约 | C-ENUM | 前端枚举 vs 后端常量是否一致 |
| C-12 | Content-Type契约 | C-CT | JSON vs multipart/form-data vs blob |

**结构契约（5 个）**

| 编号 | 维度 | 前缀 | 说明 |
|------|------|------|------|
| C-13 | 分页结构契约 | C-PSTR | pagination对象结构（page/pageSize/total/totalPages） |
| C-14 | ID格式契约 | C-ID | UUID格式一致性 |
| C-15 | 错误响应结构契约 | C-ERRSTR | {message, code, timestamp}结构一致性 |
| C-16 | 列表排序契约 | C-SORT | 默认排序 + 排序参数对齐 |
| C-17 | 关联数据展开契约 | C-REL | 嵌套对象 vs 扁平ID，前后端一致 |

**一致性契约（2 个）**

| 编号 | 维度 | 前缀 | 说明 |
|------|------|------|------|
| C-18 | 导出格式契约 | C-EXPORT | Excel列名/列顺序/数据格式与前端展示一致 |
| C-19 | 事务原子性契约 | C-ATOMIC | 多步操作全部成功或全部失败 |

#### 每条契约用例包含

| 字段 | 说明 |
|------|------|
| 用例ID | 契约前缀 + 序号（如 C-EP01、C-NAME01） |
| 契约维度 | 所属维度 |
| 前端定义 | 前端代码中的接口/类型定义 |
| 后端定义 | 后端代码中的路由/校验/响应结构 |
| 一致性判定 | 一致/不一致/需人工确认 |
| 不一致详情 | 字段名差异/类型差异/缺失字段等 |

### 阶段 5：输出文档

输出到 `test/integration-test-cases/{模块名}-integration-test-cases.md`。

## 文档结构

```markdown
# {模块名} 前后端联调测试用例文档

## 文档信息
| 项 | 值 |
|----|-----|
| 文档ID | ITC-{模块缩写}-{YYYYMMDD}-{序号}（如 ITC-FM-20260607-001） |
| 前端文件 | frontend/src/views/formulas/*.vue, frontend/src/api/formula.ts |
| 后端文件 | backend/src/routes/formulas.ts, backend/src/controllers/formulaController.ts |
| 前端文件hash | {hash} |
| 后端文件hash | {hash} |
| 联调场景数 | N |
| 契约维度数 | N |
| 测试用例总数 | N |

## 一、模块接口映射

### 1.1 前端 API 调用 → 后端路由对照
| 前端函数 | HTTP方法 | URL | 后端路由 | 认证 | 一致性 |
|---------|---------|-----|---------|------|--------|
| getFormulaList | GET | /api/formulas | router.get("/") | authMiddleware | ✅ |
| createFormula | POST | /api/formulas | router.post("/") | authMiddleware | ✅ |
| updateFormula | PUT | /api/formulas/:id | router.put("/:id") | authMiddleware | ✅ |
| deleteFormula | DELETE | /api/formulas/:id | router.delete("/:id") | authMiddleware | ✅ |

### 1.2 数据流图
```
FormulaList.vue → useFormulaStore → formula.ts(getFormulaList)
    → GET /api/formulas → formulaController.getList
    → formulaService.getList → query(SELECT...)
    → rowToCamelCase → {success, data:{list, pagination}}
    → Store.list = data.list → 表格渲染
```

## 二、联调场景用例

### 2.1 CRUD 全链路（I-CRUD）

#### I-CRUD01 创建配方全链路
| 项 | 值 |
|----|-----|
| 用例ID | I-CRUD01 |
| 前置条件 | 已登录admin，无同名配方，原料数据已准备 |
| 操作步骤 | 1.点击"新增配方" 2.填写表单 3.点击"保存" |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 点击保存后，请求发出，按钮进入Loading状态 |
| 2.API请求层 | POST /api/formulas, Body包含正确字段，Headers含Authorization |
| 3.DB状态层 | formulas表新增1条，formula_versions表新增1条 |
| 4.Store状态层 | useFormulaStore.list 更新，包含新配方 |
| 5.API响应层 | 201, {success:true, data:{id, name, ...}} |
| 6.前端展示层 | 列表页出现新配方，表单关闭，MessagePlugin.success |
| 7.浏览器存储层 | Token未变，无异常 |

#### I-CRUD02 编辑配方全链路
| 项 | 值 |
|----|-----|
| 用例ID | I-CRUD02 |
| 前置条件 | 配方存在，已登录 |
| 操作步骤 | 1.点击编辑 2.修改名称 3.点击保存 |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 编辑表单打开，名称字段预填当前值 |
| 2.API请求层 | PUT /api/formulas/:id, Body含更新字段 |
| 3.DB状态层 | formulas表对应记录updated_at变化，name更新 |
| 4.Store状态层 | Store.list中对应项更新 |
| 5.API响应层 | 200, {success:true, data:{id, name:newName, ...}} |
| 6.前端展示层 | 列表中名称更新，编辑表单关闭 |
| 7.浏览器存储层 | Token未变 |

#### I-CRUD03 删除配方全链路
...（类似结构）

### 2.2 认证端到端（I-AUTH）

#### I-AUTH01 Token过期自动跳转
| 项 | 值 |
|----|-----|
| 用例ID | I-AUTH01 |
| 前置条件 | Token即将过期（或手动设置过期Token） |
| 操作步骤 | 1.在列表页操作（如翻页） 2.后端返回401 |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 翻页操作触发请求 |
| 2.API请求层 | GET /api/formulas, Authorization含过期Token |
| 3.DB状态层 | 无变化（请求被拦截） |
| 4.Store状态层 | authStore清除Token，用户信息清空 |
| 5.API响应层 | 401, {success:false, error:{code:"TOKEN_EXPIRED"}} |
| 6.前端展示层 | 自动跳转登录页，提示"登录已过期" |
| 7.浏览器存储层 | localStorage中tingstudio_token被清除 |

### 2.3 营养计算全链路（I-NUTR）

#### I-NUTR01 药材营养计算（ratio=0.18）
| 项 | 值 |
|----|-----|
| 用例ID | I-NUTR01 |
| 前置条件 | 配方存在，药材"当归"已添加（quantity=100g, finishedWeight=500g） |
| 操作步骤 | 1.打开配方详情 2.查看营养成分表 |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 配方详情页加载，营养成分区域渲染 |
| 2.API请求层 | GET /api/formulas/:id（含营养数据） |
| 3.DB状态层 | 营养数据已按ratio_factor=0.18计算 |
| 4.Store状态层 | Store中配方数据含营养计算结果 |
| 5.API响应层 | 200, 营养数据字段完整 |
| 6.前端展示层 | 营养成分表显示正确数值（当归ratio=100/500*0.18=0.036） |
| 7.浏览器存储层 | 无变化 |

#### I-NUTR02 零界限归零+能量重算
| 项 | 值 |
|----|-----|
| 用例ID | I-NUTR02 |
| 前置条件 | 配方中某营养素计算值≤零界限（如蛋白质≤0.5g） |
| 操作步骤 | 1.查看营养成分 2.验证归零 3.验证能量重算 |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 配方详情页正常展示 |
| 2.API请求层 | GET /api/formulas/:id |
| 3.DB状态层 | 营养数据中蛋白质=0（归零后），能量已重算 |
| 4.Store状态层 | Store数据与DB一致 |
| 5.API响应层 | 200, 蛋白质=0, 能量=脂肪×37+碳水×17（不含蛋白质项） |
| 6.前端展示层 | 蛋白质显示0g，能量值与重算后一致 |
| 7.浏览器存储层 | 无变化 |

### 2.4 AI流式响应联调（I-SSE）

#### I-SSE01 AI对话流式渲染
| 项 | 值 |
|----|-----|
| 用例ID | I-SSE01 |
| 前置条件 | 已登录，AI服务可用 |
| 操作步骤 | 1.输入问题 2.点击发送 3.观察流式响应 |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 发送按钮进入Loading，输入框禁用 |
| 2.API请求层 | POST /api/agent/chat, Body含问题，Accept:text/event-stream |
| 3.DB状态层 | agent_conversations新增记录 |
| 4.Store状态层 | aiStore.messages逐步追加内容 |
| 5.API响应层 | 200, SSE流式返回data chunks |
| 6.前端展示层 | 回答逐字渲染，Loading结束后显示完整回答 |
| 7.浏览器存储层 | 无变化 |

#### I-SSE02 AI流式中途断开
| 项 | 值 |
|----|-----|
| 用例ID | I-SSE02 |
| 前置条件 | 已登录，模拟网络中断 |
| 操作步骤 | 1.发送问题 2.中途断开网络 3.观察前端处理 |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 流式渲染停止 |
| 2.API请求层 | SSE连接中断 |
| 3.DB状态层 | 已收到的部分内容可能已保存 |
| 4.Store状态层 | aiStore保留已收到的部分内容 |
| 5.API响应层 | 连接中断，无完整响应 |
| 6.前端展示层 | 显示已收到的内容 + "连接中断"提示 + 重试按钮 |
| 7.浏览器存储层 | 无变化 |

### 2.5 权限联动联调（I-PERM）

#### I-PERM01 formulist不可见编辑按钮
| 项 | 值 |
|----|-----|
| 用例ID | I-PERM01 |
| 前置条件 | formulist用户登录，有自己创建的配方 |
| 操作步骤 | 1.进入配方列表 2.查看操作列 3.直接访问编辑URL |

**7层验证**：
| 验证层 | 预期结果 |
|--------|---------|
| 1.前端操作层 | 列表中只有"查看"按钮，无"编辑"/"删除" |
| 2.API请求层 | 无编辑/删除请求发出 |
| 3.DB状态层 | 无变化 |
| 4.Store状态层 | Store中用户角色为formulist |
| 5.API响应层 | 如直接调PUT/DELETE → 403 |
| 6.前端展示层 | 直接URL访问编辑页 → 无编辑表单或跳转403页 |
| 7.浏览器存储层 | Token中角色为formulist |

...（其他场景类似结构）

## 三、契约验证用例

### 3.1 基础契约

#### C-EP01 端点匹配验证
| 项 | 值 |
|----|-----|
| 用例ID | C-EP01 |
| 前端定义 | formula.ts: getFormulaList → GET /api/formulas |
| 后端定义 | formulas.ts: router.get("/") → 挂载在 /api/formulas |
| 一致性判定 | ✅ 一致 |

#### C-EP02 端点不匹配示例
| 项 | 值 |
|----|-----|
| 用例ID | C-EP02 |
| 前端定义 | formula.ts: getFormulaVersions → GET /api/formulas/:id/versions |
| 后端定义 | 无对应路由 |
| 一致性判定 | ❌ 不一致：前端调用不存在的端点 |

### 3.2 数据契约

#### C-NAME01 字段命名契约验证
| 项 | 值 |
|----|-----|
| 用例ID | C-NAME01 |
| 前端定义 | interface Formula { createdAt: string; createdBy: string } |
| 后端定义 | rowToCamelCase({created_at, created_by}) → {createdAt, createdBy} |
| 一致性判定 | ✅ 一致 |

#### C-DATE01 日期格式契约验证
| 项 | 值 |
|----|-----|
| 用例ID | C-DATE01 |
| 前端定义 | formatTimestamp(val) → 本地时区格式 |
| 后端定义 | 返回 ISO 8601 UTC（2026-05-03T14:21:47.611Z） |
| 一致性判定 | ✅ 一致（前端使用timeFormat.ts转换） |

### 3.3 结构契约

#### C-PSTR01 分页结构契约验证
| 项 | 值 |
|----|-----|
| 用例ID | C-PSTR01 |
| 前端定义 | { list: T[], pagination: { page: number, pageSize: number, total: number, totalPages: number } } |
| 后端定义 | successWithPagination(rows, { page, pageSize, total, totalPages }) |
| 一致性判定 | ✅ 一致 |

### 3.4 一致性契约

#### C-EXPORT01 导出格式契约验证
| 项 | 值 |
|----|-----|
| 用例ID | C-EXPORT01 |
| 前端定义 | 配方列表显示：名称、编码、成本、创建时间 |
| 后端定义 | 导出Excel列：名称、编码、成本、创建时间 |
| 一致性判定 | ✅ 一致（列名和顺序对齐） |

#### C-ATOMIC01 事务原子性契约验证
| 项 | 值 |
|----|-----|
| 用例ID | C-ATOMIC01 |
| 操作 | 创建配方 + 关联原料 |
| 前端期望 | 成功→配方+关联都存在；失败→都不存在 |
| 后端实现 | Service层事务包裹，失败回滚 |
| 一致性判定 | ✅ 一致 |

## 四、测试覆盖率统计

### 4.1 联调场景覆盖
| 场景分类 | 场景数 | 用例数 | 覆盖模块 |
|---------|--------|--------|---------|
| CRUD基础 | 7 | N | 全部 |
| 业务核心 | 8 | N | 按模块 |
| 边界场景 | 2 | N | 按模块 |
| 业务特有 | 4 | N | 按模块 |
| 请求生命周期 | 1 | N | 全部 |
| 数据一致性 | 3 | N | 按模块 |
| 可靠性保障 | 2 | N | 全部 |
| **合计** | **27** | **N** | — |

### 4.2 契约维度覆盖
| 契约分类 | 维度数 | 一致 | 不一致 | 待确认 |
|---------|--------|------|--------|--------|
| 基础契约 | 6 | N | N | N |
| 数据契约 | 6 | N | N | N |
| 结构契约 | 5 | N | N | N |
| 一致性契约 | 2 | N | N | N |
| **合计** | **19** | **N** | **N** | **N** |
```

## 用例ID编码规则

### 联调场景

| 分类 | 前缀 | 示例 |
|------|------|------|
| CRUD全链路 | I-CRUD | I-CRUD01 |
| 认证端到端 | I-AUTH | I-AUTH01 |
| 数据隔离联调 | I-ISO | I-ISO01 |
| 错误传播 | I-ERR | I-ERR01 |
| 异步流程联调 | I-ASYNC | I-ASYNC01 |
| 并发竞态 | I-CONC | I-CONC01 |
| 跨模块联动 | I-CROSS | I-CROSS01 |
| 文件上传下载 | I-FILE | I-FILE01 |
| 营养计算全链路 | I-NUTR | I-NUTR01 |
| 权限联动联调 | I-PERM | I-PERM01 |
| 搜索筛选联调 | I-SRCH | I-SRCH01 |
| 越权操作联调 | I-OWNS | I-OWNS01 |
| 批量操作链路 | I-BATCH | I-BATCH01 |
| AI流式响应联调 | I-SSE | I-SSE01 |
| 数据格式转换 | I-FMT | I-FMT01 |
| 多标签页同步 | I-TAB | I-TAB01 |
| 路由守卫联调 | I-GUARD | I-GUARD01 |
| 配方对比链路 | I-CMP | I-CMP01 |
| AI NL2SQL链路 | I-NL2SQL | I-NL2SQL01 |
| 预设数据保护 | I-PRESET | I-PRESET01 |
| 关联完整性+成本重算 | I-REF | I-REF01 |
| 请求生命周期 | I-LIFE | I-LIFE01 |
| 导出内容一致性 | I-EXP | I-EXP01 |
| AI供应商故障转移 | I-FAILOVER | I-FAILOVER01 |
| 乐观更新与回滚 | I-OPT | I-OPT01 |
| 请求防抖/去重 | I-DEDUP | I-DEDUP01 |
| 事务完整性联调 | I-TXN | I-TXN01 |

### 契约维度

| 分类 | 前缀 | 示例 |
|------|------|------|
| 端点匹配 | C-EP | C-EP01 |
| HTTP方法匹配 | C-METHOD | C-METHOD01 |
| 请求体格式 | C-REQ | C-REQ01 |
| 响应体格式 | C-RES | C-RES01 |
| 错误码覆盖 | C-ERR | C-ERR01 |
| 分页格式 | C-PAGE | C-PAGE01 |
| 字段命名契约 | C-NAME | C-NAME01 |
| Null/空值契约 | C-NULL | C-NULL01 |
| 日期格式契约 | C-DATE | C-DATE01 |
| 数值精度契约 | C-PREC | C-PREC01 |
| 枚举值契约 | C-ENUM | C-ENUM01 |
| Content-Type契约 | C-CT | C-CT01 |
| 分页结构契约 | C-PSTR | C-PSTR01 |
| ID格式契约 | C-ID | C-ID01 |
| 错误响应结构契约 | C-ERRSTR | C-ERRSTR01 |
| 列表排序契约 | C-SORT | C-SORT01 |
| 关联数据展开契约 | C-REL | C-REL01 |
| 导出格式契约 | C-EXPORT | C-EXPORT01 |
| 事务原子性契约 | C-ATOMIC | C-ATOMIC01 |

## 注意事项

- **文档ID 透传**：文档ID 是下游 integration-test-runner 和 bug-fixer 的唯一追溯标识
- **文件hash 双校验**：下游技能启动时通过对比前端和后端文件的 hash 判断用例文档是否变更
- **用例ID 透传**：结果文档和修复报告中的用例ID 必须与本文档完全一致
- **7层验证必须完整**：每条联调用例必须覆盖全部7层验证，不可省略
- **契约验证是静态分析**：契约维度通过代码扫描对比，不需要运行时验证
- **遵循 api-design 规则**：契约验证的预期格式应与 `.trae/rules/api-design.md` 一致
- **遵循 error-handling 规则**：错误传播场景的验证应与 `.trae/rules/error-handling.md` 一致
- **遵循 AGENTS.md 约定**：时间格式、数值精度、数据展示规则以 AGENTS.md 为准
