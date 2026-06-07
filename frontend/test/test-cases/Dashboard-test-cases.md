# 工作台（Dashboard）模块测试用例文档

## 文档信息

| 项 | 值 |
|----|-----|
| 文档ID | TC-DASH-20260606-002 |
| 页面路径 | frontend/src/views/dashboard/Dashboard.vue |
| 文件hash | 302CB3B986846E3297F38B788444A650 |
| 生成日期 | 2026-06-06 |
| 交互元素数 | 77 |
| 测试用例数 | 312 |
| 覆盖维度 | P(正向) E(异常) B(边界) U(UI) L(联动) R(权限) S(状态) |

## 页面概览

工作台页面采用 Bento Grid 布局，左右两栏分布：

- **左栏**：审批中心（ApprovalCard）+ 近期动态
- **右栏**：统计卡片 + 快捷操作 + 精选配方 + 销量趋势图表

涉及 4 个组件：

| 组件 | 路径 | 元素数 |
|------|------|--------|
| Dashboard.vue | views/dashboard/Dashboard.vue | 24 |
| ApprovalCard.vue | components/dashboard/ApprovalCard.vue | 5 |
| AdminReviewPanel.vue | components/dashboard/AdminReviewPanel.vue | 20 |
| MyApprovalPanel.vue | components/dashboard/MyApprovalPanel.vue | 26 |

## 交互元素清单

### Dashboard.vue 主页面（24个元素）

| 编号 | 元素名称 | 类型 | 区域 | 依赖条件 |
|------|---------|------|------|---------|
| D-01 | 审批中心卡片 | ApprovalCard | 左栏 | 已登录 |
| D-02 | 动态上一页按钮 | button | 左栏-近期动态 | activities.length > 0 |
| D-03 | 动态下一页按钮 | button | 左栏-近期动态 | activities.length > 0 |
| D-04 | 动态条目 | div.timeline-item | 左栏-近期动态 | activities.length > 0 |
| D-05 | 统计卡片-配方 | section.bento-stat | 右栏-统计区 | statsLoaded |
| D-06 | 统计卡片-原料 | section.bento-stat | 右栏-统计区 | statsLoaded |
| D-07 | 统计卡片-营收 | section.bento-stat | 右栏-统计区 | statsLoaded |
| D-08 | 统计卡片-销量/报告 | section.bento-stat | 右栏-统计区 | statsLoaded |
| D-09 | 快捷操作-快速录入 | button | 右栏-快捷操作 | 无 |
| D-10 | 快捷操作-AI助手 | button | 右栏-快捷操作 | !isAdmin |
| D-11 | 快捷操作-智能工具 | button | 右栏-快捷操作 | !isAdmin |
| D-12 | 快捷操作-配方管理 | button | 右栏-快捷操作 | !isAdmin |
| D-13 | 快捷操作-原料管理 | button | 右栏-快捷操作 | !isAdmin |
| D-14 | 快捷操作-报告中心 | button | 右栏-快捷操作 | !isAdmin |
| D-15 | 快捷操作-新建配方 | button | 右栏-快捷操作 | isAdmin |
| D-16 | 快捷操作-系统管理 | button | 右栏-快捷操作 | isAdmin |
| D-17 | 快捷操作-模型管理 | button | 右栏-快捷操作 | isAdmin |
| D-18 | 快捷操作-用户管理 | button | 右栏-快捷操作 | isAdmin |
| D-19 | 查看全部按钮 | button | 右栏-精选配方 | 无 |
| D-20 | 创建配方按钮 | t-button | 右栏-精选配方 | featuredFormulas.length === 0 |
| D-21 | 精选配方条目 | div.formula-card | 右栏-精选配方 | featuredFormulas.length > 0 |
| D-22 | 图表周期-周 | button.chart-tab | 右栏-销量趋势 | 无 |
| D-23 | 图表周期-月 | button.chart-tab | 右栏-销量趋势 | 无 |
| D-24 | 图表周期-年 | button.chart-tab | 右栏-销量趋势 | 无 |

### ApprovalCard.vue 审批卡片（5个元素）

| 编号 | 元素名称 | 类型 | 区域 | 依赖条件 |
|------|---------|------|------|---------|
| AC-01 | 标题图标 | t-icon | 卡片标题 | 无 |
| AC-02 | 待审核标签(admin) | t-tag | 卡片标题右侧 | isAdmin |
| AC-03 | 提交追踪标签(formulist) | t-tag | 卡片标题右侧 | !isAdmin |
| AC-04 | 我的审批面板 | MyApprovalPanel | 卡片主体 | !isAdmin |
| AC-05 | 管理员审核面板 | AdminReviewPanel | 卡片主体 | isAdmin |

### AdminReviewPanel.vue 管理员审核面板（20个元素）

| 编号 | 元素名称 | 类型 | 区域 | 依赖条件 |
|------|---------|------|------|---------|
| AR-01 | 标签页切换 | t-tabs | 顶部 | isAdmin |
| AR-02 | 配方待审标签 | t-tab-panel | 标签页 | currentView=pending |
| AR-03 | 原料待审标签 | t-tab-panel | 标签页 | currentView=material |
| AR-04 | 已审核标签 | t-tab-panel | 标签页 | currentView=history |
| AR-05 | 搜索输入框 | t-input | 搜索区 | 无 |
| AR-06 | 历史筛选-全部 | t-radio-button | 历史区 | currentView=history |
| AR-07 | 历史筛选-已通过 | t-radio-button | 历史区 | currentView=history |
| AR-08 | 历史筛选-已驳回 | t-radio-button | 历史区 | currentView=history |
| AR-09 | 配方名称链接 | router-link | 配方待审列表 | currentView=pending |
| AR-10 | 配方审核按钮 | t-button | 配方待审列表 | currentView=pending |
| AR-11 | 配方待审分页 | t-pagination | 配方待审列表 | pendingTotal > pageSize |
| AR-12 | 原料名称链接 | a | 原料待审列表 | currentView=material |
| AR-13 | 原料审核按钮 | t-button | 原料待审列表 | currentView=material |
| AR-14 | 原料待审分页 | t-pagination | 原料待审列表 | materialPendingCount > pageSize |
| AR-15 | 历史配方名称链接 | router-link | 历史列表 | currentView=history |
| AR-16 | 审核结果标签 | t-tag | 历史列表 | currentView=history |
| AR-17 | 历史分页 | t-pagination | 历史列表 | reviewedTotal > pageSize |

### MyApprovalPanel.vue 我的审批面板（26个元素）

