---
name: workflow-orchestrator
description: 根据任务类型自动编排技能工作流，将零散技能串联为有序流程。当用户开始新功能、修Bug、重构、审查等任务时自动触发。
---

# 工作流编排器

根据任务类型自动串联技能，避免手动逐个调用。**速度优先，轻量触发**——小任务走快车道，大任务走完整流程。

## 优先级规则

1. **用户显式指令** > 工作流建议
2. **用户说"快速"/"简单"** → 跳过可选步骤，走快车道
3. **用户说"完整"/"严格"** → 走完整流程

## 任务类型识别

根据用户输入自动判断任务类型：

| 关键词 | 任务类型 | 工作流 |
|--------|---------|--------|
| 新功能、新增、开发、实现 | `feature` | 功能开发流 |
| Bug、修复、报错、异常 | `bugfix` | Bug修复流 |
| 重构、优化、精简、清理 | `refactor` | 重构优化流 |
| 审查、检查、审计、review | `review` | 质量审查流 |
| 样式、UI、界面、页面 | `ui` | UI开发流 |
| 文档、README、同步 | `docs` | 文档更新流 |
| 测试用例、测试覆盖、测试文档 | `testing` | 测试用例流 |

---

## 工作流定义

### 1. 功能开发流 (`feature`)

**完整流程**（用户说"完整"或任务涉及 3+ 文件）：

```
grill-me → prd → 实现 → code-reviewer → update-readme
```

**快车道**（默认，小功能）：

```
实现 → code-reviewer
```

触发规则：
- 涉及新模块/新页面/新 API → 走完整流程
- 在现有模块上追加功能 → 走快车道
- 用户说"先讨论" → 必须走 grill-me

### 2. Bug修复流 (`bugfix`)

**完整流程**：

```
定位问题 → karpathy-guidelines → 修复 → vitest/unit-test-generator → code-reviewer
```

**快车道**：

```
修复 → code-reviewer
```

触发规则：
- 报错信息明确（一行能修） → 走快车道
- 报错模糊/涉及多模块 → 走完整流程，先定位
- 修复涉及安全相关 → 追加 security-review

### 3. 重构优化流 (`refactor`)

**完整流程**：

```
code-simplifier → 实现 → code-reviewer → audit
```

**快车道**：

```
code-simplifier → 实现
```

触发规则：
- 涉及性能问题 → 追加 performance-optimizer
- 涉及样式问题 → 追加 audit（主题维度）
- 用户说"只重构这个文件" → 走快车道

### 4. 质量审查流 (`review`)

**完整流程**：

```
audit → code-reviewer → 输出报告
```

**快车道**：

```
code-reviewer
```

触发规则：
- 用户说"全面审查"/"审计" → 走完整流程（audit 5 维度扫描）
- 用户说"看看代码" → 走快车道
- 用户说"安全审查" → security-review 替代 code-reviewer
- 用户说"性能审查" → performance-optimizer 替代 code-reviewer

### 5. UI开发流 (`ui`)

**完整流程**：

```
grill-me → 实现(引用 vue + pinia + project-ui-dynamic-theme) → audit(主题维度) → code-reviewer
```

**快车道**：

```
实现(引用 vue + pinia) → code-reviewer
```

触发规则：
- 涉及新页面/新组件 → 走完整流程
- 修改现有页面样式 → 走快车道
- 涉及品牌色/主题 → 必须引用 project-ui-dynamic-theme 和 design-tokens 规则
- 涉及表单/表格 → 必须引用 vue-component 规则

### 6. 文档更新流 (`docs`)

**流程**：

```
update-readme
```

触发规则：
- 功能开发完成后自动追加 update-readme
- 用户单独要求更新文档 → 直接触发
- 只涉及 API 变更 → 只更新 API_DOC.md 部分

### 7. 前端测试流 (`testing`)

**完整流程**（用户说"完整前端测试"）：

