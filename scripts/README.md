# Scripts Directory - 脚本说明

本目录包含用于文档自动化更新的脚本文件。

## 📦 可用脚本

### 1. update-docs.ps1
**用途**: 自动更新 README.md 和其他项目文档

**使用方法**:
```powershell
# 基本运行
.\update-docs.ps1

# 自动提交文档更新
.\update-docs.ps1 -AutoCommit

# 跳过验证（不推荐）
.\update-docs.ps1 -SkipValidation

# 组合使用
.\update-docs.ps1 -AutoCommit -SkipValidation
```

**功能**:
- 分析 Git commits 历史
- 自动生成更新日志
- 更新 README.md
- 验证必要文档存在性
- 生成项目统计信息
- 创建更新报告

**输出位置**: `.codebuddy\plans\doc-update-report.md`

---

## 🔧 其他脚本（技能目录中）

以下脚本位于 `~/.qoder/skills/pre-push-doc-updater/scripts/`：

### doc-validator.ts
TypeScript 编写的文档健康检查工具，用于验证文档质量和完整性。

```bash
# 编译并运行
npx ts-node doc-validator.ts

# 或编译后运行
npx tsc doc-validator.ts --outDir dist
node dist/doc-validator.js
```

### pre-push-hook.sh
Git pre-push hook 脚本，用于在推送前自动触发文档更新。

```bash
# 安装到项目
Copy-Item "~/.qoder/skills/pre-push-doc-updater/scripts/pre-push-hook.sh" ".git/hooks/pre-push"
```

### install.ps1
技能安装脚本，用于配置项目环境。

```powershell
# 运行完整安装
.\install.ps1 -InstallHook

# 仅验证不安装 hook
.\install.ps1
```

### test-installation.ps1
测试脚本，验证技能安装是否成功。

```powershell
# 运行测试
.\test-installation.ps1
```

---

## 🚀 典型工作流

### 开发完成后推送代码

```powershell
# 1. 提交代码变更
git add .
git commit -m "feat: 新增导出功能"

# 2. 运行文档更新
.\update-docs.ps1

# 3. 查看生成的报告
cat ..\.codebuddy\plans\doc-update-report.md

# 4. 确认无误后提交文档更新
git add *.md
git commit -m "docs: 更新文档和更新日志"

# 5. 推送到远程仓库
git push origin feature-branch
```

### 使用 Git Hook 自动化

```powershell
# 1. 安装 Git hook（一次性）
Copy-Item "$env:USERPROFILE\.qoder\skills\pre-push-doc-updater\scripts\pre-push-hook.sh" ".git\hooks\pre-push"

# 2. 之后每次推送都会自动检查
git push origin feature-branch
# ⬆️ 推送前会自动运行文档更新
```

---

## ⚙️ 配置选项

编辑 `~/.qoder/skills/pre-push-doc-updater/config.json` 自定义行为。

主要配置项：
- `autoGenerateChangelog`: 是否自动生成更新日志
- `healthCheckThreshold`: 文档健康检查阈值（默认 70%）
- `requiredDocuments`: 必要文档列表
- `gitHook.enabled`: 是否启用 Git hook
- `autoCommit.enabled`: 是否自动提交文档更新

---

## 📊 输出示例

运行 `update-docs.ps1` 后会生成：

1. **README.md** - 添加新的更新日志条目
2. **doc-update-report.md** - 详细的更新报告，包含：
   - 变更统计
   - 文档验证结果
   - 项目统计信息
   - 推送确认清单

---

## 🔍 故障排除

### 问题：PowerShell 无法运行脚本

**解决方案**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

### 问题：找不到脚本文件

**解决方案**:
确保在项目根目录运行：
```powershell
cd D:\Program Data\workspace-codebd\TingStudio
.\scripts\update-docs.ps1
```

### 问题：文档更新后 git status 显示变更

**这是正常现象**。脚本更新了文档文件，需要手动审阅并提交。

---

## 📖 更多资源

- 完整使用指南：`~/.qoder/skills/pre-push-doc-updater/README.md`
- 技能详细说明：`~/.qoder/skills/pre-push-doc-updater/SKILL.md`
- 快速参考：`~/.qoder/skills/pre-push-doc-updater/QUICK_REFERENCE.md`
- 安装总结：`~/.qoder/skills/pre-push-doc-updater/INSTALLATION_SUMMARY.md`

---

## 💡 最佳实践

1. **定期运行**: 每次功能开发完成后运行文档更新
2. **仔细审阅**: 始终检查生成的更新内容再提交
3. **启用 Hook**: 推荐使用 Git hook 实现自动化
4. **备份配置**: 定期备份 config.json 以防丢失

---

**提示**: 本脚本旨在提高文档维护效率，但不能完全替代人工审阅。