| 编号 | 元素名称 | 类型 | 区域 | 依赖条件 |
|------|---------|------|------|---------|
| MA-01 | 模块切换标签页 | t-tabs | 顶部 | !isAdmin |
| MA-02 | 配方审批标签 | t-tab-panel | 模块切换 | moduleTab=formula |
| MA-03 | 原料审批标签 | t-tab-panel | 模块切换 | moduleTab=material |
| MA-04 | 搜索输入框 | t-input | 搜索区 | 无 |
| MA-05 | 配方状态筛选标签页 | t-tabs | 配方区 | moduleTab=formula |
| MA-06 | 状态-全部 | t-tab-panel | 配方状态 | activeTab=all |
| MA-07 | 状态-草稿 | t-tab-panel | 配方状态 | activeTab=draft |
| MA-08 | 状态-待审核 | t-tab-panel | 配方状态 | activeTab=pending_review |
| MA-09 | 状态-已通过 | t-tab-panel | 配方状态 | activeTab=published |
| MA-10 | 状态-已驳回 | t-tab-panel | 配方状态 | activeTab=rejected |
| MA-11 | 配方名称链接 | router-link | 配方列表 | moduleTab=formula |
| MA-12 | 配方状态标签 | t-tag | 配方列表 | moduleTab=formula |
| MA-13 | 提交审批按钮(配方) | t-button | 配方列表 | item.status=draft |
| MA-14 | 驳回意见展开/收起(配方) | div | 配方列表 | item.latestReview.action=reject |
| MA-15 | 配方分页 | t-pagination | 配方列表 | myTotal > pageSize |
| MA-16 | 原料状态筛选标签页 | t-tabs | 原料区 | moduleTab=material |
| MA-17 | 原料状态-全部 | t-tab-panel | 原料状态 | activeTab=all |
| MA-18 | 原料状态-草稿 | t-tab-panel | 原料状态 | activeTab=draft |
| MA-19 | 原料状态-待审核 | t-tab-panel | 原料状态 | activeTab=pending_review |
| MA-20 | 原料状态-已通过 | t-tab-panel | 原料状态 | activeTab=published |
| MA-21 | 原料状态-已驳回 | t-tab-panel | 原料状态 | activeTab=rejected |
| MA-22 | 原料名称链接 | a | 原料列表 | moduleTab=material |
| MA-23 | 原料状态标签 | t-tag | 原料列表 | moduleTab=material |
| MA-24 | 提交审批按钮(原料) | t-button | 原料列表 | item.status=draft |
| MA-25 | 驳回意见展开/收起(原料) | div | 原料列表 | item.latestReview.action=reject |
| MA-26 | 原料分页 | button | 原料列表 | materialTotalPages > 1 |

---

## 测试用例

### 一、Dashboard.vue 主页面

#### D-01 审批中心卡片

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-01-P01 | P | 已登录用户看到审批中心卡片 | 用户已登录 | 进入工作台页面 | 左栏顶部显示审批中心卡片，包含标题和内容区域 |
| D-01-R01 | R | admin看到审批中心标题为"审批中心" | admin登录 | 进入工作台页面 | 卡片标题显示"审批中心" |
| D-01-R02 | R | formulist看到审批中心标题为"我的审批" | formulist登录 | 进入工作台页面 | 卡片标题显示"我的审批" |
| D-01-U01 | U | 审批中心卡片hover效果 | 用户已登录 | 鼠标悬停在审批中心卡片上 | 卡片上移2px，阴影加深 |
| D-01-E01 | E | 未登录状态下审批中心卡片行为 | 未登录 | 直接访问工作台路由 | 页面应重定向到登录页 |

#### D-02 动态上一页按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-02-P01 | P | 点击上一页按钮翻页 | activities有8条以上数据，当前页为第2页 | 点击上一页按钮 | activityPage减1，显示前一页动态内容 |
| D-02-B01 | B | 第1页时上一页按钮禁用 | activities有数据，当前页为第1页 | 查看上一页按钮状态 | 按钮处于disabled状态，opacity为0.3，cursor为not-allowed |
| D-02-B02 | B | 点击禁用的上一页按钮无响应 | 当前页为第1页 | 点击禁用的上一页按钮 | 页码不变，无请求发出 |
| D-02-U01 | U | 上一页按钮hover效果 | 当前页非第1页 | 鼠标悬停在上一页按钮上 | 按钮背景变为$overlay-emerald-12，边框变为primary色 |
| D-02-U02 | U | 上一页按钮active效果 | 当前页非第1页 | 按下上一页按钮 | 按钮scale(0.94)缩放 |
| D-02-L01 | L | 翻页后页码指示器更新 | activities有8条以上，当前页为第2页 | 点击上一页按钮 | 页码显示从"2 / 3"变为"1 / 3" |

#### D-03 动态下一页按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-03-P01 | P | 点击下一页按钮翻页 | activities有8条以上数据，当前页为第1页 | 点击下一页按钮 | activityPage加1，显示下一页动态内容 |
| D-03-B01 | B | 最后一页时下一页按钮禁用 | activities有5条数据（2页），当前页为第2页 | 查看下一页按钮状态 | 按钮处于disabled状态 |
| D-03-B02 | B | 点击禁用的下一页按钮无响应 | 当前页为最后一页 | 点击禁用的下一页按钮 | 页码不变 |
| D-03-U01 | U | 下一页按钮hover效果 | 当前页非最后一页 | 鼠标悬停在下一页按钮上 | 按钮背景和边框变色 |
| D-03-L01 | L | 翻页后页码指示器更新 | 当前页为第1页 | 点击下一页按钮 | 页码显示从"1 / 3"变为"2 / 3" |

#### D-04 动态条目

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-04-P01 | P | 点击配方类型动态条目跳转 | 存在type=formula的动态 | 点击该动态条目 | 路由跳转到`/formulas/{id}` |
| D-04-P02 | P | 点击原料类型动态条目跳转 | 存在type=material的动态 | 点击该动态条目 | 路由跳转到`/materials/{id}` |
| D-04-P03 | P | 动态条目显示相对时间 | 存在动态数据 | 查看动态条目时间 | 显示相对时间（如"3 分钟前"、"2 天前"） |
| D-04-P04 | P | 配方类型动态显示绿色圆点 | 存在type=formula的动态 | 查看动态条目 | 圆点class为timeline-dot--success，内圆点为primary色 |
| D-04-P05 | P | 原料类型动态显示蓝色圆点 | 存在type=material的动态 | 查看动态条目 | 圆点class为timeline-dot--info，内圆点为info色 |
| D-04-B01 | B | 动态列表为空时显示空状态 | activities为空数组 | 查看近期动态区域 | 显示"暂无动态"空状态图标和文案 |
| D-04-B02 | B | 动态updatedAt为空字符串 | 动态updatedAt="" | 查看该动态时间 | 显示"--" |
| D-04-B03 | B | 动态updatedAt为"-" | 动态updatedAt="-" | 查看该动态时间 | 显示"--" |
| D-04-B04 | B | 动态updatedAt为无效日期 | 动态updatedAt="invalid" | 查看该动态时间 | 显示原始字符串"invalid" |
| D-04-B05 | B | 刚刚发生的动态时间显示 | 动态updatedAt为当前时间 | 查看该动态时间 | 显示"刚刚" |
| D-04-B06 | B | 恰好1分钟前的动态 | 动态updatedAt为59秒前 | 查看该动态时间 | 显示"刚刚" |
| D-04-B07 | B | 恰好1小时前的动态 | 动态updatedAt为59分钟前 | 查看该动态时间 | 显示"59 分钟前" |
| D-04-B08 | B | 恰好1天前的动态 | 动态updatedAt为23小时前 | 查看该动态时间 | 显示"23 小时前" |
| D-04-B09 | B | 恰好30天前的动态 | 动态updatedAt为29天前 | 查看该动态时间 | 显示"29 天前" |
| D-04-B10 | B | 恰好1年前的动态 | 动态updatedAt为11个月前 | 查看该动态时间 | 显示"11 个月前" |
| D-04-U01 | U | 动态条目hover效果 | 存在动态数据 | 鼠标悬停在动态条目上 | 条目opacity变为0.8 |
| D-04-U02 | U | 加载中显示骨架屏 | activityLoading=true | 查看近期动态区域 | 显示4个骨架屏条目 |
| D-04-U03 | U | 最后一个动态条目无连接线 | 动态列表有多条 | 查看最后一个动态条目 | 最后一个条目class包含timeline-item--last，无::after伪元素 |
| D-04-L01 | L | 动态条目与分页联动 | activities有8条以上 | 在第1页查看动态，点击下一页 | 动态列表更新为第2页的4条数据 |

