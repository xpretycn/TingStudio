# SmartTools 智能工具页面测试用例文档

| 字段 | 值 |
|------|-----|
| 文档ID | TC-ST-20260606-001 |
| 页面路径 | frontend/src/views/ai/SmartTools.vue |
| 子页面 | FormulaParseTab / MaterialImportTab / DataSearchTab / ParseHistoryTab |
| 编写日期 | 2026-06-06 |
| 版本 | v1.0 |

---

## 一、页面概览

SmartTools 页面是 AI 智能工具的入口，包含 4 个 Tab 子页面：

| Tab | 组件 | 功能 |
|-----|------|------|
| 智能填单 | FormulaParseTab | 上传文件 → AI 解析配方 → 编辑确认 → 生成配方 |
| 智能导入 | MaterialImportTab | 上传文件 → AI 解析原料营养 → 差异对比 → 批量/逐条录入 |
| 智能查询 | DataSearchTab | 自然语言 → NL2SQL → 结果展示/导出 |
| 解析历史 | ParseHistoryTab | 解析记录管理、筛选、详情查看、恢复 |

---

## 二、交互元素清单

### SmartTools.vue（8个）

| 编号 | 元素名称 | 组件类型 | 所在区域 | 绑定事件 | 关联状态 | 前置条件 |
|------|---------|---------|---------|---------|---------|---------|
| S1 | PageSkeleton | 自定义组件 | 根容器 | - | initialized===false | 页面未初始化 |
| S2 | t-card | t-card | 根容器 | - | initialized===true | 页面初始化完成 |
| S3 | Tab按钮(智能填单) | button | 工具栏Tab区 | @click="activeTab=tab.value" | activeTab | - |
| S4 | Tab按钮(智能导入) | button | 工具栏Tab区 | @click="activeTab=tab.value" | activeTab | - |
| S5 | Tab按钮(智能查询) | button | 工具栏Tab区 | @click="activeTab=tab.value" | activeTab | - |
| S6 | Tab按钮(解析历史) | button | 工具栏Tab区 | @click="activeTab=tab.value" | activeTab | - |
| S7 | 模型选择t-select | t-select | 工具栏右侧 | @change="handleModelChange" | selectedModelKey, modelGroups | modelGroups.length>0 |
| S8 | "暂无模型"提示 | div | 工具栏右侧 | - | - | modelGroups.length===0 |

### FormulaParseTab（34个）

| 编号 | 元素名称 | 组件类型 | 所在区域 | 绑定事件 | 关联状态 | 前置条件 |
|------|---------|---------|---------|---------|---------|---------|
| F01 | 文件上传区域 | div | AI面板 | @click=triggerFileInput, @dragover/dragleave/drop | isDragOver, selectedFile | 未解析且未加载 |
| F02 | 隐藏文件输入 | input[file] | 上传区域 | @change=handleFileChange | selectedFile | - |
| F03 | 配方解析模板选择 | t-radio-group | AI面板 | v-model=selectedFormulaTemplateId, @change=handleFormulaTemplateChange | formulaTemplateList | templateList.length>0 |
| F04 | 开始解析按钮 | button | 文件选中行 | @click=handleParse | selectedFile, aiStore.parseLoading | selectedFile存在且模型已选 |
| F05 | 取消文件按钮 | button | 文件选中行 | @click=clearSelectedFile | selectedFile | selectedFile存在 |
| F06 | 终止解析按钮 | button | 解析进度 | @click=handleAbortParse | aiStore.parseLoading | 解析进行中 |
| F07 | 错误关闭按钮 | button | 错误提示 | @click=aiStore.parseError='' | aiStore.parseError | 错误存在 |
| F08 | 切换模型重试按钮 | button | 错误提示 | @click=handleRecoveryParse | aiStore.parseError | 错误存在 |
| F09 | 配方名称输入 | t-input | 基本信息卡 | v-model=editedName | editedName | 解析结果存在 |
| F10 | 成品重量输入 | t-input-number | 基本信息卡 | v-model=editedWeight | editedWeight | 解析结果存在 |
| F11 | 主料含量比系数 | t-input-number | 基本信息卡 | v-model=editedRatioFactor | editedRatioFactor | 解析结果存在 |
| F12 | 辅料含量比系数 | t-input-number | 基本信息卡 | v-model=editedSupplementRatioFactor | editedSupplementRatioFactor | 解析结果存在 |
| F13 | 未识别业务员标签 | t-tag | 基本信息卡 | @click=openQuickCreateSalesman | salesmanNotMatched | salesmanNotMatched=true |
| F14 | 业务员选择下拉 | t-select | 业务员匹配卡 | v-model=selectedSalesmanId, @change=onSelectSalesman | salesmenList | salesmanNotMatched=true |
| F15 | 快速创建业务员按钮 | button | 业务员匹配卡 | @click=openQuickCreateSalesman | showQuickCreateSalesman | salesmanNotMatched=true |
| F16 | 全部恢复按钮 | button | 报价工具栏 | @click=handleRestoreAllAdjustments | quoteAdjustments, qtyAdjustments | 有调整项 |
| F17 | 包材费用输入 | t-input-number | 报价卡 | v-model=packagingPrice | packagingPrice | 解析结果存在 |
| F18 | 其他费用输入 | t-input-number | 报价卡 | v-model=otherPrice | otherPrice | 解析结果存在 |
| F19 | 利润率输入 | t-input-number | 报价卡 | v-model=profitMargin | profitMargin | 解析结果存在 |
| F20 | 原料表格核心 | MaterialTableCore | 右栏 | @update:materials, @quick-add-material | materialTableRows | 解析结果存在 |
| F21 | 确认生成配方按钮 | t-button | 操作区 | @click=backfillData | formulaStore.loading, submitBlockReasons | 无error级阻塞 |
| F22 | 重新解析下拉 | t-dropdown | 操作区 | - | aiStore.models | 解析结果存在 |
| F23 | 清空按钮 | button | 操作区 | @click=clearResult | aiStore.parseResult | 解析结果存在 |
| F24 | 保存为模板按钮 | button | 操作区 | @click=showSaveFormulaTemplateDialog | saveFormulaTemplateDialogVisible | 解析结果存在 |
| F25 | 创建配方表单 | t-form | 表单区 | @submit=handleFormSubmit | formData, formErrors | showFormSection=true |
| F26 | 业务员选择(表单) | t-select | 表单 | v-model=formData.salesmanId | formData.salesmanId | showFormSection=true |
| F27 | 添加原料按钮 | button | 表单 | @click=addMaterial | formData.materials | showFormSection=true |
| F28 | 移除原料按钮 | button | 表单 | @click=removeMaterial(idx) | formData.materials | showFormSection=true |
| F29 | 继续创建按钮 | button | 成功页 | @click=handleCreateAnother | submitSuccess | submitSuccess=true |
| F30 | 去发布按钮 | button | 成功页 | @click=goToDashboard | submitSuccess | submitSuccess=true |
| F31 | 查看文件详情按钮 | button | 成功页 | @click=goToFileDetail | uploadedFileInfo | uploadedFileInfo存在 |
| F32 | 快速创建业务员抽屉 | QuickCreateSalesmanDrawer | 页面级 | v-model:visible, @created=onSalesmanCreated | showQuickCreateSalesman | - |
| F33 | 快速创建原料抽屉 | QuickCreateMaterialDrawer | 页面级 | v-model:visible, @created=onMaterialCreated | showQuickCreateMaterial | - |
| F34 | 保存模板对话框 | t-dialog | 页面级 | @confirm=handleSaveFormulaTemplate | saveFormulaTemplateDialogVisible | - |

### MaterialImportTab（32个）

| 编号 | 元素名称 | 组件类型 | 所在区域 | 绑定事件 | 关联状态 | 前置条件 |
|------|---------|---------|---------|---------|---------|---------|
| M01 | 文件上传区域 | div | AI面板 | @click=triggerFileUpload, @dragover/dragleave/drop | isDragOver, selectedFile | 未解析且未加载 |
| M02 | 隐藏文件输入 | input[file] | 上传区域 | @change=handleFileInputChange | selectedFile | - |
| M03 | 解析模板选择 | t-radio-group | AI面板 | v-model=selectedTemplateId, @change=handleTemplateChange | templateList | templateList.length>0 |
| M04 | 开始解析按钮 | button | 文件选中行 | @click=handleParse | selectedFile, aiStore.materialParseLoading | selectedFile存在且模型已选 |
| M05 | 取消文件按钮 | button | 文件选中行 | @click=clearSelectedFile | selectedFile | selectedFile存在 |
| M06 | 终止解析按钮 | button | 解析进度 | @click=handleAbortParse | aiStore.materialParseLoading | 解析进行中 |
| M07 | 错误关闭按钮 | button | 错误提示 | @click=aiStore.materialParseError='' | aiStore.materialParseError | 错误存在 |
| M08 | 切换模型重试按钮 | button | 错误提示 | @click=handleRecoveryParse | aiStore.materialParseError | 错误存在 |
| M09 | 保存为模板按钮 | button | 结果操作栏 | @click=showSaveTemplateDialog | saveTemplateDialogVisible | parsedItems非空 |
| M10 | 清空结果按钮 | button | 结果操作栏 | @click=handleClearResult | parsedItems | parsedItems非空 |
| M11 | 重新解析下拉 | t-dropdown | 结果操作栏 | - | aiStore.models | parsedItems非空 |
| M12 | 名称编辑单元格 | div/input | 数据表格 | @click=startEdit, @blur=stopEdit, @keydown.enter=stopEdit | editingCell, item.name | 点击名称单元格 |
| M13 | 单价调整输入 | t-input-number | 数据表格 | @change=handlePriceAdjust | item.unitPrice, priceAdjustments | item.unitPrice非null |
| M14 | 恢复原价按钮 | button | 数据表格 | @click=handleRestorePrice | priceAdjustments | priceAdjustments[index].isAdjusted |
| M15 | 查看差异按钮 | button | 数据表格 | @click=openDiff(index) | diffStatusMap, item.isRecorded | item.isRecorded且存在差异 |
| M16 | 移除行按钮 | button | 数据表格 | @click=removeItem(index) | parsedItems | - |
| M17 | 一键录入按钮 | button | 批量操作 | @click=handleBatchSubmit | batchSubmitting, validItems | validItems.length>0 |
| M18 | 逐条录入按钮 | button | 批量操作 | @click=startSequentialImport | batchSubmitting, validItems | validItems.length>0且非逐条模式 |
| M19 | 确认录入按钮 | button | 逐条确认卡 | @click=confirmSequentialItem | sequentialActive | sequentialActive=true |
| M20 | 跳过按钮 | button | 逐条确认卡 | @click=skipSequentialItem | sequentialActive | sequentialActive=true |
| M21 | 终止录入按钮 | button | 逐条确认卡 | @click=stopSequentialImport | sequentialActive | sequentialActive=true |
| M22 | 撤销导入按钮 | button | 录入完成卡 | @click=handleUndoImport | canUndoImport, undoLoading | canUndoImport=true且5分钟内 |
| M23 | 保存模板对话框 | t-dialog | 页面级 | @confirm=handleSaveTemplate | saveTemplateDialogVisible | - |
| M24 | 模板名称输入 | t-input | 保存模板弹窗 | v-model=saveTemplateForm.name | saveTemplateForm.name | saveTemplateDialogVisible=true |
| M25 | 模板分类选择 | t-select | 保存模板弹窗 | v-model=saveTemplateForm.category | saveTemplateForm.category | saveTemplateDialogVisible=true |
| M26 | 默认模型选择 | t-select | 保存模板弹窗 | v-model=saveTemplateForm.defaultProvider | saveTemplateForm.defaultProvider | saveTemplateDialogVisible=true |
| M27 | 自定义提示词 | t-textarea | 保存模板弹窗 | v-model=saveTemplateForm.customPrompt | saveTemplateForm.customPrompt | saveTemplateDialogVisible=true |
| M28 | 差异对比对话框 | t-dialog | 页面级 | - | diffDialogVisible, diffData | - |
| M29 | 差异选择单选组 | t-radio-group | 差异弹窗 | @change=handleDiffChoice | diffChoices | diffDialogVisible=true |
| M30 | 取消差异按钮 | button | 差异弹窗 | @click=cancelDiff | diffDialogVisible | diffDialogVisible=true |
| M31 | 重置差异按钮 | button | 差异弹窗 | @click=resetDiffChoices | diffChoices | diffDialogVisible=true |
| M32 | 应用差异按钮 | button | 差异弹窗 | @click=applyDiff | diffChoices | diffDialogVisible=true |

### DataSearchTab（8个）

