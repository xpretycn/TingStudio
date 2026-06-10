$adminToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4ZHMzbWYyZW9rbWY5IiwidXNlcklkIjoibXEzeGRzM21mMmVva21mOSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJyb2xlSWQiOm51bGwsInBlcm1pc3Npb25zIjpbIioiXSwiaWF0IjoxNzgwODQ1NjE1LCJleHAiOjE3ODE0NTA0MTV9.G_kc-XzzXm3YCBQmUtxMNHJ_HCASH84pb6kDo_mVI2Q"
$formulistToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtcTN4Z3FhNTh4czJ1cnZiIiwidXNlcklkIjoibXEzeGdxYTU4eHMydXJ2YiIsInVzZXJuYW1lIjoidGVzdGFkbWluIiwicm9sZSI6ImZvcm11bGlzdCIsInJvbGVJZCI6bnVsbCwicGVybWlzc2lvbnMiOltdLCJpYXQiOjE3ODA4NDU2MTUsImV4cCI6MTc4MTQ1MDQxNX0.iBO2hU_DhC2MpI3A7LCix8mP3SGLm4UGLIYUIAVXAcI"
$baseUrl = "http://localhost:3000/api"
$h = @{ "Authorization" = "Bearer $adminToken"; "Content-Type" = "application/json" }
$fh = @{ "Authorization" = "Bearer $formulistToken"; "Content-Type" = "application/json" }
$noAuth = @{ "Content-Type" = "application/json" }
$out = ""

function TGet($id, $name, $url, $hdrs, $exp) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method GET -Headers $hdrs
        $sw.Stop()
        if ($exp -eq 200) { $script:out += "$id|$name|PASS|200|$($sw.ElapsedMilliseconds)ms`n" }
        else { $script:out += "$id|$name|FAIL|200|expected $exp`n" }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $exp) { $script:out += "$id|$name|PASS|$code|0ms`n" }
        else { $script:out += "$id|$name|FAIL|$code|expected $exp`n" }
    }
}

function TPost($id, $name, $url, $hdrs, $body, $exp) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method POST -Headers $hdrs -Body $body
        $sw.Stop()
        if ($exp -in @(200,201)) { $script:out += "$id|$name|PASS|$exp|$($sw.ElapsedMilliseconds)ms`n" }
        else { $script:out += "$id|$name|FAIL|200|expected $exp`n" }
        return $r
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $exp) { $script:out += "$id|$name|PASS|$code|0ms`n" }
        else { $script:out += "$id|$name|FAIL|$code|expected $exp`n" }
        return $null
    }
}

function TPut($id, $name, $url, $hdrs, $body, $exp) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method PUT -Headers $hdrs -Body $body
        $sw.Stop()
        if ($exp -eq 200) { $script:out += "$id|$name|PASS|200|$($sw.ElapsedMilliseconds)ms`n" }
        else { $script:out += "$id|$name|FAIL|200|expected $exp`n" }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $exp) { $script:out += "$id|$name|PASS|$code|0ms`n" }
        else { $script:out += "$id|$name|FAIL|$code|expected $exp`n" }
    }
}

function TDel($id, $name, $url, $hdrs, $exp) {
    try {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        $r = Invoke-RestMethod -Uri $url -Method DELETE -Headers $hdrs
        $sw.Stop()
        if ($exp -eq 200) { $script:out += "$id|$name|PASS|200|$($sw.ElapsedMilliseconds)ms`n" }
        else { $script:out += "$id|$name|FAIL|200|expected $exp`n" }
    } catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode.value__ }
        if ($code -eq $exp) { $script:out += "$id|$name|PASS|$code|0ms`n" }
        else { $script:out += "$id|$name|FAIL|$code|expected $exp`n" }
    }
}