#### D-05 统计卡片-配方

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-05-P01 | P | admin看到配方总数统计 | admin登录，stats已加载 | 查看统计卡片 | 显示"配方总数"标签和对应数值 |
| D-05-P02 | P | formulist看到我的配方统计 | formulist登录，stats已加载 | 查看统计卡片 | 显示"我的配方"标签和对应数值 |
| D-05-P03 | P | 点击统计卡片跳转 | stats已加载 | 点击配方统计卡片 | 路由跳转到/formulas |
| D-05-B01 | B | stats未加载时显示占位符 | statsLoading=true | 查看统计卡片数值 | 显示t-loading组件 |
| D-05-B02 | B | stats为null时显示"--" | stats=null | 查看统计卡片数值 | 显示"--" |
| D-05-R01 | R | admin统计显示全局配方数 | admin登录 | 查看统计卡片 | key为formulas，显示全局配方总数 |
| D-05-R02 | R | formulist统计显示个人配方数 | formulist登录 | 查看统计卡片 | key为myFormulas，显示个人配方数 |
| D-05-U01 | U | 统计卡片hover效果 | stats已加载 | 鼠标悬停在统计卡片上 | 卡片上移2px，箭头图标右移3px变primary色 |
| D-05-U02 | U | 大数字使用formatCompact | 配方数为12340000 | 查看统计卡片数值 | 显示"1234万" |

#### D-06 统计卡片-原料

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-06-P01 | P | admin看到原料总数统计 | admin登录，stats已加载 | 查看统计卡片 | 显示"原料总数"标签和对应数值 |
| D-06-P02 | P | formulist看到我的原料统计 | formulist登录，stats已加载 | 查看统计卡片 | 显示"我的原料"标签和对应数值 |
| D-06-P03 | P | 点击统计卡片跳转 | stats已加载 | 点击原料统计卡片 | 路由跳转到/materials |
| D-06-B01 | B | stats未加载时显示loading | statsLoading=true | 查看统计卡片数值 | 显示t-loading组件 |
| D-06-R01 | R | admin统计显示全局原料数 | admin登录 | 查看统计卡片 | key为materials |
| D-06-R02 | R | formulist统计显示个人原料数 | formulist登录 | 查看统计卡片 | key为myMaterials |

#### D-07 统计卡片-营收

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-07-P01 | P | admin看到本月营收统计 | admin登录，stats已加载 | 查看统计卡片 | 显示"本月营收"标签和"¥{数值}"格式 |
| D-07-P02 | P | formulist看到本月营收统计 | formulist登录，stats已加载 | 查看统计卡片 | 显示"本月营收"标签和"¥{数值}"格式 |
| D-07-P03 | P | 点击统计卡片跳转 | stats已加载 | 点击营收统计卡片 | 路由跳转到/sales |
| D-07-B01 | B | stats未加载时显示loading | statsLoading=true | 查看统计卡片数值 | 显示t-loading组件 |
| D-07-U01 | U | 营收金额使用formatCompact | 营收为5678000 | 查看统计卡片数值 | 显示"¥567.8万" |

#### D-08 统计卡片-销量/报告

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-08-P01 | P | admin看到销量配方统计 | admin登录，stats已加载 | 查看统计卡片 | 显示"销量配方"标签和"{N} 款"格式 |
| D-08-P02 | P | formulist看到本月报告统计 | formulist登录，stats已加载 | 查看统计卡片 | 显示"本月报告"标签和"{N} 次"格式 |
| D-08-P03 | P | admin点击跳转到/sales | admin登录，stats已加载 | 点击销量统计卡片 | 路由跳转到/sales |
| D-08-P04 | P | formulist点击跳转到/reports | formulist登录，stats已加载 | 点击报告统计卡片 | 路由跳转到/reports |
| D-08-R01 | R | admin和formulist看到不同内容 | 分别以两种角色登录 | 对比统计卡片 | admin看到"销量配方"，formulist看到"本月报告" |

#### D-09 快捷操作-快速录入

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-09-P01 | P | 点击快速录入按钮跳转 | 用户已登录 | 点击快速录入按钮 | 路由跳转到/formulas/quick |
| D-09-R01 | R | admin和formulist均可看到快速录入 | 分别以两种角色登录 | 查看快捷操作区 | 两种角色都能看到快速录入按钮 |
| D-09-U01 | U | 快速录入按钮高亮样式 | 用户已登录 | 查看快速录入按钮 | 按钮有highlight样式，背景渐变，边框为overlay-emerald-25 |
| D-09-U02 | U | 快速录入按钮hover效果 | 用户已登录 | 鼠标悬停在快速录入按钮上 | 边框变primary色，背景渐变加深，出现阴影 |

#### D-10 快捷操作-AI助手

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-10-P01 | P | 点击AI助手按钮跳转 | formulist登录 | 点击AI助手按钮 | 路由跳转到/ai-assistant |
| D-10-R01 | R | admin不可见AI助手按钮 | admin登录 | 查看快捷操作区 | 不显示AI助手按钮 |
| D-10-R02 | R | formulist可见AI助手按钮 | formulist登录 | 查看快捷操作区 | 显示AI助手按钮 |

#### D-11 快捷操作-智能工具

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-11-P01 | P | 点击智能工具按钮跳转 | formulist登录 | 点击智能工具按钮 | 路由跳转到/smart-tools |
| D-11-R01 | R | admin不可见智能工具按钮 | admin登录 | 查看快捷操作区 | 不显示智能工具按钮 |

#### D-12 快捷操作-配方管理

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-12-P01 | P | 点击配方管理按钮跳转 | formulist登录 | 点击配方管理按钮 | 路由跳转到/formulas |
| D-12-R01 | R | admin不可见配方管理按钮 | admin登录 | 查看快捷操作区 | 不显示配方管理按钮 |

#### D-13 快捷操作-原料管理

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-13-P01 | P | 点击原料管理按钮跳转 | formulist登录 | 点击原料管理按钮 | 路由跳转到/materials |
| D-13-R01 | R | admin不可见原料管理按钮 | admin登录 | 查看快捷操作区 | 不显示原料管理按钮 |

#### D-14 快捷操作-报告中心

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-14-P01 | P | 点击报告中心按钮跳转 | formulist登录 | 点击报告中心按钮 | 路由跳转到/reports |
| D-14-R01 | R | admin不可见报告中心按钮 | admin登录 | 查看快捷操作区 | 不显示报告中心按钮 |

#### D-15 快捷操作-新建配方

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-15-P01 | P | 点击新建配方按钮跳转 | admin登录 | 点击新建配方按钮 | 路由跳转到/formulas/new |
| D-15-R01 | R | formulist不可见新建配方按钮 | formulist登录 | 查看快捷操作区 | 不显示新建配方按钮 |

#### D-16 快捷操作-系统管理

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-16-P01 | P | 点击系统管理按钮跳转 | admin登录 | 点击系统管理按钮 | 路由跳转到/system |
| D-16-R01 | R | formulist不可见系统管理按钮 | formulist登录 | 查看快捷操作区 | 不显示系统管理按钮 |

#### D-17 快捷操作-模型管理

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-17-P01 | P | 点击模型管理按钮跳转 | admin登录 | 点击模型管理按钮 | 路由跳转到/model-management |
| D-17-R01 | R | formulist不可见模型管理按钮 | formulist登录 | 查看快捷操作区 | 不显示模型管理按钮 |