| 编号 | 元素名称 | 组件类型 | 所在区域 | 绑定事件 | 关联状态 | 前置条件 |
|------|---------|---------|---------|---------|---------|---------|
| D01 | 搜索输入框 | t-textarea | 搜索输入区 | v-model=searchQuery | searchQuery | 无 |
| D02 | 智能查询按钮 | button | 搜索输入区 | @click=handleSearch | searchQuery, searchLoading | searchQuery.trim()非空 |
| D03 | 导出CSV按钮 | button | 搜索输入区 | @click=handleExport | searchResult | searchResult非null |
| D04 | 快速示例标签 | t-tag | 快速标签区 | @click=fillAndSearch(tag) | quickTags | 无 |
| D05 | SQL折叠头 | div | 结果区 | @click=sqlExpanded=!sqlExpanded | sqlExpanded | searchResult非null |
| D06 | 搜索历史标签 | t-tag | 搜索历史区 | @click=fillAndSearch(h) | searchHistory | searchHistory.length>0且无searchResult |
| D07 | 清空历史按钮 | button | 搜索历史区 | @click=searchHistory=[] | searchHistory | searchHistory.length>0 |
| D08 | 结果表格 | table | 结果区 | - | searchResult.rows | searchResult.rows.length>0 |

### ParseHistoryTab（21个）

| 编号 | 元素名称 | 组件类型 | 所在区域 | 绑定事件 | 关联状态 | 前置条件 |
|------|---------|---------|---------|---------|---------|---------|
| H01 | 降级提示横幅 | DegradationBanner | 页面顶部 | v-model:visible, @config-click=goToConfig | showDegradationBanner | - |
| H02 | 总数卡片 | div | 概览卡片区 | @click=filterByStatus('all') | statistics.totalCount | - |
| H03 | 存储状态卡片 | div | 概览卡片区 | @click=showStorageDetail=true | statistics.usagePercent | - |
| H04 | 待处理卡片 | div | 概览卡片区 | @click=filterByStatus('pending') | statistics.statsByStatus.pending | - |
| H05 | 已关联卡片 | div | 概览卡片区 | @click=filterByLinked() | linkedCount | - |
| H06 | 全选复选框 | t-checkbox | 批量操作栏 | @change=handleSelectAll | selectAll, isIndeterminate | selectedIds.length>0 |
| H07 | 批量删除按钮 | t-popconfirm | 批量操作栏 | @confirm=handleBatchDelete | selectedIds, batchDeleteLoading | selectedIds.length>0 |
| H08 | 取消选择按钮 | button | 批量操作栏 | @click=clearSelection | selectedIds | selectedIds.length>0 |
| H09 | 状态筛选下拉 | t-select | 工具栏 | v-model=searchParams.status, @change=handleSearch | searchParams.status | - |
| H10 | 时间范围选择器 | t-date-range-picker | 工具栏 | v-model=dateRange, @change=handleDateRangeChange | dateRange | - |
| H11 | 搜索输入框 | t-input | 工具栏 | v-model=searchParams.searchText, @enter=handleSearch | searchParams.searchText | - |
| H12 | 刷新按钮 | button | 工具栏 | @click=handleRefresh | - | - |
| H13 | 重置按钮 | button | 工具栏 | @click=handleReset | searchParams | - |
| H14 | 记录选择复选框 | t-checkbox | 记录卡片 | @change=toggleSelect | selectedIds | - |
| H15 | 删除记录按钮 | t-popconfirm | 记录卡片 | @confirm=handleDelete(item.id) | items | - |
| H16 | 记录卡片点击 | div | 记录卡片body | @click=showDetail(item) | detailDrawerVisible | - |
| H17 | 分页按钮 | button | 分页区 | @click=handlePageChange | pagination | pagination.total>0 |
| H18 | 详情抽屉 | t-drawer | 页面级 | v-model:visible=detailDrawerVisible | detailDrawerVisible | - |
| H19 | 复制结果按钮 | t-button | 详情抽屉 | @click=copyResult | currentDetail.parsedResult | currentDetail.status='success' |
| H20 | 恢复解析结果按钮 | t-button | 详情抽屉 | @click=handleRestore | currentDetail | currentDetail存在 |
| H21 | 删除记录按钮(详情) | t-popconfirm | 详情抽屉 | @confirm=handleDeleteFromDetail | currentDetail | currentDetail存在 |

---

## 三、测试用例

### 3.1 SmartTools.vue 主页面

#### S1 - PageSkeleton

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S1-P01 | 正向 | 页面首次加载显示骨架屏 | 页面未初始化 | 1. 访问智能工具页面 | 显示 PageSkeleton 组件，type="cards"，rows=3 |
| S1-E01 | 异常 | 模型加载失败时骨架屏消失 | API异常 | 1. 访问页面 2. 模型加载请求失败 | 骨架屏消失，显示主卡片内容，模型选择区域显示"暂无模型" |
| S1-B01 | 边界 | 极慢网络下骨架屏持续时间 | 网络延迟>5s | 1. 访问页面 2. 模型加载缓慢 | 骨架屏持续显示直到 initialized=true |
| S1-U01 | UI | 骨架屏动画效果 | 页面未初始化 | 1. 访问页面 | 骨架屏有渐变闪烁动画，aria-busy="true" |
| S1-L01 | 联动 | 骨架屏到内容卡片的过渡 | 页面加载中 | 1. 访问页面 2. 等待初始化完成 | content-fade 过渡动画平滑切换 |

#### S2 - t-card 主容器

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S2-P01 | 正向 | 初始化完成后显示主卡片 | initialized=true | 1. 页面加载完成 | 显示 t-card，bordered，min-height=500px，圆角 radius-4xl |
| S2-E01 | 异常 | 初始化异常后仍显示卡片 | 初始化部分失败 | 1. 模型加载失败 | 卡片正常显示，内容区可操作 |
| S2-B01 | 边界 | 卡片最小高度约束 | 内容极少 | 1. 页面加载 | 卡片高度不小于 500px |
| S2-U01 | UI | 卡片阴影和边框样式 | 页面正常 | 1. 查看卡片样式 | box-shadow 正确，border=none，overflow=hidden |
| S2-L01 | 联动 | 卡片内容区随Tab切换变化 | 页面已加载 | 1. 切换不同Tab | 内容区显示对应Tab组件，fadeInUp动画 |

#### S3 - Tab按钮(智能填单)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S3-P01 | 正向 | 点击切换到智能填单Tab | 页面已加载 | 1. 点击"智能填单"Tab | activeTab='smart-form'，按钮高亮，显示FormulaParseTab |
| S3-E01 | 异常 | 快速连续点击Tab | 页面已加载 | 1. 快速连续点击3次 | 最终状态正确，无闪烁或重复渲染 |
| S3-B01 | 边界 | 页面初始默认Tab | 页面刚加载 | 1. 观察默认Tab | 默认activeTab='smart-form'，智能填单高亮 |
| S3-U01 | UI | Tab按钮激活态样式 | 页面已加载 | 1. 点击智能填单Tab | 按钮背景渐变 primary→primary-dark，白色文字，阴影 |
| S3-L01 | 联动 | URL参数恢复Tab | URL含?tab=smart-search | 1. 访问带tab参数的URL | activeTab自动设为'smart-search'，对应Tab高亮 |

#### S4 - Tab按钮(智能导入)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S4-P01 | 正向 | 点击切换到智能导入Tab | 页面已加载 | 1. 点击"智能导入"Tab | activeTab='smart-import'，显示MaterialImportTab |
| S4-E01 | 异常 | 解析进行中切换Tab | 智能填单解析中 | 1. 开始解析 2. 切换到智能导入 | 解析继续，切回后状态保持 |
| S4-B01 | 边界 | 重复点击当前已激活Tab | 智能导入已激活 | 1. 再次点击智能导入Tab | 无异常，状态不变 |
| S4-U01 | UI | Tab按钮hover效果 | 页面已加载 | 1. 鼠标悬停智能导入Tab | 背景变为 color-border-light，文字变深 |
| S4-L01 | 联动 | Tab切换时模型选择保持 | 已选择模型 | 1. 切换到智能导入 2. 检查模型选择 | 模型选择状态在Tab间共享 |

#### S5 - Tab按钮(智能查询)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S5-P01 | 正向 | 点击切换到智能查询Tab | 页面已加载 | 1. 点击"智能查询"Tab | activeTab='smart-search'，显示DataSearchTab |
| S5-E01 | 异常 | 查询进行中切换Tab | 查询请求中 | 1. 发起查询 2. 切换到其他Tab | 查询继续，切回后结果可显示 |
| S5-B01 | 边界 | Ctrl+Enter快捷键查询 | 在智能查询Tab | 1. 输入查询 2. 按Ctrl+Enter | 触发查询 |
| S5-U01 | UI | Tab图标SVG正确渲染 | 页面已加载 | 1. 查看智能查询Tab图标 | 显示搜索图标（circle+line） |
| S5-L01 | 联动 | 查询结果与模型选择联动 | 已选择不同模型 | 1. 切换模型 2. 执行查询 | 使用当前选择的模型执行查询 |

#### S6 - Tab按钮(解析历史)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S6-P01 | 正向 | 点击切换到解析历史Tab | 页面已加载 | 1. 点击"解析历史"Tab | activeTab='smart-history'，显示ParseHistoryTab |
| S6-E01 | 异常 | 解析历史API失败 | API异常 | 1. 切换到解析历史 | 显示空状态或错误提示 |
| S6-B01 | 边界 | highlight参数高亮记录 | URL含highlight参数 | 1. 从其他页面跳转带highlight | 对应记录高亮并滚动到可见区域 |
| S6-U01 | UI | Tab按钮图标正确 | 页面已加载 | 1. 查看解析历史Tab图标 | 显示时钟图标（circle+polyline） |
| S6-L01 | 联动 | 解析操作后历史自动刷新 | 执行过解析 | 1. 完成一次解析 2. 切换到解析历史 | 新记录出现在列表中 |

#### S7 - 模型选择t-select

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S7-P01 | 正向 | 选择模型并切换 | modelGroups.length>0 | 1. 点击下拉 2. 选择一个模型 | selectedModelKey更新，aiStore.selectedModel/Version更新，成功提示 |
| S7-E01 | 异常 | 版本切换失败 | API异常 | 1. 选择模型 2. switchVersion失败 | 提示"版本切换失败" |
| S7-B01 | 边界 | 只有一个模型可选 | 仅1个provider | 1. 查看下拉 | 显示该模型，默认选中 |
| S7-U01 | UI | 模型logo和标签显示 | 模型有logo | 1. 展开下拉 | 每个选项显示logo、名称、文本/图片标签、选中勾 |
| S7-L01 | 联动 | 模型切换影响所有Tab | 页面已加载 | 1. 切换模型 2. 在各Tab执行操作 | 所有Tab使用新选择的模型 |

#### S8 - "暂无模型"提示

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| S8-P01 | 正向 | 无模型时显示提示 | modelGroups.length===0 | 1. 所有模型API不可用 | 显示"暂无模型"文字和警告图标 |
| S8-E01 | 异常 | 模型加载中途失败 | 部分模型加载失败 | 1. 部分API超时 | 显示已加载的模型，不显示"暂无模型" |
| S8-B01 | 边界 | 模型列表从空变为非空 | 初始无模型 | 1. 等待模型加载完成 | "暂无模型"消失，下拉选择器出现 |
| S8-U01 | UI | 提示文字样式 | 无模型 | 1. 查看提示 | color: color-text-placeholder，字号12px |
| S8-L01 | 联动 | 无模型时各Tab操作受限 | 无模型 | 1. 在智能填单点击解析 | 提示"请先选择AI模型" |

---

### 3.2 FormulaParseTab 智能填单

#### F01 - 文件上传区域

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F01-P01 | 正向 | 点击上传区域触发文件选择 | 未解析 | 1. 点击上传区域 | 触发fileInputRef.click()，弹出文件选择框 |
| F01-E01 | 异常 | 上传超过10MB的文件 | 未解析 | 1. 选择>10MB的文件 | 提示"文件大小不能超过10MB"，selectedFile不变 |
| F01-B01 | 边界 | 上传刚好10MB的文件 | 未解析 | 1. 选择=10MB的文件 | 文件正常选中 |
| F01-U01 | UI | 拖拽hover效果 | 未解析 | 1. 拖拽文件到上传区域 | 区域边框变色，背景变色，isDragOver=true |
| F01-L01 | 联动 | 拖拽释放后显示文件信息 | 未解析 | 1. 拖拽文件到区域并释放 | selectedFile更新，显示文件选中行 |

#### F02 - 隐藏文件输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F02-P01 | 正向 | 选择xlsx文件 | 未解析 | 1. 通过文件选择框选择.xlsx文件 | selectedFile更新，显示文件选中行 |
| F02-E01 | 异常 | 选择不支持的文件格式 | 未解析 | 1. 选择.doc文件 | accept限制不允许选择（浏览器行为） |
| F02-B01 | 边界 | 选择最小有效文件(1KB) | 未解析 | 1. 选择1KB的xlsx文件 | 文件正常选中 |
| F02-U01 | UI | input元素隐藏 | 页面已加载 | 1. 检查DOM | input style="display: none" |
| F02-L01 | 联动 | 文件变更后解析按钮可用 | 已选模型 | 1. 选择文件 | 开始解析按钮变为可点击 |

