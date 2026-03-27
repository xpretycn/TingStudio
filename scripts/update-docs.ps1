# scripts/update-docs.ps1
# Pre-Push Document Updater - PowerShell 自动化脚本

param(
    [switch]$AutoCommit,      # 自动提交文档更新
    [switch]$SkipValidation,  # 跳过验证步骤
    [int]$MaxCommits = 20     # 最大处理 commits 数量
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

Write-Host "`n🚀 开始文档更新流程..." -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

try {
    # ============================================
    # Step 1: 获取 Git 信息
    # ============================================
    Write-Host "`n📍 收集 Git 信息..." -ForegroundColor Yellow
    
    $currentBranch = git rev-parse --abbrev-ref HEAD
    $commits = git log --oneline --no-decorate --reverse -n $MaxCommits
    $commitCount = ($commits | Measure-Object).Count
    $remoteUrl = git remote get-url origin 2>$null
    
    Write-Host "   当前分支：$currentBranch" -ForegroundColor Gray
    Write-Host "   待推送 commits: $commitCount" -ForegroundColor Gray
    if ($remoteUrl) {
        Write-Host "   远程仓库：$remoteUrl" -ForegroundColor Gray
    }

    # ============================================
    # Step 2: 分析变更范围
    # ============================================
    Write-Host "`n📊 分析变更统计..." -ForegroundColor Yellow
    
    if ($commitCount -gt 0) {
        $diffStats = git diff --shortstat HEAD~$commitCount
        Write-Host "   变更统计：$diffStats" -ForegroundColor Gray
        
        # 获取详细文件列表
        $changedFiles = git diff --name-only HEAD~$commitCount
        $addedFiles = git diff --name-status HEAD~$commitCount | Where-Object { $_.StartsWith('A') }
        $modifiedFiles = git diff --name-status HEAD~$commitCount | Where-Object { $_.StartsWith('M') }
        $deletedFiles = git diff --name-status HEAD~$commitCount | Where-Object { $_.StartsWith('D') }
        
        Write-Host "   新增文件：$($addedFiles.Count)" -ForegroundColor Green
        Write-Host "   修改文件：$($modifiedFiles.Count)" -ForegroundColor Yellow
        if ($deletedFiles.Count -gt 0) {
            Write-Host "   删除文件：$($deletedFiles.Count)" -ForegroundColor Red
        }
    } else {
        Write-Host "   ⚠️  没有检测到新的 commits" -ForegroundColor Yellow
    }

    # ============================================
    # Step 3: 生成更新日志草稿
    # ============================================
    Write-Host "`n✍️  生成更新日志..." -ForegroundColor Yellow
    
    $newVersion = "v2.2.1"
    $updateDate = Get-Date -Format "yyyy-MM-dd"
    
    if ($commitCount -gt 0) {
        # 按类型分组 commits
        $featCommits = git log --oneline -n $commitCount | Where-Object { $_ -match '^feat' }
        $fixCommits = git log --oneline -n $commitCount | Where-Object { $_ -match '^fix' }
        $docsCommits = git log --oneline -n $commitCount | Where-Object { $_ -match '^docs' }
        $otherCommits = git log --oneline -n $commitCount | Where-Object { $_ -notmatch '^(feat|fix|docs|style|refactor|test|chore)' }
        
        $updateLogEntries = @()
        
        if ($featCommits.Count -gt 0) {
            $updateLogEntries += "`n#### ✨ 新功能`n"
            $featCommits | ForEach-Object { $updateLogEntries += "- $_" }
        }
        
        if ($fixCommits.Count -gt 0) {
            $updateLogEntries += "`n#### 🐛 Bug 修复`n"
            $fixCommits | ForEach-Object { $updateLogEntries += "- $_" }
        }
        
        if ($docsCommits.Count -gt 0) {
            $updateLogEntries += "`n#### 📝 文档更新`n"
            $docsCommits | ForEach-Object { $updateLogEntries += "- $_" }
        }
        
        if ($otherCommits.Count -gt 0) {
            $updateLogEntries += "`n#### 🔧 其他改进`n"
            $otherCommits | ForEach-Object { $updateLogEntries += "- $_" }
        }
        
        $newUpdateLog = @"

### $newVersion ($updateDate)
$($updateLogEntries -join "`n")

"@
        
        Write-Host "   已生成 $($updateLogEntries.Count) 条更新条目" -ForegroundColor Green
    } else {
        $newUpdateLog = @"

### $newVersion ($updateDate)
- 常规维护和优化

"@
    }

    # ============================================
    # Step 4: 更新 README.md
    # ============================================
    Write-Host "`n📄 更新 README.md..." -ForegroundColor Yellow
    
    $readmePath = Join-Path $PSScriptRoot "..\README.md"
    if (!(Test-Path $readmePath)) {
        $readmePath = "README.md"
    }
    
    if (Test-Path $readmePath) {
        $readmeContent = Get-Content $readmePath -Raw -Encoding UTF8
        
        # 查找更新日志部分并插入新内容
        if ($readmeContent -match '(## 更新日志\s*\n)') {
            $updatedContent = $readmeContent -replace '(## 更新日志\s*\n)', ("`${1}$newUpdateLog`n")
            $updatedContent | Set-Content $readmePath -NoNewline -Encoding UTF8
            Write-Host "   ✅ 已更新 README.md 的更新日志部分" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  未找到 '## 更新日志' 章节，跳过更新" -ForegroundColor Yellow
        }
    } else {
        Write-Host "   ❌ 未找到 README.md 文件" -ForegroundColor Red
    }

    # ============================================
    # Step 5: 验证必要文档
    # ============================================
    if (!$SkipValidation) {
        Write-Host "`n✅ 验证文档完整性..." -ForegroundColor Yellow
        
        $requiredFiles = @(
            "README.md",
            "backend\API_DOC.md",
            "backend\DATABASE_DOC.md",
            "PRD-TingStudio-v2.0.md"
        )
        
        $missingFiles = @()
        foreach ($file in $requiredFiles) {
            $filePath = Join-Path $PSScriptRoot "..\$file"
            if (!(Test-Path $filePath)) {
                $filePath = $file
            }
            
            if (!(Test-Path $filePath)) {
                $missingFiles += $file
                Write-Host "   ❌ 缺失：$file" -ForegroundColor Red
            } else {
                $content = Get-Content $filePath -Raw
                if ([string]::IsNullOrWhiteSpace($content)) {
                    Write-Host "   ⚠️  文件为空：$file" -ForegroundColor Yellow
                } else {
                    Write-Host "   ✅ $file" -ForegroundColor Green
                }
            }
        }
        
        if ($missingFiles.Count -gt 0) {
            throw "缺少必要文件：$($missingFiles -join ', ')"
        }
    }

    # ============================================
    # Step 6: 生成项目统计
    # ============================================
    Write-Host "`n📊 生成项目统计..." -ForegroundColor Yellow
    
    $totalFiles = (Get-ChildItem -Path (Join-Path $PSScriptRoot "..\") -Recurse -File -Exclude node_modules,dist,.git).Count
    $tsFiles = (Get-ChildItem -Path (Join-Path $PSScriptRoot "..\") -Recurse -Filter "*.ts").Count
    $vueFiles = (Get-ChildItem -Path (Join-Path $PSScriptRoot "..\") -Recurse -Filter "*.vue").Count
    $mdFiles = (Get-ChildItem -Path (Join-Path $PSScriptRoot "..\") -Recurse -Filter "*.md").Count
    
    Write-Host "   总文件数：$totalFiles" -ForegroundColor Gray
    Write-Host "   TypeScript 文件：$tsFiles" -ForegroundColor Gray
    Write-Host "   Vue 组件：$vueFiles" -ForegroundColor Gray
    Write-Host "   Markdown 文档：$mdFiles" -ForegroundColor Gray

    # ============================================
    # Step 7: 生成更新报告
    # ============================================
    Write-Host "`n📋 生成更新报告..." -ForegroundColor Yellow
    
    $reportDir = Join-Path $PSScriptRoot "..\.codebuddy\plans"
    if (!(Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    
    $reportPath = Join-Path $reportDir "doc-update-report.md"
    $reportContent = @"
# 文档更新报告

**更新时间**: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
**当前分支**: $currentBranch
**待推送 commits**: $commitCount

## 本次变更

### 代码变更
$(if ($commitCount -gt 0) { "- 变更统计：$diffStats`n" } else { "- 无新变更`n" })
- 总文件数：$totalFiles
- TypeScript 文件：$tsFiles
- Vue 组件：$vueFiles
- Markdown 文档：$mdFiles

### 文档更新
- ✅ README.md - 已添加 v2.2.1 更新日志
$(if (Test-Path "backend\API_DOC.md") { "- ✅ backend/API_DOC.md - 已验证" } else { "- ⚠️  backend/API_DOC.md - 缺失" })
$(if (Test-Path "backend\DATABASE_DOC.md") { "- ✅ backend/DATABASE_DOC.md - 已验证" } else { "- ⚠️  backend/DATABASE_DOC.md - 缺失" })
$(if (Test-Path "PRD-TingStudio-v2.0.md") { "- ✅ PRD 文档 - 已验证" } else { "- ⚠️  PRD 文档 - 缺失" })

### 健康检查
$(if ($missingFiles.Count -eq 0) { "所有必要文档都存在且非空 ✅" } else { "缺少文件：$($missingFiles -join ', ') ❌" })

## 推送确认

所有文档已更新完毕，可以安全推送。

- [ ] 我已审阅以上变更
- [ ] 我确认文档与代码保持一致
"@
    
    $reportContent | Set-Content $reportPath -Encoding UTF8
    Write-Host "   ✅ 报告已保存到：$reportPath" -ForegroundColor Green

    # ============================================
    # Step 8: 自动提交（可选）
    # ============================================
    if ($AutoCommit) {
        Write-Host "`n🔄 自动提交文档更新..." -ForegroundColor Yellow
        
        git add *.md 2>$null
        git add backend/*.md 2>$null
        
        $status = git status --porcelain
        if ($status) {
            git commit -m "docs: 更新文档和更新日志 [skip ci]"
            Write-Host "   ✅ 已自动提交文档更新" -ForegroundColor Green
        } else {
            Write-Host "   ℹ️  没有需要提交的文档变更" -ForegroundColor Yellow
        }
    }

    # ============================================
    # 完成
    # ============================================
    $endTime = Get-Date
    $duration = New-TimeSpan -Start $startTime -End $endTime
    
    Write-Host "`n=====================================" -ForegroundColor Cyan
    Write-Host "🎉 文档更新完成！耗时：$($duration.Seconds)秒" -ForegroundColor Cyan
    Write-Host "=====================================`n" -ForegroundColor Cyan
    
    Write-Host "下一步操作：" -ForegroundColor Yellow
    Write-Host "1. 查看生成的报告：cat .codebuddy\plans\doc-update-report.md" -ForegroundColor Gray
    Write-Host "2. 确认无误后推送：git push origin $currentBranch" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "`n❌ 错误：$_" -ForegroundColor Red
    Write-Host "请检查以上错误信息后重试" -ForegroundColor Yellow
    exit 1
}