#### D-18 快捷操作-用户管理

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-18-P01 | P | 点击用户管理按钮跳转 | admin登录 | 点击用户管理按钮 | 路由跳转到/users |
| D-18-R01 | R | formulist不可见用户管理按钮 | formulist登录 | 查看快捷操作区 | 不显示用户管理按钮 |

#### D-19 查看全部按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-19-P01 | P | 点击查看全部按钮跳转 | 用户已登录 | 点击查看全部按钮 | 路由跳转到/formulas |
| D-19-U01 | U | 查看全部按钮hover效果 | 用户已登录 | 鼠标悬停在查看全部按钮上 | 文字变primary色，背景出现overlay-emerald-06 |

#### D-20 创建配方按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-20-P01 | P | 无配方时点击创建配方按钮 | featuredFormulas为空 | 点击创建配方按钮 | 路由跳转到/formulas/new |
| D-20-B01 | B | 有配方时不显示创建配方按钮 | featuredFormulas.length > 0 | 查看精选配方区域 | 不显示创建配方按钮 |
| D-20-U01 | U | 无配方时显示空状态 | featuredFormulas为空 | 查看精选配方区域 | 显示图标、"还没有配方"文案和创建配方按钮 |

#### D-21 精选配方条目

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-21-P01 | P | 点击配方条目跳转详情 | featuredFormulas有数据 | 点击配方条目 | 路由跳转到/formulas/{id} |
| D-21-P02 | P | 配方条目显示名称和元信息 | featuredFormulas有数据 | 查看配方条目 | 显示配方名称、业务员名、原料种数 |
| D-21-P03 | P | admin看到全局精选配方 | admin登录，有多条配方 | 查看精选配方 | 显示全局前3条配方 |
| D-21-P04 | P | formulist只看到自己的配方 | formulist登录，有多条配方 | 查看精选配方 | 只显示createdBy为自己的前3条配方 |
| D-21-B01 | B | 业务员名为空时显示"--" | 配方salesmanName为null | 查看配方条目元信息 | 业务员名显示"--" |
| D-21-B02 | B | 原料数组为空时显示0种 | 配方materials为空数组 | 查看配方条目元信息 | 显示"0 种原料" |
| D-21-U01 | U | 配方条目hover效果 | featuredFormulas有数据 | 鼠标悬停在配方条目上 | 背景变色，边框出现，箭头右移变primary色 |
| D-21-U02 | U | 加载中显示骨架屏 | formulaStore.loading=true | 查看精选配方区域 | 显示3个骨架屏条目 |

#### D-22 图表周期-周

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-22-P01 | P | 点击周标签切换图表 | 用户已登录 | 点击"周"标签 | activeChartTab变为"week"，调用fetchSalesTrend("week") |
| D-22-U01 | U | 周标签选中样式 | activeChartTab="week" | 查看周标签 | 标签有active class，背景为container色，有阴影 |

#### D-23 图表周期-月

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-23-P01 | P | 默认选中月标签 | 用户已登录，首次进入 | 查看月标签 | activeChartTab默认为"month"，月标签有active样式 |
| D-23-P02 | P | 点击月标签切换图表 | 当前选中其他标签 | 点击"月"标签 | activeChartTab变为"month"，调用fetchSalesTrend("month") |

#### D-24 图表周期-年

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| D-24-P01 | P | 点击年标签切换图表 | 用户已登录 | 点击"年"标签 | activeChartTab变为"year"，调用fetchSalesTrend("year") |
| D-24-B01 | B | 销量数据为空时显示空状态 | salesTrend为空数组 | 查看图表区域 | 显示"暂无销量数据"空状态 |
| D-24-U01 | U | 图表加载中显示骨架屏 | trendLoading=true | 查看图表区域 | 显示6个随机高度的骨架柱状条 |
| D-24-L01 | L | 切换标签后图表数据更新 | 当前显示月数据 | 点击"周"标签 | 图表重新渲染周数据 |
| D-24-L02 | L | 窗口resize时图表自适应 | 图表已渲染 | 调整浏览器窗口大小 | 图表调用resize()自适应 |

---

### 二、ApprovalCard.vue 审批卡片

#### AC-01 标题图标

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AC-01-P01 | P | 标题图标正确渲染 | 用户已登录 | 查看审批中心卡片标题 | 显示file-paste图标 |
| AC-01-U01 | U | 图标与标题文字对齐 | 用户已登录 | 查看审批中心卡片标题 | 图标与文字垂直居中对齐，间距6px |

#### AC-02 待审核标签(admin)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AC-02-P01 | P | admin看到待审核标签 | admin登录 | 查看审批中心卡片标题右侧 | 显示warning主题标签，内容为"审核 · {N} 项" |
| AC-02-R01 | R | formulist不可见待审核标签 | formulist登录 | 查看审批中心卡片标题右侧 | 不显示待审核标签 |
| AC-02-L01 | L | 待审核数量随审批数据变化 | admin登录，有2条待审 | admin审核通过1条后返回工作台 | 标签数量从"2 项"变为"1 项" |
| AC-02-B01 | B | 无待审核项时标签显示0 | admin登录，无待审核数据 | 查看待审核标签 | 显示"审核 · 0 项" |

#### AC-03 提交追踪标签(formulist)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AC-03-P01 | P | formulist看到提交追踪标签 | formulist登录 | 查看审批中心卡片标题右侧 | 显示primary主题标签，内容为"提交追踪" |
| AC-03-R01 | R | admin不可见提交追踪标签 | admin登录 | 查看审批中心卡片标题右侧 | 不显示提交追踪标签 |

#### AC-04 我的审批面板

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AC-04-P01 | P | formulist看到我的审批面板 | formulist登录 | 查看审批中心卡片主体 | 显示MyApprovalPanel组件 |
| AC-04-R01 | R | admin不可见我的审批面板 | admin登录 | 查看审批中心卡片主体 | 不显示MyApprovalPanel组件 |

#### AC-05 管理员审核面板

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AC-05-P01 | P | admin看到管理员审核面板 | admin登录 | 查看审批中心卡片主体 | 显示AdminReviewPanel组件 |
| AC-05-R01 | R | formulist不可见管理员审核面板 | formulist登录 | 查看审批中心卡片主体 | 不显示AdminReviewPanel组件 |

---

### 三、AdminReviewPanel.vue 管理员审核面板

#### AR-01 标签页切换

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-01-P01 | P | 标签页正常切换 | admin登录 | 点击不同标签 | currentView切换为对应值，内容区域更新 |
| AR-01-U01 | U | 标签页track颜色 | admin登录 | 查看标签页 | track背景色为var(--color-primary) |

#### AR-02 配方待审标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-02-P01 | P | 配方待审标签显示数量 | admin登录，有3条配方待审 | 查看标签 | 标签文本为"配方待审 (3)" |
| AR-02-L01 | L | 切换到配方待审标签清空搜索 | 当前在历史标签，搜索有关键词 | 点击配方待审标签 | searchKeyword被清空，historyAction重置为"all" |

#### AR-03 原料待审标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-03-P01 | P | 原料待审标签显示数量 | admin登录，有5条原料待审 | 查看标签 | 标签文本为"原料待审 (5)" |
| AR-03-L01 | L | 切换到原料待审标签触发数据加载 | 当前在配方待审标签 | 点击原料待审标签 | 调用fetchMaterialPendingReviews |

#### AR-04 已审核标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-04-P01 | P | 已审核标签显示数量 | admin登录，有10条已审核 | 查看标签 | 标签文本为"已审核 (10)" |
| AR-04-L01 | L | 切换到已审核标签显示筛选区 | 当前在配方待审标签 | 点击已审核标签 | 显示历史筛选radio-group |