# ===== AI MODULE =====
TGet "A05-P01" "get-models" "$baseUrl/ai/models" $h 200
TGet "A05-R01" "get-models-noauth" "$baseUrl/ai/models" $noAuth 401
TGet "A07-P01" "get-models-manage" "$baseUrl/ai/models-manage" $h 200
TGet "A07-R01" "get-models-manage-noauth" "$baseUrl/ai/models-manage" $noAuth 401
TGet "A16-P01" "get-usage" "$baseUrl/ai/usage" $h 200
TGet "A17-P01" "get-usage-logs" "$baseUrl/ai/usage/logs" $h 200
TGet "A18-P01" "get-alerts-configs" "$baseUrl/ai/alerts/configs" $h 200
TGet "A20-P01" "get-alerts-records" "$baseUrl/ai/alerts/records" $h 200
TGet "A21-P01" "get-health" "$baseUrl/ai/health" $h 200
TGet "A28-P01" "get-recent-activity" "$baseUrl/ai/recent-activity" $h 200
TGet "A29-P01" "get-smart-tool-history" "$baseUrl/ai/smart-tool-history" $h 200
TGet "A31-P01" "get-prompt-templates" "$baseUrl/ai/prompt-templates" $h 200
TGet "A35-P01" "get-parse-results" "$baseUrl/ai/parse-results" $h 200
TGet "A36-P01" "get-parse-statistics" "$baseUrl/ai/parse-results/statistics" $h 200
TGet "A37-P01" "get-parse-config" "$baseUrl/ai/parse-results/config" $h 200
TGet "A38-P01" "get-parse-degradation" "$baseUrl/ai/parse-results/degradation" $h 200
TGet "A39-P01" "get-parse-metrics" "$baseUrl/ai/parse-results/metrics" $h 200
TGet "A41-P01" "get-parse-performance" "$baseUrl/ai/parse-results/performance" $h 200
TGet "A23-P01" "admin-get-model-apps" "$baseUrl/ai/model-applications" $h 200
TGet "A23-E01" "formulist-get-model-apps" "$baseUrl/ai/model-applications" $fh 403
TGet "A40-P01" "admin-get-parse-alerts" "$baseUrl/ai/parse-results/alerts" $h 200
TGet "A40-E01" "formulist-get-parse-alerts" "$baseUrl/ai/parse-results/alerts" $fh 403
TGet "A13-P01" "get-provider-versions" "$baseUrl/ai/models/deepseek/versions" $h 200
TGet "A22-P01" "get-health-history" "$baseUrl/ai/health/deepseek/history" $h 200

$r8 = TPost "A08-P01" "admin-create-model" "$baseUrl/ai/models-manage" $h '{"provider":"[test]-prov1","name":"[test]model","baseUrl":"http://localhost:3000","model":"test-model"}' 200
$testModelId = $null
if ($r8 -and $r8.success) { $testModelId = $r8.data.id }
TPost "A08-E01" "formulist-create-model" "$baseUrl/ai/models-manage" $fh '{"provider":"[test]-nope","name":"[test]nope","baseUrl":"http://localhost","model":"test"}' 403

if ($testModelId) {
    TPut "A09-P01" "admin-update-model" "$baseUrl/ai/models-manage/$testModelId" $h '{"name":"[test]updated"}' 200
    TGet "A12-P01" "get-model-versions" "$baseUrl/ai/models-manage/$testModelId/versions" $h 200
    TDel "A10-P01" "admin-delete-model" "$baseUrl/ai/models-manage/$testModelId" $h 200
}
TPut "A09-E01" "update-nonexistent-model" "$baseUrl/ai/models-manage/nonexistent-id" $h '{"name":"test"}' 404
TDel "A10-E01" "delete-nonexistent-model" "$baseUrl/ai/models-manage/nonexistent-id" $h 404

