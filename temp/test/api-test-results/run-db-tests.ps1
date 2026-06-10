$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTRjbmN4bjRkZDdlMDduIiwidXNlcklkIjoibXE0Y25jeG40ZGQ3ZTA3biIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODcxMzY1LCJleHAiOjE3ODE0NzYxNjV9.e3p8K2TeJW9Kk9lt6L_fNaoKKwJktAD-IoPNDSO-nKs"
$flToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTRjdHc5cXF3M2R1OXJ0IiwidXNlcklkIjoibXE0Y3R3OXFxdzNkdTlydCIsInVzZXJuYW1lIjoidGVzdF9mb3JtdWxpc3QiLCJyb2xlIjoiZm9ybXVsaXN0Iiwicm9sZUlkIjpudWxsLCJwZXJtaXNzaW9ucyI6W10sImlhdCI6MTc4MDg3MTM2NiwiZXhwIjoxNzgxNDc2MTY2fQ.ixiHo0czgMaHmq4AXsWlZ5dn0kY6Qcr8baGoZAXBc8w"
$base = "http://localhost:3000/api"
$results = @()

function Test-Api {
  param($id, $name, $method, $url, $headers, $body, $expectedStatus, $validate)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $irmParams = @{Uri="$base$url"; Method=$method; Headers=$headers}
    if ($body) {
      $irmParams.ContentType = "application/json"
      $irmParams.Body = ($body | ConvertTo-Json -Compress)
    }
    $resp = Invoke-RestMethod @irmParams
    $sw.Stop()
    $statusOk = $true
    $detail = ""
    if ($validate) { $statusOk, $detail = & $validate $resp }
    $results += [PSCustomObject]@{ID=$id; Name=$name; Result=$(if($statusOk){"PASS"}else{"FAIL"}); Status=200; Time=$sw.ElapsedMilliseconds; Detail=$detail}
  } catch {
    $sw.Stop()
    $statusCode = 0
    $respObj = $null
    try { $statusCode = $_.Exception.Response.StatusCode.value__ } catch {}
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      $reader = [System.IO.StreamReader]::new($stream)
      $rawResp = $reader.ReadToEnd()
      $reader.Close()
      $respObj = $rawResp | ConvertFrom-Json
    } catch {}
    $statusOk = $statusCode -eq $expectedStatus
    $detail = ""
    if ($validate -and $respObj) { $statusOk, $detail = & $validate $respObj }
    elseif (-not $statusOk) { $detail = "Expected $expectedStatus got $statusCode" }
    $results += [PSCustomObject]@{ID=$id; Name=$name; Result=$(if($statusOk){"PASS"}else{"FAIL"}); Status=$statusCode; Time=$sw.ElapsedMilliseconds; Detail=$detail}
  }
}

$ah = @{Authorization="Bearer $adminToken"}
$fh = @{Authorization="Bearer $flToken"}

# A01 GET /api/db/info
Test-Api "A01-P01" "管理员获取数据库信息" "GET" "/db/info" $ah $null 200 { param($r); $ok=$r.success -and $r.data.dbType -and $r.data.tableCount -gt 0; ($ok, $(if(-not$ok){"data结构不符"}) ) }
Test-Api "A01-R01" "未登录访问" "GET" "/db/info" @{} $null 401 { param($r); ($r.success -eq $false -or $null -eq $r.success, "success应为false") }
Test-Api "A01-R02" "formulist角色访问" "GET" "/db/info" $fh $null 403 { param($r); ($r.success -eq $false, "success应为false") }
Test-Api "A01-I01" "幂等性-重复请求" "GET" "/db/info" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A01-X-MD01" "POST方法" "POST" "/db/info" $ah $null 404 { param($r); ($true, "") }

# A02 GET /api/db/tables
Test-Api "A02-P01" "管理员获取表列表" "GET" "/db/tables" $ah $null 200 { param($r); $ok=$r.success -and $r.data.Count -gt 0; ($ok, $(if(-not$ok){"data为空或非数组"}) ) }
Test-Api "A02-R01" "formulist角色访问" "GET" "/db/tables" $fh $null 403 { param($r); ($r.success -eq $false, "") }
Test-Api "A02-R02" "未登录访问" "GET" "/db/tables" @{} $null 401 { param($r); ($true, "") }
Test-Api "A02-I01" "幂等性" "GET" "/db/tables" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A02-X-MD01" "POST方法" "POST" "/db/tables" $ah $null 404 { param($r); ($true, "") }