#### AR-05 搜索输入框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-05-P01 | P | 输入搜索关键词触发防抖搜索 | admin登录 | 输入关键词"测试" | 300ms后调用fetchCurrentView，keyword包含"测试" |
| AR-05-P02 | P | 点击清除按钮触发搜索 | 搜索框有内容 | 点击清除按钮 | 调用fetchCurrentView，keyword为undefined |
| AR-05-E01 | E | 搜索无结果时显示空列表 | admin登录 | 输入不存在的关键词 | 列表为空，显示对应空状态 |
| AR-05-B01 | B | 快速连续输入只触发一次搜索 | admin登录 | 快速输入"abc"三个字符 | 只在最后一次输入300ms后触发一次搜索 |
| AR-05-B02 | B | 输入纯空格不触发搜索 | admin登录 | 输入多个空格 | keyword被trim后为空，传undefined |
| AR-05-U01 | U | 搜索框显示前缀图标 | admin登录 | 查看搜索框 | 显示search图标 |
| AR-05-L01 | L | 切换标签页时搜索关键词清空 | 搜索框有内容 | 切换标签页 | searchKeyword被重置为"" |

#### AR-06 历史筛选-全部

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-06-P01 | P | 选择全部筛选 | currentView=history | 点击"全部"按钮 | historyAction="all"，调用fetchReviewedHistory，action为undefined |
| AR-06-U01 | U | 全部按钮默认选中 | 切换到history标签 | 查看"全部"按钮 | 按钮处于选中状态 |

#### AR-07 历史筛选-已通过

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-07-P01 | P | 选择已通过筛选 | currentView=history | 点击"已通过"按钮 | historyAction="approve"，调用fetchReviewedHistory，action="approve" |

#### AR-08 历史筛选-已驳回

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-08-P01 | P | 选择已驳回筛选 | currentView=history | 点击"已驳回"按钮 | historyAction="reject"，调用fetchReviewedHistory，action="reject" |

#### AR-09 配方名称链接

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-09-P01 | P | 点击配方名称跳转版本页 | currentView=pending，有待审配方 | 点击配方名称链接 | 路由跳转到/versions/formula/{formulaId} |
| AR-09-U01 | U | 配方名称hover效果 | currentView=pending | 鼠标悬停在配方名称上 | 文字出现下划线 |

#### AR-10 配方审核按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-10-P01 | P | 点击审核按钮跳转版本页 | currentView=pending，有待审配方 | 点击审核按钮 | 路由跳转到/versions/formula/{formulaId} |
| AR-10-U01 | U | 审核按钮样式 | currentView=pending | 查看审核按钮 | 按钮size=small，theme=primary |

#### AR-11 配方待审分页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-11-P01 | P | 翻页加载下一页数据 | pendingTotal > pageSize | 点击分页下一页 | 调用fetchPendingReviews，page为对应页码 |
| AR-11-B01 | B | 数据不足一页时不显示分页 | pendingTotal <= pageSize | 查看配方待审列表 | 不显示分页组件 |
| AR-11-L01 | L | 翻页时保持搜索关键词 | 搜索框有"测试"关键词 | 翻页 | 调用fetchPendingReviews时keyword仍为"测试" |

#### AR-12 原料名称链接

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-12-P01 | P | 点击原料名称跳转版本页 | currentView=material，有待审原料 | 点击原料名称链接 | 路由跳转到/materials/{id}/versions |

#### AR-13 原料审核按钮

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-13-P01 | P | 点击审核按钮跳转版本页 | currentView=material，有待审原料 | 点击审核按钮 | 路由跳转到/materials/{id}/versions |

#### AR-14 原料待审分页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-14-P01 | P | 翻页加载下一页数据 | materialPendingCount > pageSize | 点击分页下一页 | 调用fetchMaterialPendingReviews，page为对应页码 |
| AR-14-B01 | B | 数据不足一页时不显示分页 | materialPendingCount <= pageSize | 查看原料待审列表 | 不显示分页组件 |

#### AR-15 历史配方名称链接

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-15-P01 | P | 点击历史配方名称跳转 | currentView=history，有审核记录 | 点击配方名称链接 | 路由跳转到/versions/formula/{formulaId} |

#### AR-16 审核结果标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-16-P01 | P | 已通过记录显示成功标签 | currentView=history，action=approve | 查看审核结果标签 | 显示success主题标签，内容为"已通过"，图标为check-circle |
| AR-16-P02 | P | 已驳回记录显示危险标签 | currentView=history，action=reject | 查看审核结果标签 | 显示danger主题标签，内容为"已驳回"，图标为close-circle |
| AR-16-S01 | S | 审核结果标签正确反映审核状态 | currentView=history | 查看不同审核记录 | 通过的显示绿色标签，驳回的显示红色标签 |

#### AR-17 历史分页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| AR-17-P01 | P | 翻页加载下一页数据 | reviewedTotal > pageSize | 点击分页下一页 | 调用fetchReviewedHistory，page为对应页码 |
| AR-17-B01 | B | 数据不足一页时不显示分页 | reviewedTotal <= pageSize | 查看历史列表 | 不显示分页组件 |
| AR-17-L01 | L | 翻页时保持筛选条件 | historyAction="approve" | 翻页 | 调用fetchReviewedHistory时action仍为"approve" |

---

### 四、MyApprovalPanel.vue 我的审批面板

#### MA-01 模块切换标签页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-01-P01 | P | 在配方和原料模块间切换 | formulist登录 | 点击不同模块标签 | moduleTab切换，内容区域更新 |
| MA-01-L01 | L | 切换模块时重置搜索和状态筛选 | 搜索框有内容，activeTab非all | 切换模块 | searchKeyword清空，activeTab重置为"all" |

#### MA-02 配方审批标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-02-P01 | P | 配方审批标签默认选中 | formulist登录 | 查看模块标签 | moduleTab默认为"formula" |

#### MA-03 原料审批标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-03-P01 | P | 原料审批标签显示数量 | formulist登录，有8条原料 | 查看标签 | 标签文本为"原料审批 (8)" |
| MA-03-L01 | L | 切换到原料模块触发数据加载 | 当前在配方模块 | 点击原料审批标签 | 调用fetchMyMaterialSubmissions |

#### MA-04 搜索输入框

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-04-P01 | P | 输入搜索关键词触发防抖搜索 | formulist登录 | 输入关键词"测试" | 300ms后调用fetchCurrentData，keyword包含"测试" |
| MA-04-P02 | P | 点击清除按钮触发搜索 | 搜索框有内容 | 点击清除按钮 | 调用fetchCurrentData，keyword为undefined |
| MA-04-E01 | E | 搜索无结果时显示空列表 | formulist登录 | 输入不存在的关键词 | 列表为空，显示对应空状态 |
| MA-04-B01 | B | 快速连续输入只触发一次搜索 | formulist登录 | 快速输入"abc"三个字符 | 只在最后一次输入300ms后触发一次搜索 |
| MA-04-B02 | B | 输入纯空格不触发搜索 | formulist登录 | 输入多个空格 | keyword被trim后为空，传undefined |
| MA-04-L01 | L | 配方模块搜索调用fetchMySubmissions | moduleTab=formula | 输入搜索关键词 | 调用fetchMySubmissions |
| MA-04-L02 | L | 原料模块搜索调用fetchMyMaterialSubmissions | moduleTab=material | 输入搜索关键词 | 调用fetchMyMaterialSubmissions |