$r32 = TPost "A32-P01" "create-prompt-template" "$baseUrl/ai/prompt-templates" $h '{"module":"smart-generate","name":"[test]template","systemPrompt":"test","userPrompt":"test"}' 200
$testTemplateId = $null
if ($r32 -and $r32.success) { $testTemplateId = $r32.data.id }
TPost "A32-E01" "create-template-no-module" "$baseUrl/ai/prompt-templates" $h '{"name":"test"}' 400
if ($testTemplateId) {
    TPut "A33-P01" "update-prompt-template" "$baseUrl/ai/prompt-templates/$testTemplateId" $h '{"name":"[test]updated"}' 200
    TDel "A34-P01" "delete-prompt-template" "$baseUrl/ai/prompt-templates/$testTemplateId" $h 200
}
TPut "A33-E01" "update-nonexistent-template" "$baseUrl/ai/prompt-templates/nonexistent" $h '{"name":"test"}' 404
TDel "A34-E01" "delete-nonexistent-template" "$baseUrl/ai/prompt-templates/nonexistent" $h 404

$r47 = TPost "A47-P01" "save-parse-result" "$baseUrl/ai/parse-results" $h '{"callType":"parse_formula","fileHash":"[test]-hash-002","fileName":"[test]test.xlsx","fileSize":1024,"parsedResult":{"name":"test","materials":[]},"rawResponse":"{}"}' 200
$testParseResultId = $null
if ($r47 -and $r47.success) { $testParseResultId = $r47.data.id }

TPost "A48-P01" "check-existing-parse" "$baseUrl/ai/parse-results/check" $h '{"fileHash":"[test]-hash-002","callType":"parse_formula"}' 200
TPost "A48-P02" "check-nonexisting-parse" "$baseUrl/ai/parse-results/check" $h '{"fileHash":"[test]-notexist","callType":"parse_formula"}' 200

if ($testParseResultId) {
    TGet "A42-P01" "get-parse-detail" "$baseUrl/ai/parse-results/$testParseResultId" $h 200
    TPost "A52-P01" "mark-parse-used" "$baseUrl/ai/parse-results/$testParseResultId/mark-used" $h '{}' 200
    TDel "A53-P01" "delete-parse-result" "$baseUrl/ai/parse-results/$testParseResultId" $h 200
}
TGet "A42-E01" "get-nonexistent-parse" "$baseUrl/ai/parse-results/nonexistent-id" $h 404

TPost "A50-P01" "admin-cleanup" "$baseUrl/ai/parse-results/cleanup" $h '{}' 200
TPost "A50-E01" "formulist-cleanup" "$baseUrl/ai/parse-results/cleanup" $fh '{}' 403
TPut "A49-P01" "admin-update-parse-config" "$baseUrl/ai/parse-results/config" $h '{"storageLimit":5000}' 200
TPut "A49-E01" "formulist-update-parse-config" "$baseUrl/ai/parse-results/config" $fh '{"storageLimit":5000}' 403
TPut "A19-E01" "formulist-update-alert" "$baseUrl/ai/alerts/configs/nonexistent" $fh '{"dailyCallLimit":500}' 403

$out += "A01-P01|parse-formula|SKIP|0|requires AI API Key`n"
$out += "A02-P01|parse-material-nutrition|SKIP|0|requires AI API Key`n"
$out += "A03-P01|natural-search|SKIP|0|requires AI API Key`n"
$out += "A06-P01|chat-sse|SKIP|0|requires AI API Key`n"
$out += "A04-P01|export-file|SKIP|0|depends on A03`n"