# A03 GET /api/db/tables/:tableName/schema
Test-Api "A03-P01" "获取users表结构" "GET" "/db/tables/users/schema" $ah $null 200 { param($r); $ok=$r.success -and $r.data.name -eq "users" -and $r.data.columns.Count -gt 0; ($ok, $(if(-not$ok){"data结构不符"}) ) }
Test-Api "A03-E01" "表不存在" "GET" "/db/tables/nonexistent/schema" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A03-E02" "SQL注入表名" "GET" "/db/tables/users;DROP%20TABLE%20users/schema" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A03-V01" "表名含空格" "GET" "/db/tables/user%20name/schema" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A03-V02" "表名含连字符" "GET" "/db/tables/my-table/schema" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A03-R01" "formulist角色" "GET" "/db/tables/users/schema" $fh $null 403 { param($r); ($r.success -eq $false, "") }

# A04 GET /api/db/tables/:tableName/data
Test-Api "A04-P01" "默认分页获取表数据" "GET" "/db/tables/users/data" $ah $null 200 { param($r); $ok=$r.success -and $r.data.columns -and $r.data.rows -and $r.data.pagination; ($ok, $(if(-not$ok){"data结构不符"}) ) }
Test-Api "A04-P02" "指定分页参数" "GET" "/db/tables/users/data?page=1&pageSize=5" $ah $null 200 { param($r); $ok=$r.success -and $r.data.pagination.pageSize -eq 5; ($ok, $(if(-not$ok){"pageSize不为5"}) ) }
Test-Api "A04-P03" "带搜索参数" "GET" "/db/tables/users/data?search=admin" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A04-E01" "表不存在" "GET" "/db/tables/nonexistent/data" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A04-B01" "page=0" "GET" "/db/tables/users/data?page=0" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A04-B04" "搜索空字符串" "GET" "/db/tables/users/data?search=" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A04-B05" "搜索SQL注入" "GET" "/db/tables/users/data?search=%27%20OR%201=1--" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A04-V01" "page非数字" "GET" "/db/tables/users/data?page=abc" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A04-R01" "formulist角色" "GET" "/db/tables/users/data" $fh $null 403 { param($r); ($r.success -eq $false, "") }

# A05 GET /api/db/backups
Test-Api "A05-P01" "获取备份列表" "GET" "/db/backups" $ah $null 200 { param($r); $ok=$r.success -and ($r.data -is [System.Array]); ($ok, $(if(-not$ok){"data非数组"}) ) }
Test-Api "A05-R01" "formulist角色" "GET" "/db/backups" $fh $null 403 { param($r); ($r.success -eq $false, "") }
Test-Api "A05-I01" "幂等性" "GET" "/db/backups" $ah $null 200 { param($r); ($r.success -eq $true, "") }

# A06 POST /api/db/backups
Test-Api "A06-P01" "成功创建备份" "POST" "/db/backups" $ah @{} 201 { param($r); $ok=$r.success -and $r.data.fileName; ($ok, $(if(-not$ok){"data.fileName缺失"}) ) }
Test-Api "A06-R01" "formulist角色创建" "POST" "/db/backups" $fh @{} 403 { param($r); ($r.success -eq $false, "") }
Test-Api "A06-I01" "连续创建备份" "POST" "/db/backups" $ah @{} 201 { param($r); ($r.success -eq $true, "") }

# Get backup file name
$backupList = Invoke-RestMethod -Uri "$base/db/backups" -Method GET -Headers $ah
$backupFileName = ""
if ($backupList.data.Count -gt 0) { $backupFileName = $backupList.data[0].fileName }
Write-Output "BACKUP_FILE=$backupFileName"

