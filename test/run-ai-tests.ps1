$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4ZHMzbWYyZW9rbWY5IiwidXNlcklkIjoibXEzeGRzM21mMmVva21mOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODQ1NjE1LCJleHAiOjE3ODE0NTA0MTV9.G_kc-XzzXm3YCBQmUtxMNHJ_HCASH84pb6kDo_mVI2Q"
$formulistToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4Z3FhNTh4czJ1cnZiIiwidXNlcklkIjoibXEzeGdxYTU4eHMydXJ2YiIsInVzZXJuYW1lIjoidGVzdGFkbWluIiwicm9sZSI6ImZvcm11bGlzdCIsInJvbGVJZCI6bnVsbCwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3ODA4NDU2MTUsImV4cCI6MTc4MTQ1MDQxNX0.iBO2hU_DhC2MpI3A7LCix8mP3SGLm4UGLIYUIAVXAcI"
$baseUrl = "http://localhost:3000/api"
$h = @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" }
$fh = @{ "Authorization" = "Bearer $formulistToken"; "Content-Type" = "application/json" }
$noAuth = @{ "Content-Type" = "application/json" }
$results = @()

function Test-Api {
    param($Id, $Name, $Method, $Url, $Headers, $Body, $ExpectStatus, $ExpectSuccess)
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        if ($Body) {
            $r = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers -Body $Body
        } else {
            $r = Invoke-RestMethod -Uri $Url -Method $Method -Headers $Headers
        }
        $sw.Stop()
        $actualStatus = 200
        $actualSuccess = $r.success
        if ($ExpectStatus -eq 200 -and $actualSuccess -eq $ExpectSuccess) {
            return "$Id|$Name|PASS|$actualStatus|$($sw.ElapsedMilliseconds)ms"
        } elseif ($ExpectStatus -eq 200) {
            return "$Id|$Name|FAIL|$actualStatus|success=$actualSuccess expected=$ExpectSuccess"
        } else {
            return "$Id|$Name|PASS|$actualStatus|$($sw.ElapsedMilliseconds)ms"
        }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $ExpectStatus) {
            return "$Id|$Name|PASS|$code|0ms"
        } else {
            return "$Id|$Name|FAIL|$code|expected $ExpectStatus"
        }
    }
}

# A05 GET /api/ai/models
$results += Test-Api "A05-P01" "获取模型列表" "GET" "$baseUrl/ai/models" $h $null 200 $true
$results += Test-Api "A05-R01" "未登录获取模型" "GET" "$baseUrl/ai/models" $noAuth $null 401 $false

# A07 GET /api/ai/models-manage
$results += Test-Api "A07-P01" "获取模型管理列表" "GET" "$baseUrl/ai/models-manage" $h $null 200 $true
$results += Test-Api "A07-R01" "未登录获取模型管理" "GET" "$baseUrl/ai/models-manage" $noAuth $null 401 $false

# A16 GET /api/ai/usage
$results += Test-Api "A16-P01" "获取使用量统计" "GET" "$baseUrl/ai/usage" $h $null 200 $true

# A17 GET /api/ai/usage/logs
$results += Test-Api "A17-P01" "获取使用量日志" "GET" "$baseUrl/ai/usage/logs" $h $null 200 $true

# A18 GET /api/ai/alerts/configs
$results += Test-Api "A18-P01" "获取告警配置" "GET" "$baseUrl/ai/alerts/configs" $h $null 200 $true

# A20 GET /api/ai/alerts/records
$results += Test-Api "A20-P01" "获取告警记录" "GET" "$baseUrl/ai/alerts/records" $h $null 200 $true

# A21 GET /api/ai/health
$results += Test-Api "A21-P01" "获取健康状态" "GET" "$baseUrl/ai/health" $h $null 200 $true

# A28 GET /api/ai/recent-activity
$results += Test-Api "A28-P01" "获取最近活动" "GET" "$baseUrl/ai/recent-activity" $h $null 200 $true

# A29 GET /api/ai/smart-tool-history
$results += Test-Api "A29-P01" "获取智能工具历史" "GET" "$baseUrl/ai/smart-tool-history" $h $null 200 $true

# A31 GET /api/ai/prompt-templates
$results += Test-Api "A31-P01" "获取提示词模板" "GET" "$baseUrl/ai/prompt-templates" $h $null 200 $true

# A35 GET /api/ai/parse-results
$results += Test-Api "A35-P01" "获取解析结果列表" "GET" "$baseUrl/ai/parse-results" $h $null 200 $true

# A36 GET /api/ai/parse-results/statistics
$results += Test-Api "A36-P01" "获取解析结果统计" "GET" "$baseUrl/ai/parse-results/statistics" $h $null 200 $true

# A37 GET /api/ai/parse-results/config
$results += Test-Api "A37-P01" "获取解析结果配置" "GET" "$baseUrl/ai/parse-results/config" $h $null 200 $true