# ===== AGENT MODULE =====
TGet "G04-P01" "get-agent-sessions" "$baseUrl/agent/sessions" $h 200
TGet "G04-E01" "get-sessions-noauth" "$baseUrl/agent/sessions" $noAuth 401
TGet "G07-P01" "get-role-config" "$baseUrl/agent/role-config" $h 200
TGet "G07-E01" "get-role-config-noauth" "$baseUrl/agent/role-config" $noAuth 401
TGet "G09-P01" "get-float-config" "$baseUrl/agent/float-config" $h 200
TGet "G09-E01" "get-float-config-noauth" "$baseUrl/agent/float-config" $noAuth 401
TGet "G14-P01" "get-field-hints" "$baseUrl/agent/field-hints?pageId=formula-add" $h 200
TGet "G15-P01" "get-agent-health" "$baseUrl/agent/health" $h 200
TPut "G08-P01" "update-role-config" "$baseUrl/agent/role-config" $h '{"agent_name":"[test]agent","user_title":"[test]title","tone_style":"casual"}' 200
TPut "G10-P01" "admin-update-float-config" "$baseUrl/agent/float-config" $h '{"enabled":true,"model":"deepseek","position":"right"}' 200
TPut "G10-E01" "formulist-update-float-config" "$baseUrl/agent/float-config" $fh '{"enabled":false}' 403

$out += "G01-P01|agent-chat|SKIP|0|requires AI API Key`n"
$out += "G02-P01|submit-form|SKIP|0|depends on G01`n"
$out += "G03-P01|get-pending-form|SKIP|0|depends on G01`n"
$out += "G11-P01|parse-form|SKIP|0|requires AI API Key`n"
$out += "G12-P01|float-chat|SKIP|0|requires AI API Key`n"
$out += "G13-P01|generate-description|SKIP|0|requires AI API Key`n"

# ===== PARSE TEMPLATES MODULE =====
TGet "P01-P01" "get-parse-templates" "$baseUrl/parse-templates" $h 200
TGet "P01-E01" "get-templates-noauth" "$baseUrl/parse-templates" $noAuth 401
$rP3 = TPost "P03-P01" "create-parse-template" "$baseUrl/parse-templates" $h '{"name":"[test]nutrition-template","category":"nutrition","defaultProvider":"deepseek","defaultModel":"deepseek-chat"}' 201
$testPTId = $null
if ($rP3 -and $rP3.success) { $testPTId = $rP3.data.id }
TPost "P03-E01" "create-template-no-name" "$baseUrl/parse-templates" $h '{"category":"nutrition"}' 400
TPost "P03-E02" "create-template-empty-name" "$baseUrl/parse-templates" $h '{"name":""}' 400
if ($testPTId) {
    TGet "P02-P01" "get-template-detail" "$baseUrl/parse-templates/$testPTId" $h 200
    TPut "P04-P01" "update-parse-template" "$baseUrl/parse-templates/$testPTId" $h '{"name":"[test]updated-name"}' 200
    TDel "P05-P01" "delete-parse-template" "$baseUrl/parse-templates/$testPTId" $h 200
}
TGet "P02-E01" "get-nonexistent-template" "$baseUrl/parse-templates/nonexistent-id" $h 404
TPut "P04-E01" "update-nonexistent-template" "$baseUrl/parse-templates/nonexistent-id" $h '{"name":"test"}' 404
TDel "P05-E01" "delete-nonexistent-template" "$baseUrl/parse-templates/nonexistent-id" $h 404

# ===== NUTRITION MODULE =====
$matBody = '{"name":"[test]mat-nutrition","code":"[test]-N001","category":"herb","unit":"g","unitPrice":10,"supplier":"test"}'
$rMat = TPost "NUT-SETUP" "create-test-material" "$baseUrl/materials" $h $matBody 200
$testMatId = $null
if ($rMat -and $rMat.success) { $testMatId = $rMat.data.id }