# A07 GET /api/db/backups/:fileName/download
if ($backupFileName) {
  Test-Api "A07-P01" "下载存在的备份" "GET" "/db/backups/$backupFileName/download" $ah $null 200 { param($r); ($true, "") }
}
Test-Api "A07-E01" "下载不存在的备份" "GET" "/db/backups/tingstudio_backup_nonexistent.json/download" $ah $null 404 { param($r); ($r.success -eq $false, "") }
Test-Api "A07-E02" "文件名路径遍历" "GET" "/db/backups/../../etc/passwd/download" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A07-V02" "非json后缀" "GET" "/db/backups/backup.txt/download" $ah $null 500 { param($r); ($r.success -eq $false, "") }
if ($backupFileName) {
  Test-Api "A07-R01" "formulist角色下载" "GET" "/db/backups/$backupFileName/download" $fh $null 403 { param($r); ($r.success -eq $false, "") }
}

# A08 POST /api/db/backups/:fileName/restore - skip actual restore to protect data
Test-Api "A08-E01" "恢复不存在的备份" "POST" "/db/backups/tingstudio_backup_nonexistent.json/restore" $ah @{} 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A08-E04" "恢复文件名路径遍历" "POST" "/db/backups/../../etc/passwd/restore" $ah @{} 500 { param($r); ($r.success -eq $false, "") }
if ($backupFileName) {
  Test-Api "A08-R01" "formulist角色恢复" "POST" "/db/backups/$backupFileName/restore" $fh @{} 403 { param($r); ($r.success -eq $false, "") }
}

# A09 DELETE - create a backup first, then delete it
$delBackup = Invoke-RestMethod -Uri "$base/db/backups" -Method POST -Headers $ah -ContentType "application/json" -Body "{}"
$delFileName = ""
if ($delBackup.success) { $delFileName = $delBackup.data.fileName }
if ($delFileName) {
  Test-Api "A09-P01" "成功删除备份" "DELETE" "/db/backups/$delFileName" $ah $null 200 { param($r); $ok=$r.success -and $r.data.deleted -eq $true; ($ok, "") }
  Test-Api "A09-I01" "重复删除同一文件" "DELETE" "/db/backups/$delFileName" $ah $null 500 { param($r); ($r.success -eq $false, "") }
}
Test-Api "A09-E01" "删除不存在的备份" "DELETE" "/db/backups/tingstudio_backup_nonexistent.json" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A09-E02" "删除路径遍历" "DELETE" "/db/backups/../../etc/passwd" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A09-R01" "formulist角色删除" "DELETE" "/db/backups/tingstudio_backup_nonexistent.json" $fh $null 403 { param($r); ($r.success -eq $false, "") }

# A11 GET /api/db/scripts
Test-Api "A11-P01" "获取脚本列表" "GET" "/db/scripts" $ah $null 200 { param($r); $ok=$r.success -and $r.data.scripts; ($ok, "") }
Test-Api "A11-R01" "formulist角色" "GET" "/db/scripts" $fh $null 403 { param($r); ($r.success -eq $false, "") }
Test-Api "A11-I01" "幂等性" "GET" "/db/scripts" $ah $null 200 { param($r); ($r.success -eq $true, "") }

# A12 POST /api/db/scripts/:scriptId/execute
Test-Api "A12-P01" "执行verify-data脚本" "POST" "/db/scripts/verify-data/execute" $ah @{} 200 { param($r); $ok=$r.success -and $r.data.status; ($ok, "") }
Test-Api "A12-E01" "脚本不存在" "POST" "/db/scripts/nonexistent/execute" $ah @{} 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A12-E03" "脚本ID含特殊字符" "POST" "/db/scripts/;DROP%20TABLE/execute" $ah @{} 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A12-R01" "formulist角色执行" "POST" "/db/scripts/verify-data/execute" $fh @{} 403 { param($r); ($r.success -eq $false, "") }

# A13 GET /api/db/scripts/:scriptId/history
Test-Api "A13-P01" "获取脚本执行历史" "GET" "/db/scripts/verify-data/history" $ah $null 200 { param($r); $ok=$r.success -and ($r.data -is [System.Array]); ($ok, "") }
Test-Api "A13-P02" "指定limit=5" "GET" "/db/scripts/verify-data/history?limit=5" $ah $null 200 { param($r); ($r.success -eq $true, "") }
Test-Api "A13-V02" "脚本ID含特殊字符" "GET" "/db/scripts/;DROP/history" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A13-R01" "formulist角色" "GET" "/db/scripts/verify-data/history" $fh $null 403 { param($r); ($r.success -eq $false, "") }