#### F03 - 配方解析模板选择

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F03-P01 | 正向 | 选择预设模板 | formulaTemplateList.length>0 | 1. 点击模板单选按钮 | selectedFormulaTemplateId更新，模型可能切换 |
| F03-E01 | 异常 | 模板加载失败 | API异常 | 1. 模板列表为空 | 不显示模板选择区域 |
| F03-B01 | 边界 | 无模板时不显示选择器 | templateList为空 | 1. 查看AI面板 | 模板选择区域不渲染 |
| F03-U01 | UI | 模板单选按钮样式 | 有模板 | 1. 查看模板选择器 | variant="default-filled"，size="small" |
| F03-L01 | 联动 | 模板切换联动模型 | 模板有defaultProvider | 1. 选择带默认模型的模板 | aiStore.selectedModel更新为模板指定模型 |

#### F04 - 开始解析按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F04-P01 | 正向 | 点击开始解析 | selectedFile存在且模型已选 | 1. 点击"开始解析" | 触发aiStore.parseFormula，显示解析进度 |
| F04-E01 | 异常 | 未选模型点击解析 | selectedFile存在但无模型 | 1. 点击"开始解析" | 按钮disabled，不可点击 |
| F04-B01 | 边界 | 解析中按钮状态 | 解析进行中 | 1. 查看按钮 | 按钮显示"解析中..."，disabled |
| F04-U01 | UI | 按钮hover效果 | 文件已选 | 1. 鼠标悬停按钮 | 按钮上移2px，显示阴影 |
| F04-L01 | 联动 | 解析完成后显示结果 | 解析成功 | 1. 等待解析完成 | 显示解析结果区域，隐藏上传区域 |

#### F05 - 取消文件按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F05-P01 | 正向 | 点击取消已选文件 | selectedFile存在 | 1. 点击"取消"按钮 | selectedFile=null，fileInputRef.value=''，恢复上传区域 |
| F05-E01 | 异常 | 解析中点击取消 | 解析进行中 | 1. 解析中点击取消 | 取消按钮不可见（v-if条件不满足） |
| F05-B01 | 边界 | 快速选文件后立即取消 | 刚选文件 | 1. 选文件 2. 立即点取消 | selectedFile正确清空 |
| F05-U01 | UI | 取消按钮hover变红 | 文件已选 | 1. 鼠标悬停取消按钮 | 背景变danger-bg，文字变danger |
| F05-L01 | 联动 | 取消文件后解析按钮隐藏 | 文件已选 | 1. 取消文件 | 文件选中行消失，上传区域恢复 |

#### F06 - 终止解析按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F06-P01 | 正向 | 点击终止解析 | 解析进行中 | 1. 点击"终止"按钮 | aiStore.abortParseFormula()，显示"AI解析已终止"提示 |
| F06-E01 | 异常 | 已终止后再次点击终止 | 已终止 | 1. 点击终止按钮 | 按钮不可见（v-if条件不满足） |
| F06-B01 | 边界 | 解析刚开始即终止 | 解析<1s | 1. 开始解析 2. 立即终止 | 正常终止，无残留状态 |
| F06-U01 | UI | 终止按钮样式 | 解析中 | 1. 查看终止按钮 | 红色渐变背景，白色文字，圆角20px |
| F06-L01 | 联动 | 终止后状态指示器变化 | 解析中 | 1. 终止解析 | 状态指示器变为"已终止"样式，红色 |

#### F07 - 错误关闭按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F07-P01 | 正向 | 关闭错误提示 | parseError存在 | 1. 点击✕按钮 | aiStore.parseError=''，错误提示消失 |
| F07-E01 | 异常 | 错误为空时按钮不可见 | 无错误 | 1. 查看页面 | 错误关闭按钮不渲染 |
| F07-B01 | 边界 | 长错误消息显示 | 错误消息>200字符 | 1. 查看错误提示 | 文字溢出省略 |
| F07-U01 | UI | 关闭按钮hover效果 | 有错误 | 1. 鼠标悬停✕ | 透明度从0.5变为1 |
| F07-L01 | 联动 | 关闭错误后可重新上传 | 有错误 | 1. 关闭错误 2. 查看上传区域 | 上传区域或文件选中行恢复显示 |

#### F08 - 切换模型重试按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F08-P01 | 正向 | 切换模型重试解析 | parseError存在 | 1. 点击"切换模型重试" | 自动切换到下一个模型，重新发起解析 |
| F08-E01 | 异常 | 只有一个模型时重试 | 仅1个模型 | 1. 点击重试 | 循环回同一模型，重新解析 |
| F08-B01 | 边界 | 最后一个模型重试 | 当前是最后一个模型 | 1. 点击重试 | 循环到第一个模型 |
| F08-U01 | UI | 重试按钮样式 | 有错误 | 1. 查看按钮 | warning渐变背景，白色文字 |
| F08-L01 | 联动 | 重试成功后显示结果 | 重试解析成功 | 1. 重试 2. 等待完成 | 错误消失，显示解析结果 |

#### F09 - 配方名称输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F09-P01 | 正向 | 修改配方名称 | 解析结果存在 | 1. 在输入框中修改名称 | editedName更新，输入框显示changed样式 |
| F09-E01 | 异常 | 输入超长名称 | 解析结果存在 | 1. 输入>100字符 | 输入框正常显示（无maxlength限制） |
| F09-B01 | 边界 | 清空名称 | 解析结果存在 | 1. 清空输入框 | editedName=''，placeholder显示 |
| F09-U01 | UI | 修改后显示撤销按钮 | 名称已修改 | 1. 修改名称 | 显示rollback撤销按钮，输入框边框高亮 |
| F09-L01 | 联动 | 名称修改影响生成配方 | 名称已修改 | 1. 修改名称 2. 生成配方 | 使用修改后的名称创建配方 |

#### F10 - 成品重量输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F10-P01 | 正向 | 修改成品重量 | 解析结果存在 | 1. 修改重量值 | editedWeight更新，报价重新计算 |
| F10-E01 | 异常 | 输入负数 | 解析结果存在 | 1. 输入-100 | t-input-number限制最小值 |
| F10-B01 | 边界 | 输入0 | 解析结果存在 | 1. 输入0 | 允许输入，但报价计算可能异常 |
| F10-U01 | UI | 数字输入框对齐方式 | 解析结果存在 | 1. 查看输入框 | align="right" |
| F10-L01 | 联动 | 重量变化影响营养成分计算 | 解析结果存在 | 1. 修改重量 2. 查看营养数据 | ratio重新计算，营养成分值更新 |

#### F11 - 主料含量比系数

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F11-P01 | 正向 | 修改主料含量比系数 | 解析结果存在 | 1. 修改ratioFactor值 | editedRatioFactor更新，营养成分重新计算 |
| F11-E01 | 异常 | 输入极端大值 | 解析结果存在 | 1. 输入999 | 允许输入，营养成分值可能溢出 |
| F11-B01 | 边界 | 输入0 | 解析结果存在 | 1. 输入0 | 所有主料营养归零 |
| F11-U01 | UI | 系数输入框样式 | 解析结果存在 | 1. 查看输入框 | t-input-number，size="small" |
| F11-L01 | 联动 | 系数变化影响报价 | 解析结果存在 | 1. 修改系数 2. 查看报价 | 原料成本变化，总报价更新 |

#### F12 - 辅料含量比系数

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F12-P01 | 正向 | 修改辅料含量比系数 | 解析结果存在 | 1. 修改supplementRatioFactor值 | editedSupplementRatioFactor更新 |
| F12-E01 | 异常 | 输入负数 | 解析结果存在 | 1. 输入-0.5 | t-input-number限制 |
| F12-B01 | 边界 | 辅料系数为1.0(默认) | 解析结果存在 | 1. 查看默认值 | 默认值为1.0 |
| F12-U01 | UI | 辅料系数标签 | 解析结果存在 | 1. 查看输入框 | 标签显示"辅料含量比系数" |
| F12-L01 | 联动 | 辅料系数影响辅料营养计算 | 解析结果存在 | 1. 修改辅料系数 | 辅料类原料的营养数据重新计算 |

#### F13 - 未识别业务员标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F13-P01 | 正向 | 点击未识别业务员标签 | salesmanNotMatched=true | 1. 点击标签 | 打开快速创建业务员抽屉 |
| F13-E01 | 异常 | 业务员已匹配 | salesmanNotMatched=false | 1. 查看页面 | 标签不显示 |
| F13-B01 | 边界 | 多个业务员名称未匹配 | 多个未匹配 | 1. 查看标签 | 显示所有未匹配的业务员名称 |
| F13-U01 | UI | 标签样式 | 未匹配 | 1. 查看标签 | warning主题，可点击 |
| F13-L01 | 联动 | 创建业务员后标签消失 | 未匹配 | 1. 创建业务员 2. 返回 | 标签消失，业务员下拉可选 |

#### F14 - 业务员选择下拉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F14-P01 | 正向 | 选择匹配的业务员 | salesmanNotMatched=true | 1. 从下拉选择业务员 | selectedSalesmanId更新 |
| F14-E01 | 异常 | 业务员列表为空 | 无业务员 | 1. 查看下拉 | 下拉为空或显示无选项 |
| F14-B01 | 边界 | 业务员列表很长 | >50个业务员 | 1. 滚动选择 | 下拉可滚动，支持搜索 |
| F14-U01 | UI | 下拉样式 | 有业务员 | 1. 查看下拉 | t-select正常渲染 |
| F14-L01 | 联动 | 选择业务员后表单同步 | 已选业务员 | 1. 选择业务员 2. 生成配方 | formData.salesmanId使用选择的ID |

#### F15 - 快速创建业务员按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F15-P01 | 正向 | 打开快速创建抽屉 | salesmanNotMatched=true | 1. 点击"快速创建" | showQuickCreateSalesman=true，抽屉打开 |
| F15-E01 | 异常 | 创建失败 | 抽屉已打开 | 1. 提交空表单 | 抽屉内显示验证错误 |
| F15-B01 | 边界 | 创建成功后自动选中 | 抽屉已打开 | 1. 创建业务员成功 | 新业务员自动选中，抽屉关闭 |
| F15-U01 | UI | 按钮样式 | 未匹配 | 1. 查看按钮 | 主题色按钮 |
| F15-L01 | 联动 | 创建后业务员列表刷新 | 创建成功 | 1. 创建业务员 | salesmenList刷新，新业务员可选 |

#### F16 - 全部恢复按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F16-P01 | 正向 | 恢复所有调整项 | 有调整项 | 1. 点击"全部恢复" | 所有quoteAdjustments和qtyAdjustments恢复原值 |
| F16-E01 | 异常 | 无调整项时按钮不可见 | 无调整 | 1. 查看页面 | 按钮不渲染 |
| F16-B01 | 边界 | 仅一个调整项 | 1个调整 | 1. 点击全部恢复 | 该调整项恢复 |
| F16-U01 | UI | 按钮位置和样式 | 有调整 | 1. 查看按钮 | 在报价工具栏中 |
| F16-L01 | 联动 | 恢复后报价重新计算 | 有调整 | 1. 全部恢复 | 报价数据回到原始值 |

#### F17 - 包材费用输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F17-P01 | 正向 | 输入包材费用 | 解析结果存在 | 1. 输入包材费用值 | packagingPrice更新，总报价更新 |
| F17-E01 | 异常 | 输入负数 | 解析结果存在 | 1. 输入-10 | t-input-number限制min=0 |
| F17-B01 | 边界 | 输入0 | 解析结果存在 | 1. 输入0 | 包材费用为0，总报价不含包材 |
| F17-U01 | UI | 输入框精度 | 解析结果存在 | 1. 输入1.234 | 保留2位小数 |
| F17-L01 | 联动 | 包材费用影响总报价 | 解析结果存在 | 1. 修改包材费用 | 总报价=原料成本+包材+其他+利润 |

#### F18 - 其他费用输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F18-P01 | 正向 | 输入其他费用 | 解析结果存在 | 1. 输入其他费用值 | otherPrice更新，总报价更新 |
| F18-E01 | 异常 | 输入极大值 | 解析结果存在 | 1. 输入999999 | 允许输入，总报价相应增大 |
| F18-B01 | 边界 | 输入0 | 解析结果存在 | 1. 输入0 | 其他费用为0 |
| F18-U01 | UI | 输入框样式 | 解析结果存在 | 1. 查看输入框 | t-input-number，size="small" |
| F18-L01 | 联动 | 其他费用影响总报价 | 解析结果存在 | 1. 修改其他费用 | 总报价更新 |