if ($testMatId) {
    TGet "A01-P01" "get-material-nutrition" "$baseUrl/nutrition/material/$testMatId" $h 200
    TGet "A01-R01" "get-nutrition-noauth" "$baseUrl/nutrition/material/$testMatId" $noAuth 401
    TPut "A02-P01" "set-material-nutrition" "$baseUrl/nutrition/material/$testMatId" $h '{"per100g":{"protein":5.2,"fat":1.3,"carbohydrate":10.5,"sodium":50},"confidence":"high"}' 200
    TPut "A02-E01" "set-nutrition-nonexistent" "$baseUrl/nutrition/material/nonexistent-id" $h '{"per100g":{"protein":5}}' 404
    TPut "A02-V01" "set-nutrition-no-per100g" "$baseUrl/nutrition/material/$testMatId" $h '{"confidence":"high"}' 400
    TGet "B01-P01" "get-material-sources" "$baseUrl/nutrition/material/$testMatId/sources" $h 200
    TGet "B01-R01" "get-sources-noauth" "$baseUrl/nutrition/material/$testMatId/sources" $noAuth 401
    $rB2 = TPost "B02-P01" "add-manual-source" "$baseUrl/nutrition/material/$testMatId/sources" $h '{"sourceType":"manual","per100g":{"protein":5,"fat":2,"carbohydrate":10}}' 200
    $testSourceId = $null
    if ($rB2 -and $rB2.success) { $testSourceId = $rB2.data.sourceId }
    TPost "B02-E01" "add-invalid-source-type" "$baseUrl/nutrition/material/$testMatId/sources" $h '{"sourceType":"invalid","per100g":{"protein":5}}' 400
    TGet "B03-P01" "get-sources-compare" "$baseUrl/nutrition/material/$testMatId/sources/compare" $h 200
    if ($testSourceId) {
        TPut "B04-P01" "update-source" "$baseUrl/nutrition/material/$testMatId/sources/$testSourceId" $h '{"notes":"[test]updated"}' 200
        TPut "B06-P01" "set-authoritative" "$baseUrl/nutrition/material/$testMatId/authoritative" $h "{\"fieldSelections\":{\"protein\":\"$testSourceId\"}}" 200
        TDel "B05-P01" "delete-source" "$baseUrl/nutrition/material/$testMatId/sources/$testSourceId" $h 200
    }
    TGet "C01-P01" "get-scored-sources" "$baseUrl/nutrition/material/$testMatId/sources/scored" $h 200
    TGet "C02-P01" "get-source-recommendation" "$baseUrl/nutrition/material/$testMatId/sources/recommendation" $h 200
    TGet "C07-P01" "get-snapshots" "$baseUrl/nutrition/material/$testMatId/snapshots" $h 200
    TGet "C06-P01" "export-sources" "$baseUrl/nutrition/material/$testMatId/sources/export" $h 200
}

TGet "A05-P01" "get-nutrition-profiles" "$baseUrl/nutrition/profiles" $h 200
TGet "A05-R01" "get-profiles-noauth" "$baseUrl/nutrition/profiles" $noAuth 401
$rA6 = TPost "A06-P01" "create-nutrition-profile" "$baseUrl/nutrition/profiles" $h '{"name":"[test]adult-standard","targetValues":{"protein":60,"fat":60}}' 201
$testProfileId = $null
if ($rA6 -and $rA6.success) { $testProfileId = $rA6.data.profileId }
TPost "A06-V01" "create-profile-no-name" "$baseUrl/nutrition/profiles" $h '{"targetValues":{"protein":60}}' 400
if ($testProfileId) {
    TPut "A07-P01" "update-nutrition-profile" "$baseUrl/nutrition/profiles/$testProfileId" $h '{"name":"[test]updated-standard","targetValues":{"protein":65}}' 200
    TDel "A08-P01" "delete-nutrition-profile" "$baseUrl/nutrition/profiles/$testProfileId" $h 200
}
TPut "A07-E01" "update-nonexistent-profile" "$baseUrl/nutrition/profiles/nonexistent-id" $h '{"name":"test"}' 404
TDel "A08-E01" "delete-nonexistent-profile" "$baseUrl/nutrition/profiles/nonexistent-id" $h 404