# A14 GET /api/db/scripts/:scriptId/content
Test-Api "A14-P01" "获取脚本内容" "GET" "/db/scripts/verify-data/content" $ah $null 200 { param($r); $ok=$r.success -and $r.data.content; ($ok, "") }
Test-Api "A14-E01" "脚本不存在" "GET" "/db/scripts/nonexistent/content" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A14-V01" "脚本ID含特殊字符" "GET" "/db/scripts/;DROP/content" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A14-R01" "formulist角色" "GET" "/db/scripts/verify-data/content" $fh $null 403 { param($r); ($r.success -eq $false, "") }

# A15 PUT /api/db/scripts/:scriptId/content
$originalContent = (Invoke-RestMethod -Uri "$base/db/scripts/verify-data/content" -Method GET -Headers $ah).data.content
$testContent = "console.log(\"test\")"
Test-Api "A15-P01" "更新脚本内容" "PUT" "/db/scripts/verify-data/content" $ah @{content=$testContent} 200 { param($r); $ok=$r.success -and $r.data.scriptPath; ($ok, "") }
# Restore original
Invoke-RestMethod -Uri "$base/db/scripts/verify-data/content" -Method PUT -Headers $ah -ContentType "application/json" -Body (@{content=$originalContent} | ConvertTo-Json -Compress) | Out-Null
Test-Api "A15-E01" "脚本不存在" "PUT" "/db/scripts/nonexistent/content" $ah @{content="x"} 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A15-V01" "缺少content字段" "PUT" "/db/scripts/verify-data/content" $ah @{} 400 { param($r); ($r.success -eq $false, "") }
Test-Api "A15-R01" "formulist角色" "PUT" "/db/scripts/verify-data/content" $fh @{content="x"} 403 { param($r); ($r.success -eq $false, "") }

# A16 GET /api/db/scripts/:scriptId/versions
Test-Api "A16-P01" "获取脚本版本历史" "GET" "/db/scripts/verify-data/versions" $ah $null 200 { param($r); $ok=$r.success -and ($r.data -is [System.Array]); ($ok, "") }
Test-Api "A16-R01" "formulist角色" "GET" "/db/scripts/verify-data/versions" $fh $null 403 { param($r); ($r.success -eq $false, "") }

# A17 POST /api/db/scripts/:scriptId/versions/restore
Test-Api "A17-V01" "缺少versionId" "POST" "/db/scripts/verify-data/versions/restore" $ah @{} 400 { param($r); ($r.success -eq $false, "") }
Test-Api "A17-E02" "脚本不存在" "POST" "/db/scripts/nonexistent/versions/restore" $ah @{versionId="test"} 500 { param($r); ($r.success -eq $false, "") }
Test-Api "A17-R01" "formulist角色" "POST" "/db/scripts/verify-data/versions/restore" $fh @{versionId="test"} 403 { param($r); ($r.success -eq $false, "") }

# Special scenarios
Test-Api "X-MD-DB01" "GET端点用POST" "POST" "/db/info" $ah $null 404 { param($r); ($true, "") }
Test-Api "X-SE-DB04" "路径遍历备份文件名" "GET" "/db/backups/../../etc/passwd/download" $ah $null 500 { param($r); ($r.success -eq $false, "") }
Test-Api "X-SE-DB05" "表名SQL注入" "GET" "/db/tables/users;DROP%20TABLE/schema" $ah $null 500 { param($r); ($r.success -eq $false, "") }

# Output results
$pass = ($results | Where-Object {$_.Result -eq "PASS"}).Count
$fail = ($results | Where-Object {$_.Result -eq "FAIL"}).Count
$total = $results.Count
Write-Output "`n=== DB MODULE TEST RESULTS ==="
Write-Output "Total: $total | Pass: $pass | Fail: $fail"
$results | ForEach-Object { Write-Output "$($_.ID) | $($_.Name) | $($_.Result) | $($_.Status) | $($_.Time)ms | $($_.Detail)" }

$results | Export-Csv -Path "d:\ProgramData\workspace-codeby\ting-studio\test\api-test-results\db-raw.csv" -NoTypeInformation -Encoding UTF8
Write-Output "`nResults saved"