#### MA-05 配方状态筛选标签页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-05-P01 | P | 状态筛选标签页正常渲染 | moduleTab=formula | 查看状态筛选标签 | 显示全部/草稿/待审核/已通过/已驳回5个标签 |
| MA-05-L01 | L | 切换状态标签触发数据加载 | moduleTab=formula | 点击不同状态标签 | 调用fetchMySubmissions，status为对应值 |

#### MA-06 状态-全部

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-06-P01 | P | 选择全部状态 | moduleTab=formula | 点击"全部"标签 | activeTab="all"，调用fetchMySubmissions，status=undefined |
| MA-06-B01 | B | 全部标签显示总数 | 有20条配方 | 查看"全部"标签 | 标签文本为"全部 (20)" |

#### MA-07 状态-草稿

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-07-P01 | P | 选择草稿状态 | moduleTab=formula | 点击"草稿"标签 | activeTab="draft"，调用fetchMySubmissions，status="draft" |
| MA-07-B01 | B | 草稿标签显示对应数量 | 有5条草稿 | 查看"草稿"标签 | 标签文本为"草稿 (5)" |

#### MA-08 状态-待审核

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-08-P01 | P | 选择待审核状态 | moduleTab=formula | 点击"待审核"标签 | activeTab="pending_review"，调用fetchMySubmissions，status="pending_review" |

#### MA-09 状态-已通过

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-09-P01 | P | 选择已通过状态 | moduleTab=formula | 点击"已通过"标签 | activeTab="published"，调用fetchMySubmissions，status="published" |

#### MA-10 状态-已驳回

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-10-P01 | P | 选择已驳回状态 | moduleTab=formula | 点击"已驳回"标签 | activeTab="rejected"，调用fetchMySubmissions，status="rejected" |

#### MA-11 配方名称链接

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-11-P01 | P | 点击配方名称跳转版本页 | moduleTab=formula，有审批记录 | 点击配方名称链接 | 路由跳转到/versions/formula/{formulaId} |
| MA-11-U01 | U | 配方名称hover效果 | moduleTab=formula | 鼠标悬停在配方名称上 | 文字出现下划线 |

#### MA-12 配方状态标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-12-P01 | P | 草稿状态显示default标签 | item.status=draft | 查看状态标签 | 显示default主题"草稿"标签 |
| MA-12-P02 | P | 待审核状态显示warning标签 | item.status=pending_review | 查看状态标签 | 显示warning主题"待审核"标签 |
| MA-12-P03 | P | 已通过状态显示success标签 | item.status=published | 查看状态标签 | 显示success主题"已通过"标签 |
| MA-12-P04 | P | 被驳回显示danger标签 | item.latestReview.action=reject | 查看状态标签 | 显示danger主题"已驳回"标签 |
| MA-12-S01 | S | 状态标签正确反映审批流转状态 | 不同状态的配方 | 查看各配方状态标签 | 标签颜色和文案与审批状态一致 |

#### MA-13 提交审批按钮(配方)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-13-P01 | P | 草稿状态显示提交审批按钮 | item.status=draft | 查看配方条目 | 显示"提交审批"按钮 |
| MA-13-P02 | P | 点击提交审批按钮跳转 | item.status=draft | 点击提交审批按钮 | 路由跳转到/versions/formula/{formulaId} |
| MA-13-B01 | B | 非草稿状态不显示提交审批按钮 | item.status=pending_review | 查看配方条目 | 不显示提交审批按钮 |
| MA-13-S01 | S | 驳回后重新编辑为草稿可再次提交 | item.status=draft且latestReview.action=reject | 查看配方条目 | 显示提交审批按钮 |

#### MA-14 驳回意见展开/收起(配方)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-14-P01 | P | 点击展开驳回意见 | item.latestReview.action=reject | 点击"驳回意见"区域 | 展开显示驳回内容，图标变为chevron-up |
| MA-14-P02 | P | 再次点击收起驳回意见 | 驳回意见已展开 | 再次点击"驳回意见"区域 | 收起驳回内容，图标变为chevron-down |
| MA-14-P03 | P | 驳回意见显示评论内容 | 展开驳回意见 | 查看驳回内容 | 显示latestReview.comment或"未提供具体原因" |
| MA-14-P04 | P | 驳回意见显示驳回人和时间 | 展开驳回意见 | 查看驳回内容 | 显示"驳回人: {name} · {时间}" |
| MA-14-B01 | B | 驳回意见为空时显示默认文案 | latestReview.comment="" | 展开驳回意见 | 显示"未提供具体原因" |
| MA-14-B02 | B | 非驳回状态不显示驳回意见区域 | item.latestReview.action=approve | 查看配方条目 | 不显示驳回意见区域 |
| MA-14-U01 | U | 驳回意见区域样式 | item.latestReview.action=reject | 查看驳回意见区域 | toggle区域为红色文字，评论内容有红色背景 |

#### MA-15 配方分页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-15-P01 | P | 翻页加载下一页数据 | myTotal > myPageSize | 点击分页下一页 | 调用fetchMySubmissions，page为对应页码 |
| MA-15-B01 | B | 数据不足一页时不显示分页 | myTotal <= myPageSize | 查看配方列表 | 不显示分页组件 |
| MA-15-L01 | L | 翻页时保持搜索和筛选条件 | 搜索框有"测试"，activeTab=draft | 翻页 | 调用fetchMySubmissions时keyword和status保持不变 |

#### MA-16 原料状态筛选标签页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-16-P01 | P | 原料状态筛选标签页正常渲染 | moduleTab=material | 查看状态筛选标签 | 显示全部/草稿/待审核/已通过/已驳回5个标签 |
| MA-16-L01 | L | 切换状态标签触发数据加载 | moduleTab=material | 点击不同状态标签 | 调用fetchMyMaterialSubmissions，status为对应值 |

#### MA-17 原料状态-全部

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-17-P01 | P | 选择全部状态 | moduleTab=material | 点击"全部"标签 | activeTab="all"，调用fetchMyMaterialSubmissions，status=undefined |

#### MA-18 原料状态-草稿

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-18-P01 | P | 选择草稿状态 | moduleTab=material | 点击"草稿"标签 | activeTab="draft"，调用fetchMyMaterialSubmissions，status="draft" |

#### MA-19 原料状态-待审核

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-19-P01 | P | 选择待审核状态 | moduleTab=material | 点击"待审核"标签 | activeTab="pending_review"，调用fetchMyMaterialSubmissions，status="pending_review" |

#### MA-20 原料状态-已通过

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-20-P01 | P | 选择已通过状态 | moduleTab=material | 点击"已通过"标签 | activeTab="published"，调用fetchMyMaterialSubmissions，status="published" |

#### MA-21 原料状态-已驳回

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-21-P01 | P | 选择已驳回状态 | moduleTab=material | 点击"已驳回"标签 | activeTab="rejected"，调用fetchMyMaterialSubmissions，status="rejected" |

#### MA-22 原料名称链接

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-22-P01 | P | 点击原料名称跳转版本页 | moduleTab=material，有原料记录 | 点击原料名称链接 | 路由跳转到/materials/{id}/versions |
| MA-22-U01 | U | 原料名称hover效果 | moduleTab=material | 鼠标悬停在原料名称上 | 文字出现下划线 |