#### F19 - 利润率输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F19-P01 | 正向 | 输入利润率 | 解析结果存在 | 1. 输入利润率(如30) | profitMargin更新，建议售价更新 |
| F19-E01 | 异常 | 输入负利润率 | 解析结果存在 | 1. 输入-10 | 可能允许，售价低于成本 |
| F19-B01 | 边界 | 输入0%利润率 | 解析结果存在 | 1. 输入0 | 售价=成本 |
| F19-U01 | UI | 利润率单位显示 | 解析结果存在 | 1. 查看输入框 | 显示%后缀或说明 |
| F19-L01 | 联动 | 利润率影响建议售价 | 解析结果存在 | 1. 修改利润率 | 建议售价=成本×(1+利润率%) |

#### F20 - 原料表格核心(MaterialTableCore)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F20-P01 | 正向 | 显示解析的原料列表 | 解析结果存在 | 1. 查看原料表格 | 显示所有解析出的原料行 |
| F20-E01 | 异常 | 无原料数据 | 解析结果无原料 | 1. 查看表格 | 显示空状态 |
| F20-B01 | 边界 | 大量原料(>50行) | 解析出50+原料 | 1. 查看表格 | 表格可滚动，性能正常 |
| F20-U01 | UI | 表格行样式 | 解析结果存在 | 1. 查看行样式 | 交替行颜色，hover高亮 |
| F20-L01 | 联动 | 修改原料数量影响报价 | 解析结果存在 | 1. 修改某原料数量 | 该原料成本变化，总报价更新 |

#### F21 - 确认生成配方按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F21-P01 | 正向 | 点击生成配方 | 无error级阻塞 | 1. 点击"确认生成配方" | backfillData执行，显示创建表单 |
| F21-E01 | 异常 | 有error级阻塞时按钮禁用 | 有error阻塞 | 1. 查看按钮 | 按钮disabled，tooltip显示阻塞原因 |
| F21-B01 | 边界 | 提交中按钮状态 | 正在提交 | 1. 查看按钮 | 按钮loading，不可重复点击 |
| F21-U01 | UI | 按钮主题和位置 | 解析结果存在 | 1. 查看按钮 | primary主题，在操作区 |
| F21-L01 | 联动 | 生成后跳转到表单 | 点击生成 | 1. 生成配方 | showFormSection=true，表单预填数据 |

#### F22 - 重新解析下拉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F22-P01 | 正向 | 选择其他模型重新解析 | 解析结果存在 | 1. 点击重新解析 2. 选择模型 | 使用新模型重新解析同一文件 |
| F22-E01 | 异常 | 重新解析失败 | 选择模型后 | 1. 重新解析失败 | 显示错误提示 |
| F22-B01 | 边界 | 选择当前模型重新解析 | 解析结果存在 | 1. 选择当前模型 | 重新解析，结果可能不同 |
| F22-U01 | UI | 下拉菜单样式 | 解析结果存在 | 1. 展开下拉 | 显示所有可用模型，当前模型有勾 |
| F22-L01 | 联动 | 重新解析覆盖之前结果 | 解析结果存在 | 1. 重新解析成功 | 旧结果被替换，编辑状态重置 |

#### F23 - 清空按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F23-P01 | 正向 | 清空解析结果 | 解析结果存在 | 1. 点击"清空" | aiStore.parseResult清空，恢复上传区域 |
| F23-E01 | 异常 | 无结果时按钮不可见 | 无结果 | 1. 查看页面 | 清空按钮不渲染 |
| F23-B01 | 边界 | 编辑后清空 | 已修改名称/重量 | 1. 点击清空 | 所有编辑状态重置 |
| F23-U01 | UI | 清空按钮样式 | 解析结果存在 | 1. 查看按钮 | danger主题，删除图标 |
| F23-L01 | 联动 | 清空后恢复初始状态 | 解析结果存在 | 1. 清空 | 回到文件上传状态，可重新上传 |

#### F24 - 保存为模板按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F24-P01 | 正向 | 打开保存模板对话框 | 解析结果存在 | 1. 点击"保存为模板" | saveFormulaTemplateDialogVisible=true |
| F24-E01 | 异常 | 保存模板API失败 | 对话框已打开 | 1. 输入名称 2. 确认保存 | 显示错误提示 |
| F24-B01 | 边界 | 模板名称为空保存 | 对话框已打开 | 1. 不输入名称 2. 确认 | 提示"请输入模板名称" |
| F24-U01 | UI | 对话框样式 | 对话框已打开 | 1. 查看对话框 | t-dialog，width适中 |
| F24-L01 | 联动 | 保存成功后模板列表更新 | 保存成功 | 1. 保存模板 2. 重新上传文件 | 新模板出现在模板选择器中 |

#### F25 - 创建配方表单

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F25-P01 | 正向 | 提交创建配方表单 | showFormSection=true | 1. 填写表单 2. 提交 | 调用formulaStore.createFormula，submitSuccess=true |
| F25-E01 | 异常 | 表单验证失败 | showFormSection=true | 1. 必填项为空 2. 提交 | 显示验证错误 |
| F25-B01 | 边界 | 原料列表为空提交 | showFormSection=true | 1. 移除所有原料 2. 提交 | 验证失败或提示 |
| F25-U01 | UI | 表单布局 | showFormSection=true | 1. 查看表单 | t-form布局合理 |
| F25-L01 | 联动 | 提交成功显示成功页 | 提交成功 | 1. 提交表单 | 显示成功页面，含继续创建/去发布按钮 |

#### F26 - 业务员选择(表单)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F26-P01 | 正向 | 在表单中选择业务员 | showFormSection=true | 1. 从下拉选择业务员 | formData.salesmanId更新 |
| F26-E01 | 异常 | 业务员列表加载失败 | showFormSection=true | 1. 查看下拉 | 下拉为空 |
| F26-B01 | 边界 | 已预选业务员 | showFormSection=true | 1. 查看下拉 | 默认选中解析出的业务员 |
| F26-U01 | UI | 下拉样式 | showFormSection=true | 1. 查看下拉 | t-select正常渲染 |
| F26-L01 | 联动 | 业务员选择影响配方归属 | showFormSection=true | 1. 选择业务员 2. 提交 | 配方归属该业务员 |

#### F27 - 添加原料按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F27-P01 | 正向 | 添加新原料行 | showFormSection=true | 1. 点击"添加原料" | formData.materials增加一行空原料 |
| F27-E01 | 异常 | 快速连续添加 | showFormSection=true | 1. 快速点击5次 | 添加5行空原料 |
| F27-B01 | 边界 | 添加大量原料 | showFormSection=true | 1. 添加50行 | 表单可滚动，性能正常 |
| F27-U01 | UI | 按钮位置 | showFormSection=true | 1. 查看按钮 | 在原料列表下方 |
| F27-L01 | 联动 | 新增原料影响配方数据 | showFormSection=true | 1. 添加原料 2. 填写数据 3. 提交 | 新原料包含在配方中 |

#### F28 - 移除原料按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F28-P01 | 正向 | 移除原料行 | showFormSection=true | 1. 点击某行的移除按钮 | 该行从formData.materials中移除 |
| F28-E01 | 异常 | 移除最后一行 | 仅1行原料 | 1. 点击移除 | 原料列表为空 |
| F28-B01 | 边界 | 移除中间行 | 多行原料 | 1. 移除第3行 | 后续行索引正确更新 |
| F28-U01 | UI | 移除按钮样式 | showFormSection=true | 1. 查看按钮 | danger图标或文字 |
| F28-L01 | 联动 | 移除原料影响报价 | showFormSection=true | 1. 移除原料 | 原料成本减少，总报价更新 |

#### F29 - 继续创建按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F29-P01 | 正向 | 点击继续创建 | submitSuccess=true | 1. 点击"继续创建" | handleCreateAnother执行，重置表单，回到上传区域 |
| F29-E01 | 异常 | 创建中点击 | 正在创建 | 1. 点击按钮 | 按钮不可见（成功页才显示） |
| F29-B01 | 边界 | 连续创建多个配方 | 已创建1个 | 1. 继续创建 2. 重复3次 | 每次都能成功创建 |
| F29-U01 | UI | 按钮样式 | 成功页 | 1. 查看按钮 | default主题 |
| F29-L01 | 联动 | 继续创建后解析状态重置 | 成功页 | 1. 点击继续创建 | parseResult清空，回到初始上传状态 |

#### F30 - 去发布按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F30-P01 | 正向 | 点击去发布 | submitSuccess=true | 1. 点击"去发布" | 跳转到配方详情/发布页面 |
| F30-E01 | 异常 | 路由跳转失败 | submitSuccess=true | 1. 点击去发布 | 路由守卫处理 |
| F30-B01 | 边界 | 配方ID不存在 | 创建失败但误显示成功 | 1. 点击去发布 | 跳转后显示404或错误 |
| F30-U01 | UI | 按钮样式 | 成功页 | 1. 查看按钮 | primary主题 |
| F30-L01 | 联动 | 跳转携带配方ID | 创建成功 | 1. 点击去发布 | URL包含新配方的ID |

#### F31 - 查看文件详情按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F31-P01 | 正向 | 点击查看文件详情 | uploadedFileInfo存在 | 1. 点击按钮 | 跳转到文件详情页 |
| F31-E01 | 异常 | 文件上传失败 | uploadedFileInfo.uploaded=false | 1. 查看按钮 | 按钮可能不显示或跳转失败 |
| F31-B01 | 边界 | 无文件信息 | uploadedFileInfo=null | 1. 查看成功页 | 按钮不渲染 |
| F31-U01 | UI | 按钮样式 | 文件已上传 | 1. 查看按钮 | 次要按钮样式 |
| F31-L01 | 联动 | 跳转携带文件ID | 文件已上传 | 1. 点击查看 | URL包含fileId |

#### F32 - 快速创建业务员抽屉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F32-P01 | 正向 | 打开并创建业务员 | showQuickCreateSalesman=true | 1. 填写业务员信息 2. 提交 | 业务员创建成功，onSalesmanCreated触发 |
| F32-E01 | 异常 | 创建业务员失败 | 抽屉已打开 | 1. 提交无效数据 | 显示验证错误 |
| F32-B01 | 边界 | 关闭抽屉不创建 | 抽屉已打开 | 1. 点击关闭 | 抽屉关闭，无副作用 |
| F32-U01 | UI | 抽屉位置和大小 | 抽屉已打开 | 1. 查看抽屉 | 从右侧滑出 |
| F32-L01 | 联动 | 创建成功后业务员自动选中 | 创建成功 | 1. 创建业务员 | selectedSalesmanId更新为新业务员ID |

#### F33 - 快速创建原料抽屉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F33-P01 | 正向 | 打开并创建原料 | showQuickCreateMaterial=true | 1. 填写原料信息 2. 提交 | 原料创建成功，onMaterialCreated触发 |
| F33-E01 | 异常 | 创建原料失败 | 抽屉已打开 | 1. 提交无效数据 | 显示验证错误 |
| F33-B01 | 边界 | 关闭抽屉不创建 | 抽屉已打开 | 1. 点击关闭 | 抽屉关闭，无副作用 |
| F33-U01 | UI | 抽屉样式 | 抽屉已打开 | 1. 查看抽屉 | 从右侧滑出 |
| F33-L01 | 联动 | 创建成功后原料列表刷新 | 创建成功 | 1. 创建原料 | 原料下拉可选新原料 |

#### F34 - 保存模板对话框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| F34-P01 | 正向 | 保存配方解析模板 | 对话框已打开 | 1. 输入模板名称 2. 确认 | 模板保存成功，对话框关闭 |
| F34-E01 | 异常 | 模板名称为空 | 对话框已打开 | 1. 不输入名称 2. 确认 | 提示"请输入模板名称" |
| F34-B01 | 边界 | 模板名称超长 | 对话框已打开 | 1. 输入>30字符 | maxlength=30限制 |
| F34-U01 | UI | 对话框布局 | 对话框已打开 | 1. 查看对话框 | 包含名称、分类、模型、提示词字段 |
| F34-L01 | 联动 | 保存成功后模板列表更新 | 保存成功 | 1. 保存模板 2. 重新上传 | 新模板出现在选择器中 |

---

### 3.3 MaterialImportTab 智能导入

#### M01 - 文件上传区域

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M01-P01 | 正向 | 点击上传区域触发文件选择 | 未解析 | 1. 点击上传区域 | 触发fileInputRef.click() |
| M01-E01 | 异常 | 上传超过10MB的文件 | 未解析 | 1. 选择>10MB文件 | 提示"文件大小不能超过10MB" |
| M01-B01 | 边界 | 上传刚好10MB文件 | 未解析 | 1. 选择=10MB文件 | 文件正常选中 |
| M01-U01 | UI | 拖拽hover效果 | 未解析 | 1. 拖拽文件到区域 | drag-over样式生效 |
| M01-L01 | 联动 | 拖拽释放后显示文件信息 | 未解析 | 1. 拖拽释放 | selectedFile更新，显示文件选中行 |