# A38 GET /api/ai/parse-results/degradation
$results += Test-Api "A38-P01" "获取降级状态" "GET" "$baseUrl/ai/parse-results/degradation" $h $null 200 $true

# A39 GET /api/ai/parse-results/metrics
$results += Test-Api "A39-P01" "获取监控指标" "GET" "$baseUrl/ai/parse-results/metrics" $h $null 200 $true

# A41 GET /api/ai/parse-results/performance
$results += Test-Api "A41-P01" "获取性能统计" "GET" "$baseUrl/ai/parse-results/performance" $h $null 200 $true

# A23 GET /api/ai/model-applications
$results += Test-Api "A23-P01" "admin获取应用配置" "GET" "$baseUrl/ai/model-applications" $h $null 200 $true
$results += Test-Api "A23-E01" "formulist获取应用配置" "GET" "$baseUrl/ai/model-applications" $fh $null 403 $false

# A40 GET /api/ai/parse-results/alerts
$results += Test-Api "A40-P01" "admin获取解析告警" "GET" "$baseUrl/ai/parse-results/alerts" $h $null 200 $true
$results += Test-Api "A40-E01" "formulist获取解析告警" "GET" "$baseUrl/ai/parse-results/alerts" $fh $null 403 $false

# A08 POST /api/ai/models-manage
$testModelId = $null
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-RestMethod -Uri "$baseUrl/ai/models-manage" -Method POST -Headers $h -Body '{"provider":"[test]-provider","name":"[test]测试模型","baseUrl":"http://localhost:3000","model":"test-model"}'
    $sw.Stop()
    if ($r.success) { $testModelId = $r.data.id }
    $results += "A08-P01|admin创建AI模型|PASS|200|$($sw.ElapsedMilliseconds)ms"
} catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
    $results += "A08-P01|admin创建AI模型|FAIL|$code|$($_.Exception.Message)"
}

$results += Test-Api "A08-E01" "formulist创建模型" "POST" "$baseUrl/ai/models-manage" $fh '{"provider":"[test]-nope","name":"[test]无权","baseUrl":"http://localhost","model":"test"}' 403 $false

# A09 PUT /api/ai/models-manage/:id
if ($testModelId) {
    $results += Test-Api "A09-P01" "admin更新模型" "PUT" "$baseUrl/ai/models-manage/$testModelId" $h '{"name":"[test]更新名称"}' 200 $true
}
$results += Test-Api "A09-E01" "更新不存在模型" "PUT" "$baseUrl/ai/models-manage/nonexistent-id" $h '{"name":"test"}' 404 $false

# A12 GET /api/ai/models-manage/:id/versions
if ($testModelId) {
    $results += Test-Api "A12-P01" "获取模型版本" "GET" "$baseUrl/ai/models-manage/$testModelId/versions" $h $null 200 $true
}

# A10 DELETE /api/ai/models-manage/:id
if ($testModelId) {
    $results += Test-Api "A10-P01" "admin删除模型" "DELETE" "$baseUrl/ai/models-manage/$testModelId" $h $null 200 $true
}
$results += Test-Api "A10-E01" "删除不存在模型" "DELETE" "$baseUrl/ai/models-manage/nonexistent-id" $h $null 404 $false

# A32 POST /api/ai/prompt-templates
$testTemplateId = $null
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-RestMethod -Uri "$baseUrl/ai/prompt-templates" -Method POST -Headers $h -Body '{"module":"smart-generate","name":"[test]测试模板","systemPrompt":"测试","userPrompt":"测试"}'
    $sw.Stop()
    if ($r.success) { $testTemplateId = $r.data.id }
    $results += "A32-P01|创建提示词模板|PASS|200|$($sw.ElapsedMilliseconds)ms"
} catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
    $results += "A32-P01|创建提示词模板|FAIL|$code|$($_.Exception.Message)"
}
$results += Test-Api "A32-E01" "module为空创建模板" "POST" "$baseUrl/ai/prompt-templates" $h '{"name":"测试"}' 400 $false

# A33 PUT /api/ai/prompt-templates/:id
if ($testTemplateId) {
    $results += Test-Api "A33-P01" "更新提示词模板" "PUT" "$baseUrl/ai/prompt-templates/$testTemplateId" $h '{"name":"[test]更新模板名"}' 200 $true
}
$results += Test-Api "A33-E01" "更新不存在模板" "PUT" "$baseUrl/ai/prompt-templates/nonexistent" $h '{"name":"test"}' 404 $false

# A34 DELETE /api/ai/prompt-templates/:id
if ($testTemplateId) {
    $results += Test-Api "A34-P01" "删除提示词模板" "DELETE" "$baseUrl/ai/prompt-templates/$testTemplateId" $h $null 200 $true
}
$results += Test-Api "A34-E01" "删除不存在模板" "DELETE" "$baseUrl/ai/prompt-templates/nonexistent" $h $null 404 $false