$formulaBody = '{"name":"[test]formula-nutrition","code":"[test]-F001","finishedWeight":200,"materials":[]}'
$rForm = TPost "NUT-SETUP2" "create-test-formula" "$baseUrl/formulas" $h $formulaBody 200
$testFormulaId = $null
if ($rForm -and $rForm.success) { $testFormulaId = $rForm.data.id }

if ($testFormulaId) {
    TPost "A03-P01" "calculate-nutrition" "$baseUrl/nutrition/calculate/$testFormulaId" $h '{}' 200
    TPost "A03-E01" "calc-nonexistent-formula" "$baseUrl/nutrition/calculate/nonexistent-id" $h '{}' 404
    TGet "A04-P01" "get-nutrition-tables" "$baseUrl/nutrition/tables/$testFormulaId" $h 200
    TGet "A11-P01" "get-nutrition-coverage" "$baseUrl/nutrition/coverage/$testFormulaId" $h 200
}

# ===== EXCLUSIONS MODULE =====
TGet "D01-P01" "get-exclusions" "$baseUrl/enums/exclusions" $h 200
TGet "D01-R01" "get-exclusions-noauth" "$baseUrl/enums/exclusions" $noAuth 401
$rD2 = TPost "D02-P01" "create-exclusion" "$baseUrl/enums/exclusions" $h '{"category":"appearance","valueA":"test-val-a","valueB":"test-val-b"}' 201
$testExcId = $null
if ($rD2 -and $rD2.success) { $testExcId = $rD2.data.id }
TPost "D02-E01" "create-exclusion-invalid-cat" "$baseUrl/enums/exclusions" $h '{"category":"invalid","valueA":"a","valueB":"b"}' 400
TPost "D02-V01" "create-exclusion-no-category" "$baseUrl/enums/exclusions" $h '{"valueA":"a","valueB":"b"}' 400
TPost "D02-R01" "formulist-create-exclusion" "$baseUrl/enums/exclusions" $fh '{"category":"appearance","valueA":"a2","valueB":"b2"}' 403
if ($testExcId) {
    TDel "D03-P01" "delete-exclusion" "$baseUrl/enums/exclusions/$testExcId" $h 200
}
TDel "D03-E01" "delete-nonexistent-exclusion" "$baseUrl/enums/exclusions/nonexistent-id" $h 404
TDel "D03-R01" "formulist-delete-exclusion" "$baseUrl/enums/exclusions/nonexistent-id" $fh 403

# ===== RATIO THRESHOLDS MODULE =====
TGet "E01-P01" "get-ratio-thresholds" "$baseUrl/ratio-thresholds" $h 200
TGet "E01-R01" "get-thresholds-noauth" "$baseUrl/ratio-thresholds" $noAuth 401
TPut "E02-P01" "update-ratio-thresholds" "$baseUrl/ratio-thresholds" $h '{"normalLow":0.97,"normalHigh":1.03,"warningLow":0.94,"warningHigh":1.06,"highWarningLow":0.91,"highWarningHigh":1.09}' 200
TPut "E02-E01" "update-thresholds-invalid" "$baseUrl/ratio-thresholds" $h '{"normalLow":1.03,"normalHigh":0.97,"warningLow":0.94,"warningHigh":1.06,"highWarningLow":0.91,"highWarningHigh":1.09}' 400
TPut "E02-R01" "formulist-update-thresholds" "$baseUrl/ratio-thresholds" $fh '{"normalLow":0.97,"normalHigh":1.03,"warningLow":0.94,"warningHigh":1.06,"highWarningLow":0.91,"highWarningHigh":1.09}' 403
TPut "E02-CLEANUP" "reset-ratio-thresholds" "$baseUrl/ratio-thresholds" $h '{"normalLow":0.98,"normalHigh":1.02,"warningLow":0.95,"warningHigh":1.05,"highWarningLow":0.92,"highWarningHigh":1.08}' 200

# Write output to file
$out | Out-File -FilePath "d:\ProgramData\workspace-codeby\ting-studio\test\test-results-raw.txt" -Encoding UTF8