#### M02 - 隐藏文件输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M02-P01 | 正向 | 选择xlsx文件 | 未解析 | 1. 选择.xlsx文件 | selectedFile更新 |
| M02-E01 | 异常 | 选择不支持的格式 | 未解析 | 1. 选择.doc文件 | accept限制 |
| M02-B01 | 边界 | 选择图片文件 | 未解析 | 1. 选择.png文件 | 文件正常选中（支持图片识别） |
| M02-U01 | UI | input隐藏 | 页面已加载 | 1. 检查DOM | display:none |
| M02-L01 | 联动 | 文件变更后解析按钮可用 | 已选模型 | 1. 选择文件 | 开始解析按钮可点击 |

#### M03 - 解析模板选择

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M03-P01 | 正向 | 选择原料解析模板 | templateList.length>0 | 1. 点击模板单选按钮 | selectedTemplateId更新，模型可能切换 |
| M03-E01 | 异常 | 模板列表为空 | API异常 | 1. 查看页面 | 不显示模板选择区域 |
| M03-B01 | 边界 | 无模板时不显示 | templateList为空 | 1. 查看页面 | 模板选择区域不渲染 |
| M03-U01 | UI | 模板单选按钮样式 | 有模板 | 1. 查看选择器 | variant="default-filled" |
| M03-L01 | 联动 | 模板切换联动模型 | 模板有defaultProvider | 1. 选择带默认模型的模板 | aiStore.selectedModel更新 |

#### M04 - 开始解析按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M04-P01 | 正向 | 点击开始解析 | selectedFile存在且模型已选 | 1. 点击"开始解析" | 触发aiStore.parseMaterial，显示解析进度 |
| M04-E01 | 异常 | 未选模型点击解析 | 无模型 | 1. 点击解析 | 按钮disabled |
| M04-B01 | 边界 | 解析中按钮状态 | 解析进行中 | 1. 查看按钮 | 显示"解析中..."，disabled |
| M04-U01 | UI | 按钮样式 | 文件已选 | 1. 查看按钮 | 渐变背景，白色文字 |
| M04-L01 | 联动 | 解析完成后显示结果 | 解析成功 | 1. 等待完成 | 显示解析结果表格，匹配已有原料 |

#### M05 - 取消文件按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M05-P01 | 正向 | 取消已选文件 | selectedFile存在 | 1. 点击"取消" | selectedFile=null，恢复上传区域 |
| M05-E01 | 异常 | 解析中不可取消 | 解析进行中 | 1. 查看取消按钮 | 按钮不可见 |
| M05-B01 | 边界 | 快速选文件后立即取消 | 刚选文件 | 1. 选文件 2. 立即取消 | selectedFile正确清空 |
| M05-U01 | UI | 取消按钮hover变红 | 文件已选 | 1. 鼠标悬停 | 背景变danger-bg |
| M05-L01 | 联动 | 取消文件后恢复上传区域 | 文件已选 | 1. 取消文件 | 上传区域恢复显示 |

#### M06 - 终止解析按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M06-P01 | 正向 | 终止原料解析 | 解析进行中 | 1. 点击"终止" | aiStore.abortParseMaterial()，提示"AI解析已终止" |
| M06-E01 | 异常 | 已终止后再次点击 | 已终止 | 1. 点击终止 | 按钮不可见 |
| M06-B01 | 边界 | 解析刚开始即终止 | 解析<1s | 1. 开始解析 2. 立即终止 | 正常终止 |
| M06-U01 | UI | 终止按钮样式 | 解析中 | 1. 查看按钮 | 红色渐变背景 |
| M06-L01 | 联动 | 终止后parsedItems清空 | 解析中 | 1. 终止解析 | parsedItems=[]，恢复上传区域 |

#### M07 - 错误关闭按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M07-P01 | 正向 | 关闭错误提示 | materialParseError存在 | 1. 点击✕ | aiStore.materialParseError='' |
| M07-E01 | 异常 | 无错误时按钮不可见 | 无错误 | 1. 查看页面 | 按钮不渲染 |
| M07-B01 | 边界 | 长错误消息 | 错误>200字符 | 1. 查看提示 | 文字溢出省略 |
| M07-U01 | UI | 关闭按钮hover效果 | 有错误 | 1. 鼠标悬停 | 透明度变化 |
| M07-L01 | 联动 | 关闭错误后可重新操作 | 有错误 | 1. 关闭错误 | 可重新上传或重试 |

#### M08 - 切换模型重试按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M08-P01 | 正向 | 切换模型重试解析 | materialParseError存在 | 1. 点击"切换模型重试" | 自动切换到下一个模型，重新解析 |
| M08-E01 | 异常 | 只有一个模型 | 仅1个模型 | 1. 点击重试 | 循环回同一模型 |
| M08-B01 | 边界 | 最后一个模型重试 | 当前是最后一个 | 1. 点击重试 | 循环到第一个模型 |
| M08-U01 | UI | 重试按钮样式 | 有错误 | 1. 查看按钮 | warning渐变背景 |
| M08-L01 | 联动 | 重试成功后显示结果 | 重试成功 | 1. 重试 2. 等待完成 | 错误消失，显示解析结果 |

#### M09 - 保存为模板按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M09-P01 | 正向 | 打开保存模板对话框 | parsedItems非空 | 1. 点击"保存为模板" | saveTemplateDialogVisible=true |
| M09-E01 | 异常 | 保存模板API失败 | 对话框已打开 | 1. 确认保存 | 显示错误提示 |
| M09-B01 | 边界 | 无解析结果时按钮不可见 | parsedItems为空 | 1. 查看页面 | 按钮不渲染 |
| M09-U01 | UI | 按钮样式 | 有结果 | 1. 查看按钮 | primary主题，文档图标 |
| M09-L01 | 联动 | 保存成功后模板列表更新 | 保存成功 | 1. 保存模板 | 新模板出现在选择器中 |

#### M10 - 清空结果按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M10-P01 | 正向 | 清空解析结果 | parsedItems非空 | 1. 点击"清空" | parsedItems=[]，所有状态重置 |
| M10-E01 | 异常 | 无结果时按钮不可见 | parsedItems为空 | 1. 查看页面 | 按钮不渲染 |
| M10-B01 | 边界 | 清空后恢复上传区域 | 有结果 | 1. 清空 | 恢复到文件上传状态 |
| M10-U01 | UI | 清空按钮样式 | 有结果 | 1. 查看按钮 | danger主题 |
| M10-L01 | 联动 | 清空后所有子状态重置 | 有结果和调整 | 1. 清空 | priceAdjustments、diffStatusMap等全部清空 |

#### M11 - 重新解析下拉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M11-P01 | 正向 | 选择其他模型重新解析 | parsedItems非空 | 1. 展开下拉 2. 选择模型 | 使用新模型重新解析 |
| M11-E01 | 异常 | 重新解析失败 | 选择模型后 | 1. 重新解析 | 显示错误提示 |
| M11-B01 | 边界 | 选择当前模型重新解析 | parsedItems非空 | 1. 选择当前模型 | 重新解析 |
| M11-U01 | UI | 下拉菜单样式 | 有结果 | 1. 展开下拉 | 显示所有模型，当前模型有勾 |
| M11-L01 | 联动 | 重新解析覆盖之前结果 | 有结果 | 1. 重新解析成功 | 旧结果被替换 |

#### M12 - 名称编辑单元格

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M12-P01 | 正向 | 点击名称进入编辑模式 | 有解析结果 | 1. 点击名称单元格 | 显示input，editingCell更新 |
| M12-E01 | 异常 | 编辑为空名称 | 编辑模式 | 1. 清空名称 2. 失焦 | 名称可能为空，校验提示 |
| M12-B01 | 边界 | 编辑超长名称 | 编辑模式 | 1. 输入>100字符 | 允许输入 |
| M12-U01 | UI | 编辑态input样式 | 编辑模式 | 1. 查看input | border: primary，box-shadow |
| M12-L01 | 联动 | 修改名称影响重复检测 | 编辑模式 | 1. 修改为已有名称 | 重复检测更新，状态标签变为"重复" |

#### M13 - 单价调整输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M13-P01 | 正向 | 调整原料单价 | item.unitPrice非null | 1. 修改单价 | item.unitPrice更新，priceAdjustments标记isAdjusted |
| M13-E01 | 异常 | 输入负数单价 | 有单价 | 1. 输入-10 | t-input-number min=0限制 |
| M13-B01 | 边界 | 输入0 | 有单价 | 1. 输入0 | 允许，isAdjusted=true |
| M13-U01 | UI | 调整标记显示 | 已调整 | 1. 查看调整列 | 显示星形"价"标记和恢复按钮 |
| M13-L01 | 联动 | 单价调整影响录入 | 已调整 | 1. 录入原料 | 使用调整后的单价 |

#### M14 - 恢复原价按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M14-P01 | 正向 | 恢复原始单价 | priceAdjustments[index].isAdjusted | 1. 点击恢复按钮 | unitPrice恢复原价，isAdjusted=false |
| M14-E01 | 异常 | 未调整时按钮不可见 | 未调整 | 1. 查看调整列 | 恢复按钮不渲染 |
| M14-B01 | 边界 | 多次调整后恢复 | 调整多次 | 1. 点击恢复 | 恢复到最初的原价 |
| M14-U01 | UI | 恢复按钮样式 | 已调整 | 1. 查看按钮 | rollback图标，小尺寸 |
| M14-L01 | 联动 | 恢复后调整标记消失 | 已调整 | 1. 恢复原价 | "价"标记消失，恢复按钮消失 |

#### M15 - 查看差异按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M15-P01 | 正向 | 打开差异对比对话框 | item.isRecorded且存在差异 | 1. 点击差异按钮 | diffDialogVisible=true，加载已有营养数据 |
| M15-E01 | 异常 | 无差异时按钮不可见 | item.isRecorded但无差异 | 1. 查看操作列 | 差异按钮不渲染 |
| M15-B01 | 边界 | 新增原料无差异按钮 | item不是isRecorded | 1. 查看操作列 | 差异按钮不渲染 |
| M15-U01 | UI | 差异按钮样式 | 有差异 | 1. 查看按钮 | info主题，文档图标 |
| M15-L01 | 联动 | 差异对话框显示新旧数据 | 有差异 | 1. 打开差异对话框 | 表格显示字段、现有数据、新数据、选择、预览 |

#### M16 - 移除行按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M16-P01 | 正向 | 移除一行原料 | parsedItems有数据 | 1. 点击移除按钮 | parsedItems.splice(index,1)，行消失 |
| M16-E01 | 异常 | 移除最后一行 | 仅1行 | 1. 点击移除 | parsedItems为空，显示上传区域 |
| M16-B01 | 边界 | 移除中间行 | 多行 | 1. 移除第3行 | 后续行索引更新，差异状态正确 |
| M16-U01 | UI | 移除按钮样式 | 有数据 | 1. 查看按钮 | 垃圾桶图标 |
| M16-L01 | 联动 | 移除行影响validItems | 有数据 | 1. 移除有效行 | validItems数量减少，录入按钮计数更新 |

#### M17 - 一键录入按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M17-P01 | 正向 | 一键录入所有有效项 | validItems.length>0 | 1. 点击"一键录入" | 逐条调用submitSingleItem，显示进度和结果摘要 |
| M17-E01 | 异常 | 无有效项 | validItems.length=0 | 1. 查看按钮 | 按钮disabled |
| M17-B01 | 边界 | 大量有效项(>50) | validItems.length>50 | 1. 点击一键录入 | 逐条提交，进度条更新，最终显示摘要 |
| M17-U01 | UI | 按钮显示有效项数量 | 有有效项 | 1. 查看按钮 | 显示"一键录入(N)" |
| M17-L01 | 联动 | 录入完成后显示摘要 | 录入完成 | 1. 等待录入 | 显示成功/失败数量，源文件上传状态 |

#### M18 - 逐条录入按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M18-P01 | 正向 | 开始逐条录入 | validItems.length>0 | 1. 点击"逐条录入" | sequentialActive=true，显示逐条确认卡 |
| M18-E01 | 异常 | 逐条模式中按钮禁用 | sequentialActive=true | 1. 查看按钮 | 按钮disabled |
| M18-B01 | 边界 | 仅1条有效项 | validItems.length=1 | 1. 点击逐条录入 | 显示1条确认卡 |
| M18-U01 | UI | 按钮样式 | 有有效项 | 1. 查看按钮 | outline样式，primary边框 |
| M18-L01 | 联动 | 逐条录入进度显示 | 逐条模式 | 1. 确认/跳过 | 进度条更新，当前项变化 |