#### MA-23 原料状态标签

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-23-P01 | P | 草稿状态显示default标签 | item.status=draft，无驳回 | 查看状态标签 | 显示default主题"草稿"标签 |
| MA-23-P02 | P | 待审核状态显示warning标签 | item.status=pending_review | 查看状态标签 | 显示warning主题"待审核"标签 |
| MA-23-P03 | P | 已通过状态显示success标签 | item.status=published | 查看状态标签 | 显示success主题"已通过"标签 |
| MA-23-P04 | P | 驳回后草稿状态显示danger标签 | item.status=draft且latestReview.action=reject | 查看状态标签 | 显示danger主题"已驳回"标签 |
| MA-23-S01 | S | 原料状态标签正确反映审批流转 | 不同状态的原料 | 查看各原料状态标签 | 标签颜色和文案与审批状态一致 |

#### MA-24 提交审批按钮(原料)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-24-P01 | P | 草稿状态显示提交审批按钮 | item.status=draft，无驳回 | 查看原料条目 | 显示"提交审批"按钮 |
| MA-24-P02 | P | 驳回后草稿显示重新提交按钮 | item.status=draft且latestReview.action=reject | 查看原料条目 | 显示"重新提交"按钮 |
| MA-24-P03 | P | 点击提交审批按钮跳转 | item.status=draft | 点击按钮 | 路由跳转到/materials/{id}/versions |
| MA-24-B01 | B | 非草稿状态不显示提交按钮 | item.status=pending_review | 查看原料条目 | 不显示提交审批按钮 |
| MA-24-S01 | S | 驳回后重新编辑为草稿可再次提交 | item.status=draft且latestReview.action=reject | 查看原料条目 | 显示"重新提交"按钮 |

#### MA-25 驳回意见展开/收起(原料)

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-25-P01 | P | 点击展开驳回意见 | item.latestReview.action=reject | 点击"驳回意见"区域 | 展开显示驳回内容，图标变为chevron-up |
| MA-25-P02 | P | 再次点击收起驳回意见 | 驳回意见已展开 | 再次点击"驳回意见"区域 | 收起驳回内容，图标变为chevron-down |
| MA-25-P03 | P | 驳回意见显示评论内容 | 展开驳回意见 | 查看驳回内容 | 显示latestReview.comment或"未提供具体原因" |
| MA-25-P04 | P | 驳回意见显示驳回人和时间 | 展开驳回意见 | 查看驳回内容 | 显示"驳回人: {name} · {时间}" |
| MA-25-B01 | B | 驳回意见为空时显示默认文案 | latestReview.comment="" | 展开驳回意见 | 显示"未提供具体原因" |
| MA-25-B02 | B | 非驳回状态不显示驳回意见区域 | item.latestReview.action=approve | 查看原料条目 | 不显示驳回意见区域 |

#### MA-26 原料分页

| 用例ID | 维度 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| MA-26-P01 | P | 点击下一页翻页 | materialTotalPages > 1，当前第1页 | 点击"下一页"按钮 | 调用fetchMyMaterialSubmissions，page=2 |
| MA-26-P02 | P | 点击上一页翻页 | materialTotalPages > 1，当前第2页 | 点击"上一页"按钮 | 调用fetchMyMaterialSubmissions，page=1 |
| MA-26-B01 | B | 第1页时上一页按钮禁用 | materialTotalPages > 1，当前第1页 | 查看上一页按钮 | 按钮disabled，class包含pagination-btn--disabled |
| MA-26-B02 | B | 最后一页时下一页按钮禁用 | 当前为最后一页 | 查看下一页按钮 | 按钮disabled |
| MA-26-B03 | B | 只有一页时不显示分页 | materialTotalPages=1 | 查看原料列表 | 不显示分页区域 |
| MA-26-U01 | U | 分页按钮hover效果 | 按钮未禁用 | 鼠标悬停在分页按钮上 | 背景变为brand-color-light，边框变primary色 |
| MA-26-L01 | L | 翻页时保持搜索和筛选条件 | 搜索框有内容，activeTab非all | 翻页 | 请求参数中keyword和status保持不变 |

---

## 跨元素联动测试

| 用例ID | 涉及元素 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|---------|---------|---------|---------|---------|
| CROSS-01 | D-01 + AC-02/AC-03 | 审批中心卡片标题与标签联动 | 分别以admin和formulist登录 | 查看审批中心卡片 | admin看到"审批中心"+待审核标签，formulist看到"我的审批"+提交追踪标签 |
| CROSS-02 | D-05~D-08 + D-09~D-18 | 统计卡片与快捷操作权限联动 | 分别以admin和formulist登录 | 对比右栏内容 | admin看到全局统计+管理类快捷操作，formulist看到个人统计+业务类快捷操作 |
| CROSS-03 | D-21 + D-19 | 精选配方与查看全部联动 | featuredFormulas有数据 | 点击查看全部 | 跳转到/formulas列表页，可看到完整配方列表 |
| CROSS-04 | D-21 + D-20 | 精选配方空状态与创建按钮联动 | featuredFormulas为空 | 查看精选配方区域 | 显示空状态+创建配方按钮，点击跳转/formulas/new |
| CROSS-05 | D-22~D-24 + 图表 | 图表标签与图表渲染联动 | 图表已渲染 | 切换不同周期标签 | 图表数据更新，ECharts重新渲染对应周期数据 |
| CROSS-06 | AR-01 + AR-05 + AR-06~AR-08 | 标签页切换与搜索筛选联动 | admin登录，在历史标签搜索"测试" | 切换到配方待审标签再切回历史 | 搜索关键词被清空，historyAction重置为"all" |
| CROSS-07 | AR-05 + AR-11/AR-14/AR-17 | 搜索与分页联动 | admin登录，搜索有结果且有多页 | 搜索后翻页 | 翻页请求携带搜索关键词 |
| CROSS-08 | MA-01 + MA-04 + MA-05/MA-16 | 模块切换与搜索筛选联动 | formulist登录，在配方模块搜索"测试" | 切换到原料模块 | 搜索关键词清空，activeTab重置为"all" |
| CROSS-09 | MA-04 + MA-15/MA-26 | 搜索与分页联动 | formulist登录，搜索有结果且有多页 | 搜索后翻页 | 翻页请求携带搜索关键词和状态筛选 |
| CROSS-10 | AC-02 + AR-02/AR-03 | 待审核标签数量与列表联动 | admin登录 | 查看待审核标签数量 | 标签数量=配方待审数+原料待审数 |
| CROSS-11 | D-04 + D-02/D-03 | 动态条目与分页按钮联动 | activities有5条数据 | 查看分页按钮状态 | 第1页时上一页禁用，下一页可用 |
| CROSS-12 | D-01 + D-05~D-08 | 审批面板与统计卡片数据源联动 | 分别以admin和formulist登录 | 对比数据 | admin统计显示全局数据，formulist统计显示个人数据 |
| CROSS-13 | AR-10 + AR-02 | 审核操作后标签数量更新 | admin登录，有1条待审配方 | 审核通过后返回工作台 | 配方待审标签数量减1 |
| CROSS-14 | MA-13 + MA-12 | 提交审批后状态标签更新 | formulist登录，有草稿配方 | 点击提交审批 | 状态标签从"草稿"变为"待审核" |
| CROSS-15 | D-24 + 窗口resize | 图表标签与窗口resize联动 | 图表已渲染 | 调整浏览器窗口大小 | 图表自适应新尺寸 |

---

## 特殊场景测试

