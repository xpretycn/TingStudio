---
name: update-readme
description: 扫描当前项目代码与配置，自动更新根目录 README.md、后端 API_DOC.md 和 DATABASE_DOC.md，保留已有内容，只补全和修正。当用户要求更新文档、同步 README、刷新 API 文档或数据库文档时触发。
---

# 更新项目文档

## 用途

自动分析项目结构、技术栈、入口文件、依赖配置，增量更新以下文档，适合每次开发后一键同步：

- **README.md**：项目概览与快速开始
- **backend/API_DOC.md**：后端 API 接口文档
- **backend/DATABASE_DOC.md**：数据库表结构文档

## 触发词

更新 README、刷新文档、同步 README、update readme、更新 API 文档、更新数据库文档、同步文档

## 执行步骤

### 第一阶段：扫描项目

1. 读取已有文档（README.md、backend/API_DOC.md、backend/DATABASE_DOC.md）。
2. 扫描项目全局信息：
   - 技术栈：package.json、requirements.txt、go.mod 等
   - 目录结构：src/、examples/、tests/ 等
   - 入口文件：main.js、index.py、main.go 等
   - 关键功能：从代码注释和入口文件提取
3. 扫描后端路由（backend/src/routes/）：
   - 提取每个路由文件中定义的 HTTP 方法、路径、中间件
   - 提取请求参数（query/body/params）和响应结构
   - 识别认证要求（需认证 / 无需认证）
4. 扫描数据库结构：
   - 读取 backend/src/scripts/init.sql 或 migrate.sql 获取建表语句
   - 读取 backend/src/config/database-better-sqlite3.ts 获取运行时表初始化
   - 提取表名、字段名、类型、约束、索引、外键关系

### 第二阶段：更新 README.md

按标准结构更新：

- 项目名称/简介
- 技术栈
- 快速开始（安装/运行）
- 目录说明
- 功能特性

写入根目录 README.md，**保留手动修改的内容，只补全缺失部分**。

### 第三阶段：更新 backend/API_DOC.md

1. 对比现有 API_DOC.md 与扫描到的路由，识别差异：
   - 新增路由（文档中未记录）
   - 已删除路由（文档中有但代码中不存在）
   - 参数/响应变更（字段增删、类型变化）
2. 按模块组织接口文档，每个接口包含：
   - HTTP 方法和路径
   - 认证要求
   - 请求参数表（字段、类型、必填、约束、说明）
   - 响应示例（成功/错误）
3. 保留文档中手动补充的业务说明、示例、注意事项。
4. 更新文档头部的"最后更新"日期。
5. 写入 backend/API_DOC.md。

### 第四阶段：更新 backend/DATABASE_DOC.md

1. 对比现有 DATABASE_DOC.md 与扫描到的表结构，识别差异：
   - 新增表（文档中未记录）
   - 已删除表（文档中有但 SQL 中不存在）
   - 字段变更（增删字段、类型变化、约束变化）
   - 索引/外键变更
2. 按模块组织表结构文档，每张表包含：
   - 表名和用途说明
   - 字段列表（字段名、类型、约束、说明）
   - 索引列表
   - 外键关系
   - JSON 字段结构示例（如 materials_json、per_100g_json）
   - 业务含义说明
3. 更新 ER 关系图（文字描述）。
4. 更新数据库概览（表数量统计）。
5. 保留文档中手动补充的业务含义、CHECK 约束、种子数据量等章节。
6. 更新文档头部的"最后更新"日期。
7. 写入 backend/DATABASE_DOC.md。

### 第五阶段：输出结果

输出变更摘要，列出每个文档的更新内容：

- README.md：新增/修改了哪些章节
- API_DOC.md：新增/删除/修改了哪些接口
- DATABASE_DOC.md：新增/删除/修改了哪些表/字段

## 注意事项

- **增量更新**：不覆盖手动修改的内容，只补全缺失和修正错误
- **保留格式**：保持现有文档的 Markdown 格式和章节结构
- **日期更新**：每次更新时刷新文档头部的"最后更新"日期
- **路由扫描范围**：backend/src/routes/*.ts
- **数据库扫描范围**：backend/src/scripts/init.sql、backend/src/config/database-better-sqlite3.ts
- **不存在的文档**：如果 API_DOC.md 或 DATABASE_DOC.md 不存在，跳过对应阶段