#### M19 - 确认录入按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M19-P01 | 正向 | 确认录入当前项 | sequentialActive=true | 1. 点击"确认录入" | submitSingleItem执行，成功提示，前进到下一项 |
| M19-E01 | 异常 | 录入失败 | 逐条模式 | 1. 确认录入 | 错误提示，仍前进到下一项 |
| M19-B01 | 边界 | 最后一项确认 | 最后一条 | 1. 确认录入 | finishSequentialImport，显示摘要 |
| M19-U01 | UI | 按钮样式 | 逐条模式 | 1. 查看按钮 | primary渐变背景 |
| M19-L01 | 联动 | 确认后进度条更新 | 逐条模式 | 1. 确认录入 | 进度条前进，当前项切换 |

#### M20 - 跳过按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M20-P01 | 正向 | 跳过当前项 | sequentialActive=true | 1. 点击"跳过" | status='skipped'，前进到下一项 |
| M20-E01 | 异常 | 跳过所有项 | 逐条模式 | 1. 全部跳过 | finishSequentialImport，success=0 |
| M20-B01 | 边界 | 跳过最后一项 | 最后一条 | 1. 跳过 | 完成逐条录入 |
| M20-U01 | UI | 跳过按钮样式 | 逐条模式 | 1. 查看按钮 | default主题 |
| M20-L01 | 联动 | 跳过的项不出现在成功计数 | 逐条模式 | 1. 跳过 2. 完成 | 摘要中跳过项计入errors |

#### M21 - 终止录入按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M21-P01 | 正向 | 终止逐条录入 | sequentialActive=true | 1. 点击"终止录入" | finishSequentialImport，未处理的计为failed |
| M21-E01 | 异常 | 第一项即终止 | 逐条模式 | 1. 立即终止 | success=0，显示摘要 |
| M21-B01 | 边界 | 最后一项前终止 | 倒数第二条 | 1. 终止 | 已确认的成功，剩余计为failed |
| M21-U01 | UI | 终止按钮样式 | 逐条模式 | 1. 查看按钮 | danger边框 |
| M21-L01 | 联动 | 终止后显示摘要 | 逐条模式 | 1. 终止 | 显示录入完成摘要卡 |

#### M22 - 撤销导入按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M22-P01 | 正向 | 5分钟内撤销导入 | canUndoImport=true | 1. 点击"撤销上次导入" | 逐条回退，新原料删除，已有原料恢复旧营养数据 |
| M22-E01 | 异常 | 超过5分钟撤销 | 超过5分钟 | 1. 点击撤销 | 提示"撤销时限已过（5分钟），无法撤销" |
| M22-B01 | 边界 | 刚好5分钟撤销 | 4分59秒 | 1. 点击撤销 | 撤销成功 |
| M22-U01 | UI | 按钮样式 | 可撤销 | 1. 查看按钮 | warning渐变背景 |
| M22-L01 | 联动 | 撤销后原料列表刷新 | 撤销成功 | 1. 撤销 | materialStore.fetchMaterials()，摘要消失 |

#### M23 - 保存模板对话框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M23-P01 | 正向 | 保存原料解析模板 | 对话框已打开 | 1. 填写表单 2. 确认 | parseTemplateApi.create调用，成功提示 |
| M23-E01 | 异常 | 保存失败 | 对话框已打开 | 1. 确认保存 | 错误提示 |
| M23-B01 | 边界 | 名称超长 | 对话框已打开 | 1. 输入>30字符 | maxlength=30限制 |
| M23-U01 | UI | 对话框布局 | 对话框已打开 | 1. 查看对话框 | 包含名称、分类、模型、提示词 |
| M23-L01 | 联动 | 保存成功后模板列表刷新 | 保存成功 | 1. 保存 2. 重新上传 | 新模板可选 |

#### M24 - 模板名称输入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M24-P01 | 正向 | 输入模板名称 | 对话框已打开 | 1. 输入"营养数据模板" | saveTemplateForm.name更新 |
| M24-E01 | 异常 | 空名称提交 | 对话框已打开 | 1. 不输入名称 2. 确认 | 提示"请输入模板名称" |
| M24-B01 | 边界 | 名称刚好30字符 | 对话框已打开 | 1. 输入30字符 | 正常输入 |
| M24-U01 | UI | 输入框样式 | 对话框已打开 | 1. 查看输入框 | placeholder="如：营养数据模板" |
| M24-L01 | 联动 | 名称必填验证 | 对话框已打开 | 1. 空名称确认 | 阻止提交 |

#### M25 - 模板分类选择

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M25-P01 | 正向 | 选择分类 | 对话框已打开 | 1. 选择"营养数据" | saveTemplateForm.category='nutrition' |
| M25-E01 | 异常 | 无分类选项 | 对话框已打开 | 1. 查看下拉 | 有3个固定选项 |
| M25-B01 | 边界 | 默认分类 | 对话框刚打开 | 1. 查看默认值 | 默认为'nutrition' |
| M25-U01 | UI | 下拉选项 | 对话框已打开 | 1. 展开下拉 | 营养数据/配方文件/通用 |
| M25-L01 | 联动 | 分类影响模板列表筛选 | 保存成功 | 1. 保存为"配方文件"分类 | 在对应分类下可见 |

#### M26 - 默认模型选择

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M26-P01 | 正向 | 选择默认模型 | 对话框已打开 | 1. 选择模型 | saveTemplateForm.defaultProvider更新 |
| M26-E01 | 异常 | 模型列表为空 | 无模型 | 1. 查看下拉 | 下拉为空 |
| M26-B01 | 边界 | 不选择默认模型 | 对话框已打开 | 1. 不选择 | defaultProvider=undefined，跟随全局设置 |
| M26-U01 | UI | 下拉可清空 | 已选模型 | 1. 点击清空 | defaultProvider清空 |
| M26-L01 | 联动 | 模板使用默认模型 | 选择模板 | 1. 选择带默认模型的模板 | aiStore.selectedModel切换 |

#### M27 - 自定义提示词

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M27-P01 | 正向 | 输入自定义提示词 | 对话框已打开 | 1. 输入提示词 | saveTemplateForm.customPrompt更新 |
| M27-E01 | 异常 | 输入超长提示词 | 对话框已打开 | 1. 输入>500字符 | maxlength=500限制 |
| M27-B01 | 边界 | 不输入提示词 | 对话框已打开 | 1. 留空 | customPrompt=''，解析时使用默认提示词 |
| M27-U01 | UI | textarea自适应高度 | 对话框已打开 | 1. 输入多行文字 | autosize minRows=2, maxRows=4 |
| M27-L01 | 联动 | 提示词影响解析结果 | 使用模板解析 | 1. 使用带自定义提示词的模板 | AI使用该提示词解析 |

#### M28 - 差异对比对话框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M28-P01 | 正向 | 打开差异对比 | item.isRecorded且有差异 | 1. 点击差异按钮 | 对话框打开，显示字段对比表 |
| M28-E01 | 异常 | 获取已有营养数据失败 | API异常 | 1. 打开差异 | diffExistingNutrition={}，所有字段标记为差异 |
| M28-B01 | 边界 | 所有字段一致 | 无差异 | 1. 打开差异 | 所有字段显示"一致"，无选择操作 |
| M28-U01 | UI | 对话框宽度 | 对话框已打开 | 1. 查看对话框 | width=760px |
| M28-L01 | 联动 | 差异选择实时更新预览 | 对话框已打开 | 1. 切换选择 | 预览值列实时更新 |

#### M29 - 差异选择单选组

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M29-P01 | 正向 | 选择保留新值 | 差异对话框已打开 | 1. 选择"新" | diffChoices[field]='new'，预览值显示新数据 |
| M29-E01 | 异常 | 一致字段无选择 | 差异对话框已打开 | 1. 查看一致字段 | 显示"一致"文字，无单选组 |
| M29-B01 | 边界 | 所有字段选择旧值 | 差异对话框已打开 | 1. 全部选"旧" | 预览值全部显示旧数据 |
| M29-U01 | UI | 单选按钮样式 | 差异对话框已打开 | 1. 查看单选组 | variant="default-filled"，新/旧两个按钮 |
| M29-L01 | 联动 | 选择影响预览值 | 差异对话框已打开 | 1. 切换新/旧 | 预览值列实时更新，摘要更新 |

#### M30 - 取消差异按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M30-P01 | 正向 | 取消差异对比 | 差异对话框已打开 | 1. 点击"取消" | diffDialogVisible=false，currentDisplayData=null |
| M30-E01 | 异常 | 已做选择后取消 | 已选择 | 1. 点击取消 | 选择不保存，下次打开重新初始化 |
| M30-B01 | 边界 | 快速打开关闭 | 对话框刚打开 | 1. 立即取消 | 无副作用 |
| M30-U01 | UI | 取消按钮样式 | 差异对话框已打开 | 1. 查看按钮 | default主题 |
| M30-L01 | 联动 | 取消后原料状态不变 | 差异对话框已打开 | 1. 取消 | pendingConfirmSet不变 |

#### M31 - 重置差异按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M31-P01 | 正向 | 重置为默认(新值) | 差异对话框已打开 | 1. 点击"重置" | 所有字段选择重置为'new'，提示"已重置为最新AI解析数据" |
| M31-E01 | 异常 | 无原始AI数据 | originalAiDataMap为空 | 1. 点击重置 | 不执行重置 |
| M31-B01 | 边界 | 已全部选旧值后重置 | 全选旧 | 1. 点击重置 | 全部切回新值 |
| M31-U01 | UI | 重置按钮hover效果 | 差异对话框已打开 | 1. 鼠标悬停 | 按钮上移，阴影增强 |
| M31-L01 | 联动 | 重置后预览值更新 | 差异对话框已打开 | 1. 重置 | 预览值列全部显示新数据 |

#### M32 - 应用差异按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| M32-P01 | 正向 | 应用差异选择 | 差异对话框已打开 | 1. 点击"应用选择" | parsedItems对应行数据更新，pendingConfirmSet删除该索引，confirmedSet添加 |
| M32-E01 | 异常 | 无差异时应用 | 无差异 | 1. 点击应用 | 正常关闭，无数据变化 |
| M32-B01 | 边界 | 全选旧值后应用 | 全选旧 | 1. 应用 | 原料数据使用旧值，fieldSourceMap标记为'old' |
| M32-U01 | UI | 应用按钮样式 | 差异对话框已打开 | 1. 查看按钮 | primary渐变背景 |
| M32-L01 | 联动 | 应用后原料状态变为"已变更" | 差异对话框已打开 | 1. 应用 | 状态标签从"待定"变为"已变更"，可录入 |

---

### 3.4 DataSearchTab 智能查询

#### D01 - 搜索输入框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D01-P01 | 正向 | 输入自然语言查询 | 页面已加载 | 1. 在输入框输入"查找含有黄芪的配方" | searchQuery更新 |
| D01-E01 | 异常 | 输入纯特殊字符 | 页面已加载 | 1. 输入"!@#$%" | searchQuery更新，查询可能返回空结果 |
| D01-B01 | 边界 | 输入极长查询(>500字符) | 页面已加载 | 1. 输入超长文字 | textarea自适应高度(maxRows=5) |
| D01-U01 | UI | textarea样式 | 页面已加载 | 1. 查看输入框 | placeholder显示示例查询，autosize |
| D01-L01 | 联动 | Ctrl+Enter快捷查询 | 已输入查询 | 1. 按Ctrl+Enter | 触发handleSearch |

#### D02 - 智能查询按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D02-P01 | 正向 | 点击智能查询 | searchQuery.trim()非空 | 1. 点击"智能查询" | searchLoading=true，调用aiStore.naturalSearch |
| D02-E01 | 异常 | 空查询点击 | searchQuery为空 | 1. 点击查询 | 按钮disabled |
| D02-B01 | 边界 | 查询中按钮状态 | 正在查询 | 1. 查看按钮 | 显示"查询中..."，disabled |
| D02-U01 | UI | 按钮样式 | 有输入 | 1. 查看按钮 | primary背景，搜索图标 |
| D02-L01 | 联动 | 查询成功后显示结果 | 查询成功 | 1. 等待查询完成 | 显示SQL卡片和结果表格 |

#### D03 - 导出CSV按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D03-P01 | 正向 | 点击导出CSV | searchResult非null | 1. 点击"导出CSV" | 调用aiStore.naturalSearch获取exportUrl，window.open下载 |
| D03-E01 | 异常 | 导出失败 | searchResult非null | 1. 点击导出 | 提示"导出失败" |
| D03-B01 | 边界 | 无exportUrl | searchResult无exportUrl | 1. 点击导出 | 提示"正在生成导出文件，请再次点击导出" |
| D03-U01 | UI | 按钮样式 | 有结果 | 1. 查看按钮 | default主题，下载图标 |
| D03-L01 | 联动 | 导出使用当前查询 | 有结果 | 1. 修改查询 2. 导出 | 导出当前查询的结果 |