```
ui-test-case-generator → vitest(单元测试) → test-case-runner(E2E+视觉回归) → bug-fixer
```

**快车道**（默认，指定了具体页面）：

```
ui-test-case-generator
```

触发规则：
- 用户说"生成测试用例"/"测试覆盖" → 只触发 ui-test-case-generator
- 用户说"跑测试用例"/"执行测试" → 触发 test-case-runner（含视觉回归）
- 用户说"修复 Bug"/"根据测试结果修复" → 触发 bug-fixer
- 用户说"完整前端测试" → 四步全走：生成用例 → 单元测试 → E2E+视觉 → 修复
- 用户说"跑单元测试"/"跑 vitest" → 只触发 vitest
- 功能开发流完成后，用户说"补测试" → 追加 ui-test-case-generator
- 未指定页面 → ui-test-case-generator 自动扫描并让用户选择

### 8. 后端测试流 (`api-testing`)

**完整流程**（用户说"完整后端测试"）：

```
api-test-case-generator → api-test-runner → bug-fixer
```

**快车道**（默认，指定了具体模块）：

```
api-test-case-generator
```

触发规则：
- 用户说"生成接口测试用例"/"API 测试覆盖" → 只触发 api-test-case-generator
- 用户说"跑接口测试"/"执行 API 测试" → 触发 api-test-runner
- 用户说"完整后端测试" → 三步全走：生成用例 → 执行 → 修复
- 未指定模块 → api-test-case-generator 自动扫描并让用户选择

### 9. 全栈测试流 (`full-testing`)

**完整流程**（用户说"全栈测试"/"完整测试"）：

```
前端：ui-test-case-generator → vitest → test-case-runner
后端：api-test-case-generator → api-test-runner
修复：bug-fixer（合并前后端 Bug 统一修复）
```

触发规则：
- 用户说"全栈测试"/"完整测试" → 前后端全部走完
- 用户说"测试"（不区分前后端） → 根据上下文推断，无法推断时询问

---

## 自动追加规则

以下规则在**任何工作流**完成后自动检查：

| 条件 | 追加动作 |
|------|---------|
| 修改了后端路由 | → update-readme（API_DOC.md 部分） |
| 修改了数据库表 | → update-readme（DATABASE_DOC.md 部分） |
| 修改了前端组件 | → 检查是否符合 design-tokens 规则 |
| 修改了 .env 相关 | → 检查是否违反 security 规则 |
| 新增了文件 | → 检查是否放在正确目录（test-files-management 规则） |

---

## 技能引用映射

工作流中引用技能时，按以下优先级加载：

| 场景 | 优先技能 | 备选 |
|------|---------|------|
| Vue 组件开发 | vue + pinia | vue-component 规则 |
| 测试编写 | vitest | unit-test-generator |
| 代码审查 | code-reviewer | karpathy-guidelines |
| 样式审查 | audit | design-tokens 规则 |
| 安全审查 | security-review | security 规则 |
| 性能优化 | performance-optimizer | — |
| 代码精简 | code-simplifier | — |
| 需求讨论 | grill-me | — |
| PRD 编写 | prd | — |
| 文档同步 | update-readme | — |
| 测试用例生成 | ui-test-case-generator | — |
| 测试执行 | test-case-runner | — |
| Bug 修复 | bug-fixer | — |

---

## 执行方式

1. **识别任务类型**：根据用户输入匹配工作流
2. **选择流程级别**：完整 or 快车道（默认快车道）
3. **声明工作流**：告诉用户"我将按 X 流程执行：步骤1 → 步骤2 → ..."
4. **逐步执行**：每完成一步标记完成，进入下一步
5. **自动追加**：完成后检查是否需要追加 update-readme 等收尾动作
6. **输出摘要**：工作流结束时汇总所有步骤的产出

**不阻塞原则**：如果用户在流程中给出新指令，立即响应新指令，流程可中断可恢复。
