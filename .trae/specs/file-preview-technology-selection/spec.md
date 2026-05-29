# 文件预览技术方案选型分析

## Why

TingStudio 项目目前的文件预览功能仅支持 Excel（XLSX/XLS/CSV）和图片（PNG/JPG/GIF/WEBP）两种格式，无法满足日益增长的业务需求。用户上传的 Word 文档、PDF 文件、PPT 演示文稿等都无法直接预览，只能下载后查看。这严重影响了用户体验和工作效率。

## What Changes

本次选型分析旨在全面评估四种文件预览技术方案：
1. **当前方案**：基于 XLSX.js 的前端解析 + 后端流媒体
2. **kkFileView**：基于 Spring Boot 的服务端转换预览
3. **JntWord/JitViewer**：纯前端 Office 文件预览 SDK
4. **OnlyOffice**：专业的在线文档协作套件

## Impact

- 受影响的功能模块：文件管理（FileManagement）、文件详情（FileDetail）、文件预览对话框（FilePreviewDialog）
- 受影响的代码文件：
  - `frontend/src/components/FilePreviewDialog.vue`
  - `frontend/src/stores/file.ts`
  - `frontend/src/api/file.ts`
  - `backend/src/controllers/fileController.ts`
- 需要决策：选择最适合本项目的预览技术方案

## ADDED Requirements

### Requirement: 增强型文件预览功能

系统 SHALL 支持以下文件格式的在线预览：

| 优先级 | 文件类型 | 格式 |
|--------|---------|------|
| P0 - 必须 | Office 文档 | doc, docx, xls, xlsx, ppt, pptx |
| P0 - 必须 | 便携文档 | pdf |
| P1 - 高优 | 文本文件 | txt, md, xml, json |
| P1 - 高优 | 图片 | png, jpg, gif, bmp, webp, svg |
| P2 - 中优 | 压缩包 | zip, rar, 7z |

### Requirement: 预览性能要求

- 预览加载时间（100KB 文件）：< 3 秒
- 预览加载时间（5MB 文件）：< 10 秒
- 大文件支持：最大 50MB

### Requirement: 部署要求

- 优先选择**轻量级、易部署**的方案
- 支持 Docker 部署
- 与现有 Express 后端服务兼容

## MODIFIED Requirements

### Requirement: 现有预览功能保持

- Excel 预览功能保持兼容（当前实现）
- 图片预览功能保持兼容（当前实现）
- 多工作表切换功能保持兼容

## REMOVED Requirements

无

## 选型评估维度

| 评估维度 | 权重 | 说明 |
|---------|------|------|
| 功能完整性 | 25% | 支持的文件格式数量、高级功能 |
| 部署复杂度 | 20% | 安装配置难度、资源需求 |
| 性能表现 | 20% | 加载速度、资源占用 |
| 维护成本 | 15% | 社区活跃度、文档质量 |
| 扩展性 | 10% | 二次开发难度 |
| 授权费用 | 10% | 开源协议、商业使用成本 |

## 参考资料

- kkFileView: https://gitee.com/kekingcn/file-online-preview
- JitWord SDK: https://github.com/MrXujiang/jitword-sdk
- OnlyOffice: https://www.onlyoffice.com/