#### D04 - 快速示例标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D04-P01 | 正向 | 点击快速示例标签 | 页面已加载 | 1. 点击"含黄芪的配方有哪些" | searchQuery填入该文本，自动执行查询 |
| D04-E01 | 异常 | 快速示例查询失败 | 页面已加载 | 1. 点击标签 2. 查询失败 | 显示错误提示 |
| D04-B01 | 边界 | 所有8个快速示例均可点击 | 页面已加载 | 1. 逐个点击 | 每个都能填入并查询 |
| D04-U01 | UI | 标签样式 | 页面已加载 | 1. 查看标签 | variant="outline"，size="small"，cursor:pointer |
| D04-L01 | 联动 | 点击后自动触发查询 | 页面已加载 | 1. 点击标签 | fillAndSearch执行，查询自动发起 |

#### D05 - SQL折叠头

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D05-P01 | 正向 | 展开/折叠SQL | searchResult非null | 1. 点击SQL折叠头 | sqlExpanded切换，SQL代码显示/隐藏 |
| D05-E01 | 异常 | 快速连续点击 | searchResult非null | 1. 快速点击3次 | 最终状态正确 |
| D05-B01 | 边界 | 查询后SQL默认折叠 | 刚查询完成 | 1. 查看SQL区域 | sqlExpanded=false，SQL代码隐藏 |
| D05-U01 | UI | 折叠箭头旋转 | searchResult非null | 1. 点击展开 | 箭头旋转90度 |
| D05-L01 | 联动 | SQL区域显示查询类型标签 | searchResult非null | 1. 查看SQL头 | 显示queryType标签(简单查询/跨表查询/聚合分析) |

#### D06 - 搜索历史标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D06-P01 | 正向 | 点击历史标签重新查询 | searchHistory.length>0且无searchResult | 1. 点击历史标签 | searchQuery填入，自动执行查询 |
| D06-E01 | 异常 | 历史查询再次失败 | 点击历史标签 | 1. 查询失败 | 显示错误提示 |
| D06-B01 | 边界 | 最多保存10条历史 | 已有10条历史 | 1. 执行新查询 | 最早的记录被移除 |
| D06-U01 | UI | 历史标签样式 | 有历史 | 1. 查看标签 | variant="light"，size="small" |
| D06-L01 | 联动 | 有搜索结果时不显示历史 | 有searchResult | 1. 查看历史区域 | 搜索历史区域不渲染 |

#### D07 - 清空历史按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D07-P01 | 正向 | 清空搜索历史 | searchHistory.length>0 | 1. 点击"清空" | searchHistory=[] |
| D07-E01 | 异常 | 无历史时按钮不可见 | searchHistory为空 | 1. 查看页面 | 清空按钮不渲染 |
| D07-B01 | 边界 | 清空后历史区域消失 | 有历史 | 1. 清空 | 搜索历史区域不渲染 |
| D07-U01 | UI | 按钮样式 | 有历史 | 1. 查看按钮 | 无背景无边框，小字号 |
| D07-L01 | 联动 | 清空后不影响当前结果 | 有结果和历史 | 1. 清空历史 | 搜索结果保持不变 |

#### D08 - 结果表格

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D08-P01 | 正向 | 显示查询结果表格 | searchResult.rows.length>0 | 1. 查看表格 | 列头动态生成，数据正确渲染 |
| D08-E01 | 异常 | 空结果集 | searchResult.rows.length=0 | 1. 查看结果区 | 显示"未找到匹配的数据"空状态 |
| D08-B01 | 边界 | 大量结果(>100行) | 查询返回100+行 | 1. 查看表格 | max-height=500px，可滚动 |
| D08-U01 | UI | null值显示 | 结果含null | 1. 查看null单元格 | 显示"—"，斜体，placeholder颜色 |
| D08-L01 | 联动 | 数字格式化 | 结果含数字 | 1. 查看数字单元格 | 整数用toLocaleString，小数保留2位 |

---

### 3.5 ParseHistoryTab 解析历史

#### H01 - 降级提示横幅

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H01-P01 | 正向 | 显示降级提示 | showDegradationBanner=true | 1. 页面加载 | DegradationBanner组件渲染 |
| H01-E01 | 异常 | 关闭横幅 | 横幅已显示 | 1. 点击关闭 | showDegradationBanner=false |
| H01-B01 | 边界 | 刷新页面后横幅重新显示 | 已关闭横幅 | 1. 刷新页面 | 横幅重新显示（状态不持久） |
| H01-U01 | UI | 横幅样式 | 横幅已显示 | 1. 查看横幅 | 警告色背景，可关闭 |
| H01-L01 | 联动 | 点击配置跳转 | 横幅已显示 | 1. 点击配置链接 | router.push('/system/config') |

#### H02 - 总数卡片

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H02-P01 | 正向 | 点击总数卡片筛选全部 | 页面已加载 | 1. 点击总数卡片 | filterByStatus('all')，searchParams.status=''，刷新列表 |
| H02-E01 | 异常 | 统计数据加载失败 | API异常 | 1. 查看卡片 | 显示0或默认值 |
| H02-B01 | 边界 | 总数为0 | 无记录 | 1. 查看卡片 | 显示0 |
| H02-U01 | UI | 卡片hover效果 | 页面已加载 | 1. 鼠标悬停 | 卡片上移2px，emerald边框 |
| H02-L01 | 联动 | 点击后列表显示全部 | 有筛选条件 | 1. 点击总数卡片 | 清除状态筛选，显示全部记录 |

#### H03 - 存储状态卡片

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H03-P01 | 正向 | 点击存储状态卡片 | 页面已加载 | 1. 点击存储状态卡片 | showStorageDetail=true |
| H03-E01 | 异常 | 统计API失败 | API异常 | 1. 查看卡片 | usagePercent显示0% |
| H03-B01 | 边界 | 使用率>=95%显示危险色 | usagePercent>=95 | 1. 查看进度条 | progress--danger样式 |
| H03-U01 | UI | 进度条颜色随使用率变化 | 不同使用率 | 1. 查看进度条 | <80%绿色，80-95%警告色，>=95%危险色 |
| H03-L01 | 联动 | 存储详情弹窗 | 点击卡片 | 1. 点击 | 显示存储详情 |

#### H04 - 待处理卡片

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H04-P01 | 正向 | 点击筛选待处理记录 | 页面已加载 | 1. 点击待处理卡片 | filterByStatus('pending')，列表仅显示pending记录 |
| H04-E01 | 异常 | 无待处理记录 | pending=0 | 1. 查看卡片 | 显示0 |
| H04-B01 | 边界 | 大量待处理记录 | pending>100 | 1. 点击卡片 | 列表分页显示 |
| H04-U01 | UI | 卡片amber主题 | 页面已加载 | 1. 查看卡片 | amber色图标和hover边框 |
| H04-L01 | 联动 | 筛选后分页重置 | 在第3页 | 1. 点击待处理卡片 | pagination.page=1 |

#### H05 - 已关联卡片

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H05-P01 | 正向 | 点击已关联卡片 | 页面已加载 | 1. 点击已关联卡片 | 提示"已关联记录的筛选功能开发中" |
| H05-E01 | 异常 | 无已关联记录 | linkedCount=0 | 1. 查看卡片 | 显示0 |
| H05-B01 | 边界 | 所有记录都已关联 | linkedCount=totalCount | 1. 查看卡片 | 显示正确数量 |
| H05-U01 | UI | 卡片purple主题 | 页面已加载 | 1. 查看卡片 | purple色图标和hover边框 |
| H05-L01 | 联动 | 关联数实时计算 | 有记录 | 1. 查看linkedCount | computed基于items.filter(isLinked) |

#### H06 - 全选复选框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H06-P01 | 正向 | 全选所有记录 | selectedIds.length>0 | 1. 勾选全选复选框 | selectedIds包含当前页所有item.id |
| H06-E01 | 异常 | 无记录时全选 | items为空 | 1. 查看批量操作栏 | 批量操作栏不显示 |
| H06-B01 | 边界 | 部分选中时半选状态 | 选中部分记录 | 1. 查看全选框 | isIndeterminate=true，显示半选状态 |
| H06-U01 | UI | 全选框样式 | 有选中 | 1. 查看复选框 | 在批量操作栏中，白色背景 |
| H06-L01 | 联动 | 全选后批量删除可用 | 全选 | 1. 全选 | 批量删除按钮可点击 |

#### H07 - 批量删除按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H07-P01 | 正向 | 批量删除选中记录 | selectedIds.length>0 | 1. 点击批量删除 2. 确认 | 逐条调用parseResultApi.delete，成功提示 |
| H07-E01 | 异常 | 部分删除失败 | 选中多条 | 1. 确认删除 | 部分成功，错误提示 |
| H07-B01 | 边界 | 删除所有记录 | 全选 | 1. 批量删除 | 列表为空，显示空状态 |
| H07-U01 | UI | popconfirm确认框 | 有选中 | 1. 点击批量删除 | 显示"确定删除选中的记录吗？此操作无法撤销。" |
| H07-L01 | 联动 | 删除后列表和统计刷新 | 删除成功 | 1. 删除完成 | fetchData+fetchStatistics重新加载 |

#### H08 - 取消选择按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H08-P01 | 正向 | 取消所有选择 | selectedIds.length>0 | 1. 点击"取消" | selectedIds=[]，批量操作栏消失 |
| H08-E01 | 异常 | 无选中时按钮不可见 | 无选中 | 1. 查看页面 | 取消按钮不渲染 |
| H08-B01 | 边界 | 取消后批量操作栏动画 | 有选中 | 1. 点击取消 | batch-bar-slide离开动画 |
| H08-U01 | UI | 取消按钮样式 | 有选中 | 1. 查看按钮 | 白色边框，透明背景 |
| H08-L01 | 联动 | 取消后列表不变 | 有选中 | 1. 取消选择 | 列表数据不变 |

#### H09 - 状态筛选下拉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H09-P01 | 正向 | 按状态筛选 | 页面已加载 | 1. 选择"成功" | searchParams.status='success'，handleSearch刷新列表 |
| H09-E01 | 异常 | 清除状态筛选 | 已选状态 | 1. 点击清除 | searchParams.status=''，显示全部 |
| H09-B01 | 边界 | 无匹配记录 | 选择"待处理"但无pending | 1. 查看列表 | 显示空状态 |
| H09-U01 | UI | 下拉选项 | 页面已加载 | 1. 展开下拉 | 全部/成功/失败/待处理 |
| H09-L01 | 联动 | 状态筛选与其他筛选组合 | 已有搜索文本 | 1. 选择状态 | 同时应用搜索文本和状态筛选 |

#### H10 - 时间范围选择器

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H10-P01 | 正向 | 选择时间范围 | 页面已加载 | 1. 选择起止日期 | searchParams.startDate/endDate更新，fetchData刷新 |
| H10-E01 | 异常 | 清除时间范围 | 已选范围 | 1. 点击清除 | startDate/endDate=''，刷新列表 |
| H10-B01 | 边界 | 选择同一天 | 起止相同 | 1. 选择同一天 | 筛选该天的记录 |
| H10-U01 | UI | popupProps.appendToBody | 页面已加载 | 1. 打开日历 | 日历弹窗append到body |
| H10-L01 | 联动 | 时间范围与状态筛选组合 | 已选状态 | 1. 选择时间范围 | 同时应用两个筛选条件 |

#### H11 - 搜索输入框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H11-P01 | 正向 | 搜索文件名或关键词 | 页面已加载 | 1. 输入关键词 2. 按Enter | handleSearch刷新列表 |
| H11-E01 | 异常 | 搜索无匹配 | 输入不存在的关键词 | 1. 搜索 | 显示空状态 |
| H11-B01 | 边界 | 清空搜索 | 已输入关键词 | 1. 点击清除 | searchParams.searchText=''，刷新列表 |
| H11-U01 | UI | 搜索图标和placeholder | 页面已加载 | 1. 查看输入框 | 左侧搜索图标，placeholder="搜索文件名或关键词..." |
| H11-L01 | 联动 | 搜索与筛选组合 | 已选状态 | 1. 输入搜索 | 同时应用搜索和筛选 |

#### H12 - 刷新按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H12-P01 | 正向 | 刷新列表 | 页面已加载 | 1. 点击"刷新" | fetchData+fetchStatistics，重置筛选条件 |
| H12-E01 | 异常 | 刷新时API失败 | API异常 | 1. 点击刷新 | items=[]，无崩溃 |
| H12-B01 | 边界 | 快速连续刷新 | 页面已加载 | 1. 快速点击3次 | 最终数据正确 |
| H12-U01 | UI | 刷新按钮样式 | 页面已加载 | 1. 查看按钮 | 深色背景，白色文字，圆角12px |
| H12-L01 | 联动 | 刷新后分页重置 | 在第3页 | 1. 点击刷新 | pagination.page=1 |