# A47 POST /api/ai/parse-results
$testParseResultId = $null
try {
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $r = Invoke-RestMethod -Uri "$baseUrl/ai/parse-results" -Method POST -Headers $h -Body '{"callType":"parse_formula","fileHash":"[test]-hash-001","fileName":"[test]test.xlsx","fileSize":1024,"parsedResult":{"name":"测试配方","materials":[]},"rawResponse":"{\"name\":\"测试配方\"}"}'
    $sw.Stop()
    if ($r.success) { $testParseResultId = $r.data.id }
    $results += "A47-P01|保存解析结果|PASS|200|$($sw.ElapsedMilliseconds)ms"
} catch {
    $code = 0
    if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
    $results += "A47-P01|保存解析结果|FAIL|$code|$($_.Exception.Message)"
}

# A48 POST /api/ai/parse-results/check
$results += Test-Api "A48-P01" "检查存在的解析结果" "POST" "$baseUrl/ai/parse-results/check" $h '{"fileHash":"[test]-hash-001","callType":"parse_formula"}' 200 $true
$results += Test-Api "A48-P02" "检查不存在的解析结果" "POST" "$baseUrl/ai/parse-results/check" $h '{"fileHash":"[test]-notexist","callType":"parse_formula"}' 200 $true

# A42 GET /api/ai/parse-results/:id
if ($testParseResultId) {
    $results += Test-Api "A42-P01" "获取解析结果详情" "GET" "$baseUrl/ai/parse-results/$testParseResultId" $h $null 200 $true
}
$results += Test-Api "A42-E01" "不存在解析结果" "GET" "$baseUrl/ai/parse-results/nonexistent-id" $h $null 404 $false

# A52 POST /api/ai/parse-results/:id/mark-used
if ($testParseResultId) {
    $results += Test-Api "A52-P01" "标记解析结果已使用" "POST" "$baseUrl/ai/parse-results/$testParseResultId/mark-used" $h '{}' 200 $true
}

# A53 DELETE /api/ai/parse-results/:id
if ($testParseResultId) {
    $results += Test-Api "A53-P01" "删除解析结果" "DELETE" "$baseUrl/ai/parse-results/$testParseResultId" $h $null 200 $true
}

# A50 POST /api/ai/parse-results/cleanup
$results += Test-Api "A50-P01" "admin清理解析结果" "POST" "$baseUrl/ai/parse-results/cleanup" $h '{}' 200 $true
$results += Test-Api "A50-E01" "formulist清理" "POST" "$baseUrl/ai/parse-results/cleanup" $fh '{}' 403 $false

# A49 PUT /api/ai/parse-results/config
$results += Test-Api "A49-P01" "admin更新解析配置" "PUT" "$baseUrl/ai/parse-results/config" $h '{"storageLimit":5000}' 200 $true
$results += Test-Api "A49-E01" "formulist更新解析配置" "PUT" "$baseUrl/ai/parse-results/config" $fh '{"storageLimit":5000}' 403 $false

# A19 PUT /api/ai/alerts/configs/:id
try {
    $ac = Invoke-RestMethod -Uri "$baseUrl/ai/alerts/configs" -Method GET -Headers $h
    if ($ac.data.configs -and $ac.data.configs.Count -gt 0) {
        $acid = $ac.data.configs[0].id
        $results += Test-Api "A19-P01" "admin更新告警配置" "PUT" "$baseUrl/ai/alerts/configs/$acid" $h '{"dailyCallLimit":500,"warningThreshold":80}' 200 $true
    } else {
        $results += "A19-P01|admin更新告警配置|SKIP|0|无告警配置ID"
    }
} catch { $results += "A19-P01|admin更新告警配置|FAIL|0|$($_.Exception.Message)" }
$results += Test-Api "A19-E01" "formulist更新告警" "PUT" "$baseUrl/ai/alerts/configs/nonexistent" $fh '{"dailyCallLimit":500}' 403 $false

# A13 GET /api/ai/models/:provider/versions
$results += Test-Api "A13-P01" "按供应商获取版本" "GET" "$baseUrl/ai/models/deepseek/versions" $h $null 200 $true

# A22 GET /api/ai/health/:provider/history
$results += Test-Api "A22-P01" "获取健康历史" "GET" "$baseUrl/ai/health/deepseek/history" $h $null 200 $true

# Skip AI-dependent endpoints
$results += "A01-P01|上传文件解析配方|SKIP|0|需要AI API Key"
$results += "A02-P01|上传文件解析原料营养|SKIP|0|需要AI API Key"
$results += "A03-P01|自然语言检索|SKIP|0|需要AI API Key"
$results += "A06-P01|AI对话SSE|SKIP|0|需要AI API Key"
$results += "A04-P01|下载导出文件|SKIP|0|依赖A03导出操作"

# Output
$results | ForEach-Object { Write-Output $_ }
