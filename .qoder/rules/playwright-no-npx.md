---
trigger: always_on
---
# Playwright 调用规则（强制本地全局，禁止 npx）

## 1. 核心强制规则

- 所有 Playwright 相关操作，**禁止使用 npx、临时安装、局部安装**。
- 必须调用**系统全局已安装的 playwright 和 Chromium命令，无需重复下载或安装。**（已全局安装 @playwright/test）。
- 浏览器（Chromium）**已全局安装缓存**，**禁止再次执行 install / install chromium**。
- 禁止生成/执行：
  - `npx playwright ...`
  - `npx @playwright/test ...`
  - `playwright install` / `playwright install chromium`
  - 任何自动下载浏览器的脚本
  - Python 脚本：直接导入 `playwright.sync_api`，无需安装提示。

## 2. 正确调用方式（必须用这两种）

### Node.js 项目（全局 @playwright/test）

```bash
# 直接全局命令
playwright test
playwright open
playwright codegen
```