#### H13 - 重置按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H13-P01 | 正向 | 重置所有筛选条件 | 有筛选条件 | 1. 点击"重置" | searchParams全部清空，dateRange=[]，page=1，fetchData |
| H13-E01 | 异常 | 无筛选条件时重置 | 无筛选 | 1. 点击重置 | 正常刷新，无副作用 |
| H13-B01 | 边界 | 重置后保持默认状态 | 有筛选 | 1. 重置 | 回到初始加载状态 |
| H13-U01 | UI | 重置按钮样式 | 页面已加载 | 1. 查看按钮 | 深色背景，回退图标 |
| H13-L01 | 联动 | 重置不影响其他Tab状态 | 在其他Tab有操作 | 1. 重置 | 仅影响解析历史Tab |

#### H14 - 记录选择复选框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H14-P01 | 正向 | 勾选单条记录 | 页面已加载 | 1. 勾选某条记录的复选框 | selectedIds添加该id |
| H14-E01 | 异常 | 取消勾选 | 已勾选 | 1. 取消勾选 | selectedIds移除该id |
| H14-B01 | 边界 | 勾选所有记录 | 逐条勾选 | 1. 全部勾选 | 全选框变为全选状态 |
| H14-U01 | UI | 复选框位置 | 页面已加载 | 1. 查看复选框 | 在卡片头部左侧 |
| H14-L01 | 联动 | 勾选后批量操作栏出现 | 首次勾选 | 1. 勾选一条 | 批量操作栏滑入显示 |

#### H15 - 删除记录按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H15-P01 | 正向 | 删除单条记录 | 页面已加载 | 1. 点击删除 2. 确认 | parseResultApi.delete调用，成功提示 |
| H15-E01 | 异常 | 删除失败 | API异常 | 1. 确认删除 | 错误提示 |
| H15-B01 | 边界 | 删除最后一条记录 | 仅1条 | 1. 删除 | 列表为空，显示空状态 |
| H15-U01 | UI | popconfirm确认 | 页面已加载 | 1. 点击删除 | 显示确认弹窗"确定删除此记录吗？" |
| H15-L01 | 联动 | 删除后统计刷新 | 删除成功 | 1. 删除 | fetchStatistics重新加载 |

#### H16 - 记录卡片点击

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H16-P01 | 正向 | 点击卡片查看详情 | 页面已加载 | 1. 点击卡片body | detailDrawerVisible=true，加载详情数据 |
| H16-E01 | 异常 | 详情加载失败 | API异常 | 1. 点击卡片 | 提示"获取详情失败" |
| H16-B01 | 边界 | 高亮卡片点击 | 卡片高亮 | 1. 点击高亮卡片 | 正常打开详情 |
| H16-U01 | UI | 卡片hover效果 | 页面已加载 | 1. 鼠标悬停卡片 | 边框变色，轻微阴影 |
| H16-L01 | 联动 | 点击不影响选择状态 | 未选中 | 1. 点击卡片 | 卡片不被选中，仅打开详情 |

#### H17 - 分页按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H17-P01 | 正向 | 翻到下一页 | pagination.total>pageSize | 1. 点击"下一页" | pagination.page+1，fetchData刷新 |
| H17-E01 | 异常 | 第一页点上一页 | page=1 | 1. 查看上一页按钮 | 按钮disabled |
| H17-B01 | 边界 | 最后一页点下一页 | page=totalPages | 1. 查看下一页按钮 | 按钮disabled |
| H17-U01 | UI | 当前页按钮高亮 | 多页 | 1. 查看分页 | 当前页按钮primary背景 |
| H17-L01 | 联动 | 翻页后列表更新 | 多页 | 1. 翻页 | 显示对应页的数据 |

#### H18 - 详情抽屉

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H18-P01 | 正向 | 打开详情抽屉 | 点击卡片 | 1. 查看抽屉 | 显示文件信息、解析结果、操作按钮 |
| H18-E01 | 异常 | 详情数据为空 | API返回空 | 1. 查看抽屉 | 显示空或默认值 |
| H18-B01 | 边界 | 点击遮罩关闭 | 抽屉已打开 | 1. 点击遮罩 | 抽屉关闭 |
| H18-U01 | UI | 抽屉大小 | 抽屉已打开 | 1. 查看抽屉 | size="500px"，从右侧滑出 |
| H18-L01 | 联动 | 抽屉内操作影响列表 | 抽屉已打开 | 1. 删除记录 | 列表刷新，抽屉关闭 |

#### H19 - 复制结果按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H19-P01 | 正向 | 复制解析结果到剪贴板 | currentDetail.status='success' | 1. 点击"复制结果" | navigator.clipboard.writeText，提示"已复制到剪贴板" |
| H19-E01 | 异常 | 剪贴板API不可用 | HTTPS环境外 | 1. 点击复制 | 提示"复制失败" |
| H19-B01 | 边界 | 结果为空 | parsedResult=null | 1. 查看按钮 | 按钮不渲染或不可点击 |
| H19-U01 | UI | 按钮样式 | 成功状态 | 1. 查看按钮 | size="small" |
| H19-L01 | 联动 | 复制内容为JSON格式 | 成功状态 | 1. 复制 2. 粘贴 | 内容为格式化的JSON |

#### H20 - 恢复解析结果按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H20-P01 | 正向 | 恢复解析结果 | currentDetail存在 | 1. 点击"恢复解析结果" | sessionStorage存储恢复数据，提示"已保存解析结果" |
| H20-E01 | 异常 | 恢复数据不完整 | parsedResult部分缺失 | 1. 点击恢复 | 保存可用数据 |
| H20-B01 | 边界 | 恢复后跳转到对应Tab | 恢复成功 | 1. 恢复 2. 跳转 | 对应Tab读取sessionStorage恢复数据 |
| H20-U01 | UI | 按钮样式 | 详情已打开 | 1. 查看按钮 | primary主题 |
| H20-L01 | 联动 | 恢复后抽屉关闭 | 详情已打开 | 1. 点击恢复 | detailDrawerVisible=false |

#### H21 - 删除记录按钮(详情)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| H21-P01 | 正向 | 从详情中删除记录 | currentDetail存在 | 1. 点击删除 2. 确认 | handleDelete(currentDetail.id)，抽屉关闭 |
| H21-E01 | 异常 | 删除失败 | API异常 | 1. 确认删除 | 错误提示，抽屉保持打开 |
| H21-B01 | 边界 | 删除后返回列表 | 删除成功 | 1. 删除 | 列表刷新，该记录消失 |
| H21-U01 | UI | popconfirm确认 | 详情已打开 | 1. 点击删除 | 显示确认弹窗 |
| H21-L01 | 联动 | 删除后抽屉关闭 | 删除成功 | 1. 删除 | detailDrawerVisible=false |

---

## 四、跨元素联动测试

### 4.1 文件上传 + AI解析完整流程

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XFLOW-01 | 智能填单完整流程 | 1. 选择AI模型 2. 上传xlsx文件 3. 点击开始解析 4. 等待解析完成 5. 编辑配方信息 6. 确认生成配方 7. 提交表单 | 配方创建成功，显示成功页 |
| XFLOW-02 | 智能导入完整流程 | 1. 选择AI模型 2. 上传xlsx文件 3. 点击开始解析 4. 等待解析完成 5. 处理差异 6. 一键录入 | 原料录入成功，显示摘要 |
| XFLOW-03 | 智能查询完整流程 | 1. 输入自然语言 2. 点击智能查询 3. 查看SQL和结果 4. 导出CSV | 查询结果正确，CSV下载成功 |
| XFLOW-04 | 解析→历史联动 | 1. 执行一次解析 2. 切换到解析历史 | 新记录出现在历史列表中 |

### 4.2 差异对比完整流程

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XDIFF-01 | 差异对比→应用→录入 | 1. 解析含已有原料的文件 2. 点击差异按钮 3. 选择保留旧值 4. 应用选择 5. 录入 | 使用选择的值录入，旧值字段标记为'old' |
| XDIFF-02 | 差异对比→重置→应用 | 1. 打开差异对话框 2. 全选旧值 3. 点击重置 4. 应用 | 所有字段使用新值 |
| XDIFF-03 | 差异对比→取消→重新打开 | 1. 打开差异 2. 做选择 3. 取消 4. 重新打开 | 选择重置为默认(新值) |

### 4.3 批量/逐条录入对比

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XBATCH-01 | 一键录入全部成功 | 1. 解析5条新原料 2. 一键录入 | 成功5，失败0，源文件上传 |
| XBATCH-02 | 逐条录入部分跳过 | 1. 解析5条原料 2. 逐条录入 3. 确认2条，跳过2条，终止1条 | 成功2，跳过2，剩余1条未处理 |
| XBATCH-03 | 撤销一键录入 | 1. 一键录入 2. 立即撤销 | 所有原料回退，新原料删除 |

### 4.4 含量比校验 + 报价计算

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XRATIO-01 | 主料系数0.18默认值 | 1. 解析配方 2. 查看主料含量比系数 | 默认0.18 |
| XRATIO-02 | 修改系数影响营养数据 | 1. 修改主料系数为0.2 2. 查看营养数据 | 主料营养值按新系数重新计算 |
| XRATIO-03 | 报价计算公式验证 | 1. 设置包材10元 2. 其他5元 3. 利润率30% | 建议售价=(原料成本+10+5)×1.3 |

### 4.5 NL2SQL查询场景

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XSQL-01 | 简单查询 | 1. 输入"所有配方列表" 2. 查询 | 生成SELECT语句，queryType='simple' |
| XSQL-02 | 跨表查询 | 1. 输入"含黄芪的配方有哪些" 2. 查询 | 生成JOIN语句，queryType='join' |
| XSQL-03 | 聚合分析 | 1. 输入"按业务员统计配方数量" 2. 查询 | 生成GROUP BY语句，queryType='aggregate' |
| XSQL-04 | SQL注入防护 | 1. 输入"DROP TABLE formulas" 2. 查询 | 被sqlValidator白名单拦截，返回安全错误 |

### 4.6 解析历史管理

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XHIST-01 | 筛选+搜索+分页组合 | 1. 选择状态"成功" 2. 输入关键词 3. 翻到第2页 | 组合筛选正确，分页独立 |
| XHIST-02 | 批量选择+删除 | 1. 勾选3条记录 2. 批量删除 3. 确认 | 3条记录删除，统计更新 |
| XHIST-03 | 详情→恢复→跳转 | 1. 打开详情 2. 点击恢复 3. 跳转到智能填单 | 解析结果恢复到填单页面 |
| XHIST-04 | 高亮记录定位 | 1. 从其他页面带highlight参数跳转 | 对应记录高亮，滚动到可见区域，3秒后取消高亮 |

### 4.7 模型切换全局影响

| 用例ID | 测试描述 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|
| XMODEL-01 | 模型切换影响所有Tab | 1. 在工具栏切换模型 2. 在各Tab执行操作 | 所有Tab使用新模型 |
| XMODEL-02 | 模型切换后重新解析 | 1. 解析完成 2. 切换模型 3. 重新解析 | 使用新模型重新解析 |
| XMODEL-03 | 模型logo加载失败 | 1. logo URL无效 | img隐藏，显示fallback字母 |

---

## 五、覆盖率统计

### 5.1 按页面统计

| 页面 | 交互元素数 | 正向(P) | 异常(E) | 边界(B) | UI(U) | 联动(L) | 合计 |
|------|-----------|---------|---------|---------|-------|---------|------|
| SmartTools | 8 | 8 | 8 | 8 | 8 | 8 | 40 |
| FormulaParseTab | 34 | 34 | 34 | 34 | 34 | 34 | 170 |
| MaterialImportTab | 32 | 32 | 32 | 32 | 32 | 32 | 160 |
| DataSearchTab | 8 | 8 | 8 | 8 | 8 | 8 | 40 |
| ParseHistoryTab | 21 | 21 | 21 | 21 | 21 | 21 | 105 |
| **小计** | **103** | **103** | **103** | **103** | **103** | **103** | **515** |

### 5.2 跨元素联动测试

| 类别 | 用例数 |
|------|-------|
| 文件上传+AI解析流程 | 4 |
| 差异对比流程 | 3 |
| 批量/逐条录入 | 3 |
| 含量比校验+报价 | 3 |
| NL2SQL查询 | 4 |
| 解析历史管理 | 4 |
| 模型切换全局影响 | 3 |
| **小计** | **24** |

### 5.3 总计

| 指标 | 数量 |
|------|------|
| 交互元素总数 | 103 |
| 单元素测试用例 | 515 |
| 跨元素联动用例 | 24 |
| **用例总数** | **539** |
| 维度覆盖率 | 5/5 (100%) |
| 元素覆盖率 | 103/103 (100%) |