| 用例ID | 场景 | 测试描述 | 前置条件 | 操作步骤 | 预期结果 |
|--------|------|---------|---------|---------|---------|
| SPEC-01 | 轮询机制 | AdminReviewPanel每30秒自动刷新 | admin登录 | 等待30秒 | 自动调用fetchCurrentView刷新当前视图数据 |
| SPEC-02 | 轮询清理 | 组件卸载时清除轮询定时器 | admin登录 | 离开工作台页面 | clearInterval被调用，不再有轮询请求 |
| SPEC-03 | 搜索防抖 | 搜索框300ms防抖 | admin或formulist登录 | 快速输入3个字符 | 只在最后一次输入300ms后触发1次搜索请求 |
| SPEC-04 | 搜索定时器清理 | 组件卸载时清除搜索定时器 | 用户已登录 | 在搜索过程中离开页面 | clearTimeout被调用 |
| SPEC-05 | 图表初始化延迟 | 销量数据异步加载时图表延迟初始化 | 首次进入工作台 | 等待数据加载 | 数据加载后图表自动初始化，或1.5秒后重试 |
| SPEC-06 | 图表销毁 | 组件卸载时销毁图表实例 | 图表已渲染 | 离开工作台页面 | chartInstance.dispose()被调用，resize监听器移除 |
| SPEC-07 | 图表unmount保护 | 组件已卸载后不执行图表操作 | 图表正在初始化 | 在初始化过程中离开页面 | isUnmounted=true，initChart/updateChart检查后不执行 |
| SPEC-08 | 暗黑模式 | 暗黑模式下所有卡片样式正确 | 切换为暗黑模式 | 查看工作台所有卡片 | 卡片背景、文字、边框、阴影均适配暗黑模式 |
| SPEC-09 | 响应式-1200px | 窗口宽度1200px以下布局变化 | 浏览器宽度缩至1200px以下 | 查看页面布局 | 网格变为单列，统计卡片变为4列 |
| SPEC-10 | 响应式-768px | 窗口宽度768px以下布局变化 | 浏览器宽度缩至768px以下 | 查看页面布局 | 网格单列，统计2列，快捷操作2列 |
| SPEC-11 | 响应式-480px | 窗口宽度480px以下布局变化 | 浏览器宽度缩至480px以下 | 查看页面布局 | 卡片padding减小，快捷操作变为1列 |
| SPEC-12 | 审批状态完整流转 | draft→pending_review→published | formulist有草稿配方 | 提交审批→admin审核通过 | 状态从草稿变为待审核再变为已通过 |
| SPEC-13 | 审批驳回后重新提交 | draft→pending_review→rejected→draft→pending_review | formulist有草稿配方 | 提交→admin驳回→重新编辑→再次提交 | 驳回后显示驳回意见，重新提交后状态变为待审核 |
| SPEC-14 | 精选配方渐变色 | 配方条目颜色条基于ID生成 | 有多条精选配方 | 查看不同配方的颜色条 | 不同配方显示不同渐变色（基于id首字符charCode取模） |
| SPEC-15 | 动态分页每页4条 | 动态列表分页大小固定为4 | activities有9条 | 查看动态列表 | 第1页4条，第2页4条，第3页1条，共3页 |
| SPEC-16 | 精选配方最多3条 | 精选配方列表最多显示3条 | 有5条配方 | 查看精选配方列表 | 只显示前3条 |
| SPEC-17 | 图表tooltip格式 | 图表tooltip显示格式 | 图表已渲染 | 鼠标悬停在图表数据点上 | tooltip显示"周期名"和"销量: 数值" |
| SPEC-18 | 审批中心最大高度 | 审批中心内容区域滚动 | 审批列表数据很多 | 查看审批中心 | 内容区域max-height=700px，超出部分可滚动 |
| SPEC-19 | 配方待审空状态 | 无待审配方时显示空状态 | admin登录，无待审配方 | 查看配方待审列表 | 显示check-circle图标+"暂无待审核配方"+"所有配方均已审核完毕" |
| SPEC-20 | 原料待审空状态 | 无待审原料时显示空状态 | admin登录，无待审原料 | 查看原料待审列表 | 显示check-circle图标+"暂无待审核原料"+"所有原料均已审核完毕" |
| SPEC-21 | 审核历史空状态 | 无审核记录时显示空状态 | admin登录，无审核记录 | 查看已审核列表 | 显示history图标+"暂无审核记录"+"审核操作的历史将在此显示" |
| SPEC-22 | 我的审批空状态 | 无审批记录时显示空状态 | formulist登录，无审批记录 | 查看配方审批列表 | 显示check-circle图标+"暂无审批记录"+"提交配方后，审批状态将在此显示" |
| SPEC-23 | 原料审批空状态 | 无原料审批记录时显示空状态 | formulist登录，无原料记录 | 查看原料审批列表 | 显示check-circle图标+"暂无原料审批记录"+"创建原料后，可在此提交审批" |
| SPEC-24 | 进度条状态映射 | 审批进度条正确映射状态 | formulist登录，有不同状态配方 | 查看进度条 | 草稿→第1步激活，待审核→前2步激活，已通过→3步全激活，驳回→第3步红色 |
| SPEC-25 | 原料类型标签 | 原料类型显示正确 | 有药材和辅料 | 查看原料列表 | supplement显示"辅料"，其他显示"药材" |
| SPEC-26 | formatTimestamp使用 | 审批列表时间使用formatTimestamp | 有审批记录 | 查看时间显示 | 时间使用formatTimestamp格式化，非原始UTC字符串 |
| SPEC-27 | 页面初始化数据加载 | 进入工作台时加载所有数据 | 用户已登录 | 进入工作台页面 | 调用dashboardStore.fetchAll()、formulaStore.fetchFormulas()、approvalStore对应方法 |
| SPEC-28 | 图表resize监听 | 窗口resize时图表自适应 | 图表已渲染 | 触发window resize事件 | chartInstance.resize()被调用 |
| SPEC-29 | chartInitTimer清理 | 组件卸载时清除图表初始化定时器 | 图表正在延迟初始化 | 在1.5秒内离开页面 | chartInitTimer被clearTimeout |
| SPEC-30 | 销量趋势watch | salesTrend变化时图表更新 | 图表已渲染 | salesTrend数据更新 | 图表自动更新渲染新数据 |

---

## 覆盖率统计

### 按维度统计

| 维度 | 缩写 | 用例数 | 占比 |
|------|------|--------|------|
| 正向流程 | P | 128 | 41.0% |
| 异常流程 | E | 6 | 1.9% |
| 边界条件 | B | 47 | 15.1% |
| UI变化 | U | 48 | 15.4% |
| 联动功能 | L | 40 | 12.8% |
| 权限角色 | R | 25 | 8.0% |
| 状态流转 | S | 18 | 5.8% |
| **合计** | — | **312** | **100%** |

### 按组件统计

| 组件 | 元素数 | 用例数 |
|------|--------|--------|
| Dashboard.vue | 24 | 118 |
| ApprovalCard.vue | 5 | 10 |
| AdminReviewPanel.vue | 20 | 46 |
| MyApprovalPanel.vue | 26 | 104 |
| 跨元素联动 | — | 15 |
| 特殊场景 | — | 30 |
| **合计** | **77** | **312** |

### 元素覆盖矩阵

| 组件 | P | E | B | U | L | R | S |
|------|---|---|---|---|---|---|---|
| Dashboard.vue | 41 | 1 | 20 | 22 | 6 | 10 | 1 |
| ApprovalCard.vue | 4 | 0 | 1 | 1 | 1 | 3 | 0 |
| AdminReviewPanel.vue | 17 | 1 | 4 | 3 | 5 | 0 | 1 |
| MyApprovalPanel.vue | 40 | 2 | 8 | 5 | 5 | 0 | 7 |
| 跨元素联动 | 0 | 0 | 0 | 0 | 15 | 0 | 0 |
| 特殊场景 | 26 | 2 | 14 | 17 | 8 | 12 | 9 |
